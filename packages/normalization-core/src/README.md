# Shared Normalization Library

A comprehensive, platform-wide normalization library for all data types across the normalization platform.

## Overview

This library provides a **single source of truth** for normalization data and utilities across all normalizers (Name, Phone, Email, Company, Address, etc.). It's designed for:

- **Consistency**: All normalizers use the same validated data
- **Performance**: Optimized data structures (Sets/Maps) for O(1) lookups
- **Maintainability**: Update once, works everywhere
- **Scalability**: Easy to add new normalizers and data
- **Modularity**: Import only what you need for optimal bundle size

## Structure

```
/shared/normalization/
├── names/           # Name-specific normalization
│   ├── credentials/ # 750+ professional credentials
│   ├── suffixes/    # Generational suffixes (Jr., Sr., II, III, etc.)
│   ├── prefixes/    # Titles and last name prefixes
│   └── index.ts     # Main export
├── phones/          # Phone number normalization
├── emails/          # Email address normalization
├── companies/       # Company name normalization
├── addresses/       # Postal address normalization
├── common/          # Shared utilities
└── index.ts         # Platform-wide export
```

## Usage

### Importing from Shared Library

```typescript
// Import everything from a specific domain
import { isCredential, CREDENTIALS_SET } from '@/shared/normalization/names';

// Import from the platform-wide index
import { isCredential, normalizeWhitespace } from '@/shared/normalization';

// Import common utilities
import { titleCase, removeAccents } from '@/shared/normalization/common';
```

### Using in Normalizers

```typescript
import { NameEnhanced } from '@/lib/NameEnhanced';
import { isCredential, isGenerationalSuffix } from '@/shared/normalization/names';

const name = new NameEnhanced("Dr. John Smith Jr. PhD");
// The NameEnhanced class internally uses the shared library
```

## Available Modules

### 1. Names (`/names`)

**Credentials** (750+ professional certifications)
- Academic: PhD, MD, MBA, etc.
- Healthcare: RN, PA, DDS, etc.
- Finance: CPA, CFA, CFP, etc.
- Technology: CISSP, AWS, CCNA, etc.
- Engineering: PE, SE, etc.
- Supply Chain: CSCP, CPIM, CTSC, etc.

**Suffixes**
- Generational: Jr., Sr., II, III, IV, V, etc.
- Ordinal: 1st, 2nd, 3rd, etc.

**Prefixes**
- Titles: Dr., Mr., Mrs., Ms., Prof., etc.
- Last Name Prefixes: van, von, de, del, etc.

**Functions**
- `isCredential(str: string): boolean`
- `isGenerationalSuffix(str: string): boolean`
- `isTitle(str: string): boolean`
- `isLastNamePrefix(str: string): boolean`

### 2. Phones (`/phones`)

**Coming Soon**
- Country codes
- Area codes
- Phone formats
- Carrier identification

### 3. Emails (`/emails`)

**Coming Soon**
- Email providers
- Domain typo correction
- Disposable email detection
- Alias handling

### 4. Companies (`/companies`)

**Coming Soon**
- Legal entity types
- Industry classifications
- Company abbreviations
- DBA name handling

### 5. Addresses (`/addresses`)

**Coming Soon**
- Street type abbreviations
- Directional abbreviations
- Unit designators
- State/Province codes
- Country codes
- Postal code formats

### 6. Common (`/common`)

**String Utilities**
- `normalizeWhitespace(str: string): string`
- `removeAccents(str: string): string`
- `titleCase(str: string): string`
- `upperCase(str: string): string`
- `lowerCase(str: string): string`

**Validation**
- `isAlpha(str: string): boolean`
- `isNumeric(str: string): boolean`
- `isAlphanumeric(str: string): boolean`

## Data Sources

### Names
- **Wikipedia**: List of Professional Designations in the United States
- **FDA**: Practitioner Acronym Table
- **CompTIA, Cisco, Microsoft, AWS, Google Cloud**: Technology certifications
- **(ISC)², ISACA, EC-Council**: Security certifications
- **APICS, ASQ, PMI**: Operations and quality certifications

### Phones, Emails, Companies, Addresses
- To be documented as modules are implemented

## Performance

All data is stored in optimized data structures:

- **Sets**: For fast membership testing (O(1))
- **Maps**: For fast key-value lookups (O(1))
- **Arrays**: Only for ordered lists that need iteration

Example:
```typescript
// Fast O(1) lookup
CREDENTIALS_SET.has('PhD') // true

// Slow O(n) lookup (avoid)
ALL_CREDENTIALS.includes('PhD') // true (but slower)
```

## Adding New Data

### Adding Credentials

1. Navigate to `/shared/normalization/names/credentials/`
2. Find the appropriate category file (e.g., `healthcare.ts`, `finance.ts`)
3. Add the credential to the array
4. The credential will automatically be included in the Sets/Maps

Example:
```typescript
// In healthcare.ts
export const HEALTHCARE_CREDENTIALS = [
  // ... existing credentials
  'CRNA', // Add new credential here
];
```

### Adding New Categories

1. Create a new file in the appropriate domain folder
2. Export the data array
3. Import and include it in the domain's `index.ts`

## Best Practices

1. **Use Sets for membership testing**: Always use `CREDENTIALS_SET.has()` instead of `ALL_CREDENTIALS.includes()`
2. **Import only what you need**: Don't import the entire library if you only need one function
3. **Keep data normalized**: Store data in canonical form (e.g., uppercase for credentials)
4. **Document sources**: Add comments with sources for new data
5. **Test additions**: Add test cases when adding new data

## Future Enhancements

- [ ] Add phone number normalization data
- [ ] Add email normalization data
- [ ] Add company normalization data
- [ ] Add address normalization data
- [ ] Add internationalization support
- [ ] Add data versioning
- [ ] Add data validation schemas
- [ ] Publish as standalone npm package

## Contributing

When adding new data or functionality:

1. Follow the existing structure and naming conventions
2. Use TypeScript for type safety
3. Add JSDoc comments for public APIs
4. Include data sources in comments
5. Test your changes with the integration tests

## License

This library is part of the Enhanced Name Normalization Demo project.
