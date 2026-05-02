import { DotField } from "./dot-field";

/**
 * Brand mark — the only chrome that uses pointillism. A small ink-and-accent
 * dot circle next to the wordmark.
 */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="inline-block shrink-0"
      >
        <DotField
          shape={{ kind: "circle", cx: 16, cy: 16, r: 16 }}
          spacing={2.6}
          dotRadius={0.95}
          baseDensity={0.62}
          accentRatio={0.34}
          seed={7}
          density={(x, y, w, h) => {
            const dx = (x - w * 0.5) / (w * 0.5);
            const dy = (y - h * 0.5) / (h * 0.5);
            return 0.5 + 0.5 * Math.max(0, dx + dy);
          }}
          className="block h-full w-full"
        />
      </span>
      <span className="font-mono text-[13px] tracking-tight text-[var(--color-text)]">
        {/* Brand name placeholder — swap during finalization. */}
        {">>> SITE_NAME <<<"}
      </span>
    </span>
  );
}
