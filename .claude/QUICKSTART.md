# Validation System Quick Start Guide

Get up and running with the comprehensive validation system in under 5 minutes.

## 🚀 Quick Start

### Option 1: Using AI Coding Assistant (Recommended)

If you're using **Claude Code**, **Cursor**, or similar AI coding assistants:

```
/validate
```

Or if your tool doesn't support slash commands:

```
Go and read .claude/commands/validate.md and execute these instructions now
```

The AI will automatically execute all validation phases and provide a comprehensive report.

---

### Option 2: Automated Script

Run the validation runner script:

```bash
cd /home/ubuntu/name-normalization-demo
./.claude/commands/run-validation.sh
```

This will execute the core validation phases (code quality, unit tests, build) and provide a summary.

---

### Option 3: Manual Execution

Run individual validation phases manually:

```bash
cd /home/ubuntu/name-normalization-demo

# 1. Code Quality & Type Safety
pnpm check          # TypeScript type checking
pnpm format         # Code formatting (auto-fix)

# 2. Unit Testing
pnpm test           # Run all unit tests

# 3. Database Validation
pnpm db:push        # Sync database schema

# 4. Build Validation
pnpm build          # Production build
```

---

## 📊 What Gets Validated?

The validation system checks:

✅ **Code Quality** - TypeScript types, code formatting  
✅ **Unit Tests** - 45+ tests covering all core functionality  
✅ **Database** - Schema sync, connection health  
✅ **Build** - Production build success  
✅ **User Workflows** - Name/address/phone/email normalization, batch processing, CRM sync  
✅ **Integrations** - Redis, S3, WebSocket connections  
✅ **Performance** - Cache efficiency, memory leaks, connection pools  
✅ **Error Handling** - Invalid inputs, network failures, concurrent requests  
✅ **Security** - Authentication, input sanitization, rate limiting  

---

## ⏱️ How Long Does It Take?

- **Quick validation** (code quality + tests): ~2-5 minutes
- **Full validation** (all phases): ~10-20 minutes
- **Individual phase**: ~30 seconds - 5 minutes

---

## 🎯 When Should I Run Validation?

### Always Run (Quick Validation)
- ✅ Before committing code
- ✅ After fixing a bug
- ✅ After adding a new feature

### Occasionally Run (Full Validation)
- ✅ Before creating a pull request
- ✅ Before deploying to production
- ✅ After major refactoring
- ✅ When debugging complex issues

---

## 📖 Understanding the Results

### ✅ All Green - You're Good to Go!

```
╔════════════════════════════════════════════════════════════╗
║  🎉 ALL VALIDATIONS PASSED - READY TO DEPLOY! 🎉          ║
╚════════════════════════════════════════════════════════════╝
```

**What this means**: All validation checks passed. Your code is ready to commit, merge, or deploy.

### ❌ Some Red - Issues Found

```
Phase 2: Unit Testing                      ❌ FAIL
  └─ All Tests (42/45)                     ❌ FAIL (3 failed)
```

**What to do**:
1. Read the detailed error messages
2. Fix the failing tests or implementation
3. Re-run validation
4. Repeat until all green

---

## 🔧 Common Issues & Quick Fixes

### Issue: "Cannot find module" errors

**Fix**:
```bash
pnpm install
```

### Issue: Tests timeout

**Fix**: Check for hanging promises or infinite loops in your code. Increase timeout if needed:
```typescript
// In vitest.config.ts
test: {
  testTimeout: 30000, // Increase from default 5000
}
```

### Issue: Database connection fails

**Fix**: Verify environment variables:
```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Ensure database is running
# (Check your database service status)
```

### Issue: Build fails with memory error

**Fix**:
```bash
NODE_OPTIONS='--max-old-space-size=4096' pnpm build
```

### Issue: Redis connection fails

**Note**: The app runs in **degraded mode** without Redis (caching disabled). This is expected if Redis is not running.

**Fix** (if you need Redis):
```bash
# Check if Redis is running
redis-cli ping

# Start Redis if needed
redis-server
```

---

## 🎓 Next Steps

### Learn More

- **Full Documentation**: See `.claude/commands/validate.md` for detailed phase descriptions
- **Customization**: See `.claude/README.md` for how to add custom validation checks
- **CI/CD Integration**: See `.claude/README.md` for GitHub Actions examples

### Customize Validation

Want to add your own validation checks?

1. Open `.claude/commands/validate.md`
2. Find the relevant phase (or create a new one)
3. Add your validation logic
4. Test it
5. Update the runner script if needed

### Run Specific Phases

Don't need the full validation? Run just what you need:

```bash
# Just code quality
pnpm check && pnpm format

# Just unit tests
pnpm test

# Just a specific test file
pnpm test tests/name-enhanced-full-name.test.ts

# Just build
pnpm build
```

---

## 💡 Pro Tips

1. **Watch mode for fast iteration**:
   ```bash
   pnpm test --watch  # Re-run tests on file changes
   ```

2. **Focus on failing tests**:
   ```bash
   pnpm test --reporter=verbose  # More detailed output
   ```

3. **Run validation in the background**:
   ```bash
   ./.claude/commands/run-validation.sh > validation.log 2>&1 &
   ```

4. **Create a git pre-commit hook**:
   ```bash
   # In .git/hooks/pre-commit
   #!/bin/bash
   pnpm check && pnpm test
   ```

---

## 🆘 Need Help?

1. **Check the detailed documentation**: `.claude/commands/validate.md`
2. **Review troubleshooting**: `.claude/README.md`
3. **Run individual phases**: Isolate the failing phase
4. **Check the error messages**: They usually tell you exactly what's wrong

---

## 📈 Validation Workflow Example

Here's a typical development workflow with validation:

```bash
# 1. Start working on a feature
git checkout -b feature/new-normalization-rule

# 2. Make your changes
# ... edit files ...

# 3. Quick validation during development
pnpm test --watch  # In a separate terminal

# 4. Before committing
pnpm check && pnpm test

# 5. Commit your changes
git add .
git commit -m "Add new normalization rule"

# 6. Before creating PR - full validation
/validate  # Using AI assistant
# OR
./.claude/commands/run-validation.sh

# 7. If all green, push and create PR
git push origin feature/new-normalization-rule

# 8. Before deploying to production
/validate  # One more time to be sure
```

---

## 🎉 You're Ready!

You now have a comprehensive validation system that will:
- Catch bugs before they reach production
- Give you confidence to ship
- Save you hours of manual testing
- Improve code quality over time

**Start validating now**:
```bash
cd /home/ubuntu/name-normalization-demo
./.claude/commands/run-validation.sh
```

Or simply type `/validate` in your AI coding assistant!

---

**Questions?** Check `.claude/README.md` for more details.  
**Issues?** See the troubleshooting section above.  
**Want to customize?** See `.claude/commands/validate.md`.

Happy validating! 🚀
