import { ArrowRight, Plus } from "lucide-react";
import { DotField } from "@/components/_kit/dot-field";

export default function InboxZero() {
  return (
    <div className="grid h-full w-full place-items-center bg-[var(--color-bg)] px-4 py-12">
      <div className="flex w-full max-w-[440px] flex-col items-center text-center">
        {/* Pointillism illustration: an empty envelope/tray, two-tone, varying density */}
        <Illustration />

        <h2
          className="mt-8 font-display text-[28px] leading-tight tracking-[-0.022em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30' }}
        >
          Inbox zero.
        </h2>
        <p className="mt-2 max-w-[34ch] text-sm text-[var(--color-text-muted)]">
          Nothing waiting on you. Forward an email to
          <span className="ml-1 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-0.5 font-mono text-[11px] text-[var(--color-text)]">
            you+inbox@stipple.lab
          </span>{" "}
          or start something new.
        </p>

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-sm text-[var(--color-accent-fg)] transition-[transform,border-color] duration-[120ms] ease-out hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px"
          >
            <Plus size={13} strokeWidth={1.8} />
            New thread
          </button>
          <a
            href="#"
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            View archive
            <ArrowRight size={13} strokeWidth={1.6} />
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * The illustration is built entirely from <DotField />. We compose three
 * shapes (envelope body + flap + ground shadow) into one SVG-feeling unit.
 *
 * Density falls off toward edges so the form reads as a soft Seurat-y mass
 * rather than a hard rectangle.
 */
function Illustration() {
  return (
    <div className="relative h-[180px] w-[260px]">
      {/* Ground shadow — sparse dot blob */}
      <div className="absolute inset-x-0 bottom-0 mx-auto h-10 w-[220px]">
        <DotField
          shape={{ kind: "circle", cx: 110, cy: 32, r: 100 }}
          spacing={6}
          dotRadius={1}
          baseDensity={0.45}
          accentRatio={0.04}
          seed={101}
          density={(x, y, w, h) => {
            const dx = (x - w / 2) / (w / 2);
            const dy = (y - h * 0.85) / (h * 0.4);
            return Math.max(0, 1 - (dx * dx + dy * dy));
          }}
          className="h-full w-full"
        />
      </div>

      {/* Envelope body */}
      <div className="absolute left-1/2 top-3 h-[120px] w-[200px] -translate-x-1/2">
        <DotField
          shape={{
            kind: "path",
            // Envelope body — rounded rectangle
            d: "M14 8 H186 A8 8 0 0 1 194 16 V104 A8 8 0 0 1 186 112 H14 A8 8 0 0 1 6 104 V16 A8 8 0 0 1 14 8 Z",
            viewBox: [0, 0, 200, 120],
          }}
          spacing={4.2}
          dotRadius={1.05}
          baseDensity={0.85}
          accentRatio={0.18}
          seed={42}
          density={(x, y, w, h) => {
            // Heaviest along the perimeter, lighter toward the middle —
            // implies a hollow envelope without drawing it as a stroke.
            const dx = Math.min(x, w - x) / w;
            const dy = Math.min(y, h - y) / h;
            const edge = Math.min(dx, dy);
            return Math.max(0.15, 1 - edge * 1.8);
          }}
          className="h-full w-full"
        />
      </div>

      {/* Envelope flap (V-shape suggesting an opened envelope) */}
      <div className="absolute left-1/2 top-3 h-[60px] w-[200px] -translate-x-1/2">
        <DotField
          shape={{
            kind: "path",
            d: "M6 10 L100 60 L194 10 L194 26 L100 76 L6 26 Z",
            viewBox: [0, 0, 200, 80],
          }}
          spacing={3.4}
          dotRadius={1.1}
          baseDensity={0.92}
          accentRatio={0.32}
          seed={9}
          density={(x, _y, w) => {
            // Denser toward the center (the V's apex)
            const dx = Math.abs(x - w / 2) / (w / 2);
            return 1 - dx * 0.5;
          }}
          className="h-full w-full"
        />
      </div>

      {/* A single accent "letter" peeking — small dotted square */}
      <div className="absolute left-1/2 top-[44px] h-[36px] w-[110px] -translate-x-1/2">
        <DotField
          shape={{ kind: "rect", width: 110, height: 36, rx: 3 }}
          spacing={3.2}
          dotRadius={0.85}
          baseDensity={0.5}
          accentRatio={0.5}
          seed={3}
          className="h-full w-full opacity-70"
        />
      </div>
    </div>
  );
}
