import { useState } from "react";
import { Mail, Zap, TrendingUp, Users, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { LeaderboardAd, MobileStickyAd } from "@/components/ads/AdUnit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";

const Newsletter = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [selectedNewsletters, setSelectedNewsletters] = useState<string[]>(["daily"]);

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
      id: "daily",
      name: "Daily Digest",
      frequency: "Every weekday",
      description: "The top tech stories you need to start your day. Curated headlines, breaking news, and must-read articles.",
      subscribers: "180K+",
      color: "emerald"
    },
    {
      id: "startup",
      name: "Startup Weekly",
      frequency: "Every Tuesday",
      description: "Funding rounds, acquisitions, and startup news from around the world. Essential for founders and investors.",
      subscribers: "85K+",
      color: "blue"
    },
    {
      id: "ai",
      name: "AI Insider",
      frequency: "Every Thursday",
      description: "Deep dives into artificial intelligence, machine learning, and the future of technology.",
      subscribers: "120K+",
      color: "purple"
    },
    {
      id: "markets",
      name: "Market Watch",
      frequency: "Every Friday",
      description: "Tech stock movements, IPO updates, and financial analysis for the tech sector.",
      subscribers: "65K+",
      color: "orange"
    }
  ];

  const benefits = [
    "Curated by industry experts",
    "No spam, ever",
    "Unsubscribe anytime",
    "Exclusive insights"
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/50" },
      blue: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/50" },
      purple: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/50" },
      orange: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/50" }
    };
    return colors[color] || colors.emerald;
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-emerald-500/10 via-background to-blue-500/10">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">250K+ Subscribers</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Stay Ahead of Tech
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Join 250,000+ tech leaders, founders, and enthusiasts who get the best of TechScoop delivered straight to their inbox.
            </p>

            {/* Quick Subscribe Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 bg-card border-border"
              />
              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
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
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
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
              Select the newsletters that match your interests. You can update your preferences anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {newsletters.map((newsletter) => {
              const colors = getColorClasses(newsletter.color);
              const isSelected = selectedNewsletters.includes(newsletter.id);
              
              return (
                <div 
                  key={newsletter.id}
                  onClick={() => toggleNewsletter(newsletter.id)}
                  className={`p-6 rounded-2xl bg-card border cursor-pointer transition-all duration-300 ${
                    isSelected ? colors.border : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`px-3 py-1 rounded-full ${colors.bg} ${colors.text} text-xs font-medium`}>
                      {newsletter.frequency}
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? `${colors.border} ${colors.bg}` : "border-muted-foreground/30"
                    }`}>
                      {isSelected && <CheckCircle className={`w-4 h-4 ${colors.text}`} />}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{newsletter.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{newsletter.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {newsletter.subscribers} subscribers
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subscribe Button */}
          <div className="text-center mt-8">
            <Button 
              onClick={() => {
                toast({
                  title: "Preferences saved!",
                  description: `You'll receive ${selectedNewsletters.length} newsletter(s).`,
                });
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
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
              Here's a preview of what lands in your inbox
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-background border border-border">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-500">TS</span>
              </div>
              <div>
                <h4 className="font-bold text-foreground">TechScoop Daily Digest</h4>
                <p className="text-sm text-muted-foreground">January 17, 2026</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-500 uppercase">Top Story</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  AI Startup Raises $500M in Record Series B Round
                </h3>
                <p className="text-muted-foreground text-sm">
                  The funding round values the company at $5 billion, making it one of the fastest-growing AI companies in history...
                </p>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Tech Stocks Rally on Strong Earnings</h4>
                    <p className="text-xs text-muted-foreground">NASDAQ up 2.3% in early trading</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Major Tech Company Announces AR Glasses</h4>
                    <p className="text-xs text-muted-foreground">Available later this year</p>
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
