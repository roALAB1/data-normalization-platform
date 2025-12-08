/**
 * Version Manager
 * 
 * Simple, foolproof version management that always returns the correct version.
 * No caching, no complex logic - just the version number.
 */

// IMPORTANT: Update this constant whenever package.json version changes
const VERSION = '3.46.1';

/**
 * Get the application version
 * Always returns the hardcoded version - simple and reliable
 */
export function getVersion(): string {
  return VERSION;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getVersion() instead
 */
export function getVersionWithCache(): string {
  return VERSION;
}

/**
 * Legacy function for backward compatibility
 * @deprecated No longer needed
 */
export function clearVersionCache(): void {
  // Clear old localStorage cache if it exists
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('app_version_cache');
      localStorage.removeItem('app_version_cache_timestamp');
    }
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated No longer needed
 */
export function readVersionFromPackageJson(): string {
  return VERSION;
}
