# SWSE Migrations & Foundry Compatibility

**Status**: 🟢 Authoritative Reference
**Audience**: Maintainers & Advanced Users
**Last Updated**: 2026-02-09

---

## Overview

This document covers:
- **Version Management**: SWSE version history
- **Foundry Compatibility**: What Foundry versions work
- **Upgrade Paths**: How to safely upgrade
- **Migrations**: How data evolves
- **Breaking Changes**: What to watch for

---

## Current Status

| System | Version | Foundry Support | Status |
|--------|---------|-----------------|--------|
| SWSE | 1.1.207 | v13, v14 roadmap | ✅ Stable |
| Character Sheet | v2 (AppV2) | v13+ | ✅ Current |
| Migration System | v2 | v13+ | ✅ Current |

---

## Foundry Compatibility Matrix

### Supported Versions

**Foundry v13** (Current)
- ✅ Fully supported
- ✅ AppV2 apps required
- ✅ Handlebars v4+
- ✅ Native async/await

**Foundry v14** (Roadmap)
- 🟡 In development
- 🟡 Testing in progress
- 🟡 Expected Q2 2026

### Unsupported Versions

**Foundry v12 and earlier**
- ❌ No support
- ❌ ApplicationV1 deprecated
- ❌ jQuery removed

---

## Safe Upgrade Process

### Before Upgrading

1. **Backup your world**
   ```bash
   cp -r /path/to/world /path/to/world.backup
   ```

2. **Check system version compatibility**
   - Go to Settings → System Version
   - Verify SWSE is compatible with target Foundry version

3. **Review breaking changes** (see below)

### Upgrade Steps

1. Update Foundry to new version
2. Reload the world
3. Check console for errors
4. Run any automatic migrations (they run automatically)
5. Verify character sheets open correctly
6. Test core systems (chargen, levelup, combat)

### After Upgrading

1. **Monitor logs** for errors
2. **Test all systems** (especially sheets)
3. **Report issues** with version and error message
4. **Revert if needed** using backup

---

## Migration System

### How Migrations Work

Migrations run **automatically** when:
- World is loaded after system update
- Migration version is newer than last run
- GM is logged in

Location: `scripts/migrations/`

### Current Migrations

#### 1. JSON-Backed IDs Migration
**Version**: 2026-02-06-json-backed-ids-v1
**Purpose**: Backfill deterministic IDs for backgrounds and languages
**Scope**: All actors
**Status**: ✅ Complete

#### 2. Orphaned Talents Migration
**Purpose**: Clean up orphaned talent references
**Status**: ✅ Complete

#### 3. Talent Tree Descriptions Migration
**Purpose**: Update talent tree metadata
**Status**: ✅ Complete

### Adding New Migrations

1. Create file in `scripts/migrations/`
2. Name: `YYYY-MM-DD-description-vN.js`
3. Export function that runs migration
4. **Must be idempotent** (safe to run multiple times)
5. Register in migration registry
6. Test with backup first

---

## Breaking Changes

### v13 Transition (From v12)

🔴 **ApplicationV1 Removed**
- All apps must extend ApplicationV2
- No more jQuery usage
- No more `activateListeners` pattern

🔴 **jQuery Deprecated**
- Cannot use `$()`
- Use `querySelector()` instead
- System has runtime guard to prevent usage

🔴 **Data Structure Changes**
- Actors use new schema
- Items use new schema
- Effects system updated

### Phase 3 Updates (Current)

🟡 **Runtime Contracts Enforced**
- jQuery usage throws immediately
- v1 patterns detected and blocked
- AppV2 lifecycle mandatory

---

## Version History

### v1.1.207 (Current - Feb 2026)
✅ AppV2 complete
✅ Phase 1-3 hardening
✅ jQuery elimination complete
✅ Automated contracts enforced

### v1.1.200 (Jan 2026)
✅ Phase 2 progression engine
✅ Mentor system integrated
✅ Migration framework added

### v1.0.x (2025)
✅ Initial v13 release
✅ Basic AppV2 conversion
✅ Character sheet v2

---

## Data Format Changes

### Actors

**v2 Format** (Current):
```json
{
  "id": "actor-id",
  "name": "Character Name",
  "type": "character",
  "system": {
    "abilities": { "str": 10, ... },
    "derived": { /* calculated */ },
    "conditionTrack": { /* health */ }
  },
  "items": [ /* Item array */ ]
}
```

### Items

**v2 Format** (Current):
```json
{
  "id": "item-id",
  "name": "Item Name",
  "type": "talent",
  "system": {
    "description": "...",
    "prerequisites": [ /* requirements */ ]
  }
}
```

---

## Troubleshooting

### Issue: "Cannot read property 'x' of undefined"

**Check**: Migration may not have run
**Fix**: Close and reopen world

### Issue: Character sheet won't open

**Check**: Actor data structure may be corrupted
**Fix**:
1. Check console for specific errors
2. Verify actor has `system` property
3. Restore from backup if needed

### Issue: Console shows jQuery errors

**Check**: Old code trying to use jQuery
**Fix**: Notify developers, system will block jQuery usage

---

## Rollback Procedure

If upgrade goes wrong:

1. **Stop Foundry**
2. **Restore world backup**
   ```bash
   rm -rf /path/to/world
   cp -r /path/to/world.backup /path/to/world
   ```
3. **Downgrade Foundry** (if needed)
4. **Restart and test**

---

## Future Roadmap

### Q2 2026: Foundry v14 Support
- [ ] Test on v14
- [ ] Update sheets for v14 AppV2 changes
- [ ] Update data models
- [ ] Release v1.2.0

### Q3 2026: Enhanced Migrations
- [ ] Diagnostic tools
- [ ] Data validation
- [ ] Automatic repair

---

## For More Information

See `/ARCHITECTURE.md` for technical design.
See `/README.md` for user guides.
See `/SYSTEMS_AND_RULES.md` for game mechanics.

---

**Need Help?**
- Check `/HISTORY_AND_AUDITS.md` for historical context
- See `docs/_archive/` for old migration documentation
- Report issues with version and error message

