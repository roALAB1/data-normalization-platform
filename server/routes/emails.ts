import { Router } from 'express';
import { emailValidator } from '@devmehq/email-validator-js';

const router = Router();

/**
 * POST /api/emails/verify
 * Verify a single email address with comprehensive checks
 */
router.post('/verify', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email address is required',
      });
    }

    // Perform comprehensive email verification
    const result = await emailValidator.verify(email, {
      validateRegex: true,
      validateMx: true,
      validateTypo: true,
      validateDisposable: true,
      validateSMTP: true,
      timeout: 10000, // 10 second timeout
    });

    return res.json({
      email,
      valid: result.valid,
      validators: result.validators,
      reason: result.reason,
      // Additional metadata
      metadata: {
        isDisposable: result.validators?.disposable?.valid === false,
        isFreeProvider: result.validators?.mx?.valid && result.validators?.smtp?.valid,
        hasTypoSuggestion: result.validators?.typo?.valid === false,
        typoSuggestion: result.validators?.typo?.reason,
        mxRecords: result.validators?.mx?.reason,
        smtpCheck: result.validators?.smtp?.reason,
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      error: 'Email verification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/emails/verify-batch
 * Verify multiple email addresses
 */
router.post('/verify-batch', async (req, res) => {
  try {
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'Emails array is required',
      });
    }

    if (emails.length > 100) {
      return res.status(400).json({
        error: 'Maximum 100 emails per batch',
      });
    }

    // Verify all emails with concurrency control
    const results = await emailValidator.verifyBatch(emails, {
      validateRegex: true,
      validateMx: true,
      validateTypo: true,
      validateDisposable: true,
      validateSMTP: false, // Disable SMTP for batch to avoid rate limiting
      timeout: 5000,
      concurrency: 10, // Process 10 at a time
    });

    // Transform results
    const transformedResults = results.map((result) => ({
      email: result.email,
      valid: result.valid,
      validators: result.validators,
      reason: result.reason,
      metadata: {
        isDisposable: result.validators?.disposable?.valid === false,
        hasTypoSuggestion: result.validators?.typo?.valid === false,
        typoSuggestion: result.validators?.typo?.reason,
        mxRecords: result.validators?.mx?.reason,
      },
    }));

    // Calculate statistics
    const stats = {
      total: transformedResults.length,
      valid: transformedResults.filter((r) => r.valid).length,
      invalid: transformedResults.filter((r) => !r.valid).length,
      disposable: transformedResults.filter((r) => r.metadata.isDisposable).length,
      withTypos: transformedResults.filter((r) => r.metadata.hasTypoSuggestion).length,
    };

    return res.json({
      results: transformedResults,
      stats,
    });
  } catch (error) {
    console.error('Batch email verification error:', error);
    return res.status(500).json({
      error: 'Batch email verification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/emails/check-disposable
 * Quick check if email is from a disposable provider
 */
router.post('/check-disposable', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email address is required',
      });
    }

    const result = await emailValidator.verify(email, {
      validateRegex: true,
      validateDisposable: true,
      validateMx: false,
      validateSMTP: false,
      validateTypo: false,
    });

    return res.json({
      email,
      isDisposable: result.validators?.disposable?.valid === false,
      reason: result.validators?.disposable?.reason,
    });
  } catch (error) {
    console.error('Disposable check error:', error);
    return res.status(500).json({
      error: 'Disposable check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
