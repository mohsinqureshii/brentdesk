import { useState } from "react";
import { publication } from "@shared/publication";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Share2, Copy, CheckCircle, Twitter, Linkedin, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SocialMediaPanel() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["twitter", "linkedin"]);
  const [results, setResults] = useState<any[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const generatePosts = trpc.admin.aiExtended.generateSocialPosts.useMutation({
    onSuccess: (data) => {
      setResults(data as any[]);
      toast({ title: "Social posts generated" });
    },
  });

  const togglePlatform = (platform: string) => {
    setPlatforms(prev => prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]);
  };

  const handleGenerate = () => {
    if (!title.trim()) return toast({ title: "Enter an article title", variant: "destructive" });
    if (platforms.length === 0) return toast({ title: "Select at least one platform", variant: "destructive" });
    generatePosts.mutate({ title, content, platforms: platforms as ("twitter" | "facebook" | "instagram" | "linkedin" | "threads")[] });
  };

  const copyPost = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const platformIcon = (platform: string) => {
    switch (platform) {
      case "twitter": return <Twitter className="h-4 w-4" />;
      case "linkedin": return <Linkedin className="h-4 w-4" />;
      case "instagram": return <Instagram className="h-4 w-4" />;
      default: return <Share2 className="h-4 w-4" />;
    }
  };

  const platformColor = (platform: string) => {
    switch (platform) {
      case "twitter": return "bg-sky-500/10 text-sky-500";
      case "linkedin": return "bg-blue-600/10 text-blue-600";
      case "instagram": return "bg-pink-500/10 text-pink-500";
      case "facebook": return "bg-blue-500/10 text-blue-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  return (

      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Media Generator</h1>
        <p className="text-muted-foreground mt-1">Generate platform-specific social media posts from your articles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" /> Generate Posts</CardTitle>
          <CardDescription>Enter article details to generate social media content for each platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Article Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter article title..." />
          </div>
          <div>
            <Label>Article Content / Summary</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Paste article content or summary..." />
          </div>
          <div>
            <Label>Article URL</Label>
            <Input value={articleUrl} onChange={e => setArticleUrl(e.target.value)} placeholder={`${publication.siteUrl}/...`} />
          </div>
          <div>
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {["twitter", "linkedin", "instagram", "facebook", "threads"].map(p => (
                <div key={p} className="flex items-center gap-2">
                  <Checkbox checked={platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} id={p} />
                  <label htmlFor={p} className="text-sm capitalize cursor-pointer">{p}</label>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generatePosts.isPending} className="w-full">
            {generatePosts.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
            Generate Social Posts
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Generated Posts</h2>
          {results.map((post: any, idx: number) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {platformIcon(post.platform)}
                    <Badge className={platformColor(post.platform)}>{post.platform}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyPost(post.content, idx)}>
                    {copied === idx ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                {post.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {post.hashtags.map((tag: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">#{tag}</Badge>
                    ))}
                  </div>
                )}
                {post.characterCount && (
                  <p className="text-xs text-muted-foreground mt-2">{post.characterCount} characters</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>

  );;
}

// Backwards-compatible default export — wraps the panel in AdminLayout
// so the standalone route keeps working while the panel embeds in AIStudio.
export default function SocialMediaPanelPage() {
  return (
    <AdminLayout>
      <SocialMediaPanel />
    </AdminLayout>
  );
}
