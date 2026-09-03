import { useState } from "react";
import { Mail, Send, Newspaper, Calendar, Megaphone, FileText, HelpCircle, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    message: ""
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

  const contactCategories = [
    {
      icon: Newspaper,
      title: t("contact.newsTips"),
      description: t("contact.newsTipsBody"),
      email: publication.emails.media,
      note: t("contact.newsTipsNote")
    },
    {
      icon: FileText,
      title: t("contact.pressReleases"),
      description: t("contact.pressReleasesBody"),
      email: publication.emails.media,
      note: t("contact.pressReleasesNote")
    },
    {
      icon: Megaphone,
      title: t("contact.advertising"),
      description: t("contact.advertisingBody"),
      linkText: t("contact.advertisingLink"),
      linkHref: "/advertise",
      suffix: t("contact.advertisingSuffix")
    },
    {
      icon: Calendar,
      title: t("contact.eventsListings"),
      description: t("contact.eventsListingsBody"),
      email: publication.emails.hello,
    },
    {
      icon: HelpCircle,
      title: t("contact.corrections"),
      description: t("contact.correctionsBody"),
      email: publication.emails.hello,
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={`Contact Us - ${publication.name}`}
        description={`Get in touch with ${publication.name}. Send us news tips, press releases, event listings, advertising requests, or general feedback.`}
        canonical={`${publication.siteUrl}/contact`}
      />
      <Header />

      {/* Hero Section */}
      <section className="py-16 md:py-20 border-b border-border">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t("footer.contactUs")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t("contact.intro")}
          </p>
        </div>
      </section>

      {/* Contact Categories */}
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {contactCategories.map((category, index) => (
              <div key={index} className="pb-10 border-b border-border last:border-b-0 last:pb-0">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <category.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">{category.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {category.description}{" "}
                      {category.email && (
                        <a
                          href={`mailto:${category.email}`}
                          className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium"
                        >
                          {category.email}
                        </a>
                      )}
                      {category.linkText && (
                        <a
                          href={category.linkHref}
                          className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium"
                        >
                          {category.linkText}
                        </a>
                      )}
                      {category.suffix && ` ${category.suffix}`}
                      {category.email && "."}
                    </p>
                    {category.note && (
                      <p className="text-sm text-muted-foreground/80 mt-2 italic">
                        {category.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* General Inquiry Form */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-3">{t("contact.otherInquiries")}</h2>
          <p className="text-muted-foreground mb-8">
            {t("contact.otherInquiriesBody")}{" "}
            <a href={`mailto:${publication.emails.hello}`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium">
              {publication.emails.hello}
            </a>.
          </p>

          <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
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
                <p className="text-xs text-muted-foreground mb-2">{t("contact.workEmailNote")}</p>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t("contact.emailPlaceholder")}
                  required
                  className="bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t("form.companyName")}</label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder={t("contact.companyPlaceholder")}
                  className="bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t("contact.enquiryAbout")} <span className="text-destructive">*</span></label>
                <Select value={formData.enquiryType} onValueChange={(val) => setFormData({ ...formData, enquiryType: val })}>
                  <SelectTrigger className="bg-background">
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
                <label className="block text-sm font-medium text-foreground mb-2">{t("form.message")} <span className="text-destructive">*</span></label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={t("contact.messagePlaceholder")}
                  rows={5}
                  required
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

export default Contact;
