import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from './zod.js';
import * as req from './requests.js';
import {
	authSuccessDataSchema,
	bearerSecurity,
	currencySchema,
	errorResponseSchema,
	healthDataSchema,
	jsonContent,
	publicBudgetSchema,
	publicCategorySchema,
	publicContributionSchema,
	publicSavingsGoalSchema,
	publicTransactionSchema,
	publicUserSchema,
	successResponseSchema,
	transactionListDataSchema,
	transactionMonthSummaryDataSchema,
	dashboardDataSchema,
	trendsDataSchema,
} from './schemas.js';

const errorResponses = {
	401: {
		description: 'Unauthorized',
		content: jsonContent(errorResponseSchema),
	},
	422: {
		description: 'Validation failed',
		content: jsonContent(errorResponseSchema),
	},
	404: {
		description: 'Not found',
		content: jsonContent(errorResponseSchema),
	},
};

export function registerPaths(registry: OpenAPIRegistry): void {
	registry.registerPath({
		method: 'get',
		path: '/health',
		tags: ['Health'],
		summary: 'Health check',
		responses: {
			200: {
				description: 'Service is healthy',
				content: jsonContent(successResponseSchema(healthDataSchema, 'HealthResponse')),
			},
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/auth/create-account',
		tags: ['Auth'],
		summary: 'Create account',
		request: {
			body: { required: true, content: jsonContent(req.registerBodySchema) },
		},
		responses: {
			201: {
				description: 'Account created',
				content: jsonContent(successResponseSchema(authSuccessDataSchema, 'RegisterResponse')),
			},
			409: {
				description: 'Email already registered',
				content: jsonContent(errorResponseSchema),
			},
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/auth/login',
		tags: ['Auth'],
		summary: 'Login',
		request: {
			body: { required: true, content: jsonContent(req.loginBodySchema) },
		},
		responses: {
			200: {
				description: 'Login successful',
				content: jsonContent(successResponseSchema(authSuccessDataSchema, 'LoginResponse')),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/me',
		tags: ['User'],
		summary: 'Get current user',
		security: bearerSecurity,
		responses: {
			200: {
				description: 'Current user',
				content: jsonContent(
					successResponseSchema(z.object({ user: publicUserSchema }), 'GetMeResponse'),
				),
			},
			401: errorResponses[401],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/me',
		tags: ['User'],
		summary: 'Update profile',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.updateMeBodySchema) },
		},
		responses: {
			200: {
				description: 'Updated user',
				content: jsonContent(
					successResponseSchema(z.object({ user: publicUserSchema }), 'UpdateMeResponse'),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/me/password',
		tags: ['User'],
		summary: 'Change password',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.changePasswordBodySchema) },
		},
		responses: {
			200: {
				description: 'Password changed',
				content: jsonContent(successResponseSchema(z.null(), 'ChangePasswordResponse')),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/currencies',
		tags: ['Currencies'],
		summary: 'List currencies',
		request: {
			query: req.listCurrenciesQuerySchema,
		},
		responses: {
			200: {
				description: 'Currency list',
				content: jsonContent(
					successResponseSchema(
						z.object({ currencies: z.array(currencySchema) }),
						'ListCurrenciesResponse',
					),
				),
			},
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/categories',
		tags: ['Categories'],
		summary: 'List categories',
		security: bearerSecurity,
		request: { query: req.listCategoriesQuerySchema },
		responses: {
			200: {
				description: 'Categories',
				content: jsonContent(
					successResponseSchema(
						z.object({ categories: z.array(publicCategorySchema) }),
						'ListCategoriesResponse',
					),
				),
			},
			401: errorResponses[401],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/categories',
		tags: ['Categories'],
		summary: 'Create category',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.createCategoryBodySchema) },
		},
		responses: {
			201: {
				description: 'Category created',
				content: jsonContent(
					successResponseSchema(z.object({ category: publicCategorySchema }), 'CreateCategoryResponse'),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/categories/{id}',
		tags: ['Categories'],
		summary: 'Update category',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.updateCategoryBodySchema) },
		},
		responses: {
			200: {
				description: 'Category updated',
				content: jsonContent(
					successResponseSchema(z.object({ category: publicCategorySchema }), 'UpdateCategoryResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'delete',
		path: '/api/v1/categories/{id}',
		tags: ['Categories'],
		summary: 'Delete category',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Category deleted',
				content: jsonContent(successResponseSchema(z.null(), 'DeleteCategoryResponse')),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/transactions',
		tags: ['Transactions'],
		summary: 'List transactions',
		security: bearerSecurity,
		request: { query: req.listTransactionsQuerySchema },
		responses: {
			200: {
				description: 'Paginated transactions',
				content: jsonContent(successResponseSchema(transactionListDataSchema, 'ListTransactionsResponse')),
			},
			401: errorResponses[401],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/transactions',
		tags: ['Transactions'],
		summary: 'Create transaction',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.createTransactionBodySchema) },
		},
		responses: {
			201: {
				description: 'Transaction created',
				content: jsonContent(
					successResponseSchema(
						z.object({ transaction: publicTransactionSchema }),
						'CreateTransactionResponse',
					),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/transactions/month-summary',
		tags: ['Transactions'],
		summary: 'Month summary (totals + per-day activity by spend date)',
		description:
			'Aggregates the authenticated user’s transactions for a calendar month in their preferred timezone. Filters on spend `date` (not createdAt). Amounts are converted to the user’s preferred currency.',
		security: bearerSecurity,
		request: { query: req.monthSummaryQuerySchema },
		responses: {
			200: {
				description: 'Month totals and non-empty day buckets',
				content: jsonContent(
					successResponseSchema(transactionMonthSummaryDataSchema, 'TransactionMonthSummaryResponse'),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/transactions/suggest-descriptions',
		tags: ['Transactions'],
		summary: 'Suggest descriptions',
		security: bearerSecurity,
		request: { query: req.suggestDescriptionsQuerySchema },
		responses: {
			200: {
				description: 'Description suggestions',
				content: jsonContent(
					successResponseSchema(
						z.object({ descriptions: z.array(z.string()) }),
						'SuggestDescriptionsResponse',
					),
				),
			},
			401: errorResponses[401],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/transactions/export',
		tags: ['Transactions'],
		summary: 'Export transactions (CSV or XLSX file download)',
		security: bearerSecurity,
		request: { query: req.exportTransactionsQuerySchema },
		responses: {
			200: {
				description:
					'File download. CSV = single table. XLSX = Summary + Transactions sheets. Not a JSON envelope.',
				content: {
					'text/csv': {
						schema: { type: 'string', format: 'binary' },
					},
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
						schema: { type: 'string', format: 'binary' },
					},
				},
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/transactions/import',
		tags: ['Transactions'],
		summary: 'Bulk import transactions (JSON rows; all-or-nothing)',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.importTransactionsBodySchema) },
		},
		responses: {
			201: {
				description: 'All rows imported',
				content: jsonContent(
					successResponseSchema(
						z.object({
							imported: z.number().int(),
							items: z.array(publicTransactionSchema),
						}),
						'ImportTransactionsResponse',
					),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
			429: {
				description: 'Import rate limited',
				content: jsonContent(errorResponseSchema),
			},
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/transactions/{id}',
		tags: ['Transactions'],
		summary: 'Get transaction',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Transaction',
				content: jsonContent(
					successResponseSchema(
						z.object({ transaction: publicTransactionSchema }),
						'GetTransactionResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/transactions/{id}',
		tags: ['Transactions'],
		summary: 'Update transaction',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.updateTransactionBodySchema) },
		},
		responses: {
			200: {
				description: 'Transaction updated',
				content: jsonContent(
					successResponseSchema(
						z.object({ transaction: publicTransactionSchema }),
						'UpdateTransactionResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'delete',
		path: '/api/v1/transactions/{id}',
		tags: ['Transactions'],
		summary: 'Delete transaction',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Transaction deleted',
				content: jsonContent(successResponseSchema(z.null(), 'DeleteTransactionResponse')),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/budgets',
		tags: ['Budgets'],
		summary: 'List budgets for a period',
		security: bearerSecurity,
		request: { query: req.listBudgetsQuerySchema },
		responses: {
			200: {
				description: 'Budgets with progress',
				content: jsonContent(
					successResponseSchema(
						z.object({ budgets: z.array(publicBudgetSchema) }),
						'ListBudgetsResponse',
					),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'put',
		path: '/api/v1/budgets',
		tags: ['Budgets'],
		summary: 'Create or update budget',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.upsertBudgetBodySchema) },
		},
		responses: {
			200: {
				description: 'Budget upserted',
				content: jsonContent(
					successResponseSchema(z.object({ budget: publicBudgetSchema }), 'UpsertBudgetResponse'),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'delete',
		path: '/api/v1/budgets/{id}',
		tags: ['Budgets'],
		summary: 'Delete budget',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Budget deleted',
				content: jsonContent(successResponseSchema(z.null(), 'DeleteBudgetResponse')),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/savings-goals',
		tags: ['Savings Goals'],
		summary: 'List savings goals',
		security: bearerSecurity,
		request: { query: req.listSavingsGoalsQuerySchema },
		responses: {
			200: {
				description: 'Savings goals',
				content: jsonContent(
					successResponseSchema(
						z.object({ goals: z.array(publicSavingsGoalSchema) }),
						'ListSavingsGoalsResponse',
					),
				),
			},
			401: errorResponses[401],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings-goals',
		tags: ['Savings Goals'],
		summary: 'Create savings goal',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.createSavingsGoalBodySchema) },
		},
		responses: {
			201: {
				description: 'Goal created',
				content: jsonContent(
					successResponseSchema(z.object({ goal: publicSavingsGoalSchema }), 'CreateSavingsGoalResponse'),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/savings-goals/{id}',
		tags: ['Savings Goals'],
		summary: 'Get savings goal',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Savings goal',
				content: jsonContent(
					successResponseSchema(z.object({ goal: publicSavingsGoalSchema }), 'GetSavingsGoalResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/savings-goals/{id}',
		tags: ['Savings Goals'],
		summary: 'Update savings goal',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.updateSavingsGoalBodySchema) },
		},
		responses: {
			200: {
				description: 'Goal updated',
				content: jsonContent(
					successResponseSchema(z.object({ goal: publicSavingsGoalSchema }), 'UpdateSavingsGoalResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'delete',
		path: '/api/v1/savings-goals/{id}',
		tags: ['Savings Goals'],
		summary: 'Delete savings goal',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Goal deleted',
				content: jsonContent(successResponseSchema(z.null(), 'DeleteSavingsGoalResponse')),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/savings-goals/{id}/contributions',
		tags: ['Savings Goals'],
		summary: 'List contributions',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Contributions',
				content: jsonContent(
					successResponseSchema(
						z.object({ contributions: z.array(publicContributionSchema) }),
						'ListContributionsResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings-goals/{id}/contributions',
		tags: ['Savings Goals'],
		summary: 'Add contribution',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.createContributionBodySchema) },
		},
		responses: {
			201: {
				description: 'Contribution added',
				content: jsonContent(
					successResponseSchema(
						z.object({
							contribution: publicContributionSchema,
							goal: publicSavingsGoalSchema,
						}),
						'AddContributionResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'delete',
		path: '/api/v1/savings-goals/{id}/contributions/{contributionId}',
		tags: ['Savings Goals'],
		summary: 'Delete contribution',
		security: bearerSecurity,
		request: { params: req.contributionParamsSchema },
		responses: {
			200: {
				description: 'Contribution deleted; updated goal returned',
				content: jsonContent(
					successResponseSchema(
						z.object({ goal: publicSavingsGoalSchema }),
						'DeleteContributionResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/dashboard',
		tags: ['Dashboard'],
		summary: 'Get dashboard aggregates',
		security: bearerSecurity,
		request: { query: req.getDashboardQuerySchema },
		responses: {
			200: {
				description: 'Dashboard snapshot',
				content: jsonContent(successResponseSchema(dashboardDataSchema, 'DashboardResponse')),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/trends',
		tags: ['Trends'],
		summary: 'Get trends aggregates',
		security: bearerSecurity,
		request: { query: req.getTrendsQuerySchema },
		responses: {
			200: {
				description: 'Trends series',
				content: jsonContent(successResponseSchema(trendsDataSchema, 'TrendsResponse')),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});
}
