"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Pencil } from "lucide-react";
import { FieldError } from "@/components/_kit/field-error";
import { cn } from "@/lib/cn";

/**
 * Onboarding accordion — three-step set-up stacked vertically.
 *
 * Interactivity pass:
 *  - Field-level validation per step (FieldError); first invalid focus on
 *    Save & continue; aria-invalid + aria-describedby coordinated.
 *  - 200ms loading state on Save & continue before advancing.
 *  - Form values lifted to parent state, persisted across steps and to
 *    localStorage. Future-step preview inputs are disabled previews; if
 *    the user has past-edited and come back, real values are pre-filled.
 *  - "editing previous step" pill appears at top while a done step is open.
 *  - Final step's Save → `complete` state with cross-fade summary.
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;
const STORAGE_KEY = "stipple.onboarding";

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
    const lines = values.invite.emails
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const bad = lines.find((l) => !EMAIL_RE.test(l));
    if (bad) e["invite.emails"] = `"${bad}" is not a valid email.`;
  }
  return e;
}

function summary(step: StepKey, v: Values): string {
  if (step === "account") return `${v.account.name} · ${v.account.email}`;
  if (step === "workspace")
    return `${v.workspace.name} · stipple.lab/${v.workspace.slug}`;
  const lines = v.invite.emails
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
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

  // Hydrate from localStorage once
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setValues((v) => ({ ...v, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      /* ignore */
    }
  }, [values]);

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
      // Focus first invalid input.
      const firstKey = Object.keys(errs)[0];
      const id = `f-${firstKey.replace(".", "-")}`;
      const el = document.getElementById(id);
      if (el && "focus" in el) (el as HTMLElement).focus();
      return;
    }
    setSavingStep(stepKey);
    setTimeout(() => {
      setSavingStep(null);
      const idx = ORDER.indexOf(stepKey);
      const next = ORDER[idx + 1];
      // Bump furthest if advancing
      if (idx + 1 > furthestIdx) {
        const newFurthest = next ?? stepKey;
        setFurthest(newFurthest);
      }
      if (next) {
        setActive(next);
        setEditingPrior(false);
      } else {
        // Final step → complete state
        setComplete(true);
        setEditingPrior(false);
      }
    }, 200);
  }

  if (complete) {
    return <CompleteSummary values={values} onReset={() => setComplete(false)} />;
  }

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex h-full w-full max-w-[460px] flex-col px-6 py-9">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Three steps · take your time
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
        className="w-full max-w-[460px] px-6"
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
            {stepKey === "account" && (
              <AccountStep values={values} setValues={setValues} errors={errors} disabled={false} />
            )}
            {stepKey === "workspace" && (
              <WorkspaceStep values={values} setValues={setValues} errors={errors} disabled={false} />
            )}
            {stepKey === "invite" && (
              <InviteStep values={values} setValues={setValues} errors={errors} disabled={false} />
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onContinue}
                disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-[13px] text-[var(--color-accent-fg)] transition-[transform,border-color,opacity] duration-[120ms] ease-out hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px disabled:opacity-90 disabled:active:translate-y-0"
              >
                {saving ? (
                  <>
                    <span
                      aria-hidden
                      className="inline-block h-1.5 w-1.5 animate-live-pulse rounded-full"
                      style={{ background: "var(--color-accent-2)" }}
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    Save &amp; continue
                    <ArrowRight size={13} strokeWidth={1.8} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {status === "future" && (
        <div className="border-t border-[var(--color-border)] px-4 py-4">
          {stepKey === "account" && (
            <AccountStep values={values} setValues={setValues} errors={{}} disabled />
          )}
          {stepKey === "workspace" && (
            <WorkspaceStep values={values} setValues={setValues} errors={{}} disabled />
          )}
          {stepKey === "invite" && (
            <InviteStep values={values} setValues={setValues} errors={{}} disabled />
          )}
        </div>
      )}
    </li>
  );
}

function StatusGlyph({
  status,
  index,
}: {
  status: "done" | "active" | "future";
  index: number;
}) {
  if (status === "future") {
    return (
      <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] font-mono text-[12px] text-[var(--color-text-muted)] ring-2 ring-[var(--color-bg)]">
        {index}
      </span>
    );
  }
  const isDone = status === "done";
  return (
    <span
      className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[12px] text-[var(--color-accent-fg)] ring-2 ring-[var(--color-bg)] transition-[background-color] duration-[200ms] ease-out"
      style={{
        backgroundColor: isDone ? "var(--color-accent-2)" : "var(--color-accent)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 grid place-items-center transition-opacity duration-[200ms] ease-out"
        style={{ opacity: isDone ? 1 : 0 }}
      >
        <Check size={13} strokeWidth={2} />
      </span>
      <span
        aria-hidden={isDone}
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

type StepProps = {
  values: Values;
  setValues: React.Dispatch<React.SetStateAction<Values>>;
  errors: Errors;
  disabled: boolean;
};

// Disabled previews mustn't share input ids with the active step — that would
// duplicate ids in the DOM (invalid HTML; breaks aria-describedby targeting).
function fieldId(key: string, disabled: boolean): string {
  return `f-${key}${disabled ? "-preview" : ""}`;
}

function AccountStep({ values, setValues, errors, disabled }: StepProps) {
  const nameId = fieldId("account-name", disabled);
  const emailId = fieldId("account-email", disabled);
  return (
    <>
      <Field label="Full name" htmlFor={nameId} error={errors["account.name"]}>
        <input
          id={nameId}
          disabled={disabled}
          aria-invalid={Boolean(errors["account.name"])}
          aria-describedby={errors["account.name"] ? `${nameId}-error` : undefined}
          value={values.account.name}
          onChange={(e) =>
            setValues((v) => ({ ...v, account: { ...v.account, name: e.target.value } }))
          }
          className={inputCls(Boolean(errors["account.name"]))}
          placeholder="Mara Reyes"
        />
      </Field>
      <Field label="Work email" htmlFor={emailId} error={errors["account.email"]}>
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
          className={inputCls(Boolean(errors["account.email"]))}
          placeholder="you@company.com"
        />
      </Field>
    </>
  );
}

function WorkspaceStep({ values, setValues, errors, disabled }: StepProps) {
  const slugInvalid = Boolean(errors["workspace.slug"]);
  const nameId = fieldId("workspace-name", disabled);
  const slugId = fieldId("workspace-slug", disabled);
  return (
    <>
      <Field label="Workspace name" htmlFor={nameId} error={errors["workspace.name"]}>
        <input
          id={nameId}
          disabled={disabled}
          aria-invalid={Boolean(errors["workspace.name"])}
          aria-describedby={errors["workspace.name"] ? `${nameId}-error` : undefined}
          value={values.workspace.name}
          onChange={(e) =>
            setValues((v) => ({ ...v, workspace: { ...v.workspace, name: e.target.value } }))
          }
          className={inputCls(Boolean(errors["workspace.name"]))}
        />
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
        <div
          className={cn(
            "mt-1.5 flex h-9 items-stretch overflow-hidden rounded-[var(--radius-sm)] border bg-[var(--color-bg)]",
            slugInvalid
              ? "border-[var(--color-accent)] focus-within:border-[var(--color-accent)]"
              : "border-[var(--color-border)] focus-within:border-[var(--color-border-strong)]",
          )}
        >
          <span className="inline-flex items-center bg-[var(--color-surface-2)] px-2.5 font-mono text-[12px] text-[var(--color-text-muted)]">
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
            className="h-full flex-1 bg-transparent px-2.5 text-sm focus:outline-none disabled:opacity-70"
          />
        </div>
      </Field>
    </>
  );
}

function InviteStep({ values, setValues, errors, disabled }: StepProps) {
  const emailsId = fieldId("invite-emails", disabled);
  return (
    <Field
      label="Teammate emails"
      htmlFor={emailsId}
      hint="One per line."
      error={errors["invite.emails"]}
    >
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
          "mt-1.5 block w-full resize-y rounded-[var(--radius-sm)] border bg-[var(--color-bg)] px-2.5 py-2 font-mono text-[13px] focus:outline-none disabled:opacity-70",
          errors["invite.emails"]
            ? "border-[var(--color-accent)] focus:border-[var(--color-accent)]"
            : "border-[var(--color-border)] focus:border-[var(--color-border-strong)]",
        )}
      />
    </Field>
  );
}
