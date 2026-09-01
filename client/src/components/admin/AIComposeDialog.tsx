/**
 * AI Compose Dialog (Comprehensive)
 * -------------------------------------------------------
 * Full-featured AI authoring assistant. Generates complete article drafts
 * including: title, body, SEO, entities, location, funding, and both
 * primary+secondary categories. Writer can edit all fields in the preview
 * before applying to the editor.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, RefreshCw, Wand2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface ComposedArticle {
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  seoTitle: string;
  metaDescription: string;
  suggestedTags: string[];
  primaryCategory: string;
  secondaryCategories: string[];
  focusKeyword: string;
  entities: {
    companies: string[];
    people: string[];
  };
  location: {
    city: string;
    country: string;
    region: string;
  } | null;
  funding: {
    isFundingArticle: boolean;
    company?: string;
    amount?: string;
    stage?: string;
    investors?: string[];
  };
}

interface AIComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (result: ComposedArticle) => void;
  initialBrief?: string;
  initialFocusKeyword?: string;
}

const TONES = [
  { value: "news",       label: "News",       hint: "Breaking, lead-with-the-fact" },
  { value: "analysis",   label: "Analysis",   hint: "Why it matters, market angle" },
  { value: "feature",    label: "Feature",    hint: "Long-form, narrative" },
  { value: "interview",  label: "Interview",  hint: "Q&A or quote-led" },
  { value: "explainer",  label: "Explainer",  hint: "Background, definitions" },
];

export function AIComposeDialog({
  open, onOpenChange, onApply, initialBrief = "", initialFocusKeyword = "",
}: AIComposeDialogProps) {
  const [brief, setBrief] = useState(initialBrief);
  const [sourceUrl, setSourceUrl] = useState("");
  const [tone, setTone] = useState<"news" | "analysis" | "feature" | "interview" | "explainer">("news");
  const [targetWords, setTargetWords] = useState(700);
  const [focusKeyword, setFocusKeyword] = useState(initialFocusKeyword);
  const [policyId, setPolicyId] = useState<number | undefined>();
  const [provider, setProvider] = useState("built-in");
  const [model, setModel] = useState("auto-select");
  const [result, setResult] = useState<ComposedArticle | null>(null);
  const [editableResult, setEditableResult] = useState<ComposedArticle | null>(null);

  const composeMut = trpc.admin.aiContent.composeArticle.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setEditableResult(data);
    },
    onError: (err) => toast.error(err.message || "Failed to compose article"),
  });

  const handleGenerate = () => {
    if (brief.trim().length < 20) {
      toast.error("Please add at least a sentence or two to the brief");
      return;
    }
    composeMut.mutate({
      brief: brief.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      tone,
      targetWordCount: targetWords,
      focusKeyword: focusKeyword.trim() || undefined,
      policyId,
      provider,
      model,
    });
  };

  const handleApply = () => {
    if (!editableResult) return;
    onApply(editableResult);
    toast.success("Draft populated — review and edit before publishing");
    handleClose();
  };

  const handleClose = () => {
    setResult(null);
    setEditableResult(null);
    onOpenChange(false);
  };

  const isLoading = composeMut.isPending;

  const updateEditableField = (field: string, value: any) => {
    if (!editableResult) return;
    setEditableResult({
      ...editableResult,
      [field]: value,
    });
  };

  const addTag = (tag: string) => {
    if (!editableResult || !tag.trim()) return;
    if (!editableResult.suggestedTags.includes(tag.trim())) {
      updateEditableField("suggestedTags", [...editableResult.suggestedTags, tag.trim()]);
    }
  };

  const removeTag = (tag: string) => {
    if (!editableResult) return;
    updateEditableField("suggestedTags", editableResult.suggestedTags.filter(t => t !== tag));
  };

  const addSecondaryCategory = (cat: string) => {
    if (!editableResult || !cat.trim()) return;
    if (!editableResult.secondaryCategories.includes(cat.trim())) {
      updateEditableField("secondaryCategories", [...editableResult.secondaryCategories, cat.trim()]);
    }
  };

  const removeSecondaryCategory = (cat: string) => {
    if (!editableResult) return;
    updateEditableField("secondaryCategories", editableResult.secondaryCategories.filter(c => c !== cat));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <div className="border-b bg-white px-6 py-5 sticky top-0 z-10">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              AI Compose — Full Article Draft
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Describe the story or paste source material. AI generates everything: title, body, SEO, entities, location, funding, and categories. Edit any field before applying.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          {!result ? (
            <div className="space-y-6">
              {/* Brief textarea */}
              <div className="space-y-2">
                <Label htmlFor="ai-compose-brief" className="font-semibold text-foreground">
                  Brief <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="ai-compose-brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={"e.g., Riyadh-based fintech Tabby raised $200M Series D led by Wellington at a $3.3B valuation. Plans regional expansion into Egypt and Kuwait. Founder Hosam Arab quote on B2B push."}
                  rows={8}
                  disabled={isLoading}
                  className="resize-none border-border bg-white text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  {brief.length} chars · paste a press release, your notes, or a paragraph describing the story
                </p>
              </div>

              {/* Source URL + Focus keyword */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-compose-source" className="font-medium text-foreground">
                    Source URL <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="ai-compose-source"
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://example.com/press-release"
                    disabled={isLoading}
                    className="border-border bg-white text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-compose-keyword" className="font-medium text-foreground">
                    Focus keyword <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="ai-compose-keyword"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="e.g., Saudi fintech funding"
                    disabled={isLoading}
                    className="border-border bg-white text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              {/* Tone + Target word count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-foreground">Tone</Label>
                  <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)} disabled={isLoading}>
                    <SelectTrigger className="border-border bg-white text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{t.label}</span>
                            <span className="text-xs text-muted-foreground">{t.hint}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-compose-words" className="font-medium text-foreground">
                    Target word count
                  </Label>
                  <Input
                    id="ai-compose-words"
                    type="number"
                    min={200}
                    max={3000}
                    step={50}
                    value={targetWords}
                    onChange={(e) => setTargetWords(Number(e.target.value) || 700)}
                    disabled={isLoading}
                    className="border-border bg-white text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              {/* Editorial Policy + AI Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium text-foreground">
                    Editorial Policy <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Select value={policyId?.toString() || "default"} onValueChange={(v) => setPolicyId(v === "default" ? undefined : Number(v))} disabled={isLoading}>
                    <SelectTrigger className="border-border bg-white text-foreground">
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      {/* TODO: Fetch editorial policies from backend */}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium text-foreground">
                    AI Model <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Select value={provider} onValueChange={setProvider} disabled={isLoading}>
                      <SelectTrigger className="border-border bg-white text-foreground flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="built-in">Built-in</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={model} onValueChange={setModel} disabled={isLoading}>
                      <SelectTrigger className="border-border bg-white text-foreground flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto-select">Auto-select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          ) : editableResult ? (
            <div className="space-y-6">
              {/* Success message */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-medium">Draft ready!</p>
                <p className="text-xs mt-1">Edit any field below, then apply to populate the editor.</p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</Label>
                <Input
                  value={editableResult.title}
                  onChange={(e) => updateEditableField("title", e.target.value)}
                  className="text-lg font-bold border-border"
                />
              </div>

              {/* Slug + Focus keyword */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Slug</Label>
                  <Input
                    value={editableResult.slug}
                    onChange={(e) => updateEditableField("slug", e.target.value)}
                    className="font-mono text-sm border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Focus keyword</Label>
                  <Input
                    value={editableResult.focusKeyword}
                    onChange={(e) => updateEditableField("focusKeyword", e.target.value)}
                    className="text-sm border-border"
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Excerpt</Label>
                <Textarea
                  value={editableResult.excerpt}
                  onChange={(e) => updateEditableField("excerpt", e.target.value)}
                  rows={3}
                  className="text-sm border-border resize-none"
                />
              </div>

              {/* SEO Title + Meta Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SEO Title</Label>
                  <Input
                    value={editableResult.seoTitle}
                    onChange={(e) => updateEditableField("seoTitle", e.target.value)}
                    className="text-sm border-border"
                  />
                  <p className="text-xs text-muted-foreground">{editableResult.seoTitle.length} chars</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta Description</Label>
                  <Input
                    value={editableResult.metaDescription}
                    onChange={(e) => updateEditableField("metaDescription", e.target.value)}
                    className="text-sm border-border"
                  />
                  <p className="text-xs text-muted-foreground">{editableResult.metaDescription.length} chars</p>
                </div>
              </div>

              {/* Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Primary Category</Label>
                  <Input
                    value={editableResult.primaryCategory}
                    onChange={(e) => updateEditableField("primaryCategory", e.target.value)}
                    className="text-sm border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Secondary Categories</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editableResult.secondaryCategories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="bg-blue-100 text-blue-900 border-blue-200 cursor-pointer" onClick={() => removeSecondaryCategory(cat)}>
                        {cat} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Type and press Enter to add"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addSecondaryCategory((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                    className="text-sm border-border"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editableResult.suggestedTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-border text-foreground cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Type and press Enter to add"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addTag((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                  className="text-sm border-border"
                />
              </div>

              {/* Entities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Companies</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editableResult.entities.companies.map((co) => (
                      <Badge key={co} variant="secondary" className="bg-purple-100 text-purple-900 border-purple-200">
                        {co}
                      </Badge>
                    ))}
                  </div>
                  {editableResult.entities.companies.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">People</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editableResult.entities.people.map((p) => (
                      <Badge key={p} variant="secondary" className="bg-orange-100 text-orange-900 border-orange-200">
                        {p}
                      </Badge>
                    ))}
                  </div>
                  {editableResult.entities.people.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                </div>
              </div>

              {/* Location */}
              {editableResult.location && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">City</Label>
                    <p className="text-sm text-foreground">{editableResult.location.city || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</Label>
                    <p className="text-sm text-foreground">{editableResult.location.country || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Region</Label>
                    <p className="text-sm text-foreground">{editableResult.location.region || "—"}</p>
                  </div>
                </div>
              )}

              {/* Funding */}
              {!!editableResult.funding.isFundingArticle && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Company</Label>
                    <p className="text-sm text-amber-900">{editableResult.funding.company || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Amount</Label>
                    <p className="text-sm text-amber-900">{editableResult.funding.amount || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Stage</Label>
                    <p className="text-sm text-amber-900">{editableResult.funding.stage || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Investors</Label>
                    <div className="flex flex-wrap gap-1">
                      {editableResult.funding?.investors?.map((inv) => (
                        <Badge key={inv} variant="secondary" className="bg-amber-200 text-amber-900 border-amber-300 text-xs">
                          {inv}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Body preview */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body preview</Label>
                <div
                  className="prose prose-sm max-w-none border border-border rounded-lg p-4 max-h-72 overflow-y-auto bg-white text-foreground"
                  dangerouslySetInnerHTML={{ __html: editableResult.bodyHtml }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t bg-white px-6 py-4 gap-2 sticky bottom-0">
          {!result ? (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={isLoading} className="text-foreground hover:bg-gray-100">
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isLoading || brief.trim().length < 20}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Composing…</>
                  : <><Wand2 className="h-4 w-4 mr-2" /> Generate draft</>}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                onClick={() => setResult(null)} 
                disabled={isLoading}
                className="text-foreground hover:bg-gray-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Try again
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose} 
                disabled={isLoading}
                className="border-border text-foreground hover:bg-gray-50"
              >
                Discard
              </Button>
              <Button 
                onClick={handleApply}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" /> Apply to editor
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
