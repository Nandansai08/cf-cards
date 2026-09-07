import { expect, test } from "@playwright/test";
import { stubCodeforces, submitHandle } from "./fixtures/codeforces";

test.beforeEach(async ({ context }) => {
  await stubCodeforces(context);
});

test("generating a handle lands on its card", async ({ page }) => {
  await page.goto("/generate");
  await submitHandle(page, "demo_solver", /generate card/i);

  await expect(page).toHaveURL(/\/player\/demo_solver$/);
  await expect(page.getByRole("heading", { name: "DEMO_SOLVER" })).toBeVisible();

  // All six attributes, the headline stats and the rating chart.
  for (const attr of ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"]) {
    await expect(page.getByText(new RegExp(`^${attr} —`))).toBeVisible();
  }
  await expect(page.getByText("Key statistics")).toBeVisible();
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
});

test("the same handle always produces the same card", async ({ page }) => {
  await page.goto("/player/demo_solver");
  const first = await page.locator("main").getByText(/^\d+$/).first().innerText();

  await page.reload();
  const second = await page.locator("main").getByText(/^\d+$/).first().innerText();

  // The whole premise of the project: deterministic, never random.
  expect(second).toBe(first);
});

test("rarity is stated, not offered as a choice", async ({ page }) => {
  await page.goto("/player/demo_solver");
  await page.getByText("Card appearance").first().click();

  const panel = page.locator("details", { hasText: "Card appearance" }).first();
  await expect(panel.getByText(/set by your OVR/i)).toBeVisible();

  // Shape and background are cosmetic, so they stay adjustable...
  await expect(panel.getByText("Frame", { exact: true })).toBeVisible();
  await expect(panel.getByText("Background", { exact: true })).toBeVisible();

  // ...but the tier must not be selectable, or the card could claim a rarity
  // the player has not earned.
  await expect(panel.getByText("Frame theme")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: /^legendary$/i })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: /^bronze$/i })).toHaveCount(0);
});

test("an unknown handle explains itself instead of hanging", async ({ page, context }) => {
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

  await page.goto("/player/nope");
  await expect(page.getByText(/couldn't find that codeforces handle/i)).toBeVisible();
});

test("comparing two handles shows both cards and a verdict", async ({ page }) => {
  await page.goto("/compare?a=demo_solver&b=demo_grinder");

  await expect(page.getByText("DEMO_SOLVER").first()).toBeVisible();
  await expect(page.getByText("DEMO_GRINDER").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /attribute comparison/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /neutral summary/i })).toBeVisible();
});
