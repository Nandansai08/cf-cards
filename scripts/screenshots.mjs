/**
 * Regenerates the screenshots used in README.md.
 *
 *   npm run dev                      # in one terminal
 *   node scripts/screenshots.mjs     # in another
 *
 * The Codeforces API is stubbed with generated demo players rather than real
 * handles. That keeps the screenshots reproducible, keeps CI and this script
 * off Codeforces' rate limits, and — more importantly — avoids publishing a
 * card that attaches invented statistics to a real person. The app itself is
 * untouched: the real rating engine runs over the fixture data, so what you
 * see is genuinely what the code produces for that input.
 *
 * Set APP_URL if your dev server isn't on the default port.
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const APP_URL = process.env["APP_URL"] ?? "http://localhost:8080";
const OUT = "docs/screenshots";
// playwright-core ships no browsers (keeps `npm ci` small), so point it at one:
// CHROMIUM_PATH=/path/to/chromium, or fall back to a locally installed Chrome.
const CHROMIUM = process.env["CHROMIUM_PATH"];

/* ---------------------------------------------------------------- fixtures */

/** Deterministic PRNG so the same handle always produces the same demo card. */
function rng(seed) {
  let a = [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAGS = [
  ["implementation", "greedy"],
  ["dp", "math"],
  ["graphs", "dfs and similar"],
  ["data structures", "sortings"],
  ["binary search", "two pointers"],
  ["number theory", "math"],
  ["trees", "dp"],
  ["strings", "hashing"],
  ["combinatorics", "probabilities"],
  ["constructive algorithms", "greedy"],
  ["flows", "graphs"],
  ["geometry", "math"],
];

const DEMOS = {
  demo_solver: { peak: 2680, now: 2530, contests: 118, solved: 940, country: "Japan" },
  demo_grinder: { peak: 2180, now: 2140, contests: 210, solved: 1780, country: "India" },
  demo_riser: { peak: 1720, now: 1710, contests: 34, solved: 410, country: "Brazil" },
};

const RANKS = [
  [3000, "legendary grandmaster"],
  [2600, "international grandmaster"],
  [2400, "grandmaster"],
  [2300, "international master"],
  [2100, "master"],
  [1900, "candidate master"],
  [1600, "expert"],
  [1400, "specialist"],
  [1200, "pupil"],
  [0, "newbie"],
];
const rankFor = (r) => RANKS.find(([min]) => r >= min)[1];

const DAY = 86400;
const NOW = Math.floor(Date.UTC(2026, 8, 1) / 1000);

function buildPlayer(handle) {
  const spec = DEMOS[handle] ?? DEMOS.demo_solver;
  const rand = rng(handle);

  // A rating curve that climbs quickly, plateaus, and wobbles near the peak.
  const ratingHistory = [];
  let rating = 1400;
  const start = NOW - spec.contests * 11 * DAY;
  for (let i = 0; i < spec.contests; i++) {
    const progress = i / (spec.contests - 1);
    const target = 1400 + (spec.peak - 1400) * Math.min(1, progress * 1.35);
    const old = rating;
    rating = Math.round(target + (rand() - 0.5) * 90);
    if (i === spec.contests - 1) rating = spec.now;
    ratingHistory.push({
      contestId: 1700 + i,
      contestName:
        i % 4 === 0
          ? `Codeforces Round ${880 + i} (Div. 1)`
          : i % 3 === 0
            ? `Educational Codeforces Round ${150 + i}`
            : `Codeforces Round ${880 + i} (Div. 2)`,
      handle,
      rank: Math.max(1, Math.round(40 + rand() * 1800)),
      ratingUpdateTimeSeconds: start + i * 11 * DAY,
      oldRating: old,
      newRating: rating,
    });
  }

  // Solved problems spread across difficulty and tags.
  const submissions = [];
  for (let i = 0; i < spec.solved; i++) {
    const t = rand();
    // skewed towards the player's own level, with a tail of harder problems
    const difficulty = 800 + Math.round((Math.pow(t, 1.7) * (spec.peak + 500 - 800)) / 100) * 100;
    submissions.push({
      id: 100000 + i,
      creationTimeSeconds: start + Math.round(rand() * spec.contests * 11 * DAY),
      problem: {
        contestId: 1500 + (i % 400),
        index: "ABCDEF"[i % 6],
        name: `Problem ${i}`,
        rating: Math.min(3500, difficulty),
        tags: TAGS[Math.floor(rand() * TAGS.length)],
      },
      verdict: "OK",
      programmingLanguage: i % 5 === 0 ? "Python 3" : "GNU C++20 (64)",
    });
  }
  // some failed attempts, so the accepted/total ratio isn't a perfect 100%
  for (let i = 0; i < Math.round(spec.solved * 0.9); i++) {
    submissions.push({
      id: 900000 + i,
      creationTimeSeconds: start + Math.round(rand() * spec.contests * 11 * DAY),
      problem: {
        contestId: 1500 + (i % 400),
        index: "ABCDEF"[i % 6],
        name: `Problem ${i}`,
        rating: 1200,
        tags: TAGS[i % TAGS.length],
      },
      verdict: "WRONG_ANSWER",
      programmingLanguage: "GNU C++20 (64)",
    });
  }

  return {
    info: {
      handle,
      rating: spec.now,
      maxRating: spec.peak,
      rank: rankFor(spec.now),
      maxRank: rankFor(spec.peak),
      country: spec.country,
      // no titlePhoto: the card falls back to initials, so screenshots don't
      // depend on a third-party image that may be hotlink-blocked
    },
    ratingHistory,
    submissions,
  };
}

/** The landing page hardcodes real showcase handles; swap them for demos. */
const ALIAS = {
  tourist: "demo_solver",
  SecondThread: "demo_grinder",
  Geothermal: "demo_riser",
};
const resolve = (h) => ALIAS[h] ?? (DEMOS[h] ? h : "demo_solver");

/* ------------------------------------------------------------------ capture */

const ok = (body) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ status: "OK", result: body }),
});

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch(
    CHROMIUM ? { executablePath: CHROMIUM } : { channel: "chrome" },
  );
  // 1440 wide at 1x: GitHub renders README images around 850px, so this is
  // already sharp, and it keeps the files small enough to live in the repo.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });

  const stub = async (route) => {
    const url = new URL(route.request().url());
    const method = url.pathname.split("/").pop();
    const handles = (url.searchParams.get("handles") ?? "").split(";").filter(Boolean);
    const handle = url.searchParams.get("handle") ?? handles[0] ?? "demo_solver";

    if (method === "user.info") {
      return route.fulfill(ok(handles.map((h) => buildPlayer(resolve(h)).info)));
    }
    if (method === "user.rating") {
      return route.fulfill(ok(buildPlayer(resolve(handle)).ratingHistory));
    }
    if (method === "user.status") {
      return route.fulfill(ok(buildPlayer(resolve(handle)).submissions));
    }
    return route.fulfill(ok([]));
  };
  await context.route("**/codeforces.com/api/**", stub);

  const page = await context.newPage();
  const settle = async (ms = 2500) => {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(ms);
  };

  const shots = [
    ["home", "/", { fullPage: false }],
    ["player", "/player/demo_solver", { fullPage: false }],
    ["compare", "/compare?a=demo_solver&b=demo_grinder", { fullPage: false }],
  ];

  for (const [name, path, opts] of shots) {
    await page.goto(APP_URL + path, { waitUntil: "domcontentloaded" });
    await settle();
    await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
    console.log(`${OUT}/${name}.png`);
  }

  // Mobile card view — narrow, so 2x keeps it legible at README size
  const mobileContext = await browser.newContext({
    viewport: { width: 414, height: 860 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
  });
  await mobileContext.route("**/codeforces.com/api/**", stub);
  const mobile = await mobileContext.newPage();
  await mobile.goto(APP_URL + "/player/demo_riser", { waitUntil: "domcontentloaded" });
  await mobile.waitForLoadState("networkidle").catch(() => {});
  await mobile.waitForTimeout(2500);
  await mobile.screenshot({ path: `${OUT}/mobile.png` });
  console.log(`${OUT}/mobile.png`);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
