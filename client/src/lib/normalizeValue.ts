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
        // v3.14.1: Handle Excel errors
        if (value.includes('#NAME?') || value === '????' || value === '??????') {
          return ''; // Remove Excel errors
        }
        
        // v3.14.1: Clean first name: remove titles, special chars, and trailing punctuation
        let cleaned = value.trim();
        
        // Remove bullets and other special prefix characters
        cleaned = cleaned.replace(/^[•●▪▫‣?!]+\s*/g, '');
        
        // Remove common titles
        cleaned = cleaned.replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?|Miss\.?|Reverend)\s+/i, '');
        
        // Remove parenthetical prefixes like "(Lady)"
        cleaned = cleaned.replace(/^\([^)]+\)\s*/g, '');
        
        // Remove middle initials with periods at the end (e.g., "Jennifer R." → "Jennifer")
        cleaned = cleaned.replace(/\s+[A-Z]\.?$/g, '');
        
        // Remove trailing commas and extra quotes
        cleaned = cleaned.replace(/[,"]+$/g, '');
        
        // Remove leading quotes
        cleaned = cleaned.replace(/^["]+/g, '');
        
        // Clean up extra whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        // NOTE: Full name detection is now handled in contextAwareExecutor
        // This function just cleans the first name value
        
        return cleaned || value;
      }
      case 'last-name': {
        // v3.14.1: Handle Excel errors
        if (value.includes('#NAME?') || value === '????' || value === '??????') {
          return ''; // Remove Excel errors
        }
        
        // v3.14.1: If last name contains job title keywords, use NameEnhanced to clean it
        // This handles cases where original CSV has job titles in Last Name column
        // Example: "TEDx and Keynote Speaker" → "" (empty, should be removed)
        const jobKeywords = [
          'Chief', 'Officer', 'Director', 'Manager', 'President', 'Chair', 'Board',
          'Founder', 'CEO', 'CFO', 'COO', 'CTO', 'VP', 'Specialist', 'Consultant',
          'Partner', 'Operations', 'Division', 'Department', 'Head', 'Lead', 'Supervisor',
          'Administrator', 'Executive', 'Advisor', 'Expert', 'Speaker', 'Keynote',
          'TEDx', 'Author', 'Coach', 'Photographer', 'Owner', 'Content', 'Coaches',
          'Strategist', 'Branding', 'Visibility', 'Mentor', 'Leadership', 'Talent',
          'Coaching', 'Doctor', 'Creator', 'Adviser', 'Innovation', 'Planning',
          'Business', 'Sales', 'Transformational', 'Somatic', 'Breathwork', 'Admission',
          'Success', 'Clarity', 'Online', 'Chiropractor'
        ];
        
        // Check if value contains job keywords (whole word match)
        const hasJobTitle = jobKeywords.some(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'i');
          return regex.test(value);
        });
        
        // If it looks like a job title (multiple words + keywords), return empty
        if (hasJobTitle) {
          const wordCount = value.trim().split(/\s+/).length;
          // Single word job titles: Coach, Strategist, Mentor, Author, etc.
          const singleWordTitles = ['Coach', 'Coaches', 'Strategist', 'Mentor', 'Author', 'Leadership', 'Chiropractor', 'Doctor', 'Creator'];
          const isSingleWordTitle = wordCount === 1 && singleWordTitles.some(t => t.toLowerCase() === value.trim().toLowerCase());
          
          // Multi-word with job keywords OR single-word title → likely a job title, remove it
          if (wordCount > 1 || isSingleWordTitle) {
            // But exclude common last names that happen to contain keywords
            const commonLastNames = ['Cook', 'Cooper', 'Coombes', 'Cooney', 'Coolidge', 'McCool', 
                                     'Coope', 'Coon', 'Boardman', 'Bradley-Cook', 'Headrick',
                                     'Leadbetter', 'Proctor', 'Victor', 'Connector', 'Cooch',
                                     'Factor', 'Leady'];
            if (!commonLastNames.some(name => name.toLowerCase() === value.trim().toLowerCase())) {
              return ''; // Remove job title
            }
          }
        }
        
        // Clean last name: remove credentials, pronouns, and extra punctuation
        let cleaned = value.trim();
        
        // FIX 4: Remove pronouns like (she/her), she/her, he/him, they/them
        cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' '); // Remove parenthetical content
        cleaned = cleaned.replace(/\s+(she\/her|he\/him|they\/them)\s*$/i, ''); // Remove trailing pronouns
        
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
