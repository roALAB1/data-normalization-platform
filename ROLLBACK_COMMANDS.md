# Rollback Commands

Use these commands to rollback to previous stable versions if needed.

## Latest Versions

**v3.13.4 STABLE (Current):** Rollback to checkpoint `7c583f20`
```bash
webdev_rollback_checkpoint(version_id="7c583f20")
```
- Middle initials removed from First/Last names
- Location splitting implemented (Personal City + Personal State)
- Full Name column removal verified
- All 139 tests passing
- Production ready

---

**v3.11.0 (Enrichment Requirements Hero):** Rollback to checkpoint `18f8b9b2`
```bash
webdev_rollback_checkpoint(version_id="18f8b9b2")
```
- Hero section explaining enrichment requirements
- Visual design improvements
- User guidance for data preparation

---

**v3.10.0 STABLE:** Rollback to checkpoint `ff3cf9df`
```bash
webdev_rollback_checkpoint(version_id="ff3cf9df")
```
- Simplified output schema (First Name + Last Name only)
- Remove "Name" column from output
- Strip credentials, titles, suffixes
- All 124 tests passing

---

**v3.9.1 STABLE:** Rollback to checkpoint `33978c6f`
```bash
webdev_rollback_checkpoint(version_id="33978c6f")
```
- Bug report system UI complete
- Report Issue button in results table
- Bug report submission dialog
- End-to-end tested

---

**v3.8.1 STABLE:** Rollback to checkpoint `def79358`
```bash
webdev_rollback_checkpoint(version_id="def79358")
```
- Fixed 5 critical credential stripping issues
- Added CDN, WIMI-CP, "M Ed" credentials
- Fixed #NAME? error handling
- 93% clean (382/410 rows perfect)

---

**v3.6.0:** Rollback to checkpoint `c1420db`
```bash
webdev_rollback_checkpoint(version_id="c1420db")
```

---

**v3.4.1:** Rollback to checkpoint `8c1056a`
```bash
webdev_rollback_checkpoint(version_id="8c1056a")
```

---

## How to Rollback

1. Identify the version you want to rollback to from the list above
2. Copy the `webdev_rollback_checkpoint` command
3. Run the command in the Manus AI chat
4. Verify the rollback was successful
5. Test the application to ensure it's working as expected

## When to Rollback

- New version has critical bugs
- New features break existing functionality
- Need to revert to a known stable state
- Testing different versions for comparison

## After Rollback

- Document why the rollback was needed
- Update VERSION_HISTORY.md with rollback details
- Create a new fix branch if needed
- Follow FIX_PROCESS.md for any new fixes
