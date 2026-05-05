"use client";

import { useEffect, useRef, useState } from "react";
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
 * Motion (interactivity pass, 2026-05-04):
 *  - LivePulse uses the calibrated `live-pulse` keyframes (0.45 → 1 → 0.45
 *    over 2000ms ease-in-out), not Tailwind's animate-pulse which dips
 *    below baseline.
 *  - On first viewport entry, each Trace's polyline draws in via
 *    stroke-dashoffset over 320ms paper-ease; the terminal Federal Blue
 *    dot fades opacity 0→1 over 120ms after the line completes.
 *    Strips stagger 30ms in order; threshold rules stay static (reference,
 *    not data). Fires once per session via IntersectionObserver.
 *
 * Client component — needs IntersectionObserver to gate the in-view draw.
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

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export default function MetricsStream() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    const node = rootRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !firedRef.current) {
            firedRef.current = true;
            setInView(true);
            obs.disconnect();
            return;
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]"
    >
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
          {METRICS.map((m, i) => (
            <Strip key={m.label} m={m} inView={inView} stripIndex={i} />
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

function Strip({
  m,
  inView,
  stripIndex,
}: {
  m: Metric;
  inView: boolean;
  stripIndex: number;
}) {
  const yMin = Math.min(...m.series.map((p) => p.y), m.target ?? Infinity);
  const yMax = Math.max(...m.series.map((p) => p.y), m.target ?? -Infinity);
  const pad = (yMax - yMin) * 0.18 || 1;

  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Stagger 30ms across strips, then trigger the dashoffset → 0 transition.
  // After the 320ms draw, fade the terminal dot from opacity 0 → 1 over
  // 120ms. The dot is the only <circle> Trace renders for this strip;
  // we hide it from the start by setting opacity:0 inline, then transition
  // it in once the line finishes drawing.
  useEffect(() => {
    if (!inView) return;
    const node = wrapRef.current;
    if (!node) return;

    // Trace renders threshold rules (<line>), the trend (<path fill="none">),
    // and dot marks (<circle>). We grab the path for the dashoffset draw and
    // any circles for the post-draw fade-in.
    const path = node.querySelector<SVGPathElement>("path[fill='none']");
    const circles = Array.from(node.querySelectorAll<SVGCircleElement>("circle"));
    if (!path) return;

    const len = (() => {
      try {
        return path.getTotalLength();
      } catch {
        return 0;
      }
    })();

    // Hide the terminal dot up front; fade it in after the line completes.
    for (const c of circles) {
      c.style.opacity = "0";
    }

    if (len <= 0) {
      // Nothing to animate — fade the dot in immediately so we never end in
      // a hidden state.
      for (const c of circles) {
        c.style.transition = "opacity 120ms ease-out";
        c.style.opacity = "1";
      }
      return;
    }

    path.style.transition = "none";
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    // Force a reflow so the next style change kicks the transition.
    void path.getBoundingClientRect();

    const startDelay = stripIndex * 30;
    const t1 = window.setTimeout(() => {
      path.style.transition = `stroke-dashoffset 320ms ${PAPER_EASE}`;
      path.style.strokeDashoffset = "0";
    }, startDelay);
    const t2 = window.setTimeout(() => {
      for (const c of circles) {
        c.style.transition = "opacity 120ms ease-out";
        c.style.opacity = "1";
      }
    }, startDelay + 320);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [inView, stripIndex]);

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

      {/* Trace — fills its cell, height bumped to 76 so it fills taller strips.
          Wrapped in a ref'd div so we can find the underlying <path> and
          run the stroke-dashoffset draw on first viewport entry. The
          terminal dot is rendered as a sibling SVG overlay so we can fade
          it in independently after the line completes (Trace's built-in
          `dots` would render at full opacity from the start). */}
      <div ref={wrapRef} className="relative min-w-0">
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

/** Tiny pulsing live dot — uses the calibrated `live-pulse` keyframes
 *  (0.45 → 1 → 0.45, 2000ms ease-in-out) defined in globals.css. Tailwind's
 *  `animate-pulse` is the wrong envelope for this — it dips below baseline. */
function LivePulse() {
  return (
    <span
      aria-hidden
      className="animate-live-pulse mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-[var(--color-accent-2)]"
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
