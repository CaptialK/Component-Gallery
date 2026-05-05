"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Plus, Trash2, X } from "lucide-react";
import { DotField } from "@/components/_kit/dot-field";
import { EmptyState } from "@/components/_kit/empty-state";
import { ErrorState } from "@/components/_kit/error-state";
import { Modal } from "@/components/_kit/modal";
import { Skeleton } from "@/components/_kit/skeleton";
import { useToast } from "@/components/_kit/toast";
import { FieldError } from "@/components/_kit/field-error";
import { cn } from "@/lib/cn";

/** Tiny SSR-safe matchMedia hook used by the compose modal to switch
 * between a centered dialog and a bottom sheet at the small viewport
 * breakpoint. Default-false during SSR so the snap captures the
 * canonical centered pose. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const m = window.matchMedia(query);
    const update = () => setMatches(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return matches;
}

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
            aria-live="polite"
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

        {/* CTAs: stack vertically below 360px (one per row), inline above. */}
        <div className="mt-6 flex flex-col items-stretch gap-2 min-[360px]:flex-row min-[360px]:items-center">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)] bg-[var(--color-accent)] px-3 text-sm text-[var(--color-accent-fg)] transition-[transform,border-color] duration-[120ms] ease-out hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)] active:translate-y-px"
          >
            <Plus size={13} strokeWidth={1.8} />
            New thread
          </button>
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
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
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Track which chips are still entering — drives the 120ms opacity fade.
  const enteringChipsRef = useRef<Set<string>>(new Set());
  const isSheet = useMediaQuery("(max-width: 540px)");

  const dirty =
    recipients.length > 0 || subject.length > 0 || body.length > 0 || draft.length > 0;

  function reset() {
    setRecipients([]);
    setDraft("");
    setSubject("");
    setBody("");
    setRecipientErr(null);
    setSendErr(null);
    setSending(false);
  }

  function handleClose(next: boolean) {
    if (!next && dirty) {
      // In-app confirm dialog instead of window.confirm.
      setConfirmDiscard(true);
      return;
    }
    if (!next) reset();
    onOpenChange(next);
  }

  function addRecipient(addr: string) {
    setRecipients((r) => {
      if (r.includes(addr)) return r;
      enteringChipsRef.current.add(addr);
      // Allow next paint to clear the entering flag.
      window.requestAnimationFrame(() => {
        enteringChipsRef.current.delete(addr);
      });
      return [...r, addr];
    });
  }

  // Splits on newline, comma, OR semicolon — and trims each.
  function splitTokens(v: string): string[] {
    return v
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function commitToken() {
    const tokens = splitTokens(draft);
    if (tokens.length === 0) return;
    const bad = tokens.filter((t) => !EMAIL_RE.test(t));
    if (bad.length > 0) {
      setRecipientErr(`"${bad[0]}" is not a valid email.`);
      return;
    }
    tokens.forEach(addRecipient);
    setDraft("");
    setRecipientErr(null);
  }

  function onDraftChange(v: string) {
    setDraft(v);
    if (recipientErr) setRecipientErr(null);
    // Auto-commit when user types a separator or whitespace.
    if (/[\n,; ]/.test(v.slice(-1))) {
      const tokens = splitTokens(v);
      const bad = tokens.filter((t) => !EMAIL_RE.test(t));
      if (bad.length) {
        setRecipientErr(`"${bad[0]}" is not a valid email.`);
        return;
      }
      tokens.forEach(addRecipient);
      setDraft("");
    }
  }

  function onSend() {
    commitToken();
    const trailing = splitTokens(draft);
    const allBad = trailing.filter((t) => !EMAIL_RE.test(t));
    if (allBad.length) return; // commitToken already surfaced the error.
    const all = Array.from(new Set(recipients.concat(trailing)));
    if (all.length === 0) {
      setRecipientErr("Add at least one recipient.");
      return;
    }
    setSendErr(null);
    setSending(true);
    setTimeout(() => {
      // Simulated 1-in-5 failure.
      const fail = Math.random() < 0.2;
      if (fail) {
        setSending(false);
        setSendErr(
          "The transport returned 502. Your draft is preserved.",
        );
        return;
      }
      onOpenChange(false);
      toast({
        title: `Thread sent to ${all.length} recipient${all.length === 1 ? "" : "s"}`,
        status: "success",
      });
      reset();
    }, 200);
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      placement={isSheet ? "bottom" : "center"}
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
        {/* Send-failure inline error — replaces nothing; sits above the
            form fields so it's seen on retry. */}
        {sendErr && (
          <div className="mb-3">
            <ErrorState
              variant="inline"
              title="Couldn't send. Retry."
              body={sendErr}
              onRetry={() => {
                setSendErr(null);
                onSend();
              }}
              onDismiss={() => setSendErr(null)}
            />
          </div>
        )}

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
            <RecipientChip
              key={`${r}-${i}`}
              addr={r}
              entering={enteringChipsRef.current.has(r)}
              onRemove={() =>
                setRecipients((arr) => arr.filter((_, j) => j !== i))
              }
            />
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
      {/* In-app discard confirm — replaces window.confirm. */}
      <DiscardConfirmModal
        open={confirmDiscard}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          reset();
          onOpenChange(false);
        }}
      />
    </Modal>
  );
}

/** A single TO-line chip; fades in over 120ms on first paint. */
function RecipientChip({
  addr,
  entering,
  onRemove,
}: {
  addr: string;
  entering: boolean;
  onRemove: () => void;
}) {
  const [shown, setShown] = useState(!entering);
  useEffect(() => {
    if (entering) {
      const id = window.setTimeout(() => setShown(true), 0);
      return () => window.clearTimeout(id);
    }
  }, [entering]);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text)]"
      style={{
        opacity: shown ? 1 : 0,
        transition: "opacity 120ms ease-out",
      }}
    >
      {addr}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${addr}`}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
      >
        <X size={9} strokeWidth={1.8} />
      </button>
    </span>
  );
}

function DiscardConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && onCancel()}
      placement="center"
      size="sm"
      ariaLabel="Discard draft?"
    >
      <div className="px-4 py-4">
        <h3
          className="font-display italic text-[18px] tracking-[-0.02em] leading-tight text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          Discard this draft?
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          Your recipients, subject, and body will be lost.
        </p>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 items-center rounded-[var(--radius-sm)] px-2 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Keep editing
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_8%,var(--color-surface))] px-3 text-[12.5px] text-[var(--color-accent)] hover:bg-[color-mix(in_oklch,var(--color-accent)_14%,var(--color-surface))]"
        >
          Discard
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
  // Loading + error simulated for the rendered specimen. Loading flips
  // off after 200ms; error stays off in the canonical pose. Both states
  // stay reachable for snapping if a tester flips them locally.
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Toggle: drop ARCHIVED to [] to render the empty state.
  const [items] = useState(ARCHIVED);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const id = window.setTimeout(() => setLoading(false), 200);
    return () => window.clearTimeout(id);
  }, [open]);

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
              {loading
                ? "loading…"
                : `${items.length} thread${items.length === 1 ? "" : "s"}`}
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
        {loadError && (
          <ErrorState
            variant="banner"
            title="Archive unavailable."
            onRetry={() => {
              setLoadError(false);
              setLoading(true);
              window.setTimeout(() => setLoading(false), 200);
            }}
          />
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-1 px-4 py-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  width={420}
                  height={44}
                  density={0.05}
                  seed={i + 1}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              density="inline"
              title="Nothing archived yet."
              body="Threads land here after 30 days."
            />
          ) : (
            items.map((t) => (
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
                {/* Rows are presentational; not interactive in this plate. */}
                <span className="truncate text-[13px] text-[var(--color-text)]">
                  {t.title}
                </span>
                <span className="text-right font-mono text-[10px] text-[var(--color-text-muted)]">
                  {t.date}
                </span>
              </div>
            ))
          )}
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
  const [subjectErr, setSubjectErr] = useState<string | null>(null);
  const [labelErr, setLabelErr] = useState<string | null>(null);
  // Inline 2-step delete confirm — id of the row in "are you sure?" mode.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Loading state on open.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const id = window.setTimeout(() => setLoading(false), 200);
    return () => window.clearTimeout(id);
  }, [open]);

  function addRule() {
    const subject = newSubject.trim();
    const label = newLabel.trim();
    let bad = false;
    if (!subject) {
      setSubjectErr("Required.");
      bad = true;
    }
    if (!label) {
      setLabelErr("Required.");
      bad = true;
    }
    if (bad) return;
    // Dedupe — same subject + label combination already exists.
    const dup = rules.some(
      (r) => r.subject === subject && r.label === label,
    );
    if (dup) {
      setSubjectErr("Duplicate of an existing rule.");
      return;
    }
    const id = `r${Date.now()}`;
    setRules((r) => [...r, { id, subject, label }]);
    setNewSubject("");
    setNewLabel("");
    setSubjectErr(null);
    setLabelErr(null);
    toast({ title: "Rule added", status: "success" });
  }

  function onDeleteClick(id: string) {
    if (confirmDeleteId === id) {
      // Second click — confirm. Fade out then unmount.
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmDeleteId(null);
      setLeavingId(id);
      window.setTimeout(() => {
        setRules((r) => r.filter((x) => x.id !== id));
        setLeavingId(null);
      }, 120);
      return;
    }
    setConfirmDeleteId(id);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => {
      setConfirmDeleteId((cur) => (cur === id ? null : cur));
    }, 4000);
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
          {loading ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  width={420}
                  height={44}
                  density={0.05}
                  seed={i + 9}
                />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              density="inline"
              title="No rules."
              body="Add one below to start filtering inbound mail."
            />
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                  <th className="py-1.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]">
                    If subject contains
                  </th>
                  <th className="py-1.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em]">
                    Label as
                  </th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => {
                  const leaving = leavingId === r.id;
                  const confirming = confirmDeleteId === r.id;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--color-border)]"
                      style={{
                        opacity: leaving ? 0 : 1,
                        transition: "opacity 120ms ease-out",
                      }}
                    >
                      <td className="py-2 font-mono text-[11.5px]">{r.subject}</td>
                      <td className="py-2 font-mono text-[11.5px] text-[var(--color-accent-2)]">
                        #{r.label}
                      </td>
                      <td className="py-2 text-right">
                        {confirming ? (
                          <button
                            type="button"
                            onClick={() => onDeleteClick(r.id)}
                            aria-label="Confirm delete rule"
                            className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent)] hover:underline"
                          >
                            sure?
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onDeleteClick(r.id)}
                            aria-label="Remove rule"
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                          >
                            <Trash2 size={11} strokeWidth={1.6} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="mt-4 grid grid-cols-[1fr_1fr_auto] items-start gap-2">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Subject
              </label>
              <input
                value={newSubject}
                onChange={(e) => {
                  setNewSubject(e.target.value);
                  if (subjectErr) setSubjectErr(null);
                }}
                placeholder="[STAGING]"
                aria-invalid={Boolean(subjectErr)}
                className={cn(
                  "mt-1 h-8 w-full rounded-[var(--radius-sm)] border bg-[var(--color-bg)] px-2 text-[12px] focus:outline-none",
                  subjectErr
                    ? "border-[var(--color-accent)] focus:border-[var(--color-accent)]"
                    : "border-[var(--color-border)] focus:border-[var(--color-border-strong)]",
                )}
              />
              <FieldError>{subjectErr}</FieldError>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Label
              </label>
              <input
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  if (labelErr) setLabelErr(null);
                }}
                placeholder="staging"
                aria-invalid={Boolean(labelErr)}
                className={cn(
                  "mt-1 h-8 w-full rounded-[var(--radius-sm)] border bg-[var(--color-bg)] px-2 text-[12px] focus:outline-none",
                  labelErr
                    ? "border-[var(--color-accent)] focus:border-[var(--color-accent)]"
                    : "border-[var(--color-border)] focus:border-[var(--color-border-strong)]",
                )}
              />
              <FieldError>{labelErr}</FieldError>
            </div>
            <button
              type="button"
              onClick={addRule}
              className="mt-[19px] inline-flex h-8 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 text-[12px] hover:border-[var(--color-text)]"
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

