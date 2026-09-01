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
      toast.error("Couldn't save answer: " + e.message),
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
    if (!confirm("Submit your assessment? You can't change answers after this.")) return;
    await persistCurrent();
    submitMut.mutate({ attemptId: started.attemptId });
  };

  if (!token) {
    return (
      <SimpleShell>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Missing invite token. Use the link from the email we sent you.
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
            <p className="text-sm text-muted-foreground">Loading your assessment…</p>
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
            <p className="font-medium">This assessment isn't available.</p>
            <p className="text-sm text-muted-foreground mt-1">
              {startMut.error?.message ?? "The invite link may have expired or already been used."}
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
            <h2 className="text-2xl font-bold">Submitted!</h2>
            <p className="text-sm text-muted-foreground">
              Your assessment has been recorded. We'll let you know how you did via email.
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
            <h1 className="text-2xl font-bold tracking-tight">{tmpl.name ?? "Assessment"}</h1>
            {tmpl.description && (
              <p className="text-sm text-muted-foreground mt-1">{tmpl.description}</p>
            )}
          </div>
          <Badge variant="outline">
            Question {index + 1} of {total}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-sm">
                Q{index + 1}.
              </span>
              <span>{current.prompt}</span>
            </CardTitle>
            <CardDescription>
              {QUESTION_TYPE_LABELS[current.type] ?? current.type}
              {current.points && (
                <span className="ml-2 font-mono">· {current.points} pts</span>
              )}
              {current.timeLimitSeconds && (
                <span className="ml-2 font-mono">· {current.timeLimitSeconds}s suggested</span>
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
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="text-xs text-muted-foreground">
            {saveMut.isPending ? "Saving…" : "Answers auto-save as you move on."}
          </div>
          {index < total - 1 ? (
            <Button onClick={handleNext} disabled={saveMut.isPending}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitMut.isPending}>
              {submitMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit assessment
            </Button>
          )}
        </div>
      </div>
    </SimpleShell>
  );
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  coding: "Coding",
  multiple_choice: "Multiple choice",
  short_answer: "Short answer",
  long_answer: "Long answer",
  system_design: "System design",
  file_upload: "File upload",
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
          placeholder="Your answer"
        />
      );
    case "long_answer":
    case "system_design":
      return (
        <Textarea
          value={value.answerText ?? ""}
          onChange={(e) => onChange({ answerText: e.target.value })}
          rows={8}
          placeholder="Your answer — explain your thinking and trade-offs."
        />
      );
    case "file_upload":
      return (
        <p className="text-sm text-muted-foreground">
          File upload questions aren't supported in this version. Skip this and we'll grade manually.
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
  const code = value.answerCode ?? question.starterCode ?? "";
  return (
    <div className="space-y-2">
      <Label className="text-xs">
        Language: <span className="font-mono">{question.language ?? "any"}</span>
      </Label>
      <Textarea
        value={code}
        onChange={(e) => onChange({ answerCode: e.target.value })}
        rows={16}
        spellCheck={false}
        className="font-mono text-sm"
        placeholder="// Write your solution here"
      />
      <label className="flex items-center gap-2 text-xs">
        <Checkbox
          checked={!!value.runCode}
          onCheckedChange={(v) => onChange({ runCode: !!v })}
        />
        Run my code against the test cases on save (slower)
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
