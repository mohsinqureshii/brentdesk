/**
 * Applicant Tracker Page
 * Full-featured applicant management for company job owners
 * Status pipeline, notes, ratings, bulk actions, CSV export
 */

import { useState, useMemo } from "react";
import { fmtDate, fmtNumber } from "@/lib/dates";
import { useParams, Link, useLocation } from "wouter";
import { publication } from "@shared/publication";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Users,
  Star,
  Search,
  Download,
  Mail,
  Phone,
  Briefcase,
  Clock,
  Eye,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Filter,
  CheckCircle2,
  XCircle,
  UserCheck,
  Calendar,
  Linkedin,
  Globe,
  Loader2,
  TrendingUp,
  Send,
  MousePointerClick,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  new: { label: "New", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: Users },
  reviewed: { label: "Reviewed", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", icon: Eye },
  shortlisted: { label: "Shortlisted", color: "text-primary", bgColor: "bg-primary/10 border-primary", icon: CheckCircle2 },
  interview: { label: "Interview", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200", icon: Calendar },
  offered: { label: "Offered", color: "text-indigo-700", bgColor: "bg-indigo-50 border-indigo-200", icon: FileText },
  hired: { label: "Hired", color: "text-green-700", bgColor: "bg-green-50 border-green-200", icon: UserCheck },
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: XCircle },
  withdrawn: { label: "Withdrawn", color: "text-gray-700", bgColor: "bg-gray-50 border-gray-200", icon: ArrowLeft },
};

function StarRating({ rating, onRate, size = 16 }: { rating: number | null; onRate?: (r: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); onRate?.(i); }}
          className={`transition-colors ${onRate ? "cursor-pointer hover:text-amber-400" : "cursor-default"} ${
            i <= (rating || 0) ? "text-amber-400" : "text-gray-300"
          }`}
          disabled={!onRate}
        >
          <Star size={size} fill={i <= (rating || 0) ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function formatTimeAgo(date: string | Date | null): string {
  if (!date) return "N/A";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return fmtDate(new Date(date), { month: "short", day: "numeric", year: "numeric" });
}

export default function ApplicantTracker() {
  const { jobId } = useParams<{ jobId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [noteDialog, setNoteDialog] = useState<{ id: number; currentNote: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [bulkStatusDialog, setBulkStatusDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("reviewed");
  const [bulkNote, setBulkNote] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const numJobId = Number(jobId);

  // Fetch stats
  const statsQuery = trpc.jobApplications.getApplicantStats.useQuery(
    { jobId: numJobId },
    { enabled: !!numJobId }
  );

  // Fetch applications
  const applicationsQuery = trpc.jobApplications.getJobApplications.useQuery(
    {
      jobId: numJobId,
      status: statusFilter === "all" ? undefined : (statusFilter as any),
      page,
      limit,
    },
    { enabled: !!numJobId }
  );

  // Fetch interest/clicks
  const interestQuery = trpc.jobApplications.getJobInterest.useQuery(
    { jobId: numJobId },
    { enabled: !!numJobId }
  );

  const updateStatusMutation = trpc.jobApplications.updateApplicationStatus.useMutation({
    onSuccess: () => {
      applicationsQuery.refetch();
      statsQuery.refetch();
      toast({ title: "Status updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addNoteMutation = trpc.jobApplications.addApplicationNote.useMutation({
    onSuccess: () => {
      applicationsQuery.refetch();
      setNoteDialog(null);
      setNoteText("");
      toast({ title: "Note saved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const rateMutation = trpc.jobApplications.rateApplicant.useMutation({
    onSuccess: () => {
      applicationsQuery.refetch();
      toast({ title: "Rating saved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const bulkUpdateMutation = trpc.jobApplications.bulkUpdateStatus.useMutation({
    onSuccess: (data: any) => {
      applicationsQuery.refetch();
      statsQuery.refetch();
      setSelectedIds(new Set());
      setBulkStatusDialog(false);
      setBulkNote("");
      toast({ title: `${data.updated} applicants updated` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const exportQuery = trpc.jobApplications.exportApplicants.useQuery(
    { jobId: numJobId, status: statusFilter as any },
    { enabled: false }
  );

  const handleExportCSV = async () => {
    const result = await exportQuery.refetch();
    if (result.data) {
      const { headers, rows } = result.data;
      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) =>
          row.map((cell) => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `applicants-job-${jobId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "CSV exported successfully" });
    }
  };

  const applications = applicationsQuery.data?.applications || [];
  const totalApplicants = applicationsQuery.data?.total || 0;
  const totalPages = Math.ceil(totalApplicants / limit);
  const stats = statsQuery.data?.stats;
  const jobInfo = statsQuery.data?.job;
  const interest = interestQuery.data;

  // Filter by search locally
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return applications;
    const q = searchQuery.toLowerCase();
    return applications.filter(
      (a: any) =>
        a.applicantName?.toLowerCase().includes(q) ||
        a.applicantEmail?.toLowerCase().includes(q) ||
        a.currentCompany?.toLowerCase().includes(q) ||
        a.currentTitle?.toLowerCase().includes(q) ||
        a.userName?.toLowerCase().includes(q) ||
        a.userEmail?.toLowerCase().includes(q)
    );
  }, [applications, searchQuery]);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredApps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApps.map((a: any) => a.id)));
    }
  };

  if (applicationsQuery.isLoading || statsQuery.isLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {jobInfo?.companyLogo && (
                <img src={jobInfo.companyLogo} alt="" className="w-14 h-14 rounded-xl object-cover border" />
              )}
              <div>
                <h1 className="text-2xl font-bold">{jobInfo?.title || "Applicant Tracker"}</h1>
                <p className="text-muted-foreground">
                  {jobInfo?.companyName}{jobInfo?.location ? ` · ${jobInfo.location}` : ""}
                  {jobInfo?.roleType ? ` · ${jobInfo.roleType}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
              {selectedIds.size > 0 && (
                <Button size="sm" onClick={() => setBulkStatusDialog(true)}>
                  Update {selectedIds.size} Selected
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Pipeline */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              { key: "all", label: "Total", count: stats.total, color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
              { key: "new", label: "New", count: stats.new, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
              { key: "reviewed", label: "Reviewed", count: stats.reviewed, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
              { key: "shortlisted", label: "Shortlisted", count: stats.shortlisted, color: "bg-primary text-primary dark:bg-primary dark:text-primary" },
              { key: "interview", label: "Interview", count: stats.interview, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
              { key: "offered", label: "Offered", count: stats.offered, color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
              { key: "hired", label: "Hired", count: stats.hired, color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
              { key: "rejected", label: "Rejected", count: stats.rejected, color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => { setStatusFilter(s.key); setPage(1); }}
                className={`rounded-xl p-3 text-center transition-all border-2 ${
                  statusFilter === s.key
                    ? "border-primary ring-2 ring-primary/20 shadow-sm"
                    : "border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                } ${s.color}`}
              >
                <div className="text-2xl font-bold">{s.count}</div>
                <div className="text-xs font-medium mt-0.5">{s.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Interest Section */}
        {interest && interest.interestedUsers && interest.interestedUsers.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Recent Interest
                <Badge variant="outline" className="ml-1">{interest.interestedUsers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {interest.interestedUsers.slice(0, 20).map((viewer: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {(viewer.userName || "?").charAt(0)}
                    </div>
                    <span className="text-sm">{viewer.userName || "Anonymous"}</span>
                    <span className="text-xs text-muted-foreground">
                      {viewer.clickType === "apply_click" ? "applied" : "viewed"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatTimeAgo(viewer.createdAt)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, company, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Select All */}
        {filteredApps.length > 0 && (
          <div className="flex items-center gap-3 px-1 mb-4">
            <Checkbox
              checked={selectedIds.size === filteredApps.length && filteredApps.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${filteredApps.length} selected`
                : `Select all ${filteredApps.length} applicants`}
            </span>
          </div>
        )}

        {/* Applicant List */}
        {filteredApps.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-1">No applicants found</h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== "all"
                  ? "Try changing the status filter"
                  : "No one has applied to this job yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredApps.map((app: any) => {
              const isExpanded = expandedId === app.id;
              const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.new;
              const StatusIcon = statusCfg.icon;
              const name = app.applicantName || app.userName || "Unknown";
              const email = app.applicantEmail || app.userEmail || "";

              return (
                <Card
                  key={app.id}
                  className={`transition-all ${
                    selectedIds.has(app.id) ? "ring-2 ring-primary/30 border-primary/30" : ""
                  }`}
                >
                  <CardContent className="p-0">
                    {/* Main Row */}
                    <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5">
                      <Checkbox
                        checked={selectedIds.has(app.id)}
                        onCheckedChange={() => toggleSelect(app.id)}
                        className="mt-1"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                              {name[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <h3 className="font-semibold">{name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                {app.currentTitle && <span>{app.currentTitle}</span>}
                                {app.currentTitle && app.currentCompany && <span>at</span>}
                                {app.currentCompany && <span className="font-medium">{app.currentCompany}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`${statusCfg.bgColor} ${statusCfg.color} border`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusCfg.label}
                            </Badge>
                            <StarRating
                              rating={app.rating}
                              onRate={(r) => rateMutation.mutate({ applicationId: app.id, rating: r })}
                              size={14}
                            />
                          </div>
                        </div>

                        {/* Quick Info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" /> {email}
                          </span>
                          {app.applicantPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" /> {app.applicantPhone}
                            </span>
                          )}
                          {app.yearsOfExperience && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" /> {app.yearsOfExperience}y exp
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {formatTimeAgo(app.createdAt)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {app.applicationMethod === "profile" ? "Quick Apply" :
                             app.applicationMethod === "internal" ? publication.name : "Full Application"}
                          </Badge>
                        </div>

                        {/* Action Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select
                            value={app.status}
                            onValueChange={(v) =>
                              updateStatusMutation.mutate({ applicationId: app.id, status: v as any })
                            }
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setNoteDialog({ id: app.id, currentNote: app.statusNote || "" });
                              setNoteText(app.statusNote || "");
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1" />
                            {app.statusNote ? "Edit Note" : "Add Note"}
                          </Button>
                          {app.cvUrl && (
                            <a href={app.cvUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="h-8 text-xs">
                                <FileText className="h-3.5 w-3.5 mr-1" /> CV
                              </Button>
                            </a>
                          )}
                          {app.linkedinUrl && (
                            <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="h-8 text-xs">
                                <Linkedin className="h-3.5 w-3.5 mr-1" /> LinkedIn
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setExpandedId(isExpanded ? null : app.id)}
                          >
                            {isExpanded ? (
                              <><ChevronUp className="h-3.5 w-3.5 mr-1" /> Less</>
                            ) : (
                              <><ChevronDown className="h-3.5 w-3.5 mr-1" /> More</>
                            )}
                          </Button>
                        </div>

                        {/* Note Preview */}
                        {app.statusNote && !isExpanded && (
                          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                            <MessageSquare className="h-3 w-3 inline mr-1" />
                            {app.statusNote.length > 120 ? `${app.statusNote.substring(0, 120)}...` : app.statusNote}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-4 sm:p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Contact & Links */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Contact & Links</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                <a href={`mailto:${email}`} className="text-primary hover:underline truncate">{email}</a>
                              </div>
                              {app.applicantPhone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <a href={`tel:${app.applicantPhone}`} className="text-primary hover:underline">{app.applicantPhone}</a>
                                </div>
                              )}
                              {app.linkedinUrl && (
                                <div className="flex items-center gap-2">
                                  <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    LinkedIn Profile <ExternalLink className="h-3 w-3 inline" />
                                  </a>
                                </div>
                              )}
                              {app.portfolioUrl && (
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    Portfolio <ExternalLink className="h-3 w-3 inline" />
                                  </a>
                                </div>
                              )}
                              {app.cvUrl && (
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <a href={app.cvUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    Download CV <ExternalLink className="h-3 w-3 inline" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Professional Details */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Professional Details</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {app.yearsOfExperience && (
                                <div>
                                  <span className="text-muted-foreground block text-xs">Experience</span>
                                  <span className="font-medium">{app.yearsOfExperience} years</span>
                                </div>
                              )}
                              {app.expectedSalary && (
                                <div>
                                  <span className="text-muted-foreground block text-xs">Expected Salary</span>
                                  <span className="font-medium">{app.expectedSalaryCurrency} {fmtNumber(Number(app.expectedSalary))}</span>
                                </div>
                              )}
                              {app.noticePeriod && (
                                <div>
                                  <span className="text-muted-foreground block text-xs">Notice Period</span>
                                  <span className="font-medium">{app.noticePeriod}</span>
                                </div>
                              )}
                              {app.availability && (
                                <div>
                                  <span className="text-muted-foreground block text-xs">Availability</span>
                                  <span className="font-medium">{app.availability}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Cover Letter */}
                        {app.coverLetter && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Cover Letter</h4>
                            <div className="p-3 bg-background rounded-lg border text-sm whitespace-pre-wrap">{app.coverLetter}</div>
                          </div>
                        )}

                        {/* Notes */}
                        {app.statusNote && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Internal Notes</h4>
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800 text-sm whitespace-pre-wrap">{app.statusNote}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </main>

      <Footer />

      {/* Note Dialog */}
      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Internal Note</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Add internal notes about this applicant..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (noteDialog) addNoteMutation.mutate({ applicationId: noteDialog.id, note: noteText });
              }}
              disabled={addNoteMutation.isPending}
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={bulkStatusDialog} onOpenChange={setBulkStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {selectedIds.size} Applicants</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">New Status</label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG)
                    .filter(([k]) => k !== "withdrawn")
                    .map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Note (optional)</label>
              <Textarea
                placeholder="Add a note for all selected applicants..."
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                bulkUpdateMutation.mutate({
                  applicationIds: Array.from(selectedIds),
                  status: bulkStatus as any,
                  statusNote: bulkNote || undefined,
                });
              }}
              disabled={bulkUpdateMutation.isPending}
            >
              Update All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
