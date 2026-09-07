import { useEffect, useState } from "react";

/**
 * Walks a list of candidate picture URLs, advancing every time one fails to
 * load. Returns undefined once they have all failed, which is the caller's cue
 * to render initials instead.
 *
 * Codeforces pictures come from a handful of sources of varying reliability
 * (two separate uploads per account, then a mirror for the ones a browser
 * won't load cross-origin), so "try the next one" beats a single boolean
 * `broken` flag: one dead URL no longer costs the user their photo.
 */
export function useAvatarSrc(candidates: string[]): {
  src: string | undefined;
  onError: () => void;
} {
  // Compare by value, not array identity: callers rebuild the list each render.
  const key = candidates.join("\n");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [key]);

  return { src: candidates[attempt], onError: () => setAttempt((n) => n + 1) };
}
