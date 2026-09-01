import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Loader2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

/**
 * Generic Integration Config dialog.
 *
 * Reads field schema from the server (integrations.schema), splits inputs
 * into PUBLIC fields (stored as-is) and SECRET fields (encrypted server-
 * side). Empty secret inputs at save time mean "leave existing value
 * untouched" — admins don't need to retype the API key just to change a
 * sender address.
 *
 * Includes a "Test connection" button that calls the per-integration
 * test endpoint (live HTTP ping to Resend / Twilio / WhatsApp / etc.)
 * and surfaces the result inline.
 */
export function IntegrationConfigDialog({
  integrationId,
  open,
  onOpenChange,
  title,
}: {
  integrationId: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const schemaQ = trpc.admin.integrations.schema.useQuery(
    { integrationId },
    { enabled: open },
  );
  const configQ = trpc.admin.integrations.get.useQuery(
    { integrationId },
    { enabled: open },
  );

  const [publicValues, setPublicValues] = useState<Record<string, string>>({});
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [enabled, setEnabled] = useState<boolean>(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Reset form when the dialog opens or the saved config arrives
  useEffect(() => {
    if (!open) return;
    if (configQ.data) {
      setPublicValues((configQ.data.publicConfig as Record<string, string>) || {});
      setEnabled(configQ.data.enabled);
    } else {
      setPublicValues({});
      setEnabled(true);
    }
    setSecretValues({});
    setRevealedSecrets(new Set());
    setTestResult(null);
  }, [open, configQ.data]);

  const saveMut = trpc.admin.integrations.save.useMutation({
    onSuccess: () => {
      toast({ title: "Saved" });
      utils.admin.integrations.list.invalidate();
      utils.admin.integrations.get.invalidate({ integrationId });
    },
    onError: (err) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const testMut = trpc.admin.integrations.test.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      utils.admin.integrations.list.invalidate();
      utils.admin.integrations.get.invalidate({ integrationId });
    },
    onError: (err) => setTestResult({ ok: false, message: err.message }),
  });

  function handleSave() {
    // Empty strings in secrets → leave alone. So filter those out.
    const filteredSecrets = Object.fromEntries(
      Object.entries(secretValues).filter(([, v]) => v !== "")
    );
    saveMut.mutate({
      integrationId,
      enabled,
      publicConfig: publicValues,
      secrets: Object.keys(filteredSecrets).length > 0 ? filteredSecrets : null,
    });
  }

  const fields = schemaQ.data;
  const isLoading = schemaQ.isLoading || configQ.isLoading;
  const hasExistingSecrets = configQ.data?.hasSecrets;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configure {title}
            {configQ.data?.status === "configured" && (
              <Badge className="bg-[#EBF3FF] text-emerald-800 border-[#C7DCFF]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Configured
              </Badge>
            )}
            {configQ.data?.status === "error" && (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <AlertCircle className="h-3 w-3 mr-1" /> Error
              </Badge>
            )}
          </DialogTitle>
          {fields?.docsUrl && (
            <DialogDescription className="flex items-center gap-1">
              Need help finding these values?
              <a
                href={fields.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0066FF] hover:underline inline-flex items-center gap-0.5"
              >
                Provider docs <ExternalLink className="h-3 w-3" />
              </a>
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-[#697386]">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : !fields ? (
          <p className="text-sm text-red-600">Schema unavailable.</p>
        ) : (
          <div className="space-y-5">
            {/* Public fields */}
            {fields.publicFields.length > 0 && (
              <div className="space-y-3">
                {fields.publicFields.map((f) => (
                  <FieldInput
                    key={f.key}
                    field={f}
                    value={publicValues[f.key] || ""}
                    onChange={(v) => setPublicValues((p) => ({ ...p, [f.key]: v }))}
                  />
                ))}
              </div>
            )}

            {/* Secret fields */}
            {fields.secretFields.length > 0 && (
              <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Encrypted at rest
                </p>
                {fields.secretFields.map((f) => (
                  <SecretFieldInput
                    key={f.key}
                    field={f}
                    value={secretValues[f.key] || ""}
                    onChange={(v) => setSecretValues((p) => ({ ...p, [f.key]: v }))}
                    revealed={revealedSecrets.has(f.key)}
                    onToggleReveal={() => setRevealedSecrets((s) => {
                      const next = new Set(s);
                      next.has(f.key) ? next.delete(f.key) : next.add(f.key);
                      return next;
                    })}
                    placeholderHint={hasExistingSecrets ? "Leave blank to keep existing value" : undefined}
                  />
                ))}
              </div>
            )}

            {/* Enabled toggle */}
            <div className="flex items-center gap-3 rounded-md border bg-[#F7F8FA] p-3">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <div>
                <p className="text-sm font-medium text-[#1A1F36]">Enabled</p>
                <p className="text-xs text-[#697386]">When off, the platform behaves as if this integration isn't configured.</p>
              </div>
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`rounded-md border px-4 py-3 text-sm ${
                testResult.ok
                  ? "border-[#C7DCFF] bg-[#F0F7FF] text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}>
                {testResult.ok ? <CheckCircle2 className="h-4 w-4 inline mr-1.5" /> : <AlertCircle className="h-4 w-4 inline mr-1.5" />}
                {testResult.message}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="outline"
            onClick={() => testMut.mutate({ integrationId })}
            disabled={testMut.isPending}
          >
            {testMut.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Testing…</>
            ) : (
              "Test connection"
            )}
          </Button>
          <Button onClick={handleSave} disabled={saveMut.isPending} className="bg-[#0066FF] hover:bg-[#0052CC]">
            {saveMut.isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({ field, value, onChange }: {
  field: { key: string; label: string; type: string; placeholder?: string; helpText?: string; required?: boolean };
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key} className="text-sm">
        {field.label} {field.required && <span className="text-red-600">*</span>}
      </Label>
      {field.type === "textarea" ? (
        <Textarea id={field.key} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={4} />
      ) : (
        <Input id={field.key} type={field.type === "url" || field.type === "email" ? field.type : "text"}
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
      )}
      {field.helpText && <p className="text-xs text-[#697386]">{field.helpText}</p>}
    </div>
  );
}

function SecretFieldInput({ field, value, onChange, revealed, onToggleReveal, placeholderHint }: {
  field: { key: string; label: string; type: string; placeholder?: string; helpText?: string; required?: boolean };
  value: string;
  onChange: (v: string) => void;
  revealed: boolean;
  onToggleReveal: () => void;
  placeholderHint?: string;
}) {
  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.key} className="text-sm">
          {field.label} {field.required && <span className="text-red-600">*</span>}
        </Label>
        <Textarea
          id={field.key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholderHint || field.placeholder}
          rows={6}
          className="font-mono text-xs"
        />
        {field.helpText && <p className="text-xs text-[#697386]">{field.helpText}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key} className="text-sm">
        {field.label} {field.required && <span className="text-red-600">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={field.key}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholderHint || field.placeholder}
          className="pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggleReveal}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9BA3B0] hover:text-[#1A1F36]"
          tabIndex={-1}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {field.helpText && <p className="text-xs text-[#697386]">{field.helpText}</p>}
    </div>
  );
}
