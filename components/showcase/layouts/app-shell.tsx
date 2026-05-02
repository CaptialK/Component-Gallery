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
  Sparkles,
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

const ROWS = [
  { id: "DOC-9241", title: "Invoicing schema overhaul", status: "In review", owner: "MR", updated: "2h" },
  { id: "DOC-9237", title: "Onboarding email re-sequence", status: "Drafting", owner: "JT", updated: "5h" },
  { id: "DOC-9230", title: "Q3 retention deep dive", status: "Approved", owner: "AH", updated: "yesterday" },
  { id: "DOC-9228", title: "Pricing experiment kickoff", status: "Blocked", owner: "MR", updated: "yesterday" },
  { id: "DOC-9201", title: "API rate-limit migration plan", status: "Drafting", owner: "RG", updated: "2d" },
  { id: "DOC-9192", title: "Outage retro: 04-29", status: "Approved", owner: "JT", updated: "3d" },
];

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
          <div
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-[var(--radius-xs)] bg-[var(--color-accent)] font-mono text-[11px] font-medium text-[var(--color-accent-fg)]"
          >
            S
          </div>
          {!collapsed && (
            <span className="font-mono text-[12px] tracking-tight">stipple.lab</span>
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
              aria-hidden
              className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-accent)] font-mono text-[10px] text-[var(--color-accent-fg)]"
            >
              MR
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] px-6 pt-6 pb-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                <Sparkles size={11} strokeWidth={1.6} />
                <span>Recently active</span>
              </div>
              <h1 className="mt-1 text-xl font-medium tracking-[-0.02em]">
                Documents
              </h1>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Files updated in the last 14 days across your projects.
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
                    >
                      <td className="px-6 py-2.5 font-mono text-[11px] text-[var(--color-text-muted)]">
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
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-surface-2)] font-mono text-[10px] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
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
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-surface-2)] font-mono text-[10px] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
                      {who}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[var(--color-text)]">
                        <span className="text-[var(--color-text-muted)]">{who} </span>
                        {what}
                      </div>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; ring: string }> = {
    "In review": {
      color: "var(--color-text)",
      bg: "var(--color-surface-2)",
      ring: "var(--color-border)",
    },
    Drafting: {
      color: "var(--color-text-muted)",
      bg: "var(--color-surface-2)",
      ring: "var(--color-border)",
    },
    Approved: {
      color: "color-mix(in oklch, var(--color-success) 70%, var(--color-text))",
      bg: "color-mix(in oklch, var(--color-success) 12%, var(--color-bg))",
      ring: "color-mix(in oklch, var(--color-success) 30%, var(--color-border))",
    },
    Blocked: {
      color: "color-mix(in oklch, var(--color-danger) 70%, var(--color-text))",
      bg: "color-mix(in oklch, var(--color-danger) 12%, var(--color-bg))",
      ring: "color-mix(in oklch, var(--color-danger) 30%, var(--color-border))",
    },
  };
  const t = map[status] ?? map.Drafting;
  return (
    <span
      className="inline-flex h-5 items-center gap-1.5 rounded-[var(--radius-xs)] px-1.5 font-mono text-[10px] uppercase tracking-[0.06em] ring-1"
      style={{ color: t.color, background: t.bg, boxShadow: `inset 0 0 0 1px ${t.ring}` }}
    >
      <span aria-hidden className="h-1 w-1 rounded-full" style={{ background: t.color }} />
      {status}
    </span>
  );
}
