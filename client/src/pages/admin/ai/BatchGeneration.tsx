import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Play, RefreshCw, ListChecks } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BatchGenerationPanel() {
  const { toast } = useToast();
  const [jobName, setJobName] = useState("");
  const [items, setItems] = useState<Array<{ title: string; sourceUrl: string; sourceText: string; contentType: string }>>([
    { title: "", sourceUrl: "", sourceText: "", contentType: "article" },
  ]);

  const batchJobs = trpc.admin.aiExtended.getBatchJobs.useQuery();
  const createBatch = trpc.admin.aiExtended.createBatchJob.useMutation({
    onSuccess: () => {
      toast({ title: "Batch job created", description: "Processing will begin shortly." });
      batchJobs.refetch();
      setJobName("");
      setItems([{ title: "", sourceUrl: "", sourceText: "", contentType: "article" }]);
    },
  });
  // Batch jobs run automatically on creation. This is a placeholder for re-run.
  const runBatch = { mutate: (_input: { jobId: number }) => {
    toast({ title: "Batch jobs run automatically on creation" });
    batchJobs.refetch();
  }, isPending: false };

  const addItem = () => setItems([...items, { title: "", sourceUrl: "", sourceText: "", contentType: "article" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const handleCreate = () => {
    if (!jobName.trim()) return toast({ title: "Enter a batch name", variant: "destructive" });
    const validItems = items.filter(i => i.title.trim());
    if (validItems.length === 0) return toast({ title: "Add at least one item", variant: "destructive" });
    createBatch.mutate({ name: jobName, items: validItems });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500";
      case "running": return "bg-blue-500/10 text-blue-500";
      case "failed": return "bg-red-500/10 text-red-500";
      default: return "bg-yellow-500/10 text-yellow-500";
    }
  };

  return (

      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Batch Generation</h1>
        <p className="text-muted-foreground mt-1">Generate multiple articles at once with batch processing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" /> New Batch Job</CardTitle>
          <CardDescription>Add multiple items to generate content in bulk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Batch Name</Label>
            <Input value={jobName} onChange={e => setJobName(e.target.value)} placeholder="e.g., Weekly MENA Funding Articles" />
          </div>

          <div className="space-y-3">
            <Label>Items ({items.length})</Label>
            {items.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Title *</Label>
                    <Input value={item.title} onChange={e => updateItem(idx, "title", e.target.value)} placeholder="Article title" />
                  </div>
                  <div>
                    <Label className="text-xs">Content Type</Label>
                    <Select value={item.contentType} onValueChange={v => updateItem(idx, "contentType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="person">Person</SelectItem>
                        <SelectItem value="investor">Investor</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="job">Job</SelectItem>
                        <SelectItem value="resource">Resource</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Source URL</Label>
                  <Input value={item.sourceUrl} onChange={e => updateItem(idx, "sourceUrl", e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label className="text-xs">Source Text / Notes</Label>
                  <Textarea value={item.sourceText} onChange={e => updateItem(idx, "sourceText", e.target.value)} rows={2} placeholder="Paste raw text or notes..." />
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
          </div>

          <Button onClick={handleCreate} disabled={createBatch.isPending} className="w-full">
            {createBatch.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Create Batch Job
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch Jobs History</CardTitle>
          <CardDescription>Track and manage your batch generation jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {batchJobs.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !batchJobs.data?.length ? (
            <p className="text-center text-muted-foreground py-8">No batch jobs yet</p>
          ) : (
            <div className="space-y-3">
              {batchJobs.data.map((job: any) => (
                <div key={job.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{job.name}</span>
                      <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {job.completedItems}/{job.totalItems} completed
                      {job.failedItems > 0 && <span className="text-red-500"> ({job.failedItems} failed)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {job.status === "pending" && (
                      <Button size="sm" onClick={() => runBatch.mutate({ jobId: job.id })} disabled={runBatch.isPending}>
                        <Play className="h-4 w-4 mr-1" /> Run
                      </Button>
                    )}
                    {job.status === "running" && (
                      <Button size="sm" variant="outline" onClick={() => batchJobs.refetch()}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

  );;
}

// Backwards-compatible default export — wraps the panel in AdminLayout
// so the standalone route keeps working while the panel embeds in AIStudio.
export default function BatchGenerationPanelPage() {
  return (
    <AdminLayout>
      <BatchGenerationPanel />
    </AdminLayout>
  );
}
