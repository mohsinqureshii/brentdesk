/**
 * /api/upload — multipart file upload → S3 via storagePut
 * Returns { url } with the public CDN URL.
 */
import { Router } from "express";
import multer from "multer";
import { storagePut } from "../storage";
import { getDb } from "../db";

const router = Router();

// Store file in memory (max 10 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

router.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { originalname, mimetype, buffer } = req.file;
    const rawExt = (originalname.split(".").pop() ?? "jpg").toLowerCase();
    const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"]);
    if (!ALLOWED_EXTENSIONS.has(rawExt)) {
      return res.status(400).json({ error: "File extension not allowed" });
    }
    const ext = rawExt;
    const key = `uploads/${Date.now()}-${randomSuffix()}.${ext}`;

    const { url } = await storagePut(key, buffer, mimetype);

    return res.json({ url, key });
  } catch (err) {
    console.error("[Upload] Error:", err);
    return res.status(500).json({ error: "Upload failed", details: String(err) });
  }
});

export default router;
