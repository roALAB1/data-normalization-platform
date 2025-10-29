/**
 * Name Normalization Library
 * 
 * A comprehensive, modular library for normalizing person names.
 * Includes credentials, suffixes, prefixes, and utility functions.
 * 
 * Features:
 * - 750+ professional credentials from all industries
 * - Generational suffixes (Jr., Sr., II, III, etc.)
 * - Honorific titles (Dr., Mr., Mrs., etc.)
 * - Last name prefixes from multiple cultures
 * - Optimized data structures (Sets/Maps) for O(1) lookups
 * - Modular design for selective imports and tree-shaking
 * 
 * Sources:
 * - Wikipedia: List of Professional Designations in the United States
 * - FDA: Practitioner Acronym Table
 * - CompTIA, Cisco, Microsoft, AWS, Google Cloud
 * - (ISC)², ISACA, EC-Council
 * - APICS, ASQ, PMI, and other professional organizations
 */

// Export all credentials
export * from './credentials';

// Export all suffixes
export * from './suffixes';

// Export all prefixes
export * from './prefixes';

// Export Asian surnames
export * from './asian-surnames';

// Export context analysis
export * from './context-analysis';

// Re-export commonly used items for convenience
export {
  ALL_CREDENTIALS,
  CREDENTIALS_SET,
  CREDENTIALS_MAP,
  isCredential,
  getCanonicalCredential
} from './credentials';

export {
  GENERATIONAL_SUFFIXES,
  GENERATIONAL_SUFFIXES_SET,
  isGenerationalSuffix
} from './suffixes';

export {
  TITLES,
  TITLES_SET,
  isTitle,
  LAST_NAME_PREFIXES,
  LAST_NAME_PREFIXES_SET,
  isLastNamePrefix
} from './prefixes';

export {
  CHINESE_SURNAMES,
  KOREAN_SURNAMES,
  JAPANESE_SURNAMES,
  VIETNAMESE_SURNAMES,
  ALL_ASIAN_SURNAMES,
  isAsianSurname,
  detectAsianCulture,
  getAsianSurnameConfidence
} from './asian-surnames';

export {
  extractEmailDomain,
  detectCultureFromEmail,
  extractPhoneCountryCode,
  detectCultureFromPhone,
  detectCultureFromCompany,
  analyzeContext,
  boostConfidenceWithContext
} from './context-analysis';

export type { NameContext, ContextAnalysis } from './context-analysis';
