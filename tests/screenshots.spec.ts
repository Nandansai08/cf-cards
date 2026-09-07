import { test } from "@playwright/test";
import { stubCodeforces } from "./fixtures/codeforces";

/**
 * Not a test — this regenerates the images in README.md, plus the social
 * preview card that link unfurls use.
 *
 *   npm run screenshots
 *
 * It is a separate Playwright project so `npm test` never runs it. It uses the
 * same stubbed demo players as the tests, which keeps the images reproducible
 * and avoids publishing a card that pins invented statistics on a real person.
 */

const OUT = "docs/screenshots";

test.beforeEach(async ({ context }) => {
  await stubCodeforces(context);
});

test.describe("desktop", () => {
  // 1440 wide at 1x: GitHub renders README images around 850px, so this stays
  // sharp while keeping the files small enough to live in the repo.
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  test("home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/home.png` });
  });

  test("player", async ({ page }) => {
    await page.goto("/player/demo_solver");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/player.png` });
  });

  test("compare", async ({ page }) => {
    await page.goto("/compare?a=demo_solver&b=demo_grinder");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/compare.png` });
  });
});

test.describe("social", () => {
  // 1200x630 is what Open Graph and Twitter cards are cropped to; anything
  // else gets letterboxed or cut by the platforms.
  test.use({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

  test("og", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "public/og.png" });
  });
});

test.describe("mobile", () => {
  // Narrow, so 2x keeps it legible at the size README shows it.
  test.use({
    viewport: { width: 414, height: 860 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  test("mobile", async ({ page }) => {
    await page.goto("/player/demo_riser");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/mobile.png` });
  });
});
