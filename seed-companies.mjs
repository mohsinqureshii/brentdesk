/**
 * Seed Companies Data
 * Run with: node seed-companies.mjs
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: true }
});

// Get published status ID
const [statuses] = await connection.execute(
  "SELECT id FROM workflow_statuses WHERE slug = 'published' AND workflowType = 'editorial' LIMIT 1"
);
const publishedStatusId = statuses[0]?.id || 7;

console.log('Using published status ID:', publishedStatusId);

const companies = [
  {
    name: "Careem",
    slug: "careem",
    tagline: "The Everything App for the Middle East - ride-hailing, food delivery, payments, and more. Building the region's leading super app that serves millions of users daily across multiple countries.",
    description: "Careem is the Middle East's leading technology platform, offering services including ride-hailing, food delivery, bike rentals, and digital payments through the Careem Pay super app. Founded in Dubai in 2012, Careem was acquired by Uber in 2020 for $3.1 billion, making it one of the largest tech exits in the MENA region.",
    logo: null,
    website: "https://www.careem.com",
    linkedIn: "https://www.linkedin.com/company/careem",
    twitter: "https://twitter.com/caraboreem",
    location: "Dubai, UAE",
    industry: "Mobility",
    stage: "acquired",
    foundedYear: 2012,
    employeeCount: "3,000+",
    totalFunding: "$770M",
    isVerified: true,
    isFeatured: true,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "Tabby",
    slug: "tabby",
    tagline: "Shop now, pay later. The leading BNPL platform for the MENA region enabling flexible payments for millions of customers across thousands of merchants.",
    description: "Tabby is the leading buy now, pay later (BNPL) platform in the Middle East, allowing customers to split their purchases into interest-free installments. Founded in 2019, Tabby has raised over $950M in funding and partners with thousands of retailers across the GCC region.",
    logo: null,
    website: "https://tabby.ai",
    linkedIn: "https://www.linkedin.com/company/tabby",
    twitter: "https://twitter.com/tabby",
    location: "Riyadh, KSA",
    industry: "Fintech",
    stage: "series_d_plus",
    foundedYear: 2019,
    employeeCount: "800+",
    totalFunding: "$950M",
    isVerified: true,
    isFeatured: true,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "Kitopi",
    slug: "kitopi",
    tagline: "The world's leading cloud kitchen platform powering restaurant brands with technology-enabled ghost kitchens. Partnering with restaurants to expand their delivery capabilities.",
    description: "Kitopi is a tech-powered multi-brand cloud kitchen platform that partners with restaurants and food brands to expand their delivery reach. Founded in Dubai in 2018, Kitopi operates hundreds of kitchens across the Middle East and has raised over $800M in funding.",
    logo: null,
    website: "https://www.kitopi.com",
    linkedIn: "https://www.linkedin.com/company/kitopi",
    twitter: "https://twitter.com/kitopi",
    location: "Dubai, UAE",
    industry: "FoodTech",
    stage: "series_c",
    foundedYear: 2018,
    employeeCount: "2,500+",
    totalFunding: "$804M",
    isVerified: true,
    isFeatured: true,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "Tamara",
    slug: "tamara",
    tagline: "Leading BNPL and payment platform in Saudi Arabia with millions of users. Enabling customers to split purchases into interest-free installments at thousands of partner stores.",
    description: "Tamara is Saudi Arabia's leading buy now, pay later platform, offering customers the ability to split their purchases into three interest-free payments. Founded in 2020, Tamara has rapidly grown to become a key player in the Saudi fintech ecosystem.",
    logo: null,
    website: "https://tamara.co",
    linkedIn: "https://www.linkedin.com/company/tamara",
    twitter: "https://twitter.com/tamara",
    location: "Riyadh, KSA",
    industry: "Fintech",
    stage: "series_c",
    foundedYear: 2020,
    employeeCount: "400+",
    totalFunding: "$340M",
    isVerified: true,
    isFeatured: false,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "Salla",
    slug: "salla",
    tagline: "E-commerce platform enabling anyone to build an online store in minutes. The leading Arabic e-commerce infrastructure powering thousands of SME businesses across MENA.",
    description: "Salla is Saudi Arabia's leading e-commerce platform that enables merchants to create and manage online stores without technical expertise. Founded in 2016, Salla powers thousands of online stores across the Arab world and has raised significant funding to expand its services.",
    logo: null,
    website: "https://salla.sa",
    linkedIn: "https://www.linkedin.com/company/salla",
    twitter: "https://twitter.com/saboralla",
    location: "Riyadh, KSA",
    industry: "E-commerce",
    stage: "series_b",
    foundedYear: 2016,
    employeeCount: "500+",
    totalFunding: "$130M",
    isVerified: true,
    isFeatured: false,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "Foodics",
    slug: "foodics",
    tagline: "Cloud-based restaurant management system serving 50,000+ businesses across MENA. Complete POS and restaurant operations platform helping F&B businesses grow and scale efficiently.",
    description: "Foodics is a leading restaurant technology company providing cloud-based point-of-sale and restaurant management solutions. Founded in Saudi Arabia in 2014, Foodics serves over 50,000 restaurants and cafes across the MENA region.",
    logo: null,
    website: "https://www.foodics.com",
    linkedIn: "https://www.linkedin.com/company/foodics",
    twitter: "https://twitter.com/foodics",
    location: "Riyadh, KSA",
    industry: "SaaS",
    stage: "series_c",
    foundedYear: 2014,
    employeeCount: "600+",
    totalFunding: "$195M",
    isVerified: true,
    isFeatured: false,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "Anghami",
    slug: "anghami",
    tagline: "Leading music streaming platform in MENA with 70M+ registered users. The region's homegrown answer to Spotify, offering Arabic and international music.",
    description: "Anghami is the leading music streaming platform in the Middle East and North Africa, offering a vast library of Arabic and international music. Founded in Lebanon in 2012, Anghami went public on NASDAQ in 2022 through a SPAC merger.",
    logo: null,
    website: "https://www.anghami.com",
    linkedIn: "https://www.linkedin.com/company/anghami",
    twitter: "https://twitter.com/anghami",
    location: "Abu Dhabi, UAE",
    industry: "Entertainment",
    stage: "public",
    foundedYear: 2012,
    employeeCount: "200+",
    totalFunding: "$136M",
    isVerified: true,
    isFeatured: true,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "TruKKer",
    slug: "trukker",
    tagline: "Digital freight platform connecting shippers with truckers across the Middle East. Revolutionizing logistics with technology to make freight more efficient and transparent.",
    description: "TruKKer is a digital freight platform that connects shippers with truckers across the Middle East. Founded in Dubai in 2016, TruKKer uses technology to optimize freight logistics and has expanded across the GCC region.",
    logo: null,
    website: "https://www.trukker.com",
    linkedIn: "https://www.linkedin.com/company/trukker",
    twitter: "https://twitter.com/trukker",
    location: "Dubai, UAE",
    industry: "Logistics",
    stage: "series_b",
    foundedYear: 2016,
    employeeCount: "300+",
    totalFunding: "$100M",
    isVerified: true,
    isFeatured: false,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "Swvl",
    slug: "swvl",
    tagline: "Mass transit solutions transforming shared mobility across emerging markets. Providing affordable, reliable transportation alternatives in cities with limited public transit.",
    description: "Swvl is a mass transit technology company offering shared mobility solutions in emerging markets. Founded in Egypt in 2017, Swvl went public on NASDAQ in 2022 and operates across the Middle East, Africa, and Asia.",
    logo: null,
    website: "https://www.swvl.com",
    linkedIn: "https://www.linkedin.com/company/swvl",
    twitter: "https://twitter.com/swaborvl",
    location: "Dubai, UAE",
    industry: "Mobility",
    stage: "public",
    foundedYear: 2017,
    employeeCount: "200+",
    totalFunding: "$100M",
    isVerified: true,
    isFeatured: false,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "Fawry",
    slug: "fawry",
    tagline: "Egypt's leading electronic payments network serving millions of transactions daily. The backbone of digital payments in Egypt, connecting banks, businesses, and consumers.",
    description: "Fawry is Egypt's leading electronic payment network, providing payment services through a vast network of retail points and digital channels. Founded in 2008, Fawry went public on the Egyptian Stock Exchange in 2019.",
    logo: null,
    website: "https://www.fawry.com",
    linkedIn: "https://www.linkedin.com/company/fawry",
    twitter: "https://twitter.com/fawry",
    location: "Cairo, Egypt",
    industry: "Fintech",
    stage: "public",
    foundedYear: 2008,
    employeeCount: "1,500+",
    totalFunding: "Public",
    isVerified: true,
    isFeatured: true,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "Paymob",
    slug: "paymob",
    tagline: "Payment infrastructure powering digital payments across MENA and Pakistan. Enabling businesses of all sizes to accept digital payments seamlessly.",
    description: "Paymob is a leading payment infrastructure company in the MENA region, providing payment acceptance solutions for businesses of all sizes. Founded in Egypt in 2015, Paymob has expanded across the region and into Pakistan.",
    logo: null,
    website: "https://paymob.com",
    linkedIn: "https://www.linkedin.com/company/paymob",
    twitter: "https://twitter.com/paymob",
    location: "Cairo, Egypt",
    industry: "Fintech",
    stage: "series_b",
    foundedYear: 2015,
    employeeCount: "400+",
    totalFunding: "$68.5M",
    isVerified: true,
    isFeatured: false,
    statusId: publishedStatusId,
    publishedAt: new Date()
  },
  {
    name: "Vezeeta",
    slug: "vezeeta",
    tagline: "Healthcare booking platform connecting patients with doctors across MENA. Making healthcare accessible with easy doctor discovery, booking, and teleconsultations.",
    description: "Vezeeta is a leading healthcare technology platform in the MENA region, enabling patients to discover and book appointments with doctors. Founded in Egypt in 2012, Vezeeta has expanded across multiple countries in the region.",
    logo: null,
    website: "https://www.vezeeta.com",
    linkedIn: "https://www.linkedin.com/company/vezeeta",
    twitter: "https://twitter.com/vezeeta",
    location: "Cairo, Egypt",
    industry: "Healthcare",
    stage: "series_d_plus",
    foundedYear: 2012,
    employeeCount: "350+",
    totalFunding: "$80M",
    isVerified: true,
    isFeatured: false,
    statusId: publishedStatusId,
    publishedAt: new Date()
  }
];

console.log('Seeding companies...');

for (const company of companies) {
  try {
    // Check if company already exists
    const [existing] = await connection.execute(
      'SELECT id FROM companies WHERE slug = ?',
      [company.slug]
    );

    if (existing.length > 0) {
      console.log(`Company ${company.name} already exists, skipping...`);
      continue;
    }

    await connection.execute(
      `INSERT INTO companies (name, slug, tagline, description, logo, website, linkedIn, twitter, location, industry, stage, foundedYear, employeeCount, totalFunding, isVerified, isFeatured, statusId, publishedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        company.name,
        company.slug,
        company.tagline,
        company.description,
        company.logo,
        company.website,
        company.linkedIn,
        company.twitter,
        company.location,
        company.industry,
        company.stage,
        company.foundedYear,
        company.employeeCount,
        company.totalFunding,
        company.isVerified ? 1 : 0,
        company.isFeatured ? 1 : 0,
        company.statusId,
        company.publishedAt
      ]
    );
    console.log(`Created company: ${company.name}`);
  } catch (error) {
    console.error(`Error creating company ${company.name}:`, error.message);
  }
}

console.log('Done seeding companies!');
await connection.end();
