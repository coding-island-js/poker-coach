// Turns scored candidates into the lesson content the app ships.
//
// Selection is deliberately boring: rank by how big the mistake is, spread the
// picks across the six leaks and across board textures, and stop. The writing
// is templated over computed numbers, so every sentence a learner reads is
// backed by something this pipeline actually measured.
//
//   node tools/curate.mjs --in work/candidates.json --out public/hands.json --count 100
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { showdownSplit, plausibleRange } from "./lib/engine.mjs";
import { dirname, basename } from "node:path";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const IN = arg("in", "work/candidates.json");
const OUT = arg("out", "public/hands.json");
const COUNT = Number.parseInt(arg("count", "100"), 10);

const LEAKS = ["removes-strength", "weaker-callers", "bluffs-showdown", "plan-action", "call-price", "read-as-fact"];

export const LEAK_LABELS = {
  "removes-strength": "Reading a check as weakness",
  "weaker-callers": "Leaving value behind",
  "bluffs-showdown": "Betting a hand that should check",
  "plan-action": "A bet with no job to do",
  "call-price": "Paying the wrong price",
  "read-as-fact": "Treating a read as fact",
};

// Plain descriptions. No archetype jargon reaches the learner.
const OPPONENT_NOTES = {
  "nit-rock": "very tight — bets only with strong hands",
  "rules-nit": "very tight, plays by rigid rules",
  "omc": "old-school tight, almost never bluffs",
  "tag-reg": "solid and selective",
  "grinder-pro": "experienced, bets mainly for value",
  "lag-reg": "loose and aggressive",
  "maniac": "very aggressive, bluffs often",
  "preflop-war": "fights hard before the flop",
  "calling-station": "calls far too much, rarely folds",
  "loose-passive-rec": "plays lots of hands, rarely raises",
  "passive-rec": "recreational and passive",
  "ego-rec": "hates being pushed around",
  "gambler": "chases draws, likes big pots",
  "drunk-splashy": "loose and unpredictable tonight",
  "scared-money": "folds too often when the pot gets big",
  "short-buy-gambler": "short stack, jams at awkward moments",
};
const opponentNote = (id) => OPPONENT_NOTES[id] ?? "unknown — no reliable read";

// ------------------------------------------------------------------ writing
const pct = (n) => `${Math.round(n)}%`;

/** Where the hero's hand actually sits against what the opponent can hold. */
export function standing(beatsPct) {
  if (beatsPct === null) return "unclear";
  if (beatsPct < 20) return "ahead";
  if (beatsPct < 45) return "mixed";
  return "behind";
}

const READ_OPTIONS = [
  { id: "ahead", label: "You beat almost everything he can have" },
  { id: "mixed", label: "It's roughly a coin flip" },
  { id: "behind", label: "You lose to most of what he can have" },
];

const READ_WHY = {
  ahead: "Counting his possible hands, very few of them beat yours.",
  mixed: "His range splits close to evenly against your hand.",
  behind: "Most of the hands he can hold here are better than yours.",
};

/** What a given action is actually trying to do, in plain words. */
export function purposeOf(optionId, standingNow) {
  if (optionId === "check") {
    if (standingNow === "behind") return "keep the pot small and still win sometimes";
    if (standingNow === "mixed") return "keep the pot small with a hand that isn't clearly ahead";
    return "keep his weaker hands in, and not get raised";
  }
  if (optionId === "fold") return "stop paying when you're beaten";
  if (optionId === "call") return "pay to see it, because you beat his bluffs";
  // Bets and raises. "mixed" needs its own line: a hand that is neither clearly
  // ahead nor clearly behind is not bluffing, and calling it one reads as
  // nonsense next to a big overpair.
  const raising = optionId.startsWith("raise");
  if (standingNow === "ahead") return raising ? "charge him now that you're ahead" : "get called by something worse";
  if (standingNow === "mixed") return "charge the worse hands, and fold out the ones still live";
  return "make a better hand fold";
}

/**
 * The one portable sentence for this hand.
 *
 * Derived from the SHAPE of the spot - where the hand stands and what the best
 * line actually is - not from the leak tag. Deriving it from the tag once
 * produced a hand that said "name a worse hand that would have called" on a
 * pure bluff, which teaches the exact opposite of what the numbers showed.
 */
function takeawayFor({ facing, bestIsBet, standingNow, beats, total, losesPct }) {
  // Each sentence carries this hand's own count, so a learner doing a hundred
  // of these gets a hundred concrete lines rather than six repeated maxims.
  const count = `${beats} of his ${total}`;
  if (facing) {
    return standingNow === "behind"
      ? `${count} hands beat you. Decide on that price before you call, not after.`
      : `You beat ${losesPct}% of what he can hold. Price the call on that, not on how strong the bet looked.`;
  }
  if (bestIsBet) {
    return standingNow === "ahead"
      ? `Only ${count} hands beat you — so name the worse ones that will actually call before you check.`
      : `${count} hands beat you, so a bet has to fold better hands. Name them before you fire.`;
  }
  return standingNow === "ahead"
    ? `You're ahead of ${losesPct}% of his range, but a bet still needs a worse caller. Without one, checking keeps what you have.`
    : `${count} hands beat you — but you still beat his misses. Checking wins those; bluffing into him does not.`;
}

const RANK_ORDER = "23456789TJQKA";
const rankOf = (code) => RANK_ORDER.indexOf(code[0] === "1" ? "T" : code[0]);

/**
 * What the hero actually holds, in the words a player would use.
 *
 * Titles were being built from standing + facing alone, which is nine
 * combinations for a hundred hands - one of them used thirty-one times. The
 * hand itself is the thing that makes a spot memorable.
 */
function describeHero(heroCodes, boardCodes) {
  const cards = [...heroCodes, ...boardCodes];
  const ranks = cards.map(rankOf);
  const suits = cards.map((c) => c[1]);
  const heroRanks = heroCodes.map(rankOf);
  const boardRanks = boardCodes.map(rankOf);

  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] ?? 0) + 1;
  const suitCounts = {};
  for (const s of suits) suitCounts[s] = (suitCounts[s] ?? 0) + 1;
  const flushSuit = Object.keys(suitCounts).find((s) => suitCounts[s] >= 5);

  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  let straight = false;
  for (let i = 0; i + 4 < unique.length + 1; i += 1) {
    const window = unique.slice(i, i + 5);
    if (window.length === 5 && window[4] - window[0] === 4) straight = true;
  }
  const groups = Object.values(counts).sort((a, b) => b - a);

  if (flushSuit && heroCodes.some((c) => c[1] === flushSuit)) return "a flush";
  if (groups[0] === 4) return "quads";
  if (groups[0] === 3 && groups[1] >= 2) return "a full house";
  if (straight) return "a straight";
  if (groups[0] === 3) {
    return heroRanks[0] === heroRanks[1] ? "a set" : "trips";
  }
  if (groups[0] === 2 && groups[1] === 2) return "two pair";
  if (groups[0] === 2) {
    const pairedRank = Number(Object.keys(counts).find((r) => counts[r] === 2));
    const topBoard = Math.max(...boardRanks);
    if (heroRanks[0] === heroRanks[1]) {
      return heroRanks[0] > topBoard ? "an overpair" : "a small pocket pair";
    }
    if (pairedRank === topBoard) return "top pair";
    if (pairedRank === Math.min(...boardRanks)) return "bottom pair";
    return "middle pair";
  }
  const high = Math.max(...heroRanks);
  if (high === 12) return "ace high";
  if (high === 11) return "king high";
  return "no pair";
}

function titleFor({ facing, bestIsBet, standingNow }) {
  if (facing) {
    if (standingNow === "behind") return "A bet you have to price";
    if (standingNow === "ahead") return "He bets into a hand you beat";
    return "He bets — and it's close";
  }
  if (standingNow === "ahead") return bestIsBet ? "Checked to you, and you're ahead" : "Ahead, but is a bet worth it?";
  if (standingNow === "behind") return bestIsBet ? "Behind — so what can a bet do?" : "Behind, but not beaten yet";
  return bestIsBet ? "A coin flip, and a reason to bet" : "A coin flip — and no reason to bet";
}

/**
 * A title naming what the hero holds and what just happened. Falls back to the
 * standing-only phrasing if the hand cannot be described.
 */
function handTitle(candidate, shape) {
  const hero = candidate.heroCodes ?? candidate.hero.map(toCode);
  const board = candidate.boardCodes ?? candidate.board.map(toCode);
  let held;
  try { held = describeHero(hero, board); } catch { return titleFor(shape); }

  const capital = held.charAt(0).toUpperCase() + held.slice(1);
  if (shape.facing) {
    return standingIsGood(shape.standingNow)
      ? `${capital}, and he bets into you`
      : `${capital} facing a bet`;
  }
  const checkedTwice = (candidate.villainChecks ?? 0) >= 2;
  if (checkedTwice) return `${capital}, and he keeps checking`;
  const actsFirst = candidate.heroPosition.includes("acts first");
  return actsFirst ? `${capital}, first to act` : `${capital}, checked to you`;
}

const standingIsGood = (standingNow) => standingNow === "ahead";

/** Board texture, used to keep the final hundred from all looking alike. */
export function texture(boardCodes) {
  const ranks = boardCodes.map((c) => c[0]);
  const suits = boardCodes.map((c) => c[1]);
  const paired = new Set(ranks).size < ranks.length;
  const counts = {};
  suits.forEach((s) => { counts[s] = (counts[s] ?? 0) + 1; });
  const flushy = Math.max(...Object.values(counts)) >= 3;
  return `${paired ? "paired" : "unpaired"}-${flushy ? "flushy" : "rainbow"}`;
}

// --------------------------------------------------------------- selection
/**
 * Pick `count` candidates that are instructive AND varied.
 *
 * Round-robins across the six leaks so no single leak swamps the set, and
 * refuses near-duplicates (same leak, same texture, same shape of mistake)
 * until every leak has been given a fair chance.
 */
export function select(candidates, count) {
  const pools = new Map(LEAKS.map((leak) => [leak, []]));
  for (const candidate of candidates) {
    if (!pools.has(candidate.leak)) pools.set(candidate.leak, []);
    pools.get(candidate.leak).push(candidate);
  }
  for (const pool of pools.values()) pool.sort((a, b) => b.evGapPot - a.evGapPot);

  const chosen = [];
  const seen = new Set();
  let round = 0;
  while (chosen.length < count && round < 400) {
    let addedThisRound = 0;
    for (const leak of pools.keys()) {
      if (chosen.length >= count) break;
      const pool = pools.get(leak);
      while (pool.length) {
        const next = pool.shift();
        const key = `${next.leak}|${texture(next.boardCodes)}|${next.best.id}|${next.tempting.id}`;
        // Allow a repeat only once the obvious variety is exhausted.
        if (seen.has(key) && round < 6) continue;
        seen.add(key);
        chosen.push(next);
        addedThisRound += 1;
        break;
      }
    }
    if (addedThisRound === 0) break;
    round += 1;
  }
  return chosen;
}

/**
 * What is actually true at the moment of the decision.
 *
 * The generator derived this from `toCall === 0` alone, which is true both when
 * the opponent checked TO you and when you are simply first to act - and it
 * wrote "Opponent checks" for both. That put a piece of evidence into 76 of 100
 * hands that had not happened, on the very screen that asks the learner to read
 * the opponent's range from the evidence.
 */
function decisionLine(candidate) {
  if (candidate.facingBet) return candidate.decisionNow;
  const inPosition = !candidate.heroPosition.includes("acts first");
  return inPosition
    ? "Opponent checks. You act now."
    : "You are first to act on the river.";
}

/**
 * The timeline, always ending on the river so the story is complete. A river row
 * is added when the street has no actions yet, because "the river came and it is
 * on you" is itself the situation.
 */
function fullHistory(candidate) {
  const history = candidate.history.map((street) => ({ ...street }));
  const riverCard = candidate.board[4];
  const riverRow = history.find((street) => street.street.startsWith("River"));
  if (!riverRow) {
    history.push({ street: `River · ${riverCard}`, actions: [decisionLine(candidate)] });
  } else if (!candidate.facingBet && !riverRow.actions.length) {
    riverRow.actions = [decisionLine(candidate)];
  }
  return history;
}

// ------------------------------------------------------------------- build
const SUITS = { "♣": "c", "♦": "d", "♥": "h", "♠": "s" };
const toCode = (pretty) => {
  const suit = SUITS[pretty.slice(-1)];
  const rank = pretty.slice(0, -1) === "10" ? "T" : pretty.slice(0, -1);
  return `${rank}${suit}`;
};

/**
 * A range that beats the hero never, or always, teaches nothing - the read
 * question answers itself and the count is not a read at all. When the model
 * collapses that far, recount against every holding he could be dealt.
 */
function usableShowdown(candidate) {
  const shipped = candidate.showdown;
  const degenerate = shipped.beats === 0 || shipped.beats === shipped.total;
  // Heuristic counts are recomputed unconditionally, because the definition of
  // the fallback range changed after the candidates were generated and stale
  // counts would silently disagree with the cards on screen.
  const stale = candidate.rangeSource !== "modelled";
  if (!degenerate && !stale) return { split: shipped, source: candidate.rangeSource };

  const hero = candidate.heroCodes ?? candidate.hero.map(toCode);
  const board = candidate.boardCodes ?? candidate.board.map(toCode);
  const split = showdownSplit({ heroCards: hero, board, holdings: plausibleRange(board, [...board, ...hero]) });
  return { split, source: "heuristic" };
}

function toLesson(candidate, index) {
  const { split: showdown, source: rangeSource } = usableShowdown(candidate);
  const beatsPct = showdown?.beatsPct ?? null;
  const standingNow = standing(beatsPct);
  const opts = candidate.options.slice().sort((a, b) => b.ev - a.ev);
  const bestEv = opts[0].ev;
  // Anything within 5% of the pot of the best play is also defensible; poker
  // rarely has one right answer and marking near-ties wrong teaches nothing.
  const tolerance = Math.max(1, candidate.potRaw * 0.05);
  const correctIds = opts.filter((o) => bestEv - o.ev <= tolerance).map((o) => o.id);

  const shape = {
    facing: candidate.facingBet,
    bestIsBet: opts[0].id.startsWith("bet") || opts[0].id.startsWith("raise"),
    standingNow,
    beats: showdown.beats,
    total: showdown.total,
    losesPct: Math.round(100 - (beatsPct ?? 0)),
  };

  const actionOptions = opts.map((o) => ({
    id: o.id,
    // Money formatting is a display concern, so it is applied here rather than
    // baked into the candidate at generation time.
    label: o.label.replace(/(\d+)/, "$$$1"),
    purpose: purposeOf(o.id, standingNow),
    ev: o.ev,
  }));

  const actionWhy = {};
  for (const option of opts) {
    const delta = bestEv - option.ev;
    actionWhy[option.id] = correctIds.includes(option.id)
      ? `Holds up: over ${candidate.rollouts} simulated play-outs this earned about $${option.ev.toFixed(0)}.`
      : `Costs about $${delta.toFixed(0)} against the best line, measured over ${candidate.rollouts} play-outs.`;
  }

  const readWhy = {};
  for (const option of READ_OPTIONS) {
    readWhy[option.id] = option.id === standingNow
      ? READ_WHY[option.id]
      : `Not quite. ${showdown.beats} of his ${showdown.total} possible hands beat you — ${pct(beatsPct)}.`;
  }

  // The generator's "is the hero weak" cut is at 50% while `standing()` calls
  // 45% behind, so a hand can arrive tagged as a value leak while the app tells
  // the learner they are behind. Trust the standing the learner is shown.
  const leak = candidate.leak === "weaker-callers" && standingNow === "behind"
    ? "plan-action"
    : candidate.leak;

  return {
    id: `h${String(index + 1).padStart(3, "0")}`,
    sourceId: candidate.id,
    leak,
    leakLabel: LEAK_LABELS[leak] ?? leak,
    title: handTitle(candidate, shape),
    street: candidate.street,
    pot: candidate.pot,
    effective: candidate.effective,
    heroPosition: candidate.heroPosition,
    opponentNote: opponentNote(candidate.opponentArchetype),
    hero: candidate.hero,
    board: candidate.board,
    decisionNow: decisionLine(candidate),
    history: fullHistory(candidate),

    read: {
      prompt: "Against what he can have here, where does your hand stand?",
      options: READ_OPTIONS,
      correctId: standingNow,
      why: readWhy,
    },
    action: {
      prompt: "What do you do, and what is it for?",
      options: actionOptions,
      correctIds,
      why: actionWhy,
    },

    numbers: {
      total: showdown.total,
      beats: showdown.beats,
      ties: showdown.ties,
      beatsPct,
      rollouts: candidate.rollouts,
      evGap: candidate.evGap,
    },
    // The three-tier honesty labels. Counting combinations is exact; how often
    // this player type folds is a model; the sentence at the end is written.
    evidence: {
      counting: "exact",
      opponent: rangeSource === "modelled" ? "modelled" : "heuristic",
      coaching: "authored",
    },
    takeaway: takeawayFor(shape),
  };
}

async function main() {
  const raw = JSON.parse(await readFile(IN, "utf8"));
  // Over-select, then drop the hands whose read question answers itself - a
  // hero holding the nuts, or drawing dead, has no range to read - and trim
  // back to the target. h046 shipped as the nut flush against 990 combos, where
  // "you beat 100% of what he can hold" is true and teaches nothing.
  const chosen = select(raw.candidates, Math.round(COUNT * 1.4));
  const lessons = chosen
    .map(toLesson)
    .filter((lesson) => lesson.numbers.beats > 0 && lesson.numbers.beats < lesson.numbers.total)
    .slice(0, COUNT)
    // Ids are assigned after filtering so the shipped set stays h001..hNNN.
    .map((lesson, index) => ({ ...lesson, id: `h${String(index + 1).padStart(3, "0")}` }));

  const spread = {};
  for (const lesson of lessons) spread[lesson.leak] = (spread[lesson.leak] ?? 0) + 1;

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({
    version: 1,
    generated: { fromCandidates: raw.candidates.length, dealt: raw.dealt, rollouts: raw.generatedFrom?.rollouts },
    leakLabels: LEAK_LABELS,
    hands: lessons,
  }, null, 2));

  console.log(`selected ${lessons.length} of ${raw.candidates.length} candidates`);
  console.log("leak spread:", JSON.stringify(spread));
  console.log(`wrote ${OUT}`);
}

// Only run when invoked directly, so the helpers above stay importable by tests.
if (process.argv[1] && basename(process.argv[1]) === "curate.mjs") {
  main();
}
