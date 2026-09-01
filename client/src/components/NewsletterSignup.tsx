/**
 * Newsletter Signup Component
 * Reusable component for capturing newsletter subscribers
 */

import { useState } from "react";
import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Loader2, CheckCircle } from "lucide-react";

interface NewsletterSignupProps {
  variant?: "inline" | "card" | "footer";
  listSlug?: string;
  source?: string;
  showLists?: boolean;
  className?: string;
}

const availableLists = [
  { slug: "weekly-digest", name: "Weekly Digest", description: "Top stories every week" },
  { slug: "founder-digest", name: "Founder Digest", description: "Insights for founders" },
  { slug: "investor-brief", name: "Investor Brief", description: "Investment opportunities" },
  { slug: "job-alerts", name: "Job Alerts", description: "New job listings" },
  { slug: "event-updates", name: "Event Updates", description: "Upcoming events" },
  { slug: "breaking-news", name: "Breaking News", description: "Real-time updates" },
];

export function NewsletterSignup({ 
  variant = "inline", 
  listSlug = "weekly-digest",
  source = "website",
  showLists = false,
  className = ""
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [selectedLists, setSelectedLists] = useState<string[]>([listSlug]);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const subscribeMutation = trpc.admin.newsletter.subscribe.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success("Successfully subscribed! Check your email to confirm.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to subscribe. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    subscribeMutation.mutate({
      email,
      listSlugs: selectedLists,
      source,
      consentMarketing,
    });
  };

  const toggleList = (slug: string) => {
    setSelectedLists(prev => 
      prev.includes(slug) 
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    );
  };

  if (isSubmitted) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <CheckCircle className="w-5 h-5 text-green-500" />
        <span className="text-sm">Thanks for subscribing! Check your inbox to confirm.</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={subscribeMutation.isPending}
        />
        <Button type="submit" disabled={subscribeMutation.isPending}>
          {subscribeMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </Button>
      </form>
    );
  }

  if (variant === "footer") {
    return (
      <div className={className}>
        <h3 className="font-semibold mb-2">Stay Updated</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get the latest MENA tech news delivered to your inbox.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={subscribeMutation.isPending}
          />
          <Button type="submit" className="w-full" disabled={subscribeMutation.isPending}>
            {subscribeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Subscribe
          </Button>
          <p className="text-xs text-muted-foreground">
            By subscribing, you agree to our Privacy Policy.
          </p>
        </form>
      </div>
    );
  }

  // Card variant
  return (
    <div className={`p-6 border rounded-lg bg-card ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-full">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Subscribe to {publication.name}</h3>
          <p className="text-sm text-muted-foreground">
            {publication.tagline}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={subscribeMutation.isPending}
        />

        {showLists && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select newsletters:</Label>
            <div className="grid gap-2">
              {availableLists.map((list) => (
                <div key={list.slug} className="flex items-start gap-2">
                  <Checkbox
                    id={list.slug}
                    checked={selectedLists.includes(list.slug)}
                    onCheckedChange={() => toggleList(list.slug)}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor={list.slug} className="text-sm font-medium cursor-pointer">
                      {list.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">{list.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <Checkbox
            id="consent"
            checked={consentMarketing}
            onCheckedChange={(checked) => setConsentMarketing(checked as boolean)}
          />
          <Label htmlFor="consent" className="text-xs text-muted-foreground cursor-pointer">
            I agree to receive marketing communications and partner offers from {publication.name}.
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={subscribeMutation.isPending}>
          {subscribeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Subscribing...
            </>
          ) : (
            "Subscribe Now"
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          You can unsubscribe at any time. Read our{" "}
          <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
        </p>
      </form>
    </div>
  );
}

export default NewsletterSignup;
