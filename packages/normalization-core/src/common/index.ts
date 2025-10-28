/**
 * Common Normalization Utilities
 * 
 * Shared utilities for validation, formatting, and data processing
 * across all normalizers.
 */

/**
 * Normalize whitespace in a string
 */
export function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Remove accents from a string
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Convert string to uppercase
 */
export function upperCase(str: string): string {
  return str.toUpperCase();
}

/**
 * Convert string to lowercase
 */
export function lowerCase(str: string): string {
  return str.toLowerCase();
}

/**
 * Check if a string contains only letters
 */
export function isAlpha(str: string): boolean {
  return /^[a-zA-Z]+$/.test(str);
}

/**
 * Check if a string contains only numbers
 */
export function isNumeric(str: string): boolean {
  return /^[0-9]+$/.test(str);
}

/**
 * Check if a string contains only alphanumeric characters
 */
export function isAlphanumeric(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str);
}
