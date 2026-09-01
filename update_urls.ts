import { getDb } from './server/db';
import { resources } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('Database not available');
    process.exit(1);
  }

  // Update templates to use PDF
  await db.update(resources)
    .set({ downloadUrl: '/downloads/templates/yc-safe-template.pdf' })
    .where(eq(resources.slug, 'yc-safe-agreement'));
  
  await db.update(resources)
    .set({ downloadUrl: '/downloads/templates/series-a-term-sheet.pdf' })
    .where(eq(resources.slug, 'series-a-term-sheet'));
  
  await db.update(resources)
    .set({ downloadUrl: '/downloads/templates/pitch-deck-template.pdf' })
    .where(eq(resources.slug, 'pitch-deck-template'));
  
  await db.update(resources)
    .set({ downloadUrl: '/downloads/templates/founder-agreement.pdf' })
    .where(eq(resources.slug, 'founder-agreement-template'));
  
  await db.update(resources)
    .set({ downloadUrl: '/downloads/templates/esop-template.pdf' })
    .where(eq(resources.slug, 'esop-template'));

  // Update playbooks to use PDF
  await db.update(resources)
    .set({ downloadUrl: '/downloads/playbooks/yc-startup-playbook.pdf' })
    .where(eq(resources.slug, 'yc-startup-playbook'));
  
  await db.update(resources)
    .set({ downloadUrl: '/downloads/playbooks/seed-fundraising-guide.pdf' })
    .where(eq(resources.slug, 'seed-fundraising-guide'));
  
  await db.update(resources)
    .set({ downloadUrl: '/downloads/playbooks/gtm-playbook.pdf' })
    .where(eq(resources.slug, 'gtm-strategy-playbook'));
  
  await db.update(resources)
    .set({ downloadUrl: '/downloads/playbooks/mena-market-entry.pdf' })
    .where(eq(resources.slug, 'mena-market-entry-guide'));
  
  await db.update(resources)
    .set({ downloadUrl: '/downloads/playbooks/technical-hiring.pdf' })
    .where(eq(resources.slug, 'technical-hiring-playbook'));

  console.log('Updated all download URLs to PDF');
  process.exit(0);
}

main().catch(console.error);
