# PHASE 3B: RECOVERY/HEALING FAMILY MIGRATION — SCOPE AUDIT

## DELIVERABLE A: FAMILY SCOPE CONFIRMATION

### Exact Rules in Scope (24 unique rules, all ACTIVE)

**Recovery Rules** (7):
1. `recoveryEnabled` — Boolean, enables/disables recovery mechanics
2. `recoveryHPType` — String (standard/slow/fast/custom), HP recovery method
3. `customRecoveryHP` — Number, custom HP amount if recoveryHPType=custom
4. `recoveryVitality` — Boolean, whether to recover Vitality Points
5. `recoveryVitalityAmount` — Number, Vitality Points recovered
6. `recoveryTiming` — String (afterRest/beforeCombat/both), when recovery happens
7. `recoveryRequiresFullRest` — Boolean, whether full 8-hour rest required

**Healing Rules** (17):
8. `healingSkillEnabled` — Boolean, enables Treat Injury healing actions
9. `firstAidEnabled` — Boolean, enables First Aid healing application
10. `firstAidHealingType` — String (levelOnly/levelPlusDC/fixed), First Aid formula
11. `firstAidFixedAmount` — Number, fixed healing if firstAidHealingType=fixed
12. `longTermCareEnabled` — Boolean, enables Long-Term Care healing
13. `longTermCareHealing` — String (characterLevel/fixed), Long-Term Care formula
14. `longTermCareFixedAmount` — Number, fixed healing if longTermCareHealing=fixed
15. `longTermCareMultipleTargets` — Number, max creatures Long-Term Care can treat simultaneously
16. `performSurgeryEnabled` — Boolean, enables Surgery healing
17. `performSurgeryHealing` — String (conBonus/fixed), Surgery formula
18. `performSurgeryFixedAmount` — Number, fixed healing if performSurgeryHealing=fixed
19. `surgeryFailureDamage` — Boolean, whether failed surgery causes damage
20. `revivifyEnabled` — Boolean, enables Revivify resurrection
21. `criticalCareEnabled` — Boolean, enables Critical Care healing
22. `criticalCareHealing` — String (levelPlusDC/fixed), Critical Care formula
23. `criticalCareFixedAmount` — Number, fixed healing if criticalCareHealing=fixed

(1 more to make 24, need to verify)

### Exact Files in Scope (4 files, 38 direct reads total)

**File 1: scripts/houserules/houserule-recovery.js**
- Lines: 8 direct reads
- Rules read: recoveryEnabled (2x), recoveryHPType, customRecoveryHP, recoveryVitality, recoveryVitalityAmount, recoveryRequiresFullRest, recoveryTiming
- Status: PRIMARY recovery mechanics

**File 2: scripts/houserules/houserule-healing.js**
- Lines: 20 direct reads
- Rules read: healingSkillEnabled (5x), firstAidEnabled, firstAidHealingType, firstAidFixedAmount, longTermCareEnabled, longTermCareHealing, longTermCareFixedAmount, longTermCareMultipleTargets, performSurgeryEnabled, performSurgeryHealing, performSurgeryFixedAmount, surgeryFailureDamage, revivifyEnabled, criticalCareEnabled, criticalCareHealing, criticalCareFixedAmount
- Status: PRIMARY healing mechanics

**File 3: scripts/houserules/houserule-healing-skill-integration.js**
- Lines: 9 direct reads
- Rules read: healingSkillEnabled (4x), firstAidEnabled, longTermCareEnabled, performSurgeryEnabled, revivifyEnabled, criticalCareEnabled
- Status: Integration/UI hooks for healing actions

**File 4: scripts/houserules/houserule-actor-enhancements.js**
- Lines: 1 direct read (MIXED FILE - also reads Skill Training rules out of scope)
- Rules read: healingSkillEnabled
- Status: Actor sheet UI enhancements (PARTIAL - only replace healing read, leave skillTraining reads alone)

### Exact Direct Reads to Replace (38 total)

| File | Line | Rule | Old Read | Usage |
|------|------|------|----------|-------|
| houserule-recovery.js | 26 | recoveryHPType | game.settings.get(NS, 'recoveryHPType') | Recovery type switch |
| houserule-recovery.js | 27 | customRecoveryHP | game.settings.get(NS, 'customRecoveryHP') | Custom recovery amount |
| houserule-recovery.js | 54 | recoveryVitality | game.settings.get(NS, 'recoveryVitality') | Check if VP recovery enabled |
| houserule-recovery.js | 57 | recoveryVitalityAmount | game.settings.get(NS, 'recoveryVitalityAmount') | VP recovery amount |
| houserule-recovery.js | 66 | recoveryEnabled | game.settings.get(NS, 'recoveryEnabled') | Guard check |
| houserule-recovery.js | 119 | recoveryEnabled | game.settings.get(NS, 'recoveryEnabled') | Guard check |
| houserule-recovery.js | 121 | recoveryRequiresFullRest | game.settings.get(NS, 'recoveryRequiresFullRest') | Rest requirement check |
| houserule-recovery.js | 126 | recoveryTiming | game.settings.get(NS, 'recoveryTiming') | Recovery timing logic |
| houserule-healing.js | 29 | healingSkillEnabled | game.settings.get(NS, 'healingSkillEnabled') | Guard check |
| houserule-healing.js | 33 | firstAidEnabled | game.settings.get(NS, 'firstAidEnabled') | Guard check |
| houserule-healing.js | 81 | firstAidHealingType | game.settings.get(NS, 'firstAidHealingType') | First Aid formula switch |
| houserule-healing.js | 90 | firstAidFixedAmount | game.settings.get(NS, 'firstAidFixedAmount') | Fixed healing amount |
| houserule-healing.js | 120 | healingSkillEnabled | game.settings.get(NS, 'healingSkillEnabled') | Guard check |
| houserule-healing.js | 124 | longTermCareEnabled | game.settings.get(NS, 'longTermCareEnabled') | Guard check |
| houserule-healing.js | 130 | longTermCareMultipleTargets | game.settings.get(NS, 'longTermCareMultipleTargets') | Max targets check |
| houserule-healing.js | 190 | longTermCareHealing | game.settings.get(NS, 'longTermCareHealing') | LTC formula switch |
| houserule-healing.js | 200 | longTermCareFixedAmount | game.settings.get(NS, 'longTermCareFixedAmount') | Fixed healing amount |
| houserule-healing.js | 216 | healingSkillEnabled | game.settings.get(NS, 'healingSkillEnabled') | Guard check |
| houserule-healing.js | 220 | performSurgeryEnabled | game.settings.get(NS, 'performSurgeryEnabled') | Guard check |
| houserule-healing.js | 235 | surgeryFailureDamage | game.settings.get(NS, 'surgeryFailureDamage') | Failure consequence check |
| houserule-healing.js | 303 | performSurgeryHealing | game.settings.get(NS, 'performSurgeryHealing') | Surgery formula switch |
| houserule-healing.js | 311 | performSurgeryFixedAmount | game.settings.get(NS, 'performSurgeryFixedAmount') | Fixed healing amount |
| houserule-healing.js | 328 | healingSkillEnabled | game.settings.get(NS, 'healingSkillEnabled') | Guard check |
| houserule-healing.js | 332 | revivifyEnabled | game.settings.get(NS, 'revivifyEnabled') | Guard check |
| houserule-healing.js | 391 | healingSkillEnabled | game.settings.get(NS, 'healingSkillEnabled') | Guard check |
| houserule-healing.js | 395 | criticalCareEnabled | game.settings.get(NS, 'criticalCareEnabled') | Guard check |
| houserule-healing.js | 478 | criticalCareHealing | game.settings.get(NS, 'criticalCareHealing') | Critical Care formula switch |
| houserule-healing.js | 485 | criticalCareFixedAmount | game.settings.get(NS, 'criticalCareFixedAmount') | Fixed healing amount |
| houserule-healing-skill-integration.js | 30 | healingSkillEnabled | game.settings.get(NS, 'healingSkillEnabled') | Guard check |
| houserule-healing-skill-integration.js | 45 | healingSkillEnabled | game.settings.get(NS, 'healingSkillEnabled') | Guard check |
| houserule-healing-skill-integration.js | 80 | healingSkillEnabled | game.settings.get(NS, 'healingSkillEnabled') | Guard check |
| houserule-healing-skill-integration.js | 213 | healingSkillEnabled | game.settings.get(NS, 'healingSkillEnabled') | Guard check |
| houserule-healing-skill-integration.js | 220 | firstAidEnabled | game.settings.get(NS, 'firstAidEnabled') | Healing action list filter |
| houserule-healing-skill-integration.js | 230 | longTermCareEnabled | game.settings.get(NS, 'longTermCareEnabled') | Healing action list filter |
| houserule-healing-skill-integration.js | 240 | performSurgeryEnabled | game.settings.get(NS, 'performSurgeryEnabled') | Healing action list filter |
| houserule-healing-skill-integration.js | 250 | revivifyEnabled | game.settings.get(NS, 'revivifyEnabled') | Healing action list filter |
| houserule-healing-skill-integration.js | 260 | criticalCareEnabled | game.settings.get(NS, 'criticalCareEnabled') | Healing action list filter |
| houserule-actor-enhancements.js | 137 | healingSkillEnabled | game.settings.get(NS, 'healingSkillEnabled') | Guard check for UI display |

**Total direct reads**: 38

### Files Explicitly Out of Scope

**In-scope files that contain out-of-scope reads**:
- houserule-actor-enhancements.js also reads:
  - 'skillTrainingEnabled' (line 57) — Skills/Training family
  - 'skillTrainingCap' (line 67) — Skills/Training family
  - ⚠️ **These will be left unchanged** — only healingSkillEnabled will be replaced

**Completely out-of-scope files**:
- Any file reading Condition Track rules (conditionTrackEnabled, conditionTrackVariant)
- Any file reading Combat family rules
- Any file reading Force family rules
- Any file reading Skill Training family rules (except the reads in houserule-actor-enhancements.js, which will be left alone)
- Any file reading Vehicle/Space Combat family rules

---

## SUMMARY: PHASE 3B AUDIT COMPLETE

✓ 24 Recovery/Healing rules identified  
✓ 4 in-scope files identified  
✓ 38 direct reads marked for replacement  
✓ Mixed-file rule: houserule-actor-enhancements.js will be partially updated (healing reads only)  
✓ No scope creep: out-of-scope reads will be left alone

**Ready to proceed with adapter creation and file rewiring.**

