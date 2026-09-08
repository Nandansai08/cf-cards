import { expect, test } from "@playwright/test";
import { stubCodeforces } from "./fixtures/codeforces";

/**
 * The home page used to render a loading skeleton whenever a showcase card
 * failed, so one refused request left a grey rectangle in the hero that never
 * resolved and never explained itself. Failure has to look like failure.
 */

/** Refuses every Codeforces call, the way a rate limit or a dropped link does. */
const breakApi = (page: import("@playwright/test").Page) =>
  page.route("**/codeforces.com/api/**", (route) => route.abort("failed"));

test.beforeEach(async ({ context }) => {
  await stubCodeforces(context);
});

test("says so when the example cards can't be built", async ({ page }) => {
  await breakApi(page);

  await page.goto("/");

  await expect(page.getByText(/codeforces didn't answer/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: /try again/i }).first()).toBeVisible();
});

test("recovers when Codeforces comes back", async ({ page }) => {
  await breakApi(page);
  await page.goto("/");
  await expect(page.getByText(/codeforces didn't answer/i).first()).toBeVisible({
    timeout: 20_000,
  });

  // Drop the failing override; the context-level stub answers again.
  await page.unroute("**/codeforces.com/api/**");
  await page
    .getByRole("button", { name: /try again/i })
    .first()
    .click();

  await expect(page.getByText("DEMO_SOLVER").first()).toBeVisible({ timeout: 20_000 });
});

test("loads no analytics unless a measurement ID is configured", async ({ page }) => {
  // The ID is set only by the deploy workflow. A hardcoded one would send
  // every fork's and every contributor's traffic to somebody else's property.
  const gtag: string[] = [];
  page.on("request", (r) => {
    if (/googletagmanager|google-analytics/.test(r.url())) gtag.push(r.url());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  expect(gtag).toEqual([]);
});
