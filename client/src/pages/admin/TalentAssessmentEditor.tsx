/**
 * Talent / Assessment Editor — per-question CRUD
 * ----------------------------------------------------------------------
 * One template's questions. Recruiters land here from the templates
 * catalog (/admin/talent/assessments → click a row → here).
 *
 * Supported question types end-to-end:
 *   - coding (starter code + language)
 *   - multiple_choice (choices + correct keys)
 *   - short_answer / long_answer / system_design (rubric for LLM grading)
 *
 * Reorder via up/down buttons (no drag-drop dep). reorderQuestions
 * takes an id → position map; we send the post-swap snapshot.
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Code,
  ListChecks,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";

type QType = "coding" | "multiple_choice" | "short_answer" | "long_answer" | "system_design";

interface QForm {
  type: QType;
  prompt: string;
  starterCode: string;
  language: string;
  choices: Array<{ key: string; label: string }>;
  correctChoiceKeys: string[];
  rubric: string;
  points: number;
  timeLimitSeconds: number;
}

const EMPTY_FORM: QForm = {
  type: "short_answer",
  prompt: "",
  starterCode: "",
  language: "python",
  choices: [{ key: "A", label: "" }, { key: "B", label: "" }],
  correctChoiceKeys: [],
  rubric: "",
  points: 10,
  timeLimitSeconds: 0,
};

const TYPE_LABELS: Record<QType, string> = {
  coding: "Coding",
  multiple_choice: "Multiple choice",
  short_answer: "Short answer",
  long_answer: "Long answer",
  system_design: "System design",
};

const TYPE_ICONS: Record<QType, React.ComponentType<{ className?: string }>> = {
  coding: Code,
  multiple_choice: ListChecks,
  short_answer: MessageSquare,
  long_answer: MessageSquare,
  system_design: MessageSquare,
};

export default function TalentAssessmentEditor() {
  const params = useParams<{ id: string }>();
  const templateId = Number(params.id);
  const utils = trpc.useUtils();

  const template = trpc.assessments.template.get.useQuery({
    id: templateId,
    includeCorrect: true,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<QForm>(EMPTY_FORM);

  const addMut = trpc.assessments.template.addQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question added.");
      utils.assessments.template.get.invalidate({ id: templateId, includeCorrect: true });
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.assessments.template.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question saved.");
      utils.assessments.template.get.invalidate({ id: templateId, includeCorrect: true });
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.assessments.template.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question removed.");
      utils.assessments.template.get.invalidate({ id: templateId, includeCorrect: true });
    },
    onError: (e) => toast.error(e.message),
  });
  const reorderMut = trpc.assessments.template.reorderQuestions.useMutation({
    onSuccess: () => {
      utils.assessments.template.get.invalidate({ id: templateId, includeCorrect: true });
    },
    onError: (e) => toast.error(e.message),
  });

  const t: any = template.data;
  const questions: any[] = (t?.questions ?? []).slice().sort(
    (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0),
  );

  const totalPoints = questions.reduce(
    (sum: number, q: any) => sum + (q.points ?? 0),
    0,
  );

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (q: any) => {
    setEditingId(q.id);
    setForm({
      type: q.type as QType,
      prompt: q.prompt ?? "",
      starterCode: q.starterCode ?? "",
      language: q.language ?? "python",
      choices: Array.isArray(q.choices) && q.choices.length > 0
        ? q.choices
        : [{ key: "A", label: "" }, { key: "B", label: "" }],
      correctChoiceKeys: Array.isArray(q.correctChoiceKeys) ? q.correctChoiceKeys : [],
      rubric: q.rubric ?? "",
      points: q.points ?? 10,
      timeLimitSeconds: q.timeLimitSeconds ?? 0,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const buildPayload = () => {
    const base: any = {
      type: form.type,
      prompt: form.prompt,
      points: form.points,
      timeLimitSeconds: form.timeLimitSeconds || undefined,
    };
    if (form.type === "coding") {
      base.starterCode = form.starterCode || undefined;
      base.language = form.language;
    }
    if (form.type === "multiple_choice") {
      base.choices = form.choices.filter((c) => c.label.trim().length > 0);
      base.correctChoiceKeys = form.correctChoiceKeys;
    }
    if (form.type !== "multiple_choice") {
      base.rubric = form.rubric || undefined;
    }
    return base;
  };

  const handleSave = () => {
    if (!form.prompt.trim()) {
      toast.error("Prompt is required.");
      return;
    }
    if (form.type === "multiple_choice" && form.correctChoiceKeys.length === 0) {
      toast.error("Pick at least one correct choice.");
      return;
    }
    if (editingId === null) {
      addMut.mutate({ templateId, position: questions.length, ...buildPayload() });
    } else {
      updateMut.mutate({ id: editingId, ...buildPayload() });
    }
  };

  const moveQuestion = (id: number, direction: -1 | 1) => {
    const i = questions.findIndex((q) => q.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= questions.length) return;
    const swapped = questions.slice();
    [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
    const idToPos: Record<string, number> = {};
    swapped.forEach((q, idx) => {
      idToPos[String(q.id)] = idx;
    });
    reorderMut.mutate({ templateId, idToPos });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/talent/assessments">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> All templates
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {template.isLoading ? <Skeleton className="h-7 w-48" /> : t?.name ?? `Template #${templateId}`}
              </h1>
              {t && (
                <p className="text-sm text-muted-foreground">
                  <Badge variant="outline" className="mr-2">{t.category}</Badge>
                  {t.durationMinutes}m
                  {t.passThreshold != null && ` · pass ≥ ${t.passThreshold}`}
                  {` · ${questions.length} questions · ${totalPoints} pts`}
                </p>
              )}
            </div>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Add question
          </Button>
        </div>

        {template.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : questions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No questions yet. Add the first one to start inviting candidates to this template.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {questions.map((q: any, i: number) => {
              const Icon = TYPE_ICONS[q.type as QType] ?? MessageSquare;
              return (
                <Card key={q.id}>
                  <CardContent className="p-4 flex gap-3">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <span className="font-mono text-xs text-muted-foreground">
                        Q{i + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => moveQuestion(q.id, -1)}
                        disabled={i === 0 || reorderMut.isPending}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => moveQuestion(q.id, 1)}
                        disabled={i === questions.length - 1 || reorderMut.isPending}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{TYPE_LABELS[q.type as QType] ?? q.type}</Badge>
                          {q.language && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {q.language}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{q.points} pts</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(q)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Delete this question? Existing attempts keep their answers.")) {
                                deleteMut.mutate({ id: q.id });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{q.prompt}</p>
                      {q.type === "multiple_choice" && Array.isArray(q.choices) && (
                        <ul className="mt-2 text-xs space-y-0.5">
                          {q.choices.map((c: any) => (
                            <li key={c.key} className="flex gap-2">
                              <span className="font-mono w-5">{c.key}.</span>
                              <span>{c.label}</span>
                              {Array.isArray(q.correctChoiceKeys) &&
                                q.correctChoiceKeys.includes(c.key) && (
                                  <Badge variant="outline" className="ml-auto bg-emerald-50 text-emerald-700 text-xs">
                                    correct
                                  </Badge>
                                )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {q.type === "coding" && q.starterCode && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded-md overflow-x-auto">
                          {q.starterCode}
                        </pre>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId === null ? "Add question" : "Edit question"}</DialogTitle>
            <DialogDescription>
              {form.type === "multiple_choice"
                ? "Auto-graded against the correct keys."
                : form.type === "coding"
                  ? "Coding answers can be auto-run against test cases via Judge0."
                  : "Free-text answers are graded by the LLM against the rubric."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as QType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coding">Coding</SelectItem>
                    <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                    <SelectItem value="short_answer">Short answer</SelectItem>
                    <SelectItem value="long_answer">Long answer</SelectItem>
                    <SelectItem value="system_design">System design</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Points</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Prompt *</Label>
              <Textarea
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                rows={4}
                placeholder="Describe the task or question clearly."
              />
            </div>

            {form.type === "coding" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Language</Label>
                  <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="typescript">TypeScript</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="go">Go</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                      <SelectItem value="sql">SQL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Starter code</Label>
                  <Textarea
                    value={form.starterCode}
                    onChange={(e) => setForm({ ...form, starterCode: e.target.value })}
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>
              </>
            )}

            {form.type === "multiple_choice" && (
              <div className="space-y-2">
                <Label className="text-xs">Choices (mark correct ones)</Label>
                {form.choices.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={c.key}
                      onChange={(e) => {
                        const next = form.choices.slice();
                        next[idx] = { ...c, key: e.target.value.toUpperCase() };
                        setForm({ ...form, choices: next });
                      }}
                      className="w-16 font-mono"
                      maxLength={4}
                    />
                    <Input
                      value={c.label}
                      onChange={(e) => {
                        const next = form.choices.slice();
                        next[idx] = { ...c, label: e.target.value };
                        setForm({ ...form, choices: next });
                      }}
                      placeholder="Choice text"
                    />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={form.correctChoiceKeys.includes(c.key)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...form.correctChoiceKeys, c.key]))
                            : form.correctChoiceKeys.filter((k) => k !== c.key);
                          setForm({ ...form, correctChoiceKeys: next });
                        }}
                      />
                      correct
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setForm({
                          ...form,
                          choices: form.choices.filter((_, j) => j !== idx),
                          correctChoiceKeys: form.correctChoiceKeys.filter((k) => k !== c.key),
                        });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextKey = String.fromCharCode("A".charCodeAt(0) + form.choices.length);
                    setForm({
                      ...form,
                      choices: [...form.choices, { key: nextKey, label: "" }],
                    });
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add choice
                </Button>
              </div>
            )}

            {form.type !== "multiple_choice" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Rubric (for LLM grading)</Label>
                <Textarea
                  value={form.rubric}
                  onChange={(e) => setForm({ ...form, rubric: e.target.value })}
                  rows={3}
                  placeholder="What does an excellent / passing / failing answer look like?"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Time limit (seconds, optional)</Label>
              <Input
                type="number"
                min={0}
                value={form.timeLimitSeconds}
                onChange={(e) => setForm({ ...form, timeLimitSeconds: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={addMut.isPending || updateMut.isPending}>
              {editingId === null ? "Add question" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
