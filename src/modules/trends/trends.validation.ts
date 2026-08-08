import { z } from 'zod';
import { limits } from '../../config/limits.js';

export const trendsRange = {
	Last6: 'last6',
	Last12: 'last12',
	Year: 'year',
	LastYear: 'lastYear',
	Last2y: 'last2y',
	Last5y: 'last5y',
} as const;

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const getTrendsQuerySchema = z.object({
	range: z.enum([
		trendsRange.Last6,
		trendsRange.Last12,
		trendsRange.Year,
		trendsRange.LastYear,
		trendsRange.Last2y,
		trendsRange.Last5y,
	]),
	categoryIds: z
		.string()
		.trim()
		.optional()
		.transform((value) => {
			if (!value) {
				return [] as string[];
			}
			return value
				.split(',')
				.map((id) => id.trim())
				.filter(Boolean);
		})
		.refine((ids) => ids.length <= limits.trendsMaxCategoryIds, {
			message: `At most ${limits.trendsMaxCategoryIds} category ids are allowed`,
		})
		.refine((ids) => ids.every((id) => objectIdSchema.safeParse(id).success), {
			message: 'Invalid category id',
		}),
});

export type GetTrendsQuery = z.infer<typeof getTrendsQuerySchema>;
