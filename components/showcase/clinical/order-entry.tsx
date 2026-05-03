"use client";

import { useMemo, useState } from "react";
import { Search, X, Plus, Check } from "lucide-react";
import { mulberry32, poissonDisc } from "@/components/_kit/dot-noise";

/**
 * Order entry — CPOE search-as-you-type. Type a symptom or test name; the
 * suggestions filter in place, grouped by category. Each suggestion carries
 * a stippled "frequency in your panel" indicator: density-as-frequency
 * tells the clinician at a glance whether they're picking from familiar
 * orders or reaching for something rare.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - The frequency indicator is a fixed-width Bridson stipple whose
 *    coverage maps to a logged-frequency rank (≥1×/wk → top of canon,
 *    ≤1×/yr → near floor). Cleveland-McGill says length wins for ratio,
 *    but rank is ordinal here; density carries the rank fine.
 *  - The "Your most-ordered" shortcut group at top of an empty search
 *    gets Federal Blue inked dots, distinguishing recall from search.
 *  - The Cart rail shows queued orders; each carries a small stipple
 *    encoding cost-rank (1 dot = $, 4 dots = $$$$). Rank, not value.
 *
 * Client component (search query state). Mock catalog only.
 */

type Category = "Labs" | "Imaging" | "Meds" | "Procedures" | "Consults";

type OrderItem = {
  id: string;
  name: string;
  alias?: string;
  category: Category;
  /** 0..1 — frequency-in-your-panel rank. 1 = ordered weekly, 0 = first time. */
  freq: number;
  /** 1..4 — relative cost-rank for the patient. */
  cost: number;
  /** Notes / typical indication. */
  note?: string;
};

const CATALOG: OrderItem[] = [
  // Labs
  { id: "cbc", name: "CBC with differential", alias: "complete blood count", category: "Labs", freq: 0.95, cost: 1, note: "screening" },
  { id: "cmp", name: "CMP", alias: "comprehensive metabolic panel", category: "Labs", freq: 0.92, cost: 1, note: "electrolytes, renal, liver" },
  { id: "bmp", name: "BMP", alias: "basic metabolic panel", category: "Labs", freq: 0.65, cost: 1 },
  { id: "lipid", name: "Lipid panel", category: "Labs", freq: 0.74, cost: 1, note: "fasting preferred" },
  { id: "hba1c", name: "HbA1c", alias: "hemoglobin A1c, glycated hemoglobin", category: "Labs", freq: 0.85, cost: 2, note: "DM monitoring" },
  { id: "tsh", name: "TSH", alias: "thyroid stimulating hormone", category: "Labs", freq: 0.55, cost: 1 },
  { id: "trop", name: "Troponin I", category: "Labs", freq: 0.40, cost: 2, note: "ACS workup" },
  { id: "inr", name: "PT / INR", category: "Labs", freq: 0.62, cost: 1 },
  { id: "lact", name: "Lactate", category: "Labs", freq: 0.36, cost: 2, note: "sepsis / DKA" },
  // Imaging
  { id: "cxr", name: "Chest X-ray (PA + lateral)", alias: "CXR", category: "Imaging", freq: 0.78, cost: 2 },
  { id: "ctap", name: "CT abdomen/pelvis with contrast", alias: "CT A/P", category: "Imaging", freq: 0.42, cost: 4 },
  { id: "ekg", name: "12-lead ECG", alias: "ECG, EKG", category: "Imaging", freq: 0.81, cost: 1 },
  { id: "echo", name: "Transthoracic echocardiogram", alias: "TTE, echo", category: "Imaging", freq: 0.18, cost: 4 },
  // Meds
  { id: "metf", name: "Metformin 500 mg PO BID", alias: "Glucophage", category: "Meds", freq: 0.88, cost: 1 },
  { id: "ins", name: "Insulin sliding scale", alias: "humalog, novolog", category: "Meds", freq: 0.59, cost: 3 },
  { id: "lis", name: "Lisinopril 10 mg PO daily", category: "Meds", freq: 0.77, cost: 1 },
  { id: "atorv", name: "Atorvastatin 40 mg PO QHS", alias: "Lipitor", category: "Meds", freq: 0.69, cost: 1 },
  // Procedures
  { id: "fc", name: "Foley catheter placement", category: "Procedures", freq: 0.30, cost: 1 },
  { id: "lp", name: "Lumbar puncture", category: "Procedures", freq: 0.06, cost: 3 },
  // Consults
  { id: "card", name: "Cardiology consult", category: "Consults", freq: 0.28, cost: 4 },
  { id: "endo", name: "Endocrinology consult", alias: "diabetes, thyroid", category: "Consults", freq: 0.21, cost: 4 },
  { id: "psych", name: "Psychiatry consult", category: "Consults", freq: 0.14, cost: 3 },
];

const CATEGORY_ORDER: Category[] = ["Labs", "Imaging", "Meds", "Procedures", "Consults"];

export default function OrderEntry() {
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<string[]>(["hba1c", "metf"]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CATALOG;
    return CATALOG.filter((o) => {
      const hay = (o.name + " " + (o.alias ?? "") + " " + (o.note ?? "")).toLowerCase();
      return hay.includes(needle);
    });
  }, [q]);

  const grouped = useMemo(() => {
    const out: Record<Category, OrderItem[]> = {
      Labs: [], Imaging: [], Meds: [], Procedures: [], Consults: [],
    };
    for (const m of matches) out[m.category].push(m);
    for (const k of CATEGORY_ORDER) out[k].sort((a, b) => b.freq - a.freq);
    return out;
  }, [matches]);

  const inCart = (id: string) => cart.includes(id);
  const toggle = (id: string) =>
    setCart((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Search bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Place orders · Patel, R.
          </span>
          <div className="relative flex-1">
            <Search size={13} strokeWidth={1.6} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search labs, imaging, meds, procedures, consults…"
              className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-8 text-[13px] placeholder:italic placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              >
                <X size={11} />
              </button>
            )}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </span>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_280px] divide-x divide-[var(--color-border)]">
          {/* Suggestions */}
          <div className="overflow-y-auto">
            {CATEGORY_ORDER.map((cat) => {
              const items = grouped[cat];
              if (!items.length) return null;
              return (
                <section key={cat}>
                  <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                      {cat}
                      <span className="mx-1.5 text-[var(--color-border-strong)]">·</span>
                      {items.length}
                    </span>
                  </header>
                  <ul>
                    {items.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-2 hover:bg-[var(--color-surface)]"
                      >
                        <FrequencyStipple freq={o.freq} seed={o.id.charCodeAt(0) * 31 + o.id.length} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="truncate text-[13px] font-medium text-[var(--color-text)]">
                              {highlight(o.name, q)}
                            </span>
                            {o.alias && (
                              <span
                                className="truncate font-display text-[11px] italic text-[var(--color-text-muted)]"
                                style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
                              >
                                {o.alias}
                              </span>
                            )}
                          </div>
                          {o.note && (
                            <div className="truncate text-[11px] text-[var(--color-text-muted)]">
                              {o.note}
                            </div>
                          )}
                        </div>
                        <CostDots cost={o.cost} />
                        <button
                          type="button"
                          onClick={() => toggle(o.id)}
                          aria-label={inCart(o.id) ? `Remove ${o.name} from order` : `Add ${o.name} to order`}
                          className={
                            inCart(o.id)
                              ? "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-xs)] border border-[color-mix(in_oklch,var(--color-accent-2)_70%,#000_8%)] bg-[color-mix(in_oklch,var(--color-accent-2)_18%,var(--color-surface))] text-[var(--color-accent-2)]"
                              : "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
                          }
                        >
                          {inCart(o.id) ? <Check size={11} /> : <Plus size={11} />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {matches.length === 0 && (
              <div className="flex h-full items-center justify-center px-6 py-12">
                <p
                  className="max-w-[34ch] text-center text-[12.5px] italic text-[var(--color-text-muted)]"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontVariationSettings: '"opsz" 18, "SOFT" 30',
                  }}
                >
                  No catalog match for "{q}". Refine the term, or click
                  Add Custom to write a free-text order.
                </p>
              </div>
            )}
          </div>

          {/* Cart */}
          <aside className="flex flex-col bg-[var(--color-surface-2)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                In this order
              </div>
              <p
                className="mt-1 font-display text-[16px] italic leading-tight text-[var(--color-text)]"
                style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
              >
                {cart.length} item{cart.length === 1 ? "" : "s"} queued
              </p>
            </div>
            <ul className="flex-1 overflow-y-auto">
              {cart.map((id) => {
                const o = CATALOG.find((x) => x.id === id);
                if (!o) return null;
                return (
                  <li
                    key={id}
                    className="flex items-start gap-2 border-b border-[var(--color-border)] px-4 py-2"
                  >
                    <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center text-[var(--color-accent-2)]">
                      <Check size={11} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] text-[var(--color-text)]">
                        {o.name}
                      </div>
                      <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                        {o.category}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      aria-label={`Remove ${o.name}`}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      <X size={11} />
                    </button>
                  </li>
                );
              })}
              {cart.length === 0 && (
                <li className="px-4 py-4 text-[11px] italic text-[var(--color-text-muted)]">
                  Add suggestions from the left to build the order.
                </li>
              )}
            </ul>
            <div className="border-t border-[var(--color-border)] p-3">
              <button
                type="button"
                disabled={cart.length === 0}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-[13px] text-[var(--color-accent-fg)] hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sign &amp; submit
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function highlight(text: string, q: string): React.ReactNode {
  const needle = q.trim();
  if (!needle) return text;
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark
        className="rounded-[2px] px-0.5 text-[var(--color-text)]"
        style={{
          background:
            "color-mix(in oklch, var(--color-accent-2) 18%, transparent)",
        }}
      >
        {text.slice(i, i + needle.length)}
      </mark>
      {text.slice(i + needle.length)}
    </>
  );
}

function FrequencyStipple({ freq, seed }: { freq: number; seed: number }) {
  const W = 38;
  const H = 14;
  const points = poissonDisc({ width: W, height: H, radius: 2.4, seed });
  const rng = mulberry32(seed + 11);
  // freq 0..1 → keep_prob 0.18..1 (canon-bounded coverage).
  const keep = 0.18 + freq * 0.8;
  const ink = freq > 0.7 ? "var(--color-accent-2)" : "var(--color-text)";

  return (
    <div className="shrink-0">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-label={`${Math.round(freq * 100)}% frequency rank`}
        className="block"
      >
        {points.map((p, i) => {
          if (rng() > keep) return null;
          return <circle key={i} cx={p.x} cy={p.y} r={0.85} fill={ink} opacity={0.7} />;
        })}
      </svg>
    </div>
  );
}

function CostDots({ cost }: { cost: number }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" aria-label={`Cost rank ${cost} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          aria-hidden
          className="block h-1.5 w-1.5 rounded-full"
          style={{
            background:
              i <= cost ? "var(--color-text-muted)" : "var(--color-border)",
          }}
        />
      ))}
    </div>
  );
}
