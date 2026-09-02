/**
 * Article Editor Page
 * Rich text editor with TipTap, SEO, taxonomies, and workflow management
 * Connected to live tRPC API
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { publication } from "@shared/publication";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticleTranslations } from "@/components/admin/ArticleTranslations";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Save,
  Send,
  Eye,
  Clock,
  Globe,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  Link2,
  FileText,
  SearchCheck,
  Network,
  MapPin,
  DollarSign,
  Sparkles,
  User,
  ImageIcon,
  Upload,
  Check,
  RefreshCw,
  Languages as LanguagesIcon,
} from "lucide-react";
import { MediaPicker, MediaMetadata } from "@/components/MediaPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { EntityLinkingTab } from "@/components/admin/EntityLinkingTab";
import { LocationTab } from "@/components/admin/LocationTab";
import { FundingTab } from "@/components/admin/FundingTab";
import { AIComposeDialog, type ComposedArticle } from "@/components/admin/AIComposeDialog";

interface ArticleData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: string;
  featuredImageId: number | null;
  categoryIds: number[];
  primaryCategoryId: number | null;
  tags: string[];
  tagIds: number[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  canonicalUrl: string;
  focusKeywordId: number | null;
  isFeatured: boolean;
  featuredDurationHours: number | null;
  isEditorPick: boolean;
  isFlash: boolean;
  flashDurationHours: number | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  // Google News SEO fields
  robotsIndexing: "index" | "noindex";
  ogImageId: number | null;
  ogTitle: string;
  ogDescription: string;
  articleType: "news" | "opinion" | "press_release" | "report" | "interview";
  googleNewsKeywords: string;
  // Author
  authorId: number | null;
  // Coverage country — drives the country edition surfacing on
  // public listings. Set in the right sidebar so authors see it
  // alongside the other publish settings, not buried in a tab.
  coverageCountryId: number | null;
}

/**
 * Coverage Country Picker
 * ----------------------------------------------------------------------
 * Single-select country chooser surfaced in the article editor's
 * Publish Settings sidebar (right side). The selected country drives
 * the public-site edition ordering — Saudi visitors see Saudi
 * articles first, etc.
 *
 * Search + dropdown UI rather than a flat <select> so the operator
 * can type "saud" and land on Saudi Arabia in two keystrokes —
 * matters for the ~10 launch editions but even more for the long
 * tail (~250 countries in the table).
 *
 * Empty value (null) means "global / multi-country story" and the
 * article won't be edition-biased on any listing.
 */
function CoverageCountryPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  // Reuses the existing public countries list (already populated by
  // jobs.listCountries). Cached aggressively — country table changes
  // never.
  const { data: countries } = trpc.jobs.listCountries.useQuery(undefined, {
    staleTime: 60 * 60 * 1000,
  });

  const list = (countries || []) as Array<{ id: number; name: string; iso2: string }>;
  const selected = value ? list.find((c) => c.id === value) : null;

  const flagFromIso2 = (iso2: string) => {
    if (!iso2 || iso2.length !== 2) return "🏳️";
    return String.fromCodePoint(
      ...iso2.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
    );
  };

  // Filter against name or iso2. Always show the currently-selected
  // row at the top when searching so it's clear what's set.
  const filtered = !search.trim()
    ? list.slice(0, 30)
    : list
        .filter((c) => {
          const q = search.toLowerCase();
          return c.name.toLowerCase().includes(q) || c.iso2.toLowerCase().includes(q);
        })
        .slice(0, 30);

  return (
    <div className="space-y-2">
      {selected ? (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-background">
          <span className="text-xl leading-none">{flagFromIso2(selected.iso2)}</span>
          <span className="text-sm font-medium flex-1">{selected.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{selected.iso2}</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left p-2 rounded-md border bg-background hover:bg-muted/40 text-sm text-muted-foreground"
        >
          + Pick a country…
        </button>
      )}

      {open && (
        <div className="rounded-md border bg-background shadow-sm p-2 space-y-2">
          <Input
            autoFocus
            placeholder="Search country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No matches</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-muted/60 ${
                    c.id === value ? "bg-blue-50" : ""
                  }`}
                >
                  <span className="text-base leading-none">{flagFromIso2(c.iso2)}</span>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{c.iso2}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Re-index Button Component
 * Triggers manual search engine indexing for a published article
 */
function ReindexButton({ articleId }: { articleId: number }) {
  const [isReindexing, setIsReindexing] = useState(false);
  const triggerReindex = trpc.admin.indexing.triggerManual.useMutation({
    onSuccess: (data) => {
      const successCount = data.results.filter((r: any) => r.success).length;
      const totalCount = data.results.length;
      if (successCount === totalCount) {
        toast.success(`Re-index successful`, {
          description: `All ${totalCount} search engine notifications sent successfully.`,
        });
      } else if (successCount > 0) {
        toast.warning(`Partial re-index`, {
          description: `${successCount}/${totalCount} notifications sent. Some methods may have failed.`,
        });
      } else {
        toast.error(`Re-index failed`, {
          description: `All ${totalCount} notification methods failed. Check the indexing logs.`,
        });
      }
      setIsReindexing(false);
    },
    onError: (error) => {
      toast.error(`Re-index failed`, {
        description: error.message || "Failed to trigger search engine re-indexing.",
      });
      setIsReindexing(false);
    },
  });

  const handleReindex = () => {
    setIsReindexing(true);
    triggerReindex.mutate({ articleId });
  };

  return (
    <Button
      variant="outline"
      onClick={handleReindex}
      disabled={isReindexing || articleId <= 0}
      title="Notify search engines to re-crawl this article"
      className="border-blue-200 text-blue-700 hover:bg-blue-50"
    >
      {isReindexing ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      Re-index
    </Button>
  );
}

export default function ArticleEditor() {
  const params = useParams();
  const [, navigate] = useLocation();
  const isNew = !params.id || params.id === "new";
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [article, setArticle] = useState<ArticleData>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    status: "draft",
    featuredImageId: null,
    categoryIds: [],
    primaryCategoryId: null,
    tags: [],
    tagIds: [],
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    canonicalUrl: "",
    focusKeywordId: null,
    isFeatured: false,
    featuredDurationHours: null,
    isEditorPick: false,
    isFlash: false,
    flashDurationHours: null,
    publishedAt: null,
    scheduledAt: null,
    // Google News SEO fields
    robotsIndexing: "index",
    ogImageId: null,
    ogTitle: "",
    ogDescription: "",
    articleType: "news",
    googleNewsKeywords: "",
    // Author
    authorId: null,
    // Coverage country
    coverageCountryId: null,
  });

  const [activeTab, setActiveTab] = useState("content");
  const [newTag, setNewTag] = useState("");
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [aiTagSuggestions, setAiTagSuggestions] = useState<{ name: string; tagType: string; confidence: string; existingId?: number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [featuredImageMeta, setFeaturedImageMeta] = useState<MediaMetadata | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [primaryCategorySearch, setPrimaryCategorySearch] = useState("");
  const [focusKeywordSearch, setFocusKeywordSearch] = useState("");
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKeywordName, setNewKeywordName] = useState("");
  const [showSlugConfirm, setShowSlugConfirm] = useState(false);
  const [pendingTitle, setPendingTitle] = useState("");
  const [originalSlug, setOriginalSlug] = useState("");
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<{ focus: string[]; additional: string[] } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialArticleRef = useRef<string>("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveRef = useRef<Date | null>(null);

  // Fetch categories
  const { data: categories } = trpc.admin.taxonomy.categories.list.useQuery({});

  // Fetch authors list (for admin author selection)
  const { data: authorsList } = trpc.admin.users.listAuthors.useQuery(undefined, {
    enabled: isAdmin,
  });

  // Fetch keywords for SEO focus keyword
  const { data: keywordsList, refetch: refetchKeywords } = trpc.admin.taxonomy.keywords.list.useQuery({});

  // Create keyword mutation
  const createKeywordMutation = trpc.admin.taxonomy.keywords.create.useMutation({
    onSuccess: (data) => {
      toast.success("Keyword created!");
      setArticle((prev) => ({ ...prev, focusKeywordId: data?.id || null }));
      setShowAddKeyword(false);
      setNewKeywordName("");
      refetchKeywords();
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to create keyword: ${error.message}`);
    },
  });

  // AI SEO suggestion mutations
  const generateSeoMutation = trpc.news.generateSeoSuggestions.useMutation();
  const suggestTitleMutation = trpc.news.suggestSeoTitle.useMutation();
  const suggestDescriptionMutation = trpc.news.suggestMetaDescription.useMutation();

  // Phase 2B inline AI in editor:
  // - new mutations return MULTIPLE alternatives so the writer picks
  // - live score is a debounced query that re-runs as the article body
  //   changes; pure heuristic on the server (no LLM cost), so React Query
  //   caches it for free.
  const aiTitleMut = trpc.admin.aiContent.suggestMetaTitle.useMutation();
  const aiDescMut = trpc.admin.aiContent.suggestMetaDescription.useMutation();
  const [titleAlternatives, setTitleAlternatives] = useState<Array<{ title: string; reasoning: string }>>([]);
  const [descAlternatives, setDescAlternatives] = useState<Array<{ description: string; reasoning: string }>>([]);
  const [titlePopoverOpen, setTitlePopoverOpen] = useState(false);
  const [descPopoverOpen, setDescPopoverOpen] = useState(false);
  const [aiComposeOpen, setAiComposeOpen] = useState(false);

  /**
   * Apply an AI-composed draft into the editor state.
   *
   * The compose endpoint returns names for categories / tags / focus
   * keyword. We resolve them to existing IDs by case-insensitive match
   * on slug or name; anything that doesn't match an existing taxonomy
   * record is dropped silently so we don't create garbage entries.
   * (Tags are also added as plain strings so the writer can see them
   * even if the match failed — they can re-link via the Tags UI.)
   */
  const handleAIComposeApply = (r: ComposedArticle) => {
    const normalize = (s: string) => s.trim().toLowerCase();

    // Resolve primary + secondary categories by slug or name match
    const matchedCategoryIds: number[] = [];
    const allCategoryNames = [r.primaryCategory, ...r.secondaryCategories].filter(Boolean);
    if (Array.isArray(categories)) {
      for (const name of allCategoryNames) {
        const want = normalize(name);
        const cat = (categories as any[]).find(
          (c) => normalize(c.slug || "") === want || normalize(c.name || "") === want,
        );
        if (cat?.id && !matchedCategoryIds.includes(cat.id)) matchedCategoryIds.push(cat.id);
      }
    }

    // Resolve focus keyword by name match (no auto-create here — keeps
    // the keyword taxonomy clean; writer can use the "+" UI to add new ones)
    let focusKeywordId: number | null = null;
    if (r.focusKeyword && Array.isArray(keywordsList)) {
      const want = normalize(r.focusKeyword);
      const kw = (keywordsList as any[]).find((k) => normalize(k.name || "") === want);
      if (kw?.id) focusKeywordId = kw.id;
    }

    // Resolve tags by name match (existing tags get IDs; novel tags
    // become plain string tags so the writer sees them)
    const tagNames: string[] = [];
    const tagIds: number[] = [];
    const existingTags = Array.isArray(allTagsData) ? (allTagsData as any[]) : [];
    for (const name of r.suggestedTags) {
      const want = normalize(name);
      const t = existingTags.find((x) => normalize(x.name || "") === want);
      if (t?.id) {
        tagNames.push(t.name);
        tagIds.push(t.id);
      } else {
        tagNames.push(name);
      }
    }

    setArticle((prev) => ({
      ...prev,
      title: r.title || prev.title,
      slug: r.slug || prev.slug,
      excerpt: r.excerpt || prev.excerpt,
      content: r.bodyHtml || prev.content,
      seoTitle: r.seoTitle || prev.seoTitle,
      seoDescription: r.metaDescription || prev.seoDescription,
      categoryIds: matchedCategoryIds.length > 0 ? matchedCategoryIds : prev.categoryIds,
      primaryCategoryId: matchedCategoryIds[0] ?? prev.primaryCategoryId,
      tags: tagNames.length > 0 ? tagNames : prev.tags,
      tagIds: tagIds.length > 0 ? tagIds : prev.tagIds,
      focusKeywordId: focusKeywordId ?? prev.focusKeywordId,
      // Note: Location, Funding, and Entity fields are managed by their own tabs/components
    }));
    setHasUnsavedChanges(true);
  };

  // Live score query — debounce inputs so we don't spam the server on every keystroke
  const debouncedTitle = useDebounce(article.title, 600);
  const debouncedSeoTitle = useDebounce(article.seoTitle, 600);
  const debouncedSeoDesc = useDebounce(article.seoDescription, 600);
  const debouncedContent = useDebounce(article.content, 1200);
  const focusKeywordName = keywordsList?.find((k: any) => k.id === article.focusKeywordId)?.name as string | undefined;

  const seoScore = trpc.admin.aiContent.scoreArticleSeo.useQuery(
    {
      title: debouncedTitle || "",
      seoTitle: debouncedSeoTitle || undefined,
      seoDescription: debouncedSeoDesc || undefined,
      content: debouncedContent || undefined,
      focusKeyword: focusKeywordName,
      hasFeaturedImage: !!article.featuredImageId,
      hasAuthor: !!article.authorId,
    },
    {
      enabled: !!debouncedTitle,
      staleTime: 5_000,
    }
  );
  const suggestKeywordsMutation = trpc.news.suggestKeywords.useMutation();
  const generateAiSeoMutation = trpc.news.generateAiSeo.useMutation();
  const suggestTagsMutation = trpc.admin.entityLinking.suggestTags.useMutation();

  // Fetch primary keywords from database
  const { data: primaryKeywordsData } = trpc.news.getPrimaryKeywords.useQuery({ limit: 300 });
  const { data: secondaryKeywordsData } = trpc.news.getSecondaryKeywords.useQuery({ limit: 500 });
  const { data: allTagsData } = trpc.news.getAllTags.useQuery();

  // AI SEO suggestions state
  const [aiSeoSuggestions, setAiSeoSuggestions] = useState<{
    focusKeyword: { id: number; name: string } | null;
    additionalKeywords: { id: number; name: string }[];
    googleNewsKeywords: string[];
    tags: { id: number; name: string; tagType: string }[];
  } | null>(null);

  // AI suggestion handlers
  const handleGenerateAllSeo = async () => {
    if (!article.title || !article.content) {
      toast.error("Please add a title and content first");
      return;
    }
    setIsGeneratingSeo(true);
    try {
      // Get primary category name for context
      const primaryCat = article.primaryCategoryId && categories 
        ? (categories as any[])?.find((c: { id: number }) => c.id === article.primaryCategoryId)
        : null;
      
      const suggestions = await generateAiSeoMutation.mutateAsync({
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        categoryName: primaryCat?.name,
      });
      
      // Update article with AI suggestions
      setArticle((prev) => ({
        ...prev,
        seoTitle: suggestions.seoTitle,
        seoDescription: suggestions.metaDescription,
        seoKeywords: suggestions.additionalKeywords.map((k: { name: string }) => k.name).slice(0, 5).join(", "),
        googleNewsKeywords: suggestions.googleNewsKeywords.slice(0, 10).join(", "),
        focusKeywordId: suggestions.focusKeyword?.id || null,
      }));
      
      // Store AI suggestions for display
      setAiSeoSuggestions({
        focusKeyword: suggestions.focusKeyword,
        additionalKeywords: suggestions.additionalKeywords,
        googleNewsKeywords: suggestions.googleNewsKeywords,
        tags: suggestions.tags,
      });
      
      // Also update legacy suggested keywords for backward compatibility
      setSuggestedKeywords({ 
        focus: suggestions.focusKeyword ? [suggestions.focusKeyword.name] : [], 
        additional: suggestions.additionalKeywords.map((k: { name: string }) => k.name) 
      });
      
      toast.success("AI SEO suggestions generated from database!");
    } catch (error) {
      // Fallback to legacy generation
      try {
        const suggestions = await generateSeoMutation.mutateAsync({
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
        });
        setArticle((prev) => ({
          ...prev,
          seoTitle: suggestions.seoTitle,
          seoDescription: suggestions.metaDescription,
          seoKeywords: suggestions.additionalKeywords.join(", "),
        }));
        setSuggestedKeywords({ focus: suggestions.focusKeywords, additional: suggestions.additionalKeywords });
        toast.success("SEO suggestions generated!");
      } catch {
        toast.error("Failed to generate SEO suggestions");
      }
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  // Phase 2B: ask the LLM for 3 alternatives and open a popover so the
  // writer reviews + picks one. Falls back to the older single-result
  // mutation if the new endpoint fails for any reason.
  const handleSuggestTitle = async () => {
    if (!article.title || !article.content) {
      toast.error("Please add a title and content first");
      return;
    }
    setIsGeneratingTitle(true);
    try {
      const result = await aiTitleMut.mutateAsync({
        title: article.title,
        content: article.content,
        focusKeyword: focusKeywordName,
      });
      if (result.suggestions && result.suggestions.length > 0) {
        setTitleAlternatives(result.suggestions);
        setTitlePopoverOpen(true);
      } else {
        // graceful degradation — old endpoint
        const fb = await suggestTitleMutation.mutateAsync({ title: article.title, content: article.content });
        setArticle((prev) => ({ ...prev, seoTitle: fb.seoTitle }));
        toast.success("SEO title suggested!");
      }
    } catch (error) {
      toast.error("Failed to suggest SEO title");
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleSuggestDescription = async () => {
    if (!article.title || !article.content) {
      toast.error("Please add a title and content first");
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const result = await aiDescMut.mutateAsync({
        title: article.title,
        content: article.content,
        focusKeyword: focusKeywordName,
      });
      if (result.suggestions && result.suggestions.length > 0) {
        setDescAlternatives(result.suggestions);
        setDescPopoverOpen(true);
      } else {
        const fb = await suggestDescriptionMutation.mutateAsync({
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
        });
        setArticle((prev) => ({ ...prev, seoDescription: fb.metaDescription }));
        toast.success("Meta description suggested!");
      }
    } catch (error) {
      toast.error("Failed to suggest meta description");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleSuggestKeywords = async () => {
    if (!article.title || !article.content) {
      toast.error("Please add a title and content first");
      return;
    }
    setIsGeneratingKeywords(true);
    try {
      const result = await suggestKeywordsMutation.mutateAsync({
        title: article.title,
        content: article.content,
      });
      setSuggestedKeywords(result);
      setArticle((prev) => ({ ...prev, seoKeywords: result.additional.join(", ") }));
      toast.success("Keywords suggested!");
    } catch (error) {
      toast.error("Failed to suggest keywords");
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  // Fetch article if editing
  const { data: existingArticle, isLoading: isLoadingArticle } = trpc.news.adminGet.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: !isNew && !!params.id }
  );

  // Create mutation
  const createMutation = trpc.news.create.useMutation({
    onSuccess: (data: { id: number }) => {
      toast.success("Article created successfully!");
      navigate(`/admin/articles/${data.id}`);
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to create article: ${error.message}`);
    },
  });

  // Editorial feedback mutation (for AI-generated articles)
  const submitFeedbackMutation = trpc.admin.aiContent.submitEditorialFeedback.useMutation();

  // Update mutation
  const updateMutation = trpc.news.update.useMutation({
    onSuccess: () => {
      toast.success("Article saved successfully!");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to save article: ${error.message}`);
    },
  });

  // Upload media mutation
  const uploadMedia = trpc.admin.media.upload.useMutation();

  // Load existing article data
  useEffect(() => {
    if (existingArticle) {
      const loadedArticle = {
        title: existingArticle.title || "",
        slug: existingArticle.slug || "",
        excerpt: existingArticle.excerpt || "",
        content: existingArticle.content || "",
        status: (existingArticle as any).status || "draft",
        featuredImageId: existingArticle.featuredImageId || null,
        categoryIds: existingArticle.categoryIds || [],
        primaryCategoryId: (existingArticle as any).primaryCategoryId || existingArticle.categoryIds?.[0] || null,
        tags: (existingArticle as any).tagNames || [],
        tagIds: (existingArticle as any).tagIds || [],
        seoTitle: (existingArticle as any).seoTitle || "",
        seoDescription: (existingArticle as any).seoDescription || "",
        seoKeywords: (existingArticle as any).seoKeywords || "",
        canonicalUrl: (existingArticle as any).canonicalUrl || "",
        focusKeywordId: (existingArticle as any).focusKeywordId || null,
        isFeatured: Boolean(existingArticle.isFeatured),
        featuredDurationHours: (existingArticle as any).featuredDurationHours || null,
        isEditorPick: Boolean((existingArticle as any).isEditorPick),
        isFlash: Boolean((existingArticle as any).isFlash),
        flashDurationHours: (existingArticle as any).flashDurationHours || null,
        publishedAt: existingArticle.publishedAt?.toString() || null,
        scheduledAt: existingArticle.scheduledAt?.toString() || null,
        // Google News SEO fields
        robotsIndexing: (existingArticle as any).robotsIndexing || "index",
        ogImageId: (existingArticle as any).ogImageId || null,
        ogTitle: (existingArticle as any).ogTitle || "",
        ogDescription: (existingArticle as any).ogDescription || "",
        articleType: (existingArticle as any).articleType || "news",
        googleNewsKeywords: (existingArticle as any).googleNewsKeywords || "",
        // Author
        authorId: existingArticle.authorId || null,
        // Coverage country (drives edition surfacing)
        coverageCountryId: (existingArticle as any).coverageCountryId ?? null,
      };
      setArticle(loadedArticle);
      // Store initial state for change detection
      initialArticleRef.current = JSON.stringify(loadedArticle);
      setHasUnsavedChanges(false);
      // Load featured image URL from existing article
      if ((existingArticle as any).featuredImageUrl) {
        setFeaturedImageUrl((existingArticle as any).featuredImageUrl);
      }
    }
  }, [existingArticle]);

  // Track unsaved changes
  useEffect(() => {
    if (initialArticleRef.current) {
      const currentState = JSON.stringify(article);
      setHasUnsavedChanges(currentState !== initialArticleRef.current);
    } else if (isNew && article.title) {
      // For new articles, mark as unsaved once they start typing
      setHasUnsavedChanges(true);
    }
  }, [article, isNew]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Auto-save every 60 seconds
  useEffect(() => {
    // Only auto-save for existing articles with unsaved changes
    if (isNew || !hasUnsavedChanges || !params.id) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for 60 seconds
    autoSaveTimerRef.current = setTimeout(async () => {
      if (!article.title.trim()) return; // Don't auto-save without title
      
      setAutoSaveStatus("saving");
      try {
        await updateMutation.mutateAsync({
          id: parseInt(params.id!),
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt || undefined,
          content: article.content,
          featuredImageId: article.featuredImageId || undefined,
          categoryIds: article.categoryIds.length > 0 ? article.categoryIds : undefined,
          primaryCategoryId: article.primaryCategoryId || undefined,
          tagIds: article.tagIds.length > 0 ? article.tagIds : undefined,
          isFeatured: article.isFeatured,
          featuredDurationHours: article.isFeatured && article.featuredDurationHours ? article.featuredDurationHours : undefined,
          isEditorPick: article.isEditorPick,
          isFlash: article.isFlash,
          flashDurationHours: article.isFlash && article.flashDurationHours ? article.flashDurationHours : undefined,
          seoTitle: article.seoTitle || undefined,
          seoDescription: article.seoDescription || undefined,
          seoKeywords: article.seoKeywords || undefined,
          canonicalUrl: article.canonicalUrl || undefined,
          focusKeywordId: article.focusKeywordId || undefined,
          robotsIndexing: article.robotsIndexing,
          ogImageId: article.ogImageId || article.featuredImageId || undefined,
          ogTitle: article.ogTitle || undefined,
          ogDescription: article.ogDescription || undefined,
          articleType: article.articleType,
          googleNewsKeywords: article.googleNewsKeywords || undefined,
          // Coverage country drives edition surfacing on listings
          coverageCountryId: article.coverageCountryId ?? undefined,
          // Author (admin only)
          authorId: article.authorId || undefined,
        });
        setAutoSaveStatus("saved");
        lastAutoSaveRef.current = new Date();
        initialArticleRef.current = JSON.stringify(article);
        setHasUnsavedChanges(false);
        // Reset to idle after 3 seconds
        setTimeout(() => setAutoSaveStatus("idle"), 3000);
      } catch (error) {
        setAutoSaveStatus("error");
        console.error("Auto-save failed:", error);
        // Reset to idle after 5 seconds
        setTimeout(() => setAutoSaveStatus("idle"), 5000);
      }
    }, 60000); // 60 seconds

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [article, hasUnsavedChanges, isNew, params.id]);

  const handleTitleChange = (title: string) => {
    // For new articles, auto-generate slug
    if (isNew) {
      setArticle((prev) => ({
        ...prev,
        title,
        slug: title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        seoTitle: prev.seoTitle || title,
      }));
    } else {
      // For existing articles, ask for confirmation before changing slug
      if (article.slug && article.slug !== "") {
        setPendingTitle(title);
        setOriginalSlug(article.slug);
        setShowSlugConfirm(true);
      } else {
        setArticle((prev) => ({
          ...prev,
          title,
          slug: title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          seoTitle: prev.seoTitle || title,
        }));
      }
    }
  };

  const confirmSlugChange = (updateSlug: boolean) => {
    const newSlug = updateSlug
      ? pendingTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      : originalSlug;

    setArticle((prev) => ({
      ...prev,
      title: pendingTitle,
      slug: newSlug,
      seoTitle: prev.seoTitle || pendingTitle,
    }));
    setShowSlugConfirm(false);
    setPendingTitle("");
    setOriginalSlug("");
  };

  const addTag = (tag: string, tagId?: number) => {
    if (tag && !article.tags.includes(tag)) {
      setArticle((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
        tagIds: tagId ? [...prev.tagIds, tagId] : prev.tagIds,
      }));
    }
    setNewTag("");
  };

  const removeTag = (tag: string, index: number) => {
    setArticle((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
      tagIds: prev.tagIds.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (newStatus?: string) => {
    if (!article.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    // Category is required for all actions except draft save
    if (article.categoryIds.length === 0 && newStatus !== "draft") {
      toast.error("Please select at least one category");
      return;
    }

    // Primary category is required for submit/publish
    if (!article.primaryCategoryId && newStatus && newStatus !== "draft") {
      toast.error("Please select a primary category");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || undefined,
        content: article.content,
        featuredImageId: article.featuredImageId || undefined,
        status: (newStatus || article.status) as "draft" | "submitted" | "editor_review" | "senior_review" | "approved" | "scheduled" | "published" | "rejected",
        categoryIds: article.categoryIds.length > 0 ? article.categoryIds : undefined,
        primaryCategoryId: article.primaryCategoryId || undefined,
        tagIds: article.tagIds.length > 0 ? article.tagIds : undefined,
        isFeatured: article.isFeatured,
        featuredDurationHours: article.isFeatured && article.featuredDurationHours ? article.featuredDurationHours : undefined,
        isEditorPick: article.isEditorPick,
        isFlash: article.isFlash,
        flashDurationHours: article.isFlash && article.flashDurationHours ? article.flashDurationHours : undefined,
        seoTitle: article.seoTitle || undefined,
        seoDescription: article.seoDescription || undefined,
        seoKeywords: article.seoKeywords || undefined,
        canonicalUrl: article.canonicalUrl || undefined,
        focusKeywordId: article.focusKeywordId || undefined,
        // Google News SEO fields with auto-fill defaults
        robotsIndexing: article.robotsIndexing,
        ogImageId: article.ogImageId || article.featuredImageId || undefined, // Default to featured image
        ogTitle: article.ogTitle || undefined, // Will default to seoTitle/title on backend
        ogDescription: article.ogDescription || undefined, // Will default to seoDescription/excerpt on backend
        articleType: article.articleType,
        googleNewsKeywords: article.googleNewsKeywords || undefined,
        // Coverage country drives edition surfacing on listings
        coverageCountryId: article.coverageCountryId ?? undefined,
        publishedAt: article.publishedAt || undefined,
        // Author (admin only)
        authorId: article.authorId || undefined,
      };

      if (isNew) {
        await createMutation.mutateAsync(data);
      } else {
        await updateMutation.mutateAsync({
          id: parseInt(params.id!),
          ...data,
        });
        // Update local state with new status
        if (newStatus) {
          setArticle(prev => ({ ...prev, status: newStatus }));
        }
        // Reset unsaved changes tracking after successful save
        initialArticleRef.current = JSON.stringify(article);
        setHasUnsavedChanges(false);
        // Capture editorial feedback for AI-generated articles
        const discoveredId = (existingArticle as any)?.discoveredArticleId;
        if (discoveredId && newStatus) {
          const feedbackAction = newStatus === 'published' ? 'publish'
            : newStatus === 'rejected' ? 'reject'
            : newStatus === 'approved' ? 'approve'
            : 'edit';
          submitFeedbackMutation.mutate({
            discoveredArticleId: discoveredId,
            articleId: parseInt(params.id!),
            action: feedbackAction as any,
          });
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusInfo = () => {
    switch (article.status) {
      case "draft":
        return { label: "Draft", color: "text-[#697386]", icon: Clock };
      case "submitted":
        return { label: "Submitted for Review", color: "text-blue-500", icon: Send };
      case "editor_review":
        return { label: "Editor Review", color: "text-yellow-500", icon: AlertCircle };
      case "senior_review":
        return { label: "Senior Editor Review", color: "text-purple-500", icon: AlertCircle };
      case "approved":
        return { label: "Approved", color: "text-green-500", icon: CheckCircle };
      case "scheduled":
        return { label: "Scheduled", color: "text-orange-500", icon: Clock };
      case "published":
        return { label: "Published", color: "text-[#0066FF]", icon: CheckCircle };
      case "rejected":
        return { label: "Rejected", color: "text-red-500", icon: AlertCircle };
      default:
        return { label: article.status, color: "text-[#697386]", icon: Clock };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (!isNew && isLoadingArticle) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/admin/articles">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-xl font-semibold text-[#1A1F36]">
                {isNew ? "New Article" : "Edit Article"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                <span className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</span>
                {article.publishedAt && (
                  <span className="text-sm text-[#697386]">
                    • Published {new Date(article.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Auto-save indicator */}
            {autoSaveStatus !== "idle" && (
              <div className={`flex items-center gap-1 text-sm ${
                autoSaveStatus === "saving" ? "text-blue-500" :
                autoSaveStatus === "saved" ? "text-green-500" :
                "text-red-500"
              }`}>
                {autoSaveStatus === "saving" && (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Auto-saving...</>
                )}
                {autoSaveStatus === "saved" && (
                  <><CheckCircle className="h-3 w-3" /> Auto-saved</>
                )}
                {autoSaveStatus === "error" && (
                  <><AlertCircle className="h-3 w-3" /> Auto-save failed</>
                )}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => setAiComposeOpen(true)}
              disabled={isSaving}
              className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
              title="Draft a full article with AI from a brief"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Compose
            </Button>
            <Button
              variant="outline"
              disabled={isSaving || isNew}
              onClick={() => {
                // Open article preview in new tab using admin preview route
                window.open(`/admin/articles/${params.id}/preview`, '_blank');
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSave()}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>
            {article.status === "draft" && (
              <Button 
                onClick={() => handleSave("submitted")}
                disabled={isSaving}
                className="bg-[#0066FF] hover:bg-[#0052CC]"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </Button>
            )}
            {article.status === "approved" && (
              <Button 
                onClick={() => {
                  // Check if publish date is in the future
                  if (article.publishedAt && new Date(article.publishedAt) > new Date()) {
                    handleSave("scheduled");
                  } else {
                    handleSave("published");
                  }
                }}
                disabled={isSaving}
                className="bg-[#0066FF] hover:bg-[#0052CC]"
              >
                <Globe className="h-4 w-4 mr-2" />
                {article.publishedAt && new Date(article.publishedAt) > new Date() ? "Schedule" : "Publish"}
              </Button>
            )}
            {/* Admin-only Publish Directly button */}
            {isAdmin && article.status !== "published" && article.status !== "scheduled" && (
              <Button 
                onClick={() => {
                  // Check if publish date is in the future
                  if (article.publishedAt && new Date(article.publishedAt) > new Date()) {
                    handleSave("scheduled");
                  } else {
                    handleSave("published");
                  }
                }}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700"
                title="Admin: Publish without review"
              >
                <Globe className="h-4 w-4 mr-2" />
                {article.publishedAt && new Date(article.publishedAt) > new Date() ? "Schedule" : "Publish Directly"}
              </Button>
            )}
            {/* Scheduled article actions */}
            {article.status === "scheduled" && (
              <>
                <Button 
                  onClick={() => handleSave("published")}
                  disabled={isSaving}
                  className="bg-[#0066FF] hover:bg-[#0052CC]"
                  title="Publish immediately"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Publish Now
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleSave("draft")}
                  disabled={isSaving}
                  title="Move back to draft"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Unschedule
                </Button>
              </>
            )}
            {/* Re-index button - only for published articles, admin/editor only */}
            {!isNew && (article.status === "published" || article.status === "scheduled") && (
              <ReindexButton articleId={parseInt(params.id || "0")} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <Card>
              <CardContent className="p-6">
                <Input
                  placeholder="Article title..."
                  value={article.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-2xl font-bold border-0 px-0 focus-visible:ring-0 placeholder:text-[#9BA3B0]"
                />
                {/* Slug validation helper */}
                {(() => {
                  const slug = article.slug || "";
                  const MAX_SLUG_LENGTH = 70; // SEO best practice
                  const VALID_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
                  
                  const hasInvalidChars = slug.length > 0 && !VALID_SLUG_REGEX.test(slug);
                  const isTooLong = slug.length > MAX_SLUG_LENGTH;
                  const hasConsecutiveHyphens = slug.includes("--");
                  const startsOrEndsWithHyphen = slug.startsWith("-") || slug.endsWith("-");
                  const hasUppercase = /[A-Z]/.test(slug);
                  const hasSpaces = slug.includes(" ");
                  const hasSpecialChars = /[^a-z0-9-]/.test(slug);
                  
                  const isValid = slug.length > 0 && !hasInvalidChars && !isTooLong && !hasConsecutiveHyphens && !startsOrEndsWithHyphen;
                  const isEmpty = slug.length === 0;
                  
                  // Build validation messages
                  const validationMessages: string[] = [];
                  if (hasUppercase) validationMessages.push("Use lowercase letters only");
                  if (hasSpaces) validationMessages.push("Replace spaces with hyphens");
                  if (hasSpecialChars && !hasSpaces) validationMessages.push("Only letters, numbers, and hyphens allowed");
                  if (hasConsecutiveHyphens) validationMessages.push("Avoid consecutive hyphens (--)");
                  if (startsOrEndsWithHyphen) validationMessages.push("Cannot start or end with hyphen");
                  if (isTooLong) validationMessages.push(`Too long (${slug.length}/${MAX_SLUG_LENGTH} chars)`);
                  
                  return (
                    <>
                      <div className="flex items-center gap-1 mt-2 text-sm text-[#697386] flex-wrap">
                        <Globe className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-shrink-0">{publication.domain}/</span>
                        {/* Show primary category slug only (no parent hierarchy) */}
                        {article.primaryCategoryId && categories && (() => {
                          const primaryCat = (categories as any[])?.find((c: { id: number }) => c.id === article.primaryCategoryId);
                          if (primaryCat) {
                            return (
                              <span className="text-green-600 flex-shrink-0">
                                {primaryCat.slug}/
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <div className="relative flex-1 min-w-[200px]">
                          <Input
                            value={article.slug}
                            onChange={(e) => setArticle((prev) => ({ ...prev, slug: e.target.value }))}
                            className={`h-6 px-1 py-0 text-sm border-0 border-b-2 focus-visible:ring-0 transition-colors ${
                              isEmpty 
                                ? "border-dashed border-[#C8CDD6]" 
                                : isValid 
                                  ? "border-green-500 text-green-700" 
                                  : "border-red-500 text-red-700"
                            }`}
                          />
                          {/* Validation icon */}
                          {!isEmpty && (
                            <span className="absolute right-1 top-1/2 -translate-y-1/2">
                              {isValid ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Validation messages */}
                      {validationMessages.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {validationMessages.map((msg, idx) => (
                            <span key={idx} className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {msg}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Character count */}
                      {slug.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {slug.length}/{MAX_SLUG_LENGTH} characters
                          {slug.length > MAX_SLUG_LENGTH * 0.8 && slug.length <= MAX_SLUG_LENGTH && (
                            <span className="text-amber-600 ml-2">Approaching limit</span>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Editor tabs */}
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="pb-0">
                  {/* Card-style tabs with icons */}
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: "content", label: "Content", icon: FileText },
                      { value: "seo", label: "SEO", icon: SearchCheck },
                      { value: "entities", label: "Entities", icon: Network },
                      { value: "location", label: "Location", icon: MapPin },
                      { value: "funding", label: "Funding", icon: DollarSign },
                      { value: "languages", label: "Languages", icon: LanguagesIcon },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.value;
                      return (
                        <button
                          key={tab.value}
                          onClick={() => setActiveTab(tab.value)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-md border-2 transition-all min-w-[100px] ${
                            isActive
                              ? "border-foreground bg-muted shadow-sm"
                              : "border-border bg-background hover:border-muted-foreground/30 hover:bg-muted/50"
                          }`}
                        >
                          <div className={`p-2 rounded-md ${
                            isActive ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className={`text-sm font-medium ${
                            isActive ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {tab.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <TabsContent value="content" className="mt-0 space-y-6">
                    {/* Excerpt */}
                    <div className="space-y-2">
                      <Label>Excerpt</Label>
                      <Textarea
                        placeholder="Brief summary of the article..."
                        value={article.excerpt}
                        onChange={(e) => setArticle((prev) => ({ ...prev, excerpt: e.target.value }))}
                        rows={3}
                      />
                      <p className="text-xs text-[#697386]">
                        {article.excerpt.length}/300 characters
                      </p>
                    </div>

                    {/* TipTap Rich Text Editor */}
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <RichTextEditor
                        content={article.content}
                        onChange={(content) => setArticle((prev) => ({ ...prev, content }))}
                        placeholder="Start writing your article..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="seo" className="mt-0 space-y-6">
                    {/* Live SEO Score (Phase 2B) — pure heuristic, no LLM cost.
                        Updates as the writer composes, with a 600ms-1.2s debounce
                        per field. Score is 100 - sum(severity penalties). */}
                    {seoScore.data && (
                      <div className="rounded-md border bg-gradient-to-br from-slate-50 to-white p-4">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="relative flex items-center justify-center">
                            <svg className="w-16 h-16" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                              <circle
                                cx="50" cy="50" r="42" fill="none"
                                stroke={seoScore.data.score >= 80 ? '#22c55e' : seoScore.data.score >= 60 ? '#eab308' : '#ef4444'}
                                strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={`${(seoScore.data.score / 100) * 264} 264`}
                                transform="rotate(-90 50 50)"
                              />
                            </svg>
                            <span className="absolute text-xl font-bold">{seoScore.data.score}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">
                              SEO Score{seoScore.isFetching && <span className="ml-2 text-xs text-muted-foreground">(updating…)</span>}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {seoScore.data.wordCount.toLocaleString()} words ·{" "}
                              {seoScore.data.issues.length === 0
                                ? "All checks pass — ready to publish"
                                : `${seoScore.data.issues.length} issue${seoScore.data.issues.length === 1 ? '' : 's'} to address`}
                            </p>
                          </div>
                        </div>
                        {seoScore.data.issues.length > 0 && (
                          <ul className="space-y-1.5">
                            {seoScore.data.issues.slice(0, 5).map((issue, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                  issue.severity === 'critical' ? 'bg-red-500' :
                                  issue.severity === 'warning' ? 'bg-yellow-500' :
                                  'bg-blue-500'
                                }`} />
                                <span className="text-muted-foreground">
                                  <span className="font-mono text-xs px-1 py-0.5 rounded bg-slate-100 mr-1">{issue.field}</span>
                                  {issue.message}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* AI Generate All Button */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-md border border-purple-100">
                      <div>
                        <p className="font-medium text-purple-900">AI SEO Assistant</p>
                        <p className="text-sm text-purple-700">Generate optimized SEO title, description, and keywords</p>
                      </div>
                      <Button
                        onClick={handleGenerateAllSeo}
                        disabled={isGeneratingSeo || !article.title || !article.content}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isGeneratingSeo ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="h-4 w-4 mr-2" /> Generate All</>
                        )}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>SEO Title</Label>
                        <Popover open={titlePopoverOpen} onOpenChange={setTitlePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSuggestTitle}
                              disabled={isGeneratingTitle || !article.title || !article.content}
                              className="text-purple-600 hover:text-purple-700 h-7 px-2"
                            >
                              {isGeneratingTitle ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><Sparkles className="h-3 w-3 mr-1" /> Suggest</>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-96 max-w-[90vw]">
                            <p className="text-sm font-semibold mb-2">Pick one</p>
                            {titleAlternatives.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No alternatives yet — click Suggest.</p>
                            ) : (
                              <div className="space-y-2">
                                {titleAlternatives.map((alt, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      setArticle((prev) => ({ ...prev, seoTitle: alt.title }));
                                      setTitlePopoverOpen(false);
                                      toast.success("Title applied");
                                    }}
                                    className="w-full text-left rounded-md border p-2 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                                  >
                                    <p className="font-medium text-sm">{alt.title}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <p className="text-xs text-muted-foreground italic">{alt.reasoning}</p>
                                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                        alt.title.length >= 50 && alt.title.length <= 60 ? 'bg-green-100 text-green-700' :
                                        alt.title.length > 60 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {alt.title.length}c
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Input
                        placeholder="SEO optimized title..."
                        value={article.seoTitle}
                        onChange={(e) => setArticle((prev) => ({ ...prev, seoTitle: e.target.value }))}
                      />
                      <p className={`text-xs ${
                        article.seoTitle.length >= 50 && article.seoTitle.length <= 60 ? 'text-green-600' :
                        article.seoTitle.length > 60 ? 'text-red-600' : 'text-[#697386]'
                      }`}>
                        {article.seoTitle.length}/60 characters (recommended)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Meta Description</Label>
                        <Popover open={descPopoverOpen} onOpenChange={setDescPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSuggestDescription}
                              disabled={isGeneratingDescription || !article.title || !article.content}
                              className="text-purple-600 hover:text-purple-700 h-7 px-2"
                            >
                              {isGeneratingDescription ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><Sparkles className="h-3 w-3 mr-1" /> Suggest</>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-96 max-w-[90vw]">
                            <p className="text-sm font-semibold mb-2">Pick one</p>
                            {descAlternatives.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No alternatives yet — click Suggest.</p>
                            ) : (
                              <div className="space-y-2">
                                {descAlternatives.map((alt, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      setArticle((prev) => ({ ...prev, seoDescription: alt.description }));
                                      setDescPopoverOpen(false);
                                      toast.success("Description applied");
                                    }}
                                    className="w-full text-left rounded-md border p-2 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                                  >
                                    <p className="text-sm">{alt.description}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <p className="text-xs text-muted-foreground italic">{alt.reasoning}</p>
                                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                        alt.description.length >= 140 && alt.description.length <= 160 ? 'bg-green-100 text-green-700' :
                                        alt.description.length > 160 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {alt.description.length}c
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Textarea
                        placeholder="Description for search engines..."
                        value={article.seoDescription}
                        onChange={(e) => setArticle((prev) => ({ ...prev, seoDescription: e.target.value }))}
                        rows={3}
                      />
                      <p className={`text-xs ${
                        article.seoDescription.length >= 140 && article.seoDescription.length <= 160 ? 'text-green-600' :
                        article.seoDescription.length > 160 ? 'text-red-600' : 'text-[#697386]'
                      }`}>
                        {article.seoDescription.length}/160 characters (recommended)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Focus Keyword</Label>
                      <div className="space-y-2">
                        {/* Keyword Dropdown */}
                        <div className="relative">
                          <Input
                            placeholder="Search or add keyword..."
                            value={focusKeywordSearch}
                            onChange={(e) => setFocusKeywordSearch(e.target.value)}
                            className="pr-10"
                          />
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        {/* Selected Keyword Badge */}
                        {article.focusKeywordId && keywordsList && (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              {keywordsList.find((k: { id: number; name: string }) => k.id === article.focusKeywordId)?.name || "Unknown"}
                              <button
                                type="button"
                                onClick={() => setArticle((prev) => ({ ...prev, focusKeywordId: null }))}
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          </div>
                        )}
                        
                        {/* Keyword List */}
                        {focusKeywordSearch && (
                          <div className="border rounded-md max-h-40 overflow-y-auto">
                            {keywordsList?.filter((k: { id: number; name: string }) => 
                              k.name.toLowerCase().includes(focusKeywordSearch.toLowerCase())
                            ).map((keyword: { id: number; name: string }) => (
                              <button
                                key={keyword.id}
                                type="button"
                                onClick={() => {
                                  setArticle((prev) => ({ ...prev, focusKeywordId: keyword.id }));
                                  setFocusKeywordSearch("");
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between"
                              >
                                {keyword.name}
                                {article.focusKeywordId === keyword.id && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </button>
                            ))}
                            
                            {/* Add New Keyword Option */}
                            {focusKeywordSearch && !keywordsList?.some((k: { name: string }) => 
                              k.name.toLowerCase() === focusKeywordSearch.toLowerCase()
                            ) && (
                              <button
                                type="button"
                                onClick={() => {
                                  createKeywordMutation.mutate({ name: focusKeywordSearch });
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted border-t flex items-center gap-2 text-primary"
                              >
                                <Plus className="h-4 w-4" />
                                Add "{focusKeywordSearch}" as new keyword
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#697386]">
                        Select a focus keyword for SEO optimization or add a new one
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Additional Keywords</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSuggestKeywords}
                          disabled={isGeneratingKeywords || !article.title || !article.content}
                          className="text-purple-600 hover:text-purple-700 h-7 px-2"
                        >
                          {isGeneratingKeywords ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <><Sparkles className="h-3 w-3 mr-1" /> Suggest</>
                          )}
                        </Button>
                      </div>
                      <Input
                        placeholder="keyword1, keyword2, keyword3..."
                        value={article.seoKeywords}
                        onChange={(e) => setArticle((prev) => ({ ...prev, seoKeywords: e.target.value }))}
                      />
                      <p className="text-xs text-[#697386]">
                        Comma-separated list of additional keywords
                      </p>
                      
                      {/* AI Suggested Keywords - Enhanced with Database Matching */}
                      {aiSeoSuggestions && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-md border border-purple-100">
                          <p className="text-sm font-medium text-purple-900 mb-3">AI Suggestions (from database)</p>
                          <div className="space-y-3">
                            {/* Focus Keyword */}
                            {aiSeoSuggestions.focusKeyword && (
                              <div>
                                <p className="text-xs text-purple-700 mb-1 font-medium">Focus Keyword (Primary):</p>
                                <Badge
                                  variant="default"
                                  className="cursor-pointer bg-purple-600 hover:bg-purple-700"
                                  onClick={() => {
                                    setArticle((prev) => ({ ...prev, focusKeywordId: aiSeoSuggestions.focusKeyword!.id }));
                                    toast.success(`Focus keyword set: ${aiSeoSuggestions.focusKeyword!.name}`);
                                  }}
                                >
                                  {article.focusKeywordId === aiSeoSuggestions.focusKeyword.id ? '✓ ' : '+ '}
                                  {aiSeoSuggestions.focusKeyword.name}
                                </Badge>
                              </div>
                            )}
                            
                            {/* Additional Keywords (max 5) */}
                            {aiSeoSuggestions.additionalKeywords.length > 0 && (
                              <div>
                                <p className="text-xs text-purple-700 mb-1 font-medium">Additional Keywords (2-5 from database):</p>
                                <div className="flex flex-wrap gap-1">
                                  {aiSeoSuggestions.additionalKeywords.slice(0, 5).map((kw) => (
                                    <Badge
                                      key={kw.id}
                                      variant="outline"
                                      className="cursor-pointer hover:bg-purple-100 text-purple-700 border-purple-200"
                                      onClick={() => {
                                        const current = article.seoKeywords ? article.seoKeywords.split(",").map(k => k.trim()).filter(k => k) : [];
                                        if (!current.includes(kw.name) && current.length < 5) {
                                          setArticle((prev) => ({
                                            ...prev,
                                            seoKeywords: [...current, kw.name].join(", ")
                                          }));
                                          toast.success(`Added: ${kw.name}`);
                                        } else if (current.length >= 5) {
                                          toast.error("Maximum 5 additional keywords allowed");
                                        }
                                      }}
                                    >
                                      + {kw.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Google News Keywords */}
                            {aiSeoSuggestions.googleNewsKeywords.length > 0 && (
                              <div>
                                <p className="text-xs text-purple-700 mb-1 font-medium">Google News Keywords (suggested):</p>
                                <div className="flex flex-wrap gap-1">
                                  {aiSeoSuggestions.googleNewsKeywords.slice(0, 5).map((kw, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="cursor-pointer hover:bg-blue-100 text-blue-700 border-blue-200"
                                      onClick={() => {
                                        const current = article.googleNewsKeywords ? article.googleNewsKeywords.split(",").map(k => k.trim()).filter(k => k) : [];
                                        if (!current.includes(kw) && current.length < 5) {
                                          setArticle((prev) => ({
                                            ...prev,
                                            googleNewsKeywords: [...current, kw].join(", ")
                                          }));
                                        }
                                      }}
                                    >
                                      + {kw}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Tags */}
                            {aiSeoSuggestions.tags.length > 0 && (
                              <div>
                                <p className="text-xs text-purple-700 mb-1 font-medium">Suggested Tags (2-5 from database):</p>
                                <div className="flex flex-wrap gap-1">
                                  {aiSeoSuggestions.tags.slice(0, 5).map((tag) => (
                                    <Badge
                                      key={tag.id}
                                      variant="outline"
                                      className="cursor-pointer hover:bg-green-100 text-green-700 border-green-200"
                                      onClick={() => {
                                        if (!article.tags.includes(tag.name) && article.tags.length < 5) {
                                          setArticle((prev) => ({
                                            ...prev,
                                            tags: [...prev.tags, tag.name]
                                          }));
                                          toast.success(`Tag added: ${tag.name}`);
                                        } else if (article.tags.length >= 5) {
                                          toast.error("Maximum 5 tags allowed");
                                        }
                                      }}
                                    >
                                      <span className="text-[10px] text-[#9BA3B0] mr-1">[{tag.tagType}]</span>
                                      + {tag.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Legacy AI Suggested Keywords (fallback) */}
                      {!aiSeoSuggestions && suggestedKeywords && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-md border border-purple-100">
                          <p className="text-sm font-medium text-purple-900 mb-2">AI Suggested Keywords</p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-purple-700 mb-1">Focus Keywords:</p>
                              <div className="flex flex-wrap gap-1">
                                {suggestedKeywords.focus.map((kw, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-purple-100 text-purple-700 border-purple-200"
                                    onClick={() => setFocusKeywordSearch(kw)}
                                  >
                                    {kw}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-purple-700 mb-1">Additional Keywords:</p>
                              <div className="flex flex-wrap gap-1">
                                {suggestedKeywords.additional.map((kw, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-purple-100 text-purple-700 border-purple-200"
                                    onClick={() => {
                                      const current = article.seoKeywords ? article.seoKeywords.split(",").map(k => k.trim()) : [];
                                      if (!current.includes(kw)) {
                                        setArticle((prev) => ({
                                          ...prev,
                                          seoKeywords: [...current, kw].join(", ")
                                        }));
                                      }
                                    }}
                                  >
                                    + {kw}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Canonical URL</Label>
                      <Input
                        placeholder="https://..."
                        value={article.canonicalUrl}
                        onChange={(e) => setArticle((prev) => ({ ...prev, canonicalUrl: e.target.value }))}
                      />
                      <p className="text-xs text-[#697386]">
                        Leave empty to use the default URL
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t pt-6">
                      <h3 className="text-sm font-semibold text-[#1A1F36] mb-4">Google News & Social</h3>
                    </div>

                    {/* Article Type - REQUIRED */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Article Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={article.articleType}
                        onValueChange={(value: "news" | "opinion" | "press_release" | "report" | "interview") => 
                          setArticle((prev) => ({ ...prev, articleType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select article type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="news">News</SelectItem>
                          <SelectItem value="opinion">Opinion</SelectItem>
                          <SelectItem value="press_release">Press Release</SelectItem>
                          <SelectItem value="report">Report / Research</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#697386]">
                        Required for Google News classification and schema markup
                      </p>
                    </div>

                    {/* Indexing (Robots) */}
                    <div className="space-y-2">
                      <Label>Indexing (Robots)</Label>
                      <Select
                        value={article.robotsIndexing}
                        onValueChange={(value: "index" | "noindex") => 
                          setArticle((prev) => ({ ...prev, robotsIndexing: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select indexing" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="index">Index (default)</SelectItem>
                          <SelectItem value="noindex">Noindex</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#697386]">
                        Use Noindex for duplicate, test, or hidden content
                      </p>
                    </div>

                    {/* Google News Keywords */}
                    <div className="space-y-2">
                      <Label>Google News Keywords</Label>
                      <Input
                        placeholder="startup, funding, fintech..."
                        value={article.googleNewsKeywords}
                        onChange={(e) => {
                          const keywords = e.target.value.split(",").slice(0, 5).join(",");
                          setArticle((prev) => ({ ...prev, googleNewsKeywords: keywords }));
                        }}
                      />
                      <p className="text-xs text-[#697386]">
                        Comma-separated, max 5 keywords for editorial classification
                      </p>
                    </div>

                    {/* Social Preview Image */}
                    <div className="space-y-2">
                      <Label>Social Preview Image (OG Image)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Uses Featured Image if empty"
                          value={article.ogImageId ? `Image ID: ${article.ogImageId}` : ""}
                          readOnly
                          className="flex-1"
                        />
                        {article.ogImageId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setArticle((prev) => ({ ...prev, ogImageId: null }))}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-[#697386]">
                        Leave empty to use Featured Image automatically
                      </p>
                    </div>

                    {/* Social Title Override */}
                    <div className="space-y-2">
                      <Label>Social Title Override</Label>
                      <Input
                        placeholder="Uses SEO Title if empty"
                        value={article.ogTitle}
                        onChange={(e) => setArticle((prev) => ({ ...prev, ogTitle: e.target.value }))}
                      />
                      <p className="text-xs text-[#697386]">
                        Optional - defaults to SEO Title
                      </p>
                    </div>

                    {/* Social Description Override */}
                    <div className="space-y-2">
                      <Label>Social Description Override</Label>
                      <Textarea
                        placeholder="Uses Meta Description if empty"
                        value={article.ogDescription}
                        onChange={(e) => setArticle((prev) => ({ ...prev, ogDescription: e.target.value }))}
                        rows={2}
                      />
                      <p className="text-xs text-[#697386]">
                        Optional - defaults to Meta Description
                      </p>
                    </div>

                    {/* SEO Preview */}
                    <div className="p-4 bg-[#F7F8FA] rounded-md space-y-2">
                      <p className="text-sm font-medium">Search Preview</p>
                      <div className="space-y-1">
                        <p className="text-blue-600 text-lg hover:underline cursor-pointer">
                          {article.seoTitle || article.title || "Article Title"}
                        </p>
                        <p className="text-green-700 text-sm">
                          {publication.domain}/
                          {article.primaryCategoryId && categories && (() => {
                            const primaryCat = (categories as any[])?.find((c: { id: number }) => c.id === article.primaryCategoryId);
                            return primaryCat ? `${primaryCat.slug}/` : "";
                          })()}
                          {article.slug || "article-slug"}
                        </p>
                        <p className="text-sm text-[#697386] line-clamp-2">
                          {article.seoDescription || article.excerpt || "Article description will appear here..."}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="entities" className="mt-0">
                    {params.id && Number(params.id) > 0 ? (
                      <EntityLinkingTab 
                        articleId={Number(params.id)}
                        articleTitle={article.title}
                        articleContent={article.content}
                        articleExcerpt={article.excerpt}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Save the article first to link entities</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Location Tab - Global Location System */}
                  <TabsContent value="location" className="mt-0">
                    {params.id && Number(params.id) > 0 ? (
                      <LocationTab 
                        articleId={Number(params.id)}
                        articleTitle={article.title}
                        articleContent={article.content}
                        articleExcerpt={article.excerpt}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Save the article first to add location data</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Funding Tab - Funding Tracker */}
                  <TabsContent value="funding" className="mt-0">
                    {params.id && Number(params.id) > 0 ? (
                      <FundingTab 
                        articleId={Number(params.id)}
                        articleTitle={article.title}
                        articleContent={article.content}
                        articleExcerpt={article.excerpt}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Save the article first to add funding data</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="languages" className="mt-0">
                    {/* Every language this article can appear in, what state
                        each one is in, and the three ways to change it:
                        translate and publish, translate as a draft, or write
                        it yourself. */}
                    <ArticleTranslations entityId={parseInt(params.id || "0")} />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publish Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Publish Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Categories Section - Hierarchical Tree View */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Categories</Label>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {/* Search Categories */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Categories"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  
                  {/* Category Tree */}
                  <div className="border rounded-md max-h-64 overflow-y-auto">
                    {(() => {
                      const allCategories = categories as any[] || [];
                      const parentCategories = allCategories.filter((cat: { parentId: number | null }) => !cat.parentId);
                      const searchLower = categorySearch.toLowerCase();
                      
                      // Filter categories based on search
                      const filteredParents = categorySearch
                        ? parentCategories.filter((parent: { id: number; name: string }) => {
                            const childCats = allCategories.filter((c: { parentId: number | null }) => c.parentId === parent.id);
                            const parentMatches = parent.name.toLowerCase().includes(searchLower);
                            const childMatches = childCats.some((c: { name: string }) => c.name.toLowerCase().includes(searchLower));
                            return parentMatches || childMatches;
                          })
                        : parentCategories;
                      
                      return filteredParents.map((parentCat: { id: number; name: string; slug: string }) => {
                        const childCats = allCategories.filter((c: { parentId: number | null }) => c.parentId === parentCat.id) || [];
                        const filteredChildren = categorySearch
                          ? childCats.filter((c: { name: string }) => 
                              c.name.toLowerCase().includes(searchLower) || parentCat.name.toLowerCase().includes(searchLower)
                            )
                          : childCats;
                        const hasChildren = filteredChildren.length > 0;
                        const isExpanded = expandedCategories.has(parentCat.id) || categorySearch.length > 0;
                        
                        return (
                          <div key={parentCat.id} className="border-b last:border-b-0">
                            {/* Parent Category Row */}
                            <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedCategories(prev => {
                                      const next = new Set(prev);
                                      if (next.has(parentCat.id)) {
                                        next.delete(parentCat.id);
                                      } else {
                                        next.add(parentCat.id);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="p-0.5 hover:bg-muted rounded"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-4" />
                              )}
                              <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={article.categoryIds.includes(parentCat.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setArticle((prev) => ({
                                        ...prev,
                                        categoryIds: [...prev.categoryIds, parentCat.id],
                                        primaryCategoryId: prev.primaryCategoryId || parentCat.id,
                                      }));
                                    } else {
                                      setArticle((prev) => ({
                                        ...prev,
                                        categoryIds: prev.categoryIds.filter((id) => id !== parentCat.id),
                                        primaryCategoryId: prev.primaryCategoryId === parentCat.id
                                          ? prev.categoryIds.filter((id) => id !== parentCat.id)[0] || null
                                          : prev.primaryCategoryId,
                                      }));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-[#C8CDD6] text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium">{parentCat.name}</span>
                              </label>
                            </div>
                            
                            {/* Child Categories */}
                            {hasChildren && isExpanded && (
                              <div className="bg-muted/30">
                                {filteredChildren.map((childCat: { id: number; name: string }) => (
                                  <div key={childCat.id} className="flex items-center gap-2 pl-10 pr-3 py-2 hover:bg-muted/50">
                                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                                      <input
                                        type="checkbox"
                                        checked={article.categoryIds.includes(childCat.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setArticle((prev) => ({
                                              ...prev,
                                              categoryIds: [...prev.categoryIds, childCat.id],
                                              primaryCategoryId: prev.primaryCategoryId || childCat.id,
                                            }));
                                          } else {
                                            setArticle((prev) => ({
                                              ...prev,
                                              categoryIds: prev.categoryIds.filter((id) => id !== childCat.id),
                                              primaryCategoryId: prev.primaryCategoryId === childCat.id
                                                ? prev.categoryIds.filter((id) => id !== childCat.id)[0] || null
                                                : prev.primaryCategoryId,
                                            }));
                                          }
                                        }}
                                        className="h-4 w-4 rounded border-[#C8CDD6] text-primary focus:ring-primary"
                                      />
                                      <span className="text-sm text-muted-foreground">{childCat.name}</span>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* Add Category Link */}
                  <Link href="/admin/taxonomy" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    Add Category
                  </Link>
                </div>

                {/* SELECT PRIMARY CATEGORY */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">SELECT PRIMARY CATEGORY</Label>
                    <div className="h-4 w-4 rounded-full border border-muted-foreground flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">?</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Type to search..."
                      value={primaryCategorySearch}
                      onChange={(e) => setPrimaryCategorySearch(e.target.value)}
                      className="h-9"
                    />
                    {primaryCategorySearch && article.categoryIds.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {article.categoryIds
                          .map((catId) => (categories as any[])?.find((c: { id: number }) => c.id === catId))
                          .filter((cat: any) => cat && cat.name.toLowerCase().includes(primaryCategorySearch.toLowerCase()))
                          .map((cat: { id: number; name: string }) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setArticle((prev) => ({ ...prev, primaryCategoryId: cat.id }));
                                setPrimaryCategorySearch("");
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            >
                              {cat.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  {article.primaryCategoryId && (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="gap-1">
                        {(categories as any[])?.find((c: { id: number }) => c.id === article.primaryCategoryId)?.name || "Unknown"}
                        <button
                          type="button"
                          onClick={() => setArticle((prev) => ({ ...prev, primaryCategoryId: null }))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">This category will be used in the article URL: /category/article-title</p>
                </div>

                {/* Coverage Country — drives the country edition this
                    article surfaces in first (Saudi visitors see Saudi
                    articles ahead of others). Placed directly below the
                    primary category so authors set it deliberately on
                    every article, not buried in the Location tab. */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      🌍 Coverage Country
                    </Label>
                    {article.coverageCountryId && (
                      <button
                        type="button"
                        onClick={() => setArticle((prev) => ({ ...prev, coverageCountryId: null }))}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        title="Clear coverage country"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Which country edition this article surfaces in first.
                    Leave empty for global / multi-country stories.
                  </p>
                  <CoverageCountryPicker
                    value={article.coverageCountryId}
                    onChange={(id) => setArticle((prev) => ({ ...prev, coverageCountryId: id }))}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label htmlFor="featured" className="text-amber-600 font-semibold">⭐ Featured Article</Label>
                      <p className="text-xs text-muted-foreground mt-1">Pin to featured section</p>
                    </div>
                    <Switch
                      id="featured"
                      checked={article.isFeatured}
                      onCheckedChange={(checked) => setArticle((prev) => ({ 
                        ...prev, 
                        isFeatured: checked,
                        featuredDurationHours: checked ? (prev.featuredDurationHours || 168) : null
                      }))}
                    />
                  </div>
                  {!!article.isFeatured && (
                    <div className="space-y-2">
                      <Label htmlFor="featuredDuration">Featured Duration (hours)</Label>
                      <Select
                        value={String(article.featuredDurationHours || 168)}
                        onValueChange={(value) => setArticle((prev) => ({ ...prev, featuredDurationHours: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 hours (1 day)</SelectItem>
                          <SelectItem value="48">48 hours (2 days)</SelectItem>
                          <SelectItem value="72">72 hours (3 days)</SelectItem>
                          <SelectItem value="168">168 hours (1 week)</SelectItem>
                          <SelectItem value="336">336 hours (2 weeks)</SelectItem>
                          <SelectItem value="720">720 hours (30 days)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Article will be unfeatured after this duration</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label htmlFor="editorPick" className="text-[#0066FF] font-semibold">✍️ Editor's Pick</Label>
                      <p className="text-xs text-muted-foreground mt-1">Show in Editor's Picks sidebar widget</p>
                    </div>
                    <Switch
                      id="editorPick"
                      checked={article.isEditorPick}
                      onCheckedChange={(checked) => setArticle((prev) => ({ 
                        ...prev, 
                        isEditorPick: checked
                      }))}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label htmlFor="flash" className="text-red-500 font-semibold">⚡ Flash/Breaking News</Label>
                      <p className="text-xs text-muted-foreground mt-1">Display as breaking news ticker</p>
                    </div>
                    <Switch
                      id="flash"
                      checked={article.isFlash}
                      onCheckedChange={(checked) => setArticle((prev) => ({ 
                        ...prev, 
                        isFlash: checked,
                        flashDurationHours: checked ? (prev.flashDurationHours || 24) : null
                      }))}
                    />
                  </div>
                  {!!article.isFlash && (
                    <div className="space-y-2">
                      <Label htmlFor="flashDuration">Duration (hours)</Label>
                      <Select
                        value={String(article.flashDurationHours || 24)}
                        onValueChange={(value) => setArticle((prev) => ({ ...prev, flashDurationHours: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="4">4 hours</SelectItem>
                          <SelectItem value="6">6 hours</SelectItem>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">24 hours (1 day)</SelectItem>
                          <SelectItem value="48">48 hours (2 days)</SelectItem>
                          <SelectItem value="72">72 hours (3 days)</SelectItem>
                          <SelectItem value="168">168 hours (7 days)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Publishing Date */}
                <div className="border-t pt-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="publishedAt" className="font-semibold">Publishing Date</Label>
                    </div>
                    <Input
                      id="publishedAt"
                      type="datetime-local"
                      value={article.publishedAt ? new Date(article.publishedAt).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setArticle((prev) => ({ 
                        ...prev, 
                        publishedAt: e.target.value ? new Date(e.target.value).toISOString() : null 
                      }))}
                    />
                    {/* Scheduling indicator */}
                    {article.publishedAt && new Date(article.publishedAt) > new Date() && (
                      <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-orange-700">
                          Will be scheduled for {new Date(article.publishedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {article.status === "scheduled" && (
                      <div className="flex items-center gap-2 p-2 bg-orange-100 border border-orange-300 rounded-md">
                        <Clock className="h-4 w-4 text-orange-600 animate-pulse" />
                        <span className="text-sm font-medium text-orange-800">
                          Scheduled to publish on {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : "N/A"}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {article.publishedAt && new Date(article.publishedAt) > new Date() 
                        ? "This article will be automatically published at the scheduled time."
                        : "Set a future date to schedule the article. Leave empty for current time when published."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tags</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!article.title || !article.content) {
                        toast.error("Please add title and content first");
                        return;
                      }
                      setIsGeneratingTags(true);
                      try {
                        const result = await suggestTagsMutation.mutateAsync({
                          title: article.title,
                          content: article.content,
                          excerpt: article.excerpt,
                        });
                        setAiTagSuggestions(result.tags);
                        toast.success("AI tag suggestions generated!");
                      } catch (error: any) {
                        toast.error(`Failed to generate tags: ${error.message}`);
                      } finally {
                        setIsGeneratingTags(false);
                      }
                    }}
                    disabled={isGeneratingTags || !article.title || !article.content}
                    className="gap-1"
                  >
                    {isGeneratingTags ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Suggest
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tag limit indicator */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    {article.tags.length}/5 tags selected
                  </Label>
                  {article.tags.length >= 5 && (
                    <span className="text-xs text-amber-600 font-medium">Maximum reached</span>
                  )}
                </div>

                {/* AI Tag Suggestions */}
                {aiTagSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-1 text-purple-600">
                      <Sparkles className="h-3 w-3" />
                      AI Suggestions
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {aiTagSuggestions.map((tag) => (
                        <Badge
                          key={tag.name}
                          variant="outline"
                          className={`cursor-pointer gap-1 ${
                            article.tags.includes(tag.name)
                              ? "bg-green-100 text-green-700 border-green-200"
                              : article.tags.length >= 5
                              ? "opacity-50 cursor-not-allowed text-[#9BA3B0] border-[#E0E3E8]"
                              : "hover:bg-purple-100 text-purple-700 border-purple-200"
                          }`}
                          onClick={() => {
                            if (article.tags.includes(tag.name)) return;
                            if (article.tags.length >= 5) {
                              toast.error("Maximum 5 tags allowed");
                              return;
                            }
                            addTag(tag.name, tag.existingId);
                            setAiTagSuggestions(prev => prev.filter(t => t.name !== tag.name));
                          }}
                        >
                          {article.tags.includes(tag.name) ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                          {tag.name}
                          <span className="text-xs opacity-60">({tag.tagType})</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Searchable Tag Picker from Whitelist */}
                {article.tags.length < 5 && (
                  <div className="relative">
                    <Input
                      placeholder="Search tags from whitelist..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setNewTag("");
                        }
                      }}
                    />
                    {newTag.length >= 1 && allTagsData && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {(() => {
                          const searchTerm = newTag.toLowerCase();
                          const flatTags = Object.entries(allTagsData).flatMap(([type, tagList]) =>
                            (tagList as any[]).map(t => ({ ...t, tagType: type }))
                          );
                          const filtered = flatTags.filter(
                            t => t.name.toLowerCase().includes(searchTerm) && !article.tags.includes(t.name)
                          ).slice(0, 15);
                          
                          if (filtered.length === 0) {
                            return (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                No matching tags found
                              </div>
                            );
                          }
                          
                          return filtered.map(t => (
                            <button
                              key={t.id}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2 transition-colors"
                              onClick={() => {
                                addTag(t.name, t.id);
                                setNewTag("");
                              }}
                            >
                              <span className="font-medium">{t.name}</span>
                              <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">{t.tagType}</span>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Tags */}
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, index) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag, index)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                {article.tags.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Select up to 5 tags from the admin-managed whitelist. Use AI Suggest or search above.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Featured Image */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Featured Image</CardTitle>
              </CardHeader>
              <CardContent>
                {featuredImageUrl ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <img 
                        src={featuredImageUrl} 
                        alt={featuredImageMeta?.alt || "Featured"} 
                        className="w-full h-48 object-cover rounded-md"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setArticle(prev => ({ ...prev, featuredImageId: null }));
                          setFeaturedImageUrl(null);
                          setFeaturedImageMeta(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Image Metadata */}
                    {featuredImageMeta && (
                      <div className="space-y-2 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Alt Text</Label>
                          <Input
                            value={featuredImageMeta.alt}
                            onChange={(e) => setFeaturedImageMeta({ ...featuredImageMeta, alt: e.target.value })}
                            placeholder="Describe the image for accessibility"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Caption</Label>
                          <Input
                            value={featuredImageMeta.caption}
                            onChange={(e) => setFeaturedImageMeta({ ...featuredImageMeta, caption: e.target.value })}
                            placeholder="Caption displayed below image"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowMediaPicker(true)}
                    >
                      Replace Image
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-[#E0E3E8] rounded-md p-8 text-center hover:border-[#0066FF] transition-colors cursor-pointer"
                    onClick={() => setShowMediaPicker(true)}
                  >
                    <div className="text-[#9BA3B0]">
                      <ImageIcon className="mx-auto h-12 w-12" />
                      <p className="mt-2 text-sm font-medium">Set Featured Image</p>
                      <p className="text-xs text-[#9BA3B0] mt-1">Upload new or select from Media Library</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Media Picker Dialog */}
            <MediaPicker
              open={showMediaPicker}
              onOpenChange={setShowMediaPicker}
              currentImage={featuredImageMeta}
              onSelect={(media) => {
                setArticle(prev => ({ ...prev, featuredImageId: media.id || null }));
                setFeaturedImageUrl(media.url);
                setFeaturedImageMeta(media);
              }}
            />

            {/* Author Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Author
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAdmin && authorsList ? (
                  <Select
                    value={article.authorId?.toString() || ""}
                    onValueChange={(value) => setArticle((prev) => ({ ...prev, authorId: value ? parseInt(value) : null }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select author">
                        {article.authorId && authorsList && (() => {
                          const author = authorsList.find((a: { id: number }) => a.id === article.authorId);
                          if (author) {
                            return (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={author.avatar || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {(author.publicName || author.name || "?").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{author.publicName || author.name}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {authorsList.map((author: { id: number; name: string | null; publicName: string | null; username: string | null; avatar: string | null; role: string }) => (
                        <SelectItem key={author.id} value={author.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={author.avatar || undefined} />
                              <AvatarFallback className="text-xs">
                                {(author.publicName || author.name || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">{author.publicName || author.name}</span>
                              {author.username && <span className="text-muted-foreground ml-1">@{author.username}</span>}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-md">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar || undefined} />
                      <AvatarFallback>
                        {(user?.name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">You are the author</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Slug Change Confirmation Dialog */}
      <AlertDialog open={showSlugConfirm} onOpenChange={setShowSlugConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Update Article URL?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>You're changing the article title. Would you like to update the URL (slug) as well?</p>
              <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Current URL: </span>
                  <code className="text-foreground">/article/{originalSlug}</code>
                </div>
                <div>
                  <span className="text-muted-foreground">New URL: </span>
                  <code className="text-foreground">/article/{pendingTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}</code>
                </div>
              </div>
              <p className="text-amber-600 text-sm">⚠️ Changing the URL may break existing links to this article.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => confirmSlugChange(false)}>
              Keep Current URL
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmSlugChange(true)}>
              Update URL
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Compose dialog — drafts a full article from a brief and
          populates every editor field on apply. */}
      <AIComposeDialog
        open={aiComposeOpen}
        onOpenChange={setAiComposeOpen}
        onApply={handleAIComposeApply}
        initialBrief={article.title && !article.content ? article.title : ""}
        initialFocusKeyword={focusKeywordName || ""}
      />
    </AdminLayout>
  );
}
