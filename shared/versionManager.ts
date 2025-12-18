/**
 * Version Manager
 * 
 * Provides utilities for managing application version:
 * - Read version from package.json
 * - Cache version in localStorage
 * - Automatic cache invalidation after 1 hour
 * - Fallback to hardcoded version if fetch fails
 */

const CACHE_KEY = 'app_version_cache';
const CACHE_TIMESTAMP_KEY = 'app_version_cache_timestamp';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_VERSION = '3.50.0';

/**
 * Read version from package.json
 * This runs only on the server or during build time
 */
export function readVersionFromPackageJson(): string {
  try {
    // This will be resolved at build time or server-side
    const packageJson = require('../../package.json');
    return packageJson.version || FALLBACK_VERSION;
  } catch (error) {
    console.warn('[VersionManager] Failed to read package.json:', error);
    return FALLBACK_VERSION;
  }
}

/**
 * Get version with caching support
 * Uses localStorage to cache version for 1 hour
 * Falls back to hardcoded version if cache is stale or unavailable
 */
export function getVersionWithCache(): string {
  // Check if localStorage is available (works in both browser and Node.js test environments)
  if (typeof localStorage === 'undefined') {
    return FALLBACK_VERSION;
  }

  try {
    // Check if cache exists and is still valid
    const cachedVersion = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (cachedVersion && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();
      const age = now - timestamp;

      // Cache is still valid (less than 1 hour old)
      if (age < CACHE_DURATION_MS) {
        return cachedVersion;
      }
    }

    // Cache is missing or stale, try to fetch fresh version
    const freshVersion = readVersionFromPackageJson();
    
    // Update cache
    try {
      localStorage.setItem(CACHE_KEY, freshVersion);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (storageError) {
      console.warn('[VersionManager] Failed to update cache:', storageError);
      // Continue anyway, just use the fresh version without caching
    }

    return freshVersion;
  } catch (error) {
    console.warn('[VersionManager] Error getting version:', error);
    return FALLBACK_VERSION;
  }
}

/**
 * Clear version cache
 * Useful for testing or forcing a refresh
 */
export function clearVersionCache(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    }
  } catch (error) {
    console.warn('[VersionManager] Failed to clear cache:', error);
  }
}

/**
 * Get cache age in milliseconds
 * Returns -1 if cache doesn't exist
 */
export function getCacheAge(): number {
  try {
    if (typeof localStorage === 'undefined') {
      return -1;
    }

    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!cachedTimestamp) {
      return -1;
    }

    const timestamp = parseInt(cachedTimestamp, 10);
    return Date.now() - timestamp;
  } catch (error) {
    console.warn('[VersionManager] Failed to get cache age:', error);
    return -1;
  }
}

/**
 * Check if cache is still valid
 */
export function isCacheValid(): boolean {
  const age = getCacheAge();
  return age >= 0 && age < CACHE_DURATION_MS;
}
