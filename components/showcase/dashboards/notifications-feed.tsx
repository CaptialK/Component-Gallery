"use client";

/**
 * Registry entry (proposed — orchestrator will lift this):
 *
 *   {
 *     domain: "saas",
 *     category: "dashboards",
 *     slug: "notifications-feed",
 *     title: "Notifications feed",
 *     filename: "notifications-feed.tsx",
 *     description: "Single-column activity feed with sticky day headers. J/K nav, mark-read on focus, filter chips, archive + mute affordances, mark-all-read.",
 *     layout: "specimen",
 *     aspectRatio: "5 / 6",
 *     maxWidth: 720,
 *     firstImpression: "2026-05-05",
 *     load: () => import("@/components/showcase/dashboards/notifications-feed"),
 *   }
 */

import * as React from "react";
import {
  AtSign,
  Check,
  CheckCheck,
  ExternalLink,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Keyboard,
  MessageSquare,
  ShieldAlert,
  UserPlus,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/_kit/empty-state";
import { ErrorState } from "@/components/_kit/error-state";
import { Modal, ModalClose } from "@/components/_kit/modal";
import { Skeleton } from "@/components/_kit/skeleton";
import { useToast } from "@/components/_kit/toast";
import { cn } from "@/lib/cn";

/* ────────────────────────── shape + seed ────────────────────────── */

type Kind =
  | "mention"
  | "comment"
  | "review"
  | "merge"
  | "branch"
  | "invite"
  | "alert";

type FilterKey = "all" | "unread" | "mentions" | "alerts";

type Notification = {
  id: string;
  kind: Kind;
  /** Author initials — ringed monogram only. */
  initials: string;
  authorName: string;
  /** "Mara Reyes mentioned you in" — leading verb-phrase. */
  verb: string;
  /** "Pricing experiment kickoff" — the subject the verb attaches to. */
  subject: string;
  /** Optional inline preview snippet. */
  preview?: string;
  /** ISO timestamp. */
  at: string;
  /** Project / repo / surface this is scoped to. */
  scope: string;
  read: boolean;
  archived: boolean;
  /** True if this notification arrived <= 60s ago — drives a live-pulse glyph. */
  live?: boolean;
  /** "3 replies" — surfaces a small thread chip when present. */
  threadReplies?: number;
};

// Reference moment — controls the "today" label and the relative timestamps.
const NOW = new Date("2026-05-05T14:08:00Z");

function isoMinutesAgo(min: number): string {
  return new Date(NOW.getTime() - min * 60_000).toISOString();
}

function isoSecondsAgo(sec: number): string {
  return new Date(NOW.getTime() - sec * 1000).toISOString();
}

function isoHoursAgo(h: number): string {
  return isoMinutesAgo(h * 60);
}

function isoDaysAgo(d: number, hour = 14, minute = 8): string {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - d);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

const SEED: Notification[] = [
  {
    id: "n-000",
    kind: "mention",
    initials: "EO",
    authorName: "Esi Owusu",
    verb: "mentioned you in",
    subject: "Pricing tiers — final guest-cap proposal before lockdown review",
    preview:
      "@you the seat-quota matrix lands here too — left a row for prosumer tier; want your read before I push.",
    at: isoSecondsAgo(35),
    scope: "stipple-press",
    read: false,
    archived: false,
    live: true,
  },
  {
    id: "n-001",
    kind: "mention",
    initials: "MR",
    authorName: "Mara Reyes",
    verb: "mentioned you in",
    subject: "Pricing experiment kickoff",
    preview:
      "@you can you re-skim the disclaimer section before legal signs off? It's the third paragraph.",
    at: isoMinutesAgo(4),
    scope: "stipple-press",
    read: false,
    archived: false,
    threadReplies: 3,
  },
  {
    id: "n-002",
    kind: "alert",
    initials: "OPS",
    authorName: "Ops bot",
    verb: "raised an alert on",
    subject: "API rate-limits — p95 latency 612 ms",
    preview: "Auth endpoint p95 above 500 ms threshold for 8 minutes.",
    at: isoMinutesAgo(22),
    scope: "atlas-billing",
    read: false,
    archived: false,
  },
  {
    id: "n-003",
    kind: "review",
    initials: "JT",
    authorName: "Jules Tanaka",
    verb: "requested review on",
    subject: "Onboarding email re-sequence v2",
    at: isoHoursAgo(1),
    scope: "stipple-press",
    read: false,
    archived: false,
  },
  {
    id: "n-004",
    kind: "comment",
    initials: "AH",
    authorName: "Amir Haddad",
    verb: "replied to your comment in",
    subject: "Q3 retention deep dive",
    preview:
      "Agreed, the cohort axis was misleading. Pushed an axis fix on `retention-q3-axis` — can you re-skim?",
    at: isoHoursAgo(3),
    scope: "stipple-press",
    read: false,
    archived: false,
  },
  {
    id: "n-005",
    kind: "merge",
    initials: "RG",
    authorName: "Rosa Garcia",
    verb: "merged",
    subject: "rate-limit/migrate-redis-7 → main",
    at: isoHoursAgo(5),
    scope: "atlas-billing",
    read: true,
    archived: false,
  },
  // Yesterday
  {
    id: "n-006",
    kind: "branch",
    initials: "DL",
    authorName: "Dani Lin",
    verb: "pushed 4 commits to",
    subject: "feature/seat-quotas",
    preview: "Last commit: “Cap guests at 5 per workspace; add quota gauge skeleton.”",
    at: isoDaysAgo(1, 18, 42),
    scope: "stipple-press",
    read: true,
    archived: false,
  },
  {
    id: "n-007",
    kind: "invite",
    initials: "EO",
    authorName: "Esi Owusu",
    verb: "accepted your invite to",
    subject: "Stipple Press",
    at: isoDaysAgo(1, 11, 15),
    scope: "stipple-press",
    read: true,
    archived: false,
  },
  {
    id: "n-008",
    kind: "comment",
    initials: "MR",
    authorName: "Mara Reyes",
    verb: "commented on",
    subject: "Outage retro: 04-29",
    preview:
      "Three open items — owners assigned. The webhook backlog post-mortem is on me by Friday.",
    at: isoDaysAgo(1, 9, 4),
    scope: "stipple-press",
    read: true,
    archived: false,
  },
  // Older
  {
    id: "n-009",
    kind: "review",
    initials: "AH",
    authorName: "Amir Haddad",
    verb: "approved",
    subject: "API rate-limit migration plan",
    at: isoDaysAgo(2, 16, 30),
    scope: "atlas-billing",
    read: true,
    archived: false,
  },
  {
    id: "n-010",
    kind: "branch",
    initials: "JT",
    authorName: "Jules Tanaka",
    verb: "force-pushed to",
    subject: "fix/email-template-utf8",
    at: isoDaysAgo(2, 10, 8),
    scope: "stipple-press",
    read: true,
    archived: false,
  },
  {
    id: "n-011",
    kind: "alert",
    initials: "OPS",
    authorName: "Ops bot",
    verb: "resolved alert on",
    subject: "Search indexer memory headroom",
    preview: "Memory back to 38% after compaction job — alert auto-cleared.",
    at: isoDaysAgo(3, 22, 51),
    scope: "north-warehouse",
    read: true,
    archived: false,
  },
  {
    id: "n-012",
    kind: "mention",
    initials: "DL",
    authorName: "Dani Lin",
    verb: "mentioned you in",
    subject: "Pricing tiers brief",
    preview: "Adding @you as a reviewer — particularly on the seat-quota matrix.",
    at: isoDaysAgo(4, 14, 27),
    scope: "stipple-press",
    read: true,
    archived: false,
  },
];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "mentions", label: "Mentions" },
  { key: "alerts", label: "Alerts" },
];

const KIND_META: Record<Kind, { icon: typeof AtSign; label: string }> = {
  mention: { icon: AtSign,           label: "mention" },
  comment: { icon: MessageSquare,    label: "comment" },
  review:  { icon: GitPullRequest,   label: "review" },
  merge:   { icon: GitMerge,         label: "merge" },
  branch:  { icon: GitBranch,        label: "branch" },
  invite:  { icon: UserPlus,         label: "invite" },
  alert:   { icon: ShieldAlert,      label: "alert" },
};

/* ────────────────────────── helpers ────────────────────────── */

function fmtRelative(iso: string): string {
  const ms = NOW.getTime() - new Date(iso).getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

function fmtClock(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function dayBucketKey(iso: string): "today" | "yesterday" | "earlier" {
  const d = new Date(iso);
  const day0 = new Date(NOW);
  day0.setHours(0, 0, 0, 0);
  const day1 = new Date(day0);
  day1.setDate(day1.getDate() - 1);
  const dayDate = new Date(d);
  dayDate.setHours(0, 0, 0, 0);
  if (dayDate.getTime() === day0.getTime()) return "today";
  if (dayDate.getTime() === day1.getTime()) return "yesterday";
  return "earlier";
}

function dayBucketLabel(b: "today" | "yesterday" | "earlier"): string {
  if (b === "today") return "Today · 05 May";
  if (b === "yesterday") return "Yesterday · 04 May";
  return "Earlier this week";
}

/* ────────────────────────── component ────────────────────────── */

export default function NotificationsFeed() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Notification[]>(SEED);
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [loading, setLoading] = React.useState(true);
  const [feedError, setFeedError] = React.useState(false);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = React.useState(false);
  const [keymapOpen, setKeymapOpen] = React.useState(false);
  const [drawerId, setDrawerId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 200);
    return () => window.clearTimeout(t);
  }, []);

  const visible = React.useMemo(() => {
    return items.filter((n) => {
      if (n.archived) return false;
      if (filter === "unread") return !n.read;
      if (filter === "mentions") return n.kind === "mention";
      if (filter === "alerts") return n.kind === "alert";
      return true;
    });
  }, [items, filter]);

  // Group by day bucket. Order: today → yesterday → earlier, items inside
  // newest-first.
  const grouped = React.useMemo(() => {
    const buckets: { key: "today" | "yesterday" | "earlier"; items: Notification[] }[] = [
      { key: "today", items: [] },
      { key: "yesterday", items: [] },
      { key: "earlier", items: [] },
    ];
    for (const n of visible) {
      const b = dayBucketKey(n.at);
      buckets.find((x) => x.key === b)!.items.push(n);
    }
    for (const b of buckets) {
      b.items.sort((a, c) => new Date(c.at).getTime() - new Date(a.at).getTime());
    }
    return buckets.filter((b) => b.items.length > 0);
  }, [visible]);

  const flatVisible = React.useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped],
  );

  // Per-row refs so arrow nav can scroll the focused row into view.
  const rowRefs = React.useRef<Map<string, HTMLLIElement | null>>(new Map());
  const setRowRef = React.useCallback((id: string, el: HTMLLIElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  }, []);

  // Filter counts — memoized so we don't recompute four filters per render.
  const filterCounts = React.useMemo(() => {
    const active = items.filter((n) => !n.archived);
    return {
      all: active.length,
      unread: active.filter((n) => !n.read).length,
      mentions: active.filter((n) => n.kind === "mention").length,
      alerts: active.filter((n) => n.kind === "alert").length,
    } satisfies Record<FilterKey, number>;
  }, [items]);

  // Roving focus across the visible flat list.
  React.useEffect(() => {
    if (flatVisible.length === 0) {
      setFocusId(null);
      return;
    }
    if (!focusId || !flatVisible.some((n) => n.id === focusId)) {
      setFocusId(flatVisible[0].id);
    }
  }, [flatVisible, focusId]);

  const focusIndex = focusId
    ? flatVisible.findIndex((n) => n.id === focusId)
    : -1;

  function focusRow(id: string) {
    setFocusId(id);
    // Defer to next frame so the new focus state applies before scrolling.
    requestAnimationFrame(() => {
      rowRefs.current.get(id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  const onListKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (flatVisible.length === 0) return;
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = flatVisible[Math.min(flatVisible.length - 1, focusIndex + 1)];
      if (next) focusRow(next.id);
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = flatVisible[Math.max(0, focusIndex - 1)];
      if (next) focusRow(next.id);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusId) {
        openDrawer(focusId);
      }
    } else if (e.key.toLowerCase() === "e" && focusId) {
      e.preventDefault();
      archive(focusId);
    } else if (e.key.toLowerCase() === "u" && focusId) {
      e.preventDefault();
      toggleRead(focusId);
    } else if (e.key === "?") {
      e.preventDefault();
      setKeymapOpen(true);
    }
  };

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function toggleRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  }

  function archive(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, archived: true } : n)));
    toast({ title: "Notification archived.", status: "info" });
  }

  function openDrawer(id: string) {
    markRead(id);
    setDrawerId(id);
    toast({ title: "Opening in source…", status: "info" });
  }

  function markAllRead() {
    if (markingAllRead) return;
    const count = items.filter((n) => !n.archived && !n.read).length;
    if (count === 0) return;
    setMarkingAllRead(true);
    window.setTimeout(() => {
      setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
      setMarkingAllRead(false);
      toast({
        title: `${count} notification${count === 1 ? "" : "s"} marked read.`,
        status: "info",
      });
    }, 400);
  }

  const unreadCount = filterCounts.unread;
  const totalVisible = visible.length;
  const drawerItem = drawerId ? items.find((n) => n.id === drawerId) ?? null : null;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full min-h-0 flex-col">
        {/* Top rail */}
        <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <span>Notifications · activity feed · 14:08</span>
          <span className="flex items-center gap-3">
            <span aria-live="polite">
              <span className="text-[var(--color-accent)] tabular-nums">{unreadCount}</span> unread
            </span>
            <button
              type="button"
              onClick={() => setKeymapOpen(true)}
              aria-label="Show keymap"
              className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] outline-none transition-[border-color,color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
            >
              <Keyboard size={11} strokeWidth={1.6} aria-hidden />
            </button>
          </span>
        </div>

        {/* Hero + mark-all */}
        <div className="grid shrink-0 grid-cols-[1fr_auto] items-end gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Stipple Press · across all projects
            </p>
            <h1
              className="mt-1 font-display text-[22px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
            >
              {unreadCount === 0
                ? "Nothing unread."
                : `${unreadCount} need${unreadCount === 1 ? "s" : ""} a look.`}
            </h1>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0 || markingAllRead}
            aria-busy={markingAllRead || undefined}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 font-mono text-[10px] uppercase tracking-[0.18em] outline-none transition-[border-color,background-color,color] duration-[120ms] ease-out",
              unreadCount === 0 || markingAllRead
                ? "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]"
                : "border-[var(--color-text)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-text)] hover:text-[var(--color-bg)]",
            )}
          >
            {markingAllRead ? (
              <>
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)] animate-caret-blink"
                />
                Marking&hellip;
              </>
            ) : (
              <>
                <CheckCheck size={12} strokeWidth={1.6} />
                Mark all read
              </>
            )}
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Filter
          </span>
          {FILTERS.map((f) => {
            const count = filterCounts[f.key];
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                className={cn(
                  "relative inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--radius-xs)] border outline-none transition-[border-color,color,background-color] duration-[120ms] ease-out font-mono text-[10px] uppercase tracking-[0.16em]",
                  // 2px left accent strip on active — match catalogue row vocabulary.
                  active ? "pl-2.5 pr-2" : "px-2",
                  active
                    ? "border-[var(--color-text)] bg-[var(--color-surface)] text-[var(--color-text)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 bottom-0 w-[2px]"
                    style={{ background: "var(--color-text)" }}
                  />
                )}
                {f.label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Inline error pocket */}
        {feedError && (
          <ErrorState
            variant="banner"
            title="Activity feed unreachable."
            body="Showing the last cached batch. New events will appear once we reconnect."
            lastSync="14:02"
            onRetry={() => setFeedError(false)}
            onDismiss={() => setFeedError(false)}
          />
        )}

        {/* Feed */}
        <div
          role="list"
          tabIndex={0}
          aria-label="Activity notifications"
          onKeyDown={onListKeyDown}
          className="relative min-h-0 flex-1 overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent-2)]"
        >
          {/* Sticky-header sentinel — observed for `position: sticky` pin detection. */}
          <StickyHeaderSentinel />

          {/* Loading + content crossfade — both render; opacity keys off `loading`. */}
          <div
            aria-hidden={!loading}
            className="transition-opacity duration-[200ms] ease-out"
            style={{
              opacity: loading ? 1 : 0,
              pointerEvents: loading ? "auto" : "none",
              position: loading ? "static" : "absolute",
              inset: loading ? "auto" : 0,
            }}
          >
            <LoadingFeed />
          </div>

          <div
            aria-hidden={loading}
            className="transition-opacity duration-[200ms] ease-out"
            style={{ opacity: loading ? 0 : 1 }}
          >
            {flatVisible.length === 0 ? (
              <FeedEmpty
                filter={filter}
                onClearFilter={() => setFilter("all")}
                onTriggerError={() => setFeedError(true)}
              />
            ) : (
              grouped.map((bucket) => (
                <StickySection key={bucket.key} label={dayBucketLabel(bucket.key)}>
                  <ul role="presentation" className="divide-y divide-[var(--color-border)]">
                    {bucket.items.map((n) => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        isFocus={focusId === n.id}
                        rowRef={(el) => setRowRef(n.id, el)}
                        onFocus={() => setFocusId(n.id)}
                        onOpen={() => openDrawer(n.id)}
                        onArchive={() => archive(n.id)}
                        onToggleRead={() => toggleRead(n.id)}
                      />
                    ))}
                  </ul>
                </StickySection>
              ))
            )}
          </div>
        </div>

        {/* Caption — single legend line. Editorial copy lives in the colophon. */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <UnreadGlyph filled />
            Unread
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1.5">
            <UnreadGlyph filled={false} />
            Read
          </span>
          <span aria-hidden>·</span>
          <span>
            Showing <span className="tabular-nums text-[var(--color-text)]">{totalVisible}</span> of{" "}
            <span className="tabular-nums text-[var(--color-text)]">{filterCounts.all}</span>
          </span>
        </div>
      </div>

      {/* Keymap modal */}
      <Modal
        open={keymapOpen}
        onOpenChange={setKeymapOpen}
        placement="center"
        size="sm"
        ariaLabel="Keyboard shortcuts"
      >
        <div className="flex items-baseline justify-between border-b border-[var(--color-border)] px-6 py-3">
          <h2
            className="font-display text-[18px] italic leading-tight tracking-[-0.02em]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            Keymap
          </h2>
          <ModalClose
            className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] outline-none transition-[border-color,color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
            aria-label="Close keymap"
          >
            <X size={11} strokeWidth={1.8} />
          </ModalClose>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 px-6 py-4 text-[12px]">
          {[
            ["J", "Next notification"],
            ["K", "Previous notification"],
            ["Enter", "Open detail drawer"],
            ["E", "Archive"],
            ["U", "Toggle read / unread"],
            ["?", "Show this keymap"],
          ].map(([k, label]) => (
            <React.Fragment key={k}>
              <kbd className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 font-mono text-[11px] tabular-nums text-[var(--color-text)]">
                {k}
              </kbd>
              <span className="self-center text-[var(--color-text-muted)]">{label}</span>
            </React.Fragment>
          ))}
        </dl>
      </Modal>

      {/* Detail drawer */}
      <Modal
        open={drawerItem !== null}
        onOpenChange={(o) => {
          if (!o) setDrawerId(null);
        }}
        placement="right"
        size="md"
        ariaLabel="Notification detail"
      >
        {drawerItem && <DrawerContents n={drawerItem} onClose={() => setDrawerId(null)} />}
      </Modal>
    </div>
  );
}

/* ────────────────────────── sticky section + sentinel ────────────────────────── */

function StickyHeaderSentinel() {
  // Empty 1px sentinel at the top of the scroll container — used by
  // StickySection's IntersectionObserver to know when the scroll has left the
  // top. Kept separate so a single observer can drive every section's
  // data-stuck attribute.
  return <div data-feed-sentinel="" className="h-px w-full" aria-hidden />;
}

function StickySection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const headerRef = React.useRef<HTMLHeadingElement | null>(null);

  React.useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const scroller = header.closest<HTMLElement>('[role="list"]');
    if (!scroller) return;

    // Observe a 1px sentinel placed just above the header. When the sentinel
    // is no longer intersecting the scroller, the header is pinned.
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.height = "1px";
    sentinel.style.width = "100%";
    sentinel.style.marginBottom = "-1px";
    header.parentElement?.insertBefore(sentinel, header);

    const obs = new IntersectionObserver(
      ([entry]) => {
        const stuck = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        header.dataset.stuck = stuck ? "true" : "false";
      },
      { root: scroller, threshold: [0, 1] },
    );
    obs.observe(sentinel);
    return () => {
      obs.disconnect();
      sentinel.remove();
    };
  }, []);

  return (
    <section aria-label={label}>
      <h2
        ref={headerRef}
        data-stuck="false"
        className={cn(
          "sticky top-0 z-10 border-b border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-1.5 font-mono text-[10px] uppercase tracking-[0.20em] text-[var(--color-text-muted)] tabular-nums",
          "transition-[box-shadow,border-color] duration-[120ms] ease-out",
          "data-[stuck=true]:[box-shadow:0_1px_0_color-mix(in_oklch,var(--color-text)_12%,transparent)]",
          "data-[stuck=true]:border-[var(--color-border-strong)]",
        )}
      >
        {label}
      </h2>
      {children}
    </section>
  );
}

/* ────────────────────────── unread glyph ────────────────────────── */

function UnreadGlyph({ filled, accent }: { filled: boolean; accent?: string }) {
  // Encodes read-state by glyph WEIGHT, not color — survives grayscale.
  // Filled circle for unread, hollow ring for read. Same color either way.
  const fill = accent ?? "var(--color-text)";
  return (
    <svg width={8} height={8} viewBox="0 0 8 8" aria-hidden>
      {filled ? (
        <circle cx={4} cy={4} r={3} fill={fill} />
      ) : (
        <circle cx={4} cy={4} r={3} fill="none" stroke={fill} strokeWidth={1} />
      )}
    </svg>
  );
}

/* ────────────────────────── row ────────────────────────── */

function NotificationRow({
  n,
  isFocus,
  rowRef,
  onFocus,
  onOpen,
  onArchive,
  onToggleRead,
}: {
  n: Notification;
  isFocus: boolean;
  rowRef: (el: HTMLLIElement | null) => void;
  onFocus: () => void;
  onOpen: () => void;
  onArchive: () => void;
  onToggleRead: () => void;
}) {
  const { icon: Icon, label } = KIND_META[n.kind];
  const unread = !n.read;
  const isAlert = n.kind === "alert";
  // Glyph color stays `--color-text` for both unread and read — weight carries
  // the state. Accents (mention/alert) live in the row's left strip + the
  // focused-row ring, not the read-state glyph.
  return (
    <li
      ref={rowRef}
      role="listitem"
      data-focus={isFocus ? "true" : undefined}
      className={cn(
        "group relative grid items-start gap-3 px-6 py-3 transition-[background-color,border-color] duration-[120ms] ease-out",
        "grid-cols-[20px_28px_1fr_auto]",
        isFocus
          ? "bg-[color-mix(in_oklch,var(--color-accent-2)_4%,var(--color-surface))]"
          : "hover:bg-[var(--color-surface)]",
      )}
    >
      {/* Unread strip — left edge, persimmon for alerts and mentions, walnut otherwise.
          When read, the strip becomes a transparent rule so the row spacing stays stable. */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{
          background: unread
            ? isAlert
              ? "var(--color-accent)"
              : n.kind === "mention"
                ? "var(--color-accent)"
                : "var(--color-text)"
            : "transparent",
        }}
      />

      {/* Read-state glyph — encoded by WEIGHT (filled vs hollow ring), not color. */}
      <span aria-hidden className="mt-2 flex h-2 w-2 items-center justify-center">
        <UnreadGlyph filled={unread} />
        {n.live && unread && (
          <span
            aria-hidden
            className="absolute mt-0 h-2 w-2 rounded-full animate-live-pulse"
            style={{
              background: "color-mix(in oklch, var(--color-accent-2) 40%, transparent)",
            }}
          />
        )}
      </span>

      {/* Avatar — ringed monogram for ALL kinds. Alerts get a small ShieldAlert
          overlay glyph in the bottom-right (compose, don't replace). */}
      <span aria-hidden className="relative inline-flex h-7 w-7 shrink-0">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] font-mono text-[10px] tracking-[0.06em] text-[var(--color-text)]"
          title={n.authorName}
        >
          {n.initials}
        </span>
        {isAlert && (
          <span
            className="absolute -bottom-0.5 -right-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full border border-[var(--color-bg)] bg-[var(--color-accent)] text-[var(--color-bg)]"
            aria-label="alert"
          >
            <ShieldAlert size={7} strokeWidth={2} />
          </span>
        )}
      </span>

      {/* Body */}
      <button
        type="button"
        onClick={onOpen}
        onFocus={onFocus}
        tabIndex={isFocus ? 0 : -1}
        aria-current={isFocus ? "true" : undefined}
        aria-label={`${n.authorName} ${n.verb} ${n.subject} · ${fmtRelative(n.at)}${unread ? " · unread" : ""}`}
        className="grid min-w-0 grid-cols-1 gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
      >
        <p
          className={cn(
            "truncate text-[13.5px] leading-snug",
            unread ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]",
          )}
          title={`${n.authorName} ${n.verb} ${n.subject}`}
        >
          <span className={cn("font-medium", !unread && "font-normal")}>
            {n.authorName}
          </span>{" "}
          <span className="text-[var(--color-text-muted)]">{n.verb}</span>{" "}
          <span className={cn(unread ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")}>
            {n.subject}
          </span>
        </p>
        {n.preview && (
          <p
            className="line-clamp-2 max-w-[64ch] text-[12px] leading-relaxed text-[var(--color-text-muted)]"
            title={n.preview}
          >
            {n.preview}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1">
            <Icon aria-hidden size={11} strokeWidth={1.6} />
            {label}
          </span>
          <span aria-hidden>·</span>
          <span title={n.scope}>{n.scope}</span>
          <span aria-hidden>·</span>
          <span title={fmtClock(n.at)}>{fmtRelative(n.at)}</span>
          <span aria-hidden className="opacity-60">({fmtClock(n.at)})</span>
          {typeof n.threadReplies === "number" && n.threadReplies > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex h-4 items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 tabular-nums">
                <MessageSquare aria-hidden size={9} strokeWidth={1.6} />
                {n.threadReplies} replies
              </span>
            </>
          )}
        </div>
      </button>

      {/* Trailing actions — visible on focus or hover. Always tab-reachable when focused.
          32x32 tap targets (h-8 w-8). */}
      <div
        className={cn(
          "flex items-start gap-1 transition-opacity duration-[120ms] ease-out",
          isFocus ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleRead();
          }}
          tabIndex={isFocus ? 0 : -1}
          aria-label={unread ? "Mark as read" : "Mark as unread"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] outline-none transition-[border-color,color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
        >
          <Check size={12} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
          tabIndex={isFocus ? 0 : -1}
          aria-label="Archive"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] outline-none transition-[border-color,color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
        >
          <X size={12} strokeWidth={1.8} />
        </button>
      </div>
    </li>
  );
}

/* ────────────────────────── drawer ────────────────────────── */

function DrawerContents({ n, onClose }: { n: Notification; onClose: () => void }) {
  const { icon: Icon, label } = KIND_META[n.kind];
  const isAlert = n.kind === "alert";
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-6 py-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            aria-hidden
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full border bg-[var(--color-bg)]",
              isAlert
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-[var(--color-border-strong)] text-[var(--color-text)]",
            )}
          >
            <Icon size={14} strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              {label} · {n.scope}
            </p>
            <h2
              className="mt-1 font-display text-[18px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
              title={n.subject}
            >
              {n.subject}
            </h2>
          </div>
        </div>
        <ModalClose
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] outline-none transition-[border-color,color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
          aria-label="Close detail"
        >
          <X size={12} strokeWidth={1.8} />
        </ModalClose>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="flex items-baseline gap-3">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] font-mono text-[10px] tracking-[0.06em] text-[var(--color-text)]"
          >
            {n.initials}
          </span>
          <p className="text-[13px] leading-snug">
            <span className="font-medium">{n.authorName}</span>{" "}
            <span className="text-[var(--color-text-muted)]">{n.verb}</span>{" "}
            <span>{n.subject}</span>
          </p>
        </div>

        {n.preview && (
          <blockquote className="mt-4 border-l-2 border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[13px] leading-relaxed text-[var(--color-text)]">
            {n.preview}
          </blockquote>
        )}

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          <dt>When</dt>
          <dd className="text-[var(--color-text)] tabular-nums">
            {fmtRelative(n.at)} <span className="opacity-60">({fmtClock(n.at)})</span>
          </dd>
          <dt>Scope</dt>
          <dd className="text-[var(--color-text)]">{n.scope}</dd>
          <dt>Kind</dt>
          <dd className="text-[var(--color-text)]">{label}</dd>
          {typeof n.threadReplies === "number" && n.threadReplies > 0 && (
            <>
              <dt>Thread</dt>
              <dd className="text-[var(--color-text)] tabular-nums">{n.threadReplies} replies</dd>
            </>
          )}
        </dl>
      </div>

      <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-text)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)] outline-none transition-[border-color,background-color,color] duration-[120ms] ease-out hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
        >
          <ExternalLink size={11} strokeWidth={1.8} />
          View in source
        </button>
      </footer>
    </div>
  );
}

/* ────────────────────────── empty + loading ────────────────────────── */

function FeedEmpty({
  filter,
  onClearFilter,
  onTriggerError,
}: {
  filter: FilterKey;
  onClearFilter: () => void;
  onTriggerError: () => void;
}) {
  if (filter !== "all") {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10">
        <EmptyState
          eyebrow={`${filter} only`}
          title="Nothing matches this filter."
          body={
            filter === "unread"
              ? "Nothing unread on this surface. Clear the filter to see your archive of recent activity."
              : filter === "mentions"
                ? "No active mentions across your projects."
                : "No active alerts. We'll surface anything that breaches a threshold."
          }
          action={{ label: "Clear filter", onClick: onClearFilter, variant: "ghost" }}
        />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-10">
      <EmptyEnvelope />
      <EmptyState
        density="inline"
        eyebrow="no activity"
        title="No new activity."
        body="Nothing has happened across your projects since you last looked. We refresh every minute."
        secondary={
          <button
            type="button"
            onClick={onTriggerError}
            className="font-mono text-[10px] uppercase tracking-[0.18em] hover:text-[var(--color-text)]"
          >
            Simulate connection error
          </button>
        }
      />
    </div>
  );
}

function EmptyEnvelope() {
  // Pointillism envelope — discrete dots only, no fill. ~22 marks.
  return (
    <svg
      width={96}
      height={64}
      viewBox="0 0 96 64"
      role="img"
      aria-label="Stippled envelope illustration"
      fill="none"
    >
      <rect
        x={6}
        y={10}
        width={84}
        height={48}
        rx={4}
        stroke="var(--color-border-strong)"
        strokeWidth={1}
      />
      <path
        d="M6 14 L48 38 L90 14"
        stroke="var(--color-border-strong)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      {[
        [16, 22], [22, 26], [28, 30], [34, 32], [40, 33],
        [48, 34], [56, 33], [62, 32], [68, 30], [74, 26], [80, 22],
        [16, 50], [24, 52], [32, 53], [40, 54], [48, 54],
        [56, 54], [64, 53], [72, 52], [80, 50],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={1.1}
          fill="var(--color-accent-2)"
          opacity={0.7}
        />
      ))}
    </svg>
  );
}

function LoadingFeed() {
  return (
    <div aria-hidden>
      {["today", "yesterday"].map((bucket, b) => (
        <section key={bucket}>
          <div className="border-b border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-1.5">
            <Skeleton width={120} height={10} density={0.05} seed={b + 1} />
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="grid grid-cols-[20px_28px_1fr_auto] items-start gap-3 px-6 py-3"
              >
                <span />
                <Skeleton width={28} height={28} density={0.06} seed={b * 100 + i + 1} className="rounded-full" />
                <div className="flex flex-col gap-2">
                  <Skeleton width={280} height={12} density={0.06} seed={b * 100 + i + 11} />
                  <Skeleton width={200} height={10} density={0.05} seed={b * 100 + i + 21} />
                  <Skeleton width={140} height={10} density={0.05} seed={b * 100 + i + 31} />
                </div>
                <Skeleton width={48} height={20} density={0.05} seed={b * 100 + i + 41} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
