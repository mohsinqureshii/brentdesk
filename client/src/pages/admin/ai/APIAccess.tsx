import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Key, Plus, Trash2, Copy, CheckCircle, Eye, EyeOff, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function APIAccess() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState({ name: "", rateLimit: "100" });
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<number | null>(null);

  const apiKeys = trpc.admin.aiExtended.getApiKeys.useQuery();

  const createKey = trpc.admin.aiExtended.createApiKey.useMutation({
    onSuccess: (data) => {
      toast({ title: "API key created", description: "Make sure to copy your key — it won't be shown again." });
      apiKeys.refetch();
      setShowCreate(false);
      setNewKey({ name: "", rateLimit: "100" });
      if (data && (data as any).key) {
        navigator.clipboard.writeText((data as any).key);
        toast({ title: "Key copied to clipboard" });
      }
    },
  });

  const revokeKey = trpc.admin.aiExtended.revokeApiKey.useMutation({
    onSuccess: () => { toast({ title: "API key revoked" }); apiKeys.refetch(); },
  });

  const toggleReveal = (id: number) => {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyKey = (key: string, id: number) => {
    navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Key copied" });
  };

  const maskKey = (key: string) => key ? `${key.substring(0, 8)}${"•".repeat(24)}${key.substring(key.length - 4)}` : "••••••••";

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Access</h1>
          <p className="text-muted-foreground mt-1">Manage API keys for programmatic access to AI content generation</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Create API Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Key Name *</Label>
                <Input value={newKey.name} onChange={e => setNewKey({ ...newKey, name: e.target.value })} placeholder="e.g., Production Integration" />
              </div>
              <div>
                <Label>Rate Limit (requests/hour)</Label>
                <Input type="number" value={newKey.rateLimit} onChange={e => setNewKey({ ...newKey, rateLimit: e.target.value })} />
              </div>
              <Button
                className="w-full"
                onClick={() => createKey.mutate({ name: newKey.name, rateLimit: parseInt(newKey.rateLimit) })}
                disabled={createKey.isPending || !newKey.name}
              >
                {createKey.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                Generate Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</CardTitle>
          <CardDescription>Active API keys for accessing the AI content generation API</CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !apiKeys.data?.length ? (
            <p className="text-center text-muted-foreground py-8">No API keys created yet</p>
          ) : (
            <div className="space-y-3">
              {apiKeys.data.map((key: any) => (
                <div key={key.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      <Badge variant={key.isActive ? "default" : "secondary"}>{key.isActive ? "Active" : "Revoked"}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleReveal(key.id)}>
                        {revealedKeys.has(key.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      {key.keyPrefix && (
                        <Button variant="ghost" size="sm" onClick={() => copyKey(key.keyPrefix, key.id)}>
                          {copied === key.id ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                      {!!key.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => revokeKey.mutate({ id: key.id })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <code className="bg-muted px-2 py-1 rounded font-mono">
                      {revealedKeys.has(key.id) ? key.keyPrefix : maskKey(key.keyPrefix || "")}
                    </code>
                    <span>Rate: {key.rateLimit}/hr</span>
                    <span>Used: {key.totalRequests || 0} requests</span>
                    <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                    {key.lastUsed && <span>Last used: {new Date(key.lastUsed).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" /> API Documentation</CardTitle>
          <CardDescription>Quick reference for using the AI Content Generation API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-semibold mb-2">Generate Content</p>
            <pre className="text-xs overflow-x-auto">{`POST /api/v1/ai/generate
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "contentType": "article",
  "title": "Your Article Title",
  "sourceUrl": "https://source-url.com",
  "sourceText": "Optional source text...",
  "model": "built-in",
  "policyId": null,
  "templateId": null
}`}</pre>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-semibold mb-2">Check Generation Status</p>
            <pre className="text-xs overflow-x-auto">{`GET /api/v1/ai/sessions/{sessionId}
Authorization: Bearer YOUR_API_KEY`}</pre>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-semibold mb-2">List Sessions</p>
            <pre className="text-xs overflow-x-auto">{`GET /api/v1/ai/sessions?page=1&limit=20
Authorization: Bearer YOUR_API_KEY`}</pre>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-semibold mb-2">Response Format</p>
            <pre className="text-xs overflow-x-auto">{`{
  "success": true,
  "data": {
    "sessionId": "abc123",
    "status": "completed",
    "content": "Generated article content...",
    "entities": [...],
    "metadata": { "model": "...", "tokensUsed": 1234 }
  }
}`}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );;
}
