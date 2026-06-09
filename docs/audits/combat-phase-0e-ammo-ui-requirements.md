# Combat Phase 0E — Ammo and Weapon Mode UI Requirements

Scope: audit/documentation only.

## Shared UI principle

Ammo UI should be a shared component/view-model used by Combat, Gear, and the attack context dialog. It should not be hand-built separately in each surface.

## Global visibility rule

If `trackBlasterCharges` is false:

- hide ammo counters
- hide shot pills
- hide Reload buttons
- do not grey out attacks for ammo
- do not decrement ammo
- do not show `not enough shots` warnings

If `trackBlasterCharges` is true:

- show ammo state for ammo-tracked weapons
- show Reload when current ammo is below max
- gate attack options that require more shots than remain
- decrement ammo after successful action commitment

## Combat tab weapon card

For a ranged ammo-tracked weapon when ammo counting is enabled, show:

```text
Weapon Name
Attack / Damage / Range
Shots: [pill display] 18 / 30
[Reload] if 18 < 30
[Roll Attack]
```

Autofire/Burst Fire indicators should be reflected either on the card or in the attack dialog.

## Gear tab weapon row/card

When ammo tracking is enabled and the item has ammo:

```text
Blaster Rifle       18 / 30 shots     [Reload]
```

The row/card should not show raw ammo when ammo tracking is disabled.

## Attack context dialog

The attack dialog should show:

```text
Shots: 18 / 30  [Reload]
Mode: [Lethal] [Stun]
Options:
  [ ] Autofire    costs 10 shots
  [ ] Burst Fire  costs 5 shots
```

Option gating:

- normal attack disabled/warned at fewer than 1 shot
- Burst Fire disabled at fewer than 5 shots
- Autofire disabled at fewer than 10 shots

Disabled message:

```text
Not enough shots remaining. Reload required.
```

## Shot pill style

Shot pills should use the weapon's selected blaster bolt color from the existing visual profile resolver.

Preferred source order:

1. `WeaponVisualProfileResolver.getVisualProfile(item).primary.colorHex`
2. `WeaponVisualProfileResolver.getBoltColor(item)` + bolt color map
3. neutral fallback

Do not create a second blaster color authority.

## Reload behavior

Reload should eventually:

- spend the proper action economy
- call `AmmoSystem.reloadWeapon()`
- post or display the reload result
- optionally consume spare ammo/power packs if a later inventory source authority exists

Until spare-cell tracking is canonical, reload source should be GM/player managed.

## Stun mode

Stun selector is not ammo UI and should remain visible even when ammo tracking is disabled.

Show Lethal/Stun if:

- weapon has a stun setting, or
- weapon is stun-only, or
- item metadata says it can switch lethal/stun

Do not show Stun for weapons that do not support it.

Switching Lethal/Stun should be treated as Switch Weapon Mode and consume the correct action economy in a future runtime patch.
