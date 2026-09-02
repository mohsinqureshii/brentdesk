import { describe, it, expect } from "vitest";
import { generatePrerenderedContent } from "./ssr.service";

/** Minimal article shape for the crawler-block generator. */
const base: any = {
  title: "T", description: "d", content: "", category: null, author: null,
  publishedAt: null, related: [],
};
/** The sanitized body only. The surrounding <noscript>/<article>/<div>
 *  wrapper is generated markup, so asserting against the whole string
 *  produces false positives on "script" and "<div". */
const render = (content: string) => {
  const html = generatePrerenderedContent({ ...base, content });
  const m = /<div>([\s\S]*?)<\/div>/.exec(html);
  if (!m) throw new Error("no body div in generated crawler block");
  return m[1];
};

describe("crawler block sanitizer", () => {
  it("keeps contextual links, which are the whole point of internal linking", () => {
    const html = render('<p>See <a href="/energy/tanajib-gas">Tanajib</a> for detail.</p>');
    expect(html).toContain('<a href="/energy/tanajib-gas">Tanajib</a>');
  });

  it("keeps absolute https citations", () => {
    expect(render('<p><a href="https://www.aramco.com/x">Aramco</a></p>'))
      .toContain('<a href="https://www.aramco.com/x">Aramco</a>');
  });

  it("keeps basic emphasis and paragraphs", () => {
    const html = render("<p>A <strong>b</strong> and <em>c</em>.</p>");
    expect(html).toContain("<strong>b</strong>");
    expect(html).toContain("<em>c</em>");
    expect(html).toContain("<p>");
  });

  it("drops a script tag entirely, leaving no trace", () => {
    const html = render('<p>x</p><script>alert(1)</script>');
    expect(html).not.toContain("script");
    expect(html).not.toContain("alert(1)</");
  });

  it("strips a javascript: href but keeps the anchor text", () => {
    const html = render('<p><a href="javascript:alert(1)">click</a></p>');
    expect(html).not.toContain("javascript:");
    expect(html).toContain("<a>click</a>");
  });

  it("strips a data: href", () => {
    expect(render('<p><a href="data:text/html,<b>x">y</a></p>')).not.toContain("data:");
  });

  it("rejects a protocol-relative href, which can leave the site", () => {
    expect(render('<p><a href="//evil.example/x">y</a></p>')).not.toContain("evil.example");
  });

  it("drops event handlers rather than passing attributes through", () => {
    const html = render('<p><a href="/x" onclick="steal()">y</a></p>');
    expect(html).not.toContain("onclick");
    expect(html).toContain('<a href="/x">y</a>');
  });

  it("escapes bare angle brackets in prose", () => {
    expect(render("<p>5 < 7 and a > b</p>")).not.toMatch(/[^&]< 7/);
  });

  it("escapes a quote inside an href", () => {
    const html = render('<p><a href="/a&quot;onmouseover=x">y</a></p>');
    expect(html).not.toContain('"onmouseover');
  });

  it("does not emit an unclosed tag as raw markup", () => {
    expect(render("<p>x</p><div")).not.toContain("<div");
  });
});
