import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * ReferenceRange — visual marker showing where a single clinical value sits on
 * its reference range. Extracted from `clinical/lab-results.tsx`'s RangeRibbon
 * so vitals-monitor, intake, and order-entry can compose the same vocabulary.
 *
 * Encoding (Cleveland-McGill: position on a common scale beats density):
 *
 *  - Track: hairline `--color-border` across the full view.
 *  - Normal envelope: bolder `--color-text-muted` segment between `low` and
 *    `high`. Read it as a *length*.
 *  - Bracket ticks at the low/high bounds.
 *  - Value mark: Federal Blue dot in-range (with halo punctuation), persimmon
 *    dot out-of-range, persimmon chevron when off-axis (clamps with arrow
 *    direction).
 *  - When `value` is null, no mark is rendered — different from "value 0".
 *  - Unit-tick labels render at the bounds in mono-caps.
 *
 * Server-renderable; pure SVG.
 */

export type ReferenceRangeProps = {
  low: number;
  high: number;
  /** Current value; null = no value to plot (don't render the mark). */
  value: number | null;
  unit: string;
  /** Axis range; defaults to [low - span/2, high + span/2]. */
  view?: [min: number, max: number];
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md";
  ariaLabel?: string;
  className?: string;
};

const DIM_MD = { length: 140, breadth: 14 };
const DIM_SM = { length: 96, breadth: 10 };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function buildAriaLabel(p: ReferenceRangeProps): string {
  if (p.ariaLabel) return p.ariaLabel;
  if (p.value == null) {
    return `Reference range ${p.low} to ${p.high} ${p.unit}, value not measured`;
  }
  const where =
    p.value < p.low
      ? "below range"
      : p.value > p.high
        ? "above range"
        : "in range";
  return `Reference range ${p.low} to ${p.high} ${p.unit}, value ${p.value} ${where}`;
}

export function ReferenceRange(props: ReferenceRangeProps) {
  const {
    low,
    high,
    value,
    view,
    orientation = "horizontal",
    size = "md",
    className,
  } = props;
  const aria = buildAriaLabel(props);

  const dim = size === "md" ? DIM_MD : DIM_SM;
  const labelPx = size === "md" ? 9 : 8;

  const [vMin, vMax] = view ?? [low - (high - low) * 0.5, high + (high - low) * 0.5];
  const span = vMax - vMin;
  // Position-on-scale function: 0..1 along the long axis.
  const tOf = (v: number) => clamp((v - vMin) / span, 0, 1);
  const offScale = value != null && (value < vMin || value > vMax);
  const inRange = value != null && value >= low && value <= high;

  const isHorizontal = orientation === "horizontal";
  const w = isHorizontal ? dim.length : dim.breadth;
  const h = isHorizontal ? dim.breadth : dim.length;

  const tLow = tOf(low);
  const tHigh = tOf(high);
  const tValue = value != null ? tOf(value) : null;

  // Horizontal coords
  const yMid = h / 2;
  const xLow = isHorizontal ? tLow * w : null;
  const xHigh = isHorizontal ? tHigh * w : null;
  const xValue = isHorizontal && tValue != null ? tValue * w : null;
  // Vertical coords (low at bottom, high at top — clinically conventional)
  const xMid = w / 2;
  const yLowV = !isHorizontal ? h - tLow * h : null;
  const yHighV = !isHorizontal ? h - tHigh * h : null;
  const yValueV = !isHorizontal && tValue != null ? h - tValue * h : null;

  const valueInk = inRange ? "var(--color-accent-2)" : "var(--color-accent)";
  const dotR = size === "md" ? 2.6 : 2.0;
  const haloR = size === "md" ? 4.2 : 3.4;
  const haloDotR = size === "md" ? 0.45 : 0.35;

  return (
    <div className={cn("inline-flex flex-col", className)}>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={aria}
        className="block"
      >
        {/* Full-track hairline */}
        {isHorizontal ? (
          <line
            x1={1}
            x2={w - 1}
            y1={yMid}
            y2={yMid}
            stroke="var(--color-border)"
            strokeWidth={0.4}
          />
        ) : (
          <line
            x1={xMid}
            x2={xMid}
            y1={1}
            y2={h - 1}
            stroke="var(--color-border)"
            strokeWidth={0.4}
          />
        )}

        {/* Normal envelope as a length */}
        {isHorizontal ? (
          <line
            x1={xLow!}
            x2={xHigh!}
            y1={yMid}
            y2={yMid}
            stroke="var(--color-text-muted)"
            strokeWidth={1.3}
            strokeLinecap="round"
          />
        ) : (
          <line
            x1={xMid}
            x2={xMid}
            y1={yLowV!}
            y2={yHighV!}
            stroke="var(--color-text-muted)"
            strokeWidth={1.3}
            strokeLinecap="round"
          />
        )}

        {/* Bracket ticks */}
        {isHorizontal ? (
          <>
            <line
              x1={xLow!}
              x2={xLow!}
              y1={3}
              y2={h - 3}
              stroke="var(--color-border-strong)"
              strokeWidth={0.6}
            />
            <line
              x1={xHigh!}
              x2={xHigh!}
              y1={3}
              y2={h - 3}
              stroke="var(--color-border-strong)"
              strokeWidth={0.6}
            />
          </>
        ) : (
          <>
            <line
              x1={3}
              x2={w - 3}
              y1={yLowV!}
              y2={yLowV!}
              stroke="var(--color-border-strong)"
              strokeWidth={0.6}
            />
            <line
              x1={3}
              x2={w - 3}
              y1={yHighV!}
              y2={yHighV!}
              stroke="var(--color-border-strong)"
              strokeWidth={0.6}
            />
          </>
        )}

        {/* Value mark */}
        {value != null && (
          offScale ? (
            isHorizontal ? (
              <ChevronH
                x={value < vMin ? 1 : w - 1}
                y={yMid}
                dir={value < vMin ? "left" : "right"}
              />
            ) : (
              <ChevronV
                x={xMid}
                y={value < vMin ? h - 1 : 1}
                dir={value < vMin ? "down" : "up"}
              />
            )
          ) : (
            <ValueMark
              cx={isHorizontal ? xValue! : xMid}
              cy={isHorizontal ? yMid : yValueV!}
              ink={valueInk}
              inRange={inRange}
              dotR={dotR}
              haloR={haloR}
              haloDotR={haloDotR}
            />
          )
        )}
      </svg>

      {/* Bound labels */}
      {isHorizontal && size === "md" && (
        <div
          className="mt-0.5 flex justify-between font-mono uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
          style={{ fontSize: `${labelPx}px`, width: w }}
        >
          <span style={{ transform: "translateX(-50%)", marginLeft: `${tLow * 100}%` }}>
            {low}
          </span>
          <span style={{ transform: "translateX(-50%)", marginLeft: `${(tHigh - tLow) * 100}%` }}>
            {high}
          </span>
        </div>
      )}
    </div>
  );
}

function ValueMark({
  cx,
  cy,
  ink,
  inRange,
  dotR,
  haloR,
  haloDotR,
}: {
  cx: number;
  cy: number;
  ink: string;
  inRange: boolean;
  dotR: number;
  haloR: number;
  haloDotR: number;
}) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={dotR} fill={ink} />
      {inRange &&
        Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={Math.cos(a) * haloR}
              cy={Math.sin(a) * haloR}
              r={haloDotR}
              fill={ink}
            />
          );
        })}
    </g>
  );
}

function ChevronH({
  x,
  y,
  dir,
}: {
  x: number;
  y: number;
  dir: "left" | "right";
}) {
  const path =
    dir === "right"
      ? `M ${x - 6} ${y - 3.5} L ${x} ${y} L ${x - 6} ${y + 3.5} Z`
      : `M ${x + 6} ${y - 3.5} L ${x} ${y} L ${x + 6} ${y + 3.5} Z`;
  return <path d={path} fill="var(--color-accent)" />;
}

function ChevronV({
  x,
  y,
  dir,
}: {
  x: number;
  y: number;
  dir: "up" | "down";
}) {
  const path =
    dir === "up"
      ? `M ${x - 3.5} ${y + 6} L ${x} ${y} L ${x + 3.5} ${y + 6} Z`
      : `M ${x - 3.5} ${y - 6} L ${x} ${y} L ${x + 3.5} ${y - 6} Z`;
  return <path d={path} fill="var(--color-accent)" />;
}
