import { DotField } from "@/components/_kit/dot-field";

/**
 * Chart header — the sticky patient banner shown at the top of every clinical
 * surface (notes, orders, results). Identity, allergies, code status, and the
 * other facts a clinician needs to see *before* taking any action.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - The avatar is a Bridson stipple of the patient's monogram; not a photo,
 *    not an icon. "This is who the chart is about" rendered in the same
 *    primitive as the rest of the system.
 *  - The allergy ribbon uses density-as-severity. NKDA reads as a sparse
 *    walnut field; a real allergen list reads as denser persimmon. Severity
 *    isn't a coloured tag — it's literal coverage.
 *  - Code status sits in a quiet stippled rule beneath the headline so the
 *    most consequential clinical fact has its own typographic register.
 *
 * Pure server component.
 */

type Allergen = { name: string; severity: "mild" | "moderate" | "severe" };

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
  weight: 68, // kg
  bmi: 24.5,
  codeStatus: "Full",
  isolation: "Contact precautions",
  attending: "Hartman, K., MD",
  location: "Med-Surg 4 · 412-B",
};

const ALLERGIES: Allergen[] = [
  { name: "Penicillin", severity: "severe" },
  { name: "Sulfa drugs", severity: "moderate" },
  { name: "Latex", severity: "mild" },
];

export default function ChartHeader() {
  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Top rule — small mono caps establishing the catalogue voice. */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <span>Chart · {PATIENT.encounter}</span>
          <span>Updated 14:08 · {PATIENT.location}</span>
        </div>

        {/* Identity row */}
        <div className="grid grid-cols-[auto_1fr_auto] items-start gap-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6">
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

            <CodeStatusRule status={PATIENT.codeStatus} />
          </div>
          <div className="text-right text-[11px] leading-[1.6] text-[var(--color-text-muted)]">
            <div>
              <span className="text-[var(--color-text)]">{PATIENT.weight} kg</span>
              <span className="ml-2">· BMI {PATIENT.bmi}</span>
            </div>
            <div className="mt-0.5">
              Attending{" "}
              <span className="text-[var(--color-text)]">{PATIENT.attending}</span>
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[color-mix(in_oklch,var(--color-warning)_30%,var(--color-border))] bg-[color-mix(in_oklch,var(--color-warning)_10%,var(--color-bg))] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[color-mix(in_oklch,var(--color-warning)_60%,var(--color-text))]">
              <span
                aria-hidden
                className="h-1 w-1 rounded-full"
                style={{ background: "var(--color-warning)" }}
              />
              {PATIENT.isolation}
            </div>
          </div>
        </div>

        {/* Allergy ribbon — density-as-severity. Persimmon and walnut Bridson
            field whose coverage encodes total allergy burden. */}
        <AllergyRibbon allergies={ALLERGIES} />

        {/* Quick-fact strip — the things every order set re-asks. */}
        <div className="grid grid-cols-4 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)] bg-[var(--color-bg)] text-[12px]">
          <Fact label="Admit" value="04 May, 06:18" />
          <Fact label="LOS" value="2 d, 7 h" />
          <Fact label="Last note" value="Hartman · 11:42" />
          <Fact label="Last labs" value="CMP · 09:55" />
        </div>

        {/* Spacer fills the bottom of the plate without claiming surface. */}
        <div className="flex-1 bg-[var(--color-bg)]" />
      </div>
    </div>
  );
}

/** Stippled monogram. Bridson dots clipped to a circle. */
function Monogram({ initials }: { initials: string }) {
  return (
    <div className="relative h-16 w-16 shrink-0">
      <DotField
        shape={{ kind: "circle", cx: 32, cy: 32, r: 32 }}
        spacing={3.6}
        dotRadius={1}
        baseDensity={0.85}
        accentRatio={0.18}
        seed={4012}
        density={(x, y, w, h) => {
          // Soft edge: density falls off near the rim so the disc reads as
          // material, not a plate.
          const dx = (x - w / 2) / (w / 2);
          const dy = (y - h / 2) / (h / 2);
          const r = Math.sqrt(dx * dx + dy * dy);
          return Math.max(0.1, 1 - r * 0.7);
        }}
        className="absolute inset-0"
      />
      <div className="absolute inset-0 grid place-items-center font-mono text-[14px] tracking-[0.04em] text-[var(--color-text)]">
        {initials}
      </div>
    </div>
  );
}

/**
 * Code status rule. The single most consequential clinical fact below the
 * name. Quiet typography so it doesn't read as a badge — set in mono caps,
 * pre-fixed with a small Federal Blue dot, framed by a stippled rule on
 * either side. The rules are Bridson dot trails, not solid lines.
 */
function CodeStatusRule({ status }: { status: string }) {
  return (
    <div className="mt-3 flex items-center gap-3 text-[11px]">
      <DotRule width={48} side="left" />
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
      <DotRule width={140} side="right" />
    </div>
  );
}

function DotRule({ width, side }: { width: number; side: "left" | "right" }) {
  return (
    <div
      aria-hidden
      className="h-3 shrink-0"
      style={{ width: `${width}px` }}
    >
      <DotField
        shape={{ kind: "rect", width, height: 12 }}
        spacing={4}
        dotRadius={0.85}
        baseDensity={0.9}
        accentRatio={0}
        seed={width + (side === "left" ? 1 : 2)}
        density={(x, _y, w) => {
          // Trail off toward the far edge so the rule reads as a fade-in
          // (left side) or fade-out (right side).
          const t = x / w;
          return side === "left" ? t : 1 - t;
        }}
        className="h-full w-full"
      />
    </div>
  );
}

/**
 * Allergy ribbon. The dot field's *density* maps to allergy burden:
 *   - severe   → 0.95
 *   - moderate → 0.55
 *   - mild     → 0.25
 *   - NKDA     → 0.04 (a near-empty field — present, but signalling absence)
 *
 * Coverage is bounded to the locked print-canon range. Persimmon-tinted dots
 * for severe allergens; walnut for moderate; sparse-walnut for mild and NKDA.
 */
function AllergyRibbon({ allergies }: { allergies: Allergen[] }) {
  const burden =
    allergies.reduce(
      (s, a) =>
        s + (a.severity === "severe" ? 1 : a.severity === "moderate" ? 0.5 : 0.2),
      0,
    ) || 0.04;
  // Map burden to density inside [0.06, 0.85] — the visual range we want to
  // walk between "you basically don't have to think about this" and "stop
  // and read this."
  const density = Math.min(0.85, Math.max(0.06, burden * 0.35));
  const accentRatio = allergies.some((a) => a.severity === "severe")
    ? 0.6
    : allergies.some((a) => a.severity === "moderate")
      ? 0.25
      : 0.05;

  return (
    <div className="relative border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Density field — full-bleed across the ribbon. Persimmon-leaning. */}
      <div className="absolute inset-0 opacity-90">
        <DotField
          shape={{ kind: "rect", width: 880, height: 48 }}
          spacing={4.2}
          dotRadius={1}
          baseDensity={density}
          accentRatio={accentRatio}
          seed={2049}
          className="h-full w-full"
        />
      </div>

      <div className="relative flex items-center gap-3 px-6 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Allergies
        </span>
        <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
        <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px]">
          {allergies.length === 0 ? (
            <li className="italic text-[var(--color-text-muted)]">NKDA</li>
          ) : (
            allergies.map((a) => (
              <li key={a.name} className="flex items-baseline gap-1.5">
                <span className="font-medium text-[var(--color-text)]">
                  {a.name}
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.14em]"
                  style={{
                    color:
                      a.severity === "severe"
                        ? "var(--color-danger)"
                        : a.severity === "moderate"
                          ? "var(--color-warning)"
                          : "var(--color-text-muted)",
                  }}
                >
                  {a.severity}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-[var(--color-text)]">{value}</div>
    </div>
  );
}
