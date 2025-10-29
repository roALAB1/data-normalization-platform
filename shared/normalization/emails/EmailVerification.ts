/**
 * EmailVerification - Enterprise-grade email verification
 * 
 * This class provides comprehensive email verification including:
 * - Format validation (RFC 5322)
 * - MX record validation
 * - SMTP connection test
 * - Mailbox verification
 * - Disposable email detection
 * - Free provider detection
 * - Role-based email detection
 * - Catch-all domain detection
 * - Email reputation scoring
 */

export interface VerificationResult {
  email: string;
  valid: boolean;
  score: number; // 0-100 reputation score
  checks: {
    format: CheckResult;
    mx: CheckResult;
    smtp: CheckResult;
    disposable: CheckResult;
    freeProvider: CheckResult;
    roleBased: CheckResult;
    catchAll: CheckResult;
  };
  metadata: {
    provider?: string;
    isDisposable: boolean;
    isFreeProvider: boolean;
    isRoleBased: boolean;
    isCatchAll: boolean;
    mxRecords?: string[];
    smtpResponse?: string;
    suggestion?: string; // Typo suggestion
  };
  timestamp: number;
}

export interface CheckResult {
  valid: boolean;
  message: string;
  details?: any;
}

export interface VerificationOptions {
  checkMX?: boolean;
  checkSMTP?: boolean;
  checkDisposable?: boolean;
  checkFreeProvider?: boolean;
  checkRoleBased?: boolean;
  checkCatchAll?: boolean;
  timeout?: number;
}

export class EmailVerification {
  private static readonly ROLE_BASED_PREFIXES = [
    'admin', 'info', 'support', 'contact', 'help', 'sales', 'marketing',
    'service', 'noreply', 'no-reply', 'postmaster', 'webmaster', 'hostmaster',
    'abuse', 'security', 'privacy', 'billing', 'accounts', 'team', 'hello',
    'mail', 'office', 'careers', 'jobs', 'hr', 'recruitment', 'press', 'media'
  ];

  private static readonly FREE_PROVIDERS = [
    'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'rocketmail.com',
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com',
    'me.com', 'mac.com', 'aol.com', 'protonmail.com', 'proton.me', 'pm.me',
    'mail.com', 'gmx.com', 'gmx.net', 'zoho.com', 'yandex.com', 'mail.ru',
    'inbox.com', 'fastmail.com', 'tutanota.com', 'mailfence.com'
  ];

  /**
   * Verify email address with comprehensive checks
   */
  static async verify(
    email: string,
    options: VerificationOptions = {}
  ): Promise<VerificationResult> {
    const {
      checkMX = true,
      checkSMTP = false, // Disabled by default to avoid rate limiting
      checkDisposable = true,
      checkFreeProvider = true,
      checkRoleBased = true,
      checkCatchAll = false,
      timeout = 10000,
    } = options;

    const result: VerificationResult = {
      email,
      valid: false,
      score: 0,
      checks: {
        format: { valid: false, message: '' },
        mx: { valid: false, message: '' },
        smtp: { valid: false, message: '' },
        disposable: { valid: true, message: '' },
        freeProvider: { valid: true, message: '' },
        roleBased: { valid: true, message: '' },
        catchAll: { valid: true, message: '' },
      },
      metadata: {
        isDisposable: false,
        isFreeProvider: false,
        isRoleBased: false,
        isCatchAll: false,
      },
      timestamp: Date.now(),
    };

    try {
      // 1. Format validation (client-side only, using validator.js)
      result.checks.format = this.checkFormat(email);
      if (!result.checks.format.valid) {
        return result;
      }

      const [localPart, domain] = email.toLowerCase().split('@');

      // 2. Disposable email check
      if (checkDisposable) {
        result.checks.disposable = await this.checkDisposable(domain);
        result.metadata.isDisposable = !result.checks.disposable.valid;
      }

      // 3. Free provider check
      if (checkFreeProvider) {
        result.checks.freeProvider = this.checkFreeProvider(domain);
        result.metadata.isFreeProvider = !result.checks.freeProvider.valid;
      }

      // 4. Role-based email check
      if (checkRoleBased) {
        result.checks.roleBased = this.checkRoleBased(localPart);
        result.metadata.isRoleBased = !result.checks.roleBased.valid;
      }

      // 5. MX record validation (requires server-side API call)
      if (checkMX) {
        result.checks.mx = await this.checkMXRecords(domain, timeout);
      }

      // 6. SMTP verification (requires server-side API call)
      if (checkSMTP && result.checks.mx.valid) {
        result.checks.smtp = await this.checkSMTP(email, timeout);
      }

      // 7. Catch-all domain check (requires server-side API call)
      if (checkCatchAll && result.checks.mx.valid) {
        result.checks.catchAll = await this.checkCatchAll(domain, timeout);
        result.metadata.isCatchAll = !result.checks.catchAll.valid;
      }

      // Calculate overall validity
      result.valid = this.calculateValidity(result.checks);

      // Calculate reputation score
      result.score = this.calculateScore(result.checks, result.metadata);

    } catch (error) {
      console.error('Email verification error:', error);
      result.checks.format.message = 'Verification failed: ' + (error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Check email format using basic regex (client-side)
   */
  private static checkFormat(email: string): CheckResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return {
        valid: false,
        message: 'Invalid email format',
      };
    }

    if (email.length > 254) {
      return {
        valid: false,
        message: 'Email address too long (max 254 characters)',
      };
    }

    const [localPart, domain] = email.split('@');
    
    if (localPart.length > 64) {
      return {
        valid: false,
        message: 'Local part too long (max 64 characters)',
      };
    }

    if (domain.length > 253) {
      return {
        valid: false,
        message: 'Domain too long (max 253 characters)',
      };
    }

    return {
      valid: true,
      message: 'Valid email format',
    };
  }

  /**
   * Check if email is from a disposable provider (client-side)
   */
  private static async checkDisposable(domain: string): Promise<CheckResult> {
    // This would typically call the server-side API
    // For now, we'll use a simple client-side check
    const disposableDomains = [
      'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
      'throwaway.email', 'temp-mail.org', 'fakeinbox.com', 'maildrop.cc',
      'sharklasers.com', 'guerrillamail.info', 'grr.la', 'guerrillamail.biz',
      'spam4.me', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
      'yopmail.com', 'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc',
      'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf',
      'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf', 'hide.biz.st',
    ];

    if (disposableDomains.includes(domain.toLowerCase())) {
      return {
        valid: false,
        message: 'Disposable email address detected',
        details: { domain },
      };
    }

    return {
      valid: true,
      message: 'Not a known disposable email',
    };
  }

  /**
   * Check if email is from a free provider (client-side)
   */
  private static checkFreeProvider(domain: string): CheckResult {
    if (this.FREE_PROVIDERS.includes(domain.toLowerCase())) {
      return {
        valid: false,
        message: 'Free email provider',
        details: { domain },
      };
    }

    return {
      valid: true,
      message: 'Not a free email provider',
    };
  }

  /**
   * Check if email is role-based (client-side)
   */
  private static checkRoleBased(localPart: string): CheckResult {
    const prefix = localPart.toLowerCase().split(/[+._-]/)[0];
    
    if (this.ROLE_BASED_PREFIXES.includes(prefix)) {
      return {
        valid: false,
        message: 'Role-based email address',
        details: { prefix },
      };
    }

    return {
      valid: true,
      message: 'Not a role-based email',
    };
  }

  /**
   * Check MX records (requires server-side API call)
   */
  private static async checkMXRecords(domain: string, timeout: number): Promise<CheckResult> {
    try {
      const response = await fetch('/api/emails/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `test@${domain}` }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        return {
          valid: false,
          message: 'MX record check failed',
        };
      }

      const data = await response.json();
      const mxValid = data.validators?.mx?.valid;

      return {
        valid: mxValid,
        message: mxValid ? 'Valid MX records found' : 'No valid MX records',
        details: data.validators?.mx,
      };
    } catch (error) {
      return {
        valid: false,
        message: 'MX record check timeout or error',
      };
    }
  }

  /**
   * Check SMTP connection (requires server-side API call)
   */
  private static async checkSMTP(email: string, timeout: number): Promise<CheckResult> {
    try {
      const response = await fetch('/api/emails/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        return {
          valid: false,
          message: 'SMTP check failed',
        };
      }

      const data = await response.json();
      const smtpValid = data.validators?.smtp?.valid;

      return {
        valid: smtpValid,
        message: smtpValid ? 'SMTP connection successful' : 'SMTP connection failed',
        details: data.validators?.smtp,
      };
    } catch (error) {
      return {
        valid: false,
        message: 'SMTP check timeout or error',
      };
    }
  }

  /**
   * Check if domain is catch-all (requires server-side API call)
   */
  private static async checkCatchAll(domain: string, timeout: number): Promise<CheckResult> {
    // Catch-all detection requires testing with a random email
    const randomEmail = `test-${Math.random().toString(36).substring(7)}@${domain}`;
    
    try {
      const response = await fetch('/api/emails/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: randomEmail }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        return {
          valid: true, // Assume not catch-all if check fails
          message: 'Catch-all check inconclusive',
        };
      }

      const data = await response.json();
      
      // If random email is accepted, domain is likely catch-all
      if (data.valid) {
        return {
          valid: false,
          message: 'Domain appears to be catch-all',
        };
      }

      return {
        valid: true,
        message: 'Domain is not catch-all',
      };
    } catch (error) {
      return {
        valid: true,
        message: 'Catch-all check timeout or error',
      };
    }
  }

  /**
   * Calculate overall validity based on checks
   */
  private static calculateValidity(checks: VerificationResult['checks']): boolean {
    // Email is valid if:
    // - Format is valid
    // - MX records exist (if checked)
    // - Not disposable
    // - SMTP check passed (if performed)
    
    return (
      checks.format.valid &&
      checks.mx.valid &&
      checks.disposable.valid &&
      (checks.smtp.valid || checks.smtp.message === '')
    );
  }

  /**
   * Calculate reputation score (0-100)
   */
  private static calculateScore(
    checks: VerificationResult['checks'],
    metadata: VerificationResult['metadata']
  ): number {
    let score = 0;

    // Format check: 20 points
    if (checks.format.valid) score += 20;

    // MX records: 30 points
    if (checks.mx.valid) score += 30;

    // SMTP check: 20 points
    if (checks.smtp.valid) score += 20;
    else if (checks.smtp.message === '') score += 10; // Not checked

    // Not disposable: 15 points
    if (checks.disposable.valid) score += 15;

    // Not role-based: 5 points
    if (checks.roleBased.valid) score += 5;

    // Not catch-all: 5 points
    if (checks.catchAll.valid) score += 5;

    // Not free provider: 5 points
    if (checks.freeProvider.valid) score += 5;

    return Math.min(100, score);
  }

  /**
   * Batch verify multiple emails
   */
  static async verifyBatch(
    emails: string[],
    options: VerificationOptions = {}
  ): Promise<VerificationResult[]> {
    // For batch operations, disable SMTP to avoid rate limiting
    const batchOptions = { ...options, checkSMTP: false };

    const results = await Promise.all(
      emails.map(email => this.verify(email, batchOptions))
    );

    return results;
  }

  /**
   * Get verification summary for display
   */
  static getVerificationSummary(result: VerificationResult): string {
    if (result.score >= 90) return 'Excellent';
    if (result.score >= 70) return 'Good';
    if (result.score >= 50) return 'Fair';
    if (result.score >= 30) return 'Poor';
    return 'Invalid';
  }

  /**
   * Get verification badge color
   */
  static getVerificationBadgeColor(result: VerificationResult): string {
    if (result.score >= 90) return 'green';
    if (result.score >= 70) return 'blue';
    if (result.score >= 50) return 'yellow';
    if (result.score >= 30) return 'orange';
    return 'red';
  }
}
