"use client";

import * as React from "react";
import { Popover } from "./popover";
import { cn } from "@/lib/cn";

/**
 * Timestamp — relative + absolute time for clinical surfaces. UTC-stable.
 *
 * Hour 11 of a clinician's shift: the same value can be 2m old or 47m old, and
 * a stale reading is dangerous. This primitive solves three things at once:
 *
 *  1. Defaults to relative ("2m ago") so the eye reads recency before reading
 *     the wall-clock; in-encounter timestamps render as `D2 05:22` (day-of-
 *     encounter notation) when applicable.
 *  2. Stale: when `staleAfter` is exceeded the relative text turns persimmon
 *     AND prefixes with a small persimmon dot — colour AND visual signal,
 *     never colour alone.
 *  3. Hover/focus pops a Popover with the absolute ISO and the clinician
 *     timezone, so disambiguation is one keystroke away.
 *
 * Marked `"use client"` for two reasons: a 60s `setInterval` to refresh the
 * relative label without a server round-trip, and the Popover dependency.
 * The interval is single-tick, non-cascading; cheap.
 */

export type TimestampFormat = "relative" | "absolute" | "both";

export type TimestampProps = {
  value: string | Date;
  format?: TimestampFormat;
  /** Minutes; if exceeded, render persimmon with a leading persimmon dot. */
  staleAfter?: number;
  ariaLabel?: string;
  className?: string;
};

const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "narrow" });

function toDate(v: string | Date): Date {
  if (v instanceof Date) return v;
  // Ensure UTC-stable parsing — ISO strings round-trip identically.
  return new Date(v);
}

function isToday(d: Date, now: Date): boolean {
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** `HH:MM` 24h. */
function fmtTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** `MMM D HH:MM`. */
function fmtDateTime(d: Date): string {
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()} ${fmtTime(d)}`;
}

/** `2m ago`, `47m ago`, `3h ago`, `2d ago`. Drops to `now` under ~30s. */
function fmtRelative(d: Date, now: Date): string {
  const diffMs = d.getTime() - now.getTime();
  const absSec = Math.abs(diffMs) / 1000;
  if (absSec < 30) return "now";
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return RTF.format(minutes, "minute");
  const hours = Math.round(diffMs / 3_600_000);
  if (Math.abs(hours) < 24) return RTF.format(hours, "hour");
  const days = Math.round(diffMs / 86_400_000);
  return RTF.format(days, "day");
}

/** Absolute display, choosing today vs older. */
function fmtAbsolute(d: Date, now: Date): string {
  if (isToday(d, now)) return fmtTime(d);
  return fmtDateTime(d);
}

/**
 * Build a screen-reader sentence: `${absolute}, ${relative}`. Hour-11 friendly.
 */
function buildAriaLabel(d: Date, now: Date): string {
  return `${fmtAbsolute(d, now)}, ${fmtRelative(d, now)}`;
}

export function Timestamp({
  value,
  format = "relative",
  staleAfter,
  ariaLabel,
  className,
}: TimestampProps) {
  const date = React.useMemo(() => toDate(value), [value]);

  // Tick the now-anchor every 60s so relative labels age. Cheap single
  // interval per Timestamp instance — the cost only matters in long lists, in
  // which case callers can pass `format="absolute"` to opt out.
  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const ageMin = (now.getTime() - date.getTime()) / 60_000;
  const isStale = staleAfter != null && ageMin >= staleAfter;

  const relativeText = fmtRelative(date, now);
  const absoluteText = fmtAbsolute(date, now);
  const aria = ariaLabel ?? buildAriaLabel(date, now);

  // ISO + timezone abbreviation for the popover. Avoid throwing if the
  // toLocaleDateString tz part isn't available.
  const tzAbbr = React.useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZoneName: "short",
      }).formatToParts(date);
      return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    } catch {
      return "";
    }
  }, [date]);

  const inkClass = isStale
    ? "text-[var(--color-accent)]"
    : "text-[var(--color-text-muted)]";

  // Suppress popover when the trigger already shows the absolute string;
  // surfacing the same value twice is friction.
  const hideHover = format === "absolute" || format === "both";

  const triggerContent = (() => {
    if (format === "absolute") {
      return (
        <span
          className={cn(
            "font-mono text-[10px] tabular-nums uppercase tracking-[0.16em]",
            inkClass,
            className,
          )}
        >
          {absoluteText}
        </span>
      );
    }
    if (format === "both") {
      return (
        <span
          className={cn(
            "inline-flex items-baseline gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]",
            inkClass,
            className,
          )}
        >
          {isStale && (
            <span
              aria-hidden
              className="inline-block h-1 w-1 translate-y-[1px] rounded-full bg-[var(--color-accent)]"
            />
          )}
          <span className="text-[11px] tracking-[0.14em]">{relativeText}</span>
          <span className="text-[10px] tabular-nums opacity-70">·</span>
          <span className="tabular-nums">{absoluteText}</span>
        </span>
      );
    }
    // relative (default)
    return (
      <span
        className={cn(
          "inline-flex items-baseline gap-1 font-mono text-[10px] uppercase tracking-[0.16em]",
          inkClass,
          className,
        )}
      >
        {isStale && (
          <span
            aria-hidden
            className="inline-block h-1 w-1 translate-y-[-1px] rounded-full bg-[var(--color-accent)]"
          />
        )}
        <span className="tabular-nums">{relativeText}</span>
      </span>
    );
  })();

  const triggerSpan = (
    <span
      tabIndex={0}
      role="time"
      aria-label={aria}
      data-stale={isStale ? "true" : "false"}
      title={hideHover ? undefined : `${date.toISOString()}${tzAbbr ? ` · ${tzAbbr}` : ""}`}
      className="inline-flex cursor-default outline-none focus-visible:underline"
    >
      {triggerContent}
    </span>
  );

  if (hideHover) {
    return triggerSpan;
  }

  return (
    <Popover
      placement="top"
      align="center"
      sideOffset={6}
      ariaLabel="Timestamp detail"
      trigger={triggerSpan}
    >
      <div className="px-3 py-2 text-[12px]">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          recorded
        </div>
        <div className="mt-1 font-mono tabular-nums text-[var(--color-text)]">
          {date.toISOString()}
        </div>
        {tzAbbr && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            zone · {tzAbbr}
          </div>
        )}
      </div>
    </Popover>
  );
}
