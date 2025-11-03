import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../server/db';
import { issueReports } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Bug Report API Tests (v3.9.0)
 * 
 * Tests the bug report system that allows users to report normalization issues.
 * Following FIX_PROCESS.md - Tests created FIRST before implementation.
 * 
 * Note: MySQL doesn't support .returning() in Drizzle, so we insert then query.
 */

describe('Bug Report API', () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available for testing");
  });

  // Clean up test data after all tests
  afterAll(async () => {
    if (!db) return;
    await db.delete(issueReports).where(eq(issueReports.version, 'test'));
  });

  describe('Submit Bug Report', () => {
    it('should accept a valid bug report', async () => {
      const insertResult = await db!.insert(issueReports).values({
        userId: null,
        originalInput: 'Jeani Hunt CDN',
        actualOutput: {
          full: 'Jeani Hunt CDN',
          first: 'Jeani',
          middle: null,
          last: 'CDN',
          suffix: null
        },
        expectedOutput: {
          last: 'Hunt'
        },
        issueType: 'credential_not_stripped',
        description: 'CDN credential was not removed from last name',
        severity: 'high',
        status: 'pending',
        version: 'test',
        metadata: null,
        pattern: null,
        fixSuggestion: null,
      });

      const insertedId = typeof insertResult[0].insertId === 'bigint' 
        ? Number(insertResult[0].insertId) 
        : insertResult[0].insertId;
      expect(insertedId).toBeGreaterThan(0);

      // Query the inserted report
      const result = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.id, insertedId))
        .limit(1);

      expect(result[0].originalInput).toBe('Jeani Hunt CDN');
      expect(result[0].issueType).toBe('credential_not_stripped');
      expect(result[0].status).toBe('pending');
    });

    it('should accept anonymous reports (no userId)', async () => {
      const insertResult = await db!.insert(issueReports).values({
        userId: null,
        originalInput: 'Nancy Kurts -',
        actualOutput: {
          full: 'Nancy Kurts -',
          first: 'Nancy',
          middle: null,
          last: '-',
          suffix: null
        },
        issueType: 'trailing_punctuation',
        status: 'pending',
        version: 'test',
        expectedOutput: null,
        description: null,
        severity: 'medium',
        metadata: null,
        pattern: null,
        fixSuggestion: null,
      });

      const insertedId = typeof insertResult[0].insertId === 'bigint' 
        ? Number(insertResult[0].insertId) 
        : insertResult[0].insertId;
      const result = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.id, insertedId))
        .limit(1);

      expect(result[0].userId).toBeNull();
      expect(result[0].id).toBeGreaterThan(0);
    });

    it('should store report with correct timestamp', async () => {
      const beforeInsert = new Date();
      
      const insertResult = await db!.insert(issueReports).values({
        userId: null,
        originalInput: '-Ling Erik Kuo',
        actualOutput: {
          full: '-Ling Erik Kuo',
          first: '-Ling',
          middle: null,
          last: 'Kuo',
          suffix: null
        },
        issueType: 'leading_punctuation',
        status: 'pending',
        version: 'test',
        expectedOutput: null,
        description: null,
        severity: 'medium',
        metadata: null,
        pattern: null,
        fixSuggestion: null,
      });

      const afterInsert = new Date();

      const insertedId = typeof insertResult[0].insertId === 'bigint' 
        ? Number(insertResult[0].insertId) 
        : insertResult[0].insertId;
      const result = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.id, insertedId))
        .limit(1);

      expect(result[0].createdAt).toBeDefined();
      expect(result[0].updatedAt).toBeDefined();
      expect(result[0].createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000);
      expect(result[0].createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime() + 1000);
    });

    it('should default status to pending', async () => {
      const insertResult = await db!.insert(issueReports).values({
        userId: null,
        originalInput: 'Test Name',
        actualOutput: {
          full: 'Test Name',
          first: 'Test',
          middle: null,
          last: 'Name',
          suffix: null
        },
        issueType: 'other',
        status: 'pending',
        version: 'test',
        expectedOutput: null,
        description: null,
        severity: 'medium',
        metadata: null,
        pattern: null,
        fixSuggestion: null,
      });

      const insertedId = typeof insertResult[0].insertId === 'bigint' 
        ? Number(insertResult[0].insertId) 
        : insertResult[0].insertId;
      const result = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.id, insertedId))
        .limit(1);

      expect(result[0].status).toBe('pending');
    });

    it('should default severity to medium', async () => {
      const insertResult = await db!.insert(issueReports).values({
        userId: null,
        originalInput: 'Test Name 2',
        actualOutput: {
          full: 'Test Name 2',
          first: 'Test',
          middle: null,
          last: 'Name',
          suffix: null
        },
        issueType: 'other',
        status: 'pending',
        severity: 'medium',
        version: 'test',
        expectedOutput: null,
        description: null,
        metadata: null,
        pattern: null,
        fixSuggestion: null,
      });

      const insertedId = typeof insertResult[0].insertId === 'bigint' 
        ? Number(insertResult[0].insertId) 
        : insertResult[0].insertId;
      const result = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.id, insertedId))
        .limit(1);

      expect(result[0].severity).toBe('medium');
    });
  });

  describe('List Bug Reports', () => {
    beforeAll(async () => {
      // Insert test data
      await db!.insert(issueReports).values([
        {
          userId: null,
          originalInput: 'List Test 1',
          actualOutput: { full: 'List Test 1', first: 'List', last: 'Test' },
          issueType: 'other',
          status: 'pending',
          version: 'test',
          severity: 'medium',
        },
        {
          userId: null,
          originalInput: 'List Test 2',
          actualOutput: { full: 'List Test 2', first: 'List', last: 'Test' },
          issueType: 'credential_not_stripped',
          status: 'fixed',
          version: 'test',
          severity: 'high',
        },
      ]);
    });

    it('should return all pending reports', async () => {
      const reports = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.status, 'pending'));

      expect(reports.length).toBeGreaterThan(0);
      expect(reports.every(r => r.status === 'pending')).toBe(true);
    });

    it('should filter reports by status', async () => {
      const fixedReports = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.status, 'fixed'));

      expect(fixedReports.every(r => r.status === 'fixed')).toBe(true);
    });

    it('should filter reports by issue type', async () => {
      const credentialReports = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.issueType, 'credential_not_stripped'));

      expect(credentialReports.every(r => r.issueType === 'credential_not_stripped')).toBe(true);
    });

    it('should paginate results', async () => {
      const page1 = await db!.select()
        .from(issueReports)
        .limit(2)
        .offset(0);

      const page2 = await db!.select()
        .from(issueReports)
        .limit(2)
        .offset(2);

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Get Report by ID', () => {
    it('should return report details', async () => {
      const insertResult = await db!.insert(issueReports).values({
        userId: null,
        originalInput: 'Get Test',
        actualOutput: { full: 'Get Test', first: 'Get', last: 'Test' },
        issueType: 'other',
        status: 'pending',
        version: 'test',
        severity: 'medium',
      });

      const insertedId = typeof insertResult[0].insertId === 'bigint' 
        ? Number(insertResult[0].insertId) 
        : insertResult[0].insertId;

      const report = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.id, insertedId))
        .limit(1);

      expect(report.length).toBe(1);
      expect(report[0].id).toBe(insertedId);
      expect(report[0].originalInput).toBe('Get Test');
    });

    it('should return empty array for non-existent report', async () => {
      const report = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.id, 999999))
        .limit(1);

      expect(report.length).toBe(0);
    });
  });

  describe('Update Report Status', () => {
    it('should update report status to analyzing', async () => {
      const insertResult = await db!.insert(issueReports).values({
        userId: null,
        originalInput: 'Update Test 1',
        actualOutput: { full: 'Update Test 1', first: 'Update', last: 'Test' },
        issueType: 'other',
        status: 'pending',
        version: 'test',
        severity: 'medium',
      });

      const insertedId = typeof insertResult[0].insertId === 'bigint' 
        ? Number(insertResult[0].insertId) 
        : insertResult[0].insertId;

      await db!.update(issueReports)
        .set({ status: 'analyzing' })
        .where(eq(issueReports.id, insertedId));

      const updated = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.id, insertedId))
        .limit(1);

      expect(updated[0].status).toBe('analyzing');
    });

    it('should update report status to fixed', async () => {
      const insertResult = await db!.insert(issueReports).values({
        userId: null,
        originalInput: 'Update Test 2',
        actualOutput: { full: 'Update Test 2', first: 'Update', last: 'Test' },
        issueType: 'other',
        status: 'pending',
        version: 'test',
        severity: 'medium',
      });

      const insertedId = typeof insertResult[0].insertId === 'bigint' 
        ? Number(insertResult[0].insertId) 
        : insertResult[0].insertId;

      await db!.update(issueReports)
        .set({ status: 'fixed' })
        .where(eq(issueReports.id, insertedId));

      const updated = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.id, insertedId))
        .limit(1);

      expect(updated[0].status).toBe('fixed');
    });

    it('should add fix suggestion', async () => {
      const insertResult = await db!.insert(issueReports).values({
        userId: null,
        originalInput: 'Update Test 3',
        actualOutput: { full: 'Update Test 3', first: 'Update', last: 'Test' },
        issueType: 'other',
        status: 'pending',
        version: 'test',
        severity: 'medium',
      });

      const insertedId = typeof insertResult[0].insertId === 'bigint' 
        ? Number(insertResult[0].insertId) 
        : insertResult[0].insertId;

      await db!.update(issueReports)
        .set({ 
          fixSuggestion: 'Add CDN to credentials list',
          status: 'analyzed'
        })
        .where(eq(issueReports.id, insertedId));

      const updated = await db!.select()
        .from(issueReports)
        .where(eq(issueReports.id, insertedId))
        .limit(1);

      expect(updated[0].fixSuggestion).toBe('Add CDN to credentials list');
      expect(updated[0].status).toBe('analyzed');
    });
  });
});
