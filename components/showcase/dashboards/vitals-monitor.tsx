import { mulberry32 } from "@/components/_kit/dot-noise";
import { Trace, type TraceDot } from "@/components/_kit/trace";

/**
 * Vitals monitor — bedside dashboard showing the five core physiological
 * measurements (HR, BP, SpO₂, RR, Temp) with their last-60-minute trend.
 *
 * Refactored 2026-05-03 per the dot+line system change in DECISIONS.md
 * (the dots-as-background retrospective). Originally the trend was rendered
 * as 60 stippled samples on a Bridson density backdrop — Vinson reviewed and
 * reported the density behind the dots was illegible at typical scales.
 *
 * Now:
 *  - The trend is a smooth `<Trace />` polyline. Walnut ink for the line.
 *  - The normal envelope is a translucent fill band between the bound
 *    threshold rules (dashed hairlines at `normal[0]` and `normal[1]`).
 *  - Dots only mark *moments* — out-of-range samples (persimmon) and the
 *    live read (Federal Blue, slightly larger). Cleveland-McGill: lines for
 *    trend, dots for marks; the encoding match the perceptual ranking.
 *  - Severity under each value is a thin colored hairline; the previous
 *    density-coded stippled rule was a dots-behind-information violation.
 *
 * Pure server component. Realistic but mock data; no PHI.
 */

type Severity = "normal" | "marginal" | "alert";

type Metric = {
  key: string;
  label: string;
  unit: string;
  /** Realistic range used for vertical scaling of the trend. */
  scale: [number, number];
  /** Clinical normal band, rendered as the envelope fill + thresholds. */
  normal: [number, number];
  /** Current displayed value, formatted by `format`. */
  current: number | { sys: number; dia: number };
  format: (v: number | { sys: number; dia: number }) => string;
  /** 60 samples — most recent last. */
  trend: number[];
  /** Severity drives the thin alert rule under the value. */
  severity: Severity;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Generate 60 minutes of realistic-ish trend around a baseline. */
function trendAround(baseline: number, drift: number, noise: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  let v = baseline;
  for (let i = 0; i < 60; i++) {
    v += (rng() - 0.5) * drift;
    out.push(v + (rng() - 0.5) * noise);
  }
  return out;
}

const METRICS: Metric[] = [
  {
    key: "hr",
    label: "HR",
    unit: "bpm",
    scale: [40, 130],
    normal: [60, 100],
    current: 84,
    format: (v) => `${Math.round(v as number)}`,
    trend: trendAround(78, 2.4, 3, 11),
    severity: "normal",
  },
  {
    key: "bp",
    label: "BP",
    unit: "mmHg",
    scale: [50, 180],
    normal: [80, 130],
    current: { sys: 124, dia: 76 },
    format: (v) => {
      const x = v as { sys: number; dia: number };
      return `${x.sys}/${x.dia}`;
    },
    trend: trendAround(124, 1.6, 4, 22),
    severity: "normal",
  },
  {
    key: "spo2",
    label: "SpO₂",
    unit: "%",
    scale: [85, 100],
    normal: [95, 100],
    current: 96,
    format: (v) => `${Math.round(v as number)}`,
    trend: trendAround(96, 0.4, 1.2, 33).map((v) => clamp(v, 88, 100)),
    severity: "normal",
  },
  {
    key: "rr",
    label: "RR",
    unit: "/min",
    scale: [6, 28],
    normal: [12, 20],
    current: 19,
    format: (v) => `${Math.round(v as number)}`,
    trend: trendAround(17, 0.6, 1.6, 44),
    severity: "marginal",
  },
  {
    key: "temp",
    label: "Temp",
    unit: "°C",
    scale: [35, 40],
    normal: [36.5, 37.5],
    current: 37.8,
    format: (v) => (v as number).toFixed(1),
    trend: trendAround(37.6, 0.04, 0.12, 55),
    severity: "marginal",
  },
];

const SEVERITY_COLOR: Record<Severity, string> = {
  normal: "var(--color-border-strong)",
  marginal: "var(--color-warning)",
  alert: "var(--color-danger)",
};

export default function VitalsMonitor() {
  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header band */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Bedside vitals · Patel, R. · Med-Surg 412-B
            </h2>
            <p
              className="mt-1 font-display text-[19px] italic leading-none text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              The last sixty minutes.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Sampled q1m
            </div>
            <div className="mt-1 font-mono text-[11px] text-[var(--color-text)]">14:08:12</div>
          </div>
        </div>

        {/* Five metric cards. */}
        <div className="grid flex-1 grid-cols-5 divide-x divide-[var(--color-border)]">
          {METRICS.map((m) => (
            <MetricCard key={m.key} metric={m} />
          ))}
        </div>

        {/* Foot caption — the system's tell, updated for the line vocabulary. */}
        <p
          className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-2 text-center text-[11px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Each line is sixty minutes of trend. The faint band marks the
          patient's normal envelope; persimmon dots mark out-of-range moments.
          The Federal Blue dot is the live read.
        </p>
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 px-4 py-4">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {metric.label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {metric.normal[0]}–{metric.normal[1]} {metric.unit}
        </span>
      </div>

      {/* Big value — Geist Mono, weighty. BP gets a smaller cut so the
          systolic/diastolic pair fits the column width. */}
      <div className="flex flex-col">
        <span
          className={
            metric.key === "bp"
              ? "font-mono text-[26px] leading-none text-[var(--color-text)]"
              : "font-mono text-[34px] leading-none text-[var(--color-text)]"
          }
          style={{ fontVariationSettings: '"wght" 500' }}
        >
          {metric.format(metric.current)}
        </span>
        <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {metric.unit}
        </span>
      </div>

      {/* Severity rule — single colored hairline. Length is a future encoding;
          for now color alone carries severity (mirrors the colored mono labels
          on chart-header's allergy ribbon). */}
      <div
        aria-hidden
        className="h-[2px] w-full rounded-[1px]"
        style={{ background: SEVERITY_COLOR[metric.severity] }}
      />

      <Sparkline
        width={148}
        height={52}
        scale={metric.scale}
        normal={metric.normal}
        samples={metric.trend}
      />
    </div>
  );
}

/**
 * Sparkline — a smooth Trace polyline through 60 minutes of samples, with the
 * normal envelope as a translucent fill band, dashed threshold rules at the
 * envelope edges, persimmon dots at out-of-range moments, and a Federal Blue
 * dot at the live read.
 */
function Sparkline({
  width,
  height,
  scale,
  normal,
  samples,
}: {
  width: number;
  height: number;
  scale: [number, number];
  normal: [number, number];
  samples: number[];
}) {
  const lastIdx = samples.length - 1;
  const last = samples[lastIdx];
  const data = samples.map((y, i) => ({ x: i, y }));

  const outOfRangeMarks: TraceDot[] = [];
  for (let i = 0; i < samples.length; i++) {
    if (i === lastIdx) continue;
    const v = samples[i];
    if (v < normal[0] || v > normal[1]) {
      outOfRangeMarks.push({
        index: i,
        color: "var(--color-accent)",
        radius: 1.3,
      });
    }
  }

  return (
    <Trace
      data={data}
      width={width}
      height={height}
      yDomain={scale}
      smooth
      strokeColor="var(--color-text)"
      strokeWidth={1.2}
      fill={{
        kind: "envelope",
        lower: normal[0],
        upper: normal[1],
        color: "color-mix(in oklch, var(--color-text-muted) 8%, transparent)",
      }}
      thresholds={[
        {
          y: normal[0],
          dashed: true,
          strokeWidth: 0.5,
          color: "var(--color-border-strong)",
        },
        {
          y: normal[1],
          dashed: true,
          strokeWidth: 0.5,
          color: "var(--color-border-strong)",
        },
      ]}
      dots={[
        ...outOfRangeMarks,
        { index: lastIdx, color: "var(--color-accent-2)", radius: 2.2 },
      ]}
      ariaLabel={`60-minute trend, current ${last.toFixed(1)}`}
      className="block w-full"
      margin={3}
    />
  );
}
