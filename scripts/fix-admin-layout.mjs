#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const filesToFix = [
  'client/src/pages/admin/ai/APIAccess.tsx',
  'client/src/pages/admin/ai/BatchGeneration.tsx',
  'client/src/pages/admin/ai/CompetitiveIntel.tsx',
  'client/src/pages/admin/ai/ContentCalendar.tsx',
  'client/src/pages/admin/ai/ContentComparison.tsx',
  'client/src/pages/admin/ai/PlagiarismCheck.tsx',
  'client/src/pages/admin/ai/SEOTools.tsx',
  'client/src/pages/admin/ai/ScriptGenerator.tsx',
  'client/src/pages/admin/ai/SocialMedia.tsx',
  'client/src/pages/admin/ai/ToneAnalyzer.tsx',
  'client/src/pages/admin/ai/Webhooks.tsx',
];

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already has AdminLayout
  if (content.includes('AdminLayout')) {
    console.log(`✓ ${filePath} - already has AdminLayout`);
    return;
  }

  // Add AdminLayout import after other imports
  const lastImportMatch = content.match(/^import .+?;$/m);
  if (!lastImportMatch) {
    console.log(`✗ ${filePath} - no imports found`);
    return;
  }

  const lastImportEnd = content.indexOf(lastImportMatch[0]) + lastImportMatch[0].length;
  content = content.slice(0, lastImportEnd) + '\nimport { AdminLayout } from "@/components/admin/AdminLayout";' + content.slice(lastImportEnd);

  // Find the return statement and wrap with AdminLayout
  const returnMatch = content.match(/return \(/);
  if (!returnMatch) {
    console.log(`✗ ${filePath} - no return statement found`);
    return;
  }

  const returnIndex = content.indexOf('return (') + 8;
  
  // Find the matching closing parenthesis
  let parenCount = 1;
  let i = returnIndex;
  while (i < content.length && parenCount > 0) {
    if (content[i] === '(') parenCount++;
    if (content[i] === ')') parenCount--;
    i++;
  }

  const returnContent = content.slice(returnIndex, i - 1).trim();
  
  // Replace the return statement
  const newReturn = `return (\n    <AdminLayout>\n      ${returnContent}\n    </AdminLayout>\n  );`;
  
  content = content.slice(0, content.indexOf('return (')) + newReturn + content.slice(i);

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✓ ${filePath} - fixed`);
}

console.log('Fixing admin pages with AdminLayout wrapper...\n');
filesToFix.forEach(fixFile);
console.log('\nDone!');
