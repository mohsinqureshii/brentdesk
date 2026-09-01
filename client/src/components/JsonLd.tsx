import { publication } from "@shared/publication";
import { useEffect } from 'react';

// ============================================================
// JSON-LD STRUCTURED DATA COMPONENT
// Implements Schema.org structured data for SEO
// ============================================================

interface OrganizationSchema {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  description?: string;
  contactPoint?: {
    type: string;
    email?: string;
    telephone?: string;
    contactType?: string;
  };
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface ArticleSchema {
  headline: string;
  description?: string;
  image?: string | string[];
  datePublished?: string;
  dateModified?: string;
  author?: {
    name: string;
    url?: string;
    image?: string;
  };
  publisher?: OrganizationSchema;
  mainEntityOfPage?: string;
  articleSection?: string;
  keywords?: string[];
  wordCount?: number;
}

interface NewsArticleSchema extends ArticleSchema {
  dateline?: string;
}

interface PersonSchema {
  name: string;
  url?: string;
  image?: string;
  jobTitle?: string;
  worksFor?: {
    name: string;
    url?: string;
  };
  sameAs?: string[];
  description?: string;
}

interface EventSchema {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: {
    name: string;
    address?: string;
    url?: string;
  };
  image?: string;
  organizer?: {
    name: string;
    url?: string;
  };
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled';
  eventAttendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode';
  url?: string;
}

interface JobPostingSchema {
  title: string;
  description: string;
  datePosted: string;
  validThrough?: string;
  hiringOrganization: {
    name: string;
    url?: string;
    logo?: string;
  };
  jobLocation?: {
    /** Full freeform address string — used as streetAddress fallback. */
    address?: string;
    /** schema.org `addressLocality` (city). */
    city?: string;
    /** schema.org `addressRegion` (state / province / emirate). GSC
     *  flags this when missing — populate when the row has a region
     *  on file or when the city implies one. */
    region?: string;
    /** ISO country name or 2-letter code. */
    country?: string;
    /** schema.org `postalCode`. GSC flags this when missing — populate
     *  when the row carries a real ZIP/postcode. */
    postalCode?: string;
  };
  employmentType?: string;
  baseSalary?: {
    currency: string;
    minValue?: number;
    maxValue?: number;
    /** Salary period the min/max applies to. Defaults to YEAR for
     *  backwards-compat with existing callers. */
    unitText?: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  };
  remote?: boolean;
}

interface WebSiteSchema {
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    type?: string;
    target: string;
    queryInput: string;
  };
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQPageSchema {
  questions: FAQItem[];
  mainEntity?: string;
}

// Props for the JsonLd component
interface JsonLdProps {
  type: 'Article' | 'NewsArticle' | 'Organization' | 'BreadcrumbList' | 'Person' | 'Event' | 'JobPosting' | 'WebSite' | 'FAQPage';
  data: ArticleSchema | NewsArticleSchema | OrganizationSchema | BreadcrumbItem[] | PersonSchema | EventSchema | JobPostingSchema | WebSiteSchema | FAQPageSchema;
}

// Default publisher info from the central publication config
const DEFAULT_PUBLISHER: OrganizationSchema = {
  name: publication.name,
  url: publication.siteUrl,
  logo: publication.assets.icon512,
  description: publication.description,
  sameAs: Object.values(publication.social),
};

/**
 * Generate JSON-LD for Article schema
 */
function generateArticleJsonLd(data: ArticleSchema, isNewsArticle = false): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': isNewsArticle ? 'NewsArticle' : 'Article',
    headline: data.headline,
    description: data.description,
    image: data.image,
    datePublished: data.datePublished,
    dateModified: data.dateModified || data.datePublished,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': data.mainEntityOfPage,
    },
    articleSection: data.articleSection,
    keywords: data.keywords?.join(', '),
    wordCount: data.wordCount,
  };

  // Add author
  if (data.author) {
    schema.author = {
      '@type': 'Person',
      name: data.author.name,
      url: data.author.url,
      image: data.author.image,
    };
  }

  // Add publisher
  const publisher = data.publisher || DEFAULT_PUBLISHER;
  schema.publisher = {
    '@type': 'Organization',
    name: publisher.name,
    url: publisher.url,
    logo: publisher.logo ? {
      '@type': 'ImageObject',
      url: publisher.logo,
    } : undefined,
  };

  // Add dateline for news articles
  if (isNewsArticle && (data as NewsArticleSchema).dateline) {
    schema.dateline = (data as NewsArticleSchema).dateline;
  }

  return schema;
}

/**
 * Generate JSON-LD for Organization schema
 */
function generateOrganizationJsonLd(data: OrganizationSchema): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.name,
    url: data.url,
    logo: data.logo ? {
      '@type': 'ImageObject',
      url: data.logo,
    } : undefined,
    description: data.description,
    sameAs: data.sameAs,
  };

  if (data.contactPoint) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      email: data.contactPoint.email,
      telephone: data.contactPoint.telephone,
      contactType: data.contactPoint.contactType,
    };
  }

  return schema;
}

/**
 * Generate JSON-LD for BreadcrumbList schema
 */
function generateBreadcrumbJsonLd(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate JSON-LD for Person schema
 */
function generatePersonJsonLd(data: PersonSchema): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.name,
    url: data.url,
    image: data.image,
    jobTitle: data.jobTitle,
    worksFor: data.worksFor ? {
      '@type': 'Organization',
      name: data.worksFor.name,
      url: data.worksFor.url,
    } : undefined,
    sameAs: data.sameAs,
    description: data.description,
  };
}

/**
 * Generate JSON-LD for Event schema
 */
function generateEventJsonLd(data: EventSchema): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: data.name,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    location: data.location ? {
      '@type': 'Place',
      name: data.location.name,
      address: data.location.address ? {
        '@type': 'PostalAddress',
        streetAddress: data.location.address,
      } : undefined,
      url: data.location.url,
    } : undefined,
    image: data.image,
    organizer: data.organizer ? {
      '@type': 'Organization',
      name: data.organizer.name,
      url: data.organizer.url,
    } : undefined,
    eventStatus: data.eventStatus ? `https://schema.org/${data.eventStatus}` : undefined,
    eventAttendanceMode: data.eventAttendanceMode ? `https://schema.org/${data.eventAttendanceMode}` : undefined,
    url: data.url,
  };
}

/**
 * Generate JSON-LD for JobPosting schema
 */
function generateJobPostingJsonLd(data: JobPostingSchema): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: data.title,
    description: data.description,
    datePosted: data.datePosted,
    validThrough: data.validThrough,
    hiringOrganization: {
      '@type': 'Organization',
      name: data.hiringOrganization.name,
      sameAs: data.hiringOrganization.url,
      logo: data.hiringOrganization.logo,
    },
    employmentType: data.employmentType,
  };

  // Add job location. Pass through every PostalAddress sub-field
  // the caller provided. GSC's "Missing field" warnings on
  // `addressRegion` / `postalCode` go away when those are on the
  // emitted JSON-LD (when we actually have the data — we never
  // fabricate). `streetAddress` falls back to the freeform
  // address string when the structured fields aren't all present.
  if (data.jobLocation) {
    schema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: data.jobLocation.address,
        addressLocality: data.jobLocation.city,
        addressRegion: data.jobLocation.region,
        postalCode: data.jobLocation.postalCode,
        addressCountry: data.jobLocation.country,
      },
    };
  }

  // Add remote work indicator
  if (data.remote) {
    schema.jobLocationType = 'TELECOMMUTE';
  }

  // Add salary. unitText respects the row's salaryPeriod (hourly →
  // HOUR, monthly → MONTH, yearly → YEAR) instead of always
  // claiming YEAR — Google validates the period against the value
  // ranges, so a $50/hour role being reported as YEAR triggers
  // validation warnings.
  if (data.baseSalary) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: data.baseSalary.currency,
      value: {
        '@type': 'QuantitativeValue',
        minValue: data.baseSalary.minValue,
        maxValue: data.baseSalary.maxValue,
        unitText: data.baseSalary.unitText || 'YEAR',
      },
    };
  }

  return schema;
}

/**
 * Generate JSON-LD for FAQPage schema
 */
function generateFAQPageJsonLd(data: FAQPageSchema): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.questions.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Generate JSON-LD for WebSite schema (with search action)
 */
function generateWebSiteJsonLd(data: WebSiteSchema): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: data.name,
    url: data.url,
    description: data.description,
  };

  // Add search action for sitelinks searchbox
  if (data.potentialAction) {
    schema.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: data.potentialAction.target,
      },
      'query-input': data.potentialAction.queryInput,
    };
  }

  return schema;
}

/**
 * JsonLd Component
 * Injects JSON-LD structured data into the document head
 */
export function JsonLd({ type, data }: JsonLdProps) {
  useEffect(() => {
    // Generate the appropriate JSON-LD based on type
    let jsonLd: object;

    switch (type) {
      case 'Article':
        jsonLd = generateArticleJsonLd(data as ArticleSchema);
        break;
      case 'NewsArticle':
        jsonLd = generateArticleJsonLd(data as NewsArticleSchema, true);
        break;
      case 'Organization':
        jsonLd = generateOrganizationJsonLd(data as OrganizationSchema);
        break;
      case 'BreadcrumbList':
        jsonLd = generateBreadcrumbJsonLd(data as BreadcrumbItem[]);
        break;
      case 'Person':
        jsonLd = generatePersonJsonLd(data as PersonSchema);
        break;
      case 'Event':
        jsonLd = generateEventJsonLd(data as EventSchema);
        break;
      case 'JobPosting':
        jsonLd = generateJobPostingJsonLd(data as JobPostingSchema);
        break;
      case 'WebSite':
        jsonLd = generateWebSiteJsonLd(data as WebSiteSchema);
        break;
      case 'FAQPage':
        jsonLd = generateFAQPageJsonLd(data as FAQPageSchema);
        break;
      default:
        return;
    }

    // Create script element
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = `jsonld-${type.toLowerCase()}`;
    script.textContent = JSON.stringify(jsonLd, null, 0);

    // Remove existing script with same ID if present
    const existing = document.getElementById(script.id);
    if (existing) {
      existing.remove();
    }

    // Append to head
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.getElementById(`jsonld-${type.toLowerCase()}`);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [type, data]);

  return null;
}

// Export types for use in other components
export type {
  ArticleSchema,
  NewsArticleSchema,
  OrganizationSchema,
  BreadcrumbItem,
  PersonSchema,
  EventSchema,
  JobPostingSchema,
  WebSiteSchema,
  FAQItem,
  FAQPageSchema,
};

export default JsonLd;
