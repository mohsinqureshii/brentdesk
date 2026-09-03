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
  "common.viewAll": "View all",
  "common.all": "All",
  "common.subscribing": "Subscribing…",
  "common.supportJournalism": "Support independent journalism",
  "common.adBlocker": "Consider disabling your ad blocker for {site}",
  "newsletter.unsubscribeAnytime": "You can unsubscribe at any time. Read our",
  "search.placeholder": "Search articles, jobs, companies, people, events…",
  "search.noResults": "Try different keywords, or browse the categories",
  "search.quickLinks": "Quick links",
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

  // ------------------------------------- directories, filters, events
  // Everything the public pages beyond the homepage put around the
  // content: empty states, filter controls, directory headings, and the
  // events surface, which had the most English of any page.
  "article.companiesInArticle": "Companies in this article",
  "article.mentionedIn": "Mentioned in this article",
  "article.relatedArticles": "Related articles",
  "common.adSpace": "Ad space",
  "common.articles": "Articles",
  "common.cities": "Cities",
  "common.follow": "Follow",
  "common.showLess": "Show less",
  "common.showMore": "Show more",
  "common.viewDetails": "View details",
  "company.keyPeople": "Key people",
  "company.recentNews": "Recent news",
  "company.website": "Website",
  "directory.companies": "Company directory",
  "directory.companiesSubtitle": "The companies building the region",
  "directory.people": "People directory",
  "directory.peopleSubtitle": "Executives, engineers and leaders",
  "directory.peopleTagline": "The people running the region's industry",
  "directory.searchCompanies": "Search companies…",
  "directory.searchPeople": "Search people…",
  "events.connectPeople": "Connect people.",
  "events.coverage": "Event coverage",
  "events.discover": "Discover events.",
  "events.getTickets": "Get tickets",
  "events.happeningNow": "Happening right now",
  "events.hosting": "Hosting an event?",
  "events.listed": "Events listed",
  "events.liveNow": "Live now",
  "events.mostAnticipated": "Most anticipated",
  "events.pastPrompt": "Looking for something that already happened?",
  "events.search": "Search events",
  "events.searchLong": "Search events, topics or locations",
  "events.shapeThe": "Shape the",
  "events.submit": "Submit an event",
  "events.submitYours": "Submit your event",
  "events.tagline": "Every conference, summit and demo day that matters.",
  "events.type": "Event type",
  "events.view": "View event",
  "events.viewAll": "View all events",
  "events.viewPast": "View past events",
  "events.watchLive": "Watch live",
  "filter.allSectors": "All sectors",
  "filter.anyCity": "Any city",
  "filter.bySector": "Filter by sector",
  "filter.clear": "Clear",
  "filter.clearAll": "Clear all filters",
  "filter.clearFilters": "Clear filters",
  "list.browseCategories": "Browse categories",
  "list.browseTags": "Browse tags",
  "list.moreFromNewsroom": "More from the newsroom",
  "list.popularTags": "Popular tags",
  "list.showing": "Showing",
  "list.spotlight": "Spotlight",
  "state.articleNotFound": "Article not found",
  "state.authorNotFound": "Author not found",
  "state.backToNews": "Back to news",
  "state.categoryNotFound": "Category not found",
  "state.errorCompanies": "Could not load companies",
  "state.movedOrDeleted": "It may have been moved or deleted.",
  "state.noArticlesCategory": "No articles in this category yet.",
  "state.noArticlesTag": "No articles with this tag yet.",
  "state.noArticlesYet": "No articles published yet.",
  "state.noCities": "No cities found.",
  "state.noCompanies": "No companies found",
  "state.noPeople": "No people found",
  "state.noResults": "No results found",
  "state.noUpcomingEvents": "No upcoming events on the calendar yet",
  "state.noUpcomingEventsShort": "No upcoming events scheduled yet.",
  "state.tagNotFound": "Tag not found",
  "state.tryAdjusting": "Try adjusting your search or filters",
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
