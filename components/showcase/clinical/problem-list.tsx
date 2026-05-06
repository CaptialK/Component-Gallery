"use client";

/**
 * Registry entry (proposed — orchestrator will lift this):
 *
 *   {
 *     domain: "medical",
 *     category: "clinical",
 *     slug: "problem-list",
 *     title: "Problem list",
 *     filename: "problem-list.tsx",
 *     description: "Patient-level longitudinal index of active problems with status, ICD-10 code, onset, last-updated, responsible clinician, severity. Click a problem to open a side panel with related events.",
 *     layout: "specimen",
 *     aspectRatio: "5 / 6",
 *     maxWidth: 700,
 *     firstImpression: "2026-05-05",
 *     load: () => import("@/components/showcase/clinical/problem-list"),
 *   }
 */

import * as React from "react";
import { AbnormalFlag } from "@/components/_kit/abnormal-flag";
import { PatientStrip, type Patient } from "@/components/_kit/patient-strip";
import { Modal, ModalClose } from "@/components/_kit/modal";
import { Menu } from "@/components/_kit/menu";
import { Timestamp } from "@/components/_kit/timestamp";
import { useToast } from "@/components/_kit/toast";
import { cn } from "@/lib/cn";

type ProblemStatus =
  | "active-acute"
  | "active-chronic"
  | "resolved"
  | "ruled-out"
  | "suspected";

type ProblemSeverity = "mild" | "moderate" | "severe";

type ProblemEvent = {
  ts: string; // ISO
  kind: "note" | "order" | "result" | "encounter";
  text: string;
};

type RelatedMed = {
  name: string;
  status: "held" | "active" | "discontinued";
  reason?: string;
};

type Problem = {
  id: string;
  name: string;
  icd10: string;
  status: ProblemStatus;
  severity: ProblemSeverity;
  /** ISO date of first onset / first noted. */
  onset: string;
  /** ISO time of last update. */
  updatedAt: string;
  /** Two letters; full name shown via title. */
  ownerInitials: string;
  ownerFull: string;
  notes?: string;
  events: ProblemEvent[];
  related?: { orders: number; notes: number; results: number };
  /** Structured relation to medications affected by this problem. */
  relatedMeds?: RelatedMed[];
};

const PATIENT: Patient = {
  family: "Patel",
  given: "Reema",
  mrn: "80124-5",
  dob: "1979-03-14",
  sex: "F",
  allergies: [
    { allergen: "Penicillin", severity: "severe", reaction: "rash, hypotension" },
    { allergen: "Sulfa drugs", severity: "moderate" },
    { allergen: "Latex", severity: "mild" },
  ],
  codeStatus: "Full Code",
  weight: { value: 68, unit: "kg", capturedAt: "04 May 06:18" },
  height: { value: 162, unit: "cm" },
  allergiesReviewedAt: "04 May 14:08",
};

const PROBLEMS: Problem[] = [
  {
    id: "p-001",
    name: "Acute myocardial infarction, NSTEMI",
    icd10: "I21.4",
    status: "active-acute",
    severity: "severe",
    onset: "2026-05-04",
    updatedAt: "2026-05-05T13:48:00Z",
    ownerInitials: "KH",
    ownerFull: "Hartman, K., MD · Cardiology",
    notes: "Trop I 1.42 ng/mL · cath cued for AM",
    related: { orders: 8, notes: 4, results: 6 },
    events: [
      { ts: "2026-05-05T13:48:00Z", kind: "result", text: "Troponin I 1.42 ng/mL — critically high" },
      { ts: "2026-05-05T07:14:00Z", kind: "order", text: "Heparin gtt initiated, target aPTT 60–80" },
      { ts: "2026-05-04T22:02:00Z", kind: "note", text: "Hartman: NSTEMI per serial trops; ASA + statin started" },
      { ts: "2026-05-04T18:08:00Z", kind: "encounter", text: "ED arrival, chest pain 8/10, ECG: TWI V4-V6" },
    ],
  },
  {
    id: "p-002",
    name: "Acute kidney injury, stage 2",
    icd10: "N17.9",
    status: "active-acute",
    severity: "moderate",
    onset: "2026-05-05",
    updatedAt: "2026-05-05T12:14:00Z",
    ownerInitials: "JR",
    ownerFull: "Roy, J., MD · Nephrology",
    notes: "Cr 2.4 mg/dL (baseline 1.0) · contrast-related",
    related: { orders: 3, notes: 2, results: 4 },
    events: [
      { ts: "2026-05-05T12:14:00Z", kind: "result", text: "Creatinine 2.4 mg/dL · KDIGO stage 2" },
      { ts: "2026-05-05T08:20:00Z", kind: "order", text: "Hold lisinopril; IV fluids 1 L NS" },
      { ts: "2026-05-04T19:30:00Z", kind: "note", text: "Roy: contrast-induced AKI suspected post-cath" },
    ],
  },
  {
    id: "p-003",
    name: "Type 2 diabetes mellitus, w/ microvascular complications",
    icd10: "E11.65",
    status: "active-chronic",
    severity: "moderate",
    onset: "2017-09-12",
    updatedAt: "2026-05-05T11:52:00Z",
    ownerInitials: "TS",
    ownerFull: "Sato, T., MD · Endocrinology",
    notes: "A1c 8.4% · sliding scale active",
    related: { orders: 12, notes: 9, results: 24 },
    events: [
      { ts: "2026-05-05T11:52:00Z", kind: "order", text: "Insulin lispro 2 U for BG 162" },
      { ts: "2026-04-12T10:00:00Z", kind: "result", text: "A1c 8.4% (was 7.9% in Jan)" },
      { ts: "2017-09-12T00:00:00Z", kind: "encounter", text: "Initial diagnosis · A1c 7.6%" },
    ],
  },
  {
    id: "p-004",
    name: "Essential (primary) hypertension",
    icd10: "I10",
    status: "active-chronic",
    severity: "mild",
    onset: "2014-03-04",
    updatedAt: "2026-05-04T09:18:00Z",
    ownerInitials: "KH",
    ownerFull: "Hartman, K., MD · Cardiology",
    related: { orders: 4, notes: 6, results: 18 },
    relatedMeds: [
      { name: "Lisinopril", status: "held", reason: "AKI" },
    ],
    events: [
      { ts: "2026-05-04T09:18:00Z", kind: "note", text: "BP control adequate at home; lisinopril held inpatient" },
      { ts: "2014-03-04T00:00:00Z", kind: "encounter", text: "Initial diagnosis · 152/94" },
    ],
  },
  {
    id: "p-005",
    name: "Hyperlipidemia, mixed",
    icd10: "E78.2",
    status: "active-chronic",
    severity: "mild",
    onset: "2015-11-21",
    updatedAt: "2026-05-04T22:04:00Z",
    ownerInitials: "KH",
    ownerFull: "Hartman, K., MD · Cardiology",
    related: { orders: 2, notes: 3, results: 12 },
    events: [
      { ts: "2026-05-04T22:04:00Z", kind: "order", text: "Atorvastatin 40 mg QHS — high-intensity" },
    ],
  },
  {
    id: "p-006",
    name: "GERD, refractory to PPI",
    icd10: "K21.9",
    status: "active-chronic",
    severity: "mild",
    onset: "2019-02-08",
    updatedAt: "2025-12-18T14:30:00Z",
    ownerInitials: "AM",
    ownerFull: "Mirza, A., MD · Gastroenterology",
    related: { orders: 1, notes: 4, results: 2 },
    events: [
      { ts: "2025-12-18T14:30:00Z", kind: "note", text: "Stable on famotidine + lifestyle; PPI tapered" },
    ],
  },
  {
    id: "p-007",
    name: "Sepsis, suspected biliary source",
    icd10: "A41.9",
    status: "ruled-out",
    severity: "severe",
    onset: "2026-05-04",
    updatedAt: "2026-05-05T02:14:00Z",
    ownerInitials: "JR",
    ownerFull: "Roy, J., MD · Nephrology",
    notes: "Ruled out; cultures negative",
    related: { orders: 5, notes: 3, results: 8 },
    events: [
      { ts: "2026-05-05T02:14:00Z", kind: "result", text: "Blood cultures × 2 negative at 48h — ruled out" },
      { ts: "2026-05-04T20:00:00Z", kind: "order", text: "Empiric pip-tazo started, then de-escalated" },
    ],
  },
  {
    id: "p-008",
    name: "Pulmonary embolism",
    icd10: "I26.99",
    status: "suspected",
    severity: "severe",
    onset: "2026-05-05",
    updatedAt: "2026-05-05T13:30:00Z",
    ownerInitials: "KH",
    ownerFull: "Hartman, K., MD · Cardiology",
    notes: "CTA pending · Wells 4.5",
    related: { orders: 2, notes: 1, results: 0 },
    events: [
      { ts: "2026-05-05T13:30:00Z", kind: "order", text: "CTA chest ordered · D-dimer 1.8 µg/mL" },
      { ts: "2026-05-05T13:14:00Z", kind: "note", text: "Hartman: pleuritic CP + tachycardia, work up PE" },
    ],
  },
  {
    id: "p-009",
    name: "Acute pyelonephritis (resolved)",
    icd10: "N10",
    status: "resolved",
    severity: "moderate",
    onset: "2024-08-16",
    updatedAt: "2024-08-30T10:00:00Z",
    ownerInitials: "AM",
    ownerFull: "Mirza, A., MD · Gastroenterology",
    related: { orders: 4, notes: 3, results: 6 },
    events: [
      { ts: "2024-08-30T10:00:00Z", kind: "note", text: "Cultures cleared, completed 14d ceftriaxone — resolved" },
    ],
  },
];

const STATUS_GROUPS: { key: "active-acute" | "active-chronic" | "watch" | "inactive"; label: string }[] = [
  { key: "active-acute", label: "Active · acute" },
  { key: "active-chronic", label: "Active · chronic" },
  { key: "watch", label: "Watch · suspected & ruled-out" },
  { key: "inactive", label: "Inactive · resolved" },
];

function groupOf(s: ProblemStatus): "active-acute" | "active-chronic" | "watch" | "inactive" {
  if (s === "active-acute") return "active-acute";
  if (s === "active-chronic") return "active-chronic";
  if (s === "suspected" || s === "ruled-out") return "watch";
  return "inactive";
}

const STATUS_HUMAN: Record<ProblemStatus, string> = {
  "active-acute": "Active · acute",
  "active-chronic": "Active · chronic",
  resolved: "Resolved",
  "ruled-out": "Ruled out",
  suspected: "Suspected",
};

const KIND_LETTER: Record<ProblemEvent["kind"], string> = {
  result: "R",
  order: "O",
  note: "N",
  encounter: "E",
};

/**
 * Onset formatter — for chronic problems older than 12 months, the year is
 * essential clinical context. Render "MMM YYYY" instead of letting Timestamp
 * render "MMM D HH:MM" which drops the year for older onsets.
 */
const MONTH_SHORT_LOCAL = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function formatOnset(iso: string, now: Date): { text: string; aria: string } {
  const d = new Date(iso);
  const ageMs = now.getTime() - d.getTime();
  const monthMs = 1000 * 60 * 60 * 24 * 30;
  const ariaFull = `${MONTH_SHORT_LOCAL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (ageMs > 12 * monthMs) {
    return {
      text: `${MONTH_SHORT_LOCAL[d.getMonth()]} ${d.getFullYear()}`,
      aria: ariaFull,
    };
  }
  // Recent: keep month + day for granularity.
  return {
    text: `${MONTH_SHORT_LOCAL[d.getMonth()]} ${d.getDate()}`,
    aria: ariaFull,
  };
}

export default function ProblemList() {
  const { toast } = useToast();
  const [problems, setProblems] = React.useState(PROBLEMS);
  const [openId, setOpenId] = React.useState<string | null>(null);
  /** Hide resolved/ruled-out by default — production lists balloon otherwise. */
  const [showInactive, setShowInactive] = React.useState(false);

  /** Bucket counts by clinical group, computed off the full list. */
  const counts = React.useMemo(() => {
    let activeCount = 0;
    let watchCount = 0;
    let inactiveCount = 0;
    for (const p of problems) {
      const g = groupOf(p.status);
      if (g === "active-acute" || g === "active-chronic") activeCount++;
      else if (g === "watch") watchCount++;
      else inactiveCount++;
    }
    return { active: activeCount, watch: watchCount, inactive: inactiveCount };
  }, [problems]);

  const visibleProblems = React.useMemo(
    () =>
      showInactive
        ? problems
        : problems.filter((p) => groupOf(p.status) !== "inactive"),
    [problems, showInactive],
  );

  const grouped = React.useMemo(() => {
    const map: Record<string, Problem[]> = {};
    for (const g of STATUS_GROUPS) map[g.key] = [];
    for (const p of visibleProblems) map[groupOf(p.status)].push(p);
    return map;
  }, [visibleProblems]);

  const setStatus = (id: string, next: ProblemStatus) => {
    setProblems((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: next, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
    toast({ title: `Status → ${STATUS_HUMAN[next]}`, status: "success" });
  };

  const opened = problems.find((p) => p.id === openId) ?? null;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Top rule — semantic count breakdown, not a single "active" tally. */}
        <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <span>Problem list · Patel, R. · ENC-2026-04-01-188</span>
          <span className="tabular-nums">
            <span className="text-[var(--color-text)]">{counts.active}</span> active
            <span aria-hidden className="mx-1.5">·</span>
            <span className="text-[var(--color-text)]">{counts.watch}</span> watch
            <span aria-hidden className="mx-1.5">·</span>
            <span className="text-[var(--color-text)]">{counts.inactive}</span> inactive
          </span>
        </div>

        {/* Hero patient strip */}
        <PatientStrip patient={PATIENT} density="hero" />

        {/* Captured-at strip — PatientStrip hero density doesn't surface the
            weight/height capture timestamp, so we render it inline beneath. */}
        {(PATIENT.weight?.capturedAt || PATIENT.height?.capturedAt) && (
          <div className="flex shrink-0 items-baseline justify-end gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 pb-2 -mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {PATIENT.weight?.capturedAt && (
              <span>
                weight captured{" "}
                <span className="tabular-nums text-[var(--color-text)]">
                  {PATIENT.weight.capturedAt}
                </span>
              </span>
            )}
            {PATIENT.height?.capturedAt && (
              <>
                <span aria-hidden>·</span>
                <span>
                  height captured{" "}
                  <span className="tabular-nums text-[var(--color-text)]">
                    {PATIENT.height.capturedAt}
                  </span>
                </span>
              </>
            )}
          </div>
        )}

        {/* Hero head */}
        <div className="flex shrink-0 items-baseline justify-between gap-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3">
          <h1
            className="font-display text-[20px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            Problem list
          </h1>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Reviewed by KH · 04 May
          </span>
        </div>

        {/* Filter chip strip — hide-resolved by default, toggle to surface. */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Filter
          </span>
          <FilterChip
            label="Active"
            count={counts.active}
            pressed
            onClick={() => {}}
            disabled
          />
          <FilterChip
            label="Watch"
            count={counts.watch}
            pressed
            onClick={() => {}}
            disabled
          />
          <FilterChip
            label="Inactive"
            count={counts.inactive}
            pressed={showInactive}
            onClick={() => setShowInactive((v) => !v)}
          />
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {STATUS_GROUPS.map((g) => {
            const list = grouped[g.key];
            if (!list || list.length === 0) return null;
            return (
              <section key={g.key}>
                <h2 className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/95 px-6 py-1.5 backdrop-blur-[2px]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    {g.label}
                    <span aria-hidden className="mx-1.5">·</span>
                    <span className="tabular-nums text-[var(--color-text)]">{list.length}</span>
                  </span>
                </h2>
                <ul>
                  {list.map((p) => (
                    <ProblemRow
                      key={p.id}
                      problem={p}
                      onOpen={() => setOpenId(p.id)}
                      onSetStatus={(next) => setStatus(p.id, next)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Legend */}
        <Legend />
      </div>

      {opened && (
        <ProblemDetail
          problem={opened}
          onClose={() => setOpenId(null)}
          onSetStatus={(next) => setStatus(opened.id, next)}
        />
      )}
    </div>
  );
}

/* ---------------- row ---------------- */

function ProblemRow({
  problem,
  onOpen,
  onSetStatus,
}: {
  problem: Problem;
  onOpen: () => void;
  onSetStatus: (s: ProblemStatus) => void;
}) {
  const dim = problem.status === "resolved" || problem.status === "ruled-out";
  const inactive = dim;

  // Suppress the AbnormalFlag once a severe problem is ruled-out or resolved
  // — the severity tag still applies clinically, but the active concern is gone.
  const showFlag =
    !inactive && (problem.severity === "severe" || problem.severity === "moderate");
  const flagSeverity =
    problem.severity === "severe"
      ? problem.status === "active-acute"
        ? "critical-high"
        : "high"
      : "high"; // moderate → "high" (warning triangle)

  // Onset: render MMM YYYY for chronic problems older than 12 months so the
  // year doesn't drop. Recent onsets keep MMM D.
  const onsetFmt = formatOnset(problem.onset, new Date());

  return (
    <li className="group/row relative grid grid-cols-[16px_1fr_36px_auto] items-center gap-3 border-b border-[var(--color-border)] px-6 py-3 transition-colors duration-[120ms] ease-out hover:bg-[color-mix(in_oklch,var(--color-surface)_60%,var(--color-bg))]">
      {/* Left-edge accent strip on hover — replaces hover-just-lightens-bg. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-[var(--color-accent-2)] opacity-0 transition-opacity duration-[120ms] ease-out group-hover/row:opacity-100"
      />
      <StatusGlyph status={problem.status} severity={problem.severity} />

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              "text-[14px] font-medium",
              dim ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text)]",
            )}
          >
            {problem.name}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {problem.icd10}
          </span>
          {showFlag && (
            <AbnormalFlag
              severity={flagSeverity}
              reason={`${problem.severity} severity`}
              size="sm"
            />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <span>
            onset{" "}
            <span
              className="tabular-nums text-[var(--color-text)]"
              title={onsetFmt.aria}
            >
              {onsetFmt.text}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span>
            updated{" "}
            <Timestamp value={problem.updatedAt} format="relative" />
          </span>
          {problem.relatedMeds && problem.relatedMeds.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <RelatedMedsCluster meds={problem.relatedMeds} />
            </>
          )}
          {problem.notes && (
            <>
              <span aria-hidden>·</span>
              <span className="italic normal-case tracking-normal text-[11px] text-[var(--color-text-muted)]">
                {problem.notes}
              </span>
            </>
          )}
        </div>
      </button>

      <RingedMonogram initials={problem.ownerInitials} title={problem.ownerFull} />

      <Menu
        ariaLabel={`Status menu for ${problem.name}`}
        placement="bottom-end"
        items={[
          { type: "heading", label: "Set status" },
          {
            label: "Active · acute",
            onSelect: () => onSetStatus("active-acute"),
            disabled: problem.status === "active-acute",
          },
          {
            label: "Active · chronic",
            onSelect: () => onSetStatus("active-chronic"),
            disabled: problem.status === "active-chronic",
          },
          {
            label: "Suspected",
            onSelect: () => onSetStatus("suspected"),
            disabled: problem.status === "suspected",
          },
          { type: "separator", label: "" },
          {
            label: "Ruled out",
            destructive: true,
            onSelect: () => onSetStatus("ruled-out"),
            disabled: problem.status === "ruled-out",
          },
          {
            label: "Resolved",
            destructive: true,
            onSelect: () => onSetStatus("resolved"),
            disabled: problem.status === "resolved",
          },
        ]}
        trigger={
          <button
            type="button"
            aria-label={`Status: ${STATUS_HUMAN[problem.status]} (open menu)`}
            className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] outline-none transition-colors duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
          >
            <span aria-hidden className="mr-1 opacity-70">⋯</span>
            edit
          </button>
        }
      />
    </li>
  );
}

/* Status glyph: shape + ink encodes status; size encodes severity (area-encoded). */
function StatusGlyph({
  status,
  severity,
}: {
  status: ProblemStatus;
  severity: ProblemSeverity;
}) {
  // Area-encoded severity: r² scales with severity.
  const sevR = severity === "severe" ? 4.4 : severity === "moderate" ? 3.3 : 2.4;
  const cx = 8;
  const cy = 8;
  const ariaLabel = `${STATUS_HUMAN[status]}, ${severity}`;
  if (status === "active-acute") {
    // Compound shape: filled persimmon dot inside a thin outer ring. Survives
    // grayscale as "ringed dot" and stays distinct from active-chronic's plain
    // filled walnut dot.
    const ringR = sevR + 1.6;
    return (
      <svg width={16} height={16} viewBox="0 0 16 16" role="img" aria-label={ariaLabel}>
        <circle
          cx={cx}
          cy={cy}
          r={ringR}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={0.9}
        />
        <circle cx={cx} cy={cy} r={sevR} fill="var(--color-accent)" />
      </svg>
    );
  }
  if (status === "active-chronic") {
    return (
      <svg width={16} height={16} viewBox="0 0 16 16" role="img" aria-label={ariaLabel}>
        <circle cx={cx} cy={cy} r={sevR} fill="var(--color-text)" />
      </svg>
    );
  }
  if (status === "suspected") {
    return (
      <svg width={16} height={16} viewBox="0 0 16 16" role="img" aria-label={ariaLabel}>
        <circle
          cx={cx}
          cy={cy}
          r={sevR}
          fill="none"
          stroke="var(--color-warning)"
          strokeWidth={1.2}
          strokeDasharray="2 1.5"
        />
      </svg>
    );
  }
  if (status === "ruled-out") {
    return (
      <svg width={16} height={16} viewBox="0 0 16 16" role="img" aria-label={ariaLabel}>
        <line
          x1={cx - sevR}
          y1={cy - sevR}
          x2={cx + sevR}
          y2={cy + sevR}
          stroke="var(--color-text-muted)"
          strokeWidth={1.2}
        />
        <line
          x1={cx + sevR}
          y1={cy - sevR}
          x2={cx - sevR}
          y2={cy + sevR}
          stroke="var(--color-text-muted)"
          strokeWidth={1.2}
        />
      </svg>
    );
  }
  // resolved — hollow ring at muted ink
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" role="img" aria-label={ariaLabel}>
      <circle
        cx={cx}
        cy={cy}
        r={sevR}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth={1}
      />
    </svg>
  );
}

/* SeverityBar dropped (Spike-3 critique round 1): below-JND width and the area
   encoding plus AbnormalFlag now carry severity. */

/**
 * RelatedMedsCluster — structured chip cluster for medications affected by the
 * problem (e.g. "Lisinopril held d/t AKI"). Mono-caps RELATED label + status
 * dot + drug name + reason. Drug ink dims when status is "held" or
 * "discontinued"; the leading dot carries the status redundantly.
 */
function RelatedMedsCluster({ meds }: { meds: RelatedMed[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0 normal-case">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        related
      </span>
      <span aria-hidden className="font-mono text-[10px] text-[var(--color-text-muted)]">
        ·
      </span>
      {meds.map((m, i) => {
        const isHeld = m.status === "held" || m.status === "discontinued";
        const dot = isHeld ? "var(--color-accent)" : "var(--color-text-muted)";
        return (
          <span
            key={`${m.name}-${i}`}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em]"
            title={
              m.reason
                ? `${m.name} ${m.status} (${m.reason})`
                : `${m.name} ${m.status}`
            }
          >
            <span
              aria-hidden
              className="inline-block h-1 w-1 rounded-full"
              style={{ background: dot }}
            />
            <span
              className={cn(
                "tracking-[0.16em]",
                isHeld
                  ? "text-[var(--color-text-muted)] line-through decoration-[0.5px]"
                  : "text-[var(--color-text)]",
              )}
            >
              {m.name}
            </span>
            <span className="text-[var(--color-accent)]">{m.status}</span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * FilterChip — toggleable count chip for the sub-rule strip. Uses
 * aria-pressed for the toggle state. When `disabled` is true the chip is
 * read-only (count display only); we still surface it so the strip reads as
 * a calibrated breakdown rather than just a single toggle.
 */
function FilterChip({
  label,
  count,
  pressed,
  onClick,
  disabled,
}: {
  label: string;
  count: number;
  pressed: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={
        disabled
          ? `${label} ${count}`
          : `${pressed ? "Hide" : "Show"} ${label.toLowerCase()} (${count})`
      }
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-xs)] border px-2 font-mono text-[10px] uppercase tracking-[0.16em] outline-none transition-colors duration-[120ms] ease-out focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]",
        pressed
          ? "border-[var(--color-text)] bg-[var(--color-bg)] text-[var(--color-text)]"
          : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
        disabled ? "cursor-default" : "cursor-pointer",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

function RingedMonogram({ initials, title }: { initials: string; title: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--color-text)] ring-1 ring-[var(--color-border-strong)]"
    >
      {initials}
    </span>
  );
}

/* ---------------- legend ---------------- */

function Legend() {
  // Status anchor row — shape × ink encodes status; size held constant at
  // moderate so the reader can isolate the shape variable.
  const statusItems: { glyph: React.ReactNode; label: string }[] = [
    { glyph: <StatusGlyph status="active-acute" severity="moderate" />, label: "active · acute" },
    { glyph: <StatusGlyph status="active-chronic" severity="moderate" />, label: "active · chronic" },
    { glyph: <StatusGlyph status="suspected" severity="moderate" />, label: "suspected" },
    { glyph: <StatusGlyph status="ruled-out" severity="moderate" />, label: "ruled out" },
    { glyph: <StatusGlyph status="resolved" severity="moderate" />, label: "resolved" },
  ];
  // Size anchor row — radius² scales with severity; isolate the size variable
  // by holding shape constant (active-chronic / plain filled walnut). This is
  // what unlocks the Spike-3 area encoding for the reader.
  const sizeItems: { sev: ProblemSeverity; label: string }[] = [
    { sev: "mild", label: "mild" },
    { sev: "moderate", label: "moderate" },
    { sev: "severe", label: "severe" },
  ];
  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2">
      {/* Row A: status (shape × ink) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="w-[64px] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Status
        </span>
        {statusItems.map((it) => (
          <span
            key={it.label}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
          >
            {it.glyph}
            {it.label}
          </span>
        ))}
      </div>
      {/* Row B: size = severity (the Spike-3 area-encoding anchor) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="w-[64px] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Size
        </span>
        {sizeItems.map((it) => (
          <span
            key={it.sev}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
          >
            <StatusGlyph status="active-chronic" severity={it.sev} />
            {it.label}
          </span>
        ))}
        <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          disc area · severity
        </span>
      </div>
    </div>
  );
}

/* ---------------- detail modal ---------------- */

function ProblemDetail({
  problem,
  onClose,
  onSetStatus,
}: {
  problem: Problem;
  onClose: () => void;
  onSetStatus: (s: ProblemStatus) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const handleChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose();
  };
  return (
    <Modal
      open={open}
      onOpenChange={handleChange}
      placement="right"
      size="lg"
      ariaLabel={`Detail for ${problem.name}`}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <span>{STATUS_HUMAN[problem.status]}</span>
            <span aria-hidden>·</span>
            <span>{problem.icd10}</span>
            <span aria-hidden>·</span>
            <span>{problem.severity}</span>
          </div>
          <h2
            className="mt-1 font-display text-[22px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            {problem.name}
          </h2>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            Owner · <span className="text-[var(--color-text)]">{problem.ownerFull}</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-b border-[var(--color-border)] px-6 py-3 text-[12px]">
          <Metric label="Onset" value={<Timestamp value={problem.onset} format="absolute" />} />
          <Metric
            label="Last update"
            value={<Timestamp value={problem.updatedAt} format="relative" />}
          />
          <Metric
            label="Related"
            value={
              <span className="font-mono tabular-nums text-[var(--color-text)]">
                {problem.related?.orders ?? 0} orders ·{" "}
                {problem.related?.notes ?? 0} notes ·{" "}
                {problem.related?.results ?? 0} results
              </span>
            }
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Timeline
          </p>
          <ol className="mt-3 space-y-3 border-l border-[var(--color-border)] pl-6">
            {problem.events.map((ev, i) => (
              <li key={i} className="relative">
                {/* Dot + 1-letter kind glyph: redundant encoding so kind
                    survives grayscale (R / O / N / E). */}
                <span
                  aria-hidden
                  className="absolute -left-[28px] top-1.5 inline-flex items-center gap-1"
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        ev.kind === "result"
                          ? "var(--color-accent)"
                          : ev.kind === "order"
                            ? "var(--color-accent-2)"
                            : "var(--color-text)",
                    }}
                  />
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] tabular-nums">
                    {KIND_LETTER[ev.kind]}
                  </span>
                </span>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  {ev.kind}
                  <span aria-hidden className="mx-1.5">·</span>
                  <Timestamp value={ev.ts} format="absolute" />
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-text)]">
                  {ev.text}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <Menu
            ariaLabel="Change status"
            placement="top-start"
            items={[
              { type: "heading", label: "Set status" },
              { label: "Active · acute", onSelect: () => onSetStatus("active-acute") },
              { label: "Active · chronic", onSelect: () => onSetStatus("active-chronic") },
              { label: "Suspected", onSelect: () => onSetStatus("suspected") },
              { type: "separator", label: "" },
              { label: "Ruled out", destructive: true, onSelect: () => onSetStatus("ruled-out") },
              { label: "Resolved", destructive: true, onSelect: () => onSetStatus("resolved") },
            ]}
            trigger={
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] outline-none transition-colors duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
              >
                Change status
              </button>
            }
          />
          <ModalClose
            render={
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-text)] bg-[var(--color-text)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-bg)] outline-none transition-colors duration-[120ms] ease-out focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
              >
                Close
              </button>
            }
          />
        </div>
      </div>
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="text-[12px] text-[var(--color-text)]">{value}</span>
    </div>
  );
}
