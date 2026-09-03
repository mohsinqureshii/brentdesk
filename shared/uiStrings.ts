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
  "nav.account": "Account",
  "nav.createAccount": "Create account",
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
  "list.topStory": "Top story",
  "list.sidebar": "Sidebar",
  "common.advertisement": "Advertisement",
  "common.closeAd": "Close ad",
  "list.latestNews": "Latest News",
  "list.featuredCompanies": "Featured Companies",
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
  "newsletter.enterEmail": "Enter your email",
  "newsletter.stayUpdated": "Stay updated",
  "newsletter.confirmInbox": "Thanks for subscribing. Check your inbox to confirm.",
  "newsletter.confirmEmail": "Subscribed. Check your email to confirm.",
  "newsletter.needEmail": "Please enter your email address",
  "newsletter.selectLists": "Choose newsletters",
  "newsletter.consent": "By subscribing, you agree to our Privacy Policy.",
  "newsletter.dailyDescription": "The industrial stories that matter, every morning",
  "newsletter.projectsWeekly": "Projects Weekly",
  "newsletter.projectsDescription": "Major project awards and tenders",
  "newsletter.jobAlerts": "Job Alerts",
  "newsletter.jobsDescription": "New roles across the industry",
  "newsletter.eventUpdates": "Event Updates",
  "newsletter.eventsDescription": "Industry events coming up",

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


  // ------------------------------------------------- primary navigation
  // The header and footer link labels. These were hardcoded English arrays
  // until the archive went bilingual, which is why an Arabic page still had
  // an English masthead and an English footer under a translated article.
  "nav.news": "News",
  "nav.latest": "Latest",
  "nav.companies": "Companies",
  "nav.people": "People",
  "nav.events": "Events",
  "nav.jobs": "Jobs",
  "nav.newsletter": "Newsletter",
  "nav.directory": "Directory",
  "nav.industry": "Industry",

  // --------------------------------------------------------- categories
  // The industrial taxonomy, as it appears in navigation and on category
  // pages. Category names in the database stay English; these are what a
  // reader sees.
  "cat.construction": "Construction",
  "cat.infrastructure": "Infrastructure",
  "cat.energy": "Energy",
  "cat.manufacturing": "Manufacturing",
  "cat.logistics": "Logistics",
  "cat.real-estate": "Real Estate",
  "cat.transportation": "Transportation",
  "cat.industrial-technology": "Industrial Technology",
  "cat.mining": "Mining",
  "cat.utilities": "Utilities",

  // -------------------------------------------------------- footer links
  "footer.categories": "Categories",
  "footer.editorial": "Editorial",
  "footer.publication": "Publication",
  "footer.aboutUs": "About",
  "footer.contactUs": "Contact Us",
  "footer.termsOfService": "Terms of Service",
  "footer.privacyPolicy": "Privacy Policy",
  "footer.sitemap": "Sitemap",
  "footer.email": "Email",

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
