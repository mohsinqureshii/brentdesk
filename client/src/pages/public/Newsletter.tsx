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
import { useT } from "@/lib/i18n";

const Newsletter = () => {
  const t = useT();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [selectedNewsletters, setSelectedNewsletters] = useState<string[]>(["daily-brief"]);

  const subscribe = trpc.submissions.newsletter.useMutation({
    onSuccess: (data) => {
      if (data.alreadySubscribed) {
        toast({
          title: t("newsletter.alreadySubscribed"),
          description: t("newsletter.alreadySubscribedBody"),
        });
      } else {
        toast({
          title: t("newsletter.youreIn"),
          description: t("newsletter.youreInBody"),
        });
      }
      setEmail("");
    },
    onError: (err) => {
      toast({
        title: t("newsletter.failed"),
        description: err.message || t("state.tryAgainMoment"),
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
      frequency: t("newsletter.everyMorning"),
      description: publication.newsletter.description,
    },
    {
      id: "projects-weekly",
      name: t("newsletter.projectsWeekly"),
      frequency: t("newsletter.weekly"),
      description: t("newsletter.projectsDetail"),
    },
    {
      id: "energy-brief",
      name: t("newsletter.energyBrief"),
      frequency: t("newsletter.weekly"),
      description: t("newsletter.energyDetail"),
    },
    {
      id: "jobs-alerts",
      name: t("newsletter.jobAlerts"),
      frequency: t("newsletter.asPosted"),
      description: t("newsletter.jobsDetail"),
    },
    {
      id: "event-updates",
      name: t("newsletter.eventUpdates"),
      frequency: t("newsletter.monthly"),
      description: t("newsletter.eventsDetail"),
    }
  ];

  const benefits = [
    t("newsletter.byOurNewsroom"),
    t("newsletter.noSpam"),
    t("newsletter.unsubscribeAnytimeShort"),
    t("newsletter.freeToRead"),
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
              {t("newsletter.heroTitle")}
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              {publication.newsletter.description} {t("newsletter.heroBody")}
            </p>

            {/* Quick Subscribe Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("newsletter.enterEmail")}
                required
                className="flex-1 bg-white text-gray-900 border-white/20 placeholder:text-gray-500"
              />
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={subscribe.isPending}
              >
                {subscribe.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("common.subscribing")}</>
                ) : (
                  <>{t("newsletter.subscribe")} <ArrowRight className="w-4 h-4 ml-2" /></>
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
            <h2 className="text-3xl font-bold text-foreground mb-4">{t("newsletter.selectLists")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("newsletter.selectListsBody")}
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
                  title: t("newsletter.preferencesSaved"),
                  description: t("newsletter.preferencesSavedBody", { n: selectedNewsletters.length }),
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
              disabled={selectedNewsletters.length === 0}
            >
              {t("newsletter.subscribeToCount", { n: selectedNewsletters.length })}
            </Button>
          </div>
        </div>
      </section>

      {/* Sample Newsletter */}
      <section className="py-16 bg-card">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t("newsletter.whatToExpect")}</h2>
            <p className="text-muted-foreground">
              {t("newsletter.sampleIntro", { name: publication.newsletter.name })}
            </p>
          </div>

          <div className="p-8 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
              <div className="w-12 h-12 rounded-lg bg-[#0b0d12] flex items-center justify-center">
                <span className="text-2xl font-bold text-white">B</span>
              </div>
              <div>
                <h4 className="font-bold text-foreground">{publication.newsletter.name}</h4>
                <p className="text-sm text-muted-foreground">{t("newsletter.morningBriefing")}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600 uppercase">{t("list.topStory")}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {t("newsletter.sampleHeadline")}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t("newsletter.sampleLede")}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">{t("newsletter.sampleEnergy")}</h4>
                    <p className="text-xs text-muted-foreground">{t("newsletter.sampleEnergySub")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">{t("newsletter.samplePeople")}</h4>
                    <p className="text-xs text-muted-foreground">{t("newsletter.samplePeopleSub")}</p>
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
