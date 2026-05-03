import { mulberry32, poissonDisc } from "@/components/_kit/dot-noise";

/**
 * Triage queue — ED arrivals sorted by acuity (Emergency Severity Index 1–5)
 * and wait time. The table that decides who a clinician sees next.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - ESI is rendered as a per-row stippled cell whose coverage encodes
 *    acuity (Cleveland-McGill area > texture for quantitative encoding,
 *    but for ordinal-with-five-levels density carries the rank fine, and
 *    the numeral is printed next to it for analytical readout). ESI 1 ≈
 *    22% coverage Federal Blue, ESI 5 ≈ 3% walnut.
 *  - Wait time is a horizontal dot trail — one dot per five minutes. The
 *    trail tints persimmon past the threshold for that ESI band (the
 *    "you've now waited too long for your acuity" line is something the
 *    eye can scan, not something a clinician has to read).
 *  - Vitals integrity (a thin band showing whether vitals have been logged
 *    recently) is a fade — Bridson dots tapering into the row from the
 *    right, denser when vitals are stale.
 *
 * Pure server component. Mock data only, no PHI.
 */

type Status = "waiting" | "triaged" | "in-room";

type Patient = {
  id: string;
  initials: string;
  age: number;
  sex: "M" | "F" | "X";
  esi: 1 | 2 | 3 | 4 | 5;
  cc: string;
  waitedMin: number;
  status: Status;
  room?: string;
  vitalsAgeMin: number;
};

const PATIENTS: Patient[] = [
  { id: "ED-2406", initials: "RT", age: 64, sex: "M", esi: 1, cc: "STEMI activation, chest pain 8/10", waitedMin: 0, status: "in-room", room: "T1", vitalsAgeMin: 1 },
  { id: "ED-2412", initials: "MK", age: 31, sex: "F", esi: 2, cc: "Diabetic ketoacidosis, fruity breath", waitedMin: 14, status: "in-room", room: "A3", vitalsAgeMin: 3 },
  { id: "ED-2414", initials: "JL", age: 78, sex: "F", esi: 2, cc: "Stroke alert, left-sided weakness", waitedMin: 4, status: "in-room", room: "T2", vitalsAgeMin: 1 },
  { id: "ED-2419", initials: "DB", age: 22, sex: "M", esi: 3, cc: "RLQ abdominal pain, vomiting", waitedMin: 28, status: "triaged", room: "A6", vitalsAgeMin: 18 },
  { id: "ED-2420", initials: "SP", age: 54, sex: "F", esi: 3, cc: "Migraine w/ aura, photophobia", waitedMin: 71, status: "waiting", vitalsAgeMin: 64 },
  { id: "ED-2422", initials: "AK", age: 9, sex: "M", esi: 3, cc: "Asthma exacerbation, mild WOB", waitedMin: 32, status: "triaged", room: "A8", vitalsAgeMin: 12 },
  { id: "ED-2426", initials: "GR", age: 45, sex: "F", esi: 4, cc: "Laceration L forearm, minor", waitedMin: 96, status: "waiting", vitalsAgeMin: 92 },
  { id: "ED-2428", initials: "HT", age: 71, sex: "M", esi: 4, cc: "Cellulitis L lower leg, mild", waitedMin: 142, status: "waiting", vitalsAgeMin: 132 },
  { id: "ED-2431", initials: "CV", age: 34, sex: "X", esi: 5, cc: "Med refill (HCTZ), no acute s/sx", waitedMin: 188, status: "waiting", vitalsAgeMin: 176 },
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
    (p) => p.waitedMin > WAIT_THRESHOLD[p.esi] && p.status === "waiting",
  ).length;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Triage queue · ED · 14:08
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

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                <Th width="56px">ESI</Th>
                <Th width="124px">Patient</Th>
                <Th>Chief complaint</Th>
                <Th width="180px">Waited</Th>
                <Th width="108px">Vitals</Th>
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
          Coverage encodes acuity; trail length encodes wait. Past each
          ESI's threshold the trail tints persimmon — at chart scale,
          that's the signal triage is slipping.
        </p>
      </div>
    </div>
  );
}

function Th({ children, width }: { children: React.ReactNode; width?: string }) {
  return (
    <th
      style={{ width }}
      className="px-4 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-[0.18em]"
    >
      {children}
    </th>
  );
}

function Row({ p }: { p: Patient }) {
  const threshold = WAIT_THRESHOLD[p.esi];
  const overdue = p.status === "waiting" && p.waitedMin > threshold;

  return (
    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]">
      <td className="px-4 py-2.5 align-middle">
        <ESIDot esi={p.esi} />
      </td>
      <td className="px-4 py-2.5 align-middle">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-surface-2)] font-mono text-[10px] tracking-tight text-[var(--color-text)] ring-1 ring-[var(--color-border)]">
            {p.initials}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-mono text-[11px] text-[var(--color-text)]">
              {p.id}
            </div>
            <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {p.age} y · {p.sex}
            </div>
          </div>
        </div>
      </td>
      <td className="max-w-0 px-4 py-2.5 align-middle">
        <div className="truncate text-[var(--color-text)]">{p.cc}</div>
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

/**
 * The acuity dot. ESI 1 → dense Federal Blue cluster; ESI 5 → sparse walnut.
 * Square cell so the eye can compare across rows. Numeral printed beside it
 * for the analytical readout.
 */
function ESIDot({ esi }: { esi: Patient["esi"] }) {
  const cell = 22;
  // Coverage-canon ramp: each step ≥1.5× the previous, all inside [0.03, 0.22].
  // ESI 5 still reads as "barely there" (≈3.5%) without falling below floor.
  const ESI_DENSITY: Record<number, number> = { 1: 0.95, 2: 0.78, 3: 0.55, 4: 0.32, 5: 0.18 };
  const density = ESI_DENSITY[esi];
  const ink = esi <= 2 ? "var(--color-accent-2)" : "var(--color-text)";
  const points = poissonDisc({ width: cell, height: cell, radius: 2.6, seed: esi * 17 });
  const rng = mulberry32(esi * 91);
  const dots = points.filter(() => rng() < density);

  return (
    <div className="inline-flex items-center gap-2">
      <svg
        width={cell}
        height={cell}
        viewBox={`0 0 ${cell} ${cell}`}
        className="block"
        aria-hidden="true"
      >
        {dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.95} fill={ink} />
        ))}
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

/** Wait trail — one dot per 10 minutes. Persimmon past the per-ESI
 *  threshold. Caps at 18 dots (180 minutes); the numeric label still
 *  carries the actual minutes for analytical readout. */
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

/** Vitals freshness — Bridson taper. Denser when vitals are stale. */
function VitalsFreshness({ ageMin, seed }: { ageMin: number; seed: number }) {
  const W = 38;
  const stale = Math.min(1, ageMin / 60);
  const points = poissonDisc({ width: W, height: 14, radius: 2.4, seed });
  const rng = mulberry32(seed + 1);
  const tinted = ageMin > 60;
  const dots = points.filter((p) => {
    // Heavier on the right edge as the trace ages.
    const t = p.x / W;
    return rng() < t * stale * 0.95;
  });
  return (
    <div className="flex items-center gap-2">
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
      <span className="font-mono text-[10px] tabular-nums text-[var(--color-text-muted)]">
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
        : "var(--color-warning)";
  const label = status === "in-room" ? "In room" : status === "triaged" ? "Triaged" : "Waiting";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text)]">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}
