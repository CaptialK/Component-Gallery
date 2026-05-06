import * as React from "react";
import { AbnormalFlag, type AbnormalSeverity } from "./abnormal-flag";
import { Timestamp } from "./timestamp";
import { cn } from "@/lib/cn";

/**
 * ClinicalValue — the atomic unit of a clinical reading. Composes:
 *
 *   [flag]  VALUE  unit   [timestamp]
 *
 * Visual choices encode clinical safety:
 *
 *  - The unit is REQUIRED and adjacent. mg vs mcg, F vs C, mEq vs mg/dL —
 *    a missing unit is a misread waiting to happen. The API forces it.
 *  - The value is `tabular-nums` Geist Mono so adjacent rows column-align.
 *  - `hero` size puts the unit *underneath* the value in mono-caps for the
 *    monitor-banner reading distance; smaller sizes keep the unit inline.
 *  - When `flag` is set, only the value tints persimmon — the unit and
 *    timestamp stay walnut. The flag itself carries the abnormal language
 *    (icon + letter + colour); tinting everything would dilute it.
 *  - aria-label assembles a full sentence ("128 over 84 mmHg, critically
 *    high BP, recorded 2m ago") so SR reads cleanly mid-shift.
 *
 * Server-renderable. Composes <Timestamp /> only when a timestamp is provided
 * (which is `"use client"`); the value/flag layout itself ships statically.
 *
 * Example (vitals card hero variant):
 *
 *   <ClinicalValue
 *     value={84}
 *     unit="bpm"
 *     timestamp="2026-05-04T14:08:00Z"
 *     size="hero"
 *   />
 */

export type ClinicalValueSize = "sm" | "md" | "lg" | "hero";

export type ClinicalValueProps = {
  /** The reading. Strings allowed for compound values like "128/84" or "neg". */
  value: number | string;
  /** Unit of measure. Required to prevent misread. */
  unit: string;
  /** ISO timestamp when the reading was captured. */
  timestamp?: string;
  flag?: {
    severity: AbnormalSeverity;
    /** Short clinician-facing label, e.g. "low potassium". */
    label?: string;
    /** Optional reason, e.g. "K 3.3, replete". */
    reason?: string;
  };
  /** Stale threshold in minutes. Forwarded to Timestamp. */
  staleAfter?: number;
  size?: ClinicalValueSize;
  ariaLabel?: string;
  className?: string;
};

const VALUE_PX: Record<ClinicalValueSize, number> = {
  sm: 14,
  md: 16,
  lg: 22,
  hero: 34,
};

const UNIT_PX: Record<ClinicalValueSize, number> = {
  sm: 10,
  md: 11,
  lg: 11,
  hero: 11,
};

function buildAria(p: ClinicalValueProps): string {
  if (p.ariaLabel) return p.ariaLabel;
  const parts: string[] = [];
  parts.push(`${p.value} ${p.unit}`);
  if (p.flag) {
    const fragment = p.flag.label
      ? p.flag.label
      : p.flag.severity.replace("-", " ");
    parts.push(p.flag.reason ? `${fragment}, ${p.flag.reason}` : fragment);
  }
  if (p.timestamp) parts.push(`recorded ${p.timestamp}`);
  return parts.join(", ");
}

export function ClinicalValue(props: ClinicalValueProps) {
  const {
    value,
    unit,
    timestamp,
    flag,
    staleAfter,
    size = "md",
    className,
  } = props;
  const aria = buildAria(props);
  const isAbnormal = !!flag;
  const valueColor = isAbnormal ? "var(--color-accent)" : "var(--color-text)";
  const valuePx = VALUE_PX[size];
  const unitPx = UNIT_PX[size];

  if (size === "hero") {
    return (
      <div
        role="group"
        aria-label={aria}
        className={cn("flex flex-col leading-none", className)}
      >
        <div className="flex items-baseline gap-2">
          {flag && <AbnormalFlag severity={flag.severity} reason={flag.reason} size="md" />}
          <span
            className="font-mono tabular-nums leading-none"
            style={{
              fontSize: `${valuePx}px`,
              color: valueColor,
              fontVariationSettings: '"wght" 500',
            }}
          >
            {value}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span
            className="font-mono uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
            style={{ fontSize: `${unitPx}px` }}
          >
            {unit}
          </span>
          {timestamp && (
            <Timestamp value={timestamp} staleAfter={staleAfter} format="relative" />
          )}
        </div>
      </div>
    );
  }

  // sm | md | lg — single inline row.
  const gap = size === "lg" ? "gap-2" : "gap-1.5";
  return (
    <span
      role="group"
      aria-label={aria}
      className={cn("inline-flex items-baseline leading-none", gap, className)}
    >
      {flag && (
        <AbnormalFlag
          severity={flag.severity}
          reason={flag.reason}
          size={size === "lg" ? "md" : "sm"}
        />
      )}
      <span
        className="font-mono tabular-nums leading-none"
        style={{
          fontSize: `${valuePx}px`,
          color: valueColor,
          fontVariationSettings: '"wght" 500',
        }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
        style={{ fontSize: `${unitPx}px` }}
      >
        {unit}
      </span>
      {timestamp && (
        <span className="ml-1">
          <Timestamp value={timestamp} staleAfter={staleAfter} format="relative" />
        </span>
      )}
    </span>
  );
}
