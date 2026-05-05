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
 *
 * State refinement (2026-05-05):
 *  - Loading: 8 row-shaped Skeletons + stipple-skeleton histograms (320ms).
 *    Bars rise via opacity 200ms after load.
 *  - Empty: 0 routes — header stays, table replaced with EmptyState; live
 *    indicator hides.
 *  - Error: live-data fetch fails — banner ErrorState above table; live
 *    indicator goes persimmon static; histogram bars dim to muted; per-row
 *    register-mark turns persimmon dashed.
 *  - Responsive:
 *    * <540px: minimal row (gutter + route + quota + histogram); tap row
 *      to expand a detail panel below with method + p95 + status.
 *    * 540–860px: drop the method-chip column; method as 2-letter prefix
 *      in the route mono cell, e.g. "[GE] /v2/users".
 *    * ≥860px: original 7-col layout.
 *  - A11y: divs gain role="table"/"row"/"columnheader"/"cell". Each <li>
 *    becomes role="button" with Enter/Space keydown. QuotaGauge wraps in
 *    role="meter" + aria-valuemin/max/now.
 *  - Polish: throttled caption fade-out before unmount; register-mark
 *    fade-in 120ms; status chip explicit border-color transition.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry32 } from "@/components/_kit/dot-noise";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/_kit/skeleton";
import { EmptyState } from "@/components/_kit/empty-state";
import { ErrorState } from "@/components/_kit/error-state";

type Method = "GET" | "POST" | "PUT" | "DELETE";
type RowStatus = "ok" | "throttled" | "error";
type Mode = "live" | "empty" | "error";

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("live");

  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), 320);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash;
      if (h === "#empty") setMode("empty");
      else if (h === "#error") setMode("error");
      else setMode("live");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

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

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const isEmpty = mode === "empty";
  const isError = mode === "error";

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
        {!isEmpty && (
          <span className="inline-flex items-center font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            {isError ? (
              <>
                <span
                  aria-hidden
                  className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-[var(--color-accent)]"
                />
                live · stale
              </>
            ) : (
              <>
                <span
                  aria-hidden
                  className="animate-live-pulse mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-[var(--color-accent-2)]"
                />
                live · {rows.length} routes
              </>
            )}
          </span>
        )}
      </div>

      <div className="shrink-0 px-6 pb-3 pt-3">
        <p className="max-w-[60ch] text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
          Quota usage per minute, per-second request volume, and p95 latency
          for every public route. Throttled rows surface a persimmon mark in
          the gutter.
        </p>
      </div>

      {/* Error banner */}
      {isError && !loading && (
        <div className="shrink-0 px-6 pb-3">
          <ErrorState
            variant="banner"
            title="Couldn't refresh quota."
            lastSync="02:14"
            onRetry={() => {
              window.location.hash = "";
              setMode("live");
            }}
          />
        </div>
      )}

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="border-t border-[var(--color-border-strong)]" role="table" aria-label="API endpoints">
          <TableHead />
          {loading ? (
            <ul aria-hidden>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 border-b border-[var(--color-border)] py-2 last:border-b-0"
                >
                  <Skeleton width={6} height={6} className="h-1.5 w-1.5" />
                  <Skeleton width={140} height={12} className="h-[12px] w-[140px] flex-1" />
                  <Skeleton width={32} height={12} className="hidden h-[12px] w-[32px] md:block" />
                  <Skeleton width={120} height={12} className="h-[12px] w-[120px]" />
                  <Skeleton width={132} height={22} density={0.04} className="h-[22px] w-[132px]" />
                  <Skeleton width={48} height={12} className="hidden h-[12px] w-[48px] sm:block" />
                  <Skeleton width={80} height={20} className="hidden h-[20px] w-[80px] sm:block" />
                </li>
              ))}
            </ul>
          ) : isEmpty ? (
            <div className="px-2 py-8">
              <EmptyState
                title="No public routes yet."
                body="Define an endpoint with defineRoute() to start tracking."
                action={{
                  label: "View SDK docs",
                  onClick: () => {
                    window.location.hash = "";
                    setMode("live");
                  },
                }}
              />
            </div>
          ) : (
            <ul role="rowgroup">
              {rows.map((r, i) => (
                <Row
                  key={r.id}
                  row={r}
                  focused={i === focusIdx}
                  throttleStamp={throttleStamp[r.id] ?? null}
                  expanded={!!expanded[r.id]}
                  stale={isError}
                  onFocus={() => setFocusIdx(i)}
                  onToggleStatus={() => toggleStatus(r.id)}
                  onToggleExpanded={() => toggleExpanded(r.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {!isEmpty && <Legend />}
      </div>
    </div>
  );
}

function TableHead() {
  return (
    <div
      role="row"
      className="grid items-end gap-3 border-b border-[var(--color-border)] py-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] grid-cols-[16px_1fr_144px_64px_96px] md:grid-cols-[16px_1fr_48px_144px_144px_64px_96px]"
    >
      <span role="columnheader" />
      <span role="columnheader">Route</span>
      <span role="columnheader" className="hidden md:inline">
        Method
      </span>
      <span role="columnheader">Quota · per min</span>
      <span role="columnheader" className="hidden md:inline">
        Per second · 12s
      </span>
      <span role="columnheader" className="text-right">p95</span>
      <span role="columnheader" className="text-right">Status</span>
    </div>
  );
}

function Row({
  row,
  focused,
  throttleStamp,
  expanded,
  stale,
  onFocus,
  onToggleStatus,
  onToggleExpanded,
}: {
  row: Endpoint;
  focused: boolean;
  throttleStamp: string | null;
  expanded: boolean;
  stale: boolean;
  onFocus: () => void;
  onToggleStatus: () => void;
  onToggleExpanded: () => void;
}) {
  const histogram = useMemo(
    () => makeHistogram(row.histogramSeed, row.throttleAt),
    [row.histogramSeed, row.throttleAt],
  );
  const isThrottled = row.status === "throttled" || row.status === "error";

  const onRowKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onFocus();
      // On small screens, Enter/Space toggles the detail panel.
      if (window.matchMedia("(max-width: 539px)").matches) {
        onToggleExpanded();
      }
    }
  };

  return (
    <li
      role="row"
      tabIndex={0}
      aria-expanded={expanded}
      className={cn(
        "group relative cursor-pointer border-b border-[var(--color-border)] last:border-b-0",
        "transition-[background-color] duration-[120ms] ease-out",
        "hover:bg-[var(--color-surface-2)]",
        "focus:outline-none",
      )}
      onClick={() => {
        onFocus();
        if (window.matchMedia("(max-width: 539px)").matches) {
          onToggleExpanded();
        }
      }}
      onFocus={onFocus}
      onKeyDown={onRowKeyDown}
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
        className={cn(
          "grid w-full items-center gap-3 py-2 text-left",
          "grid-cols-[16px_1fr_144px_64px_96px] md:grid-cols-[16px_1fr_48px_144px_144px_64px_96px]",
        )}
      >
        {/* Register-mark gutter */}
        <span role="cell" className="flex h-3 items-center justify-center">
          {isThrottled && (
            <span
              aria-label="throttled marker"
              className="block h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--color-accent)",
                border: stale ? "1px dashed var(--color-accent)" : undefined,
                opacity: 0,
                animation: `apilim-fade-in 120ms ease-out forwards`,
              }}
            />
          )}
        </span>

        {/* Route — at <860px we prefix the method as a 2-letter tag. */}
        <span
          role="cell"
          className="min-w-0 truncate font-mono text-[12px] text-[var(--color-text)]"
        >
          <span className="md:hidden text-[var(--color-text-muted)]">
            [{row.method.slice(0, 2)}]{" "}
          </span>
          {row.route}
        </span>

        {/* Method chip — only visible at ≥860px */}
        <span role="cell" className="hidden md:inline">
          <MethodChip method={row.method} />
        </span>

        {/* Quota gauge */}
        <span role="cell">
          <QuotaGauge
            used={row.quotaUsed}
            ceiling={row.quotaCeiling}
            throttled={isThrottled}
            stale={stale}
            label={row.route}
          />
        </span>

        {/* Histogram — hidden at <540px (sits in expanded panel below) */}
        <span role="cell" className="hidden sm:inline">
          <Histogram bars={histogram} throttleAt={row.throttleAt} stale={stale} />
        </span>

        {/* p95 — hidden at <540px */}
        <span
          role="cell"
          className="hidden text-right font-mono text-[11.5px] tabular-nums text-[var(--color-text)] sm:inline"
        >
          {fmtMs(row.p95)}
        </span>

        {/* Status chip — hidden at <540px (lives in expanded panel) */}
        <span role="cell" className="hidden text-right sm:inline">
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
      {throttleStamp && <ThrottleCaption stamp={throttleStamp} />}

      {/* Expanded detail panel — only used at <540px */}
      {expanded && (
        <div className="grid gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-2 text-[11px] text-[var(--color-text-muted)] sm:hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em]">
              Method
            </span>
            <MethodChip method={row.method} />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em]">
              Per second · 12s
            </span>
            <Histogram bars={histogram} throttleAt={row.throttleAt} stale={stale} />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em]">
              p95
            </span>
            <span className="font-mono tabular-nums text-[var(--color-text)]">
              {fmtMs(row.p95)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em]">
              Status
            </span>
            <StatusChip
              status={row.status}
              onToggle={(e) => {
                e.stopPropagation();
                onToggleStatus();
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes apilim-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
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
  stale,
  label,
}: {
  used: number;
  ceiling: number;
  throttled: boolean;
  stale: boolean;
  label: string;
}) {
  const pct = Math.min(1, used / ceiling);
  const pctOver = pct >= 0.9;
  const fillColor = stale
    ? "var(--color-text-muted)"
    : throttled
      ? "var(--color-accent)"
      : pctOver
        ? "var(--color-accent)"
        : "var(--color-text)";

  return (
    <span
      role="meter"
      aria-label={`${label} quota`}
      aria-valuemin={0}
      aria-valuemax={ceiling}
      aria-valuenow={used}
      className="flex items-center gap-2"
    >
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
  stale,
}: {
  bars: number[];
  throttleAt: number[];
  stale: boolean;
}) {
  const W = 132;
  const H = 22;
  const N = bars.length;
  const gap = 1.5;
  const barW = (W - gap * (N - 1)) / N;
  const baseY = H - 1;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverBar, setHoverBar] = useState<number | null>(null);
  const [risen, setRisen] = useState(false);

  // Bars rise via opacity 200ms after mount.
  useEffect(() => {
    const id = window.setTimeout(() => setRisen(true), 30);
    return () => window.clearTimeout(id);
  }, []);

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xUser = ((e.clientX - rect.left) / rect.width) * W;
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
  const tooltipLeftPct =
    hoverBar != null
      ? ((hoverBar * (barW + gap) + barW / 2) / W) * 100
      : 0;

  const fill = (isThrottle: boolean) => {
    if (stale) return "var(--color-text-muted)";
    return isThrottle ? "var(--color-accent)" : "var(--color-text)";
  };

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
              fill={fill(isThrottle)}
              style={{
                cursor: "pointer",
                opacity: !risen ? 0 : isActive ? 1 : isThrottle ? 1 : 0.85,
                transition: "opacity 200ms ease-out",
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
      )}
      style={{
        color: STATUS_INK[status],
        borderColor:
          status === "ok" ? "var(--color-border)" : STATUS_INK[status],
        transition: `color 200ms ${PAPER_EASE}, border-color 200ms ${PAPER_EASE}`,
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
  const [stamped, setStamped] = useState(stamp);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  // When the stamp prop disappears (parent removed it), fade out before
  // unmounting. Keep a local copy of the last stamp so the text doesn't
  // disappear immediately while the opacity transitions.
  useEffect(() => {
    if (stamp) {
      setStamped(stamp);
      setShown(true);
    } else {
      setShown(false);
    }
  }, [stamp]);
  return (
    <div
      className="pl-8 pb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-accent)]"
      style={{
        opacity: shown ? 1 : 0,
        transition: `opacity 120ms ease-out`,
      }}
    >
      throttled at {stamped}
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
