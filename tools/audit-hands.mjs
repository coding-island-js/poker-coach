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
import { showdownSplit, plausibleRange, candidateCombos } from "./lib/engine.mjs";

const VERBOSE = process.argv.includes("--verbose");

const SUITS = { "♣": "c", "♦": "d", "♥": "h", "♠": "s" };
/** "10♥" / "K♦" back into the engine's "Th" / "Kd". */
const toCode = (pretty) => {
  const suit = SUITS[pretty.slice(-1)];
  const rank = pretty.slice(0, -1) === "10" ? "T" : pretty.slice(0, -1);
  return `${rank}${suit}`;
};

const data = JSON.parse(await readFile(new URL("../public/hands.json", import.meta.url), "utf8"));
const hands = data.hands;

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
  const shipped = hand.numbers;
  const possible = candidateCombos(known).length;

  if (hand.evidence.opponent === "heuristic") {
    const recomputed = showdownSplit({ heroCards: hero, board, holdings: plausibleRange(board, known) });
    if (recomputed.total !== shipped.total) note(hand, "count", `range ${shipped.total} shipped, ${recomputed.total} recomputed`);
    if (recomputed.beats !== shipped.beats) note(hand, "count", `beats ${shipped.beats} shipped, ${recomputed.beats} recomputed`);
  }

  if (shipped.total > possible) note(hand, "count", `range ${shipped.total} exceeds ${possible} possible combos`);
  if (shipped.beats + (shipped.ties ?? 0) > shipped.total) note(hand, "count", "beats + ties exceeds range size");
  const impliedPct = Number(((shipped.beats / shipped.total) * 100).toFixed(1));
  if (Math.abs(impliedPct - shipped.beatsPct) > 0.15) {
    note(hand, "count", `beatsPct ${shipped.beatsPct} but ${shipped.beats}/${shipped.total} is ${impliedPct}`);
  }
  // A range that beats the hero never, or always, is a red flag worth seeing.
  if (shipped.beats === 0) note(hand, "count", `nothing in his range beats you (${shipped.total} combos) - is the range too narrow?`);
  if (shipped.beats === shipped.total) note(hand, "count", "his entire range beats you - drawing dead");

  // --- 3. the read answer must follow from the count -------------------
  const pct = shipped.beatsPct;
  const expected = pct < 20 ? "ahead" : pct < 45 ? "mixed" : "behind";
  if (hand.read.correctId !== expected) {
    note(hand, "read", `answer "${hand.read.correctId}" but ${pct}% beat you implies "${expected}"`);
  }

  // --- 4. the prose must not contradict the count ----------------------
  const t = hand.title.toLowerCase();
  if (/you'?re ahead|^ahead/.test(t) && expected === "behind") note(hand, "copy", `title says ahead, ${pct}% beat you`);
  if (/^behind/.test(t) && expected === "ahead") note(hand, "copy", `title says behind, only ${pct}% beat you`);
  if (/coin flip/.test(t) && expected !== "mixed") note(hand, "copy", `title says coin flip, ${pct}% beat you`);
  if (hand.takeaway.includes(`${shipped.beats} of his ${shipped.total}`) === false
      && hand.takeaway.includes("%") === false) {
    note(hand, "copy", "takeaway carries neither the count nor a percentage");
  }

  // --- 5. the marked-correct action must be the best measured one ------
  const options = hand.action.options;
  const best = Math.max(...options.map((o) => o.ev));
  // Tolerance is a share of the POT, matching the curator. Scaling it by the
  // best EV breaks whenever that EV is negative - a spot where every line loses
  // money is still a spot, and `best * 0.2` goes negative and flags a near-tie.
  const potSize = Number(String(hand.pot).replace(/[^0-9.]/g, "")) || 0;
  const tolerance = Math.max(1, potSize * 0.05);
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
  const actsFirst = hand.heroPosition.includes("acts first");
  if (actsFirst && /^Opponent checks/.test(hand.decisionNow)) {
    note(hand, "story", "hero acts first, yet the opponent is described as having checked");
  }
  if (!actsFirst && /^You are first to act/.test(hand.decisionNow)) {
    note(hand, "story", "hero acts last, yet described as first to act");
  }
  const facing = /bets \$/.test(hand.decisionNow);
  const hasFold = options.some((o) => o.id === "fold");
  if (facing !== hasFold) {
    note(hand, "story", facing ? "facing a bet but cannot fold" : "not facing a bet but offered a fold");
  }
  if (!hand.history.some((s) => s.street.startsWith("River"))) {
    note(hand, "story", "timeline never reaches the river");
  }

  // --- 8. the count must say what it is counting -----------------------
  if (!hand.rangeBasis) note(hand, "copy", "no rangeBasis - the count would overclaim");
  const narrowed = hand.evidence.opponent === "modelled";
  if (hand.rangeNarrowed !== narrowed) {
    note(hand, "copy", `rangeNarrowed ${hand.rangeNarrowed} disagrees with evidence.opponent ${hand.evidence.opponent}`);
  }
  if (!narrowed && shipped.total !== possible) {
    note(hand, "count", `unnarrowed range is ${shipped.total} but ${possible} combos are dealable`);
  }
}

// ------------------------------------------------------------- uniqueness
const key = (hand) => `${hand.board.join("")}|${hand.hero.join("")}`;
const byKey = new Map();
for (const hand of hands) {
  const k = key(hand);
  byKey.set(k, [...(byKey.get(k) ?? []), hand.id]);
}
const dupes = [...byKey.entries()].filter(([, ids]) => ids.length > 1);

const shape = (hand) => `${hand.leak}|${hand.read.correctId}|${hand.action.correctIds.join(",")}|${hand.action.options.length}`;
const byShape = new Map();
for (const hand of hands) byShape.set(shape(hand), (byShape.get(shape(hand)) ?? 0) + 1);

const boards = new Set(hands.map((h) => h.board.join("")));
const heroes = new Set(hands.map((h) => h.hero.join("")));
const titles = new Map();
for (const hand of hands) titles.set(hand.title, (titles.get(hand.title) ?? 0) + 1);
const takeaways = new Set(hands.map((h) => h.takeaway));

// ------------------------------------------------------------------ report
console.log(`Audited ${hands.length} hands\n`);

console.log("VARIETY");
console.log(`  distinct boards        ${boards.size}/${hands.length}`);
console.log(`  distinct hole cards    ${heroes.size}/${hands.length}`);
console.log(`  distinct takeaways     ${takeaways.size}/${hands.length}`);
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
