"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { DotField } from "@/components/_kit/dot-field";
import { RegistrationCrosshair } from "@/components/_kit/registration-crosshair";
import { getCategoryLabel } from "@/lib/registry";
import { cn } from "@/lib/cn";

/**
 * SpecimenShell — Spike 2 page treatment. The plate is implicit: defined by
 * four registration crosshairs at its corners, not by a border. The component
 * floats centered inside, painting its own surface.
 *
 * Step 1 shipped the plate frame + crosshairs.
 * Step 2 added the running head + plate-number watermark.
 * Step 3 added the foot-of-page colophon below the plate.
 * Step 4 makes this a client component to own the source-panel toggle. The
 *   colophon trigger (`· read the plate ·`) opens a panel that lives in the
 *   right margin on xl+ (catalogue marginalia) and as a bottom drawer with
 *   backdrop below xl (where the marginalia layout doesn't fit).
 * Step 6 adds halftone fade bands above and below the plate — Bridson dots
 *   with linear opacity ramp, peaking at the plate edge and fading away into
 *   the surrounding paper. The transitions read as ink-fade-in / ink-fade-out
 *   rather than as section dividers.
 */

type EntryShape = {
  category: string;
  slug: string;
  title: string;
  filename: string;
};

export function SpecimenShell({
  entry,
  plateNumber,
  source,
  aspectRatio = "5 / 6",
  maxWidth = 600,
  children,
}: {
  entry: EntryShape;
  plateNumber: string;
  source: React.ReactNode;
  aspectRatio?: string;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  const [sourceOpen, setSourceOpen] = React.useState(false);
  const categoryLabel = getCategoryLabel(entry.category);
  const panelId = React.useId();
  const widthStyle = { maxWidth: `${maxWidth}px` };
  // Wide plates (>600px) push the № watermark out to the xl breakpoint —
  // at lg there isn't enough side margin to host it without cramping.
  const watermarkVisibility = maxWidth > 600 ? "hidden xl:block" : "hidden lg:block";

  // ESC closes the panel.
  React.useEffect(() => {
    if (!sourceOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSourceOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sourceOpen]);

  return (
    <div className="relative min-h-dvh bg-[var(--color-bg)]">
      {/* Index back-link — quiet mono, top-left. Kept across all breakpoints. */}
      <Link
        href="/"
        aria-label="Back to index"
        className="absolute left-6 top-6 z-10 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={11} strokeWidth={1.6} />
        <span className="font-mono">index</span>
      </Link>

      {/* Running head — Fraunces small italic, top-center. md+ only. */}
      <div
        className="pointer-events-none absolute left-1/2 top-9 z-0 hidden -translate-x-1/2 whitespace-nowrap font-display text-[15px] italic text-[var(--color-text-muted)] md:block"
        style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
      >
        Plate{" "}
        <span
          className="not-italic"
          style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
        >
          № {plateNumber}
        </span>
        {". — "}
        {categoryLabel}
        {". "}
        {entry.title}
        {"."}
      </div>

      {/* Plate + fade bands + colophon column. */}
      <div className="flex min-h-dvh flex-col items-center px-8 py-24">
        {/* Top halftone fade — paper transitioning into the plate. */}
        <FadeBand height={80} direction="into" maxWidth={maxWidth} />

        <div
          data-plate={entry.slug}
          className="relative w-full"
          style={{ ...widthStyle, aspectRatio }}
        >
          {/* Left-margin № watermark — gated on lg or xl depending on plate width. */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute right-full top-1/2 -translate-y-1/2 select-none pr-16",
              watermarkVisibility,
            )}
          >
            <div
              className="whitespace-nowrap font-display leading-none text-[var(--color-text-muted)] opacity-25"
              style={{
                fontSize: "84px",
                fontVariationSettings: '"opsz" 96, "SOFT" 30',
              }}
            >
              № {plateNumber}
            </div>
          </div>

          <RegistrationCrosshair size={40} className="absolute -left-5 -top-5" />
          <RegistrationCrosshair
            size={40}
            className="absolute -right-5 -top-5"
            ghost={{ dx: 2, dy: -1, opacity: 0.45 }}
          />
          <RegistrationCrosshair size={40} className="absolute -left-5 -bottom-5" />
          <RegistrationCrosshair size={40} className="absolute -right-5 -bottom-5" />

          <div className="absolute inset-0 overflow-hidden">{children}</div>
        </div>

        {/* Bottom halftone fade — plate transitioning back to paper. */}
        <FadeBand height={80} direction="out" maxWidth={maxWidth} />

        {/* Colophon sits below the bottom fade with explicit breath. */}
        <div className="mt-12 w-full" style={widthStyle}>
          <Colophon
            sourceOpen={sourceOpen}
            panelId={panelId}
            onToggle={() => setSourceOpen((o) => !o)}
          />
        </div>
      </div>

      {/* Backdrop — only when open AND below xl (drawer mode). */}
      <div
        aria-hidden="true"
        onClick={() => setSourceOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-[var(--color-text)]/30 transition-opacity duration-200 xl:hidden",
          sourceOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Source panel — desktop marginalia + mobile drawer in one element. */}
      <aside
        id={panelId}
        role="region"
        aria-label={`Source for plate № ${plateNumber}`}
        inert={!sourceOpen}
        className={cn(
          "fixed z-50 flex flex-col bg-[var(--color-surface)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out",
          // Mobile/tablet: bottom drawer.
          "inset-x-0 bottom-0 h-[85dvh] rounded-t-[var(--radius-md)]",
          // xl+: right-side marginalia, full height, no rounded corners.
          "xl:inset-auto xl:right-0 xl:top-0 xl:h-full xl:w-[440px] xl:rounded-none xl:border-l xl:border-[var(--color-border)] xl:shadow-[-8px_0_24px_rgba(0,0,0,0.06)]",
          // Transform state.
          sourceOpen
            ? "translate-y-0 xl:translate-x-0"
            : "translate-y-full xl:translate-y-0 xl:translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Plate № {plateNumber} · {entry.filename}
          </div>
          <button
            type="button"
            onClick={() => setSourceOpen(false)}
            aria-label="Close source"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            <X size={13} strokeWidth={1.6} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">{source}</div>
      </aside>
    </div>
  );
}

/**
 * FadeBand — Bridson-distributed dot strip whose density ramps along the
 * vertical axis. "Into" peaks at the bottom (plate-side); "out" peaks at the
 * top (plate-side). Peak density 0.7 follows the dots_reserach.md spec.
 *
 * Coverage at the densest end works out to ~10% area, well inside the
 * locked print-canon range [0.03, 0.22]. Single-tone (`accentRatio: 0`)
 * because the fade is rhythm, not accent.
 */
function FadeBand({
  height = 80,
  direction,
  maxWidth = 600,
}: {
  height?: number;
  direction: "into" | "out";
  maxWidth?: number;
}) {
  const peakDensity = 0.7;
  const density =
    direction === "into"
      ? (_x: number, y: number, _w: number, h: number) => peakDensity * (y / h)
      : (_x: number, y: number, _w: number, h: number) =>
          peakDensity * (1 - y / h);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none w-full"
      style={{ height: `${height}px`, maxWidth: `${maxWidth}px` }}
    >
      <DotField
        shape={{ kind: "rect", width: maxWidth, height }}
        spacing={5}
        dotRadius={1.1}
        baseDensity={1}
        density={density}
        accentRatio={0}
        seed={direction === "into" ? 7 : 17}
        className="h-full w-full"
      />
    </div>
  );
}

/**
 * Foot-of-page colophon — typeset book caption beneath the plate. The
 * `· read the plate ·` button is the source-reveal trigger; styled inline
 * to read as part of the colophon prose, not as a separate UI element.
 */
function Colophon({
  sourceOpen,
  panelId,
  onToggle,
}: {
  sourceOpen: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  return (
    <div
      className="w-full text-center font-display text-[12px] italic leading-[1.7] text-[var(--color-text-muted)] [text-wrap:balance]"
      style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
    >
      Set in Fraunces 96/96 SOFT 30, Geist Sans 14/21, Geist Mono 13/19.
      Composed in TypeScript 6. Pressed onto Tailwind v4. First impression May 2026.{" "}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={sourceOpen}
        aria-controls={panelId}
        className="link cursor-pointer border-0 bg-transparent p-0 font-display text-[12px] italic text-[var(--color-text)]"
        style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
      >
        · read the plate ·
      </button>
    </div>
  );
}
