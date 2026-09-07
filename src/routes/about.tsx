import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ATTR_META, ATTR_ORDER, ATTR_WEIGHTS, TIER_META, type Tier } from "@/lib/fut";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How the ratings work — Codeforces Cards" },
      {
        name: "description",
        content:
          "The exact, deterministic methodology behind Codeforces Cards: how the six attributes, OVR, rarity tiers and potential are calculated from public Codeforces data.",
      },
      { property: "og:title", content: "Codeforces Cards methodology" },
      {
        property: "og:description",
        content: "Explainable formulas, no random statistics, only public Codeforces data.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
        How is this <span className="text-gradient-gold">calculated?</span>
      </h1>

      <section className="panel mt-8 space-y-3 p-6 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
          Data source
        </h2>
        <p>
          Everything comes from the public Codeforces API: <code>user.info</code>,{" "}
          <code>user.rating</code> and <code>user.status</code>. No login, no private data, no API
          keys. Results are cached in your browser for 30 minutes to stay friendly with Codeforces
          rate limits.
        </p>
      </section>

      <section className="panel mt-6 space-y-4 p-6">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">
          The six attributes
        </h2>
        {ATTR_ORDER.map((k) => (
          <div key={k}>
            <p className="font-display text-sm font-bold uppercase tracking-wider text-primary">
              {k} · weight {Math.round(ATTR_WEIGHTS[k] * 100)}%
            </p>
            <p className="text-sm text-muted-foreground">{ATTR_META[k].how}</p>
          </div>
        ))}
        <p className="border-t border-border/60 pt-4 text-sm text-muted-foreground">
          Every attribute is scaled 1–99. Volume-based inputs (problems, contests, tags, active
          months) use a logarithmic scale so that enormous problem counts add diminishing value
          instead of dominating the card. Difficulty and contest results carry the most weight.
        </p>
      </section>

      <section className="panel mt-6 space-y-3 p-6 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
          Rarity tiers
        </h2>
        <ul className="grid gap-1 sm:grid-cols-2">
          {(Object.keys(TIER_META) as Tier[]).map((t) => (
            <li key={t}>
              <span className="font-display uppercase tracking-wider text-foreground">
                {TIER_META[t].label}
              </span>{" "}
              — OVR {TIER_META[t].min}+
            </li>
          ))}
        </ul>
      </section>

      <section className="panel mt-6 space-y-3 p-6 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
          Potential
        </h2>
        <p>
          Potential adds a bounded bonus (max +12) derived from your Pace attribute, your rating
          change over the last 12 months, and whether you are early in your career. It is a rough
          trajectory estimate for fun — not a prediction, and definitely not an official Codeforces
          metric.
        </p>
      </section>

      <section className="panel mt-6 space-y-3 p-6 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
          Determinism &amp; fairness
        </h2>
        <p>
          The same handle with the same Codeforces history always produces the same card. Nothing is
          random. Card customization changes only visuals — it can never change your OVR, attributes
          or tier. College and country data is shown only when Codeforces publishes it; nothing is
          fabricated.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="font-display uppercase tracking-wider">
          <Link to="/generate">Generate my card</Link>
        </Button>
        <Button asChild variant="secondary" className="font-display uppercase tracking-wider">
          <Link to="/leaderboard">Leaderboard</Link>
        </Button>
      </div>
    </div>
  );
}
