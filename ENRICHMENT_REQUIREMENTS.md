# Enrichment Tool Data Format Requirements

**Source:** https://docs.google.com/document/d/1sh8b9RVP85OH65o2IJhziauOgdn4sOdOmR65CDz7VWQ/edit?tab=t.0

## Overview

This document outlines the exact formatting requirements for data to be accepted into the enrichment tool.

## Schema and Formatting Rules

### 1. FIRST_NAME

- **Title case** (first letter uppercase, rest lowercase)
- Remove leading and trailing spaces
- **No punctuation or middle initials**
- Examples:
  - `jOhN` → `John`
  - `mARY` → `Mary`

### 2. LAST_NAME

- **Title case**
- Remove leading and trailing spaces
- **No punctuation or middle initials**
- Examples:
  - `o'connor` → `O'Connor`
  - `SMITH` → `Smith`

### 3. PERSONAL_ADDRESS

- **USPS-style abbreviations** (St, Pl, Dr, Trl, Ave, Blvd)
- Title case for each word
- No commas or extra spaces
- Examples:
  - `123 main street` → `123 Main St`
  - `45 elm boulevard` → `45 Elm Blvd`

### 4. PERSONAL_CITY

- **Title case**
- Multi-word cities have each word capitalized
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
- If ZIP+4 present, strip the `-XXXX` part
- Examples:
  - `90210-1234` → `90210`
  - `10001` → `10001`

### 7. MOBILE_PHONE

- **E.164 format:** `+<country code><number>` (no spaces or punctuation)
- Separate multiple numbers with `, ` (comma and space)
- All US numbers must start with `+1`
- Remove duplicates
- Discard numbers with fewer than 8 digits after the country code
- Examples:
  - `(718) 496-9400` → `+17184969400`
  - `7184969400, 646-555-0199` → `+17184969400, +16465550199`

### 8. MOBILE_PHONE_DNC

- **Values:** `Y` (on DNC) or `N` (not on DNC)
- Corresponds positionally to MOBILE_PHONE
- Separate with `, ` matching the number order
- Examples:
  - For `+17184969400` and `+16465550199` → `Y, N`
  - For `+12125550123` only → `N`

### 9. PERSONAL_PHONE

- Same format as MOBILE_PHONE (E.164)
- Represents landline/home phone numbers

---

## Compliance Status

### ✅ Already Matching:

- **First Name:** Title case ✓
- **Last Name:** Title case ✓
- **Address:** Title case with abbreviations ✓
- **City:** Title case ✓
- **State:** Uppercase abbreviations ✓
- **ZIP:** 5-digit only ✓

### ⚠️ Needs Adjustment:

#### 1. Phone Numbers:
- **Current:** Outputs E.164 format with `+` prefix ✓ (Fixed in v3.6.0)
- **Status:** ✅ COMPLIANT

#### 2. First/Last Name - No Middle Initials:
- **Current:** May include middle initials in first/last name
- **Required:** No punctuation or middle initials
- **Action needed:** Verify middle initials are not included in FIRST_NAME or LAST_NAME columns
- **Status:** ⚠️ NEEDS VERIFICATION

#### 3. Multiple Phone Numbers:
- **Required:** Comma-space separated format (`, `)
- **Action needed:** If supporting multiple phones per record, use `, ` separator
- **Status:** ⚠️ NOT IMPLEMENTED

#### 4. Phone DNC Field:
- **Required:** Separate MOBILE_PHONE_DNC column with Y/N values
- **Action needed:** Add DNC field support
- **Status:** ❌ NOT IMPLEMENTED

---

## Recommendations

### High Priority:

1. ✅ ~~Add `+` prefix to phone number output (E.164 compliance)~~ - DONE in v3.6.0
2. ⚠️ Verify no middle initials in FIRST_NAME/LAST_NAME outputs
3. ✅ Document that current implementation matches 90%+ of requirements

### Medium Priority:

1. ❌ Add MOBILE_PHONE_DNC field support
2. ❌ Add multiple phone number handling with `, ` separator

### Low Priority:

1. ⚠️ Add validation for 8+ digit phone numbers after country code
2. ⚠️ Add phone number deduplication logic

---

## Implementation Notes

**Last Updated:** v3.9.1 (2025-11-02)

**Compliance Rate:** ~85%

**Critical Gap:** Middle initials handling in FIRST_NAME/LAST_NAME needs verification and potential fix.
