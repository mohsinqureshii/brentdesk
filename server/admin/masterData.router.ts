/**
 * Master Data Router - Countries & Cities CRUD
 */
import { z } from "zod";
import { eq, asc, like, and, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { countries, cities } from "../../drizzle/schema";

export const masterDataRouter = router({
  // ============================================================
  // COUNTRIES
  // ============================================================

  listCountries: protectedProcedure
    .input(z.object({ search: z.string().optional(), includeInactive: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input?.search) {
        conditions.push(sql`LOWER(${countries.name}) LIKE LOWER(${`%${input.search}%`})`);
      }
      if (!input?.includeInactive) {
        conditions.push(eq(countries.isActive, 1));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const result = await db.select().from(countries).where(whereClause).orderBy(asc(countries.name));

      // Get city counts for each country
      const cityCounts = await db
        .select({ countryId: cities.countryId, count: sql<number>`COUNT(*)` })
        .from(cities)
        .groupBy(cities.countryId);

      const cityCountMap = new Map(cityCounts.map(c => [c.countryId, Number(c.count)]));

      return result.map(c => ({
        ...c,
        cityCount: cityCountMap.get(c.id) || 0,
      }));
    }),

  createCountry: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      iso2: z.string().max(2).optional(),
      iso3: z.string().max(3).optional(),
      dialCode: z.string().optional(),
      currency: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin"].includes(ctx.user.role)) throw new Error("Unauthorized");

      const [result] = await db.insert(countries).values({
        name: input.name,
        iso2: (input.iso2 || "").toUpperCase(),
        iso3: (input.iso3 || "").toUpperCase(),
        dialCode: input.dialCode || null,
        currency: input.currency || null,
        isActive: 1,
      } as any);
      return { id: result.insertId };
    }),

  updateCountry: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      iso2: z.string().max(2).optional(),
      iso3: z.string().max(3).optional(),
      dialCode: z.string().optional(),
      currency: z.string().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin"].includes(ctx.user.role)) throw new Error("Unauthorized");

      const { id, ...data } = input;
      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.iso2 !== undefined) updateData.iso2 = data.iso2.toUpperCase();
      if (data.iso3 !== undefined) updateData.iso3 = data.iso3.toUpperCase();
      if (data.dialCode !== undefined) updateData.dialCode = data.dialCode;
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      await db.update(countries).set(updateData as any).where(eq(countries.id, id));
      return { success: true };
    }),

  deleteCountry: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin"].includes(ctx.user.role)) throw new Error("Unauthorized");

      const cityCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(cities).where(eq(cities.countryId, input.id));
      if (Number(cityCount[0]?.count) > 0) {
        throw new Error("Cannot delete country with cities. Remove cities first or deactivate the country.");
      }

      await db.delete(countries).where(eq(countries.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // CITIES
  // ============================================================

  listCities: protectedProcedure
    .input(z.object({
      countryId: z.number().optional(),
      search: z.string().optional(),
      includeInactive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input?.countryId) {
        conditions.push(eq(cities.countryId, input.countryId));
      }
      if (input?.search) {
        conditions.push(sql`LOWER(${cities.name}) LIKE LOWER(${`%${input.search}%`})`);
      }
      if (!input?.includeInactive) {
        conditions.push(eq(cities.isActive, 1));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const result = await db.select({
        id: cities.id,
        name: cities.name,
        countryId: cities.countryId,
        countryName: countries.name,
        latitude: cities.latitude,
        longitude: cities.longitude,
        isActive: cities.isActive,
      })
        .from(cities)
        .leftJoin(countries, eq(cities.countryId, countries.id))
        .where(whereClause)
        .orderBy(asc(cities.name));

      return result;
    }),

  createCity: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      countryId: z.number(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin"].includes(ctx.user.role)) throw new Error("Unauthorized");

      const [result] = await db.insert(cities).values({
        name: input.name,
        countryId: input.countryId,
        latitude: input.latitude?.toString() || null,
        longitude: input.longitude?.toString() || null,
        isActive: 1,
      } as any);
      return { id: result.insertId };
    }),

  updateCity: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      countryId: z.number().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin"].includes(ctx.user.role)) throw new Error("Unauthorized");

      const { id, ...data } = input;
      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.countryId !== undefined) updateData.countryId = data.countryId;
      if (data.latitude !== undefined) updateData.latitude = data.latitude.toString();
      if (data.longitude !== undefined) updateData.longitude = data.longitude.toString();
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      await db.update(cities).set(updateData as any).where(eq(cities.id, id));
      return { success: true };
    }),

  deleteCity: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!["admin"].includes(ctx.user.role)) throw new Error("Unauthorized");

      await db.delete(cities).where(eq(cities.id, input.id));
      return { success: true };
    }),
});
