/**
 * Talent / Pipeline — recruiter kanban
 * ----------------------------------------------------------------------
 * Kanban-style view of ATS pipeline stages with click-to-move actions
 * (no drag-drop dep — we use prev/next stage buttons on each card).
 * Scoped by job: pick a job from the dropdown to view its applicants
 * across the pipeline.
 *
 * Backend:
 *   - ats.pipeline.listStages({ jobId })       — columns
 *   - jobApplications.getJobApplications      — cards per column
 *   - ats.pipeline.moveApplication            — click-to-move
 */

import { useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Kanban, Mail } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  sourcing: "bg-slate-50 border-slate-200",
  screening: "bg-blue-50 border-blue-200",
  interviewing: "bg-purple-50 border-purple-200",
  offer: "bg-amber-50 border-amber-200",
  hired: "bg-green-50 border-green-200",
  rejected: "bg-red-50 border-red-200",
};

export default function TalentPipeline() {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const jobs = trpc.jobs.adminList.useQuery({
    page: 1,
    limit: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const stages = trpc.ats.pipeline.listStages.useQuery(
    { jobId: selectedJobId ?? undefined },
    { enabled: selectedJobId !== null },
  );

  const moveMut = trpc.ats.pipeline.moveApplication.useMutation({
    onSuccess: () => {
      toast.success("Moved.");
      utils.jobApplications.getJobApplications.invalidate();
      void stagesRefetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const stagesRefetch = async () => {
    if (selectedJobId !== null) {
      await utils.ats.pipeline.listStages.invalidate({ jobId: selectedJobId });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              Click an applicant to advance them through the pipeline. Stages are configured per tenant.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedJobId !== null ? String(selectedJobId) : ""}
              onValueChange={(v) => setSelectedJobId(v ? Number(v) : null)}
            >
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Pick a job to view its pipeline" />
              </SelectTrigger>
              <SelectContent>
                {jobs.data?.items.map((j: any) => (
                  <SelectItem key={j.id} value={String(j.id)}>
                    {j.title} · {j.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedJobId === null ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Kanban className="h-10 w-10 mx-auto mb-2 opacity-50" />
              Pick a job above to see its pipeline.
            </CardContent>
          </Card>
        ) : stages.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        ) : (
          <PipelineBoard
            jobId={selectedJobId}
            stages={(stages.data as any[]) ?? []}
            onMove={(applicationId, toStageId) =>
              moveMut.mutate({ applicationId, toStageId })
            }
            isMoving={moveMut.isPending}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function PipelineBoard({
  jobId,
  stages,
  onMove,
  isMoving,
}: {
  jobId: number;
  stages: any[];
  onMove: (applicationId: number, toStageId: number) => void;
  isMoving: boolean;
}) {
  const apps = trpc.jobApplications.getJobApplications.useQuery({
    jobId,
    status: "all",
    page: 1,
    limit: 500,
  });

  // Group applications by current_stage_id (which we don't yet have on
  // the legacy applications shape — fall back to splitting evenly until
  // the ATS-pipeline link lands on the application list payload).
  const byStage = useMemo(() => {
    const map = new Map<number | null, any[]>();
    const list = (apps.data?.applications ?? []) as any[];
    for (const app of list) {
      const key = app.currentStageId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(app);
    }
    return map;
  }, [apps.data]);

  const orderedStages = [...stages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const stageIndex = (id: number) => orderedStages.findIndex((s) => s.id === id);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {orderedStages.map((stage, i) => {
        const apps = byStage.get(stage.id) ?? [];
        const colorClass = CATEGORY_COLORS[stage.category] ?? "bg-muted/30";
        const prevId = i > 0 ? orderedStages[i - 1].id : null;
        const nextId = i < orderedStages.length - 1 ? orderedStages[i + 1].id : null;

        return (
          <div
            key={stage.id}
            className={`flex-shrink-0 w-72 rounded-lg border ${colorClass}`}
          >
            <div className="px-3 py-2 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{stage.name}</span>
                <Badge variant="outline">{apps.length}</Badge>
              </div>
            </div>
            <div className="p-2 space-y-2 max-h-[70vh] overflow-y-auto">
              {apps.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No applicants here.
                </p>
              ) : (
                apps.map((a) => (
                  <ApplicationCard
                    key={a.id}
                    application={a}
                    canBack={prevId !== null}
                    canForward={nextId !== null}
                    onBack={() => prevId !== null && onMove(a.id, prevId)}
                    onForward={() => nextId !== null && onMove(a.id, nextId)}
                    disabled={isMoving}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicationCard({
  application,
  canBack,
  canForward,
  onBack,
  onForward,
  disabled,
}: {
  application: any;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-background rounded border p-3 space-y-2">
      <div>
        <div className="font-medium text-sm">{application.applicantName}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" /> {application.applicantEmail}
        </div>
      </div>
      {application.currentTitle && (
        <div className="text-xs text-muted-foreground">
          {application.currentTitle}
          {application.currentCompany && ` at ${application.currentCompany}`}
        </div>
      )}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5"
            onClick={onBack}
            disabled={!canBack || disabled}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5"
            onClick={onForward}
            disabled={!canForward || disabled}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        {application.rating != null && (
          <Badge variant="outline" className="text-xs">
            ★ {application.rating}
          </Badge>
        )}
      </div>
    </div>
  );
}
