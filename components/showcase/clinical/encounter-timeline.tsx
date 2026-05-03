import {
  Activity,
  Beaker,
  ClipboardCheck,
  HeartPulse,
  Hospital,
  Pill,
  Scan,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { mulberry32 } from "@/components/_kit/dot-noise";

/**
 * Encounter timeline — chronological event log for a hospital admission.
 * The thread connecting events is a Bridson dot trail; the gap between
 * events is the gap in the trail. Read top-to-bottom, the visual answers
 * "how busy was this admission, and where did things cluster" before the
 * eye reads any individual event.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - The connecting trail's local density encodes time-since-last-event.
 *    Closely-spaced events get a denser run; long quiet stretches go sparse.
 *    Cleveland-McGill puts area above density for quantitative reading,
 *    but here time *should* read as ambient pattern; the timestamps
 *    themselves are the analytical readout.
 *  - Each event row carries a single Federal Blue dot in its gutter — the
 *    "still happening" mark on the most recent event, plain walnut on the
 *    rest. Same vocabulary as the vitals live-marker.
 *  - The admit and discharge anchors get a small stippled crosshair (the
 *    same registration mark the plate frame uses) — they bracket the
 *    encounter the way the plate frame brackets the gallery.
 *
 * Pure server component. Realistic but synthetic admission, no PHI.
 */

type EventKind = "admit" | "vitals" | "lab" | "imaging" | "med" | "note" | "consult" | "discharge";

type TimelineEvent = {
  /** Minutes since admission (06:18 on day 1). */
  minutes: number;
  kind: EventKind;
  title: string;
  detail?: string;
  /** Highlighted result — flagged labs, abnormal findings. */
  flagged?: boolean;
};

const KIND_ICON: Record<EventKind, LucideIcon> = {
  admit: Hospital,
  vitals: HeartPulse,
  lab: Beaker,
  imaging: Scan,
  med: Pill,
  note: ClipboardCheck,
  consult: Stethoscope,
  discharge: Activity,
};

const KIND_LABEL: Record<EventKind, string> = {
  admit: "Admit",
  vitals: "Vitals",
  lab: "Lab",
  imaging: "Imaging",
  med: "Med given",
  note: "Note",
  consult: "Consult",
  discharge: "Discharge",
};

const EVENTS: TimelineEvent[] = [
  { minutes: 0,    kind: "admit",   title: "Admit · Med-Surg 412-B",       detail: "Hyperglycemia workup. ESI 3." },
  { minutes: 32,   kind: "vitals",  title: "Initial vitals",                detail: "T 37.6  HR 84  BP 124/76  SpO₂ 96  RR 19" },
  { minutes: 40,   kind: "lab",     title: "Labs drawn",                    detail: "CMP, CBC, lactate, HbA1c" },
  { minutes: 134,  kind: "lab",     title: "WBC 12.6 returned",             detail: "Mild leukocytosis", flagged: true },
  { minutes: 207,  kind: "lab",     title: "K 3.3 returned",                detail: "Hypokalemia — replete 40 mEq PO", flagged: true },
  { minutes: 230,  kind: "imaging", title: "CXR ordered",                   detail: "PA + lateral, R/O infiltrate" },
  { minutes: 322,  kind: "note",    title: "H&P signed · Hartman, K., MD",  detail: "Plan: K replete, recheck CMP at 18:00" },
  { minutes: 345,  kind: "med",     title: "Lisinopril 10 mg PO",           detail: "08:00 dose, given on time" },
  { minutes: 363,  kind: "med",     title: "Aspirin 81 mg PO",              detail: "Continued from home regimen" },
  { minutes: 372,  kind: "med",     title: "Metformin 500 mg PO",           detail: "Held pending glucose trend" },
  { minutes: 470,  kind: "consult", title: "Endocrinology consult",         detail: "Sliding-scale insulin recs" },
  { minutes: 470,  kind: "vitals",  title: "Vitals q4h",                    detail: "T 37.8  HR 86  RR 19" },
];

const NOW_MINUTES = 470;

export default function EncounterTimeline() {
  const flagged = EVENTS.filter((e) => e.flagged).length;
  const lastIdx = EVENTS.length - 1;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Encounter timeline · Patel, R. · ENC-2026-04-01-188
          </div>
          <p
            className="mt-1 font-display text-[19px] italic leading-tight text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            {EVENTS.length} events · {flagged} flagged · {fmtElapsed(NOW_MINUTES)} since admit
          </p>
        </div>

        {/* Timeline */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ol className="relative">
            {EVENTS.map((e, i) => {
              const prev = i > 0 ? EVENTS[i - 1] : null;
              const gap = prev ? e.minutes - prev.minutes : 0;
              const isLast = i === lastIdx;
              return (
                <Row key={i} event={e} previous={prev} gap={gap} isLast={isLast} />
              );
            })}
            {/* Open-ended thread below the last event signaling "still
                ongoing." Sparse stipple, no terminal anchor. */}
            <li className="relative grid grid-cols-[120px_28px_1fr] items-center gap-3 px-6 py-3">
              <div />
              <div className="relative flex justify-center">
                <OngoingThread />
              </div>
              <div className="text-[11px] italic text-[var(--color-text-muted)]">
                ongoing.
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function Row({
  event,
  previous,
  gap,
  isLast,
}: {
  event: TimelineEvent;
  previous: TimelineEvent | null;
  gap: number;
  isLast: boolean;
}) {
  const Icon = KIND_ICON[event.kind];
  return (
    <li className="relative grid grid-cols-[120px_28px_1fr] items-start gap-3 border-b border-[var(--color-border)] px-6 py-3">
      {/* Timestamp gutter */}
      <div className="leading-tight">
        <div className="font-mono text-[11px] tabular-nums text-[var(--color-text)]">
          {fmtElapsed(event.minutes)}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {KIND_LABEL[event.kind]}
        </div>
      </div>

      {/* Thread + node column */}
      <div className="relative flex h-full items-start justify-center">
        {/* Connecting trail above this event. Density encodes time-since-prev. */}
        {previous && <ConnectingTrail gapMinutes={gap} />}
        {/* Live ring around the most recent event. */}
        {isLast && <LiveRing />}
        <Node icon={Icon} flagged={!!event.flagged} isLast={isLast} kind={event.kind} />
      </div>

      {/* Content */}
      <div className="min-w-0 leading-tight">
        <div className="text-[13px] font-medium text-[var(--color-text)]">
          {event.title}
        </div>
        {event.detail && (
          <div className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
            {event.detail}
          </div>
        )}
      </div>
    </li>
  );
}

function Node({
  icon: Icon,
  flagged,
  isLast,
  kind,
}: {
  icon: LucideIcon;
  flagged: boolean;
  isLast: boolean;
  kind: EventKind;
}) {
  const ink = flagged
    ? "var(--color-accent)"
    : isLast
      ? "var(--color-accent-2)"
      : kind === "admit" || kind === "discharge"
        ? "var(--color-accent-2)"
        : "var(--color-text-muted)";
  return (
    <div
      className="relative z-10 grid h-6 w-6 place-items-center rounded-full border bg-[var(--color-bg)]"
      style={{
        borderColor: ink,
        color: ink,
      }}
    >
      <Icon size={11} strokeWidth={1.6} />
    </div>
  );
}

/** The live ring — Federal Blue stipple around the most recent node. Same
 *  vocabulary as the vitals sparkline live-marker. */
function LiveRing() {
  return (
    <svg
      width={38}
      height={38}
      viewBox="0 0 38 38"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      aria-hidden="true"
    >
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={19 + Math.cos(a) * 14}
            cy={19 + Math.sin(a) * 14}
            r={0.7}
            fill="var(--color-accent-2)"
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}

/**
 * The connecting trail — vertical Bridson dots between this event and the
 * previous. Coverage scales with elapsed minutes: tighter clusters when
 * events are close in time, sparser runs across hours of quiet.
 */
function ConnectingTrail({ gapMinutes }: { gapMinutes: number }) {
  // Map gap to keep-probability (canon-bounded). 0 min → ~22%, 240+ min → ~3%.
  const dens = Math.max(0.14, Math.min(1, 1 - gapMinutes / 320));
  const W = 8;
  // Vertical extent: trail rises from the node's top edge to the previous
  // node's bottom — px-3 on each side of the row + ~24px nominal gap.
  const H = 36;
  const points: { x: number; y: number }[] = [];
  // Run a tiny Bridson manually along the column so we don't repeat pattern.
  const rng = mulberry32(gapMinutes * 7 + 11);
  for (let y = 1; y < H; y += 2) {
    const x = W / 2 + (rng() - 0.5) * 4;
    if (rng() > dens) continue;
    points.push({ x, y });
  }
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 -top-[36px] -translate-x-1/2"
    >
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={0.85}
          fill="var(--color-text)"
          opacity={0.55}
        />
      ))}
    </svg>
  );
}

function OngoingThread() {
  return (
    <svg
      width={8}
      height={32}
      viewBox="0 0 8 32"
      aria-hidden="true"
      className="block"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <circle
          key={i}
          cx={4}
          cy={4 + i * 8}
          r={0.85}
          fill="var(--color-text-muted)"
          opacity={0.45}
        />
      ))}
    </svg>
  );
}

function fmtElapsed(minutes: number): string {
  // Format minutes-since-admit as either H:MM or D + H:MM.
  const days = Math.floor(minutes / (60 * 24));
  const remH = Math.floor((minutes % (60 * 24)) / 60);
  const remM = minutes % 60;
  const hm = `${String(remH).padStart(2, "0")}:${String(remM).padStart(2, "0")}`;
  return days > 0 ? `D${days + 1} ${hm}` : `D1 ${hm}`;
}
