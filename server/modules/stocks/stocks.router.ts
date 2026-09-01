/**
 * Stock Ticker Router
 * API endpoints for stock quotes and category management
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import {
  getStockCategories,
  saveStockCategories,
  getStockQuotes,
  getAllStockQuotes,
  clearStockCache,
  DEFAULT_STOCK_CATEGORIES,
  type StockCategory,
} from "../../services/stock.service";

export const stocksRouter = router({
  /**
   * Get stock categories
   */
  getCategories: publicProcedure.query(async () => {
    return await getStockCategories();
  }),

  /**
   * Get stock quotes for a specific category
   */
  getQuotes: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ input }) => {
      return await getStockQuotes(input.categoryId);
    }),

  /**
   * Get all stock quotes for all categories
   */
  getAllQuotes: publicProcedure.query(async () => {
    return await getAllStockQuotes();
  }),

  /**
   * Update stock categories (admin only)
   */
  updateCategories: protectedProcedure
    .input(
      z.object({
        categories: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            symbols: z.array(z.string()),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!["admin"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      await saveStockCategories(input.categories);
      clearStockCache();
      return { success: true };
    }),

  /**
   * Reset to default categories (admin only)
   */
  resetToDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    if (!["admin"].includes(ctx.user.role)) {
      throw new Error("Unauthorized");
    }

    await saveStockCategories(DEFAULT_STOCK_CATEGORIES);
    clearStockCache();
    return { success: true, categories: DEFAULT_STOCK_CATEGORIES };
  }),

  /**
   * Clear stock cache (admin only)
   */
  clearCache: protectedProcedure.mutation(async ({ ctx }) => {
    if (!["admin"].includes(ctx.user.role)) {
      throw new Error("Unauthorized");
    }

    clearStockCache();
    return { success: true };
  }),

  /**
   * Add a symbol to a category (admin only)
   */
  addSymbol: protectedProcedure
    .input(
      z.object({
        categoryId: z.string(),
        symbol: z.string().min(1).max(20),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!["admin"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const categories = await getStockCategories();
      const category = categories.find((c) => c.id === input.categoryId);
      if (!category) {
        throw new Error("Category not found");
      }

      if (!category.symbols.includes(input.symbol.toUpperCase())) {
        category.symbols.push(input.symbol.toUpperCase());
        await saveStockCategories(categories);
        clearStockCache();
      }

      return { success: true, category };
    }),

  /**
   * Remove a symbol from a category (admin only)
   */
  removeSymbol: protectedProcedure
    .input(
      z.object({
        categoryId: z.string(),
        symbol: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!["admin"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const categories = await getStockCategories();
      const category = categories.find((c) => c.id === input.categoryId);
      if (!category) {
        throw new Error("Category not found");
      }

      category.symbols = category.symbols.filter(
        (s) => s.toUpperCase() !== input.symbol.toUpperCase()
      );
      await saveStockCategories(categories);
      clearStockCache();

      return { success: true, category };
    }),
});
