/**
 * Partners Manager Page
 * Manage partner companies, tiers, and affiliate tracking
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  RefreshCw,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TIER_COLORS: Record<string, string> = {
  free: "bg-[#F0F2F5] text-[#1A1F36]",
  growth: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  growth: "Growth ($2,400/yr)",
  pro: "Pro ($6,000/yr)",
  enterprise: "Enterprise ($15,000+/yr)",
};

export default function PartnersManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showApiKey, setShowApiKey] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    website: "",
    tier: "free" as "free" | "growth" | "pro" | "enterprise",
    partnershipType: "affiliate" as "affiliate" | "sponsor" | "strategic" | "media" | "resource_provider",
    commissionRate: "15",
    description: "",
  });

  // Fetch partners
  const { data: partnersData, isLoading, refetch } = trpc.admin.partners.list.useQuery({
    limit: 100,
    offset: 0,
  });

  // Mutations
  const createPartner = trpc.admin.partners.create.useMutation({
    onSuccess: () => {
      toast.success("Partner created successfully");
      setIsCreateDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updatePartner = trpc.admin.partners.update.useMutation({
    onSuccess: () => {
      toast.success("Partner updated successfully");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Note: delete not available in router - partners should be deactivated instead

  const createApiKey = trpc.admin.partners.createApiKey.useMutation({
    onSuccess: (data) => {
      toast.success("API Key created successfully");
      setSelectedPartner({ ...selectedPartner, newApiKey: data.apiKey });
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      companyName: "",
      contactName: "",
      contactEmail: "",
      website: "",
      tier: "free",
      partnershipType: "affiliate",
      commissionRate: "15",
      description: "",
    });
  };

  const handleCreate = () => {
    createPartner.mutate({
      ...formData,
      commissionRate: parseFloat(formData.commissionRate),
    });
  };

  const handleUpdate = () => {
    if (!selectedPartner) return;
    updatePartner.mutate({
      id: selectedPartner.id,
      ...formData,
      commissionRate: parseFloat(formData.commissionRate),
    });
  };

  const handleDelete = (partner: any) => {
    toast.info("Partner deletion is disabled. Use status change to deactivate.");
  };

  const openEditDialog = (partner: any) => {
    setSelectedPartner(partner);
    setFormData({
      companyName: partner.companyName,
      contactName: partner.contactName || "",
      contactEmail: partner.contactEmail || "",
      website: partner.website || "",
      tier: partner.tier,
      partnershipType: partner.partnershipType,
      commissionRate: partner.commissionRate?.toString() || "15",
      description: partner.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const openApiKeyDialog = (partner: any) => {
    setSelectedPartner(partner);
    setIsApiKeyDialogOpen(true);
  };

  // Filter partners
  const partners = partnersData?.partners || [];
  const filteredPartners = partners.filter((partner: any) => {
    const matchesSearch =
      partner.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = activeTab === "all" || partner.tier === activeTab;
    return matchesSearch && matchesTier;
  });

  // Stats
  const stats = {
    total: partners.length,
    free: partners.filter((p: any) => p.tier === "free").length,
    growth: partners.filter((p: any) => p.tier === "growth").length,
    pro: partners.filter((p: any) => p.tier === "pro").length,
    enterprise: partners.filter((p: any) => p.tier === "enterprise").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Partners Management</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">
              Manage partner companies, tiers, and affiliate programs
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#697386]">Total Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-[#0066FF]" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#697386]">Free Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-[#697386]">{stats.free}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#697386]">Growth Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-blue-600">{stats.growth}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#697386]">Pro Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-purple-600">{stats.pro}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#697386]">Enterprise</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-amber-600">{stats.enterprise}</span>
            </CardContent>
          </Card>
        </div>

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="free">Free</TabsTrigger>
                  <TabsTrigger value="growth">Growth</TabsTrigger>
                  <TabsTrigger value="pro">Pro</TabsTrigger>
                  <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                  <Input
                    placeholder="Search partners..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-[#9BA3B0]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((partner: any) => (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-[#F0F2F5] flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-[#697386]" />
                          </div>
                          <div>
                            <p className="font-medium">{partner.companyName}</p>
                            {partner.website && (
                              <a
                                href={partner.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#0066FF] hover:underline flex items-center gap-1"
                              >
                                Website <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{partner.contactName || "-"}</p>
                          <p className="text-sm text-[#697386]">{partner.contactEmail || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={TIER_COLORS[partner.tier]}>
                          {TIER_LABELS[partner.tier] || partner.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{partner.partnershipType}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{partner.commissionRate}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.status === "active" ? "default" : "secondary"}>
                          {partner.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDialog(partner)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openApiKeyDialog(partner)}>
                              <Key className="h-4 w-4 mr-2" />
                              API Keys
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <TrendingUp className="h-4 w-4 mr-2" />
                              View Analytics
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(partner)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPartners.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-[#697386]">
                        No partners found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Partner Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Partner</DialogTitle>
              <DialogDescription>
                Create a new partner account with affiliate tracking
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="e.g., Acme Corp"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    placeholder="John Doe"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier">Partner Tier</Label>
                  <Select
                    value={formData.tier}
                    onValueChange={(value) => setFormData({ ...formData, tier: value as "free" | "growth" | "pro" | "enterprise" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="growth">Growth ($2,400/yr)</SelectItem>
                      <SelectItem value="pro">Pro ($6,000/yr)</SelectItem>
                      <SelectItem value="enterprise">Enterprise ($15,000+/yr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partnershipType">Partnership Type</Label>
                  <Select
                    value={formData.partnershipType}
                    onValueChange={(value) => setFormData({ ...formData, partnershipType: value as "affiliate" | "sponsor" | "strategic" | "media" | "resource_provider" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="affiliate">Affiliate</SelectItem>
                      <SelectItem value="sponsor">Sponsor</SelectItem>
                      <SelectItem value="media">Media Partner</SelectItem>
                      <SelectItem value="resource_provider">Resource Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the partnership..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createPartner.isPending}>
                {createPartner.isPending ? "Creating..." : "Create Partner"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Partner Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Partner</DialogTitle>
              <DialogDescription>
                Update partner details and settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-companyName">Company Name *</Label>
                  <Input
                    id="edit-companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contactName">Contact Name</Label>
                  <Input
                    id="edit-contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contactEmail">Contact Email</Label>
                  <Input
                    id="edit-contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-tier">Partner Tier</Label>
                  <Select
                    value={formData.tier}
                    onValueChange={(value) => setFormData({ ...formData, tier: value as "free" | "growth" | "pro" | "enterprise" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="growth">Growth ($2,400/yr)</SelectItem>
                      <SelectItem value="pro">Pro ($6,000/yr)</SelectItem>
                      <SelectItem value="enterprise">Enterprise ($15,000+/yr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-partnershipType">Partnership Type</Label>
                  <Select
                    value={formData.partnershipType}
                    onValueChange={(value) => setFormData({ ...formData, partnershipType: value as "affiliate" | "sponsor" | "strategic" | "media" | "resource_provider" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="affiliate">Affiliate</SelectItem>
                      <SelectItem value="sponsor">Sponsor</SelectItem>
                      <SelectItem value="media">Media Partner</SelectItem>
                      <SelectItem value="resource_provider">Resource Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-commissionRate">Commission Rate (%)</Label>
                <Input
                  id="edit-commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updatePartner.isPending}>
                {updatePartner.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* API Keys Dialog */}
        <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>API Keys - {selectedPartner?.companyName}</DialogTitle>
              <DialogDescription>
                Manage API keys for partner integration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedPartner?.newApiKey && (
                <div className="p-4 bg-[#F0F7FF] border border-[#C7DCFF] rounded-md">
                  <p className="text-sm font-medium text-[#0052CC] mb-2">
                    New API Key Created
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={selectedPartner.newApiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedPartner.newApiKey);
                        toast.success("API key copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-[#0066FF] mt-2">
                    Save this key securely. It won't be shown again.
                  </p>
                </div>
              )}
              <div className="text-center py-4">
                <Key className="h-12 w-12 text-[#C8CDD6] mx-auto mb-3" />
                <p className="text-sm text-[#697386]">
                  Generate an API key for this partner to enable programmatic access
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (selectedPartner) {
                    createApiKey.mutate({
                      partnerId: selectedPartner.id,
                      keyName: `API Key - ${new Date().toLocaleDateString()}`,
                    });
                  }
                }}
                disabled={createApiKey.isPending}
              >
                {createApiKey.isPending ? "Generating..." : "Generate New Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
