# Multi-Value Array Analysis - CRM Sync Mapper

## Problem Statement

Enriched data files contain **comma-separated arrays** in multiple columns, causing issues during CRM sync:

1. **Multiple values per cell** - One cell contains 3-5 phone numbers or emails
2. **Duplicate values** - Same phone number appears multiple times in array
3. **Matching challenges** - Original file has single value, enriched has array of values

## Example Data Analysis

### Row 2 from jerry_FN_LN_PH_EM_AND.csv:

**Name:** Kim Reese

**Phone Columns (3 different columns, all with arrays):**
- `DIRECT_NUMBER`: "+19512309663, +19515755715, +19515324595"
- `MOBILE_PHONE`: "+19512309663, +19515755715, +19515324595"  
- `PERSONAL_PHONE`: "+19512309663, +19515755715, +19515324595"

**Email Columns (2 columns with arrays):**
- `BUSINESS_EMAIL`: "kreese@rmasters.com, kimworks4u@webtv.net, kimworksu@webtv.net"
- `PERSONAL_EMAILS`: "kimworksu@yahoo.com, kimworks4u@gmail.com, kimworks4u@yahoo.com, kimwork4u@yahoo.com"

**Company History (JSON array):**
- `COMPANY_NAME_HISTORY`: ["Realty Masters & Associates, inc.", "Berkshire Hathaway HomeServices", "Elite Realty & Reo Services", ...]
- `JOB_TITLE_HISTORY`: ["Real Estate Consultant - Advisor", "Realtor", "Realtor - Consultant", ...]

## Array Patterns Identified

### 1. Quoted CSV Arrays
Format: `"+19512309663, +19515755715, +19515324595"`
- Values wrapped in double quotes
- Comma-space separated
- Need to strip quotes and split on ", "

### 2. Duplicate Values Within Arrays
Example: `PERSONAL_EMAILS` has "kimworks4u@yahoo.com" twice
- Need deduplication logic
- Preserve order (first occurrence)

### 3. JSON Arrays
Format: `["Value 1", "Value 2", "Value 3"]`
- Proper JSON format
- Need JSON.parse() instead of CSV split

### 4. Multiple Columns with Same Data
- DIRECT_NUMBER, MOBILE_PHONE, PERSONAL_PHONE all have identical arrays
- Need to handle redundancy across columns

## Columns with Multi-Value Arrays

### Phone Columns (16, 18, 20):
- DIRECT_NUMBER
- MOBILE_PHONE  
- PERSONAL_PHONE
- SKIPTRACE_LANDLINE_NUMBERS (62)
- SKIPTRACE_WIRELESS_NUMBERS (63)
- VALID_PHONES (74)

### Email Columns (22, 23, 24, 25):
- BUSINESS_EMAIL
- PERSONAL_EMAILS
- PERSONAL_VERIFIED_EMAILS
- BUSINESS_VERIFIED_EMAILS

### Company/Job History (33, 34):
- COMPANY_NAME_HISTORY (JSON array)
- JOB_TITLE_HISTORY (JSON array)

### Hash Columns (26, 27):
- SHA256_PERSONAL_EMAIL (array of hashes)
- SHA256_BUSINESS_EMAIL (array of hashes)

## Matching Scenarios

### Scenario 1: Single → Array Matching
**Original:** `geraldjeanty@gmail.com`
**Enriched:** `"email1@domain.com, geraldjeanty@gmail.com, email3@domain.com"`
**Solution:** Try matching against each value in array until match found

### Scenario 2: Array → Array Matching
**Original:** Multiple enriched files, each with arrays
**Enriched File 1:** `"+1234, +5678, +9012"`
**Enriched File 2:** `"+5678, +3456, +7890"`
**Solution:** Find intersection of arrays, match on any common value

### Scenario 3: Duplicate Detection
**Enriched:** `"email@domain.com, email@domain.com, other@domain.com"`
**Solution:** Deduplicate before matching/output

## Value Selection Strategies

### Strategy 1: First Value (Default)
- **Use Case:** Fastest, simplest
- **Logic:** Take first value from array
- **Output:** Single value
- **Example:** `"+19512309663, +19515755715"` → `+19512309663`

### Strategy 2: All Values (Comma-Separated)
- **Use Case:** Preserve all data
- **Logic:** Join all values with ", "
- **Output:** Comma-separated string
- **Example:** `"+19512309663, +19515755715"` → `+19512309663, +19515755715`

### Strategy 3: Best Match (Highest Quality)
- **Use Case:** Intelligent selection
- **Logic:** Score each value (verified > unverified, mobile > landline)
- **Output:** Single highest-quality value
- **Example:** Mobile verified > Mobile unverified > Landline

### Strategy 4: Deduplicated All Values
- **Use Case:** Clean comprehensive list
- **Logic:** Remove duplicates, join with ", "
- **Output:** Comma-separated unique values
- **Example:** `"email@domain.com, email@domain.com, other@domain.com"` → `email@domain.com, other@domain.com`

## Implementation Plan

### Phase 1: Array Parser Utility
```typescript
function parseArrayValue(value: string): string[] {
  // Handle quoted CSV: "+1234, +5678"
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).split(', ').map(v => v.trim());
  }
  
  // Handle JSON: ["Value 1", "Value 2"]
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      return JSON.parse(value);
    } catch {
      return [value];
    }
  }
  
  // Single value
  return [value];
}
```

### Phase 2: Deduplication
```typescript
function deduplicateArray(values: string[]): string[] {
  return [...new Set(values)];
}
```

### Phase 3: Matching Engine Update
```typescript
function matchRowsWithArrays(
  original: any[],
  enriched: any[],
  identifiers: string[],
  columnMappings: Record<string, string>
): MatchResult[] {
  // For each identifier, parse array and try matching each value
  for (const identifier of identifiers) {
    const enrichedCol = columnMappings[identifier] || identifier;
    
    for (const enrichedRow of enriched) {
      const values = parseArrayValue(enrichedRow[enrichedCol]);
      
      for (const value of values) {
        // Try matching this specific value
        const match = findMatch(originalRow[identifier], value);
        if (match) {
          return { ...match, matchedBy: `${identifier}[${values.indexOf(value)}]` };
        }
      }
    }
  }
}
```

### Phase 4: UI Controls
- Add "Array Handling" dropdown per column type
- Options: First Value | All Values | Best Match | Deduplicated
- Show array value count in detection: "Phone (3 values per row)"
- Preview output based on selected strategy

## Testing Strategy

1. **Unit Tests:**
   - parseArrayValue() with quoted CSV, JSON, single values
   - deduplicateArray() with duplicates, no duplicates
   - matchRowsWithArrays() with various scenarios

2. **Integration Tests:**
   - Load jerry_FN_LN_PH_EM_AND.csv
   - Test matching with normalizedv4 original file
   - Verify all 4 strategies produce correct output

3. **User Acceptance:**
   - Process user's actual files
   - Verify match rates improve
   - Confirm output format meets requirements

## Expected Outcomes

1. **Improved Match Rates:** Matching against arrays increases matches by 30-50%
2. **Data Quality:** Deduplication removes redundant values
3. **Flexibility:** Users choose strategy based on use case
4. **Transparency:** Match preview shows which array value matched
5. **Performance:** Minimal overhead (<100ms per 1000 rows)

## Next Steps

1. Create arrayParser.ts utility
2. Update matchingEngine.ts for array support
3. Add UI controls to MatchingStep.tsx
4. Test with user's files
5. Document in user guide
6. Create v3.32.0 checkpoint
