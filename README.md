# TechScoop - Enterprise Media Platform

A modular monolith media platform built with Node.js/Express, React, MySQL, Redis, and Meilisearch. Features a beautiful admin CMS, enterprise editorial workflows, profile claim/moderation system, and comprehensive SEO tools.

## 🚀 Features

### Content Modules
- **News/Articles** - Full article management with rich text, categories, tags, topics, regions, sectors
- **Jobs** - Job listings with company info, salary, remote options, application tracking
- **People Directory** - Leader profiles with bio, social links, verification, and profile claiming
- **Investors Directory** - VC/Angel/Accelerator profiles with investment focus, check sizes
- **Events** - Conferences, webinars, meetups with registration tracking
- **Resources** - Templates, perks, tools, playbooks, programs

### Enterprise Features
- **Editorial Workflow Engine** - Configurable multi-step approval (Draft → Submitted → Editor Review → Senior Editor Review → Approved → Published)
- **Profile Claim System** - Crunchbase-style profile claiming with verification
- **Suggested Updates** - Diff tracking, version history, moderator queue
- **SEO Engine** - Meta fields, JSON-LD schemas, module-specific sitemaps, RSS feeds, redirect manager
- **WordPress Importer** - Content migration with URL parity preservation
- **Homepage Configuration** - CMS-driven content blocks with scheduling
- **Popups & Banners** - Targeting, frequency caps, scheduling

### Admin CMS
Beautiful React-based admin panel with:
- Dashboard with analytics
- Content management with rich editor
- Workflow status board
- Moderation queue with diff viewer
- Media library with drag-and-drop
- SEO tools and redirect manager
- WordPress import wizard

## 🛠 Tech Stack

- **Backend:** Node.js, Express, TypeScript, tRPC
- **Frontend:** React 19, Tailwind CSS 4, shadcn/ui
- **Database:** MySQL 8 with Drizzle ORM
- **Cache:** Redis 7
- **Search:** Meilisearch
- **Storage:** S3-compatible (AWS S3, MinIO, etc.)
- **Auth:** JWT with OAuth support

## 📁 Project Structure

```
techscoop/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── admin/         # Admin-specific components
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── pages/             # Page components
│   │   │   └── admin/         # Admin CMS pages
│   │   └── lib/               # Utilities
│   └── public/                # Static assets
├── server/                    # Express backend
│   ├── modules/               # Content modules
│   │   ├── news/              # News/Articles module
│   │   ├── jobs/              # Jobs module
│   │   ├── people/            # People directory
│   │   ├── investors/         # Investors directory
│   │   ├── events/            # Events module
│   │   └── resources/         # Resources module
│   ├── admin/                 # Admin API routers
│   ├── services/              # Shared services
│   │   ├── seo.service.ts     # SEO engine
│   │   ├── workflow.service.ts # Editorial workflow
│   │   ├── moderation.service.ts # Profile moderation
│   │   ├── slug.service.ts    # URL/slug management
│   │   └── media.service.ts   # Media handling
│   └── _core/                 # Framework core
├── drizzle/                   # Database schema
├── docker/                    # Docker configuration
│   ├── mysql/                 # MySQL init scripts
│   └── nginx/                 # Nginx config
├── docker-compose.yml         # Docker Compose setup
├── Dockerfile                 # Application Dockerfile
└── README.md                  # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL 8+
- Redis 7+
- Meilisearch (optional, for search)

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd techscoop
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run database migrations:**
   ```bash
   pnpm db:push
   ```

4. **Start development server:**
   ```bash
   pnpm dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Admin CMS: http://localhost:3000/admin

### Docker Setup

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **With Nginx (production profile):**
   ```bash
   docker-compose --profile production up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f app
   ```

## 📚 API Documentation

### Content APIs

All content modules follow a consistent API pattern:

```
GET    /api/trpc/news.list          # List articles (public)
GET    /api/trpc/news.get           # Get single article
GET    /api/trpc/news.adminList     # List articles (admin)
POST   /api/trpc/news.create        # Create article
PUT    /api/trpc/news.update        # Update article
DELETE /api/trpc/news.delete        # Delete article
POST   /api/trpc/news.transition    # Change workflow status
```

### Admin APIs

```
/api/trpc/admin.dashboard.*         # Dashboard analytics
/api/trpc/admin.taxonomy.*          # Categories, tags, etc.
/api/trpc/admin.workflow.*          # Workflow management
/api/trpc/admin.moderation.*        # Claims & updates
/api/trpc/admin.seo.*               # SEO tools
/api/trpc/admin.media.*             # Media library
/api/trpc/admin.homepage.*          # Homepage config
/api/trpc/admin.popups.*            # Popups & banners
/api/trpc/admin.wpImport.*          # WordPress import
```

## 🔐 Authentication & Authorization

### Roles

- **admin** - Full access to all features
- **senior_editor** - Approve/publish content, manage workflows
- **editor** - Review content, manage taxonomy
- **author** - Create and edit own content
- **moderator** - Handle profile claims and updates
- **user** - Public user (can claim profiles)

### Protected Routes

Admin routes require authentication and appropriate role:

```typescript
// Example: Only editors and above can access
adminProcedure.use(({ ctx, next }) => {
  if (!['admin', 'senior_editor', 'editor'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

## 📊 Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with roles |
| `articles` | News/blog articles |
| `jobs` | Job listings |
| `people` | People directory |
| `investors` | Investor profiles |
| `events` | Events and conferences |
| `resources` | Templates, perks, tools |

### Taxonomy Tables

| Table | Description |
|-------|-------------|
| `categories` | Content categories |
| `tags` | Content tags |
| `topics` | Topic areas |
| `regions` | Geographic regions |
| `sectors` | Industry sectors |

### Workflow Tables

| Table | Description |
|-------|-------------|
| `workflow_statuses` | Status definitions |
| `workflow_transitions` | Allowed transitions |
| `workflow_audit_log` | Status change history |

### Moderation Tables

| Table | Description |
|-------|-------------|
| `profile_claims` | Profile claim requests |
| `suggested_updates` | Proposed changes |
| `entity_versions` | Version history |

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=mysql://user:pass@localhost:3306/techscoop

# Redis
REDIS_URL=redis://localhost:6379

# Meilisearch
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=masterKey

# Auth
JWT_SECRET=your-secret-key

# S3 Storage
S3_BUCKET=techscoop-media
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass
FROM_EMAIL=noreply@techscoop.com
```

## 📈 SEO Features

### Sitemaps

- `/sitemap.xml` - Main sitemap index
- `/sitemap-news.xml` - News articles
- `/sitemap-jobs.xml` - Job listings
- `/sitemap-people.xml` - People profiles
- `/sitemap-investors.xml` - Investor profiles
- `/sitemap-events.xml` - Events
- `/sitemap-resources.xml` - Resources

### RSS Feeds

- `/feed/news.xml` - Latest news
- `/feed/jobs.xml` - Latest jobs

### JSON-LD Schemas

Auto-generated for:
- NewsArticle
- JobPosting
- Person
- Organization
- Event
- CreativeWork
- Report

## 🔄 WordPress Migration

1. Export WordPress content as XML (WXR format)
2. Go to Admin → Import → WordPress
3. Upload the XML file
4. Configure import options
5. Run import
6. Review URL parity report

The importer handles:
- Posts → Articles
- Categories → Categories
- Tags → Tags
- Authors → Users
- Media → Media Library
- Slugs → Redirects (for URL parity)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/auth.logout.test.ts

# Run with coverage
pnpm test --coverage
```

## 📦 Deployment

### Docker (Recommended)

```bash
# Build and deploy
docker-compose -f docker-compose.yml up -d --build

# With production profile (includes Nginx)
docker-compose --profile production up -d --build
```

### Manual Deployment

```bash
# Build
pnpm build

# Start production server
NODE_ENV=production node dist/index.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.
