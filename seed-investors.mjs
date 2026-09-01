import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function seedInvestors() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('Seeding investors...');
  
  // Get the published status ID
  const [statuses] = await connection.execute(
    "SELECT id FROM workflow_statuses WHERE name = 'Published' LIMIT 1"
  );
  const publishedStatusId = statuses[0]?.id || 7;
  
  const investors = [
    {
      name: "STV",
      slug: "stv",
      type: "vc",
      description: "STV is a $500M venture capital fund focused on technology companies in the Middle East and North Africa. We invest in exceptional founders building transformative technology companies.",
      shortDescription: "MENA's leading technology venture capital fund",
      website: "https://stv.vc",
      linkedIn: "https://linkedin.com/company/stv-vc",
      headquarters: "Riyadh, Saudi Arabia",
      foundedYear: 2018,
      teamSize: "20-50",
      aum: "$500M",
      checkSizeMin: 500000,
      checkSizeMax: 50000000,
      checkSizeCurrency: "USD",
      investmentStages: JSON.stringify(["seed", "series_a", "series_b", "growth"]),
      portfolioCount: 50,
      isVerified: true,
      statusId: publishedStatusId,
      publishedAt: new Date()
    },
    {
      name: "Global Ventures",
      slug: "global-ventures",
      type: "vc",
      description: "Global Ventures is a venture capital firm investing in technology startups across emerging markets, with a focus on MENA, Africa, and South Asia.",
      shortDescription: "Emerging markets focused VC firm",
      website: "https://globalventures.vc",
      linkedIn: "https://linkedin.com/company/global-ventures",
      headquarters: "Dubai, UAE",
      foundedYear: 2018,
      teamSize: "10-20",
      aum: "$100M",
      checkSizeMin: 100000,
      checkSizeMax: 5000000,
      checkSizeCurrency: "USD",
      investmentStages: JSON.stringify(["seed", "series_a"]),
      portfolioCount: 30,
      isVerified: true,
      statusId: publishedStatusId,
      publishedAt: new Date()
    },
    {
      name: "BECO Capital",
      slug: "beco-capital",
      type: "vc",
      description: "BECO Capital is a Dubai-based venture capital firm focused on early-stage technology investments in the MENA region.",
      shortDescription: "Early-stage MENA tech investor",
      website: "https://becocapital.com",
      linkedIn: "https://linkedin.com/company/beco-capital",
      headquarters: "Dubai, UAE",
      foundedYear: 2012,
      teamSize: "10-20",
      aum: "$150M",
      checkSizeMin: 500000,
      checkSizeMax: 10000000,
      checkSizeCurrency: "USD",
      investmentStages: JSON.stringify(["seed", "series_a", "series_b"]),
      portfolioCount: 40,
      isVerified: true,
      statusId: publishedStatusId,
      publishedAt: new Date()
    },
    {
      name: "Wamda Capital",
      slug: "wamda-capital",
      type: "vc",
      description: "Wamda Capital is a venture capital fund investing in high-growth technology companies across MENA, Turkey, and Pakistan.",
      shortDescription: "High-growth tech investor across MENA",
      website: "https://wamdacapital.com",
      linkedIn: "https://linkedin.com/company/wamda-capital",
      headquarters: "Dubai, UAE",
      foundedYear: 2014,
      teamSize: "10-20",
      aum: "$75M",
      checkSizeMin: 250000,
      checkSizeMax: 5000000,
      checkSizeCurrency: "USD",
      investmentStages: JSON.stringify(["seed", "series_a"]),
      portfolioCount: 25,
      isVerified: true,
      statusId: publishedStatusId,
      publishedAt: new Date()
    },
    {
      name: "500 Global MENA",
      slug: "500-global-mena",
      type: "vc",
      description: "500 Global is a venture capital firm with a global network of programs and funds. The MENA fund focuses on early-stage startups in the region.",
      shortDescription: "Global VC with dedicated MENA fund",
      website: "https://500.co",
      linkedIn: "https://linkedin.com/company/500-startups",
      headquarters: "Abu Dhabi, UAE",
      foundedYear: 2010,
      teamSize: "50-100",
      aum: "$200M",
      checkSizeMin: 50000,
      checkSizeMax: 2000000,
      checkSizeCurrency: "USD",
      investmentStages: JSON.stringify(["pre_seed", "seed"]),
      portfolioCount: 100,
      isVerified: true,
      statusId: publishedStatusId,
      publishedAt: new Date()
    },
    {
      name: "Mubadala Ventures",
      slug: "mubadala-ventures",
      type: "corporate_vc",
      description: "Mubadala Ventures is the venture capital arm of Mubadala Investment Company, one of the world's largest sovereign wealth funds.",
      shortDescription: "Sovereign wealth fund's venture arm",
      website: "https://mubadala.com",
      linkedIn: "https://linkedin.com/company/mubadala",
      headquarters: "Abu Dhabi, UAE",
      foundedYear: 2017,
      teamSize: "20-50",
      aum: "$1B+",
      checkSizeMin: 5000000,
      checkSizeMax: 100000000,
      checkSizeCurrency: "USD",
      investmentStages: JSON.stringify(["series_b", "growth"]),
      portfolioCount: 20,
      isVerified: true,
      statusId: publishedStatusId,
      publishedAt: new Date()
    },
    {
      name: "Shorooq Partners",
      slug: "shorooq-partners",
      type: "vc",
      description: "Shorooq Partners is a venture capital firm investing in early-stage technology companies in the MENA region and beyond.",
      shortDescription: "Early-stage MENA tech investor",
      website: "https://shorooq.com",
      linkedIn: "https://linkedin.com/company/shorooq-partners",
      headquarters: "Abu Dhabi, UAE",
      foundedYear: 2018,
      teamSize: "10-20",
      aum: "$100M",
      checkSizeMin: 100000,
      checkSizeMax: 5000000,
      checkSizeCurrency: "USD",
      investmentStages: JSON.stringify(["seed", "series_a"]),
      portfolioCount: 35,
      isVerified: true,
      statusId: publishedStatusId,
      publishedAt: new Date()
    },
    {
      name: "Algebra Ventures",
      slug: "algebra-ventures",
      type: "vc",
      description: "Algebra Ventures is Egypt's leading technology venture capital firm, investing in early-stage startups across MENA.",
      shortDescription: "Egypt's leading tech VC",
      website: "https://algebraventures.com",
      linkedIn: "https://linkedin.com/company/algebra-ventures",
      headquarters: "Cairo, Egypt",
      foundedYear: 2016,
      teamSize: "10-20",
      aum: "$90M",
      checkSizeMin: 100000,
      checkSizeMax: 3000000,
      checkSizeCurrency: "USD",
      investmentStages: JSON.stringify(["seed", "series_a"]),
      portfolioCount: 30,
      isVerified: true,
      statusId: publishedStatusId,
      publishedAt: new Date()
    }
  ];
  
  for (const investor of investors) {
    try {
      await connection.execute(
        `INSERT INTO investors (name, slug, type, description, shortDescription, website, linkedIn, headquarters, foundedYear, teamSize, aum, checkSizeMin, checkSizeMax, checkSizeCurrency, investmentStages, portfolioCount, isVerified, statusId, publishedAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          investor.name,
          investor.slug,
          investor.type,
          investor.description,
          investor.shortDescription,
          investor.website,
          investor.linkedIn,
          investor.headquarters,
          investor.foundedYear,
          investor.teamSize,
          investor.aum,
          investor.checkSizeMin,
          investor.checkSizeMax,
          investor.checkSizeCurrency,
          investor.investmentStages,
          investor.portfolioCount,
          investor.isVerified,
          investor.statusId,
          investor.publishedAt
        ]
      );
      console.log(`Seeded investor: ${investor.name}`);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`Investor ${investor.name} already exists, skipping...`);
      } else {
        console.error(`Error seeding ${investor.name}:`, error.message);
      }
    }
  }
  
  await connection.end();
  console.log('Investors seeding complete!');
}

seedInvestors().catch(console.error);
