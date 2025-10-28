import { phoneConfig, CountryCode, PhoneFormat, PhoneType } from './phoneConfig';

export interface PhoneRepairLog {
  original: string;
  repaired: string;
  reason: string;
}

export interface PhoneValidation {
  isValid: boolean;
  isPossible: boolean;
  type: PhoneType;
  country: string | null;
  countryCode: string | null;
}

export interface PhoneParseOptions {
  defaultCountry?: string;
  allowExtensions?: boolean;
  strictValidation?: boolean;
}

export class PhoneNormalizer {
  rawPhone: string;
  cleanedPhone: string = '';
  extension: string | null = null;
  countryCode: string | null = null;
  nationalNumber: string = '';
  country: CountryCode | null = null;
  isValid: boolean = false;
  isPossible: boolean = false;
  type: PhoneType = 'UNKNOWN';
  repairLog: PhoneRepairLog[] = [];
  parseTime: number = 0;
  options: PhoneParseOptions;

  constructor(rawPhone: string, options: PhoneParseOptions = {}) {
    this.rawPhone = rawPhone;
    this.options = {
      defaultCountry: 'US',
      allowExtensions: true,
      strictValidation: true,
      ...options
    };
    this.parse();
  }

  private recordRepair(original: string, repaired: string, reason: string) {
    this.repairLog.push({ original, repaired, reason });
  }

  private extractExtension(text: string): { phone: string; extension: string | null } {
    if (!this.options.allowExtensions) {
      return { phone: text, extension: null };
    }

    for (const pattern of phoneConfig.EXTENSION_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const extension = match[2] || match[1];
        const phone = text.replace(pattern, '').trim();
        this.recordRepair(text, phone, 'extension_extracted');
        return { phone, extension };
      }
    }

    return { phone: text, extension: null };
  }

  private cleanPhone(text: string): string {
    let cleaned = text;

    // Fix common letter typos
    for (const [letter, digit] of Object.entries(phoneConfig.COMMON_FIXES)) {
      if (cleaned.includes(letter)) {
        const before = cleaned;
        cleaned = cleaned.replace(new RegExp(letter, 'g'), digit);
        if (cleaned !== before) {
          this.recordRepair(before, cleaned, 'letter_to_digit');
        }
      }
    }

    // Remove all separators
    const beforeSeparators = cleaned;
    for (const sep of phoneConfig.SEPARATORS) {
      cleaned = cleaned.replace(new RegExp(`\\${sep}`, 'g'), '');
    }
    if (cleaned !== beforeSeparators) {
      this.recordRepair(beforeSeparators, cleaned, 'separators_removed');
    }

    // Keep only digits and +
    const beforeClean = cleaned;
    cleaned = cleaned.replace(/[^\d+]/g, '');
    if (cleaned !== beforeClean) {
      this.recordRepair(beforeClean, cleaned, 'non_digit_removed');
    }

    return cleaned;
  }

  private detectCountry(phone: string): CountryCode | null {
    // Try to match by dial code
    if (phone.startsWith('+')) {
      for (const country of phoneConfig.COUNTRY_CODES) {
        if (phone.startsWith(country.dialCode)) {
          return country;
        }
      }
    }

    // If no country code, try default country
    if (this.options.defaultCountry) {
      const defaultCountry = phoneConfig.COUNTRY_CODES.find(
        c => c.code === this.options.defaultCountry
      );
      if (defaultCountry) {
        return defaultCountry;
      }
    }

    return null;
  }

  private parseWithCountry(phone: string, country: CountryCode): boolean {
    let nationalNumber = phone;

    // Remove country dial code if present
    if (phone.startsWith('+')) {
      nationalNumber = phone.substring(country.dialCode.length);
    } else if (phone.startsWith(country.dialCode.substring(1))) {
      // Handle cases like "1234567890" for US without +
      nationalNumber = phone.substring(country.dialCode.length - 1);
    }

    // Remove leading zeros (common in some countries)
    const beforeZeros = nationalNumber;
    nationalNumber = nationalNumber.replace(/^0+/, '');
    if (nationalNumber !== beforeZeros && nationalNumber.length > 0) {
      this.recordRepair(beforeZeros, nationalNumber, 'leading_zeros_removed');
    }

    // Check length
    if (nationalNumber.length < country.minLength || nationalNumber.length > country.maxLength) {
      this.isPossible = false;
      return false;
    }

    this.isPossible = true;
    this.nationalNumber = nationalNumber;
    this.countryCode = country.dialCode;
    this.country = country;

    // Validate against invalid patterns
    for (const pattern of phoneConfig.INVALID_PATTERNS) {
      if (pattern.test(nationalNumber)) {
        this.recordRepair(nationalNumber, '', 'invalid_pattern_detected');
        return false;
      }
    }

    // US-specific validation
    if (country.code === 'US' || country.code === 'CA') {
      const areaCode = nationalNumber.substring(0, 3);
      
      if (phoneConfig.INVALID_US_AREA_CODES.includes(areaCode)) {
        this.recordRepair(nationalNumber, '', 'invalid_area_code');
        return false;
      }

      // Check if toll-free
      if (phoneConfig.TOLL_FREE_PREFIXES.includes(areaCode)) {
        this.type = 'TOLL_FREE';
      } else {
        // In US/Canada, distinguishing mobile vs landline is difficult without a database
        this.type = 'UNKNOWN';
      }
    } else {
      // Try to detect mobile for other countries
      this.detectPhoneType(nationalNumber, country);
    }

    return true;
  }

  private detectPhoneType(nationalNumber: string, country: CountryCode) {
    const mobilePrefixes = phoneConfig.MOBILE_PREFIXES[country.code];
    if (mobilePrefixes) {
      for (const prefix of mobilePrefixes) {
        if (nationalNumber.startsWith(prefix)) {
          this.type = 'MOBILE';
          return;
        }
      }
      this.type = 'FIXED_LINE';
    } else {
      this.type = 'UNKNOWN';
    }
  }

  private parse() {
    const startTime = performance.now();

    if (!this.rawPhone || this.rawPhone.trim() === '') {
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    let text = this.rawPhone.trim();

    // Extract extension
    const { phone, extension } = this.extractExtension(text);
    this.extension = extension;
    text = phone;

    // Clean the phone number
    this.cleanedPhone = this.cleanPhone(text);

    if (!this.cleanedPhone) {
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    // Detect country
    const country = this.detectCountry(this.cleanedPhone);
    
    if (!country) {
      this.recordRepair(this.cleanedPhone, '', 'country_not_detected');
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    // Parse with detected country
    this.isValid = this.parseWithCountry(this.cleanedPhone, country);
    this.parseTime = performance.now() - startTime;
  }

  format(formatType: PhoneFormat = 'E164'): string {
    if (!this.isValid || !this.country) return '';

    switch (formatType) {
      case 'E164':
        return `${this.countryCode}${this.nationalNumber}`;
      
      case 'INTERNATIONAL':
        return `${this.countryCode} ${this.formatNational()}`;
      
      case 'NATIONAL':
        return this.formatNational();
      
      case 'RFC3966':
        return `tel:${this.countryCode}${this.nationalNumber}${this.extension ? `;ext=${this.extension}` : ''}`;
      
      default:
        return `${this.countryCode}${this.nationalNumber}`;
    }
  }

  private formatNational(): string {
    if (!this.country || !this.nationalNumber) return '';

    const format = this.country.format;
    let formatted = '';
    let digitIndex = 0;

    for (let i = 0; i < format.length && digitIndex < this.nationalNumber.length; i++) {
      if (format[i] === '#') {
        formatted += this.nationalNumber[digitIndex];
        digitIndex++;
      } else {
        formatted += format[i];
      }
    }

    // Add any remaining digits
    if (digitIndex < this.nationalNumber.length) {
      formatted += this.nationalNumber.substring(digitIndex);
    }

    return formatted;
  }

  get e164(): string {
    return this.format('E164');
  }

  get international(): string {
    return this.format('INTERNATIONAL');
  }

  get national(): string {
    return this.format('NATIONAL');
  }

  get rfc3966(): string {
    return this.format('RFC3966');
  }

  toObject() {
    return {
      rawPhone: this.rawPhone,
      cleanedPhone: this.cleanedPhone,
      countryCode: this.countryCode,
      nationalNumber: this.nationalNumber,
      extension: this.extension,
      country: this.country?.country || null,
      countryCodeISO: this.country?.code || null,
      isValid: this.isValid,
      isPossible: this.isPossible,
      type: this.type,
      parseTime: this.parseTime,
      formats: {
        e164: this.e164,
        international: this.international,
        national: this.national,
        rfc3966: this.rfc3966,
      }
    };
  }

  toJSON(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  toCSVRow(): string {
    return [
      this.rawPhone,
      this.e164,
      this.national,
      this.country?.country || '',
      this.type,
      this.extension || '',
      this.isValid ? 'Valid' : 'Invalid',
      this.parseTime.toFixed(2) + 'ms'
    ].map(v => `"${v}"`).join(',');
  }

  static csvHeader(): string {
    return 'Raw Phone,E.164,National Format,Country,Type,Extension,Status,Parse Time';
  }

  getValidation(): PhoneValidation {
    return {
      isValid: this.isValid,
      isPossible: this.isPossible,
      type: this.type,
      country: this.country?.country || null,
      countryCode: this.country?.code || null,
    };
  }
}

export interface PhoneBatchResult {
  phone: PhoneNormalizer;
  performance: {
    parseTime: number;
  };
}

export function parsePhoneBatch(phones: string[], options: PhoneParseOptions = {}): PhoneBatchResult[] {
  return phones.map(phone => {
    const startTime = performance.now();
    const parsed = new PhoneNormalizer(phone, options);
    const parseTime = performance.now() - startTime;
    
    return {
      phone: parsed,
      performance: {
        parseTime
      }
    };
  });
}
