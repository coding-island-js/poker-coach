// Turns scored candidates into the lesson content the app ships.
//
// Selection is deliberately boring: rank by how big the mistake is, spread the
// picks across the six leaks and across board textures, and stop. The writing
// is templated over computed numbers, so every sentence a learner reads is
// backed by something this pipeline actually measured.
//
//   node tools/curate.mjs --in work/candidates.json --out public/hands.json --count 100
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { showdownSplit, showdownVsField, plausibleRange, rangeBreakdown } from "./lib/engine.mjs";
import { dirname, basename } from "node:path";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const IN = arg("in", "work/candidates.json");
const OUT = arg("out", "public/hands.json");
const COUNT = Number.parseInt(arg("count", "100"), 10);

// The taxonomy the CONTENT actually supports.
//
// The original six came from Codex's hand-authored hands and did not survive
// contact with generated river spots: `removes-strength` never fired at all and
// `bluffs-showdown` reached three hands in a hundred, which makes a profile
// screen that says "1 attempt" and teaches nothing. These six were read off the
// pool's real shapes, and every one of them carries real mass (smallest is 53
// of 838). Each is a mistake a player would recognise being talked out of.
const LEAKS = ["missed-value", "missed-bluff", "bet-no-caller", "bet-away-showdown", "wrong-size", "wrong-price"];

export const LEAK_LABELS = {
  "missed-value": "Leaving value behind",
  "missed-bluff": "A bluff you didn't make",
  "bet-no-caller": "Betting with nothing worse to call",
  "bet-away-showdown": "Betting away a hand that was winning",
  "wrong-size": "Right idea, wrong size",
  "wrong-price": "Paying the wrong price",
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

// On the flop and turn the count is about who is ahead RIGHT NOW - there are
// cards to come, and saying "you win" would be a different claim than the one
// the arithmetic supports. The river has no cards left, so it can speak plainly.
const READ_OPTIONS = (street, players = 2) => {
  const now = street === "River" ? "" : " right now";
  const who = players >= 3 ? "they" : "he";
  return [
    { id: "ahead", label: `You beat almost everything ${who} can have${now}` },
    { id: "mixed", label: "It's roughly a coin flip" },
    { id: "behind", label: `You lose to most of what ${who} can have${now}` },
  ];
};

const READ_PROMPT = (street, players = 2) => {
  const who = players >= 3 ? "both of them" : "he";
  const against = players >= 3 ? `Against ${who}` : "Against what he can have";
  return street === "River"
    ? `${against}, where does your hand stand?`
    : `${against}, where does your hand stand right now?`;
};

const READ_WHY = (street) => {
  const tail = street === "River" ? "" : " More cards are still to come.";
  return {
    ahead: `Counting his possible hands, very few of them are ahead of yours.${tail}`,
    mixed: `His range splits close to evenly against your hand.${tail}`,
    behind: `Most of the hands he can hold are better than yours right now.${tail}`,
  };
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
function takeawayFor({ facing, bestIsBet, bestId, standingNow, beats, youBeat, total, players = 2 }) {
  const many = players >= 3;
  // Three-handed the counts run to seven figures - "868,584 of the 979,110
  // ways" is exact and unreadable. The share leads in prose; the exact pair
  // count still appears in the facts block beside it.
  const share = (x) => `${Math.round((x / total) * 100)}% of the ways they can be dealt`;
  const n = (x) => String(x);
  const ofTotal = `of his ${total}`;
  // Each sentence carries this hand's own count, so a learner doing a hundred
  // of these gets a hundred concrete lines rather than six repeated maxims.
  //
  // Every branch keys off the line that actually won, not off the standing
  // alone. Keying off standing shipped a hand whose takeaway read "you beat 86%
  // of what he can hold" directly above a verdict of "fold does better here".
  const count = many ? share(beats) : `${beats} of his ${total}`;
  if (facing) {
    if (bestId === "fold") return `${count} hands beat you. Work out the price before you call, not after.`;
    if (bestId === "call") return `You are best in ${many ? share(youBeat) : `${youBeat} of his ${total}`}. Price the call on that, not on how strong the bet looked.`;
    return `You are best in ${many ? share(youBeat) : `${youBeat} of his ${total}`}. Too many to just call. Charge the ones that are worse.`;
  }
  if (bestIsBet) {
    return standingNow === "behind"
      ? `${count} beat you. Checking wins none of those. A bet can. Name the better hands that fold.`
      : `Only ${count} beat you. So name the worse ones that will actually call before you check.`;
  }
  // Checking was best. All three standings need their own line: telling someone
  // holding a flush that "bluffing into him does not" win describes a hand they
  // are not holding.
  if (standingNow === "ahead") {
    // The count has to travel with the sentence. A takeaway that states a
    // principle and no numbers is one of six maxims a learner will read a
    // hundred times, which is exactly what these are meant not to be.
    return `Only ${count} beat you. But a bet still needs a worse hand to call it, and there isn't one. Checking keeps the pot you already have.`;
  }
  if (standingNow === "mixed") {
    return `${count} beat you and you beat the rest. A bet mostly gets called by the better half, so checking is how this hand gets to showdown.`;
  }
  return `${count} beat you. But you still beat the misses. Checking wins those. Bluffing does not.`;
}

// --------------------------------------------------------------- reasons
// Why an answer is right or wrong.
//
// This has been rewritten three times and each rewrite was a lesson.
//
// 1. It stated only the SIZE of the mistake ("costs about $190"), which tells a
//    learner how wrong they were and nothing about why.
// 2. It named the mechanism, but in long clauses. Raj: "this still reads hard".
// 3. It showed the wrong answer's reason AND the right answer's reason. When
//    those hinge on the same fact - fold versus call always does - it printed
//    the same count twice in two paragraphs, mixed "25%" with "1 time in 4" for
//    the same number, and showed "$4" as both a cost and a gain.
//
// So the numbers now come OUT of the prose and into `facts`, a two or three row
// block the app renders as a small table. What is left is one short sentence
// per option saying what that option does. Nothing is said twice.

const answeredWith = (option, type) => option?.answered?.[type] ?? 0;
const paysYou = (option) => answeredWith(option, "call");
const foldsTo = (option) => answeredWith(option, "fold");
const takesItDown = (option) => option?.uncontested ?? 0;

const asPct = (n) => `${Math.round((n ?? 0) * 100)}%`;
const commas = (n) => Number(n).toLocaleString("en-US");
const pctOf = (some, all) => (all > 0 ? Math.round((some / all) * 100) : 0);

const amountOf = (label) => (/\$\d+/.exec(label) ?? ["that much"])[0];
const numAmount = (label) => {
  const found = /\$(\d+)/.exec(label);
  return found ? Number(found[1]) : null;
};
const isBetId = (id) => id.startsWith("bet") || id.startsWith("raise");

/**
 * Pronouns. Three-handed, "he" is wrong and "the opponent" is ambiguous.
 */
export function voiceFor(players) {
  return players >= 3
    ? { subj: "they", obj: "them", poss: "their", plural: true, field: "the two of them" }
    : { subj: "he", obj: "him", poss: "his", plural: false, field: "he" };
}

/** "never folds", "folds 62% of the time", "folds every time". */
function does(verb, n, voice) {
  const p = Math.round((n ?? 0) * 100);
  const s = voice?.plural ? verb : `${verb}s`;
  if (p <= 0) return `never ${verb}`;
  if (p <= 4) return `almost never ${verb}`;
  if (p >= 100) return `${s} every time`;
  if (p >= 96) return `${s} almost every time`;
  return `${s} ${p}% of the time`;
}

/** The price a call is offered at, as a percentage the learner can compare. */
export function priceOf(pot, toCall) {
  if (!toCall || toCall <= 0) return null;
  return { percent: Math.round((toCall / (pot + toCall)) * 100) };
}

/**
 * The two or three numbers that actually decide this spot, pulled out of the
 * sentences so they can be read at a glance and compared to each other.
 *
 * A facing-a-bet decision is one comparison - the price against the share - and
 * putting those two numbers on adjacent lines does more than any paragraph.
 */
export function decidingFacts({ options, best, facing, standingNow, beats, youBeat, total, pot, toCall, players, street }) {
  // On the flop and turn the count is how much of his range you are AHEAD OF
  // right now, with cards still to come. Labelling that "You win" told a
  // learner they would win the hand that often, which is a different and false
  // claim - and they read it exactly that way. Only the river can say "win".
  const aheadLabel = street === "River" ? "You win" : "You're ahead of";
  const beatenLabel = street === "River" ? "You lose" : "You're behind";
  const voice = voiceFor(players);
  const multiway = players >= 3;
  // Three-handed, the count is over the WAYS the two of them can be dealt, not
  // over one range, so it needs saying differently.
  const ofField = multiway
    ? `${commas(youBeat)} of ${commas(total)} ways`
    : `${youBeat} of ${voice.poss} ${total} hands`;
  const beatenBy = multiway
    ? `${commas(beats)} of ${commas(total)} ways`
    : `${beats} of ${voice.poss} ${total} hands`;

  if (facing) {
    const price = priceOf(pot, toCall);
    // When the answer is to RAISE, the decision is not about the price of a
    // call - with 93% equity that clears trivially - it is about how much he
    // will pay. Showing the calling price there invited exactly the wrong
    // question: "but what are the chances of him folding?" That number was
    // measured and simply never shown.
    if (best && isBetId(best.id)) {
      const amount = amountOf(best.label);
      const folds = foldsTo(best);
      const Who = `${voice.subj[0].toUpperCase()}${voice.subj.slice(1)}`;
      return [
        { label: aheadLabel, value: `${pctOf(youBeat, total)}%`, note: ofField },
        { label: `${Who} ${voice.plural ? "fold" : "folds"} to ${amount}`, value: asPct(folds) },
        { label: `${Who} ${voice.plural ? "pay" : "pays"} or re-${voice.plural ? "raise" : "raises"}`, value: asPct(1 - folds) },
      ];
    }
    // "You need 26%" never said what it was the threshold FOR, and sat in a row
    // identical to the one beside it, which says the two are the same kind of
    // number. One is a break-even point for one action; the other is where the
    // hand stands.
    return [
      { label: "Calling needs", value: `${price?.percent ?? 0}%`, note: `$${toCall} into a $${Math.round(pot)} pot` },
      { label: aheadLabel, value: `${pctOf(youBeat, total)}%`, note: ofField },
    ];
  }

  const bets = options.filter((option) => isBetId(option.id) && numAmount(option.label) !== null)
    .sort((a, b) => numAmount(a.label) - numAmount(b.label));
  const check = options.find((option) => option.id === "check") ?? null;
  const bluffing = standingNow === "behind";

  const facts = [bluffing
    ? { label: beatenLabel, value: `${pctOf(beats, total)}%`, note: beatenBy }
    : { label: aheadLabel, value: `${pctOf(youBeat, total)}%`, note: ofField }];

  // What each size actually achieves. Bluffing, that is how often it folds them
  // out; value betting, how often it gets paid. Multiway neither reply tally is
  // about the field, so the honest number is how often everyone folds.
  for (const bet of bets.slice(0, 2)) {
    const amount = amountOf(bet.label);
    const raised = answeredWith(bet, "raise");
    // Show whichever reply actually happened. Two rows reading "Everyone folds
    // to $14: 0%" and "Everyone folds to $31: 0%" state nothing, on a hand whose
    // whole problem was that betting gets raised.
    if (raised >= 0.2) {
      facts.push({ label: `${amount} gets raised`, value: asPct(raised) });
    } else if (multiway) {
      // Neutral label. Folding everyone out is good when bluffing and bad
      // when value betting, so the fact states it and the sentence judges it.
      facts.push({ label: `Everyone folds to ${amount}`, value: asPct(takesItDown(bet)) });
    } else if (bluffing) {
      facts.push({ label: `${voice.subj} folds to ${amount}`, value: asPct(foldsTo(bet)) });
    } else {
      facts.push({ label: `${voice.subj} calls ${amount}`, value: asPct(paysYou(bet)) });
    }
  }
  if (check && best?.id === "check" && answeredWith(check, "bet") > 0) {
    facts.push({ label: "If you check, a bet comes", value: asPct(answeredWith(check, "bet")) });
  }
  return facts.slice(0, 3);
}

/**
 * One sentence saying what THIS option does. The numbers live in `facts`, so
 * these do not repeat them; they carry the judgment instead.
 */
export function reasonFor({ chosen, best, options = [], isCorrect, facing, standingNow, beats, youBeat, total, pot, toCall, players = 2 }) {
  const voice = voiceFor(players);
  const multiway = players >= 3;
  const amount = amountOf(chosen.label);
  const bestAmount = amountOf(best.label);
  const price = priceOf(pot, toCall);
  const yourShare = pctOf(youBeat, total);

  if (facing) {
    const clears = price ? yourShare >= price.percent : false;
    if (chosen.id === "fold") {
      return isCorrect
        ? `You are not winning this often enough to pay for it.`
        : `You win more often than the price needs, so folding gives up money.`;
    }
    if (chosen.id === "call") {
      if (isCorrect) return `You are ahead far more often than calling needs, so it pays.`;
      if (isBetId(best.id)) {
        // Slow-playing to "keep him in" is the commonest reason a learner calls
        // here, and the answer to it is his fold rate, which is measured.
        return `${voice.subj[0].toUpperCase()}${voice.subj.slice(1)} ${does("fold", foldsTo(best), voice)} to a raise, so raising charges ${voice.obj} rather than losing ${voice.obj}. Calling only wins what is already in.`;
      }
      return `You do not win often enough to pay this price.`;
    }
    // Raising into a bet.
    if (isCorrect) return `You are ahead of most of what ${voice.subj} can have, and ${voice.subj} still ${voice.plural ? "pay" : "pays"} a raise.`;
    if (isBetId(best.id)) return sizingSentence({ chosen, best, standingNow, voice, multiway });
    return `${voice.subj[0].toUpperCase()}${voice.subj.slice(1)} ${does("fold", foldsTo(chosen), voice)} to this, and what calls has you beaten.`;
  }

  if (chosen.id === "check") {
    if (isCorrect) {
      const induced = answeredWith(chosen, "bet");
      if (induced >= 0.4) return `Checking lets a bet come to you, which is more than betting collects.`;
      if (standingNow === "behind") return `You still beat the hands ${voice.subj} ${voice.plural ? "miss" : "misses"} with. Checking wins those; betting does not.`;
      return `A bet needs a worse hand to call it, and there is not one here.`;
    }
    return standingNow === "behind"
      ? `Checking gives up. A bet is the only way this hand wins.`
      : `There are worse hands here that would pay you. Checking collects none of it.`;
  }

  // Betting or raising with nobody yet to call.
  if (isCorrect) {
    if (multiway) {
      return standingNow === "behind"
        ? `Against two players a bet is how this wins, and it takes it down often enough to pay.`
        : `Two players can pay you here, and betting charges both of them.`;
    }
    return standingNow === "behind"
      ? `Betting folds ${voice.obj} out often enough to win pots that checking never wins.`
      : `There are worse hands that call this. That is who pays you.`;
  }
  if (isBetId(best.id)) return sizingSentence({ chosen, best, standingNow, voice, multiway });

  const raised = answeredWith(chosen, "raise");
  if (raised >= 0.25) {
    return `This gets raised too often. It turns a hand you could have shown down into one you must defend.`;
  }
  return standingNow === "behind"
    ? `This does not fold out enough to be a bluff, and it is not winning a showdown.`
    : `This mostly wins a pot you already had, and what calls has you beaten.`;
}

/**
 * Why one size beat another. A bluff and a value bet want opposite things from a
 * size, so they cannot share a sentence: judging a bluff by its call rate once
 * printed "the ones that do pay a lot more" on a hand whose winning bet worked
 * precisely because everyone folded.
 */
function sizingSentence({ chosen, best, standingNow, voice, multiway }) {
  const mine = numAmount(chosen.label);
  const theirs = numAmount(best.label);
  const bigger = mine !== null && theirs !== null && mine > theirs;
  const bestAmount = amountOf(best.label);

  if (multiway) {
    // Value and bluff want opposite things from a size here too: folding the
    // field out is the goal of one and the failure of the other.
    if (standingNow === "behind") {
      return bigger
        ? `${bestAmount} clears the field about as often for less money.`
        : `This is too small to fold two players off their hands.`;
    }
    return bigger
      ? `This folds out the players you want paying you. ${bestAmount} keeps them in.`
      : `${bestAmount} keeps more of the field in, and there are two of them to pay you.`;
  }
  if (standingNow === "behind") {
    return bigger
      ? `${bestAmount} folds ${voice.obj} out about as often for less money.`
      : `This is not enough to move ${voice.obj} off the hands that beat you.`;
  }
  return bigger
    ? `The worse hands you want paying you fold to this. ${bestAmount} keeps them in.`
    : `${bestAmount} is called about as often and collects more.`;
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
const RANK_NAMES = {
  0: "twos", 1: "threes", 2: "fours", 3: "fives", 4: "sixes", 5: "sevens", 6: "eights",
  7: "nines", 8: "tens", 9: "jacks", 10: "queens", 11: "kings", 12: "aces",
};
const nameOf = (value) => RANK_NAMES[value] ?? "cards";
// Stripping "es" then "s" mangles half of these: aces -> "ac", nines -> "nin",
// fives -> "fiv", threes -> "thre". That shipped, as titles reading "Ac high"
// and "A fiv-high straight". Spelled out rather than derived.
const RANK_SINGULAR = {
  twos: "two", threes: "three", fours: "four", fives: "five", sixes: "six",
  sevens: "seven", eights: "eight", nines: "nine", tens: "ten",
  jacks: "jack", queens: "queen", kings: "king", aces: "ace",
};
const singular = (plural) => RANK_SINGULAR[plural] ?? plural.replace(/s$/, "");

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
  let straightHigh = null;
  for (let i = 0; i + 5 <= unique.length; i += 1) {
    const window = unique.slice(i, i + 5);
    if (window[4] - window[0] === 4) straightHigh = window[4];
  }
  const pairs = Object.keys(counts).filter((r) => counts[r] === 2).map(Number).sort((a, b) => b - a);
  const trips = Object.keys(counts).filter((r) => counts[r] === 3).map(Number).sort((a, b) => b - a);
  const quads = Object.keys(counts).filter((r) => counts[r] === 4).map(Number);

  // Naming the actual ranks is what makes a hundred titles read as a hundred
  // spots. "Two pair" alone landed on eighteen different hands.
  if (quads.length) return `Quad ${nameOf(quads[0])}`;
  if (trips.length && pairs.length) return `${nameOf(trips[0])} full of ${nameOf(pairs[0])}`.replace(/^./, (c) => c.toUpperCase());
  if (flushSuit && heroCodes.some((c) => c[1] === flushSuit)) return "A flush";
  if (straightHigh !== null) return `A ${singular(nameOf(straightHigh))}-high straight`;
  if (trips.length) {
    const set = heroRanks[0] === heroRanks[1] && heroRanks[0] === trips[0];
    return `${set ? "A set of" : "Trip"} ${nameOf(trips[0])}`;
  }
  if (pairs.length >= 2) return `${nameOf(pairs[0])} and ${nameOf(pairs[1])}`.replace(/^./, (c) => c.toUpperCase());
  if (pairs.length === 1) {
    const pairedRank = pairs[0];
    const topBoard = Math.max(...boardRanks);
    if (heroRanks[0] === heroRanks[1]) {
      return heroRanks[0] > topBoard
        ? `An overpair of ${nameOf(heroRanks[0])}`
        : `Pocket ${nameOf(heroRanks[0])}`;
    }
    if (pairedRank === topBoard) return `Top pair, ${nameOf(pairedRank)}`;
    if (pairedRank === Math.min(...boardRanks)) return `Bottom pair, ${nameOf(pairedRank)}`;
    return `Middle pair, ${nameOf(pairedRank)}`;
  }
  const high = Math.max(...heroRanks);
  return `${singular(nameOf(high)).replace(/^./, (c) => c.toUpperCase())} high`;
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

  const spot = candidate.inPosition ? "in position" : "out of position";
  if (shape.facing) return `${held}, and he bets into you`;
  const checkedTwice = (candidate.villainChecks ?? 0) >= 2;
  if (checkedTwice) return `${held}, and he keeps checking`;
  return `${held}, ${spot}`;
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

/**
 * Which leak this spot tests, decided here rather than in the generator.
 *
 * The generator classified before the showdown count was recomputed, and it
 * gated "betting a hand that should check" on the hero being WEAK - backwards,
 * since that leak is about betting away showdown value, which requires having
 * some. It produced three such hands in a hundred. Taxonomy is learner-facing
 * copy, so it belongs next to the rest of the learner-facing copy.
 */
export function classify(candidate, standingNow) {
  const isBet = (id) => id.startsWith("bet") || id.startsWith("raise");
  const best = candidate.best.id;
  const tempted = candidate.tempting.id;

  if (candidate.facingBet) return "wrong-price";

  // You would have checked; betting earns more.
  if (tempted === "check" && isBet(best)) {
    return standingNow === "behind" ? "missed-bluff" : "missed-value";
  }
  // You would have bet; checking earns more.
  if (isBet(tempted) && best === "check") {
    return standingNow === "ahead" ? "bet-no-caller" : "bet-away-showdown";
  }
  // Both bet, and the size is the whole difference.
  if (isBet(tempted) && isBet(best) && tempted !== best) return "wrong-size";

  if (isBet(best)) return standingNow === "behind" ? "missed-bluff" : "missed-value";
  return standingNow === "ahead" ? "bet-no-caller" : "bet-away-showdown";
}

// --------------------------------------------------------------- selection
/**
 * Pick `count` candidates that are instructive AND varied.
 *
 * Round-robins across the six leaks so no single leak swamps the set, and
 * refuses near-duplicates (same leak, same texture, same shape of mistake)
 * until every leak has been given a fair chance.
 */
export function select(candidates, count, leakOf = (c) => c.leak) {
  // Pools are keyed by whatever `leakOf` returns, and seeded from the data
  // rather than from LEAKS, so the caller can round-robin over a compound key
  // (leak x street) and get both balanced in one pass.
  const pools = new Map();
  for (const candidate of candidates) {
    const leak = leakOf(candidate);
    if (!pools.has(leak)) pools.set(leak, []);
    pools.get(leak).push(candidate);
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
        // The hero's hand belongs in the key. Without it, "wrong size" had
        // roughly four distinct keys across 175 candidates - two textures by
        // two directions - and starved after four picks while the pool stayed
        // full. What makes two spots feel different is mostly what you hold.
        let held = "";
        try { held = describeHero(next.heroCodes, next.boardCodes); } catch { /* keyed without it */ }
        const key = [
          leakOf(next), texture(next.boardCodes), next.best.id, next.tempting.id, held,
          next.heroPosition,
        ].join("|");
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
  const seats = candidate.players ?? 2;
  if (seats >= 3) {
    // Three-handed, naming one player as "Opponent" is ambiguous and naming
    // both makes a sentence nobody reads. The timeline above already says who
    // did what; this line only has to say what is on the hero.
    if (candidate.facingBet) return `It is $${candidate.toCall} to you, with two players still in.`;
    return candidate.inPosition
      ? "Checked to you, with two players still in."
      : `You are first to act on the ${(candidate.street ?? "River").toLowerCase()}, with two players behind you.`;
  }
  if (candidate.facingBet) {
    // A raise and a bet cost the same to call and are not the same story. The
    // line used to say "Opponent bets $13 into $26" directly above a timeline
    // reading "Opponent raises to $20", which is the kind of small contradiction
    // that makes a learner stop trusting the screen.
    const facing = candidate.facingAction;
    if (facing?.type === "raise" && facing.to) {
      return `Opponent raises to $${facing.to}. It is $${candidate.toCall} more to you.`;
    }
    return candidate.decisionNow;
  }
  const street = (candidate.street ?? "River").toLowerCase();
  return candidate.inPosition
    ? "Opponent checks. You act now."
    : `You are first to act on the ${street}.`;
}

/**
 * The timeline, always ending on the river so the story is complete. A river row
 * is added when the street has no actions yet, because "the river came and it is
 * on you" is itself the situation.
 */
function fullHistory(candidate) {
  const history = candidate.history.map((street) => ({ ...street }));
  const street = candidate.street ?? "River";
  // The card or cards that brought this street.
  const dealt = street === "Flop"
    ? candidate.board.slice(0, 3).join(" ")
    : street === "Turn" ? candidate.board[3] : candidate.board[4];

  const row = history.find((entry) => entry.street.startsWith(street));
  if (!row) {
    history.push({ street: `${street} · ${dealt}`, actions: [decisionLine(candidate)] });
  } else if (!candidate.facingBet && !row.actions.length) {
    row.actions = [decisionLine(candidate)];
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
  if (!degenerate && !stale) {
    return { split: shipped, source: candidate.rangeSource, breakdown: candidate.breakdown ?? null };
  }

  // Recompute the BREAKDOWN from the same holdings as the count. Recomputing
  // only the count left the two describing different ranges, and the grouped
  // rows stopped adding up to the total printed beside them.
  const hero = candidate.heroCodes ?? candidate.hero.map(toCode);
  const board = candidate.boardCodes ?? candidate.board.map(toCode);
  const holdings = plausibleRange(board, [...board, ...hero]);
  // Three-handed the count is over the PAIRS the two of them can be dealt
  // between them. Recomputing it heads-up style reported 1,081 ways where there
  // are more than a million, and the number still looked plausible on screen.
  const seats = candidate.players ?? 2;
  const ranges = Array.from({ length: Math.max(1, seats - 1) }, () => holdings);
  return {
    split: showdownVsField({ heroCards: hero, board, ranges }),
    source: "heuristic",
    // The breakdown stays per-opponent: it groups ONE range into hand classes,
    // which is what a learner reads. It is not a slice of the pair count.
    breakdown: rangeBreakdown({ heroCards: hero, board, holdings }),
  };
}

/**
 * One opponent's range regrouped from the fallback holdings, for the case where
 * the count was recomputed against them. Returns null when the shipped
 * per-opponent numbers are still the ones the count was taken from.
 */
function recountOpponent(candidate, rangeSource) {
  if (rangeSource !== "heuristic") return null;
  const hero = candidate.heroCodes ?? candidate.hero.map(toCode);
  const board = candidate.boardCodes ?? candidate.board.map(toCode);
  const holdings = plausibleRange(board, [...board, ...hero]);
  return {
    combos: holdings.length,
    breakdown: rangeBreakdown({ heroCards: hero, board, holdings }),
  };
}

export function toLesson(candidate, index) {
  const { split: showdown, source: rangeSource, breakdown } = usableShowdown(candidate);
  const beatsPct = showdown?.beatsPct ?? null;
  const standingNow = standing(beatsPct);
  const opts = candidate.options.slice().sort((a, b) => b.ev - a.ev);
  const bestEv = opts[0].ev;
  // Anything within 5% of the pot of the best play is also defensible; poker
  // rarely has one right answer and marking near-ties wrong teaches nothing.
  const tolerance = Math.max(1, candidate.potRaw * 0.05);
  const correctIds = opts.filter((o) => bestEv - o.ev <= tolerance).map((o) => o.id);

  const players = candidate.players ?? 2;
  const voice = voiceFor(players);
  const youBeatCount = showdown.total - showdown.beats - (showdown.ties ?? 0);
  // Three-handed the count is over the WAYS the two of them can be dealt
  // between them, not over one range, and saying it the heads-up way would be
  // a different and false claim.
  const countSentence = players >= 3
    ? `One of them has you beaten ${pct(beatsPct)} of the time, counted across every one of the ${showdown.total.toLocaleString("en-US")} ways the two of them can be dealt.`
    : `${showdown.beats} of his ${showdown.total} hands beat you. That is ${pct(beatsPct)}.`;
  const facts = decidingFacts({
    options: opts, best: opts[0], facing: candidate.facingBet, standingNow,
    beats: showdown.beats, youBeat: youBeatCount, total: showdown.total,
    pot: candidate.potRaw, toCall: candidate.toCall, players,
    street: candidate.street,
  });

  const shape = {
    facing: candidate.facingBet,
    bestId: opts[0].id,
    bestIsBet: opts[0].id.startsWith("bet") || opts[0].id.startsWith("raise"),
    players,
    standingNow,
    beats: showdown.beats,
    youBeat: showdown.loses,
    total: showdown.total,
    losesPct: Math.round(100 - (beatsPct ?? 0)),
  };

  const actionOptions = opts.map((o) => ({
    id: o.id,
    // `candidateActions` already formats the money ("Call $17"). This used to
    // add another dollar sign on top, so every priced option in all 100 hands
    // shipped reading "Call $$17".
    label: o.label,
    purpose: purposeOf(o.id, standingNow),
    ev: o.ev,
  }));

  // Why, then how much. The reason is the lesson; the money is the evidence for
  // it, so it goes second and in one short clause rather than being the whole
  // sentence the way it used to be.
  const actionWhy = {};
  for (const option of opts) {
    const isCorrect = correctIds.includes(option.id);
    const delta = bestEv - option.ev;
    const reason = reasonFor({
      chosen: option, best: opts[0], options: opts, isCorrect,
      players,
      facing: candidate.facingBet,
      standingNow,
      beats: showdown.beats,
      youBeat: showdown.loses,
      total: showdown.total,
      pot: candidate.potRaw,
      toCall: candidate.toCall,
    });
    // Some spots have no winning line - every option loses money and the skill
    // is losing least. Saying "worth about $-22" there is both malformed and a
    // lie about what happened.
    // The EV bars underneath already show every option's money side by side, so
    // repeating it here made the same $4 appear twice, once as a gain and once
    // as a cost. Only the loser's gap is worth a clause, because that is the
    // one number the bars do not state directly.
    actionWhy[option.id] = isCorrect ? reason : `${reason} Costs about $${delta.toFixed(0)}.`;
  }

  const readWhy = {};
  for (const option of READ_OPTIONS(candidate.street, players)) {
    readWhy[option.id] = option.id === standingNow
      ? READ_WHY(candidate.street)[option.id]
      : `Not quite. ${countSentence}`;
  }

  const leak = classify(candidate, standingNow);

  return {
    id: `h${String(index + 1).padStart(3, "0")}`,
    sourceId: candidate.id,
    // The three numbers that reproduce this exact hand from the generator.
    // Generation is deterministic, so a spot does not need its game state
    // stored - `tools/lib/replay.mjs` rebuilds it from these.
    source: {
      seed: candidate.seed ?? null,
      handIndex: candidate.handIndex ?? null,
      street: candidate.street,
      players,
    },
    leak,
    leakLabel: LEAK_LABELS[leak] ?? leak,
    title: handTitle(candidate, shape),
    street: candidate.street,
    pot: candidate.pot,
    effective: candidate.effective,
    heroPosition: candidate.heroPosition,
    opponentPosition: candidate.opponentPosition,
    inPosition: candidate.inPosition,
    breakdown,
    players,
    // Every seat still in, with its own range and its own breakdown. Heads-up
    // this is a one-element list, so the app has a single shape to render.
    // When `usableShowdown` recounted against the fallback range, each
    // opponent's own combos and breakdown were computed from a DIFFERENT range
    // and no longer describe the count printed beside them. Recount them from
    // the same holdings, or the grouped rows stop adding up.
    opponents: (candidate.opponents ?? [{
      position: candidate.opponentPosition,
      archetype: candidate.opponentArchetype,
    }]).map((opponent) => {
      const recounted = recountOpponent(candidate, rangeSource);
      return {
        position: opponent.position,
        note: opponentNote(opponent.archetype),
        combos: recounted ? recounted.combos : opponent.combos,
        breakdown: recounted ? recounted.breakdown : (opponent.breakdown ?? null),
      };
    }),
    // The numbers that decide the spot, lifted out of the prose so they can be
    // read at a glance and compared against each other.
    facts,
    countSentence,
    opponentNote: opponentNote(candidate.opponentArchetype),
    hero: candidate.hero,
    board: candidate.board,
    decisionNow: decisionLine(candidate),
    history: fullHistory(candidate),

    read: {
      prompt: READ_PROMPT(candidate.street, players),
      options: READ_OPTIONS(candidate.street, players),
      correctId: standingNow,
      why: readWhy,
    },
    action: {
      prompt: "What do you do, and what is it for?",
      options: actionOptions,
      correctIds,
      why: actionWhy,
    },

    // What the count is actually counting. "Hands he can hold" implies his
    // betting narrowed the range, which is only true for the modelled ones;
    // saying it of a uniform fallback would overclaim.
    rangeBasis: rangeSource === "modelled"
      ? "hands that fit how he has played"
      : "hands he could still be dealt",
    rangeNarrowed: rangeSource === "modelled",
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
  // `--in` takes a comma-separated list so pools generated with different seeds
  // can be pooled. More candidates is the only lever that improves variety once
  // the de-duplication key is right.
  const paths = IN.split(",").map((path) => path.trim()).filter(Boolean);
  const pools = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(path, "utf8"))));
  const seen = new Set();
  const merged = [];
  for (const pool of pools) {
    for (const candidate of pool.candidates) {
      // Different seeds can still deal the same spot; key on the cards.
      const key = `${candidate.boardCodes.join("")}|${candidate.heroCodes.join("")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(candidate);
    }
  }
  merged.sort((a, b) => b.evGapPot - a.evGapPot);
  const raw = {
    candidates: merged,
    dealt: pools.reduce((sum, pool) => sum + (pool.dealt ?? 0), 0),
    generatedFrom: pools[0]?.generatedFrom,
  };
  if (paths.length > 1) {
    console.log(`merged ${paths.length} pools -> ${merged.length} unique candidates from ${raw.dealt} hands dealt`);
  }
  // Over-select, then drop the hands whose read question answers itself - a
  // hero holding the nuts, or drawing dead, has no range to read - and trim
  // back to the target. h046 shipped as the nut flush against 990 combos, where
  // "you beat 100% of what he can hold" is true and teaches nothing.
  // Round-robin over leak AND street, so the shipped set covers both instead of
  // filling up on flops - most hands are still two-handed on the flop, so an
  // unweighted draw lands about 52/24/24.
  const leakOf = (candidate) =>
    `${classify(candidate, standing(candidate.showdown?.beatsPct ?? null))}|${candidate.street}`;
  // Spots where EVERY line loses money are damage control, not a leak. They are
  // only 4% of the pool, but their EV gap is wide - when you are stuck, the
  // spread between losing least and losing most is big - and selection ranks by
  // gap, so they arrived at 21 of the shipped 100. "You got it right, and it
  // still loses $22" is a confusing lesson, and it maps to none of the six
  // leaks. Dropped before selection rather than trimmed after.
  const winnable = raw.candidates.filter((candidate) =>
    Math.max(...candidate.options.map((option) => option.ev)) > 0);
  const dropped = raw.candidates.length - winnable.length;
  if (dropped) console.log(`dropped ${dropped} spots where every line loses money`);

  const chosen = select(winnable, Math.round(COUNT * 1.6), leakOf);
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
