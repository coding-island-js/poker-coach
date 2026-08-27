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
// How many times to re-draw an opponent's hand when it clashes with one
// already dealt this trial.
const DEAL_ATTEMPTS = 12;

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
 * A copy of the game with `playerId` holding `cards`, and the deck corrected so
 * that no card is in two places at once.
 */
export function dealTo(game, playerId, cards) {
  const hand = game.table.currentHand;
  const player = playerOf(hand, playerId);
  if (!player) return game;
  const taking = new Set(cards);
  const had = player.holeCards ?? [];
  // Whatever they were holding goes back into the deck, unless they are still
  // holding it; whatever they are being dealt comes out of it.
  const deck = [
    ...(hand.deck ?? []).filter((card) => !taking.has(card)),
    ...had.filter((card) => !taking.has(card)),
  ];
  const players = hand.players.map((p) => (p.id === playerId ? { ...p, holeCards: [...cards] } : p));
  return { ...game, table: { ...game.table, currentHand: { ...hand, deck, players } } };
}

/**
 * The holdings that can actually be dealt to this player without duplicating a
 * card. A range is built from every card not on the board and not in the hero's
 * hand, which includes cards sitting in folded players' hands - those are gone,
 * and dealing one would put it in two hands at once.
 */
export function dealableHoldings(game, playerId, holdings) {
  const hand = game.table.currentHand;
  const available = new Set([
    ...(hand.deck ?? []),
    ...(playerOf(hand, playerId)?.holeCards ?? []),
  ]);
  return (holdings ?? []).filter((holding) => holding.cards.every((card) => available.has(card)));
}

/**
 * Average net chips a player gains from this point forward if `action` is
 * forced now, measured over `trials` independent play-outs.
 *
 * Net is measured against the stack at the decision point, so it already
 * accounts for whatever the forced action costs.
 *
 * `opponents` is [{playerId, holdings}]. Each one is dealt a FRESH hand from
 * `holdings` every trial. Without this the opponent's cards - dealt before the
 * decision point and never touched by the deck shuffle - stay identical across
 * all N trials, and the EV stops being a measurement against his range and
 * becomes a measurement against the one hand he happened to have. On the river,
 * where the runout has nothing left to vary, that made every number a coin
 * already flipped: hero folded a flush that beat 305 of the 355 hands in the
 * range, because this particular villain held one of the other 50.
 *
 * The holdings passed in are the SAME ones the coaching counts against, so
 * "71 of his 1035 hands beat you" and the EV beside it describe one opponent.
 */
export function rollout({ game, profiles, playerId, action, trials, seed, opponents = [], heroProfile = null }) {
  const before = playerOf(game.table.currentHand, playerId)?.stack ?? 0;
  // After the forced action, the hero's REMAINING decisions are played by a bot
  // too - and that bot was whatever archetype the hero's seat happened to draw.
  // A seat dealt "calling-station" then called down every later street, so the
  // measured EV of a flop bet included a stranger's mistakes on the learner's
  // behalf. Play the rest out with one competent policy instead, so the number
  // means "what this action is worth if you play on sensibly".
  const table = heroProfile ? new Map(profiles) : profiles;
  if (heroProfile) table.set(playerId, heroProfile);
  const draws = opponents
    .map((opponent) => ({
      playerId: opponent.playerId,
      holdings: dealableHoldings(game, opponent.playerId, opponent.holdings),
    }))
    .filter((draw) => draw.holdings.length > 0);

  let total = 0;
  let completed = 0;
  // How the opponent answered THIS action, counted across the trials. Without
  // it the coaching can only say that one option earned more than another,
  // which is a result, not a reason. "He folds 964 of the 1035 hands you beat
  // and calls with the 71 that beat you" is the reason.
  const answered = { fold: 0, call: 0, raise: 0, bet: 0, check: 0 };
  // Share of trials in which EVERY opponent folded, so the hero won it there and
  // then. Heads-up this is close to the fold share; three-handed it is the only
  // honest way to say "this takes it down", because the reply tally above only
  // records the next player to act, not the field.
  let uncontested = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    const trialRng = createSeededRng(seed + trial * 7919);
    let g = game;
    // Deal the opponents one at a time, refusing a holding that needs a card
    // another opponent has already been dealt this trial. Their ranges are both
    // built from the same pool, so left unchecked the second one can be handed a
    // card the first is holding - the engine then rejects the hero's action and
    // the whole spot scores as unmeasurable. Every three-handed spot died this
    // way, silently, while the run still reported a healthy total.
    const taken = new Set();
    for (const draw of draws) {
      let holding = null;
      for (let attempt = 0; attempt < DEAL_ATTEMPTS && !holding; attempt += 1) {
        const pick = draw.holdings[Math.floor(trialRng() * draw.holdings.length)];
        if (!pick.cards.some((card) => taken.has(card))) holding = pick;
      }
      // A clash is rare - two cards out of roughly forty-five - so a handful of
      // tries is plenty. If they all clash, leave this opponent as dealt rather
      // than force an illegal deal.
      if (!holding) continue;
      for (const card of holding.cards) taken.add(card);
      g = dealTo(g, draw.playerId, holding.cards);
    }
    try {
      // Shuffle the undealt remainder too. Without this the turn and river
      // are already fixed in the deck, every trial deals the same runout, and a
      // flop decision would be scored against one lucky card. This is what
      // makes anything before the river measurable at all.
      g = act(reshuffleUndealt(g, trialRng), action);
    } catch {
      return null; // action was not legal here
    }
    // Only the FIRST reply counts. Later streets are a different question from
    // "what did this bet do", and folding the river after calling the turn
    // would otherwise be recorded as folding to the turn bet.
    let replied = false;
    const folded = new Set();
    g = playOut(g, table, trialRng, ({ playerId: actor, legal, action: reply }) => {
      if (actor === playerId) return;
      if (reply?.type === "fold") folded.add(actor);
      if (replied) return;
      replied = true;
      // Shoving is its own action type in poker-sim, and leaving it uncounted
      // lost nearly half the replies on some spots - a hand where the opponent
      // jammed over the hero's bet 46% of the time read as "he folds 0% of the
      // time and calls 7%", which describes a spot that did not happen.
      let type = reply?.type;
      if (type === "all-in") type = (legal?.toCall ?? 0) > 0 ? "raise" : "bet";
      if (type in answered) answered[type] += 1;
    });
    if (draws.length > 0 && folded.size >= draws.length) uncontested += 1;
    total += finalStack(g, playerId) - before;
    completed += 1;
  }
  if (!completed) return null;
  return {
    ev: total / completed,
    trials: completed,
    // Shares, not counts, so the copy does not have to know the trial count.
    answered: Object.fromEntries(
      Object.entries(answered).map(([type, n]) => [type, n / completed]),
    ),
    uncontested: uncontested / completed,
  };
}

/** A copy of the game whose undealt cards are in a fresh order. */
export function reshuffleUndealt(game, rng) {
  const hand = game.table.currentHand;
  const deck = [...(hand.deck ?? [])];
  if (deck.length < 2) return game;
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { ...game, table: { ...game.table, currentHand: { ...hand, deck } } };
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
  // Every holding he could still be dealt, weighted evenly.
  //
  // This used to drop "air", on the theory that a hand which missed everything
  // would have folded. That made the fallback range strictly made-hands-only,
  // and therefore GUARANTEED that any hero holding air lost to 100% of it -
  // "717 of his 717 hands beat you" is not a read, it is a restatement of the
  // filter. Eight of a hundred shipped hands were that tautology.
  //
  // Uniform overstates how weak he is, which the app labels honestly as a
  // heuristic. Being a bit generous is recoverable; being circular is not.
  return candidateCombos(knownCards).map((cards) => ({ cards, weight: 1 }));
}

// ------------------------------------------------------- range breakdown
const RANK_INDEX = "23456789TJQKA";
const rankValue = (code) => RANK_INDEX.indexOf(code[0] === "1" ? "T" : code[0]);

/**
 * What class of hand a holding makes on this board, coarse enough to teach with.
 *
 * Ordered strongest first by the `order` field so a breakdown reads down the
 * range the way a player thinks about it.
 */
export function handCategory(cards, board) {
  const all = [...cards, ...board];
  const ranks = all.map(rankValue);
  const boardRanks = board.map(rankValue);
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] ?? 0) + 1;
  const suitCounts = {};
  for (const c of all) suitCounts[c[1]] = (suitCounts[c[1]] ?? 0) + 1;

  const groups = Object.values(counts).sort((a, b) => b - a);
  const flush = Object.values(suitCounts).some((n) => n >= 5);
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  let straight = false;
  for (let i = 0; i + 5 <= unique.length; i += 1) {
    if (unique[i + 4] - unique[i] === 4) straight = true;
  }
  // Wheel: A2345.
  if (unique.includes(12) && [0, 1, 2, 3].every((r) => unique.includes(r))) straight = true;

  if (groups[0] === 4) return { order: 0, label: "Four of a kind" };
  if (groups[0] === 3 && groups[1] >= 2) return { order: 1, label: "A full house" };
  if (flush) return { order: 2, label: "A flush" };
  if (straight) return { order: 3, label: "A straight" };
  if (groups[0] === 3) return { order: 4, label: "Three of a kind" };
  if (groups[0] === 2 && groups[1] === 2) return { order: 5, label: "Two pair" };
  if (groups[0] === 2) {
    const pairedRank = Number(Object.keys(counts).find((r) => counts[r] === 2));
    const topBoard = Math.max(...boardRanks);
    return pairedRank >= topBoard
      ? { order: 6, label: "Top pair or better" }
      : { order: 7, label: "A weaker pair" };
  }
  return { order: 8, label: "No pair" };
}

/**
 * The opponent's range, grouped into hand classes, with how many of each beat
 * the hero.
 *
 * This is the product's founding principle made literal: a learner who is told
 * "323 of 990 beat you" has a number, and a learner who can see that 18 of them
 * are straights and 145 are top pair has a range. The count alone was a label
 * wearing a number's clothes.
 */
export function rangeBreakdown({ heroCards, board, holdings }) {
  const boardIdx = cardIndexes(board);
  const heroScore = scoreCards([...cardIndexes(heroCards), ...boardIdx]);
  const rows = new Map();

  for (const holding of holdings) {
    const { order, label } = handCategory(holding.cards, board);
    const row = rows.get(label) ?? { label, order, combos: 0, beatsHero: 0, tiesHero: 0 };
    row.combos += 1;
    const score = scoreCards([...cardIndexes(holding.cards), ...boardIdx]);
    if (score > heroScore) row.beatsHero += 1;
    else if (score === heroScore) row.tiesHero += 1;
    rows.set(label, row);
  }
  return [...rows.values()].sort((a, b) => a.order - b.order);
}

// ------------------------------------------------------- the field
/**
 * How the hero fares against TWO opponents at once, counted exactly.
 *
 * Heads-up, "how many of his hands beat you" is a count over one range. Against
 * a field it has to mean "beats you AND everyone else still in", which is a
 * count over PAIRS of holdings - and the two of them cannot hold the same card,
 * so the pairs are not simply |A| x |B|.
 *
 * Enumerating every pair would be ~90,000 hand evaluations per spot. It is not
 * needed. For each opponent, split the range into the holdings the hero is not
 * behind (score <= hero) and the rest. Then, for any two sets A and B:
 *
 *   disjointPairs(A, B) = |A|*|B| - (pairs sharing at least one card)
 *
 * and a holding has only two cards, so the pairs sharing a card can be counted
 * from a per-card tally of B: for a = {c1,c2}, the b's that clash are those
 * containing c1 or c2, which is tally(c1) + tally(c2), minus one for b = a
 * itself if a is in B (that b was counted twice). Linear, and exact.
 *
 * Returned in the same shape as `showdownSplit` so the copy can treat one
 * opponent and two the same way: `total` is the number of ways the field can be
 * dealt, `beats` the number in which at least one of them has you beaten.
 */
export function showdownVsField({ heroCards, board, ranges }) {
  if (ranges.length === 1) return showdownSplit({ heroCards, board, holdings: ranges[0] });
  if (ranges.length !== 2) throw new Error(`showdownVsField supports one or two opponents, got ${ranges.length}`);

  const boardIdx = cardIndexes(board);
  const heroScore = scoreCards([...cardIndexes(heroCards), ...boardIdx]);
  const scoreOf = (holding) => scoreCards([...cardIndexes(holding.cards), ...boardIdx]);

  // "Safe" = this opponent does not have the hero beaten. Ties are safe: a tie
  // does not put the hero behind, and calling a chopped pot "beaten" would
  // teach the wrong thing.
  const split = (holdings) => {
    const safe = [];
    for (const holding of holdings) if (scoreOf(holding) <= heroScore) safe.push(holding);
    return safe;
  };
  const [rangeA, rangeB] = ranges;
  const safeA = split(rangeA);
  const safeB = split(rangeB);

  const disjointPairs = (setA, setB) => {
    const perCard = new Map();
    const exact = new Set();
    for (const holding of setB) {
      exact.add(holding.cards.join("|"));
      for (const card of holding.cards) perCard.set(card, (perCard.get(card) ?? 0) + 1);
    }
    let clashes = 0;
    for (const holding of setA) {
      const [c1, c2] = holding.cards;
      clashes += (perCard.get(c1) ?? 0) + (perCard.get(c2) ?? 0);
      // b === a was counted once under each of its two cards; it is one pair.
      if (exact.has(holding.cards.join("|"))) clashes -= 1;
    }
    return setA.length * setB.length - clashes;
  };

  const total = disjointPairs(rangeA, rangeB);
  const notBeaten = disjointPairs(safeA, safeB);
  const beats = total - notBeaten;
  return {
    total,
    beats,
    // A tie against a FIELD is not a clean idea - you can chop with one and lose
    // to the other - so it is not reported rather than reported wrongly.
    ties: null,
    loses: notBeaten,
    beatsPct: total ? Number(((beats / total) * 100).toFixed(1)) : null,
    opponents: 2,
  };
}
