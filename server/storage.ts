// Storage helpers — a single S3-compatible backend (Cloudflare R2, AWS S3,
// MinIO) configured via env:
//
//   S3_ENDPOINT           e.g. https://<account>.r2.cloudflarestorage.com
//   S3_BUCKET             bucket name
//   S3_ACCESS_KEY_ID      access key
//   S3_SECRET_ACCESS_KEY  secret key
//   S3_PUBLIC_URL         public base URL for serving objects, e.g.
//                         https://pub-xxx.r2.dev or an assets CDN domain
//   S3_REGION             optional, defaults to "auto" (R2)
//
// The previous hosting platform's proprietary storage proxy backend was
// removed with the migration off that platform.

type S3Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string | null;
  region: string;
};

function getS3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT || "";
  const bucket = process.env.S3_BUCKET || "";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    bucket,
    accessKeyId,
    secretAccessKey,
    publicUrl: (process.env.S3_PUBLIC_URL || "").replace(/\/+$/, "") || null,
    region: process.env.S3_REGION || "auto",
  };
}

// ----------------------------------------------------------------
// S3 backend (lazy SDK load — only paid for when actually used)
// ----------------------------------------------------------------

let _s3Client: any = null;

async function getS3Client(cfg: S3Config): Promise<any> {
  if (_s3Client) return _s3Client;
  const { S3Client } = await import("@aws-sdk/client-s3");
  _s3Client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  return _s3Client;
}

async function s3ObjectUrl(cfg: S3Config, key: string): Promise<string> {
  if (cfg.publicUrl) return `${cfg.publicUrl}/${key}`;
  // No public domain configured — fall back to a 7-day presigned URL.
  // Fine for previews; set S3_PUBLIC_URL for permanent media links.
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = await getS3Client(cfg);
  return getSignedUrl(client, new GetObjectCommand({ Bucket: cfg.bucket, Key: key }), {
    expiresIn: 7 * 24 * 3600,
  });
}

async function s3Put(
  cfg: S3Config,
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client(cfg);
  const body = typeof data === "string" ? Buffer.from(data) : data;
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return { key, url: await s3ObjectUrl(cfg, key) };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

// ----------------------------------------------------------------
// Public interface
// ----------------------------------------------------------------

const NO_BACKEND_MSG =
  "No storage backend configured. Set S3_ENDPOINT, S3_BUCKET, " +
  "S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (+ S3_PUBLIC_URL) for an " +
  "S3-compatible store like Cloudflare R2.";

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const s3 = getS3Config();
  if (s3) return s3Put(s3, key, data, contentType);
  throw new Error(NO_BACKEND_MSG);
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const key = normalizeKey(relKey);
  const s3 = getS3Config();
  if (s3) return { key, url: await s3ObjectUrl(s3, key) };
  throw new Error(NO_BACKEND_MSG);
}
