"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry32 } from "@/components/_kit/dot-noise";
import { Trace, type TracePoint } from "@/components/_kit/trace";
import { Menu, type MenuItem } from "@/components/_kit/menu";
import { Modal } from "@/components/_kit/modal";

/**
 * Metrics stream — same KPIs as `metrics-overview`, different rhythm.
 *
 * Deep-wire pass (2026-05-04):
 *  - Header → workspace switcher: Menu drives a workspace seed bag, reseeding
 *    METRICS and replaying the in-view draw.
 *  - Live tick: setInterval(2000) increments a tick counter; the trailing
 *    Federal Blue dot rises 1px and falls back over 200ms ease-out
 *    (transform only). Pause-on-hover via paused ref on the strips wrapper.
 *  - Threshold drag: dashed target line is grabbable; drag-Y translates the
 *    target value, snapped to 0.1 increments on release. Right cell re-
 *    renders formatTarget.
 *  - Click strip → fullscreen Modal with Trace at width 1100, height 320.
 *  - Scrubber: pointer-down + drag along trace area sets scrub position;
 *    Federal Blue hairline traces cursor; right cell shows historic value.
 *
 * Client component — local state for tick / scrub / target / workspace / modal.
 */

type Metric = {
  label: string;
  value: string;
  delta: number;
  goodSign?: 1 | -1;
  series: TracePoint[];
  /** Optional horizontal target line, rendered as a dashed Trace threshold. */
  target?: number;
  /** Format function: turns a y-value into the value display string. */
  format: (y: number) => string;
  /** Format function: turns a target y-value into the target display string. */
  formatTarget: (y: number) => string;
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

type WorkspaceId = "stipple-press" | "atlas-billing" | "north-warehouse";

const WORKSPACES: Record<WorkspaceId, { label: string; seedBase: number }> = {
  "stipple-press": { label: "stipple-press", seedBase: 0 },
  "atlas-billing": { label: "atlas-billing", seedBase: 200 },
  "north-warehouse": { label: "north-warehouse", seedBase: 400 },
};

function buildMetrics(seedBase: number): Metric[] {
  return [
    {
      label: "Monthly active users",
      value: "47.2K",
      delta: 12.4,
      series: series(seedBase + 11, 30, 38, 0.32, 1.4),
      target: 45,
      format: (y) => `${y.toFixed(1)}K`,
      formatTarget: (y) => `${y.toFixed(1)}K`,
    },
    {
      label: "Revenue",
      value: "$128.4K",
      delta: 8.1,
      series: series(seedBase + 31, 30, 110, 0.6, 2.6),
      target: 125,
      format: (y) => `$${y.toFixed(1)}K`,
      formatTarget: (y) => `$${y.toFixed(1)}K`,
    },
    {
      label: "Avg. session",
      value: "8m 42s",
      delta: 3.2,
      series: series(seedBase + 53, 30, 7.4, 0.04, 0.55),
      target: 8,
      format: (y) => `${Math.floor(y)}m ${Math.round((y - Math.floor(y)) * 60)}s`,
      formatTarget: (y) => `${y.toFixed(1)}m`,
    },
    {
      label: "Churn",
      value: "2.3%",
      delta: -0.5,
      goodSign: -1,
      series: series(seedBase + 71, 30, 3.1, -0.025, 0.18),
      target: 3,
      format: (y) => `${y.toFixed(1)}%`,
      formatTarget: (y) => `${y.toFixed(1)}%`,
    },
  ];
}

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export default function MetricsStream() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const firedRef = useRef(false);

  const [workspace, setWorkspace] = useState<WorkspaceId>("stipple-press");
  const baseMetrics = useMemo(
    () => buildMetrics(WORKSPACES[workspace].seedBase),
    [workspace],
  );

  // Per-strip target overrides (so drag-to-set persists per metric).
  const [targets, setTargets] = useState<Record<string, number>>({});
  const metrics: Metric[] = baseMetrics.map((m) => ({
    ...m,
    target: targets[m.label] !== undefined ? targets[m.label] : m.target,
  }));

  // Live tick — every 2s, increment counter. Drives the dot's 1px rise.
  const [tick, setTick] = useState(0);
  const pausedRef = useRef(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!pausedRef.current) setTick((t) => t + 1);
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
  const refreshedAt = useMemo(() => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, [tick]);

  // Modal state for fullscreen view.
  const [expanded, setExpanded] = useState<Metric | null>(null);

  // In-view trigger for Trace draw — re-fires when workspace changes.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    setInView(false);
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

  // Workspace switch: replay the draw.
  useEffect(() => {
    firedRef.current = false;
    setInView(false);
    const id = window.setTimeout(() => {
      firedRef.current = true;
      setInView(true);
    }, 60);
    return () => window.clearTimeout(id);
  }, [workspace]);

  const workspaceMenu: MenuItem[] = (Object.keys(WORKSPACES) as WorkspaceId[]).map((id) => ({
    label: WORKSPACES[id].label,
    onSelect: () => setWorkspace(id),
    glyph: id === workspace ? <span aria-hidden>·</span> : undefined,
  }));

  return (
    <div
      ref={rootRef}
      className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div>
            <Menu
              trigger={
                <button
                  type="button"
                  className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Stream · {WORKSPACES[workspace].label}
                  <span aria-hidden className="ml-1 inline-block">▾</span>
                </button>
              }
              items={workspaceMenu}
              placement="bottom-start"
              ariaLabel="Switch workspace"
            />
            <h2
              className="mt-1 font-display text-[20px] italic leading-none text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              Apr 1 — Apr 30, 2026
            </h2>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <LivePulse />
            live · refreshed {refreshedAt}
          </div>
        </div>

        {/* Strips. */}
        <ul className="flex min-h-0 flex-1 flex-col divide-y divide-[var(--color-border)]">
          {metrics.map((m, i) => (
            <Strip
              key={`${workspace}-${m.label}`}
              m={m}
              inView={inView}
              stripIndex={i}
              tick={tick}
              onTargetChange={(y) =>
                setTargets((prev) => ({
                  ...prev,
                  [m.label]: Math.round(y * 10) / 10,
                }))
              }
              onExpand={() => setExpanded(m)}
            />
          ))}
        </ul>

        <p
          className="border-t border-[var(--color-border)] px-6 py-2 text-center text-[11px] italic text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Each strip runs a 30-day Trace; drag the dashed walnut rule to set a
          target, drag along the trace to scrub, click to expand.
        </p>
      </div>

      {/* Fullscreen modal — recomposes Trace at large size. */}
      <Modal
        open={expanded !== null}
        onOpenChange={(next) => {
          if (!next) setExpanded(null);
        }}
        placement="center"
        size="lg"
        ariaLabel={expanded ? `${expanded.label} — fullscreen` : "Metric detail"}
      >
        {expanded && <ExpandedMetric m={expanded} />}
      </Modal>
    </div>
  );
}

function Strip({
  m,
  inView,
  stripIndex,
  tick,
  onTargetChange,
  onExpand,
}: {
  m: Metric;
  inView: boolean;
  stripIndex: number;
  tick: number;
  onTargetChange: (y: number) => void;
  onExpand: () => void;
}) {
  const yMin = Math.min(...m.series.map((p) => p.y), m.target ?? Infinity);
  const yMax = Math.max(...m.series.map((p) => p.y), m.target ?? -Infinity);
  const pad = (yMax - yMin) * 0.18 || 1;
  const yDomain: [number, number] = [yMin - pad, yMax + pad];

  const wrapRef = useRef<HTMLDivElement | null>(null);

  // First-time stroke-dashoffset draw on viewport entry.
  useEffect(() => {
    if (!inView) return;
    const node = wrapRef.current;
    if (!node) return;

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

    for (const c of circles) {
      c.style.opacity = "0";
    }

    if (len <= 0) {
      for (const c of circles) {
        c.style.transition = "opacity 120ms ease-out";
        c.style.opacity = "1";
      }
      return;
    }

    path.style.transition = "none";
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
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

  // Live tick — bump terminal dot 1px up then back over 200ms ease-out.
  useEffect(() => {
    if (!inView) return;
    const node = wrapRef.current;
    if (!node) return;
    const dot = node.querySelector<SVGCircleElement>("circle");
    if (!dot) return;
    dot.style.transition = "transform 100ms ease-out";
    dot.style.transform = "translateY(-1px)";
    const t = window.setTimeout(() => {
      dot.style.transition = "transform 100ms ease-in";
      dot.style.transform = "translateY(0)";
    }, 100);
    return () => window.clearTimeout(t);
  }, [tick, inView]);

  // Scrubber state — drag-along-trace.
  const [scrubDay, setScrubDay] = useState<number | null>(null);
  // Drag-target-line state — translate the dashed threshold.
  const [draggingTarget, setDraggingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState<number | null>(null);

  // Trace SVG geometry, used for both scrub and target-drag math.
  const TRACE_W = 520;
  const TRACE_H = 76;
  const margin = 1;
  const innerW = TRACE_W - margin * 2;
  const innerH = TRACE_H - margin * 2;

  // Convert clientY → data-space y given the SVG element's screen CTM.
  const yFromClientY = (svg: SVGSVGElement, clientY: number): number => {
    const pt = svg.createSVGPoint();
    pt.x = 0;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return yDomain[0];
    const local = pt.matrixTransform(ctm.inverse());
    const yLocal = local.y;
    const t = (yLocal - margin) / innerH;
    // Y inverts (SVG +y goes down).
    return yDomain[1] - t * (yDomain[1] - yDomain[0]);
  };
  const xToDay = (svg: SVGSVGElement, clientX: number): number => {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = 0;
    const ctm = svg.getScreenCTM();
    if (!ctm) return 0;
    const local = pt.matrixTransform(ctm.inverse());
    const xLocal = local.x;
    const t = (xLocal - margin) / innerW;
    return Math.max(0, Math.min(m.series.length - 1, Math.round(t * (m.series.length - 1))));
  };

  // Pointer handlers on the trace cell.
  const traceCellRef = useRef<HTMLDivElement | null>(null);
  const onTracePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const svg = traceCellRef.current?.querySelector("svg");
    if (!svg) return;
    // Decide: clicking close to the threshold line starts target-drag;
    // anywhere else starts scrub.
    const yData = yFromClientY(svg as SVGSVGElement, e.clientY);
    const target = m.target ?? yDomain[0];
    const yPxPerData = innerH / (yDomain[1] - yDomain[0]);
    const distPx = Math.abs(yData - target) * yPxPerData;
    if (distPx < 6 && m.target !== undefined) {
      setDraggingTarget(true);
      setTempTarget(target);
    } else {
      const day = xToDay(svg as SVGSVGElement, e.clientX);
      setScrubDay(day);
    }
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onTracePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const svg = traceCellRef.current?.querySelector("svg");
    if (!svg) return;
    if (draggingTarget) {
      const y = yFromClientY(svg as SVGSVGElement, e.clientY);
      // clamp to domain.
      const clamped = Math.max(yDomain[0], Math.min(yDomain[1], y));
      setTempTarget(clamped);
    } else if (scrubDay != null) {
      const day = xToDay(svg as SVGSVGElement, e.clientX);
      setScrubDay(day);
    }
  };
  const onTracePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTarget) {
      if (tempTarget != null) onTargetChange(tempTarget);
      setDraggingTarget(false);
      setTempTarget(null);
    }
    setScrubDay(null);
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* swallow */
    }
  };

  const displayedTarget =
    draggingTarget && tempTarget != null ? tempTarget : m.target;
  const scrubValue = scrubDay != null ? m.series[scrubDay].y : null;
  const valueText = scrubValue != null ? m.format(scrubValue) : m.value;

  // Scrub-line geometry (data → SVG x).
  const scrubX = scrubDay != null
    ? margin + (scrubDay / (m.series.length - 1)) * innerW
    : null;

  return (
    <li className="grid flex-1 grid-cols-[180px_1fr_140px] items-center gap-4 px-6 py-4">
      {/* Label + target */}
      <div className="leading-tight">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text)]">
          {m.label}
        </div>
        {displayedTarget !== undefined && (
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            target ·{" "}
            <span className="text-[var(--color-text)]">{m.formatTarget(displayedTarget)}</span>
          </div>
        )}
      </div>

      {/* Trace cell — wraps Trace, scrub overlay, target-drag pill. */}
      <div
        ref={traceCellRef}
        className="relative min-w-0"
        onPointerDown={onTracePointerDown}
        onPointerMove={onTracePointerMove}
        onPointerUp={onTracePointerUp}
        onClick={(e) => {
          // Treat a quick click as expand. We treat true drags as not-expand
          // by checking whether the user actually scrubbed/dragged.
          if (scrubDay == null && !draggingTarget) onExpand();
        }}
        style={{ touchAction: "none", cursor: "crosshair" }}
      >
        <div ref={wrapRef}>
          <Trace
            data={m.series}
            width={TRACE_W}
            height={TRACE_H}
            yDomain={yDomain}
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
              displayedTarget !== undefined
                ? [{ y: displayedTarget, dashed: true, color: "var(--color-border-strong)" }]
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

        {/* Scrub line overlay — opacity transition only; positioned via CSS
            left percentage so it follows the pointer without re-rendering
            SVG geometry. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0"
          style={{
            left: scrubX != null ? `${(scrubX / TRACE_W) * 100}%` : 0,
            width: 1,
            background: "var(--color-accent-2)",
            opacity: scrubX != null ? 0.85 : 0,
            transition: "opacity 120ms ease-out",
          }}
        />

        {/* Target-drag pill — appears mid-drag, fades out on release. */}
        {draggingTarget && tempTarget != null && (
          <div
            aria-hidden
            className="pointer-events-none absolute -translate-y-1/2 rounded-[var(--radius-xs)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text)]"
            style={{
              right: 8,
              top: `${
                margin +
                (1 - (tempTarget - yDomain[0]) / (yDomain[1] - yDomain[0])) * innerH
              }px`,
              transition: "opacity 120ms ease-out",
            }}
          >
            target · {m.formatTarget(tempTarget)}
          </div>
        )}
      </div>

      {/* Value + delta */}
      <div className="flex flex-col items-end">
        <span
          className="font-display text-[26px] leading-none italic tracking-[-0.02em] text-[var(--color-text)]"
          style={{
            fontVariationSettings: '"opsz" 36, "SOFT" 30',
            color: scrubValue != null ? "var(--color-accent-2)" : undefined,
          }}
        >
          {valueText}
        </span>
        <Delta value={m.delta} goodSign={m.goodSign ?? 1} />
      </div>
    </li>
  );
}

function ExpandedMetric({ m }: { m: Metric }) {
  const yMin = Math.min(...m.series.map((p) => p.y), m.target ?? Infinity);
  const yMax = Math.max(...m.series.map((p) => p.y), m.target ?? -Infinity);
  const pad = (yMax - yMin) * 0.18 || 1;
  return (
    <div className="px-6 py-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
        {m.label}
      </div>
      <div
        className="mt-1 font-display text-[36px] italic leading-none text-[var(--color-text)]"
        style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30' }}
      >
        {m.value}
      </div>
      <div className="mt-3">
        <Trace
          data={m.series}
          width={1100}
          height={320}
          yDomain={[yMin - pad, yMax + pad]}
          smooth
          strokeColor="var(--color-text)"
          strokeWidth={1.4}
          fill={{
            kind: "envelope",
            lower: yMin,
            upper: yMax,
            color: "color-mix(in oklch, var(--color-text-muted) 7%, transparent)",
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
              radius: 3,
            },
          ]}
          className="block w-full"
          ariaLabel={`${m.label} expanded trend`}
        />
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <span>day 1</span>
          <span>day 30</span>
        </div>
      </div>
      <ul className="mt-6 grid grid-cols-3 gap-3 text-xs text-[var(--color-text-muted)]">
        <li>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em]">Min</div>
          <div className="mt-0.5 text-[var(--color-text)]">{m.format(yMin)}</div>
        </li>
        <li>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em]">Max</div>
          <div className="mt-0.5 text-[var(--color-text)]">{m.format(yMax)}</div>
        </li>
        {m.target !== undefined && (
          <li>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em]">Target</div>
            <div className="mt-0.5 text-[var(--color-text)]">{m.formatTarget(m.target)}</div>
          </li>
        )}
      </ul>
    </div>
  );
}

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
