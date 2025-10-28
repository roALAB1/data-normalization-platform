import { NameEnhanced } from './client/src/lib/NameEnhanced';

const testCases = [
  'John Doe (he/him) (Ph.D.)',
  'Emily Bouch (she/her)',
  'Nancy Kurts - DBA (ABD), MBA',
  'Stephen Thompson DC DACM BCTMB FAIHM',
  'Jane Smith (they/them) (MD) (ret.)'
];

testCases.forEach(name => {
  const parsed = new NameEnhanced(name);
  console.log('\n' + '='.repeat(60));
  console.log('Input:', name);
  console.log('Valid:', parsed.isValid);
  console.log('First:', parsed.firstName);
  console.log('Last:', parsed.lastName);
  console.log('Suffix:', parsed.suffix);
  console.log('Nickname:', parsed.nickname);
  console.log('Repairs:', parsed.parseLog.length);
  parsed.parseLog.forEach(log => {
    console.log('  -', log.reason, ':', log.original, '->', log.repaired);
  });
});
