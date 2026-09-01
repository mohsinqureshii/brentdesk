import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useParams } from "wouter";
import { useBrowsingTracker } from "@/hooks/useBrowsingTracker";
import { BookmarkButton } from "@/components/BookmarkButton";
import { JobApplicationModal } from "@/components/JobApplicationModal";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LeaderboardAd, MobileStickyAd, SidebarAd } from "@/components/ads/AdUnit";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Users,
  Briefcase,
  Globe,
  ArrowLeft,
  Share2,
  CheckCircle,
  Loader2,
  ExternalLink,
  Send,
  Eye,
  Sparkles,
  GraduationCap,
  Target,
  Award,
  Laptop,
  Heart,
  Calendar,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { JsonLd } from "@/components/JsonLd";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return "Recently";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return then.toLocaleDateString();
}

function formatSalary(min: string | number | null, max: string | number | null, currency: string | null): string | undefined {
  if (!min && !max) return undefined;
  const curr = currency || "$";
  const minVal = typeof min === "string" ? parseInt(min) : min;
  const maxVal = typeof max === "string" ? parseInt(max) : max;
  if (minVal && maxVal) return `${curr}${(minVal / 1000).toFixed(0)}k - ${curr}${(maxVal / 1000).toFixed(0)}k`;
  if (minVal) return `${curr}${(minVal / 1000).toFixed(0)}k+`;
  return undefined;
}

function parseListFromText(text: string | null): string[] {
  if (!text) return [];
  const lines = text.split(/[\n\r]+/).filter((line) => line.trim());
  if (lines.length > 1) return lines.map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  return text.trim() ? [text.trim()] : [];
}

const roleTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const seniorityLabels: Record<string, string> = {
  entry: "Entry Level",
  junior: "Junior",
  mid: "Mid Level",
  senior: "Senior",
  lead: "Lead",
  manager: "Manager",
  director: "Director",
  vp: "VP",
  c_level: "C-Level",
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showApplyModal, setShowApplyModal] = useState(false);

  const { data: job, isLoading, error } = trpc.jobs.getBySlug.useQuery(
    { slug: id || "" },
    { enabled: !!id }
  );

  const { data: applicationStatus } = trpc.jobApplications.checkApplication.useQuery(
    { jobId: job?.id || 0 },
    { enabled: !!job?.id && !!user }
  );

  const trackClickMutation = trpc.jobApplications.trackClick.useMutation();
  const trackExternalApplyMutation = trpc.jobApplications.trackExternalApply.useMutation();

  useBrowsingTracker(
    job
      ? {
          contentType: "job",
          contentId: job.id,
          contentTitle: job.title,
          contentSlug: job.slug,
          contentCategory: job.companyName || "",
        }
      : null
  );

  useEffect(() => {
    if (job?.id) {
      trackClickMutation.mutate({
        jobId: job.id,
        clickType: "view",
        referrer: document.referrer || undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  const handleApplyClick = () => {
    if (!user) {
      window.location.href = "/signin";
      return;
    }
    if (job?.applyUrl) {
      trackExternalApplyMutation.mutate(
        { jobId: job.id, referrer: window.location.href },
        {
          onSuccess: (data) => {
            if (data.applyUrl) window.open(data.applyUrl, "_blank");
          },
        }
      );
    } else {
      trackClickMutation.mutate({ jobId: job!.id, clickType: "apply_click" });
      setShowApplyModal(true);
    }
  };

  const handleShare = async () => {
    if (job) {
      trackClickMutation.mutate({ jobId: job.id, clickType: "share" });
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link Copied", description: "Job link copied to clipboard!" });
      } catch {
        toast({ title: "Share", description: window.location.href });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
              <Footer />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <SEO title="Job Not Found" noindex />
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">Job Not Found</h1>
          <p className="text-muted-foreground mb-6">The job you're looking for doesn't exist or has been removed.</p>
          <Link href="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </div>
              <Footer />
      </div>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const isRemote = job.isRemote || job.remoteType === "fully_remote" || job.remoteType === "hybrid";
  // Requirements and benefits may contain rich HTML from TipTap editor
  const requirementsHtml = job.requirements || "";
  const benefitsHtml = job.benefits || "";
  const hasRequirements = requirementsHtml.replace(/<[^>]*>/g, "").trim().length > 0;
  const hasBenefits = benefitsHtml.replace(/<[^>]*>/g, "").trim().length > 0;
  const companySlug = job.companyName.toLowerCase().replace(/\s+/g, "-");
  const hasApplied = applicationStatus?.applied;
  const isExternalApply = !!job.applyUrl;
  const roleTypeLabel = job.roleType ? roleTypeLabels[job.roleType] || job.roleType.replace(/_/g, " ") : "Full-time";
  const seniorityLabel = job.seniority ? seniorityLabels[job.seniority] || job.seniority.replace(/_/g, " ") : null;
  const skills = (job as any).skills as string[] | null;
  const responsibilities = (job as any).responsibilities as string | null;
  const responsibilitiesList = parseListFromText(responsibilities);

  const employmentTypeMap: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
    freelance: "CONTRACTOR",
  };
  const schemaEmploymentType = job.roleType ? employmentTypeMap[job.roleType] || "FULL_TIME" : "FULL_TIME";
  const salaryMinNum = typeof job.salaryMin === "string" ? parseInt(job.salaryMin) : job.salaryMin;
  const salaryMaxNum = typeof job.salaryMax === "string" ? parseInt(job.salaryMax) : job.salaryMax;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={`${job.title} at ${job.companyName}`}
        description={`${job.title} job opportunity at ${job.companyName}. ${job.location ? `Location: ${job.location}.` : ""} ${salary ? `Salary: ${salary}.` : ""} Apply now on TechScoop.`}
        canonical={`https://techscoop.io/jobs/${job.slug}`}
      />
      <JsonLd
        type="JobPosting"
        data={(() => {
          // validThrough fallback: Google flags this as missing when
          // expiresAt is unset on the row. Posts that don't have a
          // hard expiry default to 90 days from publishedAt — a
          // reasonable shelf life for an active listing and what
          // most ATSes do internally.
          const datePostedIso = job.publishedAt
            ? new Date(job.publishedAt).toISOString()
            : new Date().toISOString();
          const validThroughIso = job.expiresAt
            ? new Date(job.expiresAt).toISOString()
            : new Date(new Date(datePostedIso).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

          // PostalAddress: prefer the resolved city / country / region
          // names from the new joins on getBySlug. Only fall back to
          // the freeform `location` string when nothing structured is
          // on file. We never invent addressRegion or postalCode —
          // those flow through only when the data exists.
          const cityName = (job as any).cityName as string | null | undefined;
          const countryName =
            ((job as any).countryName as string | null | undefined) ||
            ((job as any).countryIso2 as string | null | undefined);
          const regionName = (job as any).regionName as string | null | undefined;
          const hasAnyStructuredLocation = !!(cityName || countryName || regionName || job.location);

          // Salary period mapping. Google expects HOUR / DAY / WEEK /
          // MONTH / YEAR — our enum is hourly / monthly / yearly so
          // we upcase + drop the "ly" suffix.
          const periodMap: Record<string, "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR"> = {
            hourly: "HOUR",
            monthly: "MONTH",
            yearly: "YEAR",
          };
          const unitText = periodMap[(job as any).salaryPeriod || "yearly"] || "YEAR";

          return {
            title: job.title,
            description: job.description || `${job.title} position at ${job.companyName}`,
            datePosted: datePostedIso,
            validThrough: validThroughIso,
            hiringOrganization: {
              name: job.companyName,
              url: `https://techscoop.io/companies/${companySlug}`,
              logo: job.companyLogo || undefined,
            },
            jobLocation: hasAnyStructuredLocation
              ? {
                  address: job.location || undefined,
                  city: cityName || undefined,
                  region: regionName || undefined,
                  country: countryName || undefined,
                }
              : undefined,
            employmentType: schemaEmploymentType,
            baseSalary:
              salaryMinNum || salaryMaxNum
                ? {
                    currency: job.salaryCurrency || "USD",
                    minValue: salaryMinNum || undefined,
                    maxValue: salaryMaxNum || undefined,
                    unitText,
                  }
                : undefined,
            remote: !!isRemote,
          };
        })()}
      />
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-muted/80 to-background border-b border-border">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Jobs</span>
          </Link>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {/* Company Logo */}
            <div className="relative shrink-0">
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 bg-blue-500 text-white hover:bg-blue-500 border-0 text-xs font-semibold px-3 py-0.5 rounded-full shadow-sm">
                {roleTypeLabel}
              </Badge>
              <div className="rounded-2xl overflow-hidden shadow-lg border-4 border-background bg-white dark:bg-card">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt={job.companyName} className="h-28 w-28 sm:h-36 sm:w-36 object-contain p-3" />
                ) : (
                  <div className="h-28 w-28 sm:h-36 sm:w-36 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 flex items-center justify-center">
                    <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {job.companyName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Job Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2">
                {job.title}
              </h1>
              <p className="text-lg text-muted-foreground mb-3">
                at{" "}
                <Link href={`/companies/${companySlug}`} className="text-primary hover:underline font-medium">
                  {job.companyName}
                </Link>
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground/70" />
                  {job.location || "Remote"}
                </span>
                {salary && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-muted-foreground/70" />
                    {salary}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground/70" />
                  Posted {formatTimeAgo(job.publishedAt)}
                </span>
                {(job as any).viewCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-muted-foreground/70" />
                    {(job as any).viewCount} views
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {isRemote && (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 rounded-full text-xs">
                    <Laptop className="h-3 w-3 mr-1" />
                    {job.remoteType === "hybrid" ? "Hybrid" : "Remote"}
                  </Badge>
                )}
                {seniorityLabel && (
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {seniorityLabel}
                  </Badge>
                )}
                {isExternalApply && (
                  <Badge variant="outline" className="rounded-full text-xs text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    External Apply
                  </Badge>
                )}
              </div>
            </div>

            {/* Action Sidebar (desktop) */}
            <div className="hidden lg:flex flex-col gap-3 w-[240px] shrink-0">
              {hasApplied ? (
                <div className="text-center p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold text-sm">Applied</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {applicationStatus?.application?.applicationMethod === "external" ? "Applied externally" : "Applied via TechScoop"}
                  </p>
                </div>
              ) : (
                <Button className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90 h-11" onClick={handleApplyClick}>
                  {isExternalApply ? (
                    <>
                      Apply on Company Site
                      <ExternalLink className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Apply Now
                    </>
                  )}
                </Button>
              )}
              <BookmarkButton
                contentType="job"
                contentId={job.id}
                contentTitle={job.title}
                contentSlug={job.slug}
                contentCategory={job.roleType || undefined}
                variant="button"
              />
              <Button variant="outline" className="w-full gap-2 h-10" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                Share Job
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Buttons */}
      <div className="lg:hidden border-b border-border bg-background">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 py-4 flex flex-wrap gap-3">
          {hasApplied ? (
            <div className="flex-1 text-center p-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/30">
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span className="font-semibold text-sm">Applied</span>
              </div>
            </div>
          ) : (
            <Button className="flex-1 gap-2 bg-foreground text-background hover:bg-foreground/90" onClick={handleApplyClick}>
              {isExternalApply ? (
                <>
                  Apply on Company Site
                  <ExternalLink className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Apply Now
                </>
              )}
            </Button>
          )}
          <BookmarkButton
            contentType="job"
            contentId={job.id}
            contentTitle={job.title}
            contentSlug={job.slug}
            contentCategory={job.roleType || undefined}
            variant="button"
          />
          <Button variant="outline" className="gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Overview Stats */}
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Overview
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/50 dark:border-blue-800/30 p-4 text-center">
                  <Briefcase className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                  <div className="text-sm font-bold text-foreground">{roleTypeLabel}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Job Type</div>
                </div>
                {seniorityLabel && (
                  <div className="rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border border-purple-200/50 dark:border-purple-800/30 p-4 text-center">
                    <GraduationCap className="h-6 w-6 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                    <div className="text-sm font-bold text-foreground">{seniorityLabel}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Seniority</div>
                  </div>
                )}
                {salary && (
                  <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-200/50 dark:border-emerald-800/30 p-4 text-center">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-sm font-bold text-foreground">{salary}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Salary</div>
                  </div>
                )}
                {(job as any).applicationCount > 0 && (
                  <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30 p-4 text-center">
                    <Users className="h-6 w-6 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
                    <div className="text-2xl font-bold text-foreground">{(job as any).applicationCount}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Applicants</div>
                  </div>
                )}
              </div>
            </div>

            {/* About the Role */}
            <Card className="border border-border">
              <CardContent className="p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">About the Role</h2>
                <div
                  className="text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.description || "No description provided." }}
                />
              </CardContent>
            </Card>

            {/* Job Details & Skills - Side by Side */}
            <div className="grid sm:grid-cols-2 gap-6">
              <Card className="border border-border">
                <CardContent className="p-5 sm:p-6">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Job Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Employment Type</div>
                      <div className="text-sm font-medium text-foreground">{roleTypeLabel}</div>
                    </div>
                    {seniorityLabel && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Seniority Level</div>
                        <div className="text-sm font-medium text-foreground">{seniorityLabel}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Location</div>
                      <div className="text-sm font-medium text-foreground">{job.location || "Remote"}</div>
                    </div>
                    {isRemote && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Remote Policy</div>
                        <div className="text-sm font-medium text-foreground">
                          {job.remoteType === "hybrid" ? "Hybrid" : job.remoteType === "fully_remote" ? "Fully Remote" : "Remote Friendly"}
                        </div>
                      </div>
                    )}
                    {salary && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Salary Range</div>
                        <div className="text-sm font-medium text-foreground">{salary}</div>
                      </div>
                    )}
                    {job.publishedAt && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Posted</div>
                        <div className="text-sm font-medium text-foreground">{new Date(job.publishedAt).toLocaleDateString()}</div>
                      </div>
                    )}
                    {job.expiresAt && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Expires</div>
                        <div className="text-sm font-medium text-foreground">{new Date(job.expiresAt).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardContent className="p-5 sm:p-6">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Skills & Tags
                  </h3>
                  <div className="space-y-4">
                    {skills && skills.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Required Skills</div>
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map((s) => (
                            <Badge key={s} className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0 rounded-full text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {isRemote && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Work Style</div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 rounded-full text-xs">
                            {job.remoteType === "hybrid" ? "Hybrid" : "Remote"}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {seniorityLabel && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Experience Level</div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="rounded-full text-xs">
                            {seniorityLabel}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {!skills && !isRemote && !seniorityLabel && (
                      <p className="text-sm text-muted-foreground italic">No skill tags available yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Responsibilities */}
            {responsibilitiesList.length > 0 && (
              <Card className="border border-border">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    Responsibilities
                  </h2>
                  <ul className="space-y-3">
                    {responsibilitiesList.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-muted-foreground text-sm leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {hasRequirements && (
              <Card className="border border-border">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    Requirements
                  </h2>
                  <div
                    className="text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: requirementsHtml }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {hasBenefits && (
              <Card className="border border-border">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                    <Heart className="h-5 w-5 text-muted-foreground" />
                    Benefits & Perks
                  </h2>
                  <div
                    className="text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: benefitsHtml }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Company Card */}
            <Card className="border border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {job.companyLogo ? (
                      <img src={job.companyLogo} alt={job.companyName} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">{job.companyName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{job.companyName}</h3>
                    <p className="text-xs text-muted-foreground">{job.location || "MENA Region"}</p>
                  </div>
                </div>
                <Link href={`/companies/${companySlug}`}>
                  <Button variant="outline" className="w-full gap-2 rounded-full" size="sm">
                    <Building2 className="h-4 w-4" />
                    View Company Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <SidebarAd slotKey="detail-sidebar-top" />

            {/* Application stats */}
            {((job as any).applicationCount > 0 || (job as any).viewCount > 0) && (
              <Card className="border border-border">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground text-sm mb-3">Job Insights</h3>
                  <div className="space-y-3">
                    {(job as any).applicationCount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Applicants</span>
                        <span className="font-medium text-sm text-foreground">{(job as any).applicationCount}</span>
                      </div>
                    )}
                    {(job as any).viewCount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Views</span>
                        <span className="font-medium text-sm text-foreground">{(job as any).viewCount}</span>
                      </div>
                    )}
                    {job.publishedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Posted</span>
                        <span className="font-medium text-sm text-foreground">{formatTimeAgo(job.publishedAt)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <SidebarAd slotKey="detail-sidebar-bottom" />
          </div>
        </div>
      </main>

      {job && (
        <JobApplicationModal
          open={showApplyModal}
          onOpenChange={setShowApplyModal}
          jobId={job.id}
          jobTitle={job.title}
          companyName={job.companyName}
        />
      )}

            <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
