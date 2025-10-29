/**
 * Context Analysis for Name Parsing
 * 
 * Analyzes additional context (email, phone, company) to improve name parsing accuracy,
 * especially for Asian names where cultural context helps determine name order.
 */

/**
 * Email domain to country/culture mapping
 */
const EMAIL_DOMAIN_CULTURE_MAP: Record<string, 'chinese' | 'korean' | 'japanese' | 'vietnamese'> = {
  // Chinese domains
  'cn': 'chinese',
  'com.cn': 'chinese',
  'net.cn': 'chinese',
  'org.cn': 'chinese',
  'edu.cn': 'chinese',
  'gov.cn': 'chinese',
  'hk': 'chinese',
  'com.hk': 'chinese',
  'tw': 'chinese',
  'com.tw': 'chinese',
  'mo': 'chinese',
  
  // Korean domains
  'kr': 'korean',
  'co.kr': 'korean',
  'or.kr': 'korean',
  'go.kr': 'korean',
  'ac.kr': 'korean',
  
  // Japanese domains
  'jp': 'japanese',
  'co.jp': 'japanese',
  'or.jp': 'japanese',
  'go.jp': 'japanese',
  'ac.jp': 'japanese',
  'ne.jp': 'japanese',
  
  // Vietnamese domains
  'vn': 'vietnamese',
  'com.vn': 'vietnamese',
  'net.vn': 'vietnamese',
  'org.vn': 'vietnamese',
  'edu.vn': 'vietnamese',
  'gov.vn': 'vietnamese',
};

/**
 * Phone country codes to culture mapping
 */
const PHONE_COUNTRY_CODE_MAP: Record<string, 'chinese' | 'korean' | 'japanese' | 'vietnamese'> = {
  // China
  '86': 'chinese',
  '+86': 'chinese',
  
  // Hong Kong
  '852': 'chinese',
  '+852': 'chinese',
  
  // Taiwan
  '886': 'chinese',
  '+886': 'chinese',
  
  // Macau
  '853': 'chinese',
  '+853': 'chinese',
  
  // South Korea
  '82': 'korean',
  '+82': 'korean',
  
  // Japan
  '81': 'japanese',
  '+81': 'japanese',
  
  // Vietnam
  '84': 'vietnamese',
  '+84': 'vietnamese',
};

/**
 * Extract domain from email address
 */
export function extractEmailDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Detect culture from email domain
 */
export function detectCultureFromEmail(email: string): 'chinese' | 'korean' | 'japanese' | 'vietnamese' | null {
  const domain = extractEmailDomain(email);
  if (!domain) return null;
  
  // Check exact domain match
  if (EMAIL_DOMAIN_CULTURE_MAP[domain]) {
    return EMAIL_DOMAIN_CULTURE_MAP[domain];
  }
  
  // Check TLD (top-level domain)
  const tld = domain.split('.').pop();
  if (tld && EMAIL_DOMAIN_CULTURE_MAP[tld]) {
    return EMAIL_DOMAIN_CULTURE_MAP[tld];
  }
  
  return null;
}

/**
 * Extract country code from phone number
 */
export function extractPhoneCountryCode(phone: string): string | null {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Match patterns like +86, +852, 86, 001-86, etc.
  const match = cleaned.match(/^\+?(\d{1,3})/);
  return match ? match[1] : null;
}

/**
 * Detect culture from phone country code
 */
export function detectCultureFromPhone(phone: string): 'chinese' | 'korean' | 'japanese' | 'vietnamese' | null {
  const countryCode = extractPhoneCountryCode(phone);
  if (!countryCode) return null;
  
  // Check with + prefix
  if (PHONE_COUNTRY_CODE_MAP[`+${countryCode}`]) {
    return PHONE_COUNTRY_CODE_MAP[`+${countryCode}`];
  }
  
  // Check without + prefix
  if (PHONE_COUNTRY_CODE_MAP[countryCode]) {
    return PHONE_COUNTRY_CODE_MAP[countryCode];
  }
  
  return null;
}

/**
 * Detect culture from company name
 * Uses common patterns in company names to infer culture
 */
export function detectCultureFromCompany(company: string): 'chinese' | 'korean' | 'japanese' | 'vietnamese' | null {
  const lower = company.toLowerCase();
  
  // Chinese indicators
  if (lower.includes('china') || 
      lower.includes('chinese') ||
      lower.includes('beijing') ||
      lower.includes('shanghai') ||
      lower.includes('shenzhen') ||
      lower.includes('guangzhou') ||
      lower.includes('hong kong') ||
      lower.includes('taiwan')) {
    return 'chinese';
  }
  
  // Korean indicators
  if (lower.includes('korea') ||
      lower.includes('korean') ||
      lower.includes('seoul') ||
      lower.includes('samsung') ||
      lower.includes('hyundai') ||
      lower.includes('lg ') ||
      lower.includes('sk ')) {
    return 'korean';
  }
  
  // Japanese indicators
  if (lower.includes('japan') ||
      lower.includes('japanese') ||
      lower.includes('tokyo') ||
      lower.includes('osaka') ||
      lower.includes('sony') ||
      lower.includes('toyota') ||
      lower.includes('honda') ||
      lower.includes('nissan') ||
      lower.includes('panasonic')) {
    return 'japanese';
  }
  
  // Vietnamese indicators
  if (lower.includes('vietnam') ||
      lower.includes('vietnamese') ||
      lower.includes('hanoi') ||
      lower.includes('ho chi minh') ||
      lower.includes('saigon')) {
    return 'vietnamese';
  }
  
  return null;
}

/**
 * Context information for name parsing
 */
export interface NameContext {
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
}

/**
 * Analyzed context with detected culture and confidence
 */
export interface ContextAnalysis {
  detectedCulture: 'chinese' | 'korean' | 'japanese' | 'vietnamese' | null;
  confidence: number;  // 0-100
  sources: string[];   // Which context fields contributed to detection
}

/**
 * Analyze context to detect likely culture
 * Combines signals from email, phone, and company to determine culture
 */
export function analyzeContext(context: NameContext): ContextAnalysis {
  const cultures: Array<{ culture: 'chinese' | 'korean' | 'japanese' | 'vietnamese'; source: string; weight: number }> = [];
  
  // Email domain analysis (high confidence)
  if (context.email) {
    const emailCulture = detectCultureFromEmail(context.email);
    if (emailCulture) {
      cultures.push({ culture: emailCulture, source: 'email', weight: 40 });
    }
  }
  
  // Phone country code analysis (high confidence)
  if (context.phone) {
    const phoneCulture = detectCultureFromPhone(context.phone);
    if (phoneCulture) {
      cultures.push({ culture: phoneCulture, source: 'phone', weight: 40 });
    }
  }
  
  // Company name analysis (medium confidence)
  if (context.company) {
    const companyCulture = detectCultureFromCompany(context.company);
    if (companyCulture) {
      cultures.push({ culture: companyCulture, source: 'company', weight: 20 });
    }
  }
  
  // No context signals found
  if (cultures.length === 0) {
    return {
      detectedCulture: null,
      confidence: 0,
      sources: []
    };
  }
  
  // Count votes for each culture
  const votes: Record<string, { weight: number; sources: string[] }> = {};
  for (const { culture, source, weight } of cultures) {
    if (!votes[culture]) {
      votes[culture] = { weight: 0, sources: [] };
    }
    votes[culture].weight += weight;
    votes[culture].sources.push(source);
  }
  
  // Find culture with highest weight
  let maxWeight = 0;
  let detectedCulture: 'chinese' | 'korean' | 'japanese' | 'vietnamese' | null = null;
  let sources: string[] = [];
  
  for (const [culture, data] of Object.entries(votes)) {
    if (data.weight > maxWeight) {
      maxWeight = data.weight;
      detectedCulture = culture as 'chinese' | 'korean' | 'japanese' | 'vietnamese';
      sources = data.sources;
    }
  }
  
  // Calculate confidence (0-100)
  // Max possible weight is 100 (email 40 + phone 40 + company 20)
  const confidence = Math.min(100, maxWeight);
  
  return {
    detectedCulture,
    confidence,
    sources
  };
}

/**
 * Boost Asian surname confidence based on context
 * If context suggests Asian culture, increase confidence in Asian surname detection
 */
export function boostConfidenceWithContext(
  baseConfidence: number,
  contextAnalysis: ContextAnalysis
): number {
  if (!contextAnalysis.detectedCulture || contextAnalysis.confidence < 50) {
    return baseConfidence;
  }
  
  // If context strongly suggests Asian culture, boost confidence
  const boost = contextAnalysis.confidence * 0.2; // Up to 20 point boost
  return Math.min(100, baseConfidence + boost);
}
