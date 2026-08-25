// Thin adapter over poker-sim. Everything that knows poker-sim's shape lives
// here, so the generator itself reads as poker-coach code.
//
// poker-sim is imported from a sibling checkout. It is a build-time dependency
// of the content pipeline only - nothing here ships to the browser.
import { createDeck, shuffleDeck } from "../../../poker-sim/src/cards.js";
import { act, createCashGame, getLegalActions, startNextCashHand, STAKE_PRESETS } from "../../../poker-sim/src/cash-game.js";
import { decideBotAction } from "../../../poker-sim/src/bots/decision.js";
import { getBotHandContext } from "../../../poker-sim/src/bots/runner.js";
import { createBotProfile, createSeededRng, listArchetypes, suggestBotBuyIn } from "../../../poker-sim/src/bots/profile.js";
import { estimateRange, bucketOfHolding, candidateCombos } from "../../../poker-sim/src/analytics/range-model.js";
import { cappedness } from "../../../poker-sim/src/analytics/range-shape.js";
import { scoreCards, cardIndexes } from "../../../poker-sim/src/analytics/fast-eval.js";

export { createBotProfile, act, getLegalActions, getBotHandContext, decideBotAction, createSeededRng, listArchetypes, estimateRange, cappedness, bucketOfHolding, candidateCombos, scoreCards, cardIndexes };

export const STAKE = STAKE_PRESETS["lucky-lady-2/3"];
export const SEAT_COUNT = 6;
const ACTION_CAP = 300;

// Calibration runs pay no rake; every field the drop is built from must be
// zeroed or the room preset's flat $5 leaks back in.
const NO_RAKE = Object.freeze({
  type: "flat", flatAmount: 0, percent: 0, cap: 0,
  promoDrop: 0, jackpotDrop: 0, noFlopDrop: 0, minPotForDrop: 0,
});

const ARCHETYPES = listArchetypes();
export const archetypeById = (id) => ARCHETYPES.find((a) => a.id === id) ?? null;

/** A six-handed table of assorted archetypes. */
export function createLineup(handIndex, rng) {
  const profiles = new Map();
  const players = [];
  for (let seat = 0; seat < SEAT_COUNT; seat += 1) {
    const archetype = ARCHETYPES[(handIndex * 7 + seat * 3) % ARCHETYPES.length];
    const id = `seat-${seat}`;
    const profile = createBotProfile({
      id, displayName: `${archetype.label} ${seat}`, archetype: archetype.id, rng, variance: 0.08,
    });
    profiles.set(id, profile);
    players.push({ id, seat, stack: suggestBotBuyIn({ profile, stake: STAKE, rng }) });
  }
  return { players, profiles };
}

export function newHand(handIndex, rng, players) {
  let game = createCashGame({
    seatCount: SEAT_COUNT, stake: STAKE, players,
    buttonSeat: handIndex % SEAT_COUNT, tipping: { mode: "off" }, rake: NO_RAKE,
  });
  return startNextCashHand(game, { deck: shuffleDeck(createDeck(), rng) });
}

export const livePlayers = (hand) => hand.players.filter((p) => p.status !== "folded");
export const playerOf = (hand, id) => hand.players.find((p) => p.id === id) ?? null;

/**
 * Play a game forward to completion with bots acting, and return the final
 * state. `onDecision` observes every decision without changing it.
 */
export function playOut(game, profiles, rng, onDecision = null) {
  let g = game;
  let guard = 0;
  while (getLegalActions(g) !== null) {
    if (guard += 1, guard > ACTION_CAP) break;
    const legal = getLegalActions(g);
    // Chopping is a two-way negotiation the generator has no use for; decline
    // it by playing the hand normally.
    if (legal.canChop) { g = act(g, { type: "fold" }); continue; }
    const context = getBotHandContext(g, legal.playerId);
    const profile = profiles.get(legal.playerId);
    const action = decideBotAction({ profile, legal, hand: context, rng });
    if (onDecision) onDecision({ playerId: legal.playerId, legal, context, action, phase: g.table.currentHand.phase });
    g = act(g, action);
  }
  return g;
}

/** A player's stack once the hand is over, wherever the hand ended up. */
export function finalStack(game, playerId) {
  const hand = game.table.currentHand ?? game.table.lastHand;
  const seat = game.table.seats?.find?.((s) => s?.playerId === playerId);
  const fromHand = playerOf(hand ?? { players: [] }, playerId);
  if (fromHand && hand?.phase === "complete") return fromHand.stack;
  if (seat && Number.isFinite(seat.stack)) return seat.stack;
  return fromHand?.stack ?? 0;
}

/**
 * Average net chips a player gains from this point forward if `action` is
 * forced now, measured over `trials` independent play-outs.
 *
 * Net is measured against the stack at the decision point, so it already
 * accounts for whatever the forced action costs.
 */
export function rollout({ game, profiles, playerId, action, trials, seed }) {
  const before = playerOf(game.table.currentHand, playerId)?.stack ?? 0;
  let total = 0;
  let completed = 0;
  for (let trial = 0; trial < trials; trial += 1) {
    let g;
    try {
      g = act(game, action);
    } catch {
      return null; // action was not legal here
    }
    const trialRng = createSeededRng(seed + trial * 7919);
    g = playOut(g, profiles, trialRng);
    total += finalStack(g, playerId) - before;
    completed += 1;
  }
  return completed ? total / completed : null;
}

/**
 * The legal actions worth measuring at a river spot, as {id, label, action}.
 *
 * Sizes that clamp onto each other are dropped rather than measured twice: two
 * "different" bets that are both the hero's last $58 are one action wearing two
 * labels, and scoring them separately turns pure rollout noise into an EV gap.
 */
export function candidateActions(legal, pot) {
  const out = [];
  const round = (n) => Math.max(1, Math.round(n));
  if (legal.canCheck) out.push({ id: "check", label: "Check", action: { type: "check" } });
  if (legal.canFold) out.push({ id: "fold", label: "Fold", action: { type: "fold" } });
  if (legal.canCall) out.push({ id: "call", label: `Call $${legal.callAmount}`, action: { type: "call" } });

  if (legal.canRaise) {
    const facing = legal.toCall > 0;
    const sizes = facing
      ? [{ id: "raise", mult: 2.5 }, { id: "raise-big", mult: 4 }]
      : [{ id: "bet-small", mult: 0.33 }, { id: "bet-big", mult: 0.75 }];
    const floor = legal.minRaiseTo ?? 1;
    const ceiling = legal.maxRaiseTo ?? Infinity;

    for (const size of sizes) {
      const target = facing ? round(legal.currentBet * size.mult) : round(pot * size.mult);
      const to = Math.min(Math.max(target, floor), ceiling);
      if (!Number.isFinite(to) || to <= 0) continue;
      // Two sizes within 15% of each other are the same decision.
      if (out.some((e) => e.action.to && Math.abs(e.action.to - to) / to < 0.15)) continue;
      const allIn = to >= ceiling;
      out.push({
        id: size.id,
        label: `${facing ? "Raise to" : "Bet"} $${to}${allIn ? " (all in)" : ""}`,
        action: { type: facing ? "raise" : "bet", to },
        allIn,
        potFraction: pot > 0 ? Number((to / pot).toFixed(2)) : null,
      });
    }
  }
  return out;
}

/**
 * A range the app can explain in one sentence: the holdings that actually
 * connected with this board, which is what calling a bet on it implies.
 *
 * Used when poker-sim's read model narrows so hard that the surviving range is
 * too small to quote honestly - it is confident, but "he has exactly three
 * hands" is not a sentence a coach can defend.
 */
/**
 * How the hero's hand actually fares against every holding in a range.
 *
 * This is the number the product is really about: "of the 313 hands he can
 * have, 48 beat you" is exact, checkable, and teaches the idea directly -
 * unlike a capped/uncapped verdict, which on a paired board is mostly a
 * statement about the board.
 *
 * The board must be complete; on the river there is nothing left to run out,
 * so a straight comparison of made hands is the whole answer.
 */
export function showdownSplit({ heroCards, board, holdings }) {
  const boardIdx = cardIndexes(board);
  const heroScore = scoreCards([...cardIndexes(heroCards), ...boardIdx]);
  let beats = 0, ties = 0, loses = 0;
  for (const holding of holdings) {
    const score = scoreCards([...cardIndexes(holding.cards), ...boardIdx]);
    if (score > heroScore) beats += 1;
    else if (score === heroScore) ties += 1;
    else loses += 1;
  }
  const total = beats + ties + loses;
  return {
    total,
    beats,
    ties,
    loses,
    beatsPct: total ? Number(((beats / total) * 100).toFixed(1)) : null,
  };
}

export function plausibleRange(board, knownCards) {
  return candidateCombos(knownCards)
    .filter((cards) => {
      const bucket = bucketOfHolding(cards, board);
      return bucket !== null && bucket !== "air";
    })
    .map((cards) => ({ cards, weight: 1 }));
}
