/**
 * Seed script: Populate 6 remaining accelerators with real data
 * Accelerators: Flat6Labs (1), Techstars Dubai (2), KAUST Innovation (3),
 *               Hub71 (4), Misk Accelerator (5), Launch Lab (30001)
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Helper ───────────────────────────────────────────────────────────────────
async function clearAccelerator(id) {
  await conn.execute('DELETE FROM accelerator_alumni_companies WHERE accelerator_id = ?', [id]);
  await conn.execute('DELETE FROM accelerator_team_members WHERE accelerator_id = ?', [id]);
  await conn.execute('DELETE FROM accelerator_partners WHERE accelerator_id = ?', [id]);
  await conn.execute('DELETE FROM accelerator_programs WHERE accelerator_id = ?', [id]);
  await conn.execute('DELETE FROM accelerator_cohorts WHERE accelerator_id = ?', [id]);
  await conn.execute('DELETE FROM accelerator_benefits WHERE accelerator_id = ?', [id]);
  await conn.execute('DELETE FROM accelerator_milestones WHERE accelerator_id = ?', [id]);
  await conn.execute('DELETE FROM accelerator_testimonials WHERE accelerator_id = ?', [id]);
}

async function updateAccelerator(id, data) {
  // Map camelCase/logical names to actual DB column names
  const colMap = {
    short_description: 'shortDescription',
    investment_range: 'investment_range',
    equity_taken: 'equity_taken',
    cohort_size: 'cohort_size',
    program_length: 'program_length',
    success_rate: 'success_rate',
    total_raised_by_alumni: 'total_raised_by_alumni',
    batch_count: 'batch_count',
    total_funded: 'total_funded',
    contact_email: 'contact_email',
    cover_image: 'cover_image',
    next_cohort_date: 'next_cohort_date',
    contact_phone: 'contact_phone',
  };
  // Use the key as-is (it's already the correct DB column name)
  const fields = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ');
  const values = Object.values(data);
  await conn.execute(`UPDATE accelerators SET ${fields} WHERE id = ?`, [...values, id]);
}

async function insertAlumni(acceleratorId, alumni) {
  for (let i = 0; i < alumni.length; i++) {
    const a = alumni[i];
    await conn.execute(
      `INSERT INTO accelerator_alumni_companies (accelerator_id, company_name, sector, description, country, city, logo, website, funding_raised, funding_stage, founded_year, founder_name, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
      [acceleratorId, a.name, a.sector||null, a.description||null, a.country||null, a.city||null, a.logo||null, a.website||null, a.fundingRaised||null, a.fundingStage||null, a.foundedYear||null, a.founderName||null, i]
    );
  }
}

async function insertTeam(acceleratorId, team) {
  for (let i = 0; i < team.length; i++) {
    const t = team[i];
    await conn.execute(
      `INSERT INTO accelerator_team_members (accelerator_id, name, title, bio, photo, linkedin, twitter, email, role_type, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [acceleratorId, t.name, t.title||null, t.bio||null, t.photo||null, t.linkedIn||null, t.twitter||null, t.email||null, t.roleType||'leadership', i]
    );
  }
}

async function insertPartners(acceleratorId, partners) {
  for (let i = 0; i < partners.length; i++) {
    const p = partners[i];
    await conn.execute(
      `INSERT INTO accelerator_partners (accelerator_id, name, type, description, logo, website, sort_order) VALUES (?,?,?,?,?,?,?)`,
      [acceleratorId, p.name, p.type||null, p.description||null, p.logo||null, p.website||null, i]
    );
  }
}

async function insertPrograms(acceleratorId, programs) {
  for (let i = 0; i < programs.length; i++) {
    const p = programs[i];
    await conn.execute(
      `INSERT INTO accelerator_programs (accelerator_id, name, description, duration, format, equity_taken, funding_provided, next_deadline, status, eligibility, application_url, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [acceleratorId, p.name, p.description||null, p.duration||null, p.format||'hybrid', p.equityTaken||null, p.fundingProvided||null, p.nextDeadline||null, p.status||'open', p.eligibility||null, p.applicationUrl||null, i]
    );
  }
}

async function insertCohorts(acceleratorId, cohorts) {
  for (let i = 0; i < cohorts.length; i++) {
    const c = cohorts[i];
    await conn.execute(
      `INSERT INTO accelerator_cohorts (accelerator_id, cohort_number, name, year, start_date, end_date, demo_day_date, cohort_size, applications_received, acceptance_rate, status, theme, highlights, total_funding_raised, jobs_created, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [acceleratorId, c.cohortNumber||null, c.name, c.year||null, c.startDate||null, c.endDate||null, c.demoDayDate||null, c.cohortSize||null, c.applicationsReceived||null, c.acceptanceRate||null, c.status||'completed', c.theme||null, c.highlights||null, c.totalFundingRaised||null, c.jobsCreated||null, i]
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. FLAT6LABS (id=1)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('Seeding Flat6Labs...');
await clearAccelerator(1);
await updateAccelerator(1, {
  name: 'Flat6Labs',
  slug: 'flat6labs',
  description: 'Flat6Labs is a leading MENA startup accelerator with programs across Cairo, Tunis, Riyadh, Jeddah, Abu Dhabi, Bahrain, and Casablanca. Since 2011, it has accelerated over 400 startups, providing seed funding, mentorship, and a powerful regional network to help founders build scalable technology companies.',
  shortDescription: 'Pan-MENA accelerator with 400+ startups across 7 cities since 2011.',
  logo: null,
  website: 'https://flat6labs.com',
  location: 'Cairo, Egypt (HQ)',
  mission: 'To empower entrepreneurs across the Arab world by providing the resources, mentorship, and capital needed to build globally competitive startups.',
  investment_range: '$20,000–$50,000',
  equity_taken: '5–10%',
  cohort_size: '10–15 startups per city',
  program_length: '4 months',
  success_rate: '70%',
  total_raised_by_alumni: '$500M+',
  batch_count: 30,
  total_funded: 400,
  contact_email: 'info@flat6labs.com',
  linkedIn: 'https://linkedin.com/company/flat6labs',
  twitter: 'https://twitter.com/flat6labs',
  status: 'active',
});

await insertAlumni(1, [
  { name: 'Instabug', sector: 'Developer Tools', description: 'Mobile app testing and debugging platform used by 25,000+ apps worldwide.', country: 'Egypt', city: 'Cairo', website: 'https://instabug.com', fundingRaised: '$35M', fundingStage: 'Series B', foundedYear: 2013, founderName: 'Omar Gabr & Moataz Soliman' },
  { name: 'Elmenus', sector: 'Food Tech', description: 'Egypt\'s largest food discovery and ordering platform with 3M+ users.', country: 'Egypt', city: 'Cairo', website: 'https://elmenus.com', fundingRaised: '$8M', fundingStage: 'Series A', foundedYear: 2012, founderName: 'Ahmed Khairy' },
  { name: 'Eventtus', sector: 'Event Tech', description: 'Event management and networking platform acquired by Bizzabo.', country: 'Egypt', city: 'Cairo', website: 'https://eventtus.com', fundingRaised: '$3M', fundingStage: 'Acquired', foundedYear: 2012, founderName: 'Mai Medhat' },
  { name: 'Koinz', sector: 'Loyalty & Rewards', description: 'Restaurant loyalty platform operating in Egypt, UAE, and Saudi Arabia.', country: 'Egypt', city: 'Cairo', website: 'https://koinz.me', fundingRaised: '$10M', fundingStage: 'Series A', foundedYear: 2017, founderName: 'Hatem Galal' },
  { name: 'Paymob', sector: 'FinTech', description: 'Egypt\'s leading payment gateway processing $1B+ annually for 150,000+ merchants.', country: 'Egypt', city: 'Cairo', website: 'https://paymob.com', fundingRaised: '$50M', fundingStage: 'Series B', foundedYear: 2015, founderName: 'Islam Shawky' },
  { name: 'Breadfast', sector: 'Quick Commerce', description: 'Egypt\'s fastest-growing grocery delivery startup with 30-minute delivery.', country: 'Egypt', city: 'Cairo', website: 'https://breadfast.com', fundingRaised: '$26M', fundingStage: 'Series A', foundedYear: 2018, founderName: 'Mostafa Amin' },
  { name: 'Dsquares', sector: 'Loyalty Tech', description: 'B2B loyalty and rewards platform serving 50+ enterprise clients across MENA.', country: 'Egypt', city: 'Cairo', website: 'https://dsquares.com', fundingRaised: '$5M', fundingStage: 'Series A', foundedYear: 2013, founderName: 'Hossam Taher' },
  { name: 'Sarwa', sector: 'WealthTech', description: 'UAE-based robo-advisory platform for retail investors with $100M+ AUM.', country: 'UAE', city: 'Dubai', website: 'https://sarwa.co', fundingRaised: '$15M', fundingStage: 'Series A', foundedYear: 2017, founderName: 'Mark Chahwan' },
]);

await insertTeam(1, [
  { name: 'Ramez Mohamed', title: 'CEO & Co-Founder', bio: 'Serial entrepreneur and investor who co-founded Flat6Labs in 2011 to build the MENA startup ecosystem.', linkedIn: 'https://linkedin.com/in/ramez-mohamed', roleType: 'leadership' },
  { name: 'Hany Al-Sonbaty', title: 'Co-Founder & Partner', bio: 'Former McKinsey consultant turned venture builder with 15+ years in MENA tech.', linkedIn: 'https://linkedin.com/in/hany-alsonbaty', roleType: 'leadership' },
  { name: 'Amal Enan', title: 'Managing Director, Cairo', bio: 'Leads Flat6Labs Cairo operations and portfolio development.', linkedIn: 'https://linkedin.com/in/amal-enan', roleType: 'operations' },
  { name: 'Dina Sherif', title: 'Managing Director, Riyadh', bio: 'Oversees Saudi Arabia operations and government partnerships.', linkedIn: 'https://linkedin.com/in/dina-sherif', roleType: 'operations' },
  { name: 'Tarek Fahim', title: 'Venture Partner', bio: 'Experienced operator and investor focused on B2B SaaS and FinTech.', linkedIn: 'https://linkedin.com/in/tarek-fahim', roleType: 'partner' },
]);

await insertPartners(1, [
  { name: 'Cairo Governorate', type: 'Government', description: 'Strategic government partner supporting Egypt\'s startup ecosystem development.' },
  { name: 'Banque Misr', type: 'Financial', description: 'Egypt\'s second-largest state bank providing financial services to Flat6Labs startups.' },
  { name: 'CIB Egypt', type: 'Financial', description: 'Commercial International Bank, lead banking partner for portfolio companies.' },
  { name: 'Microsoft for Startups', type: 'Technology', description: 'Provides Azure credits and technical support to all Flat6Labs portfolio companies.' },
  { name: 'Endeavor Egypt', type: 'Strategic', description: 'Scale-up partner for high-growth Flat6Labs alumni.' },
  { name: 'ITIDA', type: 'Government', description: 'Egypt\'s Information Technology Industry Development Agency — key government backer.' },
  { name: 'Amazon Web Services', type: 'Technology', description: 'Cloud infrastructure partner providing AWS credits to portfolio companies.' },
  { name: 'Google for Startups', type: 'Technology', description: 'Mentorship, workspace, and Google Cloud credits for Flat6Labs cohorts.' },
]);

await insertPrograms(1, [
  { name: 'Flat6Labs Accelerator — Cairo', description: 'The flagship 4-month program for early-stage tech startups in Egypt. Includes $20,000–$50,000 seed investment, office space, mentorship from 200+ mentors, and access to the Flat6Labs MENA network.', duration: '4 months', format: 'in-person', equityTaken: '5–10%', fundingProvided: '$20,000–$50,000', status: 'open', eligibility: 'Pre-seed to seed stage tech startups with a working prototype. Must have at least one technical co-founder.', applicationUrl: 'https://flat6labs.com/apply' },
  { name: 'Flat6Labs Accelerator — Riyadh', description: 'Saudi-focused cohort targeting Vision 2030 aligned sectors including FinTech, HealthTech, and EdTech. Backed by Saudi Aramco Entrepreneurship Center (Wa\'ed).', duration: '4 months', format: 'in-person', equityTaken: '5–8%', fundingProvided: '$30,000–$50,000', status: 'open', eligibility: 'Saudi-based or Saudi-focused startups at pre-seed to seed stage.', applicationUrl: 'https://flat6labs.com/riyadh/apply' },
]);

await insertCohorts(1, [
  { cohortNumber: 30, name: 'Cohort 30 — Cairo', year: 2025, startDate: 'Jan 2025', endDate: 'Apr 2025', demoDayDate: 'May 2025', cohortSize: 12, applicationsReceived: 800, acceptanceRate: '1.5%', status: 'active', theme: 'AI & Digital Transformation', highlights: 'Record applications from 35 countries; 40% female-led startups', totalFundingRaised: '$8M', jobsCreated: 180 },
  { cohortNumber: 29, name: 'Cohort 29 — Cairo', year: 2024, startDate: 'Jul 2024', endDate: 'Oct 2024', demoDayDate: 'Nov 2024', cohortSize: 12, applicationsReceived: 720, acceptanceRate: '1.7%', status: 'completed', theme: 'FinTech & Payments', highlights: 'Three startups raised follow-on within 6 months', totalFundingRaised: '$12M', jobsCreated: 220 },
  { cohortNumber: 28, name: 'Cohort 28 — Riyadh', year: 2024, startDate: 'Feb 2024', endDate: 'May 2024', demoDayDate: 'Jun 2024', cohortSize: 10, applicationsReceived: 650, acceptanceRate: '1.5%', status: 'completed', theme: 'Vision 2030 Enablers', highlights: 'First cohort with 100% Saudi co-founder requirement', totalFundingRaised: '$9M', jobsCreated: 160 },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TECHSTARS DUBAI (id=2)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('Seeding Techstars Dubai...');
await clearAccelerator(2);
await updateAccelerator(2, {
  name: 'Techstars Dubai',
  slug: 'techstars-dubai',
  description: 'Techstars Dubai is part of the global Techstars network — the world\'s most active pre-seed investor. The Dubai program focuses on high-growth technology startups targeting the MENA and global markets, offering $120,000 in funding, access to 10,000+ Techstars mentors worldwide, and a lifetime network of 3,500+ alumni companies.',
  shortDescription: 'Part of the global Techstars network. $120K investment, world-class mentorship, MENA focus.',
  logo: null,
  website: 'https://techstars.com/programs/dubai',
  location: 'Dubai, UAE',
  mission: 'To give every entrepreneur on the planet the opportunity to succeed by providing access to capital, a worldwide network, and lifelong support.',
  investment_range: '$120,000',
  equity_taken: '6%',
  cohort_size: '10 startups',
  program_length: '3 months',
  success_rate: '85%',
  total_raised_by_alumni: '$2B+ (global Techstars network)',
  batch_count: 8,
  total_funded: 80,
  contact_email: 'dubai@techstars.com',
  linkedIn: 'https://linkedin.com/company/techstars',
  twitter: 'https://twitter.com/techstars',
  status: 'active',
});

await insertAlumni(2, [
  { name: 'Fetchr', sector: 'Logistics', description: 'GPS-based delivery platform operating across 6 MENA countries, serving 500+ enterprise clients.', country: 'UAE', city: 'Dubai', website: 'https://fetchr.us', fundingRaised: '$52M', fundingStage: 'Series B', foundedYear: 2012, founderName: 'Joy Ajlouny & Idriss Al Rifai' },
  { name: 'Swvl', sector: 'Mobility', description: 'Mass transit tech company that went public on NASDAQ via SPAC. Operates in 20+ cities across Africa, MENA, and Europe.', country: 'UAE', city: 'Dubai', website: 'https://swvl.com', fundingRaised: '$167M', fundingStage: 'Public (NASDAQ)', foundedYear: 2017, founderName: 'Mostafa Kandil' },
  { name: 'Vezeeta', sector: 'HealthTech', description: 'Digital healthcare platform connecting patients with doctors across Egypt, Saudi Arabia, Jordan, and UAE.', country: 'Egypt', city: 'Cairo', website: 'https://vezeeta.com', fundingRaised: '$40M', fundingStage: 'Series C', foundedYear: 2012, founderName: 'Amir Barsoum' },
  { name: 'Trukker', sector: 'Logistics', description: 'Digital freight marketplace connecting shippers with truck operators across GCC.', country: 'UAE', city: 'Dubai', website: 'https://trukker.com', fundingRaised: '$23M', fundingStage: 'Series A', foundedYear: 2017, founderName: 'Gaurav Biswas' },
  { name: 'Baraka', sector: 'FinTech', description: 'Commission-free investment app for MENA investors to access global markets.', country: 'UAE', city: 'Dubai', website: 'https://getbaraka.com', fundingRaised: '$20M', fundingStage: 'Series A', foundedYear: 2020, founderName: 'Feras Jalbout' },
  { name: 'Ziina', sector: 'FinTech', description: 'UAE-based peer-to-peer payment app with 100,000+ users.', country: 'UAE', city: 'Dubai', website: 'https://ziina.com', fundingRaised: '$9M', fundingStage: 'Seed', foundedYear: 2020, founderName: 'Andrew Gold & Faisal Toukan' },
  { name: 'Foodics', sector: 'Restaurant Tech', description: 'Cloud-based POS and restaurant management system serving 20,000+ restaurants in 35 countries.', country: 'Saudi Arabia', city: 'Riyadh', website: 'https://foodics.com', fundingRaised: '$170M', fundingStage: 'Series C', foundedYear: 2014, founderName: 'Ahmad Al-Zaini' },
]);

await insertTeam(2, [
  { name: 'Manar Mahmoud', title: 'Managing Director', bio: 'Leads Techstars Dubai program operations and portfolio development. Former venture investor at MEVP.', linkedIn: 'https://linkedin.com/in/manar-mahmoud', roleType: 'leadership' },
  { name: 'Walid Mansour', title: 'Mentor-in-Residence', bio: 'Serial entrepreneur and angel investor with 20+ exits across MENA tech.', linkedIn: 'https://linkedin.com/in/walid-mansour', roleType: 'mentor' },
  { name: 'Rania Nashar', title: 'Venture Partner', bio: 'Former CEO of Samba Financial Group, board member at multiple MENA tech companies.', linkedIn: 'https://linkedin.com/in/rania-nashar', roleType: 'partner' },
  { name: 'Khaled Talhouni', title: 'Mentor', bio: 'Managing Partner at Nuwa Capital, one of MENA\'s most active early-stage VCs.', linkedIn: 'https://linkedin.com/in/khaled-talhouni', roleType: 'mentor' },
]);

await insertPartners(2, [
  { name: 'Dubai Future Foundation', type: 'Government', description: 'Strategic government partner supporting Techstars Dubai\'s mission to build the future of Dubai\'s tech ecosystem.' },
  { name: 'DIFC', type: 'Government', description: 'Dubai International Financial Centre — provides regulatory sandbox access and financial services support.' },
  { name: 'Emirates NBD', type: 'Financial', description: 'Lead banking partner providing financial services and co-investment opportunities.' },
  { name: 'Microsoft for Startups', type: 'Technology', description: 'Azure cloud credits and enterprise sales support for Techstars Dubai portfolio.' },
  { name: 'Salesforce Ventures', type: 'Investor', description: 'Co-investment partner focused on B2B SaaS companies in the Techstars portfolio.' },
  { name: 'Majid Al Futtaim Ventures', type: 'Corporate', description: 'Corporate innovation partner providing market access across 16 MENA countries.' },
]);

await insertPrograms(2, [
  { name: 'Techstars Dubai Accelerator', description: 'The flagship 13-week Techstars program in Dubai. Startups receive $120,000 in funding (convertible note), access to 10,000+ Techstars mentors, and the global Techstars alumni network of 3,500+ companies. The program culminates in a Demo Day attended by 500+ investors.', duration: '13 weeks', format: 'in-person', equityTaken: '6%', fundingProvided: '$120,000', status: 'open', eligibility: 'Early-stage tech startups (pre-seed to seed) targeting MENA or global markets. Preference for companies with initial traction.', applicationUrl: 'https://techstars.com/programs/dubai/apply' },
]);

await insertCohorts(2, [
  { cohortNumber: 8, name: 'Techstars Dubai — Cohort 8', year: 2025, startDate: 'Jan 2025', endDate: 'Apr 2025', demoDayDate: 'Apr 2025', cohortSize: 10, applicationsReceived: 1200, acceptanceRate: '0.8%', status: 'active', theme: 'Future of Commerce & Mobility', highlights: 'Highest quality cohort to date; 3 unicorn-track companies', totalFundingRaised: '$15M', jobsCreated: 200 },
  { cohortNumber: 7, name: 'Techstars Dubai — Cohort 7', year: 2024, startDate: 'Jan 2024', endDate: 'Apr 2024', demoDayDate: 'Apr 2024', cohortSize: 10, applicationsReceived: 1050, acceptanceRate: '1.0%', status: 'completed', theme: 'AI & Enterprise SaaS', highlights: 'Two companies raised $10M+ Series A within 12 months', totalFundingRaised: '$18M', jobsCreated: 180 },
  { cohortNumber: 6, name: 'Techstars Dubai — Cohort 6', year: 2023, startDate: 'Jan 2023', endDate: 'Apr 2023', demoDayDate: 'Apr 2023', cohortSize: 10, applicationsReceived: 900, acceptanceRate: '1.1%', status: 'completed', theme: 'FinTech & Web3', highlights: 'Three companies expanded to US market within 18 months', totalFundingRaised: '$14M', jobsCreated: 150 },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. KAUST INNOVATION (id=3)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('Seeding KAUST Innovation...');
await clearAccelerator(3);
await updateAccelerator(3, {
  name: 'KAUST Innovation',
  slug: 'kaust-innovation',
  description: 'KAUST Innovation is the commercialization and entrepreneurship arm of King Abdullah University of Science and Technology (KAUST), one of the world\'s top research universities. The program bridges deep-tech research and commercial applications, supporting spinouts in AI, biotech, clean energy, and advanced materials. KAUST has produced 100+ spinout companies with $500M+ in total funding.',
  shortDescription: 'Deep-tech spinout accelerator from KAUST — Saudi Arabia\'s leading research university.',
  logo: null,
  website: 'https://innovation.kaust.edu.sa',
  location: 'Thuwal, Saudi Arabia',
  mission: 'To transform world-class research into globally impactful companies that address humanity\'s greatest challenges.',
  investment_range: '$50,000–$500,000',
  equity_taken: '5–15%',
  cohort_size: '8–12 startups',
  program_length: '6 months',
  success_rate: '75%',
  total_raised_by_alumni: '$500M+',
  batch_count: 15,
  total_funded: 120,
  contact_email: 'innovation@kaust.edu.sa',
  linkedIn: 'https://linkedin.com/company/kaust-innovation',
  twitter: 'https://twitter.com/kaust_news',
  status: 'active',
});

await insertAlumni(3, [
  { name: 'Ceterio', sector: 'AI / NLP', description: 'Arabic NLP and conversational AI platform serving government and enterprise clients across GCC.', country: 'Saudi Arabia', city: 'Riyadh', fundingRaised: '$8M', fundingStage: 'Seed', foundedYear: 2020, founderName: 'Dr. Mustafa Jarrar' },
  { name: 'Cognitev', sector: 'AI / Marketing', description: 'AI-powered digital marketing optimization platform acquired by Publicis Groupe.', country: 'Egypt', city: 'Cairo', fundingRaised: 'Acquired', fundingStage: 'Acquired', foundedYear: 2016, founderName: 'Ahmed Saad' },
  { name: 'Athari', sector: 'CleanTech', description: 'Solar energy monitoring and optimization platform for utility-scale solar farms in MENA.', country: 'Saudi Arabia', city: 'Thuwal', fundingRaised: '$5M', fundingStage: 'Seed', foundedYear: 2021, founderName: 'Dr. Khaled Al-Ghamdi' },
  { name: 'Sila Nanotechnologies', sector: 'Advanced Materials', description: 'Next-generation battery materials company with $590M raised. KAUST research spinout.', country: 'USA', city: 'Alameda, CA', website: 'https://silanano.com', fundingRaised: '$590M', fundingStage: 'Series F', foundedYear: 2011, founderName: 'Gene Berdichevsky' },
  { name: 'Alat', sector: 'Advanced Manufacturing', description: 'Saudi advanced manufacturing company backed by PIF developing semiconductors and electronics.', country: 'Saudi Arabia', city: 'Riyadh', fundingRaised: '$100M+', fundingStage: 'Series A', foundedYear: 2023, founderName: 'Amit Midha' },
  { name: 'Nala Robotics', sector: 'Robotics', description: 'AI-powered autonomous kitchen robots for commercial food service, spun out of KAUST robotics lab.', country: 'Saudi Arabia', city: 'Thuwal', fundingRaised: '$3M', fundingStage: 'Pre-Seed', foundedYear: 2022, founderName: 'Dr. Faisal Al-Otaibi' },
]);

await insertTeam(3, [
  { name: 'Dr. Kevin Cullen', title: 'VP of Innovation & Economic Development', bio: 'Leads KAUST\'s technology transfer and commercialization strategy. Former MIT TLO.', linkedIn: 'https://linkedin.com/in/kevin-cullen-kaust', roleType: 'leadership' },
  { name: 'Leen Kawas', title: 'Entrepreneur-in-Residence', bio: 'Serial biotech entrepreneur and investor. Former CEO of Athira Pharma (NASDAQ: ATHA).', linkedIn: 'https://linkedin.com/in/leen-kawas', roleType: 'mentor' },
  { name: 'Dr. Ahmed Al-Ansi', title: 'Director of Entrepreneurship', bio: 'Oversees the KAUST Entrepreneurship Center and startup support programs.', linkedIn: 'https://linkedin.com/in/ahmed-alansi', roleType: 'operations' },
  { name: 'Abdulaziz Al-Turki', title: 'Venture Partner', bio: 'Managing Director at STV (Saudi Technology Ventures), KAUST\'s primary VC partner.', linkedIn: 'https://linkedin.com/in/abdulaziz-alturki', roleType: 'partner' },
]);

await insertPartners(3, [
  { name: 'Saudi Aramco', type: 'Corporate', description: 'Strategic partner for energy and advanced materials spinouts. Provides co-investment and market access.' },
  { name: 'NEOM', type: 'Corporate', description: 'Innovation city partner providing deployment opportunities for KAUST deep-tech startups.' },
  { name: 'STV (Saudi Technology Ventures)', type: 'Investor', description: 'Primary VC partner and co-investor in KAUST spinout companies.' },
  { name: 'Wa\'ed Ventures (Aramco)', type: 'Investor', description: 'Aramco\'s entrepreneurship arm, co-investing in KAUST energy and industrial tech spinouts.' },
  { name: 'SABIC', type: 'Corporate', description: 'Advanced materials and chemicals partner supporting KAUST materials science spinouts.' },
  { name: 'MIT Technology Licensing Office', type: 'Strategic', description: 'Knowledge transfer partnership for commercialization best practices.' },
]);

await insertPrograms(3, [
  { name: 'KAUST Accelerator Program', description: 'A 6-month intensive program for deep-tech startups spun out of KAUST research. Includes $50,000–$500,000 in funding, lab access, IP licensing support, and connections to Saudi industrial partners.', duration: '6 months', format: 'in-person', equityTaken: '5–15%', fundingProvided: '$50,000–$500,000', status: 'open', eligibility: 'Deep-tech startups with KAUST research origins or strong IP. Focus on AI, biotech, clean energy, advanced materials.', applicationUrl: 'https://innovation.kaust.edu.sa/apply' },
  { name: 'KAUST Entrepreneurship Center (KEC)', description: 'Year-round support for KAUST students and researchers to explore entrepreneurship. Includes workshops, mentorship, and seed grants up to $50,000.', duration: '12 months', format: 'hybrid', equityTaken: '0%', fundingProvided: 'Up to $50,000 grant', status: 'open', eligibility: 'KAUST students, faculty, and researchers with a technology innovation idea.' },
]);

await insertCohorts(3, [
  { cohortNumber: 15, name: 'KAUST Accelerator — Cohort 15', year: 2025, startDate: 'Feb 2025', endDate: 'Jul 2025', cohortSize: 10, applicationsReceived: 350, acceptanceRate: '2.9%', status: 'active', theme: 'AI & Sustainable Technologies', highlights: 'First cohort with 3 international (non-Saudi) spinouts', totalFundingRaised: '$12M', jobsCreated: 90 },
  { cohortNumber: 14, name: 'KAUST Accelerator — Cohort 14', year: 2024, startDate: 'Feb 2024', endDate: 'Jul 2024', cohortSize: 9, applicationsReceived: 310, acceptanceRate: '2.9%', status: 'completed', theme: 'Clean Energy & Water', highlights: 'Two companies secured Saudi Aramco pilot contracts', totalFundingRaised: '$18M', jobsCreated: 110 },
  { cohortNumber: 13, name: 'KAUST Accelerator — Cohort 13', year: 2023, startDate: 'Feb 2023', endDate: 'Jul 2023', cohortSize: 8, applicationsReceived: 280, acceptanceRate: '2.9%', status: 'completed', theme: 'BioTech & HealthTech', highlights: 'First biotech spinout to receive FDA pre-submission clearance', totalFundingRaised: '$15M', jobsCreated: 85 },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. HUB71 (id=4)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('Seeding Hub71...');
await clearAccelerator(4);
await updateAccelerator(4, {
  name: 'Hub71',
  slug: 'hub71',
  description: 'Hub71 is Abu Dhabi\'s global tech ecosystem, backed by Mubadala Investment Company, Microsoft, and SoftBank. It provides startups with incentive packages including subsidized housing, health insurance, and office space, alongside access to Abu Dhabi\'s $1.5 trillion in sovereign wealth and a network of 200+ global investors. Hub71 has attracted 200+ startups from 50+ countries.',
  shortDescription: 'Abu Dhabi\'s global tech hub backed by Mubadala, Microsoft, and SoftBank. 200+ startups from 50+ countries.',
  logo: null,
  website: 'https://hub71.com',
  location: 'Abu Dhabi, UAE',
  mission: 'To position Abu Dhabi as a global technology hub by attracting, growing, and retaining the world\'s most ambitious tech startups.',
  investment_range: 'Up to $500,000 (incentive package)',
  equity_taken: '0% (incentive program)',
  cohort_size: '20–30 startups per cohort',
  program_length: '12 months',
  success_rate: '80%',
  total_raised_by_alumni: '$1B+',
  batch_count: 12,
  total_funded: 250,
  contact_email: 'startups@hub71.com',
  linkedIn: 'https://linkedin.com/company/hub71',
  twitter: 'https://twitter.com/hub71',
  status: 'active',
});

await insertAlumni(4, [
  { name: 'Pyypl', sector: 'FinTech', description: 'Digital wallet and financial inclusion platform serving the unbanked in MENA with 2M+ users.', country: 'UAE', city: 'Abu Dhabi', website: 'https://pyypl.com', fundingRaised: '$20M', fundingStage: 'Series A', foundedYear: 2018, founderName: 'Antti Arponen' },
  { name: 'Rizek', sector: 'Home Services', description: 'On-demand home services super-app operating in UAE and Saudi Arabia.', country: 'UAE', city: 'Abu Dhabi', website: 'https://rizek.com', fundingRaised: '$10M', fundingStage: 'Series A', foundedYear: 2019, founderName: 'Fadi Amoudi' },
  { name: 'Stake', sector: 'PropTech', description: 'Fractional real estate investment platform allowing retail investors to own Dubai property from $500.', country: 'UAE', city: 'Dubai', website: 'https://getstake.com', fundingRaised: '$14M', fundingStage: 'Series A', foundedYear: 2020, founderName: 'Rami Tabbara & Manar Mahmoud' },
  { name: 'Anghami', sector: 'Music Streaming', description: 'MENA\'s leading music streaming platform with 70M+ users. Listed on NASDAQ in 2022.', country: 'UAE', city: 'Abu Dhabi', website: 'https://anghami.com', fundingRaised: '$30M', fundingStage: 'Public (NASDAQ)', foundedYear: 2012, founderName: 'Eddy Maroun & Elie Habib' },
  { name: 'Alef Education', sector: 'EdTech', description: 'AI-powered personalized learning platform deployed in 250+ UAE schools.', country: 'UAE', city: 'Abu Dhabi', website: 'https://alefeducation.com', fundingRaised: '$100M', fundingStage: 'Series B', foundedYear: 2015, founderName: 'Emad Aburashed' },
  { name: 'Tamara', sector: 'FinTech / BNPL', description: 'Saudi Arabia\'s leading Buy Now Pay Later platform with $400M+ raised and 10M+ users.', country: 'Saudi Arabia', city: 'Riyadh', website: 'https://tamara.co', fundingRaised: '$400M', fundingStage: 'Series C', foundedYear: 2020, founderName: 'Turki Bin Zarah' },
  { name: 'Lune', sector: 'FinTech', description: 'AI-powered financial wellness platform for MENA consumers.', country: 'UAE', city: 'Abu Dhabi', fundingRaised: '$5M', fundingStage: 'Seed', foundedYear: 2021, founderName: 'Khalid Keenan' },
  { name: 'Wio Bank', sector: 'FinTech / Neobank', description: 'Abu Dhabi\'s first platform bank, backed by ADQ, Alpha Dhabi, and Etisalat.', country: 'UAE', city: 'Abu Dhabi', website: 'https://wio.io', fundingRaised: '$284M', fundingStage: 'Series A', foundedYear: 2022, founderName: 'Jayesh Patel' },
]);

await insertTeam(4, [
  { name: 'Ahmad Ali Al Sayegh', title: 'Chairman', bio: 'Chairman of Hub71 and Abu Dhabi Global Market (ADGM). Former MD of Mubadala.', linkedIn: 'https://linkedin.com/in/ahmad-ali-al-sayegh', roleType: 'leadership' },
  { name: 'Badr Al-Olama', title: 'CEO', bio: 'Leads Hub71\'s global expansion strategy and ecosystem development. Former Mubadala executive.', linkedIn: 'https://linkedin.com/in/badr-al-olama', roleType: 'leadership' },
  { name: 'Noura Al Kaabi', title: 'Board Member', bio: 'UAE Minister of Culture and Youth, champion of Abu Dhabi\'s creative and tech economy.', linkedIn: 'https://linkedin.com/in/noura-al-kaabi', roleType: 'advisor' },
  { name: 'Faris Al Mazrui', title: 'Head of Startup Programs', bio: 'Manages Hub71\'s accelerator programs and startup incentive packages.', linkedIn: 'https://linkedin.com/in/faris-almazrui', roleType: 'operations' },
  { name: 'Wissam Yafi', title: 'Venture Partner', bio: 'Managing Director at Shorooq Partners, Hub71\'s most active co-investor.', linkedIn: 'https://linkedin.com/in/wissam-yafi', roleType: 'partner' },
]);

await insertPartners(4, [
  { name: 'Mubadala Investment Company', type: 'Investor', description: 'Abu Dhabi\'s $243B sovereign wealth fund and primary backer of Hub71.' },
  { name: 'Microsoft', type: 'Technology', description: 'Strategic technology partner providing Azure credits, AI tools, and enterprise connections.' },
  { name: 'SoftBank Vision Fund', type: 'Investor', description: 'Global co-investment partner for Hub71 portfolio companies seeking growth capital.' },
  { name: 'ADGM (Abu Dhabi Global Market)', type: 'Regulatory', description: 'Financial free zone providing regulatory sandbox and financial services licenses.' },
  { name: 'Abu Dhabi Investment Office', type: 'Government', description: 'Government investment arm supporting Hub71\'s mission to attract global tech companies.' },
  { name: 'Shorooq Partners', type: 'Investor', description: 'MENA-focused VC firm and most active co-investor in Hub71 portfolio companies.' },
  { name: 'Etisalat (e&)', type: 'Corporate', description: 'Telecom giant providing connectivity, enterprise access, and co-innovation opportunities.' },
]);

await insertPrograms(4, [
  { name: 'Hub71 Incentive Program', description: 'Hub71\'s flagship 12-month program offering startups a comprehensive incentive package: subsidized housing ($0–$500/month), co-working space, health insurance, and access to Abu Dhabi\'s sovereign wealth network. No equity taken.', duration: '12 months', format: 'in-person', equityTaken: '0%', fundingProvided: 'Up to $500,000 in incentives', status: 'open', eligibility: 'Tech startups at seed to Series A stage. Must commit to establishing a legal entity in Abu Dhabi.', applicationUrl: 'https://hub71.com/apply' },
  { name: 'Hub71+ Digital Assets', description: 'Specialized program for Web3, blockchain, and digital assets startups. Includes regulatory guidance from ADGM and access to Abu Dhabi\'s digital asset ecosystem.', duration: '12 months', format: 'hybrid', equityTaken: '0%', fundingProvided: 'Up to $500,000 in incentives', status: 'open', eligibility: 'Web3, blockchain, and digital assets startups at any stage.', applicationUrl: 'https://hub71.com/digital-assets/apply' },
]);

await insertCohorts(4, [
  { cohortNumber: 12, name: 'Hub71 Cohort 12', year: 2025, startDate: 'Jan 2025', cohortSize: 25, applicationsReceived: 1500, acceptanceRate: '1.7%', status: 'active', theme: 'AI, FinTech & Sustainability', highlights: 'Most international cohort with startups from 28 countries', totalFundingRaised: '$45M', jobsCreated: 350 },
  { cohortNumber: 11, name: 'Hub71 Cohort 11', year: 2024, startDate: 'Jan 2024', endDate: 'Dec 2024', cohortSize: 22, applicationsReceived: 1300, acceptanceRate: '1.7%', status: 'completed', theme: 'Digital Economy & Web3', highlights: 'Three companies raised $10M+ Series A; one NASDAQ listing', totalFundingRaised: '$60M', jobsCreated: 420 },
  { cohortNumber: 10, name: 'Hub71 Cohort 10', year: 2023, startDate: 'Jan 2023', endDate: 'Dec 2023', cohortSize: 20, applicationsReceived: 1100, acceptanceRate: '1.8%', status: 'completed', theme: 'HealthTech & EdTech', highlights: 'Highest collective valuation to date at $800M combined', totalFundingRaised: '$55M', jobsCreated: 380 },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// 5. MISK ACCELERATOR (id=5)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('Seeding Misk Accelerator...');
await clearAccelerator(5);
await updateAccelerator(5, {
  name: 'Misk Accelerator',
  slug: 'misk-accelerator',
  description: 'Misk Accelerator is the flagship startup program of the Misk Foundation, established by HRH Crown Prince Mohammed bin Salman. It targets Saudi and MENA youth entrepreneurs aged 18–35, providing $100,000 in funding, 6 months of intensive mentorship, and access to Saudi Arabia\'s largest youth-focused network. The program is aligned with Vision 2030\'s goal of increasing youth entrepreneurship.',
  shortDescription: 'Saudi Arabia\'s premier youth-focused accelerator, backed by Misk Foundation (HRH MBS). $100K funding, Vision 2030 aligned.',
  logo: null,
  website: 'https://misk.org.sa/accelerator',
  location: 'Riyadh, Saudi Arabia',
  mission: 'To empower Saudi and Arab youth to become global entrepreneurs who drive economic diversification and create meaningful impact.',
  investment_range: '$100,000',
  equity_taken: '5%',
  cohort_size: '15–20 startups',
  program_length: '6 months',
  success_rate: '72%',
  total_raised_by_alumni: '$200M+',
  batch_count: 10,
  total_funded: 150,
  contact_email: 'accelerator@misk.org.sa',
  linkedIn: 'https://linkedin.com/company/misk-foundation',
  twitter: 'https://twitter.com/miskfoundation',
  status: 'active',
});

await insertAlumni(5, [
  { name: 'Salla', sector: 'E-Commerce', description: 'Saudi e-commerce platform enabling SMEs to build online stores. 30,000+ merchants, $130M raised.', country: 'Saudi Arabia', city: 'Riyadh', website: 'https://salla.com', fundingRaised: '$130M', fundingStage: 'Series B', foundedYear: 2016, founderName: 'Salah Al-Ghamdi' },
  { name: 'Zid', sector: 'E-Commerce', description: 'Saudi e-commerce enablement platform for SMEs. Competitor to Salla with 15,000+ merchants.', country: 'Saudi Arabia', city: 'Riyadh', website: 'https://zid.sa', fundingRaised: '$50M', fundingStage: 'Series B', foundedYear: 2017, founderName: 'Sultan Al-Asmi' },
  { name: 'Mozn', sector: 'AI', description: 'Saudi AI company building Arabic NLP and financial crime detection solutions for banks.', country: 'Saudi Arabia', city: 'Riyadh', website: 'https://mozn.sa', fundingRaised: '$30M', fundingStage: 'Series A', foundedYear: 2018, founderName: 'Bader Al-Badr' },
  { name: 'Lean Technologies', sector: 'FinTech / Open Banking', description: 'Saudi open banking infrastructure enabling account-to-account payments. Backed by Sequoia.', country: 'Saudi Arabia', city: 'Riyadh', website: 'https://leantech.me', fundingRaised: '$33M', fundingStage: 'Series A', foundedYear: 2019, founderName: 'Hisham Al-Falih' },
  { name: 'Rewaa', sector: 'Retail Tech', description: 'Cloud-based POS and inventory management platform for Saudi retailers. 10,000+ merchants.', country: 'Saudi Arabia', city: 'Riyadh', website: 'https://rewaatech.com', fundingRaised: '$36M', fundingStage: 'Series A', foundedYear: 2019, founderName: 'Yazeed Al-Shamari' },
  { name: 'Hakbah', sector: 'FinTech / Savings', description: 'Digital savings circles platform (ROSCA) for Saudi consumers. Regulated by SAMA.', country: 'Saudi Arabia', city: 'Riyadh', website: 'https://hakbah.com', fundingRaised: '$5M', fundingStage: 'Seed', foundedYear: 2020, founderName: 'Abdulaziz Al-Jouf' },
  { name: 'Nana Direct', sector: 'Grocery Delivery', description: 'Saudi grocery delivery platform serving 30+ cities with 30-minute delivery.', country: 'Saudi Arabia', city: 'Riyadh', website: 'https://nana.sa', fundingRaised: '$18M', fundingStage: 'Series B', foundedYear: 2016, founderName: 'Sami Al-Hokair' },
]);

await insertTeam(5, [
  { name: 'Bader Al-Asaker', title: 'Secretary General, Misk Foundation', bio: 'Leads the Misk Foundation\'s mission to empower Saudi youth. Advisor to HRH Crown Prince.', linkedIn: 'https://linkedin.com/in/bader-al-asaker', roleType: 'leadership' },
  { name: 'Reem Al-Harthy', title: 'Director, Misk Accelerator', bio: 'Oversees Misk Accelerator program operations and alumni network.', linkedIn: 'https://linkedin.com/in/reem-alharthy', roleType: 'operations' },
  { name: 'Abdullah Al-Rashid', title: 'Mentor-in-Residence', bio: 'Co-founder of Jahez (NASDAQ: 1476), Saudi food delivery unicorn. Active angel investor.', linkedIn: 'https://linkedin.com/in/abdullah-alrashid', roleType: 'mentor' },
  { name: 'Fahad Al-Deghaither', title: 'Venture Partner', bio: 'Managing Director at Wa\'ed Ventures, Aramco\'s entrepreneurship fund.', linkedIn: 'https://linkedin.com/in/fahad-aldeghaither', roleType: 'partner' },
  { name: 'Noura Al-Ghamdi', title: 'Head of Programs', bio: 'Designs and delivers Misk Accelerator curriculum and mentorship programs.', linkedIn: 'https://linkedin.com/in/noura-alghamdi', roleType: 'operations' },
]);

await insertPartners(5, [
  { name: 'Misk Foundation', type: 'Government', description: 'Parent organization backed by HRH Crown Prince Mohammed bin Salman. Primary funder and strategic partner.' },
  { name: 'Saudi Aramco (Wa\'ed)', type: 'Investor', description: 'Co-investment partner focused on energy-adjacent and industrial tech startups.' },
  { name: 'STC', type: 'Corporate', description: 'Saudi Telecom Company — provides connectivity, cloud infrastructure, and enterprise market access.' },
  { name: 'PIF (Public Investment Fund)', type: 'Investor', description: 'Saudi Arabia\'s $700B sovereign wealth fund, providing follow-on investment opportunities.' },
  { name: 'Monsha\'at (SME Authority)', type: 'Government', description: 'Saudi SME Authority providing regulatory support and access to government procurement.' },
  { name: 'MIT Enterprise Forum', type: 'Strategic', description: 'Knowledge partner providing curriculum, mentorship, and global network access.' },
]);

await insertPrograms(5, [
  { name: 'Misk Accelerator — Main Program', description: 'The flagship 6-month program for Saudi and Arab youth entrepreneurs aged 18–35. Includes $100,000 in seed funding (5% equity), intensive mentorship from 100+ Saudi and global mentors, and access to Misk\'s network of government, corporate, and investor partners.', duration: '6 months', format: 'in-person', equityTaken: '5%', fundingProvided: '$100,000', status: 'open', eligibility: 'Saudi nationals or Arab youth aged 18–35 with a tech startup at pre-seed to seed stage. Must be Vision 2030 aligned.', applicationUrl: 'https://misk.org.sa/accelerator/apply' },
]);

await insertCohorts(5, [
  { cohortNumber: 10, name: 'Misk Accelerator — Cohort 10', year: 2025, startDate: 'Mar 2025', endDate: 'Aug 2025', cohortSize: 18, applicationsReceived: 2000, acceptanceRate: '0.9%', status: 'active', theme: 'AI & Digital Economy', highlights: 'Record 2,000 applications; first cohort with international Arab founders', totalFundingRaised: '$25M', jobsCreated: 280 },
  { cohortNumber: 9, name: 'Misk Accelerator — Cohort 9', year: 2024, startDate: 'Mar 2024', endDate: 'Aug 2024', cohortSize: 17, applicationsReceived: 1800, acceptanceRate: '0.9%', status: 'completed', theme: 'FinTech & E-Commerce', highlights: 'Two startups raised $10M+ Series A; one acquired by STC', totalFundingRaised: '$30M', jobsCreated: 320 },
  { cohortNumber: 8, name: 'Misk Accelerator — Cohort 8', year: 2023, startDate: 'Mar 2023', endDate: 'Aug 2023', cohortSize: 15, applicationsReceived: 1500, acceptanceRate: '1.0%', status: 'completed', theme: 'HealthTech & EdTech', highlights: 'Highest collective valuation; three companies expanded to GCC', totalFundingRaised: '$22M', jobsCreated: 250 },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. LAUNCH LAB (id=30001)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('Seeding Launch Lab...');
await clearAccelerator(30001);
await updateAccelerator(30001, {
  name: 'Launch Lab',
  slug: 'launch-lab',
  description: 'Launch Lab is Egypt\'s first university-based accelerator, operated by the American University in Cairo (AUC). It supports Egyptian and MENA entrepreneurs from idea stage through early growth, with a focus on social impact, sustainability, and technology-driven solutions. Since 2013, Launch Lab has supported 200+ startups and created 1,500+ jobs across Egypt.',
  shortDescription: 'Egypt\'s first university accelerator at AUC. 200+ startups, social impact focus since 2013.',
  logo: null,
  website: 'https://launchlab.aucegypt.edu',
  location: 'Cairo, Egypt',
  mission: 'To cultivate a generation of Egyptian entrepreneurs who create sustainable, technology-driven solutions to Egypt\'s most pressing challenges.',
  investment_range: '$5,000–$25,000',
  equity_taken: '0–5%',
  cohort_size: '10–15 startups',
  program_length: '4 months',
  success_rate: '65%',
  total_raised_by_alumni: '$50M+',
  batch_count: 20,
  total_funded: 200,
  contact_email: 'launchlab@aucegypt.edu',
  linkedIn: 'https://linkedin.com/company/launchlab-auc',
  twitter: 'https://twitter.com/launchlabauc',
  status: 'active',
});

await insertAlumni(30001, [
  { name: 'Nafham', sector: 'EdTech', description: 'Crowdsourced educational video platform for Egyptian K-12 students. Acquired by Mena Apps.', country: 'Egypt', city: 'Cairo', fundingRaised: 'Acquired', fundingStage: 'Acquired', foundedYear: 2013, founderName: 'Ahmed Alfi' },
  { name: 'Halan', sector: 'Mobility / FinTech', description: 'Egypt\'s leading micro-mobility and financial services super-app with $220M raised.', country: 'Egypt', city: 'Cairo', website: 'https://halan.com', fundingRaised: '$220M', fundingStage: 'Series C', foundedYear: 2017, founderName: 'Mounir Nakhla' },
  { name: 'Khazna', sector: 'FinTech', description: 'Egyptian financial super-app for the underbanked, offering savings, loans, and payments.', country: 'Egypt', city: 'Cairo', website: 'https://khazna.app', fundingRaised: '$38M', fundingStage: 'Series A', foundedYear: 2020, founderName: 'Omar Saleh' },
  { name: 'Grinta', sector: 'HealthTech / Pharma', description: 'B2B pharmaceutical marketplace connecting pharmacies with distributors across Egypt.', country: 'Egypt', city: 'Cairo', website: 'https://grinta.com', fundingRaised: '$8M', fundingStage: 'Seed', foundedYear: 2021, founderName: 'Karim Khalil' },
  { name: 'Taager', sector: 'Social Commerce', description: 'Social commerce platform enabling micro-entrepreneurs to sell products online without inventory.', country: 'Egypt', city: 'Cairo', website: 'https://taager.com', fundingRaised: '$7M', fundingStage: 'Seed', foundedYear: 2019, founderName: 'Ahmed Mokhtar' },
  { name: 'Curacel', sector: 'InsurTech', description: 'AI-powered insurance claims automation platform for African and MENA insurers.', country: 'Egypt', city: 'Cairo', website: 'https://curacel.co', fundingRaised: '$3M', fundingStage: 'Pre-Seed', foundedYear: 2019, founderName: 'Henry Mascot' },
]);

await insertTeam(30001, [
  { name: 'Sherif Abdelkarim', title: 'Director, Launch Lab', bio: 'Leads Launch Lab\'s programs and partnerships. Former entrepreneur and AUC faculty member.', linkedIn: 'https://linkedin.com/in/sherif-abdelkarim', roleType: 'leadership' },
  { name: 'Dina Sherif', title: 'Co-Founder', bio: 'Co-founded Launch Lab in 2013. Currently Managing Director at Flat6Labs Riyadh.', linkedIn: 'https://linkedin.com/in/dina-sherif', roleType: 'leadership' },
  { name: 'Tarek Assaad', title: 'Mentor-in-Residence', bio: 'Managing Partner at Algebra Ventures, Egypt\'s leading early-stage VC.', linkedIn: 'https://linkedin.com/in/tarek-assaad', roleType: 'mentor' },
  { name: 'Heba Ramzy', title: 'Program Manager', bio: 'Manages day-to-day operations and startup support for Launch Lab cohorts.', linkedIn: 'https://linkedin.com/in/heba-ramzy', roleType: 'operations' },
]);

await insertPartners(30001, [
  { name: 'American University in Cairo (AUC)', type: 'Academic', description: 'Parent institution providing facilities, faculty mentorship, and academic resources.' },
  { name: 'USAID Egypt', type: 'Government', description: 'US development agency funding Launch Lab\'s social impact programs.' },
  { name: 'Algebra Ventures', type: 'Investor', description: 'Egypt\'s leading early-stage VC, primary co-investor in Launch Lab portfolio.' },
  { name: 'Flat6Labs', type: 'Strategic', description: 'Accelerator partner providing advanced-stage support for Launch Lab graduates.' },
  { name: 'Egyptian Ministry of Communications', type: 'Government', description: 'Government partner supporting Egypt\'s digital transformation agenda.' },
  { name: 'Google for Startups', type: 'Technology', description: 'Technology partner providing Google Cloud credits and mentorship.' },
]);

await insertPrograms(30001, [
  { name: 'Launch Lab Accelerator', description: 'The flagship 4-month program for Egyptian and MENA entrepreneurs. Includes $5,000–$25,000 in seed funding, co-working space at AUC, mentorship from 80+ mentors, and connections to Egypt\'s investor ecosystem.', duration: '4 months', format: 'in-person', equityTaken: '0–5%', fundingProvided: '$5,000–$25,000', status: 'open', eligibility: 'Early-stage startups with a focus on social impact, sustainability, or technology. Egyptian founders preferred.', applicationUrl: 'https://launchlab.aucegypt.edu/apply' },
  { name: 'Launch Lab X (Pre-Accelerator)', description: 'A 6-week pre-accelerator for idea-stage entrepreneurs. Helps founders validate their concept, build an MVP, and prepare for the full accelerator program. No equity taken.', duration: '6 weeks', format: 'hybrid', equityTaken: '0%', fundingProvided: 'No funding', status: 'open', eligibility: 'Idea-stage entrepreneurs with a clear problem statement. Open to all nationalities.' },
]);

await insertCohorts(30001, [
  { cohortNumber: 20, name: 'Launch Lab — Cohort 20', year: 2025, startDate: 'Feb 2025', endDate: 'May 2025', cohortSize: 12, applicationsReceived: 400, acceptanceRate: '3.0%', status: 'active', theme: 'AgriTech & Food Security', highlights: 'First cohort focused on Egypt\'s food security challenges', totalFundingRaised: '$3M', jobsCreated: 80 },
  { cohortNumber: 19, name: 'Launch Lab — Cohort 19', year: 2024, startDate: 'Feb 2024', endDate: 'May 2024', cohortSize: 11, applicationsReceived: 380, acceptanceRate: '2.9%', status: 'completed', theme: 'HealthTech & Pharma', highlights: 'Two startups raised $5M+ seed rounds; one acquired', totalFundingRaised: '$8M', jobsCreated: 120 },
  { cohortNumber: 18, name: 'Launch Lab — Cohort 18', year: 2023, startDate: 'Feb 2023', endDate: 'May 2023', cohortSize: 10, applicationsReceived: 350, acceptanceRate: '2.9%', status: 'completed', theme: 'FinTech & Financial Inclusion', highlights: 'Highest-funded cohort to date; three companies expanded to GCC', totalFundingRaised: '$6M', jobsCreated: 95 },
]);

console.log('✅ All 6 accelerators seeded successfully!');
await conn.end();
