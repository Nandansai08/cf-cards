import { expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Deterministic stand-in for the Codeforces API.
 *
 * Tests must never hit codeforces.com: it would make them slow, flaky and
 * dependent on live data, and it would put load on a public API we don't own.
 * Every demo player here is generated from a seeded PRNG, so the same handle
 * always produces the same card and assertions can be exact.
 *
 * The app under test is not modified — the real rating engine runs over this
 * data, so a card rendered from it is genuinely what the code produces.
 */

/** Seeded PRNG (mulberry32) so a handle always yields the same player. */
function rng(seed: string): () => number {
  let a = [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAGS: string[][] = [
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

interface Spec {
  peak: number;
  now: number;
  contests: number;
  solved: number;
  country: string;
  /** Empty means "no picture" — the card should fall back to initials. */
  titlePhoto?: string;
}

/** Demo players, chosen to land in different rarity tiers. */
export const DEMOS: Record<string, Spec> = {
  demo_solver: { peak: 2680, now: 2530, contests: 118, solved: 940, country: "Japan" },
  demo_grinder: { peak: 2180, now: 2140, contests: 210, solved: 1780, country: "India" },
  demo_riser: { peak: 1720, now: 1710, contests: 34, solved: 410, country: "Brazil" },
};

/** The landing page hardcodes real showcase handles; serve demos for them. */
const ALIAS: Record<string, string> = {
  tourist: "demo_solver",
  SecondThread: "demo_grinder",
  Geothermal: "demo_riser",
};

const resolveHandle = (handle: string): string =>
  ALIAS[handle] ?? (DEMOS[handle] ? handle : "demo_solver");

const RANKS: [number, string][] = [
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
const rankFor = (rating: number): string => RANKS.find(([min]) => rating >= min)?.[1] ?? "newbie";

const DAY = 86_400;
const NOW = Math.floor(Date.UTC(2026, 8, 1) / 1000);

export function buildPlayer(handle: string) {
  const spec = DEMOS[handle] ?? (DEMOS["demo_solver"] as Spec);
  const rand = rng(handle);
  const start = NOW - spec.contests * 11 * DAY;

  // A rating curve that climbs, plateaus, then wobbles near the peak.
  const ratingHistory = Array.from({ length: spec.contests }, (_, i) => {
    const progress = i / Math.max(1, spec.contests - 1);
    const target = 1400 + (spec.peak - 1400) * Math.min(1, progress * 1.35);
    const newRating = i === spec.contests - 1 ? spec.now : Math.round(target + (rand() - 0.5) * 90);
    return {
      contestId: 1700 + i,
      contestName:
        i % 4 === 0
          ? `Codeforces Round ${880 + i} (Div. 1)`
          : `Codeforces Round ${880 + i} (Div. 2)`,
      handle,
      rank: Math.max(1, Math.round(40 + rand() * 1800)),
      ratingUpdateTimeSeconds: start + i * 11 * DAY,
      oldRating: newRating - 15,
      newRating,
    };
  });

  const solved = Array.from({ length: spec.solved }, (_, i) => {
    const t = rand();
    const difficulty = 800 + Math.round((Math.pow(t, 1.7) * (spec.peak + 500 - 800)) / 100) * 100;
    return {
      id: 100_000 + i,
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
    };
  });

  // Some failures too, so the accepted/total ratio isn't an unrealistic 100%.
  const failed = Array.from({ length: Math.round(spec.solved * 0.9) }, (_, i) => ({
    id: 900_000 + i,
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
  }));

  return {
    info: {
      handle,
      rating: spec.now,
      maxRating: spec.peak,
      rank: rankFor(spec.now),
      maxRank: rankFor(spec.peak),
      country: spec.country,
      ...(spec.titlePhoto === undefined ? {} : { titlePhoto: spec.titlePhoto }),
    },
    ratingHistory,
    submissions: [...solved, ...failed],
  };
}

/**
 * Intercepts every Codeforces API call. Unknown handles fall back to a demo
 * player, so a test can use any name it likes.
 */
export async function stubCodeforces(target: BrowserContext | Page): Promise<void> {
  await target.route("**/codeforces.com/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = url.pathname.split("/").pop();
    const handles = (url.searchParams.get("handles") ?? "").split(";").filter(Boolean);
    const handle = url.searchParams.get("handle") ?? handles[0] ?? "demo_solver";

    const result =
      method === "user.info"
        ? handles.map((h) => buildPlayer(resolveHandle(h)).info)
        : method === "user.rating"
          ? buildPlayer(resolveHandle(handle)).ratingHistory
          : method === "user.status"
            ? buildPlayer(resolveHandle(handle)).submissions
            : [];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "OK", result }),
    });
  });
}

/**
 * Fills the handle box and submits.
 *
 * The page is server-rendered, so the input is visible and fillable before
 * React has hydrated — and hydration then resets the controlled input, leaving
 * the submit button disabled forever. Retrying the fill until the button goes
 * live is the reliable way to bridge that gap.
 */
export async function submitHandle(page: Page, handle: string, cta: RegExp): Promise<void> {
  const input = page.getByPlaceholder("Enter a Codeforces handle…");
  const submit = page.getByRole("button", { name: cta });

  await expect(async () => {
    await input.fill(handle);
    await expect(submit).toBeEnabled({ timeout: 500 });
  }).toPass({ timeout: 30_000 });

  await submit.click();
}
