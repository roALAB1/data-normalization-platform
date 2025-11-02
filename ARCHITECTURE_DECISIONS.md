# Architecture Decisions & Technical Context

**Purpose:** Document why certain technical approaches were chosen, compatibility constraints, performance considerations, and architectural patterns.

**⚠️ MANDATORY:** Review this before making architectural changes or adding new features.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Key Design Decisions](#key-design-decisions)
4. [Performance Considerations](#performance-considerations)
5. [Compatibility Constraints](#compatibility-constraints)
6. [Future Improvements](#future-improvements)

---

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript 5.9.3** - Type safety
- **Vite 7.1.7** - Build tool and dev server
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - Component library
- **Wouter** - Client-side routing
- **TanStack Query** - Data fetching
- **tRPC** - Type-safe API

### Backend
- **Express** - HTTP server
- **tRPC** - API layer
- **Drizzle ORM** - Database ORM
- **MySQL** - Database
- **BullMQ** - Job queue
- **Redis (ioredis)** - Queue backend
- **Socket.io** - Real-time updates

### Infrastructure
- **AWS S3** - File storage
- **Vite Plugin** - Custom runtime
- **Web Workers** - CSV processing
- **ESBuild** - Server bundling

---

## Architecture Overview

### Client-Side Architecture

```
client/
├── src/
│   ├── pages/          # Page components (Home, Changelog, etc.)
│   ├── components/     # Reusable UI components
│   │   └── ui/         # shadcn/ui components
│   ├── lib/            # Utilities and core logic
│   │   └── NameEnhanced.ts  # ⚠️ CRITICAL - Name normalization logic
│   ├── workers/        # Web Workers for CSV processing
│   │   └── normalization.worker.ts  # ⚠️ Uses NameEnhanced
│   ├── hooks/          # Custom React hooks
│   └── contexts/       # React contexts (Theme, etc.)
```

### Server-Side Architecture

```
server/
├── _core/
│   └── index.ts        # Express server entry point
├── trpc/
│   └── routers/        # tRPC API routes
├── jobProcessor.ts     # ⚠️ CRITICAL - Background job processor
├── jobDb.ts            # Job database operations
└── services/
    └── IntelligentBatchProcessor.ts  # CSV batch processing
```

### Shared Code

```
shared/
├── normalization/
│   ├── names/
│   │   ├── credentials/  # ⚠️ CRITICAL - Credential lists
│   │   │   ├── healthcare.ts
│   │   │   ├── academic.ts
│   │   │   ├── finance.ts
│   │   │   └── index.ts  # ⚠️ MODULE LOADING ISSUE HERE
│   │   └── index.ts
│   ├── emails/
│   ├── phones/
│   └── locations/
└── const.ts
```

---

## Key Design Decisions

### 1. Web Workers for CSV Processing

**Decision:** Use Web Workers to process large CSV files

**Rationale:**
- Prevents UI blocking on large datasets (100k+ rows)
- Enables parallel processing
- Better user experience (responsive UI)

**Trade-offs:**
- ⚠️ Module loading issues (workers have separate context)
- More complex debugging
- Memory overhead

**Status:** Working but has module loading bug

---

### 2. Shared Normalization Logic

**Decision:** Share `NameEnhanced` class between client and server

**Rationale:**
- Single source of truth for normalization rules
- Consistent behavior across preview and batch processing
- Easier to maintain

**Trade-offs:**
- ⚠️ Module imports break in worker context
- Must work in both Node.js and browser
- Bundle size considerations

**Status:** Working but needs module loading fix

---

### 3. tRPC for Type-Safe API

**Decision:** Use tRPC instead of REST API

**Rationale:**
- End-to-end type safety
- No code generation needed
- Better DX (autocomplete, refactoring)

**Trade-offs:**
- Tied to TypeScript
- Learning curve
- Less flexible than REST

**Status:** Working well

---

### 4. BullMQ for Job Queue

**Decision:** Use BullMQ with Redis for background jobs

**Rationale:**
- Reliable job processing
- Retry logic built-in
- Progress tracking
- Scalable

**Trade-offs:**
- Requires Redis server
- More infrastructure
- Polling overhead (5s interval)

**Status:** Working but needs optimization (see Performance Audit)

---

### 5. S3 for File Storage

**Decision:** Use AWS S3 for CSV file storage

**Rationale:**
- Unlimited storage
- Reliable
- Pre-signed URLs for secure access
- CDN integration

**Trade-offs:**
- External dependency
- Cost considerations
- Network latency

**Status:** Working well

---

### 6. Drizzle ORM Instead of Prisma

**Decision:** Use Drizzle ORM for database

**Rationale:**
- Lightweight
- Better TypeScript inference
- SQL-like syntax
- No code generation

**Trade-offs:**
- Smaller community
- Fewer features than Prisma
- Manual migrations

**Status:** Working well

---

## Performance Considerations

### Critical Performance Issues (From Audit)

#### 1. No Database Indexes (CRITICAL 🔴)

**Problem:**
- Queries on `jobs.userId` and `jobs.status` are slow
- No index on `jobs.createdAt` for sorting

**Impact:**
- Slow job queue processing
- Poor user experience with many jobs

**Solution:**
```sql
CREATE INDEX user_id_idx ON jobs (userId);
CREATE INDEX status_idx ON jobs (status);
CREATE INDEX created_at_idx ON jobs (createdAt);
```

**Status:** Migration file created, needs `pnpm db:push`

---

#### 2. Polling Job Queue (MEDIUM 🟡)

**Problem:**
- Job processor polls every 5 seconds
- Wastes resources when no jobs

**Impact:**
- Unnecessary database queries
- Higher costs

**Solution:**
- Use Redis pub/sub for job notifications
- Or use BullMQ's built-in event system

**Status:** Not implemented

---

#### 3. Loading Entire CSVs into Memory (HIGH 🔴)

**Problem:**
- `IntelligentBatchProcessor` loads full CSV into memory
- Crashes with large files (>100MB)

**Impact:**
- Memory exhaustion
- Server crashes
- Poor scalability

**Solution:**
- Stream CSV processing
- Process in chunks
- Use `papaparse` streaming mode

**Status:** Not implemented

---

#### 4. Large Bundle Size (MEDIUM 🟡)

**Problem:**
- `node_modules` is 934MB
- Client bundle includes unnecessary code

**Impact:**
- Slow page loads
- Poor mobile experience
- Higher bandwidth costs

**Solution:**
- Code splitting
- Tree shaking
- Lazy loading

**Status:** Not implemented

---

### Performance Targets

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Concurrent Users | 10 | 100+ | High |
| Max File Size | 10MB | 1GB+ | High |
| Processing Speed | 5s/1000 rows | 1s/1000 rows | Medium |
| Page Load Time | ~3s | <1s | Medium |
| Database Query Time | ~500ms | <100ms | High |

---

## Compatibility Constraints

### Browser Support

**Minimum:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Why:**
- Web Workers support
- ES2020 features
- CSS Grid/Flexbox

---

### Node.js Version

**Required:** Node.js 18+

**Why:**
- ES modules support
- Fetch API
- Performance improvements

---

### Database

**Required:** MySQL 8.0+

**Why:**
- JSON column support
- Better indexing
- Performance

---

## Module Loading Issue (CRITICAL)

### Problem Statement

When `NameEnhanced` is used in a Web Worker context, imported arrays from `@shared/normalization/names` return empty:

```typescript
// In worker context:
import { ALL_CREDENTIALS } from '@shared/normalization/names';
console.log(ALL_CREDENTIALS.length);  // 0 ❌ (should be 671)
```

### Root Cause Hypotheses

1. **Vite Worker Bundling:**
   - Vite bundles workers separately
   - May not include `as const` arrays properly
   - Tree-shaking might remove "unused" exports

2. **Circular Dependencies:**
   - Possible circular import between modules
   - Initialization order issues

3. **ES Module Context:**
   - Workers have different module resolution
   - May need different import strategy

### Attempted Solutions (All Failed)

1. ❌ Hardcoding credentials in `NameEnhanced.ts`
2. ❌ Using `CREDENTIALS_SET` instead of `ALL_CREDENTIALS`
3. ❌ Dynamic imports
4. ❌ Regex pattern fixes

### Recommended Solution (Not Yet Implemented)

**Research how enterprise libraries solve this:**

1. **libphonenumber-js** - How do they load phone number data in workers?
2. **validator.js** - How do they handle validation rules?
3. **Intl.js** - How do they load locale data?

**Likely patterns:**
- Lazy loading with dynamic imports
- Separate worker bundles with explicit includes
- JSON data files instead of TypeScript constants
- IndexedDB for large datasets

---

## Future Improvements

### Phase 1: Stability (High Priority)

1. ✅ Fix module loading in workers
2. ✅ Add database indexes
3. ✅ Create automated test suite
4. ✅ Implement proper error handling

### Phase 2: Performance (Medium Priority)

1. Stream CSV processing
2. Implement code splitting
3. Add Redis pub/sub for job queue
4. Optimize bundle size

### Phase 3: Features (Low Priority)

1. Company name normalization
2. Advanced location parsing
3. International phone support
4. Custom normalization rules

---

## Decision Log

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2025-11-02 | Rollback to v3.6.0 | Credential bug too complex, need stable base | ✅ Done |
| 2025-11-02 | Create documentation framework | Prevent regression loops | ✅ Done |
| 2025-11-02 | Research enterprise solutions | Need proven patterns for module loading | 🔄 In Progress |
| 2025-11-02 | Add database indexes | Performance improvement | 🔄 Migration ready |

---

## Update Log

| Date | Who | What Changed |
|------|-----|--------------|
| 2025-11-02 | AI Agent | Initial creation with architectural context |

**Remember:** Update this document when making architectural decisions!
