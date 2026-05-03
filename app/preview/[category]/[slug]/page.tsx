import { notFound } from "next/navigation";
import { REGISTRY, findEntry } from "@/lib/registry";

/**
 * Preview route — renders the showcase component bare, with no catalogue
 * shell (no running head, no crosshairs, no colophon, no marginalia panel).
 * Used by `scripts/snap.ts` to generate the homepage / OG-image thumbnails
 * via Playwright. Not linked from the public navigation.
 *
 * Inherits the global `Providers` (theme, command palette) from the root
 * layout so next-themes still drives light/dark via `prefers-color-scheme`,
 * which is what Playwright's `emulateMedia` toggles during snapping.
 */

type Params = { category: string; slug: string };

export function generateStaticParams(): Params[] {
  return REGISTRY.map((e) => ({ category: e.category, slug: e.slug }));
}

export const metadata = {
  // Preview routes are crawler-invisible — they're internal infrastructure
  // for the snap pipeline, not user-facing content.
  robots: { index: false, follow: false },
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { category, slug } = await params;
  const entry = findEntry(category, slug);
  if (!entry) notFound();

  const Loaded = (await entry.load()).default;

  return (
    <div className="h-dvh w-dvw overflow-hidden">
      <Loaded />
    </div>
  );
}
