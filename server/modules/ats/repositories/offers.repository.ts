/**
 * Offers Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `offers`. Status transitions are encoded
 * here as simple writes — the service layer enforces the legal
 * transition graph (drafted -> sent -> {accepted, declined, expired}, etc.).
 */

import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { offers } from "../../../../drizzle/schema";
import type { OfferStatus } from "../types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function findById(id: number) {
  const d = await db();
  const rows = await d.select().from(offers).where(eq(offers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findByApplication(applicationId: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(offers)
    .where(eq(offers.applicationId, applicationId))
    .orderBy(desc(offers.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function insert(values: Record<string, unknown>): Promise<{ insertId: number }> {
  const d = await db();
  const [result] = (await d.insert(offers).values(values as any)) as any;
  return result;
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(offers).set(values as any).where(eq(offers.id, id));
}

export async function transitionStatus(
  id: number,
  newStatus: OfferStatus,
  reason?: string,
): Promise<void> {
  const d = await db();
  const values: Record<string, unknown> = { status: newStatus };
  if (newStatus === "accepted" || newStatus === "declined") {
    values.respondedAt = new Date().toISOString();
  }
  if (newStatus === "declined" && reason) {
    values.declineReason = reason;
  }
  await d.update(offers).set(values as any).where(eq(offers.id, id));
}
