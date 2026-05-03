import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/_kit/site-header";
import { SiteFooter } from "@/components/_kit/site-footer";
import { DotField } from "@/components/_kit/dot-field";
import { Skeleton } from "@/components/_kit/skeleton";
import { groupByCategory, type ComponentEntry } from "@/lib/registry";

export default function HomePage() {
  const groups = groupByCategory();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1100px] px-4 md:px-6">
        <Hero />
        <div className="space-y-16 pb-12">
          {groups.map((g) => (
            <CategorySection
              key={g.category}
              category={g.category}
              entries={g.entries}
            />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
      {/* Decorative dot field — positioned, two-tone, varying density. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-6 h-[420px] w-[420px] opacity-80 md:-right-24 md:h-[560px] md:w-[560px]"
      >
        <DotField
          shape={{ kind: "rect", width: 560, height: 560 }}
          spacing={6}
          dotRadius={1.4}
          accentRatio={0.22}
          baseDensity={0.95}
          seed={42}
          density={(x, y, w, h) => {
            // Soft radial falloff from upper-left toward lower-right
            const cx = w * 0.32;
            const cy = h * 0.42;
            const dx = (x - cx) / w;
            const dy = (y - cy) / h;
            const d = Math.sqrt(dx * dx + dy * dy);
            return Math.max(0.02, 1 - d * 1.4);
          }}
          className="h-full w-full"
        />
      </div>

      <div className="relative max-w-[640px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          gallery · phase 1
        </span>
        <h1 className="display mt-4 max-w-[18ch] text-[44px] leading-[1.02] tracking-[-0.022em] text-[var(--color-text)] md:text-[60px]">
          Hand-designed
          <br />
          <span className="italic text-[var(--color-text-muted)]">SaaS components,</span>
          <br />
          one file at a time.
        </h1>
        <p className="mt-5 max-w-[52ch] text-[var(--color-text-muted)]">
          A working sketchbook of UI for product surfaces — layouts, auth, dashboards,
          empty states. Paper-toned base, with a measured pointillism accent where
          decoration earns its place.
        </p>
      </div>
    </section>
  );
}

function CategorySection({
  category,
  entries,
}: {
  category: string;
  entries: ComponentEntry[];
}) {
  return (
    <section id={category} className="scroll-mt-20">
      <header className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2">
        <h2 className="text-lg font-medium tracking-[-0.02em]">
          <span className="capitalize">{category.replace(/-/g, " ")}</span>
          <span className="ml-2 font-mono text-xs text-[var(--color-text-muted)]">
            · {entries.length} file{entries.length === 1 ? "" : "s"}
          </span>
        </h2>
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          /{category}
        </span>
      </header>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <li key={e.slug}>
            <ComponentCard entry={e} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComponentCard({ entry }: { entry: ComponentEntry }) {
  return (
    <Link
      href={`/c/${entry.category}/${entry.slug}`}
      data-focus-ring="off"
      className="group block focus-visible:outline-none"
    >
      <div className="relative">
        {/* Stacked previews — dark peeks from behind on hover */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] transition-[transform,border-color] duration-300 group-hover:-translate-y-1 group-hover:border-[var(--color-border-strong)] group-focus-visible:-translate-y-1 group-focus-visible:border-[var(--color-accent-2)]">
          <PreviewPlaceholder seed={hashSeed(entry.category + entry.slug)} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 translate-y-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[oklch(15%_0.008_60)] transition-transform duration-300 group-hover:translate-y-3"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[var(--color-text)]">
            {entry.title}
          </div>
          <div className="truncate font-mono text-[11px] text-[var(--color-text-muted)]">
            {entry.filename}
          </div>
        </div>
        <ArrowUpRight
          size={14}
          strokeWidth={1.6}
          className="shrink-0 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
    </Link>
  );
}

function PreviewPlaceholder({ seed }: { seed: number }) {
  // Spike 1: blue-noise stipple at low density. Reads as "loading / not yet
  // pressed" — same dot language, just quieter than the rendered state.
  return (
    <div className="absolute inset-0">
      <Skeleton
        width={300}
        height={220}
        density={0.06}
        spacing={5}
        seed={seed}
        className="h-full w-full"
      />
      <span className="absolute bottom-2 left-2 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
        preview pending
      </span>
    </div>
  );
}

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}
