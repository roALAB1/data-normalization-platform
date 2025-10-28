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
  type: mysqlEnum("type", ["name", "phone", "email", "company", "address"]).notNull(),
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