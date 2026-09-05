/**
 * Claimed Entity Editor
 * Allows users with approved claimed profiles to edit their entity
 * Supports: company, person, investor, event, accelerator
 * Comprehensive tabbed forms matching admin editor structure
 */

import { useState, useEffect } from "react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Save, Loader2, ShieldCheck, Building2,
  Users, Rocket, TrendingUp, Calendar, Globe, MapPin,
  Linkedin, Twitter, Mail, ExternalLink, CheckCircle2,
  User, Briefcase, GraduationCap, Award, BookOpen, Phone,
  Facebook, Instagram, Youtube, Github, Image, FileText,
  Plus, Trash2, BarChart3, Target, DollarSign, Handshake, Star,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type EntityType = "company" | "person" | "investor" | "event" | "accelerator";

const entityConfig: Record<EntityType, {
  label: string; icon: any; color: string; bgColor: string;
}> = {
  company: { label: "Company", icon: Building2, color: "text-primary", bgColor: "bg-primary/100/10" },
  person: { label: "Person", icon: Users, color: "text-purple-600", bgColor: "bg-purple-500/10" },
  investor: { label: "Investor", icon: TrendingUp, color: "text-amber-600", bgColor: "bg-amber-500/10" },
  event: { label: "Event", icon: Calendar, color: "text-rose-600", bgColor: "bg-rose-500/10" },
  accelerator: { label: "Accelerator", icon: Rocket, color: "text-cyan-600", bgColor: "bg-cyan-500/10" },
};

// ── Tab Definitions ──
const PERSON_TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "career", label: "Career", icon: Briefcase },
  { id: "expertise", label: "Expertise", icon: Award },
  { id: "social", label: "Links & Social", icon: Globe },
];
const INVESTOR_TABS = [
  { id: "profile", label: "Profile", icon: TrendingUp },
  { id: "thesis", label: "Investment Thesis", icon: Target },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "social", label: "Links & Social", icon: Globe },
];
const ACCEL_TABS = [
  { id: "profile", label: "Profile", icon: Rocket },
  { id: "program", label: "Program", icon: GraduationCap },
  { id: "application", label: "Application", icon: FileText },
  { id: "alumni", label: "Alumni", icon: Briefcase },
  { id: "social", label: "Links & Social", icon: Globe },
];

// ── JSON Array Types ──
type EducationItem = { institution: string; degree?: string; field?: string; year?: string };
type ExperienceItem = { company: string; role: string; startYear?: string; endYear?: string; description?: string };
type AchievementItem = { title: string; year?: string; description?: string };
type PublicationItem = { title: string; publisher?: string; year?: string; url?: string };
type BoardPosition = { company: string; role?: string; current?: boolean };
type AlumniCompany = { name: string; sector?: string; batch?: string; fundingRaised?: string };
type SuccessStory = { company: string; description?: string; outcome?: string; year?: number };
type PortfolioItem = { name: string; sector?: string; stage?: string; year?: number };
type NotableExit = { company: string; acquirer?: string; amount?: string; year?: number };

// ── Tab Navigation Component ──
function TabNav({ tabs, active, onSelect }: { tabs: { id: string; label: string; icon: any }[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-border">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button key={tab.id} type="button" onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
              active === tab.id
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}>
            <Icon className="h-4 w-4" />{tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Array Editor Helper ──
function ArrayEditor<T extends Record<string, any>>({
  items, setItems, fields, title, icon: Icon, emptyText, addLabel,
}: {
  items: T[]; setItems: (items: T[]) => void;
  fields: { key: keyof T; label: string; placeholder: string; type?: string; colSpan?: number }[];
  title: string; icon: any; emptyText: string; addLabel: string;
}) {
  const defaultItem = fields.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {} as T);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Icon className="h-4 w-4" />{title}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { ...defaultItem }])}>
            <Plus className="h-4 w-4 mr-1" />{addLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{emptyText}</p>}
        {items.map((item, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3 relative">
            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive"
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {fields.map(f => (
                <div key={String(f.key)} className={`space-y-1 ${f.colSpan === 3 ? "md:col-span-3" : f.colSpan === 2 ? "md:col-span-2" : ""}`}>
                  <Label className="text-xs">{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea value={String(item[f.key] || "")} rows={2} placeholder={f.placeholder}
                      onChange={e => { const n = [...items]; n[i] = { ...n[i], [f.key]: e.target.value }; setItems(n); }} />
                  ) : (
                    <Input type={f.type || "text"} value={String(item[f.key] || "")} placeholder={f.placeholder}
                      onChange={e => { const n = [...items]; n[i] = { ...n[i], [f.key]: e.target.value }; setItems(n); }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function ClaimedEntityEditor() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ entityType: string; entityId: string }>();
  const entityType = (params.entityType || "company") as EntityType;
  const entityId = Number(params.entityId);
  const config = entityConfig[entityType] || entityConfig.company;
  const Icon = config.icon;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const { data: entityData, isLoading, error } = trpc.claimedProfiles.getClaimedEntityForEdit.useQuery(
    { entityType, entityId },
    { enabled: !!user && !!entityId }
  );

  // ── COMPANY FORM ──
  const [companyForm, setCompanyForm] = useState({
    name: "", tagline: "", description: "", logo: "", website: "",
    linkedIn: "", twitter: "", location: "", industry: "",
    stage: "" as string, foundedYear: "", employeeCount: "", totalFunding: "",
  });

  // ── PERSON FORM ──
  const [personForm, setPersonForm] = useState({
    name: "", title: "", bio: "", shortBio: "", avatar: "", coverImage: "",
    company: "", linkedIn: "", twitter: "", facebook: "", instagram: "", youtube: "", github: "",
    email: "", website: "", location: "", nationality: "", languages: "",
    contactPhone: "",
    isAvailableForMentoring: false, isAvailableForSpeaking: false, isAvailableForAdvisory: false,
  });
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [publications, setPublications] = useState<PublicationItem[]>([]);
  const [boardPositions, setBoardPositions] = useState<BoardPosition[]>([]);
  const [speakingTopics, setSpeakingTopics] = useState<string[]>([]);
  const [expertise, setExpertise] = useState<string[]>([]);

  // ── INVESTOR FORM ──
  const [investorForm, setInvestorForm] = useState({
    name: "", type: "vc" as string, description: "", shortDescription: "",
    logo: "", coverImage: "", website: "", linkedIn: "", twitter: "", facebook: "", instagram: "",
    email: "", contactEmail: "", contactPhone: "", location: "",
    foundedYear: "", teamSize: "", aum: "", investmentStages: "",
    investmentThesis: "", ticketSize: "",
    totalInvestments: "", totalExits: "",
  });
  const [sectorFocus, setSectorFocus] = useState<string[]>([]);
  const [geographicFocus, setGeographicFocus] = useState<string[]>([]);
  const [portfolioHighlights, setPortfolioHighlights] = useState<PortfolioItem[]>([]);
  const [notableExits, setNotableExits] = useState<NotableExit[]>([]);

  // ── EVENT FORM ──
  const [eventForm, setEventForm] = useState({
    title: "", description: "", shortDescription: "", type: "conference" as string,
    format: "in_person" as string, featuredImage: "",
    startDate: "", endDate: "", venue: "", venueName: "", venueAddress: "",
    virtualUrl: "", registrationUrl: "", websiteUrl: "", ticketUrl: "",
    isFree: false, organizerName: "", organizerEmail: "", organizerWebsite: "",
  });

  // ── ACCELERATOR FORM ──
  const [accelForm, setAccelForm] = useState({
    name: "", description: "", shortDescription: "", logo: "", coverImage: "",
    website: "", linkedIn: "", twitter: "", facebook: "", instagram: "", youtube: "",
    email: "", contactEmail: "", contactPhone: "", location: "",
    programLength: "", equity: "", funding: "", benefits: "", requirements: "",
    applicationUrl: "", applicationDeadline: "", applicationProcess: "", mission: "",
    cohortSize: "", investmentRange: "", equityTaken: "", successRate: "",
    totalRaisedByAlumni: "", avgFollowon: "", nextCohortDate: "",
    batchCount: "", totalFunded: "",
    status: "active" as string,
  });
  const [alumniCompanies, setAlumniCompanies] = useState<AlumniCompany[]>([]);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);

  // ── Pre-fill forms ──
  useEffect(() => {
    if (!entityData?.entity) return;
    const e = entityData.entity as any;

    switch (entityType) {
      case "company":
        setCompanyForm({
          name: e.name || "", tagline: e.tagline || "", description: e.description || "",
          logo: e.logo || "", website: e.website || "", linkedIn: e.linkedIn || "",
          twitter: e.twitter || "", location: e.location || "", industry: e.industry || "",
          stage: e.stage || "", foundedYear: e.foundedYear ? String(e.foundedYear) : "",
          employeeCount: e.employeeCount || "", totalFunding: e.totalFunding || "",
        });
        break;
      case "person":
        setPersonForm({
          name: e.name || "", title: e.title || "", bio: e.bio || "",
          shortBio: e.shortBio || "", avatar: e.avatar || "", coverImage: e.coverImage || "",
          company: e.company || "", linkedIn: e.linkedIn || "", twitter: e.twitter || "",
          facebook: e.facebook || "", instagram: e.instagram || "", youtube: e.youtube || "",
          github: e.github || "", email: e.email || "", website: e.website || "",
          location: e.location || "", nationality: e.nationality || "", languages: e.languages || "",
          contactPhone: e.contactPhone || "",
          isAvailableForMentoring: e.isAvailableForMentoring || false,
          isAvailableForSpeaking: e.isAvailableForSpeaking || false,
          isAvailableForAdvisory: e.isAvailableForAdvisory || false,
        });
        if (Array.isArray(e.education)) setEducation(e.education);
        if (Array.isArray(e.experience)) setExperience(e.experience);
        if (Array.isArray(e.achievements)) setAchievements(e.achievements);
        if (Array.isArray(e.publications)) setPublications(e.publications);
        if (Array.isArray(e.boardPositions)) setBoardPositions(e.boardPositions);
        if (Array.isArray(e.speakingTopics)) setSpeakingTopics(e.speakingTopics);
        if (Array.isArray(e.expertise)) setExpertise(e.expertise);
        break;
      case "investor":
        setInvestorForm({
          name: e.name || "", type: e.type || "vc", description: e.description || "",
          shortDescription: e.shortDescription || "", logo: e.logo || "", coverImage: e.coverImage || "",
          website: e.website || "", linkedIn: e.linkedIn || "", twitter: e.twitter || "",
          facebook: e.facebook || "", instagram: e.instagram || "",
          email: e.email || "", contactEmail: e.contactEmail || "", contactPhone: e.contactPhone || "",
          location: e.location || "",
          foundedYear: e.foundedYear ? String(e.foundedYear) : "",
          teamSize: e.teamSize || "", aum: e.aum || "",
          investmentStages: Array.isArray(e.investmentStages) ? e.investmentStages.join(", ") : (e.investmentStages || ""),
          investmentThesis: e.investmentThesis || "", ticketSize: e.ticketSize || "",
          totalInvestments: e.totalInvestments ? String(e.totalInvestments) : "",
          totalExits: e.totalExits ? String(e.totalExits) : "",
        });
        if (Array.isArray(e.sectorFocus)) setSectorFocus(e.sectorFocus);
        if (Array.isArray(e.geographicFocus)) setGeographicFocus(e.geographicFocus);
        if (Array.isArray(e.portfolioHighlights)) setPortfolioHighlights(e.portfolioHighlights);
        if (Array.isArray(e.notableExits)) setNotableExits(e.notableExits);
        break;
      case "event":
        setEventForm({
          title: e.title || "", description: e.description || "",
          shortDescription: e.shortDescription || "", type: e.type || "conference",
          format: e.format || "in_person", featuredImage: e.featuredImage || e.coverImage || "",
          startDate: e.startDate ? new Date(e.startDate).toISOString().slice(0, 16) : "",
          endDate: e.endDate ? new Date(e.endDate).toISOString().slice(0, 16) : "",
          venue: e.venue || "", venueName: e.venueName || "", venueAddress: e.venueAddress || "",
          virtualUrl: e.virtualUrl || "", registrationUrl: e.registrationUrl || "",
          websiteUrl: e.websiteUrl || "", ticketUrl: e.ticketUrl || "",
          isFree: e.isFree || false, organizerName: e.organizerName || "",
          organizerEmail: e.organizerEmail || "", organizerWebsite: e.organizerWebsite || "",
        });
        break;
      case "accelerator":
        setAccelForm({
          name: e.name || "", description: e.description || "",
          shortDescription: e.shortDescription || "", logo: e.logo || "", coverImage: e.coverImage || "",
          website: e.website || "", linkedIn: e.linkedIn || "", twitter: e.twitter || "",
          facebook: e.facebook || "", instagram: e.instagram || "", youtube: e.youtube || "",
          email: e.email || "", contactEmail: e.contactEmail || "", contactPhone: e.contactPhone || "",
          location: e.location || "",
          programLength: e.programLength || "", equity: e.equity || "", funding: e.funding || "",
          benefits: e.benefits || "", requirements: e.requirements || "",
          applicationUrl: e.applicationUrl || "", applicationDeadline: e.applicationDeadline || "",
          applicationProcess: e.applicationProcess || "", mission: e.mission || "",
          cohortSize: e.cohortSize || "", investmentRange: e.investmentRange || "",
          equityTaken: e.equityTaken || "", successRate: e.successRate || "",
          totalRaisedByAlumni: e.totalRaisedByAlumni || "", avgFollowon: e.avgFollowon || "",
          nextCohortDate: e.nextCohortDate || "",
          batchCount: e.batchCount?.toString() || "", totalFunded: e.totalFunded?.toString() || "",
          status: e.status || "active",
        });
        if (Array.isArray(e.alumniCompanies)) setAlumniCompanies(e.alumniCompanies);
        if (Array.isArray(e.successStories)) setSuccessStories(e.successStories);
        break;
    }
  }, [entityData, entityType]);

  // ── Mutations ──
  const editCompanyMutation = trpc.claimedProfiles.editClaimedCompany.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Company updated!"); setSaving(false); },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });
  const editPersonMutation = trpc.claimedProfiles.editClaimedPerson.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Person updated!"); setSaving(false); },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });
  const editInvestorMutation = trpc.claimedProfiles.editClaimedInvestor.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Investor updated!"); setSaving(false); },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });
  const editEventMutation = trpc.claimedProfiles.editClaimedEvent.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Event updated!"); setSaving(false); },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });
  const editAccelMutation = trpc.claimedProfiles.editClaimedAccelerator.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Accelerator updated!"); setSaving(false); },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    switch (entityType) {
      case "company":
        editCompanyMutation.mutate({
          companyId: entityId,
          name: companyForm.name || undefined, tagline: companyForm.tagline || undefined,
          description: companyForm.description || undefined, logo: companyForm.logo || undefined,
          website: companyForm.website || undefined, linkedIn: companyForm.linkedIn || undefined,
          twitter: companyForm.twitter || undefined, location: companyForm.location || undefined,
          industry: companyForm.industry || undefined, stage: (companyForm.stage || undefined) as any,
          foundedYear: companyForm.foundedYear ? parseInt(companyForm.foundedYear) : undefined,
          employeeCount: companyForm.employeeCount || undefined, totalFunding: companyForm.totalFunding || undefined,
        });
        break;
      case "person":
        editPersonMutation.mutate({
          personId: entityId,
          name: personForm.name || undefined, title: personForm.title || undefined,
          bio: personForm.bio || undefined, shortBio: personForm.shortBio || undefined,
          avatar: personForm.avatar || undefined, coverImage: personForm.coverImage || undefined,
          company: personForm.company || undefined, linkedIn: personForm.linkedIn || undefined,
          twitter: personForm.twitter || undefined, facebook: personForm.facebook || undefined,
          instagram: personForm.instagram || undefined, youtube: personForm.youtube || undefined,
          github: personForm.github || undefined,
          email: personForm.email || undefined, website: personForm.website || undefined,
          location: personForm.location || undefined, nationality: personForm.nationality || undefined,
          languages: personForm.languages || undefined, contactPhone: personForm.contactPhone || undefined,
          isAvailableForMentoring: personForm.isAvailableForMentoring,
          isAvailableForSpeaking: personForm.isAvailableForSpeaking,
          isAvailableForAdvisory: personForm.isAvailableForAdvisory,
          expertise: expertise.length > 0 ? expertise : undefined,
          education: education.length > 0 ? education : undefined,
          experience: experience.length > 0 ? experience : undefined,
          achievements: achievements.length > 0 ? achievements : undefined,
          publications: publications.length > 0 ? publications : undefined,
          boardPositions: boardPositions.length > 0 ? boardPositions : undefined,
          speakingTopics: speakingTopics.length > 0 ? speakingTopics : undefined,
        });
        break;
      case "investor":
        editInvestorMutation.mutate({
          investorId: entityId,
          name: investorForm.name || undefined, type: (investorForm.type || undefined) as any,
          description: investorForm.description || undefined, shortDescription: investorForm.shortDescription || undefined,
          logo: investorForm.logo || undefined, coverImage: investorForm.coverImage || undefined,
          website: investorForm.website || undefined, linkedIn: investorForm.linkedIn || undefined,
          twitter: investorForm.twitter || undefined, facebook: investorForm.facebook || undefined,
          instagram: investorForm.instagram || undefined,
          email: investorForm.email || undefined, contactEmail: investorForm.contactEmail || undefined,
          contactPhone: investorForm.contactPhone || undefined, location: investorForm.location || undefined,
          foundedYear: investorForm.foundedYear ? parseInt(investorForm.foundedYear) : undefined,
          teamSize: investorForm.teamSize || undefined, aum: investorForm.aum || undefined,
          investmentStages: investorForm.investmentStages || undefined,
          investmentThesis: investorForm.investmentThesis || undefined,
          ticketSize: investorForm.ticketSize || undefined,
          totalInvestments: investorForm.totalInvestments ? parseInt(investorForm.totalInvestments) : undefined,
          totalExits: investorForm.totalExits ? parseInt(investorForm.totalExits) : undefined,
          sectorFocus: sectorFocus.length > 0 ? sectorFocus : undefined,
          geographicFocus: geographicFocus.length > 0 ? geographicFocus : undefined,
          portfolioHighlights: portfolioHighlights.length > 0 ? portfolioHighlights : undefined,
          notableExits: notableExits.length > 0 ? notableExits : undefined,
        });
        break;
      case "event":
        editEventMutation.mutate({
          eventId: entityId,
          title: eventForm.title || undefined, description: eventForm.description || undefined,
          shortDescription: eventForm.shortDescription || undefined,
          type: (eventForm.type || undefined) as any, format: (eventForm.format || undefined) as any,
          featuredImage: eventForm.featuredImage || undefined,
          startDate: eventForm.startDate ? new Date(eventForm.startDate) : undefined,
          endDate: eventForm.endDate ? new Date(eventForm.endDate) : undefined,
          venue: eventForm.venue || undefined, venueName: eventForm.venueName || undefined,
          venueAddress: eventForm.venueAddress || undefined,
          virtualUrl: eventForm.virtualUrl || undefined, registrationUrl: eventForm.registrationUrl || undefined,
          websiteUrl: eventForm.websiteUrl || undefined, ticketUrl: eventForm.ticketUrl || undefined,
          isFree: eventForm.isFree, organizerName: eventForm.organizerName || undefined,
          organizerEmail: eventForm.organizerEmail || undefined, organizerWebsite: eventForm.organizerWebsite || undefined,
        });
        break;
      case "accelerator":
        editAccelMutation.mutate({
          acceleratorId: entityId,
          name: accelForm.name || undefined, description: accelForm.description || undefined,
          shortDescription: accelForm.shortDescription || undefined,
          logo: accelForm.logo || undefined, coverImage: accelForm.coverImage || undefined,
          website: accelForm.website || undefined, linkedIn: accelForm.linkedIn || undefined,
          twitter: accelForm.twitter || undefined, facebook: accelForm.facebook || undefined,
          instagram: accelForm.instagram || undefined, youtube: accelForm.youtube || undefined,
          email: accelForm.email || undefined, contactEmail: accelForm.contactEmail || undefined,
          contactPhone: accelForm.contactPhone || undefined, location: accelForm.location || undefined,
          programLength: accelForm.programLength || undefined, equity: accelForm.equity || undefined,
          funding: accelForm.funding || undefined, benefits: accelForm.benefits || undefined,
          requirements: accelForm.requirements || undefined, applicationUrl: accelForm.applicationUrl || undefined,
          applicationDeadline: accelForm.applicationDeadline || undefined,
          applicationProcess: accelForm.applicationProcess || undefined,
          mission: accelForm.mission || undefined, cohortSize: accelForm.cohortSize || undefined,
          investmentRange: accelForm.investmentRange || undefined, equityTaken: accelForm.equityTaken || undefined,
          successRate: accelForm.successRate || undefined, totalRaisedByAlumni: accelForm.totalRaisedByAlumni || undefined,
          avgFollowon: accelForm.avgFollowon || undefined, nextCohortDate: accelForm.nextCohortDate || undefined,
          batchCount: accelForm.batchCount ? parseInt(accelForm.batchCount) : undefined,
          totalFunded: accelForm.totalFunded ? parseInt(accelForm.totalFunded) : undefined,
          alumniCompanies: alumniCompanies.length > 0 ? alumniCompanies : undefined,
          successStories: successStories.length > 0 ? successStories : undefined,
          status: (accelForm.status || undefined) as any,
        });
        break;
    }
  };

  // ── Loading / Error States ──
  if (authLoading || isLoading) {
    return (
      <><Header />
      <div className="container max-w-4xl py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
          <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-48 bg-muted/30 rounded-xl animate-pulse" />
        </div>
      </div>
      <Footer /></>
    );
  }

  if (!user) { navigate("/signin"); return null; }

  if (error) {
    return (
      <><Header />
      <div className="container max-w-4xl py-8">
        <Link href="/dashboard/my-content">
          <Button variant="ghost" size="sm" className="gap-1 mb-6"><ArrowLeft className="w-4 h-4" /> My Content</Button>
        </Link>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex flex-col items-center text-center py-12">
            <p className="text-lg font-semibold text-red-600 mb-2">Access Denied</p>
            <p className="text-muted-foreground max-w-md">{error.message || "You don't have permission to edit this entity."}</p>
          </CardContent>
        </Card>
      </div>
      <Footer /></>
    );
  }

  // ── Tag Input Helper ──
  const TagInput = ({ tags, setTags, placeholder }: { tags: string[]; setTags: (t: string[]) => void; placeholder: string }) => {
    const [input, setInput] = useState("");
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {tag}
              <button type="button" onClick={() => setTags(tags.filter((_, idx) => idx !== i))} className="ml-1 hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder}
            onKeyDown={e => { if (e.key === "Enter" && input.trim()) { e.preventDefault(); setTags([...tags, input.trim()]); setInput(""); } }} />
          <Button type="button" variant="outline" size="sm" disabled={!input.trim()}
            onClick={() => { if (input.trim()) { setTags([...tags, input.trim()]); setInput(""); } }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <><Header />
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/my-content">
          <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="w-4 h-4" /> My Content</Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-[Montserrat]">Edit {config.label}</h1>
            <p className="text-sm text-muted-foreground">Update your {config.label.toLowerCase()} profile details</p>
          </div>
        </div>
        <Badge variant="outline" className="text-primary border-primary bg-primary/100/10">
          <ShieldCheck className="w-3 h-3 mr-1" /> Claimed & Verified
        </Badge>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/100/10 border border-primary mb-6">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">Changes saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ═══════════════════ COMPANY FORM ═══════════════════ */}
        {entityType === "company" && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Company Information</CardTitle><CardDescription>Core details about your company</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Company Name</Label><Input value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Industry</Label><Input value={companyForm.industry} onChange={e => setCompanyForm({ ...companyForm, industry: e.target.value })} placeholder="e.g. FinTech" /></div>
                </div>
                <div className="space-y-2"><Label>Tagline</Label><Input value={companyForm.tagline} onChange={e => setCompanyForm({ ...companyForm, tagline: e.target.value })} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={companyForm.description} onChange={e => setCompanyForm({ ...companyForm, description: e.target.value })} rows={5} /></div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Logo URL</Label><Input value={companyForm.logo} onChange={e => setCompanyForm({ ...companyForm, logo: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Location</Label><Input value={companyForm.location} onChange={e => setCompanyForm({ ...companyForm, location: e.target.value })} /></div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Stage</Label>
                    <Select value={companyForm.stage} onValueChange={v => setCompanyForm({ ...companyForm, stage: v })}>
                      <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pre_seed">Pre-Seed</SelectItem><SelectItem value="seed">Seed</SelectItem>
                        <SelectItem value="series_a">Series A</SelectItem><SelectItem value="series_b">Series B</SelectItem>
                        <SelectItem value="series_c">Series C+</SelectItem><SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="ipo">IPO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Founded Year</Label><Input type="number" value={companyForm.foundedYear} onChange={e => setCompanyForm({ ...companyForm, foundedYear: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Employee Count</Label><Input value={companyForm.employeeCount} onChange={e => setCompanyForm({ ...companyForm, employeeCount: e.target.value })} /></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Online Presence</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website</Label><Input value={companyForm.website} onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })} /></div>
                  <div className="space-y-2"><Label className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</Label><Input value={companyForm.linkedIn} onChange={e => setCompanyForm({ ...companyForm, linkedIn: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label className="flex items-center gap-1.5"><Twitter className="w-3.5 h-3.5" /> Twitter / X</Label><Input value={companyForm.twitter} onChange={e => setCompanyForm({ ...companyForm, twitter: e.target.value })} /></div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══════════════════ PERSON FORM (TABBED) ═══════════════════ */}
        {entityType === "person" && (
          <>
            <TabNav tabs={PERSON_TABS} active={activeTab} onSelect={setActiveTab} />

            {activeTab === "profile" && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Full Name</Label><Input value={personForm.name} onChange={e => setPersonForm({ ...personForm, name: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Title / Role</Label><Input value={personForm.title} onChange={e => setPersonForm({ ...personForm, title: e.target.value })} placeholder="e.g. CEO at TechBanq" /></div>
                    </div>
                    <div className="space-y-2"><Label>Bio</Label><Textarea value={personForm.bio} onChange={e => setPersonForm({ ...personForm, bio: e.target.value })} rows={4} /></div>
                    <div className="space-y-2"><Label>Short Bio</Label><Input value={personForm.shortBio} onChange={e => setPersonForm({ ...personForm, shortBio: e.target.value })} placeholder="One-liner bio" /></div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Photo URL</Label><Input value={personForm.avatar} onChange={e => setPersonForm({ ...personForm, avatar: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Cover Image URL</Label><Input value={personForm.coverImage} onChange={e => setPersonForm({ ...personForm, coverImage: e.target.value })} /></div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Company</Label><Input value={personForm.company} onChange={e => setPersonForm({ ...personForm, company: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Location</Label><Input value={personForm.location} onChange={e => setPersonForm({ ...personForm, location: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Nationality</Label><Input value={personForm.nationality} onChange={e => setPersonForm({ ...personForm, nationality: e.target.value })} /></div>
                    </div>
                    <div className="space-y-2"><Label>Languages</Label><Input value={personForm.languages} onChange={e => setPersonForm({ ...personForm, languages: e.target.value })} placeholder="English, Arabic, French" /></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Availability</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between"><div><Label>Available for Mentoring</Label><p className="text-xs text-muted-foreground">Open to mentor startups</p></div><Switch checked={personForm.isAvailableForMentoring} onCheckedChange={v => setPersonForm({ ...personForm, isAvailableForMentoring: v })} /></div>
                    <div className="flex items-center justify-between"><div><Label>Available for Speaking</Label><p className="text-xs text-muted-foreground">Open to speaking engagements</p></div><Switch checked={personForm.isAvailableForSpeaking} onCheckedChange={v => setPersonForm({ ...personForm, isAvailableForSpeaking: v })} /></div>
                    <div className="flex items-center justify-between"><div><Label>Available for Advisory</Label><p className="text-xs text-muted-foreground">Open to advisory roles</p></div><Switch checked={personForm.isAvailableForAdvisory} onCheckedChange={v => setPersonForm({ ...personForm, isAvailableForAdvisory: v })} /></div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "career" && (
              <>
                <ArrayEditor items={experience} setItems={setExperience} title="Work Experience" icon={Briefcase} emptyText="No experience added." addLabel="Add"
                  fields={[
                    { key: "company", label: "Company *", placeholder: "Company name" },
                    { key: "role", label: "Role *", placeholder: "Job title" },
                    { key: "startYear", label: "Start Year", placeholder: "2020" },
                    { key: "endYear", label: "End Year", placeholder: "Present" },
                    { key: "description", label: "Description", placeholder: "What you did...", type: "textarea", colSpan: 3 },
                  ]} />
                <ArrayEditor items={education} setItems={setEducation} title="Education" icon={GraduationCap} emptyText="No education added." addLabel="Add"
                  fields={[
                    { key: "institution", label: "Institution *", placeholder: "University" },
                    { key: "degree", label: "Degree", placeholder: "MBA" },
                    { key: "field", label: "Field", placeholder: "Computer Science" },
                    { key: "year", label: "Year", placeholder: "2018" },
                  ]} />
                <ArrayEditor items={boardPositions} setItems={setBoardPositions} title="Board Positions" icon={Users} emptyText="No board positions added." addLabel="Add"
                  fields={[
                    { key: "company", label: "Organization *", placeholder: "Company" },
                    { key: "role", label: "Role", placeholder: "Board Member" },
                  ]} />
              </>
            )}

            {activeTab === "expertise" && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />Areas of Expertise</CardTitle></CardHeader>
                  <CardContent><TagInput tags={expertise} setTags={setExpertise} placeholder="Add expertise (press Enter)" /></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Speaking Topics</CardTitle></CardHeader>
                  <CardContent><TagInput tags={speakingTopics} setTags={setSpeakingTopics} placeholder="Add topic (press Enter)" /></CardContent>
                </Card>
                <ArrayEditor items={achievements} setItems={setAchievements} title="Achievements & Awards" icon={Star} emptyText="No achievements added." addLabel="Add"
                  fields={[
                    { key: "title", label: "Title *", placeholder: "Award name" },
                    { key: "year", label: "Year", placeholder: "2023" },
                    { key: "description", label: "Description", placeholder: "Details...", type: "textarea", colSpan: 3 },
                  ]} />
                <ArrayEditor items={publications} setItems={setPublications} title="Publications" icon={BookOpen} emptyText="No publications added." addLabel="Add"
                  fields={[
                    { key: "title", label: "Title *", placeholder: "Publication title" },
                    { key: "publisher", label: "Publisher", placeholder: "Journal / Platform" },
                    { key: "year", label: "Year", placeholder: "2023" },
                    { key: "url", label: "URL", placeholder: "https://...", colSpan: 3 },
                  ]} />
              </>
            )}

            {activeTab === "social" && (
              <Card>
                <CardHeader><CardTitle className="text-base">Contact & Social Links</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</Label><Input value={personForm.email} onChange={e => setPersonForm({ ...personForm, email: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</Label><Input value={personForm.contactPhone} onChange={e => setPersonForm({ ...personForm, contactPhone: e.target.value })} /></div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website</Label><Input value={personForm.website} onChange={e => setPersonForm({ ...personForm, website: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</Label><Input value={personForm.linkedIn} onChange={e => setPersonForm({ ...personForm, linkedIn: e.target.value })} /></div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Twitter className="w-3.5 h-3.5" /> Twitter / X</Label><Input value={personForm.twitter} onChange={e => setPersonForm({ ...personForm, twitter: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Facebook className="w-3.5 h-3.5" /> Facebook</Label><Input value={personForm.facebook} onChange={e => setPersonForm({ ...personForm, facebook: e.target.value })} /></div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" /> Instagram</Label><Input value={personForm.instagram} onChange={e => setPersonForm({ ...personForm, instagram: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Youtube className="w-3.5 h-3.5" /> YouTube</Label><Input value={personForm.youtube} onChange={e => setPersonForm({ ...personForm, youtube: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Github className="w-3.5 h-3.5" /> GitHub</Label><Input value={personForm.github} onChange={e => setPersonForm({ ...personForm, github: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ═══════════════════ INVESTOR FORM (TABBED) ═══════════════════ */}
        {entityType === "investor" && (
          <>
            <TabNav tabs={INVESTOR_TABS} active={activeTab} onSelect={setActiveTab} />

            {activeTab === "profile" && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base">Investor Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Name</Label><Input value={investorForm.name} onChange={e => setInvestorForm({ ...investorForm, name: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Type</Label>
                        <Select value={investorForm.type} onValueChange={v => setInvestorForm({ ...investorForm, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vc">Venture Capital</SelectItem><SelectItem value="angel">Angel</SelectItem>
                            <SelectItem value="corporate_vc">Corporate VC</SelectItem><SelectItem value="family_office">Family Office</SelectItem>
                            <SelectItem value="accelerator">Accelerator</SelectItem><SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Description</Label><Textarea value={investorForm.description} onChange={e => setInvestorForm({ ...investorForm, description: e.target.value })} rows={4} /></div>
                    <div className="space-y-2"><Label>Short Description</Label><Input value={investorForm.shortDescription} onChange={e => setInvestorForm({ ...investorForm, shortDescription: e.target.value })} /></div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Logo URL</Label><Input value={investorForm.logo} onChange={e => setInvestorForm({ ...investorForm, logo: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Cover Image</Label><Input value={investorForm.coverImage} onChange={e => setInvestorForm({ ...investorForm, coverImage: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Location</Label><Input value={investorForm.location} onChange={e => setInvestorForm({ ...investorForm, location: e.target.value })} /></div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>AUM</Label><Input value={investorForm.aum} onChange={e => setInvestorForm({ ...investorForm, aum: e.target.value })} placeholder="$500M" /></div>
                      <div className="space-y-2"><Label>Team Size</Label><Input value={investorForm.teamSize} onChange={e => setInvestorForm({ ...investorForm, teamSize: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Founded Year</Label><Input type="number" value={investorForm.foundedYear} onChange={e => setInvestorForm({ ...investorForm, foundedYear: e.target.value })} /></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</Label><Input value={investorForm.email} onChange={e => setInvestorForm({ ...investorForm, email: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Contact Email</Label><Input value={investorForm.contactEmail} onChange={e => setInvestorForm({ ...investorForm, contactEmail: e.target.value })} /></div>
                      <div className="space-y-2"><Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</Label><Input value={investorForm.contactPhone} onChange={e => setInvestorForm({ ...investorForm, contactPhone: e.target.value })} /></div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "thesis" && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />Investment Thesis</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label>Investment Thesis</Label><Textarea value={investorForm.investmentThesis} onChange={e => setInvestorForm({ ...investorForm, investmentThesis: e.target.value })} rows={4} placeholder="What you invest in and why..." /></div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Investment Stages</Label><Input value={investorForm.investmentStages} onChange={e => setInvestorForm({ ...investorForm, investmentStages: e.target.value })} placeholder="Seed, Series A, Series B" /></div>
                      <div className="space-y-2"><Label>Ticket Size</Label><Input value={investorForm.ticketSize} onChange={e => setInvestorForm({ ...investorForm, ticketSize: e.target.value })} placeholder="$100K - $2M" /></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Sector Focus</CardTitle></CardHeader>
                  <CardContent><TagInput tags={sectorFocus} setTags={setSectorFocus} placeholder="Add sector (press Enter)" /></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Geographic Focus</CardTitle></CardHeader>
                  <CardContent><TagInput tags={geographicFocus} setTags={setGeographicFocus} placeholder="Add region (press Enter)" /></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Metrics</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Total Investments</Label><Input type="number" value={investorForm.totalInvestments} onChange={e => setInvestorForm({ ...investorForm, totalInvestments: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Total Exits</Label><Input type="number" value={investorForm.totalExits} onChange={e => setInvestorForm({ ...investorForm, totalExits: e.target.value })} /></div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "portfolio" && (
              <>
                <ArrayEditor items={portfolioHighlights} setItems={setPortfolioHighlights} title="Portfolio Highlights" icon={Briefcase} emptyText="No portfolio companies added." addLabel="Add"
                  fields={[
                    { key: "name", label: "Company *", placeholder: "Company name" },
                    { key: "sector", label: "Sector", placeholder: "Fintech" },
                    { key: "stage", label: "Stage", placeholder: "Series A" },
                  ]} />
                <ArrayEditor items={notableExits} setItems={setNotableExits} title="Notable Exits" icon={TrendingUp} emptyText="No exits added." addLabel="Add"
                  fields={[
                    { key: "company", label: "Company *", placeholder: "Company" },
                    { key: "acquirer", label: "Acquirer", placeholder: "Acquiring company" },
                    { key: "amount", label: "Amount", placeholder: "$50M" },
                  ]} />
              </>
            )}

            {activeTab === "social" && (
              <Card>
                <CardHeader><CardTitle className="text-base">Online Presence</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website</Label><Input value={investorForm.website} onChange={e => setInvestorForm({ ...investorForm, website: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</Label><Input value={investorForm.linkedIn} onChange={e => setInvestorForm({ ...investorForm, linkedIn: e.target.value })} /></div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Twitter className="w-3.5 h-3.5" /> Twitter / X</Label><Input value={investorForm.twitter} onChange={e => setInvestorForm({ ...investorForm, twitter: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Facebook className="w-3.5 h-3.5" /> Facebook</Label><Input value={investorForm.facebook} onChange={e => setInvestorForm({ ...investorForm, facebook: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" /> Instagram</Label><Input value={investorForm.instagram} onChange={e => setInvestorForm({ ...investorForm, instagram: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ═══════════════════ EVENT FORM ═══════════════════ */}
        {entityType === "event" && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Event Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Event Name</Label><Input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={eventForm.type} onValueChange={v => setEventForm({ ...eventForm, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conference">Conference</SelectItem><SelectItem value="webinar">Webinar</SelectItem>
                        <SelectItem value="meetup">Meetup</SelectItem><SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="hackathon">Hackathon</SelectItem><SelectItem value="summit">Summit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} rows={4} /></div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Format</Label>
                    <Select value={eventForm.format} onValueChange={v => setEventForm({ ...eventForm, format: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_person">In Person</SelectItem><SelectItem value="virtual">Virtual</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Featured Image URL</Label><Input value={eventForm.featuredImage} onChange={e => setEventForm({ ...eventForm, featuredImage: e.target.value })} /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Start Date</Label><Input type="datetime-local" value={eventForm.startDate} onChange={e => setEventForm({ ...eventForm, startDate: e.target.value })} /></div>
                  <div className="space-y-2"><Label>End Date</Label><Input type="datetime-local" value={eventForm.endDate} onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })} /></div>
                </div>
                <div className="flex items-center gap-3"><Switch checked={eventForm.isFree} onCheckedChange={v => setEventForm({ ...eventForm, isFree: v })} /><Label>Free event</Label></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Venue & Links</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Venue Name</Label><Input value={eventForm.venueName} onChange={e => setEventForm({ ...eventForm, venueName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Venue Address</Label><Input value={eventForm.venueAddress} onChange={e => setEventForm({ ...eventForm, venueAddress: e.target.value })} /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Registration URL</Label><Input value={eventForm.registrationUrl} onChange={e => setEventForm({ ...eventForm, registrationUrl: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Website URL</Label><Input value={eventForm.websiteUrl} onChange={e => setEventForm({ ...eventForm, websiteUrl: e.target.value })} /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Ticket URL</Label><Input value={eventForm.ticketUrl} onChange={e => setEventForm({ ...eventForm, ticketUrl: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Virtual URL</Label><Input value={eventForm.virtualUrl} onChange={e => setEventForm({ ...eventForm, virtualUrl: e.target.value })} /></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Organizer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Organizer Name</Label><Input value={eventForm.organizerName} onChange={e => setEventForm({ ...eventForm, organizerName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Organizer Email</Label><Input value={eventForm.organizerEmail} onChange={e => setEventForm({ ...eventForm, organizerEmail: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Organizer Website</Label><Input value={eventForm.organizerWebsite} onChange={e => setEventForm({ ...eventForm, organizerWebsite: e.target.value })} /></div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══════════════════ ACCELERATOR FORM (TABBED) ═══════════════════ */}
        {entityType === "accelerator" && (
          <>
            <TabNav tabs={ACCEL_TABS} active={activeTab} onSelect={setActiveTab} />

            {activeTab === "profile" && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base">Program Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Program Name</Label><Input value={accelForm.name} onChange={e => setAccelForm({ ...accelForm, name: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Status</Label>
                        <Select value={accelForm.status} onValueChange={v => setAccelForm({ ...accelForm, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem><SelectItem value="paused">Paused</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Description</Label><Textarea value={accelForm.description} onChange={e => setAccelForm({ ...accelForm, description: e.target.value })} rows={4} /></div>
                    <div className="space-y-2"><Label>Short Description</Label><Input value={accelForm.shortDescription} onChange={e => setAccelForm({ ...accelForm, shortDescription: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Mission</Label><Textarea value={accelForm.mission} onChange={e => setAccelForm({ ...accelForm, mission: e.target.value })} rows={3} /></div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Logo URL</Label><Input value={accelForm.logo} onChange={e => setAccelForm({ ...accelForm, logo: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Cover Image</Label><Input value={accelForm.coverImage} onChange={e => setAccelForm({ ...accelForm, coverImage: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Location</Label><Input value={accelForm.location} onChange={e => setAccelForm({ ...accelForm, location: e.target.value })} /></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Email</Label><Input value={accelForm.email} onChange={e => setAccelForm({ ...accelForm, email: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Contact Email</Label><Input value={accelForm.contactEmail} onChange={e => setAccelForm({ ...accelForm, contactEmail: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Phone</Label><Input value={accelForm.contactPhone} onChange={e => setAccelForm({ ...accelForm, contactPhone: e.target.value })} /></div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "program" && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4" />Program Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Program Length</Label><Input value={accelForm.programLength} onChange={e => setAccelForm({ ...accelForm, programLength: e.target.value })} placeholder="12 weeks" /></div>
                      <div className="space-y-2"><Label>Cohort Size</Label><Input value={accelForm.cohortSize} onChange={e => setAccelForm({ ...accelForm, cohortSize: e.target.value })} placeholder="10-15" /></div>
                      <div className="space-y-2"><Label>Batch Count</Label><Input type="number" value={accelForm.batchCount} onChange={e => setAccelForm({ ...accelForm, batchCount: e.target.value })} /></div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Investment Range</Label><Input value={accelForm.investmentRange} onChange={e => setAccelForm({ ...accelForm, investmentRange: e.target.value })} placeholder="$50K-$150K" /></div>
                      <div className="space-y-2"><Label>Equity Taken</Label><Input value={accelForm.equityTaken} onChange={e => setAccelForm({ ...accelForm, equityTaken: e.target.value })} placeholder="5-10%" /></div>
                      <div className="space-y-2"><Label>Next Cohort</Label><Input value={accelForm.nextCohortDate} onChange={e => setAccelForm({ ...accelForm, nextCohortDate: e.target.value })} placeholder="March 2026" /></div>
                    </div>
                    <div className="space-y-2"><Label>Benefits</Label><Textarea value={accelForm.benefits} onChange={e => setAccelForm({ ...accelForm, benefits: e.target.value })} rows={3} /></div>
                    <div className="space-y-2"><Label>Requirements</Label><Textarea value={accelForm.requirements} onChange={e => setAccelForm({ ...accelForm, requirements: e.target.value })} rows={3} /></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Impact Metrics</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Total Funded</Label><Input type="number" value={accelForm.totalFunded} onChange={e => setAccelForm({ ...accelForm, totalFunded: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Total Raised by Alumni</Label><Input value={accelForm.totalRaisedByAlumni} onChange={e => setAccelForm({ ...accelForm, totalRaisedByAlumni: e.target.value })} placeholder="$2.5B" /></div>
                      <div className="space-y-2"><Label>Success Rate</Label><Input value={accelForm.successRate} onChange={e => setAccelForm({ ...accelForm, successRate: e.target.value })} placeholder="85%" /></div>
                    </div>
                    <div className="space-y-2"><Label>Avg Follow-on Funding</Label><Input value={accelForm.avgFollowon} onChange={e => setAccelForm({ ...accelForm, avgFollowon: e.target.value })} placeholder="$1.2M" /></div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "application" && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Application</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Application Deadline</Label><Input value={accelForm.applicationDeadline} onChange={e => setAccelForm({ ...accelForm, applicationDeadline: e.target.value })} placeholder="March 15, 2026" /></div>
                    <div className="space-y-2"><Label>Application URL</Label><Input value={accelForm.applicationUrl} onChange={e => setAccelForm({ ...accelForm, applicationUrl: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Application Process</Label><Textarea value={accelForm.applicationProcess} onChange={e => setAccelForm({ ...accelForm, applicationProcess: e.target.value })} rows={4} placeholder="Step-by-step process..." /></div>
                </CardContent>
              </Card>
            )}

            {activeTab === "alumni" && (
              <>
                <ArrayEditor items={alumniCompanies} setItems={setAlumniCompanies} title="Alumni Companies" icon={Briefcase} emptyText="No alumni companies added." addLabel="Add"
                  fields={[
                    { key: "name", label: "Name *", placeholder: "Company" },
                    { key: "sector", label: "Sector", placeholder: "Fintech" },
                    { key: "batch", label: "Batch", placeholder: "Batch 5" },
                    { key: "fundingRaised", label: "Funding Raised", placeholder: "$2M" },
                  ]} />
                <ArrayEditor items={successStories} setItems={setSuccessStories} title="Success Stories" icon={Star} emptyText="No success stories added." addLabel="Add"
                  fields={[
                    { key: "company", label: "Company *", placeholder: "Company" },
                    { key: "outcome", label: "Outcome", placeholder: "Raised $5M" },
                    { key: "description", label: "Description", placeholder: "Story details...", type: "textarea", colSpan: 3 },
                  ]} />
              </>
            )}

            {activeTab === "social" && (
              <Card>
                <CardHeader><CardTitle className="text-base">Online Presence</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website</Label><Input value={accelForm.website} onChange={e => setAccelForm({ ...accelForm, website: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</Label><Input value={accelForm.linkedIn} onChange={e => setAccelForm({ ...accelForm, linkedIn: e.target.value })} /></div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Twitter className="w-3.5 h-3.5" /> Twitter / X</Label><Input value={accelForm.twitter} onChange={e => setAccelForm({ ...accelForm, twitter: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Facebook className="w-3.5 h-3.5" /> Facebook</Label><Input value={accelForm.facebook} onChange={e => setAccelForm({ ...accelForm, facebook: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" /> Instagram</Label><Input value={accelForm.instagram} onChange={e => setAccelForm({ ...accelForm, instagram: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label className="flex items-center gap-1.5"><Youtube className="w-3.5 h-3.5" /> YouTube</Label><Input value={accelForm.youtube} onChange={e => setAccelForm({ ...accelForm, youtube: e.target.value })} /></div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/dashboard/my-content">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </Button>
        </div>
      </form>
    </div>
    <Footer /></>
  );
}
