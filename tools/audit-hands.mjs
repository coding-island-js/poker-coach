// Audits every shipped hand, independently of the code that produced it.
//
// The content gate checks that a hand is well FORMED. This checks that it is
// TRUE: it recomputes the showdown count from the cards, re-derives which
// answer should be correct, and checks that every sentence the learner reads
// agrees with the numbers underneath it. It also looks for hands that are too
// alike to be worth being in the same hundred.
//
//   node tools/audit-hands.mjs [--verbose]
import { readFile } from "node:fs/promises";
import { showdownSplit, showdownVsField, plausibleRange, candidateCombos } from "./lib/engine.mjs";

const VERBOSE = process.argv.includes("--verbose");

const SUITS = { "♣": "c", "♦": "d", "♥": "h", "♠": "s" };
/** "10♥" / "K♦" back into the engine's "Th" / "Kd". */
const toCode = (pretty) => {
  const suit = SUITS[pretty.slice(-1)];
  const rank = pretty.slice(0, -1) === "10" ? "T" : pretty.slice(0, -1);
  return `${rank}${suit}`;
};

const data = JSON.parse(await readFile(new URL("../public/hands.json", import.meta.url), "utf8"));
// Continuations are audited exactly like the hands they hang off: the numbers
// under a second decision are no more trustworthy than the numbers under a
// first, and they are produced by the same templates.
const shipped = data.hands;
const continuations = shipped.flatMap((hand) =>
  Object.values(hand.chain?.branches ?? {})
    .filter((branch) => branch.kind === "question" && branch.lesson)
    .map((branch) => branch.lesson));
const hands = [...shipped, ...continuations];

const problems = [];
const note = (hand, kind, message) => problems.push({ id: hand.id, kind, message });

// ---------------------------------------------------------------- per hand
for (const hand of hands) {
  const hero = hand.hero.map(toCode);
  const board = hand.board.map(toCode);
  const known = [...board, ...hero];

  // --- 1. the cards must be a legal deal -------------------------------
  const seen = new Set(known);
  if (seen.size !== known.length) note(hand, "cards", `duplicate card among hero+board: ${known.join(" ")}`);

  // --- 2. recount the showdown ------------------------------------------
  // Only the "heuristic" hands can be recomputed from the cards alone; the
  // "modelled" ones came from poker-sim's read model, which needs the
  // opponent's decision log. Those get the invariants instead.
  const counted = hand.numbers;
  const possible = candidateCombos(known).length;

  // Three-handed the count is over the PAIRS the two of them can be dealt
  // between them, so it is recomputed the same way and compared against the
  // number of pairs rather than the number of single holdings. Checking a pair
  // count against one range's size flagged every multiway hand as impossible.
  const seats = hand.players ?? 2;
  const villains = Math.max(1, seats - 1);
  if (hand.evidence.opponent === "heuristic") {
    const holdings = plausibleRange(board, known);
    const recomputed = showdownVsField({
      heroCards: hero, board,
      ranges: Array.from({ length: villains }, () => holdings),
    });
    if (recomputed.total !== counted.total) note(hand, "count", `range ${counted.total} shipped, ${recomputed.total} recomputed`);
    if (recomputed.beats !== counted.beats) note(hand, "count", `beats ${counted.beats} shipped, ${recomputed.beats} recomputed`);
  }

  // The ceiling for a field is the number of ordered pairs of distinct
  // holdings, which is strictly less than possible^villains.
  const ceiling = villains === 1 ? possible : possible * possible;
  if (counted.total > ceiling) note(hand, "count", `range ${counted.total} exceeds ${ceiling} possible ${villains === 1 ? "combos" : "ways"}`);
  if (counted.beats + (counted.ties ?? 0) > counted.total) note(hand, "count", "beats + ties exceeds range size");
  const impliedPct = Number(((counted.beats / counted.total) * 100).toFixed(1));
  if (Math.abs(impliedPct - counted.beatsPct) > 0.15) {
    note(hand, "count", `beatsPct ${counted.beatsPct} but ${counted.beats}/${counted.total} is ${impliedPct}`);
  }
  // A range that beats the hero never, or always, is a red flag worth seeing.
  if (counted.beats === 0) note(hand, "count", `nothing in his range beats you (${counted.total} combos) - is the range too narrow?`);
  if (counted.beats === counted.total) note(hand, "count", "his entire range beats you - drawing dead");

  // --- 3. the read answer must follow from the count -------------------
  const pct = counted.beatsPct;
  const expected = pct < 20 ? "ahead" : pct < 45 ? "mixed" : "behind";
  if (hand.read.correctId !== expected) {
    note(hand, "read", `answer "${hand.read.correctId}" but ${pct}% beat you implies "${expected}"`);
  }

  // --- 4. the prose must not contradict the count ----------------------
  const t = hand.title.toLowerCase();
  if (/you'?re ahead|^ahead/.test(t) && expected === "behind") note(hand, "copy", `title says ahead, ${pct}% beat you`);
  if (/^behind/.test(t) && expected === "ahead") note(hand, "copy", `title says behind, only ${pct}% beat you`);
  if (/coin flip/.test(t) && expected !== "mixed") note(hand, "copy", `title says coin flip, ${pct}% beat you`);
  // A takeaway has to carry THIS hand's numbers, or it is one of six maxims
  // read a hundred times. Either count is a real one: how many of his hands
  // beat you, or how many you beat. Accepting only the first flagged twelve
  // takeaways that were correctly quoting the second.
  const heroBeatsCount = counted.total - counted.beats - (counted.ties ?? 0);
  const carriesCount = [counted.beats, heroBeatsCount]
    .some((n) => hand.takeaway.includes(`${n} of his ${counted.total}`));
  if (!carriesCount && !hand.takeaway.includes("%")) {
    note(hand, "copy", "takeaway carries neither the count nor a percentage");
  }

  // --- 4b. every count quoted in prose must be a count this hand has ---
  // The feedback lines are templated over the numbers, so a sentence saying
  // "462 of his 513 hands" is checkable: 513 has to BE the range, and 462 has
  // to be either the hands that beat the hero or the hands the hero beats.
  // Nothing else is a real quantity, and a mismatch means the copy drifted off
  // the data it claims to be reading.
  const youBeat = counted.total - counted.beats - (counted.ties ?? 0);
  const prose = [hand.takeaway, ...Object.values(hand.action.why ?? {}), ...Object.values(hand.read.why ?? {})];
  // Three-handed the prose quotes shares, not pair counts - seven-figure numbers
  // are exact and unreadable - so there is no "N of M" to check there.
  for (const sentence of (hand.players ?? 2) >= 3 ? [] : prose) {
    for (const [, some, all] of String(sentence).matchAll(/(\d+) of (?:his |the )?(\d+)/g)) {
      if (Number(all) !== counted.total) {
        note(hand, "copy", `prose quotes a range of ${all}, but the range is ${counted.total}: "${sentence}"`);
      } else if (Number(some) !== counted.beats && Number(some) !== youBeat) {
        note(hand, "copy", `prose quotes ${some} of ${all}, which is neither ${counted.beats} beating you nor ${youBeat} you beat: "${sentence}"`);
      }
    }
  }

  // Percentages in the feedback are opponent-response frequencies, which are
  // shares of the play-outs and therefore cannot exceed 100.
  for (const [id, sentence] of Object.entries(hand.action.why ?? {})) {
    for (const [, value] of String(sentence).matchAll(/(\d+)%/g)) {
      if (Number(value) > 100) note(hand, "copy", `"${id}" feedback quotes ${value}%`);
    }
  }

  // --- 5. the marked-correct action must be the best measured one ------
  const options = hand.action.options;
  const best = Math.max(...options.map((o) => o.ev));
  // Tolerance is a share of the POT, matching the curator. Scaling it by the
  // best EV breaks whenever that EV is negative - a spot where every line loses
  // money is still a spot, and `best * 0.2` goes negative and flags a near-tie.
  const potSize = Number(String(hand.pot).replace(/[^0-9.]/g, "")) || 0;
  // MUST match the curator's tolerance, which matches the generator's floor for
  // "worth teaching". Three components have to agree on one number; when curate
  // moved to 8% and this stayed at 5%, the audit failed the build on five hands
  // the curator had deliberately marked as near-ties. Keeping the mismatch
  // visible here is cheaper than a shared constant nobody reads.
  const tolerance = Math.max(1, potSize * 0.08);
  for (const id of hand.action.correctIds) {
    const option = options.find((o) => o.id === id);
    if (best - option.ev > tolerance) {
      note(hand, "ev", `"${option.label}" marked correct at ${option.ev} but best is ${best} (pot ${hand.pot})`);
    }
  }
  const wrongButBest = options.find((o) => o.ev === best && !hand.action.correctIds.includes(o.id));
  if (wrongButBest) note(hand, "ev", `highest-EV option "${wrongButBest.label}" is marked wrong`);
  // Folding cannot make money: it is zero change from here by definition.
  const fold = options.find((o) => o.id === "fold");
  if (fold && Math.abs(fold.ev) > 0.01) note(hand, "ev", `fold EV is ${fold.ev}, should be 0`);

  // --- 6. purpose must match the standing ------------------------------
  for (const option of options) {
    const bettish = option.id.startsWith("bet") || option.id.startsWith("raise");
    if (bettish && expected === "ahead" && /better hand fold/.test(option.purpose)) {
      note(hand, "copy", `"${option.label}" called a bluff while ahead of ${100 - pct}%`);
    }
    if (bettish && expected === "behind" && /called by something worse/.test(option.purpose)) {
      note(hand, "copy", `"${option.label}" called value while ${pct}% beat you`);
    }
  }

  // --- 7. the situation must be internally consistent ------------------
  // heroPosition is a seat NAME now ("Big blind"), so who acts first comes from
  // `inPosition` rather than from parsing the label.
  const actsFirst = hand.inPosition === false;
  if (!actsFirst && /^You are first to act/.test(hand.decisionNow)) {
    note(hand, "story", "hero is in position, yet described as first to act");
  }
  if (actsFirst && /^Opponent checks/.test(hand.decisionNow)) {
    note(hand, "story", "hero acts first, yet the opponent is described as having checked");
  }
  if (!hand.opponentPosition) note(hand, "story", "no opponent position named");
  if (hand.heroPosition === hand.opponentPosition) note(hand, "story", "both players in the same seat");
  // "raises to $20" is facing a bet too - matching only "bets $" made every
  // raise-facing hand look like it had been offered a fold it should not have.
  // Three-handed the line says what is on the hero rather than who bet.
  const facing = /(bets|raises to) \$|to you, with/.test(hand.decisionNow);
  const hasFold = options.some((o) => o.id === "fold");
  if (facing !== hasFold) {
    note(hand, "story", facing ? "facing a bet but cannot fold" : "not facing a bet but offered a fold");
  }
  // The timeline must reach the street being decided - which is the river only
  // for river hands. Flop and turn spots correctly stop where the action is.
  if (!hand.history.some((entry) => entry.street.startsWith(hand.street))) {
    note(hand, "story", `timeline never reaches the ${hand.street.toLowerCase()}`);
  }
  const boardFor = { Flop: 3, Turn: 4, River: 5 }[hand.street];
  if (boardFor && hand.board.length !== boardFor) {
    note(hand, "story", `${hand.street} hand shows ${hand.board.length} board cards`);
  }

  // --- 8. the count must say what it is counting -----------------------
  if (!hand.rangeBasis) note(hand, "copy", "no rangeBasis - the count would overclaim");
  const narrowed = hand.evidence.opponent === "modelled";
  if (hand.rangeNarrowed !== narrowed) {
    note(hand, "copy", `rangeNarrowed ${hand.rangeNarrowed} disagrees with evidence.opponent ${hand.evidence.opponent}`);
  }
  // Only meaningful for a single range; a field count is over pairs, so it is
  // supposed to exceed the number of dealable holdings.
  if (villains === 1 && !narrowed && counted.total !== possible) {
    note(hand, "count", `unnarrowed range is ${counted.total} but ${possible} combos are dealable`);
  }
}

// ------------------------------------------------------------- uniqueness
const key = (hand) => `${hand.board.join("")}|${hand.hero.join("")}`;
const byKey = new Map();
for (const hand of shipped) {
  const k = key(hand);
  byKey.set(k, [...(byKey.get(k) ?? []), hand.id]);
}
const dupes = [...byKey.entries()].filter(([, ids]) => ids.length > 1);

const shape = (hand) => `${hand.leak}|${hand.read.correctId}|${hand.action.correctIds.join(",")}|${hand.action.options.length}`;
// Variety describes the shipped catalogue only. Two branches of one chained
// hand share a board and hole cards by definition, so counting them here would
// report 25 "duplicate spots" that are the same hand seen twice.
const byShape = new Map();
for (const hand of shipped) byShape.set(shape(hand), (byShape.get(shape(hand)) ?? 0) + 1);

const boards = new Set(shipped.map((h) => h.board.join("")));
const heroes = new Set(shipped.map((h) => h.hero.join("")));
const titles = new Map();
for (const hand of shipped) titles.set(hand.title, (titles.get(hand.title) ?? 0) + 1);
const takeaways = new Set(shipped.map((h) => h.takeaway));

// ------------------------------------------------------------------ report
console.log(`Audited ${hands.length} hands\n`);

console.log("VARIETY");
console.log(`  distinct boards        ${boards.size}/${shipped.length}`);
console.log(`  distinct hole cards    ${heroes.size}/${shipped.length}`);
console.log(`  distinct takeaways     ${takeaways.size}/${shipped.length}`);
console.log(`  distinct titles        ${titles.size} (most repeated ${Math.max(...titles.values())}x)`);
console.log(`  exact duplicate spots  ${dupes.length}`);
const topShape = [...byShape.entries()].sort((a, b) => b[1] - a[1])[0];
console.log(`  most common shape      ${topShape[1]}x  (${topShape[0]})`);

const spread = {};
for (const hand of hands) spread[hand.leak] = (spread[hand.leak] ?? 0) + 1;
const reads = {};
for (const hand of hands) reads[hand.read.correctId] = (reads[hand.read.correctId] ?? 0) + 1;
console.log(`  leaks                  ${Object.entries(spread).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`  read answers           ${Object.entries(reads).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
const streets = {};
for (const hand of hands) streets[hand.street] = (streets[hand.street] ?? 0) + 1;
console.log(`  streets                ${Object.entries(streets).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
const seats = {};
for (const hand of hands) seats[hand.heroPosition] = (seats[hand.heroPosition] ?? 0) + 1;
console.log(`  hero seats             ${Object.entries(seats).map(([k, v]) => `${k} ${v}`).join(" · ")}`);

const gaps = hands.map((h) => h.numbers.evGap).sort((a, b) => a - b);
console.log(`  EV gap $ min/med/max   ${gaps[0]} / ${gaps[Math.floor(gaps.length / 2)]} / ${gaps.at(-1)}`);

console.log("\nCORRECTNESS");
if (!problems.length) {
  console.log("  no problems found");
} else {
  const byKind = {};
  for (const p of problems) byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
  console.log(`  ${problems.length} problem(s): ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  const show = VERBOSE ? problems : problems.slice(0, 25);
  for (const p of show) console.log(`   · ${p.id} [${p.kind}] ${p.message}`);
  if (!VERBOSE && problems.length > show.length) console.log(`   … ${problems.length - show.length} more (--verbose)`);
}

process.exit(problems.length ? 1 : 0);
