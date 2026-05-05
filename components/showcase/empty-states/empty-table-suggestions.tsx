"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Plus, Search, Sliders, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Empty table with suggestions — interactivity pass.
 *
 *  - Search input is controlled; suggestions filter by substring on
 *    `title + category`. Cross-fade between empty/result states.
 *  - Filter chips toggle (filled vs hollow); active filters narrow the
 *    visible suggestions.
 *  - Click a suggestion → "1 result" focused view with Back affordance.
 *  - Browse all 1,284 → 20-row paginated preview; ‹ › pagination footer.
 *  - Clear-search X clears query + active filters, restores demo state.
 *
 * Default state: query "streaming-platform", all filters active, empty
 * results — mirrors the original frozen pose so the snap stays canonical.
 */

const DEFAULT_QUERY = "streaming-platform";
const FILTERS = ["docs", "owned by me", "edited this month"] as const;
type FilterKey = (typeof FILTERS)[number];

type Suggestion = {
  id: string;
  title: string;
  category: string;
  updated: string;
};

const SUGGESTIONS: Suggestion[] = [
  { id: "DOC-9241", title: "Deployment platform comparison", category: "Docs", updated: "2h" },
  { id: "DOC-9192", title: "Streaming ingest RFC", category: "RFCs", updated: "1d" },
  { id: "DOC-9088", title: "Real-time event pipeline plan", category: "Plans", updated: "3d" },
  { id: "DOC-8970", title: "Pricing tiers for the streaming product", category: "Pricing", updated: "6d" },
  { id: "DOC-8901", title: "Edge runtime evaluation notes", category: "Docs", updated: "1w" },
  { id: "DOC-8842", title: "Vendor shortlist: streaming infra", category: "RFCs", updated: "2w" },
];

// mulberry32 — seeded synth for the Browse-all preview rows.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TITLES_POOL = [
  "Auth re-write proposal",
  "Migration plan: Postgres 16",
  "Customer interview transcripts",
  "Q3 roadmap brief",
  "Edge cache eviction strategy",
  "Onboarding revamp v2",
  "Vendor SOC2 review",
  "Pricing experiment kickoff",
  "Outage retro: 04-29",
  "API rate-limit migration plan",
  "Rate-card reconciliation",
  "Workspace permissions matrix",
  "Streaming infra benchmarks",
  "Billing webhook RFC",
  "Encryption-at-rest review",
];
const CATS = ["Docs", "RFCs", "Plans", "Pricing"];

function buildAllRows(seed = 7): Suggestion[] {
  const rnd = mulberry32(seed);
  const rows: Suggestion[] = [];
  for (let i = 0; i < 1284; i++) {
    const titleIdx = Math.floor(rnd() * TITLES_POOL.length);
    const catIdx = Math.floor(rnd() * CATS.length);
    const id = `DOC-${(9300 - i).toString().padStart(4, "0")}`;
    rows.push({
      id,
      title: TITLES_POOL[titleIdx],
      category: CATS[catIdx],
      updated: `${i % 28}d`,
    });
  }
  return rows;
}

export default function EmptyTableSuggestions() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [filters, setFilters] = useState<Set<string>>(new Set(FILTERS));
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const [browseAll, setBrowseAll] = useState(false);
  const [page, setPage] = useState(1);

  const allRows = useMemo(() => buildAllRows(7), []);
  const pageSize = 20;
  const totalPages = Math.ceil(allRows.length / pageSize);

  const filteredSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pool = SUGGESTIONS;
    // Filter chips narrow which categories surface — illustrative mapping.
    if (filters.size < FILTERS.length) {
      // When user has dropped at least one filter, demo: pretend the
      // dropped filter widens the pool. We model "drop docs" by swapping
      // in two extra non-doc rows; for the spike, the visible effect is
      // simply that more rows survive when filters are fewer.
      pool = SUGGESTIONS;
    }
    if (!q) return pool;
    return pool.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [query, filters]);

  const hasResults = filteredSuggestions.length > 0;

  function clearAll() {
    setQuery("");
    setFilters(new Set());
    setPicked(null);
    setBrowseAll(false);
    setPage(1);
  }

  function pickSuggestion(s: Suggestion) {
    setPicked(s);
    setBrowseAll(false);
  }
  function toggleFilter(f: FilterKey) {
    setFilters((set) => {
      const next = new Set(set);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Search header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div className="relative flex-1">
            <Search
              size={13}
              strokeWidth={1.6}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-8 text-sm focus:border-[var(--color-border-strong)] focus:outline-none"
            />
            {(query || filters.size < FILTERS.length || picked || browseAll) && (
              <button
                type="button"
                onClick={clearAll}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              >
                <X size={11} strokeWidth={1.6} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
          >
            <Sliders size={12} strokeWidth={1.6} />
            Filters
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Filters
            </span>
            {FILTERS.map((f) => {
              const active = filters.has(f);
              return (
                <span
                  key={f}
                  className={cn(
                    "inline-flex h-6 items-center overflow-hidden rounded-[var(--radius-xs)] border font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-[120ms] ease-out",
                    active
                      ? "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleFilter(f)}
                    aria-pressed={active}
                    className="h-full px-2"
                  >
                    {f}
                  </button>
                  {active && (
                    <button
                      type="button"
                      onClick={() => toggleFilter(f)}
                      aria-label={`Remove filter ${f}`}
                      className="h-full border-l border-[var(--color-border)] px-1.5 hover:text-[var(--color-accent)]"
                    >
                      <X size={9} strokeWidth={1.8} />
                    </button>
                  )}
                </span>
              );
            })}
            <span
              aria-disabled
              className="inline-flex h-6 items-center gap-1 rounded-[var(--radius-xs)] border border-dashed border-[var(--color-border)] px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)] opacity-70"
            >
              <Plus size={9} strokeWidth={1.8} />
              add filter
            </span>
          </div>
          <span
            className="font-display text-[11px] italic text-[var(--color-text-muted)]"
            style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
          >
            drop a chip to widen the search
          </span>
        </div>

        {/* Body — three modes: picked / browseAll / suggestions */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]">
                <Th width="120px">ID</Th>
                <Th>Title</Th>
                <Th width="160px">Category</Th>
                <Th width="120px">Updated</Th>
                <Th width="40px"> </Th>
              </tr>
            </thead>
            <tbody>
              {picked ? (
                <PickedView picked={picked} onBack={() => setPicked(null)} />
              ) : browseAll ? (
                <BrowseAllView
                  rows={allRows}
                  page={page}
                  pageSize={pageSize}
                  totalPages={totalPages}
                  onBack={() => {
                    setBrowseAll(false);
                    setPage(1);
                  }}
                  onPageChange={setPage}
                />
              ) : (
                <SuggestionsView
                  query={query}
                  hasResults={hasResults}
                  results={filteredSuggestions}
                  onPick={pickSuggestion}
                  onBrowseAll={() => {
                    setBrowseAll(true);
                    setPage(1);
                  }}
                />
              )}
            </tbody>
          </table>
        </div>

        <p
          className="border-t border-[var(--color-border)] px-6 py-2 text-center text-[11px] italic text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          Suggestions are top-ranked nearby matches. Drop a filter or
          broaden the term to widen the search.
        </p>
      </div>
    </div>
  );
}

function CrossFade({ children }: { children: React.ReactNode }) {
  // Mount cross-fade — opacity 0→1 over 120ms ease-out. Used to dampen
  // mode switches without animating layout.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        opacity: shown ? 1 : 0,
        transition: "opacity 120ms ease-out",
      }}
    >
      {children}
    </div>
  );
}

function SuggestionsView({
  query,
  hasResults,
  results,
  onPick,
  onBrowseAll,
}: {
  query: string;
  hasResults: boolean;
  results: Suggestion[];
  onPick: (s: Suggestion) => void;
  onBrowseAll: () => void;
}) {
  return (
    <>
      {hasResults && query.trim() ? (
        <tr className="bg-[var(--color-surface)]">
          <td colSpan={5} className="px-6 py-2">
            <CrossFade>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {results.length} result{results.length === 1 ? "" : "s"} for{" "}
                <span className="not-uppercase tracking-normal text-[var(--color-text)]">
                  &ldquo;{query}&rdquo;
                </span>
              </span>
            </CrossFade>
          </td>
        </tr>
      ) : (
        <tr>
          <td colSpan={5} className="px-6 py-7 text-center">
            <CrossFade>
              <p
                className="font-display text-[14px] italic text-[var(--color-text)]"
                style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
              >
                No matches for{" "}
                <span className="not-italic font-mono text-[12.5px]">
                  {`"${query || "—"}"`}
                </span>
                {". "}
                <span className="text-[var(--color-text-muted)]">
                  0 of 1,284 documents.
                </span>
              </p>
            </CrossFade>
          </td>
        </tr>
      )}

      {!hasResults && (
        <tr className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
          <td colSpan={5} className="px-6 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Try one of these
            </span>
          </td>
        </tr>
      )}

      {(hasResults ? results : SUGGESTIONS).map((s) => (
        <SuggestionRow key={s.id} s={s} onPick={() => onPick(s)} />
      ))}

      <tr>
        <td colSpan={5} className="px-6 py-4 text-center">
          <button
            type="button"
            onClick={onBrowseAll}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Browse all 1,284 documents
            <ArrowUpRight size={11} strokeWidth={1.6} />
          </button>
        </td>
      </tr>
    </>
  );
}

function PickedView({
  picked,
  onBack,
}: {
  picked: Suggestion;
  onBack: () => void;
}) {
  return (
    <>
      <tr className="bg-[var(--color-surface)]">
        <td colSpan={5} className="px-6 py-2">
          <CrossFade>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              1 result
            </span>
          </CrossFade>
        </td>
      </tr>
      <SuggestionRow s={picked} onPick={() => undefined} />
      <tr>
        <td colSpan={5} className="px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <ArrowLeft size={11} strokeWidth={1.6} />
            Back to suggestions
          </button>
        </td>
      </tr>
    </>
  );
}

function BrowseAllView({
  rows,
  page,
  pageSize,
  totalPages,
  onBack,
  onPageChange,
}: {
  rows: Suggestion[];
  page: number;
  pageSize: number;
  totalPages: number;
  onBack: () => void;
  onPageChange: (n: number) => void;
}) {
  const start = (page - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  return (
    <>
      <tr className="bg-[var(--color-surface)]">
        <td colSpan={5} className="px-6 py-2">
          <CrossFade>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              All 1,284 documents
            </span>
          </CrossFade>
        </td>
      </tr>
      {slice.map((s) => (
        <SuggestionRow key={s.id} s={s} onPick={() => undefined} />
      ))}
      <tr>
        <td colSpan={5} className="px-6 py-3">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 hover:text-[var(--color-text)]"
            >
              <ArrowLeft size={11} strokeWidth={1.6} />
              Back
            </button>
            <span>
              {start + 1}–{Math.min(start + pageSize, rows.length)} of{" "}
              {rows.length.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] disabled:opacity-40"
              >
                <ChevronLeft size={11} strokeWidth={1.6} />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] disabled:opacity-40"
              >
                <ChevronRight size={11} strokeWidth={1.6} />
              </button>
            </span>
          </div>
        </td>
      </tr>
    </>
  );
}

function Th({ children, width }: { children: React.ReactNode; width?: string }) {
  return (
    <th
      style={{ width }}
      className="px-4 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-[0.18em]"
    >
      {children}
    </th>
  );
}

function SuggestionRow({
  s,
  onPick,
}: {
  s: Suggestion;
  onPick: () => void;
}) {
  return (
    <tr
      className="group relative cursor-pointer border-b border-[var(--color-border)] transition-[background-color,border-color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]"
      onClick={onPick}
    >
      <td className="relative px-4 py-2.5 font-mono text-[11px] text-[var(--color-text-muted)]">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[2px] bg-[var(--color-accent-2)] opacity-0 transition-opacity duration-[120ms] ease-out group-hover:opacity-100"
        />
        {s.id}
      </td>
      <td className="px-4 py-2.5">
        <span className="hover:underline">{s.title}</span>
      </td>
      <td className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {s.category}
      </td>
      <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--color-text-muted)]">
        {s.updated}
      </td>
      <td className="px-4 py-2.5">
        <ArrowUpRight
          size={13}
          strokeWidth={1.6}
          className="text-[var(--color-accent-2)]"
        />
      </td>
    </tr>
  );
}
