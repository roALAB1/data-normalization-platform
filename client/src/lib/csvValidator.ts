/**
 * CSV File Validation Utility
 * Validates CSV files before upload
 */

import Papa from "papaparse";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    columnCount: number;
    columns: string[];
    sampleRowCount: number;
    estimatedTotalRows: number;
  };
}

/**
 * Validate CSV file before upload
 * Checks file extension, size, structure, and column count
 */
export async function validateCSVFile(file: File): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check file extension
  if (!file.name.toLowerCase().endsWith(".csv")) {
    errors.push("File must be a CSV file (.csv extension)");
    return { valid: false, errors, warnings };
  }

  // 2. Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB === 0) {
    errors.push("File is empty");
    return { valid: false, errors, warnings };
  }
  
  if (fileSizeMB > 500) {
    warnings.push(`Large file (${fileSizeMB.toFixed(1)} MB) - upload may take several minutes`);
  } else if (fileSizeMB > 100) {
    warnings.push(`File size: ${fileSizeMB.toFixed(1)} MB`);
  }

  // 3. Parse first 10 rows to check structure
  try {
    const result = await parseFirstRows(file, 10);
    
    if (!result.meta.fields || result.meta.fields.length === 0) {
      errors.push("CSV file has no columns - check if first row contains headers");
      return { valid: false, errors, warnings };
    }

    if (result.meta.fields.length < 2) {
      errors.push("CSV file must have at least 2 columns");
      return { valid: false, errors, warnings };
    }

    if (result.data.length === 0) {
      errors.push("CSV file has no data rows (only headers)");
      return { valid: false, errors, warnings };
    }

    // Estimate total rows based on file size
    const avgRowSize = file.size / result.data.length;
    const estimatedRows = Math.floor(file.size / avgRowSize);

    // Check for parsing errors
    if (result.errors.length > 0) {
      const criticalErrors = result.errors.filter(e => e.type === "FieldMismatch");
      if (criticalErrors.length > 0) {
        warnings.push(`Found ${criticalErrors.length} rows with mismatched column counts - these rows may be skipped`);
      }
    }

    return {
      valid: true,
      errors,
      warnings,
      metadata: {
        columnCount: result.meta.fields.length,
        columns: result.meta.fields,
        sampleRowCount: result.data.length,
        estimatedTotalRows: estimatedRows,
      },
    };
  } catch (error) {
    errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : "Unknown error"}`);
    return { valid: false, errors, warnings };
  }
}

/**
 * Parse first N rows of CSV file
 */
function parseFirstRows(file: File, rowCount: number): Promise<Papa.ParseResult<any>> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: rowCount,
      complete: (results) => resolve(results),
      error: (error) => reject(error),
    });
  });
}
