"use client";

/**
 * Registry entry (proposed — orchestrator will lift this):
 *
 *   {
 *     domain: "medical",
 *     category: "clinical",
 *     slug: "mar",
 *     title: "Medication administration record",
 *     filename: "mar.tsx",
 *     description: "Nurse's working surface: rows are meds, columns are 2-hour time slots. Each cell is given/scheduled/missed/held/PRN. Keyboard arrow nav across the grid; Enter on a scheduled cell opens chart-this-dose.",
 *     layout: "specimen",
 *     aspectRatio: "16 / 10",
 *     maxWidth: 1100,
 *     firstImpression: "2026-05-05",
 *     load: () => import("@/components/showcase/clinical/mar"),
 *   }
 */

import * as React from "react";
import { AbnormalFlag } from "@/components/_kit/abnormal-flag";
import { PatientStrip, type Patient } from "@/components/_kit/patient-strip";
import { Modal, ModalClose } from "@/components/_kit/modal";
import { Menu } from "@/components/_kit/menu";
import { useToast } from "@/components/_kit/toast";
import { cn } from "@/lib/cn";

type CellStatus =
  | "given"
  | "scheduled"
  | "missed"
  | "held"
  | "prn-given"
  | "prn-not-given"
  | "refused"
  | "charted-late"
  | "not-due";

type Cell = {
  status: CellStatus;
  /** Initials of the nurse who charted (given / charted-late). */
  initials?: string;
  /** Reason for missed / held / refused. */
  reason?: string;
  /** Wall-clock chart time HH:MM 24h, when status carries it. */
  chartedAt?: string;
};

type Route = "PO" | "IV" | "SC" | "IM" | "SL" | "TOP";

type Med = {
  id: string;
  name: string;
  brand?: string;
  dose: string;
  route: Route;
  /** Frequency phrase, mono-caps. */
  freq: string;
  /** High-alert (heparin / insulin / opioid / anticoag). */
  highAlert?: boolean;
  /** Held meds — row is dimmed, all cells render as held. */
  held?: {
    reason: string;
    since: string;
    /** Snapshot of cells before the hold; restored verbatim on release. */
    releaseSnapshot: Cell[];
  };
  /** PRN — schedule shows only PRN cells where given/declined. */
  prn?: boolean;
  /** Next scheduled administration time (HH:MM 24h) — used in the right-rail STATUS column for not-yet-due rows. */
  nextDueAt?: string;
  /** Per-slot status; index aligns with TIME_SLOTS. */
  cells: Cell[];
};

const TIME_SLOTS = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
const NOW_SLOT_INDEX = 4; // 14:00 column is "now"

const PATIENT: Patient = {
  family: "Patel",
  given: "Reema",
  mrn: "80124-5",
  dob: "1979-03-14",
  sex: "F",
  allergies: [
    { allergen: "Penicillin", severity: "severe", reaction: "rash, hypotension" },
    { allergen: "Sulfa drugs", severity: "moderate" },
  ],
  codeStatus: "Full Code",
  allergiesReviewedAt: "04 May 14:08",
};

const MEDS: Med[] = [
  {
    id: "lisinopril",
    name: "Lisinopril",
    brand: "Zestril",
    dose: "10 mg",
    route: "PO",
    freq: "DAILY · 0800",
    nextDueAt: "08:00 +1",
    cells: [
      { status: "not-due" },
      { status: "given", initials: "MR", chartedAt: "08:14" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
    ],
  },
  {
    id: "metformin",
    name: "Metformin",
    brand: "Glucophage",
    dose: "500 mg",
    route: "PO",
    freq: "BID · 0800 / 1800",
    nextDueAt: "18:00",
    cells: [
      { status: "not-due" },
      { status: "given", initials: "MR", chartedAt: "08:12" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "scheduled" },
    ],
  },
  {
    id: "heparin",
    name: "Heparin",
    dose: "5,000 U",
    route: "SC",
    freq: "Q8H · 0600 / 1400 / 2200",
    highAlert: true,
    nextDueAt: "16:00",
    cells: [
      { status: "given", initials: "DK", chartedAt: "06:04" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "missed", reason: "site refusal × 2; MD aware", chartedAt: "13:58" },
      { status: "not-due" },
      { status: "not-due" },
    ],
  },
  {
    id: "insulin",
    name: "Insulin lispro",
    brand: "Humalog",
    dose: "sliding scale",
    route: "SC",
    freq: "AC + HS · per scale",
    highAlert: true,
    nextDueAt: "17:30",
    cells: [
      { status: "not-due" },
      { status: "given", initials: "MR", chartedAt: "07:48", reason: "BG 184 → 4 U" },
      { status: "not-due" },
      { status: "given", initials: "MR", chartedAt: "11:52", reason: "BG 162 → 2 U" },
      { status: "not-due" },
      { status: "scheduled" },
      { status: "not-due" },
    ],
  },
  {
    id: "warfarin",
    name: "Warfarin",
    dose: "5 mg",
    route: "PO",
    freq: "DAILY · 1700 (HELD)",
    highAlert: true,
    nextDueAt: "17:00",
    held: {
      reason: "INR 3.6 (target 2–3)",
      since: "04 May 17:00",
      releaseSnapshot: [
        { status: "not-due" },
        { status: "not-due" },
        { status: "not-due" },
        { status: "not-due" },
        { status: "not-due" },
        { status: "not-due" },
        { status: "not-due" },
      ],
    },
    cells: [
      { status: "held" },
      { status: "held" },
      { status: "held" },
      { status: "held" },
      { status: "held" },
      { status: "held" },
      { status: "held" },
    ],
  },
  {
    id: "atorvastatin",
    name: "Atorvastatin",
    brand: "Lipitor",
    dose: "40 mg",
    route: "PO",
    freq: "QHS · 2200",
    nextDueAt: "22:00",
    cells: [
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
    ],
  },
  {
    id: "ondansetron",
    name: "Ondansetron",
    brand: "Zofran",
    dose: "4 mg",
    route: "IV",
    freq: "PRN nausea · Q6H",
    prn: true,
    cells: [
      { status: "not-due" },
      { status: "not-due" },
      { status: "prn-given", initials: "MR", chartedAt: "10:42", reason: "nausea 6/10" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
    ],
  },
  {
    id: "oxycodone",
    name: "Oxycodone",
    dose: "5 mg",
    route: "PO",
    freq: "PRN pain · Q4H",
    highAlert: true,
    prn: true,
    cells: [
      { status: "not-due" },
      { status: "prn-given", initials: "DK", chartedAt: "07:55", reason: "pain 7/10" },
      { status: "not-due" },
      { status: "prn-not-given", initials: "MR", chartedAt: "12:10", reason: "patient declined" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
    ],
  },
  {
    id: "famotidine",
    name: "Famotidine",
    dose: "20 mg",
    route: "IV",
    freq: "BID · 0800 / 2000",
    nextDueAt: "20:00",
    cells: [
      { status: "not-due" },
      { status: "given", initials: "MR", chartedAt: "08:10" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
    ],
  },
  {
    id: "vancomycin",
    name: "Vancomycin",
    dose: "1,250 mg",
    route: "IV",
    freq: "Q12H · 0600 / 1800",
    highAlert: true,
    nextDueAt: "18:00",
    cells: [
      { status: "given", initials: "DK", chartedAt: "06:22", reason: "trough drawn 0530, 14.2" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "scheduled" },
    ],
  },
  {
    id: "docusate",
    name: "Docusate sodium",
    dose: "100 mg",
    route: "PO",
    freq: "BID · 0800 / 2000",
    nextDueAt: "20:00",
    cells: [
      { status: "not-due" },
      { status: "refused", initials: "MR", chartedAt: "08:30", reason: "patient declined" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
      { status: "not-due" },
    ],
  },
];

const STATUS_HUMAN: Record<CellStatus, string> = {
  given: "Given",
  scheduled: "Scheduled",
  missed: "Missed",
  held: "Held",
  "prn-given": "PRN given",
  "prn-not-given": "PRN declined",
  refused: "Refused",
  "charted-late": "Charted late",
  "not-due": "Not due",
};

export default function MAR() {
  const { toast } = useToast();
  const [meds, setMeds] = React.useState<Med[]>(MEDS);
  const [focus, setFocus] = React.useState<{ row: number; col: number }>({ row: 0, col: 1 });
  const [chartOpen, setChartOpen] = React.useState<{ row: number; col: number } | null>(null);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const { row, col } = focus;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocus({ row: Math.min(meds.length - 1, row + 1), col });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus({ row: Math.max(0, row - 1), col });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocus({ row, col: Math.min(TIME_SLOTS.length - 1, col + 1) });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocus({ row, col: Math.max(0, col - 1) });
    } else if (e.key === "Enter" || e.key === " ") {
      const cell = meds[row].cells[col];
      if (cell.status === "scheduled") {
        e.preventDefault();
        setChartOpen({ row, col });
      }
    }
  };

  const chartDose = (row: number, col: number) => {
    setMeds((prev) =>
      prev.map((m, ri) =>
        ri === row
          ? {
              ...m,
              cells: m.cells.map((c, ci) =>
                ci === col
                  ? {
                      status: "given",
                      initials: "VL",
                      chartedAt: TIME_SLOTS[col],
                    }
                  : c,
              ),
            }
          : m,
      ),
    );
    setChartOpen(null);
    toast({
      title: `${meds[row].name} ${meds[row].dose} charted at ${TIME_SLOTS[col]}`,
      status: "success",
    });
  };

  const releaseHold = (row: number) => {
    setMeds((prev) =>
      prev.map((m, ri) =>
        ri === row
          ? {
              ...m,
              held: undefined,
              freq: m.freq.replace(" (HELD)", ""),
              // Restore from the pre-hold snapshot so not-due / scheduled / given
              // rhythm comes back, instead of blanket-marking every cell scheduled.
              cells: m.held?.releaseSnapshot
                ? m.held.releaseSnapshot.map((c) => ({ ...c }))
                : m.cells,
            }
          : m,
      ),
    );
    toast({ title: `${meds[row].name} hold released`, status: "info" });
  };

  const totals = meds.reduce(
    (acc, m) => {
      for (const c of m.cells) {
        if (c.status === "given" || c.status === "prn-given" || c.status === "charted-late")
          acc.given += 1;
        if (c.status === "scheduled") acc.due += 1;
        if (c.status === "missed") acc.missed += 1;
      }
      return acc;
    },
    { given: 0, due: 0, missed: 0 },
  );

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Top rule */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <span>MAR · Med-Surg 4 · 412-B · Day shift · 06:00 → 18:00</span>
          <span className="flex items-center gap-3">
            <span>
              <span className="text-[var(--color-text)] tabular-nums">{totals.given}</span>{" "}
              given <span aria-hidden className="mx-1.5">·</span>
              <span className="text-[var(--color-text)] tabular-nums">{totals.due}</span> due
            </span>
            {totals.missed > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--color-accent)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]"
                aria-label={`${totals.missed} missed dose${totals.missed === 1 ? "" : "s"}`}
              >
                <AbnormalFlag severity="high" size="sm" />
                <span className="tabular-nums">{totals.missed}</span> missed
              </span>
            )}
          </span>
        </div>

        {/* Patient banner — compact */}
        <PatientStrip patient={PATIENT} density="compact" />

        {/* Hero */}
        <div className="flex shrink-0 items-baseline justify-between gap-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3">
          <h1
            className="font-display text-[20px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            Medication administration record
          </h1>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Nurse · M. Rivera, RN · 14:08
          </span>
        </div>

        {/* Time-slot header */}
        <div className="grid shrink-0 grid-cols-[260px_1fr_120px] items-stretch border-b border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]">
          <div className="border-r border-[var(--color-border)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em]">
            Medication · dose · route
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${TIME_SLOTS.length}, minmax(0, 1fr))` }}
            role="row"
          >
            {TIME_SLOTS.map((t, i) => {
              const isNow = i === NOW_SLOT_INDEX;
              return (
                <div
                  key={t}
                  className={cn(
                    "flex items-center justify-center gap-1.5 border-r border-[var(--color-border)] px-2 py-2 font-mono text-[10px] uppercase tracking-[0.18em]",
                    isNow ? "bg-[var(--color-bg)] text-[var(--color-accent-2)]" : null,
                  )}
                >
                  {isNow && (
                    <span
                      aria-hidden
                      className="inline-block h-1 w-1 rounded-full bg-[var(--color-accent-2)] animate-live-pulse"
                    />
                  )}
                  <span className="tabular-nums">{t}</span>
                </div>
              );
            })}
          </div>
          <div className="border-l border-[var(--color-border)] px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em]">
            Status
          </div>
        </div>

        {/* Grid body */}
        <div
          role="grid"
          aria-label="Medication administration grid"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="min-h-0 flex-1 overflow-y-auto outline-none"
        >
          {meds.map((m, ri) => (
            <MedRow
              key={m.id}
              med={m}
              rowIndex={ri}
              focus={focus}
              setFocus={setFocus}
              onCellEnter={(col) => {
                if (m.cells[col].status === "scheduled") setChartOpen({ row: ri, col });
              }}
              onReleaseHold={() => releaseHold(ri)}
            />
          ))}
        </div>

        {/* Legend + handoff */}
        <Legend />

        <div className="grid shrink-0 grid-cols-[1fr_auto] items-baseline gap-4 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <p
            className="text-[12px] italic leading-relaxed text-[var(--color-text-muted)]"
            style={{
              fontFamily: "var(--font-display)",
              fontVariationSettings: '"opsz" 18, "SOFT" 30',
            }}
          >
            Shift handoff: heparin 14:00 missed — site refusal × 2; MD aware,
            repeat dose timed for 16:00 with abdominal site. Insulin sliding
            scale q AC + HS — next check 17:30. Warfarin still held pending
            INR &lt; 3.0.
          </p>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Hand off → night shift · 19:00
          </span>
        </div>
      </div>

      {chartOpen && (
        <ChartDoseModal
          med={meds[chartOpen.row]}
          slot={TIME_SLOTS[chartOpen.col]}
          onClose={() => setChartOpen(null)}
          onConfirm={() => chartDose(chartOpen.row, chartOpen.col)}
        />
      )}
    </div>
  );
}

/* ---------------- row ---------------- */

function MedRow({
  med,
  rowIndex,
  focus,
  setFocus,
  onCellEnter,
  onReleaseHold,
}: {
  med: Med;
  rowIndex: number;
  focus: { row: number; col: number };
  setFocus: (f: { row: number; col: number }) => void;
  onCellEnter: (col: number) => void;
  onReleaseHold: () => void;
}) {
  const isHeld = !!med.held;
  return (
    <div
      role="row"
      className={cn(
        "grid grid-cols-[260px_1fr_120px] items-stretch border-b border-[var(--color-border)]",
        isHeld ? "bg-[color-mix(in_oklch,var(--color-warning)_4%,var(--color-bg))]" : null,
      )}
    >
      {/* Med identity */}
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 border-r border-[var(--color-border)] px-4 py-3",
          med.highAlert
            ? "bg-[color-mix(in_oklch,var(--color-accent)_3%,transparent)]"
            : null,
        )}
      >
        {med.highAlert && (
          <AbnormalFlag severity="high-alert" reason={med.name} size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span
              className={cn(
                "text-[13px] font-medium",
                isHeld ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]",
              )}
            >
              {med.name}
            </span>
            {med.brand && (
              <span
                className="font-display text-[11px] italic text-[var(--color-text-muted)]"
                style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
              >
                ({med.brand})
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text)]">{med.dose}</span>
            <span aria-hidden>·</span>
            <span>{med.route}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{med.freq}</span>
          </div>
        </div>
      </div>

      {/* Time-slot cells */}
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${TIME_SLOTS.length}, minmax(0, 1fr))` }}
      >
        {med.cells.map((cell, ci) => {
          const isFocus = focus.row === rowIndex && focus.col === ci;
          const isNowCol = ci === NOW_SLOT_INDEX;
          return (
            <button
              key={ci}
              type="button"
              role="gridcell"
              aria-label={`${med.name} at ${TIME_SLOTS[ci]} — ${STATUS_HUMAN[cell.status]}${cell.reason ? `, ${cell.reason}` : ""}`}
              onClick={() => {
                setFocus({ row: rowIndex, col: ci });
                if (cell.status === "scheduled") onCellEnter(ci);
              }}
              onFocus={() => setFocus({ row: rowIndex, col: ci })}
              tabIndex={isFocus ? 0 : -1}
              className={cn(
                "relative flex min-h-[44px] items-center justify-center border-r border-[var(--color-border)] outline-none transition-colors duration-[120ms] ease-out",
                isNowCol ? "bg-[color-mix(in_oklch,var(--color-accent-2)_4%,transparent)]" : null,
                isFocus
                  ? "ring-2 ring-inset ring-[var(--color-accent-2)]"
                  : "hover:border-l-2 hover:border-l-[var(--color-accent-2)]",
              )}
            >
              {isNowCol && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-[var(--color-accent-2)] opacity-40"
                />
              )}
              <CellMark cell={cell} />
            </button>
          );
        })}
      </div>

      {/* Right rail — held meds expose release-hold; otherwise a quiet status */}
      <div className="flex items-center justify-end border-l border-[var(--color-border)] px-3 py-2">
        {isHeld ? (
          <Menu
            ariaLabel={`Hold actions for ${med.name}`}
            placement="bottom-end"
            items={[
              { type: "heading", label: "Hold actions" },
              {
                label: "Release hold",
                shortcut: ["⏎"],
                onSelect: onReleaseHold,
              },
              { type: "separator", label: "" },
              {
                label: `Held since ${med.held?.since ?? ""}`,
                disabled: true,
              },
            ]}
            trigger={
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--color-warning)] bg-[var(--color-bg)] px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-warning)] outline-none transition-colors duration-[120ms] ease-out hover:bg-[color-mix(in_oklch,var(--color-warning)_8%,var(--color-bg))]"
              >
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--color-warning)" }}
                />
                held
              </button>
            }
          />
        ) : (
          <RowSummary med={med} />
        )}
      </div>
    </div>
  );
}

function RowSummary({ med }: { med: Med }) {
  const counts = med.cells.reduce(
    (acc, c) => {
      if (c.status === "given" || c.status === "prn-given") acc.given += 1;
      else if (c.status === "scheduled") acc.due += 1;
      else if (c.status === "missed" || c.status === "refused") acc.alert += 1;
      return acc;
    },
    { given: 0, due: 0, alert: 0 },
  );
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
      {counts.alert > 0 ? (
        <span className="text-[var(--color-accent)]">{counts.alert} alert</span>
      ) : counts.given > 0 ? (
        <>
          <span className="text-[var(--color-text)] tabular-nums">{counts.given}</span> ·{" "}
          given
        </>
      ) : counts.due > 0 ? (
        <>
          <span className="text-[var(--color-text)] tabular-nums">{counts.due}</span> · due
        </>
      ) : med.nextDueAt ? (
        <>
          next <span className="text-[var(--color-text)] tabular-nums">{med.nextDueAt}</span>
        </>
      ) : med.prn ? (
        <span>prn</span>
      ) : (
        <span>—</span>
      )}
    </span>
  );
}

/* ---------------- cell marks ---------------- */

function CellMark({ cell }: { cell: Cell }) {
  if (cell.status === "given" || cell.status === "charted-late") {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        title={`${STATUS_HUMAN[cell.status]} ${cell.chartedAt ?? ""} · ${cell.initials ?? ""}`}
      >
        <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className="block">
          <circle cx={7} cy={7} r={3.6} fill="var(--color-text)" />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text)]">
          {cell.initials}
        </span>
      </span>
    );
  }
  if (cell.status === "scheduled") {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className="block">
        <circle
          cx={7}
          cy={7}
          r={3.6}
          fill="none"
          stroke="var(--color-text)"
          strokeWidth={1.1}
        />
      </svg>
    );
  }
  if (cell.status === "missed") {
    return (
      <span className="inline-flex items-center gap-1">
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden className="block">
          <path d="M 6 1 L 11 11 L 1 11 Z" fill="var(--color-accent)" />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
          missed
        </span>
      </span>
    );
  }
  if (cell.status === "refused") {
    return (
      <span className="inline-flex items-center gap-1">
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden className="block">
          <path
            d="M 2 2 L 10 10 M 10 2 L 2 10"
            stroke="var(--color-accent)"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
          refused
        </span>
      </span>
    );
  }
  if (cell.status === "held") {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className="block">
        <circle
          cx={7}
          cy={7}
          r={4}
          fill="none"
          stroke="var(--color-warning)"
          strokeWidth={1.2}
          strokeDasharray="2 1.5"
        />
        <circle cx={7} cy={7} r={1.2} fill="var(--color-warning)" />
      </svg>
    );
  }
  if (cell.status === "prn-given") {
    return (
      <span
        className="inline-flex items-center gap-1.5"
        title={`PRN given ${cell.chartedAt ?? ""} · ${cell.initials ?? ""}`}
      >
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden className="block">
          <rect x={2} y={2} width={8} height={8} fill="var(--color-text)" />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text)]">
          {cell.initials}
        </span>
      </span>
    );
  }
  if (cell.status === "prn-not-given") {
    return (
      <span className="inline-flex items-center gap-1">
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden className="block">
          <rect
            x={2}
            y={2}
            width={8}
            height={8}
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth={1}
          />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          decl
        </span>
      </span>
    );
  }
  // not-due — render empty; the cell border carries the rhythm.
  return null;
}

/* ---------------- legend ---------------- */

function Legend() {
  const items: { label: string; mark: React.ReactNode }[] = [
    {
      label: "given · initials",
      mark: (
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
          <circle cx={6} cy={6} r={3} fill="var(--color-text)" />
        </svg>
      ),
    },
    {
      label: "scheduled",
      mark: (
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
          <circle cx={6} cy={6} r={3} fill="none" stroke="var(--color-text)" strokeWidth={1} />
        </svg>
      ),
    },
    {
      label: "missed",
      mark: (
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
          <path d="M 6 1 L 11 11 L 1 11 Z" fill="var(--color-accent)" />
        </svg>
      ),
    },
    {
      label: "held",
      mark: (
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
          <circle
            cx={6}
            cy={6}
            r={3.5}
            fill="none"
            stroke="var(--color-warning)"
            strokeWidth={1}
            strokeDasharray="2 1.5"
          />
        </svg>
      ),
    },
    {
      label: "PRN given",
      mark: (
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
          <rect x={2} y={2} width={8} height={8} fill="var(--color-text)" />
        </svg>
      ),
    },
    {
      label: "refused",
      mark: (
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden>
          <path
            d="M 2 2 L 10 10 M 10 2 L 2 10"
            stroke="var(--color-accent)"
            strokeWidth={1.2}
          />
        </svg>
      ),
    },
    {
      label: "high-alert",
      mark: <AbnormalFlag severity="high-alert" size="sm" />,
    },
  ];
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        Legend
      </span>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {it.mark}
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ---------------- chart-this-dose modal ---------------- */

function ChartDoseModal({
  med,
  slot,
  onClose,
  onConfirm,
}: {
  med: Med;
  slot: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const [witness, setWitness] = React.useState("");
  const handleChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose();
  };
  // For high-alert meds, the witness selector is at rest (disabled in this
  // specimen). Charted-by is implicit from the logged-in nurse and always
  // populated. The "Chart given" button is disabled until both are complete:
  // for non-high-alert that's just charted-by (always true); for high-alert
  // that requires a witness selection.
  const canChart = med.highAlert ? witness !== "" : true;
  return (
    <Modal
      open={open}
      onOpenChange={handleChange}
      placement="center"
      size="md"
      ariaLabel={`Chart ${med.name} ${med.dose} at ${slot}`}
    >
      <div className="flex flex-col gap-4 px-6 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Chart this dose
          </p>
          <h2
            className="mt-1 font-display text-[20px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            {med.name} {med.dose}
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {med.route} · {med.freq} · slot {slot}
          </p>
        </div>

        {med.highAlert && (
          <div className="flex flex-col gap-2 border border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_6%,var(--color-bg))] px-3 py-2">
            <div className="flex items-center gap-2">
              <AbnormalFlag severity="high-alert" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
                High-alert · two-nurse verify required
              </span>
            </div>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Witness RN
              </span>
              <select
                disabled
                value={witness}
                onChange={(e) => setWitness(e.target.value)}
                className="h-8 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 font-mono text-[12px] tabular-nums text-[var(--color-text-muted)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">Select second RN…</option>
                <option value="DK">DK · D. Kowalski, RN</option>
                <option value="MR">MR · M. Rivera, RN</option>
                <option value="JS">JS · J. Singh, RN</option>
              </select>
            </label>
          </div>
        )}

        <fieldset className="grid grid-cols-2 gap-3 text-[12px]">
          <Field label="Charted by" value="VL · V. Li, RN" />
          <Field label="Time" value={`${slot} (now)`} />
          <Field label="Site / route" value={med.route} />
          <Field
            label="Witness"
            value={med.highAlert ? (witness ? witness : "—  required") : "n/a"}
          />
        </fieldset>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3">
          <ModalClose
            render={
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] outline-none transition-colors duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
              >
                Cancel
              </button>
            }
          />
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canChart}
            aria-disabled={!canChart}
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-text)] bg-[var(--color-text)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-bg)] outline-none transition-colors duration-[120ms] ease-out hover:bg-[var(--color-text)]/90 disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:bg-[var(--color-surface)] disabled:text-[var(--color-text-muted)]"
          >
            Chart given
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 font-mono text-[12px] tabular-nums text-[var(--color-text)]">
        {value}
      </span>
    </label>
  );
}
