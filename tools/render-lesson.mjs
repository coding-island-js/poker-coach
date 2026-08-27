// Renders a lesson as the plain text a learner actually sees on screen.
//
// Used to hand hands to reviewers who know nothing about how any of this was
// built. That naivety is the point: every copy bug found so far was invisible
// to whoever wrote the copy and obvious to someone reading it cold, because the
// writer fills the gaps automatically and a reader cannot.
//
//   node tools/render-lesson.mjs --ids h001,h014 [--all] [--wrong]
import { readFile } from "node:fs/promises";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const data = JSON.parse(await readFile(new URL("../public/hands.json", import.meta.url), "utf8"));

/** The screen for one decision, as a learner reads it. */
function renderLesson(lesson, { picked }) {
  const out = [];
  const push = (line = "") => out.push(line);

  push(`[ ${lesson.leakLabel} ]`);
  push(lesson.title);
  push();
  push(`${lesson.street} · pot ${lesson.pot} · ${lesson.effective}`);
  push(`Your cards: ${lesson.hero.join(" ")}    Board: ${lesson.board.join(" ")}`);
  push(lesson.opponents?.length > 1
    ? `You're in the ${lesson.heroPosition.toLowerCase()}, against the ${lesson.opponents.map((o) => o.position.toLowerCase()).join(" and the ")}.`
    : `You're in the ${lesson.heroPosition.toLowerCase()}, he's in the ${(lesson.opponentPosition ?? "").toLowerCase()}.`);
  push(lesson.decisionNow);
  push();
  push("How the hand played:");
  for (const street of lesson.history) push(`  ${street.street}: ${street.actions.join(" ")}`);
  push();

  push("QUESTION 1 of 2");
  push(lesson.read.prompt);
  for (const option of lesson.read.options) push(`  ( ) ${option.label}`);
  push();
  push("-- after answering --");
  push(lesson.countSentence);
  for (const opponent of lesson.opponents ?? []) {
    if (!opponent.breakdown?.length) continue;
    push(lesson.opponents.length > 1
      ? `What the ${opponent.position.toLowerCase()} can have:`
      : "What he can actually have:");
    for (const row of opponent.breakdown) {
      const verdict = row.beatsHero === 0 ? "you beat"
        : row.beatsHero === row.combos ? "all beat you"
        : `${row.beatsHero} beat you`;
      push(`   ${row.label.padEnd(20)} ${String(row.combos).padStart(5)}   ${verdict}`);
    }
  }
  push(`  (explanation: ${lesson.read.why[lesson.read.correctId]})`);
  push();

  push("QUESTION 2 of 2");
  for (const opponent of lesson.opponents ?? []) {
    push(`Assume ${lesson.opponents.length > 1 ? `the ${opponent.position.toLowerCase()} ` : ""}${opponent.note}`);
  }
  push(lesson.action.prompt);
  for (const option of lesson.action.options) push(`  ( ) ${option.label} — to ${option.purpose}`);
  push();

  const chosen = picked ?? lesson.action.options.find((o) => !lesson.action.correctIds.includes(o.id))?.id
    ?? lesson.action.options[0].id;
  const chosenLabel = lesson.action.options.find((o) => o.id === chosen)?.label ?? chosen;
  const right = lesson.action.correctIds.includes(chosen);
  const best = lesson.action.options[0];

  push(`-- you picked "${chosenLabel}" --`);
  push(right ? "✓ That line holds up" : `✕ ${best.label} does better here`);
  for (const fact of lesson.facts ?? []) {
    push(`   ${fact.label.padEnd(24)} ${fact.value.padStart(6)}   ${fact.note ?? ""}`.trimEnd());
  }
  push(lesson.action.why[chosen]);
  push();
  push(`Measured over ${lesson.numbers.rollouts} play-outs:`);
  for (const option of lesson.action.options) {
    push(`   ${option.label.padEnd(22)} ${option.ev < 0 ? "−" : "+"}$${Math.abs(option.ev).toFixed(0)}`);
  }
  push();
  push(`TAKE THIS TO THE TABLE: ${lesson.takeaway}`);
  return out.join("\n");
}

function renderHand(hand) {
  const blocks = [`=========== HAND ${hand.id} ===========`, renderLesson(hand, {})];
  if (hand.chain) {
    const wrong = hand.action.options.find((o) => !hand.action.correctIds.includes(o.id));
    const branch = hand.chain.branches?.[wrong?.id];
    if (branch?.kind === "question") {
      blocks.push("", `--- the hand carries on, because you picked "${wrong.label}" ---`);
      blocks.push(branch.reply);
      blocks.push("This is one way the hand ran out. The numbers above came from 250 of them.");
      blocks.push("", renderLesson(branch.lesson, {}));
    } else if (branch) {
      blocks.push("", `--- you picked "${wrong.label}": ${branch.outcome} ---`);
    }
  }
  return blocks.join("\n");
}

const ids = arg("ids", "").split(",").map((s) => s.trim()).filter(Boolean);
const chosen = has("all") ? data.hands : data.hands.filter((hand) => ids.includes(hand.id));
for (const hand of chosen) console.log(`${renderHand(hand)}\n`);
