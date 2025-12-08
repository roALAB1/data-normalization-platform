# Claude Commands Directory

This directory contains custom commands for AI coding assistants (like Claude Code, Cursor, etc.) to help with development workflows.

## Available Commands

### `/validate` - Comprehensive Validation Command

A complete end-to-end validation system for the name-normalization-demo platform. This command performs rigorous testing across all layers of the application.

**Location**: `.claude/commands/validate.md`

**What it does**:
- Code quality checks (TypeScript, Prettier)
- Unit testing (Vitest)
- Database validation
- Build verification
- End-to-end user workflow testing
- Integration testing (Redis, S3, WebSocket)
- Performance validation
- Error handling verification
- Security checks
- Comprehensive reporting

**How to use**:

#### With Claude Code (or similar tools with slash commands):
```
/validate
```

#### With Cursor (or tools without slash commands):
```
Go and read .claude/commands/validate.md and execute these instructions now
```

#### Manual execution:
```bash
# Run the automated validation runner script
./.claude/commands/run-validation.sh

# Or run individual phases manually
cd /home/ubuntu/name-normalization-demo

# Phase 1: Code Quality
pnpm check
pnpm format

# Phase 2: Unit Tests
pnpm test

# Phase 3: Database
pnpm db:push

# Phase 4: Build
pnpm build

# ... and so on
```

## Validation Philosophy

This validation system follows the **PIV Loop** (Plan → Implement → Validate) methodology:

1. **Catch bugs early** - Automated checks find issues before manual testing
2. **Simulate real workflows** - Test the application as users would use it
3. **Provide deployment confidence** - Comprehensive validation gives the green light to ship
4. **Self-correction** - The validation process identifies issues and suggests fixes

## Validation Phases

The validation command includes 10 comprehensive phases:

1. **Code Quality & Type Safety** - TypeScript checking and code formatting
2. **Unit Testing** - Verify individual components work correctly
3. **Database Validation** - Schema sync and connection health
4. **Build Validation** - Ensure production build succeeds
5. **End-to-End User Workflows** - Test complete user journeys
6. **Integration Testing** - Verify external service connections
7. **Performance Validation** - Check cache, memory, and connection pools
8. **Error Handling & Edge Cases** - Verify graceful error handling
9. **Security Validation** - Authentication, sanitization, rate limiting
10. **Validation Summary & Report** - Comprehensive results and recommendations

## Expected Duration

- **Full validation suite**: 10-20 minutes
- **Quick validation** (code quality + unit tests): 2-5 minutes
- **Individual phase**: 30 seconds - 5 minutes

## When to Run Validation

- **Before committing code** - Quick validation (phases 1-2)
- **Before creating a PR** - Full validation
- **Before deploying** - Full validation with extra scrutiny
- **After major refactoring** - Full validation
- **When debugging issues** - Relevant phases only

## Customizing Validation

To add new validation checks:

1. Open `.claude/commands/validate.md`
2. Find the appropriate phase or create a new one
3. Add your validation logic with:
   - Clear objective
   - Step-by-step instructions
   - Success criteria
   - Expected behavior
4. Update the validation runner script if needed
5. Test the new validation to ensure it works

## Troubleshooting

### Common Issues

**"Cannot find module" errors**
```bash
pnpm install
```

**Tests timeout**
- Increase timeout in `vitest.config.ts`
- Check for hanging promises or infinite loops

**Database connection fails**
- Verify `DATABASE_URL` environment variable
- Ensure database server is running

**Build fails with memory error**
```bash
NODE_OPTIONS='--max-old-space-size=4096' pnpm build
```

**Redis connection fails**
- Check `REDIS_HOST` and `REDIS_PORT` environment variables
- Ensure Redis server is running
- Note: The app runs in degraded mode without Redis (caching disabled)

## Best Practices

1. **Run validation frequently** - Don't wait until deployment
2. **Fix issues immediately** - Don't let failures accumulate
3. **Keep validation fast** - Optimize slow tests
4. **Make it comprehensive** - Cover all critical workflows
5. **Automate everything** - Manual validation is error-prone
6. **Document failures** - Record root causes and fixes
7. **Iterate continuously** - Improve coverage and accuracy
8. **Trust but verify** - Validation builds confidence, but manual review adds value

## CI/CD Integration

To integrate validation into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
name: Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm check
      - run: pnpm test
      - run: pnpm build
```

## Contributing

When adding new features to the project:

1. **Write tests first** - TDD approach ensures testability
2. **Update validation** - Add relevant validation checks
3. **Run full validation** - Ensure nothing breaks
4. **Document changes** - Update this README if needed

## Support

For issues or questions about the validation system:

1. Check the troubleshooting section in `validate.md`
2. Review the detailed phase descriptions
3. Run individual phases to isolate issues
4. Check the project's main documentation

## Version History

- **v1.0.0** (2025-12-02) - Initial validation system
  - 10 comprehensive validation phases
  - Automated runner script
  - Detailed documentation
  - Based on the "Ultimate Validation Command" framework

---

**Maintained by**: AI Development Team  
**Last Updated**: 2025-12-02  
**Project**: name-normalization-demo v3.41.0
