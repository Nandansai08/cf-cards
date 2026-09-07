import { expect, test, type Page } from "@playwright/test";
import { buildPlayer, stubCodeforces } from "./fixtures/codeforces";

/**
 * Regression tests for missing profile pictures.
 *
 * Cards used to show initials for plenty of accounts that clearly have a photo
 * on Codeforces. Two causes, both covered here: `titlePhoto` and `avatar` are
 * separate uploads, so an account with only one of them was written off after
 * the first field (which Codeforces fills with a `no-title.jpg` stand-in rather
 * than leaving empty); and a Codeforces-hosted picture is not always loadable
 * cross-origin from a static host, which the old server-rendered build hid by
 * proxying every image.
 */

const TITLE = "https://userpic.codeforces.org/12345/title/real.jpg";
const AVATAR = "https://userpic.codeforces.org/12345/avatar/real.jpg";
const NO_TITLE = "https://userpic.codeforces.org/no-title.jpg";
const NO_AVATAR = "https://userpic.codeforces.org/no-avatar.jpg";

/** Smallest valid PNG, so a stubbed picture genuinely decodes. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.beforeEach(async ({ context }) => {
  await stubCodeforces(context);
});

/** Serves user.info for any handle with the given pictures attached. */
async function withPictures(
  page: Page,
  pictures: { titlePhoto?: string; avatar?: string },
): Promise<void> {
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
          ...pictures,
        })),
      }),
    });
  });
}

const servePictures = (page: Page) =>
  page.route("**userpic.codeforces.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
  );

const blockPictures = (page: Page) =>
  page.route("**userpic.codeforces.org/**", (route) => route.abort("failed"));

test("uses the account's avatar when it has no title photo", async ({ page }) => {
  // What most affected accounts look like: a real avatar, and a titlePhoto that
  // is Codeforces' "nothing uploaded" stand-in rather than an empty string.
  await withPictures(page, { titlePhoto: NO_TITLE, avatar: AVATAR });
  await servePictures(page);

  await page.goto("/player/demo_solver");

  await expect(page.locator(`img[src="${AVATAR}"]`).first()).toBeVisible();
  // The stand-in must never be rendered — it would show a grey silhouette.
  await expect(page.locator(`img[src="${NO_TITLE}"]`)).toHaveCount(0);
});

test("mirrors a picture the browser refuses to load", async ({ page }) => {
  await withPictures(page, { titlePhoto: TITLE });
  await blockPictures(page);
  await page.route("**wsrv.nl/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
  );

  await page.goto("/player/demo_solver");

  await expect(page.locator('img[src*="wsrv.nl"]').first()).toBeVisible();
});

test("falls back to initials only once every source has failed", async ({ page }) => {
  await withPictures(page, { titlePhoto: TITLE, avatar: AVATAR });
  await blockPictures(page);
  await page.route("**wsrv.nl/**", (route) => route.abort("failed"));

  await page.goto("/player/demo_solver");

  await expect(page.getByLabel("demo_solver initials").first()).toBeVisible();
  // Initials with no explanation are indistinguishable from a bug. On a phone
  // there is no console, so the page has to say which half failed.
  await expect(page.getByText(/wouldn't load the codeforces picture/i)).toBeVisible();
});

test("distinguishes an account with no picture from one that won't load", async ({ page }) => {
  // Both fields are Codeforces' "nothing uploaded" stand-ins.
  await withPictures(page, { titlePhoto: NO_TITLE, avatar: NO_AVATAR });

  await page.goto("/player/demo_solver");

  await expect(page.getByText(/isn't publishing a picture for this handle/i)).toBeVisible();
  await expect(page.getByText(/wouldn't load/i)).toHaveCount(0);
});
