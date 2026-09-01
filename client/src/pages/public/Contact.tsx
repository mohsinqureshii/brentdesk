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

const Contact = () => {
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
        title: "Message sent",
        description: "We've received your message and will reply within 1 business day.",
      });
      setFormData({ firstName: "", lastName: "", email: "", company: "", enquiryType: "", message: "" });
    },
    onError: (err) => {
      toast({
        title: "Couldn't send your message",
        description: err.message || "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || formData.message.length < 10) {
      toast({ title: "Please complete all required fields", variant: "destructive" });
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
      title: "News Tips",
      description: "Got a news tip or inside information about a story we should cover? We'd love to hear from you. Please drop us a note at",
      email: "tips@techscoop.io",
      note: "If you prefer to remain anonymous, please mention that in your email and we will protect your identity."
    },
    {
      icon: Calendar,
      title: "Events Related Inquiries",
      description: "If you have a question related to our events, please contact",
      email: "events@techscoop.io",
    },
    {
      icon: Megaphone,
      title: "Advertising & Sponsorships",
      description: "For advertising and sponsorship inquiries, please",
      linkText: "visit our advertise page",
      linkHref: "/advertise",
      suffix: "and an account executive will get back to you quickly."
    },
    {
      icon: FileText,
      title: "Pitches & Press Releases",
      description: "Have a startup story, funding announcement, or product launch to share? Send your pitch to",
      email: "editorial@techscoop.io",
      note: "Please include relevant details such as funding amount, company background, and any supporting materials."
    },
    {
      icon: HelpCircle,
      title: "Corrections & Feedback",
      description: "We take accuracy seriously. If you've spotted an error in our reporting or have feedback about our coverage, please reach out to",
      email: "connect@techscoop.io",
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title="Contact Us - TechScoop"
        description="Get in touch with TechScoop. Send us news tips, event inquiries, advertising requests, or general feedback."
        canonical="https://techscoop.io/contact"
      />
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 md:py-20 border-b border-border">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Contact Us
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Whether you have a news tip, want to partner with us, or just have a question — we're here to help. Choose the most relevant category below or use the general inquiry form.
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
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <category.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">{category.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {category.description}{" "}
                      {category.email && (
                        <a 
                          href={`mailto:${category.email}`} 
                          className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 font-medium"
                        >
                          {category.email}
                        </a>
                      )}
                      {category.linkText && (
                        <a 
                          href={category.linkHref} 
                          className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 font-medium"
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
          <h2 className="text-3xl font-bold text-foreground mb-3">Other Inquiries</h2>
          <p className="text-muted-foreground mb-8">
            For anything else, fill out the form below and we'll route your message to the right team. All inquiries are sent to{" "}
            <a href="mailto:connect@techscoop.io" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 font-medium">
              connect@techscoop.io
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
                <p className="text-xs text-muted-foreground mb-2">If you're able, we prefer to connect through your work email.</p>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  className="bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Company Name</label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Your company or organization"
                  className="bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">What is your enquiry about? <span className="text-destructive">*</span></label>
                <Select value={formData.enquiryType} onValueChange={(val) => setFormData({ ...formData, enquiryType: val })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Please Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="News Tips">News Tips</SelectItem>
                    <SelectItem value="Events Related Inquiries">Events Related Inquiries</SelectItem>
                    <SelectItem value="Advertising & Sponsorships">Advertising & Sponsorships</SelectItem>
                    <SelectItem value="Editorial Pitches">Editorial Pitches</SelectItem>
                    <SelectItem value="Corrections & Feedback">Corrections & Feedback</SelectItem>
                    <SelectItem value="Partnership Inquiry">Partnership Inquiry</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Message <span className="text-destructive">*</span></label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us more about your inquiry..."
                  rows={5}
                  required
                  className="bg-background"
                />
              </div>

              <Button
                type="submit"
                disabled={submit.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
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

export default Contact;
