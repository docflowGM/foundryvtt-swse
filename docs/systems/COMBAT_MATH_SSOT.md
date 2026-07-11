# Combat Roll Math — Single Source of Truth

**Canonical seam:** `scripts/engine/combat/combat-roll-math.js`
**Exports:** `resolveAttackBonus(actor, weapon, actionId?, context?)`,
`resolveDamageBonus(actor, weapon, context?)`

Both return `{ total, components, flags }`. `total` is the number added to the
roll; `components` is the labeled breakdown shown in tooltips. Because the roll
path, the breakdown path, and the legacy compatibility wrappers call the **same**
resolver functions, sheets/tooltips can never under- or over-report relative to
the dice that are actually rolled.

## Canonical flows

### Attack roll path
```
attacks.js  ──►  resolveAttackBonus(actor, weapon, null, rollOptions).total
                 (+ fighting-defensively penalty, custom/situational modifier,
                    multi-attack sequence penalty — roll-invocation-only extras)
```

### Damage roll path
```
attacks.js / damage.js  ──►  resolveDamageBonus(actor, weapon, rollOptions).total
```

### Tooltip / breakdown path
```
weapon-tooltip.js
  ──►  WeaponsEngine.getAttackBonusBreakdown(actor, weapon)  ──►  resolveAttackBonus(...)
  ──►  WeaponsEngine.getDamageBonusBreakdown(actor, weapon)  ──►  resolveDamageBonus(...)
```

`WeaponsEngine.getAttackBonusBreakdown` / `getDamageBonusBreakdown` are thin
adapters that return `{ total, components }` straight from the resolver.

### Legacy compatibility-wrapper path
```
combat-utils.computeAttackBonus(...)  ──►  resolveAttackBonus(...).total
combat-utils.computeDamageBonus(...)  ──►  resolveDamageBonus(...).total
```

This keeps older orchestrators such as Autofire, Full Attack, and legacy combat
cards numerically aligned while their imports are migrated at a safer pace.

## Modifiers owned by the resolvers

`resolveAttackBonus` / `resolveDamageBonus` are the ONLY place these are applied
for roll math: BAB / ability mod, weapon enhancement, range penalty, firing into
melee, condition-track penalty, proficiency penalty, passive/STATE modifiers,
combat options, rage, Sith Commander, Inquisition, Unsettling Presence, rapid
alchemy, Force Item, effect-intent (ModifierEngine), and scoped combat feats. NPC
flat-statblock mode is honored first and short-circuits to the flat bonus.

Keep this file as **math only** — action legality, UI state, and ammo/mode
selection belong to their own engines, not the resolver.

## Legacy API status

`scripts/combat/utils/combat-utils.js` still exports `computeAttackBonus()` and
`computeDamageBonus()` for old callers, but these exports are now compatibility
wrappers. They no longer own independent attack/damage math.

New code should import `resolveAttackBonus()` / `resolveDamageBonus()` directly.
Existing callers may remain temporarily because they inherit canonical math
through the wrappers.

### Remaining wrapper consumers to retire

| File | Function | Status |
|------|----------|--------|
| `scripts/combat/rolls/enhanced-rolls.js` | `computeAttackBonus` | API migration candidate; math already canonical through wrapper |
| `scripts/combat/systems/enhanced-combat-system.js` | both | API migration candidate; math already canonical through wrapper |
| `scripts/engine/combat/ui/CombatUIAdapter.js` | `computeDamageBonus` | API migration candidate; math already canonical through wrapper |
| `scripts/engine/combat/vehicles/utils/vehicle-calculations.js` | `computeAttackBonus` | evaluate separately; vehicle weapon attack path may deserve a vehicle-specific resolver |

### Species combat bonus note

The old combat-utils implementation read `system.speciesCombatBonuses` /
`system.speciesTraitBonuses.combat` attack/damage sub-keys. Static review found
no v2 write site for those attack/damage sub-keys; only defense sub-keys appear
to be populated and consumed. The resolver therefore became authoritative rather
than preserving a second, likely-dead species combat path.

If a future species implementation needs flat attack/damage bonuses, model them
through the modifier/effect-intent pipeline so `combat-roll-math.js` picks them up
once for rolls, tooltips, and wrapper callers.

## Guardrail

`tools/check-combat-math-ssot.mjs` statically asserts that the roll path,
breakdown path, and compatibility wrappers all route through the canonical
resolvers. It also reports any file still importing the old wrapper API so import
cleanup remains visible without implying math has forked.
