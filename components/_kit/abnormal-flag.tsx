import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * AbnormalFlag — the load-bearing icon + letter + colour triad for clinical
 * abnormal state. NEVER colour alone. Every flag carries (a) a shape glyph,
 * (b) a mono-caps letter mark, and (c) tinted persimmon ink. A colourblind
 * reader still gets the severity from the shape + letter pair.
 *
 * Severity vocabulary maps to the standard lab/MAR conventions:
 *   - low / high          → triangle, "L" / "H", persimmon
 *   - critical-low/-high  → filled triangle/diamond, "LL" / "HH", deeper persimmon
 *   - high-alert          → square, "!", walnut + persimmon ring (med safety)
 *   - panic               → filled circle, "‼", deepest persimmon
 *
 * Pure server component — no state, no interactivity. Shape glyphs are inline
 * SVG so they ship with the row.
 */

export type AbnormalSeverity =
  | "low"
  | "high"
  | "critical-low"
  | "critical-high"
  | "high-alert"
  | "panic";

export type AbnormalFlagProps = {
  severity: AbnormalSeverity;
  /** Optional clinician-facing reason ("K 3.3, replete"). Shown in aria-label. */
  reason?: string;
  size?: "sm" | "md";
  className?: string;
};

const LETTER: Record<AbnormalSeverity, string> = {
  low: "L",
  high: "H",
  "critical-low": "LL",
  "critical-high": "HH",
  "high-alert": "!",
  panic: "‼", // ‼
};

const HUMAN: Record<AbnormalSeverity, string> = {
  low: "Low",
  high: "High",
  "critical-low": "Critically low",
  "critical-high": "Critically high",
  "high-alert": "High-alert medication",
  panic: "Panic value",
};

/**
 * Severity → (ink, ringInk) on cream paper.
 *
 *  - low/high: persimmon at full strength.
 *  - critical-*: persimmon mixed 18% toward black for a deeper, "more clinical"
 *    ink while staying inside the OKLCH chroma envelope.
 *  - high-alert: walnut letter + persimmon ring (the high-alert pharmacy
 *    convention; the body ink is the same as the surrounding medication name,
 *    the ring carries the warning).
 *  - panic: persimmon mixed 28% toward black; the deepest mark, used only on
 *    panic-criteria lab values that *must* be called.
 *
 * Verified against persimmon-on-cream contrast in app/globals.css; persimmon
 * is `oklch(58% 0.14 45)` on cream `oklch(96.5% 0.012 85)` which clears
 * WCAG AA 4.5:1 by inspection of the L delta.
 */
function inkOf(severity: AbnormalSeverity): { ink: string; ring?: string } {
  switch (severity) {
    case "low":
    case "high":
      return { ink: "var(--color-accent)" };
    case "critical-low":
    case "critical-high":
      return {
        ink: "color-mix(in oklch, var(--color-accent) 82%, #000 18%)",
      };
    case "high-alert":
      return {
        ink: "var(--color-text)",
        ring: "var(--color-accent)",
      };
    case "panic":
      return {
        ink: "color-mix(in oklch, var(--color-accent) 72%, #000 28%)",
      };
  }
}

/**
 * Shape glyph for the leading mark. Sized to sit on a 9-square baseline so the
 * inline-flex row aligns with the mono-caps letter. Filled vs outline is part
 * of the encoding — outline = abnormal, filled = critical.
 */
function ShapeGlyph({
  severity,
  px,
  ink,
  ring,
}: {
  severity: AbnormalSeverity;
  px: number;
  ink: string;
  ring?: string;
}) {
  const half = px / 2;
  // Triangle pointing up (high) or down (low / critical-low).
  const upTri = `M ${half} 1 L ${px - 1} ${px - 1} L 1 ${px - 1} Z`;
  const downTri = `M 1 1 L ${px - 1} 1 L ${half} ${px - 1} Z`;

  if (severity === "low") {
    return (
      <svg
        aria-hidden
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        className="block"
      >
        <path d={downTri} fill="none" stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    );
  }
  if (severity === "high") {
    return (
      <svg
        aria-hidden
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        className="block"
      >
        <path d={upTri} fill="none" stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    );
  }
  if (severity === "critical-low") {
    return (
      <svg
        aria-hidden
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        className="block"
      >
        <path d={downTri} fill={ink} />
      </svg>
    );
  }
  if (severity === "critical-high") {
    // Filled diamond for critical-high — deliberately distinct from
    // critical-low's filled triangle so a quick scan disambiguates.
    return (
      <svg
        aria-hidden
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        className="block"
      >
        <path
          d={`M ${half} 1 L ${px - 1} ${half} L ${half} ${px - 1} L 1 ${half} Z`}
          fill={ink}
        />
      </svg>
    );
  }
  if (severity === "high-alert") {
    // Square outline with persimmon ring — the pharmacy "high-alert" rubber-stamp.
    return (
      <svg
        aria-hidden
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        className="block"
      >
        <rect
          x={1}
          y={1}
          width={px - 2}
          height={px - 2}
          fill="none"
          stroke={ring ?? ink}
          strokeWidth={1.4}
        />
      </svg>
    );
  }
  // panic — filled circle, deepest persimmon
  return (
    <svg
      aria-hidden
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      className="block"
    >
      <circle cx={half} cy={half} r={half - 1} fill={ink} />
    </svg>
  );
}

export function AbnormalFlag({
  severity,
  reason,
  size = "sm",
  className,
}: AbnormalFlagProps) {
  const { ink, ring } = inkOf(severity);
  const letterPx = size === "md" ? 12 : 10;
  const shapePx = size === "md" ? 9 : 8;
  const ariaLabel = reason
    ? `${HUMAN[severity]}, ${reason}`
    : HUMAN[severity];

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 leading-none",
        className,
      )}
      style={{ color: ink }}
    >
      <ShapeGlyph severity={severity} px={shapePx} ink={ink} ring={ring} />
      <span
        aria-hidden
        className="font-mono uppercase tracking-[0.08em]"
        style={{
          fontSize: `${letterPx}px`,
          fontVariationSettings: '"wght" 500',
        }}
      >
        {LETTER[severity]}
      </span>
    </span>
  );
}
