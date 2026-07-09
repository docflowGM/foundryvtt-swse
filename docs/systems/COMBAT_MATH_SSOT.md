# Combat Roll Math — Single Source of Truth

**Canonical seam:** `scripts/engine/combat/combat-roll-math.js`
**Exports:** `resolveAttackBonus(actor, weapon, actionId?, context?)`,
`resolveDamageBonus(actor, weapon, context?)`

Both return `{ total, components, flags }`. `total` is the number added to the
roll; `components` is the labeled breakdown shown in tooltips. Because the roll
path and the breakdown path call the **same** function, sheets/tooltips can never
under- or over-report relative to the dice that are actually rolled.

## Canonical flows

### Attack roll path
```
attacks.js  ──►  resolveAttackBonus(actor, weapon, null, rollOptions).total
                 (+ fighting-defensively penalty, custom/situational modifier,
                    multi-attack sequence penalty — roll-invocation-only extras)
```

### Damage roll path
```
attacks.js  ──►  resolveDamageBonus(actor, weapon, rollOptions).total
```

### Tooltip / breakdown path
```
weapon-tooltip.js
  ──►  WeaponsEngine.getAttackBonusBreakdown(actor, weapon)  ──►  resolveAttackBonus(...)
  ──►  WeaponsEngine.getDamageBonusBreakdown(actor, weapon)  ──►  resolveDamageBonus(...)
```

`WeaponsEngine.getAttackBonusBreakdown` / `getDamageBonusBreakdown` are thin
adapters that return `{ total, components }` straight from the resolver.

## Modifiers owned by the resolvers

`resolveAttackBonus` / `resolveDamageBonus` are the ONLY place these are applied
for roll math: BAB / ability mod, weapon enhancement, range penalty, firing into
melee, condition-track penalty, proficiency penalty, passive/STATE modifiers,
combat options, rage, Sith Commander, Inquisition, Unsettling Presence, rapid
alchemy, Force Item, effect-intent (ModifierEngine), and scoped combat feats. NPC
flat-statblock mode is honored first and short-circuits to the flat bonus.

Keep this file as **math only** — action legality, UI state, and ammo/mode
selection belong to their own engines, not the resolver.

## Legacy duplicate (deprecated)

`scripts/combat/utils/combat-utils.js` still exports `computeAttackBonus()` and
`computeDamageBonus()`. These predate the resolvers and are **deprecated**:

- They **omit** combat-option, rage, Sith Commander, rapid alchemy, Force Item,
  effect-intent, and scoped-feat modifiers.
- They still add **legacy species combat bonuses**
  (`system.speciesCombatBonuses` / `speciesTraitBonuses.combat`) and an explicit
  dex-to-damage talent branch that the resolvers do not.

They remain **behavior-frozen** (no delegation yet) because a blind delegate
would silently drop those species bonuses. New code must not use them.

### Remaining consumers to migrate (with the parity concern)

| File | Function | Parity to verify before migrating |
|------|----------|-----------------------------------|
| `scripts/combat/rolls/damage.js` | `computeDamageBonus` | species damage bonus + dex-to-damage vs resolver |
| `scripts/combat/rolls/enhanced-rolls.js` | `computeAttackBonus` | species attack bonus vs resolver |
| `scripts/combat/systems/enhanced-combat-system.js` | both | species bonuses vs resolver |
| `scripts/engine/combat/ui/CombatUIAdapter.js` | `computeDamageBonus` | species damage bonus vs resolver |
| `scripts/engine/combat/vehicles/utils/vehicle-calculations.js` | `computeAttackBonus` | vehicle weapon attack path |

**Migration rule:** before switching a consumer to the resolver, confirm at
runtime that species combat bonuses are either (a) already applied by the
resolver via ModifierEngine/effect-intent, or (b) genuinely dead data. Only then
is the resolver numerically ≥ the legacy result and safe to swap.

## Guardrail

`tools/check-combat-math-ssot.mjs` statically asserts that the roll path and the
breakdown path both route through the canonical resolvers, and reports any file
still importing the deprecated `combat-utils` math so the migration list above
stays honest.
