import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, '');
}

async function storagePut(relKey, data, contentType) {
  const baseUrl = ensureTrailingSlash(FORGE_API_URL);
  const key = normalizeKey(relKey);
  
  const url = new URL('v1/storage/upload', baseUrl);
  url.searchParams.set('path', key);
  
  const blob = new Blob([data], { type: contentType });
  const form = new FormData();
  form.append('file', blob, key.split('/').pop() || 'file');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: form,
  });
  
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status}): ${message}`);
  }
  
  const result = await response.json();
  return { key, url: result.url };
}

async function uploadMedia() {
  const uploadsDir = '/home/ubuntu/wp_uploads/uploads';
  let uploaded = 0;
  let failed = 0;
  let skipped = 0;
  const urlMapping = {};
  
  async function processDir(dir, relativePath = '') {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relPath = path.join(relativePath, item).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip Mac OS metadata folders and plugin folders
        if (item === '__MACOSX' || item === '.DS_Store' || item === 'aioseo' || item === 'rank-math' || item === 'wpallexport') continue;
        await processDir(fullPath, relPath);
      } else if (stat.isFile()) {
        // Skip non-image files and metadata
        if (item.startsWith('.') || item === '.DS_Store') continue;
        
        // Skip thumbnail sizes (we only need originals)
        if (/-\d+x\d+\.(jpg|jpeg|png|gif|webp)$/i.test(item)) {
          skipped++;
          continue;
        }
        
        const ext = path.extname(item).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
        };
        
        const mimeType = mimeTypes[ext];
        if (!mimeType) continue;
        
        try {
          const fileBuffer = fs.readFileSync(fullPath);
          const key = `techscoop/uploads/${relPath}`;
          const result = await storagePut(key, fileBuffer, mimeType);
          
          // Store URL mapping
          const oldUrl = `https://techscoop.io/wp-content/uploads/${relPath}`;
          urlMapping[oldUrl] = result.url;
          
          uploaded++;
          if (uploaded % 20 === 0) {
            console.log(`Uploaded ${uploaded} files...`);
          }
        } catch (err) {
          failed++;
          if (failed <= 5) {
            console.error(`Failed: ${relPath} - ${err.message}`);
          }
        }
      }
    }
  }
  
  console.log('Starting media upload to S3...');
  console.log(`API URL: ${FORGE_API_URL}`);
  console.log('Skipping thumbnail sizes (-NxN.ext)...\n');
  
  await processDir(uploadsDir);
  
  console.log('\nUpload complete!');
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped (thumbnails): ${skipped}`);
  console.log(`Failed: ${failed}`);
  
  // Save URL mapping
  fs.writeFileSync(
    '/home/ubuntu/techscoop/media-url-mapping.json',
    JSON.stringify(urlMapping, null, 2)
  );
  console.log('\nURL mapping saved to: media-url-mapping.json');
}

uploadMedia().catch(console.error);
