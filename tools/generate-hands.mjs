// Poker Coach content generator.
//
// Deals hands with poker-sim's engine, finds heads-up postflop spots where a
// tempting play is measurably worse than the best one, computes the opponent's
// range from their actual actions, and emits scored candidates.
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
  estimateRange, cappedness, bucketOfHolding, candidateCombos, archetypeById, plausibleRange, createBotProfile, showdownSplit,
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
function positionName(hand, playerId) {
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
function facingActionOf(hand, villainId, street) {
  let last = null;
  for (const event of hand.events ?? []) {
    if (event.type !== "ACTION" || event.street !== street) continue;
    if (event.playerId !== villainId) continue;
    if (event.action === "bet" || event.action === "raise") {
      last = { type: event.action, to: Math.round(event.streetTotal ?? event.paid ?? 0) };
    }
  }
  return last;
}

// --------------------------------------------------------------- spot search
/**
 * Play one hand, stopping at the first heads-up river decision, and return
 * everything that decision depends on.
 */
function findSpot(handIndex, rng, wantStreet) {
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

    // Only the street this hand was asked for. Taking the first heads-up spot
    // instead gave 28 flops to 6 turns to 1 river, because most hands are still
    // two-handed on the flop and thin out after.
    if (hand.phase === wantStreet && livePlayers(hand).length === 2) {
      const heroId = legal.playerId;
      const villain = livePlayers(hand).find((p) => p.id !== heroId);
      if (villain && context.pot > 0) {
        return {
          game, legal, profiles, heroId, villainId: villain.id,
          street: hand.phase,
          heroContext: context,
          villainDecisions: decisionsByPlayer.get(villain.id) ?? [],
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

function classifyLeak({ legal, bestId, temptId, heroBeatsPct, villainChecks, opponent }) {
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
function renderHistory(hand, heroId, villainId) {
  const streets = { preflop: [], flop: [], turn: [], river: [] };
  const conjugate = (id, verb) => {
    // "You raise", "Opponent raises".
    const you = id === heroId;
    const forms = { bet: "bet", raise: "raise", call: "call", check: "check", fold: "fold" };
    const stem = forms[verb] ?? verb;
    return you ? stem : `${stem}s`;
  };
  let foldedOut = 0;
  for (const event of hand.events ?? []) {
    if (event.type !== "ACTION") continue;
    const bucket = streets[event.street];
    if (!bucket) continue;
    if (event.playerId !== heroId && event.playerId !== villainId) {
      if (event.action === "fold") foldedOut += 1;
      continue;
    }
    const who = event.playerId === heroId ? "You" : "Opponent";
    const verb = conjugate(event.playerId, event.action);
    const detail = event.action === "bet" || event.action === "raise"
      ? ` to ${money(event.streetTotal ?? event.paid)}`
      : event.action === "call" ? ` ${money(event.paid)}`
      : "";
    bucket.push(`${who} ${verb}${detail}.`);
  }
  if (foldedOut > 0) {
    streets.preflop.unshift(`${foldedOut} player${foldedOut === 1 ? "" : "s"} fold.`);
  }
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

// ------------------------------------------------------------------- driver
async function main() {
  const started = Date.now();
  const candidates = [];
  let dealt = 0;
  let spots = 0;

  for (let handIndex = 0; handIndex < HANDS; handIndex += 1) {
    const rng = createSeededRng(SEED + handIndex * 104_729);
    dealt += 1;
    let spot;
    try {
      // Rotate the target street so the shipped set covers all three.
      spot = findSpot(handIndex, rng, STREETS[handIndex % STREETS.length]);
    } catch {
      continue;
    }
    if (!spot) continue;
    spots += 1;

    const { game, legal, profiles, heroId, villainId, heroContext, villainDecisions, street } = spot;
    const hand = game.table.currentHand;
    const heroCards = playerOf(hand, heroId)?.holeCards ?? [];
    const board = hand.board ?? [];
    const expectedBoard = { flop: 3, turn: 4, river: 5 }[street];
    if (heroCards.length !== 2 || board.length !== expectedBoard) continue;

    const pot = heroContext.pot;
    if (pot < (MIN_POT_BB[street] ?? 12) * 3) continue;
    const actions = candidateActions(legal, pot);
    if (actions.length < 2) continue;

    // --- what the opponent's actions actually imply -----------------------
    // This runs BEFORE the EV, because the EV is measured against this range.
    // Computing it afterwards is what let the two describe different opponents.
    const villainProfile = profiles.get(villainId);
    const known = [...board, ...heroCards];
    let range = null;
    let cap = null;
    let rangeSource = "none";
    let quotedHoldings = null;
    // Below this, the read model has narrowed to a range too small to quote to a
    // learner. "He has exactly three hands" is confident and indefensible.
    const MIN_CREDIBLE_COMBOS = 100;
    try {
      range = estimateRange({
        decisions: villainDecisions, profile: villainProfile, board, knownCards: known,
      });
      const modelled = range?.holdings ?? [];
      const credible = modelled.length >= MIN_CREDIBLE_COMBOS && range?.confident;
      const holdings = credible ? modelled : plausibleRange(board, known);
      quotedHoldings = holdings;
      rangeSource = credible ? "modelled" : "heuristic";
      cap = cappedness({ holdings, board, knownCards: known });
      const meaningful = cap.baseline !== null && cap.baseline <= MAX_MEANINGFUL_BASELINE;
      cap = {
        ...cap,
        quotedCombos: holdings.length,
        // Suppressed rather than shown wrong: on a paired board almost every
        // hand makes two pair, so "100% of his range is strong" is an artifact
        // of the board, not a read on the opponent.
        meaningful,
        capped: meaningful ? cap.capped : null,
      };
    } catch { /* range stays null; the spot is still usable */ }

    const villainChecks = villainDecisions.filter((d) => d.action?.type === "check").length;
    const heroBucket = bucketOfHolding(heroCards, board);
    const quoted = quotedHoldings ?? plausibleRange(board, known);
    const split = showdownSplit({ heroCards, board, holdings: quoted });
    // A range the hero beats all of, or none of, makes the read question answer
    // itself - and now that the EV is measured against this same range, it also
    // makes the EV a foregone conclusion. Drop the spot here rather than let
    // curation quietly recount it against a different range later.
    if (split.beats === 0 || split.beats === split.total) continue;

    // --- EV of every candidate action, by play-out ------------------------
    // The villain is dealt a fresh hand from `quoted` on every trial, so this
    // measures the action against his whole range rather than against the one
    // hand he was dealt before the decision point.
    const opponents = [{ playerId: villainId, holdings: quoted }];
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
      evs.push({ ...entry, ev: measured.ev, answered: measured.answered });
    }
    if (evs.length < 2) continue;

    evs.sort((a, b) => b.ev - a.ev);
    const best = evs[0];
    const temptId = temptingAction({ game, legal, heroId, candidates: evs, seed: SEED + handIndex });
    const tempt = evs.find((entry) => entry.id === temptId) ?? evs[evs.length - 1];
    const gap = best.ev - tempt.ev;
    if (pot <= 0 || gap / pot < MIN_GAP_POT) continue;
    const leak = classifyLeak({
      legal, bestId: best.id, temptId: tempt.id,
      heroBeatsPct: split.beatsPct, villainChecks,
      opponent: villainProfile?.archetype ?? null,
    });

    candidates.push({
      // Seeded, because two pools generated with different seeds both emit a
      // hand at index 17 and the merge dedupes on cards, not id - so `gen-17`
      // could ship twice meaning two different hands. The seed also makes a
      // candidate replayable: seed + handIndex + street reproduces this exact
      // game state.
      id: `gen-${SEED}-${handIndex}`,
      handIndex,
      seed: SEED,
      leak,
      street: street.charAt(0).toUpperCase() + street.slice(1),
      pot: money(pot),
      potRaw: pot,
      effective: `${money(heroContext.effectiveStack ?? heroContext.stack)} behind`,
      heroPosition: positionName(hand, heroId),
      opponentPosition: positionName(hand, villainId),
      inPosition: Boolean(heroContext.position?.inPosition),
      opponentArchetype: villainProfile?.archetype ?? null,
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
      facingAction: facingActionOf(hand, villainId, street),
      history: renderHistory(hand, heroId, villainId),
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
      })),
      best: { id: best.id, label: best.label, ev: Number(best.ev.toFixed(2)) },
      tempting: { id: tempt.id, label: tempt.label, ev: Number(tempt.ev.toFixed(2)) },
      evGap: Number(gap.toFixed(2)),
      evGapBB: Number((gap / 3).toFixed(2)),
      evGapPot: pot > 0 ? Number((gap / pot).toFixed(3)) : 0,
      villainChecks,
      range: range && {
        combos: range.combos ?? null,
        top: range.top ?? null,
        confident: range.confident ?? false,
        reason: range.reason ?? null,
        buckets: range.buckets ?? null,
      },
      rangeSource,
      showdown: split,
      // The range grouped into hand classes. This is what turns "323 of 990
      // beat you" from a number into a range a learner can picture.
      breakdown: rangeBreakdown({ heroCards, board, holdings: quoted }),
      capped: cap && {
        strongShare: cap.strongShare === null ? null : Number((cap.strongShare * 100).toFixed(1)),
        baseline: cap.baseline === null ? null : Number((cap.baseline * 100).toFixed(1)),
        capped: cap.capped,
        meaningful: cap.meaningful ?? false,
        quotedCombos: cap.quotedCombos ?? null,
      },
      rollouts: ROLLOUTS,
    });

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
  const mid = candidates[Math.floor(candidates.length / 2)];
  console.log(`EV gap (share of pot): max ${candidates[0]?.evGapPot ?? 0}, median ${mid?.evGapPot ?? 0}`);
  console.log(`wrote ${OUT} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main();
