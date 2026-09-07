/**
 * Turns the SPA build in dist/client into a GitHub Pages site.
 *
 * TanStack Start's SPA mode emits a single prerendered shell (_shell.html).
 * Pages needs that shell as index.html, and again as 404.html so that deep
 * links like /cf-cards/player/tourist reach the client router instead of
 * GitHub's own 404 page. .nojekyll matters too: Jekyll strips paths beginning
 * with an underscore, which would eat the entire assets directory.
 */
import { cp, readFile, writeFile, rm, access } from "node:fs/promises";
import { join } from "node:path";

const clientDir = "dist/client";
const outDir = "dist/pages";
const shell = join(clientDir, "_shell.html");

try {
  await access(shell);
} catch {
  console.error(`Missing ${shell}. Run the build first.`);
  process.exit(1);
}

await rm(outDir, { recursive: true, force: true });
await cp(clientDir, outDir, { recursive: true });

const html = await readFile(shell, "utf8");
await writeFile(join(outDir, "index.html"), html);
await writeFile(join(outDir, "404.html"), html);
await writeFile(join(outDir, ".nojekyll"), "");
await rm(join(outDir, "_shell.html"), { force: true });

console.log(`Pages site ready in ${outDir}/ (index.html, 404.html, .nojekyll)`);
