/**
 * Talent / Assessments — recruiter
 * ----------------------------------------------------------------------
 * Assessment template management. List existing templates, create new,
 * edit. Question CRUD is deferred to a dedicated template editor (next
 * pass) — this page is the catalog index.
 *
 * Backend: assessments.template.list / create / update / delete / get
 */

import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { Plus, ClipboardList, Power, FileEdit } from "lucide-react";

type Category = "coding" | "system_design" | "technical_screen" | "behavioral" | "ai_interview" | "custom";

export default function TalentAssessments() {
  const utils = trpc.useUtils();
  const list = trpc.assessments.template.list.useQuery({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    category: "coding" as Category,
    durationMinutes: 60,
    passThreshold: 70,
  });

  const createMut = trpc.assessments.template.create.useMutation({
    onSuccess: () => {
      toast.success("Template created.");
      utils.assessments.template.list.invalidate();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.assessments.template.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated.");
      utils.assessments.template.list.invalidate();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.assessments.template.delete.useMutation({
    onSuccess: () => {
      toast.success("Template removed.");
      utils.assessments.template.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      name: "",
      slug: "",
      description: "",
      category: "coding",
      durationMinutes: 60,
      passThreshold: 70,
    });
    setDialogOpen(true);
  };

  const openEdit = (tpl: any) => {
    setEditingId(tpl.id);
    setForm({
      name: tpl.name,
      slug: tpl.slug,
      description: tpl.description ?? "",
      category: tpl.category,
      durationMinutes: tpl.durationMinutes ?? 60,
      passThreshold: tpl.passThreshold ?? 70,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (editingId === null) {
      createMut.mutate({
        name: form.name.trim(),
        slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: form.description || undefined,
        category: form.category,
        durationMinutes: form.durationMinutes,
        passThreshold: form.passThreshold,
      });
    } else {
      updateMut.mutate({
        id: editingId,
        name: form.name.trim(),
        description: form.description || undefined,
        category: form.category,
        durationMinutes: form.durationMinutes,
        passThreshold: form.passThreshold,
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assessment templates</h1>
            <p className="text-sm text-muted-foreground">
              Reusable test bundles. Invite candidates with a one-shot link from the candidate detail page.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> New template
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Pass</th>
                    <th className="px-4 py-3 font-medium">Active</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6">
                        <Skeleton className="h-16 w-full" />
                      </td>
                    </tr>
                  )}
                  {!list.isLoading && (list.data?.items.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        No templates yet. Create the first to start inviting candidates.
                      </td>
                    </tr>
                  )}
                  {list.data?.items.map((t: any) => (
                    <tr key={t.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{t.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{t.category.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">{t.durationMinutes ?? "—"}m</td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {t.passThreshold ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {t.isActive ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700">
                            No
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Link href={`/admin/talent/assessments/${t.id}`}>
                          <Button size="sm" variant="ghost">
                            <FileEdit className="h-3.5 w-3.5 mr-1" /> Questions
                          </Button>
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this template? Existing attempts are preserved but no new ones can be created.")) {
                              deleteMut.mutate({ id: t.id });
                            }
                          }}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId === null ? "New template" : "Edit template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Backend engineer screen"
              />
            </Field>
            {editingId === null && (
              <Field label="Slug (lowercase, auto-generated if blank)">
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                  placeholder="backend-screen"
                />
              </Field>
            )}
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Category">
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as Category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coding">Coding</SelectItem>
                    <SelectItem value="system_design">System design</SelectItem>
                    <SelectItem value="technical_screen">Technical screen</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="ai_interview">AI interview</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Duration (min)">
                <Input
                  type="number"
                  min={5}
                  max={600}
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({ ...form, durationMinutes: Number(e.target.value) || 60 })
                  }
                />
              </Field>
              <Field label="Pass threshold (0–100)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.passThreshold}
                  onChange={(e) =>
                    setForm({ ...form, passThreshold: Number(e.target.value) || 0 })
                  }
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {editingId === null ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
