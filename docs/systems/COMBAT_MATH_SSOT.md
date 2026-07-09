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

### Static finding (2026-07-09 review) — the exact blocker

The canonical resolvers do **not** read `system.speciesCombatBonuses` /
`system.speciesTraitBonuses.combat`; `combat-utils` adds
`speciesCombat.meleeAttack / rangedAttack / meleeDamage / rangedDamage`. A repo
grep finds **no write site** for those attack/damage sub-keys — only the
`.defenses` sub-key is populated and consumed (by `defense-calculator.js`). That
strongly suggests the species *attack/damage* bonus is legacy/unpopulated in v2,
so migrating would be a no-op. **But absence of a static write is not proof**: a
species sidecar or trait applier could set it at runtime.

**Recommended runtime test before migrating any of the 5 consumers:** on a
character whose species grants a flat combat bonus (e.g. a species with a melee
or ranged attack/damage trait), log `actor.system.speciesCombatBonuses` after
species application and compare `computeAttackBonus` vs `resolveAttackBonus().total`
(and the damage pair). If they match (species sub-keys empty/zero), migrate the
consumer to the resolver as a thin change. If they differ, the species bonus must
first be modeled as a ModifierEngine/effect-intent modifier so the resolver picks
it up — only then migrate.

Verdict per consumer (static): all five are **needs-runtime-verification** — none
is safe to migrate blindly. `vehicle-calculations.js` is additionally
special-cased (vehicle weapons don't take personal species/feat modifiers), so it
is closer to intentional-legacy.

## Guardrail

`tools/check-combat-math-ssot.mjs` statically asserts that the roll path and the
breakdown path both route through the canonical resolvers, and reports any file
still importing the deprecated `combat-utils` math so the migration list above
stays honest.
