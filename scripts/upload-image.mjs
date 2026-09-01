import fs from 'fs';
import path from 'path';

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function uploadToS3(filePath, s3Key) {
  const fileBuffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  
  const url = new URL('v1/storage/upload', FORGE_API_URL);
  url.searchParams.set('path', s3Key);
  
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: 'image/jpeg' }), filename);
  
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${text}`);
  }
  
  const result = await response.json();
  return result;
}

async function main() {
  const imagePath = process.argv[2] || '/home/ubuntu/upload/Official-PM-FM-Qatar-Mohammed-Bin-Abdulrahman--Bin-Jassim-650.jpg';
  const s3Key = `people/sheikh-mohammed-al-thani-${Date.now()}.jpg`;
  
  console.log('Uploading:', imagePath);
  console.log('S3 Key:', s3Key);
  
  const result = await uploadToS3(imagePath, s3Key);
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
