"use client";

/**
 * REGISTRY
 *   domain:        saas
 *   category:      forms
 *   slug:          api-keys
 *   title:         API keys
 *   filename:      api-keys.tsx
 *   description:   Vertical-stack credential cards (5 cards). Each card reads
 *                  as a credential, not a table row: ringed creator monogram,
 *                  recency trail, scope chips, large masked secret, 7d
 *                  sparkline, p99, danger-zone rotate/revoke.
 *   layout:        specimen
 *   aspectRatio:   5 / 6
 *   maxWidth:      600
 *   firstImpression: 2026-05-05
 *
 * Self-contained client component. No registry edits.
 */

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Copy, Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Trace, type TracePoint } from "@/components/_kit/trace";
import { Modal, ModalClose, ModalTitle, ModalDescription } from "@/components/_kit/modal";
import { useToast } from "@/components/_kit/toast";
import { Skeleton } from "@/components/_kit/skeleton";
import { EmptyState } from "@/components/_kit/empty-state";
import { ErrorState } from "@/components/_kit/error-state";

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

type Scope = "read" | "write" | "admin";

type ApiKey = {
  name: string;
  createdBy: string;
  createdAt: string;
  lastUsed: string;
  /** 5 0..1 recency-trail values; 1 = used today, 0 = never. */
  recency: number[];
  scopes: Scope[];
  prefix: string;
  last4: string;
  /** 7-day request count. */
  usage: number[];
  p99: number;
};

const KEYS: ApiKey[] = [
  {
    name: "production-server",
    createdBy: "MR",
    createdAt: "Apr 12",
    lastUsed: "18m ago",
    recency: [1, 1, 0.9, 1, 1],
    scopes: ["read", "write"],
    prefix: "sk_live_4Z9",
    last4: "p2HQ",
    usage: [1240, 1380, 1420, 1510, 1480, 1620, 1700],
    p99: 184,
  },
  {
    name: "ci-deploy",
    createdBy: "JT",
    createdAt: "Mar 03",
    lastUsed: "2h ago",
    recency: [0.8, 0.6, 0.9, 0.7, 1],
    scopes: ["write"],
    prefix: "sk_live_8Wb",
    last4: "k4MN",
    usage: [320, 280, 410, 360, 240, 380, 420],
    p99: 142,
  },
  {
    name: "analytics-readonly",
    createdBy: "AH",
    createdAt: "Feb 18",
    lastUsed: "1d ago",
    recency: [0.6, 0.5, 0.4, 0.6, 0.5],
    scopes: ["read"],
    prefix: "sk_live_2Qx",
    last4: "f9LT",
    usage: [180, 220, 200, 240, 210, 260, 240],
    p99: 98,
  },
  {
    name: "ops-rotation",
    createdBy: "RG",
    createdAt: "Apr 28",
    lastUsed: "expiring in 3d",
    recency: [0.3, 0.2, 0.1, 0.2, 0.1],
    scopes: ["admin"],
    prefix: "sk_live_7Mn",
    last4: "x1RB",
    usage: [40, 60, 50, 80, 60, 40, 30],
    p99: 220,
  },
  {
    name: "local-dev",
    createdBy: "JT",
    createdAt: "Apr 30",
    lastUsed: "5d ago",
    recency: [0.4, 0.3, 0.2, 0.1, 0],
    scopes: ["read", "write"],
    prefix: "sk_test_3Fa",
    last4: "j7VC",
    usage: [12, 8, 14, 6, 4, 2, 0],
    p99: 64,
  },
];

const MEMBERS: Record<string, string> = {
  MR: "Mara Reyes",
  JT: "Jules Tanaka",
  AH: "Amir Haddad",
  RG: "Rosa Garcia",
};

const SCOPE_INK: Record<Scope, string> = {
  read: "var(--color-text-muted)",
  write: "var(--color-accent-2)",
  admin: "var(--color-accent)",
};

function maskSecret(prefix: string, last4: string): string {
  return `${prefix}_${"•".repeat(12)}${last4}`;
}

// Quantize 0..1 recency to one of three discrete fade levels.
// Returns 0 (faded), 0.5 (mid), or 1 (most-recent); and -1 to mean "never used".
function quantizeRecency(r: number): -1 | 0 | 0.5 | 1 {
  if (r <= 0) return -1;
  if (r < 0.34) return 0;
  if (r < 0.67) return 0.5;
  return 1;
}

// Compose an aria description for the recency trail using the 3-level legend:
// "most recent · recent · faint · never used".
function describeRecencyTrail(rs: number[]): string {
  const labels = rs.map((r) => {
    const q = quantizeRecency(r);
    if (q === -1) return "never used";
    if (q === 1) return "most recent";
    if (q === 0.5) return "recent";
    return "faint";
  });
  return `Recency · ${labels.join(", ")}`;
}

// Per-card consolidated state — replaces 5 useState hooks.
type CardState = {
  revealed: boolean;
  rotating: boolean;
  revoked: boolean;
};

type CardAction =
  | { type: "toggle-reveal" }
  | { type: "rotate-start" }
  | { type: "rotate-end" }
  | { type: "revoke" };

const INITIAL_CARD_STATE: CardState = {
  revealed: false,
  rotating: false,
  revoked: false,
};

function cardReducer(state: CardState, action: CardAction): CardState {
  switch (action.type) {
    case "toggle-reveal":
      return { ...state, revealed: !state.revealed };
    case "rotate-start":
      return { ...state, rotating: true };
    case "rotate-end":
      return { ...state, rotating: false };
    case "revoke":
      return { ...state, revoked: true };
    default:
      return state;
  }
}

function fullSecret(prefix: string, last4: string): string {
  // Demo only — deterministic synth so the reveal feels real.
  const body = "Q3rT9xLm2NbVuE7YfWaPKsZh8DJgRcBMt4Cy";
  return `${prefix}_${body}${last4}`;
}

export default function ApiKeysAlt() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  // Toggle to demo the empty workspace path. The plate ships with KEYS, so
  // this is normally false; reading lib/registry isn't allowed for this pass,
  // so the empty state renders only if the keys array goes empty at runtime.
  const keys = KEYS;
  const noKeys = keys.length === 0;
  const expiringCount = keys.filter((k) => k.lastUsed.startsWith("expiring")).length;

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 240);
    return () => window.clearTimeout(t);
  }, []);

  // Single shared confirm-modal state — replaces one modal per card.
  const [confirmingKeyId, setConfirmingKeyId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [revokedSet, setRevokedSet] = useState<Set<string>>(() => new Set());
  const [revokeError, setRevokeError] = useState(false);

  const confirmingKey = confirmingKeyId
    ? keys.find((k) => k.name === confirmingKeyId) ?? null
    : null;

  const onRequestRevoke = (name: string) => {
    setConfirmText("");
    setRevokeError(false);
    setConfirmingKeyId(name);
  };

  const onConfirmRevoke = () => {
    if (!confirmingKey || confirmText !== confirmingKey.name) return;
    // 8% simulated revoke failure: keep modal open + inline error.
    if (Math.random() < 0.08) {
      setRevokeError(true);
      return;
    }
    setRevokeError(false);
    setRevokedSet((prev) => {
      const next = new Set(prev);
      next.add(confirmingKey.name);
      return next;
    });
    toast({ title: `Key revoked · ${confirmingKey.name}`, status: "error" });
    setConfirmingKeyId(null);
  };

  // Bottom-sheet modal placement on narrow viewports.
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
    <div className="flex h-full w-full flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <Header keyCount={keys.length} expiringCount={expiringCount} />
      <LegendStrip />
      {loading ? (
        <ApiKeysSkeleton />
      ) : noKeys ? (
        <div className="grid min-h-0 flex-1 place-items-center px-6 py-4">
          <EmptyState
            title="No API keys yet."
            body="Generate one to start authenticating requests."
            action={{
              label: "New key",
              onClick: () => toast({ title: "Create key", status: "info" }),
            }}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          {keys.map((k) => (
            <KeyCard
              key={k.name}
              apiKey={k}
              externallyRevoked={revokedSet.has(k.name)}
              onRequestRevoke={() => onRequestRevoke(k.name)}
            />
          ))}
        </div>
      )}

      {/* Single shared confirm modal — driven by parent state. */}
      <Modal
        open={confirmingKeyId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmingKeyId(null);
            setRevokeError(false);
          }
        }}
        placement={narrow ? "bottom" : "center"}
        size="sm"
        ariaLabel={confirmingKey ? `Revoke ${confirmingKey.name}` : "Revoke key"}
      >
        {confirmingKey && (
          <RevokeConfirmBody
            confirmingKey={confirmingKey}
            confirmText={confirmText}
            setConfirmText={setConfirmText}
            onConfirm={onConfirmRevoke}
            error={revokeError}
            onClearError={() => setRevokeError(false)}
          />
        )}
      </Modal>
    </div>
  );
}

function Header({
  keyCount,
  expiringCount,
}: {
  keyCount: number;
  expiringCount: number;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] px-6 pt-6 pb-4">
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          API keys · {keyCount} active · {expiringCount} expiring
        </div>
        <h1
          className="mt-1 font-display text-[22px] italic leading-none tracking-[-0.02em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          API keys.
        </h1>
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
          Tokens authorize requests to the public API. Reveal, copy, or
          rotate a key without losing its history. Revoking is irreversible.
        </p>
      </div>
    </div>
  );
}

function LegendStrip() {
  return (
    <div
      role="list"
      aria-label="Legend"
      className="flex items-center gap-x-3 border-b border-[var(--color-border)] px-6 py-2 font-mono text-[10px] uppercase tracking-[0.14em] whitespace-nowrap text-[var(--color-text-muted)]"
    >
      <span aria-hidden>Scope</span>
      {(["read", "write", "admin"] as Scope[]).map((s) => (
        <span key={s} role="listitem" className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="block h-1 w-1 rounded-full"
            style={{ background: SCOPE_INK[s] }}
          />
          {s}
        </span>
      ))}
      <span aria-hidden className="ml-2 inline-block h-3 w-px bg-[var(--color-border)]" />
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="flex items-center gap-[2px]">
          <span
            className="block h-[4px] w-[4px] rounded-full"
            style={{ background: "color-mix(in oklch, var(--color-text) 100%, transparent)" }}
          />
          <span
            className="block h-[4px] w-[4px] rounded-full"
            style={{ background: "color-mix(in oklch, var(--color-text) 50%, transparent)" }}
          />
          <span
            className="block h-[4px] w-[4px] rounded-full"
            style={{ background: "color-mix(in oklch, var(--color-text) 18%, transparent)" }}
          />
        </span>
        recency · 5 days · 3 levels
      </span>
    </div>
  );
}

function KeyCard({
  apiKey,
  externallyRevoked,
  onRequestRevoke,
}: {
  apiKey: ApiKey;
  externallyRevoked: boolean;
  onRequestRevoke: () => void;
}) {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(cardReducer, INITIAL_CARD_STATE);
  const revoked = state.revoked || externallyRevoked;
  const { revealed, rotating } = state;
  // Persimmon trace-fade flash on rotate fail.
  const [rotateFailFlash, setRotateFailFlash] = useState(false);

  const usagePoints: TracePoint[] = useMemo(
    () => apiKey.usage.map((v, i) => ({ x: i, y: v })),
    [apiKey.usage],
  );
  const max = Math.max(...apiKey.usage, 1);

  const masked = useMemo(() => maskSecret(apiKey.prefix, apiKey.last4), [apiKey]);
  const full = useMemo(() => fullSecret(apiKey.prefix, apiKey.last4), [apiKey]);

  const onCopy = async () => {
    if (revoked) return;
    try {
      await navigator.clipboard.writeText(full);
      toast({ title: "Copied to clipboard", status: "success" });
    } catch {
      toast({ title: "Could not copy", status: "error" });
    }
  };

  const onRotate = () => {
    if (revoked || rotating) return;
    dispatch({ type: "rotate-start" });
    const willFail = Math.random() < 0.08;
    window.setTimeout(() => {
      dispatch({ type: "rotate-end" });
      if (willFail) {
        setRotateFailFlash(true);
        window.setTimeout(() => setRotateFailFlash(false), 200);
        toast({ title: "Rotate failed. Retry.", status: "error" });
      } else {
        toast({ title: `Key rotated · ${apiKey.name}`, status: "success" });
      }
    }, 320 + 2000 * 3);
  };

  const onReveal = () => {
    if (revoked) return;
    // 8% simulated MFA-required failure on reveal.
    if (!state.revealed && Math.random() < 0.08) {
      toast({ title: "Auth required to reveal.", status: "error" });
      return;
    }
    dispatch({ type: "toggle-reveal" });
  };

  const labelId = `key-${apiKey.name}`;
  return (
    <article
      data-key={apiKey.name}
      aria-labelledby={labelId}
      className={cn(
        "group relative flex min-h-[120px] gap-3 rounded-[var(--radius-sm)] border px-3 py-3 transition-[border-color,opacity] duration-[200ms] ease-out hover:border-[var(--color-border-strong)]",
        // Stack thirds on mobile, 3-col on >=sm (with trim at sm vs lg).
        "flex-col sm:flex-row",
        revoked
          ? "border-[var(--color-border)] opacity-40"
          : "border-[var(--color-border)]",
      )}
      style={{ transitionTimingFunction: PAPER_EASE }}
    >
      {/* Hover left-edge accent strip. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-2 left-0 w-[2px] rounded-full bg-[var(--color-accent-2)] opacity-0 transition-opacity duration-[120ms] ease-out group-hover:opacity-100"
      />

      {/* Rotating perimeter trace — four <line> segments so each animates in
          proportion to its actual visual length, no aspect-ratio math. */}
      {rotating && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <line
            x1="0" y1="0" x2="100%" y2="0"
            stroke="var(--color-accent-2)"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            style={{
              strokeDashoffset: 1,
              animation: "rotate-trace 80ms linear forwards",
            }}
          />
          <line
            x1="100%" y1="0" x2="100%" y2="100%"
            stroke="var(--color-accent-2)"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            style={{
              strokeDashoffset: 1,
              animation: "rotate-trace 80ms linear 80ms forwards",
            }}
          />
          <line
            x1="100%" y1="100%" x2="0" y2="100%"
            stroke="var(--color-accent-2)"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            style={{
              strokeDashoffset: 1,
              animation: "rotate-trace 80ms linear 160ms forwards",
            }}
          />
          <line
            x1="0" y1="100%" x2="0" y2="0"
            stroke="var(--color-accent-2)"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            style={{
              strokeDashoffset: 1,
              animation: "rotate-trace 80ms linear 240ms forwards",
            }}
          />
          <style>{`
            @keyframes rotate-trace {
              from { stroke-dashoffset: 1; }
              to   { stroke-dashoffset: 0; }
            }
          `}</style>
        </svg>
      )}

      {/* LEFT THIRD — creator + meta + recency trail. */}
      <div className="flex shrink-0 flex-col gap-1.5 sm:w-40 lg:w-44">
        <div className="flex items-center gap-2">
          <span
            title={MEMBERS[apiKey.createdBy] ?? apiKey.createdBy}
            className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[12px] text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
          >
            {apiKey.createdBy}
          </span>
          <div className="min-w-0">
            <div
              id={labelId}
              className="truncate text-[13px] font-medium text-[var(--color-text)]"
              title={apiKey.name}
            >
              {apiKey.name}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
              created {apiKey.createdAt}
            </div>
          </div>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          last used · {apiKey.lastUsed}
        </div>
        {/* 5-slot recency trail — quantized to 3 levels, hairline-stroke circle for "never used". */}
        <div
          className="flex items-center gap-1"
          aria-label={describeRecencyTrail(apiKey.recency)}
        >
          {apiKey.recency.map((r, i) => {
            const q = quantizeRecency(r);
            if (q === -1) {
              // Stroke-only circle at the same dot size — consistent visual treatment.
              return (
                <svg
                  key={i}
                  aria-hidden
                  width={6}
                  height={6}
                  viewBox="0 0 6 6"
                  className="block"
                >
                  <circle
                    cx={3}
                    cy={3}
                    r={2.5}
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              );
            }
            const opacity = q === 1 ? 100 : q === 0.5 ? 50 : 18;
            return (
              <span
                key={i}
                aria-hidden
                className="block rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: `color-mix(in oklch, var(--color-text) ${opacity}%, transparent)`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* MIDDLE THIRD — scopes + masked secret. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1">
          {apiKey.scopes.length === 0 ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              no scopes assigned
            </span>
          ) : (
            apiKey.scopes.map((s) => (
              <span
                key={s}
                className="inline-flex h-5 items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 font-mono text-[10px] uppercase tracking-[0.06em]"
                style={{ color: SCOPE_INK[s] }}
              >
                <span
                  aria-hidden
                  className="h-1 w-1 rounded-full"
                  style={{ background: SCOPE_INK[s] }}
                />
                {s}
              </span>
            ))
          )}
        </div>
        <div className="relative flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5">
          <span
            data-secret
            aria-label={revoked ? "(revoked)" : undefined}
            className="min-w-0 flex-1 truncate font-mono text-[12.5px] tracking-[0.02em] text-[var(--color-text)]"
          >
            {revealed ? full : masked}
          </span>
          {/* Persimmon strikethrough on revoke — fade-in via opacity. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-2 top-1/2 h-[1.5px] -translate-y-1/2"
            style={{
              background: "var(--color-accent)",
              opacity: revoked ? 1 : 0,
              transition: `opacity 200ms ${PAPER_EASE}`,
            }}
          />
          <button
            type="button"
            onClick={onReveal}
            disabled={revoked}
            aria-label={revealed ? "Hide secret" : "Reveal secret"}
            className={cn(
              "relative grid h-6 w-6 shrink-0 place-items-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] transition-[background-color,color] duration-[120ms] ease-out",
              !revoked && "hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
              revoked && "cursor-not-allowed",
            )}
          >
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center transition-opacity"
              style={{
                opacity: revealed ? 0 : 1,
                transition: `opacity 200ms ${PAPER_EASE}`,
              }}
            >
              <Eye size={13} strokeWidth={1.6} />
            </span>
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center transition-opacity"
              style={{
                opacity: revealed ? 1 : 0,
                transition: `opacity 200ms ${PAPER_EASE}`,
              }}
            >
              <EyeOff size={13} strokeWidth={1.6} />
            </span>
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={revoked}
            aria-label="Copy secret"
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] transition-[background-color,color] duration-[120ms] ease-out",
              !revoked && "hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
              revoked && "cursor-not-allowed",
            )}
          >
            <Copy size={13} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {/* RIGHT THIRD — sparkline + p99 + danger zone. Stack as a row on
          mobile so the third sits below the masked secret. */}
      <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1.5 sm:w-28 lg:w-32">
        <div className="h-7 w-[100px]">
          <Trace
            data={usagePoints}
            width={100}
            height={20}
            yDomain={[0, max * 1.1]}
            strokeColor={
              rotateFailFlash
                ? "var(--color-accent)"
                : revoked
                  ? "var(--color-text-muted)"
                  : "var(--color-text)"
            }
            strokeWidth={1.1}
            smooth
            dots={[
              {
                index: usagePoints.length - 1,
                color: revoked ? "var(--color-text-muted)" : "var(--color-accent-2)",
                radius: 1.6,
              },
            ]}
            margin={1.5}
            className="h-full w-full"
            ariaLabel={`7-day usage for ${apiKey.name}`}
          />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            p99
          </span>
          <span className="font-mono text-[12px] tabular-nums text-[var(--color-text)]">
            {apiKey.p99}
            <span className="ml-0.5 text-[10px] text-[var(--color-text-muted)]">ms</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRotate}
            disabled={revoked || rotating}
            aria-label="Rotate key"
            title="Rotate key"
            className={cn(
              "grid h-6 w-6 place-items-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] transition-[border-color,color] duration-[120ms] ease-out",
              !revoked && !rotating && "hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
              (revoked || rotating) && "cursor-not-allowed",
            )}
          >
            <RotateCcw size={12} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={onRequestRevoke}
            disabled={revoked}
            aria-label="Revoke key"
            title="Revoke key"
            className={cn(
              "grid h-6 w-6 place-items-center rounded-[var(--radius-xs)] border bg-[var(--color-bg)] transition-[border-color,color] duration-[120ms] ease-out",
              revoked
                ? "cursor-not-allowed border-[var(--color-border)] text-[var(--color-text-muted)]"
                : "border-[var(--color-border)] text-[var(--color-accent)] hover:border-[var(--color-accent)]",
            )}
          >
            <Trash2 size={12} strokeWidth={1.6} />
          </button>
        </div>
      </div>

    </article>
  );
}

function RevokeConfirmBody({
  confirmingKey,
  confirmText,
  setConfirmText,
  onConfirm,
  error,
  onClearError,
}: {
  confirmingKey: ApiKey;
  confirmText: string;
  setConfirmText: (v: string) => void;
  onConfirm: () => void;
  error: boolean;
  onClearError: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const descId = `revoke-desc-${confirmingKey.name}`;
  // Auto-focus the input on mount so the modal lands ready-for-typing.
  useEffect(() => {
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="px-4 py-4">
      <ModalTitle
        render={
          <h2
            className="font-display text-[18px] italic leading-none tracking-[-0.02em] text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            Revoke key
          </h2>
        }
      />
      <ModalDescription
        render={
          <p id={descId} className="mt-2 text-xs text-[var(--color-text-muted)]">
            This action cannot be undone. The key will stop authenticating
            immediately. Type{" "}
            <span className="font-mono text-[var(--color-text)]">
              {confirmingKey.name}
            </span>{" "}
            to confirm.
          </p>
        }
      />
      {error && (
        <div className="mt-3">
          <ErrorState
            variant="inline"
            title="Couldn't revoke. Retry."
            onDismiss={onClearError}
          />
        </div>
      )}
      <input
        ref={inputRef}
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={confirmingKey.name}
        aria-label="Confirm key name"
        aria-describedby={descId}
        className="mt-3 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 font-mono text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-strong)]"
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <ModalClose
          render={
            <button
              type="button"
              className="inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
          }
        />
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmText !== confirmingKey.name}
          className={cn(
            "inline-flex h-7 items-center rounded-[var(--radius-sm)] border px-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-[border-color,color,background-color] duration-[120ms] ease-out",
            confirmText === confirmingKey.name
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
              : "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]",
          )}
        >
          {error ? "Retry" : "Revoke"}
        </button>
      </div>
    </div>
  );
}

function ApiKeysSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-[120px] flex-col gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-3 sm:flex-row"
        >
          <Skeleton width={176} height={88} density={0.05} seed={11 + i} className="h-[88px] sm:w-44" />
          <Skeleton width={300} height={88} density={0.05} seed={31 + i} className="h-[88px] flex-1" />
          <div className="flex shrink-0 flex-col items-end gap-1.5 sm:w-32">
            <Skeleton width={100} height={20} density={0.05} seed={51 + i} className="h-5 w-[100px]" />
            <Skeleton width={64} height={14} density={0.05} seed={71 + i} className="h-3.5 w-16" />
            <Skeleton width={64} height={20} density={0.05} seed={91 + i} className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
