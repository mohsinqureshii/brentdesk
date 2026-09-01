import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const companyId = 300031;

// Insert funding rounds for TechScoop
const rounds = [
  {
    roundType: 'pre_seed',
    amountRaised: 250000.00,
    currency: 'USD',
    isUndisclosed: 0,
    fundingDate: '2020-06-15 00:00:00',
    status: 'confirmed',
    notes: 'Initial angel round from MENA-based angel investors',
  },
  {
    roundType: 'seed',
    amountRaised: 500000.00,
    currency: 'USD',
    isUndisclosed: 0,
    fundingDate: '2021-03-20 00:00:00',
    status: 'confirmed',
    notes: 'Seed round to expand editorial team and platform features',
  },
  {
    roundType: 'series_a',
    amountRaised: 1200000.00,
    currency: 'USD',
    isUndisclosed: 0,
    fundingDate: '2023-01-10 00:00:00',
    status: 'confirmed',
    notes: 'Series A to scale platform across MENA region',
  },
];

const roundIds = [];
for (const round of rounds) {
  const [result] = await conn.execute(
    `INSERT INTO funding_rounds (companyId, roundType, amountRaised, currency, isUndisclosed, fundingDate, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, round.roundType, round.amountRaised, round.currency, round.isUndisclosed, round.fundingDate, round.status, round.notes]
  );
  roundIds.push(result.insertId);
  console.log(`Inserted ${round.roundType} round with ID ${result.insertId}`);
}

// Get investor IDs
const [investors] = await conn.query("SELECT id, slug FROM investors WHERE slug IN ('stv', 'global-ventures', 'beco-capital', 'wamda-capital', '500-global-mena', 'shorooq-partners')");
const investorMap = {};
for (const inv of investors) {
  investorMap[inv.slug] = inv.id;
}
console.log('Investor map:', investorMap);

// Pre-seed investors
if (investorMap['500-global-mena']) {
  await conn.execute(
    `INSERT INTO funding_round_investors (fundingRoundId, investorId, role) VALUES (?, ?, ?)`,
    [roundIds[0], investorMap['500-global-mena'], 'lead']
  );
  console.log('Added 500 Global MENA as lead for pre-seed');
}

// Seed investors
if (investorMap['beco-capital']) {
  await conn.execute(
    `INSERT INTO funding_round_investors (fundingRoundId, investorId, role) VALUES (?, ?, ?)`,
    [roundIds[1], investorMap['beco-capital'], 'lead']
  );
  console.log('Added BECO Capital as lead for seed');
}
if (investorMap['wamda-capital']) {
  await conn.execute(
    `INSERT INTO funding_round_investors (fundingRoundId, investorId, role) VALUES (?, ?, ?)`,
    [roundIds[1], investorMap['wamda-capital'], 'participant']
  );
  console.log('Added Wamda Capital as participant for seed');
}

// Series A investors
if (investorMap['stv']) {
  await conn.execute(
    `INSERT INTO funding_round_investors (fundingRoundId, investorId, role) VALUES (?, ?, ?)`,
    [roundIds[2], investorMap['stv'], 'lead']
  );
  console.log('Added STV as lead for Series A');
}
if (investorMap['global-ventures']) {
  await conn.execute(
    `INSERT INTO funding_round_investors (fundingRoundId, investorId, role) VALUES (?, ?, ?)`,
    [roundIds[2], investorMap['global-ventures'], 'participant']
  );
  console.log('Added Global Ventures as participant for Series A');
}
if (investorMap['shorooq-partners']) {
  await conn.execute(
    `INSERT INTO funding_round_investors (fundingRoundId, investorId, role) VALUES (?, ?, ?)`,
    [roundIds[2], investorMap['shorooq-partners'], 'participant']
  );
  console.log('Added Shorooq Partners as participant for Series A');
}
if (investorMap['500-global-mena']) {
  await conn.execute(
    `INSERT INTO funding_round_investors (fundingRoundId, investorId, role) VALUES (?, ?, ?)`,
    [roundIds[2], investorMap['500-global-mena'], 'participant']
  );
  console.log('Added 500 Global MENA as participant for Series A');
}

console.log('Done! Seeded 3 funding rounds with investors for TechScoop');
await conn.end();
