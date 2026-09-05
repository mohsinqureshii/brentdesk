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
    message: ""
  });

  const submit = trpc.submissions.advertise.useMutation({
    onSuccess: () => {
      toast({
        title: t("advertise.inquiryReceived"),
        description: t("advertise.inquiryReceivedBody"),
      });
      setFormData({ firstName: "", lastName: "", email: "", jobTitle: "", company: "", industry: "", budget: "", objectives: [], message: "" });
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

  // `value` is what the form submits, so it stays English; `label` is what the
  // reader sees.
  const advertisingObjectives = [
    { value: "Run display advertising on the site", label: t("advertise.objDisplay") },
    { value: "Sponsor the newsletter", label: t("advertise.objNewsletter") },
    { value: "Distribute branded content / sponsored article", label: t("advertise.objBranded") },
    { value: "Promote an event, tender, or recruitment campaign", label: t("advertise.objPromote") },
    { value: "Something else (please explain in the Message area)", label: t("advertise.objOther") },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <SEO
        title={`Advertise | ${publication.name}`}
        description={`Partner with ${publication.name} to reach decision-makers across construction, energy, infrastructure, manufacturing and logistics in Saudi Arabia, the GCC and MENA.`}
        canonical={`${publication.siteUrl}/advertise`}
      />
      <Header />

      {/* Hero Section */}
      <section className="py-16 md:py-20 border-b border-border">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t("advertise.title", { site: publication.name })}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            {t("advertise.intro", { site: publication.name })}
          </p>
        </div>
      </section>

      {/* Ad Formats */}
      <section className="py-12 md:py-16 border-b border-border">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">{t("advertise.adFormats")}</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">{t("advertise.leaderboard")}</h3>
                  <p className="text-sm text-muted-foreground">{t("advertise.leaderboardDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">{t("advertise.inContent")}</h3>
                  <p className="text-sm text-muted-foreground">{t("advertise.inContentDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">{t("advertise.rightRail")}</h3>
                  <p className="text-sm text-muted-foreground">{t("advertise.rightRailDesc")}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">{t("advertise.mobile")}</h3>
                  <p className="text-sm text-muted-foreground">{t("advertise.mobileDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">{t("advertise.native")}</h3>
                  <p className="text-sm text-muted-foreground">{t("advertise.nativeDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">{t("advertise.newsletterSponsorship")}</h3>
                  <p className="text-sm text-muted-foreground">{t("advertise.newsletterSponsorshipDesc", { name: publication.newsletter.name })}</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            {t("advertise.mediaKit")}{" "}
            <a href={`mailto:${publication.emails.advertising}`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium">
              {publication.emails.advertising}
            </a>{" "}
            {t("advertise.orUseForm")}
          </p>
        </div>
      </section>

      {/* Ads & Sponsorships Form */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-3">{t("advertise.adsSponsorships", { site: publication.name })}</h2>
          <p className="text-muted-foreground mb-2">
            {t("advertise.formNote")}{" "}
            <a href="/contact" className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium">
              {t("advertise.contactPageLink")}
            </a>.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            {t("advertise.allInquiriesSentTo")}{" "}
            <a href={`mailto:${publication.emails.advertising}`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium">
              {publication.emails.advertising}
            </a>.
          </p>

          <div className="bg-card rounded-sm border border-border p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("form.firstName")} <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder={t("form.firstNamePlaceholder")}
                    required
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t("form.lastName")} <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder={t("form.lastNamePlaceholder")}
                    required
                    className="bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t("form.email")} <span className="text-destructive">*</span></label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t("advertise.emailPlaceholder")}
                  required
                  className="bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t("form.jobTitle")} <span className="text-destructive">*</span></label>
                <Input
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder={t("advertise.rolePlaceholder")}
                  required
                  className="bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t("form.companyName")} <span className="text-destructive">*</span></label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder={t("advertise.companyPlaceholder")}
                  required
                  className="bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t("form.industry")}</label>
                <Select value={formData.industry} onValueChange={(val) => setFormData({ ...formData, industry: val })}>
                  <SelectTrigger className="bg-background">
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t("advertise.budgetQuestion")} <span className="text-destructive">*</span></label>
                <Select value={formData.budget} onValueChange={(val) => setFormData({ ...formData, budget: val })}>
                  <SelectTrigger className="bg-background">
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
                <label className="block text-sm font-medium text-foreground mb-3">{t("advertise.objectives")}</label>
                <div className="space-y-3">
                  {advertisingObjectives.map((objective) => (
                    <div key={objective.value} className="flex items-start gap-3">
                      <Checkbox
                        id={objective.value}
                        checked={formData.objectives.includes(objective.value)}
                        onCheckedChange={() => toggleObjective(objective.value)}
                        className="mt-0.5"
                      />
                      <label htmlFor={objective.value} className="text-sm text-foreground cursor-pointer leading-relaxed">
                        {objective.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t("form.message")}</label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("advertise.messageHint")}
                </p>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={t("advertise.messagePlaceholder")}
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
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("form.sending")}</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> {t("form.submit")}</>
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
