import { useEffect, useState } from "react";
import { ATTR_ORDER, TIER_META, tierClass, type PlayerProfile, type Tier } from "@/lib/fut";
import { avatarUrl, countryFlagEmoji } from "@/lib/codeforces";
import { cn } from "@/lib/utils";

export interface CardStyleOptions {
  tier?: Tier | undefined;
  frame?: "classic" | "sharp" | "soft" | undefined;
  pattern?: "rays" | "grid" | "plain" | undefined;
  glow?: boolean | undefined;
}

interface Props {
  profile: PlayerProfile;
  style?: CardStyleOptions | undefined;
  /** Base width in px. Card scales proportionally. */
  width?: number;
  reveal?: boolean;
  className?: string;
  /** Adds extra padding + backdrop for social/PNG export. */
  exportMode?: boolean;
  /** Disables the hover lift (used inside the flip container). */
  noHover?: boolean | undefined;
}

const PATTERNS: Record<NonNullable<CardStyleOptions["pattern"]>, string> = {
  rays: "repeating-conic-gradient(from 0deg at 50% 18%, color-mix(in oklab, white 12%, transparent) 0deg 6deg, transparent 6deg 14deg)",
  grid: "linear-gradient(color-mix(in oklab, white 10%, transparent) 1px, transparent 1px) 0 0/22px 22px, linear-gradient(90deg, color-mix(in oklab, white 10%, transparent) 1px, transparent 1px) 0 0/22px 22px",
  plain:
    "radial-gradient(80% 60% at 50% 0%, color-mix(in oklab, white 16%, transparent), transparent 70%)",
};

/** Radius used by every face of the card so front/back match exactly. */
export function cardRadius(frame: NonNullable<CardStyleOptions["frame"]>, scale: number) {
  return (frame === "sharp" ? 6 : frame === "soft" ? 34 : 18) * scale;
}

/**
 * The physical card body: identical dimensions, radius, border, texture and
 * rarity treatment for both the front and the back face.
 */
export function CardShell({
  tier,
  frame = "classic",
  pattern = "rays",
  glow = true,
  width,
  reveal = false,
  hover = false,
  className,
  children,
}: {
  tier: Tier;
  frame?: NonNullable<CardStyleOptions["frame"]>;
  pattern?: NonNullable<CardStyleOptions["pattern"]>;
  glow?: boolean;
  width: number;
  reveal?: boolean;
  hover?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const s = width / 320;
  return (
    <div
      className={cn(
        tierClass(tier),
        "card-shell card-sheen relative overflow-hidden transition-transform duration-500",
        reveal && "animate-reveal",
        hover && "group-hover:-translate-y-2",
        className,
      )}
      style={{
        width,
        aspectRatio: "0.72",
        borderRadius: cardRadius(frame, s),
        padding: 14 * s,
        boxShadow: glow ? undefined : "0 24px 60px -30px oklch(0 0 0 / 0.8)",
      }}
    >
      {/* pattern layer */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: PATTERNS[pattern], mixBlendMode: "soft-light" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 45%, color-mix(in oklab, black 22%, transparent))",
        }}
      />
      {children}
    </div>
  );
}

export function PlayerCard({
  profile,
  style,
  width = 320,
  reveal = false,
  className,
  exportMode = false,
  noHover = false,
}: Props) {
  const tier = style?.tier ?? profile.tier;
  const frame = style?.frame ?? "classic";
  const pattern = style?.pattern ?? "rays";
  const glow = style?.glow ?? true;
  const s = width / 320; // scale factor
  const avatar = avatarUrl(profile.data.info);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const flag = countryFlagEmoji(profile.data.info.country);

  useEffect(() => {
    if (!avatar || exportMode) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    void fetch(avatar, { signal: controller.signal })
      .then((response) => {
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/"))
          return null;
        return response.blob();
      })
      .then((blob) => {
        if (!blob || controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setAvatarSrc(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatar, exportMode]);

  return (
    <div
      className={cn("group relative select-none", exportMode && "p-6", className)}
      style={{ width: exportMode ? width + 48 : width }}
    >
      {exportMode && (
        <div
          className="absolute inset-0 rounded-[28px]"
          style={{ background: "var(--background)", backgroundImage: "var(--gradient-hero)" }}
        />
      )}
      <CardShell
        tier={tier}
        frame={frame}
        pattern={pattern}
        glow={glow}
        width={width}
        reveal={reveal}
        hover={!exportMode && !noHover}
      >
        {/* header: OVR + position + avatar */}
        <div className="relative flex items-start justify-between" style={{ gap: 8 * s }}>
          <div className="flex flex-col items-center" style={{ minWidth: 74 * s }}>
            <span
              className="font-display font-bold leading-none tabular-nums"
              style={{ fontSize: 56 * s }}
            >
              {profile.ovr}
            </span>
            <span
              className="font-display font-semibold leading-none"
              style={{ fontSize: 13 * s, letterSpacing: 0.06 * 13 * s }}
            >
              {profile.position}
            </span>
            <span
              className="mt-1 block rounded-full"
              style={{
                width: 34 * s,
                height: 2 * s,
                background: "currentColor",
                opacity: 0.45,
              }}
            />
            <span
              className="font-display font-semibold uppercase"
              style={{ fontSize: 9 * s, marginTop: 5 * s, opacity: 0.75 }}
            >
              {TIER_META[tier].label}
            </span>
          </div>

          <div
            className="relative shrink-0 overflow-hidden"
            style={{
              width: 132 * s,
              height: 132 * s,
              borderRadius: 12 * s,
              background: "color-mix(in oklab, black 18%, transparent)",
            }}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="" loading="eager" className="h-full w-full object-cover" />
            ) : (
              <div
                aria-label={`${profile.handle} initials`}
                className="flex h-full w-full items-center justify-center border border-current/20 font-display font-bold"
                style={{ fontSize: 44 * s }}
              >
                {profile.handle
                  .replace(/[^A-Za-z0-9]/g, "")
                  .slice(0, 2)
                  .toUpperCase() || "CF"}
              </div>
            )}
          </div>
        </div>

        {/* name band */}
        <div className="relative" style={{ marginTop: 8 * s }}>
          <div
            className="flex items-center justify-center gap-2 border-y text-center"
            style={{
              borderColor: "color-mix(in oklab, currentColor 30%, transparent)",
              paddingTop: 5 * s,
              paddingBottom: 5 * s,
            }}
          >
            <span
              className="font-display font-bold uppercase leading-none"
              style={{
                fontSize: Math.min(24, 260 / Math.max(6, profile.handle.length) + 6) * s,
                letterSpacing: "0.02em",
              }}
            >
              {profile.handle}
            </span>
          </div>
          <div
            className="flex items-center justify-center gap-2 font-display uppercase"
            style={{ fontSize: 10 * s, marginTop: 5 * s, opacity: 0.85 }}
          >
            <span>{profile.stats.rank}</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span className="tabular-nums">{profile.stats.currentRating || "unrated"}</span>
            {flag && (
              <>
                <span style={{ opacity: 0.5 }}>•</span>
                <span>
                  {flag} {profile.data.info.country}
                </span>
              </>
            )}
          </div>
        </div>

        {/* attributes */}
        <div
          className="relative grid grid-cols-2"
          style={{ marginTop: 10 * s, rowGap: 3 * s, columnGap: 14 * s }}
        >
          {ATTR_ORDER.map((k) => (
            <div key={k} className="flex items-center justify-between" style={{ gap: 6 * s }}>
              <span
                className="font-display font-bold tabular-nums"
                style={{ fontSize: 17 * s, minWidth: 26 * s }}
              >
                {profile.attrs[k]}
              </span>
              <span
                className="font-display font-semibold"
                style={{ fontSize: 12 * s, opacity: 0.8, letterSpacing: "0.08em" }}
              >
                {k}
              </span>
              <span
                className="flex-1 overflow-hidden rounded-full"
                style={{ height: 3 * s, background: "color-mix(in oklab, black 22%, transparent)" }}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${profile.attrs[k]}%`,
                    background: "currentColor",
                    opacity: 0.85,
                  }}
                />
              </span>
            </div>
          ))}
        </div>

        {/* footer */}
        <div
          className="absolute inset-x-0 flex items-center justify-between"
          style={{ bottom: 10 * s, paddingInline: 16 * s }}
        >
          <span
            className="font-display font-bold uppercase"
            style={{ fontSize: 8.5 * s, letterSpacing: "0.16em", opacity: 0.8 }}
          >
            Codeforces Cards
          </span>
          <span
            className="font-display font-semibold tabular-nums"
            style={{ fontSize: 8.5 * s, letterSpacing: "0.1em", opacity: 0.8 }}
          >
            POT {profile.potential}
          </span>
        </div>
      </CardShell>
    </div>
  );
}

export function PlayerCardSkeleton({ width = 320 }: { width?: number }) {
  return (
    <div
      className="animate-pulse rounded-[18px] border border-border/60 bg-surface/70"
      style={{ width, aspectRatio: "0.72" }}
    />
  );
}
