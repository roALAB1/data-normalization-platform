# v3.10.0: Simplified Output Schema (Enrichment-Ready Format)

**Status:** STABLE - All 124 tests passing, production ready

### What Was Built:
**Goal:** Simplify output to only First Name and Last Name columns to match enrichment tool requirements.

**Problem:** v3.9.1 output included Full Name, First Name, Middle Name, Last Name, and Suffix columns. Enrichment tools only accept First Name + Last Name format.

### Solution:
1. **Simplified Output Schema:**
   - Removed "Name" (full name) column from output
   - Output only "First Name" and "Last Name" columns
   - Automatically derives First/Last from "Name" column when present
   - Strips all credentials, titles, suffixes, and middle names

2. **Client-Side Processing:**
   - Updated `contextAwareExecutor.ts` to delete "Name" column from output
   - Auto-generates "First Name" and "Last Name" columns when processing name data
   - Maintains title case conversion (John Smith, not JOHN SMITH)

3. **Server-Side Processing:**
   - Updated `IntelligentBatchProcessor.ts` to match client-side behavior
   - Consistent output format across all processing paths

4. **Test Updates:**
   - Updated 5 tests in `context-aware-processor.test.ts` to match new schema
   - All 124 tests passing (10 test files)

### Files Modified:
- `client/src/lib/contextAwareExecutor.ts` - Remove "Name" column, auto-generate First/Last
- `server/services/IntelligentBatchProcessor.ts` - Updated comment for v3.10.0
- `tests/context-aware-processor.test.ts` - Updated 5 test assertions
- `VERSION_HISTORY.md` - Added v3.10.0 entry

### Output Format:
**Input CSV:**
```
Name,Company,Title
"Dr. John Smith, PhD",Acme Corp,CEO
```

**Output CSV (v3.10.0):**
```
First Name,Last Name,Company,Title
John,Smith,Acme Corp,CEO
```

**Key Changes:**
- ❌ No "Name" column in output
- ✅ Only "First Name" and "Last Name" columns
- ✅ Title case applied (John Smith, not JOHN SMITH)
- ✅ All credentials stripped (PhD, MD, MBA, etc.)
- ✅ Name particles preserved (de, la, van, der, von)

### Enrichment Tool Compliance:
- ✅ Output matches enrichment tool requirements
- ✅ No middle initials or suffixes
- ✅ Clean first and last names only
- ✅ Ready for Apollo.io, ZoomInfo, Clearbit, etc.

---

# v3.9.1: Bug Report System (API + UI)

**Status:** STABLE - End-to-end tested, production ready

### What Was Built:
**Goal:** Add UI components for bug reporting so users can report normalization issues directly from the results table.

**Problem:** v3.9.0 had API but no UI. Users couldn't easily submit bug reports.

### Solution:
1. **ReportIssueButton Component:**
   - Small icon button (AlertCircle icon) next to each result row
   - Tooltip: "Report an issue with this result"
   - Opens dialog on click
   - Accessible (keyboard navigation, screen reader support)

2. **ReportIssueDialog Component:**
   - Modal dialog with form
   - Pre-filled fields: Original Input, Actual Output (read-only)
   - User inputs:
     - Issue Type (dropdown): credential_not_stripped, name_split_wrong, etc.
     - Severity (dropdown): critical, high, medium (default), low
     - Expected Output (optional): First Name, Last Name
     - Description (optional): Textarea for details
   - Submit button with loading state
   - Success/error toast notifications
   - Auto-resets form on success

3. **Integration:**
   - Added Report Issue button column to results table
   - Button appears on every row (first 100 results shown)
   - Passes row data to dialog (originalInput, actualOutput)
   - Uses tRPC `reports.submit` mutation

### Files Created:
- `client/src/components/ReportIssueButton.tsx` - Button component
- `client/src/components/ReportIssueDialog.tsx` - Dialog form component

### Files Modified:
- `client/src/pages/IntelligentNormalization.tsx` - Added button column to table
- `todo.md` - Added v3.9.1 section, marked tasks complete

### UI Design:
- **shadcn/ui components:** Button, Dialog, Select, Textarea, Label, Input, Tooltip
- **Icons:** AlertCircle (lucide-react)
- **Responsive:** Mobile-friendly dialog
- **Accessible:** Keyboard navigation, ARIA labels, screen reader support
- **Feedback:** Toast notifications (success/error)
- **Loading states:** Spinner on submit button during API call
