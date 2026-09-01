#!/usr/bin/env node
/**
 * Seed Garage accelerator with full sample data
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, like } from "drizzle-orm";

const pool = mysql.createPool(process.env.DATABASE_URL);
const db = drizzle(pool);

// Dynamically import schema
const schema = await import("../drizzle/schema.ts").catch(() => import("../drizzle/schema.js"));

const {
  accelerators,
  acceleratorCohorts,
  acceleratorAlumniCompanies,
  acceleratorTeamMembers,
  acceleratorBenefits,
  acceleratorFaqs,
  acceleratorPrograms,
  acceleratorPartners,
  acceleratorMilestones,
  acceleratorTestimonials,
  acceleratorStats,
} = schema;

// Get Garage ID
const [garage] = await db.select({ id: accelerators.id }).from(accelerators).where(like(accelerators.name, "%arage%")).limit(1);
if (!garage) { console.error("Garage not found!"); process.exit(1); }
const gid = garage.id;
console.log("Garage ID:", gid);

// Clean existing related data
await db.delete(acceleratorCohorts).where(eq(acceleratorCohorts.acceleratorId, gid));
await db.delete(acceleratorAlumniCompanies).where(eq(acceleratorAlumniCompanies.acceleratorId, gid));
await db.delete(acceleratorTeamMembers).where(eq(acceleratorTeamMembers.acceleratorId, gid));
await db.delete(acceleratorBenefits).where(eq(acceleratorBenefits.acceleratorId, gid));
await db.delete(acceleratorFaqs).where(eq(acceleratorFaqs.acceleratorId, gid));
await db.delete(acceleratorPrograms).where(eq(acceleratorPrograms.acceleratorId, gid));
await db.delete(acceleratorPartners).where(eq(acceleratorPartners.acceleratorId, gid));
await db.delete(acceleratorMilestones).where(eq(acceleratorMilestones.acceleratorId, gid));
await db.delete(acceleratorTestimonials).where(eq(acceleratorTestimonials.acceleratorId, gid));
await db.delete(acceleratorStats).where(eq(acceleratorStats.acceleratorId, gid));
console.log("Cleaned existing data");

// COHORTS
await db.insert(acceleratorCohorts).values([
  { acceleratorId: gid, cohortNumber: 11, name: "Cohort 11 — AI & Deep Tech", year: 2025, startDate: "Sep 2025", endDate: "Nov 2025", demoDayDate: "Dec 2025", cohortSize: 20, applicationsReceived: 1200, acceptanceRate: "1.7%", status: "active", theme: "AI & Deep Tech", highlights: "Record 1,200 applications; first cohort with 40% female founders", totalFundingRaised: "$18M", jobsCreated: 340, sortOrder: 0 },
  { acceleratorId: gid, cohortNumber: 10, name: "Cohort 10 — Sustainability", year: 2024, startDate: "Sep 2024", endDate: "Nov 2024", demoDayDate: "Dec 2024", cohortSize: 20, applicationsReceived: 980, acceptanceRate: "2.0%", status: "completed", theme: "Sustainability & Climate", highlights: "Highest collective valuation to date; 3 startups acquired within 6 months", totalFundingRaised: "$22M", jobsCreated: 290, sortOrder: 1 },
  { acceleratorId: gid, cohortNumber: 9, name: "Cohort 9 — FinTech & Payments", year: 2024, startDate: "Mar 2024", endDate: "May 2024", demoDayDate: "Jun 2024", cohortSize: 20, applicationsReceived: 870, acceptanceRate: "2.3%", status: "completed", theme: "FinTech & Payments", highlights: "Two startups raised Series A within 12 months of graduation", totalFundingRaised: "$15M", jobsCreated: 260, sortOrder: 2 },
  { acceleratorId: gid, cohortNumber: 8, name: "Cohort 8 — HealthTech", year: 2023, startDate: "Sep 2023", endDate: "Nov 2023", demoDayDate: "Dec 2023", cohortSize: 18, applicationsReceived: 740, acceptanceRate: "2.4%", status: "completed", theme: "HealthTech & MedTech", highlights: "First cohort with international expansion to UAE and Egypt", totalFundingRaised: "$12M", jobsCreated: 210, sortOrder: 3 },
  { acceleratorId: gid, cohortNumber: 7, name: "Cohort 7 — EdTech & Future of Work", year: 2023, startDate: "Mar 2023", endDate: "May 2023", demoDayDate: "Jun 2023", cohortSize: 18, applicationsReceived: 650, acceptanceRate: "2.8%", status: "completed", theme: "EdTech & Future of Work", highlights: "Partnership with KAUST and King Abdulaziz University", totalFundingRaised: "$9M", jobsCreated: 185, sortOrder: 4 },
  { acceleratorId: gid, cohortNumber: 6, name: "Cohort 6 — Logistics & Supply Chain", year: 2022, startDate: "Sep 2022", endDate: "Nov 2022", demoDayDate: "Dec 2022", cohortSize: 15, applicationsReceived: 520, acceptanceRate: "2.9%", status: "completed", theme: "Logistics & Supply Chain", highlights: "Three startups integrated with Saudi Aramco supply chain", totalFundingRaised: "$7M", jobsCreated: 160, sortOrder: 5 },
]);
console.log("Inserted cohorts");

// ALUMNI
await db.insert(acceleratorAlumniCompanies).values([
  { acceleratorId: gid, companyName: "Nana Direct", sector: "E-commerce", description: "On-demand grocery delivery platform serving 30+ Saudi cities", country: "Saudi Arabia", city: "Riyadh", website: "https://nana.sa", fundingRaised: "$18M", fundingStage: "Series B", employeeCount: 250, foundedYear: 2016, founderName: "Sami Al-Hokair", isActive: 1, sortOrder: 0 },
  { acceleratorId: gid, companyName: "Foodics", sector: "SaaS / F&B Tech", description: "Cloud-based POS and restaurant management system for MENA", country: "Saudi Arabia", city: "Riyadh", website: "https://foodics.com", fundingRaised: "$170M", fundingStage: "Series C", employeeCount: 800, foundedYear: 2014, founderName: "Ahmad Al-Zaini", isActive: 1, sortOrder: 1 },
  { acceleratorId: gid, companyName: "Lean Technologies", sector: "FinTech", description: "Open banking infrastructure connecting apps to financial data", country: "Saudi Arabia", city: "Riyadh", website: "https://leantech.me", fundingRaised: "$33M", fundingStage: "Series A", employeeCount: 120, foundedYear: 2019, founderName: "Hisham Al-Falih", isActive: 1, sortOrder: 2 },
  { acceleratorId: gid, companyName: "Sary", sector: "B2B Commerce", description: "B2B marketplace connecting FMCG manufacturers to retailers", country: "Saudi Arabia", city: "Riyadh", website: "https://sary.com", fundingRaised: "$75M", fundingStage: "Series B", employeeCount: 400, foundedYear: 2018, founderName: "Mohammed Al-Dossary", isActive: 1, sortOrder: 3 },
  { acceleratorId: gid, companyName: "Tamara", sector: "FinTech / BNPL", description: "Buy-now-pay-later platform for MENA consumers", country: "Saudi Arabia", city: "Riyadh", website: "https://tamara.co", fundingRaised: "$366M", fundingStage: "Series C", employeeCount: 600, foundedYear: 2020, founderName: "Turki Bin Zarah", isActive: 1, sortOrder: 4 },
  { acceleratorId: gid, companyName: "Cura", sector: "HealthTech", description: "Telemedicine platform connecting patients with doctors 24/7", country: "Saudi Arabia", city: "Riyadh", website: "https://cura.sa", fundingRaised: "$12M", fundingStage: "Series A", employeeCount: 180, foundedYear: 2019, founderName: "Dr. Amr Yamani", isActive: 1, sortOrder: 5 },
  { acceleratorId: gid, companyName: "Trukker", sector: "Logistics", description: "Digital freight marketplace for trucking in MENA", country: "UAE", city: "Dubai", website: "https://trukker.com", fundingRaised: "$23M", fundingStage: "Series A", employeeCount: 200, foundedYear: 2017, founderName: "Gaurav Biswas", isActive: 1, sortOrder: 6 },
  { acceleratorId: gid, companyName: "Rewaa", sector: "SaaS / Retail", description: "Inventory and retail management platform for SMEs", country: "Saudi Arabia", city: "Riyadh", website: "https://rewaatech.com", fundingRaised: "$36M", fundingStage: "Series B", employeeCount: 300, foundedYear: 2019, founderName: "Abdulaziz Al-Subaie", isActive: 1, sortOrder: 7 },
  { acceleratorId: gid, companyName: "Hala", sector: "FinTech", description: "Digital wallet and payment solutions for Saudi consumers", country: "Saudi Arabia", city: "Riyadh", website: "https://hala.com", fundingRaised: "$8M", fundingStage: "Seed", employeeCount: 80, foundedYear: 2020, founderName: "Rayan Al-Harbi", isActive: 1, sortOrder: 8 },
  { acceleratorId: gid, companyName: "Birdnest", sector: "PropTech", description: "Flexible furnished apartment rentals for professionals", country: "Saudi Arabia", city: "Riyadh", website: "https://birdnest.sa", fundingRaised: "$5M", fundingStage: "Seed", employeeCount: 45, foundedYear: 2021, founderName: "Faisal Al-Rasheed", isActive: 1, sortOrder: 9 },
  { acceleratorId: gid, companyName: "Unifonic", sector: "CPaaS", description: "Cloud communications platform for businesses in MENA", country: "Saudi Arabia", city: "Riyadh", website: "https://unifonic.com", fundingRaised: "$25M", fundingStage: "Series A", employeeCount: 350, foundedYear: 2014, founderName: "Ahmed Hamdan", isActive: 1, sortOrder: 10 },
  { acceleratorId: gid, companyName: "Mrsool", sector: "On-demand Delivery", description: "Peer-to-peer delivery platform operating across Saudi Arabia", country: "Saudi Arabia", city: "Riyadh", website: "https://mrsool.co", fundingRaised: "$50M", fundingStage: "Series B", employeeCount: 500, foundedYear: 2015, founderName: "Nasser Al-Motairi", isActive: 1, sortOrder: 11 },
]);
console.log("Inserted alumni");

// TEAM MEMBERS
await db.insert(acceleratorTeamMembers).values([
  { acceleratorId: gid, name: "Eng. Faisal Al-Khamis", title: "Executive Director", bio: "Faisal leads Garage strategic vision and operations. Former VP at STC Ventures with 15 years in venture capital and startup ecosystem development across MENA.", linkedIn: "https://linkedin.com/in/faisal-alkhamis", roleType: "leadership", sortOrder: 0 },
  { acceleratorId: gid, name: "Dr. Reem Al-Zahrani", title: "Head of Programs", bio: "Reem oversees all accelerator programs and curriculum design. PhD in Innovation Management from KAUST. Previously built accelerator programs at MIT Enterprise Forum Arab Startup Competition.", linkedIn: "https://linkedin.com/in/reem-alzahrani", roleType: "leadership", sortOrder: 1 },
  { acceleratorId: gid, name: "Omar Al-Ghamdi", title: "Investment Director", bio: "Omar manages Garage investment portfolio and LP relationships. Former investment manager at Saudi Aramco Entrepreneurship Center (Waed).", linkedIn: "https://linkedin.com/in/omar-alghamdi", roleType: "leadership", sortOrder: 2 },
  { acceleratorId: gid, name: "Sara Al-Mutairi", title: "Head of Community & Alumni", bio: "Sara runs the Garage alumni network and community programs. Previously co-founded a startup that was acquired by a regional e-commerce player.", linkedIn: "https://linkedin.com/in/sara-almutairi", roleType: "operations", sortOrder: 3 },
  { acceleratorId: gid, name: "Khalid Bin Nasser", title: "Mentor-in-Residence", bio: "Serial entrepreneur with 3 successful exits. Mentor specializing in growth strategy, fundraising, and product-market fit for B2B SaaS companies.", linkedIn: "https://linkedin.com/in/khalid-binnasser", roleType: "mentor", sortOrder: 4 },
  { acceleratorId: gid, name: "Nora Al-Rasheed", title: "Mentor-in-Residence", bio: "Former CMO at Careem. Expert in brand building, growth marketing, and scaling consumer products in emerging markets.", linkedIn: "https://linkedin.com/in/nora-alrasheed", roleType: "mentor", sortOrder: 5 },
  { acceleratorId: gid, name: "Ahmed Al-Jabri", title: "Technical Advisor", bio: "CTO at a publicly listed Saudi tech company. Advises Garage startups on engineering architecture, technical hiring, and product development.", linkedIn: "https://linkedin.com/in/ahmed-aljabri", roleType: "advisor", sortOrder: 6 },
  { acceleratorId: gid, name: "Dr. Hana Al-Otaibi", title: "Advisor — HealthTech", bio: "Physician-entrepreneur and health innovation expert. Founder of two HealthTech startups. Advises on regulatory pathways and clinical validation.", linkedIn: "https://linkedin.com/in/hana-alotaibi", roleType: "advisor", sortOrder: 7 },
]);
console.log("Inserted team members");

// BENEFITS
await db.insert(acceleratorBenefits).values([
  { acceleratorId: gid, category: "Funding", title: "Non-dilutive Grant", description: "Each accepted startup receives a SAR 200,000 non-dilutive grant to cover operational costs during the program — no equity taken.", icon: "dollar-sign", value: "SAR 200K", sortOrder: 0 },
  { acceleratorId: gid, category: "Funding", title: "Investor Access", description: "Direct introductions to 50+ active MENA investors including STV, Sanabil, Impact46, and international VCs with MENA mandates.", icon: "trending-up", value: "50+ Investors", sortOrder: 1 },
  { acceleratorId: gid, category: "Workspace", title: "Premium Co-working Space", description: "Dedicated desks and private meeting rooms at Garages 5,000 sqm facility in Riyadhs tech hub, available 24/7 for the program duration.", icon: "building", value: "5,000 sqm", sortOrder: 2 },
  { acceleratorId: gid, category: "Mentorship", title: "Expert Mentor Network", description: "Access to 100+ mentors including successful founders, C-suite executives, and domain experts across FinTech, HealthTech, logistics, and more.", icon: "users", value: "100+ Mentors", sortOrder: 3 },
  { acceleratorId: gid, category: "Cloud & Tools", title: "AWS Activate Credits", description: "Up to $100,000 in AWS cloud credits plus technical support from AWS solutions architects.", icon: "cloud", value: "$100K Credits", sortOrder: 4 },
  { acceleratorId: gid, category: "Cloud & Tools", title: "Google for Startups", description: "Google Cloud credits, Workspace licenses, and access to Googles startup support programs.", icon: "cloud", value: "$50K Credits", sortOrder: 5 },
  { acceleratorId: gid, category: "Legal & Finance", title: "Legal Support", description: "Free legal consultation on company formation, IP protection, and investment term sheet review from top-tier Saudi law firms.", icon: "shield", value: "Free", sortOrder: 6 },
  { acceleratorId: gid, category: "Legal & Finance", title: "Accounting & CFO Services", description: "Monthly bookkeeping, financial modeling workshops, and CFO advisory sessions to prepare for due diligence.", icon: "bar-chart", value: "Free", sortOrder: 7 },
  { acceleratorId: gid, category: "Network", title: "Government Connections", description: "Introductions to key government entities including MCIT, SDAIA, NCA, and Vision 2030 program offices.", icon: "globe", value: "Direct Access", sortOrder: 8 },
  { acceleratorId: gid, category: "Network", title: "Corporate Partnerships", description: "Pilot opportunities and procurement fast-tracks with Garages 30+ corporate partners including Saudi Aramco, STC, and SABIC.", icon: "handshake", value: "30+ Corporates", sortOrder: 9 },
  { acceleratorId: gid, category: "Demo Day", title: "Flagship Demo Day", description: "Present your startup to 500+ investors, media, and ecosystem leaders at Garages annual Demo Day.", icon: "star", value: "500+ Attendees", sortOrder: 10 },
  { acceleratorId: gid, category: "Alumni", title: "Lifetime Alumni Network", description: "Join a network of 213+ Garage alumni companies with exclusive access to alumni events, deal flow sharing, and peer support.", icon: "users", value: "213+ Alumni", sortOrder: 11 },
]);
console.log("Inserted benefits");

// FAQs
await db.insert(acceleratorFaqs).values([
  { acceleratorId: gid, question: "Who can apply to Garage?", answer: "Garage is open to early-stage tech startups at the pre-seed or seed stage. You should have a working prototype or MVP and at least one full-time co-founder. We welcome applications from Saudi nationals and residents, as well as international founders willing to relocate to Riyadh for the 12-week program.", category: "Eligibility", sortOrder: 0 },
  { acceleratorId: gid, question: "Does Garage take equity?", answer: "No. Garage operates on a zero-equity model. We provide SAR 200,000 in non-dilutive grant funding with no equity, no convertible notes, and no strings attached. We believe founders should retain full ownership of their companies.", category: "Funding", sortOrder: 1 },
  { acceleratorId: gid, question: "How long is the program?", answer: "The Garage accelerator program runs for 12 weeks (3 months). The program is intensive and in-person, based in Riyadh. We run two cohorts per year — one starting in March and one starting in September.", category: "Program", sortOrder: 2 },
  { acceleratorId: gid, question: "What stage should my startup be at?", answer: "We look for startups that have validated their idea with real users and have a working product. You do not need to be generating revenue, but you should have evidence of product-market fit or strong early traction. We do not accept idea-stage companies.", category: "Eligibility", sortOrder: 3 },
  { acceleratorId: gid, question: "How competitive is the application process?", answer: "We receive 800-1,200 applications per cohort and accept 18-20 startups, making our acceptance rate approximately 1.7-2.5%. We evaluate teams on the strength of the founding team, market opportunity, product differentiation, and traction.", category: "Application", sortOrder: 4 },
  { acceleratorId: gid, question: "What does the selection process look like?", answer: "Step 1: Online application (2 weeks). Step 2: Shortlisted teams (top 100) are invited for a 30-minute video interview. Step 3: Top 40 teams attend an in-person pitch day in Riyadh. Step 4: Final 20 teams are selected and notified within 1 week.", category: "Application", sortOrder: 5 },
  { acceleratorId: gid, question: "Can international startups apply?", answer: "Yes. We welcome international founders, but accepted startups must be willing to relocate to Riyadh for the 12-week program. We assist with visa processing and temporary housing arrangements for international teams.", category: "Eligibility", sortOrder: 6 },
  { acceleratorId: gid, question: "What happens after the program?", answer: "Graduates join the Garage Alumni Network and gain lifetime access to alumni events, investor introductions, and the Garage community. Many alumni go on to raise follow-on funding within 12 months of graduation.", category: "Post-Program", sortOrder: 7 },
  { acceleratorId: gid, question: "Is the program fully in-person?", answer: "Yes, the core program is in-person in Riyadh. We believe that the most valuable parts of an accelerator happen in person. Remote participation is not available.", category: "Program", sortOrder: 8 },
  { acceleratorId: gid, question: "How do I apply?", answer: "Submit your application at garage.sa/apply. The application takes approximately 45 minutes to complete and includes questions about your team, product, market, and traction. We recommend applying early as we review applications on a rolling basis.", category: "Application", sortOrder: 9 },
]);
console.log("Inserted FAQs");

// PROGRAMS
await db.insert(acceleratorPrograms).values([
  { acceleratorId: gid, name: "Garage Accelerator — Main Program", description: "Our flagship 12-week intensive accelerator program for pre-seed and seed-stage tech startups. The program covers product development, go-to-market strategy, fundraising, and scaling operations. Each week features workshops, one-on-one mentor sessions, and peer accountability groups.", duration: "12 weeks", format: "in-person", equityTaken: "0%", fundingProvided: "SAR 200,000", nextDeadline: "June 30, 2026", nextStartDate: "September 2026", status: "open", eligibility: "Pre-seed or seed stage tech startup; working MVP; at least 2 co-founders; willing to relocate to Riyadh", applicationUrl: "https://garage.sa/apply", sortOrder: 0 },
  { acceleratorId: gid, name: "Garage Growth — Scale Program", description: "A 6-month post-accelerator program for Garage alumni who have raised their first institutional round and are ready to scale. Focuses on international expansion, enterprise sales, and Series A readiness.", duration: "6 months", format: "hybrid", equityTaken: "0%", fundingProvided: "Advisory Only", nextDeadline: "Rolling Admissions", nextStartDate: "Ongoing", status: "open", eligibility: "Garage alumni companies that have raised $500K+ post-graduation", applicationUrl: "https://garage.sa/growth", sortOrder: 1 },
  { acceleratorId: gid, name: "Garage Corporate Innovation", description: "A bespoke 8-week program connecting Garage alumni startups with corporate partners for pilot projects and procurement opportunities. Corporates pay a program fee; startups participate free of charge.", duration: "8 weeks", format: "hybrid", equityTaken: "0%", fundingProvided: "Pilot Contracts", nextDeadline: "Rolling", nextStartDate: "Quarterly", status: "open", eligibility: "Garage alumni companies with a product ready for enterprise deployment", applicationUrl: "https://garage.sa/corporate", sortOrder: 2 },
]);
console.log("Inserted programs");

// PARTNERS
await db.insert(acceleratorPartners).values([
  { acceleratorId: gid, name: "SAFCSP", type: "Government", description: "Saudi Federation for Cybersecurity, Programming, and Drones — founding body and primary government sponsor of Garage.", website: "https://safcsp.org.sa", sinceYear: 2014, sortOrder: 0 },
  { acceleratorId: gid, name: "MCIT", type: "Government", description: "Ministry of Communications and Information Technology — strategic partner supporting Garages Vision 2030 alignment.", website: "https://mcit.gov.sa", sinceYear: 2018, sortOrder: 1 },
  { acceleratorId: gid, name: "Saudi Aramco", type: "Corporate", description: "Energy giant and corporate partner providing pilot opportunities and procurement fast-tracks for Garage startups in the energy sector.", website: "https://aramco.com", sinceYear: 2019, sortOrder: 2 },
  { acceleratorId: gid, name: "STC", type: "Corporate", description: "Saudi Telecom Company — technology and connectivity partner providing infrastructure support and corporate pilot opportunities.", website: "https://stc.com.sa", sinceYear: 2017, sortOrder: 3 },
  { acceleratorId: gid, name: "AWS", type: "Technology", description: "Amazon Web Services — cloud infrastructure partner providing up to $100,000 in credits and technical support for each cohort.", website: "https://aws.amazon.com", sinceYear: 2016, sortOrder: 4 },
  { acceleratorId: gid, name: "Google for Startups", type: "Technology", description: "Googles startup support program providing cloud credits, Workspace licenses, and access to Googles global network.", website: "https://startup.google.com", sinceYear: 2018, sortOrder: 5 },
  { acceleratorId: gid, name: "STV", type: "Investor", description: "Saudi Technology Ventures — the regions largest technology-focused VC and a key investor in Garage alumni companies.", website: "https://stv.vc", sinceYear: 2019, sortOrder: 6 },
  { acceleratorId: gid, name: "Sanabil Investments", type: "Investor", description: "PIF subsidiary and one of MENAs most active growth-stage investors, with a dedicated allocation for Garage alumni.", website: "https://sanabilinvestments.com", sinceYear: 2020, sortOrder: 7 },
  { acceleratorId: gid, name: "KAUST", type: "Academic", description: "King Abdullah University of Science and Technology — research and talent partner providing access to deep tech expertise and PhD researchers.", website: "https://kaust.edu.sa", sinceYear: 2021, sortOrder: 8 },
  { acceleratorId: gid, name: "Impact46", type: "Investor", description: "Saudi-based multi-stage VC with a strong track record of investing in Garage alumni at seed and Series A.", website: "https://impact46.com", sinceYear: 2020, sortOrder: 9 },
]);
console.log("Inserted partners");

// MILESTONES
await db.insert(acceleratorMilestones).values([
  { acceleratorId: gid, title: "Garage Founded", description: "Garage launched by SAFCSP as Saudi Arabias first government-backed tech accelerator, accepting its inaugural cohort of 10 startups.", date: "2014", type: "launch", sortOrder: 0 },
  { acceleratorId: gid, title: "Zero-Equity Model Introduced", description: "Garage became one of the first accelerators in MENA to adopt a fully zero-equity, non-dilutive funding model.", date: "2016", type: "achievement", sortOrder: 1 },
  { acceleratorId: gid, title: "AWS Partnership Signed", description: "Strategic partnership with Amazon Web Services established, providing cloud credits and technical support to all Garage cohorts.", date: "2016", type: "partnership", sortOrder: 2 },
  { acceleratorId: gid, title: "50th Startup Funded", description: "Garage celebrated funding its 50th startup, marking a major milestone in building Saudi Arabias startup ecosystem.", date: "2018", type: "achievement", sortOrder: 3 },
  { acceleratorId: gid, title: "Foodics Raises $170M Series C", description: "Garage alumni Foodics closed a landmark $170M Series C round, becoming one of Saudi Arabias most valuable tech startups.", date: "2022", type: "funding", sortOrder: 4 },
  { acceleratorId: gid, title: "Tamara Reaches $1B Valuation", description: "Garage alumni Tamara became Saudi Arabias first BNPL unicorn, reaching a $1 billion valuation and raising $366M in total funding.", date: "2023", type: "achievement", sortOrder: 5 },
  { acceleratorId: gid, title: "200+ Startups Funded", description: "Garage surpassed 200 funded startups across 10 cohorts, cementing its position as the most prolific accelerator in Saudi Arabia.", date: "2024", type: "achievement", sortOrder: 6 },
  { acceleratorId: gid, title: "Cohort 11 — Record Applications", description: "Cohort 11 received a record 1,200 applications — the highest in Garages history.", date: "2025", type: "cohort", sortOrder: 7 },
  { acceleratorId: gid, title: "International Expansion Program", description: "Garage launched its first international expansion track, helping Saudi startups establish footholds in UAE, Egypt, and the UK.", date: "2025", type: "expansion", sortOrder: 8 },
]);
console.log("Inserted milestones");

// TESTIMONIALS
await db.insert(acceleratorTestimonials).values([
  { acceleratorId: gid, quote: "Garage did not just give us funding — they gave us the network, the mentors, and the credibility to raise our Series A. The zero-equity model showed us they genuinely believed in founders. Three years later, we have raised $170M and serve 30,000 restaurants across MENA.", authorName: "Ahmad Al-Zaini", authorTitle: "CEO & Co-founder", companyName: "Foodics", cohortNumber: 3, sortOrder: 0 },
  { acceleratorId: gid, quote: "The 12 weeks at Garage were the most intense and transformative period of our startup journey. The mentors pushed us to question every assumption. We came in with a product; we left with a business.", authorName: "Turki Bin Zarah", authorTitle: "CEO & Co-founder", companyName: "Tamara", cohortNumber: 6, sortOrder: 1 },
  { acceleratorId: gid, quote: "What sets Garage apart is the quality of the mentor network. We had direct access to founders who had built and scaled companies in Saudi Arabia — not generic startup advice, but real, contextual guidance for the MENA market.", authorName: "Hisham Al-Falih", authorTitle: "CEO & Co-founder", companyName: "Lean Technologies", cohortNumber: 7, sortOrder: 2 },
  { acceleratorId: gid, quote: "The corporate connections Garage provided were invaluable. Within 6 months of graduating, we had signed pilot agreements with two Fortune 500 companies operating in Saudi Arabia. That would have taken us years to achieve on our own.", authorName: "Mohammed Al-Dossary", authorTitle: "CEO & Co-founder", companyName: "Sary", cohortNumber: 5, sortOrder: 3 },
  { acceleratorId: gid, quote: "As a female founder in Saudi Arabia, I was initially nervous about applying. Garages inclusive culture and the diversity of the cohort completely changed my perspective. The program gave me the confidence and tools to build a company I am proud of.", authorName: "Nora Al-Harbi", authorTitle: "CEO & Co-founder", companyName: "Cura Health", cohortNumber: 9, sortOrder: 4 },
]);
console.log("Inserted testimonials");

// STATS
await db.insert(acceleratorStats).values([
  { acceleratorId: gid, metricName: "total_startups", metricValue: "213+", metricLabel: "Startups Funded", icon: "rocket", category: "impact", sortOrder: 0 },
  { acceleratorId: gid, metricName: "survival_rate", metricValue: "98%", metricLabel: "Survival Rate", icon: "shield", category: "impact", sortOrder: 1 },
  { acceleratorId: gid, metricName: "jobs_created", metricValue: "3,430+", metricLabel: "Jobs Created", icon: "users", category: "impact", sortOrder: 2 },
  { acceleratorId: gid, metricName: "collective_valuation", metricValue: "$608M+", metricLabel: "Collective Valuation", icon: "trending-up", category: "impact", sortOrder: 3 },
  { acceleratorId: gid, metricName: "total_funding_raised", metricValue: "$608M", metricLabel: "Total Raised by Alumni", icon: "dollar-sign", category: "funding", sortOrder: 4 },
  { acceleratorId: gid, metricName: "avg_followon", metricValue: "$2.8M", metricLabel: "Avg. Follow-on Funding", icon: "bar-chart", category: "funding", sortOrder: 5 },
  { acceleratorId: gid, metricName: "acceptance_rate", metricValue: "1.7%", metricLabel: "Acceptance Rate", icon: "filter", category: "program", sortOrder: 6 },
  { acceleratorId: gid, metricName: "cohort_size", metricValue: "20", metricLabel: "Startups per Cohort", icon: "grid", category: "program", sortOrder: 7 },
  { acceleratorId: gid, metricName: "program_duration", metricValue: "12 weeks", metricLabel: "Program Duration", icon: "clock", category: "program", sortOrder: 8 },
  { acceleratorId: gid, metricName: "mentor_network", metricValue: "100+", metricLabel: "Active Mentors", icon: "star", category: "network", sortOrder: 9 },
  { acceleratorId: gid, metricName: "investor_network", metricValue: "50+", metricLabel: "Investor Partners", icon: "briefcase", category: "network", sortOrder: 10 },
  { acceleratorId: gid, metricName: "corporate_partners", metricValue: "30+", metricLabel: "Corporate Partners", icon: "building", category: "network", sortOrder: 11 },
]);
console.log("Inserted stats");

console.log("Done! Garage fully populated.");
await pool.end();
