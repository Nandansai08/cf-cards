import { useQuery } from "@tanstack/react-query";
import { fetchPlayerData, normalizeHandle } from "@/lib/codeforces";
import { buildProfile, type PlayerProfile } from "@/lib/fut";

export function playerQueryOptions(handle: string) {
  const h = normalizeHandle(handle);
  return {
    queryKey: ["cf-player", h.toLowerCase()],
    queryFn: async (): Promise<PlayerProfile> => buildProfile(await fetchPlayerData(h)),
    enabled: h.length > 0,
    staleTime: 1000 * 60 * 30,
    retry: false,
  };
}

export function usePlayer(handle: string) {
  return useQuery(playerQueryOptions(handle));
}
