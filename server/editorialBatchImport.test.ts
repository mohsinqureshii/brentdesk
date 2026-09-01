import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getBaseUrl, publication } from "@shared/publication";
import { importEditorialBatch, validateEditorialBatchManifest, type EditorialBatchManifest } from "./services/editorialBatchImport.service";

const tempDir = path.resolve(".tmp-editorial-batch-test");
const imagePath = path.join(tempDir, "test.webp");

// The validator requires the canonical desk author and a canonical URL rooted
// at the publication base URL (see editorialBatchImport.service.ts).
const DESK_AUTHOR = `${publication.name} Desk`;
const BASE = getBaseUrl();

function makeManifest(): EditorialBatchManifest {
  const words = Array.from({ length: 805 }, (_, index) => `word${index + 1}`).join(" ");
  const articles = Array.from({ length: 100 }, (_, index) => {
    const sequence = index + 1;
    const localMinutes = Math.round(index * 719 / 99);
    const hour = 12 + Math.floor(localMinutes / 60);
    const minute = localMinutes % 60;
    const local = `2026-08-31T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`;
    const utc = new Date(local).toISOString();
    return {
      batch_id: "leap-deepfest-2026-day1",
      sequence,
      candidate_id: `T${String(sequence).padStart(3, "0")}`,
      canonical_announcement_key: `unique announcement ${sequence}`,
      title: `Unique LEAP 2026 Story ${sequence}`,
      slug: `unique-leap-2026-story-${sequence}`,
      author_public_name: DESK_AUTHOR,
      workflow_status_slug: "draft" as const,
      article_type: "news" as const,
      display_datetime_local: local,
      display_datetime_utc: utc,
      timezone: "Asia/Riyadh" as const,
      excerpt: `A concise and factual summary for unique story ${sequence}.`,
      content_html: `<p>${words}</p>`,
      content_word_count: 805,
      primary_category_name: "AI & Data",
      category_names: ["AI & Data", "Events & Conferences"],
      event_names: [sequence % 2 === 0 ? "DeepFest 2026" : "LEAP 2026"],
      event_bucket: (sequence % 2 === 0 ? "DeepFest 2026" : "LEAP 2026") as "DeepFest 2026" | "LEAP 2026",
      company_names: [`Test Company ${sequence}`],
      people_names: [],
      topic_names: ["AI & Machine Learning", sequence % 2 === 0 ? "DeepFest 2026" : "LEAP 2026"],
      tag_names: ["Saudi Arabia", "Riyadh", sequence % 2 === 0 ? "DeepFest 2026" : "LEAP 2026"],
      coverage: { country_iso2: "SA" as const, country_name: "Saudi Arabia", city_name: "Riyadh", region_name: "Gulf Region" },
      seo: {
        focus_keyword: `LEAP story keyword ${sequence}`,
        keywords: [`LEAP story keyword ${sequence}`, "LEAP 2026", "DeepFest 2026", "Saudi technology", "Riyadh tech"],
        seo_title: `Unique LEAP Story ${sequence}`,
        seo_description: `Verified description for unique LEAP and DeepFest story ${sequence} from Riyadh.`,
        og_title: `Unique LEAP 2026 Story ${sequence}`,
        og_description: `Verified Open Graph description for story ${sequence}.`,
        google_news_keywords: [`LEAP story keyword ${sequence}`, "LEAP 2026"],
        canonical_url: `${BASE}/events-conferences/unique-leap-2026-story-${sequence}`,
        robots_indexing: "index" as const,
      },
      sources: {
        primary_title: `Primary source ${sequence}`,
        primary_url: `https://example.com/source-${sequence}`,
        supporting_urls: [],
        verified_angle_summary: `Verified angle ${sequence}`,
        verified_key_facts: `Verified facts ${sequence}`,
        confidence: 95,
      },
      image: {
        local_path: imagePath,
        filename: `story-${sequence}.webp`,
        mime_type: "image/webp" as const,
        width: 1600,
        height: 900,
        alt: `Relevant editorial image for unique story ${sequence}`,
        caption: `${publication.name} editorial image for story ${sequence}.`,
        credit: `${publication.name} illustration`,
        source_url: BASE,
        license: `${publication.name} original`,
        rights_status: "generated" as const,
        rights_notes: `Original editorial illustration prepared for ${publication.name}.`,
      },
    };
  });

  return {
    batch: {
      id: "leap-deepfest-2026-day1",
      name: "LEAP and DeepFest 2026 Day 1",
      article_count: 100,
      author_public_name: DESK_AUTHOR,
      workflow_status_slug: "draft",
      public_publish_allowed: false,
      review_required: true,
      date: "2026-08-31",
      timezone: "Asia/Riyadh",
      window_start: "2026-08-31T12:00:00+03:00",
      window_end: "2026-08-31T23:59:00+03:00",
    },
    articles,
  };
}

beforeAll(async () => {
  await mkdir(tempDir, { recursive: true });
  await writeFile(imagePath, "test-image-placeholder");
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("editorial batch import validation", () => {
  it("accepts a complete, unique, draft-only 100-article manifest", async () => {
    const issues = await validateEditorialBatchManifest(makeManifest());
    expect(issues.filter((issue) => issue.level === "error")).toHaveLength(0);
  });

  it("rejects duplicate underlying announcements", async () => {
    const manifest = makeManifest();
    manifest.articles[1].canonical_announcement_key = manifest.articles[0].canonical_announcement_key;
    const issues = await validateEditorialBatchManifest(manifest);
    expect(issues.some((issue) => issue.field === "canonical_announcement_key" && issue.level === "error")).toBe(true);
  });

  it("rejects any batch that permits publishing", async () => {
    const manifest = makeManifest();
    (manifest.batch.public_publish_allowed as boolean) = true;
    const issues = await validateEditorialBatchManifest(manifest);
    expect(issues.some((issue) => issue.field === "batch.public_publish_allowed" && issue.level === "error")).toBe(true);
  });

  it("rejects a missing article image", async () => {
    const manifest = makeManifest();
    manifest.articles[0].image.local_path = path.join(tempDir, "missing.webp");
    const issues = await validateEditorialBatchManifest(manifest);
    expect(issues.some((issue) => issue.sequence === 1 && issue.field === "image.local_path" && issue.level === "error")).toBe(true);
  });

  it("supports a database-free dry run", async () => {
    const report = await importEditorialBatch(makeManifest(), { dryRun: true });
    expect(report.valid).toBe(true);
    expect(report.importedArticles).toBe(0);
    expect(report.plannedArticles).toBe(100);
  });
});
