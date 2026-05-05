# Component Gallery — handoff for another Claude

**Read this first.** You're picking up Vinson Li's portfolio gallery cold. This doc orients you in ~10 minutes so you can be useful from the first message instead of the third. Project repo: `https://github.com/CaptialK/Component-Gallery`. Last handoff: 2026-05-05.

---

## What this project is

A Next.js portfolio site that ships ~50 hand-designed SaaS UI components as **plates in a digital folio**, not as a `npx`-able registry. The competitive frame: every other component lib (shadcn blocks, Aceternity, Tremor, Magic UI) is a registry; this is a **catalogue** — curated, typeset, finite — like NYRB's backlist. That framing is what gives "warm cream paper + structural pointillism" somewhere to live.

This is design-in-the-medium. There are no Figma files. The dev server is the design tool. The registry is the source of truth. Plates are evaluated by running the actual page and looking at it.

**Current state (2026-05-05):** 26 plates shipped — 13 SaaS / 13 medical. All three design-research spikes signed off. 3 of 5 ship-readiness criteria met (the remaining two are external — `SITE_URL` resolution + live deploy). The catalogue is sorted by domain (SaaS / Medical SaaS) on the home page. The SaaS section is now **product-grade** — plates wire real validation, selection, filtering, toasts, modals — while medical retains the specimen framing (see `DECISIONS.md` 2026-05-05). Vinson is in active expand-the-catalogue mode interleaved with polish work.

## The single most important rule

**Aesthetic = Vercel/Notion paper-toned base + medium pointillism accent.**

If components come out looking like default shadcn, you've failed the brief.

- **Base layer is restrained**: generous whitespace, Geist Sans body, Geist Mono code, **Fraunces (SOFT-30, opsz 96) display italic** for any plate hero head, subtle borders, small radii (4–10px), no gradients on chrome, no shadows except elevated overlays.
- **Pointillism accent lives in state and rhythm**, not in interiors. Focus rings, text selection, loading skeletons, dividers, scroll progress, brand mark, illustration. **Interior surfaces of controls stay flat.** **Backgrounds beneath text or data values stay flat.** Perimeter, state, rhythm carry the language.

The system has **two atomic primitives** (this is load-bearing — committed to in `DECISIONS.md` 2026-05-03):

- **Dots** (`components/_kit/dot-field.tsx`, Bridson Poisson-disc by default) — discrete marks. Punctuation. Use for: events, states, register marks, illustration, single values.
- **Lines** (`components/_kit/trace.tsx`) — continuous trends. Connection. Use for: sparklines, thresholds, reference ranges, dividers, rules.

**Dots punctuate; lines connect; backgrounds stay flat.** For quantitative data, prefer position on a common scale or line/length over texture/density (Cleveland-McGill).

## Stack — non-negotiable

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 (CSS-first via `@theme` in `app/globals.css`; **no `tailwind.config.js`** — tokens become utilities automatically) · Base UI primitives (`@base-ui-components/react`), not Radix · `next-themes` for dark mode · Lucide for icons · Shiki for source highlighting · self-hosted Fraunces + Geist Sans + Geist Mono via `next/font/google` · `pnpm` only · Node 20+.

**Do NOT install:** framer-motion (use CSS transitions), date-fns (use Intl), zustand/redux (URL state + useState), any chart library (hand-roll SVG via the Trace primitive).

## Locked invariants

These are regression checks. If you change tokens, CLAUDE.md, or core primitives, verify against these:

- **Type stack**: Fraunces (SOFT-30, opsz 96) / Geist Sans / Geist Mono. *Do not* re-introduce Inter or JetBrains Mono.
- **Spacing scale**: only `{1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24}`. Avoid 5/7/9/10/11.
- **Tokens**: OKLCH only. No hex / no HSL.
- **Dark-mode dot ink**: `--color-dot-ink` is hardcoded to literal cream paper in dark mode (Riso knockout). *Do not* "simplify" by re-pointing it to `var(--color-text)`.
- **DotField default**: Poisson-disc (Bridson). `distribution="grid"` exists for back-compat only.
- **Print-canon coverage**: every dot field stays in `[0.03, 0.22]`. Below 3% it disappears; above 22% adjacent dots merge into flat tint.
- **Animation rule**: `r`, `cx`, `cy` on `<circle>` are **never animated**. Only `transform` and `opacity` for compositor-cheap motion.
- **Chrome rule**: interior surfaces flat; perimeter, state, rhythm carry the language. *Do not* re-introduce halftone fills inside button bodies, dot patterns inside table cells, or stippled input strokes.
- **Spike 3 encoding**: **area** (one dot per cell, radius² scales with value), not density. Sqrt scaling on r² so equal value deltas produce equal area deltas.

## Anti-patterns Vinson keeps catching

The "bad-day pass" cycle (see methodology section below) repeatedly surfaces these. Don't write them in the first place.

- ❌ **Sparkles icon** (or any "AI-default" icon) for section headers. The locked rule is "no AI-generic aesthetics." Most generic SaaS skeletons use Sparkles for "Recently active" / "Suggestions" / etc. Don't.
- ❌ **Solid Federal Blue circle as avatar.** The system uses **ringed monogram** avatars (small `bg-bg` circle with `ring-1 ring-border` and mono initials). Used in triage-queue, bed-board, care-team-rail, app-shell. Don't break this.
- ❌ **Hover-just-lightens-bg.** Forbidden in CLAUDE.md. Use a left-edge accent strip + faint surface bg, OR border emphasis. The bed-board / app-shell row hover is the canonical pattern.
- ❌ **Triple-encoded badges** (border + ring inset shadow + bg-tint + colored text). Pick one. The current pattern is single border + colored ink + colored dot — see app-shell `StatusBadge`.
- ❌ **Sans-serif h1/h2 in Geist Sans for plate hero heads.** The catalogue voice is **Fraunces italic** for hero heads. Every specimen plate's headline uses Fraunces. Don't ship a sans-serif h1 in a plate.
- ❌ **Dots-as-background under text or data values.** Logged as a retrospective in `DECISIONS.md` 2026-05-03 ("wandered, useful, bad final design"). Backgrounds beneath text/data stay flat. Always.
- ❌ **Quantitative encoding via density.** Use length (`Trace`) or area (sized dot, radius² scales) instead. Cleveland-McGill ranks both above density/texture.
- ❌ **Symbol or color encoding without a visible key/legend.** If a reader has to infer what a colour or shape means, the encoding hasn't earned its space. Status palettes get a `STATUS_INK` map + a legend strip. Activity-heatmap legend is calibrated ("0 / max"), not ordinal ("less / more"). Owner initials get `title=full-name` tooltips.
- ❌ **Treating the SaaS specimen-shift as a license to relax the aesthetic or motion budget.** The 2026-05-05 decision relaxed only the *specimen framing* for SaaS — plates can now wire validation, modals, popovers, menus, toasts, real selection state. The aesthetic, the motion budget, and every entry in `CLAUDE.md` "Forbidden patterns" hold unchanged. Still forbidden: animated SVG geometry, `framer-motion`, shimmer sweeps, dots-as-background under text or data, hover-just-lightens-bg, triple-encoded badges, gradient text, glassmorphism, Sparkles icon. Two keyframes are licensed (`live-pulse`, `caret-blink`) — adding a third is a `DECISIONS.md` decision, not a styling pass. Medical plates retain the specimen framing — they're not rewired.

## The catalogue taxonomy

The registry has **two axes**: `domain` (top-level) × `category` (within-domain). Both surface on the home page; the dynamic route `/c/[category]/[slug]` only uses category.

- **Domains**: `saas` | `medical`
- **Categories**: `auth` · `layouts` · `dashboards` · `forms` · `empty-states` · `clinical`

Plate numbers are registry array position, 1-indexed, three-digit ("№ 002"). They appear in the SpecimenShell running head and watermark. **Reordering the registry shifts plate numbers.** Track this when you rearrange.

Display labels for category slugs live in `lib/registry.ts` (`CATEGORY_LABELS` map). Add a new category? Add the slug → label entry there or `getCategoryLabel` falls back to the kebab-case slug.

## Plates currently shipped (26)

**SaaS — 13 plates** (in registry order):

1. № 001 `layouts/app-shell` — Sidebar + topbar + content; the chrome itself is the showcase. NAV navigates via hash routing; bell opens a popover; avatar opens a menu. Status legend + ringed-monogram avatars + accent-strip row hover.
2. № 002 `auth/centered-signin` — The original Spike 2 specimen test plate. Now wires real form validation + per-field error display. Brand mark = Fraunces italic ringed badge.
3. № 003 `dashboards/activity-heatmap` — Spike 3 area-encoded heatmap. 53×7 cells; one sized dot per cell; arrow-key navigation + custom in-SVG hover tooltip.
4. № 004 `empty-states/inbox-zero` — Pointillism envelope illustration + CTA. CTA opens a real modal + drawer.
5. № 005 `dashboards/metrics-stream` — Stacked observability strips with wide Trace sparklines + min/max envelope + dashed target lines + pulsing live indicator. Workspace switcher = real menu; rows open detail modals.
6. № 006 `forms/onboarding-accordion` — Three-step setup; done above, doing now in middle, doing-next below; reads as one document. Full validation + field persistence.
7. № 007 `empty-states/empty-table-suggestions` — In-place no-results pattern; chip toggles widen the search; suggestion rows look like real results.
8. № 008 `dashboards/deploy-pipeline` — Three environment lanes; deploy dots open a detail modal; failed deploys ink persimmon, live deploy wears a Federal Blue ring.
9. № 009 `dashboards/billing-usage` — Typeset-invoice mid-cycle usage; credits row opens a popover-anchored detail; cumulative-spend Trace anchored to renew-on date.
10. № 010 `layouts/command-palette` — Open palette over a softly-dimmed app frame; real fuzzy search + keyboard navigation; grouped Pages / Actions / Recents with mono shortcut keycaps.
11. № 011 `dashboards/feature-flags` — Two-pane master-detail console: flag list left, focused-flag detail right with env matrix, rollout slider, evaluation-volume Trace, and audit log.
12. № 012 `dashboards/api-rate-limits` — Per-endpoint observability surface — quota gauge, per-second histogram, p95 latency, status chip; hover surfaces detail; status chip toggles throttled state.
13. № 013 `forms/api-keys` — Vertical credential cards; ringed creator monogram, recency trail, scope chips, large masked secret, 7d sparkline, danger-zone rotate/revoke with confirm-by-typing.

**Medical SaaS — 13 plates**, № 014–026. Categories: `layouts` (chart-header, care-team-rail, bed-board), `dashboards` (vitals-monitor, triage-queue), `clinical` (medication-list, lab-results, intake-soap-note, appointment-week, order-entry, encounter-timeline, discharge-summary), `empty-states` (no-encounters-yet). Medical retains the specimen framing — these are frozen plates, not wired demos. (Plate numbers shifted: this section was № 008–020 in the prior handoff.)

## How to add a new plate (the only sanctioned path)

1. Drop a self-contained `.tsx` into `components/showcase/<category>/<slug>.tsx`. Default-export a component. No external state, no app-level imports beyond `_kit/` primitives. Mark `"use client"` only if it actually needs client state.
2. Append an entry to `lib/registry.ts`:
   ```ts
   {
     domain: "saas", // or "medical"
     category: "dashboards",
     slug: "metrics-stream",
     title: "Metrics stream",
     filename: "metrics-stream.tsx",
     description: "…",
     layout: "specimen", // gets the SpecimenShell treatment
     aspectRatio: "16 / 9", // optional; default "5 / 6" portrait
     maxWidth: 880, // optional; default 600. Bump for wide plates with internal chrome.
     firstImpression: "2026-05-04", // ISO date; per-plate, shown in colophon
     load: () => import("@/components/showcase/dashboards/metrics-stream"),
   }
   ```
3. The home grid, the dynamic `/c/<category>/<slug>` route, the command palette, and OG metadata pick it up automatically. `generateStaticParams` pre-renders every entry at build time.
4. Run `pnpm typecheck` to verify.
5. Ensure `pnpm dev` is running, then `pnpm snap` to capture the preview screenshot. Re-snaps land in `public/previews/<category>__<slug>--{light,dark}.png`.
6. Verify the snap visually — check both light and dark.

## Methodology Vinson has confirmed (use these)

These come from feedback memories Vinson explicitly approved through use. They aren't suggestions — they're the working method.

### Bad-day critique-then-fix

When asked to **iterate on a plate**, do a brutal critique first, then fix from it. Memory: `feedback_bad_day_critique.md`.

1. Read the plate like you're having a really bad day. Name specific anti-patterns, layout bugs, inconsistencies with the rest of the gallery, AI-generic chrome, things that violate CLAUDE.md's Forbidden Patterns. File:line references. Don't soften.
2. Each fix maps to a critique bullet. Show your work.
3. Be a little creative — fixes can introduce small new elements (calibrated legend, typography swap, hover vocabulary) but stay scoped to what the critique surfaced.
4. **Any symbol or colour encoding gets a visible key/legend.** Status badges → legend strip with `STATUS_INK` palette as single source of truth. Owner initials → `title` tooltips. Heatmap dot scale → numeric anchors at the endpoints.

When the user reports a bug, the bug is the entry point — expand the critique to the whole plate before fixing. The bed-board CONTACT/DROPLET label collision was the surfaced bug; it would have been a one-line fix; instead it kicked off a sweep that caught six other plates with related issues.

### Head-to-head for new plates

When asked for **new plates with quality bar implied**, build the candidate AND an alternative. Memory: `feedback_head_to_head_methodology.md`.

1. Build the candidate.
2. Build an alternative — a different design approach to the same surface. Real, polished, not a strawman.
3. Snap both.
4. Compare in plain language: information density, distinctiveness, fit with catalogue voice, what gap each fills.
5. Pick a winner. Delete the loser entirely (file + registry entry + previews).
6. Iterate the winner **2–3 rounds** with bad-day critique → fix.
7. Commit the whole batch as one ("Add N plates via head-to-head + iterate") — capture the verdicts and iteration moves in the commit body since the build → cull → iterate process isn't visible in git after the fact.

A "comfortable batch" is **3 plates × 2 variants = 6 builds**, then cull to 3, then iterate. Larger gets rushed.

### Audit-split-verify for big batches

When a batch touches many plates *and* introduces shared primitives (the 2026-05-05 SaaS specimen-shift was the canonical case: 10 plates rewired + 3 new built + 6 new `_kit/` primitives + provider route-gating), layer audit-split-verify on top of head-to-head. Read the affected surface as one (audit), split into independent passes that can land coherently (split: primitives → existing-plate rewires → new-plate builds → tests), verify each pass against `pnpm typecheck` + `pnpm build` + targeted re-snaps before moving to the next. Methodology details live in the memory files; this is just the pointer.

## Common task crib sheet

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # tsc --noEmit
pnpm build        # production build (statically prerenders all plates)
pnpm snap         # capture light+dark previews for all plates (needs `pnpm dev` running)
```

- **Adding a plate** → see the section above.
- **Auditing the gallery for a rule violation** → grep across `components/showcase/`. The dot+line audit (`e3a1326`) is a good template for this kind of sweep.
- **Renaming a category or domain** → `lib/registry.ts` is the single source. Update slugs in registry + the file directory under `components/showcase/`. Add the display label to `CATEGORY_LABELS` or `DOMAIN_LABELS`. Plate numbers shift if registry order changes.
- **Updating a plate's first-impression date** → `firstImpression: "YYYY-MM-DD"` field on its registry entry. The colophon picks it up via `formatFirstImpression(iso)`.
- **Snap nondeterminism** → `pnpm snap` may re-render PNGs that look identical at the byte level (Playwright sub-pixel rendering). Don't commit those — only stage previews paired with the source change. Pattern set by commit `93fd6f7`.

## Where to find things

```
components/_kit/                      System primitives
  dot-field.tsx                       Bridson Poisson-disc dot field
  dot-noise.ts                        mulberry32 + poissonDisc helpers
  trace.tsx                           Polyline + envelope + thresholds + dot marks
  registration-crosshair.tsx          The corner registration marks for the specimen frame
  skeleton.tsx                        Blue-noise loading skeleton
  icons.tsx                           Inline brand-mark SVGs (Lucide v1 dropped these)
  site-header.tsx                     Top nav
  site-footer.tsx                     Bottom colophon
  command-palette.tsx                 Base UI Combobox; ⌘K
  source-viewer.tsx                   Shiki dual light/dark code highlighter
  modal.tsx                           Base UI Dialog wrapper. placement="center"|"right"|"left"|"bottom" folds drawer in; size="sm"|"md"|"lg". 320ms paper-ease in / 200ms ease-in out.
  toast.tsx                           Provider + useToast() hook. Bottom-right stack. Status drives the leading-dot color (walnut / Federal-Blue-pulse / persimmon). No icons.
  popover.tsx                         Base UI Popover wrapper. 200ms paper-ease open / 120ms ease-in close.
  menu.tsx                            Base UI Menu with the gallery's row vocabulary — left accent strip on highlight, mono-caps headings, <kbd> shortcuts.
  combobox.tsx                        Base UI Combobox for "search-with-results-list" surfaces (distinct from the ⌘K palette).
  field-error.tsx                     Tiny helper for per-field error display + aria-invalid wiring.

components/showcase/<category>/<slug>.tsx
                                      One file per plate. Self-contained.

app/
  layout.tsx                          Fonts, metadata, providers
  page.tsx                            Home — hero + domain-grouped category sections
  providers.tsx                       next-themes + command-palette providers
  not-found.tsx                       On-brand 404
  c/[category]/[slug]/                Component preview route
    page.tsx                            Server component: loads entry, passes to shell
    shell.tsx                           Default registry-style shell
    specimen-shell.tsx                  Spike 2 specimen treatment (the catalogue layout)
  preview/[category]/[slug]/         Bare-component preview route consumed by snap
  globals.css                        @theme tokens + base resets
  design/                            Scratch ideation route

lib/
  registry.ts                        Single source of truth for every plate
  source-loader.ts                   Server-only file reader for the source viewer
  cn.ts                              clsx + tailwind-merge helper

scripts/
  snap.ts                            Playwright capture pipeline — `pnpm snap`

public/previews/                     Generated plate screenshots (light + dark per plate)

resources/                           Design research
  dots_reserach.md                   The design pass behind the project
  moving_points.md                   Technical reference for pointillism in Next.js

CLAUDE.md                            Onboarding for any Claude opening the repo
DECISIONS.md                         Decisions ledger with articulation-framework tradeoffs
```

## Communication style with Vinson

- **Direct, scope-disciplined, prefers seeing over reading.** Short responses. Show, don't lecture.
- For **exploratory questions** ("what's next?", "how should we approach X?"), respond in 2–3 sentences with a recommendation and the main tradeoff. Present it as something Vinson can redirect, not a decided plan.
- **End-of-turn**: one or two sentences on what changed and what's next. Nothing else.
- When making code changes, **run `pnpm typecheck`** and re-snap any plates whose source changed. Don't trust source-only confirmation — verify the rendered preview shows the fix landed.
- Vinson commits in coherent batches and writes commit messages that capture *why*, not just *what*. Match that voice. Co-Author tag goes on every commit you make: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- He's typo-tolerant and casual in his own messages. Don't echo his typos when responding; respond in your normal voice but keep it brief.

## Memory system

Vinson's auto-memory lives at `C:\Users\vinso\.claude\projects\C--Users-vinso-OneDrive-Documents-VL-DE-component-gallery\memory\`. The index `MEMORY.md` loads into context automatically. Currently saved:

- `user_working_style.md` — Vinson's working style
- `feedback_bad_day_critique.md` — the critique-then-fix methodology (above)
- `feedback_head_to_head_methodology.md` — the head-to-head batch process (above)
- `project_dot_language_rule.md` — the chrome cleanliness rule
- `project_spike_plan.md` — the three-spike status (all signed off)
- `reference_wiki.md` — pointer to this Obsidian vault

Update these as you learn things; don't write into `MEMORY.md` directly (it's the index, lines after 200 get truncated).

## Open follow-ups (priority order)

1. **More SaaS plates — progressing.** Catalogue is now 13 SaaS / 13 medical (was 7 SaaS at the prior handoff). Two head-to-head batches shipped 2026-05-04 and 2026-05-05; the section is no longer thin. Propose candidates as the catalogue grows; head-to-head process still applies.
2. **`SITE_URL` resolution.** Placeholder still in tree. Gates on the `vinsonfx.com` monorepo absorbing the gallery. Not on you — external work.
3. **Live deploy URL.** Depends on #2.
4. **Open question: medical interactivity?** The 2026-05-05 specimen-shift was scoped to SaaS by intent — clinical SaaS reads more honestly as a frozen specimen because it isn't a real EHR. If Vinson later wants medical wired up, that's a separate decision (and probably partial: vitals-monitor live-pulse is justifiable, full MAR-as-app is not). Don't volunteer it.

The design system is locked. Most work going forward is plate creation + maintenance against the rules above. The six new `_kit/` interactive primitives (modal, toast, popover, menu, combobox, field-error) are now part of the kit — reach for them rather than rolling new ones per plate.

## When in doubt

- Read `CLAUDE.md` (in the repo root).
- Read `DECISIONS.md` for *why* a rule exists when it surprises you. Every choice gets problem → options → choice → tradeoff → signal.
- Look at the existing plates in `components/showcase/` — the system is consistent enough that you can usually find the answer by reading two or three plates that solve a similar problem.
- If a rule isn't in this doc, in `CLAUDE.md`, or in `DECISIONS.md`, ask Vinson before inventing one.
