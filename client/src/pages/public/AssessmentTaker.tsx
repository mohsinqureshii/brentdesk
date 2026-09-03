/**
 * Assessment Taker — public-facing (invite-token gated)
 * ----------------------------------------------------------------------
 * Candidate-facing assessment page. Authenticated by the invite token
 * in the URL, not by user session — so a candidate can pre-screen
 * even if they haven't signed up yet.
 *
 * Flow:
 *   1. Mount → call attempt.startByToken (idempotent)
 *   2. Render questions one at a time
 *   3. saveAnswer on each next/prev
 *   4. submit when the last question is done
 *   5. Show submission confirmation
 *
 * Backend procedures (all publicProcedure):
 *   assessments.attempt.startByToken
 *   assessments.answer.saveAnswer
 *   assessments.attempt.submit
 */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useT } from "@/lib/i18n";
import type { UiKey } from "@shared/uiStrings";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";

type Started = {
  attemptId: number;
  template: any;
  questions: any[];
};

export default function AssessmentTaker() {
  const t = useT();
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [started, setStarted] = useState<Started | null>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [index, setIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(Date.now());

  const startMut = trpc.assessments.attempt.startByToken.useMutation({
    onSuccess: (data: any) => {
      setStarted(data);
    },
    onError: (e) => toast.error(e.message),
  });

  const saveMut = trpc.assessments.attempt.saveAnswer.useMutation({
    // Silent — runs on each next/prev. Failed saves toast.
    onError: (e: { message: string }) =>
      toast.error(t("assessment.saveFailed") + ": " + e.message),
  });

  const submitMut = trpc.assessments.attempt.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (token && !started && !startMut.isPending) {
      startMut.mutate({ token });
    }
  }, [token, started, startMut]);

  const questions = started?.questions ?? [];
  const total = questions.length;
  const current = questions[index];

  const persistCurrent = async () => {
    if (!current || !started) return;
    const a = answers[current.id] ?? {};
    const timeSpentSeconds = Math.floor((Date.now() - startedAt) / 1000);
    try {
      await saveMut.mutateAsync({
        attemptId: started.attemptId,
        questionId: current.id,
        answerText: a.answerText,
        answerCode: a.answerCode,
        selectedChoiceKeys: a.selectedChoiceKeys,
        timeSpentSeconds,
        runCode: !!a.runCode,
      });
    } catch {
      // toast already shown by mutation onError
    }
  };

  const handleNext = async () => {
    await persistCurrent();
    if (index < total - 1) setIndex(index + 1);
  };

  const handlePrev = async () => {
    await persistCurrent();
    if (index > 0) setIndex(index - 1);
  };

  const handleSubmit = async () => {
    if (!started) return;
    if (!confirm(t("assessment.confirmSubmit"))) return;
    await persistCurrent();
    submitMut.mutate({ attemptId: started.attemptId });
  };

  if (!token) {
    return (
      <SimpleShell>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("assessment.missingToken")}
          </CardContent>
        </Card>
      </SimpleShell>
    );
  }

  if (startMut.isPending || (!started && !startMut.isError)) {
    return (
      <SimpleShell>
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">{t("assessment.loading")}</p>
          </CardContent>
        </Card>
      </SimpleShell>
    );
  }

  if (startMut.isError) {
    return (
      <SimpleShell>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-medium">{t("assessment.unavailable")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {startMut.error?.message ?? t("assessment.linkExpired")}
            </p>
          </CardContent>
        </Card>
      </SimpleShell>
    );
  }

  if (submitted) {
    return (
      <SimpleShell>
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <h2 className="text-2xl font-bold">{t("assessment.submitted")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("assessment.recorded")}
            </p>
          </CardContent>
        </Card>
      </SimpleShell>
    );
  }

  if (!started || !current) return null;

  const tmpl = started.template ?? {};

  return (
    <SimpleShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{tmpl.name ?? t("assessment.title")}</h1>
            {tmpl.description && (
              <p className="text-sm text-muted-foreground mt-1">{tmpl.description}</p>
            )}
          </div>
          <Badge variant="outline">
            {t("assessment.questionOf", { n: index + 1, total })}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-sm">
                {t("assessment.questionAbbrev")}{index + 1}.
              </span>
              <span>{current.prompt}</span>
            </CardTitle>
            <CardDescription>
              {QUESTION_TYPE_LABELS[current.type] ? t(QUESTION_TYPE_LABELS[current.type]) : current.type}
              {current.points && (
                <span className="ml-2 font-mono">· {current.points} {t("assessment.points")}</span>
              )}
              {current.timeLimitSeconds && (
                <span className="ml-2 font-mono">· {t("assessment.suggestedSeconds", { n: current.timeLimitSeconds })}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuestionInput
              question={current}
              value={answers[current.id] ?? {}}
              onChange={(v) =>
                setAnswers({ ...answers, [current.id]: { ...(answers[current.id] ?? {}), ...v } })
              }
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={index === 0 || saveMut.isPending}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> {t("list.previous")}
          </Button>
          <div className="text-xs text-muted-foreground">
            {saveMut.isPending ? t("common.saving") : t("assessment.autoSave")}
          </div>
          {index < total - 1 ? (
            <Button onClick={handleNext} disabled={saveMut.isPending}>
              {t("list.next")} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitMut.isPending}>
              {submitMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {t("assessment.submit")}
            </Button>
          )}
        </div>
      </div>
    </SimpleShell>
  );
}

const QUESTION_TYPE_LABELS: Record<string, UiKey> = {
  coding: "assessment.typeCoding",
  multiple_choice: "assessment.typeMultipleChoice",
  short_answer: "assessment.typeShortAnswer",
  long_answer: "assessment.typeLongAnswer",
  system_design: "assessment.typeSystemDesign",
  file_upload: "assessment.typeFileUpload",
};

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: any;
  value: any;
  onChange: (patch: any) => void;
}) {
  const t = useT();
  switch (question.type) {
    case "multiple_choice":
      return <MultipleChoiceInput question={question} value={value} onChange={onChange} />;
    case "coding":
      return <CodeInput question={question} value={value} onChange={onChange} />;
    case "short_answer":
      return (
        <Input
          value={value.answerText ?? ""}
          onChange={(e) => onChange({ answerText: e.target.value })}
          placeholder={t("assessment.yourAnswer")}
        />
      );
    case "long_answer":
    case "system_design":
      return (
        <Textarea
          value={value.answerText ?? ""}
          onChange={(e) => onChange({ answerText: e.target.value })}
          rows={8}
          placeholder={t("assessment.yourAnswerLong")}
        />
      );
    case "file_upload":
      return (
        <p className="text-sm text-muted-foreground">
          {t("assessment.fileUploadUnsupported")}
        </p>
      );
    default:
      return (
        <Textarea
          value={value.answerText ?? ""}
          onChange={(e) => onChange({ answerText: e.target.value })}
          rows={6}
        />
      );
  }
}

function MultipleChoiceInput({
  question,
  value,
  onChange,
}: {
  question: any;
  value: any;
  onChange: (patch: any) => void;
}) {
  const choices: Array<{ key: string; label: string }> = Array.isArray(question.choices)
    ? question.choices
    : [];
  const selected: string[] = value.selectedChoiceKeys ?? [];
  return (
    <div className="space-y-2">
      {choices.map((c) => (
        <label
          key={c.key}
          className="flex items-start gap-3 border rounded-md p-3 cursor-pointer hover:bg-muted/30"
        >
          <Checkbox
            checked={selected.includes(c.key)}
            onCheckedChange={(checked) => {
              const next = checked
                ? Array.from(new Set([...selected, c.key]))
                : selected.filter((k) => k !== c.key);
              onChange({ selectedChoiceKeys: next });
            }}
          />
          <span className="text-sm">
            <span className="font-mono text-muted-foreground mr-2">{c.key}.</span>
            {c.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function CodeInput({
  question,
  value,
  onChange,
}: {
  question: any;
  value: any;
  onChange: (patch: any) => void;
}) {
  const t = useT();
  const code = value.answerCode ?? question.starterCode ?? "";
  return (
    <div className="space-y-2">
      <Label className="text-xs">
        {t("assessment.language")}: <span className="font-mono">{question.language ?? t("assessment.anyLanguage")}</span>
      </Label>
      <Textarea
        value={code}
        onChange={(e) => onChange({ answerCode: e.target.value })}
        rows={16}
        spellCheck={false}
        className="font-mono text-sm"
        placeholder={t("assessment.codePlaceholder")}
      />
      <label className="flex items-center gap-2 text-xs">
        <Checkbox
          checked={!!value.runCode}
          onCheckedChange={(v) => onChange({ runCode: !!v })}
        />
        {t("assessment.runCode")}
      </label>
    </div>
  );
}

function SimpleShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="container max-w-3xl mx-auto py-8">{children}</div>
      <Footer />
    </>
  );
}
