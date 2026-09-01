/**
 * User-facing Entity Editor
 * Unified form for creating people, accelerators, investors, events
 * SAP Fiori-inspired layout with mandatory/optional field indicators
 */

import { useState } from "react";
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
import { ArrowLeft, Save, Loader2, Info, Users, Rocket, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type EntityType = "person" | "accelerator" | "investor" | "event";

const entityConfig: Record<EntityType, {
  label: string;
  plural: string;
  icon: any;
  color: string;
  bgColor: string;
}> = {
  person: { label: "Person", plural: "People", icon: Users, color: "text-purple-600", bgColor: "bg-purple-500/10" },
  accelerator: { label: "Accelerator", plural: "Accelerators", icon: Rocket, color: "text-cyan-600", bgColor: "bg-cyan-500/10" },
  investor: { label: "Investor", plural: "Investors", icon: TrendingUp, color: "text-amber-600", bgColor: "bg-amber-500/10" },
  event: { label: "Event", plural: "Events", icon: Calendar, color: "text-rose-600", bgColor: "bg-rose-500/10" },
};

export default function MyEntityEditor() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ type: string; id: string }>();
  const entityType = (params.type || "person") as EntityType;
  const isEdit = !!params.id;
  const config = entityConfig[entityType] || entityConfig.person;

  // Person form
  const [personForm, setPersonForm] = useState({
    name: "", title: "", bio: "", photo: "", linkedIn: "", twitter: "", location: "",
  });

  // Accelerator form
  const [accelForm, setAccelForm] = useState({
    name: "", description: "", logo: "", website: "", linkedIn: "", location: "",
    programType: "accelerator" as string, batchSize: "", duration: "",
  });

  // Investor form
  const [investorForm, setInvestorForm] = useState({
    name: "", description: "", logo: "", website: "", linkedIn: "", location: "",
    type: "vc" as string, investmentStages: "", sectors: "",
  });

  // Event form
  const [eventForm, setEventForm] = useState({
    name: "", description: "", logo: "", website: "", location: "",
    type: "conference" as string, startDate: "", endDate: "", venue: "",
  });

  const [saving, setSaving] = useState(false);

  const createPersonMutation = trpc.userContent.createPerson.useMutation({
    onSuccess: () => { toast.success("Person submitted for review!"); navigate("/dashboard/my-content"); },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });

  const createAccelMutation = trpc.userContent.createAccelerator.useMutation({
    onSuccess: () => { toast.success("Accelerator submitted for review!"); navigate("/dashboard/my-content"); },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });

  const createInvestorMutation = trpc.userContent.createInvestor.useMutation({
    onSuccess: () => { toast.success("Investor submitted for review!"); navigate("/dashboard/my-content"); },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });

  const createEventMutation = trpc.userContent.createEvent.useMutation({
    onSuccess: () => { toast.success("Event submitted for review!"); navigate("/dashboard/my-content"); },
    onError: (err) => { toast.error(err.message); setSaving(false); },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    switch (entityType) {
      case "person":
        if (!personForm.name.trim()) { toast.error("Name is required"); setSaving(false); return; }
        createPersonMutation.mutate({
          name: personForm.name.trim(),
          title: personForm.title || undefined,
          bio: personForm.bio || undefined,
          avatar: personForm.photo || undefined,
          linkedIn: personForm.linkedIn || undefined,
          twitter: personForm.twitter || undefined,
          location: personForm.location || undefined,
        });
        break;

      case "accelerator":
        if (!accelForm.name.trim()) { toast.error("Name is required"); setSaving(false); return; }
        createAccelMutation.mutate({
          name: accelForm.name.trim(),
          description: accelForm.description || undefined,
          logo: accelForm.logo || undefined,
          website: accelForm.website || undefined,
          linkedIn: accelForm.linkedIn || undefined,
          location: accelForm.location || undefined,
          programLength: accelForm.batchSize || undefined,
          investmentAmount: accelForm.duration || undefined,
        });
        break;

      case "investor":
        if (!investorForm.name.trim()) { toast.error("Name is required"); setSaving(false); return; }
        createInvestorMutation.mutate({
          name: investorForm.name.trim(),
          description: investorForm.description || undefined,
          logo: investorForm.logo || undefined,
          website: investorForm.website || undefined,
          linkedIn: investorForm.linkedIn || undefined,
          location: investorForm.location || undefined,
          type: investorForm.type as any,
          investmentStages: investorForm.investmentStages || undefined,
        });
        break;

      case "event":
        if (!eventForm.name.trim()) { toast.error("Name is required"); setSaving(false); return; }
        if (!eventForm.startDate) { toast.error("Start date is required"); setSaving(false); return; }
        createEventMutation.mutate({
          title: eventForm.name.trim(),
          description: eventForm.description || undefined,
          coverImage: eventForm.logo || undefined,
          location: eventForm.location || undefined,
          type: eventForm.type as any,
          startDate: new Date(eventForm.startDate),
          endDate: eventForm.endDate ? new Date(eventForm.endDate) : undefined,
          venue: eventForm.venue || undefined,
          registrationUrl: eventForm.website || undefined,
        });
        break;
    }
  };

  if (authLoading) {
    return <><Header /><div className="container max-w-4xl py-8"><div className="h-8 w-48 bg-muted/50 rounded animate-pulse" /></div><Footer /></>;
  }

  if (!user) { navigate("/signin"); return null; }

  const Icon = config.icon;

  return (
    <>
    <Header />
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/my-content">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" /> My Content
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div>
          <h1 className="text-xl font-bold">{isEdit ? `Edit ${config.label}` : `Submit New ${config.label}`}</h1>
          <p className="text-sm text-muted-foreground">Your submission will be reviewed before publishing</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className={`flex items-start gap-3 p-4 rounded-lg border mb-6 ${
        entityType === "person" ? "bg-purple-500/5 border-purple-500/20" :
        entityType === "accelerator" ? "bg-cyan-500/5 border-cyan-500/20" :
        entityType === "investor" ? "bg-amber-500/5 border-amber-500/20" :
        "bg-rose-500/5 border-rose-500/20"
      }`}>
        <Info className={`w-5 h-5 shrink-0 mt-0.5 ${config.color}`} />
        <div className="text-sm">
          <p className={`font-medium ${config.color}`}>Submission Guidelines</p>
          <p className="text-muted-foreground mt-1">
            Fields marked with <span className="text-red-500">*</span> are mandatory.
            Your {config.label.toLowerCase()} will be reviewed by our editorial team.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ===== PERSON FORM ===== */}
        {entityType === "person" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
                <CardDescription>Basic details about this person</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name <span className="text-red-500">*</span></Label>
                    <Input value={personForm.name} onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })} placeholder="e.g. John Doe" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Title / Role</Label>
                    <Input value={personForm.title} onChange={(e) => setPersonForm({ ...personForm, title: e.target.value })} placeholder="e.g. CEO at TechBanq" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea value={personForm.bio} onChange={(e) => setPersonForm({ ...personForm, bio: e.target.value })} placeholder="Short biography..." rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Photo URL</Label>
                  <Input value={personForm.photo} onChange={(e) => setPersonForm({ ...personForm, photo: e.target.value })} placeholder="https://example.com/photo.jpg" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact & Social</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input value={personForm.linkedIn} onChange={(e) => setPersonForm({ ...personForm, linkedIn: e.target.value })} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter / X</Label>
                    <Input value={personForm.twitter} onChange={(e) => setPersonForm({ ...personForm, twitter: e.target.value })} placeholder="https://x.com/..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={personForm.location} onChange={(e) => setPersonForm({ ...personForm, location: e.target.value })} placeholder="e.g. Dubai, UAE" />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ===== ACCELERATOR FORM ===== */}
        {entityType === "accelerator" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Program Information</CardTitle>
                <CardDescription>Details about the accelerator program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Program Name <span className="text-red-500">*</span></Label>
                    <Input value={accelForm.name} onChange={(e) => setAccelForm({ ...accelForm, name: e.target.value })} placeholder="e.g. Y Combinator" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Program Type</Label>
                    <Select value={accelForm.programType} onValueChange={(v) => setAccelForm({ ...accelForm, programType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accelerator">Accelerator</SelectItem>
                        <SelectItem value="incubator">Incubator</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={accelForm.description} onChange={(e) => setAccelForm({ ...accelForm, description: e.target.value })} placeholder="Describe the program..." rows={4} />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={accelForm.logo} onChange={(e) => setAccelForm({ ...accelForm, logo: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input value={accelForm.batchSize} onChange={(e) => setAccelForm({ ...accelForm, batchSize: e.target.value })} placeholder="e.g. 20" />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input value={accelForm.duration} onChange={(e) => setAccelForm({ ...accelForm, duration: e.target.value })} placeholder="e.g. 3 months" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Online Presence</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={accelForm.website} onChange={(e) => setAccelForm({ ...accelForm, website: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input value={accelForm.linkedIn} onChange={(e) => setAccelForm({ ...accelForm, linkedIn: e.target.value })} placeholder="https://linkedin.com/company/..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={accelForm.location} onChange={(e) => setAccelForm({ ...accelForm, location: e.target.value })} placeholder="e.g. San Francisco, CA" />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ===== INVESTOR FORM ===== */}
        {entityType === "investor" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Investor Information</CardTitle>
                <CardDescription>Details about the investment firm or angel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name <span className="text-red-500">*</span></Label>
                    <Input value={investorForm.name} onChange={(e) => setInvestorForm({ ...investorForm, name: e.target.value })} placeholder="e.g. Sequoia Capital" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type <span className="text-red-500">*</span></Label>
                    <Select value={investorForm.type} onValueChange={(v) => setInvestorForm({ ...investorForm, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vc">Venture Capital</SelectItem>
                        <SelectItem value="angel">Angel Investor</SelectItem>
                        <SelectItem value="pe">Private Equity</SelectItem>
                        <SelectItem value="corporate">Corporate VC</SelectItem>
                        <SelectItem value="family_office">Family Office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={investorForm.description} onChange={(e) => setInvestorForm({ ...investorForm, description: e.target.value })} placeholder="Describe the investor..." rows={4} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Investment Stages</Label>
                    <Input value={investorForm.investmentStages} onChange={(e) => setInvestorForm({ ...investorForm, investmentStages: e.target.value })} placeholder="e.g. Seed, Series A, Series B" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sectors</Label>
                    <Input value={investorForm.sectors} onChange={(e) => setInvestorForm({ ...investorForm, sectors: e.target.value })} placeholder="e.g. FinTech, HealthTech, AI" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Online Presence</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={investorForm.logo} onChange={(e) => setInvestorForm({ ...investorForm, logo: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={investorForm.website} onChange={(e) => setInvestorForm({ ...investorForm, website: e.target.value })} placeholder="https://..." />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input value={investorForm.linkedIn} onChange={(e) => setInvestorForm({ ...investorForm, linkedIn: e.target.value })} placeholder="https://linkedin.com/company/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={investorForm.location} onChange={(e) => setInvestorForm({ ...investorForm, location: e.target.value })} placeholder="e.g. Dubai, UAE" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ===== EVENT FORM ===== */}
        {entityType === "event" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Event Information</CardTitle>
                <CardDescription>Details about the event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Name <span className="text-red-500">*</span></Label>
                    <Input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} placeholder="e.g. GITEX Global 2026" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select value={eventForm.type} onValueChange={(v) => setEventForm({ ...eventForm, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="meetup">Meetup</SelectItem>
                        <SelectItem value="hackathon">Hackathon</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="webinar">Webinar</SelectItem>
                        <SelectItem value="summit">Summit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Describe the event..." rows={4} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date <span className="text-red-500">*</span></Label>
                    <Input type="datetime-local" value={eventForm.startDate} onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="datetime-local" value={eventForm.endDate} onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Venue & Links</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Venue</Label>
                    <Input value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} placeholder="e.g. Dubai World Trade Centre" />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} placeholder="e.g. Dubai, UAE" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={eventForm.logo} onChange={(e) => setEventForm({ ...eventForm, logo: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={eventForm.website} onChange={(e) => setEventForm({ ...eventForm, website: e.target.value })} placeholder="https://..." />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/dashboard/my-content">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <><Save className="w-4 h-4" /> Submit for Review</>
            )}
          </Button>
        </div>
      </form>
    </div>
    <Footer />
    </>
  );
}
