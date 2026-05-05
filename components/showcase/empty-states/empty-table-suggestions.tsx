import { ArrowUpRight, Search, Sliders, X } from "lucide-react";

/**
 * Empty table with suggestions — alternative no-search-results pattern.
 * Rather than emptying the page and showing a hero illustration, the
 * table chrome stays in place: column headers, search input, filter
 * chips. The empty state slots *inside* the table, followed by a small
 * "Try one of these" set of suggestion rows that look like real results.
 *
 * Dot+line commitments specific to this plate:
 *  - Functional, list-led — prioritises action over poetry. Same query
 *    echo, same suggestions, but discoverable in situ rather than as a
 *    page reset.
 *  - The "no matches" line uses italic Fraunces for register, not a
 *    huge headline — the table itself is the figure.
 *  - Suggestion rows are walked with a small Federal Blue arrow — the
 *    "you might mean this instead" affordance.
 *
 * Pure server component.
 */

const QUERY = "streaming-platform";

const FILTERS = ["docs", "owned by me", "edited this month"];

const SUGGESTIONS = [
  { id: "DOC-9241", title: "Deployment platform comparison", category: "Docs", updated: "2h" },
  { id: "DOC-9192", title: "Streaming ingest RFC", category: "RFCs", updated: "1d" },
  { id: "DOC-9088", title: "Real-time event pipeline plan", category: "Plans", updated: "3d" },
  { id: "DOC-8970", title: "Pricing tiers for the streaming product", category: "Pricing", updated: "6d" },
  { id: "DOC-8901", title: "Edge runtime evaluation notes", category: "Docs", updated: "1w" },
  { id: "DOC-8842", title: "Vendor shortlist: streaming infra", category: "RFCs", updated: "2w" },
];

export default function EmptyTableSuggestions() {
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
              defaultValue={QUERY}
              className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-8 text-sm focus:border-[var(--color-border-strong)] focus:outline-none"
            />
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            >
              <X size={11} strokeWidth={1.6} />
            </button>
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
          >
            <Sliders size={12} strokeWidth={1.6} />
            Filters
          </button>
        </div>

        {/* Filter chips — drop-one to widen the search. The hint sits in the
            same row so the relationship reads at a glance. */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Filters
            </span>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className="inline-flex h-6 items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-text)] transition-colors duration-[120ms] ease-out hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                aria-label={`Remove filter ${f}`}
              >
                {f}
                <X size={9} strokeWidth={1.8} />
              </button>
            ))}
          </div>
          <span
            className="font-display text-[11px] italic text-[var(--color-text-muted)]"
            style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
          >
            drop a chip to widen the search
          </span>
        </div>

        {/* Table */}
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
              {/* Empty state row — quiet, in-place. The figure here is the
                  table itself, so the message stays modest. */}
              <tr>
                <td colSpan={5} className="px-6 py-7 text-center">
                  <p
                    className="font-display text-[14px] italic text-[var(--color-text)]"
                    style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
                  >
                    No matches for{" "}
                    <span className="not-italic font-mono text-[12.5px]">{`"${QUERY}"`}</span>
                    {". "}
                    <span className="text-[var(--color-text-muted)]">
                      0 of 1,284 documents.
                    </span>
                  </p>
                </td>
              </tr>

              {/* Suggestions header — the bridge between empty state and proposed rows. */}
              <tr className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
                <td colSpan={5} className="px-6 py-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Try one of these
                  </span>
                </td>
              </tr>

              {SUGGESTIONS.map((s) => (
                <SuggestionRow key={s.id} s={s} />
              ))}
              {/* Browse-all rail — the third way out (besides edit query and
                  pick a suggestion). Reads as a quiet final row. */}
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">
                  <a
                    href="#"
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  >
                    Browse all 1,284 documents
                    <ArrowUpRight size={11} strokeWidth={1.6} />
                  </a>
                </td>
              </tr>
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
}: {
  s: { id: string; title: string; category: string; updated: string };
}) {
  return (
    <tr className="group relative border-b border-[var(--color-border)] transition-[background-color,border-color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]">
      <td className="relative px-4 py-2.5 font-mono text-[11px] text-[var(--color-text-muted)]">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[2px] bg-[var(--color-accent-2)] opacity-0 transition-opacity duration-[120ms] ease-out group-hover:opacity-100"
        />
        {s.id}
      </td>
      <td className="px-4 py-2.5">
        <a className="hover:underline" href="#">
          {s.title}
        </a>
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
