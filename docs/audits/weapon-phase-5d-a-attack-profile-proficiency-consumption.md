# Phase 5D-A — Attack Profile + Proficiency Consumption

Base: merged `main` = `e0717af` (Phase 5C closed; canonical production data **not** reopened).
Branch: `audit/weapon-phase-5d-a-runtime-consumption` (pushed from `claude/phase-5d-a-proficiency-5sift7`).

## Old consumer defects (all CONSUMER_DEFECT; no DATA_DEFECT found)

1. **Live proficiency was legacy.** `combat-roll-math.js#actorIsProficientForAttack` treated `weapon.system.proficient !== false`
   as proficient, so the SWSE −5 nonproficiency penalty silently disappeared for any ordinary weapon.
2. **Exact Exotic Weapon Proficiency identity was not consumed.** Phase 5C's `FeatChoiceDialog` stores
   `weaponIdentity` (registry `identityKey`) on the choice, but `extractActorEntitlements` only read `stored.weapon`
   (display name) and the feat title.
3. **Attack branch/ability came from the Item's broad classification**, so a cross-branch profile (Electropole thrown,
   Lanvarok disc, Siang Lance ranged/bayonet) used the wrong default ability and attack type.

## New runtime path

```
owned weapon Item
  -> canonical identity (flag stamp | compendium source id)            [canonical-identity.js]
  -> WeaponRuntimeResolver.resolveIdentity(profileId/configurationId/modeId/payloadId/damageMode)
  -> ResolvedWeapon -> selected ResolvedAttackProfile (branch authoritative)
  -> resolveProficiency()  (profile-specific; Implant/Spacehound as its integration inputs)
  -> existing computeFinalAttackComposition() -> existing resolveAttackBonus() -> roll
```

* `weapon-runtime/attack-consumer.js` (new, pure): `resolveAttackWeaponRuntime`, `resolveCanonicalAttackProficiency`,
  `summarizeAttackRuntime`. No second authority: it only wires the existing registry/resolver/proficiency resolver.
* `attacks.js#withCanonicalWeaponRuntime` resolves once; `computeFinalAttackComposition` (shared by the roll-config live
  preview and the real roll) and `rollAttack` both use it. `rollAttack` resolves **before**
  `spendCoreAttackOptionCosts` / `AmmoSystem.spendForWorkflow`, so a bad canonical identity/selection spends nothing.
* `resolveAttackBonus` resolves on demand when `context.weaponRuntime` is absent or was resolved for a different
  weapon/selection (direct callers: tooltips, vehicle gunner baseline). Arithmetic and modifier composition untouched;
  only the proficiency seam and the attack-type/ability inputs change. The result gains `weaponRuntime` diagnostics
  `{source, identityKey, profileId, branch, proficiency:{proficient, penalty, route, …}}`.
* `getWeaponAttackAbility(actor, weapon, context)`: a canonical profile's branch sets the **default** (ranged→DEX,
  melee→STR); explicit `system.attackAttribute` / `combat.attack.ability` still wins.
* `proficiency-resolver.js`: `extractActorEntitlements` now returns `exoticIdentities` (canonical `weaponIdentity`
  keys). The required exotic identity of a profile is `profile.delegatedFrom?.identityKey ?? resolved.identity.identityKey`
  (verified 1:1 against all 44 exotic profiles in the 203-weapon registry). A stored `weaponIdentity` is **never**
  converted back to a name; name matching remains only for actor data that lacks a canonical identity.
* Registry init: `init-hooks.js` ready hook calls the existing `loadWeaponAuthorityRegistry()`. The loader records a
  load failure; the consumer then **throws `registry-unavailable`** for any weapon carrying a canonical hint (flag stamp or
  compendium source id) instead of treating it as legacy. Items with no canonical hint remain legacy.

## Exact compatibility boundary

| Case | Behavior |
|---|---|
| Canonical weapon (resolvable) | profile branch + `resolveProficiency()`; `system.proficient` ignored |
| Canonical identity/profile/config/payload invalid | throws `WeaponRuntimeError` (`computeFinalAttackComposition` → `ok:false, reason:'weapon-runtime-error'`); never legacy |
| Legacy / homebrew (no canonical identity) | unchanged `actorIsProficientForAttack` path |
| Stock-droid / NPC flat-total weapon | proficiency not evaluated (published total already bakes it in); branch still resolved |
| Registry never loaded (headless harness) | legacy, except an explicit canonical stamp → `registry-unavailable` |

Note: a non-flat NPC owning a canonical weapon now receives the −5 when it lacks the proficiency (previously silently
proficient). This is the intended RAW behavior of the fix.

## Tests

`tests/weapon-phase-5d-a-attack-consumption.test.mjs` (14 checks, through the real `resolveAttackBonus` /
`computeFinalAttackComposition`): group proficient / −5 / `system.proficient` cannot erase −5; exact Exotic by
`weaponIdentity`, wrong identity, legacy-name fallback; Wookiee (Bowcaster, Ryyk Blade), Gungan (Atlatl, Electropole),
Kissai/Massassi Lanvarok; Lanvarok melee vs disc; Electropole + Siang Lance cross-branch ability/attack type; legacy
unchanged; canonical bad identity/profile fail closed; registry load failure; NPC flat; Spacehound/Implant inputs; pre-resolved
runtime parity; ordering (resolution precedes costs).

Final counts: focused 5D-A test 14/14; full rolling suite **324 passed / 0 failed** (323 baseline + the new test; 5 documented exclusions). Also green: weapon-runtime registry/resolver/proficiency/consumption-map tests, `build-weapon-runtime-registry --check`, 5B/5B-R `--check`, `validate-partials`, `validate-data`, `system.json`. `weapon-runtime-builder-negative` guard updated from "nothing imports the runtime" to an explicit allow-list of the three 5D-A consumers.

## Deferred (5D-B+)

* Player-facing multi-profile selector (5D-B). Callers can already pass `profileId`/`configurationId`/`modeId`/`payloadId`.
* **Attack-ability limitation:** production items carry a projected `system.attackAttribute` (branch default of the
  *item*), which counts as "explicit". A thrown Electropole on a production item therefore still defaults to STR until
  5D-B distinguishes a player-set attribute from the projected default. Items with no `attackAttribute` get the
  profile default.
* Other `system.proficient !== false` readers: `weapons-engine.js#isProficientForAttack` (tooltip row),
  `multi-attack.js`, `dual-wield-combat-shape-resolver.js`, `damage-packet-rules.js` — not part of the attack roll
  total; migrate with their owning phases.
* Damage, ammo authority, range migration, special weapon effects, double weapons, `unresolvedModes` selectors.
