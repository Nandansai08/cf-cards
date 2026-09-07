import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HandleForm } from "@/components/fut/HandleForm";
import { PlayerCardSkeleton } from "@/components/fut/PlayerCard";

export const Route = createFileRoute("/generate")({
  head: () => ({
    meta: [
      { title: "Generate a Codeforces player card — Codeforces Cards" },
      {
        name: "description",
        content:
          "Type any Codeforces handle to instantly generate a collectible player card with OVR, attributes, rarity and achievements.",
      },
      { property: "og:title", content: "Generate your Codeforces card" },
      {
        property: "og:description",
        content: "One handle in, one Ultimate-Team style card out — built from real contest data.",
      },
    ],
  }),
  component: GeneratePage,
});

function GeneratePage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
        Generate <span className="text-gradient-gold">card</span>
      </h1>
      <p className="mt-3 text-muted-foreground">
        Enter a Codeforces handle. We read only public data: rating, contests and submissions.
      </p>
      <div className="mt-8">
        <HandleForm
          onSubmit={(handle) => void navigate({ to: "/player/$handle", params: { handle } })}
        />
      </div>
      <div className="mt-14 flex justify-center opacity-40">
        <PlayerCardSkeleton width={300} />
      </div>
    </div>
  );
}
