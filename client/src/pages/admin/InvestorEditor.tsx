/**
 * Investor Editor Admin Page
 * Comprehensive 9-tab form matching CompanyEditor pattern
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Save, Upload, X, Globe, Linkedin, Twitter, Plus, Trash2,
  Building2, DollarSign, Target, Users, BarChart3, Shield, Sparkles,
  Loader2, MapPin, Mail, Phone, Award, Briefcase, TrendingUp,
  Facebook, Instagram, Youtube, BookOpen, Handshake, Star, Search,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { EntitySeoTab } from "@/components/admin/EntitySeoTab";

const TABS = [
  { id: "profile", label: "Profile", icon: Building2 },
  { id: "investment", label: "Investment Strategy", icon: DollarSign },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "team", label: "Team & Offices", icon: Users },
  { id: "thesis", label: "Thesis & Philosophy", icon: BookOpen },
  { id: "metrics", label: "Key Metrics", icon: BarChart3 },
  { id: "social", label: "Links & Social", icon: Globe },
  { id: "awards", label: "Awards & Recognition", icon: Award },
  { id: "settings", label: "Settings", icon: Shield },
  { id: "seo", label: "SEO", icon: Search },
];

const INVESTMENT_STAGES = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D+", "Growth", "Late Stage"];

type PortfolioCompany = { name: string; logo?: string; sector?: string; year?: number; status?: string; exitValue?: string };
type NotableExit = { company: string; exitType?: string; exitValue?: string; year?: number };
type TeamMember = { name: string; role: string; image?: string; linkedIn?: string };
type OfficeLocation = { city: string; country?: string; address?: string; isHQ?: boolean };
type AwardItem = { title: string; year?: number; issuer?: string };
type MetricItem = { label: string; value: string };

export default function InvestorEditor() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = Boolean(params.id && params.id !== "new");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // ── Form State ──
  const [form, setForm] = useState({
    name: "", slug: "",
    type: "vc" as "vc" | "angel" | "accelerator" | "corporate_vc" | "family_office" | "other",
    description: "", shortDescription: "", logo: "",
    website: "", linkedIn: "", twitter: "", facebook: "", instagram: "", youtube: "",
    email: "", contactEmail: "", contactPhone: "",
    headquarters: "", location: "",
    foundedYear: "", teamSize: "", aum: "",
    portfolioCount: "", checkSizeMin: "", checkSizeMax: "", checkSizeCurrency: "USD",
    investmentStages: [] as string[],
    mission: "", investmentThesis: "", investmentPhilosophy: "", applicationProcess: "",
    isVerified: false,
  });

  // JSON array fields
  const [portfolioCompanies, setPortfolioCompanies] = useState<PortfolioCompany[]>([]);
  const [notableExits, setNotableExits] = useState<NotableExit[]>([]);
  const [focusRegions, setFocusRegions] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([]);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [keyMetrics, setKeyMetrics] = useState<MetricItem[]>([]);

  const [focusRegionInput, setFocusRegionInput] = useState("");

  // ── Data Loading ──
  const { data: investor, isLoading } = trpc.investors.adminGet.useQuery(
    { id: Number(params.id) },
    { enabled: isEdit && !!params.id && params.id !== "new" }
  );

  useEffect(() => {
    if (investor) {
      const inv = investor as any;
      setForm({
        name: inv.name || "", slug: inv.slug || "",
        type: inv.type || "vc",
        description: inv.description || "", shortDescription: inv.shortDescription || "",
        logo: inv.logo || "",
        website: inv.website || "", linkedIn: inv.linkedIn || "", twitter: inv.twitter || "",
        facebook: inv.facebook || "", instagram: inv.instagram || "", youtube: inv.youtube || "",
        email: inv.email || "", contactEmail: inv.contactEmail || "", contactPhone: inv.contactPhone || "",
        headquarters: inv.headquarters || "", location: inv.location || "",
        foundedYear: inv.foundedYear?.toString() || "", teamSize: inv.teamSize || "",
        aum: inv.aum || "", portfolioCount: inv.portfolioCount?.toString() || "",
        checkSizeMin: inv.checkSizeMin?.toString() || "", checkSizeMax: inv.checkSizeMax?.toString() || "",
        checkSizeCurrency: inv.checkSizeCurrency || "USD",
        investmentStages: Array.isArray(inv.investmentStages) ? inv.investmentStages : [],
        mission: inv.mission || "", investmentThesis: inv.investmentThesis || "",
        investmentPhilosophy: inv.investmentPhilosophy || "", applicationProcess: inv.applicationProcess || "",
        isVerified: !!inv.isVerified,
      });
      if (inv.logo) setLogoPreview(inv.logo);
      if (Array.isArray(inv.portfolioCompanies)) setPortfolioCompanies(inv.portfolioCompanies);
      if (Array.isArray(inv.notableExits)) setNotableExits(inv.notableExits);
      if (Array.isArray(inv.focusRegions)) setFocusRegions(inv.focusRegions);
      if (Array.isArray(inv.teamMembers)) setTeamMembers(inv.teamMembers);
      if (Array.isArray(inv.officeLocations)) setOfficeLocations(inv.officeLocations);
      if (Array.isArray(inv.awards)) setAwards(inv.awards);
      if (Array.isArray(inv.keyMetrics)) setKeyMetrics(inv.keyMetrics);
    }
  }, [investor]);

  // ── Mutations ──
  const transitionMutation = trpc.investors.transition.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      window.location.reload();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createMutation = trpc.investors.create.useMutation({
    onSuccess: () => { toast.success("Investor created"); navigate("/admin/investors"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.investors.update.useMutation({
    onSuccess: () => { toast.success("Investor updated"); navigate("/admin/investors"); },
    onError: (e) => toast.error(e.message),
  });
  const aiSuggestMutation = trpc.admin.ai.suggestInvestorInfo.useMutation({
    onSuccess: (data: any) => {
      if (data) {
        setForm(prev => ({
          ...prev,
          type: data.type || prev.type,
          description: data.description || prev.description,
          shortDescription: data.shortDescription || prev.shortDescription,
          linkedIn: data.linkedIn || prev.linkedIn,
          twitter: data.twitter || prev.twitter,
          location: data.location || prev.location,
          foundedYear: data.foundedYear || prev.foundedYear,
          teamSize: data.teamSize || prev.teamSize,
          aum: data.aum || prev.aum,
          investmentStages: data.investmentStages || prev.investmentStages,
        }));
        toast.success("AI suggestions applied!");
      }
    },
    onError: (e: { message: string }) => toast.error(`AI suggestion failed: ${e.message}`),
  });

  // ── Handlers ──
  const generateSlug = () => {
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    setForm({ ...form, slug });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }
    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formDataUpload });
      if (!response.ok) throw new Error("Upload failed");
      const { url } = await response.json();
      setForm(prev => ({ ...prev, logo: url }));
      setLogoPreview(url);
      toast.success("Logo uploaded");
    } catch { toast.error("Upload failed"); } finally { setIsUploading(false); }
  };

  const handleAISuggest = async () => {
    if (!form.name.trim()) { toast.error("Enter a name first"); return; }
    setIsGeneratingAI(true);
    try { await aiSuggestMutation.mutateAsync({ name: form.name, website: form.website || undefined }); }
    finally { setIsGeneratingAI(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }

    const data: any = {
      name: form.name, slug: form.slug || undefined,
      type: form.type,
      description: form.description || undefined, shortDescription: form.shortDescription || undefined,
      logo: form.logo || undefined,
      website: form.website || undefined, linkedIn: form.linkedIn || undefined,
      twitter: form.twitter || undefined, facebook: form.facebook || undefined,
      instagram: form.instagram || undefined, youtube: form.youtube || undefined,
      email: form.email || undefined, contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      headquarters: form.headquarters || undefined, location: form.location || undefined,
      foundedYear: form.foundedYear ? parseInt(form.foundedYear) : undefined,
      teamSize: form.teamSize || undefined, aum: form.aum || undefined,
      portfolioCount: form.portfolioCount ? parseInt(form.portfolioCount) : undefined,
      checkSizeMin: form.checkSizeMin ? parseFloat(form.checkSizeMin) : undefined,
      checkSizeMax: form.checkSizeMax ? parseFloat(form.checkSizeMax) : undefined,
      checkSizeCurrency: form.checkSizeCurrency || undefined,
      investmentStages: form.investmentStages.length > 0 ? form.investmentStages : undefined,
      mission: form.mission || undefined, investmentThesis: form.investmentThesis || undefined,
      investmentPhilosophy: form.investmentPhilosophy || undefined,
      applicationProcess: form.applicationProcess || undefined,
      portfolioCompanies: portfolioCompanies.length > 0 ? portfolioCompanies : undefined,
      notableExits: notableExits.length > 0 ? notableExits : undefined,
      focusRegions: focusRegions.length > 0 ? focusRegions : undefined,
      teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
      officeLocations: officeLocations.length > 0 ? officeLocations : undefined,
      awards: awards.length > 0 ? awards : undefined,
      keyMetrics: keyMetrics.length > 0 ? keyMetrics : undefined,
    };

    if (isEdit) {
      updateMutation.mutate({ id: Number(params.id), ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Tag helpers
  const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const val = input.trim();
    if (val && !list.includes(val)) setList([...list, val]);
    setInput("");
  };
  const removeTag = (list: string[], setList: (v: string[]) => void, index: number) => setList(list.filter((_, i) => i !== index));

  if (isEdit && isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/investors">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Investor" : "New Investor"}</h1>
              <p className="text-muted-foreground text-sm">{isEdit ? `Editing: ${form.name}` : "Add a new investor to the directory"}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isEdit && (investor as any)?.availableTransitions?.map((t: any) => (
              <Button
                key={t.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => transitionMutation.mutate({ investorId: parseInt(params.id!), transitionId: t.id })}
                disabled={transitionMutation.isPending}
              >
                {t.name}
              </Button>
            ))}
            <Button type="button" variant="outline" onClick={handleAISuggest} disabled={isGeneratingAI || !form.name.trim()}>
              {isGeneratingAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Suggest with AI
            </Button>
            <Button type="submit" className="bg-emerald-500 hover:bg-[#0066FF] text-white" disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-border">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#F0F7FF] dark:bg-emerald-950/30 text-[#0066FF] dark:text-[#80B3FF] border-b-2 border-[#0066FF]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}>
                <Icon className="h-4 w-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══ TAB: PROFILE ═══ */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Basic Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onBlur={() => !form.slug && generateSlug()} placeholder="Sequoia Capital" />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug</Label>
                      <div className="flex gap-2">
                        <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="sequoia-capital" />
                        <Button type="button" variant="outline" onClick={generateSlug}>Generate</Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vc">Venture Capital</SelectItem>
                          <SelectItem value="angel">Angel Investor</SelectItem>
                          <SelectItem value="corporate_vc">Corporate VC</SelectItem>
                          <SelectItem value="family_office">Family Office</SelectItem>
                          <SelectItem value="accelerator">Accelerator</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Founded Year</Label>
                      <Input type="number" value={form.foundedYear} onChange={e => setForm({ ...form, foundedYear: e.target.value })} placeholder="2010" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Headquarters</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={form.headquarters} onChange={e => setForm({ ...form, headquarters: e.target.value })} placeholder="San Francisco, CA" className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Global / MENA / GCC" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Short Description</Label>
                    <Textarea value={form.shortDescription} onChange={e => setForm({ ...form, shortDescription: e.target.value })} placeholder="A brief one-line description..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Description</Label>
                    <RichTextEditor content={form.description} onChange={(c) => setForm({ ...form, description: c })} placeholder="Detailed description of the investor..." />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>General Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@investor.com" className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Email</Label>
                      <Input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} placeholder="deals@investor.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="+1 234 567 8900" className="pl-10" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img src={logoPreview} alt="Logo" className="w-full h-32 object-contain rounded-md border bg-white" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => { setForm({ ...form, logo: "" }); setLogoPreview(null); }}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-[#F7F8FA] transition-colors">
                      <div className="flex flex-col items-center pt-5 pb-6">
                        {isUploading ? <Loader2 className="h-8 w-8 text-[#9BA3B0] animate-spin" /> : <><Upload className="h-8 w-8 text-[#9BA3B0] mb-2" /><p className="text-sm text-[#697386]">Click to upload</p></>}
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                    </label>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Or enter logo URL</Label>
                    <Input value={form.logo} onChange={e => { setForm({ ...form, logo: e.target.value }); if (e.target.value) setLogoPreview(e.target.value); }} placeholder="https://example.com/logo.png" className="text-sm" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ═══ TAB: INVESTMENT STRATEGY ═══ */}
        {activeTab === "investment" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Investment Parameters</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Assets Under Management</Label>
                    <Input value={form.aum} onChange={e => setForm({ ...form, aum: e.target.value })} placeholder="$5B" />
                  </div>
                  <div className="space-y-2">
                    <Label>Team Size</Label>
                    <Input value={form.teamSize} onChange={e => setForm({ ...form, teamSize: e.target.value })} placeholder="50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Portfolio Count</Label>
                    <Input type="number" value={form.portfolioCount} onChange={e => setForm({ ...form, portfolioCount: e.target.value })} placeholder="200" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Min Check Size ($)</Label>
                    <Input type="number" value={form.checkSizeMin} onChange={e => setForm({ ...form, checkSizeMin: e.target.value })} placeholder="100000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Check Size ($)</Label>
                    <Input type="number" value={form.checkSizeMax} onChange={e => setForm({ ...form, checkSizeMax: e.target.value })} placeholder="10000000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={form.checkSizeCurrency} onValueChange={v => setForm({ ...form, checkSizeCurrency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="SAR">SAR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Investment Stages</Label>
                  <div className="flex flex-wrap gap-2">
                    {INVESTMENT_STAGES.map(stage => (
                      <Button key={stage} type="button" size="sm"
                        variant={form.investmentStages.includes(stage) ? "default" : "outline"}
                        onClick={() => setForm(prev => ({
                          ...prev,
                          investmentStages: prev.investmentStages.includes(stage)
                            ? prev.investmentStages.filter(s => s !== stage)
                            : [...prev.investmentStages, stage]
                        }))}>
                        {stage}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Focus Regions</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {focusRegions.map((r, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">{r}<button type="button" onClick={() => removeTag(focusRegions, setFocusRegions, i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={focusRegionInput} onChange={e => setFocusRegionInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(focusRegions, setFocusRegions, focusRegionInput, setFocusRegionInput); } }} placeholder="MENA, GCC, North Africa..." />
                  <Button type="button" variant="outline" onClick={() => addTag(focusRegions, setFocusRegions, focusRegionInput, setFocusRegionInput)}>Add</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Application Process</CardTitle></CardHeader>
              <CardContent>
                <RichTextEditor content={form.applicationProcess} onChange={c => setForm({ ...form, applicationProcess: c })} placeholder="How startups can apply for funding..." />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: PORTFOLIO ═══ */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Portfolio Companies</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPortfolioCompanies([...portfolioCompanies, { name: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Company
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {portfolioCompanies.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No portfolio companies added yet.</p>}
                {portfolioCompanies.map((pc, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setPortfolioCompanies(portfolioCompanies.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Company *</Label>
                        <Input value={pc.name} onChange={e => { const n = [...portfolioCompanies]; n[i] = { ...n[i], name: e.target.value }; setPortfolioCompanies(n); }} placeholder="Company name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sector</Label>
                        <Input value={pc.sector || ""} onChange={e => { const n = [...portfolioCompanies]; n[i] = { ...n[i], sector: e.target.value }; setPortfolioCompanies(n); }} placeholder="Fintech" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Year</Label>
                        <Input type="number" value={pc.year || ""} onChange={e => { const n = [...portfolioCompanies]; n[i] = { ...n[i], year: e.target.value ? parseInt(e.target.value) : undefined }; setPortfolioCompanies(n); }} placeholder="2023" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Input value={pc.status || ""} onChange={e => { const n = [...portfolioCompanies]; n[i] = { ...n[i], status: e.target.value }; setPortfolioCompanies(n); }} placeholder="Active / Exited" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Logo URL</Label>
                      <Input value={pc.logo || ""} onChange={e => { const n = [...portfolioCompanies]; n[i] = { ...n[i], logo: e.target.value }; setPortfolioCompanies(n); }} placeholder="https://..." />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Notable Exits</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setNotableExits([...notableExits, { company: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Exit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {notableExits.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No notable exits recorded.</p>}
                {notableExits.map((exit, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setNotableExits(notableExits.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Company *</Label>
                        <Input value={exit.company} onChange={e => { const n = [...notableExits]; n[i] = { ...n[i], company: e.target.value }; setNotableExits(n); }} placeholder="Company name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Exit Type</Label>
                        <Input value={exit.exitType || ""} onChange={e => { const n = [...notableExits]; n[i] = { ...n[i], exitType: e.target.value }; setNotableExits(n); }} placeholder="IPO / Acquisition" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Exit Value</Label>
                        <Input value={exit.exitValue || ""} onChange={e => { const n = [...notableExits]; n[i] = { ...n[i], exitValue: e.target.value }; setNotableExits(n); }} placeholder="$1B" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Year</Label>
                        <Input type="number" value={exit.year || ""} onChange={e => { const n = [...notableExits]; n[i] = { ...n[i], year: e.target.value ? parseInt(e.target.value) : undefined }; setNotableExits(n); }} placeholder="2023" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: TEAM & OFFICES ═══ */}
        {activeTab === "team" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Team Members</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setTeamMembers([...teamMembers, { name: "", role: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No team members added yet.</p>}
                {teamMembers.map((tm, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setTeamMembers(teamMembers.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name *</Label>
                        <Input value={tm.name} onChange={e => { const n = [...teamMembers]; n[i] = { ...n[i], name: e.target.value }; setTeamMembers(n); }} placeholder="Full name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Role *</Label>
                        <Input value={tm.role} onChange={e => { const n = [...teamMembers]; n[i] = { ...n[i], role: e.target.value }; setTeamMembers(n); }} placeholder="Managing Partner" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">LinkedIn</Label>
                        <Input value={tm.linkedIn || ""} onChange={e => { const n = [...teamMembers]; n[i] = { ...n[i], linkedIn: e.target.value }; setTeamMembers(n); }} placeholder="https://linkedin.com/in/..." />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Photo URL</Label>
                      <Input value={tm.image || ""} onChange={e => { const n = [...teamMembers]; n[i] = { ...n[i], image: e.target.value }; setTeamMembers(n); }} placeholder="https://..." />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Office Locations</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setOfficeLocations([...officeLocations, { city: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Office
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {officeLocations.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No offices listed.</p>}
                {officeLocations.map((ol, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setOfficeLocations(officeLocations.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">City *</Label>
                        <Input value={ol.city} onChange={e => { const n = [...officeLocations]; n[i] = { ...n[i], city: e.target.value }; setOfficeLocations(n); }} placeholder="Dubai" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Country</Label>
                        <Input value={ol.country || ""} onChange={e => { const n = [...officeLocations]; n[i] = { ...n[i], country: e.target.value }; setOfficeLocations(n); }} placeholder="UAE" />
                      </div>
                      <div className="flex items-end gap-2 pb-1">
                        <Switch checked={ol.isHQ || false} onCheckedChange={c => { const n = [...officeLocations]; n[i] = { ...n[i], isHQ: c }; setOfficeLocations(n); }} />
                        <Label className="text-xs">Headquarters</Label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Address</Label>
                      <Input value={ol.address || ""} onChange={e => { const n = [...officeLocations]; n[i] = { ...n[i], address: e.target.value }; setOfficeLocations(n); }} placeholder="Full address" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: THESIS & PHILOSOPHY ═══ */}
        {activeTab === "thesis" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Mission</CardTitle></CardHeader>
              <CardContent>
                <RichTextEditor content={form.mission} onChange={c => setForm({ ...form, mission: c })} placeholder="The investor's mission statement..." />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Investment Thesis</CardTitle></CardHeader>
              <CardContent>
                <RichTextEditor content={form.investmentThesis} onChange={c => setForm({ ...form, investmentThesis: c })} placeholder="What they look for in investments..." />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Investment Philosophy</CardTitle></CardHeader>
              <CardContent>
                <RichTextEditor content={form.investmentPhilosophy} onChange={c => setForm({ ...form, investmentPhilosophy: c })} placeholder="How they approach investing..." />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: KEY METRICS ═══ */}
        {activeTab === "metrics" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Key Metrics</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => setKeyMetrics([...keyMetrics, { label: "", value: "" }])}>
                  <Plus className="h-4 w-4 mr-1" />Add Metric
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Custom key-value metrics displayed on the profile (e.g., "Total Deployed" → "$2.5B")</p>
              {keyMetrics.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No metrics added yet.</p>}
              {keyMetrics.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Input value={m.label} onChange={e => { const n = [...keyMetrics]; n[i] = { ...n[i], label: e.target.value }; setKeyMetrics(n); }} placeholder="Metric label" className="flex-1" />
                  <Input value={m.value} onChange={e => { const n = [...keyMetrics]; n[i] = { ...n[i], value: e.target.value }; setKeyMetrics(n); }} placeholder="Value" className="flex-1" />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setKeyMetrics(keyMetrics.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ═══ TAB: LINKS & SOCIAL ═══ */}
        {activeTab === "social" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Professional Links</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="h-4 w-4" />Website</Label>
                  <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://sequoiacap.com" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Linkedin className="h-4 w-4" />LinkedIn</Label>
                  <Input value={form.linkedIn} onChange={e => setForm({ ...form, linkedIn: e.target.value })} placeholder="https://linkedin.com/company/..." />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Social Media</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Twitter className="h-4 w-4" />Twitter / X</Label>
                  <Input value={form.twitter} onChange={e => setForm({ ...form, twitter: e.target.value })} placeholder="https://twitter.com/..." />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Facebook className="h-4 w-4" />Facebook</Label>
                  <Input value={form.facebook} onChange={e => setForm({ ...form, facebook: e.target.value })} placeholder="https://facebook.com/..." />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" />Instagram</Label>
                  <Input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="https://instagram.com/..." />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Youtube className="h-4 w-4" />YouTube</Label>
                  <Input value={form.youtube} onChange={e => setForm({ ...form, youtube: e.target.value })} placeholder="https://youtube.com/@..." />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: AWARDS ═══ */}
        {activeTab === "awards" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Awards & Recognition</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => setAwards([...awards, { title: "" }])}>
                  <Plus className="h-4 w-4 mr-1" />Add Award
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {awards.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No awards recorded.</p>}
              {awards.map((aw, i) => (
                <div key={i} className="p-4 border rounded-md space-y-3 relative">
                  <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setAwards(awards.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Title *</Label>
                      <Input value={aw.title} onChange={e => { const n = [...awards]; n[i] = { ...n[i], title: e.target.value }; setAwards(n); }} placeholder="Best VC Fund" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Year</Label>
                      <Input type="number" value={aw.year || ""} onChange={e => { const n = [...awards]; n[i] = { ...n[i], year: e.target.value ? parseInt(e.target.value) : undefined }; setAwards(n); }} placeholder="2023" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Issuer</Label>
                      <Input value={aw.issuer || ""} onChange={e => { const n = [...awards]; n[i] = { ...n[i], issuer: e.target.value }; setAwards(n); }} placeholder="Forbes" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ═══ TAB: SETTINGS ═══ */}
        {activeTab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Profile Settings</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Verified Profile</Label>
                    <p className="text-sm text-muted-foreground">Mark this investor as verified</p>
                  </div>
                  <Switch checked={form.isVerified} onCheckedChange={c => setForm({ ...form, isVerified: c })} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* ═══ TAB: SEO ═══ */}
        {activeTab === "seo" && (
          <div className="max-w-3xl">
            <EntitySeoTab
              entityType="investors"
              entityId={isEdit ? parseInt(params.id) : null}
              entityName={form.name || "Investor"}
              entityDescription={form.shortDescription || form.description?.slice(0, 200) || undefined}
              entityUrl={`/investors/${form.slug}`}
            />
          </div>
        )}
      </form>
    </AdminLayout>
  );
}
