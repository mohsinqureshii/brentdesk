import { useState } from "react";
import { Send, CheckCircle, Loader2, Rocket, Users, TrendingUp, Globe } from "lucide-react";
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

const SubmitStartup = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    startupName: "",
    website: "",
    description: "",
    category: "",
    founderName: "",
    founderEmail: "",
    founderRole: "",
    location: "",
    fundingStage: "",
    additionalInfo: "",
    newsletters: [] as string[],
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const submit = trpc.submissions.submitStartup.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      setTimeout(() => {
        toast({
          title: "Submission received!",
          description: "Thank you for submitting your startup. Our team will review it shortly.",
        });
        // Reset form
        setFormData({
          startupName: "",
          website: "",
          description: "",
          category: "",
          founderName: "",
          founderEmail: "",
          founderRole: "",
          location: "",
          fundingStage: "",
          additionalInfo: "",
          newsletters: [],
        });
        setCurrentStep(1);
        setIsSubmitted(false);
      }, 2000);
    },
    onError: (err) => {
      toast({
        title: "Couldn't submit your startup",
        description: err.message || "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const newsletterSubscribe = trpc.submissions.newsletter.useMutation({
    onError: (err) => {
      console.error("Newsletter subscription failed:", err);
    },
  });

  const toggleNewsletter = (newsletter: string) => {
    setFormData(prev => ({
      ...prev,
      newsletters: prev.newsletters.includes(newsletter)
        ? prev.newsletters.filter(n => n !== newsletter)
        : [...prev.newsletters, newsletter]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.startupName || !formData.founderName || !formData.founderEmail || formData.description.length < 10) {
      toast({ title: "Please complete all required fields", variant: "destructive" });
      return;
    }

    // Submit startup
    submit.mutate({
      startupName: formData.startupName.trim(),
      website: formData.website.trim() || undefined,
      description: formData.description.trim(),
      category: formData.category || undefined,
      founderName: formData.founderName.trim(),
      founderEmail: formData.founderEmail.trim().toLowerCase(),
      founderRole: formData.founderRole.trim() || undefined,
      location: formData.location.trim() || undefined,
      fundingStage: formData.fundingStage || undefined,
      additionalInfo: formData.additionalInfo.trim() || undefined,
    });

    // Subscribe to newsletters if selected
    if (formData.newsletters.length > 0) {
      newsletterSubscribe.mutate({
        email: formData.founderEmail.trim().toLowerCase(),
        newsletters: formData.newsletters,
        source: "submit_startup",
      });
    }
  };

  const categories = [
    "SaaS",
    "Fintech",
    "E-commerce",
    "AI / Machine Learning",
    "Cybersecurity",
    "Healthtech",
    "Edtech",
    "Logistics / Supply Chain",
    "Cloud / Infrastructure",
    "Other"
  ];

  const fundingStages = [
    "Pre-seed",
    "Seed",
    "Series A",
    "Series B",
    "Series C+",
    "Bootstrapped",
    "Not seeking funding"
  ];

  const newsletters = [
    { id: "daily", label: "Daily News Digest" },
    { id: "weekly", label: "Weekly Roundup" },
    { id: "funding", label: "Funding & VC News" },
    { id: "jobs", label: "Tech Jobs" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title="Submit Your Startup - TechScoop"
        description="Get your startup featured on TechScoop, MENA's leading tech publication. Submit your profile for review and reach thousands of tech professionals, investors, and decision-makers."
        canonical="https://techscoop.io/submit-startup"
      />
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 md:py-20 border-b border-border">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <Rocket className="w-8 h-8 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Get Featured</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Submit Your Startup
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Get your startup featured on TechScoop and reach thousands of investors, tech professionals, and decision-makers across the Middle East and North Africa. Our editorial team reviews every submission to ensure quality coverage.
          </p>
        </div>
      </section>

      {/* Why Submit Section */}
      <section className="py-12 md:py-16 border-b border-border">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-8">Why Submit Your Startup?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <Users className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Reach Our Audience</h3>
                <p className="text-sm text-muted-foreground">Connect with thousands of tech professionals, investors, and decision-makers in MENA.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Build Credibility</h3>
                <p className="text-sm text-muted-foreground">Get featured on MENA's leading tech publication and establish your brand as an industry player.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Globe className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Increase Visibility</h3>
                <p className="text-sm text-muted-foreground">Boost your online presence and attract potential investors, partners, and customers.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Rocket className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Free Coverage</h3>
                <p className="text-sm text-muted-foreground">No fees. Our editorial team reviews submissions based on merit and relevance to our audience.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Submission Form */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-8">Submit Your Startup</h2>

          <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
            {isSubmitted ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-2">Thank You!</h3>
                <p className="text-muted-foreground mb-6">
                  Your startup submission has been received. Our editorial team will review it and get back to you within 3-5 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Step Indicator */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                      1
                    </div>
                    <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>Startup Info</span>
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-muted'}`}></div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                      2
                    </div>
                    <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>Founder Info</span>
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-muted'}`}></div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                      3
                    </div>
                    <span className={`text-sm font-medium ${currentStep >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>Additional</span>
                  </div>
                </div>

                {/* Step 1: Startup Info */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Startup Name <span className="text-destructive">*</span></label>
                      <Input
                        value={formData.startupName}
                        onChange={(e) => setFormData({ ...formData, startupName: e.target.value })}
                        placeholder="Your startup name"
                        required
                        className="bg-background"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Website</label>
                      <Input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://yourwebsite.com"
                        className="bg-background"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                      <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Description <span className="text-destructive">*</span></label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Tell us about your startup (minimum 10 characters)"
                        required
                        minLength={10}
                        maxLength={2000}
                        className="bg-background min-h-32"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/2000</p>
                    </div>
                  </div>
                )}

                {/* Step 2: Founder Info */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Founder Name <span className="text-destructive">*</span></label>
                        <Input
                          value={formData.founderName}
                          onChange={(e) => setFormData({ ...formData, founderName: e.target.value })}
                          placeholder="Full name"
                          required
                          className="bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Email <span className="text-destructive">*</span></label>
                        <Input
                          type="email"
                          value={formData.founderEmail}
                          onChange={(e) => setFormData({ ...formData, founderEmail: e.target.value })}
                          placeholder="your@email.com"
                          required
                          className="bg-background"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Your Role</label>
                      <Input
                        value={formData.founderRole}
                        onChange={(e) => setFormData({ ...formData, founderRole: e.target.value })}
                        placeholder="e.g., CEO, Co-founder"
                        className="bg-background"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="City, Country"
                        className="bg-background"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Funding Stage</label>
                      <Select value={formData.fundingStage} onValueChange={(val) => setFormData({ ...formData, fundingStage: val })}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select funding stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {fundingStages.map(stage => (
                            <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Step 3: Additional Info & Newsletters */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Additional Information</label>
                      <Textarea
                        value={formData.additionalInfo}
                        onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                        placeholder="Any additional details you'd like to share (achievements, partnerships, media mentions, etc.)"
                        maxLength={2000}
                        className="bg-background min-h-32"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{formData.additionalInfo.length}/2000</p>
                    </div>

                    <div className="border-t border-border pt-6">
                      <label className="block text-sm font-medium text-foreground mb-4">Subscribe to TechScoop Newsletters</label>
                      <p className="text-xs text-muted-foreground mb-4">Stay updated with the latest tech news and opportunities in MENA</p>
                      <div className="space-y-3">
                        {newsletters.map(newsletter => (
                          <div key={newsletter.id} className="flex items-center gap-3">
                            <Checkbox
                              checked={formData.newsletters.includes(newsletter.id)}
                              onCheckedChange={() => toggleNewsletter(newsletter.id)}
                              id={`newsletter-${newsletter.id}`}
                            />
                            <label htmlFor={`newsletter-${newsletter.id}`} className="text-sm font-medium text-foreground cursor-pointer">
                              {newsletter.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between gap-4 pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                  >
                    Previous
                  </Button>

                  {currentStep < 3 ? (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submit.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {submit.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Startup
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SubmitStartup;
