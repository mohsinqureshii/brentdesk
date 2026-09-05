/**
 * A search snippet, with the reader's words marked in it.
 *
 * The server sends the passage and a list of [start, end) offsets rather
 * than HTML with <mark> tags in it, so nothing from an article body is
 * ever interpolated as markup — the offsets are the only thing trusted,
 * and they are clamped here before use. That is the difference between
 * highlighting a search result and shipping an XSS.
 *
 * Offsets are character indices into `text`, and both come from the same
 * fold-with-a-map pass in shared/search.ts, so a mark lands on the
 * reader's own spelling — الأسعار stays الأسعار, not the folded form the
 * match was found in.
 */

export interface SnippetShape {
  text: string;
  marks: [number, number][];
  leadingEllipsis?: boolean;
  trailingEllipsis?: boolean;
}

export function SnippetText({
  snippet,
  className = "",
}: {
  snippet: SnippetShape | null | undefined;
  className?: string;
}) {
  if (!snippet?.text) return null;

  const { text } = snippet;
  const parts: { text: string; mark: boolean }[] = [];
  let cursor = 0;

  for (const [rawStart, rawEnd] of snippet.marks ?? []) {
    const start = Math.max(cursor, Math.min(rawStart, text.length));
    const end = Math.max(start, Math.min(rawEnd, text.length));
    if (end <= start) continue;
    if (start > cursor) parts.push({ text: text.slice(cursor, start), mark: false });
    parts.push({ text: text.slice(start, end), mark: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), mark: false });

  return (
    <p className={className}>
      {snippet.leadingEllipsis && <span aria-hidden>… </span>}
      {parts.map((part, i) =>
        part.mark ? (
          <mark key={i} className="bg-primary/15 text-foreground font-semibold px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
      {snippet.trailingEllipsis && <span aria-hidden> …</span>}
    </p>
  );
}

export default SnippetText;
