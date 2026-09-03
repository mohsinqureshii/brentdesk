/**
 * Company Snapshot Component
 * Auto-generated company info cards showing funding history, key people, and recent news
 */

import { Link } from "wouter";
import { useT } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";
import { trpc } from "@/lib/trpc";
import { getArticleUrl } from "@/lib/articleUrl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, DollarSign, Users, Newspaper, Globe, MapPin, Calendar, TrendingUp, ExternalLink } from "lucide-react";

interface CompanySnapshotProps {
  companyId: number;
  companyName?: string;
}

// Valid ISO 4217 currency codes (common ones)
const VALID_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "JPY", "CNY", "AED", "SAR", "QAR", "KWD", "BHD", "OMR",
  "EGP", "JOD", "LBP", "MAD", "TND", "IQD", "INR", "PKR", "BDT", "SGD", "HKD",
  "AUD", "CAD", "CHF", "SEK", "NOK", "DKK", "NZD", "ZAR", "BRL", "MXN", "KRW",
  "THB", "MYR", "IDR", "PHP", "VND", "TRY", "RUB", "PLN", "CZK", "HUF", "ILS"
]);

function isValidCurrency(code: string | null | undefined): boolean {
  if (!code || typeof code !== "string") return false;
  const upperCode = code.toUpperCase().trim();
  return upperCode.length === 3 && VALID_CURRENCIES.has(upperCode);
}

function formatAmount(amount: number | string | null, currency: string = "USD"): string {
  if (!amount) return "Undisclosed";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "Undisclosed";
  
  // Validate currency code - use USD as fallback for invalid codes
  const validCurrency = isValidCurrency(currency) ? currency.toUpperCase().trim() : "USD";
  
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: validCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  if (num >= 1000000000) {
    return formatter.format(num / 1000000000) + "B";
  }
  if (num >= 1000000) {
    return formatter.format(num / 1000000) + "M";
  }
  if (num >= 1000) {
    return formatter.format(num / 1000) + "K";
  }
  return formatter.format(num);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return fmtDate(d, { month: "short", year: "numeric" });
}

export function CompanySnapshot({ companyId, companyName }: CompanySnapshotProps) {
  const t = useT();
  // Fetch company details
  const { data: company, isLoading: companyLoading } = trpc.companies.get.useQuery(
    { id: companyId },
    { enabled: companyId > 0 }
  );

  // Key people and recent news are optional - we'll skip if endpoints don't exist
  const keyPeopleEnabled = false; // Will add endpoint later
  const recentNewsEnabled = false; // Will add endpoint later

  const isLoading = companyLoading;

  if (isLoading) {
    return (
      <Card className="bg-muted/30 border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return null;
  }

  const keyPeople: any[] = []; // Will be populated when endpoint is added
  const recentNews: any[] = []; // Will be populated when endpoint is added

  return (
    <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-border overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-start gap-3">
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="h-12 w-12 rounded-lg object-cover border border-border"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold text-foreground truncate">
              {company.name}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {company.industry && (
                <Badge variant="secondary" className="text-xs">
                  {company.industry}
                </Badge>
              )}
            </div>
          </div>
          <Link href={`/companies/${company.slug || company.id}`}>
            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Company Info */}
        {(company.location || company.website || company.foundedYear) && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {company.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {company.location}
              </span>
            )}
            {company.foundedYear && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Founded {company.foundedYear}
              </span>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Globe className="h-3 w-3" />
                {t("company.website")}
              </a>
            )}
          </div>
        )}

        {/* Key People */}
        {keyPeople.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">{t("company.keyPeople")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {keyPeople.map((person: any) => (
                <Link
                  key={person.id}
                  href={`/person/${person.slug || person.id}`}
                  className="flex items-center gap-2 bg-background/50 rounded-full px-2 py-1 hover:bg-background transition-colors"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={person.avatar || ""} />
                    <AvatarFallback className="text-[10px]">
                      {person.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground">{person.name}</span>
                  {person.title && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                      {person.title}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent News */}
        {recentNews.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-foreground">{t("company.recentNews")}</span>
            </div>
            <div className="space-y-2">
              {recentNews.map((article: any) => (
                <Link
                  key={article.id}
                  href={getArticleUrl(article)}
                  className="block text-xs text-muted-foreground hover:text-primary transition-colors line-clamp-2"
                >
                  {article.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* View Full Profile */}
        <Link
          href={`/companies/${company.slug || company.id}`}
          className="block text-center text-xs text-primary hover:underline pt-2 border-t border-border/50"
        >
          View Full Company Profile →
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Component to display multiple company snapshots for an article
 */
interface ArticleCompanySnapshotsProps {
  articleId: number;
}

export function ArticleCompanySnapshots({ articleId }: ArticleCompanySnapshotsProps) {
  const t = useT();
  const { data: linkedCompanies, isLoading } = trpc.news.getArticleCompanies.useQuery(
    { articleId },
    { enabled: articleId > 0 }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!linkedCompanies || linkedCompanies.length === 0) {
    return null;
  }

  // Only show primary/featured companies
  const primaryCompanies = linkedCompanies.filter(
    (link) => link.mentionType === "primary" || link.mentionType === "mentioned"
  );

  if (primaryCompanies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-foreground flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        {t("article.companiesInArticle")}
      </h3>
      {primaryCompanies.slice(0, 3).map((link) => (
        <CompanySnapshot
          key={link.id}
          companyId={link.companyId}
          companyName={link.company?.name}
        />
      ))}
    </div>
  );
}
