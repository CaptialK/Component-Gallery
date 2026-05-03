/**
 * Registration crosshair — the printer's mark that defines a Specimen Plate's
 * corner without using a border.
 *
 * Layout: a center dot, three concentric rings of stippled dots, and four
 * short tick marks extending out in cardinal directions. Reads as a Risograph
 * registration target at small sizes.
 *
 * The optional `ghost` prop renders a second pass of just the dots (no ticks),
 * offset by a few pixels — mimicking the ±1–3mm misregistration that real
 * Riso prints exhibit. Apply to one corner per plate, not all four.
 *
 * Server-renderable. No client state.
 */

import type { CSSProperties } from "react";

export type RegistrationCrosshairProps = {
  /** Overall box size in pixels (square). */
  size?: number;
  /** Ring radii expressed as fractions of half-size. Three values. */
  ringStops?: [number, number, number];
  /** Dots per ring (outer ring uses this; inner rings scale down). */
  dotsPerOuterRing?: number;
  /** Dot radius in user units. */
  dotRadius?: number;
  /** CSS color for both dots and ticks. */
  ink?: string;
  /** Misregistration ghost — second dot pass, offset by (dx, dy) px. */
  ghost?: { dx: number; dy: number; opacity?: number };
  className?: string;
  style?: CSSProperties;
};

function ringDots(
  cx: number,
  cy: number,
  r: number,
  count: number,
  rot: number,
  fill: string,
  dotR: number,
  keyPrefix: string,
) {
  const out: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rot;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    out.push(<circle key={`${keyPrefix}-${i}`} cx={x} cy={y} r={dotR} fill={fill} />);
  }
  return out;
}

export function RegistrationCrosshair({
  size = 40,
  ringStops = [0.32, 0.55, 0.78],
  dotsPerOuterRing = 22,
  dotRadius = 0.65,
  ink = "var(--color-accent-2)",
  ghost,
  className,
  style,
}: RegistrationCrosshairProps) {
  const c = size / 2;
  const radii = ringStops.map((s) => s * c);
  const tick = c * 0.18;

  const allDots = [
    ...ringDots(c, c, radii[0], Math.max(8, Math.round(dotsPerOuterRing * 0.45)), 0, ink, dotRadius, "r0"),
    ...ringDots(c, c, radii[1], Math.max(12, Math.round(dotsPerOuterRing * 0.7)), Math.PI / 14, ink, dotRadius, "r1"),
    ...ringDots(c, c, radii[2], dotsPerOuterRing, 0, ink, dotRadius, "r2"),
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className={className}
      style={style}
    >
      {/* Center registration dot. */}
      <circle cx={c} cy={c} r={dotRadius * 1.4} fill={ink} />

      {/* Three concentric stippled rings. */}
      {allDots}

      {/* Optional misregistration ghost — dots only, no ticks. */}
      {ghost && (
        <g
          transform={`translate(${ghost.dx} ${ghost.dy})`}
          opacity={ghost.opacity ?? 0.45}
        >
          {allDots}
        </g>
      )}

      {/* Crosshair tick marks — short lines from inner ring outward. */}
      <g stroke={ink} strokeWidth="0.6" strokeLinecap="square" fill="none">
        <line x1={c} y1={0} x2={c} y2={tick * 0.9} />
        <line x1={c} y1={size - tick * 0.9} x2={c} y2={size} />
        <line x1={0} y1={c} x2={tick * 0.9} y2={c} />
        <line x1={size - tick * 0.9} y1={c} x2={size} y2={c} />
      </g>
    </svg>
  );
}
