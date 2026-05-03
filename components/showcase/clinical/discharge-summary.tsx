import { DotField } from "@/components/_kit/dot-field";

/**
 * Discharge summary — the formal document a clinician hands a patient on
 * discharge. Reads as a printed handout, not a UI surface.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - Section breaks are halftone fade bands — same primitive the specimen
 *    shell uses around the plate frame. The document literally lives
 *    inside the same typography and ink rhythm as the rest of the
 *    catalogue, which is the point.
 *  - The signature line ends with a small "ink trail" stipple — Federal
 *    Blue dots tapering off the page edge, the way real ink does.
 *  - The footer carries a stippled official-seal ring (the registration
 *    crosshair vocabulary, scaled up): "this document was issued."
 *
 * Pure server component. Synthetic encounter, no PHI.
 */

const DOC = {
  facility: "Riverbend Regional Hospital",
  unit: "Med-Surg 4",
  documentId: "DC-2026-04-188",
  issuedDate: "06 May 2026",
  issuedTime: "11:42",

  patient: {
    name: "Patel, Reema",
    mrn: "80124-5",
    dob: "14 Mar 1979",
    age: 47,
    sex: "F",
  },

  admit: "04 May 2026 · 06:18",
  discharge: "06 May 2026 · 11:42",
  los: "2 days, 5 hours",

  diagnoses: [
    { primary: true, text: "Hyperglycemia, type 2 diabetes mellitus, uncontrolled" },
    { primary: false, text: "Hypokalemia, mild" },
    { primary: false, text: "Essential hypertension" },
  ],

  course:
    "47-year-old female with PMH of T2DM and HTN admitted for hyperglycemia and mild leukocytosis. Initial labs notable for K 3.3, glucose 168, WBC 12.6. CXR clear. Endocrinology consulted; sliding-scale insulin initiated and titrated. K repleted with 40 mEq PO ×2; recheck normal. Glucose trended down to 124 by hospital day 2. Patient remained afebrile with stable vitals. Tolerated diet and resumed home medications without complication.",

  medications: [
    { name: "Lisinopril",   dose: "10 mg",  route: "PO", freq: "Once daily",      change: "continue" as const,    notes: "Home medication" },
    { name: "Metformin",    dose: "500 mg", route: "PO", freq: "Twice daily",     change: "continue" as const,    notes: "Resume home regimen" },
    { name: "Atorvastatin", dose: "40 mg",  route: "PO", freq: "At bedtime",      change: "continue" as const,    notes: "Home medication" },
    { name: "Aspirin",      dose: "81 mg",  route: "PO", freq: "Once daily",      change: "continue" as const,    notes: "Home medication" },
    { name: "Glipizide",    dose: "5 mg",   route: "PO", freq: "Once daily",      change: "new" as const,         notes: "New — added for glycemic control" },
    { name: "KCl",          dose: "20 mEq", route: "PO", freq: "Once daily x 5d", change: "new" as const,         notes: "Until follow-up labs" },
  ],

  followUp: [
    { who: "Hartman, K., MD (PCP)",       when: "12 May 2026 · 09:30", where: "Internal Medicine Clinic", note: "Glucose check, K recheck" },
    { who: "Endocrinology · Dr. Ngo",     when: "20 May 2026 · 14:00", where: "Endo Clinic, 3rd floor",   note: "Diabetes management" },
    { who: "Lab — fasting CMP, A1c",     when: "11 May 2026 · 08:00", where: "Riverbend Outpatient Lab", note: "Bring this paper" },
  ],

  instructions: [
    "Check fingerstick glucose four times daily for the next two weeks; log the reading on the attached sheet.",
    "Drink at least 2 liters of water daily unless your kidney doctor has told you otherwise.",
    "Stop the potassium tablets after 5 days. Do not double a missed dose.",
    "Walk for 20 minutes a day this week, longer if you feel up to it.",
    "Call the clinic if your glucose stays above 250 for two readings in a row, or if you feel unusually tired, dizzy, or weak.",
  ],

  warning:
    "Go to the Emergency Department or call 911 for chest pain, severe shortness of breath, fainting, blood-sugar above 400, or symptoms of low blood sugar (sweating, confusion, fast heartbeat).",

  provider: "Hartman, K., MD",
  providerLicense: "MD-2188-OR",
};

export default function DischargeSummary() {
  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <article className="flex h-full flex-col bg-[var(--color-surface)]">
        {/* Letterhead */}
        <header className="border-b border-[var(--color-border-strong)] px-7 pt-6 pb-4">
          <div className="flex items-baseline justify-between">
            <span
              className="font-display text-[18px] italic text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              {DOC.facility}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              {DOC.unit} · {DOC.documentId}
            </span>
          </div>
          <h1
            className="mt-2 font-display text-[26px] leading-[1.05] tracking-[-0.022em] text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30' }}
          >
            Discharge summary &amp; after-visit instructions.
          </h1>
          <p
            className="mt-1 font-display text-[12px] italic text-[var(--color-text-muted)]"
            style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
          >
            Issued {DOC.issuedDate} at {DOC.issuedTime}.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6 pt-4">
          {/* Demographics */}
          <Section index="I" title="Patient">
            <KeyValue label="Name"    value={DOC.patient.name} />
            <KeyValue label="MRN"     value={DOC.patient.mrn} />
            <KeyValue label="DOB"     value={`${DOC.patient.dob}  ·  ${DOC.patient.age} y · ${DOC.patient.sex}`} />
            <KeyValue label="Admit"   value={DOC.admit} />
            <KeyValue label="Discharge" value={DOC.discharge} />
            <KeyValue label="Length"  value={DOC.los} />
          </Section>

          <FadeBreak />

          {/* Diagnoses */}
          <Section index="II" title="Diagnoses">
            <ol className="space-y-1.5 text-[12.5px] leading-[1.55]">
              {DOC.diagnoses.map((d, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {d.text}
                    {d.primary && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent-2)]">
                        primary
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          <FadeBreak />

          {/* Hospital course */}
          <Section index="III" title="Hospital course">
            <p
              className="text-[12.5px] leading-[1.6] text-[var(--color-text)] [text-wrap:pretty]"
              style={{ orphans: 3, widows: 3 }}
            >
              {DOC.course}
            </p>
          </Section>

          <FadeBreak />

          {/* Medications */}
          <Section index="IV" title="Discharge medications">
            <ul className="space-y-2 text-[12.5px] leading-[1.5]">
              {DOC.medications.map((m, i) => (
                <li key={i} className="grid grid-cols-[16px_1fr_auto] gap-2">
                  <ChangeGlyph change={m.change} />
                  <div>
                    <span className="font-medium text-[var(--color-text)]">
                      {m.name}
                    </span>{" "}
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-text)]">
                      {m.dose} {m.route}
                    </span>{" "}
                    <span className="text-[var(--color-text-muted)]">
                      · {m.freq}
                    </span>
                    {m.notes && (
                      <span className="ml-2 font-display text-[11px] italic text-[var(--color-text-muted)]"
                        style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
                      >
                        {m.notes}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    {m.change}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <FadeBreak />

          {/* Follow-up */}
          <Section index="V" title="Follow-up">
            <ul className="space-y-2.5 text-[12.5px] leading-[1.5]">
              {DOC.followUp.map((f, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <span className="text-[var(--color-text)]">{f.who}</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    {f.when} · {f.where}
                  </span>
                  {f.note && (
                    <span
                      className="font-display text-[11.5px] italic text-[var(--color-text-muted)]"
                      style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
                    >
                      {f.note}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <FadeBreak />

          {/* Instructions */}
          <Section index="VI" title="Patient instructions">
            <ul className="space-y-2 text-[12.5px] leading-[1.6]">
              {DOC.instructions.map((line, i) => (
                <li key={i} className="grid grid-cols-[16px_1fr] gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)]" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {/* Warning banner — perimeter rendered as Bridson stipple, not a
                solid border. Mirrors the bed-board isolation perimeter: the
                language of "stop and read this" is dots on the edge. */}
            <WarningBanner text={DOC.warning} />
          </Section>

          <FadeBreak />

          {/* Signature */}
          <Section index="VII" title="Provider signature">
            <div className="flex flex-col gap-1">
              <SignatureLine />
              <div className="flex items-baseline gap-3">
                <span className="text-[12.5px] font-medium text-[var(--color-text)]">
                  {DOC.provider}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Lic {DOC.providerLicense}
                </span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Signed {DOC.issuedDate} · {DOC.issuedTime}
                </span>
              </div>
            </div>
          </Section>
        </div>

        {/* Foot */}
        <footer className="flex items-center justify-between border-t border-[var(--color-border-strong)] px-7 py-3">
          <Seal />
          <span
            className="font-display text-[11px] italic text-[var(--color-text-muted)]"
            style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
          >
            Page 1 of 1.  This summary supersedes prior discharge documents
            for this admission.
          </span>
        </footer>
      </article>
    </div>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-3">
      <header className="mb-2 flex items-baseline gap-3">
        <span
          className="font-display text-[14px] italic leading-none text-[var(--color-text-muted)]"
          style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
        >
          {index}.
        </span>
        <h2 className="text-[14px] font-medium tracking-[-0.01em] text-[var(--color-text)]">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2 py-0.5 text-[12.5px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="text-[var(--color-text)]">{value}</span>
    </div>
  );
}

function ChangeGlyph({ change }: { change: "continue" | "new" | "stop" }) {
  if (change === "continue")
    return (
      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)]" />
    );
  if (change === "new")
    return (
      <span
        aria-hidden
        className="mt-1 inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: "var(--color-accent-2)" }}
      />
    );
  return (
    <span
      aria-hidden
      className="mt-1 inline-block h-1.5 w-1.5 rounded-full"
      style={{ background: "var(--color-accent)" }}
    />
  );
}

function FadeBreak() {
  return (
    <div aria-hidden="true" className="my-2 h-6 w-full">
      <DotField
        shape={{ kind: "rect", width: 600, height: 24 }}
        spacing={4.5}
        dotRadius={0.95}
        baseDensity={0.95}
        accentRatio={0}
        seed={4019}
        density={(_x, y, _w, h) => {
          // Crest at vertical centre, taper to edges — reads as a
          // soft halftone band rather than a hard rule.
          const t = (y - h / 2) / (h / 2);
          return Math.max(0, 1 - t * t);
        }}
        className="h-full w-full opacity-70"
      />
    </div>
  );
}

function WarningBanner({ text }: { text: string }) {
  return (
    <div className="relative mt-4 overflow-hidden bg-[color-mix(in_oklch,var(--color-danger)_8%,var(--color-bg))]">
      {/* Stippled perimeter — interior stays flat */}
      <PerimeterStipple ink="var(--color-danger)" />
      <div className="relative flex flex-col gap-1 p-3 text-[12px] leading-[1.55]">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-danger)]">
          When to seek emergency care
        </span>
        <span className="text-[var(--color-text)]">{text}</span>
      </div>
    </div>
  );
}

function PerimeterStipple({ ink }: { ink: string }) {
  // Run dots along the four edges of a 100×60 viewport; SVG stretches via
  // preserveAspectRatio="none" so the inset is uniform regardless of size.
  const W = 100;
  const H = 60;
  const inset = 1.4;
  const step = 3.6;
  const dots: { x: number; y: number }[] = [];
  for (let x = inset; x <= W - inset; x += step) {
    dots.push({ x, y: inset });
    dots.push({ x, y: H - inset });
  }
  for (let y = inset + step; y < H - inset; y += step) {
    dots.push({ x: inset, y });
    dots.push({ x: W - inset, y });
  }
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    >
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={0.7} fill={ink} opacity={0.8} />
      ))}
    </svg>
  );
}

function SignatureLine() {
  return (
    <div className="relative h-10 w-full">
      {/* Hairline */}
      <div className="absolute inset-x-0 top-7 h-px bg-[var(--color-border-strong)]" />
      {/* Ink trail tapering from right edge — Federal Blue, the way a real
          fountain pen runs out at the end of a stroke. */}
      <div className="absolute right-0 top-3 h-6 w-44">
        <DotField
          shape={{ kind: "rect", width: 200, height: 24 }}
          spacing={3.4}
          dotRadius={0.85}
          baseDensity={0.95}
          accentRatio={0.35}
          seed={9192}
          density={(x, y, w, h) => {
            // Concentrate near the line, taper to the right.
            const t = x / w;
            const yt = (y - h / 2) / (h / 2);
            return Math.max(0, (1 - t) * (1 - yt * yt));
          }}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

function Seal() {
  // The footer "official" mark — a small stippled ring with an "RX" anchor.
  return (
    <div className="flex items-center gap-3">
      <svg width={36} height={36} viewBox="0 0 36 36" aria-hidden="true">
        {/* Outer ring of dots */}
        {Array.from({ length: 28 }).map((_, i) => {
          const a = (i / 28) * Math.PI * 2;
          return (
            <circle
              key={`o-${i}`}
              cx={18 + Math.cos(a) * 15}
              cy={18 + Math.sin(a) * 15}
              r={0.7}
              fill="var(--color-text-muted)"
            />
          );
        })}
        {/* Inner ring */}
        {Array.from({ length: 18 }).map((_, i) => {
          const a = (i / 18) * Math.PI * 2 + Math.PI / 18;
          return (
            <circle
              key={`i-${i}`}
              cx={18 + Math.cos(a) * 11}
              cy={18 + Math.sin(a) * 11}
              r={0.55}
              fill="var(--color-text-muted)"
              opacity={0.7}
            />
          );
        })}
        {/* Anchor center mark */}
        <circle cx={18} cy={18} r={1.6} fill="var(--color-text)" />
      </svg>
      <span
        className="font-display text-[11px] italic leading-tight text-[var(--color-text-muted)]"
        style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
      >
        Riverbend Regional
        <br />
        Hospital · Med-Surg
      </span>
    </div>
  );
}
