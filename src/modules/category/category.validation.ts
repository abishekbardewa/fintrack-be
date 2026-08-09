import { z } from 'zod';
import { CategoryKind } from '../../config/enums.js';

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const listCategoriesQuerySchema = z.object({
	kind: z.enum([CategoryKind.Expense, CategoryKind.Income]).optional(),
});

export const createCategoryBodySchema = z.object({
	name: z.string().trim().min(1).max(50),
	kind: z.enum([CategoryKind.Expense, CategoryKind.Income]),
	parentCategoryId: objectIdSchema.nullish(),
});

export const updateCategoryBodySchema = z.object({
	name: z.string().trim().min(1).max(50),
});

export const categoryIdParamsSchema = z.object({
	id: objectIdSchema,
});

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;
