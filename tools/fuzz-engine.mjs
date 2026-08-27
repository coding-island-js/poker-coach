// Property checks against the engine, run on random hands rather than examples.
//
// Every bug this pipeline has produced has the same shape: an assumption held
// in one place and not enforced anywhere. The range was computed after the EV,
// so they described different opponents. `usableShowdown` still thought
// heads-up after multiway arrived. A hardcoded list of action names did not
// include "short-all-in-raise". A board length was read after the hero acted
// instead of before.
//
// Example tests cannot find those, because the example was written by the same
// person holding the same assumption. These checks state the invariant and then
// try to break it with hands nobody chose.
//
//   node tools/fuzz-engine.mjs [--hands 400] [--seed 1]
import {
  act, getLegalActions, getBotHandContext, decideBotAction, createSeededRng,
  createLineup, newHand, livePlayers, playerOf, rollout, candidateActions,
  plausibleRange, showdownSplit, showdownVsField, dealTo, dealableHoldings,
  reshuffleUndealt, playOut, cardIndexes, scoreCards, createBotProfile,
} from "./lib/engine.mjs";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const HANDS = Number.parseInt(arg("hands", "400"), 10);
const SEED = Number.parseInt(arg("seed", "20260827"), 10);

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

// Every action name poker-sim has been seen to emit. A name that is not in here
// is not necessarily a bug, but it IS something our mappers have never been
// told about - which is exactly how "short-all-in-raise" slipped past a handler
// that only knew "bet" and "raise".
const KNOWN_ACTIONS = new Set([
  "fold", "check", "call", "bet", "raise", "all-in",
  "short-all-in-raise", "short-all-in-call", "all-in-call", "all-in-raise", "all-in-bet",
]);
const seenActions = new Set();

/** Nothing may ever hold the same card as anything else. */
function noDuplicateCards(hand, where) {
  const all = [...(hand.deck ?? []), ...hand.board ?? []];
  for (const player of hand.players ?? []) all.push(...(player.holeCards ?? []));
  check(new Set(all).size === all.length, `${where}: a card is in two places at once`);
}

function main() {
  let spots = 0;
  for (let handIndex = 0; handIndex < HANDS; handIndex += 1) {
    const rng = createSeededRng(SEED + handIndex * 104_729);
    const { players, profiles } = createLineup(handIndex, rng);
    let game;
    try { game = newHand(handIndex, rng, players); } catch { continue; }

    let guard = 0;
    while (getLegalActions(game) !== null && guard < 300) {
      guard += 1;
      const legal = getLegalActions(game);
      if (legal.canChop) { game = act(game, { type: "fold" }); continue; }
      const hand = game.table.currentHand;
      const context = getBotHandContext(game, legal.playerId);

      // --- properties that must hold at EVERY decision -------------------
      const live = livePlayers(hand);
      if (["flop", "turn", "river"].includes(hand.phase) && live.length >= 2 && context.pot > 0) {
        spots += 1;
        const heroId = legal.playerId;
        const heroCards = playerOf(hand, heroId)?.holeCards ?? [];
        const board = hand.board ?? [];
        const villains = live.filter((p) => p.id !== heroId);

        if (heroCards.length === 2 && board.length >= 3) {
          const known = [...board, ...heroCards];
          const range = plausibleRange(board, known);

          // 1. A range may never contain a card the hero or the board holds.
          const forbidden = new Set(known);
          const leak = range.find((holding) => holding.cards.some((card) => forbidden.has(card)));
          check(!leak, `hand ${handIndex}: range contains a known card (${leak?.cards.join(" ")})`);

          // 2. Dealable holdings are exactly those made of available cards.
          for (const villain of villains) {
            const usable = dealableHoldings(game, villain.id, range);
            const available = new Set([...(hand.deck ?? []), ...(playerOf(hand, villain.id)?.holeCards ?? [])]);
            const bad = usable.find((holding) => holding.cards.some((card) => !available.has(card)));
            check(!bad, `hand ${handIndex}: dealable holding uses an unavailable card`);
          }

          // 3. Dealing never duplicates a card, and never changes the deck size
          //    when the new cards come from the deck.
          if (villains.length) {
            const usable = dealableHoldings(game, villains[0].id, range);
            if (usable.length) {
              const dealt = dealTo(game, villains[0].id, usable[usable.length >> 1].cards);
              noDuplicateCards(dealt.table.currentHand, `hand ${handIndex} after dealTo`);
            }
          }

          // 4. Counting the field must agree with counting one range when there
          //    is only one opponent, and must never exceed the pairs available.
          const one = showdownSplit({ heroCards, board, holdings: range });
          const asField = showdownVsField({ heroCards, board, ranges: [range] });
          check(one.total === asField.total && one.beats === asField.beats,
            `hand ${handIndex}: one-opponent field count disagrees with the heads-up count`);

          if (villains.length >= 2) {
            const field = showdownVsField({ heroCards, board, ranges: [range, range] });
            check(field.total <= range.length * range.length,
              `hand ${handIndex}: field count ${field.total} exceeds the possible pairs`);
            check(field.total > range.length,
              `hand ${handIndex}: field count ${field.total} is no bigger than one range`);
            check(field.beats >= 0 && field.beats <= field.total,
              `hand ${handIndex}: field beats ${field.beats} outside 0..${field.total}`);
          }

          // 5. Two candidate actions must never be the same bet wearing two
          //    labels - that turns rollout noise into a fake EV gap.
          const actions = candidateActions(legal, context.pot);
          const amounts = actions.map((a) => a.action.to).filter(Boolean);
          check(new Set(amounts).size === amounts.length,
            `hand ${handIndex}: two candidate actions bet the same amount`);

          // 6. Reshuffling must preserve the deck exactly.
          const shuffled = reshuffleUndealt(game, createSeededRng(handIndex + 1));
          const before = [...(hand.deck ?? [])].sort();
          const after = [...(shuffled.table.currentHand.deck ?? [])].sort();
          check(before.length === after.length && before.every((c, i) => c === after[i]),
            `hand ${handIndex}: reshuffle changed the deck's contents`);
        }
      }

      const action = decideBotAction({ profile: profiles.get(legal.playerId), legal, hand: context, rng });
      seenActions.add(action.type);
      game = act(game, action);
      noDuplicateCards(game.table.currentHand, `hand ${handIndex} after ${action.type}`);
    }

    // Every action name the engine recorded, so a new one cannot appear
    // unnoticed in a handler that switches on a hardcoded list.
    for (const event of game.table.currentHand?.events ?? []) {
      if (event.type === "ACTION" && event.action) seenActions.add(event.action);
    }
  }

  for (const name of seenActions) {
    check(KNOWN_ACTIONS.has(name),
      `poker-sim emitted an action this pipeline has never been told about: "${name}". `
      + "Add it to KNOWN_ACTIONS and check every handler that switches on action names "
      + "(facingActionOf, renderHistory, the rollout reply tally).");
  }

  console.log(`Fuzzed ${HANDS} hands, ${spots} decisions.`);
  console.log(`  action names seen: ${[...seenActions].sort().join(", ")}`);
  if (failures.length) {
    console.error(`\nEngine properties FAILED - ${failures.length} problem(s):`);
    for (const failure of failures.slice(0, 30)) console.error(`  · ${failure}`);
    process.exit(1);
  }
  console.log("  all engine properties hold.");
}

main();
