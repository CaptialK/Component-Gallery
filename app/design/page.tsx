import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { DotField } from "@/components/_kit/dot-field";

/**
 * Design ideation page. Two variants of the same hero + category snippet so
 * we can A/B the visual identity. Scoped — does not affect the live gallery.
 *
 * Variant A (1 + 2): rounder buttons (primary goes pill, secondary 10px),
 *   persimmon accent given more presence (link hover, the · count tag).
 * Variant B (1 + 2 + 3): all of A + pointillism pushed into chrome —
 *   a dot-field divider before each section, a hairline dot motif under
 *   each h2.
 */

export default function DesignPage() {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-bg)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-[1100px] items-center gap-4 px-6">
          <Link
            href="/"
            className="font-mono text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ← back
          </Link>
          <span aria-hidden className="h-3 w-px bg-[var(--color-border)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            design ideation
          </span>
          <span className="ml-auto font-mono text-[11px] text-[var(--color-text-muted)]">
            same content, two visual identities
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-6 py-10 space-y-12">
        <Variant
          label="1 + 2"
          subtitle="rounder buttons · accent breathes"
        >
          <Snippet variant="a" />
        </Variant>

        <Variant
          label="1 + 2 + 3"
          subtitle="adds pointillism into the chrome"
        >
          <Snippet variant="b" />
        </Variant>
      </main>
    </div>
  );
}

function Variant({
  label,
  subtitle,
  children,
}: {
  label: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text)]">
          variant {label}
        </span>
        <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
          {subtitle}
        </span>
      </div>
      <div className="overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg)]">
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- */
/* SHARED SNIPPET — same hero + category section in both variants            */
/* ------------------------------------------------------------------------- */

function Snippet({ variant }: { variant: "a" | "b" }) {
  return (
    <div className="px-8 pt-10 pb-12">
      <Hero variant={variant} />
      {variant === "b" && <DotDivider />}
      <CategorySection variant={variant} />
    </div>
  );
}

function Hero({ variant }: { variant: "a" | "b" }) {
  // Both variants get the persimmon accent more presence:
  //   - badge dot + label color
  //   - "highlighted" word in the headline
  //   - link hover
  return (
    <section className="relative isolate overflow-hidden pb-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-2 h-[260px] w-[260px] opacity-80"
      >
        <DotField
          shape={{ kind: "rect", width: 320, height: 320 }}
          spacing={6}
          dotRadius={1.4}
          accentRatio={0.24}
          baseDensity={0.95}
          seed={42}
          density={(x, y, w, h) => {
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
      <div className="relative max-w-[520px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          <span className="text-[var(--color-accent)]">gallery</span>
          <span className="text-[var(--color-text-muted)]">· phase 1</span>
        </span>
        <h1 className="mt-4 max-w-[14ch] text-[34px] font-semibold leading-[1.05] tracking-[-0.02em]">
          Hand-designed{" "}
          <span className="text-[var(--color-accent)]">SaaS components</span>,
          one file at a time.
        </h1>
        <p className="mt-3 max-w-[48ch] text-sm text-[var(--color-text-muted)]">
          A working sketchbook of UI for product surfaces — layouts, auth,
          dashboards, empty states. Paper-toned base, with a measured
          pointillism accent where decoration earns its place.
        </p>
        <div className="mt-5 flex items-center gap-2">
          {/* Primary CTA — pill */}
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-4 text-sm text-[var(--color-accent-fg)] hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px"
          >
            Browse the gallery
            <ArrowUpRight size={13} strokeWidth={1.8} />
          </button>
          {/* Secondary — 10px radius */}
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm hover:border-[var(--color-border-strong)]"
          >
            <span className="text-[var(--color-text-muted)]">⌘</span>K
          </button>
        </div>
      </div>
    </section>
  );
}

function CategorySection({ variant }: { variant: "a" | "b" }) {
  return (
    <section>
      <CategoryHeader title="Layouts" count={1} variant={variant} />
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <li>
          <ComponentCard title="App shell" filename="app-shell.tsx" />
        </li>
        <li>
          <ComponentCard title="Sidebar nav" filename="sidebar-nav.tsx" />
        </li>
      </ul>
    </section>
  );
}

function CategoryHeader({
  title,
  count,
  variant,
}: {
  title: string;
  count: number;
  variant: "a" | "b";
}) {
  return (
    <div>
      <header className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2">
        <h2 className="text-lg font-medium tracking-[-0.02em]">
          {title}
          {/* Accent breathes — count gets the persimmon */}
          <span className="ml-2 rounded-full bg-[color-mix(in_oklch,var(--color-accent)_15%,transparent)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-accent)]">
            {count} file{count === 1 ? "" : "s"}
          </span>
        </h2>
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          /{title.toLowerCase()}
        </span>
      </header>

      {/* Variant B: dot motif under the h2 */}
      {variant === "b" && (
        <div className="-mt-px h-2 w-full overflow-hidden">
          <DotField
            shape={{ kind: "rect", width: 1000, height: 16 }}
            spacing={6}
            dotRadius={0.9}
            baseDensity={0.7}
            accentRatio={0.5}
            seed={11}
            density={(x, _y, w) => {
              // Heavier on the left, sparse to the right — feels like a writing trail
              const t = x / w;
              return Math.max(0.04, 1 - t * 1.3);
            }}
            className="h-full w-full"
          />
        </div>
      )}
    </div>
  );
}

function ComponentCard({
  title,
  filename,
}: {
  title: string;
  filename: string;
}) {
  return (
    <a href="#" className="group block">
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] transition-[transform,border-color] duration-300 group-hover:-translate-y-1 group-hover:border-[var(--color-border-strong)]">
          <div className="absolute inset-0 grid place-items-center opacity-50">
            <div className="h-full w-full">
              <DotField
                shape={{ kind: "rect", width: 300, height: 220 }}
                spacing={5}
                dotRadius={1.1}
                baseDensity={0.55}
                accentRatio={0.12}
                seed={3}
                density={(x, _y, w) => 0.4 + 0.6 * (1 - Math.abs((x - w / 2) / w))}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{title}</div>
          <div className="truncate font-mono text-[11px] text-[var(--color-text-muted)]">
            {filename}
          </div>
        </div>
        {/* Accent breathes — arrow tinted on hover */}
        <ArrowUpRight
          size={14}
          strokeWidth={1.6}
          className="shrink-0 text-[var(--color-text-muted)] opacity-0 transition-[opacity,color] group-hover:opacity-100 group-hover:text-[var(--color-accent)]"
        />
      </div>
    </a>
  );
}

/* Variant B addition: a horizontal pointillism divider used between sections. */
function DotDivider() {
  return (
    <div
      aria-hidden
      className="my-10 h-6 w-full overflow-hidden"
    >
      <DotField
        shape={{ kind: "rect", width: 1000, height: 32 }}
        spacing={6}
        dotRadius={1}
        baseDensity={0.85}
        accentRatio={0.3}
        seed={23}
        density={(x, y, w, h) => {
          // Sinusoidal trail — feels intentional, not noisy
          const t = x / w;
          const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);
          const yFalloff = 1 - Math.abs((y - h / 2) / (h / 2));
          return wave * yFalloff;
        }}
        className="h-full w-full"
      />
    </div>
  );
}
