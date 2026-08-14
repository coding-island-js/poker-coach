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

test("server-renders the coaching curriculum", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Range Coach/);
  assert.match(html, /How much coaching do you want/);
  assert.match(html, /Beginner-friendly/);
  assert.match(html, /Table practice/);
  assert.match(html, /Deep analysis/);
  assert.match(html, /Value: which weaker hands will call/);
  assert.match(html, /The four-question habit/);
  assert.doesNotMatch(html, /Choose a hand|Practice mode|scenario-tabs/);
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /react-loading-skeleton/);
});

test("uses progressive coaching levels and preserves poker correctness", async () => {
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
  assert.match(page, /How much coaching do you want/);
  assert.match(page, /Beginner-friendly/);
  assert.match(page, /Teach each step and correct the foundation/);
  assert.match(page, /Let me reason through the hand/);
  assert.match(page, /Show assumptions, alternatives, math/);
  assert.match(page, /guided: \[3, 0\]/);
  assert.match(page, /Complete hand history/);
  assert.match(page, /Read the full hand once/);
  assert.match(page, /CompactContext/);
  assert.match(page, /A weaker hand calls/);
  assert.match(page, /A better hand folds/);
  assert.match(page, /The call price is worth it/);
  assert.match(page, /Avoid building a bigger pot/);
  assert.match(page, /Concept analysis only\. No solver-backed mix/);
  assert.match(page, /Uncapped.*strongest hands still fit the line/s);
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
  assert.match(css, /support-options/);
  assert.match(css, /compact-context/);
  assert.match(css, /analysis-grid/);
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
