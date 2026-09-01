/**
 * Talent / Candidates List — recruiter page
 * ----------------------------------------------------------------------
 * Tenant-scoped candidate search for the recruiter dashboard.
 * Filters: search text, location, remote-only, years-experience range,
 * archived toggle. Sorts: createdAt / updatedAt / lastActiveAt /
 * yearsExperience.
 *
 * Authorization: handled server-side by candidates.listForTenant —
 * non-recruiter callers get FORBIDDEN.
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users } from "lucide-react";

type SortBy = "createdAt" | "updatedAt" | "lastActiveAt" | "yearsExperience";

export default function TalentCandidatesList() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [openToRemote, setOpenToRemote] = useState<boolean | undefined>(undefined);
  const [isArchived, setIsArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");

  const filters = useMemo(
    () => ({
      page: 1,
      limit: 50,
      search: search.trim() || undefined,
      location: location.trim() || undefined,
      openToRemote,
      isArchived,
      sortBy,
      sortOrder: "desc" as const,
    }),
    [search, location, openToRemote, isArchived, sortBy],
  );

  const query = trpc.candidates.listForTenant.useQuery(filters);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
            <p className="text-sm text-muted-foreground">
              Every candidate visible to this tenant. Click into a profile to score, match, or move them through the pipeline.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name / headline / current title"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="md:w-48"
            />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Newest</SelectItem>
                <SelectItem value="updatedAt">Recently updated</SelectItem>
                <SelectItem value="lastActiveAt">Most active</SelectItem>
                <SelectItem value="yearsExperience">Most experienced</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!openToRemote}
                onCheckedChange={(c) => setOpenToRemote(c ? true : undefined)}
              />
              Remote only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isArchived}
                onCheckedChange={(c) => setIsArchived(!!c)}
              />
              Show archived
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Headline</th>
                    <th className="px-4 py-3 font-medium">Current role</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Yrs</th>
                    <th className="px-4 py-3 font-medium">Remote</th>
                    <th className="px-4 py-3 font-medium">Last active</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading && <SkeletonRows />}
                  {!query.isLoading && (query.data?.items.length ?? 0) === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        No candidates match these filters yet.
                      </td>
                    </tr>
                  )}
                  {query.data?.items.map((c: any) => (
                    <tr key={c.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        {c.headline ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.currentTitle ?? "—"}
                        {c.currentCompany && (
                          <span className="text-muted-foreground"> · {c.currentCompany}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">{c.location ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">{c.yearsExperience ?? "—"}</td>
                      <td className="px-4 py-3">
                        {c.openToRemote ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.lastActiveAt
                          ? new Date(c.lastActiveAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/talent/candidates/${c.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
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
            Showing {query.data.items.length} of {query.data.total} candidates.
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
