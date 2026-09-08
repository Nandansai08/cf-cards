/**
 * Turns the SPA build in dist/client into a GitHub Pages site.
 *
 * TanStack Start's SPA mode emits a single prerendered shell (_shell.html).
 * Pages needs that shell as index.html, and again as 404.html so that deep
 * links like /cf-cards/player/tourist reach the client router instead of
 * GitHub's own 404 page. .nojekyll matters too: Jekyll strips paths beginning
 * with an underscore, which would eat the entire assets directory.
 *
 * It also writes a real directory index for every static route. Pages serves
 * 404.html with an HTTP 404 status, and a search engine will not index a page
 * that answers 404 — so without these, only the home page was indexable.
 */
import { cp, mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import { join } from "node:path";

const clientDir = "dist/client";
const outDir = "dist/pages";
const shell = join(clientDir, "_shell.html");

/** Static routes. /player/$handle is dynamic and stays on the 404 fallback. */
const ROUTES = ["generate", "leaderboard", "compare", "pack", "squad", "about"];

/** Absolute URL the site is served from, base path included. */
const site = (process.env["SITE_URL"] ?? "https://nandansai08.github.io/cf-cards").replace(
  /\/+$/,
  "",
);

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

for (const route of ROUTES) {
  await mkdir(join(outDir, route), { recursive: true });
  await writeFile(join(outDir, route, "index.html"), html);
}

// Written here rather than kept in public/, so it always points at wherever
// the site is actually deployed. (On a github.io project site crawlers ignore
// it anyway — robots.txt is only read at the domain root — but it is correct
// the moment the site moves to a custom domain or the owner's user site.)
await writeFile(
  join(outDir, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`,
);

// AdSense reads ads.txt from the site root to confirm who may sell the ad
// space. Written only when a publisher is configured, so a fork never claims
// someone else's inventory.
const adsense = (process.env["ADSENSE_CLIENT"] ?? "").trim().replace(/^ca-/, "");
if (adsense) {
  await writeFile(join(outDir, "ads.txt"), `google.com, ${adsense}, DIRECT, f08c47fec0942fa0\n`);
}

const today = new Date().toISOString().slice(0, 10);
const urls = ["", ...ROUTES]
  .map(
    (route) =>
      `  <url>\n    <loc>${site}/${route}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
  )
  .join("\n");
await writeFile(
  join(outDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

console.log(
  `Pages site ready in ${outDir}/ (index.html, 404.html, .nojekyll, robots.txt, sitemap.xml, ${ROUTES.length} route pages)`,
);
