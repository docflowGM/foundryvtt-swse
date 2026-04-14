# FORCE POWER PROVENANCE SCHEMA DESIGN
**Status:** Design Phase - Implementation in Progress  
**Date:** 2026-04-11

---

## EXECUTIVE SUMMARY

This document defines the durable data model for Force power provenance tracking. It enables the system to:

1. **Track power source** - Which feat/class/ability granted each power
2. **Distinguish grant instances** - Separate first Force Training from second Force Training
3. **Support immutability rules** - Force Sensitivity grants immutable powers
4. **Enable modifier-driven increases** - When WIS/CHA increases, allocate new powers to existing FT grants
5. **Reconcile entitled vs owned** - Compute what should exist vs what does exist

---

## DESIGN DECISIONS

### A. PROVENANCE LOCATION: Per-Item + Actor-Level Ledger

**Per-Item Provenance (Schema Addition):**
Each forcepower item carries its own provenance metadata:
- `grantSourceType` - 'force-sensitivity' | 'force-training' | 'class-level' | 'template'
- `grantSourceId` - Durable instance identifier (see below)
- `grantSubtype` - 'baseline' | 'modifier-extra'
- `isLocked` - boolean (true = immutable, cannot be removed while grant source exists)

**Actor-Level Grant Ledger:**
Actor gets a new system field `system.forceGrantLedger` tracking:
- Per grant source instance: how many powers are entitled vs materialized
- This is derived/cached, not canonical (always recomputable from items + feats + abilities)
- Updated at chargen completion, level-up finalization, and ability increase resolution

### B. FORCE TRAINING INSTANCE IDENTIFICATION: Durable Grant Instance ID

**Problem:**
- How to distinguish "Force Training (feat I took at level 1)" from "Force Training (feat I took at level 3)"?
- Feats don't have instance IDs in the current system

**Solution:**
Create a unique grant source ID based on **feat + acquisition level + selection order**:

```javascript
function generateForceTairingGrantId(level, acquisitionContext) {
  // Format: "ft-<level>-<hex-timestamp>"
  // Example: "ft-1-6754a23b" (Force Training at level 1, selected ~timestamp)
  
  // For chargen (level 0): "ft-0-chargen"
  // For level-up (level N): "ft-<N>-<timestamp>"
  
  return `ft-${level}-${acquisitionContext}`;
}
```

**Immutable for existing actors:** Once created and stored on items, never regenerated.

**For retroactive actors (migration):** Conservative approach—mark as "ft-unknown-legacy" when provenance cannot be determined.

### C. MODIFIER-DRIVEN INCREASES: Separate Baseline vs Extra Powers

**Grant Subtype Strategy:**

When Force Training is acquired:
1. Create **baseline power** with `grantSubtype: 'baseline'` (always materialized)
2. For each point of modifier, create **extra powers** with `grantSubtype: 'modifier-extra'` (materialized if modifier exists)

**Example:**
- Actor has WIS +2 and takes Force Training at level 3
- Create 3 powers:
  - 1 with `grantSubtype: 'baseline'` (always entitled, always materialized)
  - 2 with `grantSubtype: 'modifier-extra'`, `grantSourceId: 'ft-3-<timestamp>'` (materialized because WIS is +2)

**When WIS increases at level 5:**
- Find all powers with `grantSubtype: 'modifier-extra'` and `grantSourceId: 'ft-3-<timestamp>'`
- Check entitled count (1 + new modifier)
- If new modifier is +3, entitled = 4, owned = 3 (baseline + 2 extras)
- Create 1 additional extra power with same `grantSourceId` and `grantSubtype: 'modifier-extra'`
- Finalize step shows "ability increase grant 1 additional power"

### D. LEGACY ACTOR MIGRATION: Conservative Honest Approach

**For actors with existing Force powers (no provenance):**

1. **Migrate Force Sensitivity powers:**
   - Find all powers on actor
   - Find Force Sensitivity feat
   - Assign "force-sensitivity" label to **first power only**
   - Mark as `isLocked: true`
   - Mark remaining as `grantSourceId: 'unknown-legacy'`, `grantSourceType: 'legacy-unknown'`

2. **Migrate Force Training powers:**
   - Find all Force Training feats
   - Count owned powers (excluding FS-assigned)
   - If only 1 FT: assign all remaining to first FT with `grantSourceId: 'ft-unknown-legacy'`
   - If multiple FT: assign conservatively
     - First FT gets baseline (1)
     - If more powers exist, mark as `grantSourceId: 'ft-unknown-legacy'`
   - Mark as `grantSubtype: 'unknown-legacy'`, `isLocked: false`

3. **Mark uncertainty:**
   - Add `provenance.migratedAt` timestamp
   - Add `provenance.legacyIssues: string[]` listing ambiguities
   - Example: `["Cannot distinguish 2 Force Training grants retroactively"]`

4. **Never silently erase data:**
   - If in doubt, add `grantSourceId: 'unknown-legacy'` and log issue
   - Actor sheet can show "⚠ Legacy power (origin unknown)" badge
   - Actor can be offered "Reconcile Force Powers" dialog to manually fix

---

## SCHEMA CHANGES

### 1. ITEM TEMPLATE (template.json)

**Add to `forcepower` schema:**

```json
"forcepower": {
  "templates": ["base"],
  "level": 1,
  "uses": {
    "current": 1,
    "max": 1
  },
  "provenance": {
    "grantSourceType": "force-sensitivity|force-training|class-level|template|unknown-legacy",
    "grantSourceId": "fs-chargen|ft-1-chargen|ft-3-6754a23b|unknown-legacy",
    "grantSubtype": "baseline|modifier-extra|unknown-legacy",
    "isLocked": false,
    "migratedAt": null,
    "legacyIssues": []
  }
}
```

### 2. ACTOR SYSTEM (template.json)

**Add to `base` actor template:**

```json
"forceGrantLedger": {
  "lastReconciled": null,
  "lastReconciliationContext": "",
  "grants": {
    "fs-chargen": {
      "grantSourceType": "force-sensitivity",
      "acquisitionLevel": 0,
      "abilityModifier": 0,
      "entitled": 1,
      "owned": 1,
      "breakdown": [
        { "subtype": "baseline", "count": 1 }
      ]
    },
    "ft-3-6754a23b": {
      "grantSourceType": "force-training",
      "acquisitionLevel": 3,
      "abilityModifier": 2,
      "entitled": 3,
      "owned": 3,
      "breakdown": [
        { "subtype": "baseline", "count": 1 },
        { "subtype": "modifier-extra", "count": 2 }
      ]
    }
  },
  "legacy": {
    "unknownPowers": 0,
    "issues": []
  }
}
```

---

## GRANT LEDGER CALCULATION

### Algorithm: Reconcile()

```javascript
async function reconcileForceGrants(actor) {
  const ledger = {
    lastReconciled: new Date().toISOString(),
    lastReconciliationContext: 'manual|chargen-complete|levelup-finalize|ability-increase',
    grants: {},
    legacy: { unknownPowers: 0, issues: [] }
  };

  // 1. Find all force grant sources
  const fsSensitivity = actor.items.some(f => 
    f.type === 'feat' && f.name.includes('Force Sensitivity')
  );
  
  const ftFeats = actor.items.filter(f =>
    f.type === 'feat' && f.name.includes('Force Training')
  );

  // 2. Calculate entitled per source
  if (fsSensitivity) {
    ledger.grants['fs-chargen'] = {
      grantSourceType: 'force-sensitivity',
      acquisitionLevel: 0,
      abilityModifier: 0,
      entitled: 1,
      owned: 0, // To be counted below
      breakdown: [{ subtype: 'baseline', count: 1 }]
    };
  }

  for (const ftFeat of ftFeats) {
    const grantId = ftFeat.system.grantSourceId || 'ft-unknown-legacy';
    const abilityMod = getConfiguredAbilityMod(actor);
    
    ledger.grants[grantId] = {
      grantSourceType: 'force-training',
      acquisitionLevel: ftFeat.system.acquiredAtLevel || 0,
      abilityModifier: abilityMod,
      entitled: 1 + Math.max(0, abilityMod),
      owned: 0, // To be counted below
      breakdown: [
        { subtype: 'baseline', count: 1 },
        { subtype: 'modifier-extra', count: Math.max(0, abilityMod) }
      ]
    };
  }

  // 3. Count owned per source
  const ownedPowers = actor.items.filter(i => i.type === 'forcepower');
  for (const power of ownedPowers) {
    const sourceId = power.system.provenance.grantSourceId;
    if (ledger.grants[sourceId]) {
      ledger.grants[sourceId].owned++;
    } else {
      ledger.legacy.unknownPowers++;
      ledger.legacy.issues.push(`Power "${power.name}" has unknown grantSourceId: ${sourceId}`);
    }
  }

  return ledger;
}
```

---

## RUNTIME INTEGRATION POINTS

### 1. CHARGEN: Create Powers with Provenance

**chargen-force-powers.js - _applySelectedForcePowers()**

When applying Force powers to actor:
```javascript
// Create power with provenance
const power = {
  name: selectedPower.name,
  type: 'forcepower',
  system: {
    ...selectedPower.system,
    provenance: {
      grantSourceType: 'force-sensitivity', // or 'force-training'
      grantSourceId: this.grantSourceId,     // 'fs-chargen' or 'ft-0-chargen'
      grantSubtype: this.grantSubtype,       // 'baseline'
      isLocked: grantSourceType === 'force-sensitivity'
    }
  }
};
```

### 2. LEVEL-UP: Create/Allocate Powers with Provenance

**levelup-force-powers.js - applySelected()**

When FT feat selected:
```javascript
// Generate grant ID for this acquisition
const grantId = `ft-${actor.system.level}-${Date.now().toString(16).slice(-8)}`;

// Store on feat item for future reference
await ftFeatItem.update({
  'system.grantSourceId': grantId,
  'system.acquiredAtLevel': actor.system.level
});

// Create baseline power
const baselinePower = {
  name: selectedPower.name,
  type: 'forcepower',
  system: {
    provenance: {
      grantSourceType: 'force-training',
      grantSourceId: grantId,
      grantSubtype: 'baseline',
      isLocked: false
    }
  }
};

// Create modifier-extra powers
for (let i = 0; i < abilityMod; i++) {
  const extraPower = {
    name: selectedPower.name,
    type: 'forcepower',
    system: {
      provenance: {
        grantSourceType: 'force-training',
        grantSourceId: grantId,
        grantSubtype: 'modifier-extra',
        isLocked: false
      }
    }
  };
}
```

### 3. ABILITY INCREASE: Create Extra Powers

**suite-reselection-engine.js - allocateModifierExtraPowers()**

When ability modifier increases:
```javascript
async allocateModifierExtraPowers(actor, oldMod, newMod) {
  if (newMod <= oldMod) return []; // No new powers

  const extraCount = newMod - oldMod;
  const created = [];

  // Find all FT grants
  const ftFeats = actor.items.filter(f =>
    f.type === 'feat' && f.name.includes('Force Training')
  );

  for (const ftFeat of ftFeats) {
    const grantId = ftFeat.system.grantSourceId || 'ft-unknown-legacy';

    // Get a representative selectable power (or ask user)
    const selectedPower = await this.selectRepresentativePower(actor);

    // Create extra power
    for (let i = 0; i < extraCount; i++) {
      const power = {
        name: selectedPower.name,
        type: 'forcepower',
        system: {
          provenance: {
            grantSourceType: 'force-training',
            grantSourceId: grantId,
            grantSubtype: 'modifier-extra',
            isLocked: false
          }
        }
      };
      created.push(power);
    }
  }

  return created;
}
```

### 4. RUNTIME QUERIES: ForceAuthorityEngine Updates

**force-authority-engine.js - getForceCapacity() (unchanged)**
- Already returns correct capacity by counting feats + ability modifier
- No change needed

**force-authority-engine.js - NEW: getProvenanceContext()**
```javascript
static async getProvenanceContext(actor) {
  // Returns detailed breakdown of grants by source
  const ledger = await reconcileForceGrants(actor);
  return {
    ledger,
    totalEntitled: Object.values(ledger.grants).reduce((sum, g) => sum + g.entitled, 0),
    totalOwned: Object.values(ledger.grants).reduce((sum, g) => sum + g.owned, 0),
    under-entitled: Object.values(ledger.grants).map(g => g.entitled - g.owned)
  };
}
```

### 5. IMMUTABILITY RULES

**prevent-power-removal.js (NEW)**

Hook on pre-item-delete:
```javascript
Hooks.on('preDeleteItem', (item, options, userId) => {
  if (item.type !== 'forcepower') return;
  if (!item.system.provenance?.isLocked) return;

  const actor = item.parent;
  if (!actor) return;

  // Check if grant source still exists
  const grantSourceId = item.system.provenance.grantSourceId;
  if (grantSourceId === 'fs-chargen') {
    const hasFS = actor.items.some(f =>
      f.type === 'feat' && f.name.includes('Force Sensitivity')
    );
    if (hasFS) {
      ui.notifications.error('Force Sensitivity-granted powers are immutable');
      return false; // Prevent deletion
    }
  }
});
```

---

## MIGRATION STRATEGY

### Phase 1: Backward Compatibility

All new code works with:
- New items with full provenance (created during chargen/levelup)
- Old items with empty/null provenance (migrated actors)

### Phase 2: Retroactive Migration

When actor is opened in UI or during finalization:
1. Check if actor has Force powers without provenance
2. Call `migrateForceProvenanceIfNeeded(actor)`
3. Intelligently assign `grantSourceId` and `grantSubtype`
4. Add `legacyIssues` array documenting uncertainties
5. Store `migratedAt` timestamp

### Phase 3: Optional User Reconciliation

Add UI button "Reconcile Force Powers" in character sheet:
- Shows current ledger: "Entitled to 5, own 3, owe 2"
- Allows manual selection of which powers map to which grants
- Updates provenance metadata
- Updates ledger

---

## TESTING STRATEGY

### Unit Tests (reconciliation logic)

1. **New chargen actor:** Verify all powers get correct grantSourceId
2. **Level-up FT:** Verify baseline + modifiers correctly attributed
3. **Ability increase:** Verify modifier-extras created and attributed
4. **Legacy actor migration:** Verify conservative backfill
5. **Immutability enforcement:** Verify FS powers cannot be deleted while feat exists

### Integration Tests (end-to-end flows)

1. **Chargen → Level-Up → Ability Increase:** Verify power count escalation
2. **Multiple FT grants:** Verify instance separation
3. **WIS/CHA toggle setting:** Verify ledger recomputes with correct modifier
4. **Remove FT feat:** Verify "owe 3 powers" message
5. **Restore FS power deletion:** Verify FS power can be deleted if feat removed first

---

## FILES TO CREATE/MODIFY

### New Files
- `scripts/engine/progression/engine/force-provenance-engine.js` - Reconciliation logic
- `scripts/engine/progression/engine/force-provenance-migrator.js` - Legacy migration
- `scripts/engine/progression/hooks/immutability-hook.js` - Prevent FS power deletion
- `tests/force-provenance.test.js` - Unit tests

### Modified Files
- `template.json` - Add schema to forcepower and actor base
- `chargen-force-powers.js` - Set provenance when creating powers
- `levelup-force-powers.js` - Set provenance with grantSourceId
- `suite-reselection-engine.js` - Create modifier-extra powers with provenance
- `force-authority-engine.js` - Add getProvenanceContext() method
- `force-power-manager.js` - Update queries to handle provenance
- `index.js` - Register immutability hook

---

## NEXT STEPS

1. ✅ Schema design (this document)
2. ⏳ Modify template.json with new forcepower and actor schemas
3. ⏳ Create force-provenance-engine.js with reconciliation logic
4. ⏳ Create force-provenance-migrator.js for legacy backfill
5. ⏳ Update chargen-force-powers.js to set provenance
6. ⏳ Update levelup-force-powers.js to set provenance + grantSourceId
7. ⏳ Update suite-reselection-engine.js for modifier-extra powers
8. ⏳ Create immutability-hook.js for FS power deletion prevention
9. ⏳ Add getProvenanceContext() to force-authority-engine.js
10. ⏳ Write unit and integration tests
11. ⏳ Update documentation

---

**Design Status:** COMPLETE - Ready for implementation  
**Implementation Status:** Starting Phase 1
