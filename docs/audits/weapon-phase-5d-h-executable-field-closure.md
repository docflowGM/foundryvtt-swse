# Phase 5D-H — Executable field closure census + bounded corrections

Branch `audit/weapon-phase-5d-h-executable-field-closure`, cut from merged `main`. One draft PR against `main`. Phase 5D weapon runtime certification is **not** complete; 5D-H is the authoritative residual map, 5D-I consumes it.

The deterministic evidence is `data/audits/weapon-phase-5d-h-closure-census.json` (tool: `tools/census-weapon-executable-field-closure.mjs`, ledgers: `tools/lib/weapon-phase-5d-h-ledgers.mjs`; `--check` mode, covered by the focused test). It is derived audit evidence, not a gameplay authority.

## 1. Baselines
- Merged 5D-G baseline: `acaa17ea5e90c4719e52a92225202ce4b482ae3b` (merge of #1012; PR head `a020d46d7`). Suite on merged main: 332 passed / 0 failed / 5 excluded.
- Final 5D-H suite: see §20.

## 2. Area geometry source amendments (DATA_DEFECT, controlled amendment path)
`tools/lib/canonical-weapons-amendments.mjs` → `build-canonical-weapons` → registry → production. Each entry asserts its pre-condition, is logged in `data/canonical/weapons.json#postCertificationAmendments` with field/from/to/source/page/evidence.

| Identity | Result | Source |
|---|---|---|
| Frag Grenade | 2-square burst, miss = half | Core Rulebook p.128 |
| Ion Grenade | 2-square burst, miss = target-dependent (droids/cyborgs half, plain creatures none) | Core p.128 |
| Stun Grenade | 2-square burst, miss = half | Core p.128 |
| Thermal Detonator | 4-square burst, miss = half | Core p.129 |
| Flamethrower | cone 6 long / 6 wide at terminus, miss = half (general Area Attacks rule, Core p.155) | Core p.127, p.155 |
| Blaster Cannon | primary target + adjacent (same encoding as the certified Heavy Blaster Cannon) | Core p.125 |

Also `5D-H-grenade-family` (DATA_COMPLETENESS): `weapon-family:grenade` added to the 12 grenade-table identities (Angled Throw, Forceful Blast, Higher Yield, Mighty Throw, Flash and Clear and Artillery Shot scope themselves to Grenades; the certified selectors had `families: []`, so only the display name could recognise one).

## 3. Source-silent geometry (never invented)
Adhesive Grenade (KOTOR p.67-68), CryoBan Grenade (p.68-69), Remote Grenade (p.180): the published text gives no radius or shape. State `SOURCE_SILENT` (3 forms).

## 4. Fire-mode-derived geometry
Repeating Blaster Carbine: autofire-only; its area is the generic autofire 2x2 area, not intrinsic geometry. State `FIRE_MODE_DERIVED` (1 form); canonical data untouched. `MISSING_CANONICAL_DATA` = 0.

## 5. Prepared attack (Bryar pistol / rifle)
Optional, player-chosen. `FireStateStore.primePreparedAttack` pays the structured `activationAction` (swift) through the action economy, records `primed` on the owned item (needs the combat clock). It matures at the start of the wielder's next turn (a later round of the same combat). Attacking earlier is an ordinary attack and loses the priming. A matured priming makes the next attack carry a weapon-granted option (+1 weapon die, 5 shots); the choice persists in the workflow context (`attack.selectedOptions.preparedAttack`) so damage sees it. It cannot combine with an ability that expends more than one shot and cannot be asserted without a matured priming. Previews never mutate; every refusal happens before any spend; an ordinary Bryar shot writes no state.

## 6. Brace
Structured `firingConstraints.braceRule` + autofire-only form: `shape.brace`. Bracing an autofire-only form costs two swift actions paid before the roll (-2 instead of -5); a form whose braceRule demands `extended` stock (Subrepeating Blaster) cannot be braced unless owned state `stock` is `extended` (`FireStateStore.setStockState`; unknown counts as not extended). Forms that are not autofire-only keep the free `braced` flag. No weapon-name check; no second Brace system.

## 7. Weapon↔ability relation census (22 distinct families, 65 instances)
Classified in `ability-relations.js#RELATION_POLICY`; the census fails on any unclassified relation.
- Consumed: PROHIBITED (ability identity), EXTRA_ATTACK_PENALTY, REMOVE_RAPID_STRIKE_ATTACK_PENALTY, TRIGGERS_SWIFT_RESET_BEFORE_NEXT_SHOT, CANNOT_NEGATE_ATTACK (Deflect), UNLOCKS_DOUBLE_WEAPON_MODE (Long Haft Strike; the conditional `doubleWeapon` quality is now evaluated through the condition policy against the wielder's ability identities), TREAT_AS_LIGHT_WEAPON_FOR_THIS_FEAT (descriptor token), and the SELECTOR mirrors EXPLICIT_WEAPON_BENEFIT / COMPATIBILITY / OPTION / FAMILY_MATCH, SUPPORTED, NAMED_DISCBLADE_DAMAGE_SYNERGY, NAMED_FIRA_ATTACK_BONUS_SYNERGY.
- **EXPLICIT_* relations never widen a rule.** They are certified mirrors of the ability's own scope, validated by the census (`relationConsistency`): 23 consistent, 2 named inconsistent (Lightsaber Pike ← Long Haft Strike: the ability's text scope cannot name the chassis, the unlock is consumed through the condition policy; Sporting Blaster Pistol ← Sport Hunter: its reroll-1s rule has no encoded rule, see §10).

## 8. Deferred relation families (7, all named)
| Relation | Instances | Why 5D-H does not own it | Future owner |
|---|---|---|---|
| POSITIVE_WEAPON_MODIFIER | 3 | value lives in `operation.*` Block/Deflect keys; the consumer is the Block/Deflect Use the Force roll, which does not read the wielded weapon | 5D-I reaction/defense workflow |
| NEGATIVE_WEAPON_MODIFIER | 3 | same | 5D-I reaction/defense workflow |
| PROFICIENT_WIELDER_MAY_USE_AS_THOUGH_POSSESSING_FEAT_IN_WHIP_FORM | 2 | Amphistaff Pin/Trip substitution belongs to the grapple subsystem | 5D-I grapple / Pin / Trip |
| FULL_ROUND_THREE_TARGET_AREA_ATTACK_WITH_DISCBLADE | 1 | talent-granted attack mode; relation id encodes the effect; talent has no canonical id | talent corpus + 5D-I |
| TREAT_DISCBLADE_AS_PISTOL_FOR_RANGE_ONLY | 1 | ability-conditional range family; no structured grant; talent has no canonical id (the range consumer `treatedAs` exists) | talent corpus + 5D-I |
| USE_THE_FORCE_DC_15_AFTER_RANGED_ATTACK_TO_RETURN_DISCBLADE_AS_FREE_ACTION | 1 | recall action after a thrown attack; relation id encodes DC/action | talent corpus + 5D-I |
| TREAT_AS_RIFLE_INSTEAD_OF_EXOTIC_AND_GAIN_PLUS_1_ATTACK | 1 | proficiency re-route is consumed via abilityOverrides; the +1 attack grant has no structured parameter | talent corpus + 5D-I |

Six shipped talents lack a stable id (Discblade Arc, Distant Discblade Throw, Recall Discblade, Weapon Specialization (discblade), Greater Weapon Focus (Fira), Siang Lance Mastery): `DATA_COMPLETENESS` in the talent pack generator. They remain matched by the legacy name fallback, which is why they are listed as legacy-only sites, not canonical ones.

## 9. Riflemaster correction (DATA_DEFECT, source-confirmed: Galaxy at War p.25)
Heavy Blaster Rifle dice go **d10 → d12** (a die-size replacement), not +1 die. The canonical rule carried the nonexistent type `WEAPON_DAMAGE_DIE_STEP`, which the consumer executes as *extra weapon dice*. Corrected in the SSOT (`data/canonical/feats.json` production capture) to `WEAPON_DAMAGE_DIE_SIZE_STEP` (value 1) and regenerated (`build-feat-production`). 3d10 → 3d12; no extra die. Only the Heavy Blaster Rifle receives it (the Blaster Carbine / Blaster Rifle / Light Repeating Blaster declare other Riflemaster benefits).

## 10. Sport Hunter, branch by branch
- Slugthrower Rifle: d8 → d12 (two steps) — rule type corrected to `WEAPON_DAMAGE_DIE_SIZE_STEP`, value 2.
- Slugthrower Pistol: **+1 weapon die at point-blank only** — existing `ATTACK_OPTION` (`damageExtraWeaponDice: 1`, `requiresRangeBand: point-blank`), deliberately untouched; verified not applied outside point-blank and never die-size scaling.
- Sporting Blaster Rifle: +1 attack when aiming — existing `ATTACK_OPTION`, untouched, verified.
- Sporting Blaster Pistol: reroll damage die results of 1 — **not encoded and not implemented** (residual damage-reroll mechanic, 5D-I). Verified nothing is invented for it.
Disabler (Ion Pistol d6 → d8) had the same mis-typed rule and was corrected the same way; Primitive Warrior and Bugbite really are "+1 die" and keep `WEAPON_DAMAGE_DIE_STEP`. The legacy name-keyed `riflemaster-normalization-hooks` (creation-time rule rewrite) is a no-op now that a valid rule type is present; retiring it is cleanup, listed in §23.

## 11. Ammo cost (CONSUMER_DEFECT)
`AmmoSystem.resolveAmmoCost` took the first non-nullish cost in a `??` chain; a serialized workflow context carries `ammoCost: 0` ("unspecified"), which masked a selected option's `ammunitionCost` (the primed Bryar shot's 5 shots exposed it). Now the first POSITIVE declaration wins. Regression: selected option cost > 0 with workflow default 0 → selected cost; explicit cost keeps priority; legitimate zero-cost attacks stay zero.

## 12. Other corrections directly exposed
- Proficiency entitlements (`proficiency-resolver.js`): canonical feat identity (`weapon-proficiency`, `exotic-weapon-proficiency`) + the stored structured choice decide; the title is parsed only for an ability with no canonical identity. Renamed titles still grant; a title cannot impersonate a different canonical feat.
- Canonical weapon kind/attack type/damage types/stun capability/vehicle-ness/area-ness/light status now come from the selected form's structured descriptor instead of Item text or the name (`weapon-descriptor.js`; classifiers, `combat-stat-rules`, `damage-type-rules`, `roll-config` stun setting, dual-wield light status). Exact-identity scopes ("Blaster Pistol") no longer substring-match every pistol containing those words.
- `hasFeat` conditions join on ability identity; `wielder-has-Long-Haft-Form` was unsatisfiable (no such ability) and now points at Long Haft Strike. Condition context now carries the wielder's ability identities (it carried none).
- Multi-attack (Double/Triple Attack, Multiattack Proficiency) and Dual Weapon Mastery identify the ability by canonical identity first.

## 13. Canonical heuristic census (`CANONICAL_NAME_TEXT_HEURISTIC_USAGE` = 0)
171 scanned name/text sites across the canonical weapon combat modules (weapon-runtime + every approved runtime consumer): DISPLAY 85, LEGACY_GATED 58, IDENTITY_FALLBACK 14, NON_COMBAT_DOMAIN 5, PROJECTION 4, TARGET_SIDE 3, WEAPON_DEFINITION 2, **CANONICAL_RESIDUAL 0**. Every site is classified by rule; an unclassified site fails the census. The scan is pattern-based (`.name`, `weaponText(`, `.description`, `system.proficient`, category fields, `textMatchesAny`); it proves the classified sites, not that no other idiom exists.

## 14. Legacy-only heuristic sites
`LEGACY_ONLY_NAME_TEXT_HEURISTIC_USAGE` = 72 (LEGACY_GATED 58 + IDENTITY_FALLBACK 14): reachable only for weapons/abilities without a canonical identity.

## 15. Legacy text-rule manifest
44 records (feat/talent rule × scope field): **A 38** (canonical identity + structured descriptor), **B 3** (DATA_COMPLETENESS: Greater Weapon Focus (Fira) and Weapon Specialization (Lightsabers) have no ability identity; Knife Trick's "concealed weapon" scope has no structured concealability selector), **C 3** (Tool Frenzy, Heavy Hitter, Make Do: non-weapon / vehicle / improvised domains), **D 0**. Each row lists the canonical weapons matched before and after (lost/gained) — e.g. Weapon Finesse/Flurry/Improved Rapid Strike now cover light melee weapons structurally (RAW); Pistoleer/Sport Hunter scopes narrow to the exact weapon the feat names.

## 16. Execution field families
87 certified field families; **57 execution families: 33 fully consumed, 14 partial, 10 without consumer.** Without consumer: `3b.defensive`, `3b.durability`, `3b.profile.wielding`, `3b.wielding`, `3b.qualityParameters`, `4h.auth.ruleSelectors.riders`, operation families crew-and-emplacement, proficiency-routes (echoes of already-consumed overrides), reach-and-threat, utility-and-movement. Each has a reason and owner in the census.

## 17. Operation families vs raw keys (kept distinct)
- Unique operation topic families: **17**; with unconsumed executable keys: **15**.
- Unique operation keys without consumer: **196**.
- Raw (identity, key) occurrences without consumer: **256**.
Auto-detected consumers (key appears in executable runtime code), 33 keys certified as duplicates of a structured, consumed field (probe-verified against the carrier) and store/display keys are excluded. Each unique family carries owner, reason, recommended phase, representative identities and occurrence count in the census. No key was implemented to shrink a counter.

## 18. Form-level mechanics and conditions
5D-E census: 42 form mechanics classified DEFER (grab-grapple 12, payload-effect 8, defensive-interaction 5, prepared-attack 4 [the census predates the optional Bryar consumer], special-action 4, status-condition 4, persistent-effect 2, return-recovery 2, activation-effect 1). Conditions: AUTO 99, PROMPT 11, deferred 0, unclassified 0, **policy-unsupported 0**.

## 19. DATA_DEFECT / CONSUMER_DEFECT / DATA_COMPLETENESS
- DATA_DEFECT: six area geometries (§2); Riflemaster, Sport Hunter rifle, Disabler rule types (§9-10).
- DATA_COMPLETENESS: grenade family (§2); six talents without stable ids; Knife Trick concealability selector; Sport Hunter Sporting Blaster Pistol reroll rule; Lightsaber Pike ← Long Haft Strike text scope.
- CONSUMER_DEFECT: `resolveAmmoCost` (§11); unsatisfiable `wielder-has-Long-Haft-Form`; empty condition ability context; name-derived weapon kind/branch/damage types/stun for canonical weapons (§12); proficiency entitlements read titles (§12).

## 20. Tests and validation
Focused: `tests/weapon-phase-5d-h-executable-field-closure.test.mjs` (26 checks: geometry, prepared attack, brace, relations, descriptor joins, Riflemaster/Sport Hunter branch tests, proficiency identity, ammo cost, closure census). Regression: 5D-G/F/E(+correction)/D/C/B/A suites, runtime/registry/builder-negative, damage-modifier SSOT.
Final full rolling suite: **333 passed, 0 failed, 5 documented exclusions.** All builder `--check`s, census `--check`s, `verify-canonical-production`, `validate-partials`, `validate-data`, `system.json` parse and the 2773-file syntax check pass.

## 21. Foundry smoke checklist (NOT RUN)
Frag Grenade / Thermal Detonator 4-square burst / Flamethrower cone template; Bryar ordinary shot, prime (swift), next-turn primed shot (5 shots, +1 die); Subrepeating brace with stock retracted/extended; renamed Weapon Focus / Weapon Specialization; Riflemaster on a Heavy Blaster Rifle (d10→d12); Sport Hunter on slugthrower pistol (point-blank) and rifle; Deflect vs a sonic weapon; Pike with Long Haft Strike; multiattack after these changes. There is no sheet button for priming or the stock state yet (API only).

## 22. Not changed
No new Ready-Action or Brace subsystem; no operation-key consumers added to shrink counters; no canonical-data change for source-silent grenades; the legacy name-keyed feat normalization hooks and legacy text paths remain for homebrew.

## 23. Exact residual work
196 operation keys (§17), 10 execution families without consumer and 14 partial (§16), 7 relation families (§8), 42 form mechanics (§18), six talent ids, Sporting Blaster Pistol reroll, Knife Trick concealability, UI affordances for priming/stock state, retirement of the legacy name-keyed normalization hooks, the 5D-G census text for superseded wording.

## 24. Proposed Phase 5D-I boundary
**5D-I — remaining operation / ability mechanic convergence**: consume the unique residual families by subsystem, using the census buckets (not weapon records): targeting / attack resolution (conditional modifiers, aim/target rules, area effects); special reload / recovery + host-weapon augmentation; wielding & configuration constraints; persistent / status delivery; grapple / snare / net (including Pin/Trip relations); reaction / defense (Block/Deflect weapon modifiers); concealment / silent operation; special movement / reach; special damage modes and damage rerolls; remaining ability relations (with the six talent ids). Then final weapon certification / end-to-end validation.
