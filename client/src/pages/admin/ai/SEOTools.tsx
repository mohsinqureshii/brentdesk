import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, TrendingUp, Target, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Default export: standalone admin page at /admin/ai/seo.
 * Kept for bookmark compat; canonical home is now SEO Manager → Health → AI Studio.
 */
export default function SEOTools() {
  return (
    <AdminLayout>
      <div className="p-6">
        <SEOToolsPanel />
      </div>
    </AdminLayout>
  );
}

/**
 * Layout-free panel embedded inside SEO Manager → Health → AI Studio.
 * Single source of truth for the AI SEO analysis UI.
 */
export function SEOToolsPanel() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");
  const [seoResult, setSeoResult] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const optimizeSEO = trpc.admin.aiExtended.generateSEO.useMutation({
    onSuccess: (data) => {
      setSeoResult(data);
      toast({ title: "SEO analysis complete" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleOptimize = () => {
    if (!title.trim() && !content.trim()) return toast({ title: "Enter a title or content", variant: "destructive" });
    optimizeSEO.mutate({ title, content });
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: `${label} copied` });
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">SEO Optimization Tools</h2>
        <p className="text-muted-foreground mt-1">AI-powered SEO analysis and optimization for your content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Analyze Content</CardTitle>
          <CardDescription>Enter your article title and content for SEO optimization suggestions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Article Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter article title..." />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="Paste article content..." />
          </div>
          <div>
            <Label>Target Keywords (comma-separated)</Label>
            <Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g., MENA tech, startup funding, Saudi Arabia" />
          </div>
          <Button onClick={handleOptimize} disabled={optimizeSEO.isPending} className="w-full">
            {optimizeSEO.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            Analyze & Optimize
          </Button>
        </CardContent>
      </Card>

      {seoResult && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className={`text-4xl font-bold ${scoreColor(seoResult.overallScore || 0)}`}>
                  {seoResult.overallScore || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className={`text-4xl font-bold ${scoreColor(seoResult.readabilityScore || 0)}`}>
                  {seoResult.readabilityScore || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Readability</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className={`text-4xl font-bold ${scoreColor(seoResult.keywordScore || 0)}`}>
                  {seoResult.keywordScore || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Keyword Usage</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className={`text-4xl font-bold ${scoreColor(seoResult.structureScore || 0)}`}>
                  {seoResult.structureScore || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Structure</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Optimized Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {seoResult.optimizedTitle && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-semibold">Optimized Title</Label>
                    <Button variant="ghost" size="sm" onClick={() => copyText(seoResult.optimizedTitle, "Title")}>
                      {copied === "Title" ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-sm">{seoResult.optimizedTitle}</p>
                </div>
              )}

              {seoResult.metaDescription && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-semibold">Meta Description</Label>
                    <Button variant="ghost" size="sm" onClick={() => copyText(seoResult.metaDescription, "Meta")}>
                      {copied === "Meta" ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{seoResult.metaDescription}</p>
                  <p className="text-xs text-muted-foreground mt-1">{seoResult.metaDescription?.length || 0}/160 characters</p>
                </div>
              )}

              {seoResult.suggestedKeywords?.length > 0 && (
                <div className="border rounded-lg p-4">
                  <Label className="font-semibold">Suggested Keywords</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {seoResult.suggestedKeywords.map((kw: string, i: number) => (
                      <Badge key={i} variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => copyText(kw, kw)}>
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {seoResult.improvements?.length > 0 && (
                <div className="border rounded-lg p-4">
                  <Label className="font-semibold">Improvement Suggestions</Label>
                  <ul className="mt-2 space-y-2">
                    {seoResult.improvements.map((imp: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Badge className={`flex-shrink-0 ${imp.priority === "high" ? "bg-red-500/10 text-red-500" : imp.priority === "medium" ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500"}`}>
                          {imp.priority}
                        </Badge>
                        <span>{imp.suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
