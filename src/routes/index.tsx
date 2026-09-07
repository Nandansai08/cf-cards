import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight, Layers, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HandleForm } from "@/components/fut/HandleForm";
import { PlayerCard, PlayerCardSkeleton } from "@/components/fut/PlayerCard";
import { ATTR_META, ATTR_ORDER, TIER_META, type Tier } from "@/lib/fut";
import { playerQueryOptions } from "@/hooks/usePlayer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Codeforces Cards — Turn Your Codeforces Stats Into a Player Card" },
      {
        name: "description",
        content:
          "Enter a Codeforces handle and get a football-style player card: an OVR rating, six attributes, a rarity tier, badges and achievements, all calculated from real contest and submission history.",
      },
      { property: "og:title", content: "Codeforces Cards — Your Codeforces Player Card" },
      {
        property: "og:description",
        content: "Your rating. Your contests. Your grind. Your Codeforces card.",
      },
    ],
  }),
  component: Landing,
});

const SHOWCASE = ["tourist", "SecondThread", "Geothermal"];

/**
 * Shown when the example cards can't be built.
 *
 * The page used to fall back to a loading skeleton here, so a failed request
 * left a grey rectangle that never resolved and never explained itself.
 */
function ShowcaseUnavailable({ width, onRetry }: { width?: number; onRetry: () => void }) {
  return (
    <div
      className="panel flex flex-col items-center justify-center gap-3 p-6 text-center"
      style={width ? { width, aspectRatio: "0.72" } : undefined}
    >
      <p className="text-sm text-muted-foreground">
        Codeforces didn't answer, so the example cards couldn't be built. Your own card will still
        work.
      </p>
      <Button variant="secondary" onClick={onRetry} className="font-display uppercase">
        Try again
      </Button>
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const go = (handle: string) => void navigate({ to: "/player/$handle", params: { handle } });

  const cards = useQueries({ queries: SHOWCASE.map((h) => playerQueryOptions(h)) });

  // The hero shows the first card that loads, not specifically the first
  // handle: if Codeforces is slow or rate-limiting one profile, showing a
  // different real card beats showing an empty rectangle.
  const hero = cards.find((q) => q.data)?.data;
  const loadingShowcase = cards.some((q) => q.isPending || q.isFetching);
  const retryShowcase = () => cards.forEach((q) => void q.refetch());

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Turn your Codeforces stats into a{" "}
              <span className="text-gradient-gold">player card.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Your rating. Your contests. Your grind. Your Codeforces card.
            </p>
            {/* Plain prose naming what this is. The hero above is a slogan, and
                a slogan gives a search engine nothing to match a query to. */}
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Codeforces Cards turns any competitive programming profile into a football-style
              trading card — an OVR rating, six attributes, a rarity tier and a career line, all
              calculated from public contest and submission history.
            </p>
            <div className="mt-8 max-w-xl">
              <HandleForm onSubmit={go} />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="font-display uppercase tracking-wider">
                <Link to="/compare">
                  <Swords className="mr-1 h-4 w-4" /> Compare players
                </Link>
              </Button>
              <Button asChild variant="secondary" className="font-display uppercase tracking-wider">
                <Link to="/leaderboard">
                  <Trophy className="mr-1 h-4 w-4" /> Leaderboards
                </Link>
              </Button>
              <Button asChild variant="secondary" className="font-display uppercase tracking-wider">
                <Link to="/pack">
                  <Layers className="mr-1 h-4 w-4" /> Open a pack
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div
              className="absolute inset-0 -z-10 rounded-full blur-3xl"
              style={{ background: "var(--gradient-gold)", opacity: 0.14 }}
            />
            {hero ? (
              <div>
                <PlayerCard profile={hero} width={320} reveal />
              </div>
            ) : loadingShowcase ? (
              <PlayerCardSkeleton width={320} />
            ) : (
              <ShowcaseUnavailable width={320} onRetry={retryShowcase} />
            )}
          </div>
        </div>
      </section>

      {/* EXAMPLE CARDS */}
      <Section
        title="Example cards"
        subtitle="Real handles, real public data, recalculated every time."
      >
        <div className="flex flex-wrap justify-center gap-8">
          {cards.map((q, i) =>
            q.data ? (
              <Link
                key={SHOWCASE[i]}
                to="/player/$handle"
                params={{ handle: SHOWCASE[i]! }}
                className="transition-transform hover:scale-[1.02]"
              >
                <PlayerCard profile={q.data} width={260} />
              </Link>
            ) : q.isPending || q.isFetching ? (
              <PlayerCardSkeleton key={SHOWCASE[i]} width={260} />
            ) : // A card that failed is dropped rather than left as a permanent
            // grey rectangle; the message below covers the all-failed case.
            null,
          )}
        </div>
        {!hero && !loadingShowcase && (
          <div className="mt-4 text-center">
            <ShowcaseUnavailable onRetry={retryShowcase} />
          </div>
        )}
      </Section>

      {/* HOW RATING WORKS */}
      <Section
        title="How the rating works"
        subtitle="Deterministic formulas — same handle, same numbers, every time. No randomness."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ATTR_ORDER.map((k) => (
            <div key={k} className="panel p-5">
              <p className="font-display text-2xl font-bold text-primary">{k}</p>
              <p className="mt-1 font-display text-sm uppercase tracking-wider">
                {ATTR_META[k].long.split("—")[1]?.trim()}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{ATTR_META[k].how}</p>
            </div>
          ))}
        </div>
        <div className="panel mt-6 p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide">
            How is this calculated?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Each attribute is scaled 1–99. Counts (problems, contests, tags) use a logarithmic
            scale, so a player with 3,000 solves doesn't automatically outrank everyone — difficulty
            and contest results still dominate. OVR is a weighted blend: 30% PAS, 22% SHO, 15% DEF,
            13% DRI, 12% PHY, 8% PAC. Potential adds a small bonus derived from your last 12 months
            of rating change.
          </p>
        </div>
      </Section>

      {/* RARITIES */}
      <Section
        title="Card rarities"
        subtitle="Your tier is set by your OVR — nothing cosmetic can fake it."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {(Object.keys(TIER_META) as Tier[]).map((t) => (
            <div
              key={t}
              className={`tier tier-${t} card-shell grid aspect-[0.72] place-items-center rounded-xl p-3 text-center`}
            >
              <div>
                <p className="font-display text-sm font-bold uppercase tracking-wider">
                  {TIER_META[t].label}
                </p>
                <p className="font-display text-xs opacity-80">OVR {TIER_META[t].min}+</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* FEATURE GRID */}
      <Section title="More game modes" subtitle="Everything runs on the same deterministic engine.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureLink
            to="/compare"
            title="Compare"
            body="Two handles, two cards, attribute-by-attribute."
          />
          <FeatureLink
            to="/leaderboard"
            title="Leaderboard"
            body="Global, country and college rankings."
          />
          <FeatureLink
            to="/squad"
            title="Squad builder"
            body="Build a five-player lineup with a synergy score."
          />
          <FeatureLink
            to="/pack"
            title="Pack opening"
            body="Reveal any handle with a full pack animation."
          />
        </div>
      </Section>

      {/* CTA */}
      <section className="px-4 pb-4 sm:px-6">
        <div className="panel mx-auto max-w-4xl p-8 text-center">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Ready to see your card?
          </h2>
          <p className="mt-2 text-muted-foreground">Takes one handle and about two seconds.</p>
          <div className="mx-auto mt-6 max-w-lg">
            <HandleForm onSubmit={go} showExamples={false} />
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function FeatureLink({
  to,
  title,
  body,
}: {
  to: "/compare" | "/leaderboard" | "/squad" | "/pack";
  title: string;
  body: string;
}) {
  return (
    <Link to={to} className="panel group p-5 transition-colors hover:border-primary/60">
      <p className="flex items-center justify-between font-display text-lg font-bold uppercase tracking-wide">
        {title}
        <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}
