import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DotField } from "@/components/_kit/dot-field";

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[var(--color-bg)] px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 grid place-items-center opacity-60"
      >
        <div className="h-[420px] w-[420px]">
          <DotField
            shape={{ kind: "circle", cx: 160, cy: 160, r: 160 }}
            spacing={5}
            dotRadius={1.3}
            baseDensity={0.7}
            accentRatio={0.18}
            seed={404}
            density={(x, y, w, h) => {
              const dx = (x - w / 2) / (w / 2);
              const dy = (y - h / 2) / (h / 2);
              return Math.max(0, 1 - (dx * dx + dy * dy));
            }}
            className="h-full w-full"
          />
        </div>
      </div>
      <div className="relative">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          404
        </div>
        <h1 className="mt-2 text-2xl font-medium tracking-[-0.02em]">
          Nothing on this canvas.
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          The component you were looking for has wandered off.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm hover:border-[var(--color-border-strong)]"
        >
          <ArrowLeft size={13} strokeWidth={1.6} />
          Back to gallery
        </Link>
      </div>
    </main>
  );
}
