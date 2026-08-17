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

test("server-renders the V2 reasoning diagnostic home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Range Coach/);
  assert.match(html, /Find the first weak link/);
  assert.match(html, /Start diagnostic/);
  assert.match(html, /Your learner profile/);
  assert.match(html, /Transfer, not memorization/);
  assert.match(html, /Six common reasoning leaks/);
  assert.match(html, /Removes strong hands too quickly/);
  assert.match(html, /Treats a player read as fact/);
  assert.match(html, /Saved on this browser and device|Loading saved profile/);
  assert.doesNotMatch(html, /How much coaching do you want|Beginner-friendly|Practice mode|scenario-tabs/);
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /react-loading-skeleton/);
});

test("implements the traceable V2 diagnostic, transfer, and persistence model", async () => {
  const [css, page, data, layout, packageJson, requirements, traceability, uxQa] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/v2-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/v2-requirements.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/v2-traceability.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/v2-ux-qa.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type V2Attempt/);
  assert.match(page, /firstBroken/);
  assert.match(page, /confidence/);
  assert.match(page, /Test it in a changed hand/);
  assert.match(page, /scheduledRetestAt/);
  assert.match(page, /range-coach-v2-profile/);
  assert.match(page, /localStorage/);
  assert.match(page, /Saved on this browser and device/);
  assert.match(page, /Authored examples are not solver-verified/);
  assert.match(page, /Fix .* first/);
  assert.match(page, /Range, plan, and action support one another/);
  assert.match(page, /Complete hand history/);
  assert.match(page, /Retry from memory/);
  assert.match(page, /Your first choice is recorded\. Feedback comes after confidence/);
  assert.match(page, /A fresh retest is scheduled for 7 days/);
  assert.match(data, /export const v2Hands/);
  assert.equal((data.match(/kind: "base", leak:/g) ?? []).length, 12);
  assert.equal((data.match(/kind: "twin", baseId:/g) ?? []).length, 12);
  for (const leak of ["removes-strength", "weaker-callers", "bluffs-showdown", "plan-action", "call-price", "read-as-fact"]) assert.match(data, new RegExp(`leak: "${leak}"`));
  assert.match(data, /Authored teaching example · external expert and solver review pending/);
  assert.match(data, /Uncapped means the strongest hands remain possible—not that the opponent is ahead overall/);
  assert.match(data, /The same cards can call one size and fold to another/);
  assert.match(data, /A read changes frequencies\. It does not prove a hand or an action/);
  assert.match(css, /V2 diagnostic coach/);
  assert.match(css, /v2-dashboard/);
  assert.match(css, /v2-context/);
  assert.match(css, /v2-history/);
  assert.match(css, /playing-card/);
  assert.match(css, /v2-chain/);
  assert.match(css, /confidence-choices/);
  assert.match(css, /v2-buckets/);
  assert.match(css, /--accent: #176b5b/);
  assert.match(requirements, /FR-001/);
  assert.match(requirements, /AC-022/);
  assert.match(traceability, /TEST-024/);
  assert.match(uxQa, /phone/i);
  assert.match(layout, /Range Coach/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  assert.deepEqual(await readdir(previewRoot), []);
  await assert.rejects(access(new URL("public/_sites-preview", templateRoot)));
});
