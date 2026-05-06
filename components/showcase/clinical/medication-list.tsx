import { AbnormalFlag } from "@/components/_kit/abnormal-flag";

/**
 * Medication list — active home & inpatient medications with a 24-hour
 * scheduled-dose strip per row. The strip is the dot-language commitment of
 * this plate: each scheduled dose is one dot, position encodes time of day,
 * fill encodes status (given · upcoming · overdue · suspended).
 *
 * Refactored 2026-05-05 (Builder C, medical standard pass): high-alert meds
 * (heparin, insulin) now render an <AbnormalFlag severity="high-alert">
 * adjacent to the dose line — the pharmacy rubber-stamp convention — instead
 * of a colour-only mono-caps tag. The single overdue heparin row gets a
 * banner-level inline alert at the top of the list. Hold-reason is now
 * structured (drug · because-of · recheck-at) rather than free text, and PRN
 * given doses render as a square mark to disambiguate from scheduled-given.
 *
 * Pure server component. Realistic but mock data; no PHI.
 */

type DoseStatus = "given" | "upcoming" | "overdue" | "skipped";

type HoldReason = {
  /** Short reason — "INR" / "renal function" / "NPO". */
  becauseOf: string;
  /** Optional structured value that triggered the hold. */
  triggerValue?: string;
  /** When to recheck. */
  recheckAt?: string;
};

type Med = {
  id: string;
  name: string;          // generic
  brand?: string;
  dose: string;          // "10 mg"
  route: "PO" | "IV" | "SC" | "PRN";
  freq: string;          // "Once daily" | "BID" | "QHS" | etc.
  /** Times of day (24h floats, e.g. 7.5 = 07:30) when scheduled. */
  schedule: number[];
  /** Doses already administered today (subset of schedule). */
  givenAt: number[];
  /** Optional PRN administrations — visually distinct from scheduled given. */
  prnGivenAt?: number[];
  /** Anything pending past its scheduled time but not given. */
  overdueAt?: number[];
  state: "active" | "held" | "discontinued";
  /** ISMP "high-alert" classification (anticoagulants, insulins, opioids, etc.). */
  highAlert?: boolean;
  notes?: string;
  hold?: HoldReason;
};

const NOW = 14.13; // 14:08 — used to colour past/future, render the now-mark

const MEDS: Med[] = [
  {
    id: "lisinopril",
    name: "Lisinopril",
    brand: "Zestril",
    dose: "10 mg",
    route: "PO",
    freq: "Once daily",
    schedule: [8],
    givenAt: [8],
    state: "active",
  },
  {
    id: "metformin",
    name: "Metformin",
    brand: "Glucophage",
    dose: "500 mg",
    route: "PO",
    freq: "Twice daily",
    schedule: [8, 20],
    givenAt: [8],
    state: "active",
  },
  {
    id: "atorvastatin",
    name: "Atorvastatin",
    brand: "Lipitor",
    dose: "40 mg",
    route: "PO",
    freq: "At bedtime",
    schedule: [22],
    givenAt: [],
    state: "active",
  },
  {
    id: "aspirin",
    name: "Aspirin",
    dose: "81 mg",
    route: "PO",
    freq: "Once daily",
    schedule: [8],
    givenAt: [8],
    state: "active",
  },
  {
    id: "heparin",
    name: "Heparin",
    dose: "5,000 units",
    route: "SC",
    freq: "q8h",
    schedule: [6, 14, 22],
    givenAt: [6],
    overdueAt: [14],
    state: "active",
    highAlert: true,
    notes: "VTE prophylaxis",
  },
  {
    id: "insulin",
    name: "Insulin lispro",
    brand: "Humalog",
    dose: "Sliding scale",
    route: "SC",
    freq: "AC + HS",
    schedule: [7.5, 12, 17.5, 22],
    givenAt: [7.5, 12],
    state: "active",
    highAlert: true,
    notes: "Per protocol — verify BG before dose",
  },
  {
    id: "ondansetron",
    name: "Ondansetron",
    brand: "Zofran",
    dose: "4 mg",
    route: "IV",
    freq: "PRN nausea",
    schedule: [],
    givenAt: [],
    prnGivenAt: [10.7],
    state: "active",
  },
  {
    id: "warfarin",
    name: "Warfarin",
    dose: "—",
    route: "PO",
    freq: "Once daily — held",
    schedule: [],
    givenAt: [],
    state: "held",
    hold: {
      becauseOf: "supratherapeutic INR",
      triggerValue: "INR 3.6 (target 2–3)",
      recheckAt: "tomorrow AM",
    },
  },
];

function fmtTime(t: number): string {
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function MedicationList() {
  const high = MEDS.filter((m) => m.highAlert && m.state === "active").length;
  const overdueMeds = MEDS.filter((m) => (m.overdueAt?.length ?? 0) > 0);
  const overdueCount = overdueMeds.length;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Medications · Patel, R. · MRN 7741286 · MAR · last sync 14:08
          </div>
          <p
            className="mt-1 font-display text-[18px] italic leading-tight text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            {MEDS.filter((m) => m.state === "active").length} active ·{" "}
            {high} high-alert · {overdueCount} overdue
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            CrCl 62 mL/min · weight 78 kg
          </p>
        </div>

        {/* Overdue banner — load-bearing critical event for this plate. */}
        {overdueMeds.map((m) => {
          const at = m.overdueAt![0];
          const ageMin = Math.max(0, Math.round((NOW - at) * 60));
          return (
            <div
              key={`overdue-${m.id}`}
              role="alert"
              className="flex shrink-0 items-center gap-3 border-b border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_8%,var(--color-bg))] px-6 py-2"
            >
              <AbnormalFlag
                severity="panic"
                reason={`${m.name} ${fmtTime(at)} dose overdue ${ageMin} minutes`}
                size="md"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
                overdue
              </span>
              <span className="text-[12.5px] text-[var(--color-text)]">
                <span className="font-medium">{m.name}</span>{" "}
                <span className="font-mono text-[11px] tabular-nums text-[var(--color-text-muted)]">
                  {m.dose} {m.route}
                </span>{" "}
                — {fmtTime(at)} dose <span className="font-medium">{ageMin} minutes late.</span>
              </span>
            </div>
          );
        })}

        {/* Day strip ruler — single 24h ruler at the top, scheduled-dose
            timeline below uses the same x-axis. */}
        <DayRuler />

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ul>
            {MEDS.map((m) => (
              <MedRow key={m.id} med={m} />
            ))}
          </ul>
        </div>

        <p
          className="border-t border-[var(--color-border)] px-6 py-2 text-center text-[11px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Each dot is one scheduled dose. Walnut: given. Federal Blue ring: due
          now. Persimmon: overdue. Square: PRN given. Hairline: 14:08, the
          present.
        </p>
      </div>
    </div>
  );
}

const HOURS_LABELS = [0, 6, 12, 18, 24];
const STRIP_PADDING_X = 10;

function timeToX(t: number, width: number) {
  const innerW = width - STRIP_PADDING_X * 2;
  return STRIP_PADDING_X + (t / 24) * innerW;
}

function DayRuler() {
  const stripW = 360;
  const stripH = 22;
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        24h
      </span>
      <div className="flex-1" />
      <svg
        width={stripW}
        height={stripH}
        viewBox={`0 0 ${stripW} ${stripH}`}
        className="block"
        aria-hidden="true"
      >
        {HOURS_LABELS.map((h) => {
          const x = timeToX(h, stripW);
          return (
            <g key={h}>
              <line
                x1={x}
                x2={x}
                y1={4}
                y2={10}
                stroke="var(--color-border-strong)"
                strokeWidth="0.5"
              />
              <text
                x={x}
                y={20}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fill: "var(--color-text-muted)",
                }}
              >
                {String(h).padStart(2, "0")}
              </text>
            </g>
          );
        })}
        <line
          x1={timeToX(NOW, stripW)}
          x2={timeToX(NOW, stripW)}
          y1={2}
          y2={14}
          stroke="var(--color-accent-2)"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}

function MedRow({ med }: { med: Med }) {
  const dim = med.state !== "active";
  const overdueCount = med.overdueAt?.length ?? 0;
  const givenCount = med.givenAt.length + (med.prnGivenAt?.length ?? 0);
  const upcomingCount = med.schedule.filter(
    (t) => t >= NOW && !med.givenAt.includes(t),
  ).length;
  const stripAria = `Dose schedule for ${med.name}: ${givenCount} given, ${overdueCount} overdue, ${upcomingCount} upcoming.`;

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-[var(--color-border)] px-6 py-3 hover:bg-[var(--color-surface)]">
      {/* State dot — uses size & ink as ordinal cue, not colour-only. */}
      <StateDot state={med.state} highAlert={med.highAlert} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span
            className={
              dim
                ? "text-[14px] font-medium text-[var(--color-text-muted)] line-through"
                : "text-[14px] font-medium text-[var(--color-text)]"
            }
          >
            {med.name}
          </span>
          {med.brand && (
            <span
              className="font-display text-[12px] italic text-[var(--color-text-muted)]"
              style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
            >
              ({med.brand})
            </span>
          )}
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] tabular-nums text-[var(--color-text)]">
            {med.dose}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {med.route}
          </span>
          {med.highAlert && (
            <span className="inline-flex items-center gap-1">
              <AbnormalFlag
                severity="high-alert"
                reason={`${med.name} — high-alert medication; double-check dose, patient, and indication`}
                size="sm"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)]">
                high-alert
              </span>
            </span>
          )}
        </div>
        <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
          {med.freq}
          {med.notes && (
            <>
              <span aria-hidden className="mx-2">·</span>
              <span className="italic">{med.notes}</span>
            </>
          )}
          {/* Structured hold reason — load-bearing for the warfarin row. */}
          {med.hold && (
            <span className="ml-2 inline-flex items-baseline gap-1.5">
              <span aria-hidden className="font-mono text-[var(--color-text-muted)]">·</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-warning)]">
                held — {med.hold.becauseOf}
              </span>
              {med.hold.triggerValue && (
                <span className="font-mono text-[10px] tabular-nums text-[var(--color-text)]">
                  {med.hold.triggerValue}
                </span>
              )}
              {med.hold.recheckAt && (
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  · recheck {med.hold.recheckAt}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      <ScheduleStrip
        schedule={med.schedule}
        givenAt={med.givenAt}
        prnGivenAt={med.prnGivenAt ?? []}
        overdueAt={med.overdueAt ?? []}
        held={med.state === "held"}
        ariaLabel={stripAria}
      />
    </li>
  );
}

function StateDot({
  state,
  highAlert,
}: {
  state: Med["state"];
  highAlert?: boolean;
}) {
  const cell = 14;
  const c = cell / 2;
  if (state === "discontinued") {
    return (
      <svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`} aria-label="Discontinued">
        <circle
          cx={c}
          cy={c}
          r={4}
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth="0.8"
          strokeDasharray="1.5 1.5"
        />
      </svg>
    );
  }
  if (state === "held") {
    return (
      <svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`} aria-label="Held">
        <circle cx={c} cy={c} r={4} fill="none" stroke="var(--color-warning)" strokeWidth="1.1" />
        <circle cx={c} cy={c} r={1.4} fill="var(--color-warning)" />
      </svg>
    );
  }
  // active — high-alert meds get a slightly larger walnut dot wrapped in a
  // persimmon ring, matching the AbnormalFlag's high-alert convention.
  return (
    <svg
      width={cell}
      height={cell}
      viewBox={`0 0 ${cell} ${cell}`}
      aria-label={highAlert ? "Active, high-alert medication" : "Active"}
    >
      {highAlert && (
        <circle
          cx={c}
          cy={c}
          r={5.5}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1"
        />
      )}
      <circle
        cx={c}
        cy={c}
        r={3.5}
        fill="var(--color-text)"
      />
    </svg>
  );
}

function ScheduleStrip({
  schedule,
  givenAt,
  prnGivenAt,
  overdueAt,
  held,
  ariaLabel,
}: {
  schedule: number[];
  givenAt: number[];
  prnGivenAt: number[];
  overdueAt: number[];
  held: boolean;
  ariaLabel: string;
}) {
  const W = 360;
  const H = 22;

  const statusAt = new Map<number, DoseStatus>();
  for (const t of schedule) {
    statusAt.set(t, t < NOW ? "skipped" : "upcoming");
  }
  for (const t of givenAt) statusAt.set(t, "given");
  for (const t of overdueAt) statusAt.set(t, "overdue");

  const events = Array.from(statusAt.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block"
      role="img"
      aria-label={ariaLabel}
    >
      {/* Hairline timeline. */}
      <line
        x1={STRIP_PADDING_X}
        x2={W - STRIP_PADDING_X}
        y1={H / 2}
        y2={H / 2}
        stroke="var(--color-border)"
        strokeWidth="0.5"
      />

      {/* Now marker. */}
      <line
        x1={timeToX(NOW, W)}
        x2={timeToX(NOW, W)}
        y1={3}
        y2={H - 3}
        stroke="var(--color-accent-2)"
        strokeWidth="1"
      />

      {held && (
        <g>
          {Array.from({ length: 22 }).map((_, i) => {
            const x = STRIP_PADDING_X + (i / 21) * (W - STRIP_PADDING_X * 2);
            return (
              <circle
                key={i}
                cx={x}
                cy={H / 2}
                r={0.7}
                fill="var(--color-text-muted)"
                opacity={0.5}
              />
            );
          })}
        </g>
      )}

      {/* PRN given doses — square marks so they don't get confused with
          scheduled-given dots. PRNs render even when the row has no
          schedule (the canonical case is Zofran). */}
      {!held &&
        prnGivenAt.map((t, i) => {
          const x = timeToX(t, W);
          const y = H / 2;
          return (
            <g key={`prn-${i}-${t}`}>
              <title>{`${fmtTime(t)} — PRN given`}</title>
              <rect
                x={x - 2}
                y={y - 2}
                width={4}
                height={4}
                fill="var(--color-text)"
                opacity={0.85}
              />
            </g>
          );
        })}

      {/* Event dots. */}
      {!held &&
        events.map(([t, s], i) => {
          const x = timeToX(t, W);
          const y = H / 2;
          return (
            <g key={`${i}-${t}`}>
              <title>{`${fmtTime(t)} — ${s}`}</title>
              {s === "given" && (
                <circle cx={x} cy={y} r={2.2} fill="var(--color-text)" opacity={0.85} />
              )}
              {s === "upcoming" && (
                <circle
                  cx={x}
                  cy={y}
                  r={2.2}
                  fill="none"
                  stroke="var(--color-text)"
                  strokeWidth="0.9"
                />
              )}
              {s === "overdue" && (
                <>
                  <circle cx={x} cy={y} r={2.6} fill="var(--color-accent)" />
                  {Array.from({ length: 8 }).map((_, j) => {
                    const a = (j / 8) * Math.PI * 2;
                    return (
                      <circle
                        key={j}
                        cx={x + Math.cos(a) * 4}
                        cy={y + Math.sin(a) * 4}
                        r={0.5}
                        fill="var(--color-accent)"
                      />
                    );
                  })}
                </>
              )}
              {s === "skipped" && (
                <circle
                  cx={x}
                  cy={y}
                  r={1.5}
                  fill="var(--color-border-strong)"
                  opacity={0.7}
                />
              )}
            </g>
          );
        })}
    </svg>
  );
}
