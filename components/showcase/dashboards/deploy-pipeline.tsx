"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry32 } from "@/components/_kit/dot-noise";
import { Trace, type TracePoint } from "@/components/_kit/trace";
import { Modal } from "@/components/_kit/modal";
import { useToast } from "@/components/_kit/toast";

/**
 * Deploy pipeline — three env lanes (preview / staging / production).
 *
 * Deep-wire pass (2026-05-04):
 *  - Click a deploy → side detail Modal with SHA, branch, status, rollout
 *    duration, commit message, author, Promote/Rollback actions.
 *  - Legend filters: each chip toggles a status; hidden statuses dim to
 *    fillOpacity 0.15 / trail-opacity 0.1 (200ms transition, never r/cx/cy).
 *  - Promote ghost arc: animates a translate from staging to production
 *    over 320ms paper-ease, then fires a toast and appends a live deploy.
 *  - Time-window toggle: 24h / 7d / 30d regenerates lanes with different
 *    seeds + counts. SVG group fades 200ms during transition.
 *  - Right-gutter focus mode: clicking a lane's count collapses other
 *    lanes to opacity 0.4 / shrink (200ms grid-row transition).
 */

type DeployStatus = "ok" | "fail" | "rolled-back" | "live";

type Deploy = {
  t: number;
  status: DeployStatus;
  rollout: number;
  sha: string;
  branch: string;
  rolloutSeconds: number;
};

type Lane = {
  env: "preview" | "staging" | "production";
  label: string;
  branchRef: string;
  deploys: Deploy[];
  frequency: TracePoint[];
};

type WindowId = "24h" | "7d" | "30d";

const WINDOW_LABEL: Record<WindowId, string> = {
  "24h": "last 24 hours",
  "7d": "last 7 days",
  "30d": "last 30 days",
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
  rolloutScale: number; // multiplier for rolloutSeconds across the window
}): Lane {
  const { env, label, branchRef, seed, count, failureRate, rolloutBase, liveAt, rolloutScale } = args;
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
    const rolloutSeconds = Math.round(rollout * rolloutScale);
    return {
      t,
      status,
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
  const bins = new Array(24).fill(0);
  for (const d of deploys) {
    const bin = Math.min(23, Math.floor(d.t * 24));
    bins[bin] += 1;
  }
  const smoothed: TracePoint[] = bins.map((_, i) => {
    const a = bins[Math.max(0, i - 1)];
    const b = bins[i];
    const c = bins[Math.min(23, i + 1)];
    return { x: i, y: (a + b + c) / 3 };
  });
  return { env, label, branchRef, deploys, frequency: smoothed };
}

function buildLanes(window: WindowId): Lane[] {
  // Different counts/failure rates/rollout scales per window.
  const cfg: Record<WindowId, { mult: number; rolloutScale: number; seedOffset: number }> = {
    "24h": { mult: 1, rolloutScale: 86400, seedOffset: 0 },
    "7d": { mult: 3, rolloutScale: 86400 * 7, seedOffset: 100 },
    "30d": { mult: 6, rolloutScale: 86400 * 30, seedOffset: 250 },
  };
  const c = cfg[window];
  return [
    buildLane({
      env: "preview",
      label: "Preview",
      branchRef: "pr/*",
      seed: 17 + c.seedOffset,
      count: Math.round(22 * c.mult),
      failureRate: 0.18,
      rolloutBase: 0.03,
      rolloutScale: c.rolloutScale,
    }),
    buildLane({
      env: "staging",
      label: "Staging",
      branchRef: "release/2026.5.x",
      seed: 41 + c.seedOffset,
      count: Math.round(14 * c.mult),
      failureRate: 0.1,
      rolloutBase: 0.055,
      rolloutScale: c.rolloutScale,
    }),
    buildLane({
      env: "production",
      label: "Production",
      branchRef: "main",
      seed: 73 + c.seedOffset,
      count: Math.round(9 * c.mult),
      failureRate: 0.06,
      rolloutBase: 0.085,
      liveAt: 0.94,
      rolloutScale: c.rolloutScale,
    }),
  ];
}

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

function commitMessageFor(d: Deploy): string {
  // Deterministic stub from sha digits.
  const seeds = d.sha.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const msgs = [
    "Tighten retry envelope on edge fetch",
    "Roll dead-letter queue out to staging",
    "Patch race in workspace switcher",
    "Bump pinned shiki to align dual-theme tokens",
    "Speed up onboarding plate first-paint",
    "Drop legacy density encoding in heatmap",
    "Wire toast viewport to portal in app shell",
  ];
  return msgs[seeds % msgs.length];
}

function authorFor(d: Deploy): { initials: string; name: string } {
  const seeds = d.sha.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const opts = [
    { initials: "MR", name: "Mara Reyes" },
    { initials: "JT", name: "Jules Tanaka" },
    { initials: "AH", name: "Amir Haddad" },
    { initials: "RG", name: "Rosa Garcia" },
  ];
  return opts[seeds % opts.length];
}

const ALL_STATUSES: DeployStatus[] = ["ok", "fail", "rolled-back", "live"];

export default function DeployPipeline() {
  const [hovered, setHovered] = useState<{ deploy: Deploy; lane: Lane } | null>(null);
  const [selected, setSelected] = useState<{ deploy: Deploy; lane: Lane } | null>(null);
  const [visible, setVisible] = useState<Set<DeployStatus>>(new Set(ALL_STATUSES));
  const [windowId, setWindowId] = useState<WindowId>("24h");
  const [focusEnv, setFocusEnv] = useState<Lane["env"] | null>(null);
  const [swapping, setSwapping] = useState(false);

  // Promote-arc ghost dot.
  const [promoteArc, setPromoteArc] = useState<{
    fromX: number;
    yStart: number;
    yEnd: number;
    sha: string;
  } | null>(null);

  const baseLanes = useMemo(() => buildLanes(windowId), [windowId]);
  // We append "promoted" deploys to production at runtime.
  const [extraProdDeploys, setExtraProdDeploys] = useState<Deploy[]>([]);
  const lanes: Lane[] = useMemo(() => {
    return baseLanes.map((l) => {
      if (l.env !== "production" || extraProdDeploys.length === 0) return l;
      // Replace any prior live status with ok, append the new live.
      const next = l.deploys.map((d) => (d.status === "live" ? { ...d, status: "ok" as DeployStatus } : d));
      return { ...l, deploys: [...next, ...extraProdDeploys] };
    });
  }, [baseLanes, extraProdDeploys]);

  // Window-swap fade.
  const swapKey = windowId;
  const lastSwapRef = useRef(swapKey);
  if (lastSwapRef.current !== swapKey) {
    lastSwapRef.current = swapKey;
  }
  const handleSetWindow = (w: WindowId) => {
    if (w === windowId) return;
    setSwapping(true);
    window.setTimeout(() => setSwapping(false), 200);
    setWindowId(w);
    setExtraProdDeploys([]);
  };

  const { toast } = useToast();

  const onPromote = (deploy: Deploy, lane: Lane) => {
    if (lane.env !== "staging") return;
    // Compute SVG positions in the lane geometry.
    const W = 720;
    const padX = 8;
    const innerW = W - padX * 2;
    const cx = padX + deploy.t * innerW;
    // yStart = staging center, yEnd = production center. Strip rows are 36px
    // tall in user-space; we approximate jump distance in the same coordinate
    // system as a fraction of the lane height. In practice the ghost element
    // lives in DOM (absolute-positioned) so we measure the production lane's
    // top relative to the staging lane.
    setPromoteArc({ fromX: cx, yStart: 0, yEnd: 1, sha: deploy.sha });
    // Toast loading.
    const id = toast({ title: `Promoting ${deploy.sha} → production…`, status: "loading" });
    window.setTimeout(() => {
      setPromoteArc(null);
      // Append a live deploy to production at t≈0.95.
      const newLive: Deploy = {
        t: 0.95,
        status: "live",
        rollout: 0.06,
        rolloutSeconds: 360,
        sha: deploy.sha,
        branch: "main",
      };
      setExtraProdDeploys((prev) => [...prev, newLive]);
      toast({ id, title: `Promoted ${deploy.sha} → production`, status: "success" });
    }, 320);
    setSelected(null);
  };

  const onRollback = (deploy: Deploy) => {
    toast({ title: `Rolled back ${deploy.sha}`, status: "info" });
    setSelected(null);
  };

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] px-6 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Pipeline · {WINDOW_LABEL[windowId]}
            </div>
            <h2
              className="mt-1 font-display text-[28px] italic leading-none tracking-[-0.02em] text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
            >
              stipple-press / deploys
            </h2>
          </div>
          <WindowToggle value={windowId} onChange={handleSetWindow} />
        </div>

        {/* Filterable legend strip. */}
        <FilterableLegend visible={visible} setVisible={setVisible} />

        {/* Three env lanes. */}
        <ul
          className="grid min-h-0 flex-1 divide-y divide-[var(--color-border)] transition-[opacity] duration-[200ms]"
          style={{
            opacity: swapping ? 0 : 1,
            gridTemplateRows: lanes
              .map((l) =>
                focusEnv === null
                  ? "1fr"
                  : focusEnv === l.env
                    ? "3fr"
                    : "0.4fr",
              )
              .join(" "),
            transitionProperty: "opacity, grid-template-rows",
            transitionDuration: "200ms",
          }}
        >
          {lanes.map((lane) => (
            <LaneRow
              key={lane.env}
              lane={lane}
              hovered={hovered}
              setHovered={setHovered}
              setSelected={setSelected}
              visible={visible}
              focused={focusEnv === lane.env}
              dimmed={focusEnv !== null && focusEnv !== lane.env}
              onToggleFocus={() =>
                setFocusEnv((prev) => (prev === lane.env ? null : lane.env))
              }
              promoteArc={lane.env === "production" ? promoteArc : null}
            />
          ))}
        </ul>

        <TimeAxis windowId={windowId} />

        <p
          className="border-t border-[var(--color-border)] px-6 py-2 text-center text-[11px] italic text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          <span className="not-italic font-mono text-[10px] uppercase tracking-[0.14em]">
            click a deploy to inspect · legend filters · count to focus a lane
          </span>
        </p>
      </div>

      {/* Side detail Modal */}
      <Modal
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
        placement="right"
        size="md"
        ariaLabel={selected ? `Deploy ${selected.deploy.sha}` : "Deploy detail"}
      >
        {selected && (
          <DeployDetailPanel
            selected={selected}
            onPromote={() => onPromote(selected.deploy, selected.lane)}
            onRollback={() => onRollback(selected.deploy)}
            onClose={() => setSelected(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function WindowToggle({
  value,
  onChange,
}: {
  value: WindowId;
  onChange: (v: WindowId) => void;
}) {
  const opts: WindowId[] = ["24h", "7d", "30d"];
  return (
    <div
      role="tablist"
      aria-label="Window"
      className="inline-flex items-center gap-px rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
    >
      {opts.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o)}
            className={
              active
                ? "h-6 rounded-[var(--radius-xs)] bg-[var(--color-bg)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)] shadow-[inset_0_0_0_1px_var(--color-border)]"
                : "h-6 rounded-[var(--radius-xs)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function FilterableLegend({
  visible,
  setVisible,
}: {
  visible: Set<DeployStatus>;
  setVisible: (s: Set<DeployStatus>) => void;
}) {
  const items: Array<{ status: DeployStatus; label: string }> = [
    { status: "ok", label: "succeeded" },
    { status: "fail", label: "failed" },
    { status: "rolled-back", label: "rolled back" },
    { status: "live", label: "in-flight" },
  ];
  const toggle = (s: DeployStatus) => {
    const next = new Set(visible);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setVisible(next);
  };
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--color-border)] px-6 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
      <span aria-hidden>Deploy key</span>
      {items.map((it) => {
        const on = visible.has(it.status);
        return (
          <button
            key={it.status}
            type="button"
            onClick={() => toggle(it.status)}
            aria-pressed={on}
            className={
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-xs)] px-1 py-0.5 transition-[opacity,background-color] duration-[120ms] ease-out " +
              (on
                ? "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
                : "opacity-40 hover:opacity-70")
            }
          >
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
          </button>
        );
      })}
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

function LaneRow({
  lane,
  hovered,
  setHovered,
  setSelected,
  visible,
  focused,
  dimmed,
  onToggleFocus,
  promoteArc,
}: {
  lane: Lane;
  hovered: { deploy: Deploy; lane: Lane } | null;
  setHovered: (h: { deploy: Deploy; lane: Lane } | null) => void;
  setSelected: (s: { deploy: Deploy; lane: Lane } | null) => void;
  visible: Set<DeployStatus>;
  focused: boolean;
  dimmed: boolean;
  onToggleFocus: () => void;
  promoteArc: { fromX: number; yStart: number; yEnd: number; sha: string } | null;
}) {
  const W = 720;
  const H = 36;
  const padX = 8;
  const innerW = W - padX * 2;
  const yDot = 18;

  const lastRef = useRef<Deploy | null>(null);
  const isLaneHover = hovered && hovered.lane.env === lane.env;
  if (isLaneHover) lastRef.current = hovered.deploy;
  const tooltipDeploy = isLaneHover ? hovered.deploy : lastRef.current;

  return (
    <li
      className="grid grid-cols-[132px_1fr_120px] items-center gap-4 px-6 py-3 transition-[opacity] duration-[200ms]"
      style={{
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      <div className="leading-tight">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text)]">
          {lane.label}
        </div>
        <div className="mt-1 font-mono text-[10px] tracking-tight text-[var(--color-text-muted)]">
          {lane.branchRef}
        </div>
      </div>

      <div className="relative min-w-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          className="block"
          aria-label={`${lane.label} deploys`}
          shapeRendering="geometricPrecision"
        >
          {/* Lane base rule */}
          <line
            x1={padX}
            x2={W - padX}
            y1={yDot}
            y2={yDot}
            stroke="var(--color-border)"
            strokeWidth={0.6}
          />
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

          {/* Trails */}
          {lane.deploys.map((d, i) => {
            const cx = padX + d.t * innerW;
            const trailW = d.rollout * innerW;
            const x1 = Math.max(padX, cx - trailW);
            const isVisible = visible.has(d.status);
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
                style={{
                  opacity: isVisible
                    ? d.status === "rolled-back"
                      ? 0.5
                      : 0.7
                    : 0.1,
                  transition: "opacity 200ms ease-out",
                }}
              />
            );
          })}

          {/* Dots */}
          {lane.deploys.map((d, i) => {
            const cx = padX + d.t * innerW;
            const isVisible = visible.has(d.status);
            const dotOpacity = isVisible ? 1 : 0.15;
            const onEnter = () => setHovered({ deploy: d, lane });
            const onLeave = () => setHovered(null);
            const onClick = () => setSelected({ deploy: d, lane });
            const hit = (
              <circle
                cx={cx}
                cy={yDot}
                r={7}
                fill="transparent"
                pointerEvents="all"
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
                onClick={onClick}
                style={{ cursor: "pointer" }}
              />
            );
            if (d.status === "live") {
              return (
                <g
                  key={`dot-${i}`}
                  style={{
                    opacity: dotOpacity,
                    transition: "opacity 200ms ease-out",
                  }}
                >
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
                <g
                  key={`dot-${i}`}
                  style={{
                    opacity: dotOpacity,
                    transition: "opacity 200ms ease-out",
                  }}
                >
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
              <g
                key={`dot-${i}`}
                style={{
                  opacity: dotOpacity,
                  transition: "opacity 200ms ease-out",
                }}
              >
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

          <DeployTooltip
            visible={!!isLaneHover}
            deploy={tooltipDeploy}
            laneW={W}
            padX={padX}
            innerW={innerW}
            yDot={yDot}
          />
        </svg>

        {/* Promote ghost dot — DOM overlay so it can translate from
            the staging lane's vertical center DOWN to the production
            lane's. We render the ghost on the production row so it
            appears to land at the right destination. */}
        {promoteArc && <PromoteGhost x={(promoteArc.fromX / W) * 100} top={yDot} />}

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
            color:
              "color-mix(in oklch, var(--color-text-muted) 14%, transparent)",
          }}
          margin={1}
          className="block w-full"
          ariaLabel={`${lane.label} deploy frequency`}
        />
      </div>

      {/* Right gutter */}
      <div className="flex flex-col items-end leading-tight">
        <button
          type="button"
          aria-pressed={focused}
          onClick={onToggleFocus}
          className={
            "font-display text-[26px] leading-none italic tracking-[-0.02em] text-[var(--color-text)] hover:text-[var(--color-accent-2)] " +
            (focused ? "underline decoration-[var(--color-accent-2)] decoration-[1.5px] underline-offset-4" : "")
          }
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          {lane.deploys.length}
        </button>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          deploys · {focused ? "focused" : "click to focus"}
        </span>
        {lane.deploys.some((d) => d.status === "fail") && (
          <span
            className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-tight"
            style={{ color: "var(--color-accent)" }}
          >
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

function TimeAxis({ windowId }: { windowId: WindowId }) {
  const W = 720;
  const H = 12;
  const padX = 8;
  const innerW = W - padX * 2;
  const ticks: Record<WindowId, Array<{ t: number; label: string; anchor: "start" | "middle" | "end" }>> = {
    "24h": [
      { t: 0, label: "00", anchor: "start" },
      { t: 0.25, label: "06", anchor: "middle" },
      { t: 0.5, label: "12", anchor: "middle" },
      { t: 0.75, label: "18", anchor: "middle" },
      { t: 1, label: "now", anchor: "end" },
    ],
    "7d": [
      { t: 0, label: "−7d", anchor: "start" },
      { t: 0.5, label: "−3d", anchor: "middle" },
      { t: 1, label: "now", anchor: "end" },
    ],
    "30d": [
      { t: 0, label: "−30d", anchor: "start" },
      { t: 0.5, label: "−15d", anchor: "middle" },
      { t: 1, label: "now", anchor: "end" },
    ],
  };
  return (
    <div className="grid shrink-0 grid-cols-[132px_1fr_120px] items-center gap-4 border-t border-[var(--color-border)] px-6 py-1.5">
      <div aria-hidden />
      <div className="min-w-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          className="block"
          aria-label="Window axis"
          shapeRendering="geometricPrecision"
        >
          {ticks[windowId].map((tk) => (
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

function DeployDetailPanel({
  selected,
  onPromote,
  onRollback,
  onClose,
}: {
  selected: { deploy: Deploy; lane: Lane };
  onPromote: () => void;
  onRollback: () => void;
  onClose: () => void;
}) {
  const { deploy, lane } = selected;
  const author = authorFor(deploy);
  const totalMin = Math.round(deploy.t * 24 * 60);
  const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between border-b border-[var(--color-border)] px-5 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            {lane.label} · {STATUS_LABEL[deploy.status]}
          </div>
          <div
            className="mt-1 font-display text-[22px] italic leading-none text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            {deploy.sha}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          aria-label="Close detail"
        >
          esc
        </button>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-4 px-5 py-4 text-xs">
        <Field label="Branch">{deploy.branch}</Field>
        <Field label="Time">{hh}:{mm} UTC</Field>
        <Field label="Rollout">{formatRollout(deploy.rolloutSeconds)}</Field>
        <Field label="Status">{STATUS_LABEL[deploy.status]}</Field>
        <div className="col-span-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Commit
          </div>
          <p className="mt-1 text-[13px] text-[var(--color-text)]">
            {commitMessageFor(deploy)}
          </p>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <span
            title={author.name}
            className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]"
          >
            {author.initials}
          </span>
          <span className="text-[13px] text-[var(--color-text)]">{author.name}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-5 py-3">
        {lane.env === "staging" && deploy.status !== "live" && (
          <button
            type="button"
            onClick={onPromote}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent-2)_70%,#000_8%)] bg-[var(--color-accent-2)] px-3 text-xs text-[var(--color-accent-fg)]"
          >
            Promote → production
          </button>
        )}
        {lane.env === "production" && (
          <button
            type="button"
            onClick={onRollback}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-text)]"
          >
            Rollback
          </button>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {lane.label} · {deploy.branch}
        </span>
      </div>
    </div>
  );
}

function PromoteGhost({ x, top }: { x: number; top: number }) {
  // We use a transform-only animation via inline style + Web Animations API
  // would be ideal, but a CSS transition driven by a state flip is simpler
  // and works without keyframes. translateY goes from -72px → 0 over 320ms.
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: `${x}%`,
        top,
        width: 4,
        height: 4,
        marginLeft: -2,
        marginTop: -2,
        borderRadius: 999,
        background: "var(--color-accent-2)",
        transform: arrived ? "translateY(0)" : "translateY(-72px)",
        opacity: arrived ? 1 : 0.4,
        transition: `transform 320ms cubic-bezier(0.32, 0.72, 0, 1), opacity 320ms cubic-bezier(0.32, 0.72, 0, 1)`,
      }}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-[var(--color-text)]">{children}</div>
    </div>
  );
}
