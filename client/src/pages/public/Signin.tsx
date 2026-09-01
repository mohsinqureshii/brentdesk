import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { publication } from "@shared/publication";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

/**
 * Customer Sign-in — split-panel layout matching the admin login pattern.
 *
 * Left:   white panel with the auth form. No SSO yet — email/password only,
 *         Google/Microsoft slots pre-stubbed for later if/when you wire them.
 * Right:  black-to-emerald branded panel with the wordmark, the
 *         reader/founder/jobseeker value prop, and the "Don't have an
 *         account? Sign up" CTA. Collapses to nothing on phones — the panel
 *         is decorative on desktop, the form has its own sign-up link inline.
 */
export default function Signin() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Invalid email or password");
      }
    },
    onError: (err) => {
      setError(err.message || "An error occurred. Please try again.");
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const validateForm = () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!password) {
      setError("Please enter your password");
      return false;
    }
    return true;
  };

  const handleSignin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    loginMutation.mutate({ email: email.trim().toLowerCase(), password });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_minmax(0,520px)] bg-white">
      {/* ================================================================
          LEFT — auth form
          ================================================================ */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto">
          {/* Wordmark */}
          <Link href="/" className="inline-block mb-12">
            <span className="text-2xl font-bold tracking-tight text-zinc-900">{publication.wordmark}</span>
          </Link>

          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Welcome back</h1>
          <p className="text-zinc-500 mb-8">
            Sign in to follow the region's industry, save articles, apply to jobs, and customise your news feed.
          </p>

          <form onSubmit={handleSignin} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
                className="h-12 rounded-lg"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="h-12 rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label htmlFor="remember" className="text-sm text-zinc-600 cursor-pointer">
                Keep me signed in for 30 days
              </label>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-12 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold"
            >
              {loginMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Sign up link (visible on mobile too, where the right panel is hidden) */}
          <p className="text-center text-sm text-zinc-600 mt-8">
            New to {publication.name}?{" "}
            <Link href="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline">
              Create a free account
            </Link>
          </p>

          <p className="text-center text-xs text-zinc-500 mt-4">
            By signing in you agree to our{" "}
            <Link href="/terms" className="underline hover:no-underline">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:no-underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* ================================================================
          RIGHT — branded panel (decorative on desktop only)
          ================================================================ */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-emerald-900">
        <div
          className="absolute inset-0 opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 70% 30%, rgba(74,222,128,0.4), transparent 50%), radial-gradient(circle at 20% 80%, rgba(16,185,129,0.35), transparent 55%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />

        <div className="relative w-full flex flex-col justify-between p-12 xl:p-16 text-white">
          {/* Top — wordmark */}
          <div>
            <span className="text-3xl xl:text-4xl font-bold tracking-tight">{publication.wordmark}</span>
          </div>

          {/* Middle — value prop tailored to readers, founders, jobseekers */}
          <div className="max-w-sm space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80 mb-4">
                MENA's tech ecosystem, in one feed
              </p>
              <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
                Funding rounds. Founders. Jobs.
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Independent reporting on the companies and projects building the region's technology future — Saudi Arabia, the UAE, Egypt, and beyond.
              </p>
            </div>

            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex items-start gap-3">
                <span className="mt-2 inline-block w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                <span><strong className="text-white">Personalised feed</strong> — sectors, geographies, and funding stages you actually care about</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 inline-block w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                <span><strong className="text-white">Tech jobs board</strong> — apply with one click to roles at MENA-backed companies</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 inline-block w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                <span><strong className="text-white">Founder resources</strong> — perks, playbooks, and templates from operators in the region</span>
              </li>
            </ul>
          </div>

          {/* Bottom — sign-up CTA + back link */}
          <div className="space-y-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-sm font-medium text-white border border-white/30 hover:bg-white hover:text-black transition-colors px-4 py-2.5 rounded-lg w-fit"
            >
              Don't have an account? Sign up free
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors w-fit ml-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to {publication.domain}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
