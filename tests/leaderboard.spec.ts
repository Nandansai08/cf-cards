import { expect, test, type Page } from "@playwright/test";
import { stubCodeforces } from "./fixtures/codeforces";

/**
 * The leaderboard ranks the cards generated in this browser. There is no
 * backend, so "generated here" is the honest scope — these tests pin that
 * behaviour: nothing until you make a card, then your cards, ordered.
 */

test.beforeEach(async ({ context }) => {
  await stubCodeforces(context);
});

/** Visiting a player page is what files the card into the local roster. */
async function generate(page: Page, handle: string): Promise<void> {
  await page.goto(`/player/${handle}`);
  await expect(page.getByRole("heading", { name: handle.toUpperCase() })).toBeVisible();
}

test("says so plainly when no cards have been generated yet", async ({ page }) => {
  await page.goto("/leaderboard");

  await expect(page.getByText(/no cards generated in this browser yet/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /make the first one/i })).toBeVisible();
});

test("ranks the cards generated on this device", async ({ page }) => {
  // Three round trips through the real query stack before the assertion.
  test.setTimeout(90_000);
  await generate(page, "demo_riser");
  await generate(page, "demo_solver");

  await page.goto("/leaderboard");

  const rows = page.locator("main ul > li");
  await expect(rows).toHaveCount(2);
  // demo_solver is by far the strongest of the three, so it leads on OVR.
  await expect(rows.first()).toContainText(/demo_solver/i);
  await expect(page.getByRole("button", { name: /cards generated here \(2\)/i })).toBeVisible();
});

test("featured players only offer the ranking their data supports", async ({ page }) => {
  await page.goto("/leaderboard");
  await page.getByRole("button", { name: /featured players/i }).click();

  // Card metrics need a generated card, so OVR-style categories are not on
  // offer here — showing an empty "Highest OVR" table would just look broken.
  await expect(page.getByRole("button", { name: "Highest rating" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Highest OVR" })).toHaveCount(0);
  await expect(page.locator("main ul > li").first()).toBeVisible();
});
