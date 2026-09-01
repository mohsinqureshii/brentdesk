import { useState } from "react";
import { Link, useParams } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LeaderboardAd, SidebarAd } from "@/components/ads/AdUnit";
import SEO from "@/components/SEO";
import {
  ArrowLeft, Download, FileText, FileSpreadsheet, Presentation,
  Globe, Building2, Calendar, Eye, Loader2, ExternalLink, Share2,
  CheckCircle, ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const formatIcons: Record<string, React.ElementType> = {
  doc: FileText,
  pdf: FileText,
  sheet: FileSpreadsheet,
  ppt: Presentation,
  notion: FileText,
  gsheet: FileSpreadsheet,
  excel: FileSpreadsheet,
};

const formatColors: Record<string, string> = {
  doc: "bg-blue-100 text-blue-700",
  pdf: "bg-red-100 text-red-700",
  sheet: "bg-green-100 text-green-700",
  ppt: "bg-orange-100 text-orange-700",
  notion: "bg-gray-100 text-gray-700",
  gsheet: "bg-emerald-100 text-emerald-700",
  excel: "bg-green-100 text-green-700",
};

const formatLabels: Record<string, string> = {
  doc: "Document",
  pdf: "PDF",
  sheet: "Spreadsheet",
  ppt: "Presentation",
  notion: "Notion Template",
  gsheet: "Google Sheets",
  excel: "Excel",
};

export default function TemplateDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: resource, isLoading } = trpc.resources.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  // Get related templates
  const { data: relatedData } = trpc.resources.getByType.useQuery(
    { type: "template", limit: 4 },
    { enabled: !!resource }
  );

  const downloadMutation = trpc.resources.trackDownload.useMutation();

  const handleDownload = async () => {
    if (!resource) return;
    setIsDownloading(true);
    try {
      await downloadMutation.mutateAsync({ resourceId: resource.id });
      const url = resource.downloadUrl || resource.externalUrl;
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = resource.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download started!");
      } else {
        toast.error("Download link not available");
      }
    } catch {
      toast.error("Failed to start download");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: resource?.title, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  // Determine format from type or default
  const format = "pdf";
  const FormatIcon = formatIcons[format] || FileText;
  const formatColor = formatColors[format] || "bg-muted text-muted-foreground";

  // Related templates excluding current
  const relatedTemplates = (relatedData || [])
    .filter((r: any) => r.id !== resource?.id)
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-4xl py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Template Not Found</h1>
          <p className="text-muted-foreground mb-6">The template you're looking for doesn't exist or has been removed.</p>
          <Link href="/resources/templates">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Templates
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {resource.seo && (
        <SEO
          title={resource.seo.title || resource.title}
          description={resource.seo.description || resource.shortDescription || ""}
          ogImage={resource.featuredImage || undefined}
        />
      )}
      <Header />

      <LeaderboardAd slotKey="template-detail-top" />

      <main className="container max-w-6xl py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/resources" className="hover:text-foreground transition-colors">Resources</Link>
          <span>/</span>
          <Link href="/resources/templates" className="hover:text-foreground transition-colors">Templates</Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">{resource.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header Card */}
            <Card className="border border-border mb-8">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-5 mb-6">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${formatColor}`}>
                    <FormatIcon className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{resource.title}</h1>
                    {resource.shortDescription && (
                      <p className="text-base text-muted-foreground">{resource.shortDescription}</p>
                    )}
                  </div>
                </div>

                {/* Meta badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="secondary" className="text-xs uppercase">{format}</Badge>
                  {resource.categories?.map((cat: any) => (
                    <Badge key={cat.id} variant="outline" className="text-xs">{cat.name}</Badge>
                  ))}
                  {resource.regions?.map((reg: any) => (
                    <Badge key={reg.id} variant="secondary" className="text-xs">{reg.name}</Badge>
                  ))}
                  {resource.sectors?.map((sec: any) => (
                    <Badge key={sec.id} variant="outline" className="text-xs">{sec.name}</Badge>
                  ))}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    {(resource.viewCount || 0).toLocaleString()} views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Download className="w-4 h-4" />
                    {(resource.downloadCount || 0).toLocaleString()} downloads
                  </span>
                  {resource.publishedAt && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {new Date(resource.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    className="gap-2 bg-foreground hover:bg-foreground/90 text-background"
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    Download Template
                  </Button>
                  {resource.externalUrl && (
                    <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="lg" className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        View Source
                      </Button>
                    </a>
                  )}
                  <Button variant="ghost" size="lg" onClick={handleShare} className="gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Description / Content */}
            {(resource.description || resource.content) && (
              <Card className="border border-border mb-8">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-4">About This Template</h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    <Streamdown>{resource.content || resource.description || ""}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* What's Included */}
            <Card className="border border-border mb-8">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">What's Included</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    Ready-to-use {formatLabels[format] || "document"} format
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    Fully customizable and editable
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    Professional layout and design
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    MENA market-specific content
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Provider info */}
            {resource.provider && (
              <Card className="border border-border mb-8">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Provider</h2>
                  <div className="flex items-center gap-4">
                    {resource.providerLogo ? (
                      <img src={resource.providerLogo} alt={resource.provider} className="w-12 h-12 rounded-lg object-contain bg-muted p-1" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-foreground">{resource.provider}</h3>
                      {resource.providerWebsite && (
                        <a
                          href={resource.providerWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Visit website
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 shrink-0 space-y-6">
            {/* Quick Download Card */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground mb-3">Get This Template</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download and start using this template right away. Fully editable and customizable.
                </p>
                <Button
                  className="w-full gap-2 bg-foreground hover:bg-foreground/90 text-background"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download Free
                </Button>
              </CardContent>
            </Card>

            <SidebarAd slotKey="template-detail-sidebar" />

            {/* Related Templates */}
            {relatedTemplates.length > 0 && (
              <Card className="border border-border">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground mb-4">Related Templates</h3>
                  <div className="space-y-3">
                    {relatedTemplates.map((rel: any) => (
                      <Link
                        key={rel.id}
                        href={`/resources/templates/${rel.slug}`}
                        className="block group"
                      >
                        <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${formatColor}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {rel.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(rel.viewCount || 0).toLocaleString()} downloads
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <Link href="/resources/templates" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    View all templates
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
