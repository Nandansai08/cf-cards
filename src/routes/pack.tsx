import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { HandleForm } from "@/components/fut/HandleForm";
import { PlayerCard } from "@/components/fut/PlayerCard";
import { usePlayer } from "@/hooks/usePlayer";
import { TIER_META } from "@/lib/fut";

export const Route = createFileRoute("/pack")({
  head: () => ({
    meta: [
      { title: "Open a pack — Codeforces Cards" },
      {
        name: "description",
        content:
          "Pack-opening experience for Codeforces cards: rarity reveal, OVR reveal and full card reveal with animation.",
      },
      { property: "og:title", content: "Open a Codeforces Cards pack" },
      {
        property: "og:description",
        content: "Enter a handle and watch the rarity, OVR and card reveal.",
      },
    ],
  }),
  component: PackPage,
});

type Phase = "idle" | "shaking" | "rarity" | "ovr" | "card";

function PackPage() {
  const [handle, setHandle] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const { data, isPending, error } = usePlayer(handle);

  useEffect(() => {
    if (!handle) return;
    setPhase("shaking");
  }, [handle]);

  useEffect(() => {
    if (!data || phase === "idle") return;
    const timers = [
      window.setTimeout(() => setPhase("rarity"), 700),
      window.setTimeout(() => setPhase("ovr"), 1700),
      window.setTimeout(() => setPhase("card"), 2600),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: `${Math.round(Math.cos((i / 28) * Math.PI * 2) * 220)}px`,
        y: `${Math.round(Math.sin((i / 28) * Math.PI * 2) * 220)}px`,
        delay: `${(i % 7) * 60}ms`,
      })),
    [],
  );

  const tierLabel = data ? TIER_META[data.tier].label : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
        Open a <span className="text-gradient-gold">pack</span>
      </h1>
      <p className="mt-3 text-muted-foreground">
        Same deterministic card — just a much more dramatic way to see it.
      </p>

      <div className="mx-auto mt-8 max-w-xl">
        <HandleForm
          onSubmit={(h) => {
            setPhase("idle");
            setHandle(h);
          }}
          cta="Open pack"
          busy={!!handle && isPending}
        />
      </div>

      <div className="relative mt-14 grid min-h-[520px] place-items-center">
        {phase !== "idle" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            {phase !== "shaking" &&
              particles.map((p) => (
                <span
                  key={p.id}
                  className="animate-particle absolute h-1.5 w-1.5 rounded-full bg-primary"
                  style={
                    {
                      ["--px" as string]: p.x,
                      ["--py" as string]: p.y,
                      animationDelay: p.delay,
                    } as React.CSSProperties
                  }
                />
              ))}
          </div>
        )}

        {phase === "idle" && (
          <div className="animate-float grid aspect-[0.72] w-56 place-items-center rounded-2xl border border-primary/40 bg-gradient-to-b from-surface-2 to-surface text-center">
            <p className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Sealed pack
            </p>
          </div>
        )}

        {phase !== "idle" && error instanceof Error && (
          <div className="max-w-sm rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-muted-foreground">
            {error.message}
          </div>
        )}

        {phase === "shaking" && !error && (
          <div className="animate-pulse-glow grid aspect-[0.72] w-56 place-items-center rounded-2xl border border-primary/60 bg-gradient-to-b from-primary/25 to-surface">
            <p className="font-display text-sm uppercase tracking-[0.3em]">Opening…</p>
          </div>
        )}

        {(phase === "rarity" || phase === "ovr") && data && (
          <div className="animate-rise space-y-4">
            <p className="font-display text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Rarity
            </p>
            <p className="text-gradient-gold font-display text-5xl font-bold uppercase sm:text-6xl">
              {tierLabel}
            </p>
            {phase === "ovr" && (
              <p className="animate-rise font-display text-7xl font-bold tabular-nums sm:text-8xl">
                {data.ovr}
              </p>
            )}
          </div>
        )}

        {phase === "card" && data && (
          <div className="flex flex-col items-center gap-6">
            <PlayerCard profile={data} width={320} reveal />
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild className="font-display uppercase tracking-wider">
                <Link to="/player/$handle" params={{ handle: data.handle }}>
                  Full profile
                </Link>
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPhase("idle");
                  setHandle("");
                }}
                className="font-display uppercase tracking-wider"
              >
                Open another
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
