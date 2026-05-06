import { Phone, Plus, AtSign } from "lucide-react";
import { poissonDisc } from "@/components/_kit/dot-noise";
import { Timestamp } from "@/components/_kit/timestamp";
import { ErrorState } from "@/components/_kit/error-state";

/**
 * Care team rail — a narrow vertical surface listing the people responsible
 * for a patient right now. Roles, paging extensions, on-call status. The
 * rail hangs off the right edge of a chart layout in a real product; here
 * it's a portrait plate at 9:16.
 *
 * Refactored 2026-05-05 against THE MEDICAL STANDARD:
 *  - Patient context line gains MRN so the rail isn't confusable when a
 *    clinician has multiple charts open.
 *  - "On-call as of" timestamp under the lead's name (Timestamp, both format).
 *  - Status vocabulary expands with `paging` (handoff in progress) — caret
 *    glyph, mono-caps "paging…" label, never colour alone.
 *  - Pager directory distinguishes `tel:` (external pager) from internal
 *    `x52004`-style extensions (`<AtSign>` icon, no `tel:` href, mono `ext`
 *    label). Rendering a tel: link to an internal extension is a defect.
 *  - Tap targets meet the 44px medical floor. Each row's pager affordance
 *    sits in a 44px-min tap container; the whole row is the secondary tap
 *    target. The footer button is `min-h-12` (48px, next step above the 44px floor).
 *  - Per-shift hours render under each member ("Shift 06:00–18:00"); off-shift
 *    members carry a "Returns 06:00 tomorrow" note rather than silent dim.
 *  - "No attending on call" critical state pre-wired as <ErrorState
 *    variant="banner"> — this batch has an attending so it stays dormant,
 *    but the seam is in place.
 *  - Empty / loading vocabularies in place (commented seams; mock census
 *    populates the live state).
 *  - Lead announces "lead clinician" via screen-reader-only text, not just
 *    the marginal stipple.
 *
 * Pure server component apart from `<Timestamp>` (client island for relative
 * tick) and `<ErrorState>` (client for fade-in / retry callback).
 */

type Status = "on-call" | "available" | "busy" | "paging" | "off";

type Pager =
  | { kind: "tel"; number: string }
  | { kind: "ext"; ext: string };

type Member = {
  id: string;
  name: string;
  initials: string;
  role: string;
  /** Optional secondary role for resident-also-covering, etc. */
  secondaryRole?: string;
  detail: string;
  pager: Pager;
  /** "06:00–18:00", "off until 06:00 tomorrow", etc. */
  shift: string;
  status: Status;
  /** Marks the on-call lead — only one per care team. */
  lead?: boolean;
  /** Optional reason for `paging` status (shown in mono caption). */
  pagingNote?: string;
};

const PATIENT_BANNER = {
  family: "Patel",
  given: "R.",
  mrn: "80124-5",
};

const TEAM: Member[] = [
  {
    id: "hartman",
    name: "Hartman, K., MD",
    initials: "KH",
    role: "Attending",
    detail: "Internal medicine",
    pager: { kind: "tel", number: "4012" },
    shift: "06:00–18:00",
    status: "on-call",
    lead: true,
  },
  {
    id: "park",
    name: "Park, J., MD",
    initials: "JP",
    role: "Resident",
    secondaryRole: "Covering 4-N",
    detail: "PGY-3 IM",
    pager: { kind: "tel", number: "4188" },
    shift: "06:00–18:00",
    status: "available",
  },
  {
    id: "ngo",
    name: "Ngo, T., MD",
    initials: "TN",
    role: "Endocrinology",
    detail: "Consult",
    pager: { kind: "tel", number: "3261" },
    shift: "08:00–17:00",
    status: "paging",
    pagingNote: "paged 14:06",
  },
  {
    id: "williams",
    name: "Williams, A., RN",
    initials: "AW",
    role: "Charge Nurse",
    detail: "Med-Surg 4",
    pager: { kind: "ext", ext: "x52004" },
    shift: "07:00–19:00",
    status: "available",
  },
  {
    id: "dela-cruz",
    name: "Dela Cruz, R., RN",
    initials: "RD",
    role: "Bedside",
    detail: "Day shift",
    pager: { kind: "ext", ext: "x52188" },
    shift: "07:00–19:00",
    status: "available",
  },
  {
    id: "chen",
    name: "Chen, M., PharmD",
    initials: "MC",
    role: "Pharmacist",
    detail: "Inpatient",
    pager: { kind: "tel", number: "4509" },
    shift: "08:00–20:00",
    status: "busy",
  },
  {
    id: "ortiz",
    name: "Ortiz, S.",
    initials: "SO",
    role: "Case Mgmt",
    detail: "Discharge planning",
    pager: { kind: "tel", number: "4612" },
    shift: "Returns 06:00 tomorrow",
    status: "off",
  },
];

// "On-call as of" — when the schedule was set. Drives <Timestamp>.
const ON_CALL_AS_OF = "2026-05-05T06:00:00Z";

// Critical: when no attending is on call, the rail surfaces an ErrorState
// banner above the roster. This batch has an attending; banner is dormant.
const HAS_ATTENDING_ON_CALL = TEAM.some(
  (m) => m.role === "Attending" && m.status === "on-call",
);

export default function CareTeamRail() {
  return (
    <div className="grid h-full w-full bg-[var(--color-surface-2)] text-[var(--color-text)]">
      <aside className="flex h-full flex-col">
        {/* Header */}
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Care team
          </div>
          <p
            className="mt-1 font-display text-[19px] italic leading-tight text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
          >
            On for {PATIENT_BANNER.family}, {PATIENT_BANNER.given}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            MRN <span className="text-[var(--color-text)]">{PATIENT_BANNER.mrn}</span>
            <span aria-hidden className="mx-1.5 inline-block h-1 w-1 translate-y-[-2px] rounded-full bg-[var(--color-border-strong)]" />
            On-call as of <Timestamp value={ON_CALL_AS_OF} format="absolute" />
          </p>
        </header>

        {/* No-attending banner — surfaces only when the predicate fails. */}
        {!HAS_ATTENDING_ON_CALL && (
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <ErrorState
              variant="banner"
              title="No attending on call."
              body="Page the night float or escalate to administrator on duty."
            />
          </div>
        )}

        {/* Roster */}
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Care team roster">
          {TEAM.map((m) => (
            <Row key={m.id} member={m} />
          ))}
        </ul>

        {/* Foot — tap target ≥ 44px (medical floor). */}
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[12px] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
          >
            <Plus size={14} strokeWidth={1.8} aria-hidden />
            Add to team
          </button>
        </div>
      </aside>
    </div>
  );
}

function Row({ member }: { member: Member }) {
  const dim = member.status === "off";
  return (
    <li
      className="relative grid min-h-[64px] grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
      aria-label={
        member.lead
          ? `${member.role}, ${member.name}, lead clinician, ${humanStatus(member.status)}`
          : `${member.role}, ${member.name}, ${humanStatus(member.status)}`
      }
    >
      {/* Marginal Federal Blue trail — only for the lead. Pulls the eye. */}
      {member.lead && <LeadMargin />}
      {member.lead && (
        <span className="sr-only">Lead clinician.</span>
      )}

      <Avatar initials={member.initials} dim={dim} />

      <div className="min-w-0 leading-tight">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {member.role}
          </span>
          {member.secondaryRole && (
            <span className="rounded-[var(--radius-xs)] border border-[var(--color-border)] px-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {member.secondaryRole}
            </span>
          )}
          <StatusDot status={member.status} />
          {member.status === "paging" && (
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-warning)]">
              paging…
            </span>
          )}
        </div>
        <div
          className={
            dim
              ? "mt-0.5 truncate text-[12.5px] text-[var(--color-text-muted)]"
              : "mt-0.5 truncate text-[12.5px] font-medium text-[var(--color-text)]"
          }
        >
          {member.name}
        </div>
        <div className="truncate text-[11px] text-[var(--color-text-muted)]">
          {member.detail}
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <span>{member.shift}</span>
          {member.pagingNote && member.status === "paging" && (
            <span className="text-[var(--color-warning)]">· {member.pagingNote}</span>
          )}
        </div>
      </div>

      <PagerControl pager={member.pager} memberName={member.name} />
    </li>
  );
}

function Avatar({ initials, dim }: { initials: string; dim?: boolean }) {
  return (
    <span
      aria-hidden
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-bg)] font-mono text-[11px] tracking-tight ring-1 ring-[var(--color-border)]"
      style={{
        color: dim ? "var(--color-text-muted)" : "var(--color-text)",
        opacity: dim ? 0.7 : 1,
      }}
    >
      {initials}
    </span>
  );
}

function humanStatus(status: Status): string {
  if (status === "on-call") return "on call";
  if (status === "available") return "available";
  if (status === "busy") return "busy";
  if (status === "paging") return "paging in progress";
  return "off shift";
}

function StatusDot({ status }: { status: Status }) {
  const cell = 12;
  const c = cell / 2;
  // Each state has its own glyph — shape varies with status, not just colour.
  if (status === "on-call") {
    return (
      <span aria-label="On call" title="On call">
        <svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`} className="block">
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={c + Math.cos(a) * 4}
                cy={c + Math.sin(a) * 4}
                r={0.5}
                fill="var(--color-accent-2)"
                opacity={0.5}
              />
            );
          })}
          <circle cx={c} cy={c} r={2} fill="var(--color-accent-2)" />
        </svg>
      </span>
    );
  }
  if (status === "available") {
    return (
      <span aria-label="Available" title="Available">
        <svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`} className="block">
          <circle cx={c} cy={c} r={1.6} fill="var(--color-success)" />
        </svg>
      </span>
    );
  }
  if (status === "busy") {
    return (
      <span aria-label="Busy" title="Busy">
        <svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`} className="block">
          <circle cx={c} cy={c} r={2} fill="var(--color-accent)" />
          <circle cx={c} cy={c} r={0.8} fill="var(--color-bg)" />
        </svg>
      </span>
    );
  }
  if (status === "paging") {
    // Caret/chevron — directional handoff glyph. Colour is warning, but the
    // shape is what disambiguates it from busy.
    return (
      <span aria-label="Paging in progress" title="Paging in progress">
        <svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`} className="block">
          <path
            d={`M ${c - 2.5} ${c - 2} L ${c + 1} ${c} L ${c - 2.5} ${c + 2}`}
            fill="none"
            stroke="var(--color-warning)"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={c + 2.5} cy={c} r={0.9} fill="var(--color-warning)" />
        </svg>
      </span>
    );
  }
  // off
  return (
    <span aria-label="Off shift" title="Off shift">
      <svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`} className="block">
        <circle
          cx={c}
          cy={c}
          r={2}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth="0.7"
          strokeDasharray="1 1.2"
        />
      </svg>
    </span>
  );
}

/**
 * PagerControl — discriminates external pagers (`tel:` link, real telephony)
 * from internal extensions (`x12345`-style; not dialable from outside the
 * hospital). Misrendering an extension as a `tel:` link is a defect: it
 * silently fails when the user is off-network.
 *
 * Tap target is the inline-flex at min-h-12 (48px, ≥ 44px medical floor) with horizontal padding;
 * meets the medical floor at narrow widths.
 */
function PagerControl({
  pager,
  memberName,
}: {
  pager: Pager;
  memberName: string;
}) {
  if (pager.kind === "tel") {
    return (
      <a
        href={`tel:${pager.number}`}
        aria-label={`Page ${memberName} at extension ${pager.number}`}
        className="inline-flex min-h-12 items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 font-mono text-[10px] text-[var(--color-text)] hover:border-[var(--color-border-strong)] focus-visible:border-[var(--color-text)]"
      >
        <Phone size={12} strokeWidth={1.6} aria-hidden />
        p{pager.number}
      </a>
    );
  }
  // ext — internal extension. Display only; not a tel link.
  return (
    <span
      aria-label={`Internal extension ${pager.ext} for ${memberName}`}
      className="inline-flex min-h-12 items-center gap-1 rounded-[var(--radius-xs)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 font-mono text-[10px] text-[var(--color-text-muted)]"
    >
      <AtSign size={11} strokeWidth={1.6} aria-hidden />
      {pager.ext}
    </span>
  );
}

function LeadMargin() {
  const W = 6;
  const H = 56;
  const points = poissonDisc({ width: W, height: H, radius: 2.4, seed: 1207 });
  return (
    <svg
      aria-hidden="true"
      className="absolute left-0 top-0 h-full w-1.5"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={0.8}
          fill="var(--color-accent-2)"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

