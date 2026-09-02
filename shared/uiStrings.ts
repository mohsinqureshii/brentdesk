/**
 * The site's own words.
 *
 * Everything a reader sees that is not article copy: navigation, buttons,
 * labels, the footer. Translating 268 articles and leaving "Share:" and
 * "Read more" in English produces a page that is Arabic in the middle and
 * English around the edges, which reads worse than either.
 *
 * The English here is the source of truth and the fallback. A locale
 * translates as much of it as it has, key by key, and anything untranslated
 * shows in English rather than showing a key.
 *
 * Keys are dotted and grouped by where the string appears, so a translator
 * working down the list moves through the page rather than through the
 * codebase.
 */

export const UI_STRINGS = {
  // -------------------------------------------------------------- header
  "nav.search": "Search",
  "nav.searchPlaceholder": "Search {site}",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",
  "nav.profile": "Profile",
  "nav.dashboard": "Dashboard",
  "nav.myContent": "My content",
  "nav.menu": "Menu",
  "nav.close": "Close",
  "nav.language": "Language",
  "nav.readThisPageIn": "Read this page in",
  "nav.edition": "Edition",
  "nav.chooseEdition": "Choose edition",

  // ------------------------------------------------------------- article
  "article.topics": "Topics",
  "article.share": "Share",
  "article.shareThisArticle": "Share this article",
  "article.save": "Save",
  "article.saved": "Saved",
  "article.viewBio": "View bio",
  "article.by": "By",
  "article.published": "Published",
  "article.updated": "Updated",
  "article.minRead": "{n} min read",
  "article.relatedReading": "Related reading",
  "article.moreFrom": "More from {category}",
  "article.followThisStory": "Follow this story",
  "article.readMore": "Read more",
  "article.inThisArticle": "In this article",
  "article.companies": "Companies",
  "article.people": "People",
  "article.source": "Source",
  "article.correction": "Corrections",

  // -------------------------------------------------------------- lists
  "list.latest": "Latest",
  "list.featured": "Featured",
  "list.trending": "Trending",
  "list.mostRead": "Most read",
  "list.editorPicks": "Editor's picks",
  "list.loadMore": "Load more",
  "list.showingOf": "Showing {shown} of {total}",
  "list.noResults": "Nothing here yet",
  "list.page": "Page",
  "list.next": "Next",
  "list.previous": "Previous",

  // --------------------------------------------------------- newsletter
  "newsletter.subscribe": "Subscribe",
  "newsletter.emailPlaceholder": "Your email address",
  "newsletter.thanks": "You're subscribed.",
  "newsletter.error": "That didn't go through. Try again.",

  // ------------------------------------------------------------- footer
  "footer.sections": "Sections",
  "footer.company": "Company",
  "footer.about": "About",
  "footer.contact": "Contact",
  "footer.advertise": "Advertise",
  "footer.privacy": "Privacy policy",
  "footer.terms": "Terms of use",
  "footer.rss": "RSS",
  "footer.allRightsReserved": "All rights reserved",
  "footer.followUs": "Follow us",

  // -------------------------------------------------------------- state
  "state.loading": "Loading…",
  "state.error": "Something went wrong.",
  "state.retry": "Try again",
  "state.notFound": "Page not found",
  "state.notFoundBody": "The page you asked for does not exist or has moved.",
  "state.backHome": "Back to the front page",

  // ------------------------------------------------------------ generic
  "common.readingIn": "Reading in {language}",
  "common.translated": "Translated",
  "common.originalEnglish": "Read the original in English",
} as const;

export type UiKey = keyof typeof UI_STRINGS;

/**
 * Fill {placeholders}. Kept deliberately dumb — no plural rules, no dates.
 * Arabic pluralisation has six forms and getting it half-right is worse than
 * not attempting it, so anything genuinely plural-sensitive gets its own key
 * rather than a rule engine.
 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) =>
    vars[k] === undefined ? m : String(vars[k]),
  );
}
