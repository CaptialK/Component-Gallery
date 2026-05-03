import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RegistrationCrosshair } from "@/components/_kit/registration-crosshair";
import { getCategoryLabel } from "@/lib/registry";

/**
 * SpecimenShell — Spike 2 page treatment. The plate is implicit: defined by
 * four registration crosshairs at its corners, not by a border. The component
 * floats centered inside, painting its own surface.
 *
 * Step 1 shipped the plate frame + crosshairs.
 * Step 2 adds the typographic register: a Fraunces small-italic running head
 * across the top, and a large Fraunces № plate-number watermark in the left
 * margin (desktop only — there is no margin to put it in below `lg`).
 *
 * Server-renderable for now (no client state).
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
  children,
}: {
  entry: EntryShape;
  plateNumber: string;
  children: React.ReactNode;
}) {
  const categoryLabel = getCategoryLabel(entry.category);

  return (
    <div className="relative min-h-dvh bg-[var(--color-bg)]">
      {/* Index back-link — quiet mono, top-left. Kept across all breakpoints
          so navigation works even when the running head hides on mobile. */}
      <Link
        href="/"
        aria-label="Back to index"
        className="absolute left-6 top-6 z-10 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={11} strokeWidth={1.6} />
        <span className="font-mono">index</span>
      </Link>

      {/* Running head — Fraunces small italic, top-center. Hidden on narrow
          screens because there's no room for the catalogue prose without
          breaking the line; the back-link still anchors the page. */}
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

      {/* Plate area. */}
      <div className="grid min-h-dvh place-items-center px-8 py-24">
        <div
          data-plate={entry.slug}
          className="relative w-full max-w-[600px]"
          style={{ aspectRatio: "5 / 6" }}
        >
          {/* Plate-number watermark in the left margin — printer's mark.
              Roman, large, low-opacity Fraunces. Hidden below `lg` (no margin
              to occupy). Centered vertically against the plate. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-full top-1/2 hidden -translate-y-1/2 select-none pr-16 lg:block"
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

          {/* Crosshairs — four corners; top-right gets the misregistration ghost. */}
          <RegistrationCrosshair size={40} className="absolute -left-5 -top-5" />
          <RegistrationCrosshair
            size={40}
            className="absolute -right-5 -top-5"
            ghost={{ dx: 2, dy: -1, opacity: 0.45 }}
          />
          <RegistrationCrosshair size={40} className="absolute -left-5 -bottom-5" />
          <RegistrationCrosshair size={40} className="absolute -right-5 -bottom-5" />

          {/* The plate surface — the component fills it. No border. */}
          <div className="absolute inset-0 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}
