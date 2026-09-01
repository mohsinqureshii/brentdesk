/**
 * Update all sources with per-source editorial briefs, maxAgeHours, thresholds,
 * must-watch keywords, and ignore keywords per BRD v2.0
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const sourceUpdates = [
  // ─── MENA SOURCES ────────────────────────────────────────────────────────────
  {
    name: 'Wamda',
    relevanceThreshold: 15,
    maxAgeHours: 168,
    editorialBrief: `Wamda is TechScoop's primary MENA startup intelligence source. Cover ALL funding announcements, founder stories, ecosystem reports, and investor activity. Priority: Saudi Arabia, UAE, Egypt, Jordan. Auto-generate for funding rounds above $500K. Wamda articles are pre-vetted for MENA relevance — trust the source.`,
    mustWatchKeywords: JSON.stringify(['funding', 'raises', 'series', 'seed', 'investment', 'startup', 'founder', 'MENA', 'GCC']),
    ignoreKeywords: JSON.stringify(['sponsored', 'advertisement', 'partner content']),
    authorityScore: 95,
    autoGenerateEnabled: 1,
    language: 'en',
  },
  {
    name: 'Forbes Middle East',
    relevanceThreshold: 20,
    maxAgeHours: 168,
    editorialBrief: `Forbes Middle East covers MENA's business elite, billionaires, and high-growth companies. Focus on: funding announcements, startup rankings, CEO profiles, wealth management, fintech, and Vision 2030 initiatives. Saudi and UAE stories are highest priority. Ignore generic global finance stories without MENA angle.`,
    mustWatchKeywords: JSON.stringify(['Saudi', 'UAE', 'MENA', 'Middle East', 'funding', 'startup', 'Vision 2030', 'PIF', 'Mubadala']),
    ignoreKeywords: JSON.stringify(['Hollywood', 'celebrity', 'sports', 'fashion', 'luxury without tech angle']),
    authorityScore: 90,
    autoGenerateEnabled: 1,
    language: 'en',
  },
  {
    name: 'Waya',
    relevanceThreshold: 15,
    maxAgeHours: 168,
    editorialBrief: `Waya (formerly Wamda Arabic) covers Arabic-language MENA tech news. All content is directly relevant to TechScoop's MENA mission. Cover everything: funding, product launches, regulatory news, ecosystem events. Arabic content should be translated and adapted for TechScoop's bilingual audience.`,
    mustWatchKeywords: JSON.stringify(['تمويل', 'شركة ناشئة', 'استثمار', 'السعودية', 'الإمارات', 'مصر']),
    ignoreKeywords: JSON.stringify([]),
    authorityScore: 88,
    autoGenerateEnabled: 1,
    language: 'ar',
  },
  // ─── GLOBAL TECH SOURCES ─────────────────────────────────────────────────────
  {
    name: 'TechCrunch',
    relevanceThreshold: 28,
    maxAgeHours: 72,
    editorialBrief: `TechCrunch is a global tech source. Only cover stories with a clear MENA angle: MENA startup funding, MENA company acquisitions, global tech giants expanding to MENA (Google, Amazon, Microsoft in Saudi/UAE), or global trends directly impacting MENA fintech/e-commerce. Ignore: pure US/EU startup news, celebrity tech, gaming without MENA angle.`,
    mustWatchKeywords: JSON.stringify(['Saudi Arabia', 'UAE', 'Dubai', 'MENA', 'Middle East', 'Egypt', 'Jordan', 'Pakistan', 'Careem', 'Noon', 'Talabat', 'Tamara', 'Tabby']),
    ignoreKeywords: JSON.stringify(['Silicon Valley only', 'US election', 'European regulation only', 'Hollywood']),
    authorityScore: 85,
    autoGenerateEnabled: 0,
    language: 'en',
  },
  {
    name: 'VentureBeat',
    relevanceThreshold: 30,
    maxAgeHours: 72,
    editorialBrief: `VentureBeat covers enterprise AI, ML, and deep tech. Cover only: AI tools being adopted by MENA enterprises, AI startups with MENA presence, generative AI trends affecting MENA media/finance/healthcare, and global AI regulation with MENA implications. Skip pure US enterprise software news.`,
    mustWatchKeywords: JSON.stringify(['MENA', 'Middle East', 'generative AI', 'enterprise AI', 'AI regulation', 'Saudi', 'UAE']),
    ignoreKeywords: JSON.stringify(['gaming AI only', 'US defense', 'pure US enterprise']),
    authorityScore: 80,
    autoGenerateEnabled: 0,
    language: 'en',
  },
  {
    name: 'MIT Technology Review',
    relevanceThreshold: 30,
    maxAgeHours: 168,
    editorialBrief: `MIT Tech Review covers deep technology trends. Cover: AI policy affecting MENA, climate tech relevant to GCC sustainability goals, biotech/genomics with MENA research angle, and breakthrough technologies being piloted in Saudi/UAE smart city projects. Longer shelf life — articles up to 7 days old still relevant.`,
    mustWatchKeywords: JSON.stringify(['MENA', 'Gulf', 'Saudi', 'UAE', 'climate', 'AI policy', 'NEOM', 'smart city', 'genomics']),
    ignoreKeywords: JSON.stringify(['pure academic', 'US politics only']),
    authorityScore: 82,
    autoGenerateEnabled: 0,
    language: 'en',
  },
  {
    name: 'Sifted',
    relevanceThreshold: 28,
    maxAgeHours: 72,
    editorialBrief: `Sifted covers European startups. Cover only: European VCs investing in MENA, European startups expanding to MENA markets, European fintech/healthtech models applicable to MENA, and cross-border EU-MENA tech partnerships. Skip pure European domestic news.`,
    mustWatchKeywords: JSON.stringify(['MENA', 'Middle East', 'expansion', 'emerging markets', 'Gulf', 'Saudi', 'UAE']),
    ignoreKeywords: JSON.stringify(['UK only', 'EU regulation only', 'pure European']),
    authorityScore: 72,
    autoGenerateEnabled: 0,
    language: 'en',
  },
];

console.log(`Updating ${sourceUpdates.length} sources with editorial briefs...`);

for (const update of sourceUpdates) {
  const [rows] = await conn.execute(
    'SELECT id FROM ai_agent_sources WHERE name = ? LIMIT 1',
    [update.name]
  );
  if (!rows.length) {
    console.log(`  ⚠ Source not found: ${update.name}`);
    continue;
  }
  const sourceId = rows[0].id;

  await conn.execute(
    `UPDATE ai_agent_sources SET
      relevance_threshold = ?,
      max_age_hours = ?,
      editorial_brief = ?,
      must_watch_keywords = ?,
      ignore_keywords = ?,
      authority_score = ?,
      auto_generate_enabled = ?,
      language = ?
     WHERE id = ?`,
    [
      update.relevanceThreshold,
      update.maxAgeHours,
      update.editorialBrief,
      update.mustWatchKeywords,
      update.ignoreKeywords,
      update.authorityScore,
      update.autoGenerateEnabled,
      update.language,
      sourceId,
    ]
  );
  console.log(`  ✓ Updated: ${update.name} (id=${sourceId}, threshold=${update.relevanceThreshold}%, maxAge=${update.maxAgeHours}h)`);
}

// Also fix Zawya if it exists
const [zawya] = await conn.execute(
  "SELECT id FROM ai_agent_sources WHERE name LIKE '%Zawya%' OR url LIKE '%zawya%' LIMIT 1"
);
if (zawya.length) {
  await conn.execute(
    `UPDATE ai_agent_sources SET relevance_threshold = 15, max_age_hours = 168, authority_score = 92, auto_generate_enabled = 1 WHERE id = ?`,
    [zawya[0].id]
  );
  console.log(`  ✓ Fixed Zawya threshold to 15%`);
}

await conn.end();
console.log('All source briefs updated!');
