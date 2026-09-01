/**
 * Company Editor Admin Page
 * Comprehensive tabbed form with all company fields
 * SAP Fiori-inspired layout with enterprise-style sections
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Save, Building2, Upload, X, Globe, Linkedin, Twitter,
  Plus, Trash2, GripVertical, Award, Package, MessageSquare,
  Target, Lightbulb, Users, BarChart3, FileText, Phone,
  Instagram, Youtube, Facebook, Mail, Milestone, Shield, Sparkles, Search,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { EntitySeoTab } from "@/components/admin/EntitySeoTab";
import { CompanyFundingTab } from "@/components/admin/CompanyFundingTab";

const STAGES = [
  { value: "pre_seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "series_d_plus", label: "Series D+" },
  { value: "public", label: "Public" },
  { value: "acquired", label: "Acquired" },
];

const INDUSTRIES = [
  "Fintech", "E-commerce", "SaaS", "Logistics", "Healthcare", "EdTech",
  "FoodTech", "Mobility", "Entertainment", "PropTech", "CleanTech",
  "AgriTech", "InsurTech", "AI/ML", "Cybersecurity", "IoT", "Other",
];

const EMPLOYEE_COUNTS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"];

const TABS = [
  { id: "identity", label: "Company Identity", icon: Building2 },
  { id: "story", label: "Company Story", icon: Lightbulb },
  { id: "metrics", label: "Key Metrics", icon: BarChart3 },
  { id: "team", label: "Leadership & Team", icon: Users },
  { id: "funding", label: "Funding History", icon: BarChart3 },
  { id: "products", label: "Products & Services", icon: Package },
  { id: "milestones", label: "Timeline & Awards", icon: Milestone },
  { id: "social", label: "Links & Social", icon: Globe },
  { id: "press", label: "Press & Resources", icon: FileText },
  { id: "settings", label: "Settings", icon: Shield },
  { id: "seo", label: "SEO", icon: Search },
];

type KeyPerson = { name: string; role: string; linkedIn?: string; category?: string; personId?: number; avatarUrl?: string };

// Searchable People Picker component
function PeopleSearchPicker({ value, onChange, onCreateNew }: {
  value: KeyPerson;
  onChange: (updates: Partial<KeyPerson>) => void;
  onCreateNew: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value.name || "");
  const { data: results } = trpc.people.list.useQuery(
    { search: query, limit: 10 },
    { enabled: query.length >= 2 }
  );
  const people = (results as any)?.items || [];
  return (
    <div className="relative">
      <Input
        value={inputValue}
        onChange={e => { setInputValue(e.target.value); setQuery(e.target.value); onChange({ name: e.target.value, personId: undefined }); setOpen(true); }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search or type name..."
      />
      {open && query.length >= 2 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {people.map((p: any) => (
            <button key={p.id} type="button" className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-sm"
              onMouseDown={() => { onChange({ name: p.name, personId: p.id, avatarUrl: p.profileImage || undefined, linkedIn: p.linkedIn || undefined }); setInputValue(p.name); setOpen(false); }}>
              {p.profileImage ? <img src={p.profileImage} className="w-6 h-6 rounded-full object-cover" alt="" /> : <div className="w-6 h-6 rounded-full bg-[#EBF3FF] flex items-center justify-center text-xs font-bold text-[#0066FF]">{p.name.charAt(0)}</div>}
              <div><div className="font-medium">{p.name}</div>{p.title && <div className="text-xs text-muted-foreground">{p.title}</div>}</div>
            </button>
          ))}
          {people.length === 0 && (
            <button type="button" className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-sm text-[#0066FF] font-medium"
              onMouseDown={() => { onCreateNew(query); setOpen(false); }}>
              <Plus className="h-4 w-4" /> Create "{query}" as new person
            </button>
          )}
        </div>
      )}
    </div>
  );
}
type TimelineItem = { year: number; title: string; description?: string };
type Customer = { name: string; logo?: string };
type Partnership = { name: string; logo?: string; description?: string };
type Certification = { name: string; year?: number; issuer?: string };
type Whitepaper = { title: string; url: string; description?: string };
type CaseStudy = { title: string; url: string; description?: string; client?: string };

export default function CompanyEditor() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = Boolean(params.id && params.id !== "new");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("identity");

  // ── Form State ──
  const [form, setForm] = useState({
    name: "", slug: "", tagline: "", description: "", logo: "",
    website: "", linkedIn: "", twitter: "", facebook: "", instagram: "", youtube: "",
    email: "", phone: "",
    location: "", industry: "",
    stage: "" as string,
    foundedYear: "", employeeCount: "", totalFunding: "",
    isVerified: false, isFeatured: false,
    // Story
    shortDescription: "", mission: "", vision: "", problemSolved: "", marketServed: "",
    // Branding
    coverImage: "", brandColor: "",
    // Metrics
    activeUsersRange: "", arrRange: "", countriesServed: "", clientsCount: "",
    // Press
    mediaKit: "", logoPack: "", boilerplate: "", prContactEmail: "",
    appStoreLink: "", playStoreLink: "", pitchDeck: "",
    hiringActively: false,
  });

  // JSON array fields
  const [keyPeople, setKeyPeople] = useState<KeyPerson[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [notableCustomers, setNotableCustomers] = useState<Customer[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [whitepapers, setWhitepapers] = useState<Whitepaper[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [techStackInput, setTechStackInput] = useState("");

  // Products, Awards, Updates (separate CRUD)
  const [products, setProducts] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);

  // ── Data Loading ──
  const { data: company, isLoading } = trpc.companies.adminGet.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: isEdit && !!params.id && params.id !== "new" }
  );

  const { data: statuses } = trpc.admin.workflow.getStatuses.useQuery();

  const { data: existingProducts } = trpc.companies.listProducts.useQuery(
    { companyId: parseInt(params.id || "0") },
    { enabled: isEdit && !!params.id && params.id !== "new" }
  );
  const { data: existingAwards } = trpc.companies.listAwards.useQuery(
    { companyId: parseInt(params.id || "0") },
    { enabled: isEdit && !!params.id && params.id !== "new" }
  );
  const { data: existingUpdates } = trpc.companies.listUpdates.useQuery(
    { companyId: parseInt(params.id || "0") },
    { enabled: isEdit && !!params.id && params.id !== "new" }
  );

  useEffect(() => {
    if (existingProducts) setProducts(existingProducts);
  }, [existingProducts]);
  useEffect(() => {
    if (existingAwards) setAwards(existingAwards);
  }, [existingAwards]);
  useEffect(() => {
    if (existingUpdates) setUpdates(existingUpdates);
  }, [existingUpdates]);

  useEffect(() => {
    if (company) {
      const c = company as any;
      setForm({
        name: c.name || "", slug: c.slug || "", tagline: c.tagline || "",
        description: c.description || "", logo: c.logo || "",
        website: c.website || "", linkedIn: c.linkedIn || "", twitter: c.twitter || "",
        facebook: c.facebook || "", instagram: c.instagram || "", youtube: c.youtube || "",
        email: c.email || "", phone: c.phone || "",
        location: c.location || "", industry: c.industry || "",
        stage: c.stage || "",
        foundedYear: c.foundedYear?.toString() || "", employeeCount: c.employeeCount || "",
        totalFunding: c.totalFunding || "",
        isVerified: !!c.isVerified, isFeatured: !!c.isFeatured,
        shortDescription: c.shortDescription || "", mission: c.mission || "",
        vision: c.vision || "", problemSolved: c.problemSolved || "",
        marketServed: c.marketServed || "",
        coverImage: c.coverImage || "", brandColor: c.brandColor || "",
        activeUsersRange: c.activeUsersRange || "", arrRange: c.arrRange || "",
        countriesServed: c.countriesServed?.toString() || "",
        clientsCount: c.clientsCount?.toString() || "",
        mediaKit: c.mediaKit || "", logoPack: c.logoPack || "",
        boilerplate: c.boilerplate || "", prContactEmail: c.prContactEmail || "",
        appStoreLink: c.appStoreLink || "", playStoreLink: c.playStoreLink || "",
        pitchDeck: c.pitchDeck || "",
        hiringActively: !!c.hiringActively,
      });
      if (c.logo) setLogoPreview(c.logo);
      if (c.keyPeople && Array.isArray(c.keyPeople)) setKeyPeople(c.keyPeople);
      if (c.techStack && Array.isArray(c.techStack)) setTechStack(c.techStack);
      if (c.timeline && Array.isArray(c.timeline)) setTimeline(c.timeline);
      if (c.notableCustomers && Array.isArray(c.notableCustomers)) setNotableCustomers(c.notableCustomers);
      if (c.partnerships && Array.isArray(c.partnerships)) setPartnerships(c.partnerships);
      if (c.certifications && Array.isArray(c.certifications)) setCertifications(c.certifications);
      if (c.whitepapers && Array.isArray(c.whitepapers)) setWhitepapers(c.whitepapers);
      if (c.caseStudies && Array.isArray(c.caseStudies)) setCaseStudies(c.caseStudies);
    }
  }, [company]);

  // ── Mutations ──
  const transitionMutation = trpc.companies.transition.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      window.location.reload();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => { toast.success("Company created"); navigate("/admin/companies"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => { toast.success("Company updated"); navigate("/admin/companies"); },
    onError: (e) => toast.error(e.message),
  });
  const upsertProductMut = trpc.companies.upsertProduct.useMutation();
  const deleteProductMut = trpc.companies.deleteProduct.useMutation();
  const upsertAwardMut = trpc.companies.upsertAward.useMutation();
  const deleteAwardMut = trpc.companies.deleteAward.useMutation();
  const upsertUpdateMut = trpc.companies.upsertUpdate.useMutation();
  const deleteUpdateMut = trpc.companies.deleteUpdate.useMutation();

  // ── Handlers ──
  const generateSlug = () => {
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    setForm({ ...form, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    if (!form.slug.trim()) { toast.error("Slug is required"); return; }

    const publishedStatus = statuses?.find((s: { slug: string }) => s.slug === "published");
    const draftStatus = statuses?.find((s: { slug: string }) => s.slug === "draft");
    const statusId = publishedStatus?.id || draftStatus?.id || 1;

    const data: any = {
      name: form.name, slug: form.slug,
      tagline: form.tagline || undefined, description: form.description || undefined,
      logo: form.logo || undefined, website: form.website || undefined,
      linkedIn: form.linkedIn || undefined, twitter: form.twitter || undefined,
      facebook: form.facebook || undefined, instagram: form.instagram || undefined,
      youtube: form.youtube || undefined, email: form.email || undefined,
      phone: form.phone || undefined, location: form.location || undefined,
      industry: form.industry || undefined, stage: form.stage || undefined,
      foundedYear: form.foundedYear ? parseInt(form.foundedYear) : undefined,
      employeeCount: form.employeeCount || undefined,
      totalFunding: form.totalFunding || undefined,
      isVerified: form.isVerified, isFeatured: form.isFeatured,
      shortDescription: form.shortDescription || undefined,
      mission: form.mission || undefined, vision: form.vision || undefined,
      problemSolved: form.problemSolved || undefined,
      marketServed: form.marketServed || undefined,
      coverImage: form.coverImage || undefined, brandColor: form.brandColor || undefined,
      activeUsersRange: form.activeUsersRange || undefined,
      arrRange: form.arrRange || undefined,
      countriesServed: form.countriesServed ? parseInt(form.countriesServed) : undefined,
      clientsCount: form.clientsCount ? parseInt(form.clientsCount) : undefined,
      notableCustomers: notableCustomers.length > 0 ? notableCustomers : undefined,
      partnerships: partnerships.length > 0 ? partnerships : undefined,
      mediaKit: form.mediaKit || undefined, logoPack: form.logoPack || undefined,
      boilerplate: form.boilerplate || undefined,
      prContactEmail: form.prContactEmail || undefined,
      appStoreLink: form.appStoreLink || undefined,
      playStoreLink: form.playStoreLink || undefined,
      techStack: techStack.length > 0 ? techStack : undefined,
      keyPeople: keyPeople.length > 0 ? keyPeople : undefined,
      timeline: timeline.length > 0 ? timeline : undefined,
      certifications: certifications.length > 0 ? certifications : undefined,
      pitchDeck: form.pitchDeck || undefined,
      whitepapers: whitepapers.length > 0 ? whitepapers : undefined,
      caseStudies: caseStudies.length > 0 ? caseStudies : undefined,
      hiringActively: form.hiringActively,
      statusId,
    };

    if (isEdit && company) {
      updateMutation.mutate({ id: company.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setIsUploading(true);
    try {
      // Show local preview while uploading
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
      // Upload to S3
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      setForm(f => ({ ...f, logo: url }));
      setLogoPreview(url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error("Upload failed: " + String(err));
    } finally { setIsUploading(false); }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setIsUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      setForm(f => ({ ...f, coverImage: url }));
      toast.success("Cover image uploaded");
    } catch (err) {
      toast.error("Upload failed: " + String(err));
    } finally { setIsUploading(false); }
  };

  // ── Render ──
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
            <Link href="/admin/companies">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Company" : "New Company"}</h1>
              <p className="text-muted-foreground text-sm">{isEdit ? "Update company profile" : "Add a new company"}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isEdit && (company as any)?.availableTransitions?.map((t: any) => (
              <Button
                key={t.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => transitionMutation.mutate({ id: parseInt(params.id!), transitionId: t.id })}
                disabled={transitionMutation.isPending}
              >
                {t.name}
              </Button>
            ))}
            <Button type="submit" className="bg-emerald-500 hover:bg-[#0066FF] text-white" disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#F0F7FF] dark:bg-emerald-950/30 text-[#0066FF] dark:text-[#80B3FF] border-b-2 border-[#0066FF]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ═══ TAB: COMPANY IDENTITY ═══ */}
        {activeTab === "identity" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Basic Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name *</Label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onBlur={() => !form.slug && generateSlug()} placeholder="Acme Contracting" />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug *</Label>
                      <div className="flex gap-2">
                        <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="acme-contracting" />
                        <Button type="button" variant="outline" onClick={generateSlug}>Generate</Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="The Everything App for the Middle East" />
                  </div>
                  <div className="space-y-2">
                    <Label>Short Description</Label>
                    <Textarea value={form.shortDescription} onChange={e => setForm({ ...form, shortDescription: e.target.value })} placeholder="Brief 1-2 sentence description..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Description</Label>
                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detailed description..." rows={6} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Company Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select value={form.industry} onValueChange={v => setForm({ ...form, industry: v })}>
                        <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                        <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Funding Stage</Label>
                      <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                        <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                        <SelectContent>{STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Dubai, UAE" />
                    </div>
                    <div className="space-y-2">
                      <Label>Founded Year</Label>
                      <Input type="number" value={form.foundedYear} onChange={e => setForm({ ...form, foundedYear: e.target.value })} placeholder="2020" />
                    </div>
                    <div className="space-y-2">
                      <Label>Employee Count</Label>
                      <Select value={form.employeeCount} onValueChange={v => setForm({ ...form, employeeCount: v })}>
                        <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                        <SelectContent>{EMPLOYEE_COUNTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Funding</Label>
                    <Input value={form.totalFunding} onChange={e => setForm({ ...form, totalFunding: e.target.value })} placeholder="$5M" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Company Logo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img src={logoPreview} alt="Logo" className="w-32 h-32 object-contain rounded-md border bg-white p-2" />
                        <button type="button" onClick={() => { setForm({ ...form, logo: "" }); setLogoPreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed rounded-md flex items-center justify-center bg-muted/30"><Building2 className="h-12 w-12 text-muted-foreground" /></div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
                      <Upload className="h-4 w-4 mr-2" />{isUploading ? "Uploading..." : "Upload Logo"}
                    </Button>
                    <div className="space-y-2 w-full">
                      <Label className="text-xs">Or paste URL</Label>
                      <Input value={form.logo} onChange={e => { setForm({ ...form, logo: e.target.value }); setLogoPreview(e.target.value); }} placeholder="https://..." className="text-xs" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Cover Image</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {form.coverImage && <img src={form.coverImage} alt="Cover" className="w-full h-24 object-cover rounded-md" />}
                  <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => coverInputRef.current?.click()} disabled={isUploading}>
                    <Upload className="h-4 w-4 mr-2" />{isUploading ? "Uploading…" : "Upload Cover Image"}
                  </Button>
                  <Input value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} placeholder="Or paste cover image URL" className="text-xs" />
                  <div className="space-y-2">
                    <Label className="text-xs">Brand Color</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.brandColor || "#3B82F6"} onChange={e => setForm({ ...form, brandColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                      <Input value={form.brandColor} onChange={e => setForm({ ...form, brandColor: e.target.value })} placeholder="#3B82F6" className="text-xs" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isEdit && company && (
                <Card>
                  <CardHeader><CardTitle>Statistics</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Views</span><span className="font-medium">{(company as any).viewCount?.toLocaleString() || 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-medium">{company.createdAt ? new Date(company.createdAt).toLocaleDateString() : "N/A"}</span></div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: COMPANY STORY ═══ */}
        {activeTab === "story" && (
          <div className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />Mission & Vision</CardTitle>
                <CardDescription>The company's purpose and aspirations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Mission Statement</Label>
                  <Textarea value={form.mission} onChange={e => setForm({ ...form, mission: e.target.value })} placeholder="What the company does and why it exists..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Vision Statement</Label>
                  <Textarea value={form.vision} onChange={e => setForm({ ...form, vision: e.target.value })} placeholder="Where the company is heading..." rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Problem & Market</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Problem Solved</Label>
                  <Textarea value={form.problemSolved} onChange={e => setForm({ ...form, problemSolved: e.target.value })} placeholder="What problem does this company solve?" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Market Served</Label>
                  <Textarea value={form.marketServed} onChange={e => setForm({ ...form, marketServed: e.target.value })} placeholder="Target market and customer segments..." rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tech Stack</CardTitle>
                <CardDescription>Technologies and frameworks used</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {techStack.map((t, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {t}
                      <button type="button" onClick={() => setTechStack(techStack.filter((_, j) => j !== i))} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={techStackInput} onChange={e => setTechStackInput(e.target.value)} placeholder="Add technology..." onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (techStackInput.trim()) { setTechStack([...techStack, techStackInput.trim()]); setTechStackInput(""); } } }} />
                  <Button type="button" variant="outline" onClick={() => { if (techStackInput.trim()) { setTechStack([...techStack, techStackInput.trim()]); setTechStackInput(""); } }}><Plus className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: KEY METRICS ═══ */}
        {activeTab === "metrics" && (
          <div className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Growth Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Active Users Range</Label>
                    <Input value={form.activeUsersRange} onChange={e => setForm({ ...form, activeUsersRange: e.target.value })} placeholder="e.g. 100K-500K" />
                  </div>
                  <div className="space-y-2">
                    <Label>ARR Range</Label>
                    <Input value={form.arrRange} onChange={e => setForm({ ...form, arrRange: e.target.value })} placeholder="e.g. $1M-$5M" />
                  </div>
                  <div className="space-y-2">
                    <Label>Countries Served</Label>
                    <Input type="number" value={form.countriesServed} onChange={e => setForm({ ...form, countriesServed: e.target.value })} placeholder="e.g. 15" />
                  </div>
                  <div className="space-y-2">
                    <Label>Clients Count</Label>
                    <Input type="number" value={form.clientsCount} onChange={e => setForm({ ...form, clientsCount: e.target.value })} placeholder="e.g. 500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notable Customers</CardTitle>
                <CardDescription>Key clients and logos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {notableCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={c.name} onChange={e => { const n = [...notableCustomers]; n[i] = { ...n[i], name: e.target.value }; setNotableCustomers(n); }} placeholder="Customer name" className="flex-1" />
                    <Input value={c.logo || ""} onChange={e => { const n = [...notableCustomers]; n[i] = { ...n[i], logo: e.target.value }; setNotableCustomers(n); }} placeholder="Logo URL (optional)" className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setNotableCustomers(notableCustomers.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setNotableCustomers([...notableCustomers, { name: "" }])}><Plus className="h-4 w-4 mr-1" />Add Customer</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Partnerships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {partnerships.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Input value={p.name} onChange={e => { const n = [...partnerships]; n[i] = { ...n[i], name: e.target.value }; setPartnerships(n); }} placeholder="Partner name" className="flex-1" />
                    <Input value={p.description || ""} onChange={e => { const n = [...partnerships]; n[i] = { ...n[i], description: e.target.value }; setPartnerships(n); }} placeholder="Description" className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPartnerships(partnerships.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setPartnerships([...partnerships, { name: "" }])}><Plus className="h-4 w-4 mr-1" />Add Partnership</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: LEADERSHIP & TEAM ═══ */}
        {activeTab === "team" && (
          <div className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Key People</CardTitle>
                <CardDescription>Search existing people or create new ones. Linked people will show on the company profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {keyPeople.map((p, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 rounded-md bg-muted/30 border border-border">
                    <div className="flex items-center gap-2">
                      {p.avatarUrl ? <img src={p.avatarUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" /> : <div className="w-8 h-8 rounded-full bg-[#EBF3FF] flex items-center justify-center text-xs font-bold text-[#0066FF] flex-shrink-0">{p.name?.charAt(0) || "?"}</div>}
                      <PeopleSearchPicker
                        value={p}
                        onChange={updates => { const n = [...keyPeople]; n[i] = { ...n[i], ...updates }; setKeyPeople(n); }}
                        onCreateNew={name => { window.open(`/admin/people/new?prefill=${encodeURIComponent(name)}`, "_blank"); }}
                      />
                    </div>
                    <Input value={p.role} onChange={e => { const n = [...keyPeople]; n[i] = { ...n[i], role: e.target.value }; setKeyPeople(n); }} placeholder="Role/Title" />
                    <Select value={p.category || "leadership"} onValueChange={v => { const n = [...keyPeople]; n[i] = { ...n[i], category: v }; setKeyPeople(n); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="founder">Founder</SelectItem>
                        <SelectItem value="leadership">Leadership</SelectItem>
                        <SelectItem value="advisor">Advisor</SelectItem>
                        <SelectItem value="board">Board Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input value={p.linkedIn || ""} onChange={e => { const n = [...keyPeople]; n[i] = { ...n[i], linkedIn: e.target.value }; setKeyPeople(n); }} placeholder="LinkedIn URL" className="flex-1" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setKeyPeople(keyPeople.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setKeyPeople([...keyPeople, { name: "", role: "", category: "leadership" }])}><Plus className="h-4 w-4 mr-1" />Add Person</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: PRODUCTS & SERVICES ═══ */}
        {activeTab === "products" && (
          <div className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Products</CardTitle>
                <CardDescription>Products and services offered by this company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {products.map((p, i) => (
                  <div key={p.id || `new-${i}`} className="p-4 rounded-md bg-muted/30 border border-border space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input value={p.name || ""} onChange={e => { const n = [...products]; n[i] = { ...n[i], name: e.target.value }; setProducts(n); }} placeholder="Product name" />
                      <Input value={p.category || ""} onChange={e => { const n = [...products]; n[i] = { ...n[i], category: e.target.value }; setProducts(n); }} placeholder="Category" />
                    </div>
                    <Textarea value={p.description || ""} onChange={e => { const n = [...products]; n[i] = { ...n[i], description: e.target.value }; setProducts(n); }} placeholder="Product description..." rows={2} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input value={p.pricingModel || ""} onChange={e => { const n = [...products]; n[i] = { ...n[i], pricingModel: e.target.value }; setProducts(n); }} placeholder="Pricing model (e.g. Freemium, SaaS)" />
                      <Input value={p.demoVideo || ""} onChange={e => { const n = [...products]; n[i] = { ...n[i], demoVideo: e.target.value }; setProducts(n); }} placeholder="Demo video URL" />
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={async () => {
                        if (p.id) { await deleteProductMut.mutateAsync({ id: p.id }); }
                        setProducts(products.filter((_, j) => j !== i));
                        toast.success("Product removed");
                      }}><Trash2 className="h-4 w-4 mr-1" />Remove</Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setProducts([...products, { name: "", category: "", description: "", companyId: company?.id || 0 }])}><Plus className="h-4 w-4 mr-1" />Add Product</Button>
                {isEdit && products.some(p => !p.id || p._dirty) && (
                  <Button type="button" variant="default" size="sm" className="ml-2" onClick={async () => {
                    for (const p of products) {
                      if (!p.name) continue;
                      await upsertProductMut.mutateAsync({ ...p, companyId: company?.id || 0 });
                    }
                    toast.success("Products saved");
                  }}>Save Products</Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: TIMELINE & AWARDS ═══ */}
        {activeTab === "milestones" && (
          <div className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Milestone className="h-5 w-5" />Company Timeline</CardTitle>
                <CardDescription>Key milestones and events in company history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Input type="number" value={t.year} onChange={e => { const n = [...timeline]; n[i] = { ...n[i], year: parseInt(e.target.value) || 0 }; setTimeline(n); }} placeholder="Year" className="w-24" />
                    <Input value={t.title} onChange={e => { const n = [...timeline]; n[i] = { ...n[i], title: e.target.value }; setTimeline(n); }} placeholder="Milestone title" className="flex-1" />
                    <Input value={t.description || ""} onChange={e => { const n = [...timeline]; n[i] = { ...n[i], description: e.target.value }; setTimeline(n); }} placeholder="Description (optional)" className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setTimeline(timeline.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setTimeline([...timeline, { year: new Date().getFullYear(), title: "" }])}><Plus className="h-4 w-4 mr-1" />Add Milestone</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Awards & Recognition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {awards.map((a, i) => (
                  <div key={a.id || `new-${i}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 rounded-md bg-muted/30 border border-border">
                    <Input value={a.title || ""} onChange={e => { const n = [...awards]; n[i] = { ...n[i], title: e.target.value }; setAwards(n); }} placeholder="Award title" />
                    <Input type="number" value={a.year || ""} onChange={e => { const n = [...awards]; n[i] = { ...n[i], year: parseInt(e.target.value) || undefined }; setAwards(n); }} placeholder="Year" />
                    <Input value={a.organization || ""} onChange={e => { const n = [...awards]; n[i] = { ...n[i], organization: e.target.value }; setAwards(n); }} placeholder="Organization" />
                    <div className="flex gap-2">
                      <Input value={a.description || ""} onChange={e => { const n = [...awards]; n[i] = { ...n[i], description: e.target.value }; setAwards(n); }} placeholder="Description" className="flex-1" />
                      <Button type="button" variant="ghost" size="icon" onClick={async () => {
                        if (a.id) await deleteAwardMut.mutateAsync({ id: a.id });
                        setAwards(awards.filter((_, j) => j !== i));
                      }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setAwards([...awards, { title: "", companyId: company?.id || 0 }])}><Plus className="h-4 w-4 mr-1" />Add Award</Button>
                {isEdit && (
                  <Button type="button" variant="default" size="sm" className="ml-2" onClick={async () => {
                    for (const a of awards) {
                      if (!a.title) continue;
                      await upsertAwardMut.mutateAsync({ ...a, companyId: company?.id || 0 });
                    }
                    toast.success("Awards saved");
                  }}>Save Awards</Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {certifications.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={c.name} onChange={e => { const n = [...certifications]; n[i] = { ...n[i], name: e.target.value }; setCertifications(n); }} placeholder="Certification name" className="flex-1" />
                    <Input type="number" value={c.year || ""} onChange={e => { const n = [...certifications]; n[i] = { ...n[i], year: parseInt(e.target.value) || undefined }; setCertifications(n); }} placeholder="Year" className="w-24" />
                    <Input value={c.issuer || ""} onChange={e => { const n = [...certifications]; n[i] = { ...n[i], issuer: e.target.value }; setCertifications(n); }} placeholder="Issuer" className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setCertifications(certifications.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setCertifications([...certifications, { name: "" }])}><Plus className="h-4 w-4 mr-1" />Add Certification</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: LINKS & SOCIAL ═══ */}
        {activeTab === "social" && (
          <div className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Web & Social Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Website</Label>
                    <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email</Label>
                    <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Phone</Label>
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+971 4 123 4567" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5" />LinkedIn</Label>
                    <Input value={form.linkedIn} onChange={e => setForm({ ...form, linkedIn: e.target.value })} placeholder="https://linkedin.com/company/..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Twitter className="h-3.5 w-3.5" />Twitter / X</Label>
                    <Input value={form.twitter} onChange={e => setForm({ ...form, twitter: e.target.value })} placeholder="https://x.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Facebook className="h-3.5 w-3.5" />Facebook</Label>
                    <Input value={form.facebook} onChange={e => setForm({ ...form, facebook: e.target.value })} placeholder="https://facebook.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" />Instagram</Label>
                    <Input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="https://instagram.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Youtube className="h-3.5 w-3.5" />YouTube</Label>
                    <Input value={form.youtube} onChange={e => setForm({ ...form, youtube: e.target.value })} placeholder="https://youtube.com/@..." />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>App Store Links</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Apple App Store</Label>
                    <Input value={form.appStoreLink} onChange={e => setForm({ ...form, appStoreLink: e.target.value })} placeholder="https://apps.apple.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Google Play Store</Label>
                    <Input value={form.playStoreLink} onChange={e => setForm({ ...form, playStoreLink: e.target.value })} placeholder="https://play.google.com/store/apps/..." />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: PRESS & RESOURCES ═══ */}
        {activeTab === "press" && (
          <div className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Press & PR</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Boilerplate</Label>
                  <Textarea value={form.boilerplate} onChange={e => setForm({ ...form, boilerplate: e.target.value })} placeholder="Standard company description for press releases..." rows={4} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>PR Contact Email</Label>
                    <Input value={form.prContactEmail} onChange={e => setForm({ ...form, prContactEmail: e.target.value })} placeholder="pr@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Media Kit URL</Label>
                    <Input value={form.mediaKit} onChange={e => setForm({ ...form, mediaKit: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo Pack URL</Label>
                    <Input value={form.logoPack} onChange={e => setForm({ ...form, logoPack: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Pitch Deck URL</Label>
                    <Input value={form.pitchDeck} onChange={e => setForm({ ...form, pitchDeck: e.target.value })} placeholder="https://..." />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Whitepapers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {whitepapers.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={w.title} onChange={e => { const n = [...whitepapers]; n[i] = { ...n[i], title: e.target.value }; setWhitepapers(n); }} placeholder="Title" className="flex-1" />
                    <Input value={w.url} onChange={e => { const n = [...whitepapers]; n[i] = { ...n[i], url: e.target.value }; setWhitepapers(n); }} placeholder="URL" className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setWhitepapers(whitepapers.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setWhitepapers([...whitepapers, { title: "", url: "" }])}><Plus className="h-4 w-4 mr-1" />Add Whitepaper</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Case Studies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {caseStudies.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={c.title} onChange={e => { const n = [...caseStudies]; n[i] = { ...n[i], title: e.target.value }; setCaseStudies(n); }} placeholder="Title" className="flex-1" />
                    <Input value={c.url} onChange={e => { const n = [...caseStudies]; n[i] = { ...n[i], url: e.target.value }; setCaseStudies(n); }} placeholder="URL" className="flex-1" />
                    <Input value={c.client || ""} onChange={e => { const n = [...caseStudies]; n[i] = { ...n[i], client: e.target.value }; setCaseStudies(n); }} placeholder="Client" className="w-32" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setCaseStudies(caseStudies.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setCaseStudies([...caseStudies, { title: "", url: "" }])}><Plus className="h-4 w-4 mr-1" />Add Case Study</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: SETTINGS ═══ */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Verification & Flags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="isVerified" checked={form.isVerified} onCheckedChange={c => setForm({ ...form, isVerified: c as boolean })} />
                  <Label htmlFor="isVerified" className="cursor-pointer">Verified Company</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">Shows a verification badge on the company profile</p>

                <div className="flex items-center space-x-2">
                  <Checkbox id="isFeatured" checked={form.isFeatured} onCheckedChange={c => setForm({ ...form, isFeatured: c as boolean })} />
                  <Label htmlFor="isFeatured" className="cursor-pointer">Featured Company</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">Highlights this company in listings</p>

                <div className="flex items-center space-x-2">
                  <Checkbox id="hiringActively" checked={form.hiringActively} onCheckedChange={c => setForm({ ...form, hiringActively: c as boolean })} />
                  <Label htmlFor="hiringActively" className="cursor-pointer">Actively Hiring</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">Shows a hiring badge on the profile</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: SEO ═══ */}
        {activeTab === "seo" && (
          <div className="max-w-3xl">
            <EntitySeoTab
              entityType="companies"
              entityId={isEdit ? parseInt(params.id) : null}
              entityName={form.name || "Company"}
              entityDescription={form.tagline || form.shortDescription?.slice(0, 200) || undefined}
              entityUrl={`/companies/${form.slug}`}
            />
          </div>
        )}

        {/* ═══ TAB: FUNDING HISTORY ═══ */}
        {activeTab === "funding" && isEdit && company && (
          <CompanyFundingTab companyId={company.id} companyName={form.name} />
        )}
        {activeTab === "funding" && !isEdit && (
          <div className="max-w-2xl"><Card><CardContent className="py-12 text-center text-muted-foreground">Save the company first, then add funding rounds.</CardContent></Card></div>
        )}

        {/* Floating Save Bar */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border mt-8 py-4 flex justify-end">
          <Button type="submit" className="bg-emerald-500 hover:bg-[#0066FF] text-white" disabled={createMutation.isPending || updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : isEdit ? "Update Company" : "Create Company"}
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
