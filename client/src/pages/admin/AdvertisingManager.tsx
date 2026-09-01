/**
 * Advertising Manager - Production-ready admin for ad operations
 * Tabs: Overview | Campaigns | Ad Slots | Creatives | AdSense Settings | Brand Safety | Reports
 */

import React, { useState, useMemo, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Megaphone, LayoutGrid, Image, BarChart3, Plus, Search, Eye, Pencil, Trash2,
  Play, Pause, DollarSign, MousePointerClick, TrendingUp, Calendar, Settings2,
  Shield, AlertTriangle, Globe, FileText, Power, Zap, Monitor, Smartphone,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────
type Campaign = any;
type Slot = {
  id: number; name: string; slotKey: string; pageType: string;
  position: string; dimensions?: string | null; isActive?: number | null;
  isPremium?: number | null; floorPrice?: string | null; adsenseSlotId?: string | null;
  createdAt: string; updatedAt: string;
  slotType?: string; baseCpm?: string;
};
type Creative = any & {
  id: number; name: string; campaignId: number; format: string;
  status: string; fileUrl?: string | null; clickUrl?: string;
  nativeHeadline?: string | null; nativeDescription?: string | null; nativeCta?: string | null;
  dimensions?: string | null; impressions?: number | null; clicks?: number | null;
};

/**
 * Visual wrapper for one workflow group in the Advertising Manager tab
 * header. Mirrors the SEO Manager's WorkflowGroup pattern — small label
 * + icon to the left of a TabsList row.
 */
function AdsWorkflowGroup({ label, icon, children }: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[110px]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function AdvertisingManager() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isCreateSlotOpen, setIsCreateSlotOpen] = useState(false);
  const [isCreateCreativeOpen, setIsCreateCreativeOpen] = useState(false);
  const [isBlocklistOpen, setIsBlocklistOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isEditingSlot, setIsEditingSlot] = useState(false);
  const [slotEditForm, setSlotEditForm] = useState({
    name: "", baseCpm: "", adsenseSlotId: "", isActive: true, isPremium: false,
  });

  // ─── Form States ─────────────────────────────────────────────
  const [campaignForm, setCampaignForm] = useState({
    name: "", partnerId: "", budget: "", dailyBudget: "",
    startDate: "", endDate: "", campaignType: "direct",
    pricingModel: "cpm", pricePerUnit: "", frequencyCap: "",
    targetSlots: "",
  });
  const [slotForm, setSlotForm] = useState({
    name: "", slotKey: "", slotType: "banner", position: "",
    width: "", height: "", baseCpm: "", adsenseSlotId: "", isPremium: false,
  });
  const [creativeForm, setCreativeForm] = useState({
    campaignId: "", name: "", format: "banner", fileUrl: "",
    clickUrl: "", altText: "", nativeHeadline: "", nativeDescription: "",
    nativeCta: "", dimensions: "",
  });
  const [blocklistForm, setBlocklistForm] = useState({
    type: "domain" as "domain" | "keyword" | "category",
    value: "", reason: "",
  });

  // ─── Data Queries ────────────────────────────────────────────
  const { data: campaignsData, isLoading: campaignsLoading, refetch: refetchCampaigns } =
    trpc.admin.advertising.listCampaigns.useQuery({ limit: 100 });
  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } =
    trpc.admin.advertising.listSlots.useQuery({});
  const { data: creativesData, isLoading: creativesLoading, refetch: refetchCreatives } =
    trpc.admin.advertising.listCreatives.useQuery({});
  const { data: statsData, refetch: refetchStats } =
    trpc.admin.advertising.getOverallStats.useQuery();
  const { data: adsenseSettings, refetch: refetchAdsense } =
    trpc.admin.advertising.getAdsenseSettings.useQuery();
  const { data: blocklistData, refetch: refetchBlocklist } =
    trpc.admin.advertising.listBlocklist.useQuery();
  const { data: revenueReport } =
    trpc.admin.advertising.getRevenueReport.useQuery({});

  // ─── Mutations ───────────────────────────────────────────────
  const createCampaign = trpc.admin.advertising.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign created successfully");
      setIsCreateCampaignOpen(false);
      refetchCampaigns(); refetchStats();
      setCampaignForm({ name: "", partnerId: "", budget: "", dailyBudget: "", startDate: "", endDate: "", campaignType: "direct", pricingModel: "cpm", pricePerUnit: "", frequencyCap: "", targetSlots: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const createSlot = trpc.admin.advertising.createSlot.useMutation({
    onSuccess: () => {
      toast.success("Ad slot created");
      setIsCreateSlotOpen(false);
      refetchSlots(); refetchStats();
      setSlotForm({ name: "", slotKey: "", slotType: "banner", position: "", width: "", height: "", baseCpm: "", adsenseSlotId: "", isPremium: false });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const createCreative = trpc.admin.advertising.createCreative.useMutation({
    onSuccess: () => {
      toast.success("Creative created");
      setIsCreateCreativeOpen(false);
      refetchCreatives();
      setCreativeForm({ campaignId: "", name: "", format: "banner", fileUrl: "", clickUrl: "", altText: "", nativeHeadline: "", nativeDescription: "", nativeCta: "", dimensions: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const updateCampaignStatus = trpc.admin.advertising.updateCampaign.useMutation({
    onSuccess: () => { toast.success("Campaign updated"); refetchCampaigns(); refetchStats(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteCampaign = trpc.admin.advertising.deleteCampaign.useMutation({
    onSuccess: () => { toast.success("Campaign deleted"); refetchCampaigns(); refetchStats(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteSlot = trpc.admin.advertising.deleteSlot.useMutation({
    onSuccess: () => { toast.success("Slot deleted"); refetchSlots(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateSlot = trpc.admin.advertising.updateSlot.useMutation({
    onSuccess: () => {
      toast.success("Slot updated successfully");
      refetchSlots();
      setIsEditingSlot(false);
      // Update selectedSlot with new values so dialog reflects changes immediately
      if (selectedSlot) {
        setSelectedSlot({
          ...selectedSlot,
          name: slotEditForm.name,
          baseCpm: slotEditForm.baseCpm,
          adsenseSlotId: slotEditForm.adsenseSlotId,
          isActive: slotEditForm.isActive ? 1 : 0,
          isPremium: slotEditForm.isPremium ? 1 : 0,
        });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteCreative = trpc.admin.advertising.deleteCreative.useMutation({
    onSuccess: () => { toast.success("Creative deleted"); refetchCreatives(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateAdsense = trpc.admin.advertising.updateAdsenseSettings.useMutation({
    onSuccess: () => { toast.success("AdSense settings saved"); refetchAdsense(); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleKillSwitch = trpc.admin.advertising.toggleGlobalKillSwitch.useMutation({
    onSuccess: () => { toast.success("Kill switch toggled"); refetchAdsense(); },
    onError: (e: any) => toast.error(e.message),
  });
  const addBlocklist = trpc.admin.advertising.addToBlocklist.useMutation({
    onSuccess: () => {
      toast.success("Added to blocklist");
      setIsBlocklistOpen(false);
      refetchBlocklist();
      setBlocklistForm({ type: "domain", value: "", reason: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const removeBlocklist = trpc.admin.advertising.removeFromBlocklist.useMutation({
    onSuccess: () => { toast.success("Removed from blocklist"); refetchBlocklist(); },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Derived Data ────────────────────────────────────────────
  const campaigns = useMemo(() => campaignsData?.campaigns || [], [campaignsData]);
  const slots = useMemo(() => slotsData || [], [slotsData]);
  const creatives = useMemo(() => creativesData || [], [creativesData]);
  const blocklist = useMemo(() => blocklistData || [], [blocklistData]);

  const filteredCampaigns = campaigns.filter((c: any) => {
    const name = c.campaign?.name ?? c.name ?? '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });
  const filteredCreatives = creatives.filter((c: Creative) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { cls: string; Icon: any }> = {
      draft: { cls: "bg-[#F0F2F5] text-[#1A1F36] border-[#E0E3E8]", Icon: Pencil },
      pending: { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", Icon: Calendar },
      pending_approval: { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", Icon: Calendar },
      active: { cls: "bg-green-100 text-green-700 border-green-200", Icon: Play },
      approved: { cls: "bg-green-100 text-green-700 border-green-200", Icon: Play },
      paused: { cls: "bg-orange-100 text-orange-700 border-orange-200", Icon: Pause },
      completed: { cls: "bg-blue-100 text-blue-700 border-blue-200", Icon: BarChart3 },
      cancelled: { cls: "bg-red-100 text-red-700 border-red-200", Icon: Trash2 },
      rejected: { cls: "bg-red-100 text-red-700 border-red-200", Icon: AlertTriangle },
    };
    const { cls, Icon } = cfg[status] || cfg.draft;
    return (
      <Badge className={cls} variant="outline">
        <Icon className="h-3 w-3 mr-1" />
        {status.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
      </Badge>
    );
  };

  // ─── Slot edit form sync ────────────────────────────────────
  useEffect(() => {
    if (selectedSlot && !isEditingSlot) {
      setSlotEditForm({
        name: selectedSlot.name || "",
        baseCpm: selectedSlot.baseCpm || "",
        adsenseSlotId: selectedSlot.adsenseSlotId || "",
        isActive: !!selectedSlot.isActive,
        isPremium: !!selectedSlot.isPremium,
      });
    }
  }, [selectedSlot, isEditingSlot]);

  // ─── Campaign slot map (for campaign-to-slot indicators) ─────
  const campaignSlotMap = useMemo(() => {
    const map: Record<number, string[]> = {};
    campaigns.forEach((row: any) => {
      const c = row.campaign ?? row;
      const targetSlots = c.targetSlots;
      if (Array.isArray(targetSlots)) {
        targetSlots.forEach((slotId: number | string) => {
          const sid = Number(slotId);
          if (!map[sid]) map[sid] = [];
          map[sid].push(c.name);
        });
      }
    });
    return map;
  }, [campaigns]);

  // ─── Local AdSense form state ────────────────────────────────
  const [adsenseForm, setAdsenseForm] = useState<{
    publisherId: string; autoAdsEnabled: boolean; adsenseEnabled: boolean;
    adsTxtContent: string; globalKillSwitch: boolean;
  } | null>(null);

  // Initialize form when data loads
  if (adsenseSettings && !adsenseForm) {
    setAdsenseForm({
      publisherId: adsenseSettings.publisherId || "",
      autoAdsEnabled: !!adsenseSettings.autoAdsEnabled,
      adsenseEnabled: !!adsenseSettings.adsenseEnabled,
      adsTxtContent: adsenseSettings.adsTxtContent || "",
      globalKillSwitch: !!adsenseSettings.globalKillSwitch,
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Advertising Manager</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage campaigns, slots, creatives, and AdSense integration
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Kill Switch */}
            <Button
              variant={adsenseSettings?.globalKillSwitch ? "destructive" : "outline"}
              size="sm"
              onClick={() => toggleKillSwitch.mutate({ enabled: !adsenseSettings?.globalKillSwitch })}
              className={`gap-2 ${!adsenseSettings?.globalKillSwitch ? "border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700" : ""}`}
            >
              <Power className="h-4 w-4" />
              {adsenseSettings?.globalKillSwitch ? "Ads OFF" : "Ads ON"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsCreateSlotOpen(true)}>
              <LayoutGrid className="h-4 w-4 mr-1" /> New Slot
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsCreateCreativeOpen(true)}>
              <Image className="h-4 w-4 mr-1" /> New Creative
            </Button>
            <Button size="sm" onClick={() => setIsCreateCampaignOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Campaign
            </Button>
          </div>
        </div>

        {/* Kill Switch Warning */}
        {adsenseSettings?.globalKillSwitch && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Global Kill Switch is ON</p>
              <p className="text-xs text-red-600">All ads are disabled site-wide. Click "Ads OFF" to re-enable.</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Active Campaigns</p>
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{statsData?.campaigns?.activeCampaigns || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Ad Slots</p>
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-[#0066FF]" />
                <span className="text-2xl font-bold">{statsData?.slots?.activeSlots || 0}</span>
                <span className="text-xs text-muted-foreground">/ {statsData?.slots?.totalSlots || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Impressions</p>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">
                  {(statsData?.campaigns?.totalImpressions || 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Clicks / CTR</p>
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">
                  {(statsData?.campaigns?.totalClicks || 0).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">{statsData?.overallCtr || 0}%</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Revenue</p>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">
                  ${(statsData?.campaigns?.totalBudget || 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/*
            Workflow-grouped tab layout (Phase 1 simplification).

            Operators told us 7 flat tabs hide what they're trying to do.
            Reorganised into 3 workflow rows + the search input. Each row
            corresponds to a job: ANALYZE (Overview / Reports), DIRECT
            (manage your direct-sold inventory), PROGRAMMATIC (Google's
            fallback ads + safety rules).

            Internal `value=""` strings are unchanged so all TabsContent
            blocks keep rendering. Pure visual rewrite.
          */}
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3 mb-2">
            <div className="space-y-2 flex-1 min-w-0">
              <AdsWorkflowGroup label="Analyze" icon={<TrendingUp className="h-3.5 w-3.5" />}>
                <TabsList className="bg-transparent p-0 gap-1 h-auto flex-wrap">
                  <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
                    <TrendingUp className="h-3.5 w-3.5" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm">
                    <BarChart3 className="h-3.5 w-3.5" /> Reports
                  </TabsTrigger>
                </TabsList>
              </AdsWorkflowGroup>

              <AdsWorkflowGroup label="Direct ads" icon={<Megaphone className="h-3.5 w-3.5" />}>
                <TabsList className="bg-transparent p-0 gap-1 h-auto flex-wrap">
                  <TabsTrigger value="campaigns" className="gap-1.5 text-xs sm:text-sm">
                    <Megaphone className="h-3.5 w-3.5" /> Campaigns
                  </TabsTrigger>
                  <TabsTrigger value="slots" className="gap-1.5 text-xs sm:text-sm">
                    <LayoutGrid className="h-3.5 w-3.5" /> Slots
                  </TabsTrigger>
                  <TabsTrigger value="creatives" className="gap-1.5 text-xs sm:text-sm">
                    <Image className="h-3.5 w-3.5" /> Creatives
                  </TabsTrigger>
                </TabsList>
              </AdsWorkflowGroup>

              <AdsWorkflowGroup label="Programmatic" icon={<Globe className="h-3.5 w-3.5" />}>
                <TabsList className="bg-transparent p-0 gap-1 h-auto flex-wrap">
                  <TabsTrigger value="adsense" className="gap-1.5 text-xs sm:text-sm">
                    <Globe className="h-3.5 w-3.5" /> AdSense
                  </TabsTrigger>
                  <TabsTrigger value="safety" className="gap-1.5 text-xs sm:text-sm">
                    <Shield className="h-3.5 w-3.5" /> Safety
                  </TabsTrigger>
                </TabsList>
              </AdsWorkflowGroup>
            </div>

            <div className="relative shrink-0 xl:mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 w-full xl:w-48 h-9 text-sm text-foreground bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => setIsCreateCampaignOpen(true)}>
                    <Plus className="h-5 w-5 text-blue-500" />
                    <span className="text-xs">New Campaign</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => setIsCreateSlotOpen(true)}>
                    <LayoutGrid className="h-5 w-5 text-[#0066FF]" />
                    <span className="text-xs">New Slot</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => setIsCreateCreativeOpen(true)}>
                    <Image className="h-5 w-5 text-purple-500" />
                    <span className="text-xs">New Creative</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => setActiveTab("adsense")}>
                    <Settings2 className="h-5 w-5 text-amber-500" />
                    <span className="text-xs">AdSense Settings</span>
                  </Button>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Global Kill Switch</span>
                    <Badge
                      variant={adsenseSettings?.globalKillSwitch ? "destructive" : "outline"}
                      className={!adsenseSettings?.globalKillSwitch ? "bg-green-100 text-green-700 border-green-200" : ""}
                    >
                      {adsenseSettings?.globalKillSwitch ? "ON (Ads Disabled)" : "OFF (Ads Active)"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Google AdSense</span>
                    <Badge variant={adsenseSettings?.adsenseEnabled ? "default" : "secondary"}>
                      {adsenseSettings?.adsenseEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Auto Ads</span>
                    <Badge variant={adsenseSettings?.autoAdsEnabled ? "default" : "secondary"}>
                      {adsenseSettings?.autoAdsEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Publisher ID</span>
                    <span className="text-sm font-mono">{adsenseSettings?.publisherId || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">ads.txt</span>
                    <a href="/ads.txt" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> View
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Slot Inventory Visual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Slot Inventory ({slots.length} slots)</CardTitle>
                <CardDescription>All configured ad placements across the site</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {slots.map((slot: Slot) => (
                    <div
                      key={slot.id}
                      className={`border rounded-md p-3 cursor-pointer transition-shadow hover:shadow-md ${slot.isActive ? "border-green-200 bg-green-50/50" : "border-[#E0E3E8] bg-[#F7F8FA]/50 opacity-60"}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate">{slot.name}</span>
                        {!!slot.isPremium && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Premium</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-mono">{slot.slotKey}</span>
                        <span>{slot.dimensions || "responsive"}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {slot.dimensions?.includes("728") ? <Monitor className="h-3 w-3 text-muted-foreground" /> : <Smartphone className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-[10px] text-muted-foreground">{slot.pageType || "all"}</span>
                        {slot.baseCpm && <span className="text-[10px] text-[#0066FF] ml-auto">${slot.baseCpm} CPM</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ CAMPAIGNS TAB ═══ */}
          <TabsContent value="campaigns" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Target Slots</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Spent</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignsLoading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : filteredCampaigns.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No campaigns found. Create your first campaign to get started.</TableCell></TableRow>
                    ) : (
                      filteredCampaigns.map((row: any) => {
                        const c = row.campaign ?? row;
                        const partnerName = row.partner?.companyName;
                        return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{c.name}</span>
                              {partnerName && <span className="text-xs text-muted-foreground block">{partnerName}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {c.campaignType || "direct"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(c.status)}</TableCell>
                          <TableCell>
                            {Array.isArray(c.targetSlots) && c.targetSlots.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {(c.targetSlots as (number | string)[]).map((slotId) => {
                                  const slot = slots.find((s: Slot) => s.id === Number(slotId));
                                  return slot ? (
                                    <Badge
                                      key={slotId}
                                      variant="outline"
                                      className="text-[10px] cursor-pointer hover:bg-muted"
                                      onClick={() => { setSelectedSlot(slot); setActiveTab("slots"); }}
                                      title={slot.slotKey}
                                    >
                                      {slot.name.length > 16 ? slot.name.slice(0, 14) + "…" : slot.name}
                                    </Badge>
                                  ) : (
                                    <Badge key={slotId} variant="outline" className="text-[10px] text-muted-foreground">#{slotId}</Badge>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>${Number(c.budget || 0).toLocaleString()}</TableCell>
                          <TableCell>${Number(c.spend || 0).toLocaleString()}</TableCell>
                          <TableCell>{(c.impressions || 0).toLocaleString()}</TableCell>
                          <TableCell>{(c.clicks || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            {(c.impressions || 0) > 0
                              ? `${(((c.clicks || 0) / (c.impressions || 1)) * 100).toFixed(2)}%`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {c.status === "active" ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => updateCampaignStatus.mutate({ id: c.id, status: "paused" })}>
                                  <Pause className="h-3.5 w-3.5 text-orange-500" />
                                </Button>
                              ) : c.status === "paused" || c.status === "draft" ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => updateCampaignStatus.mutate({ id: c.id, status: "active" })}>
                                  <Play className="h-3.5 w-3.5 text-green-500" />
                                </Button>
                              ) : null}
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => { if (confirm("Delete this campaign?")) deleteCampaign.mutate({ id: c.id }); }}>
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ SLOTS TAB ═══ */}
          <TabsContent value="slots" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slotsLoading ? (
                <p className="col-span-3 text-center py-8">Loading...</p>
              ) : slots.length === 0 ? (
                <p className="col-span-3 text-center py-8 text-muted-foreground">No ad slots configured</p>
              ) : (
                slots.map((slot: Slot) => (
                  <Card key={slot.id} className={!slot.isActive ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{slot.name}</CardTitle>
                        <div className="flex items-center gap-1">
                          {!!slot.isPremium && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Premium</Badge>}
                          <Badge variant={slot.isActive ? "default" : "secondary"} className="text-[10px]">
                            {slot.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="font-mono text-[11px]">{slot.slotKey}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Type</span>
                        <Badge variant="outline" className="text-[10px]">{slot.pageType}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Dimensions</span>
                        <span className="text-xs">{slot.dimensions || "responsive"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Position</span>
                        <span className="text-xs">{slot.position || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Base CPM</span>
                        <span className="text-xs font-medium">${slot.baseCpm || "0.00"}</span>
                      </div>
                      {slot.adsenseSlotId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">AdSense Slot</span>
                          <span className="text-xs font-mono">{slot.adsenseSlotId}</span>
                        </div>
                      )}
                      <div className="pt-2 flex justify-end">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500"
                          onClick={() => { if (confirm("Delete this slot?")) deleteSlot.mutate({ id: slot.id }); }}>
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ═══ CREATIVES TAB ═══ */}
          <TabsContent value="creatives" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preview</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creativesLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : filteredCreatives.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No creatives found</TableCell></TableRow>
                    ) : (
                      filteredCreatives.map((c: Creative) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            {c.fileUrl ? (
                              <img src={c.fileUrl} alt={c.name} className="w-20 h-14 object-cover rounded border" />
                            ) : (
                              <div className="w-20 h-14 bg-muted rounded border flex items-center justify-center">
                                <Image className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium text-sm">{c.name}</span>
                              {c.nativeHeadline && <span className="text-xs text-muted-foreground block truncate max-w-[200px]">{c.nativeHeadline}</span>}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{c.format}</Badge></TableCell>
                          <TableCell>{getStatusBadge(c.status)}</TableCell>
                          <TableCell className="text-xs">{c.dimensions || "-"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => { if (confirm("Delete?")) deleteCreative.mutate({ id: c.id }); }}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ ADSENSE SETTINGS TAB ═══ */}
          <TabsContent value="adsense" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Google AdSense Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Google AdSense Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure your Google AdSense integration for programmatic ad serving
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Publisher ID</Label>
                    <Input
                      placeholder="pub-XXXXXXXXXX"
                      value={adsenseForm?.publisherId || ""}
                      onChange={(e) => setAdsenseForm(prev => prev ? { ...prev, publisherId: e.target.value } : null)}
                    />
                    <p className="text-[11px] text-muted-foreground">Your Google AdSense publisher ID (e.g., pub-2487563355490273)</p>
                  </div>

                  <div className="flex items-center justify-between py-3 border-t">
                    <div>
                      <Label className="text-sm">Enable AdSense</Label>
                      <p className="text-[11px] text-muted-foreground">Show Google ads as fallback when no direct campaigns</p>
                    </div>
                    <Switch
                      checked={adsenseForm?.adsenseEnabled || false}
                      onCheckedChange={(v) => setAdsenseForm(prev => prev ? { ...prev, adsenseEnabled: v } : null)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-t">
                    <div>
                      <Label className="text-sm">Auto Ads</Label>
                      <p className="text-[11px] text-muted-foreground">Let Google automatically place ads on your pages</p>
                    </div>
                    <Switch
                      checked={adsenseForm?.autoAdsEnabled || false}
                      onCheckedChange={(v) => setAdsenseForm(prev => prev ? { ...prev, autoAdsEnabled: v } : null)}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      if (adsenseForm) updateAdsense.mutate(adsenseForm);
                    }}
                    disabled={updateAdsense.isPending}
                  >
                    {updateAdsense.isPending ? "Saving..." : "Save AdSense Settings"}
                  </Button>
                </CardContent>
              </Card>

              {/* ads.txt Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#0066FF]" />
                    ads.txt Editor
                  </CardTitle>
                  <CardDescription>
                    Edit your ads.txt file served at <a href="/ads.txt" target="_blank" className="text-primary hover:underline">/ads.txt</a>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    className="font-mono text-xs min-h-[200px]"
                    placeholder="google.com, pub-XXXXXXXXXX, DIRECT, f08c47fec0942fa0"
                    value={adsenseForm?.adsTxtContent || ""}
                    onChange={(e) => setAdsenseForm(prev => prev ? { ...prev, adsTxtContent: e.target.value } : null)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    One entry per line. Format: domain, publisher-id, relationship, certification-authority-id
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (adsenseForm) updateAdsense.mutate({ adsTxtContent: adsenseForm.adsTxtContent });
                    }}
                    disabled={updateAdsense.isPending}
                  >
                    {updateAdsense.isPending ? "Saving..." : "Save ads.txt"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Global Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Power className="h-5 w-5 text-red-500" />
                  Global Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <Label className="text-sm font-medium">Emergency Kill Switch</Label>
                    <p className="text-xs text-muted-foreground">
                      Immediately disable ALL ads site-wide. Use in case of malvertising or compliance issues.
                    </p>
                  </div>
                  <Switch
                    checked={!!adsenseSettings?.globalKillSwitch}
                    onCheckedChange={(v) => toggleKillSwitch.mutate({ enabled: v })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ BRAND SAFETY TAB ═══ */}
          <TabsContent value="safety" className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Brand Safety & Blocklist</h3>
                <p className="text-sm text-muted-foreground">Block specific domains, keywords, or categories from ad serving</p>
              </div>
              <Button size="sm" onClick={() => setIsBlocklistOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Rule
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocklist.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No blocklist rules configured</TableCell></TableRow>
                    ) : (
                      blocklist.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.value}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.reason || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => removeBlocklist.mutate({ id: item.id })}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ REPORTS TAB ═══ */}
          <TabsContent value="reports" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold">${(revenueReport?.summary?.totalRevenue || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Impressions</p>
                  <p className="text-2xl font-bold">{(revenueReport?.summary?.totalImpressions || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Clicks</p>
                  <p className="text-2xl font-bold">{(revenueReport?.summary?.totalClicks || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground mb-1">Average CTR</p>
                  <p className="text-2xl font-bold">{(revenueReport?.summary?.avgCtr || 0).toFixed(2)}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Spent</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>CTR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(revenueReport?.data || []).length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No campaign data yet</TableCell></TableRow>
                    ) : (
                      (revenueReport?.data || []).map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-sm">{c.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{c.type || "direct"}</Badge></TableCell>
                          <TableCell>{getStatusBadge(c.status)}</TableCell>
                          <TableCell className="text-xs uppercase">{c.pricingModel || "-"}</TableCell>
                          <TableCell>${Number(c.budget || 0).toLocaleString()}</TableCell>
                          <TableCell>${Number(c.spend || 0).toLocaleString()}</TableCell>
                          <TableCell>{(c.impressions || 0).toLocaleString()}</TableCell>
                          <TableCell>{(c.clicks || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            {(c.impressions || 0) > 0
                              ? `${(((c.clicks || 0) / (c.impressions || 1)) * 100).toFixed(2)}%`
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ═══ SLOT DETAIL / EDIT DIALOG ═══ */}
        <Dialog open={!!selectedSlot} onOpenChange={(open) => { if (!open) { setSelectedSlot(null); setIsEditingSlot(false); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-[#0066FF]" />
                {isEditingSlot ? "Edit Slot" : selectedSlot?.name}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">{selectedSlot?.slotKey}</DialogDescription>
            </DialogHeader>
            {selectedSlot && (
              isEditingSlot ? (
                /* ── Edit Mode ── */
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <Label>Slot Name <span className="text-red-500">*</span></Label>
                      <Input value={slotEditForm.name} onChange={(e) => setSlotEditForm({ ...slotEditForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Base CPM ($)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={slotEditForm.baseCpm}
                        onChange={(e) => setSlotEditForm({ ...slotEditForm, baseCpm: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>AdSense Slot ID</Label>
                      <Input placeholder="e.g., 1234567890" value={slotEditForm.adsenseSlotId}
                        onChange={(e) => setSlotEditForm({ ...slotEditForm, adsenseSlotId: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={slotEditForm.isActive} onCheckedChange={(v) => setSlotEditForm({ ...slotEditForm, isActive: v })} />
                      <Label className="cursor-pointer">Active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={slotEditForm.isPremium} onCheckedChange={(v) => setSlotEditForm({ ...slotEditForm, isPremium: v })} />
                      <Label className="cursor-pointer">Premium</Label>
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-md p-3 text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium">Dimensions:</span> {selectedSlot.dimensions || "responsive"} (read-only)</p>
                    <p><span className="font-medium">Position:</span> {selectedSlot.position || "—"} (read-only)</p>
                    <p><span className="font-medium">Page type:</span> {selectedSlot.pageType || "global"} (read-only)</p>
                  </div>
                </div>
              ) : (
                /* ── View Mode ── */
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant={selectedSlot.isActive ? "default" : "secondary"} className={selectedSlot.isActive ? "bg-green-100 text-green-700 border-green-200" : ""}>
                        {selectedSlot.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Type</p>
                      <Badge variant="outline">{selectedSlot.pageType || selectedSlot.slotType || "banner"}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Dimensions</p>
                      <p className="text-sm font-medium">{selectedSlot.dimensions || "Responsive"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Position</p>
                      <p className="text-sm font-medium">{selectedSlot.position || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Base CPM</p>
                      <p className="text-sm font-medium">${selectedSlot.baseCpm || "0.00"}</p>
                    </div>
                    {selectedSlot.adsenseSlotId && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">AdSense Slot ID</p>
                        <p className="text-sm font-mono">{selectedSlot.adsenseSlotId}</p>
                      </div>
                    )}
                  </div>
                  <div className="border rounded-md p-3 bg-muted/30 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Where this slot appears</p>
                    {(() => {
                      const key = selectedSlot.slotKey || "";
                      const pos = selectedSlot.position || "";
                      const pageType = selectedSlot.pageType || "";
                      const locations: string[] = [];
                      if (key.includes("home") || pageType === "home") locations.push("Homepage");
                      if (key.includes("startup") || pageType === "startups") locations.push("Startups directory page");
                      if (key.includes("investor") || pageType === "investors") locations.push("Investors directory page");
                      if (key.includes("job") || pageType === "jobs") locations.push("Jobs board page");
                      if (key.includes("event") || pageType === "events") locations.push("Events listing page");
                      if (key.includes("article") || key.includes("news") || pageType === "article") locations.push("Article / news detail pages");
                      if (key.includes("sidebar") || pos.includes("sidebar")) locations.push("Sidebar (all applicable pages)");
                      if (key.includes("header") || pos.includes("header") || pos.includes("top")) locations.push("Page header / top banner");
                      if (key.includes("footer") || pos.includes("footer") || pos.includes("bottom")) locations.push("Page footer / bottom banner");
                      if (key.includes("inline") || pos.includes("inline") || pos.includes("mid")) locations.push("Inline content (mid-article)");
                      if (locations.length === 0) locations.push("All pages (global slot)");
                      return locations.map((loc, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#0066FF] shrink-0" />
                          <span>{loc}</span>
                        </div>
                      ));
                    })()}
                  </div>
                  {/* Campaigns targeting this slot */}
                  {campaignSlotMap[selectedSlot.id] && campaignSlotMap[selectedSlot.id].length > 0 && (
                    <div className="border rounded-md p-3 bg-blue-50/50 border-blue-200 space-y-2">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Targeted by campaigns</p>
                      {campaignSlotMap[selectedSlot.id].map((name, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-blue-800">
                          <Megaphone className="h-3.5 w-3.5 shrink-0" />
                          <span>{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!!selectedSlot.isPremium && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      <Zap className="h-4 w-4 shrink-0" />
                      <span>Premium slot — commands higher CPM rates from direct advertisers</span>
                    </div>
                  )}
                </div>
              )
            )}
            <DialogFooter className="gap-2">
              {isEditingSlot ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditingSlot(false)}>Cancel</Button>
                  <Button
                    onClick={() => {
                      if (!selectedSlot) return;
                      updateSlot.mutate({
                        id: selectedSlot.id,
                        name: slotEditForm.name,
                        floorPrice: slotEditForm.baseCpm ? parseFloat(slotEditForm.baseCpm) : undefined,
                        adsenseSlotId: slotEditForm.adsenseSlotId || undefined,
                        isActive: slotEditForm.isActive,
                        isPremium: slotEditForm.isPremium,
                      });
                    }}
                    disabled={updateSlot.isPending || !slotEditForm.name}
                  >
                    {updateSlot.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setSelectedSlot(null)}>Close</Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingSlot(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Slot
                  </Button>
                  <Button variant="destructive" size="sm"
                    onClick={() => {
                      if (selectedSlot && confirm("Delete this slot?")) {
                        deleteSlot.mutate({ id: selectedSlot.id });
                        setSelectedSlot(null);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Slot
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ CREATE CAMPAIGN DIALOG ═══ */}
        <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Ad Campaign</DialogTitle>
              <DialogDescription>Set up a new advertising campaign</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g., Q1 Brand Awareness" value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select value={campaignForm.campaignType}
                    onValueChange={(v) => setCampaignForm({ ...campaignForm, campaignType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="house">House Ad</SelectItem>
                      <SelectItem value="programmatic">Programmatic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pricing Model</Label>
                  <Select value={campaignForm.pricingModel}
                    onValueChange={(v) => setCampaignForm({ ...campaignForm, pricingModel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpm">CPM (Cost per 1000 impressions)</SelectItem>
                      <SelectItem value="cpc">CPC (Cost per click)</SelectItem>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price per Unit ($)</Label>
                  <Input type="number" placeholder="5.00" value={campaignForm.pricePerUnit}
                    onChange={(e) => setCampaignForm({ ...campaignForm, pricePerUnit: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Budget ($)</Label>
                  <Input type="number" placeholder="10000" value={campaignForm.budget}
                    onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Daily Budget ($)</Label>
                  <Input type="number" placeholder="500" value={campaignForm.dailyBudget}
                    onChange={(e) => setCampaignForm({ ...campaignForm, dailyBudget: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date <span className="text-red-500">*</span></Label>
                  <Input type="date" value={campaignForm.startDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={campaignForm.endDate}
                    onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency Cap (per session)</Label>
                  <Input type="number" placeholder="3" value={campaignForm.frequencyCap}
                    onChange={(e) => setCampaignForm({ ...campaignForm, frequencyCap: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Target Slot IDs (comma-separated)</Label>
                  <Input placeholder="1,2,5" value={campaignForm.targetSlots}
                    onChange={(e) => setCampaignForm({ ...campaignForm, targetSlots: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateCampaignOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createCampaign.mutate({
                  name: campaignForm.name,
                  campaignType: campaignForm.campaignType as any,
                  pricingModel: campaignForm.pricingModel as any,
                  budget: campaignForm.budget ? parseFloat(campaignForm.budget) : 0,
                  startDate: campaignForm.startDate || new Date().toISOString().split("T")[0],
                  endDate: campaignForm.endDate || undefined,
                })}
                disabled={createCampaign.isPending || !campaignForm.name}
              >
                {createCampaign.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ CREATE SLOT DIALOG ═══ */}
        <Dialog open={isCreateSlotOpen} onOpenChange={setIsCreateSlotOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Ad Slot</DialogTitle>
              <DialogDescription>Define a new ad placement on your site</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Slot Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g., Homepage Leaderboard" value={slotForm.name}
                    onChange={(e) => {
                      const key = e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                      setSlotForm({ ...slotForm, name: e.target.value, slotKey: key });
                    }} />
                </div>
                <div className="space-y-2">
                  <Label>Slot Key</Label>
                  <Input placeholder="auto-generated" value={slotForm.slotKey}
                    onChange={(e) => setSlotForm({ ...slotForm, slotKey: e.target.value })} className="font-mono text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Slot Type</Label>
                  <Select value={slotForm.slotType}
                    onValueChange={(v) => setSlotForm({ ...slotForm, slotType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="sidebar">Sidebar</SelectItem>
                      <SelectItem value="inline">Inline</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="sticky">Sticky</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input placeholder="e.g., header, sidebar-top" value={slotForm.position}
                    onChange={(e) => setSlotForm({ ...slotForm, position: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Width (px)</Label>
                  <Input type="number" placeholder="728" value={slotForm.width}
                    onChange={(e) => setSlotForm({ ...slotForm, width: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Height (px)</Label>
                  <Input type="number" placeholder="90" value={slotForm.height}
                    onChange={(e) => setSlotForm({ ...slotForm, height: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Base CPM ($)</Label>
                  <Input type="number" placeholder="5.00" value={slotForm.baseCpm}
                    onChange={(e) => setSlotForm({ ...slotForm, baseCpm: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AdSense Slot ID (optional)</Label>
                  <Input placeholder="1234567890" value={slotForm.adsenseSlotId}
                    onChange={(e) => setSlotForm({ ...slotForm, adsenseSlotId: e.target.value })} className="font-mono text-sm" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={slotForm.isPremium}
                    onCheckedChange={(v) => setSlotForm({ ...slotForm, isPremium: v })} />
                  <Label>Premium Slot</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateSlotOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createSlot.mutate({
                  name: slotForm.name,
                  slotKey: slotForm.slotKey || slotForm.name.toLowerCase().replace(/\s+/g, "-"),
                  pageType: slotForm.slotType,
                  position: slotForm.position,
                  dimensions: slotForm.width && slotForm.height ? `${slotForm.width}x${slotForm.height}` : undefined,
                })}
                disabled={createSlot.isPending || !slotForm.name}
              >
                {createSlot.isPending ? "Creating..." : "Create Slot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ CREATE CREATIVE DIALOG ═══ */}
        <Dialog open={isCreateCreativeOpen} onOpenChange={setIsCreateCreativeOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Ad Creative</DialogTitle>
              <DialogDescription>Upload a new ad creative for a campaign</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Creative Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g., Summer Sale Banner" value={creativeForm.name}
                    onChange={(e) => setCreativeForm({ ...creativeForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Campaign ID <span className="text-red-500">*</span></Label>
                  <Select value={creativeForm.campaignId}
                    onValueChange={(v) => setCreativeForm({ ...creativeForm, campaignId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c: any) => (
                        <SelectItem key={c.campaign?.id ?? c.id} value={String(c.campaign?.id ?? c.id)}>{c.campaign?.name ?? c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={creativeForm.format}
                    onValueChange={(v) => setCreativeForm({ ...creativeForm, format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">Banner (Image)</SelectItem>
                      <SelectItem value="native">Native</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dimensions</Label>
                  <Select value={creativeForm.dimensions}
                    onValueChange={(v) => setCreativeForm({ ...creativeForm, dimensions: v })}>
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="728x90">728x90 Leaderboard</SelectItem>
                      <SelectItem value="300x250">300x250 Medium Rectangle</SelectItem>
                      <SelectItem value="300x600">300x600 Half Page</SelectItem>
                      <SelectItem value="320x50">320x50 Mobile Banner</SelectItem>
                      <SelectItem value="970x250">970x250 Billboard</SelectItem>
                      <SelectItem value="160x600">160x600 Wide Skyscraper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>File URL (Image/Video)</Label>
                <Input placeholder="https://..." value={creativeForm.fileUrl}
                  onChange={(e) => setCreativeForm({ ...creativeForm, fileUrl: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Click URL <span className="text-red-500">*</span></Label>
                <Input placeholder="https://..." value={creativeForm.clickUrl}
                  onChange={(e) => setCreativeForm({ ...creativeForm, clickUrl: e.target.value })} />
              </div>
              {(creativeForm.format === "native" || creativeForm.format === "text") && (
                <>
                  <div className="space-y-2">
                    <Label>Headline</Label>
                    <Input placeholder="Ad headline" value={creativeForm.nativeHeadline}
                      onChange={(e) => setCreativeForm({ ...creativeForm, nativeHeadline: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Ad description" value={creativeForm.nativeDescription}
                      onChange={(e) => setCreativeForm({ ...creativeForm, nativeDescription: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA Text</Label>
                    <Input placeholder="Learn More" value={creativeForm.nativeCta}
                      onChange={(e) => setCreativeForm({ ...creativeForm, nativeCta: e.target.value })} />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateCreativeOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createCreative.mutate({
                  campaignId: parseInt(creativeForm.campaignId),
                  name: creativeForm.name,
                  format: creativeForm.format as any,
                  fileUrl: creativeForm.fileUrl || undefined,
                  clickUrl: creativeForm.clickUrl,
                  dimensions: creativeForm.dimensions || undefined,
                  nativeHeadline: creativeForm.nativeHeadline || undefined,
                  nativeDescription: creativeForm.nativeDescription || undefined,
                  nativeCta: creativeForm.nativeCta || undefined,
                })}
                disabled={createCreative.isPending || !creativeForm.name || !creativeForm.campaignId}
              >
                {createCreative.isPending ? "Creating..." : "Create Creative"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ BLOCKLIST DIALOG ═══ */}
        <Dialog open={isBlocklistOpen} onOpenChange={setIsBlocklistOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Blocklist Rule</DialogTitle>
              <DialogDescription>Block specific domains, keywords, or categories from ad serving</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={blocklistForm.type}
                  onValueChange={(v: any) => setBlocklistForm({ ...blocklistForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domain">Domain</SelectItem>
                    <SelectItem value="keyword">Keyword</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value <span className="text-red-500">*</span></Label>
                <Input
                  placeholder={blocklistForm.type === "domain" ? "example.com" : blocklistForm.type === "keyword" ? "gambling" : "adult"}
                  value={blocklistForm.value}
                  onChange={(e) => setBlocklistForm({ ...blocklistForm, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input placeholder="Why is this blocked?" value={blocklistForm.reason}
                  onChange={(e) => setBlocklistForm({ ...blocklistForm, reason: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBlocklistOpen(false)}>Cancel</Button>
              <Button
                onClick={() => addBlocklist.mutate(blocklistForm)}
                disabled={addBlocklist.isPending || !blocklistForm.value}
              >
                {addBlocklist.isPending ? "Adding..." : "Add to Blocklist"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
