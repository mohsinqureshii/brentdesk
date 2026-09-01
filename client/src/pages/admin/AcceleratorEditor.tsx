/**
 * Accelerator Editor Admin Page
 * Comprehensive 9-tab form matching CompanyEditor pattern
 */

import { useState, useEffect } from "react";
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
  Rocket, DollarSign, Target, Users, BarChart3, Shield, Sparkles,
  Loader2, MapPin, Mail, Phone, Award, Briefcase, TrendingUp,
  Facebook, Instagram, Youtube, BookOpen, Calendar, GraduationCap,
  Clock, Image, Star, FileText, Handshake, Search, Eye, Edit2, CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { EntitySeoTab } from "@/components/admin/EntitySeoTab";

const TABS = [
  { id: "profile", label: "Profile", icon: Rocket },
  { id: "program", label: "Program Details", icon: GraduationCap },
  { id: "application", label: "Application", icon: FileText },
  { id: "cohorts", label: "Cohorts", icon: Calendar },
  { id: "alumni", label: "Alumni & Portfolio", icon: Briefcase },
  { id: "team", label: "Team & Partners", icon: Users },
  { id: "metrics", label: "Metrics & Impact", icon: BarChart3 },
  { id: "social", label: "Links & Social", icon: Globe },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "settings", label: "Settings", icon: Shield },
  { id: "seo", label: "SEO", icon: Search },
];

type AlumniCompany = { name: string; logo?: string; sector?: string; batch?: string; status?: string; fundingRaised?: string };
type SuccessStory = { company: string; description?: string; outcome?: string; year?: number };
type ProgramDetail = { title: string; description?: string; duration?: string };
type TeamMember = { name: string; role: string; image?: string; linkedIn?: string };
type Partner = { name: string; logo?: string; type?: string; description?: string };
type NotableAlumnus = { name: string; company?: string; role?: string; image?: string };
type GalleryItem = { url: string; caption?: string };
type CohortForm = {
  id?: number;
  cohortNumber?: number;
  name: string;
  year?: number;
  startDate?: string;
  endDate?: string;
  demoDayDate?: string;
  cohortSize?: number;
  applicationsReceived?: number;
  acceptanceRate?: string;
  status: "completed" | "active" | "upcoming";
  theme?: string;
  highlights?: string;
  totalFundingRaised?: string;
  jobsCreated?: number;
  sortOrder?: number;
};

export default function AcceleratorEditor() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = Boolean(params.id && params.id !== "new");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // ── Form State ──
  const [form, setForm] = useState({
    name: "", slug: "",
    description: "", shortDescription: "", logo: "", coverImage: "",
    website: "", linkedIn: "", twitter: "", facebook: "", instagram: "", youtube: "",
    email: "", contactEmail: "", contactPhone: "",
    location: "",
    status: "active" as "active" | "upcoming" | "completed" | "paused",
    // Program
    programLength: "", equity: "", funding: "",
    applicationDeadline: "", programStartDate: "", programEndDate: "",
    benefits: "", requirements: "", applicationUrl: "",
    mission: "", applicationProcess: "",
    cohortSize: "", investmentRange: "", equityTaken: "",
    successRate: "", totalRaisedByAlumni: "", avgFollowon: "",
    nextCohortDate: "",
    batchCount: "",
    totalFunded: "",
    regionId: undefined as number | undefined,
    sectorId: undefined as number | undefined,
  });

  // Cohort state
  const [editingCohort, setEditingCohort] = useState<CohortForm | null>(null);
  const [cohortDialogOpen, setCohortDialogOpen] = useState(false);
  const [expandedCohortId, setExpandedCohortId] = useState<number | null>(null);
  const [assignPanelOpen, setAssignPanelOpen] = useState<number | null>(null);
  const [alumniSearch, setAlumniSearch] = useState("");
  const [selectedAlumniIds, setSelectedAlumniIds] = useState<number[]>([]);
  const utils = trpc.useUtils();

  // JSON array fields
  const [alumniCompanies, setAlumniCompanies] = useState<AlumniCompany[]>([]);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [programDetails, setProgramDetails] = useState<ProgramDetail[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [notableAlumni, setNotableAlumni] = useState<NotableAlumnus[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // ── Data Loading ──
  const { data: accelerator, isLoading } = trpc.accelerators.get.useQuery(
    { id: Number(params.id) },
    { enabled: isEdit && !!params.id && params.id !== "new" }
  );

  const { data: regionsData } = trpc.admin.taxonomy.regions.list.useQuery();
  const { data: sectorsData } = trpc.admin.taxonomy.sectors.list.useQuery();

  // Cohort queries & mutations
  const { data: cohortsData, refetch: refetchCohorts } = trpc.accelerators.getCohorts.useQuery(
    { acceleratorId: Number(params.id) },
    { enabled: isEdit && !!params.id && params.id !== "new" }
  );
  const createCohortMutation = trpc.accelerators.createCohort.useMutation({
    onSuccess: () => { toast.success("Cohort created"); setCohortDialogOpen(false); setEditingCohort(null); refetchCohorts(); },
    onError: (e) => toast.error(e.message),
  });
  const updateCohortMutation = trpc.accelerators.updateCohort.useMutation({
    onSuccess: () => { toast.success("Cohort updated"); setCohortDialogOpen(false); setEditingCohort(null); refetchCohorts(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCohortMutation = trpc.accelerators.deleteCohort.useMutation({
    onSuccess: () => { toast.success("Cohort deleted"); refetchCohorts(); },
    onError: (e) => toast.error(e.message),
  });

  // Cohort–Alumni linking
  const { data: allAcceleratorAlumni } = trpc.accelerators.getAcceleratorAlumniWithCohorts.useQuery(
    { acceleratorId: Number(params.id) },
    { enabled: isEdit && !!params.id && params.id !== "new" }
  );
  const assignAlumniMutation = trpc.accelerators.bulkAssignAlumniToCohort.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.count} alumni assigned to cohort`);
      setAssignPanelOpen(null);
      setSelectedAlumniIds([]);
      utils.accelerators.getAcceleratorAlumniWithCohorts.invalidate({ acceleratorId: Number(params.id) });
    },
    onError: (e) => toast.error(e.message),
  });
  const unassignAlumniMutation = trpc.accelerators.assignAlumniToCohort.useMutation({
    onSuccess: () => {
      toast.success("Alumni removed from cohort");
      utils.accelerators.getAcceleratorAlumniWithCohorts.invalidate({ acceleratorId: Number(params.id) });
    },
    onError: (e) => toast.error(e.message),
  });

  const openNewCohort = () => {
    setEditingCohort({ name: "", status: "upcoming", cohortNumber: (cohortsData?.length || 0) + 1 });
    setCohortDialogOpen(true);
  };
  const openEditCohort = (c: any) => {
    setEditingCohort({
      id: c.id,
      cohortNumber: c.cohortNumber,
      name: c.name || "",
      year: c.year,
      startDate: c.startDate || "",
      endDate: c.endDate || "",
      demoDayDate: c.demoDayDate || "",
      cohortSize: c.cohortSize,
      applicationsReceived: c.applicationsReceived,
      acceptanceRate: c.acceptanceRate || "",
      status: c.status || "upcoming",
      theme: c.theme || "",
      highlights: c.highlights || "",
      totalFundingRaised: c.totalFundingRaised || "",
      jobsCreated: c.jobsCreated,
      sortOrder: c.sortOrder || 0,
    });
    setCohortDialogOpen(true);
  };
  const saveCohort = () => {
    if (!editingCohort || !editingCohort.name.trim()) return;
    if (editingCohort.id) {
      updateCohortMutation.mutate({ ...editingCohort, id: editingCohort.id });
    } else {
      createCohortMutation.mutate({ ...editingCohort, acceleratorId: Number(params.id) });
    }
  };

  useEffect(() => {
    if (accelerator) {
      const acc = accelerator as any;
      setForm({
        name: acc.name || "", slug: acc.slug || "",
        description: acc.description || "", shortDescription: acc.shortDescription || "",
        logo: acc.logo || "", coverImage: acc.coverImage || "",
        website: acc.website || "", linkedIn: acc.linkedIn || "", twitter: acc.twitter || "",
        facebook: acc.facebook || "", instagram: acc.instagram || "", youtube: acc.youtube || "",
        email: acc.email || "", contactEmail: acc.contactEmail || "", contactPhone: acc.contactPhone || "",
        location: acc.location || "",
        status: acc.status || "active",
        programLength: acc.programLength || "", equity: acc.equity || "", funding: acc.funding || "",
        applicationDeadline: acc.applicationDeadline || "",
        programStartDate: acc.programStartDate ? new Date(acc.programStartDate).toISOString().split("T")[0] : "",
        programEndDate: acc.programEndDate ? new Date(acc.programEndDate).toISOString().split("T")[0] : "",
        benefits: acc.benefits || "", requirements: acc.requirements || "",
        applicationUrl: acc.applicationUrl || "",
        mission: acc.mission || "", applicationProcess: acc.applicationProcess || "",
        cohortSize: acc.cohortSize || "", investmentRange: acc.investmentRange || "",
        equityTaken: acc.equityTaken || "", successRate: acc.successRate || "",
        totalRaisedByAlumni: acc.totalRaisedByAlumni || "", avgFollowon: acc.avgFollowon || "",
        nextCohortDate: acc.nextCohortDate || "",
        batchCount: acc.batchCount?.toString() || "",
        totalFunded: acc.totalFunded?.toString() || "",
        regionId: acc.regionId || undefined,
        sectorId: acc.sectorId || undefined,
      });
      if (acc.logo) setLogoPreview(acc.logo);
      if (acc.coverImage) setCoverPreview(acc.coverImage);
      // Map API field names (alumniCompaniesData, teamMembersData, etc.) to local state
      // Relational table data uses snake_case DB field names; map to editor's camelCase types
      const rawAlumni = acc.alumniCompaniesData || acc.alumniCompanies;
      if (Array.isArray(rawAlumni) && rawAlumni.length > 0) {
        setAlumniCompanies(rawAlumni.map((a: any) => ({
          name: a.name || a.companyName || a.company_name || "",
          logo: a.logo || "",
          sector: a.sector || "",
          batch: a.batch || a.cohortId?.toString() || "",
          status: a.status || a.fundingStage || a.funding_stage || "",
          fundingRaised: a.fundingRaised || a.funding_raised || "",
        })));
      } else if (Array.isArray(rawAlumni)) {
        setAlumniCompanies([]);
      }
      if (Array.isArray(acc.successStories)) setSuccessStories(acc.successStories);
      // Programs: relational table has title, description, duration fields
      const rawPrograms = acc.programsData || acc.programDetails;
      if (Array.isArray(rawPrograms) && rawPrograms.length > 0) {
        setProgramDetails(rawPrograms.map((p: any) => ({
          title: p.title || p.name || "",
          description: p.description || "",
          duration: p.duration || p.programLength || "",
        })));
      } else if (Array.isArray(rawPrograms)) {
        setProgramDetails([]);
      }
      // Team: relational table uses title (not role), photo (not image), linkedin (not linkedIn)
      const rawTeam = acc.teamMembersData || acc.teamMembers;
      if (Array.isArray(rawTeam) && rawTeam.length > 0) {
        setTeamMembers(rawTeam.map((t: any) => ({
          name: t.name || "",
          role: t.role || t.title || "",
          image: t.image || t.photo || "",
          linkedIn: t.linkedIn || t.linkedin || "",
        })));
      } else if (Array.isArray(rawTeam)) {
        setTeamMembers([]);
      }
      // Partners: relational table fields mostly match editor types
      const rawPartners = acc.partnersData || acc.partners;
      if (Array.isArray(rawPartners) && rawPartners.length > 0) {
        setPartners(rawPartners.map((p: any) => ({
          name: p.name || "",
          logo: p.logo || "",
          type: p.type || "",
          description: p.description || "",
        })));
      } else if (Array.isArray(rawPartners)) {
        setPartners([]);
      }
      // notableAlumni is stored as a separate JSON field
      if (Array.isArray(acc.notableAlumni)) setNotableAlumni(acc.notableAlumni);
      const galleryArr = acc.gallery || (acc.galleryImages ? JSON.parse(acc.galleryImages) : null);
      if (Array.isArray(galleryArr)) setGallery(galleryArr);
    }
  }, [accelerator]);

  // ── Mutations ──
  const createMutation = trpc.accelerators.create.useMutation({
    onSuccess: () => { toast.success("Accelerator created"); navigate("/admin/accelerators"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.accelerators.update.useMutation({
    onSuccess: () => { toast.success("Accelerator updated"); navigate("/admin/accelerators"); },
    onError: (e) => toast.error(e.message),
  });
  const aiSuggestMutation = trpc.admin.ai.suggestAcceleratorInfo.useMutation({
    onSuccess: (data: any) => {
      if (data) {
        setForm(prev => ({
          ...prev,
          description: data.description || prev.description,
          shortDescription: data.shortDescription || prev.shortDescription,
          location: data.location || prev.location,
          programLength: data.programDuration || prev.programLength,
          equity: data.equityTaken || prev.equity,
          funding: data.investmentAmount || prev.funding,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "coverImage") => {
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
      setForm(prev => ({ ...prev, [field]: url }));
      if (field === "logo") setLogoPreview(url);
      else setCoverPreview(url);
      toast.success(`${field === "logo" ? "Logo" : "Cover"} uploaded`);
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
    if (!form.slug.trim()) { toast.error("Slug is required"); return; }

    const data: any = {
      name: form.name, slug: form.slug,
      description: form.description || undefined, shortDescription: form.shortDescription || undefined,
      logo: form.logo || undefined, coverImage: form.coverImage || undefined,
      website: form.website || undefined, linkedIn: form.linkedIn || undefined,
      twitter: form.twitter || undefined, facebook: form.facebook || undefined,
      instagram: form.instagram || undefined, youtube: form.youtube || undefined,
      email: form.email || undefined, contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      location: form.location || undefined,
      status: form.status,
      programLength: form.programLength || undefined, equity: form.equity || undefined,
      funding: form.funding || undefined,
      applicationDeadline: form.applicationDeadline || undefined,
      programStartDate: form.programStartDate || undefined,
      programEndDate: form.programEndDate || undefined,
      benefits: form.benefits || undefined, requirements: form.requirements || undefined,
      applicationUrl: form.applicationUrl || undefined,
      mission: form.mission || undefined, applicationProcess: form.applicationProcess || undefined,
      cohortSize: form.cohortSize || undefined, investmentRange: form.investmentRange || undefined,
      equityTaken: form.equityTaken || undefined, successRate: form.successRate || undefined,
      totalRaisedByAlumni: form.totalRaisedByAlumni || undefined,
      avgFollowon: form.avgFollowon || undefined,
      nextCohortDate: form.nextCohortDate || undefined,
      batchCount: form.batchCount ? parseInt(form.batchCount) : undefined,
      totalFunded: form.totalFunded ? parseInt(form.totalFunded) : undefined,
      regionId: form.regionId || undefined, sectorId: form.sectorId || undefined,
      alumniCompanies: alumniCompanies.length > 0 ? alumniCompanies : undefined,
      successStories: successStories.length > 0 ? successStories : undefined,
      programDetails: programDetails.length > 0 ? programDetails : undefined,
      teamMembers: teamMembers.length > 0 ? teamMembers : undefined,
      partners: partners.length > 0 ? partners : undefined,
      notableAlumni: notableAlumni.length > 0 ? notableAlumni : undefined,
      gallery: gallery.length > 0 ? gallery : undefined,
    };

    if (isEdit) {
      updateMutation.mutate({ id: Number(params.id), ...data });
    } else {
      createMutation.mutate(data);
    }
  };

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
            <Link href="/admin/accelerators">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Accelerator" : "New Accelerator"}</h1>
              <p className="text-muted-foreground text-sm">{isEdit ? `Editing: ${form.name}` : "Add a new accelerator program"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEdit && form.slug && (
              <Button type="button" variant="outline" onClick={() => window.open(`/accelerators/${form.slug}`, "_blank")}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
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
                <CardHeader><CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5" />Basic Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onBlur={() => !form.slug && generateSlug()} placeholder="Y Combinator" />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug *</Label>
                      <div className="flex gap-2">
                        <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="y-combinator" />
                        <Button type="button" variant="outline" onClick={generateSlug}>Generate</Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Mountain View, CA" className="pl-10" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Region</Label>
                      <Select value={form.regionId?.toString() || ""} onValueChange={v => setForm({ ...form, regionId: v ? parseInt(v) : undefined })}>
                        <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                        <SelectContent>
                          {(regionsData as any)?.map?.((r: any) => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sector</Label>
                      <Select value={form.sectorId?.toString() || ""} onValueChange={v => setForm({ ...form, sectorId: v ? parseInt(v) : undefined })}>
                        <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                        <SelectContent>
                          {(sectorsData as any)?.map?.((s: any) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Short Description</Label>
                    <Textarea value={form.shortDescription} onChange={e => setForm({ ...form, shortDescription: e.target.value })} placeholder="Brief one-liner..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Description</Label>
                    <RichTextEditor content={form.description} onChange={c => setForm({ ...form, description: c })} placeholder="Detailed description..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Mission</Label>
                    <RichTextEditor content={form.mission} onChange={c => setForm({ ...form, mission: c })} placeholder="Accelerator mission statement..." />
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
                        <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@accelerator.com" className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Email</Label>
                      <Input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} placeholder="apply@accelerator.com" />
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
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, "logo")} disabled={isUploading} />
                    </label>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Or enter logo URL</Label>
                    <Input value={form.logo} onChange={e => { setForm({ ...form, logo: e.target.value }); if (e.target.value) setLogoPreview(e.target.value); }} placeholder="https://..." className="text-sm" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Cover Image</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {coverPreview ? (
                    <div className="relative">
                      <img src={coverPreview} alt="Cover" className="w-full h-32 object-cover rounded-md border" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => { setForm({ ...form, coverImage: "" }); setCoverPreview(null); }}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-[#F7F8FA] transition-colors">
                      <div className="flex flex-col items-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-[#9BA3B0] mb-2" /><p className="text-sm text-[#697386]">Upload cover</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, "coverImage")} disabled={isUploading} />
                    </label>
                  )}
                  <Input value={form.coverImage} onChange={e => { setForm({ ...form, coverImage: e.target.value }); if (e.target.value) setCoverPreview(e.target.value); }} placeholder="https://..." className="text-sm" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ═══ TAB: PROGRAM DETAILS ═══ */}
        {activeTab === "program" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" />Program Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Program Length</Label>
                    <Input value={form.programLength} onChange={e => setForm({ ...form, programLength: e.target.value })} placeholder="12 weeks" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cohort Size</Label>
                    <Input value={form.cohortSize} onChange={e => setForm({ ...form, cohortSize: e.target.value })} placeholder="10-15 startups" />
                  </div>
                  <div className="space-y-2">
                    <Label>Batch Count</Label>
                    <Input type="number" value={form.batchCount} onChange={e => setForm({ ...form, batchCount: e.target.value })} placeholder="20" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Investment Range</Label>
                    <Input value={form.investmentRange} onChange={e => setForm({ ...form, investmentRange: e.target.value })} placeholder="$50K - $150K" />
                  </div>
                  <div className="space-y-2">
                    <Label>Equity Taken</Label>
                    <Input value={form.equityTaken} onChange={e => setForm({ ...form, equityTaken: e.target.value })} placeholder="5-10%" />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Cohort Date</Label>
                    <Input value={form.nextCohortDate} onChange={e => setForm({ ...form, nextCohortDate: e.target.value })} placeholder="March 2026" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Program Start Date</Label>
                    <Input type="date" value={form.programStartDate} onChange={e => setForm({ ...form, programStartDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Program End Date</Label>
                    <Input type="date" value={form.programEndDate} onChange={e => setForm({ ...form, programEndDate: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Benefits</CardTitle></CardHeader>
              <CardContent>
                <RichTextEditor content={form.benefits} onChange={c => setForm({ ...form, benefits: c })} placeholder="What participants receive..." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
              <CardContent>
                <RichTextEditor content={form.requirements} onChange={c => setForm({ ...form, requirements: c })} placeholder="Eligibility criteria..." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Program Modules</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setProgramDetails([...programDetails, { title: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Module
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {programDetails.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No program modules added.</p>}
                {programDetails.map((pd, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setProgramDetails(programDetails.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Module Title *</Label>
                        <Input value={pd.title} onChange={e => { const n = [...programDetails]; n[i] = { ...n[i], title: e.target.value }; setProgramDetails(n); }} placeholder="Ideation Workshop" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Duration</Label>
                        <Input value={pd.duration || ""} onChange={e => { const n = [...programDetails]; n[i] = { ...n[i], duration: e.target.value }; setProgramDetails(n); }} placeholder="2 weeks" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea value={pd.description || ""} onChange={e => { const n = [...programDetails]; n[i] = { ...n[i], description: e.target.value }; setProgramDetails(n); }} placeholder="What this module covers..." rows={2} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: APPLICATION ═══ */}
        {activeTab === "application" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Application Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Application Deadline</Label>
                    <Input value={form.applicationDeadline} onChange={e => setForm({ ...form, applicationDeadline: e.target.value })} placeholder="March 15, 2026 or Rolling" />
                  </div>
                  <div className="space-y-2">
                    <Label>Application URL</Label>
                    <Input value={form.applicationUrl} onChange={e => setForm({ ...form, applicationUrl: e.target.value })} placeholder="https://apply.accelerator.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Application Process</Label>
                  <RichTextEditor content={form.applicationProcess} onChange={c => setForm({ ...form, applicationProcess: c })} placeholder="Step-by-step application process..." />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: ALUMNI & PORTFOLIO ═══ */}
        {activeTab === "alumni" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Alumni Companies</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAlumniCompanies([...alumniCompanies, { name: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Company
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {alumniCompanies.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No alumni companies added.</p>}
                {alumniCompanies.map((ac, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setAlumniCompanies(alumniCompanies.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={ac.name} onChange={e => { const n = [...alumniCompanies]; n[i] = { ...n[i], name: e.target.value }; setAlumniCompanies(n); }} placeholder="Company" /></div>
                      <div className="space-y-1"><Label className="text-xs">Sector</Label><Input value={ac.sector || ""} onChange={e => { const n = [...alumniCompanies]; n[i] = { ...n[i], sector: e.target.value }; setAlumniCompanies(n); }} placeholder="Fintech" /></div>
                      <div className="space-y-1"><Label className="text-xs">Batch</Label><Input value={ac.batch || ""} onChange={e => { const n = [...alumniCompanies]; n[i] = { ...n[i], batch: e.target.value }; setAlumniCompanies(n); }} placeholder="Batch 5" /></div>
                      <div className="space-y-1"><Label className="text-xs">Funding Raised</Label><Input value={ac.fundingRaised || ""} onChange={e => { const n = [...alumniCompanies]; n[i] = { ...n[i], fundingRaised: e.target.value }; setAlumniCompanies(n); }} placeholder="$2M" /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Logo URL</Label><Input value={ac.logo || ""} onChange={e => { const n = [...alumniCompanies]; n[i] = { ...n[i], logo: e.target.value }; setAlumniCompanies(n); }} placeholder="https://..." /></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" />Notable Alumni</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setNotableAlumni([...notableAlumni, { name: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Person
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {notableAlumni.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No notable alumni added.</p>}
                {notableAlumni.map((na, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setNotableAlumni(notableAlumni.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={na.name} onChange={e => { const n = [...notableAlumni]; n[i] = { ...n[i], name: e.target.value }; setNotableAlumni(n); }} placeholder="Full name" /></div>
                      <div className="space-y-1"><Label className="text-xs">Company</Label><Input value={na.company || ""} onChange={e => { const n = [...notableAlumni]; n[i] = { ...n[i], company: e.target.value }; setNotableAlumni(n); }} placeholder="Company" /></div>
                      <div className="space-y-1"><Label className="text-xs">Role</Label><Input value={na.role || ""} onChange={e => { const n = [...notableAlumni]; n[i] = { ...n[i], role: e.target.value }; setNotableAlumni(n); }} placeholder="CEO" /></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Success Stories</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSuccessStories([...successStories, { company: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Story
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {successStories.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No success stories added.</p>}
                {successStories.map((ss, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setSuccessStories(successStories.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Company *</Label><Input value={ss.company} onChange={e => { const n = [...successStories]; n[i] = { ...n[i], company: e.target.value }; setSuccessStories(n); }} placeholder="Company" /></div>
                      <div className="space-y-1"><Label className="text-xs">Outcome</Label><Input value={ss.outcome || ""} onChange={e => { const n = [...successStories]; n[i] = { ...n[i], outcome: e.target.value }; setSuccessStories(n); }} placeholder="Raised $5M Series A" /></div>
                      <div className="space-y-1"><Label className="text-xs">Year</Label><Input type="number" value={ss.year || ""} onChange={e => { const n = [...successStories]; n[i] = { ...n[i], year: e.target.value ? parseInt(e.target.value) : undefined }; setSuccessStories(n); }} placeholder="2023" /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={ss.description || ""} onChange={e => { const n = [...successStories]; n[i] = { ...n[i], description: e.target.value }; setSuccessStories(n); }} placeholder="Story details..." rows={2} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: TEAM & PARTNERS ═══ */}
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
                {teamMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No team members added.</p>}
                {teamMembers.map((tm, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setTeamMembers(teamMembers.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={tm.name} onChange={e => { const n = [...teamMembers]; n[i] = { ...n[i], name: e.target.value }; setTeamMembers(n); }} placeholder="Full name" /></div>
                      <div className="space-y-1"><Label className="text-xs">Role *</Label><Input value={tm.role} onChange={e => { const n = [...teamMembers]; n[i] = { ...n[i], role: e.target.value }; setTeamMembers(n); }} placeholder="Program Director" /></div>
                      <div className="space-y-1"><Label className="text-xs">LinkedIn</Label><Input value={tm.linkedIn || ""} onChange={e => { const n = [...teamMembers]; n[i] = { ...n[i], linkedIn: e.target.value }; setTeamMembers(n); }} placeholder="https://linkedin.com/in/..." /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Photo URL</Label><Input value={tm.image || ""} onChange={e => { const n = [...teamMembers]; n[i] = { ...n[i], image: e.target.value }; setTeamMembers(n); }} placeholder="https://..." /></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5" />Partners</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPartners([...partners, { name: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Partner
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {partners.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No partners added.</p>}
                {partners.map((p, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setPartners(partners.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={p.name} onChange={e => { const n = [...partners]; n[i] = { ...n[i], name: e.target.value }; setPartners(n); }} placeholder="Partner name" /></div>
                      <div className="space-y-1"><Label className="text-xs">Type</Label><Input value={p.type || ""} onChange={e => { const n = [...partners]; n[i] = { ...n[i], type: e.target.value }; setPartners(n); }} placeholder="Corporate / Academic" /></div>
                      <div className="space-y-1"><Label className="text-xs">Logo URL</Label><Input value={p.logo || ""} onChange={e => { const n = [...partners]; n[i] = { ...n[i], logo: e.target.value }; setPartners(n); }} placeholder="https://..." /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={p.description || ""} onChange={e => { const n = [...partners]; n[i] = { ...n[i], description: e.target.value }; setPartners(n); }} placeholder="Partnership details..." rows={2} /></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: METRICS & IMPACT ═══ */}
        {activeTab === "metrics" && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Impact Metrics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Total Funded Startups</Label>
                  <Input type="number" value={form.totalFunded} onChange={e => setForm({ ...form, totalFunded: e.target.value })} placeholder="500" />
                </div>
                <div className="space-y-2">
                  <Label>Total Raised by Alumni</Label>
                  <Input value={form.totalRaisedByAlumni} onChange={e => setForm({ ...form, totalRaisedByAlumni: e.target.value })} placeholder="$2.5B" />
                </div>
                <div className="space-y-2">
                  <Label>Success Rate</Label>
                  <Input value={form.successRate} onChange={e => setForm({ ...form, successRate: e.target.value })} placeholder="85%" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Average Follow-on Funding</Label>
                  <Input value={form.avgFollowon} onChange={e => setForm({ ...form, avgFollowon: e.target.value })} placeholder="$1.2M" />
                </div>
                <div className="space-y-2">
                  <Label>Funding (per startup)</Label>
                  <Input value={form.funding} onChange={e => setForm({ ...form, funding: e.target.value })} placeholder="$150K" />
                </div>
              </div>
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
                  <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://accelerator.com" />
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

        {/* ═══ TAB: GALLERY ═══ */}
        {activeTab === "gallery" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" />Gallery Images</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => setGallery([...gallery, { url: "" }])}>
                  <Plus className="h-4 w-4 mr-1" />Add Image
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {gallery.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No gallery images added.</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gallery.map((g, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    {g.url && <img src={g.url} alt={g.caption || ""} className="w-full h-32 object-cover rounded-md" />}
                    <div className="space-y-1">
                      <Label className="text-xs">Image URL *</Label>
                      <Input value={g.url} onChange={e => { const n = [...gallery]; n[i] = { ...n[i], url: e.target.value }; setGallery(n); }} placeholder="https://..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Caption</Label>
                      <Input value={g.caption || ""} onChange={e => { const n = [...gallery]; n[i] = { ...n[i], caption: e.target.value }; setGallery(n); }} placeholder="Photo caption" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ TAB: COHORTS ═══ */}
        {activeTab === "cohorts" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Cohort Management</CardTitle>
                  {isEdit && (
                    <Button type="button" onClick={openNewCohort} className="bg-emerald-500 hover:bg-[#0066FF] text-white">
                      <Plus className="h-4 w-4 mr-2" />Add Cohort
                    </Button>
                  )}
                </div>
                {!isEdit && <p className="text-sm text-muted-foreground mt-1">Save the accelerator first to manage cohorts.</p>}
              </CardHeader>
              <CardContent>
                {!cohortsData || cohortsData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No cohorts yet</p>
                    <p className="text-sm">Add cohorts to track program batches, alumni, and outcomes.</p>
                    {isEdit && (
                      <Button type="button" variant="outline" className="mt-4" onClick={openNewCohort}>
                        <Plus className="h-4 w-4 mr-2" />Add First Cohort
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(cohortsData as any[]).map((cohort: any) => {
                      const cohortAlumni = (allAcceleratorAlumni || []).filter((a: any) => a.cohortId === cohort.id);
                      const unassignedAlumni = (allAcceleratorAlumni || []).filter((a: any) => !a.cohortId);
                      const isExpanded = expandedCohortId === cohort.id;
                      const isAssigning = assignPanelOpen === cohort.id;
                      const filteredUnassigned = unassignedAlumni.filter((a: any) =>
                        !alumniSearch || a.companyName?.toLowerCase().includes(alumniSearch.toLowerCase())
                      );
                      return (
                        <div key={cohort.id} className="border rounded-md overflow-hidden">
                          {/* Cohort header row */}
                          <div className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#EBF3FF] dark:bg-emerald-950/40 flex items-center justify-center">
                              <span className="text-[#0066FF] dark:text-[#80B3FF] font-bold text-sm">#{cohort.cohortNumber || "?"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">{cohort.name}</span>
                                <Badge className={{
                                  active: "bg-[#EBF3FF] text-[#0066FF]",
                                  completed: "bg-[#F0F2F5] text-[#697386]",
                                  upcoming: "bg-blue-100 text-blue-700",
                                }[cohort.status as string] || "bg-[#F0F2F5] text-[#697386]"}>
                                  {cohort.status}
                                </Badge>
                                {cohort.year && <span className="text-xs text-muted-foreground">{cohort.year}</span>}
                                <button
                                  type="button"
                                  onClick={() => setExpandedCohortId(isExpanded ? null : cohort.id)}
                                  className="ml-1 inline-flex items-center gap-1 text-xs text-[#0066FF] hover:text-[#0066FF] font-medium"
                                >
                                  <Briefcase className="h-3 w-3" />
                                  {cohortAlumni.length} alumni
                                  <span className="text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                                </button>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 mt-2 text-sm text-muted-foreground">
                                {cohort.theme && <span className="col-span-2"><span className="font-medium text-foreground">Theme:</span> {cohort.theme}</span>}
                                {cohort.cohortSize && <span><span className="font-medium text-foreground">Size:</span> {cohort.cohortSize} startups</span>}
                                {cohort.applicationsReceived && <span><span className="font-medium text-foreground">Apps:</span> {cohort.applicationsReceived.toLocaleString()}</span>}
                                {cohort.acceptanceRate && <span><span className="font-medium text-foreground">Rate:</span> {cohort.acceptanceRate}</span>}
                                {cohort.totalFundingRaised && <span><span className="font-medium text-foreground">Raised:</span> {cohort.totalFundingRaised}</span>}
                                {cohort.startDate && <span><span className="font-medium text-foreground">Start:</span> {cohort.startDate}</span>}
                                {cohort.demoDayDate && <span><span className="font-medium text-foreground">Demo Day:</span> {cohort.demoDayDate}</span>}
                              </div>
                              {cohort.highlights && <p className="text-xs text-muted-foreground mt-1 italic">{cohort.highlights}</p>}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCohort(cohort)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(`Delete cohort "${cohort.name}"?`)) deleteCohortMutation.mutate({ id: cohort.id }); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Drill-down: Alumni list */}
                          {isExpanded && (
                            <div className="border-t bg-muted/20 px-4 py-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                  <Briefcase className="h-4 w-4 text-[#0066FF]" />
                                  Alumni in this Cohort
                                  <Badge variant="secondary" className="text-xs">{cohortAlumni.length}</Badge>
                                </h4>
                                <Button
                                  type="button" size="sm" variant="outline"
                                  className="h-7 text-xs border-[#0066FF] text-[#0066FF] hover:bg-[#F0F7FF]"
                                  onClick={() => { setAssignPanelOpen(isAssigning ? null : cohort.id); setAlumniSearch(""); setSelectedAlumniIds([]); }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />Assign Alumni
                                </Button>
                              </div>

                              {/* Assigned alumni chips */}
                              {cohortAlumni.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No alumni assigned to this cohort yet.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {cohortAlumni.map((a: any) => (
                                    <div key={a.id} className="flex items-center gap-1.5 bg-white dark:bg-background border rounded-full px-3 py-1 text-xs font-medium shadow-sm">
                                      {a.logo && <img src={a.logo} alt="" className="w-4 h-4 rounded-full object-cover" />}
                                      <span>{a.companyName}</span>
                                      {a.sector && <span className="text-muted-foreground">· {a.sector}</span>}
                                      {a.fundingRaised && <span className="text-[#0066FF] font-semibold ml-1">{a.fundingRaised}</span>}
                                      <button
                                        type="button"
                                        className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                        title="Remove from cohort"
                                        onClick={() => unassignAlumniMutation.mutate({ alumniId: a.id, cohortId: null })}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Assign panel */}
                              {isAssigning && (
                                <div className="border rounded-md bg-white dark:bg-background p-3 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <Input
                                      className="h-7 text-xs"
                                      placeholder="Search unassigned alumni..."
                                      value={alumniSearch}
                                      onChange={e => setAlumniSearch(e.target.value)}
                                    />
                                  </div>
                                  {filteredUnassigned.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-2">
                                      {unassignedAlumni.length === 0 ? "All alumni are already assigned to cohorts." : "No alumni match your search."}
                                    </p>
                                  ) : (
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                      {filteredUnassigned.map((a: any) => (
                                        <label key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs">
                                          <input
                                            type="checkbox" className="rounded"
                                            checked={selectedAlumniIds.includes(a.id)}
                                            onChange={e => setSelectedAlumniIds(prev =>
                                              e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id)
                                            )}
                                          />
                                          <span className="font-medium">{a.companyName}</span>
                                          {a.sector && <span className="text-muted-foreground">· {a.sector}</span>}
                                          {a.fundingRaised && <span className="text-[#0066FF] font-semibold ml-auto">{a.fundingRaised}</span>}
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between pt-1 border-t">
                                    <span className="text-xs text-muted-foreground">{selectedAlumniIds.length} selected</span>
                                    <div className="flex gap-2">
                                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAssignPanelOpen(null); setSelectedAlumniIds([]); }}>Cancel</Button>
                                      <Button
                                        type="button" size="sm"
                                        className="h-7 text-xs bg-emerald-500 hover:bg-[#0066FF] text-white"
                                        disabled={selectedAlumniIds.length === 0 || assignAlumniMutation.isPending}
                                        onClick={() => assignAlumniMutation.mutate({ alumniIds: selectedAlumniIds, cohortId: cohort.id })}
                                      >
                                        {assignAlumniMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                        Assign {selectedAlumniIds.length > 0 ? `(${selectedAlumniIds.length})` : ""}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cohort Edit Dialog (inline panel) */}
            {cohortDialogOpen && editingCohort && (
              <Card className="border-2 border-[#0066FF]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{editingCohort.id ? "Edit Cohort" : "New Cohort"}</CardTitle>
                    <Button type="button" variant="ghost" size="icon" onClick={() => { setCohortDialogOpen(false); setEditingCohort(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Cohort # </Label>
                      <Input type="number" value={editingCohort.cohortNumber || ""} onChange={e => setEditingCohort({ ...editingCohort, cohortNumber: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="11" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-xs">Name *</Label>
                      <Input value={editingCohort.name} onChange={e => setEditingCohort({ ...editingCohort, name: e.target.value })} placeholder="Cohort 11 — AI & Deep Tech" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Year</Label>
                      <Input type="number" value={editingCohort.year || ""} onChange={e => setEditingCohort({ ...editingCohort, year: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="2025" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Start Date</Label>
                      <Input value={editingCohort.startDate || ""} onChange={e => setEditingCohort({ ...editingCohort, startDate: e.target.value })} placeholder="Sep 2025" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End Date</Label>
                      <Input value={editingCohort.endDate || ""} onChange={e => setEditingCohort({ ...editingCohort, endDate: e.target.value })} placeholder="Nov 2025" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Demo Day</Label>
                      <Input value={editingCohort.demoDayDate || ""} onChange={e => setEditingCohort({ ...editingCohort, demoDayDate: e.target.value })} placeholder="Dec 2025" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={editingCohort.status} onValueChange={(v: any) => setEditingCohort({ ...editingCohort, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cohort Size</Label>
                      <Input type="number" value={editingCohort.cohortSize || ""} onChange={e => setEditingCohort({ ...editingCohort, cohortSize: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="20" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Applications Received</Label>
                      <Input type="number" value={editingCohort.applicationsReceived || ""} onChange={e => setEditingCohort({ ...editingCohort, applicationsReceived: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="1200" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Acceptance Rate</Label>
                      <Input value={editingCohort.acceptanceRate || ""} onChange={e => setEditingCohort({ ...editingCohort, acceptanceRate: e.target.value })} placeholder="1.7%" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Theme</Label>
                      <Input value={editingCohort.theme || ""} onChange={e => setEditingCohort({ ...editingCohort, theme: e.target.value })} placeholder="AI & Deep Tech" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Total Funding Raised</Label>
                      <Input value={editingCohort.totalFundingRaised || ""} onChange={e => setEditingCohort({ ...editingCohort, totalFundingRaised: e.target.value })} placeholder="$18M" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Jobs Created</Label>
                      <Input type="number" value={editingCohort.jobsCreated || ""} onChange={e => setEditingCohort({ ...editingCohort, jobsCreated: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="340" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Highlights</Label>
                    <Textarea value={editingCohort.highlights || ""} onChange={e => setEditingCohort({ ...editingCohort, highlights: e.target.value })} placeholder="Record applications; first cohort with 40% female founders..." rows={2} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setCohortDialogOpen(false); setEditingCohort(null); }}>Cancel</Button>
                    <Button type="button" className="bg-emerald-500 hover:bg-[#0066FF] text-white" onClick={saveCohort} disabled={createCohortMutation.isPending || updateCohortMutation.isPending}>
                      {createCohortMutation.isPending || updateCohortMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      {editingCohort.id ? "Update Cohort" : "Create Cohort"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ TAB: SETTINGS ═══ */}
        {activeTab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Program Settings</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Program Status</Label>
                    <p className="text-sm text-muted-foreground">Current operational status</p>
                  </div>
                  <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* ═══ TAB: SEO ═══ */}
        {activeTab === "seo" && (
          <div className="max-w-3xl">
            <EntitySeoTab
              entityType="accelerators"
              entityId={isEdit ? parseInt(params.id) : null}
              entityName={form.name || "Accelerator"}
              entityDescription={form.shortDescription || form.description?.slice(0, 200) || undefined}
              entityUrl={`/accelerators/${form.slug}`}
            />
          </div>
        )}
      </form>
    </AdminLayout>
  );
}
