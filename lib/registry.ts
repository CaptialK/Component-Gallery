import type { ComponentType } from "react";

export type ComponentEntry = {
  category: string;
  slug: string;
  title: string;
  filename: string;
  description?: string;
  status?: "wip";
  /**
   * Page treatment. `default` (or omitted) gets the standard registry-style
   * shell (header bar, Preview/Source toggle). `specimen` gets the Spike 2
   * Specimen Cabinet treatment — registration crosshairs, plate number,
   * foot-of-page colophon, marginalia code reveal.
   */
  layout?: "specimen" | "default";
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
    layout: "specimen",
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

/**
 * The plate number for cataloguing — registry position, 1-indexed,
 * zero-padded to three digits ("№ 002"). Used by the Specimen shell.
 */
export function getPlateNumber(category: string, slug: string): string {
  const idx = REGISTRY.findIndex(
    (e) => e.category === category && e.slug === slug,
  );
  if (idx === -1) return "???";
  return String(idx + 1).padStart(3, "0");
}

/**
 * Display labels for category slugs — cataloguing prose, not registry keys.
 * Specimen running head reads "Plate № 002. — Authentication. …" rather
 * than the kebab-cased slug.
 */
const CATEGORY_LABELS: Record<string, string> = {
  auth: "Authentication",
  layouts: "Layouts",
  "empty-states": "Empty states",
};

export function getCategoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.replace(/-/g, " ");
}

export function totals() {
  return {
    files: REGISTRY.length,
    folders: new Set(REGISTRY.map((e) => e.category)).size,
  };
}
