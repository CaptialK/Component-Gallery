"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { CommandPaletteProvider } from "@/components/_kit/command-palette";
import { ToastProvider } from "@/components/_kit/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  // The bare /preview route (consumed by `scripts/snap.ts`) must render with
  // no site chrome — no toast viewport, no command-palette dialog/keybinding.
  // Pure preview = the plate alone, on paper. Theme provider stays so
  // Playwright's `emulateMedia({ colorScheme })` still drives light/dark.
  const pathname = usePathname();
  const isPreview = pathname?.startsWith("/preview") ?? false;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {isPreview ? (
        children
      ) : (
        <ToastProvider>
          <CommandPaletteProvider>{children}</CommandPaletteProvider>
        </ToastProvider>
      )}
    </ThemeProvider>
  );
}
