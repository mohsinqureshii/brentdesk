# LEAP 2026 and DeepFest 2026 Live-Page Audit

**Checked:** 2026-08-31 (Asia/Riyadh)

| Page | Current public state | Existing updates | Event image | Implication for draft import |
|---|---|---:|---|---|
| `https://techscoop.io/events/leap-2026/live` | Live shell with “Live coverage starts soon” | 0 | Official LEAP logo hosted at `file.onegiantleap.com` | New full articles must be linked through `article_events`; public event resolution already filters to editorial `published`, so draft records remain hidden. |
| `https://techscoop.io/events/deepfest-2026/live` | Live shell with “Live coverage starts soon” | 0 | DeepFest event image hosted at `m.eyeofriyadh.com` | New full articles must be linked through `article_events`; pending/draft content must not be inserted as approved live posts. |

Both pages describe events running **31 August–3 September 2026** in Riyadh and currently contain no live updates or linked coverage visible in the live view. The backend has two related mechanisms: `event_live_posts` for short reverse-chronological updates and `article_events` for full linked articles. The user requested full 1–3 page articles, so the canonical content should be inserted into `articles` in the editorial initial status, related through `article_events`, and kept out of the public pages until review and publication.

## Backend Visibility Findings

The public `events.listLivePosts` query requires `approvalStatus='approved'` and `isDeleted=0`. The public event article resolver requires the article workflow status to be `published`; admin may request unpublished links for review. Therefore, a proper review-only workflow is possible without weakening public visibility protections.
