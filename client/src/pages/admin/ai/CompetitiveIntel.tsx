import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Eye, Plus, Trash2, TrendingUp, BarChart3, ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CompetitiveIntelPanel() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ name: "", url: "", rssUrl: "" });

  const competitors = trpc.admin.aiExtended.getCompetitorSources.useQuery();
  const analysis = trpc.admin.aiExtended.getCompetitorArticles.useQuery({});

  const addCompetitor = trpc.admin.aiExtended.createCompetitorSource.useMutation({
    onSuccess: () => {
      toast({ title: "Competitor added" });
      competitors.refetch();
      setShowAdd(false);
      setNewCompetitor({ name: "", url: "", rssUrl: "" });
    },
  });

  const removeCompetitor = trpc.admin.aiExtended.deleteCompetitorSource.useMutation({
    onSuccess: () => { toast({ title: "Competitor removed" }); competitors.refetch(); },
  });

  const refreshAnalysis = { mutate: () => { analysis.refetch(); toast({ title: "Analysis refreshed" }); }, isPending: analysis.isRefetching };

  return (

      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitive Intelligence</h1>
          <p className="text-muted-foreground mt-1">Monitor competitors and identify content gaps</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refreshAnalysis.mutate()} disabled={refreshAnalysis.isPending}>
            {refreshAnalysis.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh Analysis
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Competitor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Competitor</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={newCompetitor.name} onChange={e => setNewCompetitor({ ...newCompetitor, name: e.target.value })} placeholder="e.g., Wamda" />
                </div>
                <div>
                  <Label>Website URL *</Label>
                  <Input value={newCompetitor.url} onChange={e => setNewCompetitor({ ...newCompetitor, url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>RSS Feed URL (optional)</Label>
                  <Input value={newCompetitor.rssUrl} onChange={e => setNewCompetitor({ ...newCompetitor, rssUrl: e.target.value })} placeholder="https://.../feed" />
                </div>
                <Button
                  className="w-full"
                  onClick={() => addCompetitor.mutate(newCompetitor)}
                  disabled={addCompetitor.isPending || !newCompetitor.name || !newCompetitor.url}
                >
                  {addCompetitor.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Competitor
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Eye className="h-8 w-8 mx-auto text-primary" />
            <div className="text-3xl font-bold mt-2">{competitors.data?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Tracked Competitors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-green-500" />
            <div className="text-3xl font-bold mt-2">{Array.isArray(analysis.data) ? analysis.data.filter((a: any) => a.isCoverageGap).length : 0}</div>
            <p className="text-sm text-muted-foreground">Content Gaps Found</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-blue-500" />
            <div className="text-3xl font-bold mt-2">{Array.isArray(analysis.data) ? analysis.data.length : 0}</div>
            <p className="text-sm text-muted-foreground">Trending Topics</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracked Competitors</CardTitle>
          <CardDescription>Competitors being monitored for content and coverage analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {competitors.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !competitors.data?.length ? (
            <p className="text-center text-muted-foreground py-8">No competitors tracked yet. Add your first competitor above.</p>
          ) : (
            <div className="space-y-2">
              {competitors.data.map((c: any) => (
                <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-medium">{c.name}</span>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> {c.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.rssUrl && <Badge variant="outline" className="text-xs">RSS</Badge>}
                    <Badge variant="outline">{c.articlesTracked || 0} articles</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeCompetitor.mutate({ id: c.id })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(analysis.data as any)?.contentGaps?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Content Gaps</CardTitle>
            <CardDescription>Topics your competitors cover that you haven't written about</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(analysis.data as any).contentGaps.map((gap: any, i: number) => (
                <div key={i} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{gap.topic}</span>
                    <p className="text-xs text-muted-foreground">Covered by: {gap.coveredBy?.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={gap.priority === "high" ? "bg-red-500/10 text-red-500" : gap.priority === "medium" ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500"}>
                      {gap.priority}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: "Feature coming soon", description: "Auto-generate article from content gap" })}>
                      Generate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(analysis.data as any)?.trendingTopics?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trending Topics Across Competitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(analysis.data as any).trendingTopics.map((topic: any, i: number) => (
                <Badge key={i} variant="outline" className="px-3 py-1.5 text-sm cursor-pointer hover:bg-primary/10">
                  {topic.name} <span className="ml-1 text-muted-foreground">({topic.count})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>

  );;
}

// Backwards-compatible default export — wraps the panel in AdminLayout
// so the standalone route keeps working while the panel embeds in AIStudio.
export default function CompetitiveIntelPanelPage() {
  return (
    <AdminLayout>
      <CompetitiveIntelPanel />
    </AdminLayout>
  );
}
