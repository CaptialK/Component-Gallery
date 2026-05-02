"use client";

import { ThemeProvider } from "next-themes";
import { CommandPaletteProvider } from "@/components/_kit/command-palette";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <CommandPaletteProvider>{children}</CommandPaletteProvider>
    </ThemeProvider>
  );
}
