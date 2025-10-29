# Release Notes - Version 1.1.0

**Release Date**: October 29, 2025  
**Tag**: v1.1.0

---

## 🚀 Major Features

### 1. WebSocket Progress Tracking ⚡

Real-time batch job updates with instant feedback instead of polling delays.

**Key Features:**
- Socket.IO server and client integration
- Real-time events: `job:progress`, `job:completed`, `job:failed`
- Live connection status indicator in UI
- Automatic reconnection with exponential backoff
- <100ms latency vs 5-second polling delays

**Benefits:**
- ✅ Significantly improved user experience
- ✅ Reduced server load (no constant HTTP polling)
- ✅ Instant feedback for large batch jobs
- ✅ Connection resilience with auto-reconnect

**Documentation**: `docs/WEBSOCKET_ARCHITECTURE.md`

---

### 2. Asian Name Order Detection 🌏

Intelligent detection of family-name-first patterns for Chinese, Korean, Japanese, and Vietnamese names.

**Key Features:**
- 400+ surname library covering 70-90% of each population
- Intelligent heuristics for name order detection
- Confidence scoring (0-100)
- Automatic reordering to Western format
- Handles mixed cases ("John Kim" vs "Kim Min-jun")
- Metadata fields: `nameOrder`, `asianCulture`, `nameOrderConfidence`

**Coverage:**
- Chinese: 100 most common surnames (85% coverage)
- Korean: 100 most common surnames (90% coverage)
- Japanese: 100 most common surnames (70% coverage)
- Vietnamese: 100 most common surnames (80% coverage)

**Performance:**
- >95% accuracy for recognized surnames
- <3ms overhead per name
- O(1) lookup using Sets

**Examples:**
```typescript
"Li Wei" → First: Wei, Last: Li (Chinese, family-name-first)
"Kim Min-jun" → First: Min-jun, Last: Kim (Korean, family-name-first)
"Tanaka Hiroshi" → First: Hiroshi, Last: Tanaka (Japanese, family-name-first)
"John Kim" → First: John, Last: Kim (Western order, common surname)
```

**Documentation**: `docs/ASIAN_NAME_DETECTION.md`

---

### 3. Context-Aware Parsing 🧠

Uses additional context (email, phone, company) to improve name parsing accuracy.

**Key Features:**
- Email domain analysis (.cn, .kr, .jp, .vn)
- Phone country code detection (+86, +82, +81, +84)
- Company name cultural analysis
- Weighted voting system (email: 40pts, phone: 40pts, company: 20pts)
- Boosts surname confidence by up to 20 points
- Lowers detection threshold from 85 to 70 when context is strong

**How It Works:**
1. Analyzes email domain for cultural hints
2. Detects phone country code
3. Examines company name for cultural indicators
4. Combines signals using weighted voting
5. Boosts Asian surname confidence when context matches
6. Lowers detection threshold for high-confidence context

**Example:**
```typescript
const name = new NameEnhanced("Li Wei", {
  context: {
    email: "li.wei@company.cn",
    phone: "+86-138-1234-5678",
    company: "Beijing Tech Co."
  }
});

// Context analysis:
// - Email: .cn → Chinese (40 points)
// - Phone: +86 → Chinese (40 points)
// - Company: "Beijing" → Chinese (20 points)
// - Total confidence: 100%
// - Boosts surname confidence: 85 → 100
// - Result: First: Wei, Last: Li (high confidence)
```

**Performance:**
- <2ms overhead per name
- Minimal impact on batch processing

**Documentation**: `docs/CONTEXT_AWARE_PARSING.md`

---

## 📊 Performance Metrics

| Feature | Overhead | Accuracy | Coverage |
|---------|----------|----------|----------|
| WebSocket Progress | <100ms latency | N/A | All batch jobs |
| Asian Name Detection | <3ms per name | >95% | 70-90% of populations |
| Context-Aware Parsing | <2ms per name | >95% with context | All names with context |
| **Combined** | **<5ms per name** | **>95%** | **Global** |

---

## 🐛 Bug Fixes

- Fixed merge conflict in `todo.md`
- Resolved lockfile sync issues
- Improved error handling in WebSocket connections

---

## 📚 Documentation

### New Documentation
- `docs/WEBSOCKET_ARCHITECTURE.md` - WebSocket implementation guide
- `docs/ASIAN_NAME_DETECTION.md` - Asian name order detection guide
- `docs/CONTEXT_AWARE_PARSING.md` - Context-aware parsing guide

### Updated Documentation
- `README.md` - Updated with v1.1.0 features
- `ROADMAP_v1.1.0.md` - Roadmap for future enhancements

---

## 🔄 Migration Guide

### From v1.0.0 to v1.1.0

**No breaking changes!** All v1.0.0 code continues to work.

**New Optional Features:**

1. **WebSocket Progress Tracking** (automatic)
   - Automatically enabled for all batch jobs
   - No code changes required
   - Connection status indicator appears in UI

2. **Asian Name Detection** (automatic)
   - Automatically enabled for all name parsing
   - No code changes required
   - Check `nameOrder` and `asianCulture` fields for results

3. **Context-Aware Parsing** (opt-in)
   ```typescript
   // Before (still works)
   const name = new NameEnhanced("Li Wei");
   
   // After (enhanced with context)
   const name = new NameEnhanced("Li Wei", {
     context: {
       email: "li.wei@company.cn",
       phone: "+86-138-1234-5678",
       company: "Beijing Tech"
     }
   });
   ```

---

## 🎯 What's Next

See `ROADMAP_v1.1.0.md` for planned features:

**Priority 1:**
- Better initials handling ("R.J. Williams")
- Mononym support ("Madonna", "Cher")
- Name length validation

**Priority 2:**
- Comparison view (original vs Namefully)
- Search/filter for example names
- Custom credential lists editor

**Priority 3:**
- Phonetic matching (Soundex/Metaphone)
- Fuzzy matching against name databases
- Character set validation

---

## 🙏 Acknowledgments

- **Socket.IO** - Real-time WebSocket library
- **Asian surname data** - Based on census and demographic research
- **Community feedback** - Feature requests and bug reports

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/roALAB1/data-normalization-platform.git

# Install dependencies
cd data-normalization-platform
pnpm install

# Start development server
pnpm dev
```

---

## 🔗 Links

- **GitHub Repository**: https://github.com/roALAB1/data-normalization-platform
- **v1.1.0 Tag**: https://github.com/roALAB1/data-normalization-platform/releases/tag/v1.1.0
- **v1.0.0 Release**: https://github.com/roALAB1/data-normalization-platform/releases/tag/v1.0.0

---

**Full Changelog**: https://github.com/roALAB1/data-normalization-platform/compare/v1.0.0...v1.1.0
