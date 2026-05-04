import { mulberry32 } from "@/components/_kit/dot-noise";
import { Trace, type TracePoint } from "@/components/_kit/trace";

/**
 * Metrics stream — same KPIs as `metrics-overview`, different rhythm.
 * Four horizontal strips stacked top-to-bottom; each strip surfaces the
 * Trace sparkline as the dominant visual, with the label on the left and
 * the current value + delta on the right. Reads like a monitoring panel
 * rather than a card grid.
 *
 * Dot+line commitments specific to this plate:
 *  - The sparkline is wide enough to read the whole shape, not just the
 *    last few days. Length-as-trend is the encoding.
 *  - Each strip ends with a Federal Blue live dot at the latest point.
 *  - A faint min/max envelope (Trace `fill: "envelope"`) sits behind the
 *    line — same pattern as the medical vitals-monitor, but quieter.
 *  - Threshold rules (target / floor) appear when relevant, dashed
 *    walnut, dropping in behind the trend.
 *
 * Pure server component. Mock data only.
 */

type Metric = {
  label: string;
  value: string;
  delta: number;
  goodSign?: 1 | -1;
  series: TracePoint[];
  /** Optional horizontal target line, rendered as a dashed Trace threshold. */
  target?: number;
};

function series(
  seed: number,
  n: number,
  base: number,
  drift: number,
  jitter: number,
): TracePoint[] {
  const rng = mulberry32(seed);
  let v = base;
  const out: TracePoint[] = [];
  for (let i = 0; i < n; i++) {
    v += drift + (rng() - 0.5) * jitter;
    out.push({ x: i, y: Math.max(0, v) });
  }
  return out;
}

const METRICS: Metric[] = [
  {
    label: "Monthly active users",
    value: "47.2K",
    delta: 12.4,
    series: series(11, 30, 38, 0.32, 1.4),
    target: 45,
  },
  {
    label: "Revenue",
    value: "$128.4K",
    delta: 8.1,
    series: series(31, 30, 110, 0.6, 2.6),
    target: 125,
  },
  {
    label: "Avg. session",
    value: "8m 42s",
    delta: 3.2,
    series: series(53, 30, 7.4, 0.04, 0.55),
    target: 8,
  },
  {
    label: "Churn",
    value: "2.3%",
    delta: -0.5,
    goodSign: -1,
    series: series(71, 30, 3.1, -0.025, 0.18),
    target: 3,
  },
];

export default function MetricsStream() {
  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Stream · stipple-press
            </div>
            <h2
              className="mt-1 font-display text-[20px] italic leading-none text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              Apr 1 — Apr 30, 2026
            </h2>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <LivePulse />
            live · refreshed 14:08
          </div>
        </div>

        {/* Strips — flex-1 with grow, so 4 rows fill the plate. */}
        <ul className="flex min-h-0 flex-1 flex-col divide-y divide-[var(--color-border)]">
          {METRICS.map((m) => (
            <Strip key={m.label} m={m} />
          ))}
        </ul>

        <p
          className="border-t border-[var(--color-border)] px-6 py-2 text-center text-[11px] italic text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Each strip runs a 30-day Trace; the dashed walnut rule marks the
          target, the Federal Blue dot marks the current reading.
        </p>
      </div>
    </div>
  );
}

function Strip({ m }: { m: Metric }) {
  const yMin = Math.min(...m.series.map((p) => p.y), m.target ?? Infinity);
  const yMax = Math.max(...m.series.map((p) => p.y), m.target ?? -Infinity);
  const pad = (yMax - yMin) * 0.18 || 1;
  return (
    <li className="grid flex-1 grid-cols-[180px_1fr_140px] items-center gap-4 px-6 py-4">
      {/* Label + target */}
      <div className="leading-tight">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text)]">
          {m.label}
        </div>
        {m.target !== undefined && (
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            target ·{" "}
            <span className="text-[var(--color-text)]">{formatTarget(m)}</span>
          </div>
        )}
      </div>

      {/* Trace — fills its cell, height bumped to 76 so it fills taller strips. */}
      <div className="min-w-0">
        <Trace
          data={m.series}
          width={520}
          height={76}
          yDomain={[yMin - pad, yMax + pad]}
          smooth
          strokeColor="var(--color-text)"
          strokeWidth={1.1}
          fill={{
            kind: "envelope",
            lower: yMin,
            upper: yMax,
            color: "color-mix(in oklch, var(--color-text-muted) 5%, transparent)",
          }}
          thresholds={
            m.target !== undefined
              ? [{ y: m.target, dashed: true, color: "var(--color-border-strong)" }]
              : undefined
          }
          dots={[
            {
              index: m.series.length - 1,
              color: "var(--color-accent-2)",
              radius: 2.3,
            },
          ]}
          className="block w-full"
          ariaLabel={`${m.label} trend`}
        />
      </div>

      {/* Value + delta */}
      <div className="flex flex-col items-end">
        <span
          className="font-display text-[26px] leading-none italic tracking-[-0.02em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          {m.value}
        </span>
        <Delta value={m.delta} goodSign={m.goodSign ?? 1} />
      </div>
    </li>
  );
}

/** Display-format the target as a parallel string to the value. */
function formatTarget(m: Metric): string {
  if (m.label === "Monthly active users") return `${m.target}K`;
  if (m.label === "Revenue") return `$${m.target}K`;
  if (m.label === "Avg. session") return `${m.target}m`;
  if (m.label === "Churn") return `${m.target}%`;
  return String(m.target);
}

/** Tiny pulsing live dot — uses the existing color-accent-2 token. The
 *  `animate-pulse` is the only motion in the catalogue; it's quiet enough. */
function LivePulse() {
  return (
    <span
      aria-hidden
      className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] animate-pulse rounded-full bg-[var(--color-accent-2)]"
    />
  );
}

function Delta({ value, goodSign }: { value: number; goodSign: 1 | -1 }) {
  const isGood = goodSign === 1 ? value >= 0 : value <= 0;
  const color = isGood ? "var(--color-accent-2)" : "var(--color-accent)";
  const sign = value > 0 ? "+" : "";
  return (
    <span
      className="mt-1 font-mono text-[11px] tabular-nums tracking-tight"
      style={{ color }}
    >
      {sign}
      {value.toFixed(1)}% vs prior
    </span>
  );
}
