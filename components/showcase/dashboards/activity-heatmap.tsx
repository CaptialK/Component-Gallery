"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
 * visible), the largest ~22% (never flat fill).
 *
 * Interactivity (deep-wire pass, 2026-05-04):
 *  - Year toggle: 2025 / 2026 — reseeds generateActivity with a different
 *    seed; SVG group fades opacity 0→1 over 200ms during seed swap.
 *  - Range toggle: 12W / 26W / 52W slices the cells array.
 *  - Click-to-pin: thin Federal Blue 1px ring overlay marks the pinned cell
 *    (opacity-only animated 120ms — never animates r/cx/cy). Esc clears.
 *  - Keyboard nav: tabIndex=0 on SVG; arrows move the focusCell, walnut 1px
 *    rect renders the focus, Enter pins, "t" jumps to today.
 *  - Brush-drag: pointer-down/move sets a date range; cells outside dim to
 *    35% via fillOpacity (CSS-driven, not animating r). Footer line shows
 *    range + total.
 *
 * Client component — local state for hover/pin/focus/range/year/window.
 */

const WEEKS_FULL = 53;
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
  for (let w = 0; w < WEEKS_FULL; w++) {
    for (let d = 0; d < DAYS; d++) {
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

function describeCell(c: Cell): string {
  const n = c.value === 0 ? "no" : c.value;
  const s = c.value === 1 ? "" : "s";
  return `${n} contribution${s} on ${dayLabel(c.day)}, ${dateLabel(c.week, c.day)}`;
}

const RANGES: Array<{ id: "12W" | "26W" | "52W"; weeks: number }> = [
  { id: "12W", weeks: 12 },
  { id: "26W", weeks: 26 },
  { id: "52W", weeks: 52 },
];

const YEARS: Array<{ id: "2025" | "2026"; seed: number }> = [
  { id: "2025", seed: 17 },
  { id: "2026", seed: 42 },
];

export default function ActivityHeatmap() {
  const [year, setYear] = useState<"2025" | "2026">("2026");
  const [rangeId, setRangeId] = useState<"12W" | "26W" | "52W">("52W");
  const [hovered, setHovered] = useState<Cell | null>(null);
  const [pinned, setPinned] = useState<Cell | null>(null);
  const [focusCell, setFocusCell] = useState<{ week: number; day: number } | null>(null);

  // Brush-drag state.
  const [brush, setBrush] = useState<
    | { kind: "none" }
    | { kind: "dragging"; start: { week: number; day: number }; end: { week: number; day: number } }
    | { kind: "set"; start: { week: number; day: number }; end: { week: number; day: number } }
  >({ kind: "none" });

  // Subtle fade group during year/range swaps.
  const [swapping, setSwapping] = useState(false);
  const yearSeed = YEARS.find((y) => y.id === year)!.seed;
  const allCells = useMemo(() => generateActivity(yearSeed), [yearSeed]);
  const weeksToShow = RANGES.find((r) => r.id === rangeId)!.weeks;
  const cells = useMemo(() => {
    // Slice to last `weeksToShow` weeks. Cells are indexed [week*7 + day].
    const startWeek = WEEKS_FULL - weeksToShow;
    return allCells.filter((c) => c.week >= startWeek).map((c) => ({
      ...c,
      week: c.week - startWeek,
    }));
  }, [allCells, weeksToShow]);

  const max = useMemo(
    () => cells.reduce((m, c) => Math.max(m, c.value), 0),
    [cells],
  );
  const total = useMemo(() => cells.reduce((s, c) => s + c.value, 0), [cells]);

  // Trigger fade on year/range change.
  const swapKey = `${year}:${rangeId}`;
  const lastSwapRef = useRef(swapKey);
  useEffect(() => {
    if (lastSwapRef.current === swapKey) return;
    lastSwapRef.current = swapKey;
    setSwapping(true);
    const id = window.setTimeout(() => setSwapping(false), 200);
    return () => window.clearTimeout(id);
  }, [swapKey]);

  // Layout sizes (SVG user units).
  const dayLabelGutter = 32;
  const monthLabelHeight = 18;
  const gridWidth = weeksToShow * STEP - GAP;
  const gridHeight = DAYS * STEP - GAP;
  const legendGap = 24;
  const legendHeight = 28;
  const totalWidth = dayLabelGutter + gridWidth;
  const totalHeight =
    monthLabelHeight + gridHeight + legendGap + legendHeight;

  // Cell at clientX/clientY (used for brush-drag pointer math).
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cellAt = (e: React.PointerEvent | PointerEvent): { week: number; day: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = (e as PointerEvent).clientX;
    pt.y = (e as PointerEvent).clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const local = pt.matrixTransform(inv);
    const x = local.x - dayLabelGutter;
    const y = local.y - monthLabelHeight;
    if (x < 0 || y < 0 || x > gridWidth || y > gridHeight) return null;
    const week = Math.max(0, Math.min(weeksToShow - 1, Math.floor(x / STEP)));
    const day = Math.max(0, Math.min(DAYS - 1, Math.floor(y / STEP)));
    return { week, day };
  };

  // Keyboard nav handlers.
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "Escape") {
      setPinned(null);
      setBrush({ kind: "none" });
      return;
    }
    if (e.key === "t" || e.key === "T") {
      const tw = weeksToShow - 1;
      const today = new Date();
      const day = today.getDay();
      setFocusCell({ week: tw, day });
      e.preventDefault();
      return;
    }
    if (focusCell == null) {
      setFocusCell({ week: 0, day: 0 });
      e.preventDefault();
      return;
    }
    let { week, day } = focusCell;
    if (e.key === "ArrowLeft") week = Math.max(0, week - 1);
    else if (e.key === "ArrowRight") week = Math.min(weeksToShow - 1, week + 1);
    else if (e.key === "ArrowUp") day = Math.max(0, day - 1);
    else if (e.key === "ArrowDown") day = Math.min(DAYS - 1, day + 1);
    else if (e.key === "Enter" || e.key === " ") {
      const cell = cells.find((c) => c.week === week && c.day === day) ?? null;
      setPinned(cell);
      e.preventDefault();
      return;
    } else {
      return;
    }
    setFocusCell({ week, day });
    e.preventDefault();
  };

  // Brush-drag pointer handlers.
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const c = cellAt(e);
    if (!c) return;
    setBrush({ kind: "dragging", start: c, end: c });
    setPinned(null);
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (brush.kind !== "dragging") return;
    const c = cellAt(e);
    if (!c) return;
    setBrush({ kind: "dragging", start: brush.start, end: c });
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (brush.kind !== "dragging") return;
    const start = brush.start;
    const end = brush.end;
    // If the brush collapses to a single cell, treat as click-to-pin instead
    // of a range. Otherwise commit the range.
    if (start.week === end.week && start.day === end.day) {
      const cell = cells.find((c) => c.week === start.week && c.day === start.day) ?? null;
      setPinned(cell);
      setBrush({ kind: "none" });
    } else {
      setBrush({ kind: "set", start, end });
    }
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* swallow */
    }
  };

  // Range bounds (sorted) for filtering.
  const range = brush.kind === "dragging" || brush.kind === "set"
    ? (() => {
        const w0 = Math.min(brush.start.week, brush.end.week);
        const w1 = Math.max(brush.start.week, brush.end.week);
        const d0 = Math.min(brush.start.day, brush.end.day);
        const d1 = Math.max(brush.start.day, brush.end.day);
        return { w0, w1, d0, d1 };
      })()
    : null;
  const inRange = (c: Cell) =>
    range != null &&
    c.week >= range.w0 &&
    c.week <= range.w1 &&
    c.day >= range.d0 &&
    c.day <= range.d1;
  const rangeContribs = range
    ? cells.filter(inRange).reduce((s, c) => s + c.value, 0)
    : 0;
  const rangeStartLabel = range
    ? `${dayLabel(range.d0)} ${dateLabel(range.w0, range.d0)}`
    : "";
  const rangeEndLabel = range
    ? `${dayLabel(range.d1)} ${dateLabel(range.w1, range.d1)}`
    : "";

  // The cell shown in the tooltip: pinned cell takes precedence when no
  // hover; hover overrides everything when present.
  const tooltipCell = hovered ?? pinned;

  return (
    <div className="grid h-full w-full place-items-center bg-[var(--color-bg)] px-7 py-8">
      <div className="w-full max-w-[760px]">
        {/* Header */}
        <div className="mb-3 flex items-baseline justify-between">
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

        {/* Toggle row — year pills (left) + range pills (right). */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <PillGroup
            options={YEARS.map((y) => ({ id: y.id, label: y.id }))}
            value={year}
            onChange={(v) => setYear(v as "2025" | "2026")}
            ariaLabel="Year"
          />
          <PillGroup
            options={RANGES.map((r) => ({ id: r.id, label: r.id }))}
            value={rangeId}
            onChange={(v) => setRangeId(v as "12W" | "26W" | "52W")}
            ariaLabel="Range"
          />
        </div>

        {/* Heatmap SVG. */}
        <div className="-mx-1 overflow-x-auto pb-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="block w-full focus:outline-none"
          style={{ minWidth: 680, touchAction: "none" }}
          role="img"
          aria-label={`Contribution heatmap. ${total} total contributions across ${weeksToShow} weeks; peak day ${max}.`}
          tabIndex={0}
          data-focus-ring="off"
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Month labels above the grid. */}
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

          {/* Day labels. */}
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

          {/* Heatmap cells — wrapped in a swap-faded group. */}
          <g
            transform={`translate(${dayLabelGutter} ${monthLabelHeight})`}
            style={{
              opacity: swapping ? 0 : 1,
              transition: "opacity 200ms ease-out",
            }}
          >
            {cells.map((c) => {
              const r = radiusFor(c.value, max);
              const tx = c.week * STEP;
              const ty = c.day * STEP;
              const label = describeCell(c);
              const dimmed = range != null && !inRange(c);
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
                    style={{
                      fillOpacity: dimmed ? 0.35 : 1,
                      transition: "fill-opacity 200ms ease-out",
                    }}
                  />
                </g>
              );
            })}

            {/* Pinned ring — opacity-only animated. */}
            {pinned && (
              <rect
                key={`pin-${pinned.week}-${pinned.day}`}
                x={pinned.week * STEP - 0.5}
                y={pinned.day * STEP - 0.5}
                width={CELL + 1}
                height={CELL + 1}
                fill="none"
                stroke="var(--color-accent-2)"
                strokeWidth={1}
                rx={2}
                style={{
                  opacity: 1,
                  transition: "opacity 120ms ease-out",
                }}
              />
            )}

            {/* Focus rect — walnut, 1px. */}
            {focusCell && (
              <rect
                x={focusCell.week * STEP - 0.5}
                y={focusCell.day * STEP - 0.5}
                width={CELL + 1}
                height={CELL + 1}
                fill="none"
                stroke="var(--color-text)"
                strokeWidth={1}
                strokeDasharray="2 1.5"
                opacity={0.65}
                rx={2}
              />
            )}
          </g>

          {/* Legend — calibrated area scale. */}
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

          {/* Custom tooltip. */}
          <CellTooltipFader
            hovered={tooltipCell}
            dayLabelGutter={dayLabelGutter}
            monthLabelHeight={monthLabelHeight}
            totalWidth={totalWidth}
            gridHeight={gridHeight}
          />
        </svg>
        </div>

        {/* Footer caption — italic Fraunces. */}
        <p
          className="mt-7 text-[13px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          {range ? (
            <>
              {rangeStartLabel} → {rangeEndLabel} · {rangeContribs.toLocaleString()} contributions
              <span className="ml-2 not-italic font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                · esc clears
              </span>
            </>
          ) : pinned ? (
            <>
              Pinned: {dayLabel(pinned.day)}, {dateLabel(pinned.week, pinned.day)}.
              {" "}{pinned.value} contribution{pinned.value === 1 ? "" : "s"}.
              <span className="ml-2 not-italic font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                · esc clears · drag to brush a range
              </span>
            </>
          ) : (
            <>
              Hover, click, or arrow-key any cell. Drag to brush a date range,
              press <code className="not-italic">t</code> to jump to today.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function PillGroup({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-px rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={
              active
                ? "h-6 rounded-[var(--radius-xs)] bg-[var(--color-bg)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)] shadow-[inset_0_0_0_1px_var(--color-border)]"
                : "h-6 rounded-[var(--radius-xs)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

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
