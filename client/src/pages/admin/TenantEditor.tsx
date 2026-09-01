/**
 * Tenant Editor — admin page
 * ----------------------------------------------------------------------
 * Create + edit a tenant. Edit mode also surfaces membership management
 * (invite, change role, remove) inline so a tenant admin can manage
 * their team without leaving the page.
 *
 * Routes:
 *   /admin/tenants/new   (no id → create flow)
 *   /admin/tenants/:id   (with id → edit + members + audit)
 */

import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { publication } from "@shared/publication";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { ArrowLeft, ExternalLink, Save, Trash2, UserPlus } from "lucide-react";

type Plan = "free" | "starter" | "growth" | "enterprise";
type Status = "trial" | "active" | "suspended" | "cancelled";
type Residency = "us" | "eu" | "ksa";
type MemberRole = "owner" | "recruiter" | "hiring_manager" | "interviewer" | "viewer";

interface FormState {
  slug: string;
  name: string;
  customDomain: string;
  plan: Plan;
  status: Status;
  dataResidency: Residency;
  brandingPrimaryColor: string;
  brandingLogoUrl: string;
  trialDays: number;
  ownerUserId: string;
}

const EMPTY: FormState = {
  slug: "",
  name: "",
  customDomain: "",
  plan: "free",
  status: "trial",
  dataResidency: "us",
  brandingPrimaryColor: "",
  brandingLogoUrl: "",
  trialDays: 14,
  ownerUserId: "",
};

export default function TenantEditor() {
  const params = useParams<{ id?: string }>();
  const tenantId = params.id ? Number(params.id) : null;
  const isCreate = tenantId === null;
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [tab, setTab] = useState<"settings" | "members" | "compliance">("settings");

  const existing = trpc.tenants.list.useQuery(
    { page: 1, limit: 200 },
    { enabled: !isCreate },
  );
  const current = existing.data?.items.find((t) => t.id === tenantId);

  // Sync the form from the loaded row once it arrives.
  useEffect(() => {
    if (current) {
      setForm({
        slug: current.slug,
        name: current.name,
        customDomain: current.customDomain ?? "",
        plan: current.plan,
        status: current.status,
        dataResidency: current.dataResidency,
        brandingPrimaryColor: current.brandingPrimaryColor ?? "",
        brandingLogoUrl: current.brandingLogoUrl ?? "",
        trialDays: 14,
        ownerUserId: "",
      });
    }
  }, [current]);

  const createMut = trpc.tenants.create.useMutation({
    onSuccess: (t) => {
      toast.success(`Tenant ${t.slug} created.`);
      utils.tenants.list.invalidate();
      navigate(`/admin/tenants/${t.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.tenants.update.useMutation({
    onSuccess: () => {
      toast.success("Tenant updated.");
      utils.tenants.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (isCreate) {
      const ownerId = Number(form.ownerUserId);
      if (!ownerId) {
        toast.error("Owner user id is required when creating a tenant.");
        return;
      }
      createMut.mutate({
        slug: form.slug.trim(),
        name: form.name.trim(),
        customDomain: form.customDomain.trim() || undefined,
        plan: form.plan,
        dataResidency: form.dataResidency,
        brandingPrimaryColor: form.brandingPrimaryColor || undefined,
        brandingLogoUrl: form.brandingLogoUrl.trim() || undefined,
        trialDays: form.trialDays,
        ownerUserId: ownerId,
      });
      return;
    }
    updateMut.mutate({
      id: tenantId!,
      name: form.name.trim(),
      customDomain: form.customDomain.trim() || null,
      plan: form.plan,
      status: form.status,
      dataResidency: form.dataResidency,
      brandingPrimaryColor: form.brandingPrimaryColor || null,
      brandingLogoUrl: form.brandingLogoUrl.trim() || null,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/tenants">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isCreate ? "New tenant" : current?.name || `Tenant #${tenantId}`}
              </h1>
              {current && (
                <p className="text-xs text-muted-foreground font-mono">
                  {current.slug}.{publication.domain}{" "}
                  {current.customDomain && <>· {current.customDomain}</>}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isCreate && current && (
              <a
                href={`https://${current.slug}.${publication.domain}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" /> Open subdomain
                </Button>
              </a>
            )}
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isCreate ? "Create tenant" : "Save changes"}
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="members" disabled={isCreate}>
              Members
            </TabsTrigger>
            <TabsTrigger value="compliance" disabled={isCreate}>
              Compliance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <SettingsCard
              form={form}
              setForm={setForm}
              isCreate={isCreate}
            />
            <BrandingCard form={form} setForm={setForm} />
            {isCreate && <OwnerBootstrapCard form={form} setForm={setForm} />}
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            {!isCreate && tenantId !== null && <MembersTab tenantId={tenantId} />}
          </TabsContent>

          <TabsContent value="compliance" className="mt-4">
            {!isCreate && tenantId !== null && <ComplianceTab tenantId={tenantId} />}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ============================================================
// Settings card
// ============================================================

function SettingsCard({
  form,
  setForm,
  isCreate,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  isCreate: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic information</CardTitle>
        <CardDescription>
          Slug becomes the subdomain. Lowercase letters, digits, and hyphens only.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <Field label="Tenant name *">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Acme Corp"
          />
        </Field>
        <Field label={isCreate ? "Slug *" : "Slug (read-only after create)"}>
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            placeholder="acme"
            disabled={!isCreate}
          />
        </Field>
        <Field label="Custom domain">
          <Input
            value={form.customDomain}
            onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
            placeholder="careers.acme.com"
          />
        </Field>
        <Field label="Plan">
          <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v as Plan })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {!isCreate && (
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as Status })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Data residency">
          <Select
            value={form.dataResidency}
            onValueChange={(v) => setForm({ ...form, dataResidency: v as Residency })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="eu">European Union</SelectItem>
              <SelectItem value="ksa">Saudi Arabia (PDPL)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </CardContent>
    </Card>
  );
}

function BrandingCard({
  form,
  setForm,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Customize how the tenant's subdomain looks. Primary color drives buttons
          and accents; logo replaces the {publication.name} wordmark in the tenant's UI.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <Field label="Logo URL">
          <Input
            value={form.brandingLogoUrl}
            onChange={(e) => setForm({ ...form, brandingLogoUrl: e.target.value })}
            placeholder="https://cdn.acme.com/logo.svg"
          />
        </Field>
        <Field label="Primary color (hex)">
          <div className="flex gap-2">
            <Input
              type="color"
              value={form.brandingPrimaryColor || "#1f2937"}
              onChange={(e) => setForm({ ...form, brandingPrimaryColor: e.target.value })}
              className="w-16 h-10 p-1"
            />
            <Input
              value={form.brandingPrimaryColor}
              onChange={(e) => setForm({ ...form, brandingPrimaryColor: e.target.value })}
              placeholder="#1f2937"
              className="flex-1 font-mono"
            />
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}

function OwnerBootstrapCard({
  form,
  setForm,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Owner + trial</CardTitle>
        <CardDescription>
          The owner user becomes the first member of the tenant (role: owner)
          and can sign in on the subdomain immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <Field label="Owner user id *">
          <Input
            type="number"
            value={form.ownerUserId}
            onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}
            placeholder="123"
          />
        </Field>
        <Field label="Trial days (0 = no trial)">
          <Input
            type="number"
            min={0}
            max={365}
            value={form.trialDays}
            onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) || 0 })}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

// ============================================================
// Members tab
// ============================================================

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Owner",
  recruiter: "Recruiter",
  hiring_manager: "Hiring manager",
  interviewer: "Interviewer",
  viewer: "Viewer",
};

const ROLE_STYLES: Record<MemberRole, string> = {
  owner: "bg-purple-100 text-purple-800",
  recruiter: "bg-blue-100 text-blue-800",
  hiring_manager: "bg-indigo-100 text-indigo-800",
  interviewer: "bg-cyan-100 text-cyan-800",
  viewer: "bg-gray-100 text-gray-800",
};

function MembersTab({ tenantId }: { tenantId: number }) {
  const utils = trpc.useUtils();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("recruiter");

  const members = trpc.tenants.listMembers.useQuery({ tenantId });

  const inviteMut = trpc.tenants.inviteMember.useMutation({
    onSuccess: () => {
      toast.success("Invite sent.");
      utils.tenants.listMembers.invalidate({ tenantId });
      setInviteOpen(false);
      setInviteUserId("");
    },
    onError: (e) => toast.error(e.message),
  });

  const changeRoleMut = trpc.tenants.changeRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated.");
      utils.tenants.listMembers.invalidate({ tenantId });
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMut = trpc.tenants.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed.");
      utils.tenants.listMembers.invalidate({ tenantId });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            People with access to this tenant. Owners can manage members; everyone
            else's role determines what they can see and do.
          </CardDescription>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Invite member
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">User id</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!members.isLoading && (members.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No members yet. Invite the first one.
                  </td>
                </tr>
              )}
              {members.data?.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs">{m.userId}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        changeRoleMut.mutate({
                          tenantId,
                          userId: m.userId,
                          role: v as MemberRole,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABEL) as MemberRole[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={ROLE_STYLES[m.role as MemberRole]}>
                      {m.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            `Remove user ${m.userId} from this tenant? They will lose access immediately.`,
                          )
                        ) {
                          removeMut.mutate({ tenantId, userId: m.userId });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="User id">
              <Input
                type="number"
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                placeholder="123"
              />
            </Field>
            <Field label="Role">
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as MemberRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const uid = Number(inviteUserId);
                if (!uid) {
                  toast.error("Enter a valid user id.");
                  return;
                }
                inviteMut.mutate({ tenantId, userId: uid, role: inviteRole });
              }}
              disabled={inviteMut.isPending}
            >
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================
// Compliance tab (DSAR / erasure / retention / audit)
// ============================================================

function ComplianceTab({ tenantId }: { tenantId: number }) {
  const policies = trpc.compliance.listPolicies.useQuery({ tenantId });
  const erasures = trpc.compliance.listErasureRequests.useQuery({ page: 1, limit: 25 });
  const accessLog = trpc.compliance.recentAccess.useQuery({ tenantId, limit: 50 });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Retention policies</CardTitle>
          <CardDescription>
            How long each kind of record is kept before automatic erasure.
            Edit defaults to comply with GDPR / CCPA / PDPL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(policies.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom policies. Platform defaults apply: candidates 730d,
              applications 365d, assessment attempts 180d.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="py-2 font-medium">Subject</th>
                  <th className="py-2 font-medium">Days</th>
                  <th className="py-2 font-medium">Trigger</th>
                  <th className="py-2 font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {policies.data?.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 capitalize">{p.subjectType}</td>
                    <td className="py-2">{p.retentionDays}</td>
                    <td className="py-2 text-xs">{p.appliesWhen}</td>
                    <td className="py-2">{p.isActive ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Erasure requests</CardTitle>
          <CardDescription>
            Right-to-be-forgotten requests. Approved requests enter a 30-day
            grace period before hard delete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(erasures.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No erasure requests.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="py-2 font-medium">Candidate</th>
                  <th className="py-2 font-medium">Basis</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Grace ends</th>
                </tr>
              </thead>
              <tbody>
                {erasures.data?.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="py-2 font-mono text-xs">#{e.candidateId}</td>
                    <td className="py-2 text-xs">{e.legalBasis ?? "—"}</td>
                    <td className="py-2">
                      <Badge variant="outline">{e.status}</Badge>
                    </td>
                    <td className="py-2 text-xs">
                      {e.gracePeriodEndsAt
                        ? new Date(e.gracePeriodEndsAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PII access log (recent 50)</CardTitle>
          <CardDescription>
            Every read/export/update of candidate PII is recorded here for
            compliance audit purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(accessLog.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accesses logged yet. The log will populate as recruiters open
              candidate profiles, export DSAR bundles, etc.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr>
                  <th className="py-2 font-medium">Time</th>
                  <th className="py-2 font-medium">Actor</th>
                  <th className="py-2 font-medium">Action</th>
                  <th className="py-2 font-medium">Subject</th>
                </tr>
              </thead>
              <tbody>
                {accessLog.data?.map((row) => (
                  <tr key={String(row.id)} className="border-t">
                    <td className="py-2 text-xs">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 font-mono text-xs">
                      #{row.actorUserId}
                      {row.actorRole && ` (${row.actorRole})`}
                    </td>
                    <td className="py-2 text-xs">{row.action}</td>
                    <td className="py-2 text-xs">
                      {row.subjectType} #{row.subjectId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
