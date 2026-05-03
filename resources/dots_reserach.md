# Make the dots derive from the page, not sit on it

**The fix is a category change, not a styling one.** Stop building a shadcn-flavored registry that has dots on a hero, and start building a **digital type-specimen catalogue** where the dot is the atomic unit of state, hierarchy, and data density. Every reference the user named that actually works — Stripe Press, DIA, The Pudding, NYT Upshot — passes the same diagnostic: turn the dots off and the layout, the focus ring, the loader, the heatmap, and the section break all degrade simultaneously. Wallpaper dots are *applied*; structural dots are *derived from the same parameter file as the spacing system*. The current build fails that test. The "component chrome stays clean" constraint, as the user wrote it, is the proximate reason it fails — and below is an argument for narrowing that constraint rather than dropping it.

This report leads with 12 verified references, then commits to one palette + type stack + dot system, pressure-tests the chrome constraint, and ends with three spike experiments.

## Twelve references that earn their place

The bias here is heavy toward live product surfaces and brand sites where dots are a *system*, not a one-off illustration. Editorial-only and print-only references appear only when no digital equivalent exists.

1. **Stripe Press** — press.stripe.com. Halftone gradients and dot-screen textures across the entire \"living covers\" series; **each book gets a different screened palette, so the halftone language is the structural index of the catalogue itself.** This is the closest existing analog to what you should build.
2. **DIA Studio** — dia.tv and tools.dia.tv. Programmable dot grids and halftone-like point clouds power their kinetic identity systems. **Dot density is tied to typographic state** (motion phase, glyph variant) — the rare working example of dots-as-state.
3. **PostHog** — posthog.com. Uses Displaay's Matter SQ (literally \"square dots\") as the site typeface and pairs it with stipple-shaded Max-the-hedgehog illustrations across docs. Demonstrates **dots at multiple scales — type, illustration, layout** — under one brand.
4. **The Pudding** — pudding.cool. The gold standard for **dots tied to information density**: \"Population Mountains,\" the bands-in-NYC piece (7,000 dots narrowing to 11), dialect maps. Each dot is a measured unit; reading the density *is* reading the data.
5. **NYT Upshot** — nytimes.com/section/upshot. The 2020 precinct dot map and election-night needle render millions of dots in production where **density and color simultaneously encode quantity and category** — dots-as-data-grammar at scale.
6. **Resend** — resend.com. The hero's 3D Rubik's-cube reads as a coarse halftone grid; the design handbook cites Vignelli/Eames discipline. Useful as a counterpoint: **a structured grid of discrete cells is the brand's atomic unit**, exactly analogous to a single dot in a halftone screen.
7. **Christoph Niemann** — christophniemann.com. Portfolio thumbnails and New Yorker covers translate silkscreen dot logic into web layout; the grid-of-thumbnails layout itself reads as a coarse halftone of his work. **Dot logic scaling up to become layout principle.**
8. **Lotta Nieminen Studio** — lottanieminen.com. Cienne, Maisonette, and Posture identity work uses stipple shading and Risograph-style overlays as a recurring formal system across radically different commercial clients.
9. **Tim Lahan / Trademark™** — timlahan.com and trademark-trademark.com. Dot-shading and CMYK separation as a recurring brand-agnostic primitive across KENZO, Pitchfork, and New Yorker work.
10. **Pentagram's MIT Media Lab identity** — pentagram.com/work/mit-media-lab. **A single 7×7 grid generates one logo and 23 sub-glyphs.** This is the canonical \"one parametric substrate, many surfaces\" lesson — the precise structural move you need.
11. **Pirsch Analytics** — pirsch.io. Privacy-analytics SaaS with restrained dot vocabulary tying \"tracking events as discrete points\" to the visual identity. Useful as a low-key SaaS reference for dotwork as product-purpose encoding.
12. **Are.na** — are.na. Less a single reference than a research surface — its halftone, stipple, and \"riso digital\" channels are an active archive — but the platform itself models how a **clean grid-based UI can host visually rich dot work without fighting it**.

The strongest four (Stripe Press, DIA, Pudding, Upshot) share three traits: dots are an *atomic unit* with rules for how density maps to meaning; dots repeat at *multiple scales* (type, illustration, layout, data viz); and the system is *generative* — re-applicable to new content without breaking. The weak references almost always fail one of those three.

## The single recommendation: a Specimen Cabinet built on Folio + Fraunces, with dots as the system's derivative

This is one direction, taken seriously, end to end. The brief asked for opinion over options.

### Conceptual frame

The gallery is **a 50-plate digital folio**, not a component registry. Every other site in the field — shadcn/ui blocks, Aceternity, Magic UI, Cult UI, Tremor — is a registry: install via CLI, copy, ship. The unfilled niche is a *catalogue* — a thing you read, where the 50 components feel curated like NYRB's backlist rather than auto-generated like shadcnblocks' 1,500-block firehose. The catalogue framing is what gives \"warm paper + pointillism\" somewhere to actually live, and it survives the registry conventions you can't escape (links to source, light/dark, search) by reframing them as colophons, plates, and indices.

### The Folio palette in OKLCH, both modes

This is **the strongest defense against \"default Vercel/Linear\"**: low-chroma persimmon shifted from H 30° toward H 45° (ochre), paired with a Riso Federal Blue as the literal second drum. The current single-accent direction is missing the two-ink interplay that makes Risograph print look stenciled rather than themed.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `oklch(96.5% 0.012 85)` warm cream | `oklch(18% 0.014 70)` warm tea-ink |
| `--surface` | `oklch(98.2% 0.008 85)` | `oklch(22% 0.015 70)` |
| `--border` | `oklch(89% 0.014 80)` | `oklch(30% 0.016 70)` |
| `--fg` | `oklch(22% 0.025 65)` deep walnut | `oklch(93% 0.012 85)` paper |
| `--muted` | `oklch(48% 0.020 70)` | `oklch(65% 0.015 75)` |
| `--accent` | `oklch(58% 0.14 45)` burnt persimmon | `oklch(70% 0.115 50)` |
| `--accent-2` (ink) | `oklch(38% 0.07 250)` Federal Blue | `oklch(70% 0.09 245)` |

**Hard avoidances**: `#FFFFFF` surfaces (instant default-shadcn), persimmon chroma above 0.16 (drops into Anthropic/HN orange), pure cold black foreground (always tint toward 60–70°), any teal accent (fights the warm base). Selection color is **Federal Blue at 30% alpha**, never system blue — this is your first chrome-touching dotwork token.

### The Library Scholar type stack

| Role | Font | Source | Setting |
|---|---|---|---|
| Display | **Fraunces** (variable, opsz/wght/SOFT) | Google Fonts | 600 weight, opsz 96, **SOFT 30**, `letter-spacing: -0.022em` |
| Body | **Geist Sans** (variable) | Vercel Fonts | 400 at 14px, `letter-spacing: -0.006em`, line-height 1.5 |
| Mono | **Geist Mono** | Vercel Fonts | 450 at 13px, `letter-spacing: 0em` |

The single most important setting in the entire stack is **Fraunces' SOFT axis at 30** — it's a parametric ink-spread slider, the typographic equivalent of dot bleed, and no other Google Font ships it. Fraunces does the editorial work in headlines while Geist keeps body density at Notion/Vercel grade. Pairing Geist with anything other than Geist is the cheapest way out of the default Vercel look, and Fraunces specifically is the only display face that *visually argues for stippling* by shipping the bleed control as a font axis.

### The dot system, derived from one parameter file

Treat dots as a typed function `coverage(zone, value)`. The system has three permission tiers, every dot in the system descends from a single 12-px substrate grid (the Pentagram MIT lesson), and the distribution is always **Poisson-disc / blue-noise** with `r ≥ 1.5d` minimum spacing — never uniform grid, never pure random. Jitter is held at 10–20% of the spacing radius; below that you get a grid, above you get noise.

Coverage by zone, with these specific numbers tied to halftone-print canon (max 22% to mirror the 85% halftone tonal cap above which dots merge into solid):

- **Body text and control interiors** — 0%. Sacred space, by rule.
- **Section anchors and dividers** — 4–6%, single-row band.
- **Section headers** — 6–10%, fading to 0 over 120px.
- **Hero and empty states** — 12–18%, blue-noise.
- **Data zones (heatmap, sparkline replacement)** — 0–22% as a **linear ramp on the underlying value**, capped at 22%.
- **Focus rings** — 25% on the annulus (momentary states need to register).

Every zone other than data zones has constant coverage; data zones derive coverage from value. **That distinction — constants vs. derivatives — is the structural-vs-decorative divide expressed mathematically.** When a viewport changes, coverage stays constant and dot-value scales (ESRI's `referenceScale` rule). Dot-density encodes nominal/ordinal data only — Bertin's selectivity ranking puts texture near the bottom for quantitative reading, so dots replace heatmaps and contribution graphs but never bar or line charts.

### Where dots actually appear (the structural commitments)

Pick at least four; ship them as one PR; refuse to ship one without the others.

**Focus rings.** Replace the standard 2px solid ring with a 1.5-radius ring of dots at 25% density, Poisson-distributed on an annulus. Same Bridson algorithm as the hero, just constrained to a ring. This is the move that makes the language non-removable — pull it and every interactive element loses its accessible focus state.

**Loaders and skeletons.** Skeletons render as ~3% blue-noise stipple of the eventual layout. As data resolves, density rises to the rendered state's 0% (chrome) and snaps. **Loading and rendered are the same visual language at two densities** — not skeleton-shimmer-then-content.

**Dividers.** Replace `border-b` with a horizontal dot row whose density crescendoes 8% → 100% → 8% across the rule, set on the halftone canon's 22.5° angle. This is mechanically the same code as the hero generator with different parameters.

**Section anchors and scroll progress.** A vertical dot column down the right edge: the dot at your scroll position is solid; dots above darken proportionally; dots below stay 8%. Same density-encodes-tone principle as the dot-rule, applied to navigation.

**Single-dot status (the Dynamic Island lesson).** One 8px dot at the top-right of every plate whose color and density encode lifecycle: stable, new, deprecated, experimental. One mark, four states, no icon library.

**The contribution-graph move.** Anywhere a calendar heatmap would appear, render a dot cluster per cell (0 commits = no dots, 1–3 = one dot, 4–10 = three triangular, 11+ = full 9-dot 3×3). The grid visually *is* a halftone of the user's year — and it's a working specimen of dot-density-as-data for the gallery itself.

### How the catalogue surfaces look

**The home index** is a single-column manuscript-grid ledger, fifty rows. Left margin: a hand-set `№ 023` plate number in Fraunces small caps. Center: component name in Fraunces display, one-line editorial blurb beneath like an NYRB jacket flap. Right margin: a 32×24 stippled thumbnail rendered as actual dots whose density approximates the visual weight of the component. Hover the row → the stipple resolves into a live mini-render. This out-composes devl.dev's wireframe-icon folder system by **going further into the printed-ledger metaphor, not adding registry chrome**.

**Category dividers** are **not** uppercase-tracking-wider labels. They are running heads in the magazine sense: `Plate IX. — Empty States.` set in Fraunces small italic, with a halftone fade band (200px tall, 70% → 0% density) ending one section and the inverse fade-in opening the next. Two Riso passes meeting on the page.

**Component preview chrome** has no border. Four corner **Risograph registration crosshairs** in `--accent-2` (Federal Blue), each rendered as three concentric stippled rings, mark out the plate. The component floats inside, suspended in cream paper. Optional: a 2–3px ghost offset of a single dot-channel along one edge, mimicking the ±1–3mm misregistration that real Riso prints exhibit. The thing inside stays clean; the wrapping carries the language.

**Light/dark pairing is \"two papers, one ink.\"** Light mode: cream paper, dots are positive ink. Dark mode: charcoal paper (`oklch(18% 0.014 70)`), dots **knock out** to the cream paper color rather than being lighter dots on dark. This mirrors how Riso ink is semi-transparent and how dotwork on dark works (negative space, not white ink). A small \"stock\" indicator reads `Munken Polar 300g · Federal Blue ink` and `Fedrigoni Arena Cream 90g · Federal Blue ink` — a ridiculous detail that makes the gallery feel yours.

**The source-code toggle is a foot-of-page colophon.** No top-right pill. At the bottom of every plate: \"Set in Fraunces 96/96 SOFT 30, Geist Sans 14/21, Geist Mono 13/19. Composed in TypeScript 5. Pressed onto Tailwind v4. First impression May 2026.\" The view-source affordance is a quiet `· read the plate ·` link inside the colophon. Code, when opened, **slides into the right outer margin as marginalia** — code is your annotation in pencil on the page; the component preview stays primary.

**Micro-details that compound.** Favicon is a 9-dot `№` glyph that resolves at 32px and reads as a printer's mark at 16px. OG images are auto-generated specimen cards per plate. The 404 is `№ 404 — plate not found in catalogue` with one centered dot. Link hover swaps `text-decoration-style: dotted` for solid as density rises. The footer is a real colophon: \"Composed and pressed in [your city], in the autumn of MMXXVI.\" `robots.txt` has an ASCII-stippled `№` and the comment `# 50 plates set by hand. crawl gently.`

## Pushing back on \"component chrome stays clean\"

**The constraint as written is partially working against you, and you should narrow it rather than drop it.** The interior of a button, the cell of a table, the stroke of an input — yes, those stay flat ink on paper. That part of the brief is correct and matches how Stripe and Linear actually work: clean chrome carries the language by *consistent retreat*, and that retreat is itself a system rule.

But the brief currently treats *all* chrome as off-limits, including focus rings, loading states, hover state changes, selection color, scrollbars, and dividers. **Those are not control interiors; those are control state and control rhythm, and they are exactly where the language has to live for it to be structural.** The Rauno Freiberg test is brutal: if a user learns \"more dots = more activity\" once on a dashboard, they should be able to *predict* the loader, focus ring, and empty state without being shown. If focus rings stay 2px solid because of \"clean chrome,\" they can't predict, and the dotwork stays a hero illustration.

Reframe the constraint as: **interior surfaces of controls remain flat (no halftone fills inside button bodies, no dot patterns inside table cells, no stippled input strokes); perimeter, state, and rhythm of controls carry the language.** That permits stippled focus rings, density-emergence loaders, dotted dividers, dot-based scroll progress, single-dot status, and Federal-Blue selection, while still keeping the inside of every control as quiet as a Stripe checkout. Without this narrowing, the dots can only live on hero, brand mark, 404, and one empty state — which is precisely the four locations the user already shipped, and precisely why it reads as a swappable theme.

## Three spike experiments, smallest to largest

**Spike 1 — State-level dot pass (≈1 day).** In the existing app, replace four chrome tokens: focus ring (Bridson annulus, 25% coverage), text selection color (Federal Blue 30% alpha), loading skeleton (3% blue-noise that ramps to layout), and link `text-decoration-style` (dotted → solid on hover). Ship nothing else. **What this teaches**: whether the dot language reads as coherent across micro-state surfaces without any large compositions — i.e., whether structure-without-hero works. If it doesn't feel like anything, the language is too quiet to live in chrome alone and you need bigger compositions. If it feels like a different product, you've found the spine.

**Spike 2 — One Specimen Plate end to end (≈3 days).** Build one component page in full Specimen Cabinet treatment: registration-crosshair chrome in place of borders, foot-of-page colophon, marginalia code reveal, two-papers light/dark toggle, plate number, Fraunces running head, halftone fade section break. Pick the sign-in component because it's the most familiar and therefore the highest contrast against the registry default. **What this teaches**: whether the catalogue metaphor survives a full page or collapses under its own preciousness. The risk is twee; the test is whether a designer-engineer screenshots the page and posts it, or whether it reads as cosplay. If it works, the rest of the 50 plates are a templating exercise, not a design exercise.

**Spike 3 — Density-as-data on one component (≈1–2 weeks).** Pick one dashboard component that includes a calendar heatmap or sparkline. Replace it with a server-rendered Voronoi-stippled equivalent using Adrian Secord's weighted-Voronoi algorithm: dot density at each cell is `clamp(baseline + slope × normalize(value), 0, 0.22)`. The stippling pipeline is server-side SVG (matches the existing constraint), and the same generator powers the hero, divider, focus ring, and this chart — proving the *one parameter file* claim. **What this teaches**: whether dots can carry quantitative meaning in a real product context, which is the highest bar for structural integration and the bar Pudding and Upshot clear. If it works, the gallery has a unique selling claim no other registry has — a design system where decoration and data share a renderer. If it doesn't, you fall back to dots-as-state-and-rhythm without dots-as-data, which is still well past where you are now.

The three spikes are deliberately ordered so each tells you whether to keep going. Spike 1 validates the chrome-narrowing argument cheaply. Spike 2 validates the catalogue metaphor on one surface. Spike 3 is the moat — the thing that makes the gallery a working argument about pointillism rather than a portfolio that uses it.