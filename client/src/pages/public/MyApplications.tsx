/**
 * My Applications — candidate-facing
 * ----------------------------------------------------------------------
 * Lists every job the signed-in user has applied to, grouped by
 * status. Backend: jobApplications.myApplications.
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, MapPin } from "lucide-react";

type StatusFilter =
  | "all"
  | "new"
  | "reviewed"
  | "shortlisted"
  | "interview"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewed: "bg-indigo-100 text-indigo-800",
  shortlisted: "bg-cyan-100 text-cyan-800",
  interview: "bg-purple-100 text-purple-800",
  offered: "bg-amber-100 text-amber-800",
  hired: "bg-green-100 text-green-800",
  rejected: "bg-gray-100 text-gray-700",
  withdrawn: "bg-gray-100 text-gray-700",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Applied",
  reviewed: "Reviewed",
  shortlisted: "Shortlisted",
  interview: "Interviewing",
  offered: "Offer received",
  hired: "Hired",
  rejected: "Not moving forward",
  withdrawn: "Withdrawn",
};

export default function MyApplications() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const query = trpc.jobApplications.myApplications.useQuery(
    { status, page: 1, limit: 50 },
    { enabled: !!user },
  );

  return (
    <>
      <Header />
      <div className="container max-w-5xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My applications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track where each application stands. Statuses update as the recruiting team reviews your profile.
          </p>
        </div>

        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList className="grid grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="new">Applied</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
            <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
            <TabsTrigger value="interview">Interview</TabsTrigger>
            <TabsTrigger value="offered">Offered</TabsTrigger>
            <TabsTrigger value="hired">Hired</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {query.isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {!query.isLoading && (query.data?.length ?? 0) === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-50" />
              No applications {status !== "all" && `with status "${STATUS_LABEL[status] ?? status}"`}.
              <div className="mt-4">
                <Link href="/jobs">
                  <span className="text-primary hover:underline cursor-pointer text-sm">
                    Browse open roles
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {query.data?.map((a: any) => (
            <Card key={a.id} className="hover:bg-muted/20 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {a.companyLogo ? (
                    <img
                      src={a.companyLogo}
                      alt=""
                      className="h-12 w-12 rounded object-contain bg-muted flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link href={a.jobSlug ? `/jobs/${a.jobSlug}` : "#"}>
                      <h3 className="font-medium truncate hover:underline cursor-pointer">
                        {a.jobTitle ?? `Job #${a.jobId}`}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">{a.companyName ?? ""}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {a.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {a.location}
                        </span>
                      )}
                      <span>
                        Applied {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                      {a.applicationMethod === "external" && (
                        <Badge variant="outline" className="text-xs">External</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_STYLES[a.status] ?? ""}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
