import { createServer } from 'node:http';
import app from './app.js';
import { config, logger } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { startFxCron } from './jobs/fxCron.js';
import { seedCurrencies } from './modules/currency/currency.seed.js';
import { migrateLegacySavingsCircles } from './modules/savings-circle/savings-circle.service.js';

async function bootstrap(): Promise<void> {
	await connectDatabase();
	await seedCurrencies();
	await migrateLegacySavingsCircles();
	startFxCron();


	const server = createServer(app);

	server.listen(config.port, () => {
		logger.info(`FinTrack API listening on port ${config.port}`, {
			env: config.nodeEnv,
			apiPrefix: config.apiPrefix,
			fxEnabled: config.fx.enabled,
		});
	});

	const shutdown = async (signal: string) => {
		logger.info(`Received ${signal}, shutting down`);
		server.close(async () => {
			try {
				await disconnectDatabase();
				logger.info('Shutdown complete');
				process.exit(0);
			} catch (error) {
				logger.error('Error during shutdown', { error });
				process.exit(1);
			}
		});
	};

	process.on('SIGINT', () => {
		void shutdown('SIGINT');
	});
	process.on('SIGTERM', () => {
		void shutdown('SIGTERM');
	});
}

bootstrap().catch((error) => {
	logger.error('Failed to start server', { error });
	process.exit(1);
});
