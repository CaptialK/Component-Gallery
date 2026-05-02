"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Code2, Copy, Eye } from "lucide-react";
import { ThemeToggle } from "@/components/_kit/theme-toggle";
import { cn } from "@/lib/cn";

type EntryShape = {
  category: string;
  slug: string;
  title: string;
  filename: string;
};

type Mode = "preview" | "source";

export function ComponentPageShell({
  entry,
  source,
  children,
}: {
  entry: EntryShape;
  source: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("preview");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onCopy = async () => {
    if (typeof window === "undefined") return;
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  };

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-bg)]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3">
        <Link
          href="/"
          aria-label="Back to index"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft size={14} strokeWidth={1.6} />
        </Link>
        <Breadcrumb category={entry.category} title={entry.title} />
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle mode={mode} onChange={setMode} />
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy link"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
          >
            {copied ? (
              <Check size={13} strokeWidth={1.8} className="text-[var(--color-success)]" />
            ) : (
              <Copy size={13} strokeWidth={1.6} />
            )}
          </button>
          <ThemeToggle />
        </div>
      </header>
      <div className="relative flex-1 overflow-hidden">
        <div className={cn("absolute inset-0", mode === "preview" ? "block" : "hidden")}>
          {children}
        </div>
        <div className={cn("absolute inset-0", mode === "source" ? "block" : "hidden")}>
          {source}
        </div>
      </div>
    </div>
  );
}

function Breadcrumb({ category, title }: { category: string; title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
      <Link
        href={`/#${category}`}
        className="truncate font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        {category}
      </Link>
      <span aria-hidden className="text-[var(--color-text-muted)]">
        /
      </span>
      <span className="truncate font-mono text-[var(--color-text)]">{title}</span>
    </nav>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5"
    >
      <button
        role="tab"
        aria-selected={mode === "preview"}
        onClick={() => onChange("preview")}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-xs)] px-2 text-xs",
          mode === "preview"
            ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[0_1px_0_color-mix(in_oklch,var(--color-text)_5%,transparent)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
        )}
      >
        <Eye size={12} strokeWidth={1.6} />
        Preview
      </button>
      <button
        role="tab"
        aria-selected={mode === "source"}
        onClick={() => onChange("source")}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-xs)] px-2 text-xs",
          mode === "source"
            ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[0_1px_0_color-mix(in_oklch,var(--color-text)_5%,transparent)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
        )}
      >
        <Code2 size={12} strokeWidth={1.6} />
        Source
      </button>
    </div>
  );
}
