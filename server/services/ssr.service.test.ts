import { describe, it, expect } from "vitest";
import {
  generateMetaTags,
  generateJsonLd,
  generatePrerenderedContent,
  injectSSRContent,
} from "./ssr.service";

describe("SSR Service", () => {
  const mockArticle = {
    title: "Test Article Title",
    description: "This is a test article description for SEO purposes.",
    image: "https://example.com/image.jpg",
    url: "https://techscoop.io/startups/test-article",
    publishedAt: new Date("2026-01-15T10:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-20T15:30:00Z").toISOString(),
    author: {
      name: "John Doe",
      url: "https://techscoop.io/people/johndoe",
      image: "https://example.com/avatar.jpg",
    },
    category: {
      name: "Startups",
      slug: "startups",
    },
    content: "<p>This is the article content with <strong>HTML</strong> tags.</p>",
  };

  describe("generateMetaTags", () => {
    it("should generate correct title tag", () => {
      const metaTags = generateMetaTags(mockArticle);
      expect(metaTags).toContain("<title>Test Article Title | TechScoop</title>");
    });

    it("should generate meta description", () => {
      const metaTags = generateMetaTags(mockArticle);
      expect(metaTags).toContain('name="description"');
      expect(metaTags).toContain("This is a test article description");
    });

    it("should generate Open Graph tags", () => {
      const metaTags = generateMetaTags(mockArticle);
      expect(metaTags).toContain('property="og:type" content="article"');
      expect(metaTags).toContain('property="og:url"');
      expect(metaTags).toContain('property="og:title"');
      expect(metaTags).toContain('property="og:description"');
      expect(metaTags).toContain('property="og:image"');
    });

    it("should generate Twitter card tags", () => {
      const metaTags = generateMetaTags(mockArticle);
      expect(metaTags).toContain('name="twitter:card" content="summary_large_image"');
      expect(metaTags).toContain('name="twitter:title"');
    });

    it("should generate canonical URL", () => {
      const metaTags = generateMetaTags(mockArticle);
      expect(metaTags).toContain('rel="canonical"');
      expect(metaTags).toContain("https://techscoop.io/startups/test-article");
    });

    it("should escape HTML special characters", () => {
      const articleWithSpecialChars = {
        ...mockArticle,
        title: 'Test "Article" with <special> & characters',
      };
      const metaTags = generateMetaTags(articleWithSpecialChars);
      expect(metaTags).toContain("&lt;special&gt;");
      expect(metaTags).toContain("&amp;");
      expect(metaTags).toContain("&quot;");
    });
  });

  describe("generateJsonLd", () => {
    it("should generate NewsArticle schema", () => {
      const jsonLd = generateJsonLd(mockArticle);
      expect(jsonLd).toContain('"@type":"NewsArticle"');
      expect(jsonLd).toContain('"headline":"Test Article Title"');
    });

    it("should include author information", () => {
      const jsonLd = generateJsonLd(mockArticle);
      expect(jsonLd).toContain('"@type":"Person"');
      expect(jsonLd).toContain('"name":"John Doe"');
    });

    it("should include publisher information", () => {
      const jsonLd = generateJsonLd(mockArticle);
      expect(jsonLd).toContain('"@type":"Organization"');
      expect(jsonLd).toContain('"name":"TechScoop"');
    });

    it("should generate BreadcrumbList schema", () => {
      const jsonLd = generateJsonLd(mockArticle);
      expect(jsonLd).toContain('"@type":"BreadcrumbList"');
      expect(jsonLd).toContain('"name":"Home"');
      expect(jsonLd).toContain('"name":"Startups"');
    });

    it("should include dates in ISO format", () => {
      const jsonLd = generateJsonLd(mockArticle);
      expect(jsonLd).toContain('"datePublished":"2026-01-15T10:00:00.000Z"');
      expect(jsonLd).toContain('"dateModified":"2026-01-20T15:30:00.000Z"');
    });
  });

  describe("generatePrerenderedContent", () => {
    it("should wrap content in noscript tag", () => {
      const content = generatePrerenderedContent(mockArticle);
      expect(content).toContain("<noscript>");
      expect(content).toContain("</noscript>");
    });

    it("should include article title", () => {
      const content = generatePrerenderedContent(mockArticle);
      expect(content).toContain("<h1>Test Article Title</h1>");
    });

    it("should include category", () => {
      const content = generatePrerenderedContent(mockArticle);
      expect(content).toContain("Category: Startups");
    });

    it("should include author name", () => {
      const content = generatePrerenderedContent(mockArticle);
      expect(content).toContain("By John Doe");
    });

    it("should strip HTML tags from content", () => {
      const content = generatePrerenderedContent(mockArticle);
      expect(content).not.toContain("<strong>");
      expect(content).toContain("This is the article content with HTML tags.");
    });
  });

  describe("injectSSRContent", () => {
    const template = `<!DOCTYPE html>
<html>
<head>
<title>Default Title</title>
</head>
<body>
<div id="root"></div>
</body>
</html>`;

    it("should inject meta tags before </head>", () => {
      const metaTags = '<meta name="test" content="value" />';
      const result = injectSSRContent(template, metaTags, "", "");
      expect(result).toContain(metaTags);
      expect(result.indexOf(metaTags)).toBeLessThan(result.indexOf("</head>"));
    });

    it("should inject JSON-LD before </head>", () => {
      const jsonLd = '<script type="application/ld+json">{"test":true}</script>';
      const result = injectSSRContent(template, "", jsonLd, "");
      expect(result).toContain(jsonLd);
    });

    it("should inject prerendered content inside root div", () => {
      const prerendered = "<noscript><article>Content</article></noscript>";
      const result = injectSSRContent(template, "", "", prerendered);
      expect(result).toContain(`<div id="root">${prerendered}</div>`);
    });
  });
});
