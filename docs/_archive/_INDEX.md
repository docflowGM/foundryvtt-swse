# 📦 Archived Documentation Index

**Status**: Historical Reference Only

⚠️ **IMPORTANT**: These documents do NOT reflect current system behavior. They are preserved for reference and context only.

The current, authoritative documentation is in:
- `/README.md` - Project entry point
- `/ARCHITECTURE.md` - System architecture
- `/SYSTEMS_AND_RULES.md` - Game mechanics
- `/MIGRATIONS_AND_COMPATIBILITY.md` - Upgrade guides
- `/HISTORY_AND_AUDITS.md` - Historical analyses

---

## Archive Organization

### 📊 audit-reports/ (Performance & Quality Reports)
Contains:
- All AUDIT_*.md files
- All *_AUDIT_*.md files
- VERIFICATION_*.md files
- Quality assurance reports

**Use case**: Reviewing past quality scans or verification results.

---

### 📈 performance-reports/ (Test Results & Verification)
Contains:
- TEST_*.md files
- VERIFICATION_*.md completion reports
- Performance metrics from past sessions

**Use case**: Understanding historical performance baselines.

---

### 📋 implementation-summaries/ (Past Implementation Status)
Contains:
- All PHASE_*_SUMMARY.md files
- All IMPLEMENTATION_SUMMARY.md files
- COMPLETION_SUMMARY.md reports
- STATUS_*.md snapshots

**Use case**: Understanding what was completed in each phase.

---

### 🔍 postmortem-analysis/ (Deep-Dive Analysis)
Contains:
- CHARGEN_POSTMORTEM_ANALYSIS.md
- LEVELUP_CHARGEN_ANALYSIS.md
- CHARACTER_SHEET_ANALYSIS.md
- PROGRESSION_ENGINE_ANALYSIS.md
- PREREQUISITE_ENGINE_ANALYSIS.md
- ORPHANED_FILES_ANALYSIS.md
- HOOK_ANALYSIS.md

**Use case**: Understanding complex decisions behind current architecture.

---

### 📝 session-logs/ (Development Sessions)
Contains:
- SESSION_LOG.md - Development notes
- HANDOFF_*.md - Developer handoff notes

**Use case**: Context about how decisions were made.

---

### 🛠️ implementation-details/ (Old Implementation Docs)
Contains:
- PHASE_*.md (old phase-specific docs)
- PROGRESSION_*.md (old progression system docs)
- TALENT_*.md (old talent implementation docs)
- LEVELUP_*.md (old levelup analysis)
- CHARGEN_*.md (old chargen analysis)
- TEMPLATE_ID_CONVERSION_*.md (old migration docs)
- SSOT_*.md (old SSOT refactoring docs)
- *_IMPLEMENTATION_*.md (old implementation guides)
- *_ROADMAP.md (old roadmaps)

**Use case**: Historical context about how systems were built.

---

## What to Read First (If Investigating)

1. **For architecture questions**: See `/ARCHITECTURE.md` (current truth)
2. **For how decisions were made**: See `postmortem-analysis/` (context)
3. **For game rules**: See `/SYSTEMS_AND_RULES.md` (current truth)
4. **For upgrade advice**: See `/MIGRATIONS_AND_COMPATIBILITY.md` (current truth)
5. **For everything else**: Check the 5 canonical docs first

---

## Consolidated Into Living Docs

✅ All progression logic → `/SYSTEMS_AND_RULES.md`
✅ All talent/feat mechanics → `/SYSTEMS_AND_RULES.md`
✅ All architecture rules → `/ARCHITECTURE.md`
✅ All migration guides → `/MIGRATIONS_AND_COMPATIBILITY.md`
✅ All user guides → `/README.md`

---

## Search Tips

From repository root:

```bash
# Search archived docs only
grep -r "search-term" docs/_archive/

# Search canonical docs only (current truth)
grep -r "search-term" . --include="*.md" \
  --exclude-dir=_archive \
  --exclude-dir=_historical \
  docs/
```

---

## When to Use Archive

✅ Investigating "why was this decision made?"
✅ Understanding historical context
✅ Researching old implementation approaches
✅ Training new developers on past work

❌ Don't use for current system truth
❌ Don't link to archived docs from active code
❌ Don't make decisions based on archived content

---

**Last Updated**: 2026-02-09
**Reason**: Documentation consolidation for clarity
**Authoritative Source**: See /README.md for current documentation
