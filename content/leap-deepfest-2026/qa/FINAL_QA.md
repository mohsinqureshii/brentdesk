# LEAP and DeepFest 2026 Editorial QA Acceptance

The 100-article package has completed deterministic, visual and independent source-bound editorial review. All records remain unpublished drafts attributed to **TechScoop Desk**. The final body set contains no blocking errors or warnings under the repository preflight standard.

| Acceptance metric | Final result |
|---|---:|
| Draft articles | 100 |
| Unique titles | 100 |
| Unique slugs | 100 |
| Unique canonical announcement keys | 100 |
| Unique focus keywords | 100 |
| Unique final images | 100 |
| Word-count range | 850–1,235 |
| Mean article-body length | 1,009.5 words |
| Missing sources | 0 |
| Unapproved source links | 0 |
| Missing images or image metadata | 0 |
| Draft-status violations | 0 |
| Deterministic errors | 0 |
| Deterministic warnings | 0 |
| Sentences repeated in three or more articles | 0 |

## Editorial review history

The first independent factual and newsroom-quality review examined all 100 drafts against their embedded verified angle, facts, sources and entity assignments. It identified 45 articles requiring correction, including eight with unsupported-detail risks and a wider group with repetition, filler, promotional language or keyword-stuffing concerns. All identified items were rewritten without changing locked metadata.

A second review of the corrected set narrowed the remaining material issues to 19 drafts. Those articles received a more restrained source-bounded rewrite. A closing review then isolated 12 outliers that still needed tighter fact density or removal of generic language. Those bodies were rewritten again at a shorter 850–1,000-word target. The final material-issue verification found no unsupported factual claims; four exact or generic passages were examined and resolved where present. Two reviewer-reported “duplicates” appeared only once in the files and therefore required no duplicate removal.

## Duplication assessment

The deterministic audit found no exact sentence repeated in three or more articles. Pairwise cosine similarity remains elevated for some articles because the entire batch covers the same events, geography, institutions and recurring infrastructure vocabulary. That similarity does not represent repeated news: the source-clustering ledger contains 100 different canonical announcement keys, and every story is tied to its own verified angle and primary source.

## Image acceptance

All 100 story-specific hero images are original TechScoop editorial illustrations. Every file is a unique 1600×900 WebP asset with a distinct SHA-256 hash. Each image carries alt text, caption, credit, source, license, rights status and rights notes. The four contact-sheet reviews found no fatal text, logo, watermark, recognizable invented executive face, unusable crop or technical rendering issue.

## Backend readiness

The package is ready for construction of `final/import-manifest.json` and the database-free `pnpm editorial:validate:leap` pass. Passing QA does not publish or import any record. Database execution remains a separate, explicit draft-only operation requiring a configured backend environment and the command’s unpublished-draft confirmation guard.
