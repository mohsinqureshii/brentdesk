/**
 * EntitySeoTab - Reusable SEO tab for all entity editors
 * Provides: meta title, description, keywords, canonical URL, OG image, robots, search preview
 * Integrates with seoMeta table via tRPC procedures
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Globe, Eye, Search, Image, AlertCircle, CheckCircle2 } from "lucide-react";

export type EntityType = "companies" | "investors" | "people" | "jobs" | "events" | "accelerators" | "resources";

interface EntitySeoTabProps {
  entityType: EntityType;
  entityId: number | null;
  entityName: string;
  entityDescription?: string;
  entityUrl?: string; // e.g. /companies/slug
  onSaved?: () => void;
}

interface SeoMeta {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
}

const EMPTY_SEO: SeoMeta = {
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  canonicalUrl: "",
  noIndex: false,
  noFollow: false,
};

const ENTITY_LABELS: Record<EntityType, string> = {
  companies: "Company",
  investors: "Investor",
  people: "Person",
  jobs: "Job",
  events: "Event",
  accelerators: "Accelerator",
  resources: "Resource",
};

export function EntitySeoTab({ entityType, entityId, entityName, entityDescription, entityUrl, onSaved }: EntitySeoTabProps) {
  const [seo, setSeo] = useState<SeoMeta>(EMPTY_SEO);
  const [isDirty, setIsDirty] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const utils = trpc.useUtils();

  // Load existing SEO meta
  const { data: existingMeta, isLoading } = trpc.admin.seo.meta.get.useQuery(
    { entityType, entityId: entityId! },
    { enabled: !!entityId }
  );

  useEffect(() => {
    if (existingMeta) {
      setSeo({
        metaTitle: (existingMeta as any).metaTitle || "",
        metaDescription: (existingMeta as any).metaDescription || "",
        metaKeywords: (existingMeta as any).metaKeywords || "",
        ogTitle: (existingMeta as any).ogTitle || "",
        ogDescription: (existingMeta as any).ogDescription || "",
        ogImage: (existingMeta as any).ogImage || "",
        canonicalUrl: (existingMeta as any).canonicalUrl || "",
        noIndex: (existingMeta as any).robotsDirective?.includes("noindex") || false,
        noFollow: (existingMeta as any).robotsDirective?.includes("nofollow") || false,
      });
      setIsDirty(false);
    }
  }, [existingMeta]);

  const updateMutation = trpc.admin.seo.meta.update.useMutation({
    onSuccess: () => {
      toast.success("SEO settings saved!");
      setIsDirty(false);
      utils.admin.seo.meta.get.invalidate({ entityType, entityId: entityId! });
      onSaved?.();
    },
    onError: (e) => toast.error(`Failed to save SEO: ${e.message}`),
  });

  const generateSeoMutation = trpc.admin.ai.suggestSeoForEntity.useMutation({
    onSuccess: (data) => {
      if (data) {
        setSeo((prev) => ({
          ...prev,
          metaTitle: data.metaTitle || prev.metaTitle,
          metaDescription: data.metaDescription || prev.metaDescription,
          metaKeywords: data.keywords || prev.metaKeywords,
          ogTitle: data.metaTitle || prev.ogTitle,
          ogDescription: data.metaDescription || prev.ogDescription,
        }));
        setIsDirty(true);
        toast.success("AI SEO suggestions applied!");
      }
    },
    onError: (e) => toast.error(`AI SEO failed: ${e.message}`),
  });

  const handleChange = useCallback((field: keyof SeoMeta, value: string | boolean) => {
    setSeo((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  const handleSave = () => {
    if (!entityId) {
      toast.error("Save the entity first before setting SEO fields.");
      return;
    }
    const robotsDirective = [
      seo.noIndex ? "noindex" : "index",
      seo.noFollow ? "nofollow" : "follow",
    ].join(",");
    updateMutation.mutate({
      entityType,
      entityId,
      metaTitle: seo.metaTitle || undefined,
      metaDescription: seo.metaDescription || undefined,
      metaKeywords: seo.metaKeywords || undefined,
      ogTitle: seo.ogTitle || undefined,
      ogDescription: seo.ogDescription || undefined,
      ogImage: seo.ogImage || undefined,
      canonicalUrl: seo.canonicalUrl || undefined,
      noIndex: seo.noIndex,
      noFollow: seo.noFollow,
    });
  };

  const handleGenerateAI = async () => {
    if (!entityId) {
      toast.error("Save the entity first before generating SEO.");
      return;
    }
    setIsGenerating(true);
    try {
      await generateSeoMutation.mutateAsync({
        entityType,
        entityId,
        entityName,
        entityDescription: entityDescription || "",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const displayTitle = seo.metaTitle || entityName || `${ENTITY_LABELS[entityType]} Profile`;
  const displayDescription = seo.metaDescription || entityDescription || "";
  const displayUrl = entityUrl || `techscoop.com/${entityType}/${entityName.toLowerCase().replace(/\s+/g, "-")}`;

  const titleLength = seo.metaTitle.length;
  const descLength = seo.metaDescription.length;
  const titleStatus = titleLength === 0 ? "empty" : titleLength <= 60 ? "good" : "long";
  const descStatus = descLength === 0 ? "empty" : descLength <= 160 ? "good" : "long";

  if (!entityId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
        <AlertCircle className="h-8 w-8 text-yellow-500" />
        <p className="font-medium">Save the {ENTITY_LABELS[entityType]} first</p>
        <p className="text-sm">SEO settings will be available after the entry is created.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI SEO Assistant */}
      <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-violet-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI SEO Assistant
              </p>
              <p className="text-sm text-violet-700 mt-0.5">
                Generate optimized meta title, description, and keywords for this {ENTITY_LABELS[entityType].toLowerCase()}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleGenerateAI}
              disabled={isGenerating || generateSeoMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {(isGenerating || generateSeoMutation.isPending) ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Generate All</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEO Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-medium">SEO Title</Label>
          <span className={`text-xs font-mono ${titleStatus === "good" ? "text-green-600" : titleStatus === "long" ? "text-red-500" : "text-muted-foreground"}`}>
            {titleLength}/60 characters
            {titleStatus === "good" && titleLength > 0 && <CheckCircle2 className="inline h-3 w-3 ml-1" />}
            {titleStatus === "long" && <AlertCircle className="inline h-3 w-3 ml-1" />}
          </span>
        </div>
        <Input
          placeholder={`e.g. ${entityName} | TechScoop`}
          value={seo.metaTitle}
          onChange={(e) => handleChange("metaTitle", e.target.value)}
          className={titleStatus === "long" ? "border-red-400" : titleStatus === "good" ? "border-green-400" : ""}
        />
        <p className="text-xs text-muted-foreground">Recommended: 50–60 characters. Leave empty to use the entity name.</p>
      </div>

      {/* Meta Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-medium">Meta Description</Label>
          <span className={`text-xs font-mono ${descStatus === "good" ? "text-green-600" : descStatus === "long" ? "text-red-500" : "text-muted-foreground"}`}>
            {descLength}/160 characters
            {descStatus === "good" && descLength > 0 && <CheckCircle2 className="inline h-3 w-3 ml-1" />}
            {descStatus === "long" && <AlertCircle className="inline h-3 w-3 ml-1" />}
          </span>
        </div>
        <Textarea
          placeholder="Brief description for search engines..."
          value={seo.metaDescription}
          onChange={(e) => handleChange("metaDescription", e.target.value)}
          rows={3}
          className={descStatus === "long" ? "border-red-400" : descStatus === "good" ? "border-green-400" : ""}
        />
        <p className="text-xs text-muted-foreground">Recommended: 150–160 characters. Include a call-to-action.</p>
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <Label className="font-medium">Meta Keywords</Label>
        <Input
          placeholder="e.g. MENA startup, fintech, UAE, funding"
          value={seo.metaKeywords}
          onChange={(e) => handleChange("metaKeywords", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Comma-separated keywords. Used for internal tagging and some search engines.</p>
      </div>

      {/* Canonical URL */}
      <div className="space-y-2">
        <Label className="font-medium flex items-center gap-2"><Globe className="h-4 w-4" /> Canonical URL</Label>
        <Input
          placeholder="https://techscoop.com/..."
          value={seo.canonicalUrl}
          onChange={(e) => handleChange("canonicalUrl", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Leave empty to use the default URL. Set only if this content is duplicated elsewhere.</p>
      </div>

      {/* OG Image */}
      <div className="space-y-2">
        <Label className="font-medium flex items-center gap-2"><Image className="h-4 w-4" /> Social Preview Image (OG Image)</Label>
        <Input
          placeholder="https://example.com/image.jpg"
          value={seo.ogImage}
          onChange={(e) => handleChange("ogImage", e.target.value)}
        />
        {seo.ogImage && (
          <img src={seo.ogImage} alt="OG Preview" className="h-24 w-auto rounded border object-cover mt-1" onError={(e) => (e.currentTarget.style.display = "none")} />
        )}
        <p className="text-xs text-muted-foreground">Recommended: 1200×630px. Leave empty to use the entity's main image.</p>
      </div>

      {/* OG Title & Description overrides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-medium">Social Title Override</Label>
          <Input
            placeholder="Uses SEO Title if empty"
            value={seo.ogTitle}
            onChange={(e) => handleChange("ogTitle", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="font-medium">Social Description Override</Label>
          <Input
            placeholder="Uses Meta Description if empty"
            value={seo.ogDescription}
            onChange={(e) => handleChange("ogDescription", e.target.value)}
          />
        </div>
      </div>

      {/* Robots */}
      <div className="space-y-2">
        <Label className="font-medium">Indexing (Robots)</Label>
        <Select
          value={`${seo.noIndex ? "noindex" : "index"},${seo.noFollow ? "nofollow" : "follow"}`}
          onValueChange={(v) => {
            handleChange("noIndex", v.includes("noindex"));
            handleChange("noFollow", v.includes("nofollow"));
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="index,follow">Index, Follow (default)</SelectItem>
            <SelectItem value="noindex,follow">No Index, Follow</SelectItem>
            <SelectItem value="index,nofollow">Index, No Follow</SelectItem>
            <SelectItem value="noindex,nofollow">No Index, No Follow</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Use "No Index" for duplicate or private content.</p>
      </div>

      {/* Search Preview */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setShowPreview((p) => !p)}
        >
          <Eye className="h-4 w-4" />
          Search Preview
          <Badge variant="outline" className="text-xs">{showPreview ? "Hide" : "Show"}</Badge>
        </button>
        {showPreview && (
          <div className="border rounded-md p-4 bg-white space-y-1">
            <div className="flex items-center gap-1 text-xs text-green-700">
              <Search className="h-3 w-3" />
              <span className="font-mono truncate">{displayUrl}</span>
            </div>
            <p className="text-blue-700 text-base font-medium leading-snug hover:underline cursor-pointer truncate">
              {displayTitle}
            </p>
            <p className="text-sm text-[#697386] line-clamp-2">{displayDescription || <span className="italic text-[#9BA3B0]">No description set</span>}</p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isDirty && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
              Unsaved changes
            </Badge>
          )}
          {!isDirty && existingMeta && (
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Saved
            </Badge>
          )}
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending || !isDirty}
          className="bg-[#0066FF] hover:bg-[#0052CC] text-white"
        >
          {updateMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            "Save SEO Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
