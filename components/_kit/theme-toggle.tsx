"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

const ORDER = ["system", "light", "dark"] as const;
type Mode = (typeof ORDER)[number];

const ICON: Record<Mode, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const LABEL: Record<Mode, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // Avoid hydration mismatch — render a placeholder until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = (theme as Mode) ?? "system";
  const Icon = ICON[current] ?? Monitor;
  const next: Mode = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  if (!mounted) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block h-8 w-8 rounded-[var(--radius-sm)]",
          "border border-[var(--color-border)]",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`Switch to ${LABEL[next]}`}
      title={LABEL[current]}
      onClick={() => setTheme(next)}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center",
        "rounded-[var(--radius-sm)] border border-[var(--color-border)]",
        "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
        "transition-[color,border-color] duration-150",
        "hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)]",
        className,
      )}
    >
      <Icon size={14} strokeWidth={1.6} />
    </button>
  );
}
