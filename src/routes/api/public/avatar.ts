import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOSTS = new Set([
  "userpic.codeforces.org",
  "userpic.codeforces.com",
  "codeforces.org",
  "codeforces.com",
  "sta.codeforces.com",
]);

/**
 * Same-origin image proxy for Codeforces avatars.
 * Codeforces serves user pictures without CORS headers, which breaks canvas
 * based PNG export. Only known Codeforces hosts are proxied.
 */
export const Route = createFileRoute("/api/public/avatar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("url");
        if (!raw) return new Response("Missing url", { status: 400 });
        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("Bad url", { status: 400 });
        }
        if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
          return new Response("Host not allowed", { status: 400 });
        }
        const upstream = await fetch(target.toString(), {
          headers: {
            accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "user-agent": "Mozilla/5.0 (compatible; CodeforcesFUT/1.0)",
            referer: "https://codeforces.com/",
          },
        });
        if (!upstream.ok || !upstream.body) {
          return new Response(null, {
            status: 204,
            headers: { "cache-control": "public, max-age=300" },
          });
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
            "cache-control": "public, max-age=86400",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
