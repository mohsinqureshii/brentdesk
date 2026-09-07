import { useState } from "react";
import { Link } from "wouter";
import {
  Mail,
  Send,
  Newspaper,
  Calendar,
  Megaphone,
  FileText,
  HelpCircle,
  Loader2,
  ShieldCheck,
  MapPin,
  Clock,
  ExternalLink,
  ArrowRight,
  Scale,
  Building2,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const Contact = () => {
  const t = useT();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    enquiryType: "",
    message: "",
  });

  const submit = trpc.submissions.contact.useMutation({
    onSuccess: () => {
      toast({
        title: t("contact.messageSent"),
        description: t("contact.messageSentBody"),
      });
      setFormData({ firstName: "", lastName: "", email: "", company: "", enquiryType: "", message: "" });
    },
    onError: (err) => {
      toast({
        title: t("contact.sendFailed"),
        description: err.message || t("state.tryAgainMoment"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || formData.message.length < 10) {
      toast({ title: t("form.completeRequired"), variant: "destructive" });
      return;
    }
    submit.mutate({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      company: formData.company.trim() || undefined,
      enquiryType: formData.enquiryType || undefined,
      message: formData.message.trim(),
    });
  };

  const contactDesks = [
    {
      icon: ShieldCheck,
      title: t("contact.newsTips"),
      description: t("contact.newsTipsBody"),
      email: publication.emails.media,
      note: t("contact.newsTipsNote"),
      badge: "Encrypted & Confidential",
    },
    {
      icon: Newspaper,
      title: t("contact.pressReleases"),
      description: t("contact.pressReleasesBody"),
      email: publication.emails.media,
      note: t("contact.pressReleasesNote"),
      badge: "Press Office",
    },
    {
      icon: Megaphone,
      title: t("contact.advertising"),
      description: t("contact.advertisingBody"),
      linkHref: "/advertise",
      linkText: t("contact.advertisingLink"),
      suffix: t("contact.advertisingSuffix"),
      email: publication.emails.advertising,
      badge: "Commercial Desk",
    },
    {
      icon: Calendar,
      title: t("contact.eventsListings"),
      description: t("contact.eventsListingsBody"),
      email: publication.emails.hello,
      linkHref: "/events",
      linkText: t("nav.events"),
      badge: "Events & Summits",
    },
    {
      icon: Scale,
      title: t("contact.corrections"),
      description: t("contact.correctionsBody"),
      email: publication.emails.hello,
      linkHref: "/editorial",
      linkText: t("footer.editorialStandards"),
      badge: "Within 24h Review",
    },
    {
      icon: FileText,
      title: t("contact.licensing"),
      description: t("contact.licensingBody"),
      email: publication.emails.legal,
      linkHref: "/copyright",
      linkText: t("footer.copyright"),
      badge: "Corporate & Syndication",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-clip text-foreground">
      <SEO
        title={`Contact | ${publication.name}`}
        description={`Get in touch with ${publication.name}. Newsroom tips, bureau directory, press releases, corporate advertising, event listings, and general inquiries.`}
        canonical={`${publication.siteUrl}/contact`}
      />
      <JsonLd
        type="BreadcrumbList"
        data={[
          { name: t("nav.home"), url: publication.siteUrl },
          { name: t("footer.contactUs"), url: `${publication.siteUrl}/contact` },
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
              <BreadcrumbPage>{t("footer.contactUs")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Editorial Masthead Hero */}
        <section className="pt-4 pb-10 border-b border-border">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bd-eyebrow text-primary tracking-widest font-bold">
              {t("contact.heroEyebrow")}
            </span>
            <span className="text-muted-foreground/40 text-xs">/</span>
            <span className="text-xs font-semibold text-muted-foreground">
              {publication.city}
            </span>
          </div>

          <h1 className="bd-lede text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            {t("footer.contactUs")}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed mb-6">
            {t("contact.intro")}
          </p>

          {/* Quick Metrics & Service Level Indicators */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-muted text-xs font-medium text-foreground border border-border">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              <span>{t("contact.slaNotice")}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-muted text-xs font-medium text-foreground border border-border">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Confidential Tip Protection</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-muted text-xs font-medium text-foreground border border-border">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>Riyadh Central Bureau</span>
            </div>
          </div>
        </section>

        {/* Newsroom Desks Directory Grid */}
        <section className="pt-10 pb-12">
          <div className="bd-section-head mb-6">
            <h2 className="bd-section-title">Newsroom Desks & Inquiries</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {contactDesks.map((desk, idx) => (
              <div
                key={idx}
                className="bd-card p-5 sm:p-6 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center">
                      <desk.icon className="w-4 h-4" />
                    </div>
                    {desk.badge && (
                      <span className="bd-eyebrow px-2 py-0.5 rounded-sm bg-muted text-foreground/80 border border-border text-[10px]">
                        {desk.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="bd-headline text-lg font-bold text-foreground mb-2">
                    {desk.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {desk.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border space-y-2 text-xs">
                  {desk.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">Email:</span>
                      <a
                        href={`mailto:${desk.email}`}
                        className="text-primary hover:underline font-semibold"
                      >
                        {desk.email}
                      </a>
                    </div>
                  )}

                  {desk.linkHref && desk.linkText && (
                    <div className="flex items-center gap-1">
                      <Link
                        href={desk.linkHref}
                        className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        {desk.linkText}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {desk.note && (
                    <p className="text-[11px] text-muted-foreground/90 italic pt-1">
                      {desk.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Direct Dispatch & Operations Split Section */}
        <section className="pt-6 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left Column: Direct Message Dispatch Form */}
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="mb-6">
                <span className="bd-eyebrow text-primary font-bold tracking-wider">
                  Direct Dispatch
                </span>
                <h2 className="bd-headline text-2xl font-bold text-foreground mt-1 mb-2">
                  {t("contact.directDispatch")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("contact.directDispatchBody")}
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
                        placeholder={t("contact.emailPlaceholder")}
                        required
                        className="bg-background border-border rounded-sm h-10 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {t("contact.workEmailNote")}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                        {t("form.companyName")}
                      </label>
                      <Input
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder={t("contact.companyPlaceholder")}
                        className="bg-background border-border rounded-sm h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                      {t("contact.enquiryAbout")} <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={formData.enquiryType}
                      onValueChange={(val) => setFormData({ ...formData, enquiryType: val })}
                    >
                      <SelectTrigger className="bg-background border-border rounded-sm h-10 text-sm">
                        <SelectValue placeholder={t("form.pleaseSelect")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="News Tips">{t("contact.newsTips")}</SelectItem>
                        <SelectItem value="Press Releases & Announcements">{t("contact.pressReleases")}</SelectItem>
                        <SelectItem value="Advertising & Sponsorships">{t("contact.advertising")}</SelectItem>
                        <SelectItem value="Events & Listings">{t("contact.eventsListings")}</SelectItem>
                        <SelectItem value="Corrections & Feedback">{t("contact.corrections")}</SelectItem>
                        <SelectItem value="Partnership Inquiry">{t("contact.partnership")}</SelectItem>
                        <SelectItem value="Other">{t("common.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                      {t("form.message")} <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder={t("contact.messagePlaceholder")}
                      rows={5}
                      required
                      className="bg-background border-border rounded-sm text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                    <p className="text-xs text-muted-foreground max-w-md">
                      Submissions are encrypted in transit and routed according to our privacy policy.
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

            {/* Right Column: Newsroom Operations & Bureau Info */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* Bureau Location Card */}
              <div className="bd-card p-6 bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="bd-headline text-base font-bold text-foreground">
                    {t("contact.hqLocation")}
                  </h3>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {publication.legalName}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {publication.city}
                </p>
                <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-2">
                  <p><span className="font-semibold text-foreground">Regional Bureaus:</span> Riyadh, Dubai, Abu Dhabi, Doha</p>
                  <p><span className="font-semibold text-foreground">General Enquiries:</span> <a href={`mailto:${publication.emails.hello}`} className="text-primary hover:underline">{publication.emails.hello}</a></p>
                </div>
              </div>

              {/* Newsroom Hours */}
              <div className="bd-card p-6 bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="bd-headline text-base font-bold text-foreground">
                    {t("contact.marketHours")}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("contact.marketHoursBody")}
                </p>
              </div>

              {/* Source Protection Notice */}
              <div className="bd-card p-6 bg-muted/40 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h3 className="bd-headline text-sm font-bold text-foreground">
                    {t("contact.sourceProtection")}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {t("contact.sourceProtectionBody")}
                </p>
                <Link
                  href="/editorial"
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t("footer.editorialStandards")}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Social Channels Strip */}
              <div className="bd-card p-5 bg-card">
                <h4 className="bd-eyebrow text-foreground mb-3">Official Communication Channels</h4>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <a
                    href={publication.social.x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-sm bg-muted hover:bg-muted/80 text-foreground transition-colors"
                    aria-label="X / Twitter"
                  >
                    X (@brentdesk)
                  </a>
                  <a
                    href={publication.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-sm bg-muted hover:bg-muted/80 text-foreground transition-colors"
                    aria-label="LinkedIn"
                  >
                    LinkedIn
                  </a>
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

export default Contact;
