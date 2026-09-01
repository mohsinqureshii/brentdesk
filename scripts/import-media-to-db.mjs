import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Load media URL mapping
  const mapping = JSON.parse(fs.readFileSync('media-url-mapping.json', 'utf-8'));
  
  console.log(`Found ${Object.keys(mapping).length} media files to import`);
  
  // Connect to database
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get existing media URLs to avoid duplicates
  const [existing] = await conn.execute('SELECT url FROM media');
  const existingUrls = new Set(existing.map(m => m.url));
  console.log(`Found ${existingUrls.size} existing media items`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const [oldUrl, newUrl] of Object.entries(mapping)) {
    // Skip if already exists
    if (existingUrls.has(newUrl)) {
      skipped++;
      continue;
    }
    
    // Extract filename from URL
    const filename = path.basename(oldUrl);
    const ext = path.extname(filename).toLowerCase();
    
    // Determine mime type
    let mimeType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.svg') mimeType = 'image/svg+xml';
    else if (ext === '.pdf') mimeType = 'application/pdf';
    
    // Extract s3Key from URL
    const s3Key = newUrl.replace('https://d2xsxph8kpxj0f.cloudfront.net/116552453/73g2t8M8MAYZSTdDWoNocC/', '');
    
    // Insert into database
    try {
      await conn.execute(`
        INSERT INTO media (filename, originalFilename, mimeType, url, s3Key, folder, size, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        filename,
        filename,
        mimeType,
        newUrl,
        s3Key,
        'wordpress-import',
        0  // Size unknown from URL mapping
      ]);
      imported++;
      existingUrls.add(newUrl);
    } catch (err) {
      console.error(`Failed to import ${filename}:`, err.message);
    }
  }
  
  console.log(`\nImport complete:`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (duplicates): ${skipped}`);
  
  // Verify total count
  const [count] = await conn.execute('SELECT COUNT(*) as total FROM media');
  console.log(`  Total media items in database: ${count[0].total}`);
  
  await conn.end();
}

main().catch(console.error);
