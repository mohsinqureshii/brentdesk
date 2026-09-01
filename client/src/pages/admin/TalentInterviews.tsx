/**
 * Talent / Interviews — recruiter upcoming-interviews list
 * ----------------------------------------------------------------------
 * Lists every upcoming interview across the tenant. Each row links to
 * the candidate detail page; clicking the time opens the meeting URL.
 *
 * Backend: ats.interview.listUpcoming({ days })
 */

import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, ExternalLink, Video } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  phone_screen: "Phone screen",
  technical: "Technical",
  system_design: "System design",
  behavioral: "Behavioral",
  culture: "Culture fit",
  final: "Final",
  ai_interview: "AI interview",
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  rescheduled: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-700",
  no_show: "bg-red-100 text-red-800",
};

export default function TalentInterviews() {
  const [days, setDays] = useState(14);
  const query = trpc.ats.interview.listUpcoming.useQuery({ days });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Interviews</h1>
            <p className="text-sm text-muted-foreground">
              Upcoming interviews for this tenant. Click a meeting link to join.
            </p>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Next 7 days</SelectItem>
              <SelectItem value="14">Next 14 days</SelectItem>
              <SelectItem value="30">Next 30 days</SelectItem>
              <SelectItem value="90">Next 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Application</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Meeting</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading && <SkeletonRows />}
                  {!query.isLoading && (query.data?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                        <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        No interviews in the next {days} days.
                      </td>
                    </tr>
                  )}
                  {query.data?.map((iv: any) => (
                    <tr key={iv.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {iv.scheduledAt
                            ? new Date(iv.scheduledAt).toLocaleString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "—"}
                        </div>
                        {iv.durationMinutes && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> {iv.durationMinutes}m
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{TYPE_LABELS[iv.type] ?? iv.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/jobs/${iv.jobId ?? ""}/applications`}>
                          <span className="text-primary hover:underline cursor-pointer">
                            Application #{iv.applicationId}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={STATUS_STYLES[iv.status] ?? ""}>
                          {iv.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {iv.meetingUrl ? (
                          <a
                            href={iv.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                          >
                            <Video className="h-3.5 w-3.5" /> Join
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : iv.location ? (
                          <span className="text-xs text-muted-foreground">{iv.location}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <tr key={i} className="border-t">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
