/**
 * Admin Claim Requests - Editorial-style workflow for reviewing profile claims
 * Left panel: filterable list of claims
 * Right panel: full detail view with claim info, user info, review history, and actions
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Eye,
  Send,
  Loader2,
  RefreshCw,
  Building2,
  User,
  Mail,
  FileText,
  Shield,
  ArrowRight,
  Calendar,
  ExternalLink,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "text-blue-700", bgColor: "bg-blue-100", icon: Clock },
  under_review: { label: "Under Review", color: "text-yellow-700", bgColor: "bg-yellow-100", icon: Eye },
  needs_clarification: { label: "Needs Clarification", color: "text-orange-700", bgColor: "bg-orange-100", icon: HelpCircle },
  approved: { label: "Approved", color: "text-green-700", bgColor: "bg-green-100", icon: CheckCircle },
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-100", icon: XCircle },
};

const entityTypeLabels: Record<string, string> = {
  company: "Company",
  person: "Person",
  accelerator: "Accelerator",
  event: "Event",
  investor: "Investor",
};

const entityTypeColors: Record<string, string> = {
  company: "bg-blue-100 text-blue-700",
  person: "bg-purple-100 text-purple-700",
  accelerator: "bg-cyan-100 text-cyan-700",
  event: "bg-pink-100 text-pink-700",
  investor: "bg-[#EBF3FF] text-[#0066FF]",
};

type ReviewAction = "under_review" | "needs_clarification" | "approved" | "rejected";

export default function ClaimRequests() {
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  // Fetch claims list
  const { data, isLoading, refetch } = trpc.claimedProfiles.adminListClaims.useQuery(
    { status: activeTab as any, page, limit: 20 },
    { placeholderData: (prev) => prev }
  );

  // Fetch selected claim detail
  const { data: claimDetail, isLoading: detailLoading } = trpc.claimedProfiles.adminGetClaimDetail.useQuery(
    { claimId: selectedClaimId! },
    { enabled: !!selectedClaimId }
  );

  const reviewMutation = trpc.claimedProfiles.adminReviewClaim.useMutation({
    onSuccess: () => {
      toast.success("Claim updated successfully");
      refetch();
      setReviewDialogOpen(false);
      setReviewComment("");
      setReviewAction(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update claim");
    },
  });

  const handleReviewAction = (action: ReviewAction) => {
    setReviewAction(action);
    setReviewComment("");
    setReviewDialogOpen(true);
  };

  const submitReview = () => {
    if (!selectedClaimId || !reviewAction) return;

    // Validate mandatory comments
    if ((reviewAction === "rejected" || reviewAction === "needs_clarification") && !reviewComment.trim()) {
      toast.error("A comment is required for this action");
      return;
    }

    reviewMutation.mutate({
      claimId: selectedClaimId,
      action: reviewAction,
      comment: reviewComment || undefined,
    });
  };

  const claims = data?.claims || [];
  const counts = data?.counts || { all: 0, pending: 0, under_review: 0, needs_clarification: 0, approved: 0, rejected: 0 };

  const filteredClaims = searchQuery
    ? claims.filter(c =>
        c.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.userName || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : claims;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status];
    if (!config) return <Badge variant="outline">{status}</Badge>;
    const Icon = config.icon;
    return (
      <Badge className={`${config.bgColor} ${config.color} border-0 gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getEntityLink = (type: string, slug: string | null) => {
    if (!slug) return "#";
    switch (type) {
      case "company": return `/companies/${slug}`;
      case "person": return `/people/${slug}`;
      case "accelerator": return `/accelerators/${slug}`;
      case "event": return `/events/${slug}`;
      case "investor": return `/investors/${slug}`;
      default: return "#";
    }
  };

  const actionLabels: Record<ReviewAction, { label: string; description: string; color: string; icon: typeof CheckCircle }> = {
    under_review: {
      label: "Start Review",
      description: "Mark this claim as under review. The claimant will see the status change.",
      color: "bg-yellow-600 hover:bg-yellow-700",
      icon: Eye,
    },
    approved: {
      label: "Approve Claim",
      description: "Approve this claim. The user will gain management access to the profile.",
      color: "bg-green-600 hover:bg-green-700",
      icon: CheckCircle,
    },
    needs_clarification: {
      label: "Request Clarification",
      description: "Send back to the claimant for additional information. A comment is required.",
      color: "bg-orange-600 hover:bg-orange-700",
      icon: HelpCircle,
    },
    rejected: {
      label: "Reject Claim",
      description: "Reject this claim request. A comment explaining the reason is required.",
      color: "bg-red-600 hover:bg-red-700",
      icon: XCircle,
    },
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Claim Requests</h1>
            <p className="text-muted-foreground mt-1">
              Review and manage profile ownership claims
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {(["all", "pending", "under_review", "needs_clarification", "approved", "rejected"] as const).map((status) => {
            const config = status === "all" ? null : statusConfig[status];
            return (
              <Card
                key={status}
                className={`cursor-pointer hover:shadow-md transition-all ${activeTab === status ? "ring-2 ring-primary shadow-md" : ""}`}
                onClick={() => { setActiveTab(status); setPage(1); setSelectedClaimId(null); }}
              >
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground capitalize">{status === "all" ? "All" : config?.label || status}</p>
                  <p className="text-xl font-bold mt-0.5">{counts[status] || 0}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content: List + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Claims List */}
          <div className="lg:col-span-5">
            <Card>
              <CardHeader className="pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search claims..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredClaims.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No claims found</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[calc(100vh-380px)]">
                    <div className="divide-y">
                      {filteredClaims.map((claim) => (
                        <div
                          key={claim.id}
                          className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedClaimId === claim.id ? "bg-muted border-l-2 border-l-primary" : ""
                          }`}
                          onClick={() => setSelectedClaimId(claim.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={claim.entityLogo || undefined} />
                              <AvatarFallback className="text-xs">
                                {claim.entityName?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate">{claim.entityName}</h4>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${entityTypeColors[claim.entityType] || ""}`}>
                                  {entityTypeLabels[claim.entityType] || claim.entityType}
                                </Badge>
                                {getStatusBadge(claim.status)}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span className="truncate">{claim.userName || "Unknown User"}</span>
                                <span>•</span>
                                <span>{formatTimeAgo(claim.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Pagination */}
                {(data?.totalPages || 0) > 1 && (
                  <div className="flex items-center justify-between p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {page} of {data?.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= (data?.totalPages || 1)}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Detail View */}
          <div className="lg:col-span-7 space-y-4">
            {selectedClaimId && claimDetail ? (
              <>
                {/* Claim Header */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16 shrink-0 rounded-md">
                        <AvatarImage src={claimDetail.entityLogo || undefined} className="rounded-md" />
                        <AvatarFallback className="rounded-md text-lg">
                          {claimDetail.entityName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold">{claimDetail.entityName}</h2>
                          <Badge variant="outline" className={entityTypeColors[claimDetail.entityType] || ""}>
                            {entityTypeLabels[claimDetail.entityType]}
                          </Badge>
                          {getStatusBadge(claimDetail.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Submitted {formatDate(claimDetail.createdAt)}
                          </span>
                          {claimDetail.entitySlug && (
                            <a
                              href={getEntityLink(claimDetail.entityType, claimDetail.entitySlug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View Profile
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Claimant Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Claimant Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={claimDetail.userAvatar || undefined} />
                          <AvatarFallback>{claimDetail.userName?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{claimDetail.userName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">Claimant</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{claimDetail.userEmail || "No email on file"}</p>
                          <p className="text-xs text-muted-foreground">Account Email (auto-detected)</p>
                        </div>
                      </div>
                    </div>

                    {claimDetail.companyEmail && (
                      <div className="flex items-center gap-3 p-3 rounded-md bg-amber-50 border border-amber-200">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{claimDetail.companyEmail}</p>
                          <p className="text-xs text-amber-700">Company Email (provided by claimant for verification)</p>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Account created: {formatDate(claimDetail.userCreatedAt)}
                    </div>
                  </CardContent>
                </Card>

                {/* Claim Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Claim Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reason for Claiming</Label>
                      <div className="mt-1 p-3 rounded-md bg-muted/50 text-sm whitespace-pre-wrap">
                        {claimDetail.requestNote || <span className="text-muted-foreground italic">No reason provided</span>}
                      </div>
                    </div>

                    {claimDetail.proofText && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Proof of Ownership</Label>
                        <div className="mt-1 p-3 rounded-md bg-muted/50 text-sm whitespace-pre-wrap">
                          {claimDetail.proofText}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Requested Role</Label>
                        <p className="mt-1 font-medium text-sm capitalize">{claimDetail.role}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Entity Type</Label>
                        <p className="mt-1 font-medium text-sm">{entityTypeLabels[claimDetail.entityType]}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Review History Timeline */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Review History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {claimDetail.reviewHistory && claimDetail.reviewHistory.length > 0 ? (
                      <div className="relative pl-6">
                        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
                        <div className="space-y-4">
                          {claimDetail.reviewHistory.map((entry: any, idx: number) => {
                            const config = statusConfig[entry.action];
                            const Icon = config?.icon || Clock;
                            return (
                              <div key={entry.id || idx} className="relative">
                                <div className={`absolute -left-[18px] top-1 h-5 w-5 rounded-full flex items-center justify-center ${config?.bgColor || "bg-muted"}`}>
                                  <Icon className={`h-3 w-3 ${config?.color || "text-muted-foreground"}`} />
                                </div>
                                <div className="ml-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{entry.reviewerName || "System"}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    <Badge className={`${config?.bgColor || "bg-muted"} ${config?.color || ""} border-0 text-xs`}>
                                      {config?.label || entry.action}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                                  </div>
                                  {entry.comment && (
                                    <div className="mt-1.5 p-2.5 rounded bg-muted/50 text-sm text-muted-foreground">
                                      {entry.comment}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No review history yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Review Actions */}
                {claimDetail.status !== "approved" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Review Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {claimDetail.status === "pending" && (
                          <Button
                            className="bg-yellow-600 hover:bg-yellow-700 gap-2"
                            onClick={() => handleReviewAction("under_review")}
                          >
                            <Eye className="h-4 w-4" />
                            Start Review
                          </Button>
                        )}
                        <Button
                          className="bg-green-600 hover:bg-green-700 gap-2"
                          onClick={() => handleReviewAction("approved")}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={() => handleReviewAction("needs_clarification")}
                        >
                          <HelpCircle className="h-4 w-4" />
                          Request Clarification
                        </Button>
                        <Button
                          variant="destructive"
                          className="gap-2"
                          onClick={() => handleReviewAction("rejected")}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {claimDetail.status === "approved" && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="font-medium text-green-800">This claim has been approved</p>
                        <p className="text-sm text-green-700">
                          The user now has management access to this profile.
                          {claimDetail.reviewedAt && ` Approved on ${formatDate(claimDetail.reviewedAt)}.`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : selectedClaimId && detailLoading ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-3">Loading claim details...</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
                  <h3 className="font-medium text-lg">Select a claim to review</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Click on a claim from the list to view full details, review history, and take action.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Review Action Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {reviewAction && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = actionLabels[reviewAction].icon;
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {actionLabels[reviewAction].label}
                </DialogTitle>
                <DialogDescription>
                  {actionLabels[reviewAction].description}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                {/* Show claim summary */}
                {claimDetail && (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={claimDetail.entityLogo || undefined} />
                      <AvatarFallback className="text-xs">{claimDetail.entityName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{claimDetail.entityName}</p>
                      <p className="text-xs text-muted-foreground">
                        Claimed by {claimDetail.userName} • {entityTypeLabels[claimDetail.entityType]}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reviewComment">
                    Comment
                    {(reviewAction === "rejected" || reviewAction === "needs_clarification") && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                    {reviewAction === "approved" && (
                      <span className="text-muted-foreground ml-1">(optional)</span>
                    )}
                  </Label>
                  <Textarea
                    id="reviewComment"
                    placeholder={
                      reviewAction === "rejected"
                        ? "Explain why this claim is being rejected..."
                        : reviewAction === "needs_clarification"
                        ? "What additional information or proof is needed..."
                        : "Add an optional note..."
                    }
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitReview}
                  disabled={reviewMutation.isPending}
                  className={actionLabels[reviewAction].color}
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Confirm
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
