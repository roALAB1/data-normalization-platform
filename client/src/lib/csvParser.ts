/**
 * Intelligent CSV parser for name data
 * Detects column structure and extracts names appropriately
 */

export interface CSVParseResult {
  names: string[];
  detectedFormat: 'single' | 'first_last' | 'full_first_last' | 'unknown';
  hasHeader: boolean;
  totalRows: number;
  skippedRows: number;
}

/**
 * Parse CSV content and extract names intelligently
 */
export function parseCSVForNames(csvContent: string): CSVParseResult {
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  if (lines.length === 0) {
    return {
      names: [],
      detectedFormat: 'unknown',
      hasHeader: false,
      totalRows: 0,
      skippedRows: 0,
    };
  }

  // Parse all rows
  const rows = lines.map(line => parseCSVLine(line));
  
  // Detect if first row is a header
  const hasHeader = detectHeader(rows[0]);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  
  // Detect column format
  const format = detectColumnFormat(dataRows);
  
  // Extract names based on detected format
  const names = extractNames(dataRows, format);
  
  return {
    names,
    detectedFormat: format,
    hasHeader,
    totalRows: lines.length,
    skippedRows: lines.length - names.length,
  };
}

/**
 * Parse a single CSV line into columns
 * Handles quoted fields and commas within quotes
 */
function parseCSVLine(line: string): string[] {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      columns.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  columns.push(current.trim());
  
  return columns;
}

/**
 * Detect if the first row is a header
 */
function detectHeader(firstRow: string[]): boolean {
  if (firstRow.length === 0) return false;
  
  // Common header keywords
  const headerKeywords = [
    'name', 'first', 'last', 'full', 'firstname', 'lastname',
    'given', 'surname', 'family', 'middle', 'email', 'phone',
    'company', 'title', 'url', 'linkedin', 'id'
  ];
  
  // Check if first row contains header-like text
  const firstRowText = firstRow.slice(0, 5).join(' ').toLowerCase();
  const hasHeaderKeyword = headerKeywords.some(kw => firstRowText.includes(kw));
  
  // Check if first row has very long text (likely not a name)
  const hasLongFields = firstRow.some(col => col.length > 100);
  
  // Check if first row looks like a URL or ID
  const hasNonNamePattern = firstRow.some(col => 
    col.startsWith('http') || 
    col.includes('linkedin.com') ||
    /^\d+$/.test(col)
  );
  
  return hasHeaderKeyword || hasLongFields || hasNonNamePattern;
}

/**
 * Detect the column format of the CSV
 */
function detectColumnFormat(rows: string[][]): 'single' | 'first_last' | 'full_first_last' | 'unknown' {
  if (rows.length === 0) return 'unknown';
  
  // Sample first few rows to detect pattern
  const sampleSize = Math.min(10, rows.length);
  const sample = rows.slice(0, sampleSize);
  
  // Check column count
  const avgColumns = sample.reduce((sum, row) => sum + row.length, 0) / sample.length;
  
  if (avgColumns < 2) {
    return 'single'; // Only one column
  }
  
  // Check if columns 2 and 3 look like first/last names
  let firstLastScore = 0;
  let fullFirstLastScore = 0;
  
  for (const row of sample) {
    if (row.length >= 2) {
      const col1 = row[0].trim();
      const col2 = row[1].trim();
      const col3 = row.length >= 3 ? row[2].trim() : '';
      
      // Check if col2 and col3 are single words (likely first/last)
      const col2Words = col2.split(/\s+/).length;
      const col3Words = col3.split(/\s+/).length;
      
      if (col2Words === 1 && col3Words <= 2) {
        firstLastScore++;
      }
      
      // Check if col1 contains both col2 and col3
      if (col1.includes(col2) && col3 && col1.includes(col3.split(',')[0])) {
        fullFirstLastScore++;
      }
    }
  }
  
  // Determine format based on scores
  if (fullFirstLastScore >= sampleSize * 0.7) {
    return 'full_first_last'; // Columns: Full Name, First, Last
  } else if (firstLastScore >= sampleSize * 0.7) {
    return 'first_last'; // Columns: First, Last
  } else if (avgColumns >= 2) {
    return 'full_first_last'; // Default to this if multiple columns
  }
  
  return 'single';
}

/**
 * Extract names from rows based on detected format
 */
function extractNames(rows: string[][], format: string): string[] {
  return rows
    .map(row => {
      if (row.length === 0) return null;
      
      switch (format) {
        case 'single':
          // Just use the first column
          return row[0].trim();
          
        case 'first_last':
          // Combine first and last name from columns 1 and 2
          if (row.length >= 2) {
            const first = row[0].trim();
            const last = row[1].trim();
            return `${first} ${last}`.trim();
          }
          return row[0].trim();
          
        case 'full_first_last':
          // Use columns 2 and 3 (first and last) instead of column 1 (full with credentials)
          if (row.length >= 3) {
            const first = row[1].trim();
            const last = row[2].trim();
            
            // Remove credentials from last name (everything after comma)
            const lastClean = last.split(',')[0].trim();
            
            return `${first} ${lastClean}`.trim();
          } else if (row.length >= 2) {
            return `${row[0].trim()} ${row[1].trim()}`.trim();
          }
          return row[0].trim();
          
        default:
          return row[0].trim();
      }
    })
    .filter((name): name is string => name !== null && name.length > 0);
}

/**
 * Get a human-readable description of the detected format
 */
export function getFormatDescription(format: string): string {
  switch (format) {
    case 'single':
      return 'Single column with full names';
    case 'first_last':
      return 'Two columns: First Name, Last Name';
    case 'full_first_last':
      return 'Three columns: Full Name, First Name, Last Name (using First + Last)';
    default:
      return 'Unknown format';
  }
}
