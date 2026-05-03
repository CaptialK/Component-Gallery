"use client";

import { useState } from "react";
import { Save, Send } from "lucide-react";
import { mulberry32, poissonDisc } from "@/components/_kit/dot-noise";

/**
 * SOAP note — Subjective, Objective, Assessment, Plan. The clinical artefact
 * a clinician writes after every encounter. Form chrome is the dot-language
 * commitment of this plate:
 *
 *  - Each section header carries a small "thoroughness" stipple whose
 *    coverage encodes how full the section currently is. The eye reads
 *    "what's drafted vs. blank" before reading the section heading.
 *  - Textareas use the system focus halo (Federal Blue stippled annulus
 *    via the `::after` pseudo from `globals.css`). The selection colour
 *    is Federal Blue at 30% alpha — drag-select the prose to see it.
 *  - Save state is reflected in a single Federal Blue dot; the colophon
 *    rule below the form is the "last saved 14:08" note in italic
 *    Fraunces — typeset, not a status-bar widget.
 *
 * Client component (uses local state for input). Pre-populated with a
 * realistic but synthetic encounter so the showcase has substance.
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

const PATIENT = {
  family: "PATEL",
  given: "Reema",
  age: 47,
  sex: "F",
  mrn: "80124-5",
  encounter: "ENC-2026-04-01-188",
};

export default function IntakeSoapNote() {
  const [drafts, setDrafts] = useState(
    SECTIONS.map((s) => s.initial),
  );

  const set = (i: number, v: string) =>
    setDrafts((prev) => prev.map((p, j) => (j === i ? v : p)));

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full flex-col">
        {/* Compact patient strip — same vocabulary as the chart-header plate
            but condensed; on this plate the form is the figure. */}
        <div className="flex shrink-0 items-baseline justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-2.5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              SOAP note
            </span>
            <span className="font-mono text-[11px] text-[var(--color-text)]">
              {PATIENT.family},{" "}
              <span className="text-[var(--color-text-muted)]">
                {PATIENT.given}
              </span>
              <span className="ml-2 text-[var(--color-text-muted)]">
                {PATIENT.age} y · {PATIENT.sex} · MRN {PATIENT.mrn}
              </span>
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {PATIENT.encounter}
          </span>
        </div>

        {/* Sections */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {SECTIONS.map((s, i) => (
              <Section
                key={s.key}
                letter={s.key}
                title={s.title}
                placeholder={s.placeholder}
                value={drafts[i]}
                onChange={(v) => set(i, v)}
              />
            ))}
          </div>
        </div>

        {/* Foot — actions + colophon. */}
        <div className="flex shrink-0 items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <span aria-hidden className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full" style={{ background: "var(--color-accent-2)" }} />
            Drafted · last saved 14:08
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
            >
              <Save size={12} strokeWidth={1.6} />
              Save draft
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-[12px] text-[var(--color-accent-fg)] hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px"
            >
              <Send size={12} strokeWidth={1.6} />
              Sign &amp; submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  letter,
  title,
  placeholder,
  value,
  onChange,
}: {
  letter: string;
  title: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Map prose length to a coverage ramp inside the locked print canon.
  // 0 chars → 0.04 (sparse, signalling absence). 600+ chars → 0.22 (saturated
  // but never flat). Saturating sigmoid so paragraph two doesn't double the
  // coverage of paragraph one.
  const len = value.length;
  const norm = 1 - 1 / (1 + len / 220);
  const density = 0.04 + norm * 0.22;
  const completeness = Math.round(norm * 100);

  return (
    <section>
      <header className="mb-1.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <span
            className="font-display text-[24px] leading-none italic text-[var(--color-text-muted)]"
            style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
          >
            {letter}
          </span>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-[var(--color-text)]">
            {title}
          </span>
          <ThoroughnessStipple density={density} seed={letter.charCodeAt(0)} />
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
        className="block w-full resize-y rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] leading-[1.6] text-[var(--color-text)] placeholder:italic placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:outline-none"
      />
    </section>
  );
}

/**
 * The completeness stipple. Width fixed at 80px so rows align across the
 * form. Density is the only signal — same primitive as the hero, just at
 * smaller scale. Single-tone (`accentRatio: 0`); the section letter carries
 * the typographic accent.
 */
function ThoroughnessStipple({
  density,
  seed,
}: {
  density: number;
  seed: number;
}) {
  const W = 80;
  const H = 12;
  const points = poissonDisc({ width: W, height: H, radius: 2.6, seed });
  const rng = mulberry32(seed + 11);
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block"
      aria-hidden="true"
      role="presentation"
    >
      {points.map((p, i) => {
        if (rng() > density * 4) return null; // density is in [0.04, 0.26], scale up to keep ramp visible
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={0.85}
            fill="var(--color-text)"
            opacity={0.65}
          />
        );
      })}
    </svg>
  );
}
