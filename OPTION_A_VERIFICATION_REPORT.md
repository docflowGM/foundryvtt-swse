# Option A Verification Report: Encounter-Limited Rerolls

**Date:** 2026-05-11  
**Task:** Verify encounter-limit enforcement for Lucky Shot, Reactive Awareness, Reactive Stealth, Stealthy  
**Scope:** Scripts/engine resolvers + packs/feats.db metadata

---

## Verification Results

### Metadata Status ✅
All 4 feats have proper metadata structure:

| Feat | Type | oncePer | Consumer | Status |
|------|------|---------|----------|--------|
| Lucky Shot | attackRerolls | "encounter" | MetaResourceFeatResolver.getAttackRerollRules() | ✅ Present |
| Reactive Awareness | skillRerolls | "encounter" | SkillFeatResolver.getSkillRerollOptions() | ✅ Present |
| Reactive Stealth | skillRerolls | "encounter" | SkillFeatResolver.getSkillRerollOptions() | ✅ Present |
| Stealthy | skillRerolls + skillCheckBonuses | "encounter" | SkillFeatResolver (both) | ✅ Present |

### Consumer Integration ✅
Both resolver files properly read and pass metadata to chat:

**MetaResourceFeatResolver.getAttackRerollRules()** (line 271)
- ✅ Reads `item.system.abilityMeta.attackRerolls` array
- ✅ Includes `oncePer` in output object (line 264)
- ✅ Calls `buildAttackRerollChatOptions()` to construct UI

**SkillFeatResolver.getSkillRerollOptions()** (line 244)
- ✅ Reads `item.system.abilityMeta.skillRerolls` array
- ✅ Includes `oncePer` in output object (line 264)
- ✅ Calls `buildRerollChatOptions()` to construct UI

**SkillFeatResolver.getSkillCheckBonuses()** (line 211)
- ✅ Reads `item.system.abilityMeta.skillCheckBonuses` array
- ✅ Properly applies context-flag filtering
- ✅ Stealthy bonus (+2) correctly implemented

### Reroll Button Behavior ✅
**MetaResourceFeatResolver.resolveAttackRerollButton()** (line 288)
- ✅ Executes reroll roll
- ✅ Posts chat message with result
- ✅ **Disables button after use** (line 360): `button.disabled = true`
- ❌ No `oncePer` enforcement logic

**SkillFeatResolver.resolveChatRerollButton()** (line 313)
- ✅ Executes reroll roll
- ✅ Posts chat message with result
- ✅ **Disables button after use** (line 348): `button.disabled = true`
- ❌ No `oncePer` enforcement logic

### Encounter Limit Enforcement ❌

**Search Results:**
- No code in `/scripts/` checks or enforces `oncePer` constraints
- The `oncePer` field is present in metadata but **never evaluated** during button clicks
- No dedicated encounter tracking system found (`grep encounter*` returns only text references and species-trait system for activated abilities)
- Button disable is **UI-level only**: prevents clicking the same button twice in one chat message, not encounter-aware

**Current Behavior:**
```
User rolls skill → Reroll button appears
User clicks reroll → Button executes, then disables (line 348/360)
Encounter ends → New encounter starts
User makes new roll → NEW reroll button appears (from getSkillRerollOptions)
User clicks new button → Reroll executes again
```

**Verdict:** `oncePer: "encounter"` is **metadata without enforcement**. The system relies on **GM judgment** to prevent re-use across encounters.

---

## Recommendation for Phase 12 Close-out

### Status: **KEEP CAUTIOUS NAMING**

Do NOT change feat statuses from `_encounter_limit` to `_implemented` because:
1. ✅ Metadata structure is correct and consumed by resolvers
2. ✅ Basic button-disable UX prevents accidental double-use within same roll
3. ❌ True encounter-limit enforcement does not exist
4. ❌ System relies on GM to prevent re-use across encounters

### Action: **UPDATE RULE NOTES (Optional but Honest)**

For each of the 4 feats, add a rule note clarifying the limitation:

```json
{
  "ruleNotes": [
    {
      "id": "encounter_limit_note",
      "label": "Encounter Limit (GM-Enforced)",
      "text": "Reroll button disables after use. On new encounter, new roll automatically generates a fresh reroll option. Ensure this feat is used once per encounter only.",
      "mechanical": false,
      "gmEnforced": true
    }
  ]
}
```

This documents the behavior transparently without claiming full automation.

---

## Files Verified

**Resolvers (read-only, no changes):**
- ✅ `scripts/engine/feats/meta-resource-feat-resolver.js` (lines 230-280, 288-386)
- ✅ `scripts/engine/skills/skill-feat-resolver.js` (lines 211-270, 300-374)

**Pack (status quo):**
- ✅ `packs/feats.db` — 4 feats, all have correct metadata structure and `oncePer` field

---

## Next Steps

### Option: Mark as Ready (No Code Changes)
- Leave feat statuses as `_encounter_limit` (already honest naming)
- No changes required
- Proceed to Option B (Tech Specialist TS-1) or other Phase 12 work

### Option: Add GM Note (Honest Improvement)
- Update rule notes in feats.db for all 4 feats
- Clarify: "Encounter limit: GM-enforced"
- Makes the limitation explicit without claiming false automation

**Recommendation:** Option 1 (no changes). The status names already contain "encounter_limit" which truthfully indicates this is a known constraint. Moving these to fully-implemented status would be misleading.

---

## Conclusion

Lucky Shot, Reactive Awareness, Reactive Stealth, and Stealthy are **metadata-correct and resolver-integrated, but encounter-limit enforcement is not automated—it is GM-enforced**. Keeping the current cautious status naming is the honest choice.

**This disqualifies Option A from the recommended patch bucket.** These feats are already in the most correct state possible without adding encounter tracking infrastructure (which would be out of scope for Phase 12).

**Recommend instead:** Proceed directly to **Focused Rage clarification** (document context-flag requirement) or **Tech Specialist TS-1** as the next real work.
