import { getDb } from "../db";
import { articles, media, people, companies, investors, events, jobs, accelerators } from "../../drizzle/schema";
import { eq, isNull, or, and, sql, like } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// SEO Issue Types
export type SeoIssueType = 
  | 'missing_meta_title'
  | 'missing_meta_description'
  | 'short_meta_description'
  | 'long_meta_title'
  | 'missing_alt_text'
  | 'missing_canonical_url'
  | 'missing_focus_keyword'
  | 'missing_featured_image'
  | 'duplicate_meta_title'
  | 'duplicate_meta_description'
  | 'broken_internal_link'
  | 'missing_json_ld'
  | 'low_word_count';

export type SeoIssueSeverity = 'critical' | 'warning' | 'info';

export interface SeoIssue {
  id: string;
  type: SeoIssueType;
  severity: SeoIssueSeverity;
  entityType: 'article' | 'person' | 'company' | 'investor' | 'event' | 'job' | 'accelerator' | 'media';
  entityId: number;
  entityTitle: string;
  entitySlug?: string;
  field: string;
  currentValue?: string;
  recommendation: string;
  autoFixAvailable: boolean;
}

export interface SeoAuditResult {
  id: string;
  timestamp: Date;
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  issues: SeoIssue[];
  score: number; // 0-100
}

// Issue definitions with severity and recommendations
const issueDefinitions: Record<SeoIssueType, { severity: SeoIssueSeverity; recommendation: string; autoFixAvailable: boolean }> = {
  missing_meta_title: {
    severity: 'critical',
    recommendation: 'Add a unique, descriptive SEO title (50-60 characters) that includes your primary keyword.',
    autoFixAvailable: true
  },
  missing_meta_description: {
    severity: 'critical',
    recommendation: 'Add a compelling meta description (150-160 characters) that summarizes the content and includes keywords.',
    autoFixAvailable: true
  },
  short_meta_description: {
    severity: 'warning',
    recommendation: 'Meta description is too short. Aim for 150-160 characters for optimal display in search results.',
    autoFixAvailable: true
  },
  long_meta_title: {
    severity: 'warning',
    recommendation: 'SEO title is too long and may be truncated in search results. Keep it under 60 characters.',
    autoFixAvailable: true
  },
  missing_alt_text: {
    severity: 'warning',
    recommendation: 'Add descriptive alt text to improve accessibility and image SEO.',
    autoFixAvailable: true
  },
  missing_canonical_url: {
    severity: 'info',
    recommendation: 'Consider adding a canonical URL to prevent duplicate content issues.',
    autoFixAvailable: false
  },
  missing_focus_keyword: {
    severity: 'warning',
    recommendation: 'Add a focus keyword to help optimize your content for search engines.',
    autoFixAvailable: true
  },
  missing_featured_image: {
    severity: 'warning',
    recommendation: 'Add a featured image to improve social sharing and visual appeal in search results.',
    autoFixAvailable: false
  },
  duplicate_meta_title: {
    severity: 'critical',
    recommendation: 'This meta title is used by another page. Create a unique title for better SEO.',
    autoFixAvailable: true
  },
  duplicate_meta_description: {
    severity: 'warning',
    recommendation: 'This meta description is used by another page. Create unique descriptions for each page.',
    autoFixAvailable: true
  },
  broken_internal_link: {
    severity: 'critical',
    recommendation: 'Fix or remove this broken internal link to improve user experience and SEO.',
    autoFixAvailable: false
  },
  missing_json_ld: {
    severity: 'info',
    recommendation: 'Add structured data (JSON-LD) to help search engines understand your content.',
    autoFixAvailable: false
  },
  low_word_count: {
    severity: 'info',
    recommendation: 'Consider adding more content. Articles with 300+ words tend to rank better.',
    autoFixAvailable: false
  }
};

// Generate unique issue ID
function generateIssueId(type: SeoIssueType, entityType: string, entityId: number): string {
  return `${type}_${entityType}_${entityId}`;
}

// Audit articles for SEO issues
async function auditArticles(): Promise<SeoIssue[]> {
  const issues: SeoIssue[] = [];
  
  // Get all published articles
  const allArticles = await (await getDb())!.select({
    id: articles.id,
    title: articles.title,
    slug: articles.slug,
    seoTitle: articles.seoTitle,
    seoDescription: articles.seoDescription,
    seoKeywords: articles.seoKeywords,
    focusKeywordId: articles.focusKeywordId,
    canonicalUrl: articles.canonicalUrl,
    featuredImageId: articles.featuredImageId,
    content: articles.content,
    excerpt: articles.excerpt
  }).from(articles);

  // Check for duplicate titles
  const titleCounts = new Map<string, number[]>();
  
  for (const article of allArticles) {
    const effectiveTitle = article.seoTitle || article.title;
    if (effectiveTitle) {
      const existing = titleCounts.get(effectiveTitle.toLowerCase()) || [];
      existing.push(article.id);
      titleCounts.set(effectiveTitle.toLowerCase(), existing);
    }
  }

  // Check for duplicate descriptions
  const descCounts = new Map<string, number[]>();
  
  for (const article of allArticles) {
    const effectiveDesc = article.seoDescription || article.excerpt;
    if (effectiveDesc) {
      const existing = descCounts.get(effectiveDesc.toLowerCase()) || [];
      existing.push(article.id);
      descCounts.set(effectiveDesc.toLowerCase(), existing);
    }
  }

  for (const article of allArticles) {
    // Missing meta title
    if (!article.seoTitle && !article.title) {
      issues.push({
        id: generateIssueId('missing_meta_title', 'article', article.id),
        type: 'missing_meta_title',
        severity: issueDefinitions.missing_meta_title.severity,
        entityType: 'article',
        entityId: article.id,
        entityTitle: article.title || 'Untitled',
        entitySlug: article.slug || undefined,
        field: 'seoTitle',
        currentValue: undefined,
        recommendation: issueDefinitions.missing_meta_title.recommendation,
        autoFixAvailable: issueDefinitions.missing_meta_title.autoFixAvailable
      });
    }

    // Long meta title
    const effectiveTitle = article.seoTitle || article.title;
    if (effectiveTitle && effectiveTitle.length > 60) {
      issues.push({
        id: generateIssueId('long_meta_title', 'article', article.id),
        type: 'long_meta_title',
        severity: issueDefinitions.long_meta_title.severity,
        entityType: 'article',
        entityId: article.id,
        entityTitle: article.title || 'Untitled',
        entitySlug: article.slug || undefined,
        field: 'seoTitle',
        currentValue: effectiveTitle,
        recommendation: issueDefinitions.long_meta_title.recommendation,
        autoFixAvailable: issueDefinitions.long_meta_title.autoFixAvailable
      });
    }

    // Missing meta description
    if (!article.seoDescription && !article.excerpt) {
      issues.push({
        id: generateIssueId('missing_meta_description', 'article', article.id),
        type: 'missing_meta_description',
        severity: issueDefinitions.missing_meta_description.severity,
        entityType: 'article',
        entityId: article.id,
        entityTitle: article.title || 'Untitled',
        entitySlug: article.slug || undefined,
        field: 'seoDescription',
        currentValue: undefined,
        recommendation: issueDefinitions.missing_meta_description.recommendation,
        autoFixAvailable: issueDefinitions.missing_meta_description.autoFixAvailable
      });
    }

    // Short meta description
    const effectiveDesc = article.seoDescription || article.excerpt;
    if (effectiveDesc && effectiveDesc.length < 120) {
      issues.push({
        id: generateIssueId('short_meta_description', 'article', article.id),
        type: 'short_meta_description',
        severity: issueDefinitions.short_meta_description.severity,
        entityType: 'article',
        entityId: article.id,
        entityTitle: article.title || 'Untitled',
        entitySlug: article.slug || undefined,
        field: 'seoDescription',
        currentValue: effectiveDesc,
        recommendation: issueDefinitions.short_meta_description.recommendation,
        autoFixAvailable: issueDefinitions.short_meta_description.autoFixAvailable
      });
    }

    // Missing focus keyword
    if (!article.focusKeywordId) {
      issues.push({
        id: generateIssueId('missing_focus_keyword', 'article', article.id),
        type: 'missing_focus_keyword',
        severity: issueDefinitions.missing_focus_keyword.severity,
        entityType: 'article',
        entityId: article.id,
        entityTitle: article.title || 'Untitled',
        entitySlug: article.slug || undefined,
        field: 'focusKeyword',
        currentValue: undefined,
        recommendation: issueDefinitions.missing_focus_keyword.recommendation,
        autoFixAvailable: issueDefinitions.missing_focus_keyword.autoFixAvailable
      });
    }

    // Missing featured image
    if (!article.featuredImageId) {
      issues.push({
        id: generateIssueId('missing_featured_image', 'article', article.id),
        type: 'missing_featured_image',
        severity: issueDefinitions.missing_featured_image.severity,
        entityType: 'article',
        entityId: article.id,
        entityTitle: article.title || 'Untitled',
        entitySlug: article.slug || undefined,
        field: 'featuredImage',
        currentValue: undefined,
        recommendation: issueDefinitions.missing_featured_image.recommendation,
        autoFixAvailable: issueDefinitions.missing_featured_image.autoFixAvailable
      });
    }

    // Duplicate meta title
    const titleKey = (article.seoTitle || article.title)?.toLowerCase();
    if (titleKey) {
      const duplicates = titleCounts.get(titleKey) || [];
      if (duplicates.length > 1 && duplicates[0] !== article.id) {
        issues.push({
          id: generateIssueId('duplicate_meta_title', 'article', article.id),
          type: 'duplicate_meta_title',
          severity: issueDefinitions.duplicate_meta_title.severity,
          entityType: 'article',
          entityId: article.id,
          entityTitle: article.title || 'Untitled',
          entitySlug: article.slug || undefined,
          field: 'seoTitle',
          currentValue: article.seoTitle || article.title || undefined,
          recommendation: issueDefinitions.duplicate_meta_title.recommendation,
          autoFixAvailable: issueDefinitions.duplicate_meta_title.autoFixAvailable
        });
      }
    }

    // Low word count
    if (article.content) {
      const wordCount = article.content.split(/\s+/).filter((w: string) => w.length > 0).length;
      if (wordCount < 300) {
        issues.push({
          id: generateIssueId('low_word_count', 'article', article.id),
          type: 'low_word_count',
          severity: issueDefinitions.low_word_count.severity,
          entityType: 'article',
          entityId: article.id,
          entityTitle: article.title || 'Untitled',
          entitySlug: article.slug || undefined,
          field: 'content',
          currentValue: `${wordCount} words`,
          recommendation: issueDefinitions.low_word_count.recommendation,
          autoFixAvailable: issueDefinitions.low_word_count.autoFixAvailable
        });
      }
    }
  }

  return issues;
}

// Audit media for missing alt text
async function auditMedia(): Promise<SeoIssue[]> {
  const issues: SeoIssue[] = [];
  
  const allMedia = await (await getDb())!.select({
    id: media.id,
    filename: media.filename,
    alt: media.alt,
    mimeType: media.mimeType
  }).from(media).where(like(media.mimeType, 'image/%'));

  for (const item of allMedia) {
    if (!item.alt) {
      issues.push({
        id: generateIssueId('missing_alt_text', 'media', item.id),
        type: 'missing_alt_text',
        severity: issueDefinitions.missing_alt_text.severity,
        entityType: 'media',
        entityId: item.id,
        entityTitle: item.filename || 'Untitled Image',
        field: 'altText',
        currentValue: undefined,
        recommendation: issueDefinitions.missing_alt_text.recommendation,
        autoFixAvailable: issueDefinitions.missing_alt_text.autoFixAvailable
      });
    }
  }

  return issues;
}

// Audit people profiles
async function auditPeople(): Promise<SeoIssue[]> {
  const issues: SeoIssue[] = [];
  
  const allPeople = await (await getDb())!.select({
    id: people.id,
    name: people.name,
    slug: people.slug,
    bio: people.bio,
    avatar: people.avatar
  }).from(people);

  for (const person of allPeople) {
    // Missing bio (used as meta description)
    if (!person.bio) {
      issues.push({
        id: generateIssueId('missing_meta_description', 'person', person.id),
        type: 'missing_meta_description',
        severity: issueDefinitions.missing_meta_description.severity,
        entityType: 'person',
        entityId: person.id,
        entityTitle: person.name || 'Unnamed Person',
        entitySlug: person.slug || undefined,
        field: 'bio',
        currentValue: undefined,
        recommendation: 'Add a bio to improve the person profile\'s SEO and provide context for search engines.',
        autoFixAvailable: false
      });
    }

    // Missing profile image
    if (!person.avatar) {
      issues.push({
        id: generateIssueId('missing_featured_image', 'person', person.id),
        type: 'missing_featured_image',
        severity: issueDefinitions.missing_featured_image.severity,
        entityType: 'person',
        entityId: person.id,
        entityTitle: person.name || 'Unnamed Person',
        entitySlug: person.slug || undefined,
        field: 'avatar',
        currentValue: undefined,
        recommendation: 'Add a profile image to improve visual appeal in search results.',
        autoFixAvailable: false
      });
    }
  }

  return issues;
}

// Audit companies
async function auditCompanies(): Promise<SeoIssue[]> {
  const issues: SeoIssue[] = [];
  
  const allCompanies = await (await getDb())!.select({
    id: companies.id,
    name: companies.name,
    slug: companies.slug,
    description: companies.description,
    logo: companies.logo
  }).from(companies);

  for (const company of allCompanies) {
    // Missing description
    if (!company.description) {
      issues.push({
        id: generateIssueId('missing_meta_description', 'company', company.id),
        type: 'missing_meta_description',
        severity: issueDefinitions.missing_meta_description.severity,
        entityType: 'company',
        entityId: company.id,
        entityTitle: company.name || 'Unnamed Company',
        entitySlug: company.slug || undefined,
        field: 'description',
        currentValue: undefined,
        recommendation: 'Add a company description to improve SEO and provide context for search engines.',
        autoFixAvailable: false
      });
    }

    // Missing logo
    if (!company.logo) {
      issues.push({
        id: generateIssueId('missing_featured_image', 'company', company.id),
        type: 'missing_featured_image',
        severity: issueDefinitions.missing_featured_image.severity,
        entityType: 'company',
        entityId: company.id,
        entityTitle: company.name || 'Unnamed Company',
        entitySlug: company.slug || undefined,
        field: 'logo',
        currentValue: undefined,
        recommendation: 'Add a company logo to improve brand visibility in search results.',
        autoFixAvailable: false
      });
    }
  }

  return issues;
}

// Audit events
async function auditEvents(): Promise<SeoIssue[]> {
  const issues: SeoIssue[] = [];
  
  const allEvents = await (await getDb())!.select({
    id: events.id,
    title: events.title,
    slug: events.slug,
    description: events.description,
    featuredImage: events.featuredImage
  }).from(events);

  for (const event of allEvents) {
    // Missing description
    if (!event.description) {
      issues.push({
        id: generateIssueId('missing_meta_description', 'event', event.id),
        type: 'missing_meta_description',
        severity: issueDefinitions.missing_meta_description.severity,
        entityType: 'event',
        entityId: event.id,
        entityTitle: event.title || 'Unnamed Event',
        entitySlug: event.slug || undefined,
        field: 'description',
        currentValue: undefined,
        recommendation: 'Add an event description to improve SEO and attract attendees.',
        autoFixAvailable: false
      });
    }

    // Missing image
    if (!event.featuredImage) {
      issues.push({
        id: generateIssueId('missing_featured_image', 'event', event.id),
        type: 'missing_featured_image',
        severity: issueDefinitions.missing_featured_image.severity,
        entityType: 'event',
        entityId: event.id,
        entityTitle: event.title || 'Unnamed Event',
        entitySlug: event.slug || undefined,
        field: 'featuredImage',
        currentValue: undefined,
        recommendation: 'Add an event image to improve visual appeal in search results and social sharing.',
        autoFixAvailable: false
      });
    }
  }

  return issues;
}

// Audit jobs
async function auditJobs(): Promise<SeoIssue[]> {
  const issues: SeoIssue[] = [];
  
  const allJobs = await (await getDb())!.select({
    id: jobs.id,
    title: jobs.title,
    slug: jobs.slug,
    description: jobs.description
  }).from(jobs);

  for (const job of allJobs) {
    // Missing description
    if (!job.description) {
      issues.push({
        id: generateIssueId('missing_meta_description', 'job', job.id),
        type: 'missing_meta_description',
        severity: issueDefinitions.missing_meta_description.severity,
        entityType: 'job',
        entityId: job.id,
        entityTitle: job.title || 'Unnamed Job',
        entitySlug: job.slug || undefined,
        field: 'description',
        currentValue: undefined,
        recommendation: 'Add a job description to improve SEO and attract qualified candidates.',
        autoFixAvailable: false
      });
    }
  }

  return issues;
}

// Calculate SEO score based on issues
function calculateSeoScore(issues: SeoIssue[], totalEntities: number): number {
  if (totalEntities === 0) return 100;
  
  let deductions = 0;
  
  for (const issue of issues) {
    switch (issue.severity) {
      case 'critical':
        deductions += 5;
        break;
      case 'warning':
        deductions += 2;
        break;
      case 'info':
        deductions += 0.5;
        break;
    }
  }
  
  // Normalize based on total entities
  const normalizedDeductions = (deductions / totalEntities) * 10;
  const score = Math.max(0, Math.min(100, 100 - normalizedDeductions));
  
  return Math.round(score);
}

// Main audit function
export async function runSeoAudit(): Promise<SeoAuditResult> {
  const [
    articleIssues,
    mediaIssues,
    peopleIssues,
    companyIssues,
    eventIssues,
    jobIssues
  ] = await Promise.all([
    auditArticles(),
    auditMedia(),
    auditPeople(),
    auditCompanies(),
    auditEvents(),
    auditJobs()
  ]);

  const allIssues = [
    ...articleIssues,
    ...mediaIssues,
    ...peopleIssues,
    ...companyIssues,
    ...eventIssues,
    ...jobIssues
  ];

  const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;
  const infoCount = allIssues.filter(i => i.severity === 'info').length;

  // Get total entity count for score calculation
  const totalEntities = await getTotalEntityCount();
  const score = calculateSeoScore(allIssues, totalEntities);

  return {
    id: `audit_${Date.now()}`,
    timestamp: new Date(),
    totalIssues: allIssues.length,
    criticalCount,
    warningCount,
    infoCount,
    issues: allIssues,
    score
  };
}

async function getTotalEntityCount(): Promise<number> {
  const [articleCount] = await (await getDb())!.select({ count: sql<number>`count(*)` }).from(articles);
  const [mediaCount] = await (await getDb())!.select({ count: sql<number>`count(*)` }).from(media);
  const [peopleCount] = await (await getDb())!.select({ count: sql<number>`count(*)` }).from(people);
  const [companyCount] = await (await getDb())!.select({ count: sql<number>`count(*)` }).from(companies);
  const [eventCount] = await (await getDb())!.select({ count: sql<number>`count(*)` }).from(events);
  const [jobCount] = await (await getDb())!.select({ count: sql<number>`count(*)` }).from(jobs);

  return (
    Number(articleCount?.count || 0) +
    Number(mediaCount?.count || 0) +
    Number(peopleCount?.count || 0) +
    Number(companyCount?.count || 0) +
    Number(eventCount?.count || 0) +
    Number(jobCount?.count || 0)
  );
}

// AI-powered fix generation
export async function generateAiFix(issue: SeoIssue): Promise<string | null> {
  try {
    let prompt = '';
    
    switch (issue.type) {
      case 'missing_meta_title':
      case 'long_meta_title':
      case 'duplicate_meta_title':
        prompt = `Generate an SEO-optimized title for the following content. The title should be:
- Between 50-60 characters
- Include relevant keywords
- Be compelling and click-worthy
- Unique and descriptive

Content title: "${issue.entityTitle}"
Entity type: ${issue.entityType}
${issue.currentValue ? `Current title: "${issue.currentValue}"` : ''}

Return ONLY the new title, nothing else.`;
        break;

      case 'missing_meta_description':
      case 'short_meta_description':
      case 'duplicate_meta_description':
        prompt = `Generate an SEO-optimized meta description for the following content. The description should be:
- Between 150-160 characters
- Include relevant keywords naturally
- Be compelling and encourage clicks
- Summarize the content accurately

Content title: "${issue.entityTitle}"
Entity type: ${issue.entityType}
${issue.currentValue ? `Current description: "${issue.currentValue}"` : ''}

Return ONLY the new meta description, nothing else.`;
        break;

      case 'missing_focus_keyword':
        prompt = `Suggest a focus keyword for the following content. The keyword should be:
- 2-4 words
- Relevant to the content
- Commonly searched
- Specific enough to rank for

Content title: "${issue.entityTitle}"
Entity type: ${issue.entityType}

Return ONLY the focus keyword, nothing else.`;
        break;

      case 'missing_alt_text':
        prompt = `Generate descriptive alt text for an image. The alt text should be:
- Concise (under 125 characters)
- Descriptive of the image content
- Include relevant context

Image filename: "${issue.entityTitle}"

Return ONLY the alt text, nothing else.`;
        break;

      case 'low_word_count':
        prompt = `The following article has a low word count and needs more content. Generate a compelling SEO-optimized meta description that can help improve its search visibility while the content is being expanded.

Article title: "${issue.entityTitle}"
Entity type: ${issue.entityType}
${issue.currentValue ? `Current word count: ${issue.currentValue}` : ''}

Generate a meta description (150-160 characters) that accurately represents the article topic and encourages clicks.

Return ONLY the meta description, nothing else.`;
        break;

      case 'missing_featured_image':
        prompt = `Suggest a descriptive alt text / image search query for finding a suitable featured image for this content.

Content title: "${issue.entityTitle}"
Entity type: ${issue.entityType}

Return ONLY a short descriptive phrase (under 100 characters) that could be used to find a relevant featured image, nothing else.`;
        break;

      case 'missing_canonical_url':
        prompt = `Suggest a canonical URL path for the following content.

Content title: "${issue.entityTitle}"
Entity type: ${issue.entityType}
${issue.entitySlug ? `Current slug: "${issue.entitySlug}"` : ''}

Return ONLY the suggested canonical URL path (e.g., /news/article-slug), nothing else.`;
        break;

      case 'missing_json_ld':
        prompt = `Suggest a brief structured data description for the following content that could be used in JSON-LD schema.

Content title: "${issue.entityTitle}"
Entity type: ${issue.entityType}

Return ONLY a brief description (under 200 characters) suitable for JSON-LD schema, nothing else.`;
        break;

      case 'broken_internal_link':
        prompt = `The following content has a broken internal link. Suggest a corrected URL or alternative link.

Content title: "${issue.entityTitle}"
Entity type: ${issue.entityType}
${issue.currentValue ? `Broken link: "${issue.currentValue}"` : ''}

Return ONLY the suggested corrected URL path, nothing else.`;
        break;

      default:
        prompt = `Generate an SEO improvement suggestion for the following content.

Content title: "${issue.entityTitle}"
Entity type: ${issue.entityType}
Issue type: ${issue.type}
${issue.currentValue ? `Current value: "${issue.currentValue}"` : ''}
${issue.recommendation ? `Recommendation: ${issue.recommendation}` : ''}

Return ONLY the suggested fix value, nothing else.`;
        break;
    }

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are an SEO expert. Generate concise, optimized content as requested. Return only the requested content, no explanations or formatting.' },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      return content.trim() || null;
    }
    return null;
  } catch (error) {
    console.error('Error generating AI fix:', error);
    return null;
  }
}

// Apply fix to entity
export async function applyFix(issue: SeoIssue, newValue: string): Promise<boolean> {
  try {
    switch (issue.entityType) {
      case 'article':
        await (await getDb())!.update(articles)
          .set({ [issue.field]: newValue, updatedAt: new Date().toISOString() } as any)
          .where(eq(articles.id, issue.entityId));
        return true;

      case 'media':
        await (await getDb())!.update(media)
          .set({ [issue.field]: newValue, updatedAt: new Date().toISOString() } as any)
          .where(eq(media.id, issue.entityId));
        return true;

      case 'person':
        await (await getDb())!.update(people)
          .set({ [issue.field]: newValue, updatedAt: new Date().toISOString() } as any)
          .where(eq(people.id, issue.entityId));
        return true;

      case 'company':
        await (await getDb())!.update(companies)
          .set({ [issue.field]: newValue, updatedAt: new Date().toISOString() } as any)
          .where(eq(companies.id, issue.entityId));
        return true;

      case 'event':
        await (await getDb())!.update(events)
          .set({ [issue.field]: newValue, updatedAt: new Date().toISOString() } as any)
          .where(eq(events.id, issue.entityId));
        return true;

      case 'job':
        await (await getDb())!.update(jobs)
          .set({ [issue.field]: newValue, updatedAt: new Date().toISOString() } as any)
          .where(eq(jobs.id, issue.entityId));
        return true;

      default:
        return false;
    }
  } catch (error) {
    console.error('Error applying fix:', error);
    return false;
  }
}

// ============================================================
// QUICK-FIX (no LLM, deterministic defaults)
// ============================================================
//
// Most "missing meta" issues can be fixed without an AI call by copying
// existing fields — the article title makes a fine seoTitle, the excerpt
// makes a fine seoDescription. This generator returns the right default
// value per issue type without any external dependency. Used by the
// bulk-quick-fix admin endpoint to clear thousands of issues in one pass.
//
// Returns null if no deterministic default is available for that issue
// type (e.g. duplicate_meta_title needs a unique value, requires LLM).

interface QuickFixContext {
  articleTitle?: string | null;
  articleExcerpt?: string | null;
  articleSlug?: string | null;
  personName?: string | null;
  personTitle?: string | null;
  companyName?: string | null;
  companyDescription?: string | null;
  eventTitle?: string | null;
  eventShortDescription?: string | null;
  jobTitle?: string | null;
  jobCompanyName?: string | null;
  mediaFilename?: string | null;
  currentValue?: string | null;
}

export function getQuickFixDefault(issue: SeoIssue, ctx: QuickFixContext): string | null {
  const truncate = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

  switch (issue.type) {
    case "missing_meta_title":
      if (issue.entityType === "article" && ctx.articleTitle) return truncate(ctx.articleTitle, 60);
      if (issue.entityType === "person"  && ctx.personName)   return truncate(`${ctx.personName}${ctx.personTitle ? " — " + ctx.personTitle : ""}`, 60);
      if (issue.entityType === "company" && ctx.companyName)  return truncate(ctx.companyName, 60);
      if (issue.entityType === "event"   && ctx.eventTitle)   return truncate(ctx.eventTitle, 60);
      if (issue.entityType === "job"     && ctx.jobTitle)     return truncate(`${ctx.jobTitle}${ctx.jobCompanyName ? " at " + ctx.jobCompanyName : ""}`, 60);
      return null;

    case "missing_meta_description": {
      const desc =
        (issue.entityType === "article" && ctx.articleExcerpt) ||
        (issue.entityType === "company" && ctx.companyDescription) ||
        (issue.entityType === "event"   && ctx.eventShortDescription) ||
        null;
      if (!desc) return null;
      const stripped = String(desc).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (stripped.length < 30) return null;
      return truncate(stripped, 160);
    }

    case "long_meta_title":
      return ctx.currentValue ? truncate(ctx.currentValue, 60) : null;

    case "short_meta_description":
      // Padding short descriptions with the article title is hacky but
      // genuinely helps SERP impressions — better than 50-char snippets.
      if (!ctx.currentValue) return null;
      if (issue.entityType === "article" && ctx.articleTitle) {
        const padded = ctx.currentValue.trim() + " " + ctx.articleTitle;
        return truncate(padded, 160);
      }
      return null;

    case "missing_alt_text":
      // Use the linking entity's title as a passable alt. Better than blank.
      if (ctx.articleTitle) return truncate(ctx.articleTitle, 120);
      if (ctx.mediaFilename) {
        const stem = ctx.mediaFilename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        return stem.length >= 4 ? stem : null;
      }
      return null;

    // duplicate_meta_title / duplicate_meta_description need uniqueness ⇒ LLM.
    // missing_focus_keyword needs domain expertise ⇒ LLM.
    // missing_featured_image / broken_internal_link / missing_json_ld /
    // low_word_count / missing_canonical_url all need human / structural fix.
    default:
      return null;
  }
}

/**
 * Apply quick fixes to every issue in `issues` that has a deterministic
 * default. Returns counts and the list of issue IDs that still need
 * human/AI attention.
 *
 * Loads each entity once per id to populate context, so this runs in
 * O(n_unique_entities) rather than O(n_issues).
 */
export async function bulkApplyQuickFixes(issues: SeoIssue[]): Promise<{
  fixed: number;
  skipped: number;
  failed: number;
  remaining: string[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Pre-load every entity referenced so we can build QuickFixContext
  //    without N+1 queries.
  const articleIds = new Set<number>();
  const personIds = new Set<number>();
  const companyIds = new Set<number>();
  const eventIds = new Set<number>();
  const jobIds = new Set<number>();
  const mediaIds = new Set<number>();
  for (const i of issues) {
    if (i.entityType === "article") articleIds.add(i.entityId);
    else if (i.entityType === "person")  personIds.add(i.entityId);
    else if (i.entityType === "company") companyIds.add(i.entityId);
    else if (i.entityType === "event")   eventIds.add(i.entityId);
    else if (i.entityType === "job")     jobIds.add(i.entityId);
    else if (i.entityType === "media")   mediaIds.add(i.entityId);
  }

  const { inArray } = await import("drizzle-orm");
  const articleRows = articleIds.size > 0
    ? await db.select({ id: articles.id, title: articles.title, excerpt: articles.excerpt, slug: articles.slug })
        .from(articles).where(inArray(articles.id, Array.from(articleIds)))
    : [];
  const personRows = personIds.size > 0
    ? await db.select({ id: people.id, name: people.name, title: people.title })
        .from(people).where(inArray(people.id, Array.from(personIds)))
    : [];
  const companyRows = companyIds.size > 0
    ? await db.select({ id: companies.id, name: companies.name, description: companies.description })
        .from(companies).where(inArray(companies.id, Array.from(companyIds)))
    : [];
  const eventRows = eventIds.size > 0
    ? await db.select({ id: events.id, title: events.title, shortDescription: events.shortDescription })
        .from(events).where(inArray(events.id, Array.from(eventIds)))
    : [];
  const jobRows = jobIds.size > 0
    ? await db.select({ id: jobs.id, title: jobs.title, companyName: jobs.companyName })
        .from(jobs).where(inArray(jobs.id, Array.from(jobIds)))
    : [];
  const mediaRows = mediaIds.size > 0
    ? await db.select({ id: media.id, filename: media.filename })
        .from(media).where(inArray(media.id, Array.from(mediaIds)))
    : [];

  const articleById = new Map(articleRows.map((r: any) => [r.id, r]));
  const personById = new Map(personRows.map((r: any) => [r.id, r]));
  const companyById = new Map(companyRows.map((r: any) => [r.id, r]));
  const eventById = new Map(eventRows.map((r: any) => [r.id, r]));
  const jobById = new Map(jobRows.map((r: any) => [r.id, r]));
  const mediaById = new Map(mediaRows.map((r: any) => [r.id, r]));

  let fixed = 0;
  let skipped = 0;
  let failed = 0;
  const remaining: string[] = [];

  for (const issue of issues) {
    const ctx: QuickFixContext = { currentValue: issue.currentValue };
    if (issue.entityType === "article") {
      const r = articleById.get(issue.entityId);
      if (r) { ctx.articleTitle = r.title; ctx.articleExcerpt = r.excerpt; ctx.articleSlug = r.slug; }
    } else if (issue.entityType === "person") {
      const r = personById.get(issue.entityId);
      if (r) { ctx.personName = r.name; ctx.personTitle = r.title; }
    } else if (issue.entityType === "company") {
      const r = companyById.get(issue.entityId);
      if (r) { ctx.companyName = r.name; ctx.companyDescription = r.description; }
    } else if (issue.entityType === "event") {
      const r = eventById.get(issue.entityId);
      if (r) { ctx.eventTitle = r.title; ctx.eventShortDescription = r.shortDescription; }
    } else if (issue.entityType === "job") {
      const r = jobById.get(issue.entityId);
      if (r) { ctx.jobTitle = r.title; ctx.jobCompanyName = r.companyName; }
    } else if (issue.entityType === "media") {
      const r = mediaById.get(issue.entityId);
      if (r) { ctx.mediaFilename = r.filename; }
    }

    const value = getQuickFixDefault(issue, ctx);
    if (value === null) {
      skipped++;
      remaining.push(issue.id);
      continue;
    }

    const ok = await applyFix(issue, value);
    if (ok) fixed++;
    else { failed++; remaining.push(issue.id); }
  }

  return { fixed, skipped, failed, remaining };
}

// Get issues by type
export function getIssuesByType(issues: SeoIssue[]): Record<SeoIssueType, SeoIssue[]> {
  const grouped: Record<string, SeoIssue[]> = {};
  
  for (const issue of issues) {
    if (!grouped[issue.type]) {
      grouped[issue.type] = [];
    }
    grouped[issue.type].push(issue);
  }
  
  return grouped as Record<SeoIssueType, SeoIssue[]>;
}

// Get issues by entity type
export function getIssuesByEntityType(issues: SeoIssue[]): Record<string, SeoIssue[]> {
  const grouped: Record<string, SeoIssue[]> = {};
  
  for (const issue of issues) {
    if (!grouped[issue.entityType]) {
      grouped[issue.entityType] = [];
    }
    grouped[issue.entityType].push(issue);
  }
  
  return grouped;
}

// Get issues by severity
export function getIssuesBySeverity(issues: SeoIssue[]): Record<SeoIssueSeverity, SeoIssue[]> {
  return {
    critical: issues.filter(i => i.severity === 'critical'),
    warning: issues.filter(i => i.severity === 'warning'),
    info: issues.filter(i => i.severity === 'info')
  };
}
