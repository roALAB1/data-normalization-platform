/**
 * Last Name Prefixes
 * Particles that are part of surnames (e.g., "van", "de", "von")
 */

export const LAST_NAME_PREFIXES = [
  // Dutch
  "van der", "van den", "van de", "van 't", "van", "vander",
  "ter", "der", "ten", "'s", "'t",
  
  // French
  "de la", "de", "des", "du", "d'", "le", "la",
  
  // German
  "von und zu", "von", "zu",
  
  // Italian
  "del", "degli", "della", "di", "da",
  
  // Spanish/Portuguese
  "de la", "de", "del", "dos", "das", "da", "e",
  
  // Arabic
  "bin", "bint", "binti", "binte", "abu", "al", "el", "ibn",
  
  // Berber
  "aït", "at", "ath",
  
  // Hebrew
  "bath", "bat", "ben", "bar",
  
  // Celtic (Irish/Scottish/Welsh)
  "mac", "mc", "ni", "nic", "o'", "ó", "ua", "uí",
  "ap", "ab", "ferch", "verch", "erch",
  
  // Nordic
  "af", "av",
  
  // Other
  "a", "alam", "olam", "chaudhary", "ch", "dele",
  "fitz", "i", "ka", "kil", "gil", "mal", "mul",
  "m'", "m'c", "m.c", "mck", "mhic", "mic", "mala",
  "na", "ngā", "nin", "öz", "pour", "te", "tre", "war", "bet"
] as const;

// Create a Set for O(1) lookup
export const LAST_NAME_PREFIXES_SET = new Set(LAST_NAME_PREFIXES);

/**
 * Check if a string is a last name prefix
 * @param value - The string to check (should be lowercase)
 * @returns true if the value is a last name prefix
 */
export function isLastNamePrefix(value: string): boolean {
  const normalized = value.toLowerCase();
  return LAST_NAME_PREFIXES_SET.has(normalized as any) || 
         LAST_NAME_PREFIXES.some(prefix => prefix.toLowerCase() === normalized);
}

export type LastNamePrefix = typeof LAST_NAME_PREFIXES[number];
