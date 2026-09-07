/**
 * Deterministic Codeforces FUT rating engine.
 *
 * Every number produced here is a pure function of the public Codeforces data
 * for a handle. No randomness, no fabricated statistics.
 */
import type { CFPlayerData, CFRatingChange } from "./codeforces";

export type AttrKey = "PAC" | "SHO" | "PAS" | "DRI" | "DEF" | "PHY";

export const ATTR_META: Record<AttrKey, { label: string; long: string; how: string }> = {
  PAC: {
    label: "PAC",
    long: "Pace — improvement speed",
    how: "Rating gained over the last 12 months plus average gain per recent contest.",
  },
  SHO: {
    label: "SHO",
    long: "Shooting — high-rated problem solving",
    how: "Average difficulty of your 10 hardest solved problems, plus volume of solves rated 1900+.",
  },
  PAS: {
    label: "PAS",
    long: "Passing — contest performance",
    how: "Your current Codeforces rating (70%) blended with the share of contests where you did not lose rating (30%).",
  },
  DRI: {
    label: "Dribbling — versatility",
    long: "Dribbling — versatility",
    how: "Distinct problem tags solved, spread across difficulty buckets, and total solved volume.",
  },
  DEF: {
    label: "DEF",
    long: "Defending — hard problems",
    how: "Your hardest solved problem plus how many problems rated 2200+ you have solved.",
  },
  PHY: {
    label: "PHY",
    long: "Physical — endurance & consistency",
    how: "Contests played, total problems solved and how many distinct months you have been active.",
  },
};

export const ATTR_WEIGHTS: Record<AttrKey, number> = {
  PAS: 0.3,
  SHO: 0.22,
  DEF: 0.15,
  DRI: 0.13,
  PHY: 0.12,
  PAC: 0.08,
};

export type Attributes = Record<AttrKey, number>;

export type Tier = "bronze" | "silver" | "gold" | "rare-gold" | "epic" | "icon" | "legendary";

export const TIER_META: Record<Tier, { label: string; min: number }> = {
  bronze: { label: "Bronze", min: 0 },
  silver: { label: "Silver", min: 55 },
  gold: { label: "Gold", min: 65 },
  "rare-gold": { label: "Rare Gold", min: 74 },
  epic: { label: "Epic", min: 80 },
  icon: { label: "Icon", min: 86 },
  legendary: { label: "Legendary", min: 91 },
};

export type Position =
  "CP" | "GRINDER" | "SPECIALIST" | "CONTENDER" | "RISING STAR" | "PROBLEM SOLVER";

export interface Stats {
  currentRating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  contests: number;
  solved: number;
  ratedSolved: number;
  avgSolvedRating: number;
  hardestSolved: number;
  top10Avg: number;
  distinctTags: number;
  solved1900: number;
  solved2200: number;
  submissions: number;
  accepted: number;
  activeMonths: number;
  acceptanceRate: number;
  gain12m: number;
  positiveShare: number;
  topTags: { tag: string; count: number }[];
  bestRank: number | null;
}

export interface FormEntry {
  contestId: number;
  name: string;
  rank: number;
  delta: number;
  newRating: number;
  date: string;
}

export interface Badge {
  label: string;
  reason: string;
}

export interface Achievement {
  label: string;
  detail: string;
  unlocked: boolean;
}

export interface EvolutionPoint {
  year: number;
  ovr: number;
  rating: number;
  solved: number;
}

export interface PlayerProfile {
  handle: string;
  data: CFPlayerData;
  attrs: Attributes;
  ovr: number;
  potential: number;
  tier: Tier;
  position: Position;
  stats: Stats;
  form: FormEntry[];
  history: { date: string; rating: number; t: number }[];
  badges: Badge[];
  achievements: Achievement[];
  evolution: EvolutionPoint[];
  strengths: string[];
  weaknesses: string[];
}

/* ---------------- math helpers ---------------- */

const clamp = (v: number, lo = 1, hi = 99) => Math.max(lo, Math.min(hi, Math.round(v)));

/** Normalized log scale: 0 at x=0, 1 at x=cap. Prevents huge counts from dominating. */
function logNorm(x: number, cap: number): number {
  if (x <= 0) return 0;
  return Math.min(1, Math.log1p(x) / Math.log1p(cap));
}

const RATING_CURVE: [number, number][] = [
  [0, 10],
  [800, 28],
  [1000, 36],
  [1200, 45],
  [1400, 54],
  [1600, 63],
  [1800, 70],
  [1900, 74],
  [2100, 80],
  [2300, 86],
  [2400, 89],
  [2600, 92],
  [2900, 95],
  [3200, 97],
  [3600, 99],
];

/** Maps a Codeforces-style rating onto a 1-99 card scale (piecewise linear). */
export function ratingScore(rating: number): number {
  if (rating <= 0) return 10;
  for (let i = 1; i < RATING_CURVE.length; i++) {
    const [x1, y1] = RATING_CURVE[i]!;
    const [x0, y0] = RATING_CURVE[i - 1]!;
    if (rating <= x1) return y0 + ((rating - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 99;
}

/* ---------------- core computation ---------------- */

interface Core {
  attrs: Attributes;
  ovr: number;
  stats: Stats;
}

function computeCore(data: CFPlayerData, cutoffSec: number): Core {
  const history = data.ratingHistory.filter((r) => r.ratingUpdateTimeSeconds <= cutoffSec);
  const subs = data.submissions.filter((s) => s.creationTimeSeconds <= cutoffSec);

  const solvedMap = new Map<string, { rating: number; tags: string[] }>();
  const months = new Set<string>();
  let accepted = 0;
  for (const s of subs) {
    const d = new Date(s.creationTimeSeconds * 1000);
    months.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
    if (s.verdict !== "OK") continue;
    accepted++;
    const key = `${s.problem.contestId ?? "x"}-${s.problem.index ?? s.problem.name}`;
    if (!solvedMap.has(key)) {
      solvedMap.set(key, { rating: s.problem.rating ?? 0, tags: s.problem.tags ?? [] });
    }
  }

  const solvedList = [...solvedMap.values()];
  const rated = solvedList.filter((p) => p.rating > 0).map((p) => p.rating);
  rated.sort((a, b) => b - a);
  const tagCounts = new Map<string, number>();
  for (const p of solvedList) for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);

  const buckets = new Set(rated.map((r) => Math.floor(r / 200)));
  const top10 = rated.slice(0, 10);
  const top10Avg = top10.length ? top10.reduce((a, b) => a + b, 0) / top10.length : 0;
  const avgSolvedRating = rated.length
    ? Math.round(rated.reduce((a, b) => a + b, 0) / rated.length)
    : 0;
  const solved1900 = rated.filter((r) => r >= 1900).length;
  const solved2200 = rated.filter((r) => r >= 2200).length;

  const last = history.at(-1);
  const currentRating = last?.newRating ?? data.info.rating ?? 0;
  const maxRating = history.length
    ? Math.max(...history.map((h) => h.newRating), data.info.maxRating ?? 0)
    : (data.info.maxRating ?? 0);

  const yearAgo = cutoffSec - 365 * 24 * 3600;
  const recent = history.filter((h) => h.ratingUpdateTimeSeconds >= yearAgo);
  const gain12m = recent.reduce((a, h) => a + (h.newRating - h.oldRating), 0);
  const nonNegative = history.filter((h) => h.newRating >= h.oldRating).length;
  const positiveShare = history.length ? nonNegative / history.length : 0;

  const last10 = history.slice(-10);
  const perContest = last10.length
    ? last10.reduce((a, h) => a + (h.newRating - h.oldRating), 0) / last10.length
    : 0;

  const stats: Stats = {
    currentRating,
    maxRating,
    rank: data.info.rank ?? "unrated",
    maxRank: data.info.maxRank ?? data.info.rank ?? "unrated",
    contests: history.length,
    solved: solvedMap.size,
    ratedSolved: rated.length,
    avgSolvedRating,
    hardestSolved: rated[0] ?? 0,
    top10Avg: Math.round(top10Avg),
    distinctTags: tagCounts.size,
    solved1900,
    solved2200,
    submissions: subs.length,
    accepted,
    activeMonths: months.size,
    acceptanceRate: subs.length ? accepted / subs.length : 0,
    gain12m,
    positiveShare,
    topTags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    bestRank: history.length ? Math.min(...history.map((h) => h.rank)) : null,
  };

  // --- attributes ---
  const PAC = history.length
    ? clamp(42 + gain12m / 7 + perContest / 2.5 + 8 * logNorm(recent.length, 20))
    : clamp(20 + 20 * logNorm(stats.solved, 400));

  const SHO = clamp(0.85 * ratingScore(stats.top10Avg) + 16 * logNorm(solved1900, 120));

  const PAS = history.length
    ? clamp(
        0.72 * ratingScore(currentRating) + 30 * positiveShare + 4 * logNorm(history.length, 60),
      )
    : clamp(0.5 * ratingScore(stats.top10Avg));

  const DRI = clamp(
    44 * logNorm(stats.distinctTags, 30) +
      34 * logNorm(buckets.size, 16) +
      22 * logNorm(stats.solved, 1200),
  );

  const DEF = clamp(0.68 * ratingScore(stats.hardestSolved) + 32 * logNorm(solved2200, 70));

  const PHY = clamp(
    40 * logNorm(history.length, 80) +
      34 * logNorm(stats.solved, 1200) +
      26 * logNorm(stats.activeMonths, 40),
  );

  const attrs: Attributes = { PAC, SHO, PAS, DRI, DEF, PHY };
  const ovr = clamp(
    (Object.keys(attrs) as AttrKey[]).reduce((acc, k) => acc + attrs[k] * ATTR_WEIGHTS[k], 0),
  );

  return { attrs, ovr, stats };
}

/* ---------------- position / tier ---------------- */

const POSITION_BY_ATTR: Record<AttrKey, Position> = {
  PAC: "RISING STAR",
  SHO: "PROBLEM SOLVER",
  PAS: "CONTENDER",
  DRI: "CP",
  DEF: "SPECIALIST",
  PHY: "GRINDER",
};

function pickPosition(attrs: Attributes): Position {
  const keys = Object.keys(attrs) as AttrKey[];
  let best: AttrKey = "PAS";
  for (const k of keys) if (attrs[k] > attrs[best]) best = k;
  return POSITION_BY_ATTR[best];
}

export function tierFor(ovr: number): Tier {
  const order: Tier[] = ["legendary", "icon", "epic", "rare-gold", "gold", "silver", "bronze"];
  return order.find((t) => ovr >= TIER_META[t].min) ?? "bronze";
}

/* ---------------- badges & achievements ---------------- */

function buildBadges(attrs: Attributes, s: Stats): Badge[] {
  const out: Badge[] = [];
  if (attrs.SHO >= 78)
    out.push({
      label: "PROBLEM SOLVER",
      reason: `Top-10 solved average ${s.top10Avg}`,
    });
  if (attrs.PAC >= 72)
    out.push({
      label: "SPEED DEMON",
      reason: `${s.gain12m >= 0 ? "+" : ""}${s.gain12m} rating in 12 months`,
    });
  if (s.contests >= 40)
    out.push({ label: "CONTEST GRINDER", reason: `${s.contests} rated contests` });
  if (s.solved2200 >= 15)
    out.push({
      label: "HARD PROBLEM HUNTER",
      reason: `${s.solved2200} problems rated 2200+`,
    });
  if (attrs.PAC >= 68 && s.contests <= 40 && s.gain12m > 150)
    out.push({ label: "RISING STAR", reason: "Fast climb over a short career" });
  if (attrs.PAS >= 82)
    out.push({
      label: "CONTEST BEAST",
      reason: `Rating ${s.currentRating} with ${Math.round(s.positiveShare * 100)}% non-negative contests`,
    });
  if (s.topTags[0] && s.solved > 40 && s.topTags[0].count / Math.max(1, s.solved) > 0.42)
    out.push({
      label: "SPECIALIST",
      reason: `${s.topTags[0].count} solves tagged "${s.topTags[0].tag}"`,
    });
  if (attrs.DRI >= 78)
    out.push({ label: "VERSATILE", reason: `${s.distinctTags} distinct tags solved` });
  if (s.solved >= 700) out.push({ label: "VOLUME KING", reason: `${s.solved} problems solved` });
  if (out.length === 0)
    out.push({
      label: "ROOKIE",
      reason: "Early contest record — more rated results are needed",
    });
  return out.slice(0, 5);
}

const RANK_MILESTONES: [string, string][] = [
  ["specialist", "First Specialist"],
  ["expert", "First Expert"],
  ["candidate master", "First Candidate Master"],
  ["master", "First Master"],
  ["international master", "First International Master"],
  ["grandmaster", "First Grandmaster"],
];

const RANK_MIN_RATING: Record<string, number> = {
  specialist: 1400,
  expert: 1600,
  "candidate master": 1900,
  master: 2100,
  "international master": 2300,
  grandmaster: 2400,
};

function buildAchievements(s: Stats): Achievement[] {
  const out: Achievement[] = [];
  out.push({
    label: "First Contest",
    detail: s.contests ? "Debut logged" : "Play a rated contest",
    unlocked: s.contests >= 1,
  });
  for (const n of [100, 500, 1000, 2000]) {
    out.push({
      label: `${n} Problems`,
      detail: `${s.solved} solved`,
      unlocked: s.solved >= n,
    });
  }
  for (const [rank, label] of RANK_MILESTONES) {
    out.push({
      label,
      detail: `Needs ${RANK_MIN_RATING[rank]} rating`,
      unlocked: s.maxRating >= (RANK_MIN_RATING[rank] ?? 9999),
    });
  }
  for (const n of [10, 50, 100]) {
    out.push({
      label: `${n} Contests`,
      detail: `${s.contests} played`,
      unlocked: s.contests >= n,
    });
  }
  out.push({
    label: "Peak Rating",
    detail: s.maxRating ? `Peak ${s.maxRating}` : "No rated contests yet",
    unlocked: s.maxRating > 0,
  });
  return out;
}

/* ---------------- analysis ---------------- */

function buildAnalysis(attrs: Attributes, s: Stats) {
  const entries = (Object.keys(attrs) as AttrKey[]).map((k) => ({ k, v: attrs[k] }));
  entries.sort((a, b) => b.v - a.v);
  const phrase: Record<AttrKey, { good: string; bad: string }> = {
    PAC: {
      good: `Fast improvement — ${s.gain12m >= 0 ? "+" : ""}${s.gain12m} rating in the last 12 months.`,
      bad: "Rating growth has stalled recently, which caps your Pace.",
    },
    SHO: {
      good: `High-rated problem solving — your 10 hardest solves average ${s.top10Avg}.`,
      bad: "You rarely finish problems above your rating, limiting Shooting.",
    },
    PAS: {
      good: `Contest performance — rating ${s.currentRating} with ${Math.round(s.positiveShare * 100)}% non-negative contests.`,
      bad: "Contest consistency is currently limiting your OVR.",
    },
    DRI: {
      good: `Versatile — ${s.distinctTags} distinct tags across ${s.solved} solved problems.`,
      bad: "Your topic coverage is narrow; try unfamiliar tags.",
    },
    DEF: {
      good: `Hard problems — ${s.solved2200} solves rated 2200+, hardest ${s.hardestSolved}.`,
      bad: "Very hard problems (2200+) are still mostly unexplored.",
    },
    PHY: {
      good: `Endurance — ${s.contests} contests across ${s.activeMonths} active months.`,
      bad: "Low contest volume keeps your endurance score down.",
    },
  };
  const strengths = entries
    .slice(0, 3)
    .filter((e) => e.v >= 45)
    .map((e) => phrase[e.k].good);
  const weaknesses = entries
    .slice(-3)
    .reverse()
    .filter((e) => e.v < 78)
    .map((e) => phrase[e.k].bad);
  if (strengths.length === 0)
    strengths.push("You're just getting started — every contest from here adds signal.");
  if (weaknesses.length === 0)
    weaknesses.push("No obvious weak spot — your attributes are impressively balanced.");
  if (s.topTags[0])
    strengths.push(`Strongest tag: ${s.topTags[0].tag} (${s.topTags[0].count} solves).`);
  return { strengths: strengths.slice(0, 4), weaknesses: weaknesses.slice(0, 3) };
}

/* ---------------- public API ---------------- */

function formEntry(h: CFRatingChange): FormEntry {
  return {
    contestId: h.contestId,
    name: h.contestName,
    rank: h.rank,
    delta: h.newRating - h.oldRating,
    newRating: h.newRating,
    date: new Date(h.ratingUpdateTimeSeconds * 1000).toISOString().slice(0, 10),
  };
}

export function buildProfile(data: CFPlayerData): PlayerProfile {
  const now = Math.floor(Date.now() / 1000);
  const { attrs, ovr, stats } = computeCore(data, now);

  const potentialBonus = Math.max(
    0,
    Math.min(12, (attrs.PAC - 50) / 7 + stats.gain12m / 140 + (stats.contests < 25 ? 2 : 0)),
  );
  const potential = clamp(Math.max(ovr, ovr + potentialBonus));

  const years = new Set<number>();
  for (const h of data.ratingHistory)
    years.add(new Date(h.ratingUpdateTimeSeconds * 1000).getUTCFullYear());
  for (const s of data.submissions)
    years.add(new Date(s.creationTimeSeconds * 1000).getUTCFullYear());
  const evolution: EvolutionPoint[] = [...years]
    .sort((a, b) => a - b)
    .map((year) => {
      const cutoff = Math.min(now, Math.floor(Date.UTC(year, 11, 31, 23, 59, 59) / 1000));
      const core = computeCore(data, cutoff);
      return { year, ovr: core.ovr, rating: core.stats.currentRating, solved: core.stats.solved };
    });

  return {
    handle: data.info.handle,
    data,
    attrs,
    ovr,
    potential,
    tier: tierFor(ovr),
    position: pickPosition(attrs),
    stats,
    form: data.ratingHistory.slice(-10).reverse().map(formEntry),
    history: data.ratingHistory.map((h) => ({
      date: new Date(h.ratingUpdateTimeSeconds * 1000).toISOString().slice(0, 10),
      rating: h.newRating,
      t: h.ratingUpdateTimeSeconds,
    })),
    badges: buildBadges(attrs, stats),
    achievements: buildAchievements(stats),
    evolution,
    ...buildAnalysis(attrs, stats),
  };
}

export const ATTR_ORDER: AttrKey[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];

export function tierClass(tier: Tier): string {
  return `tier tier-${tier}`;
}

/** Neutral pairwise comparison summary used by /compare. */
export function compareSummary(a: PlayerProfile, b: PlayerProfile): string[] {
  const lines: string[] = [];
  const cmp = (label: string, av: number, bv: number, unit = "") => {
    if (av === bv) return `${label}: level at ${av}${unit}.`;
    const leader = av > bv ? a.handle : b.handle;
    return `${label}: ${leader} leads (${av}${unit} vs ${bv}${unit}).`;
  };
  lines.push(cmp("OVR", a.ovr, b.ovr));
  lines.push(cmp("Current rating", a.stats.currentRating, b.stats.currentRating));
  lines.push(cmp("Peak rating", a.stats.maxRating, b.stats.maxRating));
  lines.push(cmp("Problems solved", a.stats.solved, b.stats.solved));
  lines.push(cmp("Contests played", a.stats.contests, b.stats.contests));
  const aWins = ATTR_ORDER.filter((k) => a.attrs[k] > b.attrs[k]);
  const bWins = ATTR_ORDER.filter((k) => b.attrs[k] > a.attrs[k]);
  lines.push(
    `Attributes: ${a.handle} is stronger in ${aWins.join(", ") || "none"}; ${b.handle} is stronger in ${bWins.join(", ") || "none"}.`,
  );
  return lines;
}
