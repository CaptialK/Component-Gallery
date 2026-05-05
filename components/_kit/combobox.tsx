"use client";

import * as React from "react";
import { Combobox as BaseCombobox } from "@base-ui-components/react/combobox";
import { cn } from "@/lib/cn";

/**
 * Combobox — Base UI Combobox wrapped to share the catalogue's overlay vocab.
 * Input pairs with a popover dropdown anchored to the input. Up to 8 items
 * shown, keyboard ↑↓⏎, Esc closes. Each item label highlights the matched
 * substring in Federal Blue. Empty state renders in Fraunces italic.
 *
 * Same shadow/border/paper-ease envelope as `<Popover>`.
 */

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export type ComboboxItem<T = unknown> = {
  value: string;
  label: string;
  hint?: string;
  data?: T;
};

export type ComboboxProps<T = unknown> = {
  value: string;
  onValueChange: (v: string) => void;
  items: ComboboxItem<T>[];
  placeholder?: string;
  emptyMessage?: string;
  onSelect: (item: ComboboxItem<T>) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
};

const SIZE_HEIGHT: Record<NonNullable<ComboboxProps["size"]>, string> = {
  sm: "h-8",
  md: "h-10",
};

/** Highlight the first occurrence of `query` (case-insensitive) inside `label`
 *  with a Federal Blue underline. */
function HighlightedLabel({
  label,
  query,
}: {
  label: string;
  query: string;
}) {
  if (!query) return <>{label}</>;
  const lower = label.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return <>{label}</>;
  return (
    <>
      {label.slice(0, idx)}
      <span
        style={{
          color: "var(--color-accent-2)",
          textDecoration: "underline",
          textUnderlineOffset: 2,
          textDecorationThickness: 1,
        }}
      >
        {label.slice(idx, idx + q.length)}
      </span>
      {label.slice(idx + q.length)}
    </>
  );
}

export function Combobox<T = unknown>({
  value,
  onValueChange,
  items,
  placeholder,
  emptyMessage = "No matches.",
  onSelect,
  ariaLabel,
  size = "md",
  className,
}: ComboboxProps<T>) {
  // Match: substring (case-insensitive) on label, value, or hint.
  const filtered = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items
      .filter((it) => {
        const hay = `${it.label} ${it.value} ${it.hint ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [items, value]);

  return (
    <BaseCombobox.Root
      items={filtered}
      inputValue={value}
      onInputValueChange={(v: string) => onValueChange(v)}
      onValueChange={(v: unknown) => {
        if (v && typeof v === "object" && "value" in v) {
          onSelect(v as ComboboxItem<T>);
        }
      }}
      itemToStringLabel={(it: ComboboxItem<T>) => it.label}
      itemToStringValue={(it: ComboboxItem<T>) => it.value}
    >
      <div
        className={cn(
          "relative flex items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] focus-within:border-[var(--color-border-strong)]",
          SIZE_HEIGHT[size],
          className,
        )}
      >
        <BaseCombobox.Input
          aria-label={ariaLabel}
          placeholder={placeholder}
          className="block h-full w-full rounded-[var(--radius-sm)] bg-transparent px-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
        />
      </div>
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner side="bottom" align="start" sideOffset={4}>
          <BaseCombobox.Popup
            className={cn(
              "z-50 max-h-[280px] min-w-[var(--anchor-width)] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-1 outline-none",
              "transition-[opacity,transform]",
              "data-[starting-style]:opacity-0 data-[starting-style]:-translate-y-[2px]",
              "data-[ending-style]:opacity-0 data-[ending-style]:-translate-y-[2px] data-[ending-style]:duration-[120ms] data-[ending-style]:[transition-timing-function:ease-in]",
            )}
            style={{
              boxShadow:
                "0 8px 24px -12px color-mix(in oklch, var(--color-text) 22%, transparent)",
              transitionDuration: "200ms",
              transitionTimingFunction: PAPER_EASE,
            }}
          >
            <BaseCombobox.List>
              {(item: ComboboxItem<T>) => (
                <BaseCombobox.Item
                  key={item.value}
                  value={item}
                  className="relative mx-1 flex h-7 cursor-default select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 text-[12.5px] text-[var(--color-text)] outline-none data-[highlighted]:bg-[var(--color-bg)]"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-full opacity-0 transition-opacity duration-[120ms] ease-out [[data-highlighted]>&]:opacity-100"
                    style={{ background: "var(--color-accent-2)" }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <HighlightedLabel label={item.label} query={value} />
                  </span>
                  {item.hint && (
                    <span className="ml-2 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      {item.hint}
                    </span>
                  )}
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
            <BaseCombobox.Empty
              className="px-3 py-3 text-center text-[13px] italic text-[var(--color-text-muted)]"
              style={{
                fontFamily: "var(--font-display)",
                fontVariationSettings: '"opsz" 18, "SOFT" 30',
              }}
            >
              {emptyMessage}
            </BaseCombobox.Empty>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}
