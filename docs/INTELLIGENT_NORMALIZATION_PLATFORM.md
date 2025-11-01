# Intelligent Multi-Type Normalization Platform

## Overview

The Intelligent Normalization Platform automatically detects data types in CSV files and applies appropriate normalization strategies across multiple columns simultaneously.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Uploads CSV File                        │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CSV Analyzer                                │
│  - Parse CSV structure                                           │
│  - Extract headers and sample data                               │
│  - Detect encoding and delimiter                                 │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Data Type Detector                             │
│  - Analyze each column independently                             │
│  - Pattern matching (regex, heuristics)                          │
│  - Confidence scoring (0-100%)                                   │
│  - Multi-label detection (e.g., "Full Name" vs "First Name")    │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│              Normalization Strategy Generator                    │
│  - Map detected types to normalizers                             │
│  - Resolve dependencies (e.g., split name before normalizing)   │
│  - Generate execution plan                                       │
│  - Estimate processing time and cost                             │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                  User Confirmation UI                            │
│  - Show detected column types                                    │
│  - Allow manual override                                         │
│  - Configure normalization options                               │
│  - Preview sample results                                        │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│              Unified Normalization Engine                        │
│  - Execute normalization plan                                    │
│  - Route to appropriate normalizers:                             │
│    * NameEnhanced (names)                                        │
│    * PhoneEnhanced (phones)                                      │
│    * EmailEnhanced (emails)                                      │
│    * AddressFormatter (addresses)                                │
│  - Track progress and errors                                     │
│  - Generate quality metrics                                      │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Results & Download                            │
│  - Show normalized data table                                    │
│  - Display quality metrics                                       │
│  - Highlight changes and errors                                  │
│  - Download normalized CSV                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. DataTypeDetector

**Purpose:** Automatically identify the data type of each CSV column.

**Supported Types:**
- `name` - Full names (e.g., "John Doe")
- `first_name` - First names only
- `last_name` - Last names only
- `email` - Email addresses
- `phone` - Phone numbers
- `address` - Street addresses
- `city` - City names
- `state` - State/province
- `zip` - Postal codes
- `country` - Country names
- `company` - Company names
- `unknown` - Unrecognized data

**Detection Methods:**

1. **Header Analysis** (40% weight)
   - Match column name against known patterns
   - Examples: "Email", "E-mail", "Email Address" → `email`
   - Examples: "Phone", "Mobile", "Cell" → `phone`

2. **Pattern Matching** (60% weight)
   - Regex patterns for each data type
   - Statistical analysis of sample data
   - Format validation

**Confidence Scoring:**
- **90-100%:** High confidence, auto-apply normalization
- **70-89%:** Medium confidence, suggest to user
- **50-69%:** Low confidence, require user confirmation
- **0-49%:** Unknown, mark as unrecognized

**Example:**

```typescript
const detector = new DataTypeDetector();
const result = detector.detectColumn('Email', [
  'john.doe+spam@gmail.com',
  'jane@example.com',
  'invalid-email'
]);

// Result:
// {
//   type: 'email',
//   confidence: 95,
//   sampleMatches: 2,
//   sampleTotal: 3,
//   matchRate: 0.67
// }
```

---

### 2. UnifiedNormalizationEngine

**Purpose:** Route data to appropriate normalizers and execute normalization plan.

**Features:**
- **Multi-column processing** - Normalize multiple columns in one pass
- **Dependency resolution** - Handle column dependencies (e.g., split full name before normalizing)
- **Error handling** - Gracefully handle invalid data
- **Progress tracking** - Real-time progress updates
- **Caching** - Cache normalized values to avoid redundant processing

**Example:**

```typescript
const engine = new UnifiedNormalizationEngine();

const plan = {
  columns: [
    { name: 'Name', type: 'name', normalizer: 'NameEnhanced' },
    { name: 'Email', type: 'email', normalizer: 'EmailEnhanced' },
    { name: 'Phone', type: 'phone', normalizer: 'PhoneEnhanced' },
    { name: 'Address', type: 'address', normalizer: 'AddressFormatter' }
  ]
};

const result = await engine.execute(csvData, plan);
```

---

### 3. SmartCSVProcessor

**Purpose:** Analyze CSV files and generate normalization strategies.

**Features:**
- **Automatic column detection** - Identify all columns and their types
- **Sample-based analysis** - Analyze first 100 rows for patterns
- **Multi-format support** - Handle different CSV formats (comma, semicolon, tab)
- **Encoding detection** - Auto-detect UTF-8, Latin-1, etc.
- **Large file handling** - Stream processing for files >100MB

**Workflow:**

1. **Upload CSV** → Parse structure
2. **Analyze Columns** → Detect types with confidence scores
3. **Generate Strategy** → Map columns to normalizers
4. **User Confirmation** → Show preview and allow overrides
5. **Execute** → Normalize all columns
6. **Download** → Export normalized CSV

---

## Data Type Detection Patterns

### Name Detection

**Header Patterns:**
- `name`, `full_name`, `fullname`, `full name`
- `first_name`, `firstname`, `first name`
- `last_name`, `lastname`, `last name`, `surname`
- `middle_name`, `middlename`, `middle name`

**Content Patterns:**
- Contains 2-4 words
- First character is uppercase
- Contains common name particles (de, van, von, etc.)
- No numbers or special characters (except hyphens, apostrophes)
- Length: 2-50 characters

**Examples:**
- ✅ "John Doe"
- ✅ "Mary Jane Smith"
- ✅ "José García"
- ✅ "O'Brien"
- ❌ "john@example.com" (email)
- ❌ "123 Main St" (address)

---

### Email Detection

**Header Patterns:**
- `email`, `e-mail`, `email_address`, `email address`
- `mail`, `contact_email`, `work_email`, `personal_email`

**Content Patterns:**
- Contains exactly one `@` symbol
- Has domain with TLD (`.com`, `.org`, etc.)
- No spaces
- Length: 5-254 characters (RFC 5321)

**Examples:**
- ✅ "john.doe@example.com"
- ✅ "jane+spam@gmail.com"
- ✅ "user@subdomain.example.co.uk"
- ❌ "john.doe" (no @)
- ❌ "john@" (no domain)

---

### Phone Detection

**Header Patterns:**
- `phone`, `phone_number`, `phone number`, `tel`, `telephone`
- `mobile`, `cell`, `cell_phone`, `work_phone`, `home_phone`

**Content Patterns:**
- Contains 10-15 digits
- May have country code prefix (+1, +44, etc.)
- May have formatting (parentheses, hyphens, spaces)
- No letters (except optional 'x' for extension)

**Examples:**
- ✅ "+1 (415) 555-2671"
- ✅ "415-555-2671"
- ✅ "4155552671"
- ✅ "+44 20 7946 0958"
- ❌ "123" (too short)
- ❌ "abc-def-ghij" (letters)

---

### Address Detection

**Header Patterns:**
- `address`, `street_address`, `street address`, `mailing_address`
- `address_line_1`, `address1`, `street`, `street_name`

**Content Patterns:**
- Contains street number (digits at start or after directional)
- Contains street name (2-30 characters)
- May contain street type (St, Ave, Blvd, etc.)
- May contain directional (N, S, E, W, NE, etc.)
- May contain unit number (Apt, Suite, #, etc.)
- Length: 10-100 characters

**Examples:**
- ✅ "143 West Sidlee Street"
- ✅ "456 N Main Ave Apt 5"
- ✅ "789 Oak Boulevard"
- ✅ "PO Box 123"
- ❌ "New York" (city, not address)
- ❌ "john@example.com" (email)

---

## Normalization Strategy Examples

### Example 1: Simple Contact List

**Input CSV:**
```csv
Name,Email,Phone
John Doe,john.doe+spam@gmail.com,(415) 555-2671
JANE SMITH,jane@EXAMPLE.COM,4155552672
mary johnson,mary.johnson@yahoo.com,+1-415-555-2673
```

**Detection Results:**
- `Name` → `name` (confidence: 98%)
- `Email` → `email` (confidence: 100%)
- `Phone` → `phone` (confidence: 95%)

**Normalization Strategy:**
```typescript
{
  columns: [
    {
      name: 'Name',
      type: 'name',
      normalizer: 'NameEnhanced',
      options: { format: 'first last' }
    },
    {
      name: 'Email',
      type: 'email',
      normalizer: 'EmailEnhanced',
      options: { normalize: true }
    },
    {
      name: 'Phone',
      type: 'phone',
      normalizer: 'PhoneEnhanced',
      options: { format: 'E.164', defaultCountry: 'US' }
    }
  ]
}
```

**Output CSV:**
```csv
Name,Email,Phone,Name_First,Name_Last,Email_Normalized,Phone_Normalized
John Doe,john.doe+spam@gmail.com,(415) 555-2671,John,Doe,johndoe@gmail.com,+14155552671
Jane Smith,jane@EXAMPLE.COM,4155552672,Jane,Smith,jane@example.com,+14155552672
Mary Johnson,mary.johnson@yahoo.com,+1-415-555-2673,Mary,Johnson,mary.johnson@yahoo.com,+14155552673
```

---

### Example 2: Mailing List with Addresses

**Input CSV:**
```csv
Full Name,Street Address,City,State,ZIP,Email
John Doe,143 WEST SIDLEE STREET,Buffalo,NY,14201,john@example.com
Jane Smith,456 NORTH MAIN AVENUE APT 5,Los Angeles,CA,90001,jane@example.com
```

**Detection Results:**
- `Full Name` → `name` (confidence: 100%)
- `Street Address` → `address` (confidence: 95%)
- `City` → `city` (confidence: 90%)
- `State` → `state` (confidence: 100%)
- `ZIP` → `zip` (confidence: 100%)
- `Email` → `email` (confidence: 100%)

**Normalization Strategy:**
```typescript
{
  columns: [
    { name: 'Full Name', type: 'name', normalizer: 'NameEnhanced' },
    { name: 'Street Address', type: 'address', normalizer: 'AddressFormatter' },
    { name: 'Email', type: 'email', normalizer: 'EmailEnhanced' }
  ]
}
```

**Output CSV:**
```csv
Full Name,Street Address,City,State,ZIP,Email,Name_First,Name_Last,Address_Normalized,Email_Normalized
John Doe,143 WEST SIDLEE STREET,Buffalo,NY,14201,john@example.com,John,Doe,143 West Sidlee St,john@example.com
Jane Smith,456 NORTH MAIN AVENUE APT 5,Los Angeles,CA,90001,jane@example.com,Jane,Smith,456 North Main Ave Apt 5,jane@example.com
```

---

## User Interface Flow

### Step 1: Upload CSV

```
┌──────────────────────────────────────────────────────────┐
│  Intelligent Normalization                                │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │   📁 Drop CSV file here or click to browse         │  │
│  │                                                      │  │
│  │   Supported: CSV, TSV (max 100MB, 1M rows)         │  │
│  │                                                      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  Or try example files:                                    │
│  [Contact List] [Mailing List] [Customer Data]           │
└──────────────────────────────────────────────────────────┘
```

### Step 2: Column Type Detection

```
┌──────────────────────────────────────────────────────────┐
│  Analyzing CSV... ✓ Complete                              │
│                                                            │
│  Detected 5 columns with 1,234 rows                       │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Column Name    │ Detected Type │ Confidence │ Action│  │
│  ├────────────────┼───────────────┼────────────┼───────│  │
│  │ Name           │ 👤 Name       │ 98% ✓      │ [✓]   │  │
│  │ Email          │ 📧 Email      │ 100% ✓     │ [✓]   │  │
│  │ Phone          │ 📞 Phone      │ 95% ✓      │ [✓]   │  │
│  │ Address        │ 🏠 Address    │ 92% ✓      │ [✓]   │  │
│  │ Notes          │ ❓ Unknown    │ 45% ⚠      │ [ ]   │  │
│  └────────────────┴───────────────┴────────────┴───────┘  │
│                                                            │
│  [Configure Options] [Preview Sample] [Start Processing] │
└──────────────────────────────────────────────────────────┘
```

### Step 3: Preview Sample Results

```
┌──────────────────────────────────────────────────────────┐
│  Preview Normalization (first 5 rows)                     │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Original Name    │ Normalized Name │ Changes        │  │
│  ├──────────────────┼─────────────────┼────────────────│  │
│  │ JOHN DOE         │ John Doe        │ Title Case     │  │
│  │ jane smith, phd  │ Jane Smith      │ Removed PhD    │  │
│  │ Mary-Jane Wilson │ Mary-Jane Wilson│ No changes     │  │
│  └──────────────────┴─────────────────┴────────────────┘  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Original Email           │ Normalized Email        │  │
│  ├──────────────────────────┼─────────────────────────│  │
│  │ john.doe+spam@gmail.com  │ johndoe@gmail.com       │  │
│  │ JANE@EXAMPLE.COM         │ jane@example.com        │  │
│  │ mary@yahoo.com           │ mary@yahoo.com          │  │
│  └──────────────────────────┴─────────────────────────┘  │
│                                                            │
│  [Back] [Adjust Settings] [Start Processing]             │
└──────────────────────────────────────────────────────────┘
```

### Step 4: Processing

```
┌──────────────────────────────────────────────────────────┐
│  Processing 1,234 rows...                                 │
│                                                            │
│  ████████████████████░░░░░░░░░░  65% (803/1,234)         │
│                                                            │
│  Current: Normalizing emails...                           │
│  Estimated time remaining: 12 seconds                     │
│                                                            │
│  ✓ Names: 803/803 processed (100%)                        │
│  ⏳ Emails: 521/803 processed (65%)                       │
│  ⏸ Phones: 0/803 queued                                   │
│  ⏸ Addresses: 0/803 queued                                │
│                                                            │
│  [Pause] [Cancel]                                         │
└──────────────────────────────────────────────────────────┘
```

### Step 5: Results & Download

```
┌──────────────────────────────────────────────────────────┐
│  ✓ Processing Complete!                                   │
│                                                            │
│  📊 Quality Metrics                                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Total Rows:        1,234                            │  │
│  │ Successfully Processed: 1,198 (97.1%)               │  │
│  │ Errors:            36 (2.9%)                        │  │
│  │                                                      │  │
│  │ By Column:                                          │  │
│  │  • Names:     1,234/1,234 (100%) ✓                 │  │
│  │  • Emails:    1,198/1,234 (97.1%) ⚠ 36 invalid     │  │
│  │  • Phones:    1,210/1,234 (98.1%) ⚠ 24 invalid     │  │
│  │  • Addresses: 1,234/1,234 (100%) ✓                 │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  [📥 Download Normalized CSV] [📊 View Details] [🔄 New] │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Data Type Detector (Week 1)
- [ ] Create `DataTypeDetector` class
- [ ] Implement header analysis
- [ ] Implement pattern matching for each type
- [ ] Add confidence scoring
- [ ] Write unit tests

### Phase 2: Unified Normalization Engine (Week 2)
- [ ] Create `UnifiedNormalizationEngine` class
- [ ] Implement routing to normalizers
- [ ] Add progress tracking
- [ ] Add error handling
- [ ] Add caching layer

### Phase 3: Smart CSV Processor (Week 3)
- [ ] Create `SmartCSVProcessor` class
- [ ] Implement CSV parsing and analysis
- [ ] Add encoding detection
- [ ] Add large file streaming
- [ ] Generate normalization strategies

### Phase 4: User Interface (Week 4)
- [ ] Create upload page
- [ ] Create column detection UI
- [ ] Create preview UI
- [ ] Create processing progress UI
- [ ] Create results/download UI

### Phase 5: Testing & Documentation (Week 5)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Write user documentation
- [ ] Create video tutorials
- [ ] Deploy to production

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Detection Speed** | <100ms per column | Header + 100 sample rows |
| **Normalization Speed** | 1,000 rows/second | Single column |
| **Multi-column Speed** | 500 rows/second | 4 columns simultaneously |
| **Memory Usage** | <500MB | For 100k rows |
| **File Size Limit** | 100MB | ~1M rows |
| **Accuracy** | >95% | Type detection confidence |

---

## Future Enhancements

### v2.1: Advanced Detection
- [ ] Machine learning-based type detection
- [ ] Multi-language support
- [ ] Custom type definitions
- [ ] Column relationship detection (e.g., first_name + last_name = full_name)

### v2.2: Data Quality
- [ ] Duplicate detection
- [ ] Data validation rules
- [ ] Anomaly detection
- [ ] Data profiling reports

### v2.3: Integrations
- [ ] API endpoints for programmatic access
- [ ] Zapier integration
- [ ] Google Sheets add-on
- [ ] Excel plugin

### v2.4: Enterprise Features
- [ ] Team collaboration
- [ ] Normalization templates
- [ ] Scheduled batch processing
- [ ] Audit logs and compliance

---

## Conclusion

The Intelligent Multi-Type Normalization Platform transforms the user experience from:

**Before:**
1. Upload CSV to Name Demo
2. Download results
3. Upload CSV to Phone Demo
4. Download results
5. Upload CSV to Email Demo
6. Download results
7. Manually merge all results

**After:**
1. Upload CSV once
2. Review auto-detected column types
3. Click "Start Processing"
4. Download complete normalized CSV

**Time Savings:** 90% reduction in user effort  
**Error Reduction:** Eliminates manual merging errors  
**User Experience:** From 7 steps to 3 clicks  

This platform positions the application as an **enterprise-grade data normalization solution** that can handle any CSV file with mixed data types automatically.
