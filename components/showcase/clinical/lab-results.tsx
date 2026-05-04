/**
 * Lab panel — comprehensive metabolic + complete blood count, with each
 * value placed on a reference-range ribbon.
 *
 * Refactored 2026-05-03 per the dot+line system change in DECISIONS.md
 * (the dots-as-background retrospective). The ribbon used to render the
 * normal envelope as a Bridson density stripe; Vinson reviewed and reported
 * it made the test results hard to read. Now:
 *
 *  - The reference range is a *line*: a faint full-track hairline + a
 *    bolder line segment between the bracket ticks at refLo and refHi. The
 *    eye reads the normal zone as a length, not as a texture.
 *  - The patient's value is one dot — Federal Blue when in-range (with a
 *    small halo of mark-dots — those are punctuation around the value, not
 *    background), persimmon when out-of-range. Off-scale values cap with
 *    an edge arrow.
 *  - Out-of-range gets a one-letter margin marker (H / L / HH / LL),
 *    *not* a coloured row background. Interior of the table cells stays
 *    flat per CLAUDE.md.
 *
 * Pure server component. Realistic reference ranges; mock values, no PHI.
 */

type Severity = "normal" | "low" | "high" | "panic-low" | "panic-high";

type Lab = {
  name: string;
  short?: string;          // shortened display when name is long
  value: number | null;    // null = pending
  unit: string;
  refLo: number;
  refHi: number;
  /** Visual viewport — defaults to `[refLo - span, refHi + span]`. */
  view?: [number, number];
  /** Delta vs prior value (positive = increased). */
  delta?: number;
  /** Time the result returned (display only). */
  resultedAt?: string;
};

type Panel = {
  name: string;
  collected: string;
  resulted: string;
  rows: Lab[];
};

const PANELS: Panel[] = [
  {
    name: "Comprehensive Metabolic Panel",
    collected: "06:50",
    resulted: "09:55",
    rows: [
      { name: "Sodium",     short: "Na",  value: 138, unit: "mEq/L", refLo: 135, refHi: 145, delta: -1 },
      { name: "Potassium",  short: "K",   value: 3.3, unit: "mEq/L", refLo: 3.5, refHi: 5.0, delta: -0.4 },
      { name: "Chloride",   short: "Cl",  value: 102, unit: "mEq/L", refLo: 98,  refHi: 107 },
      { name: "CO₂",                       value: 24,  unit: "mEq/L", refLo: 22,  refHi: 28 },
      { name: "BUN",                       value: 18,  unit: "mg/dL", refLo: 7,   refHi: 20, delta: 2 },
      { name: "Creatinine", short: "Cr",  value: 1.05, unit: "mg/dL", refLo: 0.7, refHi: 1.3 },
      { name: "Glucose",                   value: 168, unit: "mg/dL", refLo: 70,  refHi: 99,  delta: 22, view: [50, 200] },
      { name: "Calcium",    short: "Ca",  value: 9.4, unit: "mg/dL", refLo: 8.5, refHi: 10.5 },
    ],
  },
  {
    name: "Complete Blood Count",
    collected: "06:50",
    resulted: "08:42",
    rows: [
      { name: "WBC",    value: 12.6, unit: "k/µL", refLo: 4.5,  refHi: 11,   delta: 3.1, view: [3, 18] },
      { name: "Hgb",    value: 13.2, unit: "g/dL", refLo: 12,   refHi: 16 },
      { name: "Hct",    value: 39,   unit: "%",    refLo: 36,   refHi: 46 },
      { name: "Platelets", short: "Plt", value: 245, unit: "k/µL", refLo: 150, refHi: 450 },
      { name: "Lactate", value: null, unit: "mmol/L", refLo: 0.5, refHi: 2.2 },
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
            Lab results · Patel, R. · 04 May
          </div>
          <p
            className="mt-1 font-display text-[18px] italic leading-tight text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            {flagged} flagged result{flagged === 1 ? "" : "s"}.
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
          letters carry the analytical readout.
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
  return (
    <section className={dividerTop ? "border-t border-[var(--color-border)]" : ""}>
      <header className="flex items-baseline justify-between gap-3 px-6 pb-1.5 pt-4">
        <h3 className="text-[13px] font-medium tracking-[-0.01em] text-[var(--color-text)]">
          {panel.name}
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          drawn {panel.collected} · resulted {panel.resulted}
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
  if (lab.value == null) {
    return (
      <li className="grid grid-cols-[110px_72px_28px_1fr_60px] items-center gap-3 px-6 py-2 text-[12.5px] text-[var(--color-text-muted)]">
        <span>{lab.name}</span>
        <span className="font-mono italic">pending</span>
        <span />
        <span className="h-3" />
        <span className="text-right font-mono text-[10px] uppercase tracking-[0.16em]">
          {lab.refLo}–{lab.refHi} {lab.unit}
        </span>
      </li>
    );
  }

  const sev = severityOf(lab.value, lab.refLo, lab.refHi);
  const flagInk =
    sev === "panic-high" || sev === "panic-low"
      ? "var(--color-danger)"
      : sev !== "normal"
        ? "var(--color-warning)"
        : "var(--color-text-muted)";

  return (
    <li className="grid grid-cols-[110px_72px_28px_1fr_60px] items-center gap-3 border-t border-[var(--color-border)] px-6 py-2 text-[12.5px] hover:bg-[var(--color-surface)]">
      {/* Name */}
      <span className="text-[var(--color-text)]">
        {lab.name}
        {lab.short && (
          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {lab.short}
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

      {/* Margin flag — H/L/HH/LL or blank. Mono caps, never a colour-only signal. */}
      <span
        className="text-center font-mono text-[10px] font-medium uppercase tracking-[0.18em]"
        style={{ color: flagInk }}
      >
        {SEV_LABEL[sev]}
      </span>

      {/* Reference-range ribbon. */}
      <RangeRibbon lab={lab} severity={sev} />

      {/* Unit and range — mono caps, right-aligned. */}
      <span className="text-right font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {lab.refLo}–{lab.refHi} {lab.unit}
      </span>
    </li>
  );
}

function formatValue(v: number) {
  // Show one decimal for values < 10, integer otherwise (medical convention
  // for most chemistries; not exact for all assays but close enough for a
  // showcase plate).
  if (Math.abs(v) < 10) return v.toFixed(1);
  return Math.round(v).toString();
}

const RIBBON_W = 140;
const RIBBON_H = 14;

function RangeRibbon({
  lab,
  severity,
}: {
  lab: Lab;
  severity: Severity;
}) {
  const value = lab.value!;
  const view: [number, number] =
    lab.view ?? (() => {
      const span = lab.refHi - lab.refLo;
      return [lab.refLo - span * 0.6, lab.refHi + span * 0.6];
    })();
  const [vMin, vMax] = view;
  const xOf = (v: number) =>
    ((Math.max(vMin, Math.min(vMax, v)) - vMin) / (vMax - vMin)) * RIBBON_W;
  const offScale = value < vMin || value > vMax;
  const xRefLo = xOf(lab.refLo);
  const xRefHi = xOf(lab.refHi);
  const valueX = xOf(value);
  const inRange = severity === "normal";
  const yMid = RIBBON_H / 2;

  return (
    <svg
      width={RIBBON_W}
      height={RIBBON_H}
      viewBox={`0 0 ${RIBBON_W} ${RIBBON_H}`}
      className="block"
      role="img"
      aria-label={`Reference range ${lab.refLo}–${lab.refHi} ${lab.unit}; value ${value}`}
    >
      {/* Faint full-track hairline. */}
      <line
        x1={1}
        x2={RIBBON_W - 1}
        y1={yMid}
        y2={yMid}
        stroke="var(--color-border)"
        strokeWidth="0.4"
      />

      {/* Normal envelope as a bolder line segment between the bracket ticks.
          This replaced a Bridson density stripe (DECISIONS.md 2026-05-03). */}
      <line
        x1={xRefLo}
        x2={xRefHi}
        y1={yMid}
        y2={yMid}
        stroke="var(--color-text-muted)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* Bracket ticks at the band edges. */}
      <line
        x1={xRefLo}
        x2={xRefLo}
        y1={3}
        y2={RIBBON_H - 3}
        stroke="var(--color-border-strong)"
        strokeWidth="0.6"
      />
      <line
        x1={xRefHi}
        x2={xRefHi}
        y1={3}
        y2={RIBBON_H - 3}
        stroke="var(--color-border-strong)"
        strokeWidth="0.6"
      />

      {/* Value marker. Off-scale values render as a chevron at the strip edge. */}
      {offScale ? (
        <ValueChevron
          x={value < vMin ? 0 : RIBBON_W}
          y={yMid}
          dir={value < vMin ? "left" : "right"}
        />
      ) : (
        <ValueDot x={valueX} y={yMid} inRange={inRange} />
      )}
    </svg>
  );
}

function ValueDot({
  x,
  y,
  inRange,
}: {
  x: number;
  y: number;
  inRange: boolean;
}) {
  const ink = inRange ? "var(--color-accent-2)" : "var(--color-accent)";
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={2.6} fill={ink} />
      {/* Halo — visible only when in-range; signals "the live read" the same
          way the vitals sparkline marks the most-recent sample. */}
      {inRange &&
        Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={Math.cos(a) * 4.2}
              cy={Math.sin(a) * 4.2}
              r={0.45}
              fill={ink}
            />
          );
        })}
    </g>
  );
}

function ValueChevron({
  x,
  y,
  dir,
}: {
  x: number;
  y: number;
  dir: "left" | "right";
}) {
  const path =
    dir === "right"
      ? `M ${x - 6} ${y - 3.5} L ${x} ${y} L ${x - 6} ${y + 3.5} Z`
      : `M ${x + 6} ${y - 3.5} L ${x} ${y} L ${x + 6} ${y + 3.5} Z`;
  return <path d={path} fill="var(--color-accent)" />;
}
