/**
 * Companies List Admin Page
 * Manage company profiles
 */

import { useState, useEffect } from "react";
import { FilterBar, type Density } from "@/components/admin/FilterBar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter as FilterIcon } from "lucide-react";
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
  Building2,
  ExternalLink,
  CheckCircle,
  Star,
  Loader2,
  Download,
  FileX,
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { toast } from "sonner";
import { exportToCSV, companyExportColumns } from "@/lib/exportUtils";

const stageDisplayMap: Record<string, string> = {
  "pre_seed": "Pre-Seed",
  "seed": "Seed",
  "series_a": "Series A",
  "series_b": "Series B",
  "series_c": "Series C",
  "series_d_plus": "Series D+",
  "public": "Public",
  "acquired": "Acquired",
};

const stageColors: Record<string, string> = {
  pre_seed: "bg-[#F0F2F5] text-[#1A1F36]",
  seed: "bg-blue-100 text-blue-700",
  series_a: "bg-[#EBF3FF] text-[#0066FF]",
  series_b: "bg-purple-100 text-purple-700",
  series_c: "bg-orange-100 text-orange-700",
  series_d_plus: "bg-red-100 text-red-700",
  public: "bg-yellow-100 text-yellow-700",
  acquired: "bg-pink-100 text-pink-700",
};

const PAGE_SIZE_KEY = "brentdesk_companies_page_size";

export default function CompaniesList() {
  const searchParams = useSearch();
  
  // Parse URL params
  const urlParams = new URLSearchParams(searchParams);
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  const initialSearch = urlParams.get("search") || "";
  const initialStage = urlParams.get("stage") || "all";
  const initialPageSize = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || "25", 10);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [stage, setStage] = useState<string>(initialStage);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [density, setDensity] = useState<Density>(
    (localStorage.getItem("companiesList:density") as Density) || "comfortable"
  );
  useEffect(() => { localStorage.setItem("companiesList:density", density); }, [density]);

  const STAGE_LABEL: Record<string, string> = {
    pre_seed: "Pre-Seed", seed: "Seed", series_a: "Series A", series_b: "Series B",
    series_c: "Series C", series_d_plus: "Series D+", public: "Public", acquired: "Acquired",
  };
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
    if (stage !== "all") params.set("stage", stage);
    
    const newUrl = params.toString() ? `/admin/companies?${params.toString()}` : "/admin/companies";
    window.history.replaceState({}, "", newUrl);
  }, [page, debouncedSearch, stage]);

  // Persist page size
  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_KEY, pageSize.toString());
  }, [pageSize]);

  const { data, isLoading, refetch } = trpc.companies.adminList.useQuery({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    stage: stage !== "all" ? (stage as any) : undefined,
  });

  const deleteMutation = trpc.companies.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this company?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedCompanies([]);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Export query
  const exportQuery = trpc.companies.exportList.useQuery(
    {
      search: debouncedSearch || undefined,
      stage: stage !== "all" ? (stage as any) : undefined,
    },
    { enabled: false }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data?.items) {
        exportToCSV(result.data.items as any, companyExportColumns as any, `companies_export_${new Date().toISOString().split("T")[0]}`);
        toast.success(`Exported ${result.data.items.length} companies`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to export companies");
    } finally {
      setIsExporting(false);
    }
  };

  const companies = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const toggleCompany = (id: number) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const toggleAll = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map((c: any) => c.id));
    }
  };

  // Bulk operations
  const bulkStatusMutation = trpc.companies.bulkUpdateStatus.useMutation({
    onSuccess: () => { utils.companies.adminList.invalidate(); setSelectedCompanies([]); toast.success("Status updated"); },
  });
  const bulkDeleteMutation = trpc.companies.bulkDelete.useMutation({
    onSuccess: () => { utils.companies.adminList.invalidate(); setSelectedCompanies([]); toast.success("Companies deleted"); },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Companies</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">Manage company profiles</p>
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
            <Link href="/admin/companies/new">
              <Button className="bg-emerald-500 hover:bg-[#0066FF] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters — FilterBar primitive (Square-style) */}
        <Card>
          <CardHeader>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search companies by name…"
              density={density}
              onDensityChange={setDensity}
              chips={stage !== "all" ? [{ key: "stage", label: "Stage", value: STAGE_LABEL[stage] || stage }] : []}
              onChipRemove={() => { setStage("all"); setPage(1); }}
              addFilterAction={
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 gap-1.5">
                      <FilterIcon className="h-4 w-4" /> Add filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#697386] mb-1.5">Funding stage</p>
                    <Select value={stage} onValueChange={(v) => { setStage(v); setPage(1); }}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {Object.entries(STAGE_LABEL).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PopoverContent>
                </Popover>
              }
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
              </div>
            ) : companies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#697386]">
                <Building2 className="h-12 w-12 mb-4 text-[#C8CDD6]" />
                <p className="text-lg font-medium">No companies found</p>
                <p className="text-sm">
                  {debouncedSearch || stage !== "all"
                    ? "Try adjusting your search or filters"
                    : "Add your first company to get started"}
                </p>
                {!debouncedSearch && stage === "all" && (
                  <Link href="/admin/companies/new">
                    <Button className="mt-4 bg-[#0066FF] hover:bg-[#0052CC]">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Company
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                {selectedCompanies.length > 0 && (
                  <div className="flex items-center gap-4 mb-4 p-3 bg-[#F7F8FA] rounded-md">
                    <span className="text-sm font-medium text-[#1A1F36]">
                      {selectedCompanies.length} selected
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate({ ids: selectedCompanies, statusSlug: "published" })}>
                        {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                        Publish
                      </Button>
                      <Button variant="outline" size="sm" disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate({ ids: selectedCompanies, statusSlug: "draft" })}>
                        Move to Draft
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600" disabled={bulkDeleteMutation.isPending} onClick={() => { if (confirm(`Delete ${selectedCompanies.length} companies?`)) bulkDeleteMutation.mutate({ ids: selectedCompanies }); }}>
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
                          checked={selectedCompanies.length === companies.length && companies.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className="w-[26%]">Company</TableHead>
                      <TableHead className="w-[16%]">Industry</TableHead>
                      <TableHead className="w-[16%]">Location</TableHead>
                      <TableHead className="w-[12%] hidden md:table-cell">Stage</TableHead>
                      <TableHead className="w-[12%] hidden md:table-cell">Funding</TableHead>
                      <TableHead className="w-[10%] hidden lg:table-cell">Status</TableHead>
                      <TableHead className="w-10 hidden lg:table-cell"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id} className={density === "compact" ? "[&>td]:py-1.5 text-sm" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCompanies.includes(company.id)}
                            onCheckedChange={() => toggleCompany(company.id)}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-3 min-w-0">
                            {company.logo ? (
                              <img
                                src={company.logo}
                                alt={company.name}
                                className="w-10 h-10 rounded-md object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-[#EBF3FF] flex items-center justify-center shrink-0">
                                <Building2 className="h-5 w-5 text-[#0066FF]" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Link href={`/admin/companies/${company.id}`}>
                                  <span className="font-medium hover:text-[#0066FF] cursor-pointer truncate block">{company.name}</span>
                                </Link>
                                {!!company.isVerified && (
                                  <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />
                                )}
                                {!!company.isFeatured && (
                                  <Star className="h-4 w-4 text-yellow-500 shrink-0" />
                                )}
                              </div>
                              {company.website && (
                                <a
                                  href={company.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#0066FF] hover:underline flex items-center gap-1 truncate"
                                >
                                  Website <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#697386] truncate">
                          {company.industry || "—"}
                        </TableCell>
                        <TableCell className="text-[#697386] truncate">
                          {company.location || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {company.stage && (
                            <Badge className={stageColors[company.stage] || "bg-[#F0F2F5] text-[#1A1F36]"}>
                              {stageDisplayMap[company.stage] || company.stage}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-[#697386]">
                          {company.totalFunding || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${company.status === 'published' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-[#F0F2F5] text-[#697386] border-[#E0E3E8]'}`}>
                            {company.statusName || (company.status === 'published' ? 'Published' : 'Draft')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/companies/${company.slug}`}>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                              </Link>
                              <Link href={`/admin/companies/${company.id}`}>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              {company.status !== "published" && (
                                <DropdownMenuItem
                                  onClick={() => bulkStatusMutation.mutate({ ids: [company.id], statusSlug: "published" })}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              {company.status !== "draft" && (
                                <DropdownMenuItem
                                  onClick={() => bulkStatusMutation.mutate({ ids: [company.id], statusSlug: "draft" })}
                                >
                                  <FileX className="h-4 w-4 mr-2" />
                                  Move to Draft
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(company.id)}
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
