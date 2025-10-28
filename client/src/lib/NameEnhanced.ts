import { nameConfig } from './nameConfig';

export interface RepairLog {
  original: string;
  repaired: string;
  reason: string;
  changes?: Array<{ type: 'add' | 'remove' | 'replace'; text: string; position?: number }>;
}

export interface NameParts {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  nickname: string | null;
  prefix: string | null;
  suffix: string | null;
}

export interface ParseOptions {
  preserveAccents?: boolean;
  trackPerformance?: boolean;
}

export interface ParseResult {
  name: NameEnhanced;
  performance: {
    parseTime: number;
    repairTime: number;
    totalTime: number;
  };
}

export class NameEnhanced {
  rawName: string;
  firstName: string | null = null;
  middleName: string | null = null;
  lastName: string | null = null;
  nickname: string | null = null;
  prefix: string | null = null;
  suffix: string | null = null;
  isValid: boolean = false;
  parseLog: RepairLog[] = [];
  options: ParseOptions;
  parseTime: number = 0;

  constructor(rawName: string, options: ParseOptions = {}) {
    this.rawName = rawName;
    this.options = {
      preserveAccents: false,
      trackPerformance: true,
      ...options
    };
    this.parse();
  }

  private recordRepair(original: string, repaired: string, reason: string) {
    // Calculate detailed changes for visual diff
    const changes = this.calculateDiff(original, repaired);
    this.parseLog.push({ original, repaired, reason, changes });
  }

  private calculateDiff(original: string, repaired: string): Array<{ type: 'add' | 'remove' | 'replace'; text: string; position?: number }> {
    const changes: Array<{ type: 'add' | 'remove' | 'replace'; text: string; position?: number }> = [];
    
    if (original === repaired) return changes;
    
    // Simple diff: find what changed
    let i = 0;
    while (i < Math.max(original.length, repaired.length)) {
      if (original[i] !== repaired[i]) {
        if (i >= original.length) {
          changes.push({ type: 'add', text: repaired.slice(i), position: i });
          break;
        } else if (i >= repaired.length) {
          changes.push({ type: 'remove', text: original.slice(i), position: i });
          break;
        } else {
          // Find the extent of the change
          let j = i;
          while (j < Math.min(original.length, repaired.length) && original[j] !== repaired[j]) {
            j++;
          }
          changes.push({
            type: 'replace',
            text: `"${original.slice(i, j)}" → "${repaired.slice(i, j)}"`,
            position: i
          });
          i = j;
          continue;
        }
      }
      i++;
    }
    
    return changes;
  }

  private stripAccents(text: string): string {
    if (this.options.preserveAccents) {
      return text;
    }
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private keepLettersAndAllowed(ch: string): boolean {
    return /[a-zA-ZÀ-ÿ\s\-']/.test(ch);
  }

  private parse() {
    const startTime = performance.now();
    
    if (!this.rawName || this.rawName.trim() === '') {
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    let text = this.rawName.trim();
    const originalText = text;

    // 1. Fix mis-encoded characters
    const repairStart = performance.now();
    for (const [bad, fix] of Object.entries(nameConfig.COMMON_LATIN_FIXES)) {
      const escapedBad = this.escapeRegex(bad);
      const regex = new RegExp(`\\b${escapedBad}\\b`, 'gi');
      if (regex.test(text)) {
        const before = text;
        text = text.replace(regex, fix.fixed);
        if (text !== before) {
          this.recordRepair(before, text, fix.reason);
        }
      }
    }

    for (const [bad, good] of Object.entries(nameConfig.MISENCODED_MAP)) {
      if (text.includes(bad)) {
        const before = text;
        const escapedBad = this.escapeRegex(bad);
        text = text.replace(new RegExp(escapedBad, 'g'), good);
        if (text !== before) {
          this.recordRepair(before, text, 'symbol_cleanup');
        }
      }
    }

    // 2. Remove pronouns in parentheses (she/her, he/him, they/them, etc.)
    // Do this BEFORE multi-person detection to avoid false positives from pronoun slashes
    const pronounPattern = /\(\s*(she\/her|he\/him|they\/them|she\/they|he\/they|any pronouns?|all pronouns?)\s*\)/gi;
    const pronounMatch = text.match(pronounPattern);
    if (pronounMatch) {
      const before = text;
      text = text.replace(pronounPattern, '').trim();
      this.recordRepair(before, text, 'pronouns_removed');
    }

    // 3. Multi-person detection (after pronoun removal)
    if (/\b(&|and)\b|\//i.test(text)) {
      this.recordRepair(originalText, text, 'multi_person_detected');
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    // 4. Remove credential modifiers in parentheses like (ABD), (c), (ret.)
    const modifierPattern = /\(\s*(ABD|c|ret\.?|retired|candidate|cand\.)\s*\)/gi;
    const modifierMatches = text.match(modifierPattern);
    if (modifierMatches) {
      const before = text;
      text = text.replace(modifierPattern, '').trim();
      this.recordRepair(before, text, 'credential_modifiers_removed');
    }

    // 5. Remove credentials in parentheses (Ph.D.), (MD), etc.
    const credInParensPattern = new RegExp(
      `\\(\\s*(${nameConfig.CREDENTIALS.map(c => this.escapeRegex(c)).join('|')})\\s*\\)`,
      'gi'
    );
    const credInParensMatches = text.match(credInParensPattern);
    if (credInParensMatches) {
      const before = text;
      text = text.replace(credInParensPattern, '').trim();
      this.recordRepair(before, text, 'credentials_in_parens_removed');
    }

    // 6. Extract nicknames from remaining parentheses/quotes
    const nicknames: string[] = [];
    let textNoNicknames = text;
    const nicknameRegex = /"([^"]+)"|'([^']+)'|\(([^)]+)\)/g;
    let match;
    while ((match = nicknameRegex.exec(text)) !== null) {
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          nicknames.push(match[i].trim());
        }
      }
    }
    this.nickname = nicknames.length > 0 ? nicknames.join(' ') : null;
    textNoNicknames = text.replace(/['"(),]/g, ' ');

    // 7. Remove titles/prefixes (Dr, Mr, Mrs, etc.)
    const titlePattern = new RegExp(
      `^(${nameConfig.TITLES.map(t => this.escapeRegex(t)).join('|')})\\s+`,
      'i'
    );
    const titleMatch = textNoNicknames.match(titlePattern);
    if (titleMatch) {
      this.prefix = titleMatch[1];
      textNoNicknames = textNoNicknames.replace(titlePattern, '').trim();
      this.recordRepair(text, textNoNicknames, 'title_removed');
      text = textNoNicknames;
    }

    // 8. Remove suffixes/credentials (MD, PhD, CFP, etc.) from anywhere in the name
    let credentialsRemoved: string[] = [];
    let previousText = textNoNicknames;
    
    // Build pattern for credentials as standalone words
    const credentialPattern = new RegExp(
      `\\b(${nameConfig.CREDENTIALS.map(c => this.escapeRegex(c)).join('|')})\\b`,
      'gi'
    );
    
    // Find all credentials
    const matches = textNoNicknames.match(credentialPattern);
    if (matches) {
      credentialsRemoved.push(...matches);
      // Remove all credentials
      textNoNicknames = textNoNicknames.replace(credentialPattern, '').trim();
    }
    
    // Remove trailing hyphens/dashes that were before credentials
    textNoNicknames = textNoNicknames.replace(/\s*[-\u2013\u2014]\s*$/, '').trim();
    
    // Clean up multiple spaces
    textNoNicknames = textNoNicknames.replace(/\s+/g, ' ').trim();
    
    if (credentialsRemoved.length > 0) {
      this.suffix = credentialsRemoved.join(' ');
      this.recordRepair(previousText, textNoNicknames, 'credentials_removed');
      text = textNoNicknames;
    }

    // 9. Filter out job titles
    const hasJobWord = nameConfig.JOB_WORDS.some(word => 
      new RegExp(`\\b${word}\\b`, 'i').test(textNoNicknames)
    );
    if (hasJobWord) {
      this.recordRepair(originalText, text, 'job_title_detected');
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    // 10. Normalize punctuation and spaces
    let cleanedName = textNoNicknames;
    cleanedName = cleanedName
      .split('')
      .map(ch => this.keepLettersAndAllowed(ch) ? ch : ' ')
      .join('');
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

    // 11. Strip accents (if option is enabled)
    const beforeAccents = cleanedName;
    cleanedName = this.stripAccents(cleanedName);
    if (cleanedName !== beforeAccents && !this.options.preserveAccents) {
      this.recordRepair(beforeAccents, cleanedName, 'accent_normalization');
    }

    if (!cleanedName) {
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    const parts = cleanedName.split(/\s+/);

    if (parts.length === 0) {
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    if (parts.length === 1) {
      this.firstName = parts[0];
      this.isValid = true;
      this.parseTime = performance.now() - startTime;
      return;
    }

    this.firstName = parts[0];
    
    // Check if the last part is a generational suffix (Jr., Sr., II, III, etc.)
    let suffixPart: string | null = null;
    let lastPartIndex = parts.length - 1;
    const lastPart = parts[lastPartIndex];
    const lastPartNormalized = lastPart.replace(/\./g, '');
    
    // Check if it matches a generational suffix (case-insensitive for Jr/Sr, case-sensitive for Roman numerals)
    const isGenerationalSuffix = nameConfig.GENERATIONAL_SUFFIXES.some(suffix => {
      const suffixNormalized = suffix.replace(/\./g, '');
      // For Roman numerals (I, II, III, etc.), match exactly
      if (/^[IVX]+$/.test(suffix)) {
        return lastPart === suffix;
      }
      // For Jr/Sr/Junior/Senior, case-insensitive
      return lastPartNormalized.toLowerCase() === suffixNormalized.toLowerCase();
    });
    
    if (isGenerationalSuffix && parts.length > 2) {
      // Extract the suffix and use the previous part as last name
      suffixPart = lastPart;
      lastPartIndex = parts.length - 2;
    }
    
    let lastNameParts = [parts[lastPartIndex]];
    let middleParts = parts.slice(1, lastPartIndex);

    // Detect last name prefixes (start from the position before the last name)
    let i = lastPartIndex - 1;
    while (i >= 1) {
      const candidate = parts[i].toLowerCase();
      const candidate2 = i > 0 ? `${parts[i - 1]} ${parts[i]}`.toLowerCase() : candidate;

      if (nameConfig.LAST_NAME_PREFIXES.includes(candidate2)) {
        lastNameParts = [...parts.slice(i - 1, i + 1), ...lastNameParts];
        middleParts = parts.slice(1, i - 1);
        i -= 1;
      } else if (nameConfig.LAST_NAME_PREFIXES.includes(candidate)) {
        lastNameParts = [parts[i], ...lastNameParts];
        middleParts = parts.slice(1, i);
      } else {
        break;
      }
      i -= 1;
    }

    this.lastName = lastNameParts.join(' ');
    this.middleName = middleParts.length > 0 ? middleParts.join(' ') : null;
    
    // Assign generational suffix if detected (combine with credential suffix if both exist)
    if (suffixPart) {
      if (this.suffix) {
        // Combine generational suffix with credential suffix
        this.suffix = `${suffixPart} ${this.suffix}`;
      } else {
        this.suffix = suffixPart;
      }
    }
    
    this.isValid = true;
    this.parseTime = performance.now() - startTime;
  }

  format(formatString: string): string {
    if (!this.isValid) return '';

    const formatMap: Record<string, string> = {
      'f': this.firstName || '',
      'm': this.middleName || '',
      'l': this.lastName || '',
      'p': this.prefix || '',
      's': this.suffix || '',
      'n': this.nickname || '',
      'F': (this.firstName || '').toUpperCase(),
      'M': (this.middleName || '').toUpperCase(),
      'L': (this.lastName || '').toUpperCase(),
    };

    return formatString
      .split(' ')
      .map(c => formatMap[c] || c)
      .filter(s => s.trim())
      .join(' ')
      .trim();
  }

  get full(): string {
    return this.format('p f m l s');
  }

  get short(): string {
    return this.format('f l');
  }

  get initials(): string[] {
    const result: string[] = [];
    if (this.firstName) result.push(this.firstName[0].toUpperCase());
    if (this.middleName) {
      this.middleName.split(' ').forEach(m => {
        if (m) result.push(m[0].toUpperCase());
      });
    }
    if (this.lastName) result.push(this.lastName[0].toUpperCase());
    return result;
  }

  toObject(): NameParts & { rawName: string; isValid: boolean; parseTime: number } {
    return {
      firstName: this.firstName,
      middleName: this.middleName,
      lastName: this.lastName,
      nickname: this.nickname,
      prefix: this.prefix,
      suffix: this.suffix,
      rawName: this.rawName,
      isValid: this.isValid,
      parseTime: this.parseTime
    };
  }

  toJSON(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  toCSVRow(): string {
    return [
      this.rawName,
      this.firstName || '',
      this.middleName || '',
      this.lastName || '',
      this.nickname || '',
      this.isValid ? 'Valid' : 'Invalid',
      this.parseTime.toFixed(2) + 'ms'
    ].map(v => `"${v}"`).join(',');
  }

  static csvHeader(): string {
    return 'Raw Name,First Name,Middle Name,Last Name,Nickname,Status,Parse Time';
  }

  getHighlightedParts(): Array<{ text: string; type: 'first' | 'middle' | 'last' | 'nickname' | 'other' }> {
    if (!this.isValid) return [{ text: this.rawName, type: 'other' }];
    
    const parts: Array<{ text: string; type: 'first' | 'middle' | 'last' | 'nickname' | 'other' }> = [];
    const words = this.rawName.split(/\s+/);
    
    words.forEach((word, idx) => {
      const cleanWord = word.replace(/[^a-zA-ZÀ-ÿ]/g, '').toLowerCase();
      
      if (this.firstName && cleanWord === this.firstName.toLowerCase()) {
        parts.push({ text: word, type: 'first' });
      } else if (this.lastName && this.lastName.toLowerCase().includes(cleanWord)) {
        parts.push({ text: word, type: 'last' });
      } else if (this.middleName && this.middleName.toLowerCase().includes(cleanWord)) {
        parts.push({ text: word, type: 'middle' });
      } else if (this.nickname && this.nickname.toLowerCase().includes(cleanWord)) {
        parts.push({ text: word, type: 'nickname' });
      } else {
        parts.push({ text: word, type: 'other' });
      }
    });
    
    return parts;
  }
}

export function parseBatch(names: string[], options: ParseOptions = {}): ParseResult[] {
  const startTime = performance.now();
  const results = names.map(name => {
    const parseStart = performance.now();
    const parsedName = new NameEnhanced(name, options);
    const parseTime = performance.now() - parseStart;
    
    return {
      name: parsedName,
      performance: {
        parseTime: parsedName.parseTime,
        repairTime: 0, // Could be calculated separately if needed
        totalTime: parseTime
      }
    };
  });
  
  return results;
}
