import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitCompare, History, ArrowRight } from "lucide-react";

export function ContentComparisonPanel() {
  const [sessionId, setSessionId] = useState("");
  const [selectedVersions, setSelectedVersions] = useState<[number | null, number | null]>([null, null]);

  const versions = trpc.admin.aiExtended.getVersions.useQuery(
    { sessionId: sessionId ? parseInt(sessionId) : 0 },
    { enabled: !!sessionId }
  );

  const diff = trpc.admin.aiExtended.compareVersions.useQuery(
    { versionAId: selectedVersions[0]!, versionBId: selectedVersions[1]! },
    { enabled: !!selectedVersions[0] && !!selectedVersions[1] }
  );

  const toggleVersion = (id: number) => {
    if (selectedVersions[0] === id) setSelectedVersions([null, selectedVersions[1]]);
    else if (selectedVersions[1] === id) setSelectedVersions([selectedVersions[0], null]);
    else if (!selectedVersions[0]) setSelectedVersions([id, selectedVersions[1]]);
    else if (!selectedVersions[1]) setSelectedVersions([selectedVersions[0], id]);
    else setSelectedVersions([selectedVersions[1], id]);
  };

  return (

      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Comparison</h1>
        <p className="text-muted-foreground mt-1">Compare different versions of generated content side-by-side</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Version History</CardTitle>
          <CardDescription>Enter a session ID to view all content versions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Session ID</Label>
              <Input value={sessionId} onChange={e => setSessionId(e.target.value)} placeholder="Enter generation session ID" type="number" />
            </div>
          </div>

          {versions.isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}

          {versions.data && versions.data.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Select two versions to compare (click to select):</p>
              {versions.data.map((v: any) => (
                <div
                  key={v.id}
                  onClick={() => toggleVersion(v.id)}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedVersions.includes(v.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{v.versionNumber}</Badge>
                      <span className="font-medium text-sm">{v.title || "Untitled"}</span>
                      <Badge className="text-xs">{v.source}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                  </div>
                  {v.modelUsed && <p className="text-xs text-muted-foreground mt-1">Model: {v.modelUsed}</p>}
                </div>
              ))}
            </div>
          )}

          {versions.data && versions.data.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No versions found for this session</p>
          )}
        </CardContent>
      </Card>

      {selectedVersions[0] && selectedVersions[1] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Diff: Version {selectedVersions[0]} <ArrowRight className="h-4 w-4" /> Version {selectedVersions[1]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diff.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : diff.data ? (
              <div className="font-mono text-sm space-y-0.5 max-h-[600px] overflow-y-auto">
                {((diff.data as any)?.diff ? (diff.data as any).diff : []).map((line: any, idx: number) => (
                  <div
                    key={idx}
                    className={`px-3 py-0.5 rounded ${
                      line.type === "added" ? "bg-green-500/10 text-green-400" :
                      line.type === "removed" ? "bg-red-500/10 text-red-400 line-through" :
                      "text-muted-foreground"
                    }`}
                  >
                    <span className="mr-2 opacity-50">
                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                    </span>
                    {line.text || "\u00A0"}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Select two versions to compare</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>

  );;
}

// Backwards-compatible default export — wraps the panel in AdminLayout
// so the standalone route keeps working while the panel embeds in AIStudio.
export default function ContentComparisonPanelPage() {
  return (
    <AdminLayout>
      <ContentComparisonPanel />
    </AdminLayout>
  );
}
