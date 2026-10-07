# Phase 5A — Weapon Runtime Ingestion Map

**Status:** `WEAPON_PHASE_5A_RUNTIME_INGESTION_AUDIT_COMPLETE` · read-only audit · audited at the Phase 5A checkpoint branch head
**Companion artifacts:** `data/audits/weapon-phase-5a-runtime-consumer-matrix.json` (machine-readable evidence), `docs/audits/weapon-phase-5a-runtime-adapter-contract.md` (the adapter design).

**Governing decision.** The Phase 3B + Phase 4H weapon schema/authority is frozen. The SWSE runtime is adapted to consume it; the schema is never flattened, renamed or simplified to suit a legacy consumer. Phase 5A changed **no** canonical schema, semantic authority, identity, mechanic, production record or runtime file. Consumer deficiencies are recorded, not "fixed" by degrading the authority.

## 1. The live attack path (verified)

```
[click]  character-like-sheet.js  .attack-btn (3295) / [data-action=roll-attack] (4041) / roll-unarmed-attack (3252)
         / swse-v2-use-action -> _runCanonicalCombatAction (6826)      NPC: npc-actor-sheet.js:146  droid parts: droid-actor-sheet.js:272
   │
   ▼  actor-sheet-base.js:1993 _runCanonicalAttackWithPreroll  ->  roll-config.js showRollModifiersDialog (1504) / buildRollConfigModel (1042)
   │       (dialog: range band, normal|stun damage mode, autofire/burst options — NO attack-profile choice, no ion control)
   ▼  actor-sheet-base.js:2032 _runCanonicalAttack  (grapple confirm, action economy)
   ▼  enhanced-rolls.js:341 SWSERoll.rollAttack  (pre-roll hook, Force Point prompt; wrapped by attack-dialog-combat-corrections-hotfix.js:337)
   ▼  scripts/combat/rolls/attacks.js:298 rollAttack
         collect options -> spend action + ammo (325, AmmoSystem) -> computeFinalAttackComposition (65/345)
            -> attack-domain-router.js:44 -> combat-roll-math.js:381 resolveAttackBonus  (proficiency penalty at 441)
         1d20 + bonus (361) -> resolveTargetContext (367) -> critical threshold (371) -> resolveCriticalMultiplier (382)
         -> AttackOutcomeResolver.resolve (386) -> reaction context (245) -> chat card (carries the Roll Damage button)
```

Other **live** entries: Full Attack (`full-attack-executor.js`, `rollAttack` at 293, from `character-like-sheet.js:6908`); multiattack/attack-option rows (`combat-ui-behavior-hotfix.js:554/632` and `combat-feature-action-router.js:48` → `combat-feature-handlers.js`); vehicle Fire button (→ the same `rollAttack` through the domain router); callers inside grapple, Slammer, Force Throw and Unarmed Parry/Counterstrike.

**Dead / unreachable (no importer or caller):** `components/combat-action-bar.js` (and `SWSECombat.rollAttack/rollFullAttack`), `sheets/v2/character-sheet/combat-ui.js`, `ui/combat-panel-manager.js`, `combat/systems/vehicle/vehicle-weapons.js`, `CombatExecutor.executeAttack`/`CombatEngine.rollAttack`, `SWSERoll.rollAutofire/rollBulkAttack/rollFullAttack`, `attacks.js` `rollFullAttack`/`rollAttackAndDamageWithNarration`, `ui/inventory-handlers.js` + `weapon-config-dialog`, `engine/combat/range-engine.js`.
**Reachable but broken:** droid `[data-action=roll-weapon]` and hotbar item macros call `item.roll()` → `actor.useItem()`, a stub returning `null` (`swse-actor-base.js:482`); the Combat Action Browser calls `SWSECombat.runCombatAction`, which is not defined.

## 2. The live damage path (verified)

```
attack chat card  ->  swse-roll-engine.js:425 buildHoloRollData (Roll Damage button; carries workflow context, crit flag, multiplier,
                       area/burst/autofire/stun/ion flags, damageTypes, damageComponents; re-reads the ITEM by data-weapon-id)
   ▼  chat-interaction-bridge.js handleCombatDamageRollButton (184) / handleLegacyDamageRollButton (302)   [+ duplicate in runtime-bugfix-hotfixes.js:211]
   ▼  enhanced-rolls.js:1035 SWSERoll.rollDamage -> damage.js:46 rollDamage
         mergeCombatWorkflowContextIntoRollOptions (47)  -> resolveDamageComposition (103) -> buildDamageFormula (110) -> safeRoll (115) -> damage card
         (statblock NPCs with flags.swse.npc.useFlat roll the printed formula and skip composition/crit, 69-87)
   ▼  "Apply Damage" button: chat-interaction-bridge.js:343 handleApplyDamageButton — REBUILDS the packet from item id + roll total (not the original context)
         buildDamagePacket (damage-packet-builder.js:309) -> resolveDamageDisposition / resolveDamagePacketType / buildBaseDamagePacket
            -> enhanceWeaponDamagePacket (weapon-damage-packet-builder.js:411) -> applyTargetDamagePacketRules (damage-packet-rules.js:263: evasion, stun/ion eligibility)
         DamageSystem.applyPacketToActor -> actor.applyDamage -> ActorEngine.applyDamage (1360) -> DamageResolutionEngine.resolveDamage
            (bonus HP -> DamageMitigationManager: shield rating, immunity, DR, resistance, temp HP -> stun/ion hpDamageMultiplier -> ThresholdEngine -> condition track)
            -> ActorEngine.updateActor (hp, shields, conditionTrack, droidState)
```
Burst Fire is a combat option (`damageExtraWeaponDice: 2`); area/autofire halving and evasion live in the packet layer. `DamageTimingRiderAdapter` runs only inside `DamageEngine` (recurring damage), **not** in this live apply path.

## 3. Weapon fields read, by stage

| Stage | File:function | Weapon fields (precedence) | Heuristic? |
| --- | --- | --- | --- |
| Sheet gate | `character-like-sheet.js:4048` | `item.type ∈ {weapon,lightsaber}`, `system.damage|damageFormula|weapon.damage` (`lightsaber` is not an Item type in template.json) | — |
| Roll config | `roll-config.js` | branch (resolver), `autofire`, `properties[]` text, stun flags then name/category regex (426-437), `rangeProfile|ranges|weaponCategory|range`; attack type always from the Item (1059) | **yes** |
| Hotfix | `attack-dialog-combat-corrections-hotfix.js:51-70` | **writes** `system.meleeOrRanged/weaponRangeType/rangeType/range` in memory on every attack | **yes** |
| Branch | `weapon-branch-resolver.js:159-209` | `weaponCategory` literal → family fields (`proficiency|subcategory|category|weaponGroup|group`) → `meleeOrRanged|weaponRangeType|rangeType` → name/range regex (ranged regex tested first) → default melee | **yes** |
| Attack bonus | `combat-stat-rules.js:329`, `combat-roll-math.js:381` | `attackAttribute ?? combat.attack.ability` (else dex/str by branch), `attackBonus ?? combat.attack.bonus`, range band table, flat NPC/droid totals, attunement/upgrade modifiers | partial |
| Proficiency | `combat-roll-math.js:194-200` + 94-178 | `system.proficient` literal `false` only, then name/proficiency/group/category/subcategory/weaponType keys + text keys vs actor feats/species keys | **yes** |
| Critical | `attacks.js:371`, `combat-roll-math.js:839` | threshold `criticalThreatNaturalMin ?? 20` (**`system.critRange` ignored**); multiplier `criticalMultiplier|critMultiplier|combat.critical.multiplier…`; rule match on `system.proficiency` string equality | — |
| Ammo | `ammo-system.js:81-102` | `ammunition.type/current/max`, cost 1/5/10 by option/tag, branch for "ranged" | — |
| Damage dice | `combat-roll-math.js:972` | `flags.stockDamageFormula ?? String(system.damage ?? system.damageFormula ?? '1d6')` | — |
| Damage type | `damage-packet-builder.js:52`, `damage-type-rules.js` | `system.damageType ?? damage.type ?? damageTypes`, plus name/group/properties substring inference (`includes('ion')`…) | **yes** |
| Packet/area/lightsaber | `weapon-damage-packet-builder.js:124-182`, `combat-stat-rules.js:738` | name, weaponType, group, properties, traits, description, autofire, weaponProperties via regex | **yes** |
| DR bypass | `damage-reduction-resolver.js:48-70,252-256` | `bypassDR`, `isLightsaber`, free-text blob | **yes** |

Full per-hit evidence (966 pattern hits over 2,654 files, 44 curated heuristic sites, 25 entry points) is in the JSON matrix.

## 4. Legacy fields — authoritative today vs compatibility-only

*Actually read by live combat:* `weaponCategory` (branch), `damage`, `damageType`, `attackAttribute`, `attackBonus`, `ammunition.{type,current,max}`, `rangeProfile` (roll-config/editor), Title-Case `properties[]`, `proficient` (short circuit), `size` (light weapon), `twoHanded|wieldedTwoHanded`, `bypassDR`, `damageComponents`.
*Read only by display or dead paths / never effective:* `critRange` (live path), `meleeOrRanged` (schema-defaulted; reversed precedence at `combat-roll-math.js:231`), `ranges.*.attackMod`, `rangePenalty|currentRangePenalty` (no writers), the dialog's `grip/twoHanded` (`forceTwoHanded` is never read), `concealment` (hard-coded false), `system.autofire` (no pack record has it), `modes.*`/`flags.swse.stunMode|ionMode` (display only), `fireMode`, `system.ammo` (non-schema, orphan upgrade writes), house-rule range multipliers (`system.range` is a string).

## 5. Where names/text still decide what a weapon is

About 55 sites (`range-ammo-stun.json → heuristics`). Clusters: `multi-attack.js:59-89` (groups by name), `combat-roll-math.js:110-156` (proficiency keys), `items/weapon-ranges.js` (range brackets by name; a third bracket table), the Pistoleer/Riflemaster/sniper/sport-hunter patches, grapple term lists, `weapon-target-gate-classifiers.js` (feat/talent gating), `scoped-combat-feat-resolver.js:36-70` (Weapon Focus by fuzzy bidirectional substring), `engine/store/*`, the suggestion engines, the customization workbench, `roll-config.js` stun inference (60 shipped energy weapons infer stun; 18 are likely false positives), `damage-type-rules.js` (`key.includes('ion')`), reaction text checks, and `houserule-block-mechanic.js` (`range <= 5` as a string compare). `engine/store/compendium-schema.js:173` states the opposite policy ("never infer item properties from names").

## 6. Proficiency — current state

`actorIsProficientForAttack` (`combat-roll-math.js:194`) returns **true** unless `system.proficient === false`. `proficient` defaults `true` (`template.json:609`, `safe-item-factory.js:130`, `follower-creator.js:736`); the only code that can set it `false` (`weapon-config-dialog.js:171`) is unreachable. **Net effect: the −5 non-proficiency penalty (line 441) effectively never applies in normal play; Exotic and Advanced weapons attack penalty-free.** The fallback (candidate keys from name/proficiency/group/category/subcategory/type/weaponType + text keys vs actor `system.proficiencies.weapon`, `system.weaponProficiencies`, `_unlockGrants`, feat names) recognises Weapon Proficiency (simple/pistol/rifle/heavy/advanced melee/lightsaber) but **not Exotic Weapon Proficiency**. Exotic Weapon Proficiency is text-only in `feats.db`; the hook that would materialise exotic keys (`weapon-foundation-feat-normalization-hooks.js`) is imported by nothing; species Weapon Familiarity is text in `species.db` (a parser exists in `species-trait-engine.js:622-645` but is unimported); Spacehound is a hard-coded talent-name + vehicle regex bypass; Siang Lance Mastery is not implemented; the 4H `speciesOverrides/abilityOverrides` are read by no script. Other proficiency readers are item-flag only (`weapons-engine.js:43`, `multi-attack.js:547-600`, `dual-wield-combat-shape-resolver.js:125`, `damage-packet-rules.js:95`).

## 7. Attack profiles / modes — current state

The live runtime always asks **"what is this Item?"**, never **"which attack profile of this Item is being used?"**. Evidence: branch from the Item; `getAttackType` honours a roll-time `attackType` only if it contains "ranged"/"melee" (Force Throw's `thrown` is ignored) and ability/range/ammo/damage never read it; the dialog offers no profile choice; Roll Damage re-reads the Item by id and only workflow flags travel; Apply Damage rebuilds from item id + total. Double weapons roll the **same Item twice** ("Primary/Secondary End") via two name-list heuristics; bayonet, payload and prepared attacks have no concept; stun is a per-roll `damageMode`, ion has no control. Statblock variants are separate placeholder Items ("Amphistaff (Whip Form)", "Double Vibroblade (*)", "Bayonet").

**Probe weapons (canonical vs runtime):** Atlatl, Cesta, Amphistaff, Energy Lance, Vibrobayonet, Double Vibroblade, Zhaboka are **not in the weapon packs** (the 52 missing identities); Massassi/Sith Lanvarok, Siang Lance and Concealed Dart Launcher are single-branch single-proficiency ranged Exotic Items whose modes (disc/polearm, lance/bayonet, payloads) are unmodelled; Wrist Rocket Launcher is `heavy-weapons` in the pack while canonically Exotic. Frozen-schema facts: 31/203 identities have 2–4 profiles; 6 cross melee/ranged; 3 have profile-specific proficiency (Energy Lance, Siang Lance, Interchangeable Weapon System); for 7 identities the authored 4H modes outnumber the 3B `attackProfiles` (Atlatl/Cesta carry only a melee profile in 3B).

## 8. Required conclusions

1. **Live attack path:** §1.
2. **Live damage path:** §2.
3. **Fields per stage:** §3 and the JSON matrix.
4. **Authoritative vs compatibility-only legacy fields:** §4.
5. **Heuristics:** §5 (≈55 sites).
6. **Current proficiency determination:** §6 (literal `proficient === false` short circuit).
7. **Replacement:** a `ProficiencyResolver` evaluates, per attack profile, the native requirement (group or exact Exotic identity) and the frozen alternate routes (species, ability, profile-specific) against the actor's entitlements; `system.proficient` becomes at most a legacy/GM override.
8. **Multi-profile today:** not represented; placeholder Items, name lists, same Item rolled twice (§7).
9. **Making profile selection first-class:** a `profileId` in the roll context, chosen in roll-config, carried in `rollAttack` options and serialised into the Roll Damage and Apply Damage workflow context (Apply otherwise loses it).
10. **Ammo:** canonical resource profile is static; the owned item keeps `current` (keyed by resource profile id); costs come from resolved consumption + global Burst/Autofire rules (adapter contract §6).
11. **Combat SSOTs that stay unchanged:** `resolveAttackBonus`, `resolveDamageComposition`, `buildDamageFormula`, `resolveCriticalMultiplier`, `stepDamageDieFormula`, `AttackOutcomeResolver`, `attack-domain-router`, `damage.js` orchestration, damage packet/disposition/mitigation/threshold/`ActorEngine` chain, `AmmoSystem` write path, `FullAttackExecutor` state/card renderer.
12. **Modules that must consume the adapter:** branch resolver, range-profile resolver, roll-config, the proficiency candidate builder in `combat-roll-math`, the base-dice read (972), damage-type/component/packet builders, `AmmoSystem`, `CombatOptionResolver`, `WeaponsEngine`, multi-attack/dual-wield planners, grapple/reaction classifiers, item sheet, suggestion engines (classification in the JSON matrix).
13. **Retirable later:** `system.proficient` as truth, `meleeOrRanged/weaponRangeType/rangeType`, name/text classifiers for canonical weapons, `weapon-ranges.js`, the 1/5/10 ammo constants, the duplicate multiattack/double-weapon implementations and the dead entry points (§JSON `retirementCandidates`).
14. **Phase 5B first:** the canonical weapon registry loader + `WeaponRuntimeResolver` core with the legacy compatibility adapter and tests (contract §12).

## 9. Pre-existing defects observed (recorded, not fixed)

`rollAttack` ignores `system.critRange`; the −5 proficiency penalty is effectively unreachable and Exotic proficiency is unrecognised; droid `roll-weapon`/hotbar macros hit the `useItem` stub; the Combat Action Browser calls an undefined function; the attack-dialog hotfix mutates `weapon.system` at roll time; legacy autofire passes `isCrit` (damage reads `isCritical`); `String(system.damage)` yields `[object Object]` if damage ever becomes an object (three sites); `includes('ion')` false positives and un-normalised damage types vs exact stun/ion compares; ammo: orphan `system.ammo` writes, readers of non-existent `ammo.value`, case-sensitive and inverted autofire checks; house-rule range multipliers are inert; Inaccurate has no mechanical effect; Apply Damage forgets the attack profile.
