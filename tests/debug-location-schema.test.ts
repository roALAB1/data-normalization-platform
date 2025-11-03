import { describe, it } from 'vitest';
import { analyzeSchema } from '../client/src/lib/schemaAnalyzer';
import { buildPlan } from '../client/src/lib/normalizationPlan';
import { processRowWithContext } from '../client/src/lib/contextAwareExecutor';

describe('Debug Location Schema', () => {
  it('should show what type Location gets', () => {
    const headers = ['Location'];
    const schema = analyzeSchema(headers);
    const plan = buildPlan(schema);
    
    console.log('\n=== Schema ===');
    console.log(JSON.stringify(schema, null, 2));
    console.log('\n=== Plan ===');
    console.log(JSON.stringify(plan, null, 2));
    
    const row = { 'Location': 'Durham, North Carolina, United States' };
    const result = processRowWithContext(row, schema, plan);
    
    console.log('\n=== Result ===');
    console.log(JSON.stringify(result, null, 2));
  });
});
