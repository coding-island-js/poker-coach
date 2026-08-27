// Turns a turn lesson into a two-decision lesson: the turn, then the river of
// the SAME hand, on the line the learner actually chose.
//
// This is the one thing the product was missing that a real coach does. Every
// spot until now has been a snapshot, so a learner never found out that the
// turn bet they picked was the reason the river was unplayable.
//
// Two things make it honest rather than merely clever:
//
//   1. The river follows the LEARNER's action, not the bot's. Every branch a
//      learner can pick is played forward separately, which is why they are all
//      precomputed - there is no engine in the browser.
//   2. The turn's EV came from 250 randomised runouts. The river shown is ONE of
//      them. The runout is never chosen on whether the hero's turn play looks
//      good; it is simply the one the deck held. Selecting on that would be
//      cherry-picking, and this pipeline's whole claim is that it does not.
//
//   node tools/chain-hands.mjs --in public/hands.json --out public/hands.json
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  act, getLegalActions, getBotHandContext, decideBotAction, createSeededRng, playOut, finalStack,
  candidateActions, rollout, estimateRange, plausibleRange, showdownVsField,
  rangeBreakdown, cappedness, bucketOfHolding, livePlayers, playerOf, rangeIsCredible,
  createBotProfile,
} from "./lib/engine.mjs";
import { replaySpot, matchesCandidate } from "./lib/replay.mjs";
import {
  buildCandidate, positionName, renderHistory, classifyLeak, facingActionOf,
} from "./generate-hands.mjs";
import { toLesson, standing } from "./curate.mjs";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const IN = arg("in", "public/hands.json");
const OUT = arg("out", "public/hands.json");
const ROLLOUTS = Number.parseInt(arg("rollouts", "250"), 10);

const HERO_POLICY = "grinder-pro";
const MIN_CREDIBLE_COMBOS = 100;
const MIN_GAP_POT = 0.08;
const ACTION_CAP = 300;

const SUITS = { c: "♣", d: "♦", h: "♥", s: "♠" };
const pretty = (code) => `${code[0] === "T" ? "10" : code[0]}${SUITS[code[1]] ?? code[1]}`;
const prettyAll = (codes) => (codes ?? []).map(pretty);
const money = (n) => `$${Math.round(n)}`;

/**
 * Play forward from the hero's forced action until the hero has to act again,
 * or the hand ends. Bots act as themselves; the hero does not act at all, which
 * is the point - the next decision is the one being handed back to the learner.
 */
function advanceToHero(game, profiles, heroId, rng) {
  let g = game;
  const replies = [];
  const boardBefore = (g.table.currentHand.board ?? []).length;
  // The pot has to be read while the hand is still live: once it completes the
  // context reports zero, and the terminal line read "You take the $0."
  let pot = getBotHandContext(g, heroId)?.pot ?? 0;
  let guard = 0;
  while (getLegalActions(g) !== null) {
    if (guard += 1, guard > ACTION_CAP) break;
    const legal = getLegalActions(g);
    if (legal.canChop) { g = act(g, { type: "fold" }); continue; }
    if (legal.playerId === heroId) {
      return { game: g, legal, ended: false, replies, pot: getBotHandContext(g, heroId)?.pot ?? pot, boardBefore };
    }

    const context = getBotHandContext(g, legal.playerId);
    const action = decideBotAction({ profile: profiles.get(legal.playerId), legal, hand: context, rng });
    replies.push({ playerId: legal.playerId, action, street: g.table.currentHand.phase });
    g = act(g, action);
    pot = Math.max(pot, getBotHandContext(g, heroId)?.pot ?? 0, context.pot ?? 0);
  }
  return { game: g, ended: true, replies, pot, boardBefore };
}

/**
 * How a branch that ended actually ended.
 *
 * A hand can end two ways and they are not the same story: everyone folds and
 * the hero takes it, or the chips go in and it is shown down. Reporting the
 * second as "you take the pot" was wrong on every all-in the hero lost.
 */
function outcomeOf({ game, profiles, heroId, rng, stackBefore, everyoneFolded, pot }) {
  const finished = getLegalActions(game) === null ? game : playOut(game, profiles, rng);
  const delta = Math.round(finalStack(finished, heroId) - stackBefore);
  // `pot` includes the hero's own bet, so reporting it as the take counts the
  // hero's money as profit - the exact habit this app exists to break. Report
  // what actually changed hands.
  if (everyoneFolded) {
    return delta > 0 ? `They fold. You win ${money(delta)}.` : "They fold and you take it down.";
  }
  if (delta > 0) return `It goes to showdown and you win ${money(delta)}.`;
  if (delta < 0) return `It goes to showdown and you lose ${money(Math.abs(delta))}.`;
  return "It goes to showdown and the pot is split.";
}

/**
 * Plain English for what the opponents did in reply to the learner's action,
 * and which card it brought. Without the card a branch read "He calls." and
 * stopped, which does not close the loop on anything.
 */
function replyLine(replies, labels, endedEarly, pot, dealt = null) {
  const said = [];
  for (const reply of replies) {
    const who = labels.get(reply.playerId) ?? "Opponent";
    const verb = { fold: "folds", call: "calls", check: "checks", bet: "bets", raise: "raises", "all-in": "moves all in" }[reply.action.type] ?? reply.action.type;
    const detail = reply.action.to ? ` to ${money(reply.action.to)}` : "";
    said.push(`${who} ${verb}${detail}.`);
  }
  if (dealt) said.push(`The ${dealt.street} is the ${dealt.card}.`);
  if (endedEarly) said.push(`You take the ${money(pot)}.`);
  return said.join(" ");
}

/** The ranges each opponent still in can hold, given everything they have done. */
function readsFor({ hand, heroId, board, heroCards, decisionsFor, profiles }) {
  const known = [...board, ...heroCards];
  return livePlayers(hand).filter((p) => p.id !== heroId).map((player) => {
    const profile = profiles.get(player.id);
    const decisions = decisionsFor(player.id);
    let range = null;
    let holdings = null;
    let source = "heuristic";
    try {
      range = estimateRange({ decisions, profile, board, knownCards: known });
      const modelled = range?.holdings ?? [];
      const uniform = plausibleRange(board, known);
      const credible = modelled.length >= MIN_CREDIBLE_COMBOS
        && range?.confident
        && rangeIsCredible({ heroCards, board, modelled, uniform });
      holdings = credible ? modelled : uniform;
      source = credible ? "modelled" : "heuristic";
    } catch {
      holdings = plausibleRange(board, known);
    }
    return {
      villainId: player.id,
      profile,
      range,
      holdings: holdings ?? plausibleRange(board, known),
      source,
      checks: decisions.filter((d) => d.action?.type === "check").length,
      position: positionName(hand, player.id),
      archetype: profile?.archetype ?? null,
    };
  });
}

/**
 * Score the hero's next decision on this branch, and return it as a lesson, or
 * null when there is nothing worth asking about.
 */
function scoreContinuation({ game, legal, profiles, heroId, decisionsFor, seed, handIndex, historyLabels }) {
  const hand = game.table.currentHand;
  const street = hand.phase;
  const heroCards = playerOf(hand, heroId)?.holeCards ?? [];
  const board = hand.board ?? [];
  const heroContext = getBotHandContext(game, heroId);
  const pot = heroContext.pot;
  if (heroCards.length !== 2 || !board.length || pot <= 0) return null;

  const actions = candidateActions(legal, pot, heroContext.effectiveStack);
  if (actions.length < 2) return null;

  const villainIds = livePlayers(hand).filter((p) => p.id !== heroId).map((p) => p.id);
  if (villainIds.length < 1 || villainIds.length > 2) return null;

  const reads = readsFor({ hand, heroId, board, heroCards, decisionsFor, profiles });
  const known = [...board, ...heroCards];
  const quoted = reads[0].holdings;
  const rangeSource = reads.every((read) => read.source === "modelled") ? "modelled" : "heuristic";

  let split;
  try {
    split = showdownVsField({ heroCards, board, ranges: reads.map((read) => read.holdings) });
  } catch { return null; }
  if (split.beats === 0 || split.beats === split.total) return null;

  let cap = null;
  try {
    cap = cappedness({ holdings: quoted, board, knownCards: known });
    cap = { ...cap, quotedCombos: quoted.length, meaningful: false, capped: null };
  } catch { /* optional */ }

  const heroProfile = createBotProfile({
    id: heroId, displayName: "hero", archetype: HERO_POLICY,
    rng: createSeededRng(seed + handIndex * 613), variance: 0,
  });
  const opponents = reads.map((read) => ({ playerId: read.villainId, holdings: read.holdings }));

  const evs = [];
  for (const entry of actions) {
    const measured = rollout({
      game, profiles, playerId: heroId, action: entry.action, opponents, heroProfile,
      trials: ROLLOUTS, seed: seed + handIndex * 37 + entry.id.length,
    });
    if (measured === null) continue;
    evs.push({ ...entry, ev: measured.ev, answered: measured.answered, uncontested: measured.uncontested });
  }
  if (evs.length < 2) return null;
  evs.sort((a, b) => b.ev - a.ev);
  const best = evs[0];
  const tempt = evs[evs.length - 1];
  const gap = best.ev - tempt.ev;
  // The runner-up, not the worst option: best-versus-worst can be a wide gap
  // while the top two are a coin toss, and the learner who picks the
  // runner-up then gets a cross for three dollars.
  const margin = best.ev - (evs[1]?.ev ?? best.ev);
  if (gap / pot < MIN_GAP_POT || margin / pot < MIN_GAP_POT) return null;
  // Spots where every line loses are damage control, not a leak.
  if (best.ev <= 0) return null;

  const villainChecks = reads[0].checks;
  const heroBucket = bucketOfHolding(heroCards, board);
  const leak = classifyLeak({
    legal, bestId: best.id, temptId: tempt.id,
    heroBeatsPct: split.beatsPct, villainChecks, opponent: reads[0].archetype,
  });

  const candidate = buildCandidate({
    hand, heroId, villainIds, heroCards, board, street, legal, heroContext,
    reads, quoted, split, cap, rangeSource, evs, best, tempt, gap, pot,
    villainChecks, heroBucket, leak, seed, handIndex, rollouts: ROLLOUTS,
  });
  return toLesson(candidate, 0);
}

async function main() {
  const data = JSON.parse(await readFile(IN, "utf8"));
  const hands = data.hands ?? [];
  let chained = 0;
  let branches = 0;
  let terminal = 0;
  let played = 0;
  const skipped = {};
  const skip = (why) => { skipped[why] = (skipped[why] ?? 0) + 1; };

  for (const lesson of hands) {
    // Flop and turn spots continue one street. The river has nothing after it,
    // and a hand is deliberately never carried all the way from flop to river:
    // three decisions means up to 27 pre-computed versions of one hand, and the
    // app already asks a lot per hand. Decided with Raj 2026-08-27.
    if (lesson.street !== "Turn" && lesson.street !== "Flop") continue;
    if (!lesson.source || lesson.source.seed === null) { skip("no source coordinates"); continue; }

    const spot = replaySpot(lesson.source);
    const asCandidate = {
      heroCodes: lesson.hero.map(toCode),
      boardCodes: lesson.board.map(toCode),
      potRaw: Number(String(lesson.pot).replace(/[^0-9.]/g, "")),
    };
    if (!matchesCandidate(spot, asCandidate)) { skip("replay did not reproduce the spot"); continue; }

    const { game, legal, profiles, heroId } = spot;
    const pot = spot.heroContext.pot;
    const actions = candidateActions(legal, pot, spot.heroContext.effectiveStack);
    // Everyone who was still in at the decision, whether or not they are still
    // in later. Labelling only the survivors deleted the actions of anyone who
    // folded afterwards, which left histories reading "You check. Opponent
    // checks. You call $8." - a call with no bet in front of it.
    const seatedNow = livePlayers(game.table.currentHand).filter((p) => p.id !== heroId);
    const labels = new Map(seatedNow.map((p) => {
      const seat = positionName(game.table.currentHand, p.id);
      return [p.id, seatedNow.length > 1 ? `The ${seat.toLowerCase()}` : "He"];
    }));

    const chain = { branches: {} };
    for (const entry of actions) {
      // Folding ends it. That is still worth closing the loop on, but there is
      // nothing left to ask.
      if (entry.id === "fold") {
        chain.branches[entry.id] = {
          kind: "terminal",
          outcome: `You fold. ${lesson.players >= 3 ? "They" : "He"} take${lesson.players >= 3 ? "" : "s"} the ${money(pot)}.`,
        };
        terminal += 1;
        continue;
      }

      const rng = createSeededRng(lesson.source.seed + lesson.source.handIndex * 91 + entry.id.length);
      const heroStackBefore = playerOf(game.table.currentHand, heroId)?.stack ?? 0;
      // Captured BEFORE the hero acts: a call can close the street, so by the
      // time `act` returns the next card is already out and comparing against
      // the post-action board reported that nothing had been dealt.
      const boardBeforeAction = (game.table.currentHand.board ?? []).length;
      let after;
      try {
        after = act(game, entry.action);
      } catch { continue; }

      // Everything the opponents did after the learner's action, so their
      // ranges at the next decision reflect THIS line and not the bot's.
      const decisions = new Map();
      const forward = advanceToHero(after, profiles, heroId, rng);
      for (const reply of forward.replies) {
        const log = decisions.get(reply.playerId) ?? [];
        // The generator records {legal, context, action}; recording only the
        // action made every one of these invisible to the read model, so the
        // range never narrowed for anything the opponent did after the
        // learner's choice. Three branches of one hand - he bets $15, he
        // raises to $43, he raises to $67 - all produced a character-identical
        // count of what he could hold.
        log.push({ legal: reply.legal, context: reply.context, action: reply.action });
        decisions.set(reply.playerId, log);
      }
      const decisionsFor = (id) => [...(spot.decisionsFor(id) ?? []), ...(decisions.get(id) ?? [])];

      const nextHand = forward.game.table.currentHand;
      const stillIn = livePlayers(nextHand).filter((p) => p.id !== heroId).length;
      const finalPot = forward.pot || pot;
      // The card the street turned over, if the hand got that far.
      const nowBoard = nextHand.board ?? [];
      const dealt = nowBoard.length > boardBeforeAction
        ? { street: nowBoard.length === 5 ? "river" : "turn", card: pretty(nowBoard[nowBoard.length - 1]) }
        : null;

      if (forward.ended || stillIn === 0) {
        const everyoneFolded = stillIn === 0;
        const ending = outcomeOf({
          game: forward.game, profiles, heroId, rng,
          stackBefore: heroStackBefore, everyoneFolded, pot: finalPot,
        });
        const told = replyLine(forward.replies, labels, false, finalPot, dealt);
        chain.branches[entry.id] = {
          kind: "terminal",
          outcome: `${told} ${ending}`.trim(),
        };
        terminal += 1;
        continue;
      }

      const continuation = scoreContinuation({
        game: forward.game, legal: forward.legal, profiles, heroId, decisionsFor,
        seed: lesson.source.seed, handIndex: lesson.source.handIndex,
        historyLabels: new Map([[heroId, "You"], ...labels]),
      });

      // A range can only ever NARROW. You can rule hands out as someone acts;
      // you cannot rule them back in. When the read model gives up mid-hand and
      // falls back to the wide range, his range "grows" after he bets - which is
      // a contradiction, not a read. One branch went from 99,344 ways to 893,970.
      if (continuation && continuation.numbers.total > lesson.numbers.total) {
        skip("continuation range grew after he acted");
        chain.branches[entry.id] = {
          kind: "played-out",
          outcome: replyLine(forward.replies, labels, false, finalPot, dealt)
            || `The hand plays on to the ${nextHand.phase}.`,
        };
        played += 1;
        continue;
      }

      if (!continuation) {
        // The hand went on but the next decision is not worth a question. Say
        // what happened anyway - it closes the loop on the learner's choice.
        chain.branches[entry.id] = {
          kind: "played-out",
          // When nobody had to act - the hero called and is first up on the
          // next street - there is no reply to report, only the new card.
          outcome: replyLine(forward.replies, labels, false, finalPot, dealt)
            || `The hand plays on to the ${nextHand.phase}.`,
        };
        played += 1;
        continue;
      }

      chain.branches[entry.id] = {
        kind: "question",
        reply: replyLine(forward.replies, labels, false, finalPot, dealt),
        // Named by its real street: if the opponent raised, the second decision
        // is still on the turn, and calling it "the river" would be a lie about
        // a hand the learner is looking at.
        street: continuation.street,
        // One id per BRANCH. A hand with three playable lines has three
        // continuations, and giving them all "h010b" collided three ways.
        lesson: { ...continuation, id: `${lesson.id}-${entry.id}`, chainId: lesson.id, step: 2 },
      };
      branches += 1;
    }

    if (Object.values(chain.branches).some((branch) => branch.kind === "question")) {
      lesson.chain = chain;
      chained += 1;
    }
  }

  await writeFile(OUT, JSON.stringify({ ...data, hands }, null, 2));
  const turns = hands.filter((hand) => hand.street === "Turn" || hand.street === "Flop").length;
  console.log(`chained ${chained} of ${turns} flop and turn hands`);
  console.log(`  branches: ${branches} second questions, ${terminal} end the hand, ${played} play on without a question`);
  for (const [why, n] of Object.entries(skipped)) console.log(`  skipped: ${why}: ${n}`);
  console.log(`wrote ${OUT}`);
}

const SUIT_CODES = { "♣": "c", "♦": "d", "♥": "h", "♠": "s" };
function toCode(prettyCard) {
  const suit = SUIT_CODES[prettyCard.slice(-1)];
  const rank = prettyCard.slice(0, -1) === "10" ? "T" : prettyCard.slice(0, -1);
  return `${rank}${suit}`;
}

if (process.argv[1] && basename(process.argv[1]) === "chain-hands.mjs") main();
