/**
 * URL Normalization Tests - v3.48.0
 * 
 * Tests for URLNormalizer utility class
 * Covers all requirements:
 * - Protocol removal (http://, https://)
 * - www. prefix removal
 * - Path/query/fragment removal
 * - Subdomain handling
 * - International domains
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import { URLNormalizer } from '../shared/normalization/urls/URLNormalizer';

describe('URLNormalizer - v3.48.0', () => {
  describe('Basic URL Normalization', () => {
    it('should normalize http://www.google.com to google.com', () => {
      const result = URLNormalizer.normalize('http://www.google.com');
      expect(result.normalized).toBe('google.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('google.com');
    });

    it('should normalize https://www.example.com to example.com', () => {
      const result = URLNormalizer.normalize('https://www.example.com');
      expect(result.normalized).toBe('example.com');
      expect(result.isValid).toBe(true);
    });

    it('should normalize www.facebook.com to facebook.com', () => {
      const result = URLNormalizer.normalize('www.facebook.com');
      expect(result.normalized).toBe('facebook.com');
      expect(result.isValid).toBe(true);
    });

    it('should keep already clean URL (google.com)', () => {
      const result = URLNormalizer.normalize('google.com');
      expect(result.normalized).toBe('google.com');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Protocol Removal', () => {
    it('should remove http:// protocol', () => {
      const result = URLNormalizer.normalize('http://example.com');
      expect(result.normalized).toBe('example.com');
    });

    it('should remove https:// protocol', () => {
      const result = URLNormalizer.normalize('https://example.com');
      expect(result.normalized).toBe('example.com');
    });

    it('should remove ftp:// protocol', () => {
      const result = URLNormalizer.normalize('ftp://files.example.com');
      expect(result.normalized).toBe('example.com'); // Subdomain removed as per spec
      expect(result.subdomain).toBe('files');
    });

    it('should handle protocol-relative URLs (//example.com)', () => {
      const result = URLNormalizer.normalize('//example.com');
      expect(result.normalized).toBe('example.com');
    });
  });

  describe('WWW Prefix Removal', () => {
    it('should remove www. prefix', () => {
      const result = URLNormalizer.normalize('www.example.com');
      expect(result.normalized).toBe('example.com');
    });

    it('should remove www. after protocol', () => {
      const result = URLNormalizer.normalize('https://www.example.com');
      expect(result.normalized).toBe('example.com');
    });

    it('should handle WWW in uppercase', () => {
      const result = URLNormalizer.normalize('WWW.EXAMPLE.COM');
      expect(result.normalized).toBe('example.com');
    });
  });

  describe('Path/Query/Fragment Removal', () => {
    it('should remove path from URL', () => {
      const result = URLNormalizer.normalize('https://www.example.com/page');
      expect(result.normalized).toBe('example.com');
    });

    it('should remove deep path from URL', () => {
      const result = URLNormalizer.normalize('https://example.com/page/subpage/item');
      expect(result.normalized).toBe('example.com');
    });

    it('should remove query parameters', () => {
      const result = URLNormalizer.normalize('https://example.com?query=value&foo=bar');
      expect(result.normalized).toBe('example.com');
    });

    it('should remove fragments', () => {
      const result = URLNormalizer.normalize('https://example.com#section');
      expect(result.normalized).toBe('example.com');
    });

    it('should remove path + query + fragment', () => {
      const result = URLNormalizer.normalize('https://www.example.com/page?query=1#section');
      expect(result.normalized).toBe('example.com');
    });

    it('should handle google.com/webpage', () => {
      const result = URLNormalizer.normalize('google.com/webpage');
      expect(result.normalized).toBe('google.com');
    });
  });

  describe('Subdomain Handling', () => {
    it('should extract root domain from subdomain.site.com', () => {
      const result = URLNormalizer.normalize('subdomain.site.com');
      expect(result.normalized).toBe('site.com');
      expect(result.domain).toBe('site.com');
      expect(result.subdomain).toBe('subdomain');
    });

    it('should extract root domain from blog.example.com', () => {
      const result = URLNormalizer.normalize('https://blog.example.com/post');
      expect(result.normalized).toBe('example.com');
      expect(result.subdomain).toBe('blog');
    });

    it('should extract root domain from api.v2.example.com', () => {
      const result = URLNormalizer.normalize('api.v2.example.com');
      expect(result.normalized).toBe('example.com');
      expect(result.subdomain).toBe('api.v2');
    });
  });

  describe('International Domains (Multi-part TLDs)', () => {
    it('should handle .co.uk domains', () => {
      const result = URLNormalizer.normalize('https://www.example.co.uk');
      expect(result.normalized).toBe('example.co.uk');
      expect(result.domain).toBe('example.co.uk');
      expect(result.tld).toBe('co.uk');
    });

    it('should handle .com.au domains', () => {
      const result = URLNormalizer.normalize('www.example.com.au/page');
      expect(result.normalized).toBe('example.com.au');
      expect(result.tld).toBe('com.au');
    });

    it('should handle subdomain.site.co.uk', () => {
      const result = URLNormalizer.normalize('subdomain.site.co.uk');
      expect(result.normalized).toBe('site.co.uk');
      expect(result.subdomain).toBe('subdomain');
      expect(result.tld).toBe('co.uk');
    });

    it('should handle .gov.uk domains', () => {
      const result = URLNormalizer.normalize('https://www.gov.uk');
      expect(result.normalized).toBe('gov.uk');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = URLNormalizer.normalize('');
      expect(result.normalized).toBe('');
      expect(result.isValid).toBe(false);
    });

    it('should handle null input', () => {
      const result = URLNormalizer.normalize(null as any);
      expect(result.normalized).toBe('');
      expect(result.isValid).toBe(false);
    });

    it('should handle whitespace', () => {
      const result = URLNormalizer.normalize('   https://example.com   ');
      expect(result.normalized).toBe('example.com');
    });

    it('should handle URL with port number', () => {
      const result = URLNormalizer.normalize('https://example.com:8080/page');
      expect(result.normalized).toBe('example.com:8080');
    });

    it('should handle mixed case URLs', () => {
      const result = URLNormalizer.normalize('HTTPS://WWW.EXAMPLE.COM/PAGE');
      expect(result.normalized).toBe('example.com');
    });

    it('should handle URL with username/password', () => {
      const result = URLNormalizer.normalize('https://user:pass@example.com');
      expect(result.normalized).toBe('example.com');
    });
  });

  describe('Confidence Scoring', () => {
    it('should give high confidence to valid clean domains', () => {
      const result = URLNormalizer.normalize('google.com');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should give lower confidence to subdomains', () => {
      const result1 = URLNormalizer.normalize('subdomain.example.com');
      const result2 = URLNormalizer.normalize('example.com');
      expect(result1.confidence).toBeLessThan(result2.confidence);
    });

    it('should give zero confidence to invalid URLs', () => {
      const result = URLNormalizer.normalize('not-a-valid-url');
      expect(result.confidence).toBe(0);
    });
  });

  describe('Batch Normalization', () => {
    it('should normalize multiple URLs at once', () => {
      const urls = [
        'http://www.google.com',
        'https://www.facebook.com/page',
        'www.twitter.com',
        'linkedin.com/profile'
      ];
      
      const results = URLNormalizer.normalizeBatch(urls);
      
      expect(results).toHaveLength(4);
      expect(results[0].normalized).toBe('google.com');
      expect(results[1].normalized).toBe('facebook.com');
      expect(results[2].normalized).toBe('twitter.com');
      expect(results[3].normalized).toBe('linkedin.com');
    });
  });

  describe('String Normalization (for CSV processing)', () => {
    it('should return normalized string directly', () => {
      expect(URLNormalizer.normalizeString('http://www.google.com')).toBe('google.com');
      expect(URLNormalizer.normalizeString('https://example.com/page')).toBe('example.com');
      expect(URLNormalizer.normalizeString('www.facebook.com')).toBe('facebook.com');
    });
  });

  describe('Real-World Examples', () => {
    it('should normalize Amazon URL', () => {
      const result = URLNormalizer.normalize('https://www.amazon.com/products/item?id=123');
      expect(result.normalized).toBe('amazon.com');
    });

    it('should normalize GitHub URL', () => {
      const result = URLNormalizer.normalize('https://github.com/user/repo');
      expect(result.normalized).toBe('github.com');
    });

    it('should normalize Stack Overflow URL', () => {
      const result = URLNormalizer.normalize('https://stackoverflow.com/questions/12345');
      expect(result.normalized).toBe('stackoverflow.com');
    });

    it('should normalize BBC UK URL', () => {
      const result = URLNormalizer.normalize('https://www.bbc.co.uk/news/article');
      expect(result.normalized).toBe('bbc.co.uk');
    });

    it('should normalize Australian government URL', () => {
      const result = URLNormalizer.normalize('https://www.gov.au/services');
      expect(result.normalized).toBe('gov.au');
    });
  });
});
