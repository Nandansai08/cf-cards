import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { X } from "lucide-react";
import { HandleForm } from "@/components/fut/HandleForm";
import { PlayerCard, PlayerCardSkeleton } from "@/components/fut/PlayerCard";
import { StatTile } from "@/components/fut/PlayerProfileView";
import { useQueries } from "@tanstack/react-query";
import { playerQueryOptions } from "@/hooks/usePlayer";
import { ATTR_ORDER, type PlayerProfile } from "@/lib/fut";

export const Route = createFileRoute("/squad")({
  head: () => ({
    meta: [
      { title: "Squad builder — Codeforces Cards" },
      {
        name: "description",
        content:
          "Build a five-player Codeforces squad, see squad OVR, average rating and a synergy score based on complementary strengths.",
      },
      { property: "og:title", content: "Build your Codeforces squad" },
      {
        property: "og:description",
        content: "Five handles, one lineup, one synergy score — all from public Codeforces data.",
      },
    ],
  }),
  component: SquadPage,
});

const SLOTS = ["CP", "GRINDER", "SPECIALIST", "CONTENDER", "PROBLEM SOLVER"] as const;

function synergy(players: PlayerProfile[]): number {
  if (players.length === 0) return 0;
  // Coverage: how well the squad's best attributes cover all six categories,
  // blended with squad strength. Deterministic, no randomness.
  const best = new Map<string, number>();
  for (const p of players) {
    for (const k of ATTR_ORDER) best.set(k, Math.max(best.get(k) ?? 0, p.attrs[k]));
  }
  const coverage = ATTR_ORDER.reduce((a, k) => a + (best.get(k) ?? 0), 0) / (ATTR_ORDER.length * 99);
  const distinctRoles = new Set(players.map((p) => p.position)).size / SLOTS.length;
  const fill = players.length / SLOTS.length;
  return Math.round(100 * (0.55 * coverage + 0.25 * Math.min(1, distinctRoles) + 0.2 * fill));
}

function SquadPage() {
  const [handles, setHandles] = useState<string[]>([]);
  const queries = useQueries({ queries: handles.map((h) => playerQueryOptions(h)) });
  const players = queries.map((q) => q.data).filter((p): p is PlayerProfile => !!p);

  const squadOvr = players.length
    ? Math.round(players.reduce((a, p) => a + p.ovr, 0) / players.length)
    : 0;
  const avgRating = players.length
    ? Math.round(players.reduce((a, p) => a + p.stats.currentRating, 0) / players.length)
    : 0;

  function add(handle: string) {
    setHandles((prev) =>
      prev.length >= SLOTS.length || prev.some((h) => h.toLowerCase() === handle.toLowerCase())
        ? prev
        : [...prev, handle],
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
        Squad <span className="text-gradient-gold">builder</span>
      </h1>
      <p className="mt-3 text-muted-foreground">
        Add up to five handles. Synergy rewards squads that cover all six attributes with different roles.
      </p>

      <div className="mt-8 max-w-xl">
        <HandleForm onSubmit={add} cta="Add player" placeholder="Add a Codeforces handle" />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Squad OVR" value={squadOvr || "—"} />
        <StatTile label="Avg rating" value={avgRating || "—"} />
        <StatTile label="Synergy" value={`${synergy(players)}%`} hint="Attribute coverage + role mix" />
        <StatTile label="Players" value={`${handles.length}/${SLOTS.length}`} />
      </div>

      {/* pitch */}
      <div
        className="panel mt-8 p-4 sm:p-8"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, color-mix(in oklab, var(--lime) 5%, transparent) 0 40px, transparent 40px 80px)",
        }}
      >
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {SLOTS.map((slot, i) => {
            const handle = handles[i];
            const q = queries[i];
            return (
              <div key={slot} className="flex flex-col items-center gap-2">
                {!handle && (
                  <div className="grid aspect-[0.72] w-full max-w-[180px] place-items-center rounded-xl border border-dashed border-border/70 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
                    {slot}
                  </div>
                )}
                {handle && q?.isPending && <PlayerCardSkeleton width={160} />}
                {handle && q?.error instanceof Error && (
                  <div className="grid aspect-[0.72] w-full max-w-[180px] place-items-center rounded-xl border border-destructive/40 p-3 text-center text-[11px] text-muted-foreground">
                    {q.error.message}
                  </div>
                )}
                {q?.data && (
                  <div className="relative">
                    <PlayerCard profile={q.data} width={168} reveal />
                    <button
                      onClick={() => setHandles((prev) => prev.filter((h) => h !== handle))}
                      aria-label={`Remove ${handle}`}
                      className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <span className="font-display text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {slot}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {players.length > 1 && (
        <div className="panel mt-8 p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Squad attribute coverage</h2>
          <div className="mt-4 space-y-3">
            {ATTR_ORDER.map((k) => {
              const best = Math.max(...players.map((p) => p.attrs[k]));
              const leader = players.find((p) => p.attrs[k] === best);
              return (
                <div key={k}>
                  <div className="mb-1 flex justify-between font-display text-xs uppercase tracking-wider">
                    <span className="text-muted-foreground">
                      {k} — best: {leader?.handle}
                    </span>
                    <span className="tabular-nums">{best}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                      style={{ width: `${best}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
