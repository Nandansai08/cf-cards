import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchManyInfo, avatarUrl, countryFlagEmoji, type CFUserInfo } from "@/lib/codeforces";
import { readRoster, SEED_HANDLES, type RosterEntry } from "@/lib/roster";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboards — Codeforces Cards" },
      {
        name: "description",
        content:
          "Ranked tables of Codeforces cards: highest OVR, highest rating, most problems solved, highest potential, fastest rising and most contests.",
      },
      { property: "og:title", content: "Codeforces Cards leaderboards" },
      {
        property: "og:description",
        content: "Global, country and college rankings for Codeforces Cards player cards.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type Category = "ovr" | "rating" | "solved" | "potential" | "rising" | "contests";

const CATEGORIES: { key: Category; label: string; needsCard: boolean }[] = [
  { key: "ovr", label: "Highest OVR", needsCard: true },
  { key: "rating", label: "Highest rating", needsCard: false },
  { key: "solved", label: "Most solved", needsCard: true },
  { key: "potential", label: "Highest potential", needsCard: true },
  { key: "rising", label: "Fastest rising", needsCard: true },
  { key: "contests", label: "Most contests", needsCard: true },
];

interface Row {
  handle: string;
  avatar: string;
  rank: string;
  rating: number;
  country?: string | undefined;
  organization?: string | undefined;
  ovr?: number | undefined;
  potential?: number | undefined;
  solved?: number | undefined;
  contests?: number | undefined;
  gain12m?: number | undefined;
  generated: boolean;
}

function toRow(info: CFUserInfo, card?: RosterEntry): Row {
  return {
    handle: info.handle,
    avatar: avatarUrl(info),
    rank: info.rank ?? "unrated",
    rating: info.rating ?? 0,
    country: info.country,
    organization: info.organization,
    ovr: card?.ovr,
    potential: card?.potential,
    solved: card?.solved,
    contests: card?.contests,
    gain12m: card?.gain12m,
    generated: !!card,
  };
}

function LeaderboardPage() {
  const [category, setCategory] = useState<Category>("rating");
  const [scope, setScope] = useState<"global" | "country" | "org">("global");
  const [filter, setFilter] = useState("");

  const roster = useMemo(() => readRoster(), []);
  const handles = useMemo(
    () => [...new Set([...roster.map((r) => r.handle), ...SEED_HANDLES])].slice(0, 60),
    [roster],
  );

  const { data, isPending, error } = useQuery({
    queryKey: ["cf-bulk", handles.join(",")],
    queryFn: () => fetchManyInfo(handles),
    staleTime: 1000 * 60 * 15,
    retry: false,
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const byHandle = new Map(roster.map((r) => [r.handle.toLowerCase(), r]));
    let out = data.map((i) => toRow(i, byHandle.get(i.handle.toLowerCase())));
    const needle = filter.trim().toLowerCase();
    if (scope === "country" && needle)
      out = out.filter((r) => (r.country ?? "").toLowerCase().includes(needle));
    if (scope === "org" && needle)
      out = out.filter((r) => (r.organization ?? "").toLowerCase().includes(needle));
    const cat = CATEGORIES.find((c) => c.key === category)!;
    if (cat.needsCard) out = out.filter((r) => r.generated);
    const value = (r: Row) =>
      category === "ovr"
        ? (r.ovr ?? 0)
        : category === "rating"
          ? r.rating
          : category === "solved"
            ? (r.solved ?? 0)
            : category === "potential"
              ? (r.potential ?? 0)
              : category === "rising"
                ? (r.gain12m ?? 0)
                : (r.contests ?? 0);
    return out.sort((a, b) => value(b) - value(a)).slice(0, 50);
  }, [data, roster, category, scope, filter]);

  const cat = CATEGORIES.find((c) => c.key === category)!;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
        Leader<span className="text-gradient-gold">board</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Card metrics (OVR, potential, solved, contests) appear for players whose card has been
        generated on this device. Ratings and ranks come live from Codeforces.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={cn(
              "rounded-full border border-border/70 px-4 py-1.5 font-display text-xs uppercase tracking-wider transition-colors hover:border-primary",
              category === c.key && "border-primary bg-primary/15 text-primary",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["global", "country", "org"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              "rounded-lg border border-border/70 px-3 py-1.5 font-display text-xs uppercase tracking-wider transition-colors hover:border-accent",
              scope === s && "border-accent bg-accent/15 text-accent",
            )}
          >
            {s === "org" ? "College mode" : s}
          </button>
        ))}
        {scope !== "global" && (
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={
              scope === "country" ? "Filter by country, e.g. India" : "Filter by organization"
            }
            className="h-10 max-w-xs bg-surface/60"
          />
        )}
      </div>

      <div className="panel mt-6 overflow-hidden">
        {isPending && (
          <div className="divide-y divide-border/60">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-surface/40" />
            ))}
          </div>
        )}
        {error instanceof Error && (
          <p className="p-6 text-sm text-muted-foreground">{error.message}</p>
        )}
        {!isPending && !error && rows.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nothing here yet.{" "}
            {cat.needsCard ? (
              <>
                Generate a card first —{" "}
                <Link to="/generate" className="text-primary underline-offset-4 hover:underline">
                  start here
                </Link>
                .
              </>
            ) : (
              "Try a different filter."
            )}
          </div>
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-border/60">
            {rows.map((r, i) => (
              <li key={r.handle}>
                <Link
                  to="/player/$handle"
                  params={{ handle: r.handle }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
                >
                  <span
                    className={cn(
                      "w-8 shrink-0 font-display text-lg font-bold tabular-nums",
                      i === 0 && "text-primary",
                      i === 1 && "text-foreground",
                      i === 2 && "text-accent",
                      i > 2 && "text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  {r.avatar ? (
                    <img
                      src={r.avatar}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded-lg bg-secondary" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display font-bold uppercase tracking-wide">
                      {r.handle}
                    </span>
                    <span className="block truncate text-xs capitalize text-muted-foreground">
                      {r.rank}
                      {r.country ? ` · ${countryFlagEmoji(r.country)} ${r.country}` : ""}
                      {r.organization ? ` · ${r.organization}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-lg font-bold tabular-nums text-primary">
                      {r.generated ? r.ovr : "—"}
                    </span>
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                      OVR
                    </span>
                  </span>
                  <span className="w-16 shrink-0 text-right font-display tabular-nums">
                    {r.rating || "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
