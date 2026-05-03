# Component Gallery — Decisions

Living ledger of design decisions and their tradeoffs for this project. Decision shape borrows from [[articulation-framework]] in Vinson's wiki — every entry gets **problem → options → choice → tradeoff → signal**, and the signal points to where the decision actually shows up in the work.

Wiki references throughout use Obsidian `[[link]]` syntax. The vault lives at `C:\Users\vinso\Documents\MyMind\wiki\`.

## Wiki anchors this project leans on

- [[principle-design-in-the-medium]] — design in code when the medium is code. Why visuals get evaluated by running the dev server, not in Figma.
- [[principle-systems-over-syntax]] — architecture over code generation. Why the dot language is a typed `coverage(zone, value)` system, not a styling pass.
- [[principle-make-intent-legible]] — name layers, write rules. Why `CLAUDE.md` is load-bearing and the registry pattern is the only sanctioned path to add a component.
- [[principle-quality-foundation-first]] — functionality → reliability → performance → exceptional. Why Spike 1 (chrome state) lands before Spike 2 (specimen plate) before Spike 3 (density-as-data).
- [[editorial-restraint]] vs. minimalist restraint — the slash project's bifurcation applies here too: this gallery picks editorial restraint (Fraunces, Riso dotwork, paper) over minimalist restraint (Vercel, Linear).
- [[specificity-asymmetry]] — restraint is the principle, specificity is the practice. Specific Bridson radii, OKLCH coordinates, 6% / 22% coverage values are the practice.
- [[italic-gold-rule]] — one load-bearing constraint per register. The chrome-narrowing rule plays the same role here.
- [[typography-system]] — three families, one role each.
- [[motion-budget]] — N moments, locked, with documented exceptions.
- [[articulation-framework]] — this doc's shape.

---

## Locked principles

The non-negotiable spirit-level rules. Changing one is a whole-project decision, not a styling pass.

1. **Catalogue, not registry.** This is a portfolio gallery framed as a digital folio of plates, not a CLI-install component library. Auto-generated registries (shadcn, Aceternity) are the saturated default; the catalogue framing is the unfilled niche.
2. **Vercel/Notion paper-toned base + structural dot accent.** Base layer is restrained Vercel/Notion density. The dot language is *structural*, not decorative — it lives in state and rhythm, not just hero illustration.
3. **Interior surfaces flat; perimeter, state, rhythm carry the language.** The narrowed [[italic-gold-rule]]-shaped constraint of this project. No halftone fills inside button bodies, no dot patterns inside table cells. Focus halos, selection, skeletons, dividers, scroll progress carry it.
4. **One typeface per role.** Fraunces (display), Geist Sans (body), Geist Mono (code). Mirrors [[typography-system]].
5. **OKLCH only.** No hex, no HSL. Tokens defined in `app/globals.css` under `@theme`.
6. **Light is the showcase; dark is correctness.** The brand argument is made in light mode; dark mode must be correct, not the hero.

---

## Locked invariants

Numeric / mechanical regression checks. If a change shifts these unexpectedly, investigate before shipping.

- **Print-canon coverage range: `[0.03, 0.22]`.** Every dot field in the system — hero, skeleton, focus halo, divider, halftone fade — designs against this range. Below 3% the field disappears into noise; above 22% adjacent dots merge into a flat tint and the dotted texture is lost (Sheridan halftone guidelines). The current Spike 1 surfaces sit inside this range; new chrome work must, too.
- **Bridson Poisson-disc is the canonical sampler.** `DotField`'s `distribution="grid"` exists only for back-compat; new callers leave it on the default.
- **`r`, `cx`, `cy` on `<circle>` are never animated.** Only `transform` and `opacity` for compositor-cheap motion.
- **Container queries, not viewport queries**, for any layout where the plate sits inside a larger surface (e.g. step-4 marginalia → drawer breakpoint).
- **No pure `#000` or `#fff`.** OKLCH-only palette; pure values cause OLED smear and read flat. Already enforced by the `@theme` block.

---

## Decisions ledger

Each entry is a decision made and the cost paid. Newest first.

### 2026-05-03 — Retrospective: dots-as-background failed; adding lines to the system

A wandering experiment. Logged here so the boundary the system found is preserved, not papered over.

- **What was attempted.** PR #2 (commits `aa8ccc9`, `2907fa6`, `4e9a36e`) shipped 13 medical-SaaS plates and pushed the dot vocabulary to its perceptual limit: dots-as-background behind patient info on chart-header, Bridson density envelopes behind vitals sparklines, stippled reference-range ribbons under lab values, per-cell LOS density on a bed grid. The premise was *one Bridson primitive powers everything* — and on paper, that includes "ambient density behind data."
- **Why it failed.** Vinson reviewed plates №5, 6, 9, 16 and reported the same problem in each: text and data values placed *over* dot fields read poorly. Cleveland & McGill (1984) ranking confirms: position-on-common-scale (rank 1) and length/line (rank 3) sit far above texture/density (rank 7) for quantitative reading. The dots-everywhere approach also ignored a layout principle the chrome-narrowing rule didn't quite cover — *backgrounds beneath text/data should stay flat*, the same way control interiors stay flat. The rule had a gap, the system permitted the misuse.
- **Choice.** Extend the system rather than tighten the existing one. Add a complementary primitive — **lines** — and decompose the data vocabulary into:
  - **Dots** — discrete, categorical, present-moment things. Events, states, register marks, illustration components, single data points. *Punctuation.*
  - **Lines** — continuous, ordered, quantitative things. Sparkline trends, threshold rules, reference ranges, connections between events. *Connection.*
  - Backgrounds beneath text or data values stay flat. The chrome-narrowing rule extends accordingly.
- **Tradeoff.** The "one Bridson primitive powers everything" thesis weakens further (already softened with the Spike 3 area pivot). The system now has two atomic units, not one. Worth it: a system that can't render quantitative data legibly isn't a system, it's an aesthetic. Keeping the misuse-allowing rule would have meant adding more plates that fail the same way — the wandering revealed the shape; the shape is *dots-and-lines*, not *dots-only*.
- **What's preserved.** The misused versions of plates 5, 6, 9, 16 stay in commit history (`aa8ccc9`, `2907fa6`, `4e9a36e`) as a record of where the system broke. They're worth keeping in the project's story — *the experiment wandering is itself the work*. Future writeups about this gallery should cite the failed approach alongside the working one; finding the boundary is more interesting than always operating safely inside it.
- **Signal.** New `Trace` primitive in `components/_kit/trace.tsx`. CLAUDE.md "interior surfaces flat" rule extended to "backgrounds beneath text/data also flat." Plates 5, 6, 9, 16 refactored in subsequent commits referencing this entry.

### 2026-05-03 — Pivot Spike 3 encoding from density to area (single dot, sized by value)

- **Problem.** Spike 3 v1 shipped 2026-05-02 with a density encoding — each cell rendered as a Bridson dot cluster whose count mapped to value. Vinson read it on dark + light, on wide + narrow, and reported the density differences read at a slight squint; small viewport scales made low-coverage cells visually indistinguishable from medium-coverage cells. The encoding's perceptual ranking is the cause: Cleveland & McGill's 1984 study (and Munzner 2014) put **area above texture** for quantitative reading by ~1.5 ranks. Density / texture is the channel I picked precisely because of the design research's "density-as-data" framing — but the framing was overspec'd against perception.
- **Options.**
  - (a) Keep the density encoding; tune dot size and cell size to make density differences more legible (more dots per cell, bigger dots, bigger cells).
  - (b) Switch to **area encoding**: one dot per cell, radius scales with value. Perceptually higher-rank channel; abandons the "density-as-data" thesis label but probably the right call.
  - (c) Layer both — single dot grows with value AND extra dots appear at high values. Maximal information channel, but mixes two encoding axes and risks reading as visual noise.
- **Choice.** (b). Honor the locked `[0.03, 0.22]` coverage invariant on a per-cell basis: smallest dot (value=0) covers ~3% of cell (always visible, never disappears), largest dot (value=max) covers ~22% (never reads as flat fill). Sqrt scaling on r² so equal value deltas produce equal *area* deltas — what the eye actually compares.
- **Tradeoff.** The "density-as-data" naming for Spike 3 was rhetorically clean; "area-as-data" is wordier and less novel-sounding. But density is rank 7 and area is rank 5 on Cleveland-McGill, and the project's primary obligation is to *be readable*, not to be on-message. The "one Bridson primitive powers everything" claim weakens slightly: hero, focus halo, skeleton, and halftone fades still all run Bridson; the heatmap now doesn't. That's worth flagging in any future writeup, not papering over.
- **Signal.** `components/showcase/dashboards/activity-heatmap.tsx` — `radiusFor(value, max)` helper replaces `dotCountFor`. Single `<circle>` per cell, no Bridson tile import. Legend updated to show 5 increasing dot sizes. Registry description swapped to "area-as-data."

### 2026-05-03 — Migrate `layouts/app-shell` and `empty-states/inbox-zero` to specimen layout

- **Problem.** Spikes 2 and 3 shipped on 2026-05-02 awaiting Vinson's explicit sign-off; the open-questions list named "migrate the other two plates" as a follow-up that would test the catalogue metaphor across plate types more diverse than just `centered-signin`. Holding the migration until explicit sign-off creates a chicken-and-egg: the eval is partly a question of *whether the metaphor scales*, which only the migration answers.
- **Options.** (a) Hold migration until Vinson explicitly signs off on Spike 2. (b) Migrate now, treating the migration as part of the evaluation (the visible result *is* the data on whether the metaphor scales). (c) Migrate one plate, hold the other.
- **Choice.** (b). Both plates migrated via registry flip — `layouts/app-shell` uses `aspectRatio: "16 / 10"` (cropped-print-screenshot framing because app-shell content is full-bleed-natural), `empty-states/inbox-zero` uses the default `5 / 6` portrait (centered-card content fits naturally).
- **Tradeoff.** Risk: if app-shell's cropping reads as broken layout rather than as "specimen-compressed view," that's a Spike 2 failure mode that wasn't visible on `centered-signin` alone — and the failure ships before Vinson can pre-veto. Counter: the Spike 2 metaphor *only* survives if it generalizes; postponing the test postpones the verdict. Reversing is one-line per plate (drop `layout` and `aspectRatio` from the registry entry), so the cost of being wrong is low.
- **Signal.** `lib/registry.ts` — `layouts/app-shell` and `empty-states/inbox-zero` entries gain `layout: "specimen"`. `app-shell` adds `aspectRatio: "16 / 10"`.

### 2026-05-02 — Adopt print-canon coverage range `[0.03, 0.22]` as a locked invariant

- **Problem.** Spike 1 surfaces (skeleton at ~6%, focus halo at ~25%, hero density) were tuned by eye. As more chrome surfaces adopt the dot vocabulary, ad-hoc densities drift; "feels right" stops scaling. A halftone fade band in Spike 2 step 6 would need a target density too — picking it cold is asking for inconsistency.
- **Options.** (a) Continue tuning each surface by eye. (b) Adopt a single bound (e.g. cap at 25%, no floor). (c) Adopt the print-canon range `[0.03, 0.22]` from `resources/moving_points.md` (and Sheridan halftone guidelines): always ≥3% so the field reads, never >22% before dots merge into a flat tint.
- **Choice.** (c). Locked invariant going forward; existing surfaces audited against it as Spike 2 progresses.
- **Tradeoff.** Mostly upside — design discipline tightens. Downside: the focus halo as currently spec'd in the design research (~25% on the annulus) is slightly above ceiling; if the haloes start reading as flat rather than dotted on retina, that's the failure mode the ceiling predicts. Worth checking on a high-DPR display before declaring it fine.
- **Signal.** `DECISIONS.md` "Locked invariants" section (added same day); `resources/moving_points.md` is the source.

### 2026-05-02 — Spike 2 test plate is `auth/centered-signin`

- **Problem.** Spike 2 builds one component page in full Specimen Cabinet treatment. The plate must give the highest contrast against the registry default to actually test whether the catalogue metaphor survives a full page.
- **Options.** (a) `auth/centered-signin`. (b) `layouts/app-shell`. (c) `empty-states/inbox-zero`.
- **Choice.** (a). Sign-in is the most heavily templated component on the web — the shadcn/Vercel default is densely seen — so a Specimen Cabinet treatment of it shows the contrast immediately.
- **Tradeoff.** Sign-in has a simple inner layout, so this doesn't stress-test specimen treatment against complex inner content (a real app shell, an empty-state illustration). If the metaphor only works on the simplest plate, the migration to the others isn't a templating exercise.
- **Signal.** Spike 2 commits will touch `components/showcase/auth/centered-signin.tsx` and the new specimen shell.

### 2026-05-02 — Spike 2 ships as a variant shell, opt-in via registry

- **Problem.** The Specimen Cabinet treatment changes the page-level layout fundamentally (registration crosshairs, marginalia code, foot-of-page colophon, plate number, two-papers light/dark). It needs to ship on at least one plate to be tested, but it touches the shell — which is shared by every plate.
- **Options.**
  - (a) Replace the existing shell wholesale; all three current plates inherit the treatment immediately.
  - (b) Build a `SpecimenShell` variant; only opt-in plates use it.
  - (c) Keep the existing shell and bolt specimen elements on as overlays.
- **Choice.** (b). New `specimen-shell.tsx` lives next to `shell.tsx`; registry entries gain a `layout: "specimen" | "default"` field. Centered-signin opts in; the other two plates stay on default until Spike 2 lands and migration is sanctioned.
- **Tradeoff.** Two shells means two code paths during the trial. Risk: the default shell rots while attention focuses on the specimen path. Worth it because Spike 2's whole purpose is *testing* whether the catalogue metaphor survives a full page; if it doesn't, throwing one shell away is cheap.
- **Signal.** New `app/c/[category]/[slug]/specimen-shell.tsx`; `lib/registry.ts` gains a `layout` field; `centered-signin` registry entry sets `layout: "specimen"`.

### 2026-05-02 — Narrow the chrome-cleanliness rule (Spike 1)

- **Problem.** `CLAUDE.md` originally said "Component UI chrome itself stays clean — no dots inside buttons, inputs, table cells, etc." Applied literally, this confines the dot language to four locations (hero, empty state, 404, brand mark) — which makes it read as a swappable theme, not a structural identity. The Rauno Freiberg test fails: a user can't predict the loader, focus ring, and empty state from each other if the language only lives on hero illustration.
- **Options.** (a) Drop the rule; allow dots anywhere. (b) Keep the rule as written. (c) Narrow the rule: control *interiors* stay flat, control *state and rhythm* (focus rings, selection, skeletons, dividers, scroll progress) carry the language.
- **Choice.** (c). [[principle-systems-over-syntax]] applies — the original rule conflated two distinct surfaces (interior vs. perimeter) into one ban.
- **Tradeoff.** The rule is harder to police mechanically; a reviewer has to judge "interior" vs. "state-and-rhythm" surface-by-surface. Spike 1 ships the chrome moves that prove the narrowing works (focus halo, selection, skeleton, link); if any of those still feel decorative rather than structural, the narrowing has overshot.
- **Signal.** `CLAUDE.md` updated 2026-05-02 (commit `727ab5a`). Spike 1 chrome moves: focus halo (`app/globals.css` `:focus-visible::after`), Federal Blue 30% selection, blue-noise skeleton (`components/_kit/skeleton.tsx`), dotted `.link` class.

### 2026-05-02 — Pseudo-element halo for focus, outline fallback for replaced elements (Spike 1)

- **Problem.** A first attempt at dot-vocabulary focus rings used CSS `outline-style: dotted`. Vinson said it "looked weird" — it's mechanically dots, but reads as accessibility noise rather than the brand language.
- **Options.** (a) Stay with `outline-style: dotted` and tune. (b) Build a pseudo-element radial-gradient halo, masked to an annulus. (c) Render a Bridson-distributed dot annulus per element via SVG overlay.
- **Choice.** (b) for normal elements + (a) preserved as a fallback for replaced elements (input, select, textarea — these can't host pseudo-elements).
- **Tradeoff.** The chrome language now has a permanent two-path architecture: pseudo-element halo for normal surfaces, dotted outline for replaced. Anything new with a focus state has to pick one. (c) was rejected as too heavy — would force a per-focus SVG render on every interactive element.
- **Signal.** `app/globals.css` `*:focus-visible::after` rules + replaced-element override; `data-focus-ring="off"` opt-out attribute.

### 2026-05-02 — `data-focus-ring="off"` opt-out for containers (Spike 1)

- **Problem.** Cards and other containers shouldn't show the halo — they're not interactive controls. But they still need a focused-state vocabulary so keyboard navigation reads.
- **Options.** (a) Halo on everything tabbable. (b) No focused state on containers. (c) Halo by default, explicit opt-out for containers; containers get a different vocabulary (lift + Federal Blue border).
- **Choice.** (c). Cards get `data-focus-ring="off"` and switch to lift + Federal Blue border on focus.
- **Tradeoff.** The chrome language now has *two* state vocabularies that have to feel coherent: halo (controls) and border-shift (containers). A future Spike 2/3 commitment is making the rule for which surface gets which feel principled, not arbitrary. If it doesn't, every new component becomes a coin-flip.
- **Signal.** `data-focus-ring` selectors in `app/globals.css`; card components on the homepage and elsewhere.

### 2026-05-02 — Bridson Poisson-disc by default for `DotField` (Spike 1)

- **Problem.** Jittered-grid sampling looks gridded at certain spacings — especially for skeletons, dividers, and focus halos where the eye is closer to the dot pattern than in a hero illustration.
- **Options.** (a) Keep jittered-grid; tighten jitter percentage. (b) Switch to Poisson-disc / blue noise (Bridson). (c) Add a per-call distribution choice and force callers to pick.
- **Choice.** (b) as the default; (c) is preserved as `distribution="grid"` for back-compat.
- **Tradeoff.** Existing decoratives that were tuned by eye against jittered-grid will read at a different visual density at the same `radius`. Re-tuning may be needed (called out in Spike 1 findings).
- **Signal.** `components/_kit/dot-noise.ts`; `DotField` default distribution changed to `"poisson"`.

### 2026-05-02 — Three-family type stack: Fraunces / Geist Sans / Geist Mono (Spike 1)

- **Problem.** The original brief said "Inter for UI, JetBrains Mono for code" — two families, no display. Without a display face, the dot language has no typographic counterpart, and the gallery reads default.
- **Options.** (a) Stay 2-family. (b) Add a serif display: Fraunces with parametric axes. (c) Add a different display (Cormorant, IvyPresto, GT Sectra).
- **Choice.** (b). Fraunces with **SOFT-30** + opsz 96 for display. Body and code both move to Geist (sans + mono) — keeps the system feel that Vercel/Linear ship while letting Fraunces carry warmth.
- **Tradeoff.** Three Google Font families are heavier on initial load than two. Justified because (i) Fraunces' SOFT axis literally simulates ink-spread, the strongest possible typographic bridge to halftone, and no other Google Font ships it; (ii) Geist Sans + Mono share a designer's hand and load smaller than Inter + JBMono. Mirrors [[typography-system]]'s discipline of one role per family.
- **Signal.** `app/layout.tsx` font setup; `app/globals.css` `.display` class enables SOFT 30 + opsz 96; `CLAUDE.md` type stack updated 2026-05-02.

### 2026-05-02 — Palette: warm cream + walnut + burnt persimmon, Federal Blue as accent-2 (Spike 1)

- **Problem.** Default Vercel/Linear/shadcn aesthetic uses cool grays + a single chroma accent. The dot language wants two-ink Risograph interplay (ink + accent), not a single themed color.
- **Options.** (a) Keep the original single-accent palette (cool gray + persimmon at H30°). (b) Move to two-ink: warm cream paper + walnut text + low-chroma burnt persimmon (H45° not H30°) + Federal Blue as `--accent-2`. (c) Three-color: cream + walnut + persimmon + a third hue for state.
- **Choice.** (b). Persimmon shifted to H45° (ochre-leaning, away from Anthropic/HN orange at H25). Federal Blue at OKLCH 38% L, 0.07 chroma, H250° — Riso-ink color, pairs with persimmon at the same chroma weight.
- **Tradeoff.** Federal Blue as a *second* accent means component authors have two signal colors to choose between, and getting the rule wrong is easy ("use accent-2 for state, accent for action" is the current rule but it's not obvious from the token names alone).
- **Signal.** `app/globals.css` `@theme` block; OKLCH coordinates map to the table in `resources/dots_reserach.md`.

### Pre-conversation decisions (carried in from the original brief)

These were locked before the design-research pass and survive Spike 1.

- **Tailwind v4 CSS-first, no `tailwind.config.js`.** Tokens via `@theme` in `app/globals.css`. Tradeoff: smaller surface area, but the IDE doesn't auto-complete tokens the way it would with a JS config.
- **Base UI primitives, not Radix.** Combobox drives the command palette; Dialog is the modal shell. Tradeoff: smaller component vocabulary than Radix, but the API is closer to native and the docs read cleaner.
- **No `framer-motion`. CSS transitions only.** Tradeoff: rules out spring physics and complex sequencing, but matches [[motion-budget]] discipline (a small, deliberate set of motion moments) and keeps the bundle smaller.
- **No chart library; hand-roll SVG.** Aligned with Spike 3's density-as-data ambition — charts will be SVG dot-cluster renderers using the same Bridson primitive as the hero.
- **Spacing scale {1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24}.** No 5/7/9/10/11. Tradeoff: tighter discipline; occasionally fights against odd content widths.
- **Light is the showcase; dark is correctness.** The brand argument is made in light. Tradeoff: dark gets less design love; if a visitor defaults to dark mode, the first impression is weaker.

---

## Open questions

Decisions deferred until evidence is in. Mirrors the [[open-questions]] pattern from the slash project.

- **Whether the catalogue metaphor survives a full page.** Tested by Spike 2. Risk is twee/cosplay; success looks like a designer-engineer screenshotting and posting the page.
- **Whether dots can carry quantitative meaning.** Tested by Spike 3. Risk is that texture is too low on Bertin's selectivity ranking for quantitative reading; success looks like a contribution-graph or heatmap-equivalent that reads structurally even at a glance.
- **Mobile fallback for marginalia code reveal.** Below ~1200px viewport, marginalia doesn't fit; the current plan is a full-width drawer. The drawer's chrome (sheet, tab, inline expand) is not decided.
- **`SITE_URL` placeholder.** Stays literal until the `vinsonfx.com` monorepo absorbs this gallery.
- **Whether two-papers light/dark works in practice.** "Knock out to cream paper color in dark mode" is a Riso-ink trick, but no one's seen it on the chrome state surfaces (skeleton, halo, divider) yet — Spike 2 tests it on at least the plate frame.
- **Coherence between the two focused-state vocabularies (halo vs. lift+border).** Open from decision 2026-05-02 ("`data-focus-ring="off"` opt-out for containers"). The rule for which surface gets which has to feel principled. Spike 2 should make this judgment on at least one container/control pairing.

---

## How to add a new decision

Append to the top of the **Decisions ledger** section using the [[articulation-framework]] shape:

1. **Problem.** What forced the choice.
2. **Options.** Three to four real alternatives.
3. **Choice.** Which one, named.
4. **Tradeoff.** What was given up. *(The seniority signal — don't omit.)*
5. **Signal.** Files / commits / locations where the decision shows up.

Date the entry. Update `## Locked principles` only if the decision changes one of the spirit-level rules.
