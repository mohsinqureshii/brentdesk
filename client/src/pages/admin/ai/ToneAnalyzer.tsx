import { useState } from "react";
import { publication } from "@shared/publication";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mic, BarChart3, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ToneAnalyzerPanel() {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [result, setResult] = useState<any>(null);

  const analyzeTone = trpc.admin.aiExtended.analyzeTone.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Tone analysis complete" });
    },
  });

  const handleAnalyze = () => {
    if (!content.trim()) return toast({ title: "Enter content to analyze", variant: "destructive" });
    analyzeTone.mutate({ content });
  };

  const toneColor = (tone: string) => {
    const colors: Record<string, string> = {
      professional: "bg-blue-500/10 text-blue-500",
      casual: "bg-green-500/10 text-green-500",
      formal: "bg-purple-500/10 text-purple-500",
      neutral: "bg-gray-500/10 text-gray-500",
      optimistic: "bg-yellow-500/10 text-yellow-500",
      critical: "bg-red-500/10 text-red-500",
      informative: "bg-cyan-500/10 text-cyan-500",
      persuasive: "bg-orange-500/10 text-orange-500",
    };
    return colors[tone?.toLowerCase()] || "bg-gray-500/10 text-gray-500";
  };

  return (

      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tone Analyzer</h1>
        <p className="text-muted-foreground mt-1">Analyze the tone, sentiment, and readability of your content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mic className="h-5 w-5" /> Analyze Content Tone</CardTitle>
          <CardDescription>Paste your content below to analyze its tone and get improvement suggestions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Content</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={8} placeholder="Paste your article content here..." />
            <p className="text-xs text-muted-foreground mt-1">{content.split(/\s+/).filter(Boolean).length} words</p>
          </div>
          <Button onClick={handleAnalyze} disabled={analyzeTone.isPending} className="w-full">
            {analyzeTone.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
            Analyze Tone
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Badge className={`text-lg px-4 py-2 ${toneColor(result.primaryTone)}`}>{result.primaryTone || "Unknown"}</Badge>
                <p className="text-sm text-muted-foreground mt-2">Primary Tone</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold">{result.sentimentScore?.toFixed(1) || "0.0"}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Sentiment ({result.sentimentScore > 0 ? "Positive" : result.sentimentScore < 0 ? "Negative" : "Neutral"})
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold">{result.readabilityGrade || "N/A"}</div>
                <p className="text-sm text-muted-foreground mt-1">Readability Grade</p>
              </CardContent>
            </Card>
          </div>

          {result.toneBreakdown?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Tone Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.toneBreakdown.map((t: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <Badge className={`w-28 justify-center ${toneColor(t.tone)}`}>{t.tone}</Badge>
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${t.percentage}%` }} />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{t.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.suggestions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.suggestions.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.editorialCompliance !== undefined && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Editorial Policy Compliance</h3>
                    <p className="text-sm text-muted-foreground">How well the content aligns with {publication.name} editorial standards</p>
                  </div>
                  <div className={`text-3xl font-bold ${result.editorialCompliance >= 80 ? "text-green-500" : result.editorialCompliance >= 60 ? "text-yellow-500" : "text-red-500"}`}>
                    {result.editorialCompliance}%
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>

  );;
}

// Backwards-compatible default export — wraps the panel in AdminLayout
// so the standalone route keeps working while the panel embeds in AIStudio.
export default function ToneAnalyzerPanelPage() {
  return (
    <AdminLayout>
      <ToneAnalyzerPanel />
    </AdminLayout>
  );
}
