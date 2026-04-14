# FORCE POWER PROVENANCE RISK ASSESSMENT
**Date:** 2026-04-12  
**Status:** Identifying implementation vulnerabilities before Foundry testing

---

## RISK 1: Grant ID Stability (HIGH PRIORITY)

### Current Implementation
In `force-power-engine.js` applySelected() (lines 234-250):
```javascript
const feats = actor.items.filter(i => i.type === 'feat') || [];
const ftFeats = feats.filter(f => f.name?.toLowerCase().includes('force training'));

for (const it of filtered) {
  // ...
  if (ftFeats.length > 0) {
    grantSourceId = ftFeats[0].system?.grantSourceId ||
      ForceProvenanceEngine.generateForceTairingGrantId(
        actor.system.level,
        Date.now().toString(16).slice(-8)  // ⚠️ TIMESTAMP
      );
  }
```

### The Vulnerability
- Grant ID checked against `ftFeats[0].system?.grantSourceId`
- If feat item doesn't have this property set, generates new ID with current timestamp
- **Problem:** If level-up session is reopened/canceled/replayed:
  - Session 1: Creates FT feat, generates ID `ft-3-6754a23b`, applies power
  - Session reload: Tries to apply more powers
  - Feat item may not have system.grantSourceId stored yet (depends on when it's persisted)
  - Generates NEW ID `ft-3-6754b45c` with new timestamp
  - Creates duplicate ghost grant: same feat, two different IDs, two separate ledger entries
  - Reconciliation shows "2 FT grants" when only 1 actually exists

### Required Fix
**Store grantSourceId on feat item immediately after generation:**

In `force-power-engine.js` applySelected():
```javascript
// After determining grantSourceId, STORE IT on the feat
if (!ftFeats[0].system?.grantSourceId) {
  // Generate new ID
  const newId = ForceProvenanceEngine.generateForceTairingGrantId(...);
  // IMMEDIATELY persist to feat item
  await ftFeats[0].update({ 'system.grantSourceId': newId });
  grantSourceId = newId;
} else {
  // Reuse existing ID
  grantSourceId = ftFeats[0].system.grantSourceId;
}
```

**Alternatively:** In chargen finalizer, after applying powers:
```javascript
// Store grant ID on feat for future reference
await ftFeatItem.update({
  'system.grantSourceId': 'ft-0-chargen',
  'system.acquiredAtLevel': 0
});
```

### Severity
- **HIGH** - Can silently create phantom duplicate grants
- Breaks reconciliation accuracy
- Invisible to users until they check ledger
- Silent data corruption (ghost grants)

### Test Case (Priority #1)
```
Scenario: Multi-session Force Training
1. Create character in chargen, select FT feat
2. Select 1 Force power
3. Save and close session
4. Reopen character → Level-Up
5. Select another FT feat at level 5
6. Check ledger: should show 2 distinct FT grants (ft-0-chargen, ft-5-<timestamp>)
   NOT 3 ghost grants with duplicate timestamps
```

---

## RISK 2: Chargen Multiple FT Paths (MEDIUM PRIORITY)

### Current Implementation
In `chargen-finalizer.js` _enrichForcePowersWithProvenance():
```javascript
if (forceTrainingFeats.length > 0 && powerIndex < powers.length) {
  // All remaining powers attributed to Force Training
  for (let i = powerIndex; i < powers.length; i++) {
    const subtype = subtypeIndex === 0 ? 'baseline' : 'modifier-extra';
    power.system.provenance = ForceProvenanceEngine.createProvenanceMetadata(
      'force-training',
      'ft-0-chargen',  // ⚠️ ASSUMES SINGLE FT
      subtype,
      false
    );
```

### The Vulnerability
- All FT grants in chargen get ID `ft-0-chargen`
- **Assumption:** Only one FT "tranche" possible in chargen
- **Question:** Can chargen be re-entered? Can character creation include multiple FT paths?
  - Example: "Bonus FT feat from background" + "User-selected FT feat" = 2 FTs at chargen
  - Both would get `ft-0-chargen` = duplicate IDs = broken ledger

### Architectural Gap
The root issue: chargen doesn't distinguish separate FT acquisitions even at same level.

**Solution Options:**
A. **Per-feat unique IDs even in chargen:**
   - `ft-0-chargen-<feat-index>` or `ft-0-chargen-<feat-uuid>`
   - Requires passing feat documents to enrichment method

B. **Multiple chargen "tranches":**
   - First FT: `ft-0-chargen-1`
   - Second FT: `ft-0-chargen-2`
   - Tracks acquisitions sequentially

C. **Accept single FT assumption (for now):**
   - Document clearly in code
   - Add assertion: `if (forceTrainingFeats.length > 1) warn/error`

### Recommended Fix (B: Multi-Tranche)
```javascript
// In chargen-finalizer.js
let ftTrancheCount = 0;
for (const ftFeat of forceTrainingFeats) {
  ftTrancheCount++;
  const grantId = `ft-0-chargen-${ftTrancheCount}`;
  
  // All powers for THIS FT get this ID
  // (Skip powers already assigned to FS)
  // Assign baseline, then modifiers
}
```

### Severity
- **MEDIUM** - Only affects if chargen allows multiple FT paths
- Chargen-only issue (level-up already uses timestamp differentiation)
- Silent duplication if happens

### Test Case (Priority #3 variant)
```
Scenario: Multiple FT in Chargen (if possible)
1. Create character with background that grants FT + user selects FT feat
2. Should create TWO distinct grants (ft-0-chargen-1, ft-0-chargen-2)
3. Each gets separate baseline pool
4. Reconciliation should show 2 FT grants
```

---

## RISK 3: Legacy Migration Visibility (MEDIUM PRIORITY)

### Current Implementation
In `force-provenance-migrator.js` _performMigration():
```javascript
// After migration, update actor with issues
await actor.update({
  'system.forceGrantLedger.legacy.issues': issues
});
```

And in power provenance:
```javascript
power.system.provenance.migratedAt = new Date().toISOString();
power.system.provenance.legacyIssues = ['Cannot determine origin'];
```

### The Vulnerability
- Issues are buried in ledger and in item metadata
- **No visible UI indicator** that provenance is uncertain
- User sees character sheet → "3 Force Powers" → assumes it's correct
- Doesn't know: "Provenance is guessed, not verified"

### Required Fix
**Add visible warning badge on character sheet:**
1. Character sheet checks: `actor.system.forceGrantLedger.legacy.issues.length > 0`
2. Displays warning icon + tooltip: "⚠️ Force power origin uncertain (migrated from older version)"
3. Link to "Reconcile Force Powers" dialog to manually fix

**Alternative:** Toast notification on actor open:
```javascript
// In ForceProvenanceMigrator or wherever actor is loaded
if (ForceProvenanceMigrator.isMigrationNeeded(actor)) {
  const migrated = await ForceProvenanceMigrator.migrateIfNeeded(actor);
  if (migrated && actor.system.forceGrantLedger.legacy.issues.length > 0) {
    ui.notifications.warn(
      `${actor.name}: Force power provenance has been migrated. ` +
      `Some powers may have uncertain origin. ` +
      `Click to reconcile.`
    );
  }
}
```

### Severity
- **MEDIUM** - User visibility issue, not data corruption
- Doesn't break anything, but misleads about certainty
- Could cause confusion if player later questions power allocations

### Test Case (Priority #4)
```
Scenario: Legacy Actor Migration
1. Create old character (before provenance system)
2. Add 4 Force powers with no provenance metadata
3. Give character FS + 2 FT feats
4. Open character in new system
5. Verify: Migration happens silently
6. Check: Character sheet shows warning badge or notification
7. Verify: Ledger.legacy.issues contains migration ambiguities
```

---

## RISK 4: Immutability Enforcement Gaps (HIGH PRIORITY)

### Current Implementation
In `immutability-hook.js`:
```javascript
Hooks.on('preDeleteItem', (item, options, userId) => {
  if (!item || item.type !== 'forcepower') return true;
  
  const actor = item.parent;
  if (!actor) return true;
  
  const isLocked = item.system?.provenance?.isLocked;
  if (!isLocked) return true;
  
  const grantSourceId = item.system?.provenance?.grantSourceId;
  if (grantSourceId === 'fs-chargen') {
    const hasFS = actor.items.some(f =>
      f.type === 'feat' && f.name?.toLowerCase().includes('force sensitivity')
    );
    if (hasFS) {
      ui.notifications.error('Cannot delete FS-granted power...');
      return false; // BLOCK
    }
  }
  return true;
});
```

### The Vulnerabilities

**Gap 1: Suite Reselection Bypass**
- `clearAndReselectForcePowers()` in suite-reselection-engine.js does:
  ```javascript
  const existingPowers = actor.items.filter(i => i.type === 'forcepower');
  await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', powerIds);
  ```
- **Problem:** Calls `ActorEngine.deleteEmbeddedDocuments()` which may bypass item-level hooks
- **Severity:** HIGH - Could silently clear FS powers during reselection
- **Test:** Ability increase reselection → clear → reselect = FS power lost

**Gap 2: Bulk Deletion Bypass**
- If `ActorEngine.deleteEmbeddedDocuments()` uses bulk delete (not per-item), hook may not fire
- Foundry's `deleteMany()` may not trigger `preDeleteItem` for each item
- **Severity:** HIGH - Could bypass lock entirely
- **Test:** Use actor sheet bulk delete or console: `actor.deleteEmbeddedDocuments('Item', [...])`

**Gap 3: Retrain Flows**
- Character sheet may have "Rebuild Force Powers" button
- If retrain calls a different delete path, hook doesn't apply
- **Severity:** MEDIUM - Depends on what retrain flows exist
- **Test:** Run any retrain/rebuild flow available in system

**Gap 4: Overwrite via Update**
- Pre-delete prevents deletion, but what about:
  ```javascript
  await powerItem.update({ 'system.provenance.isLocked': false });
  // Now it can be deleted!
  ```
- **Severity:** MEDIUM - Requires code-level access, not UI
- **Fix:** Add `preUpdateItem` hook to prevent provenance modification by non-admin

### Required Fixes

**Fix 1: Add Guards to Suite Reselection**
```javascript
// In suite-reselection-engine.js before deleteEmbeddedDocuments()
const lockedPowers = existingPowers.filter(p => 
  p.system?.provenance?.isLocked && p.system?.provenance?.grantSourceId === 'fs-chargen'
);

if (lockedPowers.length > 0) {
  const hasFS = actor.items.some(f => 
    f.type === 'feat' && f.name?.toLowerCase().includes('force sensitivity')
  );
  if (hasFS) {
    return {
      success: false,
      error: `Cannot reselect Force Powers: FS-granted powers are immutable while feat exists`
    };
  }
}

// THEN delete remaining (non-locked) powers
const deletablePowerIds = existingPowers
  .filter(p => !isForcePowerImmutable(p))
  .map(p => p.id);
```

**Fix 2: Per-Item Deletion in ActorEngine**
- Verify `ActorEngine.deleteEmbeddedDocuments()` fires `preDeleteItem` for each item
- If not, refactor to iterate: `for (const id of ids) await item.delete();`

**Fix 3: Protect Provenance Metadata**
```javascript
Hooks.on('preUpdateItem', (item, updates, options, userId) => {
  if (item.type !== 'forcepower') return true;
  if (!updates.system?.provenance) return true;
  
  // Prevent modification of immutability flags
  if (updates.system.provenance.isLocked !== undefined) {
    if (updates.system.provenance.isLocked === false && item.system?.provenance?.isLocked === true) {
      ui.notifications.error('Cannot modify immutability of locked powers');
      return false;
    }
  }
  
  return true;
});
```

### Severity
- **HIGH** - Immutability can be silently bypassed
- Not visible in normal UI, but possible via reselection or house rules
- Silent violation of design constraint

### Test Cases (Priority #1 & #5)
```
Test 1: FS Power Immutability
1. Create Jedi with FS in chargen
2. Select 1 Force power
3. Try to delete that power from character sheet
4. Verify: Error message, deletion blocked

Test 5: Retrain/Rebuild Flows
1. Create character with FS + 1 power
2. Run "Reconcile Force Powers" or "Rebuild Suite" if it exists
3. Verify: FS power is NOT cleared
4. Verify: User cannot deselect FS power and replace it

Test Bonus: Bulk Deletion
1. Use developer console: actor.deleteEmbeddedDocuments('Item', [fsPowerID])
2. Verify: Deletion is blocked (hook fires even in bulk)
3. If not blocked: CRITICAL BUG
```

---

## RISK 5: Ability Increase Delta vs Rebuild (HIGH PRIORITY)

### Current Implementation
In `suite-reselection-engine.js` clearAndReselectForcePowers():
```javascript
// STEP 2: Clear existing powers
const existingPowers = actor.items.filter(i => i.type === 'forcepower');
if (existingPowers.length > 0) {
  const powerIds = existingPowers.map(p => p.id || p._id);
  await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', powerIds);
}

// STEP 3: Recalculate capacity (FRESH, higher due to ability increase)
capacity = await ForceAuthorityEngine.getForceCapacity(actor);

// STEP 4: Open picker with NEW capacity
const selected = await ForcePowerPicker.select(available, capacity);

// STEP 6: Apply all selected
const result = await ForcePowerEngine.applySelected(actor, selected);
```

### The Vulnerability
- **Clears ALL powers**, then re-opens picker with higher capacity
- Player sees: "Old powers gone, capacity increased, pick all 4 again"
- **Risk:** Player reshuffles baseline FS/FT powers that should be immutable
  - Old selection: [Force Speed, Telepathy, Force Courage]
  - New capacity: 4 (ability increased)
  - Player picks: [Force Courage, Force Speed, Telekinesis, Telepathy]
  - **Result:** Same powers, but now in different grant slots or with different subtypes
  - **Ledger:** Shows different provenance attribution than reality

### Correct Behavior
- Identify ONLY the owed delta powers
- Allow player to select ONLY those (not reshuffled)
- Create only delta powers with modifier-extra subtype attached to existing grants
- Existing baseline powers remain unchanged

### Required Fix
**Replace clearAndReselectForcePowers() with intelligentAllocateModifierExtras():**

```javascript
static async intelligentAllocateModifierExtras(actor, context) {
  // Don't clear, just ADD the delta
  
  // STEP 1: Reconcile current state
  const ledger = await ForceProvenanceEngine.reconcileForceGrants(actor, context);
  
  // STEP 2: Calculate total owed
  const totalOwed = ForceProvenanceEngine.getTotalOwed(ledger);
  if (totalOwed <= 0) {
    return { success: true, message: 'No additional powers needed' };
  }
  
  // STEP 3: Identify which grant sources have owed powers
  const grantSourcesOwed = Object.entries(ledger.grants)
    .filter(([id, grant]) => grant.owed > 0)
    .map(([id, grant]) => ({ id, owed: grant.owed }));
  
  // STEP 4: Open picker with ONLY delta count
  const available = await ForcePowerEngine.collectAvailablePowers(actor);
  const selected = await ForcePowerPicker.select(available, totalOwed);
  
  // STEP 5: Enrich selected with modifier-extra subtype + grant source ID
  const enriched = selected.map((power, idx) => {
    const grant = grantSourcesOwed[Math.min(idx, grantSourcesOwed.length - 1)];
    return {
      ...power,
      system: {
        ...power.system,
        provenance: ForceProvenanceEngine.createProvenanceMetadata(
          'force-training',
          grant.id,  // Attach to EXISTING grant
          'modifier-extra',  // Mark as ability-driven
          false
        )
      }
    };
  });
  
  // STEP 6: Apply ONLY the new ones (existing powers untouched)
  const result = await ForcePowerEngine.applySelected(actor, enriched);
  return result;
}
```

### Why This Matters
- **Baseline stability:** FS-granted powers remain immutable and unchanged
- **Ledger accuracy:** Delta powers correctly attributed to the grant that justified them
- **Player clarity:** "You gained 1 new slot due to WIS increase, pick 1 more"
- **No reshuffling:** Existing selections preserved

### Severity
- **HIGH** - Breaks ledger accuracy if not careful
- Silent reshuffling of baseline powers
- Violates immutability intent

### Test Case (Priority #2)
```
Scenario: Ability Increase + Delta Allocation
1. Create character with FT + select 2 Force powers (Telekinesis, Force Speed)
2. Confirm: ledger shows 2/3 entitled (WIS +1)
3. Level up and gain +1 WIS (now +2, entitled 3)
4. Run "Reconcile Force Powers"
5. Verify: Dialog shows "You can select 1 more power"
6. Verify: Old powers [Telekinesis, Force Speed] are NOT available to reselect
7. Verify: Can ONLY pick the 1 new power
8. Apply: New power gets grantSubtype='modifier-extra' + same grantSourceId as FT
9. Final ledger: Shows 1 baseline + 2 modifier-extra
```

---

## SUMMARY OF REQUIRED FIXES

| Risk | Severity | Type | Fix Required |
|------|----------|------|--------------|
| Grant ID Stability | HIGH | Data | Store grantSourceId on feat item after generation |
| Chargen Multiple FT | MEDIUM | Data | Use per-tranche IDs (ft-0-chargen-1, ft-0-chargen-2) |
| Legacy Visibility | MEDIUM | UX | Add warning badge to character sheet |
| Immutability Gaps | HIGH | Logic | Guard suite reselection, protect metadata, fix bulk delete |
| Delta vs Rebuild | HIGH | Logic | Replace clearAndReselectForcePowers with delta-only allocation |

---

## RECOMMENDED TEST EXECUTION ORDER

1. **Immutability Enforcement (#1, #5)** - Foundation for all other tests
   - FS power deletion blocking
   - Retrain flow validation
   - Bulk deletion handling

2. **Grant ID Stability (#1)** - Core data integrity
   - Multi-session FT persistence
   - No ghost grants on reload

3. **Ability Increase Delta (#2)** - Advanced workflow
   - Confirm delta-only allocation (if implemented)
   - Baseline preservation

4. **Legacy Migration (#4)** - Backfill correctness
   - Ambiguity marking
   - Visibility on character sheet

5. **Multi-FT Chargen (#3)** - Edge case (if applicable)
   - Multiple FT at char creation
   - Distinct grant ledger

---

## NEXT CLAUDE COMMAND

**Recommended:** Audit retraining paths for immutability bypass
- Find all "rebuild", "retrain", "reconcile" flows in codebase
- Check if they delete powers (if so, they hit the immutability hook)
- Check if they bypass the hook (if so, critical vulnerability)
- Check if they attempt to override provenance metadata

This will be the first place the architecture either shines (immutable FS powers protected during retrain) or breaks (silent bypass during house-rule flows).
