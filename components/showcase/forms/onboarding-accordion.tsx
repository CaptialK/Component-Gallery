"use client";

import { useState } from "react";
import { ArrowRight, Check, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Onboarding accordion — same three-step set-up as the wizard, stacked
 * vertically with all sections visible at once. Completed steps collapse
 * to a single line plus an Edit affordance; the active step is fully
 * open; future steps are dimmed and locked.
 *
 * Dot+line commitments specific to this plate:
 *  - Reading direction is top-to-bottom; the page reads as a typeset
 *    document — done above, doing now in the middle, doing-next below.
 *  - Section status is encoded by glyph (Federal Blue check / walnut
 *    filled dot / dim hollow ring) and by ink level — no colour-only.
 *  - The active section's "Continue" button lives inside the section,
 *    not as a global footer. The chrome reads as one form-document
 *    rather than a wizard with separate panes.
 *  - All form chrome inherits the global Spike-1 focus halo; no
 *    per-input dot decoration.
 *
 * Client component (uses local state for the active step). Default to
 * step 2 — step 1 is shown completed with its summary, step 2 is the
 * active form, step 3 is the dimmed future state.
 */

type StepKey = "account" | "workspace" | "invite";

const ORDER: StepKey[] = ["account", "workspace", "invite"];

const TITLES: Record<StepKey, string> = {
  account: "Create your account",
  workspace: "Name your workspace",
  invite: "Invite your team",
};

const SUMMARIES: Record<StepKey, string> = {
  account: "Mara Reyes · mara@stipple.lab",
  workspace: "Stipple Press · stipple.lab/stipple-press",
  invite: "3 invitations queued",
};

/** Hint text shown for steps that haven't started yet — gives a peek at
 *  what's coming so the future state isn't a black box. */
const PREVIEWS: Record<StepKey, string> = {
  account: "Name, work email, password.",
  workspace: "Workspace name, URL slug.",
  invite: "Teammate emails — magic-link invites.",
};

export default function OnboardingAccordion() {
  const [active, setActive] = useState<StepKey>("workspace");
  const activeIdx = ORDER.indexOf(active);

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto flex h-full w-full max-w-[460px] flex-col px-6 py-9">
        {/* Header */}
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

        <ol className="mt-8 space-y-3">
          {ORDER.map((key, i) => {
            const status =
              i < activeIdx ? "done" : i === activeIdx ? "active" : "future";
            return (
              <Section
                key={key}
                index={i + 1}
                stepKey={key}
                status={status}
                onEdit={() => setActive(key)}
                onContinue={() => {
                  const next = ORDER[i + 1];
                  if (next) setActive(next);
                }}
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

function Section({
  index,
  stepKey,
  status,
  onEdit,
  onContinue,
}: {
  index: number;
  stepKey: StepKey;
  status: "done" | "active" | "future";
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
              {SUMMARIES[stepKey]}
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

      {/* Active body — gated via grid-template-rows 0fr↔1fr so opening/closing
          is a pure-CSS height transition, no JS measuring. */}
      <div
        className="grid overflow-hidden transition-[grid-template-rows] duration-[200ms]"
        style={{
          gridTemplateRows: status === "active" ? "1fr" : "0fr",
          transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        aria-hidden={status !== "active"}
      >
        <div
          className="min-h-0 transition-opacity duration-[200ms]"
          style={{
            opacity: status === "active" ? 1 : 0,
            transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          <div className="border-t border-[var(--color-border)] px-4 py-4">
            {stepKey === "account" && <AccountStep />}
            {stepKey === "workspace" && <WorkspaceStep />}
            {stepKey === "invite" && <InviteStep />}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-[13px] text-[var(--color-accent-fg)] transition-[transform,border-color] duration-[120ms] ease-out hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px"
              >
                Save &amp; continue
                <ArrowRight size={13} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Future step — show a dimmed preview of the form so the reader sees
          what's coming, not just a title. Inputs are disabled; the section
          isn't really collapsed, it's just deferred. */}
      {status === "future" && (
        <div className="border-t border-[var(--color-border)] px-4 py-4">
          {stepKey === "account" && <AccountStep />}
          {stepKey === "workspace" && <WorkspaceStep />}
          {stepKey === "invite" && <InviteStep />}
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
  // z-10 + ring matching the surface bg knocks out the connecting thread
  // behind each glyph, so the line reads as "thread connects steps" rather
  // than "line passes through bullets."
  // Future state is structurally distinct (border + bg-bg), so it returns
  // its own element. done↔active share a filled disc element so background
  // colour can transition between persimmon and Federal Blue, with the
  // Check fading in over the same 200ms.
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
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
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
      {hint && (
        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{hint}</p>
      )}
    </div>
  );
}

function input() {
  return "mt-1.5 h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:outline-none";
}

function AccountStep() {
  return (
    <>
      <Field label="Full name" htmlFor="acc-name">
        <input id="acc-name" className={input()} placeholder="Mara Reyes" />
      </Field>
      <Field label="Work email" htmlFor="acc-email">
        <input id="acc-email" type="email" className={input()} placeholder="you@company.com" />
      </Field>
    </>
  );
}

function WorkspaceStep() {
  return (
    <>
      <Field label="Workspace name" htmlFor="ws-name">
        <input id="ws-name" className={input()} defaultValue="Stipple Press" />
      </Field>
      <Field label="URL slug" htmlFor="ws-slug" hint="Used in invite links and integrations.">
        <div className="mt-1.5 flex h-9 items-stretch overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] focus-within:border-[var(--color-border-strong)]">
          <span className="inline-flex items-center bg-[var(--color-surface-2)] px-2.5 font-mono text-[12px] text-[var(--color-text-muted)]">
            stipple.lab/
          </span>
          <input
            id="ws-slug"
            className="h-full flex-1 bg-transparent px-2.5 text-sm focus:outline-none"
            defaultValue="stipple-press"
          />
        </div>
      </Field>
    </>
  );
}

function InviteStep() {
  return (
    <Field label="Teammate emails" htmlFor="inv-emails" hint="One per line.">
      <textarea
        id="inv-emails"
        rows={3}
        className="mt-1.5 block w-full resize-y rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 font-mono text-[13px] focus:border-[var(--color-border-strong)] focus:outline-none"
      />
    </Field>
  );
}
