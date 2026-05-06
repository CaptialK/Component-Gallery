import { AbnormalFlag, type AbnormalSeverity } from "@/components/_kit/abnormal-flag";
import { ReferenceRange } from "@/components/_kit/reference-range";

/**
 * Lab panel — comprehensive metabolic + complete blood count, with each value
 * placed on a reference-range ribbon.
 *
 * Refactored 2026-05-05 (Builder C, medical standard pass):
 *  - Panic / critical rows carry an <AbnormalFlag> + left-edge accent strip.
 *    The H/L/HH letter alone wasn't enough — at hour-11 reading distance a
 *    lone capital is below visual threshold for "stop and call."
 *  - Real lab metadata: amended / corrected / external-source meta-states
 *    surface as a small mono-cap eyebrow per row. Per-row resulted timestamp
 *    appears in the right-gutter.
 *  - Specimen source visible in panel header (serum / whole blood). MRN added.
 *  - Partial panel: CBC reads "4 of 5 returned · Lactate pending" since
 *    Lactate hasn't resulted, instead of inheriting the panel-level "resulted
 *    08:42" string which was misleading.
 *  - The reference-range ribbon now composes the shared `<ReferenceRange>`
 *    primitive (extracted from this plate's RangeRibbon during the kit
 *    expansion).
 *
 * Pure server component. Realistic reference ranges; mock values, no PHI.
 */

type Severity = "normal" | "low" | "high" | "panic-low" | "panic-high";

/** ISMP/standard meta-flags surfaced per row. */
type Meta = "amended" | "corrected" | "external" | "verified";

type Lab = {
  name: string;
  short?: string;
  /** Optional LOINC code; surfaces in tooltip / SR description. */
  loinc?: string;
  value: number | null;        // null = pending
  unit: string;
  refLo: number;
  refHi: number;
  view?: [number, number];
  delta?: number;
  /** Per-row resulted timestamp (HH:MM today). */
  resultedAt?: string;
  /** Optional meta-state — amended / corrected / external / verified. */
  meta?: Meta;
};

type Panel = {
  name: string;
  collected: string;
  resulted: string;
  /** Specimen source — serum / plasma / whole-blood / urine. */
  source: "serum" | "plasma" | "whole blood" | "urine";
  rows: Lab[];
};

const PANELS: Panel[] = [
  {
    name: "Comprehensive Metabolic Panel",
    collected: "06:50",
    resulted: "09:55",
    source: "serum",
    rows: [
      { name: "Sodium", short: "Na", loinc: "2951-2", value: 138, unit: "mEq/L", refLo: 135, refHi: 145, delta: -1, resultedAt: "09:51", meta: "verified" },
      { name: "Potassium", short: "K", loinc: "2823-3", value: 3.3, unit: "mEq/L", refLo: 3.5, refHi: 5.0, delta: -0.4, resultedAt: "09:51" },
      { name: "Chloride", short: "Cl", loinc: "2075-0", value: 102, unit: "mEq/L", refLo: 98, refHi: 107, resultedAt: "09:51" },
      { name: "CO₂ (HCO₃)", loinc: "2028-9", value: 24, unit: "mEq/L", refLo: 22, refHi: 28, resultedAt: "09:51" },
      { name: "BUN", loinc: "3094-0", value: 18, unit: "mg/dL", refLo: 7, refHi: 20, delta: 2, resultedAt: "09:55" },
      { name: "Creatinine", short: "Cr", loinc: "2160-0", value: 1.05, unit: "mg/dL", refLo: 0.7, refHi: 1.3, resultedAt: "09:55", meta: "amended" },
      { name: "Glucose", loinc: "2345-7", value: 168, unit: "mg/dL", refLo: 70, refHi: 99, delta: 22, view: [50, 200], resultedAt: "09:55" },
      { name: "Calcium", short: "Ca", loinc: "17861-6", value: 9.4, unit: "mg/dL", refLo: 8.5, refHi: 10.5, resultedAt: "09:55" },
    ],
  },
  {
    name: "Complete Blood Count",
    collected: "06:50",
    resulted: "08:42",
    source: "whole blood",
    rows: [
      { name: "WBC", loinc: "6690-2", value: 12.6, unit: "k/µL", refLo: 4.5, refHi: 11, delta: 3.1, view: [3, 18], resultedAt: "08:38" },
      { name: "Hgb", loinc: "718-7", value: 13.2, unit: "g/dL", refLo: 12, refHi: 16, resultedAt: "08:38" },
      { name: "Hct", loinc: "4544-3", value: 39, unit: "%", refLo: 36, refHi: 46, resultedAt: "08:38" },
      { name: "Platelets", short: "Plt", loinc: "777-3", value: 245, unit: "k/µL", refLo: 150, refHi: 450, resultedAt: "08:42", meta: "external" },
      { name: "Lactate", loinc: "2524-7", value: null, unit: "mmol/L", refLo: 0.5, refHi: 2.2 },
    ],
  },
];

function severityOf(v: number, lo: number, hi: number): Severity {
  const span = hi - lo;
  if (v < lo - span * 0.5) return "panic-low";
  if (v > hi + span * 0.5) return "panic-high";
  if (v < lo) return "low";
  if (v > hi) return "high";
  return "normal";
}

const SEV_LABEL: Record<Severity, string> = {
  normal: "",
  low: "L",
  high: "H",
  "panic-low": "LL",
  "panic-high": "HH",
};

function flagSeverityOf(s: Severity): AbnormalSeverity | null {
  switch (s) {
    case "normal": return null;
    case "low": return "low";
    case "high": return "high";
    case "panic-low": return "critical-low";
    case "panic-high": return "critical-high";
  }
}

const META_LABEL: Record<Meta, string> = {
  amended: "amended",
  corrected: "corrected",
  external: "external source",
  verified: "verified",
};

function formatValue(v: number) {
  if (Math.abs(v) < 10) return v.toFixed(1);
  return Math.round(v).toString();
}

export default function LabResults() {
  const flagged = PANELS.flatMap((p) => p.rows).filter(
    (r) => r.value != null && severityOf(r.value, r.refLo, r.refHi) !== "normal",
  ).length;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Lab results · Patel, R. · MRN 7741286 · 04 May 2026
          </div>
          <p
            className="mt-1 font-display text-[18px] italic leading-tight text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            {flagged} flagged result{flagged === 1 ? "" : "s"}.
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            last refresh 14:08 · LIS source EPIC
          </p>
        </div>

        {/* Panels */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {PANELS.map((panel, i) => (
            <PanelBlock key={panel.name} panel={panel} dividerTop={i > 0} />
          ))}
        </div>

        <p
          className="border-t border-[var(--color-border)] px-6 py-2 text-center text-[11px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Each row's ribbon is the lab's reference range as a line — bolder
          inside the normal envelope, hairline outside. The marker is the
          patient's value: Federal Blue inside, persimmon outside. Margin
          letters carry the analytical readout; flag glyphs carry the severity.
        </p>
      </div>
    </div>
  );
}

function PanelBlock({
  panel,
  dividerTop,
}: {
  panel: Panel;
  dividerTop: boolean;
}) {
  const total = panel.rows.length;
  const returned = panel.rows.filter((r) => r.value != null).length;
  const pendingNames = panel.rows.filter((r) => r.value == null).map((r) => r.name);
  const allReturned = returned === total;

  return (
    <section className={dividerTop ? "border-t border-[var(--color-border)]" : ""}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 pb-1.5 pt-4">
        <h3 className="text-[13px] font-medium tracking-[-0.01em] text-[var(--color-text)]">
          {panel.name}
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            specimen · {panel.source}
          </span>
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          drawn {panel.collected}
          <span className="mx-1.5">·</span>
          {allReturned ? (
            <>resulted {panel.resulted}</>
          ) : (
            <>
              <span className="text-[var(--color-text)]">
                {returned} of {total} returned
              </span>
              <span className="mx-1.5">·</span>
              <span className="text-[var(--color-warning)]">
                {pendingNames.join(", ")} pending
              </span>
            </>
          )}
        </span>
      </header>
      <ul>
        {panel.rows.map((r) => (
          <LabRow key={r.name} lab={r} />
        ))}
      </ul>
    </section>
  );
}

function LabRow({ lab }: { lab: Lab }) {
  // Pending row: a missing lab is NOT a normal lab. Render it explicitly.
  if (lab.value == null) {
    return (
      <li
        className="grid grid-cols-[20px_110px_72px_28px_1fr_88px] items-center gap-3 border-t border-[var(--color-border)] px-6 py-2 text-[12.5px] text-[var(--color-text-muted)]"
        role="status"
      >
        <span aria-hidden />
        <span>
          {lab.name}
          {lab.loinc && (
            <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] opacity-70">
              {lab.loinc}
            </span>
          )}
        </span>
        <span className="font-mono italic" aria-label="Result pending">
          pending
        </span>
        <span />
        <span className="h-3" />
        <span className="text-right font-mono text-[10px] uppercase tracking-[0.16em]">
          {lab.refLo}–{lab.refHi} {lab.unit}
        </span>
      </li>
    );
  }

  const sev = severityOf(lab.value, lab.refLo, lab.refHi);
  const isCritical = sev === "panic-high" || sev === "panic-low";
  const flagSeverity = flagSeverityOf(sev);
  const flagInk =
    isCritical
      ? "var(--color-danger)"
      : sev !== "normal"
        ? "var(--color-warning)"
        : "var(--color-text-muted)";

  return (
    <li
      className="grid grid-cols-[20px_110px_72px_28px_1fr_88px] items-center gap-3 border-t border-[var(--color-border)] px-6 py-2 text-[12.5px] hover:bg-[var(--color-surface)]"
      style={
        isCritical
          ? { boxShadow: "inset 3px 0 0 var(--color-accent)" }
          : undefined
      }
    >
      {/* Leading flag glyph — only present for abnormal rows. ESI 1 / panic
          rows get this in addition to the H/L margin letter so the eye reads
          severity from shape + colour + letter, not letter alone. */}
      <span aria-hidden>
        {flagSeverity && (
          <AbnormalFlag
            severity={flagSeverity}
            reason={`${lab.name} ${lab.value} ${lab.unit}`}
            size="sm"
          />
        )}
      </span>

      {/* Name + LOINC + meta-state eyebrow. */}
      <span className="flex flex-col">
        <span className="text-[var(--color-text)]">
          {lab.name}
          {lab.short && (
            <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {lab.short}
            </span>
          )}
        </span>
        {(lab.loinc || lab.meta) && (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {lab.meta && lab.meta !== "verified" && (
              <span
                style={{
                  color:
                    lab.meta === "amended" || lab.meta === "corrected"
                      ? "var(--color-warning)"
                      : "var(--color-text-muted)",
                }}
              >
                {META_LABEL[lab.meta]}
              </span>
            )}
            {lab.meta && lab.meta !== "verified" && lab.loinc && (
              <span className="mx-1.5 opacity-70">·</span>
            )}
            {lab.loinc && <span>LOINC {lab.loinc}</span>}
          </span>
        )}
      </span>

      {/* Value + delta */}
      <span className="flex items-baseline gap-1">
        <span
          className="font-mono text-[16px] tabular-nums"
          style={{
            color: sev === "normal" ? "var(--color-text)" : "var(--color-accent)",
            fontVariationSettings: '"wght" 500',
          }}
        >
          {formatValue(lab.value)}
        </span>
        {lab.delta != null && Math.abs(lab.delta) >= 0.05 && (
          <span className="font-mono text-[9px] tracking-tight text-[var(--color-text-muted)]">
            {lab.delta > 0 ? "▲" : "▼"}
            {Math.abs(lab.delta).toFixed(Math.abs(lab.delta) < 1 ? 1 : 0)}
          </span>
        )}
      </span>

      {/* Margin flag — H/L/HH/LL letter, kept even now that AbnormalFlag is
          adjacent. Two redundant accessors (shape glyph + caps letter) is the
          pharmacy convention; one is the textual readout and one is the
          shape-encoded scan. */}
      <span
        className="text-center font-mono text-[10px] font-medium uppercase tracking-[0.18em]"
        style={{ color: flagInk }}
        aria-hidden
      >
        {SEV_LABEL[sev]}
      </span>

      {/* Reference-range ribbon — composed from shared primitive. */}
      <ReferenceRange
        low={lab.refLo}
        high={lab.refHi}
        value={lab.value}
        unit={lab.unit}
        view={lab.view}
        size="md"
        ariaLabel={`${lab.name}, ${formatValue(lab.value)} ${lab.unit}, normal range ${lab.refLo} to ${lab.refHi}, ${
          sev === "normal" ? "in range" : sev.replace("-", " ")
        }`}
      />

      {/* Per-row range + resulted timestamp. */}
      <span className="flex flex-col items-end leading-tight">
        <span className="text-right font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {lab.refLo}–{lab.refHi} {lab.unit}
        </span>
        {lab.resultedAt && (
          <span className="font-mono text-[9px] tabular-nums uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {lab.resultedAt}
          </span>
        )}
      </span>
    </li>
  );
}
