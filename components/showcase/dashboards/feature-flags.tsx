"use client";

/**
 * Registry entry (proposed — orchestrator will lift this):
 *
 *   {
 *     domain: "saas",
 *     category: "dashboards",
 *     slug: "feature-flags",
 *     title: "Feature flags",
 *     filename: "feature-flags.tsx",
 *     description: "Two-pane master-detail console: flag list left, focused-flag detail right with env matrix, rollout slider, evaluation-volume Trace, and audit log.",
 *     layout: "specimen",
 *     aspectRatio: "16 / 9",
 *     maxWidth: 880,
 *     firstImpression: "2026-05-05",
 *     load: () => import("@/components/showcase/dashboards/feature-flags"),
 *   }
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Trace, type TracePoint } from "@/components/_kit/trace";
import { mulberry32 } from "@/components/_kit/dot-noise";
import { useToast } from "@/components/_kit/toast";
import { Skeleton } from "@/components/_kit/skeleton";
import { EmptyState } from "@/components/_kit/empty-state";
import { ErrorState } from "@/components/_kit/error-state";
import { cn } from "@/lib/cn";

type EnvKey = "dev" | "staging" | "prod";
type EnvState = "off" | "partial" | "on";

type AuditEntry = {
  id: string;
  ts: string;
  author: string;
  change: string;
};

type Flag = {
  key: string;
  title: string;
  description: string;
  rolloutPct: number;
  envState: Record<EnvKey, EnvState>;
  evals24h: number;
  killed: boolean;
  audit: AuditEntry[];
  evalSeed: number;
};

const ENVS: { key: EnvKey; label: string }[] = [
  { key: "dev", label: "dev" },
  { key: "staging", label: "staging" },
  { key: "prod", label: "prod" },
];

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const INITIAL_FLAGS: Flag[] = [
  {
    key: "checkout_v2",
    title: "Checkout v2",
    description:
      "Reworked Stripe checkout with split address fields and saved payment methods.",
    rolloutPct: 35,
    envState: { dev: "on", staging: "on", prod: "partial" },
    evals24h: 184_220,
    killed: false,
    evalSeed: 41,
    audit: [
      { id: "a1", ts: "10:42", author: "mara@", change: "rollout 25 → 35%" },
      { id: "a2", ts: "09:18", author: "mara@", change: "staging off → on" },
      { id: "a3", ts: "yest", author: "rao@", change: "created flag" },
    ],
  },
  {
    key: "search_rerank",
    title: "Search rerank",
    description:
      "Lexical-then-semantic rerank for the global search box; +12% NDCG in offline eval.",
    rolloutPct: 100,
    envState: { dev: "on", staging: "on", prod: "on" },
    evals24h: 942_115,
    killed: false,
    evalSeed: 17,
    audit: [
      { id: "b1", ts: "08:01", author: "rao@", change: "rollout 80 → 100%" },
      { id: "b2", ts: "yest", author: "rao@", change: "rollout 50 → 80%" },
      { id: "b3", ts: "Mon", author: "ji@", change: "prod partial → on" },
    ],
  },
  {
    key: "billing_proration",
    title: "Billing proration",
    description: "Mid-cycle plan changes prorate by minute instead of by day.",
    rolloutPct: 12,
    envState: { dev: "on", staging: "partial", prod: "off" },
    evals24h: 8_402,
    killed: false,
    evalSeed: 92,
    audit: [
      { id: "c1", ts: "11:30", author: "ji@", change: "rollout 5 → 12%" },
      { id: "c2", ts: "Mon", author: "ji@", change: "staging off → partial" },
    ],
  },
  {
    key: "team_invites_bulk",
    title: "Team invites · bulk",
    description: "Paste a CSV of emails on the Members page; magic-link send in one batch.",
    rolloutPct: 50,
    envState: { dev: "on", staging: "on", prod: "partial" },
    evals24h: 21_488,
    killed: false,
    evalSeed: 5,
    audit: [
      { id: "d1", ts: "07:15", author: "noor@", change: "rollout 30 → 50%" },
      { id: "d2", ts: "yest", author: "noor@", change: "prod off → partial" },
    ],
  },
  {
    key: "audit_log_export",
    title: "Audit log export",
    description: "CSV export of the workspace audit log for SOC 2 customers.",
    rolloutPct: 100,
    envState: { dev: "on", staging: "on", prod: "on" },
    evals24h: 612,
    killed: false,
    evalSeed: 88,
    audit: [
      { id: "e1", ts: "Apr 30", author: "mara@", change: "GA · 100%" },
      { id: "e2", ts: "Apr 28", author: "mara@", change: "rollout 60 → 100%" },
    ],
  },
  {
    key: "onboarding_video",
    title: "Onboarding · welcome video",
    description: "60-second embedded loom on the empty workspace dashboard.",
    rolloutPct: 0,
    envState: { dev: "partial", staging: "off", prod: "off" },
    evals24h: 0,
    killed: true,
    evalSeed: 33,
    audit: [
      { id: "f1", ts: "yest", author: "noor@", change: "killed · low engagement" },
      { id: "f2", ts: "Apr 20", author: "noor@", change: "rollout 5 → 10%" },
    ],
  },
  {
    key: "ai_drafts",
    title: "AI · email drafts",
    description: "Generate first-pass replies in the inbox using internal LLM.",
    rolloutPct: 8,
    envState: { dev: "on", staging: "partial", prod: "partial" },
    evals24h: 4_220,
    killed: false,
    evalSeed: 64,
    audit: [
      { id: "g1", ts: "12:08", author: "rao@", change: "rollout 5 → 8%" },
      { id: "g2", ts: "Mon", author: "rao@", change: "prod off → partial" },
    ],
  },
  {
    key: "ratelimit_burst",
    title: "Rate-limit · burst window",
    description: "Allow 2× quota for 10s before throttling kicks in.",
    rolloutPct: 75,
    envState: { dev: "on", staging: "on", prod: "on" },
    evals24h: 1_204_888,
    killed: false,
    evalSeed: 21,
    audit: [
      { id: "h1", ts: "06:50", author: "ji@", change: "rollout 60 → 75%" },
      { id: "h2", ts: "yest", author: "ji@", change: "prod partial → on" },
    ],
  },
];

function makeEvalTrace(seed: number, killed: boolean): TracePoint[] {
  const rng = mulberry32(seed);
  const pts: TracePoint[] = [];
  let baseline = 60 + rng() * 40;
  for (let i = 0; i < 14; i++) {
    if (killed && i >= 11) {
      pts.push({ x: i, y: 0 });
      continue;
    }
    const weekend = i % 7 === 5 || i % 7 === 6;
    const noise = (rng() - 0.5) * 30;
    const y = Math.max(0, baseline + (weekend ? -22 : 0) + noise);
    pts.push({ x: i, y });
    baseline = baseline * 0.92 + y * 0.08;
  }
  return pts;
}

function compactNum(n: number): string {
  if (n === 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const STATE_GLYPH: Record<EnvState, string> = {
  off: "○",
  partial: "◐",
  on: "●",
};

const STATE_NEXT: Record<EnvState, EnvState> = {
  off: "partial",
  partial: "on",
  on: "off",
};

export default function FeatureFlags() {
  const [flags, setFlags] = useState<Flag[]>(INITIAL_FLAGS);
  const [selectedKey, setSelectedKey] = useState<string>(INITIAL_FLAGS[0].key);
  const { toast } = useToast();

  // Loading + error scaffold. The plate is purely client-side, so we mock a
  // boot fetch to give the skeleton + retry surfaces something to attach to.
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [auditAnnounce, setAuditAnnounce] = useState("");

  // 2-step kill confirm — first click arms, second click commits. Auto-revert
  // after 4s if the user steps away.
  const [killArmed, setKillArmed] = useState(false);
  const killTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 320);
    return () => window.clearTimeout(t);
  }, []);

  const selected = flags.find((f) => f.key === selectedKey) ?? flags[0];

  const evalTrace = useMemo(
    () => makeEvalTrace(selected.evalSeed, selected.killed),
    [selected.evalSeed, selected.killed],
  );

  // Track which audit entries are "fresh" (just appended) so we can fade-in.
  // The Set is mutated only inside an effect keyed on the latest entry id, so
  // we don't write to the ref during render (which would surface as a React
  // strict-mode warning and leak across plate-detail navigations).
  const freshIdsRef = useRef<Set<string>>(new Set());
  const lastFreshIdRef = useRef<string | null>(null);

  useEffect(() => {
    const id = lastFreshIdRef.current;
    if (id) freshIdsRef.current.add(id);
  }, [flags]);

  function logAudit(flagKey: string, change: string) {
    const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    lastFreshIdRef.current = id;
    setFlags((prev) =>
      prev.map((f) =>
        f.key === flagKey
          ? {
              ...f,
              audit: [
                { id, ts: "now", author: "you@", change },
                ...f.audit,
              ].slice(0, 6),
            }
          : f,
      ),
    );
  }

  function setRollout(pct: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
    if (clamped === selected.rolloutPct) return;
    const prev = selected.rolloutPct;
    // 8% simulated failure — revert local change.
    if (Math.random() < 0.08) {
      setSaveError(true);
      toast({ title: "Couldn't save flag", status: "error" });
      return;
    }
    setSaveError(false);
    setFlags((all) =>
      all.map((f) =>
        f.key === selected.key ? { ...f, rolloutPct: clamped } : f,
      ),
    );
    const change = `rollout ${prev} → ${clamped}%`;
    logAudit(selected.key, change);
    setAuditAnnounce(`Audit: ${change}.`);
    toast({ title: "Flag updated", status: "success" });
  }

  function cycleCell(env: EnvKey) {
    if (selected.killed) return;
    const cur = selected.envState[env];
    const next = STATE_NEXT[cur];
    if (Math.random() < 0.08) {
      setSaveError(true);
      toast({ title: "Couldn't save flag", status: "error" });
      return;
    }
    setSaveError(false);
    setFlags((all) =>
      all.map((f) =>
        f.key === selected.key
          ? { ...f, envState: { ...f.envState, [env]: next } }
          : f,
      ),
    );
    const change = `${env} ${cur} → ${next}`;
    logAudit(selected.key, change);
    setAuditAnnounce(`Audit: ${change}.`);
    toast({ title: "Flag updated", status: "success" });
  }

  function clearKillTimer() {
    if (killTimerRef.current) {
      clearTimeout(killTimerRef.current);
      killTimerRef.current = null;
    }
  }

  function armOrCommitKill() {
    if (selected.killed) {
      // Reviving doesn't need a confirm step.
      doKillToggle();
      return;
    }
    if (!killArmed) {
      setKillArmed(true);
      clearKillTimer();
      killTimerRef.current = setTimeout(() => setKillArmed(false), 4000);
      return;
    }
    clearKillTimer();
    setKillArmed(false);
    doKillToggle();
  }

  function doKillToggle() {
    const willKill = !selected.killed;
    setFlags((all) =>
      all.map((f) =>
        f.key === selected.key ? { ...f, killed: willKill } : f,
      ),
    );
    const change = willKill ? "killed" : "revived";
    logAudit(selected.key, change);
    setAuditAnnounce(`Audit: ${change}.`);
    toast({ title: "Flag updated", status: "success" });
  }

  // Whole-workspace empty path — no flags at all.
  const noFlags = flags.length === 0;

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Plate hero. */}
      <div className="shrink-0 border-b border-[var(--color-border)] px-6 pb-3 pt-4">
        <h1
          className="font-display text-[28px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
        >
          Feature flags.
        </h1>
      </div>

      {/* SR-only live region for audit announcements. */}
      <span aria-live="polite" className="sr-only">
        {auditAnnounce}
      </span>

      {/* Boot loading state. */}
      {loading && <FeatureFlagsSkeleton />}

      {!loading && fetchError && (
        <ErrorState
          variant="banner"
          title="Flags couldn't load."
          onRetry={() => setFetchError(false)}
        />
      )}

      {!loading && !fetchError && noFlags && (
        <div className="grid min-h-0 flex-1 place-items-center">
          <EmptyState
            title="No feature flags yet."
            body="Define a flag in code, deploy, and it'll appear here."
            action={{
              label: "Read the SDK guide",
              onClick: () => toast({ title: "SDK guide", status: "info" }),
            }}
          />
        </div>
      )}

      {!loading && !fetchError && !noFlags && (
        <>
          {saveError && (
            <ErrorState
              variant="banner"
              title="Save failed."
              onRetry={() => setSaveError(false)}
              onDismiss={() => setSaveError(false)}
            />
          )}
          {/* >=md: 2-pane; <md: stacked, list as horizontal pill scroller. */}
          <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <FlagList
              flags={flags}
              selectedKey={selectedKey}
              onSelect={(k) => {
                setSelectedKey(k);
                clearKillTimer();
                setKillArmed(false);
              }}
            />
            <FlagDetail
              flag={selected}
              evalTrace={evalTrace}
              freshIds={freshIdsRef.current}
              onSetRollout={setRollout}
              onCycleCell={cycleCell}
              onToggleKill={armOrCommitKill}
              killArmed={killArmed}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------- LEFT PANE -------------------- */

function FlagList({
  flags,
  selectedKey,
  onSelect,
}: {
  flags: Flag[];
  selectedKey: string;
  onSelect: (k: string) => void;
}) {
  return (
    <>
      {/* Mobile: horizontal pill scroller across the top. */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 md:hidden">
        {flags.map((f) => {
          const active = f.key === selectedKey;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onSelect(f.key)}
              aria-pressed={active}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-xs)] border px-2 py-1 transition-[border-color,background-color] duration-[120ms] ease-out",
                active
                  ? "border-[var(--color-accent-2)] bg-[color-mix(in_oklch,var(--color-accent-2)_8%,transparent)]"
                  : "border-[var(--color-border)] bg-transparent",
              )}
            >
              <span
                className={cn(
                  "max-w-[140px] truncate font-mono text-[11px]",
                  f.killed ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text)]",
                )}
              >
                {f.key}
              </span>
              <RolloutPill pct={f.rolloutPct} killed={f.killed} />
            </button>
          );
        })}
      </div>

      {/* >=md: vertical list pane. */}
      <div className="hidden h-full min-h-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex">
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Flags · {flags.length}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            live
          </span>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {flags.map((f) => (
            <FlagListItem
              key={f.key}
              flag={f}
              selected={f.key === selectedKey}
              onSelect={() => onSelect(f.key)}
            />
          ))}
        </ul>
        <FlagListLegend />
      </div>
    </>
  );
}

function FlagListItem({
  flag,
  selected,
  onSelect,
}: {
  flag: Flag;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="relative">
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 w-[2px] rounded-[var(--radius-xs)] bg-[var(--color-accent-2)]"
        style={{
          opacity: selected ? 1 : 0,
          transform: selected ? "scaleY(1)" : "scaleY(0.6)",
          transition: `opacity 120ms ease-out, transform 120ms ease-out`,
        }}
      />
      <button
        type="button"
        onClick={onSelect}
        data-focus-ring="off"
        className={cn(
          "block w-full px-4 py-2 text-left",
          "transition-[background-color] duration-[120ms] ease-out",
        )}
        style={{
          backgroundColor: selected
            ? "color-mix(in oklch, var(--color-accent-2) 6%, transparent)"
            : "transparent",
        }}
      >
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-mono text-[12px]",
              flag.killed ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]",
            )}
            style={
              flag.killed
                ? { textDecoration: "line-through", textDecorationColor: "var(--color-text-muted)" }
                : undefined
            }
          >
            {flag.key}
          </span>
          <RolloutPill pct={flag.rolloutPct} killed={flag.killed} />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <EnvGlyphRow envState={flag.envState} killed={flag.killed} />
          <span className="font-mono text-[10px] tabular-nums text-[var(--color-text-muted)]">
            {compactNum(flag.evals24h)}
          </span>
        </div>
      </button>
    </li>
  );
}

function EnvGlyphRow({
  envState,
  killed,
}: {
  envState: Record<EnvKey, EnvState>;
  killed: boolean;
}) {
  // Encoding choice: glyph + colour. Opacity is no longer modulating "off"
  // (was triple-encoded — glyph + colour + opacity). The glyph alone (open
  // ring) carries "off"; colour is reserved for the live "partial" state and
  // muted for off + killed.
  return (
    <span className="flex items-center gap-1.5 font-mono text-[12px] leading-none">
      {ENVS.map((e, i) => {
        const s = envState[e.key];
        const color = killed
          ? "var(--color-text-muted)"
          : s === "on"
            ? "var(--color-text)"
            : s === "partial"
              ? "var(--color-accent-2)"
              : "var(--color-text-muted)";
        return (
          <span key={e.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-[var(--color-border-strong)]">
                ·
              </span>
            )}
            <span
              aria-label={`${e.label} ${s}`}
              style={{ color }}
            >
              {STATE_GLYPH[s]}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function RolloutPill({ pct, killed }: { pct: number; killed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded-[var(--radius-xs)] border px-1.5 font-mono text-[10px] tabular-nums",
        killed
          ? "border-[var(--color-border)] text-[var(--color-text-muted)]"
          : pct === 100
            ? "border-[var(--color-border-strong)] text-[var(--color-text)]"
            : "border-[var(--color-border)] text-[var(--color-text)]",
      )}
    >
      {pct}%
    </span>
  );
}

function FlagListLegend() {
  return (
    <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        Env state
      </div>
      <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px] leading-none">
        <span className="inline-flex items-center gap-1.5">
          <span style={{ color: "var(--color-text)" }}>{STATE_GLYPH.on}</span>
          <span className="text-[var(--color-text-muted)]">on</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span style={{ color: "var(--color-accent-2)" }}>{STATE_GLYPH.partial}</span>
          <span className="text-[var(--color-text-muted)]">partial</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span style={{ color: "var(--color-text-muted)" }}>{STATE_GLYPH.off}</span>
          <span className="text-[var(--color-text-muted)]">off</span>
        </span>
      </div>
    </div>
  );
}

/* -------------------- RIGHT PANE -------------------- */

function FlagDetail({
  flag,
  evalTrace,
  freshIds,
  onSetRollout,
  onCycleCell,
  onToggleKill,
  killArmed,
}: {
  flag: Flag;
  evalTrace: TracePoint[];
  freshIds: Set<string>;
  onSetRollout: (pct: number) => void;
  onCycleCell: (env: EnvKey) => void;
  onToggleKill: () => void;
  killArmed: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Running head */}
      <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          Flags · /{flag.key}
        </span>
        <button
          type="button"
          onClick={onToggleKill}
          aria-pressed={killArmed}
          className={cn(
            "inline-flex h-6 items-center rounded-[var(--radius-xs)] border px-2 font-mono text-[10px] uppercase tracking-[0.18em]",
            "transition-[border-color,color,background-color] duration-[200ms] ease-out",
            flag.killed
              ? "border-[var(--color-border-strong)] text-[var(--color-text)]"
              : killArmed
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                : "border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[color-mix(in_oklch,var(--color-accent)_6%,transparent)]",
          )}
        >
          {flag.killed
            ? "killed · revive"
            : killArmed
              ? "kill — sure?"
              : "kill switch"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-3 pt-4">
        <h2 className="text-[18px] font-medium leading-tight tracking-[-0.01em] text-[var(--color-text)]">
          {flag.title}
        </h2>
        <p className="mt-1.5 max-w-[52ch] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
          {flag.description}
        </p>

        {/* Env matrix + rollout — stacked at <lg, two-col at lg+ (matrix +
            slider only fit side-by-side in the wider breakpoint). */}
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          <EnvMatrix
            envState={flag.envState}
            killed={flag.killed}
            onCycle={onCycleCell}
          />
          <RolloutSlider
            pct={flag.rolloutPct}
            killed={flag.killed}
            onChange={onSetRollout}
          />
        </div>

        {/* Evaluation Trace */}
        <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Evaluations · 14d
            </span>
            <span className="font-mono text-[10px] tabular-nums text-[var(--color-text)]">
              {compactNum(flag.evals24h)}
              <span className="ml-1.5 text-[var(--color-text-muted)]">/ 24h</span>
            </span>
          </div>
          <div className="mt-1.5">
            <EvalTrace data={evalTrace} killed={flag.killed} />
          </div>
        </div>

        {/* Audit log */}
        <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Recent changes
          </div>
          {flag.audit.length === 0 ? (
            <EmptyState density="inline" title="No changes recorded." />
          ) : (
            <ul className="mt-2">
              {flag.audit.map((a) => (
                <AuditRow key={a.id} entry={a} fresh={freshIds.has(a.id)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EnvMatrix({
  envState,
  killed,
  onCycle,
}: {
  envState: Record<EnvKey, EnvState>;
  killed: boolean;
  onCycle: (e: EnvKey) => void;
}) {
  const states: EnvState[] = ["off", "partial", "on"];
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
        Environments
      </div>
      <div className="mt-2 grid grid-cols-[64px_1fr_1fr_1fr] gap-1">
        <span />
        {ENVS.map((e) => (
          <span
            key={e.key}
            className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
          >
            {e.label}
          </span>
        ))}
        {states.map((s) => (
          <RowOfMatrix
            key={s}
            label={s}
            states={states}
            envState={envState}
            killed={killed}
            onCycle={onCycle}
          />
        ))}
      </div>
    </div>
  );
}

function RowOfMatrix({
  label,
  envState,
  killed,
  onCycle,
}: {
  label: EnvState;
  states: EnvState[];
  envState: Record<EnvKey, EnvState>;
  killed: boolean;
  onCycle: (e: EnvKey) => void;
}) {
  return (
    <>
      <span className="flex h-8 items-center font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {label}
      </span>
      {ENVS.map((e) => {
        const active = envState[e.key] === label;
        return (
          <button
            key={e.key}
            type="button"
            onClick={() => onCycle(e.key)}
            disabled={killed}
            aria-pressed={active}
            className={cn(
              "grid h-8 place-items-center rounded-[var(--radius-xs)] border",
              active
                ? "border-[var(--color-border-strong)] bg-[var(--color-surface)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]",
              killed && "cursor-not-allowed opacity-50",
            )}
            style={{
              transition: `border-color 120ms ease-out, opacity 120ms ease-out`,
            }}
            aria-label={`${e.label} ${label}`}
          >
            {/* Inactive cells previously had `box-shadow: inset 0 0 0 1px` AND
                the outer border — two perimeters. Outer border alone now. */}
            <span
              aria-hidden
              className="block h-1.5 w-1.5 rounded-full"
              style={{
                background: active
                  ? killed
                    ? "var(--color-text-muted)"
                    : "var(--color-accent-2)"
                  : "transparent",
                transition: `opacity 120ms ease-out`,
              }}
            />
          </button>
        );
      })}
    </>
  );
}

function RolloutSlider({
  pct,
  killed,
  onChange,
}: {
  pct: number;
  killed: boolean;
  onChange: (p: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);

  function clientToPct(clientX: number): number {
    const node = wrapRef.current;
    if (!node) return pct;
    const rect = node.getBoundingClientRect();
    const t = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(100, t * 100));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (killed) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    onChange(clientToPct(e.clientX));
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (killed) return;
    if (e.buttons !== 1) return;
    onChange(clientToPct(e.clientX));
  }

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (killed) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(pct + 5);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(pct - 5);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(100);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          Rollout
        </span>
        <span className="font-mono text-[12px] tabular-nums text-[var(--color-text)]">
          {pct}
          <span className="ml-0.5 text-[var(--color-text-muted)]">%</span>
        </span>
      </div>
      <div
        ref={wrapRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Rollout percent"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        data-focus-ring="off"
        className={cn(
          "relative mt-2 h-8 cursor-pointer select-none",
          killed && "cursor-not-allowed opacity-50",
        )}
        style={{ touchAction: "none" }}
      >
        {/* Track */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)]"
        />
        {/* Fill */}
        <div
          aria-hidden
          className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-[var(--radius-xs)]"
          style={{
            width: `${pct}%`,
            background: killed
              ? "var(--color-text-muted)"
              : "var(--color-accent-2)",
            transition: `width 200ms ${PAPER_EASE}`,
          }}
        />
        {/* Tick marks at 0/50/100 — match the visible labels below. */}
        {[0, 50, 100].map((t) => (
          <span
            key={t}
            aria-hidden
            className="absolute top-1/2 h-2 w-px -translate-y-1/2"
            style={{
              left: `calc(${t}% - 0.5px)`,
              background: "var(--color-border-strong)",
              opacity: t === 50 ? 0.4 : 0.6,
            }}
          />
        ))}
        {/* Handle */}
        <span
          aria-hidden
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border bg-[var(--color-bg)]"
          style={{
            left: `${pct}%`,
            borderColor: focused
              ? "var(--color-accent-2)"
              : "var(--color-border-strong)",
            boxShadow: focused
              ? "0 0 0 2px color-mix(in oklch, var(--color-accent-2) 24%, transparent)"
              : undefined,
            transition: `left 200ms ${PAPER_EASE}, border-color 120ms ease-out, box-shadow 120ms ease-out`,
          }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-[var(--color-text-muted)]">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}

function EvalTrace({ data, killed }: { data: TracePoint[]; killed: boolean }) {
  const [pulseTick, setPulseTick] = useState(0);

  // Pulse the terminal dot once on mount, then on a 2000ms cadence.
  useEffect(() => {
    const id = window.setInterval(() => setPulseTick((t) => t + 1), 2000);
    return () => window.clearInterval(id);
  }, []);

  // No synthetic floor — a killed flag at zero should land on the baseline,
  // not get crushed against a 10-unit reservation. 1.1 headroom keeps the
  // trace from running flat against the SVG top edge for live flags.
  const yRawMax = Math.max(...data.map((d) => d.y));
  const yMax = yRawMax * 1.1;

  // Trace dimensions are mirrored locally so the live-pulse halo can be
  // rendered as an in-SVG <circle> at the exact terminal coordinates.
  // Mirror the Trace's default margin (1) so the halo lands precisely on
  // the terminal dot rather than on the bare-viewBox edge.
  const W = 520;
  const H = 48;
  const M = 1;
  const innerW = W - M * 2;
  const innerH = H - M * 2;
  const lastIdx = data.length - 1;
  const lastX = M + ((data[lastIdx].x - 0) / 13) * innerW;
  const lastY =
    yMax > 0 ? M + (1 - data[lastIdx].y / yMax) * innerH : H - M;

  return (
    <div className="relative">
      <Trace
        data={data}
        width={W}
        height={H}
        xDomain={[0, 13]}
        yDomain={[0, yMax]}
        smooth
        strokeColor={
          killed ? "var(--color-text-muted)" : "var(--color-text)"
        }
        strokeWidth={1}
        fill={{
          kind: "below",
          y: 0,
          color: "color-mix(in oklch, var(--color-text-muted) 10%, transparent)",
        }}
        dots={[
          {
            index: lastIdx,
            color: killed
              ? "var(--color-text-muted)"
              : "var(--color-accent-2)",
            radius: 2.4,
          },
        ]}
        className="block w-full"
        ariaLabel="Evaluations over the last 14 days"
      />
      {/* Live-pulse halo, rendered as an absolutely-positioned overlay SVG so
          we animate opacity only — never r/cx/cy. The overlay matches the
          Trace's intrinsic viewBox so the halo lands on the terminal dot at
          every responsive width. */}
      {!killed && (
        <svg
          key={pulseTick}
          aria-hidden
          className="pointer-events-none absolute inset-0 block h-full w-full"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
        >
          <circle
            cx={lastX}
            cy={lastY}
            r={5}
            fill="color-mix(in oklch, var(--color-accent-2) 40%, transparent)"
            style={{ animation: `live-pulse 2000ms ease-in-out infinite` }}
          />
        </svg>
      )}
      <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        <span>14d ago</span>
        <span>today</span>
      </div>
    </div>
  );
}

function FeatureFlagsSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Left pane: 8 row-shaped skeletons. */}
      <div className="hidden flex-col gap-2 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:flex">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            width={240}
            height={60}
            density={0.05}
            seed={11 + i}
            className="h-[60px] w-full"
          />
        ))}
      </div>
      {/* Right pane: select-a-flag placeholder + trace stipple. */}
      <div className="flex min-h-0 flex-col p-6">
        <p className="text-[12px] italic text-[var(--color-text-muted)]">
          Select a flag.
        </p>
        <div className="mt-4 h-[48px] w-full max-w-[520px]">
          <Skeleton
            width={520}
            height={48}
            density={0.05}
            seed={31}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}

function AuditRow({ entry, fresh }: { entry: AuditEntry; fresh: boolean }) {
  const [shown, setShown] = useState(!fresh);
  useEffect(() => {
    if (!fresh) return;
    const id = window.setTimeout(() => setShown(true), 0);
    return () => window.clearTimeout(id);
  }, [fresh]);

  return (
    <li
      className="grid grid-cols-[64px_64px_1fr] items-baseline gap-3 border-b border-[var(--color-border)] py-1.5 last:border-b-0"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(2px)",
        transition: `opacity 200ms ${PAPER_EASE}, transform 200ms ${PAPER_EASE}`,
      }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] tabular-nums">
        {entry.ts}
      </span>
      <span className="font-mono text-[10px] text-[var(--color-text)]">
        {entry.author}
      </span>
      <span className="text-[12px] text-[var(--color-text)]">
        {entry.change}
      </span>
    </li>
  );
}
