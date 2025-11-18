import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Normalization jobs table
 * Tracks batch normalization jobs submitted by users
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Reference to users table
  type: mysqlEnum("type", ["intelligent", "name", "phone", "email", "company", "address"]).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "cancelled"]).default("pending").notNull(),
  totalRows: int("totalRows").notNull(),
  processedRows: int("processedRows").default(0).notNull(),
  validRows: int("validRows").default(0).notNull(),
  invalidRows: int("invalidRows").default(0).notNull(),
  inputFileKey: varchar("inputFileKey", { length: 512 }), // S3 key for input file
  inputFileUrl: text("inputFileUrl"), // S3 URL for input file
  outputFileKey: varchar("outputFileKey", { length: 512 }), // S3 key for output file
  outputFileUrl: text("outputFileUrl"), // S3 URL for output file
  config: json("config"), // Job configuration (preserveAccents, etc.)
  errorMessage: text("errorMessage"), // Error details if failed
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Job results table (optional - for storing individual row results)
 * This allows querying specific results without downloading the entire file
 */
export const jobResults = mysqlTable("jobResults", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(), // Reference to jobs table
  rowIndex: int("rowIndex").notNull(), // Original row number in input
  inputValue: text("inputValue").notNull(), // Original input value
  outputValue: text("outputValue"), // Normalized output value
  isValid: boolean("isValid").notNull(),
  repairLog: json("repairLog"), // Array of repair operations applied
  metadata: json("metadata"), // Additional parsed data (parts, formats, etc.)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobResult = typeof jobResults.$inferSelect;
export type InsertJobResult = typeof jobResults.$inferInsert;

/**
 * Scheduled jobs table
 * Allows users to set up recurring normalization jobs
 */
export const scheduledJobs = mysqlTable("scheduledJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Reference to users table
  name: varchar("name", { length: 255 }).notNull(), // User-friendly name
  type: mysqlEnum("type", ["intelligent", "name", "phone", "email", "address"]).notNull(),
  cronExpression: varchar("cronExpression", { length: 100 }).notNull(), // Cron schedule (e.g., "0 9 * * 1" for every Monday at 9am)
  config: json("config"), // Job configuration
  inputFileKey: varchar("inputFileKey", { length: 512 }), // S3 key for input file template
  enabled: boolean("enabled").default(true).notNull(),
  lastRun: timestamp("lastRun"),
  nextRun: timestamp("nextRun"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type InsertScheduledJob = typeof scheduledJobs.$inferInsert;

/**
 * API keys table
 * For programmatic access to the normalization API
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Reference to users table
  key: varchar("key", { length: 64 }).notNull().unique(), // API key (hashed)
  name: varchar("name", { length: 255 }).notNull(), // User-friendly name
  permissions: json("permissions"), // Array of allowed operations (e.g., ["jobs.create", "jobs.list"])
  lastUsed: timestamp("lastUsed"),
  expiresAt: timestamp("expiresAt"), // Optional expiration
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Credential issues table
 * Tracks user-reported issues with credential stripping
 */
export const credentialIssues = mysqlTable("credentialIssues", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Reference to users table (nullable for anonymous reports)
  issueType: mysqlEnum("issueType", ["not_stripped", "incorrectly_stripped", "missing_credential", "other"]).notNull(),
  originalText: text("originalText").notNull(), // The full name/text that had the issue
  expectedOutput: text("expectedOutput"), // What the user expected
  actualOutput: text("actualOutput"), // What the system produced
  credentialText: varchar("credentialText", { length: 255 }), // The specific credential in question
  description: text("description"), // User's description of the issue
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "wont_fix"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"), // Admin user who reviewed
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CredentialIssue = typeof credentialIssues.$inferSelect;
export type InsertCredentialIssue = typeof credentialIssues.$inferInsert;

/**
 * Credential usage tracking table
 * Tracks which credentials appear in real data to prioritize additions
 */
export const credentialUsage = mysqlTable("credentialUsage", {
  id: int("id").autoincrement().primaryKey(),
  credential: varchar("credential", { length: 255 }).notNull().unique(), // The credential text (e.g., "MMSc", "CPO")
  occurrenceCount: int("occurrenceCount").default(1).notNull(), // How many times this credential has been seen
  lastSeen: timestamp("lastSeen").defaultNow().notNull(),
  isInList: boolean("isInList").default(false).notNull(), // Whether it's already in ALL_CREDENTIALS
  addedToListAt: timestamp("addedToListAt"), // When it was added to the list
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CredentialUsage = typeof credentialUsage.$inferSelect;
export type InsertCredentialUsage = typeof credentialUsage.$inferInsert;

/**
 * Issue reports table (v3.9.0)
 * Comprehensive bug report system for all normalization issues
 * Users can report issues directly from the UI with full context
 */
export const issueReports = mysqlTable("issueReports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Reference to users table (nullable for anonymous reports)
  
  // Context
  originalInput: text("originalInput").notNull(), // The original input text
  actualOutput: json("actualOutput").notNull(), // { full, first, middle, last, suffix }
  expectedOutput: json("expectedOutput"), // What user expected (optional)
  issueType: mysqlEnum("issueType", [
    "credential_not_stripped",
    "credential_incorrectly_stripped",
    "name_split_wrong",
    "special_char_issue",
    "trailing_punctuation",
    "leading_punctuation",
    "other"
  ]).notNull(),
  
  // User feedback
  description: text("description"), // User's description
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low"]).default("medium").notNull(),
  
  // Analysis
  status: mysqlEnum("status", ["pending", "analyzing", "analyzed", "fixed", "wont_fix"]).default("pending").notNull(),
  pattern: varchar("pattern", { length: 255 }), // Auto-detected pattern
  fixSuggestion: text("fixSuggestion"), // AI-generated fix suggestion
  
  // Metadata
  version: varchar("version", { length: 32 }), // e.g., "v3.8.1"
  metadata: json("metadata"), // Additional context
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IssueReport = typeof issueReports.$inferSelect;
export type InsertIssueReport = typeof issueReports.$inferInsert;

/**
 * CRM Merge Jobs table (v3.35.0)
 * Tracks CRM file merging jobs with enrichment data
 */
export const crmMergeJobs = mysqlTable("crmMergeJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Reference to users table
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "cancelled"]).default("pending").notNull(),
  totalRows: int("totalRows").notNull(),
  processedRows: int("processedRows").default(0).notNull(),
  validRows: int("validRows").default(0).notNull(),
  invalidRows: int("invalidRows").default(0).notNull(),
  
  // File references
  originalFileKey: varchar("originalFileKey", { length: 512 }), // S3 key for original CRM file
  originalFileUrl: text("originalFileUrl"), // S3 URL for original file
  enrichedFileKeys: json("enrichedFileKeys"), // Array of S3 keys for enriched files
  enrichedFileUrls: json("enrichedFileUrls"), // Array of S3 URLs for enriched files
  outputFileKey: varchar("outputFileKey", { length: 512 }), // S3 key for merged output file
  outputFileUrl: text("outputFileUrl"), // S3 URL for merged output file
  
  // Configuration
  config: json("config"), // Merge configuration (identifier type, column mappings, conflict resolution)
  
  // Error handling
  errorMessage: text("errorMessage"), // Error details if failed
  
  // Timestamps
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CRMMergeJob = typeof crmMergeJobs.$inferSelect;
export type InsertCRMMergeJob = typeof crmMergeJobs.$inferInsert;
