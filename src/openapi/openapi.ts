import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { config } from '../config/index.js';
import { registerPaths } from './paths.js';
import './zod.js';

let cachedDocument: OpenAPIObject | null = null;

function buildDocument(): OpenAPIObject {
	const registry = new OpenAPIRegistry();

	registry.registerComponent('securitySchemes', 'bearerAuth', {
		type: 'http',
		scheme: 'bearer',
		bearerFormat: 'JWT',
	});

	registerPaths(registry);

	const generator = new OpenApiGeneratorV3(registry.definitions);
	return generator.generateDocument({
		openapi: '3.0.3',
		info: {
			title: 'FinTrack API',
			version: '1.0.1',
			description:
				'FinTrack backend API. Authenticated routes expect `Authorization: Bearer <accessToken>`. All success responses use `{ success, statusCode, message, data }`.',
		},
		servers: [
			{
				url: '/',
				description: 'Current host',
			},
			{
				url: `http://localhost:${config.port}`,
				description: 'Local development',
			},
		],
		tags: [
			{ name: 'Health' },
			{ name: 'Auth' },
			{ name: 'User' },
			{ name: 'Currencies' },
			{ name: 'Categories' },
			{ name: 'Transactions' },
			{ name: 'Budgets' },
			{ name: 'Savings Goals' },
			{ name: 'Dashboard' },
			{ name: 'Trends' },
		],
	});
}

export function getOpenApiDocument(): OpenAPIObject {
	if (!cachedDocument) {
		cachedDocument = buildDocument();
	}
	return cachedDocument;
}
