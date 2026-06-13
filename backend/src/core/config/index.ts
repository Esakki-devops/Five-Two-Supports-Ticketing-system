import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for runtime configuration.
 * Reads from the environment, validates with Zod, and FAILS FAST on misconfiguration.
 * No other module should read `process.env` directly.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),

  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/ticketing'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // ── Auth / JWT ──
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900), // 15 min
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604800), // 7 days
  BCRYPT_COST: z.coerce.number().int().min(8).max(15).default(12),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),

  // ── Refresh-token cookie ──
  REFRESH_COOKIE_NAME: z.string().default('fts_refresh'),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional(),

  // ── Bootstrap admin (used by the seed script) ──
  BOOTSTRAP_ADMIN_NAME: z.string().default('Five Two Admin'),
  BOOTSTRAP_ADMIN_EMAIL: z.email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).optional(),

  // ── Email / SES ──
  MAIL_PROVIDER: z.enum(['noop', 'ses']).default('noop'),
  MAIL_FROM: z.string().default('Five Two Supports <no-reply@fivetwosupports.local>'),
  WEB_URL: z.string().default('http://localhost:5173'), // used to build links in emails
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // ── Background jobs / scheduling ──
  RESOLUTION_REMINDER_DAYS: z.coerce.number().int().positive().default(5),
  AUTO_CLOSE_DAYS: z.coerce.number().int().positive().default(7),
  JOB_ATTEMPTS: z.coerce.number().int().positive().default(5),
  JOB_BACKOFF_MS: z.coerce.number().int().positive().default(5000),

  // ── Object storage (MinIO / S3) ──
  STORAGE_DRIVER: z.enum(['memory', 's3']).default('memory'),
  S3_ENDPOINT: z.string().optional(), // e.g. http://localhost:9000 for MinIO
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().default('ticket-attachments'),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v !== 'false'), // default true — MinIO requires path-style

  // ── Rate limiting ──
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

  // ── Login lockout (brute-force protection) ──
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

  // ── Observability ──
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  METRICS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Invalid environment configuration:\n');
  for (const issue of parsed.error.issues) {
    console.error(`  • ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  console.error('\nSee .env.example for the expected variables.\n');
  process.exit(1);
}

const env = parsed.data;

const toList = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  isDev: env.NODE_ENV === 'development',
  http: {
    port: env.PORT,
    host: env.HOST,
    apiPrefix: env.API_PREFIX,
  },
  mongo: {
    uri: env.MONGODB_URI,
  },
  redis: {
    url: env.REDIS_URL,
  },
  log: {
    level: env.LOG_LEVEL,
  },
  cors: {
    origins: toList(env.CORS_ORIGINS),
  },
  auth: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    refreshTtlSeconds: env.JWT_REFRESH_TTL_SECONDS,
    bcryptCost: env.BCRYPT_COST,
    passwordResetTtlMinutes: env.PASSWORD_RESET_TTL_MINUTES,
  },
  cookie: {
    refreshName: env.REFRESH_COOKIE_NAME,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
  },
  bootstrap: {
    adminName: env.BOOTSTRAP_ADMIN_NAME,
    adminEmail: env.BOOTSTRAP_ADMIN_EMAIL,
    adminPassword: env.BOOTSTRAP_ADMIN_PASSWORD,
  },
  mail: {
    provider: env.MAIL_PROVIDER,
    from: env.MAIL_FROM,
    webUrl: env.WEB_URL,
    aws: {
      region: env.AWS_REGION,
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  },
  jobs: {
    reminderDays: env.RESOLUTION_REMINDER_DAYS,
    autoCloseDays: env.AUTO_CLOSE_DAYS,
    attempts: env.JOB_ATTEMPTS,
    backoffMs: env.JOB_BACKOFF_MS,
  },
  storage: {
    driver: env.STORAGE_DRIVER,
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    accessKey: env.S3_ACCESS_KEY ?? '',
    secretKey: env.S3_SECRET_KEY ?? '',
    bucket: env.S3_BUCKET,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    authWindowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  },
  security: {
    loginMaxAttempts: env.LOGIN_MAX_ATTEMPTS,
    lockoutMinutes: env.LOGIN_LOCKOUT_MINUTES,
  },
  sentry: {
    dsn: env.SENTRY_DSN,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  },
  metrics: {
    enabled: env.METRICS_ENABLED,
  },
} as const;

export type AppConfig = typeof config;
