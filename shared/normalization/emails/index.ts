/**
 * Email Normalization Library
 * 
 * Comprehensive data and utilities for normalizing email addresses.
 * 
 * TODO: Implement email-specific normalization data:
 * - Common email providers and their domains
 * - Disposable email domains
 * - Corporate email patterns
 * - TLD (Top-Level Domain) validation
 * - Email alias handling (+ addressing, dots in Gmail, etc.)
 * - Typo correction for common domains
 */

// Common email providers
export const EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'icloud.com',
  'protonmail.com',
  // ... more providers
]);

// Common typos for email domains
export const EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'outloo.com': 'outlook.com',
  // ... more typos
};

/**
 * Check if an email domain is from a known provider
 */
export function isKnownProvider(domain: string): boolean {
  return EMAIL_PROVIDERS.has(domain.toLowerCase());
}

/**
 * Correct common email domain typos
 */
export function correctEmailDomain(domain: string): string {
  return EMAIL_DOMAIN_TYPOS[domain.toLowerCase()] || domain;
}
