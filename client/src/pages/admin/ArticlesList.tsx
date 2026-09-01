/**
 * Articles List Page
 * WordPress-style article management with status tabs, archive, trash, and permanent delete
 */

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdvancedPagination } from "@/components/admin/AdvancedPagination";
import { trpc } from "@/lib/trpc";
import { Link, useLocation, useSearch } from "wouter";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  X,
  Calendar,
  FolderOpen,
  Archive,
  RotateCcw,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCSV, articleExportColumns } from "@/lib/exportUtils";

// Status configuration with colors and icons
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ComponentType<{ className?: string }>; color?: string }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  submitted: { label: "Submitted", variant: "outline", icon: Clock },
  editor_review: { label: "Editor Review", variant: "outline", icon: AlertCircle },
  senior_editor_review: { label: "Senior Review", variant: "outline", icon: AlertCircle },
  approved: { label: "Approved", variant: "outline", icon: CheckCircle },
  scheduled: { label: "Scheduled", variant: "outline", icon: Clock, color: "bg-orange-100 text-orange-800" },
  published: { label: "Published", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  archived: { label: "Archived", variant: "secondary", icon: Archive },
  trash: { label: "Trash", variant: "destructive", icon: Trash2 },
};

// Status tabs for WordPress-style filtering
const statusTabs = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "scheduled", label: "Scheduled" },
  { key: "submitted", label: "Submitted" },
  { key: "editor_review", label: "Editor Review" },
  { key: "senior_editor_review", label: "Senior Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
  { key: "trash", label: "Trash" },
];

const PAGE_SIZE_KEY = "techscoop_articles_page_size";

export default function ArticlesList() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  
  // Parse URL params
  const urlParams = new URLSearchParams(searchParams);
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  const initialSearch = urlParams.get("search") || "";
  const initialStatus = urlParams.get("status") || "all";
  const initialCategory = urlParams.get("category") || "all";
  const initialDateFrom = urlParams.get("dateFrom") || "";
  const initialDateTo = urlParams.get("dateTo") || "";
  const initialSortBy = (urlParams.get("sortBy") || "publishedAt") as "createdAt" | "publishedAt" | "updatedAt" | "title" | "viewCount" | "authorName" | "status";
  const initialSortOrder = (urlParams.get("sortOrder") || "desc") as "asc" | "desc";
  const initialPageSize = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || "25", 10);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [dateFromFilter, setDateFromFilter] = useState<string>(initialDateFrom);
  const [dateToFilter, setDateToFilter] = useState<string>(initialDateTo);
  const [sortBy, setSortBy] = useState<"createdAt" | "publishedAt" | "updatedAt" | "title" | "viewCount" | "authorName" | "status">(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isExporting, setIsExporting] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<{ id: number; title: string; permanent: boolean } | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeletePermanent, setBulkDeletePermanent] = useState(false);
  
  // Temp filter states for dialog
  const [tempCategoryFilter, setTempCategoryFilter] = useState<string>(initialCategory);
  const [tempDateFromFilter, setTempDateFromFilter] = useState<string>(initialDateFrom);
  const [tempDateToFilter, setTempDateToFilter] = useState<string>(initialDateTo);

  // Fetch categories for filter
  const { data: categoriesData } = trpc.admin.taxonomy.categories.list.useQuery({ module: "news" });
  const allCategories = categoriesData || [];

  // Fetch status counts for tabs
  const { data: statusCounts } = trpc.news.getStatusCounts.useQuery();

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
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (dateFromFilter) params.set("dateFrom", dateFromFilter);
    if (dateToFilter) params.set("dateTo", dateToFilter);
    if (sortBy !== "publishedAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    
    const newUrl = params.toString() ? `/admin/articles?${params.toString()}` : "/admin/articles";
    window.history.replaceState({}, "", newUrl);
  }, [page, debouncedSearch, statusFilter, categoryFilter, dateFromFilter, dateToFilter, sortBy, sortOrder]);

  // Persist page size
  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_KEY, pageSize.toString());
  }, [pageSize]);

  // Fetch articles from API
  const { data, isLoading, error, refetch } = trpc.news.adminList.useQuery({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    categoryId: categoryFilter !== "all" ? parseInt(categoryFilter, 10) : undefined,
    publishedDateFrom: dateFromFilter || undefined,
    publishedDateTo: dateToFilter || undefined,
    sortBy,
    sortOrder,
  });

  // Handle column sort click
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column with default desc order
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Mutations
  const deleteMutation = trpc.news.delete.useMutation({
    onSuccess: () => {
      toast.success("Article deleted successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete article");
    },
  });

  const permanentDeleteMutation = trpc.news.permanentDelete.useMutation({
    onSuccess: () => {
      toast.success("Article permanently deleted");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to permanently delete article");
    },
  });

  const bulkStatusMutation = trpc.news.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} articles updated successfully`);
      setSelectedIds([]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update articles");
    },
  });

  const bulkDeleteMutation = trpc.news.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} articles moved to trash`);
      setSelectedIds([]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete articles");
    },
  });

  const bulkPermanentDeleteMutation = trpc.news.bulkPermanentDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} articles permanently deleted`);
      setSelectedIds([]);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to permanently delete articles");
    },
  });

  const articles = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const toggleSelectAll = () => {
    if (selectedIds.length === articles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(articles.map((a: any) => a.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedIds([]);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    setSelectedIds([]);
  };

  const handleDelete = (id: number, title: string, permanent: boolean = false) => {
    setArticleToDelete({ id, title, permanent });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!articleToDelete) return;
    
    if (articleToDelete.permanent) {
      permanentDeleteMutation.mutate({ id: articleToDelete.id });
    } else {
      // Move to trash
      bulkStatusMutation.mutate({ ids: [articleToDelete.id], statusSlug: "trash" });
    }
    setDeleteConfirmOpen(false);
    setArticleToDelete(null);
  };

  const handleBulkDelete = (permanent: boolean) => {
    setBulkDeletePermanent(permanent);
    setBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = () => {
    if (bulkDeletePermanent) {
      bulkPermanentDeleteMutation.mutate({ ids: selectedIds });
    } else {
      bulkStatusMutation.mutate({ ids: selectedIds, statusSlug: "trash" });
    }
    setBulkDeleteConfirmOpen(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = articles.map((article: any) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        status: { name: article.status },
        author: { name: article.authorName },
        primaryCategory: { name: article.categories?.[0]?.name || "" },
        isFlash: article.isFlash,
        isFeatured: article.isFeatured,
        viewCount: article.viewCount,
        publishedAt: article.publishedAt,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      }));
      exportToCSV(exportData, articleExportColumns as any, "articles-export");
      toast.success("Articles exported successfully");
    } catch (err) {
      toast.error("Failed to export articles");
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, variant: "outline" as const, icon: FileText };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={`gap-1 ${config.color || ""}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleApplyFilters = () => {
    setCategoryFilter(tempCategoryFilter);
    setDateFromFilter(tempDateFromFilter);
    setDateToFilter(tempDateToFilter);
    setPage(1);
    setShowMoreFilters(false);
  };

  const handleClearFilters = () => {
    setTempCategoryFilter("all");
    setTempDateFromFilter("");
    setTempDateToFilter("");
  };

  const activeFiltersCount = [
    categoryFilter !== "all",
    dateFromFilter,
    dateToFilter,
  ].filter(Boolean).length;

  const getTabCount = (tabKey: string) => {
    if (!statusCounts) return 0;
    if (tabKey === "all") return statusCounts.total || 0;
    return statusCounts[tabKey] || 0;
  };

  const isTrashView = statusFilter === "trash";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Articles</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">
              Manage and publish articles across TechScoop
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
            <Link href="/admin/articles/new">
              <Button className="bg-[#0066FF] hover:bg-[#0052CC]">
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Tabs - WordPress Style */}
        <div className="flex items-center gap-1 border-b border-[#E0E3E8] overflow-x-auto scrollbar-hide">
          {statusTabs.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                  setSelectedIds([]);
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-[#0052CC] text-[#0066FF]"
                    : "border-transparent text-[#697386] hover:text-[#1A1F36] hover:border-[#C8CDD6]"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    isActive ? "bg-[#EBF3FF] text-[#0066FF]" : "bg-[#F0F2F5] text-[#697386]"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters and search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                <Input
                  placeholder="Search articles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.parentId ? `↳ ${cat.name}` : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => {
                  setTempCategoryFilter(categoryFilter);
                  setTempDateFromFilter(dateFromFilter);
                  setTempDateToFilter(dateToFilter);
                  setShowMoreFilters(true);
                }}
                className="relative"
              >
                <Filter className="h-4 w-4 mr-2" />
                More Filters
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#0066FF] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Active filters display */}
            {(categoryFilter !== "all" || dateFromFilter || dateToFilter) && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#E0E3E8]">
                <span className="text-sm text-[#697386]">Active filters:</span>
                {categoryFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    <FolderOpen className="h-3 w-3" />
                    {allCategories.find((c: any) => c.id.toString() === categoryFilter)?.name || "Category"}
                    <button onClick={() => { setCategoryFilter("all"); setPage(1); }} className="ml-1 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {dateFromFilter && (
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    From: {formatDate(dateFromFilter)}
                    <button onClick={() => { setDateFromFilter(""); setPage(1); }} className="ml-1 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {dateToFilter && (
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    To: {formatDate(dateToFilter)}
                    <button onClick={() => { setDateToFilter(""); setPage(1); }} className="ml-1 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { 
                    setCategoryFilter("all"); 
                    setDateFromFilter(""); 
                    setDateToFilter(""); 
                    setPage(1); 
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Bulk actions */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4 pt-4 border-t border-[#E0E3E8]">
                <span className="text-sm text-[#697386]">
                  {selectedIds.length} selected
                </span>
                {!isTrashView && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={bulkStatusMutation.isPending}
                      onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, statusSlug: "published" })}
                    >
                      {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Publish
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={bulkStatusMutation.isPending}
                      onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, statusSlug: "draft" })}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Move to Draft
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={bulkStatusMutation.isPending}
                      onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, statusSlug: "archived" })}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600"
                      disabled={bulkStatusMutation.isPending}
                      onClick={() => handleBulkDelete(false)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Move to Trash
                    </Button>
                  </>
                )}
                {isTrashView && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={bulkStatusMutation.isPending}
                      onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, statusSlug: "draft" })}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={bulkPermanentDeleteMutation.isPending}
                      onClick={() => handleBulkDelete(true)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Delete Permanently
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Articles table */}
        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              Error loading articles: {error.message}
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#697386]">
              <FileText className="h-12 w-12 mb-4 text-[#C8CDD6]" />
              <p className="text-lg font-medium">No articles found</p>
              <p className="text-sm">
                {debouncedSearch || statusFilter !== "all" || categoryFilter !== "all"
                  ? "Try adjusting your search or filters" 
                  : "Create your first article to get started"}
              </p>
              {!debouncedSearch && statusFilter === "all" && categoryFilter === "all" && (
                <Link href="/admin/articles/new">
                  <Button className="mt-4 bg-[#0066FF] hover:bg-[#0052CC]">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Article
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/*
                Articles table — desktop / tablet view (≥ md).
                On phones (< md) we render a card list instead (below) because
                seven columns can never fit a 360px viewport, no matter how
                you slice them.

                Sizing strategy:
                - Removed `table-fixed` so each column shrinks to fit its content.
                - The wrapper has overflow-x-auto + the table has min-w so on
                  laptops 768-1100px the user gets a real horizontal scroll
                  rather than truncated middle columns.
                - Sticky-ish actions column kept narrow.
              */}
              <div className="hidden md:block overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
              <Table className="w-full min-w-[920px] lg:min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.length === articles.length && articles.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="min-w-[280px]">
                      <button
                        onClick={() => handleSort("title")}
                        className="flex items-center gap-1 hover:text-[#0066FF] transition-colors"
                      >
                        Title
                        {sortBy === "title" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-[140px] whitespace-nowrap">Category</TableHead>
                    <TableHead className="w-[110px] whitespace-nowrap">
                      <button
                        onClick={() => handleSort("status")}
                        className="flex items-center gap-1 hover:text-[#0066FF] transition-colors"
                      >
                        Status
                        {sortBy === "status" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-[140px] whitespace-nowrap hidden lg:table-cell">
                      <button
                        onClick={() => handleSort("authorName")}
                        className="flex items-center gap-1 hover:text-[#0066FF] transition-colors"
                      >
                        Author
                        {sortBy === "authorName" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-[120px] whitespace-nowrap">
                      <button
                        onClick={() => handleSort("publishedAt")}
                        className="flex items-center gap-1 hover:text-[#0066FF] transition-colors"
                      >
                        Published
                        {sortBy === "publishedAt" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-[80px] text-right whitespace-nowrap hidden xl:table-cell">
                      <button
                        onClick={() => handleSort("viewCount")}
                        className="flex items-center gap-1 hover:text-[#0066FF] transition-colors ml-auto"
                      >
                        Views
                        {sortBy === "viewCount" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-[120px] whitespace-nowrap hidden xl:table-cell">
                      <button
                        onClick={() => handleSort("updatedAt")}
                        className="flex items-center gap-1 hover:text-[#0066FF] transition-colors"
                      >
                        Updated
                        {sortBy === "updatedAt" ? (
                          sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article: any) => (
                    <TableRow key={article.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(article.id)}
                          onCheckedChange={() => toggleSelect(article.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-0">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="min-w-0 flex-1">
                            <Link href={`/admin/articles/${article.id}`}>
                              <span
                                className="font-medium text-sm leading-snug hover:text-[#0066FF] transition-colors cursor-pointer line-clamp-2 block"
                                title={article.title}
                              >
                                {article.title}
                              </span>
                            </Link>
                            <p
                              className="text-xs text-[#9BA3B0] truncate mt-0.5"
                              title={`/${article.slug}`}
                            >
                              /{article.slug}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            {!!article.isFeatured && (
                              <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0">Featured</Badge>
                            )}
                            {(article as any).autoGenerated === 1 && (
                              <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0" title="Created by News Agent AI">AI</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {article.categories && article.categories.length > 0 ? (
                            article.categories.slice(0, 2).map((cat: any) => (
                              <Badge key={cat.id} variant="outline" className="text-xs whitespace-nowrap">
                                {cat.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[#9BA3B0] text-sm">—</span>
                          )}
                          {article.categories && article.categories.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{article.categories.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(article.status || "draft")}</TableCell>
                      <TableCell className="text-[#697386] text-sm hidden lg:table-cell">
                        <span className="truncate block max-w-[140px]" title={article.authorName || "Unknown"}>
                          {article.authorName || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#697386] text-sm whitespace-nowrap">
                        {article.status === "scheduled" ? (
                          <div className="flex items-center gap-1 text-orange-600">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(article.publishedAt)}</span>
                          </div>
                        ) : (
                          formatDate(article.publishedAt)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-[#697386] whitespace-nowrap hidden xl:table-cell">
                        {(article.viewCount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-[#697386] text-sm whitespace-nowrap hidden xl:table-cell">
                        {formatDate(article.updatedAt)}
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
                            
                            {/* View/Edit actions */}
                            {article.status !== "trash" && (
                              <>
                                <DropdownMenuItem onClick={() => window.open(`/article/${article.slug}`, "_blank")}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/admin/articles/${article.id}`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                {article.status === "published" && (
                                  <DropdownMenuItem onClick={() => window.open(`/article/${article.slug}`, "_blank")}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Live
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                              </>
                            )}
                            
                            {/* Status change actions */}
                            {article.status === "published" && (
                              <>
                                <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ ids: [article.id], statusSlug: "archived" })}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ ids: [article.id], statusSlug: "draft" })}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Unpublish (Draft)
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {article.status === "archived" && (
                              <>
                                <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ ids: [article.id], statusSlug: "published" })}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Publish
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ ids: [article.id], statusSlug: "draft" })}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Move to Draft
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {article.status === "draft" && (
                              <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ ids: [article.id], statusSlug: "published" })}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Publish
                              </DropdownMenuItem>
                            )}
                            
                            {/* Trash actions */}
                            {article.status === "trash" ? (
                              <>
                                <DropdownMenuItem onClick={() => bulkStatusMutation.mutate({ ids: [article.id], statusSlug: "draft" })}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDelete(article.id, article.title, true)}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDelete(article.id, article.title, false)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Move to Trash
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Mobile card list (< md) — phones can never fit a 7-column
                  table comfortably. Each card shows the essentials: title,
                  status, category badges, date. Tap-target the whole card
                  to navigate to the editor. */}
              <ul className="md:hidden divide-y border rounded-md bg-white">
                {articles.map((article: any) => (
                  <li key={article.id} className="flex items-start gap-3 p-3">
                    <Checkbox
                      className="mt-1 shrink-0"
                      checked={selectedIds.includes(article.id)}
                      onCheckedChange={() => toggleSelect(article.id)}
                    />
                    <Link href={`/admin/articles/${article.id}`} className="flex-1 min-w-0 block">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm leading-snug line-clamp-2">{article.title}</span>
                        <div className="shrink-0">{getStatusBadge(article.status || "draft")}</div>
                      </div>
                      <p className="text-[11px] text-[#9BA3B0] truncate mt-1">/{article.slug}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-[#697386]">
                        {article.categories?.slice(0, 2).map((cat: any) => (
                          <Badge key={cat.id} variant="outline" className="text-[10px] px-1.5 py-0">
                            {cat.name}
                          </Badge>
                        ))}
                        <span className="text-[#9BA3B0]">·</span>
                        <span>{formatDate(article.publishedAt)}</span>
                        {article.authorName && (
                          <>
                            <span className="text-[#9BA3B0]">·</span>
                            <span className="truncate max-w-[100px]">{article.authorName}</span>
                          </>
                        )}
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 -mt-1 -mr-1">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/articles/${article.id}`)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/article/${article.slug}`, "_blank")}>
                          <Eye className="h-4 w-4 mr-2" /> Preview
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </ul>

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
        </Card>
      </div>

      {/* More Filters Dialog */}
      <Dialog open={showMoreFilters} onOpenChange={setShowMoreFilters}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Advanced Filters</DialogTitle>
            <DialogDescription>
              Filter articles by category and published date range
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={tempCategoryFilter} onValueChange={setTempCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.parentId ? `↳ ${cat.name}` : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Published Date Range</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-[#697386]">From</Label>
                  <Input
                    type="date"
                    value={tempDateFromFilter}
                    onChange={(e) => setTempDateFromFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#697386]">To</Label>
                  <Input
                    type="date"
                    value={tempDateToFilter}
                    onChange={(e) => setTempDateToFilter(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="ghost" onClick={handleClearFilters}>
              Clear Filters
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowMoreFilters(false)}>
                Cancel
              </Button>
              <Button onClick={handleApplyFilters} className="bg-[#0066FF] hover:bg-[#0052CC]">
                Apply Filters
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {articleToDelete?.permanent ? "Delete Permanently?" : "Move to Trash?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {articleToDelete?.permanent ? (
                <>
                  This will permanently delete "<strong>{articleToDelete?.title}</strong>". 
                  This action cannot be undone.
                </>
              ) : (
                <>
                  Move "<strong>{articleToDelete?.title}</strong>" to trash? 
                  You can restore it later from the Trash tab.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={articleToDelete?.permanent ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {articleToDelete?.permanent ? "Delete Permanently" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkDeletePermanent ? "Delete Permanently?" : "Move to Trash?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkDeletePermanent ? (
                <>
                  This will permanently delete <strong>{selectedIds.length} articles</strong>. 
                  This action cannot be undone.
                </>
              ) : (
                <>
                  Move <strong>{selectedIds.length} articles</strong> to trash? 
                  You can restore them later from the Trash tab.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className={bulkDeletePermanent ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {bulkDeletePermanent ? "Delete Permanently" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
