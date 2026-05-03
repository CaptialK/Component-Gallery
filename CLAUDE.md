# CLAUDE.md

Guidance for Claude when working in this repo. Read this before making changes.

## What this is

A portfolio site that showcases hand-designed SaaS UI components. Spirit: a
working sketchbook, not a polished marketing site.

## The single most important rule

**Aesthetic is Vercel/Notion paper-toned base + medium pointillism accent.**

If components come out looking like default shadcn, you've failed.

- **Base layer** is restrained: generous whitespace, Geist Sans for body, Geist
  Mono for code, Fraunces (SOFT-30, opsz 96) for display, subtle borders, small
  radii (4–10px), no gradients on chrome, no shadows except on elevated overlays.
- **Pointillism accent** is two-tone (walnut ink + Federal Blue) and lives in
  the *state and rhythm* of controls, not their interiors:
  - focus rings (radial-gradient halo on `::after`; 2px dotted outline fallback
    for replaced elements)
  - text selection color (Federal Blue at 30% alpha)
  - loading skeletons (blue-noise stipple at ~6% density)
  - dividers and scroll progress
  - the home hero, empty-state illustrations, the 404 page, the brand mark

**Interior surfaces of controls stay flat** — no halftone fills inside button
bodies, no dot patterns inside table cells, no stippled input strokes.
*Perimeter, state, and rhythm of controls carry the language.* Use
`components/_kit/dot-field.tsx` (Bridson Poisson-disc by default) for any dot
work.

## Forbidden patterns

- ❌ `rounded-lg` as a default. Use `--radius-xs/sm/md/lg` and vary radii intentionally.
- ❌ `bg-muted` on every secondary surface. Use `--color-surface-2`.
- ❌ Hover states that just lighten the background. Use border emphasis or a subtle accent.
- ❌ A `Card` wrapper around every block. Use raw divs with intentional borders.
- ❌ Emojis, gradient text, glassmorphism.

## Stack — non-negotiable

- Next.js 15+ App Router, TypeScript strict
- Tailwind CSS v4 — CSS-first config in `app/globals.css` via `@theme`. **Do
  not create `tailwind.config.js`.** Tokens become utilities automatically.
- Base UI primitives (`@base-ui-components/react`), not Radix. The Combobox
  drives the command palette; Dialog is the modal shell.
- next-themes for dark mode (system default)
- pnpm only
- Lucide for icons. Lucide v1 dropped brand marks — for GitHub etc., use
  `components/_kit/icons.tsx` (inline SVG).
- Shiki for source highlighting (dual light/dark, server-rendered).

**Do NOT install:** framer-motion (use CSS transitions), date-fns (use Intl),
zustand/redux (URL state + useState only), any chart library (hand-roll SVG).

## Spacing & type discipline

- Spacing scale: only **1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24**. Avoid 5, 7, 9, 10, 11.
- Type: `text-xs/sm/base/lg/xl/2xl/3xl`. Body is `text-sm leading-relaxed` —
  Vercel/Notion density, not airy marketing-site density.
- Tracking: `-0.01em` on UI text, `-0.02em` on headings ≥ `text-xl`.

## Tokens

Defined in `app/globals.css` under `@theme`. OKLCH only. Light is the showcase;
dark is correctness, not the hero. Pointillism tokens (`--color-dot-ink`,
`--color-dot-accent`) resolve to `--color-text` / `--color-accent` so dots
follow the theme automatically.

## Repo layout

```
app/
  layout.tsx                  fonts, metadata, providers
  page.tsx                    home: hero + category sections
  providers.tsx               next-themes + command-palette providers
  not-found.tsx               on-brand 404
  c/[category]/[slug]/        component preview + source toggle
  globals.css                 @theme tokens + base resets
components/
  _kit/                       primitives shared across the site
  showcase/<category>/        the gallery — one file per component
lib/
  registry.ts                 single source of truth for entries
  source-loader.ts            server-only file reader for the source viewer
  cn.ts                       clsx + tailwind-merge helper
public/previews/              generated screenshots (Phase 2)
scripts/snap.ts               Playwright stub
```

## Adding a new component (the only sanctioned path)

1. Drop a self-contained `.tsx` into `components/showcase/<category>/<slug>.tsx`.
   Default-export a component. No external state, no app-level imports beyond
   `_kit/` primitives. Mark `"use client"` only if it actually needs client state.
2. Append an entry to `lib/registry.ts`:
   ```ts
   {
     category: "dashboards",
     slug: "metrics-overview",
     title: "Metrics overview",
     filename: "metrics-overview.tsx",
     description: "…",
     load: () => import("@/components/showcase/dashboards/metrics-overview"),
   }
   ```
3. The home grid, the dynamic `/c/<category>/<slug>` route, the command
   palette, and OG metadata pick it up automatically. `generateStaticParams`
   pre-renders every entry at build time.

## RSC boundary gotchas

- `<DotField />` is server-renderable (no `"use client"`). Density functions
  passed to it are consumed at server render time — don't move it back to a
  client component without thinking through whether callers will then need to
  pass functions across the RSC boundary.
- The dynamic component page passes only serializable fields (category, slug,
  title, filename) to the client `ComponentPageShell` — not the full entry,
  which contains the `load()` function.

## Commands

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc --noEmit
pnpm build        # production build (also typechecks)
pnpm snap         # placeholder; Playwright pipeline lands in Phase 2
```

When making non-trivial changes, run `pnpm typecheck` and `pnpm build` before
declaring done. The build statically prerenders every registry entry.

## Placeholders left literal

These strings live throughout the codebase and will be swapped at finalization.
Do not invent values for them.

- `>>> SITE_URL <<<` (TBD — gallery will live under vinsonfx.com once that monorepo lands)
