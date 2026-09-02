/**
 * AI Interview Service
 * ----------------------------------------------------------------------
 * State machine for `ai_interview_sessions`. Each session is bound to a
 * single assessment attempt (the template category is `ai_interview`).
 *
 * Flow:
 *   1. `start(attemptId)` — create session, ask LLM for an opener, log
 *      turn 0 (role=interviewer).
 *   2. `nextTurn(sessionId, candidateMessage)` — append candidate's
 *      reply, ask LLM for a follow-up using the conversation history,
 *      append the interviewer turn, bump currentTurn.
 *   3. `finish(sessionId)` — ask LLM for a summary (strengths,
 *      weaknesses, score 0-100), persist on the session row, mark
 *      attempt graded.
 *
 * The model is resolved from the LLM provider config: prefer Anthropic
 * Claude (Sonnet) when configured, else the built-in default. This
 * mirrors the rest of the talent-platform AI surface.
 */

import { publication } from "../../../../shared/publication";
import { invokeLLMProvider, getLLMProviderConfigs } from "../../../services/ai/llmProvider.service";
import * as repo from "../repositories/interview.repository";
import * as attemptsRepo from "../repositories/attempts.repository";
import * as templatesRepo from "../repositories/templates.repository";
import { toDbDate } from "../../../_core/dbValues";
import {
  AttemptNotFoundError,
  InterviewSessionDTO,
  InterviewSessionNotFoundError,
  InterviewTurnDTO,
  TemplateNotFoundError,
} from "../types";

const SYSTEM_PROMPT_TEMPLATE = `You are an experienced technical interviewer running a structured screen for a software engineering role on behalf of ${publication.name}'s Talent Platform.

Style:
- Conversational and warm, but rigorous. Probe for depth, not breadth.
- Ask one question at a time. Keep questions concise (under 80 words).
- When the candidate answers, ask a focused follow-up before moving on. Aim for two follow-ups per topic before pivoting.
- Cover: (1) problem-solving and reasoning, (2) hands-on coding/system knowledge relevant to the role, (3) collaboration & communication.

Scoring rubric (use this at the end, when asked to summarize):
- Technical depth (0-40)
- Communication clarity (0-30)
- Problem-solving approach (0-30)
- Total score 0-100. Pass threshold is 60.

When the interview is complete, you will be asked for a summary in JSON form:
{ "strengths": [...], "weaknesses": [...], "score": <number>, "recommendation": "hire" | "no_hire" | "borderline" }

Begin the interview now. Open with a short greeting and your first question.`;

function pickDefaultModel(configs: Awaited<ReturnType<typeof getLLMProviderConfigs>>): {
  provider: string;
  model: string;
} {
  // Prefer Anthropic, then OpenAI, else builtin.
  const anthro = configs.find((c) => c.provider === "anthropic" && c.isActive && c.apiKey);
  if (anthro) return { provider: "anthropic", model: "claude-sonnet-4-20250514" };
  const openai = configs.find((c) => c.provider === "openai" && c.isActive && c.apiKey);
  if (openai) return { provider: "openai", model: "gpt-4o" };
  return { provider: "builtin", model: "builtin-default" };
}

function sessionRowToDto(row: any): InterviewSessionDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    attemptId: row.attemptId,
    candidateId: row.candidateId,
    templateId: row.templateId,
    provider: row.provider,
    model: row.model,
    systemPrompt: row.systemPrompt,
    currentTurn: row.currentTurn,
    totalTurns: row.totalTurns,
    status: row.status,
    summary: row.summary,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function turnRowToDto(row: any): InterviewTurnDTO {
  return {
    id: row.id,
    sessionId: row.sessionId,
    turnIndex: row.turnIndex,
    role: row.role,
    content: row.content,
    tokenCount: row.tokenCount,
    createdAt: row.createdAt,
  };
}

export class AIInterviewService {
  async start(attemptId: number): Promise<InterviewSessionDTO> {
    const attempt = await attemptsRepo.findById(attemptId);
    if (!attempt) throw new AttemptNotFoundError(attemptId);
    const template = await templatesRepo.findById(attempt.templateId);
    if (!template) throw new TemplateNotFoundError(attempt.templateId);

    const existing = await repo.findByAttemptId(attemptId);
    if (existing) return sessionRowToDto(existing);

    const configs = await getLLMProviderConfigs();
    const { provider, model } = pickDefaultModel(configs);
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE;

    const sessionId = await repo.insertSession({
      tenantId: attempt.tenantId,
      attemptId,
      candidateId: attempt.candidateId,
      templateId: attempt.templateId,
      provider,
      model,
      systemPrompt,
      currentTurn: 0,
      totalTurns: 0,
      status: "active",
      startedAt: toDbDate(new Date()),
    });

    // Initial interviewer turn — ask LLM for an opener.
    const opener = await invokeLLMProvider({
      provider: provider as any,
      model,
      operation: "ai_interview_opener",
      temperature: 0.6,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Begin the interview for template "${template.name}" (category: ${template.category}). Output only your opening message — no preamble.`,
        },
      ],
    }).catch((err) => {
      console.error("[AIInterview] opener failed:", err);
      return null;
    });

    const openerText =
      opener?.content?.trim() ||
      "Hi! Thanks for taking the time today. To start, could you walk me through a project you're proud of and the toughest engineering decision you had to make on it?";

    await repo.appendTurn(sessionId, "interviewer", openerText, opener?.outputTokens);
    await repo.updateSession(sessionId, { currentTurn: 1, totalTurns: 1 });

    const refreshed = await repo.findById(sessionId);
    return sessionRowToDto(refreshed);
  }

  async nextTurn(sessionId: number, candidateMessage: string): Promise<InterviewTurnDTO> {
    const session = await repo.findById(sessionId);
    if (!session) throw new InterviewSessionNotFoundError(sessionId);
    if (session.status !== "active") {
      throw new Error(`Interview session not active (status=${session.status})`);
    }

    const turns = await repo.listTurns(sessionId);
    await repo.appendTurn(sessionId, "candidate", candidateMessage);

    const history = turns.map((t: any) => ({
      role: t.role === "interviewer" ? "assistant" : ("user" as const),
      content: t.content,
    }));

    const response = await invokeLLMProvider({
      provider: (session.provider || "builtin") as any,
      model: session.model || undefined,
      operation: "ai_interview_turn",
      temperature: 0.55,
      messages: [
        { role: "system", content: session.systemPrompt || SYSTEM_PROMPT_TEMPLATE },
        ...(history as any),
        { role: "user", content: candidateMessage },
      ],
    }).catch((err) => {
      console.error("[AIInterview] nextTurn failed:", err);
      return null;
    });

    const interviewerText =
      response?.content?.trim() ||
      "Thanks for that. Can you go one level deeper on the trade-offs you considered?";

    await repo.appendTurn(sessionId, "interviewer", interviewerText, response?.outputTokens);
    const newTurnCount = session.totalTurns + 2;
    await repo.updateSession(sessionId, {
      currentTurn: newTurnCount,
      totalTurns: newTurnCount,
    });

    const updated = await repo.listTurns(sessionId);
    return turnRowToDto(updated[updated.length - 1]);
  }

  async finish(sessionId: number): Promise<InterviewSessionDTO> {
    const session = await repo.findById(sessionId);
    if (!session) throw new InterviewSessionNotFoundError(sessionId);
    const turns = await repo.listTurns(sessionId);

    const history = turns.map((t: any) => ({
      role: t.role === "interviewer" ? "assistant" : ("user" as const),
      content: t.content,
    }));

    const summaryResp = await invokeLLMProvider({
      provider: (session.provider || "builtin") as any,
      model: session.model || undefined,
      operation: "ai_interview_summary",
      temperature: 0.2,
      messages: [
        { role: "system", content: session.systemPrompt || SYSTEM_PROMPT_TEMPLATE },
        ...(history as any),
        {
          role: "user",
          content:
            'The interview is complete. Output ONLY a JSON object with keys: strengths (array of strings), weaknesses (array of strings), score (integer 0-100), recommendation ("hire" | "no_hire" | "borderline"). No prose.',
        },
      ],
    }).catch((err) => {
      console.error("[AIInterview] summary failed:", err);
      return null;
    });

    const summaryText =
      summaryResp?.content?.trim() ||
      '{"strengths":[],"weaknesses":[],"score":0,"recommendation":"borderline"}';

    let parsedScore = 0;
    try {
      // Tolerate fenced code blocks
      const cleaned = summaryText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      parsedScore = Math.max(0, Math.min(100, Math.round(parsed.score ?? 0)));
    } catch {
      // Leave score at 0; manual review will be needed.
    }

    await repo.updateSession(sessionId, {
      summary: summaryText,
      status: "completed",
      completedAt: toDbDate(new Date()),
    });

    // Mark the attempt as graded with the AI interview score.
    await attemptsRepo.setStatus(session.attemptId, "graded", {
      submittedAt:
        (await attemptsRepo.findById(session.attemptId))?.submittedAt ||
        new Date().toISOString().slice(0, 19).replace("T", " "),
    });
    await attemptsRepo.setScore(session.attemptId, parsedScore, parsedScore >= 60);

    const refreshed = await repo.findById(sessionId);
    return sessionRowToDto(refreshed);
  }

  async getByAttempt(attemptId: number): Promise<InterviewSessionDTO | null> {
    const row = await repo.findByAttemptId(attemptId);
    return row ? sessionRowToDto(row) : null;
  }

  async listTurns(sessionId: number): Promise<InterviewTurnDTO[]> {
    const rows = await repo.listTurns(sessionId);
    return rows.map(turnRowToDto);
  }
}

export const aiInterviewService = new AIInterviewService();
