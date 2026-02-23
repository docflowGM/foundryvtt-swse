# HOUSE RULE REMEDIATION PATTERNS

This guide shows how to convert each violation type to SSOT-compliant code.

---

## Pattern 1: Direct Settings Read → HouseRuleService

### ❌ VIOLATION (Before)
```javascript
// ❌ BAD: Direct settings.get in engine file
class SecondWindEngine {
  static canRecover(actor) {
    const enabled = game.settings.get('foundryvtt-swse', 'secondWindImproved');
    if (!enabled) return false;
    // ...
  }
}
```

### ✅ CORRECT (After)
```javascript
// ✓ GOOD: Use HouseRuleService
import { HouseRuleService } from '../system/HouseRuleService.js';

class SecondWindEngine {
  static canRecover(actor) {
    if (!HouseRuleService.isEnabled('secondWindImproved')) return false;
    // ...
  }
}
```

**Search & Replace Pattern:**
```
Find:    game.settings.get('foundryvtt-swse', '([^']+)')
Replace: HouseRuleService.get('$1')

Find:    game.settings.get('foundryvtt-swse', '([^']+)') \|\| ([^;]+)
Replace: HouseRuleService.get('$1') ?? $2
```

---

## Pattern 2: UI Reading Engine Logic → Engine Method Call

### ❌ VIOLATION (Before)
```javascript
// ❌ BAD: UI reads settings and does math
class ChargenImproved extends CharacterGenerator {
  async _calculateHP(actor, level, hitDie) {
    // Direct settings read in UI
    const hpGeneration = game.settings.get('foundryvtt-swse', 'hpGeneration');
    const maxHPLevels = game.settings.get('foundryvtt-swse', 'maxHPLevels');

    let hpGain = 0;
    if (level <= maxHPLevels) {
      hpGain = hitDie + (actor.system.attributes.con?.mod || 0);
    } else {
      switch (hpGeneration) {
        case 'average':
          hpGain = Math.floor(hitDie / 2) + 1 + (actor.system.attributes.con?.mod || 0);
          break;
        // ... more logic
      }
    }
    return hpGain;
  }
}
```

### ✅ CORRECT (After)
```javascript
// ✓ GOOD: UI calls engine method
import { HPGeneratorEngine } from '../engines/HP/HPGeneratorEngine.js';

class ChargenImproved extends CharacterGenerator {
  async _prepareHP(actor, level, hitDie) {
    // Delegate to engine - UI does NOT calculate
    const hpGain = HPGeneratorEngine.calculateHPGain(
      actor,
      level,
      hitDie,
      { context: 'chargen' }
    );
    return hpGain;
  }
}
```

**Key Change:** UI moves from *calculator* to *caller*

---

## Pattern 3: Scattered Settings → Consolidate in Engine

### ❌ VIOLATION (Before)
```javascript
// File 1: chargen-main.js
const method = game.settings.get('foundryvtt-swse', 'abilityScoreMethod');
const pool = game.settings.get('foundryvtt-swse', 'pointBuyPool');
const droidPool = game.settings.get('foundryvtt-swse', 'droidPointBuyPool');

// File 2: chargen-abilities.js (same settings read again!)
const method = game.settings.get('foundryvtt-swse', 'abilityScoreMethod');

// File 3: chargen-droid.js (same settings read AGAIN!)
const droidPool = game.settings.get('foundryvtt-swse', 'droidPointBuyPool');
```

### ✅ CORRECT (After)
```javascript
// NEW: CharacterGenerationEngine.js - SINGLE OWNER
import { HouseRuleService } from '../system/HouseRuleService.js';

export class CharacterGenerationEngine {
  static getAbilityGenerationMethod() {
    return HouseRuleService.getString('abilityScoreMethod', '4d6drop');
  }

  static getPointBuyPool(isDroid = false) {
    if (isDroid) {
      return HouseRuleService.getNumber('droidPointBuyPool', 20);
    }
    return HouseRuleService.getNumber('pointBuyPool', 32);
  }

  static getConstructionCredits() {
    return HouseRuleService.getNumber('droidConstructionCredits', 1000);
  }
}

// File 1: chargen-main.js - calls engine
const method = CharacterGenerationEngine.getAbilityGenerationMethod();
const pool = CharacterGenerationEngine.getPointBuyPool(false);

// File 2: chargen-abilities.js - calls engine
const method = CharacterGenerationEngine.getAbilityGenerationMethod();

// File 3: chargen-droid.js - calls engine
const pool = CharacterGenerationEngine.getPointBuyPool(true);
```

**Result:** Only ONE place reads these settings

---

## Pattern 4: Duplicate Logic Paths → Single Engine

### ❌ VIOLATION (Before)
```javascript
// Path 1: In chargen-improved.js
if (newLevel <= game.settings.get('foundryvtt-swse', 'maxHPLevels')) {
  hpGain = hitDie + conMod;
} else {
  switch (game.settings.get('foundryvtt-swse', 'hpGeneration')) {
    case 'average':
      hpGain = Math.floor(hitDie / 2) + 1 + conMod;
      break;
  }
}

// Path 2: In levelup-shared.js (IDENTICAL LOGIC)
if (newLevel <= game.settings.get('foundryvtt-swse', 'maxHPLevels')) {
  hpGain = hitDie + conMod;
} else {
  switch (game.settings.get('foundryvtt-swse', 'hpGeneration')) {
    case 'average':
      hpGain = Math.floor(hitDie / 2) + 1 + conMod;
      break;
  }
}
```

### ✅ CORRECT (After)
```javascript
// File 1: chargen-improved.js
import { HPGeneratorEngine } from '../engines/HP/HPGeneratorEngine.js';

// ... in class
const hpGain = HPGeneratorEngine.calculateHPGain(actor, newLevel, hitDie);

// File 2: levelup-shared.js
import { HPGeneratorEngine } from '../engines/HP/HPGeneratorEngine.js';

// ... in function
const hpGain = HPGeneratorEngine.calculateHPGain(actor, newLevel, hitDie);
```

**Result:** Both files now call the SAME engine method

---

## Pattern 5: Settings in Sheets (FORBIDDEN)

### ❌ VIOLATION (NEVER DO THIS)
```javascript
// ❌ CRITICAL VIOLATION: Sheet reading settings
class ActorSheet extends ActorSheetV2 {
  async _prepareCharacterData(actor) {
    // FORBIDDEN: Sheets must never read house rules
    const useWeaponFinesse = game.settings.get('foundryvtt-swse', 'weaponFinesseDefault');

    if (useWeaponFinesse) {
      actor.system.addFeat('Weapon Finesse');
    }
  }
}
```

### ✅ CORRECT (After)
```javascript
// ✓ GOOD: Engine handles it
class ActorEngine {
  static applyAutoFeats(actor) {
    // Engine decides based on HouseRuleService
    if (HouseRuleService.isEnabled('weaponFinesseDefault')) {
      this.grantFeat(actor, 'Weapon Finesse');
    }
  }
}

// Sheet just displays - never modifies
class ActorSheet extends ActorSheetV2 {
  async _prepareCharacterData(actor) {
    // Sheet has NO logic - only UI concerns
    this.displayFeatsList(actor.items.filter(i => i.type === 'feat'));
  }
}
```

**Rule:** Sheets are READ-ONLY for house rules. All mutations happen in engines.

---

## Pattern 6: Settings Validation at Startup

### ❌ VIOLATION (No validation)
```javascript
// ❌ BAD: Settings may be undefined, wrong type, etc.
const method = game.settings.get('foundryvtt-swse', 'hpGeneration');
// What if this returns undefined? Code breaks silently.
```

### ✅ CORRECT (With validation)
```javascript
// ✓ GOOD: HouseRuleService validates at startup
Hooks.once('ready', () => {
  const report = HouseRuleService.validate();

  if (report.errors.length > 0) {
    console.error('House Rule validation failed:', report.errors);
    // Disable features that depend on broken rules
  } else {
    console.log(`✓ ${report.validRules}/${report.totalRules} rules validated`);
  }
});
```

---

## CONVERSION CHECKLIST

When fixing a violation:

- [ ] Identify the rule being read
- [ ] Identify the engine that should own it
- [ ] Create engine method if it doesn't exist
- [ ] Replace `game.settings.get()` with `HouseRuleService.get()`
- [ ] Replace UI logic with engine method call
- [ ] Verify no duplicate logic remains
- [ ] Test that behavior unchanged
- [ ] Grep for remaining `game.settings.get()` calls in the same rule
- [ ] Document rule ownership in engine

---

## BATCH REMEDIATION SCRIPT

**To find all violations in a file:**
```bash
grep -n "game\.settings\.get.*foundryvtt-swse" scripts/apps/chargen-main.js
```

**To find all violations in category:**
```bash
grep -r "game\.settings\.get.*foundryvtt-swse" scripts/apps/chargen*
```

**To check for remaining violations after fix:**
```bash
grep -c "game\.settings\.get.*foundryvtt-swse" scripts/ --include="*.js" | grep -v ":0" | wc -l
```

If result is 2, only HouseRuleService.js and settings-helper.js have violations (both allowed).
If higher, more fixes needed.

---

## PRIORITY ORDER FOR REMEDIATION

### 🔴 CRITICAL (Do First)
1. **Store Files** (14 violations)
   - gm-store-dashboard.js → PricingEngine
   - store-checkout.js → PricingEngine
   - store-main.js → PricingEngine

2. **Chargen Files** (6+5 violations)
   - chargen-main.js → CharacterGenerationEngine
   - chargen-improved.js → CharacterGenerationEngine
   - Other chargen-*.js → CharacterGenerationEngine

### 🟠 HIGH (Do Second)
3. **Levelup Files** (5 violations)
   - levelup-main.js → ProgressionEngine
   - levelup-talents.js → ProgressionEngine

4. **Mentor Files** (6 violations)
   - mentor-translation-settings.js → MentorEngine

### 🟡 MEDIUM (Do Third)
5. **Remaining Engines** (20+ violations)
   - houserule-mechanics.js → CombatEngine
   - Other engine files

---

## VALIDATION AFTER REMEDIATION

```javascript
// Add to system startup
Hooks.once('ready', async () => {
  const violations = await auditForViolations();

  if (violations.length === 0) {
    console.log('✓ SSOT GOVERNANCE: All house rules use HouseRuleService');
  } else {
    console.error('✗ VIOLATIONS DETECTED:', violations);
    violations.forEach(v => {
      console.log(`  - ${v.file}:${v.line} - ${v.pattern}`);
    });
  }
});

async function auditForViolations() {
  // Search for direct game.settings.get outside HouseRuleService
  // Report any violations
}
```

---

## NEXT STEPS

1. ✓ Phase 1: Create HouseRuleService (DONE)
2. 🔄 Phase 2: Remediate top 3 file categories
3. 🔄 Phase 3: Remediate remaining categories
4. 🔄 Phase 4: Run validation audit
5. 🔄 Phase 5: Update documentation
