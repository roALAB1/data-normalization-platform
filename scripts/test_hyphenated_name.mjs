import { NameEnhanced } from '../client/src/lib/NameEnhanced.ts';

const name = new NameEnhanced('Donna Watson-Ladson, MS, LPC, NBCC');

console.log('First Name:', name.firstName);
console.log('Last Name:', name.lastName);
console.log('Full:', name.full);
