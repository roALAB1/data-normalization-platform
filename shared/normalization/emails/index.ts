/**
 * Email Normalization Library
 * 
 * Comprehensive data and utilities for normalizing email addresses using validator.js.
 * 
 * Features:
 * - RFC 5322 compliant validation
 * - Provider-specific normalization rules (Gmail, Outlook, Yahoo, iCloud, etc.)
 * - Plus tag extraction and removal
 * - Dot removal (Gmail-specific)
 * - Case normalization
 */

// Export main EmailEnhanced class
export { EmailEnhanced } from './EmailEnhanced';
export type { EmailProvider, ProviderRules, EmailNormalizationResult } from './EmailEnhanced';

// Common email providers
export const EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'rocketmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'pm.me',
  'fastmail.com',
  'fastmail.fm',
  'zoho.com',
  'zohomail.com',
]);

// Common typos for email domains
export const EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'outloo.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'hotmial.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'icoud.com': 'icloud.com',
  'iclod.com': 'icloud.com',
  'aoll.com': 'aol.com',
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
