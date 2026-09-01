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

const benefits = [
  {
    icon: Briefcase,
    title: "Personalized Job Matches",
    description: "Get matched with startup jobs based on your skills and preferences"
  },
  {
    icon: TrendingUp,
    title: "Track Companies & Funding",
    description: "Follow your favorite startups and get notified about funding rounds"
  },
  {
    icon: Bell,
    title: "Custom News Alerts",
    description: "Receive breaking news about topics and companies you care about"
  },
  {
    icon: BookOpen,
    title: "Exclusive Resources",
    description: "Access founder perks, templates, playbooks, and calculators"
  }
];

const testimonials = [
  {
    quote: `${publication.name} helped me land my dream job at an EPC contractor in Riyadh.`,
    author: "Sarah M.",
    role: "Product Manager"
  },
  {
    quote: "The best resource for staying updated on the region's industrial economy.",
    author: "Ahmed K.",
    role: "Founder & CEO"
  }
];

export default function Signup() {
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
        setError(data.error || "Registration failed. Please try again.");
      }
    },
    onError: (err) => {
      setError(err.message || "An error occurred. Please try again.");
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
      setError("Please enter your name");
      return false;
    }
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return false;
    }
    if (!email.trim()) {
      setError("Please enter your email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!password) {
      setError("Please enter a password");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
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
                  Join 50,000+ MENA tech professionals
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                  Your Gateway to MENA's Tech Ecosystem
                </h1>
                <p className="text-lg text-white/70 mb-8">
                  Create your free account to access personalized job matches, exclusive founder resources, 
                  and stay ahead with curated news from the region's fastest-growing tech scene.
                </p>
                
                {/* Benefits List */}
                <div className="space-y-4">
                  {benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <benefit.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{benefit.title}</h3>
                        <p className="text-sm text-white/60">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right - Signup Card */}
              <div className="lg:pl-8">
                <Card className="bg-white shadow-2xl border-0">
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">Create Your Account</CardTitle>
                    <CardDescription>
                      It's free and takes less than a minute
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
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={registerMutation.isPending}
                          className="h-11"
                        />
                      </div>

                      {/* Email Field */}
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={registerMutation.isPending}
                          className="h-11"
                        />
                      </div>

                      {/* Password Field */}
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password (min. 8 characters)"
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
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
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
                            I agree to {publication.name}'s{" "}
                            <Link href="/terms" className="text-foreground underline hover:no-underline">
                              Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="text-foreground underline hover:no-underline">
                              Privacy Policy
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
                            Subscribe to {publication.newsletter.name} (recommended)
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
                            Creating Account...
                          </>
                        ) : (
                          <>
                            <Rocket className="h-5 w-5 mr-2" />
                            Create Account
                          </>
                        )}
                      </Button>

                      <Separator />

                      {/* Already have account */}
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          Already have an account?{" "}
                          <Link href="/signin" className="text-foreground font-medium hover:underline">
                            Sign In
                          </Link>
                        </p>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Social Proof */}
                <div className="mt-6 text-center">
                  <p className="text-white/60 text-sm mb-3">Trusted by professionals at</p>
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
            <h2 className="text-2xl font-bold text-center mb-10">What Our Members Say</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {testimonials.map((testimonial, idx) => (
                <Card key={idx} className="bg-background">
                  <CardContent className="pt-6">
                    <p className="text-lg italic text-muted-foreground mb-4">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-semibold text-sm">{testimonial.author[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
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
            <h2 className="text-3xl font-bold mb-4">Ready to Join MENA's Tech Community?</h2>
            <p className="text-white/70 mb-8 max-w-2xl mx-auto">
              Get instant access to job matches, founder resources, and the latest news from the region's tech ecosystem.
            </p>
            <Link href="#" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Button 
                size="lg"
                className="bg-white text-black hover:bg-white/90 rounded-full px-8"
              >
                Create Free Account
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
