/**
 * Accelerators List Admin Page
 * Manage accelerator programs
 */

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { AdvancedPagination } from "@/components/admin/AdvancedPagination";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Rocket,
  ExternalLink,
  Loader2,
  Download,
  CheckCircle,
  FileX,
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import { exportToCSV, acceleratorExportColumns } from "@/lib/exportUtils";

const statusColors: Record<string, string> = {
  active: "bg-[#EBF3FF] text-[#0066FF]",
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-[#F0F2F5] text-[#1A1F36]",
  paused: "bg-yellow-100 text-yellow-700",
  // Workflow statuses
  draft: "bg-[#F0F2F5] text-[#697386]",
  submitted: "bg-blue-100 text-blue-700",
  editor_review: "bg-yellow-100 text-yellow-700",
  senior_editor_review: "bg-purple-100 text-purple-700",
  approved: "bg-[#EBF3FF] text-[#0066FF]",
  published: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-[#F0F2F5] text-[#697386]",
  trash: "bg-red-100 text-red-500",
};

const PAGE_SIZE_KEY = "techscoop_accelerators_page_size";

export default function AcceleratorsList() {
  const searchParams = useSearch();
  
  // Parse URL params
  const urlParams = new URLSearchParams(searchParams);
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  const initialSearch = urlParams.get("search") || "";
  const initialStatus = urlParams.get("status") || "all";
  const initialPageSize = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || "25", 10);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [status, setStatus] = useState<string>(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedAccelerators, setSelectedAccelerators] = useState<number[]>([]);
  const utils = trpc.useUtils();

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
    if (status !== "all") params.set("status", status);
    
    const newUrl = params.toString() ? `/admin/accelerators?${params.toString()}` : "/admin/accelerators";
    window.history.replaceState({}, "", newUrl);
  }, [page, debouncedSearch, status]);

  // Persist page size
  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_KEY, pageSize.toString());
  }, [pageSize]);

  const { data, isLoading, refetch } = trpc.accelerators.adminList.useQuery({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: status !== "all" ? (status as "active" | "upcoming" | "completed" | "paused") : undefined,
  });

  const deleteMutation = trpc.accelerators.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this accelerator?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedAccelerators([]);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Export query
  const exportQuery = trpc.accelerators.exportList.useQuery(
    {
      search: debouncedSearch || undefined,
      status: status !== "all" ? (status as any) : undefined,
    },
    { enabled: false }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data?.items) {
        exportToCSV(result.data.items as any, acceleratorExportColumns as any, `accelerators_export_${new Date().toISOString().split("T")[0]}`);
        toast.success(`Exported ${result.data.items.length} accelerators`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to export accelerators");
    } finally {
      setIsExporting(false);
    }
  };

  const accelerators = data?.items || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  const toggleAccelerator = (id: number) => {
    setSelectedAccelerators((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const toggleAll = () => {
    if (selectedAccelerators.length === accelerators.length) {
      setSelectedAccelerators([]);
    } else {
      setSelectedAccelerators(accelerators.map((a: any) => a.id));
    }
  };

  const bulkStatusMutation = trpc.accelerators.bulkUpdateStatus.useMutation({
    onSuccess: () => { utils.accelerators.adminList.invalidate(); setSelectedAccelerators([]); toast.success("Status updated"); },
  });
  const bulkDeleteMutation = trpc.accelerators.bulkDelete.useMutation({
    onSuccess: () => { utils.accelerators.adminList.invalidate(); setSelectedAccelerators([]); toast.success("Accelerators deleted"); },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Accelerators</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">Manage accelerator programs</p>
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
            <Link href="/admin/accelerators/new">
              <Button className="bg-emerald-500 hover:bg-[#0066FF] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Accelerator
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                <Input
                  placeholder="Search accelerators..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
              </div>
            ) : accelerators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#697386]">
                <Rocket className="h-12 w-12 mb-4 text-[#C8CDD6]" />
                <p className="text-lg font-medium">No accelerators found</p>
                <p className="text-sm">
                  {debouncedSearch || status !== "all"
                    ? "Try adjusting your search or filters"
                    : "Add your first accelerator to get started"}
                </p>
                {!debouncedSearch && status === "all" && (
                  <Link href="/admin/accelerators/new">
                    <Button className="mt-4 bg-[#0066FF] hover:bg-[#0052CC]">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Accelerator
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                {selectedAccelerators.length > 0 && (
                  <div className="flex items-center gap-4 mb-4 p-3 bg-[#F7F8FA] rounded-md">
                    <span className="text-sm font-medium text-[#1A1F36]">
                      {selectedAccelerators.length} selected
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate({ ids: selectedAccelerators, statusSlug: "published" })}>
                        {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                        Publish
                      </Button>
                      <Button variant="outline" size="sm" disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate({ ids: selectedAccelerators, statusSlug: "draft" })}>
                        Move to Draft
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600" disabled={bulkDeleteMutation.isPending} onClick={() => { if (confirm(`Delete ${selectedAccelerators.length} accelerators?`)) bulkDeleteMutation.mutate({ ids: selectedAccelerators }); }}>
                        {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedAccelerators.length === accelerators.length && accelerators.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className="w-[24%]">Accelerator</TableHead>
                      <TableHead className="w-[16%] hidden md:table-cell">Location</TableHead>
                      <TableHead className="w-[14%] hidden lg:table-cell">Program Length</TableHead>
                      <TableHead className="w-[14%]">Funding</TableHead>
                      <TableHead className="w-[10%] hidden md:table-cell">Status</TableHead>
                      <TableHead className="w-[14%]">Deadline</TableHead>
                      <TableHead className=" hidden lg:table-cell"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accelerators.map((accelerator) => (
                      <TableRow key={accelerator.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAccelerators.includes(accelerator.id)}
                            onCheckedChange={() => toggleAccelerator(accelerator.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            {accelerator.logo ? (
                              <img
                                src={accelerator.logo}
                                alt={accelerator.name}
                                className="w-10 h-10 rounded-md object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-[#EBF3FF] flex items-center justify-center shrink-0">
                                <Rocket className="h-5 w-5 text-[#0066FF]" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link href={`/admin/accelerators/${accelerator.id}`}>
                                <span className="font-medium hover:text-[#0066FF] cursor-pointer truncate block">{accelerator.name}</span>
                              </Link>
                              {accelerator.website && (
                                <a
                                  href={accelerator.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#0066FF] hover:underline flex items-center gap-1"
                                >
                                  Website <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-[#697386] truncate">
                          {accelerator.location || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-[#697386] truncate">
                          {accelerator.programLength || "—"}
                        </TableCell>
                        <TableCell className="text-[#697386] truncate">
                          {accelerator.funding || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[accelerator.workflowStatus || accelerator.status || "active"]}>
                            {accelerator.workflowStatusName || accelerator.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-[#697386]">
                          {accelerator.applicationDeadline
                            ? format(new Date(accelerator.applicationDeadline), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/accelerators/${accelerator.slug}`}>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                              </Link>
                              <Link href={`/admin/accelerators/${accelerator.id}`}>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              {(accelerator.workflowStatus || 'draft') !== "published" && (
                                <DropdownMenuItem
                                  onClick={() => bulkStatusMutation.mutate({ ids: [accelerator.id], statusSlug: "published" })}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              {(accelerator.workflowStatus || 'draft') !== "draft" && (
                                <DropdownMenuItem
                                  onClick={() => bulkStatusMutation.mutate({ ids: [accelerator.id], statusSlug: "draft" })}
                                >
                                  <FileX className="h-4 w-4 mr-2" />
                                  Move to Draft
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(accelerator.id)}
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
