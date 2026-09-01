/**
 * Funding Tracker Admin Page
 * Dashboard for managing funding rounds, viewing statistics, and tracking investments
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Building2,
  Users,
  Calendar,
  Filter,
  Download,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  BarChart3,
  UserPlus,
} from "lucide-react";
import { InvestorParticipationDialog } from "@/components/admin/InvestorParticipationDialog";

const ROUND_TYPES = [
  { value: "pre_seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "series_d_plus", label: "Series D+" },
  { value: "bridge", label: "Bridge" },
  { value: "strategic", label: "Strategic" },
  { value: "venture_debt", label: "Venture Debt" },
  { value: "grant", label: "Grant" },
  { value: "undisclosed", label: "Undisclosed" },
];

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed", color: "bg-green-500" },
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "disputed", label: "Disputed", color: "bg-red-500" },
];

function formatCurrency(amount: number | string | null, currency = "USD"): string {
  if (!amount) return "Undisclosed";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FundingTracker() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("rounds");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRoundType, setFilterRoundType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<number | null>(null);
  const [isInvestorDialogOpen, setIsInvestorDialogOpen] = useState(false);
  const [selectedRoundForInvestors, setSelectedRoundForInvestors] = useState<{ id: number; name: string } | null>(null);

  // Auto-open dialog when navigating to /admin/funding/new
  useEffect(() => {
    if (location === "/admin/funding/new") {
      setIsCreateDialogOpen(true);
    }
    // Check for analytics tab in URL
    if (location.includes("tab=analytics")) {
      setActiveTab("analytics");
    }
  }, [location]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  
  // Form state for creating/editing rounds
  const [formData, setFormData] = useState({
    companyId: 0,
    companySearch: "",
    roundType: "seed" as const,
    amountRaised: "",
    currency: "USD",
    fundingDate: new Date().toISOString().split("T")[0],
    status: "pending" as const,
    isUndisclosed: false,
    notes: "",
    leadInvestorId: 0,
    leadInvestorSearch: "",
  });

  // Queries
  const { data: roundsData, isLoading: roundsLoading, refetch: refetchRounds } = trpc.admin.funding.list.useQuery({
    roundType: filterRoundType && filterRoundType !== "all" ? filterRoundType as any : undefined,
    status: filterStatus && filterStatus !== "all" ? filterStatus as any : undefined,
    year: filterYear && filterYear !== "all" ? parseInt(filterYear) : undefined,
    limit: 50,
  });

  const { data: statsData, isLoading: statsLoading } = trpc.admin.funding.getStats.useQuery({
    year: filterYear && filterYear !== "all" ? parseInt(filterYear) : undefined,
  });

  const { data: companyResults } = trpc.admin.funding.searchCompanies.useQuery(
    { query: formData.companySearch },
    { enabled: formData.companySearch.length >= 2 }
  );

  const { data: investorResults } = trpc.admin.funding.searchInvestors.useQuery(
    { query: formData.leadInvestorSearch },
    { enabled: formData.leadInvestorSearch.length >= 2 }
  );

  // Mutations
  const createMutation = trpc.admin.funding.create.useMutation({
    onSuccess: () => {
      toast.success("Funding round created successfully");
      setIsCreateDialogOpen(false);
      if (location === "/admin/funding/new") {
        setLocation("/admin/funding");
      }
      refetchRounds();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create funding round: ${error.message}`);
    },
  });

  const deleteMutation = trpc.admin.funding.delete.useMutation({
    onSuccess: () => {
      toast.success("Funding round deleted");
      refetchRounds();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const updateMutation = trpc.admin.funding.update.useMutation({
    onSuccess: () => {
      toast.success("Funding round updated successfully");
      setIsEditDialogOpen(false);
      setEditingRoundId(null);
      refetchRounds();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update funding round: ${error.message}`);
    },
  });

  const handleEditClick = (round: any) => {
    setEditingRoundId(round.id);
    setFormData({
      companyId: round.companyId,
      companySearch: round.company?.name || "",
      roundType: round.roundType,
      amountRaised: round.amountRaised || "",
      currency: round.currency || "USD",
      fundingDate: round.fundingDate ? new Date(round.fundingDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      status: round.status || "pending",
      isUndisclosed: round.isUndisclosed || false,
      notes: round.notes || "",
      leadInvestorId: round.leadInvestorId || 0,
      leadInvestorSearch: "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingRoundId) return;
    if (!formData.companyId) {
      toast.error("Please select a company");
      return;
    }
    
    updateMutation.mutate({
      id: editingRoundId,
      companyId: formData.companyId,
      roundType: formData.roundType,
      amountRaised: formData.isUndisclosed ? undefined : formData.amountRaised,
      currency: formData.currency,
      fundingDate: formData.fundingDate,
      status: formData.status,
      isUndisclosed: formData.isUndisclosed,
      notes: formData.notes || undefined,
      leadInvestorId: formData.leadInvestorId || undefined,
    });
  };

  const resetForm = () => {
    setFormData({
      companyId: 0,
      companySearch: "",
      roundType: "seed",
      amountRaised: "",
      currency: "USD",
      fundingDate: new Date().toISOString().split("T")[0],
      status: "pending",
      isUndisclosed: false,
      notes: "",
      leadInvestorId: 0,
      leadInvestorSearch: "",
    });
  };

  const handleCreate = () => {
    if (!formData.companyId) {
      toast.error("Please select a company");
      return;
    }
    
    createMutation.mutate({
      companyId: formData.companyId,
      roundType: formData.roundType,
      amountRaised: formData.isUndisclosed ? undefined : formData.amountRaised,
      currency: formData.currency,
      fundingDate: formData.fundingDate,
      status: formData.status,
      isUndisclosed: formData.isUndisclosed,
      notes: formData.notes || undefined,
      leadInvestorId: formData.leadInvestorId || undefined,
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Funding Tracker</h1>
            <p className="text-muted-foreground">
              Track and manage startup funding rounds across the MENA region
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Funding Round
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Funding Round</DialogTitle>
                <DialogDescription>
                  Record a new funding round for a startup
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Company Search */}
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search for a company..."
                      value={formData.companySearch}
                      onChange={(e) => setFormData({ ...formData, companySearch: e.target.value, companyId: 0 })}
                    />
                    {companyResults && companyResults.length > 0 && formData.companySearch && !formData.companyId && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                        {companyResults.map((company) => (
                          <button
                            key={company.id}
                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                            onClick={() => setFormData({
                              ...formData,
                              companyId: company.id,
                              companySearch: company.name,
                            })}
                          >
                            {company.logo && (
                              <img src={company.logo} alt="" className="w-6 h-6 rounded" />
                            )}
                            <span>{company.name}</span>
                            {company.industry && (
                              <Badge variant="outline" className="ml-auto text-xs">
                                {company.industry}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.companyId > 0 && (
                    <Badge variant="secondary">Selected: {formData.companySearch}</Badge>
                  )}
                </div>

                {/* Round Type & Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Round Type *</Label>
                    <Select
                      value={formData.roundType}
                      onValueChange={(value) => setFormData({ ...formData, roundType: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROUND_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Raised</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        type="number"
                        placeholder="e.g., 5000000"
                        value={formData.amountRaised}
                        onChange={(e) => setFormData({ ...formData, amountRaised: e.target.value })}
                        disabled={formData.isUndisclosed}
                      />
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                          <SelectItem value="AED">AED</SelectItem>
                          <SelectItem value="EGP">EGP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.isUndisclosed}
                        onChange={(e) => setFormData({ ...formData, isUndisclosed: e.target.checked })}
                      />
                      Amount is undisclosed
                    </label>
                  </div>
                </div>

                {/* Date & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Funding Date *</Label>
                    <Input
                      type="date"
                      value={formData.fundingDate}
                      onChange={(e) => setFormData({ ...formData, fundingDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Lead Investor */}
                <div className="space-y-2">
                  <Label>Lead Investor (optional)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Search for lead investor..."
                      value={formData.leadInvestorSearch}
                      onChange={(e) => setFormData({ ...formData, leadInvestorSearch: e.target.value, leadInvestorId: 0 })}
                    />
                    {investorResults && investorResults.length > 0 && formData.leadInvestorSearch && !formData.leadInvestorId && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                        {investorResults.map((investor) => (
                          <button
                            key={investor.id}
                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                            onClick={() => setFormData({
                              ...formData,
                              leadInvestorId: investor.id,
                              leadInvestorSearch: investor.name,
                            })}
                          >
                            {investor.logo && (
                              <img src={investor.logo} alt="" className="w-6 h-6 rounded" />
                            )}
                            <span>{investor.name}</span>
                            {investor.type && (
                              <Badge variant="outline" className="ml-auto text-xs">
                                {investor.type}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (internal)</Label>
                  <Input
                    placeholder="Any additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  if (location === "/admin/funding/new") {
                    setLocation("/admin/funding");
                  }
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Round
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingRoundId(null);
              resetForm();
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Funding Round</DialogTitle>
                <DialogDescription>
                  Update the funding round details
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Company (read-only display) */}
                <div className="space-y-2">
                  <Label>Company</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formData.companySearch}</span>
                  </div>
                </div>

                {/* Round Type & Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Round Type *</Label>
                    <Select
                      value={formData.roundType}
                      onValueChange={(value) => setFormData({ ...formData, roundType: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROUND_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Amount
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={formData.isUndisclosed}
                          onChange={(e) => setFormData({ ...formData, isUndisclosed: e.target.checked })}
                          className="rounded"
                        />
                        Undisclosed
                      </label>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                        disabled={formData.isUndisclosed}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="AED">AED</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                          <SelectItem value="EGP">EGP</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={formData.amountRaised}
                        onChange={(e) => setFormData({ ...formData, amountRaised: e.target.value })}
                        disabled={formData.isUndisclosed}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Date & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Funding Date *</Label>
                    <Input
                      type="date"
                      value={formData.fundingDate}
                      onChange={(e) => setFormData({ ...formData, fundingDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="Additional notes about this round..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingRoundId(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Round
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : formatCurrency(statsData?.total?.amount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {filterYear ? `In ${filterYear}` : "All time"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Rounds</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : statsData?.total?.rounds || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Funding events recorded
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : formatCurrency(statsData?.total?.avgDealSize || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per funding round
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Investor</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {statsLoading ? "..." : statsData?.topInvestors?.[0]?.investorName || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsData?.topInvestors?.[0]?.dealCount || 0} deals
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="rounds">Funding Rounds</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="rounds" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search companies..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select value={filterRoundType} onValueChange={setFilterRoundType}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Round Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {ROUND_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Rounds Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px] hidden lg:table-cell">Company</TableHead>
                      <TableHead className="min-w-[120px] hidden md:table-cell">Round</TableHead>
                      <TableHead className="min-w-[140px]">Amount</TableHead>
                      <TableHead className="min-w-[120px]">Date</TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">Status</TableHead>
                      <TableHead className="min-w-[100px] text-right hidden lg:table-cell">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roundsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : roundsData?.rounds?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No funding rounds found. Add your first round to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      roundsData?.rounds?.map((round) => (
                        <TableRow key={round.id}>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-2 min-w-0">
                              {round.company?.logo && (
                                <img
                                  src={round.company.logo}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <div className="font-medium truncate">{round.company?.name || "Unknown"}</div>
                                {round.company?.industry && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {round.company.industry}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">
                              {ROUND_TYPES.find((t) => t.value === round.roundType)?.label || round.roundType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {round.isUndisclosed ? (
                              <span className="text-muted-foreground">Undisclosed</span>
                            ) : (
                              formatCurrency(round.amountRaised, round.currency || "USD")
                            )}
                          </TableCell>
                          <TableCell>{formatDate(round.fundingDate)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                round.status === "confirmed"
                                  ? "default"
                                  : round.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {round.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Manage Investors"
                                onClick={() => {
                                  setSelectedRoundForInvestors({
                                    id: round.id,
                                    name: `${round.company?.name || 'Unknown'} - ${ROUND_TYPES.find(t => t.value === round.roundType)?.label || round.roundType}`
                                  });
                                  setIsInvestorDialogOpen(true);
                                }}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(round)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm("Delete this funding round?")) {
                                    deleteMutation.mutate({ id: round.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* By Round Type */}
            <Card>
              <CardHeader>
                <CardTitle>Funding by Round Type</CardTitle>
                <CardDescription>Distribution of funding across different round stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statsData?.byRoundType?.map((item) => (
                    <div key={item.roundType} className="flex items-center gap-4">
                      <div className="w-32">
                        <Badge variant="outline">
                          {ROUND_TYPES.find((t) => t.value === item.roundType)?.label || item.roundType}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.min(
                                100,
                                (Number(item.totalAmount) / (statsData?.total?.amount || 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-24 text-right font-medium">
                        {formatCurrency(item.totalAmount)}
                      </div>
                      <div className="w-16 text-right text-muted-foreground">
                        {item.count} deals
                      </div>
                    </div>
                  ))}
                  {(!statsData?.byRoundType || statsData.byRoundType.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">
                      No data available yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Investors */}
            <Card>
              <CardHeader>
                <CardTitle>Most Active Investors</CardTitle>
                <CardDescription>Investors with the most deals in the region</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Investor</TableHead>
                      <TableHead className="min-w-[100px] text-right hidden lg:table-cell">Deals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statsData?.topInvestors?.map((investor, index) => (
                      <TableRow key={investor.investorId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-6">{index + 1}.</span>
                            {investor.investorLogo && (
                              <img
                                src={investor.investorLogo}
                                alt=""
                                className="w-6 h-6 rounded"
                              />
                            )}
                            <span className="font-medium">{investor.investorName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{investor.dealCount}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!statsData?.topInvestors || statsData.topInvestors.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                          No investor data available yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Investor Participation Dialog */}
      {selectedRoundForInvestors && (
        <InvestorParticipationDialog
          open={isInvestorDialogOpen}
          onOpenChange={(open) => {
            setIsInvestorDialogOpen(open);
            if (!open) setSelectedRoundForInvestors(null);
          }}
          fundingRoundId={selectedRoundForInvestors.id}
          roundName={selectedRoundForInvestors.name}
          onSuccess={() => refetchRounds()}
        />
      )}
    </AdminLayout>
  );
}
