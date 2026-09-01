/**
 * Jobs List Page
 * Admin management for job listings
 */

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FilterBar, type Density } from "@/components/admin/FilterBar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter as FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { AdvancedPagination } from "@/components/admin/AdvancedPagination";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Briefcase,
  ExternalLink,
  Clock,
  Loader2,
  MapPin,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  FileX,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { exportToCSV, jobExportColumns } from "@/lib/exportUtils";

const statusColors: Record<string, string> = {
  draft: "bg-[#F0F2F5] text-[#697386]",
  published: "bg-green-100 text-green-600",
  expired: "bg-red-100 text-red-600",
  paused: "bg-yellow-100 text-yellow-600",
};

const typeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const PAGE_SIZE_KEY = "techscoop_jobs_page_size";

export default function JobsList() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  
  // Parse URL params
  const urlParams = new URLSearchParams(searchParams);
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  const initialSearch = urlParams.get("search") || "";
  const initialStatus = urlParams.get("status") || "all";
  const initialType = urlParams.get("type") || "all";
  const initialSortBy = (urlParams.get("sortBy") || "createdAt") as "createdAt" | "title" | "companyName" | "status" | "viewCount";
  const initialSortOrder = (urlParams.get("sortOrder") || "desc") as "asc" | "desc";
  const initialPageSize = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || "25", 10);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [sortBy, setSortBy] = useState<"createdAt" | "title" | "companyName" | "status" | "viewCount">(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isExporting, setIsExporting] = useState(false);
  // Density preference for the table — persisted across reloads. Affects
  // row padding only; column visibility unchanged.
  const [density, setDensity] = useState<Density>(
    (localStorage.getItem("jobsList:density") as Density) || "comfortable"
  );
  useEffect(() => {
    localStorage.setItem("jobsList:density", density);
  }, [density]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    
    const newUrl = params.toString() ? `/admin/jobs?${params.toString()}` : "/admin/jobs";
    window.history.replaceState({}, "", newUrl);
  }, [page, debouncedSearch, statusFilter, typeFilter, sortBy, sortOrder]);

  // Handle column sort click
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Persist page size
  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_KEY, pageSize.toString());
  }, [pageSize]);

  // Fetch jobs from API with server-side search
  const { data, isLoading, error, refetch } = trpc.jobs.adminList.useQuery({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    employmentType: typeFilter !== "all" ? typeFilter : undefined,
    sortBy,
    sortOrder,
  });

  // Delete mutation
  const deleteMutation = trpc.jobs.delete.useMutation({
    onSuccess: () => {
      toast.success("Job deleted successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete job");
    },
  });

  // Bulk status update mutation
  const bulkStatusMutation = trpc.jobs.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} jobs updated successfully`);
      setSelectedJobs([]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update jobs");
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = trpc.jobs.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} jobs deleted successfully`);
      setSelectedJobs([]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete jobs");
    },
  });

  const jobs = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const toggleJob = (id: number) => {
    setSelectedJobs((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedJobs.length === jobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(jobs.map((j: any) => j.id));
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this job?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedJobs([]);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    setSelectedJobs([]);
  };

  // Export query
  const exportQuery = trpc.jobs.exportList.useQuery(
    {
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      employmentType: typeFilter !== "all" ? typeFilter : undefined,
    },
    { enabled: false }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data?.items) {
        exportToCSV(result.data.items as any, jobExportColumns as any, `jobs_export_${new Date().toISOString().split("T")[0]}`);
        toast.success(`Exported ${result.data.items.length} jobs`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to export jobs");
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate stats
  const totalViews = jobs.reduce((sum: number, j: any) => sum + (j.viewCount || 0), 0);
  const totalApplications = jobs.reduce((sum: number, j: any) => sum + (j.applicationCount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Jobs</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">
              Manage job listings and applications
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </Button>
            <Link href="/admin/jobs/new">
              <Button className="bg-[#0066FF] hover:bg-[#0052CC]">
                <Plus className="h-4 w-4 mr-2" />
                Add Job
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Total Jobs</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">{total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-100">
                  <Eye className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Total Views</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">
                    {totalViews.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-purple-100">
                  <ExternalLink className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Applications</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">
                    {totalApplications}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-orange-100">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Expiring Soon</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">
                    {jobs.filter((j: any) => {
                      if (!j.expiresAt) return false;
                      const daysLeft = Math.ceil((new Date(j.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return daysLeft > 0 && daysLeft <= 7;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/*
          Filters & table — Square-style FilterBar primitive. Search +
          chips for active filters + density toggle. Status / Type pickers
          live in a single "Add filter" popover so the toolbar row stays
          quiet until the operator chooses to filter.
        */}
        <Card>
          <CardHeader>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search jobs by title, company, or location…"
              density={density}
              onDensityChange={setDensity}
              chips={[
                ...(statusFilter !== "all" ? [{ key: "status", label: "Status", value: statusFilter.replace(/_/g, " ") }] : []),
                ...(typeFilter   !== "all" ? [{ key: "type",   label: "Type",   value: typeFilter.replace(/_/g, " ") }] : []),
              ]}
              onChipRemove={(key) => {
                if (key === "status") setStatusFilter("all");
                if (key === "type")   setTypeFilter("all");
                setPage(1);
              }}
              onClearAll={() => { setStatusFilter("all"); setTypeFilter("all"); setPage(1); }}
              addFilterAction={
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 gap-1.5">
                      <FilterIcon className="h-4 w-4" /> Add filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#697386] mb-1.5">Status</p>
                      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#697386] mb-1.5">Job type</p>
                      <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="full_time">Full-time</SelectItem>
                          <SelectItem value="part_time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>
              }
            />
          </CardHeader>
          <CardContent>
            {selectedJobs.length > 0 && (
              <div className="flex items-center gap-4 mb-4 p-3 bg-[#F7F8FA] rounded-md">
                <span className="text-sm font-medium text-[#1A1F36]">
                  {selectedJobs.length} selected
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={bulkStatusMutation.isPending}
                    onClick={() => bulkStatusMutation.mutate({ ids: selectedJobs, statusSlug: "published" })}
                  >
                    {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Publish
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={bulkStatusMutation.isPending}
                    onClick={() => bulkStatusMutation.mutate({ ids: selectedJobs, statusSlug: "draft" })}
                  >
                    Move to Draft
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600"
                    disabled={bulkDeleteMutation.isPending}
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${selectedJobs.length} jobs?`)) {
                        bulkDeleteMutation.mutate({ ids: selectedJobs });
                      }
                    }}
                  >
                    {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Delete
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-red-600">
                Error loading jobs: {error.message}
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#697386]">
                <Briefcase className="h-12 w-12 mb-4 text-[#C8CDD6]" />
                <p className="text-lg font-medium">No jobs found</p>
                <p className="text-sm">
                  {debouncedSearch || statusFilter !== "all" || typeFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Create your first job listing to get started"}
                </p>
                {!debouncedSearch && statusFilter === "all" && typeFilter === "all" && (
                  <Link href="/admin/jobs/new">
                    <Button className="mt-4 bg-[#0066FF] hover:bg-[#0052CC]">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Job
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 hidden lg:table-cell">
                        <Checkbox
                          checked={selectedJobs.length === jobs.length && jobs.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className="w-[26%]">
                        <button onClick={() => handleSort("title")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          Job
                          {sortBy === "title" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-[18%] hidden md:table-cell">
                        <button onClick={() => handleSort("companyName")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          Company
                          {sortBy === "companyName" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-[12%] hidden md:table-cell">Type</TableHead>
                      <TableHead className="w-[16%]">Location</TableHead>
                      <TableHead className="w-[10%] hidden lg:table-cell">
                        <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          Status
                          {sortBy === "status" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-[10%] hidden lg:table-cell">
                        <button onClick={() => handleSort("viewCount")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          Views
                          {sortBy === "viewCount" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job: any) => (
                      <TableRow key={job.id} className={`group ${density === "compact" ? "[&>td]:py-1.5 text-sm" : ""}`}>
                        <TableCell className="hidden lg:table-cell">
                          <Checkbox
                            checked={selectedJobs.includes(job.id)}
                            onCheckedChange={() => toggleJob(job.id)}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link href={`/admin/jobs/${job.id}`}>
                                <span className="font-medium hover:text-[#0066FF] cursor-pointer truncate block max-w-full">{job.title}</span>
                              </Link>
                              {!!job.isFeatured && (
                                <Badge className="text-xs bg-amber-100 text-amber-800 shrink-0">Featured</Badge>
                              )}
                            </div>
                            <p className="text-xs text-[#9BA3B0] truncate">/{job.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#697386] truncate">{job.companyName || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">
                            {typeLabels[job.employmentType] || job.employmentType || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-[#697386] min-w-0">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="text-sm truncate">{job.location || "Remote"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[job.status] || statusColors.draft}>
                            {job.status || "draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-[#697386]">
                          {(job.viewCount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="md:opacity-0 md:group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => window.open(`/jobs/${job.slug}`, "_blank")}>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/jobs/${job.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              {job.status !== "published" && (
                                <DropdownMenuItem
                                  onClick={() => bulkStatusMutation.mutate({ ids: [job.id], statusSlug: "published" })}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              {job.status !== "draft" && (
                                <DropdownMenuItem
                                  onClick={() => bulkStatusMutation.mutate({ ids: [job.id], statusSlug: "draft" })}
                                >
                                  <FileX className="h-4 w-4 mr-2" />
                                  Move to Draft
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDelete(job.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                {/* Advanced Pagination */}
                <div className="px-4 border-t border-[#E0E3E8]">
                  <AdvancedPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={total}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
