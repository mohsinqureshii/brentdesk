import { seoService } from './server/services/seo.service.ts';

const xml = await seoService.generateSitemap('articles');
const urlCount = (xml.match(/<url>/g) || []).length;
console.log('URLs in generated sitemap:', urlCount);

// Show first and last URLs
const urlMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
console.log('\nFirst 3 URLs:');
urlMatches.slice(0, 3).forEach(u => console.log('  ' + u));
console.log('\nLast 3 URLs:');
urlMatches.slice(-3).forEach(u => console.log('  ' + u));
