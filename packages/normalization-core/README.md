# @normalization/core

Comprehensive normalization library for data cleaning and standardization across multiple domains.

## Features

- **Name Normalization**: Parse and standardize personal names with 750+ credentials, titles, and suffixes
- **Phone Normalization**: Format and validate phone numbers (coming soon)
- **Email Normalization**: Validate and normalize email addresses (coming soon)
- **Company Normalization**: Standardize company names and legal entities (coming soon)
- **Address Normalization**: Parse and format addresses (coming soon)

## Installation

```bash
npm install @normalization/core
```

## Usage

### Name Normalization

```typescript
import { isCredential, isTitle, ALL_CREDENTIALS, TITLES } from '@normalization/core/names';

// Check if a word is a credential
console.log(isCredential('PhD')); // true
console.log(isCredential('MBA')); // true

// Check if a word is a title
console.log(isTitle('Dr')); // true
console.log(isTitle('Prof')); // true

// Access all credentials
console.log(ALL_CREDENTIALS.length); // 750+

// Access all titles
console.log(TITLES.length); // 50+
```

### Modular Imports

Import only what you need for optimal bundle size:

```typescript
// Import specific modules
import { isCredential } from '@normalization/core/names';
import { validateEmail } from '@normalization/core/emails';
import { formatPhone } from '@normalization/core/phones';

// Or import everything
import * as Normalization from '@normalization/core';
```

## API Reference

### Names Module

#### Credentials
- `ALL_CREDENTIALS`: Array of 750+ professional credentials
- `isCredential(word: string): boolean`: Check if word is a credential
- Organized by industry:
  - Academic degrees (PhD, MBA, MS, etc.)
  - Healthcare (MD, RN, DDS, etc.)
  - Finance (CPA, CFA, CFP, etc.)
  - Technology (CISSP, AWS, Azure, etc.)
  - Engineering (PE, SE, etc.)
  - Supply Chain (CSCP, CPIM, etc.)

#### Titles
- `TITLES`: Array of professional and honorific titles
- `isTitle(word: string): boolean`: Check if word is a title
- Examples: Dr, Prof, Mr, Mrs, Ms, Rev, etc.

#### Suffixes
- `GENERATIONAL_SUFFIXES`: Jr, Sr, II, III, IV, etc.
- `isGenerationalSuffix(word: string): boolean`: Check if word is a generational suffix

#### Prefixes
- `LAST_NAME_PREFIXES`: van, von, de, del, etc.
- `isLastNamePrefix(word: string): boolean`: Check if word is a last name prefix

### Common Module

Shared utilities for validation and formatting:

```typescript
import { normalize, validate } from '@normalization/core/common';
```

## Data Sources

Credentials compiled from:
- Wikipedia: List of Professional Designations in the United States
- FDA: Practitioner Acronym Table
- CompTIA, Cisco, Microsoft, AWS, (ISC)², ISACA
- APICS, ASQ, PMI, and other professional organizations

## Performance

- **O(1) lookups**: Uses Sets and Maps for constant-time checks
- **Tree-shakeable**: Import only what you need
- **Zero dependencies**: No external runtime dependencies
- **TypeScript**: Full type safety and IntelliSense support

## License

MIT

## Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.
