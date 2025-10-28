import { NameEnhanced } from "./client/src/lib/NameEnhanced";

const testCases = [
  "Meng-Ling Erik Kuo",
  "Mary-Jane Smith",
  "Jean-Paul Sartre",
  "Anne-Marie Johnson",
  "Li-Wei Chen",
];

console.log("=== Testing Hyphenated Names ===\n");

testCases.forEach((input) => {
  const name = new NameEnhanced(input);
  console.log(`Input: "${input}"`);
  console.log(`  Valid: ${name.isValid}`);
  if (name.isValid) {
    console.log(`  First: "${name.firstName}"`);
    console.log(`  Middle: "${name.middleName || '(none)'}"`);
    console.log(`  Last: "${name.lastName}"`);
  } else {
    console.log(`  Reason: ${name.invalidReason}`);
  }
  console.log("");
});
