import { searchImages } from './server/services/ai/imageSearch.service.ts';

async function main() {
  try {
    // Test browse mode (empty query)
    const browse = await searchImages({ query: '', count: 12 });
    console.log('Browse results:', browse.length);
    
    // Test with broader query
    const broad = await searchImages({ query: 'startup funding', count: 12 });
    console.log('Startup funding results:', broad.length);
    broad.forEach(r => console.log('-', r.title, '|', r.source));
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}
main();
