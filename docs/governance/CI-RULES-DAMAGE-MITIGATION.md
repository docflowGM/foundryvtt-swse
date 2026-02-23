# 🛡️ CI GOVERNANCE RULES — Damage Mitigation Enforcement

**Status**: V2 Architectural Governance
**Scope**: Combat damage systems, ActorEngine mutations
**Authority**: Damage mitigation is high-risk; zero duplication tolerated

---

## ❌ BLOCKED PATTERNS

These patterns MUST be rejected at CI time. Commits containing them will fail pre-commit hooks.

### 1️⃣ Direct HP Subtraction

**Pattern**:
```javascript
const newHp = Math.max(0, actor.system.hp.value - damage);
await actor.update({ 'system.hp.value': newHp });
```

**Violation**: Bypasses ActorEngine, mitigation, threshold logic
**Rejection**: ❌ FAIL — Use `actor.applyDamage(damage)` or DamageEngine
**Check**: Regex: `system\.hp\.value\s*-|system\.hp\.value\s*=\s*Math\.max`

---

### 2️⃣ Direct System HP Writes Outside ActorEngine

**Pattern**:
```javascript
await actor.update({ 'system.hp.value': 50 });
```

**Allowed**: Only if called from ActorEngine or during actor initialization
**Rejection**: ❌ FAIL — Route through ActorEngine.updateActor()
**Check**: Grep for `actor.update.*system.hp` NOT from ActorEngine context

---

### 3️⃣ Damage Math Outside DamageMitigationManager

**Pattern**:
```javascript
const mitigated = damage - someValue;  // Without going through resolvers
const hpAfter = currentHP - mitigated; // Direct subtraction
```

**Violation**: Bypasses centralized mitigation rules
**Rejection**: ❌ FAIL — Use DamageMitigationManager.resolve()
**Check**: New damage calculation functions must use DamageMitigationManager

---

### 4️⃣ New Damage Implementation Without DamageMitigationManager

**Pattern**:
```javascript
export function customDamageLogic(actor, damage) {
  // Custom damage application
  // WITHOUT using DamageMitigationManager
}
```

**Violation**: Creates alternative damage path (architecture violation)
**Rejection**: ❌ FAIL — All damage must use DamageMitigationManager
**Check**: New functions in `*damage*.js` or `*combat*.js` must reference DamageMitigationManager

---

### 5️⃣ SR/DR Math Outside Resolvers

**Pattern**:
```javascript
const mitigated = damage - actor.system.shieldRating;
const afterDR = mitigated - actor.system.damageReduction;
```

**Violation**: Bypasses resolver logic (no bypass rules, no stacking)
**Rejection**: ❌ FAIL — Use ShieldMitigationResolver, DamageReductionResolver
**Check**: Shield/DR calculations must import and use resolvers

---

### 6️⃣ Direct SR/DR Item Mutations

**Pattern**:
```javascript
shield.system.currentSR = 10;
await ActorEngine.updateOwnedItems(actor, [{ _id, 'system.currentSR': 10 }]);
```

**Violation**: SR should be derived from actor, not item-level state
**Rejection**: ⚠️ WARN — SR must be derived layer (system.derived.shield.current)
**Check**: Lint for `currentSR`, `shieldRating` writes (allow reads only)

---

## ✅ REQUIRED PATTERNS

These patterns MUST be present for damage-related code.

### Damage Application

**Required**:
```javascript
// ✅ USE THIS
const result = DamageMitigationManager.resolve({
  damage: rollTotal,
  actor: target,
  damageType: 'normal',
  weapon: attackWeapon
});

// Apply via ActorEngine
await ActorEngine.applyDamage(actor, {
  hpLoss: result.hpDamage,
  tempLoss: result.tempHP.absorbed,
  srReduction: result.shield.degraded
});
```

**Check**: All damage functions must reference DamageMitigationManager

### SR/DR Implementation

**Required**:
```javascript
import { ShieldMitigationResolver } from './resolvers/shield-mitigation-resolver.js';
import { DamageReductionResolver } from './resolvers/damage-reduction-resolver.js';

const sr = ShieldMitigationResolver.resolve({...});
const dr = DamageReductionResolver.resolve({...});
```

**Check**: Any new mitigation logic must use resolvers

---

## 🔎 DETECTION RULES

### Pre-Commit Hook

Create `.git/hooks/pre-commit` with these checks:

```bash
#!/bin/bash

# Check 1: Block direct HP subtraction
if git diff --cached | grep -E 'system\.hp\.value\s*-|newHp\s*=\s*Math\.max.*system\.hp' > /dev/null; then
  echo "❌ BLOCKED: Direct HP subtraction detected"
  echo "Use actor.applyDamage() or DamageEngine instead"
  exit 1
fi

# Check 2: Block direct actor.update for HP
if git diff --cached | grep -E 'actor\.update.*system\.hp\.value' > /dev/null; then
  echo "❌ BLOCKED: Direct actor.update() for HP"
  echo "Route through ActorEngine.updateActor()"
  exit 1
fi

# Check 3: Require DamageMitigationManager in damage files
CHANGED_DAMAGE_FILES=$(git diff --cached --name-only | grep -E '(damage|combat).*\.js')
if [ -n "$CHANGED_DAMAGE_FILES" ]; then
  for file in $CHANGED_DAMAGE_FILES; do
    if grep -q 'function.*applyDamage\|export.*damage' "$file" 2>/dev/null; then
      if ! grep -q 'DamageMitigationManager\|DamageEngine\|actor\.applyDamage' "$file" 2>/dev/null; then
        echo "⚠️ WARNING: New damage function without centralized mitigation"
        echo "File: $file"
      fi
    fi
  done
fi

exit 0
```

### CI Linter Rules

Add to `.eslintrc` or custom linter:

```json
{
  "rules": {
    "no-direct-hp-math": {
      "enabled": true,
      "pattern": "system\\.hp\\.value\\s*[-=]",
      "message": "Direct HP math bypasses mitigation. Use DamageMitigationManager.",
      "severity": "error"
    },
    "require-actor-engine": {
      "enabled": true,
      "pattern": "actor\\.update.*system\\.hp",
      "exceptions": ["ActorEngine.js", "actor-engine.js"],
      "message": "Use ActorEngine.updateActor() for mutations.",
      "severity": "error"
    },
    "require-damage-manager": {
      "enabled": true,
      "filePattern": "damage.*\\.js|combat.*\\.js",
      "requireImport": ["DamageMitigationManager", "DamageEngine", "ShieldMitigationResolver"],
      "message": "Damage logic must use centralized resolvers.",
      "severity": "warn"
    }
  }
}
```

---

## 🚨 VIOLATION RESPONSE

### Severity Levels

| Level | Action | Example |
|-------|--------|---------|
| 🔴 CRITICAL | Reject commit, require refactor | Direct HP subtraction |
| ⚠️ WARNING | Allow commit, create issue | New damage function without DamageMitigationManager |
| ℹ️ INFO | Log only | Unused import |

### Handling Violations

1. **Detect**: Pre-commit hook or CI pipeline catches pattern
2. **Fail**: Block commit/PR with error message
3. **Fix**: Developer must:
   - Use DamageMitigationManager or DamageEngine
   - Route through ActorEngine
   - Validate result structure
4. **Re-push**: After fixing

---

## 📋 AUDIT CHECKLIST

Before merging any combat/damage PR:

- [ ] No direct HP subtraction (`damage -=`, `newHp =`)
- [ ] All mutations via ActorEngine.updateActor()
- [ ] All damage uses DamageMitigationManager.resolve()
- [ ] All SR/DR uses pure resolvers
- [ ] Locked order maintained: Bonus → SR → DR → Temp → HP
- [ ] Result validated: `DamageMitigationManager.validate(result)`
- [ ] Tests included (unit tests for resolver pipeline)
- [ ] Chat message posted (for transparency)

---

## 🔗 REFERENCES

- [Damage Mitigation Audit](../audit/DAMAGE-MITIGATION-AUDIT-V2.md)
- [DamageMitigationManager](../../scripts/engines/combat/damage-mitigation-manager.js)
- [ShieldMitigationResolver](../../scripts/engines/combat/resolvers/shield-mitigation-resolver.js)
- [DamageReductionResolver](../../scripts/engines/combat/resolvers/damage-reduction-resolver.js)
- [ActorEngine](../../scripts/governance/actor-engine/actor-engine.js)

---

## ✍️ ENFORCEMENT SIGN-OFF

**Policy**: ACTIVE (as of 2026-02-23)
**Enforcer**: Pre-commit hook + CI pipeline
**Override**: None (zero tolerance for damage path duplication)
**Review Cycle**: Quarterly (or when new violations detected)
