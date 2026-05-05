import { test, expect } from "playwright/test";
import { REGISTRY } from "../../lib/registry";

/**
 * Smoke — every registered route renders 200 OK without uncaught runtime errors.
 *
 * The registry is the source of truth, so this loop walks every entry and
 * navigates to its `/c/<category>/<slug>` page. A failing page either 404s
 * (registry/route mismatch), throws from the dynamic `entry.load()` import
 * (broken plate component), or surfaces an unhandled exception at runtime.
 *
 * Console warnings (hydration float-precision diffs on SVG geometry, dev-mode
 * notices) are NOT treated as failures — they're noisy across React/Next dev
 * builds and not what this smoke layer is for.
 */
test.describe("smoke", () => {
  for (const entry of REGISTRY) {
    test(`${entry.category}/${entry.slug} renders without runtime errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

      const path = `/c/${entry.category}/${entry.slug}`;
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res, `no response for ${path}`).not.toBeNull();
      expect(res!.status(), `bad status for ${path}`).toBeLessThan(400);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator("body")).toBeVisible();
      expect(errors, `runtime errors at ${path}: ${errors.join(" | ")}`).toEqual([]);
    });
  }
});
