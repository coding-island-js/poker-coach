import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);
const previewRoot = new URL("../app/_sites-preview/", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the skill-first training home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Range Coach/);
  assert.match(html, /Build one poker habit until it works at table speed/);
  assert.match(html, /Start training/);
  assert.match(html, /Coach me/);
  assert.match(html, /Table speed/);
  assert.match(html, /Value betting/);
  assert.match(html, /Bluff or check/);
  assert.match(html, /Calling a small bet/);
  assert.match(html, /Strong hands remain/);
  assert.doesNotMatch(html, /How much coaching do you want|Beginner-friendly|Choose a hand|Practice mode|scenario-tabs/);
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /react-loading-skeleton/);
});

test("uses one range-plan-action loop and preserves poker correctness", async () => {
  const [css, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /What type of hand do they have most often/);
  assert.match(page, /Choose the biggest group/);
  assert.match(page, /If both players show their cards now, what can your ace-five beat/);
  assert.match(page, /If you bet, which better hands are you trying to make fold/);
  assert.match(page, /A weaker hand calls = value\. A better hand folds = bluff/);
  assert.match(page, /In four similar river spots, this opponent folded three times to a large bet/);
  assert.match(page, /Why a large bluff may look believable/);
  assert.match(page, /Your plan makes sense\. The exact size is uncertain/);
  assert.match(page, /Defensible alternative/);
  assert.match(page, /First place to fix/);
  assert.match(page, /The checks alone do not tell you how often strong hands remain/);
  assert.match(page, /Hand history: the opponent called the flop/);
  assert.match(page, /Bet \$150/);
  assert.match(page, /a \$100 bluff into \$92 needs about 52% folds/);
  assert.match(page, /More detail about this hand/);
  assert.match(page, /When the play changes/);
  assert.match(page, /Paired river decision/);
  assert.match(page, /Fewer clues are provided\. Apply the same four questions/);
  assert.match(page, /inline-feedback/);
  assert.match(page, /Train the decision, not the vocabulary/);
  assert.match(page, /Read the opponent&apos;s likely hands/);
  assert.match(page, /What does the opponent have most often/);
  assert.match(page, /Against those hands, what are you trying to accomplish/);
  assert.match(page, /Which action and size does that job/);
  assert.match(page, /Feedback after each choice/);
  assert.match(page, /Three decisions, then review/);
  assert.match(page, /Complete hand history/);
  assert.match(page, /range-bucket-strip/);
  assert.match(page, /Your reasoning works/);
  assert.match(page, /thinking links need work/);
  assert.match(page, /Your action does not perform the job in your plan/);
  assert.match(page, /Good read/);
  assert.match(page, /Reasonable option/);
  assert.match(page, /Needs change/);
  assert.match(page, /Remember this/);
  assert.match(page, /See the coach&apos;s reasoning/);
  assert.match(page, /What to strengthen next/);
  assert.match(page, /Uncapped means strong hands remain—not that the opponent is ahead/);
  assert.match(page, /Check answer/);
  assert.match(page, /Retry from memory/);
  assert.match(page, /disabled=\{rangeChecked\}/);
  assert.match(page, /rangeFeedbackTitle/);
  assert.match(page, /Q♣", "J♣/);
  assert.match(page, /Pot now: 10\.2 BB/);
  assert.match(page, /pot: "\$450"/);
  assert.match(page, /You act first on the turn/);
  assert.match(page, /Uncapped does not mean the opponent is ahead overall/);
  assert.match(page, /Hand \{handNumber\} of \{handCount\}/);
  assert.doesNotMatch(page, /shortTitle: "A river bluff target"|shortTitle: "The false cap"|shortTitle: "Transfer: river value"/);
  assert.match(page, /exact action awaits solver and expert review/i);
  assert.doesNotMatch(page, /credibilityOptions|correctSteps|resultSummary|label: "Overbet|Could you overbet bigger|The decision in one chain|checkbox-mark|Select every reasonable|2\/4 key groups|story holds together|classification response/i);
  assert.match(css, /resume-training/);
  assert.match(css, /pace-control/);
  assert.match(css, /training-history/);
  assert.match(css, /decision-focus/);
  assert.match(css, /playing-card/);
  assert.match(css, /line-so-far/);
  assert.match(css, /history-actions/);
  assert.match(css, /training-choices/);
  assert.match(css, /result-chain/);
  assert.match(css, /result-verdict/);
  assert.match(css, /result-link/);
  assert.match(css, /coach-reasoning/);
  assert.match(css, /--accent: #176b5b/);
  assert.match(css, /street-timeline/);
  assert.match(css, /coach-mini-context/);
  assert.match(css, /inline-feedback/);
  assert.match(css, /answer-review-list/);
  assert.match(layout, /Range Coach/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  assert.deepEqual(await readdir(previewRoot), []);
  await assert.rejects(access(new URL("public/_sites-preview", templateRoot)));
});
