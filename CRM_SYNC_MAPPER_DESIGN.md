# CRM Sync Mapper - Detailed Design Document

Version: v3.25.0 (Planned)

## 🎯 Problem Statement

Users export data from their CRM, normalize it, then enrich it using multiple match strategies. Each enrichment strategy produces a separate file with varying match rates. The challenge is intelligently merging these multiple enriched files back to the original CRM export structure for seamless re-import.

### Real-World Example

**Original CRM Export** (`crm_export.csv`):
```
ID, First, Last, Email, Phone, Company
1, John, Doe, john@old.com, 555-1234, Acme Inc
2, Jane, Smith, jane@example.com, 555-5678, Tech Corp
```

**Enrichment Strategy 1** - Match on First+Last+Phone (`enriched_phone.csv`):
```
Email, Email_Verified, Email_Deliverable
john@old.com, true, true
(Only 1 match - Jane's phone didn't match)
```

**Enrichment Strategy 2** - Match on First+Last+Email (`enriched_email.csv`):
```
Email, Phone_Type, Phone_Carrier, LinkedIn_URL
jane@example.com, mobile, Verizon, linkedin.com/jane
(Only 1 match - John's email didn't match)
```

**Desired Output** (`merged_output.csv`):
```
ID, First, Last, Email, Phone, Company, Email_Verified, Phone_Type, LinkedIn_URL
1, John, Doe, john@old.com, 555-1234, Acme Inc, true, , 
2, Jane, Smith, jane@example.com, 555-5678, Tech Corp, , mobile, linkedin.com/jane
```

---

## 🏗️ Architecture

### Data Flow

```
┌─────────────────────┐
│ Original CRM Export │ (Source of Truth)
│ 1,000 rows          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Enriched Files (Multiple)               │
│ ┌─────────────┐  ┌─────────────┐       │
│ │ File 1      │  │ File 2      │       │
│ │ 950 matches │  │ 800 matches │       │
│ │ (Name+Phone)│  │ (Name+Email)│       │
│ └─────────────┘  └─────────────┘       │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Intelligent Matcher │
│ - Auto-detect ID    │
│ - Fuzzy matching    │
│ - Conflict detect   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Conflict Resolver   │
│ - Keep original     │
│ - Replace           │
│ - Create alternates │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Column Organizer    │
│ - Select fields     │
│ - Order columns     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Merged Output CSV   │
│ 1,000 rows          │
│ Original + Enriched │
└─────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. File Upload & Parsing

**Component**: `FileUploadSection.tsx`

**Features**:
- Drag-and-drop for original CRM export (single file)
- Multi-file upload for enriched files (with "Add Another File" button)
- CSV parsing with Papa Parse
- File validation (check for required columns)
- Display file statistics

**Data Structure**:
```typescript
interface UploadedFile {
  id: string;
  name: string;
  type: 'original' | 'enriched';
  rowCount: number;
  columns: string[];
  data: Record<string, any>[];
  matchFields?: string[]; // Optional: fields used for enrichment
  uploadedAt: Date;
}

interface FileStats {
  totalRows: number;
  totalColumns: number;
  sampleRows: Record<string, any>[];
}
```

**UI**:
```tsx
<div className="space-y-6">
  {/* Original CRM Export */}
  <Card>
    <CardHeader>
      <CardTitle>Original CRM Export</CardTitle>
      <CardDescription>
        Upload your original CRM export file (source of truth for row order)
      </CardDescription>
    </CardHeader>
    <CardContent>
      <FileDropzone
        onUpload={handleOriginalUpload}
        accept=".csv"
        maxFiles={1}
      />
      {originalFile && (
        <FilePreview
          file={originalFile}
          stats={originalStats}
        />
      )}
    </CardContent>
  </Card>

  {/* Enriched Files */}
  <Card>
    <CardHeader>
      <CardTitle>Enriched Files</CardTitle>
      <CardDescription>
        Upload one or more enriched files from your enrichment platform
      </CardDescription>
    </CardHeader>
    <CardContent>
      {enrichedFiles.map((file, index) => (
        <EnrichedFileCard
          key={file.id}
          file={file}
          index={index}
          onRemove={() => removeEnrichedFile(file.id)}
          onUpdateMatchFields={(fields) => updateMatchFields(file.id, fields)}
        />
      ))}
      <Button onClick={addEnrichedFile}>
        <Plus className="mr-2" />
        Add Another Enriched File
      </Button>
    </CardContent>
  </Card>
</div>
```

**Match Fields Tracking**:
```tsx
<div className="mt-4">
  <Label>Enrichment Match Fields (Optional)</Label>
  <p className="text-sm text-muted-foreground mb-2">
    Which fields were used to match this enrichment?
  </p>
  <div className="flex flex-wrap gap-2">
    {['First Name', 'Last Name', 'Email', 'Phone', 'Company'].map(field => (
      <Checkbox
        key={field}
        label={field}
        checked={file.matchFields?.includes(field)}
        onChange={(checked) => toggleMatchField(file.id, field, checked)}
      />
    ))}
  </div>
</div>
```

---

### 2. Intelligent Matching Algorithm

**Component**: `MatchingEngine.ts`

**Auto-Detection Priority**:
1. **Email** (highest priority - unique, reliable)
2. **Phone** (good if normalized)
3. **ID/Customer_ID** (perfect if exists)
4. **Name + ZIP** (fallback for duplicates)

**Algorithm**:
```typescript
interface MatchResult {
  originalRowIndex: number;
  enrichedRowIndex: number;
  confidence: number; // 0-100
  identifier: string; // value used for matching
}

function autoDetectIdentifier(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[]
): string {
  const columns = Object.keys(originalData[0]);
  
  // Priority 1: Email
  const emailCol = columns.find(col => 
    /email/i.test(col) && hasUniqueValues(originalData, col)
  );
  if (emailCol) return emailCol;
  
  // Priority 2: Phone
  const phoneCol = columns.find(col => 
    /phone/i.test(col) && hasUniqueValues(originalData, col)
  );
  if (phoneCol) return phoneCol;
  
  // Priority 3: ID
  const idCol = columns.find(col => 
    /id|customer/i.test(col) && hasUniqueValues(originalData, col)
  );
  if (idCol) return idCol;
  
  // Priority 4: Composite (Name + ZIP)
  const hasName = columns.some(col => /name/i.test(col));
  const hasZip = columns.some(col => /zip|postal/i.test(col));
  if (hasName && hasZip) return 'name+zip';
  
  return columns[0]; // Fallback to first column
}

function matchRows(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  identifierColumn: string
): MatchResult[] {
  const matches: MatchResult[] = [];
  const enrichedMap = new Map<string, number>();
  
  // Build lookup map from enriched data
  enrichedData.forEach((row, index) => {
    const key = normalizeIdentifier(row[identifierColumn]);
    if (key) {
      enrichedMap.set(key, index);
    }
  });
  
  // Match original rows to enriched rows
  originalData.forEach((row, originalIndex) => {
    const key = normalizeIdentifier(row[identifierColumn]);
    if (key && enrichedMap.has(key)) {
      matches.push({
        originalRowIndex: originalIndex,
        enrichedRowIndex: enrichedMap.get(key)!,
        confidence: 100,
        identifier: key
      });
    }
  });
  
  return matches;
}

function normalizeIdentifier(value: any): string {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function hasUniqueValues(data: Record<string, any>[], column: string): boolean {
  const values = data.map(row => row[column]).filter(Boolean);
  return new Set(values).size === values.length;
}
```

**Match Statistics**:
```typescript
interface MatchStats {
  totalOriginalRows: number;
  totalEnrichedRows: number;
  matchedCount: number;
  unmatchedCount: number;
  matchRate: number; // percentage
  duplicateMatches: number;
}

function calculateMatchStats(
  originalData: Record<string, any>[],
  matches: MatchResult[]
): MatchStats {
  return {
    totalOriginalRows: originalData.length,
    totalEnrichedRows: matches.length,
    matchedCount: matches.length,
    unmatchedCount: originalData.length - matches.length,
    matchRate: (matches.length / originalData.length) * 100,
    duplicateMatches: 0 // TODO: detect duplicates
  };
}
```

---

### 3. Conflict Resolution

**Component**: `ConflictResolver.tsx`

**Conflict Detection**:
```typescript
interface Conflict {
  rowIndex: number;
  column: string;
  originalValue: any;
  enrichedValue: any;
  enrichedFileId: string;
}

function detectConflicts(
  originalData: Record<string, any>[],
  enrichedData: Record<string, any>[],
  matches: MatchResult[],
  enrichedFileId: string
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  matches.forEach(match => {
    const originalRow = originalData[match.originalRowIndex];
    const enrichedRow = enrichedData[match.enrichedRowIndex];
    
    // Check each column for conflicts
    Object.keys(enrichedRow).forEach(column => {
      if (column in originalRow) {
        const originalValue = normalizeValue(originalRow[column]);
        const enrichedValue = normalizeValue(enrichedRow[column]);
        
        if (originalValue && enrichedValue && originalValue !== enrichedValue) {
          conflicts.push({
            rowIndex: match.originalRowIndex,
            column,
            originalValue: originalRow[column],
            enrichedValue: enrichedRow[column],
            enrichedFileId
          });
        }
      }
    });
  });
  
  return conflicts;
}
```

**Resolution Strategies**:
```typescript
type ResolutionStrategy = 
  | 'keep_original'     // Ignore enriched value
  | 'replace'           // Overwrite with enriched value
  | 'create_alternate'  // Add as Email_Alt, Phone_Alt
  | 'manual_review';    // User decides per conflict

interface ResolutionConfig {
  defaultStrategy: ResolutionStrategy;
  columnStrategies: Record<string, ResolutionStrategy>; // Per-column overrides
  alternateFieldSuffix: string; // "_Alt" or "_Secondary"
}

function resolveConflicts(
  originalData: Record<string, any>[],
  conflicts: Conflict[],
  config: ResolutionConfig
): Record<string, any>[] {
  const resolvedData = JSON.parse(JSON.stringify(originalData)); // Deep clone
  
  conflicts.forEach(conflict => {
    const strategy = config.columnStrategies[conflict.column] || config.defaultStrategy;
    const row = resolvedData[conflict.rowIndex];
    
    switch (strategy) {
      case 'keep_original':
        // Do nothing
        break;
        
      case 'replace':
        row[conflict.column] = conflict.enrichedValue;
        break;
        
      case 'create_alternate':
        const altColumn = `${conflict.column}${config.alternateFieldSuffix}`;
        row[altColumn] = conflict.enrichedValue;
        break;
        
      case 'manual_review':
        // Mark for user review
        row[`${conflict.column}_CONFLICT`] = {
          original: conflict.originalValue,
          enriched: conflict.enrichedValue
        };
        break;
    }
  });
  
  return resolvedData;
}
```

**UI for Conflict Resolution**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Conflict Resolution</CardTitle>
    <CardDescription>
      {conflicts.length} conflicts detected where enriched values differ from original
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Global Strategy */}
      <div>
        <Label>Default Resolution Strategy</Label>
        <Select value={defaultStrategy} onValueChange={setDefaultStrategy}>
          <SelectItem value="keep_original">Keep Original Value</SelectItem>
          <SelectItem value="replace">Replace with Enriched Value</SelectItem>
          <SelectItem value="create_alternate">Create Alternate Field</SelectItem>
          <SelectItem value="manual_review">Manual Review</SelectItem>
        </Select>
      </div>
      
      {/* Per-Column Overrides */}
      <div>
        <Label>Column-Specific Strategies</Label>
        {uniqueConflictColumns.map(column => (
          <div key={column} className="flex items-center gap-4 mt-2">
            <span className="w-32">{column}</span>
            <Select
              value={columnStrategies[column] || defaultStrategy}
              onValueChange={(value) => setColumnStrategy(column, value)}
            >
              <SelectItem value="keep_original">Keep Original</SelectItem>
              <SelectItem value="replace">Replace</SelectItem>
              <SelectItem value="create_alternate">Create Alternate</SelectItem>
            </Select>
          </div>
        ))}
      </div>
      
      {/* Conflict Preview */}
      {defaultStrategy === 'manual_review' && (
        <ConflictReviewTable
          conflicts={conflicts}
          onResolve={handleManualResolve}
        />
      )}
    </div>
  </CardContent>
</Card>
```

---

### 4. Multi-Value Field Handling

**For fields like Email and Phone that can have multiple values**:

**Option 1: Comma-Separated** (CRM-friendly)
```
Email: john@old.com, john@new.com, john@work.com
Phone: 555-1234, 555-5678
```

**Option 2: Separate Columns** (More structured)
```
Email_Primary: john@old.com
Email_Secondary: john@new.com
Email_Tertiary: john@work.com
```

**Implementation**:
```typescript
function handleMultiValueField(
  originalValue: string,
  enrichedValue: string,
  strategy: 'comma_separated' | 'separate_columns'
): Record<string, string> {
  if (strategy === 'comma_separated') {
    // Combine into single field
    const values = [originalValue, enrichedValue].filter(Boolean);
    return { value: values.join(', ') };
  } else {
    // Create separate columns
    return {
      primary: originalValue,
      secondary: enrichedValue
    };
  }
}
```

---

### 5. Column Ordering & Selection

**Component**: `ColumnOrganizer.tsx`

**Features**:
- Checkbox selection for enriched columns
- Three ordering modes:
  1. Append at end (default)
  2. Insert next to related (Email_Verified next to Email)
  3. Custom drag-and-drop

**Data Structure**:
```typescript
interface ColumnConfig {
  name: string;
  source: 'original' | 'enriched';
  enrichedFileId?: string;
  selected: boolean;
  position: number; // For custom ordering
  relatedTo?: string; // For "insert next to" mode
}
```

**Smart Column Grouping**:
```typescript
function groupRelatedColumns(columns: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  
  columns.forEach(col => {
    // Extract base name (Email_Verified → Email)
    const base = col.replace(/_verified|_deliverable|_type|_carrier|_alt/i, '');
    if (!groups[base]) groups[base] = [];
    groups[base].push(col);
  });
  
  return groups;
}

function insertNextToRelated(
  originalColumns: string[],
  enrichedColumns: string[]
): string[] {
  const result = [...originalColumns];
  const groups = groupRelatedColumns(enrichedColumns);
  
  Object.entries(groups).forEach(([base, related]) => {
    const baseIndex = result.findIndex(col => 
      col.toLowerCase().includes(base.toLowerCase())
    );
    
    if (baseIndex !== -1) {
      // Insert related columns after base column
      result.splice(baseIndex + 1, 0, ...related);
    } else {
      // Append at end if no related column found
      result.push(...related);
    }
  });
  
  return result;
}
```

**UI**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Column Selection & Ordering</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Ordering Mode */}
    <div className="mb-4">
      <Label>Column Ordering</Label>
      <RadioGroup value={orderingMode} onValueChange={setOrderingMode}>
        <RadioGroupItem value="append">Append at End</RadioGroupItem>
        <RadioGroupItem value="insert_related">Insert Next to Related</RadioGroupItem>
        <RadioGroupItem value="custom">Custom Order (Drag & Drop)</RadioGroupItem>
      </RadioGroup>
    </div>
    
    {/* Column Selection */}
    <div>
      <Label>Select Columns to Include</Label>
      
      {/* Original Columns (always included) */}
      <div className="mt-2">
        <h4 className="font-medium">Original Columns (Always Included)</h4>
        {originalColumns.map(col => (
          <div key={col} className="flex items-center gap-2 mt-1">
            <Checkbox checked disabled />
            <span>{col}</span>
          </div>
        ))}
      </div>
      
      {/* Enriched Columns (selectable) */}
      <div className="mt-4">
        <h4 className="font-medium">Enriched Columns (Select to Add)</h4>
        {enrichedColumns.map(col => (
          <div key={col} className="flex items-center gap-2 mt-1">
            <Checkbox
              checked={selectedColumns.includes(col)}
              onCheckedChange={(checked) => toggleColumn(col, checked)}
            />
            <span>{col}</span>
            <Badge variant="secondary">{getColumnSource(col)}</Badge>
          </div>
        ))}
      </div>
    </div>
    
    {/* Custom Ordering (if enabled) */}
    {orderingMode === 'custom' && (
      <DragDropColumnList
        columns={allColumns}
        onReorder={handleReorder}
      />
    )}
    
    {/* Preview */}
    <div className="mt-6">
      <Label>Output Preview (First 5 Rows)</Label>
      <Table>
        <TableHeader>
          <TableRow>
            {finalColumnOrder.map(col => (
              <TableHead key={col}>{col}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {previewData.slice(0, 5).map((row, i) => (
            <TableRow key={i}>
              {finalColumnOrder.map(col => (
                <TableCell key={col}>{row[col]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>
```

---

### 6. Output Generation

**Component**: `OutputGenerator.ts`

**Merge Algorithm**:
```typescript
function generateMergedOutput(
  originalData: Record<string, any>[],
  enrichedFiles: UploadedFile[],
  matches: Map<string, MatchResult[]>, // fileId → matches
  columnConfig: ColumnConfig[],
  resolutionConfig: ResolutionConfig
): Record<string, any>[] {
  // Start with original data (preserves row order)
  const output = JSON.parse(JSON.stringify(originalData));
  
  // Process each enriched file
  enrichedFiles.forEach(file => {
    const fileMatches = matches.get(file.id) || [];
    
    fileMatches.forEach(match => {
      const originalRow = output[match.originalRowIndex];
      const enrichedRow = file.data[match.enrichedRowIndex];
      
      // Add selected enriched columns
      columnConfig
        .filter(col => col.selected && col.enrichedFileId === file.id)
        .forEach(col => {
          const value = enrichedRow[col.name];
          
          // Check for conflicts
          if (col.name in originalRow && originalRow[col.name] !== value) {
            // Apply resolution strategy
            applyResolutionStrategy(
              originalRow,
              col.name,
              value,
              resolutionConfig
            );
          } else {
            // No conflict, just add the value
            originalRow[col.name] = value;
          }
        });
    });
  });
  
  // Reorder columns according to user preference
  return reorderColumns(output, columnConfig);
}

function reorderColumns(
  data: Record<string, any>[],
  columnConfig: ColumnConfig[]
): Record<string, any>[] {
  const orderedColumns = columnConfig
    .sort((a, b) => a.position - b.position)
    .map(col => col.name);
  
  return data.map(row => {
    const orderedRow: Record<string, any> = {};
    orderedColumns.forEach(col => {
      orderedRow[col] = row[col];
    });
    return orderedRow;
  });
}
```

**CSV Export**:
```typescript
import Papa from 'papaparse';

function exportToCSV(
  data: Record<string, any>[],
  filename: string = 'merged_output.csv'
): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}
```

---

## 🎨 Complete UI Flow

### Step 1: Upload Files
```
┌────────────────────────────────────────────┐
│ CRM Sync Mapper                            │
├────────────────────────────────────────────┤
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Original CRM Export                    │ │
│ │ [Drag & Drop or Click to Upload]      │ │
│ │                                        │ │
│ │ ✓ crm_export.csv                      │ │
│ │   1,000 rows • 8 columns              │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Enriched Files                         │ │
│ │                                        │ │
│ │ ✓ enriched_phone.csv                  │ │
│ │   950 rows • 5 columns                │ │
│ │   Match fields: First, Last, Phone    │ │
│ │   [Remove]                            │ │
│ │                                        │ │
│ │ ✓ enriched_email.csv                  │ │
│ │   800 rows • 6 columns                │ │
│ │   Match fields: First, Last, Email    │ │
│ │   [Remove]                            │ │
│ │                                        │ │
│ │ [+ Add Another Enriched File]         │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ [Continue to Matching →]                  │
└────────────────────────────────────────────┘
```

### Step 2: Configure Matching
```
┌────────────────────────────────────────────┐
│ Matching Configuration                     │
├────────────────────────────────────────────┤
│                                            │
│ Identifier Column (Auto-detected: Email)   │
│ ┌────────────────────────────────────────┐ │
│ │ ● Email (Recommended - 95% unique)    │ │
│ │ ○ Phone                                │ │
│ │ ○ ID                                   │ │
│ │ ○ Custom Combination                   │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Match Results:                             │
│ ┌────────────────────────────────────────┐ │
│ │ File 1 (enriched_phone.csv)           │ │
│ │ ✓ 950 matched (95%)                   │ │
│ │ ⚠ 50 unmatched (5%)                   │ │
│ │ [View Unmatched Rows]                 │ │
│ │                                        │ │
│ │ File 2 (enriched_email.csv)           │ │
│ │ ✓ 800 matched (80%)                   │ │
│ │ ⚠ 200 unmatched (20%)                 │ │
│ │ [View Unmatched Rows]                 │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ [← Back] [Continue to Conflicts →]        │
└────────────────────────────────────────────┘
```

### Step 3: Resolve Conflicts
```
┌────────────────────────────────────────────┐
│ Conflict Resolution                        │
├────────────────────────────────────────────┤
│                                            │
│ 23 conflicts detected                      │
│                                            │
│ Default Strategy:                          │
│ ┌────────────────────────────────────────┐ │
│ │ ● Create Alternate Field              │ │
│ │ ○ Replace with Enriched Value         │ │
│ │ ○ Keep Original Value                 │ │
│ │ ○ Manual Review                       │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Column-Specific Strategies:                │
│ ┌────────────────────────────────────────┐ │
│ │ Email:    [Create Alternate ▼]       │ │
│ │ Phone:    [Create Alternate ▼]       │ │
│ │ Company:  [Replace ▼]                │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Conflict Summary:                          │
│ • 15 Email conflicts → Email_Alt           │
│ • 8 Phone conflicts → Phone_Alt            │
│                                            │
│ [← Back] [Continue to Columns →]          │
└────────────────────────────────────────────┘
```

### Step 4: Select & Order Columns
```
┌────────────────────────────────────────────┐
│ Column Selection & Ordering                │
├────────────────────────────────────────────┤
│                                            │
│ Column Ordering:                           │
│ ● Append at End                            │
│ ○ Insert Next to Related                   │
│ ○ Custom Order                             │
│                                            │
│ Original Columns (Always Included):        │
│ ☑ ID                                       │
│ ☑ First                                    │
│ ☑ Last                                     │
│ ☑ Email                                    │
│ ☑ Phone                                    │
│ ☑ Company                                  │
│                                            │
│ Enriched Columns (Select to Add):         │
│ ☑ Email_Verified (File 1)                 │
│ ☑ Email_Deliverable (File 1)              │
│ ☑ Phone_Type (File 2)                     │
│ ☑ Phone_Carrier (File 2)                  │
│ ☑ LinkedIn_URL (File 2)                   │
│ ☐ Job_Title (File 2)                      │
│ ☑ Email_Alt (Conflict Resolution)         │
│                                            │
│ Output Preview (First 5 rows):             │
│ ┌──────────────────────────────────────┐   │
│ │ ID | First | Last | Email | ...     │   │
│ │ 1  | John  | Doe  | j@... | ...     │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ [← Back] [Generate Output →]              │
└────────────────────────────────────────────┘
```

### Step 5: Download Output
```
┌────────────────────────────────────────────┐
│ Merge Complete!                            │
├────────────────────────────────────────────┤
│                                            │
│ ✓ Successfully merged 2 enriched files     │
│                                            │
│ Summary:                                   │
│ • Total rows: 1,000                        │
│ • Matched rows: 950 (95%)                  │
│ • Unmatched rows: 50 (5%)                  │
│ • Columns added: 7                         │
│ • Conflicts resolved: 23                   │
│                                            │
│ Output File:                               │
│ • Filename: merged_output.csv              │
│ • Size: 245 KB                             │
│ • Columns: 13                              │
│                                            │
│ [Download Merged CSV]                      │
│ [Download Unmatched Rows]                  │
│ [Save Mapping Template]                    │
│                                            │
│ [Start New Merge] [Back to Home]          │
└────────────────────────────────────────────┘
```

---

## 🚀 Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create `/crm-sync` route
- [ ] Build file upload components
- [ ] Implement CSV parsing
- [ ] Create data structures

### Phase 2: Matching Engine (Week 2)
- [ ] Auto-detect identifier logic
- [ ] Implement matching algorithm
- [ ] Build match statistics
- [ ] Create unmatched rows report

### Phase 3: Conflict Resolution (Week 3)
- [ ] Detect conflicts
- [ ] Implement resolution strategies
- [ ] Build conflict UI
- [ ] Handle multi-value fields

### Phase 4: Column Management (Week 4)
- [ ] Column selection UI
- [ ] Implement ordering modes
- [ ] Build preview table
- [ ] Drag-and-drop reordering

### Phase 5: Output & Polish (Week 5)
- [ ] Merge algorithm
- [ ] CSV export
- [ ] Save/load templates
- [ ] Testing & bug fixes

---

## 📊 Success Metrics

- **Match Rate**: >90% for typical CRM data
- **Performance**: Process 100k rows in <10 seconds
- **Accuracy**: Zero data loss, all rows preserved
- **Usability**: Complete workflow in <5 minutes

---

## 🔮 Future Enhancements

1. **CRM Templates**: Pre-configured mappings for GoHighLevel, Salesforce, HubSpot
2. **API Integration**: Direct sync to CRM without manual download/upload
3. **Scheduled Syncs**: Automated recurring merges
4. **Advanced Fuzzy Matching**: Handle typos, abbreviations
5. **Merge History**: Track all merges with rollback capability
6. **Batch Processing**: Queue large merges as background jobs
