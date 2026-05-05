"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Eye, EyeOff } from "lucide-react";
import { GithubIcon } from "@/components/_kit/icons";
import { FieldError } from "@/components/_kit/field-error";
import { ErrorState } from "@/components/_kit/error-state";
import { cn } from "@/lib/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

type FieldState = { value: string; touched: boolean; error: string | null };
type SubmitState = "idle" | "loading" | "success" | "error";

const blank: FieldState = { value: "", touched: false, error: null };

function validateEmail(v: string): string | null {
  if (!v) return "Required.";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address.";
  return null;
}
function validatePassword(v: string): string | null {
  if (!v) return "Required.";
  if (v.length < 6) return "At least 6 characters.";
  return null;
}

export default function CenteredSignin() {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState<FieldState>(blank);
  const [password, setPassword] = useState<FieldState>(blank);
  const [submit, setSubmit] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [bannerOn, setBannerOn] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  // OAuth callback simulated state — driven by URL hash `#callback` OR
  // by a transient post-OAuth click flow.
  const [callbackPhase, setCallbackPhase] = useState(false);
  const [successAnnounce, setSuccessAnnounce] = useState("");
  const arrowRef = useRef<HTMLSpanElement>(null);

  // Detect a #callback hash on mount — simulates returning from GitHub.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("callback")) {
      setCallbackPhase(true);
      const t = window.setTimeout(() => setCallbackPhase(false), 1200);
      return () => window.clearTimeout(t);
    }
  }, []);

  const onEmailBlur = () =>
    setEmail((s) => ({ ...s, touched: true, error: validateEmail(s.value) }));
  const onPasswordBlur = () => {
    setPassword((s) => ({
      ...s,
      touched: true,
      error: validatePassword(s.value),
    }));
    // Browser autofill can leave caps state stuck — clear on blur.
    setCapsOn(false);
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submit === "loading" || submit === "success") return;
    // Trim email on submit — paste of "  mara@stipple.lab " currently fails.
    const trimmedEmail = email.value.trim();
    if (trimmedEmail !== email.value) {
      setEmail((s) => ({ ...s, value: trimmedEmail }));
    }
    const eErr = validateEmail(trimmedEmail);
    const pErr = validatePassword(password.value);
    setEmail((s) => ({ ...s, value: trimmedEmail, touched: true, error: eErr }));
    setPassword((s) => ({ ...s, touched: true, error: pErr }));
    if (eErr || pErr) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 4 && !bannerOn) {
        setBannerOn(true);
        setSubmit("error");
        // Banner persists; reset error state for next legit submit.
        setTimeout(() => setSubmit("idle"), 200);
      }
      return;
    }
    setSubmit("loading");
    setSubmitError(null);
    setTimeout(() => {
      setSubmit("success");
      setSuccessAnnounce("Signed in. Continuing to your workspace.");
      // Trigger one-shot arrow lift animation on success
      requestAnimationFrame(() => {
        const el = arrowRef.current;
        if (!el) return;
        el.style.transition = `transform 200ms ease-out`;
        el.style.transform = "translateY(-2px)";
        setTimeout(() => {
          if (!el) return;
          el.style.transform = "translateY(0)";
        }, 220);
      });
    }, 700);
  }

  function onOAuth() {
    if (oauthLoading) return;
    setOauthLoading(true);
    setTimeout(() => {
      setOauthLoading(false);
      // Simulate post-OAuth callback frame
      setCallbackPhase(true);
      window.setTimeout(() => setCallbackPhase(false), 1200);
    }, 600);
  }

  function checkCaps(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsOn(e.getModifierState && e.getModifierState("CapsLock"));
  }

  const submitDisabled = submit === "loading" || submit === "success";

  // Submit-button label string (kept stable across renders for ARIA-live).
  const submitLabel =
    submit === "loading"
      ? "Signing in"
      : submit === "success"
        ? "Welcome back"
        : "Continue";

  return (
    <div className="grid h-full w-full place-items-center bg-[var(--color-bg)] px-4 py-10 [&_.signin-pad]:px-3 sm:[&_.signin-pad]:px-4">
      <div className="signin-pad relative w-full max-w-[380px]">
        {/* OAuth callback overlay — replaces the form when returning from
            GitHub. Centered live-pulse + mono-caps caption. */}
        {callbackPhase ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="mb-4 flex items-center gap-2">
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-[var(--radius-xs)] bg-[var(--color-bg)] ring-1 ring-[var(--color-border-strong)]"
              >
                <span
                  className="font-display text-[16px] italic leading-none text-[var(--color-text)]"
                  style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
                >
                  S
                </span>
              </span>
              <span
                className="font-display text-[15px] italic leading-none text-[var(--color-text)]"
                style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
              >
                stipple
                <span className="text-[var(--color-text-muted)]">.lab</span>
              </span>
            </div>
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 animate-live-pulse rounded-full"
              style={{ background: "var(--color-accent-2)" }}
            />
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              returning from GitHub
            </div>
          </div>
        ) : (
          <>
            {/* Per-submit error banner — dismissible, transient. */}
            {submitError && !bannerOn && (
              <div className="mb-4">
                <ErrorState
                  variant="banner"
                  title="Email or password incorrect."
                  body={submitError}
                  onDismiss={() => setSubmitError(null)}
                />
                <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  <button
                    type="button"
                    onClick={() => setSubmitError(null)}
                    className="hover:text-[var(--color-text)]"
                  >
                    Try again
                  </button>
                  <span aria-hidden>·</span>
                  <a href="#" className="hover:text-[var(--color-text)]">
                    Reset password
                  </a>
                </div>
              </div>
            )}

            {/* Lockout banner — sticky after 4 invalid attempts. */}
            {bannerOn && <LockoutBanner onDismiss={() => setBannerOn(false)} />}

            {/* Wordmark */}
            <div className="mb-10 flex items-center gap-2">
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-[var(--radius-xs)] bg-[var(--color-bg)] ring-1 ring-[var(--color-border-strong)]"
              >
                <span
                  className="font-display text-[16px] italic leading-none text-[var(--color-text)]"
                  style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
                >
                  S
                </span>
              </span>
              <span
                className="font-display text-[15px] italic leading-none text-[var(--color-text)]"
                style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
              >
                stipple
                <span className="text-[var(--color-text-muted)]">.lab</span>
              </span>
            </div>

            <h1
              className="font-display text-[22px] leading-tight tracking-[-0.022em] text-[var(--color-text)] sm:text-[26px]"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
            >
              Sign in to continue.
            </h1>
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
              New here?{" "}
              <a href="#" className="link text-[var(--color-text)]">
                Create an account
              </a>
              .
            </p>

            <form className="mt-8 space-y-3" onSubmit={onSubmit} noValidate>
              <Field label="Work email" htmlFor="email">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email.value}
                  aria-invalid={Boolean(email.error)}
                  aria-describedby={email.error ? "email-error" : undefined}
                  onChange={(e) =>
                    setEmail((s) => ({ ...s, value: e.target.value, error: s.touched ? validateEmail(e.target.value) : s.error }))
                  }
                  onBlur={onEmailBlur}
                  className={cn(
                    "h-9 w-full rounded-[var(--radius-sm)] border bg-[var(--color-surface)] px-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none",
                    email.error
                      ? "border-[var(--color-accent)] focus:border-[var(--color-accent)]"
                      : "border-[var(--color-border)] focus:border-[var(--color-border-strong)]",
                  )}
                />
                <FieldError id="email-error">{email.error}</FieldError>
              </Field>

              <Field
                label="Password"
                htmlFor="password"
                aside={
                  <a href="#" className="link text-[var(--color-text-muted)]">
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
                    value={password.value}
                    aria-invalid={Boolean(password.error)}
                    aria-describedby={
                      password.error
                        ? "password-error password-hint"
                        : "password-hint"
                    }
                    onChange={(e) =>
                      setPassword((s) => ({
                        ...s,
                        value: e.target.value,
                        error: s.touched ? validatePassword(e.target.value) : s.error,
                      }))
                    }
                    onBlur={onPasswordBlur}
                    onKeyDown={checkCaps}
                    onKeyUp={checkCaps}
                    className={cn(
                      "h-9 w-full rounded-[var(--radius-sm)] border bg-[var(--color-surface)] px-2.5 pr-9 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none",
                      password.error
                        ? "border-[var(--color-accent)] focus:border-[var(--color-accent)]"
                        : "border-[var(--color-border)] focus:border-[var(--color-border-strong)]",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                  >
                    <span aria-hidden className="relative grid h-[13px] w-[13px] place-items-center">
                      <Eye
                        size={13}
                        strokeWidth={1.6}
                        className="absolute inset-0 transition-opacity duration-[120ms] ease-out"
                        style={{ opacity: showPw ? 0 : 1 }}
                      />
                      <EyeOff
                        size={13}
                        strokeWidth={1.6}
                        className="absolute inset-0 transition-opacity duration-[120ms] ease-out"
                        style={{ opacity: showPw ? 1 : 0 }}
                      />
                    </span>
                  </button>
                </div>
                {/* Hint region — fixed min-height; opacity-only crossfade
                    between caps-on / requirements / error so layout doesn't
                    shift. The persistent "at least 6 characters" line stays
                    quiet until caps-on or an error replaces it. */}
                <div
                  className="mt-1 min-h-[16px]"
                  style={{ position: "relative" }}
                >
                  {password.error ? (
                    <FieldError id="password-error">{password.error}</FieldError>
                  ) : (
                    <p
                      id="password-hint"
                      className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] transition-opacity duration-[120ms] ease-out"
                      style={{ opacity: 1 }}
                    >
                      {capsOn ? "caps lock on" : "at least 6 characters"}
                    </p>
                  )}
                </div>
              </Field>

              <button
                type="submit"
                disabled={submitDisabled}
                aria-busy={submit === "loading"}
                className={cn(
                  "mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-sm font-medium",
                  "bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
                  "border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)]",
                  "transition-[transform,border-color,opacity] duration-[120ms] ease-out",
                  "hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)]",
                  "active:translate-y-px",
                  "disabled:opacity-90 disabled:active:translate-y-0",
                )}
              >
                {/* Crossfade label spans rather than a hard text swap. The
                    visible label is rendered three times stacked; only the
                    active one fades in. aria-live region carries the same
                    text for screen readers. */}
                <span className="relative inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-flex items-center gap-1.5 transition-opacity duration-[120ms] ease-out"
                    style={{ opacity: submit === "loading" ? 1 : 0, position: submit === "loading" ? "static" : "absolute", inset: 0, justifyContent: "center" }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 animate-live-pulse rounded-full"
                      style={{ background: "var(--color-accent-2)" }}
                    />
                    Signing in
                  </span>
                  <span
                    aria-hidden
                    className="inline-flex items-center gap-1.5 transition-opacity duration-[120ms] ease-out"
                    style={{ opacity: submit === "success" ? 1 : 0, position: submit === "success" ? "static" : "absolute", inset: 0, justifyContent: "center" }}
                  >
                    Welcome back
                    <span
                      ref={arrowRef}
                      className="inline-flex"
                      style={{ transform: "translateY(0)" }}
                    >
                      <ArrowUp size={13} strokeWidth={1.8} />
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="inline-flex items-center transition-opacity duration-[120ms] ease-out"
                    style={{ opacity: submit === "idle" || submit === "error" ? 1 : 0, position: submit === "idle" || submit === "error" ? "static" : "absolute", inset: 0, justifyContent: "center" }}
                  >
                    Continue
                  </span>
                  {/* aria-live: ONE single source of truth for the label */}
                  <span aria-live="polite" className="sr-only">
                    {submitLabel}
                  </span>
                </span>
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              <span className="h-px flex-1 bg-[var(--color-border)]" />
              or
              <span className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            <button
              type="button"
              onClick={onOAuth}
              disabled={oauthLoading}
              aria-busy={oauthLoading}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm hover:border-[var(--color-border-strong)] disabled:opacity-90"
            >
              {oauthLoading ? (
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 animate-live-pulse rounded-full"
                  style={{ background: "var(--color-accent-2)" }}
                />
              ) : (
                <GithubIcon size={14} />
              )}
              Continue with GitHub
            </button>

            <p className="mt-8 text-center text-[11px] text-[var(--color-text-muted)]">
              By continuing you agree to our{" "}
              <a href="#" className="link">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="link">
                Privacy Policy
              </a>
              .
            </p>

            {/* sr-only success announcement */}
            <span aria-live="polite" className="sr-only">
              {successAnnounce}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function LockoutBanner({ onDismiss }: { onDismiss: () => void }) {
  // 200ms paper-ease in via mount transition; 120ms ease-out on dismiss.
  const [shown, setShown] = useState(true);
  useEffect(() => {
    // initial appear handled by data-mounted reset; stay shown.
    setShown(true);
  }, []);
  function handleDismiss() {
    setShown(false);
    window.setTimeout(onDismiss, 120);
  }
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_8%,var(--color-surface))] px-3 py-2"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(-4px)",
        transition: shown
          ? `opacity 200ms ${PAPER_EASE}, transform 200ms ${PAPER_EASE}`
          : `opacity 120ms ease-in, transform 120ms ease-in`,
      }}
    >
      <span
        aria-hidden
        className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: "var(--color-accent)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
          too many attempts
        </div>
        <div className="mt-0.5 text-[12px] text-[var(--color-text)]">
          Check your details, or reset your password to continue.
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        ×
      </button>
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
