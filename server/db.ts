import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema";
import type { InsertUser } from "../drizzle/schema";
import { ENV } from './_core/env';
import { toDbDate } from "./_core/dbValues";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = toDbDate(new Date());
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = toDbDate(new Date());
    }

    await db.insert(users).values(values as any).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

/**
 * Bump lastSignedIn for an existing user. Plain UPDATE — the
 * INSERT...ON DUPLICATE KEY path in upsertUser fails under MySQL
 * strict mode when NOT NULL columns have no defaults, which made
 * every authenticated request throw right after login.
 */
export async function touchLastSignedIn(openId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ lastSignedIn: toDbDate(new Date()) } as any)
    .where(eq(users.openId, openId));
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, hashedPassword: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update password: database not available");
    return false;
  }

  await db.update(users).set({ password: hashedPassword } as any).where(eq(users.id, userId));
  return true;
}

export async function createUser(user: InsertUser): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create user: database not available");
    return null;
  }

  try {
    const result = await db.insert(users).values({
      openId: user.openId,
      email: user.email,
      password: user.password,
      name: user.name,
      loginMethod: user.loginMethod || "email",
      role: user.role || "user",
      lastSignedIn: new Date(),
    } as any);
    
    return result[0].insertId;
  } catch (error) {
    console.error("[Database] Failed to create user:", error);
    return null;
  }
}

// TODO: add feature queries here as your schema grows.
