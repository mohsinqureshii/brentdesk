/**
 * Flash News Ticker Component
 * Displays breaking/flash news in a scrolling ticker format
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getArticleUrl } from "@/lib/articleUrl";
import { Zap, ChevronRight } from "lucide-react";

export function FlashNewsTicker() {
  const { data: flashNews, isLoading } = trpc.news.getFlashNews.useQuery(undefined, {
    refetchInterval: 60000, // Refetch every minute
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate through flash news items
  useEffect(() => {
    if (!flashNews || flashNews.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % flashNews.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [flashNews]);

  if (isLoading || !flashNews || flashNews.length === 0) {
    return null;
  }

  const currentNews = flashNews[currentIndex];

  return (
    <div className="bg-red-600 text-white py-2 px-4 relative overflow-hidden">
      <div className="container flex items-center gap-3">
        {/* Flash Badge */}
        <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded text-xs font-bold uppercase shrink-0">
          <Zap className="h-3.5 w-3.5" />
          <span>Breaking</span>
        </div>

        {/* News Content */}
        <div className="flex-1 overflow-hidden">
          <Link 
            href={getArticleUrl(currentNews)}
            className="flex items-center gap-2 hover:underline transition-all"
          >
            <span className="truncate font-medium">
              {currentNews.title}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>

        {/* Navigation Dots (if multiple items) */}
        {flashNews.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            {flashNews.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? "bg-white" 
                    : "bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to news item ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Animated background pulse */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-700/0 via-red-500/30 to-red-700/0 animate-pulse pointer-events-none" />
    </div>
  );
}
