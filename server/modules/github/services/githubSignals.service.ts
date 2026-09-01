/**
 * GitHub Signals Service
 * ----------------------------------------------------------------------
 * Derives the seven Phase-4 engineering signals from the `github_repos`
 * rollups. Each computation is a pure function over the persisted repo
 * set; the orchestrator writes one new row per signal type per run.
 *
 * Signal types (matches `github_signals.signal_type` enum):
 *   - language_distribution: aggregated bytes per language
 *   - contribution_cadence:  recent commit volume + cadence bucket
 *   - project_velocity:      recent push activity across repos
 *   - collaboration:         simple score from forks/stars/issues
 *   - tech_stack:            top languages + most-frequent topics
 *   - open_source_impact:    stars/forks across original repos
 *   - ai_summary:            LLM-generated 2-3 sentence summary
 */

import * as reposRepo from "../repositories/githubRepos.repository";
import * as signalsRepo from "../repositories/githubSignals.repository";
import * as profilesRepo from "../repositories/githubProfiles.repository";
import { invokeLLMProvider } from "../../../services/ai/llmProvider.service";
import {
  AiSummaryPayload,
  CadenceCategory,
  CollaborationPayload,
  ContributionCadencePayload,
  EngineeringSignals,
  GithubProfileNotFoundError,
  GithubSignalType,
  LanguageDistributionPayload,
  OpenSourceImpactPayload,
  ProjectVelocityPayload,
  TechStackPayload,
} from "../types";

type RepoRow = Awaited<ReturnType<typeof reposRepo.listForProfile>>[number];

// ------------------------------------------------------------
// Signal computations (pure)
// ------------------------------------------------------------

function computeLanguageDistribution(repos: RepoRow[]): LanguageDistributionPayload {
  const totals = new Map<string, number>();
  for (const r of repos) {
    const langs = (r.languages as Record<string, number> | null) || {};
    for (const [lang, bytes] of Object.entries(langs)) {
      totals.set(lang, (totals.get(lang) ?? 0) + Number(bytes || 0));
    }
  }
  const totalBytes = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  const languages = Array.from(totals.entries())
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);
  return { languages, totalBytes };
}

function bucketCadence(commits30d: number): CadenceCategory {
  if (commits30d <= 0) return "inactive";
  if (commits30d < 10) return "sparse";
  if (commits30d < 40) return "steady";
  return "high";
}

function computeContributionCadence(repos: RepoRow[]): ContributionCadencePayload {
  const recent30d = repos.reduce((sum, r) => sum + Number(r.commitCount30d ?? 0), 0);
  const reposActive30d = repos.filter((r) => Number(r.commitCount30d ?? 0) > 0).length;
  return {
    recent30d,
    reposActive30d,
    cadenceCategory: bucketCadence(recent30d),
  };
}

function computeProjectVelocity(repos: RepoRow[]): ProjectVelocityPayload {
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const reposPushed90d = repos.filter((r) => {
    if (!r.lastPushAt) return false;
    return new Date(r.lastPushAt).getTime() >= ninetyDaysAgo;
  }).length;
  const totalRepos = repos.length;
  return {
    reposPushed90d,
    totalRepos,
    velocityRatio: totalRepos > 0 ? Math.round((reposPushed90d / totalRepos) * 100) / 100 : 0,
  };
}

function computeCollaboration(repos: RepoRow[]): CollaborationPayload {
  let reposWithForks = 0;
  let reposWithStars = 0;
  let reposWithIssues = 0;
  for (const r of repos) {
    if (Number(r.forks ?? 0) > 0) reposWithForks++;
    if (Number(r.stars ?? 0) > 0) reposWithStars++;
    if (Number(r.openIssues ?? 0) > 0) reposWithIssues++;
  }
  // Simple weighted score, capped at 100.
  const score = Math.min(100, reposWithStars * 5 + reposWithForks * 3 + reposWithIssues * 2);
  return { reposWithForks, reposWithStars, reposWithIssues, collaborationScore: score };
}

function computeTechStack(repos: RepoRow[]): TechStackPayload {
  const langCount = new Map<string, number>();
  const topicCount = new Map<string, number>();
  for (const r of repos) {
    if (r.primaryLanguage) {
      langCount.set(r.primaryLanguage, (langCount.get(r.primaryLanguage) ?? 0) + 1);
    }
    const topics = (r.topics as string[] | null) || [];
    for (const t of topics) {
      const key = String(t).toLowerCase().trim();
      if (!key) continue;
      topicCount.set(key, (topicCount.get(key) ?? 0) + 1);
    }
  }
  const topLanguages = Array.from(langCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([l]) => l);
  const topics = Array.from(topicCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([topic, count]) => ({ topic, count }));
  return { topLanguages, topics };
}

function computeOpenSourceImpact(repos: RepoRow[]): OpenSourceImpactPayload {
  let totalStars = 0;
  let totalForks = 0;
  let originalRepos = 0;
  let forkRepos = 0;
  for (const r of repos) {
    const isFork = Number(r.isFork ?? 0) === 1;
    if (isFork) {
      forkRepos++;
    } else {
      originalRepos++;
      totalStars += Number(r.stars ?? 0);
      totalForks += Number(r.forks ?? 0);
    }
  }
  const total = originalRepos + forkRepos;
  const impactRatio = total > 0 ? Math.round((originalRepos / total) * 100) / 100 : 0;
  return { totalStars, totalForks, originalRepos, forkRepos, impactRatio };
}

// ------------------------------------------------------------
// AI summary — LLM-backed
// ------------------------------------------------------------

async function computeAiSummary(
  profile: { handle: string; bio: string | null; followers: number | null },
  repos: RepoRow[],
  derived: {
    language: LanguageDistributionPayload;
    cadence: ContributionCadencePayload;
    velocity: ProjectVelocityPayload;
    collab: CollaborationPayload;
    stack: TechStackPayload;
    impact: OpenSourceImpactPayload;
  },
): Promise<AiSummaryPayload> {
  const topRepos = [...repos]
    .sort((a, b) => Number(b.stars ?? 0) - Number(a.stars ?? 0))
    .slice(0, 5)
    .map((r) => `${r.name} (${r.primaryLanguage || "?"}, ${r.stars ?? 0}★)`)
    .join(", ");

  const prompt = `You are summarizing a software engineer's GitHub profile for a technical recruiter.
Return STRICT JSON: {"summary": string, "strengths": string[], "concerns": string[]}.
The summary must be 2-3 sentences. strengths/concerns are short bullet phrases (3-6 items each).

Profile:
- Handle: @${profile.handle}
- Bio: ${profile.bio || "(none)"}
- Followers: ${profile.followers ?? 0}
- Top languages: ${derived.stack.topLanguages.join(", ") || "(none)"}
- Top repos: ${topRepos || "(none)"}
- Cadence: ${derived.cadence.cadenceCategory} (${derived.cadence.recent30d} commits in 30d)
- Velocity: ${derived.velocity.reposPushed90d}/${derived.velocity.totalRepos} repos pushed in 90d
- Collaboration score: ${derived.collab.collaborationScore}
- Open-source impact: ${derived.impact.totalStars} stars across ${derived.impact.originalRepos} original repos`;

  try {
    const response = await invokeLLMProvider({
      messages: [
        {
          role: "system",
          content:
            "You are a senior engineering hiring manager. Be concise, factual, and avoid hype.",
        },
        { role: "user", content: prompt },
      ],
      responseFormat: { type: "json_object" },
      operation: "github.signals.ai_summary",
      temperature: 0.3,
    });

    const parsed = JSON.parse(response.content) as Partial<AiSummaryPayload>;
    return {
      summary: parsed.summary || "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 10) : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 10) : [],
    };
  } catch (err: any) {
    console.error("[GitHub] ai_summary failed:", err?.message || err);
    return {
      summary: `@${profile.handle}: ${derived.stack.topLanguages.slice(0, 3).join(", ")} engineer with ${derived.impact.totalStars} stars across ${derived.impact.originalRepos} original repos.`,
      strengths: [],
      concerns: ["LLM summary unavailable — using heuristic fallback."],
    };
  }
}

// ------------------------------------------------------------
// Orchestrator
// ------------------------------------------------------------

async function persistSignal<T>(
  profileId: number,
  signalType: GithubSignalType,
  payload: T,
  score: number | null = null,
): Promise<void> {
  await signalsRepo.insert({ profileId, signalType, payload, score });
}

export class GithubSignalsService {
  async computeAll(profileId: number): Promise<EngineeringSignals> {
    const profile = await profilesRepo.findById(profileId);
    if (!profile) throw new GithubProfileNotFoundError(profileId);
    const repos = await reposRepo.listForProfile(profileId, { limit: MAX_REPOS_FOR_COMPUTE });

    const language = computeLanguageDistribution(repos);
    await persistSignal(profileId, "language_distribution", language);

    const cadence = computeContributionCadence(repos);
    await persistSignal(profileId, "contribution_cadence", cadence, cadenceScore(cadence));

    const velocity = computeProjectVelocity(repos);
    await persistSignal(
      profileId,
      "project_velocity",
      velocity,
      Math.round(velocity.velocityRatio * 100),
    );

    const collab = computeCollaboration(repos);
    await persistSignal(profileId, "collaboration", collab, collab.collaborationScore);

    const stack = computeTechStack(repos);
    await persistSignal(profileId, "tech_stack", stack);

    const impact = computeOpenSourceImpact(repos);
    await persistSignal(profileId, "open_source_impact", impact, impact.totalStars);

    const aiSummary = await computeAiSummary(
      { handle: profile.handle, bio: profile.bio, followers: profile.followers },
      repos,
      { language, cadence, velocity, collab, stack, impact },
    );
    await persistSignal(profileId, "ai_summary", aiSummary);

    return {
      languageDistribution: language,
      contributionCadence: cadence,
      projectVelocity: velocity,
      collaboration: collab,
      techStack: stack,
      openSourceImpact: impact,
      aiSummary,
    };
  }

  /** Read the latest persisted signals as one snapshot. */
  async getLatestSnapshot(profileId: number): Promise<EngineeringSignals> {
    const types: GithubSignalType[] = [
      "language_distribution",
      "contribution_cadence",
      "project_velocity",
      "collaboration",
      "tech_stack",
      "open_source_impact",
      "ai_summary",
    ];
    const rows = await Promise.all(types.map((t) => signalsRepo.latestByType(profileId, t)));
    const get = <T>(idx: number) => (rows[idx] ? ((rows[idx] as any).payload as T) : null);
    return {
      languageDistribution: get<LanguageDistributionPayload>(0),
      contributionCadence: get<ContributionCadencePayload>(1),
      projectVelocity: get<ProjectVelocityPayload>(2),
      collaboration: get<CollaborationPayload>(3),
      techStack: get<TechStackPayload>(4),
      openSourceImpact: get<OpenSourceImpactPayload>(5),
      aiSummary: get<AiSummaryPayload>(6),
    };
  }
}

function cadenceScore(c: ContributionCadencePayload): number {
  switch (c.cadenceCategory) {
    case "high":
      return 100;
    case "steady":
      return 75;
    case "sparse":
      return 40;
    default:
      return 0;
  }
}

const MAX_REPOS_FOR_COMPUTE = 200;

export const githubSignalsService = new GithubSignalsService();
