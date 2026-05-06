"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Plus, Check } from "lucide-react";
import { PatientStrip, type Patient } from "@/components/_kit/patient-strip";
import { AbnormalFlag } from "@/components/_kit/abnormal-flag";
import { ErrorState } from "@/components/_kit/error-state";

/**
 * Order entry — CPOE search-as-you-type. Type a symptom or test name; the
 * suggestions filter in place, grouped by category. Each suggestion carries
 * a frequency-in-your-panel bar: length tells the clinician at a glance
 * whether they're picking from familiar orders or reaching for something rare.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - The frequency indicator is a thin length bar (≥1×/wk fills it; ≤1×/yr
 *    is a stub). Refactored 2026-05-03 from a Bridson density stipple — the
 *    dot+line system pass moved quantitative encoding from density to length
 *    per Cleveland-McGill. Federal Blue tint above the recall threshold
 *    (freq > 0.7) so frequent picks read as "your panel."
 *  - Cost-rank is four discrete dots filled left-to-right (1 = $, 4 = $$$$).
 *    Rank, not value; dots-as-marks per the system primitives.
 *
 * 2026-05-05 medical-standard pass adds:
 *  - <PatientStrip density="compact"> at the top with allergies one glance away.
 *  - Drug-allergy interaction banner uses <AbnormalFlag severity="high-alert">
 *    icon + label + persimmon. Penicillin allergy ⇒ cross-reactive cephalosporin
 *    surface a hard warning before the item can be cart-toggled.
 *  - Cart items show ordered-by + ordered-at timestamps; missing-prereq items
 *    flag with high-alert and a "complete to sign" badge per item.
 *  - Sign cycle: idle → signing (live-pulse) → signed-toast or failed-banner.
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
  /** LOINC-ish or RxNorm-style code, surfaced as mono mark. */
  code?: string;
  /** Allergen classes this item belongs to — for cross-check vs patient list. */
  allergyClass?: string[];
  /** Required prereqs that must be satisfied before sign. */
  prereq?: string;
};

const CATALOG: OrderItem[] = [
  // Labs (LOINC-ish anchors)
  { id: "cbc",   name: "CBC with differential",          alias: "complete blood count",     category: "Labs", freq: 0.95, cost: 1, note: "screening",                   code: "57021-8" },
  { id: "cmp",   name: "CMP",                             alias: "comprehensive metabolic panel", category: "Labs", freq: 0.92, cost: 1, note: "electrolytes, renal, liver",  code: "24323-8" },
  { id: "bmp",   name: "BMP",                             alias: "basic metabolic panel",   category: "Labs", freq: 0.65, cost: 1,                                       code: "24320-4" },
  { id: "lipid", name: "Lipid panel",                     category: "Labs", freq: 0.74, cost: 1, note: "fasting preferred",            code: "57698-3" },
  { id: "hba1c", name: "Hemoglobin A1c",                  alias: "HbA1c, glycated hemoglobin", category: "Labs", freq: 0.85, cost: 2, note: "DM monitoring",              code: "4548-4" },
  { id: "tsh",   name: "TSH",                             alias: "thyroid stimulating hormone", category: "Labs", freq: 0.55, cost: 1, code: "3016-3" },
  { id: "trop",  name: "Troponin I",                      category: "Labs", freq: 0.40, cost: 2, note: "ACS workup",                   code: "10839-9" },
  { id: "inr",   name: "PT / INR",                        category: "Labs", freq: 0.62, cost: 1, code: "6301-6" },
  { id: "lact",  name: "Lactate",                         category: "Labs", freq: 0.36, cost: 2, note: "sepsis / DKA",                 code: "2524-7" },
  { id: "creat", name: "Creatinine, serum",               category: "Labs", freq: 0.71, cost: 1, code: "2160-0" },
  // Imaging
  { id: "cxr",   name: "Chest X-ray (PA + lateral)",      alias: "CXR",   category: "Imaging", freq: 0.78, cost: 2, code: "36643-5" },
  { id: "ctap",  name: "CT abdomen/pelvis with contrast", alias: "CT A/P", category: "Imaging", freq: 0.42, cost: 4, code: "30622-6", prereq: "creatinine within 30 days" },
  { id: "ekg",   name: "12-lead ECG",                     alias: "ECG, EKG", category: "Imaging", freq: 0.81, cost: 1, code: "11524-6" },
  { id: "echo",  name: "Transthoracic echocardiogram",    alias: "TTE, echo", category: "Imaging", freq: 0.18, cost: 4, code: "30053-4" },
  // Meds — dose strings are explicit, route adjacent
  { id: "metf",  name: "Metformin",                       alias: "Glucophage", category: "Meds", freq: 0.88, cost: 1, code: "RxN-6809",  note: "T2DM" },
  { id: "ins",   name: "Insulin lispro (sliding scale)",  alias: "Humalog",    category: "Meds", freq: 0.59, cost: 3, code: "RxN-86009", note: "post-meal coverage" },
  { id: "lis",   name: "Lisinopril",                      category: "Meds", freq: 0.77, cost: 1, code: "RxN-29046" },
  { id: "atorv", name: "Atorvastatin",                    alias: "Lipitor",    category: "Meds", freq: 0.69, cost: 1, code: "RxN-83367" },
  { id: "cefal", name: "Cefazolin",                       alias: "Ancef",      category: "Meds", freq: 0.34, cost: 2, code: "RxN-2191", allergyClass: ["penicillin", "cephalosporin"], note: "cross-reactive with penicillin allergy" },
  { id: "amox",  name: "Amoxicillin",                     category: "Meds", freq: 0.41, cost: 1, code: "RxN-723", allergyClass: ["penicillin"] },
  // Procedures
  { id: "fc",    name: "Foley catheter placement",        category: "Procedures", freq: 0.30, cost: 1, code: "CPT-51702" },
  { id: "lp",    name: "Lumbar puncture",                 category: "Procedures", freq: 0.06, cost: 3, code: "CPT-62270" },
  // Consults
  { id: "card",  name: "Cardiology consult",              category: "Consults", freq: 0.28, cost: 4 },
  { id: "endo",  name: "Endocrinology consult",           alias: "diabetes, thyroid", category: "Consults", freq: 0.21, cost: 4 },
  { id: "psych", name: "Psychiatry consult",              category: "Consults", freq: 0.14, cost: 3 },
];

const CATEGORY_ORDER: Category[] = ["Labs", "Imaging", "Meds", "Procedures", "Consults"];

// Default dose+route+frequency for med items in cart (catalogue stays atomic).
const MED_DOSING: Record<string, { dose: string; route: string; freq: string }> = {
  metf:  { dose: "500 mg",  route: "PO", freq: "BID with meals" },
  ins:   { dose: "per scale", route: "SC", freq: "AC + HS" },
  lis:   { dose: "10 mg",   route: "PO", freq: "Daily" },
  atorv: { dose: "40 mg",   route: "PO", freq: "QHS" },
  cefal: { dose: "1 g",     route: "IV", freq: "q8h" },
  amox:  { dose: "500 mg",  route: "PO", freq: "TID x 7d" },
};

const PATIENT: Patient = {
  family: "Patel",
  given: "Reema",
  mrn: "80124-5",
  dob: "1979-03-14",
  sex: "F",
  allergies: [
    { allergen: "Penicillin", severity: "severe", reaction: "rash" },
    { allergen: "Sulfa", severity: "moderate" },
  ],
  codeStatus: "Full Code",
  allergiesReviewedAt: "04 May 11:08",
};

const PATIENT_ALLERGY_CLASSES = ["penicillin", "sulfa"];
const ORDERED_BY = "Hartman, K., MD";
const NOW_LABEL = "14:08";

type CartEntry = { id: string; addedAt: string };

export default function OrderEntry() {
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartEntry[]>([
    { id: "hba1c", addedAt: "13:54" },
    { id: "metf", addedAt: "14:01" },
  ]);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [showError, setShowError] = useState(false);
  const signTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (signTimer.current != null) window.clearTimeout(signTimer.current);
    };
  }, []);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CATALOG;
    return CATALOG.filter((o) => {
      const hay = (o.name + " " + (o.alias ?? "") + " " + (o.note ?? "") + " " + (o.code ?? "")).toLowerCase();
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

  const inCart = (id: string) => cart.some((c) => c.id === id);
  const toggle = (id: string) => {
    setCart((c) => {
      if (c.some((e) => e.id === id)) return c.filter((e) => e.id !== id);
      return [...c, { id, addedAt: NOW_LABEL }];
    });
    setSigned(false);
  };

  const cartItems = cart
    .map((e) => ({ entry: e, item: CATALOG.find((o) => o.id === e.id)! }))
    .filter((x) => x.item);
  const cartConflicts = cartItems.filter((x) =>
    (x.item.allergyClass ?? []).some((c) => PATIENT_ALLERGY_CLASSES.includes(c)),
  );
  const cartPrereqs = cartItems.filter((x) => !!x.item.prereq);

  const handleSign = () => {
    if (cart.length === 0 || signing) return;
    if (cartConflicts.length > 0 || cartPrereqs.length > 0) return;
    setSigning(true);
    setShowError(false);
    signTimer.current = window.setTimeout(() => {
      setSigning(false);
      setSigned(true);
      setCart([]);
    }, 700);
  };

  const blocked = cartConflicts.length > 0 || cartPrereqs.length > 0;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Patient banner — allergies + code status one glance away. */}
        <PatientStrip patient={PATIENT} density="compact" />

        {/* Search bar */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Place orders
          </span>
          <div className="relative min-w-[180px] flex-1">
            <Search size={13} strokeWidth={1.6} aria-hidden className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value.replace(/^\s+/, ""))}
              placeholder="Search labs, imaging, meds, procedures, consults…"
              aria-label="Search the order catalog"
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
          <span
            role="status"
            aria-live="polite"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
          >
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Catalog · 04 May 2026
          </span>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px] divide-x divide-[var(--color-border)]">
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
                    {items.map((o) => {
                      const conflict = (o.allergyClass ?? []).some((c) =>
                        PATIENT_ALLERGY_CLASSES.includes(c),
                      );
                      return (
                        <li
                          key={o.id}
                          className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-2 hover:bg-[var(--color-surface)]"
                        >
                          <FrequencyBar freq={o.freq} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
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
                              {o.code && (
                                <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                                  {o.code}
                                </span>
                              )}
                              {conflict && (
                                <span className="inline-flex items-center gap-1">
                                  <AbnormalFlag
                                    severity="high-alert"
                                    reason="cross-reactive with patient allergy"
                                    size="sm"
                                  />
                                  <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
                                    allergy conflict
                                  </span>
                                </span>
                              )}
                              {o.prereq && (
                                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                                  · prereq · {o.prereq}
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
                            aria-pressed={inCart(o.id)}
                            aria-label={
                              inCart(o.id)
                                ? `Remove ${o.name} from order`
                                : `Add ${o.name} to order`
                            }
                            className={
                              inCart(o.id)
                                ? "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-xs)] border border-[color-mix(in_oklch,var(--color-accent-2)_70%,#000_8%)] bg-[color-mix(in_oklch,var(--color-accent-2)_18%,var(--color-surface))] text-[var(--color-accent-2)]"
                                : "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
                            }
                          >
                            {inCart(o.id) ? <Check size={11} /> : <Plus size={11} />}
                          </button>
                        </li>
                      );
                    })}
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
                  No catalog match for &ldquo;{q}&rdquo;. Refine the term, or click
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
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Ordering · {ORDERED_BY} · {NOW_LABEL}
              </p>
            </div>

            {cartConflicts.length > 0 && (
              <ErrorState
                variant="inline"
                title={`${cartConflicts.length} allergy conflict${cartConflicts.length === 1 ? "" : "s"} — resolve before signing.`}
                body={cartConflicts
                  .map((c) => c.item.name)
                  .join(", ")}
              />
            )}
            {showError && (
              <ErrorState
                variant="inline"
                title="Order submission failed."
                body="The order server didn't respond. Cart preserved — try again."
                onRetry={handleSign}
                onDismiss={() => setShowError(false)}
              />
            )}
            {signed && (
              <div
                role="status"
                aria-live="polite"
                className="border-b border-[var(--color-border)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-accent-2)]"
              >
                <span
                  aria-hidden
                  className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full"
                  style={{ background: "var(--color-accent-2)" }}
                />
                Signed {NOW_LABEL} · order routed
              </div>
            )}

            <ul className="flex-1 overflow-y-auto">
              {cartItems.map(({ entry, item: o }) => {
                const conflict = (o.allergyClass ?? []).some((c) =>
                  PATIENT_ALLERGY_CLASSES.includes(c),
                );
                const dosing = MED_DOSING[o.id];
                return (
                  <li
                    key={entry.id}
                    className="flex items-start gap-2 border-b border-[var(--color-border)] px-4 py-2"
                  >
                    <span aria-hidden className="mt-0.5 inline-flex h-4 w-4 items-center justify-center text-[var(--color-accent-2)]">
                      <Check size={11} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate text-[12px] text-[var(--color-text)]">
                        <span className="truncate font-medium">{o.name}</span>
                        {conflict && (
                          <AbnormalFlag
                            severity="high-alert"
                            reason="cross-reactive with patient allergy"
                            size="sm"
                          />
                        )}
                      </div>
                      {dosing && (
                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text)]">
                          {dosing.dose} {dosing.route}
                          <span className="mx-1.5 text-[var(--color-border-strong)]">·</span>
                          {dosing.freq}
                        </div>
                      )}
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                        {o.category}
                        <span className="mx-1.5 text-[var(--color-border-strong)]">·</span>
                        added {entry.addedAt}
                      </div>
                      {o.prereq && (
                        <div className="mt-1 inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
                          <AbnormalFlag severity="high-alert" reason={o.prereq} size="sm" />
                          complete to sign · {o.prereq}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(entry.id)}
                      aria-label={`Remove ${o.name}`}
                      className="text-[var(--color-text-muted)] transition-colors duration-[120ms] hover:text-[var(--color-text)]"
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
                onClick={handleSign}
                disabled={cart.length === 0 || blocked || signing}
                aria-busy={signing}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-[13px] text-[var(--color-accent-fg)] transition-[border-color,transform] duration-[120ms] hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:bg-[var(--color-surface)] disabled:text-[var(--color-text-muted)]"
              >
                {signing && (
                  <span
                    aria-hidden
                    className="block h-1.5 w-1.5 rounded-full bg-[var(--color-accent-fg)] animate-live-pulse"
                  />
                )}
                {signing ? "Signing…" : blocked ? "Resolve conflicts to sign" : "Confirm & sign"}
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

function FrequencyBar({ freq }: { freq: number }) {
  const ink = freq > 0.7 ? "var(--color-accent-2)" : "var(--color-text)";
  return (
    <div
      className="h-[2px] w-9 shrink-0 bg-[var(--color-border)]"
      aria-label={`${Math.round(freq * 100)}% frequency rank`}
    >
      <div
        className="h-full"
        style={{ width: `${Math.max(0, Math.min(1, freq)) * 100}%`, background: ink, opacity: 0.85 }}
      />
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
