import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { PlayerCard, PlayerCardSkeleton } from "@/components/fut/PlayerCard";
import { HandleForm } from "@/components/fut/HandleForm";
import { usePlayer } from "@/hooks/usePlayer";
import { ATTR_ORDER, compareSummary, type PlayerProfile } from "@/lib/fut";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  a: z.string().optional().catch(undefined),
  b: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/compare")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Compare two Codeforces players — Codeforces Cards" },
      {
        name: "description",
        content:
          "Put two Codeforces handles side by side: OVR, rating, peak rating, problems solved, contests and all six card attributes.",
      },
      { property: "og:title", content: "Compare Codeforces players card-to-card" },
      {
        property: "og:description",
        content: "Attribute-by-attribute comparison built from public Codeforces data.",
      },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { a, b } = Route.useSearch();
  const navigate = useNavigate();
  const qa = usePlayer(a ?? "");
  const qb = usePlayer(b ?? "");

  const setSide = (key: "a" | "b", handle: string) =>
    void navigate({ to: "/compare", search: (prev) => ({ ...prev, [key]: handle }) });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
        Head to <span className="text-gradient-gold">head</span>
      </h1>
      <p className="mt-3 text-muted-foreground">Two handles, two cards, one neutral verdict.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <HandleForm
          initial={a ?? ""}
          onSubmit={(h) => setSide("a", h)}
          cta="Load"
          placeholder="First handle"
          showExamples={false}
        />
        <HandleForm
          initial={b ?? ""}
          onSubmit={(h) => setSide("b", h)}
          cta="Load"
          placeholder="Second handle"
          showExamples={false}
        />
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <Side handle={a} profile={qa.data} pending={qa.isPending && !!a} error={qa.error} />
        <Side handle={b} profile={qb.data} pending={qb.isPending && !!b} error={qb.error} />
      </div>

      {qa.data && qb.data && (
        <>
          <div className="panel mt-10 p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Attribute comparison
            </h2>
            <div className="mt-5 space-y-4">
              {ATTR_ORDER.map((k) => {
                const av = qa.data.attrs[k];
                const bv = qb.data.attrs[k];
                const total = av + bv || 1;
                return (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between font-display text-sm">
                      <span
                        className={cn(
                          "tabular-nums",
                          av >= bv ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {av}
                      </span>
                      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {k}
                      </span>
                      <span
                        className={cn(
                          "tabular-nums",
                          bv >= av ? "text-accent" : "text-muted-foreground",
                        )}
                      >
                        {bv}
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(av / total) * 100}%` }}
                      />
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${(bv / total) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel mt-6 p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Neutral summary
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {compareSummary(qa.data, qb.data).map((l) => (
                <li key={l}>• {l}</li>
              ))}
            </ul>
          </div>

          <div className="panel mt-6 overflow-x-auto p-5">
            <table className="w-full min-w-[440px] text-sm">
              <thead>
                <tr className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 text-left">Metric</th>
                  <th className="py-2 text-right">{qa.data.handle}</th>
                  <th className="py-2 text-right">{qb.data.handle}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[
                  ["OVR", qa.data.ovr, qb.data.ovr],
                  ["Potential", qa.data.potential, qb.data.potential],
                  ["Rating", qa.data.stats.currentRating, qb.data.stats.currentRating],
                  ["Peak rating", qa.data.stats.maxRating, qb.data.stats.maxRating],
                  ["Problems solved", qa.data.stats.solved, qb.data.stats.solved],
                  ["Contests", qa.data.stats.contests, qb.data.stats.contests],
                  ["2200+ solves", qa.data.stats.solved2200, qb.data.stats.solved2200],
                  [
                    "Achievements",
                    qa.data.achievements.filter((x) => x.unlocked).length,
                    qb.data.achievements.filter((x) => x.unlocked).length,
                  ],
                  [
                    "Last 5 contests",
                    qa.data.form.slice(0, 5).reduce((s, f) => s + f.delta, 0),
                    qb.data.form.slice(0, 5).reduce((s, f) => s + f.delta, 0),
                  ],
                ].map(([label, av, bv]) => (
                  <tr key={String(label)}>
                    <td className="py-2 text-muted-foreground">{label}</td>
                    <td
                      className={cn(
                        "py-2 text-right font-display tabular-nums",
                        Number(av) >= Number(bv) && "text-primary",
                      )}
                    >
                      {av}
                    </td>
                    <td
                      className={cn(
                        "py-2 text-right font-display tabular-nums",
                        Number(bv) >= Number(av) && "text-accent",
                      )}
                    >
                      {bv}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Side({
  handle,
  profile,
  pending,
  error,
}: {
  handle?: string | undefined;
  profile?: PlayerProfile | undefined;
  pending: boolean;
  error: unknown;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      {!handle && (
        <div className="grid aspect-[0.72] w-[260px] place-items-center rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
          Enter a handle to load a card
        </div>
      )}
      {handle && pending && <PlayerCardSkeleton width={260} />}
      {handle && !pending && error instanceof Error && (
        <div className="grid aspect-[0.72] w-[260px] place-items-center rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-muted-foreground">
          {error.message}
        </div>
      )}
      {profile && (
        <>
          <PlayerCard profile={profile} width={260} reveal />
          <div className="text-center">
            <p className="font-display text-lg font-bold uppercase">{profile.handle}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {profile.stats.rank} · OVR {profile.ovr} · POT {profile.potential}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
