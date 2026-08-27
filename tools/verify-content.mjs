// Content gate. Runs on every build, and fails the build rather than shipping
// a lesson set that would teach something wrong or unanswerable.
//
// The original app had a gate like this and it was the right instinct: content
// is the product here, so a malformed hand is a broken release.
import { readFile } from "node:fs/promises";

const PATH = new URL("../public/hands.json", import.meta.url);
const LEAKS = new Set(["missed-value", "missed-bluff", "bet-no-caller", "bet-away-showdown", "wrong-size", "wrong-price"]);

const problems = [];
const fail = (id, message) => problems.push(`${id}: ${message}`);

const data = JSON.parse(await readFile(PATH, "utf8"));
const hands = data.hands ?? [];

if (hands.length < 20) fail("catalogue", `only ${hands.length} hands; expected at least 20`);
if (!data.leakLabels) fail("catalogue", "leakLabels missing");

const ids = new Set();
for (const hand of hands) {
  const id = hand.id ?? "(no id)";
  if (ids.has(id)) fail(id, "duplicate id");
  ids.add(id);

  if (!LEAKS.has(hand.leak)) fail(id, `unknown leak "${hand.leak}"`);
  if (!hand.title || !hand.takeaway) fail(id, "missing title or takeaway");
  if (!Array.isArray(hand.hero) || hand.hero.length !== 2) fail(id, "hero must be two cards");
  // Board length is set by the street: three on the flop, four on the turn,
  // five on the river. A single hardcoded five was left over from when every
  // spot was a river.
  const expectedBoard = { Flop: 3, Turn: 4, River: 5 }[hand.street];
  if (!expectedBoard) fail(id, `unknown street "${hand.street}"`);
  if (!Array.isArray(hand.board) || (expectedBoard && hand.board.length !== expectedBoard)) {
    fail(id, `${hand.street} needs ${expectedBoard} board cards, has ${hand.board?.length}`);
  }
  if (!hand.heroPosition || !hand.opponentPosition) fail(id, "both seats must be named");
  if (hand.breakdown && hand.breakdown.reduce((sum, row) => sum + row.combos, 0) !== hand.numbers.total) {
    fail(id, "range breakdown does not add up to the counted range");
  }
  if (!hand.history?.length) fail(id, "no hand history");

  // Every question must be answerable and have exactly one defensible target.
  const read = hand.read ?? {};
  if (!read.prompt || !read.options?.length) fail(id, "read question incomplete");
  if (!read.options?.some((option) => option.id === read.correctId)) fail(id, "read correctId not among options");

  const action = hand.action ?? {};
  if (!action.prompt || !action.options?.length) fail(id, "action question incomplete");
  if (!action.correctIds?.length) fail(id, "action has no correct answer");
  for (const correctId of action.correctIds ?? []) {
    if (!action.options.some((option) => option.id === correctId)) fail(id, `action correctId "${correctId}" not among options`);
  }
  // If every option is correct the question teaches nothing.
  if (action.correctIds?.length === action.options?.length) fail(id, "every action marked correct");
  for (const option of action.options ?? []) {
    if (!action.why?.[option.id]) fail(id, `no feedback line for option "${option.id}"`);
    if (!option.purpose) fail(id, `option "${option.id}" has no stated purpose`);
    // "Call $$17" shipped in all 100 hands: the label already carried a dollar
    // sign and the curator added another.
    if (/\$\$/.test(option.label ?? "")) fail(id, `option "${option.id}" label has a doubled dollar sign: ${option.label}`);
    // The whole point of the feedback line is to say WHY. A line with no number
    // in it is not counting anything, and a very short one is quoting the money
    // rather than naming the mechanism.
    const why = action.why?.[option.id] ?? "";
    if (why && !/\d/.test(why)) fail(id, `feedback for "${option.id}" cites no number`);
    // Short SENTENCES are the goal; a short whole line means no mechanism named.
    if (why && why.length < 55) fail(id, `feedback for "${option.id}" is too thin to be a reason: "${why}"`);
    // A template that fell through to its placeholder.
    if (/that much|undefined|NaN|\$null/.test(why)) fail(id, `feedback for "${option.id}" has an unfilled placeholder: "${why}"`);
    // "$-22": a negative number formatted as if it were positive.
    if (/\$-/.test(why)) fail(id, `feedback for "${option.id}" has a malformed negative amount: "${why}"`);
  }

  // Rank names built by stripping letters off the plural: aces -> "Ac",
  // nines -> "Nin", fives -> "Fiv", threes -> "Thre".
  for (const [field, text] of [["title", hand.title], ["takeaway", hand.takeaway]]) {
    if (/\b(Ac|Nin|Fiv|Thre)\b/.test(text ?? "")) fail(id, `${field} has a mangled rank name: "${text}"`);
  }

  // The coaching must not contradict the answer it is printed beside. A hand
  // shipped whose takeaway read "you beat 86% of what he can hold" directly
  // above a verdict of "fold does better here".
  const mustFold = action.correctIds?.length === 1 && action.correctIds[0] === "fold";
  if (mustFold && read.correctId === "ahead") {
    fail(id, "folding is the only right answer, but the read says you are ahead");
  }

  // Numbers must be internally consistent - this is the claim the app makes.
  const n = hand.numbers ?? {};
  if (!Number.isFinite(n.total) || n.total <= 0) fail(id, "no counted range");
  if (n.beats + n.ties > n.total) fail(id, "beats + ties exceeds range size");
  if (!Number.isFinite(n.rollouts) || n.rollouts < 50) fail(id, `only ${n.rollouts} rollouts behind the EV`);

  // Honesty labels must be present and must not overclaim.
  if (hand.evidence?.counting !== "exact") fail(id, "counting must be labelled exact");
  if (!["modelled", "heuristic"].includes(hand.evidence?.opponent)) fail(id, "opponent evidence mislabelled");
  if (hand.evidence?.coaching !== "authored") fail(id, "coaching must be labelled authored");
}

const spread = {};
for (const hand of hands) spread[hand.leak] = (spread[hand.leak] ?? 0) + 1;

if (problems.length) {
  console.error(`Content gate FAILED - ${problems.length} problem(s):`);
  for (const problem of problems.slice(0, 40)) console.error(`  · ${problem}`);
  process.exit(1);
}

console.log(`Content gate passed: ${hands.length} hands, ${Object.keys(spread).length} leaks covered.`);
console.log(`  spread: ${Object.entries(spread).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
