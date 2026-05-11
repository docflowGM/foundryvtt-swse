# Tech Specialist Workbench Integration Plan

## Executive Summary

Tech Specialist unlocks custom modifications to armor, weapons, vehicles, droids, and devices through the existing workbench system. The key challenge is adding actor-aware capability gating to an item-centric eligibility engine.

**Proposed approach:** Pass optional actor context through UpgradeService → CustomizationWorkflow → UpgradeEligibilityEngine without breaking existing item-only callers. Tech Specialist modifications catalog as a new category in UPGRADE_CATALOG. Effect application uses existing EffectResolver with Tech Specialist–specific mutation mappings.

**Scope:** 4 implementation phases, ~150 lines total code changes, confined to customization/eligibility/catalog layer.

---

## 1. File Modification Map

### A. Feature Metadata (feats.db)
- **packs/feats.db** — Tech Specialist entry
  - Normalize prerequisite metadata: `{ "prerequisite": "trained_mechanics" }`
  - Add capability: `{ "customizationCapabilities": [{ "type": "TECH_SPECIALIST_MODIFICATIONS" }] }`
  - **Keep [REQUIRES MANUAL MAPPING]** until TS-2/TS-3 prove workbench traits are available and safely applied

### B. Centralized Capability Resolution
- **scripts/engine/feats/meta-resource-feat-resolver.js** (extend)
  - Add method: `getCustomizationCapabilities(actor)` → returns array of capability types
  - Add check: `canActorPerformTechSpecialistModifications(actor)` → boolean
  - Pattern: Read from feat metadata, fallback to hasFeat() compatibility

### C. Upgrade Catalog
- **scripts/engine/customization/upgrade-catalog.js** (extend)
  - Add Tech Specialist modifications section with ~13 new entries
  - Each entry: key, name, category: 'tech-specialist', cost logic, appliesTo, description

### D. Eligibility Gating
- **scripts/engine/customization/upgrade-eligibility-engine.js** (modify constructor + canInstallUpgrade)
  - Constructor: accept optional actor parameter
  - canInstallUpgrade: add check for source === 'tech-specialist' requires actor + capability

### E. Workflow Integration
- **scripts/engine/customization/customization-workflow.js** (modify getFullCustomizationState)
  - Add optional actor parameter with default null
  - Pass actor to eligibilityEngine methods

### F. UpgradeService Bridge (no changes needed)
- **scripts/engine/upgrades/UpgradeService.js** — Already passes actor to workflow via getAvailableUpgradesForRecord()
  - Just needs to forward actor to workflow.getFullCustomizationState()

### G. Effect Resolver (extend)
- **scripts/engine/customization/effect-resolver.js** (add method)
  - Add handler: `#resolveTechSpecialistEffects(upgradeDef, item, preview, mutations, warnings)`
  - Delegate to category-specific handlers (armor, weapon, vehicle, droid, device)
  - Each handler maps trait → mutation safely

---

## 2. Minimal Actor-Context Seam

**Current state:** `getEligibleUpgrades(item)` is item-only.

**Proposed signature:**

```javascript
// UpgradeEligibilityEngine
constructor(profileResolver, slotEngine, actor = null) {
  this.actor = actor;
  // ...
}

getEligibleUpgrades(item) {
  // ... existing code ...
  // NEW: Filter out tech-specialist mods if actor lacks capability
  if (!this.actor && upgrade.source === 'tech-specialist') {
    return { allowed: false, reason: 'actor_required' };
  }
  if (upgrade.source === 'tech-specialist') {
    const hasCapability = MetaResourceFeatResolver.canActorPerformTechSpecialistModifications(this.actor);
    if (!hasCapability) return { allowed: false, reason: 'missing_tech_specialist_feat' };
  }
  // ... rest of existing logic ...
}
```

**CustomizationWorkflow integration:**

```javascript
getFullCustomizationState(item, { actor = null } = {}) {
  // ... existing early validation ...
  this.eligibilityEngine = new UpgradeEligibilityEngine(this.profileResolver, this.slotEngine, actor);
  const availableUpgrades = this.eligibilityEngine.getEligibleUpgrades(item);
  // ... rest of method ...
}
```

**UpgradeService caller (already exists):**

```javascript
getAvailableUpgradesForRecord(actor, record) {
  // ... 
  const state = this.workflow.getFullCustomizationState(record.document, { actor });
  // ...
}
```

**Backward compatibility:**
- Existing item-only callers: `workflow.getFullCustomizationState(item)` — works, actor defaults to null, Tech Specialist mods filtered out silently
- UI apps have actor: `workflow.getFullCustomizationState(item, { actor })` — Tech Specialist mods appear if feat present

---

## 3. Metadata Shape

**In packs/feats.db, Tech Specialist entry:**

```json
{
  "system": {
    "abilityMeta": {
      "status": "customization_tech_specialist",
      "description": "Custom modifications to armor, weapons, vehicles, droids, and devices.",
      "customizationCapabilities": [
        { "type": "TECH_SPECIALIST_MODIFICATIONS" }
      ]
    },
    "prerequisite": "Trained in Mechanics"
  }
}
```

**MetaResourceFeatResolver check:**

```javascript
getCustomizationCapabilities(actor) {
  const capabilities = [];
  for (const feat of getActorFeatItems(actor)) {
    const caps = feat?.system?.abilityMeta?.customizationCapabilities ?? [];
    capabilities.push(...caps);
  }
  return capabilities;
}

canActorPerformTechSpecialistModifications(actor) {
  if (!actor) return false;
  const caps = this.getCustomizationCapabilities(actor);
  return caps.some(c => c.type === 'TECH_SPECIALIST_MODIFICATIONS');
}
```

---

## 4. Trait Automation Status

| Trait | Category | Schema Path | Status | Notes |
|-------|----------|-------------|--------|-------|
| **Agile Armor** | armor | `system.armor.maxDexBonus` | ✅ AUTOMATE | +1 to max dex, direct mutation |
| **Fortifying Armor** | armor | `system.defense.fortitude.equipment` | ✅ AUTOMATE | +1 equipment bonus |
| **Protective Armor** | armor | `system.defense.reflex.armor` | ✅ AUTOMATE | +1 armor bonus |
| **Improved Accuracy** | weapon | `system.attack.equipment` | ✅ AUTOMATE | +1 equipment attack bonus |
| **Improved Damage** | weapon | `system.damage.base` or upgrade flag | ⚠️ RULE-NOTE | Damage scaling complex; defer to effect system |
| **Selective Fire** | weapon | `system.fireMode` or flag | ⚠️ RULE-NOTE | Requires weapon subtype detection; needs UI support |
| **Enhanced Dexterity** | droid/vehicle | `system.abilities.dexterity.value` | ✅ AUTOMATE | +2 ability score |
| **Enhanced Intelligence** | droid | `system.abilities.intelligence.value` | ✅ AUTOMATE | +2 ability score |
| **Enhanced Strength** | droid/device | `system.abilities.strength.value` or `system.strength` | ✅ AUTOMATE | +2 ability score |
| **Improved Shields** | vehicle | `system.shields.rating` | ✅ AUTOMATE | +5 SR |
| **Improved Speed** | vehicle | `system.speed.base` | ✅ AUTOMATE | +25% minimum +1 sq |
| **Improved Durability** | device | `system.damageReduction` + `system.hp` | ⚠️ RULE-NOTE | Needs device schema verification |
| **Mastercraft Device** | device | `system.checkBonus` or flag | ⚠️ RULE-NOTE | Check bonus context unclear |

**Automation breakdown:**
- ✅ **9 traits fully automatable** (use direct schema mutations)
- ⚠️ **4 traits as rule-notes** (disabled in catalog, shown with GM note)

---

## 5. Cost/Time/DC Model

**Cost calculation in UpgradeService (extend CustomizationCostEngine):**

```javascript
// In CustomizationCostEngine.getTechSpecialistModificationCost(item)
static getTechSpecialistModificationCost(item) {
  const baseItemCost = item.system?.price ?? 0;
  const tenPercent = Math.ceil(baseItemCost * 0.10);
  return Math.max(tenPercent, 1000);
}
```

**Metadata in upgrade catalog entry:**

```javascript
def('tech_agile_armor', {
  name: 'Agile Armor',
  category: 'tech-specialist',
  costFormula: 'max(10% of item cost, 1000 credits)',
  cost: 0, // use costFormula, resolver calculates per-item
  slotCost: 0,
  mechanicsDC: 20,
  timeHours: null, // calculated: cost / 1000 * 24
  restriction: 'common',
  source: 'tech-specialist',
  appliesTo: ['armor'],
  affectedAreas: [],
  description: 'The armor's Maximum Dexterity Bonus increases by 1.',
  metadata: { trait: 'agile_armor', systemPath: 'system.armor.maxDexBonus', value: 1 }
})
```

**In UI preview (no calendar implementation):**
- Display: "Cost: 1,000 cr  |  Time: 1 day  |  DC 20 Mechanics check"
- No downtime tracking
- No Aid Another time division (GM-enforced note: "Other trained Mechanics may assist")

---

## 6. One-Benefit-Per-Item Enforcement

**In UpgradeEligibilityEngine.canInstallUpgrade():**

```javascript
canInstallUpgrade(item, upgradeKey) {
  const upgrade = UPGRADE_CATALOG[upgradeKey];
  // ... existing checks ...

  // NEW: Tech Specialist enforcement
  if (upgrade.source === 'tech-specialist') {
    const customState = this.slotEngine.getCustomizationState(item);
    const installedTechSpecs = (customState.installedUpgrades ?? [])
      .filter(u => UPGRADE_CATALOG[u.upgradeKey]?.source === 'tech-specialist');

    // Only one Tech Specialist benefit per item (RAW rule)
    if (installedTechSpecs.length > 0) {
      return { allowed: false, reason: 'tech_specialist_benefit_already_applied' };
    }

    // Cannot apply same trait twice
    if (installedTechSpecs.some(u => u.upgradeKey === upgradeKey)) {
      return { allowed: false, reason: 'duplicate_tech_specialist_trait' };
    }
  }

  return { allowed: true };
}
```

**Metadata on installed upgrade instance:**

```json
{
  "upgradeKey": "tech_agile_armor",
  "upgradeName": "Agile Armor",
  "source": "tech-specialist",
  "trait": "agile_armor",
  "operationCost": 1000,
  "mechanicsDC": 20,
  "timeHours": 24,
  "appliedBy": "actor_name",
  "appliedAt": "2026-05-11T..."
}
```

---

## 7. Mutation/Effect Application

**In EffectResolver (add):**

```javascript
static #resolveTechSpecialistEffects(upgradeDef, item, preview, mutations, warnings) {
  const trait = upgradeDef.metadata?.trait;
  const category = item.type;

  switch (category) {
    case 'armor':
      return this.#resolveTechSpecialistArmorEffects(trait, item, preview, mutations, warnings);
    case 'weapon':
    case 'blaster':
      return this.#resolveTechSpecialistWeaponEffects(trait, item, preview, mutations, warnings);
    case 'vehicle':
      return this.#resolveTechSpecialistVehicleEffects(trait, item, preview, mutations, warnings);
    case 'droid':
    case 'character':
      return this.#resolveTechSpecialistDroidEffects(trait, item, preview, mutations, warnings);
    case 'gear':
      return this.#resolveTechSpecialistDeviceEffects(trait, item, preview, mutations, warnings);
    default:
      warnings.push(`Tech Specialist trait not supported for category: ${category}`);
  }
}

static #resolveTechSpecialistArmorEffects(trait, item, preview, mutations, warnings) {
  switch (trait) {
    case 'agile_armor':
      mutations['system.armor.maxDexBonus'] = (preview['system.armor.maxDexBonus'] ?? 0) + 1;
      break;
    case 'fortifying_armor':
      mutations['system.defense.fortitude.equipment'] = (preview['system.defense.fortitude.equipment'] ?? 0) + 1;
      break;
    case 'protective_armor':
      mutations['system.defense.reflex.armor'] = (preview['system.defense.reflex.armor'] ?? 0) + 1;
      break;
    default:
      warnings.push(`Unknown armor trait: ${trait}`);
  }
}
// ... similar for weapon, vehicle, droid, device handlers ...
```

---

## 8. Implementation Phases

### Phase TS-1: Capability & Eligibility (2-3 hours)
**SCOPE:** Capability metadata + actor-aware eligibility seam only. NO catalog, NO effects, NO enforcement logic yet.

- Add prerequisite + capability metadata to Tech Specialist in feats.db (keep [REQUIRES MANUAL MAPPING])
- Add resolver methods to MetaResourceFeatResolver (getCustomizationCapabilities, hasCustomizationCapability, canActorPerformTechSpecialistModifications)
- Modify UpgradeEligibilityEngine constructor and canInstallUpgrade() to accept optional actor
- Modify CustomizationWorkflow.getFullCustomizationState() to accept optional actor
- Add actor parameter forwarding in UpgradeService (where it already exists)
- Add Mechanics training check if clean helper exists; otherwise defer and document as prerequisite-only until TS-2
- **Validation:** Item-only callers still work, actor-aware callers can check capability, Tech Specialist remains marked manual/partial

### Phase TS-2: Catalog & Preview (1-2 hours)
**NOT IN TS-1.** TS-2 adds catalog entries, cost/DC/time preview, one-benefit enforcement logic.

### Phase TS-3: Safe Effect Mapping (2-3 hours)
**NOT IN TS-1.** TS-3 implements EffectResolver handlers ONLY after schema paths are verified. 9 automatable traits → mutations. 4 unsupported traits → rule-notes (disabled, GM note visible).

### Phase TS-4: Hardening (1 hour)
- Test actor-less callers don't break
- Test multiple items with different traits
- Test error conditions (bad cost, missing DC checks)
- Verify metadata integrity across phases
- **Validation:** Full test suite passes, no regressions

---

## 9. Risk Report

### Likely Breakpoints
1. **Actor-aware eligibility seam**
   - Risk: Backward compatibility if existing code assumes eligibilityEngine never gets actor
   - Mitigation: Default actor=null in all signatures, filter silently for item-only callers
   - Test: Run UpgradeService tests with and without actor parameter

2. **Effect application schema uncertainty**
   - Risk: Droid/device schema may not have expected paths (ability scores, strength, etc.)
   - Mitigation: Inspect droid/device schema first, mark unsupported traits as rule-notes
   - Test: Create test droid, verify mutations apply correctly

3. **Selective Fire trait complexity**
   - Risk: Fire mode switching may require UI support not yet in place
   - Mitigation: Defer Selective Fire to Phase TS-3, implement as rule-note first
   - Test: Verify rule-note displays without errors

### Broad-Refactor Risks
- ⚠️ **Avoid:** Passing actor to ALL eligibility checks throughout system
- ✅ **Instead:** Limit actor parameter to UpgradeEligibilityEngine constructor only
- ✅ **Already exists:** UpgradeService already has actor context, can forward selectively

### Schema Uncertainty
- **Droid abilities:** Verify `system.abilities.dexterity.value` path exists
- **Device strength:** Verify `system.strength` or device-specific path
- **Vehicle speed:** Verify `system.speed.base` supports +25% calculation

### Runtime Confirmation Items
1. Mechanics DC 20 check UI (if workbench has check support)
2. Aid Another time division display (GM note only, no automation)
3. Modified item market value = base + 2x modifications (display only)

---

## 10. Success Criteria

- [ ] Tech Specialist feat has proper metadata
- [ ] Capability resolver works (actors with/without feat)
- [ ] Actor-aware eligibility gating passes without breaking item-only callers
- [ ] Tech Specialist mods show only for qualified actors
- [ ] 9 automatable traits apply mutations correctly
- [ ] 4 unsupported traits display as rule-notes
- [ ] One-benefit-per-item enforcement works
- [ ] Cost/time/DC preview displays correctly
- [ ] No regressions in existing customization system
- [ ] Backward compatibility maintained (item-only callers unaffected)

---

## Next Steps

Upon approval of this plan, proceed with Phase TS-1 in isolation. Do not combine phases. Validate each phase before moving to the next. Update this document if major changes occur during implementation.
