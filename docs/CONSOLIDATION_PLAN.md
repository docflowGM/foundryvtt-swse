# Documentation Consolidation Plan

**Status**: 🔄 IN PROGRESS

This document tracks the consolidation of 230+ markdown files into 5 canonical living documents.

---

## Target State: 5 Canonical Documents

### 1. `README.md` — Project Entry Point
**Audience:** Users, GMs, Contributors
**Kept Living:** YES

Merges in:
- GETTING_STARTED.md
- QUICK_START.md
- FEATURES.md
- FEATURES_GUIDE.md
- USER_GUIDE.md
- FAQ.md
- FOUNDRY_COMPAT.md
- V14_READINESS.md
- ABOUT.md

---

### 2. `ARCHITECTURE.md` — The Law
**Audience:** Developers
**Kept Living:** YES

Merges in:
- DATA_MODEL.md
- NAMESPACE.md
- OWNERSHIP.md
- EXECUTION_PIPELINE.md
- PARTIAL-PURITY.md
- WIRING_CHECKLIST.md
- PHASE_1A_ARCHITECTURE.md
- PHASE_3_DESIGN_AND_ARCHITECTURE.md
- CHARGEN_ARCHITECTURE.md
- ARCHETYPE_INTEGRATION_GUIDE.md
- ARCHITECTURE_MUTATION_RULES.md

---

### 3. `SYSTEMS_AND_RULES.md` — Game Logic & Mechanics
**Audience:** Developers + Advanced GMs
**Kept Living:** YES

Merges in:
- All PROGRESSION_*.md files
- All LEVELUP_*.md files
- All ADVANCEMENT_*.md files
- All TALENT_*.md files
- All FEATS_*.md files
- MULTI-OPTION-TALENTS.md
- DARK_SIDE_TALENTS.md
- FORCE_POWER_SYSTEM_IMPLEMENTATION.md
- MENTOR_SYSTEM_*.md
- VEHICLE_*.md
- STARSHIP_*.md
- PREREQUISITE_*.md
- SUGGESTION_ENGINE_API.md

---

### 4. `MIGRATIONS_AND_COMPATIBILITY.md` — Time Travel Safety
**Audience:** Maintainers
**Kept Living:** YES

Merges in:
- V1_RETIREMENT_CHECKLIST.md
- V2_MIGRATION_IMPLEMENTATION_PLAN.md
- FOUNDRY-UPGRADE-CHECKLIST.md
- migrations/readme.md
- All TEMPLATE_ID_CONVERSION_*.md
- All V2_*.md migration docs
- SYSTEM_INITIALIZATION_GUIDE.md

---

### 5. `HISTORY_AND_AUDITS.md` — Archive (Non-Authoritative)
**Audience:** You (and future developers)
**Kept Living:** YES (but frozen)

Header: ⚠️ **This document is historical. It does NOT reflect current system behavior.**

Merges in:
- ALL audit reports
- ALL postmortem/analysis docs
- ALL verification reports
- ALL implementation summaries tied to past phases
- Session logs
- Phase completion summaries

---

## Consolidation Checklist

### Phase 1: Create Empty Canonical Docs
- [ ] Create `ARCHITECTURE.md` (if not exists)
- [ ] Create `SYSTEMS_AND_RULES.md`
- [ ] Create `MIGRATIONS_AND_COMPATIBILITY.md`
- [ ] Create `HISTORY_AND_AUDITS.md`

### Phase 2: Move Old Docs to Archive
- [ ] Archive all AUDIT_* files → `_archive/`
- [ ] Archive all REPORT_* files → `_archive/`
- [ ] Archive all POSTMORTEM_* files → `_archive/`
- [ ] Archive all SUMMARY_* files (except active) → `_archive/`
- [ ] Archive all SESSION_* files → `_archive/`
- [ ] Archive all QA_* files → `_archive/`

### Phase 3: Consolidate Content
- [ ] Merge GETTING_STARTED, QUICK_START → README.md
- [ ] Merge FEATURES, FAQ → README.md
- [ ] Merge all PROGRESSION_* → SYSTEMS_AND_RULES.md
- [ ] Merge all TALENT_* → SYSTEMS_AND_RULES.md
- [ ] Merge all V1/V2 migration docs → MIGRATIONS_AND_COMPATIBILITY.md
- [ ] Move all old phase reports → HISTORY_AND_AUDITS.md

### Phase 4: Verify & Clean
- [ ] Verify no broken links
- [ ] Verify canonical docs are complete
- [ ] Verify archive is organized
- [ ] Commit consolidation
- [ ] Update `.gitignore` if needed

---

## Archive Organization

```
docs/_archive/
├─ audit-reports/          # All AUDIT_* and *_AUDIT_*.md
├─ performance-reports/    # PERFORMANCE_*, TEST_*, VERIFICATION_*
├─ implementation-summaries/ # PHASE_*_SUMMARY, IMPLEMENTATION_SUMMARY
├─ postmortem-analysis/    # POSTMORTEM_*, ANALYSIS_*, _ANALYSIS.md
├─ session-logs/           # SESSION_*, HANDOFF_*
├─ deprecated-systems/     # Old unused feature docs
└─ tools-and-scripts/      # Tool-specific docs that aren't active

docs/_historical/
└─ _INDEX.md              # Guide to what's archived and why
```

---

## Files to Keep at Root

✅ README.md (canonical)
✅ ARCHITECTURE.md (canonical)
✅ SYSTEMS_AND_RULES.md (canonical)
✅ MIGRATIONS_AND_COMPATIBILITY.md (canonical)
✅ HISTORY_AND_AUDITS.md (canonical)

---

## Active Work Docs (Stay in /docs)

✅ CHANGELOG.md (active)
✅ CONTRIBUTING.md (stays)
✅ Design.md (stays)
✅ Rules.md (stays, links to main docs)
✅ migrations/readme.md (stays, reference)
✅ tests/README.md (stays, reference)

---

## Next Steps

1. Merge current hardening work to main
2. Create 5 canonical doc stubs
3. Start content consolidation (no rush)
4. Move old docs to archive
5. Add migration guide to main README

---

**Started**: 2026-02-09
**Expected Completion**: Over 1-2 weeks (not urgent)
**Impact**: Better clarity, no user impact
