/**
 * Tiny client-side HTML sanitizer for CMS-authored rich text.
 *
 * Event descriptions are written in the admin rich-text editor and
 * stored as HTML. Rendering them as plain text shows literal "<p>"
 * tags; rendering them raw would be an XSS hole if an admin account
 * were ever compromised. This strips the dangerous bits (script /
 * iframe / object / embed / form tags, on* event handlers, and
 * javascript: URLs) while leaving normal markup (p, a, strong, ul…)
 * intact for `dangerouslySetInnerHTML`.
 *
 * Not a general-purpose sanitizer — content here is semi-trusted
 * (editors only). If user-generated HTML ever lands on these pages,
 * switch to DOMPurify.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return String(html)
    // <script>…</script> including any nested "<" inside the body
    .replace(/<script\b[^<]*(?:(?!<\/script\s*>)<[^<]*)*<\/script\s*>/gi, "")
    // any stray opening/closing tags of dangerous elements
    .replace(/<\/?(script|iframe|object|embed|form|style|link|meta)\b[^>]*>/gi, "")
    // inline event handlers: onclick="…", onerror='…', onload=foo
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // javascript: URLs in href/src
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'\s>]*\2/gi, '$1="#"');
}

/** True when a string contains HTML tags (vs. plain text with newlines). */
export function looksLikeHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?[a-z][^>]*>/i.test(value);
}

/**
 * Strip ALL tags → plain text. For meta descriptions, card excerpts,
 * and anywhere markup must never leak through.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
