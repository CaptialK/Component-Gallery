"use client";

import { EmptyState } from "@/components/_kit/empty-state";
import { mulberry32 } from "@/components/_kit/dot-noise";

/**
 * Empty state for "no encounters on record." Migrated 2026-05-05 to the
 * shared `<EmptyState>` primitive so this plate speaks the same vocabulary
 * as the SaaS empty surfaces.
 *
 * The illustration is a stippled empty chart-folder marked with a calendar
 * tick — replaces the prior EKG-fading-to-flat-line illustration, which
 * read uncomfortably close to asystole iconography for a hospital reader on
 * hour 11 (audit 2026-05-05).
 *
 * Copy choice: "No encounters on record." — not "No encounters yet." Empty
 * is a clinical state, not a "fine, nothing to do" state. The body copy
 * pushes the user to either start a charge or check that they have the
 * right patient (a deleted patient deep-link looks identical to a fresh
 * patient empty state, so the secondary action covers that).
 */

export default function NoEncountersYet() {
  return (
    <div className="grid h-full w-full place-items-center bg-[var(--color-bg)] px-6 py-12">
      <EmptyState
        illustration={<ChartFolderIllustration />}
        eyebrow="encounters"
        title="No encounters on record."
        body="This chart has nothing logged. Start an encounter to take vitals, write a note, or place an order — or open the patient finder if you may have the wrong record."
        action={{
          label: "Start an encounter",
          onClick: () => {},
          variant: "primary",
        }}
        secondary={
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-transparent px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] transition-[border-color,color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
          >
            Open patient finder
          </button>
        }
        align="center"
      />
    </div>
  );
}

/**
 * Stippled chart-folder illustration. A folder tab + body, marked with a
 * small calendar grid — "no entries yet, no dates filed." Built entirely
 * from dots, two-tone (walnut + Federal Blue accent on the calendar tick).
 *
 * Two design choices kept from the prior version:
 *  1. A sparse Bridson ground-shadow blob beneath the artefact, so the
 *     illustration has *weight* on the page rather than floating.
 *  2. Federal Blue accent on the meaningful punctuation (the calendar
 *     tick mark), echoing the gallery's "this is the moment that matters"
 *     vocabulary.
 */
function ChartFolderIllustration() {
  const W = 280;
  const H = 130;

  // Folder body: 200×100 centred, with a 60×14 tab on top-left.
  const fx = (W - 200) / 2;
  const fy = 18;
  const fw = 200;
  const fh = 96;
  const tabX = fx + 8;
  const tabY = fy - 12;
  const tabW = 64;
  const tabH = 12;

  const rng = mulberry32(7141);
  const edge: { x: number; y: number; ink: "ink" | "muted" }[] = [];

  // Stipple along the folder body's perimeter — same vocabulary as the
  // discharge-summary warning banner (perimeter dots, flat interior).
  const stepBody = 5.2;
  const insetBody = 1;
  for (let x = fx + insetBody; x <= fx + fw - insetBody; x += stepBody) {
    edge.push({ x, y: fy + insetBody, ink: "ink" });
    edge.push({ x, y: fy + fh - insetBody, ink: "ink" });
  }
  for (let y = fy + insetBody + stepBody; y < fy + fh - insetBody; y += stepBody) {
    edge.push({ x: fx + insetBody, y, ink: "ink" });
    edge.push({ x: fx + fw - insetBody, y, ink: "ink" });
  }
  // Folder tab perimeter
  const stepTab = 4.0;
  for (let x = tabX; x <= tabX + tabW; x += stepTab) {
    edge.push({ x, y: tabY, ink: "muted" });
    edge.push({ x, y: tabY + tabH, ink: "muted" });
  }
  for (let y = tabY + stepTab; y < tabY + tabH; y += stepTab) {
    edge.push({ x: tabX, y, ink: "muted" });
    edge.push({ x: tabX + tabW, y, ink: "muted" });
  }

  // Calendar grid centred in the folder body — 4×3 cells.
  const calX = fx + fw / 2 - 32;
  const calY = fy + 26;
  const calCell = 14;
  const calCols = 4;
  const calRows = 3;
  const calDots: { x: number; y: number; r: number; ink: "ink" | "accent" | "muted" }[] = [];
  // Header rule
  for (let x = 0; x < calCols * calCell; x += 3.6) {
    calDots.push({ x: calX + x, y: calY - 4, r: 0.55, ink: "muted" });
  }
  // Cell ticks (one tiny dot per cell; one Federal Blue accent on the
  // "today" cell at row 1, col 2 — the calendar still works as a
  // navigation primitive even when nothing's filed yet).
  for (let r = 0; r < calRows; r++) {
    for (let c = 0; c < calCols; c++) {
      const cx = calX + c * calCell + calCell / 2;
      const cy = calY + r * calCell + calCell / 2;
      const isToday = r === 1 && c === 2;
      calDots.push({
        x: cx,
        y: cy,
        r: isToday ? 1.4 : 0.6,
        ink: isToday ? "accent" : "muted",
      });
    }
  }
  // Two faint horizontal "would-be entry" rules below the calendar.
  const rules: { x: number; y: number }[] = [];
  for (let i = 0; i < 2; i++) {
    const y = fy + 78 + i * 8;
    for (let x = fx + 22; x < fx + fw - 22; x += 3.4) {
      rules.push({ x, y });
    }
  }

  // Ground shadow.
  const shadow: { x: number; y: number }[] = [];
  for (let i = 0; i < 90; i++) {
    const x = rng() * W;
    const t = (x - W / 2) / (W / 2);
    const keep = Math.max(0.05, 1 - Math.abs(t));
    if (rng() > keep * 0.4) continue;
    const dy = (rng() - 0.5) * 6;
    shadow.push({ x, y: fy + fh + 12 + dy });
  }

  return (
    <svg
      role="img"
      aria-label="Stippled empty chart folder marked with a calendar; no entries filed"
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full max-w-[300px]"
    >
      {/* Ground shadow */}
      {shadow.map((d, i) => (
        <circle key={`s-${i}`} cx={d.x} cy={d.y} r={0.7} fill="var(--color-text)" opacity={0.16} />
      ))}

      {/* Folder perimeter — dots-on-edge */}
      {edge.map((d, i) => (
        <circle
          key={`e-${i}`}
          cx={d.x}
          cy={d.y}
          r={d.ink === "ink" ? 0.85 : 0.7}
          fill={d.ink === "ink" ? "var(--color-text)" : "var(--color-text-muted)"}
          opacity={d.ink === "ink" ? 0.78 : 0.6}
        />
      ))}

      {/* Calendar dots */}
      {calDots.map((d, i) => (
        <circle
          key={`c-${i}`}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill={
            d.ink === "accent"
              ? "var(--color-accent-2)"
              : d.ink === "muted"
                ? "var(--color-text-muted)"
                : "var(--color-text)"
          }
          opacity={d.ink === "muted" ? 0.7 : 1}
        />
      ))}

      {/* "Would-be entry" rule dots */}
      {rules.map((d, i) => (
        <circle key={`r-${i}`} cx={d.x} cy={d.y} r={0.55} fill="var(--color-text-muted)" opacity={0.45} />
      ))}
    </svg>
  );
}
