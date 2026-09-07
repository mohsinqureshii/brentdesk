import { useState } from "react";
import { Link } from "wouter";
import {
  Send,
  CheckCircle,
  Loader2,
  Megaphone,
  Layout,
  Mail,
  FileText,
  Calendar,
  Building2,
  TrendingUp,
  Users,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { JsonLd } from "@/components/JsonLd";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { publication } from "@shared/publication";
import { useT } from "@/lib/i18n";

const Advertise = () => {
  const t = useT();
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
    message: "",
  });

  const submit = trpc.submissions.advertise.useMutation({
    onSuccess: () => {
      toast({
        title: t("advertise.inquiryReceived"),
        description: t("advertise.inquiryReceivedBody"),
      });
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        jobTitle: "",
        company: "",
        industry: "",
        budget: "",
        objectives: [],
        message: "",
      });
    },
    onError: (err) => {
      toast({
        title: t("advertise.submitFailed"),
        description: err.message || t("state.tryAgainMoment"),
        variant: "destructive",
      });
    },
  });

  const toggleObjective = (objective: string) => {
    setFormData((prev) => ({
      ...prev,
      objectives: prev.objectives.includes(objective)
        ? prev.objectives.filter((o) => o !== objective)
        : [...prev.objectives, objective],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.company ||
      formData.message.length < 5
    ) {
      toast({ title: t("form.completeRequired"), variant: "destructive" });
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
    { value: "Run display advertising on the site", label: t("advertise.objDisplay") },
    { value: "Sponsor the newsletter", label: t("advertise.objNewsletter") },
    { value: "Distribute branded content / sponsored article", label: t("advertise.objBranded") },
    { value: "Promote an event, tender, or recruitment campaign", label: t("advertise.objPromote") },
    { value: "Something else (please explain in the Message area)", label: t("advertise.objOther") },
  ];

  const productTiers = [
    {
      icon: Layout,
      title: "Display Advertising & Takeovers",
      description: "High-impact placements positioned directly alongside beat-specific reporting.",
      specs: [
        { name: t("advertise.leaderboard"), desc: t("advertise.leaderboardDesc") },
        { name: t("advertise.inContent"), desc: t("advertise.inContentDesc") },
        { name: t("advertise.rightRail"), desc: t("advertise.rightRailDesc") },
        { name: t("advertise.mobile"), desc: t("advertise.mobileDesc") },
      ],
    },
    {
      icon: Mail,
      title: t("advertise.newsletterSponsorship"),
      description: t("advertise.newsletterSponsorshipDesc", { name: publication.newsletter.name }),
      specs: [
        { name: "Sole Briefing Sponsor", desc: "100% exclusive SOV in the morning dispatch at 06:30 AST" },
        { name: "Executive Click-to-Lead", desc: "Dedicated logo, custom copy, and direct tracking URL" },
      ],
    },
    {
      icon: FileText,
      title: t("advertise.native"),
      description: t("advertise.nativeDesc"),
      specs: [
        { name: "Executive Perspectives", desc: "Thought leadership authored by your engineering and corporate leaders" },
        { name: "Case Studies & Whitepapers", desc: "Showcase landmark projects, technologies, and EPC solutions" },
      ],
    },
    {
      icon: Calendar,
      title: "Event & Summit Partnerships",
      description: "Amplify your brand at key industry conferences, exhibitions, and executive roundtables.",
      specs: [
        { name: "Editorial Summit Coverage", desc: "Live-blogging, keynote interviews, and video coverage" },
        { name: "VIP Executive Dinners", desc: "Curated networking with regional industrial decision-makers" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-clip text-foreground">
      <SEO
        title={`Advertise | ${publication.name}`}
        description={`Partner with ${publication.name} to reach decision-makers across construction, energy, infrastructure, manufacturing and logistics in Saudi Arabia, the GCC and MENA.`}
        canonical={`${publication.siteUrl}/advertise`}
      />
      <JsonLd
        type="BreadcrumbList"
        data={[
          { name: t("nav.home"), url: publication.siteUrl },
          { name: t("footer.advertise"), url: `${publication.siteUrl}/advertise` },
        ]}
      />
      <Header />

      {/* Visual Breadcrumb Bar */}
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">{t("nav.home")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("footer.advertise")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Commercial Hero Section */}
        <section className="pt-4 pb-12 border-b border-border">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bd-eyebrow text-primary tracking-widest font-bold">
              {t("advertise.heroEyebrow")}
            </span>
            <span className="text-muted-foreground/40 text-xs">/</span>
            <span className="text-xs font-semibold text-muted-foreground">
              COMMERCIAL SOLUTIONS
            </span>
          </div>

          <h1 className="bd-lede text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 max-w-4xl">
            {t("advertise.title", { site: publication.name })}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed mb-8">
            {t("advertise.heroSubtitle")}
          </p>

          {/* Audience Reach Metrics Strip (Bloomberg Media Kit style) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border">
            <div className="bd-card p-5 bg-card">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Users className="w-4 h-4" />
                <span className="bd-headline text-2xl sm:text-3xl font-bold text-foreground">78%</span>
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                {t("advertise.statDecisionMakers")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("advertise.statDecisionMakersDesc")}
              </p>
            </div>

            <div className="bd-card p-5 bg-card">
              <div className="flex items-center gap-2 text-primary mb-1">
                <BarChart3 className="w-4 h-4" />
                <span className="bd-headline text-2xl sm:text-3xl font-bold text-foreground">$100M+</span>
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                {t("advertise.statProjectScale")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("advertise.statProjectScaleDesc")}
              </p>
            </div>

            <div className="bd-card p-5 bg-card">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Building2 className="w-4 h-4" />
                <span className="bd-headline text-2xl sm:text-3xl font-bold text-foreground">GCC & MENA</span>
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                {t("advertise.statRegional")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("advertise.statRegionalDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Ad Products & Sponsorship Suite */}
        <section className="pt-10 pb-12">
          <div className="bd-section-head mb-3">
            <h2 className="bd-section-title">{t("advertise.productsTitle")}</h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl mb-8 leading-relaxed">
            {t("advertise.productsSubtitle")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {productTiers.map((product, idx) => (
              <div key={idx} className="bd-card p-6 bg-card flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <product.icon className="w-4 h-4" />
                  </div>
                  <h3 className="bd-headline text-xl font-bold text-foreground mb-2">
                    {product.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                    {product.description}
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  {product.specs.map((spec, sIdx) => (
                    <div key={sIdx} className="text-xs">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{spec.name}</span>
                      </div>
                      <div className="text-muted-foreground pl-5 text-[11px] leading-relaxed">
                        {spec.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Form & Media Kit Dual-Column Section */}
        <section className="pt-8 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left Column: Commercial Inquiry Form */}
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="mb-6">
                <span className="bd-eyebrow text-primary font-bold tracking-wider">
                  Campaign Consultation
                </span>
                <h2 className="bd-headline text-2xl font-bold text-foreground mt-1 mb-2">
                  {t("advertise.formTitle")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("advertise.formNote")}{" "}
                  <Link href="/contact" className="text-primary hover:underline font-semibold">
                    {t("advertise.contactPageLink")}
                  </Link>
                  .
                </p>
              </div>

              <div className="bd-card p-6 sm:p-8 bg-card">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                        {t("form.firstName")} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder={t("form.firstNamePlaceholder")}
                        required
                        className="bg-background border-border rounded-sm h-10 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                        {t("form.lastName")} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder={t("form.lastNamePlaceholder")}
                        required
                        className="bg-background border-border rounded-sm h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                        {t("form.email")} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder={t("advertise.emailPlaceholder")}
                        required
                        className="bg-background border-border rounded-sm h-10 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                        {t("form.jobTitle")} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={formData.jobTitle}
                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                        placeholder={t("advertise.rolePlaceholder")}
                        required
                        className="bg-background border-border rounded-sm h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                        {t("form.companyName")} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder={t("advertise.companyPlaceholder")}
                        required
                        className="bg-background border-border rounded-sm h-10 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                        {t("form.industry")}
                      </label>
                      <Select
                        value={formData.industry}
                        onValueChange={(val) => setFormData({ ...formData, industry: val })}
                      >
                        <SelectTrigger className="bg-background border-border rounded-sm h-10 text-sm">
                          <SelectValue placeholder={t("form.pleaseSelect")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Construction & Contracting">{t("advertise.indConstruction")}</SelectItem>
                          <SelectItem value="Energy / Oil & Gas">{t("advertise.indEnergy")}</SelectItem>
                          <SelectItem value="Utilities & Power">{t("advertise.indUtilities")}</SelectItem>
                          <SelectItem value="Manufacturing">{t("cat.manufacturing")}</SelectItem>
                          <SelectItem value="Logistics / Supply Chain">{t("advertise.indLogistics")}</SelectItem>
                          <SelectItem value="Transportation / Aviation / Ports / Rail">{t("advertise.indTransport")}</SelectItem>
                          <SelectItem value="Mining & Metals">{t("advertise.indMining")}</SelectItem>
                          <SelectItem value="Chemicals">{t("advertise.indChemicals")}</SelectItem>
                          <SelectItem value="Real Estate Development">{t("advertise.indRealEstate")}</SelectItem>
                          <SelectItem value="Data Centers / Industrial Technology">{t("advertise.indDataCenters")}</SelectItem>
                          <SelectItem value="Engineering / Professional Services">{t("advertise.indEngineering")}</SelectItem>
                          <SelectItem value="Financial Services">{t("advertise.indFinancial")}</SelectItem>
                          <SelectItem value="Government / Public Sector">{t("advertise.indGovernment")}</SelectItem>
                          <SelectItem value="Other">{t("common.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                      {t("advertise.budgetQuestion")} <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={formData.budget}
                      onValueChange={(val) => setFormData({ ...formData, budget: val })}
                    >
                      <SelectTrigger className="bg-background border-border rounded-sm h-10 text-sm">
                        <SelectValue placeholder={t("form.pleaseSelect")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes, $50,000+">{t("advertise.budget50kPlus")}</SelectItem>
                        <SelectItem value="Yes, $25,000-$50,000">{t("advertise.budget25to50k")}</SelectItem>
                        <SelectItem value="Yes, $10,000-$25,000">{t("advertise.budget10to25k")}</SelectItem>
                        <SelectItem value="Yes, less than $10,000">{t("advertise.budgetUnder10k")}</SelectItem>
                        <SelectItem value="No / Looking for editorial coverage">{t("advertise.budgetNone")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                      {t("advertise.objectives")}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {advertisingObjectives.map((objective) => (
                        <div
                          key={objective.value}
                          className="flex items-start gap-2.5 p-2 rounded-sm border border-border bg-background"
                        >
                          <Checkbox
                            id={objective.value}
                            checked={formData.objectives.includes(objective.value)}
                            onCheckedChange={() => toggleObjective(objective.value)}
                            className="mt-0.5 rounded-xs"
                          />
                          <label
                            htmlFor={objective.value}
                            className="text-xs text-foreground cursor-pointer leading-snug"
                          >
                            {objective.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                      {t("form.message")}
                    </label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      {t("advertise.messageHint")}
                    </p>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder={t("advertise.messagePlaceholder")}
                      rows={4}
                      className="bg-background border-border rounded-sm text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                    <p className="text-xs text-muted-foreground max-w-md">
                      {t("advertise.allInquiriesSentTo")}{" "}
                      <a href={`mailto:${publication.emails.advertising}`} className="text-primary hover:underline font-semibold">
                        {publication.emails.advertising}
                      </a>
                      .
                    </p>
                    <Button
                      type="submit"
                      disabled={submit.isPending}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2 rounded-sm"
                    >
                      {submit.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("form.sending")}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" /> {t("form.submit")}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Commercial Desk & Guarantees */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* Media Kit Desk Box */}
              <div className="bd-card p-6 bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone className="w-4 h-4 text-primary" />
                  <h3 className="bd-headline text-base font-bold text-foreground">
                    Commercial Solutions Desk
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {t("advertise.slaNotice")}
                </p>

                <div className="text-xs text-muted-foreground border-t border-border pt-4 space-y-3">
                  <div>
                    <span className="font-semibold text-foreground block mb-0.5">Media Kit Inquiries:</span>
                    <a
                      href={`mailto:${publication.emails.advertising}`}
                      className="text-primary hover:underline font-bold"
                    >
                      {publication.emails.advertising}
                    </a>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block mb-0.5">Corporate Operations:</span>
                    <span>{publication.city}</span>
                  </div>
                </div>
              </div>

              {/* Editorial Independence Notice */}
              <div className="bd-card p-6 bg-muted/40 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h3 className="bd-headline text-sm font-bold text-foreground">
                    Strict Editorial Separation
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  All sponsored features and branded insights are clearly identified. Commercial agreements never grant influence over newsroom reporting or investigative coverage.
                </p>
                <Link
                  href="/editorial"
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t("footer.editorialStandards")}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Coverage Taxonomy Reference */}
              <div className="bd-card p-5 bg-card">
                <h4 className="bd-eyebrow text-foreground mb-2 font-bold">Featured Sectors</h4>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">EPC & Construction</span>
                  <span className="px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">Power & Energy</span>
                  <span className="px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">Heavy Manufacturing</span>
                  <span className="px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">Logistics & Ports</span>
                  <span className="px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">Mining & Utilities</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Advertise;
