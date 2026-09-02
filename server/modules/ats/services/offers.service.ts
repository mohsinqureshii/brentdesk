/**
 * Offers Service
 * ----------------------------------------------------------------------
 * Draft / send / accept / decline / withdraw flow for candidate
 * offers. State machine:
 *
 *   drafted ──send──▶ sent ──accept──▶ accepted (terminal)
 *                       │
 *                       ├──decline──▶ declined (terminal)
 *                       ├──withdraw─▶ withdrawn (terminal)
 *                       └──expire───▶ expired (terminal)
 *
 * `markAccepted` / `markDeclined` are intentionally caller-agnostic
 * (no recruiter gate) — they're the candidate's side of the flow and
 * are wired through the public application portal.
 */

import * as offersRepo from "../repositories/offers.repository";
import { jobApplicationsService, jobsService } from "../../jobs";
import { tenantsService } from "../../tenants";
import { logPii } from "../../compliance";
import { sendEmail } from "../../../services/email.service";
import * as offerSentTemplate from "../../../services/emailTemplates/offerSent";
import { DEFAULT_TENANT_NAME } from "../../../services/emailTemplates/_layout";
import { notifyOfferAccepted } from "../../../services/slackIntegration.service";
import { assertTenantScope, assertTenantSupported } from "../tenant.guard";
import { toDbDate } from "../../../_core/dbValues";
import {
  CreateOfferInput,
  ForbiddenError,
  OfferDTO,
  OfferNotFoundError,
  OfferStatus,
  RequesterContext,
  TenantScope,
} from "../types";

const RECRUITER_PLUS = new Set(["admin", "recruiter", "hiring_manager", "owner"]);

function gateRecruiter(requester: RequesterContext) {
  if (!RECRUITER_PLUS.has(requester.role)) {
    throw new ForbiddenError("Recruiter role required");
  }
}

function toDTO(row: any): OfferDTO {
  return {
    id: row.id,
    tenantId: row.tenantId ?? null,
    applicationId: row.applicationId,
    extendedById: row.extendedById,
    baseSalary: row.baseSalary ?? null,
    bonus: row.bonus ?? null,
    equity: row.equity ?? null,
    currency: row.currency ?? null,
    startDate: row.startDate ?? null,
    expiresAt: row.expiresAt ?? null,
    status: row.status as OfferStatus,
    letterBody: row.letterBody ?? null,
    declineReason: row.declineReason ?? null,
    respondedAt: row.respondedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function requireOffer(id: number, scope: TenantScope) {
  const row = await offersRepo.findById(id);
  if (!row) throw new OfferNotFoundError(id);
  assertTenantScope(row.tenantId ?? null, scope, "offers.findById");
  return row;
}

export class OffersService {
  async draft(
    scope: TenantScope,
    input: CreateOfferInput,
    requester: RequesterContext,
  ): Promise<OfferDTO> {
    assertTenantSupported(scope);
    gateRecruiter(requester);

    const app = await jobApplicationsService.findById(scope, input.applicationId);
    if (!app) throw new ForbiddenError("Application not found in tenant scope");

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "application",
      subjectId: input.applicationId,
      action: "update",
      ipAddress: undefined,
    });

    const result = await offersRepo.insert({
      tenantId: scope,
      applicationId: input.applicationId,
      extendedById: requester.userId,
      baseSalary: input.baseSalary ?? null,
      bonus: input.bonus ?? null,
      equity: input.equity ?? null,
      currency: input.currency ?? "USD",
      startDate: input.startDate ? input.startDate.toISOString().slice(0, 10) : null,
      expiresAt: input.expiresAt ? toDbDate(input.expiresAt) : null,
      status: "drafted",
      letterBody: input.letterBody ?? null,
    });
    const row = await offersRepo.findById(result.insertId);
    return toDTO(row);
  }

  async send(scope: TenantScope, id: number, requester: RequesterContext): Promise<OfferDTO> {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    const offer = await requireOffer(id, scope);
    if (offer.status !== "drafted") {
      throw new ForbiddenError(`Cannot send offer in status: ${offer.status}`);
    }

    await offersRepo.transitionStatus(id, "sent");

    await logPii({
      tenantId: scope,
      actorUserId: requester.userId,
      actorRole: requester.role,
      subjectType: "application",
      subjectId: offer.applicationId,
      action: "update",
      ipAddress: undefined,
    });

    const app = await jobApplicationsService.findById(scope, offer.applicationId);
    if (app && (app as any).applicantEmail) {
      try {
        const tenant = scope !== null ? await tenantsService.getById(scope) : null;
        const tenantName = tenant?.name || DEFAULT_TENANT_NAME;
        const startDate = offer.startDate ? new Date(offer.startDate) : null;
        const expiresAt = offer.expiresAt ? new Date(offer.expiresAt) : null;
        const { subject, html, text } = offerSentTemplate.build({
          tenantName,
          candidateName: (app as any).applicantName || "there",
          jobTitle: (app as any).jobTitle || "the role",
          baseSalary: (offer.baseSalary as number | string | null) ?? null,
          currency: offer.currency ?? null,
          startDate: startDate && !isNaN(startDate.getTime()) ? startDate : null,
          expiresAt: expiresAt && !isNaN(expiresAt.getTime()) ? expiresAt : null,
          letterBody: offer.letterBody ?? null,
        });
        await sendEmail({
          to: (app as any).applicantEmail,
          subject,
          html,
          text,
          entityType: "offer",
          entityId: id,
          type: "offer_sent",
        });
      } catch (err) {
        console.error("[ATS][Offers] send email failed:", err);
      }
    }
    const row = await offersRepo.findById(id);
    return toDTO(row);
  }

  /**
   * Candidate path — no recruiter gate. The portal that exposes this
   * is expected to have already authenticated the candidate against
   * the application.
   */
  async markAccepted(scope: TenantScope, id: number): Promise<OfferDTO> {
    assertTenantSupported(scope);
    const offer = await requireOffer(id, scope);
    if (offer.status !== "sent") {
      throw new ForbiddenError(`Cannot accept offer in status: ${offer.status}`);
    }
    await offersRepo.transitionStatus(id, "accepted");
    const row = await offersRepo.findById(id);

    // Fire-and-forget Slack notification. Failures must not block the
    // candidate's response. `notifyOfferAccepted` no-ops when Slack
    // isn't configured for this tenant.
    (async () => {
      try {
        const app = await jobApplicationsService.findById(scope, offer.applicationId);
        const job = app
          ? await jobsService.requireById(scope, (app as any).jobId).catch(() => null)
          : null;
        await notifyOfferAccepted(scope, {
          candidateName: (app as any)?.applicantName || "Candidate",
          jobTitle: (job as any)?.title || "Untitled job",
          startDate: (row as any)?.startDate ?? null,
        });
      } catch (err) {
        console.error("[Slack][offerAccepted] notify failed:", err);
      }
    })();

    return toDTO(row);
  }

  async markDeclined(scope: TenantScope, id: number, reason: string): Promise<OfferDTO> {
    assertTenantSupported(scope);
    const offer = await requireOffer(id, scope);
    if (offer.status !== "sent") {
      throw new ForbiddenError(`Cannot decline offer in status: ${offer.status}`);
    }
    await offersRepo.transitionStatus(id, "declined", reason);
    const row = await offersRepo.findById(id);
    return toDTO(row);
  }

  async withdraw(scope: TenantScope, id: number, requester: RequesterContext): Promise<OfferDTO> {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    const offer = await requireOffer(id, scope);
    if (offer.status === "accepted" || offer.status === "declined" || offer.status === "withdrawn") {
      throw new ForbiddenError(`Cannot withdraw offer in status: ${offer.status}`);
    }
    await offersRepo.transitionStatus(id, "withdrawn");
    const row = await offersRepo.findById(id);
    return toDTO(row);
  }

  async findForApplication(
    scope: TenantScope,
    applicationId: number,
    requester: RequesterContext,
  ): Promise<OfferDTO | null> {
    assertTenantSupported(scope);
    gateRecruiter(requester);
    const row = await offersRepo.findByApplication(applicationId);
    if (!row) return null;
    assertTenantScope(row.tenantId ?? null, scope, "offers.findByApplication");
    return toDTO(row);
  }
}

export const offersService = new OffersService();
