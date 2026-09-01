/**
 * Admin Login — split-panel layout.
 *
 * Left:   white panel with the auth form (email + password).
 * Right:  black-to-emerald branded panel with the wordmark + back-to-site link.
 *         Collapses to a header strip on phones.
 *
 * No tabs, no SSO buttons — admin auth is intentionally email/password only.
 * The customer sign-in at /signin is the place for OAuth / "create account".
 */

import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Eye, EyeOff, ArrowLeft, ShieldAlert } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        window.location.href = "/admin";
      } else {
        setError(data.error || "Login failed");
        setIsLoggingIn(false);
      }
    },
    onError: (err) => {
      setError(err.message || "An error occurred");
      setIsLoggingIn(false);
    },
  });

  // Redirect already-authenticated staff straight to the dashboard
  if (isAuthenticated && (user?.role === "admin" || user?.role === "editor" || user?.role === "senior_editor" || user?.role === "moderator" || user?.role === "author")) {
    setLocation("/admin");
    return null;
  }

  // Authenticated but not staff → access denied
  if (isAuthenticated && user?.role === "user") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] p-6">
        <div className="max-w-md w-full bg-white rounded-md border border-[#E0E3E8] p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-[#1A1F36] mb-2">Access denied</h1>
          <p className="text-sm text-[#697386] mb-6">
            Your account doesn't have permission to access the admin panel. Contact an administrator if you think this is a mistake.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
            Return to homepage
          </Button>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);
    if (!email || !password) {
      setError("Please enter both email and password");
      setIsLoggingIn(false);
      return;
    }
    loginMutation.mutate({ email, password });
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
            <span className="text-2xl font-bold tracking-tight text-[#1A1F36]">techscoop.</span>
          </Link>

          <h1 className="text-xl font-semibold text-[#1A1F36] mb-2">Admin sign in</h1>
          <p className="text-[#697386] mb-8">
            Editorial team, moderators, and admins. Use your work email.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#0066FF]" />
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[#1A1F36]">
                  Work email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@techscoop.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-md"
                  disabled={isLoggingIn}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-[#1A1F36]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-md pr-10"
                    disabled={isLoggingIn}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BA3B0] hover:text-[#1A1F36]"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full h-12 rounded-md bg-[#0066FF] hover:bg-[#0052CC] text-white text-base font-semibold"
              >
                {isLoggingIn ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</>
                ) : (
                  "Sign in to admin"
                )}
              </Button>
            </form>
          )}

          <p className="text-xs text-[#697386] mt-8 text-center">
            Authorised personnel only. Need access? Contact your administrator.
          </p>
        </div>
      </div>

      {/* ================================================================
          RIGHT — branded panel (collapses on mobile to a footer strip)
          ================================================================ */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-emerald-900">
        {/* Soft emerald glow */}
        <div
          className="absolute inset-0 opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 70% 30%, rgba(74,222,128,0.4), transparent 50%), radial-gradient(circle at 20% 80%, rgba(16,185,129,0.35), transparent 55%)",
          }}
          aria-hidden
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />

        <div className="relative w-full flex flex-col justify-between p-12 xl:p-16 text-white">
          {/* Top — wordmark */}
          <div>
            <span className="text-3xl xl:text-4xl font-bold tracking-tight">techscoop.</span>
          </div>

          {/* Middle — value prop */}
          <div className="max-w-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-[#80B3FF]/80 mb-4">Admin portal</p>
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
              MENA's tech ecosystem, managed.
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Editorial workflows, SEO automation, advertising, audience analytics — everything that keeps techscoop running, in one console.
            </p>
          </div>

          {/* Bottom — back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to techscoop.io
          </Link>
        </div>
      </div>
    </div>
  );
}
