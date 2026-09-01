import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Webhook, Plus, Trash2, TestTube, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Webhooks() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ name: "", url: "", secret: "", events: [] as string[] });

  const webhooks = trpc.admin.aiExtended.getWebhooks.useQuery();

  const createWebhook = trpc.admin.aiExtended.createWebhook.useMutation({
    onSuccess: () => {
      toast({ title: "Webhook created" });
      webhooks.refetch();
      setShowCreate(false);
      setNewWebhook({ name: "", url: "", secret: "", events: [] });
    },
  });

  const deleteWebhook = trpc.admin.aiExtended.deleteWebhook.useMutation({
    onSuccess: () => { toast({ title: "Webhook deleted" }); webhooks.refetch(); },
  });

  const toggleWebhook = trpc.admin.aiExtended.updateWebhook.useMutation({
    onSuccess: () => webhooks.refetch(),
  });

  const testWebhook = trpc.admin.aiExtended.testWebhook.useMutation({
    onSuccess: (data) => toast({ title: data.success ? "Webhook test successful" : "Webhook test failed", variant: data.success ? "default" : "destructive" }),
  });

  const allEvents = [
    "content.generated", "content.approved", "content.published",
    "entity.created", "entity.updated",
    "agent.article_discovered", "agent.crawl_completed",
    "batch.completed", "batch.failed",
  ];

  const toggleEvent = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter(e => e !== event) : [...prev.events, event],
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground mt-1">Configure webhook notifications for AI content events</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Webhook</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Webhook</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={newWebhook.name} onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })} placeholder="e.g., Slack Notification" />
              </div>
              <div>
                <Label>Endpoint URL *</Label>
                <Input value={newWebhook.url} onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Secret (for signature verification)</Label>
                <Input value={newWebhook.secret} onChange={e => setNewWebhook({ ...newWebhook, secret: e.target.value })} placeholder="Optional signing secret" />
              </div>
              <div>
                <Label>Events</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {allEvents.map(event => (
                    <div key={event} className="flex items-center gap-2">
                      <Checkbox checked={newWebhook.events.includes(event)} onCheckedChange={() => toggleEvent(event)} id={event} />
                      <label htmlFor={event} className="text-xs cursor-pointer">{event}</label>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createWebhook.mutate(newWebhook)}
                disabled={createWebhook.isPending || !newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
              >
                {createWebhook.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Webhook className="h-4 w-4 mr-2" />}
                Create Webhook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" /> Active Webhooks</CardTitle>
          <CardDescription>Manage webhook endpoints for AI content events</CardDescription>
        </CardHeader>
        <CardContent>
          {webhooks.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !webhooks.data?.length ? (
            <p className="text-center text-muted-foreground py-8">No webhooks configured yet</p>
          ) : (
            <div className="space-y-3">
              {webhooks.data.map((wh: any) => (
                <div key={wh.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={wh.isActive}
                        onCheckedChange={() => toggleWebhook.mutate({ id: wh.id, isActive: !wh.isActive })}
                      />
                      <div>
                        <span className="font-medium">{wh.name}</span>
                        <p className="text-xs text-muted-foreground">{wh.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {wh.lastStatus === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {wh.lastStatus === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
                      <Button variant="ghost" size="sm" onClick={() => testWebhook.mutate({ id: wh.id })} disabled={testWebhook.isPending}>
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteWebhook.mutate({ id: wh.id })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(wh.events || []).map((e: string) => (
                      <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                    ))}
                  </div>
                  {wh.lastTriggered && (
                    <p className="text-xs text-muted-foreground mt-2">Last triggered: {new Date(wh.lastTriggered).toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );;
}
