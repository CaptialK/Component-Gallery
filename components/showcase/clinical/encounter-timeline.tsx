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
import { AbnormalFlag } from "@/components/_kit/abnormal-flag";
import { Timestamp } from "@/components/_kit/timestamp";

/**
 * Encounter timeline — chronological event log for a hospital admission.
 * Events are nodes; the thread between them is a hairline. Read top-to-bottom,
 * the visual answers "what happened in what order" before the eye reads any
 * individual event.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - The connecting thread is a vertical hairline. Earlier versions used a
 *    Bridson dot trail with density encoding time-since-prev; the dot+line
 *    system pass (DECISIONS.md 2026-05-03 retrospective) reframes this:
 *    connection between events is a *line*, the timestamps in the gutter
 *    carry the gap analytically.
 *  - Each event row carries a single Federal Blue dot in its gutter — the
 *    "still happening" mark on the most recent event, plain walnut on the
 *    rest. Same vocabulary as the vitals live-marker.
 *  - The "ongoing" tail under the last event is still a Bridson dot trail —
 *    open-ended, no terminus, hand-set into the rhythm of the plate.
 *
 * 2026-05-05 medical-standard pass adds:
 *  - Each event's wall-clock timestamp uses <Timestamp format="absolute">
 *    alongside the day-of-encounter notation. Clinicians read both registers.
 *  - Flagged events carry an explicit <AbnormalFlag> beside the title — color
 *    is no longer the sole signal.
 *  - aria-current="step" on the most-recent <li>; the live ring is reinforced
 *    by structural semantics, not just visual stipple.
 *  - Cosign-pending state on resident notes (icon + label).
 *  - Pending labs render with a dashed-border node + "pending" mono-cap.
 */

type EventKind = "admit" | "vitals" | "lab" | "imaging" | "med" | "note" | "consult" | "discharge";

type TimelineEvent = {
  /** Minutes since admission (06:18 on day 1). */
  minutes: number;
  /** ISO timestamp of the event — drives <Timestamp absolute>. */
  iso: string;
  kind: EventKind;
  title: string;
  detail?: string;
  /** Highlighted result — flagged labs, abnormal findings. */
  flagged?: boolean;
  /** Severity for AbnormalFlag (defaults to "high" if flagged + unspecified). */
  severity?: "low" | "high" | "critical-low" | "critical-high" | "panic";
  /** Lab/imaging awaiting result. */
  pending?: boolean;
  /** Note authored by resident, awaiting attending cosign. */
  cosignPending?: boolean;
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

// Encounter started 04 May 2026 06:18 local. ISO timestamps derive from that.
const ADMIT_ISO = "2026-05-04T06:18:00";

function isoFromMinutes(minutes: number): string {
  const base = new Date(ADMIT_ISO).getTime();
  return new Date(base + minutes * 60_000).toISOString();
}

const EVENTS: TimelineEvent[] = [
  { minutes: 0,    kind: "admit",   title: "Admit · Med-Surg 412-B",       detail: "Hyperglycemia workup. ESI 3.",                       iso: isoFromMinutes(0)   },
  { minutes: 32,   kind: "vitals",  title: "Initial vitals",                detail: "T 37.6 °C  HR 84  BP 124/76  SpO₂ 96 %  RR 19",     iso: isoFromMinutes(32)  },
  { minutes: 40,   kind: "lab",     title: "Labs drawn",                    detail: "CMP, CBC, lactate, HbA1c · pending result",          iso: isoFromMinutes(40), pending: true },
  { minutes: 134,  kind: "lab",     title: "WBC 12.6 returned",             detail: "Mild leukocytosis · ref 4.5–11.0 ×10⁹/L",            iso: isoFromMinutes(134), flagged: true, severity: "high" },
  { minutes: 207,  kind: "lab",     title: "K 3.3 returned",                detail: "Hypokalemia · ref 3.5–5.0 mEq/L · replete 40 mEq PO", iso: isoFromMinutes(207), flagged: true, severity: "low" },
  { minutes: 230,  kind: "imaging", title: "CXR ordered",                   detail: "PA + lateral, R/O infiltrate · pending result",      iso: isoFromMinutes(230), pending: true },
  { minutes: 322,  kind: "note",    title: "H&P · Stein, M. (PGY-2)",       detail: "Plan: K replete, recheck CMP at 18:00",              iso: isoFromMinutes(322), cosignPending: true },
  { minutes: 345,  kind: "med",     title: "Lisinopril 10 mg PO",           detail: "08:00 dose, given on time",                          iso: isoFromMinutes(345) },
  { minutes: 363,  kind: "med",     title: "Aspirin 81 mg PO",              detail: "Continued from home regimen",                        iso: isoFromMinutes(363) },
  { minutes: 372,  kind: "med",     title: "Metformin 500 mg PO",           detail: "Held pending glucose trend",                         iso: isoFromMinutes(372) },
  { minutes: 470,  kind: "consult", title: "Endocrinology consult",         detail: "Sliding-scale insulin recs",                         iso: isoFromMinutes(470) },
  { minutes: 470,  kind: "vitals",  title: "Vitals q4h",                    detail: "T 37.8 °C  HR 86  RR 19",                            iso: isoFromMinutes(470) },
];

const NOW_MINUTES = 470;
const NOW_ISO = isoFromMinutes(NOW_MINUTES);

export default function EncounterTimeline() {
  const flagged = EVENTS.filter((e) => e.flagged).length;
  const lastIdx = EVENTS.length - 1;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Encounter timeline · Patel, R. · MRN 80124-5 · ENC-2026-04-01-188
          </div>
          <p
            className="mt-1 font-display text-[19px] italic leading-tight text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            {EVENTS.length} events · {flagged} flagged · {fmtElapsed(NOW_MINUTES)} since admit
          </p>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <span>as of </span>
            <Timestamp value={NOW_ISO} format="absolute" />
          </div>
        </div>

        {/* Timeline */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ol className="relative">
            {EVENTS.map((e, i) => {
              const prev = i > 0 ? EVENTS[i - 1] : null;
              const isLast = i === lastIdx;
              return (
                <Row key={i} event={e} previous={prev} isLast={isLast} />
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
  isLast,
}: {
  event: TimelineEvent;
  previous: TimelineEvent | null;
  isLast: boolean;
}) {
  const Icon = KIND_ICON[event.kind];
  return (
    <li
      className="relative grid grid-cols-[120px_28px_1fr] items-start gap-3 border-b border-[var(--color-border)] px-6 py-3"
      aria-current={isLast ? "step" : undefined}
    >
      {/* Timestamp gutter — both day-of-encounter and wall-clock. */}
      <div className="leading-tight">
        <div className="font-mono text-[11px] tabular-nums text-[var(--color-text)]">
          {fmtElapsed(event.minutes)}
        </div>
        <div className="mt-0.5">
          <Timestamp value={event.iso} format="absolute" />
        </div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {KIND_LABEL[event.kind]}
        </div>
      </div>

      {/* Thread + node column */}
      <div className="relative flex h-full items-start justify-center">
        {/* Connecting hairline above this event. */}
        {previous && <ConnectingThread />}
        {/* Live ring around the most recent event. */}
        {isLast && <LiveRing />}
        <Node
          icon={Icon}
          flagged={!!event.flagged}
          isLast={isLast}
          kind={event.kind}
          pending={!!event.pending}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 leading-tight">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-[var(--color-text)]">
          <span>{event.title}</span>
          {event.flagged && (
            <AbnormalFlag
              severity={event.severity ?? "high"}
              reason={event.title}
              size="sm"
            />
          )}
          {event.pending && (
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              <span
                aria-hidden
                className="mr-1 inline-block h-1 w-1 translate-y-[-1px] rounded-full bg-[var(--color-text-muted)]"
              />
              pending
            </span>
          )}
          {event.cosignPending && (
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--color-accent-2)]">
              <span
                aria-hidden
                className="mr-1 inline-block h-1 w-1 translate-y-[-1px] rounded-full bg-[var(--color-accent-2)]"
              />
              cosign pending
            </span>
          )}
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
  pending,
}: {
  icon: LucideIcon;
  flagged: boolean;
  isLast: boolean;
  kind: EventKind;
  pending: boolean;
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
      className="relative z-10 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-bg)]"
      style={{
        border: `${pending ? "1px dashed" : "1px solid"} ${ink}`,
        color: ink,
      }}
    >
      <Icon size={11} strokeWidth={1.6} aria-hidden />
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
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-live-pulse"
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

/** Vertical hairline thread between events. */
function ConnectingThread() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 -top-[36px] block h-9 w-px -translate-x-1/2 bg-[var(--color-border)]"
    />
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
