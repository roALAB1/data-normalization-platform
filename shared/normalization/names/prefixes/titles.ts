/**
 * Name Titles (Honorifics)
 * Prefixes that appear before a person's name
 */

export const TITLES = [
  "Dr", "Dr.", 
  "Mr", "Mr.", 
  "Mrs", "Mrs.", 
  "Miss", 
  "Ms", "Ms.", 
  "Prof", "Prof.", 
  "Mx", "Mx.", 
  "Revd", "Rev", "Rev.", 
  "Sir", 
  "Lady",
  "Hon", "Hon.",
  "Honorable",
  "Judge",
  "Justice",
  "Senator",
  "Representative",
  "Congressman",
  "Congresswoman",
  "Governor",
  "Mayor",
  "President",
  "Vice President",
  "Secretary",
  "Ambassador",
  "Father", "Fr", "Fr.",
  "Mother", "Sr", "Sr.", // Sr. as Sister (religious), not Senior
  "Brother", "Br", "Br.",
  "Rabbi",
  "Imam",
  "Pastor",
  "Bishop",
  "Archbishop",
  "Cardinal",
  "Pope",
  "Deacon",
  "Elder"
] as const;

// Create a Set for O(1) lookup
export const TITLES_SET = new Set(TITLES);

/**
 * Check if a string is a title
 * @param value - The string to check
 * @returns true if the value is a title
 */
export function isTitle(value: string): boolean {
  // Check exact match first
  if (TITLES_SET.has(value as any)) {
    return true;
  }
  
  // Check case-insensitive match
  const normalized = value.toLowerCase();
  return TITLES.some(title => title.toLowerCase() === normalized);
}

export type Title = typeof TITLES[number];
