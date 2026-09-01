/**
 * Recruiter Notes Repository
 * ----------------------------------------------------------------------
 * Raw Drizzle queries for `recruiter_notes`. Visibility filtering is
 * the service layer's job — the repository returns rows; the service
 * decides who can see them.
 */

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { recruiterNotes } from "../../../../drizzle/schema";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function findById(id: number) {
  const d = await db();
  const rows = await d
    .select()
    .from(recruiterNotes)
    .where(eq(recruiterNotes.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * List notes targeting a job application. `requesterRole` is only
 * accepted for symmetry with the service signature — the service
 * filters by visibility before returning to clients.
 */
export async function listForApplication(applicationId: number, _requesterRole?: string) {
  const d = await db();
  return d
    .select()
    .from(recruiterNotes)
    .where(eq(recruiterNotes.applicationId, applicationId))
    .orderBy(desc(recruiterNotes.createdAt));
}

export async function listForCandidate(candidateId: number, _requesterRole?: string) {
  const d = await db();
  return d
    .select()
    .from(recruiterNotes)
    .where(eq(recruiterNotes.candidateId, candidateId))
    .orderBy(desc(recruiterNotes.createdAt));
}

export async function insert(values: Record<string, unknown>): Promise<{ insertId: number }> {
  const d = await db();
  const [result] = (await d.insert(recruiterNotes).values(values as any)) as any;
  return result;
}

export async function update(id: number, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;
  const d = await db();
  await d.update(recruiterNotes).set(values as any).where(eq(recruiterNotes.id, id));
}

export async function deleteById(id: number): Promise<void> {
  const d = await db();
  await d.delete(recruiterNotes).where(eq(recruiterNotes.id, id));
}
