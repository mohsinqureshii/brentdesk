/**
 * Investors Directory List Page
 * Admin management for investor profiles
 */

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Building2,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Briefcase,
  Loader2,
  Download,
  FileX,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { exportToCSV, investorExportColumns } from "@/lib/exportUtils";

const typeLabels: Record<string, { label: string; color: string }> = {
  vc: { label: "VC", color: "bg-blue-100 text-blue-600" },
  angel: { label: "Angel", color: "bg-purple-100 text-purple-600" },
  accelerator: { label: "Accelerator", color: "bg-green-100 text-green-600" },
  corporate: { label: "Corporate", color: "bg-orange-100 text-orange-600" },
  family_office: { label: "Family Office", color: "bg-[#F0F2F5] text-[#697386]" },
};

const statusColors: Record<string, string> = {
  draft: "bg-[#F0F2F5] text-[#697386]",
  published: "bg-green-100 text-green-600",
  pending_review: "bg-yellow-100 text-yellow-600",
};

const PAGE_SIZE_KEY = "techscoop_investors_page_size";

export default function InvestorsList() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  
  // Parse URL params
  const urlParams = new URLSearchParams(searchParams);
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  const initialSearch = urlParams.get("search") || "";
  const initialType = urlParams.get("type") || "all";
  const initialPageSize = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || "25", 10);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const utils = trpc.useUtils();
  const [selectedInvestors, setSelectedInvestors] = useState<number[]>([]);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isExporting, setIsExporting] = useState(false);

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
    if (typeFilter !== "all") params.set("type", typeFilter);
    
    const newUrl = params.toString() ? `/admin/investors?${params.toString()}` : "/admin/investors";
    window.history.replaceState({}, "", newUrl);
  }, [page, debouncedSearch, typeFilter]);

  // Persist page size
  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_KEY, pageSize.toString());
  }, [pageSize]);

  // Fetch investors from API with server-side search
  const { data, isLoading, error, refetch } = trpc.investors.adminList.useQuery({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    type: typeFilter !== "all" ? (typeFilter as any) : undefined,
  });

  // Delete mutation
  const deleteMutation = trpc.investors.delete.useMutation({
    onSuccess: () => {
      toast.success("Investor deleted successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete investor");
    },
  });

  const investors = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const toggleInvestor = (id: number) => {
    setSelectedInvestors((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk operations
  const bulkStatusMutation = trpc.investors.bulkUpdateStatus.useMutation({
    onSuccess: () => { utils.investors.adminList.invalidate(); setSelectedInvestors([]); },
  });
  const bulkDeleteMutation = trpc.investors.bulkDelete.useMutation({
    onSuccess: () => { utils.investors.adminList.invalidate(); setSelectedInvestors([]); },
  });

  const toggleAll = () => {
    if (selectedInvestors.length === investors.length) {
      setSelectedInvestors([]);
    } else {
      setSelectedInvestors(investors.map((i: any) => i.id));
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this investor?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedInvestors([]);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    setSelectedInvestors([]);
  };

  // Export query
  const exportQuery = trpc.investors.exportList.useQuery(
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
        exportToCSV(result.data.items as any, investorExportColumns as any, `investors_export_${new Date().toISOString().split("T")[0]}`);
        toast.success(`Exported ${result.data.items.length} investors`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to export investors");
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate stats
  const verifiedCount = investors.filter((i: any) => i.isVerified).length;
  const claimedCount = investors.filter((i: any) => i.isClaimed).length;
  const totalViews = investors.reduce((sum: number, i: any) => sum + (i.viewCount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Investors</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">
              Manage VC firms, angel investors, and accelerators
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
            <Link href="/admin/investors/new">
              <Button className="bg-[#0066FF] hover:bg-[#0052CC]">
                <Plus className="h-4 w-4 mr-2" />
                Add Investor
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
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Total Investors</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">{total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Verified</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">{verifiedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-purple-100">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Claimed Profiles</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">{claimedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-orange-100">
                  <Eye className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Total Views</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">{totalViews.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                <Input
                  placeholder="Search investors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="vc">VC</SelectItem>
                    <SelectItem value="angel">Angel</SelectItem>
                    <SelectItem value="accelerator">Accelerator</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="family_office">Family Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedInvestors.length > 0 && (
              <div className="flex items-center gap-4 mb-4 p-3 bg-[#F7F8FA] rounded-md">
                <span className="text-sm font-medium text-[#1A1F36]">
                  {selectedInvestors.length} selected
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate({ ids: selectedInvestors, statusSlug: "published" })}>
                    {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Publish
                  </Button>
                  <Button variant="outline" size="sm" disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate({ ids: selectedInvestors, statusSlug: "draft" })}>
                    Move to Draft
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" disabled={bulkDeleteMutation.isPending} onClick={() => { if (confirm(`Delete ${selectedInvestors.length} investors?`)) bulkDeleteMutation.mutate({ ids: selectedInvestors }); }}>
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
                Error loading investors: {error.message}
              </div>
            ) : investors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#697386]">
                <Building2 className="h-12 w-12 mb-4 text-[#C8CDD6]" />
                <p className="text-lg font-medium">No investors found</p>
                <p className="text-sm">
                  {debouncedSearch || typeFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Add your first investor to get started"}
                </p>
                {!debouncedSearch && typeFilter === "all" && (
                  <Link href="/admin/investors/new">
                    <Button className="mt-4 bg-[#0066FF] hover:bg-[#0052CC]">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Investor
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
                          checked={selectedInvestors.length === investors.length && investors.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className="w-[30%]">Investor</TableHead>
                      <TableHead className="w-[12%] hidden lg:table-cell">Type</TableHead>
                      <TableHead className="w-[15%] hidden md:table-cell">Headquarters</TableHead>
                      <TableHead className="w-[13%] hidden md:table-cell">Check Size</TableHead>
                      <TableHead className="w-[12%] hidden lg:table-cell">Portfolio</TableHead>
                      <TableHead className="w-[10%]">Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investors.map((investor: any) => {
                      const typeInfo = typeLabels[investor.investorType] || { label: investor.investorType || "Investor", color: "bg-[#F0F2F5] text-[#697386]" };
                      
                      return (
                        <TableRow key={investor.id} className="group">
                          <TableCell className="hidden lg:table-cell">
                            <Checkbox
                              checked={selectedInvestors.includes(investor.id)}
                              onCheckedChange={() => toggleInvestor(investor.id)}
                            />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={investor.logoUrl} />
                                <AvatarFallback className="bg-[#EBF3FF] text-[#0066FF]">
                                  {investor.name?.substring(0, 2).toUpperCase() || "IN"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Link href={`/admin/investors/${investor.id}`}>
                                    <span className="font-medium hover:text-[#0066FF] cursor-pointer truncate block">{investor.name}</span>
                                  </Link>
                                  {!!investor.isVerified && (
                                    <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />
                                  )}
                                  {!!investor.isClaimed && (
                                    <Badge className="text-xs bg-green-100 text-green-700 shrink-0">Claimed</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-[#9BA3B0] truncate">{investor.website || "-"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge className={typeInfo.color}>
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-[#697386] truncate">{investor.headquarters || "-"}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-[#9BA3B0]" />
                              <span className="text-sm text-[#1A1F36]">
                                {investor.checkSizeMin && investor.checkSizeMax 
                                  ? `${(investor.checkSizeMin / 1000000).toFixed(0)}M - ${(investor.checkSizeMax / 1000000).toFixed(0)}M`
                                  : "-"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-[#9BA3B0]" />
                              <span className="text-sm text-[#1A1F36]">{investor.portfolioCount || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[investor.status] || statusColors.draft}>
                              {investor.status || "draft"}
                            </Badge>
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
                                <DropdownMenuItem onClick={() => window.open(`/investors/${investor.slug}`, "_blank")}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/admin/investors/${investor.id}`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                {investor.status !== "published" && (
                                  <DropdownMenuItem
                                    onClick={() => bulkStatusMutation.mutate({ ids: [investor.id], statusSlug: "published" })}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Publish
                                  </DropdownMenuItem>
                                )}
                                {investor.status !== "draft" && (
                                  <DropdownMenuItem
                                    onClick={() => bulkStatusMutation.mutate({ ids: [investor.id], statusSlug: "draft" })}
                                  >
                                    <FileX className="h-4 w-4 mr-2" />
                                    Move to Draft
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDelete(investor.id)}
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
