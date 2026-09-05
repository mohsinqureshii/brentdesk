/**
 * Claimed Profiles Page
 * Users can claim and manage multiple profiles (companies, people, accelerators, events, investors)
 * Company profile owners can access the company jobs dashboard from here
 */

import { useState, useMemo } from "react";
import { fmtDate } from "@/lib/dates";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import { Link, useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Building2,
  User,
  Rocket,
  Calendar,
  TrendingUp,
  Plus,
  ExternalLink,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Shield,
  FileText,
  BarChart3,
  ArrowLeft,
  Loader2,
  Settings,
  Mail,
  ShieldCheck,
  HelpCircle,
  Eye,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";

type EntityType = "company" | "person" | "accelerator" | "event" | "investor";

const ENTITY_TYPES: { value: EntityType; label: string; icon: typeof Building2; color: string; bgColor: string }[] = [
  { value: "company", label: "Company", icon: Building2, color: "text-blue-600", bgColor: "bg-blue-100" },
  { value: "person", label: "Person", icon: User, color: "text-violet-600", bgColor: "bg-violet-100" },
  { value: "accelerator", label: "Accelerator", icon: Rocket, color: "text-purple-600", bgColor: "bg-purple-100" },
  { value: "event", label: "Event", icon: Calendar, color: "text-orange-600", bgColor: "bg-orange-100" },
  { value: "investor", label: "Investor", icon: TrendingUp, color: "text-primary", bgColor: "bg-primary" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle }> = {
  approved: { label: "Approved", color: "text-green-700", bgColor: "bg-green-100", icon: CheckCircle },
  pending: { label: "Pending Review", color: "text-blue-700", bgColor: "bg-blue-100", icon: Clock },
  under_review: { label: "Under Review", color: "text-yellow-700", bgColor: "bg-yellow-100", icon: Eye },
  needs_clarification: { label: "Needs Clarification", color: "text-orange-700", bgColor: "bg-orange-100", icon: HelpCircle },
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-100", icon: XCircle },
};

export default function ClaimedProfiles() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claimType, setClaimType] = useState<EntityType>("company");
  const [claimSearch, setClaimSearch] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [selectedEntityName, setSelectedEntityName] = useState<string>("");
  const [claimReason, setClaimReason] = useState("");
  const [claimProof, setClaimProof] = useState("");
  const [claimCompanyEmail, setClaimCompanyEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch claimed profiles
  const { data: profiles, isLoading } = trpc.claimedProfiles.myClaimedProfiles.useQuery(
    undefined,
    { enabled: !!user }
  );

  const utils = trpc.useUtils();

  // Claim mutation
  const claimMutation = trpc.claimedProfiles.claimProfile.useMutation({
    onSuccess: () => {
      toast.success("Claim submitted! An admin will review your request.");
      setShowClaimDialog(false);
      resetClaimForm();
      utils.claimedProfiles.myClaimedProfiles.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit claim");
    },
  });

  // Remove claim mutation
  const removeMutation = trpc.claimedProfiles.removeClaim.useMutation({
    onSuccess: () => {
      toast.success("Claim removed.");
      utils.claimedProfiles.myClaimedProfiles.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove claim");
    },
  });

  const resetClaimForm = () => {
    setSelectedEntityId(null);
    setSelectedEntityName("");
    setClaimReason("");
    setClaimProof("");
    setClaimCompanyEmail("");
    setClaimSearch("");
  };

  const profileList = profiles || [];

  // Filter by status
  const filteredProfiles = useMemo(() => {
    if (statusFilter === "all") return profileList;
    return profileList.filter((p) => p.status === statusFilter);
  }, [profileList, statusFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: profileList.length };
    for (const p of profileList) {
      c[p.status] = (c[p.status] || 0) + 1;
    }
    return c;
  }, [profileList]);

  // Count by type
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of profileList) {
      c[p.entityType] = (c[p.entityType] || 0) + 1;
    }
    return c;
  }, [profileList]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Sign in Required</h2>
              <p className="text-muted-foreground mb-4">
                You need to sign in to manage your claimed profiles.
              </p>
              <Button asChild>
                <Link href="/signin">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const handleClaim = () => {
    if (!selectedEntityId || !claimType) return;
    if (!claimReason.trim()) {
      toast.error("Please provide a reason for your claim");
      return;
    }
    claimMutation.mutate({
      entityType: claimType,
      entityId: selectedEntityId,
      requestNote: claimReason.trim(),
      proofText: claimProof.trim() || undefined,
      companyEmail: claimCompanyEmail.trim() || undefined,
    });
  };

  const getEntityLink = (type: string, slug: string | null, name: string | null) => {
    const s = slug || name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unknown";
    switch (type) {
      case "company": return `/companies/${s}`;
      case "person": return `/people/${s}`;
      case "accelerator": return `/accelerators/${s}`;
      case "event": return `/events/${s}`;
      case "investor": return `/investors/${s}`;
      default: return "#";
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status];
    if (!config) return <Badge variant="outline">{status}</Badge>;
    const Icon = config.icon;
    return (
      <Badge className={`${config.bgColor} ${config.color} border-0 gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-primary" />
              Claimed Profiles
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your claimed companies, people, accelerators, events, and investor profiles
            </p>
          </div>
          <Button onClick={() => { resetClaimForm(); setShowClaimDialog(true); }} className="gap-2 shrink-0 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Claim a Profile
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {ENTITY_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <Card key={type.value} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 text-center">
                  <div className={`h-8 w-8 rounded-lg ${type.bgColor} flex items-center justify-center mx-auto mb-1.5`}>
                    <Icon className={`h-4 w-4 ${type.color}`} />
                  </div>
                  <p className="text-xl font-bold">{typeCounts[type.value] || 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{type.label}s</p>
                </CardContent>
              </Card>
            );
          })}
          <Card className="hover:shadow-sm transition-shadow border-primary/20">
            <CardContent className="p-3 text-center">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xl font-bold">{profileList.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {(["all", "approved", "pending", "under_review", "needs_clarification", "rejected"] as const).map((status) => {
            const count = statusCounts[status] || 0;
            const isActive = statusFilter === status;
            const config = STATUS_CONFIG[status];
            return (
              <Button
                key={status}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`gap-1.5 shrink-0 ${isActive ? "" : "text-muted-foreground"}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? "All" : config?.label || status}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-muted"}`}>
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Profiles List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-muted rounded-xl" />
                    <div className="flex-1">
                      <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter === "all" ? "No Claimed Profiles Yet" : `No ${STATUS_CONFIG[statusFilter]?.label || statusFilter} Claims`}
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                {statusFilter === "all"
                  ? "Claim a company, person, accelerator, event, or investor profile to manage it and post content."
                  : "No claims match this filter."}
              </p>
              {statusFilter === "all" && (
                <Button onClick={() => { resetClaimForm(); setShowClaimDialog(true); }} className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  Claim Your First Profile
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProfiles.map((profile) => {
              const typeInfo = ENTITY_TYPES.find((t) => t.value === profile.entityType);
              const Icon = typeInfo?.icon || Building2;

              return (
                <Card key={profile.id} className="hover:shadow-md transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Entity Avatar */}
                      <Avatar className="h-14 w-14 rounded-xl shrink-0">
                        <AvatarImage src={profile.entityLogo || undefined} className="rounded-xl object-cover" />
                        <AvatarFallback className={`rounded-xl ${typeInfo?.bgColor || "bg-muted"}`}>
                          <Icon className={`h-6 w-6 ${typeInfo?.color || "text-muted-foreground"}`} />
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {profile.entityName || `${typeInfo?.label} #${profile.entityId}`}
                          </h3>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeInfo?.bgColor || ""} ${typeInfo?.color || ""} border-0`}>
                            {typeInfo?.label || profile.entityType}
                          </Badge>
                          {getStatusBadge(profile.status)}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          Role: <span className="capitalize font-medium">{profile.role}</span>
                          {profile.createdAt && ` · Claimed ${fmtDate(new Date(profile.createdAt), { month: "short", day: "numeric", year: "numeric" })}`}
                          {profile.reviewedAt && ` · Reviewed ${fmtDate(new Date(profile.reviewedAt), { month: "short", day: "numeric", year: "numeric" })}`}
                        </p>

                        {/* Verification note for rejected/needs_clarification */}
                        {(profile.status === "rejected" || profile.status === "needs_clarification") && profile.verificationNote && (
                          <div className={`mt-2 p-2.5 rounded-lg text-sm ${
                            profile.status === "rejected" ? "bg-red-50 text-red-700 border border-red-200" : "bg-orange-50 text-orange-700 border border-orange-200"
                          }`}>
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-xs uppercase tracking-wide mb-0.5">
                                  {profile.status === "rejected" ? "Rejection Reason" : "Clarification Needed"}
                                </p>
                                <p>{profile.verificationNote}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {/* Approved profile actions */}
                          {profile.status === "approved" && (
                            <>
                              <Button variant="outline" size="sm" asChild className="gap-1.5">
                                <Link href={getEntityLink(profile.entityType, profile.entitySlug, profile.entityName)}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  View Profile
                                </Link>
                              </Button>

                              {/* Company-specific: Jobs Dashboard */}
                              {profile.entityType === "company" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => navigate(`/dashboard/company-jobs/${profile.entityId}`)}
                                  >
                                    <LayoutDashboard className="h-3.5 w-3.5" />
                                    Jobs Dashboard
                                  </Button>
                                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/dashboard/my-content/job/new?companyId=${profile.entityId}`)}>
                                    <Briefcase className="h-3.5 w-3.5" />
                                    Post a Job
                                  </Button>
                                  <Button variant="outline" size="sm" asChild className="gap-1.5">
                                    <Link href={`/dashboard/applicant-tracker/${profile.entityId}`}>
                                      <BarChart3 className="h-3.5 w-3.5" />
                                      Applicants
                                    </Link>
                                  </Button>
                                </>
                              )}

                              {/* Person-specific */}
                              {profile.entityType === "person" && (
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Content posting from person profiles is coming soon.")}>
                                  <FileText className="h-3.5 w-3.5" />
                                  Post Content
                                </Button>
                              )}
                            </>
                          )}

                          {/* Pending/Rejected: Remove */}
                          {(profile.status === "pending" || profile.status === "rejected") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive gap-1.5"
                              onClick={() => removeMutation.mutate({ claimId: profile.id })}
                              disabled={removeMutation.isPending}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Remove Claim
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Claim Profile Dialog - Full Form */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Claim a Profile
            </DialogTitle>
            <DialogDescription>
              Select the profile you want to claim. An admin will review and verify your ownership.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Info Banner */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                <strong>What happens next?</strong> After submitting, an admin will review your request.
                You may be asked for additional clarification. Once approved, you can manage the profile,
                post content, and manage job listings.
              </p>
            </div>

            {/* Auto-displayed User Email */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Your Account Email
              </Label>
              <Input
                value={user?.email || "No email on file"}
                disabled
                className="bg-muted/50 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">Auto-detected from your account</p>
            </div>

            {/* Entity Type Selection */}
            <div className="space-y-1.5">
              <Label className="text-sm">Profile Type</Label>
              <Select
                value={claimType}
                onValueChange={(v) => {
                  setClaimType(v as EntityType);
                  setSelectedEntityId(null);
                  setSelectedEntityName("");
                  setClaimSearch("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search for entity */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Search for {ENTITY_TYPES.find((t) => t.value === claimType)?.label || "Profile"}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {claimSearch.length >= 2 && (
                <div className="mt-1 border rounded-lg max-h-48 overflow-y-auto">
                  <SearchResults
                    type={claimType}
                    query={claimSearch}
                    selectedId={selectedEntityId}
                    onSelect={(id, name) => {
                      setSelectedEntityId(id);
                      setSelectedEntityName(name);
                    }}
                  />
                </div>
              )}
              {selectedEntityId && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Selected: <strong>{selectedEntityName}</strong>
                </p>
              )}
            </div>

            <Separator />

            {/* Reason (Required) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Reason for Claiming <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                placeholder="e.g. I am the founder/CEO of this company, I am the person listed, I represent this organization..."
                rows={3}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{claimReason.length}/2000 characters</p>
            </div>

            {/* Proof (Optional) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                Proof of Ownership <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                value={claimProof}
                onChange={(e) => setClaimProof(e.target.value)}
                placeholder="Provide any proof: LinkedIn profile URL, company website link, official document reference, etc."
                rows={2}
                maxLength={2000}
              />
            </div>

            {/* Company Email (Optional) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Company / Organization Email <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                type="email"
                value={claimCompanyEmail}
                onChange={(e) => setClaimCompanyEmail(e.target.value)}
                placeholder="your.name@company.com"
              />
              <p className="text-xs text-muted-foreground">
                Providing a company email helps speed up verification
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClaimDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleClaim}
              disabled={!selectedEntityId || !claimReason.trim() || claimMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {claimMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Submit Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

// Search Results Component - searches entities by type
function SearchResults({
  type,
  query,
  selectedId,
  onSelect,
}: {
  type: EntityType;
  query: string;
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
}) {
  const { data: results, isLoading } = trpc.claimedProfiles.searchEntities.useQuery(
    { entityType: type, query },
    { enabled: query.length >= 2 }
  );

  if (isLoading) {
    return (
      <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Searching...
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        No results found for "{query}"
      </div>
    );
  }

  return (
    <div>
      {results.map((result) => (
        <button
          key={result.id}
          className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center justify-between transition-colors ${
            selectedId === result.id ? "bg-primary/10 border-l-2 border-primary" : ""
          }`}
          onClick={() => onSelect(result.id, result.name)}
        >
          <div>
            <p className="text-sm font-medium">{result.name}</p>
            {result.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{result.description}</p>
            )}
          </div>
          {selectedId === result.id && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
        </button>
      ))}
    </div>
  );
}
