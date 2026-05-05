"use client";

import { useRef, useState } from "react";
import { mulberry32 } from "@/components/_kit/dot-noise";
import { Trace, type TracePoint } from "@/components/_kit/trace";

/**
 * REGISTRY:
 * {
 *   domain: "saas",
 *   category: "dashboards",
 *   slug: "deploy-pipeline",
 *   title: "Deploy pipeline",
 *   filename: "deploy-pipeline.tsx",
 *   description: "Three environment lanes — preview / staging / production. Each deploy is a dot on a time axis; rollout duration trails behind. Failed deploys ink persimmon, the live deploy wears a Federal Blue ring with the pulse.",
 *   layout: "specimen",
 *   aspectRatio: "16 / 9",
 *   maxWidth: 880,
 *   firstImpression: "2026-05-04",
 * }
 */

/**
 * Deploy pipeline — three horizontal env lanes (preview / staging / production)
 * read top-to-bottom by promotion order. Each deploy is a dot on its lane at
 * commit time; a hairline trail behind the dot encodes rollout duration. A
 * sparse Trace under each lane carries deploy frequency (24-hour rolling).
 *
 * Encoding:
 *   - x = commit time (24h window, right edge = now)
 *   - y = environment lane
 *   - dot fill: walnut = succeeded, persimmon = failed, hollow = rolled back
 *   - dot ring: Federal Blue + pulse = in-flight (production lane only here)
 *   - trailing hairline length = rollout duration (longer trail = slower deploy)
 *   - sparse Trace under each lane = deploy frequency over the window
 *
 * Motion (interactivity pass, 2026-05-04):
 *   - Live ring uses calibrated `live-pulse` keyframes from globals.css
 *     (0.45 → 1 → 0.45 over 2000ms ease-in-out), not Tailwind's animate-pulse.
 *   - Native <title> tooltips replaced with the activity-heatmap in-SVG
 *     tooltip pattern: hover state lifted to a single useState across all
 *     three lanes, custom <g> rendered last in the SVG, mono-caps eyebrow
 *     + Fraunces italic content. 0ms in, 120ms ease-out out (opacity-toggle
 *     so position doesn't jump on exit).
 *
 * Client component — needs hover state for the cross-lane custom tooltip.
 */

type DeployStatus = "ok" | "fail" | "rolled-back" | "live";

type Deploy = {
  /** Commit time as a 0..1 position across the 24h window. */
  t: number;
  status: DeployStatus;
  /** Rollout duration as a 0..1 fraction of the lane width. */
  rollout: number;
  sha: string;
  branch: string;
  /** Rollout duration in seconds — used by the tooltip prose. */
  rolloutSeconds: number;
};

type Lane = {
  env: "preview" | "staging" | "production";
  label: string;
  branchRef: string;
  deploys: Deploy[];
  /** 24-bin rolling deploy count for the sparse Trace beneath the lane. */
  frequency: TracePoint[];
};

function shaFromSeed(seed: number): string {
  const rng = mulberry32(seed * 9973);
  let s = "";
  const hex = "0123456789abcdef";
  for (let i = 0; i < 7; i++) s += hex[Math.floor(rng() * 16)];
  return s;
}

function buildLane(args: {
  env: Lane["env"];
  label: string;
  branchRef: string;
  seed: number;
  count: number;
  failureRate: number;
  rolloutBase: number;
  liveAt?: number;
}): Lane {
  const { env, label, branchRef, seed, count, failureRate, rolloutBase, liveAt } = args;
  const rng = mulberry32(seed);
  const ts: number[] = [];
  for (let i = 0; i < count; i++) ts.push(rng());
  ts.sort((a, b) => a - b);
  const deploys: Deploy[] = ts.map((t, i) => {
    const r = rng();
    let status: DeployStatus = "ok";
    if (r < failureRate) status = "fail";
    else if (r < failureRate + 0.06) status = "rolled-back";
    const rollout = rolloutBase + rng() * 0.04;
    // 24h × 3600s = 86400s; rollout fraction × window seconds.
    const rolloutSeconds = Math.round(rollout * 86400);
    return {
      t,
      status,
      // Bumped 2.5x from earlier hairline values so trails read as a
      // duration encoding rather than melting into adjacent dots.
      rollout,
      rolloutSeconds,
      sha: shaFromSeed(seed + i + 1),
      branch:
        env === "preview"
          ? `pr/${300 + Math.floor(rng() * 90)}`
          : env === "staging"
            ? `release/2026.${5}.${1 + Math.floor(rng() * 8)}`
            : "main",
    };
  });
  if (liveAt !== undefined && deploys.length > 0) {
    deploys[deploys.length - 1] = {
      ...deploys[deploys.length - 1],
      t: liveAt,
      status: "live",
    };
  }
  // 24 bins of frequency.
  const bins = new Array(24).fill(0);
  for (const d of deploys) {
    const bin = Math.min(23, Math.floor(d.t * 24));
    bins[bin] += 1;
  }
  // Smooth a touch by rolling 3-bin average so the Trace reads as a curve.
  const smoothed: TracePoint[] = bins.map((_, i) => {
    const a = bins[Math.max(0, i - 1)];
    const b = bins[i];
    const c = bins[Math.min(23, i + 1)];
    return { x: i, y: (a + b + c) / 3 };
  });
  return { env, label, branchRef, deploys, frequency: smoothed };
}

const LANES: Lane[] = [
  buildLane({
    env: "preview",
    label: "Preview",
    branchRef: "pr/*",
    seed: 17,
    count: 22,
    failureRate: 0.18,
    rolloutBase: 0.03,
  }),
  buildLane({
    env: "staging",
    label: "Staging",
    branchRef: "release/2026.5.x",
    seed: 41,
    count: 14,
    failureRate: 0.1,
    rolloutBase: 0.055,
  }),
  buildLane({
    env: "production",
    label: "Production",
    branchRef: "main",
    seed: 73,
    count: 9,
    failureRate: 0.06,
    rolloutBase: 0.085,
    liveAt: 0.94,
  }),
];

const STATUS_INK: Record<DeployStatus, string> = {
  ok: "var(--color-text)",
  fail: "var(--color-accent)",
  "rolled-back": "var(--color-text-muted)",
  live: "var(--color-accent-2)",
};

const STATUS_LABEL: Record<DeployStatus, string> = {
  ok: "succeeded",
  fail: "failed",
  "rolled-back": "rolled back",
  live: "in flight",
};

function formatRollout(seconds: number): string {
  if (seconds < 60) return `rolled out in ${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `rolled out in ${m}m`;
  return `rolled out in ${m}m ${s}s`;
}

export default function DeployPipeline() {
  // Single hover state across all three lanes. Holds the LAST hovered
  // deploy through the exit transition so position doesn't jump.
  const [hovered, setHovered] = useState<{
    deploy: Deploy;
    lane: Lane;
  } | null>(null);

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] px-6 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Pipeline · last 24 hours
            </div>
            <h2
              className="mt-1 font-display text-[28px] italic leading-none tracking-[-0.02em] text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
            >
              stipple-press / deploys
            </h2>
          </div>
          {/* Federal Blue pulse retired here — page is live by definition.
              Pulse is reserved for the in-flight production data dot. */}
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <span
              className="inline-flex items-center rounded-[var(--radius-xs)] border border-[var(--color-border)] px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
            >
              live
            </span>
            14:08 UTC
          </div>
        </div>

        {/* Legend strip — single source of truth for the dot vocabulary. */}
        <StatusLegend />

        {/* Three env lanes. */}
        <ul className="flex min-h-0 flex-1 flex-col divide-y divide-[var(--color-border)]">
          {LANES.map((lane) => (
            <LaneRow
              key={lane.env}
              lane={lane}
              hovered={hovered}
              setHovered={setHovered}
            />
          ))}
        </ul>

        {/* Shared time axis — one row of tick labels for all three lanes,
            so 24h orientation reads once rather than three times. */}
        <TimeAxis />

        {/* Foot rule — window descriptor only. Branch refs already appear in
            each lane's left column, so the colophon carries unique info
            (window range + freshness) rather than echoing them. */}
        <p
          className="border-t border-[var(--color-border)] px-6 py-2 text-center text-[11px] italic text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          <span className="not-italic font-mono text-[10px] uppercase tracking-[0.14em]">
            00:00 → 14:08 UTC
          </span>
          <span className="not-italic"> · </span>
          <span className="not-italic font-mono text-[10px] uppercase tracking-[0.14em]">
            refreshed 12s ago
          </span>
        </p>
      </div>
    </div>
  );
}

function LaneRow({
  lane,
  hovered,
  setHovered,
}: {
  lane: Lane;
  hovered: { deploy: Deploy; lane: Lane } | null;
  setHovered: (h: { deploy: Deploy; lane: Lane } | null) => void;
}) {
  // Lane geometry — all in user units; SVG scales via the parent.
  const W = 720;
  const H = 36;
  const padX = 8;
  const innerW = W - padX * 2;
  const yDot = 18;

  // Hold the last-hovered deploy from THIS lane so the exit transition
  // animates from its real position rather than snapping. We keep a ref
  // so it survives across renders without re-triggering effects.
  const lastRef = useRef<Deploy | null>(null);
  const isLaneHover = hovered && hovered.lane.env === lane.env;
  if (isLaneHover) lastRef.current = hovered.deploy;
  const tooltipDeploy = isLaneHover ? hovered.deploy : lastRef.current;

  return (
    <li className="grid flex-1 grid-cols-[132px_1fr_120px] items-center gap-4 px-6 py-3">
      {/* Env label */}
      <div className="leading-tight">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text)]">
          {lane.label}
        </div>
        <div className="mt-1 font-mono text-[10px] tracking-tight text-[var(--color-text-muted)]">
          {lane.branchRef}
        </div>
      </div>

      {/* Lane body — dots + trails on top, sparse Trace underneath as a sibling SVG */}
      <div className="min-w-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          className="block"
          aria-label={`${lane.label} deploys, last 24 hours`}
          shapeRendering="geometricPrecision"
        >
          {/* Lane base rule — hairline ground line for the dots to sit on. */}
          <line
            x1={padX}
            x2={W - padX}
            y1={yDot}
            y2={yDot}
            stroke="var(--color-border)"
            strokeWidth={0.6}
          />

          {/* Tick marks every 6h for time legibility. */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={padX + t * innerW}
              x2={padX + t * innerW}
              y1={yDot - 4}
              y2={yDot + 4}
              stroke="var(--color-border-strong)"
              strokeWidth={0.5}
              opacity={0.5}
            />
          ))}

          {/* Per-deploy rollout trail — drawn before the dot.
              Fix path chosen: hairline (option A) — bumped rolloutBase ~2.5x,
              opacity to 0.7, stroke-width to 1.6. Reads as a continuous trace
              of duration without competing with the dot punctuation. */}
          {lane.deploys.map((d, i) => {
            const cx = padX + d.t * innerW;
            const trailW = d.rollout * innerW;
            const x1 = Math.max(padX, cx - trailW);
            return (
              <line
                key={`trail-${i}`}
                x1={x1}
                x2={cx}
                y1={yDot}
                y2={yDot}
                stroke={
                  d.status === "fail"
                    ? "var(--color-accent)"
                    : d.status === "live"
                      ? "var(--color-accent-2)"
                      : "var(--color-text-muted)"
                }
                strokeWidth={1.6}
                strokeLinecap="round"
                opacity={d.status === "rolled-back" ? 0.5 : 0.7}
              />
            );
          })}

          {/* Dots — one per deploy. Hover handlers lift to the parent's
              shared `hovered` state; the custom tooltip group renders last
              in the SVG so it paints on top. */}
          {lane.deploys.map((d, i) => {
            const cx = padX + d.t * innerW;
            const onEnter = () => setHovered({ deploy: d, lane });
            const onLeave = () => setHovered(null);
            // Larger invisible hit target so small dots are still hoverable.
            const hit = (
              <circle
                cx={cx}
                cy={yDot}
                r={7}
                fill="transparent"
                pointerEvents="all"
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              />
            );
            if (d.status === "live") {
              return (
                <g key={`dot-${i}`}>
                  {/* Calibrated live-pulse ring — opacity-only animation,
                      keyframes defined in app/globals.css. */}
                  <circle
                    cx={cx}
                    cy={yDot}
                    r={5}
                    fill="none"
                    stroke="var(--color-accent-2)"
                    strokeWidth={1}
                    className="origin-center animate-live-pulse"
                  />
                  <circle
                    cx={cx}
                    cy={yDot}
                    r={2.4}
                    fill="var(--color-accent-2)"
                  />
                  {hit}
                </g>
              );
            }
            if (d.status === "rolled-back") {
              return (
                <g key={`dot-${i}`}>
                  <circle
                    cx={cx}
                    cy={yDot}
                    r={2.2}
                    fill="var(--color-bg)"
                    stroke="var(--color-text-muted)"
                    strokeWidth={1}
                  />
                  {hit}
                </g>
              );
            }
            return (
              <g key={`dot-${i}`}>
                <circle
                  cx={cx}
                  cy={yDot}
                  r={2.2}
                  fill={STATUS_INK[d.status]}
                />
                {hit}
              </g>
            );
          })}

          {/* Custom tooltip — rendered LAST so it paints over the dots.
              Always present in the DOM; opacity toggles for the 120ms
              ease-out exit. Position frozen to the last hovered deploy
              during the exit so the tooltip doesn't jump. */}
          <DeployTooltip
            visible={!!isLaneHover}
            deploy={tooltipDeploy}
            laneW={W}
            padX={padX}
            innerW={innerW}
            yDot={yDot}
          />
        </svg>

        {/* Sparse Trace beneath — deploy-frequency rolling average. */}
        <Trace
          data={lane.frequency}
          width={W}
          height={18}
          smooth
          strokeColor="var(--color-text-muted)"
          strokeWidth={0.8}
          fill={{
            kind: "below",
            y: 0,
            // Bumped 8% → 14% so the frequency Trace doesn't disappear into
            // the dark-mode bg; theme-aware via color-mix on the muted token.
            color:
              "color-mix(in oklch, var(--color-text-muted) 14%, transparent)",
          }}
          margin={1}
          className="block w-full"
          ariaLabel={`${lane.label} deploy frequency`}
        />
      </div>

      {/* Right gutter — count summary */}
      <div className="flex flex-col items-end leading-tight">
        <span
          className="font-display text-[26px] leading-none italic tracking-[-0.02em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          {lane.deploys.length}
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          deploys · 24h
        </span>
        {lane.deploys.some((d) => d.status === "fail") && (
          <span
            className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-tight"
            style={{ color: "var(--color-accent)" }}
          >
            {/* Leading persimmon dot ties this count to the legend swatch
                so the colour-meaning binding is visible inline. */}
            <span
              aria-hidden
              className="h-1 w-1 rounded-full"
              style={{ background: "var(--color-accent)" }}
            />
            {lane.deploys.filter((d) => d.status === "fail").length} failed
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * In-SVG tooltip for a deploy. Mono-caps eyebrow with the time anchor,
 * Fraunces italic body carrying `{sha} · {branch} · {status}`, plus a
 * formatted rollout duration. Position resolves above the dot, flipping
 * below when there's no room (top of the SVG). Opacity toggles for the
 * 120ms ease-out exit; geometry is held during the fade so it doesn't
 * jump.
 */
function DeployTooltip({
  visible,
  deploy,
  laneW,
  padX,
  innerW,
  yDot,
}: {
  visible: boolean;
  deploy: Deploy | null;
  laneW: number;
  padX: number;
  innerW: number;
  yDot: number;
}) {
  if (!deploy) return null;

  const TIP_W = 200;
  const TIP_H = 38;
  const MARGIN = 6;

  const cx = padX + deploy.t * innerW;
  const aboveY = yDot - TIP_H - MARGIN;
  const belowY = yDot + MARGIN;
  const useBelow = aboveY < 0;
  const y = useBelow ? belowY : aboveY;
  const xRaw = cx - TIP_W / 2;
  const x = Math.max(0, Math.min(laneW - TIP_W, xRaw));

  // Approximate clock time for the eyebrow — t in [0,1] across the 24h window.
  const totalMin = Math.round(deploy.t * 24 * 60);
  const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  const eyebrow = `${hh}:${mm} UTC · ${formatRollout(deploy.rolloutSeconds)}`;
  const body = `${deploy.sha} · ${deploy.branch} · ${STATUS_LABEL[deploy.status]}`;

  return (
    <g
      transform={`translate(${x} ${y})`}
      pointerEvents="none"
      aria-hidden
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 120ms ease-out",
      }}
    >
      <rect
        width={TIP_W}
        height={TIP_H}
        fill="var(--color-bg)"
        stroke="var(--color-border-strong)"
        strokeWidth={0.7}
        rx={3}
      />
      <text
        x={TIP_W / 2}
        y={14}
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fill: "var(--color-text-muted)",
        }}
      >
        {eyebrow}
      </text>
      <text
        x={TIP_W / 2}
        y={30}
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 12,
          fontStyle: "italic",
          fontVariationSettings: '"opsz" 24, "SOFT" 30',
          fill: "var(--color-text)",
        }}
      >
        {body}
      </text>
    </g>
  );
}

/**
 * Shared 24h x-axis label row — sits beneath the three lanes and labels the
 * tick marks each lane already draws. Geometry mirrors LaneRow (132px label
 * column + 1fr lane body + 120px gutter, padX 8 inside the SVG) so labels
 * land directly under their ticks. Renders once for all three lanes; not
 * per-lane.
 */
function TimeAxis() {
  const W = 720;
  const H = 12;
  const padX = 8;
  const innerW = W - padX * 2;
  const ticks: Array<{ t: number; label: string; anchor: "start" | "middle" | "end" }> = [
    { t: 0, label: "00", anchor: "start" },
    { t: 0.25, label: "06", anchor: "middle" },
    { t: 0.5, label: "12", anchor: "middle" },
    { t: 0.75, label: "18", anchor: "middle" },
    { t: 1, label: "now", anchor: "end" },
  ];
  return (
    <div className="grid shrink-0 grid-cols-[132px_1fr_120px] items-center gap-4 border-t border-[var(--color-border)] px-6 py-1.5">
      <div aria-hidden />
      <div className="min-w-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          className="block"
          aria-label="24-hour window axis"
          shapeRendering="geometricPrecision"
        >
          {ticks.map((tk) => (
            <text
              key={tk.label}
              x={padX + tk.t * innerW}
              y={H - 2}
              textAnchor={tk.anchor}
              className="font-mono"
              style={{
                fontSize: 8,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fill: "var(--color-text-muted)",
              }}
            >
              {tk.label}
            </text>
          ))}
        </svg>
      </div>
      <div aria-hidden />
    </div>
  );
}

function StatusLegend() {
  const items: Array<{ status: DeployStatus; label: string }> = [
    { status: "ok", label: "succeeded" },
    { status: "fail", label: "failed" },
    { status: "rolled-back", label: "rolled back" },
    { status: "live", label: "in-flight" },
  ];
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--color-border)] px-6 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
      <span aria-hidden>Deploy key</span>
      {items.map((it) => (
        <span key={it.status} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {it.status === "rolled-back" ? (
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full border"
              style={{ borderColor: "var(--color-text-muted)" }}
            />
          ) : it.status === "live" ? (
            <span
              aria-hidden
              className="grid h-2 w-2 place-items-center rounded-full"
              style={{ boxShadow: "inset 0 0 0 1px var(--color-accent-2)" }}
            >
              <span
                className="h-1 w-1 rounded-full"
                style={{ background: "var(--color-accent-2)" }}
              />
            </span>
          ) : (
            <span
              aria-hidden
              className="h-1 w-1 rounded-full"
              style={{ background: STATUS_INK[it.status] }}
            />
          )}
          <span>{it.label}</span>
        </span>
      ))}
      <span className="ml-auto inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-px w-4"
          style={{ background: "var(--color-text-muted)", opacity: 0.55 }}
        />
        <span>trail = rollout duration</span>
      </span>
    </div>
  );
}
