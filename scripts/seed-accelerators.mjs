import { db } from '../server/db.ts';
import { accelerators } from '../drizzle/schema.ts';
import { slugify } from '../server/utils/slug.ts';

const acceleratorsData = [
  {
    name: 'Misk Accelerator',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    type: 'Gov',
    sector: 'Tech',
    stage: 'Early',
    funding: 'Grant',
    equity: 0,
    duration: '12w',
    cohorts: 2,
    backedBy: 'Misk Foundation',
    description: 'Misk Accelerator is a Saudi government-backed accelerator focused on tech innovation and entrepreneurship.',
    shortDescription: 'Saudi Arabia\'s leading tech accelerator backed by Misk Foundation',
    website: 'https://www.misk.org.sa',
    email: 'accelerator@misk.org.sa',
    contactPhone: '+966-11-XXXX-XXXX',
    location: 'Riyadh, Saudi Arabia',
    benefits: 'Mentorship, funding, networking, office space',
    requirements: 'Early-stage tech startups',
    applicationUrl: 'https://www.misk.org.sa/apply',
    status: 'active',
    isFeatured: 1,
    programLength: '12 weeks',
    cohortSize: '20-30',
    investmentRange: 'Grant-based',
    equityTaken: '0%',
    successRate: '85%',
    totalFunded: 50000000,
    totalRaisedByAlumni: '$500M+',
    avgFollowon: '$2M+',
    nextCohortDate: '2026-06-01',
    mission: 'To foster innovation and entrepreneurship in Saudi Arabia',
    programDetails: {
      duration: '12 weeks',
      cohorts: 2,
      mentors: 50,
      alumni: 200,
      successRate: '85%'
    },
    teamMembers: [
      { name: 'Ahmed Al-Khateeb', role: 'Program Director', bio: 'Tech entrepreneur with 15+ years experience' },
      { name: 'Fatima Al-Dosari', role: 'Mentor Lead', bio: 'Former founder and investor' }
    ],
    partners: [
      { name: 'Saudi PIF', type: 'Government' },
      { name: 'STC', type: 'Corporate' }
    ],
    notableAlumni: [
      { name: 'Startup A', founded: 2020, status: 'Series B' },
      { name: 'Startup B', founded: 2021, status: 'Series A' }
    ],
    socialLinks: {
      twitter: 'https://twitter.com/miskaccel',
      linkedin: 'https://linkedin.com/company/misk',
      instagram: 'https://instagram.com/miskaccel'
    },
    gallery: [
      { url: 'https://example.com/image1.jpg', caption: 'Cohort 1' },
      { url: 'https://example.com/image2.jpg', caption: 'Demo Day' }
    ]
  },
  {
    name: 'Flat6Labs Riyadh',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    type: 'VC',
    sector: 'General',
    stage: 'Early',
    funding: '50K',
    equity: 10,
    duration: '4m',
    cohorts: 2,
    backedBy: 'Flat6Labs',
    description: 'Flat6Labs is a leading regional accelerator with presence across MENA.',
    shortDescription: 'Regional accelerator with MENA-wide network',
    website: 'https://www.flat6labs.com',
    email: 'riyadh@flat6labs.com',
    contactPhone: '+966-11-XXXX-XXXX',
    location: 'Riyadh, Saudi Arabia',
    benefits: 'Seed funding, mentorship, investor network',
    requirements: 'Early-stage startups',
    applicationUrl: 'https://www.flat6labs.com/apply',
    status: 'active',
    isFeatured: 1,
    programLength: '4 months',
    cohortSize: '15-20',
    investmentRange: '$50K',
    equityTaken: '10%',
    successRate: '80%',
    totalFunded: 30000000,
    totalRaisedByAlumni: '$300M+',
    avgFollowon: '$1.5M+',
    nextCohortDate: '2026-05-01',
    mission: 'To build the next generation of MENA entrepreneurs',
    programDetails: {
      duration: '4 months',
      cohorts: 2,
      mentors: 40,
      alumni: 300,
      successRate: '80%'
    },
    teamMembers: [
      { name: 'Hany Fam', role: 'Founder', bio: 'Serial entrepreneur' }
    ],
    partners: [
      { name: 'Flat6Labs Network', type: 'Accelerator Network' }
    ],
    notableAlumni: [
      { name: 'Noon', founded: 2017, status: 'Unicorn' }
    ],
    socialLinks: {
      twitter: 'https://twitter.com/flat6labs',
      linkedin: 'https://linkedin.com/company/flat6labs'
    },
    gallery: []
  },
  {
    name: 'TAQADAM',
    country: 'Saudi Arabia',
    city: 'KAUST',
    type: 'Gov',
    sector: 'DeepTech',
    stage: 'Idea',
    funding: 'Grant',
    equity: 0,
    duration: '6m',
    cohorts: 2,
    backedBy: 'KAUST',
    description: 'TAQADAM is KAUST\'s innovation and entrepreneurship accelerator for deep tech.',
    shortDescription: 'Deep tech accelerator at KAUST',
    website: 'https://www.kaust.edu.sa/taqadam',
    email: 'taqadam@kaust.edu.sa',
    contactPhone: '+966-12-XXXX-XXXX',
    location: 'KAUST, Saudi Arabia',
    benefits: 'Funding, lab access, mentorship',
    requirements: 'Deep tech startups',
    applicationUrl: 'https://www.kaust.edu.sa/taqadam/apply',
    status: 'active',
    isFeatured: 0,
    programLength: '6 months',
    cohortSize: '10-15',
    investmentRange: 'Grant-based',
    equityTaken: '0%',
    successRate: '75%',
    totalFunded: 20000000,
    totalRaisedByAlumni: '$150M+',
    avgFollowon: '$1M+',
    nextCohortDate: '2026-09-01',
    mission: 'To accelerate deep tech innovation from KAUST',
    programDetails: {
      duration: '6 months',
      cohorts: 2,
      mentors: 30,
      alumni: 100,
      successRate: '75%'
    },
    teamMembers: [],
    partners: [],
    notableAlumni: [],
    socialLinks: {},
    gallery: []
  },
  {
    name: 'InspireU',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    type: 'Corporate',
    sector: 'Tech',
    stage: 'Early',
    funding: '40K',
    equity: 2.5,
    duration: '3m',
    cohorts: 2,
    backedBy: 'STC',
    description: 'InspireU is STC\'s corporate accelerator for tech startups.',
    shortDescription: 'STC\'s corporate accelerator program',
    website: 'https://www.stc.com.sa/inspireu',
    email: 'inspireu@stc.com.sa',
    contactPhone: '+966-11-XXXX-XXXX',
    location: 'Riyadh, Saudi Arabia',
    benefits: 'Funding, mentorship, STC partnership',
    requirements: 'Tech startups',
    applicationUrl: 'https://www.stc.com.sa/inspireu/apply',
    status: 'active',
    isFeatured: 0,
    programLength: '3 months',
    cohortSize: '12-18',
    investmentRange: '$40K',
    equityTaken: '2.5%',
    successRate: '82%',
    totalFunded: 25000000,
    totalRaisedByAlumni: '$200M+',
    avgFollowon: '$1.2M+',
    nextCohortDate: '2026-04-01',
    mission: 'To foster tech innovation through corporate partnership',
    programDetails: {
      duration: '3 months',
      cohorts: 2,
      mentors: 25,
      alumni: 150,
      successRate: '82%'
    },
    teamMembers: [],
    partners: [],
    notableAlumni: [],
    socialLinks: {},
    gallery: []
  },
  {
    name: '500 Global',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    type: 'VC',
    sector: 'Tech',
    stage: 'Early',
    funding: '100K+',
    equity: 10,
    duration: '12w',
    cohorts: 1,
    backedBy: 'Sanabil Investments',
    description: '500 Global is a global venture capital and accelerator network.',
    shortDescription: 'Global VC with dedicated MENA fund',
    website: 'https://www.500.co',
    email: 'riyadh@500.co',
    contactPhone: '+966-11-XXXX-XXXX',
    location: 'Riyadh, Saudi Arabia',
    benefits: 'Seed funding, global network, mentorship',
    requirements: 'Early-stage tech startups',
    applicationUrl: 'https://www.500.co/apply',
    status: 'active',
    isFeatured: 1,
    programLength: '12 weeks',
    cohortSize: '20-25',
    investmentRange: '$100K+',
    equityTaken: '10%',
    successRate: '88%',
    totalFunded: 100000000,
    totalRaisedByAlumni: '$1B+',
    avgFollowon: '$5M+',
    nextCohortDate: '2026-03-01',
    mission: 'To support the most promising early-stage startups globally',
    programDetails: {
      duration: '12 weeks',
      cohorts: 1,
      mentors: 60,
      alumni: 400,
      successRate: '88%'
    },
    teamMembers: [],
    partners: [],
    notableAlumni: [],
    socialLinks: {},
    gallery: []
  }
];

async function seedAccelerators() {
  try {
    console.log('Starting accelerators seed...');
    
    for (const data of acceleratorsData) {
      const slug = slugify(data.name);
      
      await db.insert(accelerators).values({
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        website: data.website,
        email: data.email,
        contactPhone: data.contactPhone,
        location: data.location,
        benefits: data.benefits,
        requirements: data.requirements,
        applicationUrl: data.applicationUrl,
        status: data.status,
        isFeatured: data.isFeatured,
        programLength: data.programLength,
        cohortSize: data.cohortSize,
        investmentRange: data.investmentRange,
        equityTaken: data.equityTaken,
        successRate: data.successRate,
        totalFunded: data.totalFunded,
        totalRaisedByAlumni: data.totalRaisedByAlumni,
        avgFollowon: data.avgFollowon,
        nextCohortDate: data.nextCohortDate,
        mission: data.mission,
        programDetails: data.programDetails,
        teamMembers: data.teamMembers,
        partners: data.partners,
        notableAlumni: data.notableAlumni,
        socialLinks: data.socialLinks,
        gallery: data.gallery
      });
      
      console.log(`✓ Added ${data.name}`);
    }
    
    console.log('✓ Accelerators seed completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding accelerators:', error);
    process.exit(1);
  }
}

seedAccelerators();
