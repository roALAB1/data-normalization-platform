/**
 * Debug script to trace ZIP repair logic
 */

import { ZIPRepairService } from '../shared/normalization/cities/ZIPRepairService';

console.log('🔍 Debugging ZIP Repair Logic\n');

// Test 1: Houston with empty ZIP
console.log('Test 1: Houston + empty ZIP');
const result1 = ZIPRepairService.repair('', 'Houston', undefined);
console.log('  needsRepair(""):', ZIPRepairService.needsRepair(''));
console.log('  Result:', JSON.stringify(result1, null, 2));
console.log('');

// Test 2: Houston with empty ZIP and TX state
console.log('Test 2: Houston + empty ZIP + TX state');
const result2 = ZIPRepairService.repair('', 'Houston', 'TX');
console.log('  needsRepair(""):', ZIPRepairService.needsRepair(''));
console.log('  Result:', JSON.stringify(result2, null, 2));
console.log('');

// Test 3: Corpus Christi with empty ZIP
console.log('Test 3: Corpus Christi + empty ZIP');
const result3 = ZIPRepairService.repair('', 'Corpus Christi', undefined);
console.log('  needsRepair(""):', ZIPRepairService.needsRepair(''));
console.log('  Result:', JSON.stringify(result3, null, 2));
console.log('');

// Test 4: San Angelo with NaN ZIP
console.log('Test 4: San Angelo + NaN ZIP');
const result4 = ZIPRepairService.repair('NaN', 'San Angelo', 'TX');
console.log('  needsRepair("NaN"):', ZIPRepairService.needsRepair('NaN'));
console.log('  Result:', JSON.stringify(result4, null, 2));
