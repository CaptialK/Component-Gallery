import Link from "next/link";
import { totals } from "@/lib/registry";

export function SiteFooter() {
  const { files, folders } = totals();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-[var(--color-border)]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2 px-4 py-8 text-xs text-[var(--color-text-muted)] md:flex-row md:items-center md:justify-between md:px-6">
        <div className="font-mono">
          {files} files · {folders} folders
        </div>
        <div className="flex items-center gap-3">
          <span>
            {`built by `}
            <span className="text-[var(--color-text)]">
              Vinson
            </span>
          </span>
          <span aria-hidden>·</span>
          <span>{year}</span>
          <span aria-hidden>·</span>
          <Link
            href="https://github.com/CapitalK"
            className="hover:text-[var(--color-text)]"
          >
            github
          </Link>
        </div>
      </div>
    </footer>
  );
}
