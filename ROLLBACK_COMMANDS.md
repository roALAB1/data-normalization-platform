# Rollback Commands

Use these commands to rollback to previous stable versions if needed.

## Latest Versions

**v3.13.6 STABLE (Current):** `webdev_rollback_checkpoint(version_id="c22ce886")`
- Enrichment-ready output format hero section restored
- Purple-to-magenta gradient with 6 transformation cards
- Footer version updated to v3.13.6
- All 139 tests passing

**v3.13.5 STABLE:** `webdev_rollback_checkpoint(version_id="2e25dfbd")`
- Hero section + ghost numbers fix
- Enhanced UI with transformations display
- All 139 tests passing

**v3.13.4 STABLE:** `webdev_rollback_checkpoint(version_id="7c583f20")`
- Middle initial removal + location splitting
- All 139 tests passing
- Production ready

**v3.11.0 STABLE:** `webdev_rollback_checkpoint(version_id="18f8b9b2")`
- Enrichment requirements hero
- Visual design improvements

**v3.10.0 STABLE:** `webdev_rollback_checkpoint(version_id="ff3cf9df")`
- Simplified output schema (First Name + Last Name only)
- All 124 tests passing

**v3.9.1 STABLE:** `webdev_rollback_checkpoint(version_id="33978c6f")`
- Bug report system
- Production ready

**v3.8.1 STABLE:** `webdev_rollback_checkpoint(version_id="def79358")`
- Credential stripping fixes
- 93% clean output

**v3.6.0:** `webdev_rollback_checkpoint(version_id="c1420db")`

**v3.4.1:** `webdev_rollback_checkpoint(version_id="8c1056a")`

## Broken Versions (DO NOT USE)

**v3.13.3:** `webdev_rollback_checkpoint(version_id="18ee2f06")` ❌ BROKEN
- Middle initials not removed
- Location splitting not implemented
- Use v3.13.4 or v3.13.5 instead

## Usage

Copy the command for the version you want to rollback to and run it in the chat.

Example:
```
webdev_rollback_checkpoint(version_id="b720f2b0")
```
