import { defineConfig, devices } from "playwright/test";

/**
 * Playwright config — e2e for the component gallery.
 *
 * Vinson runs `pnpm dev` himself; this config does NOT spin up a webserver.
 * Override the base URL for CI / staging via E2E_BASE_URL.
 *
 *   pnpm test:e2e        # headless run
 *   pnpm test:e2e:ui     # interactive picker
 *
 * Discipline mirrors `scripts/snap.ts`:
 *   - chromium-only project
 *   - tight 15s test timeout
 *   - no `.only` allowed in committed tests (forbidOnly on CI)
 *   - serialized on CI to avoid dev-server thrash
 *
 * Note: imports come from `playwright/test`, not `@playwright/test`. Since
 * Playwright 1.39 the `playwright` meta-package re-exports the test runner
 * via this subpath, so the existing `playwright` devDep covers both the
 * snap script and the test runner without adding `@playwright/test`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 15_000,
  expect: { timeout: 5_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: !process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    trace: "retain-on-failure",
    video: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
