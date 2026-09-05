import { useEffect, useMemo, useState } from "react";
import { fmtDate } from "@/lib/dates";
import { Link, useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Briefcase, 
  Building2, 
  TrendingUp, 
  Bell, 
  BookOpen,
  Star,
  ArrowRight,
  CheckCircle2,
  Mail,
  Calendar,
  Bookmark,
  Settings,
  Eye,
  Clock,
  Flame,
  History,
  Newspaper,
  MapPin,
  DollarSign,
  Trash2,
  ExternalLink,
  BarChart3,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Helper to format relative time
function timeAgo(date: Date | string | null): string {
  if (!date) return "Recently";
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return fmtDate(d, { month: "short", day: "numeric" });
}

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  return fmtDate(new Date(date), { month: "short", day: "numeric", year: "numeric" });
}

// Content type icons and colors
const contentTypeConfig: Record<string, { icon: typeof Newspaper; color: string; label: string; href: (slug: string, category?: string) => string }> = {
  article: { icon: Newspaper, color: "text-blue-600 bg-blue-50", label: "Article", href: (slug, category) => category ? `/${category}/${slug}` : `/news/${slug}` },
  job: { icon: Briefcase, color: "text-green-600 bg-green-50", label: "Job", href: (slug) => `/jobs/${slug}` },
  event: { icon: Calendar, color: "text-purple-600 bg-purple-50", label: "Event", href: (slug) => `/events/${slug}` },
  company: { icon: Building2, color: "text-orange-600 bg-orange-50", label: "Company", href: (slug) => `/companies/${slug}` },
  person: { icon: User, color: "text-teal-600 bg-teal-50", label: "Person", href: (slug) => `/people/${slug}` },
  investor: { icon: TrendingUp, color: "text-indigo-600 bg-indigo-50", label: "Investor", href: (slug) => `/investors/${slug}` },
  accelerator: { icon: Sparkles, color: "text-pink-600 bg-pink-50", label: "Accelerator", href: (slug) => `/accelerators/${slug}` },
};

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const authLoading = false;
  const [historyTab, setHistoryTab] = useState("all");
  const [savedTab, setSavedTab] = useState<"all" | "article" | "job" | "event">("all");
  const [dashboardView, setDashboardView] = useState<"overview" | "saved" | "digest">("overview");
  
  // Fetch user profile data
  const { data: profile, isLoading: profileLoading } = trpc.userProfile.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch browsing stats
  const { data: browsingStats } = trpc.browsingHistory.getStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch personalized recommendations
  const { data: recommendations, isLoading: recsLoading } = trpc.browsingHistory.getRecommendations.useQuery(
    { limit: 6 },
    { enabled: isAuthenticated }
  );

  // Fetch browsing history
  const { data: historyData, isLoading: historyLoading } = trpc.browsingHistory.getHistory.useQuery(
    { contentType: historyTab as any, limit: 10 },
    { enabled: isAuthenticated }
  );

  // Fetch newsletter subscriptions
  const { data: subscriptions } = trpc.userProfile.getNewsletterSubscriptions.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch saved/bookmarked items
  const { data: savedData, isLoading: savedLoading } = trpc.bookmarks.list.useQuery(
    { contentType: savedTab, limit: 20 },
    { enabled: isAuthenticated }
  );

  // Fetch available newsletter lists
  const { data: newsletterLists } = trpc.admin.newsletter.getPublicLists.useQuery();

  // Fetch email digest preferences
  const { data: digestPrefs, isLoading: digestLoading } = trpc.emailDigest.getPreferences.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch available categories for digest
  const { data: availableCategories } = trpc.emailDigest.getAvailableCategories.useQuery();

  // Fetch digest preview
  const { data: digestPreview, isLoading: previewLoading } = trpc.emailDigest.previewDigest.useQuery(
    undefined,
    { enabled: isAuthenticated && dashboardView === "digest" }
  );

  const utils = trpc.useUtils();

  // Mutations
  const updateSubscription = trpc.userProfile.updateNewsletterSubscription.useMutation({
    onSuccess: () => toast.success("Newsletter preferences updated"),
    onError: () => toast.error("Failed to update preferences"),
  });

  const removeBookmark = trpc.bookmarks.remove.useMutation({
    onSuccess: () => {
      toast.success("Bookmark removed");
      utils.bookmarks.list.invalidate();
    },
    onError: () => toast.error("Failed to remove bookmark"),
  });

  const clearHistory = trpc.browsingHistory.clearHistory.useMutation({
    onSuccess: () => {
      toast.success("Browsing history cleared");
    },
    onError: () => toast.error("Failed to clear history"),
  });

  const updateDigestPrefs = trpc.emailDigest.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Email digest preferences updated");
      utils.emailDigest.getPreferences.invalidate();
    },
    onError: () => toast.error("Failed to update digest preferences"),
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/signin");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="w-full max-w-[1400px] mx-auto px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <div className="grid md:grid-cols-3 gap-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const userName = user?.name || profile?.name || "User";
  const profileCompletion = profile ? Math.round(
    ([profile.name, profile.bio, profile.jobTitle, profile.company, profile.location, profile.avatar, profile.interests && (profile.interests as string[])?.length > 0]
      .filter(Boolean).length / 7) * 100
  ) : 15;

  const handleNewsletterToggle = (listId: number, subscribed: boolean) => {
    updateSubscription.mutate({ listId, subscribed });
  };

  const stats = browsingStats || { articlesRead: 0, jobsViewed: 0, eventsViewed: 0, companiesViewed: 0, totalViews: 0, topCategories: [] };

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Header />
      
      <main className="w-full max-w-[1400px] mx-auto px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-black to-gray-800 text-white border-0">
          <CardContent className="p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={userName} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold">Welcome back, {userName.split(' ')[0]}!</h1>
                  <p className="text-white/70 mt-1">Here's what's happening in MENA tech today</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/dashboard/my-content">
                  <Button className="bg-white text-black hover:bg-white/90">
                    <Briefcase className="h-4 w-4 mr-2" />
                    My Content
                  </Button>
                </Link>
                <Link href="/claimed-profiles">
                  <Button variant="outline" className="border-white/30 text-white bg-transparent hover:bg-white hover:text-black">
                    <Star className="h-4 w-4 mr-2" />
                    Claimed Profiles
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline" className="border-white/30 text-white bg-transparent hover:bg-white hover:text-black">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Profile Completion</span>
                <span className="text-sm font-semibold">{profileCompletion}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              {profileCompletion < 100 && (
                <p className="text-xs text-white/60 mt-2">
                  Complete your profile to get better recommendations and job matches
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Navigation Tabs */}
        <div className="flex gap-2 border-b pb-1">
          {[
            { key: "overview" as const, label: "Overview", icon: BarChart3 },
            { key: "saved" as const, label: "Saved Items", icon: Bookmark },
            { key: "digest" as const, label: "Email Digest", icon: Mail },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDashboardView(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                dashboardView === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Activity Stats */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Your Activity
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                  <Newspaper className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{stats.articlesRead}</p>
                <p className="text-xs text-muted-foreground">Articles Read</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="h-10 w-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-2">
                  <Briefcase className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{stats.jobsViewed}</p>
                <p className="text-xs text-muted-foreground">Jobs Viewed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{stats.eventsViewed}</p>
                <p className="text-xs text-muted-foreground">Events Viewed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="h-10 w-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-2">
                  <Building2 className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{stats.companiesViewed}</p>
                <p className="text-xs text-muted-foreground">Companies Viewed</p>
              </CardContent>
            </Card>
            <Card className="col-span-2 lg:col-span-1">
              <CardContent className="p-4 text-center">
                <div className="h-10 w-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center mx-auto mb-2">
                  <Eye className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{stats.totalViews || 0}</p>
                <p className="text-xs text-muted-foreground">Total Page Views</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Top Interests / Categories */}
        {stats.topCategories && stats.topCategories.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Your Top Interests
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.topCategories.map((cat: any) => (
                <Badge key={cat.name} variant="secondary" className="px-3 py-1.5 text-sm">
                  {cat.name}
                  <span className="ml-2 text-muted-foreground">({cat.count})</span>
                </Badge>
              ))}
            </div>
          </section>
        )}

        {dashboardView === "digest" ? (
          /* ===== EMAIL DIGEST VIEW ===== */
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Digest Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    Digest Preview
                  </CardTitle>
                  <CardDescription>
                    Here's what your next email digest would look like based on your preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {previewLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="h-10 w-10 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : digestPreview ? (
                    <div className="space-y-6">
                      {/* Articles Section */}
                      {digestPreview.articles && digestPreview.articles.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Newspaper className="h-4 w-4 text-blue-600" />
                            Top Stories ({digestPreview.articles.length})
                          </h3>
                          <div className="space-y-3">
                            {digestPreview.articles.map((article: any) => (
                              <Link key={article.id} href={article.categorySlug ? `/${article.categorySlug}/${article.slug}` : `/news/${article.slug}`}>
                                <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <Newspaper className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{article.title}</h4>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                      {article.categoryName && <Badge variant="outline" className="text-[10px] py-0">{article.categoryName}</Badge>}
                                      {article.publishedAt && <span>{formatDate(article.publishedAt)}</span>}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Jobs Section */}
                      {digestPreview.jobs && digestPreview.jobs.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-green-600" />
                            New Job Openings ({digestPreview.jobs.length})
                          </h3>
                          <div className="space-y-3">
                            {digestPreview.jobs.map((job: any) => (
                              <Link key={job.id} href={`/jobs/${job.slug}`}>
                                <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                                  <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                    <Briefcase className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{job.title}</h4>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                      {job.companyName && <span>{job.companyName}</span>}
                                      {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Events Section */}
                      {digestPreview.events && digestPreview.events.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            Upcoming Events ({digestPreview.events.length})
                          </h3>
                          <div className="space-y-3">
                            {digestPreview.events.map((event: any) => (
                              <Link key={event.id} href={`/events/${event.slug}`}>
                                <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                                  <div className="h-12 w-12 rounded-lg bg-purple-50 flex flex-col items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] font-bold text-purple-600 uppercase">
                                      {event.startDate ? fmtDate(new Date(event.startDate), { month: "short" }) : "TBD"}
                                    </span>
                                    <span className="text-lg font-bold text-purple-800 leading-none">
                                      {event.startDate ? new Date(event.startDate).getDate() : "?"}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h4>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                      {event.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.city}</span>}
                                      {event.type && <Badge variant="outline" className="text-[10px] py-0 capitalize">{event.type}</Badge>}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!digestPreview.articles?.length && !digestPreview.jobs?.length && !digestPreview.events?.length) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>No content to preview yet</p>
                          <p className="text-sm mt-1">Start browsing to get personalized digest content</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Configure your digest preferences to see a preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Digest Settings Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings className="h-4 w-4" />
                    Digest Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Frequency */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Frequency</label>
                    <div className="space-y-2">
                      {(["daily", "weekly", "none"] as const).map((freq) => (
                        <label key={freq} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                          <input
                            type="radio"
                            name="digestFrequency"
                            value={freq}
                            checked={digestPrefs?.frequency === freq}
                            onChange={() => updateDigestPrefs.mutate({
                              frequency: freq,
                              categories: digestPrefs?.categories || [],
                              includeJobs: Boolean(digestPrefs?.includeJobs ?? true),
                              includeEvents: Boolean(digestPrefs?.includeEvents ?? true),
                              includeNews: Boolean(digestPrefs?.includeNews ?? true),
                              includeRecommendations: Boolean(digestPrefs?.includeRecommendations ?? true),
                            })}
                            className="accent-primary"
                          />
                          <div>
                            <span className="text-sm font-medium capitalize">{freq === "none" ? "Disabled" : freq}</span>
                            <p className="text-xs text-muted-foreground">
                              {freq === "daily" ? "Receive a digest every morning" :
                               freq === "weekly" ? "Receive a weekly roundup" :
                               "No email digests"}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Content Types */}
                  {digestPrefs?.frequency !== "none" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Include in Digest</label>
                      <div className="space-y-3">
                        {[
                          { key: "includeNews", label: "News & Articles", icon: Newspaper },
                          { key: "includeJobs", label: "Job Openings", icon: Briefcase },
                          { key: "includeEvents", label: "Upcoming Events", icon: Calendar },
                          { key: "includeRecommendations", label: "Personalized Picks", icon: Sparkles },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{item.label}</span>
                            </div>
                            <Switch
                              checked={(digestPrefs as any)?.[item.key] ?? true}
                              onCheckedChange={(checked) => updateDigestPrefs.mutate({
                                frequency: digestPrefs?.frequency || "weekly",
                                categories: digestPrefs?.categories || [],
                                includeJobs: item.key === "includeJobs" ? checked : Boolean(digestPrefs?.includeJobs ?? true),
                                includeEvents: item.key === "includeEvents" ? checked : Boolean(digestPrefs?.includeEvents ?? true),
                                includeNews: item.key === "includeNews" ? checked : Boolean(digestPrefs?.includeNews ?? true),
                                includeRecommendations: item.key === "includeRecommendations" ? checked : Boolean(digestPrefs?.includeRecommendations ?? true),
                              })}
                              disabled={updateDigestPrefs.isPending}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Preferences */}
                  {digestPrefs?.frequency !== "none" && availableCategories && availableCategories.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Preferred Categories</label>
                      <p className="text-xs text-muted-foreground mb-3">Select categories you're interested in (leave empty for all)</p>
                      <div className="flex flex-wrap gap-2">
                        {availableCategories.map((cat: any) => {
                          const isSelected = digestPrefs?.categories?.includes(cat.slug) || false;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                const currentCats = digestPrefs?.categories || [];
                                const newCats = isSelected
                                  ? currentCats.filter((c: string) => c !== cat.slug)
                                  : [...currentCats, cat.slug];
                                updateDigestPrefs.mutate({
                                  frequency: digestPrefs?.frequency || "weekly",
                                  categories: newCats,
                                  includeJobs: Boolean(digestPrefs?.includeJobs ?? true),
                                  includeEvents: Boolean(digestPrefs?.includeEvents ?? true),
                                  includeNews: Boolean(digestPrefs?.includeNews ?? true),
                                  includeRecommendations: Boolean(digestPrefs?.includeRecommendations ?? true),
                                });
                              }}
                              disabled={updateDigestPrefs.isPending}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Digest Status */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      digestPrefs?.frequency === "none" || !digestPrefs?.frequency
                        ? "bg-gray-100 text-gray-500"
                        : "bg-green-100 text-green-600"
                    }`}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {digestPrefs?.frequency === "none" || !digestPrefs?.frequency
                          ? "Email Digest Disabled"
                          : `${digestPrefs.frequency === "daily" ? "Daily" : "Weekly"} Digest Active`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {digestPrefs?.frequency === "none" || !digestPrefs?.frequency
                          ? "Enable to receive curated content in your inbox"
                          : digestPrefs.frequency === "daily"
                            ? "You'll receive a digest every morning at 8:00 AM"
                            : "You'll receive a digest every Monday at 8:00 AM"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : dashboardView === "saved" ? (
          /* ===== SAVED ITEMS VIEW ===== */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5 text-primary" />
                    Saved Items
                  </CardTitle>
                  <CardDescription>Articles, jobs, and events you've bookmarked for later</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={savedTab} onValueChange={(v) => setSavedTab(v as any)} className="w-full">
                <TabsList className="mb-4 w-full justify-start">
                  <TabsTrigger value="all">
                    All {savedData?.counts?.all ? `(${savedData.counts.all})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="article">
                    Articles {savedData?.counts?.article ? `(${savedData.counts.article})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="job">
                    Jobs {savedData?.counts?.job ? `(${savedData.counts.job})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="event">
                    Events {savedData?.counts?.event ? `(${savedData.counts.event})` : ""}
                  </TabsTrigger>
                </TabsList>

                <div>
                  {savedLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3 items-center">
                          <Skeleton className="h-16 w-24 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : savedData && savedData.items.length > 0 ? (
                    <div className="space-y-2">
                      {savedData.items.map((item: any) => {
                        const config = contentTypeConfig[item.contentType] || contentTypeConfig.article;
                        const Icon = config.icon;
                        const href = config.href(item.contentSlug || String(item.contentId), item.contentCategory);
                        return (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                            <Link href={href} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                              {item.contentImageUrl ? (
                                <div className="h-16 w-24 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                                  <img src={item.contentImageUrl} alt="" className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className={`h-16 w-24 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                                  <Icon className="h-6 w-6" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                  {item.contentTitle || `${config.label} #${item.contentId}`}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <Badge variant="outline" className="text-[10px] py-0">{config.label}</Badge>
                                  {item.contentCategory && <span>{item.contentCategory}</span>}
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {timeAgo(item.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => removeBookmark.mutate({ contentType: item.contentType, contentId: item.contentId })}
                              disabled={removeBookmark.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No saved items yet</p>
                      <p className="text-sm mt-1">Click the bookmark button on articles, jobs, or events to save them here</p>
                      <div className="flex gap-3 justify-center mt-4">
                        <Link href="/news">
                          <Button variant="outline" size="sm">
                            <Newspaper className="h-4 w-4 mr-2" />
                            Browse News
                          </Button>
                        </Link>
                        <Link href="/jobs">
                          <Button variant="outline" size="sm">
                            <Briefcase className="h-4 w-4 mr-2" />
                            Browse Jobs
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recommended For You */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      Recommended For You
                    </CardTitle>
                    <CardDescription>
                      {stats.articlesRead > 0 
                        ? "Based on your reading history and interests" 
                        : "Trending content to get you started"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {recsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="h-20 w-28 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recommendations?.articles && recommendations.articles.length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.articles.map((article: any) => (
                      <Link key={article.id} href={article.categorySlug ? `/${article.categorySlug}/${article.slug}` : `/news/${article.slug}`}>
                        <div className="flex gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                          {article.featuredImageId ? (
                            <div className="h-20 w-28 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                              <div className="h-full w-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                <Newspaper className="h-6 w-6 text-blue-400" />
                              </div>
                            </div>
                          ) : (
                            <div className="h-20 w-28 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0 flex items-center justify-center">
                              <Newspaper className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {article.categoryName && (
                              <Badge variant="outline" className="mb-1 text-xs">{article.categoryName}</Badge>
                            )}
                            <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                              {article.title}
                            </h4>
                            {article.publishedAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(article.publishedAt)}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Start reading articles to get personalized recommendations</p>
                    <Link href="/news">
                      <Button variant="outline" className="mt-4">
                        Browse News
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommended Jobs */}
            {recommendations?.jobs && recommendations.jobs.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-green-600" />
                        Latest Jobs
                      </CardTitle>
                      <CardDescription>Recent opportunities in MENA tech</CardDescription>
                    </div>
                    <Link href="/jobs">
                      <Button variant="ghost" size="sm">
                        View All
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {recommendations.jobs.map((job: any) => (
                      <Link key={job.id} href={`/jobs/${job.slug}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {job.companyLogo ? (
                                <img src={job.companyLogo} alt={job.companyName} className="h-10 w-10 rounded-lg object-contain border" />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-5 w-5 text-green-600" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm line-clamp-1">{job.title}</h4>
                                <p className="text-xs text-muted-foreground">{job.companyName}</p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  {job.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {job.location}
                                    </span>
                                  )}
                                  {job.roleType && (
                                    <Badge variant="outline" className="text-[10px] py-0">
                                      {job.roleType.replace(/_/g, " ")}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Events */}
            {recommendations?.events && recommendations.events.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        Upcoming Events
                      </CardTitle>
                      <CardDescription>Don't miss these upcoming events</CardDescription>
                    </div>
                    <Link href="/events">
                      <Button variant="ghost" size="sm">
                        View All
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {recommendations.events.map((event: any) => (
                      <Link key={event.id} href={`/events/${event.slug}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="h-12 w-12 rounded-lg bg-purple-50 flex flex-col items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-purple-600 uppercase">
                                  {event.startDate ? fmtDate(new Date(event.startDate), { month: "short" }) : "TBD"}
                                </span>
                                <span className="text-lg font-bold text-purple-800 leading-none">
                                  {event.startDate ? new Date(event.startDate).getDate() : "?"}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm line-clamp-2">{event.title}</h4>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  {(event.venue || event.city) && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {event.city || event.venue}
                                    </span>
                                  )}
                                  {event.type && (
                                    <Badge variant="outline" className="text-[10px] py-0 capitalize">
                                      {event.type}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Browsing History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Browsing History
                    </CardTitle>
                    <CardDescription>Content you've recently viewed</CardDescription>
                  </div>
                  {historyData && historyData.total > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Clear all browsing history? This cannot be undone.")) {
                          clearHistory.mutate();
                        }
                      }}
                      disabled={clearHistory.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={historyTab} onValueChange={setHistoryTab} className="w-full">
                  <TabsList className="mb-4 w-full justify-start overflow-x-auto">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="article">Articles</TabsTrigger>
                    <TabsTrigger value="job">Jobs</TabsTrigger>
                    <TabsTrigger value="event">Events</TabsTrigger>
                    <TabsTrigger value="company">Companies</TabsTrigger>
                  </TabsList>

                  <div>
                    {historyLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex gap-3 items-center">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div className="flex-1 space-y-1">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : historyData && historyData.items.length > 0 ? (
                      <div className="space-y-1">
                        {historyData.items.map((item: any) => {
                          const config = contentTypeConfig[item.contentType] || contentTypeConfig.article;
                          const Icon = config.icon;
                          const href = config.href(item.contentSlug || String(item.contentId), item.contentCategory);
                          return (
                            <Link key={item.id} href={href}>
                              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                                <div className={`h-10 w-10 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                    {item.contentTitle || `${config.label} #${item.contentId}`}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="text-[10px] py-0">{config.label}</Badge>
                                    {item.contentCategory && (
                                      <span>{item.contentCategory}</span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {timeAgo(item.lastViewedAt)}
                                    </span>
                                    {item.viewCount > 1 && (
                                      <span className="flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        {item.viewCount}x
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No browsing history yet</p>
                        <p className="text-sm mt-1">Your viewed articles, jobs, and events will appear here</p>
                        <Link href="/news">
                          <Button variant="outline" className="mt-4">
                            Start Exploring
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { icon: Sparkles, label: "My Content", href: "/dashboard/my-content", color: "text-indigo-600" },
                  { icon: Star, label: "Claimed Profiles", href: "/claimed-profiles", color: "text-amber-600" },
                  { icon: Briefcase, label: "Browse Jobs", href: "/jobs", color: "text-blue-600" },
                  { icon: Building2, label: "Explore Companies", href: "/companies", color: "text-green-600" },
                  { icon: TrendingUp, label: "Funding News", href: "/category/funding-vc", color: "text-purple-600" },
                  { icon: Calendar, label: "Events", href: "/events", color: "text-pink-600" },
                ].map((action) => (
                  <Link key={action.label} href={action.href}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <action.icon className={`h-4 w-4 ${action.color}`} />
                      <span className="text-sm font-medium">{action.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Newsletter Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4" />
                  Newsletter Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {newsletterLists && newsletterLists.length > 0 ? (
                  newsletterLists.map((list: any) => {
                    const isSubscribed = subscriptions?.some((s: any) => s.listId === list.id) || false;
                    return (
                      <div key={list.id} className="flex items-center justify-between py-1">
                        <div className="flex-1 pr-4">
                          <p className="font-medium text-sm">{list.name}</p>
                          <p className="text-xs text-muted-foreground">{String(list.description ?? "")}</p>
                        </div>
                        <Switch
                          checked={isSubscribed}
                          onCheckedChange={(checked) => handleNewsletterToggle(list.id, checked)}
                          disabled={updateSubscription.isPending}
                        />
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No newsletters available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Profile Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{profile?.name || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Company</span>
                  <span className="text-sm font-medium">{profile?.company || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Location</span>
                  <span className="text-sm font-medium">{profile?.location || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Job Title</span>
                  <span className="text-sm font-medium">{profile?.jobTitle || "Not set"}</span>
                </div>
                {profileCompletion < 100 && (
                  <Link href="/profile">
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Complete Profile
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
