/**
 * DataTypeDetector - Automatically detect data types in CSV columns
 * 
 * Analyzes column headers and sample data to identify:
 * - Names (full, first, last)
 * - Emails
 * - Phone numbers
 * - Addresses
 * - Cities, states, zip codes
 * - Companies
 * - Unknown types
 * 
 * Uses header analysis (40% weight) + pattern matching (60% weight)
 * to generate confidence scores (0-100%).
 */

export type DataType =
  | 'name'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'address'
  | 'city'
  | 'state'
  | 'zip'
  | 'country'
  | 'company'
  | 'unknown';

export interface DetectionResult {
  type: DataType;
  confidence: number; // 0-100
  sampleMatches: number;
  sampleTotal: number;
  matchRate: number; // 0-1
  headerScore: number; // 0-100
  patternScore: number; // 0-100
}

export class DataTypeDetector {
  // Header patterns for each type (case-insensitive)
  private static readonly HEADER_PATTERNS: Record<DataType, RegExp[]> = {
    name: [
      /^(full[_\s-]?)?name$/i,
      /^contact[_\s-]?name$/i,
      /^person$/i
    ],
    first_name: [
      /^first[_\s-]?name$/i,
      /^fname$/i,
      /^given[_\s-]?name$/i
    ],
    last_name: [
      /^last[_\s-]?name$/i,
      /^lname$/i,
      /^surname$/i,
      /^family[_\s-]?name$/i
    ],
    email: [
      /^e?-?mail([_\s-]?address)?$/i,
      /^contact[_\s-]?email$/i,
      /^work[_\s-]?email$/i,
      /^personal[_\s-]?email$/i
    ],
    phone: [
      /^(phone|tel|telephone)([_\s-]?(number|no\.?))?$/i,
      /^(mobile|cell)([_\s-]?(phone|number))?$/i,
      /^work[_\s-]?phone$/i,
      /^home[_\s-]?phone$/i,
      /^contact[_\s-]?(phone|number)$/i
    ],
    address: [
      /^(street[_\s-]?)?address([_\s-]?line)?([_\s-]?1)?$/i,
      /^mailing[_\s-]?address$/i,
      /^street$/i,
      /^addr(ess)?$/i
    ],
    city: [
      /^city$/i,
      /^town$/i,
      /^municipality$/i
    ],
    state: [
      /^state$/i,
      /^province$/i,
      /^region$/i,
      /^st$/i
    ],
    zip: [
      /^zip([_\s-]?code)?$/i,
      /^postal[_\s-]?code$/i,
      /^postcode$/i
    ],
    country: [
      /^country$/i,
      /^nation$/i
    ],
    company: [
      /^company([_\s-]?name)?$/i,
      /^organization$/i,
      /^org$/i,
      /^business$/i,
      /^employer$/i
    ],
    unknown: []
  };

  // Content patterns for each type
  private static readonly CONTENT_PATTERNS: Record<DataType, RegExp> = {
    name: /^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,3}$/,
    first_name: /^[A-Z][a-z]{1,20}$/,
    last_name: /^[A-Z][a-z]{1,30}$/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^[\+\d][\d\s\-\(\)\.]{8,20}$/,
    address: /^\d+\s+[A-Z][a-zA-Z\s]{5,50}(St|Ave|Rd|Dr|Ln|Ct|Blvd|Way|Pl|Ter|Pkwy|Circle|Trail|Street|Avenue|Road|Drive|Lane|Court|Boulevard|Place|Terrace|Parkway)/i,
    city: /^[A-Z][a-zA-Z\s]{2,30}$/,
    state: /^[A-Z]{2}$|^[A-Z][a-z]{3,20}$/,
    zip: /^\d{5}(-\d{4})?$/,
    country: /^[A-Z][a-zA-Z\s]{2,30}$/,
    company: /^[A-Z][a-zA-Z0-9\s\.,&'-]{2,50}(Inc|LLC|Ltd|Corp|Co|Company)?\.?$/i,
    unknown: /.*/
  };

  /**
   * Analyze header to determine likely data type
   * Returns score 0-100
   */
  private static analyzeHeader(header: string): { type: DataType; score: number } {
    const normalized = header.trim().toLowerCase();

    for (const [type, patterns] of Object.entries(this.HEADER_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(normalized)) {
          return { type: type as DataType, score: 100 };
        }
      }
    }

    // Partial matches
    if (normalized.includes('name')) return { type: 'name', score: 60 };
    if (normalized.includes('email') || normalized.includes('mail')) return { type: 'email', score: 60 };
    if (normalized.includes('phone') || normalized.includes('tel')) return { type: 'phone', score: 60 };
    if (normalized.includes('address') || normalized.includes('street')) return { type: 'address', score: 60 };
    if (normalized.includes('city')) return { type: 'city', score: 60 };
    if (normalized.includes('state')) return { type: 'state', score: 60 };
    if (normalized.includes('zip') || normalized.includes('postal')) return { type: 'zip', score: 60 };
    if (normalized.includes('country')) return { type: 'country', score: 60 };
    if (normalized.includes('company') || normalized.includes('org')) return { type: 'company', score: 60 };

    return { type: 'unknown', score: 0 };
  }

  /**
   * Analyze sample data to determine data type
   * Returns type and match rate
   */
  private static analyzeSamples(samples: string[]): { type: DataType; matches: number; total: number } {
    const validSamples = samples.filter(s => s && s.trim().length > 0);
    if (validSamples.length === 0) {
      return { type: 'unknown', matches: 0, total: 0 };
    }

    const scores: Record<DataType, number> = {
      name: 0,
      first_name: 0,
      last_name: 0,
      email: 0,
      phone: 0,
      address: 0,
      city: 0,
      state: 0,
      zip: 0,
      country: 0,
      company: 0,
      unknown: 0
    };

    // Test each sample against each pattern
    for (const sample of validSamples) {
      for (const [type, pattern] of Object.entries(this.CONTENT_PATTERNS)) {
        if (pattern.test(sample.trim())) {
          scores[type as DataType]++;
        }
      }
    }

    // Find type with highest score
    let bestType: DataType = 'unknown';
    let bestScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type as DataType;
      }
    }

    return {
      type: bestType,
      matches: bestScore,
      total: validSamples.length
    };
  }

  /**
   * Detect data type for a single column
   * 
   * @param header - Column header/name
   * @param samples - Sample values from the column (first 100 rows recommended)
   * @returns Detection result with confidence score
   * 
   * @example
   * const result = DataTypeDetector.detectColumn('Email', [
   *   'john@example.com',
   *   'jane@example.com',
   *   'invalid'
   * ]);
   * // Returns: { type: 'email', confidence: 85, ... }
   */
  static detectColumn(header: string, samples: string[]): DetectionResult {
    // Step 1: Analyze header (40% weight)
    const headerAnalysis = this.analyzeHeader(header);
    const headerScore = headerAnalysis.score;

    // Step 2: Analyze samples (60% weight)
    const sampleAnalysis = this.analyzeSamples(samples);
    const matchRate = sampleAnalysis.total > 0 
      ? sampleAnalysis.matches / sampleAnalysis.total 
      : 0;
    const patternScore = matchRate * 100;

    // Step 3: Combine scores
    // If header and pattern agree, boost confidence
    // If they disagree, use weighted average
    let finalType: DataType;
    let confidence: number;

    if (headerAnalysis.type === sampleAnalysis.type && headerAnalysis.type !== 'unknown') {
      // Agreement - high confidence
      finalType = headerAnalysis.type;
      confidence = Math.min(100, (headerScore * 0.4 + patternScore * 0.6) * 1.2);
    } else if (headerScore >= 80) {
      // Strong header signal
      finalType = headerAnalysis.type;
      confidence = headerScore * 0.7 + patternScore * 0.3;
    } else if (patternScore >= 70) {
      // Strong pattern signal
      finalType = sampleAnalysis.type;
      confidence = headerScore * 0.3 + patternScore * 0.7;
    } else {
      // Weak signals - use weighted average
      finalType = patternScore > headerScore ? sampleAnalysis.type : headerAnalysis.type;
      confidence = headerScore * 0.4 + patternScore * 0.6;
    }

    return {
      type: finalType,
      confidence: Math.round(confidence),
      sampleMatches: sampleAnalysis.matches,
      sampleTotal: sampleAnalysis.total,
      matchRate,
      headerScore,
      patternScore: Math.round(patternScore)
    };
  }

  /**
   * Detect data types for all columns in a CSV
   * 
   * @param headers - Array of column headers
   * @param rows - Array of data rows (each row is an array of values)
   * @param sampleSize - Number of rows to analyze (default: 100)
   * @returns Map of column index to detection result
   * 
   * @example
   * const headers = ['Name', 'Email', 'Phone'];
   * const rows = [
   *   ['John Doe', 'john@example.com', '415-555-2671'],
   *   ['Jane Smith', 'jane@example.com', '415-555-2672']
   * ];
   * const results = DataTypeDetector.detectAll(headers, rows);
   */
  static detectAll(
    headers: string[],
    rows: string[][],
    sampleSize: number = 100
  ): Map<number, DetectionResult> {
    const results = new Map<number, DetectionResult>();
    const sampleRows = rows.slice(0, sampleSize);

    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const header = headers[colIndex];
      const samples = sampleRows.map(row => row[colIndex] || '');
      const result = this.detectColumn(header, samples);
      results.set(colIndex, result);
    }

    return results;
  }

  /**
   * Get human-readable label for data type
   */
  static getTypeLabel(type: DataType): string {
    const labels: Record<DataType, string> = {
      name: 'Full Name',
      first_name: 'First Name',
      last_name: 'Last Name',
      email: 'Email Address',
      phone: 'Phone Number',
      address: 'Street Address',
      city: 'City',
      state: 'State/Province',
      zip: 'ZIP/Postal Code',
      country: 'Country',
      company: 'Company Name',
      unknown: 'Unknown'
    };
    return labels[type];
  }

  /**
   * Get icon/emoji for data type
   */
  static getTypeIcon(type: DataType): string {
    const icons: Record<DataType, string> = {
      name: '👤',
      first_name: '👤',
      last_name: '👤',
      email: '📧',
      phone: '📞',
      address: '🏠',
      city: '🏙️',
      state: '🗺️',
      zip: '📮',
      country: '🌍',
      company: '🏢',
      unknown: '❓'
    };
    return icons[type];
  }

  /**
   * Get confidence level description
   */
  static getConfidenceLevel(confidence: number): {
    level: 'high' | 'medium' | 'low' | 'unknown';
    label: string;
    color: string;
  } {
    if (confidence >= 90) {
      return { level: 'high', label: 'High Confidence', color: 'green' };
    } else if (confidence >= 70) {
      return { level: 'medium', label: 'Medium Confidence', color: 'yellow' };
    } else if (confidence >= 50) {
      return { level: 'low', label: 'Low Confidence', color: 'orange' };
    } else {
      return { level: 'unknown', label: 'Unknown', color: 'gray' };
    }
  }
}
