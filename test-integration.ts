import { NameEnhanced } from "./client/src/lib/NameEnhanced";

console.log("=== Integration Test: Normalization Library ===\n");

const testCases = [
  "John Doe (he/him) (Ph.D.)",
  "Albert L Gaffney III",
  "Chaitanya Saha CSCP, CPIM, CTSC",
  "Dr. Jane Smith MBA, CPA",
  "Bob Jones Jr. PE",
  "Maria Garcia RN, BSN, MSN",
  "David Lee AWS, CISSP, CCNA",
];

testCases.forEach((input, i) => {
  const name = new NameEnhanced(input);
  console.log(`Test ${i + 1}: "${input}"`);
  console.log(`  Valid: ${name.isValid}`);
  if (name.isValid) {
    console.log(`  First: ${name.firstName}`);
    console.log(`  Middle: ${name.middleName || "(none)"}`);
    console.log(`  Last: ${name.lastName}`);
    console.log(`  Suffix: ${name.suffix || "(none)"}`);
    console.log(`  Full: ${name.full}`);
  }
  console.log("");
});

console.log("✅ All tests completed!");
