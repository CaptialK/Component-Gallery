"use client";

import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { GithubIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { useCommandPalette } from "./command-palette";

export function SiteHeader() {
  const { setOpen } = useCommandPalette();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-bg)_90%,transparent)] backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_oklch,var(--color-bg)_85%,transparent)]">
      <div className="mx-auto flex h-12 w-full max-w-[1100px] items-center gap-3 px-4 md:px-6">
        <Link href="/" className="shrink-0">
          <BrandMark />
        </Link>
        <span
          aria-hidden
          className="hidden h-3 w-px bg-[var(--color-border)] md:block"
        />
        <span className="hidden text-xs text-[var(--color-text-muted)] md:inline">
          a SaaS component gallery
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hidden h-8 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] sm:inline-flex"
          >
            <span>Search</span>
            <kbd className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
          <a
            href="https://github.com/CapitalK"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
          >
            <GithubIcon size={13} />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
