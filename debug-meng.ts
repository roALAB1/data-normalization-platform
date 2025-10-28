import { NameEnhanced } from "./client/src/lib/NameEnhanced";

const input = "Meng-Ling Erik Kuo";
const name = new NameEnhanced(input);

console.log("Input:", input);
console.log("\nStep-by-step parsing log:");
name.parseLog.forEach((log, i) => {
  console.log(`\n${i + 1}. ${log.reason}`);
  console.log(`   Before: "${log.original}"`);
  console.log(`   After:  "${log.repaired}"`);
});

console.log("\n\nFinal parsed result:");
console.log(`  Valid: ${name.isValid}`);
console.log(`  First: "${name.firstName}"`);
console.log(`  Middle: "${name.middleName || '(none)'}"`);
console.log(`  Last: "${name.lastName}"`);

// Also test the parts extraction
console.log("\n\nRaw name after cleaning:");
const cleaned = input.trim().replace(/\s+/g, ' ');
console.log(`  Cleaned: "${cleaned}"`);
console.log(`  Split by space: ${JSON.stringify(cleaned.split(/\s+/))}`);
