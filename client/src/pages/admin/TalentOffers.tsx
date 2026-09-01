/**
 * Talent / Offers — recruiter
 * ----------------------------------------------------------------------
 * Tenant-scoped offer management. Backend: ats.offer.*
 *
 * Phase scope: list + status transitions only. Drafting a new offer
 * happens from the candidate detail page (linked from each row).
 * This page is the queue — what's pending, what was sent, what got
 * accepted or declined.
 */

import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award, Check, Send, X } from "lucide-react";

type StatusFilter = "all" | "drafted" | "sent" | "accepted" | "declined" | "withdrawn" | "expired";

const STATUS_STYLES: Record<string, string> = {
  drafted: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-100 text-gray-700",
  expired: "bg-amber-100 text-amber-800",
};

export default function TalentOffers() {
  const [applicationFilter, setApplicationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const utils = trpc.useUtils();

  // The ats.offer router doesn't ship a tenant-wide list; we use
  // findForApplication keyed by user input. Recruiter pastes the
  // application id (from the pipeline / candidate detail) to surface
  // the matching offers.
  const appId = applicationFilter.trim() ? Number(applicationFilter.trim()) : null;
  const query = trpc.ats.offer.findForApplication.useQuery(
    { applicationId: appId ?? 0 },
    { enabled: appId !== null && !Number.isNaN(appId) },
  );

  const sendMut = trpc.ats.offer.send.useMutation({
    onSuccess: () => {
      toast.success("Offer sent.");
      if (appId) utils.ats.offer.findForApplication.invalidate({ applicationId: appId });
    },
    onError: (e) => toast.error(e.message),
  });
  const acceptMut = trpc.ats.offer.markAccepted.useMutation({
    onSuccess: () => {
      toast.success("Marked accepted.");
      if (appId) utils.ats.offer.findForApplication.invalidate({ applicationId: appId });
    },
    onError: (e) => toast.error(e.message),
  });
  const declineMut = trpc.ats.offer.markDeclined.useMutation({
    onSuccess: () => {
      toast.success("Marked declined.");
      if (appId) utils.ats.offer.findForApplication.invalidate({ applicationId: appId });
    },
    onError: (e) => toast.error(e.message),
  });
  const withdrawMut = trpc.ats.offer.withdraw.useMutation({
    onSuccess: () => {
      toast.success("Offer withdrawn.");
      if (appId) utils.ats.offer.findForApplication.invalidate({ applicationId: appId });
    },
    onError: (e) => toast.error(e.message),
  });

  const items = ((query.data ?? []) as any[]).filter(
    (o) => statusFilter === "all" || o.status === statusFilter,
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
            <p className="text-sm text-muted-foreground">
              Manage offers per application. To draft a new offer, open the candidate detail.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
            <Input
              type="number"
              placeholder="Application id"
              value={applicationFilter}
              onChange={(e) => setApplicationFilter(e.target.value)}
              className="md:w-48"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="drafted">Drafted</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Offer</th>
                    <th className="px-4 py-3 font-medium">Comp</th>
                    <th className="px-4 py-3 font-medium">Start</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!appId && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                        <Award className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        Paste an application id above to view its offers.
                      </td>
                    </tr>
                  )}
                  {appId && query.isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6">
                        <Skeleton className="h-16 w-full" />
                      </td>
                    </tr>
                  )}
                  {appId && !query.isLoading && items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                        No offers for application #{appId}{statusFilter !== "all" && ` with status ${statusFilter}`}.
                      </td>
                    </tr>
                  )}
                  {items.map((o: any) => (
                    <tr key={o.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">Offer #{o.id}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.expiresAt && `Expires ${new Date(o.expiresAt).toLocaleDateString()}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {o.baseSalary && (
                          <div>
                            Base: <span className="font-mono">{Number(o.baseSalary).toLocaleString()} {o.currency ?? "USD"}</span>
                          </div>
                        )}
                        {o.bonus && (
                          <div>
                            Bonus: <span className="font-mono">{Number(o.bonus).toLocaleString()}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {o.startDate ? new Date(o.startDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={STATUS_STYLES[o.status] ?? ""}>
                          {o.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {o.status === "drafted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendMut.mutate({ id: o.id })}
                            disabled={sendMut.isPending}
                          >
                            <Send className="h-3 w-3 mr-1" /> Send
                          </Button>
                        )}
                        {o.status === "sent" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acceptMut.mutate({ id: o.id })}
                              disabled={acceptMut.isPending}
                            >
                              <Check className="h-3 w-3 mr-1" /> Accepted
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const reason = prompt("Decline reason") ?? "";
                                if (!reason) return;
                                declineMut.mutate({ id: o.id, reason });
                              }}
                              disabled={declineMut.isPending}
                            >
                              <X className="h-3 w-3 mr-1" /> Declined
                            </Button>
                          </>
                        )}
                        {(o.status === "drafted" || o.status === "sent") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Withdraw this offer?")) withdrawMut.mutate({ id: o.id });
                            }}
                            disabled={withdrawMut.isPending}
                          >
                            Withdraw
                          </Button>
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
