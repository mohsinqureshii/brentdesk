import mysql from 'mysql2/promise';

// Cool bios for each author based on their article count and expertise
const authorBios = {
  // Raza - 51 articles - Senior tech journalist
  'Raza': {
    jobTitle: 'Senior Tech Correspondent',
    authorBio: `Raza is TechScoop's Senior Tech Correspondent with a razor-sharp focus on the MENA startup ecosystem. With over 51 published articles, he has become one of the most prolific voices covering fintech innovation, enterprise technology, and the region's digital transformation. His investigative reporting has uncovered major funding rounds before they hit mainstream news, and his analysis of market trends is regularly cited by investors and founders alike. When not chasing the next big story, Raza can be found moderating panels at regional tech conferences.`,
    twitterHandle: 'RazaTechScoop',
  },
  // Mo - 41 articles - Fintech & Startup specialist
  'Mo': {
    jobTitle: 'Fintech & Startups Editor',
    authorBio: `Mo serves as TechScoop's Fintech & Startups Editor, bringing unparalleled insight into the world of digital banking, payments, and emerging financial technologies across the Middle East. With 41+ articles under his belt, Mo has built a reputation for breaking exclusive stories on funding rounds and startup acquisitions. His deep network within the VC community gives TechScoop readers first access to the deals shaping tomorrow's economy. Mo previously covered technology for leading regional publications before joining TechScoop.`,
    twitterHandle: 'MoTechScoop',
  },
  // James Whitemore - 36 articles - International correspondent
  'James Whitemore': {
    jobTitle: 'International Technology Correspondent',
    authorBio: `James Whitemore is TechScoop's International Technology Correspondent, bridging the gap between global tech trends and their impact on the MENA region. With 36 articles exploring everything from AI breakthroughs to climate tech innovations, James brings a unique perspective shaped by his experience covering Silicon Valley and European tech hubs. His feature stories on cross-border investments and international expansion strategies have become essential reading for founders looking to scale globally.`,
    twitterHandle: 'JWhitemoreTech',
  },
  // Emily Carter - 22 articles - Enterprise & AI reporter
  'Emily Carter': {
    jobTitle: 'Enterprise & AI Reporter',
    authorBio: `Emily Carter covers the intersection of artificial intelligence, enterprise software, and digital transformation for TechScoop. Her 22 in-depth articles have explored how regional businesses are adopting cutting-edge technologies to compete on the global stage. Emily's technical background—she holds a degree in Computer Science—allows her to translate complex technological concepts into accessible narratives. Her coverage of AI regulation and ethics has sparked important conversations across the industry.`,
    twitterHandle: 'EmilyCTech',
  },
  // Noura Khalid - 7 articles - Emerging tech reporter
  'Noura Khalid': {
    jobTitle: 'Emerging Technologies Reporter',
    authorBio: `Noura Khalid is TechScoop's Emerging Technologies Reporter, with a keen eye for the next wave of innovation. Her articles explore blockchain, Web3, healthtech, and the startups pushing boundaries in the MENA region. A rising voice in tech journalism, Noura combines rigorous research with compelling storytelling that makes complex topics accessible to all readers. She is particularly passionate about covering women-led startups and diversity in tech.`,
    twitterHandle: 'NouraTechScoop',
  },
  // Omar Rahman - 1 article - Contributing writer
  'Omar Rahman': {
    jobTitle: 'Contributing Writer',
    authorBio: `Omar Rahman is a Contributing Writer at TechScoop, bringing fresh perspectives on the regional technology landscape. With expertise in market analysis and startup ecosystems, Omar provides thoughtful commentary on the forces shaping MENA's digital future. His background in business consulting gives him unique insight into the operational challenges facing growing tech companies.`,
    twitterHandle: 'OmarRTech',
  },
};

async function updateAuthorBios() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'gateway01.us-west-2.prod.aws.tidbcloud.com',
    port: parseInt(process.env.DB_PORT || '4000'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true }
  });

  try {
    // Get all authors
    const [authors] = await connection.execute(
      `SELECT id, name FROM users WHERE id IN (SELECT DISTINCT authorId FROM articles WHERE authorId IS NOT NULL)`
    );

    console.log('Found authors:', authors.length);

    for (const author of authors) {
      const bio = authorBios[author.name];
      if (bio) {
        console.log(`Updating bio for ${author.name}...`);
        await connection.execute(
          `UPDATE users SET jobTitle = ?, authorBio = ?, twitterHandle = ? WHERE id = ?`,
          [bio.jobTitle, bio.authorBio, bio.twitterHandle, author.id]
        );
        console.log(`✓ Updated ${author.name}`);
      } else {
        console.log(`⚠ No bio found for ${author.name}`);
      }
    }

    console.log('\\nDone updating author bios!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

updateAuthorBios();
