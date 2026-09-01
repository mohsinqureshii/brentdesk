/**
 * Person Editor Admin Page
 * Comprehensive 9-tab form matching CompanyEditor pattern
 * SAP Fiori-inspired layout with enterprise-style sections
 */

import { useState, useEffect, useRef, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Save, User, Upload, X, Globe, Linkedin, Twitter,
  Plus, Trash2, GripVertical, Award, Briefcase, GraduationCap,
  Target, Heart, Users, BarChart3, FileText, Phone,
  Instagram, Youtube, Facebook, Mail, Shield, Sparkles,
  Loader2, MapPin, Building2, DollarSign, BookOpen, Handshake,
  Github, Languages, Star, TrendingUp, Search,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { CompanyCombobox } from "@/components/admin/CompanyCombobox";
import { EntitySeoTab } from "@/components/admin/EntitySeoTab";

const TABS = [
  { id: "identity", label: "Personal Identity", icon: User },
  { id: "career", label: "Career & Education", icon: Briefcase },
  { id: "expertise", label: "Expertise & Skills", icon: Target },
  { id: "investments", label: "Investments & Ventures", icon: DollarSign },
  { id: "leadership", label: "Board & Advisory", icon: Users },
  { id: "achievements", label: "Achievements", icon: Award },
  { id: "social", label: "Links & Social", icon: Globe },
  { id: "preferences", label: "Availability & Interests", icon: Heart },
  { id: "settings", label: "Settings", icon: Shield },
  { id: "seo", label: "SEO", icon: Search },
];

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

type ExperienceItem = { company: string; role: string; startYear?: number; endYear?: number; description?: string; current?: boolean };
type EducationItem = { institution: string; degree: string; field?: string; year?: number };
type InvestmentItem = { company: string; amount?: string; year?: number; status?: string; sector?: string };
type BoardRole = { company: string; role: string; startYear?: number; current?: boolean };
type AdvisorRole = { company: string; role: string; startYear?: number; current?: boolean };
type CompanyFounded = { name: string; year?: number; status?: string; description?: string };
type AchievementItem = { title: string; year?: number; issuer?: string; description?: string };

export default function PersonEditor() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = Boolean(params.id && params.id !== "new");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [activeTab, setActiveTab] = useState("identity");

  // ── Form State ──
  const [form, setForm] = useState({
    name: "", slug: "", title: "", company: "", companyId: null as number | null,
    bio: "", shortBio: "", email: "", phone: "", location: "",
    avatar: "", linkedIn: "", twitter: "", website: "",
    facebook: "", instagram: "", youtube: "", github: "",
    gender: "", nationality: "",
    isVerified: false, isFeatured: false,
    availability: "", bookingRate: "",
  });

  // JSON array fields
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [functionalStrengths, setFunctionalStrengths] = useState<string[]>([]);
  const [openTo, setOpenTo] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [angelInvestments, setAngelInvestments] = useState<InvestmentItem[]>([]);
  const [boardRoles, setBoardRoles] = useState<BoardRole[]>([]);
  const [advisorRoles, setAdvisorRoles] = useState<AdvisorRole[]>([]);
  const [companiesFounded, setCompaniesFounded] = useState<CompanyFounded[]>([]);
  const [keyAchievements, setKeyAchievements] = useState<AchievementItem[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);

  // Temp inputs for tag-style fields
  const [langInput, setLangInput] = useState("");
  const [strengthInput, setStrengthInput] = useState("");
  const [openToInput, setOpenToInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [achievementInput, setAchievementInput] = useState("");

  // ── Data Loading ──
  const { data: person, isLoading } = trpc.people.adminGet.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: isEdit && !!params.id && params.id !== "new" }
  );

  useEffect(() => {
    if (person) {
      const p = person as any;
      setForm({
        name: p.name || "", slug: p.slug || "", title: p.title || "",
        company: p.company || "", companyId: p.companyId || null,
        bio: p.bio || "", shortBio: p.shortBio || "",
        email: p.email || "", phone: p.phone || "", location: p.location || "",
        avatar: p.avatar || "", linkedIn: p.linkedIn || "", twitter: p.twitter || "",
        website: p.website || "", facebook: p.facebook || "",
        instagram: p.instagram || "", youtube: p.youtube || "", github: p.github || "",
        gender: p.gender || "", nationality: p.nationality || "",
        isVerified: !!p.isVerified, isFeatured: !!p.isFeatured,
        availability: p.availability || "", bookingRate: p.bookingRate || "",
      });
      if (p.avatar) setImagePreview(p.avatar);
      if (Array.isArray(p.experience)) setExperience(p.experience);
      if (Array.isArray(p.education)) setEducation(p.education);
      if (Array.isArray(p.languages)) setLanguages(p.languages);
      if (Array.isArray(p.functionalStrengths)) setFunctionalStrengths(p.functionalStrengths);
      if (Array.isArray(p.openTo)) setOpenTo(p.openTo);
      if (Array.isArray(p.interests)) setInterests(p.interests);
      if (Array.isArray(p.angelInvestments)) setAngelInvestments(p.angelInvestments);
      if (Array.isArray(p.boardRoles)) setBoardRoles(p.boardRoles);
      if (Array.isArray(p.advisorRoles)) setAdvisorRoles(p.advisorRoles);
      if (Array.isArray(p.companiesFounded)) setCompaniesFounded(p.companiesFounded);
      if (Array.isArray(p.keyAchievements)) setKeyAchievements(p.keyAchievements);
      if (Array.isArray(p.achievements)) setAchievements(p.achievements);
    }
  }, [person]);

  // ── Mutations ──
  const transitionMutation = trpc.people.transition.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      window.location.reload();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createMutation = trpc.people.create.useMutation({
    onSuccess: (data) => { toast.success("Person created"); navigate("/admin/people"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.people.update.useMutation({
    onSuccess: () => { toast.success("Person updated"); navigate("/admin/people"); },
    onError: (e) => toast.error(e.message),
  });

  const aiSuggestMutation = trpc.admin.ai.suggestPersonInfo.useMutation({
    onSuccess: (data) => {
      if (data) {
        setForm(prev => ({
          ...prev,
          bio: data.bio || prev.bio,
          shortBio: data.shortBio || prev.shortBio,
          title: data.title || prev.title,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formDataUpload });
      if (!response.ok) throw new Error(await response.text());
      const { url } = await response.json();
      setForm(prev => ({ ...prev, avatar: url }));
      setImagePreview(url);
      toast.success("Photo uploaded");
    } catch (err) { toast.error("Upload failed: " + String(err)); } finally { setIsUploading(false); }
  };

  const handleAISuggest = async () => {
    if (!form.name.trim()) { toast.error("Enter a name first"); return; }
    setIsGeneratingAI(true);
    try { await aiSuggestMutation.mutateAsync({ name: form.name, company: form.company || undefined }); }
    finally { setIsGeneratingAI(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.slug.trim()) { toast.error("Slug is required"); return; }

    const data: any = {
      name: form.name, slug: form.slug,
      title: form.title || undefined, company: form.company || undefined,
      bio: form.bio || undefined, shortBio: form.shortBio || undefined,
      email: form.email || undefined, phone: form.phone || undefined,
      location: form.location || undefined, avatar: form.avatar || undefined,
      linkedIn: form.linkedIn || undefined, twitter: form.twitter || undefined,
      website: form.website || undefined, facebook: form.facebook || undefined,
      instagram: form.instagram || undefined, youtube: form.youtube || undefined,
      github: form.github || undefined,
      gender: form.gender || undefined, nationality: form.nationality || undefined,
      isVerified: form.isVerified,
      availability: form.availability || undefined, bookingRate: form.bookingRate || undefined,
      experience: experience.length > 0 ? experience : undefined,
      education: education.length > 0 ? education : undefined,
      languages: languages.length > 0 ? languages : undefined,
      functionalStrengths: functionalStrengths.length > 0 ? functionalStrengths : undefined,
      openTo: openTo.length > 0 ? openTo : undefined,
      interests: interests.length > 0 ? interests : undefined,
      angelInvestments: angelInvestments.length > 0 ? angelInvestments : undefined,
      boardRoles: boardRoles.length > 0 ? boardRoles : undefined,
      advisorRoles: advisorRoles.length > 0 ? advisorRoles : undefined,
      companiesFounded: companiesFounded.length > 0 ? companiesFounded : undefined,
      keyAchievements: keyAchievements.length > 0 ? keyAchievements : undefined,
      achievements: achievements.length > 0 ? achievements : undefined,
    };

    if (isEdit) {
      updateMutation.mutate({ id: parseInt(params.id!), ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // ── Tag Input Helper ──
  const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const val = input.trim();
    if (val && !list.includes(val)) { setList([...list, val]); }
    setInput("");
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
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
            <Link href="/admin/people">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Person" : "New Person"}</h1>
              <p className="text-muted-foreground text-sm">{isEdit ? `Editing: ${form.name}` : "Add a new person to the directory"}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isEdit && (person as any)?.availableTransitions?.map((t: any) => (
              <Button
                key={t.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => transitionMutation.mutate({ personId: parseInt(params.id!), transitionId: t.id })}
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
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#F0F7FF] dark:bg-emerald-950/30 text-[#0066FF] dark:text-[#80B3FF] border-b-2 border-[#0066FF]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══ TAB: PERSONAL IDENTITY ═══ */}
        {activeTab === "identity" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Basic Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onBlur={() => !form.slug && generateSlug()} placeholder="e.g. Mudassir Sheikha" />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug *</Label>
                      <div className="flex gap-2">
                        <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="mudassir-sheikha" />
                        <Button type="button" variant="outline" onClick={generateSlug}>Generate</Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job Title</Label>
                      <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="CEO & Co-Founder" />
                    </div>
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <CompanyCombobox value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Select or create company..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Dubai, UAE" className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nationality</Label>
                      <Input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} placeholder="e.g. Pakistani" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Short Bio</Label>
                    <Textarea value={form.shortBio} onChange={e => setForm({ ...form, shortBio: e.target.value })} placeholder="A brief one-line bio..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Bio</Label>
                    <RichTextEditor content={form.bio} onChange={(content) => setForm({ ...form, bio: content })} placeholder="Write a detailed biography..." />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+971 50 123 4567" className="pl-10" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Profile Photo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Profile" className="w-32 h-32 object-cover rounded-full border-4 border-[#E0E3E8]" />
                        <button type="button" onClick={() => { setForm({ ...form, avatar: "" }); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-[#C8CDD6] rounded-full flex items-center justify-center bg-[#F7F8FA]"><User className="h-12 w-12 text-[#9BA3B0]" /></div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
                      <Upload className="h-4 w-4 mr-2" />{isUploading ? "Uploading..." : "Upload Photo"}
                    </Button>
                    <div className="w-full pt-2 border-t">
                      <Label className="text-xs text-muted-foreground">Or enter image URL</Label>
                      <Input value={form.avatar} onChange={e => { setForm({ ...form, avatar: e.target.value }); if (e.target.value) setImagePreview(e.target.value); }} placeholder="https://example.com/photo.jpg" className="mt-1 text-sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ═══ TAB: CAREER & EDUCATION ═══ */}
        {activeTab === "career" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Work Experience</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setExperience([...experience, { company: "", role: "", current: false }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Position
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {experience.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No experience entries yet. Click "Add Position" to begin.</p>}
                {experience.map((exp, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setExperience(experience.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Company *</Label>
                        <Input value={exp.company} onChange={e => { const n = [...experience]; n[i] = { ...n[i], company: e.target.value }; setExperience(n); }} placeholder="Company name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Role *</Label>
                        <Input value={exp.role} onChange={e => { const n = [...experience]; n[i] = { ...n[i], role: e.target.value }; setExperience(n); }} placeholder="Job title" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Start Year</Label>
                        <Input type="number" value={exp.startYear || ""} onChange={e => { const n = [...experience]; n[i] = { ...n[i], startYear: e.target.value ? parseInt(e.target.value) : undefined }; setExperience(n); }} placeholder="2020" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End Year</Label>
                        <Input type="number" value={exp.endYear || ""} onChange={e => { const n = [...experience]; n[i] = { ...n[i], endYear: e.target.value ? parseInt(e.target.value) : undefined }; setExperience(n); }} placeholder="2024" disabled={exp.current} />
                      </div>
                      <div className="flex items-end gap-2 pb-1">
                        <Switch checked={exp.current || false} onCheckedChange={c => { const n = [...experience]; n[i] = { ...n[i], current: c, endYear: c ? undefined : n[i].endYear }; setExperience(n); }} />
                        <Label className="text-xs">Current</Label>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea value={exp.description || ""} onChange={e => { const n = [...experience]; n[i] = { ...n[i], description: e.target.value }; setExperience(n); }} placeholder="Key responsibilities and achievements..." rows={2} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" />Education</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEducation([...education, { institution: "", degree: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Education
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {education.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No education entries yet.</p>}
                {education.map((edu, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setEducation(education.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Institution *</Label>
                        <Input value={edu.institution} onChange={e => { const n = [...education]; n[i] = { ...n[i], institution: e.target.value }; setEducation(n); }} placeholder="University name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Degree *</Label>
                        <Input value={edu.degree} onChange={e => { const n = [...education]; n[i] = { ...n[i], degree: e.target.value }; setEducation(n); }} placeholder="MBA, BSc, etc." />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Field of Study</Label>
                        <Input value={edu.field || ""} onChange={e => { const n = [...education]; n[i] = { ...n[i], field: e.target.value }; setEducation(n); }} placeholder="Computer Science" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Graduation Year</Label>
                        <Input type="number" value={edu.year || ""} onChange={e => { const n = [...education]; n[i] = { ...n[i], year: e.target.value ? parseInt(e.target.value) : undefined }; setEducation(n); }} placeholder="2015" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Languages className="h-5 w-5" />Languages</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {languages.map((lang, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">{lang}<button type="button" onClick={() => removeTag(languages, setLanguages, i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(languages, setLanguages, langInput, setLangInput); } }} placeholder="Type a language and press Enter" />
                  <Button type="button" variant="outline" onClick={() => addTag(languages, setLanguages, langInput, setLangInput)}>Add</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: EXPERTISE & SKILLS ═══ */}
        {activeTab === "expertise" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Functional Strengths</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Core competencies and areas of expertise (e.g., Product Strategy, Growth Marketing, Fundraising)</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {functionalStrengths.map((s, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">{s}<button type="button" onClick={() => removeTag(functionalStrengths, setFunctionalStrengths, i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={strengthInput} onChange={e => setStrengthInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(functionalStrengths, setFunctionalStrengths, strengthInput, setStrengthInput); } }} placeholder="Add a strength and press Enter" />
                  <Button type="button" variant="outline" onClick={() => addTag(functionalStrengths, setFunctionalStrengths, strengthInput, setStrengthInput)}>Add</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5" />Open To</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">What this person is open to (e.g., Advisory Roles, Angel Investing, Speaking Engagements, Mentoring)</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {openTo.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">{item}<button type="button" onClick={() => removeTag(openTo, setOpenTo, i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={openToInput} onChange={e => setOpenToInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(openTo, setOpenTo, openToInput, setOpenToInput); } }} placeholder="Add an item and press Enter" />
                  <Button type="button" variant="outline" onClick={() => addTag(openTo, setOpenTo, openToInput, setOpenToInput)}>Add</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: INVESTMENTS & VENTURES ═══ */}
        {activeTab === "investments" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Angel Investments</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAngelInvestments([...angelInvestments, { company: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Investment
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {angelInvestments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No investments recorded yet.</p>}
                {angelInvestments.map((inv, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setAngelInvestments(angelInvestments.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Company *</Label>
                        <Input value={inv.company} onChange={e => { const n = [...angelInvestments]; n[i] = { ...n[i], company: e.target.value }; setAngelInvestments(n); }} placeholder="Company name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Amount</Label>
                        <Input value={inv.amount || ""} onChange={e => { const n = [...angelInvestments]; n[i] = { ...n[i], amount: e.target.value }; setAngelInvestments(n); }} placeholder="$50K" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Year</Label>
                        <Input type="number" value={inv.year || ""} onChange={e => { const n = [...angelInvestments]; n[i] = { ...n[i], year: e.target.value ? parseInt(e.target.value) : undefined }; setAngelInvestments(n); }} placeholder="2023" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sector</Label>
                        <Input value={inv.sector || ""} onChange={e => { const n = [...angelInvestments]; n[i] = { ...n[i], sector: e.target.value }; setAngelInvestments(n); }} placeholder="Fintech" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Companies Founded</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCompaniesFounded([...companiesFounded, { name: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Company
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {companiesFounded.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No companies founded yet.</p>}
                {companiesFounded.map((comp, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setCompaniesFounded(companiesFounded.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Company Name *</Label>
                        <Input value={comp.name} onChange={e => { const n = [...companiesFounded]; n[i] = { ...n[i], name: e.target.value }; setCompaniesFounded(n); }} placeholder="Company name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Year Founded</Label>
                        <Input type="number" value={comp.year || ""} onChange={e => { const n = [...companiesFounded]; n[i] = { ...n[i], year: e.target.value ? parseInt(e.target.value) : undefined }; setCompaniesFounded(n); }} placeholder="2018" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Input value={comp.status || ""} onChange={e => { const n = [...companiesFounded]; n[i] = { ...n[i], status: e.target.value }; setCompaniesFounded(n); }} placeholder="Active / Acquired / Closed" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea value={comp.description || ""} onChange={e => { const n = [...companiesFounded]; n[i] = { ...n[i], description: e.target.value }; setCompaniesFounded(n); }} placeholder="Brief description..." rows={2} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: BOARD & ADVISORY ═══ */}
        {activeTab === "leadership" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Board Roles</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setBoardRoles([...boardRoles, { company: "", role: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Board Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {boardRoles.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No board roles listed.</p>}
                {boardRoles.map((br, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setBoardRoles(boardRoles.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Company *</Label>
                        <Input value={br.company} onChange={e => { const n = [...boardRoles]; n[i] = { ...n[i], company: e.target.value }; setBoardRoles(n); }} placeholder="Company name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Role *</Label>
                        <Input value={br.role} onChange={e => { const n = [...boardRoles]; n[i] = { ...n[i], role: e.target.value }; setBoardRoles(n); }} placeholder="Board Member / Chairman" />
                      </div>
                      <div className="space-y-1 flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Start Year</Label>
                          <Input type="number" value={br.startYear || ""} onChange={e => { const n = [...boardRoles]; n[i] = { ...n[i], startYear: e.target.value ? parseInt(e.target.value) : undefined }; setBoardRoles(n); }} placeholder="2020" />
                        </div>
                        <div className="flex items-center gap-2 pb-1">
                          <Switch checked={br.current || false} onCheckedChange={c => { const n = [...boardRoles]; n[i] = { ...n[i], current: c }; setBoardRoles(n); }} />
                          <Label className="text-xs">Current</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Handshake className="h-5 w-5" />Advisory Roles</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAdvisorRoles([...advisorRoles, { company: "", role: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Advisory Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {advisorRoles.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No advisory roles listed.</p>}
                {advisorRoles.map((ar, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setAdvisorRoles(advisorRoles.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Company *</Label>
                        <Input value={ar.company} onChange={e => { const n = [...advisorRoles]; n[i] = { ...n[i], company: e.target.value }; setAdvisorRoles(n); }} placeholder="Company name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Role *</Label>
                        <Input value={ar.role} onChange={e => { const n = [...advisorRoles]; n[i] = { ...n[i], role: e.target.value }; setAdvisorRoles(n); }} placeholder="Strategic Advisor" />
                      </div>
                      <div className="space-y-1 flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Start Year</Label>
                          <Input type="number" value={ar.startYear || ""} onChange={e => { const n = [...advisorRoles]; n[i] = { ...n[i], startYear: e.target.value ? parseInt(e.target.value) : undefined }; setAdvisorRoles(n); }} placeholder="2021" />
                        </div>
                        <div className="flex items-center gap-2 pb-1">
                          <Switch checked={ar.current || false} onCheckedChange={c => { const n = [...advisorRoles]; n[i] = { ...n[i], current: c }; setAdvisorRoles(n); }} />
                          <Label className="text-xs">Current</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: ACHIEVEMENTS ═══ */}
        {activeTab === "achievements" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Key Achievements & Awards</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setKeyAchievements([...keyAchievements, { title: "" }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Achievement
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {keyAchievements.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No achievements recorded yet.</p>}
                {keyAchievements.map((ach, i) => (
                  <div key={i} className="p-4 border rounded-md space-y-3 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => setKeyAchievements(keyAchievements.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Title *</Label>
                        <Input value={ach.title} onChange={e => { const n = [...keyAchievements]; n[i] = { ...n[i], title: e.target.value }; setKeyAchievements(n); }} placeholder="Forbes 30 Under 30" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Year</Label>
                        <Input type="number" value={ach.year || ""} onChange={e => { const n = [...keyAchievements]; n[i] = { ...n[i], year: e.target.value ? parseInt(e.target.value) : undefined }; setKeyAchievements(n); }} placeholder="2023" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Issuer</Label>
                        <Input value={ach.issuer || ""} onChange={e => { const n = [...keyAchievements]; n[i] = { ...n[i], issuer: e.target.value }; setKeyAchievements(n); }} placeholder="Forbes" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea value={ach.description || ""} onChange={e => { const n = [...keyAchievements]; n[i] = { ...n[i], description: e.target.value }; setKeyAchievements(n); }} placeholder="Details about this achievement..." rows={2} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Quick Achievements (Tags)</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Short achievement labels displayed as badges on the profile</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {achievements.map((a, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">{a}<button type="button" onClick={() => removeTag(achievements, setAchievements, i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={achievementInput} onChange={e => setAchievementInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(achievements, setAchievements, achievementInput, setAchievementInput); } }} placeholder="Type and press Enter" />
                  <Button type="button" variant="outline" onClick={() => addTag(achievements, setAchievements, achievementInput, setAchievementInput)}>Add</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: LINKS & SOCIAL ═══ */}
        {activeTab === "social" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Professional Links</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="h-4 w-4" />Personal Website</Label>
                  <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Linkedin className="h-4 w-4" />LinkedIn</Label>
                  <Input value={form.linkedIn} onChange={e => setForm({ ...form, linkedIn: e.target.value })} placeholder="https://linkedin.com/in/username" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Github className="h-4 w-4" />GitHub</Label>
                  <Input value={form.github} onChange={e => setForm({ ...form, github: e.target.value })} placeholder="https://github.com/username" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Social Media</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Twitter className="h-4 w-4" />Twitter / X</Label>
                  <Input value={form.twitter} onChange={e => setForm({ ...form, twitter: e.target.value })} placeholder="https://twitter.com/username" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Facebook className="h-4 w-4" />Facebook</Label>
                  <Input value={form.facebook} onChange={e => setForm({ ...form, facebook: e.target.value })} placeholder="https://facebook.com/username" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" />Instagram</Label>
                  <Input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="https://instagram.com/username" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Youtube className="h-4 w-4" />YouTube</Label>
                  <Input value={form.youtube} onChange={e => setForm({ ...form, youtube: e.target.value })} placeholder="https://youtube.com/@channel" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: AVAILABILITY & INTERESTS ═══ */}
        {activeTab === "preferences" && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" />Availability & Booking</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Availability Status</Label>
                    <Select value={form.availability} onValueChange={v => setForm({ ...form, availability: v })}>
                      <SelectTrigger><SelectValue placeholder="Select availability" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="limited">Limited Availability</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="not_available">Not Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Booking Rate</Label>
                    <Input value={form.bookingRate} onChange={e => setForm({ ...form, bookingRate: e.target.value })} placeholder="e.g. $500/hr, Free for startups" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Personal Interests</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Hobbies, passions, and personal interests</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {interests.map((item, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">{item}<button type="button" onClick={() => removeTag(interests, setInterests, i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={interestInput} onChange={e => setInterestInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(interests, setInterests, interestInput, setInterestInput); } }} placeholder="Type an interest and press Enter" />
                  <Button type="button" variant="outline" onClick={() => addTag(interests, setInterests, interestInput, setInterestInput)}>Add</Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
                    <p className="text-sm text-muted-foreground">Mark this profile as verified with a badge</p>
                  </div>
                  <Switch checked={form.isVerified} onCheckedChange={c => setForm({ ...form, isVerified: c })} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Featured Profile</Label>
                    <p className="text-sm text-muted-foreground">Display this profile prominently in listings</p>
                  </div>
                  <Switch checked={form.isFeatured} onCheckedChange={c => setForm({ ...form, isFeatured: c })} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === "seo" && (
          <div className="max-w-3xl">
            <EntitySeoTab
              entityType="people"
              entityId={isEdit ? parseInt(params.id) : null}
              entityName={form.name || "Person Profile"}
              entityDescription={form.shortBio || form.bio?.slice(0, 200) || undefined}
              entityUrl={`/people/${form.slug}`}
            />
          </div>
        )}
      </form>
    </AdminLayout>
  );
}
