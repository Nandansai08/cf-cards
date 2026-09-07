import type { PlayerProfile } from "./fut";
import { avatarUrl } from "./codeforces";

export interface RosterEntry {
  handle: string;
  ovr: number;
  potential: number;
  rating: number;
  maxRating: number;
  rank: string;
  solved: number;
  contests: number;
  gain12m: number;
  country?: string | undefined;
  organization?: string | undefined;
  avatar: string;
  tier: string;
  position: string;
  savedAt: number;
}

const KEY = "cffut:roster";

export const SEED_HANDLES = [
  "tourist",
  "jiangly",
  "Um_nik",
  "Benq",
  "ecnerwala",
  "Radewoosh",
  "maroonrk",
  "SecondThread",
  "errorgorn",
  "neal",
  "Petr",
  "kotatsugame",
  "dario2994",
  "Egor",
  "rng_58",
  "Geothermal",
  "Vovuh",
  "galen_colin",
];

export function readRoster(): RosterEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as RosterEntry[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveToRoster(profile: PlayerProfile): RosterEntry[] {
  if (typeof window === "undefined") return [];
  const entry: RosterEntry = {
    handle: profile.handle,
    ovr: profile.ovr,
    potential: profile.potential,
    rating: profile.stats.currentRating,
    maxRating: profile.stats.maxRating,
    rank: profile.stats.rank,
    solved: profile.stats.solved,
    contests: profile.stats.contests,
    gain12m: profile.stats.gain12m,
    country: profile.data.info.country,
    organization: profile.data.info.organization,
    avatar: avatarUrl(profile.data.info),
    tier: profile.tier,
    position: profile.position,
    savedAt: Date.now(),
  };
  const next = [entry, ...readRoster().filter((r) => r.handle.toLowerCase() !== entry.handle.toLowerCase())].slice(
    0,
    200,
  );
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* best effort */
  }
  return next;
}
