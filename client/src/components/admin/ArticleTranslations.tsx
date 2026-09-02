/**
 * Article Translations panel
 * ----------------------------------------------------------------------
 * What this article looks like in every language the site publishes, and
 * the three ways to change that:
 *
 *   Translate and publish — one click, live for readers.
 *   Translate as draft    — the model writes it, nobody sees it until an
 *                           editor presses Publish.
 *   Write it yourself     — type into the field. Editing a machine
 *                           translation does the same thing, and marks it
 *                           as written by a person from then on.
 *
 * The panel is honest about two failure modes rather than hiding them.
 *
 * OUT OF DATE. Each translation remembers the English it was made from. Edit
 * the article and the translation stops matching: it is pulled from the site
 * — readers get English, not a translation of a paragraph that is no longer
 * there — and shown here as needing a re-run.
 *
 * CHECKS FAILED. The model is held to the article's links, figures and
 * paragraph count. When it cannot satisfy them in two attempts the copy is
 * still stored, but the panel says exactly what is wrong with it so an
 * editor fixes that field instead of trusting it.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sparkles, PenLine, Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff,
  Languages as LanguagesIcon, RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type EntityType = "article" | "category" | "company" | "person" | "event";

export interface ArticleTranslationsProps {
  entityId: number;
  entityType?: EntityType;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Headline",
  excerpt: "Standfirst",
  content: "Body",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  name: "Name",
  description: "Description",
  shortDescription: "Short description",
  bio: "Biography",
};

export function ArticleTranslations({ entityId, entityType = "article" }: ArticleTranslationsProps) {
  const utils = trpc.useUtils();
  const status = trpc.admin.translations.status.useQuery(
    { entityType, entityId },
    { enabled: entityId > 0 },
  );

  const [openLocale, setOpenLocale] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => utils.admin.translations.status.invalidate({ entityType, entityId });

  const translate = trpc.admin.translations.translate.useMutation({
    onSuccess: (r) => {
      setBusy(null);
      refresh();
      if (r.problems.length) {
        toast.warning(
          `Translated into ${r.locale}, but ${r.problems.length} field(s) failed the checks. Review before publishing.`,
        );
      } else {
        toast.success(
          r.published
            ? `Published in ${r.locale} — ${r.fields.length} fields, $${r.costUsd}`
            : `Draft written in ${r.locale} — ${r.fields.length} fields, $${r.costUsd}`,
        );
      }
    },
    onError: (e) => { setBusy(null); toast.error(e.message); },
  });

  const saveField = trpc.admin.translations.saveField.useMutation({
    onSuccess: () => { toast.success("Saved"); refresh(); },
    onError: (e) => toast.error(e.message),
  });

  const setStatus = trpc.admin.translations.setStatus.useMutation({
    onSuccess: () => { toast.success("Updated"); refresh(); },
    onError: (e) => toast.error(e.message),
  });

  // Seed the editable boxes from whatever is stored, without clobbering
  // something the editor is mid-way through typing.
  useEffect(() => {
    if (!status.data) return;
    setDrafts(prev => {
      const next = { ...prev };
      for (const loc of status.data.locales) {
        for (const [field, row] of Object.entries(loc.fields)) {
          const key = `${loc.code}:${field}`;
          if (next[key] === undefined) next[key] = (row as any).value;
        }
      }
      return next;
    });
  }, [status.data]);

  if (entityId <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Save the article first. Translations attach to a saved record.
      </p>
    );
  }
  if (status.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading languages…
      </div>
    );
  }
  if (status.error) {
    return <p className="text-sm text-destructive">{status.error.message}</p>;
  }

  const data = status.data!;
  if (!data.locales.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <LanguagesIcon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Only one language is configured. Add another under Settings → Languages
          and it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.locales.map(loc => {
        const done = data.fields.filter(f => loc.fields[f]).length;
        const total = data.fields.filter(f => data.source[f]).length;
        const live = data.fields.filter(f => (loc.fields[f] as any)?.status === "published").length;
        const stale = loc.drifted.length;
        const open = openLocale === loc.code;
        const isBusy = busy === loc.code;
        const machineAllowed = loc.translationMode !== "manual_write";

        return (
          <Card key={loc.code} className={loc.isActive ? "" : "opacity-70"}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-lg leading-none">{loc.flagEmoji || "🌐"}</span>
                    <span dir={loc.direction} lang={loc.code}>{loc.nativeName}</span>
                    <span className="text-muted-foreground font-normal text-sm">{loc.name}</span>
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="tabular-nums">{live} of {total} fields live</span>
                    {done > live && (
                      <Badge variant="secondary" className="text-xs">{done - live} in draft</Badge>
                    )}
                    {stale > 0 && (
                      <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {stale} out of date
                      </Badge>
                    )}
                    {!loc.isActive && <Badge variant="outline" className="text-xs">Hidden from readers</Badge>}
                    {!machineAllowed && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <PenLine className="h-3 w-3" /> Written by hand
                      </Badge>
                    )}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {machineAllowed && (
                    <>
                      <Button
                        size="sm" variant="outline" disabled={isBusy}
                        onClick={() => {
                          setBusy(loc.code);
                          translate.mutate({ entityType, entityId, locale: loc.code, publish: false });
                        }}
                      >
                        {isBusy && translate.variables?.publish === false
                          ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          : <Sparkles className="h-4 w-4 mr-1.5" />}
                        Translate as draft
                      </Button>
                      <Button
                        size="sm" disabled={isBusy}
                        onClick={() => {
                          setBusy(loc.code);
                          translate.mutate({ entityType, entityId, locale: loc.code, publish: true });
                        }}
                      >
                        {isBusy && translate.variables?.publish === true
                          ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          : <Sparkles className="h-4 w-4 mr-1.5" />}
                        {stale > 0 ? "Re-translate and publish" : "Translate and publish"}
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => setOpenLocale(open ? null : loc.code)}
                  >
                    {open ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
                    {open ? "Hide" : "Edit text"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {open && (
              <CardContent className="space-y-5 pt-0">
                {data.fields.filter(f => data.source[f]).map(field => {
                  const stored = loc.fields[field] as any | undefined;
                  const key = `${loc.code}:${field}`;
                  const value = drafts[key] ?? "";
                  const isStale = loc.drifted.includes(field);
                  const isLong = field === "content" || field === "description";

                  return (
                    <div key={field} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label htmlFor={key} className="flex items-center gap-2">
                          {FIELD_LABELS[field] ?? field}
                          {stored?.status === "published" && !isStale && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500 text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Live
                            </Badge>
                          )}
                          {stored?.status === "draft" && (
                            <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                          )}
                          {isStale && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-amber-500 text-amber-700">
                              <AlertTriangle className="h-3 w-3" /> English has changed
                            </Badge>
                          )}
                          {stored?.source === "human" && (
                            <Badge variant="outline" className="text-[10px]">By hand</Badge>
                          )}
                        </Label>
                        {stored && (
                          <span className="text-xs text-muted-foreground">
                            {stored.model ? stored.model : "written by an editor"}
                          </span>
                        )}
                      </div>

                      {/* The English, so the editor is not translating blind. */}
                      <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground max-h-24 overflow-y-auto">
                        {data.source[field]}
                      </div>

                      <Textarea
                        id={key}
                        dir={loc.direction}
                        lang={loc.code}
                        rows={isLong ? 10 : 2}
                        value={value}
                        placeholder={`${FIELD_LABELS[field] ?? field} in ${loc.name}`}
                        onChange={e => setDrafts(d => ({ ...d, [key]: e.target.value }))}
                        className={isLong ? "font-mono text-xs" : ""}
                      />

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm" variant="outline"
                          disabled={!value.trim() || saveField.isPending}
                          onClick={() => saveField.mutate({
                            entityType, entityId, locale: loc.code, field,
                            value, publish: true,
                          })}
                        >
                          <PenLine className="h-3.5 w-3.5 mr-1.5" /> Save and publish
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          disabled={!value.trim() || saveField.isPending}
                          onClick={() => saveField.mutate({
                            entityType, entityId, locale: loc.code, field,
                            value, publish: false,
                          })}
                        >
                          Save as draft
                        </Button>
                        {stored?.status === "published" && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => setStatus.mutate({
                              entityType, entityId, locale: loc.code, field, status: "draft",
                            })}
                          >
                            Unpublish
                          </Button>
                        )}
                        {stored?.status === "draft" && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => setStatus.mutate({
                              entityType, entityId, locale: loc.code, field, status: "published",
                            })}
                          >
                            Publish this field
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {loc.missing.length > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Not translated yet: {loc.missing.map(f => FIELD_LABELS[f] ?? f).join(", ")}
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default ArticleTranslations;
