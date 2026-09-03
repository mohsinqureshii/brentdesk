import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { publication } from "@shared/publication";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Rocket, 
  Briefcase, 
  TrendingUp, 
  Bell, 
  BookOpen,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import type { UiKey } from "@shared/uiStrings";

// Copy lives as keys, not sentences: the page is the same in both editions,
// only the language changes. Author names stay as written.
const benefits: { icon: typeof Briefcase; titleKey: UiKey; descriptionKey: UiKey }[] = [
  {
    icon: Briefcase,
    titleKey: "auth.benefitMatches",
    descriptionKey: "auth.benefitMatchesBody"
  },
  {
    icon: TrendingUp,
    titleKey: "auth.benefitTracking",
    descriptionKey: "auth.benefitTrackingBody"
  },
  {
    icon: Bell,
    titleKey: "auth.benefitAlerts",
    descriptionKey: "auth.benefitAlertsBody"
  },
  {
    icon: BookOpen,
    titleKey: "auth.benefitResources",
    descriptionKey: "auth.benefitResourcesBody"
  }
];

const testimonials: { quoteKey: UiKey; author: string; roleKey: UiKey }[] = [
  {
    quoteKey: "auth.testimonialOne",
    author: "Sarah M.",
    roleKey: "auth.testimonialOneRole"
  },
  {
    quoteKey: "auth.testimonialTwo",
    author: "Ahmed K.",
    roleKey: "auth.testimonialTwoRole"
  }
];

export default function Signup() {
  const t = useT();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [subscribedToNewsletter, setSubscribedToNewsletter] = useState(true);
  const [error, setError] = useState("");

  // Register mutation
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // Redirect to dashboard on successful registration
        window.location.href = "/dashboard";
      } else {
        setError(data.error || t("auth.registrationFailed"));
      }
    },
    onError: (err) => {
      setError(err.message || t("auth.genericError"));
    }
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const validateForm = () => {
    if (!name.trim()) {
      setError(t("auth.enterName"));
      return false;
    }
    if (name.trim().length < 2) {
      setError(t("auth.nameTooShort"));
      return false;
    }
    if (!email.trim()) {
      setError(t("auth.enterEmail"));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("auth.invalidEmail"));
      return false;
    }
    if (!password) {
      setError(t("auth.choosePassword"));
      return false;
    }
    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return false;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return false;
    }
    if (!agreedToTerms) {
      setError(t("auth.mustAgree"));
      return false;
    }
    return true;
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) return;

    registerMutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="w-full">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-black via-gray-900 to-black py-16 lg:py-24">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative w-full max-w-[1400px] mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left - Value Proposition */}
              <div className="text-white">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                  {t("auth.joinBadge")}
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                  {t("auth.signupHeadline")}
                </h1>
                <p className="text-lg text-white/70 mb-8">
                  {t("auth.signupSubhead")}
                </p>
                
                {/* Benefits List */}
                <div className="space-y-4">
                  {benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <benefit.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{t(benefit.titleKey)}</h3>
                        <p className="text-sm text-white/60">{t(benefit.descriptionKey)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right - Signup Card */}
              <div className="lg:pl-8">
                <Card className="bg-white shadow-2xl border-0">
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">{t("auth.createYourAccount")}</CardTitle>
                    <CardDescription>
                      {t("auth.freeAndFast")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                      {/* Error Alert */}
                      {error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {/* Name Field */}
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("auth.fullName")}</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder={t("auth.fullNamePlaceholder")}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={registerMutation.isPending}
                          className="h-11"
                        />
                      </div>

                      {/* Email Field */}
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("auth.emailAddress")}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("newsletter.enterEmail")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={registerMutation.isPending}
                          className="h-11"
                        />
                      </div>

                      {/* Password Field */}
                      <div className="space-y-2">
                        <Label htmlFor="password">{t("auth.password")}</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder={t("auth.passwordPlaceholder")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={registerMutation.isPending}
                            className="h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password Field */}
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t("auth.confirmPasswordPlaceholder")}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={registerMutation.isPending}
                            className="h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Terms Agreement */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            id="terms" 
                            checked={agreedToTerms}
                            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                            className="mt-1"
                          />
                          <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                            {t("auth.agreeTo", { site: publication.name })}{" "}
                            <Link href="/terms" className="text-foreground underline hover:no-underline">
                              {t("footer.termsOfService")}
                            </Link>{" "}
                            {t("common.and")}{" "}
                            <Link href="/privacy" className="text-foreground underline hover:no-underline">
                              {t("footer.privacyPolicy")}
                            </Link>
                          </label>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            id="newsletter" 
                            checked={subscribedToNewsletter}
                            onCheckedChange={(checked) => setSubscribedToNewsletter(checked as boolean)}
                            className="mt-1"
                          />
                          <label htmlFor="newsletter" className="text-sm text-muted-foreground leading-relaxed">
                            {t("auth.subscribeNewsletter", { newsletter: publication.newsletter.name })}
                          </label>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button 
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="w-full h-12 text-base font-semibold bg-black hover:bg-gray-800 text-white rounded-lg"
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            {t("auth.creatingAccount")}
                          </>
                        ) : (
                          <>
                            <Rocket className="h-5 w-5 mr-2" />
                            {t("nav.createAccount")}
                          </>
                        )}
                      </Button>

                      <Separator />

                      {/* Already have account */}
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          {t("auth.alreadyHaveAccount")}{" "}
                          <Link href="/signin" className="text-foreground font-medium hover:underline">
                            {t("nav.signIn")}
                          </Link>
                        </p>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Social Proof */}
                <div className="mt-6 text-center">
                  <p className="text-white/60 text-sm mb-3">{t("auth.trustedBy")}</p>
                  <div className="flex items-center justify-center gap-6 text-white/40">
                    <span className="font-semibold">Careem</span>
                    <span className="font-semibold">Noon</span>
                    <span className="font-semibold">Swvl</span>
                    <span className="font-semibold">Kitopi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 bg-muted/30">
          <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-10">{t("auth.membersSay")}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {testimonials.map((testimonial, idx) => (
                <Card key={idx} className="bg-background">
                  <CardContent className="pt-6">
                    <p className="text-lg italic text-muted-foreground mb-4">
                      "{t(testimonial.quoteKey, { site: publication.name })}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-semibold text-sm">{testimonial.author[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">{t(testimonial.roleKey)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-black text-white">
          <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">{t("auth.ctaHeadline")}</h2>
            <p className="text-white/70 mb-8 max-w-2xl mx-auto">
              {t("auth.ctaBody")}
            </p>
            <Link href="#" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Button 
                size="lg"
                className="bg-white text-black hover:bg-white/90 rounded-full px-8"
              >
                {t("auth.createFreeAccount")}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
