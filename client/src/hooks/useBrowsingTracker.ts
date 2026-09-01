/**
 * Hook to track user browsing history
 * Automatically records page views for content pages when user is authenticated
 */

import { useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

interface TrackingData {
  contentType: "article" | "job" | "company" | "event" | "person" | "investor" | "accelerator";
  contentId: number;
  contentTitle?: string;
  contentSlug?: string;
  contentCategory?: string;
  contentImageUrl?: string;
}

export function useBrowsingTracker(data: TrackingData | null) {
  const { isAuthenticated } = useAuth();
  const trackMutation = trpc.browsingHistory.trackView.useMutation();
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !data || !data.contentId) return;

    // Create a unique key for this content to avoid double-tracking
    const trackKey = `${data.contentType}-${data.contentId}`;
    if (trackedRef.current === trackKey) return;

    trackedRef.current = trackKey;
    trackMutation.mutate({
      contentType: data.contentType,
      contentId: data.contentId,
      contentTitle: data.contentTitle,
      contentSlug: data.contentSlug,
      contentCategory: data.contentCategory,
      contentImageUrl: data.contentImageUrl,
    });
  }, [isAuthenticated, data?.contentType, data?.contentId]);
}
