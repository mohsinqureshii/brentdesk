/**
 * People Directory List Page
 * Admin management for people/leaders profiles
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
  Users,
  CheckCircle,
  Clock,
  Shield,
  Linkedin,
  Twitter,
  Loader2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileX,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { exportToCSV, peopleExportColumns } from "@/lib/exportUtils";

const statusColors: Record<string, string> = {
  draft: "bg-[#F0F2F5] text-[#697386]",
  published: "bg-green-100 text-green-600",
  pending_review: "bg-yellow-100 text-yellow-600",
};

const PAGE_SIZE_KEY = "techscoop_people_page_size";

export default function PeopleList() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  
  // Parse URL params
  const urlParams = new URLSearchParams(searchParams);
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  const initialSearch = urlParams.get("search") || "";
  const initialStatus = urlParams.get("status") || "all";
  const initialVerified = urlParams.get("verified") || "all";
  const initialSortBy = (urlParams.get("sortBy") || "createdAt") as "createdAt" | "name" | "companyName" | "status";
  const initialSortOrder = (urlParams.get("sortOrder") || "desc") as "asc" | "desc";
  const initialPageSize = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || "25", 10);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const utils = trpc.useUtils();
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [verifiedFilter, setVerifiedFilter] = useState(initialVerified);
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "companyName" | "status">(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);
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
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (verifiedFilter !== "all") params.set("verified", verifiedFilter);
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    
    const newUrl = params.toString() ? `/admin/people?${params.toString()}` : "/admin/people";
    window.history.replaceState({}, "", newUrl);
  }, [page, debouncedSearch, statusFilter, verifiedFilter, sortBy, sortOrder]);

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

  // Fetch people from API with server-side search
  const { data, isLoading, error, refetch } = trpc.people.adminList.useQuery({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    isVerified: verifiedFilter === "verified" ? true : verifiedFilter === "unverified" ? false : undefined,
    sortBy,
    sortOrder,
  });

  // Delete mutation
  const deleteMutation = trpc.people.delete.useMutation({
    onSuccess: () => {
      toast.success("Person deleted successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete person");
    },
  });

  const people = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const togglePerson = (id: number) => {
    setSelectedPeople((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedPeople.length === people.length) {
      setSelectedPeople([]);
    } else {
      setSelectedPeople(people.map((p: any) => p.id));
    }
  };
  // Bulk operations
  const bulkStatusMutation = trpc.people.bulkUpdateStatus.useMutation({
    onSuccess: () => { utils.people.adminList.invalidate(); setSelectedPeople([]); },
  });
  const bulkDeleteMutation = trpc.people.bulkDelete.useMutation({
    onSuccess: () => { utils.people.adminList.invalidate(); setSelectedPeople([]); },
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this person?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedPeople([]);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    setSelectedPeople([]);
  };

  // Export query
  const exportQuery = trpc.people.exportList.useQuery(
    {
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      isVerified: verifiedFilter === "verified" ? true : verifiedFilter === "unverified" ? false : undefined,
    },
    { enabled: false }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data?.items) {
        exportToCSV(result.data.items as any, peopleExportColumns as any, `people_export_${new Date().toISOString().split("T")[0]}`);
        toast.success(`Exported ${result.data.items.length} people`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to export people");
    } finally {
      setIsExporting(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  // Calculate stats
  const verifiedCount = people.filter((p: any) => p.isVerified).length;
  const claimedCount = people.filter((p: any) => p.isClaimed).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">People Directory</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">
              Manage leader profiles and verifications
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
            <Link href="/admin/people/new">
              <Button className="bg-[#0066FF] hover:bg-[#0052CC]">
                <Plus className="h-4 w-4 mr-2" />
                Add Person
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
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Total Profiles</p>
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
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-[#697386]">Claimed</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">{claimedCount}</p>
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
                  <p className="text-sm text-[#697386]">Pending Claims</p>
                  <p className="text-xl font-semibold text-[#1A1F36]">0</p>
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
                  placeholder="Search people..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="pending_review">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={verifiedFilter} onValueChange={(v) => { setVerifiedFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="claimed">Claimed</SelectItem>
                    <SelectItem value="unclaimed">Unclaimed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedPeople.length > 0 && (
              <div className="flex items-center gap-4 mb-4 p-3 bg-[#F7F8FA] rounded-md">
                <span className="text-sm font-medium text-[#1A1F36]">
                  {selectedPeople.length} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate({ ids: selectedPeople, statusSlug: "published" })}>
                    {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Publish
                  </Button>
                  <Button variant="outline" size="sm" disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate({ ids: selectedPeople, statusSlug: "draft" })}>
                    Move to Draft
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" disabled={bulkDeleteMutation.isPending} onClick={() => { if (confirm(`Delete ${selectedPeople.length} people?`)) bulkDeleteMutation.mutate({ ids: selectedPeople }); }}>
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
                Error loading people: {error.message}
              </div>
            ) : people.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#697386]">
                <Users className="h-12 w-12 mb-4 text-[#C8CDD6]" />
                <p className="text-lg font-medium">No people found</p>
                <p className="text-sm">
                  {debouncedSearch || statusFilter !== "all" || verifiedFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Add your first person to the directory"}
                </p>
                {!debouncedSearch && statusFilter === "all" && verifiedFilter === "all" && (
                  <Link href="/admin/people/new">
                    <Button className="mt-4 bg-[#0066FF] hover:bg-[#0052CC]">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Person
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
                          checked={selectedPeople.length === people.length && people.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className="w-[30%]">
                        <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          Person
                          {sortBy === "name" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-[18%]">
                        <button onClick={() => handleSort("companyName")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          Company
                          {sortBy === "companyName" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-[12%] hidden md:table-cell">
                        <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                          Status
                          {sortBy === "status" ? (sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 text-[#9BA3B0]" />}
                        </button>
                      </TableHead>
                      <TableHead className="w-[14%] hidden md:table-cell">Verification</TableHead>
                      <TableHead className="w-[10%] hidden lg:table-cell">Social</TableHead>
                      <TableHead className="w-[8%] hidden lg:table-cell">Views</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {people.map((person: any) => (
                      <TableRow key={person.id} className="group">
                        <TableCell className="hidden lg:table-cell">
                          <Checkbox
                            checked={selectedPeople.includes(person.id)}
                            onCheckedChange={() => togglePerson(person.id)}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="shrink-0">
                              <AvatarImage src={person.imageUrl || ""} />
                              <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Link href={`/admin/people/${person.id}`}>
                                  <span className="font-medium hover:text-[#0066FF] cursor-pointer truncate block">{person.name}</span>
                                </Link>
                                {!!person.isVerified && (
                                  <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />
                                )}
                              </div>
                              <span className="text-sm text-[#697386] truncate block">
                                {person.title || "-"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#697386] truncate">{person.company || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge className={statusColors[person.status] || statusColors.draft}>
                            {person.status || "draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            {!!person.isVerified && (
                              <Badge className="bg-blue-100 text-blue-600">Verified</Badge>
                            )}
                            {!!person.isClaimed && (
                              <Badge className="bg-purple-100 text-purple-600">Claimed</Badge>
                            )}
                            {!person.isVerified && !person.isClaimed && (
                              <span className="text-[#9BA3B0] text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {person.linkedinUrl && (
                              <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer">
                                <Linkedin className="h-4 w-4 text-[#9BA3B0] hover:text-blue-600" />
                              </a>
                            )}
                            {person.twitterUrl && (
                              <a href={person.twitterUrl} target="_blank" rel="noopener noreferrer">
                                <Twitter className="h-4 w-4 text-[#9BA3B0] hover:text-blue-400" />
                              </a>
                            )}
                            {!person.linkedinUrl && !person.twitterUrl && (
                              <span className="text-[#9BA3B0] text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-[#697386]">
                          {(person.viewCount || 0).toLocaleString()}
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
                              <DropdownMenuItem onClick={() => window.open(`/people/${person.slug}`, "_blank")}>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/people/${person.id}`)}>n                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              {person.status !== "published" && (
                                <DropdownMenuItem
                                  onClick={() => bulkStatusMutation.mutate({ ids: [person.id], statusSlug: "published" })}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              {person.status !== "draft" && (
                                <DropdownMenuItem
                                  onClick={() => bulkStatusMutation.mutate({ ids: [person.id], statusSlug: "draft" })}
                                >
                                  <FileX className="h-4 w-4 mr-2" />
                                  Move to Draft
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDelete(person.id)}
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
