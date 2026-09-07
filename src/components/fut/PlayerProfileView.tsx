import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronDown, Download, Link2, Share2, Sliders, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerCard, type CardStyleOptions } from "./PlayerCard";
import { CardBack } from "./CardBack";
import { FlipCard } from "./FlipCard";
import { RatingChart } from "./RatingChart";
import { ATTR_META, ATTR_ORDER, ATTR_WEIGHTS, TIER_META, type PlayerProfile, type Tier } from "@/lib/fut";
import { cn } from "@/lib/utils";

const TIERS: Tier[] = ["bronze", "silver", "gold", "rare-gold", "epic", "icon", "legendary"];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-lg font-bold uppercase text-foreground">{children}</h2>;
}

export function AttrBar({ k, v }: { k: string; v: number }) {
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <span className="min-w-0 truncate font-display text-sm font-semibold uppercase text-muted-foreground">{k}</span>
        <span className="shrink-0 font-display text-xl font-bold tabular-nums">{v}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

/** Compact statistic used by secondary screens such as the squad builder. */
export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="border-b border-border/60 py-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Identity({ profile, className }: { profile: PlayerProfile; className?: string }) {
  const s = profile.stats;
  return (
    <header className={cn("border-b border-border/60 pb-5", className)}>
      <h1 className="break-words font-display text-3xl font-bold uppercase sm:text-4xl">{profile.handle}</h1>
      <p className="mt-1 text-base capitalize text-muted-foreground">
        {s.rank} <span aria-hidden>·</span> <span className="tabular-nums">{s.currentRating || "Unrated"} rating</span>
      </p>
      {profile.badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Top playstyles">
          {profile.badges.slice(0, 3).map((badge) => (
            <span key={badge.label} title={badge.reason} className="font-display text-xs font-semibold uppercase text-primary">
              {badge.label}
            </span>
          ))}
          {profile.badges.length > 3 && (
            <a href="#playstyle" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              View all
            </a>
          )}
        </div>
      )}
    </header>
  );
}

function OvrSummary({ profile }: { profile: PlayerProfile }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-border/60 border-y border-border/60 py-4">
      <div className="px-4 text-center first:pl-0">
        <p className="text-xs font-medium uppercase text-muted-foreground">OVR</p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums">{profile.ovr}</p>
        <p className="text-xs text-muted-foreground">{TIER_META[profile.tier].label}</p>
      </div>
      <div className="px-4 text-center last:pr-0">
        <p className="text-xs font-medium uppercase text-muted-foreground">Potential</p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums">{profile.potential}</p>
        <p className="text-xs text-muted-foreground">Projection</p>
      </div>
    </div>
  );
}

function StatisticsPanel({ profile }: { profile: PlayerProfile }) {
  const s = profile.stats;
  const primary = [
    ["Rating", s.currentRating || "—"],
    ["Peak", s.maxRating || "—"],
    ["Contests", s.contests],
    ["Solved", s.solved],
  ] as const;
  const secondary = [
    ["Avg difficulty", s.avgSolvedRating || "—"],
    ["Hardest solved", s.hardestSolved || "—"],
    ["2200+ solves", s.solved2200],
    ["Best rank", s.bestRank ? `#${s.bestRank.toLocaleString()}` : "—"],
  ] as const;

  return (
    <section aria-labelledby="statistics-title">
      <SectionHeading>Key statistics</SectionHeading>
      <div className="mt-4 border-y border-border/60">
        <div className="grid grid-cols-2 divide-x divide-y divide-border/60 sm:grid-cols-4 sm:divide-y-0">
          {primary.map(([label, value]) => (
            <div key={label} className="px-4 py-4 first:pl-0 sm:py-5">
              <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-2 border-t border-border/60 py-3 sm:grid-cols-4">
          {secondary.map(([label, value]) => (
            <div key={label} className="flex min-w-0 items-baseline justify-between gap-2 sm:block">
              <span className="truncate text-xs text-muted-foreground">{label}</span>
              <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-foreground sm:mt-0.5 sm:block">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Attributes({ profile }: { profile: PlayerProfile }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="attributes-title">
      <div className="flex items-center justify-between gap-4">
        <SectionHeading>Attributes</SectionHeading>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          How is this calculated?
        </button>
      </div>
      <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {ATTR_ORDER.map((key) => (
          <AttrBar key={key} k={`${key} — ${ATTR_META[key].long.split("—")[1]?.trim() ?? ""}`} v={profile.attrs[key]} />
        ))}
      </div>
      {open && (
        <div className="mt-5 border-l-2 border-primary/70 pl-4 text-sm leading-6 text-muted-foreground">
          <p>Each attribute uses public rating, contest, problem difficulty, tag breadth, and activity data. Large totals are normalized so volume does not dominate.</p>
          <p className="mt-3 font-medium text-foreground">OVR is a Codeforces Cards metric calculated deterministically from public Codeforces data. It is not an official Codeforces rating.</p>
          <p className="mt-2 font-display text-xs tabular-nums">OVR = {ATTR_ORDER.map((key) => `${ATTR_WEIGHTS[key].toFixed(2)}·${key}`).join(" + ")}</p>
        </div>
      )}
    </section>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 font-display text-xs font-bold tabular-nums", delta > 0 && "text-lime", delta < 0 && "text-destructive", delta === 0 && "text-muted-foreground")}>
      <Icon className="h-3 w-3" />{delta > 0 ? "+" : ""}{delta}
    </span>
  );
}

export function CardActions({ profile, style }: { profile: PlayerProfile; style: CardStyleOptions }) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<"card" | "back" | "both" | "story">("card");

  async function download() {
    const selector = format === "card" ? "[data-export-card]" : format === "back" ? "[data-export-back]" : format === "both" ? "[data-export-both]" : "[data-export-story]";
    const node = exportRef.current?.querySelector<HTMLElement>(selector);
    if (!node) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(node, { pixelRatio: 2, cacheBust: true, skipFonts: false });
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `codeforces-cards-${profile.handle}-${format}.png`;
      anchor.click();
      toast.success("Card downloaded");
    } catch {
      toast.error("Couldn't render the image. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/player/${profile.handle}`);
      toast.success("Card link copied");
    } catch {
      toast.error("Copy failed — you can copy the URL from the address bar.");
    }
  }

  async function share() {
    const url = `${window.location.origin}/player/${profile.handle}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Codeforces Cards", text: `${profile.handle} — OVR ${profile.ovr}`, url });
        return;
      } catch {
        return;
      }
    }
    await copyLink();
  }

  return (
    <>
      <div className="space-y-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-md">
          <Button onClick={() => void download()} disabled={busy} className="rounded-r-none font-display uppercase">
            <Download className="h-4 w-4" /> {busy ? "Preparing…" : "Download PNG"}
          </Button>
          <label className="relative border-l border-primary-foreground/25 bg-primary text-primary-foreground">
            <span className="sr-only">Download format</span>
            <select value={format} onChange={(event) => setFormat(event.target.value as typeof format)} className="h-9 appearance-none bg-transparent py-2 pl-3 pr-8 text-xs font-semibold uppercase outline-none">
              <option value="card">Front</option><option value="back">Back</option><option value="both">Both</option><option value="story">Story</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => void share()}><Share2 className="h-4 w-4" /> Share</Button>
          <Button variant="secondary" onClick={() => void copyLink()}><Link2 className="h-4 w-4" /> Copy link</Button>
        </div>
      </div>
      <div ref={exportRef} className="pointer-events-none fixed -left-[9999px] top-0" aria-hidden>
        <div data-export-card><PlayerCard profile={profile} style={style} width={620} exportMode /></div>
        <div data-export-back style={{ padding: 24, background: "var(--background)" }}><CardBack profile={profile} style={style} width={620} exportMode /></div>
        <div data-export-both style={{ display: "flex", gap: 28, padding: 28, background: "var(--background)" }}><PlayerCard profile={profile} style={style} width={560} /><CardBack profile={profile} style={style} width={560} exportMode /></div>
        <div data-export-story style={{ width: 1080, height: 1920, display: "grid", placeItems: "center", background: "var(--background)" }}><PlayerCard profile={profile} style={style} width={760} /></div>
      </div>
    </>
  );
}

export function CustomizePanel({ value, onChange, defaultTier }: { value: CardStyleOptions; onChange: (value: CardStyleOptions) => void; defaultTier: Tier }) {
  return (
    <details className="border-t border-border/60 pt-3 text-sm text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs hover:text-foreground"><Sliders className="h-4 w-4" /> Card appearance</summary>
      <div className="mt-3 space-y-3">
        <Choice label="Frame theme" options={TIERS} active={value.tier ?? defaultTier} onPick={(tier) => onChange({ ...value, tier: tier as Tier })} />
        <Choice label="Frame" options={["classic", "sharp", "soft"]} active={value.frame ?? "classic"} onPick={(frame) => onChange({ ...value, frame: frame as CardStyleOptions["frame"] })} />
        <Choice label="Background" options={["rays", "grid", "plain"]} active={value.pattern ?? "rays"} onPick={(pattern) => onChange({ ...value, pattern: pattern as CardStyleOptions["pattern"] })} />
      </div>
    </details>
  );
}

function Choice({ label, options, active, onPick }: { label: string; options: readonly string[]; active: string; onPick: (value: string) => void }) {
  return <div><p className="mb-1 text-xs">{label}</p><div className="flex flex-wrap gap-1">{options.map((option) => <button key={option} type="button" onClick={() => onPick(option)} className={cn("border-b px-2 py-1 text-xs capitalize", active === option ? "border-primary text-primary" : "border-transparent hover:text-foreground")}>{option}</button>)}</div></div>;
}

export function PlayerProfileView({ profile }: { profile: PlayerProfile }) {
  const [style, setStyle] = useState<CardStyleOptions>({});
  const stats = profile.stats;
  const trend = profile.form.slice(0, 5).reduce((sum, form) => sum + form.delta, 0);
  const fromPeak = stats.currentRating && stats.maxRating ? stats.currentRating - stats.maxRating : 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-14 lg:items-start">
        <div className="flex flex-col items-center lg:sticky lg:top-24">
          <FlipCard profile={profile} style={style} width={320} reveal />
          <Identity profile={profile} className="mt-7 w-full lg:hidden" />
          <div className="mt-6 w-full max-w-sm lg:mt-8">
            <OvrSummary profile={profile} />
            <div className="mt-4 hidden lg:block"><CardActions profile={profile} style={style} /></div>
            <div className="mt-4 hidden lg:block"><CustomizePanel value={style} onChange={setStyle} defaultTier={profile.tier} /></div>
          </div>
        </div>

        <main className="min-w-0 space-y-9">
          <Identity profile={profile} className="hidden lg:block" />
          <StatisticsPanel profile={profile} />
          <Attributes profile={profile} />
          <section aria-labelledby="rating-history-title">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
              <SectionHeading>Rating history</SectionHeading>
              <div className="hidden items-end gap-6 sm:flex">
                {[["Current", stats.currentRating || "—"], ["Peak", stats.maxRating || "—"], ["From peak", stats.currentRating && stats.maxRating ? `${fromPeak > 0 ? "+" : ""}${fromPeak}` : "—"]].map(([label, value]) => (
                  <div key={label} className="text-right"><p className="text-[11px] uppercase text-muted-foreground">{label}</p><p className="font-display text-lg font-bold tabular-nums">{value}</p></div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-border/60 border-y border-border/60 py-2 sm:hidden">
              {[["Current", stats.currentRating || "—"], ["Peak", stats.maxRating || "—"], ["From peak", stats.currentRating && stats.maxRating ? `${fromPeak > 0 ? "+" : ""}${fromPeak}` : "—"]].map(([label, value]) => <div key={label} className="px-2 text-center"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="font-display font-bold tabular-nums">{value}</p></div>)}
            </div>
            <div className="mt-3"><RatingChart data={profile.history} /></div>
          </section>

          <section aria-label="Card actions" className="space-y-4 lg:hidden">
            <CardActions profile={profile} style={style} />
            <CustomizePanel value={style} onChange={setStyle} defaultTier={profile.tier} />
          </section>

          <Tabs defaultValue="form" id="playstyle">
            <TabsList className="flex h-auto w-full justify-start overflow-x-auto border-b border-border/60 bg-transparent p-0">
              {["form", "analysis", "achievements", "evolution"].map((tab) => <TabsTrigger key={tab} value={tab} className="rounded-none border-b-2 border-transparent px-3 py-3 font-display text-xs uppercase data-[state=active]:border-primary data-[state=active]:bg-transparent">{tab}</TabsTrigger>)}
            </TabsList>
            <TabsContent value="form" className="mt-4">
              <div className="flex items-center justify-between"><SectionHeading>Recent form</SectionHeading><span className="flex items-center gap-2 text-xs text-muted-foreground">Last 5 <DeltaPill delta={trend} /></span></div>
              {profile.form.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No rated contests yet.</p> : <ul className="mt-3 divide-y divide-border/60">{profile.form.map((form) => <li key={form.contestId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"><div className="min-w-0"><p className="truncate font-medium">{form.name}</p><p className="text-xs text-muted-foreground">{form.date} · rank #{form.rank.toLocaleString()}</p></div><div className="flex shrink-0 items-center gap-3"><DeltaPill delta={form.delta} /><span className="font-display tabular-nums text-muted-foreground">{form.newRating}</span></div></li>)}</ul>}
            </TabsContent>
            <TabsContent value="analysis" className="mt-5 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2"><div><h3 className="font-display font-semibold uppercase">Strengths</h3><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{profile.strengths.map((item) => <li key={item}>• {item}</li>)}</ul></div><div><h3 className="font-display font-semibold uppercase">Development areas</h3><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{profile.weaknesses.map((item) => <li key={item}>• {item}</li>)}</ul></div></div>
              <div><h3 className="font-display font-semibold uppercase">Playstyle</h3><div className="mt-3 divide-y divide-border/60">{profile.badges.map((badge) => <div key={badge.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-2 text-sm"><span className="font-medium">{badge.label}</span><span className="text-right text-muted-foreground">{badge.reason}</span></div>)}</div></div>
              <div><h3 className="font-display font-semibold uppercase">Top tags</h3><p className="mt-2 text-sm text-muted-foreground">{stats.topTags.length ? stats.topTags.map((tag) => `${tag.tag} (${tag.count})`).join(" · ") : "No tagged solves yet."}</p></div>
            </TabsContent>
            <TabsContent value="achievements" className="mt-5"><div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">{profile.achievements.map((achievement) => <div key={achievement.label} className={cn("border-b border-border/60 py-3", !achievement.unlocked && "opacity-40")}><p className="font-display text-sm font-semibold uppercase">{achievement.label}</p><p className="text-xs text-muted-foreground">{achievement.detail}</p></div>)}</div></TabsContent>
            <TabsContent value="evolution" className="mt-5"><SectionHeading>Card evolution</SectionHeading><p className="mt-1 text-sm text-muted-foreground">Historical OVR using data available at each year end.</p><ol className="mt-4 divide-y divide-border/60">{profile.evolution.map((entry) => <li key={entry.year} className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-4 py-3"><span className="font-display text-sm text-muted-foreground">{entry.year}</span><div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${entry.ovr}%` }} /></div><span className="text-right font-display text-lg font-bold">{entry.ovr}</span></li>)}</ol></TabsContent>
          </Tabs>

          <nav aria-label="Related player pages" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-5 text-sm text-muted-foreground">
            <Link to="/compare" search={{ a: profile.handle }} className="hover:text-foreground hover:underline">Compare with a friend</Link>
            <Link to="/leaderboard" className="hover:text-foreground hover:underline">See leaderboard</Link>
          </nav>
        </main>
      </div>
    </div>
  );
}
