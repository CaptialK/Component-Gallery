"use client";

import { useEffect, useRef, useState } from "react";
import { Trace, type TracePoint } from "@/components/_kit/trace";
import { mulberry32 } from "@/components/_kit/dot-noise";

/**
 * REGISTRY:
 * {
 *   domain: "saas",
 *   category: "dashboards",
 *   slug: "billing-usage",
 *   title: "Estimated bill",
 *   filename: "billing-usage.tsx",
 *   description: "Typeset-invoice approach to mid-cycle usage. Estimated total set in display Fraunces, line-item table with tabular-num columns and hairline rules, a single 30-day cumulative-spend Trace anchored to the renew-on date.",
 *   layout: "specimen",
 *   aspectRatio: "5 / 6",
 *   maxWidth: 600,
 *   firstImpression: "2026-05-04",
 * }
 */

/**
 * Estimated bill — alternative to the metered-quota dashboard. The plate is
 * a typeset invoice, not a dashboard: a hero estimated total in display
 * Fraunces, a tabular line-item ledger underneath, and a single cumulative
 * Trace anchored to the renew-on date at the foot. Reads like a printed
 * bill someone would hand you, not a system status panel.
 *
 * Dot+line commitments specific to this plate:
 *  - Backgrounds beneath data values stay flat. The figure of the plate is
 *    the typesetting itself — column rhythm, tabular numerals, hairline
 *    rules between sections. No halftone ribbons, no in-cell stipple.
 *  - The cumulative-spend Trace is the only line element. Its terminal
 *    Federal Blue dot marks today; a dashed walnut threshold marks the
 *    forecast intercept at cycle close.
 *  - The "estimated" disclaimer is a small mono-caps subhead under the
 *    hero figure; the precision of the figure isn't oversold.
 *
 * Pure server component.
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

const SECTIONS: Section[] = [
  {
    heading: "Compute",
    items: [
      {
        name: "Edge runtime",
        detail: "GB-hours · over 100 free",
        used: "1,284 GB-h",
        rate: "$0.000018",
        subtotal: 23.11,
      },
      {
        name: "Build minutes",
        detail: "incremental · over 6,000 free",
        used: "14,212 min",
        rate: "$0.0040",
        subtotal: 56.85,
      },
      {
        name: "Background functions",
        detail: "invocations · over 1M free",
        used: "3.42M",
        rate: "$0.20 / M",
        subtotal: 6.84,
      },
    ],
  },
  {
    heading: "Bandwidth & storage",
    items: [
      {
        name: "Egress",
        detail: "global · over 100 GB free",
        used: "842 GB",
        rate: "$0.150",
        subtotal: 126.30,
      },
      {
        name: "Asset storage",
        detail: "blob · billed monthly",
        used: "412 GB",
        rate: "$0.023",
        subtotal: 9.48,
      },
    ],
  },
  {
    heading: "Observability",
    items: [
      {
        name: "Log ingest",
        detail: "structured · 250 GB free",
        used: "688 GB",
        rate: "$0.250",
        subtotal: 109.50,
      },
      {
        name: "Trace events",
        detail: "spans · 5M free",
        used: "12.4M",
        rate: "$1.30 / M",
        subtotal: 9.62,
      },
      {
        name: "Alerts",
        detail: "destinations · flat",
        used: "4 active",
        rate: "$0.12 ea",
        subtotal: 0.48,
      },
    ],
  },
];

function sectionSubtotal(s: Section): number {
  return s.items.reduce((acc, i) => acc + i.subtotal, 0);
}

const SUBTOTAL = SECTIONS.reduce((acc, s) => acc + sectionSubtotal(s), 0);
const CREDITS = -16.00; // committed-use discount
const TOTAL = Math.round((SUBTOTAL + CREDITS) * 100) / 100;

/** 30-day cumulative spend, ending today (day 18 of cycle). The trace
 *  is scaled at the end so its terminal y-value equals TOTAL exactly —
 *  hero figure and chart's last point must agree. */
function cumulativeSpend(): TracePoint[] {
  const rng = mulberry32(417);
  const raw: number[] = [];
  let total = 0;
  for (let day = 0; day < 18; day++) {
    // ~$18-22 per day with weekend dips.
    const weekend = day % 7 === 5 || day % 7 === 6;
    const daily = (weekend ? 8 : 22) + (rng() - 0.5) * 6;
    total += daily;
    raw.push(total);
  }
  // Scale so the final cumulative value equals TOTAL exactly.
  const scale = TOTAL / raw[raw.length - 1];
  return raw.map((y, day) => ({ x: day, y: y * scale }));
}

const TRACE_DATA = cumulativeSpend();
const TODAY_TOTAL = TRACE_DATA[TRACE_DATA.length - 1].y;
// Linear extrapolation to day 30.
const PROJECTED_TOTAL = (TODAY_TOTAL / 18) * 30;

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export default function BillingUsageAlt() {
  // In-view gate — fires once per session via IntersectionObserver. Drives
  // both the hero-total reveal and the cumulative-spend trace draw. The
  // hero leads the trace by ~30ms so the eye lands on the figure before
  // the line moves.
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
        {/* Running head */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Invoice · estimate · cycle ends May 14
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Acme Inc · INV-2026-05
          </span>
        </div>

        {/* Hero total — single 320ms paper-ease reveal on first viewport
            entry: opacity 0→1 + translateY(4px)→0. Leads the trace draw
            by ~30ms so the figure registers first. No stagger; everything
            else (running head, ledger, colophon) renders normally. */}
        <div
          className="flex shrink-0 flex-col items-center justify-center px-6 pb-3 pt-6"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(4px)",
            transition: `opacity 320ms ${PAPER_EASE}, transform 320ms ${PAPER_EASE}`,
          }}
        >
          <Total amount={TOTAL} />
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            estimated{" "}
            <span className="text-[var(--color-border-strong)]">·</span>{" "}
            day 18 of 30
          </p>
        </div>

        {/* Hairline before the ledger */}
        <div className="mx-6 h-px shrink-0 bg-[var(--color-border-strong)]" />

        {/* Line items */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <table className="w-full table-fixed text-[12px] tabular-nums">
            <colgroup>
              <col style={{ width: "44%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="py-2 text-left font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                  Item
                </th>
                <th className="py-2 text-right font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                  Usage
                </th>
                <th className="py-2 text-right font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                  Rate
                </th>
                <th className="py-2 text-right font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                  Subtotal
                </th>
              </tr>
            </thead>
            {SECTIONS.map((s, si) => (
              <tbody key={s.heading}>
                {/* Section heading row — Fraunces italic small caps */}
                <tr>
                  <td colSpan={4} className="border-t border-[var(--color-border)] pb-1 pt-3">
                    <span
                      className="font-display text-[12px] italic text-[var(--color-text)]"
                      style={{
                        fontVariationSettings: '"opsz" 18, "SOFT" 30',
                        letterSpacing: "0.02em",
                      }}
                    >
                      {s.heading}.
                    </span>
                  </td>
                </tr>
                {s.items.map((it) => (
                  <tr key={it.name}>
                    <td className="py-1 align-top">
                      <div className="text-[12px] text-[var(--color-text)]">
                        {it.name}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
                        {it.detail}
                      </div>
                    </td>
                    <td className="py-1 text-right align-top font-mono text-[11px] tabular-nums text-[var(--color-text)]">
                      {it.used}
                    </td>
                    <td className="py-1 text-right align-top font-mono text-[11px] tabular-nums text-[var(--color-text-muted)]">
                      {it.rate}
                    </td>
                    <td className="py-1 text-right align-top font-mono text-[12px] tabular-nums text-[var(--color-text)]">
                      {fmtUsd(it.subtotal)}
                    </td>
                  </tr>
                ))}
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
            ))}
            {/* Subtotal / credits / total — separated by spacing only;
                the single strong rule lives above Estimated total. */}
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
                <td colSpan={3} className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Committed-use credit
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

        {/* Cumulative-spend Trace + colophon */}
        <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 pb-3 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Spend, day 1 → today
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              cycle close · {fmtUsd(PROJECTED_TOTAL)} forecast
            </span>
          </div>
          <div className="mt-2">
            <SpendTrace inView={inView} />
            <div className="mt-1 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] tabular-nums">
              <span>Apr 24</span>
              <span>today · May 11</span>
            </div>
          </div>
        </div>

        <p className="border-t border-[var(--color-border)] px-6 py-2 text-center font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          a live estimate · final invoice posts the day after cycle close
        </p>
      </div>
    </div>
  );
}

/**
 * Cumulative-spend Trace with the in-view draw. On first viewport entry
 * the trend's stroke-dashoffset transitions from full-length → 0 over
 * 320ms paper-ease; the terminal Federal Blue dot fades opacity 0 → 1
 * over 120ms once the line completes. The forecast intercept dot at
 * x=30 stays STATIC (projected, not actual) — we identify the two dots
 * by index in the SVG and animate only the first.
 */
function SpendTrace({ inView }: { inView: boolean }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

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

    // Trace renders dots in declaration order. Dot 0 = terminal Federal Blue
    // (animated). Dot 1 = forecast intercept at x=30 (static — projected,
    // not actual). Hide only the terminal dot up front.
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

    // Hero total leads by 30ms — we delay the trace draw that long so the
    // eye lands on the figure first.
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

  return (
    <div ref={wrapRef}>
      <Trace
        data={TRACE_DATA}
        width={520}
        height={42}
        xDomain={[0, 30]}
        yDomain={[0, PROJECTED_TOTAL * 1.08]}
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
  );
}

/** The hero figure. Fraunces italic, opsz 96 for display weight.
 *  $ and cents are <sup>-style superscripts on the integer figure. */
function Total({ amount }: { amount: number }) {
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  return (
    <span
      className="font-display text-[64px] italic leading-none tracking-[-0.02em] text-[var(--color-text)] tabular-nums"
      style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
    >
      <sup
        className="font-display text-[16px] italic text-[var(--color-text-muted)]"
        style={{
          fontVariationSettings: '"opsz" 18, "SOFT" 30',
          marginRight: "2px",
        }}
      >
        $
      </sup>
      {dollars}
      <sup
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
