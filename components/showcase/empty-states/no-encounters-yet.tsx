"use client";

import { ArrowRight, Plus } from "lucide-react";
import { mulberry32 } from "@/components/_kit/dot-noise";

/**
 * Empty state for "no recent encounters." The illustration is an EKG trace
 * rendered entirely from dots, fading from a normal sinus rhythm at the
 * left to a flat baseline at the right — visualising "no signal yet" in
 * the same primitive as the rest of the gallery.
 *
 * Each dot is placed along an analytic ECG waveform y(t); the trace's ink
 * tapers to walnut-on-paper as we approach the right edge, where the
 * waveform itself flattens. Two-tone: walnut for ordinary samples, Federal
 * Blue at the R-peaks (the high-information moments of the trace).
 *
 * Pure server-renderable except for the CTA wiring; marked client to keep
 * future buttonable behaviour in one place.
 */

export default function NoEncountersYet() {
  return (
    <div className="grid h-full w-full place-items-center bg-[var(--color-bg)] px-6 py-12">
      <div className="flex w-full max-w-[420px] flex-col items-center text-center">
        <Illustration />

        <h2
          className="mt-8 font-display text-[28px] leading-tight tracking-[-0.022em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30' }}
        >
          No encounters yet.
        </h2>
        <p className="mt-2 max-w-[36ch] text-[13px] text-[var(--color-text-muted)]">
          When this patient has a visit, it will appear here. Start a new
          encounter to take vitals, write a note, or place an order.
        </p>

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-[13px] text-[var(--color-accent-fg)] hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px"
          >
            <Plus size={13} strokeWidth={1.8} />
            Start an encounter
          </button>
          <a
            href="#"
            className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            View past charts
            <ArrowRight size={12} strokeWidth={1.6} />
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * EKG illustration. Cardiac complex rendered analytically, then sampled
 * densely with a small jitter so the trace reads as ink-stipple.
 *
 * The waveform is a sum of three Gaussian bumps per beat (P, R, T) plus a
 * fast Q/S dip flanking R. Coverage gradient on x: full ink across 0–60% of
 * the field, fading to baseline at 100%.
 */
function Illustration() {
  const W = 360;
  const H = 110;
  const baselineY = H / 2 + 12;

  // Three complete cardiac beats fit cleanly across the trace,
  // then one partial-and-fading on the right.
  const beats = 3;
  const beatWidth = (W * 0.7) / beats;
  const startX = 8;

  // Sample the waveform at high resolution and emit one dot per sample
  // with small vertical jitter — gives "stippled trace" rather than "thin
  // SVG path."
  const SAMPLES = 480;
  const rng = mulberry32(2049);
  const dots: { x: number; y: number; accent: boolean }[] = [];
  const accents: { x: number; y: number }[] = [];

  for (let i = 0; i < SAMPLES; i++) {
    const xs = i / (SAMPLES - 1);
    const x = xs * W;
    // Trace fade: full from xs in [0..0.6], linearly down to 0 at xs = 1.
    const fade = xs < 0.6 ? 1 : Math.max(0, 1 - (xs - 0.6) / 0.4);
    if (fade < 0.04) continue; // give up on near-zero amplitude
    if (rng() > 0.6 + fade * 0.35) continue; // sparse-where-faded

    // Where in the beat are we? Convert x → beat phase (0..1 within a beat).
    // Beats live within [startX, startX + beats*beatWidth]; outside that,
    // y stays on baseline (the flat-line tail).
    let y = baselineY;
    let isR = false;
    if (x >= startX && x < startX + beats * beatWidth) {
      const into = (x - startX) % beatWidth;
      const phase = into / beatWidth;
      const sig = beatSignal(phase);
      y = baselineY - sig.y * 36 * fade; // amplitude scales with fade
      isR = sig.isR;
    }

    // Vertical jitter — gives ink-stipple texture rather than a 1-px path.
    const jy = y + (rng() - 0.5) * 1.6;
    const jx = x + (rng() - 0.5) * 0.6;
    dots.push({ x: jx, y: jy, accent: false });
    if (isR && rng() < 0.45) accents.push({ x: jx, y: jy });
  }

  return (
    <svg
      role="img"
      aria-label="Pointillism EKG fading from sinus rhythm to flat line"
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full max-w-[300px]"
    >
      {/* Hairline rule along the baseline — quiet, dotted. */}
      <line
        x1={0}
        x2={W}
        y1={baselineY}
        y2={baselineY}
        stroke="var(--color-border)"
        strokeWidth="0.4"
        strokeDasharray="1 2"
      />

      {/* Ground shadow under the trace — sparse blob, walnut. */}
      <Shadow w={W} y={baselineY + 14} />

      {/* The trace itself. */}
      {dots.map((d, i) => (
        <circle key={`t-${i}`} cx={d.x} cy={d.y} r={0.95} fill="var(--color-text)" opacity={0.78} />
      ))}

      {/* Federal Blue accents on the R-peaks. Same vocabulary as the focus
          halo and the vitals live-marker — "this is the moment that
          matters." */}
      {accents.map((d, i) => (
        <circle key={`a-${i}`} cx={d.x} cy={d.y} r={1.05} fill="var(--color-accent-2)" />
      ))}
    </svg>
  );
}

/**
 * Analytic signal y(t) for a single normalized beat phase t in [0, 1).
 *
 *   P wave  : Gaussian bump centered at t=0.10
 *   Q dip   : narrow negative bump at t=0.18
 *   R spike : tall narrow positive bump at t=0.20
 *   S dip   : narrow negative bump at t=0.22
 *   T wave  : Gaussian bump centered at t=0.40
 *
 * Returns y in roughly [-0.4, 1.0] and an `isR` flag for the R-peak window
 * so callers can highlight that part of the trace.
 */
function beatSignal(t: number) {
  const gaussian = (mu: number, sigma: number, amp: number) =>
    amp * Math.exp(-((t - mu) ** 2) / (2 * sigma * sigma));

  const p = gaussian(0.1, 0.022, 0.18);
  const q = gaussian(0.18, 0.012, -0.18);
  const r = gaussian(0.2, 0.011, 1.0);
  const s = gaussian(0.22, 0.012, -0.32);
  const tw = gaussian(0.4, 0.04, 0.32);
  const isR = t > 0.185 && t < 0.215;
  return { y: p + q + r + s + tw, isR };
}

/** A small, sparse Bridson blob beneath the trace — material weight. */
function Shadow({ w, y }: { w: number; y: number }) {
  const rng = mulberry32(7707);
  const dots: React.ReactElement[] = [];
  for (let i = 0; i < 90; i++) {
    const x = rng() * w;
    // Concentrate the blob under the active part of the trace.
    const t = x / w;
    const keep = Math.max(0.05, 1 - Math.abs(t - 0.3));
    if (rng() > keep * 0.4) continue;
    const dy = (rng() - 0.5) * 6;
    dots.push(
      <circle
        key={i}
        cx={x}
        cy={y + dy}
        r={0.7}
        fill="var(--color-text)"
        opacity={0.18}
      />,
    );
  }
  return <>{dots}</>;
}
