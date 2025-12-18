/**
 * URLNormalizer - Extract clean domain names from URLs
 * 
 * Normalizes URLs by:
 * - Removing protocols (http://, https://, ftp://, etc.)
 * - Removing www. prefix
 * - Extracting only root domain + extension
 * - Removing paths, query parameters, fragments
 * 
 * Examples:
 * - http://www.google.com → google.com
 * - https://www.example.com/page?query=1 → example.com
 * - www.facebook.com/profile#section → facebook.com
 * - subdomain.site.co.uk/path → site.co.uk
 */

export interface URLNormalizeResult {
  original: string;
  normalized: string;
  isValid: boolean;
  domain: string | null;
  subdomain: string | null;
  tld: string | null;
  confidence: number;
}

export class URLNormalizer {
  // Common protocols to remove
  private static readonly PROTOCOLS = [
    'http://',
    'https://',
    'ftp://',
    'ftps://',
    'file://',
    'ws://',
    'wss://',
  ];

  // Common multi-part TLDs (e.g., .co.uk, .com.au)
  private static readonly MULTI_PART_TLDS = [
    'co.uk', 'com.au', 'co.nz', 'co.za', 'com.br', 'com.mx',
    'co.jp', 'co.kr', 'co.in', 'com.cn', 'com.tw', 'com.hk',
    'gov.uk', 'ac.uk', 'org.uk', 'net.uk', 'sch.uk',
    'gov.au', 'edu.au', 'org.au', 'net.au',
  ];

  /**
   * Normalize a URL to extract clean domain name
   */
  static normalize(url: string): URLNormalizeResult {
    const original = url;
    
    // Handle empty/null input
    if (!url || typeof url !== 'string') {
      return {
        original,
        normalized: '',
        isValid: false,
        domain: null,
        subdomain: null,
        tld: null,
        confidence: 0,
      };
    }

    // Trim whitespace
    let cleaned = url.trim();

    // Remove protocol
    cleaned = this.removeProtocol(cleaned);

    // Remove www. prefix
    cleaned = this.removeWWW(cleaned);

    // Remove path, query, fragment
    cleaned = this.removePath(cleaned);

    // Extract domain parts
    const { domain, subdomain, tld } = this.extractDomainParts(cleaned);

    // Validate
    const isValid = this.isValidDomain(domain);
    const confidence = this.calculateConfidence(domain, subdomain, tld, isValid);

    return {
      original,
      normalized: domain || cleaned,
      isValid,
      domain,
      subdomain,
      tld,
      confidence,
    };
  }

  /**
   * Remove protocol from URL
   */
  private static removeProtocol(url: string): string {
    let cleaned = url;
    
    for (const protocol of this.PROTOCOLS) {
      if (cleaned.toLowerCase().startsWith(protocol)) {
        cleaned = cleaned.substring(protocol.length);
        break;
      }
    }

    // Also handle protocol-relative URLs (//example.com)
    if (cleaned.startsWith('//')) {
      cleaned = cleaned.substring(2);
    }

    return cleaned;
  }

  /**
   * Remove www. prefix
   */
  private static removeWWW(url: string): string {
    if (url.toLowerCase().startsWith('www.')) {
      return url.substring(4);
    }
    return url;
  }

  /**
   * Remove path, query parameters, and fragments
   */
  private static removePath(url: string): string {
    // First, remove username:password@ if present
    const atIndex = url.indexOf('@');
    if (atIndex !== -1) {
      url = url.substring(atIndex + 1);
    }

    // Split on first occurrence of /, ?, or #
    const pathIndex = url.search(/[/?#]/);
    
    if (pathIndex !== -1) {
      return url.substring(0, pathIndex);
    }
    
    return url;
  }

  /**
   * Extract domain parts (domain, subdomain, TLD)
   */
  private static extractDomainParts(cleaned: string): {
    domain: string | null;
    subdomain: string | null;
    tld: string | null;
  } {
    // Handle empty input
    if (!cleaned) {
      return { domain: null, subdomain: null, tld: null };
    }

    // Split by dots
    const parts = cleaned.toLowerCase().split('.');

    // Need at least 2 parts for a valid domain (e.g., google.com)
    if (parts.length < 2) {
      return { domain: cleaned, subdomain: null, tld: null };
    }

    // Check for multi-part TLD (e.g., .co.uk)
    const lastTwoParts = parts.slice(-2).join('.');
    const isMultiPartTLD = this.MULTI_PART_TLDS.includes(lastTwoParts);

    let domain: string;
    let subdomain: string | null = null;
    let tld: string;

    if (isMultiPartTLD) {
      // Multi-part TLD (e.g., site.co.uk)
      if (parts.length >= 3) {
        domain = parts.slice(-3).join('.'); // site.co.uk
        tld = lastTwoParts; // co.uk
        if (parts.length > 3) {
          subdomain = parts.slice(0, -3).join('.'); // subdomain
        }
      } else {
        domain = cleaned;
        tld = lastTwoParts;
      }
    } else {
      // Single-part TLD (e.g., google.com)
      domain = parts.slice(-2).join('.'); // google.com
      tld = parts[parts.length - 1]; // com
      if (parts.length > 2) {
        subdomain = parts.slice(0, -2).join('.'); // subdomain
      }
    }

    return { domain, subdomain, tld };
  }

  /**
   * Validate domain format
   */
  private static isValidDomain(domain: string | null): boolean {
    if (!domain) return false;

    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }

  /**
   * Calculate confidence score (0-1)
   */
  private static calculateConfidence(
    domain: string | null,
    subdomain: string | null,
    tld: string | null,
    isValid: boolean
  ): number {
    if (!isValid || !domain) return 0;

    let confidence = 0.5; // Base confidence

    // Has valid TLD
    if (tld && tld.length >= 2) {
      confidence += 0.3;
    }

    // No subdomain (cleaner domain)
    if (!subdomain) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Normalize a string value (for CSV processing)
   */
  static normalizeString(url: string): string {
    const result = this.normalize(url);
    return result.normalized;
  }

  /**
   * Batch normalize multiple URLs
   */
  static normalizeBatch(urls: string[]): URLNormalizeResult[] {
    return urls.map(url => this.normalize(url));
  }
}
