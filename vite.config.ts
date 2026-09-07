// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * `npm run build` produces the normal server-rendered build.
 *
 * `npm run build:pages` sets PAGES_BUILD=1 and switches to a fully static
 * single-page build instead, because GitHub Pages is a file host with no
 * server to render on: nitro is skipped, TanStack Start emits one prerendered
 * shell, and the client router takes over from there.
 *
 * BASE_PATH is the subpath the site is served from — "/cf-cards/" on Pages,
 * "/" everywhere else.
 */
const isPagesBuild = process.env["PAGES_BUILD"] === "1";
const base = process.env["BASE_PATH"] ?? "/";

export default defineConfig({
  vite: { base },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isPagesBuild ? { spa: { enabled: true }, router: { basepath: base } } : {}),
  },
  ...(isPagesBuild ? { nitro: false as const } : {}),
});
