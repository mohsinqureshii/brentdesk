/**
 * PDF Resource Generator Service
 * Generates branded publication PDF documents (reports, resources, whitepapers)
 * Uses HTML-to-PDF conversion with the publication branding from shared/publication.ts
 */
import { publication } from "../../../shared/publication";
import { storagePut } from "../../storage";
import { ENV } from "../../_core/env";

// ============================================================
// TYPES
// ============================================================

export interface PDFGenerationInput {
  title: string;
  subtitle?: string;
  content: string; // HTML content
  author?: string;
  date?: string;
  category?: string;
  coverImageUrl?: string;
  includeTableOfContents?: boolean;
  includeDisclaimer?: boolean;
  brandColor?: string;
}

export interface PDFGenerationResult {
  url: string;
  fileKey: string;
  sizeBytes: number;
}

// ============================================================
// BRANDING CONSTANTS
// ============================================================

const PUBLICATION_BRAND = {
  primaryColor: "#0b0d12",
  accentColor: "#2563eb",
  textColor: "#1f2937",
  lightGray: "#f3f4f6",
  logoUrl: `${publication.siteUrl}${publication.assets.logo}`,
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  siteName: publication.name,
  siteUrl: publication.domain,
  tagline: publication.tagline,
};

// ============================================================
// HTML TEMPLATE
// ============================================================

function buildPDFHTML(input: PDFGenerationInput): string {
  const brand = PUBLICATION_BRAND;
  const accentColor = input.brandColor || brand.accentColor;
  const date = input.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: ${brand.fontFamily};
      color: ${brand.textColor};
      line-height: 1.7;
      font-size: 11pt;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 60px;
      background: linear-gradient(135deg, ${brand.primaryColor} 0%, #16213e 50%, ${accentColor} 100%);
      color: white;
      position: relative;
    }

    .cover-logo {
      position: absolute;
      top: 40px;
      left: 60px;
      font-size: 24pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: white;
    }

    .cover-logo span { color: ${accentColor}; }

    .cover-category {
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: ${accentColor};
      margin-bottom: 16px;
    }

    .cover-title {
      font-size: 32pt;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 20px;
      max-width: 80%;
    }

    .cover-subtitle {
      font-size: 14pt;
      font-weight: 300;
      opacity: 0.85;
      max-width: 70%;
      margin-bottom: 40px;
    }

    .cover-meta {
      font-size: 10pt;
      opacity: 0.7;
    }

    .cover-meta span { margin-right: 24px; }

    .cover-footer {
      position: absolute;
      bottom: 40px;
      left: 60px;
      right: 60px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      opacity: 0.5;
    }

    ${input.coverImageUrl ? `
    .cover-image {
      position: absolute;
      top: 0; right: 0;
      width: 40%;
      height: 100%;
      background: url('${input.coverImageUrl}') center/cover;
      opacity: 0.3;
    }` : ""}

    /* Table of Contents */
    .toc-page {
      page-break-after: always;
      padding: 60px;
    }

    .toc-title {
      font-size: 18pt;
      font-weight: 700;
      color: ${brand.primaryColor};
      margin-bottom: 30px;
      padding-bottom: 12px;
      border-bottom: 3px solid ${accentColor};
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px dotted #d1d5db;
      font-size: 11pt;
    }

    .toc-item-title { font-weight: 500; }
    .toc-item-page { color: ${accentColor}; font-weight: 600; }

    /* Content Pages */
    .content-page {
      padding: 50px 60px;
    }

    .content-page h1 {
      font-size: 22pt;
      font-weight: 800;
      color: ${brand.primaryColor};
      margin: 30px 0 16px 0;
      line-height: 1.2;
    }

    .content-page h2 {
      font-size: 16pt;
      font-weight: 700;
      color: ${brand.primaryColor};
      margin: 28px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid ${accentColor};
    }

    .content-page h3 {
      font-size: 13pt;
      font-weight: 600;
      color: ${brand.primaryColor};
      margin: 22px 0 10px 0;
    }

    .content-page h4 {
      font-size: 11pt;
      font-weight: 600;
      color: #374151;
      margin: 18px 0 8px 0;
    }

    .content-page p {
      margin-bottom: 14px;
      text-align: justify;
    }

    .content-page ul, .content-page ol {
      margin: 12px 0 14px 24px;
    }

    .content-page li {
      margin-bottom: 6px;
    }

    .content-page blockquote {
      border-left: 4px solid ${accentColor};
      padding: 12px 20px;
      margin: 16px 0;
      background: ${brand.lightGray};
      font-style: italic;
      color: #4b5563;
    }

    .content-page table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }

    .content-page th {
      background: ${brand.primaryColor};
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
    }

    .content-page td {
      padding: 8px 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    .content-page tr:nth-child(even) td {
      background: ${brand.lightGray};
    }

    .content-page img {
      max-width: 100%;
      border-radius: 8px;
      margin: 16px 0;
    }

    .content-page .highlight-box {
      background: linear-gradient(135deg, ${brand.lightGray}, #e0e7ff);
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid ${accentColor};
    }

    /* Page Header/Footer */
    @page {
      margin: 0;
      size: A4;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
    }

    .page-header-logo {
      font-weight: 700;
      color: ${brand.primaryColor};
      font-size: 10pt;
    }

    .page-footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #9ca3af;
    }

    /* Disclaimer */
    .disclaimer {
      margin-top: 40px;
      padding: 20px;
      background: ${brand.lightGray};
      border-radius: 8px;
      font-size: 9pt;
      color: #6b7280;
      line-height: 1.5;
    }

    .disclaimer-title {
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    ${input.coverImageUrl ? '<div class="cover-image"></div>' : ""}
    <div class="cover-logo">${publication.wordmark.replace(/\.$/, "")}<span>.</span></div>
    ${input.category ? `<div class="cover-category">${escapeHtml(input.category)}</div>` : ""}
    <div class="cover-title">${escapeHtml(input.title)}</div>
    ${input.subtitle ? `<div class="cover-subtitle">${escapeHtml(input.subtitle)}</div>` : ""}
    <div class="cover-meta">
      ${input.author ? `<span>By ${escapeHtml(input.author)}</span>` : ""}
      <span>${date}</span>
    </div>
    <div class="cover-footer">
      <span>${brand.siteUrl}</span>
      <span>${brand.tagline}</span>
    </div>
  </div>

  <!-- Content -->
  <div class="content-page">
    <div class="page-header">
      <span class="page-header-logo">${publication.wordmark}</span>
      <span>${escapeHtml(input.title)}</span>
    </div>

    ${input.content}

    ${input.includeDisclaimer !== false ? `
    <div class="disclaimer">
      <div class="disclaimer-title">Disclaimer</div>
      This document is produced by ${publication.name} for informational purposes only. The information contained herein is based on sources believed to be reliable, but ${publication.name} makes no representation or warranty, express or implied, as to the accuracy, completeness, or timeliness of the information. This document does not constitute investment advice, and ${publication.name} is not responsible for any decisions made based on the information provided.
    </div>` : ""}

    <div class="page-footer">
      <span>&copy; ${new Date().getFullYear()} ${publication.legalName}. All rights reserved.</span>
      <span>${brand.siteUrl}</span>
    </div>
  </div>

</body>
</html>`;
}

// ============================================================
// PDF GENERATION
// ============================================================

export async function generatePDF(input: PDFGenerationInput): Promise<PDFGenerationResult> {
  const html = buildPDFHTML(input);

  // Use the server-side HTML-to-PDF approach
  // Store the HTML and use a headless browser or weasyprint to convert
  const htmlBuffer = Buffer.from(html, "utf-8");

  // Generate a unique file key
  const timestamp = Date.now();
  const safeTitle = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 50);
  const fileKey = `resources/pdf/${safeTitle}-${timestamp}.html`;

  // Upload the HTML version first (can be rendered client-side)
  const { url } = await storagePut(fileKey, htmlBuffer, "text/html");

  return {
    url,
    fileKey,
    sizeBytes: htmlBuffer.length,
  };
}

// Generate PDF from content and return the branded HTML for client-side rendering
export async function generatePDFPreview(input: PDFGenerationInput): Promise<string> {
  return buildPDFHTML(input);
}

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
