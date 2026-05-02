"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@base-ui-components/react/combobox";
import { Dialog } from "@base-ui-components/react/dialog";
import { ArrowRight, Clock, Search } from "lucide-react";
import { REGISTRY, type ComponentEntry } from "@/lib/registry";

const RECENT_KEY = "cg:recent";
const MAX_RECENT = 5;

type PaletteCtx = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const Ctx = createContext<PaletteCtx | null>(null);

export function useCommandPalette() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCommandPalette used outside provider");
  return ctx;
}

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(href: string) {
  if (typeof window === "undefined") return;
  const current = loadRecent().filter((h) => h !== href);
  current.unshift(href);
  window.localStorage.setItem(
    RECENT_KEY,
    JSON.stringify(current.slice(0, MAX_RECENT)),
  );
}

type Item = {
  href: string;
  category: string;
  slug: string;
  title: string;
  filename: string;
  // The label string Base UI uses for filtering/display.
  label: string;
};

function entryToItem(e: ComponentEntry): Item {
  return {
    href: `/c/${e.category}/${e.slug}`,
    category: e.category,
    slug: e.slug,
    title: e.title,
    filename: e.filename,
    label: `${e.title} ${e.category} ${e.filename}`,
  };
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((p) => !p), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <Ctx.Provider value={{ open, setOpen, toggle }}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </Ctx.Provider>
  );
}

type Group = { value: string; items: Item[] };

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);

  // Reload recents whenever the palette opens.
  useEffect(() => {
    if (open) setRecentHrefs(loadRecent());
  }, [open]);

  const allItems: Item[] = useMemo(() => REGISTRY.map(entryToItem), []);

  const groups: Group[] = useMemo(() => {
    const recent = recentHrefs
      .map((h) => allItems.find((i) => i.href === h))
      .filter((i): i is Item => Boolean(i));
    const byCategory = new Map<string, Item[]>();
    for (const it of allItems) {
      const arr = byCategory.get(it.category) ?? [];
      arr.push(it);
      byCategory.set(it.category, arr);
    }
    const out: Group[] = [];
    if (recent.length) out.push({ value: "Recent", items: recent });
    for (const [cat, items] of byCategory) {
      out.push({ value: cat, items });
    }
    return out;
  }, [allItems, recentHrefs]);

  const handleSelect = useCallback(
    (item: Item) => {
      saveRecent(item.href);
      onOpenChange(false);
      router.push(item.href);
    },
    [onOpenChange, router],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-[color-mix(in_oklch,var(--color-bg)_75%,transparent)] backdrop-blur-[2px] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-150" />
        <Dialog.Popup
          aria-label="Command palette"
          className="fixed left-1/2 top-[18vh] z-50 w-[min(560px,92vw)] -translate-x-1/2 origin-top rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[0_24px_60px_-20px_color-mix(in_oklch,var(--color-text)_25%,transparent)] data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[ending-style]:opacity-0 transition-[opacity,transform] duration-150"
        >
          <Combobox.Root
            items={groups}
            onValueChange={(v) => {
              if (v && typeof v === "object" && "href" in v) {
                handleSelect(v as Item);
              }
            }}
            itemToStringLabel={(it: Item) => it.label}
          >
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3">
              <Search
                size={14}
                strokeWidth={1.6}
                className="text-[var(--color-text-muted)]"
              />
              <Combobox.Input
                autoFocus
                placeholder="Jump to a component…"
                className="h-11 w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              />
              <kbd className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                esc
              </kbd>
            </div>
            <Combobox.List className="max-h-[60vh] overflow-y-auto p-1.5">
              {(group: Group) => (
                <Combobox.Group key={group.value} items={group.items}>
                  <Combobox.GroupLabel className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    {group.value === "Recent" ? (
                      <Clock size={10} strokeWidth={1.8} />
                    ) : null}
                    {group.value}
                  </Combobox.GroupLabel>
                  {group.items.map((item) => (
                    <Combobox.Item
                      key={`${group.value}:${item.href}`}
                      value={item}
                      className="group flex cursor-default items-center gap-3 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-[var(--color-text)] data-[highlighted]:bg-[var(--color-surface-2)] data-[highlighted]:text-[var(--color-text)]"
                    >
                      <span className="flex-1 truncate">{item.title}</span>
                      <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                        {item.category}/{item.filename}
                      </span>
                      <ArrowRight
                        size={12}
                        strokeWidth={1.6}
                        className="text-[var(--color-text-muted)] opacity-0 group-data-[highlighted]:opacity-100"
                      />
                    </Combobox.Item>
                  ))}
                </Combobox.Group>
              )}
            </Combobox.List>
            <Combobox.Empty className="px-3 py-6 text-center text-xs text-[var(--color-text-muted)]">
              No matches.
            </Combobox.Empty>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-text-muted)]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1 py-px font-mono">
                    ↑↓
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1 py-px font-mono">
                    ↵
                  </kbd>
                  open
                </span>
              </div>
              <span className="font-mono">⌘K</span>
            </div>
          </Combobox.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
