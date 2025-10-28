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
      const regex = new RegExp(`\\b${bad}\\b`, 'gi');
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
        text = text.replace(new RegExp(bad, 'g'), good);
        if (text !== before) {
          this.recordRepair(before, text, 'symbol_cleanup');
        }
      }
    }

    // 2. Multi-person detection
    if (/\b(&|and)\b|\//i.test(text)) {
      this.recordRepair(originalText, text, 'multi_person_detected');
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    // 3. Extract nicknames
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

    // 4. Filter out job titles
    const hasJobWord = nameConfig.JOB_WORDS.some(word => 
      new RegExp(`\\b${word}\\b`, 'i').test(textNoNicknames)
    );
    if (hasJobWord) {
      this.recordRepair(originalText, text, 'job_title_detected');
      this.isValid = false;
      this.parseTime = performance.now() - startTime;
      return;
    }

    // 5. Remove credentials
    const credPattern = new RegExp(
      `\\b(${nameConfig.CREDENTIALS.map(c => c.replace(/\./g, '\\.?')).join('|')})\\b\\.?`,
      'gi'
    );
    let cleanedName = textNoNicknames.replace(credPattern, ' ');

    // 6. Normalize punctuation and spaces
    cleanedName = cleanedName
      .split('')
      .map(ch => this.keepLettersAndAllowed(ch) ? ch : ' ')
      .join('');
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

    // 7. Strip accents (if option is enabled)
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
    let lastNameParts = [parts[parts.length - 1]];
    let middleParts = parts.slice(1, -1);

    // Detect last name prefixes
    let i = parts.length - 2;
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
