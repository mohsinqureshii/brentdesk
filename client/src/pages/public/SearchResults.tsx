/**
 * Search Results Page
 * Unified search across all content types: articles, jobs, companies, people, events
 * Accessible at /search?q={query}&type={type}
 */
import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { publication } from "@shared/publication";
import { Header } from "@/components/layout/Header";
import { SEO } from "@/components/SEO";
import Footer from "@/components/layout/Footer";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Newspaper,
  Briefcase,
  Building2,
  Users,
  Calendar,
  Loader2,
  MapPin,
  Clock,
  ArrowRight,
  Filter,
  X,
} from "lucide-react";
import { getArticleUrl } from "@/lib/articleUrl";
import { useDebounce } from "@/hooks/useDebounce";

// Content type configuration
const typeConfig = {
  all: { icon: Search, label: "All", color: "bg-gray-100 text-gray-700" },
  article: { icon: Newspaper, label: "Articles", color: "bg-blue-100 text-blue-700" },
  job: { icon: Briefcase, label: "Jobs", color: "bg-emerald-100 text-emerald-700" },
  company: { icon: Building2, label: "Companies", color: "bg-purple-100 text-purple-700" },
  person: { icon: Users, label: "People", color: "bg-orange-100 text-orange-700" },
  event: { icon: Calendar, label: "Events", color: "bg-pink-100 text-pink-700" },
} as const;

type ContentType = keyof typeof typeConfig;

function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export default function SearchResults() {
  const [location, setLocation] = useLocation();
  
  // Parse URL params
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), [location]);
  const initialQuery = urlParams.get("q") || urlParams.get("search") || "";
  const initialType = (urlParams.get("type") as ContentType) || "all";
  
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [activeType, setActiveType] = useState<ContentType>(initialType);
  const debouncedQuery = useDebounce(searchInput, 300);
  
  // Update URL when search changes
  useEffect(() => {
    if (debouncedQuery) {
      const params = new URLSearchParams();
      params.set("q", debouncedQuery);
      if (activeType !== "all") params.set("type", activeType);
      window.history.replaceState(null, "", `/search?${params.toString()}`);
    }
  }, [debouncedQuery, activeType]);

  // Fetch results for each type
  const shouldFetch = (type: string) => debouncedQuery.length >= 2 && (activeType === "all" || activeType === type);
  
  const { data: articlesData, isLoading: articlesLoading } = trpc.news.list.useQuery(
    { search: debouncedQuery, limit: activeType === "article" ? 20 : 5, page: 1 },
    { enabled: shouldFetch("article") }
  );
  
  const { data: jobsData, isLoading: jobsLoading } = trpc.jobs.list.useQuery(
    { search: debouncedQuery, limit: activeType === "job" ? 20 : 5, page: 1 },
    { enabled: shouldFetch("job") }
  );
  
  const { data: companiesData, isLoading: companiesLoading } = trpc.companies.list.useQuery(
    { search: debouncedQuery, limit: activeType === "company" ? 20 : 5, page: 1 },
    { enabled: shouldFetch("company") }
  );
  
  const { data: peopleData, isLoading: peopleLoading } = trpc.people.list.useQuery(
    { search: debouncedQuery, limit: activeType === "person" ? 20 : 5, page: 1 },
    { enabled: shouldFetch("person") }
  );
  
  const { data: eventsData, isLoading: eventsLoading } = trpc.events.list.useQuery(
    { search: debouncedQuery, limit: activeType === "event" ? 20 : 5, page: 1 },
    { enabled: shouldFetch("event") }
  );

  const isLoading = articlesLoading || jobsLoading || companiesLoading || peopleLoading || eventsLoading;

  // Log search analytics when results are ready
  const logSearchMutation = null;
  useEffect(() => {
    if (debouncedQuery.length >= 2 && !isLoading) {
      const total = (articlesData?.total || 0) + (jobsData?.total || 0) + (companiesData?.total || 0) +
        (peopleData?.total || 0) + (eventsData?.total || 0);
      (logSearchMutation as any)?.mutate?.({ query: debouncedQuery, entityType: activeType, resultsCount: total });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, activeType, isLoading]);

  // Count results per type
  const counts = useMemo(() => ({
    article: articlesData?.total || 0,
    job: jobsData?.total || 0,
    company: companiesData?.total || 0,
    person: peopleData?.total || 0,
    event: eventsData?.total || 0,
  }), [articlesData, jobsData, companiesData, peopleData, eventsData]);

  const totalResults = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={debouncedQuery ? `Search: ${debouncedQuery} | ${publication.name}` : `Search | ${publication.name}`}
        description={`Search results for "${debouncedQuery}" on ${publication.name}`}
        noindex={true}
      />
      <Header />
      
      {/* Search Header */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b">
        <div className="container max-w-5xl py-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search articles, jobs, companies, people, events..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-14 pl-12 pr-12 text-lg"
              autoFocus
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setSearchInput("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {debouncedQuery && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Searching..." : `${totalResults.toLocaleString()} results for "${debouncedQuery}"`}
              </p>
            </div>
          )}
          
          {/* Type Filter Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.entries(typeConfig) as [ContentType, typeof typeConfig[ContentType]][]).map(([type, config]) => {
              const Icon = config.icon;
              const count = type === "all" ? totalResults : counts[type as keyof typeof counts] || 0;
              const isActive = activeType === type;
              
              return (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                  {debouncedQuery && count > 0 && (
                    <span className={`text-xs ${isActive ? "text-emerald-100" : "text-gray-400"}`}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container max-w-5xl py-8">
        {!debouncedQuery || debouncedQuery.length < 2 ? (
          <div className="text-center py-20">
            <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Search {publication.name}</h2>
            <p className="text-muted-foreground">Enter at least 2 characters to search across all content</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 p-4">
                <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-20">
            <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No results found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find anything matching "{debouncedQuery}". Try different keywords.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Articles */}
            {(activeType === "all" || activeType === "article") && articlesData?.items && articlesData.items.length > 0 && (
              <ResultSection
                title="Articles"
                icon={Newspaper}
                count={counts.article}
                showViewAll={activeType === "all" && counts.article > 5}
                onViewAll={() => setActiveType("article")}
              >
                <div className="space-y-1">
                  {articlesData.items.map((article: any) => (
                    <Link
                      key={article.id}
                      href={getArticleUrl(article)}
                      className="flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      {article.featuredImage ? (
                        <img
                          src={article.featuredImage}
                          alt={article.title}
                          className="h-20 w-28 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-20 w-28 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Newspaper className="h-8 w-8 text-blue-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{article.excerpt}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {article.categories?.[0] && (
                            <Badge variant="secondary" className="text-xs">{article.categories[0].name}</Badge>
                          )}
                          {article.publishedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(article.publishedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}

            {/* Jobs */}
            {(activeType === "all" || activeType === "job") && jobsData?.items && jobsData.items.length > 0 && (
              <ResultSection
                title="Jobs"
                icon={Briefcase}
                count={counts.job}
                showViewAll={activeType === "all" && counts.job > 5}
                onViewAll={() => setActiveType("job")}
              >
                <div className="space-y-1">
                  {jobsData.items.map((job: any) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.slug || job.id}`}
                      className="flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      {job.companyLogo ? (
                        <img
                          src={job.companyLogo}
                          alt={job.companyName || "Company"}
                          className="h-14 w-14 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                          <Briefcase className="h-6 w-6 text-emerald-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                          {job.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{job.companyName}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                          )}
                          {job.employmentType && (
                            <Badge variant="outline" className="text-xs">{job.employmentType}</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}

            {/* Companies */}
            {(activeType === "all" || activeType === "company") && companiesData?.items && companiesData.items.length > 0 && (
              <ResultSection
                title="Companies"
                icon={Building2}
                count={counts.company}
                showViewAll={activeType === "all" && counts.company > 5}
                onViewAll={() => setActiveType("company")}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {companiesData.items.map((company: any) => (
                    <Link
                      key={company.id}
                      href={`/companies/${company.slug || company.id}`}
                      className="flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.name}
                          className="h-14 w-14 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                          <Building2 className="h-6 w-6 text-purple-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                          {company.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{company.industry}</p>
                        {company.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {company.location}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}

            {/* People */}
            {(activeType === "all" || activeType === "person") && peopleData?.items && peopleData.items.length > 0 && (
              <ResultSection
                title="People"
                icon={Users}
                count={counts.person}
                showViewAll={activeType === "all" && counts.person > 5}
                onViewAll={() => setActiveType("person")}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {peopleData.items.map((person: any) => (
                    <Link
                      key={person.id}
                      href={`/people/${person.slug || person.id}`}
                      className="flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="h-14 w-14 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                          <Users className="h-6 w-6 text-orange-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                          {person.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{person.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}

            {/* Events */}
            {(activeType === "all" || activeType === "event") && eventsData?.items && eventsData.items.length > 0 && (
              <ResultSection
                title="Events"
                icon={Calendar}
                count={counts.event}
                showViewAll={activeType === "all" && counts.event > 5}
                onViewAll={() => setActiveType("event")}
              >
                <div className="space-y-1">
                  {eventsData.items.map((event: any) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.slug || event.id}`}
                      className="flex gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      {event.featuredImage ? (
                        <img
                          src={event.featuredImage}
                          alt={event.title}
                          className="h-20 w-28 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-20 w-28 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                          <Calendar className="h-8 w-8 text-pink-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {event.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.city}
                            </span>
                          )}
                          {event.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(event.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}

// Result Section Component
function ResultSection({
  title,
  icon: Icon,
  count,
  showViewAll,
  onViewAll,
  children,
}: {
  title: string;
  icon: any;
  count: number;
  showViewAll: boolean;
  onViewAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">{title}</h2>
          <span className="text-sm text-muted-foreground">({count})</span>
        </div>
        {showViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-emerald-600 hover:text-emerald-700">
            View all <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
      <Card className="overflow-hidden">
        {children}
      </Card>
    </section>
  );
}
