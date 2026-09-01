/**
 * Tenants List — admin page
 * ----------------------------------------------------------------------
 * Lists every tenant on the platform (super-admin / admin view).
 * Lets admins search, filter by status, create a new tenant, and
 * jump into the editor.
 *
 * Routes that depend on this surface:
 *   /admin/tenants            — this page
 *   /admin/tenants/new        — TenantEditor (create)
 *   /admin/tenants/:id        — TenantEditor (edit + member management)
 */

import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Search } from "lucide-react";

type StatusFilter = "all" | "trial" | "active" | "suspended" | "cancelled";

const STATUS_STYLES: Record<string, string> = {
  trial: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-amber-100 text-amber-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default function TenantsList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const query = trpc.tenants.list.useQuery({
    search: search.trim() || undefined,
    status: status === "all" ? undefined : status,
    page: 1,
    limit: 100,
  });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
            <p className="text-sm text-muted-foreground">
              Every organization on the platform. Each gets its own subdomain and team.
            </p>
          </div>
          <Link href="/admin/tenants/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Tenant
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, slug, or custom domain"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Custom domain</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Residency</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading && (
                    <SkeletonRows />
                  )}
                  {!query.isLoading && query.data?.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        No tenants yet. Create the first one to get started.
                      </td>
                    </tr>
                  )}
                  {query.data?.items.map((t) => (
                    <tr key={t.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{t.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{t.slug}</td>
                      <td className="px-4 py-3 text-xs">{t.customDomain ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">{t.plan}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={STATUS_STYLES[t.status] ?? ""}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 uppercase text-xs">{t.dataResidency}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/tenants/${t.id}`}>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {query.data && (
          <p className="text-xs text-muted-foreground">
            Showing {query.data.items.length} of {query.data.total} tenants.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <tr key={i} className="border-t">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
