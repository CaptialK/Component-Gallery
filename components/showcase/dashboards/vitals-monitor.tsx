import { mulberry32, poissonDisc } from "@/components/_kit/dot-noise";
import { DotField } from "@/components/_kit/dot-field";

/**
 * Vitals monitor — bedside dashboard showing the five core physiological
 * measurements (HR, BP, SpO₂, RR, Temp) with their last-60-minute trend.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - Each trend is rendered as 60 dots, one per minute. The normal-range
 *    envelope is a Bridson density backdrop — denser inside the band,
 *    fading at the edges — so the eye reads "in or out of range" before it
 *    reads any number.
 *  - In-range samples are walnut ink. Out-of-range samples are persimmon.
 *    The most recent sample wears a Federal Blue ring (the same vocabulary
 *    as a focus halo — "this is the live one").
 *  - The unit, normal range, and current value share a single typographic
 *    register; alerts are *not* colored badges. They're a stippled rule
 *    under the value, density-coded to severity (Bertin: position over
 *    color for ordinal data).
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
  /** Clinical normal band shown as a density envelope. */
  normal: [number, number];
  /** Current displayed value, formatted by `format`. */
  current: number | { sys: number; dia: number };
  format: (v: number | { sys: number; dia: number }) => string;
  /** 60 samples — most recent last. */
  trend: number[];
  /** Severity drives the stippled severity rule under the value. */
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
    // Slow random walk + per-sample noise.
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
    // BP trend = systolic only for the sparkline. Diastolic shown in the value.
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

        {/* Foot caption — the system's tell. */}
        <p
          className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-2 text-center text-[11px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Each dot is a one-minute sample. Walnut dots sit inside the patient's
          normal envelope; persimmon dots fall outside. The Federal Blue ring
          marks the live read.
        </p>
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const sparkW = 148;
  const sparkH = 52;
  // Coverage stays inside the locked print-canon range [0.03, 0.22]: at
  // these baseDensity values the severity rule renders ~4% (normal) → ~9%
  // (alert), so the gradient is visible but the rule never disappears.
  const sevDensity = metric.severity === "alert" ? 0.95 : metric.severity === "marginal" ? 0.6 : 0.4;
  const sevAccent =
    metric.severity === "alert" ? 0.6 : metric.severity === "marginal" ? 0.3 : 0;

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

      {/* Severity rule — density-coded, not colour-coded. */}
      <div className="h-2 w-full">
        <DotField
          shape={{ kind: "rect", width: 160, height: 8 }}
          spacing={3.4}
          dotRadius={0.85}
          baseDensity={sevDensity}
          accentRatio={sevAccent}
          seed={metric.key.length * 17 + 3}
          density={(x, _y, w) => {
            // Crescendo from the start so the eye reads it left-to-right
            // like a sentence-ending punctuation.
            const t = x / w;
            return Math.min(1, t * 1.4);
          }}
          className="h-full w-full"
        />
      </div>

      <Sparkline
        width={sparkW}
        height={sparkH}
        scale={metric.scale}
        normal={metric.normal}
        samples={metric.trend}
        seed={metric.key.charCodeAt(0) * 211 + metric.key.charCodeAt(1)}
      />
    </div>
  );
}

/**
 * Sparkline — 60 dots over 60 minutes, vertically positioned by value.
 *
 * Layered:
 *   1. Bridson density backdrop bounded to the *normal envelope* (the band
 *      between `normal[0]` and `normal[1]`). The eye locks onto this band
 *      first.
 *   2. Sample dots — walnut if inside normal, persimmon if outside.
 *   3. Live ring around the most recent sample (Federal Blue stipple).
 */
function Sparkline({
  width,
  height,
  scale,
  normal,
  samples,
  seed,
}: {
  width: number;
  height: number;
  scale: [number, number];
  normal: [number, number];
  samples: number[];
  seed: number;
}) {
  const [lo, hi] = scale;
  const span = hi - lo;
  const yOf = (v: number) => {
    const t = (v - lo) / span;
    return height - clamp(t, 0, 1) * height;
  };
  const yNormalTop = yOf(normal[1]);
  const yNormalBot = yOf(normal[0]);
  const bandH = Math.max(2, yNormalBot - yNormalTop);

  const last = samples[samples.length - 1];
  const lastIdx = samples.length - 1;
  const xOf = (i: number) => (i / (samples.length - 1)) * (width - 6) + 3;

  return (
    <svg
      role="img"
      aria-label={`60-minute trend, current ${last.toFixed(1)}`}
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full"
    >
      {/* Backdrop: blue-noise dots inside the normal envelope, density
          tapering at the band edges. Inline circles (not <DotField/>) so the
          backdrop shares the parent SVG's coordinate space. */}
      {(() => {
        const bandHRound = Math.max(1, Math.round(bandH));
        const points = poissonDisc({ width, height: bandHRound, radius: 4, seed });
        const rng = mulberry32(seed + 1);
        return points.map((p, i) => {
          // Crest at vertical centre of band, fade to edges.
          const t = (p.y - bandHRound / 2) / (bandHRound / 2);
          const keep = Math.max(0, 1 - t * t);
          if (rng() > keep * 0.55) return null;
          return (
            <circle
              key={`bg-${i}`}
              cx={p.x}
              cy={yNormalTop + p.y}
              r={0.7}
              fill="var(--color-text)"
              opacity={0.35}
            />
          );
        });
      })()}

      {/* Hairline at the top and bottom of the normal band — quiet. */}
      <line
        x1={0}
        x2={width}
        y1={yNormalTop}
        y2={yNormalTop}
        stroke="var(--color-border-strong)"
        strokeWidth="0.4"
        strokeDasharray="1 2"
      />
      <line
        x1={0}
        x2={width}
        y1={yNormalBot}
        y2={yNormalBot}
        stroke="var(--color-border-strong)"
        strokeWidth="0.4"
        strokeDasharray="1 2"
      />

      {/* Sample dots. */}
      {samples.map((v, i) => {
        const inRange = v >= normal[0] && v <= normal[1];
        const isLast = i === lastIdx;
        return (
          <circle
            key={i}
            cx={xOf(i)}
            cy={yOf(v)}
            r={isLast ? 1.6 : 1.2}
            fill={inRange ? "var(--color-text)" : "var(--color-accent)"}
            opacity={isLast ? 1 : 0.78}
          />
        );
      })}

      {/* Live ring around the most recent sample. Federal Blue,
          stippled — same vocabulary as a focus halo. */}
      <g transform={`translate(${xOf(lastIdx)} ${yOf(last)})`}>
        <RingDots radius={4} dots={10} />
      </g>
    </svg>
  );
}

function RingDots({ radius, dots }: { radius: number; dots: number }) {
  const out: React.ReactElement[] = [];
  for (let i = 0; i < dots; i++) {
    const a = (i / dots) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    out.push(
      <circle key={i} cx={x} cy={y} r={0.55} fill="var(--color-accent-2)" />,
    );
  }
  return <>{out}</>;
}
