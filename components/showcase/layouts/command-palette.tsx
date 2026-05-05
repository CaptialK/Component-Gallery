"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Folder,
  GitBranch,
  Hash,
  Inbox,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * REGISTRY:
 * {
 *   domain: "saas",
 *   category: "layouts",
 *   slug: "command-palette",
 *   title: "Command palette",
 *   filename: "command-palette.tsx",
 *   description: "Open palette modal floating over a softly-dimmed app frame. Grouped results — Pages, Actions, Recents — each row shows glyph, label, and a mono shortcut keycap. Selected row uses a left accent strip plus faint surface, never bg-lighten.",
 *   layout: "specimen",
 *   aspectRatio: "16 / 10",
 *   maxWidth: 880,
 *   firstImpression: "2026-05-04",
 * }
 */

/**
 * Command palette — open state over a dimmed app frame.
 *
 * The plate captures the modal in its open state: a faint suggestion of
 * sidebar / topbar / content beneath, a backdrop scrim that softens but
 * doesn't blur, then the palette floating above. Search input at the top
 * with a single hairline caret. Three result groups (Pages · Actions ·
 * Recents) — each section head is Fraunces italic small-caps, sized small.
 *
 * Encoding:
 *   - Selected row: left-edge accent strip (Federal Blue, 2px) + faint
 *     surface bg. Never bg-lighten alone — the strip carries the state.
 *   - Recents rail right-gutter: an ascending dot trail encodes recency
 *     (more dots = more recent). Punctuation, not density.
 *   - Keycaps: Geist Mono, on a hairline-bordered chip. Multi-key combos
 *     join with a thin separator dot.
 *
 * Interactivity (interactivity pass, 2026-05-04):
 *   - Selection lifts to useState; arrow keys ↑↓ traverse rows across
 *     groups (skipping section headings/legends), Enter "fires" a no-op
 *     visual flash, click selects. Initial selection: Pages / row 1
 *     ("Invoicing schema overhaul"), the canonical frozen pose.
 *   - Selection animates: 120ms ease-out on the left accent strip
 *     (opacity + scaleY 0.6 → 1, transform only) plus 120ms ease-out
 *     background-color.
 *   - Hover on a non-selected row flashes a 30%-opacity preview strip
 *     for 120ms ease-out. Doesn't conflict with the selected full-strip.
 *   - Modal reveals on first mount: dialog opacity 0→1 + translateY(4px)→0
 *     over 320ms paper-ease; backdrop scrim opacity 0→1 over 200ms,
 *     leading the dialog by ~80ms. Fires once per mount.
 *
 * Search filtering is intentionally NOT implemented — the input is a
 * frozen "invoic" pose. Specimen, not working app.
 *
 * Client component — selection + keyboard + reveal animations.
 */

type ResultRow = {
  glyph: typeof Folder | "letter";
  letter?: string;
  label: string;
  hint?: string;
  shortcut?: string[];
  /** 0..1 recency for the Recents trail (1 = just now). */
  recency?: number;
};

type ResultGroup = {
  heading: string;
  rows: ResultRow[];
  showRecents?: boolean;
};

const GROUPS: ResultGroup[] = [
  {
    heading: "Pages",
    rows: [
      {
        glyph: Folder,
        label: "stipple-press",
        hint: "Workspace overview",
        shortcut: ["G", "P"],
      },
      {
        glyph: FileText,
        label: "Invoicing schema overhaul",
        hint: "DOC-9241 · Mara Reyes",
        shortcut: ["⏎"],
      },
      {
        glyph: Hash,
        label: "#engineering",
        hint: "Channel · 142 unread",
      },
    ],
  },
  {
    heading: "Actions",
    rows: [
      {
        glyph: Plus,
        label: "New document",
        hint: "Inside current folder",
        shortcut: ["⌘", "N"],
      },
      {
        glyph: GitBranch,
        label: "Switch branch…",
        hint: "main · 3 ahead",
        shortcut: ["⌘", "B"],
      },
      {
        glyph: Users,
        label: "Invite to workspace",
        shortcut: ["⌘", "I"],
      },
      {
        glyph: Settings,
        label: "Workspace settings",
        shortcut: ["⌘", ","],
      },
    ],
  },
  {
    heading: "Recents",
    showRecents: true,
    rows: [
      {
        glyph: "letter",
        letter: "M",
        label: "Mara Reyes",
        hint: "viewed 2m ago",
        recency: 0.95,
      },
      {
        glyph: FileText,
        label: "Q3 retention deep dive",
        hint: "viewed 18m ago",
        recency: 0.78,
      },
      {
        glyph: Inbox,
        label: "Inbox · in review",
        hint: "viewed 1h ago",
        recency: 0.5,
      },
      {
        glyph: FileText,
        label: "Pricing experiment kickoff",
        hint: "viewed 3h ago",
        recency: 0.18,
      },
    ],
  },
];

const TOTAL_RESULTS = GROUPS.flatMap((g) => g.rows).length;

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

type Selection = { groupIdx: number; rowIdx: number };

/** Move the selection by `delta` rows, traversing across groups. Section
 *  headings and the recency legend aren't selectable — they sit between
 *  groups, not inside them — so traversal is row-by-row only. Stops at
 *  the first/last row (no wrap). */
function moveSelection(sel: Selection, delta: number): Selection {
  let { groupIdx, rowIdx } = sel;
  let remaining = delta;
  while (remaining !== 0) {
    if (remaining > 0) {
      if (rowIdx + 1 < GROUPS[groupIdx].rows.length) {
        rowIdx += 1;
      } else if (groupIdx + 1 < GROUPS.length) {
        groupIdx += 1;
        rowIdx = 0;
      } else {
        return { groupIdx, rowIdx };
      }
      remaining -= 1;
    } else {
      if (rowIdx - 1 >= 0) {
        rowIdx -= 1;
      } else if (groupIdx - 1 >= 0) {
        groupIdx -= 1;
        rowIdx = GROUPS[groupIdx].rows.length - 1;
      } else {
        return { groupIdx, rowIdx };
      }
      remaining += 1;
    }
  }
  return { groupIdx, rowIdx };
}

export default function CommandPalette() {
  // Initial selection — Pages / row 1 ("Invoicing schema overhaul"). This
  // is the canonical frozen pose the plate has always opened in.
  const [selection, setSelection] = useState<Selection>({ groupIdx: 0, rowIdx: 1 });
  // Brief visual flash on Enter — the palette is a specimen, so the action
  // itself is a no-op; we just acknowledge the keypress.
  const [flashing, setFlashing] = useState(false);
  // Reveal gates — fire once per mount.
  const [scrimIn, setScrimIn] = useState(false);
  const [dialogIn, setDialogIn] = useState(false);

  useEffect(() => {
    // Backdrop leads the dialog by ~80ms. Two staggered raf-ish timers via
    // setTimeout — no need for double rAF since we just want the initial
    // paint to land at opacity 0, then transition in.
    const t1 = window.setTimeout(() => setScrimIn(true), 0);
    const t2 = window.setTimeout(() => setDialogIn(true), 80);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelection((s) => moveSelection(s, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelection((s) => moveSelection(s, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        setFlashing(true);
        window.setTimeout(() => setFlashing(false), 160);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative grid h-full w-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* App frame underneath — at full opacity. The scrim (next layer) is
          the only dim mechanism, theme-tokenized so it darkens light mode and
          lightens dark mode by mixing toward bg. Compounding opacity + scrim
          collapsed the frame in dark mode, so we picked the scrim path. */}
      <DimmedAppFrame />

      {/* Scrim — softly tints the frame so the palette reads as elevated.
          Reveals via opacity 0 → 1 over 200ms ease-out on first mount,
          leading the dialog by ~80ms. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "color-mix(in oklch, var(--color-bg) 78%, transparent)",
          opacity: scrimIn ? 1 : 0,
          transition: "opacity 200ms ease-out",
        }}
      />

      {/* Palette */}
      <div className="absolute inset-0 grid place-items-start justify-center pt-16">
        <div
          role="dialog"
          aria-label="Command palette"
          className="w-[480px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)]"
          style={{
            boxShadow:
              "0 18px 42px -18px color-mix(in oklch, var(--color-text) 40%, transparent), 0 2px 6px -2px color-mix(in oklch, var(--color-text) 28%, transparent)",
            opacity: dialogIn ? 1 : 0,
            transform: dialogIn ? "translateY(0)" : "translateY(4px)",
            transition: `opacity 320ms ${PAPER_EASE}, transform 320ms ${PAPER_EASE}`,
          }}
        >
          {/* Search hint caption — replaces the old italic ghost-text remainder
              that misread as autocomplete. Sits above the input as a label. */}
          <div className="border-b border-[var(--color-border)] px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Search pages, actions, members
          </div>
          {/* Search input */}
          <div className="flex h-10 items-center gap-2 border-b border-[var(--color-border)] px-3">
            <Search
              size={12}
              strokeWidth={1.6}
              className="text-[var(--color-text-muted)]"
            />
            <div className="flex flex-1 items-center text-[14px] text-[var(--color-text)]">
              <span>invoic</span>
              <span
                aria-hidden
                className="ml-px inline-block h-3 w-px translate-y-[1px] animate-caret-blink bg-[var(--color-accent-2)]"
              />
              {/* faint trailing fade — a soft right-side gradient on the input
                  edge replaces the literal placeholder remainder. */}
              <span
                aria-hidden
                className="pointer-events-none ml-2 h-3 flex-1"
                style={{
                  background:
                    "linear-gradient(to right, color-mix(in oklch, var(--color-text) 8%, transparent) 0%, transparent 60%)",
                }}
              />
            </div>
            <kbd className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
              esc
            </kbd>
          </div>

          {/* Result list — content-sized; the legend asserts a fifth recency
              tier so the bottom row must always render. */}
          <div className="py-1">
            {GROUPS.map((g, gi) => (
              <Section
                key={g.heading}
                group={g}
                groupIdx={gi}
                selection={selection}
                onSelect={setSelection}
                flashing={flashing}
              />
            ))}
          </div>

          {/* Footer rail — keyboard hints */}
          <div className="flex h-8 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-2">
              <kbd className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5">
                ↑↓
              </kbd>
              <span>navigate</span>
              <kbd className="ml-2 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-0.5">
                ⏎
              </kbd>
              <span>open</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span>{TOTAL_RESULTS} results</span>
              <span aria-hidden>·</span>
              <span className="text-[var(--color-text)]">⌘K</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  group,
  groupIdx,
  selection,
  onSelect,
  flashing,
}: {
  group: ResultGroup;
  groupIdx: number;
  selection: Selection;
  onSelect: (s: Selection) => void;
  flashing: boolean;
}) {
  return (
    <div className="px-1.5 py-1">
      <div className="flex items-center justify-between gap-3 px-3 pb-1 pt-1.5">
        <div
          className="font-display text-[10px] uppercase italic text-[var(--color-text-muted)]"
          style={{
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
            letterSpacing: "0.18em",
          }}
        >
          {group.heading}
        </div>
        {group.showRecents && <RecencyLegend />}
      </div>
      <ul>
        {group.rows.map((row, i) => {
          const selected =
            selection.groupIdx === groupIdx && selection.rowIdx === i;
          return (
            <Row
              key={i}
              row={row}
              showRecents={group.showRecents}
              selected={selected}
              flashing={flashing && selected}
              onSelect={() => onSelect({ groupIdx, rowIdx: i })}
            />
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Inline legend for the recents recency trail. Mirrors the encoding so a
 * reader doesn't have to infer "what does the blue dot mean."
 */
function RecencyLegend() {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
      <span>trail</span>
      <span aria-hidden className="flex items-center gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="block h-1 w-1 rounded-full"
            style={{ boxShadow: "inset 0 0 0 1px var(--color-border)" }}
          />
        ))}
        <span
          className="block h-1 w-1 rounded-full"
          style={{ background: "var(--color-accent-2)" }}
        />
      </span>
      <span>most recent</span>
    </span>
  );
}

function Row({
  row,
  showRecents,
  selected,
  flashing,
  onSelect,
}: {
  row: ResultRow;
  showRecents?: boolean;
  selected: boolean;
  flashing: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  // Background color transitions independently. Selected has the accent
  // bg-mix; flashing briefly intensifies it as the Enter ack.
  const bg = selected
    ? flashing
      ? "color-mix(in oklch, var(--color-accent-2) 18%, transparent)"
      : "color-mix(in oklch, var(--color-accent-2) 8%, transparent)"
    : "transparent";

  return (
    <li className="relative">
      {/* Left accent strip. Selected = full strip (opacity 1, scaleY 1).
          Hover preview on non-selected = 30% opacity. Both transitions
          are 120ms ease-out; transform-only on the strip itself. */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 w-[2px] origin-center rounded-[var(--radius-xs)] bg-[var(--color-accent-2)]"
        style={{
          opacity: selected ? 1 : hovered ? 0.3 : 0,
          transform: selected ? "scaleY(1)" : "scaleY(0.6)",
          transition:
            "opacity 120ms ease-out, transform 120ms ease-out",
        }}
      />
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        data-focus-ring="off"
        className={cn(
          "flex h-8 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 text-left text-[13px] text-[var(--color-text)]",
        )}
        style={{
          backgroundColor: bg,
          transition: "background-color 120ms ease-out",
        }}
      >
        {/* Glyph */}
        <span className="grid h-6 w-6 shrink-0 place-items-center text-[var(--color-text-muted)]">
          {row.glyph === "letter" ? (
            <span
              className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[11px] text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
            >
              {row.letter}
            </span>
          ) : (
            <row.glyph size={12} strokeWidth={1.6} />
          )}
        </span>

        {/* Label + hint */}
        <div className="min-w-0 flex-1 truncate">
          <span className="text-[var(--color-text)]">{row.label}</span>
          {row.hint && (
            <span className="ml-2 text-[var(--color-text-muted)]">{row.hint}</span>
          )}
        </div>

        {/* Right gutter — either recents trail or keycaps. Selected state is
            already carried by left strip + faint bg + the ⏎ keycap; no
            additional arrow affordance (would quadruple-encode). */}
        {showRecents && row.recency !== undefined ? (
          <RecencyTrail value={row.recency} />
        ) : row.shortcut ? (
          <Shortcut keys={row.shortcut} selected={selected} />
        ) : null}
      </button>
    </li>
  );
}

function Shortcut({
  keys,
  selected,
}: {
  keys: string[];
  selected?: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {keys.map((k, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && (
            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
              ·
            </span>
          )}
          <kbd
            className={cn(
              "rounded-[var(--radius-xs)] border bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px]",
              selected
                ? "border-[var(--color-border-strong)] text-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)]",
            )}
          >
            {k}
          </kbd>
        </span>
      ))}
    </span>
  );
}

function RecencyTrail({ value }: { value: number }) {
  // Five slots, ascending. Each slot is filled if recency >= threshold.
  // Reads as "tide marks" — most recent rows have the most dots filled.
  // The TERMINAL (rightmost lit) dot uses Federal Blue when recency ≥ 0.9
  // (the most-recent threshold). Walnut otherwise. Legend lives next to the
  // Recents section heading.
  const slots = 5;
  // Find the index of the rightmost filled dot (terminal). -1 if none.
  let terminal = -1;
  for (let i = 0; i < slots; i++) {
    const threshold = (i + 1) / slots;
    if (value >= threshold - 1e-6) terminal = i;
  }
  const isMostRecent = value >= 0.9;
  return (
    <span
      aria-label={`recency ${Math.round(value * 100)}%`}
      className="flex shrink-0 items-center gap-1"
    >
      {Array.from({ length: slots }).map((_, i) => {
        const threshold = (i + 1) / slots;
        const filled = value >= threshold - 1e-6;
        const accent = i === terminal && isMostRecent;
        return (
          <span
            key={i}
            aria-hidden
            className="block h-1 w-1 rounded-full"
            style={{
              background: filled
                ? accent
                  ? "var(--color-accent-2)"
                  : "var(--color-text)"
                : "transparent",
              boxShadow: filled
                ? undefined
                : "inset 0 0 0 1px var(--color-border)",
            }}
          />
        );
      })}
    </span>
  );
}

/**
 * The app frame beneath the palette. Sidebar + topbar + a couple of content
 * rows. Renders at full opacity; the scrim above (color-mix toward bg at
 * 78%) is what dims it so it reads as the world the palette opened over.
 * Theme-tokenized: darkens light mode, lightens dark mode.
 */
function DimmedAppFrame() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 grid grid-cols-[180px_1fr]"
    >
      {/* Sidebar */}
      <div className="border-r border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-[var(--radius-xs)] bg-[var(--color-bg)] ring-1 ring-[var(--color-border-strong)] font-display italic text-[12px]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            S
          </span>
          <span
            className="font-display italic text-[12px]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            stipple<span className="text-[var(--color-text-muted)]">.lab</span>
          </span>
        </div>
        <ul className="mt-4 space-y-1.5">
          {["Overview", "Inbox", "Documents", "Projects", "Members"].map((l) => (
            <li
              key={l}
              className="h-5 rounded-[var(--radius-sm)] px-2 text-[12px] leading-5 text-[var(--color-text-muted)]"
            >
              {l}
            </li>
          ))}
        </ul>
        <div className="mt-6 px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Projects
        </div>
        <ul className="mt-1.5 space-y-1.5">
          {["stipple-press", "atlas-billing", "north-warehouse"].map((p) => (
            <li
              key={p}
              className="flex items-center gap-2 px-2 font-mono text-[11px] text-[var(--color-text-muted)]"
            >
              <span className="h-1 w-1 rounded-full bg-[var(--color-text-muted)]" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-col">
        <div className="flex h-10 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 font-mono text-[11px] text-[var(--color-text-muted)]">
          <span>workspace</span>
          <span aria-hidden>/</span>
          <span className="text-[var(--color-text)]">stipple-press</span>
          <span aria-hidden>/</span>
          <span className="text-[var(--color-text)]">documents</span>
        </div>
        <div className="px-6 pt-6">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Recently active
          </div>
          <div
            className="mt-1 font-display italic text-[20px] leading-tight tracking-[-0.02em] text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            Documents
          </div>
          <div className="mt-4 grid gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid h-7 grid-cols-[120px_1fr_80px_60px] items-center gap-3 border-b border-[var(--color-border)] text-[11px]"
              >
                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                  DOC-9{200 + i * 7}
                </span>
                <span className="truncate text-[var(--color-text)]">
                  {[
                    "Invoicing schema overhaul",
                    "Onboarding email re-sequence",
                    "Q3 retention deep dive",
                    "Pricing experiment kickoff",
                    "API rate-limit migration plan",
                    "Outage retro: 04-29",
                  ][i]}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                  In review
                </span>
                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                  {i + 1}h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
