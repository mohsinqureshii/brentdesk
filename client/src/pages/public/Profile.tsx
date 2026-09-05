import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useT } from "@/lib/i18n";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  User, MapPin, Briefcase, DollarSign, Globe, Upload, Linkedin,
  CheckCircle2, X, Plus, Twitter, Building2, Save, Loader2, ArrowLeft,
  Camera, FileText, Trash2
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const INTEREST_SUGGESTIONS = [
  "AI & Machine Learning", "FinTech", "E-Commerce", "SaaS", "HealthTech",
  "EdTech", "PropTech", "CleanTech", "Cybersecurity", "Blockchain",
  "IoT", "Cloud Computing", "DevOps", "Mobile Apps", "Data Science",
  "Product Management", "Growth", "Marketing", "Sales", "Operations",
  "Engineering", "Operations", "Project Management", "Energy", "Construction"
];

const LOCATION_SUGGESTIONS = [
  "Dubai, UAE", "Abu Dhabi, UAE", "Riyadh, KSA", "Jeddah, KSA",
  "Cairo, Egypt", "Doha, Qatar", "Manama, Bahrain", "Muscat, Oman",
  "Kuwait City, Kuwait", "Amman, Jordan", "Beirut, Lebanon", "Remote"
];

export default function Profile() {
  const t = useT();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // Fetch profile data
  const { data: profile, isLoading } = trpc.userProfile.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Form state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocationValue] = useState("");
  const [website, setWebsite] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [salaryMax, setSalaryMax] = useState<string>("");
  const [newInterest, setNewInterest] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [showInterestSuggestions, setShowInterestSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const interestRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setBio(profile.bio || "");
      setJobTitle(profile.jobTitle || "");
      setCompany(profile.company || "");
      setLocationValue(profile.location || "");
      setWebsite(profile.website || "");
      setTwitterHandle(profile.twitterHandle || "");
      setLinkedinUrl(profile.linkedinUrl || "");
      setInterests((profile.interests as string[]) || []);
      setPreferredLocations((profile.preferredLocations as string[]) || []);
      setSalaryMin(profile.salaryMin?.toString() || "");
      setSalaryMax(profile.salaryMax?.toString() || "");
    }
  }, [profile]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (interestRef.current && !interestRef.current.contains(event.target as Node)) {
        setShowInterestSuggestions(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update profile mutation
  const updateProfile = trpc.userProfile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(t("profile.saved"));
      utils.userProfile.getProfile.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("profile.saveFailed"));
    }
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      setLocation("/signin");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleSave = () => {
    updateProfile.mutate({
      name: name || undefined,
      bio: bio || undefined,
      jobTitle: jobTitle || undefined,
      company: company || undefined,
      location: location || undefined,
      website: website || undefined,
      twitterHandle: twitterHandle || undefined,
      linkedinUrl: linkedinUrl || undefined,
      interests,
      preferredLocations,
      salaryMin: salaryMin ? parseInt(salaryMin) : null,
      salaryMax: salaryMax ? parseInt(salaryMax) : null,
    });
  };

  const addInterest = (interest: string) => {
    const trimmed = interest.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
    }
    setNewInterest("");
    setShowInterestSuggestions(false);
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const addLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (trimmed && !preferredLocations.includes(trimmed)) {
      setPreferredLocations([...preferredLocations, trimmed]);
    }
    setNewLocation("");
    setShowLocationSuggestions(false);
  };

  const removeLocation = (loc: string) => {
    setPreferredLocations(preferredLocations.filter(l => l !== loc));
  };

  // Calculate profile completion
  const profileFields = [
    name, bio, jobTitle, company, location, twitterHandle || linkedinUrl,
    interests.length > 0 ? "yes" : "", preferredLocations.length > 0 ? "yes" : ""
  ];
  const completedFields = profileFields.filter(Boolean).length;
  const completionPercent = Math.round((completedFields / profileFields.length) * 100);

  const filteredInterestSuggestions = INTEREST_SUGGESTIONS.filter(
    s => !interests.includes(s) && s.toLowerCase().includes(newInterest.toLowerCase())
  );

  const filteredLocationSuggestions = LOCATION_SUGGESTIONS.filter(
    s => !preferredLocations.includes(s) && s.toLowerCase().includes(newLocation.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="w-full max-w-[900px] mx-auto px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96 mb-8" />
          <Skeleton className="h-32 w-full mb-6" />
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <Header />

      <main className="w-full max-w-[900px] mx-auto px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} className="text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("nav.dashboard")}
              </Button>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t("profile.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("profile.subtitle")}
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="bg-primary/100 hover:bg-primary/90 text-white gap-2"
          >
            {updateProfile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("profile.save")}
          </Button>
        </div>

        {/* Progress Card */}
        <Card className="mb-8 border-primary bg-primary/10/50 dark:bg-primary dark:border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground">{t("profile.completion")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("profile.sectionsCompleted", { done: completedFields, total: profileFields.length })}
                </p>
              </div>
              <div className="text-2xl font-bold text-primary">{completionPercent}%</div>
            </div>
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/100 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Sections */}
        <div className="space-y-6">
          {/* About You */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                {t("profile.aboutYou")}
              </CardTitle>
              <CardDescription>{t("profile.aboutYouDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("profile.fullName")} <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    placeholder={t("profile.fullNamePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("footer.email")}</Label>
                  <Input
                    id="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                  <p className="text-xs text-muted-foreground">{t("profile.emailLocked")}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">{t("profile.bio")}</Label>
                <Textarea
                  id="bio"
                  placeholder={t("profile.bioPlaceholder")}
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/1000</p>
              </div>
            </CardContent>
          </Card>

          {/* Professional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
                {t("profile.professional")}
              </CardTitle>
              <CardDescription>{t("profile.professionalDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">{t("profile.jobTitle")}</Label>
                  <Input
                    id="jobTitle"
                    placeholder={t("profile.jobTitlePlaceholder")}
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">{t("footer.company")}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder={t("profile.companyPlaceholder")}
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">{t("profile.currentLocation")}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder={t("profile.locationPlaceholder")}
                    value={location}
                    onChange={(e) => setLocationValue(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-orange-600" />
                </div>
                {t("profile.interestsSkills")}
              </CardTitle>
              <CardDescription>{t("profile.interestsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="rounded-full pl-3 pr-1.5 py-1.5 bg-primary text-primary dark:bg-primary dark:text-primary"
                  >
                    {interest}
                    <button
                      onClick={() => removeInterest(interest)}
                      className="ml-1.5 h-4 w-4 rounded-full hover:bg-primary/90 dark:hover:bg-primary/90 flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="relative" ref={interestRef}>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("profile.addInterestPlaceholder")}
                    value={newInterest}
                    onChange={(e) => {
                      setNewInterest(e.target.value);
                      setShowInterestSuggestions(true);
                    }}
                    onFocus={() => setShowInterestSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newInterest.trim()) {
                        e.preventDefault();
                        addInterest(newInterest);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => newInterest.trim() && addInterest(newInterest)}
                    disabled={!newInterest.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {showInterestSuggestions && filteredInterestSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredInterestSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => addInterest(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-cyan-600" />
                </div>
                {t("profile.preferredLocations")}
              </CardTitle>
              <CardDescription>{t("profile.preferredLocationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {preferredLocations.map((loc) => (
                  <Badge
                    key={loc}
                    variant="secondary"
                    className="rounded-full pl-3 pr-1.5 py-1.5 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {loc}
                    <button
                      onClick={() => removeLocation(loc)}
                      className="ml-1.5 h-4 w-4 rounded-full hover:bg-cyan-200 dark:hover:bg-cyan-800 flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="relative" ref={locationRef}>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("profile.addLocationPlaceholder")}
                    value={newLocation}
                    onChange={(e) => {
                      setNewLocation(e.target.value);
                      setShowLocationSuggestions(true);
                    }}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newLocation.trim()) {
                        e.preventDefault();
                        addLocation(newLocation);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => newLocation.trim() && addLocation(newLocation)}
                    disabled={!newLocation.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {showLocationSuggestions && filteredLocationSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredLocationSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => addLocation(suggestion)}
                      >
                        <MapPin className="h-3 w-3 inline mr-2 text-muted-foreground" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Salary Expectations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                {t("profile.salary")}
              </CardTitle>
              <CardDescription>{t("profile.salaryDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryMin">{t("profile.salaryMin")}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="salaryMin"
                      type="number"
                      placeholder={t("profile.salaryMinPlaceholder")}
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryMax">{t("profile.salaryMax")}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="salaryMax"
                      type="number"
                      placeholder={t("profile.salaryMaxPlaceholder")}
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social & Web */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-indigo-600" />
                </div>
                {t("profile.social")}
              </CardTitle>
              <CardDescription>{t("profile.socialDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter / X</Label>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="twitter"
                      placeholder={t("profile.twitterPlaceholder")}
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value.replace("@", ""))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="linkedin"
                      placeholder="https://linkedin.com/in/your-profile"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">{t("profile.personalWebsite")}</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    placeholder="https://your-website.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CV Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-rose-600" />
                </div>
                {t("profile.resume")}
              </CardTitle>
              <CardDescription>{t("profile.resumeDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {profile?.cvUrl ? (
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <FileText className="h-10 w-10 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{t("profile.resumeUploaded")}</p>
                    <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      {t("profile.viewResume")}
                    </a>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.info(t("profile.cvComingSoon"))}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("profile.replace")}
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-foreground mb-1">{t("profile.dropResume")}</p>
                  <p className="text-sm text-muted-foreground">{t("profile.resumeFormats")}</p>
                  <Button variant="outline" className="mt-4" onClick={() => toast.info(t("profile.cvUploadComingSoon"))}>
                    {t("profile.chooseFile")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Save Bar */}
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t mt-8 -mx-6 lg:-mx-8 px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {updateProfile.isPending ? t("profile.saving") : t("profile.saveHint")}
            </p>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="bg-primary/100 hover:bg-primary/90 text-white gap-2"
              size="lg"
            >
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("profile.save")}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
