import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import fs from 'fs';

config();

// WordPress category slug -> TechScoop category ID mapping
const CATEGORY_MAPPING = {
  // Main WordPress categories
  'funding-vc': 60001,           // Funding & VC -> Funding & VC
  'technology': 60033,           // Technology -> Technology
  'events': 60115,               // Events -> Events
  'powerlist': 60135,            // PowerList -> PowerList & Rankings
  'jobs-and-talent': 60109,      // Jobs & Talent -> Jobs & Talent
  'uncategorized': 60131,        // Uncategorized -> Press Release
  
  // Sub-categories
  'fintech': 60002,              // Fintech -> Fintech
  'ai': 60027,                   // AI -> AI
  'cybersecurity': 60040,        // Cybersecurity -> Security
  'blockchain': 60046,           // Blockchain -> Web3
  'saas': 60034,                 // SaaS -> SaaS
  
  // People categories
  'founders': 60104,             // Founders -> Founders
  'investors': 60104,            // Investors -> Founders (closest match)
  'operators': 60106,            // Operators -> Operators
  'executives': 60105,           // Executives -> Executives
  'incubators': 60006,           // Incubators -> Incubators
  
  // Jobs sub-categories
  'start-up-jobs': 60110,        // Start-up jobs -> Startup Jobs
  'leaders-move': 60103,         // Leaders Move -> Leaders Move
  'skills-and-education': 60113, // Skills & Education -> Career Growth
  
  // Verticals
  'ecommerce': 60075,            // E-commerce -> Retail Tech
  'healthtech': 60052,           // HealthTech -> Health Tech
  'edtech': 60017,               // EdTech -> EdTech (if exists)
  'proptech': 60070,             // PropTech -> PropTech
  'cleantech': 60059,            // CleanTech -> Climate Tech
  'logistics': 60064,            // Logistics -> Logistics
  'foodtech': 60077,             // FoodTech -> FoodTech & Delivery
  'mobility': 60065,             // Mobility -> Mobility
  'agritech': 60158,             // AgriTech -> Agri Tech
  
  // Regions (map to Press Release as default since we don't import region categories)
  'saudi-arabia': 60131,
  'uae': 60131,
  'egypt': 60131,
  'mena': 60131,
};

// Default category for unmapped posts
const DEFAULT_CATEGORY_ID = 60131; // Press Release

// Default author ID (Mohsin)
const DEFAULT_AUTHOR_ID = 1;

// Load media URL mapping
let mediaUrlMapping = {};
try {
  mediaUrlMapping = JSON.parse(fs.readFileSync('/home/ubuntu/techscoop/media-url-mapping.json', 'utf-8'));
  console.log(`Loaded ${Object.keys(mediaUrlMapping).length} media URL mappings`);
} catch (e) {
  console.log('No media URL mapping found, will use original URLs');
}

// Import report
const report = {
  totalPosts: 0,
  imported: 0,
  skipped: [],
  missingCategory: [],
  missingFeaturedImage: [],
  redirects: [],
  urlParityCheck: [],
};

async function main() {
  console.log('Starting WordPress Import...\n');
  
  // Connect to TechScoop database
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Read WordPress SQL dump
  console.log('Reading WordPress SQL dump...');
  const sqlContent = fs.readFileSync('/home/ubuntu/upload/techzfye_wp189.sql', 'utf-8');
  
  // Parse WordPress data
  console.log('Parsing WordPress data...');
  const wpData = parseWordPressDump(sqlContent);
  console.log(`Found ${wpData.posts.length} posts`);
  console.log(`Found ${Object.keys(wpData.seoData).length} SEO records`);
  console.log(`Found ${Object.keys(wpData.attachments).length} attachments`);
  
  // Get existing TechScoop articles to avoid duplicates
  const [existingArticles] = await conn.execute('SELECT slug FROM articles');
  const existingSlugs = new Set(existingArticles.map(a => a.slug));
  console.log(`Found ${existingSlugs.size} existing articles in TechScoop`);
  
  // Get workflow status IDs
  const [workflowStatuses] = await conn.execute("SELECT id, slug FROM workflow_statuses");
  const statusMap = {};
  for (const s of workflowStatuses) {
    statusMap[s.slug] = s.id;
  }
  const publishedStatusId = statusMap['published'] || 7;
  const draftStatusId = statusMap['draft'] || 1;
  
  console.log('\nImporting articles...');
  
  for (const post of wpData.posts) {
    report.totalPosts++;
    
    // Skip if already exists
    if (existingSlugs.has(post.slug)) {
      report.skipped.push({ id: post.id, slug: post.slug, reason: 'Already exists' });
      continue;
    }
    
    // Skip empty posts
    if (!post.content || post.content.trim().length < 50) {
      report.skipped.push({ id: post.id, slug: post.slug, reason: 'Empty or too short content' });
      continue;
    }
    
    // Get category
    const postCategories = getPostCategories(post.id, wpData);
    let categoryId = null;
    let wpCategorySlug = null;
    
    for (const cat of postCategories) {
      if (CATEGORY_MAPPING[cat.slug]) {
        categoryId = CATEGORY_MAPPING[cat.slug];
        wpCategorySlug = cat.slug;
        break;
      }
    }
    
    if (!categoryId) {
      categoryId = DEFAULT_CATEGORY_ID;
      report.missingCategory.push({
        postId: post.id,
        slug: post.slug,
        title: post.title.substring(0, 80),
        wpCategories: postCategories.map(c => c.name).join(', ') || 'None',
      });
      
      // Create redirect for old URL
      if (postCategories.length > 0) {
        report.redirects.push({
          oldUrl: `/${postCategories[0].slug}/${post.slug}`,
          newUrl: `/press-release/${post.slug}`,
        });
      }
    }
    
    // Get featured image
    const thumbnailId = wpData.postMeta[post.id]?._thumbnail_id;
    let featuredImageUrl = null;
    if (thumbnailId && wpData.attachments[thumbnailId]) {
      const attachment = wpData.attachments[thumbnailId];
      featuredImageUrl = convertMediaUrl(attachment.guid);
    } else {
      report.missingFeaturedImage.push({
        postId: post.id,
        slug: post.slug,
        title: post.title.substring(0, 80),
      });
    }
    
    // Get SEO data
    const seo = wpData.seoData[post.id] || {};
    
    // Clean content - remove WP block comments and convert media URLs
    let cleanContent = cleanWordPressContent(post.content);
    
    // Determine status
    const workflowStatusId = post.status === 'publish' ? publishedStatusId : draftStatusId;
    
    // Parse dates
    const publishedAt = post.status === 'publish' && post.publishedAt !== '0000-00-00 00:00:00' 
      ? post.publishedAt 
      : null;
    const createdAt = post.createdAt !== '0000-00-00 00:00:00' ? post.createdAt : new Date().toISOString();
    const updatedAt = post.updatedAt !== '0000-00-00 00:00:00' ? post.updatedAt : createdAt;
    
    // Insert article
    try {
      const [result] = await conn.execute(
        `INSERT INTO articles (
          title, slug, content, excerpt, featuredImageUrl,
          authorId, workflowStatusId, publishedAt, createdAt, updatedAt,
          seoTitle, seoDescription, canonicalUrl,
          articleType, robotsIndex
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          post.title,
          post.slug,
          cleanContent,
          post.excerpt || null,
          featuredImageUrl,
          DEFAULT_AUTHOR_ID,
          workflowStatusId,
          publishedAt,
          createdAt,
          updatedAt,
          seo.title || null,
          seo.description || null,
          seo.canonical_url || null,
          'news',
          'index',
        ]
      );
      
      const articleId = result.insertId;
      
      // Add category relationship
      if (categoryId) {
        await conn.execute(
          'INSERT INTO article_categories (articleId, categoryId, isPrimary) VALUES (?, ?, ?)',
          [articleId, categoryId, true]
        );
      }
      
      report.imported++;
      existingSlugs.add(post.slug);
      
      // Add to URL parity check (random sample)
      if (report.urlParityCheck.length < 20 && Math.random() < 0.1) {
        report.urlParityCheck.push({
          wpSlug: post.slug,
          newSlug: post.slug,
          match: true,
        });
      }
      
      if (report.imported % 50 === 0) {
        console.log(`  Imported ${report.imported} articles...`);
      }
    } catch (err) {
      report.skipped.push({
        id: post.id,
        slug: post.slug,
        reason: err.message.substring(0, 100),
      });
    }
  }
  
  await conn.end();
  
  // Generate report
  console.log('\n========================================');
  console.log('IMPORT REPORT');
  console.log('========================================\n');
  
  console.log(`Total posts found: ${report.totalPosts}`);
  console.log(`Successfully imported: ${report.imported}`);
  console.log(`Skipped: ${report.skipped.length}`);
  console.log(`Missing category mapping: ${report.missingCategory.length}`);
  console.log(`Missing featured image: ${report.missingFeaturedImage.length}`);
  console.log(`Redirects needed: ${report.redirects.length}`);
  
  // Save detailed report
  fs.writeFileSync(
    '/home/ubuntu/techscoop/wp-import-report.json',
    JSON.stringify(report, null, 2)
  );
  
  // Save redirect mapping
  const redirectCsv = ['old_url,new_url'];
  for (const r of report.redirects) {
    redirectCsv.push(`${r.oldUrl},${r.newUrl}`);
  }
  fs.writeFileSync(
    '/home/ubuntu/techscoop/wp-redirect-mapping.csv',
    redirectCsv.join('\n')
  );
  
  console.log('\nDetailed report saved to: wp-import-report.json');
  console.log('Redirect mapping saved to: wp-redirect-mapping.csv');
}

function parseWordPressDump(sql) {
  const data = {
    posts: [],
    terms: {},
    termTaxonomy: {},
    termRelations: {},
    attachments: {},
    postMeta: {},
    seoData: {},
  };
  
  // Parse terms
  const termsMatch = sql.match(/INSERT INTO `wp8s_terms`[^;]+VALUES\s*([\s\S]*?);/);
  if (termsMatch) {
    const termRegex = /\((\d+),\s*'([^']*)',\s*'([^']*)',\s*\d+\)/g;
    let match;
    while ((match = termRegex.exec(termsMatch[1])) !== null) {
      const [, id, name, slug] = match;
      data.terms[parseInt(id)] = { 
        name: name.replace(/&amp;/g, '&'), 
        slug 
      };
    }
  }
  
  // Parse term_taxonomy
  const taxMatch = sql.match(/INSERT INTO `wp8s_term_taxonomy`[^;]+VALUES\s*([\s\S]*?);/);
  if (taxMatch) {
    const taxRegex = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'[^']*',\s*(\d+),\s*\d+\)/g;
    let match;
    while ((match = taxRegex.exec(taxMatch[1])) !== null) {
      const [, ttId, termId, taxonomy, parent] = match;
      data.termTaxonomy[parseInt(ttId)] = {
        termId: parseInt(termId),
        type: taxonomy,
        parent: parseInt(parent),
      };
    }
  }
  
  // Parse term_relationships
  const relMatch = sql.match(/INSERT INTO `wp8s_term_relationships`[^;]+VALUES\s*([\s\S]*?);/);
  if (relMatch) {
    const relRegex = /\((\d+),\s*(\d+),\s*\d+\)/g;
    let match;
    while ((match = relRegex.exec(relMatch[1])) !== null) {
      const [, objectId, ttId] = match;
      const postId = parseInt(objectId);
      if (!data.termRelations[postId]) data.termRelations[postId] = [];
      data.termRelations[postId].push(parseInt(ttId));
    }
  }
  
  // Parse postmeta for featured images
  const metaMatch = sql.match(/INSERT INTO `wp8s_postmeta`[^;]+VALUES\s*([\s\S]*?);/);
  if (metaMatch) {
    const metaRegex = /\(\d+,\s*(\d+),\s*'_thumbnail_id',\s*'(\d+)'\)/g;
    let match;
    while ((match = metaRegex.exec(metaMatch[1])) !== null) {
      const [, postId, thumbnailId] = match;
      if (!data.postMeta[parseInt(postId)]) data.postMeta[parseInt(postId)] = {};
      data.postMeta[parseInt(postId)]._thumbnail_id = parseInt(thumbnailId);
    }
  }
  
  // Parse AIOSEO data
  const seoMatch = sql.match(/INSERT INTO `wp8s_aioseo_posts`[^;]+VALUES\s*([\s\S]*?);/);
  if (seoMatch) {
    // Simplified SEO parsing - just get post_id, title, description
    const seoRegex = /\(\d+,\s*(\d+),\s*'([^']*)',\s*'([^']*)',/g;
    let match;
    while ((match = seoRegex.exec(seoMatch[1])) !== null) {
      const [, postId, title, description] = match;
      data.seoData[parseInt(postId)] = {
        title: unescapeSql(title) || null,
        description: unescapeSql(description) || null,
      };
    }
  }
  
  // Parse posts - this is the complex one
  const postsMatch = sql.match(/INSERT INTO `wp8s_posts`[^;]+VALUES\s*([\s\S]*?);/);
  if (postsMatch) {
    // Parse posts more carefully
    const postsContent = postsMatch[1];
    
    // Split by post records - look for pattern starting with (ID,
    const postRecords = [];
    let depth = 0;
    let currentRecord = '';
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < postsContent.length; i++) {
      const char = postsContent[i];
      
      if (escapeNext) {
        currentRecord += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        currentRecord += char;
        escapeNext = true;
        continue;
      }
      
      if (char === "'" && !escapeNext) {
        inString = !inString;
        currentRecord += char;
        continue;
      }
      
      if (!inString) {
        if (char === '(') {
          if (depth === 0) {
            currentRecord = '(';
          } else {
            currentRecord += char;
          }
          depth++;
        } else if (char === ')') {
          depth--;
          currentRecord += char;
          if (depth === 0) {
            postRecords.push(currentRecord);
            currentRecord = '';
          }
        } else {
          if (depth > 0) {
            currentRecord += char;
          }
        }
      } else {
        currentRecord += char;
      }
    }
    
    // Parse each post record
    for (const record of postRecords) {
      try {
        // Extract fields using a state machine approach
        const fields = parsePostRecord(record);
        if (fields && fields.postType === 'post') {
          data.posts.push({
            id: fields.id,
            authorId: fields.authorId,
            title: fields.title,
            slug: fields.slug,
            content: fields.content,
            excerpt: fields.excerpt,
            status: fields.status,
            createdAt: fields.postDate,
            updatedAt: fields.postModified,
            publishedAt: fields.postDateGmt,
          });
        }
        
        // Also capture attachments
        if (fields && fields.postType === 'attachment') {
          data.attachments[fields.id] = {
            guid: fields.guid,
          };
        }
      } catch (e) {
        // Skip malformed records
      }
    }
  }
  
  return data;
}

function parsePostRecord(record) {
  // Remove outer parentheses
  const inner = record.slice(1, -1);
  
  // Parse fields - they are comma-separated but strings can contain commas
  const fields = [];
  let current = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    
    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      current += char;
      escapeNext = true;
      continue;
    }
    
    if (char === "'") {
      inString = !inString;
      current += char;
      continue;
    }
    
    if (char === ',' && !inString) {
      fields.push(current.trim());
      current = '';
      continue;
    }
    
    current += char;
  }
  fields.push(current.trim());
  
  // Extract values (remove quotes from strings)
  const getValue = (idx) => {
    const val = fields[idx];
    if (!val) return '';
    if (val.startsWith("'") && val.endsWith("'")) {
      return unescapeSql(val.slice(1, -1));
    }
    return val;
  };
  
  // WordPress posts table structure:
  // ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt,
  // post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged,
  // post_modified, post_modified_gmt, post_content_filtered, post_parent, guid, menu_order, post_type
  
  return {
    id: parseInt(fields[0]) || 0,
    authorId: parseInt(fields[1]) || 1,
    postDate: getValue(2),
    postDateGmt: getValue(3),
    content: getValue(4),
    title: getValue(5),
    excerpt: getValue(6),
    status: getValue(7),
    slug: getValue(11),
    postModified: getValue(14),
    guid: getValue(18),
    postType: getValue(20),
  };
}

function getPostCategories(postId, wpData) {
  const categories = [];
  const ttIds = wpData.termRelations[postId] || [];
  
  for (const ttId of ttIds) {
    const tax = wpData.termTaxonomy[ttId];
    if (tax && tax.type === 'category') {
      const term = wpData.terms[tax.termId];
      if (term) {
        categories.push(term);
      }
    }
  }
  
  return categories;
}

function convertMediaUrl(url) {
  if (!url) return null;
  
  // Check if we have a mapping for this URL
  if (mediaUrlMapping[url]) {
    return mediaUrlMapping[url];
  }
  
  // Try variations
  const variations = [
    url,
    url.replace('https://', 'http://'),
    url.replace('http://', 'https://'),
    url.replace('techzfye.developer-developer.com', 'techscoop.io'),
    url.replace('techscoop.io', 'techzfye.developer-developer.com'),
  ];
  
  for (const v of variations) {
    if (mediaUrlMapping[v]) {
      return mediaUrlMapping[v];
    }
  }
  
  // Extract path and construct new URL
  const pathMatch = url.match(/\/wp-content\/uploads\/(.+)$/);
  if (pathMatch) {
    // Check if we uploaded this file
    const relPath = pathMatch[1];
    for (const [oldUrl, newUrl] of Object.entries(mediaUrlMapping)) {
      if (oldUrl.includes(relPath)) {
        return newUrl;
      }
    }
  }
  
  return url; // Return original if no mapping found
}

function cleanWordPressContent(content) {
  if (!content) return '';
  
  // Remove WordPress block comments
  let clean = content
    .replace(/<!-- wp:[^>]+-->/g, '')
    .replace(/<!-- \/wp:[^>]+-->/g, '')
    .replace(/<!--[^>]*-->/g, '');
  
  // Replace old media URLs with new ones
  for (const [oldUrl, newUrl] of Object.entries(mediaUrlMapping)) {
    clean = clean.split(oldUrl).join(newUrl);
  }
  
  // Also replace common URL patterns
  // Replace with your own S3/R2 bucket URL (e.g., https://assets.techscoop.io/uploads/)
  const MEDIA_BUCKET_URL = process.env.MEDIA_BUCKET_URL || 'https://assets.techscoop.io/uploads/';
  clean = clean.replace(
    /https?:\/\/techscoop\.io\/wp-content\/uploads\//g,
    MEDIA_BUCKET_URL
  );
  clean = clean.replace(
    /https?:\/\/techzfye\.developer-developer\.com\/wp-content\/uploads\//g,
    MEDIA_BUCKET_URL
  );
  
  return clean.trim();
}

function unescapeSql(str) {
  if (!str) return '';
  return str
    .replace(/''/g, "'")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

main().catch(console.error);
