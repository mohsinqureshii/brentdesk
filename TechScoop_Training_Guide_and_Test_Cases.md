# TechScoop Platform - Training Guide & Production Test Cases

**Document Version:** 1.0  
**Date:** February 5, 2026  
**Platform Version:** 64a991db  

---

## Table of Contents

1. [Phase 1: Foundation (RBAC, User Auth, Profile)](#phase-1-foundation)
2. [Phase 2: Resources Module](#phase-2-resources-module)
3. [Phase 3: Partner Portal](#phase-3-partner-portal)
4. [Phase 4: Newsletter System](#phase-4-newsletter-system)
5. [Phase 5: Writer Monetization](#phase-5-writer-monetization)
6. [Phase 6: Advertising System](#phase-6-advertising-system)
7. [Phase 7: SEO Module](#phase-7-seo-module)
8. [Phase 8: Security](#phase-8-security)

---

## Phase 1: Foundation

### Training Guide

#### 1.1 User Authentication Flow

The platform uses Manus OAuth for authentication. Users can sign up and sign in through the OAuth flow.

**Sign Up Process:**
1. User visits `/signup` page
2. Clicks "Create Account" button
3. Redirected to Manus OAuth portal
4. Completes registration
5. Redirected back to TechScoop dashboard

**Sign In Process:**
1. User visits `/signin` page
2. Clicks "Sign In" button
3. Redirected to Manus OAuth portal
4. Authenticates
5. Redirected back to TechScoop dashboard

#### 1.2 User Profile Management

Users can manage their profile at `/profile`:
- Name, bio, job title
- Twitter handle, LinkedIn URL
- Avatar upload
- Newsletter preferences

#### 1.3 RBAC (Role-Based Access Control)

**Admin Location:** `/admin/roles`

**System Roles:**
| Role | Description | Permissions |
|------|-------------|-------------|
| Super Admin | Full system access | All permissions |
| Admin | Platform administration | Most permissions except system config |
| Editor | Content management | Articles, companies, events |
| Ad Ops | Advertising operations | Ad campaigns, slots, creatives |
| Sales | Partner management | Partners, deals, payouts |
| Writer | Content creation | Own articles only |
| Partner Admin | Partner company admin | Partner resources, analytics |
| Partner Manager | Partner team member | Limited partner access |
| Partner Viewer | Read-only partner access | View partner analytics |

**Managing Roles:**
1. Navigate to Admin → Users & Roles → Roles & Permissions
2. View existing roles and their permissions
3. Create new roles with custom permission sets
4. Assign roles to users with optional expiration dates

### Test Cases - Phase 1

| TC# | Test Case | Steps | Expected Result |
|-----|-----------|-------|-----------------|
| 1.1 | User Sign Up | 1. Go to /signup 2. Click "Create Account" 3. Complete OAuth flow | User account created, redirected to dashboard |
| 1.2 | User Sign In | 1. Go to /signin 2. Click "Sign In" 3. Complete OAuth | User authenticated, redirected to dashboard |
| 1.3 | Sign Out | 1. Click user avatar 2. Click "Sign Out" | User logged out, redirected to home |
| 1.4 | View Profile | 1. Sign in 2. Go to /profile | Profile page loads with user data |
| 1.5 | Edit Profile | 1. Go to /profile 2. Update name/bio 3. Save | Changes saved, success toast shown |
| 1.6 | Update Avatar | 1. Go to /profile 2. Upload new avatar 3. Save | Avatar updated, visible in header |
| 1.7 | View Roles (Admin) | 1. Sign in as admin 2. Go to /admin/roles | Roles list displayed with permissions |
| 1.8 | Create Role (Admin) | 1. Go to /admin/roles 2. Click "Add Role" 3. Fill form 4. Save | New role created |
| 1.9 | Assign Role | 1. Go to /admin/users 2. Select user 3. Assign role | Role assigned to user |
| 1.10 | Permission Check | 1. Sign in as Editor 2. Try to access /admin/roles | Access denied or limited view |
| 1.11 | User Dashboard | 1. Sign in 2. Go to /dashboard | Dashboard loads with user stats |
| 1.12 | Newsletter Toggle | 1. Go to /dashboard 2. Toggle newsletter subscription | Subscription updated |
| 1.13 | Protected Route | 1. Sign out 2. Go to /dashboard | Redirected to /signin |
| 1.14 | Session Persistence | 1. Sign in 2. Close browser 3. Reopen | User still authenticated |
| 1.15 | Delete Account | 1. Go to /profile 2. Click Delete Account 3. Confirm | Account anonymized, logged out |

---

## Phase 2: Resources Module

### Training Guide

#### 2.1 Resources Hub

**Public Location:** `/resources`

The Resources Hub is the central location for all startup resources:
- Founder Perks (discounts/credits)
- Templates (downloadable documents)
- Tools Directory (software catalog)
- Playbooks (step-by-step guides)
- Starter Packs (bundled resources)
- Vendors (service providers)
- Regulations (MENA startup laws)
- Calculators (financial tools)

#### 2.2 Founder Perks

**Public Location:** `/resources/perks`  
**Admin Location:** `/admin/resources` → Perks tab

Perks are exclusive discounts and credits from partner companies (AWS, Stripe, etc.).

**Managing Perks:**
1. Navigate to Admin → Resources
2. Select "Perks" tab
3. Create/edit perks with:
   - Provider name and logo
   - Discount value (e.g., "$5,000 AWS credits")
   - Promo code or redemption URL
   - Eligibility criteria
   - Expiration date

#### 2.3 Templates

**Public Location:** `/resources/templates`

Templates include pitch decks, financial models, legal contracts, etc.

**Gated Downloads:**
- Some templates require email capture
- Lead data stored in Newsletter → Leads

#### 2.4 Calculators

**Public Location:** `/resources/calculators`

Available calculators:
- Runway Calculator
- Valuation Calculator
- Dilution Calculator
- CAC/LTV Calculator
- MRR Calculator

### Test Cases - Phase 2

| TC# | Test Case | Steps | Expected Result |
|-----|-----------|-------|-----------------|
| 2.1 | View Resources Hub | 1. Go to /resources | Hub page loads with all 8 categories |
| 2.2 | Browse Perks | 1. Go to /resources/perks | Perks list displayed with filters |
| 2.3 | View Perk Detail | 1. Go to /resources/perks 2. Click a perk | Perk detail page with redemption info |
| 2.4 | Redeem Perk | 1. View perk detail 2. Click "Get This Perk" | Redirected to partner site or code shown |
| 2.5 | Browse Templates | 1. Go to /resources/templates | Templates list with categories |
| 2.6 | Download Template | 1. Click template 2. Enter email (if gated) 3. Download | File downloads, lead captured |
| 2.7 | Browse Tools | 1. Go to /resources/tools | Tools directory with filters |
| 2.8 | View Playbook | 1. Go to /resources/playbooks 2. Select playbook | Playbook content displayed |
| 2.9 | Use Calculator | 1. Go to /resources/calculators/runway 2. Enter values | Calculator shows results |
| 2.10 | Browse Vendors | 1. Go to /resources/vendors | Vendor directory with categories |
| 2.11 | View Regulations | 1. Go to /resources/regulations | Regulations hub by country |
| 2.12 | Admin Create Perk | 1. Go to /admin/resources 2. Add new perk | Perk created, visible on public site |
| 2.13 | Admin Edit Template | 1. Go to /admin/resources 2. Edit template | Changes saved |
| 2.14 | Admin Create Calculator | 1. Go to /admin/resources 2. Add calculator | Calculator available on site |
| 2.15 | Starter Packs | 1. Go to /resources/packs | Packs displayed with included items |

---

## Phase 3: Partner Portal

### Training Guide

#### 3.1 Partner Tiers

| Tier | Annual Fee | Commission Rate | Features |
|------|------------|-----------------|----------|
| Free | $0 | 15% | Basic listing, limited analytics |
| Growth | $2,400 | 20% | Featured listing, full analytics |
| Pro | $6,000 | 25% | Priority placement, API access |
| Enterprise | $15,000+ | 30% | Custom integration, dedicated support |

#### 3.2 Partner Management (Admin)

**Admin Location:** `/admin/partners`

**Managing Partners:**
1. Navigate to Admin → Partners → All Partners
2. View partner list with tier, status, commission
3. Create new partners or edit existing
4. Manage API keys for partner integrations
5. Track affiliate clicks and conversions

#### 3.3 Affiliate Tracking

**Admin Location:** `/admin/partners` → Affiliate Tracking tab

All affiliate links use the format: `/go/{resource-slug}`

Tracking includes:
- Click source (UTM parameters)
- Conversion tracking
- Commission calculation
- Payout management

#### 3.4 Partner Payouts

**Admin Location:** `/admin/partners` → Payouts tab

Payout workflow:
1. Review pending commissions
2. Create payout batch
3. Process payment
4. Mark as completed

### Test Cases - Phase 3

| TC# | Test Case | Steps | Expected Result |
|-----|-----------|-------|-----------------|
| 3.1 | View Partners List | 1. Go to /admin/partners | Partners list with tiers and status |
| 3.2 | Create Partner | 1. Click "Add Partner" 2. Fill form 3. Save | Partner created |
| 3.3 | Edit Partner | 1. Select partner 2. Edit details 3. Save | Changes saved |
| 3.4 | Change Partner Tier | 1. Edit partner 2. Change tier 3. Save | Tier updated, commission rate changes |
| 3.5 | Generate API Key | 1. Edit partner 2. Generate API key | Key generated, shown once |
| 3.6 | View Affiliate Stats | 1. Go to Affiliate Tracking tab | Stats dashboard with clicks/conversions |
| 3.7 | Track Affiliate Click | 1. Click /go/{slug} link | Click recorded, redirected to destination |
| 3.8 | View Partner Clicks | 1. Filter clicks by partner | Partner-specific click data shown |
| 3.9 | Create Payout | 1. Go to Payouts tab 2. Create payout | Payout created with line items |
| 3.10 | Process Payout | 1. Select pending payout 2. Mark as paid | Status updated to paid |
| 3.11 | Partner Dashboard | 1. Sign in as partner 2. View dashboard | Partner sees their stats |
| 3.12 | Partner Analytics | 1. View partner analytics | Charts show clicks, conversions, revenue |
| 3.13 | Deactivate Partner | 1. Edit partner 2. Set status to inactive | Partner deactivated |
| 3.14 | Partner Search | 1. Search partners by name | Matching partners shown |
| 3.15 | Export Partner Data | 1. Click export 2. Select format | Data exported |

---

## Phase 4: Newsletter System

### Training Guide

#### 4.1 Subscription Lists

**Admin Location:** `/admin/newsletter`

Default subscription lists:
| List | Description | Frequency |
|------|-------------|-----------|
| Weekly Digest | Top stories of the week | Weekly |
| Founder Digest | Startup-focused content | Weekly |
| Investor Brief | Investment news | Weekly |
| Job Alerts | New job postings | Daily |
| Event Updates | Upcoming events | As needed |
| Breaking News | Major announcements | Real-time |

#### 4.2 Subscriber Management

**Managing Subscribers:**
1. Navigate to Admin → Newsletter → Subscribers
2. View subscriber list with status and lists
3. Filter by list, status, or date
4. Export subscriber data
5. Manually add or remove subscribers

#### 4.3 Email Campaigns

**Creating Campaigns:**
1. Navigate to Admin → Newsletter → Campaigns
2. Click "New Campaign"
3. Select target list(s)
4. Compose email content
5. Schedule or send immediately

#### 4.4 Lead Capture

**Admin Location:** `/admin/newsletter` → Leads tab

Leads are captured from:
- Gated template downloads
- Calculator results
- Newsletter signup forms
- Event registrations

### Test Cases - Phase 4

| TC# | Test Case | Steps | Expected Result |
|-----|-----------|-------|-----------------|
| 4.1 | View Subscribers | 1. Go to /admin/newsletter | Subscriber list displayed |
| 4.2 | Add Subscriber | 1. Click "Add Subscriber" 2. Enter email 3. Save | Subscriber added |
| 4.3 | Subscribe to List | 1. Edit subscriber 2. Add to list | Subscriber added to list |
| 4.4 | Unsubscribe | 1. Edit subscriber 2. Remove from list | Subscriber removed from list |
| 4.5 | Public Signup | 1. Go to /newsletter 2. Enter email 3. Submit | Subscriber created, confirmation shown |
| 4.6 | Dashboard Preferences | 1. Go to /dashboard 2. Toggle newsletter | Preference updated |
| 4.7 | Create Campaign | 1. Go to Campaigns 2. Create new 3. Fill form | Campaign created |
| 4.8 | Schedule Campaign | 1. Create campaign 2. Set schedule date | Campaign scheduled |
| 4.9 | View Campaign Stats | 1. Select sent campaign | Open/click rates displayed |
| 4.10 | View Leads | 1. Go to Leads tab | Lead list with sources |
| 4.11 | Update Lead Status | 1. Select lead 2. Change status | Status updated |
| 4.12 | Filter Subscribers | 1. Apply list filter | Filtered results shown |
| 4.13 | Export Subscribers | 1. Click export | CSV downloaded |
| 4.14 | Double Opt-in | 1. Sign up 2. Verify email | Subscriber verified |
| 4.15 | Unsubscribe Link | 1. Click unsubscribe in email | Subscriber unsubscribed |

---

## Phase 5: Writer Monetization

### Training Guide

#### 5.1 Writer Tiers

| Tier | Revenue Share | Requirements |
|------|---------------|--------------|
| New | 40% | < 5 published articles |
| Regular | 50% | 5-20 articles, good engagement |
| Senior | 60% | 20-50 articles, high engagement |
| Expert | 70% | 50+ articles, industry expert |

#### 5.2 Writer Applications

**Admin Location:** `/admin/writers`

Application workflow:
1. Writer submits application
2. Admin reviews portfolio and samples
3. Approve or reject application
4. If approved, writer account created

#### 5.3 Article Earnings

Earnings are calculated based on:
- Article views
- Engagement metrics
- Writer tier
- Revenue share percentage

#### 5.4 Writer Payouts

**Payout Process:**
1. Review pending earnings
2. Create payout batch
3. Process payment (manual or Stripe)
4. Mark as completed

### Test Cases - Phase 5

| TC# | Test Case | Steps | Expected Result |
|-----|-----------|-------|-----------------|
| 5.1 | View Applications | 1. Go to /admin/writers | Applications list displayed |
| 5.2 | Review Application | 1. Select application 2. View details | Application details shown |
| 5.3 | Approve Writer | 1. Select application 2. Click Approve | Writer account created |
| 5.4 | Reject Application | 1. Select application 2. Click Reject | Application rejected |
| 5.5 | View Active Writers | 1. Go to Active Writers tab | Writers list with tiers |
| 5.6 | Change Writer Tier | 1. Edit writer 2. Change tier 3. Save | Tier and revenue share updated |
| 5.7 | View Writer Stats | 1. Select writer | Stats dashboard shown |
| 5.8 | View Article Earnings | 1. Go to writer earnings | Earnings by article listed |
| 5.9 | Create Writer Payout | 1. Go to Payouts 2. Create payout | Payout created |
| 5.10 | Process Payout | 1. Select payout 2. Mark as paid | Status updated |
| 5.11 | Writer Dashboard | 1. Sign in as writer 2. View dashboard | Writer sees their earnings |
| 5.12 | Submit Article | 1. Sign in as writer 2. Create article | Article submitted for review |
| 5.13 | View Earnings History | 1. View writer earnings history | Historical earnings shown |
| 5.14 | Deactivate Writer | 1. Edit writer 2. Deactivate | Writer deactivated |
| 5.15 | Writer Application Form | 1. Go to public writer application | Application form displayed |

---

## Phase 6: Advertising System

### Training Guide

#### 6.1 Ad Slots

**Admin Location:** `/admin/advertising`

Available ad slots:
| Slot | Location | Dimensions |
|------|----------|------------|
| Header Banner | Top of page | 728x90 |
| Sidebar | Right column | 300x250 |
| In-Article | Within content | 300x250 |
| Footer | Bottom of page | 728x90 |
| Interstitial | Full screen | 640x480 |

#### 6.2 Campaign Management

**Creating Campaigns:**
1. Navigate to Admin → Advertising → Campaigns
2. Click "New Campaign"
3. Set campaign details:
   - Name and advertiser
   - Budget and dates
   - Target slots
   - Creatives
4. Activate campaign

#### 6.3 Creative Management

**Supported Formats:**
- Image (JPG, PNG, GIF)
- HTML5
- Video (MP4)

#### 6.4 Reporting

**Available Metrics:**
- Impressions
- Clicks
- CTR (Click-through rate)
- Revenue
- eCPM

### Test Cases - Phase 6

| TC# | Test Case | Steps | Expected Result |
|-----|-----------|-------|-----------------|
| 6.1 | View Campaigns | 1. Go to /admin/advertising | Campaigns list displayed |
| 6.2 | Create Campaign | 1. Click "New Campaign" 2. Fill form 3. Save | Campaign created |
| 6.3 | Set Campaign Budget | 1. Edit campaign 2. Set budget | Budget saved |
| 6.4 | Schedule Campaign | 1. Edit campaign 2. Set dates | Dates saved |
| 6.5 | View Ad Slots | 1. Go to Ad Slots tab | Slots list displayed |
| 6.6 | Create Ad Slot | 1. Click "Add Slot" 2. Fill form | Slot created |
| 6.7 | Upload Creative | 1. Go to Creatives 2. Upload image | Creative uploaded |
| 6.8 | Assign Creative | 1. Edit campaign 2. Assign creative | Creative assigned |
| 6.9 | Activate Campaign | 1. Edit campaign 2. Set status active | Campaign activated |
| 6.10 | View Campaign Stats | 1. Select campaign | Impressions/clicks shown |
| 6.11 | Track Impression | 1. Load page with ad | Impression recorded |
| 6.12 | Track Click | 1. Click on ad | Click recorded, redirected |
| 6.13 | Pause Campaign | 1. Edit campaign 2. Pause | Campaign paused |
| 6.14 | View Analytics | 1. Go to Analytics tab | Charts and metrics shown |
| 6.15 | Export Report | 1. Select date range 2. Export | Report downloaded |

---

## Phase 7: SEO Module

### Training Guide

#### 7.1 SEO Settings

**Admin Location:** `/admin/seo`

**Global Settings:**
- Site title and description
- Default OG image
- Twitter card settings
- Google Analytics ID
- Schema.org settings

#### 7.2 Page-Level SEO

Each content type has SEO fields:
- Meta title (60 chars max)
- Meta description (160 chars max)
- OG image
- Canonical URL
- Robots directives

#### 7.3 Sitemaps

**Generated Sitemaps:**
- `/sitemap.xml` - Index
- `/sitemap-articles.xml` - Articles
- `/sitemap-companies.xml` - Companies
- `/sitemap-jobs.xml` - Jobs
- `/sitemap-events.xml` - Events
- `/sitemap-playbooks.xml` - Playbooks
- `/sitemap-regulations.xml` - Regulations

#### 7.4 JSON-LD Schemas

Automatically generated for:
- Articles (NewsArticle)
- Companies (Organization)
- Jobs (JobPosting)
- Events (Event)
- People (Person)
- Perks (Offer)
- Calculators (WebApplication)

### Test Cases - Phase 7

| TC# | Test Case | Steps | Expected Result |
|-----|-----------|-------|-----------------|
| 7.1 | View SEO Settings | 1. Go to /admin/seo | Settings page displayed |
| 7.2 | Update Site Title | 1. Edit site title 2. Save | Title updated |
| 7.3 | Set OG Image | 1. Upload OG image 2. Save | Image set as default |
| 7.4 | Edit Article SEO | 1. Edit article 2. Update meta fields | SEO fields saved |
| 7.5 | View Sitemap | 1. Go to /sitemap.xml | Sitemap XML displayed |
| 7.6 | Check Robots.txt | 1. Go to /robots.txt | Robots.txt with correct rules |
| 7.7 | Verify JSON-LD | 1. View article source | JSON-LD schema present |
| 7.8 | SEO Audit | 1. Go to SEO Audit tab 2. Run audit | Audit results shown |
| 7.9 | Fix SEO Issue | 1. View audit issue 2. Fix 3. Re-audit | Issue resolved |
| 7.10 | Canonical URL | 1. Set canonical on article | Canonical tag in HTML |
| 7.11 | Noindex Page | 1. Set noindex on page | Robots meta tag present |
| 7.12 | OG Tags | 1. View page source | OG tags present |
| 7.13 | Twitter Cards | 1. View page source | Twitter card tags present |
| 7.14 | Structured Data Test | 1. Use Google's testing tool | No errors |
| 7.15 | Mobile SEO | 1. Check mobile viewport | Viewport meta present |

---

## Phase 8: Security

### Training Guide

#### 8.1 RBAC Middleware

All admin routes are protected by RBAC middleware:
- Checks user authentication
- Validates role permissions
- Enforces scope restrictions (all/own/team)

#### 8.2 Session Management

**Session Limits:**
- Maximum 5 concurrent sessions per user
- Sessions expire after 30 days of inactivity
- Suspicious login detection

#### 8.3 Rate Limiting

**Default Limits:**
| Endpoint Type | Limit |
|---------------|-------|
| Public API | 100 req/min |
| Authenticated API | 300 req/min |
| Admin API | 500 req/min |
| Auth endpoints | 10 req/min |

#### 8.4 Audit Logging

All admin actions are logged:
- User ID and role
- Action performed
- Resource affected
- Timestamp
- IP address

**Viewing Audit Logs:**
1. Navigate to Admin → Settings → Audit Logs
2. Filter by user, action, or date
3. Export logs for compliance

### Test Cases - Phase 8

| TC# | Test Case | Steps | Expected Result |
|-----|-----------|-------|-----------------|
| 8.1 | Permission Denied | 1. Sign in as Editor 2. Try admin-only action | Access denied |
| 8.2 | Role Check | 1. Assign role 2. Verify permissions | Permissions match role |
| 8.3 | Session Limit | 1. Sign in on 6 devices | Oldest session terminated |
| 8.4 | Session Expiry | 1. Wait 30 days 2. Try to access | Session expired, re-login required |
| 8.5 | Rate Limit Hit | 1. Make 101 requests in 1 minute | 429 error returned |
| 8.6 | Audit Log Entry | 1. Perform admin action 2. Check audit log | Action logged |
| 8.7 | View Audit Logs | 1. Go to audit logs | Logs displayed |
| 8.8 | Filter Audit Logs | 1. Filter by user | Filtered results shown |
| 8.9 | Export Audit Logs | 1. Click export | Logs exported |
| 8.10 | CSRF Protection | 1. Try cross-site request | Request blocked |
| 8.11 | XSS Prevention | 1. Try script injection | Script escaped |
| 8.12 | SQL Injection | 1. Try SQL injection | Query parameterized |
| 8.13 | Secure Headers | 1. Check response headers | Security headers present |
| 8.14 | HTTPS Redirect | 1. Access via HTTP | Redirected to HTTPS |
| 8.15 | Password Policy | 1. Try weak password | Rejected with message |

---

## Appendix A: Admin Navigation Reference

```
Admin Dashboard (/admin)
├── Content
│   ├── Articles (/admin/articles)
│   ├── Companies (/admin/companies)
│   ├── Events (/admin/events)
│   ├── Jobs (/admin/jobs)
│   ├── People (/admin/people)
│   ├── Investors (/admin/investors)
│   └── Accelerators (/admin/accelerators)
├── Resources (/admin/resources)
├── Partners
│   ├── All Partners (/admin/partners)
│   ├── Affiliate Tracking
│   └── Payouts
├── Newsletter
│   ├── Subscribers (/admin/newsletter)
│   ├── Campaigns
│   └── Leads
├── Writers
│   ├── Applications (/admin/writers)
│   ├── Active Writers
│   └── Payouts
├── Advertising
│   ├── Campaigns (/admin/advertising)
│   ├── Ad Slots
│   ├── Creatives
│   └── Analytics
├── Users & Roles
│   ├── Users (/admin/users)
│   └── Roles & Permissions (/admin/roles)
├── SEO (/admin/seo)
└── Settings (/admin/settings)
```

---

## Appendix B: API Endpoints Reference

### Authentication
- `POST /api/oauth/callback` - OAuth callback
- `POST /api/trpc/auth.logout` - Logout

### User Profile
- `GET /api/trpc/userProfile.getProfile` - Get profile
- `POST /api/trpc/userProfile.updateProfile` - Update profile
- `GET /api/trpc/userProfile.getNewsletterSubscriptions` - Get subscriptions
- `POST /api/trpc/userProfile.updateNewsletterSubscription` - Update subscription

### Admin APIs
- `/api/trpc/admin.rbac.*` - RBAC management
- `/api/trpc/admin.partners.*` - Partner management
- `/api/trpc/admin.newsletter.*` - Newsletter management
- `/api/trpc/admin.writers.*` - Writer management
- `/api/trpc/admin.advertising.*` - Advertising management

---

## Appendix C: Database Tables Reference

### Phase 1 Tables
- `users` - User accounts
- `roles` - System roles
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mapping
- `user_roles` - User role assignments

### Phase 3 Tables
- `partners` - Partner companies
- `partner_users` - Partner team members
- `partner_api_keys` - API keys
- `affiliate_clicks` - Click tracking
- `affiliate_conversions` - Conversion tracking
- `partner_payouts` - Payout records

### Phase 4 Tables
- `subscribers` - Newsletter subscribers
- `subscription_lists` - Newsletter lists
- `subscriber_lists` - Subscriber-list mapping
- `email_campaigns` - Campaign records
- `leads` - Lead capture

### Phase 5 Tables
- `writer_applications` - Applications
- `writer_profiles` - Writer details
- `article_earnings` - Earnings records
- `writer_payouts` - Payout records

### Phase 6 Tables
- `ad_slots` - Ad placements
- `ad_campaigns` - Campaigns
- `ad_creatives` - Creative assets
- `ad_impressions` - Impression tracking
- `ad_clicks` - Click tracking

---

**End of Document**
