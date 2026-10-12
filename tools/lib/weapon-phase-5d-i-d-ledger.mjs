// Phase 5D-I-D -- input ledger for the FINAL weapon residual convergence (DATA, not logic).
// Used ONLY by tools/census-weapon-phase-5d-i-d-inputs.mjs; no runtime module imports it.
//
// One row per remaining unconsumed operation key (75 at the post-I-C-C baseline), per I-D special-mechanic DEFER and per deferred talent-corpus relation.
// Dispositions (names follow the I-A..I-C-C manifests):
//   IMPLEMENTED         a production consumer exists and the row names a probe in its executable code (none yet in I-D-A, see the audit)
//   DUPLICATE           the certified operation key is ALSO carried by a structured field a consumer already executes (probe + verify against the registry)
//   NON_EXECUTABLE      the carried value states no mechanical effect, or removes a restriction the system never imposes (verify proves it)
//   DATA_DEFECT         canonical data is wrong (needs a source-backed finding)
//   DATA_COMPLETENESS   the published source / canonical record is silent; nothing may be guessed
//   BLOCKED             the mechanic is executable but the SUBSYSTEM it needs does not exist. Needs the exact subsystem, an owner and a TRIPWIRE: a
//                       declared absence check that FAILS the census the day that subsystem appears, forcing reclassification instead of silent drift
//   DEFERRED_TO_I_D_x   explicit owner = a later I-D subpass (analysis not yet done for that subpass; no consumption claimed)
export const I_D_DISPOSITIONS = Object.freeze(['IMPLEMENTED', 'DUPLICATE', 'NON_EXECUTABLE', 'DATA_DEFECT', 'DATA_COMPLETENESS', 'BLOCKED', 'DEFERRED_TO_I_D_B', 'DEFERRED_TO_I_D_C', 'DEFERRED_TO_I_D_D', 'DEFERRED_TO_I_D_E', 'DEFERRED_TO_I_D_F']);
export const I_D_SUBPASSES = Object.freeze({
  'I-D-A': 'stealth, concealment, sensing and visibility',
  'I-D-B': 'weapon durability, construction, mounting, upgrades and size-derived wielding',
  'I-D-C': 'special activation, resources and remote operation',
  'I-D-D': 'poison coating and unresolved damage semantics',
  'I-D-E': 'weapon / feat / talent relationships and remaining certification',
  'I-D-F': 'reload / ammo-resource special cases (PROPOSED subpass: the I-D handoff names no owner for these 12 keys; needs product approval)',
});

// TRIPWIRES: each proves a subsystem is ABSENT today. `none` = no executable line of any scripts/**/*.js file (or only those under `dirs`; comments excluded) matches the pattern.
// `unreferenced` = no file outside `module` mentions the module path. `count` = exactly N files match. A tripwire that stops holding means the
// subsystem now exists: the BLOCKED rows that cite it must be reclassified, never silently kept.
export const TRIPWIRES = Object.freeze({
  'skill-hook-unwired': { kind: 'unreferenced', module: 'scripts/engine/equipment/equipment-skill-hook-resolver.js', needle: 'equipment-skill-hook-resolver', note: 'EquipmentSkillHookResolver (the equipment -> Extra Skill Use bonus authority) has no importer, and only reads items of type "equipment"' },
  'skill-hook-equipment-only': { kind: 'contains', file: 'scripts/engine/equipment/equipment-skill-hook-resolver.js', needle: "item?.type !== 'equipment'", note: 'the resolver ignores weapon items, so a weapon-carried skill bonus has no reader' },
  'no-stealth-state': { kind: 'none', pattern: '\\b(stealthState|hiddenFrom|isHiddenFrom|revealShooter|concealedFrom)\\b', note: 'no hidden / revealed-position state on actors or tokens' },
  'no-noise-model': { kind: 'none', pattern: '\\b(noiseEvent|audibleTo|heardBy|soundEvent)\\b', note: 'no noise / hearing event model' },
  'no-sensor-scan': { kind: 'none', pattern: '\\b(sensorScan|scanForWeapons)\\b', note: 'no sensor-scan detection flow' },
  'no-radiation-exposure': { kind: 'none', pattern: '\\b(radiationExposure|radiationLevel|exposureLevel)\\b', note: 'no radiation exposure state' },
  'no-visibility-geometry': { kind: 'none', pattern: 'canvas\\.visibility|testVisibility|hasLineOfSight', note: 'no line-of-sight / visibility geometry; combat code only consumes caller-supplied booleans (context.lineOfSight)' },
  'no-persistent-area-zone': { kind: 'count', pattern: "createEmbeddedDocuments\\(\\s*['\"](Region|MeasuredTemplate)", count: 1, note: 'the only scene-region / template creation is the droid sheet (unrelated); no persistent area-effect zone owner exists' },
  'no-deaf-rule': { kind: 'none', dirs: ['scripts/engine/combat', 'scripts/items/weapon-runtime', 'scripts/combat'], pattern: '\\bdeaf(ened|ness)?\\b', note: 'no deafness-based damage immunity exists in the combat code (the Deafened status icon and IMMUNE_DEAFNESS rule live elsewhere and gate no damage)' },
});

const SKILL_HOOK = 'equipment-hook -> Extra Skill Use roll integration (EquipmentSkillHookResolver is an existing authority that is unwired and equipment-only)';
const row = (kind, key, family, subpass, disposition, extra) => Object.freeze({ kind, key, family, subpass, disposition, ...extra });
const op = (key, family, subpass, disposition, extra) => row('operation-key', key, `3b.operation.${family}`, subpass, disposition, extra);
// blockKind: INTEGRATION_CANDIDATE = an existing authority that is not yet connected to a production call path (approved integration, owner I-D-A1);
//            MISSING_SUBSYSTEM = no authority exists at all (needs a bounded architecture design before any implementation).
const blocked = (key, family, subsystem, tripwires, reason, extra = {}) => {
  const integration = subsystem === SKILL_HOOK;
  return op(key, family, 'I-D-A', 'BLOCKED', { subsystem, tripwires, blockKind: integration ? 'INTEGRATION_CANDIDATE' : 'MISSING_SUBSYSTEM', owner: integration ? 'I-D-A1 (approved: wire the existing EquipmentSkillHookResolver into the skill-roll pipeline)' : 'I-D-A2 / I-D-A3 (architecture design first; no implementation without a reviewed proposal)', reason, ...extra });
};
const deferred = (key, family, subpass, reason) => op(key, family, subpass, `DEFERRED_TO_${subpass.replace(/-/g, '_')}`, { owner: subpass, reason });

const SKILL_REASON = (what) => `${what}. The only authority that carries "equipment bonus to a skill use" (EquipmentSkillHookResolver, with conceal-weapon / conceal-item aliases already declared) has no caller and reads only equipment items, so no skill roll consumes any item bonus. This is an existing authority awaiting integration (approved, I-D-A1), not a missing subsystem; the canonical value is intact and nothing is guessed.`;

export const I_D_ROWS = Object.freeze([
  // ------------------------------------------------------------------ I-D-A : stealth / concealment / sensing / visibility
  blocked('concealmentEquipmentBonus', 'concealment-stealth-sensing', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], SKILL_REASON('+5 equipment bonus to Stealth to conceal the weapon (Contact Stunner, Hold-out / Snap-shot blaster pistols, Concealed Dart Launcher)')),
  blocked('concealmentStealthBonus', 'concealment-stealth-sensing', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], SKILL_REASON('+5 Stealth bonus carried with the weapon (Defender Microblaster)')),
  blocked('concealmentStealthPenalty', 'concealment-stealth-sensing', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], SKILL_REASON('-5 Stealth penalty carried with the weapon (Ascension Gun)')),
  blocked('snipingStealthEquipmentBonus', 'concealment-stealth-sensing', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], SKILL_REASON('+5 equipment bonus to the Stealth check made to snipe (Magna-Caster)')),
  blocked('snipingSkill', 'concealment-stealth-sensing', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], 'Names the skill ("Stealth") the sniping bonus applies to; a qualifier of snipingStealthEquipmentBonus with the same missing consumer. There is also no "sniping" Extra Skill Use alias to attach it to.'),
  blocked('concealmentSkill', 'concealment-stealth-sensing', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], 'Names the skill ("Stealth") of concealmentEquipmentBonus; a qualifier with the same missing consumer.'),
  blocked('concealmentContext', 'concealment-stealth-sensing', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], 'States WHEN the bonus applies ("conceal this weapon"); it maps to the existing conceal-weapon use alias but is a qualifier of a bonus nobody reads.'),
  blocked('concealmentDesign', 'concealment-stealth-sensing', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], 'Design class ("hold-out pistol") that the Adjudicator Slugthrower shares with the weapons that carry a numeric concealment bonus; it carries no number itself and inherits the same missing consumer. No bonus is inferred from the label.'),
  blocked('alwaysDetermineNorth', 'concealment-stealth-sensing', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], 'Carried-item Survival benefit (Survival Knife): an automatic result on a Survival use. Same missing equipment -> skill-use consumer; no Survival use consumes any carried item.'),
  blocked('builtInDigitalCompass', 'concealment-stealth-sensing', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], 'Companion fact of alwaysDetermineNorth (Survival Knife): same missing consumer.'),
  blocked('survivalBasicForestJungleBonusWhenProficientAndCarried', 'condition-and-persistent-effects', SKILL_HOOK, ['skill-hook-unwired', 'skill-hook-equipment-only'], SKILL_REASON('+2 to Basic Survival in forest / jungle when the wielder is proficient and carries the weapon (Wookiee Ryyk Blade)'), { subpass: 'I-D-A' }),
  blocked('providesConcealment', 'concealment-stealth-sensing', 'persistent area-effect zone + visibility geometry', ['no-persistent-area-zone', 'no-visibility-geometry'], 'Smoke Grenade: the cloud provides concealment for durationRounds (10). A cloud is a placed area that persists and is tested against token positions; the system has no persistent area-effect owner and no visibility / line-of-sight geometry (combat code only accepts a caller-supplied concealment option and a context.lineOfSight boolean).'),
  blocked('createsSmokeHazard', 'concealment-stealth-sensing', 'persistent area-effect zone + visibility geometry', ['no-persistent-area-zone', 'no-visibility-geometry'], 'Smoke Grenade hazard: same missing persistent-zone subsystem as providesConcealment (no zone to create).'),
  blocked('gasConcealmentDuration', 'concealment-stealth-sensing', 'persistent area-effect zone + visibility geometry', ['no-persistent-area-zone', 'no-visibility-geometry'], 'Gas Grenade lingering cloud (triggeredEffects lingering-gas-concealment, duration until-end-of-attacker-next-turn): concealment is MUTUAL across the blast boundary and inside the 4-square blast. The attacker-next-turn lifecycle already exists (outcome-effects durationPlan, used by Flash Canister), but it hangs a status on an ACTOR; the cloud has no actor to hang on and needs a placed zone plus an inside / outside / across-boundary visibility test. The I-C-A impact outcome (CT -2 / Evasion -1) is already implemented and must not be reapplied.'),
  op('protectedAtmosphereImmune', 'concealment-stealth-sensing', 'I-D-A', 'DUPLICATE', {
    carrier: 'attackProfiles[].triggeredEffects[condition-track-effect].immunity = "protected-from-atmospheric-hazards"',
    consumer: { file: 'scripts/items/weapon-runtime/special-mechanics.js', probe: "typeof e.immunity === 'string'" },
    verify: (reg) => { const r = reg.identities.filter((x) => x.operation && 'protectedAtmosphereImmune' in x.operation); return r.length > 0 && r.every((x) => (x.canonicalStats?.attackProfiles ?? []).some((p) => (p.triggeredEffects ?? []).some((e) => e.id === 'condition-track-effect' && e.immunity === 'protected-from-atmospheric-hazards'))); },
    reason: 'Gas Grenade: the same immunity is carried by the condition-track-effect triggered effect, which the I-C-A ct-rider already executes. (The lingering cloud is a separate triggered effect; see gasConcealmentDuration.)',
  }),
  blocked('shotVisibility', 'concealment-stealth-sensing', 'actor / token stealth + revealed-position state', ['no-stealth-state', 'no-visibility-geometry'], 'Xerrol Nightstinger: the shot is invisible to the eye. Needs the observers\' perception of an attack to be a modelled event; no such state exists.'),
  blocked('firingDoesNotRevealShooterPosition', 'concealment-stealth-sensing', 'actor / token stealth + revealed-position state', ['no-stealth-state'], 'Xerrol Nightstinger: firing does not end Stealth / reveal position. The system has no hidden / revealed state for firing to leave unchanged.'),
  blocked('silentInUse', 'concealment-stealth-sensing', 'noise / hearing event model', ['no-noise-model'], 'Vibrorapier: silent operation. There is no noise or hearing event for a weapon to suppress.'),
  blocked('audibility', 'concealment-stealth-sensing', 'noise / hearing event model', ['no-noise-model'], 'Sonic Stunner: only the target hears the attack. Same missing noise / hearing model.'),
  blocked('sensorDetection', 'concealment-stealth-sensing', 'sensor-scan detection flow', ['no-sensor-scan'], 'Wrist Blaster: a sensor scan for weapons detects it on a DC 25 Use Computer check. No sensor-scan flow exists to pit the scanner against a carried weapon.'),
  blocked('radiationExposure', 'concealment-stealth-sensing', 'radiation exposure state / hazard area', ['no-radiation-exposure', 'no-persistent-area-zone'], 'Radiation Grenade: exposes creatures to Moderate radiation for damage and Treat Injury purposes. Exposure has no state to set and no area to persist in.'),
  blocked('lineOfSightOriginHeightSquares', 'attack-modifiers-and-penalties', 'visibility / line-of-sight geometry', ['no-visibility-geometry'], 'Mortar Launcher: line of sight is traced from a point 20 squares above the launcher. The system takes line of sight as a caller-supplied boolean; there is no geometry to move the origin of.', { subpass: 'I-D-A' }),
  op('targeting', 'attack-modifiers-and-penalties', 'I-D-A', 'NON_EXECUTABLE', {
    nonExecutableClass: 'DISPLAY',
    tripwires: ['no-deaf-rule'],
    verify: (reg) => { const r = reg.identities.filter((x) => x.operation && 'targeting' in x.operation); return r.length === 1 && r[0].identityKey === 'weapon-sonic-stunner' && r[0].operation.targeting.deafTargetsCanBeHarmed === true && Object.keys(r[0].operation.targeting).sort().join() === 'deafTargetsCanBeHarmed,reason'; },
    reason: 'Sonic Stunner: deaf targets CAN be harmed. That removes a restriction (deafness-based immunity) which nothing in the system imposes (no-deaf-rule tripwire), so the default behaviour is already the stated one and there is nothing to execute.',
  }),

  // ------------------------------------------------------------------ remaining keys: explicit later owners (no consumption claimed)
  deferred('darkSideEmpowerment', 'ability-compatibility', 'I-D-C', 'Sith Sword Force Point empowerment + Dark Side Score consequence (special activation / resource).'),
  deferred('redirectionCrystalCompatibility', 'ability-compatibility', 'I-D-B', 'Redirection crystal is a separate equipment record installed on a weapon: upgrade / installation compatibility.'),
  deferred('surveillanceTaggerCompatibility', 'ability-compatibility', 'I-D-B', 'Surveillance tagger installation compatibility (upgrade authority).'),
  deferred('surveillanceTaggerCompatible', 'ability-compatibility', 'I-D-B', 'Surveillance tagger installation compatibility (upgrade authority).'),
  deferred('upgradeRestrictions', 'ability-compatibility', 'I-D-B', 'Weapon-specific upgrade installation restrictions (UpgradeSlotEngine / UpgradeService).'),
  deferred('canMountOnRifle', 'ammo-resource-reload', 'I-D-B', 'Mounting a weapon on a host weapon (construction / modification authority).'),
  deferred('canUseStandalone', 'ammo-resource-reload', 'I-D-B', 'Mounted-versus-standalone use of an attachment weapon.'),
  deferred('hasFoldingStock', 'ammo-resource-reload', 'I-D-B', 'Stock configuration / construction option.'),
  deferred('mountMechanicsDC', 'ammo-resource-reload', 'I-D-B', 'Mounting check DC (construction / installation).'),
  deferred('mountTimeMinutes', 'ammo-resource-reload', 'I-D-B', 'Mounting time (construction / installation).'),
  deferred('mountableOnMinimumWeaponSize', 'ammo-resource-reload', 'I-D-B', 'Host-size gate for mounting.'),
  deferred('requiresGrenadeLauncher', 'ammo-resource-reload', 'I-D-B', 'Host-weapon requirement for a mounted weapon.'),
  deferred('retractableStockOptional', 'ammo-resource-reload', 'I-D-B', 'Stock configuration / construction option.'),
  deferred('rifleMountable', 'ammo-resource-reload', 'I-D-B', 'Host-weapon compatibility for mounting.'),
  deferred('capacityGrenades', 'ammo-resource-reload', 'I-D-F', 'Grenade capacity of a launcher: needs inventory-level payload authority (deliberately deferred in the readiness UI work).'),
  deferred('canSingleLoadShell', 'ammo-resource-reload', 'I-D-F', 'Single-shell loading special case.'),
  deferred('oneShotCapacity', 'ammo-resource-reload', 'I-D-F', 'One-shot capacity special case.'),
  deferred('powerCordDisconnectRule', 'ammo-resource-reload', 'I-D-F', 'Power-source disconnect rule.'),
  deferred('powerLevelSwitchAction', 'ammo-resource-reload', 'I-D-F', 'Power-level switch action cost.'),
  deferred('requiresEnergyCell', 'ammo-resource-reload', 'I-D-F', 'Power-source requirement.'),
  deferred('requiresEnergyCells', 'ammo-resource-reload', 'I-D-F', 'Power-source requirement.'),
  deferred('requiresPowerPack', 'ammo-resource-reload', 'I-D-F', 'Power-source requirement.'),
  deferred('requiresPowerPacks', 'ammo-resource-reload', 'I-D-F', 'Power-source requirement.'),
  deferred('secondCrewReloadAction', 'ammo-resource-reload', 'I-D-F', 'Crew reload action.'),
  deferred('singleShot', 'ammo-resource-reload', 'I-D-F', 'Single-shot reload special case.'),
  deferred('specialRateOfFire', 'ammo-resource-reload', 'I-D-F', 'Special rate-of-fire / reload interaction.'),
  deferred('remoteDetonationSafetyRule', 'area-splash-burst', 'I-D-C', 'Remote Grenade 100-meter safety restriction (remote operation preflight).'),
  deferred('allyAttackBonus', 'attack-modifiers-and-penalties', 'I-D-C', 'Targeting Laser: ally attack bonus from a cross-actor designation.'),
  deferred('allyEligibleWeapons', 'attack-modifiers-and-penalties', 'I-D-C', 'Targeting Laser: which ally weapons benefit from the designation.'),
  deferred('repeatAttackEachRoundToMaintainDesignation', 'attack-modifiers-and-penalties', 'I-D-C', 'Targeting Laser: designation upkeep.'),
  deferred('preferredMode', 'attack-modifiers-and-penalties', 'I-D-B', 'Preferred fire mode of a configurable weapon (configuration state).'),
  deferred('grievousWound', 'condition-and-persistent-effects', 'I-D-D', 'Grievous wound semantics (unresolved damage semantics).'),
  deferred('collapsedForm', 'configuration-and-wielding', 'I-D-B', 'Collapsed-form configuration / size.'),
  deferred('designedForTwoHandedUse', 'configuration-and-wielding', 'I-D-B', 'Size-derived wielding.'),
  deferred('encumbranceException', 'configuration-and-wielding', 'I-D-B', 'Encumbrance exception for carried equipment.'),
  deferred('forearmMounted', 'configuration-and-wielding', 'I-D-B', 'Worn / mounted wielding.'),
  deferred('mayCountAsSmallWhenBeneficial', 'configuration-and-wielding', 'I-D-B', 'Size-derived wielding.'),
  deferred('mayTreatAsSizeWhenBeneficial', 'configuration-and-wielding', 'I-D-B', 'Size-derived wielding.'),
  deferred('multipleHeldOneHandCountsAsOneWeapon', 'configuration-and-wielding', 'I-D-B', 'Wielding count rule.'),
  deferred('sizeRule', 'configuration-and-wielding', 'I-D-B', 'Size-derived wielding.'),
  deferred('tripodTreatsAsOneSizeSmallerForWielding', 'configuration-and-wielding', 'I-D-B', 'Tripod wielding size.'),
  deferred('wornAs', 'configuration-and-wielding', 'I-D-B', 'Worn-item classification.'),
  deferred('wornOnWrist', 'configuration-and-wielding', 'I-D-B', 'Worn-item classification.'),
  deferred('tripodEffectiveSize', 'crew-and-emplacement', 'I-D-B', 'Tripod effective size (size-derived wielding).'),
  deferred('powerAttackExtraDamageAppliesToObjectsAndVehicles', 'damage-modifiers', 'I-D-B', 'Damage to weapon-adjacent objects / vehicles (object damage semantics).'),
  deferred('weaponDR', 'damage-modifiers', 'I-D-B', 'Weapon-object DR / durability (Electrostaff, Shockstaff).'),
  deferred('weaponDRAppliesAgainstLightsabers', 'damage-modifiers', 'I-D-B', 'Weapon-object DR versus lightsabers.'),
  deferred('weaponDRValue', 'damage-modifiers', 'I-D-B', 'Weapon-object DR value.'),
  deferred('alternateProficiency', 'proficiency-routes', 'I-D-E', 'Proficiency echo: confirm it duplicates selectors.speciesOverrides / abilityOverrides.'),
  deferred('wookieeAdvancedMeleeProficiencyCounts', 'proficiency-routes', 'I-D-E', 'Species proficiency echo: confirm duplicate.'),
  deferred('wookieeTreatsAsProficientWithWeaponProficiencyRifles', 'proficiency-routes', 'I-D-E', 'Species / feat proficiency echo: confirm duplicate.'),
  deferred('ascensionMode', 'utility-and-movement', 'I-D-C', 'Ascension Gun lift / zipline movement action (special activation).'),

  // ------------------------------------------------------------------ special-mechanic DEFERs and deferred talent-corpus relations
  row('special-mechanic', 'weapon-gas-grenade::lingering-gas-concealment', 'status-condition', 'I-D-A', 'BLOCKED', { identityKey: 'weapon-gas-grenade', mechanicId: 'lingering-gas-concealment', subsystem: 'persistent area-effect zone + visibility geometry', tripwires: ['no-persistent-area-zone', 'no-visibility-geometry'], blockKind: 'MISSING_SUBSYSTEM', owner: 'I-D-A2 / I-D-A3 (architecture design first; no implementation without a reviewed proposal)', reason: 'See gasConcealmentDuration: the cloud needs a placed zone and a mutual inside / outside / across-boundary visibility test; the impact outcome is already implemented (I-C-A) and is not reapplied.' }),
  row('special-mechanic', 'weapon-sith-sword::dark-side-empowerment', 'activation-effect', 'I-D-C', 'DEFERRED_TO_I_D_C', { identityKey: 'weapon-sith-sword', mechanicId: 'dark-side-empowerment', owner: 'I-D-C', reason: 'Force Point empowerment + Dark Side Score consequence.' }),
  row('special-mechanic', 'weapon-verpine-shattergun::fragile-disable-on-damage', 'status-condition', 'I-D-B', 'DEFERRED_TO_I_D_B', { identityKey: 'weapon-verpine-shattergun', mechanicId: 'fragile-disable-on-damage', owner: 'I-D-B', reason: 'Disabled when the WEAPON OBJECT takes damage; needs a legitimate weapon-object damage event.' }),
  row('relation', 'FULL_ROUND_THREE_TARGET_AREA_ATTACK_WITH_DISCBLADE', 'relation', 'I-D-E', 'DEFERRED_TO_I_D_E', { owner: 'I-D-E', virtual: true, reason: 'Discblade Arc: talent-granted mode; the talent has no canonical identity.' }),
  row('relation', 'TREAT_AS_RIFLE_INSTEAD_OF_EXOTIC_AND_GAIN_PLUS_1_ATTACK', 'relation', 'I-D-E', 'DEFERRED_TO_I_D_E', { owner: 'I-D-E', virtual: true, reason: 'Siang Lance Mastery: the +1 attack grant needs the talent identity (the proficiency re-route is already consumed through abilityOverrides).' }),
  row('relation', 'TREAT_DISCBLADE_AS_PISTOL_FOR_RANGE_ONLY', 'relation', 'I-D-E', 'DEFERRED_TO_I_D_E', { owner: 'I-D-E', virtual: true, reason: 'Distant Discblade Throw: talent identity required.' }),
  row('relation', 'USE_THE_FORCE_DC_15_AFTER_RANGED_ATTACK_TO_RETURN_DISCBLADE_AS_FREE_ACTION', 'relation', 'I-D-E', 'DEFERRED_TO_I_D_E', { owner: 'I-D-E', virtual: true, reason: 'Recall Discblade: talent identity required; discblade return is not an inherent weapon quality.' }),
]);

// owner of each partial / unconsumed execution FIELD FAMILY of the 5D-H closure census (family-level disposition; the key rows above are the executable detail)
export const I_D_FIELD_FAMILY_OWNERS = Object.freeze({
  '3b.operation.ability-compatibility': 'I-D-B / I-D-C (rows above)',
  '3b.operation.ammo-resource-reload': 'I-D-B (mounting) / I-D-F (reload, proposed)',
  '3b.operation.area-splash-burst': 'I-D-C (remoteDetonationSafetyRule)',
  '3b.operation.attack-modifiers-and-penalties': 'I-D-A (lineOfSight), I-D-B, I-D-C',
  '3b.operation.concealment-stealth-sensing': 'I-D-A (BLOCKED / DUPLICATE / NON_EXECUTABLE rows above)',
  '3b.operation.condition-and-persistent-effects': 'I-D-A (carried Survival bonus), I-D-D (grievousWound)',
  '3b.operation.configuration-and-wielding': 'I-D-B',
  '3b.operation.crew-and-emplacement': 'I-D-B',
  '3b.operation.damage-modifiers': 'I-D-B',
  '3b.operation.proficiency-routes': 'I-D-E',
  '3b.operation.utility-and-movement': 'I-D-C',
  '3b.profile.conditional': 'I-D-E (per-condition PROMPT / AUTO policy already classified by 5D-E)',
  '3b.profile.effects': 'I-D-A..E (follows the key rows)',
  '3b.profile.wielding': 'I-D-B',
  '3b.triggered': 'I-D-A (lingering-gas-concealment), I-D-D (poison coating)',
  '3b.defensive': 'I-D-B (weapon object DR / durability)',
  '3b.durability': 'I-D-B (weapon object DR / durability)',
  '3b.qualityParameters': 'I-D-B / I-D-E',
  '3b.wielding': 'I-D-B',
  '4h.auth.ruleSelectors.riders': 'I-D-E',
});
