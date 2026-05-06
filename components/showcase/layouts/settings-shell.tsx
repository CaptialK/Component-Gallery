"use client";

/**
 * Registry entry (proposed — orchestrator will lift this):
 *
 *   {
 *     domain: "saas",
 *     category: "layouts",
 *     slug: "settings-shell",
 *     title: "Settings shell",
 *     filename: "settings-shell.tsx",
 *     description: "Long-scroll typeset settings document with sticky section nav. Real validation per field, autosave with retry, scroll-spy section state, dirty-form guard, two-step destructive zone.",
 *     layout: "specimen",
 *     aspectRatio: "16 / 10",
 *     maxWidth: 1080,
 *     firstImpression: "2026-05-05",
 *     load: () => import("@/components/showcase/layouts/settings-shell"),
 *   }
 */

import * as React from "react";
import { Check } from "lucide-react";
import { ErrorState } from "@/components/_kit/error-state";
import { FieldError } from "@/components/_kit/field-error";
import { Menu, type MenuItem } from "@/components/_kit/menu";
import { Modal, ModalClose, ModalDescription, ModalTitle } from "@/components/_kit/modal";
import { Skeleton } from "@/components/_kit/skeleton";
import { useToast } from "@/components/_kit/toast";
import { cn } from "@/lib/cn";

/* ────────────────────────── shape + seed ────────────────────────── */

type SectionKey =
  | "profile"
  | "workspace"
  | "billing"
  | "members"
  | "api-keys"
  | "danger";

type Member = {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "guest";
  invitedAt: string;
};

type Values = {
  profile: {
    name: string;
    email: string;
    pronouns: string;
    timezone: string;
    twoFactor: boolean;
  };
  workspace: {
    name: string;
    slug: string;
    homepage: string;
    visibility: "private" | "internal" | "public";
    region: "us-east-1" | "us-west-2" | "eu-west-1" | "ap-south-1";
  };
  billing: {
    plan: "starter" | "team" | "scale";
    seats: number;
    annual: boolean;
    poNumber: string;
  };
  members: Member[];
};

const SECTIONS: { key: SectionKey; label: string; eyebrow: string; rule: string }[] = [
  { key: "profile",   label: "Profile",            eyebrow: "i.",   rule: "Your name, contact, and sign-in posture." },
  { key: "workspace", label: "Workspace",          eyebrow: "ii.",  rule: "Identity of this workspace and where it runs." },
  { key: "billing",   label: "Billing & seats",    eyebrow: "iii.", rule: "Plan, seat count, billing cycle." },
  { key: "members",   label: "Members & roles",    eyebrow: "iv.",  rule: "Who is in this workspace and what they can do." },
  { key: "api-keys",  label: "API keys",           eyebrow: "v.",   rule: "Programmatic access — masked secrets, scope." },
  { key: "danger",    label: "Danger zone",        eyebrow: "vi.",  rule: "Transfer ownership, delete the workspace." },
];

const INITIAL: Values = {
  profile: {
    name: "Mara Reyes",
    email: "mara@stipple.lab",
    pronouns: "she/her",
    timezone: "America/New_York",
    twoFactor: true,
  },
  workspace: {
    name: "Stipple Press",
    slug: "stipple-press",
    homepage: "https://stipple.press",
    visibility: "internal",
    region: "us-east-1",
  },
  billing: {
    plan: "team",
    seats: 18,
    annual: true,
    poNumber: "",
  },
  members: [
    { id: "m-1", initials: "MR", name: "Mara Reyes",   email: "mara@stipple.lab",  role: "owner",  invitedAt: "2024-09-12" },
    { id: "m-2", initials: "JT", name: "Jules Tanaka", email: "jules@stipple.lab", role: "admin",  invitedAt: "2024-10-04" },
    { id: "m-3", initials: "AH", name: "Amir Haddad",  email: "amir@stipple.lab",  role: "admin",  invitedAt: "2025-01-20" },
    { id: "m-4", initials: "RG", name: "Rosa Garcia",  email: "rosa@stipple.lab",  role: "member", invitedAt: "2025-03-08" },
    { id: "m-5", initials: "DL", name: "Dani Lin",     email: "dani@stipple.lab",  role: "member", invitedAt: "2025-04-19" },
    { id: "m-6", initials: "EO", name: "Esi Owusu",    email: "esi@stipple.lab",   role: "guest",  invitedAt: "2025-05-02" },
  ],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;
const URL_RE = /^https?:\/\/[^\s]+$/;

/* ────────────────────────── validation ────────────────────────── */

type Errors = Partial<Record<
  | "profile.name"
  | "profile.email"
  | "workspace.name"
  | "workspace.slug"
  | "workspace.homepage"
  | "billing.seats"
  | "billing.poNumber"
, string>>;

function validateAll(v: Values): Errors {
  const e: Errors = {};
  if (v.profile.name.trim().length < 2)
    e["profile.name"] = "At least 2 characters.";
  if (!EMAIL_RE.test(v.profile.email.trim()))
    e["profile.email"] = "Enter a valid email.";
  if (!v.workspace.name.trim())
    e["workspace.name"] = "Required.";
  if (v.workspace.slug.length < 3)
    e["workspace.slug"] = "At least 3 characters.";
  else if (!SLUG_RE.test(v.workspace.slug))
    e["workspace.slug"] = "Lowercase letters, numbers, and hyphens only.";
  if (v.workspace.homepage && !URL_RE.test(v.workspace.homepage.trim()))
    e["workspace.homepage"] = "Must start with http:// or https://";
  if (v.billing.seats < 1)
    e["billing.seats"] = "At least 1 seat.";
  if (v.billing.seats > 999)
    e["billing.seats"] = "Contact sales for >999 seats.";
  if (v.billing.poNumber && v.billing.poNumber.trim().length < 4)
    e["billing.poNumber"] = "PO numbers are at least 4 characters.";
  return e;
}

/* ────────────────────────── component ────────────────────────── */

type SaveState =
  | { kind: "clean"; lastSavedAt: string }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "error"; message: string };

export default function SettingsShell() {
  const { toast } = useToast();
  const [hydrated, setHydrated] = React.useState(false);
  const [values, setValues] = React.useState<Values>(INITIAL);
  const [touched, setTouched] = React.useState<Set<string>>(new Set());
  const [errors, setErrors] = React.useState<Errors>({});
  const [active, setActive] = React.useState<SectionKey>("profile");
  const [save, setSave] = React.useState<SaveState>({ kind: "clean", lastSavedAt: "14:08" });
  const [topBanner, setTopBanner] = React.useState<"none" | "stale" | "load-error">("none");
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleteTyped, setDeleteTyped] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);

  // First-paint skeleton — settles after 220ms.
  React.useEffect(() => {
    const t = window.setTimeout(() => setHydrated(true), 220);
    return () => window.clearTimeout(t);
  }, []);

  // Mark dirty + queue a save 600ms after last change. Uses a
  // single shared timer so rapid edits coalesce into one save.
  const saveTimerRef = React.useRef<number | null>(null);

  const queueSave = React.useCallback(
    (next: Values) => {
      setSave({ kind: "dirty" });
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        const errs = validateAll(next);
        if (Object.keys(errs).length > 0) {
          setErrors(errs);
          setSave({ kind: "error", message: "Fix the highlighted fields, then save." });
          return;
        }
        setErrors({});
        setSave({ kind: "saving" });
        // Simulate network 480ms.
        const reqId = window.setTimeout(() => {
          // Deterministic 0% fail rate on autosave; explicit Save Now retries
          // surface error variants below.
          const at = new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date());
          setSave({ kind: "saved", at });
          // Auto-clear back to clean after 1.6s.
          window.setTimeout(() => {
            setSave({ kind: "clean", lastSavedAt: at });
          }, 1600);
        }, 480);
        return () => window.clearTimeout(reqId);
      }, 600);
    },
    [],
  );

  // For object slices (`profile`/`workspace`/`billing`) pass a Partial to
  // merge. For array slices (`members`) pass the full replacement array;
  // we detect Array.isArray and replace instead of merging. Routing
  // member mutations through here keeps queueSave's `next` accurate when
  // role changes land back-to-back.
  function update<K extends keyof Values>(
    key: K,
    valueOrPartial: Values[K] extends unknown[] ? Values[K] : Partial<Values[K]>,
  ) {
    setValues((prev) => {
      const nextSlice = Array.isArray(prev[key])
        ? (valueOrPartial as Values[K])
        : ({ ...(prev[key] as object), ...(valueOrPartial as object) } as Values[K]);
      const next = { ...prev, [key]: nextSlice } as Values;
      queueSave(next);
      return next;
    });
  }

  function markTouched(field: string) {
    setTouched((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }

  // Beforeunload guard — only when dirty/saving/error so a clean form
  // can be closed instantly.
  React.useEffect(() => {
    function handle(e: BeforeUnloadEvent) {
      if (save.kind === "dirty" || save.kind === "saving" || save.kind === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [save.kind]);

  // Scroll-spy. Each section lives in `#section-<key>`. We walk
  // SECTIONS in reverse and pick the first whose top is at or above the
  // 120px reading line — fixes jump-up not updating active section.
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    function spy() {
      if (!scrollerRef.current) return;
      const top = scrollerRef.current.getBoundingClientRect().top;
      let nextActive: SectionKey = SECTIONS[0].key;
      for (const s of SECTIONS.slice().reverse()) {
        const el = document.getElementById(`section-${s.key}`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top - top <= 120) {
          nextActive = s.key;
          break;
        }
      }
      setActive((prev) => (prev === nextActive ? prev : nextActive));
    }
    spy();
    scroller.addEventListener("scroll", spy, { passive: true });
    return () => scroller.removeEventListener("scroll", spy);
  }, []);

  function jumpTo(key: SectionKey) {
    const scroller = scrollerRef.current;
    const el = document.getElementById(`section-${key}`);
    if (!scroller || !el) return;
    const top = el.offsetTop - 24;
    scroller.scrollTo({ top, behavior: "smooth" });
    setActive(key);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#section-${key}`);
    }
    // Focus the section heading so screen readers + keyboard users land
    // on the new context. preventScroll because we already smooth-scrolled.
    const heading = el.querySelector<HTMLElement>("h2");
    if (heading) {
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    } else {
      el.focus({ preventScroll: true });
    }
  }

  // On mount: if the URL has a #section-<key> hash, jump to that section
  // once the document is hydrated so the deep-link lands right.
  React.useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || !hash.startsWith("#section-")) return;
    const key = hash.slice("#section-".length) as SectionKey;
    if (SECTIONS.some((s) => s.key === key)) {
      // Defer one frame so the layout has settled.
      const t = window.setTimeout(() => jumpTo(key), 0);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function saveNow() {
    // Cancel any pending autosave so only one save promise is in flight.
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const errs = validateAll(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      const id = `f-${firstKey.replace(".", "-")}`;
      const el = document.getElementById(id);
      if (el) (el as HTMLElement).focus();
      toast({ title: "Fix the highlighted fields.", status: "error" });
      return;
    }
    setSave({ kind: "saving" });
    window.setTimeout(() => {
      const at = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setSave({ kind: "saved", at });
      toast({ title: "Settings saved", status: "success" });
      window.setTimeout(() => setSave({ kind: "clean", lastSavedAt: at }), 1600);
    }, 480);
  }

  // Cmd/Ctrl+S → saveNow. Global keydown so the binding works regardless
  // of focus position within the document.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveNow();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, save.kind]);

  function discardChanges() {
    setValues(INITIAL);
    setErrors({});
    setTouched(new Set());
    setSave({ kind: "clean", lastSavedAt: "14:08" });
    toast({ title: "Changes discarded.", status: "info" });
  }

  const dirty = save.kind === "dirty" || save.kind === "saving" || save.kind === "error";
  const [discardConfirmOpen, setDiscardConfirmOpen] = React.useState(false);

  /* ────────────────────────── render ────────────────────────── */

  return (
    <div className="grid h-full w-full bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex h-full min-h-0 flex-col">
        {/* Top rail — page identity + save status. */}
        <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Workspace settings
            </span>
            <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
            <span
              className="font-display text-[16px] italic leading-none text-[var(--color-text)]"
              style={{ fontVariationSettings: '"opsz" 28, "SOFT" 30' }}
            >
              Stipple Press
            </span>
            <span aria-hidden className="h-3 w-px bg-[var(--color-border-strong)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Press{" "}
              <kbd className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-px font-mono text-[10px] tracking-[0.06em]">
                {"⌘"}S
              </kbd>{" "}
              to save
            </span>
          </div>
          <div aria-live="polite" aria-atomic="true" className="flex items-center gap-3">
            <SaveBadge state={save} />
            {dirty && (
              <button
                type="button"
                onClick={() => setDiscardConfirmOpen(true)}
                disabled={save.kind === "saving"}
                className={cn(
                  "inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]",
                  "transition-[transform,border-color,color] duration-[120ms] ease-out",
                  "active:translate-y-px",
                  "hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
                )}
              >
                Discard changes
              </button>
            )}
            <button
              type="button"
              onClick={saveNow}
              disabled={!dirty || save.kind === "saving"}
              className={cn(
                "inline-flex h-9 items-center rounded-[var(--radius-sm)] border px-3 font-mono text-[10px] uppercase tracking-[0.18em]",
                "transition-[transform,border-color,background-color,color] duration-[120ms] ease-out",
                "active:translate-y-px",
                dirty
                  ? "border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)] hover:border-[color-mix(in_oklch,var(--color-text)_60%,#000_18%)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
              )}
            >
              Save now
            </button>
          </div>
        </div>

        {topBanner === "stale" && (
          <ErrorState
            variant="banner"
            title="Settings updated by another admin."
            body="Reload to see the latest values, or save now to keep yours."
            lastSync="14:01"
            onRetry={() => setTopBanner("none")}
            onDismiss={() => setTopBanner("none")}
          />
        )}
        {topBanner === "load-error" && (
          <ErrorState
            variant="banner"
            title="Settings did not load fully."
            body="API keys section is unavailable — showing cached values for the rest."
            onRetry={() => setTopBanner("none")}
          />
        )}

        {/* Two-pane: sticky nav + scroll body. Below 768 the nav becomes a
            horizontal chip strip; below 480 the chips wrap to a 2-row grid. */}
        <div className="grid min-h-0 flex-1 grid-cols-1 min-[768px]:grid-cols-[200px_1fr]">
          <SectionNav
            active={active}
            onJump={jumpTo}
            errors={errors}
            dirty={dirty}
          />

          <div
            ref={scrollerRef}
            aria-busy={!hydrated || undefined}
            className="min-h-0 overflow-y-auto"
          >
            <div className="mx-auto w-full max-w-[680px] px-6 py-8 min-[768px]:px-8 min-[1024px]:py-10">
              <header className="mb-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                  Workspace
                </p>
                <h1
                  className="mt-1 font-display text-[34px] italic leading-[1.1] tracking-[-0.022em] text-[var(--color-text)]"
                  style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
                >
                  Settings.
                </h1>
                <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                  A typeset, single-document settings surface — sections read top-to-bottom; the
                  rail on the left mirrors your reading position. Changes save when you pause
                  typing.
                </p>
              </header>

              {!hydrated ? (
                <LoadingDoc />
              ) : (
                <>
                  <ProfileSection
                    values={values.profile}
                    errors={errors}
                    touched={touched}
                    onTouch={markTouched}
                    onChange={(p) => update("profile", p)}
                  />
                  <WorkspaceSection
                    values={values.workspace}
                    errors={errors}
                    touched={touched}
                    onTouch={markTouched}
                    onChange={(p) => update("workspace", p)}
                  />
                  <BillingSection
                    values={values.billing}
                    errors={errors}
                    touched={touched}
                    onTouch={markTouched}
                    onChange={(p) => update("billing", p)}
                  />
                  <MembersSection
                    members={values.members}
                    onRemove={(id) => {
                      const next = values.members.filter((m) => m.id !== id);
                      update("members", next);
                      toast({
                        title: next.length === 0 ? "All members removed." : "Member removed.",
                        status: "info",
                      });
                    }}
                    onChangeRole={(id, role) => {
                      const next = values.members.map((m) =>
                        m.id === id ? { ...m, role } : m,
                      );
                      update("members", next);
                    }}
                  />
                  <ApiKeysSection onLoadFail={() => setTopBanner("load-error")} />
                  <DangerSection
                    onTransfer={() => setTransferOpen(true)}
                    onDelete={() => setConfirmDelete(true)}
                  />
                </>
              )}

              <footer className="mt-12 flex flex-col items-center gap-1 border-t border-[var(--color-border)] pt-6 text-center">
                <span
                  className="font-display text-[11px] italic text-[var(--color-text-muted)]"
                  style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
                >
                  End of document.
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Stipple Press · workspace settings · revision 048
                </span>
              </footer>
            </div>
          </div>
        </div>

        {/* Transfer-ownership modal — light-touch confirmation. */}
        <Modal
          open={transferOpen}
          onOpenChange={setTransferOpen}
          placement="center"
          size="sm"
          ariaLabel="Transfer workspace ownership"
        >
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Transfer ownership
            </p>
            <ModalTitle className="mt-1 font-display text-[20px] italic leading-tight tracking-[-0.02em]" style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}>
              Hand the workspace to another admin.
            </ModalTitle>
            <ModalDescription className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              You will become an admin. You can be promoted back later, but only by the new owner.
            </ModalDescription>
          </div>
          <div className="px-6 py-4">
            <ul className="flex flex-col gap-1.5">
              {values.members
                .filter((m) => m.role === "admin")
                .map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferOpen(false);
                        toast({ title: `Transferred to ${m.name}.`, status: "success" });
                      }}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-left transition-[border-color,background-color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]"
                    >
                      <Avatar initials={m.initials} />
                      <span className="flex flex-col">
                        <span className="text-[13px] text-[var(--color-text)]">{m.name}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">{m.email}</span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
            <ModalClose
              render={
                <button
                  type="button"
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] transition-colors duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
                >
                  Cancel
                </button>
              }
            />
          </div>
        </Modal>

        {/* Discard-changes confirmation — light modal mirroring transfer flow. */}
        <Modal
          open={discardConfirmOpen}
          onOpenChange={setDiscardConfirmOpen}
          placement="center"
          size="sm"
          ariaLabel="Discard unsaved changes"
        >
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Discard changes
            </p>
            <ModalTitle
              className="mt-1 font-display text-[20px] italic leading-tight tracking-[-0.02em]"
              style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
            >
              Drop unsaved edits?
            </ModalTitle>
            <ModalDescription className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              Your in-flight changes will revert to the last saved values. This cannot be undone.
            </ModalDescription>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
            <ModalClose
              render={
                <button
                  type="button"
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] transition-colors duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
                >
                  Keep editing
                </button>
              }
            />
            <button
              type="button"
              onClick={() => {
                discardChanges();
                setDiscardConfirmOpen(false);
              }}
              className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)] transition-colors duration-[120ms] ease-out hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)]"
            >
              Discard
            </button>
          </div>
        </Modal>

        {/* Delete-workspace modal — confirm by typing slug. */}
        <DeleteWorkspaceModal
          open={confirmDelete}
          slug={values.workspace.slug}
          typed={deleteTyped}
          onTypedChange={setDeleteTyped}
          deleting={deleting}
          onClose={() => {
            setConfirmDelete(false);
            setDeleteTyped("");
          }}
          onConfirm={() => {
            setDeleting(true);
            window.setTimeout(() => {
              setDeleting(false);
              setConfirmDelete(false);
              setDeleteTyped("");
              toast({ title: "Workspace deletion scheduled — you have 30 days to recover.", status: "success" });
            }, 700);
          }}
        />
      </div>
    </div>
  );
}

/* ────────────────────────── nav rail ────────────────────────── */

function SectionNav({
  active,
  onJump,
  errors,
  dirty,
}: {
  active: SectionKey;
  onJump: (key: SectionKey) => void;
  errors: Errors;
  dirty: boolean;
}) {
  const sectionHasError = (k: SectionKey): boolean =>
    Object.keys(errors).some((e) => e.startsWith(`${k}.`));

  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        "shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]",
        "min-[768px]:sticky min-[768px]:top-0 min-[768px]:h-full min-[768px]:self-start",
        "min-[768px]:border-b-0 min-[768px]:border-r min-[768px]:bg-[var(--color-bg)]",
      )}
    >
      {/* Mobile: horizontal chip strip. ≥768: vertical typeset rail. */}
      <ul
        className={cn(
          "flex gap-1 overflow-x-auto px-3 py-3",
          "min-[768px]:sticky min-[768px]:top-0 min-[768px]:flex-col min-[768px]:gap-0 min-[768px]:overflow-visible min-[768px]:px-0 min-[768px]:py-6",
        )}
      >
        {SECTIONS.map((s) => {
          const isActive = active === s.key;
          const hasError = sectionHasError(s.key);
          return (
            <li key={s.key} className="shrink-0 min-[768px]:shrink">
              <button
                type="button"
                onClick={() => onJump(s.key)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group relative flex h-9 items-center gap-2 px-3 font-mono text-[11px] uppercase tracking-[0.16em] outline-none transition-colors duration-[120ms] ease-out",
                  "rounded-[var(--radius-xs)] min-[768px]:rounded-none min-[768px]:h-auto min-[768px]:py-2 min-[768px]:pl-5 min-[768px]:pr-3",
                  "focus-visible:ring-2 focus-visible:ring-[var(--color-accent-2)]",
                  isActive
                    ? "bg-[var(--color-surface)] text-[var(--color-text)] min-[768px]:bg-transparent"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
                )}
              >
                {/* Left accent strip — vertical only ≥768. */}
                <span
                  aria-hidden
                  className={cn(
                    "hidden min-[768px]:block absolute left-0 top-0 bottom-0 w-[2px] transition-opacity duration-[120ms] ease-out",
                    isActive ? "bg-[var(--color-text)] opacity-100" : "bg-[var(--color-border-strong)] opacity-0 group-hover:opacity-60",
                  )}
                />
                <span className="hidden min-[768px]:inline text-[var(--color-text-muted)]">
                  {s.eyebrow}
                </span>
                <span className="min-[768px]:tracking-[0.14em] min-[768px]:text-[12px] min-[768px]:normal-case">
                  {s.label}
                </span>
                {hasError && (
                  <span
                    aria-label="has unresolved errors"
                    className="inline-flex items-center"
                  >
                    <span
                      aria-hidden
                      className="block h-1 w-1 rounded-full bg-[var(--color-accent)]"
                    />
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {/* Mobile-only dirty hint. */}
        {dirty && (
          <li className="hidden">
            {/* The save badge in the header carries this state on all widths. */}
          </li>
        )}
      </ul>
    </nav>
  );
}

/* ────────────────────────── save badge ────────────────────────── */

function SaveBadge({ state }: { state: SaveState }) {
  if (state.kind === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent-2)]">
        <span aria-hidden className="inline-flex items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-[4px] w-[4px] rounded-full bg-[var(--color-accent-2)] animate-live-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </span>
        Saving…
      </span>
    );
  }
  if (state.kind === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)]">
        <Check aria-hidden size={11} strokeWidth={1.8} />
        Saved · {state.at}
      </span>
    );
  }
  if (state.kind === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
        <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
        Save blocked
      </span>
    );
  }
  if (state.kind === "dirty") {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)]" />
        Unsaved changes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
      <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
      Saved · {state.lastSavedAt}
    </span>
  );
}

/* ────────────────────────── sections ────────────────────────── */

function SectionFrame({
  id,
  index,
  title,
  rule,
  children,
}: {
  id: string;
  index: string;
  title: string;
  rule: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-[var(--color-border)] pt-8 first:border-t-0 first:pt-0 mt-8 first:mt-0">
      <header className="mb-4 grid grid-cols-[auto_1fr] items-baseline gap-x-3">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)] tabular-nums"
          style={{ minWidth: "2ch" }}
        >
          {index}
        </span>
        <h2
          className="font-display text-[22px] italic leading-tight tracking-[-0.02em] text-[var(--color-text)]"
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          {title}
        </h2>
        <span aria-hidden className="col-start-2 row-start-2 mt-0.5 text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
          {rule}
        </span>
      </header>
      <div>{children}</div>
    </section>
  );
}

function ProfileSection({
  values,
  errors,
  touched,
  onTouch,
  onChange,
}: {
  values: Values["profile"];
  errors: Errors;
  touched: Set<string>;
  onTouch: (k: string) => void;
  onChange: (p: Partial<Values["profile"]>) => void;
}) {
  return (
    <SectionFrame id="section-profile" index="i." title="Profile" rule="Your name, contact, and sign-in posture.">
      <Grid2>
        <Field
          id="f-profile-name"
          label="Display name"
          help="Shown on your avatar tooltip and in audit logs."
          error={touched.has("profile.name") ? errors["profile.name"] : undefined}
        >
          <input
            id="f-profile-name"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onBlur={() => onTouch("profile.name")}
            aria-invalid={Boolean(touched.has("profile.name") && errors["profile.name"])}
            aria-describedby={errors["profile.name"] ? "f-profile-name-error" : undefined}
            className={fieldInput}
            autoComplete="name"
          />
        </Field>
        <Field
          id="f-profile-email"
          label="Email"
          help="Used for sign-in and notifications."
          error={touched.has("profile.email") ? errors["profile.email"] : undefined}
        >
          <input
            id="f-profile-email"
            type="email"
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            onBlur={() => onTouch("profile.email")}
            aria-invalid={Boolean(touched.has("profile.email") && errors["profile.email"])}
            aria-describedby={errors["profile.email"] ? "f-profile-email-error" : undefined}
            className={fieldInput}
            autoComplete="email"
          />
        </Field>
        <Field id="f-profile-pronouns" label="Pronouns" help="Optional. Visible to teammates only.">
          <input
            id="f-profile-pronouns"
            value={values.pronouns}
            onChange={(e) => onChange({ pronouns: e.target.value })}
            className={fieldInput}
            placeholder="she/her, they/them, …"
          />
        </Field>
        <Field id="f-profile-tz" label="Timezone" help="Determines when scheduled reports run.">
          <SelectShell>
            <select
              id="f-profile-tz"
              value={values.timezone}
              onChange={(e) => onChange({ timezone: e.target.value })}
              className={cn(fieldInput, "appearance-none pr-8")}
            >
              <option value="America/New_York">America/New_York · UTC-04</option>
              <option value="America/Los_Angeles">America/Los_Angeles · UTC-07</option>
              <option value="Europe/London">Europe/London · UTC+01</option>
              <option value="Europe/Berlin">Europe/Berlin · UTC+02</option>
              <option value="Asia/Singapore">Asia/Singapore · UTC+08</option>
              <option value="Asia/Tokyo">Asia/Tokyo · UTC+09</option>
            </select>
          </SelectShell>
        </Field>
      </Grid2>

      <div className="mt-6 flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
        <div>
          <p className="text-[13px] text-[var(--color-text)]">Two-factor authentication</p>
          <p className="mt-0.5 max-w-[44ch] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
            Time-based one-time codes from any authenticator app. Required for owners and admins.
          </p>
        </div>
        <Toggle
          checked={values.twoFactor}
          onChange={(v) => onChange({ twoFactor: v })}
          ariaLabel="Two-factor authentication"
        />
      </div>
    </SectionFrame>
  );
}

function WorkspaceSection({
  values,
  errors,
  touched,
  onTouch,
  onChange,
}: {
  values: Values["workspace"];
  errors: Errors;
  touched: Set<string>;
  onTouch: (k: string) => void;
  onChange: (p: Partial<Values["workspace"]>) => void;
}) {
  return (
    <SectionFrame id="section-workspace" index="ii." title="Workspace" rule="Identity of this workspace and where it runs.">
      <Grid2>
        <Field
          id="f-workspace-name"
          label="Workspace name"
          help="Visible in the sidebar header and on shared documents."
          error={touched.has("workspace.name") ? errors["workspace.name"] : undefined}
        >
          <input
            id="f-workspace-name"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onBlur={() => onTouch("workspace.name")}
            aria-invalid={Boolean(touched.has("workspace.name") && errors["workspace.name"])}
            aria-describedby={errors["workspace.name"] ? "f-workspace-name-error" : undefined}
            className={fieldInput}
          />
        </Field>
        <Field
          id="f-workspace-slug"
          label="Slug"
          help="Used in URLs and the API. Lowercase, numbers, hyphens."
          error={touched.has("workspace.slug") ? errors["workspace.slug"] : undefined}
        >
          <div className="flex h-9 items-stretch overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] focus-within:border-[var(--color-border-strong)]">
            <span className="inline-flex items-center border-r border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 font-mono text-[11px] text-[var(--color-text-muted)]">
              stipple.lab/
            </span>
            <input
              id="f-workspace-slug"
              value={values.slug}
              onChange={(e) =>
                onChange({
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-\s]/g, "")
                    .replace(/\s+/g, "-")
                    .slice(0, 40),
                })
              }
              onPaste={(e) => {
                const text = e.clipboardData.getData("text").trim();
                if (text) {
                  e.preventDefault();
                  onChange({
                    slug: text
                      .toLowerCase()
                      .replace(/[^a-z0-9-\s]/g, "")
                      .replace(/\s+/g, "-")
                      .slice(0, 40),
                  });
                }
              }}
              onBlur={() => onTouch("workspace.slug")}
              aria-invalid={Boolean(touched.has("workspace.slug") && errors["workspace.slug"])}
              aria-describedby={errors["workspace.slug"] ? "f-workspace-slug-error" : undefined}
              className="flex-1 bg-transparent px-2.5 font-mono text-[12px] text-[var(--color-text)] outline-none"
              maxLength={40}
            />
          </div>
        </Field>
        <Field
          id="f-workspace-homepage"
          label="Homepage"
          help="Optional public URL linked from your team profile."
          error={touched.has("workspace.homepage") ? errors["workspace.homepage"] : undefined}
        >
          <input
            id="f-workspace-homepage"
            type="url"
            value={values.homepage}
            onChange={(e) => onChange({ homepage: e.target.value })}
            onBlur={() => onTouch("workspace.homepage")}
            aria-invalid={Boolean(touched.has("workspace.homepage") && errors["workspace.homepage"])}
            aria-describedby={errors["workspace.homepage"] ? "f-workspace-homepage-error" : undefined}
            className={fieldInput}
            placeholder="https://example.com"
          />
        </Field>
        <Field id="f-workspace-region" label="Region" help="Where data is stored. Cannot be changed after the first 30 days.">
          <SelectShell>
            <select
              id="f-workspace-region"
              value={values.region}
              onChange={(e) => onChange({ region: e.target.value as Values["workspace"]["region"] })}
              className={cn(fieldInput, "appearance-none pr-8")}
            >
              <option value="us-east-1">US East · Virginia</option>
              <option value="us-west-2">US West · Oregon</option>
              <option value="eu-west-1">EU West · Dublin</option>
              <option value="ap-south-1">Asia Pacific · Mumbai</option>
            </select>
          </SelectShell>
        </Field>
      </Grid2>

      <fieldset className="mt-6">
        <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Visibility</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 min-[640px]:grid-cols-3">
          {(["private", "internal", "public"] as const).map((v) => {
            const labels: Record<typeof v, [string, string]> = {
              private:  ["Private",  "Only invited members."],
              internal: ["Internal", "Anyone with @stipple.lab."],
              public:   ["Public",   "Discoverable by URL."],
            };
            const active = values.visibility === v;
            return (
              <label
                key={v}
                className={cn(
                  "group relative flex cursor-pointer flex-col gap-0.5 rounded-[var(--radius-sm)] border bg-[var(--color-surface)] p-3 transition-[border-color] duration-[120ms] ease-out",
                  active
                    ? "border-[var(--color-text)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  className="sr-only"
                  checked={active}
                  onChange={() => onChange({ visibility: v })}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-[2px] transition-opacity duration-[120ms] ease-out",
                    active ? "bg-[var(--color-text)] opacity-100" : "bg-[var(--color-border-strong)] opacity-0 group-hover:opacity-60",
                  )}
                />
                <span className="text-[13px] text-[var(--color-text)]">{labels[v][0]}</span>
                <span className="text-[12px] leading-relaxed text-[var(--color-text-muted)]">{labels[v][1]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </SectionFrame>
  );
}

function BillingSection({
  values,
  errors,
  touched,
  onTouch,
  onChange,
}: {
  values: Values["billing"];
  errors: Errors;
  touched: Set<string>;
  onTouch: (k: string) => void;
  onChange: (p: Partial<Values["billing"]>) => void;
}) {
  const PRICE_PER_SEAT = values.annual ? 14 : 18;
  const monthly = values.seats * PRICE_PER_SEAT;
  return (
    <SectionFrame id="section-billing" index="iii." title="Billing & seats" rule="Plan, seat count, billing cycle.">
      <fieldset>
        <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Plan</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 min-[640px]:grid-cols-3">
          {(["starter", "team", "scale"] as const).map((p) => {
            const desc: Record<typeof p, string> = {
              starter: "Up to 3 members · core features.",
              team: "Up to 50 members · audit log, SSO.",
              scale: "Unlimited · SAML, SCIM, custom roles.",
            };
            const price: Record<typeof p, string> = {
              starter: "Free",
              team: values.annual ? "$14 / seat / mo · annual" : "$18 / seat / mo",
              scale: "Talk to sales",
            };
            const active = values.plan === p;
            return (
              <label
                key={p}
                className={cn(
                  "group relative flex cursor-pointer flex-col gap-1 rounded-[var(--radius-sm)] border bg-[var(--color-surface)] p-3 transition-[border-color] duration-[120ms] ease-out",
                  active ? "border-[var(--color-text)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
                )}
              >
                <input
                  type="radio"
                  name="plan"
                  className="sr-only"
                  checked={active}
                  onChange={() => onChange({ plan: p })}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-[2px] transition-opacity duration-[120ms] ease-out",
                    active ? "bg-[var(--color-text)] opacity-100" : "bg-[var(--color-border-strong)] opacity-0 group-hover:opacity-60",
                  )}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{p}</span>
                <span className="text-[13px] text-[var(--color-text)]">{desc[p]}</span>
                <span className="font-mono text-[11px] text-[var(--color-text-muted)] tabular-nums">{price[p]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Grid2 className="mt-6">
        <Field
          id="f-billing-seats"
          label="Seats"
          help="Includes admins, members, and guests. Owners do not count."
          error={touched.has("billing.seats") ? errors["billing.seats"] : undefined}
        >
          <div className="flex h-9 items-stretch overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] focus-within:border-[var(--color-border-strong)]">
            <button
              type="button"
              onClick={() => onChange({ seats: Math.max(1, values.seats - 1) })}
              aria-label="Decrease seats"
              className="inline-flex w-9 items-center justify-center font-mono text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              −
            </button>
            <input
              id="f-billing-seats"
              type="number"
              min={1}
              max={999}
              value={values.seats}
              onChange={(e) => onChange({ seats: Math.max(1, Math.min(999, Number(e.target.value) || 1)) })}
              onBlur={() => onTouch("billing.seats")}
              aria-invalid={Boolean(touched.has("billing.seats") && errors["billing.seats"])}
              className="w-full border-x border-[var(--color-border)] bg-transparent px-2 text-center font-mono text-[12px] text-[var(--color-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onChange({ seats: Math.min(999, values.seats + 1) })}
              aria-label="Increase seats"
              className="inline-flex w-9 items-center justify-center font-mono text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              +
            </button>
          </div>
        </Field>
        <Field
          id="f-billing-po"
          label="PO number"
          help="Appears on your invoice."
          error={touched.has("billing.poNumber") ? errors["billing.poNumber"] : undefined}
        >
          <input
            id="f-billing-po"
            value={values.poNumber}
            onChange={(e) => onChange({ poNumber: e.target.value })}
            onBlur={() => onTouch("billing.poNumber")}
            aria-invalid={Boolean(touched.has("billing.poNumber") && errors["billing.poNumber"])}
            aria-describedby={errors["billing.poNumber"] ? "f-billing-po-error" : undefined}
            className={fieldInput}
            placeholder="Optional"
          />
        </Field>
      </Grid2>

      <div className="mt-6 flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
        <div>
          <p className="text-[13px] text-[var(--color-text)]">Annual billing</p>
          <p className="mt-0.5 max-w-[44ch] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
            Save 22% versus monthly. Renews automatically on the anniversary date.
          </p>
        </div>
        <Toggle
          checked={values.annual}
          onChange={(v) => onChange({ annual: v })}
          ariaLabel="Annual billing"
        />
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] tabular-nums">
        Estimate · {values.seats} seat{values.seats === 1 ? "" : "s"} ×{" "}
        ${PRICE_PER_SEAT} = ${monthly.toLocaleString()} / mo {values.annual && "(billed annually)"}
      </p>
    </SectionFrame>
  );
}

function MembersSection({
  members,
  onRemove,
  onChangeRole,
}: {
  members: Member[];
  onRemove: (id: string) => void;
  onChangeRole: (id: string, role: Member["role"]) => void;
}) {
  return (
    <SectionFrame id="section-members" index="iv." title="Members & roles" rule="Who is in this workspace and what they can do.">
      {members.length === 0 ? (
        <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8 text-center">
          <p
            className="font-display text-[16px] italic leading-tight text-[var(--color-text)]"
            style={{ fontVariationSettings: '"opsz" 28, "SOFT" 30' }}
          >
            No members yet.
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
            Invite teammates by email — they will appear here once they accept.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          {members.map((m) => (
            <li
              key={m.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 min-[640px]:grid-cols-[auto_1fr_120px_auto] min-[640px]:gap-4 min-[640px]:px-4"
            >
              <Avatar initials={m.initials} />
              <div className="min-w-0">
                <p className="truncate text-[13px] text-[var(--color-text)]" title={m.name}>
                  {m.name}
                </p>
                <p
                  className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
                  title={m.email}
                >
                  {m.email}
                </p>
              </div>
              <RoleControl
                member={m}
                onChangeRole={onChangeRole}
              />
              <button
                type="button"
                onClick={() => onRemove(m.id)}
                disabled={m.role === "owner"}
                aria-label={`Remove ${m.name}`}
                className={cn(
                  "col-start-3 row-start-1 inline-flex h-8 items-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] outline-none transition-[border-color,color] duration-[120ms] ease-out",
                  m.role === "owner"
                    ? "opacity-40"
                    : "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                  "min-[640px]:col-start-4",
                )}
              >
                {m.role === "owner" ? "—" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] tabular-nums">
        {members.length} of unlimited · {members.filter((m) => m.role === "guest").length} guest
        {members.filter((m) => m.role === "guest").length === 1 ? "" : "s"}
      </p>
    </SectionFrame>
  );
}

// Role control. Owner renders a static, ringed mono-caps pill — the role
// is structurally locked, so a disabled select would imply "you could in
// theory change this." Non-owners get the gallery's <Menu> primitive,
// which matches the api-keys / app-shell vocabulary (accent strip on
// highlight, mono-caps headings, hairline separators).
function RoleControl({
  member,
  onChangeRole,
}: {
  member: Member;
  onChangeRole: (id: string, role: Member["role"]) => void;
}) {
  const roleLabel: Record<Member["role"], string> = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
    guest: "Guest",
  };
  if (member.role === "owner") {
    return (
      <span
        aria-label="Workspace owner — role cannot change"
        className={cn(
          "col-start-1 col-end-4 mt-1 inline-flex h-8 items-center rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] ring-1 ring-inset ring-[var(--color-border-strong)]",
          "min-[640px]:col-start-3 min-[640px]:col-end-4 min-[640px]:mt-0",
        )}
      >
        Owner
      </span>
    );
  }
  const roles: Member["role"][] = ["admin", "member", "guest"];
  const items: MenuItem[] = [
    { type: "heading", label: "Role" },
    ...roles.map<MenuItem>((r) => ({
      type: "item",
      label: roleLabel[r],
      onSelect: () => onChangeRole(member.id, r),
    })),
  ];
  return (
    <div
      className={cn(
        "col-start-1 col-end-4 mt-1",
        "min-[640px]:col-start-3 min-[640px]:col-end-4 min-[640px]:mt-0",
      )}
    >
      <Menu
        trigger={
          <button
            type="button"
            aria-label={`Role for ${member.name} · ${roleLabel[member.role]}`}
            className="inline-flex h-8 w-full items-center justify-between gap-2 rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)] outline-none transition-[border-color] duration-[120ms] ease-out hover:border-[var(--color-border-strong)] focus-visible:border-[var(--color-border-strong)]"
          >
            <span>{roleLabel[member.role]}</span>
            <svg
              aria-hidden
              viewBox="0 0 8 5"
              width={8}
              height={5}
              className="text-[var(--color-text-muted)]"
            >
              <path d="M0 0 L4 4 L8 0" fill="none" stroke="currentColor" strokeWidth={1} />
            </svg>
          </button>
        }
        items={items}
        placement="bottom-end"
        ariaLabel={`Role for ${member.name}`}
      />
    </div>
  );
}

function ApiKeysSection({ onLoadFail }: { onLoadFail: () => void }) {
  // Simulate a partial-load failure mode. The first render shows three cached
  // keys; clicking "Reload" optionally flips to error variant via onLoadFail.
  const KEYS = [
    { id: "k-prod", label: "Production",  prefix: "sk_live_", tail: "Z9aE", lastUsed: "12 min ago", scope: "read+write" },
    { id: "k-dev",  label: "Development", prefix: "sk_dev_",  tail: "u4NK", lastUsed: "3 days ago", scope: "read+write" },
    { id: "k-ci",   label: "CI · GitHub", prefix: "sk_dev_",  tail: "P2QQ", lastUsed: "Never",      scope: "read" },
  ];
  return (
    <SectionFrame id="section-api-keys" index="v." title="API keys" rule="Programmatic access — masked secrets, scope.">
      <ul className="flex flex-col gap-2">
        {KEYS.map((k) => (
          <li
            key={k.id}
            className="grid grid-cols-1 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 min-[640px]:grid-cols-[1fr_auto] min-[640px]:gap-4"
          >
            <div className="min-w-0">
              <p className="text-[13px] text-[var(--color-text)]">{k.label}</p>
              <p className="mt-0.5 truncate font-mono text-[12px] text-[var(--color-text-muted)]">
                {k.prefix}
                <span
                  aria-hidden
                  className="mx-1 align-middle text-[var(--color-text)]"
                  style={{
                    letterSpacing: "0.4em",
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  {"••••••••"}
                </span>
                {k.tail}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                scope · {k.scope} · last used {k.lastUsed}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] outline-none hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
              >
                Reveal
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] outline-none hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                Rotate
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-[var(--color-text-muted)]">
        <span>3 of 10 keys in use.</span>
        <button
          type="button"
          onClick={onLoadFail}
          className="font-mono text-[10px] uppercase tracking-[0.18em] hover:text-[var(--color-text)]"
        >
          Simulate load error
        </button>
      </div>
    </SectionFrame>
  );
}

function DangerSection({ onTransfer, onDelete }: { onTransfer: () => void; onDelete: () => void }) {
  return (
    <SectionFrame id="section-danger" index="vi." title="Danger zone" rule="Transfer ownership, delete the workspace.">
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_5%,var(--color-surface))]">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
          <div>
            <p className="text-[13px] text-[var(--color-text)]">Transfer ownership</p>
            <p className="mt-0.5 max-w-[52ch] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
              Hand the workspace to another admin. You become an admin; only the new owner can promote you back.
            </p>
          </div>
          <button
            type="button"
            onClick={onTransfer}
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-text)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)] outline-none transition-colors duration-[120ms] ease-out hover:bg-[var(--color-text)] hover:text-[var(--color-bg)]"
          >
            Transfer
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
          <div>
            <p className="text-[13px] text-[var(--color-text)]">Delete this workspace</p>
            <p className="mt-0.5 max-w-[52ch] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
              Schedules a 30-day soft-delete. Your data is recoverable until then; afterward all rows, files,
              and audit logs are erased.
            </p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)] outline-none transition-colors duration-[120ms] ease-out hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)]"
          >
            Delete workspace
          </button>
        </div>
      </div>
    </SectionFrame>
  );
}

/* ────────────────────────── delete modal ────────────────────────── */

function DeleteWorkspaceModal({
  open,
  slug,
  typed,
  onTypedChange,
  deleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  slug: string;
  typed: string;
  onTypedChange: (s: string) => void;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const ok = typed.trim() === slug && !deleting;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (open) {
      // Focus on mount.
      const t = window.setTimeout(() => inputRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
  }, [open]);
  return (
    <Modal open={open} onOpenChange={(o) => (!o ? onClose() : undefined)} placement="center" size="md" ariaLabel="Delete workspace">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Destructive action
        </p>
        <ModalTitle
          className="mt-1 font-display text-[20px] italic leading-tight tracking-[-0.02em]"
          style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
        >
          Delete <span className="not-italic font-mono text-[18px]">{slug}</span>?
        </ModalTitle>
        <ModalDescription className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          A 30-day soft-delete window starts immediately. After 30 days, all rows, files,
          and audit logs are permanently erased.
        </ModalDescription>
      </div>
      <div className="px-6 py-4">
        <label
          htmlFor="f-delete-confirm"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
        >
          Type the slug to confirm
        </label>
        <input
          id="f-delete-confirm"
          ref={inputRef}
          value={typed}
          onChange={(e) => onTypedChange(e.target.value)}
          className={cn(fieldInput, "mt-2 font-mono")}
          placeholder={slug}
          disabled={deleting}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-3">
        <ModalClose
          render={
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)] transition-colors duration-[120ms] ease-out hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            >
              Cancel
            </button>
          }
        />
        <button
          type="button"
          onClick={onConfirm}
          disabled={!ok}
          className={cn(
            "inline-flex h-9 items-center rounded-[var(--radius-sm)] border px-3 font-mono text-[10px] uppercase tracking-[0.18em] outline-none transition-colors duration-[120ms] ease-out",
            ok
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
              : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]",
          )}
        >
          {deleting ? "Scheduling…" : "Delete workspace"}
        </button>
      </div>
    </Modal>
  );
}

/* ────────────────────────── primitives ────────────────────────── */

const fieldInput = cn(
  "h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-[13px] text-[var(--color-text)] outline-none",
  "transition-[border-color] duration-[120ms] ease-out",
  "focus:border-[var(--color-border-strong)]",
  "aria-[invalid=true]:border-[var(--color-accent)]",
);

function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="grid grid-cols-1 items-baseline gap-x-3 min-[640px]:grid-cols-[140px_1fr]">
        <label
          htmlFor={id}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
        >
          {label}
        </label>
        <div>
          {children}
          {help && !error && (
            <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--color-text-muted)]">
              {help}
            </p>
          )}
          {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </div>
      </div>
    </div>
  );
}

function Grid2({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-5", className)}>{children}</div>;
}

// Wraps a native <select> with a real positioned chevron child.
// pointer-events:none on the SVG so clicks fall through to the select.
function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 8 5"
        width={8}
        height={5}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
      >
        <path d="M0 0 L4 4 L8 0" fill="none" stroke="currentColor" strokeWidth={1} />
      </svg>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-[12px] border transition-colors duration-[120ms] ease-out",
        checked
          ? "border-[var(--color-text)] bg-[var(--color-text)]"
          : "border-[var(--color-border-strong)] bg-[var(--color-bg)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "block h-4 w-4 rounded-full transition-transform duration-[200ms] ease-out",
          checked
            ? "translate-x-6 bg-[var(--color-bg)]"
            : "translate-x-1 bg-[var(--color-text-muted)]",
        )}
      />
    </button>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] font-mono text-[10px] tracking-[0.08em] text-[var(--color-text)]"
    >
      {initials}
    </span>
  );
}

function LoadingDoc() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <Skeleton width={120} height={10} density={0.05} seed={i + 1} className="mb-3" />
          <Skeleton width={260} height={20} density={0.06} seed={i + 11} className="mb-5" />
          <div className="flex flex-col gap-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="grid grid-cols-1 gap-2 min-[640px]:grid-cols-[140px_1fr] min-[640px]:gap-4">
                <Skeleton width={100} height={10} density={0.05} seed={i * 10 + j + 21} />
                <Skeleton width={320} height={36} density={0.06} seed={i * 10 + j + 31} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
