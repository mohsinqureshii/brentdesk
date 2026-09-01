/**
 * Candidate Dashboard — /me
 * ----------------------------------------------------------------------
 * Job-seeker landing page. Three sections:
 *   1. Personalized job recommendations (matching.match.topJobsForCandidate)
 *   2. Application status summary (myApplications counted by status)
 *   3. Quick links to profile + applications + browse all
 */

import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  ChevronRight,
  Inbox,
  Sparkles,
  Target,
  User,
} from "lucide-react";

export default function CandidateDashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  const me = trpc.candidates.me.useQuery(undefined, { enabled: !!user });
  const apps = trpc.jobApplications.myApplications.useQuery(
    { status: "all", page: 1, limit: 100 },
    { enabled: !!user },
  );
  const recs = trpc.matching.match.topJobsForCandidate.useQuery(
    { candidateId: (me.data as any)?.id ?? 0, limit: 8 },
    { enabled: !!(me.data as any)?.id },
  );

  const counts = countByStatus((apps.data ?? []) as any[]);
  const totalApps = (apps.data ?? []).length;
  const profile: any = me.data;

  return (
    <>
      <Header />
      <div className="container max-w-5xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {profile?.headline ?? `Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your job-seeker dashboard. Tune your profile for better matches.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Inbox className="h-4 w-4" />}
            label="Applications"
            value={totalApps}
            href="/me/applications"
          />
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="In interview"
            value={counts.interview}
            href="/me/applications"
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Offers"
            value={counts.offered + counts.hired}
            href="/me/applications"
            tone={counts.offered + counts.hired > 0 ? "good" : undefined}
          />
          <StatCard
            icon={<User className="h-4 w-4" />}
            label="Profile status"
            value={profile?.parsedResumeJson ? "Parsed" : "Incomplete"}
            href="/me/candidate-profile"
            tone={profile?.parsedResumeJson ? "good" : "warn"}
          />
        </div>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Recommended for you
            </CardTitle>
            <CardDescription>
              Roles that match your profile most closely. Powered by semantic similarity over your resume + skills.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!profile?.parsedResumeJson ? (
              <EmptyState
                title="Upload your resume first"
                body="We score matches against your parsed resume. Add yours to unlock personalized recommendations."
                cta={{ href: "/me/candidate-profile", label: "Edit profile" }}
              />
            ) : recs.isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recs.error ? (
              <EmptyState
                title="Matching not ready yet"
                body={recs.error.message}
              />
            ) : (recs.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="No matches yet"
                body="Once recruiters post jobs that fit your profile, they'll show up here."
                cta={{ href: "/jobs", label: "Browse all jobs" }}
              />
            ) : (
              <div className="space-y-2">
                {recs.data?.map((r: any) => (
                  <Link
                    key={r.jobId}
                    href={`/jobs/${r.jobId}`}
                    className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{r.jobTitle ?? `Job #${r.jobId}`}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline">
                        {Math.round(r.matchScore)}% match
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent applications</CardTitle>
              <CardDescription>Latest five with current status.</CardDescription>
            </div>
            <Link href="/me/applications">
              <Button variant="ghost" size="sm">
                See all <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {apps.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (apps.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="No applications yet"
                body="Apply to open roles on the job board to see them here."
                cta={{ href: "/jobs", label: "Browse jobs" }}
              />
            ) : (
              <div className="space-y-2">
                {(apps.data as any[]).slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between border-b last:border-0 py-2"
                  >
                    <div>
                      <Link
                        href={a.jobSlug ? `/jobs/${a.jobSlug}` : "#"}
                        className="font-medium hover:underline"
                      >
                        {a.jobTitle ?? `Job #${a.jobId}`}
                      </Link>
                      <p className="text-xs text-muted-foreground">{a.companyName ?? ""}</p>
                    </div>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
}

function countByStatus(items: any[]): Record<string, number> {
  const counts: Record<string, number> = {
    new: 0, reviewed: 0, shortlisted: 0, interview: 0,
    offered: 0, hired: 0, rejected: 0, withdrawn: 0,
  };
  for (const a of items) {
    if (a.status in counts) counts[a.status]++;
  }
  return counts;
}

function StatCard({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href: string;
  tone?: "good" | "warn";
}) {
  const valueClass =
    tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "";
  return (
    <Link href={href}>
      <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {icon} {label}
          </div>
          <p className={`text-2xl font-bold tabular-nums mt-1 ${valueClass}`}>{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="text-center py-8">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
      {cta && (
        <Link href={cta.href}>
          <Button variant="outline" size="sm" className="mt-3">
            {cta.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
