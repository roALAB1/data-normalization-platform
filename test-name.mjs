import { NameEnhanced } from './client/src/lib/NameEnhanced.ts';

const testCases = [
  'Alison Theiss, MSc CSC ABS',
  'Dr. Ivette Espinosa-Fernandez, DO, FACOP'
];

testCases.forEach(input => {
  console.log('\n=== Testing:', input);
  const name = new NameEnhanced(input);
  console.log('firstName:', name.firstName);
  console.log('lastName:', name.lastName);
  console.log('full:', name.full);
  console.log('credentials:', name.credentials);
  console.log('prefix:', name.prefix);
  console.log('suffix:', name.suffix);
});
