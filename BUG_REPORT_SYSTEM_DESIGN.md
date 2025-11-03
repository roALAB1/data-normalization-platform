# Bug Report System Design

**Purpose:** Allow users to report normalization issues and automatically improve the system through feedback loops.

**Date:** 2025-11-02  
**Version:** v1.0 (Design Phase)

---

## Overview

We need a system where users can:
1. **Report issues** directly from the output (e.g., "CDN was not stripped")
2. **Provide context** (original input, expected output, actual output)
3. **Feed data** to improve the system (either to you as AI, or to a learning pipeline)

---

## Approach Comparison

### Option 1: Simple Database Collection (Fastest to Implement)

**How it works:**
- Add "Report Issue" button next to each normalized name
- Store reports in database table
- You (human) review reports manually
- I (AI) analyze reports in batches to find patterns

**Pros:**
- ✅ Simple to implement (1-2 hours)
- ✅ No external dependencies
- ✅ Full control over data
- ✅ Privacy-friendly (data stays in your database)

**Cons:**
- ❌ Manual review required
- ❌ No automatic learning
- ❌ Doesn't scale well (100+ reports = overwhelming)

**Best for:** MVP, small user base (<100 users)

---

### Option 2: Smart Pattern Detection (Recommended)

**How it works:**
- Collect bug reports in database (like Option 1)
- Add **automated analysis pipeline** that runs daily/weekly
- Pipeline detects patterns:
  - Missing credentials (e.g., "CDN appears in 10 reports")
  - Common parsing errors (e.g., "trailing hyphen in 5 reports")
  - Edge cases (e.g., "names with apostrophes fail")
- Generate **actionable insights** for you/me to fix

**Pros:**
- ✅ Automatic pattern detection
- ✅ Prioritizes high-impact issues
- ✅ Scalable (handles 1000+ reports)
- ✅ Reduces manual review time by 80%

**Cons:**
- ❌ More complex (3-5 hours to implement)
- ❌ Requires background job processing

**Best for:** Production system, growing user base

---

### Option 3: AI-Powered Auto-Fix (Most Intelligent)

**How it works:**
- Collect bug reports with full context
- Use **LLM (me or similar AI)** to analyze reports in batches
- AI suggests fixes:
  - "Add 'CDN' to credentials list"
  - "Fix regex pattern for trailing hyphens"
  - "Handle apostrophes in last names"
- AI generates **test cases** for each fix
- You review and approve fixes

**Pros:**
- ✅ Minimal manual work
- ✅ AI generates test cases automatically
- ✅ Learns from user feedback
- ✅ Can handle complex edge cases

**Cons:**
- ❌ Most complex (5-10 hours to implement)
- ❌ Requires LLM API integration
- ❌ Cost per analysis (API calls)

**Best for:** High-volume production system, continuous improvement

---

### Option 4: Hybrid Approach (Best Balance)

**How it works:**
- **Phase 1:** Simple database collection (Option 1)
- **Phase 2:** Add pattern detection (Option 2)
- **Phase 3:** AI-powered analysis when patterns detected (Option 3)

**Example workflow:**
1. User reports: "Jeani Hunt CDN" → Last Name shows "CDN"
2. System stores report in database
3. Daily job detects: "CDN appears in 10 reports this week"
4. System flags: "Potential missing credential: CDN"
5. AI analyzes: "CDN = Certified Dietitian Nutritionist, add to credentials list"
6. AI generates test: `expect(new NameEnhanced('Jeani Hunt CDN').lastName).toBe('Hunt')`
7. You review and approve

**Pros:**
- ✅ Start simple, grow smart
- ✅ Incremental implementation
- ✅ Best ROI (return on investment)

**Cons:**
- ❌ Takes longer to reach full capability

**Best for:** Most projects (recommended)

---

## Recommended Implementation (Hybrid Approach)

### Phase 1: Database Collection (v3.9)

**Database Schema:**
```sql
CREATE TABLE issue_reports (
  id SERIAL PRIMARY KEY,
  userId TEXT,
  reportedAt TIMESTAMP DEFAULT NOW(),
  
  -- Context
  originalInput TEXT NOT NULL,
  actualOutput JSONB NOT NULL,  -- { full, first, middle, last, suffix }
  expectedOutput JSONB,          -- What user expected
  issueType TEXT,                -- 'credential_not_stripped', 'name_split_wrong', etc.
  
  -- User feedback
  description TEXT,
  severity TEXT,                 -- 'critical', 'high', 'medium', 'low'
  
  -- Analysis
  status TEXT DEFAULT 'pending', -- 'pending', 'analyzing', 'fixed', 'wont_fix'
  pattern TEXT,                  -- Auto-detected pattern
  fixSuggestion TEXT,            -- AI-generated fix
  
  -- Metadata
  version TEXT,                  -- e.g., 'v3.8.1'
  metadata JSONB                 -- Additional context
);

CREATE INDEX idx_reports_status ON issue_reports(status);
CREATE INDEX idx_reports_pattern ON issue_reports(pattern);
CREATE INDEX idx_reports_type ON issue_reports(issueType);
```

**UI Component:**
```tsx
// Add to each normalized name row
<Button 
  variant="ghost" 
  size="sm"
  onClick={() => openReportDialog(row)}
>
  <Flag className="h-4 w-4" />
  Report Issue
</Button>

// Dialog
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Report Normalization Issue</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      <div>
        <Label>Original Input</Label>
        <Input value={originalInput} disabled />
      </div>
      
      <div>
        <Label>Current Output</Label>
        <div className="text-sm">
          Full: {actualOutput.full}<br/>
          First: {actualOutput.first}<br/>
          Last: {actualOutput.last}
        </div>
      </div>
      
      <div>
        <Label>What's wrong?</Label>
        <Select onValueChange={setIssueType}>
          <SelectItem value="credential_not_stripped">
            Credential not removed (e.g., MD, RN)
          </SelectItem>
          <SelectItem value="name_split_wrong">
            Name split incorrectly
          </SelectItem>
          <SelectItem value="special_char_issue">
            Special character issue
          </SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </Select>
      </div>
      
      <div>
        <Label>Expected Output (optional)</Label>
        <Input 
          placeholder="e.g., Last Name should be 'Hunt' not 'CDN'"
          value={expectedOutput}
          onChange={(e) => setExpectedOutput(e.target.value)}
        />
      </div>
      
      <div>
        <Label>Additional Details</Label>
        <Textarea 
          placeholder="Any other context that might help..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </div>
    
    <DialogFooter>
      <Button onClick={submitReport}>Submit Report</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**API Endpoint:**
```typescript
// server/routes/reports.ts
router.post('/api/reports', async (req, res) => {
  const { originalInput, actualOutput, expectedOutput, issueType, description } = req.body;
  
  const report = await db.insert(issueReports).values({
    userId: req.user?.id,
    originalInput,
    actualOutput,
    expectedOutput,
    issueType,
    description,
    version: 'v3.8.1',
    status: 'pending'
  }).returning();
  
  res.json({ success: true, reportId: report.id });
});
```

---

### Phase 2: Pattern Detection (v3.10)

**Daily Analysis Job:**
```typescript
// server/jobs/analyzeReports.ts
import { NameEnhanced } from '@/lib/NameEnhanced';

async function analyzeReports() {
  // Get pending reports
  const reports = await db.select()
    .from(issueReports)
    .where(eq(issueReports.status, 'pending'))
    .limit(1000);
  
  // Detect patterns
  const patterns = detectPatterns(reports);
  
  // Example patterns:
  // - "CDN appears in last name 10 times"
  // - "Trailing hyphen in 5 reports"
  // - "Names with apostrophes fail 8 times"
  
  for (const pattern of patterns) {
    if (pattern.count >= 5) {
      // High-impact issue, flag for review
      await db.update(issueReports)
        .set({ 
          pattern: pattern.description,
          status: 'analyzing'
        })
        .where(inArray(issueReports.id, pattern.reportIds));
      
      // Send notification to admin
      await notifyAdmin({
        type: 'pattern_detected',
        pattern: pattern.description,
        count: pattern.count,
        reportIds: pattern.reportIds
      });
    }
  }
}

function detectPatterns(reports) {
  const patterns = [];
  
  // Pattern 1: Missing credentials
  const credentialIssues = reports.filter(r => 
    r.issueType === 'credential_not_stripped'
  );
  
  const credentialCounts = {};
  for (const report of credentialIssues) {
    // Extract potential credential from last name
    const lastWord = report.actualOutput.last.split(' ').pop();
    if (/^[A-Z]{2,6}$/.test(lastWord)) {
      credentialCounts[lastWord] = (credentialCounts[lastWord] || 0) + 1;
    }
  }
  
  for (const [credential, count] of Object.entries(credentialCounts)) {
    if (count >= 5) {
      patterns.push({
        type: 'missing_credential',
        description: `Credential "${credential}" not stripped (${count} reports)`,
        count,
        credential,
        reportIds: credentialIssues
          .filter(r => r.actualOutput.last.endsWith(credential))
          .map(r => r.id)
      });
    }
  }
  
  // Pattern 2: Trailing punctuation
  const trailingPunctuation = reports.filter(r => 
    /[-,.]$/.test(r.actualOutput.last)
  );
  
  if (trailingPunctuation.length >= 5) {
    patterns.push({
      type: 'trailing_punctuation',
      description: `Trailing punctuation in last name (${trailingPunctuation.length} reports)`,
      count: trailingPunctuation.length,
      reportIds: trailingPunctuation.map(r => r.id)
    });
  }
  
  // Pattern 3: Leading hyphens
  const leadingHyphens = reports.filter(r => 
    r.actualOutput.first?.startsWith('-') || r.actualOutput.last?.startsWith('-')
  );
  
  if (leadingHyphens.length >= 3) {
    patterns.push({
      type: 'leading_hyphen',
      description: `Leading hyphen in name parts (${leadingHyphens.length} reports)`,
      count: leadingHyphens.length,
      reportIds: leadingHyphens.map(r => r.id)
    });
  }
  
  return patterns;
}
```

---

### Phase 3: AI-Powered Analysis (v3.11+)

**AI Analysis Endpoint:**
```typescript
// server/jobs/aiAnalysis.ts
import Anthropic from '@anthropic-ai/sdk';

async function analyzeWithAI(pattern) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  // Get sample reports for this pattern
  const reports = await db.select()
    .from(issueReports)
    .where(inArray(issueReports.id, pattern.reportIds))
    .limit(10);
  
  const prompt = `
You are analyzing bug reports for a name normalization system.

Pattern detected: ${pattern.description}
Sample reports (${reports.length}):

${reports.map((r, i) => `
Report ${i + 1}:
- Input: "${r.originalInput}"
- Output: ${JSON.stringify(r.actualOutput)}
- Expected: ${r.expectedOutput || 'Not specified'}
- Issue: ${r.issueType}
`).join('\n')}

Please analyze and provide:
1. Root cause of the issue
2. Suggested fix (code changes needed)
3. Test case to prevent regression
4. Priority (critical/high/medium/low)

Format your response as JSON:
{
  "rootCause": "...",
  "suggestedFix": "...",
  "testCase": "...",
  "priority": "..."
}
`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });
  
  const analysis = JSON.parse(response.content[0].text);
  
  // Store analysis
  await db.update(issueReports)
    .set({ 
      fixSuggestion: JSON.stringify(analysis),
      status: 'analyzed'
    })
    .where(inArray(issueReports.id, pattern.reportIds));
  
  return analysis;
}
```

---

## Alternative: Feed to AI (Me) Directly

**Option A: Batch Export for AI Review**

```typescript
// Export reports as markdown for AI review
async function exportReportsForAI() {
  const reports = await db.select()
    .from(issueReports)
    .where(eq(issueReports.status, 'pending'))
    .orderBy(desc(issueReports.reportedAt))
    .limit(100);
  
  const markdown = `
# Bug Reports for AI Review

**Date:** ${new Date().toISOString()}
**Total Reports:** ${reports.length}

## Reports

${reports.map((r, i) => `
### Report ${i + 1} (ID: ${r.id})

**Input:** \`${r.originalInput}\`
**Output:**
- Full: ${r.actualOutput.full}
- First: ${r.actualOutput.first}
- Last: ${r.actualOutput.last}
- Suffix: ${r.actualOutput.suffix || 'N/A'}

**Issue Type:** ${r.issueType}
**Expected:** ${r.expectedOutput || 'Not specified'}
**Description:** ${r.description || 'N/A'}

---
`).join('\n')}
`;

  // Save to file
  await fs.writeFile('/tmp/bug_reports.md', markdown);
  
  return '/tmp/bug_reports.md';
}
```

Then you can:
1. Run export weekly
2. Upload markdown file to chat
3. I analyze all reports
4. Generate fixes + tests
5. You review and apply

---

## Recommendation

**Start with Phase 1 (v3.9):**
1. Add "Report Issue" button to UI
2. Store reports in database
3. Build admin dashboard to view reports
4. Export reports weekly for AI review (me)

**Add Phase 2 (v3.10):**
1. Implement pattern detection
2. Auto-flag high-impact issues
3. Reduce manual review time

**Consider Phase 3 (v4.0+):**
1. AI-powered analysis for automatic fixes
2. Only if report volume is high (100+/week)

---

## Next Steps

1. **Decide approach:** Simple DB collection or full hybrid?
2. **Design UI:** Where should "Report Issue" button appear?
3. **Set up database:** Add issue_reports table
4. **Build API:** Create report submission endpoint
5. **Test with real users:** Get feedback on report flow

Want me to implement Phase 1 now?
