import { describe, it, expect } from 'vitest';

/**
 * Test: Worker Import Fix
 * Issue: Worker failed to initialize due to missing LocationNormalizer import
 * Fix: Removed non-existent import from normalization.worker.ts
 */

describe('Worker Initialization', () => {
  it('should not have broken imports in worker file', async () => {
    // Read the worker file content
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const workerPath = path.resolve(__dirname, '../client/src/workers/normalization.worker.ts');
    const workerContent = await fs.readFile(workerPath, 'utf-8');
    
    // Verify LocationNormalizer is NOT being used (import or method call)
    expect(workerContent).not.toContain('import { LocationNormalizer }');
    expect(workerContent).not.toContain('from \'../../../shared/normalization/locations\'');
    expect(workerContent).not.toContain('LocationNormalizer.normalize(');
  });

  it('should have all required valid imports', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const workerPath = path.resolve(__dirname, '../client/src/workers/normalization.worker.ts');
    const workerContent = await fs.readFile(workerPath, 'utf-8');
    
    // Verify required imports ARE present
    expect(workerContent).toContain('NameEnhanced');
    expect(workerContent).toContain('normalizeValue');
    expect(workerContent).toContain('analyzeSchema');
    expect(workerContent).toContain('buildPlan');
    expect(workerContent).toContain('processRowWithContext');
  });

  it('should export required worker interfaces', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const workerPath = path.resolve(__dirname, '../client/src/workers/normalization.worker.ts');
    const workerContent = await fs.readFile(workerPath, 'utf-8');
    
    // Verify worker interfaces are exported
    expect(workerContent).toContain('export interface WorkerMessage');
    expect(workerContent).toContain('export interface WorkerResponse');
  });
});
