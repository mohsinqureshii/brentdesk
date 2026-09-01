/**
 * LiveCoverageSettings
 *
 * Live mode controls for the Live tab. Surfaces:
 *   - Current resolved mode (pre / live / post) computed server-side
 *   - The auto live window (startDate-2h → endDate+6h)
 *   - Editable override timestamps + force-mode dropdown
 *
 * "Save Live Settings" persists overrides without touching the rest of
 * the form — admins want low-friction toggles when an event is in the
 * middle of going live.
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Radio, Clock, AlertCircle, UserCheck, X as XIcon } from "lucide-react";

function fmtDt(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

function toLocalInput(v: string | null | undefined): string {
  if (!v) return "";
  // Trim seconds/zone for `<input type="datetime-local">`.
  return v.slice(0, 16);
}

export function LiveCoverageSettings({ eventId }: { eventId: number }) {
  const { data, refetch } = trpc.events.getResolvedMode.useQuery({ eventId });
  const setLive = trpc.events.adminSetLiveMode.useMutation({
    onSuccess: () => {
      toast.success("Live mode updated");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const [force, setForce] = useState<"" | "pre" | "live" | "post" | "auto">("");
  const [startOverride, setStartOverride] = useState<string>("");
  const [endOverride, setEndOverride] = useState<string>("");

  useEffect(() => {
    if (!data) return;
    setForce((data.liveModeForce as any) ?? "auto");
    setStartOverride(toLocalInput(data.liveModeStartOverride));
    setEndOverride(toLocalInput(data.liveModeEndOverride));
  }, [data?.liveModeForce, data?.liveModeStartOverride, data?.liveModeEndOverride]);

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading live mode…</p>;
  }

  const modeColor =
    data.mode === "live" ? "bg-red-500/15 text-red-600 border-red-500/30"
    : data.mode === "post" ? "bg-blue-500/15 text-blue-600 border-blue-500/30"
    : "bg-amber-500/15 text-amber-600 border-amber-500/30";

  function save() {
    setLive.mutate({
      eventId,
      // Map "auto" UI value back to null (clears the forced flag).
      force: force === "auto" || force === "" ? null : (force as any),
      startOverride: startOverride || null,
      endOverride: endOverride || null,
    });
  }

  return (
    <div className="space-y-4">
      {/* Mode preview */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Public page is currently showing:</span>
          <Badge variant="outline" className={`uppercase font-semibold ${modeColor}`}>
            {data.mode} mode
          </Badge>
          {data.liveModeForce && (
            <span className="text-xs text-muted-foreground">(forced — auto window ignored)</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Event window:</span><br />
            {fmtDt(data.startDate as any)} → {fmtDt(data.endDate as any)}
          </div>
          <div>
            <span className="font-medium text-foreground">Auto live window:</span><br />
            startDate − 2h → endDate + 6h
          </div>
        </div>
      </Card>

      {/* Overrides */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Live Window Overrides</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave blank to use the auto window. Setting a start override only takes effect if it widens
          the window; same for end. To completely override the auto logic, use Force Mode below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Live start override</Label>
            <Input
              type="datetime-local"
              value={startOverride}
              onChange={(e) => setStartOverride(e.target.value)}
            />
          </div>
          <div>
            <Label>Live end override</Label>
            <Input
              type="datetime-local"
              value={endOverride}
              onChange={(e) => setEndOverride(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Force Mode</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
            value={force}
            onChange={(e) => setForce(e.target.value as any)}
          >
            <option value="auto">Auto (use window)</option>
            <option value="pre">Force pre-event</option>
            <option value="live">Force live</option>
            <option value="post">Force post-event</option>
          </select>
          {force && force !== "auto" && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              Forced mode overrides all timestamps. The public page will show "{force}" regardless of the clock.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={setLive.isPending}>Save Live Settings</Button>
        </div>
      </Card>

      <TenantCard eventId={eventId} />
    </div>
  );
}

/**
 * Tenant card — surfaces the event's `claimedByUserId` so admins can
 * see who has been granted live-posting rights as the event organiser.
 * canPostLive() returns true for the tenant user even without an
 * event_correspondents row, so this is the lightweight way to hand
 * out posting access to an external organiser.
 */
function TenantCard({ eventId }: { eventId: number }) {
  const { data, refetch } = trpc.events.adminGetEventTenant.useQuery({ eventId });
  const setTenant = trpc.events.adminSetEventTenant.useMutation({
    onSuccess: () => {
      toast.success("Tenant updated");
      refetch();
      setQuery("");
      setResults([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: number; name: string | null; email: string | null }>>([]);
  const lookup = trpc.events.adminLookupUser.useQuery(
    { query },
    { enabled: query.length >= 2 },
  );

  useEffect(() => {
    setResults((lookup.data as any) ?? []);
  }, [lookup.data]);

  function unclaim() {
    setTenant.mutate({ eventId, userId: null });
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Event Tenant</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        The tenant is the organiser who gets live-posting rights without needing a
        correspondent row. Useful when handing a single account to an external partner.
      </p>

      {data?.user ? (
        <div className="flex items-center gap-3 p-2 border rounded-md">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{data.user.name || data.user.email}</div>
            <div className="text-xs text-muted-foreground truncate">
              {data.user.email}{data.user.role ? ` · ${data.user.role}` : ""}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={unclaim} disabled={setTenant.isPending}>
            <XIcon className="h-3 w-3 mr-1" /> Unclaim
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No tenant assigned.</p>
      )}

      <div className="space-y-2">
        <Label className="text-xs">Grant live posting (search by name / email)</Label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="jane@example.com"
        />
        {query.length >= 2 && results.length > 0 && (
          <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setTenant.mutate({ eventId, userId: u.id })}
                disabled={setTenant.isPending}
                className="w-full text-left p-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="font-medium">{u.name || u.email}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </button>
            ))}
          </div>
        )}
        {query.length >= 2 && !lookup.isLoading && results.length === 0 && (
          <p className="text-xs text-muted-foreground">No users match.</p>
        )}
      </div>
    </Card>
  );
}
