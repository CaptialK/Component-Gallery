"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trace, type TracePoint } from "@/components/_kit/trace";
import { mulberry32 } from "@/components/_kit/dot-noise";
import { Popover } from "@/components/_kit/popover";
import { useToast } from "@/components/_kit/toast";
import { Skeleton } from "@/components/_kit/skeleton";
import { EmptyState } from "@/components/_kit/empty-state";
import { ErrorState } from "@/components/_kit/error-state";

/**
 * Estimated bill — typeset invoice with mid-cycle usage data.
 *
 * State refinement (2026-05-05):
 *  - Loading: skeleton replaces section bodies (row-shaped blocks); hero
 *    becomes a 200×60 Skeleton; SpendTrace is a stipple field. 320ms.
 *  - Empty: cycle just started — keep running head, swap body for
 *    EmptyState ("Cycle just started — no usage yet."); total reads $0.00
 *    in muted ink; spend trace hides.
 *  - Error: usage-fetch failure surfaces a banner ErrorState above the
 *    table with auto-retry timer caption. Download failure flips the toast
 *    to "Download failed. Retry." with retry inline.
 *  - Responsive: <640px drops rate column (rate inlined into detail);
 *    hero drops 64→44px; spend trace 42→32px. <768px hero 56px.
 *  - A11y: aria-live region announces day + total on scrub. Hero total
 *    wrapper reads "${dollars} dollars and ${cents} cents". Table caption.
 *  - Edge cases: division-by-zero guards on SUBTOTAL/PROJECTED_TOTAL when
 *    cycle is brand new.
 */

type LineItem = {
  name: string;
  detail: string;
  used: string;
  rate: string;
  subtotal: number;
};

type Section = {
  heading: string;
  items: LineItem[];
};

type Mode = "live" | "empty" | "error";

const SECTIONS: Section[] = [
  {
    heading: "Compute",
    items: [
      { name: "Edge runtime", detail: "GB-hours · over 100 free", used: "1,284 GB-h", rate: "$0.000018", subtotal: 23.11 },
      { name: "Build minutes", detail: "incremental · over 6,000 free", used: "14,212 min", rate: "$0.0040", subtotal: 56.85 },
      { name: "Background functions", detail: "invocations · over 1M free", used: "3.42M", rate: "$0.20 / M", subtotal: 6.84 },
    ],
  },
  {
    heading: "Bandwidth & storage",
    items: [
      { name: "Egress", detail: "global · over 100 GB free", used: "842 GB", rate: "$0.150", subtotal: 126.30 },
      { name: "Asset storage", detail: "blob · billed monthly", used: "412 GB", rate: "$0.023", subtotal: 9.48 },
    ],
  },
  {
    heading: "Observability",
    items: [
      { name: "Log ingest", detail: "structured · 250 GB free", used: "688 GB", rate: "$0.250", subtotal: 109.50 },
      { name: "Trace events", detail: "spans · 5M free", used: "12.4M", rate: "$1.30 / M", subtotal: 9.62 },
      { name: "Alerts", detail: "destinations · flat", used: "4 active", rate: "$0.12 ea", subtotal: 0.48 },
    ],
  },
];

function sectionSubtotal(s: Section): number {
  return s.items.reduce((acc, i) => acc + i.subtotal, 0);
}

const SUBTOTAL = SECTIONS.reduce((acc, s) => acc + sectionSubtotal(s), 0);
const CREDITS = -16.00;
const TOTAL = Math.round((SUBTOTAL + CREDITS) * 100) / 100;

function cumulativeSpend(): TracePoint[] {
  const rng = mulberry32(417);
  const raw: number[] = [];
  let total = 0;
  for (let day = 0; day < 18; day++) {
    const weekend = day % 7 === 5 || day % 7 === 6;
    const daily = (weekend ? 8 : 22) + (rng() - 0.5) * 6;
    total += daily;
    raw.push(total);
  }
  const last = raw[raw.length - 1] || 1;
  const scale = TOTAL / last;
  return raw.map((y, day) => ({ x: day, y: y * scale }));
}

const TRACE_DATA = cumulativeSpend();
const TODAY_DAY = 18;
const TODAY_TOTAL = TRACE_DATA[TRACE_DATA.length - 1].y;
// Guard against division-by-zero on cycle day 1.
const PROJECTED_TOTAL = TODAY_DAY > 0 ? (TODAY_TOTAL / TODAY_DAY) * 30 : 0;
const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const COLLAPSE_KEY = "stipple.billing.collapsed";

/** Compute the proportional x-range a line item contributes to the cumulative
 *  trace. We map each item's subtotal share of SUBTOTAL into a (start, end)
 *  fraction of x ∈ [0, 18] (today). Line items appear in document order. */
function itemRangesByLabel(): Map<string, { start: number; end: number }> {
  const map = new Map<string, { start: number; end: number }>();
  if (SUBTOTAL <= 0) return map; // guard against div-by-zero on $0 cycle.
  let acc = 0;
  for (const sec of SECTIONS) {
    for (const it of sec.items) {
      const start = acc;
      acc += it.subtotal;
      const end = acc;
      map.set(it.name, {
        start: (start / SUBTOTAL) * 18,
        end: (end / SUBTOTAL) * 18,
      });
    }
  }
  return map;
}

const ITEM_RANGES = itemRangesByLabel();

export default function BillingUsageAlt() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const firedRef = useRef(false);

  // Loading + mode state.
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("live");
  const [retryIn, setRetryIn] = useState(60);

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

  // Auto-retry countdown (visual only) when in error mode.
  useEffect(() => {
    if (mode !== "error") return;
    setRetryIn(60);
    const id = window.setInterval(() => {
      setRetryIn((s) => (s <= 1 ? 60 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [mode]);

  // Section collapse state.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setCollapsed(parsed as Record<string, boolean>);
      }
    } catch {
      /* swallow */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
    } catch {
      /* swallow */
    }
  }, [collapsed]);

  const toggleCollapse = (heading: string) =>
    setCollapsed((prev) => ({ ...prev, [heading]: !prev[heading] }));

  // Hover-row highlight.
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const hoverRange = hoveredItem ? ITEM_RANGES.get(hoveredItem) ?? null : null;

  // Download toast id (stable across the simulated lifecycle).
  const { toast, update } = useToast();
  const [downloading, setDownloading] = useState(false);
  // 1-in-8 simulated failure.
  const downloadAttemptRef = useRef(0);

  const onDownload = () => {
    if (downloading) return;
    setDownloading(true);
    const id = toast({ title: "Generating PDF…", status: "loading" });
    const attempt = ++downloadAttemptRef.current;
    const willFail = attempt % 8 === 0;
    window.setTimeout(() => {
      if (willFail) {
        update(id, {
          title: "Download failed — tap to retry.",
          status: "error",
          duration: 4000,
        });
      } else {
        update(id, {
          title: "Downloaded INV-2026-05.pdf",
          status: "success",
          duration: 2500,
        });
      }
      setDownloading(false);
    }, 800);
  };

  useEffect(() => {
    if (firedRef.current) return;
    const node = rootRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !firedRef.current && !loading) {
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
    // Fallback: 50ms after `loading` clears, fire the reveal even if the
    // IntersectionObserver hasn't reported yet. Keeps static snapshots
    // (and headless renders) honest while preserving the proper in-view
    // trigger for users who scroll the plate into the viewport.
    let fallback: number | null = null;
    if (!loading) {
      fallback = window.setTimeout(() => {
        if (!firedRef.current) {
          firedRef.current = true;
          setInView(true);
          obs.disconnect();
        }
      }, 50);
    }
    return () => {
      obs.disconnect();
      if (fallback !== null) window.clearTimeout(fallback);
    };
  }, [loading]);

  // aria-live region for spend-trace scrub.
  const [scrubAnnounce, setScrubAnnounce] = useState("");

  const isEmpty = mode === "empty";
  const isError = mode === "error";

  return (
    <div
      ref={rootRef}
      className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]"
    >
      <div className="flex h-full flex-col">
        {/* Running head + Download button */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Invoice · estimate · cycle ends May 14
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Acme Inc · INV-2026-05
            </span>
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading || isEmpty}
              className="relative inline-flex h-6 items-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text)] transition-[border-color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] disabled:opacity-50"
            >
              {/* Crossfade label between Generating… and Download */}
              <span
                style={{
                  opacity: downloading ? 1 : 0,
                  transition: `opacity 120ms ease-out`,
                  position: downloading ? "static" : "absolute",
                }}
              >
                Generating…
              </span>
              <span
                style={{
                  opacity: downloading ? 0 : 1,
                  transition: `opacity 120ms ease-out`,
                  position: downloading ? "absolute" : "static",
                }}
              >
                Download
              </span>
            </button>
          </div>
        </div>

        {/* aria-live region for scrub announcements. */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {scrubAnnounce}
        </div>

        {/* Error banner above the line items. */}
        {isError && !loading && (
          <div className="shrink-0 px-6 pt-3">
            <ErrorState
              variant="banner"
              title="Estimate may be stale."
              body={`Auto-retry in ${retryIn}s.`}
              lastSync="02:14"
              onRetry={() => {
                window.location.hash = "";
                setMode("live");
              }}
            />
          </div>
        )}

        {/* Hero total */}
        <div
          className="flex shrink-0 flex-col items-center justify-center px-6 pb-3 pt-6"
          style={{
            opacity: inView || loading ? 1 : 0,
            transform: inView || loading ? "translateY(0)" : "translateY(4px)",
            transition: `opacity 320ms ${PAPER_EASE}, transform 320ms ${PAPER_EASE}`,
          }}
        >
          {loading ? (
            <Skeleton width={200} height={60} className="h-[60px] w-[200px]" />
          ) : isEmpty ? (
            <Total amount={0} muted />
          ) : (
            <Total amount={TOTAL} />
          )}
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            estimated{" "}
            <span className="text-[var(--color-border-strong)]">·</span>{" "}
            day {isEmpty ? 1 : 18} of 30
          </p>
        </div>

        <div className="mx-6 h-px shrink-0 bg-[var(--color-border-strong)]" />

        {/* Line items / empty / loading */}
        {loading ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-1">
                  <Skeleton width={220} height={14} className="h-[14px] w-[220px]" />
                  <Skeleton width={80} height={14} className="h-[14px] w-[80px]" />
                  <Skeleton width={60} height={14} className="hidden h-[14px] w-[60px] sm:block" />
                  <Skeleton width={60} height={14} className="h-[14px] w-[60px]" />
                </div>
              ))}
            </div>
          </div>
        ) : isEmpty ? (
          <div className="grid min-h-0 flex-1 place-items-center px-6 py-8">
            <EmptyState
              title="Cycle just started — no usage yet."
              body="Day 1 of 30. Check back as compute, bandwidth, and observability accrue."
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-6">
            <table className="w-full table-fixed text-[12px] tabular-nums">
              <caption className="sr-only">
                Estimated bill, mid-cycle line items by section.
              </caption>
              <colgroup>
                <col className="w-[44%] sm:w-[44%]" />
                <col className="w-[26%] sm:w-[20%]" />
                <col className="hidden sm:table-column sm:w-[18%]" />
                <col className="w-[30%] sm:w-[18%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="py-2 text-left font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                    Item
                  </th>
                  <th className="py-2 text-right font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                    Usage
                  </th>
                  <th className="hidden py-2 text-right font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)] sm:table-cell">
                    Rate
                  </th>
                  <th className="py-2 text-right font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                    Subtotal
                  </th>
                </tr>
              </thead>
              {SECTIONS.map((s) => {
                const isCollapsed = !!collapsed[s.heading];
                return (
                  <tbody key={s.heading}>
                    {/* Section heading row — clickable */}
                    <tr>
                      <td colSpan={4} className="border-t border-[var(--color-border)] pb-1 pt-3">
                        <button
                          type="button"
                          onClick={() => toggleCollapse(s.heading)}
                          aria-expanded={!isCollapsed}
                          className="inline-flex w-full items-center justify-between text-left"
                        >
                          <span
                            className="font-display text-[12px] italic text-[var(--color-text)]"
                            style={{
                              fontVariationSettings: '"opsz" 18, "SOFT" 30',
                              letterSpacing: "0.02em",
                            }}
                          >
                            {s.heading}.
                          </span>
                          <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                            {isCollapsed ? "show" : "hide"}
                          </span>
                        </button>
                      </td>
                    </tr>
                    {/* Collapsible body */}
                    <tr>
                      <td colSpan={4} className="p-0">
                        <div
                          className="grid transition-[grid-template-rows] duration-[200ms] ease-out"
                          style={{ gridTemplateRows: isCollapsed ? "0fr" : "1fr" }}
                        >
                          <div className="overflow-hidden">
                            <table className="w-full table-fixed text-[12px] tabular-nums">
                              <colgroup>
                                <col className="w-[44%] sm:w-[44%]" />
                                <col className="w-[26%] sm:w-[20%]" />
                                <col className="hidden sm:table-column sm:w-[18%]" />
                                <col className="w-[30%] sm:w-[18%]" />
                              </colgroup>
                              <tbody>
                                {s.items.map((it) => (
                                  <tr
                                    key={it.name}
                                    onMouseEnter={() => setHoveredItem(it.name)}
                                    onMouseLeave={() =>
                                      setHoveredItem((prev) =>
                                        prev === it.name ? null : prev,
                                      )
                                    }
                                    className="transition-[background-color] duration-[120ms] ease-out hover:bg-[color-mix(in_oklch,var(--color-accent-2)_4%,transparent)]"
                                  >
                                    <td className="py-1 align-top">
                                      <div className="truncate text-[12px] text-[var(--color-text)]">
                                        {it.name}
                                      </div>
                                      <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
                                        {/* On <640px the rate column is hidden; inline rate into the detail. */}
                                        <span className="sm:hidden">
                                          {it.detail} · billed at {it.rate}
                                        </span>
                                        <span className="hidden sm:inline">{it.detail}</span>
                                      </div>
                                    </td>
                                    <td className="py-1 text-right align-top font-mono text-[11px] tabular-nums text-[var(--color-text)]">
                                      {it.used}
                                    </td>
                                    <td className="hidden py-1 text-right align-top font-mono text-[11px] tabular-nums text-[var(--color-text-muted)] sm:table-cell">
                                      {it.rate}
                                    </td>
                                    <td className="py-1 text-right align-top font-mono text-[12px] tabular-nums text-[var(--color-text)]">
                                      {fmtUsd(it.subtotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* Section subtotal */}
                    <tr>
                      <td colSpan={3} className="pt-1 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                        {s.heading} subtotal
                      </td>
                      <td className="pt-1 text-right font-mono text-[12px] tabular-nums text-[var(--color-text)]">
                        {fmtUsd(sectionSubtotal(s))}
                      </td>
                    </tr>
                  </tbody>
                );
              })}
              <tbody>
                <tr>
                  <td colSpan={3} className="pt-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Subtotal
                  </td>
                  <td className="pt-2 text-right font-mono text-[12px] tabular-nums text-[var(--color-text)]">
                    {fmtUsd(SUBTOTAL)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right">
                    <Popover
                      placement="top"
                      align="end"
                      ariaLabel="Committed-use credit details"
                      trigger={
                        <button
                          type="button"
                          className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] underline decoration-dotted decoration-[var(--color-accent-2)] underline-offset-2 hover:text-[var(--color-text)]"
                        >
                          Committed-use credit
                        </button>
                      }
                    >
                      <div className="w-[260px] px-3 py-2.5">
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                          Credit terms
                        </div>
                        <p className="mt-1 text-[13px] text-[var(--color-text)]">
                          20% off compute, locked through 2026-12-31. 12 months
                          remaining.
                        </p>
                      </div>
                    </Popover>
                  </td>
                  <td className="text-right font-mono text-[12px] tabular-nums text-[var(--color-text)]">
                    {fmtUsd(CREDITS)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="pb-1 pt-1">
                    <div className="h-px bg-[var(--color-border-strong)]" />
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={3}
                    className="pb-3 text-right font-display text-[12.5px] italic text-[var(--color-text)]"
                    style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
                  >
                    Estimated total
                  </td>
                  <td
                    className="pb-3 text-right font-display text-[20px] italic tabular-nums text-[var(--color-text)]"
                    style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
                  >
                    {fmtUsd(TOTAL)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Cumulative-spend Trace + colophon */}
        {!isEmpty && !loading && (
          <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 pb-3 pt-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                Spend, day 1 → today
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                cycle close · {fmtUsd(PROJECTED_TOTAL)} forecast
              </span>
            </div>
            <div className="mt-2">
              <SpendTrace
                inView={inView}
                hoverRange={hoverRange}
                onScrub={(day, value) => {
                  if (day == null || value == null) {
                    setScrubAnnounce("");
                  } else {
                    setScrubAnnounce(`Day ${day + 1}, ${fmtUsd(value)}`);
                  }
                }}
              />
              <div className="mt-1 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] tabular-nums">
                <span>Apr 24</span>
                <span>today · May 11</span>
              </div>
            </div>
          </div>
        )}

        <p className="border-t border-[var(--color-border)] px-6 py-2 text-center font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          a live estimate · final invoice posts the day after cycle close
        </p>
      </div>
    </div>
  );
}

function SpendTrace({
  inView,
  hoverRange,
  onScrub,
}: {
  inView: boolean;
  hoverRange: { start: number; end: number } | null;
  onScrub: (day: number | null, value: number | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);

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
    const terminalDot = circles[0];
    if (terminalDot) terminalDot.style.opacity = "0";
    if (len <= 0) {
      if (terminalDot) {
        terminalDot.style.transition = "opacity 120ms ease-out";
        terminalDot.style.opacity = "1";
      }
      return;
    }
    path.style.transition = "none";
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    void path.getBoundingClientRect();
    const TRACE_LEAD = 30;
    const t1 = window.setTimeout(() => {
      path.style.transition = `stroke-dashoffset 320ms ${PAPER_EASE}`;
      path.style.strokeDashoffset = "0";
    }, TRACE_LEAD);
    const t2 = window.setTimeout(() => {
      if (terminalDot) {
        terminalDot.style.transition = "opacity 120ms ease-out";
        terminalDot.style.opacity = "1";
      }
    }, TRACE_LEAD + 320);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [inView]);

  // Scrub handlers — track pointer-x as a fraction of container width.
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const t = (e.clientX - rect.left) / rect.width;
    if (t < 0 || t > 1) {
      setScrub(null);
      onScrub(null, null);
      return;
    }
    const day = Math.round(t * 30);
    if (day > 17) {
      // beyond today — don't scrub future.
      setScrub(null);
      onScrub(null, null);
      return;
    }
    setScrub(day);
    onScrub(day, TRACE_DATA[Math.min(17, day)].y);
  };
  const onPointerLeave = () => {
    setScrub(null);
    onScrub(null, null);
  };

  const scrubValue = scrub != null ? TRACE_DATA[Math.min(17, scrub)].y : null;

  // Geometry for overlay segment + ribbon. At <640px we shrink height.
  const W = 520;
  const H = 42;

  return (
    <div
      ref={containerRef}
      className="relative"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ touchAction: "none" }}
    >
      <div ref={wrapRef} className="[&_svg]:h-[32px] sm:[&_svg]:h-[42px]">
        <Trace
          data={TRACE_DATA}
          width={W}
          height={H}
          xDomain={[0, 30]}
          yDomain={[0, (PROJECTED_TOTAL || 1) * 1.08]}
          smooth
          strokeColor="var(--color-text)"
          strokeWidth={1}
          thresholds={[
            {
              y: PROJECTED_TOTAL,
              dashed: true,
              color: "var(--color-accent-2)",
            },
          ]}
          dots={[
            {
              index: TRACE_DATA.length - 1,
              color: "var(--color-accent-2)",
              radius: 2.2,
            },
            {
              x: 30,
              y: PROJECTED_TOTAL,
              color: "var(--color-accent-2)",
              radius: 1.4,
            },
          ]}
          className="block w-full"
          ariaLabel="Cumulative spend this cycle"
        />
      </div>

      {/* Highlight overlay — Federal Blue brushed segment + persimmon ribbon. */}
      {hoverRange && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0"
            style={{
              left: `${(hoverRange.start / 30) * 100}%`,
              width: `${((hoverRange.end - hoverRange.start) / 30) * 100}%`,
              background: "color-mix(in oklch, var(--color-accent) 12%, transparent)",
              opacity: 1,
              animation: "billing-fade-in 120ms ease-out",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{
              left: `${(hoverRange.start / 30) * 100}%`,
              width: `${((hoverRange.end - hoverRange.start) / 30) * 100}%`,
              height: 1,
              top: "50%",
              background: "var(--color-accent-2)",
              opacity: 0.9,
              animation: "billing-fade-in 120ms ease-out",
            }}
          />
        </>
      )}

      {/* Scrub hairline + popover bubble. */}
      {scrub != null && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0"
            style={{
              left: `${(scrub / 30) * 100}%`,
              width: 1,
              background: "var(--color-accent-2)",
              opacity: 0.85,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-[var(--radius-xs)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text)]"
            style={{
              left: `${(scrub / 30) * 100}%`,
              top: -6,
            }}
          >
            day {scrub + 1} · {fmtUsd(scrubValue ?? 0)}
          </div>
        </>
      )}

      <style>{`
        @keyframes billing-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Total({ amount, muted = false }: { amount: number; muted?: boolean }) {
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  return (
    <span
      className="font-display italic leading-none tracking-[-0.02em] tabular-nums text-[44px] sm:text-[56px] md:text-[64px]"
      style={{
        fontVariationSettings: '"opsz" 96, "SOFT" 30',
        color: muted ? "var(--color-text-muted)" : "var(--color-text)",
      }}
      aria-label={`${dollars} dollars and ${String(cents).padStart(2, "0")} cents`}
    >
      <sup
        aria-hidden
        className="font-display text-[16px] italic text-[var(--color-text-muted)]"
        style={{
          fontVariationSettings: '"opsz" 18, "SOFT" 30',
          marginRight: "2px",
        }}
      >
        $
      </sup>
      <span aria-hidden>{dollars}</span>
      <sup
        aria-hidden
        className="font-display text-[24px] italic text-[var(--color-text-muted)] tabular-nums"
        style={{
          fontVariationSettings: '"opsz" 36, "SOFT" 30',
          marginLeft: "2px",
        }}
      >
        .{String(cents).padStart(2, "0")}
      </sup>
    </span>
  );
}

function fmtUsd(n: number): string {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(n);
  return `${sign}$${v.toFixed(2)}`;
}
