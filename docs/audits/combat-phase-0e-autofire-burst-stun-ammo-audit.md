# Combat Phase 0E — Autofire, Burst Fire, Ammo, Reload, and Stun Audit

Scope: audit only. No runtime files were changed.

This pass accounts for the Autofire/Burst Fire/stun/ammo skeleton against the current repo snapshot and the table-boundary decisions established during Phase 0. The goal is not full map automation. The goal is to make the system ready to automate sheet-owned math and resources while leaving area placement, affected targets, line of sight, cover, and other tactical adjudication to the GM.

## User implementation requirements captured for later phases

### Burst Fire rule interpretation

Burst Fire should be treated as a single-target attack option that borrows weapon eligibility from Autofire, not as an Autofire area attack.

Required future behavior:

- Requires the Burst Fire feat.
- Requires a ranged weapon with Autofire capability.
- Requires proficiency with the weapon.
- Requires the weapon to be in Autofire mode or otherwise able to fire a burst.
- Resolves against one target only.
- Applies `-5` attack penalty.
- If Strength is below 13 and the weapon is not a vehicle weapon, the attack penalty becomes `-10`.
- Adds `+2` weapon damage dice.
- Expends 5 shots.
- Requires at least 5 shots remaining when ammo tracking is enabled.
- Does not stack with Deadeye or Rapid Shot extra-damage dice.
- Is not an area attack.
- Does not deal half damage on a miss.
- Does not trigger Evasion.
- For vehicle weapons, add the extra dice before vehicle multipliers.

### Ammo-counting houserule boundary

Ammo behavior must obey the `trackBlasterCharges` houserule.

When ammo tracking is enabled:

- Normal shot consumes 1 shot.
- Burst Fire consumes 5 shots.
- Autofire consumes 10 shots.
- Burst Fire is disabled when fewer than 5 shots remain.
- Autofire is disabled when fewer than 10 shots remain.
- Normal ranged attacks are disabled or warned when fewer than 1 shot remains.
- A warning should explain: `Not enough shots remaining. Reload required.`
- Weapons with current ammo below max should show Reload controls.

When ammo tracking is disabled:

- No ammo counters.
- No ammo pills.
- No Reload buttons.
- No ammo-based greying out.
- No ammo decrement.
- No `not enough shots` popup.
- Attack options remain available if otherwise legal.

### Ammo UI requirement

When ammo tracking is enabled, ammo indicators and Reload buttons should appear consistently in:

- Combat tab weapon/attack cards.
- Gear tab weapon rows/cards.
- Attack context dialog.

The desired display is pill-based. The shot pills should inherit the selected blaster bolt color from the weapon visual profile where possible.

Examples:

- red blaster bolt color -> red shot pills
- green blaster bolt color -> green shot pills
- blue/cyan/orange/etc. -> matching shot pills
- missing/unknown color -> neutral fallback

### Reload requirement

When ammo tracking is enabled and a weapon has `current < max`, show a Reload button. Reload should eventually:

- Spend the correct action economy.
- Restore the weapon to its max current ammo.
- Create a chat/status note.
- Optionally consume spare power packs/cells if inventory tracking is later wired.

The current safe implementation target should be GM-assisted reload source handling: spend action economy, refill the weapon, and leave power-pack inventory source adjudication to the table unless a later inventory pass establishes a single ammunition-source authority.

### Stun weapon mode requirement

If a weapon supports a stun setting, the attack UI should expose a Lethal/Stun selector.

This selector should remain visible even when ammo tracking is disabled, because stun changes damage semantics rather than only resource accounting.

Required future behavior:

- Default mode is lethal/normal.
- Show Stun only for weapons with a stun setting or stun-only weapons.
- Switching Lethal/Stun should spend the correct action economy, likely the same Switch Weapon Mode swift action.
- Stun context must survive from attack dialog to attack card to damage roll.
- Stun damage must later use RAW semantics: half HP damage, original stun damage for DT comparison, unconscious/condition-track consequences, and immunity for droids/vehicles/objects unless an exception applies.

## Current code accounting

### Houserule setting exists but is not consumed by ammo enforcement

Evidence:

- `scripts/houserules/houserule-settings.js` registers `trackBlasterCharges` as a world boolean setting with default false.
- `scripts/houserules/houserules-manifest.js` marks `trackBlasterCharges` as wired.
- `scripts/houserules/houserule-presets.js` includes presets that turn ammo tracking on/off.
- The actual ammo engine and attack dialog paths do not appear to query `game.settings.get('foundryvtt-swse', 'trackBlasterCharges')` before showing ammo UI or enforcing ammo consumption.

Audit result: **setting exists, but the runtime ammo paths are not houserule-aware yet.**

### AmmoSystem is useful but currently unconditional

`AmmoSystem` already provides:

- `consumeAmmunition(actor, weapon, amount)`
- `reloadWeapon(actor, weapon)`
- `canUseWeapon(weapon, required)`
- `getAmmoStatus(weapon)`
- `getAmmoRequired(attackType)`
- `setAmmunition(actor, weapon, amount)`
- `getAmmoWeapons(actor)`
- `getAmmoInventory(actor)`

This is a strong skeleton and should be reused.

However:

- It does not check the ammo-counting houserule.
- `reloadWeapon()` refills the weapon but does not spend action economy.
- `reloadWeapon()` does not consume or prompt for a spare power pack/cell.
- `getAmmoRequired()` knows normal/rapidShot/burstFire/autofire costs, but the main attack dialog does not use this to gate options.

Audit result: **good engine skeleton, missing table-setting gate and action-economy integration.**

### Attack context dialog exposes Autofire/Burst Fire but does not gate by ammo

`roll-config.js` builds the ranged attack options panel with checkboxes for:

- Autofire
- Burst Fire
- Rapid Shot

Current gating appears to be:

- Autofire enabled if the weapon supports Autofire.
- Burst Fire enabled if the weapon supports Autofire and the actor has the Burst Fire feat.

Missing from the attack dialog:

- ammo tracking houserule check
- current ammo count
- max ammo count
- shot pills
- Reload button
- disabled state when insufficient shots remain
- `Not enough shots remaining. Reload required.` warning
- Burst Fire Strength 13 penalty escalation
- proficiency requirement display
- weapon mode display/select state
- stun selector
- non-stacking warning for Burst Fire vs Deadeye/Rapid Shot

Audit result: **dialog has basic legality hints but not resource/mode legality.**

### Concept combat and gear cards are missing the desired ammo UI

The concept inventory weapon card currently shows attack, damage, crit, quantity/weight/value, and roll/inspect actions. It does not show current/max ammo, shot pills, Reload, or lethal/stun mode.

The older v2 inventory weapon card and item row do show `current/max` ammunition if `system.ammunition` exists, but that display:

- is not gated by `trackBlasterCharges`
- is not pill-based
- does not inherit blaster bolt color
- has no Reload button
- is not aligned with the concept combat redesign

Audit result: **ammo UI exists in old inventory surfaces only as raw text, but not as the desired shared ammo component.**

### Enhanced Autofire helper has several high-risk correctness issues

`SWSERoll.rollAutofire()` in `scripts/combat/rolls/enhanced-rolls.js` contains a lot of useful intent, including comments for Autofire and Burst Fire. It also enforces ammo and calls `AmmoSystem.consumeAmmunition()`.

High-risk seams:

1. It enforces ammo unconditionally, with no `trackBlasterCharges` check.
2. It treats `weapon.system.strippedFeatures.autofire === true` as Autofire capability. In this repo, stripped features generally mean the feature was removed, so this likely reverses the meaning.
3. It does not check `weapon.system.autofire === true`, even though other code does.
4. It contains a `mode` reference when reading d20 result that appears undefined in this function.
5. It checks Evasion against `actor.items`, meaning the attacker, not each target.
6. Its Burst Fire branch deals half damage on miss, which is explicitly wrong for Burst Fire.
7. It rolls damage immediately inside the multi-target helper, while the main canonical attack path posts damage buttons separately. That increases authority drift.
8. It appears to decrement ammo after rolling and damaging, not as a preflight state gate tied to action economy.

Audit result: **not safe as the canonical future path without rewriting/retiring it into the shared attack context pipeline.**

### Canonical attack path can apply Burst Fire attack modifiers, but damage/resource context can be lost

`CombatOptionResolver` has a good default Burst Fire rule:

- `requiresAttackType: "ranged"`
- `requiresAutofire: true`
- `attackModifier: -5`
- `damageExtraWeaponDice: 2`
- `ammunitionCost: 5`

The canonical attack path uses `CombatOptionResolver.collectAttackModifiers()` and receives dialog `attackOptions` from `showRollModifiersDialog()`.

Risk:

- Attack roll may apply Burst Fire penalty.
- The later Roll Damage button may not preserve the selected `attackOptions.burstFire` context.
- Ammo is not decremented by canonical attack/damage.
- The UI does not route ammo requirements through `AmmoSystem.getAmmoRequired()`.

Audit result: **Burst Fire is metadata-rich in the resolver, but the attack-card/damage/ammo pipeline is not context-complete yet.**

### Burst Fire action metadata conflicts

`data/combat-actions.json` marks Burst Fire as a standard action.

`data/feat-combat-actions.json` marks Burst Fire as a full-round action.

The pasted Burst Fire rule says Burst Fire is used as a single attack against a single target and consumes five shots. The action cost should align with the attack it modifies, normally a standard attack unless another rule/action package changes it.

Audit result: **action metadata conflict; future routing should choose one authority and remove/ignore the wrong full-round entry.**

### Stun support is mostly data-only right now

Evidence:

- Item defaults and data models allow `damageType: 'stun'`.
- Weapon edit UI exposes a bolt-color field, ammunition fields, and general item fields.
- Combat action data includes `Switch Weapon Mode` for lethal/stun and single-shot/autofire examples.
- Store and compendium data include stun weapons.

Missing:

- canonical `hasStunSetting` / `supportsStunMode` field authority
- current weapon fire mode state
- Lethal/Stun selector in attack dialog
- action economy spend for switching lethal/stun
- stun context passed to damage
- RAW stun damage resolver
- droid/vehicle/object immunity check
- stun max range for blaster stun settings

Audit result: **stun exists as damage type and flavor, but not as a reliable weapon mode pipeline.**

### Blaster bolt color data exists and can support colored ammo pills

`WeaponVisualProfileResolver` resolves blaster bolt color from:

- draft bolt color
- SWSE item flag `boltColor`
- `system.visual.boltColor`
- `system.boltColor`
- default bolt color

The weapon edit UI exposes `flags.swse.boltColor` with options such as red, green, blue, cyan, and orange.

Audit result: **future shot pills can reuse `WeaponVisualProfileResolver.getVisualProfile()` or `getBoltColor()` instead of inventing a parallel color map.**

## Rules/accounting classification

| System | Current State | Automation Boundary | Severity |
|---|---|---:|---:|
| Ammo houserule | setting exists but not consumed by ammo enforcement/UI | automate setting gate | high |
| Ammo engine | useful core functions, unconditional | reuse/harden | medium |
| Reload | engine exists, no action economy/UI | automate action cost; GM-assisted source | high |
| Combat ammo UI | missing from concept surfaces | automate display when enabled | medium |
| Gear ammo UI | raw old display only | automate shared component | medium |
| Attack dialog ammo gate | absent | automate when ammo enabled | high |
| Autofire | partial enhanced helper, GM area not cleanly separated | automate math/resource; GM targets | high |
| Burst Fire | resolver metadata good, helper wrong on miss | automate single-target mode | high |
| Stun mode | data-only/partial | automate selector/context; GM target effects as needed | high |
| Colored shot pills | visual resolver exists | automate UI flair | low |

## Recommended future implementation order inside Phase 4/5/9

1. Add a single `isAmmoTrackingEnabled()` helper that reads `trackBlasterCharges`.
2. Add a shared `WeaponAmmoPresenter`/view-model helper that returns `visible`, `current`, `max`, `canReload`, `pillColor`, and option gates.
3. Hide all ammo counters/reload controls when ammo tracking is disabled.
4. Wire combat and gear surfaces to the shared ammo view model.
5. Wire attack dialog Autofire/Burst Fire disable states to ammo gates when enabled.
6. Add Reload action handler that spends action economy then calls `AmmoSystem.reloadWeapon()`.
7. Make canonical attack context carry `attackMode`, `weaponMode`, `ammoCost`, `isAutofire`, `isBurstFire`, `isAreaAttack`, `isStun`.
8. Retire or quarantine `SWSERoll.rollAutofire()` until it can route through canonical attack/damage context.
9. Fix Burst Fire as a single-target option with no half damage on miss and no Evasion hook.
10. Add Lethal/Stun selector and preserve that context through damage.
