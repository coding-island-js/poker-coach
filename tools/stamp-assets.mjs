// Stamps a content hash onto the app's CSS and JS links in index.html.
//
// Netlify serves /app.js and /style.css with its own 4-hour cache and ignores a
// Cache-Control header set for them, so a deploy would otherwise leave people on
// a stale app. index.html itself is always revalidated, so versioning the links
// from there is what actually makes a deploy take effect.
//
// Idempotent: re-running replaces the existing ?v= rather than appending.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../public/", import.meta.url);
// Both shells: the landing page at / and the trainer at /play.
const SHELLS = ["index.html", "play.html"];

const hashOf = async (name) => {
  const body = await readFile(new URL(name, root));
  return createHash("sha256").update(body).digest("hex").slice(0, 10);
};

const [cssHash, jsHash] = await Promise.all([hashOf("style.css"), hashOf("app.js")]);
for (const shell of SHELLS) {
  const path = new URL(shell, root);
  let html = await readFile(path, "utf8");
  const before = html;

  html = html.replace(/href="style\.css(?:\?v=[a-f0-9]+)?"/, `href="style.css?v=${cssHash}"`);
  html = html.replace(/src="app\.js(?:\?v=[a-f0-9]+)?"/, `src="app.js?v=${jsHash}"`);

  if (!html.includes(`style.css?v=${cssHash}`)) {
    console.error(`Could not stamp ${shell} - the stylesheet link did not match the expected shape.`);
    process.exit(1);
  }
  if (html !== before) await writeFile(path, html);
}
console.log(`Stamped assets: style.css?v=${cssHash} app.js?v=${jsHash}`);
