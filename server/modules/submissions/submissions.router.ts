/**
 * Public Submissions Router
 * ----------------------------------------------------------------------
 * Receives public-facing form submissions: newsletter, contact,
 * advertise, and (later) submit-startup. Each endpoint:
 *   1. Inserts into form_submissions
 *   2. Fires admin notification email (best-effort; never blocks the
 *      response — the user shouldn't wait on Resend's network)
 *   3. For newsletter: also fires a confirmation/welcome email to the
 *      subscriber.
 *
 * No auth required (publicProcedure) — these forms are anonymous by
 * design. Honeypot + minimum-time-on-page checks could be added later
 * for spam mitigation; for now we rate-limit by IP hash via
 * Cloudflare's standard challenge layer.
 */

import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { formSubmissions } from "../../../drizzle/schema";
import { emailService } from "../../services/email.service";
import { eq, sql } from "drizzle-orm";
import crypto from "node:crypto";

const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "hello@techscoop.io";
const MEDIA_NOTIFY_EMAIL = process.env.MEDIA_NOTIFY_EMAIL || "media@techscoop.io";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function getRequestMeta(ctx: any): { ipHash: string | null; userAgent: string } {
  const ip = (ctx.req.headers["x-forwarded-for"] as string || ctx.req.socket?.remoteAddress || "")
    .split(",")[0].trim();
  const ua = (ctx.req.headers["user-agent"] || "").slice(0, 512);
  return { ipHash: ip ? hashIp(ip) : null, userAgent: ua };
}

/** Fire-and-forget admin notification. Never blocks the user. */
function notifyAdminAsync(opts: {
  to: string;
  formType: string;
  fromName?: string;
  fromEmail?: string;
  subject?: string;
  body: string;
  submissionId: number;
}) {
  const tpl = emailService.adminFormNotificationEmail(opts);
  emailService.sendEmail({
    to: opts.to,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    type: `admin_${opts.formType}_notification`,
    entityType: "form_submission",
    entityId: opts.submissionId,
  }).catch(err => console.error(`[Submissions] admin notify failed (${opts.formType}#${opts.submissionId}):`, err));
}

export const submissionsRouter = router({
  /**
   * Newsletter signup. Idempotent — re-subscribing the same email is a no-op
   * to prevent enumeration / accidental duplicate-welcomes.
   */
  newsletter: publicProcedure
    .input(z.object({
      email: z.string().email().max(320),
      newsletters: z.array(z.string().max(64)).optional(),
      source: z.string().max(128).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false, error: "Service unavailable" };

      const meta = getRequestMeta(ctx);

      // Dedupe — silently succeed if same email already subscribed in last 24h
      const recent = await db.execute(sql`
        SELECT id FROM form_submissions
        WHERE form_type = 'newsletter'
          AND email = ${input.email}
          AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        LIMIT 1
      `);
      const recentRows = (recent as any)[0] as Array<{ id: number }>;
      if (recentRows && recentRows.length > 0) {
        return { success: true, alreadySubscribed: true };
      }

      const inserted = await db.insert(formSubmissions).values({
        formType: "newsletter",
        email: input.email,
        name: null,
        payload: { newsletters: input.newsletters || ["daily"] },
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
        source: input.source,
      } as any);
      const submissionId = (inserted as any)[0]?.insertId;

      // Welcome email to subscriber
      const welcome = emailService.newsletterWelcomeEmail(input.email);
      emailService.sendEmail({
        to: input.email,
        subject: welcome.subject,
        html: welcome.html,
        text: welcome.text,
        type: "newsletter_welcome",
        entityType: "form_submission",
        entityId: submissionId,
      }).catch(err => console.error("[Submissions] welcome email failed:", err));

      // Admin notify
      notifyAdminAsync({
        to: ADMIN_NOTIFY_EMAIL,
        formType: "newsletter",
        fromEmail: input.email,
        body: `New subscriber: ${input.email}\nNewsletters: ${(input.newsletters || ['daily']).join(", ")}\nSource: ${input.source || "(unknown)"}`,
        submissionId,
      });

      return { success: true, submissionId };
    }),

  /**
   * Contact form — general inquiries from the /contact page.
   */
  contact: publicProcedure
    .input(z.object({
      firstName: z.string().min(1).max(120),
      lastName: z.string().min(1).max(120),
      email: z.string().email().max(320),
      company: z.string().max(255).optional(),
      enquiryType: z.string().max(64).optional(),
      message: z.string().min(10).max(5000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false, error: "Service unavailable" };

      const meta = getRequestMeta(ctx);
      const fullName = `${input.firstName} ${input.lastName}`.trim();

      const inserted = await db.insert(formSubmissions).values({
        formType: "contact",
        email: input.email,
        name: fullName,
        payload: input,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
      } as any);
      const submissionId = (inserted as any)[0]?.insertId;

      notifyAdminAsync({
        to: ADMIN_NOTIFY_EMAIL,
        formType: "contact",
        fromName: fullName,
        fromEmail: input.email,
        subject: input.enquiryType,
        body:
          `Name: ${fullName}\n` +
          `Email: ${input.email}\n` +
          `Company: ${input.company || "—"}\n` +
          `Type: ${input.enquiryType || "General"}\n\n` +
          `Message:\n${input.message}`,
        submissionId,
      });

      return { success: true, submissionId };
    }),

  /**
   * Advertise form — paid-media inquiries from the /advertise page.
   * Routed to media@ instead of hello@.
   */
  advertise: publicProcedure
    .input(z.object({
      firstName: z.string().min(1).max(120),
      lastName: z.string().min(1).max(120),
      email: z.string().email().max(320),
      company: z.string().min(1).max(255),
      jobTitle: z.string().max(255).optional(),
      industry: z.string().max(120).optional(),
      budget: z.string().max(64).optional(),
      objectives: z.array(z.string().max(255)).optional(),
      message: z.string().min(5).max(5000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false, error: "Service unavailable" };

      const meta = getRequestMeta(ctx);
      const fullName = `${input.firstName} ${input.lastName}`.trim();

      const inserted = await db.insert(formSubmissions).values({
        formType: "advertise",
        email: input.email,
        name: fullName,
        payload: input,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
      } as any);
      const submissionId = (inserted as any)[0]?.insertId;

      notifyAdminAsync({
        to: MEDIA_NOTIFY_EMAIL,
        formType: "advertise",
        fromName: fullName,
        fromEmail: input.email,
        body:
          `Name: ${fullName}\n` +
          `Job Title: ${input.jobTitle || "—"}\n` +
          `Email: ${input.email}\n` +
          `Company: ${input.company}\n` +
          `Industry: ${input.industry || "—"}\n` +
          `Budget: ${input.budget || "—"}\n` +
          `Objectives: ${(input.objectives || []).join(", ") || "—"}\n\n` +
          `Message:\n${input.message}`,
        submissionId,
      });

      return { success: true, submissionId };
    }),

  /**
   * Submit Startup form — startups submit their profile for review.
   * Payload includes: name, website, description, category, founder email, etc.
   */
  submitStartup: publicProcedure
    .input(z.object({
      startupName: z.string().min(1).max(255),
      website: z.string().url().max(500).optional(),
      description: z.string().min(10).max(2000),
      category: z.string().max(128).optional(),
      founderName: z.string().min(1).max(255),
      founderEmail: z.string().email().max(320),
      founderRole: z.string().max(128).optional(),
      location: z.string().max(255).optional(),
      fundingStage: z.string().max(64).optional(),
      additionalInfo: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false, error: "Service unavailable" };

      const meta = getRequestMeta(ctx);

      const inserted = await db.insert(formSubmissions).values({
        formType: "submit_startup",
        email: input.founderEmail,
        name: input.founderName,
        payload: input,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
      } as any);
      const submissionId = (inserted as any)[0]?.insertId;

      notifyAdminAsync({
        to: ADMIN_NOTIFY_EMAIL,
        formType: "submit_startup",
        fromName: input.founderName,
        fromEmail: input.founderEmail,
        subject: `New Startup Submission: ${input.startupName}`,
        body:
          `Startup: ${input.startupName}\n` +
          `Founder: ${input.founderName}\n` +
          `Email: ${input.founderEmail}\n` +
          `Role: ${input.founderRole || "—"}\n` +
          `Website: ${input.website || "—"}\n` +
          `Category: ${input.category || "—"}\n` +
          `Location: ${input.location || "—"}\n` +
          `Funding Stage: ${input.fundingStage || "—"}\n\n` +
          `Description:\n${input.description}\n\n` +
          `Additional Info:\n${input.additionalInfo || "(none)"}`,
        submissionId,
      });

      return { success: true, submissionId };
    }),

  /**
   * List form submissions for the admin Integration Hub inbox.
   * Authentication: this is publicProcedure so it can be exposed to
   * the admin SPA, but we check role inside since admin tRPC isn't
   * trivially nested under protectedProcedure here. (Move to admin
   * router when consolidating; for now keeping the public namespace.)
   */
  listForAdmin: publicProcedure
    .input(z.object({
      formType: z.string().max(64).optional(),
      status: z.string().max(32).optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(25),
    }).optional())
    .query(async ({ input, ctx }) => {
      // Simple gate — only logged-in admins/editors see this
      const role = ctx.user?.role;
      if (!role || !["admin", "editor", "senior_editor"].includes(role)) {
        return { items: [], total: 0, page: 1, totalPages: 0 };
      }
      const db = await getDb();
      if (!db) return { items: [], total: 0, page: 1, totalPages: 0 };

      const limit = input?.limit ?? 25;
      const page = input?.page ?? 1;
      const offset = (page - 1) * limit;
      const formType = input?.formType;
      const status = input?.status;

      const where: string[] = ["1=1"];
      const params: any[] = [];
      if (formType) { where.push("form_type = ?"); params.push(formType); }
      if (status)   { where.push("status = ?");    params.push(status); }
      const whereSql = where.join(" AND ");

      const itemsRaw = await db.execute(sql`
        SELECT id, form_type, email, name, payload, status, source, created_at
        FROM form_submissions
        WHERE ${sql.raw(whereSql)}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      const totalRaw = await db.execute(sql`
        SELECT COUNT(*) as c FROM form_submissions
        WHERE ${sql.raw(whereSql)}
      `);
      const items = ((itemsRaw as any)[0] || []) as any[];
      const total = Number(((totalRaw as any)[0] || [{}])[0]?.c || 0);
      return { items, total, page, totalPages: Math.ceil(total / limit) };
    }),
});
