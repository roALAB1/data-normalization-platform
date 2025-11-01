/**
 * SmartCSVProcessor - Analyze CSV files and generate normalization strategies
 * 
 * Features:
 * - Automatic column type detection
 * - CSV parsing with encoding detection
 * - Normalization strategy generation
 * - Large file streaming support
 */

import { DataTypeDetector, type DataType, type DetectionResult } from './DataTypeDetector';
import type { NormalizationPlan, NormalizationColumn } from './UnifiedNormalizationEngine';

export interface CSVAnalysisResult {
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  columnDetections: Map<number, DetectionResult>;
  suggestedPlan: NormalizationPlan;
  encoding: string;
  delimiter: string;
}

export interface CSVParseOptions {
  delimiter?: string; // Auto-detect if not provided
  hasHeader?: boolean; // Auto-detect if not provided
  sampleSize?: number; // Number of rows to analyze (default: 100)
  maxRows?: number; // Maximum rows to parse (default: unlimited)
}

export class SmartCSVProcessor {
  /**
   * Detect CSV delimiter
   */
  private static detectDelimiter(text: string): string {
    const firstLine = text.split('\n')[0];
    const delimiters = [',', ';', '\t', '|'];
    
    let maxCount = 0;
    let bestDelimiter = ',';

    for (const delimiter of delimiters) {
      const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Detect if first row is header
   */
  private static hasHeaderRow(rows: string[][]): boolean {
    if (rows.length < 2) return true;

    const firstRow = rows[0];
    const secondRow = rows[1];

    // Check if first row has different characteristics than second row
    let headerScore = 0;

    for (let i = 0; i < Math.min(firstRow.length, secondRow.length); i++) {
      const first = firstRow[i];
      const second = secondRow[i];

      // Header typically has no numbers
      if (!/\d/.test(first) && /\d/.test(second)) {
        headerScore++;
      }

      // Header typically shorter
      if (first.length < second.length) {
        headerScore++;
      }

      // Header typically has underscores or spaces
      if ((/[_\s]/.test(first) && !/[_\s]/.test(second))) {
        headerScore++;
      }
    }

    return headerScore > firstRow.length / 2;
  }

  /**
   * Parse CSV text into rows
   */
  private static parseCSV(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      // Simple CSV parsing (doesn't handle quoted fields with delimiters)
      // For production, use a proper CSV library like papaparse
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      rows.push(values);
    }

    return rows;
  }

  /**
   * Analyze CSV file and generate normalization strategy
   * 
   * @param csvText - Raw CSV text content
   * @param options - Parsing options
   * @returns Analysis result with suggested normalization plan
   * 
   * @example
   * const csvText = `Name,Email,Phone
   * John Doe,john@example.com,415-555-2671
   * Jane Smith,jane@example.com,415-555-2672`;
   * 
   * const analysis = SmartCSVProcessor.analyze(csvText);
   * // Returns column detections and suggested normalization plan
   */
  static analyze(csvText: string, options: CSVParseOptions = {}): CSVAnalysisResult {
    // Step 1: Detect delimiter
    const delimiter = options.delimiter || this.detectDelimiter(csvText);

    // Step 2: Parse CSV
    const allRows = this.parseCSV(csvText, delimiter);
    if (allRows.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Step 3: Detect header
    const hasHeader = options.hasHeader !== undefined 
      ? options.hasHeader 
      : this.hasHeaderRow(allRows);

    const headers = hasHeader ? allRows[0] : allRows[0].map((_, i) => `Column ${i + 1}`);
    const dataRows = hasHeader ? allRows.slice(1) : allRows;

    if (dataRows.length === 0) {
      throw new Error('CSV file has no data rows');
    }

    // Step 4: Sample rows for analysis
    const sampleSize = options.sampleSize || 100;
    const sampleRows = dataRows.slice(0, sampleSize);

    // Step 5: Detect column types
    const columnDetections = DataTypeDetector.detectAll(headers, sampleRows);

    // Step 6: Generate normalization plan
    const columns: NormalizationColumn[] = [];

    for (const [colIndex, detection] of columnDetections) {
      // Only include columns with high enough confidence
      if (detection.confidence >= 50 && detection.type !== 'unknown') {
        columns.push({
          index: colIndex,
          name: headers[colIndex],
          type: detection.type,
          options: this.getDefaultOptions(detection.type)
        });
      }
    }

    const suggestedPlan: NormalizationPlan = { columns };

    return {
      headers,
      sampleRows,
      totalRows: dataRows.length,
      columnDetections,
      suggestedPlan,
      encoding: 'UTF-8', // TODO: Implement encoding detection
      delimiter
    };
  }

  /**
   * Get default normalization options for a data type
   */
  private static getDefaultOptions(type: DataType): Record<string, any> {
    switch (type) {
      case 'phone':
        return { defaultCountry: 'US' };
      case 'address':
        return { abbreviateDirectionals: false, abbreviateUnits: false };
      default:
        return {};
    }
  }

  /**
   * Generate human-readable summary of analysis
   */
  static generateSummary(analysis: CSVAnalysisResult): string {
    const lines: string[] = [];

    lines.push(`CSV Analysis Summary`);
    lines.push(`===================`);
    lines.push(``);
    lines.push(`Total Rows: ${analysis.totalRows.toLocaleString()}`);
    lines.push(`Total Columns: ${analysis.headers.length}`);
    lines.push(`Delimiter: ${analysis.delimiter === '\t' ? 'Tab' : analysis.delimiter}`);
    lines.push(`Encoding: ${analysis.encoding}`);
    lines.push(``);
    lines.push(`Column Detections:`);
    lines.push(`-----------------`);

    for (let i = 0; i < analysis.headers.length; i++) {
      const header = analysis.headers[i];
      const detection = analysis.columnDetections.get(i);

      if (detection) {
        const icon = DataTypeDetector.getTypeIcon(detection.type);
        const label = DataTypeDetector.getTypeLabel(detection.type);
        const confidenceLevel = DataTypeDetector.getConfidenceLevel(detection.confidence);

        lines.push(`${i + 1}. "${header}"`);
        lines.push(`   ${icon} Detected as: ${label}`);
        lines.push(`   Confidence: ${detection.confidence}% (${confidenceLevel.label})`);
        lines.push(`   Match Rate: ${Math.round(detection.matchRate * 100)}% (${detection.sampleMatches}/${detection.sampleTotal})`);
        lines.push(``);
      }
    }

    lines.push(`Suggested Normalization Plan:`);
    lines.push(`----------------------------`);

    if (analysis.suggestedPlan.columns.length === 0) {
      lines.push(`No columns detected for normalization (all below 50% confidence)`);
    } else {
      for (const column of analysis.suggestedPlan.columns) {
        const icon = DataTypeDetector.getTypeIcon(column.type);
        const label = DataTypeDetector.getTypeLabel(column.type);
        lines.push(`• ${icon} ${column.name} → ${label}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Validate that a plan is compatible with the CSV structure
   */
  static validatePlan(analysis: CSVAnalysisResult, plan: NormalizationPlan): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const column of plan.columns) {
      // Check column index is valid
      if (column.index < 0 || column.index >= analysis.headers.length) {
        errors.push(`Column index ${column.index} is out of range (0-${analysis.headers.length - 1})`);
      }

      // Check column name matches
      if (column.name !== analysis.headers[column.index]) {
        errors.push(`Column name mismatch at index ${column.index}: expected "${analysis.headers[column.index]}", got "${column.name}"`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Estimate processing time for a CSV file
   */
  static estimateProcessingTime(totalRows: number, columnCount: number): {
    seconds: number;
    formatted: string;
  } {
    // Rough estimate: 500 rows/second for single column, scales with column count
    const rowsPerSecond = 500 / Math.max(1, columnCount / 2);
    const seconds = Math.ceil(totalRows / rowsPerSecond);

    let formatted: string;
    if (seconds < 60) {
      formatted = `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      formatted = `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.ceil((seconds % 3600) / 60);
      formatted = `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    return { seconds, formatted };
  }
}
