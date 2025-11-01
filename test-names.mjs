import { NameEnhanced } from './client/src/lib/NameEnhanced.ts';

const test1 = new NameEnhanced("Ben Brausen");
console.log("Test 1: Ben Brausen");
console.log("  firstName:", test1.firstName);
console.log("  lastName:", test1.lastName);
console.log("  full:", test1.full);

const test2 = new NameEnhanced("Meng-Ling Erik Kuo");
console.log("\nTest 2: Meng-Ling Erik Kuo");
console.log("  firstName:", test2.firstName);
console.log("  lastName:", test2.lastName);
console.log("  full:", test2.full);
