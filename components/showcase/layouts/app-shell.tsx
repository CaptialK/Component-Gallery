"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  FileText,
  Folder,
  Home,
  Inbox,
  Menu as MenuIcon,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Combobox, type ComboboxItem } from "@/components/_kit/combobox";
import { EmptyState } from "@/components/_kit/empty-state";
import { ErrorState } from "@/components/_kit/error-state";
import { Menu, type MenuItem } from "@/components/_kit/menu";
import { Modal } from "@/components/_kit/modal";
import { Popover } from "@/components/_kit/popover";
import { Skeleton } from "@/components/_kit/skeleton";
import { useToast } from "@/components/_kit/toast";

/** Tiny SSR-safe matchMedia hook — see inbox-zero for the same pattern. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const m = window.matchMedia(query);
    const update = () => setMatches(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return matches;
}

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

type NavKey = "Overview" | "Inbox" | "Documents" | "Projects" | "Members";

const NAV: { label: NavKey; icon: typeof Home; count?: number }[] = [
  { label: "Overview", icon: Home },
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

const INBOX_THREADS = [
  { id: "MSG-401", from: "MR", subject: "Re: Q3 retention deep dive — chart axes", preview: "Pushed an axis fix; can you re-skim before approval?", at: "11:48" },
  { id: "MSG-400", from: "AH", subject: "Pricing experiment kickoff stuck on legal", preview: "Legal flagged the disclaimer copy; needs a sign-off path.", at: "10:22" },
  { id: "MSG-399", from: "JT", subject: "Outage retro draft is up for review", preview: "Draft posted, three open items need owners assigned.", at: "09:04" },
  { id: "MSG-398", from: "RG", subject: "API rate-limit migration plan — final read", preview: "All blockers cleared; ready for the green-light meeting.", at: "08:42" },
];

/** Status palette — single source of truth for the badge AND the legend strip. */
const STATUS_INK: Record<StatusKey, string> = {
  Drafting: "var(--color-text-muted)",
  "In review": "var(--color-text)",
  Approved: "color-mix(in oklch, var(--color-success) 70%, var(--color-text))",
  Blocked: "color-mix(in oklch, var(--color-danger) 70%, var(--color-text))",
};
const STATUS_KEYS: StatusKey[] = ["Drafting", "In review", "Approved", "Blocked"];

const SIDEBAR_KEY = "stipple.sidebar.collapsed";

function readNavFromHash(): NavKey {
  if (typeof window === "undefined") return "Overview";
  const m = /[#&]nav=([^&]+)/.exec(window.location.hash);
  const v = m ? decodeURIComponent(m[1]) : "";
  const valid: NavKey[] = ["Overview", "Inbox", "Documents", "Projects", "Members"];
  return (valid as string[]).includes(v) ? (v as NavKey) : "Overview";
}

export default function AppShell() {
  // Sidebar collapsed state — render expanded first to avoid SSR/client hydration
  // mismatch, then read from localStorage post-mount.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      /* swallow */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* swallow */
    }
  }, [collapsed]);

  // Active nav drives the content swap. Persisted in window.location.hash so
  // the URL is shareable / refreshable.
  const [activeNav, setActiveNav] = useState<NavKey>("Overview");
  useEffect(() => {
    setActiveNav(readNavFromHash());
    const onHash = () => setActiveNav(readNavFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const setNav = (n: NavKey) => {
    setActiveNav(n);
    if (typeof window !== "undefined") {
      const hash = `#nav=${encodeURIComponent(n)}`;
      if (window.location.hash !== hash) window.location.hash = hash;
    }
  };

  // Notification unread state.
  const [unread, setUnread] = useState(true);

  // First-paint loading state — drives the skeleton field over the table
  // and the activity rail. Crossfades to real content over 200ms.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), 240);
    return () => window.clearTimeout(id);
  }, []);

  // Mobile drawers + search-sheet state.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 639px)");

  // Row-flash announcement region — set when a search-result row is jumped
  // to. Cleared after 1.2s.
  const [flashAnnounce, setFlashAnnounce] = useState("");

  return (
    <div className="grid h-full w-full grid-cols-[auto_1fr] bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Sidebar — hidden below 640px (mobile uses the drawer). */}
      <aside
        aria-label="Workspace navigation"
        className={cn(
          "hidden h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-2)] transition-[width] duration-[200ms] sm:flex",
          // 640px-1024px: force-collapsed icon-only sidebar regardless of
          // the user's stored preference. ≥1024px: respect `collapsed`.
          collapsed ? "sm:w-12 lg:w-14" : "sm:w-12 lg:w-[232px]",
        )}
        style={{ transitionTimingFunction: PAPER_EASE }}
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
          <span
            className="hidden font-display text-[14px] italic leading-none text-[var(--color-text)] transition-opacity duration-[120ms] ease-out lg:inline"
            style={{
              fontVariationSettings: '"opsz" 24, "SOFT" 30',
              opacity: collapsed ? 0 : 1,
            }}
          >
            stipple
            <span className="text-[var(--color-text-muted)]">.lab</span>
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            className="ml-auto hidden h-6 w-6 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const isActive = activeNav === item.label;
              return (
                <li key={item.label}>
                  <a
                    href={`#nav=${encodeURIComponent(item.label)}`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      setNav(item.label);
                    }}
                    className={cn(
                      "flex h-7 items-center gap-2 rounded-[var(--radius-sm)] px-2 text-[13px] transition-[border-color,box-shadow,background-color] duration-[120ms] ease-out",
                      isActive
                        ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[inset_0_0_0_1px_var(--color-border)]"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
                    )}
                  >
                    <item.icon size={13} strokeWidth={1.6} />
                    <span
                      className="hidden flex-1 truncate transition-opacity duration-[120ms] ease-out lg:inline"
                      style={{ opacity: collapsed ? 0 : 1 }}
                    >
                      {item.label}
                    </span>
                    {item.count != null && (
                      <span
                        className="hidden rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-1 font-mono text-[10px] text-[var(--color-text-muted)] transition-opacity duration-[120ms] ease-out lg:inline"
                        style={{ opacity: collapsed ? 0 : 1 }}
                      >
                        {item.count}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>

          <div
            className="hidden lg:block transition-opacity duration-[120ms] ease-out"
            style={{ opacity: collapsed ? 0 : 1 }}
          >
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
                    onClick={(e) => {
                      e.preventDefault();
                      setNav("Projects");
                    }}
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
          </div>
        </nav>

        <div className="border-t border-[var(--color-border)] p-2">
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
            )}
          >
            <Settings size={13} strokeWidth={1.6} />
            <span
              className="hidden transition-opacity duration-[120ms] ease-out lg:inline"
              style={{ opacity: collapsed ? 0 : 1 }}
            >
              Settings
            </span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex h-full min-w-0 flex-col">
        {/* Topbar */}
        <Topbar
          activeNav={activeNav}
          unread={unread}
          markRead={() => setUnread(false)}
          loading={loading}
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenSearchSheet={() => setSearchSheetOpen(true)}
          onSearchFlash={(label) => setFlashAnnounce(`Jumped to ${label}`)}
        />

        {/* Row-flash sr-live region — used by the search dispatcher to
            announce which row was scrolled into view. */}
        <span aria-live="polite" className="sr-only">
          {flashAnnounce}
        </span>

        {/* Content — animated swap when activeNav changes. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ContentArea
            key={activeNav}
            active={activeNav}
            loading={loading}
            onCompose={() => setNav("Inbox")}
          />
        </div>
      </div>

      {/* Mobile sidebar drawer (<640px). */}
      <Modal
        open={drawerOpen && isMobile}
        onOpenChange={setDrawerOpen}
        placement="left"
        size="md"
        ariaLabel="Workspace navigation"
      >
        <MobileNav
          activeNav={activeNav}
          setNav={(n) => {
            setNav(n);
            setDrawerOpen(false);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      </Modal>

      {/* Mobile search sheet (<640px). */}
      <Modal
        open={searchSheetOpen && isMobile}
        onOpenChange={setSearchSheetOpen}
        placement="bottom"
        size="lg"
        ariaLabel="Search"
      >
        <SearchSheet
          onClose={() => setSearchSheetOpen(false)}
          onPickFlash={(label) => setFlashAnnounce(`Jumped to ${label}`)}
        />
      </Modal>
    </div>
  );
}

/** The drawer body — same nav vocabulary as the desktop sidebar. */
function MobileNav({
  activeNav,
  setNav,
  onClose,
}: {
  activeNav: NavKey;
  setNav: (n: NavKey) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-3">
        <div className="flex items-center gap-2">
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
          <span
            className="font-display text-[14px] italic leading-none text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            stipple<span className="text-[var(--color-text-muted)]">.lab</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <X size={14} strokeWidth={1.6} />
        </button>
      </div>
      <nav aria-label="Workspace navigation" className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const isActive = activeNav === item.label;
            return (
              <li key={item.label}>
                <a
                  href={`#nav=${encodeURIComponent(item.label)}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setNav(item.label);
                  }}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-[var(--radius-sm)] px-2 text-[13px] transition-[box-shadow,background-color] duration-[120ms] ease-out",
                    isActive
                      ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[inset_0_0_0_1px_var(--color-border)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
                  )}
                >
                  <item.icon size={13} strokeWidth={1.6} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.count != null && (
                    <span className="rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-1 font-mono text-[10px] text-[var(--color-text-muted)]">
                      {item.count}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex items-center justify-between px-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            Projects
          </span>
        </div>
        <ul className="mt-1 space-y-0.5">
          {PROJECTS.map((p) => (
            <li key={p.name}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setNav("Projects");
                }}
                className="flex h-8 items-center gap-2 rounded-[var(--radius-sm)] px-2 text-[13px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
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
      </nav>
    </div>
  );
}

/** The mobile search sheet — lives in a bottom-placement Modal and embeds
 *  the same Combobox as the topbar, full-width. */
function SearchSheet({
  onClose,
  onPickFlash,
}: {
  onClose: () => void;
  onPickFlash: (label: string) => void;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const items: ComboboxItem<{ kind: string; id: string }>[] = useMemo(() => {
    const all: ComboboxItem<{ kind: string; id: string }>[] = [];
    for (const r of ROWS) {
      all.push({ value: r.id, label: r.title, hint: r.id, data: { kind: "row", id: r.id } });
    }
    for (const p of PROJECTS) {
      all.push({ value: p.name, label: p.name, hint: "project", data: { kind: "project", id: p.name } });
    }
    return all;
  }, []);
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Search
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <X size={14} strokeWidth={1.6} />
        </button>
      </div>
      <Combobox
        value={query}
        onValueChange={setQuery}
        items={items}
        onSelect={(it) => {
          onClose();
          onPickFlash(String(it.label));
          toast({ title: `Jumped to ${it.label}`, status: "info" });
        }}
        placeholder="Search workspace…"
        emptyMessage={query ? `No matches for "${query}".` : "Type to search."}
        ariaLabel="Search workspace"
        size="md"
      />
    </div>
  );
}

/** The right side of the topbar carries search + help + bell + avatar.
 *  Search is the new Combobox; bell is a Popover; avatar is a Menu. */
function Topbar({
  activeNav,
  unread,
  markRead,
  loading,
  onOpenDrawer,
  onOpenSearchSheet,
  onSearchFlash,
}: {
  activeNav: NavKey;
  unread: boolean;
  markRead: () => void;
  loading: boolean;
  onOpenDrawer: () => void;
  onOpenSearchSheet: () => void;
  onSearchFlash: (label: string) => void;
}) {
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  // Simulated transport-error toggles for the search popover + notifications.
  // Default off — flip locally to inspect the inline error rendering.
  const [searchError] = useState(false);
  const [bellSyncFailed] = useState(false);

  // Bell sync failure → toast on first paint after mount.
  useEffect(() => {
    if (bellSyncFailed) {
      toast({ title: "Couldn't sync notifications.", status: "error" });
    }
  }, [bellSyncFailed, toast]);

  // Items derived from the current view. Substring + token-prefix match is
  // handled by the Combobox itself (case-insensitive `includes`).
  const items: ComboboxItem<{ kind: string; id: string }>[] = useMemo(() => {
    const all: ComboboxItem<{ kind: string; id: string }>[] = [];
    for (const r of ROWS) {
      all.push({
        value: r.id,
        label: r.title,
        hint: r.id,
        data: { kind: "row", id: r.id },
      });
    }
    for (const p of PROJECTS) {
      all.push({
        value: p.name,
        label: p.name,
        hint: "project",
        data: { kind: "project", id: p.name },
      });
    }
    for (const [initials, name] of Object.entries(MEMBERS)) {
      all.push({
        value: name,
        label: name,
        hint: initials,
        data: { kind: "member", id: initials },
      });
    }
    return all;
  }, []);

  const onPick = (it: ComboboxItem<{ kind: string; id: string }>) => {
    setQuery("");
    if (it.data?.kind === "row") {
      // Try to scroll-to-row (only meaningful in views that show the row).
      const el = document.querySelector<HTMLElement>(
        `[data-row-id="${it.data.id}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Brief Federal Blue highlight pulse via CSS class swap.
        el.dataset.flash = "1";
        onSearchFlash(it.data.id);
        setTimeout(() => {
          delete el.dataset.flash;
        }, 1100);
      } else {
        toast({ title: `${it.label} — open the Documents view to inspect`, status: "info" });
      }
    } else {
      toast({ title: `Jumped to ${it.label}`, status: "info" });
    }
  };

  const userMenu: MenuItem[] = [
    { type: "heading", label: "Mara Reyes · mara@stipple.lab" },
    { type: "separator", label: "" },
    { label: "Profile", onSelect: () => toast({ title: "Opened profile", status: "info" }) },
    {
      label: "Theme: light",
      onSelect: () => {
        setTheme("light");
        toast({ title: "Theme set to light", status: "success" });
      },
    },
    {
      label: "Theme: dark",
      onSelect: () => {
        setTheme("dark");
        toast({ title: "Theme set to dark", status: "success" });
      },
    },
    {
      label: "Theme: system",
      onSelect: () => {
        setTheme("system");
        toast({ title: "Theme set to system", status: "success" });
      },
    },
    { type: "separator", label: "" },
    {
      label: "Sign out",
      destructive: true,
      onSelect: () => toast({ title: "Signed out", status: "info" }),
    },
  ];

  const breadcrumbTail = activeNav.toLowerCase();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-4">
      {/* Hamburger — mobile only, opens the off-canvas drawer. */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] sm:hidden"
      >
        <MenuIcon size={13} strokeWidth={1.6} />
      </button>
      {/* Breadcrumb hides below 640px. */}
      <div className="hidden items-center gap-1.5 font-mono text-xs text-[var(--color-text-muted)] sm:flex">
        <span>workspace</span>
        <span aria-hidden>/</span>
        {loading ? (
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            Loading…
          </span>
        ) : (
          <>
            <span className="text-[var(--color-text)]">stipple-press</span>
            <span aria-hidden>/</span>
            <span className="text-[var(--color-text)]">{breadcrumbTail}</span>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {/* Desktop: real Combobox (with optional inline error in popover);
            mobile: an icon-button that opens the search sheet. */}
        <div className="hidden sm:block">
          <div className="w-40 md:w-56">
            <Combobox
              value={query}
              onValueChange={setQuery}
              items={items}
              onSelect={onPick}
              placeholder="Search…"
              emptyMessage={
                searchError
                  ? "Search unavailable. Tap retry."
                  : query
                    ? `No matches for "${query}".`
                    : "Type to search."
              }
              ariaLabel="Search workspace"
              size="sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenSearchSheet}
          aria-label="Open search"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] sm:hidden"
        >
          <Search size={13} strokeWidth={1.6} />
        </button>
        <button
          type="button"
          aria-label="Help"
          className="hidden h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] md:inline-flex"
        >
          <CircleHelp size={13} strokeWidth={1.6} />
        </button>

        {/* Bell → notification popover */}
        <Popover
          placement="bottom"
          align="end"
          ariaLabel="Notifications"
          trigger={
            <button
              type="button"
              aria-label="Notifications"
              className="relative inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              <Bell size={13} strokeWidth={1.6} />
              {/* Unread dot — fades when toggled off rather than popping. */}
              <span
                aria-live="polite"
                className="sr-only"
              >
                {unread ? "1 unread notification" : "no unread notifications"}
              </span>
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] transition-opacity duration-[120ms] ease-out"
                style={{ opacity: unread ? 1 : 0 }}
              />
            </button>
          }
        >
          <NotificationsPanel
            onMarkAllRead={markRead}
            failed={bellSyncFailed}
          />
        </Popover>

        {/* Avatar → user menu */}
        <Menu
          trigger={
            <button
              type="button"
              aria-label="Account menu"
              className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
              title={MEMBERS.MR}
            >
              MR
            </button>
          }
          items={userMenu}
          placement="bottom-end"
          ariaLabel="Account menu"
        />
      </div>
    </header>
  );
}

function NotificationsPanel({
  onMarkAllRead,
  failed,
}: {
  onMarkAllRead: () => void;
  failed?: boolean;
}) {
  const items = [
    {
      who: "MR",
      what: "approved Q3 retention deep dive",
      at: "11:48",
    },
    {
      who: "JT",
      what: "commented on outage retro",
      at: "10:12",
    },
    {
      who: "AH",
      what: "renamed pricing experiment kickoff",
      at: "09:21",
    },
  ];
  if (failed) {
    return (
      <div className="w-[280px] p-2">
        <ErrorState
          variant="inline"
          title="Notifications unavailable."
          onRetry={() => {}}
        />
      </div>
    );
  }
  return (
    <div className="w-[280px]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Notifications
        </span>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Mark all read
        </button>
      </div>
      <ul className="px-2 py-2">
        {items.map((n, i) => (
          <li
            key={i}
            className="group relative flex gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-[var(--color-bg)]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-[var(--color-accent-2)] opacity-0 transition-opacity duration-[120ms] ease-out group-hover:opacity-100"
            />
            <span
              title={MEMBERS[n.who]}
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
            >
              {n.who}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] text-[var(--color-text)]">{n.what}</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
                {n.at}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The active content — fades in via 200ms paper-ease on mount. */
function ContentArea({
  active,
  loading,
  onCompose,
}: {
  active: NavKey;
  loading: boolean;
  onCompose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // No need for a state flip — the parent <ContentArea> remounts via `key`,
  // so we run the entry transition through `data-starting-style` shape: set
  // initial values inline, then on next frame transition to identity.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0)" : "translateY(2px)",
        transition: `opacity 200ms ${PAPER_EASE}, transform 200ms ${PAPER_EASE}`,
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      {active === "Overview" && <ViewDocuments title="Overview" loading={loading} />}
      {active === "Documents" && <ViewDocuments title="Documents" loading={loading} />}
      {active === "Inbox" && <ViewInbox onCompose={onCompose} />}
      {active === "Projects" && <ViewProjects />}
      {active === "Members" && <ViewMembers />}
    </div>
  );
}

function ViewHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] px-6 pt-6 pb-4">
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {eyebrow}
        </div>
        <h1
          className="mt-1 font-display text-[22px] leading-none tracking-[-0.02em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          {title}
        </h1>
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
          {description}
        </p>
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
  );
}

function ViewDocuments({
  title,
  loading,
}: {
  title: string;
  loading: boolean;
}) {
  const eyebrow = title === "Overview" ? "Recently active" : "All documents";
  return (
    <>
      <ViewHeader
        eyebrow={eyebrow}
        title={title}
        description="Files updated in the last 14 days across your projects."
      />
      <StatusLegendStrip />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 overflow-y-auto">
          {loading ? (
            <div
              className="flex flex-col gap-2 px-6 py-3"
              style={{
                opacity: 1,
                transition: `opacity 200ms ${PAPER_EASE}`,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  width={680}
                  height={32}
                  density={0.05}
                  seed={i + 1}
                />
              ))}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden w-full text-xs sm:table">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <th className="hidden px-6 py-2 text-left font-medium font-mono text-[10px] uppercase tracking-[0.1em] lg:table-cell">
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
                      data-row-id={r.id}
                      className="group relative border-b border-[var(--color-border)] transition-[background-color,opacity] duration-[120ms] ease-out hover:bg-[var(--color-surface)] data-[flash=1]:bg-[color-mix(in_oklch,var(--color-accent-2)_12%,transparent)]"
                    >
                      <td className="relative hidden px-6 py-2.5 font-mono text-[11px] text-[var(--color-text-muted)] lg:table-cell">
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-[2px] bg-[var(--color-accent-2)] opacity-0 transition-[background-color,opacity] duration-[120ms] ease-out group-hover:opacity-100"
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

              {/* Mobile card-flow (<640px). */}
              <ul className="divide-y divide-[var(--color-border)] sm:hidden">
                {ROWS.map((r) => (
                  <li
                    key={r.id}
                    data-row-id={r.id}
                    className="flex flex-col gap-1.5 px-4 py-3 transition-[background-color] duration-[120ms] ease-out hover:bg-[var(--color-surface)] data-[flash=1]:bg-[color-mix(in_oklch,var(--color-accent-2)_12%,transparent)]"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                        {r.id}
                      </span>
                      <a className="text-[13px] hover:underline" href="#">
                        {r.title}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <span
                        title={MEMBERS[r.owner]}
                        className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
                      >
                        {r.owner}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-[var(--color-text-muted)]">
                        {r.updated}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Below 1024px the activity rail is hidden — a footer link
                  re-exposes today's activity. */}
              <div className="border-t border-[var(--color-border)] px-6 py-2 lg:hidden">
                <a
                  href="#"
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  view activity →
                </a>
              </div>
            </>
          )}
        </div>

        <aside className="hidden border-l border-[var(--color-border)] bg-[var(--color-surface)] lg:block">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              Activity
            </div>
            <div className="mt-1 text-xs text-[var(--color-text)]">Today</div>
          </div>
          {loading ? (
            <div className="flex flex-col gap-2 px-4 py-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  width={28}
                  height={6}
                  density={0.05}
                  seed={i + 9}
                />
              ))}
            </div>
          ) : (
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
          )}
        </aside>
      </div>
    </>
  );
}

function ViewInbox({ onCompose }: { onCompose: () => void }) {
  // The canonical specimen pose has threads. Flip to [] locally to inspect
  // the empty-state vocabulary.
  const threads = INBOX_THREADS;
  return (
    <>
      <ViewHeader
        eyebrow="Unread"
        title="Inbox"
        description="Threads with you on them, oldest first to keep replies tidy."
      />
      {threads.length === 0 ? (
        <EmptyState
          density="default"
          eyebrow="inbox"
          title="No threads waiting."
          body="All caught up — new messages will appear here."
          action={{ label: "Compose first thread", onClick: onCompose }}
        />
      ) : (
      <ul className="min-h-0 flex-1 divide-y divide-[var(--color-border)] overflow-y-auto">
        {threads.map((t) => (
          <li
            key={t.id}
            className="group relative grid grid-cols-[28px_1fr_auto] items-start gap-3 px-6 py-3 transition-[background-color] duration-[120ms] ease-out hover:bg-[var(--color-surface)]"
          >
            <span
              aria-hidden
              className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[var(--color-accent-2)] opacity-0 transition-opacity duration-[120ms] ease-out group-hover:opacity-100"
            />
            <span
              title={MEMBERS[t.from]}
              className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
            >
              {t.from}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] text-[var(--color-text)]">{t.subject}</div>
              <div className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                {t.preview}
              </div>
            </div>
            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
              {t.at}
            </span>
          </li>
        ))}
      </ul>
      )}
    </>
  );
}

function ViewProjects() {
  const projects = PROJECTS; // canonical pose populated; flip to [] locally.
  return (
    <>
      <ViewHeader
        eyebrow="Active"
        title="Projects"
        description="Repos with at least one merge or review in the last week."
      />
      {projects.length === 0 ? (
        <EmptyState
          density="default"
          eyebrow="projects"
          title="No projects yet."
          body="Spin one up to track work in progress."
          action={{ label: "New project", onClick: () => {} }}
        />
      ) : (
      <div className="grid grid-cols-1 gap-3 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-6 sm:py-6">
        {projects.map((p) => {
          const ownersForProject: (keyof typeof MEMBERS)[] = ["MR", "JT", "AH", "RG"];
          return (
            <div
              key={p.name}
              className="group relative flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-[border-color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)]"
            >
              <span
                aria-hidden
                className="absolute inset-y-3 left-0 w-[2px] rounded-full opacity-0 transition-opacity duration-[120ms] ease-out group-hover:opacity-100"
                style={{ background: p.color }}
              />
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: p.color }}
                />
                <span className="font-mono text-[12px] text-[var(--color-text)]">{p.name}</span>
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                12 open · 3 merging · last build ok
              </div>
              <div className="flex -space-x-1.5">
                {ownersForProject.map((o) => (
                  <span
                    key={o}
                    title={MEMBERS[o]}
                    className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[9.5px] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
                  >
                    {o}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </>
  );
}

function ViewMembers() {
  const members = Object.entries(MEMBERS).map(([initials, name]) => ({
    initials,
    name,
    role:
      initials === "MR"
        ? "Workspace owner"
        : initials === "JT"
          ? "Engineer"
          : initials === "AH"
            ? "Designer"
            : "Operator",
    last: initials === "MR" ? "online" : "2h",
  }));
  return (
    <>
      <ViewHeader
        eyebrow="Workspace"
        title="Members"
        description="People with access; activity from the last 24 hours."
      />
      {members.length === 0 ? (
        <EmptyState
          density="default"
          eyebrow="workspace"
          title="No members yet."
          body="Invite a teammate to collaborate."
          action={{ label: "Invite member", onClick: () => {} }}
        />
      ) : (
      <ul className="min-h-0 flex-1 divide-y divide-[var(--color-border)] overflow-y-auto">
        {members.map((m) => (
          <li
            key={m.initials}
            className="group relative grid grid-cols-[28px_1fr_auto] items-center gap-3 px-6 py-2.5 transition-[background-color] duration-[120ms] ease-out hover:bg-[var(--color-surface)]"
          >
            <span
              aria-hidden
              className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-[var(--color-accent-2)] opacity-0 transition-opacity duration-[120ms] ease-out group-hover:opacity-100"
            />
            <span
              title={m.name}
              className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
            >
              {m.initials}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] text-[var(--color-text)]">{m.name}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                {m.role}
              </div>
            </div>
            <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
              {m.last}
            </span>
          </li>
        ))}
      </ul>
      )}
    </>
  );
}

function StatusLegendStrip() {
  return (
    <div
      role="list"
      aria-label="Status key"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--color-border)] px-6 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
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
