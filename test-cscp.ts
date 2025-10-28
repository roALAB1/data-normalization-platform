import { NameEnhanced } from './client/src/lib/NameEnhanced';

const testCases = [
  'Chaitanya Saha CSCP, CPIM, CTSC',
  'John Smith MBA, CPA',
  'Jane Doe PhD, MD',
  'Bob Jones CSCP',
];

console.log('Testing credential removal:\n');

testCases.forEach(testName => {
  const name = new NameEnhanced(testName);
  console.log(`Input: "${testName}"`);
  console.log(`  Valid: ${name.isValid}`);
  console.log(`  First: "${name.firstName}"`);
  console.log(`  Middle: "${name.middleName}"`);
  console.log(`  Last: "${name.lastName}"`);
  console.log(`  Suffix: "${name.suffix}"`);
  console.log(`  Repairs: ${name.parseLog.length}`);
  name.parseLog.forEach(log => {
    console.log(`    - ${log.reason}: "${log.original}" -> "${log.repaired}"`);
  });
  console.log('');
});
