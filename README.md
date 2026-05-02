# V's Component Gallery

A working sketchbook of hand-designed SaaS UI components — paper-toned base,
with a measured pointillism accent. In the spirit of devl.dev, with a different
voice.

## Stack

- **Next.js 15+ App Router**, TypeScript strict
- **Tailwind CSS v4** — CSS-first config, all tokens live in `app/globals.css`
  under `@theme`. There is no `tailwind.config.js`.
- **Base UI primitives** for accessible behavior (Combobox for the command
  palette, Dialog for modal shells).
- **next-themes** for theme switching (system default).
- **Lucide** for icons. **Shiki** for source highlighting (dual light/dark).
- **pnpm** for all package operations.

What's intentionally **not** here: framer-motion, date-fns, zustand/redux, any
chart library.

## Run locally

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc --noEmit
pnpm build        # production build
pnpm snap         # placeholder — Playwright pipeline (Phase 2)
```

## Design direction

Paper-toned, Vercel/Notion density. Pointillism is the signature accent — used
sparingly and only in:

- the home hero
- empty-state illustrations
- the 404 page
- decorative dividers
- the brand mark

Component UI chrome itself stays clean: no dots inside buttons, inputs, table
rows, etc. Two-tone — ink + accent. See `components/_kit/dot-field.tsx`.

## Repository layout

```
app/                  routes (App Router, RSC by default)
  layout.tsx          fonts, metadata, providers
  page.tsx            home: hero + category sections
  c/[category]/[slug] component preview + source
  not-found.tsx       404
  globals.css         tokens via @theme + base resets

components/
  _kit/               primitives shared across the site
  showcase/           the gallery — one file per component, grouped by category
    layouts/
    auth/
    empty-states/

lib/
  registry.ts         single source of truth for all showcase entries
  source-loader.ts    server-only: reads .tsx as text for the source viewer
  cn.ts               clsx + tailwind-merge helper

public/previews/      generated screenshots (Phase 2)
scripts/snap.ts       Playwright stub
```

## Adding a new component

1. Drop a self-contained `.tsx` into
   `components/showcase/<category>/<slug>.tsx`. Default-export a component.
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

3. Done. The home grid, the dynamic route at `/c/dashboards/metrics-overview`,
   the command palette (⌘K), and OG metadata all pick it up automatically.

`generateStaticParams` pre-renders every entry at build time.
`generateMetadata` builds per-component OG tags pointing at
`/previews/{category}__{slug}--light.png`.

## Color tokens (OKLCH)

Defined in `app/globals.css`. Light mode is the showcase; dark is correct, not
the hero. Tokens are exposed as Tailwind utilities (e.g. `bg-bg`, `text-text`,
`border-border`) and as CSS vars (`var(--color-accent)`).

## Placeholders

These literal strings live throughout the codebase and will be swapped in
finalization:

- `>>> SITE_URL <<<` (TBD — gallery will live under vinsonfx.com once that monorepo lands)
