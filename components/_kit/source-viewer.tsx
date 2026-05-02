import "server-only";
import { codeToHtml } from "shiki";

/**
 * SourceViewer — server component. Renders highlighted .tsx using Shiki
 * with two themes (light/dark) so we follow next-themes without a re-render.
 */
export async function SourceViewer({
  code,
  lang = "tsx",
}: {
  code: string;
  lang?: string;
}) {
  const html = await codeToHtml(code, {
    lang,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
  });

  return (
    <div
      className="source-viewer h-full overflow-auto bg-[var(--color-surface)] font-mono text-[12.5px] leading-relaxed"
      // Shiki output is trusted (server-built from local files we control).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
