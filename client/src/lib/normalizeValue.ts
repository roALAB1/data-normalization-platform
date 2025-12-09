// @ts-nocheck
/**
 * Normalize a single value based on type
 * Used by the worker for CSV processing
 * Exported separately for testing
 */

import { NameEnhanced, ALL_CREDENTIALS } from './NameEnhanced';
import { PhoneEnhanced } from '../../../shared/normalization/phones/PhoneEnhanced';
import { EmailEnhanced } from '../../../shared/normalization/emails/EmailEnhanced';
import { AddressFormatter } from '../../../shared/normalization/addresses/AddressFormatter';
import { ContextAwareNormalizer } from '../../../shared/normalization/cities/ContextAwareNormalizer';

export function normalizeValue(type: string, value: string): string {
  if (!value) return '';

  // DEBUG: Log all phone and ZIP normalization attempts
  if (type === 'phone' || type === 'zip') {
    console.log(`[normalizeValue] type=${type}, value="${value}"`);
  }

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
        try {
          // Simple regex-based phone normalization (foolproof method)
          // Extract all digits from the phone number
          const digits = value.replace(/\D/g, '');
          
          console.log(`[normalizeValue] SIMPLE phone normalization: "${value}" -> digits: "${digits}"`);
          
          // If we have 10 digits, assume US number and add +1
          if (digits.length === 10) {
            const e164 = `+1${digits}`;
            console.log(`[normalizeValue] phone normalized: "${value}" -> "${e164}"`);
            return e164;
          }
          // If we have 11 digits starting with 1, format as +1...
          if (digits.length === 11 && digits.startsWith('1')) {
            const e164 = `+${digits}`;
            console.log(`[normalizeValue] phone normalized: "${value}" -> "${e164}"`);
            return e164;
          }
          // Otherwise keep original
          console.log(`[normalizeValue] phone kept original (${digits.length} digits): "${value}"`);
          return value;
        } catch (error) {
          console.error(`[normalizeValue] phone error:`, error);
          return value;
        }
      }
      case 'address': {
        return AddressFormatter.format(value);
      }
      case 'zip': {
        // Use context-aware ZIP normalization
        // Note: In CSV processing, we don't have access to city/state context here
        // For full context-aware normalization, use the batch processing API
        const cleaned = value.replace(/\s/g, '').substring(0, 5);
        // If 4-digit ZIP code, add leading zero (e.g., 2210 → 02210)
        if (cleaned.length === 4 && /^\d{4}$/.test(cleaned)) {
          return '0' + cleaned;
        }
        return cleaned;
      }
      case 'city': {
        // Use context-aware city normalization
        // Note: In CSV processing, we don't have access to ZIP context here
        // For full context-aware normalization, use the batch processing API
        return ContextAwareNormalizer.normalizeCity(value);
      }
      case 'state': {
        // Basic state normalization: uppercase for abbreviations
        const trimmed = value.trim();
        if (trimmed.length === 2) {
          return trimmed.toUpperCase();
        }
        return trimmed;
      }
      case 'country': {
        // Basic country normalization
        return value.trim();
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
