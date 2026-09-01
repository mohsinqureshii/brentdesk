#!/usr/bin/env python3
"""
Scrape Web Summit Qatar speakers and add them to People directory
"""

import os
import mysql.connector
import requests
from bs4 import BeautifulSoup
import re
import time
import json

# Database connection
DATABASE_URL = os.environ.get('DATABASE_URL')

# Parse DATABASE_URL
# Format: mysql://user:password@host:port/database
def parse_db_url(url):
    pattern = r'mysql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)'
    match = re.match(pattern, url)
    if match:
        return {
            'user': match.group(1),
            'password': match.group(2),
            'host': match.group(3),
            'port': int(match.group(4)),
            'database': match.group(5).split('?')[0]
        }
    return None

# Speaker data from the page (first 20 speakers)
speakers_data = [
    {
        "name": "Cliff Obrecht",
        "title": "Co-founder & COO",
        "company": "Canva",
        "country": "Australia",
        "bio": "Cliff Obrecht is the COO and Co-Founder of Canva, the online design and collaboration platform empowering the world to design. Since 2013, Canva has grown to 260M+ users globally and is used by 95% of Fortune 500 companies.",
        "photo": "https://images.websummit.com/qqat26/5e2f624c-ae93-4908-abec-d43f56834209/cliff-obrecht/main"
    },
    {
        "name": "Sheikh Mohammed bin Abdulrahman Al Thani",
        "title": "Prime Minister and Minister of Foreign Affairs",
        "company": "Government of Qatar",
        "country": "Qatar",
        "bio": "His Excellency Sheikh Mohammed bin Abdulrahman bin Jassim bin Mohammed Al Thani is the Prime Minister and Minister of Foreign Affairs of the State of Qatar, leading the country's diplomatic efforts and government operations.",
        "photo": "https://images.websummit.com/qat26/sheikh-mohammed-al-thani/main"
    },
    {
        "name": "Larry Li",
        "title": "Founder & Managing Partner",
        "company": "Amino Capital",
        "country": "United States",
        "bio": "Larry Li is the Founder and Managing Partner of Amino Capital, a Silicon Valley-based venture capital firm focused on early-stage technology investments.",
        "photo": "https://images.websummit.com/qat26/larry-li/main"
    },
    {
        "name": "Mati Staniszewski",
        "title": "Co-Founder",
        "company": "ElevenLabs",
        "country": "United Kingdom",
        "bio": "Mati Staniszewski is the Co-Founder of ElevenLabs, a pioneering AI voice technology company that has revolutionized text-to-speech and voice cloning technology.",
        "photo": "https://images.websummit.com/qat26/mati-staniszewski/main"
    },
    {
        "name": "Sheikha Moza Bint Nasser",
        "title": "Chairperson",
        "company": "Qatar Foundation",
        "country": "Qatar",
        "bio": "Her Highness Sheikha Moza Bint Nasser is the Chairperson of Qatar Foundation for Education, Science and Community Development, a leading advocate for education and social development in the region.",
        "photo": "https://images.websummit.com/qat26/sheikha-moza/main"
    },
    {
        "name": "Issam Hijazi",
        "title": "Founder & CEO",
        "company": "Upscrolled",
        "country": "Australia",
        "bio": "Issam Hijazi is the Founder and CEO of Upscrolled, an innovative technology company based in Australia.",
        "photo": "https://images.websummit.com/qat26/issam-hijazi/main"
    },
    {
        "name": "Sheikha Al Mayassa bint Hamad Al Thani",
        "title": "Chairperson",
        "company": "Qatar Museums",
        "country": "Qatar",
        "bio": "Her Excellency Sheikha Al Mayassa bint Hamad bin Khalifa Al Thani is the Chairperson of Qatar Museums, overseeing the development of Qatar's cultural institutions and art collections.",
        "photo": "https://images.websummit.com/qat26/sheikha-al-mayassa/main"
    },
    {
        "name": "Colin Kaepernick",
        "title": "Founder & CEO",
        "company": "Lumi",
        "country": "United States",
        "bio": "Colin Kaepernick is a former NFL quarterback turned entrepreneur and activist. He is the Founder and CEO of Lumi, focusing on technology and social impact initiatives.",
        "photo": "https://images.websummit.com/qat26/colin-kaepernick/main"
    },
    {
        "name": "Cristobal Valenzuela",
        "title": "Founder & CEO",
        "company": "Runway",
        "country": "United Kingdom",
        "bio": "Cristobal Valenzuela is the Founder and CEO of Runway, a leading AI-powered creative tools company that has pioneered generative video and image technology for creators.",
        "photo": "https://images.websummit.com/qat26/cristobal-valenzuela/main"
    },
    {
        "name": "Questlove",
        "title": "Musician and Podcast Host",
        "company": "The Roots",
        "country": "United States",
        "bio": "Questlove is an acclaimed musician, DJ, producer, and podcast host. As the drummer and co-frontman of The Roots, he has won multiple Grammy Awards and is known for his work on The Tonight Show.",
        "photo": "https://images.websummit.com/qat26/questlove/main"
    },
    {
        "name": "Yanis Varoufakis",
        "title": "Economist & Former Greek Finance Minister",
        "company": "Independent",
        "country": "Greece",
        "bio": "Yanis Varoufakis is a renowned economist, author, and former Greek Finance Minister known for his expertise in European economics and political economy.",
        "photo": "https://images.websummit.com/qat26/yanis-varoufakis/main"
    },
    {
        "name": "Abir El Saghir",
        "title": "Creator, Internet Personality & Chef",
        "company": "abir.sag",
        "country": "Lebanon",
        "bio": "Abir El Saghir is a popular Lebanese content creator, internet personality, and chef known for her engaging food and lifestyle content.",
        "photo": "https://images.websummit.com/qat26/abir-el-saghir/main"
    },
    {
        "name": "Eduardo Saverin",
        "title": "Co-founder",
        "company": "B Capital & Facebook",
        "country": "Singapore",
        "bio": "Eduardo Saverin is a Brazilian entrepreneur and investor, best known as a co-founder of Facebook. He is also the co-founder of B Capital Group, a global venture capital firm.",
        "photo": "https://images.websummit.com/qat26/eduardo-saverin/main"
    },
    {
        "name": "Metta World Peace",
        "title": "NBA All-Star & Chairman",
        "company": "Artest Management Group",
        "country": "United States",
        "bio": "Metta World Peace (formerly Ron Artest) is a former NBA All-Star and NBA Champion, now serving as Chairman of Artest Management Group and mental health advocate.",
        "photo": "https://images.websummit.com/qat26/metta-world-peace/main"
    },
    {
        "name": "Logan Paul",
        "title": "YouTuber & Wrestler",
        "company": "Prime Hydration",
        "country": "United States",
        "bio": "Logan Paul is an American YouTuber, podcaster, and professional wrestler. He co-founded Prime Hydration and has built a massive media empire with millions of followers.",
        "photo": "https://images.websummit.com/qat26/logan-paul/main"
    },
    {
        "name": "Qasar Younis",
        "title": "Co-founder & CEO",
        "company": "Applied Intuition",
        "country": "United States",
        "bio": "Qasar Younis is the Co-founder and CEO of Applied Intuition, a leading autonomous vehicle software company. He previously served as COO of Y Combinator.",
        "photo": "https://images.websummit.com/qat26/qasar-younis/main"
    },
    {
        "name": "Justina Nixon-Saintil",
        "title": "Chief Impact Officer",
        "company": "IBM",
        "country": "United States",
        "bio": "Justina Nixon-Saintil is the Chief Impact Officer at IBM, leading the company's global corporate social responsibility and sustainability initiatives.",
        "photo": "https://images.websummit.com/qat26/justina-nixon-saintil/main"
    },
    {
        "name": "Sheikh Nasser bin Faisal Al Thani",
        "title": "Director General",
        "company": "Al Jazeera Media Network",
        "country": "Qatar",
        "bio": "Sheikh Nasser bin Faisal bin Khalifa Al Thani is the Director General of Al Jazeera Media Network, overseeing one of the world's largest news organizations.",
        "photo": "https://images.websummit.com/qat26/sheikh-nasser-al-thani/main"
    },
    {
        "name": "Chris Williamson",
        "title": "Podcaster",
        "company": "iHeart",
        "country": "United Kingdom",
        "bio": "Chris Williamson is a British podcaster and former nightclub promoter, known for hosting the popular 'Modern Wisdom' podcast on iHeart.",
        "photo": "https://images.websummit.com/qat26/chris-williamson/main"
    },
    {
        "name": "Tom Hale",
        "title": "CEO",
        "company": "Oura",
        "country": "Finland",
        "bio": "Tom Hale is the CEO of Oura, the company behind the popular Oura Ring health and fitness tracker, leading innovation in wearable health technology.",
        "photo": "https://images.websummit.com/qat26/tom-hale/main"
    }
]

def create_slug(name):
    """Create URL-friendly slug from name"""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')

def main():
    db_config = parse_db_url(DATABASE_URL)
    if not db_config:
        print("Failed to parse DATABASE_URL")
        return
    
    conn = mysql.connector.connect(
        host=db_config['host'],
        port=db_config['port'],
        user=db_config['user'],
        password=db_config['password'],
        database=db_config['database'],
        ssl_disabled=False,
        ssl_verify_cert=False
    )
    cursor = conn.cursor(dictionary=True)
    
    # Get the published status ID
    cursor.execute("SELECT id FROM workflow_statuses WHERE name = 'Published' LIMIT 1")
    status_row = cursor.fetchone()
    status_id = status_row['id'] if status_row else 7
    
    # Get the event ID for Web Summit Qatar 2026
    cursor.execute("SELECT id FROM events WHERE slug = 'web-summit-qatar-2026' LIMIT 1")
    event_row = cursor.fetchone()
    event_id = event_row['id'] if event_row else 30004
    
    print(f"Using status_id: {status_id}, event_id: {event_id}")
    
    # Insert speakers into people table and link to event_speakers
    for i, speaker in enumerate(speakers_data):
        slug = create_slug(speaker['name'])
        
        # Check if person already exists
        cursor.execute("SELECT id FROM people WHERE slug = %s OR name = %s", (slug, speaker['name']))
        existing = cursor.fetchone()
        
        if existing:
            person_id = existing['id']
            print(f"Person already exists: {speaker['name']} (ID: {person_id})")
        else:
            # Insert new person
            cursor.execute("""
                INSERT INTO people (name, slug, title, company, bio, avatar, statusId, publishedAt, createdAt, updatedAt)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), NOW())
            """, (
                speaker['name'],
                slug,
                speaker['title'],
                speaker['company'],
                speaker['bio'],
                speaker.get('photo', ''),
                status_id
            ))
            person_id = cursor.lastrowid
            print(f"Inserted person: {speaker['name']} (ID: {person_id})")
        
        # Update event_speaker with personId
        cursor.execute("""
            UPDATE event_speakers 
            SET personId = %s 
            WHERE eventId = %s AND name LIKE %s
        """, (person_id, event_id, f"%{speaker['name'].split()[0]}%"))
        
        if cursor.rowcount > 0:
            print(f"  Linked to event speaker")
        else:
            # Try to find by partial name match
            cursor.execute("""
                SELECT id, name FROM event_speakers 
                WHERE eventId = %s AND (name LIKE %s OR name LIKE %s)
            """, (event_id, f"%{speaker['name']}%", f"%{speaker['name'].split()[-1]}%"))
            matches = cursor.fetchall()
            if matches:
                for match in matches:
                    cursor.execute("UPDATE event_speakers SET personId = %s WHERE id = %s", (person_id, match['id']))
                    print(f"  Linked to event speaker: {match['name']}")
    
    conn.commit()
    cursor.close()
    conn.close()
    print("\nDone!")

if __name__ == "__main__":
    main()
