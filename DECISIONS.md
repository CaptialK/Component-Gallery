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

## Decisions ledger

Each entry is a decision made and the cost paid. Newest first.

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
