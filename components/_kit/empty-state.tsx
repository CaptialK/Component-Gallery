import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * EmptyState — the catalogue's empty-surface vocabulary.
 *
 * Vertical stack: illustration -> eyebrow -> title -> body -> action ->
 * secondary. Title is Fraunces italic (SOFT-30, opsz 36); eyebrow is mono-
 * caps; body is muted Geist Sans capped at 44ch. Action button matches the
 * shape used in inbox-zero and centered-signin (h-9, rounded-sm, hairline-
 * darkened persimmon edge for primary; border emphasis for ghost).
 *
 * Server-renderable: this primitive is a pure typeset container. The action
 * button uses an `onClick` handler, but a `<button onClick>` does not by
 * itself require "use client" — the boundary is decided by the consumer
 * passing the function across the RSC seam. Keeping this file server-
 * renderable lets bare/static plates use it without inflating the client
 * bundle.
 *
 * Example consumer composition (left here as a comment, not exported):
 *
 *   <EmptyState
 *     illustration={<EnvelopeIllustration />}
 *     eyebrow="inbox"
 *     title="No threads waiting."
 *     body="Forward an email or start something new — we'll route it from there."
 *     action={{ label: "New thread", onClick: () => setOpen(true) }}
 *     secondary={<button className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]">set rules</button>}
 *   />
 */

export type EmptyStateProps = {
  illustration?: React.ReactNode;
  eyebrow?: string;
  title: string;
  body?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "ghost";
  };
  secondary?: React.ReactNode;
  align?: "center" | "start";
  density?: "default" | "inline";
  className?: string;
};

export function EmptyState({
  illustration,
  eyebrow,
  title,
  body,
  action,
  secondary,
  align = "center",
  density = "default",
  className,
}: EmptyStateProps) {
  const isCenter = align === "center";
  const isInline = density === "inline";

  return (
    <div
      className={cn(
        "flex flex-col",
        isCenter ? "items-center text-center" : "items-start text-left",
        isInline ? "gap-2 px-4 py-6" : "gap-3 px-6 py-12",
        className,
      )}
    >
      {illustration && (
        <div className={cn("shrink-0", isInline ? "mb-1" : "mb-2")}>
          {illustration}
        </div>
      )}

      {eyebrow && (
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          {eyebrow}
        </div>
      )}

      <h3
        className="font-display italic text-[20px] tracking-[-0.02em] leading-tight text-[var(--color-text)]"
        style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
      >
        {title}
      </h3>

      {body && (
        <p
          className={cn(
            "text-[13px] leading-relaxed text-[var(--color-text-muted)] max-w-[44ch]",
            isCenter && "mx-auto",
          )}
        >
          {body}
        </p>
      )}

      {action && <EmptyStateAction {...action} />}

      {secondary && (
        <div
          className={cn(
            "text-[var(--color-text-muted)]",
            isInline ? "mt-0" : "mt-1",
          )}
        >
          {secondary}
        </div>
      )}
    </div>
  );
}

function EmptyStateAction({
  label,
  onClick,
  variant = "primary",
}: NonNullable<EmptyStateProps["action"]>) {
  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex h-9 items-center rounded-[var(--radius-sm)] border px-3 text-[13px]",
          "border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)]",
          "transition-[transform,border-color,color] duration-[120ms] ease-out",
          "hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
          "active:translate-y-px",
        )}
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-[var(--radius-sm)] border px-3 text-[13px]",
        "border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
        "transition-[transform,border-color] duration-[120ms] ease-out",
        "hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)]",
        "active:translate-y-px",
      )}
    >
      {label}
    </button>
  );
}
