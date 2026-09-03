/**
 * InlineEditBanner
 * Shows an edit banner on public entity profiles when the current user
 * is the claimed owner, creator, or an admin.
 * Provides a prominent "Edit Profile" button that links to the full editor.
 */

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Pencil, ExternalLink, ShieldCheck } from "lucide-react";

type EntityType = "company" | "person" | "investor" | "accelerator" | "event";

interface InlineEditBannerProps {
  entityType: EntityType;
  entityId: number;
  entityName?: string;
}

export function InlineEditBanner({ entityType, entityId, entityName }: InlineEditBannerProps) {
  const t = useT();
  const { user } = useAuth();

  const { data: editCheck } = trpc.claimedProfiles.checkCanEdit.useQuery(
    { entityType, entityId },
    { enabled: !!user && !!entityId }
  );

  if (!editCheck?.canEdit || !editCheck.editUrl) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-3 sm:p-4 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {t("profile.youManage")}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {t("profile.editDetails", { name: entityName || entityType })}
            </p>
          </div>
        </div>
        <Link href={editCheck.editUrl}>
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            <Pencil className="w-3.5 h-3.5" />
            {t("profile.editProfile")}
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

/**
 * InlineEditableSection
 * Wraps a section of a public profile with a subtle edit indicator.
 * Shows a pencil icon on hover when the user can edit.
 */
interface InlineEditableSectionProps {
  canEdit: boolean;
  editUrl: string;
  sectionLabel?: string;
  children: React.ReactNode;
}

export function InlineEditableSection({ canEdit, editUrl, sectionLabel, children }: InlineEditableSectionProps) {
  const t = useT();
  if (!canEdit) return <>{children}</>;

  return (
    <div className="group relative">
      {children}
      <Link href={editUrl}>
        <button
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm border border-border rounded-lg p-1.5 shadow-sm hover:bg-muted"
          title={sectionLabel ? t("profile.editSection", { section: sectionLabel }) : t("profile.editThisSection")}
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </Link>
    </div>
  );
}

/**
 * useCanEditEntity hook
 * Returns canEdit and editUrl for a given entity.
 */
export function useCanEditEntity(entityType: EntityType, entityId: number) {
  const { user } = useAuth();

  const { data } = trpc.claimedProfiles.checkCanEdit.useQuery(
    { entityType, entityId },
    { enabled: !!user && !!entityId }
  );

  return {
    canEdit: data?.canEdit || false,
    editUrl: data?.editUrl || "",
  };
}
