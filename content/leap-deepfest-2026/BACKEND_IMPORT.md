# LEAP and DeepFest 2026 Editorial Batch: Backend Import

The Day-1 package is designed as a **backend-first editorial batch**, not a set of hard-coded frontend pages. The importer validates a final manifest, uploads each image through the existing storage service, creates the article as an unpublished editorial draft, records its display timestamp, and writes all article-to-entity relations required by the event pages and admin portal.

## Publication Guardrail

The batch manifest must set `public_publish_allowed` to `false`, `review_required` to `true`, and both the batch and every article workflow slug to `draft`. The importer resolves the backend editorial status and refuses to continue if that status is marked as published. It never invokes search-engine notification or sitemap regeneration hooks. The public LEAP and DeepFest feeds already restrict results to published records, so these drafts remain invisible until an editor reviews and deliberately publishes them.

## Data Model

| Backend object | Purpose |
|---|---|
| `editorial_batches` | Tracks the 100-draft package, its state, expected and imported counts, and import metadata. |
| `article_editorial_batches` | Provides idempotent provenance from each article back to its batch sequence and research candidate. |
| `article_source_references` | Stores the primary and supporting editorial sources separately from the TechScoop canonical URL. |
| `media` attribution fields | Stores image credit, source URL, license, rights status and rights notes with each uploaded hero image. |
| `articles` | Stores the draft body, author, display timestamp, SEO fields, geography and featured/Open Graph image IDs. |
| Article relation tables | Link categories, tags, topics, SEO keywords, companies, people, events and locations through canonical backend records. |
| `workflow_audit_log` | Records that each article entered the backend as an unpublished draft from this batch. |

## Import Behavior

Each article is validated for a unique title, slug, focus keyword and canonical announcement key. The body must contain 800–1,400 words. Every record must link to LEAP 2026, DeepFest 2026, or both; include at least one company or institution; use the Saudi Arabia/Riyadh coverage mapping; carry complete SEO fields; cite an HTTPS primary source with adequate research confidence; and include an existing 1600×900 image file with alt text, caption, credit and license metadata.

The importer resolves the canonical **TechScoop Desk** author, both event records, Saudi Arabia, Riyadh and the initial editorial workflow status before execution. Taxonomy and entity rows are resolved by normalized name or slug, with controlled creation of missing taxonomy/entity records. Article and relation writes run in a per-article transaction. An existing article slug is never overwritten.

## Commands

Use `pnpm editorial:validate:leap` for the default database-free validation pass. The command reads `content/leap-deepfest-2026/final/import-manifest.json` and performs no database writes.

The execution command is `pnpm editorial:import:leap`. It requires the deployed backend environment with `DATABASE_URL`, storage configuration, the canonical TechScoop Desk user, and the LEAP 2026 and DeepFest 2026 event rows. Its explicit `--execute --confirm-unpublished-drafts` flags are built into the package command to make intent auditable.

## Review Sequence

Editors should first review the generated article and image package, run the validation command, apply migration `0051_editorial_batch_provenance.sql`, and only then run the import command in the backend environment. The resulting rows remain drafts. Publication is outside this batch workflow and requires a separate, deliberate action through the existing editorial system.
