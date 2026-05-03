import { DotField } from "./dot-field";

/**
 * Skeleton — blue-noise stipple of an eventual layout.
 *
 * Spike 1: instead of a shimmer rectangle, loading state is the same dot
 * language at low coverage (~3–6%). When real content lands, the dots fade
 * out and the rendered layout takes over. Density does the talking — the
 * darker the field, the closer to "real."
 *
 * Use this for any placeholder where a normal shimmer skeleton would go.
 * Pair with `<DotField />` at higher density for actual decorative fields.
 */
export function Skeleton({
  width,
  height,
  /** Keep-probability after blue-noise sampling. 0.05 reads as "barely there". */
  density = 0.06,
  spacing = 5,
  seed = 1,
  className,
}: {
  width: number;
  height: number;
  density?: number;
  spacing?: number;
  seed?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden>
      <DotField
        shape={{ kind: "rect", width, height }}
        spacing={spacing}
        dotRadius={0.9}
        baseDensity={density}
        accentRatio={0}
        seed={seed}
        className="h-full w-full"
      />
    </div>
  );
}
