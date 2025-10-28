import { nameConfig } from './nameConfig';

export interface RepairLog {
  original: string;
  repaired: string;
  reason: string;
}

export interface NameParts {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  nickname: string | null;
  prefix: string | null;
  suffix: string | null;
}

export class Name {
  rawName: string;
  firstName: string | null = null;
  middleName: string | null = null;
  lastName: string | null = null;
  nickname: string | null = null;
  prefix: string | null = null;
  suffix: string | null = null;
  isValid: boolean = false;
  parseLog: RepairLog[] = [];

  constructor(rawName: string) {
    this.rawName = rawName;
    this.parse();
  }

  private recordRepair(original: string, repaired: string, reason: string) {
    this.parseLog.push({ original, repaired, reason });
  }

  private stripAccents(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private keepLettersAndAllowed(ch: string): boolean {
    const code = ch.charCodeAt(0);
    // Letters, spaces, hyphens, apostrophes
    return /[a-zA-ZÀ-ÿ\s\-']/.test(ch);
  }

  private parse() {
    if (!this.rawName || this.rawName.trim() === '') {
      this.isValid = false;
      return;
    }

    let text = this.rawName.trim();
    const originalText = text;

    // 1. Fix mis-encoded characters
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
      this.recordRepair(originalText, text, 'multiword_cleanup');
      this.isValid = false;
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
      this.isValid = false;
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

    // 7. Strip accents
    cleanedName = this.stripAccents(cleanedName);

    if (!cleanedName) {
      this.isValid = false;
      return;
    }

    const parts = cleanedName.split(/\s+/);

    if (parts.length === 0) {
      this.isValid = false;
      return;
    }

    if (parts.length === 1) {
      this.firstName = parts[0];
      this.isValid = true;
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

  toObject(): NameParts & { rawName: string; isValid: boolean } {
    return {
      firstName: this.firstName,
      middleName: this.middleName,
      lastName: this.lastName,
      nickname: this.nickname,
      prefix: this.prefix,
      suffix: this.suffix,
      rawName: this.rawName,
      isValid: this.isValid
    };
  }
}
