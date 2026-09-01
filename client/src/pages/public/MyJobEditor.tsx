/**
 * User-facing Job Editor
 * SAP Fiori-inspired tabbed form — restricted to user's claimed companies only
 * If user has no claimed companies, they are prompted to claim one first
 */

import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Briefcase, Save, Loader2, Building2, ShieldCheck,
  AlertTriangle, CheckCircle2, ChevronRight, DollarSign, FileText,
  Settings2, MapPin, Globe
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const TABS = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "details", label: "Job Details", icon: FileText },
  { id: "compensation", label: "Compensation", icon: DollarSign },
  { id: "requirements", label: "Requirements", icon: Settings2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MyJobEditor() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string; companyId: string }>();
  const isEdit = !!params.id;
  const [activeTab, setActiveTab] = useState<TabId>("company");

  // Get user's claimed companies
  const { data: claimedCompanies, isLoading: loadingClaimed } = trpc.claimedProfiles.myClaimedCompanies.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Also get companies created by user (fallback)
  const { data: myCompaniesData } = trpc.userContent.myCompanies.useQuery(
    { page: 1, limit: 100 },
    { enabled: !!user }
  );

  // Merge claimed + created companies (deduplicated)
  const availableCompanies = useMemo(() => {
    const map = new Map<number, { id: number; name: string; logo: string | null; website: string | null; isClaimed: boolean }>();
    if (claimedCompanies) {
      for (const c of claimedCompanies) {
        if (c.company) {
          map.set(c.company.id, {
            id: c.company.id,
            name: c.company.name,
            logo: c.company.logo,
            website: c.company.website,
            isClaimed: true,
          });
        }
      }
    }
    if (myCompaniesData?.items) {
      for (const c of myCompaniesData.items) {
        if (!map.has(c.id)) {
          map.set(c.id, { id: c.id, name: c.name, logo: c.logo || null, website: null, isClaimed: false });
        }
      }
    }
    return Array.from(map.values());
  }, [claimedCompanies, myCompaniesData]);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    jobType: "full_time",
    experienceLevel: "mid",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "USD",
    isRemote: false,
    applicationUrl: "",
    applicationEmail: "",
    requirements: "",
    benefits: "",
    skills: "",
  });
  const [saving, setSaving] = useState(false);

  // Pre-select company from URL param
  useEffect(() => {
    if (params.companyId && availableCompanies.length > 0) {
      const match = availableCompanies.find(c => c.id === Number(params.companyId));
      if (match) setSelectedCompanyId(String(match.id));
    }
  }, [params.companyId, availableCompanies]);

  // Auto-select if only one company
  useEffect(() => {
    if (!selectedCompanyId && availableCompanies.length === 1) {
      setSelectedCompanyId(String(availableCompanies[0].id));
    }
  }, [availableCompanies, selectedCompanyId]);

  const selectedCompany = useMemo(() => {
    return availableCompanies.find(c => String(c.id) === selectedCompanyId);
  }, [availableCompanies, selectedCompanyId]);

  const createMutation = trpc.userContent.createJob.useMutation({
    onSuccess: () => {
      toast.success("Job submitted for review!");
      navigate("/dashboard/my-content");
    },
    onError: (err) => {
      toast.error(err.message);
      setSaving(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Job title is required"); setActiveTab("details"); return; }
    if (!selectedCompany) { toast.error("Please select a company"); setActiveTab("company"); return; }
    setSaving(true);
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description || undefined,
      companyName: selectedCompany.name,
      companyLogo: selectedCompany.logo || undefined,
      companyWebsite: selectedCompany.website || undefined,
      companyId: selectedCompany.id,
      location: form.location || undefined,
      roleType: form.jobType as any,
      seniority: form.experienceLevel as any,
      salaryMin: form.salaryMin ? parseInt(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? parseInt(form.salaryMax) : undefined,
      salaryCurrency: form.salaryCurrency || undefined,
      isRemote: form.isRemote,
      applyUrl: form.applicationUrl || undefined,
      requirements: form.requirements || undefined,
      benefits: form.benefits || undefined,
    });
  };

  // Tab completion status
  const tabStatus = useMemo(() => ({
    company: !!selectedCompany,
    details: !!form.title.trim(),
    compensation: !!(form.salaryMin || form.salaryMax),
    requirements: !!(form.requirements || form.skills),
  }), [selectedCompany, form]);

  const goNext = () => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id);
  };

  const goPrev = () => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    if (idx > 0) setActiveTab(TABS[idx - 1].id);
  };

  if (authLoading || loadingClaimed) {
    return (
      <>
      <Header />
      <div className="container max-w-5xl py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
          <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
        </div>
      </div>
      <Footer />
      </>
    );
  }

  if (!user) { navigate("/signin"); return null; }

  // No companies available — prompt to claim or create
  if (availableCompanies.length === 0) {
    return (
      <>
      <Header />
      <div className="container max-w-5xl py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/my-content">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" /> My Content
            </Button>
          </Link>
        </div>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col items-center text-center py-12 px-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">No Company Linked</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              To post a job, you need to have a company profile. You can either claim an existing company
              or create a new one first.
            </p>
            <div className="flex gap-3">
              <Link href="/claimed-profiles">
                <Button variant="outline" className="gap-2">
                  <ShieldCheck className="w-4 h-4" /> Claim a Company
                </Button>
              </Link>
              <Link href="/dashboard/my-content/company/new">
                <Button className="gap-2">
                  <Building2 className="w-4 h-4" /> Create Company
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
      </>
    );
  }

  return (
    <>
    <Header />
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/dashboard/my-content">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" /> My Content
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-[Poppins] tracking-tight">
              {isEdit ? "Edit Job Posting" : "Post a New Job"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Your job posting will be reviewed before publishing
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          {/* Left sidebar — SAP Fiori step navigation */}
          <div className="space-y-1">
            {TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isComplete = tabStatus[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all text-sm font-medium ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-sm"
                      : "hover:bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isComplete
                      ? "bg-emerald-500 text-white"
                      : isActive
                        ? "bg-emerald-500/20 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block">{tab.label}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {tab.id === "company" && (selectedCompany ? selectedCompany.name : "Select company")}
                      {tab.id === "details" && (form.title ? form.title : "Title, type, location")}
                      {tab.id === "compensation" && (form.salaryMin ? `${form.salaryCurrency} ${form.salaryMin}–${form.salaryMax}` : "Salary & benefits")}
                      {tab.id === "requirements" && (form.skills ? form.skills.substring(0, 30) : "Skills & how to apply")}
                    </span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 shrink-0 text-emerald-500" />}
                </button>
              );
            })}

            {/* Submit button on sidebar for desktop */}
            <div className="pt-4 hidden lg:block">
              <Button
                type="submit"
                disabled={saving || !form.title.trim() || !selectedCompany}
                className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md"
                size="lg"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Save className="w-4 h-4" /> Submit for Review</>
                )}
              </Button>
            </div>
          </div>

          {/* Right content area */}
          <div className="space-y-6">
            {/* ===== COMPANY TAB ===== */}
            {activeTab === "company" && (
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <CardTitle className="text-base font-[Poppins]">Posting Company</CardTitle>
                  </div>
                  <CardDescription>Select which of your companies this job is for</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {availableCompanies.length === 1 ? (
                    <div className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/20">
                      <div className="w-14 h-14 rounded-xl bg-white border shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                        {selectedCompany?.logo ? (
                          <img src={selectedCompany.logo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-lg">{selectedCompany?.name}</p>
                        {selectedCompany?.website && (
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {selectedCompany.website}
                          </p>
                        )}
                      </div>
                      {selectedCompany?.isClaimed && (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 shrink-0 px-3 py-1">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Verified
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Select Company <span className="text-red-500">*</span></Label>
                      <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Choose a company..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCompanies.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              <span className="flex items-center gap-2">
                                {c.name}
                                {!!c.isClaimed && (
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px] px-1 py-0">
                                    Verified
                                  </Badge>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedCompany && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
                          <div className="w-10 h-10 rounded-lg bg-white border shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            {selectedCompany.logo ? (
                              <img src={selectedCompany.logo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{selectedCompany.name}</p>
                            {selectedCompany.website && (
                              <p className="text-xs text-muted-foreground">{selectedCompany.website}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end mt-6">
                    <Button type="button" onClick={goNext} className="gap-1.5" disabled={!selectedCompany}>
                      Next: Job Details <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ===== JOB DETAILS TAB ===== */}
            {activeTab === "details" && (
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <CardTitle className="text-base font-[Poppins]">Job Details</CardTitle>
                  </div>
                  <CardDescription>Core information about the position</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Job Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Senior React Native Developer"
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Job Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe the role, responsibilities, and what you're looking for..."
                      rows={8}
                      className="resize-y"
                    />
                    <p className="text-xs text-muted-foreground">Markdown formatting is supported</p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Job Type</Label>
                      <Select value={form.jobType} onValueChange={(v) => setForm({ ...form, jobType: v })}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="freelance">Freelance</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Experience Level</Label>
                      <Select value={form.experienceLevel} onValueChange={(v) => setForm({ ...form, experienceLevel: v })}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entry Level</SelectItem>
                          <SelectItem value="mid">Mid Level</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Location
                      </Label>
                      <Input
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="e.g. Dubai, UAE"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border">
                    <Switch
                      checked={form.isRemote}
                      onCheckedChange={(v) => setForm({ ...form, isRemote: v })}
                    />
                    <div>
                      <Label className="text-sm font-medium cursor-pointer">Remote Position</Label>
                      <p className="text-xs text-muted-foreground">This job can be performed remotely</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="outline" onClick={goPrev} className="gap-1.5">
                      <ArrowLeft className="w-4 h-4" /> Company
                    </Button>
                    <Button type="button" onClick={goNext} className="gap-1.5" disabled={!form.title.trim()}>
                      Next: Compensation <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ===== COMPENSATION TAB ===== */}
            {activeTab === "compensation" && (
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <CardTitle className="text-base font-[Poppins]">Compensation</CardTitle>
                  </div>
                  <CardDescription>Salary range and benefits (optional but recommended)</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <p className="text-sm text-blue-700">
                      <strong>Tip:</strong> Job postings with salary information receive up to 3x more applications.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Salary Min</Label>
                      <Input
                        value={form.salaryMin}
                        onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                        placeholder="e.g. 80000"
                        type="number"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Salary Max</Label>
                      <Input
                        value={form.salaryMax}
                        onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                        placeholder="e.g. 120000"
                        type="number"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Currency</Label>
                      <Select value={form.salaryCurrency} onValueChange={(v) => setForm({ ...form, salaryCurrency: v })}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="AED">AED (د.إ)</SelectItem>
                          <SelectItem value="SAR">SAR (﷼)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="EGP">EGP (E£)</SelectItem>
                          <SelectItem value="QAR">QAR (﷼)</SelectItem>
                          <SelectItem value="BHD">BHD (.د.ب)</SelectItem>
                          <SelectItem value="KWD">KWD (د.ك)</SelectItem>
                          <SelectItem value="OMR">OMR (﷼)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Benefits</Label>
                    <Textarea
                      value={form.benefits}
                      onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                      placeholder="e.g. Health insurance, equity, remote work, annual bonus, gym membership..."
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="outline" onClick={goPrev} className="gap-1.5">
                      <ArrowLeft className="w-4 h-4" /> Job Details
                    </Button>
                    <Button type="button" onClick={goNext} className="gap-1.5">
                      Next: Requirements <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ===== REQUIREMENTS TAB ===== */}
            {activeTab === "requirements" && (
              <Card className="shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-emerald-600" />
                    <CardTitle className="text-base font-[Poppins]">Requirements & Application</CardTitle>
                  </div>
                  <CardDescription>Skills, requirements, and how candidates should apply</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Requirements</Label>
                    <Textarea
                      value={form.requirements}
                      onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                      placeholder="List the key requirements for this role...&#10;&#10;• 5+ years of experience with React Native&#10;• Strong TypeScript skills&#10;• Experience with CI/CD pipelines"
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Skills (comma-separated)</Label>
                    <Input
                      value={form.skills}
                      onChange={(e) => setForm({ ...form, skills: e.target.value })}
                      placeholder="e.g. React Native, TypeScript, Node.js, AWS"
                      className="h-11"
                    />
                    {form.skills && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {form.skills.split(",").filter(s => s.trim()).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-5">
                    <h3 className="text-sm font-semibold mb-3">Application Method</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" /> External Application URL
                        </Label>
                        <Input
                          value={form.applicationUrl}
                          onChange={(e) => setForm({ ...form, applicationUrl: e.target.value })}
                          placeholder="https://careers.example.com/apply"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Application Email</Label>
                        <Input
                          value={form.applicationEmail}
                          onChange={(e) => setForm({ ...form, applicationEmail: e.target.value })}
                          placeholder="hr@example.com"
                          className="h-11"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Leave both empty to accept applications directly through TechScoop
                    </p>
                  </div>

                  {/* Final submit area */}
                  <div className="border-t pt-5">
                    <div className="flex items-center justify-between">
                      <Button type="button" variant="outline" onClick={goPrev} className="gap-1.5">
                        <ArrowLeft className="w-4 h-4" /> Compensation
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving || !form.title.trim() || !selectedCompany}
                        className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md px-6"
                        size="lg"
                      >
                        {saving ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                        ) : (
                          <><Save className="w-4 h-4" /> Submit Job for Review</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mobile submit button */}
            <div className="lg:hidden">
              <Button
                type="submit"
                disabled={saving || !form.title.trim() || !selectedCompany}
                className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md"
                size="lg"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Save className="w-4 h-4" /> Submit Job for Review</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
    <Footer />
    </>
  );
}
