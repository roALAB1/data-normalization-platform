/**
 * Normalization Plan Builder
 * 
 * Builds an execution plan for normalizing CSV data based on column schema.
 * The plan ensures:
 * - Primary columns are normalized first
 * - Component columns derive from primary (don't re-normalize)
 * - Independent columns are normalized separately
 * 
 * v3.14.1: Now uses data quality scores to intelligently choose best source columns
 * Example: If "First Name" column is clean (score >95) but "Name" has junk,
 * use "First Name" directly instead of deriving from "Name"
 */

import type { ColumnSchema } from './schemaAnalyzer';

export interface DerivedColumn {
  column: string;
  primary: string;
  extract: 'firstName' | 'lastName' | 'full';
}

export interface NormalizationPlan {
  primary: string[]; // Columns to normalize first (cache results)
  derived: DerivedColumn[]; // Columns that extract from primary
  independent: string[]; // Columns to normalize separately
}

/**
 * Build a normalization plan from column schema
 */
export function buildPlan(schema: ColumnSchema[]): NormalizationPlan {
  const plan: NormalizationPlan = {
    primary: [],
    derived: [],
    independent: []
  };
  
  // Find full/primary columns
  const fullCols = schema.filter(s => s.role === 'full');
  const componentCols = schema.filter(s => s.role === 'component');
  const variantCols = schema.filter(s => s.role === 'variant');
  const independentCols = schema.filter(s => s.role === 'independent');
  
  // v3.14.1: Intelligent source selection based on quality scores
  // Check if we have quality scores available
  const hasQualityScores = schema.some(s => s.qualityScore !== undefined);
  
  if (hasQualityScores) {
    // INTELLIGENT MODE: Use quality scores to choose best sources
    
    // Find name-related columns
    const nameCol = fullCols.find(s => s.type === 'name');
    const firstNameCol = componentCols.find(s => s.type === 'first-name') || 
                         independentCols.find(s => s.type === 'first-name');
    const lastNameCol = componentCols.find(s => s.type === 'last-name') ||
                        independentCols.find(s => s.type === 'last-name');
    
    // Decision logic for First Name output
    if (firstNameCol && nameCol) {
      const firstNameQuality = firstNameCol.qualityScore || 0;
      const nameQuality = nameCol.qualityScore || 0;
      
      if (firstNameQuality >= 95 && firstNameQuality > nameQuality) {
        // First Name column is clean - use it directly!
        plan.independent.push(firstNameCol.name);
        
        // FIX 1: But ALSO normalize Name column so we can extract last name from it
        if (!plan.primary.includes(nameCol.name)) {
          plan.primary.push(nameCol.name);
        }
      } else {
        // Name column is better - normalize it and extract first name
        plan.primary.push(nameCol.name);
        plan.derived.push({
          column: firstNameCol.name,
          primary: nameCol.name,
          extract: 'firstName'
        });
      }
    } else if (nameCol) {
      // Only have Name column
      plan.primary.push(nameCol.name);
    } else if (firstNameCol) {
      // Only have First Name column
      plan.independent.push(firstNameCol.name);
    }
    
    // Decision logic for Last Name output
    if (lastNameCol && nameCol) {
      const lastNameQuality = lastNameCol.qualityScore || 0;
      const nameQuality = nameCol.qualityScore || 0;
      
      if (lastNameQuality >= 95 && lastNameQuality > nameQuality) {
        // Last Name column is clean - use it directly!
        plan.independent.push(lastNameCol.name);
      } else {
        // Name column is better OR Last Name has job titles - extract from Name
        if (!plan.primary.includes(nameCol.name)) {
          plan.primary.push(nameCol.name);
        }
        plan.derived.push({
          column: lastNameCol.name,
          primary: nameCol.name,
          extract: 'lastName'
        });
      }
    } else if (nameCol && !lastNameCol) {
      // Have Name but no Last Name column - will be created from Name
      if (!plan.primary.includes(nameCol.name)) {
        plan.primary.push(nameCol.name);
      }
    } else if (lastNameCol) {
      // Only have Last Name column
      plan.independent.push(lastNameCol.name);
    }
    
    // Add other full columns that aren't name-related
    fullCols.forEach(col => {
      if (col.type !== 'name' && !plan.primary.includes(col.name)) {
        plan.primary.push(col.name);
      }
    });
    
    // Add other component columns
    componentCols.forEach(comp => {
      if (comp.type !== 'first-name' && comp.type !== 'last-name') {
        const primary = comp.relatedTo?.[0];
        if (primary) {
          plan.derived.push({
            column: comp.name,
            primary: primary,
            extract: 'full'
          });
        } else {
          plan.independent.push(comp.name);
        }
      }
    });
    
  } else {
    // LEGACY MODE: No quality scores - use old logic
    plan.primary = fullCols.map(s => s.name);
    
    componentCols.forEach(comp => {
      const primary = comp.relatedTo?.[0];
      if (primary) {
        let extract: DerivedColumn['extract'] = 'full';
        
        if (comp.type === 'first-name') {
          extract = 'firstName';
        } else if (comp.type === 'last-name') {
          extract = 'lastName';
        }
        
        plan.derived.push({
          column: comp.name,
          primary: primary,
          extract: extract
        });
      } else {
        plan.independent.push(comp.name);
      }
    });
  }
  
  // Independent: Normalize separately
  plan.independent.push(...variantCols.map(s => s.name));
  plan.independent.push(...independentCols.filter(s => 
    !plan.independent.includes(s.name) && 
    s.type !== 'first-name' && 
    s.type !== 'last-name'
  ).map(s => s.name));
  
  return plan;
}
