import { mulberry32, poissonDisc } from "@/components/_kit/dot-noise";

/**
 * Bed board — a single Med-Surg unit, four bays of six beds each. The
 * spatial pattern of occupancy and acuity is the visual signal: a
 * clinician walks the board the way a nurse walks the unit.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - Each occupied bed cell carries a Bridson stipple whose coverage
 *    encodes length-of-stay. Same primitive, same canon range as every
 *    other density-as-quantity surface. Day 1 reads as floor (~3%); day
 *    7+ approaches the ceiling. The eye reads "this patient has been
 *    here a while" before reading any number.
 *  - Isolation precautions render as a *perimeter* stipple — a one-px
 *    inset of dots around the cell edge. The cell interior stays flat
 *    (chrome rule). Yellow for droplet, persimmon for contact.
 *  - Empty / clean / dirty states are distinct cell vocabularies,
 *    none colour-only: empty has a registration crosshair in the
 *    centre, clean has a single Federal Blue check-dot, dirty has a
 *    persimmon warning trio.
 *  - Acuity dot in the corner mirrors the triage-queue ESI vocabulary
 *    so the cross-plate language reads as one system.
 *
 * Pure server component. Mock census; no PHI.
 */

type BedState =
  | { kind: "empty"; status: "clean" | "dirty" | "blocked" }
  | {
      kind: "occupied";
      patient: string;
      initials: string;
      sex: "M" | "F" | "X";
      losHours: number;
      esi: 1 | 2 | 3 | 4 | 5;
      isolation?: "contact" | "droplet" | "airborne" | "neutropenic";
    };

type Bed = {
  id: string;
  state: BedState;
};

const BAYS: { name: string; beds: Bed[] }[] = [
  {
    name: "Bay 412",
    beds: [
      { id: "412-A", state: { kind: "occupied", patient: "Alvarez, M.", initials: "MA", sex: "M", losHours: 14, esi: 4 } },
      { id: "412-B", state: { kind: "occupied", patient: "Patel, R.", initials: "RP", sex: "F", losHours: 55, esi: 3 } },
      { id: "412-C", state: { kind: "empty", status: "clean" } },
      { id: "412-D", state: { kind: "occupied", patient: "Liu, K.", initials: "KL", sex: "M", losHours: 138, esi: 3, isolation: "contact" } },
      { id: "412-E", state: { kind: "occupied", patient: "Brown, S.", initials: "SB", sex: "F", losHours: 6, esi: 4 } },
      { id: "412-F", state: { kind: "empty", status: "dirty" } },
    ],
  },
  {
    name: "Bay 413",
    beds: [
      { id: "413-A", state: { kind: "occupied", patient: "Cohen, R.", initials: "RC", sex: "M", losHours: 92, esi: 2, isolation: "droplet" } },
      { id: "413-B", state: { kind: "occupied", patient: "Davis, J.", initials: "JD", sex: "F", losHours: 27, esi: 3 } },
      { id: "413-C", state: { kind: "occupied", patient: "Park, H.", initials: "HP", sex: "F", losHours: 46, esi: 3 } },
      { id: "413-D", state: { kind: "empty", status: "clean" } },
      { id: "413-E", state: { kind: "occupied", patient: "Hassan, F.", initials: "FH", sex: "F", losHours: 18, esi: 4 } },
      { id: "413-F", state: { kind: "occupied", patient: "Singh, P.", initials: "PS", sex: "M", losHours: 220, esi: 2, isolation: "neutropenic" } },
    ],
  },
  {
    name: "Bay 414",
    beds: [
      { id: "414-A", state: { kind: "occupied", patient: "Rivera, T.", initials: "TR", sex: "M", losHours: 8, esi: 4 } },
      { id: "414-B", state: { kind: "empty", status: "blocked" } },
      { id: "414-C", state: { kind: "occupied", patient: "Wong, L.", initials: "LW", sex: "F", losHours: 73, esi: 3 } },
      { id: "414-D", state: { kind: "occupied", patient: "Adler, S.", initials: "SA", sex: "X", losHours: 110, esi: 3 } },
      { id: "414-E", state: { kind: "empty", status: "clean" } },
      { id: "414-F", state: { kind: "occupied", patient: "Romero, V.", initials: "VR", sex: "F", losHours: 41, esi: 4 } },
    ],
  },
  {
    name: "Bay 415",
    beds: [
      { id: "415-A", state: { kind: "occupied", patient: "Garcia, M.", initials: "MG", sex: "F", losHours: 63, esi: 3 } },
      { id: "415-B", state: { kind: "occupied", patient: "Nguyen, L.", initials: "LN", sex: "M", losHours: 4, esi: 2, isolation: "airborne" } },
      { id: "415-C", state: { kind: "empty", status: "dirty" } },
      { id: "415-D", state: { kind: "occupied", patient: "Lee, K.", initials: "KL", sex: "M", losHours: 31, esi: 3 } },
      { id: "415-E", state: { kind: "occupied", patient: "Chen, M.", initials: "MC", sex: "F", losHours: 167, esi: 2 } },
      { id: "415-F", state: { kind: "empty", status: "clean" } },
    ],
  },
];

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
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
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
          </div>
          <Legend />
        </div>

        {/* Bays */}
        <div className="grid min-h-0 flex-1 grid-cols-4 divide-x divide-[var(--color-border)]">
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
          Cell density encodes length-of-stay; perimeter stipples flag
          isolation. Empty cells distinguish clean, dirty, and blocked by
          shape, not by colour alone.
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
      <ul className="grid flex-1 grid-cols-2 gap-px bg-[var(--color-border)] p-px">
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
    return <EmptyCell id={bed.id} status={bed.state.status} />;
  }
  return <OccupiedCell id={bed.id} state={bed.state} />;
}

function EmptyCell({
  id,
  status,
}: {
  id: string;
  status: "clean" | "dirty" | "blocked";
}) {
  return (
    <div className="relative flex h-full min-h-[88px] flex-col bg-[var(--color-surface)] p-2">
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
      </div>
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
  return (
    <div className="relative h-full min-h-[88px] overflow-hidden bg-[var(--color-bg)]">
      {/* LOS density backdrop. Coverage scales with hours-of-stay. */}
      <LosBackdrop hours={state.losHours} seed={id.charCodeAt(2) * 31 + id.charCodeAt(4)} />

      {/* Isolation perimeter, if present. */}
      {state.isolation && <IsolationPerimeter kind={state.isolation} />}

      {/* Foreground */}
      <div className="relative flex h-full flex-col p-2">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text)]">
            {id}
          </span>
          <AcuityDot esi={state.esi} />
        </div>
        <div className="mt-auto leading-tight">
          <div className="flex items-baseline gap-1.5">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-surface-2)] font-mono text-[10px] tracking-tight text-[var(--color-text)] ring-1 ring-[var(--color-border)]">
              {state.initials}
            </span>
            <span className="truncate text-[11.5px] font-medium text-[var(--color-text)]">
              {state.patient}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            <span>{state.sex}</span>
            <span>{fmtLos(state.losHours)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** LOS backdrop — Bridson stipple whose density scales with hours-of-stay.
 *  0–8h ≈ floor; 7+ days ≈ ceiling. Canon-bounded. */
function LosBackdrop({ hours, seed }: { hours: number; seed: number }) {
  // Map 0–168h (one week) to keep_prob 0.14–0.92 (≈3% → ≈22% coverage).
  const norm = Math.min(1, hours / 168);
  const keep = 0.14 + norm * 0.78;
  const W = 100;
  const H = 80;
  const points = poissonDisc({ width: W, height: H, radius: 4.2, seed });
  const rng = mulberry32(seed + 1);
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {points.map((p, i) => {
        if (rng() > keep) return null;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={0.95}
            fill="var(--color-text)"
            opacity={0.32}
          />
        );
      })}
    </svg>
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
      {/* Mono caps tag in the bottom-right corner — analytical readout. */}
      <text
        x={W - inset - 1}
        y={H - inset - 4}
        textAnchor="end"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 5.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fill: ink,
        }}
      >
        {kind}
      </text>
    </svg>
  );
}

/** Acuity dot — coverage encodes ESI 1–5 (matches triage-queue vocabulary). */
function AcuityDot({ esi }: { esi: 1 | 2 | 3 | 4 | 5 }) {
  const cell = 14;
  const ESI_DENSITY: Record<number, number> = {
    1: 0.95, 2: 0.78, 3: 0.55, 4: 0.32, 5: 0.18,
  };
  const ink = esi <= 2 ? "var(--color-accent-2)" : "var(--color-text)";
  const points = poissonDisc({ width: cell, height: cell, radius: 2.3, seed: esi * 17 + 4 });
  const rng = mulberry32(esi * 91 + 4);
  const dots = points.filter(() => rng() < ESI_DENSITY[esi]);
  return (
    <svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`} aria-label={`ESI ${esi}`}>
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={0.75} fill={ink} />
      ))}
    </svg>
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
      <svg width={10} height={10} viewBox="0 0 10 10">
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
    <svg width={20} height={20} viewBox="0 0 20 20" aria-label="Dirty">
      {/* Three persimmon dots in a triangle — quiet warning, no icon font. */}
      <circle cx={10} cy={4} r={1.6} fill="var(--color-accent)" />
      <circle cx={5} cy={13} r={1.6} fill="var(--color-accent)" />
      <circle cx={15} cy={13} r={1.6} fill="var(--color-accent)" />
    </svg>
  );
}

function BlockedGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-label="Blocked">
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

function fmtLos(hours: number): string {
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
    <div className="flex items-center gap-3">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: it.ink }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
