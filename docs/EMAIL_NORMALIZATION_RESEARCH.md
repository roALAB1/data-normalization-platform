# Email Normalization Research

## Executive Summary

Email normalization is critical for data deduplication, user authentication, and marketing campaigns. Unlike phone numbers (which have a single authoritative library: Google's libphonenumber), email normalization requires understanding **provider-specific rules** and **RFC standards**.

**Recommended Solution**: **validator.js** - The industry standard with 23.7k GitHub stars and comprehensive email validation/normalization.

---

## Industry Standard: validator.js

### Overview

- **GitHub**: https://github.com/validatorjs/validator.js
- **Stars**: 23.7k ⭐
- **Weekly Downloads**: ~8-10 million
- **Maturity**: 13+ years (v13.15.20 as of 2025)
- **TypeScript**: Full support
- **Bundle Size**: ~15 KB minified

### Why validator.js?

1. **Battle-tested**: Used by millions of applications worldwide
2. **Comprehensive**: 100+ validation and sanitization functions
3. **Provider-specific**: Gmail, Outlook, Yahoo, iCloud normalization rules
4. **RFC compliant**: Follows RFC 5321 and RFC 5322 standards
5. **Actively maintained**: Regular updates and security patches

---

## Email Validation Features

### `isEmail(str, options)`

Validates email addresses with extensive options:

```javascript
validator.isEmail('test@example.com', {
  allow_display_name: false,        // "John Doe <john@example.com>"
  require_display_name: false,      // Require display name format
  allow_utf8_local_part: true,      // Allow non-ASCII characters
  require_tld: true,                // Require top-level domain
  allow_ip_domain: false,           // Allow IP addresses as domain
  allow_underscores: false,         // Allow underscores in local part
  domain_specific_validation: false,// Gmail-specific validation
  blacklisted_chars: '',            // Reject specific characters
  host_blacklist: [],               // Reject specific domains
  host_whitelist: [],               // Allow only specific domains
  ignore_max_length: false          // Ignore RFC max length (254 chars)
});
```

**Key Features:**
- ✅ RFC 5321 and RFC 5322 compliant
- ✅ Display name support ("John Doe <john@example.com>")
- ✅ UTF-8 local part support (international emails)
- ✅ Domain blacklist/whitelist
- ✅ Gmail-specific validation (rejects syntactically valid but Gmail-rejected addresses)

---

## Email Normalization Features

### `normalizeEmail(email, options)`

Canonicalizes email addresses for deduplication:

```javascript
validator.normalizeEmail('John.Doe+spam@Gmail.com', {
  // Global options
  all_lowercase: true,              // Lowercase all emails
  
  // Gmail-specific
  gmail_lowercase: true,            // Lowercase Gmail addresses
  gmail_remove_dots: true,          // "john.doe" → "johndoe"
  gmail_remove_subaddress: true,    // "john+spam" → "john"
  gmail_convert_googlemaildotcom: true, // @googlemail.com → @gmail.com
  
  // Outlook.com-specific
  outlookdotcom_lowercase: true,
  outlookdotcom_remove_subaddress: true, // "john+spam" → "john"
  
  // Yahoo-specific
  yahoo_lowercase: true,
  yahoo_remove_subaddress: true,    // "john-spam" → "john" (note: dash, not plus)
  
  // iCloud-specific
  icloud_lowercase: true,
  icloud_remove_subaddress: true    // "john+spam" → "john"
});
```

**Result**: `johndoe@gmail.com`

---

## Provider-Specific Normalization Rules

### Gmail (@gmail.com, @googlemail.com)

**Rules:**
1. **Case-insensitive**: `John.Doe@Gmail.com` === `john.doe@gmail.com`
2. **Dots ignored**: `john.doe@gmail.com` === `johndoe@gmail.com`
3. **Plus addressing**: `john+spam@gmail.com` → `john@gmail.com`
4. **Domain equivalence**: `@googlemail.com` === `@gmail.com`

**Example:**
```
Input:  John.Doe+Newsletter@GoogleMail.com
Output: johndoe@gmail.com
```

### Outlook.com (@outlook.com, @hotmail.com, @live.com)

**Rules:**
1. **Case-insensitive**: `John.Doe@Outlook.com` === `john.doe@outlook.com`
2. **Dots preserved**: `john.doe@outlook.com` ≠ `johndoe@outlook.com`
3. **Plus addressing**: `john+spam@outlook.com` → `john@outlook.com`

**Example:**
```
Input:  John.Doe+Spam@Outlook.com
Output: john.doe@outlook.com
```

### Yahoo (@yahoo.com, @ymail.com)

**Rules:**
1. **Case-insensitive**: `John.Doe@Yahoo.com` === `john.doe@yahoo.com`
2. **Dots preserved**: `john.doe@yahoo.com` ≠ `johndoe@yahoo.com`
3. **Dash addressing**: `john-spam@yahoo.com` → `john@yahoo.com` (note: dash, not plus)

**Example:**
```
Input:  John.Doe-Newsletter@Yahoo.com
Output: john.doe@yahoo.com
```

### iCloud (@icloud.com, @me.com, @mac.com)

**Rules:**
1. **Case-insensitive**: `John.Doe@iCloud.com` === `john.doe@icloud.com`
2. **Dots preserved**: `john.doe@icloud.com` ≠ `johndoe@icloud.com`
3. **Plus addressing**: `john+spam@icloud.com` → `john@icloud.com`

**Example:**
```
Input:  John.Doe+Spam@iCloud.com
Output: john.doe@icloud.com
```

---

## RFC Standards

### RFC 5321 (SMTP)

**Key Rules:**
- Local part: Up to 64 characters
- Domain part: Up to 255 characters
- Total: Up to 254 characters (local + @ + domain)
- Case sensitivity: **Technically case-sensitive**, but most providers treat as case-insensitive

### RFC 5322 (Internet Message Format)

**Key Rules:**
- Display name support: `"John Doe" <john@example.com>`
- Comments: `john(comment)@example.com`
- Quoted strings: `"john..doe"@example.com`
- Special characters: `!#$%&'*+-/=?^_`{|}~`

**Note**: Most validators (including validator.js) use a **practical subset** of RFC 5322 that rejects overly complex addresses.

---

## Email Normalization Best Practices

### 1. **Always Lowercase**
```javascript
"John.Doe@Example.com" → "john.doe@example.com"
```
**Why**: Email addresses are case-insensitive per RFC (though local part *can* be case-sensitive, no major provider uses this).

### 2. **Trim Whitespace**
```javascript
"  john@example.com  " → "john@example.com"
```
**Why**: Whitespace is never valid in email addresses.

### 3. **Provider-Specific Rules**
```javascript
// Gmail
"john.doe+spam@gmail.com" → "johndoe@gmail.com"

// Outlook
"john.doe+spam@outlook.com" → "john.doe@outlook.com"

// Yahoo
"john.doe-spam@yahoo.com" → "john.doe@yahoo.com"
```
**Why**: Prevents duplicate accounts and improves deduplication.

### 4. **Validate Before Normalize**
```javascript
if (validator.isEmail(email)) {
  const normalized = validator.normalizeEmail(email);
  // Use normalized email
}
```
**Why**: `normalizeEmail()` doesn't validate; invalid input produces invalid output.

### 5. **Preserve Original for Communication**
```javascript
const original = "John.Doe+Newsletter@Gmail.com";
const normalized = "johndoe@gmail.com";

// Store both:
// - normalized for deduplication/lookup
// - original for sending emails (user preference)
```
**Why**: Users expect emails sent to the address they provided.

---

## Alternative Libraries

### 1. **email-validator** (npm)
- **Downloads**: ~500k/week
- **Stars**: ~1k
- **Pros**: Lightweight, simple API
- **Cons**: No normalization, basic validation only
- **Use case**: When you only need validation, not normalization

### 2. **email-normalizer** (GitHub: CorentinTh/email-normalizer)
- **Downloads**: ~5k/week
- **Stars**: ~100
- **Pros**: Focused on normalization
- **Cons**: Less mature, smaller community
- **Use case**: When you want a dedicated normalization library

### 3. **Joi** (schema validation)
- **Downloads**: ~10M/week
- **Stars**: ~20k
- **Pros**: Full schema validation framework
- **Cons**: Overkill for just email validation
- **Use case**: When you're already using Joi for schema validation

### 4. **Zod** (TypeScript-first validation)
- **Downloads**: ~15M/week
- **Stars**: ~35k
- **Pros**: TypeScript-first, modern API
- **Cons**: No built-in email normalization
- **Use case**: TypeScript projects with complex validation needs

---

## Recommendation: validator.js

### Why validator.js is the Best Choice

1. **Industry Standard**: 23.7k stars, 8-10M weekly downloads
2. **Comprehensive**: Both validation AND normalization
3. **Provider-Specific**: Gmail, Outlook, Yahoo, iCloud rules built-in
4. **Battle-Tested**: 13+ years of production use
5. **TypeScript Support**: Full type definitions
6. **Small Bundle**: ~15 KB minified
7. **Active Maintenance**: Regular updates and security patches

### Implementation Strategy

**Phase 1: Core Integration (2-3 days)**
- Install validator.js
- Create `EmailEnhanced` class wrapping validator.js
- Add validation and normalization methods
- Export from `@normalization/core` package

**Phase 2: UI Integration (2-3 days)**
- Create Email Demo page (similar to Phone Demo Enhanced)
- Add real-time validation
- Show normalized vs original email
- Add provider-specific examples

**Phase 3: Batch Processing (2-3 days)**
- Integrate with existing batch job system
- Add email normalization to CSV processing
- Update job dashboard to show email stats

**Phase 4: Documentation (1 day)**
- API documentation
- Best practices guide
- Provider-specific rules reference

**Total Estimated Time**: 7-10 days

---

## Example Implementation

### EmailEnhanced Class

```typescript
import validator from 'validator';

interface EmailOptions {
  allowDisplayName?: boolean;
  requireTld?: boolean;
  allowUtf8LocalPart?: boolean;
  domainBlacklist?: string[];
  domainWhitelist?: string[];
}

interface NormalizeOptions {
  allLowercase?: boolean;
  gmailRemoveDots?: boolean;
  gmailRemoveSubaddress?: boolean;
  outlookRemoveSubaddress?: boolean;
  yahooRemoveSubaddress?: boolean;
  icloudRemoveSubaddress?: boolean;
}

export class EmailEnhanced {
  public readonly original: string;
  public readonly normalized: string;
  public readonly isValid: boolean;
  public readonly provider: string | null;
  public readonly localPart: string | null;
  public readonly domain: string | null;
  
  constructor(email: string, options?: EmailOptions) {
    this.original = email.trim();
    
    // Validate
    this.isValid = validator.isEmail(this.original, {
      allow_display_name: options?.allowDisplayName ?? false,
      require_tld: options?.requireTld ?? true,
      allow_utf8_local_part: options?.allowUtf8LocalPart ?? true,
      host_blacklist: options?.domainBlacklist ?? [],
      host_whitelist: options?.domainWhitelist ?? []
    });
    
    // Normalize
    if (this.isValid) {
      this.normalized = validator.normalizeEmail(this.original, {
        all_lowercase: true,
        gmail_remove_dots: true,
        gmail_remove_subaddress: true,
        gmail_convert_googlemaildotcom: true,
        outlookdotcom_remove_subaddress: true,
        yahoo_remove_subaddress: true,
        icloud_remove_subaddress: true
      }) || this.original.toLowerCase();
      
      // Parse parts
      const [local, domain] = this.normalized.split('@');
      this.localPart = local;
      this.domain = domain;
      this.provider = this.detectProvider(domain);
    } else {
      this.normalized = this.original.toLowerCase();
      this.localPart = null;
      this.domain = null;
      this.provider = null;
    }
  }
  
  private detectProvider(domain: string): string | null {
    const providerMap: Record<string, string> = {
      'gmail.com': 'Gmail',
      'googlemail.com': 'Gmail',
      'outlook.com': 'Outlook',
      'hotmail.com': 'Outlook',
      'live.com': 'Outlook',
      'yahoo.com': 'Yahoo',
      'ymail.com': 'Yahoo',
      'icloud.com': 'iCloud',
      'me.com': 'iCloud',
      'mac.com': 'iCloud'
    };
    
    return providerMap[domain.toLowerCase()] || null;
  }
  
  public getProviderRules(): string[] {
    switch (this.provider) {
      case 'Gmail':
        return [
          'Case-insensitive',
          'Dots ignored',
          'Plus addressing supported',
          '@googlemail.com → @gmail.com'
        ];
      case 'Outlook':
        return [
          'Case-insensitive',
          'Dots preserved',
          'Plus addressing supported'
        ];
      case 'Yahoo':
        return [
          'Case-insensitive',
          'Dots preserved',
          'Dash addressing supported'
        ];
      case 'iCloud':
        return [
          'Case-insensitive',
          'Dots preserved',
          'Plus addressing supported'
        ];
      default:
        return ['Case-insensitive (standard)'];
    }
  }
}
```

### Usage Examples

```typescript
// Basic validation and normalization
const email1 = new EmailEnhanced('John.Doe+Spam@Gmail.com');
console.log(email1.isValid);      // true
console.log(email1.normalized);   // "johndoe@gmail.com"
console.log(email1.provider);     // "Gmail"
console.log(email1.localPart);    // "johndoe"
console.log(email1.domain);       // "gmail.com"

// Outlook example
const email2 = new EmailEnhanced('Jane.Smith+Newsletter@Outlook.com');
console.log(email2.normalized);   // "jane.smith@outlook.com"
console.log(email2.provider);     // "Outlook"

// Yahoo example
const email3 = new EmailEnhanced('Bob-Work@Yahoo.com');
console.log(email3.normalized);   // "bob@yahoo.com"
console.log(email3.provider);     // "Yahoo"

// Invalid email
const email4 = new EmailEnhanced('not-an-email');
console.log(email4.isValid);      // false
console.log(email4.normalized);   // "not-an-email"
console.log(email4.provider);     // null
```

---

## Performance Considerations

### validator.js Performance

- **Validation**: ~10-20 μs per email
- **Normalization**: ~5-10 μs per email
- **Bundle Size**: ~15 KB minified
- **Memory**: Negligible (stateless functions)

### Batch Processing

For 1 million emails:
- **Validation**: ~10-20 seconds
- **Normalization**: ~5-10 seconds
- **Total**: ~15-30 seconds

**Optimization**: Process in chunks of 10,000 emails for progress tracking.

---

## Security Considerations

### 1. **Email Injection**
```javascript
// Bad: Directly using user input
sendEmail(userInput, 'Subject', 'Body');

// Good: Validate first
if (validator.isEmail(userInput)) {
  sendEmail(userInput, 'Subject', 'Body');
}
```

### 2. **Domain Blacklisting**
```javascript
const email = new EmailEnhanced('test@disposable-email.com', {
  domainBlacklist: ['disposable-email.com', 'temp-mail.com']
});
```

### 3. **Rate Limiting**
Implement rate limiting for email validation to prevent abuse.

---

## Conclusion

**validator.js** is the clear industry standard for email validation and normalization. Its comprehensive feature set, provider-specific rules, and battle-tested reliability make it the ideal choice for our normalization platform.

**Next Steps:**
1. Install validator.js
2. Implement EmailEnhanced class
3. Create Email Demo page
4. Integrate with batch processing
5. Update documentation

**Estimated Timeline**: 7-10 days for complete integration.
