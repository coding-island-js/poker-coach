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
  assert.match(html, /Opponent · Villain/);
  assert.match(html, /A capped range has lost most of its strongest hands/);
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

  assert.match(page, /What is most of Villain/);
  assert.match(page, /You are not checking every hand that might be possible/);
  assert.match(page, /How does.*perform against that range/s);
  assert.match(page, /What are you trying to accomplish/);
  assert.match(page, /The decision in one chain/);
  assert.match(page, /You built the decision correctly/);
  assert.match(page, /What is the bluff trying to fold/);
  assert.match(page, /Overbet \$150/);
  assert.match(page, /needs about 62% folds/);
  assert.match(page, /Polarized.*describes the hands/s);
  assert.match(page, /Show assumptions and when the answer changes/);
  assert.match(page, /exact action awaits solver and expert review/i);
  assert.doesNotMatch(page, /checkbox-mark|Select every reasonable|2\/4 key groups|story holds together|classification response/i);
  assert.match(css, /mobile-context-strip/);
  assert.match(layout, /Range Coach/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  assert.deepEqual(await readdir(previewRoot), []);
  await assert.rejects(access(new URL("public/_sites-preview", templateRoot)));
});
