import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ScrollToTop } from "./components/ScrollToTop";
import LocaleProvider from "./components/LocaleProvider";

// Public pages
import News from "./pages/public/News";
import Article from "./pages/public/Article";
const Jobs = lazy(() => import("./pages/public/Jobs"));
const JobDetail = lazy(() => import("./pages/public/JobDetail"));
const Companies = lazy(() => import("./pages/public/Companies"));
const CompanyProfile = lazy(() => import("./pages/public/CompanyProfile"));
const People = lazy(() => import("./pages/public/People"));
const PersonDetail = lazy(() => import("./pages/public/PersonDetail"));
const Events = lazy(() => import("./pages/public/Events"));
const EventDetail = lazy(() => import("./pages/public/EventDetail"));
const EventLive = lazy(() => import("./pages/public/EventLive"));
const EventLivePost = lazy(() => import("./pages/public/EventLivePost"));
const LiveConsole = lazy(() => import("./pages/LiveConsole"));
const LiveConsolePicker = lazy(() => import("./pages/LiveConsolePicker"));
const EventSubmit = lazy(() => import("./pages/public/EventSubmit"));
const EventTicketsSuccess = lazy(() => import("./pages/public/EventTicketsSuccess"));
const CategoryNews = lazy(() => import("./pages/public/CategoryNews"));
const TagPage = lazy(() => import("./pages/public/TagPage"));
const Author = lazy(() => import("./pages/public/Author"));
const About = lazy(() => import("./pages/public/About"));
const Contact = lazy(() => import("./pages/public/Contact"));
const Advertise = lazy(() => import("./pages/public/Advertise"));
const Newsletter = lazy(() => import("./pages/public/Newsletter"));
const SearchResults = lazy(() => import("./pages/public/SearchResults"));
const Privacy = lazy(() => import("./pages/public/Privacy"));
const Terms = lazy(() => import("./pages/public/Terms"));
const Sitemap = lazy(() => import("./pages/public/Sitemap"));
const UserDashboard = lazy(() => import("./pages/public/UserDashboard"));
const Profile = lazy(() => import("./pages/public/Profile"));
const CandidateProfile = lazy(() => import("./pages/public/CandidateProfile"));
const MyApplications = lazy(() => import("./pages/public/MyApplications"));
const AssessmentTaker = lazy(() => import("./pages/public/AssessmentTaker"));
const ApplicantTracker = lazy(() => import("./pages/public/ApplicantTracker"));
const ClaimedProfiles = lazy(() => import("./pages/public/ClaimedProfiles"));
const CompanyJobsDashboard = lazy(() => import("./pages/public/CompanyJobsDashboard"));
const Signup = lazy(() => import("./pages/public/Signup"));
const Signin = lazy(() => import("./pages/public/Signin"));
const MyContent = lazy(() => import("./pages/public/MyContent"));
const MyCompanyEditor = lazy(() => import("./pages/public/MyCompanyEditor"));
const MyJobEditor = lazy(() => import("./pages/public/MyJobEditor"));
const MyEntityEditor = lazy(() => import("./pages/public/MyEntityEditor"));
const ClaimedEntityEditor = lazy(() => import("./pages/public/ClaimedEntityEditor"));
const TeamAccess = lazy(() => import("./pages/public/TeamAccess"));

// Admin pages
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ArticlesList = lazy(() => import("./pages/admin/ArticlesList"));
const ArticleEditor = lazy(() => import("./pages/admin/ArticleEditor"));
const ArticlePreview = lazy(() => import("./pages/admin/ArticlePreview"));
const MediaLibrary = lazy(() => import("./pages/admin/MediaLibrary"));
const WorkflowQueue = lazy(() => import("./pages/admin/WorkflowQueue"));
const ModerationQueue = lazy(() => import("./pages/admin/ModerationQueue"));
const WordPressImport = lazy(() => import("./pages/admin/WordPressImport"));
const SEOManager = lazy(() => import("./pages/admin/SEOManager"));
const EditionsPage = lazy(() => import("./pages/admin/Editions"));
const LanguagesPage = lazy(() => import("./pages/admin/Languages"));
const SearchAnalyticsPage = lazy(() => import("./pages/admin/SearchAnalytics"));
const HomepageConfig = lazy(() => import("./pages/admin/HomepageConfig"));
const HomepageSections = lazy(() => import("./pages/admin/HomepageSections"));
const PopupsManager = lazy(() => import("./pages/admin/PopupsManager"));
const TaxonomyManager = lazy(() => import("./pages/admin/TaxonomyManager"));
const JobsList = lazy(() => import("./pages/admin/JobsList"));
const PeopleList = lazy(() => import("./pages/admin/PeopleList"));
const InvestorsList = lazy(() => import("./pages/admin/InvestorsList"));
const InvestorEditor = lazy(() => import("./pages/admin/InvestorEditor"));
const EventsList = lazy(() => import("./pages/admin/EventsList"));
const ResourcesList = lazy(() => import("./pages/admin/ResourcesList"));
const ResourceEditor = lazy(() => import("./pages/admin/ResourceEditor"));
const AcceleratorsList = lazy(() => import("./pages/admin/AcceleratorsList"));
const AcceleratorEditor = lazy(() => import("./pages/admin/AcceleratorEditor"));
const CompaniesList = lazy(() => import("./pages/admin/CompaniesList"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const TenantsList = lazy(() => import("./pages/admin/TenantsList"));
const TenantEditor = lazy(() => import("./pages/admin/TenantEditor"));
const TalentCandidatesList = lazy(() => import("./pages/admin/TalentCandidatesList"));
const TalentCandidateDetail = lazy(() => import("./pages/admin/TalentCandidateDetail"));
const TalentPipeline = lazy(() => import("./pages/admin/TalentPipeline"));
const TalentInterviews = lazy(() => import("./pages/admin/TalentInterviews"));
const TalentOffers = lazy(() => import("./pages/admin/TalentOffers"));
const TalentAssessments = lazy(() => import("./pages/admin/TalentAssessments"));
const TalentAssessmentEditor = lazy(() => import("./pages/admin/TalentAssessmentEditor"));
const TalentApplicationDetail = lazy(() => import("./pages/admin/TalentApplicationDetail"));
const TalentInterviewFeedback = lazy(() => import("./pages/admin/TalentInterviewFeedback"));
const TalentReports = lazy(() => import("./pages/admin/TalentReports"));
const TalentJobsList = lazy(() => import("./pages/admin/TalentJobsList"));
import CookieConsentBanner from "./components/CookieConsentBanner";
import { AdSenseScript } from "./components/ads/AdSenseScript";
const SystemHealth = lazy(() => import("./pages/admin/SystemHealth"));
const CandidateDashboard = lazy(() => import("./pages/public/CandidateDashboard"));
const FundingTracker = lazy(() => import("./pages/admin/FundingTracker"));
const JobEditor = lazy(() => import("./pages/admin/JobEditor"));
const PersonEditor = lazy(() => import("./pages/admin/PersonEditor"));
const EventEditor = lazy(() => import("./pages/admin/EventEditor"));
const EventLiveComposer = lazy(() => import("./pages/admin/EventLiveComposer"));
const EventSubmissionsQueue = lazy(() => import("./pages/admin/EventSubmissionsQueue"));
const UsersManager = lazy(() => import("./pages/admin/UsersManager"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/admin/ProfilePage"));
const AccountSettings = lazy(() => import("./pages/admin/AccountSettings"));
const CompanyEditor = lazy(() => import("./pages/admin/CompanyEditor"));
const RolesManager = lazy(() => import("./pages/admin/RolesManager"));
const PartnersManager = lazy(() => import("./pages/admin/PartnersManager"));
const NewsletterManager = lazy(() => import("./pages/admin/NewsletterManager"));
const WritersManager = lazy(() => import("./pages/admin/WritersManager"));
const AdvertisingManager = lazy(() => import("./pages/admin/AdvertisingManager"));
const IntegrationHub = lazy(() => import("./pages/admin/IntegrationHub"));
const ClaimRequests = lazy(() => import("./pages/admin/ClaimRequests"));
const UserSubmissions = lazy(() => import("./pages/admin/UserSubmissions"));
const MasterDataLocations = lazy(() => import("./pages/admin/MasterDataLocations"));
const AIContentGenerator = lazy(() => import("./pages/admin/ai/AIContentGenerator"));
const AgentDashboard = lazy(() => import("./pages/admin/ai/AgentDashboard"));
// EntitiesManager / KeywordsManager / PolicyManager / TemplatesManager were
// duplicates of admin/entityLinking, admin/taxonomy/keywords, /about anchors,
// and /resources/templates. Deleted in the AI consolidation.
const AIStudio = lazy(() => import("./pages/admin/AIStudio"));
const AIAnalytics = lazy(() => import("./pages/admin/ai/AIAnalytics"));
const AISettings = lazy(() => import("./pages/admin/ai/AISettings"));
const BatchGeneration = lazy(() => import("./pages/admin/ai/BatchGeneration"));
const ContentComparison = lazy(() => import("./pages/admin/ai/ContentComparison"));
const ContentCalendar = lazy(() => import("./pages/admin/ai/ContentCalendar"));
const SEOTools = lazy(() => import("./pages/admin/ai/SEOTools"));
const ToneAnalyzer = lazy(() => import("./pages/admin/ai/ToneAnalyzer"));
const PlagiarismCheck = lazy(() => import("./pages/admin/ai/PlagiarismCheck"));
const SocialMedia = lazy(() => import("./pages/admin/ai/SocialMedia"));
const NewsletterGenerator = lazy(() => import("./pages/admin/ai/NewsletterGenerator"));
const ScriptGenerator = lazy(() => import("./pages/admin/ai/ScriptGenerator"));
const CompetitiveIntel = lazy(() => import("./pages/admin/ai/CompetitiveIntel"));
const Webhooks = lazy(() => import("./pages/admin/ai/Webhooks"));
const APIAccess = lazy(() => import("./pages/admin/ai/APIAccess"));
import { ProtectedRoute } from "./components/ProtectedRoute";
import CategoryOrArticle from "./components/CategoryOrArticle";
import ThreeSegmentRoute from "./components/ThreeSegmentRoute";

// Mobile pages
const Explore = lazy(() => import("./pages/public/Explore"));
const MobileSearch = lazy(() => import("./pages/public/MobileSearch"));
const MobileProfile = lazy(() => import("./pages/public/MobileProfile"));
import { MobileBottomNav } from "./components/layout/MobileLayout";

function Router() {
  return (
    <>
      <ScrollToTop />
      {/* Admin and console pages are lazy-loaded; the fallback shows while
          a chunk downloads. Public editorial pages stay statically imported
          for instant first paint + SSR parity. */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">
            Loading…
          </div>
        }
      >
      <Switch>
        {/* Public routes - Main */}
        <Route path="/" component={News} />
        <Route path="/search" component={SearchResults} />
        <Route path="/news" component={News} />
        {/* Legacy /article route - redirects to correct category URL */}
        <Route path="/article/:slug" component={Article} />
        <Route path="/category/:parentSlug" component={CategoryNews as any} />
        <Route path="/category/:parentSlug/:childSlug" component={CategoryNews as any} />
        <Route path="/tag/:slug" component={TagPage} />
        <Route path="/author/:id" component={Author} />
        
        {/* Jobs */}
        <Route path="/jobs" component={Jobs} />
        <Route path="/jobs/:id" component={JobDetail} />
        
        {/* Companies */}
        <Route path="/companies" component={Companies} />
        <Route path="/companies/:id" component={CompanyProfile} />
        
        {/* People */}
        <Route path="/people" component={People} />
        <Route path="/people/:id" component={PersonDetail} />

        {/* Events */}
        <Route path="/events" component={Events} />
        {/* Public submission form — MUST come before /events/:id so
            "submit" isn't interpreted as a slug. Login-required; the
            page itself redirects anonymous users to /signin. */}
        <Route path="/events/submit" component={EventSubmit} />
        {/* Stripe Checkout success — MUST come before /events/:id so
            the success URL doesn't get swallowed by the detail route. */}
        <Route path="/events/:slug/tickets/success" component={EventTicketsSuccess} />
        {/* Live coverage — register BEFORE /events/:id */}
        <Route path="/events/:slug/live/:postId" component={EventLivePost} />
        <Route path="/events/:slug/live" component={EventLive} />
        <Route path="/events/:id" component={EventDetail} />
        {/* Reporter console — auth gated in-component via canPostLiveCheck */}
        <Route path="/live-console/:eventId" component={LiveConsole} />
        <Route path="/live-console" component={LiveConsolePicker} />

        {/* Mobile-specific routes */}
        <Route path="/explore" component={Explore} />
        <Route path="/search-mobile" component={MobileSearch} />
        <Route path="/profile-mobile" component={MobileProfile} />
        
        {/* Auth pages */}
        <Route path="/signup" component={Signup} />
        <Route path="/signin" component={Signin} />
        
        {/* User pages */}
        <Route path="/dashboard" component={UserDashboard} />
        <Route path="/profile" component={Profile} />
        <Route path="/jobs/:jobId/applicants" component={ApplicantTracker} />
        <Route path="/claimed-profiles" component={ClaimedProfiles} />

        {/* Talent Platform — candidate portal */}
        <Route path="/me" component={CandidateDashboard} />
        <Route path="/me/candidate-profile" component={CandidateProfile} />
        <Route path="/me/applications" component={MyApplications} />
        <Route path="/assess/:token" component={AssessmentTaker} />
        <Route path="/dashboard/claimed-profiles" component={ClaimedProfiles} />
        <Route path="/dashboard/company-jobs/:companyId" component={CompanyJobsDashboard} />
        <Route path="/dashboard/applicant-tracker/:jobId" component={ApplicantTracker} />
        
        {/* User Content Management */}
        <Route path="/dashboard/my-content" component={MyContent} />
        <Route path="/dashboard/my-content/company/new" component={MyCompanyEditor} />
        <Route path="/dashboard/my-content/company/:id" component={MyCompanyEditor} />
        <Route path="/dashboard/my-content/job/new" component={MyJobEditor} />
        <Route path="/dashboard/my-content/job/:id" component={MyJobEditor} />
        <Route path="/dashboard/my-content/:type/new" component={MyEntityEditor} />
        <Route path="/dashboard/my-content/:type/:id" component={MyEntityEditor} />
        <Route path="/dashboard/edit-claimed/:entityType/:entityId" component={ClaimedEntityEditor} />
        <Route path="/dashboard/team-access/:entityType/:entityId" component={TeamAccess} />
        
        {/* Static pages */}
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/advertise" component={Advertise} />
        <Route path="/newsletter" component={Newsletter} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/sitemap" component={Sitemap} />
        
        {/* Admin routes - requireAdmin blocks non-admin users */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin">{() => <ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>}</Route>

        {/* Talent platform — tenant administration */}
        <Route path="/admin/tenants">{() => <ProtectedRoute requireAdmin><TenantsList /></ProtectedRoute>}</Route>
        <Route path="/admin/tenants/new">{() => <ProtectedRoute requireAdmin><TenantEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/tenants/:id">{() => <ProtectedRoute requireAdmin><TenantEditor /></ProtectedRoute>}</Route>

        {/* Talent platform — recruiter dashboard */}
        <Route path="/admin/talent/pipeline">{() => <ProtectedRoute requireAdmin><TalentPipeline /></ProtectedRoute>}</Route>
        <Route path="/admin/talent/candidates">{() => <ProtectedRoute requireAdmin><TalentCandidatesList /></ProtectedRoute>}</Route>
        <Route path="/admin/talent/candidates/:id">{() => <ProtectedRoute requireAdmin><TalentCandidateDetail /></ProtectedRoute>}</Route>
        <Route path="/admin/talent/interviews">{() => <ProtectedRoute requireAdmin><TalentInterviews /></ProtectedRoute>}</Route>
        <Route path="/admin/talent/offers">{() => <ProtectedRoute requireAdmin><TalentOffers /></ProtectedRoute>}</Route>
        <Route path="/admin/talent/assessments">{() => <ProtectedRoute requireAdmin><TalentAssessments /></ProtectedRoute>}</Route>
        <Route path="/admin/talent/assessments/:id">{() => <ProtectedRoute requireAdmin><TalentAssessmentEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/talent/applications/:id">{() => <ProtectedRoute requireAdmin><TalentApplicationDetail /></ProtectedRoute>}</Route>
        <Route path="/admin/talent/interviews/:id/feedback">{() => <ProtectedRoute requireAdmin><TalentInterviewFeedback /></ProtectedRoute>}</Route>
        <Route path="/admin/talent/reports">{() => <ProtectedRoute requireAdmin><TalentReports /></ProtectedRoute>}</Route>
        <Route path="/admin/talent/jobs">{() => <ProtectedRoute requireAdmin><TalentJobsList /></ProtectedRoute>}</Route>
        <Route path="/admin/system-health">{() => <ProtectedRoute requireAdmin><SystemHealth /></ProtectedRoute>}</Route>
        <Route path="/admin/dashboard">{() => <ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>}</Route>
        
        {/* Content management */}
        <Route path="/admin/articles">{() => <ProtectedRoute requireAdmin><ArticlesList /></ProtectedRoute>}</Route>
        <Route path="/admin/articles/new">{() => <ProtectedRoute requireAdmin><ArticleEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/articles/:id">{(params) => <ProtectedRoute requireAdmin><ArticleEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/articles/:id/preview">{(params) => <ProtectedRoute requireAdmin><ArticlePreview /></ProtectedRoute>}</Route>
        <Route path="/admin/jobs">{() => <ProtectedRoute requireAdmin><JobsList /></ProtectedRoute>}</Route>
        <Route path="/admin/jobs/new">{() => <ProtectedRoute requireAdmin><JobEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/jobs/:id">{(params) => <ProtectedRoute requireAdmin><JobEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/people">{() => <ProtectedRoute requireAdmin><PeopleList /></ProtectedRoute>}</Route>
        <Route path="/admin/people/new">{() => <ProtectedRoute requireAdmin><PersonEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/people/:id">{(params) => <ProtectedRoute requireAdmin><PersonEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/companies">{() => <ProtectedRoute requireAdmin><CompaniesList /></ProtectedRoute>}</Route>
        <Route path="/admin/companies/new">{() => <ProtectedRoute requireAdmin><CompanyEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/companies/:id">{(params) => <ProtectedRoute requireAdmin><CompanyEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/investors">{() => <ProtectedRoute requireAdmin><InvestorsList /></ProtectedRoute>}</Route>
        <Route path="/admin/investors/new">{() => <ProtectedRoute requireAdmin><InvestorEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/investors/:id">{(params) => <ProtectedRoute requireAdmin><InvestorEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/events">{() => <ProtectedRoute requireAdmin><EventsList /></ProtectedRoute>}</Route>
        {/* Submissions queue — register BEFORE /admin/events/:id so
            wouter picks the literal "submissions" segment first. */}
        <Route path="/admin/events/submissions">{() => <ProtectedRoute requireAdmin><EventSubmissionsQueue /></ProtectedRoute>}</Route>
        <Route path="/admin/events/new">{() => <ProtectedRoute requireAdmin><EventEditor /></ProtectedRoute>}</Route>
        {/* Live composer — intentionally NOT wrapped in ProtectedRoute(requireAdmin)
            because correspondents (role=event_correspondent) and event tenants
            (role=event_tenant) must reach it too. The component does its own
            permission check via events.canPostLiveCheck. Register BEFORE the
            generic /admin/events/:id route so wouter's Switch picks it first. */}
        <Route path="/admin/events/:id/live" component={EventLiveComposer} />
        <Route path="/admin/events/:id">{(params) => <ProtectedRoute requireAdmin><EventEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/resources">{() => <ProtectedRoute requireAdmin><ResourcesList /></ProtectedRoute>}</Route>
        <Route path="/admin/resources/new">{() => <ProtectedRoute requireAdmin><ResourceEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/resources/:id">{() => <ProtectedRoute requireAdmin><ResourceEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/accelerators">{() => <ProtectedRoute requireAdmin><AcceleratorsList /></ProtectedRoute>}</Route>
        <Route path="/admin/accelerators/new">{() => <ProtectedRoute requireAdmin><AcceleratorEditor /></ProtectedRoute>}</Route>
        <Route path="/admin/accelerators/:id">{(params) => <ProtectedRoute requireAdmin><AcceleratorEditor /></ProtectedRoute>}</Route>
        
        {/* Taxonomy */}
        <Route path="/admin/taxonomy">{() => <ProtectedRoute requireAdmin><TaxonomyManager /></ProtectedRoute>}</Route>
        <Route path="/admin/taxonomy/categories">{() => <ProtectedRoute requireAdmin><TaxonomyManager /></ProtectedRoute>}</Route>
        <Route path="/admin/taxonomy/tags">{() => <ProtectedRoute requireAdmin><TaxonomyManager /></ProtectedRoute>}</Route>
        <Route path="/admin/taxonomy/topics">{() => <ProtectedRoute requireAdmin><TaxonomyManager /></ProtectedRoute>}</Route>
        <Route path="/admin/taxonomy/regions">{() => <ProtectedRoute requireAdmin><TaxonomyManager /></ProtectedRoute>}</Route>
        <Route path="/admin/taxonomy/sectors">{() => <ProtectedRoute requireAdmin><TaxonomyManager /></ProtectedRoute>}</Route>
        
        {/* Media */}
        <Route path="/admin/media">{() => <ProtectedRoute requireAdmin><MediaLibrary /></ProtectedRoute>}</Route>
        
        {/* Workflow & Moderation */}
        <Route path="/admin/workflow">{() => <ProtectedRoute requireAdmin><WorkflowQueue /></ProtectedRoute>}</Route>
        <Route path="/admin/workflows/editorial">{() => <ProtectedRoute requireAdmin><WorkflowQueue /></ProtectedRoute>}</Route>
        <Route path="/admin/moderation">{() => <ProtectedRoute requireAdmin><ModerationQueue /></ProtectedRoute>}</Route>
        <Route path="/admin/workflows/moderation">{() => <ProtectedRoute requireAdmin><ModerationQueue /></ProtectedRoute>}</Route>
        
        {/* SEO & Configuration */}
        <Route path="/admin/seo">{() => <ProtectedRoute requireAdmin><SEOManager /></ProtectedRoute>}</Route>
        <Route path="/admin/editions">{() => <ProtectedRoute requireAdmin><EditionsPage /></ProtectedRoute>}</Route>
        <Route path="/admin/languages">{() => <ProtectedRoute requireAdmin><LanguagesPage /></ProtectedRoute>}</Route>
        {/* /admin/seo/health route deleted — SeoHealth.tsx was a duplicate of
            SEO Manager → Health → Issues & AI Fixes. Old bookmarks 404 → SPA
            fallback redirects them to /admin/seo. */}
        <Route path="/admin/search-analytics">{() => <ProtectedRoute requireAdmin><SearchAnalyticsPage /></ProtectedRoute>}</Route>
        <Route path="/admin/homepage">{() => <ProtectedRoute requireAdmin><HomepageConfig /></ProtectedRoute>}</Route>
        <Route path="/admin/homepage-sections">{() => <ProtectedRoute requireAdmin><HomepageSections /></ProtectedRoute>}</Route>
        <Route path="/admin/popups">{() => <ProtectedRoute requireAdmin><PopupsManager /></ProtectedRoute>}</Route>
        
        {/* Import */}
        <Route path="/admin/import/wordpress">{() => <ProtectedRoute requireAdmin><WordPressImport /></ProtectedRoute>}</Route>
        
        {/* Funding Tracker */}
        <Route path="/admin/funding">{() => <ProtectedRoute requireAdmin><FundingTracker /></ProtectedRoute>}</Route>
        <Route path="/admin/funding/new">{() => <ProtectedRoute requireAdmin><FundingTracker /></ProtectedRoute>}</Route>
        
        {/* Claim Requests */}
        <Route path="/admin/claim-requests">{() => <ProtectedRoute requireAdmin><ClaimRequests /></ProtectedRoute>}</Route>
        <Route path="/admin/user-submissions">{() => <ProtectedRoute requireAdmin><UserSubmissions /></ProtectedRoute>}</Route>

        {/* Users & Settings */}
        <Route path="/admin/users">{() => <ProtectedRoute requireAdmin><UsersManager /></ProtectedRoute>}</Route>
        <Route path="/admin/settings">{() => <ProtectedRoute requireAdmin><SettingsPage /></ProtectedRoute>}</Route>
        <Route path="/admin/profile">{() => <ProtectedRoute requireAdmin><ProfilePage /></ProtectedRoute>}</Route>
        <Route path="/admin/account">{() => <ProtectedRoute requireAdmin><AccountSettings /></ProtectedRoute>}</Route>
        
        {/* BRD V3/V4 Modules */}
        <Route path="/admin/roles">{() => <ProtectedRoute requireAdmin><RolesManager /></ProtectedRoute>}</Route>
        <Route path="/admin/partners">{() => <ProtectedRoute requireAdmin><PartnersManager /></ProtectedRoute>}</Route>
        <Route path="/admin/newsletter">{() => <ProtectedRoute requireAdmin><NewsletterManager /></ProtectedRoute>}</Route>
        <Route path="/admin/writers">{() => <ProtectedRoute requireAdmin><WritersManager /></ProtectedRoute>}</Route>
        <Route path="/admin/advertising">{() => <ProtectedRoute requireAdmin><AdvertisingManager /></ProtectedRoute>}</Route>
        <Route path="/admin/integrations">{() => <ProtectedRoute requireAdmin><IntegrationHub /></ProtectedRoute>}</Route>
        <Route path="/admin/master-data/locations">{() => <ProtectedRoute requireAdmin><MasterDataLocations /></ProtectedRoute>}</Route>

        {/* AI Content */}
        {/* AI Studio — single workspace consolidating Newsletter, Social,
            Script, Bulk, Analyze, Research. Old standalone routes still
            resolve below for bookmark compat. */}
        <Route path="/admin/ai/studio">{() => <ProtectedRoute requireAdmin><AIStudio /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/generate">{() => <ProtectedRoute requireAdmin><AIContentGenerator /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/agent">{() => <ProtectedRoute requireAdmin><AgentDashboard /></ProtectedRoute>}</Route>
        {/* /admin/ai/policies and /admin/ai/templates intentionally
            removed — they duplicated /about anchors and /resources/templates. */}
        <Route path="/admin/ai/analytics">{() => <ProtectedRoute requireAdmin><AIAnalytics /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/settings">{() => <ProtectedRoute requireAdmin><AISettings /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/batch">{() => <ProtectedRoute requireAdmin><BatchGeneration /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/comparison">{() => <ProtectedRoute requireAdmin><ContentComparison /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/calendar">{() => <ProtectedRoute requireAdmin><ContentCalendar /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/seo">{() => <ProtectedRoute requireAdmin><SEOTools /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/tone">{() => <ProtectedRoute requireAdmin><ToneAnalyzer /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/plagiarism">{() => <ProtectedRoute requireAdmin><PlagiarismCheck /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/social">{() => <ProtectedRoute requireAdmin><SocialMedia /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/newsletter">{() => <ProtectedRoute requireAdmin><NewsletterGenerator /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/scripts">{() => <ProtectedRoute requireAdmin><ScriptGenerator /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/competitive">{() => <ProtectedRoute requireAdmin><CompetitiveIntel /></ProtectedRoute>}</Route>
        {/* /admin/ai/keywords and /admin/ai/entities removed — duplicates
            of admin/taxonomy/keywords and admin/entityLinking. */}
        <Route path="/admin/ai/webhooks">{() => <ProtectedRoute requireAdmin><Webhooks /></ProtectedRoute>}</Route>
        <Route path="/admin/ai/api">{() => <ProtectedRoute requireAdmin><APIAccess /></ProtectedRoute>}</Route>
        
        {/* Bare category slug routes: /startups, /fintech, /ai-data, etc. */}
        {/* Also handles /:cat/:subcat subcategory pages */}
        {/* ThreeSegmentRoute handles /parentCat/childCat/articleSlug URLs */}
        <Route path="/:parentCat/:childCat/:articleSlug" component={ThreeSegmentRoute} />
        {/* CategoryOrArticle resolves ambiguity: /cat vs /cat/article-slug vs /cat/subcat */}
        <Route path="/:categorySlug/:articleSlug" component={CategoryOrArticle} />
        <Route path="/:categorySlug" component={CategoryOrArticle} />
        
        {/* 404 */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          {/* Wraps the router so a /ar prefix resolves to the same routes,
              and so <html lang dir> matches the language being served. */}
          <LocaleProvider>
            <Toaster />
            <Router />
            <MobileBottomNav />
            <CookieConsentBanner />
            <AdSenseScript />
          </LocaleProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
