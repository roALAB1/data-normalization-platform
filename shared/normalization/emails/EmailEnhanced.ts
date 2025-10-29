import validator from 'validator';

/**
 * Email provider types
 */
export type EmailProvider = 
  | 'gmail'
  | 'outlook'
  | 'yahoo'
  | 'icloud'
  | 'protonmail'
  | 'aol'
  | 'fastmail'
  | 'zoho'
  | 'other';

/**
 * Provider-specific normalization rules
 */
export interface ProviderRules {
  name: string;
  domains: string[];
  removeDots: boolean;
  removePlusTag: boolean;
  lowercase: boolean;
  notes: string[];
}

/**
 * Email normalization result
 */
export interface EmailNormalizationResult {
  original: string;
  normalized: string;
  isValid: boolean;
  provider: EmailProvider;
  providerName: string;
  localPart: string;
  domain: string;
  removedDots: boolean;
  removedPlusTag: boolean;
  plusTag?: string;
  validationErrors: string[];
  providerRules: ProviderRules;
}

/**
 * Provider-specific rules configuration
 */
const PROVIDER_RULES: Record<EmailProvider, ProviderRules> = {
  gmail: {
    name: 'Gmail',
    domains: ['gmail.com', 'googlemail.com'],
    removeDots: true,
    removePlusTag: true,
    lowercase: true,
    notes: [
      'Dots (.) in username are ignored',
      'Plus tags (+tag) are removed',
      'john.doe+spam@gmail.com → johndoe@gmail.com',
      'All Gmail addresses are case-insensitive'
    ]
  },
  outlook: {
    name: 'Outlook/Hotmail/Live',
    domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'],
    removeDots: false,
    removePlusTag: true,
    lowercase: true,
    notes: [
      'Dots (.) are significant in username',
      'Plus tags (+tag) are removed',
      'john.doe+spam@outlook.com → john.doe@outlook.com',
      'Case-insensitive'
    ]
  },
  yahoo: {
    name: 'Yahoo Mail',
    domains: ['yahoo.com', 'ymail.com', 'rocketmail.com'],
    removeDots: false,
    removePlusTag: true,
    lowercase: true,
    notes: [
      'Dots (.) are significant in username',
      'Plus tags (+tag) are removed',
      'Hyphens (-) are allowed',
      'Case-insensitive'
    ]
  },
  icloud: {
    name: 'iCloud Mail',
    domains: ['icloud.com', 'me.com', 'mac.com'],
    removeDots: false,
    removePlusTag: true,
    lowercase: true,
    notes: [
      'Dots (.) are significant in username',
      'Plus tags (+tag) are removed',
      'Case-insensitive',
      'Legacy domains: me.com, mac.com'
    ]
  },
  protonmail: {
    name: 'ProtonMail',
    domains: ['protonmail.com', 'proton.me', 'pm.me'],
    removeDots: false,
    removePlusTag: true,
    lowercase: true,
    notes: [
      'Dots (.) are significant in username',
      'Plus tags (+tag) are supported and removed',
      'Case-insensitive',
      'Privacy-focused email service'
    ]
  },
  aol: {
    name: 'AOL Mail',
    domains: ['aol.com'],
    removeDots: false,
    removePlusTag: false,
    lowercase: true,
    notes: [
      'Dots (.) are significant in username',
      'Plus tags not supported',
      'Case-insensitive',
      'Legacy email provider'
    ]
  },
  fastmail: {
    name: 'Fastmail',
    domains: ['fastmail.com', 'fastmail.fm'],
    removeDots: false,
    removePlusTag: true,
    lowercase: true,
    notes: [
      'Dots (.) are significant in username',
      'Plus tags (+tag) are supported and removed',
      'Case-insensitive',
      'Professional email service'
    ]
  },
  zoho: {
    name: 'Zoho Mail',
    domains: ['zoho.com', 'zohomail.com'],
    removeDots: false,
    removePlusTag: true,
    lowercase: true,
    notes: [
      'Dots (.) are significant in username',
      'Plus tags (+tag) are supported and removed',
      'Case-insensitive',
      'Business email service'
    ]
  },
  other: {
    name: 'Other Provider',
    domains: [],
    removeDots: false,
    removePlusTag: true,
    lowercase: true,
    notes: [
      'Conservative normalization applied',
      'Plus tags (+tag) are removed',
      'Dots preserved (may be significant)',
      'Case-insensitive'
    ]
  }
};

/**
 * Enhanced email normalization class using validator.js
 * 
 * Features:
 * - Validation using validator.js (RFC 5322 compliant)
 * - Provider detection (Gmail, Outlook, Yahoo, iCloud, etc.)
 * - Provider-specific normalization rules
 * - Plus tag extraction and removal
 * - Dot removal (Gmail-specific)
 * - Case normalization
 * 
 * @example
 * ```typescript
 * const email = new EmailEnhanced('John.Doe+spam@Gmail.com');
 * console.log(email.normalized); // 'johndoe@gmail.com'
 * console.log(email.provider); // 'gmail'
 * console.log(email.plusTag); // 'spam'
 * ```
 */
export class EmailEnhanced {
  public original: string;
  public normalized: string;
  public isValid: boolean;
  public provider: EmailProvider;
  public providerName: string;
  public localPart: string;
  public domain: string;
  public removedDots: boolean = false;
  public removedPlusTag: boolean = false;
  public plusTag?: string;
  public validationErrors: string[] = [];
  public providerRules: ProviderRules;

  constructor(email: string) {
    this.original = email?.trim() || '';
    
    // Validate email
    this.isValid = validator.isEmail(this.original, {
      allow_display_name: false,
      require_display_name: false,
      allow_utf8_local_part: true,
      require_tld: true,
      allow_ip_domain: false,
      domain_specific_validation: true,
      blacklisted_chars: '',
      host_blacklist: []
    });

    if (!this.isValid) {
      this.validationErrors.push('Invalid email format');
      this.normalized = this.original;
      this.provider = 'other';
      this.providerName = 'Unknown';
      this.localPart = '';
      this.domain = '';
      this.providerRules = PROVIDER_RULES.other;
      return;
    }

    // Parse email parts
    const [local, domain] = this.original.toLowerCase().split('@');
    this.domain = domain;
    this.localPart = local;

    // Detect provider
    this.provider = this.detectProvider(this.domain);
    this.providerRules = PROVIDER_RULES[this.provider];
    this.providerName = this.providerRules.name;

    // Normalize email
    this.normalized = this.normalizeEmail(local, this.domain);
  }

  /**
   * Detect email provider from domain
   */
  private detectProvider(domain: string): EmailProvider {
    const lowerDomain = domain.toLowerCase();
    
    for (const [provider, rules] of Object.entries(PROVIDER_RULES)) {
      if (rules.domains.includes(lowerDomain)) {
        return provider as EmailProvider;
      }
    }
    
    return 'other';
  }

  /**
   * Normalize email according to provider-specific rules
   */
  private normalizeEmail(local: string, domain: string): string {
    let normalizedLocal = local;

    // Extract plus tag if provider supports it
    if (this.providerRules.removePlusTag && normalizedLocal.includes('+')) {
      const plusIndex = normalizedLocal.indexOf('+');
      this.plusTag = normalizedLocal.substring(plusIndex + 1);
      normalizedLocal = normalizedLocal.substring(0, plusIndex);
      this.removedPlusTag = true;
    }

    // Remove dots if provider ignores them (Gmail-specific)
    if (this.providerRules.removeDots && normalizedLocal.includes('.')) {
      normalizedLocal = normalizedLocal.replace(/\./g, '');
      this.removedDots = true;
    }

    // Lowercase (all major providers are case-insensitive)
    if (this.providerRules.lowercase) {
      normalizedLocal = normalizedLocal.toLowerCase();
      domain = domain.toLowerCase();
    }

    return `${normalizedLocal}@${domain}`;
  }

  /**
   * Get full normalization result
   */
  public getResult(): EmailNormalizationResult {
    return {
      original: this.original,
      normalized: this.normalized,
      isValid: this.isValid,
      provider: this.provider,
      providerName: this.providerName,
      localPart: this.localPart,
      domain: this.domain,
      removedDots: this.removedDots,
      removedPlusTag: this.removedPlusTag,
      plusTag: this.plusTag,
      validationErrors: this.validationErrors,
      providerRules: this.providerRules
    };
  }

  /**
   * Check if two emails are equivalent after normalization
   */
  public static areEquivalent(email1: string, email2: string): boolean {
    const e1 = new EmailEnhanced(email1);
    const e2 = new EmailEnhanced(email2);
    
    if (!e1.isValid || !e2.isValid) {
      return false;
    }
    
    return e1.normalized === e2.normalized;
  }

  /**
   * Batch normalize multiple emails
   */
  public static batchNormalize(emails: string[]): EmailNormalizationResult[] {
    return emails.map(email => new EmailEnhanced(email).getResult());
  }

  /**
   * Get provider rules for a specific provider
   */
  public static getProviderRules(provider: EmailProvider): ProviderRules {
    return PROVIDER_RULES[provider];
  }

  /**
   * Get all supported providers
   */
  public static getSupportedProviders(): EmailProvider[] {
    return Object.keys(PROVIDER_RULES).filter(p => p !== 'other') as EmailProvider[];
  }
}
