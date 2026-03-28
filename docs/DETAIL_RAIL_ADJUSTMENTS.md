# Detail Rail Adjustments Log

**Date:** 2026-03-28
**Phase:** Option C — Flow Testing & Adjustments
**Status:** TESTING IN PROGRESS

---

## Purpose

This document logs all issues found during flow testing and the adjustments made to fix them. As issues are discovered during real-world progression flows, they are documented here along with their resolutions.

---

## Adjustment Tracking Template

```markdown
### Adjustment [N]: [Title]

**Date Found:** YYYY-MM-DD
**During Test:** [Which flow test uncovered this]
**Issue Description:** [What the user saw / what was broken]
**Root Cause:** [Why it happened - normalizer bug, template error, step error]
**Component:** [normalizer / template / step / data]
**Severity:** [CRITICAL / HIGH / MEDIUM / LOW]

**Fix Applied:**
[Description of the fix]

**Files Modified:**
- [file1.js]
- [file2.hbs]

**Testing Verification:**
- [ ] Issue verified as fixed
- [ ] No regressions introduced
- [ ] Related flows still work

**Committed:** [Commit SHA]
**Status:** FIXED / PENDING
```

---

## Active Adjustments

*(Issues found and fixed during flow testing)*

---

## Completed Adjustments

*(Historical record of all fixes applied)*

---

## Known Limitations

These are by-design limitations that are not bugs:

### Limitation 1: Phase 2 Prerequisites Are Text-Only
**What:** Feats, talents, force powers, and other Phase 2 items show prerequisites as plain text.
**Why:** Structured prerequisite data does not exist in the source systems yet. Text-only prerequisites are shown honestly without implying validation.
**When Fixed:** Phase 3 (future work when structured prerequisites are added)
**Workaround:** None needed; text is clear and honest.

### Limitation 2: Limited Force Type Descriptions
**What:** Force Techniques (~40% coverage) and Force Secrets (~30% coverage) have sparse descriptions.
**Why:** Source material has incomplete descriptions. We never fabricate.
**When Fixed:** When source material is updated or curated descriptions are added
**Workaround:** "No description available." message is clear to users.

### Limitation 3: No Droid Systems Yet
**What:** Droid Systems detail panel is not implemented.
**Why:** Phase 3 deferred pending architecture review.
**When Fixed:** Phase 3 implementation
**Workaround:** Skip droid systems in heroic chargen until implemented.

### Limitation 4: No Skills Detail Panel in Work Surface
**What:** Individual skill detail views not available in skills work surface.
**Why:** Skills are currently informational reference, not selectable items. Full mechanics resolver ready if needed.
**When Fixed:** When/if skills become clickable for detail view
**Workaround:** Skills still show in work surface with training/untrain controls.

---

## Outstanding Questions

*(Issues that need investigation but aren't blocking)*

---

## Test Coverage Status

| Flow | Status | Notes |
|------|--------|-------|
| Species Selection | ⏳ PENDING | Ready to test |
| Class Selection | ⏳ PENDING | Ready to test |
| Background Selection | ⏳ PENDING | Ready to test |
| Attribute Assignment | ⏳ PENDING | Ready to test |
| Language Selection | ⏳ PENDING | Ready to test |
| Feat Selection | ⏳ PENDING | Ready to test |
| Talent Selection | ⏳ PENDING | Ready to test |
| Force Power Selection | ⏳ PENDING | Ready to test |
| Force Technique Selection | ⏳ PENDING | Ready to test |
| Force Secret Selection | ⏳ PENDING | Ready to test |
| Starship Maneuver Selection | ⏳ PENDING | Ready to test |

---

## Summary Statistics

- **Total Adjustments Made:** 0 (awaiting flow testing)
- **Critical Issues Found:** 0
- **High Priority Issues:** 0
- **Medium Priority Issues:** 0
- **Low Priority Issues:** 0
- **Known Limitations:** 4

---

## Next Steps

1. **Manual Flow Testing:** Execute tests from DETAIL_RAIL_FLOW_REVIEW.md
2. **Issue Documentation:** Log any issues found with this template
3. **Root Cause Analysis:** Determine if issue is in normalizer, template, or step
4. **Fix Implementation:** Apply fixes to problematic components
5. **Verification Testing:** Re-test flows to confirm fixes work
6. **Final Sign-Off:** Complete verification checklist in DETAIL_RAIL_FLOW_REVIEW.md

---

## Related Documents

- DETAIL_RAIL_FLOW_REVIEW.md — Detailed flow testing procedures
- DETAIL_RAIL_TEMPLATE_VERIFICATION.md — Template code review results
- DETAIL_RAIL_TEMPLATE_UPDATE_REPORT.md — Template update strategy
- DETAIL_RAIL_IMPLEMENTATION_REPORT.md — Complete implementation notes
- detail-rail-normalizer.js — Normalization logic source
- skills-mechanics-resolver.js — Skills mechanics source

---

## Sign-Off

**Template Updates Complete:** ✅ Yes (Option A finished)
**Flow Testing Status:** ⏳ In Progress (Option C started)
**Adjustments Needed:** 0 (to be determined during testing)
**Ready for Summary Integration:** ❌ Pending flow testing completion

---

**Last Updated:** 2026-03-28
**Status:** AWAITING MANUAL FLOW TESTING
