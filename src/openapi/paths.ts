import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from './zod.js';
import * as req from './requests.js';
import {
	authSuccessDataSchema,
	bearerSecurity,
	currencySchema,
	errorResponseSchema,
	exchangeRateListDataSchema,
	healthDataSchema,
	jsonContent,
	moneyPositionSchema,
	publicBudgetSchema,
	publicCategorySchema,
	publicContributionSchema,
	contributionListDataSchema,
	publicExchangeRateSchema,
	publicSavingSchema,
	publicSavingsGoalSchema,
	publicSavingTransactionSchema,
	publicSavingsCircleSchema,
	publicSavingsCircleTransactionSchema,
	savingsCircleTransactionListDataSchema,
	publicInvestmentSchema,
	publicInvestmentTransactionSchema,
	investmentTransactionListDataSchema,
	publicTransactionSchema,
	savingTransactionListDataSchema,
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
		method: 'put',
		path: '/api/v1/me/avatar',
		tags: ['User'],
		summary: 'Upload avatar',
		description:
			'Uploads an avatar image (`multipart/form-data`, field `avatar`). The image is resized to a square WebP and stored in Vercel Blob; any previous avatar is deleted.',
		security: bearerSecurity,
		request: {
			body: {
				required: true,
				content: {
					'multipart/form-data': {
						schema: z.object({
							avatar: z.string().openapi({ type: 'string', format: 'binary' }),
						}),
					},
				},
			},
		},
		responses: {
			200: {
				description: 'Updated user',
				content: jsonContent(
					successResponseSchema(z.object({ user: publicUserSchema }), 'UpdateAvatarResponse'),
				),
			},
			401: errorResponses[401],
			413: {
				description: 'Image too large',
				content: jsonContent(errorResponseSchema),
			},
			422: errorResponses[422],
			503: {
				description: 'Avatar storage not configured',
				content: jsonContent(errorResponseSchema),
			},
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
			'Aggregates the authenticated user’s transactions for a calendar month in their preferred timezone. Filters on spend `date` (not createdAt). Amounts are converted to the user’s preferred currency. Includes the overall monthly budget (`categoryId` null) when one exists; category budgets are omitted.',
		security: bearerSecurity,
		request: { query: req.monthSummaryQuerySchema },
		responses: {
			200: {
				description: 'Month totals, non-empty day buckets, and overall budget when set',
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
						z.object({
							goals: z.array(publicSavingsGoalSchema),
							money: moneyPositionSchema,
						}),
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
		request: { params: req.idParamsSchema, query: req.listContributionsQuerySchema },
		responses: {
			200: {
				description: 'Paginated contributions',
				content: jsonContent(
					successResponseSchema(contributionListDataSchema, 'ListContributionsResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings-goals/{id}/starting-balance',
		tags: ['Savings Goals'],
		summary: 'Add a starting goal balance',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.startingBalanceBodySchema) },
		},
		responses: {
			201: {
				description: 'Starting goal balance added',
				content: jsonContent(
					successResponseSchema(
						z.object({
							contribution: publicContributionSchema,
							goal: publicSavingsGoalSchema,
						}),
						'AddGoalStartingBalanceResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
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
		method: 'post',
		path: '/api/v1/savings-goals/{id}/spend',
		tags: ['Savings Goals'],
		summary: 'Spend from goal',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.spendFromGoalBodySchema) },
		},
		responses: {
			201: {
				description: 'Expense created and goal drawn down',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicTransactionSchema,
							contribution: publicContributionSchema,
							goal: publicSavingsGoalSchema,
						}),
						'SpendFromGoalResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings-goals/{id}/return',
		tags: ['Savings Goals'],
		summary: 'Return unused goal money to Available',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.returnFromGoalBodySchema) },
		},
		responses: {
			200: {
				description: 'Returned to Spendable',
				content: jsonContent(
					successResponseSchema(
						z.object({
							contribution: publicContributionSchema.nullable(),
							goal: publicSavingsGoalSchema,
						}),
						'ReturnFromGoalResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/savings-goals/{id}/contributions/{contributionId}',
		tags: ['Savings Goals'],
		summary: 'Update a set-aside contribution',
		security: bearerSecurity,
		request: {
			params: req.contributionParamsSchema,
			body: { required: true, content: jsonContent(req.updateContributionBodySchema) },
		},
		responses: {
			200: {
				description: 'Contribution updated',
				content: jsonContent(
					successResponseSchema(
						z.object({
							contribution: publicContributionSchema,
							goal: publicSavingsGoalSchema,
						}),
						'UpdateContributionResponse',
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
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/savings',
		tags: ['Savings'],
		summary: 'List savings',
		security: bearerSecurity,
		responses: {
			200: {
				description: 'Savings',
				content: jsonContent(
					successResponseSchema(
						z.object({
							savings: z.array(publicSavingSchema),
							money: moneyPositionSchema,
						}),
						'ListSavingsResponse',
					),
				),
			},
			401: errorResponses[401],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings',
		tags: ['Savings'],
		summary: 'Create savings',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.createSavingBodySchema) },
		},
		responses: {
			201: {
				description: 'Savings created',
				content: jsonContent(
					successResponseSchema(z.object({ saving: publicSavingSchema }), 'CreateSavingResponse'),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/savings/{id}',
		tags: ['Savings'],
		summary: 'Get savings',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Savings item',
				content: jsonContent(
					successResponseSchema(z.object({ saving: publicSavingSchema }), 'GetSavingResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/savings/{id}',
		tags: ['Savings'],
		summary: 'Update savings',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.updateSavingBodySchema) },
		},
		responses: {
			200: {
				description: 'Savings updated',
				content: jsonContent(
					successResponseSchema(z.object({ saving: publicSavingSchema }), 'UpdateSavingResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'delete',
		path: '/api/v1/savings/{id}',
		tags: ['Savings'],
		summary: 'Delete savings',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Savings deleted',
				content: jsonContent(successResponseSchema(z.null(), 'DeleteSavingResponse')),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/savings/{id}/transactions',
		tags: ['Savings'],
		summary: 'List savings transactions',
		security: bearerSecurity,
		request: { params: req.idParamsSchema, query: req.listSavingTransactionsQuerySchema },
		responses: {
			200: {
				description: 'Paginated savings transactions',
				content: jsonContent(
					successResponseSchema(savingTransactionListDataSchema, 'ListSavingTransactionsResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings/{id}/starting-balance',
		tags: ['Savings'],
		summary: 'Add a starting savings balance',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.startingBalanceBodySchema) },
		},
		responses: {
			201: {
				description: 'Starting savings balance added',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicSavingTransactionSchema,
							saving: publicSavingSchema,
						}),
						'AddSavingStartingBalanceResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings/{id}/contribute',
		tags: ['Savings'],
		summary: 'Add to savings from Spendable',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.savingMovementBodySchema) },
		},
		responses: {
			201: {
				description: 'Added to savings',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicSavingTransactionSchema,
							saving: publicSavingSchema,
						}),
						'ContributeToSavingResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings/{id}/withdraw',
		tags: ['Savings'],
		summary: 'Withdraw from savings to Spendable',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.savingMovementBodySchema) },
		},
		responses: {
			201: {
				description: 'Withdrawn from savings',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicSavingTransactionSchema,
							saving: publicSavingSchema,
						}),
						'WithdrawFromSavingResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings/{id}/return',
		tags: ['Savings'],
		summary: 'Add a return (interest) to savings',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.savingMovementBodySchema) },
		},
		responses: {
			201: {
				description: 'Return added to savings',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicSavingTransactionSchema,
							saving: publicSavingSchema,
						}),
						'AddSavingReturnResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/savings/{id}/transactions/{transactionId}',
		tags: ['Savings'],
		summary: 'Update a savings transaction',
		security: bearerSecurity,
		request: {
			params: req.savingTransactionParamsSchema,
			body: { required: true, content: jsonContent(req.updateSavingTransactionBodySchema) },
		},
		responses: {
			200: {
				description: 'Savings transaction updated',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicSavingTransactionSchema,
							saving: publicSavingSchema,
						}),
						'UpdateSavingTransactionResponse',
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
		path: '/api/v1/savings/{id}/transactions/{transactionId}',
		tags: ['Savings'],
		summary: 'Delete a savings transaction',
		security: bearerSecurity,
		request: { params: req.savingTransactionParamsSchema },
		responses: {
			200: {
				description: 'Savings transaction deleted; updated savings returned',
				content: jsonContent(
					successResponseSchema(
						z.object({ saving: publicSavingSchema }),
						'DeleteSavingTransactionResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/savings-circles',
		tags: ['Savings Circles'],
		summary: 'List savings circles',
		security: bearerSecurity,
		request: { query: req.listSavingsCirclesQuerySchema },
		responses: {
			200: {
				description: 'Savings circles',
				content: jsonContent(
					successResponseSchema(
						z.object({
							circles: z.array(publicSavingsCircleSchema),
							money: moneyPositionSchema,
						}),
						'ListSavingsCirclesResponse',
					),
				),
			},
			401: errorResponses[401],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings-circles',
		tags: ['Savings Circles'],
		summary: 'Create savings circle',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.createSavingsCircleBodySchema) },
		},
		responses: {
			201: {
				description: 'Circle created',
				content: jsonContent(
					successResponseSchema(
						z.object({ circle: publicSavingsCircleSchema }),
						'CreateSavingsCircleResponse',
					),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/savings-circles/{id}',
		tags: ['Savings Circles'],
		summary: 'Get savings circle',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Savings circle',
				content: jsonContent(
					successResponseSchema(
						z.object({ circle: publicSavingsCircleSchema }),
						'GetSavingsCircleResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/savings-circles/{id}',
		tags: ['Savings Circles'],
		summary: 'Update savings circle',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.updateSavingsCircleBodySchema) },
		},
		responses: {
			200: {
				description: 'Circle updated',
				content: jsonContent(
					successResponseSchema(
						z.object({ circle: publicSavingsCircleSchema }),
						'UpdateSavingsCircleResponse',
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
		path: '/api/v1/savings-circles/{id}',
		tags: ['Savings Circles'],
		summary: 'Delete savings circle',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Circle deleted',
				content: jsonContent(successResponseSchema(z.null(), 'DeleteSavingsCircleResponse')),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/savings-circles/{id}/transactions',
		tags: ['Savings Circles'],
		summary: 'List savings circle transactions',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			query: req.listSavingsCircleTransactionsQuerySchema,
		},
		responses: {
			200: {
				description: 'Circle history',
				content: jsonContent(
					successResponseSchema(savingsCircleTransactionListDataSchema, 'ListSavingsCircleTransactionsResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings-circles/{id}/contribute',
		tags: ['Savings Circles'],
		summary: 'Add a circle contribution from Spendable',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.savingsCircleMovementBodySchema) },
		},
		responses: {
			201: {
				description: 'Contribution recorded',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicSavingsCircleTransactionSchema,
							circle: publicSavingsCircleSchema,
						}),
						'ContributeToSavingsCircleResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings-circles/{id}/payout',
		tags: ['Savings Circles'],
		summary: 'Record a savings circle payout',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.savingsCircleMovementBodySchema) },
		},
		responses: {
			201: {
				description: 'Payout recorded',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicSavingsCircleTransactionSchema,
							circle: publicSavingsCircleSchema,
						}),
						'RecordSavingsCirclePayoutResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings-circles/{id}/payout-to-spendable',
		tags: ['Savings Circles'],
		summary: 'Move a savings circle payout to Spendable',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.savingsCircleMovementBodySchema) },
		},
		responses: {
			201: {
				description: 'Payout moved to Spendable',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicSavingsCircleTransactionSchema,
							circle: publicSavingsCircleSchema,
						}),
						'MoveSavingsCirclePayoutResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/savings-circles/{id}/complete',
		tags: ['Savings Circles'],
		summary: 'Complete a savings circle',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
		},
		responses: {
			200: {
				description: 'Circle completed',
				content: jsonContent(
					successResponseSchema(
						z.object({ circle: publicSavingsCircleSchema }),
						'CompleteSavingsCircleResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/savings-circles/{id}/transactions/{transactionId}',
		tags: ['Savings Circles'],
		summary: 'Update a savings circle transaction',
		security: bearerSecurity,
		request: {
			params: req.savingsCircleTransactionParamsSchema,
			body: { required: true, content: jsonContent(req.updateSavingsCircleTransactionBodySchema) },
		},
		responses: {
			200: {
				description: 'Entry updated',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicSavingsCircleTransactionSchema,
							circle: publicSavingsCircleSchema,
						}),
						'UpdateSavingsCircleTransactionResponse',
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
		path: '/api/v1/savings-circles/{id}/transactions/{transactionId}',
		tags: ['Savings Circles'],
		summary: 'Delete a savings circle transaction',
		security: bearerSecurity,
		request: { params: req.savingsCircleTransactionParamsSchema },
		responses: {
			200: {
				description: 'Entry deleted',
				content: jsonContent(
					successResponseSchema(
						z.object({ circle: publicSavingsCircleSchema }),
						'DeleteSavingsCircleTransactionResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/investments',
		tags: ['Investments'],
		summary: 'List investments',
		security: bearerSecurity,
		request: { query: req.listInvestmentsQuerySchema },
		responses: {
			200: {
				description: 'Investments',
				content: jsonContent(
					successResponseSchema(
						z.object({
							investments: z.array(publicInvestmentSchema),
							money: moneyPositionSchema,
						}),
						'ListInvestmentsResponse',
					),
				),
			},
			401: errorResponses[401],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/investments',
		tags: ['Investments'],
		summary: 'Create investment',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.createInvestmentBodySchema) },
		},
		responses: {
			201: {
				description: 'Investment created',
				content: jsonContent(
					successResponseSchema(
						z.object({ investment: publicInvestmentSchema }),
						'CreateInvestmentResponse',
					),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/investments/{id}',
		tags: ['Investments'],
		summary: 'Get investment',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Investment',
				content: jsonContent(
					successResponseSchema(
						z.object({ investment: publicInvestmentSchema }),
						'GetInvestmentResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/investments/{id}',
		tags: ['Investments'],
		summary: 'Update investment',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.updateInvestmentBodySchema) },
		},
		responses: {
			200: {
				description: 'Investment updated',
				content: jsonContent(
					successResponseSchema(
						z.object({ investment: publicInvestmentSchema }),
						'UpdateInvestmentResponse',
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
		path: '/api/v1/investments/{id}',
		tags: ['Investments'],
		summary: 'Delete unused investment',
		security: bearerSecurity,
		request: { params: req.idParamsSchema },
		responses: {
			200: {
				description: 'Investment deleted',
				content: jsonContent(successResponseSchema(z.null(), 'DeleteInvestmentResponse')),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/investments/{id}/transactions',
		tags: ['Investments'],
		summary: 'List investment transactions',
		security: bearerSecurity,
		request: { params: req.idParamsSchema, query: req.listInvestmentTransactionsQuerySchema },
		responses: {
			200: {
				description: 'Paginated investment transactions',
				content: jsonContent(
					successResponseSchema(
						investmentTransactionListDataSchema,
						'ListInvestmentTransactionsResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/investments/{id}/starting-balance',
		tags: ['Investments'],
		summary: 'Add a starting investment balance',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.startingBalanceBodySchema) },
		},
		responses: {
			201: {
				description: 'Starting investment balance added',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicInvestmentTransactionSchema,
							investment: publicInvestmentSchema,
						}),
						'AddInvestmentStartingBalanceResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/investments/{id}/contribute',
		tags: ['Investments'],
		summary: 'Add money to investment from Spendable',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.investmentMovementBodySchema) },
		},
		responses: {
			201: {
				description: 'Added to investment',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicInvestmentTransactionSchema,
							investment: publicInvestmentSchema,
						}),
						'ContributeToInvestmentResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/investments/{id}/return',
		tags: ['Investments'],
		summary: 'Add a return to investment',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.investmentMovementBodySchema) },
		},
		responses: {
			201: {
				description: 'Return added to investment',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicInvestmentTransactionSchema,
							investment: publicInvestmentSchema,
						}),
						'AddInvestmentReturnResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/investments/{id}/withdraw',
		tags: ['Investments'],
		summary: 'Withdraw from investment to Spendable',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.investmentMovementBodySchema) },
		},
		responses: {
			201: {
				description: 'Withdrawn from investment',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicInvestmentTransactionSchema,
							investment: publicInvestmentSchema,
						}),
						'WithdrawFromInvestmentResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/investments/{id}/close',
		tags: ['Investments'],
		summary: 'Close investment and return remaining balance to Spendable',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.closeInvestmentBodySchema) },
		},
		responses: {
			200: {
				description: 'Investment closed',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicInvestmentTransactionSchema.nullable(),
							investment: publicInvestmentSchema,
						}),
						'CloseInvestmentResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/investments/{id}/loss',
		tags: ['Investments'],
		summary: 'Record a loss on an investment',
		security: bearerSecurity,
		request: {
			params: req.idParamsSchema,
			body: { required: true, content: jsonContent(req.investmentMovementBodySchema) },
		},
		responses: {
			201: {
				description: 'Loss recorded',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicInvestmentTransactionSchema,
							investment: publicInvestmentSchema,
						}),
						'RecordInvestmentLossResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/investments/{id}/transactions/{transactionId}',
		tags: ['Investments'],
		summary: 'Update an investment transaction',
		security: bearerSecurity,
		request: {
			params: req.investmentTransactionParamsSchema,
			body: { required: true, content: jsonContent(req.updateInvestmentTransactionBodySchema) },
		},
		responses: {
			200: {
				description: 'Investment transaction updated',
				content: jsonContent(
					successResponseSchema(
						z.object({
							transaction: publicInvestmentTransactionSchema,
							investment: publicInvestmentSchema,
						}),
						'UpdateInvestmentTransactionResponse',
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
		path: '/api/v1/investments/{id}/transactions/{transactionId}',
		tags: ['Investments'],
		summary: 'Delete an investment transaction',
		security: bearerSecurity,
		request: { params: req.investmentTransactionParamsSchema },
		responses: {
			200: {
				description: 'Investment transaction deleted; updated investment returned',
				content: jsonContent(
					successResponseSchema(
						z.object({ investment: publicInvestmentSchema }),
						'DeleteInvestmentTransactionResponse',
					),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
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

	registry.registerPath({
		method: 'post',
		path: '/api/v1/admin/exchange-rates/sync-today',
		tags: ['Admin Exchange Rates'],
		summary: 'Sync today’s rates from Frankfurter',
		description: 'Admin-only. Fetches today’s rates and sets process to admin_sync. triggeredBy is the admin display name from JWT.',
		security: bearerSecurity,
		responses: {
			200: {
				description: 'Sync succeeded',
				content: jsonContent(
					successResponseSchema(publicExchangeRateSchema, 'SyncTodayExchangeRateResponse'),
				),
			},
			401: errorResponses[401],
			502: {
				description: 'Frankfurter sync failed',
				content: jsonContent(errorResponseSchema),
			},
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/admin/exchange-rates',
		tags: ['Admin Exchange Rates'],
		summary: 'List exchange rates',
		description: 'Admin-only. Returns paginated daily rates plus top-level base and source.',
		security: bearerSecurity,
		request: { query: req.listExchangeRatesQuerySchema },
		responses: {
			200: {
				description: 'Exchange rate list',
				content: jsonContent(
					successResponseSchema(exchangeRateListDataSchema, 'ListExchangeRatesResponse'),
				),
			},
			401: errorResponses[401],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/admin/exchange-rates',
		tags: ['Admin Exchange Rates'],
		summary: 'Create exchange rate for a date',
		description:
			'Admin-only. If `rates` is omitted, fetches that date from Frankfurter (process admin_sync). If `rates` is provided, saves manually (process admin_manual). Do not send USD; base USD:1 is applied server-side.',
		security: bearerSecurity,
		request: {
			body: { required: true, content: jsonContent(req.createExchangeRateBodySchema) },
		},
		responses: {
			201: {
				description: 'Exchange rate created',
				content: jsonContent(
					successResponseSchema(publicExchangeRateSchema, 'CreateExchangeRateResponse'),
				),
			},
			401: errorResponses[401],
			409: {
				description: 'Date already exists',
				content: jsonContent(errorResponseSchema),
			},
			422: errorResponses[422],
			502: {
				description: 'Frankfurter sync failed (date-only create)',
				content: jsonContent(errorResponseSchema),
			},
		},
	});

	registry.registerPath({
		method: 'get',
		path: '/api/v1/admin/exchange-rates/{date}',
		tags: ['Admin Exchange Rates'],
		summary: 'Get exchange rate by date',
		security: bearerSecurity,
		request: { params: req.exchangeRateDateParamsSchema },
		responses: {
			200: {
				description: 'Exchange rate for the date',
				content: jsonContent(
					successResponseSchema(publicExchangeRateSchema, 'GetExchangeRateResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'patch',
		path: '/api/v1/admin/exchange-rates/{date}',
		tags: ['Admin Exchange Rates'],
		summary: 'Update exchange rate',
		description:
			'Admin-only. Updating rates sets process to admin_manual. At least one of rates or notes is required.',
		security: bearerSecurity,
		request: {
			params: req.exchangeRateDateParamsSchema,
			body: { required: true, content: jsonContent(req.updateExchangeRateBodySchema) },
		},
		responses: {
			200: {
				description: 'Exchange rate updated',
				content: jsonContent(
					successResponseSchema(publicExchangeRateSchema, 'UpdateExchangeRateResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'delete',
		path: '/api/v1/admin/exchange-rates/{date}',
		tags: ['Admin Exchange Rates'],
		summary: 'Delete exchange rate',
		security: bearerSecurity,
		request: { params: req.exchangeRateDateParamsSchema },
		responses: {
			200: {
				description: 'Exchange rate deleted',
				content: jsonContent(successResponseSchema(z.null(), 'DeleteExchangeRateResponse')),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/admin/exchange-rates/{date}/retry',
		tags: ['Admin Exchange Rates'],
		summary: 'Retry Frankfurter sync for a date',
		description:
			'Admin-only. Re-fetches rates for the date (process admin_retry). Skipped if process is admin_manual.',
		security: bearerSecurity,
		request: { params: req.exchangeRateDateParamsSchema },
		responses: {
			200: {
				description: 'Retry succeeded',
				content: jsonContent(
					successResponseSchema(publicExchangeRateSchema, 'RetryExchangeRateResponse'),
				),
			},
			401: errorResponses[401],
			404: errorResponses[404],
			422: errorResponses[422],
			502: {
				description: 'Frankfurter sync failed',
				content: jsonContent(errorResponseSchema),
			},
		},
	});

	registry.registerPath({
		method: 'post',
		path: '/api/v1/internal/fx/sync-today',
		tags: ['Internal FX'],
		summary: 'External cron sync for today',
		description:
			'Called by cron-job.org (or similar). Requires header `x-cron-secret`. Returns success + message only (no rate payload).',
		parameters: [
			{
				name: 'x-cron-secret',
				in: 'header',
				required: true,
				schema: { type: 'string', minLength: 16 },
				description: 'Must match server CRON_SECRET',
			},
		],
		responses: {
			200: {
				description: 'Sync succeeded',
				content: jsonContent(successResponseSchema(z.null(), 'InternalFxSyncTodayResponse')),
			},
			401: {
				description: 'Invalid cron secret',
				content: jsonContent(errorResponseSchema),
			},
			503: {
				description: 'Cron secret not configured',
				content: jsonContent(errorResponseSchema),
			},
			502: {
				description: 'Frankfurter sync failed',
				content: jsonContent(errorResponseSchema),
			},
		},
	});
}
