// @ts-nocheck
import { Router } from 'express';
import { db } from '../db';
import { credentialIssues, credentialUsage } from '../../drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/credentials/report-issue
 * Report an issue with credential stripping
 */
router.post('/report-issue', async (req, res) => {
  try {
    const {
      issueType,
      originalText,
      expectedOutput,
      actualOutput,
      credentialText,
      description
    } = req.body;

    // Validation
    if (!issueType || !originalText) {
      return res.status(400).json({
        error: 'Missing required fields: issueType, originalText'
      });
    }

    // Get userId from session if authenticated
    const userId = (req.session as any)?.user?.id || null;

    // Insert issue
    const [issue] = await db.insert(credentialIssues).values({
      userId,
      issueType,
      originalText,
      expectedOutput,
      actualOutput,
      credentialText,
      description,
      status: 'pending'
    });

    // If a credential was specified, track it
    if (credentialText) {
      await trackCredentialUsage(credentialText);
    }

    res.json({
      success: true,
      issueId: issue.insertId,
      message: 'Thank you for reporting this issue! We will review it shortly.'
    });
  } catch (error) {
    console.error('Error reporting credential issue:', error);
    res.status(500).json({
      error: 'Failed to report issue'
    });
  }
});

/**
 * GET /api/credentials/issues
 * Get all reported issues (admin only)
 */
router.get('/issues', async (req, res) => {
  try {
    // Check if user is admin
    const user = (req.session as any)?.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const issues = await db
      .select()
      .from(credentialIssues)
      .orderBy(desc(credentialIssues.createdAt))
      .limit(100);

    res.json({ issues });
  } catch (error) {
    console.error('Error fetching credential issues:', error);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

/**
 * GET /api/credentials/usage
 * Get credential usage statistics (admin only)
 */
router.get('/usage', async (req, res) => {
  try {
    // Check if user is admin
    const user = (req.session as any)?.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const usage = await db
      .select()
      .from(credentialUsage)
      .orderBy(desc(credentialUsage.occurrenceCount))
      .limit(100);

    res.json({ usage });
  } catch (error) {
    console.error('Error fetching credential usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

/**
 * Helper function to track credential usage
 */
async function trackCredentialUsage(credential: string) {
  try {
    // Check if credential already exists
    const existing = await db
      .select()
      .from(credentialUsage)
      .where(eq(credentialUsage.credential, credential))
      .limit(1);

    if (existing.length > 0) {
      // Increment occurrence count
      await db
        .update(credentialUsage)
        .set({
          occurrenceCount: sql`${credentialUsage.occurrenceCount} + 1`,
          lastSeen: new Date()
        })
        .where(eq(credentialUsage.credential, credential));
    } else {
      // Insert new credential
      await db.insert(credentialUsage).values({
        credential,
        occurrenceCount: 1,
        lastSeen: new Date(),
        isInList: false
      });
    }
  } catch (error) {
    console.error('Error tracking credential usage:', error);
  }
}

export default router;
