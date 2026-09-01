/**
 * Media Service
 * Handles file uploads to S3-compatible storage with local fallback
 */

import { eq, desc, like, and } from "drizzle-orm";
import { getDb } from "../db";
import { media } from "../../drizzle/schema";
import { storagePut, storageGet } from "../storage";
import { nanoid } from "nanoid";

// ============================================================
// TYPES
// ============================================================

export interface UploadInput {
  file: Buffer;
  filename: string;
  mimeType: string;
  uploadedById?: number;
  folder?: string;
  alt?: string;
  caption?: string;
  credit?: string;
  sourceUrl?: string;
  license?: string;
  rightsStatus?: "owned" | "licensed" | "editorial_use" | "generated" | "pending_review";
  rightsNotes?: string;
}

export interface MediaItem {
  id: number;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  folder: string | null;
  credit: string | null;
  sourceUrl: string | null;
  license: string | null;
  rightsStatus: "owned" | "licensed" | "editorial_use" | "generated" | "pending_review";
  rightsNotes: string | null;
  createdAt: string;
}

export interface MediaListFilters {
  folder?: string;
  mimeType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// MEDIA SERVICE CLASS
// ============================================================

export class MediaService {
  /**
   * Upload a file to storage
   */
  async upload(input: UploadInput): Promise<MediaItem> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Generate unique filename
    const ext = input.filename.split(".").pop() || "";
    const uniqueFilename = `${nanoid()}.${ext}`;
    const folder = input.folder || "/";
    const s3Key = `media${folder === "/" ? "" : folder}/${uniqueFilename}`;

    // Upload to S3
    const { url } = await storagePut(s3Key, input.file, input.mimeType);

    // Get image dimensions if applicable
    let width: number | null = null;
    let height: number | null = null;
    
    if (input.mimeType.startsWith("image/")) {
      const dimensions = await this.getImageDimensions(input.file);
      width = dimensions.width;
      height = dimensions.height;
    }

    // Save to database
    await db.insert(media).values({
      filename: uniqueFilename,
      originalFilename: input.filename,
      mimeType: input.mimeType,
      size: input.file.length,
      url,
      s3Key,
      alt: input.alt,
      caption: input.caption,
      width,
      height,
      uploadedById: input.uploadedById,
      folder,
      credit: input.credit,
      sourceUrl: input.sourceUrl,
      license: input.license,
      rightsStatus: input.rightsStatus || "pending_review",
      rightsNotes: input.rightsNotes,
    } as any);

    // Get the inserted record
    const inserted = await db.select()
      .from(media)
      .where(eq(media.filename, uniqueFilename))
      .limit(1);

    return this.mapToMediaItem(inserted[0]);
  }

  /**
   * Get a media item by ID
   */
  async getById(id: number): Promise<MediaItem | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    return result[0] ? this.mapToMediaItem(result[0]) : null;
  }

  /**
   * List media items with filters
   */
  async list(filters: MediaListFilters): Promise<{
    items: MediaItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = db.select().from(media);

    // Apply filters
    const conditions = [];
    if (filters.folder) {
      conditions.push(eq(media.folder, filters.folder));
    }
    if (filters.mimeType) {
      conditions.push(like(media.mimeType, `${filters.mimeType}%`));
    }
    if (filters.search) {
      conditions.push(like(media.originalFilename, `%${filters.search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const allItems = await query.orderBy(desc(media.createdAt));
    const total = allItems.length;
    const paginatedItems = allItems.slice(offset, offset + limit);

    return {
      items: paginatedItems.map(this.mapToMediaItem),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update media metadata
   */
  async update(id: number, data: { alt?: string; caption?: string; folder?: string }): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(media)
      .set(data as any)
      .where(eq(media.id, id));
  }

  /**
   * Delete a media item
   */
  async delete(id: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Note: We don't delete from S3 to prevent broken links
    // In production, you might want to implement soft delete or scheduled cleanup
    await db.delete(media).where(eq(media.id, id));
  }

  /**
   * Get folders list
   */
  async getFolders(): Promise<string[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.selectDistinct({ folder: media.folder }).from(media);
    return result.map(r => r.folder || "/").filter((v, i, a) => a.indexOf(v) === i);
  }

  /**
   * Create a folder
   */
  async createFolder(path: string): Promise<void> {
    // Folders are virtual - they're created when files are uploaded to them
    // This method is a no-op but kept for API consistency
  }

  /**
   * Get presigned URL for direct upload (for large files)
   */
  async getUploadUrl(filename: string, mimeType: string, folder?: string): Promise<{
    uploadUrl: string;
    key: string;
  }> {
    const ext = filename.split(".").pop() || "";
    const uniqueFilename = `${nanoid()}.${ext}`;
    const folderPath = folder || "/";
    const s3Key = `media${folderPath === "/" ? "" : folderPath}/${uniqueFilename}`;

    // Get presigned URL for upload
    const { url } = await storageGet(s3Key); // Get presigned URL

    return {
      uploadUrl: url,
      key: s3Key
    };
  }

  /**
   * Confirm upload after direct upload
   */
  async confirmUpload(
    s3Key: string,
    originalFilename: string,
    mimeType: string,
    size: number,
    uploadedById?: number
  ): Promise<MediaItem> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const filename = s3Key.split("/").pop() || s3Key;
    const folder = s3Key.replace(`media`, "").replace(`/${filename}`, "") || "/";
    
    // Get the URL
    const { url } = await storageGet(s3Key);

    await db.insert(media).values({
      filename,
      originalFilename,
      mimeType,
      size,
      url,
      s3Key,
      folder,
      uploadedById
    } as any);

    const inserted = await db.select()
      .from(media)
      .where(eq(media.s3Key, s3Key))
      .limit(1);

    return this.mapToMediaItem(inserted[0]);
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private mapToMediaItem(record: typeof media.$inferSelect): MediaItem {
    return {
      id: record.id,
      filename: record.filename,
      originalFilename: record.originalFilename,
      mimeType: record.mimeType,
      size: record.size,
      url: record.url,
      alt: record.alt,
      caption: record.caption,
      width: record.width,
      height: record.height,
      folder: record.folder,
      credit: record.credit,
      sourceUrl: record.sourceUrl,
      license: record.license,
      rightsStatus: record.rightsStatus,
      rightsNotes: record.rightsNotes,
      createdAt: record.createdAt
    };
  }

  private async getImageDimensions(buffer: Buffer): Promise<{ width: number | null; height: number | null }> {
    // Simple dimension extraction for common formats
    // In production, use a library like sharp or image-size
    try {
      // PNG
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
      
      // JPEG
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        let offset = 2;
        while (offset < buffer.length) {
          if (buffer[offset] !== 0xff) break;
          const marker = buffer[offset + 1];
          if (marker === 0xc0 || marker === 0xc2) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
          }
          const length = buffer.readUInt16BE(offset + 2);
          offset += 2 + length;
        }
      }

      // GIF
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        const width = buffer.readUInt16LE(6);
        const height = buffer.readUInt16LE(8);
        return { width, height };
      }
    } catch {
      // Ignore errors
    }

    return { width: null, height: null };
  }
}

// Export singleton instance
export const mediaService = new MediaService();
