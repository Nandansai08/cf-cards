import { useQuery } from "@tanstack/react-query";
import { CFError, fetchPlayerData, normalizeHandle } from "@/lib/codeforces";
import { buildProfile, type PlayerProfile } from "@/lib/fut";

export function playerQueryOptions(handle: string) {
  const h = normalizeHandle(handle);
  return {
    queryKey: ["cf-player", h.toLowerCase()],
    queryFn: async (): Promise<PlayerProfile> => buildProfile(await fetchPlayerData(h)),
    enabled: h.length > 0,
    staleTime: 1000 * 60 * 30,
    // A misspelled handle is a settled answer and must not be asked twice.
    // Everything else — a dropped connection, a rate limit, a bad gateway —
    // is worth one more go, since the alternative is a card that never
    // arrives.
    retry: (count: number, error: Error) =>
      count < 1 && !(error instanceof CFError && error.kind === "not_found"),
  };
}

export function usePlayer(handle: string) {
  return useQuery(playerQueryOptions(handle));
}
