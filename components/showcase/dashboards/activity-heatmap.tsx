import { mulberry32, poissonDisc } from "@/components/_kit/dot-noise";

/**
 * Activity heatmap — Spike 3, density-as-data.
 *
 * 53 weeks × 7 days. Each cell renders as a Bridson dot cluster whose count
 * is derived from the cell value via the locked print-canon formula:
 *
 *   coverage = clamp(0.03 + 0.19 × normalize(value), 0, 0.22)
 *   N        = round(coverage × cellArea / dotArea)
 *
 * One canonical Bridson tile is generated at module load and sliced per-cell;
 * identical-value cells get identical dot patterns, which is what makes the
 * field read as a *system* rather than as ornament. Cells respect the locked
 * coverage invariant from `DECISIONS.md` end-to-end — sparse cells stay
 * visible (≥3%), dense cells never tip into flat-fill (≤22%).
 *
 * Bertin honesty: texture sits near the bottom of his selectivity ranking
 * for quantitative reading, so each cell carries a `<title>` tooltip with
 * the raw number. The dot field is the ambient pattern; the tooltip is the
 * analytical readout.
 *
 * Pure server component — no client state, no hover JS. Tooltips come from
 * native browser `<title>` rendering.
 */

const WEEKS = 53;
const DAYS = 7;
const CELL = 10;
const GAP = 1;
const STEP = CELL + GAP;
const DOT_R = 0.6;

const BASELINE = 0.03;
const MAX_COVERAGE = 0.22;
const SLOPE = MAX_COVERAGE - BASELINE;
const DOT_AREA = Math.PI * DOT_R * DOT_R;
const CELL_AREA = CELL * CELL;
const MAX_DOTS_PER_CELL = Math.floor((MAX_COVERAGE * CELL_AREA) / DOT_AREA);

// One canonical tile of Bridson points within a CELL × CELL region. Bridson
// radius is tuned so we can reliably get ≥ MAX_DOTS_PER_CELL points per tile.
const TILE = poissonDisc({
  width: CELL,
  height: CELL,
  radius: DOT_R * 2.0,
  seed: 1,
});

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

function dotCountFor(value: number, max: number): number {
  if (max <= 0) return 0;
  const norm = value / max;
  const coverage = Math.max(0, Math.min(MAX_COVERAGE, BASELINE + SLOPE * norm));
  const target = Math.round((coverage * CELL_AREA) / DOT_AREA);
  return Math.min(target, TILE.length);
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

          {/* Heatmap cells. */}
          <g transform={`translate(${dayLabelGutter} ${monthLabelHeight})`}>
            {cells.map((c) => {
              const n = dotCountFor(c.value, max);
              const dots = TILE.slice(0, n);
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
                      cells with very few dots. */}
                  <rect
                    width={CELL}
                    height={CELL}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  {dots.map((p, j) => (
                    <circle
                      key={j}
                      cx={p.x}
                      cy={p.y}
                      r={DOT_R}
                      fill="var(--color-dot-ink)"
                    />
                  ))}
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
              const target = Math.round(
                ((BASELINE + SLOPE * norm) * CELL_AREA) / DOT_AREA,
              );
              const dots = TILE.slice(0, Math.min(target, TILE.length));
              return (
                <g
                  key={i}
                  transform={`translate(${30 + i * (CELL + 2)} 0)`}
                >
                  {dots.map((p, j) => (
                    <circle
                      key={j}
                      cx={p.x}
                      cy={p.y}
                      r={DOT_R}
                      fill="var(--color-dot-ink)"
                    />
                  ))}
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
          Each cell renders as a Bridson dot cluster whose count maps to the
          day's value via the print-canon coverage formula. Coverage is bounded
          to 3–22% — the range inside which a dot field reads as texture
          rather than as fill. Hover any cell for the raw number.
        </p>
      </div>
    </div>
  );
}
