import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Video, Mic2, Copy, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ScriptGeneratorPanel() {
  const { toast } = useToast();
  const [scriptType, setScriptType] = useState("podcast");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [duration, setDuration] = useState("5");
  const [style, setStyle] = useState("conversational");
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generateScript = trpc.admin.aiExtended.generateScript.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Script generated" });
    },
  });

  const handleGenerate = () => {
    if (!title.trim()) return toast({ title: "Enter a title", variant: "destructive" });
    generateScript.mutate({ type: scriptType as "video" | "podcast", title, content, duration: parseInt(duration), style });
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: `${label} copied` });
  };

  return (

      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Script Generator</h1>
        <p className="text-muted-foreground mt-1">Generate podcast and video scripts from your articles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {scriptType === "podcast" ? <Mic2 className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            Generate Script
          </CardTitle>
          <CardDescription>Create professional scripts for podcasts or video content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Script Type</Label>
              <Select value={scriptType} onValueChange={setScriptType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="podcast">Podcast Script</SelectItem>
                  <SelectItem value="video">Video Script</SelectItem>
                  <SelectItem value="short_video">Short Video (Reels/TikTok)</SelectItem>
                  <SelectItem value="interview">Interview Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="formal">Formal / News</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="storytelling">Storytelling</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Title / Topic *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., MENA Startup Funding Q4 2025 Recap" />
          </div>
          <div>
            <Label>Source Content (optional)</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Paste article content to base the script on..." />
          </div>
          <div>
            <Label>Target Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="3">3 minutes</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generateScript.isPending} className="w-full">
            {generateScript.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : scriptType === "podcast" ? <Mic2 className="h-4 w-4 mr-2" /> : <Video className="h-4 w-4 mr-2" />}
            Generate Script
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 mx-auto text-primary" />
                <div className="text-2xl font-bold mt-2">{result.estimatedDuration || duration} min</div>
                <p className="text-sm text-muted-foreground">Estimated Duration</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{result.wordCount || 0}</div>
                <p className="text-sm text-muted-foreground">Word Count</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Badge className="text-lg px-4 py-2">{scriptType}</Badge>
                <p className="text-sm text-muted-foreground mt-2">Script Type</p>
              </CardContent>
            </Card>
          </div>

          {result.sections?.map((section: any, idx: number) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{section.title || `Section ${idx + 1}`}</CardTitle>
                  <div className="flex items-center gap-2">
                    {section.timestamp && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{section.timestamp}</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => copyText(section.content, `Section ${idx + 1}`)}>
                      {copied === `Section ${idx + 1}` ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                {section.speakerNotes && <CardDescription>{section.speakerNotes}</CardDescription>}
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap">{section.content}</pre>
                {section.visualCues && (
                  <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
                    <strong>Visual Cues:</strong> {section.visualCues}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {!result.sections && result.script && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Full Script</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyText(result.script, "Script")}>
                    {copied === "Script" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap">{result.script}</pre>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" className="w-full" onClick={() => copyText(
            result.sections?.map((s: any) => `## ${s.title}\n${s.content}`).join("\n\n") || result.script || "",
            "Full Script"
          )}>
            {copied === "Full Script" ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy Full Script
          </Button>
        </>
      )}
    </div>

  );;
}

// Backwards-compatible default export — wraps the panel in AdminLayout
// so the standalone route keeps working while the panel embeds in AIStudio.
export default function ScriptGeneratorPanelPage() {
  return (
    <AdminLayout>
      <ScriptGeneratorPanel />
    </AdminLayout>
  );
}
