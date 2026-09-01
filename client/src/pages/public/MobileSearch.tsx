import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Search, X, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

const trendingTopics = [
  "AI Startups", "Saudi Tech", "Fintech MENA", "Series A", "Dubai Unicorns",
  "Climate Tech", "Web3", "SaaS", "Cybersecurity", "EdTech"
];

export default function MobileSearch() {
  const [query, setQuery] = useState("");
  const [recentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ts_recent_searches") || "[]");
    } catch { return []; }
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const saveSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 10);
    localStorage.setItem("ts_recent_searches", JSON.stringify(updated));
  };

  const handleSearch = (term: string) => {
    if (!term.trim()) return;
    saveSearch(term.trim());
    window.location.href = `/?q=${encodeURIComponent(term.trim())}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Search bar */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-2 h-12 px-3">
          <Search className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
            placeholder="Search news, companies, people..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Recent searches */}
        {recentSearches.length > 0 && !query && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Recent
            </h3>
            <div className="space-y-1">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => handleSearch(term)}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left"
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground">{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending topics */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Trending Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => handleSearch(topic)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/50 hover:bg-accent transition-colors"
              >
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-foreground">{topic}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
