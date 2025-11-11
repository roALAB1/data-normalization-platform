/**
 * Data Quality Analyzer
 * 
 * v3.14.1: Analyzes actual data quality in columns to make intelligent decisions
 * about which columns to use as source data.
 * 
 * This solves the problem where:
 * - "Name" column has job titles mixed in
 * - "First Name" column is clean
 * - "Last Name" column has job titles instead of names
 * 
 * Instead of blindly following schema rules, we analyze the data and choose
 * the best source for each output field.
 */

export interface QualityMetrics {
  completeness: number; // 0-100: % of non-empty values
  validity: number; // 0-100: % of values that look valid for this type
  cleanliness: number; // 0-100: % of values without junk (job titles, special chars, etc.)
  overall: number; // 0-100: weighted average of above
  issues: string[]; // List of detected issues
}

const JOB_KEYWORDS = [
  'Chief', 'Officer', 'Director', 'Manager', 'President', 'Chair', 'Board',
  'Founder', 'CEO', 'CFO', 'COO', 'CTO', 'VP', 'Specialist', 'Consultant',
  'Partner', 'Operations', 'Division', 'Department', 'Head', 'Lead', 'Supervisor',
  'Administrator', 'Executive', 'Advisor', 'Expert', 'Speaker', 'Keynote',
  'TEDx', 'Author', 'Coach', 'Photographer', 'Owner', 'Content', 'Coaches',
  'Strategist', 'Branding', 'Visibility', 'Mentor', 'Leadership', 'Talent',
  'Coaching', 'Doctor', 'Creator', 'Adviser', 'Innovation', 'Planning',
  'Business', 'Sales', 'Transformational', 'Somatic', 'Breathwork', 'Admission',
  'Success', 'Clarity', 'Online', 'Chiropractor'
];

const COMMON_LAST_NAMES = [
  'Cook', 'Cooper', 'Coombes', 'Cooney', 'Coolidge', 'McCool',
  'Coope', 'Coon', 'Boardman', 'Bradley-Cook', 'Headrick',
  'Leadbetter', 'Proctor', 'Victor', 'Connector', 'Cooch',
  'Factor', 'Leady'
];

/**
 * Check if a value contains job title keywords
 */
function hasJobTitle(value: string): boolean {
  if (!value) return false;
  
  // Check for whole-word matches
  return JOB_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(value);
  });
}

/**
 * Check if a value is likely a job title (not a name)
 */
function isLikelyJobTitle(value: string): boolean {
  if (!value) return false;
  
  const trimmed = value.trim();
  const wordCount = trimmed.split(/\s+/).length;
  
  // Check if it's a common last name (false positive)
  if (COMMON_LAST_NAMES.some(name => name.toLowerCase() === trimmed.toLowerCase())) {
    return false;
  }
  
  // Single word job titles
  const singleWordTitles = ['Coach', 'Coaches', 'Strategist', 'Mentor', 'Author', 'Leadership', 'Chiropractor', 'Doctor', 'Creator'];
  if (wordCount === 1 && singleWordTitles.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
    return true;
  }
  
  // Multi-word with job keywords
  if (wordCount > 1 && hasJobTitle(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a value has unwanted special characters
 */
function hasSpecialChars(value: string): boolean {
  if (!value) return false;
  // Bullets, emojis, Excel errors, etc.
  return /[•●▪▫‣⭐️™#?]{2,}|#NAME\?/.test(value);
}

/**
 * Analyze quality of a first name column
 */
export function analyzeFirstNameQuality(values: string[]): QualityMetrics {
  const issues: string[] = [];
  let completeness = 0;
  let validity = 0;
  let cleanliness = 0;
  
  const nonEmpty = values.filter(v => v && v.trim());
  completeness = (nonEmpty.length / values.length) * 100;
  
  // Check validity: should be 1-3 words, mostly letters
  const validCount = nonEmpty.filter(v => {
    const wordCount = v.trim().split(/\s+/).length;
    const hasLetters = /[a-zA-Z]/.test(v);
    return wordCount <= 3 && hasLetters;
  }).length;
  validity = nonEmpty.length > 0 ? (validCount / nonEmpty.length) * 100 : 0;
  
  // Check cleanliness: no job titles, no special chars
  const cleanCount = nonEmpty.filter(v => {
    return !hasJobTitle(v) && !hasSpecialChars(v);
  }).length;
  cleanliness = nonEmpty.length > 0 ? (cleanCount / nonEmpty.length) * 100 : 0;
  
  // Detect issues
  if (completeness < 90) issues.push('incomplete');
  if (validity < 90) issues.push('invalid_format');
  if (cleanliness < 90) issues.push('has_junk');
  
  const overall = (completeness * 0.3 + validity * 0.3 + cleanliness * 0.4);
  
  return { completeness, validity, cleanliness, overall, issues };
}

/**
 * Analyze quality of a last name column
 */
export function analyzeLastNameQuality(values: string[]): QualityMetrics {
  const issues: string[] = [];
  let completeness = 0;
  let validity = 0;
  let cleanliness = 0;
  
  const nonEmpty = values.filter(v => v && v.trim());
  completeness = (nonEmpty.length / values.length) * 100;
  
  // Check validity: should be 1-3 words, mostly letters
  const validCount = nonEmpty.filter(v => {
    const wordCount = v.trim().split(/\s+/).length;
    const hasLetters = /[a-zA-Z]/.test(v);
    return wordCount <= 3 && hasLetters;
  }).length;
  validity = nonEmpty.length > 0 ? (validCount / nonEmpty.length) * 100 : 0;
  
  // Check cleanliness: no job titles (this is the critical check!)
  const cleanCount = nonEmpty.filter(v => {
    return !isLikelyJobTitle(v) && !hasSpecialChars(v);
  }).length;
  cleanliness = nonEmpty.length > 0 ? (cleanCount / nonEmpty.length) * 100 : 0;
  
  // Detect issues
  if (completeness < 90) issues.push('incomplete');
  if (validity < 90) issues.push('invalid_format');
  if (cleanliness < 95) issues.push('has_job_titles'); // Stricter for last names
  
  const overall = (completeness * 0.3 + validity * 0.3 + cleanliness * 0.4);
  
  return { completeness, validity, cleanliness, overall, issues };
}

/**
 * Analyze quality of a full name column
 */
export function analyzeFullNameQuality(values: string[]): QualityMetrics {
  const issues: string[] = [];
  let completeness = 0;
  let validity = 0;
  let cleanliness = 0;
  
  const nonEmpty = values.filter(v => v && v.trim());
  completeness = (nonEmpty.length / values.length) * 100;
  
  // Check validity: should have at least 2 words (first + last)
  const validCount = nonEmpty.filter(v => {
    const wordCount = v.trim().split(/\s+/).length;
    return wordCount >= 2;
  }).length;
  validity = nonEmpty.length > 0 ? (validCount / nonEmpty.length) * 100 : 0;
  
  // Check cleanliness: may have job titles but should be parseable
  const cleanCount = nonEmpty.filter(v => {
    return !hasSpecialChars(v);
  }).length;
  cleanliness = nonEmpty.length > 0 ? (cleanCount / nonEmpty.length) * 100 : 0;
  
  // Detect issues
  if (completeness < 90) issues.push('incomplete');
  if (validity < 90) issues.push('single_word_names');
  if (cleanliness < 90) issues.push('has_special_chars');
  
  const overall = (completeness * 0.4 + validity * 0.3 + cleanliness * 0.3);
  
  return { completeness, validity, cleanliness, overall, issues };
}

/**
 * Analyze column quality based on type
 */
export function analyzeColumnQuality(
  columnName: string,
  columnType: 'name' | 'first-name' | 'last-name' | 'email' | 'phone' | 'address' | 'location' | 'company' | 'unknown',
  values: string[]
): QualityMetrics {
  switch (columnType) {
    case 'first-name':
      return analyzeFirstNameQuality(values);
    case 'last-name':
      return analyzeLastNameQuality(values);
    case 'name':
      return analyzeFullNameQuality(values);
    default:
      // For other types, just check completeness
      const nonEmpty = values.filter(v => v && v.trim());
      const completeness = (nonEmpty.length / values.length) * 100;
      return {
        completeness,
        validity: 100,
        cleanliness: 100,
        overall: completeness,
        issues: completeness < 90 ? ['incomplete'] : []
      };
  }
}
