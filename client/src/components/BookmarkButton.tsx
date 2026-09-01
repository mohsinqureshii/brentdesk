/**
 * BookmarkButton - A reusable bookmark/save button for articles, jobs, and events
 * Shows a heart/bookmark icon that toggles on click
 */

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BookmarkButtonProps {
  contentType: "article" | "job" | "event" | "company" | "person" | "investor" | "accelerator";
  contentId: number;
  contentTitle?: string;
  contentSlug?: string;
  contentCategory?: string;
  contentImageUrl?: string;
  variant?: "icon" | "button" | "text";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BookmarkButton({
  contentType,
  contentId,
  contentTitle,
  contentSlug,
  contentCategory,
  contentImageUrl,
  variant = "icon",
  size = "md",
  className = "",
}: BookmarkButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [optimisticBookmarked, setOptimisticBookmarked] = useState<boolean | null>(null);

  // Check if bookmarked
  const { data: checkData } = trpc.bookmarks.check.useQuery(
    { contentType, contentId },
    { enabled: !!user }
  );

  const isBookmarked = optimisticBookmarked !== null ? optimisticBookmarked : checkData?.bookmarked ?? false;

  const utils = trpc.useUtils();

  const toggleMutation = trpc.bookmarks.toggle.useMutation({
    onMutate: () => {
      setOptimisticBookmarked(!isBookmarked);
    },
    onSuccess: (data) => {
      setOptimisticBookmarked(data.bookmarked);
      utils.bookmarks.check.invalidate({ contentType, contentId });
      utils.bookmarks.list.invalidate();
      toast({
        title: data.bookmarked ? "Saved" : "Removed",
        description: data.bookmarked
          ? `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} saved to your bookmarks`
          : `Removed from your bookmarks`,
      });
    },
    onError: () => {
      setOptimisticBookmarked(null);
      toast({
        title: "Error",
        description: "Failed to update bookmark. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save items to your bookmarks.",
      });
      return;
    }

    toggleMutation.mutate({
      contentType,
      contentId,
      contentTitle,
      contentSlug,
      contentCategory,
      contentImageUrl,
    });
  };

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  if (variant === "button") {
    return (
      <Button
        variant={isBookmarked ? "default" : "outline"}
        size="sm"
        onClick={handleToggle}
        className={`gap-2 ${className}`}
        disabled={toggleMutation.isPending}
      >
        {isBookmarked ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
        {isBookmarked ? "Saved" : "Save"}
      </Button>
    );
  }

  if (variant === "text") {
    return (
      <button
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
          isBookmarked
            ? "text-emerald-600 hover:text-emerald-700"
            : "text-muted-foreground hover:text-foreground"
        } ${className}`}
        disabled={toggleMutation.isPending}
      >
        {isBookmarked ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
        {isBookmarked ? "Saved" : "Save"}
      </button>
    );
  }

  // Default: icon variant
  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center justify-center rounded-full transition-all ${sizeClasses[size]} ${
        isBookmarked
          ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      } ${className}`}
      disabled={toggleMutation.isPending}
      title={isBookmarked ? "Remove from saved" : "Save for later"}
    >
      {isBookmarked ? (
        <BookmarkCheck size={iconSizes[size]} className="fill-current" />
      ) : (
        <Bookmark size={iconSizes[size]} />
      )}
    </button>
  );
}
