import { Phone, Plus } from "lucide-react";
import { poissonDisc } from "@/components/_kit/dot-noise";

/**
 * Care team rail — a narrow vertical surface listing the people responsible
 * for a patient right now. Roles, paging extensions, on-call status. The
 * rail hangs off the right edge of a chart layout in a real product; here
 * it's a portrait plate at 9:16.
 *
 * Dot-language commitments specific to this plate:
 *
 *  - The status indicator is a one-letter dot vocabulary, *not* a coloured
 *    pill. Each role has a state in {on-call, available, busy, off}; each
 *    state renders as a dot motif distinct in shape, ink, and density.
 *  - The on-call provider's row gets a Federal Blue marginal stipple — a
 *    hairline trail of dots in the gutter — so a clinician scanning the
 *    rail finds them in a glance even before reading the role.
 *  - Avatars are clean ringed monograms. The chart-header plate carries the
 *    stippled-monogram primitive at hero scale; here at 32px the stipple
 *    crowded the initials, so the rail uses the triage-queue / bed-board
 *    monogram vocabulary instead (DECISIONS.md 2026-05-03 retrospective —
 *    text on dot fields fails at small scale).
 *
 * Pure server component.
 */

type Status = "on-call" | "available" | "busy" | "off";

type Member = {
  id: string;
  name: string;
  initials: string;
  role: string;
  detail: string;
  pager: string;
  status: Status;
  /** Marks the on-call lead — only one per care team. */
  lead?: boolean;
};

const TEAM: Member[] = [
  {
    id: "hartman",
    name: "Hartman, K., MD",
    initials: "KH",
    role: "Attending",
    detail: "Internal medicine",
    pager: "p4012",
    status: "on-call",
    lead: true,
  },
  {
    id: "park",
    name: "Park, J., MD",
    initials: "JP",
    role: "Resident",
    detail: "PGY-3 IM",
    pager: "p4188",
    status: "available",
  },
  {
    id: "ngo",
    name: "Ngo, T., MD",
    initials: "TN",
    role: "Endocrinology",
    detail: "Consult",
    pager: "p3261",
    status: "busy",
  },
  {
    id: "williams",
    name: "Williams, A., RN",
    initials: "AW",
    role: "Charge Nurse",
    detail: "Med-Surg 4",
    pager: "x52004",
    status: "available",
  },
  {
    id: "dela-cruz",
    name: "Dela Cruz, R., RN",
    initials: "RD",
    role: "Bedside",
    detail: "Day shift",
    pager: "x52188",
    status: "available",
  },
  {
    id: "chen",
    name: "Chen, M., PharmD",
    initials: "MC",
    role: "Pharmacist",
    detail: "Inpatient",
    pager: "p4509",
    status: "available",
  },
  {
    id: "ortiz",
    name: "Ortiz, S.",
    initials: "SO",
    role: "Case Mgmt",
    detail: "Discharge planning",
    pager: "p4612",
    status: "off",
  },
];

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
            On for Patel, R.
          </p>
        </header>

        {/* Roster */}
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {TEAM.map((m) => (
            <Row key={m.id} member={m} />
          ))}
        </ul>

        {/* Foot */}
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
          <button
            type="button"
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[12px] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
          >
            <Plus size={12} strokeWidth={1.8} />
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
    <li className="relative grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      {/* Marginal Federal Blue trail — only for the lead. Pulls the eye. */}
      {member.lead && <LeadMargin />}

      <Avatar initials={member.initials} dim={dim} />

      <div className="min-w-0 leading-tight">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {member.role}
          </span>
          <StatusDot status={member.status} />
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
      </div>

      <a
        href={`tel:${member.pager}`}
        aria-label={`Page ${member.name}`}
        className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 font-mono text-[10px] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
      >
        <Phone size={11} strokeWidth={1.6} />
        {member.pager}
      </a>
    </li>
  );
}

function Avatar({ initials, dim }: { initials: string; dim?: boolean }) {
  return (
    <span
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

function StatusDot({ status }: { status: Status }) {
  const cell = 12;
  const c = cell / 2;
  // Each state has its own glyph — shape varies with status, not just colour.
  if (status === "on-call") {
    // Federal Blue solid + faint surround stipple (rare, important).
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
