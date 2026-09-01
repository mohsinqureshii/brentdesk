/**
 * Job Editor Page
 * Create and edit job listings with live API integration
 * Single-page form with sections (SAP Fiori-style)
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft, Save, Loader2, Building2, Plus, Check, ChevronsUpDown,
  Briefcase, MapPin, DollarSign, Settings, X, Sparkles, Globe, Tag, Search
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { EntitySeoTab } from "@/components/admin/EntitySeoTab";

// ============================================================
// CURRENCIES
// ============================================================
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  { code: "QAR", name: "Qatari Riyal", symbol: "ر.ق" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD" },
  { code: "OMR", name: "Omani Rial", symbol: "ر.ع" },
  { code: "JOD", name: "Jordanian Dinar", symbol: "JD" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
];

// ============================================================
// FORM DATA INTERFACE
// ============================================================
interface JobFormData {
  title: string;
  slug: string;
  description: string;
  requirements: string;
  companyId: number | null;
  companyName: string;
  companyLogo: string;
  companyWebsite: string;
  location: string;
  countryId: number | null;
  cityId: number | null;
  remoteType: "fully_remote" | "hybrid" | "on_site";
  roleType: "full_time" | "part_time" | "contract" | "internship" | "freelance";
  seniority: "entry" | "mid" | "senior" | "lead" | "executive";
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: "hourly" | "monthly" | "yearly";
  applyUrl: string;
  applyEmail: string;
  isFeatured: boolean;
  isRemote: boolean;
  expiresAt: string;
  skills: string[];
  department: string;
}

const DEFAULT_JOB: JobFormData = {
  title: "",
  slug: "",
  description: "",
  requirements: "",
  companyId: null,
  companyName: "",
  companyLogo: "",
  companyWebsite: "",
  location: "",
  countryId: null,
  cityId: null,
  remoteType: "on_site",
  roleType: "full_time",
  seniority: "mid",
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: "USD",
  salaryPeriod: "yearly",
  applyUrl: "",
  applyEmail: "",
  isFeatured: false,
  isRemote: false,
  expiresAt: "",
  skills: [],
  department: "",
};

export default function JobEditor() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const isNew = !params.id || params.id === "new";

  const [job, setJob] = useState<JobFormData>({ ...DEFAULT_JOB });
  const [isSaving, setIsSaving] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyWebsite, setNewCompanyWebsite] = useState("");
  const [newCompanyLogo, setNewCompanyLogo] = useState("");

  // Title suggestions
  const [titleQuery, setTitleQuery] = useState("");
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);

  // Skills input
  const [skillInput, setSkillInput] = useState("");
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const skillRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // DATA QUERIES
  // ============================================================

  // Skill suggestions
  const { data: skillSuggestions } = trpc.jobs.suggestSkills.useQuery(
    { query: skillInput },
    { enabled: skillInput.length >= 1, staleTime: 60000 }
  );

  const { data: companiesList } = trpc.companies.dropdown.useQuery(
    { search: companySearch || undefined },
    { staleTime: 30000 }
  );

  const { data: existingJob, isLoading: isLoadingJob } = trpc.jobs.adminGet.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: !isNew && !!params.id }
  );

  // Location data
  const { data: countriesList } = trpc.jobs.listCountries.useQuery(undefined, { staleTime: 60000 });
  const { data: citiesList } = trpc.jobs.listCities.useQuery(
    { countryId: job.countryId! },
    { enabled: !!job.countryId, staleTime: 60000 }
  );

  // Title suggestions
  const [debouncedTitleQuery] = useDebounce(titleQuery, 300);
  const { data: titleSuggestions } = trpc.jobs.suggestTitles.useQuery(
    { query: debouncedTitleQuery },
    { enabled: debouncedTitleQuery.length >= 2 && showTitleSuggestions }
  );

  // ============================================================
  // MUTATIONS
  // ============================================================

  const createCompanyMutation = trpc.companies.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Company created successfully!");
      setJob((prev) => ({
        ...prev,
        companyId: data.id,
        companyName: newCompanyName,
        companyLogo: newCompanyLogo,
        companyWebsite: newCompanyWebsite,
      }));
      setShowNewCompanyDialog(false);
      setNewCompanyName("");
      setNewCompanyWebsite("");
      setNewCompanyLogo("");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to create company: ${error.message}`);
    },
  });

  const transitionMutation = trpc.jobs.transition.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      window.location.reload();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createMutation = trpc.jobs.create.useMutation({
    onSuccess: (data: { id: number }) => {
      toast.success("Job created successfully!");
      navigate(`/admin/jobs/${data.id}`);
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to create job: ${error.message}`);
    },
  });

  const updateMutation = trpc.jobs.update.useMutation({
    onSuccess: () => {
      toast.success("Job saved successfully!");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to save job: ${error.message}`);
    },
  });

  // ============================================================
  // LOAD EXISTING JOB
  // ============================================================

  useEffect(() => {
    if (existingJob) {
      setJob({
        title: existingJob.title || "",
        slug: existingJob.slug || "",
        description: existingJob.description || "",
        requirements: existingJob.requirements || "",
        companyId: (existingJob as any).companyId || null,
        companyName: existingJob.companyName || "",
        companyLogo: existingJob.companyLogo || "",
        companyWebsite: existingJob.companyWebsite || "",
        location: existingJob.location || "",
        countryId: (existingJob as any).countryId || null,
        cityId: (existingJob as any).cityId || null,
        remoteType: existingJob.remoteType || "on_site",
        roleType: existingJob.roleType || "full_time",
        seniority: existingJob.seniority || "mid",
        salaryMin: existingJob.salaryMin ? Number(existingJob.salaryMin) : null,
        salaryMax: existingJob.salaryMax ? Number(existingJob.salaryMax) : null,
        salaryCurrency: existingJob.salaryCurrency || "USD",
        salaryPeriod: existingJob.salaryPeriod || "yearly",
        applyUrl: (existingJob as any).applyUrl || "",
        applyEmail: (existingJob as any).applyEmail || "",
        isFeatured: !!(existingJob as any).isFeatured,
        isRemote: !!(existingJob as any).isRemote,
        expiresAt: existingJob.expiresAt?.toString() || "",
        skills: Array.isArray((existingJob as any).skills) ? (existingJob as any).skills : [],
        department: (existingJob as any).department || "",
      });
    }
  }, [existingJob]);

  // Close title suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (titleRef.current && !titleRef.current.contains(e.target as Node)) {
        setShowTitleSuggestions(false);
      }
      if (skillRef.current && !skillRef.current.contains(e.target as Node)) {
        setShowSkillSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleSelectCompany = (company: { id: number; name: string; logo: string | null; website: string | null }) => {
    setJob((prev) => ({
      ...prev,
      companyId: company.id,
      companyName: company.name,
      companyLogo: company.logo || "",
      companyWebsite: company.website || "",
    }));
    setCompanyOpen(false);
  };

  const handleCreateNewCompany = () => {
    if (!newCompanyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    createCompanyMutation.mutate({
      name: newCompanyName,
      website: newCompanyWebsite || undefined,
      logo: newCompanyLogo || undefined,
    });
  };

  const handleCountryChange = (countryId: string) => {
    const id = parseInt(countryId);
    const country = countriesList?.find(c => c.id === id);
    setJob(prev => ({
      ...prev,
      countryId: id,
      cityId: null, // Reset city when country changes
      location: country ? country.name : prev.location,
    }));
  };

  const handleCityChange = (cityId: string) => {
    const id = parseInt(cityId);
    const city = citiesList?.find(c => c.id === id);
    const country = countriesList?.find(c => c.id === job.countryId);
    setJob(prev => ({
      ...prev,
      cityId: id,
      location: city && country ? `${city.name}, ${country.name}` : prev.location,
    }));
  };

  const handleAddSkill = () => {
    const skill = skillInput.trim();
    if (!skill) return;
    if (job.skills.includes(skill)) {
      toast.error("Skill already added");
      return;
    }
    setJob(prev => ({ ...prev, skills: [...prev.skills, skill] }));
    setSkillInput("");
  };

  const handleRemoveSkill = (skill: string) => {
    setJob(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleTitleSelect = (title: string) => {
    setJob(prev => ({ ...prev, title }));
    setTitleQuery(title);
    setShowTitleSuggestions(false);
  };

  const handleSave = async () => {
    if (!job.title.trim()) {
      toast.error("Job title is required");
      return;
    }
    if (!job.companyName.trim()) {
      toast.error("Please select or create a company");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: job.title,
        description: job.description || undefined,
        requirements: job.requirements || undefined,
        companyId: job.companyId || undefined,
        companyName: job.companyName,
        companyLogo: job.companyLogo || undefined,
        companyWebsite: job.companyWebsite || undefined,
        location: job.location || undefined,
        countryId: job.countryId || undefined,
        cityId: job.cityId || undefined,
        isRemote: job.isRemote,
        remoteType: job.remoteType,
        roleType: job.roleType,
        seniority: job.seniority,
        salaryMin: job.salaryMin || undefined,
        salaryMax: job.salaryMax || undefined,
        salaryCurrency: job.salaryCurrency,
        salaryPeriod: job.salaryPeriod,
        applyUrl: job.applyUrl || undefined,
        applyEmail: job.applyEmail || undefined,
        expiresAt: job.expiresAt ? new Date(job.expiresAt) : undefined,
        skills: job.skills.length > 0 ? job.skills : undefined,
        department: job.department || undefined,
      };

      if (isNew) {
        await createMutation.mutateAsync(payload as any);
      } else {
        await updateMutation.mutateAsync({ id: parseInt(params.id!), ...payload } as any);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // SLUG PREVIEW
  // ============================================================
  const slugPreview = useMemo(() => {
    if (job.slug) return job.slug;
    const parts: string[] = [];
    if (job.title) parts.push(job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/g, ""));
    if (job.cityId && citiesList) {
      const city = citiesList.find(c => c.id === job.cityId);
      if (city) parts.push(city.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    }
    if (job.companyName) parts.push(job.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    if (!isNew && params.id) parts.push(params.id);
    return parts.filter(Boolean).join("-") || "auto-generated";
  }, [job.title, job.cityId, job.companyName, citiesList, isNew, params.id]);

  // ============================================================
  // RENDER
  // ============================================================

  if (!isNew && isLoadingJob) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/jobs")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-[#1A1F36]">
                {isNew ? "Create Job" : "Edit Job"}
              </h1>
              <p className="text-sm text-[#697386]">
                {isNew ? "Add a new job listing" : `Editing: ${job.title}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isNew && (existingJob as any)?.availableTransitions?.map((t: any) => (
              <Button
                key={t.id}
                variant="outline"
                size="sm"
                onClick={() => transitionMutation.mutate({ jobId: parseInt(params.id!), transitionId: t.id })}
                disabled={transitionMutation.isPending}
              >
                {t.name}
              </Button>
            ))}
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#0066FF] hover:bg-[#0052CC]">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isNew ? "Create Job" : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 1: Job Information */}
        {/* ============================================================ */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-[#0066FF]" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Job Title with Suggestions */}
            <div className="space-y-2" ref={titleRef}>
              <Label htmlFor="title">Job Title *</Label>
              <div className="relative">
                <Input
                  id="title"
                  value={job.title}
                  onChange={(e) => {
                    setJob({ ...job, title: e.target.value });
                    setTitleQuery(e.target.value);
                    setShowTitleSuggestions(true);
                  }}
                  onFocus={() => {
                    if (job.title.length >= 2) setShowTitleSuggestions(true);
                  }}
                  placeholder="e.g. Senior Software Engineer"
                  className="pr-10"
                />
                <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                {showTitleSuggestions && titleSuggestions && titleSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {titleSuggestions.map((title, i) => (
                      <button
                        key={i}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#F0F7FF] hover:text-[#0066FF] transition-colors"
                        onClick={() => handleTitleSelect(title)}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Start typing for suggestions</p>
            </div>

            {/* Slug Preview */}
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-[#F7F8FA] border rounded-md text-sm text-[#697386]">
                <Globe className="h-4 w-4 text-[#9BA3B0] shrink-0" />
                <span className="text-[#9BA3B0]">/jobs/</span>
                <span className="font-mono text-[#1A1F36] truncate">{slugPreview}</span>
              </div>
              <p className="text-xs text-muted-foreground">Auto-generated from title, city, company, and job ID</p>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={job.department}
                onChange={(e) => setJob({ ...job, department: e.target.value })}
                placeholder="e.g. Engineering, Marketing, Sales"
              />
            </div>

            {/* Employment Type, Experience Level, Location Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select
                  value={job.roleType}
                  onValueChange={(value: any) => setJob({ ...job, roleType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select
                  value={job.seniority}
                  onValueChange={(value: any) => setJob({ ...job, seniority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label>Work Arrangement</Label>
                <Select
                  value={job.remoteType}
                  onValueChange={(value: any) => setJob({ ...job, remoteType: value, isRemote: value === "fully_remote" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_site">On-site</SelectItem>
                    <SelectItem value="fully_remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Job Description</Label>
              <RichTextEditor
                content={job.description}
                onChange={(content) => setJob({ ...job, description: content })}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
              />
            </div>

            {/* Requirements */}
            <div className="space-y-2">
              <Label>Requirements</Label>
              <RichTextEditor
                content={job.requirements}
                onChange={(content) => setJob({ ...job, requirements: content })}
                placeholder="List the required skills, qualifications, and experience..."
              />
            </div>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* SECTION 2: Company */}
        {/* ============================================================ */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-[#0066FF]" />
              Company
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Company *</Label>
              <div className="flex gap-2">
                <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={companyOpen}
                      className="flex-1 justify-between font-normal"
                    >
                      {job.companyId && job.companyName ? (
                        <span className="flex items-center gap-2">
                          {job.companyLogo && (
                            <img
                              src={job.companyLogo}
                              alt=""
                              className="h-5 w-5 rounded object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          )}
                          {job.companyName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Search and select a company...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search companies..."
                        value={companySearch}
                        onValueChange={setCompanySearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-2 text-center text-sm text-muted-foreground">
                            No companies found.
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {companiesList?.map((company) => (
                            <CommandItem
                              key={company.id}
                              value={String(company.id)}
                              onSelect={() => handleSelectCompany(company)}
                              className="flex items-center gap-3 py-2.5"
                            >
                              <div className="h-8 w-8 rounded-md bg-[#F0F2F5] flex items-center justify-center overflow-hidden shrink-0">
                                {company.logo ? (
                                  <img
                                    src={company.logo}
                                    alt=""
                                    className="h-8 w-8 object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                                        '<span class="text-xs font-medium text-[#697386]">' +
                                        company.name.charAt(0).toUpperCase() +
                                        "</span>";
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs font-medium text-[#697386]">
                                    {company.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{company.name}</p>
                                {company.website && (
                                  <p className="text-xs text-muted-foreground truncate">{company.website}</p>
                                )}
                              </div>
                              {job.companyId === company.id && (
                                <Check className="h-4 w-4 text-[#0066FF] shrink-0" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  onClick={() => setShowNewCompanyDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add New
                </Button>
              </div>
            </div>

            {/* Auto-filled company details */}
            {job.companyName && (
              <div className="rounded-md border border-emerald-100 bg-[#F0F7FF]/30 p-4 space-y-3">
                <p className="text-sm font-medium text-[#0052CC]">Selected Company Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-xs">Company Name</Label>
                    <Input
                      id="companyName"
                      value={job.companyName}
                      onChange={(e) => setJob({ ...job, companyName: e.target.value })}
                      placeholder="Company name"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite" className="text-xs">Website</Label>
                    <Input
                      id="companyWebsite"
                      value={job.companyWebsite}
                      onChange={(e) => setJob({ ...job, companyWebsite: e.target.value })}
                      placeholder="https://example.com"
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyLogo" className="text-xs">Logo URL</Label>
                  <Input
                    id="companyLogo"
                    value={job.companyLogo}
                    onChange={(e) => setJob({ ...job, companyLogo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="bg-white"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* SECTION 3: Location */}
        {/* ============================================================ */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-[#0066FF]" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Country */}
              <div className="space-y-2">
                <Label>Country *</Label>
                <Select
                  value={job.countryId ? String(job.countryId) : ""}
                  onValueChange={handleCountryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country..." />
                  </SelectTrigger>
                  <SelectContent>
                    {countriesList?.map((country) => (
                      <SelectItem key={country.id} value={String(country.id)}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City (cascading) */}
              <div className="space-y-2">
                <Label>City</Label>
                <Select
                  value={job.cityId ? String(job.cityId) : ""}
                  onValueChange={handleCityChange}
                  disabled={!job.countryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={job.countryId ? "Select city..." : "Select country first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {citiesList?.map((city) => (
                      <SelectItem key={city.id} value={String(city.id)}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location text (auto-filled but editable) */}
            <div className="space-y-2">
              <Label htmlFor="location">Location Display Text</Label>
              <Input
                id="location"
                value={job.location}
                onChange={(e) => setJob({ ...job, location: e.target.value })}
                placeholder="e.g. Dubai, UAE (auto-filled from country/city)"
              />
              <p className="text-xs text-muted-foreground">
                Auto-filled from country/city selection. You can edit for custom display.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* SECTION 4: Compensation */}
        {/* ============================================================ */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-[#0066FF]" />
              Compensation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Minimum Salary</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  value={job.salaryMin || ""}
                  onChange={(e) => setJob({ ...job, salaryMin: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Maximum Salary</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  value={job.salaryMax || ""}
                  onChange={(e) => setJob({ ...job, salaryMax: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="80000"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={job.salaryCurrency}
                  onValueChange={(value) => setJob({ ...job, salaryCurrency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{c.code}</span>
                          <span className="text-muted-foreground text-xs">({c.symbol})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select
                  value={job.salaryPeriod}
                  onValueChange={(value: any) => setJob({ ...job, salaryPeriod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* SECTION 5: Skills & Tags */}
        {/* ============================================================ */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5 text-[#0066FF]" />
              Skills & Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2" ref={skillRef}>
              <Label>Required Skills</Label>
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => {
                      setSkillInput(e.target.value);
                      setShowSkillSuggestions(e.target.value.length >= 1);
                    }}
                    onFocus={() => {
                      if (skillInput.length >= 1) setShowSkillSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                        setShowSkillSuggestions(false);
                      } else if (e.key === "Escape") {
                        setShowSkillSuggestions(false);
                      }
                    }}
                    placeholder="Type a skill and press Enter (e.g. React, Python, AWS)"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={() => { handleAddSkill(); setShowSkillSuggestions(false); }} disabled={!skillInput.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {showSkillSuggestions && skillSuggestions && skillSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-12 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {skillSuggestions
                      .filter((s: { name: string; count: number }) => !job.skills.includes(s.name))
                      .slice(0, 10)
                      .map((s: { name: string; count: number }) => (
                        <button
                          key={s.name}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between transition-colors"
                          onClick={() => {
                            setJob((prev) => ({ ...prev, skills: [...prev.skills, s.name] }));
                            setSkillInput("");
                            setShowSkillSuggestions(false);
                          }}
                        >
                          <span>{s.name}</span>
                          {s.count > 0 && (
                            <span className="text-xs text-muted-foreground">used in {s.count} job{s.count !== 1 ? "s" : ""}</span>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              {job.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {job.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="px-3 py-1.5 text-sm bg-[#F0F7FF] text-[#0066FF] hover:bg-[#EBF3FF] cursor-pointer gap-1.5"
                      onClick={() => handleRemoveSkill(skill)}
                    >
                      {skill}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
              {job.skills.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No skills added yet. Add relevant skills to help candidates find this job.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* SECTION 6: Application & Settings */}
        {/* ============================================================ */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-[#0066FF]" />
              Application & Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Application Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applyUrl">Application URL (External)</Label>
                <Input
                  id="applyUrl"
                  value={job.applyUrl}
                  onChange={(e) => setJob({ ...job, applyUrl: e.target.value })}
                  placeholder="https://careers.example.com/apply"
                />
                <p className="text-xs text-muted-foreground">
                  If provided, applicants will be redirected to this URL
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="applyEmail">Application Email</Label>
                <Input
                  id="applyEmail"
                  type="email"
                  value={job.applyEmail}
                  onChange={(e) => setJob({ ...job, applyEmail: e.target.value })}
                  placeholder="jobs@example.com"
                />
              </div>
            </div>

            {/* Settings toggles */}
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isFeatured">Featured Job</Label>
                  <p className="text-sm text-[#697386]">Display this job prominently on the jobs page</p>
                </div>
                <Switch
                  id="isFeatured"
                  checked={job.isFeatured}
                  onCheckedChange={(checked) => setJob({ ...job, isFeatured: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isRemote">Remote Position</Label>
                  <p className="text-sm text-[#697386]">This job can be done remotely</p>
                </div>
                <Switch
                  id="isRemote"
                  checked={job.isRemote}
                  onCheckedChange={(checked) => setJob({ ...job, isRemote: checked })}
                />
              </div>
            </div>

            {/* Expiration */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="expiresAt">Expiration Date</Label>
              <Input
                id="expiresAt"
                type="date"
                value={job.expiresAt ? job.expiresAt.split('T')[0] : ""}
                onChange={(e) => setJob({ ...job, expiresAt: e.target.value })}
                className="max-w-xs"
              />
              <p className="text-sm text-[#697386]">Job listing will be hidden after this date</p>
            </div>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* SECTION 7: SEO */}
        {/* ============================================================ */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-[#0066FF]" />
              SEO Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EntitySeoTab
              entityType="jobs"
              entityId={isNew ? null : parseInt(params.id!)}
              entityName={job.title || "Job Listing"}
              entityDescription={job.description ? job.description.replace(/<[^>]*>/g, "").slice(0, 200) : undefined}
              entityUrl={`/jobs/${slugPreview}`}
            />
          </CardContent>
        </Card>

        {/* Bottom Save Button */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={isSaving} className="bg-[#0066FF] hover:bg-[#0052CC] px-8">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isNew ? "Create Job" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Add New Company Dialog */}
      <Dialog open={showNewCompanyDialog} onOpenChange={setShowNewCompanyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#0066FF]" />
              Add New Company
            </DialogTitle>
            <DialogDescription>
              Create a new company that will be available for all job listings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newCompanyName">Company Name *</Label>
              <Input
                id="newCompanyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="e.g. TechCorp Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCompanyWebsite">Website</Label>
              <Input
                id="newCompanyWebsite"
                value={newCompanyWebsite}
                onChange={(e) => setNewCompanyWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCompanyLogo">Logo URL</Label>
              <Input
                id="newCompanyLogo"
                value={newCompanyLogo}
                onChange={(e) => setNewCompanyLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCompanyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewCompany}
              disabled={createCompanyMutation.isPending}
              className="bg-[#0066FF] hover:bg-[#0052CC]"
            >
              {createCompanyMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// ============================================================
// DEBOUNCE HOOK
// ============================================================
function useDebounce<T>(value: T, delay: number): [T] {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return [debouncedValue];
}
