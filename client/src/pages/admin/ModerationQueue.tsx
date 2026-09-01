/**
 * Moderation Queue
 * Handle profile claims and suggested updates (Crunchbase-style)
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Building2,
  Mail,
  Link as LinkIcon,
  Shield,
  Diff,
  Loader2,
  RefreshCw,
  ExternalLink,
  Globe,
  UserCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ModerationQueue() {
  const [activeTab, setActiveTab] = useState("claims");
  const [claimsSearch, setClaimsSearch] = useState("");
  const [updatesSearch, setUpdatesSearch] = useState("");
  const [claimsStatus, setClaimsStatus] = useState<string>("pending");
  const [updatesStatus, setUpdatesStatus] = useState<string>("pending");
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [selectedUpdateId, setSelectedUpdateId] = useState<number | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [selectedChanges, setSelectedChanges] = useState<Record<string, boolean>>({});

  // Fetch stats
  const { data: stats, refetch: refetchStats } = trpc.admin.moderation.getStats.useQuery();

  // Fetch claims
  const { data: claimsData, isLoading: claimsLoading, refetch: refetchClaims } = trpc.admin.moderation.claims.list.useQuery({
    status: claimsStatus === "all" ? undefined : claimsStatus as "pending" | "approved" | "rejected",
    page: 1,
    limit: 50,
  });

  // Fetch updates
  const { data: updatesData, isLoading: updatesLoading, refetch: refetchUpdates } = trpc.admin.moderation.updates.list.useQuery({
    status: updatesStatus === "all" ? undefined : updatesStatus as "pending" | "approved" | "rejected",
    page: 1,
    limit: 50,
  });

  // Fetch selected claim details
  const { data: selectedClaim } = trpc.admin.moderation.claims.get.useQuery(
    { id: selectedClaimId! },
    { enabled: !!selectedClaimId }
  );

  // Fetch selected update details
  const { data: selectedUpdate } = trpc.admin.moderation.updates.get.useQuery(
    { id: selectedUpdateId! },
    { enabled: !!selectedUpdateId }
  );

  // Mutations
  const approveClaim = trpc.admin.moderation.claims.approve.useMutation({
    onSuccess: () => {
      toast.success("Claim approved successfully");
      refetchClaims();
      refetchStats();
      setReviewDialogOpen(false);
      setSelectedClaimId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectClaim = trpc.admin.moderation.claims.reject.useMutation({
    onSuccess: () => {
      toast.success("Claim rejected");
      refetchClaims();
      refetchStats();
      setReviewDialogOpen(false);
      setSelectedClaimId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const approveUpdate = trpc.admin.moderation.updates.approve.useMutation({
    onSuccess: () => {
      toast.success("Update approved successfully");
      refetchUpdates();
      refetchStats();
      setReviewDialogOpen(false);
      setSelectedUpdateId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectUpdate = trpc.admin.moderation.updates.reject.useMutation({
    onSuccess: () => {
      toast.success("Update rejected");
      refetchUpdates();
      refetchStats();
      setReviewDialogOpen(false);
      setSelectedUpdateId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const claims = claimsData?.items || [];
  const updates = updatesData?.items || [];

  // Filter by search
  const filteredClaims = claims.filter(claim => 
    !claimsSearch || 
    claim.entityName?.toLowerCase().includes(claimsSearch.toLowerCase()) ||
    claim.claimantName?.toLowerCase().includes(claimsSearch.toLowerCase()) ||
    claim.claimantEmail?.toLowerCase().includes(claimsSearch.toLowerCase())
  );

  const filteredUpdates = updates.filter(update => 
    !updatesSearch || 
    update.entityName?.toLowerCase().includes(updatesSearch.toLowerCase()) ||
    update.submitterName?.toLowerCase().includes(updatesSearch.toLowerCase()) ||
    update.submitterEmail?.toLowerCase().includes(updatesSearch.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="border-green-500 text-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="border-red-500 text-red-500">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequesterTypeBadge = (requesterType: string, source?: string | null) => {
    const isInternal = requesterType === "internal";
    return (
      <div className="flex items-center gap-1">
        {isInternal ? (
          <Badge variant="secondary" className="text-xs">
            <UserCircle className="h-3 w-3 mr-1" />
            Internal
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            <Globe className="h-3 w-3 mr-1" />
            External
          </Badge>
        )}
        {source && (
          <Badge variant="outline" className="text-xs capitalize">
            {source.replace("_", " ")}
          </Badge>
        )}
      </div>
    );
  };

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "Unknown";
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

  const handleClaimAction = (action: "approve" | "reject") => {
    setReviewAction(action);
    setReviewDialogOpen(true);
  };

  const handleUpdateAction = (action: "approve" | "reject") => {
    setReviewAction(action);
    setReviewDialogOpen(true);
  };

  const submitClaimReview = () => {
    if (!selectedClaimId) return;
    
    if (reviewAction === "approve") {
      approveClaim.mutate({ claimId: selectedClaimId, comment: reviewComment });
    } else if (reviewAction === "reject") {
      rejectClaim.mutate({ claimId: selectedClaimId, reason: reviewComment });
    }
  };

  const submitUpdateReview = () => {
    if (!selectedUpdateId) return;
    
    if (reviewAction === "approve") {
      approveUpdate.mutate({ updateId: selectedUpdateId, comment: reviewComment });
    } else if (reviewAction === "reject") {
      rejectUpdate.mutate({ updateId: selectedUpdateId, reason: reviewComment });
    }
  };

  const toggleChangeSelection = (index: number) => {
    setSelectedChanges((prev) => ({
      ...prev,
      [`change-${index}`]: !prev[`change-${index}`],
    }));
  };

  const refetchAll = () => {
    refetchClaims();
    refetchUpdates();
    refetchStats();
  };

  // Parse proposed changes for display
  const parseChanges = (proposedChanges: any) => {
    if (!proposedChanges) return [];
    if (Array.isArray(proposedChanges)) return proposedChanges;
    
    // Convert object format to array format
    return Object.entries(proposedChanges).map(([field, value]: [string, any]) => ({
      field,
      oldValue: value?.old || value?.oldValue || null,
      newValue: value?.new || value?.newValue || value,
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Moderation Queue</h1>
            <p className="text-muted-foreground mt-1">
              Review profile claims and suggested updates
            </p>
          </div>
          <Button variant="outline" onClick={refetchAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending Claims</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats?.pendingClaims || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending Updates</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats?.pendingUpdates || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Approved Today</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.approvedToday || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Rejected Today</p>
              <p className="text-2xl font-bold text-red-600">
                {stats?.rejectedToday || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="claims" className="gap-2">
              <Shield className="h-4 w-4" />
              Profile Claims
              <Badge variant="secondary" className="ml-1">
                {stats?.pendingClaims || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="updates" className="gap-2">
              <Diff className="h-4 w-4" />
              Suggested Updates
              <Badge variant="secondary" className="ml-1">
                {stats?.pendingUpdates || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Claims Tab */}
          <TabsContent value="claims" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Claims list */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search claims..."
                          value={claimsSearch}
                          onChange={(e) => setClaimsSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={claimsStatus} onValueChange={setClaimsStatus}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  {claimsLoading ? (
                    <CardContent className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">Loading claims...</p>
                    </CardContent>
                  ) : filteredClaims.length === 0 ? (
                    <CardContent className="p-8 text-center">
                      <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground">
                        No claims found
                      </p>
                    </CardContent>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="divide-y divide-border">
                        {filteredClaims.map((claim) => (
                          <div
                            key={claim.id}
                            className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                              selectedClaimId === claim.id ? "bg-muted/50" : ""
                            }`}
                            onClick={() => setSelectedClaimId(claim.id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>
                                    {claim.entityType === "person" ? (
                                      <User className="h-5 w-5" />
                                    ) : (
                                      <Building2 className="h-5 w-5" />
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-medium">{claim.entityName || "Unknown"}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Claimed by {claim.claimantName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {getRequesterTypeBadge(claim.requesterType || "external", claim.source)}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {formatTimeAgo(claim.createdAt)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(claim.status)}
                                <Badge variant="outline" className="capitalize">
                                  {claim.entityType}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </Card>
              </div>

              {/* Claim detail */}
              <div className="space-y-4">
                {selectedClaim ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Claim Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Profile</p>
                          <p className="font-medium">{selectedClaim.entity?.name || "Unknown"}</p>
                          <Badge variant="outline" className="mt-1 capitalize">
                            {selectedClaim.entityType}
                          </Badge>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground">Claimant</p>
                          <p className="font-medium">{selectedClaim.claimantName}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {selectedClaim.claimantEmail}
                          </div>
                          {selectedClaim.claimantRole && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Role: {selectedClaim.claimantRole}
                            </p>
                          )}
                        </div>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground">Request Source</p>
                          <div className="mt-1">
                            {getRequesterTypeBadge(selectedClaim.requesterType || "external", selectedClaim.source)}
                          </div>
                        </div>
                        {(() => {
                          const links = selectedClaim.proofLinks as string[] | null;
                          if (!links || !Array.isArray(links) || links.length === 0) return null;
                          return (
                            <>
                              <Separator />
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Proof Links</p>
                                {links.map((link, i) => (
                                  <a
                                    key={i}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {link}
                                  </a>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {selectedClaim.status === "pending" && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Button 
                            className="w-full" 
                            onClick={() => handleClaimAction("approve")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Claim
                          </Button>
                          <Button 
                            className="w-full text-destructive" 
                            variant="outline"
                            onClick={() => handleClaimAction("reject")}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Claim
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground">
                        Select a claim to review
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Updates Tab */}
          <TabsContent value="updates" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Updates list */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search updates..."
                          value={updatesSearch}
                          onChange={(e) => setUpdatesSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={updatesStatus} onValueChange={setUpdatesStatus}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  {updatesLoading ? (
                    <CardContent className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">Loading updates...</p>
                    </CardContent>
                  ) : filteredUpdates.length === 0 ? (
                    <CardContent className="p-8 text-center">
                      <Diff className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground">
                        No updates found
                      </p>
                    </CardContent>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="divide-y divide-border">
                        {filteredUpdates.map((update) => (
                          <div
                            key={update.id}
                            className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                              selectedUpdateId === update.id ? "bg-muted/50" : ""
                            }`}
                            onClick={() => setSelectedUpdateId(update.id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-medium">{update.entityName || "Unknown"}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {parseChanges(update.proposedChanges).length} changes by {update.submitterName || "Anonymous"}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {getRequesterTypeBadge(update.requesterType || "external", update.source)}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeAgo(update.createdAt)}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(update.status)}
                                <Badge variant="outline" className="capitalize">
                                  {update.entityType}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </Card>
              </div>

              {/* Update detail with diff */}
              <div className="space-y-4">
                {selectedUpdate ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Proposed Changes</CardTitle>
                        <CardDescription>
                          Review and approve individual changes
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {parseChanges(selectedUpdate.proposedChanges).map((change, index) => (
                            <div
                              key={index}
                              className="p-3 rounded-md border border-border space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium capitalize">
                                  {change.field.replace(/([A-Z])/g, " $1").trim()}
                                </span>
                                {selectedUpdate.status === "pending" && (
                                  <Checkbox
                                    checked={selectedChanges[`change-${index}`] !== false}
                                    onCheckedChange={() => toggleChangeSelection(index)}
                                  />
                                )}
                              </div>
                              <div className="space-y-1">
                                {change.oldValue && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs text-red-500 font-mono">-</span>
                                    <span className="text-sm text-red-600 line-through">
                                      {String(change.oldValue)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-green-500 font-mono">+</span>
                                  <span className="text-sm text-green-600">
                                    {String(change.newValue)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Submitter Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {selectedUpdate.submitterName || "Anonymous"}
                        </div>
                        {selectedUpdate.submitterEmail && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {selectedUpdate.submitterEmail}
                          </div>
                        )}
                        <div className="mt-2">
                          {getRequesterTypeBadge(selectedUpdate.requesterType || "external", selectedUpdate.source)}
                        </div>
                        {selectedUpdate.reason && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Reason:</p>
                            <p className="text-sm">{selectedUpdate.reason}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {selectedUpdate.status === "pending" && (
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <Button 
                            className="w-full" 
                            onClick={() => handleUpdateAction("approve")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Apply Selected Changes
                          </Button>
                          <Button 
                            className="w-full text-destructive" 
                            variant="outline"
                            onClick={() => handleUpdateAction("reject")}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject All
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Diff className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground">
                        Select an update to review changes
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Review dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewAction === "approve" ? "Approve" : "Reject"} {activeTab === "claims" ? "Claim" : "Update"}
              </DialogTitle>
              <DialogDescription>
                Add any notes for this moderation action.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Add any internal notes..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={activeTab === "claims" ? submitClaimReview : submitUpdateReview}
                disabled={approveClaim.isPending || rejectClaim.isPending || approveUpdate.isPending || rejectUpdate.isPending}
                variant={reviewAction === "reject" ? "destructive" : "default"}
              >
                {(approveClaim.isPending || rejectClaim.isPending || approveUpdate.isPending || rejectUpdate.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirm {reviewAction === "approve" ? "Approval" : "Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
