// @ts-nocheck
/**
 * Schema Analyzer
 * 
 * Analyzes CSV column headers to detect:
 * - Column types (name, email, phone, address, etc.)
 * - Column roles (full, component, variant)
 * - Column relationships (which columns are related)
 * - Column context (personal, business, mobile, landline, etc.)
 * 
 * v3.14.1: Now includes data quality analysis to choose best source columns
 */

import { analyzeColumnQuality } from './dataQualityAnalyzer';

export interface ColumnSchema {
  name: string;
  type: 'name' | 'first-name' | 'last-name' | 'email' | 'phone' | 'address' | 'location' | 'company' | 'job-title' | 'zip' | 'city' | 'state' | 'country' | 'unknown';
  role: 'full' | 'component' | 'variant' | 'independent';
  relatedTo?: string[]; // Which columns are related to this one
  context?: 'personal' | 'business' | 'mobile' | 'landline' | 'home' | 'work';
  qualityScore?: number; // 0-100 score based on data quality analysis
  qualityIssues?: string[]; // List of detected quality issues
  sampleValues?: string[]; // Sample values from this column (first 3)
}

/**
 * Analyze CSV headers to detect column relationships
 * 
 * v3.14.1: Now accepts optional sample data for intelligent quality analysis
 */
export function analyzeSchema(headers: string[], sampleData?: any[]): ColumnSchema[] {
  const schemas: ColumnSchema[] = [];
  
  // Normalize headers for matching (lowercase, trim)
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Detect name columns
  const nameCol = headers.find((_, i) => /^(name|full.?name)$/i.test(normalizedHeaders[i]));
  const firstCol = headers.find((_, i) => /^(first.?name|fname|given.?name)$/i.test(normalizedHeaders[i]));
  const lastCol = headers.find((_, i) => /^(last.?name|lname|surname|family.?name)$/i.test(normalizedHeaders[i]));
  
  if (nameCol && (firstCol || lastCol)) {
    // We have a full name column AND component columns
    schemas.push({ 
      name: nameCol, 
      type: 'name', 
      role: 'full' 
    });
    
    if (firstCol) {
      schemas.push({ 
        name: firstCol, 
        type: 'first-name', 
        role: 'component', 
        relatedTo: [nameCol] 
      });
    }
    
    if (lastCol) {
      schemas.push({ 
        name: lastCol, 
        type: 'last-name', 
        role: 'component', 
        relatedTo: [nameCol] 
      });
    }
  } else if (nameCol) {
    // Only full name column
    schemas.push({ 
      name: nameCol, 
      type: 'name', 
      role: 'full' 
    });
  } else if (firstCol || lastCol) {
    // Only component columns (no full name)
    if (firstCol) {
      schemas.push({ 
        name: firstCol, 
        type: 'first-name', 
        role: 'independent' 
      });
    }
    if (lastCol) {
      schemas.push({ 
        name: lastCol, 
        type: 'last-name', 
        role: 'independent' 
      });
    }
  }
  
  // Detect company columns FIRST (before phone, to avoid false matches)
  headers.forEach((header, i) => {
    const normalized = normalizedHeaders[i];
    
    // Skip if already processed
    if (schemas.some(s => s.name === header)) return;
    
    if (/company|organization|employer|business/i.test(normalized)) {
      schemas.push({
        name: header,
        type: 'company',
        role: 'independent'
      });
    }
  });
  
  // Detect job title columns
  headers.forEach((header, i) => {
    const normalized = normalizedHeaders[i];
    
    // Skip if already processed
    if (schemas.some(s => s.name === header)) return;
    
    if (/job.?title|occupation|position|role|title/i.test(normalized)) {
      schemas.push({
        name: header,
        type: 'job-title',
        role: 'independent'
      });
    }
  });
  
  // Detect phone columns
  headers.forEach((header, i) => {
    const normalized = normalizedHeaders[i];
    
    // Skip if already processed
    if (schemas.some(s => s.name === header)) return;
    
    if (/phone|mobile|cell|landline|tel/i.test(normalized)) {
      let context: ColumnSchema['context'] = undefined;
      
      if (/mobile|cell/i.test(normalized)) {
        context = 'mobile';
      } else if (/business|work|office/i.test(normalized)) {
        context = 'business';
      } else if (/landline|home/i.test(normalized)) {
        context = 'landline';
      } else if (/personal/i.test(normalized)) {
        context = 'personal';
      }
      
      schemas.push({
        name: header,
        type: 'phone',
        role: 'variant',
        context
      });
    }
  });
  
  // Detect email columns
  headers.forEach((header, i) => {
    const normalized = normalizedHeaders[i];
    
    // Skip if already processed
    if (schemas.some(s => s.name === header)) return;
    
    if (/email|e-mail/i.test(normalized)) {
      let context: ColumnSchema['context'] = undefined;
      
      if (/business|work|office/i.test(normalized)) {
        context = 'business';
      } else if (/personal|home/i.test(normalized)) {
        context = 'personal';
      }
      
      schemas.push({
        name: header,
        type: 'email',
        role: 'variant',
        context
      });
    }
  });
  
  // Detect address/location columns
  headers.forEach((header, i) => {
    const normalized = normalizedHeaders[i];
    
    // Skip if already processed
    if (schemas.some(s => s.name === header)) return;
    
    // Detect specific address components first
    if (/\bzip\b|\bpostal/i.test(normalized)) {
      schemas.push({
        name: header,
        type: 'zip',
        role: 'independent'
      });
    } else if (/\bcity\b/i.test(normalized)) {
      schemas.push({
        name: header,
        type: 'city',
        role: 'independent'
      });
    } else if (/\bstate\b/i.test(normalized)) {
      schemas.push({
        name: header,
        type: 'state',
        role: 'independent'
      });
    } else if (/\bcountry\b/i.test(normalized)) {
      schemas.push({
        name: header,
        type: 'country',
        role: 'independent'
      });
    } else if (/address|street|location/i.test(normalized)) {
      schemas.push({
        name: header,
        type: 'address',
        role: 'independent'
      });
    }
  });
  
  // Mark remaining columns as unknown
  headers.forEach(header => {
    if (!schemas.some(s => s.name === header)) {
      schemas.push({
        name: header,
        type: 'unknown',
        role: 'independent'
      });
    }
  });
  
  // v3.14.1: Analyze data quality if sample data is provided
  if (sampleData && sampleData.length > 0) {
    schemas.forEach(schema => {
      // Extract values for this column from sample data
      const values = sampleData.map(row => row[schema.name] || '').filter(v => v).slice(0, 100); // Sample first 100 rows
      
      // Store first 3 sample values for preview
      schema.sampleValues = values.slice(0, 3);
      
      // Analyze quality
      const quality = analyzeColumnQuality(schema.name, schema.type, values);
      schema.qualityScore = Math.round(quality.overall);
      schema.qualityIssues = quality.issues;
    });
  }
  
  return schemas;
}
