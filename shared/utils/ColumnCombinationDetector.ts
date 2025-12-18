/**
 * ColumnCombinationDetector.ts
 * 
 * Detects fragmented columns that should be combined before normalization.
 * Supports address components, name components, and phone components.
 * 
 * @version 3.50.0
 */

export interface ColumnInfo {
  name: string;
  index: number;
  sampleValues: string[];
}

export interface CombinationSuggestion {
  type: 'address' | 'name' | 'phone';
  columns: ColumnInfo[];
  targetColumnName: string;
  confidence: number;
  previewSamples: string[];
  formula: string;
}

export interface DetectionResult {
  suggestions: CombinationSuggestion[];
  totalColumns: number;
  fragmentedColumns: number;
}

/**
 * Detects column combinations from CSV headers and sample data
 */
export class ColumnCombinationDetector {
  private static readonly ADDRESS_PATTERNS = {
    house: /^(house|house_?num|house_?no|street_?num|number|num|bldg|building)$/i,
    houseNoSuffix: /^(house_?no_?suffix|suffix|house_?suffix)$/i,
    street: /^(street|street_?name|street_?complete|street_?name_?complete|road|rd|avenue|ave)$/i,
    apt: /^(apt|apartment|unit|suite|ste|#)$/i,
    addressLine2: /^(address_?line_?2|addr_?2|line_?2|secondary)$/i,
  };

  private static readonly NAME_PATTERNS = {
    first: /^(first[\s_]?name|fname|f[\s_]?name|given[\s_]?name|forename)$/i,
    middle: /^(middle[\s_]?name|mname|m[\s_]?name|middle[\s_]?initial|mi)$/i,
    last: /^(last[\s_]?name|lname|l[\s_]?name|surname|family[\s_]?name)$/i,
    prefix: /^(prefix|title|salutation|honorific)$/i,
    suffix: /^(suffix|generation|jr|sr|iii)$/i,
  };

  private static readonly PHONE_PATTERNS = {
    areaCode: /^(area[\s_]?code|phone[\s_]?area|area|code)$/i,
    number: /^(phone[\s_]?number|phone[\s_]?num|phone|number|tel)$/i,
    extension: /^(ext|extension|phone_?ext)$/i,
  };

  /**
   * Detect all column combinations from CSV data
   */
  static detect(headers: string[], sampleRows: string[][]): DetectionResult {
    const columns: ColumnInfo[] = headers.map((name, index) => ({
      name,
      index,
      sampleValues: sampleRows.slice(0, 5).map(row => row[index] || ''),
    }));

    const suggestions: CombinationSuggestion[] = [];

    // Detect address combinations
    const addressSuggestion = this.detectAddressCombination(columns);
    if (addressSuggestion) {
      suggestions.push(addressSuggestion);
    }

    // Detect name combinations
    const nameSuggestion = this.detectNameCombination(columns);
    if (nameSuggestion) {
      suggestions.push(nameSuggestion);
    }

    // Detect phone combinations
    const phoneSuggestion = this.detectPhoneCombination(columns);
    if (phoneSuggestion) {
      suggestions.push(phoneSuggestion);
    }

    const fragmentedColumns = suggestions.reduce((sum, s) => sum + s.columns.length, 0);

    return {
      suggestions,
      totalColumns: headers.length,
      fragmentedColumns,
    };
  }

  /**
   * Detect address component columns
   */
  private static detectAddressCombination(columns: ColumnInfo[]): CombinationSuggestion | null {
    const components: { [key: string]: ColumnInfo } = {};

    for (const col of columns) {
      const normalized = col.name.trim().toLowerCase();

      if (this.ADDRESS_PATTERNS.house.test(normalized)) {
        components.house = col;
      } else if (this.ADDRESS_PATTERNS.houseNoSuffix.test(normalized)) {
        components.houseNoSuffix = col;
      } else if (this.ADDRESS_PATTERNS.street.test(normalized)) {
        components.street = col;
      } else if (this.ADDRESS_PATTERNS.apt.test(normalized)) {
        components.apt = col;
      } else if (this.ADDRESS_PATTERNS.addressLine2.test(normalized)) {
        components.addressLine2 = col;
      }
    }

    // Require at least house + street to suggest combination
    if (!components.house || !components.street) {
      return null;
    }

    const selectedColumns: ColumnInfo[] = [];
    const formula: string[] = [];

    // Build formula in proper order
    if (components.house) {
      selectedColumns.push(components.house);
      formula.push(`{${components.house.name}}`);
    }

    if (components.houseNoSuffix) {
      selectedColumns.push(components.houseNoSuffix);
      formula.push(`{${components.houseNoSuffix.name}}`);
    }

    if (components.street) {
      selectedColumns.push(components.street);
      formula.push(`{${components.street.name}}`);
    }

    if (components.apt) {
      selectedColumns.push(components.apt);
      formula.push(`Apt {${components.apt.name}}`);
    } else if (components.addressLine2) {
      selectedColumns.push(components.addressLine2);
      formula.push(`{${components.addressLine2.name}}`);
    }

    // Generate preview samples
    const previewSamples = this.generateAddressPreview(components);

    // Calculate confidence based on sample data quality
    const confidence = this.calculateAddressConfidence(components);

    return {
      type: 'address',
      columns: selectedColumns,
      targetColumnName: 'Address',
      confidence,
      previewSamples,
      formula: formula.join(' '),
    };
  }

  /**
   * Detect name component columns
   */
  private static detectNameCombination(columns: ColumnInfo[]): CombinationSuggestion | null {
    const components: { [key: string]: ColumnInfo } = {};

    for (const col of columns) {
      const normalized = col.name.trim().toLowerCase();

      if (this.NAME_PATTERNS.first.test(normalized)) {
        components.first = col;
      } else if (this.NAME_PATTERNS.middle.test(normalized)) {
        components.middle = col;
      } else if (this.NAME_PATTERNS.last.test(normalized)) {
        components.last = col;
      } else if (this.NAME_PATTERNS.prefix.test(normalized)) {
        components.prefix = col;
      } else if (this.NAME_PATTERNS.suffix.test(normalized)) {
        components.suffix = col;
      }
    }

    // Require at least first + last to suggest combination
    if (!components.first || !components.last) {
      return null;
    }

    const selectedColumns: ColumnInfo[] = [];
    const formula: string[] = [];

    // Build formula in proper order
    if (components.prefix) {
      selectedColumns.push(components.prefix);
      formula.push(`{${components.prefix.name}}`);
    }

    if (components.first) {
      selectedColumns.push(components.first);
      formula.push(`{${components.first.name}}`);
    }

    if (components.middle) {
      selectedColumns.push(components.middle);
      formula.push(`{${components.middle.name}}`);
    }

    if (components.last) {
      selectedColumns.push(components.last);
      formula.push(`{${components.last.name}}`);
    }

    if (components.suffix) {
      selectedColumns.push(components.suffix);
      formula.push(`{${components.suffix.name}}`);
    }

    // Generate preview samples
    const previewSamples = this.generateNamePreview(components);

    // Calculate confidence
    const confidence = this.calculateNameConfidence(components);

    return {
      type: 'name',
      columns: selectedColumns,
      targetColumnName: 'Full Name',
      confidence,
      previewSamples,
      formula: formula.join(' '),
    };
  }

  /**
   * Detect phone component columns
   */
  private static detectPhoneCombination(columns: ColumnInfo[]): CombinationSuggestion | null {
    const components: { [key: string]: ColumnInfo } = {};

    for (const col of columns) {
      const normalized = col.name.trim().toLowerCase();

      if (this.PHONE_PATTERNS.areaCode.test(normalized)) {
        components.areaCode = col;
      } else if (this.PHONE_PATTERNS.number.test(normalized)) {
        components.number = col;
      } else if (this.PHONE_PATTERNS.extension.test(normalized)) {
        components.extension = col;
      }
    }

    // Require area code + number to suggest combination
    if (!components.areaCode || !components.number) {
      return null;
    }

    const selectedColumns: ColumnInfo[] = [];
    const formula: string[] = [];

    if (components.areaCode) {
      selectedColumns.push(components.areaCode);
      formula.push(`({${components.areaCode.name}})`);
    }

    if (components.number) {
      selectedColumns.push(components.number);
      formula.push(`{${components.number.name}}`);
    }

    if (components.extension) {
      selectedColumns.push(components.extension);
      formula.push(`ext {${components.extension.name}}`);
    }

    // Generate preview samples
    const previewSamples = this.generatePhonePreview(components);

    // Calculate confidence
    const confidence = this.calculatePhoneConfidence(components);

    return {
      type: 'phone',
      columns: selectedColumns,
      targetColumnName: 'Phone',
      confidence,
      previewSamples,
      formula: formula.join(' '),
    };
  }

  /**
   * Generate address preview samples
   */
  private static generateAddressPreview(components: { [key: string]: ColumnInfo }): string[] {
    const samples: string[] = [];
    const maxSamples = 3;

    for (let i = 0; i < maxSamples; i++) {
      const parts: string[] = [];

      if (components.house?.sampleValues[i]) {
        parts.push(components.house.sampleValues[i]);
      }

      if (components.houseNoSuffix?.sampleValues[i]) {
        parts.push(components.houseNoSuffix.sampleValues[i]);
      }

      if (components.street?.sampleValues[i]) {
        parts.push(components.street.sampleValues[i]);
      }

      if (components.apt?.sampleValues[i]) {
        parts.push(`Apt ${components.apt.sampleValues[i]}`);
      } else if (components.addressLine2?.sampleValues[i]) {
        parts.push(components.addressLine2.sampleValues[i]);
      }

      const combined = parts.filter(p => p.trim()).join(' ');
      if (combined) {
        samples.push(combined);
      }
    }

    return samples.length > 0 ? samples : ['65 MILL ST', '400 BEDFORD ST Apt 306'];
  }

  /**
   * Generate name preview samples
   */
  private static generateNamePreview(components: { [key: string]: ColumnInfo }): string[] {
    const samples: string[] = [];
    const maxSamples = 3;

    for (let i = 0; i < maxSamples; i++) {
      const parts: string[] = [];

      if (components.prefix?.sampleValues[i]) {
        parts.push(components.prefix.sampleValues[i]);
      }

      if (components.first?.sampleValues[i]) {
        parts.push(components.first.sampleValues[i]);
      }

      if (components.middle?.sampleValues[i]) {
        parts.push(components.middle.sampleValues[i]);
      }

      if (components.last?.sampleValues[i]) {
        parts.push(components.last.sampleValues[i]);
      }

      if (components.suffix?.sampleValues[i]) {
        parts.push(components.suffix.sampleValues[i]);
      }

      const combined = parts.filter(p => p.trim()).join(' ');
      if (combined) {
        samples.push(combined);
      }
    }

    return samples.length > 0 ? samples : ['John Doe', 'Jane Smith'];
  }

  /**
   * Generate phone preview samples
   */
  private static generatePhonePreview(components: { [key: string]: ColumnInfo }): string[] {
    const samples: string[] = [];
    const maxSamples = 3;

    for (let i = 0; i < maxSamples; i++) {
      const parts: string[] = [];

      if (components.areaCode?.sampleValues[i]) {
        parts.push(`(${components.areaCode.sampleValues[i]})`);
      }

      if (components.number?.sampleValues[i]) {
        parts.push(components.number.sampleValues[i]);
      }

      if (components.extension?.sampleValues[i]) {
        parts.push(`ext ${components.extension.sampleValues[i]}`);
      }

      const combined = parts.filter(p => p.trim()).join(' ');
      if (combined) {
        samples.push(combined);
      }
    }

    return samples.length > 0 ? samples : ['(555) 123-4567', '(555) 987-6543'];
  }

  /**
   * Calculate confidence for address combination
   */
  private static calculateAddressConfidence(components: { [key: string]: ColumnInfo }): number {
    let score = 0;
    let maxScore = 0;

    // House number (required)
    maxScore += 30;
    if (components.house) {
      const hasValidSamples = components.house.sampleValues.some(v => /^\d+/.test(v));
      score += hasValidSamples ? 30 : 15;
    }

    // Street name (required)
    maxScore += 30;
    if (components.street) {
      const hasValidSamples = components.street.sampleValues.some(v => v.trim().length > 0);
      score += hasValidSamples ? 30 : 15;
    }

    // House suffix (optional bonus)
    maxScore += 10;
    if (components.houseNoSuffix) {
      score += 10;
    }

    // Apt/Unit (optional bonus)
    maxScore += 15;
    if (components.apt || components.addressLine2) {
      score += 15;
    }

    // Consistency check
    maxScore += 15;
    const sampleCount = components.house?.sampleValues.filter(v => v.trim()).length || 0;
    if (sampleCount >= 3) {
      score += 15;
    } else if (sampleCount >= 2) {
      score += 10;
    } else if (sampleCount >= 1) {
      score += 5;
    }

    return Math.round((score / maxScore) * 100) / 100;
  }

  /**
   * Calculate confidence for name combination
   */
  private static calculateNameConfidence(components: { [key: string]: ColumnInfo }): number {
    let score = 0;
    let maxScore = 0;

    // First name (required)
    maxScore += 40;
    if (components.first) {
      const hasValidSamples = components.first.sampleValues.some(v => v.trim().length > 0);
      score += hasValidSamples ? 40 : 20;
    }

    // Last name (required)
    maxScore += 40;
    if (components.last) {
      const hasValidSamples = components.last.sampleValues.some(v => v.trim().length > 0);
      score += hasValidSamples ? 40 : 20;
    }

    // Middle name (optional bonus)
    maxScore += 10;
    if (components.middle) {
      score += 10;
    }

    // Prefix/Suffix (optional bonus)
    maxScore += 10;
    if (components.prefix || components.suffix) {
      score += 10;
    }

    return Math.round((score / maxScore) * 100) / 100;
  }

  /**
   * Calculate confidence for phone combination
   */
  private static calculatePhoneConfidence(components: { [key: string]: ColumnInfo }): number {
    let score = 0;
    let maxScore = 0;

    // Area code (required)
    maxScore += 40;
    if (components.areaCode) {
      const hasValidSamples = components.areaCode.sampleValues.some(v => /^\d{3}$/.test(v));
      score += hasValidSamples ? 40 : 20;
    }

    // Phone number (required)
    maxScore += 40;
    if (components.number) {
      const hasValidSamples = components.number.sampleValues.some(v => /^\d{3}[-\s]?\d{4}$/.test(v));
      score += hasValidSamples ? 40 : 20;
    }

    // Extension (optional bonus)
    maxScore += 20;
    if (components.extension) {
      score += 20;
    }

    return Math.round((score / maxScore) * 100) / 100;
  }

  /**
   * Apply column combination to a row of data
   */
  static applyCombination(row: string[], suggestion: CombinationSuggestion): string {
    const parts: string[] = [];

    for (const col of suggestion.columns) {
      const value = row[col.index] || '';
      if (!value.trim()) continue;

      // Special handling for apt numbers
      if (suggestion.type === 'address' && col.name.toLowerCase().includes('apt')) {
        parts.push(`Apt ${value}`);
      }
      // Special handling for area codes
      else if (suggestion.type === 'phone' && col.name.toLowerCase().includes('area')) {
        parts.push(`(${value})`);
      }
      // Special handling for extensions
      else if (suggestion.type === 'phone' && col.name.toLowerCase().includes('ext')) {
        parts.push(`ext ${value}`);
      }
      // Default: just add the value
      else {
        parts.push(value);
      }
    }

    return parts.join(' ').trim();
  }
}
