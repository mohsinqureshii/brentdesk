/**
 * Company Jobs Dashboard
 * Dedicated view for claimed company owners showing:
 * - Summary stats (total jobs, applications, views, clicks)
 * - All jobs with per-job analytics
 * - Quick actions (post job, view applicants)
 */

import { useState, useMemo } from "react";
import { fmtDate } from "@/lib/dates";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Link, useLocation, useParams } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Users,
  Eye,
  MousePointer,
  ArrowLeft,
  Loader2,
  Plus,
  ExternalLink,
  BarChart3,
  TrendingUp,
  Building2,
  Shield,
  Clock,
  CheckCircle,
  FileText,
  MapPin,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Pause,
  Play,
  Copy,
  Archive,
  UserPlus,
  Pencil,
} from "lucide-react";

export default function CompanyJobsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = useParams<{ companyId: string }>();
  const companyId = parseInt(params.companyId || "0", 10);

  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [bulkActionDialog, setBulkActionDialog] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = trpc.claimedProfiles.companyJobsDashboard.useQuery(
    { companyId },
    { enabled: !!user && companyId > 0 }
  );

  const bulkStatusMutation = trpc.claimedProfiles.bulkUpdateJobStatus.useMutation({
    onSuccess: (d: any) => { refetch(); setSelectedJobIds(new Set()); setBulkActionDialog(null); toast({ title: `${d.updated} jobs updated` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const duplicateJobMutation = trpc.claimedProfiles.duplicateJob.useMutation({
    onSuccess: () => { refetch(); setSelectedJobIds(new Set()); setBulkActionDialog(null); toast({ title: "Job duplicated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleJobSelect = (id: number) => {
    const next = new Set(selectedJobIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedJobIds(next);
  };

  const toggleSelectAllJobs = () => {
    if (!data?.jobs) return;
    if (selectedJobIds.size === data.jobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(data.jobs.map((j: any) => j.id)));
    }
  };

  const executeBulkAction = (action: string) => {
    const ids = Array.from(selectedJobIds);
    if (action === "pause" || action === "unpause" || action === "archive") {
      bulkStatusMutation.mutate({ companyId, jobIds: ids, action: action as "pause" | "unpause" | "archive" });
    } else if (action === "duplicate") {
      // Duplicate each selected job one by one
      ids.forEach(id => duplicateJobMutation.mutate({ companyId, jobId: id }));
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return fmtDate(new Date(date), {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatNumber = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  if (authLoading) {
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
              <p className="text-muted-foreground mb-4">You need to sign in to access the company dashboard.</p>
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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                {error.message || "You don't have access to this company's dashboard."}
              </p>
              <Button variant="outline" onClick={() => navigate("/dashboard/my-content")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to My Content
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

      <main className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Back Button */}
        <Link
          href="/dashboard/my-content"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to My Content</span>
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center h-[40vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <>
            {/* Company Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-xl shrink-0">
                  <AvatarImage src={data.company.logo || undefined} className="rounded-xl object-cover" />
                  <AvatarFallback className="rounded-xl bg-blue-100 text-blue-600 text-xl font-bold">
                    {data.company.name?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    {data.company.name}
                  </h1>
                  <p className="text-muted-foreground mt-0.5">
                    Company Jobs Dashboard · {(data.summary.totalJobs as number)} total jobs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/dashboard/team-access/company/${companyId}`)}
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Team Access
                </Button>
                <Button
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate(`/dashboard/my-content/job/new?companyId=${companyId}`)}
                >
                  <Plus className="h-4 w-4" />
                  Post New Job
                </Button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{(data.summary.totalJobs as number)}</p>
                      <p className="text-xs text-muted-foreground">Total Jobs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{(data.summary.activeJobs as number)}</p>
                      <p className="text-xs text-muted-foreground">Active Jobs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatNumber(data.summary.totalApplications as number)}</p>
                      <p className="text-xs text-muted-foreground">Applications</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatNumber(data.summary.newApplications as number)}</p>
                      <p className="text-xs text-muted-foreground">New / Unreviewed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                      <Eye className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatNumber(data.summary.totalViews as number)}</p>
                      <p className="text-xs text-muted-foreground">Job Views</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                      <MousePointer className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatNumber(data.summary.totalClicks as number)}</p>
                      <p className="text-xs text-muted-foreground">Apply Clicks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Jobs Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    All Jobs
                  </CardTitle>
                  <Badge variant="outline" className="text-sm">
                    {data.jobs.length} jobs
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {data.jobs.length === 0 ? (
                  <div className="py-16 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                    <h3 className="font-semibold text-lg mb-2">No Jobs Posted Yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                      Start posting jobs to attract talent and track applications.
                    </p>
                    <Button
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                      onClick={() => navigate(`/dashboard/my-content/job/new?companyId=${companyId}`)}
                    >
                      <Plus className="h-4 w-4" />
                      Post Your First Job
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={data.jobs.length > 0 && selectedJobIds.size === data.jobs.length}
                              onCheckedChange={toggleSelectAllJobs}
                            />
                          </TableHead>
                          <TableHead className="min-w-[250px]">Job Title</TableHead>
                          <TableHead className="text-center">Applications</TableHead>
                          <TableHead className="text-center">New</TableHead>
                          <TableHead className="text-center">Shortlisted</TableHead>
                          <TableHead className="text-center">Views</TableHead>
                          <TableHead className="text-center">Clicks</TableHead>
                          <TableHead>Posted</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.jobs.map((job: any) => {
                          const conversionRate = job.interest.views > 0
                            ? ((job.applications.total / job.interest.views) * 100).toFixed(1)
                            : "0.0";

                          return (
                            <TableRow key={job.id} className={`hover:bg-muted/30 ${selectedJobIds.has(job.id) ? 'bg-primary/5' : ''}`}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedJobIds.has(job.id)}
                                  onCheckedChange={() => toggleJobSelect(job.id)}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{job.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                    {job.location && (
                                      <span className="flex items-center gap-0.5">
                                        <MapPin className="h-3 w-3" />
                                        {job.location}
                                      </span>
                                    )}
                                    {job.employmentType && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                                        {job.employmentType}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-semibold">{job.applications.total}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                {job.applications.new > 0 ? (
                                  <Badge className="bg-amber-100 text-amber-700 border-0">
                                    {job.applications.new}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {job.applications.shortlisted > 0 ? (
                                  <Badge className="bg-green-100 text-green-700 border-0">
                                    {job.applications.shortlisted}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-sm">{formatNumber(job.interest.views)}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-sm">{formatNumber(job.interest.clicks)}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(job.createdAt)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => navigate(`/jobs/${job.slug}`)}
                                    title="View Job"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => navigate(`/dashboard/applicant-tracker/${job.id}`)}
                                    title="View Applicants"
                                  >
                                    <Users className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => navigate(`/dashboard/my-content/job/${job.id}`)}
                                    title="Edit Job"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conversion Insights */}
            {data.jobs.length > 0 && ((data.summary.totalViews as number) > 0 || (data.summary.totalApplications as number) > 0) && (
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    Conversion Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">View → Apply Rate</p>
                      <p className="text-2xl font-bold">
                        {(data.summary.totalViews as number) > 0
                          ? (((data.summary.totalApplications as number) / (data.summary.totalViews as number)) * 100).toFixed(1)
                          : "0.0"}%
                      </p>
                      <Progress
                        value={(data.summary.totalViews as number) > 0
                          ? Math.min(((data.summary.totalApplications as number) / (data.summary.totalViews as number)) * 100, 100)
                          : 0}
                        className="mt-2 h-2"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Click → Apply Rate</p>
                      <p className="text-2xl font-bold">
                        {(data.summary.totalClicks as number) > 0
                          ? (((data.summary.totalApplications as number) / (data.summary.totalClicks as number)) * 100).toFixed(1)
                          : "0.0"}%
                      </p>
                      <Progress
                        value={(data.summary.totalClicks as number) > 0
                          ? Math.min(((data.summary.totalApplications as number) / (data.summary.totalClicks as number)) * 100, 100)
                          : 0}
                        className="mt-2 h-2"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Avg. Applications per Job</p>
                      <p className="text-2xl font-bold">
                        {(data.summary.totalJobs as number) > 0
                          ? ((data.summary.totalApplications as number) / (data.summary.totalJobs as number)).toFixed(1)
                          : "0"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Across {(data.summary.totalJobs as number)} total jobs
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </main>

      <Footer />

      {/* Bulk Action Bar */}
      {selectedJobIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-lg rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-medium">{selectedJobIds.size} job{selectedJobIds.size > 1 ? 's' : ''} selected</span>
          <div className="h-5 w-px bg-border" />
          <Button variant="outline" size="sm" onClick={() => setBulkActionDialog("pause")}>
            <Pause className="h-3.5 w-3.5 mr-1" /> Pause
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkActionDialog("unpause")}>
            <Play className="h-3.5 w-3.5 mr-1" /> Unpause
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkActionDialog("duplicate")}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setBulkActionDialog("archive")}>
            <Archive className="h-3.5 w-3.5 mr-1" /> Archive
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedJobIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={!!bulkActionDialog} onOpenChange={() => setBulkActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkActionDialog === "pause" && "Pause Selected Jobs"}
              {bulkActionDialog === "unpause" && "Unpause Selected Jobs"}
              {bulkActionDialog === "duplicate" && "Duplicate Selected Jobs"}
              {bulkActionDialog === "archive" && "Archive Selected Jobs"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {bulkActionDialog === "pause" && `This will pause ${selectedJobIds.size} job(s). Paused jobs won't appear in search results.`}
            {bulkActionDialog === "unpause" && `This will unpause ${selectedJobIds.size} job(s) and make them visible again.`}
            {bulkActionDialog === "duplicate" && `This will create ${selectedJobIds.size} duplicate job(s) as drafts.`}
            {bulkActionDialog === "archive" && `This will archive ${selectedJobIds.size} job(s). Archived jobs can be restored later.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(null)}>Cancel</Button>
            <Button
              onClick={() => executeBulkAction(bulkActionDialog!)}
              variant={bulkActionDialog === "archive" ? "destructive" : "default"}
              disabled={bulkStatusMutation.isPending || duplicateJobMutation.isPending}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
