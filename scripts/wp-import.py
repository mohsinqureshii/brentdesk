#!/usr/bin/env python3
"""
WordPress to TechScoop Import Script
Imports articles from WordPress SQL dump to TechScoop database
"""

import re
import json
import mysql.connector
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Parse DATABASE_URL
db_url = os.environ.get('DATABASE_URL', '')
# Format: mysql://user:pass@host:port/database?ssl=...
# Remove SSL params from database name
match = re.match(r'mysql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)', db_url)
if match:
    DB_CONFIG = {
        'user': match.group(1),
        'password': match.group(2),
        'host': match.group(3),
        'port': int(match.group(4)),
        'database': match.group(5),
        'ssl_disabled': False,
    }
else:
    print("Could not parse DATABASE_URL")
    exit(1)

# Category mapping: WordPress category slug -> TechScoop category ID
CATEGORY_MAPPING = {
    'funding-vc': 60001,
    'technology': 60033,
    'events': 60115,
    'powerlist': 60135,
    'jobs-and-talent': 60109,
    'uncategorized': 60131,
    'fintech': 60002,
    'ai': 60027,
    'cybersecurity': 60040,
    'blockchain': 60046,
    'saas': 60034,
    'founders': 60104,
    'investors': 60104,
    'operators': 60106,
    'executives': 60105,
    'incubators': 60006,
    'start-up-jobs': 60110,
    'leaders-move': 60103,
    'skills-and-education': 60113,
    'ecommerce': 60075,
    'healthtech': 60052,
    'proptech': 60070,
    'cleantech': 60059,
    'logistics': 60064,
    'foodtech': 60077,
    'mobility': 60065,
    'agritech': 60158,
}

DEFAULT_CATEGORY_ID = 60131  # Press Release
DEFAULT_AUTHOR_ID = 1  # Mohsin

# Load media URL mapping
media_mapping = {}
try:
    with open('/home/ubuntu/techscoop/media-url-mapping.json', 'r') as f:
        media_mapping = json.load(f)
    print(f"Loaded {len(media_mapping)} media URL mappings")
except:
    print("No media URL mapping found")

# Report
report = {
    'total_posts': 0,
    'imported': 0,
    'skipped': [],
    'missing_category': [],
    'missing_featured_image': [],
    'redirects': [],
}

def parse_sql_dump(filepath):
    """Parse WordPress SQL dump and extract relevant data"""
    print("Reading SQL dump...")
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    data = {
        'posts': [],
        'terms': {},
        'term_taxonomy': {},
        'term_relations': {},
        'attachments': {},
        'post_meta': {},
        'seo_data': {},
    }
    
    # Parse terms
    print("Parsing terms...")
    terms_match = re.search(r"INSERT INTO `wp8s_terms`.*?VALUES\s*(.*?);", content, re.DOTALL)
    if terms_match:
        for m in re.finditer(r"\((\d+),\s*'([^']*)',\s*'([^']*)',\s*\d+\)", terms_match.group(1)):
            term_id, name, slug = m.groups()
            data['terms'][int(term_id)] = {
                'name': name.replace('&amp;', '&'),
                'slug': slug
            }
    print(f"  Found {len(data['terms'])} terms")
    
    # Parse term_taxonomy
    print("Parsing term taxonomy...")
    tax_match = re.search(r"INSERT INTO `wp8s_term_taxonomy`.*?VALUES\s*(.*?);", content, re.DOTALL)
    if tax_match:
        for m in re.finditer(r"\((\d+),\s*(\d+),\s*'([^']*)',\s*'[^']*',\s*(\d+),\s*\d+\)", tax_match.group(1)):
            tt_id, term_id, taxonomy, parent = m.groups()
            data['term_taxonomy'][int(tt_id)] = {
                'term_id': int(term_id),
                'type': taxonomy,
                'parent': int(parent)
            }
    print(f"  Found {len(data['term_taxonomy'])} taxonomy entries")
    
    # Parse term_relationships
    print("Parsing term relationships...")
    rel_match = re.search(r"INSERT INTO `wp8s_term_relationships`.*?VALUES\s*(.*?);", content, re.DOTALL)
    if rel_match:
        for m in re.finditer(r"\((\d+),\s*(\d+),\s*\d+\)", rel_match.group(1)):
            object_id, tt_id = m.groups()
            post_id = int(object_id)
            if post_id not in data['term_relations']:
                data['term_relations'][post_id] = []
            data['term_relations'][post_id].append(int(tt_id))
    print(f"  Found {len(data['term_relations'])} relationships")
    
    # Parse postmeta for featured images
    print("Parsing post meta...")
    meta_match = re.search(r"INSERT INTO `wp8s_postmeta`.*?VALUES\s*(.*?);", content, re.DOTALL)
    if meta_match:
        for m in re.finditer(r"\(\d+,\s*(\d+),\s*'_thumbnail_id',\s*'(\d+)'\)", meta_match.group(1)):
            post_id, thumb_id = m.groups()
            data['post_meta'][int(post_id)] = {'_thumbnail_id': int(thumb_id)}
    print(f"  Found {len(data['post_meta'])} thumbnail references")
    
    # Parse AIOSEO data
    print("Parsing SEO data...")
    seo_match = re.search(r"INSERT INTO `wp8s_aioseo_posts`.*?VALUES\s*(.*?);", content, re.DOTALL)
    if seo_match:
        for m in re.finditer(r"\(\d+,\s*(\d+),\s*'([^']*)',\s*'([^']*)',", seo_match.group(1)):
            post_id, title, desc = m.groups()
            data['seo_data'][int(post_id)] = {
                'title': unescape_sql(title),
                'description': unescape_sql(desc)
            }
    print(f"  Found {len(data['seo_data'])} SEO records")
    
    # Parse posts - find the INSERT statement
    print("Parsing posts...")
    posts_start = content.find("INSERT INTO `wp8s_posts`")
    if posts_start == -1:
        print("  ERROR: Could not find posts INSERT statement")
        return data
    
    # Find VALUES
    values_start = content.find("VALUES", posts_start)
    if values_start == -1:
        print("  ERROR: Could not find VALUES in posts INSERT")
        return data
    
    # Find the end of the INSERT (next semicolon at depth 0)
    posts_section = content[values_start + 6:]  # Skip "VALUES"
    
    # Parse individual post records
    # Each record starts with ( and ends with )
    # Records are separated by ),\n(
    
    # Use a simpler approach - find all records matching the pattern
    # (ID, author_id, 'date', 'date_gmt', 'content', 'title', 'excerpt', 'status', ...)
    
    post_pattern = re.compile(
        r"\((\d+),\s*(\d+),\s*'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})',\s*'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})',"
    )
    
    # Find all post starts
    post_starts = list(post_pattern.finditer(posts_section))
    print(f"  Found {len(post_starts)} potential post records")
    
    for i, match in enumerate(post_starts):
        try:
            # Get the full record
            start_pos = match.start()
            
            # Find the end of this record (next record start or end of section)
            if i + 1 < len(post_starts):
                end_pos = post_starts[i + 1].start() - 2  # Before the comma and newline
            else:
                # Last record - find the closing parenthesis
                end_pos = posts_section.find(';', start_pos)
                if end_pos == -1:
                    end_pos = len(posts_section)
            
            record = posts_section[start_pos:end_pos].strip()
            if record.endswith(','):
                record = record[:-1]
            
            # Parse the record
            post = parse_post_record(record)
            if post and post.get('post_type') == 'post':
                data['posts'].append(post)
            elif post and post.get('post_type') == 'attachment':
                data['attachments'][post['id']] = {'guid': post.get('guid', '')}
                
        except Exception as e:
            pass  # Skip malformed records
    
    print(f"  Parsed {len(data['posts'])} posts")
    print(f"  Parsed {len(data['attachments'])} attachments")
    
    return data

def parse_post_record(record):
    """Parse a single post record from the SQL dump"""
    # Remove outer parentheses
    if record.startswith('('):
        record = record[1:]
    if record.endswith(')'):
        record = record[:-1]
    
    # Split by fields - handle quoted strings
    fields = []
    current = ''
    in_string = False
    escape_next = False
    
    for char in record:
        if escape_next:
            current += char
            escape_next = False
            continue
        
        if char == '\\':
            current += char
            escape_next = True
            continue
        
        if char == "'":
            in_string = not in_string
            current += char
            continue
        
        if char == ',' and not in_string:
            fields.append(current.strip())
            current = ''
            continue
        
        current += char
    
    fields.append(current.strip())
    
    if len(fields) < 21:
        return None
    
    def get_value(idx):
        if idx >= len(fields):
            return ''
        val = fields[idx]
        if val.startswith("'") and val.endswith("'"):
            return unescape_sql(val[1:-1])
        return val
    
    return {
        'id': int(fields[0]) if fields[0].isdigit() else 0,
        'author_id': int(fields[1]) if fields[1].isdigit() else 1,
        'post_date': get_value(2),
        'post_date_gmt': get_value(3),
        'content': get_value(4),
        'title': get_value(5),
        'excerpt': get_value(6),
        'status': get_value(7),
        'slug': get_value(11),
        'post_modified': get_value(14),
        'guid': get_value(18),
        'post_type': get_value(20),
    }

def unescape_sql(s):
    """Unescape SQL string"""
    if not s:
        return ''
    return (s
        .replace("''", "'")
        .replace("\\'", "'")
        .replace('\\"', '"')
        .replace('\\n', '\n')
        .replace('\\r', '\r')
        .replace('\\t', '\t')
        .replace('\\\\', '\\')
        .replace('&amp;', '&')
        .replace('&lt;', '<')
        .replace('&gt;', '>')
        .replace('&quot;', '"')
        .replace('&#039;', "'"))

def get_post_categories(post_id, wp_data):
    """Get categories for a post"""
    categories = []
    tt_ids = wp_data['term_relations'].get(post_id, [])
    
    for tt_id in tt_ids:
        tax = wp_data['term_taxonomy'].get(tt_id)
        if tax and tax['type'] == 'category':
            term = wp_data['terms'].get(tax['term_id'])
            if term:
                categories.append(term)
    
    return categories

def clean_content(content):
    """Clean WordPress content"""
    if not content:
        return ''
    
    # Remove WordPress block comments
    clean = re.sub(r'<!-- wp:[^>]+-->', '', content)
    clean = re.sub(r'<!-- /wp:[^>]+-->', '', clean)
    clean = re.sub(r'<!--[^>]*-->', '', clean)
    
    # Replace media URLs
    for old_url, new_url in media_mapping.items():
        clean = clean.replace(old_url, new_url)
    
    # Replace common URL patterns
    clean = re.sub(
        r'https?://techscoop\.io/wp-content/uploads/',
        'https://manus-storage.s3.amazonaws.com/techscoop/uploads/',
        clean
    )
    clean = re.sub(
        r'https?://techzfye\.developer-developer\.com/wp-content/uploads/',
        'https://manus-storage.s3.amazonaws.com/techscoop/uploads/',
        clean
    )
    
    return clean.strip()

def convert_media_url(url):
    """Convert WordPress media URL to new S3 URL"""
    if not url:
        return None
    
    # Check direct mapping
    if url in media_mapping:
        return media_mapping[url]
    
    # Try variations
    for old, new in media_mapping.items():
        if url.replace('https://', 'http://') == old or url.replace('http://', 'https://') == old:
            return new
    
    # Extract path and check
    path_match = re.search(r'/wp-content/uploads/(.+)$', url)
    if path_match:
        rel_path = path_match.group(1)
        for old_url, new_url in media_mapping.items():
            if rel_path in old_url:
                return new_url
    
    return url

def main():
    print("=" * 50)
    print("WordPress to TechScoop Import")
    print("=" * 50)
    
    # Parse WordPress dump
    wp_data = parse_sql_dump('/home/ubuntu/upload/techzfye_wp189.sql')
    
    # Connect to TechScoop database
    print("\nConnecting to TechScoop database...")
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    # Get existing slugs
    cursor.execute("SELECT slug FROM articles")
    existing_slugs = set(row['slug'] for row in cursor.fetchall())
    print(f"Found {len(existing_slugs)} existing articles")
    
    # Get workflow status IDs
    cursor.execute("SELECT id, slug FROM workflow_statuses")
    status_map = {row['slug']: row['id'] for row in cursor.fetchall()}
    published_status_id = status_map.get('published', 6)  # Published = 6
    draft_status_id = status_map.get('draft', 1)  # Draft = 1
    
    print(f"\nImporting {len(wp_data['posts'])} posts...")
    
    for post in wp_data['posts']:
        report['total_posts'] += 1
        
        # Skip if exists
        if post['slug'] in existing_slugs:
            report['skipped'].append({
                'id': post['id'],
                'slug': post['slug'],
                'reason': 'Already exists'
            })
            continue
        
        # Skip empty content
        if not post['content'] or len(post['content'].strip()) < 50:
            report['skipped'].append({
                'id': post['id'],
                'slug': post['slug'],
                'reason': 'Empty or too short'
            })
            continue
        
        # Get category
        categories = get_post_categories(post['id'], wp_data)
        category_id = None
        
        for cat in categories:
            if cat['slug'] in CATEGORY_MAPPING:
                category_id = CATEGORY_MAPPING[cat['slug']]
                break
        
        if not category_id:
            category_id = DEFAULT_CATEGORY_ID
            report['missing_category'].append({
                'post_id': post['id'],
                'slug': post['slug'],
                'title': post['title'][:80],
                'wp_categories': ', '.join(c['name'] for c in categories) or 'None'
            })
            
            if categories:
                report['redirects'].append({
                    'old_url': f"/{categories[0]['slug']}/{post['slug']}",
                    'new_url': f"/press-release/{post['slug']}"
                })
        
        # Get featured image
        thumb_id = wp_data['post_meta'].get(post['id'], {}).get('_thumbnail_id')
        featured_image = None
        if thumb_id and thumb_id in wp_data['attachments']:
            featured_image = convert_media_url(wp_data['attachments'][thumb_id]['guid'])
        else:
            report['missing_featured_image'].append({
                'post_id': post['id'],
                'slug': post['slug'],
                'title': post['title'][:80]
            })
        
        # Get SEO data
        seo = wp_data['seo_data'].get(post['id'], {})
        
        # Clean content
        clean = clean_content(post['content'])
        
        # Determine status
        workflow_status_id = published_status_id if post['status'] == 'publish' else draft_status_id
        
        # Parse dates
        published_at = post['post_date_gmt'] if post['status'] == 'publish' and post['post_date_gmt'] != '0000-00-00 00:00:00' else None
        created_at = post['post_date'] if post['post_date'] != '0000-00-00 00:00:00' else datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        updated_at = post['post_modified'] if post['post_modified'] != '0000-00-00 00:00:00' else created_at
        
        # Insert article
        try:
            cursor.execute("""
                INSERT INTO articles (
                    title, slug, content, excerpt,
                    authorId, statusId, publishedAt, createdAt, updatedAt,
                    seoTitle, seoDescription, articleType, robotsIndexing,
                    wpOriginalId, wpOriginalUrl
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                post['title'],
                post['slug'],
                clean,
                post['excerpt'] or None,
                DEFAULT_AUTHOR_ID,
                workflow_status_id,
                published_at,
                created_at,
                updated_at,
                seo.get('title'),
                seo.get('description'),
                'news',
                'index',
                post['id'],
                f"https://techscoop.io/{post['slug']}/"
            ))
            
            article_id = cursor.lastrowid
            
            # Add category
            if category_id:
                cursor.execute("""
                    INSERT INTO article_categories (articleId, categoryId)
                    VALUES (%s, %s)
                """, (article_id, category_id))
                
                # Also set primary category on article
                cursor.execute("""
                    UPDATE articles SET primaryCategoryId = %s WHERE id = %s
                """, (category_id, article_id))
            
            conn.commit()
            report['imported'] += 1
            existing_slugs.add(post['slug'])
            
            if report['imported'] % 50 == 0:
                print(f"  Imported {report['imported']} articles...")
                
        except Exception as e:
            conn.rollback()
            report['skipped'].append({
                'id': post['id'],
                'slug': post['slug'],
                'reason': str(e)[:100]
            })
    
    cursor.close()
    conn.close()
    
    # Print report
    print("\n" + "=" * 50)
    print("IMPORT REPORT")
    print("=" * 50)
    print(f"Total posts found: {report['total_posts']}")
    print(f"Successfully imported: {report['imported']}")
    print(f"Skipped: {len(report['skipped'])}")
    print(f"Missing category mapping: {len(report['missing_category'])}")
    print(f"Missing featured image: {len(report['missing_featured_image'])}")
    print(f"Redirects needed: {len(report['redirects'])}")
    
    # Save report
    with open('/home/ubuntu/techscoop/wp-import-report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # Save redirects
    with open('/home/ubuntu/techscoop/wp-redirect-mapping.csv', 'w') as f:
        f.write('old_url,new_url\n')
        for r in report['redirects']:
            f.write(f"{r['old_url']},{r['new_url']}\n")
    
    print("\nDetailed report saved to: wp-import-report.json")
    print("Redirect mapping saved to: wp-redirect-mapping.csv")

if __name__ == '__main__':
    main()
