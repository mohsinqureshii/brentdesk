/**
 * User-facing Company Editor
 * Comprehensive tabbed form for creating/editing companies
 * SAP Fiori-inspired layout with enterprise-style sections
 */

import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Building2, Save, Loader2, Info, Upload, X, Globe, Linkedin,
  Twitter, Plus, Trash2, Award, Package, Target, Lightbulb, Users,
  BarChart3, FileText, Phone, Instagram, Youtube, Facebook, Mail, Milestone,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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
  { id: "social", label: "Links & Social", icon: Globe },
  { id: "press", label: "Press & Resources", icon: FileText },
];

type KeyPerson = { name: string; role: string; linkedIn?: string; category?: string };
type TimelineItem = { year: number; title: string; description?: string };
type Customer = { name: string; logo?: string };
type Partnership = { name: string; logo?: string; description?: string };
type Whitepaper = { title: string; url: string; description?: string };
type CaseStudy = { title: string; url: string; description?: string; client?: string };

export default function MyCompanyEditor() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isEdit = !!params.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("identity");
  const [saving, setSaving] = useState(false);

  // ── Form State ──
  const [form, setForm] = useState({
    name: "", tagline: "", description: "", logo: "",
    website: "", linkedIn: "", twitter: "", facebook: "", instagram: "", youtube: "",
    email: "", phone: "",
    location: "", industry: "",
    stage: "" as string,
    foundedYear: "", employeeCount: "", totalFunding: "",
    shortDescription: "", mission: "", vision: "", problemSolved: "", marketServed: "",
    coverImage: "", brandColor: "",
    activeUsersRange: "", arrRange: "", countriesServed: "", clientsCount: "",
    mediaKit: "", logoPack: "", boilerplate: "", prContactEmail: "",
    appStoreLink: "", playStoreLink: "", pitchDeck: "",
  });

  // JSON array fields
  const [keyPeople, setKeyPeople] = useState<KeyPerson[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [notableCustomers, setNotableCustomers] = useState<Customer[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [whitepapers, setWhitepapers] = useState<Whitepaper[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [techStackInput, setTechStackInput] = useState("");

  // ── Load existing company data for edit mode ──
  const { data: myCompanies } = trpc.userContent.myCompanies.useQuery(
    undefined,
    { enabled: isEdit }
  );

  useEffect(() => {
    if (isEdit && myCompanies?.items) {
      const company = myCompanies.items.find((c: any) => c.id === parseInt(params.id!));
      if (company) {
        const c = company as any;
        setForm({
          name: c.name || "", tagline: c.tagline || "",
          description: c.description || "", logo: c.logo || "",
          website: c.website || "", linkedIn: c.linkedIn || "", twitter: c.twitter || "",
          facebook: c.facebook || "", instagram: c.instagram || "", youtube: c.youtube || "",
          email: c.email || "", phone: c.phone || "",
          location: c.location || "", industry: c.industry || "",
          stage: c.stage || "",
          foundedYear: c.foundedYear?.toString() || "", employeeCount: c.employeeCount || "",
          totalFunding: c.totalFunding || "",
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
        });
        if (c.logo) setLogoPreview(c.logo);
        if (c.keyPeople && Array.isArray(c.keyPeople)) setKeyPeople(c.keyPeople);
        if (c.techStack && Array.isArray(c.techStack)) setTechStack(c.techStack);
        if (c.timeline && Array.isArray(c.timeline)) setTimeline(c.timeline);
        if (c.notableCustomers && Array.isArray(c.notableCustomers)) setNotableCustomers(c.notableCustomers);
        if (c.partnerships && Array.isArray(c.partnerships)) setPartnerships(c.partnerships);
        if (c.whitepapers && Array.isArray(c.whitepapers)) setWhitepapers(c.whitepapers);
        if (c.caseStudies && Array.isArray(c.caseStudies)) setCaseStudies(c.caseStudies);
      }
    }
  }, [isEdit, myCompanies, params.id]);

  // ── Mutations ──
  const createMutation = trpc.userContent.createCompany.useMutation({
    onSuccess: () => {
      toast.success("Company submitted for review!");
      navigate("/dashboard/my-content");
    },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });

  const updateMutation = trpc.userContent.updateCompany.useMutation({
    onSuccess: () => {
      toast.success("Company updated!");
      navigate("/dashboard/my-content");
    },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setForm(f => ({ ...f, logo: url }));
        toast.success("Logo uploaded");
      } else {
        const r2 = new FileReader();
        r2.onloadend = () => setForm(f => ({ ...f, logo: r2.result as string }));
        r2.readAsDataURL(file);
      }
    } catch {
      const r2 = new FileReader();
      r2.onloadend = () => { setForm(f => ({ ...f, logo: r2.result as string })); setLogoPreview(r2.result as string); };
      r2.readAsDataURL(file);
    } finally { setIsUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Company name is required"); return; }
    setSaving(true);

    const data: any = {
      name: form.name.trim(),
      tagline: form.tagline || undefined, description: form.description || undefined,
      logo: form.logo || undefined, website: form.website || undefined,
      linkedIn: form.linkedIn || undefined, twitter: form.twitter || undefined,
      facebook: form.facebook || undefined, instagram: form.instagram || undefined,
      youtube: form.youtube || undefined, email: form.email || undefined,
      phone: form.phone || undefined, location: form.location || undefined,
      industry: form.industry || undefined,
      stage: (form.stage || undefined) as any,
      foundedYear: form.foundedYear ? parseInt(form.foundedYear) : undefined,
      employeeCount: form.employeeCount || undefined,
      totalFunding: form.totalFunding || undefined,
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
      pitchDeck: form.pitchDeck || undefined,
      whitepapers: whitepapers.length > 0 ? whitepapers : undefined,
      caseStudies: caseStudies.length > 0 ? caseStudies : undefined,
    };

    if (isEdit) {
      updateMutation.mutate({ id: parseInt(params.id!), ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (authLoading) {
    return (
      <>
        <Header />
        <div className="container max-w-5xl py-8">
          <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
        </div>
        <Footer />
      </>
    );
  }

  if (!user) {
    navigate("/signin");
    return null;
  }

  return (
    <>
      <Header />
      <div className="container max-w-5xl py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard/my-content">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="w-4 h-4" /> My Content</Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{isEdit ? "Edit Company" : "Submit New Company"}</h1>
              <p className="text-sm text-muted-foreground">Your submission will be reviewed before publishing</p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {isEdit ? "Update" : "Submit"}</>}
          </Button>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 mb-6">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-600">Submission Guidelines</p>
            <p className="text-muted-foreground mt-1">
              Fields marked with <span className="text-red-500">*</span> are mandatory. 
              Fill in as many fields as possible for a richer company profile. Use the tabs to navigate between sections.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-border">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 dark:bg-primary text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ═══ TAB: COMPANY IDENTITY ═══ */}
          {activeTab === "identity" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Basic Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company Name <span className="text-red-500">*</span></Label>
                        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. TechBanq" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Tagline</Label>
                        <Input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="Short description" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Short Description</Label>
                      <Textarea value={form.shortDescription} onChange={e => setForm({ ...form, shortDescription: e.target.value })} placeholder="Brief 1-2 sentence description..." rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>Full Description</Label>
                      <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detailed description..." rows={5} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Company Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
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
                    <div className="grid md:grid-cols-3 gap-4">
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
                  <CardHeader><CardTitle className="text-base">Company Logo</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center gap-4">
                      {logoPreview ? (
                        <div className="relative">
                          <img src={logoPreview} alt="Logo" className="w-28 h-28 object-contain rounded-lg border bg-white p-2" />
                          <button type="button" onClick={() => { setForm({ ...form, logo: "" }); setLogoPreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <div className="w-28 h-28 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30"><Building2 className="h-10 w-10 text-muted-foreground" /></div>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
                        <Upload className="h-4 w-4 mr-2" />{isUploading ? "Uploading..." : "Upload Logo"}
                      </Button>
                      <div className="space-y-1 w-full">
                        <Label className="text-xs">Or paste URL</Label>
                        <Input value={form.logo} onChange={e => { setForm({ ...form, logo: e.target.value }); setLogoPreview(e.target.value); }} placeholder="https://..." className="text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Cover Image</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {form.coverImage && <img src={form.coverImage} alt="Cover" className="w-full h-20 object-cover rounded-lg" />}
                    <Input value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} placeholder="Cover image URL" className="text-xs" />
                    <div className="space-y-1">
                      <Label className="text-xs">Brand Color</Label>
                      <div className="flex gap-2">
                        <input type="color" value={form.brandColor || "#3B82F6"} onChange={e => setForm({ ...form, brandColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                        <Input value={form.brandColor} onChange={e => setForm({ ...form, brandColor: e.target.value })} placeholder="#3B82F6" className="text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ═══ TAB: COMPANY STORY ═══ */}
          {activeTab === "story" && (
            <div className="space-y-6 max-w-4xl">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4" />Mission & Vision</CardTitle>
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
                  <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />Problem & Market</CardTitle>
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
                  <CardTitle className="text-base">Tech Stack</CardTitle>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Milestone className="h-4 w-4" />Company Timeline</CardTitle>
                  <CardDescription>Key milestones and events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {timeline.map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Input type="number" value={t.year} onChange={e => { const n = [...timeline]; n[i] = { ...n[i], year: parseInt(e.target.value) || 0 }; setTimeline(n); }} placeholder="Year" className="w-24" />
                      <Input value={t.title} onChange={e => { const n = [...timeline]; n[i] = { ...n[i], title: e.target.value }; setTimeline(n); }} placeholder="Milestone title" className="flex-1" />
                      <Input value={t.description || ""} onChange={e => { const n = [...timeline]; n[i] = { ...n[i], description: e.target.value }; setTimeline(n); }} placeholder="Description" className="flex-1" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setTimeline(timeline.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setTimeline([...timeline, { year: new Date().getFullYear(), title: "" }])}><Plus className="h-4 w-4 mr-1" />Add Milestone</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ TAB: KEY METRICS ═══ */}
          {activeTab === "metrics" && (
            <div className="space-y-6 max-w-4xl">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Growth Metrics</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
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
                  <CardTitle className="text-base">Notable Customers</CardTitle>
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
                <CardHeader><CardTitle className="text-base">Partnerships</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {partnerships.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
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
                  <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Key People</CardTitle>
                  <CardDescription>Leadership team, founders, advisors, and board members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {keyPeople.map((p, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                      <Input value={p.name} onChange={e => { const n = [...keyPeople]; n[i] = { ...n[i], name: e.target.value }; setKeyPeople(n); }} placeholder="Full name" />
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

          {/* ═══ TAB: LINKS & SOCIAL ═══ */}
          {activeTab === "social" && (
            <div className="space-y-6 max-w-4xl">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />Web & Social Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
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
                <CardHeader><CardTitle className="text-base">App Store Links</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
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
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Press & PR</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Boilerplate</Label>
                    <Textarea value={form.boilerplate} onChange={e => setForm({ ...form, boilerplate: e.target.value })} placeholder="Standard company description for press releases..." rows={4} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
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
                <CardHeader><CardTitle className="text-base">Whitepapers</CardTitle></CardHeader>
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
                <CardHeader><CardTitle className="text-base">Case Studies</CardTitle></CardHeader>
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

          {/* Floating Save Bar */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border mt-8 py-4 flex items-center justify-between">
            <Link href="/dashboard/my-content">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saving || !form.name.trim()} className="gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {isEdit ? "Update Company" : "Submit for Review"}</>}
            </Button>
          </div>
        </form>
      </div>
      <Footer />
    </>
  );
}
