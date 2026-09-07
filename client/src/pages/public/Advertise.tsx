import { useState } from "react";
import { Link } from "wouter";
import {
  Send,
  CheckCircle2,
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
  Download,
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
      borderTop: "border-t-blue-600",
      iconBg: "bg-blue-600 text-white shadow-md shadow-blue-500/25",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      checkClass: "text-blue-600 dark:text-blue-400",
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
      borderTop: "border-t-amber-600",
      iconBg: "bg-amber-600 text-white shadow-md shadow-amber-500/25",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      checkClass: "text-amber-600 dark:text-amber-400",
      description: t("advertise.newsletterSponsorshipDesc", { name: publication.newsletter.name }),
      specs: [
        { name: "Sole Briefing Sponsor", desc: "100% exclusive SOV in the morning dispatch at 06:30 AST" },
        { name: "Executive Click-to-Lead", desc: "Dedicated logo, custom copy, and direct tracking URL" },
      ],
    },
    {
      icon: FileText,
      title: t("advertise.native"),
      borderTop: "border-t-purple-600",
      iconBg: "bg-purple-600 text-white shadow-md shadow-purple-500/25",
      badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      checkClass: "text-purple-600 dark:text-purple-400",
      description: t("advertise.nativeDesc"),
      specs: [
        { name: "Executive Perspectives", desc: "Thought leadership authored by your engineering and corporate leaders" },
        { name: "Case Studies & Whitepapers", desc: "Showcase landmark projects, technologies, and EPC solutions" },
      ],
    },
    {
      icon: Calendar,
      title: "Event & Summit Partnerships",
      borderTop: "border-t-emerald-600",
      iconBg: "bg-emerald-600 text-white shadow-md shadow-emerald-500/25",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      checkClass: "text-emerald-600 dark:text-emerald-400",
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
        <section className="relative pt-4 pb-12 border-b border-border">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bd-eyebrow px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-widest font-bold text-xs">
              {t("advertise.heroEyebrow")}
            </span>
            <span className="text-muted-foreground/40 text-xs">/</span>
            <span className="text-xs font-semibold text-muted-foreground">
              COMMERCIAL SOLUTIONS & MEDIA KIT
            </span>
          </div>

          <h1 className="bd-lede text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 max-w-4xl">
            {t("advertise.title", { site: publication.name })}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed mb-6">
            {t("advertise.heroSubtitle")}
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-2.5 rounded-lg shadow-md shadow-primary/20 flex items-center gap-2"
            >
              <a href="#consultation-form">
                <span>{t("advertise.formTitle")}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2"
            >
              <a href="/brentdesk-media-kit-2026.pdf" download="BrentDesk-Media-Kit-2026.pdf" target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 text-primary" />
                <span>Download Media Kit (PDF)</span>
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6 border-t border-border">
            <div className="group relative rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/[0.09] via-indigo-500/[0.04] to-card p-6 shadow-sm hover:shadow-xl hover:border-blue-500/60 hover:-translate-y-1 transition-all duration-300 border-t-4 border-t-blue-600">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                  DECISION MAKERS
                </span>
              </div>
              <div className="mb-2">
                <span className="bd-display text-4xl sm:text-5xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                  78%
                </span>
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                {t("advertise.statDecisionMakers")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("advertise.statDecisionMakersDesc")}
              </p>
            </div>

            <div className="group relative rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.09] via-teal-500/[0.04] to-card p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/60 hover:-translate-y-1 transition-all duration-300 border-t-4 border-t-emerald-600">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  CAPEX ALLOCATION
                </span>
              </div>
              <div className="mb-2">
                <span className="bd-display text-4xl sm:text-5xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  $100M+
                </span>
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                {t("advertise.statProjectScale")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("advertise.statProjectScaleDesc")}
              </p>
            </div>

            <div className="group relative rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.09] via-orange-500/[0.04] to-card p-6 shadow-sm hover:shadow-xl hover:border-amber-500/60 hover:-translate-y-1 transition-all duration-300 border-t-4 border-t-amber-600">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  REGIONAL FOCUS
                </span>
              </div>
              <div className="mb-2">
                <span className="bd-display text-3xl sm:text-4xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                  GCC & MENA
                </span>
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                {t("advertise.statRegional")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("advertise.statRegionalDesc")}
              </p>
            </div>
          </div>
        </section>

        <section className="pt-12 pb-14">
          <div className="bd-section-head mb-3">
            <h2 className="bd-section-title">{t("advertise.productsTitle")}</h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl mb-8 leading-relaxed">
            {t("advertise.productsSubtitle")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {productTiers.map((product, idx) => (
              <div
                key={idx}
                className={`group rounded-xl border border-border/80 bg-card p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 border-t-4 ${product.borderTop}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl ${product.iconBg} flex items-center justify-center`}>
                      <product.icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${product.badgeClass}`}>
                      Premium Solution
                    </span>
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
                        <CheckCircle2 className={`w-4 h-4 ${product.checkClass} shrink-0`} />
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

        <section id="consultation-form" className="pt-8 border-t border-border scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
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

              <div className="rounded-xl border border-border/80 bg-card shadow-md overflow-hidden border-t-4 border-t-primary">
                <div className="bg-gradient-to-r from-primary/10 via-primary/[0.03] to-transparent p-5 sm:p-6 border-b border-border/70">
                  <h3 className="font-bold text-base text-foreground mb-0.5">Direct RFP & Consultation Inquiry</h3>
                  <p className="text-xs text-muted-foreground">Receive custom distribution modelling, rate cards, and proposal within 24 hours.</p>
                </div>
                <div className="p-6 sm:p-8">
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
                      className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:opacity-95 text-white font-bold px-7 py-2.5 rounded-lg shadow-md shadow-blue-500/25 transition-all"
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
            </div>

            {/* Right Column: Commercial Desk & Guarantees */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* Media Kit Download Card */}
              <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/[0.03] to-card p-6 shadow-md relative overflow-hidden">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold block">
                      OFFICIAL 2026 RELEASE
                    </span>
                    <h3 className="font-bold text-base text-foreground leading-tight">
                      Media Kit & Rate Card
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Full specifications on newsletter solo sponsorships, bespoke display takeovers, demographic audience profiles, and event partnership packages.
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-3 mb-4 border-b border-border/60">
                  <span>Format: Interactive PDF</span>
                  <span className="font-semibold text-foreground">Edition 2026 · 1.4 MB</span>
                </div>
                <Button
                  asChild
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-2.5 rounded-lg shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <a href="/brentdesk-media-kit-2026.pdf" download="BrentDesk-Media-Kit-2026.pdf" target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                    <span>Download Media Kit (PDF)</span>
                  </a>
                </Button>
              </div>

              {/* Commercial Desk Info Box */}
              <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm border-t-4 border-t-indigo-600">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <h3 className="bd-headline text-base font-bold text-foreground">
                    Commercial Solutions Desk
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {t("advertise.slaNotice")}
                </p>

                <div className="text-xs text-muted-foreground border-t border-border pt-4 space-y-3">
                  <div>
                    <span className="font-semibold text-foreground block mb-0.5">Media Inquiries:</span>
                    <a
                      href={`mailto:${publication.emails.advertising}`}
                      className="text-primary hover:underline font-bold"
                    >
                      {publication.emails.advertising}
                    </a>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block mb-0.5">Bureau Operations:</span>
                    <span>{publication.city} (Olaya District)</span>
                  </div>
                </div>
              </div>

              {/* Editorial Independence Notice */}
              <div className="rounded-xl p-6 bg-gradient-to-br from-emerald-500/[0.06] to-card border border-emerald-500/30 border-l-4 border-l-emerald-600 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="bd-headline text-sm font-bold text-foreground">
                    Strict Editorial Separation
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  All sponsored features and branded insights are clearly identified. Commercial agreements never grant influence over newsroom reporting or investigative coverage.
                </p>
                <Link
                  href="/editorial"
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  {t("footer.editorialStandards")}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Coverage Taxonomy Reference */}
              <div className="rounded-xl border border-border/80 p-5 bg-card shadow-sm">
                <h4 className="bd-eyebrow text-foreground mb-2.5 font-bold">Priority Coverage Sectors</h4>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">EPC & Construction</span>
                  <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">Power & Energy</span>
                  <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium">Heavy Manufacturing</span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">Logistics & Ports</span>
                  <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">Industrial AI</span>
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
