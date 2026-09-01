/**
 * Batch fix all auto-fixable SEO issues
 * This script runs the SEO audit and applies AI-generated fixes to all auto-fixable issues
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const dbConfig = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
};

// Issue definitions with auto-fix availability
const issueDefinitions = {
  missing_meta_title: { autoFixAvailable: true },
  missing_meta_description: { autoFixAvailable: true },
  short_meta_description: { autoFixAvailable: true },
  long_meta_title: { autoFixAvailable: true },
  missing_alt_text: { autoFixAvailable: true },
  missing_focus_keyword: { autoFixAvailable: true },
  duplicate_meta_title: { autoFixAvailable: true },
  duplicate_meta_description: { autoFixAvailable: true },
  missing_canonical_url: { autoFixAvailable: false },
  missing_featured_image: { autoFixAvailable: false },
  broken_internal_link: { autoFixAvailable: false },
  missing_json_ld: { autoFixAvailable: false },
  low_word_count: { autoFixAvailable: false }
};

// Call LLM API to generate fix
async function generateAiFix(issue) {
  if (!issue.autoFixAvailable) return null;

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

    default:
      return null;
  }

  try {
    const response = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FORGE_API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are an SEO expert. Generate concise, optimized content as requested. Return only the requested content, no explanations or formatting.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content.trim() : null;
  } catch (error) {
    console.error('Error generating AI fix:', error.message);
    return null;
  }
}

// Apply fix to database
async function applyFix(connection, issue, newValue) {
  const tableMap = {
    article: 'articles',
    media: 'media',
    person: 'people',
    company: 'companies',
    event: 'events',
    job: 'jobs',
    accelerator: 'accelerators'
  };

  const fieldMap = {
    seoTitle: 'seo_title',
    seoDescription: 'seo_description',
    focusKeyword: 'seo_keywords', // Store as keywords for now
    altText: 'alt_text'
  };

  const table = tableMap[issue.entityType];
  const field = fieldMap[issue.field] || issue.field;

  if (!table) {
    console.error(`Unknown entity type: ${issue.entityType}`);
    return false;
  }

  try {
    await connection.execute(
      `UPDATE ${table} SET ${field} = ?, updated_at = NOW() WHERE id = ?`,
      [newValue, issue.entityId]
    );
    return true;
  } catch (error) {
    console.error(`Error applying fix to ${table}:`, error.message);
    return false;
  }
}

// Audit articles
async function auditArticles(connection) {
  const issues = [];
  
  const [articles] = await connection.execute(`
    SELECT id, title, slug, seo_title, seo_description, seo_keywords, 
           focus_keyword_id, canonical_url, featured_image_id, content, excerpt
    FROM articles
  `);

  // Check for duplicate titles
  const titleCounts = new Map();
  for (const article of articles) {
    const effectiveTitle = article.seo_title || article.title;
    if (effectiveTitle) {
      const existing = titleCounts.get(effectiveTitle.toLowerCase()) || [];
      existing.push(article.id);
      titleCounts.set(effectiveTitle.toLowerCase(), existing);
    }
  }

  // Check for duplicate descriptions
  const descCounts = new Map();
  for (const article of articles) {
    const effectiveDesc = article.seo_description || article.excerpt;
    if (effectiveDesc) {
      const existing = descCounts.get(effectiveDesc.toLowerCase()) || [];
      existing.push(article.id);
      descCounts.set(effectiveDesc.toLowerCase(), existing);
    }
  }

  for (const article of articles) {
    // Long meta title
    const effectiveTitle = article.seo_title || article.title;
    if (effectiveTitle && effectiveTitle.length > 60) {
      issues.push({
        id: `long_meta_title_article_${article.id}`,
        type: 'long_meta_title',
        entityType: 'article',
        entityId: article.id,
        entityTitle: article.title || 'Untitled',
        field: 'seoTitle',
        currentValue: effectiveTitle,
        autoFixAvailable: true
      });
    }

    // Missing meta description
    if (!article.seo_description && !article.excerpt) {
      issues.push({
        id: `missing_meta_description_article_${article.id}`,
        type: 'missing_meta_description',
        entityType: 'article',
        entityId: article.id,
        entityTitle: article.title || 'Untitled',
        field: 'seoDescription',
        currentValue: undefined,
        autoFixAvailable: true
      });
    }

    // Short meta description
    const effectiveDesc = article.seo_description || article.excerpt;
    if (effectiveDesc && effectiveDesc.length < 120) {
      issues.push({
        id: `short_meta_description_article_${article.id}`,
        type: 'short_meta_description',
        entityType: 'article',
        entityId: article.id,
        entityTitle: article.title || 'Untitled',
        field: 'seoDescription',
        currentValue: effectiveDesc,
        autoFixAvailable: true
      });
    }

    // Missing focus keyword
    if (!article.focus_keyword_id) {
      issues.push({
        id: `missing_focus_keyword_article_${article.id}`,
        type: 'missing_focus_keyword',
        entityType: 'article',
        entityId: article.id,
        entityTitle: article.title || 'Untitled',
        field: 'focusKeyword',
        currentValue: undefined,
        autoFixAvailable: true
      });
    }

    // Duplicate meta title
    const titleKey = (article.seo_title || article.title)?.toLowerCase();
    if (titleKey) {
      const duplicates = titleCounts.get(titleKey) || [];
      if (duplicates.length > 1 && duplicates[0] !== article.id) {
        issues.push({
          id: `duplicate_meta_title_article_${article.id}`,
          type: 'duplicate_meta_title',
          entityType: 'article',
          entityId: article.id,
          entityTitle: article.title || 'Untitled',
          field: 'seoTitle',
          currentValue: effectiveTitle,
          autoFixAvailable: true
        });
      }
    }

    // Duplicate meta description
    const descKey = (article.seo_description || article.excerpt)?.toLowerCase();
    if (descKey) {
      const duplicates = descCounts.get(descKey) || [];
      if (duplicates.length > 1 && duplicates[0] !== article.id) {
        issues.push({
          id: `duplicate_meta_description_article_${article.id}`,
          type: 'duplicate_meta_description',
          entityType: 'article',
          entityId: article.id,
          entityTitle: article.title || 'Untitled',
          field: 'seoDescription',
          currentValue: effectiveDesc,
          autoFixAvailable: true
        });
      }
    }
  }

  return issues;
}

// Audit media
async function auditMedia(connection) {
  const issues = [];
  
  const [mediaItems] = await connection.execute(`
    SELECT id, filename, alt_text FROM media
  `);

  for (const item of mediaItems) {
    if (!item.alt_text) {
      issues.push({
        id: `missing_alt_text_media_${item.id}`,
        type: 'missing_alt_text',
        entityType: 'media',
        entityId: item.id,
        entityTitle: item.filename || 'Untitled',
        field: 'altText',
        currentValue: undefined,
        autoFixAvailable: true
      });
    }
  }

  return issues;
}

// Audit people
async function auditPeople(connection) {
  const issues = [];
  
  const [peopleList] = await connection.execute(`
    SELECT id, name, slug, seo_title, seo_description, short_bio FROM people
  `);

  for (const person of peopleList) {
    // Long meta title
    const effectiveTitle = person.seo_title || person.name;
    if (effectiveTitle && effectiveTitle.length > 60) {
      issues.push({
        id: `long_meta_title_person_${person.id}`,
        type: 'long_meta_title',
        entityType: 'person',
        entityId: person.id,
        entityTitle: person.name || 'Untitled',
        field: 'seoTitle',
        currentValue: effectiveTitle,
        autoFixAvailable: true
      });
    }

    // Missing meta description
    if (!person.seo_description && !person.short_bio) {
      issues.push({
        id: `missing_meta_description_person_${person.id}`,
        type: 'missing_meta_description',
        entityType: 'person',
        entityId: person.id,
        entityTitle: person.name || 'Untitled',
        field: 'seoDescription',
        currentValue: undefined,
        autoFixAvailable: true
      });
    }

    // Short meta description
    const effectiveDesc = person.seo_description || person.short_bio;
    if (effectiveDesc && effectiveDesc.length < 120) {
      issues.push({
        id: `short_meta_description_person_${person.id}`,
        type: 'short_meta_description',
        entityType: 'person',
        entityId: person.id,
        entityTitle: person.name || 'Untitled',
        field: 'seoDescription',
        currentValue: effectiveDesc,
        autoFixAvailable: true
      });
    }
  }

  return issues;
}

// Audit companies
async function auditCompanies(connection) {
  const issues = [];
  
  const [companiesList] = await connection.execute(`
    SELECT id, name, slug, seo_title, seo_description, description FROM companies
  `);

  for (const company of companiesList) {
    // Long meta title
    const effectiveTitle = company.seo_title || company.name;
    if (effectiveTitle && effectiveTitle.length > 60) {
      issues.push({
        id: `long_meta_title_company_${company.id}`,
        type: 'long_meta_title',
        entityType: 'company',
        entityId: company.id,
        entityTitle: company.name || 'Untitled',
        field: 'seoTitle',
        currentValue: effectiveTitle,
        autoFixAvailable: true
      });
    }

    // Missing meta description
    if (!company.seo_description && !company.description) {
      issues.push({
        id: `missing_meta_description_company_${company.id}`,
        type: 'missing_meta_description',
        entityType: 'company',
        entityId: company.id,
        entityTitle: company.name || 'Untitled',
        field: 'seoDescription',
        currentValue: undefined,
        autoFixAvailable: true
      });
    }

    // Short meta description
    const effectiveDesc = company.seo_description || company.description;
    if (effectiveDesc && effectiveDesc.length < 120) {
      issues.push({
        id: `short_meta_description_company_${company.id}`,
        type: 'short_meta_description',
        entityType: 'company',
        entityId: company.id,
        entityTitle: company.name || 'Untitled',
        field: 'seoDescription',
        currentValue: effectiveDesc,
        autoFixAvailable: true
      });
    }
  }

  return issues;
}

// Audit events
async function auditEvents(connection) {
  const issues = [];
  
  const [eventsList] = await connection.execute(`
    SELECT id, title, slug, seo_title, seo_description, description FROM events
  `);

  for (const event of eventsList) {
    // Long meta title
    const effectiveTitle = event.seo_title || event.title;
    if (effectiveTitle && effectiveTitle.length > 60) {
      issues.push({
        id: `long_meta_title_event_${event.id}`,
        type: 'long_meta_title',
        entityType: 'event',
        entityId: event.id,
        entityTitle: event.title || 'Untitled',
        field: 'seoTitle',
        currentValue: effectiveTitle,
        autoFixAvailable: true
      });
    }

    // Missing meta description
    if (!event.seo_description && !event.description) {
      issues.push({
        id: `missing_meta_description_event_${event.id}`,
        type: 'missing_meta_description',
        entityType: 'event',
        entityId: event.id,
        entityTitle: event.title || 'Untitled',
        field: 'seoDescription',
        currentValue: undefined,
        autoFixAvailable: true
      });
    }

    // Short meta description
    const effectiveDesc = event.seo_description || event.description;
    if (effectiveDesc && effectiveDesc.length < 120) {
      issues.push({
        id: `short_meta_description_event_${event.id}`,
        type: 'short_meta_description',
        entityType: 'event',
        entityId: event.id,
        entityTitle: event.title || 'Untitled',
        field: 'seoDescription',
        currentValue: effectiveDesc,
        autoFixAvailable: true
      });
    }
  }

  return issues;
}

// Audit jobs
async function auditJobs(connection) {
  const issues = [];
  
  const [jobsList] = await connection.execute(`
    SELECT id, title, slug, seo_title, seo_description, description FROM jobs
  `);

  for (const job of jobsList) {
    // Long meta title
    const effectiveTitle = job.seo_title || job.title;
    if (effectiveTitle && effectiveTitle.length > 60) {
      issues.push({
        id: `long_meta_title_job_${job.id}`,
        type: 'long_meta_title',
        entityType: 'job',
        entityId: job.id,
        entityTitle: job.title || 'Untitled',
        field: 'seoTitle',
        currentValue: effectiveTitle,
        autoFixAvailable: true
      });
    }

    // Missing meta description
    if (!job.seo_description && !job.description) {
      issues.push({
        id: `missing_meta_description_job_${job.id}`,
        type: 'missing_meta_description',
        entityType: 'job',
        entityId: job.id,
        entityTitle: job.title || 'Untitled',
        field: 'seoDescription',
        currentValue: undefined,
        autoFixAvailable: true
      });
    }

    // Short meta description
    const effectiveDesc = job.seo_description || job.description;
    if (effectiveDesc && effectiveDesc.length < 120) {
      issues.push({
        id: `short_meta_description_job_${job.id}`,
        type: 'short_meta_description',
        entityType: 'job',
        entityId: job.id,
        entityTitle: job.title || 'Untitled',
        field: 'seoDescription',
        currentValue: effectiveDesc,
        autoFixAvailable: true
      });
    }
  }

  return issues;
}

async function main() {
  console.log('🔍 Starting SEO audit and fix process...\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Run audit
    console.log('📊 Running SEO audit...');
    const [
      articleIssues,
      mediaIssues,
      peopleIssues,
      companyIssues,
      eventIssues,
      jobIssues
    ] = await Promise.all([
      auditArticles(connection),
      auditMedia(connection),
      auditPeople(connection),
      auditCompanies(connection),
      auditEvents(connection),
      auditJobs(connection)
    ]);

    const allIssues = [
      ...articleIssues,
      ...mediaIssues,
      ...peopleIssues,
      ...companyIssues,
      ...eventIssues,
      ...jobIssues
    ];

    const autoFixableIssues = allIssues.filter(i => i.autoFixAvailable);
    
    console.log(`\n📈 Audit Results:`);
    console.log(`   Total issues: ${allIssues.length}`);
    console.log(`   Auto-fixable: ${autoFixableIssues.length}`);
    console.log(`   - Articles: ${articleIssues.filter(i => i.autoFixAvailable).length}`);
    console.log(`   - Media: ${mediaIssues.filter(i => i.autoFixAvailable).length}`);
    console.log(`   - People: ${peopleIssues.filter(i => i.autoFixAvailable).length}`);
    console.log(`   - Companies: ${companyIssues.filter(i => i.autoFixAvailable).length}`);
    console.log(`   - Events: ${eventIssues.filter(i => i.autoFixAvailable).length}`);
    console.log(`   - Jobs: ${jobIssues.filter(i => i.autoFixAvailable).length}`);

    if (autoFixableIssues.length === 0) {
      console.log('\n✅ No auto-fixable issues found!');
      return;
    }

    // Apply fixes
    console.log(`\n🔧 Applying fixes to ${autoFixableIssues.length} issues...`);
    
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    // Process in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < autoFixableIssues.length; i += batchSize) {
      const batch = autoFixableIssues.slice(i, i + batchSize);
      
      for (const issue of batch) {
        process.stdout.write(`   Fixing ${issue.type} for ${issue.entityType} #${issue.entityId}... `);
        
        try {
          // Skip focus keyword issues for now (need keyword table integration)
          if (issue.type === 'missing_focus_keyword') {
            console.log('⏭️ Skipped (requires keyword selection)');
            skipCount++;
            continue;
          }

          const fix = await generateAiFix(issue);
          
          if (!fix) {
            console.log('❌ Failed to generate fix');
            failCount++;
            continue;
          }

          const success = await applyFix(connection, issue, fix);
          
          if (success) {
            console.log(`✅ Fixed: "${fix.substring(0, 50)}..."`);
            successCount++;
          } else {
            console.log('❌ Failed to apply');
            failCount++;
          }
        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
          failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Progress update
      const progress = Math.min(i + batchSize, autoFixableIssues.length);
      console.log(`\n   Progress: ${progress}/${autoFixableIssues.length} (${Math.round(progress/autoFixableIssues.length*100)}%)\n`);
    }

    console.log('\n📊 Fix Results:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⏭️ Skipped: ${skipCount}`);
    console.log(`   Total: ${autoFixableIssues.length}`);

  } finally {
    await connection.end();
  }
}

main().catch(console.error);
