export interface CountryCode {
  country: string;
  code: string;
  dialCode: string;
  format: string;
  minLength: number;
  maxLength: number;
}

export const phoneConfig = {
  // Major country codes and formats
  COUNTRY_CODES: [
    { country: "United States", code: "US", dialCode: "+1", format: "(###) ###-####", minLength: 10, maxLength: 10 },
    { country: "Canada", code: "CA", dialCode: "+1", format: "(###) ###-####", minLength: 10, maxLength: 10 },
    { country: "United Kingdom", code: "GB", dialCode: "+44", format: "#### ### ####", minLength: 10, maxLength: 10 },
    { country: "Australia", code: "AU", dialCode: "+61", format: "#### ### ###", minLength: 9, maxLength: 9 },
    { country: "Germany", code: "DE", dialCode: "+49", format: "#### #######", minLength: 10, maxLength: 11 },
    { country: "France", code: "FR", dialCode: "+33", format: "# ## ## ## ##", minLength: 9, maxLength: 9 },
    { country: "Italy", code: "IT", dialCode: "+39", format: "### ### ####", minLength: 10, maxLength: 10 },
    { country: "Spain", code: "ES", dialCode: "+34", format: "### ### ###", minLength: 9, maxLength: 9 },
    { country: "Mexico", code: "MX", dialCode: "+52", format: "### ### ####", minLength: 10, maxLength: 10 },
    { country: "Brazil", code: "BR", dialCode: "+55", format: "(##) #####-####", minLength: 11, maxLength: 11 },
    { country: "Argentina", code: "AR", dialCode: "+54", format: "### ###-####", minLength: 10, maxLength: 10 },
    { country: "China", code: "CN", dialCode: "+86", format: "### #### ####", minLength: 11, maxLength: 11 },
    { country: "Japan", code: "JP", dialCode: "+81", format: "##-####-####", minLength: 10, maxLength: 10 },
    { country: "India", code: "IN", dialCode: "+91", format: "##### #####", minLength: 10, maxLength: 10 },
    { country: "Russia", code: "RU", dialCode: "+7", format: "(###) ###-##-##", minLength: 10, maxLength: 10 },
    { country: "South Korea", code: "KR", dialCode: "+82", format: "##-####-####", minLength: 10, maxLength: 10 },
    { country: "Netherlands", code: "NL", dialCode: "+31", format: "## ########", minLength: 9, maxLength: 9 },
    { country: "Belgium", code: "BE", dialCode: "+32", format: "### ## ## ##", minLength: 9, maxLength: 9 },
    { country: "Switzerland", code: "CH", dialCode: "+41", format: "## ### ## ##", minLength: 9, maxLength: 9 },
    { country: "Sweden", code: "SE", dialCode: "+46", format: "##-### ## ##", minLength: 9, maxLength: 9 },
    { country: "Poland", code: "PL", dialCode: "+48", format: "### ### ###", minLength: 9, maxLength: 9 },
    { country: "Turkey", code: "TR", dialCode: "+90", format: "(###) ### ## ##", minLength: 10, maxLength: 10 },
    { country: "South Africa", code: "ZA", dialCode: "+27", format: "## ### ####", minLength: 9, maxLength: 9 },
    { country: "New Zealand", code: "NZ", dialCode: "+64", format: "##-### ####", minLength: 9, maxLength: 9 },
    { country: "Singapore", code: "SG", dialCode: "+65", format: "#### ####", minLength: 8, maxLength: 8 },
    { country: "Hong Kong", code: "HK", dialCode: "+852", format: "#### ####", minLength: 8, maxLength: 8 },
    { country: "Ireland", code: "IE", dialCode: "+353", format: "## ### ####", minLength: 9, maxLength: 9 },
    { country: "Portugal", code: "PT", dialCode: "+351", format: "### ### ###", minLength: 9, maxLength: 9 },
    { country: "Greece", code: "GR", dialCode: "+30", format: "### ### ####", minLength: 10, maxLength: 10 },
    { country: "Israel", code: "IL", dialCode: "+972", format: "##-###-####", minLength: 9, maxLength: 9 },
  ] as CountryCode[],

  // Common invalid patterns
  INVALID_PATTERNS: [
    /^0+$/,           // All zeros
    /^1+$/,           // All ones
    /^(\d)\1+$/,      // All same digit
    /^1234567890$/,   // Sequential
    /^0123456789$/,   // Sequential starting with 0
    /^555(0|1)\d{6}$/, // US fake numbers (555-01xx)
  ],

  // Common separators to remove
  SEPARATORS: ['-', '.', ' ', '(', ')', '[', ']', '{', '}', '/', '\\', '_', '|'],

  // Extensions patterns
  EXTENSION_PATTERNS: [
    /\b(ext|extension|x)\s*[:.]?\s*(\d+)/i,
    /\b#(\d+)/,
  ],

  // US/Canada area codes that are invalid
  INVALID_US_AREA_CODES: [
    '000', '001', '002', '003', '004', '005', '006', '007', '008', '009',
    '555', // Reserved for directory assistance and fictional use
    '911', // Emergency
  ],

  // Common typos and fixes
  COMMON_FIXES: {
    'O': '0',
    'o': '0',
    'I': '1',
    'i': '1',
    'l': '1',
    'S': '5',
    'Z': '2',
    'B': '8',
  } as Record<string, string>,

  // Toll-free prefixes (US/Canada)
  TOLL_FREE_PREFIXES: ['800', '888', '877', '866', '855', '844', '833'],

  // Mobile prefixes by country (sample)
  MOBILE_PREFIXES: {
    'US': ['2', '3', '4', '5', '6', '7', '8', '9'], // All area codes can be mobile
    'GB': ['7'],
    'AU': ['4'],
    'DE': ['15', '16', '17'],
    'FR': ['6', '7'],
    'IN': ['6', '7', '8', '9'],
    'CN': ['13', '14', '15', '16', '17', '18', '19'],
  } as Record<string, string[]>,
};

export type PhoneFormat = 'E164' | 'NATIONAL' | 'INTERNATIONAL' | 'RFC3966';
export type PhoneType = 'MOBILE' | 'FIXED_LINE' | 'TOLL_FREE' | 'VOIP' | 'UNKNOWN';
