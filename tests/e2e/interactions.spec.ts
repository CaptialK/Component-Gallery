import { test, expect } from "playwright/test";

/**
 * Interactions — the load-bearing wiring on the deepest-wired plates.
 *
 * Tests are intentionally short. They don't paw at internals; they assert
 * the user-visible signal each interaction is supposed to produce
 * (selection moves, toast appears, validation error shows, secret reveals,
 * pinned ring lands). One assertion per behavior. If a plate's selectors
 * change, these tests flag it before a release.
 */

test.describe("interactions", () => {
  test("command palette: ArrowDown moves selection, Enter fires a toast", async ({ page }) => {
    await page.goto("/c/layouts/command-palette");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();

    // Window-level keydown listeners require the page to actually have
    // focus. Headless Chromium starts pages unfocused; click on the body
    // first so subsequent keypresses dispatch.
    // The canonical pose has query `"invoic"` which filters to a single
    // result — there's nowhere for ArrowDown to traverse. Clear the input
    // first so all groups + rows render, then traversal has somewhere to go.
    const search = dialog.getByRole("combobox");
    await search.fill("");

    // Plate's keyboard listener is on `window`. Fire directly to remove
    // any focus-target ambiguity under parallel-worker load.
    const fireKey = (key: string) =>
      page.evaluate((k) => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
      }, key);

    // The selected option is marked with `data-selected="true"` — stable
    // selector that survives style/aria refactors.
    const selectedLabel = () =>
      dialog.locator('[data-selected="true"]').first().textContent();

    const before = await selectedLabel();
    expect(before, "a row should be selected by default").toBeTruthy();

    await fireKey("ArrowDown");
    await fireKey("ArrowDown");
    await fireKey("ArrowDown");
    const after = await selectedLabel();
    expect(after, "selection should advance after ArrowDown").not.toBe(before);

    await fireKey("Enter");
    await expect(page.getByRole("status").first()).toBeVisible({ timeout: 2_000 });
  });

  test("onboarding accordion: invalid input blocks advance, valid input continues", async ({ page }) => {
    await page.goto("/c/forms/onboarding-accordion");
    // Active step is "workspace" with valid pre-filled values.
    const slug = page.locator("#f-workspace-slug");
    await expect(slug).toBeVisible();

    // Force a validation failure by emptying the slug.
    await slug.fill("");
    const cta = page.getByRole("button", { name: /Save & continue/ });
    await cta.click();
    await expect(page.locator("#f-workspace-slug-error")).toBeVisible();

    // Restore valid input → click → invite step becomes active.
    await slug.fill("stipple-press");
    await cta.click();
    await expect(page.locator("#f-invite-emails")).toBeVisible({ timeout: 3_000 });
  });

  test("activity heatmap: click pins, Escape unpins", async ({ page }) => {
    await page.goto("/c/dashboards/activity-heatmap");
    // The heatmap SVG is `role="application"` (a single live region replaces
    // per-cell labels for an O(371) → O(1) a11y tree). Selector matches on
    // the aria-label rather than role to stay resilient.
    const svg = page.locator('svg[aria-label*="Contribution heatmap"]');
    await expect(svg).toBeVisible();

    // Click somewhere on the grid — pointer-down/up at the same cell pins it.
    await svg.click({ position: { x: 200, y: 60 } });
    const pinnedRing = svg.locator('rect[stroke="var(--color-accent-2)"]');
    await expect(pinnedRing).toHaveCount(1, { timeout: 2_000 });

    // Focus the SVG so it receives the keydown, then Escape.
    await svg.focus();
    await page.keyboard.press("Escape");
    await expect(pinnedRing).toHaveCount(0);
  });

  test("billing usage: Download triggers a toast", async ({ page }) => {
    await page.goto("/c/dashboards/billing-usage");
    await page.getByRole("button", { name: /Download/ }).click();
    await expect(page.getByRole("status").first()).toBeVisible({ timeout: 2_000 });
  });

  test("api keys: eye icon reveals and re-masks the secret", async ({ page }) => {
    await page.goto("/c/forms/api-keys");
    const firstCard = page.locator("[data-key]").first();
    const secretText = firstCard.locator("[data-secret]");

    const masked = (await secretText.textContent())?.trim() ?? "";
    expect(masked).toMatch(/•/);

    await firstCard.getByRole("button", { name: "Reveal secret" }).click();
    const revealed = (await secretText.textContent())?.trim() ?? "";
    expect(revealed).not.toBe(masked);
    expect(revealed.length).toBeGreaterThan(masked.length);

    await firstCard.getByRole("button", { name: "Hide secret" }).click();
    await expect(secretText).toHaveText(masked);
  });
});
