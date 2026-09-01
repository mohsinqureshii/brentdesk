/**
 * AI Content Generator
 * The main content generation interface with model selection,
 * entity extraction panel, image search, and preview.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Wand2, Send, FileText, Building2, Users, DollarSign,
  Calendar, Briefcase, Globe, Image, RefreshCw, Check, X, AlertCircle,
  ChevronRight, Eye, Loader2, Zap, Brain, Bot, Copy, Download,
  Search, ArrowRight, Tag, Link2, Clock, BarChart3,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

interface GeneratedContent {
  sessionId: number;
  title: string;
  content: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  articleType: string;
  imageUrl?: string;
  imageAlt?: string;
  entities: ExtractedEntity[];
  suggestedTags: string[];
  suggestedCategory?: string;
  generationTimeMs: number;
  tokenCount: number;
  estimatedCost: string;
  provider: string;
  model: string;
}

interface ExtractedEntity {
  type: string;
  name: string;
  data: Record<string, any>;
  confidence: string;
  matchStatus: string;
  existingId?: number;
  mentionType: string;
}

// ============================================================
// CONTENT TYPE CONFIG
// ============================================================

const CONTENT_TYPES = [
  { value: "article", label: "Article", icon: FileText, description: "News articles, features, analysis" },
  { value: "company", label: "Company", icon: Building2, description: "Company profiles and updates" },
  { value: "person", label: "Person", icon: Users, description: "People profiles and bios" },
  { value: "investor", label: "Investor", icon: DollarSign, description: "Investor profiles" },
  { value: "event", label: "Event", icon: Calendar, description: "Event descriptions" },
  { value: "job", label: "Job", icon: Briefcase, description: "Job listings" },
  { value: "resource", label: "Resource", icon: Globe, description: "Resources and guides" },
  { value: "custom", label: "Custom", icon: Sparkles, description: "Custom content type" },
];

const ARTICLE_TYPES = [
  { value: "news", label: "News" },
  { value: "feature", label: "Feature" },
  { value: "analysis", label: "Analysis" },
  { value: "opinion", label: "Opinion" },
  { value: "interview", label: "Interview" },
  { value: "press_release", label: "Press Release" },
  { value: "report", label: "Report" },
];

const ENHANCE_TYPES = [
  { value: "seo", label: "SEO Optimize", icon: Search },
  { value: "readability", label: "Improve Readability", icon: Eye },
  { value: "expand", label: "Expand Content", icon: ArrowRight },
  { value: "shorten", label: "Condense", icon: Zap },
  { value: "tone", label: "Professional Tone", icon: Brain },
];

// ============================================================
// COMPONENT
// ============================================================

export default function AIContentGenerator() {
  const { toast } = useToast();

  // Form state
  const [contentType, setContentType] = useState("article");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [articleType, setArticleType] = useState("news");
  const [selectedProvider, setSelectedProvider] = useState("builtin");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | undefined>();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();

  // Result state
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [activeTab, setActiveTab] = useState("input");
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");

  // Image search state
  const [imageQuery, setImageQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // Category, Tag, Keyword, SEO state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [focusKeywordId, setFocusKeywordId] = useState<number | null>(null);
  const [seoKeywords, setSeoKeywords] = useState("");
  const [editedExcerpt, setEditedExcerpt] = useState("");
  const [editedSeoTitle, setEditedSeoTitle] = useState("");
  const [editedSeoDescription, setEditedSeoDescription] = useState("");

  // Queries
  const providerSettings = trpc.admin.aiContent.getProviderSettings.useQuery();
  const policies = trpc.admin.aiContent.listPolicies.useQuery();
  const templates = trpc.admin.aiContent.listTemplates.useQuery({ contentType });
  const models = trpc.admin.aiContent.getModels.useQuery();
  // Taxonomy queries
  const categoriesQuery = trpc.admin.taxonomy.categories.list.useQuery({});
  const tagsQuery = trpc.admin.taxonomy.tags.list.useQuery({});
  const keywordsQuery = trpc.admin.taxonomy.keywords.list.useQuery({});
  const createTagMutation = trpc.admin.taxonomy.tags.create.useMutation({
    onSuccess: () => { tagsQuery.refetch(); },
  });
  const createKeywordMutation = trpc.admin.taxonomy.keywords.create.useMutation({
    onSuccess: () => { keywordsQuery.refetch(); },
  });

  // Mutations
  const generateMutation = trpc.admin.aiContent.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data as any);
      setEditedContent(data.content);
      setEditedTitle(data.title);
      setEditedExcerpt((data as any).excerpt || "");
      setEditedSeoTitle((data as any).seoTitle || "");
      setEditedSeoDescription((data as any).seoDescription || "");
      setActiveTab("preview");
      setImageQuery(data.title);
      toast({ title: "Content Generated", description: `Generated in ${((data as any).generationTimeMs / 1000).toFixed(1)}s using ${data.model}` });
    },
    onError: (err) => {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    },
  });

  const rewriteMutation = trpc.admin.aiContent.rewrite.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data as any);
      setEditedContent(data.content);
      setEditedTitle(data.title);
      toast({ title: "Content Rewritten", description: "Content has been rewritten successfully" });
    },
    onError: (err) => {
      toast({ title: "Rewrite Failed", description: err.message, variant: "destructive" });
    },
  });

  const enhanceMutation = trpc.admin.aiContent.enhance.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data as any);
      setEditedContent(data.content);
      setEditedTitle(data.title);
      toast({ title: "Content Enhanced", description: "Content has been enhanced successfully" });
    },
    onError: (err) => {
      toast({ title: "Enhancement Failed", description: err.message, variant: "destructive" });
    },
  });

  const publishMutation = trpc.admin.aiContent.publish.useMutation({
    onSuccess: (data) => {
      toast({ title: "Published!", description: `Content sent to approval workflow` });
    },
    onError: (err) => {
      toast({ title: "Publish Failed", description: err.message, variant: "destructive" });
    },
  });

  const populateEntitiesMutation = trpc.admin.aiContent.populateEntities.useMutation({
    onSuccess: (data) => {
      toast({ title: "Entities Populated", description: `Created/updated entities from extracted data` });
    },
    onError: (err) => {
      toast({ title: "Entity Population Failed", description: err.message, variant: "destructive" });
    },
  });

  // Available models for selected provider
  const availableModels = useMemo(() => {
    if (!models.data) return [];
    return models.data.filter((m: any) => m.provider === selectedProvider);
  }, [models.data, selectedProvider]);

  // Available providers
  const availableProviders = useMemo(() => {
    const providers = [{ value: "builtin", label: "Built-in (Default)" }];
    if (providerSettings.data?.configs) {
      for (const config of providerSettings.data.configs) {
        if (config.isActive) {
          providers.push({ value: config.provider, label: config.provider.charAt(0).toUpperCase() + config.provider.slice(1) });
        }
      }
    }
    return providers;
  }, [providerSettings.data]);

  const isGenerating = generateMutation.isPending || rewriteMutation.isPending || enhanceMutation.isPending;

  // ============================================================
  // HANDLERS
  // ============================================================

  function handleGenerate() {
    if (!title && !url && !rawText) {
      toast({ title: "Input Required", description: "Please provide a title, URL, or text to generate content", variant: "destructive" });
      return;
    }

    generateMutation.mutate({
      contentType: contentType as any,
      title: title || undefined,
      url: url || undefined,
      rawText: rawText || undefined,
      additionalContext: additionalContext || undefined,
      articleType: contentType === "article" ? articleType : undefined,
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
      policyId: selectedPolicyId,
      templateId: selectedTemplateId,
    });
  }

  function handlePublish() {
    if (!generatedContent) return;
    publishMutation.mutate({
      sessionId: generatedContent.sessionId,
      title: editedTitle || generatedContent.title,
      content: editedContent || generatedContent.content,
      excerpt: editedExcerpt || undefined,
      seoTitle: editedSeoTitle || undefined,
      seoDescription: editedSeoDescription || undefined,
      categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      primaryCategoryId: primaryCategoryId || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      seoKeywords: seoKeywords || undefined,
      focusKeywordId: focusKeywordId || undefined,
      createEntities: true,
    });
  }

  function handlePopulateEntities() {
    if (!generatedContent) return;
    populateEntitiesMutation.mutate({
      sessionId: generatedContent.sessionId,
      createNew: true,
      updateExisting: true,
    });
  }

  function handleEnhance(type: string) {
    if (!editedContent) return;
    enhanceMutation.mutate({
      content: editedContent,
      title: editedTitle || generatedContent?.title || "",
      enhanceType: type as any,
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
    });
  }

  function handleCopyContent() {
    navigator.clipboard.writeText(editedContent || generatedContent?.content || "");
    toast({ title: "Copied", description: "Content copied to clipboard" });
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              AI Content Generator
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate articles, profiles, and content with AI-powered entity extraction
            </p>
          </div>
          {generatedContent && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {((generatedContent.generationTimeMs || 0) / 1000).toFixed(1)}s
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3" />
                {generatedContent.tokenCount} tokens
              </Badge>
              <Badge variant="outline" className="gap-1">
                <DollarSign className="h-3 w-3" />
                ${generatedContent.estimatedCost}
              </Badge>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="input" className="gap-1">
              <Wand2 className="h-4 w-4" />
              Input
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedContent} className="gap-1">
              <Eye className="h-4 w-4" />
              Preview & Edit
            </TabsTrigger>
            <TabsTrigger value="entities" disabled={!generatedContent} className="gap-1">
              <Link2 className="h-4 w-4" />
              Entities
            </TabsTrigger>
            <TabsTrigger value="images" disabled={!generatedContent} className="gap-1">
              <Image className="h-4 w-4" />
              Images
            </TabsTrigger>
          </TabsList>

          {/* ============================================================ */}
          {/* INPUT TAB */}
          {/* ============================================================ */}
          <TabsContent value="input" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Input */}
              <div className="lg:col-span-2 space-y-6">
                {/* Content Type Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Content Type</CardTitle>
                    <CardDescription>Select what type of content to generate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {CONTENT_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            onClick={() => setContentType(type.value)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                              contentType === type.value
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                                : "border-border hover:border-purple-300"
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${contentType === type.value ? "text-purple-500" : "text-muted-foreground"}`} />
                            <span className="text-sm font-medium">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Input Fields */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Content Input</CardTitle>
                    <CardDescription>Provide a title, URL, or paste text to generate from</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title / Topic</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Saudi fintech Tamara raises $340M Series C"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="url">Source URL (optional)</Label>
                      <Input
                        id="url"
                        placeholder="https://example.com/article-to-rewrite"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Provide a URL to rewrite or use as reference</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rawText">Source Text (optional)</Label>
                      <Textarea
                        id="rawText"
                        placeholder="Paste press release, news article, or any text to generate from..."
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        rows={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="context">Additional Instructions (optional)</Label>
                      <Textarea
                        id="context"
                        placeholder="Any specific instructions, angles, or details to include..."
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {contentType === "article" && (
                      <div className="space-y-2">
                        <Label>Article Type</Label>
                        <Select value={articleType} onValueChange={setArticleType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ARTICLE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Settings */}
              <div className="space-y-6">
                {/* Model Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      AI Model
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select value={selectedProvider} onValueChange={(v) => { setSelectedProvider(v); setSelectedModel(""); }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProviders.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {availableModels.length > 0 && (
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Select value={selectedModel || "__auto__"} onValueChange={(v) => setSelectedModel(v === "__auto__" ? "" : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Auto-select best" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__auto__">Auto-select</SelectItem>
                            {availableModels.map((m: any) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                                <span className="text-xs text-muted-foreground ml-2">
                                  ${m.inputPricePer1k}/1K in
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Editorial Policy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Editorial Policy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select
                      value={selectedPolicyId?.toString() || "__default__"}
                      onValueChange={(v) => setSelectedPolicyId(v && v !== "__default__" ? Number(v) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Default policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default</SelectItem>
                        {policies.data?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name} {p.isDefault ? "(Default)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Content Template */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Template</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedTemplateId?.toString() || "__none__"}
                      onValueChange={(v) => setSelectedTemplateId(v && v !== "__none__" ? Number(v) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {templates.data?.map((t: any) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || (!title && !url && !rawText)}
                  className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ============================================================ */}
          {/* PREVIEW & EDIT TAB */}
          {/* ============================================================ */}
          <TabsContent value="preview" className="space-y-6">
            {generatedContent && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {/* Title */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="text-lg font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Excerpt</Label>
                          <Textarea
                            defaultValue={generatedContent.excerpt}
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Content Editor */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Content</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={handleCopyContent}>
                            <Copy className="h-4 w-4 mr-1" /> Copy
                          </Button>
                          {ENHANCE_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                              <Button
                                key={type.value}
                                variant="outline"
                                size="sm"
                                onClick={() => handleEnhance(type.value)}
                                disabled={isGenerating}
                                title={type.label}
                              >
                                <Icon className="h-4 w-4" />
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={20}
                        className="font-mono text-sm"
                      />
                    </CardContent>
                  </Card>

                  {/* SEO */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">SEO</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>SEO Title</Label>
                        <Input defaultValue={generatedContent.seoTitle} />
                        <p className="text-xs text-muted-foreground">{generatedContent.seoTitle?.length || 0}/60 characters</p>
                      </div>
                      <div className="space-y-2">
                        <Label>SEO Description</Label>
                        <Textarea defaultValue={generatedContent.seoDescription} rows={2} />
                        <p className="text-xs text-muted-foreground">{generatedContent.seoDescription?.length || 0}/160 characters</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        onClick={handlePublish}
                        disabled={publishMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {publishMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send to Approval
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handlePopulateEntities}
                        disabled={populateEntitiesMutation.isPending}
                        className="w-full"
                      >
                        {populateEntitiesMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Link2 className="h-4 w-4 mr-2" />
                        )}
                        Populate Entities
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveTab("input");
                          setGeneratedContent(null);
                        }}
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Start New
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Generation Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Generation Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider</span>
                        <span className="font-medium">{generatedContent.provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-medium">{generatedContent.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tokens</span>
                        <span className="font-medium">{generatedContent.tokenCount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost</span>
                        <span className="font-medium">${generatedContent.estimatedCost}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">{((generatedContent.generationTimeMs || 0) / 1000).toFixed(1)}s</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Article Type</span>
                        <Badge variant="secondary">{generatedContent.articleType}</Badge>
                      </div>
                      {generatedContent.suggestedCategory && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category</span>
                          <Badge variant="outline">{generatedContent.suggestedCategory}</Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ---- Categories ---- */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Categories</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {categoriesQuery.data && (categoriesQuery.data as any[]).length > 0 ? (
                        <ScrollArea className="h-40">
                          <div className="space-y-1">
                            {(categoriesQuery.data as any[]).map((cat: any) => (
                              <label key={cat.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent cursor-pointer text-sm">
                                <Checkbox
                                  checked={selectedCategoryIds.includes(cat.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedCategoryIds(prev => [...prev, cat.id]);
                                      if (!primaryCategoryId) setPrimaryCategoryId(cat.id);
                                    } else {
                                      setSelectedCategoryIds(prev => prev.filter(id => id !== cat.id));
                                      if (primaryCategoryId === cat.id) setPrimaryCategoryId(selectedCategoryIds.filter(id => id !== cat.id)[0] || null);
                                    }
                                  }}
                                />
                                <span className="flex-1">{cat.name}</span>
                                {primaryCategoryId === cat.id && <Badge variant="outline" className="text-xs">Primary</Badge>}
                              </label>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground">No categories available</p>
                      )}
                      {selectedCategoryIds.length > 1 && (
                        <div className="pt-2 border-t">
                          <Label className="text-xs text-muted-foreground">Primary Category</Label>
                          <Select value={String(primaryCategoryId || "")} onValueChange={(v) => setPrimaryCategoryId(Number(v))}>
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Select primary" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedCategoryIds.map(id => {
                                const cat = (categoriesQuery.data as any[])?.find((c: any) => c.id === id);
                                return cat ? <SelectItem key={id} value={String(id)}>{cat.name}</SelectItem> : null;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* ---- Tags ---- */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Selected tags */}
                      {selectedTagNames.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedTagNames.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              {tag}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => {
                                setSelectedTagNames(prev => prev.filter((_, idx) => idx !== i));
                                setSelectedTagIds(prev => prev.filter((_, idx) => idx !== i));
                              }} />
                            </Badge>
                          ))}
                        </div>
                      )}
                      {/* Suggested tags from AI */}
                      {generatedContent.suggestedTags && generatedContent.suggestedTags.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">AI Suggested (click to add)</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedContent.suggestedTags.filter(t => !selectedTagNames.includes(t)).map((tag, i) => (
                              <Badge key={i} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => {
                                const existingTag = (tagsQuery.data as any[])?.find((t: any) => t.name.toLowerCase() === tag.toLowerCase());
                                if (existingTag) {
                                  if (!selectedTagIds.includes(existingTag.id)) {
                                    setSelectedTagIds(prev => [...prev, existingTag.id]);
                                    setSelectedTagNames(prev => [...prev, existingTag.name]);
                                  }
                                } else {
                                  setSelectedTagNames(prev => [...prev, tag]);
                                  setSelectedTagIds(prev => [...prev, -1]); // placeholder
                                }
                              }}>{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Tag search */}
                      <div className="flex gap-1">
                        <Input
                          placeholder="Search or add tag..."
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          className="h-8 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && tagSearch.trim()) {
                              e.preventDefault();
                              const existingTag = (tagsQuery.data as any[])?.find((t: any) => t.name.toLowerCase() === tagSearch.toLowerCase());
                              if (existingTag && !selectedTagIds.includes(existingTag.id)) {
                                setSelectedTagIds(prev => [...prev, existingTag.id]);
                                setSelectedTagNames(prev => [...prev, existingTag.name]);
                              } else if (!existingTag) {
                                setSelectedTagNames(prev => [...prev, tagSearch.trim()]);
                                setSelectedTagIds(prev => [...prev, -1]);
                              }
                              setTagSearch("");
                            }
                          }}
                        />
                      </div>
                      {tagSearch && (tagsQuery.data as any[])?.filter((t: any) => t.name.toLowerCase().includes(tagSearch.toLowerCase())).slice(0, 5).map((t: any) => (
                        <div key={t.id} className="text-xs px-2 py-1 hover:bg-accent rounded cursor-pointer" onClick={() => {
                          if (!selectedTagIds.includes(t.id)) {
                            setSelectedTagIds(prev => [...prev, t.id]);
                            setSelectedTagNames(prev => [...prev, t.name]);
                          }
                          setTagSearch("");
                        }}>{t.name}</div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* ---- SEO & Keywords ---- */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        SEO & Keywords
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs">SEO Title</Label>
                        <Input
                          value={editedSeoTitle}
                          onChange={(e) => setEditedSeoTitle(e.target.value)}
                          placeholder="SEO title..."
                          className="h-8 text-xs mt-1"
                        />
                        <span className="text-xs text-muted-foreground">{editedSeoTitle.length}/60 characters</span>
                      </div>
                      <div>
                        <Label className="text-xs">SEO Description</Label>
                        <Textarea
                          value={editedSeoDescription}
                          onChange={(e) => setEditedSeoDescription(e.target.value)}
                          placeholder="SEO description..."
                          className="text-xs mt-1 min-h-[60px]"
                        />
                        <span className="text-xs text-muted-foreground">{editedSeoDescription.length}/160 characters</span>
                      </div>
                      <div>
                        <Label className="text-xs">Excerpt</Label>
                        <Textarea
                          value={editedExcerpt}
                          onChange={(e) => setEditedExcerpt(e.target.value)}
                          placeholder="Article excerpt..."
                          className="text-xs mt-1 min-h-[60px]"
                        />
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-xs">Focus Keyword</Label>
                        <Select value={String(focusKeywordId || "")} onValueChange={(v) => setFocusKeywordId(v ? Number(v) : null)}>
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue placeholder="Select focus keyword" />
                          </SelectTrigger>
                          <SelectContent>
                            {(keywordsQuery.data as any[])?.map((kw: any) => (
                              <SelectItem key={kw.id} value={String(kw.id)}>{kw.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">SEO Keywords (comma-separated)</Label>
                        <Input
                          value={seoKeywords}
                          onChange={(e) => setSeoKeywords(e.target.value)}
                          placeholder="keyword1, keyword2, keyword3"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>

                </div>
              </div>
            )}
          </TabsContent>

          {/* ============================================================ */}
          {/* ENTITIES TAB */}
          {/* ============================================================ */}
          <TabsContent value="entities" className="space-y-6">
            {generatedContent && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Extracted Entities</h2>
                    <p className="text-sm text-muted-foreground">
                      {generatedContent.entities?.length || 0} entities extracted from generated content
                    </p>
                  </div>
                  <Button
                    onClick={handlePopulateEntities}
                    disabled={populateEntitiesMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {populateEntitiesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Create/Update All Entities
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedContent.entities?.map((entity, index) => (
                    <EntityCard key={index} entity={entity} />
                  ))}
                </div>

                {(!generatedContent.entities || generatedContent.entities.length === 0) && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No entities were extracted from this content</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ============================================================ */}
          {/* IMAGES TAB */}
          {/* ============================================================ */}
          <TabsContent value="images" className="space-y-6">
            <ImageSearchPanel
              initialQuery={generatedContent?.title || ""}
              onImageSelect={(url) => setSelectedImage(url)}
              selectedImage={selectedImage}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ============================================================
// ENTITY CARD COMPONENT
// ============================================================

function EntityCard({ entity }: { entity: ExtractedEntity }) {
  const typeIcons: Record<string, any> = {
    company: Building2,
    person: Users,
    investor: DollarSign,
    funding_round: DollarSign,
    accelerator: Briefcase,
    event: Calendar,
    tag: Tag,
  };

  const Icon = typeIcons[entity.type] || Globe;

  const confidenceColors: Record<string, string> = {
    high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const matchColors: Record<string, string> = {
    existing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    new: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    possible_match: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">{entity.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{entity.type.replace("_", " ")}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Badge className={confidenceColors[entity.confidence] || ""} variant="secondary">
              {entity.confidence}
            </Badge>
            <Badge className={matchColors[entity.matchStatus] || ""} variant="secondary">
              {entity.matchStatus === "possible_match" ? "possible" : entity.matchStatus}
            </Badge>
          </div>
        </div>

        {/* Entity Data Preview */}
        {entity.data && Object.keys(entity.data).length > 0 && (
          <div className="mt-3 space-y-1">
            {Object.entries(entity.data).slice(0, 5).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                <span className="font-medium truncate max-w-[200px]">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
            {Object.keys(entity.data).length > 5 && (
              <p className="text-xs text-muted-foreground">+{Object.keys(entity.data).length - 5} more fields</p>
            )}
          </div>
        )}

        {entity.existingId && (
          <div className="mt-2 text-xs text-muted-foreground">
            Matched to existing ID: #{entity.existingId}
          </div>
        )}

        <Badge variant="outline" className="mt-2 text-xs">
          {entity.mentionType}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ============================================================
// IMAGE SEARCH PANEL
// ============================================================

function ImageSearchPanel({
  initialQuery,
  onImageSelect,
  selectedImage,
}: {
  initialQuery: string;
  onImageSelect: (url: string) => void;
  selectedImage: string | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const searchResults = trpc.admin.aiContent.searchImages.useQuery(
    { query, count: 12, page },
    { enabled: query.length > 2, placeholderData: (prev: any) => prev }
  );

  const storeMutation = trpc.admin.aiContent.storeImage.useMutation({
    onSuccess: (data) => {
      toast({ title: "Image Saved", description: "Image downloaded and stored successfully" });
    },
    onError: (err) => {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="h-5 w-5 text-purple-500" />
            Image Search
          </CardTitle>
          <CardDescription>Find the perfect featured image for your content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for images..."
              className="flex-1"
            />
            <Button variant="outline" onClick={() => { setPage(1); searchResults.refetch(); }}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {searchResults.isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      )}

      {searchResults.data && searchResults.data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {searchResults.data.map((img: any, i: number) => (
            <Card
              key={i}
              className={`cursor-pointer transition-all overflow-hidden ${
                selectedImage === img.url ? "ring-2 ring-purple-500" : "hover:ring-1 hover:ring-purple-300"
              }`}
              onClick={() => onImageSelect(img.url)}
            >
              <div className="aspect-video bg-muted relative">
                <img
                  src={img.thumbnailUrl || img.url}
                  alt={img.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {selectedImage === img.url && (
                  <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                    <Check className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
              <CardContent className="p-2">
                <p className="text-xs truncate">{img.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground truncate">{img.source}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {searchResults.data && searchResults.data.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || searchResults.isFetching}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={searchResults.isFetching || (searchResults.data?.length || 0) < 12}
            >
              Next Page
            </Button>
          </div>
        </div>
      )}

      {searchResults.data && searchResults.data.length === 0 && page === 1 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No images found. Try a different search query.</p>
          </CardContent>
        </Card>
      )}

      {searchResults.data && searchResults.data.length === 0 && page > 1 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No more images. You've reached the last page.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setPage(1)}>Back to first page</Button>
          </CardContent>
        </Card>
      )}

      {selectedImage && (
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={selectedImage} alt="Selected" className="h-16 w-24 object-cover rounded" />
              <div>
                <p className="font-medium">Selected Image</p>
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{selectedImage}</p>
              </div>
            </div>
            <Button
              onClick={() => storeMutation.mutate({ imageUrl: selectedImage, articleSlug: "temp", title: query })}
              disabled={storeMutation.isPending}
            >
              {storeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Save to Media
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
