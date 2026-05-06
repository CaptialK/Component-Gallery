import { mulberry32 } from "@/components/_kit/dot-noise";
import { Trace, type TraceDot } from "@/components/_kit/trace";
import { AbnormalFlag, type AbnormalSeverity } from "@/components/_kit/abnormal-flag";

/**
 * Vitals monitor — bedside dashboard showing the five core physiological
 * measurements (HR, BP, SpO₂, RR, Temp) with their last-60-minute trend.
 *
 * Refactored 2026-05-05 (Builder C, medical standard pass): the global
 * "Sampled q1m · 14:08:12" misleads when sensors age unevenly. Per-metric
 * timestamps adjacent to each value go persimmon past the q1m cadence.
 * Abnormal values now carry an <AbnormalFlag> adjacent to the numeral —
 * icon + letter + colour, never colour alone. Empty + partial states are
 * spelled out ("not monitored", "due 14:30", "—" diastolic) so a missing
 * vital cannot read as a normal vital.
 *
 *  - The trend is a smooth `<Trace />` polyline. Walnut ink for the line.
 *  - The normal envelope is a translucent fill band between the bound
 *    threshold rules (dashed hairlines at `normal[0]` and `normal[1]`).
 *  - Dots only mark *moments* — out-of-range samples (persimmon) and the
 *    live read (Federal Blue, slightly larger). Cleveland-McGill: lines for
 *    trend, dots for marks.
 *
 * Pure server component. Realistic but mock data; no PHI.
 */

type Severity = "normal" | "marginal" | "alert";

/**
 * Card status:
 *  - "live"        a current value is being captured at the q1m cadence
 *  - "stale"       last capture is past the cadence — value is the prior read
 *  - "due"         vital ordered q4h, no capture this cycle, awaiting nurse
 *  - "not-monitored"  this sensor is intentionally not on the patient's monitor
 *  - "sensor-lost" the sensor reported disconnect; sparkline is blanked
 */
type CardStatus = "live" | "stale" | "due" | "not-monitored" | "sensor-lost";

type Metric = {
  key: string;
  label: string;
  unit: string;
  /** Realistic range used for vertical scaling of the trend. */
  scale: [number, number];
  /** Clinical normal band, rendered as the envelope fill + thresholds. */
  normal: [number, number];
  /** Current displayed value. */
  current: number | { sys: number; dia: number | null };
  format: (v: number | { sys: number; dia: number | null }) => string;
  /** 60 samples — most recent last. */
  trend: number[];
  /** Severity drives the abnormal-flag adjacent to the value. */
  severity: Severity;
  /** Per-metric capture status. */
  status: CardStatus;
  /** ISO-ish wall-clock for the last capture (human-readable for the plate). */
  lastCapturedAt: string;
  /** Minutes since capture, used for stale-state colouring. */
  lastCapturedAgeMin: number;
  /** Optional next-due time (only used when status === "due"). */
  dueAt?: string;
  /** Optional flag direction ("high" / "low") used by abnormal flag. */
  flagDir?: "high" | "low";
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
    status: "live",
    lastCapturedAt: "14:08",
    lastCapturedAgeMin: 0,
  },
  {
    key: "bp",
    label: "BP",
    unit: "mmHg",
    // Diastolic deliberately null this cycle — cuff fail. Renders 124/—.
    scale: [50, 180],
    normal: [80, 130],
    current: { sys: 124, dia: null },
    format: (v) => {
      const x = v as { sys: number; dia: number | null };
      return `${x.sys}/${x.dia ?? "—"}`;
    },
    trend: trendAround(124, 1.6, 4, 22),
    severity: "normal",
    status: "live",
    lastCapturedAt: "14:08",
    lastCapturedAgeMin: 0,
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
    status: "live",
    lastCapturedAt: "14:07",
    lastCapturedAgeMin: 1,
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
    flagDir: "high",
    status: "live",
    lastCapturedAt: "14:08",
    lastCapturedAgeMin: 0,
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
    flagDir: "high",
    // Temp is checked q4h on this unit. Last capture is 47m old — meaningfully
    // stale relative to the q1m cadence the rest of the dashboard runs at.
    status: "stale",
    lastCapturedAt: "13:21",
    lastCapturedAgeMin: 47,
  },
];

/** Map severity + direction → AbnormalSeverity for the flag primitive. */
function flagSeverityOf(m: Metric): AbnormalSeverity | null {
  if (m.severity === "normal") return null;
  if (m.severity === "alert") {
    return m.flagDir === "low" ? "critical-low" : "critical-high";
  }
  return m.flagDir === "low" ? "low" : "high";
}

export default function VitalsMonitor() {
  // The dashboard runs on a q1m cadence; anything older than 1m on a metric
  // tagged "live" is meaningfully behind. Per-metric stale rendering uses a
  // 1m threshold; the global header just records the wall clock.
  const liveCount = METRICS.filter((m) => m.status === "live").length;
  const staleCount = METRICS.filter(
    (m) => m.status === "stale" || m.status === "due",
  ).length;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header band — patient context + cadence. MRN added for safety. */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Bedside vitals · Patel, R. · MRN 7741286 · Med-Surg 412-B
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
              Cadence q1m · units locked °C
            </div>
            <div className="mt-1 font-mono text-[11px] tabular-nums text-[var(--color-text)]">
              {liveCount} live · {staleCount} stale · 14:08:12
            </div>
          </div>
        </div>

        {/* Five metric cards. */}
        <div className="grid flex-1 grid-cols-5 divide-x divide-[var(--color-border)]">
          {METRICS.map((m) => (
            <MetricCard key={m.key} metric={m} />
          ))}
        </div>

        {/* Foot caption — the system's tell, updated for the dot+line vocabulary. */}
        <p
          className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-2 text-center text-[11px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Each line is sixty minutes of trend. The faint band marks the patient's
          normal envelope; persimmon dots mark out-of-range moments. The Federal
          Blue dot is the live read. Per-metric stamps tint persimmon past the
          q1m cadence.
        </p>
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const isUnmonitored =
    metric.status === "not-monitored" ||
    metric.status === "due" ||
    metric.status === "sensor-lost";

  const flagSeverity = flagSeverityOf(metric);

  return (
    <div className="flex min-w-0 flex-col gap-3 px-4 py-4">
      {/* Eyebrow: label · reference range (with units adjacent). */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)]">
          {metric.label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {metric.normal[0]}–{metric.normal[1]} {metric.unit}
        </span>
      </div>

      {/* Body — value + flag, or empty/pending/error vocabulary. */}
      {isUnmonitored ? (
        <UnmonitoredBody metric={metric} />
      ) : (
        <LiveBody metric={metric} flagSeverity={flagSeverity} />
      )}

      {/* Per-metric capture stamp — the load-bearing add. Persimmon past q1m. */}
      {!isUnmonitored && (
        <CaptureStamp metric={metric} />
      )}

      {/* Sparkline (or its empty/error stand-in). */}
      {metric.status === "live" || metric.status === "stale" ? (
        <Sparkline
          width={148}
          height={52}
          scale={metric.scale}
          normal={metric.normal}
          samples={metric.trend}
          ariaLabel={buildSparklineAria(metric)}
        />
      ) : (
        <UnmonitoredSparkline status={metric.status} />
      )}
    </div>
  );
}

function LiveBody({
  metric,
  flagSeverity,
}: {
  metric: Metric;
  flagSeverity: AbnormalSeverity | null;
}) {
  const isBp = metric.key === "bp";
  const valuePx = isBp ? 26 : 34;
  // BP with null diastolic carries a "?" partial flag — sys captured, dia missed.
  const bpPartial =
    isBp &&
    typeof metric.current === "object" &&
    metric.current !== null &&
    "dia" in metric.current &&
    metric.current.dia === null;

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-1.5">
        {flagSeverity && (
          <AbnormalFlag
            severity={flagSeverity}
            reason={`${metric.label} ${metric.format(metric.current)} ${metric.unit}`}
            size="sm"
          />
        )}
        <span
          className="font-mono leading-none tabular-nums"
          style={{
            fontSize: `${valuePx}px`,
            color: flagSeverity
              ? "var(--color-accent)"
              : "var(--color-text)",
            fontVariationSettings: '"wght" 500',
          }}
        >
          {metric.format(metric.current)}
        </span>
      </div>
      <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {metric.unit}
        {bpPartial && (
          <span className="ml-2 text-[var(--color-warning)]">
            · diastolic not captured
          </span>
        )}
      </span>
    </div>
  );
}

function UnmonitoredBody({ metric }: { metric: Metric }) {
  if (metric.status === "not-monitored") {
    return (
      <div className="flex flex-col">
        <span className="font-mono text-[26px] leading-none text-[var(--color-text-muted)]">
          —
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          not monitored
        </span>
      </div>
    );
  }
  if (metric.status === "due") {
    return (
      <div className="flex flex-col">
        <span className="font-mono text-[26px] leading-none text-[var(--color-text-muted)]">
          —
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-warning)]">
          due {metric.dueAt ?? "—"}
        </span>
      </div>
    );
  }
  // sensor-lost
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[26px] leading-none text-[var(--color-accent)]">
        —
      </span>
      <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
        sensor lost
      </span>
    </div>
  );
}

/**
 * Per-metric capture stamp.
 *
 * Live (≤ 1m): walnut "live · 14:08".
 * Stale (> 1m): persimmon dot + "47m old · 13:21".
 *
 * Replaces the previous global "Sampled q1m" stamp — when one sensor is fresh
 * and another is 47m stale the global timestamp lies. Per-metric is the fix.
 */
function CaptureStamp({ metric }: { metric: Metric }) {
  const isStale = metric.lastCapturedAgeMin > 1 || metric.status === "stale";
  return (
    <div
      className="flex items-baseline gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] tabular-nums"
      style={{
        color: isStale ? "var(--color-accent)" : "var(--color-text-muted)",
      }}
      role="status"
      aria-label={
        isStale
          ? `Last captured ${metric.lastCapturedAgeMin} minutes ago at ${metric.lastCapturedAt}`
          : `Captured ${metric.lastCapturedAt}, live`
      }
    >
      {isStale && (
        <span
          aria-hidden
          className="inline-block h-1 w-1 translate-y-[-1px] rounded-full bg-[var(--color-accent)]"
        />
      )}
      <span>
        {isStale
          ? `${metric.lastCapturedAgeMin}m old`
          : "live"}
      </span>
      <span className="opacity-70">·</span>
      <span>{metric.lastCapturedAt}</span>
    </div>
  );
}

function UnmonitoredSparkline({ status }: { status: CardStatus }) {
  const label =
    status === "not-monitored"
      ? "not on monitor"
      : status === "due"
        ? "awaiting capture"
        : "sensor disconnected";
  const ink =
    status === "sensor-lost"
      ? "var(--color-accent)"
      : "var(--color-text-muted)";
  return (
    <div
      className="flex h-[52px] w-full items-center justify-center rounded-[var(--radius-xs)] border border-dashed border-[var(--color-border)] px-2 text-center"
      role="img"
      aria-label={label}
    >
      <span
        className="font-mono text-[9px] uppercase tracking-[0.18em]"
        style={{ color: ink }}
      >
        {label}
      </span>
    </div>
  );
}

function buildSparklineAria(m: Metric): string {
  const last = m.trend[m.trend.length - 1];
  const oor = m.trend.filter((v) => v < m.normal[0] || v > m.normal[1]).length;
  const sevWord =
    m.severity === "alert"
      ? `critically ${m.flagDir ?? "abnormal"}`
      : m.severity === "marginal"
        ? `marginally ${m.flagDir ?? "abnormal"}`
        : "in range";
  return `${m.label} trend, last 60 minutes, currently ${last.toFixed(1)} ${m.unit}, ${sevWord}. ${oor} out-of-range samples in window.`;
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
  ariaLabel,
}: {
  width: number;
  height: number;
  scale: [number, number];
  normal: [number, number];
  samples: number[];
  ariaLabel: string;
}) {
  const lastIdx = samples.length - 1;
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
      ariaLabel={ariaLabel}
      className="block w-full"
      margin={3}
    />
  );
}
