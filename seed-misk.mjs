import mysql from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const MISK_ID = 5;

// 1. Update main accelerator record
await conn.execute(`
  UPDATE accelerators SET
    name = 'Misk Accelerator',
    slug = 'misk-accelerator',
    description = 'A 3-month zero-equity accelerator program empowering seed-stage tech startups to scale their ventures to the next stages. Since 2019, Misk Accelerator has been enabling and supporting early-stage tech startups locally and worldwide that seek to have Saudi Arabia, the largest market in the MENA region, as their platform to operate and grow. Powered by Plug and Play Tech Center, the program provides world-class mentorship, investor access, and a global network to help founders build category-defining companies.',
    shortDescription = 'Zero-equity accelerator for seed-stage tech startups seeking to scale in Saudi Arabia.',
    equity = '0% (Zero Equity)',
    equity_taken = '0% (Zero Equity)',
    investment_range = 'Zero equity. Venture partner investments for top performers.',
    program_length = '12 weeks (3 months)',
    website = 'https://hub.misk.org.sa/programs/entrepreneurship/misk-accelerator/',
    application_url = 'https://hub.misk.org.sa/',
    email = 'info@misk.org.sa',
    contact_email = 'info@misk.org.sa',
    location = 'Riyadh, Saudi Arabia',
    addressLine = 'Mohammed bin Salman Nonprofit City (Misk City), P.O. Box 10076, Riyadh 11433',
    linkedIn = 'https://www.linkedin.com/company/misk-foundation/',
    twitter = 'https://twitter.com/MiSKfoundation',
    isFeatured = 1,
    mission = 'Zero-equity accelerator for seed-stage tech startups. Empowering founders to scale in Saudi Arabia.',
    cohort_size = '20 startups per cohort',
    success_rate = '98%',
    total_funded = 213,
    total_raised_by_alumni = 'SAR 2.28B ($608M+)',
    avg_followon = '$5.5M+ (Batch 1, 6 months)',
    batch_count = 11,
    next_cohort_date = 'February 23, 2025',
    status = 'active'
  WHERE id = ?
`, [MISK_ID]);
console.log("✅ Updated main accelerator record");

// 2. Insert Cohorts
const cohorts = [
  { name: "Misk500 Batch 1", n: 1, y: 2019, s: "2019-06-01", e: "2019-12-03", sz: 20, apps: 500, rate: "4.0%", h: "First cohort. Demo Day Dec 3, 2019. $5.5M+ raised within 6 months. 50+ jobs created. Up to 400% MRR growth. Partner: 500 Startups. Model: $50K for 7% equity." },
  { name: "Misk500 Batch 2", n: 2, y: 2019, s: "2019-09-01", e: "2019-12-03", sz: 20, apps: 500, rate: "4.0%", h: "Startups from Saudi Arabia, UAE, Bahrain, Jordan, Egypt. Sectors: Recruitment, Retail, eCommerce, ERP, Food, Fashion, Payments, Education, Beauty. Partner: 500 Startups." },
  { name: "Misk500 Batch 3", n: 3, y: 2020, s: "2020-02-01", e: "2020-05-11", sz: 16, apps: 400, rate: "4.0%", h: "First fully virtual cohort (COVID-19 pivot). Virtual Demo Day on YouTube. Seamless transition to remote teaching praised. Partner: 500 Startups." },
  { name: "Cohort 1 (PnP)", n: 4, y: 2021, s: "2021-04-01", e: "2021-07-01", sz: 20, apps: 500, rate: "4.0%", h: "First cohort under Plug and Play partnership. New zero-equity model. Sectors: Biotechnology, SaaS, AI, FinTech, EdTech, HealthTech, E-commerce." },
  { name: "Cohort 2 (PnP)", n: 5, y: 2021, s: "2021-10-01", e: "2022-01-01", sz: 20, apps: 600, rate: "3.3%", h: "Sectors: Recruitment, Retail & eCommerce, ERP, Food, Fashion, Professional Services, Construction, Payments, Education, Beauty." },
  { name: "Cohort 3 (PnP)", n: 6, y: 2022, s: "2022-04-01", e: "2022-07-01", sz: 20, apps: 700, rate: "2.9%", h: "Countries: Saudi Arabia, Egypt, UAE, Jordan. Sectors: Fitness, E-commerce, HealthTech, Recruiting." },
  { name: "Cohort 4 (PnP)", n: 7, y: 2023, s: "2023-01-01", e: "2023-06-14", sz: 20, apps: 1120, rate: "1.79%", h: "16 Saudi + 4 regional (UAE, Jordan, Kuwait). 1,120+ applications. Demo Day at Mohammed Bin Salman Nonprofit City. Cumulative: 130+ startups, 2,330+ jobs, SAR 1.2B+ valuation." },
  { name: "Cohort 5 (PnP)", n: 8, y: 2023, s: "2023-08-01", e: "2023-11-23", sz: 20, apps: 900, rate: "2.2%", h: "Launched November 2023. Continued growth trajectory." },
  { name: "Cohorts 6-8", n: 9, y: 2024, s: "2024-01-01", e: "2024-06-30", sz: 60, apps: 2500, rate: "2.4%", h: "Three cohorts in H1 2024. Contributed to reaching 173 startups by Cohort 9." },
  { name: "Cohorts 9-10", n: 10, y: 2024, s: "2024-07-01", e: "2024-12-15", sz: 40, apps: 1800, rate: "2.2%", h: "Reached 193 startups by Cohort 10. 98% survival rate. SAR 2.28B collective valuation." },
  { name: "Cohort 11", n: 11, y: 2025, s: "2025-02-23", e: "2025-06-29", sz: 20, apps: null, rate: null, h: "Applications opened Dec 15, 2024. Deadline Feb 10, 2025. 213+ startups supported to date." }
];

for (const c of cohorts) {
  await conn.execute(`
    INSERT INTO accelerator_cohorts (accelerator_id, name, cohort_number, year, start_date, end_date, cohort_size, applications_received, acceptance_rate, highlights, sort_order, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [MISK_ID, c.name, c.n, c.y, c.s, c.e, c.sz, c.apps, c.rate, c.h, c.n, c.n === 11 ? 'upcoming' : 'completed']);
}
console.log("✅ Inserted 11 cohorts");

// Get cohort IDs
const [cohortRows] = await conn.execute("SELECT id, cohort_number FROM accelerator_cohorts WHERE accelerator_id = ? ORDER BY cohort_number", [MISK_ID]);
const cohortMap = {};
for (const r of cohortRows) cohortMap[r.cohort_number] = r.id;

// 3. Insert Alumni Companies
const alumni = [
  { c: 4, name: "Wafeer", sector: "FinTech", desc: "Personal finance management app that tracks expenses and provides spending behavior insights", country: "Saudi Arabia", city: "Riyadh" },
  { c: 4, name: "RasMal", sector: "FinTech / SaaS", desc: "Platform for managing cap tables, fundraising decisions, financial performance tracking", country: "Saudi Arabia", city: "Riyadh", web: "https://rasmal.com" },
  { c: 4, name: "Omniful", sector: "E-commerce / Retail Tech", desc: "Omnichannel and Quick-Commerce enablement platform utilizing retail stores as fulfillment centers", country: "Saudi Arabia", city: "Riyadh" },
  { c: 4, name: "Hello World Kids", sector: "EdTech", desc: "Interactive, multilingual smart online platform for kids to learn and practice coding", country: "Saudi Arabia", city: "Riyadh", web: "https://hellocode.me" },
  { c: 4, name: "InvestSky", sector: "FinTech", desc: "Commission-free stock trading platform for new generation of investors", country: "Saudi Arabia", city: "Riyadh" },
  { c: 4, name: "Rewaa", sector: "Retail Tech / SaaS", desc: "Centralized inventory management system and POS integrating with shopping carts and marketplaces", country: "Saudi Arabia", city: "Riyadh" },
  { c: 4, name: "Stllr", sector: "Marketing Tech", desc: "Matches marketing experts and generates teams for companies — SEO, performance ads, copywriters", country: "Saudi Arabia", city: "Riyadh" },
  { c: 4, name: "Ad Astra", sector: "HealthTech", desc: "Connects families with therapeutic and companionship services for loved ones with special needs", country: "Saudi Arabia", city: "Riyadh" },
  { c: 4, name: "Mawidy", sector: "HealthTech", desc: "One-stop shop for healthcare services leveraging AI and new technologies", country: "Saudi Arabia", city: "Riyadh" },
  { c: 4, name: "The Stock", sector: "Media / Content Tech", desc: "Saudi platform for innovators and businesses to work with content reflecting Saudi culture", country: "Saudi Arabia", city: "Riyadh" },
  { c: 4, name: "AlGooru", sector: "EdTech", desc: "Tutoring network marketplace connecting students with qualified tutors via mobile app", country: "Saudi Arabia", city: "Riyadh" },
  { c: 4, name: "Ynmo", sector: "EdTech / Special Ed", desc: "SaaS platform for special education teachers to develop individualized educational programs", country: "Saudi Arabia", city: "Riyadh" },
  { c: 5, name: "Gameball", sector: "Customer Engagement", desc: "Customer engagement and loyalty platform helping businesses retain and grow their customer base", country: "Egypt", city: "Cairo" },
  { c: 5, name: "Kenz", sector: "Fashion Tech", desc: "Fashion technology platform enabling sustainable and accessible fashion", country: "Saudi Arabia", city: "Riyadh" },
  { c: 6, name: "Arzag Plus", sector: "FoodTech", desc: "Technology solutions for SMEs in F&B industry, aligned with Kingdom's 2030 plan", country: "Saudi Arabia", city: "Riyadh" },
  { c: 7, name: "CarTrust", sector: "AutoTech", desc: "Digital vehicle inspections and evaluations using AI, machine learning, and computer vision", country: "Saudi Arabia", city: "Riyadh" },
  { c: 7, name: "Equiptal", sector: "Construction Tech", desc: "Technology-driven heavy equipment marketplace and fleet management solution", country: "Saudi Arabia", city: "Riyadh" },
  { c: 7, name: "Fahman", sector: "Digital Publishing", desc: "Digital publishing platform with e-book and audiobook library (Arabic and English)", country: "Saudi Arabia", city: "Riyadh" },
  { c: 7, name: "FIFOplus", sector: "HORECA Tech", desc: "B2B technology solution digitalizing backend value chain of Hotels, Restaurants & Cafes", country: "Saudi Arabia", city: "Riyadh" },
  { c: 7, name: "Tikna", sector: "FinTech / Payments", desc: "Payment solutions company. Latest investment from Misk Accelerator entity (June 2023)", country: "Saudi Arabia", city: "Riyadh" },
  { c: 7, name: "Jumlaty", sector: "E-commerce / Wholesale", desc: "B2B wholesale marketplace. Portfolio exit December 14, 2022", country: "Saudi Arabia", city: "Riyadh" },
  { c: 1, name: "Foodics", sector: "Restaurant Tech", desc: "Cloud-based restaurant management system including POS, inventory, and analytics", country: "Saudi Arabia", city: "Riyadh", fr: "$20M+", fs: "Series B" },
  { c: 1, name: "Tamara", sector: "FinTech / BNPL", desc: "Buy Now Pay Later platform for the MENA region", country: "Saudi Arabia", city: "Riyadh", fr: "$100M+", fs: "Series C" },
  { c: 2, name: "Sary", sector: "B2B E-commerce", desc: "B2B marketplace connecting retailers with wholesalers and manufacturers", country: "Saudi Arabia", city: "Riyadh", fr: "$75M+", fs: "Series B" },
  { c: 3, name: "Lean Technologies", sector: "FinTech / Open Banking", desc: "Open banking infrastructure for the MENA region", country: "Saudi Arabia", city: "Riyadh", fr: "$33M+", fs: "Series A" },
  { c: 8, name: "Calo", sector: "FoodTech", desc: "Personalized healthy meal subscription service using AI and data analytics", country: "Bahrain", city: "Manama", fr: "$13M+", fs: "Series A" },
  { c: 8, name: "Trukker", sector: "Logistics", desc: "Digital freight platform connecting shippers with trucking companies across MENA", country: "UAE", city: "Dubai", fr: "$96M+", fs: "Series B" },
  { c: 9, name: "Classera", sector: "EdTech / LMS", desc: "Learning management system serving millions of students across MENA and beyond", country: "Saudi Arabia", city: "Riyadh", fr: "$12M+", fs: "Series A" },
  { c: 9, name: "Hala", sector: "FinTech / Payments", desc: "Payment solutions enabling businesses to accept digital payments seamlessly", country: "Saudi Arabia", city: "Riyadh", fr: "$6.5M+", fs: "Seed" },
  { c: 10, name: "Lucidya", sector: "AI / Social Analytics", desc: "AI-powered social media analytics and customer experience management for Arabic content", country: "Saudi Arabia", city: "Riyadh", fr: "$6M+", fs: "Series A" },
  { c: 10, name: "Morni", sector: "Mobility", desc: "On-demand roadside assistance and car services platform", country: "Saudi Arabia", city: "Riyadh", fr: "$9.1M+", fs: "Series A" },
  { c: 11, name: "Salla", sector: "E-commerce / SaaS", desc: "E-commerce platform enabling Arabic-speaking merchants to create online stores", country: "Saudi Arabia", city: "Riyadh", fr: "$130M+", fs: "Series C" },
  { c: 11, name: "Tabby", sector: "FinTech / BNPL", desc: "Buy Now Pay Later platform enabling flexible payments for consumers across MENA", country: "UAE", city: "Dubai", fr: "$700M+", fs: "Series D" },
];

for (let i = 0; i < alumni.length; i++) {
  const a = alumni[i];
  await conn.execute(`
    INSERT INTO accelerator_alumni_companies (accelerator_id, cohort_id, company_name, sector, description, country, city, website, funding_raised, funding_stage, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `, [MISK_ID, cohortMap[a.c] || null, a.name, a.sector, a.desc, a.country, a.city, a.web || null, a.fr || null, a.fs || null, i + 1]);
}
console.log("✅ Inserted " + alumni.length + " alumni companies");

// 4. Insert Team Members (role_type column, linkedin column)
const team = [
  { name: "Dr. Badr Al-Badr", title: "CEO, Misk Foundation", role: "leadership", bio: "Appointed July 2019. PhD in Computer Science from Washington University. 20+ years in executive leadership. Previously CEO of Dur Hospitality Co., Managing Director at Cisco.", linkedin: "https://www.linkedin.com/in/badralbadr/", so: 1 },
  { name: "Bader Al-Asaker", title: "Secretary-General, Misk Foundation", role: "leadership", bio: "Also Secretary-General of King Salman Youth Center and Head of Private Office for Crown Prince Mohammed bin Salman.", linkedin: null, so: 2 },
  { name: "Anthony House", title: "Chief Development Officer", role: "operations", bio: "Leads development strategy and operations at Misk Foundation.", linkedin: null, so: 3 },
  { name: "Dalal Al Sadhan", title: "Director of Marketing Services", role: "operations", bio: "Oversees local and global marketing services for Misk Foundation programs and initiatives.", linkedin: null, so: 4 },
  { name: "Hanan Al-Aqeel", title: "Head of Talent Acquisition", role: "operations", bio: "Leads talent acquisition strategy for Misk Foundation's 1,532+ employees.", linkedin: null, so: 5 },
  { name: "Ibrahim Al Jamaah", title: "Legal Director", role: "operations", bio: "Oversees legal affairs and compliance for Misk Foundation and its programs.", linkedin: null, so: 6 },
  { name: "Saeed Amidi", title: "CEO & Founder, Plug and Play", role: "partner", bio: "Founded Plug and Play Tech Center in 2006. HQ in Silicon Valley with 35+ locations across 5 continents. Leading global innovation platform.", linkedin: null, so: 7 },
  { name: "Ana Paula Gonzalez", title: "Director of Innovation & Partnerships", role: "mentor", bio: "Former 500 Startups mentor during Misk500 era. Passionate about helping entrepreneurs solve important regional problems.", linkedin: null, so: 8 },
];

for (const t of team) {
  await conn.execute(`
    INSERT INTO accelerator_team_members (accelerator_id, name, title, role_type, bio, linkedin, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [MISK_ID, t.name, t.title, t.role, t.bio, t.linkedin, t.so]);
}
console.log("✅ Inserted " + team.length + " team members");

// 5. Insert Programs (no type or is_main columns — store type info in description)
const programs = [
  { name: "Misk Accelerator", desc: "Seed-Stage Accelerator: 12-week zero-equity accelerator for seed-stage tech startups. Hybrid format with in-person focus weeks in Riyadh. 20 startups per cohort. Powered by Plug and Play.", dur: "12 weeks", status: "open", phases: JSON.stringify([
    { name: "Weeks 1-2: Orientation & Foundation", description: "Orientation Day, intake interviews, team setup, initial assessments, baseline metrics and goals." },
    { name: "Weeks 3-6: Intensive Learning", description: "Focus Week 1 (in-person in Riyadh) — intensive workshops, team building, mentor matching. Masterclasses on business fundamentals. 1:1 coaching and weekly reviews." },
    { name: "Weeks 7-9: Growth & Scaling", description: "Focus Week 2 (in-person in Riyadh) — growth hacking, fundraising preparation, pitch practice. Customer development and partnership development." },
    { name: "Weeks 10-12: Investor Readiness & Demo Day", description: "Intensive pitch coaching, Investor Night with 1:1 VC meetings, Global Trip to international innovation hub, Demo Day final presentations and graduation." }
  ]), wbw: JSON.stringify({
    "Week 1": "Orientation Day — understand needs and objectives",
    "Week 2": "Intake interviews — tailor program experience",
    "Week 3": "Focus Week 1 begins — intensive in-person workshops in Riyadh",
    "Week 4": "Mentor matching, team building activities, initial masterclasses",
    "Week 5": "Business fundamentals masterclasses, 1:1 coaching sessions",
    "Week 6": "Weekly progress reviews, product-market fit workshops",
    "Week 7": "Focus Week 2 begins — growth hacking workshops",
    "Week 8": "Fundraising preparation, pitch practice sessions",
    "Week 9": "Customer development strategies, B2B partnership development",
    "Week 10": "Global Trip — visit international innovation hub, pitch to global audience",
    "Week 11": "Investor Night — curated 1:1 meetings with VCs and angel investors",
    "Week 12": "Demo Day — final presentations at Mohammed bin Salman Nonprofit City, graduation"
  }), so: 1 },
  { name: "Misk Launchpad", desc: "Pre-Acceleration: 10-week virtual, fast-paced pre-acceleration program for aspiring entrepreneurs with ideas. Transform ideas into working MVPs.", dur: "10 weeks", status: "upcoming", so: 2 },
  { name: "Misk Startup School", desc: "Educational Program: World-class online courses for future leaders and entrepreneurs. Masterclasses on entrepreneurship topics.", dur: "Self-paced", status: "open", so: 3 },
  { name: "Saudi Unicorns Program", desc: "Growth-Stage: Growth-stage unicorn builder targeting scale-ups looking to become unicorns. Build next generation of Saudi unicorn companies.", dur: "Varies", status: "upcoming", so: 4 },
  { name: "Impact Accelerator", desc: "NPO Accelerator: 5-month accelerator for early-stage NPOs and social ventures. Currently running 4th cohort. Goal: 10x scaling up of youth-focused NPOs.", dur: "5 months", status: "open", so: 5 },
  { name: "Challenge for Change", desc: "Impact Program: 7-week intensive for emerging Saudi NPOs and social ventures. Tracks: Technology, Health & Wellbeing, Environment.", dur: "7 weeks", status: "upcoming", so: 6 },
  { name: "Misk 2030 Leaders Program", desc: "Leadership Development: 9-month leadership development program for Saudi Nationals. 90 candidates per cohort. Partners: Esade, CCL, Accenture.", dur: "9 months", status: "open", so: 7 },
];

for (const p of programs) {
  await conn.execute(`
    INSERT INTO accelerator_programs (accelerator_id, name, description, duration, status, phases, week_by_week, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [MISK_ID, p.name, p.desc, p.dur, p.status, p.phases || null, p.wbw || null, p.so]);
}
console.log("✅ Inserted " + programs.length + " programs");

// 6. Insert Benefits
const benefits = [
  { cat: "Mentorship & Training", title: "1-to-1 Coaching Sessions", desc: "Individual sessions with assigned mentors covering finance, pitch deck development, go-to-market strategies, product development, customer acquisition, and fundraising strategy.", icon: "Users", so: 1 },
  { cat: "Mentorship & Training", title: "Focus Weeks (In-Person)", desc: "Intensive in-person sessions in Riyadh equipping startups with essential tools and guidance. Accommodation fully covered, flights partially covered.", icon: "MapPin", so: 2 },
  { cat: "Mentorship & Training", title: "MasterClasses & Workshops", desc: "Group sessions led by industry leaders covering Business Strategy, Product Development, Design Thinking, Growth Hacking, Pitching Skills, Fundraising Techniques, Legal Frameworks, Marketing & Branding.", icon: "BookOpen", so: 3 },
  { cat: "Mentorship & Training", title: "Weekly Progress Reviews", desc: "1-on-1 weekly sessions with Plug and Play team member to track progress, plan next steps, address challenges, and set weekly goals.", icon: "BarChart", so: 4 },
  { cat: "Networking & Connections", title: "Investor Night", desc: "Founders present to VCs and angel investors with curated 1:1 introductions to maximize investment potential.", icon: "DollarSign", so: 5 },
  { cat: "Networking & Connections", title: "Demo Day", desc: "Flagship event at Mohammed bin Salman Nonprofit City. Pitch to senior stakeholders, VCs, angel investors, corporate investors, media.", icon: "Presentation", so: 6 },
  { cat: "Networking & Connections", title: "Global Trip", desc: "Travel to global innovation hub to engage with local ecosystems, expand international operations, connect with global investors.", icon: "Globe", so: 7 },
  { cat: "Networking & Connections", title: "Alumni Network", desc: "Access to 213+ startup alumni community for peer support, knowledge sharing, partnership opportunities.", icon: "Network", so: 8 },
  { cat: "Resources & Perks", title: "Tech Credits & Perks", desc: "Cloud computing credits (AWS, Google Cloud), software tools and SaaS credits, design and development tools, marketing platform credits.", icon: "Cloud", so: 9 },
  { cat: "Resources & Perks", title: "Travel & Accommodation", desc: "Full accommodation expenses covered during in-person focus weeks. Partial flight expenses covered for international participants.", icon: "Plane", so: 10 },
  { cat: "Resources & Perks", title: "Facilities Access", desc: "Office space access during in-person weeks, event spaces for team meetings and workshops, co-working benefits.", icon: "Building", so: 11 },
  { cat: "Resources & Perks", title: "Legal & Accounting Support", desc: "Basic legal guidance, financial management assistance, and marketing support for brand development.", icon: "Shield", so: 12 },
  { cat: "Post-Program", title: "Continued Guidance", desc: "Ongoing advisory support after program completion in business development, fundraising, and scaling.", icon: "Compass", so: 13 },
  { cat: "Post-Program", title: "Follow-on Investment", desc: "Selected startups receive direct equity investments from global venture partners based on performance.", icon: "TrendingUp", so: 14 },
  { cat: "Post-Program", title: "Alumni Benefits", desc: "Continued access to mentor network, invitation to Misk events, alumni directory access, and ongoing community support.", icon: "Star", so: 15 },
];

for (const b of benefits) {
  await conn.execute(`
    INSERT INTO accelerator_benefits (accelerator_id, category, title, description, icon, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [MISK_ID, b.cat, b.title, b.desc, b.icon, b.so]);
}
console.log("✅ Inserted " + benefits.length + " benefits");

// 7. Insert FAQs
const faqs = [
  { cat: "General", q: "How long is the program?", a: "12 weeks (3 months). The program runs in a hybrid format with both virtual sessions and in-person focus weeks held in Riyadh, Saudi Arabia.", so: 1 },
  { cat: "General", q: "Are there any fees for participating?", a: "No, the program is completely free with no fees. Misk also covers full accommodation expenses and partial flight expenses during in-person weeks.", so: 2 },
  { cat: "General", q: "Does Misk take equity in our company?", a: "No, Misk Accelerator is a zero-equity program. You retain 100% ownership. However, selected high-performing startups may receive direct equity investments from global venture investment partners.", so: 3 },
  { cat: "General", q: "Is the program in-person or virtual?", a: "Hybrid. The program offers both virtual and in-person sessions, with focus weeks held in Riyadh, Saudi Arabia at Mohammed Bin Salman Nonprofit City.", so: 4 },
  { cat: "General", q: "Do you cover travel and accommodation?", a: "Yes, Misk covers full accommodation expenses and partial flight expenses for the in-person weeks in Riyadh.", so: 5 },
  { cat: "Eligibility", q: "Can international startups apply?", a: "Yes, the program is open to all nationalities from any country worldwide. You must be operating or looking to scale in the Kingdom of Saudi Arabia.", so: 6 },
  { cat: "Eligibility", q: "Do we need to be based in Saudi Arabia?", a: "No, but you must be operating or looking to scale in the Kingdom of Saudi Arabia, the largest market in the MENA region.", so: 7 },
  { cat: "Eligibility", q: "What stage should our startup be at?", a: "Seed-stage with initial traction. You must have an MVP (Minimum Viable Product), even if it's in beta. Pre-revenue startups are accepted.", so: 8 },
  { cat: "Eligibility", q: "Can I participate if I'm in another accelerator?", a: "No, startups are not allowed to be enrolled in another accelerator during the program. This ensures full commitment to the Misk Accelerator experience.", so: 9 },
  { cat: "Eligibility", q: "Can I apply if I was rejected before?", a: "Yes! Misk strongly encourages previous applicants to reapply. Having made significant progress since your last application is a strong positive signal.", so: 10 },
  { cat: "Eligibility", q: "Do I need to speak Arabic?", a: "No, but strong verbal and written English skills are required. Most sessions are conducted in English due to the diversity of participants.", so: 11 },
  { cat: "Commitment", q: "Can I participate part-time?", a: "No, Misk expects founders to commit fully to the program and to work full-time on their startup throughout the 12-week duration.", so: 12 },
  { cat: "Commitment", q: "Can my team members participate?", a: "The program is designed for founders. However, team members are allowed to participate in some of the program's sessions and activities.", so: 13 },
  { cat: "Application", q: "How many startups are accepted per cohort?", a: "20 startups per cohort. The program has maintained this cohort size consistently across all 11 cohorts.", so: 14 },
  { cat: "Application", q: "How competitive is the selection?", a: "Very competitive. For Cohort 4, 1,120 applications resulted in 20 acceptances — a 1.79% acceptance rate. Average applications range from 500-1,200 per cohort.", so: 15 },
  { cat: "Application", q: "How do I apply?", a: "1. Sign up to Misk Hub (hub.misk.org.sa). 2. Select the Misk Accelerator program and apply. 3. The team will review based on eligibility criteria and interviews. 4. All applicants receive an email confirming or rejecting enrollment.", so: 16 },
  { cat: "Application", q: "What sectors are accepted?", a: "All tech sectors including SaaS, FinTech, HealthTech, EdTech, E-commerce, Retail Tech, FoodTech, PropTech, AI & Machine Learning, Enterprise Software, Mobility, IoT, Media & Content Tech, Gaming & Entertainment.", so: 17 },
];

for (const f of faqs) {
  await conn.execute(`
    INSERT INTO accelerator_faqs (accelerator_id, category, question, answer, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `, [MISK_ID, f.cat, f.q, f.a, f.so]);
}
console.log("✅ Inserted " + faqs.length + " FAQs");

// 8. Insert Partners
const partners = [
  { name: "Plug and Play Tech Center", type: "Program Partner", desc: "Global Innovation Platform. Founded 2006, HQ in Silicon Valley. 35+ locations across 5 continents. CEO: Saeed Amidi. Provides curriculum design, mentor network, investor connections, global ecosystem access.", web: "https://www.plugandplaytechcenter.com/", sy: 2021, so: 1 },
  { name: "500 Startups", type: "Former Partner", desc: "Global venture capital firm and startup accelerator. Partnered with Misk for the Misk500 Accelerator (2019-2020). Investment model: $50,000 for 7% equity via 500 Falcons fund.", web: "https://500.co/", sy: 2019, so: 2 },
  { name: "Misk Foundation", type: "Parent Organization", desc: "Mohammed bin Salman Foundation. Founded 2011 by HRH Crown Prince Mohammed bin Salman. Focus: developing youth leadership skills across technology, media, culture, and entrepreneurship.", web: "https://misk.org.sa/en/", sy: 2019, so: 3 },
];

for (const p of partners) {
  await conn.execute(`
    INSERT INTO accelerator_partners (accelerator_id, name, type, description, website, since_year, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [MISK_ID, p.name, p.type, p.desc, p.web, p.sy, p.so]);
}
console.log("✅ Inserted " + partners.length + " partners");

// 9. Insert Milestones (date column instead of year, type enum: launch/cohort/partnership/achievement/funding/expansion)
const milestones = [
  { title: "Misk500 Launch", desc: "Partnership with 500 Startups announced. First cohort of 20 startups. $50,000 investment for 7% equity model.", date: "2019-06-01", type: "launch", so: 1 },
  { title: "Dr. Badr Al-Badr Appointed CEO", desc: "Dr. Badr Al-Badr appointed as CEO of Misk Foundation in July 2019, leading the transformation of the organization.", date: "2019-07-01", type: "achievement", so: 2 },
  { title: "Misk500 Batch 1 Success", desc: "$5.5+ million raised within 6 months post-program. 50+ jobs created. Up to 400% MRR growth.", date: "2019-12-03", type: "achievement", so: 3 },
  { title: "COVID-19 Virtual Pivot", desc: "Misk500 Batch 3 completed fully virtual — first virtual cohort. 16 companies graduated. Virtual Demo Day on YouTube.", date: "2020-05-11", type: "achievement", so: 4 },
  { title: "Plug and Play Partnership", desc: "Transitioned from 500 Startups to Plug and Play Tech Center. New zero-equity model launched.", date: "2021-04-01", type: "partnership", so: 5 },
  { title: "Portfolio Exit — Jumlaty", desc: "First portfolio exit: Jumlaty (December 14, 2022). Milestone demonstrating accelerator's ability to produce successful outcomes.", date: "2022-12-14", type: "funding", so: 6 },
  { title: "Cohort 4 — Record Applications", desc: "1,120+ applications received for Cohort 4 — record number. 1.79% acceptance rate. Demo Day at Mohammed Bin Salman Nonprofit City.", date: "2023-06-14", type: "achievement", so: 7 },
  { title: "130+ Startups Milestone", desc: "Cumulative 130+ startups supported. 2,330+ jobs created. SAR 1.2+ billion collective valuation reached.", date: "2023-06-30", type: "achievement", so: 8 },
  { title: "Latest Investment — Tikna", desc: "68+ investments made via Misk Accelerator entity. Latest: Tikna (June 19, 2023).", date: "2023-06-19", type: "funding", so: 9 },
  { title: "213+ Startups & SAR 2.28B Valuation", desc: "Reached 213+ startups across 10 completed cohorts. 98% survival rate. 3,430+ jobs created. SAR 2.28 billion collective valuation.", date: "2024-12-15", type: "achievement", so: 10 },
  { title: "Cohort 11 Launch", desc: "Applications opened December 15, 2024. Program dates: February 23 - June 29, 2025. Continuing zero-equity model with Plug and Play.", date: "2025-02-23", type: "launch", so: 11 },
];

for (const m of milestones) {
  await conn.execute(`
    INSERT INTO accelerator_milestones (accelerator_id, title, description, date, type, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [MISK_ID, m.title, m.desc, m.date, m.type, m.so]);
}
console.log("✅ Inserted " + milestones.length + " milestones");

// 10. Insert Testimonials (quote column, not content)
const testimonials = [
  { name: "Dr. Badr Al-Badr", title: "CEO, Misk Foundation", company: "Misk Foundation", quote: "Misk has a vibrant ecosystem based on the vision of its Founder, where we strive to expand the horizons of youth and startup founders and to invest in their hidden potentials and develop their professional and personal skills, enabling them to lead the future of the Kingdom.", so: 1 },
  { name: "Saeed Amidi", title: "CEO & Founder, Plug and Play", company: "Plug and Play Tech Center", quote: "We are thrilled to celebrate the graduation of the fourth cohort of the Misk Accelerator program. The commitment and achievements of these startups are a testament to the incredible entrepreneurial talent in the Kingdom.", so: 2 },
  { name: "Ahmed Khairy", title: "Founder, Gameball", company: "Gameball", quote: "The experience was life-changing. The Misk Accelerator program provided us with the tools, mentorship, and connections we needed to take our startup to the next level.", so: 3 },
  { name: "Nicola Cuoco", title: "Co-founder, Kenz", company: "Kenz", quote: "The program taught me how to focus on growth more effectively. After the accelerator I feel much more confident in my ability to plan and execute, especially as a leader.", so: 4 },
  { name: "Osama Alraee", title: "Executive Manager, Misk Innovation", company: "Misk Innovation", quote: "We're delighted to continue our work with 500 Startups and supercharging the talent and potential of young people here in Saudi, and across the region.", so: 5 },
  { name: "Sharif El-Badawi", title: "Managing Partner, 500 Startups MENA", company: "500 Startups", quote: "I would like to congratulate our founders, their teams and our mentors for the smooth and seamless transition of the accelerator program to fully remote teaching. Despite the challenging times, the founders have gained valuable insights.", so: 6 },
  { name: "Ana Paula Gonzalez", title: "Director of Innovation & Partnerships", company: "500 Startups", quote: "The most rewarding part of attending as a mentor was being able to help founders who are working to solve important problems in innovative ways in their region.", so: 7 },
];

for (const t of testimonials) {
  await conn.execute(`
    INSERT INTO accelerator_testimonials (accelerator_id, quote, author_name, author_title, company_name, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [MISK_ID, t.quote, t.name, t.title, t.company, t.so]);
}
console.log("✅ Inserted " + testimonials.length + " testimonials");

// 11. Insert Stats (metric_name, metric_value, metric_label columns)
const stats = [
  { mn: "Total Startups Supported", mv: "213+", ml: "Startups", cat: "impact", so: 1 },
  { mn: "Jobs Created", mv: "3,430+", ml: "Jobs", cat: "impact", so: 2 },
  { mn: "Collective Valuation", mv: "SAR 2.28B", ml: "Valuation", cat: "impact", so: 3 },
  { mn: "Survival Rate", mv: "98%", ml: "Survival", cat: "impact", so: 4 },
  { mn: "Cohorts Completed", mv: "10", ml: "Cohorts", cat: "program", so: 5 },
  { mn: "Years Active", mv: "6", ml: "Years", cat: "program", so: 6 },
  { mn: "Equity Taken", mv: "0%", ml: "Equity", cat: "program", so: 7 },
  { mn: "Program Duration", mv: "12 weeks", ml: "Duration", cat: "program", so: 8 },
  { mn: "Avg Applications per Cohort", mv: "500-1,200", ml: "Applications", cat: "selection", so: 9 },
  { mn: "Acceptance Rate", mv: "~1.8%", ml: "Acceptance", cat: "selection", so: 10 },
  { mn: "Cohort Size", mv: "20", ml: "Per Cohort", cat: "selection", so: 11 },
  { mn: "Direct Investments", mv: "68+", ml: "Investments", cat: "investment", so: 12 },
  { mn: "Portfolio Exits", mv: "2", ml: "Exits", cat: "investment", so: 13 },
  { mn: "Batch 1 Post-Program Funding", mv: "$5.5M+", ml: "Raised", cat: "investment", so: 14 },
  { mn: "Countries Represented", mv: "10+", ml: "Countries", cat: "geographic", so: 15 },
  { mn: "Sectors Covered", mv: "20+", ml: "Sectors", cat: "geographic", so: 16 },
  { mn: "Plug and Play Locations", mv: "35+", ml: "Locations", cat: "geographic", so: 17 },
];

for (const s of stats) {
  await conn.execute(`
    INSERT INTO accelerator_stats (accelerator_id, metric_name, metric_value, metric_label, category, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [MISK_ID, s.mn, s.mv, s.ml, s.cat, s.so]);
}
console.log("✅ Inserted " + stats.length + " stats");

console.log("\n🎉 MISK Accelerator data seeding complete!");
await conn.end();
