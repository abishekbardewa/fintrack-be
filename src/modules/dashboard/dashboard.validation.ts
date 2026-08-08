import { z } from 'zod';

export const dashboardPeriod = {
	Month: 'month',
	Year: 'year',
} as const;

export const getDashboardQuerySchema = z.object({
	period: z.enum([dashboardPeriod.Month, dashboardPeriod.Year]),
});

export type GetDashboardQuery = z.infer<typeof getDashboardQuerySchema>;
