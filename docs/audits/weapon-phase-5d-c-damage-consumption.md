# Phase 5D-C — Canonical Weapon Damage Consumption

## 1-3. Baseline, branch, PR stack
* Baseline: Phase 5D-B head `6d2727b7f` (PR #1007), itself stacked on Phase 5D-A `2c513c4` (PR #1006).
* Close-out at start: #1006 and #1007 both open/draft/mergeable, CI "Rolling system validation" green on both heads, no reviews or review threads. Neither has merged,
  so nothing needed retargeting; 5D-C is stacked on the 5D-B branch.
* Branch: `audit/weapon-phase-5d-c-damage-consumption` (from `6d2727b7f`, not from the stray `audit/weapon-phase-5d-a-runtime-consumption`).

## 4. Files inspected
`weapon-runtime-resolver.js`, `damage-profile-resolver.js`, `attack-consumer.js`, `resource-resolver.js`, `scripts/combat/rolls/damage.js` (live `rollDamage`),
`scripts/combat/rolls/attacks.js` (`rollAttack`, thin `rollDamage` delegate, `rollAttackAndDamageWithNarration`), `scripts/combat/rolls/enhanced-rolls.js` (`SWSERoll.rollDamage`, `rollAutofire`),
`combat-roll-math.js` (`resolveDamageBonus`, `resolveDamageComposition`, `buildDamageFormula`, `resolveCriticalMultiplier`, stock-droid damage contract),
`combat-stat-rules.js` (`getDamageAbilityContribution`), `damage-packet-rules.js`, `damage-packet-builder.js`/`damage-type-rules.js` (type precedence),
`combat-context-serializer.js` (workflow transport), `chat-interaction-bridge.js` (Damage button handlers), the 5D-A/5D-B tests, and registry records of Electropole, Siang Lance,
Massassi Lanvarok, Amphistaff, Vibrobayonet, Variable/Heavy Variable Blaster, Espo-500, Wrist Rocket Launcher, Blaster Pistol, Stun Baton, Darter, Grenade/Micro-Grenade launchers.
(Paths in the brief like `scripts/combat/attacks.js` live at `scripts/combat/rolls/…`.)

## 5. Pre-5D-C damage flow
Attack card (`rollAttack`) → `damageWorkflowContext` (JSON, URL-encoded into the chat Damage button `data-workflow-context`) → button handler → `SWSERoll.rollDamage` → `damage.js#rollDamage`
→ `resolveDamageComposition` whose base dice were **`weapon.system.damage` (Item-level projection)**. The selected 5D-B attack form was never recorded in that context, so the damage always used
the Item projection (one value for every profile/mode/payload) — an Electropole thrown, a Variable-Blaster "high" mode and a Wrist-Rocket payload all rolled the same dice.

## 6. Canonical damage-consumer architecture
`attack-consumer.js#resolveCanonicalDamage(weapon, context)` (extends the 5D-A bridge; no new subsystem):
carried/explicit form ids → `resolveAttackWeaponRuntime` (same resolver, same fail-closed rules) → existing `resolveDamageProfile` (5B damage facet) → a small result:
`{status, base, damageTypes, selectedDamageType, damageMode, payloadId, selection, deferred}`. It performs **no arithmetic**. `resolveDamageComposition` takes `base` from it;
every other term (die steps, extra dice, ability, ½ level, enhancement, typed stacking, option contributions, critical) is the unchanged certified code. Precedence for base dice:
stock-statblock published formula (flat contract) > canonical selected-form damage > legacy Item damage.

## 7. How the selected attack form survives until damage
`rollAttack` writes `weaponForm = {identityKey, profileId, configurationId?, modeId?, payloadId?, damageMode?}` (plain ids; the *resolved* selection, so defaults are pinned) into the
workflow context (`weaponFormRecord`). `combat-context-serializer.js` round-trips it (`summarizeWeaponForm`, and `mergeCombatWorkflowContextIntoRollOptions` restores it), so it
survives chat-flag/`data-workflow-context` URL-encoded JSON. At the Damage click `resolveCanonicalDamage` rebuilds the **same** form. Explicit caller ids override the carried form (a fresh dialog
choice wins); the carried `identityKey` must equal the weapon's current identity or damage is refused (`weapon-form-identity-mismatch`). Tested with a real `rollAttack` → captured card →
encode/decode → real `rollDamage`.
Not carried (by design, documented): a sheet-initiated Damage button with no attack workflow context has no attack to correspond to and uses the weapon's canonical default form.

## 8-12. Profile / configuration / mode / payload / damage mode
* Profile, configuration, mode: damage comes from the resolver-selected profile's `damage` (e.g. Lanvarok melee 1d8 slashing vs disc 3d4 bludgeoning; Vibrobayonet mounted 2d6 vs detached 2d4; Variable Blaster low/medium/high 3d4/3d6/3d8). Illegal combinations throw.
* Payload: `varies-by-payload` forms take the selected payload's damage (Wrist Rocket antipersonnel 3d8, antivehicle 3d10, hollow-tip-empty 2d6, ion-blast 3d6). Exactly one payload ⇒ auto-selected; several and none chosen ⇒ `payload-required` (never the Item default); unknown ⇒ `unknown-payload-id`.
  Payloads whose structured damage is `none` (flash, stun-gas) or `special` (nerve toxin) are **not turned into dice**; their effect data (`specialEffects`) is preserved for the effect phase and the Damage roll is refused with a notice.
* Damage mode: `normal`/`stun`; the canonical stun definition is used (pistol stun 2d6); a form without stun capability refuses stun. The same check runs at **attack** time (`assertDamageSelectionResolvable`, before any cost).
  No new UI: 5D-B's existing damage-mode select is sufficient; Item-level and canonical stun capability agree for projected items, and a mismatch is refused rather than guessed.

## 13. Damage ability rule
The canonical data carries no damage-ability field (searched the registry), and attack ability ≠ damage ability, so `getDamageAbilityContribution` is **unchanged** (Item-level: explicit `none`/`str`/`dex` fields, ranged ⇒ 0 unless thrown-melee, melee ⇒ STR, two-handed ×1.5).
For canonical weapons it already gives the right result for the common cases (pistol 0, baton STR, Electropole thrown STR). Known edge: Siang Lance bayonet (melee profile on a ranged Item) — its damage is host-inherited (deferred, below), so this is handled with it in 5D-E.

## 14. Damage type rule
Structured canonical types are used (never description text): `damageType` = selected type (single) or first of an AND set; `damageTypes` = the full list (e.g. Electropole bludgeoning+energy); an OR set with no selection (Vibrobayonet detached slashing/piercing) leaves the existing Item-level type, since no selector exists.
An explicit caller-supplied type still wins. Downstream packet code is unchanged (`options.damageType` already outranks `weapon.system.damageType`).

## 15. Critical integration
No second critical formula. `buildDamageFormula` multiplies the *canonical base* with the existing `resolveCriticalMultiplier` (tests: Lanvarok melee crit = `(1d8 + …) * mult`; Wrist Rocket antivehicle crit `(3d10 …) * mult`; same shape as a legacy item). `damageMultiplier` (×2 on Light Concussion Missile / Proton Torpedo single-target profile and one payload) is **recorded in `deferred.damageMultiplier`, not applied** (vehicle-scale semantics belong to the range/ammo/special phases). Critical multiplier and critical bonus rules still read the Item-level `proficiency`/`criticalMultiplier` (unchanged).

## 16. Attack-option / modifier integration
Untouched: option damage contributions, typed stacking, effect intents, scoped feats, rage, Rapid Alchemy all flow through `resolveDamageBonus`/`resolveDamageComposition` exactly as before (tests assert bonus objects identical to a legacy item).

## 17. Stock droid / NPC flat
NPC statblock flat damage (`flags.swse.npc.flatDamageFormula`) short-circuits before canonical resolution (unchanged; tested). Stock-droid published formula keeps precedence over the canonical base.

## 18. Legacy compatibility
No canonical identity ⇒ `{source:'legacy'}` ⇒ existing Item-level path, with no registry requirement (tested with the registry unloaded). A canonical-hinted weapon with the registry unloaded refuses (5D-A rule).
Item-level `damage` remains the compatibility base only for the classes below.

## 19. Fail-closed
Unknown identity, unknown/illegal profile/configuration/mode/payload, unsupported damage mode, identity mismatch with the carried form, carried form on a now-legacy weapon: `rollDamage` notifies, rolls nothing, returns `null`.
`resolveDamageComposition` (used by other callers) throws instead of defaulting. Forms with no ordinary damage (`no-damage`, `special`) are refused, not invented.

Damage-status census over every form the 5D-B dialog offers (203 weapons): ordinary 226, no-damage 21 (Amphistaff Pin/Trip/Venom Spit, Ascension utility profiles, flash/gas payloads …), deferred 9, special 1, payload-required 1 (a multi-payload form without its payload; the dialog always submits one).
**Deferred (compatibility base = Item-level projection, with canonical types/mode still applied):** `inherited` (Siang Lance bayonet, Stunning Gauntlet — host weapon), `ammunition` (Grenade Launcher), `modifier` (gloves/knuckles — unarmed bonus), `varies-by-payload` text formulas (Micro-Grenade Launcher "selected grenade damage − 2 dice").

## 20. Representative weapons tested
Blaster Pistol, Stun Baton (ordinary ranged/melee); Electropole (cross-branch, AND damage types, thrown STR rule); Massassi Lanvarok (profile-specific); Amphistaff (forms, no-damage forms); Vibrobayonet (configuration);
Variable Blaster + Espo-500 (modes); Wrist Rocket (payloads incl. no-damage/special); Siang Lance (inherited deferral); Darter (fixed); homebrew legacy weapon; NPC flat weapon. Every canonical item in the test carries a deliberately wrong Item projection (`9d9`, `sonic`).

## 21. DATA_DEFECT / CONSUMER_DEFECT
No DATA_DEFECT; no canonical data, registry or pack edited. CONSUMER_DEFECT fixed: the damage consumer read Item-level projection and dropped the selected form.
Observations (not defects): Wrist Rocket default 5D-B payload = first payload (antipersonnel) since no payload is flagged `default`.

## 22. Automated validation
New `weapon-phase-5d-c-damage-consumption.test.mjs` 10 checks (covers the 25 required scenarios, see test file). Re-run: 5D-A, 5D-B, runtime registry/resolver/proficiency/consumption-map, `weapon-runtime-builder-negative`
(allow-list + `damage.js`), attack/damage/attack-option composition suites, registry builder `--check`, 5B/5B-R `--check`, `validate-partials`, `validate-data`, `system.json`, full rolling suite — full rolling suite **326 passed / 0 failed** (325 after 5D-B + the new 5D-C test; 5 documented exclusions); 5D-A 14/14, 5D-B 14/14, 5D-C 10/10; all `--check`s, validate-partials, validate-data, system.json pass.

## 23. Foundry manual smoke-test checklist — **NOT RUN** (headless session; do not treat as passed)
1. Open a single-profile weapon (e.g. Blaster Pistol) attack: no "Attack Form" selector.
2. Open a multi-profile weapon (Gungan Electropole): selector shows Melee/Thrown.
3. Switch to Thrown: preview branch/range band/ability change; roll.
4. Click Damage on the card: formula is the Electropole 2d8 (+ STR), damage types bludgeoning+energy — not the Item's stored dice.
5. Massassi Lanvarok: attack with Melee, click Damage ⇒ 1d8; repeat with Disc ⇒ 3d4.
6. Variable Blaster: attack in High mode ⇒ Damage 3d8.
7. Wrist Rocket: pick Antivehicle ⇒ 3d10; pick Flash or Nerve Toxin ⇒ Damage refused with a notice (no dice).
8. Stun setting on a pistol ⇒ 2d6; stun on a weapon without stun ⇒ attack refused before any ammo is spent.
9. Edit the weapon's stamped form id in a card's flags (or delete the weapon's canonical stamp) and click Damage ⇒ refused, no fallback to the default form.
10. Homebrew weapon: normal attack + damage unchanged.

## 24. Intentionally deferred
Range authority, ammo/resource authority and reload; payload/effect application (nerve toxin, gas, ion/flash effects) and `damageMultiplier`; profile-owned extra damage components (e.g. Neuronic Whip slashing rider) and `conditionalModifiers`/`criticalEffects`;
inherited/host-weapon, ammunition-dependent and unarmed-modifier damage; `rollAutofire` (own attack/damage subsystem — still uses the default form); `rollAttackAndDamageWithNarration` (dormant, resolves from its options);
sheet-initiated damage with no attack context; `damage-packet-rules.js`/`weapons-engine.js`/`multi-attack.js`/`dual-wield-combat-shape-resolver.js` `system.proficient !== false` readers (investigated: unrelated to damage totals — packet-eligibility/tooltip/dual-wield flags — left alone);
OR-damage-type selector; ability-override clearing UI.

## 25. Recommended Phase 5D-D scope
Range + ammunition/resource consumption on the same selected form: canonical range bands/penalties for the selected profile (`resolveRange`), `resourceConsumption` (shots per attack, autofire/burst units, stun units) through `AmmoSystem` with the existing rollback, and the ammunition-dependent damage class deferred here.
Keep payload effects/double weapons/dual-wield for 5D-E.
