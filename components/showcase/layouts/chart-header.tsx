import { ShieldAlert } from "lucide-react";
import { DotField } from "@/components/_kit/dot-field";
import { Timestamp } from "@/components/_kit/timestamp";

/**
 * Chart header — the sticky patient banner shown at the top of every clinical
 * surface (notes, orders, results). Identity, allergies, code status, and the
 * other facts a clinician needs to see *before* taking any action.
 *
 * Refactored 2026-05-05 against THE MEDICAL STANDARD:
 *  - Allergies use a discriminated state machine — `null` = "history not
 *    documented" (persimmon, role=alert), `[]` = "NKDA verified · capturedAt"
 *    (walnut), non-empty renders the per-allergen severity ribbon. Adds
 *    `unknown`/`unverified` rendering in the per-allergen list.
 *  - Isolation chip carries a leading `ShieldAlert` icon — never colour alone.
 *  - "Updated 14:08" → relative `<Timestamp staleAfter={5}>` so age is read
 *    before wall-clock and turns persimmon past 5m.
 *  - Quick-fact strip distinguishes `pending` / `not collected` from a value.
 *  - Dosing weight surfaced explicitly (the value clinicians cite when ordering).
 *  - Admit/Last-note/Last-labs include date so header is unambiguous across midnight.
 *  - Code status announces full sentence to AT; abbreviation expands on hover/focus.
 *  - 2x2 fact stack at narrow widths; right-column metadata reflows under headline.
 *  - PatientStrip-aligned API kept inline (this plate predates the strip and
 *    carries the bespoke stippled-monogram primitive). The shape mirrors the
 *    Patient type so it can swap to <PatientStrip density="hero"> in future.
 *
 * Pure server component apart from `<Timestamp>` (client island for relative
 * tick).
 */

type AllergenSeverity = "mild" | "moderate" | "severe" | "anaphylaxis" | "unknown";
type Allergen = { name: string; severity: AllergenSeverity };
type Allergies = Allergen[] | null;

type Fact =
  | { kind: "value"; label: string; value: string; ariaLabel?: string }
  | { kind: "pending"; label: string; note?: string }
  | { kind: "missing"; label: string; note?: string };

const PATIENT = {
  family: "PATEL",
  given: "Reema",
  preferred: "Mimi",
  initials: "RP",
  age: 47,
  sex: "F",
  mrn: "80124-5",
  dob: "1979-03-14",
  encounter: "ENC-2026-04-01-188",
  weight: 68, // total body weight, kg
  dosingWeight: 66.4, // adjusted body weight, kg
  height: 162, // cm
  bmi: 24.5,
  bmiCalculatedOn: "04 May",
  codeStatus: "FULL", // full code
  codeStatusFull: "Full Code — resuscitate",
  isolation: "Contact precautions",
  attending: "Hartman, K., MD",
  location: "Med-Surg 4 · 412-B",
  language: "English (preferred)",
  interpreterNeeded: false,
  // Last successful chart sync — drives both the "Updated …" stamp and any
  // banner if the chart-fetch fails.
  syncedAt: "2026-05-05T14:08:00Z",
  // Allergies were last reviewed at admission per nursing protocol.
  allergiesReviewedAt: "04 May 14:08",
};

const ALLERGIES: Allergies = [
  { name: "Penicillin", severity: "severe" },
  { name: "Sulfa drugs", severity: "moderate" },
  { name: "Latex", severity: "mild" },
];

const QUICK_FACTS: Fact[] = [
  { kind: "value", label: "Admit", value: "04 May, 06:18", ariaLabel: "Admitted May 4 at 06:18" },
  { kind: "value", label: "LOS", value: "2 d, 7 h" },
  { kind: "value", label: "Last note", value: "Hartman · 04 May 11:42" },
  { kind: "pending", label: "Last labs", note: "CMP ordered 13:30" },
];

export default function ChartHeader() {
  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Top rule — small mono caps establishing the catalogue voice. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <span>Chart · {PATIENT.encounter}</span>
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-[var(--color-text-muted)]">Updated</span>
            <Timestamp
              value={PATIENT.syncedAt}
              format="absolute"
              ariaLabel="Chart last synced May 5, 14:08"
            />
            <span aria-hidden className="mx-1 inline-block h-1 w-1 translate-y-[-2px] rounded-full bg-[var(--color-border-strong)]" />
            <span>{PATIENT.location}</span>
          </span>
        </div>

        {/* Identity row — 2-up at narrow, 3-up at wide. */}
        <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-start">
          <Monogram initials={PATIENT.initials} />
          <div className="min-w-0">
            <h1
              className="font-display text-[28px] leading-[1.05] tracking-[-0.022em] text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30' }}
            >
              {PATIENT.family},{" "}
              <span className="font-normal italic text-[var(--color-text-muted)]">
                {PATIENT.given}
              </span>
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              "Mimi" · {PATIENT.age} y · {PATIENT.sex} · MRN {PATIENT.mrn}
              <span className="mx-2 inline-block h-1 w-1 translate-y-[-2px] rounded-full bg-[var(--color-border-strong)]" />
              DOB {PATIENT.dob}
            </p>

            <CodeStatusRule
              status={PATIENT.codeStatus}
              fullSentence={PATIENT.codeStatusFull}
            />
          </div>
          {/* Right metadata column — collapses under headline at narrow widths. */}
          <div className="col-span-2 flex flex-wrap items-start gap-x-4 gap-y-1.5 text-[11px] leading-[1.6] text-[var(--color-text-muted)] sm:col-span-1 sm:flex-col sm:items-end sm:gap-y-1 sm:text-right">
            <div>
              <span className="text-[var(--color-text)] tabular-nums">{PATIENT.weight} kg</span>
              <span className="ml-2">· BMI <span className="tabular-nums">{PATIENT.bmi}</span></span>
              <span
                className="ml-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
                title={`BMI calculated ${PATIENT.bmiCalculatedOn}`}
              >
                calc {PATIENT.bmiCalculatedOn}
              </span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Dosing wt{" "}
              <span className="text-[var(--color-text)] tabular-nums">
                {PATIENT.dosingWeight} kg
              </span>
              <span className="mx-1.5 opacity-60">·</span>
              Ht{" "}
              <span className="text-[var(--color-text)] tabular-nums">
                {PATIENT.height} cm
              </span>
            </div>
            <div>
              Attending{" "}
              <span className="text-[var(--color-text)]">{PATIENT.attending}</span>
            </div>
            {/* Isolation chip — leading icon + label + colour. NEVER colour alone. */}
            <span
              role="status"
              aria-label={PATIENT.isolation}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[color-mix(in_oklch,var(--color-warning)_30%,var(--color-border))] bg-[color-mix(in_oklch,var(--color-warning)_10%,var(--color-bg))] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[color-mix(in_oklch,var(--color-warning)_60%,var(--color-text))]"
            >
              <ShieldAlert
                aria-hidden
                size={11}
                strokeWidth={1.8}
                style={{ color: "var(--color-warning)" }}
              />
              {PATIENT.isolation}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {PATIENT.language}
              {PATIENT.interpreterNeeded && (
                <span className="ml-1.5 text-[var(--color-accent)]">· interpreter</span>
              )}
            </span>
          </div>
        </div>

        {/* Allergy ribbon — discriminated on the type of state. */}
        <AllergyRibbon
          allergies={ALLERGIES}
          reviewedAt={PATIENT.allergiesReviewedAt}
        />

        {/* Quick-fact strip — 2×2 at narrow, 4-up wider. */}
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--color-border)] border-b border-[var(--color-border)] bg-[var(--color-bg)] text-[12px] sm:grid-cols-4 sm:divide-y-0">
          {QUICK_FACTS.map((f) => (
            <FactCell key={f.label} fact={f} />
          ))}
        </div>

        {/* Spacer fills the bottom of the plate without claiming surface. */}
        <div className="flex-1 bg-[var(--color-bg)]" />
      </div>
    </div>
  );
}

/**
 * Stippled monogram. Bridson dots clipped to a circle. Decorative — initials
 * are the accessible label.
 */
function Monogram({ initials }: { initials: string }) {
  return (
    <div
      className="relative h-16 w-16 shrink-0"
      role="img"
      aria-label={`Patient initials ${initials}`}
    >
      <DotField
        aria-hidden="true"
        shape={{ kind: "circle", cx: 32, cy: 32, r: 32 }}
        spacing={3.6}
        dotRadius={1}
        baseDensity={0.85}
        accentRatio={0.18}
        seed={4012}
        density={(x, y, w, h) => {
          const dx = (x - w / 2) / (w / 2);
          const dy = (y - h / 2) / (h / 2);
          const r = Math.sqrt(dx * dx + dy * dy);
          return Math.max(0.1, 1 - r * 0.7);
        }}
        className="absolute inset-0"
      />
      <div
        aria-hidden
        className="absolute inset-0 grid place-items-center font-mono text-[14px] tracking-[0.04em] text-[var(--color-text)]"
      >
        {initials}
      </div>
    </div>
  );
}

/**
 * Code status rule. The most consequential clinical fact below the name.
 * Quiet typography so it doesn't read as a badge — set in mono caps,
 * pre-fixed with a small Federal Blue dot, framed by stippled rules.
 *
 * The visible abbreviation (`FULL`) is paired with an aria-label sentence
 * (`Code status: Full Code — resuscitate`) and a `title` so the abbreviation
 * expands on hover/focus.
 */
function CodeStatusRule({
  status,
  fullSentence,
}: {
  status: string;
  fullSentence: string;
}) {
  return (
    <div className="mt-3 flex items-center gap-3 text-[11px]">
      <DotRule width={48} side="left" />
      <span
        role="status"
        aria-label={`Code status: ${fullSentence}`}
        title={fullSentence}
        className="inline-flex items-center gap-2 outline-none focus-visible:underline"
        tabIndex={0}
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--color-accent-2)" }}
        />
        <span className="font-mono uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Code{" "}
          <span className="font-medium text-[var(--color-text)]">
            {status.toUpperCase()}
          </span>
        </span>
      </span>
      <DotRule width={140} side="right" />
    </div>
  );
}

function DotRule({ width, side }: { width: number; side: "left" | "right" }) {
  return (
    <div aria-hidden className="h-3 shrink-0" style={{ width: `${width}px` }}>
      <DotField
        shape={{ kind: "rect", width, height: 12 }}
        spacing={4}
        dotRadius={0.85}
        baseDensity={0.9}
        accentRatio={0}
        seed={width + (side === "left" ? 1 : 2)}
        density={(x, _y, w) => {
          const t = x / w;
          return side === "left" ? t : 1 - t;
        }}
        className="h-full w-full"
      />
    </div>
  );
}

/**
 * Allergy ribbon — discriminated state vocabulary. The three branches are
 * NEVER conflated:
 *
 *   - `null`  → role=alert, persimmon, "Allergy history not documented."
 *   - `[]`    → walnut, "NKDA verified · ${reviewedAt}". Different from null.
 *   - `[...]` → burden bar (length-as-severity) + per-allergen severity labels.
 *
 * Up to 5 allergens render inline; a 6th+ collapses to "+N more" trigger.
 */
function AllergyRibbon({
  allergies,
  reviewedAt,
}: {
  allergies: Allergies;
  reviewedAt: string;
}) {
  if (allergies === null) {
    return (
      <div
        role="alert"
        aria-label="Allergy history not documented"
        className="flex items-center gap-3 border-b border-[color-mix(in_oklch,var(--color-accent)_30%,var(--color-border))] bg-[color-mix(in_oklch,var(--color-accent)_6%,var(--color-surface))] px-6 py-2.5 text-[12px]"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Allergies
        </span>
        <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--color-accent)" }}
          />
          allergy history not documented
        </span>
      </div>
    );
  }

  if (allergies.length === 0) {
    return (
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5 text-[12px]">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Allergies
        </span>
        <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
        <span
          aria-label={`No known drug allergies, verified ${reviewedAt}`}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--color-text-muted)" }}
          />
          NKDA verified
          <span className="ml-1 tabular-nums opacity-80">· {reviewedAt}</span>
        </span>
      </div>
    );
  }

  // Burden formula: anaphylaxis 1.2, severe 1, moderate 0.5, mild 0.2,
  // unknown 0.1. Normalised against an arbitrary ceiling of 3.
  const rawBurden = allergies.reduce((s, a) => {
    if (a.severity === "anaphylaxis") return s + 1.2;
    if (a.severity === "severe") return s + 1;
    if (a.severity === "moderate") return s + 0.5;
    if (a.severity === "mild") return s + 0.2;
    return s + 0.1; // unknown
  }, 0);
  const burden = Math.min(1, rawBurden / 3);
  const hasAnaphylaxis = allergies.some((a) => a.severity === "anaphylaxis");
  const hasSevere = allergies.some((a) => a.severity === "severe");
  const hasModerate = allergies.some((a) => a.severity === "moderate");
  const indicatorColor = hasAnaphylaxis || hasSevere
    ? "var(--color-danger)"
    : hasModerate
      ? "var(--color-warning)"
      : "var(--color-border-strong)";

  const visible = allergies.slice(0, 5);
  const overflow = allergies.length - visible.length;

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Allergies
        </span>
        {/* Severity bar — burden as line length. */}
        <span
          aria-hidden
          className="relative inline-block h-[2px] w-12 overflow-hidden rounded-[1px] bg-[var(--color-border)]"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-[1px]"
            style={{ width: `${burden * 100}%`, background: indicatorColor }}
          />
        </span>
        <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
        <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {visible.map((a) => (
            <li
              key={a.name}
              className="flex items-baseline gap-1.5"
              aria-label={`${a.severity} allergy: ${a.name}`}
            >
              <span className="font-medium text-[var(--color-text)]">
                {a.name}
              </span>
              {a.severity === "unknown" ? (
                <span
                  className="inline-flex items-baseline gap-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
                  aria-label="severity unverified"
                >
                  <span aria-hidden>?</span>
                  unverified
                </span>
              ) : (
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.14em]"
                  style={{
                    color:
                      a.severity === "anaphylaxis" || a.severity === "severe"
                        ? "var(--color-danger)"
                        : a.severity === "moderate"
                          ? "var(--color-warning)"
                          : "var(--color-text-muted)",
                  }}
                >
                  {a.severity}
                </span>
              )}
            </li>
          ))}
          {overflow > 0 && (
            <li>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                +{overflow} more
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function FactCell({ fact }: { fact: Fact }) {
  return (
    <div className="px-6 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {fact.label}
      </div>
      {fact.kind === "value" && (
        <div
          className="mt-0.5 text-[var(--color-text)]"
          aria-label={fact.ariaLabel}
        >
          {fact.value}
        </div>
      )}
      {fact.kind === "pending" && (
        <div className="mt-0.5 inline-flex items-baseline gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            <span
              aria-hidden
              className="mr-1 inline-block h-1 w-1 translate-y-[-1px] rounded-full bg-[var(--color-warning)]"
            />
            pending
          </span>
          {fact.note && (
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {fact.note}
            </span>
          )}
        </div>
      )}
      {fact.kind === "missing" && (
        <div className="mt-0.5 inline-flex items-baseline gap-1.5">
          <span className="text-[var(--color-text-muted)]">—</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            not collected
          </span>
          {fact.note && (
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {fact.note}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
