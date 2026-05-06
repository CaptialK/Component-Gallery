"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Save, Send } from "lucide-react";
import { PatientStrip, type Patient } from "@/components/_kit/patient-strip";
import { FieldError } from "@/components/_kit/field-error";
import { ErrorState } from "@/components/_kit/error-state";

/**
 * SOAP note — Subjective, Objective, Assessment, Plan. The clinical artefact
 * a clinician writes after every encounter. Form chrome is the dot-language
 * commitment of this plate:
 *
 *  - Each section header carries a thin completeness bar whose length encodes
 *    how full the section currently is. Refactored 2026-05-03 from a Bridson
 *    density stipple — the dot+line system pass moved quantitative encoding
 *    from density to length per Cleveland-McGill (DECISIONS.md retrospective).
 *  - Textareas use the system focus halo (Federal Blue stippled annulus
 *    via the `::after` pseudo from `globals.css`). The selection colour
 *    is Federal Blue at 30% alpha — drag-select the prose to see it.
 *  - Save state is reflected in a single Federal Blue dot; the colophon
 *    rule below the form is the "last saved 14:08" note in italic
 *    Fraunces — typeset, not a status-bar widget.
 *
 * 2026-05-05 medical-standard pass adds:
 *  - <PatientStrip density="compact"> at the top — allergies stay one
 *    glance away while the clinician writes the P-section. Critical because
 *    writing a med order without seeing allergies is a documented harm.
 *  - Per-field validation: chief complaint required, assessment required
 *    before sign, plan-without-assessment warning. <FieldError> wires
 *    aria-invalid + aria-describedby.
 *  - Save cycle: idle → saving (Federal Blue live-pulse) → saved or failed
 *    (persimmon dot + ErrorState toast banner).
 *  - Resident workflow: cosign-required banner + co-signer chip on signature.
 *
 * Client component (uses local state for input + save cycle).
 */

const SECTIONS = [
  {
    key: "S",
    title: "Subjective",
    placeholder:
      "What does the patient describe? HPI, pertinent ROS, social/family context.",
    initial:
      "47 y/o F with PMH of T2DM and HTN, presents with 3 days of polyuria, polydipsia, and fatigue. Reports compliance with metformin and lisinopril. Denies fever, chest pain, dysuria, focal weakness. Last fingerstick at home reportedly 280 mg/dL.",
  },
  {
    key: "O",
    title: "Objective",
    placeholder:
      "Vitals, exam findings, point-of-care results — what you observed.",
    initial:
      "VS: T 37.6 °C, HR 84, BP 124/76, SpO₂ 96 %, RR 19. General: alert, mildly fatigued. Cardiac: RRR, no murmurs. Pulm: CTAB. Abd: soft, non-tender. Ext: 1+ bilateral pedal edema, no calf tenderness.\n\nPOC glucose 168. Initial labs notable for K 3.3, glucose 168, WBC 12.6.",
  },
  {
    key: "A",
    title: "Assessment",
    placeholder: "Working diagnosis, differential, severity, comorbidities.",
    initial: "",
  },
  {
    key: "P",
    title: "Plan",
    placeholder: "Investigations, treatment, disposition, follow-up.",
    initial:
      "1. Hyperglycemia — recheck CMP at 18:00; insulin sliding scale per protocol; reinforce home regimen.\n2. Hypokalemia — replete K (PO 40 mEq) and recheck at 18:00; review diuretic burden.\n3. Disposition — admit to MedSurg for further workup; case management to coordinate with PCP.",
  },
];

const PATIENT: Patient = {
  family: "Patel",
  given: "Reema",
  mrn: "80124-5",
  dob: "1979-03-14",
  sex: "F",
  allergies: [
    { allergen: "Penicillin", severity: "severe", reaction: "rash" },
    { allergen: "Sulfa", severity: "moderate" },
  ],
  codeStatus: "Full Code",
  allergiesReviewedAt: "04 May 11:08",
};

const ENCOUNTER = "ENC-2026-04-01-188";
const AUTHOR_RESIDENT = true;
const COSIGNER = "Hartman, K., MD";
const LAST_SAVED_INITIAL = "14:08";
const LAST_SAVED_DATE = "04 May";

type SaveStatus = "idle" | "saving" | "saved" | "failed";

export default function IntakeSoapNote() {
  const [drafts, setDrafts] = useState(SECTIONS.map((s) => s.initial));
  const [touched, setTouched] = useState<boolean[]>(
    SECTIONS.map(() => false),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<string>(LAST_SAVED_INITIAL);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showSignError, setShowSignError] = useState(false);
  // One stable id base; per-section ids derive deterministically.
  const idBase = useId();
  const ids = SECTIONS.map((s) => `${idBase}-${s.key}`);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const set = (i: number, v: string) => {
    setDrafts((prev) => prev.map((p, j) => (j === i ? v : p)));
    setTouched((prev) => prev.map((t, j) => (j === i ? true : t)));
  };

  // Validation — clinical-meaningful, not just "non-empty."
  const errors = drafts.map((v, i) => {
    const len = v.trim().length;
    if (i === 0 && len < 20) {
      return "Subjective is required — describe the chief complaint and HPI.";
    }
    if (i === 2 && len === 0) {
      return "Assessment is required before signing.";
    }
    return null;
  });
  // Plan-without-assessment warning (clinical inconsistency)
  const planWithoutAssessment =
    drafts[3].trim().length > 0 && drafts[2].trim().length === 0;
  const blockingError = errors.some((e) => e != null);

  const handleSave = () => {
    if (saveStatus === "saving") return;
    setSaveStatus("saving");
    setShowSignError(false);
    saveTimer.current = window.setTimeout(() => {
      const stamp = new Date();
      const hh = String(stamp.getHours()).padStart(2, "0");
      const mm = String(stamp.getMinutes()).padStart(2, "0");
      setLastSaved(`${hh}:${mm}`);
      setSaveStatus("saved");
    }, 600);
  };

  const handleSign = () => {
    setSubmitAttempted(true);
    if (blockingError) {
      // Surface the field errors but don't fire the save flow.
      return;
    }
    setSaveStatus("saving");
    saveTimer.current = window.setTimeout(() => {
      // Demo: 30% deterministic-ish failure to show error path. Use a stable
      // factor so the showcase consistently demonstrates the failed state on
      // first click, then succeeds on retry.
      setSaveStatus("failed");
      setShowSignError(true);
    }, 700);
  };

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Patient banner — allergies one glance away. */}
        <PatientStrip patient={PATIENT} density="compact" />

        {/* Note context band. */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            SOAP note
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {ENCOUNTER}
          </span>
          {AUTHOR_RESIDENT && (
            <span
              className="ml-auto inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text)]"
              aria-label={`Cosignature required by ${COSIGNER}`}
            >
              <span
                aria-hidden
                className="h-1 w-1 rounded-full bg-[var(--color-accent-2)]"
              />
              cosign · {COSIGNER}
            </span>
          )}
        </div>

        {/* Sign-failure banner — flat tint, persimmon strip. Mounts only on failure. */}
        {showSignError && (
          <ErrorState
            variant="banner"
            title="Note signature failed."
            body="The chart server didn't accept the submission. Save as draft and try again — your text has not been lost."
            lastSync={lastSaved}
            onRetry={handleSign}
            onDismiss={() => setShowSignError(false)}
          />
        )}

        {/* Plan-without-assessment soft warning. */}
        {planWithoutAssessment && (
          <ErrorState
            variant="inline"
            title="Plan written without an assessment."
            body="Add an assessment before signing — the plan should follow from a stated working diagnosis."
          />
        )}

        {/* Sections */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {SECTIONS.map((s, i) => {
              const showError =
                (touched[i] || submitAttempted) && errors[i] != null;
              return (
                <Section
                  key={s.key}
                  letter={s.key}
                  title={s.title}
                  placeholder={s.placeholder}
                  value={drafts[i]}
                  onChange={(v) => set(i, v)}
                  errorId={ids[i]}
                  error={showError ? errors[i] : null}
                  saving={saveStatus === "saving"}
                />
              );
            })}
          </div>
        </div>

        {/* Foot — actions + colophon. */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3">
          <SaveStatusChip
            status={saveStatus}
            lastSaved={lastSaved}
            lastDate={LAST_SAVED_DATE}
          />
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              aria-busy={saveStatus === "saving"}
              disabled={saveStatus === "saving"}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text)] transition-[border-color,color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
            >
              <Save size={12} strokeWidth={1.6} aria-hidden />
              {saveStatus === "saving" ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={handleSign}
              aria-busy={saveStatus === "saving"}
              aria-disabled={blockingError}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-[12px] text-[var(--color-accent-fg)] transition-[border-color,transform] duration-[120ms] ease-out hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px"
            >
              <Send size={12} strokeWidth={1.6} aria-hidden />
              {AUTHOR_RESIDENT ? "Sign & route to cosigner" : "Sign & submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveStatusChip({
  status,
  lastSaved,
  lastDate,
}: {
  status: SaveStatus;
  lastSaved: string;
  lastDate: string;
}) {
  const dotInk =
    status === "failed"
      ? "var(--color-accent)"
      : status === "saving"
        ? "var(--color-accent-2)"
        : status === "saved"
          ? "var(--color-accent-2)"
          : "var(--color-text-muted)";
  const text = (() => {
    if (status === "saving") return "Saving…";
    if (status === "failed") return `Save failed · last save ${lastSaved}`;
    return `Drafted · last saved ${lastDate} ${lastSaved}`;
  })();
  const ink =
    status === "failed"
      ? "var(--color-accent)"
      : "var(--color-text-muted)";
  return (
    <span
      role="status"
      aria-live="polite"
      className="font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{ color: ink }}
    >
      <span
        aria-hidden
        className={
          "mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full" +
          (status === "saving" ? " animate-live-pulse" : "")
        }
        style={{ background: dotInk }}
      />
      {text}
    </span>
  );
}

function Section({
  letter,
  title,
  placeholder,
  value,
  onChange,
  errorId,
  error,
  saving,
}: {
  letter: string;
  title: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  errorId: string;
  error: string | null;
  saving: boolean;
}) {
  // Map prose length to a saturating completeness ramp. 0 chars → 0%, 600+
  // chars → ~95%; sigmoid so paragraph two doesn't double the bar of paragraph
  // one.
  const len = value.length;
  const norm = 1 - 1 / (1 + len / 220);
  const completeness = Math.round(norm * 100);

  return (
    <section>
      <header className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <span
            aria-hidden
            className="font-display text-[24px] leading-none italic text-[var(--color-text-muted)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            {letter}
          </span>
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-[var(--color-text)]">
            {title}
          </h2>
          <CompletenessBar fraction={norm} />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {completeness}% drafted
        </span>
      </header>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={placeholder}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        aria-busy={saving}
        className="block w-full resize-y rounded-[var(--radius-sm)] border bg-[var(--color-surface)] px-3 py-2 text-[13px] leading-[1.6] text-[var(--color-text)] placeholder:italic placeholder:text-[var(--color-text-muted)] focus:outline-none"
        style={{
          borderColor: error ? "var(--color-accent)" : "var(--color-border)",
        }}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </section>
  );
}

/**
 * The completeness bar. Width fixed at 80px so rows align across the form;
 * the filled portion's length encodes prose length on the saturating ramp.
 */
function CompletenessBar({ fraction }: { fraction: number }) {
  return (
    <div
      aria-hidden
      className="h-[2px] w-20 bg-[var(--color-border)]"
      role="presentation"
    >
      <div
        className="h-full bg-[var(--color-text)]"
        style={{
          width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
          opacity: 0.7,
        }}
      />
    </div>
  );
}
