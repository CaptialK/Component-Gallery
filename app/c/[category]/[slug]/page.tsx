import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { REGISTRY, findEntry } from "@/lib/registry";
import { loadSource } from "@/lib/source-loader";
import { SourceViewer } from "@/components/_kit/source-viewer";
import { ComponentPageShell } from "./shell";

type Params = { category: string; slug: string };

export function generateStaticParams(): Params[] {
  return REGISTRY.map((e) => ({ category: e.category, slug: e.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { category, slug } = await params;
  const entry = findEntry(category, slug);
  if (!entry) return { title: "Not found" };

  const ogImage = `/previews/${entry.category}__${entry.slug}--light.png`;
  const title = `${entry.title} · ${entry.category}`;

  return {
    title,
    description: entry.description,
    openGraph: {
      title,
      description: entry.description,
      images: [{ url: ogImage, width: 1200, height: 800, alt: entry.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: entry.description,
      images: [ogImage],
    },
    alternates: {
      canonical: `/c/${entry.category}/${entry.slug}`,
    },
  };
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { category, slug } = await params;
  const entry = findEntry(category, slug);
  if (!entry) notFound();

  const Loaded = (await entry.load()).default;
  const source = await loadSource(entry);

  return (
    <ComponentPageShell
      entry={{
        category: entry.category,
        slug: entry.slug,
        title: entry.title,
        filename: entry.filename,
      }}
      source={<SourceViewer code={source} />}
    >
      <Loaded />
    </ComponentPageShell>
  );
}
