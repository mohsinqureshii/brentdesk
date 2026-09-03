import { useState } from "react";
import { fmtNumber } from "@/lib/dates";
import { Link, useParams } from "wouter";
import { useT } from "@/lib/i18n";
import { publication } from "@shared/publication";
import { useAuth } from "@/_core/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LeaderboardAd, MobileStickyAd, SidebarAd } from "@/components/ads/AdUnit";
import {
  MapPin, Building2, ArrowLeft, Linkedin, Twitter, Globe, Mail,
  Calendar, CheckCircle, Briefcase, Users, UserPlus, ExternalLink,
  Sparkles, GraduationCap, Languages, Heart, ChevronRight, Loader2,
  FileText, Phone, Share2, Star, TrendingUp, Award, Target,
  DollarSign, BookOpen, Handshake, ArrowUpRight, Github, Instagram,
  Youtube, Facebook, MessageSquare,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { JsonLd } from "@/components/JsonLd";
import SEO from "@/components/SEO";
import { AvatarWithFallback } from "@/components/ui/avatar-with-fallback";
import { ClaimProfileButton } from "@/components/ClaimProfileButton";
import SpeakingEngagements from "@/components/events/SpeakingEngagements";

export default function PersonDetail() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const bookmarkToggle = trpc.bookmarks.toggle.useMutation();

  const { data: person, isLoading, error } = trpc.people.getBySlug.useQuery(
    { slug: id || "" },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
<Footer />
      <MobileStickyAd slotKey="mobile-sticky-bottom" />
	    </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <SEO title={t("state.personNotFound")} noindex />
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <h2 className="text-2xl font-bold">{t("state.personNotFound")}</h2>
          <p className="text-muted-foreground">{t("state.personNotFoundBody")}</p>
          <Link href="/people"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />{t("state.backToPeople")}</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const p = person as any;
  const experience = Array.isArray(p.experience) ? p.experience : [];
  const education = Array.isArray(p.education) ? p.education : [];
  const langs = Array.isArray(p.languages) ? p.languages : [];
  const functionalStrengths = Array.isArray(p.functionalStrengths) ? p.functionalStrengths : [];
  const openTo = Array.isArray(p.openTo) ? p.openTo : [];
  const achievements = Array.isArray(p.achievements) ? p.achievements : [];
  const keyAchievements = Array.isArray(p.keyAchievements) ? p.keyAchievements : [];
  const angelInvestments = Array.isArray(p.angelInvestments) ? p.angelInvestments : [];
  const boardRoles = Array.isArray(p.boardRoles) ? p.boardRoles : [];
  const advisorRoles = Array.isArray(p.advisorRoles) ? p.advisorRoles : [];
  const companiesFounded = Array.isArray(p.companiesFounded) ? p.companiesFounded : [];
  const interests = Array.isArray(p.interests) ? p.interests : [];
  const sectors = Array.isArray(p.sectors) ? p.sectors : [];
  const regions = Array.isArray(p.regions) ? p.regions : [];
  const similarPeople = Array.isArray(p.similarPeople) ? p.similarPeople : [];

  const tabs = [
    { id: "overview", label: t("person.tabOverview") },
    { id: "experience", label: t("person.tabCareer") },
    { id: "investments", label: t("person.tabInvestments") },
    { id: "network", label: t("person.tabNetwork") },
  ];

  const handleFollow = () => {
    if (!user) { toast({ title: t("auth.signInRequired"), description: t("person.signInToFollow") }); return; }
    bookmarkToggle.mutate(
      { contentType: "person" as any, contentId: p.id, contentTitle: p.name, contentSlug: p.slug },
      { onSuccess: (res) => { setIsFollowing(res.bookmarked); toast({ title: res.bookmarked ? t("person.followingName", { name: p.name }) : t("person.unfollowedName", { name: p.name }) }); } }
    );
  };

  const handleShare = () => {
    const url = `${window.location.origin}/people/${p.slug}`;
    navigator.clipboard.writeText(url).then(() => toast({ title: t("person.linkCopied") }));
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={p.seo?.title || p.name}
        description={p.seo?.description}
        keywords={p.seo?.keywords}
        canonical={`${publication.siteUrl}/people/${p.slug}`}
        ogImage={p.avatar}
      />
      <JsonLd type="Person" data={{
        name: p.name,
        jobTitle: p.title,
        worksFor: p.company ? { "@type": "Organization", name: p.company } : undefined,
        image: p.avatar,
        url: `${window.location.origin}/people/${p.slug}`,
      } as any} />
<Header />

      {/* Inline Edit Banner for profile owners */}
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
              </div>

      {/* Hero Section - White background */}
      <section className="bg-white dark:bg-card border-b">
        {/* Cover banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />

        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 -mt-12 sm:-mt-16 pb-4 sm:pb-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left: Avatar + Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-end gap-4 sm:gap-6 mb-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-white dark:bg-card border-4 border-white dark:border-card shadow-lg overflow-hidden">
                    <AvatarWithFallback src={p.avatar} alt={p.name} name={p.name} size="xl" className="h-full w-full" />
                  </div>
                  {p.isVerified ? (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1 shadow-md">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  ) : null}
                </div>

                {/* Name + Title */}
                <div className="min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{p.name}</h1>
                    {p.isVerified ? <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-xs">{t("person.verified")}</Badge> : null}
                  </div>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    {p.title}
                    {p.company && (
                      <> {t("person.at")} <Link href={`/companies/${p.companyId ? p.slug : ''}`} className="text-primary hover:underline font-medium">{p.company}</Link></>
                    )}
                  </p>
                  {p.location && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {p.location}
                    </p>
                  )}
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {openTo.length > 0 && <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-xs">{t("person.openToIntros")}</Badge>}
                {angelInvestments.length > 0 && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-0 text-xs">{t("person.angelInvestor")}</Badge>}
                {boardRoles.length > 0 && <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 border-0 text-xs">{t("person.boardMember")}</Badge>}
                {companiesFounded.length > 0 && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-0 text-xs">{t("person.founder")}</Badge>}
              </div>

              {/* Meta Info Chips */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {sectors.map((s: any) => (
                  <span key={s.id} className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />{s.name}</span>
                ))}
                {regions.map((r: any) => (
                  <span key={r.id} className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{r.name}</span>
                ))}
                {p.nationality && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{p.nationality}</span>}
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-2 mt-3">
                {p.linkedIn && <a href={p.linkedIn} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Linkedin className="h-4 w-4" /></a>}
                {p.twitter && <a href={p.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Twitter className="h-4 w-4" /></a>}
                {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Globe className="h-4 w-4" /></a>}
                {p.github && <a href={p.github} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Github className="h-4 w-4" /></a>}
                {p.facebook && <a href={p.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Facebook className="h-4 w-4" /></a>}
                {p.instagram && <a href={p.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Instagram className="h-4 w-4" /></a>}
                {p.youtube && <a href={p.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Youtube className="h-4 w-4" /></a>}
              </div>
            </div>

            {/* Right: Action Buttons (Desktop) */}
            <div className="hidden lg:flex flex-col gap-2 w-56 shrink-0 pt-14">
              {p.website && (
                <Button className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90" asChild>
                  <a href={p.website} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" />{t("company.visitWebsite")}<ExternalLink className="h-3 w-3 ml-auto" /></a>
                </Button>
              )}
              <Button variant="outline" className={`w-full gap-2 ${isFollowing ? 'bg-primary/10 border-primary text-primary' : ''}`} onClick={handleFollow}>
                <UserPlus className="h-4 w-4" />{isFollowing ? t("common.following") : t("common.follow")}
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={() => setContactOpen(true)}>
                <Mail className="h-4 w-4" />{t("person.contact")}
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={handleShare}>
                <Share2 className="h-4 w-4" />{t("person.shareProfile")}
              </Button>
              {p.bookingRate && (
                <Button variant="outline" className="w-full gap-2 text-green-600 border-green-200 hover:bg-green-50">
                  <Phone className="h-4 w-4" />{t("person.bookCall")} · {p.bookingRate}
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex lg:hidden items-center gap-2 mt-4">
            <Button variant="outline" className={`flex-1 gap-2 text-sm ${isFollowing ? 'bg-primary/10 border-primary text-primary' : ''}`} onClick={handleFollow}>
              <UserPlus className="h-4 w-4" />{isFollowing ? t("common.following") : t("common.follow")}
            </Button>
            <Button variant="outline" className="gap-2 text-sm" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
            <Button variant="outline" className="gap-2 text-sm" onClick={() => setContactOpen(true)}><Mail className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-card border-b sticky top-0 z-20">
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <nav className="flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Content */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* ===== OVERVIEW TAB ===== */}
            {activeTab === "overview" && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="bg-white dark:bg-card">
                    <CardContent className="p-4 text-center">
                      <Building2 className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                      <div className="text-2xl font-bold">{companiesFounded.length + (p.company ? 1 : 0)}</div>
                      <div className="text-xs text-muted-foreground">{t("article.companies")}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white dark:bg-card">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
                      <div className="text-2xl font-bold">{angelInvestments.length}</div>
                      <div className="text-xs text-muted-foreground">{t("person.investments")}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white dark:bg-card">
                    <CardContent className="p-4 text-center">
                      <Star className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                      <div className="text-2xl font-bold">{boardRoles.length + advisorRoles.length}</div>
                      <div className="text-xs text-muted-foreground">{t("person.boardAdvisory")}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white dark:bg-card">
                    <CardContent className="p-4 text-center">
                      <Users className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                      <div className="text-2xl font-bold">{similarPeople.length}</div>
                      <div className="text-xs text-muted-foreground">{t("person.network")}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Key Achievements */}
                {keyAchievements.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keyAchievements.map((a: any, i: number) => (
                      <Badge key={i} className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-0 px-3 py-1.5 text-xs gap-1.5">
                        <Award className="h-3 w-3" />{typeof a === 'string' ? a : a.title}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* About Section */}
                {(p.bio || p.shortBio) && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">{t("person.about")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: p.bio || p.shortBio }} />
                    </CardContent>
                  </Card>
                )}

                {/* Details & Expertise (side by side) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Details Card */}
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">{t("person.details")}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {p.title && (
                        <div className="flex items-start gap-3">
                          <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div><div className="text-xs text-muted-foreground">{t("person.primaryRole")}</div><div className="text-sm font-medium">{p.title}</div></div>
                        </div>
                      )}
                      {p.company && (
                        <div className="flex items-start gap-3">
                          <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div><div className="text-xs text-muted-foreground">{t("person.organization")}</div><div className="text-sm font-medium">{p.company}</div></div>
                        </div>
                      )}
                      {p.location && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div><div className="text-xs text-muted-foreground">{t("person.location")}</div><div className="text-sm font-medium">{p.location}</div></div>
                        </div>
                      )}
                      {p.nationality && (
                        <div className="flex items-start gap-3">
                          <Globe className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div><div className="text-xs text-muted-foreground">{t("person.nationality")}</div><div className="text-sm font-medium">{p.nationality}</div></div>
                        </div>
                      )}
                      {regions.length > 0 && (
                        <div className="flex items-start gap-3">
                          <Globe className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div><div className="text-xs text-muted-foreground">{t("person.regions")}</div><div className="flex flex-wrap gap-1 mt-1">{regions.map((r: any) => <Badge key={r.id} variant="secondary" className="text-xs">{r.name}</Badge>)}</div></div>
                        </div>
                      )}
                      {langs.length > 0 && (
                        <div className="flex items-start gap-3">
                          <Languages className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div><div className="text-xs text-muted-foreground">{t("person.languages")}</div><div className="flex flex-wrap gap-1 mt-1">{langs.map((l: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{l}</Badge>)}</div></div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Expertise Card */}
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">{t("person.expertise")}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {sectors.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">{t("person.sectors")}</div>
                          <div className="flex flex-wrap gap-1.5">{sectors.map((s: any) => <Badge key={s.id} className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-0 text-xs">{s.name}</Badge>)}</div>
                        </div>
                      )}
                      {functionalStrengths.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">{t("person.functionalStrengths")}</div>
                          <div className="flex flex-wrap gap-1.5">{functionalStrengths.map((s: string, i: number) => <Badge key={i} className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400 border-0 text-xs">{s}</Badge>)}</div>
                        </div>
                      )}
                      {openTo.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">{t("person.openTo")}</div>
                          <div className="flex flex-wrap gap-1.5">{openTo.map((o: string, i: number) => <Badge key={i} className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-xs">{o}</Badge>)}</div>
                        </div>
                      )}
                      {interests.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">{t("person.interests")}</div>
                          <div className="flex flex-wrap gap-1.5">{interests.map((i: string, idx: number) => <Badge key={idx} variant="secondary" className="text-xs">{i}</Badge>)}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Experience Preview (top 3) */}
                {experience.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">{t("person.experience")}</CardTitle>
                      {experience.length > 3 && (
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab("experience")} className="text-xs text-primary">
                          {t("common.viewAll")} <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-0">
                        {experience.slice(0, 3).map((exp: any, i: number) => (
                          <div key={i} className="flex gap-4 py-3 border-b last:border-0">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Briefcase className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold">{exp.role || exp.title}</h4>
                                {exp.current && <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-[10px]">{t("person.current")}</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{exp.company || exp.organization}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{exp.startDate || exp.from}{exp.endDate || exp.to ? ` — ${exp.endDate || exp.to}` : exp.current ? ` — ${t("person.present")}` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Speaking engagements — published events this person
                    has a speaker slot on. Renders nothing when they have
                    none, so non-speaker profiles are unaffected. */}
                <SpeakingEngagements personId={p.id} />

                {/* Similar People */}
                {similarPeople.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">{t("person.similarPeople")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {similarPeople.map((sp: any) => (
                          <Link key={sp.id} href={`/people/${sp.slug}`}>
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                              <AvatarWithFallback src={sp.avatar} alt={sp.name} name={sp.name} size="sm" className="h-10 w-10 rounded-full" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{sp.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{sp.title || sp.company}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ===== CAREER & EDUCATION TAB ===== */}
            {activeTab === "experience" && (
              <>
                {/* Full Experience Timeline */}
                {experience.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">{t("person.careerTimeline")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="relative pl-6 border-l-2 border-muted space-y-6">
                        {experience.map((exp: any, i: number) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold">{exp.role || exp.title}</h4>
                              {exp.current && <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-[10px]">{t("person.current")}</Badge>}
                            </div>
                            <p className="text-sm text-primary font-medium">{exp.company || exp.organization}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{exp.startDate || exp.from}{exp.endDate || exp.to ? ` — ${exp.endDate || exp.to}` : exp.current ? ` — ${t("person.present")}` : ''}</p>
                            {exp.description && <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Education */}
                {education.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">{t("person.education")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {education.map((edu: any, i: number) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <GraduationCap className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold">{edu.degree || edu.qualification}</h4>
                              <p className="text-sm text-muted-foreground">{edu.institution || edu.school || edu.university}</p>
                              {edu.year && <p className="text-xs text-muted-foreground mt-0.5">{edu.year}</p>}
                              {edu.field && <p className="text-xs text-muted-foreground">{edu.field}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Board Roles */}
                {boardRoles.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">{t("person.boardPositions")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {boardRoles.map((br: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                            <Star className="h-5 w-5 text-amber-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold">{br.role || br.title || t("person.boardMember")}</h4>
                              <p className="text-sm text-muted-foreground">{br.company || br.organization}</p>
                            </div>
                            {br.since && <span className="text-xs text-muted-foreground shrink-0">{br.since}</span>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Advisory Roles */}
                {advisorRoles.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">{t("person.advisoryRoles")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {advisorRoles.map((ar: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                            <Handshake className="h-5 w-5 text-blue-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold">{ar.role || ar.title || t("person.advisor")}</h4>
                              <p className="text-sm text-muted-foreground">{ar.company || ar.organization}</p>
                            </div>
                            {ar.since && <span className="text-xs text-muted-foreground shrink-0">{ar.since}</span>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {experience.length === 0 && education.length === 0 && boardRoles.length === 0 && advisorRoles.length === 0 && (
                  <Card className="bg-white dark:bg-card"><CardContent className="py-12 text-center text-muted-foreground">{t("person.noCareerData")}</CardContent></Card>
                )}
              </>
            )}

            {/* ===== INVESTMENTS & COMPANIES TAB ===== */}
            {activeTab === "investments" && (
              <>
                {/* Companies Founded */}
                {companiesFounded.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">{t("person.companiesFounded")} <Badge variant="secondary" className="text-xs">{companiesFounded.length}</Badge></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {companiesFounded.map((cf: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              <Building2 className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold">{cf.name}</h4>
                              {cf.status && <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 text-[10px] mt-1">{cf.status}</Badge>}
                              {cf.sector && <p className="text-xs text-muted-foreground mt-0.5">{cf.sector}</p>}
                            </div>
                            {cf.funding && <span className="text-sm font-semibold text-green-600">{cf.funding}</span>}
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Angel Investments */}
                {angelInvestments.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">{t("person.personalInvestments")} <Badge variant="secondary" className="text-xs">{t("person.nInvestments", { n: angelInvestments.length })}</Badge></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-0">
                        {angelInvestments.map((inv: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <DollarSign className="h-5 w-5 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold">{inv.company || inv.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                {inv.sector && <Badge variant="secondary" className="text-[10px]">{inv.sector}</Badge>}
                                {inv.stage && <Badge variant="secondary" className="text-[10px]">{inv.stage}</Badge>}
                                {inv.year && <span className="text-xs text-muted-foreground">{inv.year}</span>}
                              </div>
                            </div>
                            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-0 text-xs shrink-0">{inv.type || t("person.angel")}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {companiesFounded.length === 0 && angelInvestments.length === 0 && (
                  <Card className="bg-white dark:bg-card"><CardContent className="py-12 text-center text-muted-foreground">{t("person.noInvestmentData")}</CardContent></Card>
                )}
              </>
            )}

            {/* ===== NETWORK & INFLUENCE TAB ===== */}
            {activeTab === "network" && (
              <>
                {/* Achievements */}
                {achievements.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">{t("person.achievements")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {achievements.map((a: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                            <Award className="h-5 w-5 text-amber-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold">{typeof a === 'string' ? a : a.title}</h4>
                              {typeof a !== 'string' && a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                            </div>
                            {typeof a !== 'string' && a.year && <span className="text-xs text-muted-foreground shrink-0">{a.year}</span>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Similar People / Network */}
                {similarPeople.length > 0 && (
                  <Card className="bg-white dark:bg-card">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">{t("person.network")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {similarPeople.map((sp: any) => (
                          <Link key={sp.id} href={`/people/${sp.slug}`}>
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-border">
                              <AvatarWithFallback src={sp.avatar} alt={sp.name} name={sp.name} size="md" className="h-11 w-11 rounded-full" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{sp.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{sp.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{sp.company}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {achievements.length === 0 && similarPeople.length === 0 && (
                  <Card className="bg-white dark:bg-card"><CardContent className="py-12 text-center text-muted-foreground">{t("person.noNetworkData")}</CardContent></Card>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-72 shrink-0 space-y-4">
            {/* Claim Profile */}
            <ClaimProfileButton entityType="person" entityId={p.id} entityName={p.name} />

            {/* Quick Info Card */}
            <Card className="bg-white dark:bg-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t("person.quickInfo")}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{p.email}</span></div>}
                {p.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><span>{p.phone}</span></div>}
                {p.availability && <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-3.5 w-3.5" /><span>{p.availability}</span></div>}
                {p.gender && <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-3.5 w-3.5" /><span>{p.gender}</span></div>}
              </CardContent>
            </Card>

            {/* Ad Spot */}
            <SidebarAd slotKey="detail-sidebar-top" />

            {/* Data Transparency */}
            <Card className="bg-white dark:bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("person.dataTransparency")}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{t("person.dataTransparencyBody")}</p>
                <p className="text-xs text-muted-foreground">{t("person.lastUpdated")}: {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : t("common.notAvailable")}</p>
                <p className="text-xs text-muted-foreground">{t("person.views")}: {fmtNumber(p.viewCount || 0)}</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("person.contactName", { name: p.name })}</DialogTitle>
            <DialogDescription>{t("person.contactBody", { name: p.name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("person.yourEmail")}</label>
              <Input placeholder="your@email.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("person.message")}</label>
              <Textarea placeholder={t("person.messagePlaceholder")} rows={4} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => { toast({ title: t("person.messageSent"), description: t("person.willBeNotified", { name: p.name }) }); setContactOpen(false); setContactMessage(""); setContactEmail(""); }}>
              <Mail className="h-4 w-4 mr-2" />{t("person.sendMessage")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
