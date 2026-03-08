import { defineConfig, devices } from "@playwright/test";
import path from "path";

const TEST_MEDIA_DIR = path.join(process.cwd(), "__test_media__");

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    env: {
      PLEX_TV_LIBRARY_PATHS: path.join(TEST_MEDIA_DIR, "tv"),
      PLEX_MOVIES_LIBRARY_PATHS: path.join(TEST_MEDIA_DIR, "movies"),
    },
  },
});
