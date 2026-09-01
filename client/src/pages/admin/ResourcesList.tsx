/**
 * Resources List Page
 * Admin management for resources with type tabs, status badges, and proper table layout
 */

import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  FileText,
  Gift,
  Wrench,
  BookOpen,
  GraduationCap,
  Download,
  Loader2,
  CheckCircle,
  FileX,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Shield,
  Calculator,
  Package,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { exportToCSV, resourceExportColumns } from "@/lib/exportUtils";

// Type configuration with icons and colors
const typeConfig: Record<string, { label: string; icon: React.ElementType; bgColor: string; textColor: string }> = {
  template: { label: "Templates", icon: FileText, bgColor: "bg-blue-50", textColor: "text-blue-600" },
  perk: { label: "Perks", icon: Gift, bgColor: "bg-[#F0F7FF]", textColor: "text-[#0066FF]" },
  tool: { label: "Tools", icon: Wrench, bgColor: "bg-purple-50", textColor: "text-purple-600" },
  playbook: { label: "Playbooks", icon: BookOpen, bgColor: "bg-orange-50", textColor: "text-orange-600" },
  regulation: { label: "Regulations", icon: Shield, bgColor: "bg-red-50", textColor: "text-red-600" },
  toolkit: { label: "Toolkits", icon: Package, bgColor: "bg-cyan-50", textColor: "text-cyan-600" },
  program: { label: "Programs", icon: GraduationCap, bgColor: "bg-pink-50", textColor: "text-pink-600" },
  grant: { label: "Grants", icon: Sparkles, bgColor: "bg-amber-50", textColor: "text-amber-600" },
  other: { label: "Other", icon: FileText, bgColor: "bg-[#F7F8FA]", textColor: "text-[#697386]" },
};

// Status badge styling
const statusBadgeConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-[#F0F2F5] text-[#1A1F36] border-[#E0E3E8]" },
  published: { label: "Published", className: "bg-[#F0F7FF] text-[#0066FF] border-[#C7DCFF]" },
  archived: { label: "Archived", className: "bg-amber-50 text-amber-700 border-amber-200" },
  submitted: { label: "Submitted", className: "bg-blue-50 text-blue-700 border-blue-200" },
};

// Type tabs for filtering
const typeTabs = [
  { key: "all", label: "All Resources" },
  { key: "template", label: "Templates" },
  { key: "perk", label: "Perks" },
  { key: "tool", label: "Tools" },
  { key: "playbook", label: "Playbooks" },
  { key: "regulation", label: "Regulations" },
  { key: "toolkit", label: "Toolkits" },
  { key: "program", label: "Programs" },
  { key: "grant", label: "Grants" },
];

type SortField = "createdAt" | "title" | "viewCount" | "publishedAt";

const PAGE_SIZE_KEY = "techscoop_resources_page_size";

export default function ResourcesList() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();

  // Parse URL params
  const urlParams = new URLSearchParams(searchParams);
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  const initialSearch = urlParams.get("search") || "";
  const initialType = urlParams.get("type") || "all";
  const initialStatus = urlParams.get("status") || "all";
  const initialPageSize = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || "25", 10);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const utils = trpc.useUtils();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isExporting, setIsExporting] = useState(false);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Update URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const newUrl = params.toString() ? `/admin/resources?${params.toString()}` : "/admin/resources";
    window.history.replaceState({}, "", newUrl);
  }, [page, debouncedSearch, typeFilter, statusFilter]);

  // Persist page size
  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_KEY, pageSize.toString());
  }, [pageSize]);

  // Fetch counts
  const { data: countsData } = trpc.resources.adminCounts.useQuery();

  // Fetch resources
  const { data, isLoading, error } = trpc.resources.adminList.useQuery({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    type: typeFilter !== "all" ? (typeFilter as any) : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sortBy,
    sortOrder,
  });

  // Mutations
  const bulkStatusMutation = trpc.resources.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated successfully");
      utils.resources.adminList.invalidate();
      utils.resources.adminCounts.invalidate();
      setSelectedIds([]);
    },
    onError: (err) => toast.error(err.message || "Failed to update status"),
  });

  const bulkDeleteMutation = trpc.resources.bulkDelete.useMutation({
    onSuccess: () => {
      toast.success("Resources deleted successfully");
      utils.resources.adminList.invalidate();
      utils.resources.adminCounts.invalidate();
      setSelectedIds([]);
    },
    onError: (err) => toast.error(err.message || "Failed to delete resources"),
  });

  const deleteMutation = trpc.resources.delete.useMutation({
    onSuccess: () => {
      toast.success("Resource deleted");
      utils.resources.adminList.invalidate();
      utils.resources.adminCounts.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  const resources = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Type tab counts from backend
  const getTypeTabCount = (key: string) => {
    if (!countsData) return 0;
    if (key === "all") {
      return Object.values(countsData.typeCounts).reduce((a, b) => a + b, 0);
    }
    return countsData.typeCounts[key] || 0;
  };

  // Status counts from backend
  const getStatusCount = (key: string) => {
    if (!countsData) return 0;
    if (key === "all") return countsData.statusCounts.total || 0;
    return countsData.statusCounts[key] || 0;
  };

  const toggleAll = () => {
    if (selectedIds.length === resources.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(resources.map((r: any) => r.id));
    }
  };

  const toggleResource = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-[#9BA3B0]" />;
    return sortOrder === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 text-[#0066FF]" />
      : <ArrowDown className="h-3.5 w-3.5 text-[#0066FF]" />;
  };

  // Export
  const exportQuery = trpc.resources.exportList.useQuery(
    {
      search: debouncedSearch || undefined,
      type: typeFilter !== "all" ? (typeFilter as any) : undefined,
    },
    { enabled: false }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data?.items) {
        exportToCSV(result.data.items as any, resourceExportColumns as any, `resources_export_${new Date().toISOString().split("T")[0]}`);
        toast.success(`Exported ${result.data.items.length} resources`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to export");
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Resources</h1>
            <p className="text-[#697386] text-sm mt-0.5">
              Manage templates, perks, tools, playbooks, regulations, and programs
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              Export
            </Button>
            <Link href="/admin/resources/new">
              <Button size="sm" className="bg-[#0066FF] hover:bg-[#0052CC]">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Resource
              </Button>
            </Link>
          </div>
        </div>

        {/* Type Tabs */}
        <div className="flex items-center gap-1 border-b border-[#E0E3E8] overflow-x-auto scrollbar-hide">
          {typeTabs.map((tab) => {
            const count = getTypeTabCount(tab.key);
            const isActive = typeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setTypeFilter(tab.key);
                  setPage(1);
                  setSelectedIds([]);
                }}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-[#0052CC] text-[#0066FF]"
                    : "border-transparent text-[#697386] hover:text-[#1A1F36] hover:border-[#C8CDD6]"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? "bg-[#EBF3FF] text-[#0066FF]" : "bg-[#F0F2F5] text-[#697386]"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters Row */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                <Input
                  placeholder="Search by title, description, or provider..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status ({getStatusCount("all")})</SelectItem>
                    <SelectItem value="published">Published ({getStatusCount("published")})</SelectItem>
                    <SelectItem value="draft">Draft ({getStatusCount("draft")})</SelectItem>
                    <SelectItem value="archived">Archived ({getStatusCount("archived")})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 mt-3 p-2.5 bg-[#F0F7FF] border border-[#C7DCFF] rounded-md">
                <span className="text-sm font-medium text-[#0052CC]">
                  {selectedIds.length} selected
                </span>
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, statusSlug: "published" })}
                    disabled={bulkStatusMutation.isPending}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Publish
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, statusSlug: "draft" })}
                    disabled={bulkStatusMutation.isPending}
                  >
                    <FileX className="h-3.5 w-3.5 mr-1" />
                    Draft
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (confirm(`Delete ${selectedIds.length} resources permanently?`)) {
                        bulkDeleteMutation.mutate({ ids: selectedIds });
                      }
                    }}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-16 text-red-600">
                Error loading resources: {error.message}
              </div>
            ) : resources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#697386]">
                <FileText className="h-12 w-12 mb-3 text-[#C8CDD6]" />
                <p className="text-base font-medium">No resources found</p>
                <p className="text-sm mt-1">
                  {debouncedSearch || typeFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Add your first resource to get started"}
                </p>
                {!debouncedSearch && typeFilter === "all" && statusFilter === "all" && (
                  <Link href="/admin/resources/new">
                    <Button className="mt-4 bg-[#0066FF] hover:bg-[#0052CC]" size="sm">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Resource
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F7F8FA]/80">
                        <TableHead className="w-10 pl-4">
                          <Checkbox
                            checked={selectedIds.length === resources.length && resources.length > 0}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead className="min-w-[280px]">
                          <button
                            className="flex items-center gap-1.5 hover:text-[#1A1F36]"
                            onClick={() => handleSort("title")}
                          >
                            Resource
                            <SortIcon field="title" />
                          </button>
                        </TableHead>
                        <TableHead className="w-[110px]">Type</TableHead>
                        <TableHead className="w-[140px] hidden lg:table-cell">Provider</TableHead>
                        <TableHead className="w-[90px]">Status</TableHead>
                        <TableHead className="w-[80px] hidden md:table-cell">
                          <button
                            className="flex items-center gap-1.5 hover:text-[#1A1F36]"
                            onClick={() => handleSort("viewCount")}
                          >
                            Views
                            <SortIcon field="viewCount" />
                          </button>
                        </TableHead>
                        <TableHead className="w-[110px] hidden lg:table-cell">
                          <button
                            className="flex items-center gap-1.5 hover:text-[#1A1F36]"
                            onClick={() => handleSort("createdAt")}
                          >
                            Created
                            <SortIcon field="createdAt" />
                          </button>
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resources.map((resource: any) => {
                        const tc = typeConfig[resource.type] || typeConfig.other;
                        const TypeIcon = tc.icon;
                        const sc = statusBadgeConfig[resource.status] || statusBadgeConfig.draft;
                        return (
                          <TableRow key={resource.id} className="group h-14">
                            <TableCell className="pl-4">
                              <Checkbox
                                checked={selectedIds.includes(resource.id)}
                                onCheckedChange={() => toggleResource(resource.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Link href={`/admin/resources/${resource.id}`}>
                                    <span className="font-medium text-[#1A1F36] hover:text-[#0066FF] cursor-pointer truncate block max-w-[300px]">
                                      {resource.title}
                                    </span>
                                  </Link>
                                  {resource.isFeatured === 1 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 shrink-0">
                                      Featured
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-[#9BA3B0] truncate max-w-[350px] mt-0.5">
                                  {resource.shortDescription || resource.description || "No description"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${tc.bgColor} ${tc.textColor}`}>
                                <TypeIcon className="h-3 w-3" />
                                {tc.label.replace(/s$/, "")}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-sm text-[#697386] truncate block max-w-[120px]">
                                {resource.provider || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[11px] font-medium ${sc.className}`}>
                                {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-sm text-[#697386]">{resource.viewCount || 0}</span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="text-xs text-[#697386]">{formatDate(resource.createdAt)}</span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 md:opacity-0 md:group-hover:opacity-100">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => navigate(`/admin/resources/${resource.id}`)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.open(`/resources/${resource.slug}`, "_blank")}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                  {resource.status !== "published" && (
                                    <DropdownMenuItem
                                      onClick={() => bulkStatusMutation.mutate({ ids: [resource.id], statusSlug: "published" })}
                                      className="text-[#0066FF]"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Publish
                                    </DropdownMenuItem>
                                  )}
                                  {resource.status !== "draft" && (
                                    <DropdownMenuItem
                                      onClick={() => bulkStatusMutation.mutate({ ids: [resource.id], statusSlug: "draft" })}
                                    >
                                      <FileX className="h-4 w-4 mr-2" />
                                      Move to Draft
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDelete(resource.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="px-4 border-t border-[#E0E3E8]">
                  <AdvancedPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={total}
                    pageSize={pageSize}
                    onPageChange={(p) => { setPage(p); setSelectedIds([]); }}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); setSelectedIds([]); }}
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
