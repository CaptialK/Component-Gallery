"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * ErrorState — banner / inline / fullscreen error vocabulary.
 *
 * Three variants, one language: a 6px persimmon dot punctuates the failure;
 * the title carries the message in walnut ink (the strip + dot carry the
 * state — title text doesn't go persimmon). lastSync surfaces as a mono-caps
 * eyebrow when the failure is recoverable. Mount fades in once, 200ms
 * paper-ease — no continuous animation, no shimmer, no animated SVG.
 *
 * Marked "use client" because the file accepts `onRetry` / `onDismiss`
 * callbacks; the mount-effect for one-shot fade-in also requires client.
 *
 * Example consumer composition (comment, not exported):
 *
 *   <ErrorState
 *     variant="banner"
 *     title="Search unavailable."
 *     body="The query service didn't respond. We're showing cached results below."
 *     lastSync="02:14"
 *     onRetry={refetch}
 *     onDismiss={() => setBanner(false)}
 *   />
 */

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export type ErrorStateVariant = "banner" | "inline" | "fullscreen";

export type ErrorStateProps = {
  title: string;
  body?: string;
  variant?: ErrorStateVariant;
  onRetry?: () => void;
  onDismiss?: () => void;
  lastSync?: string;
  className?: string;
};

export function ErrorState({
  title,
  body,
  variant = "banner",
  onRetry,
  onDismiss,
  lastSync,
  className,
}: ErrorStateProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const mountStyle: React.CSSProperties = {
    opacity: mounted ? 1 : 0,
    transition: `opacity 200ms ${PAPER_EASE}`,
  };

  if (variant === "fullscreen") {
    return (
      <div
        role="alert"
        data-mounted={mounted ? "true" : "false"}
        className={cn(
          "mx-auto flex max-w-[420px] flex-col items-center justify-center gap-3 px-6 py-12 text-center",
          className,
        )}
        style={mountStyle}
      >
        <div className="flex w-full flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-bg)] px-6 py-8">
          <span
            aria-hidden
            className="block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
          />
          <h3
            className="font-display italic text-[18px] tracking-[-0.02em] leading-tight text-[var(--color-accent)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            {title}
          </h3>
          {body && (
            <p className="max-w-[44ch] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              {body}
            </p>
          )}
          {lastSync && (
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              last sync · {lastSync}
            </div>
          )}
          {(onRetry || onDismiss) && (
            <div className="mt-2 flex flex-col items-center gap-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={cn(
                    "inline-flex h-9 items-center rounded-[var(--radius-sm)] border px-3 text-[13px]",
                    "border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
                    "transition-[transform,border-color] duration-[120ms] ease-out",
                    "hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)]",
                    "active:translate-y-px",
                  )}
                >
                  Retry
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)] transition-colors duration-[120ms] ease-out hover:text-[var(--color-text)]"
                >
                  dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // banner | inline share the same row vocabulary; banner adds outer
  // border-y and a hair more padding.
  const isBanner = variant === "banner";

  return (
    <div
      role="alert"
      data-mounted={mounted ? "true" : "false"}
      className={cn(
        "flex items-center gap-3 border-l-2 border-[var(--color-accent)]",
        isBanner
          ? "border-y border-[var(--color-border)] px-3 py-2"
          : "px-3 py-1.5",
        className,
      )}
      style={{
        ...mountStyle,
        background:
          "color-mix(in oklch, var(--color-accent) 8%, var(--color-bg))",
      }}
    >
      <span
        aria-hidden
        className="block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] leading-snug text-[var(--color-text)]">
          {title}
        </div>
        {body && (
          <div className="mt-0.5 text-[12px] leading-snug text-[var(--color-text-muted)]">
            {body}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {lastSync && (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            last sync · {lastSync}
          </span>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              "inline-flex h-6 items-center rounded-[var(--radius-xs)] border px-2 text-[11px]",
              "border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)]",
              "transition-[transform,border-color,color] duration-[120ms] ease-out",
              "hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
              "active:translate-y-px",
            )}
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="text-[var(--color-text-muted)] transition-colors duration-[120ms] ease-out hover:text-[var(--color-text)]"
          >
            <X size={12} strokeWidth={1.6} />
          </button>
        )}
      </div>
    </div>
  );
}
