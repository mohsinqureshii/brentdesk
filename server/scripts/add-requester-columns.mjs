import { createConnection } from "mysql2/promise";

async function addColumns() {
  const conn = await createConnection(process.env.DATABASE_URL);
  
  try {
    // Check if columns exist in profile_claims
    const [claimsCols] = await conn.execute(`SHOW COLUMNS FROM profile_claims LIKE 'requesterType'`);
    if (claimsCols.length === 0) {
      await conn.execute(`ALTER TABLE profile_claims ADD COLUMN requesterType ENUM('internal', 'external') DEFAULT 'external' NOT NULL`);
      console.log("Added requesterType to profile_claims");
    } else {
      console.log("requesterType already exists in profile_claims");
    }
    
    const [claimsSourceCols] = await conn.execute(`SHOW COLUMNS FROM profile_claims LIKE 'source'`);
    if (claimsSourceCols.length === 0) {
      await conn.execute(`ALTER TABLE profile_claims ADD COLUMN source VARCHAR(64) DEFAULT 'public_form'`);
      console.log("Added source to profile_claims");
    } else {
      console.log("source already exists in profile_claims");
    }
    
    // Check if columns exist in suggested_updates
    const [updatesCols] = await conn.execute(`SHOW COLUMNS FROM suggested_updates LIKE 'requesterType'`);
    if (updatesCols.length === 0) {
      await conn.execute(`ALTER TABLE suggested_updates ADD COLUMN requesterType ENUM('internal', 'external') DEFAULT 'external' NOT NULL`);
      console.log("Added requesterType to suggested_updates");
    } else {
      console.log("requesterType already exists in suggested_updates");
    }
    
    const [updatesSourceCols] = await conn.execute(`SHOW COLUMNS FROM suggested_updates LIKE 'source'`);
    if (updatesSourceCols.length === 0) {
      await conn.execute(`ALTER TABLE suggested_updates ADD COLUMN source VARCHAR(64) DEFAULT 'public_form'`);
      console.log("Added source to suggested_updates");
    } else {
      console.log("source already exists in suggested_updates");
    }
    
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await conn.end();
  }
}

addColumns();
