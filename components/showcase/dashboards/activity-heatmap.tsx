"use client";

import { useMemo, useRef, useState } from "react";
import { mulberry32 } from "@/components/_kit/dot-noise";

/**
 * Activity heatmap — Spike 3, area-as-data.
 *
 * 53 weeks × 7 days. Each cell renders as a *single* dot whose radius
 * encodes the cell value. Cleveland-McGill perceptual ranking puts area
 * above density/texture for quantitative reading, so size encoding reads
 * more legibly than the density-cluster encoding the spike originally
 * proposed.
 *
 * Coverage stays bounded to the locked print-canon range from DECISIONS.md
 * on a *per-cell* basis: the smallest dot covers ~3% of its cell (always
 * visible), the largest ~22% (never flat fill). Radii are picked from
 *
 *   r_min² = baseline × cellArea / π   (~0.97 at cell 10)
 *   r_max² = maxCov   × cellArea / π   (~2.66 at cell 10)
 *   r²     = r_min² + (r_max² - r_min²) × normalize(value)
 *
 * Sqrt scaling on r² means equal value deltas produce equal area deltas —
 * what your eye actually compares.
 *
 * Bertin honesty: each cell still carries an `aria-label` with the raw
 * number for screen readers, but the visual readout is now a custom
 * in-SVG tooltip (Spike 3 v1 polish, 2026-05-04) — appears on hover with
 * no delay, replacing the native `<title>` element which had the browser's
 * ~500ms tooltip delay. Native `<title>` is dropped to avoid the
 * double-tooltip you'd otherwise get when both appear.
 *
 * Client component — uses local state to track the hovered cell. The
 * SVG itself is still composed deterministically; only the tooltip
 * overlay reacts to hover.
 */

const WEEKS = 53;
const DAYS = 7;
const CELL = 13;
const GAP = 1;
const STEP = CELL + GAP;

const BASELINE = 0.03;
const MAX_COVERAGE = 0.22;
const CELL_AREA = CELL * CELL;
const MIN_R_SQ = (BASELINE * CELL_AREA) / Math.PI;
const MAX_R_SQ = (MAX_COVERAGE * CELL_AREA) / Math.PI;
const MIN_R = Math.sqrt(MIN_R_SQ);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS: Array<{ index: number; label: string }> = [
  { index: 1, label: "Mon" },
  { index: 3, label: "Wed" },
  { index: 5, label: "Fri" },
];

type Cell = { value: number; week: number; day: number };

function generateActivity(seed: number): Cell[] {
  const rng = mulberry32(seed);
  const cells: Cell[] = [];
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < DAYS; d++) {
      // Skewed distribution: most cells quiet, occasional bursts.
      const r = rng();
      let value: number;
      if (r < 0.22) value = 0;
      else if (r < 0.62) value = 1 + Math.floor(rng() * 5);
      else if (r < 0.9) value = 6 + Math.floor(rng() * 14);
      else value = 20 + Math.floor(rng() * 38);
      cells.push({ value, week: w, day: d });
    }
  }
  return cells;
}

function radiusFor(value: number, max: number): number {
  if (max <= 0) return MIN_R;
  const norm = Math.max(0, Math.min(1, value / max));
  // Linear in area (r²) gives perceptually-uniform size differences;
  // Cleveland & McGill rank area above texture for quantitative encoding.
  return Math.sqrt(MIN_R_SQ + (MAX_R_SQ - MIN_R_SQ) * norm);
}

function dayLabel(day: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// Approximate calendar mapping: week 0 starts Jan 1 of a notional year. Used
// for tooltip prose so each cell reads as a real date, not "week 7, day 2".
function dateLabel(week: number, day: number): string {
  const dayOfYear = week * 7 + day;
  const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let m = 0;
  let d = dayOfYear;
  while (m < 12 && d >= monthLengths[m]) {
    d -= monthLengths[m];
    m++;
  }
  if (m >= 12) return `week ${week + 1}`;
  return `${MONTHS[m]} ${ordinal(d + 1)}`;
}

/** Accessible-name string for a cell — replaces what the native <title>
 *  used to carry. */
function describeCell(c: Cell): string {
  const n = c.value === 0 ? "no" : c.value;
  const s = c.value === 1 ? "" : "s";
  return `${n} contribution${s} on ${dayLabel(c.day)}, ${dateLabel(c.week, c.day)}`;
}

export default function ActivityHeatmap() {
  const cells = useMemo(() => generateActivity(42), []);
  const max = useMemo(() => cells.reduce((m, c) => Math.max(m, c.value), 0), [cells]);
  const total = useMemo(() => cells.reduce((s, c) => s + c.value, 0), [cells]);
  const [hovered, setHovered] = useState<Cell | null>(null);

  // Layout sizes (SVG user units).
  const dayLabelGutter = 32;
  const monthLabelHeight = 18;
  const gridWidth = WEEKS * STEP - GAP;
  const gridHeight = DAYS * STEP - GAP;
  const legendGap = 24;
  const legendHeight = 28;
  const totalWidth = dayLabelGutter + gridWidth;
  const totalHeight =
    monthLabelHeight + gridHeight + legendGap + legendHeight;

  return (
    <div className="grid h-full w-full place-items-center bg-[var(--color-bg)] px-7 py-8">
      <div className="w-full max-w-[760px]">
        {/* Header */}
        <div className="mb-6 flex items-baseline justify-between">
          <h2
            className="font-display text-[24px] italic leading-none text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            Activity, last year.
          </h2>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {total.toLocaleString()} contributions
          </div>
        </div>

        {/* Heatmap SVG. Wrapped in a horizontal-scroll container with a
            min-width so cells stay legibly sized on narrow viewports
            (mobile, sidebar-collapsed app shells). 53 weeks at any readable
            cell size means the grid is naturally ~700+ px wide; on smaller
            viewports the user scrolls instead of squinting at 6-px dots. */}
        <div className="-mx-1 overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="block w-full"
          style={{ minWidth: 680 }}
          role="img"
          aria-label={`Contribution heatmap. ${total} total contributions across ${WEEKS} weeks; peak day ${max}.`}
        >
          {/* Month labels above the grid. Place each at the start of the week
              that contains the first of that month — approximate but reads as
              tidy. */}
          <g transform={`translate(${dayLabelGutter} 0)`}>
            {MONTHS.map((m, i) => {
              const x = (i / 12) * gridWidth;
              return (
                <text
                  key={m}
                  x={x}
                  y={monthLabelHeight - 5}
                  className="fill-[var(--color-text-muted)]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  {m}
                </text>
              );
            })}
          </g>

          {/* Day labels (Mon, Wed, Fri) left of the grid. */}
          <g transform={`translate(0 ${monthLabelHeight})`}>
            {DAY_LABELS.map(({ index, label }) => (
              <text
                key={label}
                x={0}
                y={index * STEP + STEP - 3}
                className="fill-[var(--color-text-muted)]"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </text>
            ))}
          </g>

          {/* Heatmap cells. One dot per cell, centered, sized by value. */}
          <g transform={`translate(${dayLabelGutter} ${monthLabelHeight})`}>
            {cells.map((c) => {
              const r = radiusFor(c.value, max);
              const tx = c.week * STEP;
              const ty = c.day * STEP;
              const label = describeCell(c);
              return (
                <g
                  key={`${c.week}-${c.day}`}
                  role="img"
                  aria-label={label}
                  transform={`translate(${tx} ${ty})`}
                  onMouseEnter={() => setHovered(c)}
                  onMouseLeave={() =>
                    setHovered((prev) =>
                      prev && prev.week === c.week && prev.day === c.day
                        ? null
                        : prev,
                    )
                  }
                >
                  {/* Invisible cell rect carries the hover hit area for
                      cells with very small dots. */}
                  <rect
                    width={CELL}
                    height={CELL}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  <circle
                    cx={CELL / 2}
                    cy={CELL / 2}
                    r={r}
                    fill="var(--color-dot-ink)"
                  />
                </g>
              );
            })}
          </g>

          {/* Legend — calibrated area scale. Numeric anchors at each end so
              the ramp reads as "0 to {max} contributions" rather than the
              ordinal less → more. */}
          <g
            transform={`translate(${dayLabelGutter} ${
              monthLabelHeight + gridHeight + legendGap
            })`}
          >
            <text
              x={0}
              y={CELL - 1}
              className="fill-[var(--color-text-muted)]"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.12em",
              }}
            >
              0
            </text>
            {[0, 0.25, 0.5, 0.75, 1].map((norm, i) => {
              const r = radiusFor(norm, 1);
              return (
                <g
                  key={i}
                  transform={`translate(${22 + i * (CELL + 3)} 0)`}
                >
                  <circle
                    cx={CELL / 2}
                    cy={CELL / 2}
                    r={r}
                    fill="var(--color-dot-ink)"
                  />
                </g>
              );
            })}
            <text
              x={22 + 5 * (CELL + 3) + 5}
              y={CELL - 1}
              className="fill-[var(--color-text-muted)]"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.12em",
              }}
            >
              {max} / day
            </text>
          </g>

          {/* Custom tooltip — rendered last so it paints on top of the
              grid. Pointer-events disabled so it can't intercept hover.
              Wrapped in an opacity-toggled <g> so the exit fades over 120ms
              (locked tooltip vocab: 0ms in, 120ms ease-out out) instead of
              snapping to nothing. The tooltip body keeps the LAST hovered
              cell while the wrapper fades, so position doesn't jump during
              the exit. */}
          <CellTooltipFader
            hovered={hovered}
            dayLabelGutter={dayLabelGutter}
            monthLabelHeight={monthLabelHeight}
            totalWidth={totalWidth}
            gridHeight={gridHeight}
          />
        </svg>
        </div>

        {/* Footer caption — italic Fraunces. Closes the dashboard with a
            typeset note rather than a chart axis. */}
        <p
          className="mt-7 text-[13px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Each cell renders as a single dot whose area maps to the day's
          value. Per-cell coverage stays bounded to 3–22% — the dot is barely
          visible at zero, roughly a fifth of the cell at peak. Sqrt scaling
          on r² makes equal value deltas read as equal area deltas. Hover
          any cell for the raw number.
        </p>
      </div>
    </div>
  );
}

/**
 * Fader wrapper around the in-SVG tooltip. Renders the tooltip group
 * always (never unmounts) and toggles its opacity via a CSS transition
 * so the exit takes 120ms ease-out, matching the locked tooltip vocab
 * (0ms in, 120ms out). When `hovered` becomes null we keep the LAST
 * tooltip's geometry frozen while it fades, so the tooltip doesn't jump
 * to (0, 0) on exit.
 */
function CellTooltipFader({
  hovered,
  dayLabelGutter,
  monthLabelHeight,
  totalWidth,
  gridHeight,
}: {
  hovered: Cell | null;
  dayLabelGutter: number;
  monthLabelHeight: number;
  totalWidth: number;
  gridHeight: number;
}) {
  // Hold on to the most-recent non-null cell so the exit doesn't reposition.
  const lastRef = useRef<Cell | null>(null);
  if (hovered) lastRef.current = hovered;
  const cell = hovered ?? lastRef.current;
  if (!cell) return null;
  return (
    <g
      style={{
        opacity: hovered ? 1 : 0,
        transition: "opacity 120ms ease-out",
      }}
      pointerEvents="none"
      aria-hidden
    >
      <CellTooltip
        cell={cell}
        dayLabelGutter={dayLabelGutter}
        monthLabelHeight={monthLabelHeight}
        totalWidth={totalWidth}
        gridHeight={gridHeight}
      />
    </g>
  );
}

/**
 * In-SVG tooltip. Two stacked text lines: mono-caps date eyebrow over a
 * Fraunces italic count. Anchored above the hovered cell, flips below for
 * the top row, clamped to the SVG width so it never overflows. No browser
 * tooltip delay — appears the moment hover state updates.
 */
function CellTooltip({
  cell,
  dayLabelGutter,
  monthLabelHeight,
  totalWidth,
  gridHeight,
}: {
  cell: Cell;
  dayLabelGutter: number;
  monthLabelHeight: number;
  totalWidth: number;
  gridHeight: number;
}) {
  const TIP_W = 140;
  const TIP_H = 34;
  const MARGIN = 6;

  const cellCenterX = dayLabelGutter + cell.week * STEP + CELL / 2;
  const cellTop = monthLabelHeight + cell.day * STEP;
  const cellBottom = cellTop + CELL;

  const aboveY = cellTop - TIP_H - MARGIN;
  const belowY = cellBottom + MARGIN;
  // Flip below the cell when there's no room above (top row).
  // Also flip if below would crowd the legend.
  const useBelow = aboveY < 0 && belowY + TIP_H <= monthLabelHeight + gridHeight + 4;
  const y = useBelow ? belowY : Math.max(0, aboveY);

  const xRaw = cellCenterX - TIP_W / 2;
  const x = Math.max(0, Math.min(totalWidth - TIP_W, xRaw));

  const date = `${dayLabel(cell.day).toUpperCase()} · ${dateLabel(cell.week, cell.day).toUpperCase()}`;
  const count =
    cell.value === 0
      ? "no contributions"
      : `${cell.value} contribution${cell.value === 1 ? "" : "s"}`;

  return (
    <g
      transform={`translate(${x} ${y})`}
      pointerEvents="none"
      aria-hidden
    >
      <rect
        width={TIP_W}
        height={TIP_H}
        fill="var(--color-bg)"
        stroke="var(--color-border-strong)"
        strokeWidth={0.7}
        rx={3}
      />
      <text
        x={TIP_W / 2}
        y={13}
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          letterSpacing: "0.18em",
          fill: "var(--color-text-muted)",
        }}
      >
        {date}
      </text>
      <text
        x={TIP_W / 2}
        y={27}
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 12,
          fontStyle: "italic",
          fontVariationSettings: '"opsz" 24, "SOFT" 30',
          fill: "var(--color-text)",
        }}
      >
        {count}
      </text>
    </g>
  );
}
