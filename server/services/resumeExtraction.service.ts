/**
 * Resume Extraction Service
 * ----------------------------------------------------------------------
 * Extracts plain text from PDF / DOCX / TXT / MD binary buffers so the
 * candidate-side resume parser (which expects raw text) can run against
 * uploaded files without forcing candidates to paste text manually.
 *
 * Parsers (`pdf-parse`, `mammoth`) are loaded lazily via dynamic import
 * so an environment without those deps still builds and boots — the
 * relevant code path only fails at the moment a user uploads that file
 * type. The error message includes `WARN_RESUME_EXTRACT_DEP` so ops can
 * grep logs for missing-dependency incidents.
 *
 * Caller invariants:
 *   - Returned text is trimmed and capped at 200_000 chars to keep LLM
 *     token budgets predictable.
 *   - Throws on unsupported file types — caller maps to TRPCError.
 */

const MAX_CHARS = 200_000;

// ------------------------------------------------------------
// Magic-byte sniff so we don't trust the filename alone. We still fall
// back to the extension when the magic bytes are inconclusive (TXT/MD
// have no signature).
// ------------------------------------------------------------
type Kind = "pdf" | "docx" | "text" | "unknown";

function sniffKind(buffer: Buffer, filename: string): Kind {
  // PDF: "%PDF-"
  if (buffer.length >= 5 && buffer.slice(0, 5).toString("ascii") === "%PDF-") {
    return "pdf";
  }
  // DOCX is a ZIP: "PK\x03\x04"
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  ) {
    // Could be any zip — disambiguate with extension.
    const lower = filename.toLowerCase();
    if (lower.endsWith(".docx")) return "docx";
    return "unknown";
  }
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return "text";
  }
  return "unknown";
}

// ------------------------------------------------------------
// Whitespace normalisation. Resume text from PDFs in particular comes
// out with runaway blank lines and trailing spaces; the parser doesn't
// care about layout, just signal.
// ------------------------------------------------------------
function normalize(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Collapse 3+ blank lines into 2.
  text = text.replace(/\n{3,}/g, "\n\n");
  // Trim trailing whitespace on each line.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
  // Collapse runs of internal spaces > 4 (sometimes from columnar PDFs).
  text = text.replace(/[ \t]{4,}/g, "    ");
  text = text.trim();
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);
  return text;
}

// ------------------------------------------------------------
// Extractors
// ------------------------------------------------------------

async function extractPdf(buffer: Buffer): Promise<string> {
  let mod: any;
  try {
    // Dynamic import keeps `pdf-parse` an optional dep at boot time.
    mod = await import("pdf-parse");
  } catch (err) {
    throw new Error(
      "pdf-parse not installed; run npm install pdf-parse [WARN_RESUME_EXTRACT_DEP]",
    );
  }
  const fn = (mod?.default ?? mod) as (
    data: Buffer,
    opts?: Record<string, unknown>,
  ) => Promise<{ text: string }>;
  const result = await fn(buffer);
  return result.text ?? "";
}

async function extractDocx(buffer: Buffer): Promise<string> {
  let mod: any;
  try {
    mod = await import("mammoth");
  } catch (err) {
    throw new Error(
      "mammoth not installed; run npm install mammoth [WARN_RESUME_EXTRACT_DEP]",
    );
  }
  const mammoth = mod?.default ?? mod;
  const result = await mammoth.extractRawText({ buffer });
  return result?.value ?? "";
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const kind = sniffKind(buffer, filename);
  let raw: string;
  switch (kind) {
    case "pdf":
      raw = await extractPdf(buffer);
      break;
    case "docx":
      raw = await extractDocx(buffer);
      break;
    case "text":
      raw = buffer.toString("utf8");
      break;
    default:
      throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
  }
  return normalize(raw);
}

export const resumeExtraction = { extractText };
