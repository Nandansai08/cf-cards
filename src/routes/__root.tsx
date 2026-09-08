import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Nav, Footer } from "@/components/site/Nav";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Absolute origin + base path of the deployed site.
 *
 * Open Graph, canonical links and the sitemap all need absolute URLs, and the
 * prerendered shell is built with no request to derive one from — so the
 * deploy passes it in and this is the local default.
 */
const SITE_URL = (
  import.meta.env["VITE_SITE_URL"] ?? "https://nandansai08.github.io/cf-cards"
).replace(/\/+$/, "");

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Codeforces Cards — Codeforces player cards" },
      {
        name: "description",
        content:
          "Turn any Codeforces handle into a football-style player card: OVR, six attributes, rarity and badges, all calculated from public contest data.",
      },
      // Google Search Console ownership proof. The DNS-record form of this
      // token can't be used here — github.io isn't ours — so it goes in the
      // prerendered shell, which is what the crawler fetches.
      {
        name: "google-site-verification",
        content: "h8bkfv1nFiD-3KpPbctvJFccsO2CFhPo-VR4TntHBYs",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Codeforces Cards" },
      { name: "application-name", content: "Codeforces Cards" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: `${SITE_URL}/og.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${SITE_URL}/og.png` },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: `${import.meta.env.BASE_URL}favicon.ico`, type: "image/x-icon" },
      { rel: "canonical", href: SITE_URL },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * Google Analytics measurement ID, or "" for no analytics at all.
 *
 * Set by the deploy workflow, so development, tests and anyone who forks this
 * repository send nothing anywhere unless they configure their own property.
 */
const GA_ID = (import.meta.env["VITE_GA_ID"] ?? "").trim();

function Analytics() {
  if (!GA_ID) return null;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
        }}
      />
    </>
  );
}

/**
 * Names the site for search engines.
 *
 * Google takes a result's site name from the domain root, so on a github.io
 * *project* site this is only a hint — the root belongs to GitHub, which is
 * why results read "GitHub Pages documentation". It becomes authoritative the
 * moment the site moves to a custom domain or the owner's user site, and it is
 * correct markup either way.
 */
function SiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Codeforces Cards",
    alternateName: "CF Cards",
    url: `${SITE_URL}/`,
    description:
      "Turn any Codeforces handle into a football-style player card: an OVR rating, six attributes, a rarity tier and badges, calculated from public contest history.",
  };
  return <script type="application/ld+json">{JSON.stringify(schema)}</script>;
}

/**
 * Google AdSense publisher ID, or "" for no ads.
 *
 * Gated the same way as analytics: only the deploy sets it, so development,
 * tests and forks load nothing from an ad network.
 */
const ADSENSE_CLIENT = (import.meta.env["VITE_ADSENSE_CLIENT"] ?? "").trim();

function AdSense() {
  if (!ADSENSE_CLIENT) return null;
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        <SiteSchema />
        <Analytics />
        <AdSense />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
