import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/generate", label: "Generate" },
  { to: "/compare", label: "Compare" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/squad", label: "Squad" },
  { to: "/pack", label: "Pack" },
  { to: "/about", label: "About" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
            CF
          </span>
          <span className="font-display text-base font-bold uppercase tracking-[0.18em]">
            Codeforces <span className="text-gradient-gold">Cards</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-md px-3 py-2 font-display text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname === l.to && "bg-secondary text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="hidden font-display uppercase tracking-wider sm:inline-flex"
          >
            <Link to="/generate">Generate Card</Link>
          </Button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-md border border-border text-foreground lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="animate-rise border-t border-border/60 bg-background/95 px-4 pb-4 pt-2 lg:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "block rounded-md px-3 py-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground",
                pathname === l.to && "bg-secondary text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

const FOOTER_LINKS = [
  { to: "/generate", label: "Generate a card" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/compare", label: "Compare players" },
  { to: "/pack", label: "Open a pack" },
  { to: "/squad", label: "Build a squad" },
  { to: "/about", label: "How it works" },
] as const;

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-display text-sm font-bold uppercase tracking-widest">
            Codeforces Cards
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Competitive-programming player cards built from real contest history. Every rating is
            calculated from public Codeforces data — the same handle always produces the same card.
          </p>
        </div>

        <nav aria-label="Footer" className="text-sm">
          <p className="font-display text-xs font-semibold uppercase tracking-widest">Explore</p>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-sm">
          <p className="font-display text-xs font-semibold uppercase tracking-widest">Project</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <a
                href="https://github.com/Nandansai08/cf-cards"
                className="transition-colors hover:text-foreground"
                rel="noreferrer"
                target="_blank"
              >
                Source on GitHub
              </a>
            </li>
            <li>
              <a
                href="https://codeforces.com/apiHelp"
                className="transition-colors hover:text-foreground"
                rel="noreferrer"
                target="_blank"
              >
                Codeforces API
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Nandansai08/cf-cards/issues"
                className="transition-colors hover:text-foreground"
                rel="noreferrer"
                target="_blank"
              >
                Report an issue
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <p>© {new Date().getFullYear()} Codeforces Cards</p>
          <p>Independent project · Data from the public Codeforces API</p>
        </div>
      </div>
    </footer>
  );
}
