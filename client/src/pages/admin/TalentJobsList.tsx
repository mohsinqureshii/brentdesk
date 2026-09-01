/**
 * Talent / Jobs — recruiter overview
 * ----------------------------------------------------------------------
 * Every job in the current scope (legacy public board if on apex,
 * tenant's jobs if on a tenant subdomain). Each row links into the
 * pipeline / applications / job detail.
 *
 * Why this page exists: the pipeline kanban requires picking a job
 * from a dropdown, which is awkward when you have 20+ jobs. This is
 * the index — pick what to drill into.
 */

import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  ExternalLink,
  Kanban,
  Search,
  Users,
  Sparkles,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-100 text-green-800",
  archived: "bg-amber-100 text-amber-800",
  closed: "bg-red-100 text-red-800",
};

export default function TalentJobsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const utils = trpc.useUtils();

  const query = trpc.jobs.adminList.useQuery({
    page: 1,
    limit: 200,
    search: search.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const seedMut = trpc.ats.pipeline.seedDefaults.useMutation({
    onSuccess: (r: any) => {
      toast.success(
        r.seeded
          ? "Default pipeline stages seeded. Pipeline view is now usable."
          : "Pipeline already set up — no action needed.",
      );
      void utils.ats.pipeline.listStages.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
            <p className="text-sm text-muted-foreground">
              Every job in your scope. Click into one to see its pipeline and applicants.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMut.mutate()}
              disabled={seedMut.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" /> Seed default pipeline
            </Button>
            <Link href="/admin/jobs/new">
              <Button size="sm">
                <Briefcase className="h-4 w-4 mr-2" /> New job
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or company"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Job</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Applicants</th>
                    <th className="px-4 py-3 font-medium text-right">Views</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading && <SkeletonRows />}
                  {!query.isLoading && (query.data?.items.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        No jobs in your scope yet.
                        <div className="mt-3">
                          <Link href="/admin/jobs/new">
                            <Button size="sm">Post a job</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                  {query.data?.items.map((j: any) => (
                    <tr key={j.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link href={`/admin/jobs/${j.id}`}>
                          <span className="font-medium hover:underline cursor-pointer">
                            {j.title}
                          </span>
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {j.location ?? "Remote"}
                          {j.publishedAt && (
                            <> · published {new Date(j.publishedAt).toLocaleDateString()}</>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{j.companyName}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={STATUS_STYLES[j.status as string] ?? ""}
                        >
                          {j.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {j.applicationCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                        {j.viewCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Link href={`/admin/talent/pipeline?jobId=${j.id}`}>
                          <Button variant="ghost" size="sm">
                            <Kanban className="h-3.5 w-3.5 mr-1" /> Pipeline
                          </Button>
                        </Link>
                        <Link href={`/jobs/${j.slug ?? j.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {query.data && (
          <p className="text-xs text-muted-foreground">
            Showing {query.data.items.length} of {query.data.total} jobs.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <tr key={i} className="border-t">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
