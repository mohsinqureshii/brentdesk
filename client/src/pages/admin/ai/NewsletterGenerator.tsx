import { useState } from "react";
import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Copy, CheckCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";

export function NewsletterGeneratorPanel() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [topics, setTopics] = useState("");
  const [tone, setTone] = useState("professional");
  const [result, setResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const generateNewsletter = trpc.admin.aiExtended.generateNewsletter.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Newsletter generated" });
    },
  });

  const handleGenerate = () => {
    if (!title.trim()) return toast({ title: "Enter a newsletter title", variant: "destructive" });
    generateNewsletter.mutate({
      title,
      style: tone as "daily" | "weekly" | "monthly",
      customInstructions: topics,
    });
  };

  const copyContent = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: `${label} copied` });
  };

  return (

      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Newsletter Generator</h1>
        <p className="text-muted-foreground mt-1">Generate professional newsletter content with AI</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Generate Newsletter</CardTitle>
          <CardDescription>Create newsletter content based on recent articles and topics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Newsletter Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={`e.g., ${publication.name} Weekly: GCC Infrastructure Roundup`} />
          </div>
          <div>
            <Label>Key Topics (comma-separated)</Label>
            <Textarea value={topics} onChange={e => setTopics(e.target.value)} rows={3} placeholder="e.g., NEOM contract awards, GCC logistics, Saudi giga-projects, energy transition" />
          </div>
          <div>
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual & Friendly</SelectItem>
                <SelectItem value="executive">Executive Brief</SelectItem>
                <SelectItem value="analytical">Analytical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generateNewsletter.isPending} className="w-full">
            {generateNewsletter.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Generate Newsletter
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generated Newsletter</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                    <Eye className="h-4 w-4 mr-1" /> {showPreview ? "Hide" : "Show"} Preview
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-semibold">Subject Line</Label>
                  <Button variant="ghost" size="sm" onClick={() => copyContent(result.subject || "", "Subject")}>
                    {copied === "Subject" ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-sm">{result.subject}</p>
              </div>

              {result.preheader && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-semibold">Preheader</Label>
                    <Button variant="ghost" size="sm" onClick={() => copyContent(result.preheader, "Preheader")}>
                      {copied === "Preheader" ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.preheader}</p>
                </div>
              )}

              {showPreview && result.htmlContent && (
                <div className="border rounded-lg p-4">
                  <Label className="font-semibold mb-2 block">HTML Preview</Label>
                  <div className="bg-white rounded p-4 max-h-[500px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: result.htmlContent }} />
                </div>
              )}

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-semibold">Plain Text Version</Label>
                  <Button variant="ghost" size="sm" onClick={() => copyContent(result.textContent || "", "Text")}>
                    {copied === "Text" ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <pre className="text-sm whitespace-pre-wrap text-muted-foreground max-h-[300px] overflow-y-auto">{result.textContent}</pre>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => copyContent(result.htmlContent || "", "HTML")}>
                  {copied === "HTML" ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  Copy HTML
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => copyContent(result.textContent || "", "Plain Text")}>
                  {copied === "Plain Text" ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  Copy Plain Text
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </div>

  );
}

// Backwards-compatible default export — wraps the panel in AdminLayout
// so the standalone route keeps working while the panel embeds in AIStudio.
export default function NewsletterGeneratorPanelPage() {
  return (
    <AdminLayout>
      <NewsletterGeneratorPanel />
    </AdminLayout>
  );
}
