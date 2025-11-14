// @ts-nocheck
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { issueReports } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Bug Report Router (v3.9.0)
 * 
 * Handles bug report submission and management for the name normalization system.
 * Allows users to report issues directly from the UI with full context.
 */

// Validation schemas
const issueTypeEnum = z.enum([
  "credential_not_stripped",
  "credential_incorrectly_stripped",
  "name_split_wrong",
  "special_char_issue",
  "trailing_punctuation",
  "leading_punctuation",
  "other"
]);

const severityEnum = z.enum(["critical", "high", "medium", "low"]);
const statusEnum = z.enum(["pending", "analyzing", "analyzed", "fixed", "wont_fix"]);

const submitReportSchema = z.object({
  originalInput: z.string().min(1, "Original input is required"),
  actualOutput: z.object({
    full: z.string().nullable(),
    first: z.string().nullable(),
    middle: z.string().nullable(),
    last: z.string().nullable(),
    suffix: z.string().nullable(),
  }),
  expectedOutput: z.object({
    full: z.string().optional(),
    first: z.string().optional(),
    middle: z.string().optional(),
    last: z.string().optional(),
    suffix: z.string().optional(),
  }).optional(),
  issueType: issueTypeEnum,
  description: z.string().optional(),
  severity: severityEnum.optional(),
  version: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const reportRouter = router({
  /**
   * Submit a new bug report
   * Public endpoint - allows anonymous reports
   */
  submit: publicProcedure
    .input(submitReportSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(issueReports).values({
        userId: ctx.user?.id || null,
        originalInput: input.originalInput,
        actualOutput: input.actualOutput,
        expectedOutput: input.expectedOutput || null,
        issueType: input.issueType,
        description: input.description || null,
        severity: input.severity || "medium",
        status: "pending",
        version: input.version || null,
        metadata: input.metadata || null,
      });

      return {
        success: true,
        reportId: Number(result[0].insertId),
        message: "Bug report submitted successfully. Thank you for your feedback!"
      };
    }),

  /**
   * List bug reports
   * Optional filters: status, issueType
   * Supports pagination
   */
  list: publicProcedure
    .input(z.object({
      status: statusEnum.optional(),
      issueType: issueTypeEnum.optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const filters = [];
      
      if (input?.status) {
        filters.push(eq(issueReports.status, input.status));
      }
      
      if (input?.issueType) {
        filters.push(eq(issueReports.issueType, input.issueType));
      }

      const reports = await db.select()
        .from(issueReports)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(issueReports.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return {
        reports,
        count: reports.length,
      };
    }),

  /**
   * Get a single report by ID
   */
  getById: publicProcedure
    .input(z.object({
      id: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const report = await db.select()
        .from(issueReports)
        .where(eq(issueReports.id, input.id))
        .limit(1);

      if (report.length === 0) {
        throw new Error("Report not found");
      }

      return report[0];
    }),

  /**
   * Update report status
   * Protected - requires authentication
   */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: statusEnum,
      fixSuggestion: z.string().optional(),
      pattern: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(issueReports)
        .set({
          status: input.status,
          fixSuggestion: input.fixSuggestion || null,
          pattern: input.pattern || null,
        })
        .where(eq(issueReports.id, input.id));

      // Fetch the updated report
      const updated = await db.select()
        .from(issueReports)
        .where(eq(issueReports.id, input.id))
        .limit(1);

      if (updated.length === 0) {
        throw new Error("Report not found");
      }

      return {
        success: true,
        report: updated[0],
      };
    }),

  /**
   * Get report statistics
   * Useful for dashboard
   */
  stats: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const allReports = await db.select().from(issueReports);

      const stats = {
        total: allReports.length,
        byStatus: {
          pending: allReports.filter(r => r.status === "pending").length,
          analyzing: allReports.filter(r => r.status === "analyzing").length,
          analyzed: allReports.filter(r => r.status === "analyzed").length,
          fixed: allReports.filter(r => r.status === "fixed").length,
          wont_fix: allReports.filter(r => r.status === "wont_fix").length,
        },
        byIssueType: {
          credential_not_stripped: allReports.filter(r => r.issueType === "credential_not_stripped").length,
          credential_incorrectly_stripped: allReports.filter(r => r.issueType === "credential_incorrectly_stripped").length,
          name_split_wrong: allReports.filter(r => r.issueType === "name_split_wrong").length,
          special_char_issue: allReports.filter(r => r.issueType === "special_char_issue").length,
          trailing_punctuation: allReports.filter(r => r.issueType === "trailing_punctuation").length,
          leading_punctuation: allReports.filter(r => r.issueType === "leading_punctuation").length,
          other: allReports.filter(r => r.issueType === "other").length,
        },
        bySeverity: {
          critical: allReports.filter(r => r.severity === "critical").length,
          high: allReports.filter(r => r.severity === "high").length,
          medium: allReports.filter(r => r.severity === "medium").length,
          low: allReports.filter(r => r.severity === "low").length,
        },
      };

      return stats;
    }),
});
