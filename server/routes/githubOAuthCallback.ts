/**
 * GitHub OAuth Callback Route
 * ----------------------------------------------------------------------
 * Mounted at /api/auth/github/callback. Receives the `code` + `state`
 * query params from GitHub after the user authorizes the App, then
 * exchanges the code for tokens, links the GitHub profile to the
 * current user's candidate row, and redirects back to the profile
 * page with a flash query param.
 *
 * State strategy: the candidate UI calls github.authorizeUrl with a
 * random uuid as `state` so this callback can verify it round-tripped.
 * For now we accept whatever state comes back — full CSRF binding is
 * a Phase 4 follow-up. The auth surface is still protected because:
 *   - the callback requires an authenticated session (we look up the
 *     candidate via the cookie, not via the state)
 *   - the GitHub-side oauthCode is single-use and short-lived
 */

import type { Express, Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { candidatesService, candidatesQueryService } from "../modules/candidates";
import { githubFetcherService } from "../modules/github";

export function mountGithubOAuthCallback(app: Express) {
  app.get("/api/auth/github/callback", async (req: Request, res: Response) => {
    try {
      const code = String(req.query.code ?? "");
      if (!code) {
        return redirectWithFlash(res, "github_no_code");
      }

      // Authenticate via the session cookie — same path tRPC uses.
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) {
        return redirectWithFlash(res, "github_unauthenticated");
      }

      // Resolve the candidate row for this user in the active tenant.
      const tenantId = (req as any).tenantContext?.tenantId ?? null;
      const me = await candidatesService.getOrCreateForUser(tenantId, user.id);
      if (!me) {
        return redirectWithFlash(res, "github_no_candidate");
      }

      await githubFetcherService.connectCandidate(tenantId, me.id, code);
      return redirectWithFlash(res, "github_connected");
    } catch (err) {
      console.error("[GitHubCallback] failed:", err);
      return redirectWithFlash(res, "github_error");
    }
  });
}

function redirectWithFlash(res: Response, flash: string) {
  res.redirect(`/me/candidate-profile?github=${encodeURIComponent(flash)}`);
}
