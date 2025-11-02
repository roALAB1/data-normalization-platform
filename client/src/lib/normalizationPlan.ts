/**
 * Normalization Plan Builder
 * 
 * Builds an execution plan for normalizing CSV data based on column schema.
 * The plan ensures:
 * - Primary columns are normalized first
 * - Component columns derive from primary (don't re-normalize)
 * - Independent columns are normalized separately
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
  
  // Primary: Normalize full columns first
  plan.primary = fullCols.map(s => s.name);
  
  // Derived: Extract components from primary
  componentCols.forEach(comp => {
    const primary = comp.relatedTo?.[0];
    if (primary) {
      // Determine what to extract based on column type
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
      // Component without primary → treat as independent
      plan.independent.push(comp.name);
    }
  });
  
  // Independent: Normalize separately
  plan.independent.push(...variantCols.map(s => s.name));
  plan.independent.push(...independentCols.map(s => s.name));
  
  return plan;
}
