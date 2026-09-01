import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Building2,
  Briefcase,
  User,
  TrendingUp,
  Calendar,
  Rocket,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  FileText,
  ChevronRight,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
} from "lucide-react";

const ENTITY_ICONS: Record<string, typeof Building2> = {
  company: Building2,
  job: Briefcase,
  person: User,
  investor: TrendingUp,
  event: Calendar,
  accelerator: Rocket,
};

const ENTITY_COLORS: Record<string, string> = {
  company: "bg-blue-500/10 text-blue-600 border-blue-200",
  job: "bg-purple-500/10 text-purple-600 border-purple-200",
  person: "bg-emerald-500/10 text-[#0066FF] border-[#C7DCFF]",
  investor: "bg-amber-500/10 text-amber-600 border-amber-200",
  event: "bg-rose-500/10 text-rose-600 border-rose-200",
  accelerator: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
};

type ActionType = "approve" | "reject" | "request_changes";

export default function UserSubmissions() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Filters
  const [entityType, setEntityType] = useState("all");
  const [status, setStatus] = useState("submitted");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: ActionType;
    entityType: string;
    entityId: number;
    entityName: string;
  } | null>(null);
  const [actionComment, setActionComment] = useState("");

  // Queries
  const listQuery = trpc.admin.userSubmissions.list.useQuery(
    {
      entityType: entityType as any,
      status: status as any,
      search: search || undefined,
      page: 1,
      limit: 50,
    },
    { refetchInterval: 30000 }
  );

  const statsQuery = trpc.admin.userSubmissions.stats.useQuery();

  // Parse selected item
  const selectedParsed = useMemo(() => {
    if (!selectedId) return null;
    const [type, id] = selectedId.split(":");
    return { type, id: parseInt(id) };
  }, [selectedId]);

  const detailQuery = trpc.admin.userSubmissions.getDetail.useQuery(
    { entityType: selectedParsed?.type as any, entityId: selectedParsed?.id ?? 0 },
    { enabled: !!selectedParsed }
  );

  // Mutations
  const moderateMut = trpc.admin.userSubmissions.moderate.useMutation({
    onSuccess: (_, vars) => {
      const actionLabel = vars.action === "approve" ? "approved" : vars.action === "reject" ? "rejected" : "sent back for changes";
      toast({ title: "Success", description: `Submission ${actionLabel} successfully.` });
      utils.admin.userSubmissions.list.invalidate();
      utils.admin.userSubmissions.stats.invalidate();
      utils.admin.userSubmissions.getDetail.invalidate();
      setActionDialog(null);
      setActionComment("");
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleAction = () => {
    if (!actionDialog) return;
    if (actionDialog.type === "reject" && !actionComment.trim()) {
      toast({ title: "Comment required", description: "Please provide a reason for rejection.", variant: "destructive" });
      return;
    }
    moderateMut.mutate({
      entityType: actionDialog.entityType as any,
      entityId: actionDialog.entityId,
      action: actionDialog.type,
      comment: actionComment.trim() || undefined,
    });
  };

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const items = listQuery.data?.items ?? [];
  const stats = statsQuery.data;
  const detail = detailQuery.data;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Submissions</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review and moderate content submitted by users
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                utils.admin.userSubmissions.list.invalidate();
                utils.admin.userSubmissions.stats.invalidate();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <button
              onClick={() => setStatus("submitted")}
              className={`rounded-md border p-3 text-left transition-colors hover:bg-accent ${status === "submitted" ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" />
                Pending Review
              </div>
              <div className="text-2xl font-bold">{stats.submitted}</div>
            </button>
            <button
              onClick={() => setStatus("under_review")}
              className={`rounded-md border p-3 text-left transition-colors hover:bg-accent ${status === "under_review" ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Eye className="h-3.5 w-3.5" />
                Under Review
              </div>
              <div className="text-2xl font-bold">{stats.submitted}</div>
            </button>
            <button
              onClick={() => setStatus("needs_changes")}
              className={`rounded-md border p-3 text-left transition-colors hover:bg-accent ${status === "needs_changes" ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Needs Changes
              </div>
              <div className="text-2xl font-bold">{stats.needsChanges}</div>
            </button>
            <button
              onClick={() => setStatus("all")}
              className={`rounded-md border p-3 text-left transition-colors hover:bg-accent ${status === "all" ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <FileText className="h-3.5 w-3.5" />
                All Submissions
              </div>
              <div className="text-2xl font-bold">{stats.submitted + stats.needsChanges + stats.rejected + stats.published}</div>
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="company">Companies</SelectItem>
              <SelectItem value="job">Jobs</SelectItem>
              <SelectItem value="person">People</SelectItem>
              <SelectItem value="investor">Investors</SelectItem>
              <SelectItem value="event">Events</SelectItem>
              <SelectItem value="accelerator">Accelerators</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search submissions..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="max-w-xs"
            />
            <Button variant="outline" size="icon" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: List */}
        <div className="w-[380px] border-r overflow-y-auto bg-muted/30">
          {listQuery.isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading submissions...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">No submissions matching your filters.</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => {
                const key = `${item.entityType}:${item.id}`;
                const Icon = ENTITY_ICONS[item.entityType] ?? FileText;
                const colorClass = ENTITY_COLORS[item.entityType] ?? "bg-[#F0F2F5] text-[#697386]";
                const isSelected = selectedId === key;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedId(key)}
                    className={`w-full text-left p-4 transition-colors hover:bg-accent/50 ${isSelected ? "bg-accent border-l-2 border-l-primary" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 p-2 rounded-md border ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{item.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {item.entityType}
                          </Badge>
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ backgroundColor: item.statusColor + "20", color: item.statusColor }}
                          >
                            {item.statusName}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1.5">
                          by {item.createdByName} &middot;{" "}
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Detail */}
        <div className="flex-1 overflow-y-auto">
          {!selectedParsed ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a submission to review</p>
                <p className="text-sm mt-1">Click on an item from the list to see its details</p>
              </div>
            </div>
          ) : detailQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading details...</div>
          ) : !detail ? (
            <div className="p-8 text-center text-muted-foreground">Submission not found.</div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Detail header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {detail.entity.logoUrl ? (
                    <img
                      src={detail.entity.logoUrl}
                      alt=""
                      className="h-16 w-16 rounded-md object-cover border"
                    />
                  ) : (
                    <div className={`h-16 w-16 rounded-md flex items-center justify-center border ${ENTITY_COLORS[detail.entity.entityType] ?? "bg-[#F0F2F5]"}`}>
                      {(() => {
                        const Icon = ENTITY_ICONS[detail.entity.entityType] ?? FileText;
                        return <Icon className="h-8 w-8" />;
                      })()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold">{detail.entity.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {detail.entity.entityType}
                      </Badge>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: detail.entity.statusColor + "20", color: detail.entity.statusColor }}
                      >
                        {detail.entity.statusName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {detail.entity.statusSlug !== "published" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        setActionDialog({
                          open: true,
                          type: "approve",
                          entityType: detail.entity.entityType,
                          entityId: detail.entity.id,
                          entityName: detail.entity.name,
                        })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve & Publish
                    </Button>
                  )}
                  {detail.entity.statusSlug !== "rejected" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setActionDialog({
                          open: true,
                          type: "reject",
                          entityType: detail.entity.entityType,
                          entityId: detail.entity.id,
                          entityName: detail.entity.name,
                        })
                      }
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setActionDialog({
                        open: true,
                        type: "request_changes",
                        entityType: detail.entity.entityType,
                        entityId: detail.entity.id,
                        entityName: detail.entity.name,
                      })
                    }
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Request Changes
                  </Button>
                </div>
              </div>

              {/* Submitter info */}
              {detail.submitter && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Submitted By</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {detail.submitter.avatarUrl ? (
                        <img src={detail.submitter.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{detail.submitter.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {detail.submitter.email}
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {detail.submitter.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Entity details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Submission Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detail.entity.description && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{detail.entity.description}</p>
                    </div>
                  )}

                  {/* Extra fields */}
                  {detail.entity && (() => {
                    const extraFields: Record<string, any> = {};
                    const skip = ['id','name','title','description','slug','statusId','createdAt','updatedAt','createdByUserId','createdById','postedById'];
                    for (const [k,v] of Object.entries(detail.entity)) { if (!skip.includes(k) && v) extraFields[k] = v; }
                    return Object.keys(extraFields).length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      {Object.entries(extraFields).map(([key, value]) => {
                        if (!value) return null;
                        const label = key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (s) => s.toUpperCase())
                          .trim();
                        const isUrl = typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"));

                        return (
                          <div key={key}>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {label}
                            </label>
                            {isUrl ? (
                              <a
                                href={value as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                {(value as string).replace(/^https?:\/\//, "").slice(0, 40)}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <p className="mt-1 text-sm">{String(value)}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    ) : null;
                  })()}

                  <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                    <span>Created: {detail.entity.createdAt ? new Date(detail.entity.createdAt).toLocaleString() : 'Unknown'}</span>
                    <span>Updated: {detail.entity.updatedAt ? new Date(detail.entity.updatedAt).toLocaleString() : 'Unknown'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Moderation history */}
              {detail.history && detail.history.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Review History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detail.history.map((entry: any, i: number) => (
                        <div key={i} className="flex gap-3">
                          <div className="relative">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs ${
                                entry.action === "approve"
                                  ? "bg-green-500"
                                  : entry.action === "reject"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                              }`}
                            >
                              {entry.action === "approve" ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : entry.action === "reject" ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <MessageSquare className="h-4 w-4" />
                              )}
                            </div>
                            {i < detail.history.length - 1 && (
                              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-full bg-border" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm capitalize">{entry.action.replace("_", " ")}</span>
                              <span className="text-xs text-muted-foreground">
                                by {entry.reviewerName} &middot;{" "}
                                {new Date(entry.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {entry.comment && (
                              <p className="mt-1 text-sm text-muted-foreground bg-muted rounded-md p-3">
                                {entry.comment}
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {entry.fromStatusName} → {entry.toStatusName}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog
        open={!!actionDialog?.open}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
            setActionComment("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog?.type === "approve" && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Approve & Publish
                </>
              )}
              {actionDialog?.type === "reject" && (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Reject Submission
                </>
              )}
              {actionDialog?.type === "request_changes" && (
                <>
                  <MessageSquare className="h-5 w-5 text-amber-500" />
                  Request Changes
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === "approve" && (
                <>
                  This will publish <strong>{actionDialog.entityName}</strong> and make it visible on the public site.
                </>
              )}
              {actionDialog?.type === "reject" && (
                <>
                  This will reject <strong>{actionDialog?.entityName}</strong>. A reason is required.
                </>
              )}
              {actionDialog?.type === "request_changes" && (
                <>
                  This will send <strong>{actionDialog?.entityName}</strong> back to the submitter with your feedback.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {actionDialog?.type === "approve" ? "Comment (optional)" : "Comment"}
                {actionDialog?.type === "reject" && <span className="text-red-500 ml-1">*</span>}
                {actionDialog?.type === "request_changes" && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Textarea
                placeholder={
                  actionDialog?.type === "approve"
                    ? "Optional note about the approval..."
                    : actionDialog?.type === "reject"
                    ? "Explain why this submission is being rejected..."
                    : "Describe what changes are needed..."
                }
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={4}
              />
              {actionDialog?.type === "reject" && !actionComment.trim() && (
                <p className="text-xs text-red-500 mt-1">A reason is required for rejection.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setActionComment(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={moderateMut.isPending || (actionDialog?.type === "reject" && !actionComment.trim()) || (actionDialog?.type === "request_changes" && !actionComment.trim())}
              className={
                actionDialog?.type === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : actionDialog?.type === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {moderateMut.isPending ? "Processing..." : actionDialog?.type === "approve" ? "Approve & Publish" : actionDialog?.type === "reject" ? "Reject" : "Send Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
