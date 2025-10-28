import { NameEnhanced } from "./client/src/lib/NameEnhanced";
import * as fs from 'fs';

const csvContent = fs.readFileSync('/home/ubuntu/upload/dclark_aids.csv', 'utf-8');
const lines = csvContent.split('\n');

console.log("=== Analyzing CSV for Problematic Names ===\n");

const problems: Array<{row: number, input: string, issue: string, parsed: any}> = [];

lines.forEach((line, index) => {
  if (index === 0 || !line.trim()) return; // Skip header and empty lines
  
  const match = line.match(/^([^,]+),/);
  if (!match) return;
  
  const fullName = match[1].replace(/^"/, '').replace(/"$/, '');
  const name = new NameEnhanced(fullName);
  
  // Check for issues
  if (!name.isValid) {
    problems.push({
      row: index + 1,
      input: fullName,
      issue: `Invalid: ${name.invalidReason}`,
      parsed: null
    });
  } else if (name.firstName.startsWith('-')) {
    problems.push({
      row: index + 1,
      input: fullName,
      issue: `First name starts with hyphen: "${name.firstName}"`,
      parsed: { first: name.firstName, middle: name.middleName, last: name.lastName }
    });
  } else if (name.firstName.length < 2 && fullName.length > 5) {
    problems.push({
      row: index + 1,
      input: fullName,
      issue: `First name too short: "${name.firstName}"`,
      parsed: { first: name.firstName, middle: name.middleName, last: name.lastName }
    });
  }
});

console.log(`Total rows: ${lines.length - 1}`);
console.log(`Problems found: ${problems.length}\n`);

problems.slice(0, 20).forEach(p => {
  console.log(`Row ${p.row}: "${p.input}"`);
  console.log(`  Issue: ${p.issue}`);
  if (p.parsed) {
    console.log(`  Parsed as: First="${p.parsed.first}", Middle="${p.parsed.middle || '(none)'}", Last="${p.parsed.last}"`);
  }
  console.log('');
});

if (problems.length > 20) {
  console.log(`... and ${problems.length - 20} more problems`);
}
