import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { vi } from 'vitest';
// The operator-managed redirects table, stood in for by one known row.
vi.mock('../services/slug.service', () => ({
  slugService: {
    getRedirect: async (path: string) =>
      path === '/construction/old-merged-article' ? { toPath: '/construction/kept-article', statusCode: 301 } : null,
  },
}));
import seoMiddleware from './seoMiddleware';

// Mount the real SEO middleware in a minimal Express app served on an
// ephemeral port. Requests that no handler claims fall through to Express's
// default 404. Redirects are inspected manually (no auto-follow).
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(seoMiddleware);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

async function get(path: string) {
  const res = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()) as Record<string, string>,
  };
}

describe('SEO Middleware URL Patterns', () => {
  describe('WordPress legacy URLs', () => {
    const wpPatterns = [
      '/wp-admin/',
      '/wp-admin/admin-ajax.php',
      '/wp-content/uploads/image.jpg',
      '/wp-login.php',
      '/wp-includes/js/jquery.js',
      '/wp-json/wp/v2/posts',
      '/xmlrpc.php',
    ];

    it('should match WordPress URL patterns', () => {
      const wpRegex = /^\/(wp-admin|wp-content|wp-includes|wp-login|wp-json|xmlrpc)/;
      for (const url of wpPatterns) {
        expect(wpRegex.test(url), `Expected ${url} to match WP pattern`).toBe(true);
      }
    });

    it('should not match normal URLs', () => {
      const wpRegex = /^\/(wp-admin|wp-content|wp-includes|wp-login|wp-json|xmlrpc)/;
      const normalUrls = ['/tag/fintech', '/category/ai', '/news/article-slug', '/admin/dashboard'];
      for (const url of normalUrls) {
        expect(wpRegex.test(url), `Expected ${url} to NOT match WP pattern`).toBe(false);
      }
    });
  });

  describe('Admin page noindex detection', () => {
    it('should detect admin paths', () => {
      const adminPaths = [
        '/admin/articles',
        '/admin/dashboard',
        '/admin/taxonomy/tags',
        '/admin/seo-health',
        '/admin/events',
        '/admin/funding',
      ];
      for (const path of adminPaths) {
        expect(path.startsWith('/admin'), `Expected ${path} to be admin`).toBe(true);
      }
    });

    it('should detect login path', () => {
      expect('/login'.startsWith('/login')).toBe(true);
      expect('/admin/login'.startsWith('/admin')).toBe(true);
    });
  });

  describe('Legacy tag-feed URLs are no longer special-cased', () => {
    // The previous publication's WordPress-era /tag/*/feed 410 handlers were
    // deliberately dropped (BrentDesk does not inherit that URL history —
    // see the NOTE in seoMiddleware.ts). Those URLs now simply fall through.
    it('lets /tag/:slug/feed fall through to a normal 404', async () => {
      const res = await get('/tag/fintech/feed');
      expect(res.status).toBe(404);
    });
  });

  describe('Trailing slash normalization', () => {
    it('should detect trailing slashes on content pages', () => {
      const trailingSlashPaths = [
        '/tag/fintech/',
        '/category/ai/',
        '/news/article-slug/',
        '/funding-vc/some-article/',
      ];
      for (const path of trailingSlashPaths) {
        expect(path.endsWith('/') && path.length > 1, `Expected ${path} to have trailing slash`).toBe(true);
      }
    });

    it('should not flag root path', () => {
      expect('/'.endsWith('/') && '/'.length > 1).toBe(false);
    });
  });

  describe('Old tag/topic query parameter redirect', () => {
    it('should detect /news?tag=X pattern', () => {
      const url = new URL('http://localhost/news?tag=fintech');
      expect(url.pathname).toBe('/news');
      expect(url.searchParams.get('tag')).toBe('fintech');
    });

    it('should detect /news?topic=X pattern', () => {
      const url = new URL('http://localhost/news?topic=ai');
      expect(url.pathname).toBe('/news');
      expect(url.searchParams.get('topic')).toBe('ai');
    });

    it('should generate correct redirect slug', () => {
      const tag = 'saudi arabia';
      const slug = tag.toLowerCase().replace(/\s+/g, '-');
      expect(slug).toBe('saudi-arabia');
    });
  });

  describe('Events canonical', () => {
    it('should detect events with city filter', () => {
      const url = new URL('http://localhost/events?city=Dubai');
      expect(url.pathname).toBe('/events');
      expect(url.searchParams.has('city')).toBe(true);
    });
  });

  describe('Legacy WordPress-era one-off redirects were dropped', () => {
    // The previous publication carried handlers for its historical URL
    // shapes (/2025 year archives, /subscribe, /typography, /homepage, ...).
    // BrentDesk deliberately does not inherit that URL history; these paths
    // fall through the middleware untouched (Express default 404 here).
    const legacyPaths = ['/2025', '/subscribe', '/typography', '/homepage'];

    for (const path of legacyPaths) {
      it(`does not intercept ${path}`, async () => {
        const res = await get(path);
        expect(res.status).toBe(404);
      });
    }

    it('still normalizes their trailing-slash variants like any other path', async () => {
      const res = await get('/homepage/');
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('/homepage');
    });
  });

  describe('Live middleware behavior', () => {
    it('returns 410 Gone for WordPress probe URLs', async () => {
      for (const path of ['/wp-login.php', '/xmlrpc.php', '/wp-admin/admin-ajax.php']) {
        const res = await get(path);
        expect(res.status, `${path} should be 410`).toBe(410);
      }
    });

    it('sets a noindex X-Robots-Tag on admin and login paths', async () => {
      for (const path of ['/admin/dashboard', '/login']) {
        const res = await get(path);
        expect(res.headers['x-robots-tag'], `${path} should carry noindex`).toBe('noindex, nofollow');
      }
    });

    it('normalizes /category/:slug to the canonical bare slug', async () => {
      const res = await get('/category/energy');
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('/energy');
    });

    it('redirects /category/news to /news without a redirect loop', async () => {
      const res = await get('/category/news');
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('/news');
    });

    it('redirects /e/:slug short links to /events/:slug preserving the query', async () => {
      const res = await get('/e/leap-2026?utm_source=x');
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('/events/leap-2026?utm_source=x');
    });

    it('strips trailing slashes from content URLs', async () => {
      const res = await get('/energy/');
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('/energy');
    });
  });
});

describe('redirects table', () => {
  let server: Server; let base: string;
  beforeAll(async () => {
    const app = express(); app.use(seoMiddleware); app.get('*', (_req, res) => res.status(200).send('ok'));
    await new Promise<void>(r => { server = app.listen(0, () => r()); });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>(r => server.close(() => r())));

  it('answers a merged article URL with a 301 to the kept one', async () => {
    const res = await fetch(base + '/construction/old-merged-article?utm=x', { redirect: 'manual' });
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/construction/kept-article?utm=x');
  });

  it('leaves an unknown path alone', async () => {
    const res = await fetch(base + '/construction/some-live-article', { redirect: 'manual' });
    expect(res.status).toBe(200);
  });
});
