/**
 * Where a homepage section's "view all" goes.
 *
 * The rule is small but it is the difference between a front page that
 * works and one that dead-ends: the beat bands shipped for months with no
 * view-all link at all, and the bands that did have one pointed every
 * beat at /news.
 *
 * Order of preference:
 *   1. viewMoreUrl — an editor said explicitly where this band leads.
 *   2. the section's own category, as the bare slug. /construction is the
 *      canonical category URL; /category/construction only exists to 301
 *      onto it, so linking there would cost every reader a redirect.
 *   3. /news, and only for a band that has no beat at all.
 */
export interface SectionLinkTarget {
  viewMoreUrl?: string | null;
  categorySlug?: string | null;
}

export function sectionHref(section: SectionLinkTarget): string {
  if (section.viewMoreUrl) return section.viewMoreUrl;
  if (section.categorySlug) return `/${section.categorySlug}`;
  return "/news";
}
