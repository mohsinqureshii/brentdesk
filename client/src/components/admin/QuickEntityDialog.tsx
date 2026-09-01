/**
 * Quick Entity Creation Dialog
 * Full tabbed forms for creating companies, people, investors with AI suggestions
 * and workflow buttons (Submit for Review / Publish Directly)
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { Building2, User, Briefcase, Loader2, Sparkles, Send, CheckCircle, Globe, MapPin, Linkedin, Twitter, Mail, Calendar, DollarSign, Users, Briefcase as BriefcaseIcon, ImageIcon, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

// ============================================================
// ENHANCED COMPANY DIALOG
// ============================================================

interface QuickCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onSuccess?: (company: { id: number; name: string }) => void;
}

export function QuickCompanyDialog({
  open,
  onOpenChange,
  initialName = "",
  onSuccess,
}: QuickCompanyDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Basic Info
  const [name, setName] = useState(initialName);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  
  // Social & Contact
  const [linkedIn, setLinkedIn] = useState("");
  const [twitter, setTwitter] = useState("");
  
  // Location (simple text field)
  const [location, setLocation] = useState("");
  
  // Business Details
  const [stage, setStage] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [totalFunding, setTotalFunding] = useState("");
  
  // Duplicate check query
  const duplicateCheck = trpc.admin.ai.checkDuplicateCompany.useQuery(
    { name: name.trim() },
    { enabled: name.trim().length >= 3 }
  );

  // AI Suggestion mutation
  const aiSuggestMutation = trpc.admin.ai.suggestCompanyInfo.useMutation({
    onSuccess: (data) => {
      if (data.tagline) setTagline(data.tagline);
      if (data.description) setDescription(data.description);
      if (data.industry) setIndustry(data.industry);
      if (data.linkedIn) setLinkedIn(data.linkedIn);
      if (data.twitter) setTwitter(data.twitter);
      if (data.foundedYear) setFoundedYear(data.foundedYear.toString());
      if (data.employeeCount) setEmployeeCount(data.employeeCount);
      if (data.totalFunding) setTotalFunding(data.totalFunding);
      if (data.stage) setStage(data.stage);
      if (data.location) setLocation(data.location);
      toast.success("AI suggestions applied! Please verify the information.");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to get AI suggestions: ${error.message}`);
    },
  });

  const createMutation = trpc.admin.companies.quickCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`Company "${name}" created successfully!`);
      onSuccess?.(data);
      onOpenChange(false);
      resetForm();
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to create company: ${error.message}`);
    },
  });

  const submitForReviewMutation = trpc.admin.companies.quickCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`Company "${name}" submitted for review!`);
      onSuccess?.(data);
      onOpenChange(false);
      resetForm();
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to submit company: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setTagline("");
    setDescription("");
    setLogo("");
    setWebsite("");
    setIndustry("");
    setLinkedIn("");
    setTwitter("");
    setLocation("");
    setStage("");
    setFoundedYear("");
    setEmployeeCount("");
    setTotalFunding("");
  };

  // AI Suggestion handler
  const handleAISuggest = () => {
    if (!name.trim()) {
      toast.error("Please enter a company name first");
      return;
    }
    aiSuggestMutation.mutate({ name: name.trim(), website: website.trim() || undefined });
  };

  const isLoadingAI = aiSuggestMutation.isPending;

  const handleSubmit = (publishDirectly: boolean) => {
    if (!name.trim()) {
      toast.error("Company name is required");
      return;
    }
    
    const data = {
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      logo: logo.trim() || undefined,
      website: website.trim() || undefined,
      industry: industry.trim() || undefined,
      linkedIn: linkedIn.trim() || undefined,
      twitter: twitter.trim() || undefined,
      location: location.trim() || undefined,
      stage: (stage as "pre_seed" | "seed" | "series_a" | "series_b" | "series_c" | "series_d_plus" | "public" | "acquired" | undefined) || undefined,
      foundedYear: foundedYear ? parseInt(foundedYear) : undefined,
      employeeCount: employeeCount.trim() || undefined,
      totalFunding: totalFunding.trim() || undefined,
      publishDirectly,
    };
    
    if (publishDirectly) {
      createMutation.mutate(data);
    } else {
      submitForReviewMutation.mutate(data);
    }
  };

  // Update name when initialName changes
  useEffect(() => {
    if (initialName) setName(initialName);
  }, [initialName]);

  const isPending = createMutation.isPending || submitForReviewMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#0066FF]" />
            Create Company
          </DialogTitle>
          <DialogDescription>
            Add company details. Use AI to auto-fill public information.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="contact">Social & Location</TabsTrigger>
            <TabsTrigger value="business">Business Details</TabsTrigger>
          </TabsList>
          
          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAISuggest}
                disabled={isLoadingAI || !name.trim()}
                className="gap-2"
              >
                {isLoadingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-amber-500" />
                )}
                Suggest with AI
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name *</Label>
                <Input
                  id="company-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Acme Inc."
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-website">Website</Label>
                <Input
                  id="company-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>
            </div>
            
            {/* Duplicate Warning */}
            {duplicateCheck.data?.duplicates && duplicateCheck.data.duplicates.length > 0 && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Possible Duplicates Found</AlertTitle>
                <AlertDescription className="text-amber-700">
                  <p className="mb-2">Similar companies already exist:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {duplicateCheck.data.duplicates.map((dup) => (
                      <li key={dup.id}>
                        <strong>{dup.name}</strong>
                        {dup.industry && <span className="text-sm"> - {dup.industry}</span>}
                        {dup.website && <span className="text-sm text-[#697386]"> ({dup.website})</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">Please verify this is not a duplicate before creating.</p>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="company-tagline">Tagline</Label>
              <Input
                id="company-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Brief tagline or slogan..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-industry">Industry</Label>
              <Input
                id="company-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., FinTech, SaaS, E-commerce"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-description">Description</Label>
              <Textarea
                id="company-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the company..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-logo" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Logo URL
              </Label>
              <Input
                id="company-logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
              />
              {logo && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={logo} alt="Logo preview" className="h-12 w-12 object-contain rounded border" />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Social & Location Tab */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  LinkedIn
                </Label>
                <Input
                  id="company-linkedin"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  placeholder="https://linkedin.com/company/..."
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-sky-500" />
                  Twitter / X
                </Label>
                <Input
                  id="company-twitter"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="https://twitter.com/..."
                  type="url"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="company-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Dubai, UAE"
              />
            </div>
          </TabsContent>
          
          {/* Business Details Tab */}
          <TabsContent value="business" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-stage" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Funding Stage
                </Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_seed">Pre-Seed</SelectItem>
                    <SelectItem value="seed">Seed</SelectItem>
                    <SelectItem value="series_a">Series A</SelectItem>
                    <SelectItem value="series_b">Series B</SelectItem>
                    <SelectItem value="series_c">Series C</SelectItem>
                    <SelectItem value="series_d_plus">Series D+</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="acquired">Acquired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-founded" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Founded Year
                </Label>
                <Input
                  id="company-founded"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  placeholder="e.g., 2020"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-employees" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Employee Count
                </Label>
                <Select value={employeeCount} onValueChange={setEmployeeCount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="201-500">201-500</SelectItem>
                    <SelectItem value="501-1000">501-1000</SelectItem>
                    <SelectItem value="1001-5000">1001-5000</SelectItem>
                    <SelectItem value="5000+">5000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-funding" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Funding
                </Label>
                <Input
                  id="company-funding"
                  value={totalFunding}
                  onChange={(e) => setTotalFunding(e.target.value)}
                  placeholder="e.g., $10M, $50M"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            Submit for Review
          </Button>
          {isAdmin && (
            <Button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isPending}
              className="gap-2 bg-[#0066FF] hover:bg-[#0052CC]"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle className="h-4 w-4" />
              Publish Directly
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// ENHANCED PERSON DIALOG
// ============================================================

interface QuickPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onSuccess?: (person: { id: number; name: string }) => void;
}

export function QuickPersonDialog({
  open,
  onOpenChange,
  initialName = "",
  onSuccess,
}: QuickPersonDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Basic Info
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  
  // Contact
  const [email, setEmail] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  
  // Location (simple text field)
  const [location, setLocation] = useState("");
  
  // Duplicate check query
  const duplicateCheck = trpc.admin.ai.checkDuplicatePerson.useQuery(
    { name: name.trim() },
    { enabled: name.trim().length >= 3 }
  );

  // AI Suggestion mutation
  const aiSuggestMutation = trpc.admin.ai.suggestPersonInfo.useMutation({
    onSuccess: (data) => {
      if (data.title) setTitle(data.title);
      if (data.company) setCompany(data.company);
      if (data.shortBio) setShortBio(data.shortBio);
      if (data.bio) setBio(data.bio);
      if (data.email) setEmail(data.email);
      if (data.website) setWebsite(data.website);
      if (data.linkedIn) setLinkedIn(data.linkedIn);
      if (data.twitter) setTwitter(data.twitter);
      if (data.location) setLocation(data.location);
      toast.success("AI suggestions applied! Please verify the information.");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to get AI suggestions: ${error.message}`);
    },
  });

  const createMutation = trpc.admin.people.quickCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`Person "${name}" created successfully!`);
      onSuccess?.(data);
      onOpenChange(false);
      resetForm();
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to create person: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setTitle("");
    setCompany("");
    setShortBio("");
    setBio("");
    setAvatar("");
    setEmail("");
    setLinkedIn("");
    setTwitter("");
    setWebsite("");
    setLocation("");
  };

  // AI Suggestion handler
  const handleAISuggest = () => {
    if (!name.trim()) {
      toast.error("Please enter a person name first");
      return;
    }
    aiSuggestMutation.mutate({ name: name.trim(), company: company.trim() || undefined });
  };

  const isLoadingAI = aiSuggestMutation.isPending;

  const handleSubmit = (publishDirectly: boolean) => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    
    createMutation.mutate({
      name: name.trim(),
      title: title.trim() || undefined,
      company: company.trim() || undefined,
      shortBio: shortBio.trim() || undefined,
      bio: bio.trim() || undefined,
      avatar: avatar.trim() || undefined,
      email: email.trim() || undefined,
      linkedIn: linkedIn.trim() || undefined,
      twitter: twitter.trim() || undefined,
      website: website.trim() || undefined,
      location: location.trim() || undefined,
      publishDirectly,
    });
  };

  useEffect(() => {
    if (initialName) setName(initialName);
  }, [initialName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#0066FF]" />
            Create Person
          </DialogTitle>
          <DialogDescription>
            Add person details. Use AI to auto-fill public information.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="contact">Contact & Location</TabsTrigger>
          </TabsList>
          
          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAISuggest}
                disabled={isLoadingAI || !name.trim()}
                className="gap-2"
              >
                {isLoadingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-amber-500" />
                )}
                Suggest with AI
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="person-name">Full Name *</Label>
                <Input
                  id="person-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., John Doe"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-title">Job Title</Label>
                <Input
                  id="person-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., CEO, Founder, CTO"
                />
              </div>
            </div>
            
            {/* Duplicate Warning */}
            {duplicateCheck.data?.duplicates && duplicateCheck.data.duplicates.length > 0 && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Possible Duplicates Found</AlertTitle>
                <AlertDescription className="text-amber-700">
                  <p className="mb-2">Similar people already exist:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {duplicateCheck.data.duplicates.map((dup) => (
                      <li key={dup.id}>
                        <strong>{dup.name}</strong>
                        {dup.title && <span className="text-sm"> - {dup.title}</span>}
                        {dup.company && <span className="text-sm text-[#697386]"> at {dup.company}</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">Please verify this is not a duplicate before creating.</p>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="person-company">Company</Label>
                <Input
                  id="person-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g., Acme Inc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-avatar" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Photo URL
                </Label>
                <Input
                  id="person-avatar"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  type="url"
                />
                {avatar && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={avatar} alt="Photo preview" className="h-12 w-12 object-cover rounded-full border" />
                    <span className="text-xs text-muted-foreground">Preview</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="person-shortbio">Short Bio</Label>
              <Input
                id="person-shortbio"
                value={shortBio}
                onChange={(e) => setShortBio(e.target.value)}
                placeholder="One-line bio..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="person-bio">Full Bio</Label>
              <Textarea
                id="person-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Detailed biography..."
                rows={4}
              />
            </div>
          </TabsContent>
          
          {/* Contact & Location Tab */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="person-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="person-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                <Input
                  id="person-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="person-linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  LinkedIn
                </Label>
                <Input
                  id="person-linkedin"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-sky-500" />
                  Twitter / X
                </Label>
                <Input
                  id="person-twitter"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="https://twitter.com/..."
                  type="url"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="person-location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                id="person-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Dubai, UAE"
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={createMutation.isPending}
            className="gap-2"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            Submit for Review
          </Button>
          {isAdmin && (
            <Button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={createMutation.isPending}
              className="gap-2 bg-[#0066FF] hover:bg-[#0052CC]"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle className="h-4 w-4" />
              Publish Directly
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// ENHANCED INVESTOR DIALOG
// ============================================================

interface QuickInvestorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onSuccess?: (investor: { id: number; name: string }) => void;
}

export function QuickInvestorDialog({
  open,
  onOpenChange,
  initialName = "",
  onSuccess,
}: QuickInvestorDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Basic Info
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<string>("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [website, setWebsite] = useState("");
  
  // Contact & Social
  const [email, setEmail] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [twitter, setTwitter] = useState("");
  
  // Location (simple text field)
  const [location, setLocation] = useState("");
  
  // Investment Details
  const [foundedYear, setFoundedYear] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [aum, setAum] = useState("");
  const [checkSizeMin, setCheckSizeMin] = useState("");
  const [checkSizeMax, setCheckSizeMax] = useState("");
  const [portfolioCount, setPortfolioCount] = useState("");
  const [investmentStages, setInvestmentStages] = useState<string[]>([]);
  
  // Duplicate check query
  const duplicateCheck = trpc.admin.ai.checkDuplicateInvestor.useQuery(
    { name: name.trim() },
    { enabled: name.trim().length >= 3 }
  );

  // AI Suggestion mutation
  const aiSuggestMutation = trpc.admin.ai.suggestInvestorInfo.useMutation({
    onSuccess: (data) => {
      if (data.type) setType(data.type);
      if (data.shortDescription) setShortDescription(data.shortDescription);
      if (data.description) setDescription(data.description);
      if (data.linkedIn) setLinkedIn(data.linkedIn);
      if (data.twitter) setTwitter(data.twitter);
      if (data.location) setLocation(data.location);
      if (data.foundedYear) setFoundedYear(data.foundedYear.toString());
      if (data.teamSize) setTeamSize(data.teamSize);
      if (data.aum) setAum(data.aum);
      if (data.portfolioCount) setPortfolioCount(data.portfolioCount.toString());
      if (data.checkSizeMin) setCheckSizeMin(data.checkSizeMin.toString());
      if (data.checkSizeMax) setCheckSizeMax(data.checkSizeMax.toString());
      if (data.investmentStages && data.investmentStages.length > 0) setInvestmentStages(data.investmentStages);
      toast.success("AI suggestions applied! Please verify the information.");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to get AI suggestions: ${error.message}`);
    },
  });

  const createMutation = trpc.admin.investors.quickCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`Investor "${name}" created successfully!`);
      onSuccess?.(data);
      onOpenChange(false);
      resetForm();
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to create investor: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setType("");
    setShortDescription("");
    setDescription("");
    setLogo("");
    setWebsite("");
    setEmail("");
    setLinkedIn("");
    setTwitter("");
    setLocation("");
    setFoundedYear("");
    setTeamSize("");
    setAum("");
    setCheckSizeMin("");
    setCheckSizeMax("");
    setPortfolioCount("");
    setInvestmentStages([]);
  };

  // AI Suggestion handler
  const handleAISuggest = () => {
    if (!name.trim()) {
      toast.error("Please enter an investor name first");
      return;
    }
    aiSuggestMutation.mutate({ name: name.trim(), website: website.trim() || undefined });
  };

  const isLoadingAI = aiSuggestMutation.isPending;

  const handleSubmit = (publishDirectly: boolean) => {
    if (!name.trim()) {
      toast.error("Investor name is required");
      return;
    }
    if (!type) {
      toast.error("Investor type is required");
      return;
    }
    
    createMutation.mutate({
      name: name.trim(),
      type: type as "vc" | "angel" | "corporate_vc" | "family_office" | "accelerator" | "other",
      shortDescription: shortDescription.trim() || undefined,
      description: description.trim() || undefined,
      logo: logo.trim() || undefined,
      website: website.trim() || undefined,
      email: email.trim() || undefined,
      linkedIn: linkedIn.trim() || undefined,
      twitter: twitter.trim() || undefined,
      location: location.trim() || undefined,
      foundedYear: foundedYear ? parseInt(foundedYear) : undefined,
      teamSize: teamSize.trim() || undefined,
      aum: aum.trim() || undefined,
      checkSizeMin: checkSizeMin ? parseFloat(checkSizeMin) : undefined,
      checkSizeMax: checkSizeMax ? parseFloat(checkSizeMax) : undefined,
      portfolioCount: portfolioCount ? parseInt(portfolioCount) : undefined,
      investmentStages: investmentStages.length > 0 ? investmentStages : undefined,
      publishDirectly,
    });
  };

  useEffect(() => {
    if (initialName) setName(initialName);
  }, [initialName]);

  const stageOptions = [
    { value: "pre_seed", label: "Pre-Seed" },
    { value: "seed", label: "Seed" },
    { value: "series_a", label: "Series A" },
    { value: "series_b", label: "Series B" },
    { value: "series_c", label: "Series C" },
    { value: "growth", label: "Growth" },
    { value: "late_stage", label: "Late Stage" },
  ];

  const toggleStage = (stage: string) => {
    if (investmentStages.includes(stage)) {
      setInvestmentStages(investmentStages.filter(s => s !== stage));
    } else {
      setInvestmentStages([...investmentStages, stage]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#0066FF]" />
            Create Investor
          </DialogTitle>
          <DialogDescription>
            Add investor details. Use AI to auto-fill public information.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="contact">Contact & Location</TabsTrigger>
            <TabsTrigger value="investment">Investment Details</TabsTrigger>
          </TabsList>
          
          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAISuggest}
                disabled={isLoadingAI || !name.trim()}
                className="gap-2"
              >
                {isLoadingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-amber-500" />
                )}
                Suggest with AI
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investor-name">Investor Name *</Label>
                <Input
                  id="investor-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sequoia Capital"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investor-type">Investor Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
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
            </div>
            
            {/* Duplicate Warning */}
            {duplicateCheck.data?.duplicates && duplicateCheck.data.duplicates.length > 0 && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Possible Duplicates Found</AlertTitle>
                <AlertDescription className="text-amber-700">
                  <p className="mb-2">Similar investors already exist:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {duplicateCheck.data.duplicates.map((dup) => (
                      <li key={dup.id}>
                        <strong>{dup.name}</strong>
                        {dup.type && <span className="text-sm"> - {dup.type}</span>}
                        {dup.shortDescription && <span className="text-sm text-[#697386]"> ({dup.shortDescription})</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">Please verify this is not a duplicate before creating.</p>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="investor-website">Website</Label>
              <Input
                id="investor-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="investor-shortdesc">Short Description</Label>
              <Input
                id="investor-shortdesc"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="One-line description..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="investor-description">Full Description</Label>
              <Textarea
                id="investor-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the investor..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="investor-logo" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Logo URL
              </Label>
              <Input
                id="investor-logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
              />
              {logo && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={logo} alt="Logo preview" className="h-12 w-12 object-contain rounded border" />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Contact & Location Tab */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investor-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="investor-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investor-linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  LinkedIn
                </Label>
                <Input
                  id="investor-linkedin"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  placeholder="https://linkedin.com/company/..."
                  type="url"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investor-twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-sky-500" />
                  Twitter / X
                </Label>
                <Input
                  id="investor-twitter"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="https://twitter.com/..."
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investor-location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  id="investor-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., San Francisco, USA"
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Investment Details Tab */}
          <TabsContent value="investment" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investor-founded" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Founded Year
                </Label>
                <Input
                  id="investor-founded"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  placeholder="e.g., 2010"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investor-teamsize" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Size
                </Label>
                <Input
                  id="investor-teamsize"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  placeholder="e.g., 50+"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investor-aum" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Assets Under Management
                </Label>
                <Input
                  id="investor-aum"
                  value={aum}
                  onChange={(e) => setAum(e.target.value)}
                  placeholder="e.g., $500M"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investor-portfolio" className="flex items-center gap-2">
                  <BriefcaseIcon className="h-4 w-4" />
                  Portfolio Count
                </Label>
                <Input
                  id="investor-portfolio"
                  value={portfolioCount}
                  onChange={(e) => setPortfolioCount(e.target.value)}
                  placeholder="e.g., 100"
                  type="number"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investor-checkmin">Check Size Min ($)</Label>
                <Input
                  id="investor-checkmin"
                  value={checkSizeMin}
                  onChange={(e) => setCheckSizeMin(e.target.value)}
                  placeholder="e.g., 100000"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investor-checkmax">Check Size Max ($)</Label>
                <Input
                  id="investor-checkmax"
                  value={checkSizeMax}
                  onChange={(e) => setCheckSizeMax(e.target.value)}
                  placeholder="e.g., 5000000"
                  type="number"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Investment Stages</Label>
              <div className="flex flex-wrap gap-2">
                {stageOptions.map((stage) => (
                  <Button
                    key={stage.value}
                    type="button"
                    variant={investmentStages.includes(stage.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStage(stage.value)}
                    className={investmentStages.includes(stage.value) ? "bg-[#0066FF] hover:bg-[#0052CC]" : ""}
                  >
                    {stage.label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={createMutation.isPending}
            className="gap-2"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            Submit for Review
          </Button>
          {isAdmin && (
            <Button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={createMutation.isPending}
              className="gap-2 bg-[#0066FF] hover:bg-[#0052CC]"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle className="h-4 w-4" />
              Publish Directly
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
