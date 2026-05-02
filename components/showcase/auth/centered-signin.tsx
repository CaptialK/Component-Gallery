"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { GithubIcon } from "@/components/_kit/icons";
import { cn } from "@/lib/cn";

export default function CenteredSignin() {
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="grid h-full w-full place-items-center bg-[var(--color-bg)] px-4 py-10">
      <div className="w-full max-w-[380px]">
        {/* Wordmark — small, restrained */}
        <div className="mb-10 flex items-center gap-2">
          <div
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-[var(--radius-xs)] bg-[var(--color-accent)] font-mono text-[12px] font-medium text-[var(--color-accent-fg)]"
          >
            S
          </div>
          <span className="font-mono text-[13px] tracking-tight text-[var(--color-text)]">
            stipple.lab
          </span>
        </div>

        <h1 className="text-[22px] font-medium leading-tight tracking-[-0.02em]">
          Sign in to continue
        </h1>
        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
          New here?{" "}
          <a
            href="#"
            className="text-[var(--color-text)] underline-offset-4 hover:underline"
          >
            Create an account
          </a>
          .
        </p>

        <form className="mt-8 space-y-3">
          <Field label="Work email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:outline-none"
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            aside={
              <a
                href="#"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Forgot?
              </a>
            }
          >
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 pr-9 text-sm placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              >
                {showPw ? <EyeOff size={13} strokeWidth={1.6} /> : <Eye size={13} strokeWidth={1.6} />}
              </button>
            </div>
          </Field>

          <button
            type="submit"
            className={cn(
              "mt-2 inline-flex h-9 w-full items-center justify-center rounded-[var(--radius-sm)] text-sm font-medium",
              "bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
              "border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)]",
              "hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)]",
              "active:translate-y-px",
            )}
          >
            Continue
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          <span className="h-px flex-1 bg-[var(--color-border)]" />
          or
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm hover:border-[var(--color-border-strong)]"
        >
          <GithubIcon size={14} />
          Continue with GitHub
        </button>

        <p className="mt-8 text-center text-[11px] text-[var(--color-text-muted)]">
          By continuing you agree to our{" "}
          <a
            href="#"
            className="underline-offset-4 hover:text-[var(--color-text)] hover:underline"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="#"
            className="underline-offset-4 hover:text-[var(--color-text)] hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  aside,
  children,
}: {
  label: string;
  htmlFor: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <label htmlFor={htmlFor} className="font-medium text-[var(--color-text)]">
          {label}
        </label>
        {aside ? <span>{aside}</span> : null}
      </div>
      {children}
    </div>
  );
}
