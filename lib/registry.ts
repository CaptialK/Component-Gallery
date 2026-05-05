import type { ComponentType } from "react";

export type Domain = "saas" | "medical";

export type ComponentEntry = {
  /**
   * Top-level taxonomy axis. The catalogue groups by domain first, then by
   * category within domain. SaaS = generic dev/product surfaces (auth, app
   * shells, GitHub-style heatmaps). Medical = the clinical-SaaS batch
   * (chart headers, vitals monitors, MARs, etc.).
   */
  domain: Domain;
  category: string;
  slug: string;
  title: string;
  filename: string;
  description?: string;
  status?: "wip";
  /**
   * The date the plate was first pressed — when its source file was first
   * committed. ISO "YYYY-MM-DD" UTC. Rendered in the specimen colophon in
   * Fraunces italic ("First impression May 2nd, 2026.").
   */
  firstImpression: string;
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
 *   2. Append an entry below in the right domain block.
 *   3. The static index, dynamic route, command palette, and OG metadata
 *      pick it up automatically.
 *
 * Order is meaningful — registry position drives the plate number watermark,
 * so the array is sorted by domain (SaaS → Medical) then by an intentional
 * within-domain order: layouts (chrome) → auth/dashboards (data) → clinical
 * (domain core) → empty-states (rest states).
 */
export const REGISTRY: ComponentEntry[] = [
  // ────────────────────────────────────────────────────────────────────
  //  SaaS — generic dev/product surfaces
  // ────────────────────────────────────────────────────────────────────
  {
    domain: "saas",
    category: "layouts",
    slug: "app-shell",
    title: "App shell",
    filename: "app-shell.tsx",
    description:
      "Sidebar + topbar + content area. The chrome itself is the showcase.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    firstImpression: "2026-05-02",
    load: () => import("@/components/showcase/layouts/app-shell"),
  },
  {
    domain: "saas",
    category: "auth",
    slug: "centered-signin",
    title: "Centered sign-in",
    filename: "centered-signin.tsx",
    description:
      "A centered card with email, password, and continue-with-GitHub.",
    layout: "specimen",
    firstImpression: "2026-05-02",
    load: () => import("@/components/showcase/auth/centered-signin"),
  },
  {
    domain: "saas",
    category: "dashboards",
    slug: "activity-heatmap",
    title: "Activity heatmap",
    filename: "activity-heatmap.tsx",
    description:
      "Area-as-data: one dot per cell, sized by the day's value. Sqrt-scaled radius keeps equal value deltas perceptually uniform.",
    layout: "specimen",
    aspectRatio: "4 / 3",
    maxWidth: 880,
    firstImpression: "2026-05-02",
    load: () => import("@/components/showcase/dashboards/activity-heatmap"),
  },
  {
    domain: "saas",
    category: "empty-states",
    slug: "inbox-zero",
    title: "Inbox zero",
    filename: "inbox-zero.tsx",
    description:
      "Pointillism illustration, paired with a clear primary action.",
    layout: "specimen",
    firstImpression: "2026-05-02",
    load: () => import("@/components/showcase/empty-states/inbox-zero"),
  },
  {
    domain: "saas",
    category: "dashboards",
    slug: "metrics-stream",
    title: "Metrics stream",
    filename: "metrics-stream.tsx",
    description:
      "Stacked observability strips: four KPIs as horizontal rows. Wide Trace polylines with min/max envelopes and dashed target lines; Federal Blue live dot at the latest reading.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    firstImpression: "2026-05-04",
    load: () => import("@/components/showcase/dashboards/metrics-stream"),
  },
  {
    domain: "saas",
    category: "forms",
    slug: "onboarding-accordion",
    title: "Onboarding accordion",
    filename: "onboarding-accordion.tsx",
    description:
      "Three-step set-up as a vertical accordion. Done above, doing now in the middle, doing-next below — reads as one form-document, not a wizard.",
    layout: "specimen",
    firstImpression: "2026-05-04",
    load: () => import("@/components/showcase/forms/onboarding-accordion"),
  },
  {
    domain: "saas",
    category: "empty-states",
    slug: "empty-table-suggestions",
    title: "Empty table with suggestions",
    filename: "empty-table-suggestions.tsx",
    description:
      "In-place no-results pattern: the table chrome stays, the empty state slots inside, and a 'Try one of these' rail of nearby matches reads as suggestion rows.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    firstImpression: "2026-05-04",
    load: () => import("@/components/showcase/empty-states/empty-table-suggestions"),
  },
  {
    domain: "saas",
    category: "dashboards",
    slug: "deploy-pipeline",
    title: "Deploy pipeline",
    filename: "deploy-pipeline.tsx",
    description:
      "Three environment lanes — preview / staging / production. Each deploy is a dot on a time axis; rollout duration trails behind. Failed deploys ink persimmon, the live deploy wears a Federal Blue ring with the pulse.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    firstImpression: "2026-05-04",
    load: () => import("@/components/showcase/dashboards/deploy-pipeline"),
  },
  {
    domain: "saas",
    category: "dashboards",
    slug: "billing-usage",
    title: "Estimated bill",
    filename: "billing-usage.tsx",
    description:
      "Typeset-invoice approach to mid-cycle usage. Estimated total set in display Fraunces, line-item table with tabular-num columns and hairline rules, a single 30-day cumulative-spend Trace anchored to the renew-on date.",
    layout: "specimen",
    aspectRatio: "5 / 6",
    maxWidth: 600,
    firstImpression: "2026-05-04",
    load: () => import("@/components/showcase/dashboards/billing-usage"),
  },
  {
    domain: "saas",
    category: "layouts",
    slug: "command-palette",
    title: "Command palette",
    filename: "command-palette.tsx",
    description:
      "Open palette modal floating over a softly-dimmed app frame. Grouped results — Pages, Actions, Recents — each row shows glyph, label, and a mono shortcut keycap. Selected row uses a left accent strip plus faint surface, never bg-lighten.",
    layout: "specimen",
    aspectRatio: "16 / 10",
    maxWidth: 880,
    firstImpression: "2026-05-04",
    load: () => import("@/components/showcase/layouts/command-palette"),
  },

  // ────────────────────────────────────────────────────────────────────
  //  Medical SaaS — clinical-product surfaces
  // ────────────────────────────────────────────────────────────────────
  {
    domain: "medical",
    category: "layouts",
    slug: "chart-header",
    title: "Chart header",
    filename: "chart-header.tsx",
    description:
      "Sticky patient banner: stippled monogram, density-as-severity allergy ribbon, code-status rule. The visual identity of a chart in one strip.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/layouts/chart-header"),
  },
  {
    domain: "medical",
    category: "layouts",
    slug: "care-team-rail",
    title: "Care team rail",
    filename: "care-team-rail.tsx",
    description:
      "Narrow vertical rail of providers on for a patient. Status as a four-glyph dot vocabulary; on-call lead gets a Federal Blue marginal stipple.",
    layout: "specimen",
    aspectRatio: "9 / 16",
    maxWidth: 320,
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/layouts/care-team-rail"),
  },
  {
    domain: "medical",
    category: "layouts",
    slug: "bed-board",
    title: "Bed board",
    filename: "bed-board.tsx",
    description:
      "Med-Surg bed board. Each occupied cell carries a top-edge bar whose length encodes length-of-stay; isolation precautions render as a perimeter dot rule (interior stays flat). Empty cells distinguish clean / dirty / blocked by shape, not colour.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/layouts/bed-board"),
  },
  {
    domain: "medical",
    category: "dashboards",
    slug: "vitals-monitor",
    title: "Vitals monitor",
    filename: "vitals-monitor.tsx",
    description:
      "Bedside dashboard for HR, BP, SpO₂, RR, Temp. Per-metric Trace polyline with normal envelope; live read marked by a Federal Blue ring; out-of-range moments tint persimmon.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/dashboards/vitals-monitor"),
  },
  {
    domain: "medical",
    category: "dashboards",
    slug: "triage-queue",
    title: "Triage queue",
    filename: "triage-queue.tsx",
    description:
      "ED arrivals sorted by ESI acuity. Single sized dot encodes severity (radius² scales), dot trail encodes wait, persimmon dots tip past the per-ESI threshold.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/dashboards/triage-queue"),
  },
  {
    domain: "medical",
    category: "clinical",
    slug: "medication-list",
    title: "Medication list",
    filename: "medication-list.tsx",
    description:
      "Active meds with a 24-hour scheduled-dose strip per row. One dot per dose; given · upcoming · overdue · suspended each get a distinct dot vocabulary.",
    layout: "specimen",
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/clinical/medication-list"),
  },
  {
    domain: "medical",
    category: "clinical",
    slug: "lab-results",
    title: "Lab results",
    filename: "lab-results.tsx",
    description:
      "CMP + CBC with each value placed on a reference-range line. Federal Blue marker in-range, persimmon out; H/L margin letters carry the analytical readout.",
    layout: "specimen",
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/clinical/lab-results"),
  },
  {
    domain: "medical",
    category: "clinical",
    slug: "intake-soap-note",
    title: "SOAP note",
    filename: "intake-soap-note.tsx",
    description:
      "Subjective / Objective / Assessment / Plan, four panes. Each header carries a length-as-completeness bar — fills with what's drafted.",
    layout: "specimen",
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/clinical/intake-soap-note"),
  },
  {
    domain: "medical",
    category: "clinical",
    slug: "appointment-week",
    title: "Appointment week",
    filename: "appointment-week.tsx",
    description:
      "Outpatient week view. Block height encodes duration; left-edge ink encodes visit type. Federal Blue hairline crosses today's column at the present minute.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/clinical/appointment-week"),
  },
  {
    domain: "medical",
    category: "clinical",
    slug: "order-entry",
    title: "Order entry",
    filename: "order-entry.tsx",
    description:
      "CPOE search-as-you-type. Each suggestion carries a frequency-in-your-panel bar; cost-rank as four small dots. Cart rail on the right queues the order.",
    layout: "specimen",
    aspectRatio: "16 / 9",
    maxWidth: 880,
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/clinical/order-entry"),
  },
  {
    domain: "medical",
    category: "clinical",
    slug: "encounter-timeline",
    title: "Encounter timeline",
    filename: "encounter-timeline.tsx",
    description:
      "Vertical event log for a hospital admission. Hairline thread connects events; flagged events ink in persimmon, the live event wears a Federal Blue ring; an open-ended dot trail signals the encounter is still going.",
    layout: "specimen",
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/clinical/encounter-timeline"),
  },
  {
    domain: "medical",
    category: "clinical",
    slug: "discharge-summary",
    title: "Discharge summary",
    filename: "discharge-summary.tsx",
    description:
      "Printable after-visit document. Section breaks render as halftone fade bands; the signature line ends with a Federal Blue ink trail; footer carries a stippled official seal.",
    layout: "specimen",
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/clinical/discharge-summary"),
  },
  {
    domain: "medical",
    category: "empty-states",
    slug: "no-encounters-yet",
    title: "No encounters yet",
    filename: "no-encounters-yet.tsx",
    description:
      "Empty-state for a patient with no recent visits. EKG trace rendered entirely from dots, fading from sinus rhythm to flat line.",
    layout: "specimen",
    firstImpression: "2026-05-03",
    load: () => import("@/components/showcase/empty-states/no-encounters-yet"),
  },
];

export type CategoryGroup = {
  category: string;
  entries: ComponentEntry[];
};

export type DomainGroup = {
  domain: Domain;
  groups: CategoryGroup[];
};

/**
 * Group entries by category, preserving registry array order. Used for
 * within-domain rendering on the home page.
 */
export function groupByCategory(entries: ComponentEntry[] = REGISTRY): CategoryGroup[] {
  const map = new Map<string, ComponentEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.category) ?? [];
    arr.push(e);
    map.set(e.category, arr);
  }
  return Array.from(map, ([category, entries]) => ({ category, entries }));
}

/**
 * Group entries by domain first, then by category within each domain. The
 * top-level taxonomy that drives the home page.
 */
export function groupByDomain(): DomainGroup[] {
  const order: Domain[] = ["saas", "medical"];
  return order.map((domain) => ({
    domain,
    groups: groupByCategory(REGISTRY.filter((e) => e.domain === domain)),
  }));
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
  forms: "Forms",
  clinical: "Clinical",
};

export function getCategoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.replace(/-/g, " ");
}

/**
 * Display labels for domains. Used on the home page super-section heads
 * and (optionally) in the specimen running head.
 */
const DOMAIN_LABELS: Record<Domain, string> = {
  saas: "SaaS components",
  medical: "Medical SaaS components",
};

export function getDomainLabel(domain: Domain): string {
  return DOMAIN_LABELS[domain];
}

export function totals() {
  return {
    files: REGISTRY.length,
    folders: new Set(REGISTRY.map((e) => e.category)).size,
  };
}

/**
 * Format an ISO date ("2026-05-04") for the colophon — book-voice English
 * with an ordinal day, e.g. "May 2nd, 2026". Parsed in UTC so timezone
 * offsets don't shift the date.
 */
export function formatFirstImpression(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const month = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return `${month} ${ordinalDay(d)}, ${y}`;
}

function ordinalDay(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
