# Enrichment Template Schema

**Source:** https://docs.google.com/spreadsheets/d/1ArE5LvTKZ0aZMKFuAU4qGSGbsEYuccNgYAU4mnRPO0I/edit?gid=377777187#gid=377777187

## Required Output Columns (in order)

| Column | Header Name | Format | Notes |
|--------|-------------|--------|-------|
| A | `FIRST_NAME` | Title Case | No middle initials, no credentials |
| B | `LAST_NAME` | Title Case | No middle initials, no credentials |
| C | `PERSONAL_ADDRESS` | Title Case | Street address only |
| D | `PERSONAL_CITY` | Title Case | City name |
| E | `PERSONAL_STATE` | 2-letter code | State abbreviation (e.g., NC, CA) |
| F | `PERSONAL_ZIP` | String | ZIP code |
| G | `MOBILE_PH` | Digits only | Mobile phone number |

## Key Differences from Current Implementation

### Column Names
- **Current:** "First Name", "Last Name", "Personal City", "Personal State"
- **Required:** `FIRST_NAME`, `LAST_NAME`, `PERSONAL_CITY`, `PERSONAL_STATE`
- **Format:** UPPERCASE with UNDERSCORES (not Title Case with spaces)

### Location Handling
- **Current:** Outputs "Personal City" and "Personal State" (Title Case)
- **Required:** `PERSONAL_CITY` and `PERSONAL_STATE` (UPPERCASE_UNDERSCORE)

### Address Handling
- **Current:** Outputs "Address"
- **Required:** `PERSONAL_ADDRESS`

### Phone Handling
- **Current:** Outputs "Phone"
- **Required:** `MOBILE_PH`

## Impact on v3.13.4 Fixes

The current implementation outputs:
```
Name,First Name,Last Name,Company,Title,Location
```

The enrichment tool expects:
```
FIRST_NAME,LAST_NAME,PERSONAL_ADDRESS,PERSONAL_CITY,PERSONAL_STATE,PERSONAL_ZIP,MOBILE_PH
```

**Critical Changes Needed:**
1. Change all output column names to UPPERCASE_UNDERSCORE format
2. Split Location into PERSONAL_CITY + PERSONAL_STATE (not "Personal City" + "Personal State")
3. Rename Address → PERSONAL_ADDRESS
4. Rename Phone → MOBILE_PH
5. Remove "Name" column from output (already done in v3.10.0)
6. Ensure PERSONAL_STATE outputs 2-letter abbreviation (NC, not "North Carolina")
