/**
 * ClaimProfileButton - Reusable component for claiming entity profiles
 * Full claim form with: reason (required), proof, company email, auto-displayed user email
 * Shows: Claim button, Claimed badge, Pending badge, Manage Profile button
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useT } from "@/lib/i18n";
import type { UiKey } from "@shared/uiStrings";

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

const entityLabelKeys: Record<EntityType, UiKey> = {
  person: "claim.entityPerson",
  company: "claim.entityCompany",
  accelerator: "claim.entityAccelerator",
  event: "claim.entityEvent",
  investor: "claim.entityInvestor",
};

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
  const t = useT();
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
      toast.success(t("claim.submitted"));
      setShowClaimDialog(false);
      setRequestNote("");
      setProofText("");
      setCompanyEmail("");
      refetchUserClaim();
      utils.claimedProfiles.getClaimStatus.invalidate({ entityType, entityId });
    },
    onError: (error) => {
      toast.error(error.message || t("claim.submitFailed"));
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
      toast.error(t("claim.reasonRequired"));
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

  const entityLabel = t(entityLabelKeys[entityType]);

  if (authLoading) return null;

  // User is the approved owner - show Manage Profile button
  if (userClaim?.claimed && userClaim.status === "approved") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1.5 px-3 py-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("claim.claimed")}
        </Badge>
        <Button
          size={compact ? "sm" : "default"}
          variant="outline"
          className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={() => navigate("/dashboard/claimed-profiles")}
        >
          <Settings className="h-4 w-4" />
          {compact ? t("claim.manage") : t("claim.manageProfile")}
        </Button>
      </div>
    );
  }

  // User has a pending or under_review claim
  if (userClaim?.claimed && (userClaim.status === "pending" || userClaim.status === "under_review")) {
    return (
      <Badge className={`bg-amber-100 text-amber-800 border-amber-200 gap-1.5 px-3 py-1 ${className}`}>
        <Clock className="h-3.5 w-3.5" />
        {userClaim.status === "under_review" ? t("claim.underReview") : t("claim.pending")}
      </Badge>
    );
  }

  // Needs clarification
  if (userClaim?.claimed && userClaim.status === "needs_clarification") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 gap-1.5 px-3 py-1">
          <HelpCircle className="h-3.5 w-3.5" />
          {t("claim.clarificationNeeded")}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
          onClick={() => navigate("/dashboard/claimed-profiles")}
        >
          <AlertCircle className="h-4 w-4" />
          {t("common.viewDetails")}
        </Button>
      </div>
    );
  }

  // User's claim was rejected
  if (userClaim?.claimed && userClaim.status === "rejected") {
    return (
      <Badge className={`bg-red-100 text-red-800 border-red-200 gap-1.5 px-3 py-1 ${className}`} variant="outline">
        {t("claim.rejected")}
      </Badge>
    );
  }

  // Entity is claimed by someone else (not the current user) - show badge only
  if (claimStatus?.isClaimed && (!user || claimStatus.claimedByUserId !== user.id)) {
    return (
      <Badge className={`bg-emerald-100 text-emerald-800 border-emerald-200 gap-1.5 px-3 py-1 ${className}`}>
        <ShieldCheck className="h-3.5 w-3.5" />
        {t("claim.claimed")}
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
        {compact ? t("claim.claim") : t("claim.claimThis", { entity: entityLabel })}
      </Button>

      {/* Claim Dialog with Full Form */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              {t("claim.claimProfileTitle", { entity: entityLabel })}
            </DialogTitle>
            <DialogDescription>
              {t("claim.submitRequestFor")} <strong>{entityName}</strong>. {t("claim.adminWillVerify")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Info Banner */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                <strong>{t("claim.whatNext")}</strong> {t("claim.whatNextBody")}
              </p>
            </div>

            {/* Auto-displayed User Email */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {t("claim.accountEmail")}
              </Label>
              <Input
                value={user?.email || t("claim.noEmailOnFile")}
                disabled
                className="bg-muted/50 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">{t("claim.autoDetected")}</p>
            </div>

            {/* Reason (Required) */}
            <div className="space-y-1.5">
              <Label htmlFor="requestNote" className="flex items-center gap-1.5 text-sm">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                {t("claim.reasonLabel")} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="requestNote"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder={t("claim.reasonPlaceholder")}
                rows={3}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{t("claim.charCount", { n: requestNote.length })}</p>
            </div>

            {/* Proof (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="proofText" className="flex items-center gap-1.5 text-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                {t("claim.proofLabel")} <span className="text-muted-foreground">{t("common.optional")}</span>
              </Label>
              <Textarea
                id="proofText"
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder={t("claim.proofPlaceholder")}
                rows={2}
                maxLength={2000}
              />
            </div>

            {/* Company Email (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="companyEmail" className="flex items-center gap-1.5 text-sm">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {t("claim.companyEmailLabel")} <span className="text-muted-foreground">{t("common.optional")}</span>
              </Label>
              <Input
                id="companyEmail"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="your.name@company.com"
              />
              <p className="text-xs text-muted-foreground">
                {t("claim.companyEmailHelp")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClaimDialog(false)}>
              {t("common.cancel")}
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
              {t("claim.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
