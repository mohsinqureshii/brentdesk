/**
 * Import Events Script
 * Batch imports scraped events into the database
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

// Helper to parse date string like "13-16 Apr 2026" or "1-4 Feb 2026"
function parseDateRange(dateStr) {
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  // Match patterns like "13-16 Apr 2026" or "22 Apr 2026"
  const rangeMatch = dateStr.match(/(\d{1,2})(?:-(\d{1,2}))?\s+(\w{3})\s+(\d{4})/);
  if (!rangeMatch) return { startDate: null, endDate: null };
  
  const [, startDay, endDay, month, year] = rangeMatch;
  const monthNum = months[month];
  
  const startDate = new Date(parseInt(year), monthNum, parseInt(startDay));
  const endDate = endDay 
    ? new Date(parseInt(year), monthNum, parseInt(endDay))
    : new Date(parseInt(year), monthNum, parseInt(startDay));
  
  return { startDate, endDate };
}

// Map event type string to enum value
function mapEventType(typeStr) {
  const typeMap = {
    'Conference': 'conference',
    'Conference & Expo': 'conference',
    'Expo & Conference': 'conference',
    'Summit': 'summit',
    'Expo': 'conference',
    'Mega Expo': 'conference',
    'Startup Expo': 'conference',
    'Forum': 'summit',
    'Webinar': 'webinar',
    'Workshop': 'workshop',
    'Meetup': 'meetup',
    'Hackathon': 'hackathon',
    'Demo Day': 'other'
  };
  return typeMap[typeStr] || 'other';
}

// Featured events (major ones)
const featuredEvents = [
  'LEAP 2026',
  'GITEX Global 2026',
  'Web Summit Qatar 2026',
  'Future Investment Initiative',
  'Black Hat MEA',
  'Expand North Star'
];

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
  
  // Get the "published" status ID for events
  const [statusRows] = await connection.execute(
    "SELECT id FROM workflow_statuses WHERE slug = 'published' LIMIT 1"
  );
  const publishedStatusId = statusRows[0]?.id || 4;
  console.log('Published status ID:', publishedStatusId);

  // Check existing events to avoid duplicates
  const [existingEvents] = await connection.execute('SELECT slug FROM events');
  const existingSlugs = new Set(existingEvents.map(e => e.slug));
  console.log('Existing events:', existingSlugs.size);

  let insertedCount = 0;
  let skippedCount = 0;
  let speakersInserted = 0;

  for (const result of scrapedData.results) {
    if (result.error) {
      console.log(`Skipping failed scrape: ${result.input}`);
      skippedCount++;
      continue;
    }

    const event = result.output;
    const inputParts = result.input.split('|');
    const [eventName, city, country, dates, eventType, focus] = inputParts;
    
    // Generate slug
    let slug = generateSlug(event.event_name || eventName);
    
    // Check for duplicates
    if (existingSlugs.has(slug)) {
      console.log(`Skipping duplicate: ${slug}`);
      skippedCount++;
      continue;
    }

    // Parse dates
    const { startDate, endDate } = parseDateRange(dates);
    if (!startDate) {
      console.log(`Skipping event with invalid date: ${eventName}`);
      skippedCount++;
      continue;
    }

    // Determine if featured
    const isFeatured = featuredEvents.some(fe => 
      event.event_name?.includes(fe) || eventName.includes(fe)
    );

    // Insert event
    try {
      const [insertResult] = await connection.execute(
        `INSERT INTO events (
          title, slug, tagline, description, shortDescription,
          type, format, venueName, venueAddress, city, country,
          startDate, endDate, timezone,
          websiteUrl, registrationUrl, featuredImage,
          organizerName, expectedAttendees,
          isFeatured, statusId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          event.event_name || eventName,
          slug,
          event.tagline !== 'N/A' ? event.tagline : null,
          event.description !== 'N/A' ? event.description : null,
          event.short_description !== 'N/A' ? event.short_description : null,
          mapEventType(eventType),
          'in_person',
          event.venue_name !== 'N/A' ? event.venue_name : null,
          event.venue_address !== 'N/A' ? event.venue_address : null,
          city,
          country,
          startDate,
          endDate,
          'Asia/Dubai',
          event.website_url !== 'N/A' ? event.website_url : null,
          event.registration_url !== 'N/A' ? event.registration_url : null,
          event.featured_image_url !== 'N/A' ? event.featured_image_url : null,
          event.organizer_name !== 'N/A' ? event.organizer_name : null,
          event.expected_attendees || null,
          isFeatured ? 1 : 0,
          publishedStatusId
        ]
      );

      const eventId = insertResult.insertId;
      existingSlugs.add(slug);
      insertedCount++;
      console.log(`Inserted event: ${event.event_name || eventName} (ID: ${eventId})${isFeatured ? ' [FEATURED]' : ''}`);

      // Insert speakers if available
      if (event.speakers_json && event.speakers_json !== '[]') {
        try {
          const speakers = JSON.parse(event.speakers_json);
          for (const speaker of speakers) {
            if (speaker.name) {
              // Check if person exists
              const personSlug = generateSlug(speaker.name);
              const [existingPerson] = await connection.execute(
                'SELECT id FROM people WHERE slug = ? LIMIT 1',
                [personSlug]
              );

              let personId;
              if (existingPerson.length > 0) {
                personId = existingPerson[0].id;
              } else {
                // Get published status for people
                const [peopleStatusRows] = await connection.execute(
                  "SELECT id FROM workflow_statuses WHERE slug = 'published' LIMIT 1"
                );
                const peopleStatusId = peopleStatusRows[0]?.id || 6;
                
                // Insert new person
                const [personResult] = await connection.execute(
                  `INSERT INTO people (name, slug, title, company, isVerified, statusId, createdAt, updatedAt)
                   VALUES (?, ?, ?, ?, 0, ?, NOW(), NOW())`,
                  [
                    speaker.name,
                    personSlug,
                    speaker.title || null,
                    speaker.company !== 'N/A' ? speaker.company : null,
                    peopleStatusId
                  ]
                );
                personId = personResult.insertId;
                console.log(`  Created person: ${speaker.name} (ID: ${personId})`);
              }

              // Link speaker to event
              await connection.execute(
                `INSERT INTO event_speakers (eventId, name, title, company, personId, isFeatured, sortOrder, createdAt)
                 VALUES (?, ?, ?, ?, ?, 0, 0, NOW())`,
                [eventId, speaker.name, speaker.title || null, speaker.company !== 'N/A' ? speaker.company : null, personId]
              );
              speakersInserted++;
            }
          }
        } catch (e) {
          console.log(`  Warning: Could not parse speakers for ${event.event_name}: ${e.message}`);
        }
      }

    } catch (e) {
      console.error(`Error inserting event ${eventName}: ${e.message}`);
      skippedCount++;
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Events inserted: ${insertedCount}`);
  console.log(`Events skipped: ${skippedCount}`);
  console.log(`Speakers linked: ${speakersInserted}`);

  await connection.end();
  console.log('Done!');
}

main().catch(console.error);
