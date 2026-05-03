/**
 * Trace — line / sparkline primitive.
 *
 * Companion to `<DotField />`. Renders a polyline through datapoints with
 * optional area fill (under-line or envelope band), optional horizontal
 * threshold rules, and optional dot marks at specific datapoints or arbitrary
 * (x, y) positions.
 *
 * Used for any continuous quantitative encoding — sparklines, threshold
 * indicators, reference ribbons, divider rules. Cleveland-McGill ranks
 * length / line above texture / density for quantitative reading; this
 * primitive is the "lines" half of the system the project committed to in
 * DECISIONS.md (2026-05-03 retrospective).
 *
 * Server-renderable. No client state.
 */

export type TracePoint = { x: number; y: number };

export type TraceThreshold = {
  /** y-coordinate in data space. */
  y: number;
  /** CSS color; default `var(--color-border-strong)`. */
  color?: string;
  /** Dashed/dotted style. Default solid. */
  dashed?: boolean;
  /** Stroke width in user units. Default 0.6. */
  strokeWidth?: number;
};

export type TraceDot = {
  /** Either look up the position by data array index … */
  index?: number;
  /** … or specify (x, y) directly in data space. */
  x?: number;
  y?: number;
  color?: string;
  radius?: number;
};

export type TraceFill =
  /** Fill area between the trend line and a horizontal floor. */
  | { kind: "below"; y: number; color?: string }
  /** Fill a band between two constant y values (envelope). */
  | { kind: "envelope"; lower: number; upper: number; color?: string };

export type TraceProps = {
  /** Datapoints in data space; rendered as a polyline. Empty = no trend, decorations only. */
  data: TracePoint[];
  /** SVG dimensions in user units. */
  width: number;
  height: number;
  /** Explicit domain overrides. Defaults to data extent (extended by thresholds + fill). */
  xDomain?: [number, number];
  yDomain?: [number, number];
  /** Catmull-Rom smoothing through the points. Default false (straight segments). */
  smooth?: boolean;
  /** Trend stroke. Defaults to `var(--color-text)`, width 1. */
  strokeColor?: string;
  strokeWidth?: number;
  /** Optional area fill under the line or as a constant-y envelope. */
  fill?: TraceFill;
  /** Mark specific datapoints. Each entry uses `index` OR `(x, y)`. */
  dots?: TraceDot[];
  /** Horizontal reference rules at constant y. */
  thresholds?: TraceThreshold[];
  /** Margin around the plot area in user units, so strokes/dots don't clip. Default 1. */
  margin?: number;
  className?: string;
  ariaLabel?: string;
};

function computeDomains(
  data: TracePoint[],
  thresholds: TraceThreshold[] | undefined,
  fill: TraceFill | undefined,
  xDomain: [number, number] | undefined,
  yDomain: [number, number] | undefined,
): { xd: [number, number]; yd: [number, number] } {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const p of data) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }
  for (const t of thresholds ?? []) {
    if (t.y < yMin) yMin = t.y;
    if (t.y > yMax) yMax = t.y;
  }
  if (fill) {
    if (fill.kind === "envelope") {
      if (fill.lower < yMin) yMin = fill.lower;
      if (fill.upper > yMax) yMax = fill.upper;
    } else if (fill.kind === "below") {
      if (fill.y < yMin) yMin = fill.y;
    }
  }
  if (xMin === Infinity) {
    xMin = 0;
    xMax = 1;
  }
  if (yMin === Infinity) {
    yMin = 0;
    yMax = 1;
  }
  return {
    xd: xDomain ?? [xMin, xMax],
    yd: yDomain ?? [yMin, yMax],
  };
}

function pathLinear(pts: Array<{ sx: number; sy: number }>): string {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].sx} ${pts[0].sy}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].sx} ${pts[i].sy}`;
  }
  return d;
}

/** Catmull-Rom converted to cubic-Bezier for smooth interpolation. */
function pathSmooth(pts: Array<{ sx: number; sy: number }>): string {
  if (pts.length < 3) return pathLinear(pts);
  let d = `M ${pts[0].sx} ${pts[0].sy}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.sx + (p2.sx - p0.sx) / 6;
    const c1y = p1.sy + (p2.sy - p0.sy) / 6;
    const c2x = p2.sx - (p3.sx - p1.sx) / 6;
    const c2y = p2.sy - (p3.sy - p1.sy) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.sx} ${p2.sy}`;
  }
  return d;
}

export function Trace({
  data,
  width,
  height,
  xDomain,
  yDomain,
  smooth = false,
  strokeColor = "var(--color-text)",
  strokeWidth = 1,
  fill,
  dots,
  thresholds,
  margin = 1,
  className,
  ariaLabel,
}: TraceProps) {
  const { xd, yd } = computeDomains(data, thresholds, fill, xDomain, yDomain);
  const innerW = width - margin * 2;
  const innerH = height - margin * 2;
  const xSpan = Math.max(xd[1] - xd[0], 1e-9);
  const ySpan = Math.max(yd[1] - yd[0], 1e-9);
  const sx = (x: number) => margin + ((x - xd[0]) / xSpan) * innerW;
  const sy = (y: number) => margin + (1 - (y - yd[0]) / ySpan) * innerH; // y inverted

  const screenPoints = data.map((p) => ({ sx: sx(p.x), sy: sy(p.y) }));
  const trendPath = smooth ? pathSmooth(screenPoints) : pathLinear(screenPoints);

  const defaultFillColor =
    "color-mix(in oklch, var(--color-text-muted) 12%, transparent)";

  return (
    <svg
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="geometricPrecision"
      className={className}
    >
      {/* Envelope band — drawn first so trend + thresholds sit on top. */}
      {fill?.kind === "envelope" && (
        <rect
          x={sx(xd[0])}
          y={sy(fill.upper)}
          width={sx(xd[1]) - sx(xd[0])}
          height={sy(fill.lower) - sy(fill.upper)}
          fill={fill.color ?? defaultFillColor}
        />
      )}

      {/* Below fill — area between trend and a constant-y floor. */}
      {fill?.kind === "below" && trendPath !== "" && (
        <path
          d={`${trendPath} L ${sx(xd[1])} ${sy(fill.y)} L ${sx(xd[0])} ${sy(fill.y)} Z`}
          fill={fill.color ?? defaultFillColor}
        />
      )}

      {/* Threshold rules */}
      {(thresholds ?? []).map((t, i) => (
        <line
          key={`th-${i}`}
          x1={sx(xd[0])}
          x2={sx(xd[1])}
          y1={sy(t.y)}
          y2={sy(t.y)}
          stroke={t.color ?? "var(--color-border-strong)"}
          strokeWidth={t.strokeWidth ?? 0.6}
          strokeDasharray={t.dashed ? "2 2" : undefined}
        />
      ))}

      {/* Trend polyline */}
      {trendPath !== "" && (
        <path
          d={trendPath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Dot marks (rendered last so they sit on top). */}
      {(dots ?? []).map((d, i) => {
        let cx: number;
        let cy: number;
        if (d.index !== undefined) {
          const p = data[d.index];
          if (!p) return null;
          cx = sx(p.x);
          cy = sy(p.y);
        } else if (d.x !== undefined && d.y !== undefined) {
          cx = sx(d.x);
          cy = sy(d.y);
        } else {
          return null;
        }
        return (
          <circle
            key={`dot-${i}`}
            cx={cx}
            cy={cy}
            r={d.radius ?? 1.6}
            fill={d.color ?? "var(--color-text)"}
          />
        );
      })}
    </svg>
  );
}
