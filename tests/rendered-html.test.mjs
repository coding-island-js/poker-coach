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

test("server-renders the complete Range Coach workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Range Coach/);
  assert.match(html, /Practice mode/);
  assert.match(html, /Learn/);
  assert.match(html, /Quick decision/);
  assert.match(html, /Guided hand/);
  assert.match(html, /You · Hero/);
  assert.match(html, /Complete hand history/);
  assert.match(html, /Opponent/);
  assert.match(html, /Use the betting history to decide what your bet must accomplish/);
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /react-loading-skeleton/);
});

test("keeps coaching language explicit and removes the disposable preview", async () => {
  const [css, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /After the complete action, what does the opponent hold most often/);
  assert.match(page, /Choose the center of the range/);
  assert.match(page, /If you check, what does A♣ 5♣ beat/);
  assert.match(page, /What should your next action accomplish/);
  assert.match(page, /What strong hands could you credibly have after taking this line/);
  assert.match(page, /Build the pot/);
  assert.match(page, /charge draws/i);
  assert.match(page, /Small sample: this opponent folded to 3 of 4 comparable river bets/);
  assert.match(page, /Use this small sample as evidence, not certainty/);
  assert.match(page, /Good read\. Your.*is plausible, not proven/s);
  assert.match(page, /Defensible alternative/);
  assert.match(page, /First place to fix/);
  assert.match(page, /checks alone do not prove a cap/i);
  assert.match(page, /Hand history: the opponent called the flop/);
  assert.match(page, /Overbet \$150/);
  assert.match(page, /\$150 must work about 62% of the time/);
  assert.match(page, /Why this answer/);
  assert.match(page, /When the play changes/);
  assert.match(page, /exact action awaits solver and expert review/i);
  assert.doesNotMatch(page, /Could you overbet bigger|The decision in one chain|checkbox-mark|Select every reasonable|2\/4 key groups|story holds together|classification response/i);
  assert.match(css, /mobile-context-strip/);
  assert.match(css, /street-timeline/);
  assert.match(css, /range-buckets/);
  assert.match(css, /answer-review-list/);
  assert.match(layout, /Range Coach/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  assert.deepEqual(await readdir(previewRoot), []);
  await assert.rejects(access(new URL("public/_sites-preview", templateRoot)));
});
