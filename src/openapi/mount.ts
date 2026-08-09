import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { getOpenApiDocument } from './openapi.js';

export function mountOpenApiDocs(app: Express): void {
	const document = getOpenApiDocument();

	app.get('/openapi.json', (_req, res) => {
		res.json(document);
	});

	app.use('/docs', swaggerUi.serve, swaggerUi.setup(document));
}
