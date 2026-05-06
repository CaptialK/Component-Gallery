import { mulberry32, poissonDisc } from "@/components/_kit/dot-noise";
import { AbnormalFlag } from "@/components/_kit/abnormal-flag";

/**
 * Triage queue — ED arrivals sorted by acuity (Emergency Severity Index 1–5)
 * and wait time. The table that decides who a clinician sees next.
 *
 * Refactored 2026-05-05 (Builder C, medical standard pass): ESI 1 row now
 * carries an <AbnormalFlag severity="panic"> + a top-of-table STEMI activation
 * banner so the most critical row pops above the others by glyph + label,
 * not Federal Blue ink alone. Last-refresh + sample-frozen mono-cap added so
 * the static plate doesn't read as a live feed. Partial vitals (`vitalsAgeMin
 * == null`) renders as "not taken" mono-cap; very-fresh (< 2m) renders as
 * "fresh" instead of an ambiguous empty Bridson cell.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - ESI is rendered as a sized dot whose area encodes acuity
 *    (Cleveland-McGill: area > density for quantitative encoding).
 *  - Wait time is a horizontal dot trail — one dot per ten minutes. The
 *    trail tints persimmon past the threshold for that ESI band.
 *  - Vitals freshness is a Bridson taper denser when stale.
 *
 * Pure server component. Mock data only, no PHI.
 */

type Status = "waiting" | "triaged" | "in-room" | "arrived";

type Patient = {
  id: string;
  initials: string;
  age: number;
  sex: "M" | "F" | "X";
  esi: 1 | 2 | 3 | 4 | 5;
  cc: string;
  /** Short critical synopsis if the chief complaint is a time-critical event. */
  critical?: { kind: "stemi" | "stroke" | "trauma" | "sepsis" | "dka"; label: string };
  waitedMin: number;
  arrivedAt: string;
  modeOfArrival: "EMS" | "walk-in" | "transfer";
  status: Status;
  room?: string;
  /** Minutes since vitals were captured. null = vitals NOT taken yet. */
  vitalsAgeMin: number | null;
};

const PATIENTS: Patient[] = [
  {
    id: "ED-2406",
    initials: "RT",
    age: 64,
    sex: "M",
    esi: 1,
    cc: "STEMI activation, chest pain 8/10",
    critical: { kind: "stemi", label: "STEMI" },
    waitedMin: 0,
    arrivedAt: "14:06",
    modeOfArrival: "EMS",
    status: "in-room",
    room: "T1",
    vitalsAgeMin: 1,
  },
  {
    id: "ED-2412",
    initials: "MK",
    age: 31,
    sex: "F",
    esi: 2,
    cc: "Diabetic ketoacidosis, fruity breath",
    critical: { kind: "dka", label: "DKA" },
    waitedMin: 14,
    arrivedAt: "13:54",
    modeOfArrival: "walk-in",
    status: "in-room",
    room: "A3",
    vitalsAgeMin: 3,
  },
  {
    id: "ED-2414",
    initials: "JL",
    age: 78,
    sex: "F",
    esi: 2,
    cc: "Stroke alert, left-sided weakness",
    critical: { kind: "stroke", label: "STROKE" },
    waitedMin: 4,
    arrivedAt: "14:04",
    modeOfArrival: "EMS",
    status: "in-room",
    room: "T2",
    vitalsAgeMin: 1,
  },
  {
    id: "ED-2419",
    initials: "DB",
    age: 22,
    sex: "M",
    esi: 3,
    cc: "RLQ abdominal pain, vomiting",
    waitedMin: 28,
    arrivedAt: "13:40",
    modeOfArrival: "walk-in",
    status: "triaged",
    room: "A6",
    vitalsAgeMin: 18,
  },
  {
    id: "ED-2420",
    initials: "SP",
    age: 54,
    sex: "F",
    esi: 3,
    cc: "Migraine w/ aura, photophobia",
    waitedMin: 71,
    arrivedAt: "12:57",
    modeOfArrival: "walk-in",
    status: "waiting",
    vitalsAgeMin: 64,
  },
  {
    id: "ED-2422",
    initials: "AK",
    age: 9,
    sex: "M",
    esi: 3,
    cc: "Asthma exacerbation, mild WOB",
    waitedMin: 32,
    arrivedAt: "13:36",
    modeOfArrival: "walk-in",
    status: "triaged",
    room: "A8",
    vitalsAgeMin: 12,
  },
  {
    id: "ED-2426",
    initials: "GR",
    age: 45,
    sex: "F",
    esi: 4,
    cc: "Laceration L forearm, minor",
    waitedMin: 96,
    arrivedAt: "12:32",
    modeOfArrival: "walk-in",
    status: "waiting",
    vitalsAgeMin: 92,
  },
  {
    id: "ED-2428",
    initials: "HT",
    age: 71,
    sex: "M",
    esi: 4,
    cc: "Cellulitis L lower leg, mild",
    waitedMin: 142,
    arrivedAt: "11:46",
    modeOfArrival: "walk-in",
    status: "waiting",
    vitalsAgeMin: 132,
  },
  // Just-arrived: triage feed has the patient but vitals haven't been taken.
  {
    id: "ED-2434",
    initials: "EM",
    age: 38,
    sex: "F",
    esi: 4,
    cc: "Awaiting triage",
    waitedMin: 3,
    arrivedAt: "14:05",
    modeOfArrival: "walk-in",
    status: "arrived",
    vitalsAgeMin: null,
  },
  {
    id: "ED-2431",
    initials: "CV",
    age: 34,
    sex: "X",
    esi: 5,
    cc: "Med refill (HCTZ), no acute s/sx",
    waitedMin: 188,
    arrivedAt: "11:00",
    modeOfArrival: "walk-in",
    status: "waiting",
    vitalsAgeMin: 176,
  },
];

/** ESI thresholds in minutes — past these, the wait-trail tints persimmon. */
const WAIT_THRESHOLD: Record<Patient["esi"], number> = {
  1: 0,
  2: 10,
  3: 60,
  4: 120,
  5: 240,
};

export default function TriageQueue() {
  const counts = PATIENTS.reduce<Record<number, number>>(
    (acc, p) => ({ ...acc, [p.esi]: (acc[p.esi] ?? 0) + 1 }),
    {},
  );
  const overThreshold = PATIENTS.filter(
    (p) =>
      p.waitedMin > WAIT_THRESHOLD[p.esi] &&
      (p.status === "waiting" || p.status === "arrived"),
  ).length;
  const stemiCount = PATIENTS.filter((p) => p.critical?.kind === "stemi").length;
  const strokeCount = PATIENTS.filter((p) => p.critical?.kind === "stroke").length;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Triage queue · ED · last refresh 14:08 · q60s · frozen specimen
            </h2>
            <p
              className="mt-1 font-display text-[19px] italic leading-none text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              {PATIENTS.length} in queue · {overThreshold} past threshold
            </p>
          </div>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((esi) => (
              <ESIChip key={esi} esi={esi as Patient["esi"]} count={counts[esi] ?? 0} />
            ))}
          </div>
        </div>

        {/* Critical activation banner — only appears when there's an ESI 1
            time-critical pathway in queue. Icon + letter + colour, not
            colour alone. Stays in the table flow so the eye reads it before
            scanning rows. */}
        {(stemiCount > 0 || strokeCount > 0) && (
          <div
            role="alert"
            className="flex shrink-0 items-center gap-3 border-b border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_8%,var(--color-bg))] px-6 py-2"
          >
            <AbnormalFlag severity="panic" reason="Critical activation in queue" size="md" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
              activations
            </span>
            <span className="text-[12.5px] text-[var(--color-text)]">
              {stemiCount > 0 && (
                <span className="font-medium">
                  {stemiCount} STEMI activation{stemiCount === 1 ? "" : "s"}
                </span>
              )}
              {stemiCount > 0 && strokeCount > 0 && (
                <span className="mx-2 text-[var(--color-text-muted)]">·</span>
              )}
              {strokeCount > 0 && (
                <span className="font-medium">
                  {strokeCount} stroke alert{strokeCount === 1 ? "" : "s"}
                </span>
              )}
              <span className="ml-2 text-[var(--color-text-muted)]">in queue.</span>
            </span>
          </div>
        )}

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-[12.5px]">
            <caption className="sr-only">
              Triage queue, {PATIENTS.length} patients sorted by acuity
            </caption>
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                <Th width="36px">{""}</Th>
                <Th width="56px">ESI</Th>
                <Th width="124px">Patient</Th>
                <Th>Chief complaint</Th>
                <Th width="180px">Waited</Th>
                <Th width="116px">Vitals</Th>
                <Th width="68px">Room</Th>
                <Th width="92px">State</Th>
              </tr>
            </thead>
            <tbody>
              {PATIENTS.map((p) => (
                <Row key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Foot caption */}
        <p
          className="border-t border-[var(--color-border)] px-6 py-2 text-center text-[11px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Dot size encodes acuity; trail length encodes wait. Past each ESI's
          threshold the trail tints persimmon — at chart scale, that's the
          signal triage is slipping.
        </p>
      </div>
    </div>
  );
}

function Th({ children, width, scope = "col" }: { children: React.ReactNode; width?: string; scope?: "col" | "row" }) {
  return (
    <th
      scope={scope}
      style={{ width }}
      className="px-4 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-[0.18em]"
    >
      {children}
    </th>
  );
}

function Row({ p }: { p: Patient }) {
  const threshold = WAIT_THRESHOLD[p.esi];
  const overdue =
    (p.status === "waiting" || p.status === "arrived") && p.waitedMin > threshold;
  // ESI 1 critical row — left-edge accent strip + leading flag glyph.
  const isCritical = p.esi === 1;

  return (
    <tr
      className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]"
      style={
        isCritical
          ? {
              boxShadow:
                "inset 3px 0 0 var(--color-accent)",
            }
          : undefined
      }
    >
      <td className="px-2 py-2.5 align-middle">
        {isCritical ? (
          <AbnormalFlag
            severity="panic"
            reason={`ESI 1 ${p.critical?.label ?? "critical"}`}
            size="sm"
          />
        ) : null}
      </td>
      <td className="px-4 py-2.5 align-middle">
        <ESIDot esi={p.esi} />
      </td>
      <td className="px-4 py-2.5 align-middle">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-surface-2)] font-mono text-[10px] tracking-tight text-[var(--color-text)] ring-1 ring-[var(--color-border)]">
            {p.initials}
          </span>
          <div className="min-w-0 leading-tight">
            <div
              className="truncate font-mono text-[11px] text-[var(--color-text)]"
              title={`${p.id} · arrived ${p.arrivedAt} ${p.modeOfArrival}`}
            >
              {p.id}
            </div>
            <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {p.age} y · {p.sex} · {p.modeOfArrival}
            </div>
          </div>
        </div>
      </td>
      <td className="max-w-0 px-4 py-2.5 align-middle">
        {p.critical ? (
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-accent)]">
              {p.critical.label}
            </span>
            <span
              className="truncate text-[var(--color-text)]"
              // Critical CCs MUST NOT truncate to ellipsis without a tooltip.
              title={p.cc}
            >
              {p.cc}
            </span>
          </div>
        ) : (
          <div className="truncate text-[var(--color-text)]" title={p.cc}>
            {p.cc}
          </div>
        )}
      </td>
      <td className="px-4 py-2.5 align-middle">
        <WaitTrail
          minutes={p.waitedMin}
          threshold={threshold}
          overdue={overdue}
          status={p.status}
        />
      </td>
      <td className="px-4 py-2.5 align-middle">
        <VitalsFreshness ageMin={p.vitalsAgeMin} seed={p.id.length * 7} />
      </td>
      <td className="px-4 py-2.5 align-middle font-mono text-[11px] text-[var(--color-text)]">
        {p.room ?? <span className="text-[var(--color-text-muted)]">—</span>}
      </td>
      <td className="px-4 py-2.5 align-middle">
        <StatusPill status={p.status} />
      </td>
    </tr>
  );
}

function ESIDot({ esi }: { esi: Patient["esi"] }) {
  const cell = 22;
  const norm = (5 - esi) / 4;
  const minR = 1.6;
  const maxR = 6;
  const r = Math.sqrt(minR * minR + (maxR * maxR - minR * minR) * norm);
  const ink = esi <= 2 ? "var(--color-accent-2)" : "var(--color-text)";

  return (
    <div className="inline-flex items-center gap-2" aria-label={`ESI ${esi}`}>
      <svg
        width={cell}
        height={cell}
        viewBox={`0 0 ${cell} ${cell}`}
        className="block"
        aria-hidden="true"
      >
        <circle cx={cell / 2} cy={cell / 2} r={r} fill={ink} />
      </svg>
      <span
        className={
          esi <= 2
            ? "font-mono text-[12px] font-medium tracking-tight text-[var(--color-accent-2)]"
            : "font-mono text-[12px] font-medium tracking-tight text-[var(--color-text)]"
        }
      >
        {esi}
      </span>
    </div>
  );
}

function ESIChip({ esi, count }: { esi: Patient["esi"]; count: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-1">
      <ESIDot esi={esi} />
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        × {count}
      </span>
    </div>
  );
}

/** Wait trail — one dot per 10 minutes. Persimmon past the per-ESI threshold. */
function WaitTrail({
  minutes,
  threshold,
  overdue,
  status,
}: {
  minutes: number;
  threshold: number;
  overdue: boolean;
  status: Status;
}) {
  const STEP = 5;
  const RADIUS = 1.05;
  const STRIP = 18;
  const PER_DOT = 10;
  const dots = Math.min(STRIP, Math.max(0, Math.round(minutes / PER_DOT)));
  const overIdx = threshold > 0 ? Math.round(threshold / PER_DOT) : 0;

  return (
    <div className="flex items-center gap-2">
      <svg
        width={STRIP * STEP}
        height={14}
        viewBox={`0 0 ${STRIP * STEP} 14`}
        className="block"
        aria-hidden="true"
      >
        {/* Threshold marker — quiet hairline. */}
        {overIdx > 0 && overIdx < STRIP && (
          <line
            x1={overIdx * STEP - STEP / 2}
            x2={overIdx * STEP - STEP / 2}
            y1={1}
            y2={13}
            stroke="var(--color-border-strong)"
            strokeWidth="0.5"
            strokeDasharray="1.5 1.5"
          />
        )}
        {Array.from({ length: dots }).map((_, i) => {
          const past = overdue && i >= overIdx;
          const x = i * STEP + STEP / 2;
          return (
            <circle
              key={i}
              cx={x}
              cy={7}
              r={RADIUS}
              fill={past ? "var(--color-accent)" : "var(--color-text)"}
              opacity={past ? 1 : 0.6 + (i / Math.max(1, dots - 1)) * 0.4}
            />
          );
        })}
      </svg>
      <span
        className={
          overdue
            ? "font-mono text-[11px] tabular-nums text-[var(--color-accent)]"
            : status === "in-room"
              ? "font-mono text-[11px] tabular-nums text-[var(--color-text-muted)]"
              : "font-mono text-[11px] tabular-nums text-[var(--color-text)]"
        }
      >
        {minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`}
      </span>
    </div>
  );
}

/**
 * Vitals freshness — Bridson taper. Denser when stale.
 *
 * Three explicit empty/partial states pulled out of the dot field:
 *   - null  → "not taken"  (mono-cap, walnut-warning, pre-triage)
 *   - < 2m  → "fresh"      (mono-cap, success, removes ambiguity vs 0-density)
 *   - ≥ 60m → persimmon ink + numeric label
 */
function VitalsFreshness({
  ageMin,
  seed,
}: {
  ageMin: number | null;
  seed: number;
}) {
  if (ageMin == null) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-warning)]"
        aria-label="Vitals not taken yet"
      >
        <span
          aria-hidden
          className="h-1 w-1 rounded-full"
          style={{ background: "var(--color-warning)" }}
        />
        not taken
      </span>
    );
  }

  if (ageMin < 2) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text)]"
        aria-label="Vitals captured moments ago, fresh"
      >
        <span
          aria-hidden
          className="h-1 w-1 rounded-full"
          style={{ background: "var(--color-text)" }}
        />
        fresh
      </span>
    );
  }

  const W = 38;
  const stale = Math.min(1, ageMin / 60);
  const points = poissonDisc({ width: W, height: 14, radius: 2.4, seed });
  const rng = mulberry32(seed + 1);
  const tinted = ageMin > 60;
  const dots = points.filter((p) => {
    const t = p.x / W;
    return rng() < t * stale * 0.95;
  });
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Vitals captured ${ageMin} minutes ago${tinted ? " — stale" : ""}`}
    >
      <svg width={W} height={14} viewBox={`0 0 ${W} 14`} className="block" aria-hidden="true">
        {dots.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={0.85}
            fill={tinted ? "var(--color-accent)" : "var(--color-text)"}
            opacity={0.6}
          />
        ))}
      </svg>
      <span
        className="font-mono text-[10px] tabular-nums uppercase tracking-[0.14em]"
        style={{
          color: tinted ? "var(--color-accent)" : "var(--color-text-muted)",
        }}
      >
        {ageMin}m
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const tone =
    status === "in-room"
      ? "var(--color-success)"
      : status === "triaged"
        ? "var(--color-accent-2)"
        : status === "arrived"
          ? "var(--color-warning)"
          : "var(--color-warning)";
  const label =
    status === "in-room"
      ? "In room"
      : status === "triaged"
        ? "Triaged"
        : status === "arrived"
          ? "Arrived"
          : "Waiting";
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text)]"
      aria-label={`Status: ${label}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}
