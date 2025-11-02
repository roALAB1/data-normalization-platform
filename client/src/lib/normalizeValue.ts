/**
 * Normalize a single value based on type
 * Used by the worker for CSV processing
 * Exported separately for testing
 */

import { NameEnhanced, ALL_CREDENTIALS } from './NameEnhanced';
import { PhoneEnhanced } from '../../../shared/normalization/phones/PhoneEnhanced';
import { EmailEnhanced } from '../../../shared/normalization/emails/EmailEnhanced';
import { AddressFormatter } from '../../../shared/normalization/addresses/AddressFormatter';

export function normalizeValue(type: string, value: string): string {
  if (!value) return '';

  try {
    switch (type) {
      case 'name': {
        const name = new NameEnhanced(value);
        return name.isValid ? name.full : value;
      }
      case 'first-name': {
        // Clean first name: remove titles (Dr., Prof., etc.) and trailing periods
        let cleaned = value.trim();
        // Remove common titles
        cleaned = cleaned.replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?|Miss\.?)\s+/i, '');
        // Remove middle initials with periods at the end (e.g., "Jennifer R." → "Jennifer")
        cleaned = cleaned.replace(/\s+[A-Z]\.?$/g, '');
        return cleaned || value;
      }
      case 'last-name': {
        // Clean last name: remove credentials, pronouns, and extra punctuation
        let cleaned = value.trim();
        
        // Remove pronouns like (she/her), (he/him), etc.
        cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ');
        
        // Remove credentials after commas (e.g., "Berman, MD" → "Berman")
        // This handles: "Berman, MD", "Bell, CFP®", "Theiss, MSc CSC ABS"
        cleaned = cleaned.replace(/,.*$/, '');
        
        // Remove middle initials at the start (e.g., "S. Perrin" → "Perrin")
        cleaned = cleaned.replace(/^[A-Z]\.\s+/, '');
        
        // Remove credentials WITHOUT commas (e.g., "Simon MD" → "Simon")
        // Build regex pattern from ALL_CREDENTIALS list
        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const credentialPattern = new RegExp(
          `(?<![-])\\b(${ALL_CREDENTIALS.map(c => escapeRegex(c)).join('|')})(?=\\s|$|[^\\w])`,
          'gi'
        );
        cleaned = cleaned.replace(credentialPattern, '').trim();
        
        // Remove trailing periods
        cleaned = cleaned.replace(/\.+$/g, '');
        
        // Clean up extra whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        return cleaned || value;
      }
      case 'email': {
        const email = new EmailEnhanced(value);
        return email.isValid ? email.normalized : value;
      }
      case 'phone': {
        const phone = new PhoneEnhanced(value);
        return phone.isValid ? phone.international : value;
      }
      case 'address': {
        return AddressFormatter.format(value);
      }
      case 'company': {
        // TODO: Implement company normalization
        return value;
      }
      case 'location': {
        // TODO: Implement location normalization
        return value;
      }
      default:
        return value;
    }
  } catch (error) {
    console.error(`[Worker] Error normalizing ${type}:`, error);
    return value;
  }
}
