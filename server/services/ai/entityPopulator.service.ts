/**
 * Entity Populator Service
 * Creates and updates entities (companies, people, investors, funding rounds, etc.)
 * from AI-extracted data with full detail population across all related tables
 */
import { getDb } from "../../db";
import {
  companies, people, investors, fundingRounds, fundingRoundInvestors,
  accelerators, events, tags, articleCompanies, articlePeople,
  articleInvestors, articleAccelerators, articleEvents, articleTags,
  aiEntityExtractions, aiEntityAliases,
} from "../../../drizzle/schema";
import { eq, like, and, or, sql } from "drizzle-orm";
import { toDbDate } from "../../_core/dbValues";

// ============================================================
// TYPES
// ============================================================

export interface EntityPopulationResult {
  created: EntityResult[];
  updated: EntityResult[];
  linked: EntityResult[];
  skipped: EntityResult[];
  errors: EntityResult[];
}

export interface EntityResult {
  type: string;
  name: string;
  id?: number;
  action: "created" | "updated" | "linked" | "skipped" | "error";
  reason?: string;
}

export interface EntityPopulationOptions {
  createNew: boolean;         // Create entities that don't exist
  updateExisting: boolean;    // Update existing entities with new data
  linkToArticle: boolean;     // Link entities to the article
  articleId?: number;
  sessionId: number;
  userId: number;
  autoApprove?: boolean;      // Auto-approve new entities (vs draft status)
}

// ============================================================
// MAIN POPULATION FUNCTION
// ============================================================

export async function populateEntities(
  sessionId: number,
  options: EntityPopulationOptions
): Promise<EntityPopulationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: EntityPopulationResult = {
    created: [], updated: [], linked: [], skipped: [], errors: [],
  };

  // Get all extractions for this session
  const extractions = await db.select().from(aiEntityExtractions)
    .where(eq(aiEntityExtractions.sessionId, sessionId));

  for (const extraction of extractions) {
    try {
      const entityType = extraction.entityType;
      const data = extraction.extractedData as any;
      const existingId = extraction.matchedEntityId;

      if (entityType === "funding_round") {
        // Funding rounds are handled separately
        await handleFundingRound(data, options, result, db);
        continue;
      }

      if (existingId && options.updateExisting) {
        // Update existing entity with new data
        await updateExistingEntity(entityType, existingId, data, db);
        result.updated.push({ type: entityType, name: extraction.extractedName, id: existingId, action: "updated" });

        if (options.linkToArticle && options.articleId) {
          await linkEntityToArticle(entityType, existingId, options.articleId, extraction.mentionType || "mentioned", db);
          result.linked.push({ type: entityType, name: extraction.extractedName, id: existingId, action: "linked" });
        }
      } else if (existingId && !options.updateExisting) {
        // Just link existing entity
        if (options.linkToArticle && options.articleId) {
          await linkEntityToArticle(entityType, existingId, options.articleId, extraction.mentionType || "mentioned", db);
          result.linked.push({ type: entityType, name: extraction.extractedName, id: existingId, action: "linked" });
        } else {
          result.skipped.push({ type: entityType, name: extraction.extractedName, id: existingId, action: "skipped", reason: "Already exists" });
        }
      } else if (!existingId && options.createNew) {
        // Create new entity
        const newId = await createNewEntity(entityType, data, options.userId, options.autoApprove, db);
        if (newId) {
          result.created.push({ type: entityType, name: extraction.extractedName, id: newId, action: "created" });

          // Update the extraction record with the new entity ID
          await db.update(aiEntityExtractions).set({
            matchedEntityId: newId,
            matchStatus: "existing",
          } as any).where(eq(aiEntityExtractions.id, extraction.id));

          // Register alias for future matching
          await registerAlias(entityType, extraction.extractedName, newId, db);

          if (options.linkToArticle && options.articleId) {
            await linkEntityToArticle(entityType, newId, options.articleId, extraction.mentionType || "mentioned", db);
            result.linked.push({ type: entityType, name: extraction.extractedName, id: newId, action: "linked" });
          }
        }
      } else {
        result.skipped.push({ type: entityType, name: extraction.extractedName, action: "skipped", reason: "No match and createNew=false" });
      }
    } catch (err: any) {
      result.errors.push({
        type: extraction.entityType,
        name: extraction.extractedName,
        action: "error",
        reason: err.message,
      });
    }
  }

  return result;
}

// ============================================================
// CREATE NEW ENTITIES
// ============================================================

async function createNewEntity(
  type: string,
  data: any,
  userId: number,
  autoApprove: boolean | undefined,
  db: any
): Promise<number | null> {
  const { slugService } = await import("../slug.service");
  const { workflowService } = await import("../workflow.service");

  switch (type) {
    case "company": {
      const slug = await slugService.generateUniqueSlug("company", slugService.generateSlug(data.name));
      const workflowType = autoApprove ? null : "company";
      let statusId = 1;
      if (!autoApprove) {
        const status = await workflowService.getInitialStatus("company");
        if (status) statusId = status.id;
      } else {
        // Get published status
        const status = await workflowService.getStatusBySlug("company", "published");
        if (status) statusId = status.id;
      }

      const [result] = await db.insert(companies).values({
        name: data.name,
        slug,
        tagline: data.tagline || null,
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        website: data.website || null,
        linkedIn: data.linkedIn || null,
        twitter: data.twitter || null,
        industry: data.industry || null,
        location: data.location || null,
        foundedYear: data.foundedYear || null,
        employeeCount: data.employeeCount || null,
        stage: data.stage || null,
        mission: data.mission || null,
        email: data.email || null,
        phone: data.phone || null,
        statusId,
        createdByUserId: userId,
      } as any);
      return result.insertId;
    }

    case "person": {
      const slug = await slugService.generateUniqueSlug("person", slugService.generateSlug(data.name));
      let statusId = 1;
      if (!autoApprove) {
        const status = await workflowService.getInitialStatus("person");
        if (status) statusId = status.id;
      } else {
        const status = await workflowService.getStatusBySlug("person", "published");
        if (status) statusId = status.id;
      }

      const [result] = await db.insert(people).values({
        name: data.name,
        slug,
        title: data.title || null,
        company: data.company || null,
        bio: data.bio || null,
        shortBio: data.shortBio || null,
        linkedIn: data.linkedIn || null,
        twitter: data.twitter || null,
        website: data.website || null,
        email: data.email || null,
        location: data.location || null,
        statusId,
        createdByUserId: userId,
      } as any);
      return result.insertId;
    }

    case "investor": {
      const slug = await slugService.generateUniqueSlug("investor", slugService.generateSlug(data.name));
      let statusId = 1;
      if (!autoApprove) {
        const status = await workflowService.getInitialStatus("investor");
        if (status) statusId = status.id;
      } else {
        const status = await workflowService.getStatusBySlug("investor", "published");
        if (status) statusId = status.id;
      }

      const [result] = await db.insert(investors).values({
        name: data.name,
        slug,
        type: mapInvestorType(data.type) || "vc",
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        website: data.website || null,
        linkedIn: data.linkedIn || null,
        twitter: data.twitter || null,
        email: data.email || null,
        headquarters: data.headquarters || null,
        foundedYear: data.foundedYear || null,
        statusId,
        createdByUserId: userId,
      } as any);
      return result.insertId;
    }

    case "accelerator": {
      const slug = slugService.generateSlug(data.name);
      const [result] = await db.insert(accelerators).values({
        name: data.name,
        slug,
        description: data.description || null,
        website: data.website || null,
        location: data.location || null,
        statusId: 1,
      } as any);
      return result.insertId;
    }

    case "event": {
      const slug = await slugService.generateUniqueSlug("event", slugService.generateSlug(data.name || data.title));
      const [result] = await db.insert(events).values({
        title: data.name || data.title,
        slug,
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        type: data.type || "conference",
        format: data.format || "in_person",
        startDate: toDbDate(data.startDate || new Date()),
        venue: data.venue || null,
        city: data.city || null,
        statusId: 1,
      } as any);
      return result.insertId;
    }

    default:
      return null;
  }
}

// ============================================================
// UPDATE EXISTING ENTITIES
// ============================================================

async function updateExistingEntity(type: string, entityId: number, data: any, db: any): Promise<void> {
  // Only update fields that have new non-null values and the existing field is empty
  switch (type) {
    case "company": {
      const [existing] = await db.select().from(companies).where(eq(companies.id, entityId));
      if (!existing) return;

      const updates: Record<string, any> = {};
      if (data.tagline && !existing.tagline) updates.tagline = data.tagline;
      if (data.description && !existing.description) updates.description = data.description;
      if (data.shortDescription && !existing.shortDescription) updates.shortDescription = data.shortDescription;
      if (data.website && !existing.website) updates.website = data.website;
      if (data.linkedIn && !existing.linkedIn) updates.linkedIn = data.linkedIn;
      if (data.twitter && !existing.twitter) updates.twitter = data.twitter;
      if (data.industry && !existing.industry) updates.industry = data.industry;
      if (data.location && !existing.location) updates.location = data.location;
      if (data.foundedYear && !existing.foundedYear) updates.foundedYear = data.foundedYear;
      if (data.employeeCount && !existing.employeeCount) updates.employeeCount = data.employeeCount;
      if (data.stage && !existing.stage) updates.stage = data.stage;
      if (data.mission && !existing.mission) updates.mission = data.mission;

      if (Object.keys(updates).length > 0) {
        await db.update(companies).set(updates as any).where(eq(companies.id, entityId));
      }
      break;
    }

    case "person": {
      const [existing] = await db.select().from(people).where(eq(people.id, entityId));
      if (!existing) return;

      const updates: Record<string, any> = {};
      if (data.title && !existing.title) updates.title = data.title;
      if (data.company && !existing.company) updates.company = data.company;
      if (data.bio && !existing.bio) updates.bio = data.bio;
      if (data.shortBio && !existing.shortBio) updates.shortBio = data.shortBio;
      if (data.linkedIn && !existing.linkedIn) updates.linkedIn = data.linkedIn;
      if (data.twitter && !existing.twitter) updates.twitter = data.twitter;
      if (data.website && !existing.website) updates.website = data.website;
      if (data.location && !existing.location) updates.location = data.location;

      if (Object.keys(updates).length > 0) {
        await db.update(people).set(updates as any).where(eq(people.id, entityId));
      }
      break;
    }

    case "investor": {
      const [existing] = await db.select().from(investors).where(eq(investors.id, entityId));
      if (!existing) return;

      const updates: Record<string, any> = {};
      if (data.description && !existing.description) updates.description = data.description;
      if (data.shortDescription && !existing.shortDescription) updates.shortDescription = data.shortDescription;
      if (data.website && !existing.website) updates.website = data.website;
      if (data.linkedIn && !existing.linkedIn) updates.linkedIn = data.linkedIn;
      if (data.headquarters && !existing.headquarters) updates.headquarters = data.headquarters;
      if (data.foundedYear && !existing.foundedYear) updates.foundedYear = data.foundedYear;

      if (Object.keys(updates).length > 0) {
        await db.update(investors).set(updates as any).where(eq(investors.id, entityId));
      }
      break;
    }
  }
}

// ============================================================
// FUNDING ROUND HANDLING
// ============================================================

async function handleFundingRound(
  data: any,
  options: EntityPopulationOptions,
  result: EntityPopulationResult,
  db: any
): Promise<void> {
  if (!data.companyName) {
    result.skipped.push({ type: "funding_round", name: "Unknown", action: "skipped", reason: "No company name" });
    return;
  }

  // Find or create the company
  let companyId: number | null = null;
  const companyMatch = await db.select({ id: companies.id })
    .from(companies)
    .where(like(companies.name, `%${data.companyName}%`))
    .limit(1);

  if (companyMatch.length > 0) {
    companyId = companyMatch[0].id;
  } else if (options.createNew) {
    const { slugService } = await import("../slug.service");
    const slug = await slugService.generateUniqueSlug("company", slugService.generateSlug(data.companyName));
    const [newCompany] = await db.insert(companies).values({
      name: data.companyName,
      slug,
      statusId: 1,
      createdByUserId: options.userId,
    } as any);
    companyId = newCompany.insertId;
    result.created.push({ type: "company", name: data.companyName, id: companyId!, action: "created" });
  }

  if (!companyId) {
    result.skipped.push({ type: "funding_round", name: `${data.companyName} - ${data.roundType}`, action: "skipped", reason: "Company not found" });
    return;
  }

  // Create funding round
  const roundType = mapRoundType(data.roundType);
  const [roundResult] = await db.insert(fundingRounds).values({
    companyId,
    articleId: options.articleId || null,
    roundType,
    amountRaised: data.amount ? parseFloat(data.amount) : null,
    currency: data.currency || "USD",
    isUndisclosed: data.amount ? 0 : 1,
    fundingDate: toDbDate(data.date || new Date()),
    status: "pending",
  } as any);
  const roundId = roundResult.insertId;

  result.created.push({
    type: "funding_round",
    name: `${data.companyName} - ${roundType} ($${data.amount || "undisclosed"})`,
    id: roundId,
    action: "created",
  });

  // Link investors to the funding round
  if (data.leadInvestor) {
    await linkInvestorToRound(data.leadInvestor, roundId, true, options, result, db);
  }
  if (data.participants?.length) {
    for (const participant of data.participants) {
      await linkInvestorToRound(participant, roundId, false, options, result, db);
    }
  }

  // Update company total funding if amount is known
  if (data.amount) {
    const [company] = await db.select({ totalFunding: companies.totalFunding }).from(companies).where(eq(companies.id, companyId));
    const currentFunding = parseFloat(company?.totalFunding || "0") || 0;
    const newTotal = currentFunding + parseFloat(data.amount);
    await db.update(companies).set({
      totalFunding: `$${(newTotal / 1000000).toFixed(1)}M`,
      hasFundingEvent: 1,
    } as any).where(eq(companies.id, companyId));
  }
}

async function linkInvestorToRound(
  investorName: string,
  roundId: number,
  isLead: boolean,
  options: EntityPopulationOptions,
  result: EntityPopulationResult,
  db: any
): Promise<void> {
  // Find or create investor
  let investorId: number | null = null;
  const match = await db.select({ id: investors.id })
    .from(investors)
    .where(like(investors.name, `%${investorName}%`))
    .limit(1);

  if (match.length > 0) {
    investorId = match[0].id;
  } else if (options.createNew) {
    const { slugService } = await import("../slug.service");
    const slug = await slugService.generateUniqueSlug("investor", slugService.generateSlug(investorName));
    const [newInvestor] = await db.insert(investors).values({
      name: investorName,
      slug,
      type: "vc",
      statusId: 1,
      createdByUserId: options.userId,
    } as any);
    investorId = newInvestor.insertId;
    result.created.push({ type: "investor", name: investorName, id: investorId!, action: "created" });
  }

  if (investorId) {
    try {
      await db.insert(fundingRoundInvestors).values({
        fundingRoundId: roundId,
        investorId,
        isLead: isLead ? 1 : 0,
      } as any);
    } catch {
      // Duplicate key - already linked
    }

    // If lead investor, update the funding round
    if (isLead) {
      await db.update(fundingRounds).set({ leadInvestorId: investorId } as any).where(eq(fundingRounds.id, roundId));
    }
  }
}

// ============================================================
// ENTITY LINKING
// ============================================================

async function linkEntityToArticle(
  type: string,
  entityId: number,
  articleId: number,
  mentionType: string,
  db: any
): Promise<void> {
  try {
    switch (type) {
      case "company":
        await db.insert(articleCompanies).values({
          articleId, companyId: entityId, mentionType: mentionType || "mentioned",
        } as any).onDuplicateKeyUpdate({ set: { mentionType: mentionType || "mentioned" } });
        break;
      case "person":
        await db.insert(articlePeople).values({
          articleId, personId: entityId, mentionType: mentionType || "mentioned",
        } as any).onDuplicateKeyUpdate({ set: { mentionType: mentionType || "mentioned" } });
        break;
      case "investor":
        await db.insert(articleInvestors).values({
          articleId, investorId: entityId, mentionType: mentionType || "mentioned",
        } as any).onDuplicateKeyUpdate({ set: { mentionType: mentionType || "mentioned" } });
        break;
      case "accelerator":
        await db.insert(articleAccelerators).values({
          articleId, acceleratorId: entityId,
        } as any).onDuplicateKeyUpdate({ set: { acceleratorId: entityId } });
        break;
      case "event":
        await db.insert(articleEvents).values({
          articleId, eventId: entityId,
        } as any).onDuplicateKeyUpdate({ set: { eventId: entityId } });
        break;
    }
  } catch (err) {
    console.error(`[EntityPopulator] Failed to link ${type} ${entityId} to article ${articleId}:`, err);
  }
}

// ============================================================
// ALIAS MANAGEMENT
// ============================================================

async function registerAlias(type: string, name: string, entityId: number, db: any): Promise<void> {
  try {
    await db.insert(aiEntityAliases).values({
      entityType: type,
      alias: name.trim().toLowerCase(),
      entityId: entityId,
    } as any);
  } catch {
    // Duplicate alias - ignore
  }
}

export async function findByAlias(type: string, name: string, db: any): Promise<number | null> {
  try {
    const [match] = await db.select({ entityId: aiEntityAliases.entityId })
      .from(aiEntityAliases)
      .where(and(
        eq(aiEntityAliases.entityType, type),
        eq(aiEntityAliases.alias, name.trim().toLowerCase())
      ));
    return match?.entityId || null;
  } catch {
    return null;
  }
}

// ============================================================
// HELPERS
// ============================================================

function mapRoundType(raw: string): any {
  const mapping: Record<string, string> = {
    "pre-seed": "pre_seed", "pre_seed": "pre_seed", "preseed": "pre_seed",
    "seed": "seed",
    "series a": "series_a", "series_a": "series_a", "seriesa": "series_a",
    "series b": "series_b", "series_b": "series_b", "seriesb": "series_b",
    "series c": "series_c", "series_c": "series_c", "seriesc": "series_c",
    "series d": "series_d_plus", "series_d_plus": "series_d_plus", "series d+": "series_d_plus",
    "bridge": "bridge",
    "strategic": "strategic",
    "venture debt": "venture_debt", "venture_debt": "venture_debt",
    "grant": "grant",
  };
  return mapping[raw?.toLowerCase()] || "undisclosed";
}

function mapInvestorType(raw: string): any {
  const mapping: Record<string, string> = {
    "vc": "vc", "venture capital": "vc",
    "angel": "angel", "angel investor": "angel",
    "corporate vc": "corporate_vc", "corporate_vc": "corporate_vc", "cvc": "corporate_vc",
    "family office": "family_office", "family_office": "family_office",
    "accelerator": "accelerator",
  };
  return mapping[raw?.toLowerCase()] || "other";
}
