import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ScrollToTop } from "./components/ScrollToTop";

// Public pages
import News from "./pages/public/News";
import Article from "./pages/public/Article";
import Jobs from "./pages/public/Jobs";
import JobDetail from "./pages/public/JobDetail";
import Companies from "./pages/public/Companies";
import CompanyProfile from "./pages/public/CompanyProfile";
import People from "./pages/public/People";
import PersonDetail from "./pages/public/PersonDetail";
import Events from "./pages/public/Events";
import EventDetail from "./pages/public/EventDetail";
import EventLive from "./pages/public/EventLive";
import EventLivePost from "./pages/public/EventLivePost";
import LiveConsole from "./pages/LiveConsole";
import LiveConsolePicker from "./pages/LiveConsolePicker";
import EventSubmit from "./pages/public/EventSubmit";
import EventTicketsSuccess from "./pages/public/EventTicketsSuccess";
import CategoryNews from "./pages/public/CategoryNews";
import TagPage from "./pages/public/TagPage";
import Author from "./pages/public/Author";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import Advertise from "./pages/public/Advertise";
import Newsletter from "./pages/public/Newsletter";
import SearchResults from "./pages/public/SearchResults";
import Privacy from "./pages/public/Privacy";
import Terms from "./pages/public/Terms";
import Sitemap from "./pages/public/Sitemap";
import UserDashboard from "./pages/public/UserDashboard";
import Profile from "./pages/public/Profile";
import CandidateProfile from "./pages/public/CandidateProfile";
import MyApplications from "./pages/public/MyApplications";
import AssessmentTaker from "./pages/public/AssessmentTaker";
import ApplicantTracker from "./pages/public/ApplicantTracker";
import ClaimedProfiles from "./pages/public/ClaimedProfiles";
import CompanyJobsDashboard from "./pages/public/CompanyJobsDashboard";
import Signup from "./pages/public/Signup";
import Signin from "./pages/public/Signin";
import MyContent from "./pages/public/MyContent";
import MyCompanyEditor from "./pages/public/MyCompanyEditor";
import MyJobEditor from "./pages/public/MyJobEditor";
import MyEntityEditor from "./pages/public/MyEntityEditor";
import ClaimedEntityEditor from "./pages/public/ClaimedEntityEditor";
import TeamAccess from "./pages/public/TeamAccess";

// Admin pages
import Dashboard from "./pages/admin/Dashboard";
import ArticlesList from "./pages/admin/ArticlesList";
import ArticleEditor from "./pages/admin/ArticleEditor";
import ArticlePreview from "./pages/admin/ArticlePreview";
import MediaLibrary from "./pages/admin/MediaLibrary";
import WorkflowQueue from "./pages/admin/WorkflowQueue";
import ModerationQueue from "./pages/admin/ModerationQueue";
import WordPressImport from "./pages/admin/WordPressImport";
import SEOManager from "./pages/admin/SEOManager";
import EditionsPage from "./pages/admin/Editions";
import SearchAnalyticsPage from "./pages/admin/SearchAnalytics";
import HomepageConfig from "./pages/admin/HomepageConfig";
import HomepageSections from "./pages/admin/HomepageSections";
import PopupsManager from "./pages/admin/PopupsManager";
import TaxonomyManager from "./pages/admin/TaxonomyManager";
import JobsList from "./pages/admin/JobsList";
import PeopleList from "./pages/admin/PeopleList";
import InvestorsList from "./pages/admin/InvestorsList";
import InvestorEditor from "./pages/admin/InvestorEditor";
import EventsList from "./pages/admin/EventsList";
import ResourcesList from "./pages/admin/ResourcesList";
import ResourceEditor from "./pages/admin/ResourceEditor";
import AcceleratorsList from "./pages/admin/AcceleratorsList";
import AcceleratorEditor from "./pages/admin/AcceleratorEditor";
import CompaniesList from "./pages/admin/CompaniesList";
import AdminLogin from "./pages/admin/AdminLogin";
import TenantsList from "./pages/admin/TenantsList";
import TenantEditor from "./pages/admin/TenantEditor";
import TalentCandidatesList from "./pages/admin/TalentCandidatesList";
import TalentCandidateDetail from "./pages/admin/TalentCandidateDetail";
import TalentPipeline from "./pages/admin/TalentPipeline";
import TalentInterviews from "./pages/admin/TalentInterviews";
import TalentOffers from "./pages/admin/TalentOffers";
import TalentAssessments from "./pages/admin/TalentAssessments";
import TalentAssessmentEditor from "./pages/admin/TalentAssessmentEditor";
import TalentApplicationDetail from "./pages/admin/TalentApplicationDetail";
import TalentInterviewFeedback from "./pages/admin/TalentInterviewFeedback";
import TalentReports from "./pages/admin/TalentReports";
import TalentJobsList from "./pages/admin/TalentJobsList";
import CookieConsentBanner from "./components/CookieConsentBanner";
import SystemHealth from "./pages/admin/SystemHealth";
import CandidateDashboard from "./pages/public/CandidateDashboard";
import FundingTracker from "./pages/admin/FundingTracker";
import JobEditor from "./pages/admin/JobEditor";
import PersonEditor from "./pages/admin/PersonEditor";
import EventEditor from "./pages/admin/EventEditor";
import EventLiveComposer from "./pages/admin/EventLiveComposer";
import EventSubmissionsQueue from "./pages/admin/EventSubmissionsQueue";
import UsersManager from "./pages/admin/UsersManager";
import SettingsPage from "./pages/admin/SettingsPage";
import ProfilePage from "./pages/admin/ProfilePage";
import AccountSettings from "./pages/admin/AccountSettings";
import CompanyEditor from "./pages/admin/CompanyEditor";
import RolesManager from "./pages/admin/RolesManager";
import PartnersManager from "./pages/admin/PartnersManager";
import NewsletterManager from "./pages/admin/NewsletterManager";
import WritersManager from "./pages/admin/WritersManager";
import AdvertisingManager from "./pages/admin/AdvertisingManager";
import IntegrationHub from "./pages/admin/IntegrationHub";
import ClaimRequests from "./pages/admin/ClaimRequests";
import UserSubmissions from "./pages/admin/UserSubmissions";
import MasterDataLocations from "./pages/admin/MasterDataLocations";
import AIContentGenerator from "./pages/admin/ai/AIContentGenerator";
import AgentDashboard from "./pages/admin/ai/AgentDashboard";
// EntitiesManager / KeywordsManager / PolicyManager / TemplatesManager were
// duplicates of admin/entityLinking, admin/taxonomy/keywords, /about anchors,
// and /resources/templates. Deleted in the AI consolidation.
import AIStudio from "./pages/admin/AIStudio";
import AIAnalytics from "./pages/admin/ai/AIAnalytics";
import AISettings from "./pages/admin/ai/AISettings";
import BatchGeneration from "./pages/admin/ai/BatchGeneration";
import ContentComparison from "./pages/admin/ai/ContentComparison";
import ContentCalendar from "./pages/admin/ai/ContentCalendar";
import SEOTools from "./pages/admin/ai/SEOTools";
import ToneAnalyzer from "./pages/admin/ai/ToneAnalyzer";
import PlagiarismCheck from "./pages/admin/ai/PlagiarismCheck";
import SocialMedia from "./pages/admin/ai/SocialMedia";
import NewsletterGenerator from "./pages/admin/ai/NewsletterGenerator";
import ScriptGenerator from "./pages/admin/ai/ScriptGenerator";
import CompetitiveIntel from "./pages/admin/ai/CompetitiveIntel";
import Webhooks from "./pages/admin/ai/Webhooks";
import APIAccess from "./pages/admin/ai/APIAccess";
import { ProtectedRoute } from "./components/ProtectedRoute";
import CategoryOrArticle from "./components/CategoryOrArticle";
import ThreeSegmentRoute from "./components/ThreeSegmentRoute";

// Mobile pages
import Explore from "./pages/public/Explore";
import MobileSearch from "./pages/public/MobileSearch";
import MobileProfile from "./pages/public/MobileProfile";
import { MobileBottomNav } from "./components/layout/MobileLayout";

function Router() {
  return (
    <>
      <ScrollToTop />
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
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <MobileBottomNav />
          <CookieConsentBanner />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
