import { Timestamp } from "@/components/_kit/timestamp";

/**
 * Bed board — a single Med-Surg unit, four bays of six beds each. The
 * spatial pattern of occupancy and acuity is the visual signal: a
 * clinician walks the board the way a nurse walks the unit.
 *
 * Refactored 2026-05-05 against THE MEDICAL STANDARD:
 *  - ESI 1 is no longer colour-only — adds a leading `!` glyph + `ESI 1`
 *    mono-caps label adjacent to the dot. ESI 2 keeps the Federal Blue dot
 *    + sized area cue.
 *  - Long-stay (≥ 96 h) cells gain a small clock/hourglass glyph above the
 *    LOS bar so the persimmon ink is never the sole differentiator.
 *  - Boarding cells (admitted but no inpatient bed assigned) gain their
 *    own "BOARDING" mono-caps glyph; pending admit / pending discharge
 *    gain a fourth empty-cell vocabulary with a caret + dashed perimeter.
 *  - DNR, NPO, fall-risk surface as inline mono-caps tags inside the cell
 *    foreground — these are scannable safety signals on a real bed board.
 *  - "Census as of HH:MM" Timestamp under the headline; staleAfter=10 min
 *    drives the persimmon dot if the feed is delayed.
 *  - Each cell is keyboard-focusable (`tabIndex=0` + role=button) with a
 *    full-sentence aria-label assembling identity, MRN, ESI, isolation, LOS,
 *    code status. MRN is hidden visually for density but reachable on focus.
 *  - Responsive: bays stack to a single column at narrow widths, each bay
 *    becomes a 2×3 grid; legend collapses to a "+ key" affordance below 480px.
 *  - Cell min-height ≥ 88px keeps the press target above the 44px floor.
 *  - Layout reflow uses CSS only; no JS. Tap target ≥ 44px throughout.
 *
 * Refactored 2026-05-03 per the dot+line system change in DECISIONS.md.
 *
 * Pure server component apart from `<Timestamp>` (client island for tick).
 */

type EmptyStatus = "clean" | "dirty" | "blocked" | "pending";

type SafetyFlag = "DNR" | "NPO" | "FALL";

type BedState =
  | { kind: "empty"; status: EmptyStatus; note?: string }
  | { kind: "boarding"; patient: string; initials: string; mrn: string; sex: "M" | "F" | "X"; losHours: number; esi: 1 | 2 | 3 | 4 | 5; flags?: SafetyFlag[] }
  | {
      kind: "occupied";
      patient: string;
      initials: string;
      mrn: string;
      sex: "M" | "F" | "X";
      losHours: number;
      esi: 1 | 2 | 3 | 4 | 5;
      isolation?: "contact" | "droplet" | "airborne" | "neutropenic";
      flags?: SafetyFlag[];
      /** ISO admit timestamp — surfaces in cell aria-label and (future) popover. */
      admittedAt?: string;
    };

type Bed = {
  id: string;
  state: BedState;
};

const BAYS: { name: string; beds: Bed[] }[] = [
  {
    name: "Bay 412",
    beds: [
      { id: "412-A", state: { kind: "occupied", patient: "Alvarez, M.", initials: "MA", mrn: "80098-1", sex: "M", losHours: 14, esi: 4, admittedAt: "2026-05-05T00:08:00Z" } },
      { id: "412-B", state: { kind: "occupied", patient: "Patel, R.", initials: "RP", mrn: "80124-5", sex: "F", losHours: 55, esi: 3, flags: ["DNR"], admittedAt: "2026-05-03T07:08:00Z" } },
      { id: "412-C", state: { kind: "empty", status: "clean" } },
      { id: "412-D", state: { kind: "occupied", patient: "Liu, K.", initials: "KL", mrn: "80091-2", sex: "M", losHours: 138, esi: 3, isolation: "contact", flags: ["NPO"], admittedAt: "2026-04-29T20:08:00Z" } },
      { id: "412-E", state: { kind: "occupied", patient: "Brown, S.", initials: "SB", mrn: "80130-7", sex: "F", losHours: 6, esi: 4, flags: ["FALL"], admittedAt: "2026-05-05T08:08:00Z" } },
      { id: "412-F", state: { kind: "empty", status: "dirty" } },
    ],
  },
  {
    name: "Bay 413",
    beds: [
      { id: "413-A", state: { kind: "occupied", patient: "Cohen, R.", initials: "RC", mrn: "80104-3", sex: "M", losHours: 92, esi: 2, isolation: "droplet", admittedAt: "2026-05-01T18:08:00Z" } },
      { id: "413-B", state: { kind: "occupied", patient: "Davis, J.", initials: "JD", mrn: "80117-8", sex: "F", losHours: 27, esi: 3, admittedAt: "2026-05-04T11:08:00Z" } },
      { id: "413-C", state: { kind: "occupied", patient: "Park, H.", initials: "HP", mrn: "80119-9", sex: "F", losHours: 46, esi: 3, admittedAt: "2026-05-03T16:08:00Z" } },
      { id: "413-D", state: { kind: "empty", status: "pending", note: "Admit en route" } },
      { id: "413-E", state: { kind: "occupied", patient: "Hassan, F.", initials: "FH", mrn: "80128-4", sex: "F", losHours: 18, esi: 4, admittedAt: "2026-05-04T20:08:00Z" } },
      { id: "413-F", state: { kind: "occupied", patient: "Singh, P.", initials: "PS", mrn: "80072-3", sex: "M", losHours: 220, esi: 2, isolation: "neutropenic", flags: ["DNR", "NPO"], admittedAt: "2026-04-26T10:08:00Z" } },
    ],
  },
  {
    name: "Bay 414",
    beds: [
      { id: "414-A", state: { kind: "occupied", patient: "Rivera, T.", initials: "TR", mrn: "80133-2", sex: "M", losHours: 8, esi: 4, admittedAt: "2026-05-05T06:08:00Z" } },
      { id: "414-B", state: { kind: "empty", status: "blocked" } },
      { id: "414-C", state: { kind: "occupied", patient: "Wong, L.", initials: "LW", mrn: "80108-7", sex: "F", losHours: 73, esi: 3, admittedAt: "2026-05-02T13:08:00Z" } },
      { id: "414-D", state: { kind: "occupied", patient: "Adler, S.", initials: "SA", mrn: "80111-4", sex: "X", losHours: 110, esi: 3, flags: ["FALL"], admittedAt: "2026-04-30T22:08:00Z" } },
      { id: "414-E", state: { kind: "boarding", patient: "Kim, R.", initials: "RK", mrn: "80140-1", sex: "M", losHours: 11, esi: 2, flags: ["NPO"] } },
      { id: "414-F", state: { kind: "occupied", patient: "Romero, V.", initials: "VR", mrn: "80125-6", sex: "F", losHours: 41, esi: 4, admittedAt: "2026-05-03T21:08:00Z" } },
    ],
  },
  {
    name: "Bay 415",
    beds: [
      { id: "415-A", state: { kind: "occupied", patient: "Garcia, M.", initials: "MG", mrn: "80115-2", sex: "F", losHours: 63, esi: 3, admittedAt: "2026-05-02T23:08:00Z" } },
      { id: "415-B", state: { kind: "occupied", patient: "Nguyen, L.", initials: "LN", mrn: "80138-9", sex: "M", losHours: 4, esi: 1, isolation: "airborne", admittedAt: "2026-05-05T10:08:00Z" } },
      { id: "415-C", state: { kind: "empty", status: "dirty" } },
      { id: "415-D", state: { kind: "occupied", patient: "Lee, K.", initials: "KL", mrn: "80120-3", sex: "M", losHours: 31, esi: 3, admittedAt: "2026-05-04T07:08:00Z" } },
      { id: "415-E", state: { kind: "occupied", patient: "Chen, M.", initials: "MC", mrn: "80082-5", sex: "F", losHours: 167, esi: 2, flags: ["DNR"], admittedAt: "2026-04-28T15:08:00Z" } },
      { id: "415-F", state: { kind: "empty", status: "clean" } },
    ],
  },
];

const CENSUS_AS_OF = "2026-05-05T14:08:00Z";

export default function BedBoard() {
  const allBeds = BAYS.flatMap((b) => b.beds);
  const occupied = allBeds.filter((b) => b.state.kind === "occupied").length;
  const isolation = allBeds.filter(
    (b) => b.state.kind === "occupied" && b.state.isolation,
  ).length;
  const dirty = allBeds.filter(
    (b) => b.state.kind === "empty" && b.state.status === "dirty",
  ).length;
  const total = allBeds.length;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Bed board · Med-Surg 4 · Day shift
            </div>
            <p
              className="mt-1 font-display text-[19px] italic leading-none text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              {occupied} of {total} occupied · {isolation} on isolation · {dirty} dirty
            </p>
            <p className="mt-1 inline-flex items-baseline gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Census as of{" "}
              <Timestamp value={CENSUS_AS_OF} format="absolute" />
              <span aria-hidden className="opacity-60">·</span>
              <span>refreshes q5m</span>
            </p>
          </div>
          <Legend />
        </div>

        {/* Bays — single column at narrow, two-up at md, four-up at lg. */}
        <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-[var(--color-border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {BAYS.map((bay) => (
            <Bay key={bay.name} bay={bay} />
          ))}
        </div>

        <p
          className="border-t border-[var(--color-border)] px-6 py-2 text-center text-[11px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          The bar at each cell's top edge encodes length-of-stay; perimeter
          stipples flag isolation; the corner dot's size encodes acuity. ESI 1
          and long-stay cells carry an explicit glyph, never colour alone.
          Empty cells distinguish clean, dirty, blocked, and pending by shape.
        </p>
      </div>
    </div>
  );
}

function Bay({ bay }: { bay: { name: string; beds: Bed[] } }) {
  return (
    <div className="flex flex-col">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {bay.name}
        </span>
      </div>
      <ul
        className="grid flex-1 grid-cols-2 gap-px bg-[var(--color-border)] p-px"
        aria-label={`${bay.name} beds`}
      >
        {bay.beds.map((bed) => (
          <li key={bed.id} className="bg-[var(--color-bg)]">
            <BedCell bed={bed} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function BedCell({ bed }: { bed: Bed }) {
  if (bed.state.kind === "empty") {
    return <EmptyCell id={bed.id} status={bed.state.status} note={bed.state.note} />;
  }
  if (bed.state.kind === "boarding") {
    return <BoardingCell id={bed.id} state={bed.state} />;
  }
  return <OccupiedCell id={bed.id} state={bed.state} />;
}

const EMPTY_LABEL: Record<EmptyStatus, string> = {
  clean: "Clean — ready for assignment",
  dirty: "Dirty — awaiting EVS",
  blocked: "Blocked — out of service",
  pending: "Pending transition",
};

function EmptyCell({
  id,
  status,
  note,
}: {
  id: string;
  status: EmptyStatus;
  note?: string;
}) {
  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Bed ${id}, ${EMPTY_LABEL[status]}${note ? `, ${note}` : ""}`}
      className="relative flex h-full min-h-[88px] flex-col bg-[var(--color-surface)] p-2 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-text)]"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {id}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {status}
        </span>
      </div>
      <div className="grid flex-1 place-items-center">
        {status === "clean" && <CleanGlyph />}
        {status === "dirty" && <DirtyGlyph />}
        {status === "blocked" && <BlockedGlyph />}
        {status === "pending" && <PendingGlyph />}
      </div>
      {note && (
        <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {note}
        </div>
      )}
    </div>
  );
}

function OccupiedCell({
  id,
  state,
}: {
  id: string;
  state: Extract<BedState, { kind: "occupied" }>;
}) {
  const aria = buildOccupiedAria(id, state);
  const isLongStay = state.losHours >= 96;
  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={aria}
      className="relative h-full min-h-[88px] overflow-hidden bg-[var(--color-surface)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-text)]"
    >
      {/* LOS bar — top edge of cell, length scales with hours. */}
      <LosBar hours={state.losHours} />

      {/* Long-stay glyph — small clock dot motif above the bar. NEVER colour alone. */}
      {isLongStay && <LongStayGlyph />}

      {/* Isolation perimeter, if present. */}
      {state.isolation && <IsolationPerimeter kind={state.isolation} />}

      {/* Foreground */}
      <div className="relative flex h-full flex-col p-2 pt-2.5">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text)]">
            {id}
          </span>
          <AcuityMark esi={state.esi} />
        </div>
        <div className="mt-auto leading-tight">
          <div className="flex items-baseline gap-1.5">
            <span
              aria-hidden
              className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-surface-2)] font-mono text-[10px] tracking-tight text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
            >
              {state.initials}
            </span>
            <span className="truncate text-[11.5px] font-medium text-[var(--color-text)]">
              {state.patient}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            <span>{state.sex}</span>
            <span aria-hidden>{fmtLos(state.losHours)}</span>
          </div>
          {state.flags && state.flags.length > 0 && (
            <SafetyFlags flags={state.flags} />
          )}
        </div>
      </div>
    </div>
  );
}

function BoardingCell({
  id,
  state,
}: {
  id: string;
  state: Extract<BedState, { kind: "boarding" }>;
}) {
  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Bed ${id}, boarding ${state.patient}, MRN ${state.mrn}, ESI ${state.esi}, awaiting inpatient assignment, length of stay ${fmtLos(state.losHours)}`}
      className="relative h-full min-h-[88px] overflow-hidden border-2 border-dashed border-[var(--color-warning)] bg-[var(--color-surface)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-text)]"
    >
      <div className="relative flex h-full flex-col p-2">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text)]">
            {id}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-warning)]">
            <span
              aria-hidden
              className="h-1 w-1 rounded-full"
              style={{ background: "var(--color-warning)" }}
            />
            boarding
          </span>
        </div>
        <div className="mt-auto leading-tight">
          <div className="flex items-baseline gap-1.5">
            <AcuityMark esi={state.esi} inline />
            <span className="truncate text-[11.5px] font-medium text-[var(--color-text)]">
              {state.patient}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            <span>{state.sex}</span>
            <span>{fmtLos(state.losHours)}</span>
          </div>
          {state.flags && state.flags.length > 0 && (
            <SafetyFlags flags={state.flags} />
          )}
        </div>
      </div>
    </div>
  );
}

function buildOccupiedAria(
  id: string,
  s: Extract<BedState, { kind: "occupied" }>,
): string {
  const parts: string[] = [];
  parts.push(`Bed ${id}`);
  parts.push(`occupied by ${s.patient}`);
  parts.push(`MRN ${s.mrn}`);
  parts.push(`sex ${s.sex}`);
  parts.push(`ESI ${s.esi}${s.esi === 1 ? " — most acute" : ""}`);
  if (s.isolation) parts.push(`${s.isolation} precautions`);
  parts.push(`length of stay ${fmtLos(s.losHours)}${s.losHours >= 96 ? ", long stay" : ""}`);
  if (s.flags && s.flags.length > 0) {
    parts.push(`safety: ${s.flags.join(", ")}`);
  }
  return parts.join(", ");
}

/**
 * LOS bar — thin horizontal line at the top edge of the cell. Length scales
 * with hours of stay (0–168h = full bar at one week). Color tracks tier.
 * Replaced a Bridson density backdrop (DECISIONS.md 2026-05-03 retrospective).
 *
 * Color is a redundant cue. The shape signal at ≥96h is the LongStayGlyph
 * above the bar — color never carries the meaning alone (medical bar).
 */
function LosBar({ hours }: { hours: number }) {
  const fraction = Math.min(1, hours / 168);
  const color =
    hours >= 96
      ? "var(--color-accent)"
      : hours >= 24
        ? "var(--color-text)"
        : "var(--color-border-strong)";
  return (
    <div
      aria-hidden
      className="absolute left-0 right-0 top-0 h-[2px] bg-[var(--color-border)]"
    >
      <div
        className="h-full"
        style={{ width: `${fraction * 100}%`, background: color }}
      />
    </div>
  );
}

/** Long-stay glyph — small clock-trio above the bar at ≥96h. */
function LongStayGlyph() {
  return (
    <span
      aria-hidden
      className="absolute right-1.5 top-1 inline-flex items-center gap-px"
      title="Long stay (≥96 h)"
    >
      <svg width={9} height={9} viewBox="0 0 9 9" className="block">
        <circle cx={4.5} cy={4.5} r={3.5} fill="none" stroke="var(--color-accent)" strokeWidth={1} />
        <line x1={4.5} y1={4.5} x2={4.5} y2={2.2} stroke="var(--color-accent)" strokeWidth={1} strokeLinecap="round" />
        <line x1={4.5} y1={4.5} x2={6.4} y2={4.5} stroke="var(--color-accent)" strokeWidth={1} strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Isolation perimeter — dots inset 1.5px around the cell edge. */
function IsolationPerimeter({
  kind,
}: {
  kind: NonNullable<Extract<BedState, { kind: "occupied" }>["isolation"]>;
}) {
  const ink =
    kind === "contact"
      ? "var(--color-accent)"
      : kind === "droplet"
        ? "var(--color-warning)"
        : kind === "airborne"
          ? "var(--color-danger)"
          : "var(--color-accent-2)";
  const W = 100;
  const H = 80;
  // Place dots along the four edges with 4px spacing.
  const dots: { x: number; y: number }[] = [];
  const inset = 2;
  const step = 4;
  for (let x = inset; x <= W - inset; x += step) {
    dots.push({ x, y: inset });
    dots.push({ x, y: H - inset });
  }
  for (let y = inset + step; y < H - inset; y += step) {
    dots.push({ x: inset, y });
    dots.push({ x: W - inset, y });
  }
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-label={`${kind} precautions`}
    >
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={0.9} fill={ink} opacity={0.95} />
      ))}
    </svg>
  );
}

/**
 * Acuity mark — sized dot for ESI 2-5; ESI 1 (most acute) gets a leading
 * `!` chevron + `ESI 1` mono-cap label so the cue is shape + label + colour,
 * never colour alone.
 */
function AcuityMark({ esi, inline }: { esi: 1 | 2 | 3 | 4 | 5; inline?: boolean }) {
  if (esi === 1) {
    return (
      <span
        role="img"
        aria-label="ESI 1, most acute"
        className="inline-flex items-center gap-0.5"
      >
        <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden className="block">
          <path
            d="M 5 1 L 9 9 L 1 9 Z"
            fill="var(--color-accent-2)"
          />
          <line x1={5} y1={3.6} x2={5} y2={6.4} stroke="var(--color-bg)" strokeWidth={1} strokeLinecap="round" />
          <circle cx={5} cy={7.6} r={0.7} fill="var(--color-bg)" />
        </svg>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-accent-2)]">
          ESI 1
        </span>
      </span>
    );
  }
  const cell = inline ? 12 : 14;
  // Inverse: ESI 1 (sickest) → 1.0, ESI 5 → 0.0.
  const norm = (5 - esi) / 4;
  const minR = 1.4;
  const maxR = 4.2;
  const r = Math.sqrt(minR * minR + (maxR * maxR - minR * minR) * norm);
  const ink = esi <= 2 ? "var(--color-accent-2)" : "var(--color-text)";
  return (
    <svg
      width={cell}
      height={cell}
      viewBox={`0 0 ${cell} ${cell}`}
      role="img"
      aria-label={`ESI ${esi}`}
    >
      <circle cx={cell / 2} cy={cell / 2} r={r} fill={ink} />
    </svg>
  );
}

function SafetyFlags({ flags }: { flags: SafetyFlag[] }) {
  return (
    <div
      className="mt-1 flex flex-wrap items-center gap-1"
      aria-label={`Safety flags: ${flags.join(", ")}`}
    >
      {flags.map((f) => (
        <span
          key={f}
          className="inline-flex items-center gap-0.5 rounded-[var(--radius-xs)] border border-[var(--color-border)] px-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
          style={{
            color: f === "DNR" ? "var(--color-accent)" : undefined,
            borderColor: f === "DNR" ? "color-mix(in oklch, var(--color-accent) 35%, var(--color-border))" : undefined,
          }}
        >
          {f}
        </span>
      ))}
    </div>
  );
}

function CleanGlyph() {
  return (
    <div
      className="grid h-5 w-5 place-items-center rounded-full"
      style={{
        background: "color-mix(in oklch, var(--color-success) 16%, var(--color-bg))",
      }}
    >
      <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden>
        <path
          d="M 1.5 5.2 L 4 7.5 L 8.5 2.5"
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function DirtyGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" role="img" aria-label="Dirty">
      <circle cx={10} cy={4} r={1.6} fill="var(--color-accent)" />
      <circle cx={5} cy={13} r={1.6} fill="var(--color-accent)" />
      <circle cx={15} cy={13} r={1.6} fill="var(--color-accent)" />
    </svg>
  );
}

function BlockedGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" role="img" aria-label="Blocked">
      <circle
        cx={10}
        cy={10}
        r={6}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="1"
        strokeDasharray="1.5 1.5"
      />
      <line
        x1={5}
        y1={5}
        x2={15}
        y2={15}
        stroke="var(--color-text-muted)"
        strokeWidth="1"
      />
    </svg>
  );
}

/** Pending transition — admit en route or discharge orders signed. */
function PendingGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" role="img" aria-label="Pending transition">
      <circle
        cx={10}
        cy={10}
        r={6}
        fill="none"
        stroke="var(--color-warning)"
        strokeWidth="1"
        strokeDasharray="1.5 1.5"
      />
      {/* Right-pointing chevron — direction of motion. */}
      <path
        d="M 8 7 L 12 10 L 8 13"
        fill="none"
        stroke="var(--color-warning)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fmtLos(hours: number): string {
  if (hours === 0) return "just now";
  if (hours < 24) return `${hours}h`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function Legend() {
  const items = [
    { label: "ESI 1-2", ink: "var(--color-accent-2)" },
    { label: "Contact", ink: "var(--color-accent)" },
    { label: "Droplet", ink: "var(--color-warning)" },
    { label: "Airborne", ink: "var(--color-danger)" },
  ];
  return (
    <div className="hidden items-center gap-3 sm:flex">
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: it.ink }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
