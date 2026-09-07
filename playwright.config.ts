import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env["E2E_PORT"] ?? 4319);
const baseURL = `http://127.0.0.1:${PORT}`;
const isCI = !!process.env["CI"];

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  ...(isCI ? { workers: 2 } : {}),
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL,
    colorScheme: "dark",
    trace: "on-first-retry",
    // Escape hatch for environments that already have a browser and don't want
    // `npx playwright install` to fetch another one.
    ...(process.env["CHROMIUM_PATH"]
      ? { launchOptions: { executablePath: process.env["CHROMIUM_PATH"] } }
      : {}),
  },

  projects: [
    {
      name: "e2e",
      testMatch: /.*\.spec\.ts$/,
      testIgnore: /screenshots\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Not a test: regenerates the images used by README.md.
      // Run with `npm run screenshots`.
      name: "screenshots",
      testMatch: /screenshots\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Tests run against the production build, not the dev server. Two reasons:
  // it is what actually ships, and in dev the client loads hundreds of
  // unbundled modules, so hydration is slow enough to make every interaction
  // test flaky. BASE_PATH is "/" here because this server has no subpath.
  webServer: {
    command: `npm run build:pages && node scripts/serve-static.mjs --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 240_000,
    env: { BASE_PATH: "/" },
    stdout: "ignore",
    stderr: "pipe",
  },
});
