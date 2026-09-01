/**
 * ClaimProfileButton - Reusable component for claiming entity profiles
 * Full claim form with: reason (required), proof, company email, auto-displayed user email
 * Shows: Claim button, Claimed badge, Pending badge, Manage Profile button
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck,
  Clock,
  Settings,
  UserCheck,
  Loader2,
  LogIn,
  Mail,
  Building2,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

type EntityType = "person" | "company" | "accelerator" | "event" | "investor";

interface ClaimProfileButtonProps {
  entityType: EntityType;
  entityId: number;
  entityName: string;
  compact?: boolean;
  className?: string;
}

export function ClaimProfileButton({
  entityType,
  entityId,
  entityName,
  compact = false,
  className = "",
}: ClaimProfileButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [proofText, setProofText] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");

  // Check if this entity is claimed by anyone (public)
  const { data: claimStatus } = trpc.claimedProfiles.getClaimStatus.useQuery(
    { entityType, entityId },
    { enabled: !!entityId }
  );

  // Check if current user has a claim (protected - only when logged in)
  const { data: userClaim, refetch: refetchUserClaim } = trpc.claimedProfiles.checkClaim.useQuery(
    { entityType, entityId },
    { enabled: !!user && !!entityId }
  );

  const utils = trpc.useUtils();

  const claimMutation = trpc.claimedProfiles.claimProfile.useMutation({
    onSuccess: () => {
      toast.success("Claim request submitted! An admin will review your request.");
      setShowClaimDialog(false);
      setRequestNote("");
      setProofText("");
      setCompanyEmail("");
      refetchUserClaim();
      utils.claimedProfiles.getClaimStatus.invalidate({ entityType, entityId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit claim request");
    },
  });

  const handleClaim = () => {
    if (!user) {
      window.location.href = "/signin";
      return;
    }
    setShowClaimDialog(true);
  };

  const handleSubmitClaim = () => {
    if (!requestNote.trim()) {
      toast.error("Please provide a reason for your claim");
      return;
    }
    claimMutation.mutate({
      entityType,
      entityId,
      requestNote: requestNote.trim(),
      proofText: proofText.trim() || undefined,
      companyEmail: companyEmail.trim() || undefined,
      role: "owner",
    });
  };

  const entityLabel = {
    person: "Person",
    company: "Company",
    accelerator: "Accelerator",
    event: "Event",
    investor: "Investor",
  }[entityType];

  if (authLoading) return null;

  // User is the approved owner - show Manage Profile button
  if (userClaim?.claimed && userClaim.status === "approved") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1.5 px-3 py-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Claimed
        </Badge>
        <Button
          size={compact ? "sm" : "default"}
          variant="outline"
          className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={() => navigate("/dashboard/claimed-profiles")}
        >
          <Settings className="h-4 w-4" />
          {compact ? "Manage" : "Manage Profile"}
        </Button>
      </div>
    );
  }

  // User has a pending or under_review claim
  if (userClaim?.claimed && (userClaim.status === "pending" || userClaim.status === "under_review")) {
    return (
      <Badge className={`bg-amber-100 text-amber-800 border-amber-200 gap-1.5 px-3 py-1 ${className}`}>
        <Clock className="h-3.5 w-3.5" />
        {userClaim.status === "under_review" ? "Under Review" : "Claim Pending"}
      </Badge>
    );
  }

  // Needs clarification
  if (userClaim?.claimed && userClaim.status === "needs_clarification") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 gap-1.5 px-3 py-1">
          <HelpCircle className="h-3.5 w-3.5" />
          Clarification Needed
        </Badge>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
          onClick={() => navigate("/dashboard/claimed-profiles")}
        >
          <AlertCircle className="h-4 w-4" />
          View Details
        </Button>
      </div>
    );
  }

  // User's claim was rejected
  if (userClaim?.claimed && userClaim.status === "rejected") {
    return (
      <Badge className={`bg-red-100 text-red-800 border-red-200 gap-1.5 px-3 py-1 ${className}`} variant="outline">
        Claim Rejected
      </Badge>
    );
  }

  // Entity is claimed by someone else (not the current user) - show badge only
  if (claimStatus?.isClaimed && (!user || claimStatus.claimedByUserId !== user.id)) {
    return (
      <Badge className={`bg-emerald-100 text-emerald-800 border-emerald-200 gap-1.5 px-3 py-1 ${className}`}>
        <ShieldCheck className="h-3.5 w-3.5" />
        Claimed
      </Badge>
    );
  }

  // Not claimed - show claim button
  return (
    <>
      <Button
        size={compact ? "sm" : "default"}
        variant="outline"
        className={`gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 ${className}`}
        onClick={handleClaim}
      >
        {!user ? (
          <LogIn className="h-4 w-4" />
        ) : (
          <UserCheck className="h-4 w-4" />
        )}
        {compact ? "Claim" : `Claim this ${entityLabel}`}
      </Button>

      {/* Claim Dialog with Full Form */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              Claim {entityLabel} Profile
            </DialogTitle>
            <DialogDescription>
              Submit a claim request for <strong>{entityName}</strong>. An admin will review and
              verify your ownership before approving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Info Banner */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                <strong>What happens next?</strong> After submitting, an admin will review your request.
                You may be asked for additional clarification. Once approved, you will be able to manage
                this profile, post content, and manage job listings.
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

            {/* Reason (Required) */}
            <div className="space-y-1.5">
              <Label htmlFor="requestNote" className="flex items-center gap-1.5 text-sm">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Reason for Claiming <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="requestNote"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="e.g. I am the founder/CEO of this company, I am the person listed, I represent this organization..."
                rows={3}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{requestNote.length}/2000 characters</p>
            </div>

            {/* Proof (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="proofText" className="flex items-center gap-1.5 text-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                Proof of Ownership <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="proofText"
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder="Provide any proof: LinkedIn profile URL, company website link, official document reference, etc."
                rows={2}
                maxLength={2000}
              />
            </div>

            {/* Company Email (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="companyEmail" className="flex items-center gap-1.5 text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Company / Organization Email <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="companyEmail"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
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
              onClick={handleSubmitClaim}
              disabled={claimMutation.isPending || !requestNote.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {claimMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Submit Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
