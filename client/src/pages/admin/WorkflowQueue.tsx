/**
 * Workflow Editorial Queue
 * Manage content approvals with multi-step workflow
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  Eye,
  Edit,
  Send,
  FileText,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  submitted: { label: "Submitted", color: "text-blue-600", bgColor: "bg-blue-100" },
  editor_review: { label: "Editor Review", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  senior_editor_review: { label: "Senior Review", color: "text-purple-600", bgColor: "bg-purple-100" },
  approved: { label: "Approved", color: "text-green-600", bgColor: "bg-green-100" },
  scheduled: { label: "Scheduled", color: "text-cyan-600", bgColor: "bg-cyan-100" },
  changes_requested: { label: "Changes Requested", color: "text-orange-600", bgColor: "bg-orange-100" },
  rejected: { label: "Rejected", color: "text-red-600", bgColor: "bg-red-100" },
};

export default function WorkflowQueue() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState<"all" | "article" | "event">("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "request_changes" | "reject" | null>(null);

  // Fetch queue data from API
  const { data: queueData, isLoading, refetch } = trpc.admin.workflow.getQueue.useQuery({
    status: activeTab === "all" ? undefined : activeTab,
    search: search || undefined,
    contentType: contentType === "all" ? undefined : contentType,
  });

  // Fetch available transitions for selected item - use different endpoints for articles vs events
  const { data: articleTransitions } = trpc.news.adminGet.useQuery(
    { id: selectedItem?.id },
    { enabled: !!selectedItem && selectedItem?.type === "article" }
  );
  
  const { data: eventTransitions } = trpc.events.adminGet.useQuery(
    { id: selectedItem?.id },
    { enabled: !!selectedItem && selectedItem?.type === "event" }
  );
  
  // Get the appropriate transitions based on content type
  const transitions = selectedItem?.type === "event" ? eventTransitions : articleTransitions;

  // Transition mutations for articles and events
  const articleTransitionMutation = trpc.news.transition.useMutation({
    onSuccess: () => {
      toast.success("Status updated successfully");
      refetch();
      setReviewDialogOpen(false);
      setReviewComment("");
      setReviewAction(null);
      setSelectedItem(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });
  
  const eventTransitionMutation = trpc.events.transition.useMutation({
    onSuccess: () => {
      toast.success("Status updated successfully");
      refetch();
      setReviewDialogOpen(false);
      setReviewComment("");
      setReviewAction(null);
      setSelectedItem(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });
  
  // Use the appropriate mutation based on content type
  const transitionMutation = selectedItem?.type === "event" ? eventTransitionMutation : articleTransitionMutation;

  const items = queueData?.items || [];
  const counts = queueData?.counts || {
    all: 0,
    submitted: 0,
    editor_review: 0,
    senior_editor_review: 0,
    approved: 0,
    scheduled: 0,
  };

  const getStatusBadge = (status: string, statusName?: string, statusColor?: string) => {
    const config = statusConfig[status];
    if (config) {
      return (
        <Badge className={`${config.bgColor} ${config.color} border-0`}>
          {config.label}
        </Badge>
      );
    }
    return (
      <Badge 
        style={{ backgroundColor: statusColor ? `${statusColor}20` : undefined, color: statusColor }}
        className="border-0"
      >
        {statusName || status}
      </Badge>
    );
  };

  const handleReviewAction = (action: "approve" | "request_changes" | "reject") => {
    setReviewAction(action);
    setReviewDialogOpen(true);
  };

  const submitReview = () => {
    if (!selectedItem || !transitions?.availableTransitions) return;

    // Find the appropriate transition based on action
    let targetTransition;
    if (reviewAction === "approve") {
      // Find transition to next review stage or approved
      targetTransition = transitions.availableTransitions.find(
        (t: any) => t.name.toLowerCase().includes("approve") || 
                    t.name.toLowerCase().includes("publish") ||
                    t.name.toLowerCase().includes("forward")
      );
    } else if (reviewAction === "request_changes") {
      targetTransition = transitions.availableTransitions.find(
        (t: any) => t.name.toLowerCase().includes("change") || 
                    t.name.toLowerCase().includes("revision")
      );
    } else if (reviewAction === "reject") {
      targetTransition = transitions.availableTransitions.find(
        (t: any) => t.name.toLowerCase().includes("reject")
      );
    }

    if (!targetTransition) {
      // Use first available transition
      targetTransition = transitions.availableTransitions[0];
    }

    if (targetTransition) {
      // Use the correct parameter name based on content type
      if (selectedItem.type === "event") {
        eventTransitionMutation.mutate({
          eventId: selectedItem.id,
          transitionId: targetTransition.id,
          comment: reviewComment,
        });
      } else {
        articleTransitionMutation.mutate({
          articleId: selectedItem.id,
          transitionId: targetTransition.id,
          comment: reviewComment,
        });
      }
    } else {
      toast.error("No valid transition available");
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Editorial Queue</h1>
            <p className="text-muted-foreground mt-1">
              Review and approve content submissions
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card 
            className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === "all" ? "ring-2 ring-primary" : ""}`} 
            onClick={() => setActiveTab("all")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{counts.all}</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === "submitted" ? "ring-2 ring-primary" : ""}`} 
            onClick={() => setActiveTab("submitted")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="text-2xl font-bold text-blue-600">{counts.submitted}</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === "editor_review" ? "ring-2 ring-primary" : ""}`} 
            onClick={() => setActiveTab("editor_review")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Editor Review</p>
              <p className="text-2xl font-bold text-yellow-600">{counts.editor_review}</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === "senior_editor_review" ? "ring-2 ring-primary" : ""}`} 
            onClick={() => setActiveTab("senior_editor_review")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Senior Review</p>
              <p className="text-2xl font-bold text-purple-600">{counts.senior_editor_review}</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === "approved" ? "ring-2 ring-primary" : ""}`} 
            onClick={() => setActiveTab("approved")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600">{counts.approved}</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === "scheduled" ? "ring-2 ring-primary" : ""}`} 
            onClick={() => setActiveTab("scheduled")}
          >
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold text-cyan-600">{counts.scheduled}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search and Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search submissions..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={contentType} onValueChange={(v) => setContentType(v as any)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Content</SelectItem>
                      <SelectItem value="article">Articles</SelectItem>
                      <SelectItem value="event">Events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Items list */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Review</CardTitle>
                <CardDescription>
                  {items.length} item{items.length !== 1 ? "s" : ""} awaiting action
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-medium">All caught up!</h3>
                    <p className="text-muted-foreground mt-1">
                      No items pending review in this queue.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {items.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                          selectedItem?.id === item.id && selectedItem?.type === item.type ? "bg-muted" : ""
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 ${
                              item.type === "event" ? "bg-purple-100" : "bg-muted"
                            }`}>
                              {item.type === "event" ? (
                                <Calendar className="h-5 w-5 text-purple-600" />
                              ) : (
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium truncate">{item.title}</h4>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {item.type === "event" ? "Event" : "Article"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <span>{item.author?.name || (item.type === "event" ? "Event" : "Unknown")}</span>
                                <span>•</span>
                                <span>{formatTimeAgo(item.updatedAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {getStatusBadge(item.status, item.statusName, item.statusColor)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detail panel */}
          <div className="space-y-4">
            {selectedItem ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => navigate(
                        selectedItem.type === "event" 
                          ? `/admin/events/${selectedItem.id}` 
                          : `/admin/articles/${selectedItem.id}`
                      )}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit {selectedItem.type === "event" ? "Event" : "Article"}
                    </Button>
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => navigate(
                        selectedItem.type === "event"
                          ? `/events/${selectedItem.slug}`
                          : `/admin/articles/${selectedItem.id}/preview`
                      )}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <div className="border-t pt-3 space-y-2">
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleReviewAction("approve")}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve / Forward
                      </Button>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleReviewAction("request_changes")}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Request Changes
                      </Button>
                      <Button
                        className="w-full"
                        variant="destructive"
                        onClick={() => handleReviewAction("reject")}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Title</p>
                      <p className="font-medium">{selectedItem.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Author</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedItem.author?.avatar} />
                          <AvatarFallback>
                            {selectedItem.author?.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedItem.author?.name || "Unknown"}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1">
                        {getStatusBadge(selectedItem.status, selectedItem.statusName, selectedItem.statusColor)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Submitted</p>
                      <p>{new Date(selectedItem.submittedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p>{new Date(selectedItem.updatedAt).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium">Select an item</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click on an item to view details and take action
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" && "Approve Article"}
              {reviewAction === "request_changes" && "Request Changes"}
              {reviewAction === "reject" && "Reject Article"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve" && "This will move the article to the next stage or publish it."}
              {reviewAction === "request_changes" && "The author will be notified to make revisions."}
              {reviewAction === "reject" && "This will reject the article submission."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Add a comment (optional)..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={transitionMutation.isPending}
              className={
                reviewAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : reviewAction === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {transitionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
