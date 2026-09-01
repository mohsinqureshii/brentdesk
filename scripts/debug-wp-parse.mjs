import fs from 'fs';

const sql = fs.readFileSync('/home/ubuntu/upload/techzfye_wp189.sql', 'utf-8');

// Check if we can find the posts INSERT
const postsMatch = sql.match(/INSERT INTO `wp8s_posts`[^V]+VALUES/);
console.log('Found posts INSERT:', !!postsMatch);

// Get the start position
const startIdx = sql.indexOf("INSERT INTO `wp8s_posts`");
console.log('Start index:', startIdx);

if (startIdx > -1) {
  // Find the end of the INSERT statement
  const afterStart = sql.substring(startIdx);
  const valuesIdx = afterStart.indexOf('VALUES');
  console.log('VALUES at:', valuesIdx);
  
  // Get first few records
  const sample = afterStart.substring(valuesIdx, valuesIdx + 3000);
  console.log('\nSample (first 1500 chars):');
  console.log(sample.substring(0, 1500));
}

// Count post types
const postTypeMatches = sql.match(/'post'/g);
console.log('\nCount of "post" strings:', postTypeMatches?.length || 0);

// Find actual post records
const postRecordPattern = /\(\d+,\s*\d+,\s*'\d{4}-\d{2}-\d{2}/g;
const postRecords = sql.match(postRecordPattern);
console.log('Post record patterns found:', postRecords?.length || 0);
