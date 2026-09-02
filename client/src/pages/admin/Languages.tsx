/**
 * Admin: Languages
 * ----------------------------------------------------------------------
 * The languages the site publishes in, and how each one gets written.
 *
 * Adding a language is a row here, not a deploy: give it a code, a name in
 * its own script, a direction, and pick how its copy gets produced.
 *
 *   Automatic       — the model translates an article when it publishes or
 *                     when its English changes, and readers see it at once.
 *   Translate by AI — an editor presses Translate; the model writes a draft
 *                     they read before it goes live. The default, because a
 *                     machine translation going straight to readers is an
 *                     editorial decision, not a technical one.
 *   Write by hand   — the model is not involved. A person types it.
 *
 * The glossary is the difference between a usable translation and an
 * embarrassing one. "Big 5 Construct Saudi" is an exhibition, not five large
 * things; terms listed here are rendered exactly as given, every time.
 *
 * Provider and model are left empty by default, which means "use whatever
 * the site's AI settings say". Set them per language when one model handles
 * a language better than the house default.
 */
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Languages as LanguagesIcon, Plus, Pencil, Trash2, Loader2, Sparkles,
  PenLine, Zap, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Mode = "auto" | "manual_ai" | "manual_write";

const MODE_COPY: Record<Mode, { label: string; help: string; icon: typeof Zap }> = {
  auto: {
    label: "Automatic",
    help: "Translate as soon as an article publishes or its English changes, and show it to readers straight away. Spends against your AI key without asking.",
    icon: Zap,
  },
  manual_ai: {
    label: "Translate by AI",
    help: "An editor presses Translate. The model writes a draft that stays hidden from readers until someone publishes it.",
    icon: Sparkles,
  },
  manual_write: {
    label: "Write by hand",
    help: "No model. A person types the translation in the article's Languages panel.",
    icon: PenLine,
  },
};

/** Languages a Gulf trade publication is most likely to add, so the common
 *  case is a click rather than three fields and a guess about direction. */
const PRESETS = [
  { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl", flagEmoji: "🇸🇦" },
  { code: "ur", name: "Urdu", nativeName: "اردو", direction: "rtl", flagEmoji: "🇵🇰" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", flagEmoji: "🇮🇳" },
  { code: "fr", name: "French", nativeName: "Français", direction: "ltr", flagEmoji: "🇫🇷" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", direction: "ltr", flagEmoji: "🇹🇷" },
  { code: "zh-Hans", name: "Chinese (Simplified)", nativeName: "简体中文", direction: "ltr", flagEmoji: "🇨🇳" },
  { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr", flagEmoji: "🇰🇷" },
  { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr", flagEmoji: "🇯🇵" },
  { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr", flagEmoji: "🇩🇪" },
  { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr", flagEmoji: "🇪🇸" },
] as const;

interface FormState {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  flagEmoji: string;
  translationMode: Mode;
  provider: string;
  model: string;
  isActive: boolean;
  glossaryText: string;
}

const EMPTY: FormState = {
  code: "", name: "", nativeName: "", direction: "ltr", flagEmoji: "",
  translationMode: "manual_ai", provider: "", model: "", isActive: true,
  glossaryText: "",
};

/** The glossary is edited as `English = translation`, one per line, because
 *  that is what a desk can paste from a style sheet. */
function parseGlossary(text: string): Array<{ source: string; target: string }> {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const i = line.indexOf("=");
      if (i === -1) return { source: line, target: line };
      return { source: line.slice(0, i).trim(), target: line.slice(i + 1).trim() };
    })
    .filter(g => g.source && g.target);
}

function formatGlossary(entries: Array<{ source: string; target: string }> | undefined): string {
  return (entries ?? []).map(g => `${g.source} = ${g.target}`).join("\n");
}

export default function Languages() {
  const utils = trpc.useUtils();
  const list = trpc.admin.translations.listLocales.useQuery();

  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const onDone = (message: string) => {
    toast.success(message);
    utils.admin.translations.listLocales.invalidate();
    setCreating(false);
    setEditing(null);
    setForm(EMPTY);
  };
  const onError = (e: unknown) => toast.error((e as Error).message);

  const create = trpc.admin.translations.createLocale.useMutation({
    onSuccess: () => onDone("Language added"), onError,
  });
  const update = trpc.admin.translations.updateLocale.useMutation({
    onSuccess: () => onDone("Saved"), onError,
  });
  const remove = trpc.admin.translations.deleteLocale.useMutation({
    onSuccess: () => { onDone("Language removed. Its translations were kept."); setConfirmDelete(null); },
    onError,
  });

  const rows = list.data ?? [];
  const takenCodes = useMemo(() => new Set(rows.map(r => r.code)), [rows]);
  const availablePresets = PRESETS.filter(p => !takenCodes.has(p.code));

  function openCreate() {
    setForm(EMPTY);
    setCreating(true);
  }

  function openEdit(row: (typeof rows)[number]) {
    setForm({
      code: row.code,
      name: row.name,
      nativeName: row.nativeName,
      direction: row.direction,
      flagEmoji: row.flagEmoji ?? "",
      translationMode: row.translationMode as Mode,
      provider: row.provider ?? "",
      model: row.model ?? "",
      isActive: row.isActive,
      glossaryText: formatGlossary(row.glossary),
    });
    setEditing(row.code);
  }

  function applyPreset(code: string) {
    const p = PRESETS.find(x => x.code === code);
    if (!p) return;
    setForm(f => ({
      ...f, code: p.code, name: p.name, nativeName: p.nativeName,
      direction: p.direction, flagEmoji: p.flagEmoji,
    }));
  }

  function submit() {
    const payload = {
      name: form.name.trim(),
      nativeName: form.nativeName.trim(),
      direction: form.direction,
      flagEmoji: form.flagEmoji.trim() || undefined,
      translationMode: form.translationMode,
      provider: form.provider.trim() || null,
      model: form.model.trim() || null,
      glossary: parseGlossary(form.glossaryText),
      isActive: form.isActive,
    };
    if (editing) update.mutate({ code: editing, ...payload });
    else create.mutate({ code: form.code.trim().toLowerCase(), ...payload });
  }

  const saving = create.isPending || update.isPending;
  const dialogOpen = creating || editing !== null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <LanguagesIcon className="h-6 w-6" /> Languages
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              The languages readers can switch the site into. Each one decides
              whether its copy is written by the model automatically, by the
              model on request, or by a person.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add language
          </Button>
        </div>

        {list.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading languages…
          </div>
        )}

        <div className="grid gap-4">
          {rows.map(row => {
            const mode = MODE_COPY[row.translationMode as Mode];
            const ModeIcon = mode?.icon ?? Sparkles;
            return (
              <Card key={row.code} className={row.isActive ? "" : "opacity-60"}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="text-xl leading-none">{row.flagEmoji || "🌐"}</span>
                        <span dir={row.direction} lang={row.code}>{row.nativeName}</span>
                        <span className="text-muted-foreground font-normal">— {row.name}</span>
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="font-mono text-xs">{row.code}</Badge>
                        <Badge variant="outline" className="text-xs uppercase">{row.direction}</Badge>
                        {row.isDefault ? (
                          <Badge className="text-xs">Source language</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <ModeIcon className="h-3 w-3" /> {mode?.label ?? row.translationMode}
                          </Badge>
                        )}
                        {!row.isActive && <Badge variant="outline" className="text-xs">Hidden from readers</Badge>}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!row.isDefault && (
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => setConfirmDelete(row.code)}
                          aria-label={`Remove ${row.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {!row.isDefault && (
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <strong className="tabular-nums">{row.publishedCount}</strong>
                        <span className="text-muted-foreground">live</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <PenLine className="h-4 w-4 text-muted-foreground" />
                        <strong className="tabular-nums">{row.draftCount}</strong>
                        <span className="text-muted-foreground">awaiting review</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className={`h-4 w-4 ${row.staleCount ? "text-amber-600" : "text-muted-foreground"}`} />
                        <strong className="tabular-nums">{row.staleCount}</strong>
                        <span className="text-muted-foreground">
                          out of date — the English changed
                        </span>
                      </span>
                      {(row.provider || row.model) && (
                        <span className="text-muted-foreground">
                          via <span className="font-mono text-xs">{[row.provider, row.model].filter(Boolean).join(" / ")}</span>
                        </span>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${form.name}` : "Add a language"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Changes apply to the reader's switcher immediately."
                  : "Readers can switch to it as soon as it is active. Existing articles stay in English until they are translated."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {!editing && availablePresets.length > 0 && (
                <div className="space-y-2">
                  <Label>Start from a common one</Label>
                  <div className="flex flex-wrap gap-2">
                    {availablePresets.map(p => (
                      <Button
                        key={p.code} type="button" variant="outline" size="sm"
                        className="gap-1.5" onClick={() => applyPreset(p.code)}
                      >
                        <span>{p.flagEmoji}</span>
                        <span dir={p.direction} lang={p.code}>{p.nativeName}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Language code</Label>
                  <Input
                    id="code" value={form.code} disabled={!!editing}
                    placeholder="ar"
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Becomes the URL prefix: /{form.code || "ar"}/construction/…
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="flag">Flag</Label>
                  <Input
                    id="flag" value={form.flagEmoji} placeholder="🇸🇦"
                    onChange={e => setForm(f => ({ ...f, flagEmoji: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name in English</Label>
                  <Input
                    id="name" value={form.name} placeholder="Arabic"
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="native">Name in its own script</Label>
                  <Input
                    id="native" value={form.nativeName} placeholder="العربية"
                    dir={form.direction}
                    onChange={e => setForm(f => ({ ...f, nativeName: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">What the switcher shows.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Reading direction</Label>
                <Select
                  value={form.direction}
                  onValueChange={(v) => setForm(f => ({ ...f, direction: v as "ltr" | "rtl" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ltr">Left to right</SelectItem>
                    <SelectItem value="rtl">Right to left — Arabic, Urdu, Hebrew</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>How translations get written</Label>
                <Select
                  value={form.translationMode}
                  onValueChange={(v) => setForm(f => ({ ...f, translationMode: v as Mode }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MODE_COPY) as Mode[]).map(m => (
                      <SelectItem key={m} value={m}>{MODE_COPY[m].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {MODE_COPY[form.translationMode].help}
                </p>
              </div>

              {form.translationMode !== "manual_write" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="provider">Provider</Label>
                    <Input
                      id="provider" value={form.provider} placeholder="site default"
                      onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model" value={form.model} placeholder="site default"
                      onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    />
                  </div>
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Leave both empty to use whatever AI Settings is configured with,
                    including its API keys and failover.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="glossary">Glossary</Label>
                <Textarea
                  id="glossary" rows={5} value={form.glossaryText}
                  placeholder={"BrentDesk = BrentDesk\nBig 5 Construct Saudi = Big 5 Construct Saudi\nVision 2030 = رؤية 2030"}
                  onChange={e => setForm(f => ({ ...f, glossaryText: e.target.value }))}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  One per line, <code>English = translation</code>. These are rendered
                  exactly as written every time — use it for company names, event
                  names and anything the industry says a particular way.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="active" className="cursor-pointer">Show to readers</Label>
                  <p className="text-xs text-muted-foreground">
                    Off keeps the language and its translations but hides it from the switcher.
                  </p>
                </div>
                <Switch
                  id="active" checked={form.isActive}
                  onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={saving || !form.code.trim() || !form.name.trim() || !form.nativeName.trim()}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Save" : "Add language"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this language?</AlertDialogTitle>
              <AlertDialogDescription>
                Readers will no longer see it in the switcher and its URLs will stop
                resolving. The translations themselves are kept, so adding the
                language back restores everything that was written.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => confirmDelete && remove.mutate({ code: confirmDelete })}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
