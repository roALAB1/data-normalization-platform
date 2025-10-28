import { NameEnhanced } from './client/src/lib/NameEnhanced';

const testCases = [
  'John Doe (he/him) (Ph.D.)',
  'Jane Smith (she/her) (MBA)',
  'Dr. Bob (they/them) (MD)',
  'Alice Wong (Ph.D.)',
  'John "Johnny" Doe (he/him)',
];

console.log('Testing NameEnhanced with pronouns and credentials:\n');

testCases.forEach(testName => {
  try {
    const name = new NameEnhanced(testName);
    console.log(`Input: "${testName}"`);
    console.log(`  Valid: ${name.isValid}`);
    console.log(`  Full: "${name.full}"`);
    console.log(`  First: "${name.firstName}"`);
    console.log(`  Last: "${name.lastName}"`);
    if (name.nickname) console.log(`  Nickname: "${name.nickname}"`);
    if (!name.isValid) console.log(`  Reason: ${name.invalidReason}`);
    console.log('');
  } catch (e: any) {
    console.log(`Input: "${testName}"`);
    console.log(`  ERROR: ${e.message}\n`);
  }
});
