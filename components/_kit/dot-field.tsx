import { useId } from "react";
import { poissonDisc } from "./dot-noise";

/**
 * DotField — pointillism primitive.
 *
 * Renders an SVG full of small dots within a shape. Two-tone: ink + accent.
 * Density can vary across the field (denser = darker), enabling shape/value.
 *
 * As of Spike 1, distribution defaults to **Poisson-disc / blue noise**
 * (Bridson). The legacy jittered-grid sampler is still available via
 * `distribution="grid"` for back-compat, but new work should leave it on
 * the default.
 *
 * Use this only in: hero, empty-state illustrations, the 404, decorative
 * dividers, the brand mark, and chrome state surfaces (skeletons, focus
 * halos). Do NOT use it inside the body of buttons, inputs, table cells.
 */

export type DotFieldShape =
  | { kind: "rect"; width: number; height: number; rx?: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "path"; d: string; viewBox: [number, number, number, number] };

type DensityFn = (x: number, y: number, w: number, h: number) => number;

export type DotFieldProps = {
  shape: DotFieldShape;
  /**
   * Distribution algorithm. `poisson` (default) gives blue-noise / organic
   * spacing — the right look for halftone, stippling, and skeleton fills.
   * `grid` is the original jittered-uniform sampler kept for legacy callers.
   */
  distribution?: "poisson" | "grid";
  /**
   * Spacing — minimum distance between dots for `poisson`, the grid step
   * for `grid`. In user units.
   */
  spacing?: number;
  /** Maximum dot radius (smallest dots are scaled down by ~40%). */
  dotRadius?: number;
  /** 0..1 — fraction of dots painted with the accent color (rest are ink). */
  accentRatio?: number;
  /**
   * Density modulation. Returns 0..1 — a multiplier on the keep-probability.
   * Higher = more dots kept at that point. Default is uniform 1.
   */
  density?: DensityFn;
  /** Base keep-probability before density modulation (0..1). */
  baseDensity?: number;
  /** Deterministic seed so SSR + client agree. */
  seed?: number;
  className?: string;
  ariaLabel?: string;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shapeBounds(s: DotFieldShape): {
  vb: [number, number, number, number];
  contains: (x: number, y: number) => boolean;
} {
  if (s.kind === "rect") {
    return {
      vb: [0, 0, s.width, s.height],
      contains: () => true,
    };
  }
  if (s.kind === "circle") {
    return {
      vb: [s.cx - s.r, s.cy - s.r, s.r * 2, s.r * 2],
      contains: (x, y) => (x - s.cx) ** 2 + (y - s.cy) ** 2 <= s.r * s.r,
    };
  }
  return {
    vb: s.viewBox,
    contains: () => true,
  };
}

type Dot = { x: number; y: number; r: number; accent: boolean };

function gridDots(args: {
  vx: number; vy: number; vw: number; vh: number;
  spacing: number; dotRadius: number; accentRatio: number; baseDensity: number;
  density?: DensityFn;
  contains: (x: number, y: number) => boolean;
  rand: () => number;
}): Dot[] {
  const { vx, vy, vw, vh, spacing, dotRadius, accentRatio, baseDensity, density, contains, rand } = args;
  const out: Dot[] = [];
  for (let y = vy + spacing / 2; y < vy + vh; y += spacing) {
    for (let x = vx + spacing / 2; x < vx + vw; x += spacing) {
      const jx = x + (rand() - 0.5) * spacing * 0.6;
      const jy = y + (rand() - 0.5) * spacing * 0.6;
      if (!contains(jx, jy)) continue;
      const dMul = density ? density(jx - vx, jy - vy, vw, vh) : 1;
      if (rand() > baseDensity * dMul) continue;
      const r = dotRadius * (0.6 + rand() * 0.6);
      out.push({ x: jx, y: jy, r, accent: rand() < accentRatio });
    }
  }
  return out;
}

function poissonDots(args: {
  vx: number; vy: number; vw: number; vh: number;
  spacing: number; dotRadius: number; accentRatio: number; baseDensity: number;
  density?: DensityFn; seed: number;
  contains: (x: number, y: number) => boolean;
  rand: () => number;
}): Dot[] {
  const { vx, vy, vw, vh, spacing, dotRadius, accentRatio, baseDensity, density, seed, contains, rand } = args;
  // Bridson radius. Smaller spacing → denser blue noise.
  const points = poissonDisc({ width: vw, height: vh, radius: spacing, seed });
  const out: Dot[] = [];
  for (const p of points) {
    const jx = p.x + vx;
    const jy = p.y + vy;
    if (!contains(jx, jy)) continue;
    const dMul = density ? density(p.x, p.y, vw, vh) : 1;
    if (rand() > baseDensity * dMul) continue;
    const r = dotRadius * (0.7 + rand() * 0.5);
    out.push({ x: jx, y: jy, r, accent: rand() < accentRatio });
  }
  return out;
}

export function DotField({
  shape,
  distribution = "poisson",
  spacing = 6,
  dotRadius = 1.1,
  accentRatio = 0.18,
  density,
  baseDensity = 0.85,
  seed = 1,
  className,
  ariaLabel,
}: DotFieldProps) {
  const clipId = useId();
  const { vb, contains } = shapeBounds(shape);
  const [vx, vy, vw, vh] = vb;
  const rand = mulberry32(seed);

  const dots = distribution === "grid"
    ? gridDots({ vx, vy, vw, vh, spacing, dotRadius, accentRatio, baseDensity, density, contains, rand })
    : poissonDots({ vx, vy, vw, vh, spacing, dotRadius, accentRatio, baseDensity, density, seed, contains, rand });

  return (
    <svg
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      className={className}
    >
      {shape.kind === "path" && (
        <defs>
          <clipPath id={clipId}>
            <path d={shape.d} />
          </clipPath>
        </defs>
      )}
      <g clipPath={shape.kind === "path" ? `url(#${clipId})` : undefined}>
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill={d.accent ? "var(--color-dot-accent)" : "var(--color-dot-ink)"}
          />
        ))}
      </g>
    </svg>
  );
}
