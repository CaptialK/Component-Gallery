"use client";

/**
 * Registry entry (proposed — orchestrator will lift this):
 *
 *   {
 *     domain: "saas",
 *     category: "dashboards",
 *     slug: "data-table",
 *     title: "Data table",
 *     filename: "data-table.tsx",
 *     description: "Spreadsheet-density ledger of customer accounts. Sticky head + first column, sortable columns, multi-row selection, bulk-action toolbar, column visibility menu, search + status filter, pagination, MRR sparkline cell.",
 *     layout: "specimen",
 *     aspectRatio: "16 / 10",
 *     maxWidth: 1100,
 *     firstImpression: "2026-05-05",
 *     load: () => import("@/components/showcase/dashboards/data-table"),
 *   }
 */

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/_kit/empty-state";
import { ErrorState } from "@/components/_kit/error-state";
import { Menu } from "@/components/_kit/menu";
import { Modal, ModalClose, ModalDescription, ModalTitle } from "@/components/_kit/modal";
import { Skeleton } from "@/components/_kit/skeleton";
import { Trace, type TracePoint } from "@/components/_kit/trace";
import { useToast } from "@/components/_kit/toast";
import { cn } from "@/lib/cn";

/* ────────────────────────── shape + seed ────────────────────────── */

type Status = "active" | "trialing" | "delinquent" | "churned";

type Plan = "starter" | "team" | "scale" | "enterprise";

type Account = {
  id: string;
  /** Workspace name. */
  account: string;
  /** Owner initials (ringed monogram). */
  ownerInitials: string;
  ownerName: string;
  plan: Plan;
  /** Monthly Recurring Revenue, USD cents. */
  mrr: number;
  /** Seat count. */
  seats: number;
  status: Status;
  /** ISO timestamp of last meaningful activity. */
  lastActive: string;
  /** ISO sign-up date. */
  signedUp: string;
  region: "US" | "EU" | "APAC";
  /** 12 months of MRR, oldest → newest, in dollars (display-rounded). */
  mrrTrail: number[];
};

const NOW = new Date("2026-05-05T14:08:00Z");

function isoDaysAgo(d: number): string {
  const dt = new Date(NOW);
  dt.setUTCDate(dt.getUTCDate() - d);
  return dt.toISOString();
}

function isoMinutesAgo(min: number): string {
  return new Date(NOW.getTime() - min * 60_000).toISOString();
}

const ACCOUNTS: Account[] = [
  {
    id: "ACC-9241",
    account: "Stipple Press",
    ownerInitials: "MR",
    ownerName: "Mara Reyes",
    plan: "team",
    mrr: 2_520_00,
    seats: 18,
    status: "active",
    lastActive: isoMinutesAgo(4),
    signedUp: "2024-09-12",
    region: "US",
    mrrTrail: [1480, 1620, 1740, 1800, 1880, 1960, 2080, 2160, 2240, 2360, 2440, 2520],
  },
  {
    id: "ACC-9237",
    account: "Atlas Billing",
    ownerInitials: "JT",
    ownerName: "Jules Tanaka",
    plan: "scale",
    mrr: 8_400_00,
    seats: 64,
    status: "active",
    lastActive: isoMinutesAgo(22),
    signedUp: "2023-04-18",
    region: "US",
    mrrTrail: [6200, 6450, 6700, 6950, 7100, 7280, 7440, 7600, 7800, 8000, 8200, 8400],
  },
  {
    id: "ACC-9230",
    account: "North Warehouse",
    ownerInitials: "AH",
    ownerName: "Amir Haddad",
    plan: "team",
    mrr: 1_960_00,
    seats: 14,
    status: "active",
    lastActive: isoMinutesAgo(73),
    signedUp: "2024-11-02",
    region: "EU",
    mrrTrail: [1120, 1180, 1280, 1340, 1420, 1480, 1560, 1640, 1720, 1820, 1880, 1960],
  },
  {
    id: "ACC-9228",
    account: "Field Notes",
    ownerInitials: "RG",
    ownerName: "Rosa Garcia",
    plan: "starter",
    mrr: 0,
    seats: 3,
    status: "trialing",
    lastActive: isoMinutesAgo(140),
    signedUp: "2026-04-22",
    region: "US",
    mrrTrail: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: "ACC-9201",
    account: "Helio Labs",
    ownerInitials: "DL",
    ownerName: "Dani Lin",
    plan: "scale",
    mrr: 12_180_00,
    seats: 102,
    status: "active",
    lastActive: isoMinutesAgo(2),
    signedUp: "2022-08-15",
    region: "APAC",
    mrrTrail: [9200, 9500, 9800, 10100, 10400, 10800, 11100, 11400, 11600, 11800, 12000, 12180],
  },
  {
    id: "ACC-9192",
    account: "Cordillera Foods",
    ownerInitials: "EO",
    ownerName: "Esi Owusu",
    plan: "team",
    mrr: 1_120_00,
    seats: 9,
    status: "delinquent",
    lastActive: isoDaysAgo(2),
    signedUp: "2025-02-09",
    region: "US",
    mrrTrail: [1820, 1820, 1820, 1820, 1680, 1540, 1400, 1260, 1120, 1120, 1120, 1120],
  },
  {
    id: "ACC-9180",
    account: "Brioche & Sons",
    ownerInitials: "MR",
    ownerName: "Mara Reyes",
    plan: "starter",
    mrr: 280_00,
    seats: 4,
    status: "active",
    lastActive: isoMinutesAgo(312),
    signedUp: "2025-08-30",
    region: "EU",
    mrrTrail: [180, 200, 200, 220, 220, 240, 240, 260, 260, 260, 280, 280],
  },
  {
    id: "ACC-9162",
    account: "Mission & Burnett",
    ownerInitials: "JT",
    ownerName: "Jules Tanaka",
    plan: "enterprise",
    mrr: 24_500_00,
    seats: 220,
    status: "active",
    lastActive: isoMinutesAgo(48),
    signedUp: "2021-06-04",
    region: "US",
    mrrTrail: [19500, 20100, 20800, 21200, 21800, 22300, 22800, 23200, 23700, 24000, 24300, 24500],
  },
  {
    id: "ACC-9145",
    account: "Boreal Tile",
    ownerInitials: "AH",
    ownerName: "Amir Haddad",
    plan: "team",
    mrr: 1_680_00,
    seats: 12,
    status: "active",
    lastActive: isoDaysAgo(1),
    signedUp: "2024-12-19",
    region: "EU",
    mrrTrail: [980, 1080, 1180, 1280, 1380, 1420, 1480, 1520, 1580, 1620, 1640, 1680],
  },
  {
    id: "ACC-9120",
    account: "Pier 9 Studio",
    ownerInitials: "RG",
    ownerName: "Rosa Garcia",
    plan: "team",
    mrr: 0,
    seats: 6,
    status: "churned",
    lastActive: isoDaysAgo(48),
    signedUp: "2024-03-11",
    region: "US",
    mrrTrail: [840, 840, 840, 840, 840, 840, 840, 840, 840, 420, 0, 0],
  },
  {
    id: "ACC-9101",
    account: "Tessera Health",
    ownerInitials: "DL",
    ownerName: "Dani Lin",
    plan: "enterprise",
    mrr: 18_200_00,
    seats: 178,
    status: "active",
    lastActive: isoMinutesAgo(11),
    signedUp: "2022-11-30",
    region: "US",
    mrrTrail: [14000, 14400, 14800, 15200, 15600, 16000, 16400, 16800, 17200, 17600, 17900, 18200],
  },
  {
    id: "ACC-9088",
    account: "Hosokawa Translations",
    ownerInitials: "EO",
    ownerName: "Esi Owusu",
    plan: "starter",
    mrr: 140_00,
    seats: 2,
    status: "trialing",
    lastActive: isoMinutesAgo(560),
    signedUp: "2026-04-29",
    region: "APAC",
    mrrTrail: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60, 140],
  },
];

const ALL_COLUMNS = [
  { key: "account",    label: "Account",     align: "left",  sortable: true,  always: true,  width: "minmax(180px, 1.4fr)" },
  { key: "owner",      label: "Owner",       align: "left",  sortable: true,  always: false, width: "minmax(140px, 1fr)" },
  { key: "plan",       label: "Plan",        align: "left",  sortable: true,  always: false, width: "minmax(96px, 0.6fr)" },
  { key: "mrr",        label: "MRR",         align: "right", sortable: true,  always: true,  width: "minmax(120px, 0.7fr)" },
  { key: "trail",      label: "12-mo MRR",   align: "left",  sortable: false, always: false, width: "minmax(120px, 0.8fr)" },
  { key: "seats",      label: "Seats",       align: "right", sortable: true,  always: false, width: "minmax(64px, 0.4fr)" },
  { key: "status",     label: "Status",      align: "left",  sortable: true,  always: true,  width: "minmax(112px, 0.6fr)" },
  { key: "region",     label: "Region",      align: "left",  sortable: true,  always: false, width: "minmax(72px, 0.4fr)" },
  { key: "lastActive", label: "Last active", align: "left",  sortable: true,  always: false, width: "minmax(112px, 0.6fr)" },
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

const PLAN_LABEL: Record<Plan, string> = {
  starter: "Starter",
  team: "Team",
  scale: "Scale",
  enterprise: "Enterprise",
};

const STATUS_INK: Record<Status, string> = {
  active:      "color-mix(in oklch, var(--color-success) 70%, var(--color-text))",
  trialing:    "var(--color-accent-2)",
  delinquent:  "var(--color-accent)",
  churned:     "var(--color-text-muted)",
};

const STATUS_LABEL: Record<Status, string> = {
  active: "active",
  trialing: "trialing",
  delinquent: "delinquent",
  churned: "churned",
};

/* ────────────────────────── helpers ────────────────────────── */

function fmtMRR(cents: number): string {
  if (cents === 0) return "$0";
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars.toFixed(0)}`;
}

function fmtFullMRR(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function fmtRelative(iso: string): string {
  const ms = NOW.getTime() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function fmtClock(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d);
}

function fmtAbsoluteShort(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(d);
  return `${date} ${fmtClock(d)}Z`;
}

/* ────────────────────────── URL state encoding ──────────────────────────
 *
 * Hash shape: `?sort=mrr.desc&filter=active,trialing&page=2&size=24&cols=account,mrr,status`.
 * - `sort`: `<key>.<asc|desc>`
 * - `filter`: comma-joined Status values
 * - `page`: 1-indexed integer
 * - `size`: one of PAGE_SIZE_OPTIONS
 * - `cols`: comma-joined ColumnKey list (subset of ALL_COLUMNS keys; "always" cols always re-added)
 * Use `URLSearchParams` + `history.replaceState`; restore on mount.
 */

const STATUS_KEYS: readonly Status[] = ["active", "trialing", "delinquent", "churned"] as const;
const COLUMN_KEYS: readonly ColumnKey[] = ALL_COLUMNS.map((c) => c.key);
const ALWAYS_COLUMN_KEYS: readonly ColumnKey[] = ALL_COLUMNS.filter((c) => c.always).map((c) => c.key);

/* ────────────────────────── component ────────────────────────── */

type SortKey = ColumnKey;
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export default function DataTable() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [feedError, setFeedError] = React.useState(false);
  const [feedErrorMessage, setFeedErrorMessage] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const [statusFilter, setStatusFilter] = React.useState<Set<Status>>(new Set());
  const [sortKey, setSortKey] = React.useState<SortKey>("mrr");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = React.useState<PageSize>(12);
  const [page, setPage] = React.useState(1);
  const [visibleCols, setVisibleCols] = React.useState<Set<ColumnKey>>(
    new Set(ALL_COLUMNS.map((c) => c.key)),
  );
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = React.useState<"export" | "archive" | null>(null);
  const [bulkConfirmText, setBulkConfirmText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const hydratedRef = React.useRef(false);

  // Restore URL hash state on mount (?sort=mrr.desc&filter=active,trialing&page=2&size=24&cols=…).
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.replace(/^#/, "");
    if (raw) {
      const params = new URLSearchParams(raw);
      const sort = params.get("sort");
      if (sort) {
        const [k, d] = sort.split(".");
        if (COLUMN_KEYS.includes(k as ColumnKey)) {
          const def = ALL_COLUMNS.find((c) => c.key === k);
          if (def?.sortable) setSortKey(k as SortKey);
        }
        if (d === "asc" || d === "desc") setSortDir(d);
      }
      const filter = params.get("filter");
      if (filter) {
        const next = new Set<Status>();
        for (const v of filter.split(",")) {
          if ((STATUS_KEYS as readonly string[]).includes(v)) next.add(v as Status);
        }
        if (next.size > 0) setStatusFilter(next);
      }
      const sz = params.get("size");
      if (sz) {
        const n = Number(sz) as PageSize;
        if ((PAGE_SIZE_OPTIONS as readonly number[]).includes(n)) setPageSize(n);
      }
      const pg = params.get("page");
      if (pg) {
        const n = Number(pg);
        if (Number.isFinite(n) && n >= 1) setPage(n);
      }
      const cols = params.get("cols");
      if (cols) {
        const next = new Set<ColumnKey>(ALWAYS_COLUMN_KEYS);
        for (const v of cols.split(",")) {
          if ((COLUMN_KEYS as readonly string[]).includes(v)) next.add(v as ColumnKey);
        }
        if (next.size > 0) setVisibleCols(next);
      }
    }
    hydratedRef.current = true;
  }, []);

  // Persist state to URL hash.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydratedRef.current) return;
    const params = new URLSearchParams();
    params.set("sort", `${sortKey}.${sortDir}`);
    if (statusFilter.size > 0) {
      params.set(
        "filter",
        STATUS_KEYS.filter((s) => statusFilter.has(s)).join(","),
      );
    }
    if (page !== 1) params.set("page", String(page));
    if (pageSize !== 12) params.set("size", String(pageSize));
    // Only persist cols when user has hidden something (i.e. < full set).
    if (visibleCols.size !== ALL_COLUMNS.length) {
      params.set(
        "cols",
        COLUMN_KEYS.filter((k) => visibleCols.has(k)).join(","),
      );
    }
    const next = `${window.location.pathname}${window.location.search}${params.toString() ? "#" + params.toString() : ""}`;
    window.history.replaceState(null, "", next);
  }, [sortKey, sortDir, statusFilter, page, pageSize, visibleCols]);

  React.useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 220);
    return () => window.clearTimeout(t);
  }, []);

  const filtered = React.useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return ACCOUNTS.filter((r) => {
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false;
      if (!q) return true;
      return (
        r.account.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q)
      );
    });
  }, [deferredQuery, statusFilter]);

  const sorted = React.useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "account":
          cmp = a.account.localeCompare(b.account);
          break;
        case "owner":
          cmp = a.ownerName.localeCompare(b.ownerName);
          break;
        case "plan": {
          const order: Plan[] = ["starter", "team", "scale", "enterprise"];
          cmp = order.indexOf(a.plan) - order.indexOf(b.plan);
          break;
        }
        case "mrr":
          cmp = a.mrr - b.mrr;
          break;
        case "seats":
          cmp = a.seats - b.seats;
          break;
        case "status": {
          const order: Status[] = ["active", "trialing", "delinquent", "churned"];
          cmp = order.indexOf(a.status) - order.indexOf(b.status);
          break;
        }
        case "region":
          cmp = a.region.localeCompare(b.region);
          break;
        case "lastActive":
          cmp = new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
          break;
        default:
          cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;

  // ── Virtualization scaffolding ──────────────────────────────────────────
  // The 12-row dataset renders fully today, but the indirection below is the
  // one-line swap point for `react-window` (or an IntersectionObserver-based
  // approach). Compute a `[virtualOffset, virtualLimit]` window into the
  // already-paginated rows; render only that slice. To swap in real
  // virtualization: replace these two values with the visible-range numbers
  // your virtualizer hands back (e.g. `useVirtualizer().range`).
  const virtualOffset = 0;
  const virtualLimit = pageSize;
  const pageRows = sorted.slice(pageStart, pageStart + pageSize);
  const visibleRows = pageRows.slice(virtualOffset, virtualOffset + virtualLimit);

  // Reset to page 1 whenever the query / filter / pageSize set changes.
  React.useEffect(() => {
    setPage(1);
  }, [deferredQuery, statusFilter, pageSize, sortKey, sortDir]);

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const someOnPageSelected =
    !allOnPageSelected && pageRows.some((r) => selected.has(r.id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "account" || key === "owner" || key === "region" ? "asc" : "desc");
    }
  }

  function toggleStatus(s: Status) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage(allOn: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) {
        for (const r of pageRows) next.delete(r.id);
      } else {
        for (const r of pageRows) next.add(r.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function clearQueryAndFilters() {
    setQuery("");
    setStatusFilter(new Set());
  }

  function handleColToggle(c: ColumnKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(c)) {
        // Don't allow hiding "always-on" columns.
        const def = ALL_COLUMNS.find((x) => x.key === c);
        if (def?.always) return prev;
        next.delete(c);
      } else {
        next.add(c);
      }
      return next;
    });
  }

  // Deterministic-by-id 12% fail rate. Same selection → same outcome; lets the
  // plate demonstrate an error-recovery path without flake.
  function bulkFailure(ids: Iterable<string>): { failedIds: string[]; failedCount: number } {
    const failed: string[] = [];
    for (const id of ids) {
      // Cheap deterministic hash of the id, modulo 100, < 12 → fail.
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
      if (Math.abs(h) % 100 < 12) failed.push(id);
    }
    return { failedIds: failed, failedCount: failed.length };
  }

  function executeBulk(kind: "export" | "archive") {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setConfirmBulk(null);
      setBulkConfirmText("");
      const { failedCount } = bulkFailure(selected);
      if (failedCount > 0) {
        const verb = kind === "archive" ? "archive" : "export";
        setFeedError(true);
        setFeedErrorMessage(
          `${failedCount} of ${selected.size} row${selected.size === 1 ? "" : "s"} failed to ${verb}. Retry from the bulk bar — or clear the selection.`,
        );
        toast({
          title: `${failedCount} of ${selected.size} failed to ${verb}.`,
          status: "error",
        });
        return;
      }
      setFeedError(false);
      setFeedErrorMessage(null);
      if (kind === "archive") {
        toast({ title: `${selected.size} account${selected.size === 1 ? "" : "s"} archived.`, status: "success" });
        clearSelection();
      } else {
        toast({ title: `Export queued · ${selected.size} rows · CSV will email when ready.`, status: "success" });
      }
    }, 600);
  }

  const visibleColDefs = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));

  const focused = ACCOUNTS.find((r) => r.id === detailId) ?? null;

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full min-h-0 flex-col">
        {/* Top rail */}
        <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2.5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Accounts ledger
            </span>
            <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
            <span
              className="font-display text-[15px] italic leading-none text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 28, "SOFT" 30' }}
            >
              {ACCOUNTS.length} customers · MRR {fmtMRR(ACCOUNTS.reduce((s, r) => s + r.mrr, 0))}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] tabular-nums">
            Updated {fmtClock(NOW)} · refresh q5m
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex shrink-0 flex-col gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 min-[768px]:flex-row min-[768px]:items-center min-[768px]:gap-3 min-[768px]:px-6">
          <div className="relative min-[768px]:flex-1 min-[768px]:max-w-[320px]">
            <label htmlFor="data-table-search" className="sr-only">
              Search accounts
            </label>
            <Search
              size={13}
              strokeWidth={1.6}
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              id="data-table-search"
              type="search"
              aria-label="Search accounts"
              placeholder="Search account, owner, ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] pl-8 pr-8 text-[13px] outline-none focus:border-[var(--color-border-strong)]"
            />
            {(query || statusFilter.size > 0) && (
              <button
                type="button"
                onClick={clearQueryAndFilters}
                aria-label="Clear search and filters"
                className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              >
                <X size={11} strokeWidth={1.6} />
              </button>
            )}
          </div>

          {/* Status filter chips. Counts hide below 480px to keep the toolbar
              from overflowing at 375px; reduced horizontal padding too. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(["active", "trialing", "delinquent", "churned"] as Status[]).map((s) => {
              const count = ACCOUNTS.filter((r) => r.status === s).length;
              const active = statusFilter.has(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-xs)] border px-1.5 font-mono text-[10px] uppercase tracking-[0.16em] outline-none transition-[border-color,background-color,color] duration-[120ms] ease-out min-[480px]:px-2",
                    active
                      ? "border-[var(--color-text)] bg-[var(--color-surface-2)] text-[var(--color-text)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
                  )}
                >
                  <span
                    aria-hidden
                    className="block h-1.5 w-1.5 rounded-full"
                    style={{ background: STATUS_INK[s] }}
                  />
                  {STATUS_LABEL[s]}
                  <span className="hidden opacity-70 tabular-nums min-[480px]:inline">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Menu
              ariaLabel="Column visibility"
              placement="bottom-end"
              items={ALL_COLUMNS.map((c) => ({
                type: "item" as const,
                label: c.label,
                onSelect: () => handleColToggle(c.key),
                glyph: visibleCols.has(c.key) ? (
                  <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[var(--color-text)]" />
                ) : (
                  <span aria-hidden className="block h-1.5 w-1.5 rounded-full border border-[var(--color-border-strong)]" />
                ),
                disabled: c.always,
              }))}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] outline-none hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
                  aria-label="Toggle columns"
                >
                  <Columns3 size={12} strokeWidth={1.6} />
                  Columns
                </button>
              }
            />
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] outline-none hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              <SlidersHorizontal size={12} strokeWidth={1.6} />
              View
            </button>
          </div>
        </div>

        {/* Bulk-action bar — always mounted; data-state drives slide-in/out
            (200ms enter / 120ms exit, toast vocabulary). Closed state uses
            display:none so it doesn't take vertical space when nothing's
            selected. */}
        <BulkActionBar
          open={selected.size > 0}
          count={selected.size}
          onExport={() => setConfirmBulk("export")}
          onArchive={() => setConfirmBulk("archive")}
          onClear={clearSelection}
        />

        {feedError && (
          <ErrorState
            variant="banner"
            title={feedErrorMessage ? "Bulk action partially failed." : "Ledger feed temporarily unavailable."}
            body={
              feedErrorMessage
                ?? "Showing cached rows from 14:01 — Activity column may be slightly stale."
            }
            lastSync="14:01"
            onRetry={() => {
              setFeedError(false);
              setFeedErrorMessage(null);
            }}
            onDismiss={() => {
              setFeedError(false);
              setFeedErrorMessage(null);
            }}
          />
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <LoadingTable cols={visibleColDefs} />
          ) : sorted.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 py-10">
              {query || statusFilter.size > 0 ? (
                <EmptyState
                  eyebrow="filtered ledger"
                  title="No accounts match these filters."
                  body="Try clearing the search or dropping a status chip to widen the view."
                  action={{ label: "Clear filters", onClick: clearQueryAndFilters, variant: "ghost" }}
                  secondary={
                    <button
                      type="button"
                      onClick={() => setFeedError(true)}
                      className="font-mono text-[10px] uppercase tracking-[0.18em] hover:text-[var(--color-text)]"
                    >
                      Simulate feed error
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  eyebrow="ledger"
                  title="No customer accounts yet."
                  body="Once a workspace activates, it will appear here with plan, MRR, and activity."
                />
              )}
            </div>
          ) : (
            <div className="min-w-[920px]">
              <DataTableGrid
                cols={visibleColDefs}
                rows={visibleRows}
                rowIndexOffset={virtualOffset}
                selected={selected}
                allOnPageSelected={allOnPageSelected}
                someOnPageSelected={someOnPageSelected}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                onTogglePage={() => togglePage(allOnPageSelected)}
                onToggleRow={toggleRow}
                onOpenRow={(id) => setDetailId(id)}
              />
            </div>
          )}
        </div>

        {/* Pagination footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <span>
              <span className="tabular-nums text-[var(--color-text)]">
                {sorted.length === 0 ? 0 : pageStart + 1}–
                {Math.min(pageStart + pageSize, sorted.length)}
              </span>{" "}
              of <span className="tabular-nums text-[var(--color-text)]">{sorted.length}</span>
            </span>
            <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
            <label className="inline-flex items-center gap-1.5">
              Rows
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                aria-label="Rows per page"
                className="h-6 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-text)] outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-1.5">
            <span>
              Page <span className="tabular-nums text-[var(--color-text)]">{safePage}</span> of{" "}
              <span className="tabular-nums text-[var(--color-text)]">{totalPages}</span>
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-disabled={safePage === 1}
              aria-label="Previous page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] outline-none hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] disabled:opacity-40"
            >
              <ChevronLeft size={12} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-disabled={safePage === totalPages}
              aria-label="Next page"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] outline-none hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] disabled:opacity-40"
            >
              <ChevronRight size={12} strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </div>

      {/* Row detail modal */}
      {focused && (
        <AccountDetail
          account={focused}
          onClose={() => setDetailId(null)}
        />
      )}

      {/* Bulk-action confirmation */}
      <BulkConfirm
        kind={confirmBulk}
        count={selected.size}
        typed={bulkConfirmText}
        onTypedChange={setBulkConfirmText}
        busy={busy}
        onClose={() => {
          setConfirmBulk(null);
          setBulkConfirmText("");
        }}
        onConfirm={() => confirmBulk && executeBulk(confirmBulk)}
      />
    </div>
  );
}

/* ────────────────────────── bulk-action bar ────────────────────────── */

/**
 * Always-mounted bulk action bar. Drives enter/exit transitions via
 * `data-state="open" | "closed"` and `display:none` on closed so it
 * doesn't take vertical space when nothing is selected.
 *
 * Motion vocabulary: 200ms enter / 120ms exit (toast-style), transform
 * + opacity only — no animated geometry. Matches the system motion budget.
 */
function BulkActionBar({
  open,
  count,
  onExport,
  onArchive,
  onClear,
}: {
  open: boolean;
  count: number;
  onExport: () => void;
  onArchive: () => void;
  onClear: () => void;
}) {
  // Track the last non-zero count so the closing animation still shows the
  // right number even after `selected` becomes 0.
  const [displayCount, setDisplayCount] = React.useState(count);
  React.useEffect(() => {
    if (count > 0) setDisplayCount(count);
  }, [count]);
  return (
    <div
      data-state={open ? "open" : "closed"}
      role="region"
      aria-label="Selected rows actions"
      aria-hidden={!open}
      className={cn(
        "shrink-0 border-b border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-accent-2)_5%,var(--color-surface))] px-6 py-2",
        // data-state controls the visibility + animation. Closed → display:none
        // so layout collapses; open → flex with transition on transform/opacity.
        "data-[state=closed]:hidden data-[state=open]:flex flex-wrap items-center gap-3",
        "data-[state=open]:translate-y-0 data-[state=open]:opacity-100",
        "data-[state=closed]:-translate-y-1 data-[state=closed]:opacity-0",
        "transition-[transform,opacity] duration-[200ms] ease-out",
        "data-[state=closed]:duration-[120ms]",
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)]">
        <span className="tabular-nums">{displayCount}</span> selected
      </span>
      <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
      <button
        type="button"
        onClick={onExport}
        className="inline-flex h-7 items-center rounded-[var(--radius-xs)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)] outline-none hover:bg-[var(--color-text)] hover:text-[var(--color-bg)]"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={onArchive}
        className="inline-flex h-7 items-center rounded-[var(--radius-xs)] border border-[var(--color-accent)] bg-[var(--color-bg)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)] outline-none hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)]"
      >
        Archive
      </button>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        Clear selection
      </button>
    </div>
  );
}

/* ────────────────────────── grid + cells ────────────────────────── */

function DataTableGrid({
  cols,
  rows,
  rowIndexOffset = 0,
  selected,
  allOnPageSelected,
  someOnPageSelected,
  sortKey,
  sortDir,
  onSort,
  onTogglePage,
  onToggleRow,
  onOpenRow,
}: {
  cols: typeof ALL_COLUMNS[number][];
  rows: Account[];
  rowIndexOffset?: number;
  selected: Set<string>;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onTogglePage: () => void;
  onToggleRow: (id: string) => void;
  onOpenRow: (id: string) => void;
}) {
  const gridTemplate = ["32px", ...cols.map((c) => c.width)].join(" ");

  return (
    <div role="grid" aria-rowcount={rows.length + 1} className="min-w-full">
      {/* Sticky head */}
      <div
        role="row"
        className="sticky top-0 z-20 grid border-b border-[var(--color-border)] bg-[var(--color-surface-2)] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div role="columnheader" className="sticky left-0 z-30 flex items-center justify-center border-r border-[var(--color-border)] bg-[var(--color-surface-2)] py-2">
          <Checkbox
            checked={allOnPageSelected}
            indeterminate={someOnPageSelected}
            onChange={onTogglePage}
            ariaLabel={allOnPageSelected ? "Deselect all on page" : "Select all on page"}
          />
        </div>
        {cols.map((c, i) => (
          <div
            key={c.key}
            role="columnheader"
            aria-sort={c.sortable && sortKey === c.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
            data-sortable={c.sortable ? "true" : "false"}
            className={cn(
              "flex items-center px-3 py-2",
              c.align === "right" ? "justify-end" : "justify-start",
              i === 0 && "sticky left-[32px] z-20 border-r border-[var(--color-border)] bg-[var(--color-surface-2)]",
            )}
          >
            {c.sortable ? (
              <button
                type="button"
                onClick={() => onSort(c.key)}
                className="inline-flex items-center gap-1 outline-none hover:text-[var(--color-text)] focus-visible:text-[var(--color-text)]"
              >
                {c.label}
                <SortGlyph active={sortKey === c.key} dir={sortDir} />
              </button>
            ) : (
              <span style={{ cursor: "default" }}>{c.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* Body */}
      {rows.map((row, i) => {
        const isSelected = selected.has(row.id);
        return (
          <div
            key={row.id}
            role="row"
            aria-rowindex={rowIndexOffset + i + 2}
            aria-selected={isSelected}
            className={cn(
              "group grid border-b border-[var(--color-border)] transition-[background-color] duration-[120ms] ease-out",
              isSelected
                ? "bg-[color-mix(in_oklch,var(--color-accent-2)_4%,var(--color-surface))]"
                : "hover:bg-[var(--color-surface)]",
            )}
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div
              role="gridcell"
              className={cn(
                "sticky left-0 z-10 flex items-center justify-center border-r border-[var(--color-border)] py-2",
                isSelected
                  ? "bg-[color-mix(in_oklch,var(--color-accent-2)_4%,var(--color-surface))]"
                  : "bg-[var(--color-bg)] group-hover:bg-[var(--color-surface)]",
              )}
            >
              <Checkbox
                checked={isSelected}
                onChange={() => onToggleRow(row.id)}
                ariaLabel={`${isSelected ? "Deselect" : "Select"} ${row.account}`}
              />
            </div>

            {cols.map((c, ci) => {
              const isFirst = ci === 0;
              return (
                <div
                  key={c.key}
                  role="gridcell"
                  className={cn(
                    "flex items-center px-3 py-2 text-[12.5px]",
                    c.align === "right" ? "justify-end tabular-nums" : "justify-start",
                    isFirst &&
                      cn(
                        "sticky left-[32px] z-10 border-r border-[var(--color-border)]",
                        isSelected
                          ? "bg-[color-mix(in_oklch,var(--color-accent-2)_4%,var(--color-surface))]"
                          : "bg-[var(--color-bg)] group-hover:bg-[var(--color-surface)]",
                      ),
                  )}
                >
                  <CellContent col={c.key} row={row} onOpen={() => onOpenRow(row.id)} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function CellContent({ col, row, onOpen }: { col: ColumnKey; row: Account; onOpen: () => void }) {
  switch (col) {
    case "account":
      return (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
        >
          <span
            aria-hidden
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] font-mono text-[9px] tracking-[0.06em] text-[var(--color-text)]"
            title={row.ownerName}
          >
            {row.ownerInitials}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[var(--color-text)] hover:underline" title={row.account}>
              {row.account}
            </span>
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {row.id}
            </span>
          </span>
        </button>
      );
    case "owner":
      return (
        <span className="truncate text-[var(--color-text)]" title={row.ownerName}>
          {row.ownerName}
        </span>
      );
    case "plan":
      return (
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {PLAN_LABEL[row.plan]}
        </span>
      );
    case "mrr":
      return (
        <span title={fmtFullMRR(row.mrr)} className={row.mrr === 0 ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"}>
          {fmtMRR(row.mrr)}
        </span>
      );
    case "trail":
      return <MrrSparkline trail={row.mrrTrail} />;
    case "seats":
      return (
        <span className="text-[var(--color-text)]" title={`${row.seats} seats · signed up ${fmtDate(row.signedUp)}`}>
          {row.seats.toLocaleString()}
        </span>
      );
    case "status":
      return <StatusChip status={row.status} />;
    case "region":
      return (
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {row.region}
        </span>
      );
    case "lastActive": {
      const isCritical = row.status === "delinquent" || row.status === "churned";
      const absolute = fmtAbsoluteShort(row.lastActive);
      const fullTitle = fmtDate(row.lastActive) + " " + new Date(row.lastActive).toISOString().slice(11, 16) + " UTC";
      // Critical-state rows surface the absolute timestamp inline — never
      // hide it behind hover. Mono 10px clock value sits beneath the relative.
      if (isCritical) {
        return (
          <span className="flex min-w-0 flex-col leading-tight" title={fullTitle}>
            <span className="text-[var(--color-text-muted)]">{fmtRelative(row.lastActive)}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] tabular-nums text-[var(--color-text-muted)]">
              {absolute}
            </span>
          </span>
        );
      }
      return (
        <span className="text-[var(--color-text-muted)]" title={fullTitle}>
          {fmtRelative(row.lastActive)}
        </span>
      );
    }
    default:
      return null;
  }
}

function MrrSparkline({ trail }: { trail: number[] }) {
  if (trail.every((v) => v === 0)) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        —
      </span>
    );
  }
  const data: TracePoint[] = trail.map((y, x) => ({ x, y }));
  const last = trail[trail.length - 1];
  const prev = trail[trail.length - 2] ?? last;
  const trendUp = last > prev;
  const trendFlat = last === prev;
  const color = trendFlat
    ? "var(--color-text-muted)"
    : trendUp
      ? "var(--color-text)"
      : "var(--color-accent)";
  return (
    <span className="inline-flex items-center" aria-label={`MRR trend, latest ${trail[trail.length - 1].toLocaleString()}`}>
      <Trace
        data={data}
        width={88}
        height={22}
        strokeColor={color}
        strokeWidth={1}
        dots={[
          {
            index: data.length - 1,
            color,
            radius: 1.6,
          },
        ]}
        ariaLabel={`12 month MRR sparkline, latest ${trail[trail.length - 1]}`}
      />
    </span>
  );
}

function StatusChip({ status }: { status: Status }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]"
      style={{ borderColor: STATUS_INK[status], color: STATUS_INK[status] }}
    >
      <span aria-hidden className="block h-1.5 w-1.5 rounded-full" style={{ background: STATUS_INK[status] }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Sort glyph — pure dot+tick vocabulary, no chevrons.
 *
 * - Sortable, not active: a small filled dot (3px radius, 8px box). The
 *   register mark.
 * - Active asc: the dot grows a tick that points up (chevron-shaped path
 *   drawn from two strokes meeting at the top). It reads as a ↥ register.
 * - Active desc: same tick rotated 180° (meeting at the bottom).
 *
 * The geometry stays static (no animated `points`/`d`); the only motion
 * is a 200ms colour swap when the column becomes active. Active mark is
 * --color-text; inactive is --color-border-strong. Walks the line of the
 * locked invariant: dots punctuate, lines connect, no chevron icons.
 */
function SortGlyph({ active, dir }: { active: boolean; dir: SortDir }) {
  const stroke = active ? "var(--color-text)" : "var(--color-border-strong)";
  const fill = active ? "var(--color-text)" : "var(--color-border-strong)";
  return (
    <svg
      aria-hidden
      width={10}
      height={10}
      viewBox="0 0 10 10"
      className="ml-0.5 shrink-0 transition-[color] duration-[200ms] ease-out"
      style={{ color: stroke }}
    >
      {!active && (
        // Resting register-dot: small filled dot at centre.
        <circle cx={5} cy={5} r={1.5} fill={fill} />
      )}
      {active && dir === "asc" && (
        // Tick pointing up: dot anchor at bottom, two strokes meet at apex.
        <g>
          <circle cx={5} cy={8} r={1} fill={fill} />
          <path
            d="M2.5 5.5 L5 3 L7.5 5.5"
            stroke={stroke}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      )}
      {active && dir === "desc" && (
        // Tick pointing down: dot anchor at top, two strokes meet at the floor.
        <g>
          <circle cx={5} cy={2} r={1} fill={fill} />
          <path
            d="M2.5 4.5 L5 7 L7.5 4.5"
            stroke={stroke}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      )}
    </svg>
  );
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  const ref = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return (
    <label className="inline-flex h-4 w-4 cursor-pointer items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "relative block h-3.5 w-3.5 overflow-hidden rounded-[3px] border transition-[border-color,background-color] duration-[120ms] ease-out",
          // Fully-checked: solid fill. Indeterminate: bordered, paper bg —
          // the half-fill rendered inside as a clip-path inset(0 50% 0 0)
          // (left half filled, right half paper). Reads at-a-glance as
          // "some, not all" without re-using the full-select look.
          checked && !indeterminate
            ? "border-[var(--color-text)] bg-[var(--color-text)]"
            : indeterminate
              ? "border-[var(--color-text)] bg-[var(--color-bg)]"
              : "border-[var(--color-border-strong)] bg-[var(--color-bg)] peer-hover:border-[var(--color-text)]",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-accent-2)] peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[var(--color-bg)]",
        )}
      >
        {checked && !indeterminate && (
          <svg viewBox="0 0 12 12" className="h-full w-full" fill="none">
            <path d="M3 6.4 L5 8.4 L9 4" stroke="var(--color-bg)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {indeterminate && (
          <>
            {/* Left-half fill — clip-path inset(0 50% 0 0). Half-filled
                square reads as "partial selection" without aliasing the
                solid full-select. */}
            <span
              aria-hidden
              className="absolute inset-0 bg-[var(--color-text)]"
              style={{ clipPath: "inset(0 50% 0 0)" }}
            />
            {/* Centered 6×2 dash overlaid on top, in paper ink so it
                punches through both halves. */}
            <svg viewBox="0 0 12 12" className="absolute inset-0 h-full w-full" fill="none">
              <path d="M3 6 L9 6" stroke="var(--color-text)" strokeWidth={1.6} strokeLinecap="round" />
            </svg>
          </>
        )}
      </span>
    </label>
  );
}

/* ────────────────────────── loading ────────────────────────── */

function LoadingTable({ cols }: { cols: typeof ALL_COLUMNS[number][] }) {
  const gridTemplate = ["32px", ...cols.map((c) => c.width)].join(" ");
  return (
    <div className="min-w-[920px]" aria-hidden>
      <div
        className="grid border-b border-[var(--color-border)] bg-[var(--color-surface-2)]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="border-r border-[var(--color-border)] py-2" />
        {cols.map((c, i) => (
          <div key={c.key} className="px-3 py-2">
            <Skeleton width={Math.max(40, 64 - i * 4)} height={10} density={0.05} seed={i + 1} />
          </div>
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, r) => (
        <div
          key={r}
          className="grid border-b border-[var(--color-border)]"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <div className="border-r border-[var(--color-border)] py-3" />
          {cols.map((c, i) => (
            <div key={c.key} className="px-3 py-3">
              <Skeleton
                width={c.key === "trail" ? 88 : c.key === "account" ? 160 : 70}
                height={c.key === "trail" ? 18 : 12}
                density={0.05}
                seed={r * 11 + i + 7}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────── account detail ────────────────────────── */

function AccountDetail({ account, onClose }: { account: Account; onClose: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(true);
  const handleChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose();
  };
  const data: TracePoint[] = account.mrrTrail.map((y, x) => ({ x, y }));
  const yMax = Math.max(...account.mrrTrail) || 1;
  const yMin = 0;
  return (
    <Modal
      open={open}
      onOpenChange={handleChange}
      placement="right"
      size="md"
      ariaLabel={`${account.account} detail`}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Account · {account.id}
          </p>
          <h2
            className="mt-1 font-display text-[22px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            {account.account}
          </h2>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            {PLAN_LABEL[account.plan]} · {account.region} · signed up {fmtDate(account.signedUp)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              MRR
            </p>
            <p className="mt-1 font-mono text-[28px] tabular-nums text-[var(--color-text)]">
              {fmtFullMRR(account.mrr)}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {account.seats} seat{account.seats === 1 ? "" : "s"}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Status
            </p>
            <div className="mt-2">
              <StatusChip status={account.status} />
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Last active {fmtRelative(account.lastActive)}
            </p>
          </div>
        </div>

        <div className="border-b border-[var(--color-border)] px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            12-month MRR
          </p>
          <div className="mt-2">
            <Trace
              data={data}
              width={420}
              height={84}
              yDomain={[yMin, yMax + (yMax - yMin) * 0.1 || 1]}
              strokeColor="var(--color-text)"
              strokeWidth={1.1}
              dots={data.map((p, i) => ({
                index: i,
                color:
                  i === data.length - 1
                    ? "var(--color-accent-2)"
                    : "var(--color-text)",
                radius: i === data.length - 1 ? 2.4 : 1.6,
              }))}
              ariaLabel="12 month MRR detail"
            />
          </div>
          <div className="mt-1 grid grid-cols-12 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] tabular-nums">
            {["12m", "11", "10", "9", "8", "7", "6", "5", "4", "3", "2", "now"].map((l) => (
              <span key={l} className="text-center">
                {l}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Account owner
          </p>
          <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <span
              aria-hidden
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] font-mono text-[11px] tracking-[0.06em] text-[var(--color-text)]"
            >
              {account.ownerInitials}
            </span>
            <div>
              <p className="text-[13px] text-[var(--color-text)]">{account.ownerName}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Owner · {account.region}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <ModalClose
            render={
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] transition-colors duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
              >
                Close
              </button>
            }
          />
          <button
            type="button"
            onClick={() =>
              toast({
                title: "Console deep-link unavailable in preview.",
                status: "info",
              })
            }
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-text)] bg-[var(--color-text)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-bg)] outline-none transition-colors duration-[120ms] ease-out focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]"
          >
            Open in console
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ────────────────────────── bulk confirm ────────────────────────── */

function BulkConfirm({
  kind,
  count,
  typed,
  onTypedChange,
  busy,
  onClose,
  onConfirm,
}: {
  kind: "export" | "archive" | null;
  count: number;
  typed: string;
  onTypedChange: (s: string) => void;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const open = kind !== null;
  const isArchive = kind === "archive";
  const word = isArchive ? "archive" : "export";
  const ok = !isArchive || (typed.trim().toLowerCase() === word && !busy);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (open && isArchive) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
  }, [open, isArchive]);
  return (
    <Modal open={open} onOpenChange={(o) => (!o ? onClose() : undefined)} placement="center" size="sm" ariaLabel={`Confirm ${word}`}>
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <p
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.18em]",
            isArchive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]",
          )}
        >
          {isArchive ? "Destructive action" : "Bulk export"}
        </p>
        <ModalTitle
          className="mt-1 font-display text-[20px] italic leading-tight tracking-[-0.02em]"
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          {isArchive
            ? `Archive ${count} account${count === 1 ? "" : "s"}?`
            : `Export ${count} account${count === 1 ? "" : "s"} to CSV?`}
        </ModalTitle>
        <ModalDescription className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          {isArchive
            ? "Archived accounts disappear from the active ledger and stop billing. They can be restored within 30 days from the archive view."
            : "We'll generate a CSV with the columns currently visible and email it to you when ready. Typically under 30 seconds."}
        </ModalDescription>
      </div>
      {isArchive && (
        <div className="px-6 py-4">
          <label
            htmlFor="bulk-confirm"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
          >
            Type <span className="not-uppercase tracking-normal text-[var(--color-text)]">archive</span> to confirm
          </label>
          <input
            id="bulk-confirm"
            ref={inputRef}
            value={typed}
            onChange={(e) => onTypedChange(e.target.value)}
            disabled={busy}
            className="mt-2 h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 font-mono text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-strong)]"
          />
        </div>
      )}
      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
        <ModalClose
          render={
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] transition-colors duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
          }
        />
        <button
          type="button"
          onClick={onConfirm}
          disabled={!ok || busy}
          className={cn(
            "inline-flex h-9 items-center rounded-[var(--radius-sm)] border px-3 font-mono text-[10px] uppercase tracking-[0.18em] outline-none transition-colors duration-[120ms] ease-out",
            isArchive
              ? ok
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]"
              : "border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]",
          )}
        >
          {busy ? (isArchive ? "Archiving…" : "Queueing…") : isArchive ? "Archive" : "Export"}
        </button>
      </div>
    </Modal>
  );
}
