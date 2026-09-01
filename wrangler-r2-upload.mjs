import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// R2 Configuration — set these env vars before running:
//   export R2_ACCOUNT_ID=your_account_id
//   export R2_ACCESS_KEY_ID=your_access_key_id
//   export R2_SECRET_ACCESS_KEY=your_secret_access_key
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = "techscoop-assets";

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error("Missing required env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  process.exit(1);
}

// Create S3 client configured for R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

// Assets to upload
const ASSETS_DIR = path.join(__dirname, "client/public/assets");
const ASSETS = [
  "logo.png",
  "og-image.png",
  "favicon.ico",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "icon-192x192.png",
  "icon-512x512.png",
  "apple-touch-icon.png",
];

function getContentType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const types = {
    png: "image/png",
    ico: "image/x-icon",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
  };
  return types[ext] || "application/octet-stream";
}

async function uploadAssets() {
  console.log(`Uploading ${ASSETS.length} assets to R2 bucket '${BUCKET_NAME}'...\n`);

  let successCount = 0;
  let failedCount = 0;

  for (const asset of ASSETS) {
    const filePath = path.join(ASSETS_DIR, asset);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${asset} - File not found at ${filePath}`);
      failedCount++;
      continue;
    }

    try {
      const fileData = fs.readFileSync(filePath);
      const fileSize = fileData.length;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: asset,
        Body: fileData,
        ContentType: getContentType(asset),
      });

      await s3Client.send(command);
      console.log(`✅ ${asset} (${fileSize.toLocaleString()} bytes) - Uploaded successfully`);
      successCount++;
    } catch (error) {
      console.log(`❌ ${asset} - Error: ${error.message}`);
      failedCount++;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Upload Summary: ${successCount} succeeded, ${failedCount} failed`);
  console.log(`${"=".repeat(50)}`);
}

uploadAssets().catch(console.error);
