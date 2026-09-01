# Cloudflare SEO Edge Worker

This Worker is the canonical fix for Manus platform edge interception of
`/sitemap*.xml` and `/robots.txt`. Without it, Google Search Console receives
the SPA "Article Not Found" HTML for every sitemap URL.

## What it does

1. Catches every request for an SEO file at the apex path.
2. Internally rewrites it to the `/api/<file>` counterpart on origin (which
   the Manus edge does not intercept — verified in `server/_core/index.ts`).
3. Falls back to the static file written by `scripts/generate-sitemaps.ts`
   if the dynamic route returns 5xx.
4. Strips any `X-Robots-Tag: noindex` injected by the platform and pins
   `Cache-Control: public, max-age=3600, s-maxage=3600`.
5. Refuses to serve `text/html` for `.xml`/`.txt` URLs — if the Manus
   fallback ever leaks past, the Worker returns an empty-but-valid sitemap
   so Google never sees HTML at an XML path.

## Deploy

**Auto-deploy via GitHub Actions** (default — no manual step needed):
The workflow at `.github/workflows/deploy-cloudflare-worker.yml` runs
`wrangler deploy` whenever any file under `cloudflare/` changes on `main`.
Requires the `CLOUDFLARE_API_TOKEN` repo secret (Workers:Edit + Zone:Read
scope).

**Manual deploy** (only if the GitHub Action is disabled or rotating tokens):

```bash
cd cloudflare
npx wrangler login
npx wrangler deploy
```

Verify immediately after deploy:

```bash
curl -sI https://techscoop.io/sitemap.xml | grep -iE 'content-type|x-seo-worker'
# Expected:
#   content-type: application/xml; charset=utf-8
#   x-seo-worker: v1

curl -s https://techscoop.io/sitemap-companies.xml | head -3
# Expected:
#   <?xml version="1.0" encoding="UTF-8"?>
#   <urlset xmlns="...">
```

## Rollback

```bash
npx wrangler delete techscoop-seo-worker
```

After deletion, root sitemap URLs revert to whatever Manus serves; the
`/api/sitemap-*.xml` routes always remain functional regardless.
