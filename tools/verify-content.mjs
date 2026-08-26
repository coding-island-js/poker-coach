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
  if (!Array.isArray(hand.board) || hand.board.length !== 5) fail(id, "board must be five cards");
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
