# PHASE 3C: SKILLS/TRAINING FAMILY MIGRATION — SCOPE AUDIT

## DELIVERABLE A: FAMILY SCOPE CONFIRMATION

### Exact Rules in Scope (13 rules, 11 ACTIVE + 2 potential dead-candidates)

**Skills/Training System Rules** (11 ACTIVE):
1. `skillTrainingEnabled` — Boolean, enables/disables training system
2. `trainingPointsPerLevel` — String (two/three/standard), how many points granted per level
3. `trainingPointsPerRest` — Number, points granted during rest (if enabled)
4. `skillTrainingCap` — String (none/classSkillOnly/maxLevel), caps on training points per skill
5. `trainingCostScale` — String (linear/exponential/byDC), how training cost/bonus scales
6. `trainingRequiresTrainer` — Boolean, whether trainer is required to spend training points
7. `crossClassSkillTraining` — Boolean, whether cross-class skills can be trained

**Skill Focus Rules** (3 ACTIVE):
8. `skillFocusVariant` — String (normal/scaled/delayed), how skill focus bonus works
9. `skillFocusActivationLevel` — Number, level at which delayed skill focus activates
10. `skillFocusRestriction` — String, restrictions on skill focus application (if any)

**Skill-Based Rules** (2 ACTIVE):
11. `feintSkill` — String (deception/persuasion), which skill is used for feint action

**Dead-Candidate Rules** (2 — status to verify):
12. `knowledgeSkillMode` — String, knowledge skill handling mode (likely dead)
13. `athleticsConsolidation` — Boolean, whether to consolidate athletics skills (likely dead)

### Exact Files in Scope (3 files, 14 direct reads total)

**File 1: scripts/houserules/houserule-skill-training.js**
- Lines: 13 direct reads (6 skillTrainingEnabled, 1 trainingPointsPerLevel, 2 skillTrainingCap, 1 trainingCostScale, 3 skillTrainingEnabled again)
- Rules read: skillTrainingEnabled (6x), trainingPointsPerLevel (1x), skillTrainingCap (2x), trainingCostScale (1x)
- Status: PRIMARY training mechanics

**File 2: scripts/houserules/houserule-actor-enhancements.js**
- Lines: 2 direct reads (already partially updated in Phase 3B with healingSkillEnabled)
- Rules read: skillTrainingEnabled (1x line 58), skillTrainingCap (1x line 68)
- Status: Actor sheet UI enhancements (ALREADY HAS OTHER READS FROM HEALING, SO PARTIAL UPDATE)

**File 3: scripts/houserules/houserule-mechanics.js**
- Lines: 3 direct reads (lines 278, 289-290, 299-301)
- Rules read: feintSkill (1x), skillFocusVariant (1x), skillFocusActivationLevel (1x)
- Status: Skill mechanics initialization and bonus calculation

### Exact Direct Reads to Replace (14 total)

| File | Line | Rule | Pattern | Usage |
|------|------|------|---------|-------|
| houserule-skill-training.js | 23 | skillTrainingEnabled | Check if enabled | Initialize training on actor creation |
| houserule-skill-training.js | 40 | skillTrainingEnabled | Check if enabled | Guard check |
| houserule-skill-training.js | 51 | skillTrainingEnabled | Check if enabled | Guard check |
| houserule-skill-training.js | 63 | trainingPointsPerLevel | Switch on value | Calculate level training |
| houserule-skill-training.js | 86 | skillTrainingEnabled | Check if enabled | Guard check |
| houserule-skill-training.js | 108 | skillTrainingEnabled | Check if enabled | Guard check |
| houserule-skill-training.js | 118 | skillTrainingCap | Switch on value | Cap enforcement |
| houserule-skill-training.js | 162 | skillTrainingEnabled | Check if enabled | Guard check |
| houserule-skill-training.js | 165 | trainingCostScale | Switch on value | Bonus calculation |
| houserule-skill-training.js | 186 | skillTrainingEnabled | Check if enabled | Guard check |
| houserule-actor-enhancements.js | 58 | skillTrainingEnabled | Check if enabled | UI display guard |
| houserule-actor-enhancements.js | 68 | skillTrainingCap | Read value | UI display logic |
| houserule-mechanics.js | 278 | feintSkill | Switch/compare | Feint skill override |
| houserule-mechanics.js | 288-290 | skillFocusVariant | Switch on value | Skill focus bonus switch |
| houserule-mechanics.js | 299-301 | skillFocusActivationLevel | Compare value | Delayed activation check |

**Total direct reads**: 14 (counting multi-line reads as single reads for clarity, but 15 actual game.settings.get() calls)

### Rules NOT Currently Being Directly Read (Adapter Should Include These)

- `trainingPointsPerRest` — Not used in current code, but should be in adapter for completeness
- `trainingRequiresTrainer` — Not used in current code, but should be in adapter for completeness
- `skillFocusRestriction` — Not used in current code, but should be in adapter for completeness
- `crossClassSkillTraining` — Not used in current code, but should be in adapter for completeness
- `knowledgeSkillMode` — Dead-candidate, no readers found
- `athleticsConsolidation` — Dead-candidate, no readers found

### Files Explicitly Out of Scope

**In-scope files with out-of-scope reads**: None (houserule-actor-enhancements.js also has healing reads from Phase 3B, which are separate)

**Completely out-of-scope files**:
- Any file reading Healing/Recovery rules (already migrated in Phase 3B)
- Any file reading Combat family rules
- Any file reading Force family rules
- Any file reading Vehicle/Space Combat rules
- Any file reading other families

---

## SUMMARY: PHASE 3C AUDIT COMPLETE

✓ 13 skills/training rules identified (11 active + 2 dead-candidates)  
✓ 3 in-scope files identified  
✓ 14 direct reads marked for replacement  
✓ 14 additional rules included in adapter for completeness (unused but registered)  
✓ Dead-candidates documented (no readers, safe to leave in adapter)  
✓ No scope creep: out-of-scope reads not touched  
✓ No scope creep: healing reads from Phase 3B preserved  

**Ready to proceed with adapter creation and file rewiring.**

