# Contributing to Data Normalization Platform

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Adding a New Normalizer](#adding-a-new-normalizer)
- [Code Style](#code-style)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project follows a simple code of conduct:

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Prioritize data quality and accuracy

## Getting Started

### Prerequisites

- Node.js 22.x or higher
- pnpm 9.x or higher
- Git
- A GitHub account
- Basic understanding of TypeScript and React

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/data-normalization-platform.git
   cd data-normalization-platform
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/data-normalization-platform.git
   ```

4. **Install dependencies**:
   ```bash
   pnpm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Start development server**:
   ```bash
   pnpm dev
   ```

## Development Workflow

### Creating a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features (e.g., `feature/email-normalizer`)
- `fix/` - Bug fixes (e.g., `fix/regex-escaping`)
- `docs/` - Documentation updates (e.g., `docs/api-examples`)
- `refactor/` - Code refactoring (e.g., `refactor/csv-parser`)
- `test/` - Adding tests (e.g., `test/phone-validation`)

### Keeping Your Fork Updated

Regularly sync with the upstream repository:

```bash
git fetch upstream
git checkout master
git merge upstream/master
git push origin master
```

## Adding a New Normalizer

Follow these steps to add a new data normalizer (e.g., Email, Company, Address):

### 1. Create Configuration File

Create `client/src/lib/[type]Config.ts`:

```typescript
export const emailConfig = {
  DISPOSABLE_DOMAINS: [
    "tempmail.com",
    "guerrillamail.com",
    // ... more domains
  ],
  
  COMMON_TYPOS: {
    "gmial.com": "gmail.com",
    "yahooo.com": "yahoo.com",
    // ... more typos
  },
  
  // Add other configuration data
};
```

### 2. Create Normalizer Class

Create `client/src/lib/[Type]Normalizer.ts`:

```typescript
export interface [Type]Options {
  // Define options
}

export class [Type]Normalizer {
  raw[Type]: string;
  // ... properties
  
  constructor(raw[Type]: string, options: [Type]Options = {}) {
    this.raw[Type] = raw[Type];
    this.parse();
  }
  
  private parse() {
    // Implement parsing logic
  }
  
  // Add formatting methods
  toJSON(): string {
    // Return JSON representation
  }
  
  toCSVRow(): string {
    // Return CSV row
  }
}

// Export batch processing function
export function parseBatch(
  items: string[],
  options: [Type]Options = {}
): ParseResult[] {
  // Implement batch processing
}
```

### 3. Create Demo Page

Create `client/src/pages/[Type]Demo.tsx`:

```typescript
export default function [Type]Demo() {
  // Implement interactive demo UI
  // Include:
  // - Single item processing
  // - Batch processing
  // - CSV upload
  // - Results display
  // - Export options
}
```

### 4. Add Route

Update `client/src/App.tsx`:

```typescript
import [Type]Demo from "./pages/[Type]Demo";

// Add route
<Route path={"/[type]"} component={[Type]Demo} />
```

### 5. Update Server-Side Processing

Update `server/jobProcessor.ts` to handle the new type:

```typescript
case 'email':
  // Add processing logic
  break;
```

### 6. Add Tests

Create `client/src/lib/__tests__/[Type]Normalizer.test.ts`:

```typescript
import { [Type]Normalizer } from '../[Type]Normalizer';

describe('[Type]Normalizer', () => {
  it('should parse valid [type]', () => {
    // Add test cases
  });
  
  it('should handle edge cases', () => {
    // Add edge case tests
  });
});
```

### 7. Update Documentation

- Add section to README.md
- Create `docs/[type]-normalizer.md` with detailed API documentation
- Add examples to the demo page

## Code Style

### TypeScript Guidelines

- **Use TypeScript** for all new code
- **Define interfaces** for all data structures
- **Avoid `any` type** - use proper typing
- **Export types** that other modules might need

### Naming Conventions

- **Classes**: PascalCase (`NameNormalizer`, `PhoneNormalizer`)
- **Functions**: camelCase (`parseBatch`, `escapeRegex`)
- **Constants**: UPPER_SNAKE_CASE (`CREDENTIALS`, `JOB_WORDS`)
- **Interfaces**: PascalCase with descriptive names (`ParseOptions`, `RepairLog`)

### Code Organization

- **One class per file** for normalizers
- **Group related functions** in utility files
- **Keep configuration separate** from logic
- **Limit file length** to ~500 lines (split if longer)

### Comments and Documentation

```typescript
/**
 * Parse and normalize a phone number
 * 
 * @param rawPhone - The raw phone number string
 * @param options - Parsing options
 * @returns Normalized phone number object
 * 
 * @example
 * ```typescript
 * const phone = new PhoneNormalizer("+1 (415) 555-2671");
 * console.log(phone.e164); // "+14155552671"
 * ```
 */
```

### React Component Guidelines

- **Use functional components** with hooks
- **Extract reusable logic** into custom hooks
- **Keep components focused** - single responsibility
- **Use TypeScript** for prop types

```typescript
interface ComponentProps {
  data: string[];
  onProcess: (results: Result[]) => void;
}

export function Component({ data, onProcess }: ComponentProps) {
  // Implementation
}
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Writing Tests

- **Test edge cases**: Empty strings, null, undefined, special characters
- **Test error handling**: Invalid input, malformed data
- **Test performance**: Large datasets, batch processing
- **Use descriptive test names**: "should handle phone numbers with extensions"

### Test Structure

```typescript
describe('PhoneNormalizer', () => {
  describe('constructor', () => {
    it('should parse valid US phone number', () => {
      const phone = new PhoneNormalizer('+14155552671');
      expect(phone.isValid).toBe(true);
      expect(phone.countryCode).toBe('1');
    });
    
    it('should handle invalid phone numbers', () => {
      const phone = new PhoneNormalizer('invalid');
      expect(phone.isValid).toBe(false);
    });
  });
  
  describe('format', () => {
    it('should format as E.164', () => {
      const phone = new PhoneNormalizer('(415) 555-2671', { defaultCountry: 'US' });
      expect(phone.e164).toBe('+14155552671');
    });
  });
});
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(email): add email normalizer with disposable detection

- Implement EmailNormalizer class
- Add disposable domain detection
- Create interactive demo page
- Add batch processing support

Closes #123
```

```
fix(name): escape special regex characters in config

The question mark in MISENCODED_MAP was causing regex errors.
Added escapeRegex utility to properly escape special characters.

Fixes #456
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with latest master:
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. **Run tests** and ensure they pass:
   ```bash
   pnpm test
   pnpm type-check
   pnpm lint
   ```

3. **Update documentation** if needed

4. **Add tests** for new functionality

5. **Update CHANGELOG.md** with your changes

### Submitting a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub

3. **Fill out the PR template** completely:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)

4. **Request review** from maintainers

### PR Title Format

Use the same format as commit messages:

```
feat(email): add email normalizer
fix(csv): handle quoted fields correctly
docs(readme): update installation instructions
```

### Review Process

- Maintainers will review your PR within 2-3 business days
- Address any requested changes
- Once approved, a maintainer will merge your PR

### After Merge

1. **Delete your feature branch**:
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

2. **Update your master branch**:
   ```bash
   git checkout master
   git pull upstream master
   ```

## Questions?

- Open an [Issue](https://github.com/ORIGINAL_OWNER/data-normalization-platform/issues)
- Join our discussions
- Email the maintainers

Thank you for contributing! 🎉
