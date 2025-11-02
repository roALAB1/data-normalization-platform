/**
 * Schema Analyzer
 * 
 * Analyzes CSV column headers to detect:
 * - Column types (name, email, phone, address, etc.)
 * - Column roles (full, component, variant)
 * - Column relationships (which columns are related)
 * - Column context (personal, business, mobile, landline, etc.)
 */

export interface ColumnSchema {
  name: string;
  type: 'name' | 'first-name' | 'last-name' | 'email' | 'phone' | 'address' | 'location' | 'company' | 'unknown';
  role: 'full' | 'component' | 'variant' | 'independent';
  relatedTo?: string[]; // Which columns are related to this one
  context?: 'personal' | 'business' | 'mobile' | 'landline' | 'home' | 'work';
}

/**
 * Analyze CSV headers to detect column relationships
 */
export function analyzeSchema(headers: string[]): ColumnSchema[] {
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
    
    if (/address|street|location|city|state|zip|postal/i.test(normalized)) {
      schemas.push({
        name: header,
        type: 'address',
        role: 'independent' // TODO: Detect component relationships
      });
    }
  });
  
  // Detect company columns
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
  
  return schemas;
}
