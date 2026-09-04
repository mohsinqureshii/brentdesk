/**
 * Newsletter Signup Component
 * Reusable component for capturing newsletter subscribers
 */

import { useState } from "react";
import { publication } from "@shared/publication";
import { useT } from "@/lib/i18n";
import type { UiKey } from "@shared/uiStrings";
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

/** The lists a reader can pick. The masthead's own daily keeps its name in
 *  every language; the rest are described rather than branded, so both the
 *  name and the description translate. */
const availableLists: Array<{ slug: string; name?: string; nameKey?: UiKey; descriptionKey: UiKey }> = [
  { slug: "daily-brief", name: publication.newsletter.name, descriptionKey: "newsletter.dailyDescription" },
  { slug: "projects-weekly", nameKey: "newsletter.projectsWeekly", descriptionKey: "newsletter.projectsDescription" },
  { slug: "energy-brief", nameKey: "cat.energy", descriptionKey: "newsletter.eventsDescription" },
  { slug: "jobs-alerts", nameKey: "newsletter.jobAlerts", descriptionKey: "newsletter.jobsDescription" },
  { slug: "event-updates", nameKey: "newsletter.eventUpdates", descriptionKey: "newsletter.eventsDescription" },
];

export function NewsletterSignup({
  variant = "inline",
  listSlug = "daily-brief",
  source = "website",
  showLists = false,
  className = ""
}: NewsletterSignupProps) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [selectedLists, setSelectedLists] = useState<string[]>([listSlug]);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const subscribeMutation = trpc.admin.newsletter.subscribe.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success(t("newsletter.confirmEmail"));
    },
    onError: (error) => {
      toast.error(error.message || t("newsletter.error"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t("newsletter.needEmail"));
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
        <span className="text-sm">{t("newsletter.confirmInbox")}</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <Input
          type="email"
          placeholder={t("newsletter.enterEmail")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={subscribeMutation.isPending}
        />
        <Button type="submit" disabled={subscribeMutation.isPending}>
          {subscribeMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("newsletter.subscribe")
          )}
        </Button>
      </form>
    );
  }

  if (variant === "footer") {
    return (
      <div className={className}>
        <h3 className="font-semibold mb-2">{t("newsletter.stayUpdated")}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("newsletter.dailyDescription")}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder={t("newsletter.enterEmail")}
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
            {t("newsletter.subscribe")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("newsletter.consent")}
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
          <h3 className="font-semibold">{t("newsletter.subscribe")} — {publication.name}</h3>
          <p className="text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          placeholder={t("newsletter.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={subscribeMutation.isPending}
        />

        {showLists && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("newsletter.selectLists")}</Label>
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
                      {list.name ?? t(list.nameKey!)}
                    </Label>
                    <p className="text-xs text-muted-foreground">{t(list.descriptionKey)}</p>
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
            {t("newsletter.marketingConsent", { site: publication.name })}
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={subscribeMutation.isPending}>
          {subscribeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {t("common.subscribing")}
            </>
          ) : (
            t("newsletter.subscribe")
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {t("newsletter.unsubscribeAnytime")}{" "}
          <a href="/privacy" className="underline hover:text-foreground">{t("footer.privacyPolicy")}</a>.
        </p>
      </form>
    </div>
  );
}

export default NewsletterSignup;
