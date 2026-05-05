"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry32 } from "@/components/_kit/dot-noise";
import { Trace, type TracePoint } from "@/components/_kit/trace";
import { Modal } from "@/components/_kit/modal";
import { useToast } from "@/components/_kit/toast";
import { Skeleton } from "@/components/_kit/skeleton";
import { EmptyState } from "@/components/_kit/empty-state";
import { ErrorState } from "@/components/_kit/error-state";
import { cn } from "@/lib/cn";

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

const PAPER_EASE_DEPLOY = "cubic-bezier(0.32, 0.72, 0, 1)";

type PromoteArc = {
  fromX: number;
  fromTop: number;
  toTop: number;
  sha: string;
  outcome: "ok" | "fail";
};

export default function DeployPipeline() {
  const [hovered, setHovered] = useState<{ deploy: Deploy; lane: Lane } | null>(null);
  const [selected, setSelected] = useState<{ deploy: Deploy; lane: Lane } | null>(null);
  const [visible, setVisible] = useState<Set<DeployStatus>>(new Set(ALL_STATUSES));
  const [windowId, setWindowId] = useState<WindowId>("24h");
  const [focusEnv, setFocusEnv] = useState<Lane["env"] | null>(null);
  const [swapping, setSwapping] = useState(false);

  // Loading / error / first-paint plumbing.
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [firstPaint, setFirstPaint] = useState(false);

  // Lane refs for computing promote-arc geometry from real layout.
  const laneRefs = useRef<Map<Lane["env"], HTMLLIElement | null>>(new Map());
  const setLaneRef = (env: Lane["env"]) => (node: HTMLLIElement | null) => {
    laneRefs.current.set(env, node);
  };

  // Live-region announce for keyboard/screen-reader focus on a deploy.
  const [announce, setAnnounce] = useState<string>("");

  // Inline two-step rollback confirm.
  const [rollbackConfirm, setRollbackConfirm] = useState(false);

  // Promote-arc ghost dot.
  const [promoteArc, setPromoteArc] = useState<PromoteArc | null>(null);

  // Boot: short skeleton, then reveal lanes with a sequential opacity fade-in.
  useEffect(() => {
    const t1 = window.setTimeout(() => setLoading(false), 320);
    const t2 = window.setTimeout(() => setFirstPaint(true), 320 + 30);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

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

  const { toast, update: updateToast } = useToast();

  const onPromote = (deploy: Deploy, lane: Lane) => {
    if (lane.env !== "staging") return;
    // Guard: an ongoing promote already owns the ghost arc.
    if (promoteArc !== null) return;
    // Compute geometry from real lane DOM rather than a magic 72px constant.
    const stagingNode = laneRefs.current.get("staging");
    const prodNode = laneRefs.current.get("production");
    let fromTop = 0;
    let toTop = 72;
    if (stagingNode && prodNode) {
      const sRect = stagingNode.getBoundingClientRect();
      const pRect = prodNode.getBoundingClientRect();
      // The ghost is rendered inside the production lane, so its y=0 origin is
      // pRect.top. fromTop is the staging center relative to that origin.
      fromTop = sRect.top + sRect.height / 2 - (pRect.top + pRect.height / 2);
      toTop = 0;
    }
    const W = 720;
    const padX = 8;
    const innerW = W - padX * 2;
    const cx = padX + deploy.t * innerW;
    // 10% simulated failure for promote.
    const willFail = Math.random() < 0.1;
    setPromoteArc({ fromX: cx, fromTop, toTop, sha: deploy.sha, outcome: willFail ? "fail" : "ok" });
    const id = toast({ title: `Promoting ${deploy.sha} → production…`, status: "loading" });
    window.setTimeout(() => {
      setPromoteArc(null);
      if (willFail) {
        updateToast(id, { title: "Promotion failed.", status: "error" });
        return;
      }
      const newLive: Deploy = {
        t: 0.95,
        status: "live",
        rollout: 0.06,
        rolloutSeconds: 360,
        sha: deploy.sha,
        branch: "main",
      };
      setExtraProdDeploys((prev) => [...prev, newLive]);
      updateToast(id, { title: `Promoted ${deploy.sha} → production`, status: "success" });
    }, 320);
    setSelected(null);
  };

  const onRollback = (deploy: Deploy) => {
    if (deploy.status === "rolled-back") return;
    if (!rollbackConfirm) {
      setRollbackConfirm(true);
      window.setTimeout(() => setRollbackConfirm(false), 4000);
      return;
    }
    setRollbackConfirm(false);
    toast({ title: `Rolled back ${deploy.sha}`, status: "info" });
    setSelected(null);
  };

  // Modal placement: bottom-sheet at narrow widths, right-side panel otherwise.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(max-width: 640px)");
    const apply = () => setNarrow(m.matches);
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, []);

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

        {/* Fetch error banner — sits above lanes when present. */}
        {fetchError && (
          <ErrorState
            variant="banner"
            title="Couldn't load deploys."
            onRetry={() => setFetchError(false)}
          />
        )}

        {/* SR-only live region for keyboard focus on a deploy dot. */}
        <span aria-live="polite" className="sr-only">
          {announce}
        </span>

        {/* Loading state — three lane skeletons. */}
        {loading && !fetchError && <DeployPipelineSkeleton />}

        {/* Whole-pipeline empty (zero deploys across every lane). */}
        {!loading && !fetchError && lanes.every((l) => l.deploys.length === 0) && (
          <div className="grid min-h-0 flex-1 place-items-center">
            <EmptyState
              title="No deploys yet."
              body="Push to a branch to start."
              action={{
                label: "View integrations",
                onClick: () => toast({ title: "Integrations panel", status: "info" }),
              }}
            />
          </div>
        )}

        {/* Three env lanes. */}
        {!loading && !fetchError && lanes.some((l) => l.deploys.length > 0) && (
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
                firstPaint={firstPaint}
                onAnnounce={setAnnounce}
                laneRef={setLaneRef(lane.env)}
              />
            ))}
          </ul>
        )}

        {!loading && !fetchError && <TimeAxis windowId={windowId} />}

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

      {/* Side detail Modal — bottom sheet on narrow viewports. */}
      <Modal
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) {
            setSelected(null);
            setRollbackConfirm(false);
          }
        }}
        placement={narrow ? "bottom" : "right"}
        size="md"
        ariaLabel={selected ? `Deploy ${selected.deploy.sha}` : "Deploy detail"}
      >
        {selected && (
          <DeployDetailPanel
            selected={selected}
            onPromote={() => onPromote(selected.deploy, selected.lane)}
            onRollback={() => onRollback(selected.deploy)}
            onClose={() => {
              setSelected(null);
              setRollbackConfirm(false);
            }}
            rollbackConfirm={rollbackConfirm}
            promoteFailed={promoteArc?.outcome === "fail"}
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
  firstPaint,
  onAnnounce,
  laneRef,
}: {
  lane: Lane;
  hovered: { deploy: Deploy; lane: Lane } | null;
  setHovered: (h: { deploy: Deploy; lane: Lane } | null) => void;
  setSelected: (s: { deploy: Deploy; lane: Lane } | null) => void;
  visible: Set<DeployStatus>;
  focused: boolean;
  dimmed: boolean;
  onToggleFocus: () => void;
  promoteArc: PromoteArc | null;
  firstPaint: boolean;
  onAnnounce: (s: string) => void;
  laneRef: (node: HTMLLIElement | null) => void;
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

  // Per-lane empty (e.g. preview has 0 deploys but staging is populated).
  const laneEmpty = lane.deploys.length === 0;

  return (
    <li
      ref={laneRef}
      className={cn(
        "px-6 py-3 transition-[opacity] duration-[200ms]",
        // Stacked at <640, 3-col grid otherwise; right gutter shrinks at the
        // 768 breakpoint via lg width.
        "flex flex-col gap-2 sm:grid sm:grid-cols-[132px_1fr_100px] sm:items-center sm:gap-4 lg:grid-cols-[132px_1fr_120px]",
      )}
      style={{
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      <div className="flex items-baseline gap-2 leading-tight sm:block">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text)]">
          {lane.label}
        </div>
        <div className="truncate font-mono text-[10px] tracking-tight text-[var(--color-text-muted)] sm:mt-1">
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

          {/* Per-lane empty: dashed rule + caption inside the lane area. */}
          {laneEmpty && (
            <>
              <line
                x1={padX}
                x2={W - padX}
                y1={yDot}
                y2={yDot}
                stroke="var(--color-text-muted)"
                strokeWidth={0.8}
                strokeDasharray="3 4"
                opacity={0.5}
              />
              <text
                x={W / 2}
                y={yDot - 6}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fill: "var(--color-text-muted)",
                }}
              >
                no {lane.env} deploys
              </text>
            </>
          )}

          {/* Trails */}
          {!laneEmpty && lane.deploys.map((d, i) => {
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

          {/* Dots — sequential opacity fade-in over 200ms after first paint. */}
          {!laneEmpty && lane.deploys.map((d, i) => {
            const cx = padX + d.t * innerW;
            const isVisible = visible.has(d.status);
            // First-paint reveal: 0 → 1 over the lane (200ms total). Each dot
            // fades opacity-only (never r/cx/cy) with a stagger by index.
            const stagger = lane.deploys.length > 1 ? i / (lane.deploys.length - 1) : 0;
            const enterOpacity = firstPaint ? (isVisible ? 1 : 0.15) : 0;
            const dotOpacity = enterOpacity;
            const enterDelay = `${Math.round(stagger * 200)}ms`;
            const onEnter = () => setHovered({ deploy: d, lane });
            const onLeave = () => setHovered(null);
            const onClick = () => setSelected({ deploy: d, lane });
            const onFocus = () => {
              setHovered({ deploy: d, lane });
              const totalMin = Math.round(d.t * 24 * 60);
              const hh = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
              const mm = String(totalMin % 60).padStart(2, "0");
              onAnnounce(
                `${lane.label} deploy ${d.sha}, ${STATUS_LABEL[d.status]}, at ${hh}:${mm}.`,
              );
            };
            const onKey = (e: React.KeyboardEvent<SVGCircleElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            };
            const hit = (
              <circle
                cx={cx}
                cy={yDot}
                r={7}
                fill="transparent"
                pointerEvents="all"
                tabIndex={0}
                role="button"
                aria-label={`${lane.label} deploy ${d.sha}, ${STATUS_LABEL[d.status]}`}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
                onFocus={onFocus}
                onBlur={onLeave}
                onClick={onClick}
                onKeyDown={onKey}
                style={{ cursor: "pointer", outline: "none" }}
              />
            );
            if (d.status === "live") {
              return (
                <g
                  key={`dot-${i}`}
                  style={{
                    opacity: dotOpacity,
                    transition: `opacity 200ms ease-out ${enterDelay}`,
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
                    transition: `opacity 200ms ease-out ${enterDelay}`,
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

        {/* Promote ghost dot — DOM overlay rendered inside the production
            lane. fromTop/toTop are computed from real DOM rects so the arc
            lands precisely on the production lane's center regardless of
            layout / responsive stacking. */}
        {promoteArc && (
          <PromoteGhost
            x={(promoteArc.fromX / W) * 100}
            yDot={yDot}
            fromTop={promoteArc.fromTop}
            toTop={promoteArc.toTop}
            outcome={promoteArc.outcome}
          />
        )}

        {!laneEmpty && (
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
        )}
      </div>

      {/* Right gutter — column on >=sm, footer row on stacked. */}
      <div className="flex items-baseline justify-between gap-3 leading-tight sm:flex-col sm:items-end sm:justify-start">
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
  rollbackConfirm,
  promoteFailed,
}: {
  selected: { deploy: Deploy; lane: Lane };
  onPromote: () => void;
  onRollback: () => void;
  onClose: () => void;
  rollbackConfirm: boolean;
  promoteFailed: boolean;
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
      {promoteFailed && (
        <ErrorState
          variant="inline"
          title="Promotion failed."
          body="We rolled the deploy back automatically. No production traffic served."
        />
      )}
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
            disabled={selected.deploy.status === "rolled-back"}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 text-xs transition-[border-color,color,background-color] duration-[120ms] ease-out",
              rollbackConfirm
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)]",
              selected.deploy.status === "rolled-back" && "cursor-not-allowed opacity-50",
            )}
          >
            {rollbackConfirm ? "Click again to confirm" : "Rollback"}
          </button>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {lane.label} · {deploy.branch}
        </span>
      </div>
    </div>
  );
}

function PromoteGhost({
  x,
  yDot,
  fromTop,
  toTop,
  outcome,
}: {
  x: number;
  yDot: number;
  fromTop: number;
  toTop: number;
  outcome: "ok" | "fail";
}) {
  // Transform-only motion. translateY animates from `fromTop` (staging
  // center, expressed relative to the production lane origin) to `toTop`
  // (production center). On failure, the ghost lands and morphs into a
  // persimmon X via opacity-only crossfade. We never animate r/cx/cy/d.
  const [arrived, setArrived] = useState(false);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setArrived(true));
    const t = window.setTimeout(() => setLanded(true), 340);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(t);
    };
  }, []);
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: `${x}%`,
        top: yDot,
        width: 6,
        height: 6,
        marginLeft: -3,
        marginTop: -3,
        transform: arrived ? `translateY(${toTop}px)` : `translateY(${fromTop}px)`,
        opacity: arrived ? 1 : 0.4,
        transition: `transform 320ms ${PAPER_EASE_DEPLOY}, opacity 320ms ${PAPER_EASE_DEPLOY}`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            outcome === "fail" ? "var(--color-accent)" : "var(--color-accent-2)",
          opacity: outcome === "fail" && landed ? 0 : 1,
          transition: `opacity 200ms ease-out`,
        }}
      />
      {outcome === "fail" && (
        <svg
          aria-hidden
          viewBox="0 0 6 6"
          className="absolute inset-0"
          style={{
            opacity: landed ? 1 : 0,
            transition: `opacity 200ms ease-out`,
          }}
        >
          <line x1={1} y1={1} x2={5} y2={5} stroke="var(--color-accent)" strokeWidth={1} />
          <line x1={5} y1={1} x2={1} y2={5} stroke="var(--color-accent)" strokeWidth={1} />
        </svg>
      )}
    </span>
  );
}

function DeployPipelineSkeleton() {
  // 3 lanes — label block + lane stipple + right-gutter block. The stipple
  // sits at 5% density (no dots-as-data) and matches the lane SVG width.
  return (
    <ul className="grid min-h-0 flex-1 divide-y divide-[var(--color-border)]">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex flex-col gap-2 px-6 py-3 sm:grid sm:grid-cols-[132px_1fr_100px] sm:items-center sm:gap-4 lg:grid-cols-[132px_1fr_120px]"
        >
          <Skeleton width={132} height={28} density={0.05} seed={11 + i} className="h-7" />
          <Skeleton width={720} height={36} density={0.05} seed={31 + i} className="h-9 w-full" />
          <Skeleton width={120} height={28} density={0.05} seed={51 + i} className="h-7" />
        </li>
      ))}
    </ul>
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
