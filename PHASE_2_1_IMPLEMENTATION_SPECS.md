# PHASE 2.1 CLOSURE - IMPLEMENTATION SPECIFICATIONS

**Status**: Ready for Implementation
**Scope**: 5 Code Changes
**Complexity**: Medium
**Test Coverage**: High

---

## CHANGE 1: SuggestionEngine - Tree Authority Filtering

### File
`/home/user/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngine.js`

### Lines
153-202

### Current Code
```javascript
static async suggestTalents(talents, actor, pendingData = {}, options = {}) {
    const actorState = this._buildActorState(actor, pendingData);

    // Get or compute build intent
    let buildIntent = options.buildIntent;
    if (!buildIntent) {
        try {
            buildIntent = await BuildIntent.analyze(actor, pendingData);
        } catch (err) {
            SWSELogger.warn('SuggestionEngine | Failed to analyze build intent:', err);
            const mentorBiases = actor.system?.swse?.mentorBuildIntentBiases || {};
            buildIntent = mentorBiases && Object.keys(mentorBiases).length > 0
                ? { mentorBiases }
                : null;
        }
    }

    return talents.map(talent => {
        // Only suggest for qualified talents
        if (talent.isQualified === false) {
            if (options.includeFutureAvailability) {
                const futureScore = this._scoreFutureAvailability(
                    talent, actor, actorState, buildIntent, pendingData
                );
                return {
                    ...talent,
                    suggestion: futureScore,
                    isSuggested: futureScore && futureScore.tier > 0,
                    currentlyUnavailable: true,
                    futureAvailable: !!futureScore
                };
            }
            return {
                ...talent,
                suggestion: null,
                isSuggested: false
            };
        }

        const suggestion = this._evaluateTalent(talent, actorState, buildIntent, actor, pendingData);
        return {
            ...talent,
            suggestion,
            isSuggested: suggestion.tier > 0
        };
    });
}
```

### Required Changes

**Step 1**: Add import at top of file (around line 28-33):
```javascript
import { getAllowedTalentTrees } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js";
```

**Step 2**: Replace suggestTalents() method (lines 153-202):
```javascript
static async suggestTalents(talents, actor, pendingData = {}, options = {}) {
    const actorState = this._buildActorState(actor, pendingData);

    // Get or compute build intent
    let buildIntent = options.buildIntent;
    if (!buildIntent) {
        try {
            buildIntent = await BuildIntent.analyze(actor, pendingData);
        } catch (err) {
            SWSELogger.warn('SuggestionEngine | Failed to analyze build intent:', err);
            const mentorBiases = actor.system?.swse?.mentorBuildIntentBiases || {};
            buildIntent = mentorBiases && Object.keys(mentorBiases).length > 0
                ? { mentorBiases }
                : null;
        }
    }

    // ========== PHASE 2.1: TREE AUTHORITY FILTERING ==========
    // Filter candidate pool by derived authority BEFORE scoring
    // Heroic slot is used for suggestions (broadest valid access)
    const heroicSlot = { slotType: 'heroic' };
    const allowedTrees = getAllowedTalentTrees(actor, heroicSlot);

    const accessibleTalents = talents.filter(talent => {
        // Get talent's tree ID (multiple possible field names for compatibility)
        const treeId = talent.system?.talent_tree ||
                       talent.system?.talentTree ||
                       talent.system?.tree;

        // Talents without a tree are always accessible
        if (!treeId) return true;

        // Only include talents whose tree is in allowed list
        const isAccessible = allowedTrees.includes(treeId);

        if (!isAccessible) {
            SWSELogger.log(
                `[SuggestionEngine.suggestTalents] Filtering out inaccessible talent: ` +
                `"${talent.name}" (tree: "${treeId}", allowed: ${allowedTrees.join(', ')})`
            );
        }

        return isAccessible;
    });

    SWSELogger.log(
        `[SuggestionEngine.suggestTalents] Authority filtering: ${talents.length} total → ` +
        `${accessibleTalents.length} accessible (allowed trees: ${allowedTrees.join(', ')})`
    );
    // =========================================================

    return accessibleTalents.map(talent => {
        // Only suggest for qualified talents
        if (talent.isQualified === false) {
            if (options.includeFutureAvailability) {
                const futureScore = this._scoreFutureAvailability(
                    talent, actor, actorState, buildIntent, pendingData
                );
                return {
                    ...talent,
                    suggestion: futureScore,
                    isSuggested: futureScore && futureScore.tier > 0,
                    currentlyUnavailable: true,
                    futureAvailable: !!futureScore
                };
            }
            return {
                ...talent,
                suggestion: null,
                isSuggested: false
            };
        }

        const suggestion = this._evaluateTalent(talent, actorState, buildIntent, actor, pendingData);
        return {
            ...talent,
            suggestion,
            isSuggested: suggestion.tier > 0
        };
    });
}
```

### Verification
After change:
- Suggestions only include talents in `getAllowedTalentTrees()`
- Inaccessible talents logged but never scored
- Empty suggestion list if all talents filtered (acceptable - actor has no access)

---

## CHANGE 2: Level-Up Talents - Unified Slot Validation

### File
`/home/user/foundryvtt-swse/scripts/apps/levelup/levelup-talents.js`

### Lines
559-572 (selectTalent function)

### Current Code
```javascript
export function selectTalent(talentName, talentData, actor, pendingData) {
  const talent = talentData.find(t => t.name === talentName);
  if (!talent) {return null;}

  // Check prerequisites
  const check = checkTalentPrerequisites(talent, actor, pendingData);
  if (!check.valid) {
    ui.notifications.warn(`Cannot select ${talentName}: ${check.reasons.join(', ')}`);
    return null;
  }

  SWSELogger.log(`SWSE LevelUp | Selected talent: ${talentName}`);
  return talent;
}
```

### Required Changes

**Step 1**: Add imports at top of file (after existing imports):
```javascript
import { TalentSlotValidator } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/slot-validator.js";
import { getAllowedTalentTrees } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js";
```

**Step 2**: Replace selectTalent() function (lines 559-572):
```javascript
export function selectTalent(talentName, talentData, actor, pendingData) {
  const talent = talentData.find(t => t.name === talentName);
  if (!talent) {return null;}

  // ========== PHASE 2.1: UNIFIED SLOT VALIDATION ==========
  // Validate using the same path as chargen
  // Determine slot type: heroic is default, class if in class-level progression
  const isClassTalent = pendingData?.isClassTalent || false;
  const slotType = isClassTalent ? 'class' : 'heroic';

  // Get current class context if available
  const classId = pendingData?.classId || null;

  const slot = {
    slotType,
    classId,
    consumed: false
  };

  // Validate talent for this slot using unified validator
  const validation = TalentSlotValidator.validateTalentForSlot(
    talent,
    slot,
    [],  // unlockedTrees - derived from actor via getAllowedTalentTrees
    { _actor: actor, ...pendingData }
  );

  if (!validation.valid) {
    SWSELogger.log(
      `[LEVELUP-TALENTS] selectTalent: Tree authority FAILED for "${talentName}": ${validation.message}`
    );
    ui.notifications.warn(`Cannot select ${talentName}: ${validation.message}`);
    return null;
  }

  SWSELogger.log(
    `[LEVELUP-TALENTS] selectTalent: Tree authority PASSED for "${talentName}"`
  );
  // =========================================================

  // Check prerequisites (existing logic, kept for completeness)
  const check = checkTalentPrerequisites(talent, actor, pendingData);
  if (!check.valid) {
    ui.notifications.warn(`Cannot select ${talentName}: ${check.reasons.join(', ')}`);
    return null;
  }

  SWSELogger.log(`SWSE LevelUp | Selected talent: ${talentName}`);
  return talent;
}
```

### Verification
After change:
- selectTalent() uses TalentSlotValidator same as chargen
- getAllowedTalentTrees() called via validator
- Both tree authority AND prerequisites checked
- Inaccessible talents rejected with clear message

---

## CHANGE 3: Drop Handler - Manual Talent Validation

### File
`/home/user/foundryvtt-swse/scripts/drag-drop/drop-handler.js`

### Lines
470-490 (handleTalentDrop function)

### Current Code
```javascript
static async handleTalentDrop(actor, talent) {
  // Add talent:
  // - Check tree prerequisites
  // - Validate class access
  // - Apply bonuses

  // Check if already has talent
  const existingTalent = actor.items.find(i =>
    i.type === 'talent' && i.name === talent.name
  );

  if (existingTalent) {
    ui.notifications.warn(`${actor.name} already has ${talent.name}`);
    return false;
  }

  // PHASE 8: Use ActorEngine for atomic creation
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', [talent.toObject()]);
  ui.notifications.info(`${actor.name} gained talent: ${talent.name}`);
  return true;
}
```

### Required Changes

**Step 1**: Add imports at top of file (after existing imports):
```javascript
import { TalentSlotValidator } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/slot-validator.js";
import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js";
```

**Step 2**: Replace handleTalentDrop() function (lines 470-490):
```javascript
static async handleTalentDrop(actor, talent) {
  // Add talent:
  // - Validate tree authority
  // - Check prerequisites
  // - Prevent duplicates

  // Check if already has talent
  const existingTalent = actor.items.find(i =>
    i.type === 'talent' && i.name === talent.name
  );

  if (existingTalent) {
    ui.notifications.warn(`${actor.name} already has ${talent.name}`);
    return false;
  }

  // ========== PHASE 2.1: AUTHORITY VALIDATION ==========
  // Manual drops are treated as heroic-level access (broadest valid restrictions)
  const slot = {
    slotType: 'heroic',
    consumed: false
  };

  // Validate tree authority using unified validator
  const treeValidation = TalentSlotValidator.validateTalentForSlot(
    talent,
    slot,
    [],  // unlockedTrees - derived via getAllowedTalentTrees
    { _actor: actor }
  );

  if (!treeValidation.valid) {
    ui.notifications.error(
      `Cannot add ${talent.name} to ${actor.name}: ${treeValidation.message}`
    );
    return false;
  }

  // Also validate prerequisites
  const prereqCheck = PrerequisiteChecker.checkTalentPrerequisites(actor, talent, {});
  if (!prereqCheck.met) {
    ui.notifications.error(
      `Cannot add ${talent.name}: ${prereqCheck.missing.join(', ')}`
    );
    return false;
  }
  // ====================================================

  // PHASE 8: Use ActorEngine for atomic creation
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', [talent.toObject()]);
  ui.notifications.info(`${actor.name} gained talent: ${talent.name}`);
  return true;
}
```

### Verification
After change:
- Manual talent drops validated through unified path
- Tree authority checked before creation
- Prerequisites checked before creation
- Inaccessible talents rejected with clear error

---

## CHANGE 4: Chargen - Domain Cleanup on Feat Removal

### File
`/home/user/foundryvtt-swse/scripts/apps/chargen/chargen-feats-talents.js`

### Lines
411-456 (_onRemoveFeat function)

### Current Code
```javascript
export async function _onRemoveFeat(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.featid;

  // Find the feat being removed
  const removedFeat = this.characterData.feats.find(f => f._id === id || f.name === id);

  // If it's a Skill Focus feat, unfocus the skill
  if (removedFeat && removedFeat.name.toLowerCase().includes('skill focus')) {
    // Parse the focused skill from the description
    const descMatch = removedFeat.system?.description?.match(/<strong>Focused Skill:<\/strong>\s*(.+?)(?:<|$)/);
    if (descMatch) {
      const focusedSkillName = descMatch[1].trim();

      // Find the skill key by name
      const skillNames = {
        'Acrobatics': 'acrobatics',
        'Climb': 'climb',
        'Deception': 'deception',
        'Endurance': 'endurance',
        'Gather Information': 'gatherInfo',
        'Initiative': 'initiative',
        'Jump': 'jump',
        'Mechanics': 'mechanics',
        'Perception': 'perception',
        'Persuasion': 'persuasion',
        'Pilot': 'pilot',
        'Stealth': 'stealth',
        'Survival': 'survival',
        'Swim': 'swim',
        'Treat Injury': 'treatInjury',
        'Use Computer': 'useComputer',
        'Use the Force': 'useTheForce'
      };

      const skillKey = skillNames[focusedSkillName];
      if (skillKey && this.characterData.skills[skillKey]) {
        this.characterData.skills[skillKey].focused = false;
        ui.notifications.info(`Removed Skill Focus from ${focusedSkillName}`);
      }
    }
  }

  this.characterData.feats = this.characterData.feats.filter(f => f._id !== id && f.name !== id);
  await this.render();
}
```

### Required Changes

Replace _onRemoveFeat() function (lines 411-456):
```javascript
export async function _onRemoveFeat(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.featid;

  // Find the feat being removed
  const removedFeat = this.characterData.feats.find(f => f._id === id || f.name === id);

  if (!removedFeat) {return;}

  // If it's a Skill Focus feat, unfocus the skill
  if (removedFeat.name.toLowerCase().includes('skill focus')) {
    // Parse the focused skill from the description
    const descMatch = removedFeat.system?.description?.match(/<strong>Focused Skill:<\/strong>\s*(.+?)(?:<|$)/);
    if (descMatch) {
      const focusedSkillName = descMatch[1].trim();

      // Find the skill key by name
      const skillNames = {
        'Acrobatics': 'acrobatics',
        'Climb': 'climb',
        'Deception': 'deception',
        'Endurance': 'endurance',
        'Gather Information': 'gatherInfo',
        'Initiative': 'initiative',
        'Jump': 'jump',
        'Mechanics': 'mechanics',
        'Perception': 'perception',
        'Persuasion': 'persuasion',
        'Pilot': 'pilot',
        'Stealth': 'stealth',
        'Survival': 'survival',
        'Swim': 'swim',
        'Treat Injury': 'treatInjury',
        'Use Computer': 'useComputer',
        'Use the Force': 'useTheForce'
      };

      const skillKey = skillNames[focusedSkillName];
      if (skillKey && this.characterData.skills[skillKey]) {
        this.characterData.skills[skillKey].focused = false;
        ui.notifications.info(`Removed Skill Focus from ${focusedSkillName}`);
      }
    }
  }

  // ========== PHASE 2.1: DOMAIN CLEANUP ON FEAT REMOVAL ==========
  // If removing Force Sensitivity, clean up related state
  if (removedFeat.name.toLowerCase().includes('force sensitivity')) {
    // Remove Force domain from unlocked domains
    if (this.characterData.unlockedDomains) {
      const hasForceDomain = this.characterData.unlockedDomains.includes('force');
      this.characterData.unlockedDomains = this.characterData.unlockedDomains.filter(d => d !== 'force');

      if (hasForceDomain) {
        SWSELogger.log(
          `[CHARGEN-FEATS-TALENTS] Force domain removed from unlockedDomains due to Force Sensitivity removal`
        );
      }
    }

    // Remove any Force-tree talents that are selected (no longer accessible)
    const originalTalentCount = this.characterData.talents?.length || 0;
    this.characterData.talents = (this.characterData.talents || []).filter(t => {
      const treeId = t.system?.talent_tree || t.system?.talentTree || t.system?.tree;
      const isForceTree = treeId && (treeId.toLowerCase().includes('force') || treeId === 'Force');
      return !isForceTree;
    });

    const removedTalentCount = originalTalentCount - (this.characterData.talents?.length || 0);
    if (removedTalentCount > 0) {
      ui.notifications.warn(
        `${removedTalentCount} Force talent(s) removed due to Force Sensitivity removal`
      );
      SWSELogger.log(
        `[CHARGEN-FEATS-TALENTS] Removed ${removedTalentCount} Force talent(s) due to Force Sensitivity removal`
      );
    }
  }
  // ================================================================

  // Remove the feat from the selection
  this.characterData.feats = this.characterData.feats.filter(f => f._id !== id && f.name !== id);
  await this.render();
}
```

### Verification
After change:
- Removing Force Sensitivity removes force domain
- Force talents automatically removed (state cleanup)
- Prevents backtrack bypass
- Chargen cannot finalize with invalid state

---

## CHANGE 5: TreeUnlockManager - Runtime Domain Cleanup

### File
`/home/user/foundryvtt-swse/scripts/engine/progression/talents/tree-unlock-manager.js`

### Lines
End of file (add new static method)

### Current Code
(See existing file - adding new method)

### Required Changes

Add new static method to TreeUnlockManager class (at end of class, before closing brace):

```javascript
/**
 * Remove domains that are no longer valid due to feat removal
 * Called when a feat that unlocked a domain is removed from the actor
 *
 * PHASE 2.1: Runtime domain cleanup for live removals
 *
 * @param {Actor} actor - The actor document
 * @param {Object} removedFeat - The feat being removed
 * @returns {Object|null} Update object for actor or null if no change
 */
static removeDomainsForRemovedFeat(actor, removedFeat) {
  if (!actor || !removedFeat) {return null;}

  const currentDomains = actor.system?.progression?.unlockedDomains || [];
  const updatedDomains = [...currentDomains];
  let changed = false;

  // Check which domains this feat unlocked
  const featName = removedFeat.name || removedFeat;
  const featNameLower = typeof featName === 'string' ? featName.toLowerCase() : '';

  // Force Sensitivity feat unlocks force domain
  if (featNameLower.includes('force sensitivity')) {
    if (updatedDomains.includes('force')) {
      updatedDomains.splice(updatedDomains.indexOf('force'), 1);
      changed = true;

      SWSELogger.log(
        `[TreeUnlockManager] Force domain removed due to Force Sensitivity feat removal from ${actor.name}`
      );
    }
  }

  // Return update object if domains changed
  if (changed) {
    return {
      'system.progression.unlockedDomains': updatedDomains
    };
  }

  return null;
}

/**
 * Remove inaccessible talents when a domain is unlocked
 * Called after domain cleanup to remove talents from affected trees
 *
 * PHASE 2.1: Talent cleanup for domain removal
 *
 * @param {Actor} actor - The actor document
 * @param {Array<string>} removedDomains - Domains that were removed
 * @returns {Promise<void>}
 */
static async removeInaccessibleTalents(actor, removedDomains) {
  if (!actor || !removedDomains || removedDomains.length === 0) {return;}

  const talentToRemove = [];

  // Find talents in removed domains
  for (const talent of actor.items) {
    if (talent.type !== 'talent') {continue;}

    const treeId = talent.system?.talent_tree ||
                   talent.system?.talentTree ||
                   talent.system?.tree;

    // Check if this talent's tree is in a removed domain
    if (treeId) {
      for (const domain of removedDomains) {
        if (treeId.toLowerCase().includes(domain.toLowerCase())) {
          talentToRemove.push(talent.id);
          SWSELogger.log(
            `[TreeUnlockManager] Talent "${talent.name}" (tree: ${treeId}) marked for removal ` +
            `(domain "${domain}" no longer unlocked)`
          );
          break;
        }
      }
    }
  }

  // Delete inaccessible talents
  if (talentToRemove.length > 0) {
    try {
      await actor.deleteEmbeddedDocuments('Item', talentToRemove);
      SWSELogger.log(
        `[TreeUnlockManager] Removed ${talentToRemove.length} inaccessible talents from ${actor.name}`
      );
    } catch (err) {
      SWSELogger.error(
        `[TreeUnlockManager] Failed to remove inaccessible talents:`,
        err
      );
    }
  }
}
```

### Verification
After change:
- New methods provide runtime domain cleanup
- removeDomainsForRemovedFeat() called when feats removed
- removeInaccessibleTalents() cleans up talents in removed domains
- Prevents stale talent access

---

## INTEGRATION CHECKLIST

After implementing all 5 changes:

- [ ] **Change 1**: SuggestionEngine filters by tree authority
  - [ ] Test: inaccessible talents not suggested
  - [ ] Test: empty list when all inaccessible
  - [ ] Test: accessible talents still scored

- [ ] **Change 2**: Level-Up uses unified validator
  - [ ] Test: class talents vs heroic talents
  - [ ] Test: Force talent requires domain unlock
  - [ ] Test: same validation as chargen

- [ ] **Change 3**: Drop-handler validates talents
  - [ ] Test: manual drag-drop validates tree
  - [ ] Test: manual drag-drop validates prereqs
  - [ ] Test: inaccessible talents rejected

- [ ] **Change 4**: Chargen removes domains on feat removal
  - [ ] Test: Force Sensitivity removal → force domain removed
  - [ ] Test: Force talents removed when domain removed
  - [ ] Test: backtrack prevents invalid state

- [ ] **Change 5**: TreeUnlockManager cleans up runtime domains
  - [ ] Test: removeDomainsForRemovedFeat() functional
  - [ ] Test: removeInaccessibleTalents() removes talents
  - [ ] Test: hook integration with feat removal

---

## PHASE 2.1 COMPLETION CONFIRMATION

Upon successful implementation:

✓ **No tree leakage possible**
- Suggestion list pre-filtered
- All selection paths use validateTalentForSlot()
- No UI-only filtering

✓ **Single validation path**
- chargen uses TalentSlotValidator
- level-up uses TalentSlotValidator
- manual uses TalentSlotValidator
- ALL route through getAllowedTalentTrees()

✓ **Removal safety**
- Domain cleanup on feat removal
- Talent removal when domain removed
- No stale state possible

✓ **Authority purity**
- getAllowedTalentTrees() is only source of truth
- No persistent per-tree grants
- All derived from actor.system.progression.unlockedDomains

**Phase 2.1 = 10/10 CLOSURE**

