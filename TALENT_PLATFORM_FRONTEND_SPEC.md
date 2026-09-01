# Talent Intelligence Platform - Frontend Specification

**Document Type:** Frontend Development Specification  
**Target Audience:** Claude (AI Developer)  
**Status:** Ready for Implementation  
**Priority:** Phase 1 - Foundation (Tenant Admin UI, Candidate Portal, Recruiter Dashboard)

---

## Overview

This specification provides detailed requirements for building the Talent Intelligence Platform frontend. The frontend consists of three main applications:

1. **Tenant Admin Portal** - Organization settings, user management, integrations
2. **Candidate Portal** - Job search, applications, profile management
3. **Recruiter Dashboard** - Job management, candidate pipeline, hiring workflows

All three applications share the same backend (tRPC API), database, and authentication system but are accessed via different routes or subdomains.

---

## Technology Stack

### Core Technologies
- **React 19** - Latest React with concurrent rendering and automatic batching
- **TypeScript** - Full type safety for all components and logic
- **Tailwind CSS 4** - Utility-first styling with OKLCH color format
- **tRPC Client** - Type-safe API integration with automatic type inference
- **React Router** - Client-side routing (wouter or React Router v6)
- **TanStack Query** - Server state management, caching, synchronization
- **shadcn/ui** - Pre-built accessible components (Button, Card, Dialog, Form, etc.)
- **Zod** - Schema validation for forms and API responses

### Additional Libraries
- **date-fns** - Date formatting and manipulation
- **lucide-react** - Icon library (200+ icons)
- **clsx** - Conditional className utility
- **react-hook-form** - Efficient form handling
- **recharts** - Data visualization for analytics
- **react-hot-toast** - Toast notifications

### Development Tools
- **Vite** - Fast build tool and dev server
- **Vitest** - Unit testing framework
- **Storybook** - Component documentation (optional)

---

## Design System

### Color Palette

**Primary Colors** (OKLCH format)
```css
--primary: oklch(0.6 0.2 250)          /* Deep blue */
--primary-foreground: oklch(1 0 0)     /* White */

--secondary: oklch(0.7 0.15 200)       /* Light blue */
--secondary-foreground: oklch(0.2 0 0) /* Dark gray */

--accent: oklch(0.65 0.2 140)          /* Green - for success/positive actions */
--accent-foreground: oklch(1 0 0)      /* White */

--destructive: oklch(0.6 0.2 20)       /* Red - for delete/negative actions */
--destructive-foreground: oklch(1 0 0) /* White */

--background: oklch(0.98 0 0)          /* Near white */
--foreground: oklch(0.2 0 0)           /* Dark gray */

--muted: oklch(0.85 0.05 0)            /* Light gray */
--muted-foreground: oklch(0.5 0 0)     /* Medium gray */

--border: oklch(0.9 0.05 0)            /* Very light gray */
--input: oklch(0.95 0.02 0)            /* Input background */
--ring: oklch(0.6 0.2 250)             /* Focus ring (primary) */
```

### Typography

**Font Stack**
- **Body:** -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
- **Monospace:** "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace

**Font Sizes**
- **xs:** 12px (0.75rem)
- **sm:** 14px (0.875rem)
- **base:** 16px (1rem)
- **lg:** 18px (1.125rem)
- **xl:** 20px (1.25rem)
- **2xl:** 24px (1.5rem)
- **3xl:** 30px (1.875rem)
- **4xl:** 36px (2.25rem)

**Font Weights**
- **Regular:** 400
- **Medium:** 500
- **Semibold:** 600
- **Bold:** 700

### Spacing Scale
```
0, 2px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 56px, 64px
(0, 0.125rem, 0.25rem, 0.5rem, 0.75rem, 1rem, 1.25rem, 1.5rem, 2rem, 2.5rem, 3rem, 3.5rem, 4rem)
```

### Border Radius
- **sm:** 4px (0.25rem)
- **md:** 6px (0.375rem)
- **lg:** 8px (0.5rem)
- **xl:** 12px (0.75rem)
- **2xl:** 16px (1rem)
- **full:** 9999px (circles, pills)

### Shadows
- **sm:** 0 1px 2px rgba(0, 0, 0, 0.05)
- **md:** 0 4px 6px rgba(0, 0, 0, 0.1)
- **lg:** 0 10px 15px rgba(0, 0, 0, 0.1)
- **xl:** 0 20px 25px rgba(0, 0, 0, 0.1)

---

## Application Structure

### Route Architecture

```
/
├── /auth
│   ├── /login                    # Email/password login
│   ├── /signup                   # Candidate registration
│   └── /forgot-password          # Password reset
│
├── /app                          # Authenticated routes
│   ├── /dashboard                # User's main dashboard
│   │   ├── /recruiter            # Recruiter dashboard (if role=recruiter)
│   │   ├── /candidate            # Candidate portal (if role=candidate)
│   │   └── /admin                # Tenant admin (if role=admin)
│   │
│   ├── /jobs                     # Job search & management
│   │   ├── /                     # Job listing
│   │   ├── /:jobId               # Job detail
│   │   ├── /new                  # Create job (recruiter)
│   │   ├── /:jobId/edit          # Edit job (recruiter)
│   │   └── /:jobId/applications  # View applications (recruiter)
│   │
│   ├── /candidates               # Candidate management (recruiter)
│   │   ├── /                     # Candidate search & pipeline
│   │   ├── /:candidateId         # Candidate detail
│   │   └── /:candidateId/assess  # Assessment portal
│   │
│   ├── /applications             # Application tracking (candidate)
│   │   ├── /                     # My applications
│   │   ├── /:applicationId       # Application detail
│   │   └── /:applicationId/assess # Take assessment
│   │
│   ├── /interviews               # Interview scheduling
│   │   ├── /                     # Interview calendar
│   │   ├── /schedule             # Schedule new interview
│   │   └── /:interviewId         # Interview detail
│   │
│   ├── /assessments              # Assessment portal
│   │   ├── /                     # Available assessments
│   │   ├── /:assessmentId        # Take assessment
│   │   └── /:assessmentId/results # View results
│   │
│   ├── /profile                  # User profile
│   │   ├── /                     # Profile overview
│   │   ├── /edit                 # Edit profile
│   │   ├── /skills               # Manage skills
│   │   └── /preferences          # Job preferences
│   │
│   ├── /admin                    # Tenant administration
│   │   ├── /settings             # Organization settings
│   │   ├── /users                # User management
│   │   ├── /workflows            # Workflow builder
│   │   ├── /integrations         # Integration hub
│   │   ├── /billing              # Subscription & billing
│   │   └── /compliance           # Compliance reports
│   │
│   └── /settings                 # User settings
│       ├── /account              # Account settings
│       ├── /notifications        # Notification preferences
│       ├── /privacy              # Privacy settings
│       └── /logout               # Logout
│
└── /public
    ├── /                         # Landing page (if public)
    ├── /jobs                     # Public job board
    ├── /about                    # About page
    └── /contact                  # Contact page
```

### Layout Components

#### Main Layout (Authenticated)
- **Header** - Logo, search, notifications, user menu
- **Sidebar** - Navigation menu, collapsible on mobile
- **Main Content** - Page-specific content
- **Footer** - Links, copyright (optional)

#### Recruiter Dashboard Layout
```
┌─────────────────────────────────────────┐
│ Header (Logo, Search, Notifications)    │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Main Content                │
│          │  ┌────────────────────────┐  │
│ - Jobs   │  │ Kanban Board           │  │
│ - Cands  │  │ (Pipeline Stages)      │  │
│ - Intrvw │  │                        │  │
│ - Admin  │  │ Applied → Screened →   │  │
│ - Sett   │  │ Interviewed → Offered  │  │
│          │  └────────────────────────┘  │
│          │                              │
└──────────┴──────────────────────────────┘
```

#### Candidate Portal Layout
```
┌─────────────────────────────────────────┐
│ Header (Logo, Search, Notifications)    │
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │  Main Content                │
│          │  ┌────────────────────────┐  │
│ - Search │  │ Job Feed               │  │
│ - Apps   │  │ (Personalized Jobs)    │  │
│ - Intrvw │  │                        │  │
│ - Assess │  │ [Job Card] [Job Card]  │  │
│ - Profile│  │ [Job Card] [Job Card]  │  │
│ - Sett   │  └────────────────────────┘  │
│          │                              │
└──────────┴──────────────────────────────┘
```

---

## Phase 1: Tenant Admin UI

### Purpose
Enable organization admins to manage their tenant without using curl commands. This is the foundation for all other features.

### Pages & Components

#### 1. Admin Dashboard (`/app/admin`)
**Purpose:** Overview of tenant health and key metrics

**Layout:**
- Header with tenant name and logo
- Quick stats cards (active jobs, total candidates, team members)
- Recent activity feed
- Quick actions (create job, invite user, view analytics)

**Components:**
```tsx
<AdminDashboard>
  <StatsCard icon="briefcase" label="Active Jobs" value={12} />
  <StatsCard icon="users" label="Team Members" value={5} />
  <StatsCard icon="target" label="Applications" value={342} />
  <StatsCard icon="check" label="Hired" value={8} />
  
  <RecentActivityFeed />
  <QuickActions />
</AdminDashboard>
```

**Data Requirements:**
- `admin.getDashboardStats()` - Returns stats for cards
- `admin.getRecentActivity()` - Returns activity feed

#### 2. Organization Settings (`/app/admin/settings`)
**Purpose:** Manage tenant configuration

**Sections:**

**A. Basic Information**
- Organization name (text input)
- Logo upload (image uploader)
- Website URL (text input)
- Industry (select dropdown)
- Company size (select dropdown)
- Location (text input)

**B. Domain Configuration**
- Primary domain (e.g., acme.techscoop.com)
- Custom domain (if purchased)
- Domain status (connected/pending/error)
- SSL certificate status

**C. Branding**
- Primary color picker
- Secondary color picker
- Logo upload
- Favicon upload
- Email template branding

**D. Subscription & Billing**
- Current plan (Starter/Professional/Enterprise)
- Billing period (monthly/annual)
- Next billing date
- Payment method
- Upgrade/downgrade button

**Components:**
```tsx
<SettingsPage>
  <SettingsSection title="Basic Information">
    <TextInput label="Organization Name" />
    <ImageUploader label="Logo" />
    <TextInput label="Website URL" />
    <Select label="Industry" options={industries} />
  </SettingsSection>
  
  <SettingsSection title="Domain">
    <DomainStatus domain="acme.techscoop.com" status="connected" />
    <CustomDomainInput />
  </SettingsSection>
  
  <SettingsSection title="Branding">
    <ColorPicker label="Primary Color" />
    <ImageUploader label="Logo" />
  </SettingsSection>
  
  <SettingsSection title="Billing">
    <PlanCard plan="Professional" price={2000} />
    <Button>Upgrade Plan</Button>
  </SettingsSection>
</SettingsPage>
```

**Data Requirements:**
- `admin.getSettings()` - Get current settings
- `admin.updateSettings(data)` - Update settings
- `admin.getPlans()` - Get available plans
- `admin.upgradePlan(planId)` - Upgrade subscription

#### 3. User Management (`/app/admin/users`)
**Purpose:** Manage team members and their permissions

**Features:**
- List all team members with roles
- Invite new users via email
- Edit user roles and permissions
- Deactivate/remove users
- View user activity

**Layout:**
```
┌─────────────────────────────────┐
│ User Management                 │
├─────────────────────────────────┤
│ [Search] [+ Invite User]        │
├─────────────────────────────────┤
│ Name        | Role      | Actions│
├─────────────────────────────────┤
│ John Doe    | Admin     | Edit  │
│ Jane Smith  | Recruiter | Edit  │
│ Bob Wilson  | Recruiter | Edit  │
│ Alice Brown | Viewer    | Edit  │
└─────────────────────────────────┘
```

**Components:**
```tsx
<UserManagement>
  <SearchBar placeholder="Search users..." />
  <Button onClick={openInviteDialog}>+ Invite User</Button>
  
  <UserTable
    columns={['Name', 'Email', 'Role', 'Status', 'Actions']}
    data={users}
    onEdit={handleEditUser}
    onDelete={handleDeleteUser}
  />
  
  <InviteUserDialog open={inviteOpen} onClose={closeInviteDialog} />
</UserManagement>
```

**Roles:**
- **Admin** - Full access to all settings and features
- **Recruiter** - Can post jobs, manage candidates, schedule interviews
- **Hiring Manager** - Can view candidates and provide feedback
- **Viewer** - Read-only access to analytics and reports

**Data Requirements:**
- `admin.listUsers()` - Get all team members
- `admin.inviteUser(email, role)` - Send invite
- `admin.updateUserRole(userId, role)` - Change role
- `admin.removeUser(userId)` - Remove user

#### 4. Workflow Configuration (`/app/admin/workflows`)
**Purpose:** Define hiring process stages and automation rules

**Features:**
- Drag-and-drop pipeline builder
- Define approval chains
- Create automation rules
- Email template customization

**Layout:**
```
┌──────────────────────────────────────┐
│ Workflow Builder                     │
├──────────────────────────────────────┤
│ [+ Add Stage]                        │
│                                      │
│ ┌────────┐  ┌────────┐  ┌────────┐ │
│ │Applied │→ │Screened│→ │Interview│ │
│ └────────┘  └────────┘  └────────┘ │
│                                      │
│ ┌────────┐  ┌────────┐              │
│ │ Offered│→ │ Hired  │              │
│ └────────┘  └────────┘              │
│                                      │
│ [+ Add Automation Rule]              │
│ • If Applied → Send email            │
│ • If Screened → Notify recruiter     │
└──────────────────────────────────────┘
```

**Components:**
```tsx
<WorkflowBuilder>
  <PipelineCanvas>
    <Stage name="Applied" color="blue" />
    <Stage name="Screened" color="green" />
    <Stage name="Interviewed" color="purple" />
    <Stage name="Offered" color="gold" />
    <Stage name="Hired" color="green" />
  </PipelineCanvas>
  
  <AutomationRules>
    <Rule trigger="Applied" action="Send email" />
    <Rule trigger="Screened" action="Notify recruiter" />
  </AutomationRules>
</WorkflowBuilder>
```

**Data Requirements:**
- `admin.getWorkflow()` - Get current workflow
- `admin.updateWorkflow(stages)` - Update stages
- `admin.getAutomationRules()` - Get rules
- `admin.createAutomationRule(rule)` - Create rule

#### 5. Integration Hub (`/app/admin/integrations`)
**Purpose:** Connect to external services

**Integrations:**
- **Calendar** - Google Calendar, Outlook
- **Email** - Gmail, Outlook
- **Communication** - Slack, Microsoft Teams
- **HR Systems** - BambooHR, Workday
- **Job Boards** - LinkedIn, Indeed, Glassdoor
- **Video** - Zoom, Google Meet

**Layout:**
```
┌─────────────────────────────────────┐
│ Integrations                        │
├─────────────────────────────────────┤
│ [Search integrations...]            │
├─────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐   │
│ │ Google Cal  │  │ Slack       │   │
│ │ Connected ✓ │  │ Not Connected│  │
│ │ [Configure] │  │ [Connect]   │   │
│ └─────────────┘  └─────────────┘   │
│                                      │
│ ┌─────────────┐  ┌─────────────┐   │
│ │ LinkedIn    │  │ Zoom        │   │
│ │ Connected ✓ │  │ Connected ✓ │   │
│ │ [Configure] │  │ [Configure] │   │
│ └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
```

**Components:**
```tsx
<IntegrationHub>
  <SearchBar placeholder="Search integrations..." />
  
  <IntegrationGrid>
    <IntegrationCard
      name="Google Calendar"
      icon={googleCalIcon}
      status="connected"
      onConnect={handleConnect}
      onConfigure={handleConfigure}
    />
    <IntegrationCard
      name="Slack"
      icon={slackIcon}
      status="not_connected"
      onConnect={handleConnect}
    />
  </IntegrationGrid>
</IntegrationHub>
```

**Data Requirements:**
- `admin.listIntegrations()` - Get all available integrations
- `admin.getIntegrationStatus(integrationId)` - Get status
- `admin.connectIntegration(integrationId, credentials)` - Connect
- `admin.updateIntegrationConfig(integrationId, config)` - Configure

#### 6. Compliance & Reports (`/app/admin/compliance`)
**Purpose:** Generate compliance reports (EEO, GDPR, etc.)

**Features:**
- EEO-1 report generator
- GDPR data export
- Hiring metrics report
- Diversity metrics
- Audit log viewer

**Components:**
```tsx
<CompliancePage>
  <ReportGenerator>
    <ReportType value="eeo1" label="EEO-1 Report" />
    <ReportType value="gdpr" label="GDPR Data Export" />
    <ReportType value="diversity" label="Diversity Report" />
    <Button>Generate Report</Button>
  </ReportGenerator>
  
  <AuditLog
    entries={auditLog}
    onFilter={handleFilter}
  />
</CompliancePage>
```

**Data Requirements:**
- `admin.generateReport(reportType, dateRange)` - Generate report
- `admin.getAuditLog(filters)` - Get audit log
- `admin.exportData(format)` - Export data

---

## Phase 2: Candidate Portal

### Purpose
Enable job seekers to search jobs, apply, track applications, and manage profiles.

### Pages & Components

#### 1. Job Search & Discovery (`/app/jobs`)
**Purpose:** Browse and search job opportunities

**Features:**
- Personalized job feed (AI-curated based on profile)
- Advanced search and filters
- Save jobs for later
- Job alerts

**Layout:**
```
┌──────────────────────────────────────┐
│ Header                               │
├──────────────────────────────────────┤
│ [Search] [Filters]                   │
├──────────┬──────────────────────────┤
│ Filters  │ Job Feed                 │
│          │ ┌────────────────────┐   │
│ Location │ │ Senior Developer   │   │
│ Salary   │ │ Acme Corp          │   │
│ Remote   │ │ $120k-150k         │   │
│ Skills   │ │ [Save] [Apply]     │   │
│          │ └────────────────────┘   │
│          │ ┌────────────────────┐   │
│          │ │ Product Manager    │   │
│          │ │ TechCorp           │   │
│          │ │ $100k-130k         │   │
│          │ │ [Save] [Apply]     │   │
│          │ └────────────────────┘   │
└──────────┴──────────────────────────┘
```

**Components:**
```tsx
<JobSearch>
  <SearchBar placeholder="Search jobs..." />
  <FilterPanel
    filters={['location', 'salary', 'remote', 'skills', 'company']}
  />
  
  <JobFeed>
    {jobs.map(job => (
      <JobCard
        key={job.id}
        job={job}
        onSave={handleSaveJob}
        onApply={handleApply}
      />
    ))}
  </JobFeed>
</JobSearch>
```

**Data Requirements:**
- `jobs.list(filters, page)` - Get job list
- `jobs.getRecommended()` - Get personalized recommendations
- `jobs.saveJob(jobId)` - Save job
- `jobs.unsaveJob(jobId)` - Unsave job

#### 2. Job Detail (`/app/jobs/:jobId`)
**Purpose:** View full job details and apply

**Sections:**
- Job title, company, salary
- Job description
- Requirements and qualifications
- Company information
- Similar jobs
- Apply button

**Components:**
```tsx
<JobDetail job={job}>
  <JobHeader
    title={job.title}
    company={job.company}
    salary={job.salary}
    location={job.location}
  />
  
  <JobDescription content={job.description} />
  
  <RequirementsList requirements={job.requirements} />
  
  <CompanyCard company={job.company} />
  
  <SimilarJobs jobs={similarJobs} />
  
  <Button size="lg" onClick={handleApply}>Apply Now</Button>
</JobDetail>
```

**Data Requirements:**
- `jobs.getDetail(jobId)` - Get job details
- `jobs.getSimilar(jobId)` - Get similar jobs
- `jobs.apply(jobId)` - Submit application

#### 3. Application Tracking (`/app/applications`)
**Purpose:** Track all applications and their status

**Features:**
- List all applications with status
- Filter by status (applied, screening, interviewed, offered, rejected)
- View application timeline
- Withdraw application

**Layout:**
```
┌──────────────────────────────────────┐
│ My Applications                      │
├──────────────────────────────────────┤
│ [All] [Applied] [Screening] [Offered]│
├──────────────────────────────────────┤
│ Job Title          | Company | Status│
├──────────────────────────────────────┤
│ Senior Developer   | Acme    | 🟢 Int│
│ Product Manager    | Tech    | 🟡 Scr│
│ Designer           | Corp    | 🔴 Rej│
│ Engineer           | Start   | 🟢 Off│
└──────────────────────────────────────┘
```

**Components:**
```tsx
<ApplicationTracking>
  <StatusTabs
    tabs={['All', 'Applied', 'Screening', 'Interviewed', 'Offered', 'Rejected']}
    active={activeStatus}
    onChange={setActiveStatus}
  />
  
  <ApplicationList
    applications={applications}
    onViewDetail={handleViewDetail}
    onWithdraw={handleWithdraw}
  />
</ApplicationTracking>
```

**Data Requirements:**
- `applications.list(status)` - Get applications
- `applications.getDetail(applicationId)` - Get details
- `applications.withdraw(applicationId)` - Withdraw

#### 4. Application Detail (`/app/applications/:applicationId`)
**Purpose:** View application status and timeline

**Sections:**
- Application status
- Timeline (applied → screening → interviewed → offered)
- Messages from recruiter
- Next steps
- Assessment status (if applicable)

**Components:**
```tsx
<ApplicationDetail application={application}>
  <StatusBadge status={application.status} />
  
  <Timeline
    events={[
      { date: '2024-01-15', status: 'Applied', message: 'Application received' },
      { date: '2024-01-18', status: 'Screening', message: 'Passed initial screening' },
      { date: '2024-01-22', status: 'Interview', message: 'Interview scheduled' },
    ]}
  />
  
  <AssessmentCard assessment={application.assessment} />
  
  <MessageThread messages={application.messages} />
  
  <NextSteps steps={application.nextSteps} />
</ApplicationDetail>
```

**Data Requirements:**
- `applications.getDetail(applicationId)` - Get full details
- `applications.getTimeline(applicationId)` - Get timeline
- `applications.getMessages(applicationId)` - Get messages

#### 5. Profile Management (`/app/profile`)
**Purpose:** Manage candidate profile and preferences

**Sections:**

**A. Profile Overview**
- Profile photo
- Name, email, phone
- Location, timezone
- Bio/headline

**B. Work Experience**
- Add/edit work history
- Skills extraction from experience

**C. Skills**
- Add skills
- Skill endorsements
- Assessment badges

**D. Education**
- Add education history
- Certifications

**E. Job Preferences**
- Desired roles
- Preferred locations
- Salary expectations
- Remote work preference
- Work type (full-time, contract, etc.)

**Components:**
```tsx
<ProfilePage>
  <ProfileHeader
    photo={candidate.photo}
    name={candidate.name}
    headline={candidate.headline}
  />
  
  <ProfileSection title="Work Experience">
    <WorkExperienceList experiences={candidate.experiences} />
    <Button>+ Add Experience</Button>
  </ProfileSection>
  
  <ProfileSection title="Skills">
    <SkillsList skills={candidate.skills} />
    <Button>+ Add Skill</Button>
  </ProfileSection>
  
  <ProfileSection title="Job Preferences">
    <PreferenceForm preferences={candidate.preferences} />
  </ProfileSection>
</ProfilePage>
```

**Data Requirements:**
- `profile.getProfile()` - Get current profile
- `profile.updateProfile(data)` - Update profile
- `profile.addExperience(experience)` - Add work experience
- `profile.updatePreferences(preferences)` - Update job preferences

#### 6. Assessment Portal (`/app/applications/:applicationId/assess`)
**Purpose:** Take skills assessments and coding challenges

**Features:**
- Timer for timed assessments
- Code editor for coding challenges
- Submit and view results

**Components:**
```tsx
<AssessmentPortal assessment={assessment}>
  <AssessmentHeader
    title={assessment.title}
    timeLimit={assessment.timeLimit}
    timeRemaining={timeRemaining}
  />
  
  <AssessmentContent>
    {assessment.type === 'code' && (
      <CodeEditor
        language={assessment.language}
        template={assessment.template}
        onChange={handleCodeChange}
      />
    )}
    
    {assessment.type === 'multiple_choice' && (
      <MultipleChoiceQuestion question={currentQuestion} />
    )}
  </AssessmentContent>
  
  <Button onClick={handleSubmit}>Submit Assessment</Button>
</AssessmentPortal>
```

**Data Requirements:**
- `assessments.getDetail(assessmentId)` - Get assessment
- `assessments.submit(assessmentId, answers)` - Submit answers
- `assessments.getResults(assessmentId)` - Get results

---

## Phase 3: Recruiter Dashboard

### Purpose
Enable recruiters to manage jobs, candidates, and hiring workflows.

### Pages & Components

#### 1. Recruiter Dashboard (`/app/dashboard/recruiter`)
**Purpose:** Overview of recruiting activity

**Sections:**
- Quick stats (open jobs, applications, interviews scheduled)
- Recent applications
- Upcoming interviews
- Quick actions

**Components:**
```tsx
<RecruiterDashboard>
  <StatsRow>
    <StatCard label="Open Jobs" value={12} icon="briefcase" />
    <StatCard label="Applications" value={342} icon="inbox" />
    <StatCard label="Interviews" value={8} icon="calendar" />
    <StatCard label="Offers" value={3} icon="award" />
  </StatsRow>
  
  <RecentApplications applications={recentApps} />
  <UpcomingInterviews interviews={upcomingInterviews} />
</RecruiterDashboard>
```

#### 2. Job Management (`/app/jobs`)
**Purpose:** Create, edit, and manage job postings

**Features:**
- Create new job postings
- Edit existing jobs
- View applications per job
- Publish to job boards
- Job analytics

**Layout:**
```
┌──────────────────────────────────────┐
│ Jobs                                 │
├──────────────────────────────────────┤
│ [+ New Job] [Search] [Filters]       │
├──────────────────────────────────────┤
│ Job Title          | Apps | Status   │
├──────────────────────────────────────┤
│ Senior Developer   | 45   | 🟢 Active│
│ Product Manager    | 32   | 🟢 Active│
│ Designer           | 18   | 🟡 Draft │
│ Engineer           | 0    | 🔴 Closed│
└──────────────────────────────────────┘
```

**Components:**
```tsx
<JobManagement>
  <Button onClick={handleCreateJob}>+ New Job</Button>
  
  <JobTable
    jobs={jobs}
    onEdit={handleEditJob}
    onViewApplications={handleViewApplications}
    onClose={handleCloseJob}
  />
  
  <JobEditorDialog open={editorOpen} job={editingJob} />
</JobManagement>
```

**Data Requirements:**
- `jobs.list()` - Get all jobs
- `jobs.create(jobData)` - Create job
- `jobs.update(jobId, jobData)` - Update job
- `jobs.publish(jobId, channels)` - Publish to job boards
- `jobs.close(jobId)` - Close job

#### 3. Job Editor (`/app/jobs/new` or `/app/jobs/:jobId/edit`)
**Purpose:** Create and edit job postings

**Sections:**
- Basic information (title, company, location)
- Job description (rich editor)
- Requirements and qualifications
- Salary and benefits
- Application questions
- Publish settings

**Components:**
```tsx
<JobEditor job={job} onSave={handleSave}>
  <FormSection title="Basic Information">
    <TextInput label="Job Title" required />
    <TextInput label="Location" required />
    <Select label="Job Type" options={jobTypes} />
    <CurrencyInput label="Salary Min" />
    <CurrencyInput label="Salary Max" />
  </FormSection>
  
  <FormSection title="Description">
    <RichEditor label="Job Description" required />
  </FormSection>
  
  <FormSection title="Requirements">
    <TextArea label="Required Skills" />
    <TextArea label="Preferred Skills" />
  </FormSection>
  
  <FormSection title="Application Questions">
    <DynamicFields
      fields={applicationQuestions}
      onAdd={handleAddQuestion}
      onRemove={handleRemoveQuestion}
    />
  </FormSection>
  
  <Button type="submit">Save Job</Button>
</JobEditor>
```

**Data Requirements:**
- `jobs.create(jobData)` - Create job
- `jobs.update(jobId, jobData)` - Update job

#### 4. Candidate Pipeline (`/app/candidates`)
**Purpose:** Kanban board view of candidate pipeline

**Features:**
- Drag-and-drop candidate cards between stages
- Filter by job
- Search candidates
- Bulk actions
- Candidate detail modal

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Candidate Pipeline                                      │
├─────────────────────────────────────────────────────────┤
│ [Search] [Filter by Job] [Bulk Actions]                 │
├──────────┬──────────┬──────────┬──────────┬──────────┐  │
│ Applied  │ Screened │Interview │ Offered  │  Hired   │  │
│ (45)     │ (18)     │ (8)      │ (3)      │  (2)     │  │
├──────────┼──────────┼──────────┼──────────┼──────────┤  │
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │  │
│ │John  │ │ │Jane  │ │ │Bob   │ │ │Alice │ │ │Carol │ │  │
│ │Sr Dev│ │ │PM    │ │ │Eng   │ │ │Des   │ │ │Dev   │ │  │
│ │⭐⭐⭐ │ │ │⭐⭐⭐⭐│ │ │⭐⭐⭐ │ │ │⭐⭐⭐⭐│ │ │⭐⭐⭐⭐│ │  │
│ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │  │
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │          │          │  │
│ │Mike  │ │ │Sarah │ │ │Tom   │ │          │          │  │
│ │Dev   │ │ │Eng   │ │ │Eng   │ │          │          │  │
│ │⭐⭐⭐ │ │ │⭐⭐⭐ │ │ │⭐⭐⭐⭐│ │          │          │  │
│ └──────┘ │ └──────┘ │ └──────┘ │          │          │  │
└──────────┴──────────┴──────────┴──────────┴──────────┘  │
```

**Components:**
```tsx
<CandidatePipeline>
  <SearchBar placeholder="Search candidates..." />
  <FilterPanel filters={['job', 'rating', 'skills']} />
  
  <KanbanBoard
    stages={['Applied', 'Screened', 'Interview', 'Offered', 'Hired']}
    onDragEnd={handleDragEnd}
  >
    {stages.map(stage => (
      <KanbanColumn key={stage.id} stage={stage}>
        {stage.candidates.map(candidate => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onClick={handleViewDetail}
          />
        ))}
      </KanbanColumn>
    ))}
  </KanbanBoard>
</CandidatePipeline>
```

**Data Requirements:**
- `candidates.list(filters)` - Get candidates
- `candidates.updateStage(candidateId, stageId)` - Move candidate
- `candidates.bulkUpdate(candidateIds, updates)` - Bulk actions

#### 5. Candidate Detail (`/app/candidates/:candidateId`)
**Purpose:** View full candidate profile and manage application

**Sections:**
- Candidate profile (photo, name, contact)
- Resume/CV
- Skills and experience
- Application history
- Assessment results
- Interview feedback
- Action buttons (schedule interview, send message, make offer)

**Components:**
```tsx
<CandidateDetail candidate={candidate}>
  <CandidateHeader
    name={candidate.name}
    photo={candidate.photo}
    email={candidate.email}
    phone={candidate.phone}
  />
  
  <CandidateProfile
    resume={candidate.resume}
    skills={candidate.skills}
    experience={candidate.experience}
  />
  
  <AssessmentResults assessments={candidate.assessments} />
  
  <InterviewFeedback interviews={candidate.interviews} />
  
  <ActionButtons>
    <Button onClick={handleScheduleInterview}>Schedule Interview</Button>
    <Button onClick={handleSendMessage}>Send Message</Button>
    <Button onClick={handleMakeOffer}>Make Offer</Button>
  </ActionButtons>
</CandidateDetail>
```

**Data Requirements:**
- `candidates.getDetail(candidateId)` - Get full profile
- `candidates.getAssessments(candidateId)` - Get assessments
- `candidates.getInterviews(candidateId)` - Get interviews

#### 6. Interview Scheduling (`/app/interviews`)
**Purpose:** Schedule and manage interviews

**Features:**
- Calendar view
- Schedule new interviews
- Send interview invites
- Record interview feedback
- Reschedule/cancel interviews

**Layout:**
```
┌──────────────────────────────────────┐
│ Interview Calendar                   │
├──────────────────────────────────────┤
│ [+ Schedule Interview] [Today] [Week]│
├──────────────────────────────────────┤
│ Mon 15    Tue 16    Wed 17    Thu 18 │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │10:00 │ │14:00 │ │09:00 │ │15:00 │ │
│ │John  │ │Jane  │ │Bob   │ │Alice │ │
│ │Sr Dev│ │PM    │ │Eng   │ │Des   │ │
│ └──────┘ └──────┘ └──────┘ └──────┘ │
│ ┌──────┐ ┌──────┐                    │
│ │11:00 │ │16:00 │                    │
│ │Mike  │ │Sarah │                    │
│ │Dev   │ │Eng   │                    │
│ └──────┘ └──────┘                    │
└──────────────────────────────────────┘
```

**Components:**
```tsx
<InterviewScheduling>
  <Button onClick={handleScheduleNew}>+ Schedule Interview</Button>
  
  <InterviewCalendar
    interviews={interviews}
    onViewDetail={handleViewDetail}
    onReschedule={handleReschedule}
    onCancel={handleCancel}
  />
  
  <ScheduleInterviewDialog open={scheduleOpen} />
</InterviewScheduling>
```

**Data Requirements:**
- `interviews.list(filters)` - Get interviews
- `interviews.schedule(data)` - Schedule interview
- `interviews.reschedule(interviewId, newTime)` - Reschedule
- `interviews.cancel(interviewId)` - Cancel

#### 7. Offer Management (`/app/offers`)
**Purpose:** Create and manage job offers

**Features:**
- Create offer from template
- Send offer to candidate
- Track offer status (sent, viewed, accepted, declined, negotiated)
- Counter-offer handling

**Components:**
```tsx
<OfferManagement>
  <OfferTable
    offers={offers}
    onViewDetail={handleViewDetail}
    onSendOffer={handleSendOffer}
    onWithdraw={handleWithdraw}
  />
  
  <OfferDetailModal
    offer={selectedOffer}
    onUpdate={handleUpdateOffer}
  />
</OfferManagement>
```

**Data Requirements:**
- `offers.list()` - Get all offers
- `offers.create(offerData)` - Create offer
- `offers.send(offerId)` - Send offer
- `offers.update(offerId, data)` - Update offer

---

## Shared Components

### Form Components
- **TextInput** - Single-line text input
- **TextArea** - Multi-line text input
- **Select** - Dropdown select
- **MultiSelect** - Multi-select dropdown
- **Checkbox** - Checkbox input
- **Radio** - Radio button group
- **DatePicker** - Date selection
- **TimePicker** - Time selection
- **FileUploader** - File upload
- **ImageUploader** - Image upload with preview
- **RichEditor** - Rich text editor (for job descriptions)
- **CodeEditor** - Code editor for assessments

### Data Display Components
- **Table** - Data table with sorting, filtering, pagination
- **Card** - Card container
- **Badge** - Status badge
- **Avatar** - User avatar
- **Tooltip** - Hover tooltip
- **Modal** - Modal dialog
- **Drawer** - Slide-out drawer
- **Toast** - Toast notification
- **Alert** - Alert message
- **Skeleton** - Loading skeleton

### Navigation Components
- **Header** - Top navigation bar
- **Sidebar** - Side navigation menu
- **Breadcrumb** - Breadcrumb navigation
- **Tabs** - Tab navigation
- **Pagination** - Page navigation

### Layout Components
- **Container** - Max-width container
- **Grid** - CSS grid layout
- **Flex** - Flexbox layout
- **Stack** - Vertical/horizontal stack

---

## State Management

### Global State (TanStack Query)
```typescript
// Queries
useQuery(['jobs'], () => jobs.list())
useQuery(['candidates', jobId], () => candidates.list(jobId))
useQuery(['applications'], () => applications.list())
useQuery(['profile'], () => profile.getProfile())

// Mutations
useMutation(jobs.create, {
  onSuccess: () => queryClient.invalidateQueries(['jobs'])
})
useMutation(candidates.updateStage, {
  onSuccess: () => queryClient.invalidateQueries(['candidates'])
})
```

### Local State (React Hooks)
```typescript
// Form state
const [formData, setFormData] = useState({})
const [errors, setErrors] = useState({})

// UI state
const [isOpen, setIsOpen] = useState(false)
const [selectedTab, setSelectedTab] = useState('all')
const [filters, setFilters] = useState({})
```

---

## Performance Optimization

### Code Splitting
- Route-based code splitting with React.lazy()
- Lazy load heavy components (rich editor, code editor)

### Image Optimization
- Use WebP format with fallbacks
- Lazy load images below the fold
- Responsive images with srcset

### Caching Strategy
- Cache API responses with TanStack Query
- Cache static assets with service worker
- Stale-while-revalidate pattern

### Bundle Size
- Tree-shake unused code
- Minify and compress assets
- Use dynamic imports for large libraries

---

## Accessibility (WCAG 2.1 AA)

### Keyboard Navigation
- All interactive elements accessible via keyboard
- Logical tab order
- Focus visible indicators

### Screen Reader Support
- Semantic HTML
- ARIA labels and descriptions
- Form labels associated with inputs

### Color Contrast
- Minimum 4.5:1 contrast ratio for text
- Color not sole indicator of status

### Motion & Animation
- Respect prefers-reduced-motion
- No auto-playing videos
- Animations under 5 seconds

---

## Testing Strategy

### Unit Tests (Vitest)
- Component rendering
- User interactions
- Form validation
- Data transformations

### Integration Tests
- API integration
- Form submission flows
- Navigation flows

### E2E Tests (Optional)
- Critical user journeys
- Authentication flows
- Job application flow

---

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Deployment

### Build Process
```bash
npm run build  # Vite build
npm run test   # Run tests
npm run lint   # Lint code
```

### Environment Variables
```
VITE_API_URL=https://api.techscoop.com
VITE_APP_ID=<app_id>
VITE_OAUTH_PORTAL_URL=<oauth_url>
```

### Hosting
- Vercel, Netlify, or Manus hosting
- CDN for static assets
- Gzip compression enabled

---

## Summary

This specification provides a complete blueprint for building the Talent Intelligence Platform frontend across three applications:

1. **Tenant Admin UI** - Organization management and configuration
2. **Candidate Portal** - Job search, applications, profile management
3. **Recruiter Dashboard** - Job management, candidate pipeline, hiring workflows

All applications use the same technology stack, design system, and backend API, ensuring consistency and maintainability.

The specification includes detailed layouts, component hierarchies, data requirements, and implementation guidelines for Claude to build production-ready code.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-20  
**Status:** Ready for Implementation by Claude
