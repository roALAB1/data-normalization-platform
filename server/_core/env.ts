import { z } from 'zod';

/**
 * Environment variable schema with Zod validation
 * Validates all required environment variables on startup
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required for database connection'),
  
  // Redis (for job queue)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/, 'REDIS_PORT must be a number').default('6379'),
  
  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  OAUTH_SERVER_URL: z.string().url('OAUTH_SERVER_URL must be a valid URL'),
  VITE_APP_ID: z.string().min(1, 'VITE_APP_ID is required for OAuth'),
  OWNER_OPEN_ID: z.string().optional(),
  
  // S3 Storage
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  
  // Forge API (Built-in services)
  BUILT_IN_FORGE_API_URL: z.string().url().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Validate environment variables on module load
 * Throws error with clear message if validation fails
 */
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    console.log('[ENV] Environment variables validated successfully');
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      }).join('\n');
      
      console.error('[ENV] Environment validation failed:\n' + errorMessages);
      throw new Error(
        'Environment validation failed. Please check your .env file and ensure all required variables are set:\n' +
        errorMessages
      );
    }
    throw error;
  }
}

// Validate on module load
const validatedEnv = validateEnv();

/**
 * Typed environment variables
 * All variables are validated and guaranteed to exist
 */
export const ENV = {
  appId: validatedEnv.VITE_APP_ID,
  cookieSecret: validatedEnv.JWT_SECRET,
  databaseUrl: validatedEnv.DATABASE_URL,
  oAuthServerUrl: validatedEnv.OAUTH_SERVER_URL,
  ownerOpenId: validatedEnv.OWNER_OPEN_ID ?? "",
  isProduction: validatedEnv.NODE_ENV === "production",
  forgeApiUrl: validatedEnv.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: validatedEnv.BUILT_IN_FORGE_API_KEY ?? "",
  redisHost: validatedEnv.REDIS_HOST,
  redisPort: parseInt(validatedEnv.REDIS_PORT),
  awsRegion: validatedEnv.AWS_REGION,
  s3Bucket: validatedEnv.S3_BUCKET,
};

/**
 * Get all required environment variables for documentation
 */
export function getRequiredEnvVars(): string[] {
  return [
    'DATABASE_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'JWT_SECRET',
    'OAUTH_SERVER_URL',
    'VITE_APP_ID',
    'AWS_REGION',
  ];
}

/**
 * Get all optional environment variables for documentation
 */
export function getOptionalEnvVars(): string[] {
  return [
    'OWNER_OPEN_ID',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET',
    'BUILT_IN_FORGE_API_URL',
    'BUILT_IN_FORGE_API_KEY',
  ];
}
