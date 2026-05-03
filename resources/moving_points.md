# Structurally-integrated pointillism: a technical reference for Next.js 15

This is a working reference for building a dot/pointillism component system where **density encodes meaning, opacity encodes time, and every animation has a reduced-motion equal**. It assumes Next.js 15 App Router, React 19, Tailwind v4 (`@theme` CSS-first), TypeScript, and OKLCH tokens. Read top-to-bottom once, then return to specific sections.

The single most important rule arrives now and recurs throughout: **dots are not decoration**. If a dot field can be removed without losing information, remove it. If it stays, it must be tied to information density (data), hierarchy (layout), or state (interaction).

---

## Mental models and the rules that govern the system

Three rules drive every decision below.

**Rule 1 — Density encodes meaning, opacity encodes time.** Dot count per cell carries the data signal. Opacity carries motion (entrance, settle, pulse). Never animate `r` to encode change; animate count or opacity instead. This separation makes the system performant (opacity is composited) *and* accessible (a `prefers-reduced-motion` user gets the same density information without the time-domain animation).

**Rule 2 — At each viewport break, regenerate; do not transform.** ESRI's cartographic `referenceScale` rule says coverage stays invariant when the viewport changes. The math is unforgiving: coverage `C = N · π·r² / A`. If `A` halves, you must either halve `N` or shrink `r`. Shrinking `r` below ~2 CSS px makes dots vanish on standard-DPI displays; the right answer is to halve `N` by switching the *generator* at a container-query breakpoint. This is the principle behind Pentagram's MIT Media Lab system: one grid generates many marks. You're not animating between mobile and desktop dot fields — you're toggling generator outputs.

**Rule 3 — Tier escalation is set by dot count, not feel.** SVG <500, SVG-with-care 500–5,000, Canvas 2D 5,000–50,000, WebGL 50,000+. Cross a threshold and the technology changes; the API the rest of the app sees does not.

The aesthetic target is "Stripe Press meets Risograph print": warm cream ground (`oklch(0.97 0.02 85)`), one or two saturated accent inks, halftone-style dot fields where coverage stays in the print canon **3–22%** (lower bound so the field reads, upper bound so it doesn't smear into a flat tint).

---

## Dimension 1 — Responsive to viewport

### SVG `viewBox` + `preserveAspectRatio`

The mental model from MDN: `meet` is `background-size: contain`, `slice` is `cover`, `none` disables uniform scaling. The recommendation matrix for a dot system:

| Surface | viewBox | preserveAspectRatio | Why |
|---|---|---|---|
| Hero dot field | `0 0 1600 900` | `xMidYMid slice` | Dots reach all edges; crops gracefully on extreme aspect ratios. |
| Divider strip | one tile, e.g. `0 0 120 8` | tile via `<pattern userSpaceOnUse>` | Pattern repeats horizontally without distortion. |
| Illustration card | natural aspect | `xMidYMid meet` (default) | Whole graphic visible. |
| Inline icon | square viewBox | default | Standard icon behavior. |

**Never use `preserveAspectRatio="none"` on a dot field.** A `<circle r="3">` rendered into a `1600×400` viewport from a `100×100` viewBox becomes a 48×12 ellipse. Pointillism reads as "field of dots" specifically because the elements are circular; the moment they become ovals, the eye reads texture *and direction* — and the system collapses (Sara Soueidan, [SVG Coordinate Systems](https://www.sarasoueidan.com/blog/svg-coordinate-systems/)).

### `<pattern>` units — the SVG footgun

`patternUnits` and `patternContentUnits` are independent attributes with **mismatched defaults**: `patternUnits` defaults to `objectBoundingBox`, `patternContentUnits` defaults to `userSpaceOnUse`. For a dot tile, set both to `userSpaceOnUse` so geometry is in user-space units everywhere, the tile is exactly 120×120 user units regardless of the rect being filled, and your dot radius means what you think it means.

```html
<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <pattern id="poissonTile" x="0" y="0" width="120" height="120"
             patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse">
      <circle cx="18"  cy="22" r="3" fill="var(--dot-ink)"
              shape-rendering="geometricPrecision"/>
      <circle cx="74"  cy="40" r="3" fill="var(--dot-ink)"/>
      <circle cx="46"  cy="86" r="3" fill="var(--dot-ink)"/>
      <circle cx="102" cy="98" r="3" fill="var(--dot-accent)"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#poissonTile)"/>
</svg>
```

A subpixel-seam quirk persists at fractional DPRs (1.5, 1.75): tiles can show thin gaps. Mitigations are integer tile widths and `shape-rendering="crispEdges"` on the pattern's background `<rect>` only — *never* on the circles themselves; that disables anti-aliasing and produces visibly polygonal dots at small radii.

### Inline SVG vs background-image SVG vs radial-gradient

| Technique | Pros | Cons |
|---|---|---|
| Inline `<svg>` | DOM-addressable, reads CSS vars (`var(--dot-r)`), accessible, no extra HTTP, server-streamable in RSC. | Inflates HTML payload. |
| `background-image: url(data:image/svg+xml,…)` | Browser-cached, free repetition. | Not stylable; doesn't respond to color-scheme without re-encoding; some Chromium builds rasterize at fixed size → blur on DPR>1. |
| `radial-gradient` "fake dots" | Zero markup, GPU-friendly. | Regular grid only — cannot place at Poisson-disc coordinates. |

**For pointillism, inline SVG is the only choice that supports arbitrary stippling distributions.** You can't do blue noise, Wurman dots, or weighted Voronoi with `radial-gradient`.

### CSS custom properties as the bridge

Declare tokens at `:root`, override per `@media`, `@container`, `prefers-color-scheme`, `prefers-reduced-motion`. SVG consumes them via `fill="var(--dot-ink)"` directly.

```css
:root {
  --dot-ink: oklch(0.18 0 0);
  --dot-accent: oklch(0.68 0.18 25);
  --dot-r: 3;
  --dot-jitter: 0.4;
  --dot-coverage: 0.04;
}
@media (prefers-color-scheme: dark) {
  :root {
    --dot-ink: oklch(0.94 0 0);     /* near-white, NEVER pure #fff */
    --dot-accent: oklch(0.78 0.16 25);
  }
}
@media (prefers-reduced-motion: reduce) {
  :root { --dot-pulse-amp: 0; }
}
```

**Important caveat on `r` as a CSS property.** SVG2 promotes `cx`, `cy`, `r`, `rx`, `ry`, `x`, `y`, `width`, `height` to "Geometry Properties" — settable via CSS in modern Chromium, Firefox, and Safari ([MDN `r`](https://developer.mozilla.org/en-US/docs/Web/CSS/r), [Cloud Four](https://cloudfour.com/thinks/so-you-can-set-an-svg-circles-radius-in-css/)). The form `<circle r="var(--dot-r)">` in an *attribute* is **not part of any spec** — `var()` only works in CSS, not in SVG attribute values. Use either `<circle r={3} />` with a CSS rule `circle { r: var(--dot-r); }`, or bake the resolved value at server-render time.

### Aspect ratio handling

Three options, decreasing recommendation order: the modern `aspect-ratio: 16 / 9` CSS property (Baseline since Sept 2021); a wrapper with the property plus an absolutely positioned child SVG using `preserveAspectRatio="xMidYMid slice"`; the legacy `padding-bottom: 56.25%` hack (only relevant if you must support IE-era engines, which in 2026 you don't).

A useful side trick: an inline `<svg viewBox="0 0 16 9">` *naturally* enforces 16:9 because the browser reserves space using the intrinsic ratio of the viewBox before any CSS loads — handy when a parent flex/grid contests `aspect-ratio`.

### DPR (devicePixelRatio) handling

SVG itself is resolution-independent, but three gotchas matter:

1. **Use `shape-rendering="geometricPrecision"`** as the default for circles ≥ 2 px. `crispEdges` disables anti-aliasing and produces visible polygons; `optimizeSpeed` does the same at lower priority ([MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/shape-rendering)).
2. **Sub-pixel `cx`/`cy` cause anti-aliased blur.** For dots ≤ 1.5 px, round to integer user-space coordinates aligned with device pixels.
3. **SVG used as a raster background-image is rasterized at CSS size by some engines** — DPR scaling produces fuzzy dots. Inline the SVG to avoid this.

### Tailwind v4 container queries — switch generators, not sizes

Tailwind v4 has first-class container queries via `@container`, the `@sm:`/`@md:`/etc. variants, named containers (`@container/dotfield`), arbitrary values (`@[42rem]:`), and the `cqw`/`cqi`/`cqh`/`cqb` units. The 2025/2026 idiom for dot fields is to **swap the generator function** at breakpoints rather than animate between sizes — a tiny container with the same dot count produces illegible mush:

```tsx
export default function DotField() {
  return (
    <section className="@container relative isolate">
      {/* Narrow: hex grid, fewer dots */}
      <svg className="block @md:hidden absolute inset-0 size-full"
           viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice"
           shapeRendering="geometricPrecision"
           dangerouslySetInnerHTML={{ __html: Hex({ cols: 24, rows: 14 }) }} />
      <svg className="hidden @md:block @2xl:hidden absolute inset-0 size-full"
           viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
           dangerouslySetInnerHTML={{ __html: Poisson({ minDist: 14 }) }} />
      <svg className="hidden @2xl:block absolute inset-0 size-full"
           viewBox="0 0 2400 1350" preserveAspectRatio="xMidYMid slice"
           dangerouslySetInnerHTML={{ __html: Wurman({ cellPx: 24 }) }} />
    </section>
  );
}
```

Pair this with container-relative variables for residual scaling: `--dot-r: clamp(2px, 0.18cqi, 4px);`.

### Server-side generation in Next.js 15

Three render-times, three uses:

| Variant | Where | When |
|---|---|---|
| Build-time (static) | top-level export from a server module | Decorative dot field that never changes per user. |
| Per-request RSC with `'use cache'` | inside the component | Parameterized by route params (e.g. seeded by slug). |
| Client-side | `'use client'` + `useEffect` | Interactive (cursor-follow, scroll-driven, real-time data). |

Next.js 15 introduced the `'use cache'` directive (function/component/file scope) with `cacheLife()` and `cacheTag()` from `next/cache`. Arguments and closed-over values become part of the cache key automatically. A stable seeded dot field with `cacheLife('max')` is effectively cached forever — exactly what a deterministic Poisson-disc tile wants. Two important nuances: `fetch()` is **no longer cached by default** in v15, and cached components cannot directly call `cookies()`/`headers()`/`searchParams` (read those outside and pass as args).

For very large fields (>50,000 circles), inline SVG generated server-side blows up the RSC payload (~30 bytes per `<circle>` minimum). Either collapse to a single `<path>` of stamped arcs (one element, one fill), or escalate to canvas/WebGL on the client.

### Mobile and OLED specifics

Touch targets must be **≥24×24 CSS px (WCAG 2.5.8 AA, new in 2.2)** and ideally ≥44×44 (Apple HIG, WCAG 2.5.5 AAA) or 48×48 (Material). A 6 px visual dot is *never* the hit area; wrap in a button with `min-inline-size: 44px; display: grid; place-items: center;` and shrink the visible dot inside it.

OLED true-black (`#000`) creates pixel-off-then-on transitions during scroll, producing a smear/ghost trail. With dots — every dot creates a hard `#000`↔`#fff` boundary — this is worst-case. Use near-black (`oklch(0.04 0 0)` ≈ `#0a0a0a`) and near-white (`oklch(0.94 0 0)` ≈ `#ededed`), never pure values.

### Browser support matrix (Q2 2026)

| Feature | Status |
|---|---|
| `aspect-ratio` | Baseline since Sept 2021 |
| `@container` size queries | Baseline since Feb 2023 (Chrome 105, FF 110, Safari 16) |
| `oklch()`, `color-mix()` | Baseline since May 2023 |
| SVG2 geometry props as CSS (`r`, `cx`, `cy`) | Stable in evergreen Chromium/Firefox/Safari |
| `shape-rendering` | Universal |
| `prefers-reduced-motion` | Universal (Chrome 74+, FF 63+, Safari 10.1+) |
| `prefers-color-scheme` | Universal |
| OffscreenCanvas | Baseline since 2024 |
| CSS `sqrt()`/`pow()`/`hypot()` | Chrome 125+, Safari 17+, FF 118+ (early 2024) |

---

## Dimension 2 — Responsive to user input

### Cursor proximity, the CSS-only pattern

The canonical pattern: update `--cursor-x` and `--cursor-y` on `:root` from a `pointermove` handler, then consume them entirely from CSS. Updates run on the compositor; React never re-renders.

A spotlight `::before` is the simplest case:

```css
.spotlight::before {
  content: "";
  position: absolute; inset: 0;
  background: radial-gradient(
    300px circle at var(--cursor-x) var(--cursor-y),
    oklch(0.7 0.15 280 / 0.18), transparent 60%);
  pointer-events: none;
}
```

For per-dot displacement, with each dot carrying `--dot-x` and `--dot-y` anchors:

```css
@property --cursor-x { syntax: "<length>"; inherits: true; initial-value: -9999px; }
@property --cursor-y { syntax: "<length>"; inherits: true; initial-value: -9999px; }

.dot {
  --dx: calc(var(--cursor-x) - var(--dot-x));
  --dy: calc(var(--cursor-y) - var(--dot-y));
  --d: hypot(var(--dx), var(--dy));
  --falloff: clamp(0, calc(1 - var(--d) / 240px), 1);
  transform: translate(
    calc(var(--dx) * var(--falloff) * -0.08),
    calc(var(--dy) * var(--falloff) * -0.08));
  opacity: calc(0.4 + 0.6 * var(--falloff));
}
```

`hypot()` accepts matched dimensions (lengths); `sqrt()` accepts only `<number>`. `hypot` is what you want for px distances. CSS Values 4 math (`sqrt`, `pow`, `hypot`, `sign`, `abs`, `log`, `exp`) shipped in Chromium 125+, Safari 17, Firefox 118 — broadly available since early 2024 ([Daniel Wilson summary](https://danielcwilson.com/posts/mathematicss-powers/)).

Use `pointermove` (covers mouse + pen + touch), and **gate cursor effects behind `(hover: hover) and (pointer: fine)`** — without the gate, a phone never updates the variables and the spotlight either never appears or freezes at the last touch point ([Smashing on hover/pointer queries](https://www.smashingmagazine.com/2022/03/guide-hover-pointer-media-queries/)).

### Scroll-driven animations — the 2026 state

This is now a baseline feature in production browsers:

| Engine | Status (May 2026) |
|---|---|
| Chrome / Edge | Full support since 115 (July 2023) |
| Safari | **Full support since Safari 26 (2025)** |
| Firefox | Behind `layout.css.scroll-driven-animations.enabled`; included in **Interop 2026** |

Two timelines: `animation-timeline: scroll(<scroller> <axis>)` (scrollbar position) and `animation-timeline: view()` (element's position inside its scroll container, with `animation-range` keywords `cover`, `contain`, `entry`, `exit`, `entry-crossing`, `exit-crossing`). For Firefox, gate with a feature query that tests *both* `animation-timeline` and `animation-range`:

```css
.dot-col-fill { opacity: 1; }   /* visible by default */

@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) and (animation-range: 0% 100%) {
    .dot-col-fill {
      animation: dot-emerge linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 80%;
      animation-duration: 1ms;   /* Firefox needs a non-zero placeholder */
    }
  }
}
```

The official polyfill at [scroll-driven-animations.style](https://scroll-driven-animations.style/) is JS-based, runs on the main thread, and defeats the point of the feature; prefer feature-queries with sensible fallbacks. Two production case studies are conclusive: Tokopedia reduced average CPU usage **from 50% to 2% during scroll** by porting from JS to native CSS scroll-driven animations ([Chrome blog](https://developer.chrome.com/blog/css-ui-ecommerce-sda)).

### Intersection Observer for one-shot reveals

Scroll-timelines drive *continuous* progress; entrance reveals are one-shot. IntersectionObserver is still preferred for the latter — universal support, off-main-thread dispatch, easy to unobserve. The pattern: observer toggles a class; CSS handles the animation; per-dot `animation-delay` creates the stagger.

```ts
export function useReveal<T extends HTMLElement>(
  ref: React.RefObject<T>,
  { threshold = 0.15, rootMargin = "0px 0px -10% 0px" } = {}
) {
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("revealed"); io.disconnect(); }
    }, { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, rootMargin]);
}
```

```css
.dot { opacity: 0; transform: translateY(8px) scale(0.6); }
.revealed .dot {
  animation: settle 600ms cubic-bezier(.2,.7,.2,1) both;
  animation-delay: calc(var(--i) * 30ms);
}
@keyframes settle {
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

The `--i` index is set inline (`style={{"--i": index}}`) per dot. Negative `rootMargin` defers reveal until the element is meaningfully on-screen.

### Focus-visible: the stippled focus ring

`:focus-visible` is universal in 2026. The "stippled focus ring" is two-phase: an instant 80 ms inner ring snap (visibility — meets WCAG 2.4.7 immediately) followed by a 200 ms outer dot bloom (delight). Bridson is run *once* on an annulus around the target at component mount; each dot gets an `--i` for the bloom stagger.

```css
.dot-button:focus { outline: none; }
.dot-button:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--surface),
    0 0 0 4px var(--accent);   /* immediate, contrast ≥3:1 */
}
.dot-button:focus-visible .focus-dot {
  animation: dot-bloom 200ms ease-out 80ms both;
  animation-delay: calc(80ms + var(--i) * 8ms);
}
```

The WCAG citations that govern this are **2.4.7 Focus Visible (AA)**, **1.4.11 Non-text Contrast (AA)** — focus indicator must have ≥3:1 contrast against adjacent colors — **2.4.11 Focus Not Obscured (Minimum) (AA, new in 2.2)**, and **2.4.13 Focus Appearance (AAA, new in 2.2)** which sets a minimum perimeter (≥2 CSS px thick). [Sara Soueidan's focus-indicator guide](https://www.sarasoueidan.com/blog/focus-indicators/) is the definitive write-up. WebAIM's 2024 audit found 78% of the top one million home pages had focus indicator failures — meeting the spec is real value, not theatre.

### Hover crescendo on dividers via `mask-position`

A horizontal divider strip is a tile-repeated dot field; a soft mask travels left→right on hover, revealing a denser stripe. **`mask-position` is animatable on the compositor** (the rasterized mask bitmap is reused; only its translation changes). Animating `mask-image` (changing the gradient stops) is *not* compositor-friendly — it forces paint.

```css
.divider-dots {
  height: 2px;
  background: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1.5px) 0 0 / 6px 2px;
  mask-image: linear-gradient(90deg, transparent, black 30%, black 70%, transparent);
  mask-size: 200% 100%;
  mask-position: 100% 0;
  transition: mask-position 600ms cubic-bezier(.2,.7,.2,1);
}
.divider-dots:hover { mask-position: 0% 0; }
```

### Scroll velocity as a signal

The naive approach — scroll listener that reads `scrollY` — synchronously forces layout and runs on the main thread, producing event spam during inertial flings. Use rAF and an exponential moving average (`alpha ≈ 0.1–0.2`):

```ts
export function useScrollVelocity({ alpha = 0.18 } = {}) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    let last = window.scrollY, lastT = performance.now(), ema = 0, raf = 0;
    const tick = (t: number) => {
      const y = window.scrollY;
      const dt = Math.max(1, t - lastT);
      const inst = Math.abs(y - last) / dt;     // px/ms
      ema = alpha * inst + (1 - alpha) * ema;
      last = y; lastT = t;
      setV(ema);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [alpha]);
  return v;
}
```

Bramus has a clever pure-CSS variant: register `--scroll-position` and `--scroll-position-delayed` as `@property <number>`, drive both 0→1 with a scroll timeline, then `transition: --scroll-position-delayed 0.15s linear` so the delayed variable lags. Their difference *is* the velocity, used directly in `transform: skewY(calc((var(--scroll-position) - var(--scroll-position-delayed)) * 60deg))` ([bram.us scroll-detection](https://www.bram.us/2023/10/23/css-scroll-detection/)).

### Magnetic / gravitational dot fields — the three tiers

| Tier | Setup | Max dots | Physics | DOM |
|---|---|---|---|---|
| CSS only | trivial; one rAF for `--cursor-x/y` | ~200 | static falloff only | dots are real DOM, focusable |
| Canvas 2D | 30–80 LoC physics loop | ~5,000 | full velocity/damping | none in DOM |
| WebGL shader | shaders, uniforms | 100,000+ | shader-only, GPU per-vertex | none in DOM |

For a *pointillism UI* with semantic dots, Tier 1 is usually the right answer — the dots have ARIA roles, focus participation, layout role. Escalate only when count demands it.

---

## Dimension 3 — Responsive to data

### Voronoi-weighted stippling (Adrian Secord, NPAR 2002)

Inputs: a grayscale density field `ρ(x,y) ∈ [0,1]` (darkness = 1) and target stipple count N. Place N points by rejection sampling against ρ. Iterate Lloyd: build the Voronoi diagram, move each site to the *density-weighted centroid* of its cell, repeat 10–50 times. Where ρ is large, cells shrink and pack more dots; where ρ is small, cells grow. Convergence yields a Centroidal Voronoi Tessellation with blue-noise-like spectrum (Du, Faber, Gunzburger, 1999).

The reference JavaScript implementation is Mike Bostock's [Voronoi Stippling](https://observablehq.com/@mbostock/voronoi-stippling). Two non-obvious correctness/performance details from his code and from d3-delaunay's maintainers:

1. The hot loop uses `delaunay.find(x, y, i0)` — hill-climbing from a seed — instead of `cellPolygon(i)`. O(1) amortized vs O(|polygon|).
2. `voronoi.update()` re-uses internal typed arrays. Reconstructing each iteration would 60-fps stall.

```ts
import { Delaunay } from "d3-delaunay";

export function stipple(density: Float32Array, w: number, h: number,
                        n: number, iters = 30) {
  const points = new Float64Array(n * 2);
  // Rejection sampling against ρ
  for (let i = 0; i < n; ++i) for (;;) {
    const x = Math.random() * w, y = Math.random() * h;
    if (Math.random() < density[(y|0) * w + (x|0)]) {
      points[2*i] = x; points[2*i+1] = y; break;
    }
  }
  const delaunay = new Delaunay(points);
  const voronoi = delaunay.voronoi([0, 0, w, h]);

  for (let k = 0; k < iters; ++k) {
    const c = new Float64Array(n * 2), W = new Float64Array(n);
    let i0 = 0;
    for (let y = 0; y < h; ++y) for (let x = 0; x < w; ++x) {
      const w_xy = density[y * w + x];
      i0 = delaunay.find(x + 0.5, y + 0.5, i0);
      c[2*i0]   += (x + 0.5) * w_xy;
      c[2*i0+1] += (y + 0.5) * w_xy;
      W[i0]     += w_xy;
    }
    for (let i = 0; i < n; ++i) if (W[i] > 0) {
      points[2*i]   = c[2*i]   / W[i];
      points[2*i+1] = c[2*i+1] / W[i];
    }
    voronoi.update();
  }
  return points;
}
```

Performance budget: at 800×800 with N=4,000 and 30 iterations, expect ~150–400 ms in a Worker, ~1–3 s on the main thread. **Never run this on the React render thread.**

### Bridson Poisson-disc sampling (SIGGRAPH 2007)

Background grid with cell size `r/√n` (n=2 in 2D, so `r/√2`). Place `x₀`, init `active = [0]`. While active is non-empty: pick random index `i`, throw up to k=30 candidates uniformly in the spherical annulus `[r, 2r]` around `xᵢ`, accept any candidate with no neighbor within `r` (5×5 grid scan in 2D), else after k failures remove `i` from active. O(N) total because each iteration adds or removes exactly one active index. The minimum-distance constraint band-limits low frequencies, producing blue noise.

A clean ~50-line dependency-free TypeScript implementation:

```ts
export function bridson(width: number, height: number, r: number, k = 30,
                        rng: () => number = Math.random): [number, number][] {
  const cell = r / Math.SQRT2;
  const gw = Math.ceil(width / cell), gh = Math.ceil(height / cell);
  const grid: ([number, number] | null)[] = new Array(gw * gh).fill(null);
  const samples: [number, number][] = [];
  const active: number[] = [];
  const r2 = r * r;

  const insert = (p: [number, number]) => {
    samples.push(p);
    grid[(p[1] / cell | 0) * gw + (p[0] / cell | 0)] = p;
    active.push(samples.length - 1);
  };
  insert([rng() * width, rng() * height]);

  while (active.length) {
    const idx = active[(rng() * active.length) | 0];
    const [px, py] = samples[idx];
    let placed = false;
    for (let i = 0; i < k; i++) {
      const a = rng() * 2 * Math.PI;
      const d = r * (1 + rng());                  // annulus [r, 2r]
      const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const gx = (x / cell) | 0, gy = (y / cell) | 0;
      let ok = true;
      for (let dy = -2; dy <= 2 && ok; dy++)
        for (let dx = -2; dx <= 2 && ok; dx++) {
          const nx = gx + dx, ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const s = grid[ny * gw + nx];
          if (s) {
            const ex = s[0] - x, ey = s[1] - y;
            if (ex*ex + ey*ey < r2) { ok = false; break; }
          }
        }
      if (ok) { insert([x, y]); placed = true; break; }
    }
    if (!placed) active.splice(active.indexOf(idx), 1);
  }
  return samples;
}
```

For massive fields (millions of dots, full-page backgrounds), generate one **64×64 blue-noise tile** once via void-and-cluster (Ulichney, 1993) and tile it: `tile[(x mod 64) + (y mod 64) * 64] < threshold` is O(1) per pixel ([Schwarz blue-noise textures](https://momentsingraphics.de/BlueNoise.html)).

| Algorithm | Cost | Quality | Use case |
|---|---|---|---|
| Uniform random | O(N) | Clumpy | Throwaway noise |
| Jittered grid | O(N) | Visible regularity at high N | Quick fills |
| Mitchell best-candidate | O(N²) | Good blue noise | Small N (<1k) |
| **Bridson Poisson-disc** | O(N) | Excellent blue noise | **Default choice** |
| Lloyd-relaxed Voronoi | O(N log N) per iter × ~10–50 | Best, image-aware | Image stippling |
| Void-and-cluster tile | O(N²) precompute, O(1) lookup | Excellent, tileable | Massive fields, GPU |

### Halftone density mapping — the math

For a normalized value `v ∈ [0,1]`, area coverage is:

```
coverage(v) = clamp(baseline + slope · v, 0, maxCoverage)
```

with the print canon constants: **`baseline = 0.03`** (always show ≥3% texture, so v=0 cells remain visually detectable rather than disappearing into "missing data"), **`maxCoverage = 0.22`** (sheetfed-offset dot-gain target on coated stock at 175 lpi caps useful coverage near 18–22%; beyond ~25% adjacent dots merge into a flat tint and the dotted texture is lost), `slope = 0.19`. Given coverage and dot radius `r`, dot count over area `A` is `N(v) = coverage(v) · A / (π · r²)`. For a 12×12 px cell with r=0.9 and v=1.0: 12 dots. With v=0.0: 2 dots. This bounded range is the print-canon equivalent of "5–12 dots per cell" — which is why your rendered field reads as Risograph rather than as a flat fill ([Sheridan halftone guidelines](https://www.sheridan.com/wp-content/uploads/Halftone-Guidelines.ICC-Profiles.Dot-Gain_Nov2021.pdf), [Wikipedia dot gain](https://en.wikipedia.org/wiki/Dot_gain)).

### Replacing GitHub-style calendar heatmaps

Each cell becomes a small region with a Poisson-disc sample at coverage `[0.03, 0.22]`. Dot count grows monotonically with the value. Reuse a *single tile* sliced per cell — visual consistency is what makes the field read as a system.

```tsx
import { bridson } from "@/lib/bridson";

export function CalendarDots({ values, cell = 14, r = 0.9, max }: {
  values: number[][]; cell?: number; r?: number; max: number;
}) {
  const baseline = 0.03, maxCov = 0.22, slope = maxCov - baseline;
  const A = cell * cell;
  const dotArea = Math.PI * r * r;
  const tile = bridson(cell, cell, r * 2.2);

  return (
    <svg width={values[0].length * cell} height={values.length * cell}
         role="img" className="text-zinc-900 dark:text-zinc-100">
      {values.flatMap((row, y) =>
        row.map((v, x) => {
          const norm = max > 0 ? v / max : 0;
          const target = Math.round((baseline + slope * norm) * A / dotArea);
          const dots = tile.slice(0, Math.min(target, tile.length));
          return (
            <g key={`${y}-${x}`} transform={`translate(${x*cell},${y*cell})`}>
              <title>{`${v} on ${y},${x}`}</title>
              {dots.map(([dx, dy], i) => (
                <circle key={i} cx={dx} cy={dy} r={r} fill="currentColor" />
              ))}
            </g>
          );
        })
      )}
    </svg>
  );
}
```

### Sparkline replacement — the honest tradeoff

Bertin's *Sémiologie graphique* (1967) classifies texture/grain among the worst quantitative channels. Cleveland & McGill (1984) and Munzner (*Visualization Analysis and Design*, 2014) ratify: position on a common scale > length > angle > area > luminance > saturation > **texture**. Readers cannot accurately decode "12 dots vs 9 dots" without a legend.

The rule: **use sparklines (position + length) for quantitative time-series; use dot-density fields for nominal/ordinal categorical density** ("where on the map are users", "which error buckets are heavy"). Always pair dot encodings with a `<title>` tooltip giving the raw value. The dot field is the ambient pattern; the tooltip is the analytical readout.

### Pentagram MIT Media Lab — the system pattern

Bierut and Aron Fay's 2014 identity uses one 7×7 binary grid to generate the master ML monogram and 23 sub-marks for each research group. Every output legibly belongs to the same family because they all derive from the same lattice. The pattern transfers directly: define one canonical Poisson-disc tile or one Voronoi point set as the system's "alphabet"; per-component variants are subsets/transforms of it. A Pentagram-style mark family in code:

```ts
const grid: number[][] = [/* 7x7 binary mask, e.g. spelling 'ML' */];
// For each mask cell with M[i][j]=1, render coverage=0.22; else 0.03
```

### The architecture summary

1. **One canonical Poisson-disc tile** (e.g., 256×256 at r=5.5) generated at build time, exported as a typed array. The system's alphabet.
2. **Static dot fields** (backdrops, dividers, hero tiles) import the tile inside an RSC. Zero client JS.
3. **Calendar / heatmap** uses the formula above with `[0.03, 0.22]` coverage, build-time Bridson per cell, RSC. Always ship `<title>` tooltips.
4. **Image stipples** (rare, hero-only) precomputed via Node script using d3-delaunay's Lloyd loop; emit JSON; render as static `<circle>` list.
5. **Live data / cursor effects** are client components, `useMemo`-keyed on inputs; if N > 2k, spin up a Worker with transferable ArrayBuffer.
6. **Pentagram-style mark family**: 7×7 binary masks → coverage `{0.03, 0.22}` per cell over the shared tile. One file defines all variants.

---

## Dimension 4 — Animation patterns and tier escalation

### CSS-only patterns (preferred for restraint)

**Density emergence loader.** A 3% blue-noise field fades to 0% over ~600 ms while content snaps in:

```css
.skeleton-dots { animation: emerge 600ms ease-out forwards; }
@keyframes emerge {
  from { opacity: 0.6; }
  to   { opacity: 0; visibility: hidden; }
}
```

**Slow opacity pulse for status dots** (Dynamic Island-style):

```css
.status-dot {
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
```

**Stagger via nth-child** (no per-element JS):

```css
.dot:nth-child(n) { animation-delay: calc(var(--i, 0) * 30ms); }
```

**Scroll-driven progress dot column** (using `animation-timeline: scroll(root)` — see Dimension 2 code).

### SMIL — when it's worth it (rarely)

SMIL animates SVG attributes that CSS can't, like a complex `<path>` `d` attribute via `<animate>` or motion along a path via `<animateMotion>`. CSS now covers most needs; SMIL has erratic engine support, doesn't compose with CSS animations, and is harder to debug. **Recommendation: skip SMIL. Use CSS, or escalate to GSAP for path morphing if absolutely necessary.**

### When to escalate to Canvas

The thresholds again:

- **<500 dots: SVG, no question.** Animate freely — even per-dot keyframes work.
- **500–5,000 dots: SVG with discipline.** Stick to `transform` + `opacity` only. Use `<pattern>` + `<use>` to deduplicate. CSS variables to mutate the field globally. No per-dot JS animation in a rAF loop.
- **5,000–50,000: Canvas 2D.** Per-frame redraw is the only model. Use `OffscreenCanvas` + Worker if available. 2026 benchmarks: ~10k particles at 60 FPS on dGPU, ~5k on integrated.
- **50,000+: WebGL via instancing.** Three.js `InstancedMesh` (1M+ instances demonstrated), PixiJS v8 `ParticleContainer` (1M particles at 60 FPS on M3), or `regl` for hand-rolled shaders.

A Three.js issue ([#30352](https://github.com/mrdoob/three.js/issues/30352)) reports `InstancedMesh` is sometimes *slower* than plain `Mesh` with shared geometry at 5,000 spheres. **Profile before assuming instancing wins**; it wins overwhelmingly only at >10k with simple geometry.

### OffscreenCanvas + Web Workers

Browser support (verified May 2026): Chrome 69+, Firefox 105/106+, Safari 16.4+. Pattern:

```ts
// main.ts
const canvas = document.querySelector("canvas#field")!;
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker(new URL("./dot-worker.ts", import.meta.url), { type: "module" });
worker.postMessage({ type: "init", canvas: offscreen, w: canvas.width, h: canvas.height,
                    dpr: devicePixelRatio }, [offscreen]);

// dot-worker.ts
let ctx: OffscreenCanvasRenderingContext2D;
self.onmessage = (e) => {
  if (e.data.type === "init") {
    ctx = e.data.canvas.getContext("2d")!;
    requestAnimationFrame(loop);
  }
};
function loop() {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const d of dots) { ctx.beginPath(); ctx.arc(d.x, d.y, 2, 0, 6.283); ctx.fill(); }
  requestAnimationFrame(loop);
}
```

Caveats: Workers can't access the DOM (no `getBoundingClientRect`); Chromium doesn't rasterize SVG inside Workers; rAF in a Worker may not throttle when the tab is hidden — listen for `document.visibilitychange` on the main thread and post pause/resume.

### The "what to never animate" list

1. **`r`, `cx`, `cy` on individual `<circle>`s.** SVG geometry properties; mutating them invalidates the path cache and triggers SVG layout + paint. Charlie Marsh's [Khan Academy postmortem](https://www.crmarsh.com/svg-performance/) documented exactly this — moving from per-element `cx/cy` to a single CSS `transform: translate()` was a major performance unlock.
2. **`fill` at scale.** Paint-only, but at >1,000 elements still expensive because Skia/CoreGraphics traverses the full draw list. Fine at Tier 1; mutate via a single `:root` CSS variable in Tier 2+ so the browser does one global paint pass.
3. **Anything that isn't `transform` or `opacity` for >100 elements.** These are the only properties that run on the GPU compositor without paint or layout (Lewis & Irish, [web.dev rendering performance](https://web.dev/articles/rendering-performance)).
4. **Blanket `will-change`.** MDN's explicit warning: "intended as a last resort… should not be used to anticipate problems… don't apply to too many elements." Forcing 5,000 backing-store layers exhausts GPU memory before the animation even starts. Apply to the *parent* of the field, not to each dot, and ideally toggle on with JS just before animation, off after.

### Accessibility — the unbreakable rules

**Global safety net** (drop in a base layer before component styles):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**The "equally informative" principle.** Just freezing a pulse can lose state. The MDN "Recording" example: a pulsing red dot communicates "recording in progress" via animation. Under `prefers-reduced-motion: reduce`, the dot becomes a static red dot **plus a visible ring or label** so the state semantics are preserved. Principle: not frozen, *equally informative*.

```css
.recording-dot { animation: pulse 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .recording-dot {
    animation: none;
    outline: 2px solid white;          /* preserve "recording" semantics */
  }
  .recording-dot::after { content: " Recording"; }
}
```

**The WCAG that governs animations:**

- **2.2.2 Pause, Stop, Hide (Level A)** — anything moving/blinking that starts automatically, lasts >5 s, *and* runs in parallel with other content must offer pause/stop/hide. Note that `prefers-reduced-motion` is *not* yet officially listed as a sufficient technique for 2.2.2 ([W3C issue #3766](https://github.com/w3c/wcag/issues/3766)) — provide an in-page Pause control too if motion is essential and runs >5s.
- **2.3.3 Animation from Interactions (AAA)** — non-essential animation triggered by interaction must be disable-able. `prefers-reduced-motion` *is* a sufficient technique here (C39, SCR40).
- **2.4.7 Focus Visible (AA)**, **2.4.11 Focus Not Obscured (AA, 2.2)**, **2.4.13 Focus Appearance (AAA, 2.2)** — covered above in Dimension 2.
- **1.4.11 Non-text Contrast (AA)** — focus and graphical objects need ≥3:1 contrast.

[Josh Comeau's "Accessible Animations in React"](https://www.joshwcomeau.com/react/prefers-reduced-motion/) is the canonical practitioner reference, including an SSR-safe `usePrefersReducedMotion` hook and the `addEventListener('change', …)` live-response pattern.

---

## Dimension 5 — Real code patterns

What follows is runnable code. The imports assume Next.js 15 App Router with file-based aliases (`@/lib/...`).

### 1. The `<DotField />` component (RSC, Bridson, theme-aware)

```tsx
// app/components/DotField.tsx — Server Component
import { bridson } from "@/lib/bridson";
import { mulberry32 } from "@/lib/rng";

type Props = {
  /** target ink coverage in [0, 0.22] — print canon ceiling */
  coverage?: number;
  /** position jitter as fraction of min-distance, [0, 0.5] */
  jitter?: number;
  /** seed for deterministic generation (cache-friendly) */
  seed?: number;
  /** width × height of the SVG viewBox in user units */
  width?: number;
  height?: number;
  /** dot radius in user units */
  r?: number;
  /** which CSS variable to use for fill: 'ink' | 'accent' | (i)=>... */
  ink?: "ink" | "accent" | ((i: number) => "ink" | "accent");
  className?: string;
  /** fit policy: hero ('slice'), illustration ('meet'), or 'none' (avoid) */
  fit?: "slice" | "meet" | "none";
};

export default function DotField({
  coverage = 0.04,
  jitter = 0.4,
  seed = 1,
  width = 1600,
  height = 900,
  r = 3,
  ink = "ink",
  className,
  fit = "slice",
}: Props) {
  // Solve N from coverage and r; min-distance from N
  const A = width * height;
  const N = Math.round((coverage * A) / (Math.PI * r * r));
  const minDist = Math.sqrt(A / N) * 1.1; // slight safety factor

  const rng = mulberry32(seed);
  const points = bridson(width, height, minDist, 30, rng);

  // Sub-pixel jitter up to `jitter * r` per axis, deterministic
  const dotted = points.map(([x, y], i) => {
    const dx = (rng() - 0.5) * 2 * jitter * r;
    const dy = (rng() - 0.5) * 2 * jitter * r;
    const tone = typeof ink === "function" ? ink(i) : ink;
    return { x: x + dx, y: y + dy, tone };
  });

  const aspect =
    fit === "slice" ? "xMidYMid slice"
    : fit === "meet" ? "xMidYMid meet"
    : "none";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={aspect}
      shapeRendering="geometricPrecision"
      role="presentation"
      aria-hidden="true"
      className={className}
    >
      {dotted.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={r}
          fill={d.tone === "accent" ? "var(--dot-accent)" : "var(--dot-ink)"}
        />
      ))}
    </svg>
  );
}
```

```ts
// lib/rng.ts — deterministic PRNG so server/client agree
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
```

Wrap in `'use cache'` for free deduplication across requests:

```tsx
// app/components/HeroDots.tsx
'use cache';
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from "next/cache";
import DotField from "./DotField";

export async function HeroDots({ slug }: { slug: string }) {
  cacheLife("max");
  cacheTag(`hero-dots:${slug}`);
  return <DotField seed={hashSeed(slug)} coverage={0.05} />;
}
```

### 2. `useCursorPosition` hook

```ts
// app/hooks/useCursorPosition.ts
"use client";
import * as React from "react";

type Opts = { target?: HTMLElement | null; throttle?: boolean };

export function useCursorPosition({ target, throttle = true }: Opts = {}) {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;

    const root = (target ?? document.documentElement) as HTMLElement;
    let x = 0, y = 0, raf = 0, scheduled = false;

    const flush = () => {
      root.style.setProperty("--cursor-x", `${x}px`);
      root.style.setProperty("--cursor-y", `${y}px`);
      scheduled = false;
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      if (!throttle) return flush();
      if (scheduled) return;
      scheduled = true;
      raf = requestAnimationFrame(flush);
    };
    const park = () => {
      root.style.setProperty("--cursor-x", `-9999px`);
      root.style.setProperty("--cursor-y", `-9999px`);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", park);
    const onMqChange = () => mq.matches || park();
    mq.addEventListener("change", onMqChange);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", park);
      mq.removeEventListener("change", onMqChange);
      cancelAnimationFrame(raf);
    };
  }, [target, throttle]);
}
```

Pair with the `@property` registration so the props can interpolate:

```css
@property --cursor-x { syntax: "<length>"; inherits: true; initial-value: -9999px; }
@property --cursor-y { syntax: "<length>"; inherits: true; initial-value: -9999px; }
```

### 3. `<StippledFocusRing />` — Bridson on an annulus

```tsx
// app/components/StippledFocusRing.tsx — Server Component
import { bridson } from "@/lib/bridson";
import { mulberry32 } from "@/lib/rng";

export function StippledFocusRing({
  radius = 28, thickness = 8, r = 1.4, seed = 1,
}: { radius?: number; thickness?: number; r?: number; seed?: number }) {
  const size = (radius + thickness + 4) * 2;
  const cx = size / 2, cy = size / 2;
  const rIn = radius, rOut = radius + thickness;

  // Sample a square then keep only points in the annulus
  const rng = mulberry32(seed);
  const samples = bridson(size, size, r * 3, 30, rng);
  const dots = samples
    .map(([x, y]) => ({ x, y, d: Math.hypot(x - cx, y - cy) }))
    .filter(p => p.d >= rIn && p.d <= rOut);

  return (
    <svg width={size} height={size} className="focus-ring" aria-hidden="true">
      {dots.map((p, i) => (
        <circle
          key={i}
          cx={p.x} cy={p.y} r={r}
          className="focus-dot"
          style={{ ["--i" as any]: i }}
        />
      ))}
    </svg>
  );
}
```

```css
.focus-ring { position: absolute; inset: -16px; pointer-events: none;
              opacity: 0; transition: opacity 80ms; }
:focus-visible > .focus-ring { opacity: 1; }

.focus-dot { fill: var(--accent); opacity: 0; transform-origin: center; }
:focus-visible .focus-dot {
  animation: bloom 200ms ease-out 80ms both;
  animation-delay: calc(80ms + var(--i) * 8ms);
}
@keyframes bloom { to { opacity: 1; transform: scale(1); } }

@media (prefers-reduced-motion: reduce) {
  .focus-dot { animation: none; opacity: 1; }
}
```

### 4. Density-emerge loader paired with content

```tsx
// app/components/DensityEmerge.tsx
"use client";
import * as React from "react";
import DotField from "./DotField";

export function DensityEmerge({ ready, children }: {
  ready: boolean; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden={ready}
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{ opacity: ready ? 0 : 0.6 }}
      >
        <DotField coverage={0.03} className="absolute inset-0" />
      </div>
      <div
        className="transition-opacity duration-500"
        style={{ opacity: ready ? 1 : 0 }}
      >
        {children}
      </div>
    </div>
  );
}
```

Skeleton coverage of 3% is the print-canon baseline — readable as "structure" without reading as "content".

### 5. Scroll-driven dot progress column

```tsx
// app/components/ScrollDotColumn.tsx — Server Component
export function ScrollDotColumn({ count = 24 }: { count?: number }) {
  return (
    <ol className="scroll-dot-col fixed right-6 top-1/2 -translate-y-1/2 list-none">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="scroll-dot" style={{ ["--i" as any]: i }} />
      ))}
    </ol>
  );
}
```

```css
:root {
  animation: drive linear both;
  animation-timeline: scroll(root block);
}
@property --fill { syntax: "<number>"; inherits: true; initial-value: 0; }
@keyframes drive { to { --fill: 1; } }

.scroll-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--dot-ink);
  margin: 6px 0;
  opacity: clamp(0.15, calc(var(--fill) * 24 - var(--i)), 1);
}

@supports not (animation-timeline: scroll()) {
  .scroll-dot { opacity: 0.5; }   /* graceful fallback */
}
@media (prefers-reduced-motion: reduce) {
  :root { animation: none; }
  .scroll-dot { opacity: 0.5; }
}
```

### 6. Voronoi-stippled heatmap

```tsx
// app/components/VoronoiHeatmap.tsx — Server Component
import { stipple } from "@/lib/stipple";

export function VoronoiHeatmap({ values, w = 480, h = 240, n = 1500 }: {
  values: number[][]; w?: number; h?: number; n?: number;
}) {
  // Flatten a 2D values grid into a per-pixel density field by nearest-cell lookup
  const cols = values[0].length, rows = values.length;
  const max = Math.max(...values.flat());
  const density = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = Math.min(cols - 1, Math.floor(x / w * cols));
    const cy = Math.min(rows - 1, Math.floor(y / h * rows));
    density[y * w + x] = (values[cy][cx] / max) || 0;
  }
  const points = stipple(density, w, h, n, 25);

  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      <circle key={i} cx={points[2*i]} cy={points[2*i+1]} r={1.2}
              fill="var(--dot-ink)" />
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet"
         shapeRendering="geometricPrecision" role="img"
         aria-label="Stippled density map">
      {out}
    </svg>
  );
}
```

### 7. `useScrollVelocity` hook (already shown in Dimension 2)

### 8. Server-side dot generation utilities

```ts
// lib/blue-noise.ts
import { bridson } from "./bridson";
import { mulberry32 } from "./rng";

export function generateBlueNoise({
  width, height, r, seed = 1,
}: { width: number; height: number; r: number; seed?: number }) {
  return bridson(width, height, r, 30, mulberry32(seed));
}

// lib/stipple.ts (Lloyd-relaxation; see Dimension 3 for full body)
export { stipple } from "./voronoi-stipple";
```

The Bridson implementation (`lib/bridson.ts`) and `stipple` implementation (`lib/voronoi-stipple.ts`) are the full bodies given in Dimension 3.

### 9. The reduced-motion safety net (already shown in Dimension 4)

### 10. Magnetic dot field, CSS-only

```tsx
// app/components/MagneticField.tsx — Client Component
"use client";
import * as React from "react";
import { useCursorPosition } from "@/app/hooks/useCursorPosition";
import { generateBlueNoise } from "@/lib/blue-noise";

export function MagneticField({ width = 800, height = 400, r = 3 }) {
  useCursorPosition();
  const dots = React.useMemo(
    () => generateBlueNoise({ width, height, r: 28, seed: 9 }).slice(0, 180),
    [width, height]
  );
  return (
    <div className="relative" style={{ width, height }}>
      {dots.map(([x, y], i) => (
        <span
          key={i}
          className="mag-dot"
          style={{
            ["--dot-x" as any]: `${x}px`,
            ["--dot-y" as any]: `${y}px`,
            width: r * 2, height: r * 2,
          }}
        />
      ))}
    </div>
  );
}
```

```css
.mag-dot {
  position: absolute;
  left: var(--dot-x); top: var(--dot-y);
  border-radius: 50%;
  background: var(--dot-ink);
  --dx: calc(var(--cursor-x, -9999px) - var(--dot-x));
  --dy: calc(var(--cursor-y, -9999px) - var(--dot-y));
  --d: hypot(var(--dx), var(--dy));
  --falloff: clamp(0, calc(1 - var(--d) / 240px), 1);
  transform: translate(
    calc(var(--dx) * var(--falloff) * -0.10),
    calc(var(--dy) * var(--falloff) * -0.10));
  transition: transform 60ms linear;     /* gentle smoothing */
}
@media (prefers-reduced-motion: reduce) {
  .mag-dot { transform: none; transition: none; }
}
@media not (hover: hover), not (pointer: fine) {
  .mag-dot { transform: none; }   /* inert on touch */
}
```

This keeps the entire interaction on the GPU. No render loop, no Canvas, no React state. ~180 dots is the comfortable ceiling; beyond that the per-element style recompute starts showing on low-end Android.

---

## Dimension 6 — References and deep reading

Curated by category. Read the bold ones first.

**Algorithms.** **Adrian Secord, "Weighted Voronoi Stippling," NPAR 2002 (PDF: https://www.cs.ubc.ca/labs/imager/tr/2002/secord2002b/secord.2002b.pdf)** — the foundational stippling paper. **Robert Bridson, "Fast Poisson Disk Sampling in Arbitrary Dimensions," SIGGRAPH 2007 (https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf)** — the O(N) blue-noise sampler everyone implements. Don Mitchell, "Spectrally Optimal Sampling for Distribution Ray Tracing," SIGGRAPH 1991 (http://mentallandscape.com/Papers_siggraph91.pdf) — best-candidate. Robert Ulichney, "Dithering with Blue Noise," Proc. IEEE 1988 (https://cv.ulichney.com/papers/1988-blue-noise.pdf) — historical landmark, void-and-cluster. **Mike Bostock, "Voronoi Stippling" Observable notebook (https://observablehq.com/@mbostock/voronoi-stippling)** — the reference JS port.

**Design precedents.** **Pentagram MIT Media Lab case study (https://www.pentagram.com/work/mit-media-lab/story)** — bounded generative system par excellence. Stripe Press (https://press.stripe.com/) and Tyler Lasicki's design-system writeup (https://www.buildingsomethingold.tylerlasicki.com/p/stripe-press-an-homage-to-printed). DIA Studio (https://dia.tv/), Mitch Paone's "Time Is the Material" (https://mitchpaone.substack.com/p/time-is-the-material-from-motion). The Pudding (https://pudding.cool/about/) and their process posts (https://pudding.cool/process/). NYT Upshot Mapping America 2010 dot map (https://www.nytimes.com/projects/census/2010/explorer.html). Risograph primer at Fontstand (https://fontstand.com/news/essays/a-riso-printing-primer/).

**Engineers and writers.** **Bramus Van Damme — bram.us, especially the scroll-driven gallery (https://scroll-driven-animations.style/) and recent posts on triggers and starting-style (https://www.bram.us/2025/11/06/combining-scroll-driven-animations-with-starting-style/)**. **Josh Comeau, "Accessible Animations in React" (https://www.joshwcomeau.com/react/prefers-reduced-motion/)**. Cassie Evans — cassie.codes, particularly "Creating an SVG path drawing animation" and "Making a lil' me." **Sara Soueidan, "A guide to designing accessible, WCAG-conformant focus indicators" (https://www.sarasoueidan.com/blog/focus-indicators/)** and "SVG Coordinate Systems" (https://www.sarasoueidan.com/blog/svg-coordinate-systems/). Rauno Freiberg — rauno.me, "Invisible Details of Interaction Design" (https://every.to/p/invisible-details-of-interaction-design). Una Kravets, "Style Queries" (https://una.im/style-queries/). Adam Argyle — nerdy.dev. Charlie Marsh, "Hacking SVG, Triumphantly" (https://www.crmarsh.com/svg-performance/) — the postmortem on SVG perf at scale.

**Specs and standards.** **W3C CSS Scroll-Driven Animations editor's draft (https://drafts.csswg.org/scroll-animations-1/)**. MDN Scroll-driven animations guide (https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations). **WCAG 2.2 (https://www.w3.org/TR/WCAG22/)** — 2.2.2 Pause Stop Hide, 2.3.3 Animation from Interactions, 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured, 2.5.5 / 2.5.8 Target Size, 1.4.11 Non-text Contrast. CSS Containment Module Level 3 (https://drafts.csswg.org/css-contain-3/). CSS Custom Properties + Properties and Values API (https://www.w3.org/TR/css-variables-1/, https://www.w3.org/TR/css-properties-values-api-1/). SVG 2 (https://www.w3.org/TR/SVG2/).

**Browser support data.** caniuse.com pages: animation-timeline (https://caniuse.com/mdn-css_properties_animation-timeline), css-container-queries, mdn-css_types_color_oklch, css-color-function, view-transitions, offscreencanvas, css-math-functions. Chrome status: chromestatus.com.

**Library docs.** **Three.js InstancedMesh (https://threejs.org/docs/#api/en/objects/InstancedMesh)**. PixiJS v8 ParticleContainer (https://pixijs.com/8.x/guides/components/scene-objects/particle-container) — 1M particles at 60 FPS on M3. regl (https://github.com/regl-project/regl). **d3-delaunay (https://github.com/d3/d3-delaunay)**. poisson-disk-sampling on npm (https://www.npmjs.com/package/poisson-disk-sampling). Tailwind v4 docs (https://tailwindcss.com/docs/theme), v4 release post (https://tailwindcss.com/blog/tailwindcss-v4). **Next.js 15 caching guide (https://nextjs.org/docs/app/getting-started/caching)** and the `'use cache'` directive reference (https://nextjs.org/docs/app/api-reference/directives/use-cache). React 19 `cache()` (https://react.dev/reference/react/cache).

**Performance.** **Paul Lewis & Paul Irish, web.dev Rendering Performance (https://web.dev/articles/rendering-performance)**. Paul Irish, "What forces layout/reflow" (https://gist.github.com/paulirish/5d52fb081b3570c81e3a). CSS Triggers (https://csstriggers.com/). Smashing, "CSS GPU Animation: Doing It Right" (https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/). Discover Three.js tips (https://discoverthreejs.com/tips-and-tricks/).

**Color.** **Evil Martians, "OKLCH in CSS: why we moved from RGB and HSL" (https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)**. oklch.com — visual picker. huetone.ardov.me — APCA-aware ramp tool. RISOTTO Studio FAQ (https://risottostudio.com/pages/printing-faq) for canonical Riso ink palette.

**Recent (2025–2026) confirmations of scroll-driven animations being production-ready.** Cyd Stumpel, "Two approaches to fallback CSS scroll-driven animations" (https://cydstumpel.nl/two-approaches-to-fallback-css-scroll-driven-animations/) — July 2025. Peter Coolen, "Bringing Scroll-Driven Animations to Life with CSS" (https://medium.com/@petercoolen/css-scroll-driven-animations-aa9aa198f430) — confirms Safari 26 ship. **Chrome for Developers, "Scroll-driven animations case studies" (https://developer.chrome.com/blog/css-ui-ecommerce-sda)** — Tokopedia, Policybazaar, redBus production data, including the 50%→2% CPU result.

---

## Prioritized implementation order

Build in this order. Resist the urge to start with magnetic fields.

**Phase 1 — Foundations (build first).** Set up the design tokens (`--dot-ink`, `--dot-accent`, `--dot-r`, `--dot-jitter`, `--dot-coverage`) at `:root` with overrides for `prefers-color-scheme: dark` and `prefers-reduced-motion: reduce`. Implement `lib/bridson.ts` and `lib/rng.ts`. Generate one canonical Poisson-disc tile at build time and import it. Drop in the global reduced-motion safety net. Ship `<DotField />` as an RSC with `'use cache'`. Verify the system renders identically on server and client (deterministic seed). At this point you have a static dot system that respects accessibility and runs without any client JS.

**Phase 2 — Structural integration (the meaning layer).** Build `<CalendarDots />` using the halftone formula with `[0.03, 0.22]` coverage. Add `<title>` tooltips for Bertin-honest readout. Build a Pentagram-style mark family by defining one binary 7×7 mask file from which all variants derive. Wire container queries so the generator switches at `@md` and `@2xl` breakpoints, not just sizes. This is the moment the system becomes structurally integrated rather than decorative.

**Phase 3 — Animation (the time layer).** Add density-emerge loaders. Add the slow opacity pulse on status dots with the equally-informative reduced-motion fallback. Add hover crescendo on dividers via `mask-position`. Add IntersectionObserver-driven entrance reveals with the staggered settle. Add the scroll-driven dot progress column gated on `@supports (animation-timeline: scroll())`. None of these should require canvas.

**Phase 4 — Interaction (nice-to-have).** Add `useCursorPosition` and the magnetic dot field, gated behind `(hover: hover) and (pointer: fine)` and capped at ~180 dots. Add the stippled focus ring with the two-phase 80/200 ms transition. Add `useScrollVelocity` if and only if you have a concrete visual mapping for it.

**Phase 5 — Premature optimization (don't, until profiled).** Web Workers + OffscreenCanvas. Three.js InstancedMesh. WebGL shaders. These are correct *only* once profiling shows you've crossed a tier threshold. Until then, they're complexity you don't need.

The simpler escape hatch from any of this is always: **render fewer dots, render them as static SVG, and don't animate them.** The hardest version of pointillism — the version that actually reads as Risograph rather than as a tech demo — is the version with the fewest moving parts.

## Conclusion — a system, not an effect

Three takeaways change how this scales. First, the print-canon coverage range `[0.03, 0.22]` is not just an aesthetic choice — it's the boundary inside which a dot field reads as *texture* rather than as *fill* or as *empty*; respecting it makes everything else look intentional. Second, the discipline of regenerating at viewport breakpoints (rather than transforming) is what separates a system from an effect; it's the same discipline Pentagram applied to MIT Media Lab and the same discipline you'll apply to a `@container` query. Third, every animation you ship needs an equally informative reduced-motion equivalent — not a frozen one. The MDN "Recording" dot is the test case: if your reduced-motion path loses information, the animation was carrying information it shouldn't have been.

What you're building is closer to a typographic system than to a visual effect: a constrained alphabet of distributions, coverages, tones, and tempos that compose into specific marks for specific surfaces. Build the alphabet first, then write with it.