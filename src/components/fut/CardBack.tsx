import { useState } from "react";
import { ATTR_ORDER, ATTR_WEIGHTS, TIER_META, type PlayerProfile } from "@/lib/fut";
import { CardShell, type CardStyleOptions } from "./PlayerCard";

interface Props {
  profile: PlayerProfile;
  style?: CardStyleOptions | undefined;
  width?: number;
  /** Static render for PNG export: no interactive methodology toggle. */
  exportMode?: boolean;
}

/** Compact inline sparkline of the whole rating history. */
function Sparkline({ points, width, height }: { points: number[]; width: number; height: number }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - ((p - min) / span) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path
        d={`${d} L${width},${height} L0,${height} Z`}
        fill="currentColor"
        opacity={0.18}
      />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.6} opacity={0.95} />
    </svg>
  );
}

export function CardBack({ profile, style, width = 320, exportMode = false }: Props) {
  const tier = style?.tier ?? profile.tier;
  const s = width / 320;
  const [methodOpen, setMethodOpen] = useState(false);
  const st = profile.stats;

  const rows: [string, string | number][] = [
    ["Rating", st.currentRating || "—"],
    ["Peak", st.maxRating || "—"],
    ["Contests", st.contests],
    ["Solved", st.solved],
    ["Avg diff", st.avgSolvedRating || "—"],
    ["Hardest", st.hardestSolved || "—"],
    ["2200+", st.solved2200],
    ["Best rank", st.bestRank ?? "—"],
  ];

  const hist = profile.history.map((h) => h.rating);
  const form = profile.form.slice(0, 3);
  const badges = profile.badges.slice(0, 5);
  const earned = profile.achievements.filter((a) => a.unlocked).slice(0, 8);

  const line = "color-mix(in oklab, currentColor 22%, transparent)";

  return (
    <CardShell
      tier={tier}
      frame={style?.frame ?? "classic"}
      pattern={style?.pattern ?? "rays"}
      glow={style?.glow ?? true}
      width={width}
    >
      <div className="relative flex h-full flex-col">
        {/* header */}
        <div
          className="flex items-baseline justify-between border-b pb-1"
          style={{ borderColor: line }}
        >
          <span
            className="font-display font-bold uppercase"
            style={{ fontSize: 12 * s, letterSpacing: "0.06em" }}
          >
            {profile.handle}
          </span>
          <span
            className="font-display font-bold uppercase tabular-nums"
            style={{ fontSize: 10 * s, letterSpacing: "0.12em", opacity: 0.85 }}
          >
            {profile.ovr} {TIER_META[tier].label}
          </span>
        </div>

        {/* player data */}
        <Section label="Player data" s={s} line={line}>
          <div className="grid grid-cols-2" style={{ rowGap: 1.5 * s, columnGap: 12 * s }}>
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between" style={{ gap: 6 * s }}>
                <span
                  className="font-display uppercase"
                  style={{ fontSize: 8.5 * s, letterSpacing: "0.12em", opacity: 0.7 }}
                >
                  {label}
                </span>
                <span
                  className="font-display font-bold tabular-nums"
                  style={{ fontSize: 12 * s }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* performance */}
        <Section label="Performance" s={s} line={line}>
          {hist.length > 1 ? (
            <Sparkline points={hist} width={292 * s} height={30 * s} />
          ) : (
            <p className="font-display" style={{ fontSize: 9 * s, opacity: 0.7 }}>
              No rated contests yet.
            </p>
          )}
          <div style={{ marginTop: 3 * s }}>
            {form.length === 0 && (
              <p className="font-display" style={{ fontSize: 9 * s, opacity: 0.7 }}>
                No recent contest form.
              </p>
            )}
            {form.map((f) => (
              <div
                key={f.contestId}
                className="flex items-baseline justify-between"
                style={{ gap: 6 * s, marginTop: 1.5 * s }}
              >
                <span
                  className="truncate font-display"
                  style={{ fontSize: 9 * s, opacity: 0.8, maxWidth: 190 * s }}
                >
                  {f.name}
                </span>
                <span
                  className="font-display tabular-nums"
                  style={{ fontSize: 9 * s, opacity: 0.65 }}
                >
                  #{f.rank}
                </span>
                <span
                  className="font-display font-bold tabular-nums"
                  style={{ fontSize: 10 * s }}
                >
                  {f.delta > 0 ? "+" : ""}
                  {f.delta}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* playstyle */}
        <Section label="Playstyle" s={s} line={line}>
          <div className="flex flex-wrap" style={{ gap: 3 * s }}>
            {badges.map((b) => (
              <span
                key={b.label}
                className="font-display font-bold uppercase"
                style={{
                  fontSize: 8 * s,
                  letterSpacing: "0.1em",
                  border: `${Math.max(1, s)}px solid ${line}`,
                  padding: `${2 * s}px ${5 * s}px`,
                }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </Section>

        {/* achievements */}
        <Section label="Achievements" s={s} line={line}>
          {earned.length === 0 ? (
            <p className="font-display" style={{ fontSize: 9 * s, opacity: 0.7 }}>
              None earned yet.
            </p>
          ) : (
            <div className="flex flex-wrap" style={{ gap: 3 * s }}>
              {earned.map((a) => (
                <span
                  key={a.label}
                  title={a.detail}
                  className="font-display font-semibold uppercase"
                  style={{
                    fontSize: 7.5 * s,
                    letterSpacing: "0.08em",
                    opacity: 0.9,
                    background: "color-mix(in oklab, black 20%, transparent)",
                    padding: `${2 * s}px ${5 * s}px`,
                  }}
                >
                  {a.label}
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* footer */}
        <div
          className="mt-auto flex items-center justify-between border-t"
          style={{ borderColor: line, paddingTop: 5 * s }}
        >
          <span
            className="font-display font-bold uppercase"
            style={{ fontSize: 8.5 * s, letterSpacing: "0.16em", opacity: 0.8 }}
          >
            Codeforces Cards
          </span>
          {exportMode ? (
            <span
              className="font-display uppercase"
              style={{ fontSize: 8 * s, letterSpacing: "0.1em", opacity: 0.7 }}
            >
              Calculated metric — not official
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMethodOpen(true);
              }}
              className="font-display font-bold uppercase underline underline-offset-2"
              style={{ fontSize: 8.5 * s, letterSpacing: "0.1em", opacity: 0.9 }}
            >
              How OVR works
            </button>
          )}
        </div>

        {/* methodology overlay — stays inside the card, never resizes it */}
        {methodOpen && !exportMode && (
          <div
            className="absolute inset-0 flex flex-col"
            style={{
              background: "color-mix(in oklab, black 82%, transparent)",
              padding: 14 * s,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <span
                className="font-display font-bold uppercase"
                style={{ fontSize: 11 * s, letterSpacing: "0.12em" }}
              >
                How OVR works
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMethodOpen(false);
                }}
                className="font-display font-bold uppercase"
                style={{ fontSize: 9 * s, letterSpacing: "0.1em", opacity: 0.85 }}
              >
                Close
              </button>
            </div>
            <div style={{ marginTop: 8 * s, fontSize: 8.5 * s, lineHeight: 1.5, opacity: 0.92 }}>
              <p className="font-display">
                OVR ={" "}
                {ATTR_ORDER.map((k) => `${ATTR_WEIGHTS[k].toFixed(2)}·${k}`).join(" + ")}
              </p>
              <p style={{ marginTop: 6 * s }}>
                Each attribute is a deterministic function of your public Codeforces data — rating,
                contest results, solved-problem difficulty, tag spread and activity months. Volume is
                log-scaled so huge counts add diminishing value. Same handle, same history, same card.
              </p>
              <p style={{ marginTop: 6 * s, fontWeight: 600 }}>
                Codeforces Cards OVR is a calculated metric based on public Codeforces data. It is not an
                official Codeforces rating.
              </p>
            </div>
          </div>
        )}
      </div>
    </CardShell>
  );
}

function Section({
  label,
  s,
  line,
  children,
}: {
  label: string;
  s: number;
  line: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 7 * s }}>
      <p
        className="font-display font-bold uppercase"
        style={{
          fontSize: 8 * s,
          letterSpacing: "0.2em",
          opacity: 0.6,
          borderBottom: `${Math.max(1, s)}px solid ${line}`,
          paddingBottom: 2 * s,
          marginBottom: 4 * s,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
