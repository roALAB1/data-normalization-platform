import { z } from 'zod';

/**
 * Environment variable schema with Zod validation
 * Uses safeParse to avoid crashing on missing variables
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().optional(),
  
  // Redis (for job queue)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  
  // Authentication
  JWT_SECRET: z.string().optional(),
  OAUTH_SERVER_URL: z.string().optional(),
  VITE_APP_ID: z.string().optional(),
  OWNER_OPEN_ID: z.string().optional(),
  
  // S3 Storage
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  
  // Forge API (Built-in services)
  BUILT_IN_FORGE_API_URL: z.string().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

/**
 * Validate environment variables on module load
 * Logs warnings for missing critical variables but doesn't crash
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.warn('[ENV] Environment validation had issues:', result.error.errors);
  }
  
  const env = result.success ? result.data : {};
  
  // Check critical variables and log warnings
  const criticalVars = ['DATABASE_URL', 'JWT_SECRET', 'OAUTH_SERVER_URL', 'VITE_APP_ID'];
  const missing = criticalVars.filter(v => !env[v as keyof typeof env]);
  
  if (missing.length > 0) {
    console.warn(`[ENV] Warning: Missing critical environment variables: ${missing.join(', ')}`);
    console.warn('[ENV] Some features may not work correctly');
  } else {
    console.log('[ENV] All critical environment variables present');
  }
  
  return env;
}

// Validate on module load
const validatedEnv = validateEnv();

/**
 * Typed environment variables
 * All variables have fallback defaults
 */
export const ENV = {
  appId: validatedEnv.VITE_APP_ID ?? "",
  cookieSecret: validatedEnv.JWT_SECRET ?? "",
  databaseUrl: validatedEnv.DATABASE_URL ?? "",
  oAuthServerUrl: validatedEnv.OAUTH_SERVER_URL ?? "",
  ownerOpenId: validatedEnv.OWNER_OPEN_ID ?? "",
  isProduction: validatedEnv.NODE_ENV === "production",
  forgeApiUrl: validatedEnv.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: validatedEnv.BUILT_IN_FORGE_API_KEY ?? "",
  redisHost: validatedEnv.REDIS_HOST ?? 'localhost',
  redisPort: parseInt(validatedEnv.REDIS_PORT ?? '6379'),
  awsRegion: validatedEnv.AWS_REGION ?? 'us-east-1',
  s3Bucket: validatedEnv.S3_BUCKET ?? '',
};

/**
 * Get all required environment variables for documentation
 */
export function getRequiredEnvVars(): string[] {
  return [
    'DATABASE_URL',
    'JWT_SECRET',
    'OAUTH_SERVER_URL',
    'VITE_APP_ID',
  ];
}

/**
 * Get all optional environment variables for documentation
 */
export function getOptionalEnvVars(): string[] {
  return [
    'REDIS_HOST',
    'REDIS_PORT',
    'OWNER_OPEN_ID',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'S3_BUCKET',
    'BUILT_IN_FORGE_API_URL',
    'BUILT_IN_FORGE_API_KEY',
  ];
}
