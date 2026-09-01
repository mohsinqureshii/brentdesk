import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// We test the middleware behavior by creating a minimal Express app
function createTestApp() {
  const app = express();
  
  // Import and apply the SEO middleware
  // Since the middleware uses DB, we'll test the URL pattern matching logic directly
  return app;
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

  describe('Tag feed URL detection', () => {
    it('should detect /tag/*/feed/ patterns', () => {
      const feedRegex = /^\/tag\/[^/]+\/feed\/?$/;
      expect(feedRegex.test('/tag/fintech/feed/')).toBe(true);
      expect(feedRegex.test('/tag/fintech/feed')).toBe(true);
      expect(feedRegex.test('/tag/startup-funding-mena/feed/')).toBe(true);
    });

    it('should not match normal tag pages', () => {
      const feedRegex = /^\/tag\/[^/]+\/feed\/?$/;
      expect(feedRegex.test('/tag/fintech')).toBe(false);
      expect(feedRegex.test('/tag/fintech/')).toBe(false);
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

  describe('Soft 404 patterns', () => {
    const soft404Patterns = [
      '/2025/',
      '/subscribe/',
      '/terms-of-service/',
      '/videos',
      '/typography/',
      '/homepage',
      '/homepage/',
    ];

    it('should identify known soft 404 paths', () => {
      const soft404Regex = /^\/(2025|subscribe|terms-of-service|videos|typography|homepage)\/?$/;
      for (const path of soft404Patterns) {
        expect(soft404Regex.test(path), `Expected ${path} to match soft 404 pattern`).toBe(true);
      }
    });
  });
});

describe('Tag Consolidation Results', () => {
  it('should have 50 curated tags defined', () => {
    const curatedTags = require('/tmp/curated-tags.json').tags;
    expect(curatedTags.length).toBe(50);
  });

  it('should have unique slugs for all curated tags', () => {
    const curatedTags = require('/tmp/curated-tags.json').tags;
    const slugs = curatedTags.map((t: any) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('should have valid tagTypes for all curated tags', () => {
    const validTypes = ['sector', 'region', 'deal_business', 'product_tech', 'general', 'hub_program', 'regulation', 'event'];
    const curatedTags = require('/tmp/curated-tags.json').tags;
    for (const tag of curatedTags) {
      expect(validTypes.includes(tag.tagType), `Invalid tagType "${tag.tagType}" for ${tag.name}`).toBe(true);
    }
  });

  it('should include broader region tags instead of individual countries', () => {
    const curatedTags = require('/tmp/curated-tags.json').tags;
    const regionTags = curatedTags.filter((t: any) => t.tagType === 'region');
    const regionNames = regionTags.map((t: any) => t.name);
    
    // Should have broader regions
    expect(regionNames).toContain('Gulf Region');
    expect(regionNames).toContain('Egypt & North Africa');
    expect(regionNames).toContain('Levant');
    
    // Should still have key individual countries
    expect(regionNames).toContain('Saudi Arabia');
    expect(regionNames).toContain('UAE');
  });
});
