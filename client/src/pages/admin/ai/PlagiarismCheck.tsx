import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PlagiarismCheckPanel() {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [result, setResult] = useState<any>(null);

  const checkPlagiarism = trpc.admin.aiExtended.checkPlagiarism.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Plagiarism check complete" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleCheck = () => {
    if (!content.trim()) return toast({ title: "Enter content to check", variant: "destructive" });
    checkPlagiarism.mutate({ content });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-500/10 text-red-500";
      case "medium": return "bg-yellow-500/10 text-yellow-500";
      default: return "bg-green-500/10 text-green-500";
    }
  };

  return (

      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plagiarism Check</h1>
        <p className="text-muted-foreground mt-1">AI-powered originality analysis and duplicate content detection</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Check Content Originality</CardTitle>
          <CardDescription>Paste your content to check for potential plagiarism and duplicate content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Content to Check</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={10} placeholder="Paste article content here..." />
            <p className="text-xs text-muted-foreground mt-1">{content.split(/\s+/).filter(Boolean).length} words</p>
          </div>
          <Button onClick={handleCheck} disabled={checkPlagiarism.isPending} className="w-full">
            {checkPlagiarism.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
            Check for Plagiarism
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className={`text-5xl font-bold ${getScoreColor(result.originalityScore || 0)}`}>
                  {result.originalityScore || 0}%
                </div>
                <p className="text-sm text-muted-foreground mt-2">Originality Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-5xl font-bold">{result.flaggedSections?.length || 0}</div>
                <p className="text-sm text-muted-foreground mt-2">Flagged Sections</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center flex flex-col items-center">
                {(result.originalityScore || 0) >= 90 ? (
                  <CheckCircle className="h-12 w-12 text-green-500" />
                ) : (
                  <AlertTriangle className="h-12 w-12 text-yellow-500" />
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {(result.originalityScore || 0) >= 90 ? "Content appears original" : "Review flagged sections"}
                </p>
              </CardContent>
            </Card>
          </div>

          {result.flaggedSections?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Flagged Sections</CardTitle>
                <CardDescription>These sections may contain content similar to existing sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.flaggedSections.map((section: any, i: number) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getSeverityColor(section.severity)}>{section.severity} similarity</Badge>
                      <span className="text-sm font-medium">{section.similarityPercentage}% match</span>
                    </div>
                    <p className="text-sm bg-muted/50 p-3 rounded italic">"{section.text}"</p>
                    {section.possibleSource && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        <span>Possible source: {section.possibleSource}</span>
                      </div>
                    )}
                    {section.suggestion && (
                      <p className="text-sm text-primary">Suggestion: {section.suggestion}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.recommendations?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recommendations</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
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
export default function PlagiarismCheckPanelPage() {
  return (
    <AdminLayout>
      <PlagiarismCheckPanel />
    </AdminLayout>
  );
}
