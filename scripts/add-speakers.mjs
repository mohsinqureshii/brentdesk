/**
 * Add Speakers Script
 * Adds speakers to existing events
 */

import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!urlMatch) {
  console.error('Invalid DATABASE_URL format');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

// Helper to generate slug
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function main() {
  console.log('Connecting to database...');
  
  const connection = await mysql.createConnection({
    host,
    port: parseInt(port),
    user,
    password,
    database,
    ssl: { rejectUnauthorized: true }
  });

  console.log('Connected to database');

  // Read scraped data
  const scrapedData = JSON.parse(fs.readFileSync('/home/ubuntu/scrape_mena_events_batch1.json', 'utf8'));
  
  // Get published status ID
  const [statusRows] = await connection.execute(
    "SELECT id FROM workflow_statuses WHERE slug = 'published' LIMIT 1"
  );
  const publishedStatusId = statusRows[0]?.id || 6;
  console.log('Published status ID:', publishedStatusId);

  let speakersInserted = 0;
  let peopleCreated = 0;

  for (const result of scrapedData.results) {
    if (result.error || !result.output.speakers_json || result.output.speakers_json === '[]') {
      continue;
    }

    const event = result.output;
    const eventSlug = generateSlug(event.event_name);
    
    // Get event ID
    const [eventRows] = await connection.execute(
      'SELECT id FROM events WHERE slug = ? LIMIT 1',
      [eventSlug]
    );
    
    if (eventRows.length === 0) {
      console.log(`Event not found: ${event.event_name}`);
      continue;
    }
    
    const eventId = eventRows[0].id;
    console.log(`\nProcessing speakers for: ${event.event_name} (ID: ${eventId})`);

    try {
      const speakers = JSON.parse(event.speakers_json);
      
      for (const speaker of speakers) {
        if (!speaker.name) continue;
        
        // Check if speaker already exists for this event
        const [existingSpeaker] = await connection.execute(
          'SELECT id FROM event_speakers WHERE eventId = ? AND name = ? LIMIT 1',
          [eventId, speaker.name]
        );
        
        if (existingSpeaker.length > 0) {
          console.log(`  Speaker already exists: ${speaker.name}`);
          continue;
        }

        // Check if person exists
        const personSlug = generateSlug(speaker.name);
        const [existingPerson] = await connection.execute(
          'SELECT id FROM people WHERE slug = ? LIMIT 1',
          [personSlug]
        );

        let personId = null;
        if (existingPerson.length > 0) {
          personId = existingPerson[0].id;
        } else {
          // Insert new person
          const [personResult] = await connection.execute(
            `INSERT INTO people (name, slug, title, company, isVerified, statusId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, 0, ?, NOW(), NOW())`,
            [
              speaker.name,
              personSlug,
              speaker.title || null,
              speaker.company !== 'N/A' ? speaker.company : null,
              publishedStatusId
            ]
          );
          personId = personResult.insertId;
          peopleCreated++;
          console.log(`  Created person: ${speaker.name} (ID: ${personId})`);
        }

        // Link speaker to event
        await connection.execute(
          `INSERT INTO event_speakers (eventId, name, title, company, personId, isFeatured, sortOrder, createdAt)
           VALUES (?, ?, ?, ?, ?, 0, 0, NOW())`,
          [eventId, speaker.name, speaker.title || null, speaker.company !== 'N/A' ? speaker.company : null, personId]
        );
        speakersInserted++;
        console.log(`  Added speaker: ${speaker.name}`);
      }
    } catch (e) {
      console.log(`  Error processing speakers: ${e.message}`);
    }
  }

  console.log('\n=== Speaker Import Summary ===');
  console.log(`People created: ${peopleCreated}`);
  console.log(`Speakers linked: ${speakersInserted}`);

  await connection.end();
  console.log('Done!');
}

main().catch(console.error);
