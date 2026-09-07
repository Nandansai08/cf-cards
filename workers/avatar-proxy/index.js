/**
 * Serves Codeforces user pictures to a browser that isn't on codeforces.com.
 *
 * Codeforces refuses its userpic images to a foreign referer, which is why a
 * card's <img> gets nothing while the same URL opens fine in a tab from the
 * site itself. A public image cache doesn't help — it is refused server-side
 * for the same reason. The fix is a proxy that asks the way Codeforces expects
 * and re-serves the bytes with permissive cross-origin headers.
 *
 * Deploy: see README.md in this directory.
 */

/** Only these domains are proxied. */
const ALLOWED = ["codeforces.com", "codeforces.org"];

/** A user picture changes rarely and its URL contains a content hash. */
const MAX_AGE = 60 * 60 * 24 * 7;

const CORS = {
  "access-control-allow-origin": "*",
  // Without this a browser can refuse the image even though CORS passed.
  "cross-origin-resource-policy": "cross-origin",
};

const fail = (status, message) => new Response(message, { status, headers: CORS });

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET" && request.method !== "HEAD") {
      return fail(405, "Method not allowed");
    }

    const target = new URL(request.url).searchParams.get("url");
    if (!target) return fail(400, "Missing ?url=");

    let upstream;
    try {
      upstream = new URL(target);
    } catch {
      return fail(400, "?url= is not a URL");
    }

    // Host allow-list. Without it this is an open proxy: anyone could point it
    // at any address, including hosts only reachable from inside Cloudflare's
    // network, and spend the account's request quota doing it.
    const host = upstream.hostname.toLowerCase();
    const allowed = ALLOWED.some((d) => host === d || host.endsWith(`.${d}`));
    if (upstream.protocol !== "https:" || !allowed) {
      return fail(403, "Only Codeforces images are proxied");
    }

    const res = await fetch(upstream.toString(), {
      headers: {
        referer: "https://codeforces.com/",
        accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        "user-agent": request.headers.get("user-agent") ?? "Mozilla/5.0",
      },
      cf: { cacheEverything: true, cacheTtl: MAX_AGE },
    });
    if (!res.ok) return fail(502, `Codeforces answered ${res.status}`);

    // An HTML error page would otherwise be handed back as if it were a photo.
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return fail(415, "Upstream did not return an image");

    return new Response(res.body, {
      headers: { ...CORS, "content-type": type, "cache-control": `public, max-age=${MAX_AGE}` },
    });
  },
};
