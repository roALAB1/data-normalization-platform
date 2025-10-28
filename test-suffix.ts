import { NameEnhanced } from './client/src/lib/NameEnhanced';

const testCases = [
  'Albert L Gaffney III',
  'John Smith Jr.',
  'Mary Johnson Sr',
  'Robert Brown II',
  'William Davis IV',
  'James Wilson V',
  'Dr. John Paul Smith Jr.',
  'Albert Gaffney III PhD',
];

console.log('Testing generational suffix detection:\n');

testCases.forEach(testName => {
  const name = new NameEnhanced(testName);
  console.log(`Input: "${testName}"`);
  console.log(`  Valid: ${name.isValid}`);
  console.log(`  First: "${name.firstName}"`);
  console.log(`  Middle: "${name.middleName}"`);
  console.log(`  Last: "${name.lastName}"`);
  console.log(`  Suffix: "${name.suffix}"`);
  console.log('');
});
