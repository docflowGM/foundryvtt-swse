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
export const I_D_DISPOSITIONS = Object.freeze(['IMPLEMENTED', 'DUPLICATE', 'NON_EXECUTABLE', 'DATA_DEFECT', 'DATA_COMPLETENESS', 'BLOCKED', 'DEFERRED_TO_I_D_A1', 'DEFERRED_TO_I_D_A2', 'DEFERRED_TO_I_D_A3', 'DEFERRED_TO_I_D_B', 'DEFERRED_TO_I_D_C', 'DEFERRED_TO_I_D_D', 'DEFERRED_TO_I_D_E', 'DEFERRED_TO_I_D_F']);
// Automation level (docs/architecture/swse-automation-authority.md). A SECOND audit dimension; it never changes the historical 5D-H counters.
//   AUTO            the engine has reliable facts and executes the mechanic
//   CONTEXTUAL      the rule is executable once a player / GM supplies a circumstance (an item, a terrain, a concealment level)
//   GM_ADJUDICATED  the outcome depends on narrative judgment; the system presents the rule and applies any mechanical consequence the GM establishes
export const AUTOMATION_LEVELS = Object.freeze(['AUTO', 'CONTEXTUAL', 'GM_ADJUDICATED']);
// What is actually outstanding for a row that is not yet implemented (the SMALLEST missing capability, never "the world cannot be simulated"):
//   INTEGRATION_PENDING      an existing authority exists but is not connected to the production call path (I-D-A1)
//   CONTEXT_SURFACE_PENDING  the consequence already executes from GM-supplied context (or an existing workflow), but the weapon-declared fact / duration is not surfaced into it
//   PRESENTATION_PENDING     GM-adjudicated: the rule must be presented in the attack / skill workflow; no numeric consumer is involved
//   MISSING_CONSUMER         a numeric / status consequence exists and NO mechanical consumer exists for it
export const SUPPORT_GAPS = Object.freeze(['INTEGRATION_PENDING', 'CONTEXT_SURFACE_PENDING', 'PRESENTATION_PENDING', 'MISSING_CONSUMER']);
export const I_D_SUBPASSES = Object.freeze({
  'I-D-A': 'umbrella: stealth / concealment / sensing / visibility rows settled by the census itself (proven duplicate, non-executable, source-silent, missing consumer)',
  'I-D-A1': 'carried-item / weapon skill bonuses through the existing EquipmentSkillHookResolver -> skill-roll path',
  'I-D-A2': 'contextual smoke / gas / radiation clouds: GM-established concealment or exposure through existing combat authorities; duration on the existing timing authority',
  'I-D-A3': 'GM-adjudicated rule presentation: line-of-sight origin, silent / invisible firing, audibility, sensor scans, compass',
  'I-D-B': 'weapon durability, construction, mounting, upgrades and size-derived wielding',
  'I-D-C': 'special activation, resources and remote operation',
  'I-D-D': 'poison coating and unresolved damage semantics',
  'I-D-E': 'weapon / feat / talent relationships and remaining certification',
  'I-D-F': 'reload / ammo-resource special cases (approved subpass for the 12 reload / power-source / capacity keys)',
});

// TRIPWIRES: each proves a subsystem is ABSENT today. `none` = no executable line of any scripts/**/*.js file (or only those under `dirs`; comments excluded) matches the pattern.
// `unreferenced` = no file outside `module` mentions the module path. `count` = exactly N files match. A tripwire that stops holding means the
// subsystem now exists: the BLOCKED rows that cite it must be reclassified, never silently kept.
export const TRIPWIRES = Object.freeze({
  // 'skill-hook-unwired' / 'skill-hook-equipment-only' tripped (as designed) when I-D-A1 connected EquipmentSkillHookResolver to rollSkill; their rows are now IMPLEMENTED
  'no-stealth-state': { kind: 'none', pattern: '\\b(stealthState|hiddenFrom|isHiddenFrom|revealShooter|concealedFrom)\\b', note: 'no hidden / revealed-position state on actors or tokens' },
  'no-noise-model': { kind: 'none', pattern: '\\b(noiseEvent|audibleTo|heardBy|soundEvent)\\b', note: 'no noise / hearing event model' },
  'no-sensor-scan': { kind: 'none', pattern: '\\b(sensorScan|scanForWeapons)\\b', note: 'no sensor-scan detection flow' },
  'no-radiation-exposure': { kind: 'none', pattern: '\\b(radiationExposure|radiationLevel|exposureLevel)\\b', note: 'no radiation exposure state' },
  'no-visibility-geometry': { kind: 'none', pattern: 'canvas\\.visibility|testVisibility|hasLineOfSight', note: 'no line-of-sight / visibility geometry; combat code only consumes caller-supplied booleans (context.lineOfSight)' },
  'no-persistent-area-zone': { kind: 'count', pattern: "createEmbeddedDocuments\\(\\s*['\"](Region|MeasuredTemplate)", count: 1, note: 'the only scene-region / template creation is the droid sheet (unrelated); no persistent area-effect zone owner exists' },
  'no-direction-use': { kind: 'none', pattern: '(determineNorth|whichWayIsNorth|getBearings)', note: 'no "determine direction" skill use or result exists' },
  'no-deaf-rule': { kind: 'none', dirs: ['scripts/engine/combat', 'scripts/items/weapon-runtime', 'scripts/combat'], pattern: '\\bdeaf(ened|ness)?\\b', note: 'no deafness-based damage immunity exists in the combat code (the Deafened status icon and IMMUNE_DEAFNESS rule live elsewhere and gate no damage)' },
});

const row = (kind, key, family, subpass, disposition, extra) => Object.freeze({ kind, key, family, subpass, disposition, ...extra });
const op = (key, family, subpass, disposition, extra) => row('operation-key', key, `3b.operation.${family}`, subpass, disposition, extra);
const deferred = (key, family, subpass, reason, extra = {}) => op(key, family, subpass, `DEFERRED_TO_${subpass.replace(/-/g, '_')}`, { owner: subpass, reason, ...extra });
// I-D-A rows carry the automation level, the smallest outstanding gap and (optionally) tripwires proving what does NOT exist today
const aRow = (key, family, subpass, automation, gap, reason, extra = {}) => deferred(key, family, subpass, reason, { automation, supportGap: gap, ...extra });

const RESOLVER = 'scripts/engine/equipment/equipment-skill-hook-resolver.js';
const impl = (key, family, automation, reason, probe = key) => op(key, family, 'I-D-A1', 'IMPLEMENTED', { automation, consumer: { file: RESOLVER, probe: `\\b${probe}\\b` }, reason });
const SKILL_REASON = (what) => `${what}. CONTEXTUAL: it applies when the player states the object / terrain the check concerns. IMPLEMENTED in I-D-A1: EquipmentSkillHookResolver now derives the hook from the canonical registry (by identity) and rollSkill applies it; proven by tests/weapon-phase-5d-i-d-a1-equipment-skill-hooks.test.mjs and tests/equipment-skill-hook-roll-regression.test.mjs.`;
const CLOUD_REASON = (what) => `${what}. CONTEXTUAL: the concealment consequence already executes from the GM-selected concealment level in the attack dialog (None / 20% / 50%); who is inside the cloud is the GM's call and is never inferred from a map. Outstanding: surface the weapon-declared cloud, its duration and the rule into that workflow and track the duration on the existing combat / effect timing authority. No geometry, visibility or token-position engine is needed.`;
const PRESENT_REASON = (what) => `${what}. GM_ADJUDICATED: the outcome depends on narrative judgment (who sees, hears or notices). Foundry presents the canonical rule in the attack / skill workflow and does not decide it; there is no numeric consumer, so nothing is simulated.`;

export const I_D_ROWS = Object.freeze([
  // ------------------------------------------------------------------ I-D-A1 : carried-item / weapon skill bonuses (approved integration)
  impl('concealmentEquipmentBonus', 'concealment-stealth-sensing', 'CONTEXTUAL', SKILL_REASON('+5 equipment bonus to Stealth to conceal the weapon (Contact Stunner, Hold-out / Snap-shot blaster pistols, Concealed Dart Launcher)')),
  impl('concealmentStealthBonus', 'concealment-stealth-sensing', 'CONTEXTUAL', SKILL_REASON('+5 untyped bonus to Stealth to conceal the weapon (Defender Microblaster, Clone Wars Campaign Guide p.62 states no bonus descriptor; Core Rulebook p.241 "Stacking Bonuses": bonuses without a descriptor stack, including with other undescribed bonuses)')),
  impl('concealmentStealthPenalty', 'concealment-stealth-sensing', 'CONTEXTUAL', SKILL_REASON('-5 penalty to Stealth to conceal the weapon (Ascension Gun, Galaxy at War p.37 "its bulk imposes -5 on Stealth checks made to conceal it")')),
  impl('snipingStealthEquipmentBonus', 'concealment-stealth-sensing', 'CONTEXTUAL', SKILL_REASON('+5 equipment bonus to the Stealth check made to snipe (Magna-Caster)')),
  impl('snipingSkill', 'concealment-stealth-sensing', 'CONTEXTUAL', 'Names the skill ("Stealth") of snipingStealthEquipmentBonus; a qualifier the integration validates (a mismatch derives no hook).'),
  impl('concealmentSkill', 'concealment-stealth-sensing', 'CONTEXTUAL', 'Names the skill ("Stealth") of concealmentEquipmentBonus; a qualifier the integration validates.'),
  impl('concealmentContext', 'concealment-stealth-sensing', 'CONTEXTUAL', 'States WHEN the bonus applies ("conceal this weapon"): the integration scopes the hook to the concealed item itself and validates this qualifier.'),
  impl('survivalBasicForestJungleBonusWhenProficientAndCarried', 'condition-and-persistent-effects', 'CONTEXTUAL', SKILL_REASON('+2 to Basic Survival in forest / jungle when the wielder is proficient and carries the weapon (Wookiee Ryyk Blade; terrain is player-stated, proficiency and carried state are observed)')),
  op('concealmentDesign', 'concealment-stealth-sensing', 'I-D-A', 'DATA_COMPLETENESS', { owner: 'canonical weapon data (source-silent)', automation: 'GM_ADJUDICATED', reason: 'Adjudicator Slugthrower: the design class "hold-out pistol" carries no number, and its published text ("concealable slugthrower backup pistol") states no Stealth bonus. Inheriting the +5 of other hold-out pistols would be an invention, so no hook is derived. Needs a source-backed bonus before it can be consumed.' }),

  // ------------------------------------------------------------------ I-D-A2 : contextual clouds (smoke / gas / radiation)
  aRow('providesConcealment', 'concealment-stealth-sensing', 'I-D-A2', 'CONTEXTUAL', 'CONTEXT_SURFACE_PENDING', CLOUD_REASON('Smoke Grenade: the smoke provides concealment for durationRounds (10)'), { tripwires: ['no-persistent-area-zone'] }),
  aRow('createsSmokeHazard', 'concealment-stealth-sensing', 'I-D-A2', 'CONTEXTUAL', 'CONTEXT_SURFACE_PENDING', CLOUD_REASON('Smoke Grenade hazard: the declared smoke area'), { tripwires: ['no-persistent-area-zone'] }),
  aRow('gasConcealmentDuration', 'concealment-stealth-sensing', 'I-D-A2', 'CONTEXTUAL', 'CONTEXT_SURFACE_PENDING', CLOUD_REASON('Gas Grenade lingering cloud (lingering-gas-concealment, until the end of the attacker\'s next turn; mutual concealment across the blast boundary and inside it). The attacker-next-turn lifecycle already exists (outcome-effects durationPlan, Flash Canister); the I-C-A impact outcome (CT -2 / Evasion -1) is implemented and must NOT be reapplied'), { tripwires: ['no-persistent-area-zone'] }),
  op('radiationExposure', 'concealment-stealth-sensing', 'I-D-A2', 'BLOCKED', { automation: 'CONTEXTUAL', supportGap: 'MISSING_CONSUMER', subsystem: 'radiation exposure level -> damage / Treat Injury consumer', tripwires: ['no-radiation-exposure'], blockKind: 'MISSING_CONSUMER', owner: 'I-D-A2', reason: 'Radiation Grenade: exposes creatures to Moderate radiation for damage and Treat Injury purposes. WHICH creatures are exposed is GM-established context (not inferred from a map), but the consequence needs a consumer that does not exist: no exposure level is stored or applied, and the hazard table that gives Moderate its damage / condition effect is not in the runtime. Separate the two capabilities: exposure selection is contextual; the exposure-level consumer is the genuinely missing piece.' }),

  // ------------------------------------------------------------------ I-D-A3 : GM-adjudicated rule presentation
  aRow('lineOfSightOriginHeightSquares', 'attack-modifiers-and-penalties', 'I-D-A3', 'GM_ADJUDICATED', 'PRESENTATION_PENDING', PRESENT_REASON('Mortar Launcher: line of sight is traced from a point 20 squares above the launcher. Line of sight is already a caller-supplied fact in the combat workflow; a custom 3-D line-of-sight engine is not built'), { tripwires: ['no-visibility-geometry'] }),
  aRow('shotVisibility', 'concealment-stealth-sensing', 'I-D-A3', 'GM_ADJUDICATED', 'PRESENTATION_PENDING', PRESENT_REASON('Xerrol Nightstinger: the shot is invisible to the eye'), { tripwires: ['no-stealth-state'] }),
  aRow('firingDoesNotRevealShooterPosition', 'concealment-stealth-sensing', 'I-D-A3', 'GM_ADJUDICATED', 'PRESENTATION_PENDING', PRESENT_REASON('Xerrol Nightstinger: firing does not reveal the shooter\'s position. The shooter is not automatically marked hidden from everyone'), { tripwires: ['no-stealth-state'] }),
  aRow('silentInUse', 'concealment-stealth-sensing', 'I-D-A3', 'GM_ADJUDICATED', 'PRESENTATION_PENDING', PRESENT_REASON('Vibrorapier: silent operation'), { tripwires: ['no-noise-model'] }),
  aRow('audibility', 'concealment-stealth-sensing', 'I-D-A3', 'GM_ADJUDICATED', 'PRESENTATION_PENDING', PRESENT_REASON('Sonic Stunner: only the target hears the attack, otherwise silent. Damage applies normally; hearing is not simulated per creature'), { tripwires: ['no-noise-model'] }),
  aRow('sensorDetection', 'concealment-stealth-sensing', 'I-D-A3', 'CONTEXTUAL', 'CONTEXT_SURFACE_PENDING', 'Wrist Blaster: a sensor scan for weapons detects it on a DC 25 Use Computer check. CONTEXTUAL: when the scan is explicitly initiated against this weapon, the check resolves through the existing Use Computer skill workflow; no sensor network is simulated. Outstanding: surface the DC when a scan is initiated.', { tripwires: ['no-sensor-scan'] }),
  aRow('alwaysDetermineNorth', 'concealment-stealth-sensing', 'I-D-A3', 'GM_ADJUDICATED', 'PRESENTATION_PENDING', PRESENT_REASON('Survival Knife: the carrier always knows which way is north. There is no check and no number, and no Extra Skill Use "determine direction" to attach a result to'), { tripwires: ['no-direction-use'] }),
  aRow('builtInDigitalCompass', 'concealment-stealth-sensing', 'I-D-A3', 'GM_ADJUDICATED', 'PRESENTATION_PENDING', PRESENT_REASON('Survival Knife: companion fact of alwaysDetermineNorth'), { tripwires: ['no-direction-use'] }),
  op('protectedAtmosphereImmune', 'concealment-stealth-sensing', 'I-D-A', 'DUPLICATE', {
    carrier: 'attackProfiles[].triggeredEffects[condition-track-effect].immunity = "protected-from-atmospheric-hazards"',
    consumer: { file: 'scripts/items/weapon-runtime/special-mechanics.js', probe: "typeof e.immunity === 'string'" },
    automation: 'AUTO',
    verify: (reg) => { const r = reg.identities.filter((x) => x.operation && 'protectedAtmosphereImmune' in x.operation); return r.length > 0 && r.every((x) => (x.canonicalStats?.attackProfiles ?? []).some((p) => (p.triggeredEffects ?? []).some((e) => e.id === 'condition-track-effect' && e.immunity === 'protected-from-atmospheric-hazards'))); },
    reason: 'Gas Grenade: the same immunity is carried by the condition-track-effect triggered effect, which the I-C-A ct-rider already executes. (The lingering cloud is a separate triggered effect; see gasConcealmentDuration.)',
  }),
  op('targeting', 'attack-modifiers-and-penalties', 'I-D-A', 'NON_EXECUTABLE', {
    nonExecutableClass: 'DISPLAY',
    tripwires: ['no-deaf-rule'],
    automation: 'AUTO',
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
  row('special-mechanic', 'weapon-gas-grenade::lingering-gas-concealment', 'status-condition', 'I-D-A2', 'DEFERRED_TO_I_D_A2', { identityKey: 'weapon-gas-grenade', mechanicId: 'lingering-gas-concealment', owner: 'I-D-A2', automation: 'CONTEXTUAL', supportGap: 'CONTEXT_SURFACE_PENDING', tripwires: ['no-persistent-area-zone'], reason: 'See gasConcealmentDuration: GM-established concealment through the existing attack dialog + the existing attacker-next-turn timing; the I-C-A impact outcome is already implemented and is not reapplied.' }),
  row('special-mechanic', 'weapon-sith-sword::dark-side-empowerment', 'activation-effect', 'I-D-C', 'DEFERRED_TO_I_D_C', { identityKey: 'weapon-sith-sword', mechanicId: 'dark-side-empowerment', owner: 'I-D-C', reason: 'Force Point empowerment + Dark Side Score consequence.' }),
  row('special-mechanic', 'weapon-verpine-shattergun::fragile-disable-on-damage', 'status-condition', 'I-D-B', 'DEFERRED_TO_I_D_B', { identityKey: 'weapon-verpine-shattergun', mechanicId: 'fragile-disable-on-damage', owner: 'I-D-B', reason: 'Disabled when the WEAPON OBJECT takes damage; needs a legitimate weapon-object damage event.' }),
  row('relation', 'FULL_ROUND_THREE_TARGET_AREA_ATTACK_WITH_DISCBLADE', 'relation', 'I-D-E', 'DEFERRED_TO_I_D_E', { owner: 'I-D-E', virtual: true, reason: 'Discblade Arc: a talent-granted full-round mode (three targets within point blank). The relation -> canonical talent identity link now exists (talent-identity.js, I-D-E); what remains is the multi-target full-round attack MODE in the multi-attack planner.' }),
  row('relation', 'USE_THE_FORCE_DC_15_AFTER_RANGED_ATTACK_TO_RETURN_DISCBLADE_AS_FREE_ACTION', 'relation', 'I-D-E', 'DEFERRED_TO_I_D_E', { owner: 'I-D-E', virtual: true, reason: 'Recall Discblade: the relation -> canonical talent identity link now exists (talent-identity.js, I-D-E); what remains is the after-attack Use the Force DC 15 return, which is a GM-adjudicated free-action return (a combat-action card, not a modifier).' }),
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
