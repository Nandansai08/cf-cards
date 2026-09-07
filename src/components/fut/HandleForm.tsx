import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EXAMPLES = ["tourist", "jiangly", "Um_nik", "Benq", "SecondThread"];

export function HandleForm({
  onSubmit,
  initial = "",
  cta = "Generate Card",
  placeholder = "Enter a Codeforces handle…",
  showExamples = true,
  busy = false,
  className,
}: {
  onSubmit: (handle: string) => void;
  initial?: string;
  cta?: string;
  placeholder?: string;
  showExamples?: boolean;
  busy?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(initial);

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (v) onSubmit(v);
  }

  return (
    <div className={cn("w-full", className)}>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="none"
            aria-label="Codeforces handle"
            className="h-14 rounded-xl border-border/70 bg-surface/70 pl-11 font-display text-base tracking-wide backdrop-blur placeholder:text-muted-foreground/70 focus-visible:ring-primary"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={busy || !value.trim()}
          className="h-14 rounded-xl px-8 font-display text-base font-bold uppercase tracking-[0.12em]"
        >
          {busy ? "Loading…" : cta}
        </Button>
      </form>
      {showExamples && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="uppercase tracking-widest">Try</span>
          {EXAMPLES.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => {
                setValue(h);
                onSubmit(h);
              }}
              className="rounded-full border border-border/70 bg-surface/60 px-3 py-1 font-display tracking-wide text-foreground/80 transition-colors hover:border-primary hover:text-primary"
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
