import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HandleForm } from "@/components/fut/HandleForm";
import { PlayerCardSkeleton } from "@/components/fut/PlayerCard";
import { PlayerProfileView } from "@/components/fut/PlayerProfileView";
import { usePlayer } from "@/hooks/usePlayer";
import { saveToRoster } from "@/lib/roster";

export const Route = createFileRoute("/player/$handle")({
  head: ({ params }) => {
    const handle = params.handle;
    const title = `${handle} — Codeforces Cards player card`;
    const description = `${handle}'s Codeforces card: OVR, six attributes, rarity, badges, achievements and rating history from public Codeforces data.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: PlayerPage,
});

function PlayerPage() {
  const { handle } = Route.useParams();
  const navigate = useNavigate();
  const { data, isPending, error } = usePlayer(handle);

  useEffect(() => {
    if (data) saveToRoster(data);
  }, [data]);

  if (isPending) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[340px_1fr]">
        <div className="flex justify-center">
          <PlayerCardSkeleton width={320} />
        </div>
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-surface/60" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface/60" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-surface/60" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <AlertTriangle className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-bold uppercase tracking-wide">
          No card yet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "Couldn't find that Codeforces handle. Check the spelling and try again."}
        </p>
        <div className="mt-8">
          <HandleForm
            initial={handle}
            onSubmit={(h) => void navigate({ to: "/player/$handle", params: { handle: h } })}
            cta="Try again"
          />
        </div>
        <Button asChild variant="secondary" className="mt-6 font-display uppercase tracking-wider">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-7 sm:py-10">
      <PlayerProfileView profile={data} />
    </div>
  );
}
