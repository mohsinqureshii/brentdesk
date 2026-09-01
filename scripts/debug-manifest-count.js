import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("content/leap-deepfest-2026/final/import-manifest.json", "utf8"));
const article = manifest.articles.find((item) => item.sequence === 33);
const referencesHeading = /<h[1-6][^>]*>\s*References\s*<\/h[1-6]>/i;
const match = referencesHeading.exec(article.content_html);
const body = match?.index === undefined ? article.content_html : article.content_html.slice(0, match.index);
const stripped = body.replace(/<[^>]+>/g, " ").replace(/&[a-z0-9#]+;/gi, " ").replace(/\s+/g, " ").trim();
const words = stripped.split(/\s+/).filter(Boolean);
console.log(JSON.stringify({ sequence: article.sequence, stored: article.content_word_count, references_index: match?.index ?? null, computed: words.length, last_words: words.slice(-30) }, null, 2));
