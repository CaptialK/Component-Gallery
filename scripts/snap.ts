/**
 * Snap pipeline — Phase 2.
 *
 * For each registry entry, navigate Playwright to the bare /preview route
 * in light + dark color schemes, screenshot at 1200×800, and write
 *   public/previews/<category>__<slug>--{light,dark}.png
 *
 * Theme switching: `next-themes` is configured `defaultTheme="system"
 * enableSystem`, so toggling Playwright's `emulateMedia({ colorScheme })`
 * drives the html `.light`/`.dark` class through next-themes.
 *
 * Prereqs:
 *   1. `pnpm dev` running on http://localhost:3000 (or set SNAP_BASE_URL).
 *   2. `pnpm exec playwright install chromium` once per machine.
 *
 * Run: `pnpm snap`
 */

import { chromium, type Browser, type BrowserContext } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { REGISTRY } from "../lib/registry";

const BASE = process.env.SNAP_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "public", "previews");
const VIEWPORT = { width: 1200, height: 800 };
const THEMES = ["light", "dark"] as const;

// Comma-separated slug allowlist via `SNAP_SLUGS=foo,bar pnpm snap`. Empty
// → snap every entry. Useful for partial re-snaps during head-to-head
// batches where re-rendering the rest would shift plate-number watermarks
// in untouched previews.
const SLUG_FILTER = process.env.SNAP_SLUGS
  ? new Set(process.env.SNAP_SLUGS.split(",").map((s) => s.trim()).filter(Boolean))
  : null;

type Theme = (typeof THEMES)[number];

async function snap(
  ctx: BrowserContext,
  category: string,
  slug: string,
  theme: Theme,
): Promise<void> {
  const page = await ctx.newPage();
  try {
    await page.emulateMedia({ colorScheme: theme });
    const url = `${BASE}/preview/${category}/${slug}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    // Wait for fonts so Fraunces / Geist render at their final widths.
    await page.evaluate(() => document.fonts.ready);
    // Two animation frames so dot-fields settle before capture.
    await page.evaluate(
      () =>
        new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        ),
    );
    const dest = path.join(OUT_DIR, `${category}__${slug}--${theme}.png`);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`  ✓  ${category}/${slug} (${theme})`);
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  // Sanity: confirm the dev server is up before launching a browser.
  try {
    const probe = await fetch(BASE, { method: "HEAD" });
    if (!probe.ok && probe.status !== 405) {
      throw new Error(`HTTP ${probe.status}`);
    }
  } catch (e) {
    console.error(
      `\n  ✗  Cannot reach ${BASE}. Is \`pnpm dev\` running?\n     (${(e as Error).message})\n`,
    );
    process.exit(1);
  }

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: VIEWPORT });

    const targets = SLUG_FILTER
      ? REGISTRY.filter((e) => SLUG_FILTER.has(e.slug))
      : REGISTRY;

    for (const entry of targets) {
      for (const theme of THEMES) {
        await snap(ctx, entry.category, entry.slug, theme);
      }
    }

    await ctx.close();
    console.log(
      `\n  ${targets.length * THEMES.length} previews written to public/previews/`,
    );
  } finally {
    await browser?.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
