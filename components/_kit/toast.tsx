"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Toast — provider + hook + portal stack at bottom-right.
 * Visual: cream paper + hairline border + walnut text. A 6px leading dot
 * carries status: Federal Blue (loading, animate-live-pulse), persimmon
 * (error), walnut (success). NO icons. Mono-caps eyebrow when status is
 * not "info".
 *
 * Motion: 200ms paper-ease enter (opacity + translateY 8→0); 200ms ease-in
 * exit (opacity + translateY 0→4). Stack push uses the same 200ms paper-
 * ease — newer toasts append to the bottom; FLIP isn't needed because
 * each toast is rendered with its own animation state.
 */

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export type ToastStatus = "info" | "success" | "loading" | "error";

export type ToastInput = {
  title: string;
  status?: ToastStatus;
  /** ms; default 2500. `loading` defaults to Infinity until updated. */
  duration?: number;
  id?: string;
};

type Toast = {
  id: string;
  title: string;
  status: ToastStatus;
  duration: number;
  /** "live" | "leaving" — leaving toasts fade out then unmount. */
  state: "live" | "leaving";
};

type ToastCtxValue = {
  toast: (input: ToastInput) => string;
  update: (id: string, input: Partial<ToastInput>) => void;
  dismiss: (id: string) => void;
};

const Ctx = React.createContext<ToastCtxValue | null>(null);

// Inert fallback used when no ToastProvider is mounted (e.g. the bare
// /preview route, which strips site chrome for snapping). Plates can call
// `toast()` unconditionally without crashing in that context.
const NOOP_TOAST: ToastCtxValue = {
  toast: () => "",
  update: () => {},
  dismiss: () => {},
};

export function useToast(): ToastCtxValue {
  const ctx = React.useContext(Ctx);
  return ctx ?? NOOP_TOAST;
}

let counter = 0;
function genId(): string {
  counter += 1;
  return `t-${Date.now()}-${counter}`;
}

function defaultDuration(status: ToastStatus, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  if (status === "loading") return Number.POSITIVE_INFINITY;
  return 2500;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const clearTimer = React.useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  const startDismissTimer = React.useCallback(
    (id: string, duration: number) => {
      clearTimer(id);
      if (!Number.isFinite(duration)) return;
      const handle = setTimeout(() => {
        // Trigger leave; remove after the 200ms exit animation.
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, state: "leaving" } : t)),
        );
        const cleanup = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          timersRef.current.delete(id);
        }, 220);
        timersRef.current.set(id, cleanup);
      }, duration);
      timersRef.current.set(id, handle);
    },
    [clearTimer],
  );

  const toast = React.useCallback(
    (input: ToastInput): string => {
      const id = input.id ?? genId();
      const status: ToastStatus = input.status ?? "info";
      const duration = defaultDuration(status, input.duration);
      setToasts((prev) => {
        // If id collision, replace.
        const filtered = prev.filter((t) => t.id !== id);
        return [
          ...filtered,
          { id, title: input.title, status, duration, state: "live" },
        ];
      });
      startDismissTimer(id, duration);
      return id;
    },
    [startDismissTimer],
  );

  const update = React.useCallback(
    (id: string, input: Partial<ToastInput>) => {
      setToasts((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const nextStatus = input.status ?? t.status;
          const nextDuration =
            input.duration !== undefined
              ? input.duration
              : input.status !== undefined
                ? defaultDuration(nextStatus)
                : t.duration;
          return {
            ...t,
            title: input.title ?? t.title,
            status: nextStatus,
            duration: nextDuration,
          };
        }),
      );
      // Restart timer if duration is finite; loading→success/info/error
      // path falls back to the 2500ms default.
      const after = (() => {
        const next = input.status;
        if (input.duration !== undefined) return input.duration;
        if (next !== undefined) return defaultDuration(next);
        return undefined;
      })();
      if (after !== undefined) startDismissTimer(id, after);
    },
    [startDismissTimer],
  );

  const dismiss = React.useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, state: "leaving" } : t)),
      );
      const cleanup = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, 220);
      timersRef.current.set(id, cleanup);
    },
    [clearTimer],
  );

  React.useEffect(() => {
    return () => {
      for (const t of timersRef.current.values()) clearTimeout(t);
      timersRef.current.clear();
    };
  }, []);

  const value = React.useMemo(
    () => ({ toast, update, dismiss }),
    [toast, update, dismiss],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-2"
      style={{ alignItems: "flex-end" }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>,
    document.body,
  );
}

const STATUS_DOT: Record<ToastStatus, string | null> = {
  info: null,
  success: "var(--color-text)",
  loading: "var(--color-accent-2)",
  error: "var(--color-accent)",
};

const STATUS_EYEBROW: Record<ToastStatus, string | null> = {
  info: null,
  success: "done",
  loading: "working",
  error: "error",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const leaving = toast.state === "leaving";
  const dotColor = STATUS_DOT[toast.status];
  const eyebrow = STATUS_EYEBROW[toast.status];

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto min-w-[240px] max-w-[360px]",
        "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        "px-3 py-2 shadow-[0_8px_24px_-12px_color-mix(in_oklch,var(--color-text)_22%,transparent)]",
      )}
      style={{
        opacity: leaving ? 0 : 1,
        transform: leaving ? "translateY(4px)" : "translateY(0)",
        transition: leaving
          ? "opacity 200ms ease-in, transform 200ms ease-in"
          : `opacity 200ms ${PAPER_EASE}, transform 200ms ${PAPER_EASE}`,
      }}
    >
      <div className="flex items-start gap-2.5">
        {dotColor && (
          <span
            aria-hidden
            className={cn(
              "mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full",
              toast.status === "loading" && "animate-live-pulse",
            )}
            style={{ background: dotColor }}
          />
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              {eyebrow}
            </div>
          )}
          <div className="text-[12.5px] text-[var(--color-text)]">
            {toast.title}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-mono text-[10px] uppercase tracking-[0.14em]"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
