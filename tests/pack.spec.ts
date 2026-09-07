import { expect, test } from "@playwright/test";
import { stubCodeforces, submitHandle } from "./fixtures/codeforces";

/**
 * Regression tests for the pack reveal.
 *
 * The reveal used to hang on "Opening…" whenever the requested handle was
 * already in the React Query cache: the handle and its data changed in the
 * same render, so the effect that scheduled the reveal read a stale phase,
 * bailed, and never re-ran. It only reproduces when the cache is warm *and*
 * the page is reached by client-side navigation — a full page load throws the
 * in-memory cache away and hides the bug, which is why it looked like it only
 * affected certain usernames.
 */

// The card is only fully revealed once "Full profile" exists. Asserting on the
// handle text instead would match the "TRY tourist" chip in the form and pass
// even while the pack is stuck.
const revealed = (page: import("@playwright/test").Page) =>
  page.getByRole("link", { name: /full profile/i });

test.beforeEach(async ({ context }) => {
  await stubCodeforces(context);
});

test("reveals a card for a handle that is not cached", async ({ page }) => {
  await page.goto("/pack");
  await submitHandle(page, "demo_solver", /open pack/i);

  await expect(revealed(page)).toBeVisible();
  await expect(page.getByText("Opening…")).toBeHidden();
});

test("reveals a card for a handle the landing page already cached", async ({ page }) => {
  // Warm the cache exactly as a visitor does: the landing page loads its
  // showcase handles, one of which is served as demo_solver. Wait for a card
  // to actually render — waiting for a static heading would race ahead of the
  // queries and leave the cache cold, which is precisely the state where the
  // bug does NOT reproduce.
  await page.goto("/");
  await expect(page.getByText("DEMO_SOLVER").first()).toBeVisible({ timeout: 20_000 });

  // Client-side navigation, so the query cache survives.
  await page.locator('header a[href="/pack"]').first().click();
  await expect(page.getByText("Sealed pack")).toBeVisible();

  await submitHandle(page, "tourist", /open pack/i);

  await expect(revealed(page)).toBeVisible();
  await expect(page.getByText("Opening…")).toBeHidden();
});

test("replays the reveal when the same handle is opened twice", async ({ page }) => {
  await page.goto("/pack");

  await submitHandle(page, "demo_grinder", /open pack/i);
  await expect(revealed(page)).toBeVisible();

  // Submitting the identical handle used to be a no-op state update, leaving
  // the previous card on screen with no reveal.
  await submitHandle(page, "demo_grinder", /open pack/i);
  await expect(revealed(page)).toBeVisible();
});

test("shows a friendly message when the handle does not exist", async ({ page, context }) => {
  await context.route("**/codeforces.com/api/user.info**", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        status: "FAILED",
        comment: "handles: User with handle nope not found",
      }),
    }),
  );

  await page.goto("/pack");
  await submitHandle(page, "nope", /open pack/i);

  await expect(page.getByText(/couldn't find that codeforces handle/i)).toBeVisible();
  await expect(page.getByText("Opening…")).toBeHidden();
});
