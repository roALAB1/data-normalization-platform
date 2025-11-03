# Enrichment Tool Data Format Requirements

## Key Requirements for Hero Section

### 1. FIRST_NAME
- **Title case** (first letter uppercase, rest lowercase)
- **Remove leading and trailing spaces**
- **No punctuation or middle initials**
- Examples:
  - `jOhN` → `John`
  - `mARY` → `Mary`

### 2. LAST_NAME
- **Title case**
- **Remove leading and trailing spaces**
- **No punctuation or middle initials**
- Examples:
  - `o'connor` → `O'Connor`
  - `SMITH` → `Smith`

### 3. PERSONAL_ADDRESS
- **USPS-style abbreviations** (St, Pl, Dr, Trl, Ave, Blvd)
- **Title case for each word**
- **No commas or extra spaces**
- Examples:
  - `123 main street` → `123 Main St`
  - `45 elm boulevard` → `45 Elm Blvd`

### 4. PERSONAL_CITY
- **Title case**
- **Multi-word cities have each word capitalized**
- Examples:
  - `los angeles` → `Los Angeles`
  - `new york` → `New York`

### 5. PERSONAL_STATE
- **Two-letter USPS abbreviation in uppercase**
- Examples:
  - `California` → `CA`
  - `tx` → `TX`

### 6. PERSONAL_ZIP
- **5-digit ZIP code only**
- **If ZIP+4 present, strip the -XXXX part**
- Examples:
  - `90210-1234` → `90210`
  - `10001` → `10001`

### 7. MOBILE_PHONE
- **E.164 format**: `+<country code><number>` (no spaces or punctuation)
- **Separate multiple numbers with `, ` (comma and space)**
- **All US numbers must start with +1**
- **Remove duplicates**
- **Discard numbers with fewer than 8 digits after the country code**
- Examples:
  - `(718) 496-9400` → `+17184969400`
  - `7184969400, 646-555-0199` → `+17184969400, +16465550199`

### 8. MOBILE_PHONE_DNC
- **Values**: `Y` (on DNC) or `N` (not on DNC)
- **Corresponds positionally to MOBILE_PHONE**
- **Separate with `, ` matching the number order**
- Examples:
  - For `+17184969400` and `+16465550199` → `Y, N`
  - For `+12125550123` only → `N`

### 9. PERSONAL_PHONE
- **Same format as MOBILE_PHONE (E.164)**
- **Represents landline/home phone numbers**
