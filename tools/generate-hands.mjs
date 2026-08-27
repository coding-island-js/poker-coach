// Poker Coach content generator.
//
// Deals hands with poker-sim's engine, finds postflop spots - heads-up and
// three-handed - where a tempting play is measurably worse than the best one,
// computes each opponent's range from their actual actions, and emits scored
// candidates.
//
// Nothing here decides what is "correct" by opinion: every EV number is the
// mean of N play-outs of the real engine from the real decision point.
//
//   node tools/generate-hands.mjs --hands 400 --rollouts 120 --out work/candidates.json
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  act, getLegalActions, getBotHandContext, decideBotAction, createSeededRng,
  createLineup, newHand, livePlayers, playerOf, rollout, candidateActions,
  estimateRange, cappedness, bucketOfHolding, candidateCombos, archetypeById, plausibleRange, createBotProfile, showdownSplit, showdownVsField, rangeIsCredible,
  rangeBreakdown,
} from "./lib/engine.mjs";

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const HANDS = Number.parseInt(arg("hands", "400"), 10);
const ROLLOUTS = Number.parseInt(arg("rollouts", "120"), 10);
const OUT = arg("out", "work/candidates.json");
const SEED = Number.parseInt(arg("seed", "20260825"), 10);

// A spot has to be worth a learner's 90 seconds. Tiny limped pots and
// decisions where every option earns the same are correct but not instructive.
// Pots are naturally smaller earlier in the hand, so a single floor would
// admit only rivers. Scaled by street instead.
const MIN_POT_BB = { flop: 6, turn: 10, river: 12 };
const STREETS = ["flop", "turn", "river"];
// How many players are still in. Three-handed is the realism jump - a real
// $1/$2 pot is rarely heads-up - and it stops at three because the showdown
// count has to stay an exact integer. See `showdownVsField`.
const SEATING = [2, 3];
const MIN_GAP_POT = Number.parseFloat(arg("min-gap", "0.08"));
// Above this share of random hands being "strong", the board itself (a pair on
// board, four to a straight) has made almost every holding strong and the
// capped/uncapped distinction stops carrying information.
const MAX_MEANINGFUL_BASELINE = 0.40;

// ------------------------------------------------------------------ display
const SUITS = { c: "♣", d: "♦", h: "♥", s: "♠" };
const pretty = (code) => `${code[0] === "T" ? "10" : code[0]}${SUITS[code[1]] ?? code[1]}`;
const prettyAll = (codes) => (codes ?? []).map(pretty);
const money = (n) => `$${Math.round(n)}`;

// The policy that finishes the hand on the hero's behalf inside a rollout.
// Without this the hero's later streets were played by whichever archetype the
// seat drew, so a flop bet's EV included a stranger's mistakes.
const HERO_POLICY = "grinder-pro";

// The naive players whose instincts we measure against. These are the
// temptations: what an ordinary low-stakes opponent actually does here.
const NAIVE_ARCHETYPES = ["calling-station", "passive-rec", "loose-passive-rec", "ego-rec"];

/**
 * The seat's real name. poker-sim tracks distance from the button but never
 * names it, and "out of position" teaches less than "big blind" - position is
 * the thing a learner is supposed to be carrying to the table.
 */
export function positionName(hand, playerId) {
  const order = hand.seatOrder ?? [];
  const buttonIndex = order.indexOf(hand.buttonId);
  const seatIndex = order.indexOf(playerId);
  if (buttonIndex < 0 || seatIndex < 0) return "Unknown";
  if (playerId === hand.buttonId) return "Button";
  if (playerId === hand.smallBlindId) return "Small blind";
  if (playerId === hand.bigBlindId) return "Big blind";

  const seats = order.length;
  const fromButton = (seatIndex - buttonIndex + seats) % seats;
  // Counting backwards from the button: the seat before it is the cutoff.
  const beforeButton = seats - fromButton;
  if (beforeButton === 1) return "Cutoff";
  if (beforeButton === 2) return "Hijack";
  if (beforeButton === 3) return "Lojack";
  return "Early position";
}

/**
 * The opponent's last aggressive action on the street being decided, so the
 * decision line can name it correctly. A raise and a bet cost the hero the same
 * amount to call and are not the same event to read.
 */
export function facingActionOf(hand, villainId, street) {
  let last = null;
  for (const event of hand.events ?? []) {
    if (event.type !== "ACTION" || event.street !== street) continue;
    if (event.playerId !== villainId) continue;
    // poker-sim spells shoves several ways - "all-in", "short-all-in-raise" -
    // and matching only "bet"/"raise" left the decision line quoting an earlier
    // action: "Opponent raises to $30" printed directly under "He moves all in".
    const name = String(event.action ?? "");
    const aggressive = name.includes("bet") || name.includes("raise") || name.includes("all-in");
    if (aggressive) {
      const allIn = name.includes("all-in");
      last = {
        type: name.includes("bet") && !name.includes("raise") ? "bet" : "raise",
        to: Math.round(event.streetTotal ?? event.paid ?? 0),
        allIn,
      };
    }
  }
  return last;
}

// --------------------------------------------------------------- spot search
/**
 * Play one hand, stopping at the first decision on `wantStreet` with exactly
 * `wantPlayers` still in, and return everything that decision depends on.
 *
 * `wantPlayers` is 2 or 3. Three is the realism jump - a $1/$2 pot is rarely
 * heads-up - and it stops at three because the showdown count has to stay an
 * exact integer, and counting four mutually card-disjoint holdings is a
 * different problem. See `showdownVsField`.
 */
export function findSpot(handIndex, rng, wantStreet, wantPlayers) {
  const { players, profiles } = createLineup(handIndex, rng);
  let game = newHand(handIndex, rng, players);
  const decisionsByPlayer = new Map();

  let guard = 0;
  while (getLegalActions(game) !== null) {
    if (guard += 1, guard > 300) return null;
    const legal = getLegalActions(game);
    if (legal.canChop) { game = act(game, { type: "fold" }); continue; }

    const hand = game.table.currentHand;
    const context = getBotHandContext(game, legal.playerId);

    // Only the street this hand was asked for. Taking the first spot instead
    // gave 28 flops to 6 turns to 1 river, because most hands are still
    // multi-handed on the flop and thin out after.
    if (hand.phase === wantStreet && livePlayers(hand).length === wantPlayers) {
      const heroId = legal.playerId;
      const villains = livePlayers(hand).filter((p) => p.id !== heroId);
      if (villains.length === wantPlayers - 1 && context.pot > 0) {
        return {
          game, legal, profiles, heroId,
          villainIds: villains.map((p) => p.id),
          street: hand.phase,
          heroContext: context,
          decisionsFor: (id) => decisionsByPlayer.get(id) ?? [],
        };
      }
    }

    const profile = profiles.get(legal.playerId);
    const action = decideBotAction({ profile, legal, hand: context, rng });
    const log = decisionsByPlayer.get(legal.playerId) ?? [];
    log.push({ legal, context, action });
    decisionsByPlayer.set(legal.playerId, log);
    game = act(game, action);
  }
  return null;
}

// ------------------------------------------------------------------ scoring
/** What each naive archetype would do here, mapped onto our candidate actions. */
function temptingAction({ game, legal, heroId, candidates, seed }) {
  const votes = new Map();
  NAIVE_ARCHETYPES.forEach((archetypeId, index) => {
    if (!archetypeById(archetypeId)) return;
    // A real profile of this archetype, asked what it would do in the hero's
    // seat. Hand-rolling the profile object here produced a traitless bot that
    // folded everything, which made "the tempting play" meaningless.
    const profile = createBotProfile({
      id: heroId, displayName: archetypeId, archetype: archetypeId,
      rng: createSeededRng(seed + index * 977), variance: 0,
    });
    let action;
    try {
      action = decideBotAction({
        profile, legal, hand: getBotHandContext(game, heroId),
        rng: createSeededRng(seed + index * 131),
      });
    } catch { return; }
    const id = mapToCandidate(action, candidates, legal);
    if (id) votes.set(id, (votes.get(id) ?? 0) + 1);
  });
  let best = null;
  for (const [id, count] of votes) if (!best || count > best.count) best = { id, count };
  return best?.id ?? null;
}

function mapToCandidate(action, candidates, legal) {
  const has = (id) => candidates.some((entry) => entry.id === id);
  if (action.type === "fold" && has("fold")) return "fold";
  if (action.type === "check" && has("check")) return "check";
  if (action.type === "call" && has("call")) return "call";
  if (action.type === "raise" || action.type === "all-in") {
    if (has("raise")) return "raise";
  }
  if (action.type === "bet" || action.type === "all-in") {
    const potish = legal.currentBet > 0 ? legal.currentBet : 1;
    const big = (action.to ?? 0) >= potish * 0.5;
    if (big && has("bet-big")) return "bet-big";
    if (has("bet-small")) return "bet-small";
    if (has("bet-big")) return "bet-big";
  }
  return null;
}

/**
 * Which of the six reasoning leaks this spot tests.
 *
 * Driven by the SHAPE of the mistake - what the tempting play does that the
 * best play does not - rather than by hero's hand strength alone. An earlier
 * version fell through to "weaker-callers" for anything that was not facing a
 * bet, which tagged seven of eight spots identically.
 */
// Opponents whose tendency is extreme enough that it, rather than the cards,
// is what makes the best play what it is.
const READ_DRIVEN = new Set([
  "calling-station", "maniac", "nit-rock", "rules-nit", "omc", "scared-money", "ego-rec",
]);

export function classifyLeak({ legal, bestId, temptId, heroBeatsPct, villainChecks, opponent }) {
  const facing = legal.toCall > 0;
  const tempted = temptId ?? "";
  const best = bestId ?? "";
  const isBet = (id) => id.startsWith("bet") || id.startsWith("raise");
  // "Weak" here means the hand loses to most of what the opponent can hold.
  const heroWeak = heroBeatsPct !== null && heroBeatsPct >= 50;

  if (facing) return "call-price";

  // When a distinctive opponent makes the normal play wrong - checking a hand
  // that is ahead, or betting one that is behind - the read is doing the work,
  // and the lesson is about how far to trust it.
  if (READ_DRIVEN.has(opponent)) {
    if (!heroWeak && best === "check" && isBet(tempted)) return "read-as-fact";
    if (heroWeak && isBet(best)) return "read-as-fact";
  }

  // Betting when checking is better: the bet has no job it can actually do.
  if (isBet(tempted) && best === "check") {
    if (heroWeak) return "bluffs-showdown";          // bluffing into a better range
    if (villainChecks >= 2) return "removes-strength"; // read his checks as weakness
    return "plan-action";                              // value bet with no worse caller
  }
  // Checking when betting is better. Which lesson that is depends entirely on
  // whether the hand is ahead: betting a hand that is behind is a bluff, and
  // calling that "leaving value behind" would teach the opposite of the truth.
  if (tempted === "check" && isBet(best)) {
    return heroWeak ? "plan-action" : "weaker-callers";
  }
  // Both bet, different sizes: the size does not match the purpose.
  if (isBet(tempted) && isBet(best) && tempted !== best) return "plan-action";
  // An opponent whose tendency is what makes the answer what it is.
  if (villainChecks >= 2) return "removes-strength";
  return heroWeak ? "bluffs-showdown" : "weaker-callers";
}

/**
 * A readable street-by-street history from the engine's own event log.
 *
 * Only the two players still in the hand are named. Everyone else folded before
 * the river and their individual actions are noise, so they are collapsed into
 * one count - a learner reading the spot needs the story, not the log.
 */
export function renderHistory(hand, heroId, labels) {
  const streets = { preflop: [], flop: [], turn: [], river: [] };
  // Anyone who did something other than fold has to be named, whether or not
  // they are still in at the decision. Naming only the survivors deleted the
  // bet of a player who folded on a later street, leaving flops that read
  // "You check. Opponent checks. You call $8." - a call with no bet in front
  // of it. Players who only ever folded stay collapsed into one line, because
  // naming five seats that folded preflop is noise, not story.
  // Naming everyone who acted fixed the missing-bet bug and produced a wall:
  // five seats checking and folding before the story starts. Only two kinds of
  // player earn a name - those still in at the decision, and anyone who PUT
  // MONEY IN, because that is what built the pot and a call with no bet in
  // front of it is unreadable. Everyone else collapses into one count.
  const putMoneyIn = new Set();
  for (const event of hand.events ?? []) {
    if (event.type !== "ACTION") continue;
    const name = String(event.action);
    if (name.includes("bet") || name.includes("raise") || name.includes("all-in")) {
      putMoneyIn.add(event.playerId);
    }
  }
  const named = (playerId) => labels.get(playerId)
    ?? (putMoneyIn.has(playerId) ? `The ${positionName(hand, playerId).toLowerCase()}` : null);
  const conjugate = (id, verb) => {
    // "You raise", "The cutoff raises".
    const you = id === heroId;
    // poker-sim spells shoves as "short-all-in-raise" and friends, and the raw
    // token was reaching the screen: "Opponent short-all-in-raises."
    const name = String(verb);
    const stem = name.includes("all-in") ? "MOVE-ALL-IN"
      : { bet: "bet", raise: "raise", call: "call", check: "check", fold: "fold" }[name] ?? name;
    if (stem === "MOVE-ALL-IN") return you ? "move all in" : "moves all in";
    return you ? stem : `${stem}s`;
  };
  let foldedOut = 0;
  for (const event of hand.events ?? []) {
    if (event.type !== "ACTION") continue;
    const bucket = streets[event.street];
    if (!bucket) continue;
    // Three-handed, "Opponent" is ambiguous and the timeline becomes unreadable,
    // so everyone who acted is named by their seat.
    const who = named(event.playerId);
    if (!who) {
      if (event.action === "fold") foldedOut += 1;
      continue;
    }
    const verb = conjugate(event.playerId, event.action);
    // "bets to $10" is not English at a table; you bet $10 and you raise TO $10.
    const name = String(event.action);
    const detail = name.includes("raise") || name.includes("all-in")
      ? ` to ${money(event.streetTotal ?? event.paid)}`
      : name.includes("bet") ? ` ${money(event.streetTotal ?? event.paid)}`
      : name === "call" ? ` ${money(event.paid)}`
      : "";
    // A player who is not in the hand any more is only interesting for the money
    // they put in and the moment they left. Their checks are noise.
    const stillIn = labels.has(event.playerId);
    if (!stillIn && event.action === "check") continue;
    bucket.push(`${who} ${verb}${detail}.`);
  }
  if (foldedOut > 0) {
    streets.preflop.unshift(`${foldedOut} player${foldedOut === 1 ? "" : "s"} fold.`);
  }
  // Preflop, the big blind is a live bet, so a call there needs no bet in front
  // of it. Every other street must open with someone putting money in.

  const board = hand.board ?? [];
  const label = {
    preflop: "Preflop",
    flop: board.length >= 3 ? `Flop · ${prettyAll(board.slice(0, 3)).join(" ")}` : "Flop",
    turn: board.length >= 4 ? `Turn · ${pretty(board[3])}` : "Turn",
    river: board.length >= 5 ? `River · ${pretty(board[4])}` : "River",
  };
  return Object.entries(streets)
    .filter(([, actions]) => actions.length)
    .map(([street, actions]) => ({ street: label[street], actions }));
}

/**
 * The scored spot, in the shape the curator reads.
 *
 * Pulled out of the loop so the chaining pass can build a continuation the
 * same way rather than assembling a lookalike object by hand - two shapes
 * that have to stay in step is exactly how the copy and the numbers drifted
 * apart the first time.
 */
export function buildCandidate({
  hand, heroId, villainIds, heroCards, board, street, legal, heroContext,
  reads, quoted, split, cap, rangeSource, evs, best, tempt, gap, pot,
  villainChecks, heroBucket, leak, seed, handIndex, rollouts, historyLabels,
}) {
  return {
    // Seeded, because two pools generated with different seeds both emit a
    // hand at index 17 and the merge dedupes on cards, not id - so `gen-17`
    // could ship twice meaning two different hands. The seed also makes a
    // candidate replayable: seed + handIndex + street reproduces this exact
    // game state.
    id: `gen-${SEED}-${handIndex}`,
    handIndex,
    seed,
    leak,
    street: street.charAt(0).toUpperCase() + street.slice(1),
    pot: money(pot),
    potRaw: pot,
    // The EFFECTIVE stack - the smaller of the two - not the hero's own. Calling
    // it "behind" made legal bet sizes above it look impossible: the hero can
    // hold more than the opponent is able to call.
    effective: `${money(heroContext.effectiveStack ?? heroContext.stack)} effective`,
    heroPosition: positionName(hand, heroId),
    // Every seat still in, named. Heads-up hands keep `opponentPosition` so
    // nothing downstream has to special-case the commonest shape.
    opponentPosition: reads[0].position,
    opponents: reads.map((read) => ({
      position: read.position,
      archetype: read.archetype,
      combos: read.holdings.length,
      rangeSource: read.source,
      checks: read.checks,
      breakdown: rangeBreakdown({ heroCards, board, holdings: read.holdings }),
    })),
    players: villainIds.length + 1,
    inPosition: Boolean(heroContext.position?.inPosition),
    opponentArchetype: reads[0].archetype,
    hero: prettyAll(heroCards),
    heroCodes: heroCards,
    board: prettyAll(board),
    boardCodes: board,
    heroBucket,
    facingBet: legal.toCall > 0,
    toCall: legal.toCall,
    decisionNow: legal.toCall > 0
      ? `Opponent bets ${money(legal.toCall)} into ${money(pot - legal.toCall)}. You act now.`
      : "Opponent checks. You act now.",
    // What he actually did, so the line above the timeline can agree with the
    // timeline. Calling a raise a "bet" put "Opponent bets $13 into $26"
    // directly above "Opponent raises to $20" in the history.
    facingAction: facingActionOf(hand, reads[0].villainId, street),
    history: renderHistory(hand, heroId, historyLabels ?? new Map([
      [heroId, "You"],
      // Three-handed, "Opponent" is ambiguous. Everyone still in is named by
      // seat so the timeline can be followed.
      ...reads.map((read) => [
        read.villainId,
        villainIds.length > 1 ? `The ${read.position.toLowerCase()}` : "Opponent",
      ]),
    ])),
    options: evs.map((entry) => ({
      id: entry.id,
      label: entry.label,
      ev: Number(entry.ev.toFixed(2)),
      // What he did about it: the share of play-outs in which his first reply
      // to this action was a fold, a call, a raise, a bet or a check. This is
      // what lets the coaching name the reason instead of quoting the result.
      answered: Object.fromEntries(
        Object.entries(entry.answered ?? {}).map(([type, share]) => [type, Number(share.toFixed(3))]),
      ),
      // Share of play-outs in which everyone folded and the hero took it down.
      uncontested: Number((entry.uncontested ?? 0).toFixed(3)),
    })),
    best: { id: best.id, label: best.label, ev: Number(best.ev.toFixed(2)) },
    tempting: { id: tempt.id, label: tempt.label, ev: Number(tempt.ev.toFixed(2)) },
    evGap: Number(gap.toFixed(2)),
    evGapBB: Number((gap / 3).toFixed(2)),
    evGapPot: pot > 0 ? Number((gap / pot).toFixed(3)) : 0,
    villainChecks,
    // The read model's own summary, for the FIRST opponent. Each opponent's
    // own numbers travel with them under `opponents`.
    range: reads[0].range && {
      combos: reads[0].range.combos ?? null,
      top: reads[0].range.top ?? null,
      confident: reads[0].range.confident ?? false,
      reason: reads[0].range.reason ?? null,
      buckets: reads[0].range.buckets ?? null,
    },
    rangeSource,
    showdown: split,
    // The range grouped into hand classes. This is what turns "323 of 990
    // beat you" from a number into a range a learner can picture.
    breakdown: rangeBreakdown({ heroCards, board, holdings: quoted }),
    // `showdown` counts the FIELD: for two opponents it is a count over the
    // pairs of holdings they can be dealt between them, not over one range.
    fieldOpponents: villainIds.length,
    capped: cap && {
      strongShare: cap.strongShare === null ? null : Number((cap.strongShare * 100).toFixed(1)),
      baseline: cap.baseline === null ? null : Number((cap.baseline * 100).toFixed(1)),
      capped: cap.capped,
      meaningful: cap.meaningful ?? false,
      quotedCombos: cap.quotedCombos ?? null,
    },
    rollouts,
  };
}
// ------------------------------------------------------------------- driver
async function main() {
  const started = Date.now();
  const candidates = [];
  let dealt = 0;
  let spots = 0;
  // Where spots go when they do not become candidates. Without this a whole
  // class of spot can vanish silently - three-handed hands did, and the run
  // still reported a healthy total.
  const dropped = {};
  const drop = (why, players) => { const k = `${players}-handed: ${why}`; dropped[k] = (dropped[k] ?? 0) + 1; };

  for (let handIndex = 0; handIndex < HANDS; handIndex += 1) {
    const rng = createSeededRng(SEED + handIndex * 104_729);
    dealt += 1;
    let spot;
    try {
      // Rotate the target street AND the number of players, so the shipped set
      // covers all three streets both heads-up and three-handed rather than
      // filling up on whichever is commonest.
      spot = findSpot(
        handIndex, rng,
        STREETS[handIndex % STREETS.length],
        SEATING[Math.floor(handIndex / STREETS.length) % SEATING.length],
      );
    } catch {
      continue;
    }
    if (!spot) continue;
    spots += 1;

    const { game, legal, profiles, heroId, villainIds, heroContext, decisionsFor, street } = spot;
    const hand = game.table.currentHand;
    const heroCards = playerOf(hand, heroId)?.holeCards ?? [];
    const board = hand.board ?? [];
    const expectedBoard = { flop: 3, turn: 4, river: 5 }[street];
    const seated = villainIds.length + 1;
    if (heroCards.length !== 2 || board.length !== expectedBoard) { drop("bad deal", seated); continue; }

    const pot = heroContext.pot;
    if (pot < (MIN_POT_BB[street] ?? 12) * 3) { drop("pot too small", seated); continue; }
    const actions = candidateActions(legal, pot, heroContext.effectiveStack);
    if (actions.length < 2) { drop("fewer than two actions", seated); continue; }

    // --- what each opponent's actions actually imply ----------------------
    // This runs BEFORE the EV, because the EV is measured against these ranges.
    // Computing them afterwards is what let the two describe different players.
    const known = [...board, ...heroCards];
    // Below this, the read model has narrowed to a range too small to quote to a
    // learner. "He has exactly three hands" is confident and indefensible.
    const MIN_CREDIBLE_COMBOS = 100;

    const reads = villainIds.map((villainId) => {
      const profile = profiles.get(villainId);
      const decisions = decisionsFor(villainId);
      let range = null;
      let holdings = null;
      let source = "heuristic";
      try {
        range = estimateRange({ decisions, profile, board, knownCards: known });
        const modelled = range?.holdings ?? [];
        const uniform = plausibleRange(board, known);
        const credible = modelled.length >= MIN_CREDIBLE_COMBOS
          && range?.confident
          // A range that has narrowed away the hands which beat the hero is an
          // artifact, not a read: one dropped every ace on an ace-high board
          // and reported that 1% of his range was ahead.
          && rangeIsCredible({ heroCards, board, modelled, uniform });
        holdings = credible ? modelled : uniform;
        source = credible ? "modelled" : "heuristic";
      } catch {
        holdings = plausibleRange(board, known);
      }
      return {
        villainId,
        profile,
        range,
        holdings: holdings ?? plausibleRange(board, known),
        source,
        checks: decisions.filter((d) => d.action?.type === "check").length,
        position: positionName(hand, villainId),
        archetype: profile?.archetype ?? null,
      };
    });

    // The field is only as narrowed as its least-narrowed member: calling the
    // count "hands that fit how they have played" when one of the two is a
    // uniform fallback would overclaim on that one.
    const rangeSource = reads.every((read) => read.source === "modelled") ? "modelled" : "heuristic";
    const quoted = reads[0].holdings;
    let cap = null;
    try {
      cap = cappedness({ holdings: quoted, board, knownCards: known });
      const meaningful = cap.baseline !== null && cap.baseline <= MAX_MEANINGFUL_BASELINE;
      cap = {
        ...cap,
        quotedCombos: quoted.length,
        // Suppressed rather than shown wrong: on a paired board almost every
        // hand makes two pair, so "100% of his range is strong" is an artifact
        // of the board, not a read on the opponent.
        meaningful,
        capped: meaningful ? cap.capped : null,
      };
    } catch { /* cap stays null; the spot is still usable */ }

    const villainChecks = reads[0].checks;
    const heroBucket = bucketOfHolding(heroCards, board);
    const split = showdownVsField({ heroCards, board, ranges: reads.map((read) => read.holdings) });
    // A field the hero beats all of, or none of, makes the read question answer
    // itself - and now that the EV is measured against these same ranges, it
    // also makes the EV a foregone conclusion. Drop the spot here rather than
    // let curation quietly recount it against a different range later.
    if (split.beats === 0 || split.beats === split.total) { drop("field beats you never or always", seated); continue; }

    // --- EV of every candidate action, by play-out ------------------------
    // Every opponent is dealt a fresh hand from their OWN range on every trial,
    // so this measures the action against the whole field rather than against
    // the hands they happened to be dealt before the decision point.
    const opponents = reads.map((read) => ({ playerId: read.villainId, holdings: read.holdings }));
    // One competent policy plays the hero's LATER streets, instead of whichever
    // archetype the hero's seat drew. The EV should say what the action is worth
    // if you play on sensibly, not what it is worth if a calling station
    // finishes the hand for you.
    const heroProfile = createBotProfile({
      id: heroId, displayName: "hero", archetype: HERO_POLICY,
      rng: createSeededRng(SEED + handIndex * 613), variance: 0,
    });
    const evs = [];
    for (const entry of actions) {
      const measured = rollout({
        game, profiles, playerId: heroId, action: entry.action, opponents, heroProfile,
        trials: ROLLOUTS, seed: SEED + handIndex * 31 + entry.id.length,
      });
      if (measured === null) continue;
      evs.push({ ...entry, ev: measured.ev, answered: measured.answered, uncontested: measured.uncontested });
    }
    if (evs.length < 2) { drop("fewer than two measurable actions", seated); continue; }

    evs.sort((a, b) => b.ev - a.ev);
    const best = evs[0];
    const temptId = temptingAction({ game, legal, heroId, candidates: evs, seed: SEED + handIndex });
    const tempt = evs.find((entry) => entry.id === temptId) ?? evs[evs.length - 1];
    const gap = best.ev - tempt.ev;
    if (pot <= 0 || gap / pot < MIN_GAP_POT) { drop("EV gap too small", seated); continue; }
    const leak = classifyLeak({
      legal, bestId: best.id, temptId: tempt.id,
      heroBeatsPct: split.beatsPct, villainChecks,
      opponent: reads[0].archetype,
    });

    candidates.push(buildCandidate({
      hand, heroId, villainIds, heroCards, board, street, legal, heroContext,
      reads, quoted, split, cap, rangeSource, evs, best, tempt, gap, pot,
      villainChecks, heroBucket,
      leak, seed: SEED, handIndex, rollouts: ROLLOUTS,
    }));

    if (candidates.length % 25 === 0) {
      process.stdout.write(`  ${candidates.length} scored (${handIndex + 1}/${HANDS} dealt)\n`);
    }
  }

  // Rank by how big the mistake is RELATIVE TO THE POT. A $115 error in a $158
  // pot and a $12 error in a $25 pot are the same lesson; raw dollars would
  // rank every big pot above every small one regardless of how instructive.
  candidates.sort((a, b) => b.evGapPot - a.evGapPot);
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({
    generatedFrom: { hands: HANDS, rollouts: ROLLOUTS, seed: SEED },
    dealt, spots, scored: candidates.length,
    seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    candidates,
  }, null, 2));

  const byStreet = {};
  for (const candidate of candidates) byStreet[candidate.street] = (byStreet[candidate.street] ?? 0) + 1;
  console.log(`
dealt ${dealt} hands -> ${spots} heads-up spots -> ${candidates.length} scored`);
  console.log(`streets: ${Object.entries(byStreet).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  const bySeating = {};
  for (const candidate of candidates) bySeating[candidate.players] = (bySeating[candidate.players] ?? 0) + 1;
  console.log(`players: ${Object.entries(bySeating).map(([k, v]) => `${k}-handed ${v}`).join(" | ")}`);
  console.log("dropped:");
  for (const [why, n] of Object.entries(dropped).sort((a, b) => b[1] - a[1])) console.log(`  ${why}: ${n}`);
  const mid = candidates[Math.floor(candidates.length / 2)];
  console.log(`EV gap (share of pot): max ${candidates[0]?.evGapPot ?? 0}, median ${mid?.evGapPot ?? 0}`);
  console.log(`wrote ${OUT} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

// Only run when invoked directly, so the helpers above stay importable.
if (process.argv[1] && process.argv[1].endsWith("generate-hands.mjs")) main();
