/**
 * Serves dist/pages the way GitHub Pages does, for previewing a production
 * build locally and for the end-to-end tests to run against.
 *
 *   npm run build:pages && npm run preview
 *
 * The important detail is the fallback: unknown paths return 404.html, which
 * holds the app shell, so a deep link like /player/tourist reaches the client
 * router instead of a dead end — exactly the behaviour Pages gives us.
 *
 * (`vite preview` can't serve this build: it looks for a server bundle that the
 * static build deliberately doesn't produce.)
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = "dist/pages";
const port = Number(process.env["PORT"] ?? processArg("--port") ?? 4173);
const host = process.env["HOST"] ?? "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function processArg(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function resolve(pathname) {
  // normalize() collapses any ../ so a request can't escape ROOT.
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(ROOT, rel);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    await stat(file);
    return { file, status: 200 };
  } catch {
    return { file: join(ROOT, "404.html"), status: 404 };
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", `http://${host}`);
  const { file, status } = await resolve(pathname);
  try {
    const body = await readFile(file);
    res.writeHead(status, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(500).end("Build not found — run `npm run build:pages` first.");
  }
}).listen(port, host, () => {
  console.log(`Serving ${ROOT} at http://${host}:${port}/`);
});
