import { useState } from "react";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { publication } from "@shared/publication";

const Advertise = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    company: "",
    industry: "",
    budget: "",
    objectives: [] as string[],
    message: ""
  });

  const submit = trpc.submissions.advertise.useMutation({
    onSuccess: () => {
      toast({
        title: "Inquiry received",
        description: "Our media team will reach out within 1 business day.",
      });
      setFormData({ firstName: "", lastName: "", email: "", jobTitle: "", company: "", industry: "", budget: "", objectives: [], message: "" });
    },
    onError: (err) => {
      toast({
        title: "Couldn't submit your inquiry",
        description: err.message || "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const toggleObjective = (objective: string) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.includes(objective)
        ? prev.objectives.filter(o => o !== objective)
        : [...prev.objectives, objective]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.company || formData.message.length < 5) {
      toast({ title: "Please complete all required fields", variant: "destructive" });
      return;
    }
    submit.mutate({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      jobTitle: formData.jobTitle.trim() || undefined,
      company: formData.company.trim(),
      industry: formData.industry || undefined,
      budget: formData.budget || undefined,
      objectives: formData.objectives.length > 0 ? formData.objectives : undefined,
      message: formData.message.trim(),
    });
  };

  const advertisingObjectives = [
    "Run display advertising on the site",
    "Sponsor the newsletter",
    "Distribute branded content / sponsored article",
    "Promote an event, tender, or recruitment campaign",
    "Something else (please explain in the Message area)"
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={`Advertise with ${publication.name} - Reach the Industrial Economy`}
        description={`Partner with ${publication.name} to reach decision-makers across construction, energy, infrastructure, manufacturing and logistics in Saudi Arabia, the GCC and MENA.`}
        canonical={`${publication.siteUrl}/advertise`}
      />
      <Header />

      {/* Hero Section */}
      <section className="py-16 md:py-20 border-b border-border">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Advertise with {publication.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            {publication.name} is read by the people who plan, build, and operate the physical economy — contractors, developers, engineers, energy and utility executives, logistics operators, procurement leaders, and the financiers behind them — with coverage focused on Saudi Arabia, the GCC and MENA. Advertising with {publication.name} puts your brand alongside the news these decision-makers rely on, in a professional editorial environment rather than a general-interest feed.
          </p>
        </div>
      </section>

      {/* Ad Formats */}
      <section className="py-12 md:py-16 border-b border-border">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Ad Formats</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">Leaderboard</h3>
                  <p className="text-sm text-muted-foreground">970×250 and 970×90 placements at the top of the homepage, section fronts, and articles.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">In-Content</h3>
                  <p className="text-sm text-muted-foreground">728×90 units placed within article bodies, seen at the point of reading.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">Right Rail</h3>
                  <p className="text-sm text-muted-foreground">300×250 and 300×600 units in the sidebar, persistent across article and listing pages.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">Mobile</h3>
                  <p className="text-sm text-muted-foreground">Mobile-optimized banner and sticky formats for readers on phones and tablets.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">Native & Branded Content</h3>
                  <p className="text-sm text-muted-foreground">Clearly labelled sponsored articles and branded features, produced to editorial standards.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">Newsletter Sponsorship</h3>
                  <p className="text-sm text-muted-foreground">Dedicated placements in {publication.newsletter.name}, delivered to subscribers' inboxes every morning.</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            For a media kit, current availability, and rates, email{" "}
            <a href={`mailto:${publication.emails.advertising}`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium">
              {publication.emails.advertising}
            </a>{" "}
            or use the form below.
          </p>
        </div>
      </section>

      {/* Ads & Sponsorships Form */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-3">{publication.name} Ads &amp; Sponsorships</h2>
          <p className="text-muted-foreground mb-2">
            This form is for paid sponsorship and advertising inquiries only. For editorial pitches or press outreach, please see our{" "}
            <a href="/contact" className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium">
              contact page
            </a>.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            All inquiries are sent to{" "}
            <a href={`mailto:${publication.emails.advertising}`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium">
              {publication.emails.advertising}
            </a>.
          </p>

          <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">First Name <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First name"
                    required
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Last Name <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last name"
                    required
                    className="bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email <span className="text-destructive">*</span></label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@company.com"
                  required
                  className="bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Job Title <span className="text-destructive">*</span></label>
                <Input
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="Your role"
                  required
                  className="bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Company Name <span className="text-destructive">*</span></label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Your company"
                  required
                  className="bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Industry</label>
                <Select value={formData.industry} onValueChange={(val) => setFormData({ ...formData, industry: val })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Please Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Construction & Contracting">Construction &amp; Contracting</SelectItem>
                    <SelectItem value="Energy / Oil & Gas">Energy / Oil &amp; Gas</SelectItem>
                    <SelectItem value="Utilities & Power">Utilities &amp; Power</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Logistics / Supply Chain">Logistics / Supply Chain</SelectItem>
                    <SelectItem value="Transportation / Aviation / Ports / Rail">Transportation / Aviation / Ports / Rail</SelectItem>
                    <SelectItem value="Mining & Metals">Mining &amp; Metals</SelectItem>
                    <SelectItem value="Chemicals">Chemicals</SelectItem>
                    <SelectItem value="Real Estate Development">Real Estate Development</SelectItem>
                    <SelectItem value="Data Centers / Industrial Technology">Data Centers / Industrial Technology</SelectItem>
                    <SelectItem value="Engineering / Professional Services">Engineering / Professional Services</SelectItem>
                    <SelectItem value="Financial Services">Financial Services</SelectItem>
                    <SelectItem value="Government / Public Sector">Government / Public Sector</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Do you have a marketing budget for this initiative? <span className="text-destructive">*</span></label>
                <Select value={formData.budget} onValueChange={(val) => setFormData({ ...formData, budget: val })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Please Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes, $50,000+">Yes, $50,000+</SelectItem>
                    <SelectItem value="Yes, $25,000-$50,000">Yes, $25,000–$50,000</SelectItem>
                    <SelectItem value="Yes, $10,000-$25,000">Yes, $10,000–$25,000</SelectItem>
                    <SelectItem value="Yes, less than $10,000">Yes, less than $10,000</SelectItem>
                    <SelectItem value="No / Looking for editorial coverage">No / I'm looking for editorial coverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Advertising Objectives</label>
                <div className="space-y-3">
                  {advertisingObjectives.map((objective) => (
                    <div key={objective} className="flex items-start gap-3">
                      <Checkbox
                        id={objective}
                        checked={formData.objectives.includes(objective)}
                        onCheckedChange={() => toggleObjective(objective)}
                        className="mt-0.5"
                      />
                      <label htmlFor={objective} className="text-sm text-foreground cursor-pointer leading-relaxed">
                        {objective}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Message</label>
                <p className="text-xs text-muted-foreground mb-2">
                  This is your opportunity to ask us for specifics to be addressed in our initial reply. Please keep this section short and to the point about your ask.
                </p>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your advertising goals..."
                  rows={4}
                  className="bg-background"
                />
              </div>

              <Button
                type="submit"
                disabled={submit.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submit.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Submit</>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Advertise;
