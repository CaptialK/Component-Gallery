import type { ComponentType } from "react";

export type ComponentEntry = {
  category: string;
  slug: string;
  title: string;
  filename: string;
  description?: string;
  status?: "wip";
  load: () => Promise<{ default: ComponentType }>;
};

/**
 * The single source of truth. Every showcase entry lives here.
 *
 * Adding a new component:
 *   1. Drop the .tsx into `components/showcase/<category>/<slug>.tsx` —
 *      default-export a self-contained component.
 *   2. Append an entry below.
 *   3. The static index, dynamic route, command palette, and OG metadata
 *      pick it up automatically.
 */
export const REGISTRY: ComponentEntry[] = [
  {
    category: "layouts",
    slug: "app-shell",
    title: "App shell",
    filename: "app-shell.tsx",
    description:
      "Sidebar + topbar + content area. The chrome itself is the showcase.",
    load: () => import("@/components/showcase/layouts/app-shell"),
  },
  {
    category: "auth",
    slug: "centered-signin",
    title: "Centered sign-in",
    filename: "centered-signin.tsx",
    description:
      "A centered card with email, password, and continue-with-GitHub.",
    load: () => import("@/components/showcase/auth/centered-signin"),
  },
  {
    category: "empty-states",
    slug: "inbox-zero",
    title: "Inbox zero",
    filename: "inbox-zero.tsx",
    description:
      "Pointillism illustration, paired with a clear primary action.",
    load: () => import("@/components/showcase/empty-states/inbox-zero"),
  },
];

export type CategoryGroup = {
  category: string;
  entries: ComponentEntry[];
};

export function groupByCategory(): CategoryGroup[] {
  const map = new Map<string, ComponentEntry[]>();
  for (const e of REGISTRY) {
    const arr = map.get(e.category) ?? [];
    arr.push(e);
    map.set(e.category, arr);
  }
  return Array.from(map, ([category, entries]) => ({ category, entries }));
}

export function findEntry(category: string, slug: string) {
  return REGISTRY.find((e) => e.category === category && e.slug === slug);
}

export function totals() {
  return {
    files: REGISTRY.length,
    folders: new Set(REGISTRY.map((e) => e.category)).size,
  };
}
