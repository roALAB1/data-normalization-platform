import { NameEnhanced } from "./client/src/lib/NameEnhanced";

const name = new NameEnhanced("Meng-Ling Erik Kuo");

console.log("Input: 'Meng-Ling Erik Kuo'");
console.log("\nParsing Log:");
name.parseLog.forEach((log, i) => {
  console.log(`${i + 1}. ${log.reason}`);
  console.log(`   Original: "${log.original}"`);
  console.log(`   Repaired: "${log.repaired}"`);
});

console.log("\nFinal Result:");
console.log(`  Valid: ${name.isValid}`);
console.log(`  First: "${name.firstName}"`);
console.log(`  Middle: "${name.middleName || '(none)'}"`);
console.log(`  Last: "${name.lastName}"`);
