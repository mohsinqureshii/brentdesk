import { useState } from "react";
import { Mail, Zap, TrendingUp, Users, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { LeaderboardAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { publication } from "@shared/publication";

const Newsletter = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [selectedNewsletters, setSelectedNewsletters] = useState<string[]>(["daily-brief"]);

  const subscribe = trpc.submissions.newsletter.useMutation({
    onSuccess: (data) => {
      if (data.alreadySubscribed) {
        toast({
          title: "Already subscribed",
          description: "We've got you. Check your inbox for our most recent issue.",
        });
      } else {
        toast({
          title: "You're in",
          description: "Welcome email on its way. Check your inbox in a minute.",
        });
      }
      setEmail("");
    },
    onError: (err) => {
      toast({
        title: "Subscription failed",
        description: err.message || "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe.mutate({
      email: email.trim().toLowerCase(),
      newsletters: selectedNewsletters,
      source: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  };

  const toggleNewsletter = (id: string) => {
    setSelectedNewsletters(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const newsletters = [
    {
      id: "daily-brief",
      name: publication.newsletter.name,
      frequency: "Every morning",
      description: publication.newsletter.description,
    },
    {
      id: "projects-weekly",
      name: "Projects Weekly",
      frequency: "Weekly",
      description: "Major project awards, tenders, and milestones across construction and infrastructure — tracked from announcement to delivery.",
    },
    {
      id: "energy-brief",
      name: "Energy Brief",
      frequency: "Weekly",
      description: "Oil & gas, power, utilities and renewables: upstream developments, offtake deals, and the policy moves shaping regional energy.",
    },
    {
      id: "jobs-alerts",
      name: "Job Alerts",
      frequency: "As posted",
      description: "New roles across the industries we cover — engineering, construction, energy, logistics, and operations.",
    },
    {
      id: "event-updates",
      name: "Event Updates",
      frequency: "Monthly",
      description: "Upcoming conferences, exhibitions, and industry gatherings across Saudi Arabia, the GCC, and MENA.",
    }
  ];

  const benefits = [
    "Written by our newsroom",
    "No spam, ever",
    "Unsubscribe anytime",
    "Free to read"
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 bg-[#0b0d12]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-gray-200 mb-6">
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">{publication.newsletter.name}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              The Industrial Economy, Every Morning
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              {publication.newsletter.description} Contract awards, project milestones, energy moves, and the people behind them — in one concise read.
            </p>

            {/* Quick Subscribe Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 bg-white text-gray-900 border-white/20 placeholder:text-gray-500"
              />
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={subscribe.isPending}
              >
                {subscribe.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subscribing…</>
                ) : (
                  <>Subscribe <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>

            {/* Benefits */}
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Options */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Choose Your Newsletters</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select the briefings that match your work. You can update your preferences anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {newsletters.map((newsletter) => {
              const isSelected = selectedNewsletters.includes(newsletter.id);

              return (
                <div
                  key={newsletter.id}
                  onClick={() => toggleNewsletter(newsletter.id)}
                  className={`p-6 rounded-lg bg-card border cursor-pointer transition-all duration-300 ${
                    isSelected ? "border-blue-600/50" : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-xs font-medium">
                      {newsletter.frequency}
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? "border-blue-600/50 bg-blue-600/10" : "border-muted-foreground/30"
                    }`}>
                      {isSelected && <CheckCircle className="w-4 h-4 text-blue-600" />}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{newsletter.name}</h3>
                  <p className="text-muted-foreground text-sm">{newsletter.description}</p>
                </div>
              );
            })}
          </div>

          {/* Subscribe Button */}
          <div className="text-center mt-8">
            <Button
              onClick={() => {
                toast({
                  title: "Preferences saved",
                  description: `You'll receive ${selectedNewsletters.length} newsletter(s). Enter your email above to subscribe.`,
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              disabled={selectedNewsletters.length === 0}
            >
              Subscribe to {selectedNewsletters.length} Newsletter{selectedNewsletters.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </section>

      {/* Sample Newsletter */}
      <section className="py-16 bg-card">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">What to Expect</h2>
            <p className="text-muted-foreground">
              A sample of how {publication.newsletter.name} lands in your inbox
            </p>
          </div>

          <div className="p-8 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
              <div className="w-12 h-12 rounded-lg bg-[#0b0d12] flex items-center justify-center">
                <span className="text-2xl font-bold text-white">B</span>
              </div>
              <div>
                <h4 className="font-bold text-foreground">{publication.newsletter.name}</h4>
                <p className="text-sm text-muted-foreground">Your morning briefing</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600 uppercase">Top Story</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Main contract awarded on a giga-project package
                </h3>
                <p className="text-muted-foreground text-sm">
                  The day's most consequential story, with the parties, scope, and what it signals for the wider program...
                </p>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Energy: capacity additions and offtake agreements</h4>
                    <p className="text-xs text-muted-foreground">Power, oil &amp; gas, and renewables in brief</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">People: appointments across the sector</h4>
                    <p className="text-xs text-muted-foreground">Who's moving where, and why it matters</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
    </div>
  );
};

export default Newsletter;
