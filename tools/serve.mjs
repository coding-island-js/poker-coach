// Minimal static server for local checking. No dependencies.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = new URL("../public/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PORT = Number.parseInt(process.env.PORT ?? "5173", 10);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  // Strip any traversal before touching the filesystem.
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\.]+)/, "");
  const target = join(ROOT, relative || "index.html");
  try {
    const body = await readFile(target);
    response.writeHead(200, { "content-type": TYPES[extname(target)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    try {
      const fallback = await readFile(join(ROOT, "index.html"));
      response.writeHead(200, { "content-type": TYPES[".html"] });
      response.end(fallback);
    } catch {
      response.writeHead(404).end("Not found");
    }
  }
}).listen(PORT, () => console.log(`serving public/ on http://localhost:${PORT}`));
