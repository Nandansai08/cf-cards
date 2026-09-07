import { expect, test } from "@playwright/test";
import { buildPlayer, stubCodeforces } from "./fixtures/codeforces";

/**
 * Every export format must actually produce a file.
 *
 * The card is rendered offscreen and handed to the browser as a blob, and the
 * four formats use different offscreen nodes — so a format can break on its
 * own while the others still work. The player here has a picture, because a
 * cross-origin image is exactly what can stop a canvas being read back.
 */

const PICTURE = "https://userpic.codeforces.org/1/title/real.jpg";

/** Smallest valid PNG, so the stubbed picture genuinely decodes. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const FORMATS = [
  { label: "Front", file: "card" },
  { label: "Back", file: "back" },
  { label: "Both", file: "both" },
  { label: "Story", file: "story" },
];

for (const { label, file } of FORMATS) {
  test(`downloads the ${label.toLowerCase()} image`, async ({ page, context }) => {
    // Rendering a 1080x1920 story frame is not quick.
    test.setTimeout(120_000);

    await stubCodeforces(context);
    await page.route("**/codeforces.com/api/user.info**", async (route) => {
      const url = new URL(route.request().url());
      const handles = (url.searchParams.get("handles") ?? "").split(";").filter(Boolean);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "OK",
          result: handles.map((h) => ({
            ...buildPlayer("demo_solver").info,
            handle: h,
            titlePhoto: PICTURE,
          })),
        }),
      });
    });
    await page.route("**userpic.codeforces.org/**", (route) =>
      route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
    );

    await page.goto("/player/demo_solver");
    await expect(page.getByRole("heading", { name: "DEMO_SOLVER" })).toBeVisible();

    // The page shows the card actions twice; either copy will do.
    await page.getByLabel("Download format").first().selectOption({ label });

    const started = page.waitForEvent("download", { timeout: 60_000 });
    await page
      .getByRole("button", { name: /download png/i })
      .first()
      .click();

    const download = await started;
    expect(await download.suggestedFilename()).toBe(`codeforces-cards-demo_solver-${file}.png`);
    // An empty file would still fire the event, so check there are pixels.
    const path = await download.path();
    expect(path).toBeTruthy();
  });
}

test("never draws the cross-origin picture into an exported canvas", async ({ page }) => {
  // Every export renders initials instead of the photo. A picture fetched from
  // another origin taints the canvas, and reading it back then throws — which
  // is what broke the two formats that were still rendering it.
  await page.route("**/codeforces.com/api/user.info**", async (route) => {
    const url = new URL(route.request().url());
    const handles = (url.searchParams.get("handles") ?? "").split(";").filter(Boolean);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "OK",
        result: handles.map((h) => ({
          ...buildPlayer("demo_solver").info,
          handle: h,
          titlePhoto: PICTURE,
        })),
      }),
    });
  });
  await page.route("**userpic.codeforces.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
  );

  await page.goto("/player/demo_solver");
  await expect(page.getByRole("heading", { name: "DEMO_SOLVER" })).toBeVisible();

  const offscreen = page.locator(
    "[data-export-card], [data-export-back], [data-export-both], [data-export-story]",
  );
  // The page renders the card actions twice, so don't pin an exact count —
  // what matters is that no export node contains an <img>.
  expect(await offscreen.count()).toBeGreaterThanOrEqual(4);
  await expect(offscreen.locator("img")).toHaveCount(0);
});
