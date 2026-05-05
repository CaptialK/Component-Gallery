"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Pencil } from "lucide-react";
import { ErrorState } from "@/components/_kit/error-state";
import { FieldError } from "@/components/_kit/field-error";
import { Modal, ModalClose, ModalDescription, ModalTitle } from "@/components/_kit/modal";
import { Skeleton } from "@/components/_kit/skeleton";
import { cn } from "@/lib/cn";

/**
 * Onboarding accordion — three-step set-up stacked vertically.
 *
 * Refinement pass adds:
 *  - Hydration skeletons: localStorage hydration is async w.r.t. mount;
 *    until `hydrated` flips true, inputs render as blue-noise skeletons
 *    so the brief INITIAL_VALUES flash is suppressed. Crossfade to real
 *    inputs over 200ms paper-ease.
 *  - Reset affordance + confirm modal: header carries a mono-caps "reset"
 *    link. Confirming clears values to empty strings (the empty-state
 *    pose). Modal is the system primitive.
 *  - Banner ErrorState on submit failure of the final step (10% sim).
 *  - Tighter padding < 420px; slug prefix wraps below input on narrow.
 *  - A11y: future-step preview blocks are aria-hidden, StatusGlyph carries
 *    descriptive aria-label, active section header is aria-current, save
 *    button text wraps in aria-live polite.
 *  - Polish: opacity-crossfade label swap, future→active disabled fade.
 *  - Invite split now accepts \n , and ; delimiters; dedupes.
 */

type StepKey = "account" | "workspace" | "invite";
const ORDER: StepKey[] = ["account", "workspace", "invite"];
const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const TITLES: Record<StepKey, string> = {
  account: "Create your account",
  workspace: "Name your workspace",
  invite: "Invite your team",
};
const PREVIEWS: Record<StepKey, string> = {
  account: "Name, work email, password.",
  workspace: "Workspace name, URL slug.",
  invite: "Teammate emails — magic-link invites.",
};

type Values = {
  account: { name: string; email: string };
  workspace: { name: string; slug: string };
  invite: { emails: string };
};

type Errors = Partial<{
  "account.name": string;
  "account.email": string;
  "workspace.name": string;
  "workspace.slug": string;
  "invite.emails": string;
}>;

const INITIAL_VALUES: Values = {
  account: { name: "Mara Reyes", email: "mara@stipple.lab" },
  workspace: { name: "Stipple Press", slug: "stipple-press" },
  invite: { emails: "" },
};

const EMPTY_VALUES: Values = {
  account: { name: "", email: "" },
  workspace: { name: "", slug: "" },
  invite: { emails: "" },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;
const STORAGE_KEY = "stipple.onboarding";

/**
 * Split + dedupe invite emails. Accepts newlines, commas, and semicolons
 * as delimiters; trims each entry and drops empties before deduping.
 */
function parseInviteLines(raw: string): string[] {
  const split = raw
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return Array.from(new Set(split));
}

function validate(step: StepKey, values: Values): Errors {
  const e: Errors = {};
  if (step === "account") {
    if (!values.account.name || values.account.name.trim().length < 2)
      e["account.name"] = "At least 2 characters.";
    if (!EMAIL_RE.test(values.account.email))
      e["account.email"] = "Enter a valid email.";
  } else if (step === "workspace") {
    if (!values.workspace.name.trim())
      e["workspace.name"] = "Required.";
    if (!values.workspace.slug || values.workspace.slug.length < 3)
      e["workspace.slug"] = "At least 3 characters.";
    else if (!SLUG_RE.test(values.workspace.slug))
      e["workspace.slug"] = "Lowercase letters, numbers, and hyphens only.";
  } else if (step === "invite") {
    const lines = parseInviteLines(values.invite.emails);
    const bad = lines.find((l) => !EMAIL_RE.test(l));
    if (bad) e["invite.emails"] = `"${bad}" is not a valid email.`;
  }
  return e;
}

function summary(step: StepKey, v: Values): string {
  if (step === "account") return `${v.account.name} · ${v.account.email}`;
  if (step === "workspace")
    return `${v.workspace.name} · stipple.lab/${v.workspace.slug}`;
  const lines = parseInviteLines(v.invite.emails);
  return lines.length === 0
    ? "No invitations queued"
    : `${lines.length} invitation${lines.length === 1 ? "" : "s"} queued`;
}

export default function OnboardingAccordion() {
  const [active, setActive] = useState<StepKey>("workspace");
  const [values, setValues] = useState<Values>(INITIAL_VALUES);
  const [furthest, setFurthest] = useState<StepKey>("workspace");
  const [errors, setErrors] = useState<Errors>({});
  const [savingStep, setSavingStep] = useState<StepKey | null>(null);
  const [editingPrior, setEditingPrior] = useState(false);
  const [complete, setComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  // Failure simulator: deterministic across retries to avoid a stuck
  // failure if the simulator keeps rolling fail.
  const submitAttemptRef = useRef(0);

  // Hydrate from localStorage once. Always flip `hydrated` true on the
  // same tick so the skeleton-to-real input crossfade lands even when
  // there's nothing in storage.
  useEffect(() => {
    if (typeof window === "undefined") {
      setHydrated(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setValues((v) => ({ ...v, ...parsed }));
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist on change — only after hydration to avoid clobbering stored
  // values with INITIAL_VALUES on first render.
  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      /* ignore */
    }
  }, [values, hydrated]);

  const activeIdx = ORDER.indexOf(active);
  const furthestIdx = ORDER.indexOf(furthest);

  function setActiveStep(key: StepKey) {
    setActive(key);
    const idx = ORDER.indexOf(key);
    setEditingPrior(idx < furthestIdx);
  }

  function onContinue(stepKey: StepKey) {
    const errs = validate(stepKey, values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      const id = `f-${firstKey.replace(".", "-")}`;
      const el = document.getElementById(id);
      if (el && "focus" in el) (el as HTMLElement).focus();
      return;
    }
    setSavingStep(stepKey);
    setSubmitError(false);
    setTimeout(() => {
      setSavingStep(null);
      const idx = ORDER.indexOf(stepKey);
      const next = ORDER[idx + 1];
      // Final step submission can fail (10%); subsequent retries succeed.
      if (!next) {
        const attempt = submitAttemptRef.current++;
        const willFail = attempt === 0 && Math.random() < 0.1;
        if (willFail) {
          setSubmitError(true);
          return;
        }
        setComplete(true);
        setEditingPrior(false);
        submitAttemptRef.current = 0;
        return;
      }
      if (idx + 1 > furthestIdx) {
        const newFurthest = next ?? stepKey;
        setFurthest(newFurthest);
      }
      setActive(next);
      setEditingPrior(false);
    }, 200);
  }

  function performReset() {
    setValues(EMPTY_VALUES);
    setErrors({});
    setActive("account");
    setFurthest("account");
    setEditingPrior(false);
    setComplete(false);
    setSubmitError(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    setConfirmReset(false);
  }

  if (complete) {
    return <CompleteSummary values={values} onReset={() => setComplete(false)} />;
  }

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex h-full w-full max-w-[460px] flex-col px-4 py-6 min-[420px]:px-6 min-[420px]:py-9">
        <header>
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Three steps · take your time
            </div>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] transition-colors duration-[120ms] ease-out hover:text-[var(--color-text)]"
            >
              reset · start fresh
            </button>
          </div>
          <h1
            className="mt-2 font-display text-[26px] leading-tight tracking-[-0.022em] text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            Set up your workspace.
          </h1>
        </header>

        {editingPrior && (
          <div
            className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]"
          >
            <span
              aria-hidden
              className="block h-1 w-1 rounded-full"
              style={{ background: "var(--color-accent-2)" }}
            />
            editing previous step
          </div>
        )}

        <ol className="mt-8 space-y-3">
          {ORDER.map((key, i) => {
            const status: "done" | "active" | "future" =
              i < furthestIdx && i !== activeIdx
                ? "done"
                : i === activeIdx
                  ? "active"
                  : "future";
            return (
              <Section
                key={key}
                index={i + 1}
                stepKey={key}
                status={status}
                values={values}
                setValues={setValues}
                errors={errors}
                saving={savingStep === key}
                hydrated={hydrated}
                showError={status === "active" && submitError}
                onRetry={() => onContinue(key)}
                onEdit={() => setActiveStep(key)}
                onContinue={() => onContinue(key)}
              />
            );
          })}
        </ol>

        <p
          className="mt-auto pt-8 text-[11px] italic text-[var(--color-text-muted)]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariationSettings: '"opsz" 18, "SOFT" 30',
          }}
        >
          You can change anything later from workspace settings.
        </p>
      </div>

      <Modal
        open={confirmReset}
        onOpenChange={(open) => {
          if (!open) setConfirmReset(false);
        }}
        placement="center"
        size="sm"
        ariaLabel="Reset onboarding values"
      >
        <div className="px-4 py-4">
          <ModalTitle
            render={
              <h2
                className="font-display text-[18px] italic leading-none tracking-[-0.02em] text-[var(--color-text)]"
                style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
              >
                Reset onboarding?
              </h2>
            }
          />
          <ModalDescription
            render={
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                This clears every field and removes the saved draft. You'll
                start from a blank account step.
              </p>
            }
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
              onClick={performReset}
              className="inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[var(--color-accent)] px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent-fg)] transition-[border-color] duration-[120ms] ease-out hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)]"
            >
              Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CompleteSummary({
  values,
  onReset,
}: {
  values: Values;
  onReset: () => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid h-full w-full place-items-center bg-[var(--color-bg)] text-[var(--color-text)]">
      <div
        className="w-full max-w-[460px] px-4 min-[420px]:px-6"
        style={{
          opacity: shown ? 1 : 0,
          transition: `opacity 200ms ${PAPER_EASE}`,
        }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          Done
        </div>
        <h1
          className="mt-2 font-display text-[28px] italic leading-tight tracking-[-0.022em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30' }}
        >
          Workspace ready.
        </h1>

        <ol className="mt-6 space-y-2">
          {ORDER.map((k) => (
            <li
              key={k}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
            >
              <span
                className="grid h-6 w-6 place-items-center rounded-full text-[var(--color-accent-fg)] ring-2 ring-[var(--color-bg)]"
                style={{ background: "var(--color-accent-2)" }}
              >
                <Check size={12} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px]">{TITLES[k]}</div>
                <div className="truncate text-[11.5px] text-[var(--color-text-muted)]">
                  {summary(k, values)}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-[13px] text-[var(--color-accent-fg)] transition-[transform,border-color] duration-[120ms] ease-out hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px"
          >
            Open workspace
            <ArrowRight size={13} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onReset}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            edit again
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  index,
  stepKey,
  status,
  values,
  setValues,
  errors,
  saving,
  hydrated,
  showError,
  onRetry,
  onEdit,
  onContinue,
}: {
  index: number;
  stepKey: StepKey;
  status: "done" | "active" | "future";
  values: Values;
  setValues: React.Dispatch<React.SetStateAction<Values>>;
  errors: Errors;
  saving: boolean;
  hydrated: boolean;
  showError: boolean;
  onRetry: () => void;
  onEdit: () => void;
  onContinue: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-[var(--radius-md)] border bg-[var(--color-surface)] transition-colors",
        status === "active"
          ? "border-[var(--color-border-strong)]"
          : "border-[var(--color-border)]",
        status === "future" && "opacity-55",
      )}
      aria-current={status === "active" ? "step" : undefined}
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <StatusGlyph status={status} index={index} />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "truncate text-[14px]",
              status === "active"
                ? "font-medium text-[var(--color-text)]"
                : "text-[var(--color-text)]",
            )}
          >
            {TITLES[stepKey]}
          </div>
          {status === "done" && (
            <div className="mt-0.5 truncate text-[11.5px] text-[var(--color-text-muted)]">
              {summary(stepKey, values)}
            </div>
          )}
          {status === "future" && (
            <div className="mt-0.5 truncate text-[11.5px] italic text-[var(--color-text-muted)]"
              style={{ fontFamily: "var(--font-display)", fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
            >
              {PREVIEWS[stepKey]}
            </div>
          )}
        </div>
        {status === "done" && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-xs)] px-2 text-[11px] text-[var(--color-text-muted)] transition-colors duration-[120ms] ease-out hover:text-[var(--color-text)]"
          >
            <Pencil size={11} strokeWidth={1.6} />
            Edit
          </button>
        )}
      </header>

      <div
        className="grid overflow-hidden transition-[grid-template-rows] duration-[200ms]"
        style={{
          gridTemplateRows: status === "active" ? "1fr" : "0fr",
          transitionTimingFunction: PAPER_EASE,
        }}
        aria-hidden={status !== "active"}
      >
        <div
          className="min-h-0 transition-opacity duration-[200ms]"
          style={{
            opacity: status === "active" ? 1 : 0,
            transitionTimingFunction: PAPER_EASE,
          }}
        >
          <div className="border-t border-[var(--color-border)] px-4 py-4">
            {showError && (
              <div className="mb-3">
                <ErrorState
                  variant="banner"
                  title="Couldn't save. Retry."
                  onRetry={onRetry}
                />
              </div>
            )}
            <StepBody
              stepKey={stepKey}
              values={values}
              setValues={setValues}
              errors={errors}
              disabled={false}
              hydrated={hydrated}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onContinue}
                disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-[13px] text-[var(--color-accent-fg)] transition-[transform,border-color,opacity] duration-[120ms] ease-out hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px disabled:opacity-90 disabled:active:translate-y-0"
              >
                {saving && (
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 animate-live-pulse rounded-full"
                    style={{ background: "var(--color-accent-2)" }}
                  />
                )}
                <span
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5"
                  style={{
                    transition: `opacity 120ms ${PAPER_EASE}`,
                  }}
                  key={saving ? "saving" : "idle"}
                >
                  {saving ? (
                    "Saving…"
                  ) : (
                    <>
                      Save &amp; continue
                      <ArrowRight size={13} strokeWidth={1.8} />
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {status === "future" && (
        <div
          className="border-t border-[var(--color-border)] px-4 py-4 transition-opacity duration-[200ms] ease-out"
          aria-hidden="true"
        >
          <StepBody
            stepKey={stepKey}
            values={values}
            setValues={setValues}
            errors={{}}
            disabled
            hydrated={hydrated}
          />
        </div>
      )}
    </li>
  );
}

function StepBody({
  stepKey,
  values,
  setValues,
  errors,
  disabled,
  hydrated,
}: StepProps & { stepKey: StepKey }) {
  if (stepKey === "account")
    return <AccountStep values={values} setValues={setValues} errors={errors} disabled={disabled} hydrated={hydrated} />;
  if (stepKey === "workspace")
    return <WorkspaceStep values={values} setValues={setValues} errors={errors} disabled={disabled} hydrated={hydrated} />;
  return <InviteStep values={values} setValues={setValues} errors={errors} disabled={disabled} hydrated={hydrated} />;
}

function StatusGlyph({
  status,
  index,
}: {
  status: "done" | "active" | "future";
  index: number;
}) {
  const label =
    status === "done"
      ? `step ${index}, complete`
      : status === "active"
        ? `step ${index}, current`
        : `step ${index}, upcoming`;
  if (status === "future") {
    return (
      <span
        aria-label={label}
        role="img"
        className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] font-mono text-[12px] text-[var(--color-text-muted)] ring-2 ring-[var(--color-bg)]"
      >
        <span aria-hidden="true">{index}</span>
      </span>
    );
  }
  const isDone = status === "done";
  return (
    <span
      aria-label={label}
      role="img"
      className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[12px] text-[var(--color-accent-fg)] ring-2 ring-[var(--color-bg)] transition-[background-color] duration-[200ms] ease-out"
      style={{
        backgroundColor: isDone ? "var(--color-accent-2)" : "var(--color-accent)",
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center transition-opacity duration-[200ms] ease-out"
        style={{ opacity: isDone ? 1 : 0 }}
      >
        <Check size={13} strokeWidth={2} />
      </span>
      <span
        aria-hidden="true"
        className="transition-opacity duration-[200ms] ease-out"
        style={{ opacity: isDone ? 0 : 1 }}
      >
        {index}
      </span>
    </span>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <label
        htmlFor={htmlFor}
        className="block text-[12px] font-medium text-[var(--color-text)]"
      >
        {label}
      </label>
      {children}
      {error ? (
        <FieldError id={`${htmlFor}-error`}>{error}</FieldError>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function inputCls(invalid: boolean) {
  return cn(
    "mt-1.5 h-9 w-full rounded-[var(--radius-sm)] border bg-[var(--color-bg)] px-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none disabled:opacity-70",
    invalid
      ? "border-[var(--color-accent)] focus:border-[var(--color-accent)]"
      : "border-[var(--color-border)] focus:border-[var(--color-border-strong)]",
  );
}

/**
 * Wraps a real input in a 200ms paper-ease crossfade against a Skeleton.
 * Until `hydrated`, the Skeleton is visible at full opacity; once true,
 * the input fades in. Both elements share the same h-9 box; the skeleton
 * sits absolutely-positioned on top so the input lays out the row.
 */
function HydratedField({
  hydrated,
  height = 36,
  children,
}: {
  hydrated: boolean;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mt-1.5" style={{ minHeight: height }}>
      <div
        style={{
          opacity: hydrated ? 1 : 0,
          transition: `opacity 200ms ${PAPER_EASE}`,
        }}
      >
        {children}
      </div>
      {!hydrated && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]"
          style={{
            opacity: hydrated ? 0 : 1,
            transition: `opacity 200ms ${PAPER_EASE}`,
          }}
        >
          <Skeleton width={420} height={height} density={0.04} />
        </div>
      )}
    </div>
  );
}

type StepProps = {
  values: Values;
  setValues: React.Dispatch<React.SetStateAction<Values>>;
  errors: Errors;
  disabled: boolean;
  hydrated: boolean;
};

// Disabled previews mustn't share input ids with the active step — that would
// duplicate ids in the DOM (invalid HTML; breaks aria-describedby targeting).
function fieldId(key: string, disabled: boolean): string {
  return `f-${key}${disabled ? "-preview" : ""}`;
}

// Inputs in the HydratedField wrapper need their own top margin reset
// since the wrapper supplies the mt-1.5; otherwise the input doubles up.
const inputClsHydrated = (invalid: boolean) =>
  cn(inputCls(invalid), "mt-0");

function AccountStep({ values, setValues, errors, disabled, hydrated }: StepProps) {
  const nameId = fieldId("account-name", disabled);
  const emailId = fieldId("account-email", disabled);
  return (
    <>
      <Field label="Full name" htmlFor={nameId} error={errors["account.name"]}>
        <HydratedField hydrated={disabled ? true : hydrated}>
          <input
            id={nameId}
            disabled={disabled}
            aria-invalid={Boolean(errors["account.name"])}
            aria-describedby={errors["account.name"] ? `${nameId}-error` : undefined}
            value={values.account.name}
            onChange={(e) =>
              setValues((v) => ({ ...v, account: { ...v.account, name: e.target.value } }))
            }
            className={inputClsHydrated(Boolean(errors["account.name"]))}
            placeholder="Mara Reyes"
          />
        </HydratedField>
      </Field>
      <Field label="Work email" htmlFor={emailId} error={errors["account.email"]}>
        <HydratedField hydrated={disabled ? true : hydrated}>
          <input
            id={emailId}
            type="email"
            disabled={disabled}
            aria-invalid={Boolean(errors["account.email"])}
            aria-describedby={errors["account.email"] ? `${emailId}-error` : undefined}
            value={values.account.email}
            onChange={(e) =>
              setValues((v) => ({ ...v, account: { ...v.account, email: e.target.value } }))
            }
            className={inputClsHydrated(Boolean(errors["account.email"]))}
            placeholder="you@company.com"
          />
        </HydratedField>
      </Field>
    </>
  );
}

function WorkspaceStep({ values, setValues, errors, disabled, hydrated }: StepProps) {
  const slugInvalid = Boolean(errors["workspace.slug"]);
  const nameId = fieldId("workspace-name", disabled);
  const slugId = fieldId("workspace-slug", disabled);
  return (
    <>
      <Field label="Workspace name" htmlFor={nameId} error={errors["workspace.name"]}>
        <HydratedField hydrated={disabled ? true : hydrated}>
          <input
            id={nameId}
            disabled={disabled}
            aria-invalid={Boolean(errors["workspace.name"])}
            aria-describedby={errors["workspace.name"] ? `${nameId}-error` : undefined}
            value={values.workspace.name}
            onChange={(e) =>
              setValues((v) => ({ ...v, workspace: { ...v.workspace, name: e.target.value } }))
            }
            className={inputClsHydrated(Boolean(errors["workspace.name"]))}
          />
        </HydratedField>
      </Field>
      <Field
        label="URL slug"
        htmlFor={slugId}
        hint={
          values.workspace.slug
            ? `stipple.lab/${values.workspace.slug}`
            : "Used in invite links and integrations."
        }
        error={errors["workspace.slug"]}
      >
        <HydratedField hydrated={disabled ? true : hydrated}>
          <div
            className={cn(
              "flex h-9 items-stretch overflow-hidden rounded-[var(--radius-sm)] border bg-[var(--color-bg)] max-[420px]:h-auto max-[420px]:flex-col max-[420px]:items-stretch",
              slugInvalid
                ? "border-[var(--color-accent)] focus-within:border-[var(--color-accent)]"
                : "border-[var(--color-border)] focus-within:border-[var(--color-border-strong)]",
            )}
          >
            <span
              className="inline-flex max-w-[120px] items-center truncate bg-[var(--color-surface-2)] px-2.5 font-mono text-[12px] text-[var(--color-text-muted)] max-[420px]:max-w-none max-[420px]:border-b max-[420px]:border-[var(--color-border)] max-[420px]:py-1.5"
              title="stipple.lab/"
            >
              stipple.lab/
            </span>
            <input
              id={slugId}
              disabled={disabled}
              aria-invalid={slugInvalid}
              aria-describedby={slugInvalid ? `${slugId}-error` : undefined}
              value={values.workspace.slug}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  workspace: { ...v.workspace, slug: e.target.value },
                }))
              }
              className="h-9 flex-1 bg-transparent px-2.5 text-sm focus:outline-none disabled:opacity-70"
            />
          </div>
        </HydratedField>
      </Field>
    </>
  );
}

function InviteStep({ values, setValues, errors, disabled, hydrated }: StepProps) {
  const emailsId = fieldId("invite-emails", disabled);
  return (
    <Field
      label="Teammate emails"
      htmlFor={emailsId}
      hint="One per line — commas and semicolons also work."
      error={errors["invite.emails"]}
    >
      <HydratedField hydrated={disabled ? true : hydrated} height={84}>
        <textarea
          id={emailsId}
          rows={3}
          disabled={disabled}
          aria-invalid={Boolean(errors["invite.emails"])}
          aria-describedby={errors["invite.emails"] ? `${emailsId}-error` : undefined}
          value={values.invite.emails}
          onChange={(e) =>
            setValues((v) => ({ ...v, invite: { emails: e.target.value } }))
          }
          className={cn(
            "block w-full resize-y rounded-[var(--radius-sm)] border bg-[var(--color-bg)] px-2.5 py-2 font-mono text-[13px] focus:outline-none disabled:opacity-70",
            errors["invite.emails"]
              ? "border-[var(--color-accent)] focus:border-[var(--color-accent)]"
              : "border-[var(--color-border)] focus:border-[var(--color-border-strong)]",
          )}
        />
      </HydratedField>
    </Field>
  );
}
