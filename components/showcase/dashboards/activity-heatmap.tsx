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
 * Bertin honesty: even with area encoding (rank 5 of 7), each cell carries
 * a native `<title>` tooltip with the raw number — area is "ambient
 * pattern," tooltip is "analytical readout."
 *
 * Pure server component — no client state, no hover JS.
 */

const WEEKS = 53;
const DAYS = 7;
const CELL = 10;
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

export default function ActivityHeatmap() {
  const cells = generateActivity(42);
  const max = cells.reduce((m, c) => Math.max(m, c.value), 0);
  const total = cells.reduce((s, c) => s + c.value, 0);

  // Layout sizes (SVG user units).
  const dayLabelGutter = 26;
  const monthLabelHeight = 14;
  const gridWidth = WEEKS * STEP - GAP;
  const gridHeight = DAYS * STEP - GAP;
  const legendGap = 18;
  const legendHeight = 22;
  const totalWidth = dayLabelGutter + gridWidth;
  const totalHeight =
    monthLabelHeight + gridHeight + legendGap + legendHeight;

  return (
    <div className="grid h-full w-full place-items-center bg-[var(--color-bg)] px-7 py-8">
      <div className="w-full max-w-[560px]">
        {/* Header */}
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-[14px] font-medium tracking-[-0.01em] text-[var(--color-text)]">
            Activity, last year
          </h2>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {total.toLocaleString()} contributions
          </div>
        </div>

        {/* Heatmap SVG. */}
        <svg
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="block w-full"
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
                  y={monthLabelHeight - 4}
                  className="fill-[var(--color-text-muted)]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 7,
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
                y={index * STEP + STEP - 2}
                className="fill-[var(--color-text-muted)]"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 7,
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
              return (
                <g
                  key={`${c.week}-${c.day}`}
                  transform={`translate(${tx} ${ty})`}
                >
                  <title>
                    {c.value === 0 ? "no" : c.value} contribution
                    {c.value === 1 ? "" : "s"} on {dayLabel(c.day)},{" "}
                    {dateLabel(c.week, c.day)}
                  </title>
                  {/* Invisible cell rect carries the tooltip hover area for
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

          {/* Legend — density ramp showing how many dots = how much value. */}
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
                fontSize: 7,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              less
            </text>
            {[0, 0.25, 0.5, 0.75, 1].map((norm, i) => {
              const r = radiusFor(norm, 1);
              return (
                <g
                  key={i}
                  transform={`translate(${30 + i * (CELL + 2)} 0)`}
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
              x={30 + 5 * (CELL + 2) + 4}
              y={CELL - 1}
              className="fill-[var(--color-text-muted)]"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 7,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              more
            </text>
          </g>
        </svg>

        {/* Footer caption — small, italic, Fraunces. Closes the dashboard
            with a typeset note rather than a chart axis. */}
        <p
          className="mt-6 text-[11px] italic leading-relaxed text-[var(--color-text-muted)]"
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
