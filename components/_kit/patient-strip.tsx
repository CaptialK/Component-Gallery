import * as React from "react";
import { ClinicalValue } from "./clinical-value";
import { cn } from "@/lib/cn";

/**
 * PatientStrip — persistent patient banner. Identity + allergies + code
 * status + (hero only) weight & height. Three densities cover every clinical
 * surface in the gallery.
 *
 * Critical safety choices:
 *
 *  - `allergies: null` → "Allergy history not documented" with a persimmon
 *    dot. Empty is dangerous — a missing field is NOT the same as "no known
 *    allergies." The API forces this distinction and the UI renders it.
 *  - `allergies: []`   → "NKDA verified" with walnut dot + capturedAt mono
 *    timestamp. The verified-empty case.
 *  - Severe / anaphylaxis allergens always render at full intensity, even in
 *    the most compact `block` density — they get a leading warning glyph.
 *  - Allergy chip uses persimmon ink + warning glyph + label, not colour
 *    alone (CLAUDE.md rule).
 *  - aria-label assembles the sentence a screen reader will read on hour 11.
 *
 * Server-renderable. No state. The only interactive surfaces consumers tend
 * to add (an allergy popover, a code-status menu) belong on the consumer side.
 */

export type AllergySeverity =
  | "mild"
  | "moderate"
  | "severe"
  | "anaphylaxis"
  | "unknown";

export type Allergy = {
  allergen: string;
  severity: AllergySeverity;
  reaction?: string;
};

export type CodeStatus =
  | "Full Code"
  | "DNR"
  | "DNI"
  | "Comfort Care"
  | "AND";

export type Patient = {
  family: string;
  given: string;
  mrn: string;
  dob: string; // ISO
  sex: "F" | "M" | "X" | "U";
  /**
   * `null` = NOT documented (different from `[]` = NKDA verified).
   * Forced as a discriminated case on purpose.
   */
  allergies: Allergy[] | null;
  codeStatus?: CodeStatus;
  weight?: { value: number; unit: "kg" | "lb"; capturedAt?: string };
  height?: { value: number; unit: "cm" | "in"; capturedAt?: string };
  /** ISO string when allergies were last reviewed; surfaces in NKDA chip. */
  allergiesReviewedAt?: string;
};

export type PatientStripProps = {
  patient: Patient;
  density: "hero" | "compact" | "block";
  className?: string;
};

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function fmtDob(dob: string): string {
  const d = new Date(dob);
  return `${MONTH_SHORT[d.getMonth()]} ${pad2(d.getDate())}, ${d.getFullYear()}`;
}

function severityRank(s: AllergySeverity): number {
  switch (s) {
    case "anaphylaxis": return 4;
    case "severe":      return 3;
    case "moderate":    return 2;
    case "mild":        return 1;
    case "unknown":     return 0;
  }
}

function isHighRisk(s: AllergySeverity): boolean {
  return s === "severe" || s === "anaphylaxis";
}

function severityInk(s: AllergySeverity): string {
  if (s === "anaphylaxis") {
    return "color-mix(in oklch, var(--color-accent) 75%, #000 25%)";
  }
  if (s === "severe") return "var(--color-accent)";
  if (s === "moderate") return "var(--color-warning)";
  return "var(--color-text-muted)";
}

function topSeverity(allergies: Allergy[]): AllergySeverity {
  return allergies.reduce<AllergySeverity>(
    (top, a) => (severityRank(a.severity) > severityRank(top) ? a.severity : top),
    "unknown",
  );
}

function buildPatientAria(p: Patient): string {
  const age = ageFromDob(p.dob);
  return `Patient ${p.family}, ${p.given}, MRN ${p.mrn}, DOB ${fmtDob(p.dob)}, ${age} year old ${p.sex}`;
}

/**
 * Severity glyph — small inline triangle/diamond/circle that pairs with the
 * label. Anaphylaxis uses a filled diamond (max distinctiveness); severe a
 * filled triangle; moderate an outline triangle; mild a small filled circle;
 * unknown a hollow square.
 */
function AllergyGlyph({
  severity,
  px = 9,
}: {
  severity: AllergySeverity;
  px?: number;
}) {
  const ink = severityInk(severity);
  const half = px / 2;
  if (severity === "anaphylaxis") {
    return (
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden className="block">
        <path
          d={`M ${half} 1 L ${px - 1} ${half} L ${half} ${px - 1} L 1 ${half} Z`}
          fill={ink}
        />
      </svg>
    );
  }
  if (severity === "severe") {
    return (
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden className="block">
        <path
          d={`M ${half} 1 L ${px - 1} ${px - 1} L 1 ${px - 1} Z`}
          fill={ink}
        />
      </svg>
    );
  }
  if (severity === "moderate") {
    return (
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden className="block">
        <path
          d={`M ${half} 1 L ${px - 1} ${px - 1} L 1 ${px - 1} Z`}
          fill="none"
          stroke={ink}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (severity === "mild") {
    return (
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden className="block">
        <circle cx={half} cy={half} r={half - 2} fill={ink} />
      </svg>
    );
  }
  // unknown — hollow square
  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden className="block">
      <rect x={1.5} y={1.5} width={px - 3} height={px - 3} fill="none" stroke={ink} strokeWidth={1} />
    </svg>
  );
}

/**
 * Allergy "length-as-burden" bar (the chart-header vocabulary), scaled to
 * total severity-equivalents. Hero uses this; compact/block use chip+stack.
 */
function BurdenBar({ allergies }: { allergies: Allergy[] }) {
  const raw = allergies.reduce(
    (s, a) =>
      s +
      (a.severity === "anaphylaxis"
        ? 1.2
        : a.severity === "severe"
          ? 1
          : a.severity === "moderate"
            ? 0.5
            : a.severity === "mild"
              ? 0.2
              : 0.1),
    0,
  );
  const burden = Math.min(1, raw / 3);
  const top = topSeverity(allergies);
  const ink = severityInk(top);
  return (
    <span
      aria-hidden
      className="relative inline-block h-[2px] w-12 overflow-hidden rounded-[1px] bg-[var(--color-border)]"
    >
      <span
        className="absolute inset-y-0 left-0 rounded-[1px]"
        style={{ width: `${burden * 100}%`, background: ink }}
      />
    </span>
  );
}

/** Code-status chip — mono caps, leading dot. */
function CodeStatusChip({ status }: { status: CodeStatus }) {
  const isFull = status === "Full Code";
  const dot = isFull ? "var(--color-accent-2)" : "var(--color-accent)";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text)]">
      <span aria-hidden className="h-1 w-1 rounded-full" style={{ background: dot }} />
      {status}
    </span>
  );
}

/**
 * Allergies block — three branches:
 *  - null: persimmon dot + "Allergy history not documented" (DANGEROUS)
 *  - []:   walnut dot + "NKDA verified"
 *  - non-empty: severity glyphs + names with severity labels
 */
function AllergiesHero({
  allergies,
  reviewedAt,
}: {
  allergies: Allergy[] | null;
  reviewedAt?: string;
}) {
  if (allergies === null) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 text-[12px]"
        aria-label="Allergy history not documented"
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--color-accent)" }}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
          allergy history not documented
        </span>
      </div>
    );
  }

  if (allergies.length === 0) {
    return (
      <div
        className="flex items-center gap-2 text-[12px]"
        aria-label={`No known drug allergies, verified${reviewedAt ? ` ${reviewedAt}` : ""}`}
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--color-text-muted)" }}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          NKDA verified
          {reviewedAt && (
            <span className="ml-2 tabular-nums">· {reviewedAt}</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        Allergies
      </span>
      <BurdenBar allergies={allergies} />
      <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {allergies.map((a) => (
          <li key={a.allergen} className="flex items-center gap-1.5">
            <AllergyGlyph severity={a.severity} px={9} />
            <span className="font-medium text-[var(--color-text)]">{a.allergen}</span>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.14em]"
              style={{ color: severityInk(a.severity) }}
            >
              {a.severity}
            </span>
            {a.reaction && (
              <span className="text-[11px] italic text-[var(--color-text-muted)]">
                · {a.reaction}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AllergiesCompact({
  allergies,
  reviewedAt,
}: {
  allergies: Allergy[] | null;
  reviewedAt?: string;
}) {
  if (allergies === null) {
    return (
      <span
        role="alert"
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--color-accent)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-accent)]"
        aria-label="Allergy history not documented"
      >
        <span
          aria-hidden
          className="h-1 w-1 rounded-full"
          style={{ background: "var(--color-accent)" }}
        />
        allergies · not documented
      </span>
    );
  }
  if (allergies.length === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
        aria-label={`No known drug allergies${reviewedAt ? ` verified ${reviewedAt}` : ""}`}
      >
        <span
          aria-hidden
          className="h-1 w-1 rounded-full"
          style={{ background: "var(--color-text-muted)" }}
        />
        NKDA verified
      </span>
    );
  }
  // chip with severity-icon stack
  const top = topSeverity(allergies);
  const ink = severityInk(top);
  // Stack at most 3 distinct severity icons (highest-rank first), so the
  // chip stays scannable at compact density.
  const seen = new Set<AllergySeverity>();
  const stack: AllergySeverity[] = [];
  for (const a of [...allergies].sort(
    (x, y) => severityRank(y.severity) - severityRank(x.severity),
  )) {
    if (!seen.has(a.severity)) {
      seen.add(a.severity);
      stack.push(a.severity);
    }
    if (stack.length === 3) break;
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]"
      style={{
        borderColor: ink,
        color: ink,
      }}
      aria-label={`Allergies, ${allergies.length} documented, top severity ${top}`}
    >
      <span aria-hidden className="inline-flex items-center gap-0.5">
        {stack.map((s, i) => (
          <AllergyGlyph key={i} severity={s} px={8} />
        ))}
      </span>
      allergies · {allergies.length} documented
    </span>
  );
}

function AllergiesBlock({
  allergies,
}: {
  allergies: Allergy[] | null;
}) {
  if (allergies === null) {
    return (
      <span
        role="alert"
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent)]"
        aria-label="Allergy history not documented"
      >
        <span
          aria-hidden
          className="h-1 w-1 rounded-full"
          style={{ background: "var(--color-accent)" }}
        />
        not documented
      </span>
    );
  }
  if (allergies.length === 0) return null;
  // Only show a leading glyph when there's a severe/anaphylaxis allergen.
  // For mild-only, allergies are legitimate but not a priority surface in
  // a cross-patient list — the consumer can drill in.
  const top = topSeverity(allergies);
  if (!isHighRisk(top)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em]"
      style={{ color: severityInk(top) }}
      aria-label={`${top} allergy on file`}
    >
      <AllergyGlyph severity={top} px={8} />
      {top}
    </span>
  );
}

export function PatientStrip({ patient, density, className }: PatientStripProps) {
  const aria = buildPatientAria(patient);
  const age = ageFromDob(patient.dob);

  if (density === "hero") {
    return (
      <header
        aria-label={aria}
        className={cn(
          "flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1
              className="font-display italic text-[22px] leading-tight tracking-[-0.02em] text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
            >
              {patient.family}, {patient.given}
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              <span className="tabular-nums">{age}y</span>
              <span className="mx-1.5">·</span>
              {patient.sex}
              <span className="mx-2 inline-block h-1 w-1 translate-y-[-2px] rounded-full bg-[var(--color-border-strong)]" />
              MRN <span className="text-[var(--color-text)]">{patient.mrn}</span>
              <span className="mx-2 inline-block h-1 w-1 translate-y-[-2px] rounded-full bg-[var(--color-border-strong)]" />
              DOB <span className="tabular-nums text-[var(--color-text)]">{fmtDob(patient.dob)}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {patient.codeStatus && <CodeStatusChip status={patient.codeStatus} />}
            <div className="flex items-baseline gap-4">
              {patient.weight && (
                <ClinicalValue
                  value={patient.weight.value}
                  unit={patient.weight.unit}
                  size="lg"
                  ariaLabel={`Weight ${patient.weight.value} ${patient.weight.unit}`}
                />
              )}
              {patient.height && (
                <ClinicalValue
                  value={patient.height.value}
                  unit={patient.height.unit}
                  size="lg"
                  ariaLabel={`Height ${patient.height.value} ${patient.height.unit}`}
                />
              )}
            </div>
          </div>
        </div>
        <AllergiesHero
          allergies={patient.allergies}
          reviewedAt={patient.allergiesReviewedAt}
        />
      </header>
    );
  }

  if (density === "compact") {
    return (
      <header
        aria-label={aria}
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5",
          className,
        )}
      >
        <AllergiesCompact
          allergies={patient.allergies}
          reviewedAt={patient.allergiesReviewedAt}
        />
        <span className="text-[13px] text-[var(--color-text)]">
          <span className="font-medium">{patient.family}, {patient.given}</span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          <span className="tabular-nums">{age}y</span>
          <span className="mx-1.5">·</span>
          {patient.sex}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          MRN <span className="text-[var(--color-text)]">{patient.mrn}</span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          DOB <span className="tabular-nums text-[var(--color-text)]">{fmtDob(patient.dob)}</span>
        </span>
        {patient.codeStatus && <CodeStatusChip status={patient.codeStatus} />}
      </header>
    );
  }

  // block — cross-patient list rows; dense, but tap-target ≥ 44px.
  return (
    <div
      aria-label={aria}
      className={cn(
        "flex min-h-[44px] items-center gap-3 px-3 py-2",
        className,
      )}
    >
      <AllergiesBlock allergies={patient.allergies} />
      <span className="text-[13px] text-[var(--color-text)]">
        <span className="font-medium">{patient.family}, {patient.given}</span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        MRN <span className="text-[var(--color-text)]">{patient.mrn}</span>
      </span>
    </div>
  );
}
