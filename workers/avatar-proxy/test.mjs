/**
 * Unit tests for the avatar proxy.
 *
 *   node --test workers/avatar-proxy
 *
 * The host allow-list is the security boundary here — without it this Worker
 * is an open proxy — so it is tested rather than assumed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "./index.js";

const PIXEL = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);

/** Replaces global fetch for one call and records what the Worker asked for. */
function stubUpstream(response) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return response;
  };
  return calls;
}

const call = (url) => worker.fetch(new Request(url));
const proxied = (target) => `https://proxy.test/?url=${encodeURIComponent(target)}`;

test("refuses a host that is not Codeforces", async () => {
  const res = await call(proxied("https://evil.example/steal.jpg"));
  assert.equal(res.status, 403);
});

test("refuses a look-alike host", async () => {
  const res = await call(proxied("https://codeforces.com.evil.example/x.jpg"));
  assert.equal(res.status, 403);
});

test("refuses plain http", async () => {
  const res = await call(proxied("http://userpic.codeforces.org/x.jpg"));
  assert.equal(res.status, 403);
});

test("refuses a request with no url", async () => {
  const res = await call("https://proxy.test/");
  assert.equal(res.status, 400);
});

test("refuses anything that is not an image", async () => {
  stubUpstream(new Response("<html>blocked</html>", { headers: { "content-type": "text/html" } }));
  const res = await call(proxied("https://userpic.codeforces.org/1/title/a.jpg"));
  assert.equal(res.status, 415);
});

test("reports an upstream refusal rather than pretending it worked", async () => {
  stubUpstream(new Response("no", { status: 403 }));
  const res = await call(proxied("https://userpic.codeforces.org/1/title/a.jpg"));
  assert.equal(res.status, 502);
});

test("asks Codeforces as Codeforces, and returns the image cross-origin", async () => {
  const calls = stubUpstream(new Response(PIXEL, { headers: { "content-type": "image/jpeg" } }));
  const res = await call(proxied("https://userpic.codeforces.org/1/title/a.jpg"));

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/jpeg");
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  assert.equal(res.headers.get("cross-origin-resource-policy"), "cross-origin");
  // The entire reason this Worker exists.
  assert.equal(calls[0].init.headers.referer, "https://codeforces.com/");
});

test("accepts a subdomain of an allowed domain", async () => {
  stubUpstream(new Response(PIXEL, { headers: { "content-type": "image/png" } }));
  const res = await call(proxied("https://userpic.codeforces.com/1/avatar/a.png"));
  assert.equal(res.status, 200);
});
