"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy, Plus, Trash2, X } from "lucide-react";
import { DotField } from "@/components/_kit/dot-field";
import { Modal } from "@/components/_kit/modal";
import { useToast } from "@/components/_kit/toast";
import { FieldError } from "@/components/_kit/field-error";
import { cn } from "@/lib/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ARCHIVED = [
  { id: "T-3402", title: "Re: Pricing experiment kickoff", date: "May 2" },
  { id: "T-3398", title: "Q3 retention deep dive — review", date: "May 1" },
  { id: "T-3391", title: "Outage retro 04-29 — followups", date: "Apr 30" },
  { id: "T-3382", title: "Onboarding email re-sequence", date: "Apr 29" },
  { id: "T-3370", title: "Vendor shortlist: streaming infra", date: "Apr 27" },
  { id: "T-3361", title: "API rate-limit migration plan", date: "Apr 25" },
  { id: "T-3354", title: "Edge runtime evaluation notes", date: "Apr 23" },
  { id: "T-3347", title: "Invoicing schema overhaul", date: "Apr 21" },
];

type Rule = { id: string; subject: string; label: string };
const INITIAL_RULES: Rule[] = [
  { id: "r1", subject: "[ALERT]", label: "incidents" },
  { id: "r2", subject: "newsletter", label: "later" },
  { id: "r3", subject: "invoice", label: "billing" },
];

export default function InboxZero() {
  const { toast } = useToast();
  const [composeOpen, setComposeOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function onCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("you+inbox@stipple.lab").catch(() => {});
    }
    setCopied(true);
    toast({ title: "Copied forwarding address", status: "success" });
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid h-full w-full place-items-center bg-[var(--color-bg)] px-4 py-12">
      <div className="flex w-full max-w-[440px] flex-col items-center text-center">
        <Illustration />

        <h2
          className="mt-8 font-display text-[28px] leading-tight tracking-[-0.022em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30' }}
        >
          Inbox zero.
        </h2>
        <p className="mt-2 max-w-[34ch] text-sm text-[var(--color-text-muted)]">
          Nothing waiting on you. Forward an email to{" "}
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              "inline-flex items-center gap-1 rounded-[var(--radius-xs)] border bg-[var(--color-surface)] px-1 py-0.5 align-baseline font-mono text-[11px] text-[var(--color-text)] transition-colors duration-[120ms] ease-out",
              "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
            )}
            aria-label="Copy forwarding address"
          >
            {copied ? (
              <>
                <Check size={10} strokeWidth={2} className="text-[var(--color-accent-2)]" />
                copied
              </>
            ) : (
              <>
                you+inbox@stipple.lab
                <Copy size={10} strokeWidth={1.6} className="text-[var(--color-text-muted)]" />
              </>
            )}
          </button>{" "}
          or start something new.
        </p>

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-sm text-[var(--color-accent-fg)] transition-[transform,border-color] duration-[120ms] ease-out hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px"
          >
            <Plus size={13} strokeWidth={1.8} />
            New thread
          </button>
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            View archive
            <ArrowRight size={13} strokeWidth={1.6} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] transition-colors duration-[120ms] ease-out hover:text-[var(--color-text)]"
        >
          set rules
          <ArrowRight size={10} strokeWidth={1.6} className="-rotate-45" />
        </button>
      </div>

      <ComposeModal open={composeOpen} onOpenChange={setComposeOpen} />
      <ArchiveDrawer open={archiveOpen} onOpenChange={setArchiveOpen} />
      <RulesDrawer open={rulesOpen} onOpenChange={setRulesOpen} />
    </div>
  );
}

function ComposeModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientErr, setRecipientErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const dirty =
    recipients.length > 0 || subject.length > 0 || body.length > 0 || draft.length > 0;

  function handleClose(next: boolean) {
    if (!next && dirty) {
      const ok =
        typeof window === "undefined"
          ? true
          : window.confirm("Discard this draft?");
      if (!ok) return;
    }
    if (!next) {
      setRecipients([]);
      setDraft("");
      setSubject("");
      setBody("");
      setRecipientErr(null);
      setSending(false);
    }
    onOpenChange(next);
  }

  function commitToken() {
    const t = draft.trim().replace(/,$/, "").trim();
    if (!t) return;
    if (!EMAIL_RE.test(t)) {
      setRecipientErr(`"${t}" is not a valid email.`);
      return;
    }
    setRecipients((r) => [...r, t]);
    setDraft("");
    setRecipientErr(null);
  }

  function onDraftChange(v: string) {
    setDraft(v);
    if (recipientErr) setRecipientErr(null);
    if (v.endsWith(",") || v.endsWith(" ")) {
      const t = v.replace(/[, ]+$/, "").trim();
      if (!t) {
        setDraft("");
        return;
      }
      if (!EMAIL_RE.test(t)) {
        setRecipientErr(`"${t}" is not a valid email.`);
        return;
      }
      setRecipients((r) => [...r, t]);
      setDraft("");
    }
  }

  function onSend() {
    commitToken();
    const all = recipients.concat(
      draft.trim() && EMAIL_RE.test(draft.trim()) ? [draft.trim()] : [],
    );
    if (all.length === 0) {
      setRecipientErr("Add at least one recipient.");
      return;
    }
    setSending(true);
    setTimeout(() => {
      onOpenChange(false);
      toast({
        title: `Thread sent to ${all.length} recipient${all.length === 1 ? "" : "s"}`,
        status: "success",
      });
      setRecipients([]);
      setDraft("");
      setSubject("");
      setBody("");
      setSending(false);
    }, 200);
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      placement="center"
      size="md"
      ariaLabel="Compose new thread"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          New thread
        </div>
        <button
          type="button"
          onClick={() => handleClose(false)}
          aria-label="Close"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <X size={14} strokeWidth={1.6} />
        </button>
      </div>

      <div className="px-4 py-4">
        {/* TO chips */}
        <label className="block text-[11px] font-medium text-[var(--color-text)]">
          To
        </label>
        <div
          className={cn(
            "mt-1.5 flex min-h-9 flex-wrap items-center gap-1.5 rounded-[var(--radius-sm)] border bg-[var(--color-bg)] px-2 py-1.5 text-sm focus-within:border-[var(--color-border-strong)]",
            recipientErr ? "border-[var(--color-accent)]" : "border-[var(--color-border)]",
          )}
        >
          {recipients.map((r, i) => (
            <span
              key={`${r}-${i}`}
              className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text)]"
            >
              {r}
              <button
                type="button"
                onClick={() => setRecipients((arr) => arr.filter((_, j) => j !== i))}
                aria-label={`Remove ${r}`}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
              >
                <X size={9} strokeWidth={1.8} />
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onBlur={commitToken}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitToken();
              } else if (e.key === "Backspace" && !draft && recipients.length) {
                setRecipients((arr) => arr.slice(0, -1));
              }
            }}
            placeholder={recipients.length ? "" : "name@company.com, …"}
            className="min-w-[120px] flex-1 bg-transparent text-[12.5px] focus:outline-none"
          />
        </div>
        <FieldError>{recipientErr}</FieldError>

        <label className="mt-3 block text-[11px] font-medium text-[var(--color-text)]">
          Subject
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1.5 h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-sm focus:border-[var(--color-border-strong)] focus:outline-none"
        />

        <label className="mt-3 block text-[11px] font-medium text-[var(--color-text)]">
          Body
        </label>
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1.5 block w-full resize-y rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-[13px] focus:border-[var(--color-border-strong)] focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
        <button
          type="button"
          onClick={() => handleClose(false)}
          className="inline-flex h-8 items-center rounded-[var(--radius-sm)] px-2 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={sending}
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-[12.5px] text-[var(--color-accent-fg)] transition-[transform,border-color,opacity] duration-[120ms] ease-out hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px disabled:opacity-90"
        >
          {sending ? (
            <>
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 animate-live-pulse rounded-full"
                style={{ background: "var(--color-accent-2)" }}
              />
              Sending
            </>
          ) : (
            "Send"
          )}
        </button>
      </div>
    </Modal>
  );
}

function ArchiveDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      placement="right"
      size="lg"
      ariaLabel="Archived threads"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Archive
            </div>
            <div
              className="font-display text-[18px] italic leading-tight text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              {ARCHIVED.length} threads
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <X size={14} strokeWidth={1.6} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {ARCHIVED.map((t) => (
            <div
              key={t.id}
              className="group relative grid grid-cols-[80px_1fr_60px] items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 transition-[background-color,border-color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[2px] bg-[var(--color-accent-2)] opacity-0 transition-opacity duration-[120ms] ease-out group-hover:opacity-100"
              />
              <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                {t.id}
              </span>
              <span className="truncate text-[13px] text-[var(--color-text)]">
                {t.title}
              </span>
              <span className="text-right font-mono text-[10px] text-[var(--color-text-muted)]">
                {t.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function RulesDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES);
  const [newSubject, setNewSubject] = useState("");
  const [newLabel, setNewLabel] = useState("");

  function addRule() {
    if (!newSubject.trim() || !newLabel.trim()) return;
    const id = `r${Date.now()}`;
    setRules((r) => [...r, { id, subject: newSubject.trim(), label: newLabel.trim() }]);
    setNewSubject("");
    setNewLabel("");
    toast({ title: "Rule added", status: "success" });
  }

  function deleteRule(id: string) {
    setRules((r) => r.filter((x) => x.id !== id));
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      placement="right"
      size="md"
      ariaLabel="Inbox rules"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Rules
            </div>
            <div
              className="font-display text-[18px] italic leading-tight text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              When → then
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <X size={14} strokeWidth={1.6} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="py-1.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]">
                  If subject contains
                </th>
                <th className="py-1.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]">
                  Label as
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-border)]">
                  <td className="py-2 font-mono text-[11.5px]">{r.subject}</td>
                  <td className="py-2 font-mono text-[11.5px] text-[var(--color-accent-2)]">
                    #{r.label}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => deleteRule(r.id)}
                      aria-label="Remove rule"
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                    >
                      <Trash2 size={11} strokeWidth={1.6} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Subject
              </label>
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="[STAGING]"
                className="mt-1 h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-[12px] focus:border-[var(--color-border-strong)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Label
              </label>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="staging"
                className="mt-1 h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-[12px] focus:border-[var(--color-border-strong)] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={addRule}
              className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 text-[12px] hover:border-[var(--color-text)]"
            >
              <Plus size={11} strokeWidth={1.8} />
              Add
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/**
 * The illustration is built entirely from <DotField />. We compose three
 * shapes (envelope body + flap + ground shadow) into one SVG-feeling unit.
 */
function Illustration() {
  return (
    <div className="relative h-[180px] w-[260px]">
      <div className="absolute inset-x-0 bottom-0 mx-auto h-10 w-[220px]">
        <DotField
          shape={{ kind: "circle", cx: 110, cy: 32, r: 100 }}
          spacing={6}
          dotRadius={1}
          baseDensity={0.45}
          accentRatio={0.04}
          seed={101}
          density={(x, y, w, h) => {
            const dx = (x - w / 2) / (w / 2);
            const dy = (y - h * 0.85) / (h * 0.4);
            return Math.max(0, 1 - (dx * dx + dy * dy));
          }}
          className="h-full w-full"
        />
      </div>

      <div className="absolute left-1/2 top-3 h-[120px] w-[200px] -translate-x-1/2">
        <DotField
          shape={{
            kind: "path",
            d: "M14 8 H186 A8 8 0 0 1 194 16 V104 A8 8 0 0 1 186 112 H14 A8 8 0 0 1 6 104 V16 A8 8 0 0 1 14 8 Z",
            viewBox: [0, 0, 200, 120],
          }}
          spacing={4.2}
          dotRadius={1.05}
          baseDensity={0.85}
          accentRatio={0.18}
          seed={42}
          density={(x, y, w, h) => {
            const dx = Math.min(x, w - x) / w;
            const dy = Math.min(y, h - y) / h;
            const edge = Math.min(dx, dy);
            return Math.max(0.15, 1 - edge * 1.8);
          }}
          className="h-full w-full"
        />
      </div>

      <div className="absolute left-1/2 top-3 h-[60px] w-[200px] -translate-x-1/2">
        <DotField
          shape={{
            kind: "path",
            d: "M6 10 L100 60 L194 10 L194 26 L100 76 L6 26 Z",
            viewBox: [0, 0, 200, 80],
          }}
          spacing={3.4}
          dotRadius={1.1}
          baseDensity={0.92}
          accentRatio={0.32}
          seed={9}
          density={(x, _y, w) => {
            const dx = Math.abs(x - w / 2) / (w / 2);
            return 1 - dx * 0.5;
          }}
          className="h-full w-full"
        />
      </div>

      <div className="absolute left-1/2 top-[44px] h-[36px] w-[110px] -translate-x-1/2">
        <DotField
          shape={{ kind: "rect", width: 110, height: 36, rx: 3 }}
          spacing={3.2}
          dotRadius={0.85}
          baseDensity={0.5}
          accentRatio={0.5}
          seed={3}
          className="h-full w-full opacity-70"
        />
      </div>
    </div>
  );
}

