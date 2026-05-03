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
  /**
   * Plate aspect ratio for `layout: "specimen"`. Defaults to "5 / 6" — the
   * portrait shape that suits auth, empty-states, etc. Dashboards and other
   * landscape-natural components override (e.g. "4 / 3"). Ignored for
   * `default` layout.
   */
  aspectRatio?: string;
  /**
   * Plate max width in px, for `layout: "specimen"`. Defaults to 600. Bump
   * for components that need more room to read (e.g. app-shells with their
   * own internal sidebar/topbar). When > 600 the left-margin № watermark
   * waits for `xl` breakpoint instead of `lg` to avoid cramping.
   */
  maxWidth?: number;
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
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
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
    layout: "specimen",
    load: () => import("@/components/showcase/empty-states/inbox-zero"),
  },
  {
    category: "dashboards",
    slug: "activity-heatmap",
    title: "Activity heatmap",
    filename: "activity-heatmap.tsx",
    description:
      "Area-as-data: one dot per cell, sized by the day's value. Sqrt-scaled radius keeps equal value deltas perceptually uniform.",
    layout: "specimen",
    aspectRatio: "4 / 3",
    load: () => import("@/components/showcase/dashboards/activity-heatmap"),
  },
  {
    category: "layouts",
    slug: "chart-header",
    title: "Chart header",
    filename: "chart-header.tsx",
    description:
      "Sticky patient banner: stippled monogram, density-as-severity allergy ribbon, code-status rule. The visual identity of a chart in one strip.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    load: () => import("@/components/showcase/layouts/chart-header"),
  },
  {
    category: "dashboards",
    slug: "vitals-monitor",
    title: "Vitals monitor",
    filename: "vitals-monitor.tsx",
    description:
      "Bedside dashboard for HR, BP, SpO₂, RR, Temp. Per-metric dot sparkline with normal envelope as a Bridson density backdrop; live read marked by a Federal Blue ring.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    load: () => import("@/components/showcase/dashboards/vitals-monitor"),
  },
  {
    category: "dashboards",
    slug: "triage-queue",
    title: "Triage queue",
    filename: "triage-queue.tsx",
    description:
      "ED arrivals sorted by ESI acuity. Density encodes severity, dot trail encodes wait, persimmon dots tip past the per-ESI threshold.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    load: () => import("@/components/showcase/dashboards/triage-queue"),
  },
  {
    category: "clinical",
    slug: "medication-list",
    title: "Medication list",
    filename: "medication-list.tsx",
    description:
      "Active meds with a 24-hour scheduled-dose strip per row. One dot per dose; given · upcoming · overdue · suspended each get a distinct dot vocabulary.",
    layout: "specimen",
    load: () => import("@/components/showcase/clinical/medication-list"),
  },
  {
    category: "clinical",
    slug: "lab-results",
    title: "Lab results",
    filename: "lab-results.tsx",
    description:
      "CMP + CBC with each value placed on a stippled reference-range ribbon. Federal Blue marker in-range, persimmon out; H/L margin letters carry the analytical readout.",
    layout: "specimen",
    load: () => import("@/components/showcase/clinical/lab-results"),
  },
  {
    category: "clinical",
    slug: "intake-soap-note",
    title: "SOAP note",
    filename: "intake-soap-note.tsx",
    description:
      "Subjective / Objective / Assessment / Plan, four panes. Each header carries a coverage-as-completeness stipple — density grows with what's drafted.",
    layout: "specimen",
    load: () => import("@/components/showcase/clinical/intake-soap-note"),
  },
  {
    category: "layouts",
    slug: "care-team-rail",
    title: "Care team rail",
    filename: "care-team-rail.tsx",
    description:
      "Narrow vertical rail of providers on for a patient. Status as a four-glyph dot vocabulary; on-call lead gets a Federal Blue marginal stipple.",
    layout: "specimen",
    aspectRatio: "9 / 16",
    maxWidth: 320,
    load: () => import("@/components/showcase/layouts/care-team-rail"),
  },
  {
    category: "empty-states",
    slug: "no-encounters-yet",
    title: "No encounters yet",
    filename: "no-encounters-yet.tsx",
    description:
      "Empty-state for a patient with no recent visits. EKG trace rendered entirely from dots, fading from sinus rhythm to flat line.",
    layout: "specimen",
    load: () => import("@/components/showcase/empty-states/no-encounters-yet"),
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
  dashboards: "Dashboards",
  clinical: "Clinical",
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
