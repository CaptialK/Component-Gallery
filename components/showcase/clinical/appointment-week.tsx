/**
 * Appointment week — outpatient scheduler. Seven columns (Mon–Sun), eleven
 * half-hour rows from 08:00 to 13:30. Appointment blocks sit on the grid;
 * empty cells stay flat so the eye reads "open slot" without ambient noise.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - Empty grid cells stay flat — duration is encoded by block height, type
 *    by the left-edge ink, and "now" by a Federal Blue hairline. The earlier
 *    Bridson free-time backdrop and per-block density-stipple were removed
 *    in the dot+line system pass (DECISIONS.md 2026-05-03 retrospective):
 *    grid cells beneath data values stay flat, and quantitative encoding
 *    prefers length over density.
 *  - "Now" is a Federal Blue hairline crossing today's column.
 *
 * Pure server component. Mock schedule, no PHI.
 */

type Visit = {
  /** Day index 0-6 (Mon=0). */
  day: number;
  /** Start time in hours (e.g. 9.5 = 09:30). */
  start: number;
  /** Duration in hours (0.5, 1.0, 1.5). */
  duration: number;
  patient: string;
  reason: string;
  type: "in-person" | "telehealth" | "procedure";
  status?: "tentative" | "confirmed" | "checked-in" | "no-show";
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_DATES = ["04", "05", "06", "07", "08", "09", "10"];
const TODAY = 0; // Mon
const NOW = 11.13; // 11:08

const START_H = 8;
const END_H = 13.5; // 13:30
const HALF_HOURS = (END_H - START_H) * 2; // 11

const VISITS: Visit[] = [
  { day: 0, start: 8.0, duration: 0.5, patient: "Garcia, M.", reason: "HTN recheck", type: "in-person", status: "checked-in" },
  { day: 0, start: 9.0, duration: 0.5, patient: "Brown, A.", reason: "Annual physical", type: "in-person", status: "no-show" },
  { day: 0, start: 10.0, duration: 1.0, patient: "Patel, R.", reason: "T2DM follow-up", type: "in-person", status: "confirmed" },
  { day: 0, start: 12.0, duration: 0.5, patient: "Wong, T.", reason: "Med refill", type: "telehealth", status: "confirmed" },
  { day: 1, start: 8.5, duration: 0.5, patient: "Lee, K.", reason: "Knee pain", type: "in-person", status: "tentative" },
  { day: 1, start: 11.0, duration: 0.5, patient: "Davis, J.", reason: "URI", type: "telehealth", status: "confirmed" },
  { day: 1, start: 13.0, duration: 0.5, patient: "Cohen, R.", reason: "Anxiety f/u", type: "telehealth", status: "confirmed" },
  { day: 2, start: 9.0, duration: 1.5, patient: "Nguyen, L.", reason: "New patient", type: "in-person", status: "confirmed" },
  { day: 2, start: 11.5, duration: 0.5, patient: "Hassan, F.", reason: "BP recheck", type: "in-person", status: "tentative" },
  { day: 3, start: 10.0, duration: 0.5, patient: "Singh, P.", reason: "Cough", type: "in-person", status: "confirmed" },
  { day: 3, start: 11.0, duration: 1.0, patient: "Park, J.", reason: "Joint injection", type: "procedure", status: "confirmed" },
  { day: 4, start: 8.5, duration: 0.5, patient: "Romero, V.", reason: "Pap smear", type: "procedure", status: "tentative" },
  { day: 4, start: 12.5, duration: 0.5, patient: "Chen, M.", reason: "Med review", type: "telehealth", status: "confirmed" },
  { day: 5, start: 10.0, duration: 0.5, patient: "Adler, S.", reason: "Wellness", type: "in-person", status: "tentative" },
];

export default function AppointmentWeek() {
  const visits = VISITS.length;
  const noShows = VISITS.filter((v) => v.status === "no-show").length;
  const telehealth = VISITS.filter((v) => v.type === "telehealth").length;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Schedule · Hartman, K., MD · Wk 18
            </div>
            <p
              className="mt-1 font-display text-[19px] italic leading-none text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              {visits} appointments · {telehealth} telehealth · {noShows} no-shows
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              May 04 — May 10
            </div>
            <div className="mt-1 font-mono text-[11px] text-[var(--color-text)]">11:08</div>
          </div>
        </div>

        {/* Grid */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <Grid />
        </div>

        <p
          className="border-t border-[var(--color-border)] px-6 py-2 text-center text-[11px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Block height encodes duration; left-edge ink encodes visit type.
          Federal Blue hairline crosses today's column at the present minute.
        </p>
      </div>
    </div>
  );
}

const TIME_GUTTER = 56;
const HEADER_H = 28;
const ROW_H = 24;

function Grid() {
  const rows = HALF_HOURS;
  const totalH = HEADER_H + rows * ROW_H;
  // Build SVG that fills the available width — flex parent will size it.
  const COLS = 7;
  const colW = `calc((100% - ${TIME_GUTTER}px) / ${COLS})`;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ minHeight: totalH }}
    >
      {/* Day-header row */}
      <div
        className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--color-border)] bg-[var(--color-surface)]"
        style={{ height: HEADER_H }}
      >
        <div />
        {DAY_LABELS.map((d, i) => {
          const isToday = i === TODAY;
          return (
            <div
              key={d}
              className={
                "flex items-center justify-center border-l border-[var(--color-border)] font-mono text-[10px] uppercase tracking-[0.18em]"
              }
              style={{
                color: isToday ? "var(--color-accent-2)" : "var(--color-text-muted)",
              }}
            >
              <span>{d}</span>
              <span className="ml-1.5 text-[var(--color-text-muted)]">{DAY_DATES[i]}</span>
            </div>
          );
        })}
      </div>

      {/* Rows */}
      <div className="relative">
        {Array.from({ length: rows }).map((_, r) => {
          const t = START_H + r * 0.5;
          const onHour = t === Math.floor(t);
          return (
            <div
              key={r}
              className={
                "grid grid-cols-[56px_repeat(7,1fr)] " +
                (onHour ? "border-b border-[var(--color-border)]" : "")
              }
              style={{ height: ROW_H }}
            >
              <div className="flex items-start justify-end pr-2 pt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                {onHour && fmtH(t)}
              </div>
              {Array.from({ length: 7 }).map((__, d) => (
                <div
                  key={d}
                  className="border-l border-[var(--color-border)]"
                  style={{
                    background: onHour ? "transparent" : undefined,
                  }}
                />
              ))}
            </div>
          );
        })}

        {/* Now hairline (today's column only). */}
        <NowHairline />

        {/* Appointment blocks. */}
        {VISITS.map((v, i) => (
          <AppointmentBlock key={i} v={v} />
        ))}
      </div>
    </div>
  );
}

function fmtH(h: number): string {
  const wholeH = Math.floor(h);
  const m = (h - wholeH) * 60;
  return `${String(wholeH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function NowHairline() {
  if (NOW < START_H || NOW > END_H) return null;
  const top = ((NOW - START_H) / 0.5) * ROW_H;
  // Today's column lives between TIME_GUTTER and TIME_GUTTER+colW; we draw
  // the hairline only in that column.
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 grid grid-cols-[56px_repeat(7,1fr)]"
      style={{ top, height: 1 }}
    >
      <div />
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="h-px"
          style={{
            background:
              i === TODAY ? "var(--color-accent-2)" : "transparent",
          }}
        />
      ))}
    </div>
  );
}

function AppointmentBlock({ v }: { v: Visit }) {
  const top = ((v.start - START_H) / 0.5) * ROW_H + 1;
  const height = (v.duration / 0.5) * ROW_H - 2;
  const ink =
    v.status === "no-show"
      ? "var(--color-border-strong)"
      : v.type === "procedure"
        ? "var(--color-accent)"
        : v.type === "telehealth"
          ? "var(--color-accent-2)"
          : "var(--color-text)";
  const dim = v.status === "no-show" || v.status === "tentative";

  return (
    <div
      className="absolute left-0 right-0 grid grid-cols-[56px_repeat(7,1fr)]"
      style={{ top, height, pointerEvents: "none" }}
    >
      <div />
      {Array.from({ length: 7 }).map((_, d) => {
        if (d !== v.day) return <div key={d} />;
        return (
          <div
            key={d}
            className="relative mx-0.5 overflow-hidden border-l-2"
            style={{
              borderLeftColor: ink,
              background: dim
                ? "var(--color-bg)"
                : "var(--color-surface)",
              opacity: v.status === "no-show" ? 0.55 : 1,
              pointerEvents: "auto",
            }}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-1.5 py-0.5">
              <span
                className="truncate font-mono text-[9px] uppercase tracking-[0.14em]"
                style={{ color: ink }}
              >
                {fmtH(v.start)}
              </span>
            </div>
            <div className="px-1.5 py-1 leading-tight">
              <div
                className={
                  dim
                    ? "truncate text-[10.5px] text-[var(--color-text-muted)]"
                    : "truncate text-[10.5px] font-medium text-[var(--color-text)]"
                }
              >
                {v.patient}
              </div>
              <div className="truncate text-[9.5px] text-[var(--color-text-muted)]">
                {v.reason}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

