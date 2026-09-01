/**
 * Team Access Management
 * Lets profile owners invite team members to manage their claimed entities
 * Supports role-based access: admin, editor, viewer
 */

import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  UserPlus,
  Users,
  Shield,
  Pencil,
  Eye,
  Trash2,
  Loader2,
  Mail,
  Building2,
  Calendar,
  Crown,
  AlertTriangle,
} from "lucide-react";

const ROLE_CONFIG: Record<string, { label: string; description: string; color: string; icon: any }> = {
  admin: {
    label: "Admin",
    description: "Full access: edit profile, manage jobs, view applicants, invite members",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    icon: Shield,
  },
  editor: {
    label: "Editor",
    description: "Can edit profile, post/manage jobs, and view applicants",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Pencil,
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access to profile, jobs, and applicant data",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    icon: Eye,
  },
};

export default function TeamAccess() {
  const { entityType, entityId } = useParams<{ entityType: string; entityId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("editor");
  const [removeDialog, setRemoveDialog] = useState<{ id: number; name: string } | null>(null);
  const [updateRoleDialog, setUpdateRoleDialog] = useState<{ id: number; name: string; currentRole: string } | null>(null);
  const [newRole, setNewRole] = useState<string>("editor");

  const numEntityId = Number(entityId);

  // Fetch team members
  const teamQuery = trpc.teamAccess.listTeamMembers.useQuery(
    { entityType: entityType as any, entityId: numEntityId },
    { enabled: !!entityType && !!numEntityId }
  );

  // Mutations
  const inviteMutation = trpc.teamAccess.inviteTeamMember.useMutation({
    onSuccess: () => {
      teamQuery.refetch();
      setInviteDialog(false);
      setInviteEmail("");
      setInviteRole("editor");
      toast({ title: "Team member invited", description: "They now have access to manage this profile." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateRoleMutation = trpc.teamAccess.updateTeamMemberRole.useMutation({
    onSuccess: () => {
      teamQuery.refetch();
      setUpdateRoleDialog(null);
      toast({ title: "Role updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeMutation = trpc.teamAccess.removeTeamMember.useMutation({
    onSuccess: () => {
      teamQuery.refetch();
      setRemoveDialog(null);
      toast({ title: "Team member removed" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const teamMembers = teamQuery.data?.members || [];
  const entityName = teamQuery.data?.entityName;
  const isOwner = teamQuery.data?.isOwner;

  const entityTypeLabel = entityType === "company" ? "Company"
    : entityType === "accelerator" ? "Accelerator"
    : entityType === "event" ? "Event"
    : entityType === "investor" ? "Investor"
    : entityType === "person" ? "Person"
    : "Entity";

  if (teamQuery.isLoading) {
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

  if (teamQuery.error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">{teamQuery.error.message}</p>
              <Button variant="outline" onClick={() => navigate("/dashboard/my-content")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Content
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="w-full max-w-[900px] mx-auto px-3 sm:px-6 py-6 md:py-8">
        {/* Back */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">{entityTypeLabel}</Badge>
            </div>
            <h1 className="text-2xl font-bold">
              Team Access{entityName ? `: ${entityName}` : ""}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage who can access and edit this {entityTypeLabel.toLowerCase()} profile
            </p>
          </div>
          {isOwner && (
            <Button onClick={() => setInviteDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>

        {/* Role Explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <Card key={key} className="border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center ${cfg.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-medium text-sm">{cfg.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{cfg.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Team Members Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Team Members
              <Badge variant="outline" className="ml-1">{teamMembers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {teamMembers.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-medium mb-1">No team members yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Invite team members to help manage this {entityTypeLabel.toLowerCase()}
                </p>
                {isOwner && (
                  <Button variant="outline" size="sm" onClick={() => setInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-1.5" /> Invite First Member
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Status</TableHead>
                      {isOwner && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Owner row */}
                    {false && (
                      <TableRow className="bg-amber-50/50 dark:bg-amber-900/10">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium text-sm shrink-0">
                              <Crown className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Owner</p>
                              <p className="text-xs text-muted-foreground">Owner</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-700 border-0">
                            <Crown className="h-3 w-3 mr-1" /> Owner
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">—</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Active</Badge>
                        </TableCell>
                        {isOwner && <TableCell />}
                      </TableRow>
                    )}

                    {/* Team members */}
                    {teamMembers.map((member: any) => {
                      const roleCfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
                      const RoleIcon = roleCfg.icon;
                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                                {(member.userName || member.userEmail || "?")[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{member.userName || "Invited User"}</p>
                                <p className="text-xs text-muted-foreground">{member.userEmail}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${roleCfg.color} border-0`}>
                              <RoleIcon className="h-3 w-3 mr-1" /> {roleCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${
                              member.status === "active"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {member.status === "active" ? "Active" : "Pending"}
                            </Badge>
                          </TableCell>
                          {isOwner && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Change Role"
                                  onClick={() => {
                                    setUpdateRoleDialog({ id: member.id, name: member.userName || member.userEmail, currentRole: member.role });
                                    setNewRole(member.role);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                  title="Remove Member"
                                  onClick={() => setRemoveDialog({ id: member.id, name: member.userName || member.userEmail })}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />

      {/* Invite Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Enter the email of the person you want to invite. They must have a {publication.name} account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{cfg.label}</span>
                        <span className="text-xs text-muted-foreground">— {cfg.description.split(",")[0]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                inviteMutation.mutate({
                  entityType: entityType as any,
                  entityId: numEntityId,
                  email: inviteEmail,
                  role: inviteRole as any,
                });
              }}
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Role Dialog */}
      <Dialog open={!!updateRoleDialog} onOpenChange={() => setUpdateRoleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role for {updateRoleDialog?.name}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>New Role</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {ROLE_CONFIG[newRole]?.description}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateRoleDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (updateRoleDialog) {
                  updateRoleMutation.mutate({
                    memberId: updateRoleDialog.id,
                    role: newRole as any,
                  });
                }
              }}
              disabled={updateRoleMutation.isPending}
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removeDialog} onOpenChange={() => setRemoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Remove Team Member
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <strong>{removeDialog?.name}</strong> from this {entityTypeLabel.toLowerCase()}?
            They will lose all access immediately.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (removeDialog) {
                  removeMutation.mutate({ memberId: removeDialog.id });
                }
              }}
              disabled={removeMutation.isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
