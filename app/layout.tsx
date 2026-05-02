import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const SITE_NAME = ">>> SITE_NAME <<<";
const SITE_URL = ">>> SITE_URL <<<";
const AUTHOR = ">>> AUTHOR_NAME <<<";

export const metadata: Metadata = {
  metadataBase: new URL(
    SITE_URL.startsWith("http") ? SITE_URL : "https://example.com",
  ),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "A gallery of hand-designed SaaS UI components — paper-toned surfaces with a pointillism accent.",
  authors: [{ name: AUTHOR }],
  creator: AUTHOR,
  openGraph: {
    type: "website",
    title: SITE_NAME,
    siteName: SITE_NAME,
    description:
      "A gallery of hand-designed SaaS UI components — paper-toned surfaces with a pointillism accent.",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    creator: AUTHOR,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1612" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
