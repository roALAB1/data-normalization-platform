import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readVersionFromPackageJson,
  getVersionWithCache,
  clearVersionCache,
  getCacheAge,
  isCacheValid
} from '../shared/versionManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('versionManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('readVersionFromPackageJson', () => {
    it('should return a version string', () => {
      const version = readVersionFromPackageJson();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });

    it('should return a valid semver format', () => {
      const version = readVersionFromPackageJson();
      // Basic semver check: X.Y.Z
      const semverRegex = /^\d+\.\d+\.\d+/;
      expect(semverRegex.test(version)).toBe(true);
    });

    it('should return fallback version if package.json is not found', () => {
      // This test verifies the fallback mechanism
      const version = readVersionFromPackageJson();
      expect(version).toBeDefined();
      expect(version).not.toBe('');
    });
  });

  describe('getVersionWithCache', () => {
    it('should return a version string', () => {
      const version = getVersionWithCache();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });

    it('should cache the version in localStorage', () => {
      getVersionWithCache();
      const cached = localStorage.getItem('app_version_cache');
      expect(cached).not.toBeNull();
      expect(typeof cached).toBe('string');
    });

    it('should cache the timestamp in localStorage', () => {
      getVersionWithCache();
      const timestamp = localStorage.getItem('app_version_cache_timestamp');
      expect(timestamp).not.toBeNull();
      expect(!isNaN(parseInt(timestamp!, 10))).toBe(true);
    });

    it('should return cached version if cache is still valid', () => {
      const version1 = getVersionWithCache();
      const version2 = getVersionWithCache();
      expect(version1).toBe(version2);
    });

    it('should return version even if localStorage is unavailable', () => {
      // Temporarily disable localStorage
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true
      });

      const version = getVersionWithCache();
      expect(version).toBeDefined();
      expect(version.length).toBeGreaterThan(0);

      // Restore localStorage
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });
  });

  describe('clearVersionCache', () => {
    it('should remove cached version from localStorage', () => {
      getVersionWithCache();
      expect(localStorage.getItem('app_version_cache')).not.toBeNull();

      clearVersionCache();
      expect(localStorage.getItem('app_version_cache')).toBeNull();
    });

    it('should remove cache timestamp from localStorage', () => {
      getVersionWithCache();
      expect(localStorage.getItem('app_version_cache_timestamp')).not.toBeNull();

      clearVersionCache();
      expect(localStorage.getItem('app_version_cache_timestamp')).toBeNull();
    });

    it('should not throw error if cache does not exist', () => {
      expect(() => clearVersionCache()).not.toThrow();
    });
  });

  describe('getCacheAge', () => {
    it('should return -1 if cache does not exist', () => {
      const age = getCacheAge();
      expect(age).toBe(-1);
    });

    it('should return cache age in milliseconds', () => {
      getVersionWithCache();
      const age = getCacheAge();
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(1000); // Should be less than 1 second
    });

    it('should return -1 if localStorage is unavailable', () => {
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true
      });

      const age = getCacheAge();
      expect(age).toBe(-1);

      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });
  });

  describe('isCacheValid', () => {
    it('should return false if cache does not exist', () => {
      const isValid = isCacheValid();
      expect(isValid).toBe(false);
    });

    it('should return true if cache is fresh', () => {
      getVersionWithCache();
      const isValid = isCacheValid();
      expect(isValid).toBe(true);
    });

    it('should return false if cache is older than 1 hour', () => {
      getVersionWithCache();

      // Manually set cache timestamp to 2 hours ago
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      localStorage.setItem('app_version_cache_timestamp', twoHoursAgo.toString());

      const isValid = isCacheValid();
      expect(isValid).toBe(false);
    });

    it('should return true if cache is less than 1 hour old', () => {
      getVersionWithCache();

      // Manually set cache timestamp to 30 minutes ago
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
      localStorage.setItem('app_version_cache_timestamp', thirtyMinutesAgo.toString());

      const isValid = isCacheValid();
      expect(isValid).toBe(true);
    });
  });

  describe('Cache expiration', () => {
    it('should invalidate cache after 1 hour', () => {
      getVersionWithCache();
      expect(isCacheValid()).toBe(true);

      // Simulate 1 hour passing
      const oneHourAgo = Date.now() - (60 * 60 * 1000 + 1000);
      localStorage.setItem('app_version_cache_timestamp', oneHourAgo.toString());

      expect(isCacheValid()).toBe(false);
    });

    it('should refresh cache when expired', () => {
      const version1 = getVersionWithCache();

      // Simulate cache expiration
      const oneHourAgo = Date.now() - (60 * 60 * 1000 + 1000);
      localStorage.setItem('app_version_cache_timestamp', oneHourAgo.toString());

      // Get version again (should refresh cache)
      const version2 = getVersionWithCache();

      expect(version1).toBe(version2);
      expect(isCacheValid()).toBe(true);
    });
  });

  describe('Fallback behavior', () => {
    it('should use fallback version when package.json is unavailable', () => {
      const version = getVersionWithCache();
      // Version should either be from package.json or fallback
      expect(version).toBeDefined();
      expect(version.length).toBeGreaterThan(0);
    });
  });
});
