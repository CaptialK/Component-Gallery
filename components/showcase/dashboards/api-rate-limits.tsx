"use client";

/**
 * Registry entry (proposed — orchestrator will lift this):
 *
 *   {
 *     domain: "saas",
 *     category: "dashboards",
 *     slug: "api-rate-limits",
 *     title: "API rate limits",
 *     filename: "api-rate-limits.tsx",
 *     description: "Per-endpoint observability surface — quota gauge, per-second histogram, p95 latency, status chip. Row hover surfaces an accent strip; status chip toggles throttled state.",
 *     layout: "specimen",
 *     aspectRatio: "16 / 10",
 *     maxWidth: 880,
 *     firstImpression: "2026-05-05",
 *     load: () => import("@/components/showcase/dashboards/api-rate-limits"),
 *   }
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry32 } from "@/components/_kit/dot-noise";
import { cn } from "@/lib/cn";

type Method = "GET" | "POST" | "PUT" | "DELETE";
type RowStatus = "ok" | "throttled" | "error";

type Endpoint = {
  id: string;
  route: string;
  method: Method;
  quotaUsed: number;
  quotaCeiling: number;
  histogramSeed: number;
  /** Mark indices in the 12-bar histogram that are 429 spikes. */
  throttleAt: number[];
  p95: number;
  status: RowStatus;
};

const ENDPOINTS: Endpoint[] = [
  {
    id: "1",
    route: "/v2/users/:id",
    method: "GET",
    quotaUsed: 7820,
    quotaCeiling: 10_000,
    histogramSeed: 11,
    throttleAt: [],
    p95: 38,
    status: "ok",
  },
  {
    id: "2",
    route: "/v2/orders",
    method: "POST",
    quotaUsed: 4_212,
    quotaCeiling: 5000,
    histogramSeed: 23,
    throttleAt: [9, 11],
    p95: 142,
    status: "throttled",
  },
  {
    id: "3",
    route: "/v2/webhooks/dispatch",
    method: "POST",
    quotaUsed: 1_408,
    quotaCeiling: 2000,
    histogramSeed: 47,
    throttleAt: [],
    p95: 88,
    status: "ok",
  },
  {
    id: "4",
    route: "/v2/files/:id",
    method: "DELETE",
    quotaUsed: 245,
    quotaCeiling: 800,
    histogramSeed: 61,
    throttleAt: [],
    p95: 22,
    status: "ok",
  },
  {
    id: "5",
    route: "/v2/search",
    method: "GET",
    quotaUsed: 28_910,
    quotaCeiling: 30_000,
    histogramSeed: 7,
    throttleAt: [4, 7, 8, 11],
    p95: 612,
    status: "throttled",
  },
  {
    id: "6",
    route: "/v2/payments/:id",
    method: "PUT",
    quotaUsed: 612,
    quotaCeiling: 1500,
    histogramSeed: 88,
    throttleAt: [],
    p95: 71,
    status: "ok",
  },
  {
    id: "7",
    route: "/v2/exports",
    method: "POST",
    quotaUsed: 92,
    quotaCeiling: 200,
    histogramSeed: 102,
    throttleAt: [10],
    p95: 1_840,
    status: "error",
  },
  {
    id: "8",
    route: "/v2/sessions",
    method: "GET",
    quotaUsed: 12_044,
    quotaCeiling: 25_000,
    histogramSeed: 14,
    throttleAt: [],
    p95: 41,
    status: "ok",
  },
];

const METHOD_INK: Record<Method, string> = {
  GET: "var(--color-text)",
  POST: "var(--color-accent-2)",
  PUT: "var(--color-text-muted)",
  DELETE: "var(--color-accent)",
};

const STATUS_INK: Record<RowStatus, string> = {
  ok: "var(--color-text-muted)",
  throttled: "var(--color-accent)",
  error: "var(--color-accent)",
};

const STATUS_LABEL: Record<RowStatus, string> = {
  ok: "ok",
  throttled: "throttled",
  error: "error",
};

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

function makeHistogram(seed: number, throttleAt: number[]): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < 12; i++) {
    const base = 0.35 + rng() * 0.45;
    if (throttleAt.includes(i)) {
      out.push(Math.min(1, base + 0.25));
    } else {
      out.push(base);
    }
  }
  return out;
}

function fmtMs(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
  return `${n}ms`;
}

function compactNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function ApiRateLimits() {
  const [rows, setRows] = useState<Endpoint[]>(ENDPOINTS);
  const [focusIdx, setFocusIdx] = useState(0);
  const [throttleStamp, setThrottleStamp] = useState<Record<string, string>>(
    {},
  );

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(0, i - 1));
    }
  }

  function toggleStatus(id: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next: RowStatus = r.status === "throttled" ? "ok" : "throttled";
        return { ...r, status: next };
      }),
    );
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    if (r.status !== "throttled") {
      const now = new Date();
      const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      setThrottleStamp((prev) => ({ ...prev, [id]: stamp }));
    } else {
      setThrottleStamp((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <div
      className="flex h-full w-full flex-col bg-[var(--color-bg)] text-[var(--color-text)]"
      onKeyDown={handleKey}
      tabIndex={-1}
    >
      {/* Plate brand mark */}
      <div className="shrink-0 px-6 pt-4">
        <h1
          className="font-display text-[28px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          API rate limits.
        </h1>
      </div>

      {/* Running head */}
      <div className="mt-3 flex shrink-0 items-baseline justify-between border-y border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          API · per-endpoint · last 60s window
        </span>
        <span className="inline-flex items-center font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          <span
            aria-hidden
            className="animate-live-pulse mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-[var(--color-accent-2)]"
          />
          live · 8 routes
        </span>
      </div>

      <div className="shrink-0 px-6 pb-3 pt-3">
        <p className="max-w-[60ch] text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
          Quota usage per minute, per-second request volume, and p95 latency
          for every public route. Throttled rows surface a persimmon mark in
          the gutter.
        </p>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="border-t border-[var(--color-border-strong)]">
          <TableHead />
          <ul>
            {rows.map((r, i) => (
              <Row
                key={r.id}
                row={r}
                focused={i === focusIdx}
                throttleStamp={throttleStamp[r.id] ?? null}
                onFocus={() => setFocusIdx(i)}
                onToggleStatus={() => toggleStatus(r.id)}
              />
            ))}
          </ul>
        </div>

        <Legend />
      </div>
    </div>
  );
}

function TableHead() {
  return (
    <div className="grid grid-cols-[16px_1fr_48px_144px_144px_64px_96px] items-end gap-3 border-b border-[var(--color-border)] py-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
      <span />
      <span>Route</span>
      <span>Method</span>
      <span>Quota · per min</span>
      <span>Per second · 12s</span>
      <span className="text-right">p95</span>
      <span className="text-right">Status</span>
    </div>
  );
}

function Row({
  row,
  focused,
  throttleStamp,
  onFocus,
  onToggleStatus,
}: {
  row: Endpoint;
  focused: boolean;
  throttleStamp: string | null;
  onFocus: () => void;
  onToggleStatus: () => void;
}) {
  const histogram = useMemo(
    () => makeHistogram(row.histogramSeed, row.throttleAt),
    [row.histogramSeed, row.throttleAt],
  );
  const isThrottled = row.status === "throttled" || row.status === "error";

  return (
    <li
      className={cn(
        "group relative cursor-pointer border-b border-[var(--color-border)] last:border-b-0",
        "transition-[background-color] duration-[120ms] ease-out",
        "hover:bg-[var(--color-surface-2)]",
      )}
      onClick={onFocus}
      onFocus={onFocus}
    >
      {/* Left accent strip — visible on row hover OR keyboard focus */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-[var(--color-accent-2)]",
          "transition-opacity duration-[120ms] ease-out",
          focused ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      />
      <div
        className="grid w-full grid-cols-[16px_1fr_48px_144px_144px_64px_96px] items-center gap-3 py-2 text-left"
      >
        {/* Register-mark gutter */}
        <span className="flex h-3 items-center justify-center">
          {isThrottled && (
            <span
              aria-label="throttled marker"
              className="block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--color-accent)" }}
            />
          )}
        </span>

        {/* Route */}
        <span className="min-w-0 truncate font-mono text-[12px] text-[var(--color-text)]">
          {row.route}
        </span>

        {/* Method chip */}
        <MethodChip method={row.method} />

        {/* Quota gauge */}
        <QuotaGauge used={row.quotaUsed} ceiling={row.quotaCeiling} throttled={isThrottled} />

        {/* Histogram */}
        <Histogram bars={histogram} throttleAt={row.throttleAt} />

        {/* p95 */}
        <span className="text-right font-mono text-[11.5px] tabular-nums text-[var(--color-text)]">
          {fmtMs(row.p95)}
        </span>

        {/* Status chip — clickable */}
        <span className="text-right">
          <StatusChip
            status={row.status}
            onToggle={(e) => {
              e.stopPropagation();
              onToggleStatus();
            }}
          />
        </span>
      </div>

      {/* Throttled-at caption */}
      {throttleStamp && (
        <ThrottleCaption stamp={throttleStamp} />
      )}
    </li>
  );
}

function MethodChip({ method }: { method: Method }) {
  return (
    <span
      className="inline-flex h-5 items-center rounded-[var(--radius-xs)] border px-1.5 font-mono text-[10px] uppercase tracking-[0.06em]"
      style={{
        borderColor: METHOD_INK[method],
        color: METHOD_INK[method],
      }}
    >
      {method}
    </span>
  );
}

function QuotaGauge({
  used,
  ceiling,
  throttled,
}: {
  used: number;
  ceiling: number;
  throttled: boolean;
}) {
  const pct = Math.min(1, used / ceiling);
  const pctOver = pct >= 0.9;
  const fillColor = throttled
    ? "var(--color-accent)"
    : pctOver
      ? "var(--color-accent)"
      : "var(--color-text)";

  return (
    <span className="flex items-center gap-2">
      <span className="relative block h-1.5 w-24 overflow-visible rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <span
          className="block h-full rounded-[var(--radius-xs)]"
          style={{
            width: `${pct * 100}%`,
            background: fillColor,
            transition: `background-color 200ms ${PAPER_EASE}, width 200ms ${PAPER_EASE}`,
          }}
        />
        {/* Ceiling tick at 100% */}
        <span
          aria-hidden
          className="absolute right-0 top-1/2 h-2 w-px -translate-y-1/2"
          style={{
            background: "var(--color-border-strong)",
          }}
        />
      </span>
      <span className="font-mono text-[10px] tabular-nums text-[var(--color-text-muted)]">
        {compactNum(used)}/{compactNum(ceiling)}
      </span>
    </span>
  );
}

function Histogram({
  bars,
  throttleAt,
}: {
  bars: number[];
  throttleAt: number[];
}) {
  const W = 132;
  const H = 22;
  const N = bars.length;
  const gap = 1.5;
  const barW = (W - gap * (N - 1)) / N;
  const baseY = H - 1;

  // Single delegated tooltip per row: track which bar the cursor is over via
  // pointer-position math against the SVG bounding rect. One <rect> per bar
  // (no per-bar Popover portal); one absolutely positioned tooltip rendered
  // by this row when hoverBar !== null.
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverBar, setHoverBar] = useState<number | null>(null);

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xUser = ((e.clientX - rect.left) / rect.width) * W;
    // Map user-space x to a bar index. Each bar occupies (barW + gap).
    const slot = barW + gap;
    const idx = Math.floor(xUser / slot);
    if (idx < 0 || idx >= N) {
      setHoverBar(null);
      return;
    }
    setHoverBar(idx);
  }

  const activeBar = hoverBar != null ? bars[hoverBar] : null;
  const activeIsThrottle = hoverBar != null && throttleAt.includes(hoverBar);
  // Position the tooltip horizontally above the active bar's center as a
  // percentage of the SVG width.
  const tooltipLeftPct =
    hoverBar != null
      ? ((hoverBar * (barW + gap) + barW / 2) / W) * 100
      : 0;

  return (
    <span className="relative block">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        shapeRendering="geometricPrecision"
        aria-label="Per-second request count, last 12 seconds"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverBar(null)}
      >
        {bars.map((v, i) => {
          const isThrottle = throttleAt.includes(i);
          const h = Math.max(1, v * (H - 2));
          const x = i * (barW + gap);
          const y = baseY - h;
          const isActive = hoverBar === i;
          return (
            <rect
              key={i}
              data-bar-index={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={0}
              fill={isThrottle ? "var(--color-accent)" : "var(--color-text)"}
              style={{
                cursor: "pointer",
                opacity: isActive ? 1 : isThrottle ? 1 : 0.85,
                transition: `opacity 120ms ease-out`,
              }}
            />
          );
        })}
        {/* Baseline rule */}
        <line
          x1={0}
          x2={W}
          y1={baseY}
          y2={baseY}
          stroke="var(--color-border-strong)"
          strokeWidth={0.4}
        />
      </svg>
      {hoverBar != null && activeBar != null && (
        <span
          role="tooltip"
          aria-live="polite"
          className="pointer-events-none absolute bottom-full z-20 -translate-x-1/2 -translate-y-1.5 whitespace-nowrap rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5"
          style={{
            left: `${tooltipLeftPct}%`,
            boxShadow:
              "0 8px 24px -12px color-mix(in oklch, var(--color-text) 22%, transparent)",
          }}
        >
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            −{N - hoverBar}s
          </span>
          <span className="mt-0.5 block text-[12.5px] tabular-nums text-[var(--color-text)]">
            <span className="font-mono">{Math.round(activeBar * 240)}</span>{" "}
            <span className="text-[var(--color-text-muted)]">req</span>
            <span className="mx-1.5 text-[var(--color-border-strong)]">·</span>
            <span className="font-mono">{Math.round(20 + activeBar * 180)}ms</span>
          </span>
          {activeIsThrottle && (
            <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--color-accent)]">
              429 spike
            </span>
          )}
        </span>
      )}
    </span>
  );
}

function StatusGlyph({ status }: { status: RowStatus }) {
  // Glyph differentiation per fix #5:
  //   ok        — small filled circle
  //   throttled — ring (filled circle with knockout center)
  //   error     — filled diamond (rotated square)
  const ink = STATUS_INK[status];
  if (status === "error") {
    return (
      <span
        aria-hidden
        className="block h-1.5 w-1.5 rotate-45"
        style={{ background: ink }}
      />
    );
  }
  if (status === "throttled") {
    return (
      <span
        aria-hidden
        className="block h-1.5 w-1.5 rounded-full"
        style={{
          border: `1px solid ${ink}`,
          background: "var(--color-bg)",
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="block h-1 w-1 rounded-full"
      style={{ background: ink }}
    />
  );
}

function StatusChip({
  status,
  onToggle,
}: {
  status: RowStatus;
  onToggle: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-[var(--radius-xs)] border px-1.5 font-mono text-[10px] uppercase tracking-[0.08em]",
        "border-[var(--color-border)]",
        "transition-[color] duration-[200ms]",
      )}
      style={{
        color: STATUS_INK[status],
        transitionTimingFunction: PAPER_EASE,
      }}
      aria-label={`Toggle status (${STATUS_LABEL[status]})`}
    >
      <StatusGlyph status={status} />
      {STATUS_LABEL[status]}
    </button>
  );
}

function ThrottleCaption({ stamp }: { stamp: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div
      className="pl-8 pb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-accent)]"
      style={{
        opacity: shown ? 1 : 0,
        transition: `opacity 120ms ease-out`,
      }}
    >
      throttled at {stamp}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-4 grid grid-cols-[1fr_1fr_1fr] gap-3 border-t border-[var(--color-border)] py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
      <div>
        <div className="text-[9px] tracking-[0.18em]">Methods</div>
        <div className="mt-1 flex items-center gap-2">
          {(["GET", "POST", "PUT", "DELETE"] as Method[]).map((m) => (
            <span
              key={m}
              className="inline-flex h-4 items-center rounded-[var(--radius-xs)] border px-1 text-[9.5px]"
              style={{ color: METHOD_INK[m], borderColor: METHOD_INK[m] }}
            >
              {m}
            </span>
          ))}
        </div>
        <div className="mt-1.5 text-[8.5px] normal-case tracking-[0.08em] text-[var(--color-text-muted)]">
          GET reads · POST writes · PUT updates · DELETE removes
        </div>
      </div>
      <div>
        <div className="text-[9px] tracking-[0.18em]">Status</div>
        <div className="mt-1 flex items-center gap-3">
          {(["ok", "throttled", "error"] as RowStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <StatusGlyph status={s} />
              <span style={{ color: STATUS_INK[s] }}>{STATUS_LABEL[s]}</span>
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[9px] tracking-[0.18em]">Marks</div>
        <div className="mt-1 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--color-accent)" }}
            />
            <span>gutter · throttled</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="block h-2 w-px"
              style={{ background: "var(--color-border-strong)" }}
            />
            <span>quota ceiling</span>
          </span>
        </div>
      </div>
    </div>
  );
}
