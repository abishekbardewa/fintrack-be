import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const environments = ['development', 'test', 'staging', 'production'] as const;
type NodeEnvironment = (typeof environments)[number];

function resolveNodeEnv(): NodeEnvironment {
	const value = process.env.NODE_ENV;
	if (value && environments.includes(value as NodeEnvironment)) {
		return value as NodeEnvironment;
	}
	return 'development';
}

function loadEnvironmentFiles(): NodeEnvironment {
	const nodeEnv = resolveNodeEnv();
	const envFilePath = resolve(process.cwd(), `.env.${nodeEnv}`);

	if (existsSync(envFilePath)) {
		loadDotenv({ path: envFilePath });
	} else {
		// Fallback for local setups that still use a plain `.env`
		loadDotenv({ path: resolve(process.cwd(), '.env') });
	}

	process.env.NODE_ENV = nodeEnv;
	return nodeEnv;
}

loadEnvironmentFiles();

const envSchema = z.object({
	NODE_ENV: z.enum(environments).default('development'),
	PORT: z.coerce.number().int().positive().default(3001),
	NO_OF_PROXY: z.coerce.number().int().nonnegative().default(1),
	ORIGINS: z
		.string()
		.min(1, 'ORIGINS is required (comma-separated list)')
		.transform((value) =>
			value
				.split(',')
				.map((origin) => origin.trim())
				.filter(Boolean),
		)
		.pipe(z.array(z.string().url()).min(1, 'At least one valid ORIGIN is required')),
	MONGO_DB_STRING: z.string().min(1, 'MONGO_DB_STRING is required'),
	JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
	JWT_EXPIRES_IN: z.string().default('7d'),
	BODY_SIZE_LIMIT: z.string().default('100kb'),
	FX_ENABLED: z.enum(['true', 'false']).optional(),
	FX_CRON_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(16),
	CRON_SECRET: z.string().min(16).optional(),
	BLOB_READ_WRITE_TOKEN: z.preprocess(
		(value) => (value === '' ? undefined : value),
		z.string().min(1).optional(),
	),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
	throw new Error(`Invalid environment variables:\n${details}`);
}

const env = parsed.data;

const fxEnabled =
	env.FX_ENABLED !== undefined
		? env.FX_ENABLED === 'true'
		: env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test';

export const config = {
	nodeEnv: env.NODE_ENV,
	isProduction: env.NODE_ENV === 'production',
	isDevelopment: env.NODE_ENV === 'development',
	isStaging: env.NODE_ENV === 'staging',
	port: env.PORT,
	numberOfProxies: env.NO_OF_PROXY,
	origins: env.ORIGINS,
	apiPrefix: '/api/v1',
	bodySizeLimit: env.BODY_SIZE_LIMIT,
	jwt: {
		secret: env.JWT_SECRET,
		expiresIn: env.JWT_EXPIRES_IN,
	},
	db: {
		uri: env.MONGO_DB_STRING,
	},
	fx: {
		enabled: fxEnabled,
		cronHourUtc: env.FX_CRON_HOUR_UTC,
	},
	cron: {
		secret: env.CRON_SECRET,
	},
	blob: {
		readWriteToken: env.BLOB_READ_WRITE_TOKEN,
	},
} as const;

export type AppConfig = typeof config;
