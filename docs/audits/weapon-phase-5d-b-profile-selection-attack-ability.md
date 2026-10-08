# Phase 5D-B — Canonical Attack Profile Selection + Attack-Ability Provenance

## 1-2. Baseline and branch
* Baseline: Phase 5D-A head `2c513c4` (PR #1006; CI "Rolling system validation" green, mergeable, no reviews/threads at start of 5D-B).
* Branch: `audit/weapon-phase-5d-b-profile-selection`, created from `2c513c4` (not from the stray `audit/weapon-phase-5d-a-runtime-consumption`).

## 3. Problem statement
5D-A made `computeFinalAttackComposition()` consume a selected canonical profile, but nothing in normal play could *select* one:
the roll dialog classified melee/ranged from the Item (`isMeleeWeapon(weapon)`), never sent `profileId/configurationId/modeId/payloadId`,
and `getWeaponAttackAbility()` treated the production-projected `system.attackAttribute` as player intent (thrown Electropole stayed STR).

## 4. Files inspected
`weapon-runtime-resolver.js`, `attack-consumer.js`, `profile-reconciliation.js`, `proficiency-resolver.js`, `scripts/combat/rolls/attacks.js`,
`scripts/combat/rolls/enhanced-rolls.js` (dialog → `rollAttack` option spread), `combat-roll-math.js`, `combat-stat-rules.js`,
`scripts/rolls/roll-config.js` (model, panel builders, `update()` preview, submit handler, `computeAttackSituationalContext`),
`item-defaults.js` (`normalizeWeaponForWrite`, `sanitizeItemSheetUpdate`), `weapon-config-dialog.js`, `tools/lib/canonical-weapons-projection.mjs`
(`fill('attackAttribute', …)`), the 5D-A tests, and the registry records of Amphistaff, Vibrobayonet, Shock Stick, Espo-500, Variable Blaster,
Electropole, Siang Lance, Massassi Lanvarok, Wrist Rocket Launcher, Targeting Blaster Rifle.
(The prompt's `scripts/combat/attacks.js`, `scripts/apps/roll-config.js` etc. live at `scripts/combat/rolls/attacks.js`, `scripts/rolls/roll-config.js`;
the dialog is HTML-string built inside `roll-config.js` — there is no separate attack-dialog `.hbs`.)

## 5. Runtime path before 5D-B
dialog (`buildRollConfigModel`: `melee/ranged` from Item) → preview `update()` (`attackType` from Item, no ids) → submit result (no ids) →
`rollAttack` (5D-A: resolves the *default* profile only) → `computeFinalAttackComposition`.
Registry census: 168 single-profile weapons; 35 multi-profile, 9 multi-configuration, 11 with modes, 2 with >1 payload (Wrist Rocket: 7).

## 6. Architecture chosen
No second authority. `attack-form-options.js#buildAttackForms()` derives the legal forms **from `WeaponRuntimeResolver`**: every candidate
(profile × configuration × mode) is verified by actually resolving it, so an illegal combination cannot be offered. The dialog renders a selector only when
there is a real decision; the chosen ids ride the existing option bag into the unchanged 5D-A path.

## 7. Canonical selector representation
A *form* = `{value, profileId, configurationId, modeId, branch, label}`; `value` is the canonical id tuple `profile|configuration|mode` (trailing empties trimmed),
labels are display only. Dimensions appear only when meaningful:
* configuration — more than one usable (`attackUsable !== false`) configuration. A profile pinned (`availableIn`) to configurations offers exactly those; a profile valid in all configurations multiplies by configuration only when no profile of the weapon is pinned (Shock Stick handheld/mounted-bayonet), so Amphistaff "Venom spit (any form)" is one form.
* mode — a mode that pins exactly one attack profile (Espo single-shot/autofire share a profile; Variable Blaster low/medium/high). Multi-profile modes (double-weapon full-round) are not single attacks → deferred.
* payload — separate selector only when more than one payload exists (Wrist Rocket, Concealed Dart Launcher, …); default = resolver default.
Single-form weapon ⇒ `attackForms.length === 1` ⇒ no panel, no control (verified for pistol and stun baton).

## 8. How ids are threaded
`readLiveAttackSelection(form, model)` is the one reader used by **both** the live preview (`update()`) and the submit handler:
selector value is looked up in the *offered* list (never parsed from text) → `attackFormSelection(form)` = `{profileId, configurationId?, modeId?}` + `payloadId`.
Preview passes it in `rollOptions` to `computeFinalAttackComposition`; submit puts the same keys on the dialog result, which `enhanced-rolls.js`
already spreads into `rollAttack` → `withCanonicalWeaponRuntime` (5D-A). The model's own base total/breakdown use the same selection.
The selected form's branch drives `model.melee/ranged`, the preview `attackType`, `rangeBand` (null for melee), `computeAttackSituationalContext(form, melee)`
and `rebuildAttackOptionsPanel`. For cross-branch weapons both branches' controls (Range Band, ranged/melee panels, defensive stance, cover) render in
`[data-rcd-branch]` wrappers; `syncAttackFormBranch` shows only the active branch and **disables** the hidden controls so they never submit.
Legacy weapons keep the Item classification and send no ids.

## 9. Attack-ability provenance
Structured, no string comparison against defaults, no pack/generator edits:
`flags.swse.attackAbilityOverride` (`attack-ability-override.js`) is written **only** by the player-edit paths — `sanitizeItemSheetUpdate` (item editor) and
`weapon-config-dialog._saveConfiguration` — and **only when the submitted value changes** the stored one (re-submitting the projected value is not an override).
For a canonical weapon with a selected profile `getWeaponAttackAbility(actor, weapon, context)` resolves:
1. valid `attackAbilityOverride` flag; 2. a stored `attackAttribute` outside the projection vocabulary (`con/int/wis/cha` — the projection and item-defaults only ever write `str/dex`, so these can only be player choices; keeps Noble Fencing Style `cha` setups working, and ownership alone still activates nothing); 3. the profile-branch default (ranged→DEX, melee→STR).

## 10. Legacy compatibility
Legacy/homebrew weapons (no canonical identity, or no runtime context): unchanged — any stored `attackAttribute` is explicit; the override flag is not read.
**Known, accepted limitation:** a canonical weapon whose owner *previously* hand-set `str`/`dex` (indistinguishable from the projection) now follows the profile default until
re-set through the item editor (which stamps the override). `cha/int/wis/con` choices are preserved. Reverting an override to "profile default" has no UI yet (deferred).
`weapon-data-resolver.js` sheet display still shows the stored value (display only).

## 11. Fail-closed behavior
Unknown profile/configuration/mode/payload and illegal combinations (e.g. Vibrobayonet `primary` + `detached`) → `WeaponRuntimeError`;
`computeFinalAttackComposition` → `ok:false, reason:'weapon-runtime-error'`; `rollAttack` returns before `collectAttackModifiers`,
`spendCoreAttackOptionCosts` and `AmmoSystem.spendForWorkflow` (test spies prove 0 calls). The dialog model captures an invalid caller preselection
(`attackFormError`, shown in the panel) instead of substituting another profile or throwing on open.

## 12. Representative weapons tested
Blaster Pistol / Stun Baton (single), Gungan Electropole & Siang Lance (cross-branch), Massassi Lanvarok (profile-specific proficiency), Amphistaff (8 forms),
Vibrobayonet (configuration-pinned profiles), Shock Stick (configuration dimension), Espo-500 / Variable Blaster (modes), Wrist Rocket (payloads), Bowcaster (exotic identity),
homebrew/legacy item, NPC flat-total item; plus an all-203 sweep (every weapon has ≥1 form; every offered form resolves).

## 13. DATA_DEFECT vs CONSUMER_DEFECT
No DATA_DEFECT found; no canonical data, registry or pack was edited. The projected `attackAttribute` is a CONSUMER_DEFECT (consumer treated projection as intent).

## 14. Validation
Focused `weapon-phase-5d-b-profile-selection.test.mjs` 14/14; 5D-A test 14/14; runtime resolver/proficiency/consumption-map tests; `weapon-runtime-builder-negative`
(consumer allow-list extended to `roll-config.js`, `combat-stat-rules.js`, `item-defaults.js`, `weapon-config-dialog.js`); registry builder `--check`; 5B and 5B-R `--check`;
`validate-partials`; `validate-data`; `system.json`; full rolling suite **325 passed / 0 failed** (324 after 5D-A + the new 5D-B test; 5 documented exclusions).
Runtime-only (not provable headless): the live DOM show/hide + disable of branch sections in the open dialog.

## 15. Intentionally deferred
Canonical damage migration; range migration (Range Band still uses the Item's range profile); ammo/resource authority; payload effects on damage; special weapon effects;
double-weapon/dual-wield full attack (multi-profile modes `double-weapon-full-round`, the profile-less `light-shock` mode); owned-state configuration *transitions* (swift-action cost of
switching Amphistaff form / mounting a bayonet — selecting a configuration in the dialog only resolves that attack form); Sith Lanvarok dual-wield; `weapons-engine.js` /
`multi-attack.js` / `dual-wield-combat-shape-resolver.js` / `damage-packet-rules.js` `system.proficient !== false` readers; UI to clear an ability override.

## 16. Recommended Phase 5D-C boundary
Damage profile consumption: route `rollDamage` through the same selected form (`resolveDamageProfile`, payload damage, damage mode), preserving existing damage composition authority
and stock-droid damage contract. Range/ammo (5D-D) and special effects / double weapons (5D-E) stay separate.
