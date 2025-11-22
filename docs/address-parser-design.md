# Enhanced Address Parser Design

## Problem Statement

Current address normalization fails to:
1. Strip secondary address components (Apt, Suite, Unit, #, Bldg, etc.)
2. Parse run-on addresses where city/state are embedded without commas
3. Handle multiple secondary address formats

## Examples of Issues

### Issue 1: Secondary Address Components Not Stripped
```
Input:  "2833 s 115th E. Ave. Apt G"
Output: "2833 S 115th E Ave Apt G"  ❌ (should be "2833 S 115th E Ave")

Input:  "301 w6th st. ste 108"
Output: "301 W6th St Ste 108"  ❌ (should be "301 W6th St")

Input:  "1421 sw 27th ave apt 402 Ocala fl"
Output: "1421 Sw 27th Ave Apt 402 Ocala Fl"  ❌ (should be "1421 SW 27th Ave")
```

### Issue 2: Run-On Addresses (City/State Embedded)
```
Input:  "815 S West St Green City MO 63545"
City:   "Green City" (not extracted)
State:  "MO" (not extracted)

Input:  "5374 Desert Shadows Dr Sierra Vista AZ 85635"
City:   "Sierra Vista" (not extracted)
State:  "AZ" (not extracted)

Input:  "11133 ellis lane parks ar 72950"
City:   "parks" (not extracted)
State:  "ar" (not extracted)
```

## Solution Design

### Part 1: Secondary Address Detection & Stripping

#### Comprehensive Pattern List

**Apartment Indicators:**
- apt, apartment, #, no, number
- Formats: "Apt 402", "apt i11", "Apartment 5", "#1124"

**Suite Indicators:**
- ste, suite, ste., sте
- Formats: "Suite 108", "Ste. 200", "ste 5"

**Unit Indicators:**
- unit, u, un
- Formats: "Unit 2", "Unit C", "u 7"

**Building Indicators:**
- bldg, building, bldg., bld
- Formats: "Bldg 3", "Building A"

**Floor Indicators:**
- fl, floor, flr, f
- Formats: "Floor 5", "5th Floor", "Fl 3"

**Room Indicators:**
- rm, room, r
- Formats: "Room 101", "Rm 5"

**Space Indicators:**
- sp, space, spc
- Formats: "Space 12", "Sp A"

**Other Indicators:**
- lot, trailer, trlr, tr
- Formats: "Lot 5", "Trailer 12"

#### Regex Pattern Strategy

```javascript
// Pattern 1: Explicit secondary address (word + number/letter)
// Matches: "Apt 402", "Suite 108", "Unit 2", "Bldg A"
const explicitPattern = /\b(apt|apartment|ste|suite|unit|bldg|building|floor|fl|flr|rm|room|sp|space|lot|trailer|trlr|tr|u|no|number)\.?\s*[a-z0-9\-]+\b/gi;

// Pattern 2: Hash/pound sign with number
// Matches: "#1124", "# 42", "#G"
const hashPattern = /#\s*[a-z0-9\-]+\b/gi;

// Pattern 3: Trailing secondary (at end of address)
// Matches: "123 Main St Apt 5", "456 Oak Ave Unit C"
const trailingPattern = /\s+(apt|apartment|ste|suite|unit|bldg|building|floor|fl|rm|room|sp|space|lot|#)\.?\s*[a-z0-9\-]+$/gi;

// Pattern 4: Embedded secondary (in middle of address)
// Matches: "123 Main St Apt 5 City State"
const embeddedPattern = /\s+(apt|apartment|ste|suite|unit|bldg|building|floor|fl|rm|room|sp|space|lot|#)\.?\s*[a-z0-9\-]+\s+/gi;
```

#### Algorithm

```
function stripSecondaryAddress(address: string): string {
  1. Apply explicitPattern - remove all explicit secondary indicators
  2. Apply hashPattern - remove hash-based unit numbers
  3. Apply trailingPattern - remove trailing secondary components
  4. Apply embeddedPattern - remove embedded secondary components
  5. Clean up extra spaces and punctuation
  6. Return cleaned address
}
```

### Part 2: Run-On Address Parsing (City/State Extraction)

#### US State Abbreviations Lookup

```javascript
const US_STATES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming'
};
```

#### City Detection Strategy

**Approach 1: State-First Detection**
1. Find state abbreviation in address (2-letter uppercase)
2. Extract words immediately before state as city name
3. Handle multi-word cities (e.g., "Green City", "Sierra Vista")

**Approach 2: ZIP-First Detection**
1. Find 5-digit ZIP code at end
2. Extract state (2 letters before ZIP)
3. Extract city (words before state)

**Approach 3: Pattern Matching**
1. Look for pattern: `[street] [city] [STATE] [ZIP]`
2. Identify street indicators (St, Ave, Rd, Blvd, Dr, Ln, etc.)
3. Everything after last street indicator = city + state + zip

#### Algorithm

```
function parseRunOnAddress(address: string): {
  street: string,
  city: string,
  state: string,
  zip: string
} {
  1. Extract ZIP code (5 digits at end)
  2. Extract state (2-letter code before ZIP or at end)
  3. Extract city:
     a. Find last street indicator (St, Ave, Rd, etc.)
     b. Text between street indicator and state = city
     c. Handle multi-word cities (2-3 words)
  4. Everything before city = street address
  5. Return parsed components
}
```

#### Examples

```javascript
// Example 1: "815 S West St Green City MO 63545"
parseRunOnAddress("815 S West St Green City MO 63545")
// → { street: "815 S West St", city: "Green City", state: "MO", zip: "63545" }

// Example 2: "5374 Desert Shadows Dr Sierra Vista AZ 85635"
parseRunOnAddress("5374 Desert Shadows Dr Sierra Vista AZ 85635")
// → { street: "5374 Desert Shadows Dr", city: "Sierra Vista", state: "AZ", zip: "85635" }

// Example 3: "11133 ellis lane parks ar 72950"
parseRunOnAddress("11133 ellis lane parks ar 72950")
// → { street: "11133 Ellis Lane", city: "Parks", state: "AR", zip: "72950" }
```

### Part 3: Integration Strategy

#### Current Code Structure

```
client/src/lib/normalizeValue.ts
  - normalizeValue() function
  - case 'address': titleCase + abbreviations

server/services/IntelligentBatchProcessor.ts
  - Similar address normalization logic
```

#### New Code Structure

```
shared/normalization/addresses/
  - AddressParser.ts (NEW)
    * stripSecondaryAddress()
    * parseRunOnAddress()
    * normalizeAddress() (combines both)
  
  - constants.ts (NEW)
    * US_STATES lookup
    * STREET_SUFFIXES
    * SECONDARY_ADDRESS_INDICATORS
    
  - types.ts (NEW)
    * ParsedAddress interface
    * AddressComponents interface
```

#### Integration Points

1. **Client-side (normalizeValue.ts)**
   ```typescript
   case 'address': {
     const parsed = parseRunOnAddress(value);
     const cleanStreet = stripSecondaryAddress(parsed.street);
     return titleCase(cleanStreet);
   }
   ```

2. **Server-side (IntelligentBatchProcessor.ts)**
   ```typescript
   // Same logic as client-side
   ```

3. **Location splitting (existing feature)**
   ```typescript
   case 'location': {
     const parsed = parseRunOnAddress(value);
     return {
       city: titleCase(parsed.city),
       state: parsed.state.toUpperCase()
     };
   }
   ```

## Testing Strategy

### Test Cases

#### Secondary Address Stripping
```javascript
[
  { input: "2833 s 115th E. Ave. Apt G", expected: "2833 S 115th E Ave" },
  { input: "301 w6th st. ste 108", expected: "301 W6th St" },
  { input: "1421 sw 27th ave apt 402", expected: "1421 SW 27th Ave" },
  { input: "4929 York St#1124", expected: "4929 York St" },
  { input: "1874 Pepper Valley Ln #2", expected: "1874 Pepper Valley Ln" },
  { input: "626 s cedar st unit c", expected: "626 S Cedar St" },
  { input: "4801 Sugar Hill Rd SE apt b", expected: "4801 Sugar Hill Rd SE" },
  { input: "3883 Tara Ave Unit 7", expected: "3883 Tara Ave" },
  { input: "4470 Vegas Valley #17", expected: "4470 Vegas Valley" },
  { input: "8 Merrimack Street Apt 35", expected: "8 Merrimack Street" }
]
```

#### Run-On Address Parsing
```javascript
[
  {
    input: "815 S West St Green City MO 63545",
    expected: { street: "815 S West St", city: "Green City", state: "MO", zip: "63545" }
  },
  {
    input: "5374 Desert Shadows Dr Sierra Vista AZ 85635",
    expected: { street: "5374 Desert Shadows Dr", city: "Sierra Vista", state: "AZ", zip: "85635" }
  },
  {
    input: "11133 ellis lane parks ar 72950",
    expected: { street: "11133 Ellis Lane", city: "Parks", state: "AR", zip: "72950" }
  },
  {
    input: "228 wedgwood court. vallejo CA",
    expected: { street: "228 Wedgwood Court", city: "Vallejo", state: "CA", zip: "" }
  }
]
```

### Test Execution Plan

1. Create unit tests for stripSecondaryAddress()
2. Create unit tests for parseRunOnAddress()
3. Test with full CSV files (1900 + 1102 rows)
4. Generate before/after comparison report
5. Verify no regressions in existing address parsing

## Performance Considerations

- Regex operations: ~0.1ms per address
- State lookup: O(1) hash map
- Total overhead: <1ms per address
- For 3000 rows: ~3 seconds additional processing time
- Acceptable for both client and server processing

## Edge Cases

1. **Multiple secondary addresses**: "123 Main St Apt 5 Unit C"
   - Strip all secondary components

2. **City names with state abbreviations**: "123 Main St CA City CA"
   - Use rightmost state match

3. **No state/ZIP in run-on**: "123 Main St Some City"
   - Return as-is, no parsing

4. **Foreign addresses**: "123 Main St London UK"
   - Skip parsing (US-only)

5. **PO Boxes**: "PO Box 123"
   - No secondary stripping needed

## Implementation Priority

1. **High Priority**: Secondary address stripping (affects 200+ rows)
2. **High Priority**: Run-on address parsing (affects 50+ rows)
3. **Medium Priority**: Edge case handling
4. **Low Priority**: Performance optimization

## Success Criteria

- ✅ 95%+ of secondary addresses stripped correctly
- ✅ 90%+ of run-on addresses parsed correctly
- ✅ No regressions in existing address normalization
- ✅ <5ms processing time per address
- ✅ Works for both client and server processing
