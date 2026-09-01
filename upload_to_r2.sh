#!/bin/bash

# R2 Configuration — set these env vars before running:
#   export R2_ACCOUNT_ID=your_account_id
#   export R2_ACCESS_KEY_ID=your_access_key_id
#   export R2_SECRET_ACCESS_KEY=your_secret_access_key
ACCOUNT_ID="${R2_ACCOUNT_ID}"
ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
BUCKET_NAME="techscoop-assets"
ENDPOINT="https://${ACCOUNT_ID}.r2.cloudflarestorage.com"

if [ -z "$ACCOUNT_ID" ] || [ -z "$ACCESS_KEY_ID" ] || [ -z "$SECRET_ACCESS_KEY" ]; then
  echo "Error: Missing required env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
  exit 1
fi

ASSETS_DIR="client/public/assets"
ASSETS=("logo.png" "og-image.png" "favicon.ico" "favicon-16x16.png" "favicon-32x32.png" "icon-192x192.png" "icon-512x512.png" "apple-touch-icon.png")

echo "Uploading ${#ASSETS[@]} assets to R2 bucket '${BUCKET_NAME}'..."
echo ""

success_count=0
failed_count=0

for asset in "${ASSETS[@]}"; do
    file_path="${ASSETS_DIR}/${asset}"

    if [ ! -f "$file_path" ]; then
        echo "❌ $asset - File not found"
        ((failed_count++))
        continue
    fi

    # Get file size
    file_size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null)

    # Determine content type
    case "$asset" in
        *.png) content_type="image/png" ;;
        *.ico) content_type="image/x-icon" ;;
        *.jpg|*.jpeg) content_type="image/jpeg" ;;
        *.gif) content_type="image/gif" ;;
        *.svg) content_type="image/svg+xml" ;;
        *) content_type="application/octet-stream" ;;
    esac

    # Upload using curl with AWS Signature V4
    # This is complex, so let's use a simpler Python approach instead
    echo "Uploading $asset..."
done

echo ""
echo "Note: Using curl for S3 API requires AWS Signature V4 signing. Switching to Python..."
