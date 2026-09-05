import { useState, useMemo, useEffect, useRef } from "react";
import { fmtNumber } from "@/lib/dates";
import { Link } from "wouter";
import { publication } from "@shared/publication";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { JobApplicationModal } from "@/components/JobApplicationModal";
import { BookmarkButton } from "@/components/BookmarkButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Share2,
  CheckCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  GraduationCap,
  Award,
  Heart,
  X,
  Users,
  ArrowUpDown,
  Globe,
  ChevronDown,
  TrendingUp,
  UserPlus,
  Target,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { useEdition } from "@/hooks/useEdition";
import { ListPagination } from "@/components/ListPagination";
import { LeaderboardAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n";
import type { UiKey } from "@shared/uiStrings";

// ============================================================
// HELPERS
// ============================================================

type Translate = ReturnType<typeof useT>;

function formatTimeAgo(date: Date | string | null, t: Translate): string {
  if (!date) return t("time.recently");
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return t("time.justNow");
  if (diffHours < 24) return t("time.hoursAgo", { n: diffHours });
  if (diffDays < 7) return t("time.daysAgo", { n: diffDays });
  if (diffDays < 30) return t("time.weeksAgo", { n: Math.floor(diffDays / 7) });
  return then.toLocaleDateString();
}

const currencySymbols: Record<string, string> = {
  USD: "$", EUR: "\u20AC", GBP: "\u00A3", AED: "AED ", SAR: "SAR ", PKR: "PKR ",
  EGP: "EGP ", QAR: "QAR ", BHD: "BHD ", KWD: "KWD ", OMR: "OMR ", JOD: "JOD ",
  MAD: "MAD ", TND: "TND ", LBP: "LBP ", IQD: "IQD ",
};

function formatSalary(min: string | number | null, max: string | number | null, currency: string | null): string | undefined {
  if (!min && !max) return undefined;
  const sym = currency ? (currencySymbols[currency.toUpperCase()] || currency + " ") : "$";
  const minVal = typeof min === "string" ? parseInt(min) : min;
  const maxVal = typeof max === "string" ? parseInt(max) : max;
  if (minVal && maxVal) return `${sym}${(minVal / 1000).toFixed(0)}k-${(maxVal / 1000).toFixed(0)}k`;
  if (minVal) return `${sym}${(minVal / 1000).toFixed(0)}k+`;
  return undefined;
}

// Every option below carries a translation key rather than an English
// label. The `value` is what the server filters and sorts on, so it stays
// in English whatever language the page is read in.
const datePostedOptions: { value: string; labelKey: UiKey }[] = [
  { value: "any", labelKey: "filter.anyTime" },
  { value: "past_24h", labelKey: "filter.past24h" },
  { value: "past_week", labelKey: "filter.pastWeek" },
  { value: "past_month", labelKey: "filter.pastMonth" },
];

const departmentOptions: { value: string; labelKey: UiKey }[] = [
  { value: "Engineering", labelKey: "dept.engineering" },
  { value: "Product", labelKey: "dept.product" },
  { value: "Design", labelKey: "dept.design" },
  { value: "Marketing", labelKey: "dept.marketing" },
  { value: "Sales", labelKey: "dept.sales" },
  { value: "Operations", labelKey: "dept.operations" },
  { value: "Finance", labelKey: "dept.finance" },
  { value: "Human Resource", labelKey: "dept.humanResource" },
  { value: "Legal", labelKey: "dept.legal" },
  { value: "Technology", labelKey: "dept.technology" },
  { value: "Data", labelKey: "dept.data" },
  { value: "Customer Success", labelKey: "dept.customerSuccess" },
  { value: "Business Development", labelKey: "dept.businessDevelopment" },
];

const roleTypeKeys: Record<string, UiKey> = {
  full_time: "job.fullTime", part_time: "job.partTime", contract: "job.contract",
  internship: "job.internship", freelance: "job.freelance",
};

const seniorityKeys: Record<string, UiKey> = {
  entry: "job.entryLevel", junior: "job.junior", mid: "job.midLevel", senior: "job.senior",
  lead: "job.lead", manager: "job.manager", director: "job.director", vp: "job.vp",
  c_level: "job.cLevel", executive: "job.executive",
};

const sortOptions: { value: string; labelKey: UiKey }[] = [
  { value: "publishedAt-desc", labelKey: "sort.mostRecent" },
  { value: "salaryMax-desc", labelKey: "sort.salaryHighLow" },
  { value: "salaryMax-asc", labelKey: "sort.salaryLowHigh" },
  { value: "viewCount-desc", labelKey: "sort.mostViewed" },
  { value: "title-asc", labelKey: "sort.titleAz" },
];

function roleTypeLabel(value: string | null | undefined, t: Translate): string | null {
  if (!value) return null;
  const key = roleTypeKeys[value];
  return key ? t(key) : value;
}

function seniorityLabel(value: string | null | undefined, t: Translate): string | null {
  if (!value) return null;
  const key = seniorityKeys[value];
  return key ? t(key) : value;
}

function departmentLabel(value: string, t: Translate): string {
  const option = departmentOptions.find((d) => d.value === value);
  return option ? t(option.labelKey) : value;
}

function datePostedLabel(value: string, t: Translate): string {
  const option = datePostedOptions.find((d) => d.value === value);
  return option ? t(option.labelKey) : value;
}

// Landing page removed — users go directly to job listings

// ============================================================
// JOB TYPES
// ============================================================

type JobItem = {
  id: number;
  title: string;
  slug: string;
  companyName: string;
  companyLogo: string | null;
  companyId: number | null;
  location: string | null;
  isRemote: number | null;
  remoteType: string | null;
  roleType: string | null;
  seniority: string | null;
  salaryMin: string | number | null;
  salaryMax: string | number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  skills: unknown;
  applyUrl: string | null;
  applyEmail: string | null;
  department: string | null;
  viewCount: number | null;
  applicationCount: number | null;
};

// ============================================================
// COMPACT JOB LIST ITEM (LinkedIn-style)
// ============================================================

function JobListItem({
  job,
  isSelected,
  onClick,
}: {
  job: JobItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const t = useT();
  const roleLabel = roleTypeLabel(job.roleType, t);

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer border-b border-border px-3 py-2.5 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors group ${
        isSelected ? "bg-blue-50/80 dark:bg-blue-950/30 border-l-[3px] border-l-blue-600" : "border-l-[3px] border-l-transparent"
      }`}
    >
      <div className="flex gap-2.5">
        {/* Company Logo */}
        <div className="shrink-0">
          <div className="h-11 w-11 rounded bg-white flex items-center justify-center overflow-hidden border border-gray-200">
            {job.companyLogo ? (
              <img src={job.companyLogo} alt={job.companyName} className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-sm font-bold text-blue-600">{job.companyName.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Content - compact LinkedIn style */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-[13px] font-semibold leading-snug truncate ${
            isSelected ? "text-blue-700 dark:text-blue-400" : "text-blue-600 group-hover:text-blue-700"
          }`}>
            {job.title}
          </h3>
          <p className="text-xs text-foreground/80 truncate leading-tight">{job.companyName}</p>
          <p className="text-[11px] text-muted-foreground truncate leading-tight">
            {job.location || t("job.remote")}{(job.isRemote || job.remoteType === "fully_remote") ? ` (${t("job.remote")})` : job.remoteType === "hybrid" ? ` (${t("job.hybrid")})` : ""}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground/60">{formatTimeAgo(job.publishedAt, t)}</span>
            {roleLabel && (
              <>
                <span className="text-[10px] text-muted-foreground/40">·</span>
                <span className="text-[10px] text-muted-foreground/60">{roleLabel}</span>
              </>
            )}
            {!job.applyUrl && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                <Sparkles className="h-2.5 w-2.5" /> {t("job.easyApply")}
              </span>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <BookmarkButton
            contentType="job"
            contentId={job.id}
            contentTitle={job.title}
            contentSlug={job.slug}
            variant="icon"
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPANY INSIGHTS PANEL (LinkedIn-style)
// ============================================================

function CompanyInsights({ job }: { job: JobItem }) {
  const t = useT();
  const companySlug = job.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  const { data: companyData } = trpc.companies.getBySlug.useQuery(
    { slug: companySlug },
    { enabled: !!companySlug, retry: false }
  );

  // Simulated competitor/similar companies based on industry
  const similarCompanies = useMemo(() => {
    const industry = companyData?.industry || "Technology";
    const techCompanies: Record<string, string[]> = {
      Technology: ["Careem", "Tabby", "Kitopi", "Tamara", "Salla"],
      Fintech: ["Tabby", "Tamara", "STC Pay", "Lean Technologies", "PayTabs"],
      "E-commerce": ["Noon", "Mumzworld", "Salla", "Zid", "Jahez"],
      SaaS: ["Foodics", "Salla", "Rewaa", "Lucidya", "Unifonic"],
      default: ["Careem", "Tabby", "Kitopi", "Noon", "Foodics"],
    };
    return (techCompanies[industry] || techCompanies.default)
      .filter((c) => c.toLowerCase() !== job.companyName.toLowerCase())
      .slice(0, 4);
  }, [companyData?.industry, job.companyName]);

  return (
    <div className="border-t border-border">
      {/* About the company */}
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-600" /> {t("company.aboutName", { name: job.companyName })}
        </h3>
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm shrink-0">
            {(companyData?.logo || job.companyLogo) ? (
              <img src={companyData?.logo || job.companyLogo || ""} alt={job.companyName} className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="text-xl font-bold text-blue-600">{job.companyName.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/companies/${companySlug}`} className="text-sm font-semibold text-foreground hover:text-blue-600 hover:underline">
                {job.companyName}
              </Link>
              {companyData?.isVerified === 1 && (
                <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] px-1.5 py-0">{t("company.verified")}</Badge>
              )}
            </div>
            {companyData?.tagline && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{companyData.tagline}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
              {companyData?.industry && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> {companyData.industry}
                </span>
              )}
              {companyData?.employeeCount && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {t("company.nEmployees", { n: companyData.employeeCount })}
                </span>
              )}
              {companyData?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {companyData.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Short description */}
        {companyData?.shortDescription && (
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-3">
            {String(companyData.shortDescription)}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <Link href={`/companies/${companySlug}`}>
            <Button variant="outline" size="sm" className="rounded-none gap-1.5 text-xs h-7 border-primary/30 text-primary hover:bg-primary/5">
              <Building2 className="h-3 w-3" /> {t("company.viewProfile")}
            </Button>
          </Link>
          {companyData && (
            <BookmarkButton
              contentType="company"
              contentId={companyData.id}
              contentTitle={companyData.name}
              contentSlug={companyData.slug}
              variant="button"
              size="sm"
              className="rounded-none h-7 text-xs"
            />
          )}
          <Button variant="outline" size="sm" className="rounded-none gap-1.5 text-xs h-7 border-border text-foreground hover:bg-muted ms-auto">
            <UserPlus className="h-3 w-3" />{' '}{t("common.follow")}
          </Button>
        </div>
      </div>

      {/* Company stats grid */}
      <>
      {companyData ? (
        <div className="px-5 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {companyData?.foundedYear && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 rounded-lg p-2.5 text-center">
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{companyData.foundedYear}</p>
                <p className="text-[10px] text-muted-foreground">{t("company.founded")}</p>
              </div>
            )}
            {companyData?.stage && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 rounded-lg p-2.5 text-center">
                <p className="text-xs font-bold text-purple-700 dark:text-purple-400 capitalize">{companyData.stage.replace(/_/g, " ")}</p>
                <p className="text-[10px] text-muted-foreground">{t("company.stage")}</p>
              </div>
            )}
            {companyData?.totalFunding && (
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 rounded-lg p-2.5 text-center">
                <p className="text-xs font-bold text-green-700 dark:text-green-400">{companyData.totalFunding}</p>
                <p className="text-[10px] text-muted-foreground">{t("company.funding")}</p>
              </div>
            )}
            {companyData?.employeeCount && (
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 rounded-lg p-2.5 text-center">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{companyData.employeeCount}</p>
                <p className="text-[10px] text-muted-foreground">{t("company.employees")}</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Tech Stack */}
      {companyData?.techStack && Array.isArray(companyData.techStack) && (companyData.techStack as string[]).length > 0 && (
        <div className="px-5 pb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t("company.techStack")}</p>
          <div className="flex flex-wrap gap-1">
            {(companyData.techStack as string[]).slice(0, 8).map((tech) => (
              <Badge key={tech} variant="secondary" className="text-[10px] rounded-none px-2 py-0.5">{tech}</Badge>
            ))}
          </div>
        </div>
      )}
      </>

      {/* Hiring Insights */}
      <div className="px-5 py-3 border-t border-border bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10">
        <div className="flex items-center gap-2 mb-2.5">
          <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-foreground">{t("job.hiringInsights")}</span>
        </div>
        <div className="space-y-2">
          {(job.applicationCount ?? 0) > 0 && (
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-muted-foreground">{t("job.applicants")}</span>
                <span className="text-[11px] font-semibold text-foreground">{job.applicationCount}</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(((job.applicationCount || 0) / 50) * 100, 100)}%` }} />
              </div>
            </div>
          )}
          {(job.viewCount ?? 0) > 0 && (
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-muted-foreground">{t("job.views")}</span>
                <span className="text-[11px] font-semibold text-foreground">{job.viewCount}</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(((job.viewCount || 0) / 200) * 100, 100)}%` }} />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{t("job.posted")}</span>
            <span className="text-[11px] font-medium text-foreground">{formatTimeAgo(job.publishedAt, t)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{t("job.competitionLevel")}</span>
            <Badge className={`text-[10px] border-0 rounded-full px-2 py-0 ${
              (job.applicationCount || 0) > 20 ? "bg-red-100 text-red-700" :
              (job.applicationCount || 0) > 5 ? "bg-amber-100 text-amber-700" :
              "bg-green-100 text-green-700"
            }`}>
              {(job.applicationCount || 0) > 20 ? t("common.high") : (job.applicationCount || 0) > 5 ? t("common.medium") : t("common.low")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Similar Companies */}
      <div className="px-5 py-3 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-xs font-semibold text-foreground">{t("company.similarHiring")}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {similarCompanies.map((company) => (
            <Link key={company} href={`/companies/${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              <Badge variant="outline" className="text-[11px] rounded-full px-2.5 py-0.5 cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors">
                {company}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// JOB DETAIL PANEL (right side)
// ============================================================

function JobDetailPanel({
  job,
  onClose,
}: {
  job: JobItem;
  onClose: () => void;
}) {
  const t = useT();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showApplyModal, setShowApplyModal] = useState(false);

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const roleLabel = roleTypeLabel(job.roleType, t);
  const seniority = seniorityLabel(job.seniority, t);
  const skills = (job.skills as string[] | null) || [];
  const isExternalApply = !!job.applyUrl;
  const companySlug = job.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

  const trackClickMutation = trpc.jobApplications.trackClick.useMutation();
  const trackExternalApplyMutation = trpc.jobApplications.trackExternalApply.useMutation();

  const { data: applicationStatus } = trpc.jobApplications.checkApplication.useQuery(
    { jobId: job.id },
    { enabled: !!user }
  );
  const hasApplied = applicationStatus?.applied;

  const handleApplyClick = () => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    if (job.applyUrl) {
      trackExternalApplyMutation.mutate(
        { jobId: job.id, referrer: window.location.href },
        {
          onSuccess: (data) => {
            if (data.applyUrl) window.open(data.applyUrl, "_blank");
          },
        }
      );
    } else {
      trackClickMutation.mutate({ jobId: job.id, clickType: "apply_click" });
      setShowApplyModal(true);
    }
  };

  const handleShare = async () => {
    trackClickMutation.mutate({ jobId: job.id, clickType: "share" });
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jobs/${job.slug}`);
      toast({ title: t("common.linkCopied"), description: t("job.linkCopied") });
    } catch {
      toast({ title: t("article.share"), description: `${window.location.origin}/jobs/${job.slug}` });
    }
  };

  return (
    <>
      <div className="h-full flex flex-col bg-card">
        {/* Sticky header with apply actions */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded bg-white flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm shrink-0">
              {job.companyLogo ? (
                <img src={job.companyLogo} alt={job.companyName} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-base font-bold text-blue-600">{job.companyName.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground leading-tight">{job.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                <Link href={`/companies/${companySlug}`} className="text-blue-600 hover:underline font-medium">
                  {job.companyName}
                </Link>
                {" · "}
                <span>{job.location || t("job.remote")}</span>
                {(job.isRemote || job.remoteType === "fully_remote") && <span className="text-primary"> ({t("job.remote")})</span>}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            {hasApplied ? (
              <Button disabled className="gap-2 rounded-full h-9 text-sm">
                <CheckCircle className="h-4 w-4" /> {t("job.applied")}
              </Button>
            ) : (
              <Button onClick={handleApplyClick} className="gap-2 rounded-full h-9 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {isExternalApply ? (
                  <><ExternalLink className="h-4 w-4" /> {t("job.apply")}</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> {t("job.easyApply")}</>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" className="rounded-full h-9 gap-1.5" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5" /> {t("article.share")}
            </Button>
            <BookmarkButton
              contentType="job"
              contentId={job.id}
              contentTitle={job.title}
              contentSlug={job.slug}
              variant="button"
              size="sm"
              className="rounded-full h-9"
            />
            <Link href={`/jobs/${job.slug}`} className="ml-auto">
              <Button variant="ghost" size="sm" className="rounded-full h-9 gap-1.5 text-xs text-muted-foreground">
                <ExternalLink className="h-3.5 w-3.5" /> {t("job.fullPage")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick info pills */}
          <div className="px-5 py-3 border-b border-border flex flex-wrap gap-2">
            {roleLabel && (
              <Badge variant="secondary" className="rounded-full text-xs font-normal gap-1 bg-blue-50 text-blue-700 border border-blue-200">
                <Briefcase className="h-3 w-3" /> {roleLabel}
              </Badge>
            )}
            {seniority && (
              <Badge variant="secondary" className="rounded-full text-xs font-normal gap-1 bg-purple-50 text-purple-700 border border-purple-200">
                <GraduationCap className="h-3 w-3" /> {seniority}
              </Badge>
            )}
            {salary && (
              <Badge variant="secondary" className="rounded-full text-xs font-normal gap-1 bg-primary/10 text-primary border border-primary">
                {salary}
              </Badge>
            )}
            {(job.isRemote || job.remoteType === "fully_remote" || job.remoteType === "hybrid") && (
              <Badge className="rounded-full text-xs font-normal gap-1 bg-amber-50 text-amber-700 border border-amber-200">
                <Globe className="h-3 w-3" /> {job.remoteType === "hybrid" ? t("job.hybrid") : t("job.remote")}
              </Badge>
            )}
            {job.department && (
              <Badge variant="secondary" className="rounded-full text-xs font-normal gap-1">
                {job.department}
              </Badge>
            )}
          </div>

          {/* About the Role */}
          {job.description && (
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2">{t("job.aboutRole")}</h3>
              <div
                className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            </div>
          )}

          {/* Requirements */}
          {job.requirements && (
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500" /> {t("job.requirements")}
              </h3>
              <div
                className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: job.requirements }}
              />
            </div>
          )}

          {/* Benefits */}
          {job.benefits && (
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" /> {t("job.benefitsPerks")}
              </h3>
              <div
                className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: job.benefits }}
              />
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2">{t("job.skillsTags")}</h3>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <Badge key={s} className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Company Insights */}
          <CompanyInsights job={job} />
        </div>
      </div>

      {/* Easy Apply Modal */}
      <JobApplicationModal
        open={showApplyModal}
        onOpenChange={setShowApplyModal}
        jobId={job.id}
        jobTitle={job.title}
        companyName={job.companyName}
      />
    </>
  );
}

// ============================================================
// TOP FILTER BAR (LinkedIn-style horizontal pills)
// ============================================================

interface FilterState {
  roleType?: string;
  seniority?: string;
  isRemote?: boolean;
  countryId?: number;
  cityId?: number;
  department?: string;
  datePosted?: string;
  salaryMin?: number;
}

function TopFilterBar({
  filters,
  onFilterChange,
  onClear,
  sortValue,
  onSortChange,
  totalItems,
}: {
  filters: FilterState;
  onFilterChange: (key: string, value: any) => void;
  onClear: () => void;
  sortValue: string;
  onSortChange: (val: string) => void;
  totalItems: number;
}) {
  const t = useT();
  const { data: countriesData } = trpc.jobs.listCountries.useQuery();
  const { data: citiesData } = trpc.jobs.listCities.useQuery(
    { countryId: filters.countryId! },
    { enabled: !!filters.countryId }
  );

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined).length;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 mb-3">
      {/* Filter row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Location */}
        <Select
          value={filters.countryId ? String(filters.countryId) : "all"}
          onValueChange={(val) => {
            if (val === "all") {
              onFilterChange("countryId", undefined);
              onFilterChange("cityId", undefined);
            } else {
              onFilterChange("countryId", parseInt(val));
              onFilterChange("cityId", undefined);
            }
          }}
        >
          <SelectTrigger className="h-7 text-[11px] w-auto min-w-[100px] rounded-full border-gray-300 bg-white px-2.5">
            <Globe className="h-3 w-3 mr-1 text-muted-foreground" />
            <SelectValue placeholder={t("job.location")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.allLocations")}</SelectItem>
            {(countriesData || []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City (cascading) */}
        {filters.countryId && citiesData && citiesData.length > 0 && (
          <Select
            value={filters.cityId ? String(filters.cityId) : "all"}
            onValueChange={(val) => onFilterChange("cityId", val === "all" ? undefined : parseInt(val))}
          >
            <SelectTrigger className="h-7 text-[11px] w-auto min-w-[90px] rounded-full border-gray-300 bg-white px-2.5">
              <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder={t("filter.city")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.allCities")}</SelectItem>
              {citiesData.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Employment Type */}
        <Select
          value={filters.roleType || "all"}
          onValueChange={(val) => onFilterChange("roleType", val === "all" ? undefined : val)}
        >
          <SelectTrigger className="h-7 text-[11px] w-auto min-w-[95px] rounded-full border-gray-300 bg-white px-2.5">
            <Briefcase className="h-3 w-3 mr-1 text-muted-foreground" />
            <SelectValue placeholder={t("job.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.allTypes")}</SelectItem>
            {Object.entries(roleTypeKeys).map(([val, labelKey]) => (
              <SelectItem key={val} value={val}>{t(labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Experience Level */}
        <Select
          value={filters.seniority || "all"}
          onValueChange={(val) => onFilterChange("seniority", val === "all" ? undefined : val)}
        >
          <SelectTrigger className="h-7 text-[11px] w-auto min-w-[100px] rounded-full border-gray-300 bg-white px-2.5">
            <GraduationCap className="h-3 w-3 mr-1 text-muted-foreground" />
            <SelectValue placeholder={t("filter.experience")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.allLevels")}</SelectItem>
            {Object.entries(seniorityKeys).map(([val, labelKey]) => (
              <SelectItem key={val} value={val}>{t(labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Remote toggle */}
        <button
          onClick={() => onFilterChange("isRemote", filters.isRemote ? undefined : true)}
          className={`h-7 px-2.5 text-[11px] rounded-full border transition-colors flex items-center gap-1 ${
            filters.isRemote
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-muted-foreground border-gray-300 hover:border-gray-400"
          }`}
        >
          <Globe className="h-3 w-3" /> {t("job.remote")}
        </button>

        {/* Department */}
        <Select
          value={filters.department || "all"}
          onValueChange={(val) => onFilterChange("department", val === "all" ? undefined : val)}
        >
          <SelectTrigger className="h-7 text-[11px] w-auto min-w-[105px] rounded-full border-gray-300 bg-white px-2.5">
            <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
            <SelectValue placeholder={t("job.department")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.allDepartments")}</SelectItem>
            {departmentOptions.map((d) => (
              <SelectItem key={d.value} value={d.value}>{t(d.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Posted */}
        <Select
          value={filters.datePosted || "any"}
          onValueChange={(val) => onFilterChange("datePosted", val === "any" ? undefined : val)}
        >
          <SelectTrigger className="h-7 text-[11px] w-auto min-w-[100px] rounded-full border-gray-300 bg-white px-2.5">
            <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
            <SelectValue placeholder={t("filter.datePosted")} />
          </SelectTrigger>
          <SelectContent>
            {datePostedOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Salary Range */}
        <Select
          value={filters.salaryMin ? String(filters.salaryMin) : "any"}
          onValueChange={(val) => onFilterChange("salaryMin", val === "any" ? undefined : parseInt(val))}
        >
          <SelectTrigger className="h-7 text-[11px] w-auto min-w-[95px] rounded-full border-gray-300 bg-white px-2.5">
            <DollarSign className="h-3 w-3 mr-1 text-muted-foreground" />
            <SelectValue placeholder={t("job.salary")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t("filter.anySalary")}</SelectItem>
            <SelectItem value="30000">$30k+</SelectItem>
            <SelectItem value="50000">$50k+</SelectItem>
            <SelectItem value="80000">$80k+</SelectItem>
            <SelectItem value="100000">$100k+</SelectItem>
            <SelectItem value="150000">$150k+</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          <Select value={sortValue} onValueChange={onSortChange}>
            <SelectTrigger className="h-7 text-[11px] w-auto min-w-[120px] rounded-full border-gray-300 bg-white px-2.5">
              <ArrowUpDown className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder={t("filter.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filters + results count */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <p className="text-xs text-muted-foreground font-medium">
          {t(totalItems === 1 ? "job.foundOne" : "job.foundCount", { n: fmtNumber(totalItems) })}
        </p>
        {activeFilterCount > 0 && (
          <>
            <span className="text-xs text-muted-foreground">·</span>
            {filters.roleType && (
              <Badge className="text-[10px] gap-1 h-5 cursor-pointer bg-blue-100 text-blue-700 border-0 hover:bg-red-100 hover:text-red-700 rounded-full" onClick={() => onFilterChange("roleType", undefined)}>
                {roleTypeLabel(filters.roleType, t)} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {filters.seniority && (
              <Badge className="text-[10px] gap-1 h-5 cursor-pointer bg-purple-100 text-purple-700 border-0 hover:bg-red-100 hover:text-red-700 rounded-full" onClick={() => onFilterChange("seniority", undefined)}>
                {seniorityLabel(filters.seniority, t)} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {!!filters.isRemote && (
              <Badge className="text-[10px] gap-1 h-5 cursor-pointer bg-amber-100 text-amber-700 border-0 hover:bg-red-100 hover:text-red-700 rounded-full" onClick={() => onFilterChange("isRemote", undefined)}>
                {t("job.remote")} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {filters.department && (
              <Badge className="text-[10px] gap-1 h-5 cursor-pointer bg-teal-100 text-teal-700 border-0 hover:bg-red-100 hover:text-red-700 rounded-full" onClick={() => onFilterChange("department", undefined)}>
                {departmentLabel(filters.department, t)} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {filters.datePosted && (
              <Badge className="text-[10px] gap-1 h-5 cursor-pointer bg-orange-100 text-orange-700 border-0 hover:bg-red-100 hover:text-red-700 rounded-full" onClick={() => onFilterChange("datePosted", undefined)}>
                {datePostedLabel(filters.datePosted, t)} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {filters.salaryMin && (
              <Badge className="text-[10px] gap-1 h-5 cursor-pointer bg-primary text-primary border-0 hover:bg-red-100 hover:text-red-700 rounded-full" onClick={() => onFilterChange("salaryMin", undefined)}>
                ${(filters.salaryMin / 1000).toFixed(0)}k+ <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            <button onClick={onClear} className="text-[11px] text-blue-600 hover:underline font-medium ml-1">
              {t("filter.clearAllShort")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN JOBS LISTING (LinkedIn-style split panel)
// ============================================================

function JobsListing() {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [sortValue, setSortValue] = useState("publishedAt-desc");
  const itemsPerPage = 25;
  const listRef = useRef<HTMLDivElement>(null);

  const [sortBy, sortOrder] = useMemo(() => {
    const parts = sortValue.split("-");
    return [parts[0], parts[1]] as [string, string];
  }, [sortValue]);

  // Edition bias — surface jobs in the visitor's country first.
  // Null on International or pre-load → server falls back to default sort.
  const { editionCountryId } = useEdition();
  const { data: jobsData, isLoading } = trpc.jobs.list.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    editionCountryId: editionCountryId ?? undefined,
    search: searchQuery || undefined,
    sortBy: sortBy as any,
    sortOrder: sortOrder as any,
    roleType: filters.roleType as any,
    seniority: filters.seniority as any,
    isRemote: filters.isRemote,
    countryId: filters.countryId,
    cityId: filters.cityId,
    department: filters.department,
    datePosted: filters.datePosted as any,
    salaryMin: filters.salaryMin,
  });

  const jobsList = useMemo(() => (jobsData?.items || []) as JobItem[], [jobsData]);
  const totalPages = jobsData?.totalPages || 1;
  const totalItems = jobsData?.total || 0;

  useEffect(() => {
    setSelectedJobIndex(0);
  }, [currentPage, searchQuery, filters.roleType, filters.seniority, filters.isRemote, filters.countryId, filters.cityId, filters.department, filters.datePosted, filters.salaryMin, sortValue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters.roleType, filters.seniority, filters.isRemote, filters.countryId, filters.cityId, filters.department, filters.datePosted, filters.salaryMin, sortValue]);

  const selectedJob = jobsList[selectedJobIndex] || null;

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <main className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6">
      {/* Search bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("job.searchPlaceholder")}
            className="pl-10 bg-card text-sm h-11 rounded-lg border-gray-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Top filter bar */}
      <TopFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        sortValue={sortValue}
        onSortChange={setSortValue}
        totalItems={totalItems}
      />

      {/* Split panel layout */}
      <div className="flex gap-4">
        {/* Left: Job list */}
        <div
          ref={listRef}
          className="w-full lg:w-[420px] shrink-0 bg-card border border-border rounded-lg overflow-hidden"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          <div className="overflow-y-auto h-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : jobsList.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Briefcase className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground mb-1">{t("state.noJobs")}</h3>
                <p className="text-xs text-muted-foreground">{t("state.tryAdjusting")}</p>
                <Button variant="outline" size="sm" className="mt-3 text-xs rounded-full" onClick={handleClearFilters}>
                  {t("filter.clearAll")}
                </Button>
              </div>
            ) : (
              <>
                {jobsList.map((job, index) => (
                  <JobListItem
                    key={job.id}
                    job={job}
                    isSelected={index === selectedJobIndex}
                    onClick={() => {
                      setSelectedJobIndex(index);
                      if (window.innerWidth < 1024) {
                        setMobileDetailOpen(true);
                      }
                    }}
                  />
                ))}
                {totalPages > 1 && (
                  <div className="p-3 border-t border-border">
                    <ListPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Job detail panel (desktop) */}
        <div
          className="hidden lg:block flex-1 bg-card border border-border rounded-lg overflow-hidden"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          {selectedJob ? (
            <div className="h-full overflow-y-auto">
              <JobDetailPanel job={selectedJob} onClose={() => {}} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center px-8">
              <div>
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("job.selectToSeeDetails")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail sheet */}
      <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl">
          {selectedJob && (
            <JobDetailPanel job={selectedJob} onClose={() => setMobileDetailOpen(false)} />
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export default function Jobs() {
  const t = useT();

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <SEO
        title={`${t("job.pageTitle")} | ${publication.name}`}
        description={t("job.pageDescription")}
        canonical={`${publication.siteUrl}/jobs`}
        keywords="industrial jobs, construction jobs, energy jobs, engineering jobs, project management, HSE, Saudi Arabia jobs, GCC jobs"
        ogImage={`${publication.siteUrl}${publication.assets.ogImage}`}
        ogType="website"
      />
      <Header />

      {/* Index pages carry a masthead like every other section of the
          paper, rather than opening straight onto a search box. */}
      <header className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-5 border-b-2 border-foreground">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-8 sm:h-10 shrink-0 bg-primary" aria-hidden />
          <h1 className="bd-lede text-[1.75rem] sm:text-[2.5rem] text-foreground">{t("job.pageTitle")}</h1>
        </div>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          {t("job.pageSubtitle", { site: publication.name })}
        </p>
      </header>

      <JobsListing />

      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4">
        <LeaderboardAd slotKey="category-leaderboard" />
      </div>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
}
