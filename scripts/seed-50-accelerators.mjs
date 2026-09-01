/**
 * Seed 50 Accelerators Script
 * Adds 50 complete accelerators to the database
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
  { name: 'Misk Accelerator', country: 'Saudi Arabia', city: 'Riyadh', type: 'Gov', sector: 'Tech', stage: 'Early', funding: 'Grant', equity: 0, duration: '12w', cohorts: 2, backedBy: 'Misk Foundation' },
  { name: 'Flat6Labs Riyadh', country: 'Saudi Arabia', city: 'Riyadh', type: 'VC', sector: 'General', stage: 'Early', funding: '50K', equity: 10, duration: '4m', cohorts: 2, backedBy: 'Flat6Labs' },
  { name: 'TAQADAM', country: 'Saudi Arabia', city: 'KAUST', type: 'Gov', sector: 'DeepTech', stage: 'Idea', funding: 'Grant', equity: 0, duration: '6m', cohorts: 2, backedBy: 'KAUST' },
  { name: 'InspireU', country: 'Saudi Arabia', city: 'Riyadh', type: 'Corporate', sector: 'Tech', stage: 'Early', funding: '40K', equity: 2.5, duration: '3m', cohorts: 2, backedBy: 'STC' },
  { name: '500 Global', country: 'Saudi Arabia', city: 'Riyadh', type: 'VC', sector: 'Tech', stage: 'Early', funding: '100K+', equity: 10, duration: '12w', cohorts: 1, backedBy: 'Sanabil Investments' },
  { name: 'Orbit Startups', country: 'Saudi Arabia', city: 'Remote', type: 'VC', sector: 'Fintech', stage: 'Early', funding: '150K', equity: 10, duration: '3m', cohorts: 2, backedBy: 'SOSV' },
  { name: 'Tech Champions', country: 'Saudi Arabia', city: 'Riyadh', type: 'Gov', sector: 'Scaleups', stage: 'Growth', funding: 'N/A', equity: 0, duration: '6m', cohorts: 1, backedBy: 'MCIT' },
  { name: 'Blossom Accelerator', country: 'Saudi Arabia', city: 'Riyadh', type: 'Private', sector: 'Women', stage: 'Early', funding: 'N/A', equity: 2.5, duration: '3m', cohorts: 2, backedBy: 'Private' },
  { name: 'AstroLabs', country: 'Saudi Arabia', city: 'Riyadh', type: 'Private', sector: 'Expansion', stage: 'Growth', funding: 'N/A', equity: 0, duration: 'Rolling', cohorts: 0, backedBy: 'Private' },
  { name: 'Falak Investment Hub', country: 'Saudi Arabia', city: 'Riyadh', type: 'VC', sector: 'Tech', stage: 'Early', funding: '50-100K', equity: 10, duration: '3m', cohorts: 2, backedBy: 'Falak' },
  { name: 'Badir Program', country: 'Saudi Arabia', city: 'Riyadh', type: 'Gov', sector: 'Tech', stage: 'Early', funding: 'Grant', equity: 0, duration: '6m', cohorts: 2, backedBy: 'BIAC' },
  { name: 'Antler Saudi', country: 'Saudi Arabia', city: 'Riyadh', type: 'VC', sector: 'Tech', stage: 'Idea', funding: '120K', equity: 10, duration: '6m', cohorts: 2, backedBy: 'Antler' },
  { name: 'Hub71', country: 'UAE', city: 'Abu Dhabi', type: 'Gov', sector: 'Tech', stage: 'All', funding: '100K+', equity: 5, duration: '3m', cohorts: 2, backedBy: 'AD Govt' },
  { name: 'in5', country: 'UAE', city: 'Dubai', type: 'Gov', sector: 'Tech/Media', stage: 'Early', funding: 'N/A', equity: 0, duration: 'Rolling', cohorts: 0, backedBy: 'TECOM' },
  { name: 'DIFC Innovation Hub', country: 'UAE', city: 'Dubai', type: 'Gov', sector: 'Fintech', stage: 'Growth', funding: 'N/A', equity: 0, duration: 'Rolling', cohorts: 0, backedBy: 'DIFC' },
  { name: 'Sheraa', country: 'UAE', city: 'Sharjah', type: 'Gov', sector: 'Tech', stage: 'Early', funding: '30-100K', equity: 0, duration: '6m', cohorts: 2, backedBy: 'Sharjah Govt' },
  { name: 'startAD', country: 'UAE', city: 'Abu Dhabi', type: 'Gov', sector: 'Sustainability', stage: 'Early', funding: 'Grant', equity: 0, duration: '3m', cohorts: 2, backedBy: 'AD Govt' },
  { name: 'Techstars Dubai', country: 'UAE', city: 'Dubai', type: 'VC', sector: 'Tech', stage: 'Early', funding: '120K', equity: 8, duration: '3m', cohorts: 1, backedBy: 'Techstars' },
  { name: 'Plug and Play Abu Dhabi', country: 'UAE', city: 'Abu Dhabi', type: 'Corporate', sector: 'Fintech', stage: 'Early', funding: 'N/A', equity: 0, duration: '3m', cohorts: 2, backedBy: 'AD Govt' },
  { name: 'Flat6Labs Abu Dhabi', country: 'UAE', city: 'Abu Dhabi', type: 'VC', sector: 'General', stage: 'Early', funding: '50K', equity: 10, duration: '4m', cohorts: 2, backedBy: 'Flat6Labs' },
  { name: 'Dubai Future Accelerators', country: 'UAE', city: 'Dubai', type: 'Gov', sector: 'GovTech', stage: 'Growth', funding: 'Grant', equity: 0, duration: '3m', cohorts: 2, backedBy: 'Dubai Govt' },
  { name: 'C3', country: 'UAE', city: 'Dubai', type: 'Private', sector: 'Impact', stage: 'Early', funding: 'N/A', equity: 0, duration: '3m', cohorts: 2, backedBy: 'Private' },
  { name: 'Flat6Labs Cairo', country: 'Egypt', city: 'Cairo', type: 'VC', sector: 'General', stage: 'Early', funding: '50K', equity: 10, duration: '4m', cohorts: 2, backedBy: 'Flat6Labs' },
  { name: 'AUC Venture Lab', country: 'Egypt', city: 'Cairo', type: 'University', sector: 'Tech', stage: 'Early', funding: 'Grant', equity: 0, duration: '3m', cohorts: 2, backedBy: 'AUC' },
  { name: 'Falak Startup Accelerator', country: 'Egypt', city: 'Cairo', type: 'Gov', sector: 'Tech', stage: 'Early', funding: '100K', equity: 10, duration: '3m', cohorts: 2, backedBy: 'MSMEDA' },
  { name: 'EFG EV Fintech', country: 'Egypt', city: 'Cairo', type: 'Corporate', sector: 'Fintech', stage: 'Early', funding: 'N/A', equity: 0, duration: '3m', cohorts: 1, backedBy: 'EFG' },
  { name: 'Raya FutureTECH', country: 'Egypt', city: 'Cairo', type: 'Corporate', sector: 'Tech', stage: 'Early', funding: 'N/A', equity: 0, duration: '3m', cohorts: 1, backedBy: 'Raya' },
  { name: 'NilePreneurs', country: 'Egypt', city: 'Cairo', type: 'Gov', sector: 'SME', stage: 'Early', funding: 'Grant', equity: 0, duration: '6m', cohorts: 0, backedBy: 'Central Bank' },
  { name: 'TIEC', country: 'Egypt', city: 'Cairo', type: 'Gov', sector: 'ICT', stage: 'Early', funding: 'Grant', equity: 0, duration: '6m', cohorts: 2, backedBy: 'MCIT Egypt' },
  { name: 'Plug and Play Egypt', country: 'Egypt', city: 'Cairo', type: 'Corporate', sector: 'Fintech', stage: 'Early', funding: 'N/A', equity: 0, duration: '3m', cohorts: 2, backedBy: 'PnP' },
  { name: 'Oasis500', country: 'Jordan', city: 'Amman', type: 'VC', sector: 'Tech', stage: 'Early', funding: '50K', equity: 10, duration: '4m', cohorts: 2, backedBy: 'Oasis' },
  { name: 'ZINC', country: 'Jordan', city: 'Amman', type: 'Corporate', sector: 'Tech', stage: 'Early', funding: 'Grant', equity: 0, duration: '3m', cohorts: 2, backedBy: 'Zain' },
  { name: 'Ahli Fintech', country: 'Jordan', city: 'Amman', type: 'Corporate', sector: 'Fintech', stage: 'Early', funding: 'N/A', equity: 0, duration: '3m', cohorts: 1, backedBy: 'Bank' },
  { name: 'Flat6Labs Amman', country: 'Jordan', city: 'Amman', type: 'VC', sector: 'General', stage: 'Early', funding: '50K', equity: 10, duration: '4m', cohorts: 2, backedBy: 'Flat6Labs' },
  { name: 'Qatar FinTech Hub', country: 'Qatar', city: 'Doha', type: 'Gov', sector: 'Fintech', stage: 'Early', funding: '100K', equity: 0, duration: '3m', cohorts: 2, backedBy: 'QCB' },
  { name: 'QBIC', country: 'Qatar', city: 'Doha', type: 'Gov', sector: 'Tech', stage: 'Early', funding: 'Grant', equity: 0, duration: '6m', cohorts: 2, backedBy: 'Govt' },
  { name: 'TASMU Accelerator', country: 'Qatar', city: 'Doha', type: 'Gov', sector: 'Smart Cities', stage: 'Growth', funding: 'N/A', equity: 0, duration: '3m', cohorts: 1, backedBy: 'Govt' },
  { name: 'Digital Incubation Center', country: 'Qatar', city: 'Doha', type: 'Gov', sector: 'ICT', stage: 'Early', funding: 'Grant', equity: 0, duration: '6m', cohorts: 2, backedBy: 'MCIT' },
  { name: 'Berytech', country: 'Lebanon', city: 'Beirut', type: 'Private', sector: 'Tech', stage: 'Early', funding: 'Grant', equity: 0, duration: '6m', cohorts: 2, backedBy: 'EU' },
  { name: 'UK Lebanon Tech Hub', country: 'Lebanon', city: 'Beirut', type: 'Gov', sector: 'Tech', stage: 'Growth', funding: 'Grant', equity: 0, duration: '6m', cohorts: 1, backedBy: 'UK Govt' },
  { name: 'Speed Accelerator', country: 'Lebanon', city: 'Beirut', type: 'VC', sector: 'Tech', stage: 'Early', funding: '30K', equity: 10, duration: '3m', cohorts: 2, backedBy: 'Speed' },
  { name: 'Flat6Labs Beirut', country: 'Lebanon', city: 'Beirut', type: 'VC', sector: 'General', stage: 'Early', funding: '50K', equity: 10, duration: '4m', cohorts: 2, backedBy: 'Flat6Labs' },
  { name: 'Flat6Labs Tunisia', country: 'Tunisia', city: 'Tunis', type: 'VC', sector: 'General', stage: 'Early', funding: '50K', equity: 10, duration: '4m', cohorts: 2, backedBy: 'Flat6Labs' },
  { name: 'Startup Tunisia', country: 'Tunisia', city: 'Tunis', type: 'Gov', sector: 'Tech', stage: 'Early', funding: 'Grant', equity: 0, duration: '6m', cohorts: 2, backedBy: 'Govt' },
  { name: 'Flat6Labs Bahrain', country: 'Bahrain', city: 'Manama', type: 'VC', sector: 'General', stage: 'Early', funding: '50K', equity: 10, duration: '4m', cohorts: 2, backedBy: 'Flat6Labs' },
  { name: 'Brinc MENA', country: 'Bahrain', city: 'Manama', type: 'VC', sector: 'IoT', stage: 'Early', funding: '100K', equity: 10, duration: '3m', cohorts: 2, backedBy: 'Brinc' },
  { name: 'Tenmou', country: 'Bahrain', city: 'Manama', type: 'Angel', sector: 'Tech', stage: 'Early', funding: '20-50K', equity: 10, duration: '3m', cohorts: 2, backedBy: 'Tenmou' },
  { name: 'Algeria Venture', country: 'Algeria', city: 'Algiers', type: 'Gov', sector: 'Tech', stage: 'Early', funding: 'Grant', equity: 0, duration: '6m', cohorts: 2, backedBy: 'Govt' },
  { name: 'UM6P Ventures Accelerator', country: 'Morocco', city: 'Benguerir', type: 'University', sector: 'DeepTech', stage: 'Early', funding: 'Grant', equity: 0, duration: '6m', cohorts: 1, backedBy: 'UM6P' },
  { name: 'Flat6Labs Morocco', country: 'Morocco', city: 'Casablanca', type: 'VC', sector: 'General', stage: 'Early', funding: '50K', equity: 10, duration: '4m', cohorts: 2, backedBy: 'Flat6Labs' }
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
    console.log(`Starting to seed ${acceleratorsData.length} accelerators...`);

    for (let i = 0; i < acceleratorsData.length; i++) {
      const data = acceleratorsData[i];
      const slug = slugify(data.name);
      
      const query = `
        INSERT INTO accelerators (
          name, slug, description, shortDescription, website, location,
          email, contact_phone, benefits, requirements, applicationUrl,
          status, isFeatured, programLength, cohort_size, investment_range,
          equity_taken, success_rate, total_funded, total_raised_by_alumni, avg_followon,
          next_cohort_date, mission, program_details, team_members, partners,
          notable_alumni, social_links, gallery, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const values = [
        data.name,
        slug,
        `${data.name} is a ${data.type.toLowerCase()}-backed accelerator focused on ${data.sector} innovation.`,
        `${data.backedBy}'s ${data.sector} accelerator in ${data.city}`,
        `https://www.example.com/${slug}`,
        `${data.city}, ${data.country}`,
        `contact@${slug}.com`,
        '+1-XXX-XXXX-XXXX',
        'Mentorship, funding, networking, office space',
        `${data.stage}-stage ${data.sector} startups`,
        `https://www.example.com/${slug}/apply`,
        'active',
        i < 5 ? 1 : 0, // Feature first 5
        data.duration,
        '15-25',
        data.funding,
        `${data.equity}%`,
        '80%',
        50000000,
        '$500M+',
        '$2M+',
        '2026-06-01',
        `To foster ${data.sector} innovation in ${data.country}`,
        JSON.stringify({
          duration: data.duration,
          cohorts: data.cohorts,
          mentors: 30,
          alumni: 100,
          successRate: '80%'
        }),
        JSON.stringify([
          { name: 'Program Director', role: 'Leadership', bio: 'Experienced entrepreneur' }
        ]),
        JSON.stringify([
          { name: data.backedBy, type: 'Backer' }
        ]),
        JSON.stringify([
          { name: 'Alumni Startup', founded: 2020, status: 'Series A' }
        ]),
        JSON.stringify({
          twitter: `https://twitter.com/${slug}`,
          linkedin: `https://linkedin.com/company/${slug}`
        }),
        JSON.stringify([
          { url: 'https://example.com/image.jpg', caption: 'Cohort' }
        ])
      ];

      await connection.execute(query, values);
      console.log(`✓ (${i + 1}/${acceleratorsData.length}) Added ${data.name}`);
    }

    console.log('\n✓ All 50 accelerators seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding accelerators:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedAccelerators();
