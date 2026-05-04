"use client";

import { useState } from "react";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  FileText,
  Folder,
  Home,
  Inbox,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV: { label: string; icon: typeof Home; count?: number; active?: boolean }[] = [
  { label: "Overview", icon: Home, active: true },
  { label: "Inbox", icon: Inbox, count: 4 },
  { label: "Documents", icon: FileText },
  { label: "Projects", icon: Folder, count: 12 },
  { label: "Members", icon: Users },
];

const PROJECTS = [
  { name: "stipple-press", color: "var(--color-accent)" },
  { name: "atlas-billing", color: "oklch(60% 0.13 145)" },
  { name: "north-warehouse", color: "oklch(72% 0.15 75)" },
  { name: "field-notes", color: "oklch(58% 0.18 270)" },
];

type StatusKey = "In review" | "Drafting" | "Approved" | "Blocked";

const MEMBERS: Record<string, string> = {
  MR: "Mara Reyes",
  JT: "Jules Tanaka",
  AH: "Amir Haddad",
  RG: "Rosa Garcia",
};

const ROWS: { id: string; title: string; status: StatusKey; owner: keyof typeof MEMBERS; updated: string }[] = [
  { id: "DOC-9241", title: "Invoicing schema overhaul", status: "In review", owner: "MR", updated: "2h" },
  { id: "DOC-9237", title: "Onboarding email re-sequence", status: "Drafting", owner: "JT", updated: "5h" },
  { id: "DOC-9230", title: "Q3 retention deep dive", status: "Approved", owner: "AH", updated: "1d" },
  { id: "DOC-9228", title: "Pricing experiment kickoff", status: "Blocked", owner: "MR", updated: "1d" },
  { id: "DOC-9201", title: "API rate-limit migration plan", status: "Drafting", owner: "RG", updated: "2d" },
  { id: "DOC-9192", title: "Outage retro: 04-29", status: "Approved", owner: "JT", updated: "3d" },
];

/** Status palette — single source of truth for the badge AND the legend strip. */
const STATUS_INK: Record<StatusKey, string> = {
  Drafting: "var(--color-text-muted)",
  "In review": "var(--color-text)",
  Approved: "color-mix(in oklch, var(--color-success) 70%, var(--color-text))",
  Blocked: "color-mix(in oklch, var(--color-danger) 70%, var(--color-text))",
};
const STATUS_KEYS: StatusKey[] = ["Drafting", "In review", "Approved", "Blocked"];

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="grid h-full w-full grid-cols-[auto_1fr] bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-2)] transition-[width]",
          collapsed ? "w-14" : "w-[232px]",
        )}
      >
        <div className="flex h-12 items-center gap-2 border-b border-[var(--color-border)] px-3">
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-[var(--radius-xs)] bg-[var(--color-bg)] ring-1 ring-[var(--color-border-strong)]"
          >
            <span
              className="font-display text-[15px] italic leading-none text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              S
            </span>
          </span>
          {!collapsed && (
            <span
              className="font-display text-[14px] italic leading-none text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              stipple
              <span className="text-[var(--color-text-muted)]">.lab</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.label}>
                <a
                  href="#"
                  className={cn(
                    "flex h-7 items-center gap-2 rounded-[var(--radius-sm)] px-2 text-[13px]",
                    item.active
                      ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[inset_0_0_0_1px_var(--color-border)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
                  )}
                >
                  <item.icon size={13} strokeWidth={1.6} />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && item.count != null && (
                    <span className="rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-1 font-mono text-[10px] text-[var(--color-text-muted)]">
                      {item.count}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>

          {!collapsed && (
            <>
              <div className="mt-6 flex items-center justify-between px-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                  Projects
                </span>
                <button
                  type="button"
                  aria-label="New project"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                >
                  <Plus size={11} strokeWidth={1.8} />
                </button>
              </div>
              <ul className="mt-1 space-y-0.5">
                {PROJECTS.map((p) => (
                  <li key={p.name}>
                    <a
                      href="#"
                      className="flex h-7 items-center gap-2 rounded-[var(--radius-sm)] px-2 text-[13px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: p.color }}
                      />
                      <span className="truncate font-mono text-[12px]">{p.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="border-t border-[var(--color-border)] p-2">
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
            )}
          >
            <Settings size={13} strokeWidth={1.6} />
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex h-full min-w-0 flex-col">
        {/* Topbar */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4">
          <div className="flex items-center gap-1.5 font-mono text-xs text-[var(--color-text-muted)]">
            <span>workspace</span>
            <span aria-hidden>/</span>
            <span className="text-[var(--color-text)]">stipple-press</span>
            <span aria-hidden>/</span>
            <span className="text-[var(--color-text)]">documents</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search
                size={12}
                strokeWidth={1.6}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                type="search"
                placeholder="Search…"
                className="h-7 w-44 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] pl-7 pr-7 text-xs placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:outline-none"
              />
              <kbd className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1 font-mono text-[10px] text-[var(--color-text-muted)]">
                ⌘K
              </kbd>
            </div>
            <button
              type="button"
              aria-label="Help"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              <CircleHelp size={13} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="relative inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              <Bell size={13} strokeWidth={1.6} />
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
              />
            </button>
            <span
              title={MEMBERS.MR}
              className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
            >
              MR
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] px-6 pt-6 pb-4">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Recently active
              </div>
              <h1
                className="mt-1 font-display text-[22px] leading-none tracking-[-0.02em] text-[var(--color-text)]"
                style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
              >
                Documents
              </h1>
              <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                Files updated in the last 14 days across your projects.
              </p>
              <StatusLegend />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
              >
                Filter
              </button>
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-2 text-xs text-[var(--color-accent-fg)]"
              >
                <Plus size={11} strokeWidth={1.8} />
                New document
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_280px]">
            <div className="min-w-0 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <th className="px-6 py-2 text-left font-medium font-mono text-[10px] uppercase tracking-[0.1em]">
                      ID
                    </th>
                    <th className="px-6 py-2 text-left font-medium font-mono text-[10px] uppercase tracking-[0.1em]">
                      Title
                    </th>
                    <th className="px-4 py-2 text-left font-medium font-mono text-[10px] uppercase tracking-[0.1em]">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-medium font-mono text-[10px] uppercase tracking-[0.1em]">
                      Owner
                    </th>
                    <th className="px-6 py-2 text-right font-medium font-mono text-[10px] uppercase tracking-[0.1em]">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr
                      key={r.id}
                      className="group relative border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                    >
                      <td className="relative px-6 py-2.5 font-mono text-[11px] text-[var(--color-text-muted)]">
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-[2px] bg-[var(--color-accent-2)] opacity-0 group-hover:opacity-100"
                        />
                        {r.id}
                      </td>
                      <td className="px-6 py-2.5">
                        <a className="hover:underline" href="#">
                          {r.title}
                        </a>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          title={MEMBERS[r.owner]}
                          className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
                        >
                          {r.owner}
                        </span>
                      </td>
                      <td className="px-6 py-2.5 text-right font-mono text-[11px] text-[var(--color-text-muted)]">
                        {r.updated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="hidden border-l border-[var(--color-border)] bg-[var(--color-surface)] lg:block">
              <div className="border-b border-[var(--color-border)] px-4 py-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                  Activity
                </div>
                <div className="mt-1 text-xs text-[var(--color-text)]">Today</div>
              </div>
              <ol className="space-y-3 px-4 py-3 text-xs">
                {[
                  ["MR", "approved Q3 retention deep dive", "11:48"],
                  ["JT", "commented on outage retro", "10:12"],
                  ["AH", "renamed pricing experiment kickoff", "09:21"],
                  ["RG", "linked API rate-limit RFC", "08:55"],
                ].map(([who, what, when], i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      title={MEMBERS[who]}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
                    >
                      {who}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[var(--color-text)]">{what}</div>
                      <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
                        {when}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusKey }) {
  const ink = STATUS_INK[status];
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 font-mono text-[10px] uppercase tracking-[0.06em]"
      style={{ color: ink }}
    >
      <span aria-hidden className="h-1 w-1 rounded-full" style={{ background: ink }} />
      {status}
    </span>
  );
}

/**
 * Legend for the status palette. The single source of truth for colour →
 * meaning so a reader doesn't have to infer "what does the green dot mean."
 */
function StatusLegend() {
  return (
    <div
      role="list"
      aria-label="Status key"
      className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
    >
      <span aria-hidden>Status key</span>
      {STATUS_KEYS.map((s) => (
        <span key={s} role="listitem" className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span
            aria-hidden
            className="h-1 w-1 rounded-full"
            style={{ background: STATUS_INK[s] }}
          />
          {s}
        </span>
      ))}
    </div>
  );
}
