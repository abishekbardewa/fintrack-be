import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import { apiLimiter, config, defaultLimiter } from './config/index.js';
import { mountOpenApiDocs } from './docs/mount.js';
import apiRouter from './modules/index.js';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js';

const app = express();

app.set('trust proxy', config.numberOfProxies);

app.use(
	helmet(
		config.isProduction
			? undefined
			: {
					contentSecurityPolicy: false,
				},
	),
);
app.use(defaultLimiter);
app.use(config.apiPrefix, apiLimiter);
app.use(express.json({ limit: config.bodySizeLimit }));
app.use(express.urlencoded({ extended: false, limit: config.bodySizeLimit }));
app.use(mongoSanitize());
app.use(
	cors({
		origin: config.origins,
	}),
);

app.get('/health', (_req, res) => {
	res.status(200).json({
		success: true,
		statusCode: 200,
		message: 'OK',
		data: { status: 'healthy' },
	});
});

if (!config.isProduction) {
	mountOpenApiDocs(app);
}

app.use(config.apiPrefix, apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
