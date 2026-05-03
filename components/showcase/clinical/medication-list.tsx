/**
 * Medication list — active home & inpatient medications with a 24-hour
 * scheduled-dose strip per row. The strip is the dot-language commitment of
 * this plate: each scheduled dose is one dot, position encodes time of day,
 * fill encodes status (given · upcoming · overdue · suspended). The eye
 * reads a med's adherence in one line, before reading the dose or frequency.
 *
 * Pure server component. Realistic but mock data; no PHI.
 */

type DoseStatus = "given" | "upcoming" | "overdue" | "skipped";

type Med = {
  id: string;
  name: string;          // generic
  brand?: string;
  dose: string;          // "10 mg"
  route: "PO" | "IV" | "SC" | "PRN";
  freq: string;          // "daily" | "BID" | "QHS" | etc.
  /** Times of day (24h floats, e.g. 7.5 = 07:30) when scheduled. */
  schedule: number[];
  /** Doses already administered today (subset of schedule). */
  givenAt: number[];
  /** Anything pending past its scheduled time but not given. */
  overdueAt?: number[];
  state: "active" | "held" | "discontinued";
  high?: boolean;
  notes?: string;
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
    dose: "5,000 U",
    route: "SC",
    freq: "q8h",
    schedule: [6, 14, 22],
    givenAt: [6],
    overdueAt: [14],
    state: "active",
    high: true,
    notes: "VTE prophylaxis",
  },
  {
    id: "ondansetron",
    name: "Ondansetron",
    brand: "Zofran",
    dose: "4 mg",
    route: "IV",
    freq: "PRN nausea",
    schedule: [],
    givenAt: [10.7],
    state: "active",
  },
  {
    id: "warfarin",
    name: "Warfarin",
    dose: "—",
    route: "PO",
    freq: "Held pending INR",
    schedule: [],
    givenAt: [],
    state: "held",
    notes: "Last INR 3.6 (target 2–3)",
  },
];

export default function MedicationList() {
  const high = MEDS.filter((m) => m.high && m.state === "active").length;
  const overdue = MEDS.filter((m) => (m.overdueAt?.length ?? 0) > 0).length;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Medications · Patel, R. · MAR
          </div>
          <p
            className="mt-1 font-display text-[18px] italic leading-tight text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            {MEDS.filter((m) => m.state === "active").length} active ·{" "}
            {high} high-alert · {overdue} overdue
          </p>
        </div>

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
          Each dot is one scheduled dose. Walnut: given. Federal Blue ring:
          due now. Persimmon: overdue. Hairline: 14:08, the present.
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

function fmtTime(t: number): string {
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
        {/* Hour ticks. */}
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
        {/* Now marker — Federal Blue hairline. */}
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

  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-[var(--color-border)] px-6 py-3 hover:bg-[var(--color-surface)]">
      {/* State dot — uses size & ink as ordinal cue, not colour-only. */}
      <StateDot state={med.state} high={med.high} />

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
            <span className="font-display text-[12px] italic text-[var(--color-text-muted)]"
              style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
            >
              ({med.brand})
            </span>
          )}
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-text)]">
            {med.dose}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {med.route}
          </span>
          {med.high && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-danger)]">
              high-alert
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
        </div>
      </div>

      <ScheduleStrip
        schedule={med.schedule}
        givenAt={med.givenAt}
        overdueAt={med.overdueAt ?? []}
        held={med.state === "held"}
      />
    </li>
  );
}

function StateDot({
  state,
  high,
}: {
  state: Med["state"];
  high?: boolean;
}) {
  const cell = 14;
  const c = cell / 2;
  if (state === "discontinued") {
    return (
      <svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`} aria-label="Discontinued">
        <circle cx={c} cy={c} r={4} fill="none" stroke="var(--color-text-muted)" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
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
  return (
    <svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`} aria-label="Active">
      <circle
        cx={c}
        cy={c}
        r={high ? 4.5 : 3.5}
        fill={high ? "var(--color-danger)" : "var(--color-text)"}
      />
    </svg>
  );
}

function ScheduleStrip({
  schedule,
  givenAt,
  overdueAt,
  held,
}: {
  schedule: number[];
  givenAt: number[];
  overdueAt: number[];
  held: boolean;
}) {
  const W = 360;
  const H = 22;

  // Build a status map keyed by time. (Same time can only have one slot
  // per definition, so this is unambiguous.)
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
      aria-label="Dose schedule for the last and next twelve hours"
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

      {/* Now marker, repeated under each strip so the eye can compare
          across rows easily. Federal Blue hairline. */}
      <line
        x1={timeToX(NOW, W)}
        x2={timeToX(NOW, W)}
        y1={3}
        y2={H - 3}
        stroke="var(--color-accent-2)"
        strokeWidth="1"
      />

      {/* Held meds: render a quiet stipple stripe across the row, no event
          dots. The schedule has been suspended; the visual must say so. */}
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
                  {/* Stippled halo — mirrors the live-marker vocabulary. */}
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
