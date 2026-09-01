import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // First, add new investors that don't exist yet
  const newInvestors = [
    { name: 'Nuwa Capital', type: 'vc' },
    { name: 'Venture Souq', type: 'vc' },
    { name: 'Impact46', type: 'vc' },
    { name: 'Flat6Labs', type: 'vc' },
    { name: 'Nama Ventures', type: 'vc' },
    { name: 'Khwarizmi Ventures', type: 'vc' },
    { name: 'Middle East Venture Partners (MEVP)', type: 'vc' },
    { name: 'Iliad Partners', type: 'vc' },
    { name: 'Chimera Capital', type: 'vc' },
    { name: 'B&Y Venture Partners', type: 'vc' },
    { name: 'Pinnacle Capital', type: 'vc' },
    { name: 'Hambro Perks', type: 'vc' },
    { name: 'Tencent', type: 'corporate_vc' },
    { name: 'Tiger Global', type: 'vc' },
    { name: 'Sequoia Capital', type: 'vc' },
    { name: 'SoftBank Vision Fund', type: 'corporate_vc' },
    { name: 'Disruptive AI', type: 'vc' },
    { name: 'VentureSouq', type: 'vc' },
    { name: 'Arzan Venture Capital', type: 'vc' },
    { name: 'Wa\'ed Ventures', type: 'corporate_vc' },
    { name: 'Sanabil Investments', type: 'corporate_vc' },
  ];

  // Insert new investors
  for (const inv of newInvestors) {
    try {
      const [existing] = await conn.query('SELECT id FROM investors WHERE name = ?', [inv.name]);
      if (existing.length === 0) {
        await conn.query(
          'INSERT INTO investors (name, type, statusId, createdAt, updatedAt) VALUES (?, ?, 6, NOW(), NOW())',
          [inv.name, inv.type]
        );
        console.log(`Added investor: ${inv.name}`);
      } else {
        console.log(`Investor exists: ${inv.name} (id: ${existing[0].id})`);
      }
    } catch (e) {
      console.error(`Error adding ${inv.name}:`, e.message);
    }
  }

  // Get all investors for mapping
  const [allInvestors] = await conn.query('SELECT id, name FROM investors');
  const investorMap = {};
  allInvestors.forEach(i => { investorMap[i.name.toLowerCase()] = i.id; });

  // Define investor associations for each funding round
  // Format: { roundId, investors: [{ name, role }] }
  const associations = [
    // QuicKart $1.5M Seed
    { roundId: 240018, investors: [
      { name: 'Flat6Labs', role: 'lead' },
      { name: '500 Global MENA', role: 'participant' },
    ]},
    // SiFi $20M Series A
    { roundId: 240007, investors: [
      { name: 'STV', role: 'lead' },
      { name: 'Nuwa Capital', role: 'participant' },
    ]},
    // CADO $4.5M Pre-Seed
    { roundId: 240013, investors: [
      { name: 'BECO Capital', role: 'lead' },
      { name: 'Shorooq Partners', role: 'participant' },
    ]},
    // Smart Bricks $5M Pre-Seed
    { roundId: 240012, investors: [
      { name: 'Impact46', role: 'lead' },
      { name: 'Wa\'ed Ventures', role: 'participant' },
    ]},
    // Safqah Capital $15.2M Seed
    { roundId: 240004, investors: [
      { name: 'STV', role: 'lead' },
      { name: 'Global Ventures', role: 'participant' },
      { name: 'Sanabil Investments', role: 'participant' },
    ]},
    // Ziina $22M Series A
    { roundId: 240006, investors: [
      { name: 'Sequoia Capital', role: 'lead' },
      { name: 'Global Ventures', role: 'participant' },
      { name: 'Shorooq Partners', role: 'participant' },
    ]},
    // Omnispay $2M Pre-Seed
    { roundId: 240005, investors: [
      { name: 'Arzan Venture Capital', role: 'lead' },
      { name: 'Nama Ventures', role: 'participant' },
    ]},
    // InvestSky $4M Seed
    { roundId: 240002, investors: [
      { name: 'Global Ventures', role: 'lead' },
      { name: 'BECO Capital', role: 'participant' },
    ]},
    // Tactful AI $1M Pre-Seed
    { roundId: 240001, investors: [
      { name: 'Algebra Ventures', role: 'lead' },
    ]},
    // HAQQ $3M Seed
    { roundId: 240020, investors: [
      { name: 'Shorooq Partners', role: 'lead' },
      { name: 'Chimera Capital', role: 'participant' },
    ]},
    // Qureos $5M Seed
    { roundId: 210003, investors: [
      { name: 'Hambro Perks', role: 'lead' },
      { name: '500 Global MENA', role: 'participant' },
    ]},
    // Kitopi $50M Venture Debt
    { roundId: 180005, investors: [
      { name: 'SoftBank Vision Fund', role: 'lead' },
    ]},
    // Viero $1.2M Seed
    { roundId: 180004, investors: [
      { name: 'Flat6Labs', role: 'lead' },
      { name: 'Khwarizmi Ventures', role: 'participant' },
    ]},
    // SkipCash $4M Series A
    { roundId: 180001, investors: [
      { name: 'QED Investors', role: 'lead' },
      { name: 'Iliad Partners', role: 'participant' },
    ]},
    // NowPay $20M
    { roundId: 60001, investors: [
      { name: 'Tiger Global', role: 'lead' },
      { name: 'Wamda Capital', role: 'participant' },
    ]},
    // Grove $19M Seed
    { roundId: 30002, investors: [
      { name: 'Nuwa Capital', role: 'lead' },
      { name: 'STV', role: 'participant' },
    ]},
    // Property Finder $170M
    { roundId: 90005, investors: [
      { name: 'Global Ventures', role: 'lead' },
      { name: 'Mubadala Ventures', role: 'participant' },
    ]},
    // Mal $230M Seed
    { roundId: 240023, investors: [
      { name: 'STV', role: 'lead' },
      { name: 'Sanabil Investments', role: 'participant' },
    ]},
    // Shorooq $200M
    { roundId: 180003, investors: [
      { name: 'Mubadala Ventures', role: 'lead' },
    ]},
    // Reka AI $110M
    { roundId: 210002, investors: [
      { name: 'Sequoia Capital', role: 'lead' },
      { name: 'Tencent', role: 'participant' },
    ]},
    // SiFi $10M Seed
    { roundId: 240008, investors: [
      { name: 'Nuwa Capital', role: 'lead' },
      { name: 'Disruptive AI', role: 'participant' },
    ]},
    // InvestSky $3.4M Pre-Seed
    { roundId: 240003, investors: [
      { name: 'BECO Capital', role: 'lead' },
    ]},
    // Qureos $3M Pre-Seed
    { roundId: 210004, investors: [
      { name: '500 Global MENA', role: 'lead' },
    ]},
    // Juthor $1.87M Pre-Seed
    { roundId: 90001, investors: [
      { name: 'Wa\'ed Ventures', role: 'lead' },
      { name: 'Flat6Labs', role: 'participant' },
    ]},
    // Mersal Capital $1.33M Seed
    { roundId: 240021, investors: [
      { name: 'Nama Ventures', role: 'lead' },
    ]},
    // Daleel $500K Pre-Seed
    { roundId: 240022, investors: [
      { name: 'Flat6Labs', role: 'lead' },
    ]},
    // ENAKL $2.3M Seed
    { roundId: 240024, investors: [
      { name: 'Algebra Ventures', role: 'lead' },
      { name: 'Flat6Labs', role: 'participant' },
    ]},
    // iBLOXX Studios $5M Seed
    { roundId: 240025, investors: [
      { name: 'Shorooq Partners', role: 'lead' },
      { name: 'Pinnacle Capital', role: 'participant' },
    ]},
    // Routech Express $1M Pre-Seed
    { roundId: 240011, investors: [
      { name: 'Khwarizmi Ventures', role: 'lead' },
    ]},
    // Nutra GreeniX $200K Seed
    { roundId: 240014, investors: [
      { name: 'Flat6Labs', role: 'lead' },
    ]},
    // ThrowMeNot $550K Pre-Seed
    { roundId: 240009, investors: [
      { name: '500 Global MENA', role: 'lead' },
    ]},
    // Rifd $50M
    { roundId: 180002, investors: [
      { name: 'Sanabil Investments', role: 'lead' },
    ]},
    // QIA $2B Strategic
    { roundId: 120001, investors: [
      { name: 'Qatar Investment Authority', role: 'lead' },
    ]},
  ];

  let added = 0;
  for (const assoc of associations) {
    for (const inv of assoc.investors) {
      const investorId = investorMap[inv.name.toLowerCase()];
      if (!investorId) {
        console.error(`Investor not found: ${inv.name}`);
        continue;
      }

      // Check if association already exists
      const [existing] = await conn.query(
        'SELECT id FROM funding_round_investors WHERE fundingRoundId = ? AND investorId = ?',
        [assoc.roundId, investorId]
      );
      if (existing.length > 0) {
        console.log(`Association exists: round ${assoc.roundId} <-> ${inv.name}`);
        continue;
      }

      await conn.query(
        'INSERT INTO funding_round_investors (fundingRoundId, investorId, role, investmentCurrency, createdAt) VALUES (?, ?, ?, ?, NOW())',
        [assoc.roundId, investorId, inv.role, 'USD']
      );

      // Also update leadInvestorId on the funding round if this is the lead
      if (inv.role === 'lead') {
        await conn.query(
          'UPDATE funding_rounds SET leadInvestorId = ? WHERE id = ?',
          [investorId, assoc.roundId]
        );
      }

      added++;
      console.log(`Linked: round ${assoc.roundId} <-> ${inv.name} (${inv.role})`);
    }
  }

  console.log(`\nDone! Added ${added} new investor associations.`);
  
  // Verify
  const [count] = await conn.query('SELECT COUNT(*) as cnt FROM funding_round_investors');
  console.log(`Total associations now: ${count[0].cnt}`);
  
  const [withLead] = await conn.query('SELECT COUNT(*) as cnt FROM funding_rounds WHERE leadInvestorId IS NOT NULL AND status = "confirmed"');
  console.log(`Rounds with lead investor: ${withLead[0].cnt}`);

  await conn.end();
}

main().catch(e => console.error(e));
