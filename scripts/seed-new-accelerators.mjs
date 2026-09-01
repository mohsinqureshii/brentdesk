/**
 * Seed New Accelerators Script
 * Adds 50 accelerators, skipping duplicates
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!urlMatch) {
  console.error('Invalid DATABASE_URL format');
  process.exit(1);
}
const [, user, password, host, port, database] = urlMatch;

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const acceleratorsData = [
  { name: 'Misk Accelerator', country: 'Saudi Arabia', city: 'Riyadh' },
  { name: 'Flat6Labs Riyadh', country: 'Saudi Arabia', city: 'Riyadh' },
  { name: 'TAQADAM', country: 'Saudi Arabia', city: 'KAUST' },
  { name: 'InspireU', country: 'Saudi Arabia', city: 'Riyadh' },
  { name: '500 Global', country: 'Saudi Arabia', city: 'Riyadh' },
  { name: 'Orbit Startups', country: 'Saudi Arabia', city: 'Remote' },
  { name: 'Tech Champions', country: 'Saudi Arabia', city: 'Riyadh' },
  { name: 'Blossom Accelerator', country: 'Saudi Arabia', city: 'Riyadh' },
  { name: 'AstroLabs', country: 'Saudi Arabia', city: 'Riyadh' },
  { name: 'Falak Investment Hub', country: 'Saudi Arabia', city: 'Riyadh' },
  { name: 'Badir Program', country: 'Saudi Arabia', city: 'Riyadh' },
  { name: 'Antler Saudi', country: 'Saudi Arabia', city: 'Riyadh' },
  { name: 'Hub71', country: 'UAE', city: 'Abu Dhabi' },
  { name: 'in5', country: 'UAE', city: 'Dubai' },
  { name: 'DIFC Innovation Hub', country: 'UAE', city: 'Dubai' },
  { name: 'Sheraa', country: 'UAE', city: 'Sharjah' },
  { name: 'startAD', country: 'UAE', city: 'Abu Dhabi' },
  { name: 'Techstars Dubai', country: 'UAE', city: 'Dubai' },
  { name: 'Plug and Play Abu Dhabi', country: 'UAE', city: 'Abu Dhabi' },
  { name: 'Flat6Labs Abu Dhabi', country: 'UAE', city: 'Abu Dhabi' },
  { name: 'Dubai Future Accelerators', country: 'UAE', city: 'Dubai' },
  { name: 'C3', country: 'UAE', city: 'Dubai' },
  { name: 'Flat6Labs Cairo', country: 'Egypt', city: 'Cairo' },
  { name: 'AUC Venture Lab', country: 'Egypt', city: 'Cairo' },
  { name: 'Falak Startup Accelerator', country: 'Egypt', city: 'Cairo' },
  { name: 'EFG EV Fintech', country: 'Egypt', city: 'Cairo' },
  { name: 'Raya FutureTECH', country: 'Egypt', city: 'Cairo' },
  { name: 'NilePreneurs', country: 'Egypt', city: 'Cairo' },
  { name: 'TIEC', country: 'Egypt', city: 'Cairo' },
  { name: 'Plug and Play Egypt', country: 'Egypt', city: 'Cairo' },
  { name: 'Oasis500', country: 'Jordan', city: 'Amman' },
  { name: 'ZINC', country: 'Jordan', city: 'Amman' },
  { name: 'Ahli Fintech', country: 'Jordan', city: 'Amman' },
  { name: 'Flat6Labs Amman', country: 'Jordan', city: 'Amman' },
  { name: 'Qatar FinTech Hub', country: 'Qatar', city: 'Doha' },
  { name: 'QBIC', country: 'Qatar', city: 'Doha' },
  { name: 'TASMU Accelerator', country: 'Qatar', city: 'Doha' },
  { name: 'Digital Incubation Center', country: 'Qatar', city: 'Doha' },
  { name: 'Berytech', country: 'Lebanon', city: 'Beirut' },
  { name: 'UK Lebanon Tech Hub', country: 'Lebanon', city: 'Beirut' },
  { name: 'Speed Accelerator', country: 'Lebanon', city: 'Beirut' },
  { name: 'Flat6Labs Beirut', country: 'Lebanon', city: 'Beirut' },
  { name: 'Flat6Labs Tunisia', country: 'Tunisia', city: 'Tunis' },
  { name: 'Startup Tunisia', country: 'Tunisia', city: 'Tunis' },
  { name: 'Flat6Labs Bahrain', country: 'Bahrain', city: 'Manama' },
  { name: 'Brinc MENA', country: 'Bahrain', city: 'Manama' },
  { name: 'Tenmou', country: 'Bahrain', city: 'Manama' },
  { name: 'Algeria Venture', country: 'Algeria', city: 'Algiers' },
  { name: 'UM6P Ventures Accelerator', country: 'Morocco', city: 'Benguerir' },
  { name: 'Flat6Labs Morocco', country: 'Morocco', city: 'Casablanca' }
];

async function seedAccelerators() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: parseInt(port),
      ssl: {}
    });

    console.log('✓ Connected to database');

    // Get existing slugs
    const [existing] = await connection.execute('SELECT slug FROM accelerators');
    const existingSlugs = new Set(existing.map(row => row.slug));
    console.log(`✓ Found ${existingSlugs.size} existing accelerators`);

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < acceleratorsData.length; i++) {
      const data = acceleratorsData[i];
      const slug = slugify(data.name);
      
      if (existingSlugs.has(slug)) {
        console.log(`⊘ (${i + 1}/${acceleratorsData.length}) Skipped ${data.name} (already exists)`);
        skipped++;
        continue;
      }

      const query = `
        INSERT INTO accelerators (name, slug, location, status, isFeatured, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const values = [
        data.name,
        slug,
        `${data.city}, ${data.country}`,
        'active',
        added < 5 ? 1 : 0
      ];

      await connection.execute(query, values);
      console.log(`✓ (${i + 1}/${acceleratorsData.length}) Added ${data.name}`);
      added++;
    }

    console.log(`\n✓ Seeding complete: ${added} added, ${skipped} skipped`);
    console.log(`✓ Total accelerators in database: ${existingSlugs.size + added}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding accelerators:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedAccelerators();
