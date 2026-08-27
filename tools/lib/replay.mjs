// Rebuilds the exact game state a candidate was scored at.
//
// Generation is deterministic - `createSeededRng(seed + handIndex * 104729)`
// drives the lineup, the shuffle and every bot decision - so a candidate does
// not need its game state stored. It needs three numbers: the seed of the pool
// it came from, its hand index, and which street and how many players it was
// looking for.
//
// This is load-bearing. If the replay drifts by a single rng call it produces a
// DIFFERENT hand, silently, and everything built on top would be coaching about
// a hand that never happened. `tests/coach.test.mjs` asserts that the replayed
// cards match the shipped ones for every hand in the catalogue.
import {
  act, getLegalActions, getBotHandContext, decideBotAction, createSeededRng,
  createLineup, newHand, livePlayers,
} from "./engine.mjs";

const HAND_STRIDE = 104_729;
const ACTION_CAP = 300;

/**
 * The game paused at the decision the candidate describes, or null if that
 * decision cannot be reached (which means the replay disagrees with the
 * generator and the caller should treat the candidate as unusable).
 */
export function replaySpot({ seed, handIndex, street, players }) {
  const rng = createSeededRng(seed + handIndex * HAND_STRIDE);
  const wantStreet = String(street).toLowerCase();
  const wantPlayers = players ?? 2;

  const { players: seats, profiles } = createLineup(handIndex, rng);
  let game = newHand(handIndex, rng, seats);
  const decisionsByPlayer = new Map();

  let guard = 0;
  while (getLegalActions(game) !== null) {
    if (guard += 1, guard > ACTION_CAP) return null;
    const legal = getLegalActions(game);
    if (legal.canChop) { game = act(game, { type: "fold" }); continue; }

    const hand = game.table.currentHand;
    const context = getBotHandContext(game, legal.playerId);

    if (hand.phase === wantStreet && livePlayers(hand).length === wantPlayers) {
      const heroId = legal.playerId;
      const villains = livePlayers(hand).filter((p) => p.id !== heroId);
      if (villains.length === wantPlayers - 1 && context.pot > 0) {
        return {
          game, legal, profiles, heroId,
          villainIds: villains.map((p) => p.id),
          heroContext: context,
          street: hand.phase,
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

/**
 * Whether a replayed spot really is the hand the candidate describes. Compares
 * the things a learner sees, because those are what would be wrong.
 */
export function matchesCandidate(spot, candidate) {
  if (!spot) return false;
  const hand = spot.game.table.currentHand;
  const hero = hand.players.find((p) => p.id === spot.heroId)?.holeCards ?? [];
  const board = hand.board ?? [];
  const sameCards = (a, b) => a.length === b.length && a.every((card, i) => card === b[i]);
  return sameCards(hero, candidate.heroCodes ?? [])
    && sameCards(board, candidate.boardCodes ?? [])
    && Math.round(spot.heroContext.pot) === Math.round(candidate.potRaw ?? -1);
}
