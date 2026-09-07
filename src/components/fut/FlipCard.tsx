import { useRef, useState } from "react";
import { PlayerCard, cardRadius, type CardStyleOptions } from "./PlayerCard";
import { CardBack } from "./CardBack";
import type { PlayerProfile } from "@/lib/fut";
import { cn } from "@/lib/utils";

interface Props {
  profile: PlayerProfile;
  style?: CardStyleOptions;
  width?: number;
  reveal?: boolean;
  className?: string;
}

/** True 3D collectible flip: identical geometry on both faces. */
export function FlipCard({ profile, style, width = 320, reveal = false, className }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [hinted, setHinted] = useState(false);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  const radius = cardRadius(style?.frame ?? "classic", width / 320);

  function toggle() {
    setFlipped((f) => !f);
    setHinted(true);
  }

  return (
    <div className={cn("relative", className)} style={{ width }}>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? "Flip player card back to the front."
            : "Flip player card to view detailed statistics."
        }
        className="flip-perspective relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ width, aspectRatio: "0.72", borderRadius: radius }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
        }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          if (!s) return;
          // Ignore drags/scroll gestures and clicks on inner controls.
          const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
          if (moved > 10 || Date.now() - s.t > 600) return;
          if ((e.target as HTMLElement).closest("button,a,input")) return;
          toggle();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className={cn("flip-inner", flipped && "is-flipped")} style={{ borderRadius: radius }}>
          <div className="flip-face">
            <PlayerCard profile={profile} style={style} width={width} reveal={reveal} noHover />
          </div>
          <div className="flip-face flip-face-back">
            <CardBack profile={profile} style={style} width={width} />
          </div>
        </div>
      </div>

      {!hinted && (
        <p
          aria-hidden
          className="pointer-events-none mt-2 text-center font-display text-[10px] uppercase tracking-[0.28em] text-muted-foreground"
        >
          Tap to flip
        </p>
      )}
    </div>
  );
}
