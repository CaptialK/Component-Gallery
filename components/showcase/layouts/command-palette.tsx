"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ErrorState } from "@/components/_kit/error-state";
import { useToast } from "@/components/_kit/toast";
import { cn } from "@/lib/cn";

/**
 * Command palette plate — open by default for the canonical specimen pose.
 *
 * Interactivity pass:
 *  - Search input is controlled. Subsequence fuzzy match across each row's
 *    label + hint. Score = prefix-match + consecutive-character bonus +
 *    recency tier (Recents only). Rows re-rank within their group; groups
 *    that fall to zero matches hide. Selection clamps to first valid row.
 *  - Empty-results state replaces the result list with a Fraunces italic
 *    "Nothing matches `query`." headline. 120ms ease-out cross-fade.
 *  - Pages → toast "Opened: <title>". Actions → toast "Fired: <title>".
 *    Recents → toast "Opened: <title>". Closes on select.
 *  - Local ⌘K toggles the plate's open state. The plate stays rendered
 *    open by default (initial state) so the snap captures the canonical
 *    pose; ⌘K is plate-scoped — see plate doc on provider-coupling.
 *
 * Provider-coupling note: the site has its own navigational ⌘K palette
 * (`components/_kit/command-palette.tsx`). Conflating the showcase plate
 * with that provider would couple the *specimen* to a singleton — a snap
 * of the plate would race against whichever palette opened first. The
 * plate stays self-contained; its ⌘K is local, only firing while the
 * plate is mounted (the showcase route).
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

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const INITIAL_QUERY = "invoic";

type Selection = { groupIdx: number; rowIdx: number };

/**
 * Subsequence fuzzy match. Returns null if the haystack doesn't contain
 * `needle` as a subsequence; otherwise a score that prefers prefix
 * matches and consecutive character runs.
 */
function fuzzyScore(haystack: string, needle: string): number | null {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (!n) return 0;
  let hi = 0;
  let ni = 0;
  let score = 0;
  let consecutive = 0;
  let firstHit = -1;
  while (hi < h.length && ni < n.length) {
    if (h[hi] === n[ni]) {
      if (firstHit === -1) firstHit = hi;
      consecutive += 1;
      score += 1 + consecutive * 2;
      ni += 1;
    } else {
      consecutive = 0;
    }
    hi += 1;
  }
  if (ni < n.length) return null;
  // Prefix bonus
  if (firstHit === 0) score += 10;
  else if (firstHit > 0 && h[firstHit - 1] === " ") score += 4;
  return score;
}

function rankRow(row: ResultRow, query: string, isRecents: boolean): number | null {
  const labelScore = fuzzyScore(row.label, query);
  const hintScore = row.hint ? fuzzyScore(row.hint, query) : null;
  if (labelScore === null && hintScore === null) return null;
  let s = (labelScore ?? 0) * 1.5 + (hintScore ?? 0) * 0.6;
  if (isRecents && row.recency !== undefined) {
    s += row.recency * 6;
  }
  return s;
}

function filterAndRank(query: string): ResultGroup[] {
  if (!query.trim()) return GROUPS;
  return GROUPS.map((g) => {
    const ranked = g.rows
      .map((row) => ({ row, score: rankRow(row, query, Boolean(g.showRecents)) }))
      .filter((x): x is { row: ResultRow; score: number } => x.score !== null)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.row);
    return { ...g, rows: ranked };
  }).filter((g) => g.rows.length > 0);
}

function moveSelection(
  groups: ResultGroup[],
  sel: Selection,
  delta: number,
): Selection {
  if (groups.length === 0) return sel;
  let { groupIdx, rowIdx } = sel;
  if (groupIdx >= groups.length) {
    groupIdx = 0;
    rowIdx = 0;
  }
  if (rowIdx >= groups[groupIdx].rows.length) {
    rowIdx = 0;
  }
  let remaining = delta;
  while (remaining !== 0) {
    if (remaining > 0) {
      if (rowIdx + 1 < groups[groupIdx].rows.length) {
        rowIdx += 1;
      } else if (groupIdx + 1 < groups.length) {
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
        rowIdx = groups[groupIdx].rows.length - 1;
      } else {
        return { groupIdx, rowIdx };
      }
      remaining += 1;
    }
  }
  return { groupIdx, rowIdx };
}

export default function CommandPalette() {
  // Plate-local open. Initial: open (canonical specimen pose).
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [selection, setSelection] = useState<Selection>({ groupIdx: 0, rowIdx: 1 });
  const [flashing, setFlashing] = useState(false);
  const [scrimIn, setScrimIn] = useState(false);
  const [dialogIn, setDialogIn] = useState(false);
  // Live-pulse "searching" indicator. With local data it never shows; left
  // here so a real-API swap can flip it on while a request is in flight.
  const [searching] = useState(false);
  // Simulated transport error — when on, replaces the result list with a
  // single ErrorState. `retry` clears it. Wired through but defaults off
  // so the canonical specimen pose still shows results.
  const [searchError, setSearchError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const groups = useMemo(() => filterAndRank(query), [query]);
  const totalResults = useMemo(
    () => groups.reduce((acc, g) => acc + g.rows.length, 0),
    [groups],
  );

  // Clamp selection when results change.
  useEffect(() => {
    if (groups.length === 0) return;
    setSelection((s) => {
      let g = s.groupIdx;
      let r = s.rowIdx;
      if (g >= groups.length) g = 0;
      if (r >= groups[g].rows.length) r = 0;
      return { groupIdx: g, rowIdx: r };
    });
  }, [groups]);

  // Body scroll lock while palette is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Scroll selected row into view on selection change.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-selected="true"]`,
    );
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selection]);

  // Reveal animation — initial open only.
  useEffect(() => {
    if (!open) return;
    setScrimIn(false);
    setDialogIn(false);
    const t1 = window.setTimeout(() => setScrimIn(true), 0);
    const t2 = window.setTimeout(() => setDialogIn(true), 80);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open]);

  const fire = useCallback(
    (group: ResultGroup, row: ResultRow) => {
      const verb =
        group.heading === "Actions"
          ? "Fired"
          : group.heading === "Recents"
            ? "Opened"
            : "Opened";
      setFlashing(true);
      window.setTimeout(() => {
        setFlashing(false);
        // Reverse the open animation.
        setDialogIn(false);
        setScrimIn(false);
        window.setTimeout(() => {
          setOpen(false);
          toast({ title: `${verb}: ${row.label}` });
        }, 200);
      }, 160);
    },
    [toast],
  );

  const selectCurrent = useCallback(() => {
    const g = groups[selection.groupIdx];
    if (!g) return;
    const row = g.rows[selection.rowIdx];
    if (!row) return;
    fire(g, row);
  }, [groups, selection, fire]);

  // Keyboard handling — when the plate is open, ⌘K toggles closed; when
  // closed, ⌘K reopens. Esc closes. ↑↓ traverses; Enter fires.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelection((s) => moveSelection(groups, s, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelection((s) => moveSelection(groups, s, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectCurrent();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, groups, selectCurrent]);

  return (
    <div className="relative grid h-full w-full overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <DimmedAppFrame />

      {open && (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            onClick={() => setOpen(false)}
            style={{
              background:
                "color-mix(in oklch, var(--color-bg) 78%, transparent)",
              opacity: scrimIn ? 1 : 0,
              transition: "opacity 200ms ease-out",
            }}
          />

          <div className="absolute inset-0 grid place-items-start justify-center pt-8 sm:pt-16">
            <div
              role="dialog"
              aria-label="Command palette"
              aria-describedby="palette-help"
              className={cn(
                "overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)]",
                // Below 540px: 90vw with internal density tightened.
                "w-[90vw] max-w-[480px]",
              )}
              style={{
                boxShadow:
                  "0 18px 42px -18px color-mix(in oklch, var(--color-text) 40%, transparent), 0 2px 6px -2px color-mix(in oklch, var(--color-text) 28%, transparent)",
                opacity: dialogIn ? 1 : 0,
                transform: dialogIn ? "translateY(0)" : "translateY(4px)",
                transition: `opacity 320ms ${PAPER_EASE}, transform 320ms ${PAPER_EASE}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span id="palette-help" className="sr-only">
                Press Command-K to toggle, arrows to navigate, Enter to select,
                Escape to close.
              </span>
              <div className="border-b border-[var(--color-border)] px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Search pages, actions, members
              </div>
              <div className="flex h-10 items-center gap-2 border-b border-[var(--color-border)] px-3">
                <Search
                  size={12}
                  strokeWidth={1.6}
                  className="text-[var(--color-text-muted)]"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages, actions, members"
                  className="flex-1 bg-transparent text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                  data-focus-ring="off"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="palette-listbox"
                  aria-autocomplete="list"
                />
                {/* Live-pulse "searching" indicator at the right edge of
                    the input. With local data this never shows; with a
                    real query API it would tick on while requests are in
                    flight. */}
                {searching && (
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 animate-live-pulse rounded-full"
                    style={{ background: "var(--color-accent-2)" }}
                  />
                )}
                <kbd className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                  esc
                </kbd>
              </div>

              <div
                ref={listRef}
                id="palette-listbox"
                role="listbox"
                aria-label="Search results"
                className="py-1 max-h-[60vh] overflow-y-auto"
              >
                {searchError ? (
                  <div className="px-3 py-3">
                    <ErrorState
                      variant="inline"
                      title="Search unavailable."
                      onRetry={() => setSearchError(false)}
                    />
                  </div>
                ) : groups.length === 0 ? (
                  <EmptyResults query={query} />
                ) : (
                  groups.map((g, gi) => (
                    <Section
                      key={g.heading}
                      group={g}
                      groupIdx={gi}
                      selection={selection}
                      onSelect={setSelection}
                      onFire={(row) => fire(g, row)}
                      flashing={flashing}
                    />
                  ))
                )}
              </div>

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
                  <span>{totalResults} results</span>
                  <span aria-hidden>·</span>
                  <span className="text-[var(--color-text)]">⌘K</span>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyResults({ query }: { query: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="px-4 py-6 text-center"
      style={{
        opacity: shown ? 1 : 0,
        transition: "opacity 120ms ease-out",
      }}
    >
      <p
        className="font-display text-[15px] italic text-[var(--color-text)]"
        style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
      >
        Nothing matches{" "}
        <span className="not-italic font-mono text-[12px]">{`\`${query}\``}</span>.
      </p>
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        Try Pages, Actions, or Members.
      </p>
    </div>
  );
}

function Section({
  group,
  groupIdx,
  selection,
  onSelect,
  onFire,
  flashing,
}: {
  group: ResultGroup;
  groupIdx: number;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onFire: (row: ResultRow) => void;
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
              key={`${group.heading}-${row.label}-${i}`}
              row={row}
              showRecents={group.showRecents}
              selected={selected}
              flashing={flashing && selected}
              onSelect={() => onSelect({ groupIdx, rowIdx: i })}
              onFire={() => onFire(row)}
            />
          );
        })}
      </ul>
    </div>
  );
}

function RecencyLegend() {
  // Quiet 200ms paper-ease fade-in on first appearance.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(true), 80);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
      style={{
        opacity: shown ? 1 : 0,
        transition: `opacity 200ms ${PAPER_EASE}`,
      }}
    >
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
  onFire,
}: {
  row: ResultRow;
  showRecents?: boolean;
  selected: boolean;
  flashing: boolean;
  onSelect: () => void;
  onFire: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const bg = selected
    ? flashing
      ? "color-mix(in oklch, var(--color-accent-2) 18%, transparent)"
      : "color-mix(in oklch, var(--color-accent-2) 8%, transparent)"
    : "transparent";

  return (
    <li className="relative" role="option" aria-selected={selected} data-selected={selected ? "true" : "false"}>
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 w-[2px] origin-center rounded-[var(--radius-xs)] bg-[var(--color-accent-2)]"
        style={{
          opacity: selected ? 1 : hovered ? 0.3 : 0,
          transform: selected ? "scaleY(1)" : "scaleY(0.6)",
          transition: "opacity 120ms ease-out, transform 120ms ease-out",
        }}
      />
      <button
        type="button"
        onClick={() => {
          onSelect();
          onFire();
        }}
        onMouseEnter={() => {
          setHovered(true);
          onSelect();
        }}
        onMouseLeave={() => setHovered(false)}
        data-focus-ring="off"
        className={cn(
          // h-7 (28px) on small viewports; h-8 (32px) above 540px.
          "flex h-7 sm:h-8 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 text-left text-[13px] text-[var(--color-text)]",
        )}
        style={{
          backgroundColor: bg,
          transition: "background-color 120ms ease-out",
        }}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center text-[var(--color-text-muted)]">
          {row.glyph === "letter" ? (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[11px] text-[var(--color-text)] ring-1 ring-[var(--color-border)]">
              {row.letter}
            </span>
          ) : (
            <row.glyph size={12} strokeWidth={1.6} />
          )}
        </span>

        <div className="min-w-0 flex-1 truncate">
          <span className="text-[var(--color-text)]">{row.label}</span>
          {row.hint && (
            <span className="ml-2 text-[var(--color-text-muted)]">{row.hint}</span>
          )}
        </div>

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
  const slots = 5;
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

function DimmedAppFrame() {
  return (
    <div aria-hidden className="absolute inset-0 grid grid-cols-[180px_1fr]">
      <div className="border-r border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <div className="flex items-center gap-2">
          <span
            className="grid h-5 w-5 place-items-center rounded-[var(--radius-xs)] bg-[var(--color-bg)] ring-1 ring-[var(--color-border-strong)] font-display italic text-[12px]"
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
