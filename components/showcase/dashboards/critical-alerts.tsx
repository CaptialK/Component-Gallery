"use client";

/**
 * Registry entry (proposed — orchestrator will lift this):
 *
 *   {
 *     domain: "medical",
 *     category: "dashboards",
 *     slug: "critical-alerts",
 *     title: "Critical alerts",
 *     filename: "critical-alerts.tsx",
 *     description: "Cross-patient feed of unread abnormal results. Severity icon + value + range + patient + time-since-resulted + acknowledge. J/K nav, click opens result detail with prior-values trend.",
 *     layout: "specimen",
 *     aspectRatio: "5 / 6",
 *     maxWidth: 720,
 *     firstImpression: "2026-05-05",
 *     load: () => import("@/components/showcase/dashboards/critical-alerts"),
 *   }
 */

import * as React from "react";
import { ClinicalValue } from "@/components/_kit/clinical-value";
import { AbnormalFlag, type AbnormalSeverity } from "@/components/_kit/abnormal-flag";
import { ReferenceRange } from "@/components/_kit/reference-range";
import { Timestamp } from "@/components/_kit/timestamp";
import { PatientStrip, type Patient } from "@/components/_kit/patient-strip";
import { Modal, ModalClose } from "@/components/_kit/modal";
import { Menu } from "@/components/_kit/menu";
import { Trace, type TracePoint } from "@/components/_kit/trace";
import { useToast } from "@/components/_kit/toast";
import { cn } from "@/lib/cn";

type AckState = "unread" | "acknowledged" | "escalated" | "resolved";

type Severity = "critical" | "high" | "panic";

type Alert = {
  id: string;
  severity: Severity;
  /** Lab / vital name. */
  test: string;
  /** Short LOINC-style code shown in mono. */
  code: string;
  value: number | string;
  unit: string;
  refLow: number;
  refHigh: number;
  flag: AbnormalSeverity;
  flagLabel: string;
  /** ISO time the result returned. */
  resultedAt: string;
  patient: Patient;
  /** Prior values, oldest → newest, for the trend Trace. */
  trend: number[];
  /** ISO timestamps for each value in `trend`, same length & order. */
  trendAt: string[];
  state: AckState;
  /** Initials of acker; required when state ≠ "unread". */
  ackedBy?: string;
  /** ISO time of ack action; required when state ≠ "unread". */
  ackedAt?: string;
};

const NOW = "2026-05-05T14:08:00Z";

// 24-hour unacked-queue depth, hourly buckets, oldest → newest. Real queues
// flush at shift change — depth climbs through each shift, then drops at the
// 14:00 day→evening handoff and again at the 22:00 evening→night handoff.
const UNACKED_24H: TracePoint[] = [
  { x: 0, y: 4 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 2 },
  { x: 4, y: 2 }, { x: 5, y: 3 }, { x: 6, y: 1 }, { x: 7, y: 2 },
  { x: 8, y: 4 }, { x: 9, y: 6 }, { x: 10, y: 8 }, { x: 11, y: 8 },
  { x: 12, y: 9 }, { x: 13, y: 11 }, { x: 14, y: 3 }, { x: 15, y: 4 },
  { x: 16, y: 6 }, { x: 17, y: 8 }, { x: 18, y: 9 }, { x: 19, y: 11 },
  { x: 20, y: 11 }, { x: 21, y: 12 }, { x: 22, y: 4 }, { x: 23, y: 6 },
];

const PATIENT_PATEL: Patient = {
  family: "Patel",
  given: "Reema",
  mrn: "80124-5",
  dob: "1979-03-14",
  sex: "F",
  allergies: [
    { allergen: "Penicillin", severity: "severe" },
    { allergen: "Sulfa drugs", severity: "moderate" },
  ],
};

const PATIENT_CHEN: Patient = {
  family: "Chen",
  given: "Wei",
  mrn: "82014-3",
  dob: "1957-08-22",
  sex: "M",
  allergies: [],
  allergiesReviewedAt: "05 May 06:14",
};

const PATIENT_GARCIA: Patient = {
  family: "Garcia",
  given: "Marisol",
  mrn: "78902-1",
  dob: "1992-11-04",
  sex: "F",
  allergies: null, // not documented — dangerous
};

const PATIENT_NWAFOR: Patient = {
  family: "Nwafor",
  given: "David",
  mrn: "85113-9",
  dob: "1948-01-30",
  sex: "M",
  allergies: [{ allergen: "Iodinated contrast", severity: "anaphylaxis" }],
};

const PATIENT_KOVALENKO: Patient = {
  family: "Kovalenko",
  given: "Anya",
  mrn: "81077-2",
  dob: "1985-06-12",
  sex: "F",
  allergies: [{ allergen: "Codeine", severity: "moderate" }],
};

const PATIENT_TANAKA: Patient = {
  family: "Tanaka",
  given: "Hiro",
  mrn: "80918-4",
  dob: "1973-10-08",
  sex: "M",
  allergies: [],
  allergiesReviewedAt: "04 May 18:30",
};

const ALERTS: Alert[] = [
  {
    id: "a-001",
    severity: "panic",
    test: "Potassium",
    code: "2823-3",
    value: 6.8,
    unit: "mEq/L",
    refLow: 3.5,
    refHigh: 5.0,
    flag: "panic",
    flagLabel: "panic high K",
    resultedAt: "2026-05-05T14:02:00Z",
    patient: PATIENT_NWAFOR,
    trend: [4.6, 4.9, 5.4, 5.9, 6.3, 6.8],
    trendAt: [
      "2026-05-05T09:02:00Z",
      "2026-05-05T10:02:00Z",
      "2026-05-05T11:02:00Z",
      "2026-05-05T12:02:00Z",
      "2026-05-05T13:02:00Z",
      "2026-05-05T14:02:00Z",
    ],
    state: "unread",
  },
  {
    id: "a-002",
    severity: "critical",
    test: "Troponin I",
    code: "10839-9",
    value: 1.42,
    unit: "ng/mL",
    refLow: 0.0,
    refHigh: 0.04,
    flag: "critical-high",
    flagLabel: "critically high trop",
    resultedAt: "2026-05-05T13:48:00Z",
    patient: PATIENT_PATEL,
    trend: [0.02, 0.06, 0.21, 0.58, 0.94, 1.42],
    trendAt: [
      "2026-05-04T22:48:00Z",
      "2026-05-05T01:48:00Z",
      "2026-05-05T04:48:00Z",
      "2026-05-05T07:48:00Z",
      "2026-05-05T10:48:00Z",
      "2026-05-05T13:48:00Z",
    ],
    state: "unread",
  },
  {
    id: "a-003",
    severity: "critical",
    test: "Lactate",
    code: "32693-4",
    value: 4.6,
    unit: "mmol/L",
    refLow: 0.5,
    refHigh: 2.2,
    flag: "critical-high",
    flagLabel: "critically high lactate",
    resultedAt: "2026-05-05T13:31:00Z",
    patient: PATIENT_GARCIA,
    trend: [1.2, 1.5, 2.1, 2.8, 3.4, 4.6],
    trendAt: [
      "2026-05-05T08:31:00Z",
      "2026-05-05T09:31:00Z",
      "2026-05-05T10:31:00Z",
      "2026-05-05T11:31:00Z",
      "2026-05-05T12:31:00Z",
      "2026-05-05T13:31:00Z",
    ],
    state: "unread",
  },
  {
    id: "a-004",
    severity: "critical",
    test: "Hemoglobin",
    code: "718-7",
    value: 6.4,
    unit: "g/dL",
    refLow: 12,
    refHigh: 16,
    flag: "critical-low",
    flagLabel: "critically low Hgb",
    resultedAt: "2026-05-05T12:54:00Z",
    patient: PATIENT_KOVALENKO,
    trend: [10.8, 9.6, 8.4, 7.5, 6.9, 6.4],
    trendAt: [
      "2026-05-04T18:54:00Z",
      "2026-05-04T22:54:00Z",
      "2026-05-05T02:54:00Z",
      "2026-05-05T06:54:00Z",
      "2026-05-05T10:54:00Z",
      "2026-05-05T12:54:00Z",
    ],
    state: "escalated",
    ackedBy: "MR",
    ackedAt: "2026-05-05T12:58:00Z",
  },
  {
    id: "a-005",
    severity: "high",
    test: "Glucose",
    code: "2345-7",
    value: 412,
    unit: "mg/dL",
    refLow: 70,
    refHigh: 99,
    flag: "high",
    flagLabel: "high glucose",
    resultedAt: "2026-05-05T12:14:00Z",
    patient: PATIENT_CHEN,
    trend: [168, 210, 268, 312, 365, 412],
    trendAt: [
      "2026-05-05T02:14:00Z",
      "2026-05-05T04:14:00Z",
      "2026-05-05T06:14:00Z",
      "2026-05-05T08:14:00Z",
      "2026-05-05T10:14:00Z",
      "2026-05-05T12:14:00Z",
    ],
    state: "unread",
  },
  {
    id: "a-006",
    severity: "high",
    test: "Creatinine",
    code: "2160-0",
    value: 2.4,
    unit: "mg/dL",
    refLow: 0.7,
    refHigh: 1.3,
    flag: "high",
    flagLabel: "high Cr",
    resultedAt: "2026-05-05T10:08:00Z", // > 4h — stale
    patient: PATIENT_TANAKA,
    trend: [1.0, 1.2, 1.4, 1.7, 2.0, 2.4],
    trendAt: [
      "2026-05-04T10:08:00Z",
      "2026-05-04T16:08:00Z",
      "2026-05-04T22:08:00Z",
      "2026-05-05T02:08:00Z",
      "2026-05-05T06:08:00Z",
      "2026-05-05T10:08:00Z",
    ],
    state: "unread",
  },
  {
    id: "a-007",
    severity: "high",
    test: "Sodium",
    code: "2951-2",
    value: 124,
    unit: "mEq/L",
    refLow: 135,
    refHigh: 145,
    flag: "low",
    flagLabel: "low Na",
    resultedAt: "2026-05-05T11:42:00Z",
    patient: PATIENT_PATEL,
    trend: [136, 134, 131, 128, 126, 124],
    trendAt: [
      "2026-05-05T01:42:00Z",
      "2026-05-05T03:42:00Z",
      "2026-05-05T05:42:00Z",
      "2026-05-05T07:42:00Z",
      "2026-05-05T09:42:00Z",
      "2026-05-05T11:42:00Z",
    ],
    state: "acknowledged",
    ackedBy: "KH",
    ackedAt: "2026-05-05T11:54:00Z",
  },
];

const SEVERITY_ORDER: Record<Severity, number> = {
  panic: 3,
  critical: 2,
  high: 1,
};

export default function CriticalAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = React.useState(ALERTS);
  const [focusId, setFocusId] = React.useState<string>(ALERTS[0].id);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const sorted = React.useMemo(
    () =>
      [...alerts].sort((a, b) => {
        if (a.state !== "unread" && b.state === "unread") return 1;
        if (a.state === "unread" && b.state !== "unread") return -1;
        const sev = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
        if (sev !== 0) return sev;
        return new Date(b.resultedAt).getTime() - new Date(a.resultedAt).getTime();
      }),
    [alerts],
  );

  const focusIndex = sorted.findIndex((a) => a.id === focusId);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (openId) return;
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = sorted[Math.min(sorted.length - 1, focusIndex + 1)];
      if (next) setFocusId(next.id);
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = sorted[Math.max(0, focusIndex - 1)];
      if (next) setFocusId(next.id);
    } else if (e.key === "Enter") {
      e.preventDefault();
      setOpenId(focusId);
    }
  };

  const acknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              state: "acknowledged",
              ackedBy: "KH",
              ackedAt: new Date().toISOString(),
            }
          : a,
      ),
    );
    toast({ title: "Result acknowledged · audit recorded", status: "success" });
    setOpenId(null);
  };

  const escalate = (id: string, action: "forward" | "sign" | "resolve") => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              state: action === "resolve" ? "resolved" : "escalated",
              ackedBy: "KH",
              ackedAt: new Date().toISOString(),
            }
          : a,
      ),
    );
    const titles: Record<typeof action, string> = {
      forward: "Forwarded to attending · audit recorded",
      sign: "Signed off · audit recorded",
      resolve: "Resolved · audit recorded",
    };
    toast({ title: titles[action], status: "success" });
  };

  const counts = alerts.reduce(
    (acc, a) => {
      if (a.state === "unread") acc.unread += 1;
      const ageMin =
        (new Date(NOW).getTime() - new Date(a.resultedAt).getTime()) / 60000;
      if (a.state === "unread" && ageMin > 240) acc.stale += 1;
      return acc;
    },
    { unread: 0, stale: 0 },
  );

  const focused = sorted.find((a) => a.id === focusId);

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Top rule */}
        <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <span>Critical alerts · cross-patient · 14:08</span>
          <span>
            <span className="text-[var(--color-accent)] tabular-nums">
              {counts.unread}
            </span>{" "}
            unread
            {counts.stale > 0 && (
              <>
                <span aria-hidden className="mx-1.5">·</span>
                <span className="text-[var(--color-accent)] tabular-nums">
                  {counts.stale}
                </span>{" "}
                stale &gt;4h
              </>
            )}
          </span>
        </div>

        {/* Hero + 24h Trace */}
        <div className="grid shrink-0 grid-cols-[1fr_auto] items-end gap-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Flagged results awaiting review
            </p>
            <h1
              className="mt-1 font-display text-[22px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
            >
              {alerts.filter((a) => a.state === "unread").length} need you now
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              unacked · last 24h
            </span>
            <Trace
              data={UNACKED_24H}
              width={180}
              height={36}
              strokeColor="var(--color-text)"
              strokeWidth={1.1}
              dots={[{ index: UNACKED_24H.length - 1, color: "var(--color-accent)", radius: 2.4 }]}
              ariaLabel="Cumulative unacknowledged alerts over the last 24 hours"
            />
          </div>
        </div>

        {/* Feed */}
        <div
          role="list"
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Critical alert feed"
          className="min-h-0 flex-1 overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent-2)]"
        >
          {sorted.map((a, i) => (
            <AlertRow
              key={a.id}
              alert={a}
              isFocus={focusId === a.id}
              isMostRecent={i === 0 && a.state === "unread"}
              onClick={() => {
                setFocusId(a.id);
                setOpenId(a.id);
              }}
              onFocus={() => setFocusId(a.id)}
              onAck={() => acknowledge(a.id)}
              onEscalateAction={(action) => escalate(a.id, action)}
            />
          ))}
        </div>

        {/* Legend + caption */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Severity
          </span>
          <LegendItem severity="panic" label="panic · 6px + tick" />
          <LegendItem severity="critical-high" label="critical · 4px" />
          <LegendItem severity="high" label="high · 2px" />
          <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent-2)]">
            <span
              aria-hidden
              className="inline-block h-1 w-1 rounded-full bg-[var(--color-accent-2)]"
            />
            live · resulted in last 6 min
          </span>
          <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            J / K nav · Enter to open
          </span>
        </div>

        <p
          className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2 text-center text-[11px] italic leading-relaxed text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Strip width encodes severity: panic = lab-defined panic value,
          critical = severely abnormal, high = abnormal. Stale &gt; 4h flags
          persimmon on the time stamp.
        </p>
      </div>

      {focused && openId && (
        <AlertDetail
          alert={focused}
          onClose={() => setOpenId(null)}
          onAck={() => acknowledge(focused.id)}
        />
      )}
    </div>
  );
}

/* ---------------- row ---------------- */

/**
 * Severity → strip width (px) and whether to render a top tick cap.
 *
 *   panic    → 6px wide + persimmon square tick at the top of the strip.
 *   critical → 4px wide solid.
 *   high     → 2px wide solid.
 *
 * Three distinguishable widths + the panic tick make the severity readable
 * at squint / grayscale, so colour is not the sole signal.
 */
const STRIP_WIDTH_PX: Record<Severity, number> = {
  panic: 6,
  critical: 4,
  high: 2,
};

function AlertRow({
  alert,
  isFocus,
  isMostRecent,
  onClick,
  onFocus,
  onAck,
  onEscalateAction,
}: {
  alert: Alert;
  isFocus: boolean;
  isMostRecent: boolean;
  onClick: () => void;
  onFocus: () => void;
  onAck: () => void;
  onEscalateAction: (action: "forward" | "sign" | "resolve") => void;
}) {
  const acked = alert.state !== "unread";
  // Dim only acknowledged / resolved. Escalated is MORE urgent, not less, so
  // the row stays at full opacity AND its severity strip keeps its live colour
  // — only acked/resolved fade the strip to the muted border ink.
  const dim = alert.state === "acknowledged" || alert.state === "resolved";
  const stripFaded = dim;
  // The licensed `color-mix(..., #000 N%, ...)` pattern is reserved for the
  // accent token; here we deepen the persimmon strip with the ink token so
  // the grey-scale step uses cream→ink rather than absolute black.
  const stripColor =
    alert.severity === "panic"
      ? "color-mix(in oklch, var(--color-accent) 72%, var(--color-text) 28%)"
      : alert.severity === "critical"
        ? "var(--color-accent)"
        : "color-mix(in oklch, var(--color-accent) 50%, var(--color-border-strong))";
  const stripWidth = STRIP_WIDTH_PX[alert.severity];

  // Garcia's "allergies not documented" gap pairs with clinical risk on a
  // critical-K row → render the AbnormalFlag triangle adjacent to the chip.
  const hasUndocAllergy = alert.patient.allergies === null;

  return (
    <div
      role="listitem"
      className={cn(
        "relative grid gap-3 border-b border-[var(--color-border)] transition-colors duration-[120ms] ease-out",
        isFocus
          ? "bg-[color-mix(in_oklch,var(--color-accent-2)_4%,var(--color-surface))]"
          : null,
        dim ? "opacity-60" : null,
      )}
      style={{ gridTemplateColumns: "8px 1fr auto" }}
    >
      {/* Left severity strip — width encodes severity (6/4/2 px), panic adds
          a square tick at the top so the ranking survives a grayscale squint
          test. Strip is right-aligned within its 8px slot so the row's text
          column stays at a consistent x-coordinate regardless of severity. */}
      <span
        aria-hidden
        className="relative block self-stretch justify-self-end"
        style={{
          width: `${stripWidth}px`,
          background: stripFaded ? "var(--color-border-strong)" : stripColor,
        }}
      >
        {alert.severity === "panic" && !stripFaded && (
          <span
            aria-hidden
            className="absolute -top-px left-0 right-0 h-1.5"
            style={{
              background:
                "color-mix(in oklch, var(--color-accent) 72%, var(--color-text) 28%)",
              outline: "1px solid var(--color-bg)",
              outlineOffset: "-1px",
            }}
          />
        )}
      </span>

      {/* Body — clickable */}
      <button
        type="button"
        onClick={onClick}
        onFocus={onFocus}
        tabIndex={isFocus ? 0 : -1}
        aria-current={isFocus ? "true" : undefined}
        className="grid min-h-[44px] grid-cols-1 items-start gap-2 py-3 pr-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
      >
        {/* Top line: test name + value + flag + range */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[14px] font-medium text-[var(--color-text)]">
            {alert.test}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {alert.code}
          </span>
          <span className="ml-1">
            <ClinicalValue
              value={alert.value}
              unit={alert.unit}
              size="md"
              flag={{ severity: alert.flag, label: alert.flagLabel }}
            />
          </span>
          <ReferenceRange
            low={alert.refLow}
            high={alert.refHigh}
            value={typeof alert.value === "number" ? alert.value : null}
            unit={alert.unit}
            size="sm"
          />
          {isMostRecent && !acked && (
            // Pulse on the chip wrapper ONLY — the inner dot used to also
            // run animate-live-pulse, doubling the cadence and reading as a
            // bug. Drop the inner-dot pulse; keep the chip pulse.
            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent-2)] animate-live-pulse">
              <span
                aria-hidden
                className="inline-block h-1 w-1 rounded-full bg-[var(--color-accent-2)]"
              />
              live
            </span>
          )}
        </div>

        {/* Bottom line: patient strip block + timestamp + state */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <PatientStrip patient={alert.patient} density="block" className="px-0 py-0 min-h-0" />
          {hasUndocAllergy && (
            <AbnormalFlag
              severity="critical-high"
              reason="Allergy not documented"
              size="sm"
            />
          )}
          <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
          <span className="inline-flex items-baseline gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            <Timestamp value={alert.resultedAt} staleAfter={240} format="relative" />
            <span aria-hidden className="opacity-50">·</span>
            <Timestamp value={alert.resultedAt} format="absolute" />
          </span>
          <StateBadge state={alert.state} />
        </div>
      </button>

      {/* Trailing action area — ACK button when unread, audit stamp when
          acknowledged/resolved, action menu when escalated. The action
          control is `tabIndex={isFocus ? 0 : -1}` so a Tab from the focused
          row lands here (the list keeps the roving-tabindex, but each row's
          action joins the tab order while that row is focused). */}
      <div className="flex items-center pr-3">
        {alert.state === "unread" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAck();
            }}
            tabIndex={isFocus ? 0 : -1}
            className="inline-flex h-11 min-h-[44px] items-center rounded-[var(--radius-sm)] border border-[var(--color-text)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)] outline-none transition-colors duration-[120ms] ease-out hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
            aria-label={`Acknowledge ${alert.test} ${alert.value} ${alert.unit} for ${alert.patient.family}`}
          >
            ack
          </button>
        ) : alert.state === "escalated" ? (
          <Menu
            ariaLabel={`Escalation actions for ${alert.test} ${alert.patient.family}`}
            placement="bottom-end"
            items={[
              { type: "heading", label: "Escalation actions" },
              {
                label: "Forward to attending",
                onSelect: () => onEscalateAction("forward"),
                shortcut: ["F"],
              },
              {
                label: "Sign",
                onSelect: () => onEscalateAction("sign"),
                shortcut: ["S"],
              },
              { type: "separator", label: "" },
              {
                label: "Resolve",
                onSelect: () => onEscalateAction("resolve"),
                destructive: true,
              },
            ]}
            trigger={
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                tabIndex={isFocus ? 0 : -1}
                className="inline-flex h-11 min-h-[44px] items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-warning)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-warning)] outline-none transition-colors duration-[120ms] ease-out hover:bg-[color-mix(in_oklch,var(--color-warning)_8%,var(--color-bg))] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
                aria-label={`Escalation actions for ${alert.test} ${alert.patient.family}`}
              >
                esc
                <span aria-hidden className="opacity-60">▾</span>
              </button>
            }
          />
        ) : (
          <span className="flex flex-col items-end gap-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] tabular-nums">
            <span>
              {alert.state === "resolved" ? "resolved" : "acked"}
              {alert.ackedAt ? ` ${fmtAckedAt(alert.ackedAt)}` : ""}
            </span>
            {alert.ackedBy && (
              <span className="opacity-80">by {alert.ackedBy}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/** `HH:MM` of the ackedAt ISO. Local time so the audit stamp matches the
 *  clinician's wall clock. */
function fmtAckedAt(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function StateBadge({ state }: { state: AckState }) {
  const map: Record<AckState, { label: string; ink: string; dot: string }> = {
    unread: {
      label: "unread",
      ink: "var(--color-accent)",
      dot: "var(--color-accent)",
    },
    acknowledged: {
      label: "acked",
      ink: "var(--color-text-muted)",
      dot: "var(--color-text-muted)",
    },
    escalated: {
      label: "escalated",
      ink: "var(--color-warning)",
      dot: "var(--color-warning)",
    },
    resolved: {
      label: "resolved",
      ink: "var(--color-text-muted)",
      dot: "var(--color-text-muted)",
    },
  };
  const m = map[state];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]"
      style={{ borderColor: m.ink, color: m.ink }}
    >
      <span
        aria-hidden
        className="inline-block h-1 w-1 rounded-full"
        style={{ background: m.dot }}
      />
      {m.label}
    </span>
  );
}

function LegendItem({ severity, label }: { severity: AbnormalSeverity; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
      <AbnormalFlag severity={severity} size="sm" />
      {label}
    </span>
  );
}

/* ---------------- derived countdown ---------------- */

/**
 * `Timestamp` doesn't ship a `countdown` format, so we inline a small ticker
 * here using the same 60s `setInterval` cadence the primitive already uses.
 * Past 5 min remaining the ink turns persimmon (color + label, never colour
 * alone). Past zero we show "overdue · {N}m" so the deadline state is
 * pre-attentively distinct from "still on track".
 */
function CallProtocolCountdown({
  resultedAt,
  windowMin = 15,
}: {
  resultedAt: string;
  windowMin?: number;
}) {
  const deadline = React.useMemo(
    () => new Date(resultedAt).getTime() + windowMin * 60_000,
    [resultedAt, windowMin],
  );
  const [now, setNow] = React.useState<number>(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const remainingMin = Math.round((deadline - now) / 60_000);
  const overdue = remainingMin < 0;
  const tight = !overdue && remainingMin <= 5;
  const ink = overdue || tight
    ? "var(--color-accent)"
    : "var(--color-text-muted)";
  const label = overdue
    ? `overdue · ${Math.abs(remainingMin)}m past`
    : `${remainingMin}m remaining`;
  return (
    <span
      role="timer"
      aria-label={`Critical-call protocol — ${label}`}
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
      style={{ color: ink }}
    >
      {(overdue || tight) && (
        <span
          aria-hidden
          className="inline-block h-1 w-1 rounded-full"
          style={{ background: "var(--color-accent)" }}
        />
      )}
      <span className="tabular-nums">Notify primary team — {label}</span>
    </span>
  );
}

/** `HH:MM` for the trend-axis labels under each Trace dot. */
function fmtAxisTime(iso: string, now: Date): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  // Mark prior days with a leading `-Nd ` so the q3h vs q6h interval reads
  // honestly — a Troponin q3h trail can span > 24h.
  const dayDelta = Math.floor(
    (new Date(now.toDateString()).getTime() -
      new Date(d.toDateString()).getTime()) /
      86_400_000,
  );
  if (dayDelta > 0) return `-${dayDelta}d ${hh}:${mm}`;
  return `${hh}:${mm}`;
}

/* ---------------- detail modal ---------------- */

function AlertDetail({
  alert,
  onClose,
  onAck,
}: {
  alert: Alert;
  onClose: () => void;
  onAck: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const handleChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose();
  };
  const trendData: TracePoint[] = alert.trend.map((y, i) => ({ x: i, y }));
  const yMin = Math.min(...alert.trend, alert.refLow) - 0.2;
  const yMax = Math.max(...alert.trend, alert.refHigh) + 0.2;

  return (
    <Modal
      open={open}
      onOpenChange={handleChange}
      placement="right"
      size="lg"
      ariaLabel={`${alert.test} detail for ${alert.patient.family}`}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Result detail · {alert.code}
          </p>
          <h2
            className="mt-1 font-display text-[22px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            {alert.test}
          </h2>
        </div>

        <PatientStrip patient={alert.patient} density="compact" />

        <div className="grid grid-cols-2 gap-6 border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Value
            </p>
            <div className="mt-2">
              <ClinicalValue
                value={alert.value}
                unit={alert.unit}
                size="hero"
                timestamp={alert.resultedAt}
                staleAfter={240}
                flag={{ severity: alert.flag, label: alert.flagLabel }}
              />
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Reference range
            </p>
            <div className="mt-3">
              <ReferenceRange
                low={alert.refLow}
                high={alert.refHigh}
                value={typeof alert.value === "number" ? alert.value : null}
                unit={alert.unit}
                size="md"
              />
            </div>
          </div>
        </div>

        <div className="border-b border-[var(--color-border)] px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Last 6 results · q3h interval IS the diagnostic
          </p>
          <div className="mt-2">
            <Trace
              data={trendData}
              width={420}
              height={84}
              yDomain={[yMin, yMax]}
              strokeColor="var(--color-text)"
              strokeWidth={1.1}
              thresholds={[
                { y: alert.refLow, color: "var(--color-border-strong)", dashed: true, strokeWidth: 0.6 },
                { y: alert.refHigh, color: "var(--color-border-strong)", dashed: true, strokeWidth: 0.6 },
              ]}
              dots={trendData.map((p, i) => ({
                index: i,
                color:
                  p.y < alert.refLow || p.y > alert.refHigh
                    ? "var(--color-accent)"
                    : "var(--color-text)",
                radius: i === trendData.length - 1 ? 2.6 : 1.8,
              }))}
              ariaLabel={`${alert.test} trend, last six results`}
            />
          </div>
          {/* Per-point absolute timestamps below each dot — for an MI signal
              the q3h vs q6h interval IS the diagnostic, so a single "6 prior
              · now" axis hides the most important variable. Five labels
              under five prior dots; the sixth cell reads "now" (not the
              wall-clock) so the latency to the present is pre-attentive. */}
          <div
            className="mt-1 grid font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
            style={{
              gridTemplateColumns: `repeat(${alert.trendAt.length}, minmax(0, 1fr))`,
            }}
          >
            {alert.trendAt.map((iso, i) => {
              const isNow = i === alert.trendAt.length - 1;
              return (
                <span
                  key={iso}
                  className="text-center tabular-nums"
                  title={new Date(iso).toISOString()}
                >
                  {isNow ? "now" : fmtAxisTime(iso, new Date(NOW))}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Context
          </p>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-[var(--color-text)]">
            <li>· Resulted by Lab Hematology · accession 26-A-{alert.id.slice(-3).toUpperCase()}</li>
            <li>· Specimen drawn 1h08m before result; clot-free serum</li>
            <li className="flex items-center gap-2">
              <span aria-hidden>·</span>
              <span>Critical-call protocol:</span>
              <CallProtocolCountdown resultedAt={alert.resultedAt} windowMin={15} />
            </li>
            <li>
              · Last sign-off on this analyte:{" "}
              {alert.state === "escalated" && alert.ackedBy && alert.ackedAt
                ? `escalated to attending ${fmtAckedAt(alert.ackedAt)} by ${alert.ackedBy}`
                : alert.state === "acknowledged" && alert.ackedBy && alert.ackedAt
                  ? `acked ${fmtAckedAt(alert.ackedAt)} by ${alert.ackedBy}`
                  : "—"}
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Severity ladder · panic = lab-defined panic value · critical = severely abnormal · high = abnormal
          </span>
          <div className="flex items-center gap-2">
            <ModalClose
              render={
                <button
                  type="button"
                  className="inline-flex h-11 min-h-[44px] items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] outline-none transition-colors duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
                >
                  Close
                </button>
              }
            />
            <button
              type="button"
              onClick={onAck}
              className="inline-flex h-11 min-h-[44px] items-center rounded-[var(--radius-sm)] border border-[var(--color-text)] bg-[var(--color-text)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-bg)] outline-none transition-colors duration-[120ms] ease-out focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
            >
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
