/**
 * Generational Suffixes
 * Used to denote family lineage (Jr., Sr., II, III, etc.)
 */

export const GENERATIONAL_SUFFIXES = [
  // Junior/Senior
  "Jr", "Jr.", "Junior",
  "Sr", "Sr.", "Senior",
  
  // Roman Numerals
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV",
  
  // Ordinal Numbers
  "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"
] as const;

// Create a Set for O(1) lookup
export const GENERATIONAL_SUFFIXES_SET = new Set(GENERATIONAL_SUFFIXES);

/**
 * Check if a string is a generational suffix
 * @param value - The string to check
 * @param caseSensitive - For Roman numerals, case-sensitive matching (default: true for Roman, false for Jr/Sr)
 * @returns true if the value is a generational suffix
 */
export function isGenerationalSuffix(value: string): boolean {
  // Roman numerals are case-sensitive
  if (/^[IVX]+$/.test(value)) {
    return GENERATIONAL_SUFFIXES_SET.has(value as any);
  }
  
  // Jr/Sr/Junior/Senior are case-insensitive
  const normalized = value.replace(/\./g, '').toLowerCase();
  return GENERATIONAL_SUFFIXES.some(suffix => 
    suffix.replace(/\./g, '').toLowerCase() === normalized
  );
}

export type GenerationalSuffix = typeof GENERATIONAL_SUFFIXES[number];
