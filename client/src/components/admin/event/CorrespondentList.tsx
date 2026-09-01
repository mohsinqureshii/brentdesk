/**
 * CorrespondentList
 *
 * Per-event correspondent assignments. Each row scopes a user to this
 * event with a role (lead / correspondent / photographer). Add either
 * by typing an email or selecting from the user-lookup autocomplete.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, UserPlus } from "lucide-react";

export function CorrespondentList({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: rows = [] } = trpc.events.adminListCorrespondents.useQuery({ eventId });

  const add = trpc.events.adminAddCorrespondent.useMutation({
    onSuccess: () => {
      toast.success("Correspondent added");
      setEmail("");
      setQuery("");
      utils.events.adminListCorrespondents.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.events.adminRemoveCorrespondent.useMutation({
    onSuccess: () => {
      toast.success("Removed");
      utils.events.adminListCorrespondents.invalidate({ eventId });
    },
    onError: (e) => toast.error(e.message),
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"lead" | "correspondent" | "photographer">("correspondent");
  const [query, setQuery] = useState("");
  const { data: matches = [] } = trpc.events.adminLookupUser.useQuery(
    { query },
    { enabled: query.length >= 2 },
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <UserPlus className="h-4 w-4" /> Correspondents
      </h3>
      <p className="text-xs text-muted-foreground">
        Grants the listed users live-blog write access for THIS event only. Underlying user role
        should be <code>event_correspondent</code> (set in Roles Manager).
      </p>

      <Card className="p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="md:col-span-2">
            <Label>Lookup by name / email</Label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type at least 2 characters…"
            />
            {query.length >= 2 && matches.length > 0 && (
              <div className="border rounded mt-1 divide-y max-h-48 overflow-auto bg-background">
                {matches.map((m: any) => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full text-left px-2 py-1.5 hover:bg-muted text-sm"
                    onClick={() => {
                      add.mutate({ eventId, userId: m.id, role });
                    }}
                  >
                    <span className="font-medium">{m.name || m.email}</span>
                    <span className="text-xs text-muted-foreground ml-2">{m.email} · {m.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>Role</Label>
            <select
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="lead">Lead</option>
              <option value="correspondent">Correspondent</option>
              <option value="photographer">Photographer</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Or paste an email…"
            type="email"
          />
          <Button
            size="sm"
            onClick={() => {
              if (!email.trim()) return;
              add.mutate({ eventId, email: email.trim(), role });
            }}
            disabled={add.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {rows.map((r: any) => (
          <Card key={r.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.userName || r.userEmail || `User #${r.userId}`}</span>
                <Badge variant="outline" className="text-xs uppercase">{r.role}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.userEmail} · added {r.createdAt && new Date(r.createdAt).toLocaleDateString()}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => remove.mutate({ id: r.id })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No correspondents assigned.</p>
        )}
      </div>
    </div>
  );
}
