/**
 * Public Codeforces API client (browser side, no keys required).
 * Only public endpoints are used: user.info, user.rating, user.status.
 */

export interface CFUserInfo {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  country?: string;
  city?: string;
  organization?: string;
  titlePhoto?: string;
  avatar?: string;
  contribution?: number;
  friendOfCount?: number;
  registrationTimeSeconds?: number;
}

export interface CFRatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

export interface CFProblem {
  contestId?: number;
  index?: string;
  name: string;
  rating?: number;
  tags: string[];
}

export interface CFSubmission {
  id: number;
  creationTimeSeconds: number;
  problem: CFProblem;
  verdict?: string;
  programmingLanguage?: string;
}

export interface CFPlayerData {
  info: CFUserInfo;
  ratingHistory: CFRatingChange[];
  submissions: CFSubmission[];
  fetchedAt: number;
}

export class CFError extends Error {
  kind: "not_found" | "network" | "rate_limit" | "unknown";
  constructor(kind: CFError["kind"], message: string) {
    super(message);
    this.kind = kind;
    this.name = "CFError";
  }
}

const API = "https://codeforces.com/api";
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes
const CACHE_PREFIX = "cffut:cache:";

function friendlyError(raw: string): CFError {
  const lower = raw.toLowerCase();
  if (lower.includes("not found") || lower.includes("handles:")) {
    return new CFError(
      "not_found",
      "Couldn't find that Codeforces handle. Check the spelling and try again.",
    );
  }
  if (lower.includes("limit") || lower.includes("too many")) {
    return new CFError(
      "rate_limit",
      "Codeforces is rate-limiting us right now. Wait a few seconds and try again.",
    );
  }
  return new CFError("unknown", "Codeforces didn't respond as expected. Please try again.");
}

let queue: Promise<unknown> = Promise.resolve();
const MIN_GAP_MS = 420;

/** Serializes Codeforces requests with a small gap so we don't trip rate limits. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => new Promise((r) => setTimeout(r, MIN_GAP_MS)),
    () => new Promise((r) => setTimeout(r, MIN_GAP_MS)),
  );
  return run;
}

async function call<T>(path: string, attempt = 0): Promise<T> {
  return enqueue(() => rawCall<T>(path, attempt));
}

async function rawCall<T>(path: string, attempt: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/${path}`);
  } catch {
    throw new CFError(
      "network",
      "We couldn't reach Codeforces. Check your connection and try again.",
    );
  }
  if (res.status === 429 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
    return call<T>(path, attempt + 1);
  }
  let body: { status?: string; result?: T; comment?: string };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw friendlyError(res.status === 429 ? "limit" : "unknown");
  }
  if (body.status !== "OK" || !body.result) {
    const comment = body.comment ?? (res.status === 429 ? "limit" : "unknown");
    if (/limit|too many/i.test(comment) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
      return call<T>(path, attempt + 1);
    }
    throw friendlyError(comment);
  }
  return body.result;
}

function readCache(handle: string): CFPlayerData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + handle.toLowerCase());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CFPlayerData;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(handle: string, data: CFPlayerData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + handle.toLowerCase(), JSON.stringify(data));
  } catch {
    /* storage full — caching is best-effort */
  }
}

export function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "");
}

export async function fetchPlayerData(rawHandle: string): Promise<CFPlayerData> {
  const handle = normalizeHandle(rawHandle);
  if (!handle) throw new CFError("not_found", "Enter a Codeforces handle to continue.");
  if (!/^[A-Za-z0-9._-]{1,48}$/.test(handle)) {
    throw new CFError(
      "not_found",
      "That doesn't look like a Codeforces handle. Letters, digits, dot, dash and underscore only.",
    );
  }

  const cached = readCache(handle);
  if (cached) return cached;

  const info = (
    await call<CFUserInfo[]>(
      `user.info?handles=${encodeURIComponent(handle)}&checkHistoricHandles=false`,
    )
  )[0];
  if (!info) {
    throw new CFError(
      "not_found",
      "Couldn't find that Codeforces handle. Check the spelling and try again.",
    );
  }

  const [ratingHistory, submissions] = await Promise.all([
    call<CFRatingChange[]>(`user.rating?handle=${encodeURIComponent(info.handle)}`).catch(() => []),
    call<CFSubmission[]>(
      `user.status?handle=${encodeURIComponent(info.handle)}&from=1&count=3000`,
    ).catch(() => []),
  ]);

  const data: CFPlayerData = {
    info,
    ratingHistory,
    submissions,
    fetchedAt: Date.now(),
  };
  writeCache(info.handle, data);
  return data;
}

const AVATAR_DOMAINS = ["codeforces.com", "codeforces.org"];

// Codeforces serves these stand-ins for accounts that never uploaded a
// picture. They are perfectly loadable images, so without this check a card
// would either show a grey silhouette or, if the stand-in itself fails to
// load, give up before trying the account's other upload.
const AVATAR_PLACEHOLDER = /\/no-(title|avatar)\.[a-z]+$/i;

/**
 * One Codeforces picture URL, normalised to absolute https, or "" if unusable.
 * Restricted to Codeforces domains so a hostile API response can't point the
 * card at an arbitrary origin.
 */
function normalizeAvatar(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  try {
    // Copes with absolute, protocol-relative (//host/x.jpg) and root-relative
    // (/predownloaded/x.jpg) values — the API returns all three shapes.
    const url = new URL(
      value.startsWith("//") ? `https:${value}` : value,
      "https://codeforces.com",
    );
    if (url.protocol !== "https:") return "";
    // Match the domain rather than a fixed host list: pictures are served from
    // several Codeforces subdomains (userpic.codeforces.com, .org, and others),
    // and an unlisted one previously meant no picture at all.
    const host = url.hostname.toLowerCase();
    const allowed = AVATAR_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
    if (!allowed || AVATAR_PLACEHOLDER.test(url.pathname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

/**
 * Last-resort mirror for pictures the browser refuses to load directly.
 *
 * Codeforces serves user pictures from its own origin, and a cross-origin
 * <img> is at the mercy of whatever hotlink and cross-origin-resource rules
 * that origin applies — which is why pictures survived on the old
 * server-rendered build (it proxied them) but not on static hosting. wsrv.nl
 * is a public, CORS-enabled image cache; it is only ever tried after a direct
 * load has already failed, so the common path still talks to Codeforces alone.
 * To drop the third party entirely, make avatarChain return [direct]; cards
 * whose picture won't load then fall back to initials.
 */
const AVATAR_MIRROR = "https://wsrv.nl/?n=-1&w=264&h=264&fit=cover&url=";

/** A single picture, direct first and mirrored second. */
export function avatarChain(direct: string): string[] {
  return direct ? [direct, AVATAR_MIRROR + encodeURIComponent(direct)] : [];
}

/**
 * Every picture worth trying for a user, best first.
 *
 * `titlePhoto` and `avatar` are separate uploads on Codeforces and plenty of
 * accounts have one without the other, so both are candidates — picking the
 * first non-empty field would leave those accounts on initials.
 */
export function avatarCandidates(info: CFUserInfo): string[] {
  const sources = [
    ...new Set([normalizeAvatar(info.titlePhoto), normalizeAvatar(info.avatar)]),
  ].filter(Boolean);
  // Every direct URL is tried before any mirrored one, so a picture that loads
  // fine is never routed through a third party.
  return [...sources, ...sources.map((s) => avatarChain(s)[1] as string)];
}

/** The single best picture URL, for callers that can only store one. */
export function avatarUrl(info: CFUserInfo): string {
  return avatarCandidates(info)[0] ?? "";
}

export function countryFlagEmoji(country?: string): string {
  if (!country) return "";
  const code = COUNTRY_CODES[country.toLowerCase()];
  if (!code) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const COUNTRY_CODES: Record<string, string> = {
  india: "IN",
  china: "CN",
  russia: "RU",
  "united states": "US",
  usa: "US",
  japan: "JP",
  "south korea": "KR",
  korea: "KR",
  poland: "PL",
  ukraine: "UA",
  belarus: "BY",
  vietnam: "VN",
  bangladesh: "BD",
  egypt: "EG",
  brazil: "BR",
  argentina: "AR",
  germany: "DE",
  france: "FR",
  "united kingdom": "GB",
  canada: "CA",
  australia: "AU",
  indonesia: "ID",
  iran: "IR",
  turkey: "TR",
  taiwan: "TW",
  singapore: "SG",
  kazakhstan: "KZ",
  uzbekistan: "UZ",
  romania: "RO",
  bulgaria: "BG",
  croatia: "HR",
  serbia: "RS",
  netherlands: "NL",
  switzerland: "CH",
  italy: "IT",
  spain: "ES",
  israel: "IL",
  mexico: "MX",
  peru: "PE",
  colombia: "CO",
  chile: "CL",
  "sri lanka": "LK",
  nepal: "NP",
  pakistan: "PK",
  syria: "SY",
  jordan: "JO",
  tunisia: "TN",
  morocco: "MA",
  nigeria: "NG",
  kenya: "KE",
  greece: "GR",
  czechia: "CZ",
  "czech republic": "CZ",
  slovakia: "SK",
  hungary: "HU",
  sweden: "SE",
  norway: "NO",
  finland: "FI",
  denmark: "DK",
  georgia: "GE",
  armenia: "AM",
  azerbaijan: "AZ",
  moldova: "MD",
  lithuania: "LT",
  latvia: "LV",
  estonia: "EE",
  thailand: "TH",
  philippines: "PH",
  malaysia: "MY",
  "hong kong": "HK",
  mongolia: "MN",
  kyrgyzstan: "KG",
  tajikistan: "TJ",
};

/** Bulk public profile lookup (one API call for up to ~100 handles). */
export async function fetchManyInfo(handles: string[]): Promise<CFUserInfo[]> {
  if (handles.length === 0) return [];
  return call<CFUserInfo[]>(
    `user.info?handles=${handles.map(encodeURIComponent).join(";")}&checkHistoricHandles=false`,
  );
}
