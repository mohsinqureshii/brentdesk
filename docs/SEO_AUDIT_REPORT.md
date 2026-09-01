# TechScoop SEO Audit Report

**Document Version:** 1.0  
**Date:** February 2, 2026  
**Author:** Manus AI  
**Status:** Source of Truth

---

## Executive Summary

This document serves as the definitive source of truth for TechScoop's SEO implementation, current issues, and strategic roadmap. The audit analyzes data from Google Search Console, internal SEO health monitoring, and technical code review to provide actionable recommendations for improving search visibility and indexing.

TechScoop currently has **1.02k indexed pages** out of **2.09k known pages**, with **1.07k pages not indexed** due to various technical issues. The internal SEO health score stands at **79/100** with 713 total issues identified, including 28 critical issues requiring immediate attention.

---

## Table of Contents

1. [Current SEO Features](#current-seo-features)
2. [Google Search Console Analysis](#google-search-console-analysis)
3. [Critical Issues Identified](#critical-issues-identified)
4. [Homepage Meta Description Problem](#homepage-meta-description-problem)
5. [Sitemap Infrastructure Issues](#sitemap-infrastructure-issues)
6. [Technical Fixes Required](#technical-fixes-required)
7. [SEO Roadmap](#seo-roadmap)
8. [Comparison with Industry Leaders](#comparison-with-industry-leaders)
9. [Implementation Priority Matrix](#implementation-priority-matrix)

---

## Current SEO Features

TechScoop has implemented a comprehensive SEO infrastructure that includes the following capabilities:

### Meta Tag Management

The platform uses a centralized SEO service (`seo.service.ts`) that generates meta tags for all entity types. Each content type (articles, jobs, people, events, investors, companies, accelerators, resources, research) has dedicated meta tag generation with Open Graph and Twitter Card support. The system supports custom meta overrides through the admin panel, allowing editors to fine-tune SEO settings per page.

### Structured Data (JSON-LD)

The platform generates schema.org compliant JSON-LD for multiple content types:

| Content Type | Schema Type | Key Properties |
|-------------|-------------|----------------|
| Articles | NewsArticle | headline, datePublished, author, publisher |
| Jobs | JobPosting | title, hiringOrganization, datePosted, validThrough |
| People | Person | name, jobTitle, worksFor, sameAs |
| Events | Event | name, startDate, location, organizer |
| Investors | Organization | name, description, foundingDate |
| Resources | CreativeWork | name, description, provider |
| Research | Report | name, author, datePublished |

### Sitemap Infrastructure

The system is designed to generate module-specific sitemaps:

- `/sitemap.xml` - Sitemap index pointing to all module sitemaps
- `/sitemap-articles.xml` - All published articles
- `/sitemap-news.xml` - Google News sitemap (last 48 hours)
- `/sitemap-jobs.xml` - Job listings
- `/sitemap-people.xml` - People profiles
- `/sitemap-companies.xml` - Company profiles
- `/sitemap-investors.xml` - Investor profiles
- `/sitemap-events.xml` - Events
- `/sitemap-accelerators.xml` - Accelerator programs
- `/sitemap-resources.xml` - Resources
- `/sitemap-research.xml` - Research reports
- `/sitemap-categories.xml` - Category pages
- `/sitemap-pages.xml` - Static pages

### Additional SEO Features

The platform includes RSS feeds for news and jobs (`/rss.xml`, `/feed.xml`, `/jobs/rss.xml`), a dynamically generated robots.txt file, canonical URL management with primary category support, and a 301 redirect system for URL changes and WordPress migration preservation.

---

## Google Search Console Analysis

Based on the Google Search Console data from January 27, 2026, the following indexing status has been identified:

### Indexing Overview

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Known Pages | 2,090 | 100% |
| Indexed Pages | 1,020 | 48.8% |
| Not Indexed Pages | 1,070 | 51.2% |

### Reasons for Non-Indexing

| Reason | Pages | Severity |
|--------|-------|----------|
| Not found (404) | 161 | Critical |
| Crawled - currently not indexed | 111 | High |
| Discovered - currently not indexed | 35 | Medium |
| Page with redirect | 32 | Medium |
| Duplicate, Google chose different canonical | 28 | Medium |
| Alternative page with proper canonical tag | 17 | Low |
| Blocked due to other 4xx issue | 1 | Critical |
| Soft 404 | 1 | Critical |
| Server error (5xx) | 1 | Critical |
| Blocked by robots.txt | 1 | Low |

The 161 pages returning 404 errors represent the most critical issue, as these are pages that Google has discovered but cannot access. This could be due to deleted content, changed URLs without proper redirects, or routing issues in the application.

---

## Critical Issues Identified

### Issue 1: Sitemap 404 Errors on Production

The most severe technical issue is that module-specific sitemaps return 404 errors on the production site while working correctly on the development server.

**Affected URLs:**
- `https://techscoop.io/sitemap-people.xml` → 404
- `https://techscoop.io/sitemap-categories.xml` → 404
- `https://techscoop.io/sitemap-articles.xml` → 404
- All other module sitemaps

**Root Cause Analysis:**

The sitemap routes are defined in `server/routes/sitemaps.ts` and registered in `server/_core/index.ts` before the Vite middleware. However, on production, the static file serving and SPA catch-all route in `vite.ts` appears to be intercepting these requests before they reach the Express routes.

The production `serveStatic` function uses a wildcard route (`app.use("*", ...)`) that catches all requests not matching static files, which may be overriding the sitemap routes.

### Issue 2: Wrong Base URL in Sitemaps (FIXED)

The SEO service was configured with `techscoop.com` as the default base URL instead of `techscoop.io`. This has been fixed in this audit.

**Before Fix:**
```
https://techscoop.com/people/paddy-cosgrave
```

**After Fix:**
```
https://techscoop.io/people/paddy-cosgrave
```

### Issue 3: Admin URLs in Main Sitemap

The main `/sitemap.xml` on production contains admin URLs that should never be indexed:

- `/admin/login`
- `/admin`
- `/admin/dashboard`
- `/admin/articles`
- `/admin/jobs`
- `/admin/people`
- `/admin/companies`
- `/admin/investors`
- `/admin/events`
- `/admin/resources`
- `/admin/accelerators`
- `/admin/taxonomy/*`
- `/admin/media`
- `/admin/workflow`
- `/admin/seo`
- `/admin/homepage`
- `/admin/popups`
- `/admin/import/*`
- `/admin/funding`
- `/admin/users`
- `/admin/settings`

Additionally, authenticated pages like `/dashboard` and `/profile` are included, which require login and should not be indexed.

### Issue 4: Internal SEO Health Issues

The internal SEO audit tool reports 713 total issues:

| Category | Count | Examples |
|----------|-------|----------|
| Critical | 28 | Missing required fields, broken links |
| Warnings | 665 | Long meta titles, missing focus keywords |
| Info | 20 | Optimization suggestions |

**Common Warning Types:**

1. **Long Meta Title** - SEO titles exceeding 60 characters get truncated in search results
2. **Missing Focus Keyword** - Articles without a designated focus keyword for optimization
3. **Missing Meta Description** - Pages without custom meta descriptions

---

## Homepage Meta Description Problem

The homepage currently displays an incorrect or generic meta description in Google search results. Based on the search results screenshot, Google is showing:

> "techscoop. NewsJobsCompaniesPeopleInvestorsAcceleratorsEvents More Resources · Sign In Subscribe. TS · TechScoopStaffContact UsAdvertise."

This appears to be Google extracting navigation text from the page rather than the intended meta description. This happens when:

1. The meta description tag is missing or empty
2. The meta description is too short or not descriptive enough
3. Google determines the page content doesn't match the provided description

**Recommended Fix:**

Ensure the homepage has a compelling, keyword-rich meta description between 150-160 characters that accurately describes TechScoop's value proposition:

```html
<meta name="description" content="TechScoop is MENA's leading technology publication covering startups, venture capital, tech jobs, and innovation across the Middle East and North Africa region." />
```

---

## Sitemap Infrastructure Issues

### Current State vs Expected State

| Endpoint | Expected Behavior | Actual Behavior (Production) |
|----------|-------------------|------------------------------|
| `/sitemap.xml` | Return sitemapindex XML | Returns flat urlset with admin URLs |
| `/sitemap-articles.xml` | Return article URLs | 404 Not Found |
| `/sitemap-people.xml` | Return people URLs | 404 Not Found |
| `/sitemap-news.xml` | Return Google News sitemap | 404 Not Found |
| All other module sitemaps | Return respective URLs | 404 Not Found |

### Technical Root Cause

The issue stems from route ordering in the Express application. The sitemap routes are registered correctly, but the production static file serving middleware intercepts requests before they reach the sitemap handlers.

In `server/_core/index.ts`, the routes are registered in this order:
1. OAuth routes
2. tRPC API routes
3. Sitemap routes
4. Article redirect middleware
5. Vite/Static middleware (catch-all)

However, the `serveStatic` function in production uses `express.static(distPath)` followed by a wildcard route that serves `index.html` for all unmatched routes. If the sitemap routes are not being matched, it suggests the Express router is not properly distinguishing between API routes and static file requests.

---

## Technical Fixes Required

### Fix 1: Ensure Sitemap Routes Take Priority

The sitemap routes must be registered and matched before the static file middleware. Verify that the route registration order is correct and that the sitemap routes are not being shadowed.

```typescript
// In server/_core/index.ts - ensure this order:
app.use(sitemapRoutes);  // Must come before static middleware
app.use(articleRedirectMiddleware);
// Then static/Vite middleware
```

### Fix 2: Remove Admin URLs from Pages Sitemap

The static pages sitemap generator in `seo.service.ts` should only include public, indexable pages. The current implementation already excludes admin pages in the code, but the production sitemap is showing them, suggesting a different code path is being executed.

### Fix 3: Set Correct Base URL (COMPLETED)

The base URL has been corrected from `techscoop.com` to `techscoop.io`:

```typescript
constructor(baseUrl: string = process.env.BASE_URL || "https://techscoop.io") {
  this.baseUrl = baseUrl;
}
```

### Fix 4: Add Environment Variable for Base URL

To prevent hardcoding issues, add `BASE_URL` to the environment configuration:

```env
BASE_URL=https://techscoop.io
```

### Fix 5: Implement Proper 404 Handling

For the 161 pages returning 404 errors, implement one of the following solutions:

1. **Create redirects** for URLs that have moved
2. **Remove from sitemap** pages that no longer exist
3. **Fix routing** for pages that should exist but aren't being served

---

## SEO Roadmap

### Phase 1: Critical Fixes (Week 1)

| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| Fix sitemap 404 errors on production | P0 | High | Critical |
| Remove admin URLs from sitemap | P0 | Low | High |
| Fix homepage meta description | P0 | Low | High |
| Correct base URL (completed) | P0 | Low | High |
| Investigate 161 404 errors | P1 | Medium | High |

### Phase 2: Content Optimization (Weeks 2-3)

| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| Add focus keywords to all articles | P1 | Medium | Medium |
| Shorten meta titles over 60 chars | P1 | Medium | Medium |
| Add meta descriptions to all pages | P1 | Medium | Medium |
| Implement auto-fix for SEO issues | P2 | High | Medium |

### Phase 3: Advanced SEO (Weeks 4-6)

| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| Implement Google News Publisher Center | P2 | Medium | High |
| Add hreflang tags for Arabic content | P2 | Medium | Medium |
| Implement breadcrumb structured data | P2 | Low | Medium |
| Add FAQ schema to relevant pages | P3 | Low | Low |
| Implement video schema for video content | P3 | Medium | Low |

### Phase 4: Performance & Monitoring (Ongoing)

| Task | Priority | Effort | Impact |
|------|----------|--------|--------|
| Set up automated SEO monitoring | P2 | Medium | High |
| Implement Core Web Vitals optimization | P2 | High | High |
| Create SEO dashboard for editors | P3 | Medium | Medium |
| Set up Google News sitemap auto-submission | P3 | Low | Medium |

---

## Comparison with Industry Leaders

To achieve visibility comparable to TechCrunch or other major tech publications, TechScoop needs to address several gaps:

### Google News Inclusion Requirements

| Requirement | TechCrunch | TechScoop Status |
|-------------|------------|------------------|
| Google News Publisher Center registration | ✅ | ❌ Not registered |
| News sitemap (last 48 hours) | ✅ | ⚠️ Implemented but 404 |
| Article structured data | ✅ | ✅ Implemented |
| Author pages with E-E-A-T signals | ✅ | ⚠️ Partial |
| Publication date visibility | ✅ | ✅ Implemented |
| Original reporting signals | ✅ | ⚠️ Needs improvement |

### Technical SEO Comparison

| Feature | TechCrunch | TechScoop |
|---------|------------|-----------|
| Core Web Vitals (LCP) | < 2.5s | Unknown |
| Mobile-first indexing | ✅ | ✅ |
| HTTPS | ✅ | ✅ |
| Canonical URLs | ✅ | ✅ |
| Sitemap index | ✅ | ⚠️ Broken |
| RSS feeds | ✅ | ✅ |
| AMP pages | ✅ | ❌ Not implemented |

### Content Authority Signals

To compete with established publications, TechScoop should focus on:

1. **E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)** - Enhance author profiles with credentials, social links, and bylines
2. **Original reporting** - Prioritize exclusive stories and original research
3. **Backlink building** - Develop relationships with other publications for citations
4. **Social signals** - Increase social media engagement and sharing

---

## Implementation Priority Matrix

The following matrix prioritizes fixes based on impact and effort:

```
HIGH IMPACT
    │
    │  ┌─────────────────┐    ┌─────────────────┐
    │  │ Fix Sitemap 404 │    │ Google News     │
    │  │ (P0 - Week 1)   │    │ Registration    │
    │  └─────────────────┘    │ (P2 - Week 4)   │
    │                         └─────────────────┘
    │  ┌─────────────────┐    ┌─────────────────┐
    │  │ Homepage Meta   │    │ Core Web Vitals │
    │  │ (P0 - Week 1)   │    │ (P2 - Week 4)   │
    │  └─────────────────┘    └─────────────────┘
    │
    │  ┌─────────────────┐    ┌─────────────────┐
    │  │ Remove Admin    │    │ Auto-fix SEO    │
    │  │ URLs (P0)       │    │ Issues (P2)     │
    │  └─────────────────┘    └─────────────────┘
    │
LOW ├──────────────────────────────────────────────►
IMPACT     LOW EFFORT              HIGH EFFORT
```

---

## Appendix A: SEO Service Architecture

The SEO service is implemented as a singleton class that provides:

1. **Meta tag generation** - `generateMetaTags(entityType, entity, meta)`
2. **Sitemap generation** - `generateSitemap(type)`, `generateSitemapIndex()`
3. **Google News sitemap** - `generateGoogleNewsSitemap()`
4. **RSS feeds** - `generateNewsFeed()`, `generateJobsFeed()`
5. **Robots.txt** - `generateRobotsTxt()`

### File Locations

| File | Purpose |
|------|---------|
| `server/services/seo.service.ts` | Core SEO service |
| `server/services/seoAudit.service.ts` | SEO health auditing |
| `server/routes/sitemaps.ts` | Sitemap route handlers |
| `client/src/components/SEO.tsx` | React SEO component |

---

## Appendix B: Recommended robots.txt

```txt
User-agent: *
Allow: /

Sitemap: https://techscoop.io/sitemap.xml

# Disallow admin, API, and authenticated routes
Disallow: /admin/
Disallow: /api/
Disallow: /login
Disallow: /profile
Disallow: /account
Disallow: /dashboard
Disallow: /settings

# Disallow search and filter pages to prevent duplicate content
Disallow: /*?*sort=
Disallow: /*?*filter=
Disallow: /*?*page=

# Allow specific bots for news indexing
User-agent: Googlebot-News
Allow: /
```

---

## Appendix C: Action Items Checklist

### Immediate Actions (This Week)

- [ ] Debug and fix sitemap route handling in production
- [x] Verify base URL is correctly set to techscoop.io
- [ ] Update homepage meta description
- [ ] Remove admin URLs from any sitemap output
- [ ] Audit 161 404 URLs and create redirects or remove from sitemap

### Short-term Actions (This Month)

- [ ] Register with Google News Publisher Center
- [ ] Add focus keywords to all existing articles
- [ ] Implement SEO auto-fix functionality
- [ ] Set up Core Web Vitals monitoring

### Long-term Actions (This Quarter)

- [ ] Consider AMP implementation for news articles
- [ ] Implement hreflang for Arabic content
- [ ] Build backlink strategy
- [ ] Create comprehensive SEO training for editors

---

*This document should be updated whenever significant SEO changes are made to the platform. Last updated: February 2, 2026.*
