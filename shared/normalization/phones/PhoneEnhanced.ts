import { 
  parsePhoneNumber, 
  isValidPhoneNumber,
  getCountries,
  getCountryCallingCode,
  AsYouType,
  type PhoneNumber,
  type CountryCode,
  type NumberType
} from 'libphonenumber-js';

export interface PhoneParseOptions {
  defaultCountry?: CountryCode;
  extract?: boolean; // Extract from text (future feature)
  validateType?: boolean; // Check if mobile/landline
}

export interface PhoneParseResult {
  isValid: boolean;
  isPossible?: boolean;
  countryCode?: CountryCode;
  nationalNumber?: string;
  internationalFormat?: string; // +1 213 373 4253
  nationalFormat?: string; // (213) 373-4253
  e164Format?: string; // +12133734253
  rfc3966Format?: string; // tel:+1-213-373-4253
  digitsOnly?: string; // 12133734253 (no special characters)
  type?: NumberType;
  typeDescription?: string;
  parseLog: string[];
  metadata?: {
    countryCallingCode?: string;
    possibleLengths?: number[];
  };
}

export class PhoneEnhanced {
  rawPhone: string;
  options: PhoneParseOptions;
  result: PhoneParseResult;
  private phoneNumber?: PhoneNumber;

  constructor(rawPhone: string, options: PhoneParseOptions = {}) {
    this.rawPhone = rawPhone;
    this.options = {
      defaultCountry: 'US',
      extract: false,
      validateType: false,
      ...options
    };
    this.result = this.parse();
  }

  private parse(): PhoneParseResult {
    const parseLog: string[] = [];
    
    try {
      parseLog.push(`Parsing: "${this.rawPhone}"`);
      
      // Parse phone number
      const phoneNumber = parsePhoneNumber(this.rawPhone, this.options.defaultCountry);
      
      if (!phoneNumber) {
        parseLog.push('❌ Failed to parse phone number');
        return {
          isValid: false,
          isPossible: false,
          parseLog
        };
      }

      this.phoneNumber = phoneNumber;
      
      // Validate
      const isValid = phoneNumber.isValid();
      const isPossible = phoneNumber.isPossible();
      
      parseLog.push(`✅ Parsed as ${phoneNumber.country} number`);
      parseLog.push(`Country calling code: +${phoneNumber.countryCallingCode}`);
      parseLog.push(`National number: ${phoneNumber.nationalNumber}`);
      parseLog.push(`Valid: ${isValid ? '✅' : '❌'}`);
      parseLog.push(`Possible: ${isPossible ? '✅' : '❌'}`);

      // Get type
      let type: NumberType | undefined;
      let typeDescription: string | undefined;
      
      if (this.options.validateType) {
        type = phoneNumber.getType();
        if (type) {
          typeDescription = this.getTypeDescription(type);
          parseLog.push(`Type: ${typeDescription}`);
        }
      }

      // Create digits-only format (remove all non-digits)
      const digitsOnly = phoneNumber.number?.replace(/\D/g, '') || '';
      
      return {
        isValid,
        isPossible,
        countryCode: phoneNumber.country,
        nationalNumber: phoneNumber.nationalNumber,
        internationalFormat: phoneNumber.formatInternational(),
        nationalFormat: phoneNumber.formatNational(),
        e164Format: phoneNumber.number,
        rfc3966Format: phoneNumber.getURI(),
        digitsOnly,
        type,
        typeDescription,
        metadata: {
          countryCallingCode: `+${phoneNumber.countryCallingCode}`,
        },
        parseLog
      };
    } catch (error: any) {
      parseLog.push(`❌ Parse error: ${error.message}`);
      return {
        isValid: false,
        isPossible: false,
        parseLog
      };
    }
  }

  private getTypeDescription(type: NumberType | undefined): string {
    if (!type) return 'Unknown';
    const descriptions: { [key: string]: string } = {
      'FIXED_LINE': 'Fixed Line (Landline)',
      'MOBILE': 'Mobile',
      'FIXED_LINE_OR_MOBILE': 'Fixed Line or Mobile',
      'TOLL_FREE': 'Toll Free',
      'PREMIUM_RATE': 'Premium Rate',
      'SHARED_COST': 'Shared Cost',
      'VOIP': 'VoIP',
      'PERSONAL_NUMBER': 'Personal Number',
      'PAGER': 'Pager',
      'UAN': 'UAN (Universal Access Number)',
      'VOICEMAIL': 'Voicemail'
    };
    return descriptions[type] || String(type);
  }

  // Get formatted phone number in specific format
  format(format: 'international' | 'national' | 'e164' | 'rfc3966' | 'digitsOnly'): string {
    if (!this.phoneNumber) return this.rawPhone;
    
    switch (format) {
      case 'international':
        return this.phoneNumber.formatInternational();
      case 'national':
        return this.phoneNumber.formatNational();
      case 'e164':
        return this.phoneNumber.number || this.rawPhone;
      case 'rfc3966':
        return this.phoneNumber.getURI();
      case 'digitsOnly':
        return this.phoneNumber.number?.replace(/\D/g, '') || this.rawPhone;
      default:
        return this.rawPhone;
    }
  }

  // Static Methods

  // As-you-type formatting
  static formatAsYouType(input: string, country?: CountryCode): string {
    const formatter = new AsYouType(country || 'US');
    return formatter.input(input);
  }

  // Quick validation (fast)
  static isValid(phone: string, country?: CountryCode): boolean {
    try {
      return isValidPhoneNumber(phone, country);
    } catch {
      return false;
    }
  }

  // Get all supported countries
  static getSupportedCountries(): CountryCode[] {
    return getCountries();
  }

  // Get country calling code
  static getCallingCode(country: CountryCode): number {
    return getCountryCallingCode(country) as unknown as number;
  }

  // Get country name from code
  static getCountryName(code: CountryCode): string {
    const countryNames: Record<string, string> = {
      'US': 'United States',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'JP': 'Japan',
      'CN': 'China',
      'IN': 'India',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'RU': 'Russia',
      'KR': 'South Korea',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'PL': 'Poland',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'AT': 'Austria',
      'IE': 'Ireland',
      'NZ': 'New Zealand',
      'SG': 'Singapore',
      'HK': 'Hong Kong',
      'ZA': 'South Africa',
      'AE': 'United Arab Emirates',
      'SA': 'Saudi Arabia',
      'IL': 'Israel',
      'TR': 'Turkey',
      'GR': 'Greece',
      'PT': 'Portugal',
      'CZ': 'Czech Republic',
      'HU': 'Hungary',
      'RO': 'Romania',
      'TH': 'Thailand',
      'MY': 'Malaysia',
      'PH': 'Philippines',
      'VN': 'Vietnam',
      'ID': 'Indonesia',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'PE': 'Peru',
      'VE': 'Venezuela',
      'EG': 'Egypt',
      'NG': 'Nigeria',
      'KE': 'Kenya',
      'PK': 'Pakistan',
      'BD': 'Bangladesh',
      'UA': 'Ukraine',
    };
    return countryNames[code] || code;
  }

  // Parse multiple phone numbers from text (future feature)
  static findPhoneNumbers(text: string, country?: CountryCode): PhoneEnhanced[] {
    // This is a placeholder for future implementation
    // Would use libphonenumber's findNumbers functionality
    const phones: PhoneEnhanced[] = [];
    
    // Simple regex to find potential phone numbers
    const phoneRegex = /(\+?\d{1,4}[\s.-]?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g;
    const matches = text.match(phoneRegex);
    
    if (matches) {
      for (const match of matches) {
        try {
          const phone = new PhoneEnhanced(match, { defaultCountry: country });
          if (phone.result.isValid) {
            phones.push(phone);
          }
        } catch {
          // Skip invalid matches
        }
      }
    }
    
    return phones;
  }
}
