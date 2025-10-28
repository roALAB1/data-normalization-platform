/**
 * Company Normalization Library
 * 
 * Comprehensive data and utilities for normalizing company names.
 * 
 * TODO: Implement company-specific normalization data:
 * - Legal entity types (LLC, Inc., Corp., Ltd., etc.)
 * - Industry classifications (NAICS, SIC codes)
 * - Common company name variations
 * - Subsidiary and parent company relationships
 * - Company aliases and DBA (Doing Business As) names
 */

// Legal entity suffixes
export const LEGAL_ENTITIES = new Set([
  'LLC',
  'Inc',
  'Inc.',
  'Incorporated',
  'Corp',
  'Corp.',
  'Corporation',
  'Ltd',
  'Ltd.',
  'Limited',
  'LLP',
  'LP',
  'PC',
  'P.C.',
  'PLLC',
  'Co',
  'Co.',
  'Company',
  'GmbH',
  'AG',
  'SA',
  'SAS',
  'SARL',
  'PLC',
  // ... more entity types
]);

// Common company name abbreviations
export const COMPANY_ABBREVIATIONS: Record<string, string> = {
  '&': 'and',
  'Bros': 'Brothers',
  'Mfg': 'Manufacturing',
  'Intl': 'International',
  'Natl': 'National',
  // ... more abbreviations
};

/**
 * Check if a string is a legal entity suffix
 */
export function isLegalEntity(suffix: string): boolean {
  return LEGAL_ENTITIES.has(suffix.replace(/\./g, ''));
}

/**
 * Expand company name abbreviations
 */
export function expandAbbreviations(name: string): string {
  let expanded = name;
  for (const [abbr, full] of Object.entries(COMPANY_ABBREVIATIONS)) {
    expanded = expanded.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), full);
  }
  return expanded;
}
