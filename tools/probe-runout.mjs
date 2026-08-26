// Can a rollout vary the RUNOUT, not just the opponent's decisions?
//
// At a flop decision the turn and river already sit in hand.deck in a fixed
// order, so replaying from a snapshot deals the same board every time. That is
// why the generator only produces river spots: measuring EV on the flop against
// one predetermined runout would be measuring one lucky card.
//
// If the undealt remainder can be reshuffled per trial, flop and turn spots
// become measurable and the content stops being all-river.
import { createSeededRng, act, getLegalActions, getBotHandContext, decideBotAction,
         createLineup, newHand, livePlayers, playerOf, playOut } from "./lib/engine.mjs";

function findStreetSpot(handIndex, rng, street) {
  const { players, profiles } = createLineup(handIndex, rng);
  let game = newHand(handIndex, rng, players);
  let guard = 0;
  while (getLegalActions(game) !== null) {
    if (guard += 1, guard > 300) return null;
    const legal = getLegalActions(game);
    if (legal.canChop) { game = act(game, { type: "fold" }); continue; }
    const hand = game.table.currentHand;
    if (hand.phase === street && livePlayers(hand).length === 2) {
      return { game, legal, profiles, heroId: legal.playerId };
    }
    const action = decideBotAction({ profile: profiles.get(legal.playerId), legal, hand: getBotHandContext(game, legal.playerId), rng });
    game = act(game, action);
  }
  return null;
}

/** A copy of the game whose undealt remainder is shuffled. */
function reshuffleUndealt(game, rng) {
  const hand = game.table.currentHand;
  const deck = [...(hand.deck ?? [])];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { ...game, table: { ...game.table, currentHand: { ...hand, deck } } };
}

let spot = null;
for (let h = 0; h < 300 && !spot; h += 1) spot = findStreetSpot(h, createSeededRng(4000 + h), "flop");
if (!spot) { console.log("no heads-up flop spot found"); process.exit(1); }

const { game, profiles, heroId } = spot;
const hand = game.table.currentHand;
console.log("flop spot | board:", JSON.stringify(hand.board), "| deck left:", hand.deck.length);
console.log("hero:", heroId, JSON.stringify(playerOf(hand, heroId)?.holeCards));

const runouts = new Set();
const nets = [];
for (let trial = 0; trial < 12; trial += 1) {
  const rng = createSeededRng(90_000 + trial * 613);
  const g0 = reshuffleUndealt(game, rng);
  const before = playerOf(g0.table.currentHand, heroId)?.stack ?? 0;
  const done = playOut(g0, profiles, rng);
  const final = done.table.currentHand ?? done.table.lastHand;
  runouts.add((final.board ?? []).join(""));
  nets.push(Math.round(((playerOf(final, heroId)?.stack ?? before) - before)));
}

console.log("\ndistinct runouts over 12 trials:", runouts.size, "(1 would mean the deck is not being used)");
console.log("sample boards:", [...runouts].slice(0, 4).join("  |  "));
console.log("hero net per trial:", nets.join(", "));

const original = game.table.currentHand;
console.log("\nsnapshot untouched:", original.board.join("") === hand.board.join("") && original.deck.length === hand.deck.length);
