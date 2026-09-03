/**
 * Global Search Component
 * Provides unified search across all content types
 */

import { useState, useEffect, useRef } from "react";
import { useT } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  Newspaper,
  Briefcase,
  Building2,
  Users,
  Calendar,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: number | string;
  type: "article" | "job" | "company" | "person" | "event";
  title: string;
  subtitle?: string;
  slug: string;
  image?: string | null;
}

const typeConfig = {
  article: { icon: Newspaper, color: "bg-blue-100 text-blue-700", label: "Article", path: "/article" },
  job: { icon: Briefcase, color: "bg-emerald-100 text-emerald-700", label: "Job", path: "/jobs" },
  company: { icon: Building2, color: "bg-purple-100 text-purple-700", label: "Company", path: "/companies" },
  person: { icon: Users, color: "bg-orange-100 text-orange-700", label: "Person", path: "/people" },
  event: { icon: Calendar, color: "bg-pink-100 text-pink-700", label: "Event", path: "/events" },
};

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch results from multiple endpoints
  const { data: articlesData, isLoading: articlesLoading } = trpc.news.list.useQuery(
    { search: debouncedQuery, limit: 3 },
    { enabled: debouncedQuery.length >= 2 }
  );
  
  const { data: jobsData, isLoading: jobsLoading } = trpc.jobs.list.useQuery(
    { search: debouncedQuery, limit: 3 },
    { enabled: debouncedQuery.length >= 2 }
  );
  
  const { data: companiesData, isLoading: companiesLoading } = trpc.companies.list.useQuery(
    { search: debouncedQuery, limit: 3 },
    { enabled: debouncedQuery.length >= 2 }
  );
  
  const { data: peopleData, isLoading: peopleLoading } = trpc.people.list.useQuery(
    { search: debouncedQuery, limit: 3 },
    { enabled: debouncedQuery.length >= 2 }
  );
  
  const { data: eventsData, isLoading: eventsLoading } = trpc.events.list.useQuery(
    { search: debouncedQuery, limit: 3 },
    { enabled: debouncedQuery.length >= 2 }
  );

  const isLoading = articlesLoading || jobsLoading || companiesLoading ||
                    peopleLoading || eventsLoading;

  // Combine results
  const results: SearchResult[] = [];
  
  if (articlesData?.items) {
    articlesData.items.forEach((item: any) => results.push({
      id: item.id,
      type: "article",
      title: item.title,
      subtitle: item.excerpt || undefined,
      slug: item.slug,
      image: null, // Articles don't have image in list response
    }));
  }
  
  if (jobsData?.items) {
    jobsData.items.forEach(item => results.push({
      id: item.id,
      type: "job",
      title: item.title,
      subtitle: item.companyName || undefined,
      slug: item.slug,
      image: item.companyLogo as string | null | undefined,
    }));
  }
  
  if (companiesData?.items) {
    companiesData.items.forEach(item => results.push({
      id: item.id,
      type: "company",
      title: item.name,
      subtitle: item.industry || undefined,
      slug: item.slug,
      image: item.logo as string | null | undefined,
    }));
  }
  
  if (peopleData?.items) {
    peopleData.items.forEach(item => results.push({
      id: item.id,
      type: "person",
      title: item.name,
      subtitle: item.title || undefined,
      slug: item.slug,
      image: item.avatar as string | null | undefined,
    }));
  }
  
  if (eventsData?.items) {
    eventsData.items.forEach((item: any) => results.push({
      id: item.id,
      type: "event",
      title: item.title,
      subtitle: item.city || undefined,
      slug: item.slug,
      image: item.featuredImage,
    }));
  }

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleResultClick = (result: SearchResult) => {
    const config = typeConfig[result.type];
    setLocation(`${config.path}/${result.slug}`);
    onClose();
    setQuery("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Search Panel */}
      <div className="absolute inset-x-0 top-0 bg-white shadow-2xl animate-in slide-in-from-top duration-200">
        <div className="max-w-4xl mx-auto p-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              ref={inputRef}
              type="search"
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-14 pl-12 pr-12 text-lg border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Results */}
          {debouncedQuery.length >= 2 && (
            <div className="mt-6 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No results found for "{debouncedQuery}"</p>
                  <p className="text-sm text-gray-400 mt-1">{t("search.noResults")}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group results by type */}
                  {Object.entries(typeConfig).map(([type, config]) => {
                    const typeResults = results.filter(r => r.type === type);
                    if (typeResults.length === 0) return null;
                    
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                            {config.label}s
                          </h3>
                          <Link 
                            href={`/search?q=${encodeURIComponent(debouncedQuery)}&type=${type}`}
                            onClick={() => { onClose(); setQuery(""); }}
                            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                        <div className="space-y-2">
                          {typeResults.map((result) => {
                            const Icon = config.icon;
                            return (
                              <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleResultClick(result)}
                                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                              >
                                {result.image ? (
                                  <img 
                                    src={result.image} 
                                    alt={result.title}
                                    className="w-12 h-12 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config.color}`}>
                                    <Icon className="h-5 w-5" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{result.title}</p>
                                  {result.subtitle && (
                                    <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                                  )}
                                </div>
                                <Badge className={config.color} variant="secondary">
                                  {config.label}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quick Links when no query */}
          {debouncedQuery.length < 2 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-500 mb-3">{t("search.quickLinks")}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Latest News", href: "/" },
                  { label: "Open Jobs", href: "/jobs" },
                  { label: "Companies", href: "/companies" },
                  { label: "Upcoming Events", href: "/events" },
                ].map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => { onClose(); setQuery(""); }}
                  >
                    <Badge 
                      variant="outline" 
                      className="px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100"
                    >
                      {link.label}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
