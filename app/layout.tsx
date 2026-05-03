import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Fraunces — display only. SOFT axis is the parametric ink-spread slider that
// pairs with our halftone language. opsz is also brought in so headlines at
// >= 4xl get the high-optical-size cut.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const SITE_NAME = "V's Component Gallery";
const SITE_URL = ">>> SITE_URL <<<";
const AUTHOR = "Vinson";

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
    { media: "(prefers-color-scheme: light)", color: "#f5efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#231d18" },
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
