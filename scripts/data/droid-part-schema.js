/**
 * Droid Part Rules Schema — CANONICAL droid-part registry.
 *
 * PHASE 1 — Droid Authority Consolidation: this is the canonical droid-part
 * definition authority (category, slot, cost, description, modifiers,
 * weaponProfile, features, restrictions, self-destruct math). It was
 * selected over scripts/domain/droids/droid-part-schema.js because it is
 * the module the live write/consume paths already depend on: Garage
 * pricing and installation (DroidCustomizationEngine), the Droid Systems
 * sheet tab (DroidSystemsResolver), virtual droid-part weapon
 * reconstruction (runtime-bugfix-hotfixes.js, chat-interaction-bridge.js),
 * and character-sheet.js's self-destruct UI all resolve parts through
 * getDroidPartDefinition/hydrateDroidPart here. See
 * docs/audits/droid-authority-consolidation-phase-1.md for the full
 * authority graph.
 *
 * scripts/domain/droids/droid-part-schema.js is NOT a second copy of this
 * registry to keep in sync by hand — it solves a different problem
 * (uuid/alias/trait-based identity resolution for feat/talent prerequisite
 * checking, via resolveDroidSystemIdentity/actorMeetsDroidSystemRequirement)
 * and is intentionally left alone in Phase 1 to avoid regressing
 * prerequisite behavior. Do not add new modifier, cost, or weapon-profile
 * logic there — add it here instead.
 *
 * This module is intentionally an overlay/normalizer, not a second Garage.
 * It reuses scripts/data/droid-systems.js as the broad source of names,
 * costs, availability, and descriptions, then adds machine-readable rules that
 * the sheet/roll layer can consume safely.
 */

import { DROID_SYSTEMS } from "/systems/foundryvtt-swse/scripts/data/droid-systems.js";
import { getDroidPriceFactor, resolveSourceReviewedDroidQuoteStaged } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-component-quote-authority.js";
import { resolveInstalledDroidComponents } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js";
import { auditAppendageMirror, isPhysicalAppendageDefinition, listLedgerInstances } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-appendage-instance.js";
import { DROID_SIZE_PACKAGES } from "/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-trait-rules.js";

export const DROID_PART_CATEGORIES = Object.freeze({
  PROCESSOR: 'processor',
  LOCOMOTION: 'locomotion',
  APPENDAGE: 'appendage',
  ARMOR: 'armor',
  SENSOR: 'sensor',
  COMMUNICATION: 'communication',
  SHIELD: 'shield',
  ACCESSORY: 'accessory',
  WEAPON: 'weapon'
});

const RAW_OVERLAY = {
  'basic-processor': {
    category: DROID_PART_CATEGORIES.PROCESSOR,
    slot: 'processor.primary',
    description: 'Basic Processors follow literal programming. They cannot use most skills untrained and do not allow improvised weapon use outside programming/proficiency.',
    rules: { allowsUntrainedSkills: false }
  },
  'heuristic-processor': {
    category: DROID_PART_CATEGORIES.PROCESSOR,
    slot: 'processor.primary',
    requiredForHeroicDroid: true,
    description: 'A Heuristic Processor allows a Droid to learn by doing, use skills untrained like other characters, creatively interpret instructions, and develop a unique personality.',
    rules: { allowsUntrainedSkills: true, allowsImprovisedWeaponUse: true }
  },
  'backup-processor': {
    category: DROID_PART_CATEGORIES.PROCESSOR,
    slot: 'processor.backup',
    prerequisiteIds: ['remote-processor', 'remote-receiver'],
    description: 'Allows a Droid with a Remote Receiver to continue executing its last received orders if contact with the Remote Processor is lost. On the sheet this unlocks a backup processor slot; only one processor can be active at a time.',
    rules: { unlocksBackupProcessorSlot: true, oneActiveProcessorOnly: true }
  },
  'restraining-bolt': {
    category: DROID_PART_CATEGORIES.PROCESSOR,
    slot: 'processor.control',
    description: "A Restraining Bolt turns off motor impulse and prevents a Droid from upgrading or improving Skills until removed.",
    rules: { blocksSkillImprovement: true }
  },
  'remote-receiver': {
    category: DROID_PART_CATEGORIES.PROCESSOR,
    slot: 'processor.receiver',
    description: 'Receives instructions from a Remote Processor. Only Droids without internal Processors can use one.',
    rules: { requiresRemoteProcessor: true }
  },
  'synchronized-fire-circuits': {
    category: DROID_PART_CATEGORIES.PROCESSOR,
    slot: 'processor.enhancement',
    prerequisiteIds: ['remote-processor', 'remote-receiver'],
    description: 'When Aiding Another Droid connected to the same Remote Processor, grants +5 instead of +2.',
    modifiers: [{ target: 'aidAnother.droid.sameRemoteProcessor', type: 'equipment', value: 5 }]
  },
  'specialized-subprocessor': {
    category: DROID_PART_CATEGORIES.PROCESSOR,
    slot: 'processor.enhancement',
    description: 'Grants one extra Swift Action each turn that can only be used for a single chosen Skill.',
    rules: { maxInstalled: 1, grantsSkillLimitedSwiftAction: true }
  },
  'tactician-battle-computer': {
    category: DROID_PART_CATEGORIES.PROCESSOR,
    slot: 'processor.enhancement',
    description: 'As a Standard Action, analyzes battle conditions and grants +2 to the next ranged attack roll by allies equal to INT modifier (minimum 1).',
    modifiers: [{ target: 'attack.ranged.ally.next', type: 'equipment', value: 2 }]
  },

  'extra-legs': {
    category: DROID_PART_CATEGORIES.LOCOMOTION,
    slot: 'locomotion.enhancement',
    prerequisiteIds: ['walking'],
    description: 'Requires Walking locomotion. Carrying Capacity is 50% higher and the Droid gains +5 stability bonus to resist being knocked Prone.',
    modifiers: [{ target: 'stability.prone', type: 'stability', value: 5 }],
    rules: { carryingCapacityMultiplier: 1.5 }
  },
  'jump-servos': {
    category: DROID_PART_CATEGORIES.LOCOMOTION,
    slot: 'locomotion.enhancement',
    prerequisiteIds: ['walking'],
    description: 'Requires Walking locomotion. Treat all Jumps as running Jumps, reroll failed Jump checks, and Take 10 on Jump checks even when rushed or threatened.',
    modifiers: [{ target: 'skill.jump', type: 'equipment', value: 0, rerollFailed: true, take10Threatened: true }]
  },
  'magnetic-feet': {
    category: DROID_PART_CATEGORIES.LOCOMOTION,
    slot: 'locomotion.enhancement',
    prerequisiteAnyIds: ['walking', 'wheeled', 'tracked'],
    description: "Magnetic grippers enable a Droid to cling to a ship's hull. With Magnetic Hands, grants +2 Climb on hulls and +5 Defenses against attempts to knock the Droid off the hull.",
    synergyIds: ['magnetic-hands'],
    modifiers: [
      { target: 'skill.climb.hull', type: 'equipment', value: 2, requiresAllIds: ['magnetic-hands'] },
      { target: 'defense.prone.hull', type: 'equipment', value: 5, requiresAllIds: ['magnetic-hands'] }
    ]
  },
  'gyroscopic-stabilizers': {
    category: DROID_PART_CATEGORIES.LOCOMOTION,
    slot: 'locomotion.enhancement',
    description: 'Grants +5 stability bonus to checks and Defenses to resist attempts to knock the Droid Prone. Stacks with Extra Legs.',
    modifiers: [{ target: 'stability.prone', type: 'stability', value: 5, stacks: true }]
  },
  'burrower-drive': {
    category: DROID_PART_CATEGORIES.LOCOMOTION,
    slot: 'locomotion.secondary',
    description: 'Enables underground movement at half speed. Can be used as a melee weapon that deals Self-Destruct damage, but each successful attack moves the Droid -1 Persistent step on the Condition Track.',
    weaponProfile: { name: 'Burrower Drive', mode: 'melee', damageBySelfDestructSize: true, attackAttribute: 'str', conditionOnHit: { step: 1, persistent: true } }
  },
  'underwater-drive': {
    category: DROID_PART_CATEGORIES.LOCOMOTION,
    slot: 'locomotion.secondary',
    description: 'Grants Swim Speed equal to base land Speed.',
    rules: { swimSpeedEqualsLandSpeed: true }
  },

  'claw': { category: DROID_PART_CATEGORIES.APPENDAGE, slot: 'appendage', appendageType: 'claw' },
  'hand': { category: DROID_PART_CATEGORIES.APPENDAGE, slot: 'appendage', appendageType: 'hand' },
  'tool': { category: DROID_PART_CATEGORIES.APPENDAGE, slot: 'appendage', appendageType: 'tool' },
  'instrument': { category: DROID_PART_CATEGORIES.APPENDAGE, slot: 'appendage', appendageType: 'instrument' },
  'probe': { category: DROID_PART_CATEGORIES.APPENDAGE, slot: 'appendage', appendageType: 'probe' },
  'climbing-claws': {
    category: DROID_PART_CATEGORIES.APPENDAGE,
    slot: 'appendage.enhancement',
    prerequisiteAnyIds: ['hand', 'claw'],
    description: 'Requires a Hand or Claw appendage. Grants climb speed equal to one-half base speed, rerolls failed Climb checks, and can Take 10 on Climb checks when rushed or threatened.',
    modifiers: [{ target: 'skill.climb', type: 'equipment', value: 0, rerollFailed: true, take10Threatened: true }]
  },
  'telescopic-appendage': {
    category: DROID_PART_CATEGORIES.APPENDAGE,
    slot: 'appendage.enhancement',
    description: 'Appendage has twice the normal Reach for the Droid’s size.',
    rules: { reachMultiplier: 2 }
  },
  'stabilized-mount': {
    category: DROID_PART_CATEGORIES.APPENDAGE,
    slot: 'appendage.mount',
    prerequisiteIds: ['tool'],
    description: 'Allows a Tool appendage to hold a larger weapon as if wielded in two hands.',
    rules: { weaponCountsAsTwoHanded: true }
  },
  'magnetic-hands': {
    category: DROID_PART_CATEGORIES.APPENDAGE,
    slot: 'appendage.enhancement',
    description: 'Functions like Magnetic Feet. With Magnetic Feet, grants +2 Climb checks on hulls and +5 Defenses against being knocked off the hull. While active, the Droid cannot attack or use hands.',
    synergyIds: ['magnetic-feet'],
    modifiers: [
      { target: 'skill.climb.hull', type: 'equipment', value: 2, requiresAllIds: ['magnetic-feet'] },
      { target: 'defense.prone.hull', type: 'equipment', value: 5, requiresAllIds: ['magnetic-feet'] }
    ]
  },
  'multifunction-apparatus': {
    category: DROID_PART_CATEGORIES.APPENDAGE,
    slot: 'appendage.mount',
    description: 'Allows up to three Tools or Weapons to be attached to a single appendage. Only one can be active at a time; switching is a Swift Action.',
    rules: { mountCapacity: 3, oneMountedToolOrWeaponActive: true, switchAction: 'swift' }
  },
  'projectile-appendage': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'appendage.weapon',
    prerequisiteIds: ['hand'],
    description: 'A launched appendage considered a Simple Ranged Weapon. Deals 2d8 damage and can make a ranged Disarm attempt within 6 squares.',
    weaponProfile: { name: 'Projectile Appendage', mode: 'ranged', damage: '2d8', range: '6 squares', weaponType: 'simple', canDisarm: true }
  },
  'rocket-arm': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'appendage.weapon',
    description: 'Illegal rocket-propelled arm considered a Heavy Weapon. Deals 3d8 damage with 1-square Splash.',
    weaponProfile: { name: 'Rocket Arm', mode: 'ranged', damage: '3d8', range: 'short', weaponType: 'heavy', splash: '1 square' }
  },

  'improved-sensor-package': {
    category: DROID_PART_CATEGORIES.SENSOR,
    slot: 'sensor',
    description: 'Grants +2 Equipment bonus to Perception checks and Low-Light Vision.',
    modifiers: [{ target: 'skill.perception', type: 'equipment', value: 2 }],
    senses: ['low-light-vision']
  },
  'audio-enhancers': {
    category: DROID_PART_CATEGORIES.SENSOR,
    slot: 'sensor.audio',
    description: 'When eavesdropping or listening for distant/ambient sounds, reroll Perception checks and keep the better result.',
    modifiers: [{ target: 'skill.perception.audio', type: 'equipment', value: 0, rerollFailed: true }]
  },
  'weapon-detector-package': {
    category: DROID_PART_CATEGORIES.SENSOR,
    slot: 'sensor.security',
    description: 'Allows the Droid to add its Intelligence modifier to Perception checks made to Search for Weapons.',
    modifiers: [{ target: 'skill.perception.searchWeapons', type: 'ability-extra', ability: 'int' }]
  },
  'yv-sensor-package': {
    category: DROID_PART_CATEGORIES.SENSOR,
    slot: 'sensor.special',
    description: 'Grants +10 bonus to Perception checks to detect Yuuzhan Vong within 12 squares and line of sight.',
    modifiers: [{ target: 'skill.perception.yuuzhanVong', type: 'equipment', value: 10 }]
  },
  'scomp-link': {
    category: DROID_PART_CATEGORIES.ACCESSORY,
    slot: 'accessory.data',
    description: 'Universal data port. Grants +2 Equipment bonus to Use Computer checks to Access Information when the computer is Helpful or Friendly.',
    modifiers: [{ target: 'skill.useComputer.accessInformation.helpful', type: 'equipment', value: 2 }]
  },
  'communications-countermeasures': {
    category: DROID_PART_CATEGORIES.COMMUNICATION,
    slot: 'communication',
    description: 'Grants +5 Equipment bonus to Use Computer checks made to overcome Communications Jamming.',
    modifiers: [{ target: 'skill.useComputer.overcomeJamming', type: 'equipment', value: 5 }]
  },
  'communications-jammer': {
    category: DROID_PART_CATEGORIES.COMMUNICATION,
    slot: 'communication.weaponized',
    description: 'Can jam Comlink signals within 1 km. Grants +5 Equipment bonus to Use Computer checks to slice into and maintain control of communications systems.',
    modifiers: [{ target: 'skill.useComputer.jamming', type: 'equipment', value: 5 }]
  },
  'credit-reader': {
    category: DROID_PART_CATEGORIES.ACCESSORY,
    slot: 'accessory.finance',
    description: 'Grants +5 to Perception against Deception checks to forge credit accounts or financial documents and can count credits as a Free Action.',
    modifiers: [{ target: 'skill.perception.financialForgery', type: 'equipment', value: 5 }]
  },
  'holographic-image-disguiser': {
    category: DROID_PART_CATEGORIES.ACCESSORY,
    slot: 'accessory.disguise',
    description: 'Grants +10 Equipment bonus to Deception checks using Deceptive Appearance.',
    modifiers: [{ target: 'skill.deception.deceptiveAppearance', type: 'equipment', value: 10 }]
  },
  'id-dodge': {
    category: DROID_PART_CATEGORIES.ACCESSORY,
    slot: 'accessory.infiltration',
    description: 'Allows the Droid to use Deception instead of Use Computer on biometric security devices.',
    rules: { substituteSkill: { from: 'useComputer', to: 'deception', context: 'biometricSecurity' } }
  },

  'sensor-countermeasure-package': {
    category: DROID_PART_CATEGORIES.SENSOR,
    slot: 'sensor.countermeasure',
    description: 'Broadcasts interference against nonvisual sensors. Use Computer can oppose Perception made to detect the Droid through sensors.',
    modifiers: [{ target: 'skill.useComputer.sensorCountermeasure', type: 'equipment', value: 0, opposedBy: 'perception' }]
  },
  'remote-receiver-signal-booster': {
    category: DROID_PART_CATEGORIES.COMMUNICATION,
    slot: 'communication.receiver',
    prerequisiteIds: ['remote-receiver'],
    description: 'Extends Remote Receiver range by 50%; a DC 30 Use Computer check can extend range up to 100% for 1 hour.',
    modifiers: [{ target: 'skill.useComputer.remoteReceiverBoost', type: 'equipment', value: 0, dc: 30 }]
  },
  'concealed-item': {
    category: DROID_PART_CATEGORIES.ACCESSORY,
    slot: 'accessory.concealment',
    description: 'Conceals a weapon or tool in the Droid body, appendage, or head. Grants +5 Stealth to conceal the weapon and +10 Deception for Deceptive Appearances involving the concealed item.',
    modifiers: [
      { target: 'skill.stealth.concealWeapon', type: 'equipment', value: 5 },
      { target: 'skill.deception.deceptiveAppearance', type: 'equipment', value: 10 }
    ]
  },
  'hidden-holster': {
    category: DROID_PART_CATEGORIES.ACCESSORY,
    slot: 'accessory.weaponStorage',
    description: 'Concealed leg holster for a weapon one size smaller than the Droid. Provides Quick Draw behavior for the stored weapon if the Droid has BAB +1 prerequisite.',
    rules: { grantsQuickDrawForStoredWeapon: true, prerequisite: { bab: 1 } }
  },
  'improved-coordination-circuitry': {
    category: DROID_PART_CATEGORIES.ACCESSORY,
    slot: 'accessory.coordination',
    description: 'When aiding another Droid with matching circuitry for a keyed trained skill, Aid Another bonus increases to +4.',
    modifiers: [{ target: 'aidAnother.droid.keyedSkill', type: 'equipment', value: 4, requiresTrainedSkill: true }]
  },
  'internal-defenses': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'accessory.defenseWeapon',
    description: 'Built-in maintenance-panel shock: 1d20 + 5 vs Fortitude; on hit deals 1d8 + half heroic level. Depletes after 10 attacks.',
    weaponProfile: { name: 'Internal Defenses', mode: 'reaction', damage: '1d8', attackBonus: 5, defense: 'fortitude', damageHalfLevel: true, charges: 10 }
  },
  'electric-defense-grid': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'core.defenseWeapon',
    description: 'Whenever damaged by a melee attack, attacker automatically takes 5 Energy damage; energy melee weapons are immune.',
    weaponProfile: { name: 'Electric Defense Grid', mode: 'reaction', damage: '5', damageType: 'energy', trigger: 'damagedByMelee' }
  },
  'blaster-recharge-interface': {
    category: DROID_PART_CATEGORIES.ACCESSORY,
    slot: 'appendage.utility',
    prerequisiteAnyIds: ['hand', 'claw', 'tool'],
    description: 'Recharges a standard power pack as a Swift Action. Droid loses HP equal to one die type of the blaster being recharged.',
    rules: { rechargesPowerPack: true, droidHpCostByWeaponDieType: true }
  },
  'automap': {
    category: DROID_PART_CATEGORIES.SENSOR,
    slot: 'sensor.mapping',
    description: 'Scans a 12-square radius for terrain, atmosphere, electromagnetic signatures, lifeforms, direction, speed, and coordinates when linked to navigation support.',
    rules: { scanRadiusSquares: 12 }
  },
  'survival-kit': {
    category: DROID_PART_CATEGORIES.ACCESSORY,
    slot: 'accessory.survival',
    description: 'When aiding Survival checks, grants +4 instead of the normal +2.',
    modifiers: [{ target: 'aidAnother.survival', type: 'equipment', value: 4 }]
  },
  'micro-shield': {
    category: DROID_PART_CATEGORIES.ACCESSORY,
    slot: 'appendage.shield',
    description: 'Attached shield. As a Swift Action can provide +1 Equipment bonus to Reflex Defense.',
    modifiers: [{ target: 'defense.reflex', type: 'equipment', value: 1, activation: 'swift' }]
  },
  'shield-expansion-module': {
    category: DROID_PART_CATEGORIES.SHIELD,
    slot: 'shield.enhancement',
    prerequisiteIds: ['sr5-shield-generator', 'sr10-shield-generator', 'sr15-shield-generator', 'sr20-shield-generator'],
    description: 'Expands the Droid’s shield by one adjacent square so an adjacent Medium or smaller ally can use the Droid’s SR.',
    rules: { expandsShieldAdjacentSquares: 1 }
  },
  // The published bonuses are only in DROID_SYSTEMS.hpBonus/dtBonus.
  // getDroidPartDefinition() projects them into ModifierEngine's live targets.
  'hardened-systems-x2': { category: DROID_PART_CATEGORIES.ACCESSORY, slot: 'core.hardened' },
  'hardened-systems-x3': { category: DROID_PART_CATEGORIES.ACCESSORY, slot: 'core.hardened' },
  'hardened-systems-x4': { category: DROID_PART_CATEGORIES.ACCESSORY, slot: 'core.hardened' },
  'hardened-systems-x5': { category: DROID_PART_CATEGORIES.ACCESSORY, slot: 'core.hardened' },
  'taser': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'accessory.weapon',
    description: 'Nonlethal projectile weapon. Can also be used as a melee weapon like an Electroshock Probe; against Droids the current acts like an Ion gun.',
    weaponProfile: { name: 'Taser', mode: 'ranged', damage: '2d6', damageType: 'stun/ion', range: 'short', weaponType: 'simple' }
  },
  'audio-radial-stunner': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'accessory.weapon',
    description: 'As a Standard Action, adjacent creatures must make DC 20 Endurance or move -1 step on the Condition Track until the end of the Droid’s next turn.',
    weaponProfile: { name: 'Audio-Radial Stunner', mode: 'area', damage: '', save: 'Endurance DC 20', conditionTrack: -1, radius: 'adjacent' }
  },
  'high-speed-cutting-torch-and-welder': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'accessory.toolWeapon',
    description: 'Cutting torch has range 1 square and deals 4d10 damage. After two or more consecutive rounds against an object, ignores 5 DR and reduces object DT by 10.',
    weaponProfile: { name: 'High-Speed Cutting Torch', mode: 'melee', damage: '4d10', range: '1 square', damageType: 'energy/fire' }
  },
  'internal-grapple-gun': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'accessory.utilityWeapon',
    description: 'Fires a magnetic grapple hook with cord. Firing is a Standard Action.',
    weaponProfile: { name: 'Internal Grapple Gun', mode: 'ranged', damage: '', range: '10 squares', utility: true }
  },
  'mesh-tape-dispenser': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'appendage.toolWeapon',
    description: 'Can entangle an adjacent enemy with a successful melee attack, hindering arms or legs.',
    weaponProfile: { name: 'Mesh Tape Dispenser', mode: 'melee', damage: '', range: 'adjacent', condition: 'hinder arms or legs' }
  },
  'multispectrum-searchlight': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'accessory.toolWeapon',
    description: 'Can blind targets in a 6-square cone with a ranged attack vs Fortitude, applying -5 or -2 penalties until end of next turn.',
    weaponProfile: { name: 'Multispectrum Searchlight', mode: 'area', damage: '', range: '6-square cone', defense: 'fortitude', condition: 'blind/penalty' },
    modifiers: [{ target: 'skill.perception.search', type: 'equipment', value: 2 }]
  },
  'radiant-heat-element': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'accessory.defenseWeapon',
    description: 'At highest setting, adjacent characters ending their turn near the Droid take 1d4 Fire damage; Droid takes 1 damage each turn.',
    weaponProfile: { name: 'Radiant Heat Element', mode: 'aura', damage: '1d4', damageType: 'fire', radius: 'adjacent' }
  },
  'self-destruct-system': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'core.selfDestruct',
    description: 'Destroys the Droid from within. No attack required against the Droid. Area Attack +5; targets in burst take damage by Droid size. The Droid is destroyed and cannot be repaired or salvaged.',
    weaponProfile: { name: 'Self-Destruct System', mode: 'area', selfDestruct: true, damageBySize: { tiny: '0', small: '4d6', medium: '6d6', large: '8d6', huge: '10d6', gargantuan: '20d6', colossal: '20d6' }, attackBonus: 5, burstPer4d6: 2 }
  },
  'miniaturized-self-destruct-system': {
    category: DROID_PART_CATEGORIES.WEAPON,
    slot: 'core.selfDestruct',
    description: 'Functions as normal Self-Destruct but as if the Droid were two sizes larger. Droid is destroyed and cannot be repaired or salvaged.',
    weaponProfile: { name: 'Miniaturized Self-Destruct System', mode: 'area', selfDestruct: true, miniaturized: true, damageBySize: { diminutive: '4d6', tiny: '6d6', small: '8d6', medium: '10d6', large: '20d6', huge: '20d6', gargantuan: '20d6', colossal: '20d6' }, attackBonus: 5, burstPer4d6: 2 }
  }
};

const DROID_PART_ALIASES = Object.freeze({
  basic: 'basic-processor',
  heuristic: 'heuristic-processor',
  remote: 'remote-processor',
  burrower: 'burrower-drive',
  underwater: 'underwater-drive',
  'synchronized-fire': 'synchronized-fire-circuits',
  'sr-5': 'sr5-shield-generator',
  'sr-10': 'sr10-shield-generator',
  'sr-15': 'sr15-shield-generator',
  'sr-20': 'sr20-shield-generator',
  'high-speed-cutting-torch': 'high-speed-cutting-torch-and-welder',
  'cutting-torch': 'high-speed-cutting-torch-and-welder',
  'mini-self-destruct': 'miniaturized-self-destruct-system',
  // slug() removes the word "systems"; these are current canonical catalog
  // identities, not legacy actor migrations. All four must find the same
  // rules overlay and source index instead of losing their core.hardened slot.
  'hardened-x2': 'hardened-systems-x2',
  'hardened-x3': 'hardened-systems-x3',
  'hardened-x4': 'hardened-systems-x4',
  'hardened-x5': 'hardened-systems-x5'
});

function slug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\b(system|systems|droid|accessory|accessories)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function labelize(id) {
  return String(id ?? '')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function flattenSystems() {
  const entries = [];
  const visit = (node, path = []) => {
    if (Array.isArray(node)) {
      for (const entry of node) {
        if (entry && typeof entry === 'object' && (entry.id || entry.name)) {
          entries.push({ ...entry, sourcePath: path.join('.') });
        }
      }
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) visit(value, [...path, key]);
  };
  visit(DROID_SYSTEMS);
  return entries;
}

const SOURCE_INDEX = new Map();
for (const def of flattenSystems()) {
  const ids = [def.id, def.name, slug(def.id), slug(def.name)].filter(Boolean).map(slug);
  for (const id of ids) if (!SOURCE_INDEX.has(id)) SOURCE_INDEX.set(id, def);
}

export function normalizeDroidPartId(value) {
  return canonicalPartId(value);
}

function canonicalPartId(value) {
  const key = slug(value);
  return DROID_PART_ALIASES[key] ?? key;
}

function sourceCategoryFromPath(sourcePath = '') {
  const path = String(sourcePath || '').toLowerCase();
  if (path.includes('processor')) return DROID_PART_CATEGORIES.PROCESSOR;
  if (path.includes('locomotion')) return DROID_PART_CATEGORIES.LOCOMOTION;
  if (path.includes('appendage')) return DROID_PART_CATEGORIES.APPENDAGE;
  if (path.includes('armor')) return DROID_PART_CATEGORIES.ARMOR;
  if (path.includes('sensor')) return DROID_PART_CATEGORIES.SENSOR;
  if (path.includes('communication')) return DROID_PART_CATEGORIES.COMMUNICATION;
  if (path.includes('shield')) return DROID_PART_CATEGORIES.SHIELD;
  if (path.includes('weapon')) return DROID_PART_CATEGORIES.WEAPON;
  return DROID_PART_CATEGORIES.ACCESSORY;
}

function defaultSlotForCategory(category, sourcePath = '') {
  const path = String(sourcePath || '').toLowerCase();
  if (category === DROID_PART_CATEGORIES.PROCESSOR) return 'processor.enhancement';
  if (category === DROID_PART_CATEGORIES.LOCOMOTION) return path.includes('enhancement') ? 'locomotion.enhancement' : 'locomotion.secondary';
  if (category === DROID_PART_CATEGORIES.APPENDAGE) return path.includes('enhancement') ? 'appendage.enhancement' : 'appendage';
  if (category === DROID_PART_CATEGORIES.ARMOR) return 'core.armor';
  if (category === DROID_PART_CATEGORIES.SENSOR) return 'sensor';
  if (category === DROID_PART_CATEGORIES.COMMUNICATION) return 'communication';
  if (category === DROID_PART_CATEGORIES.SHIELD) return 'shield.generator';
  if (category === DROID_PART_CATEGORIES.WEAPON) return 'accessory.weapon';
  return 'accessory.misc';
}

function firstFinite(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

/**
 * Exactly one source of numeric HP and damage-threshold bonuses.
 * ModifierEngine consumes hydrateDroidPart().modifiers, which are computed
 * here from source fields, never from a second manually copied table.
 */
function hardenedSystemSourceModifiers(source, size, installedIds = new Set()) {
  if (source?.sourcePath !== 'accessories.hardenedsystems') return null;
  const multiplier = source.multiplier;
  const baseline = DROID_SIZE_PACKAGES[String(size ?? '').toLowerCase()];
  const large = DROID_SIZE_PACKAGES.large;
  // Core pp. 187, 193-194: the published tier MULTIPLIES the normal
  // size HP and DT. Since the ordinary size amount is already present in
  // derived character statistics, modifiers contribute ONLY the difference.
  // hpBonus/dtBonus in this source catalog represent the Large-size TOTAL;
  // verify them rather than incorrectly adding that total a second time.
  if (!Number.isInteger(multiplier) || multiplier < 2 || multiplier > 5
      || source.hpBonus !== large.hitPointAdjustment * multiplier
      || source.dtBonus !== large.damageThresholdBonus * multiplier
      || !baseline || baseline.hitPointAdjustment <= 0 || baseline.damageThresholdBonus <= 0) {
    return [];
  }
  const others = [...installedIds].filter(id =>
    /^hardened-systems-x[2-5]$/.test(id) && id !== source.id);
  if (others.length) return []; // Two distinct tiers are never additive.
  const hpExtra = baseline.hitPointAdjustment * (multiplier - 1);
  const dtExtra = baseline.damageThresholdBonus * (multiplier - 1);
  return [
    { target: 'hp.max', type: 'equipment', value: hpExtra },
    { target: 'defense.damageThreshold', type: 'equipment', value: dtExtra }
  ];
}

export function getDroidPartDefinition(value) {
  const key = canonicalPartId(value?.id ?? value?.name ?? value);
  if (!key) return null;
  const lookupVariants = [
    key,
    slug(value?.name ?? value),
    key.replace(/-processor$/, ''),
    key.replace(/-drive$/, ''),
    key.replace(/-system$/, ''),
    key.replace(/-package$/, ''),
    key.replace(/-circuits$/, ''),
  ];
  const source = lookupVariants.map(v => SOURCE_INDEX.get(v)).find(Boolean) ?? null;
  const overlay = RAW_OVERLAY[key] ?? null;
  if (!source && !overlay) return null;
  const category = overlay?.category ?? sourceCategoryFromPath(source?.sourcePath);
  const slot = overlay?.slot ?? defaultSlotForCategory(category, source?.sourcePath);
  return {
    id: key,
    name: source?.name ?? overlay?.weaponProfile?.name ?? labelize(key),
    description: overlay?.description ?? source?.description ?? '',
    sourcePath: source?.sourcePath ?? '',
    source,
    category,
    slot,
    cost: source?.cost ?? overlay?.cost ?? null,
    costFormula: source?.costFormula ?? overlay?.costFormula ?? null,
    costMultiplier: source?.costMultiplier ?? overlay?.costMultiplier ?? null,
    weight: source?.weight ?? overlay?.weight ?? null,
    weightFormula: source?.weightFormula ?? overlay?.weightFormula ?? null,
    availability: source?.availability ?? overlay?.availability ?? '-',
    features: source?.features ?? [],
    restrictions: source?.restrictions ?? [],
    ...overlay,
    category,
    slot,
    source
  };
}

export function getAllDroidPartDefinitions() {
  const ids = new Set([...SOURCE_INDEX.keys(), ...Object.keys(RAW_OVERLAY)].map(canonicalPartId));
  const out = [];
  for (const id of ids) {
    const def = getDroidPartDefinition(id);
    if (def) out.push(def);
  }
  return out.sort((a, b) => String(a.category).localeCompare(String(b.category)) || String(a.name).localeCompare(String(b.name)));
}

/**
 * Compatibility export is a delegation, not a second factor table.
 * Unknown sizes are invalid (null), never silently Medium.
 */
export function getDroidCostFactor(size) {
  return getDroidPriceFactor(size);
}

function getActorDroidSize(actor, explicitSize = null) {
  return explicitSize ?? actor?.system?.droidSystems?.size ?? actor?.system?.size ?? actor?.system?.droidSize ?? null;
}

/**
 * The ONE definition of a host appendage that is genuinely there: a well-formed
 * ledger instance that (a) is not recorded `installed: false`, (b) has a
 * confirmed location token, (c) is not itself fitted to another host, and
 * (d) names a part whose catalog definition is a PHYSICAL appendage. If the
 * ledger and the droidSystems display mirror disagree about the physical
 * appendages, NO host is confirmed (fail closed until reconciled). Used by the
 * quote evidence, host pricing and the customization engine, so they cannot
 * disagree.
 */
export function listConfirmedHostInstances(actor) {
  const ledger = actor?.system?.installedSystems;
  if (auditAppendageMirror(ledger, actor?.system?.droidSystems).length) return [];
  return listLedgerInstances(ledger).instances.filter(instance => {
    if (instance.hostInstanceId) return false;
    if (instance.entry?.installed === false) return false;
    if (!instance.locationId) return false;
    const definition = getDroidPartDefinition(instance.partId);
    return Boolean(definition) && isPhysicalAppendageDefinition(definition);
  });
}

export function findConfirmedHostInstance(actor, instanceId) {
  const wanted = String(instanceId ?? '').trim();
  if (!wanted) return null;
  return listConfirmedHostInstances(actor).find(instance => instance.instanceId === wanted) ?? null;
}

/**
 * The shield rating of the droid's installed shield generator, derived from
 * CONFIRMED installed hardware. Exactly one rated generator is an unambiguous
 * base; none or several yield null (never a guess).
 */
export function deriveInstalledShieldRating(confirmedIds) {
  const ratings = (Array.isArray(confirmedIds) ? confirmedIds : [])
    .map(id => getDroidPartDefinition(id)?.source?.sr)
    .filter(sr => Number.isInteger(sr));
  return ratings.length === 1 ? ratings[0] : null;
}

/**
 * Installed-component EVIDENCE for a post-creation actor, read from the
 * authoritative records, never from ledger KEYS (a key may be opaque, e.g.
 * "hand--inst-...").
 *   confirmedIds        components the installation LEDGER records as installed
 *   presentIds          components present in ANY source (ledger, embedded
 *                       Item, droidSystems mirror/stock blob, legacy mods) -
 *                       used only to BLOCK conflicts, never to satisfy a need
 *   confirmedAppendages the ledger's physical appendage instances {id, instanceId}
 */
export function collectInstalledComponentEvidence(actor) {
  const resolution = resolveInstalledDroidComponents(actor, {
    normalizeId: normalizeDroidPartId,
    getDefinition: (id) => getDroidPartDefinition(id)
  });
  const confirmedIds = new Set();
  const presentIds = new Set();
  for (const component of resolution.components) {
    if (!component.installed) continue;
    presentIds.add(component.canonicalId);
    if (component.sources.some(src => src.kind === 'installedLedger' && src.installed)) confirmedIds.add(component.canonicalId);
  }
  const confirmedAppendages = listConfirmedHostInstances(actor)
    .map(instance => ({ id: normalizeDroidPartId(instance.partId), instanceId: instance.instanceId }));
  return { confirmedIds: [...confirmedIds], presentIds: [...presentIds], confirmedAppendages };
}

/**
 * Host-dependent quotation base. For a component whose published host
 * requirement is TYPED (`requiresAppendage`), the base cost and mass are those
 * of the selected host appendage as quoted by the canonical authority for this
 * droid's size. Nothing is taken from the caller, from the display mirror, or
 * from a ledger entry's stored `cost`. A host that is not installed on THIS
 * actor's ledger, whose kind does not match the id presented, or whose kind
 * the definition does not allow, yields no base. A component with no typed
 * host requirement is never host-priced (it is not guessed from prose or from
 * its price function).
 *
 * @returns {{status:'OK'|'BLOCKED'|'NOT_HOST_PRICED', cost:number|null, kg:number|null, reason:string|null}}
 */
export function deriveHostAppendageBase(actor, definition, selectedAppendage) {
  const none = (status, reason) => ({ status, cost: null, kg: null, reason });
  const raw = definition?.source?.requiresAppendage ?? definition?.requiresAppendage;
  const kinds = (Array.isArray(raw) ? raw : raw == null ? [] : [raw]).map(v => String(v).trim().toLowerCase()).filter(Boolean);
  if (!kinds.length) return none('NOT_HOST_PRICED', null);
  const instanceId = String(selectedAppendage?.instanceId ?? '').trim();
  if (!instanceId) return none('BLOCKED', 'No host appendage instance was selected');
  const host = findConfirmedHostInstance(actor, instanceId);
  if (!host) return none('BLOCKED', 'The selected host appendage is not a confirmed, installed physical appendage on this droid');
  const hostKind = normalizeDroidPartId(host.partId);
  if (normalizeDroidPartId(selectedAppendage?.id) !== hostKind) return none('BLOCKED', 'The selected host appendage does not match the installed instance');
  if (!kinds.includes(hostKind)) return none('BLOCKED', `This component is not published for a ${hostKind} appendage`);
  const hostQuote = resolveDroidPartQuoteDetailed(actor, hostKind).quote;
  if (hostQuote.status !== 'OK') return none('BLOCKED', 'The host appendage has no certified quote');
  return { status: 'OK', cost: hostQuote.credits, kg: hostQuote.kg, reason: null };
}

/**
 * One read-only adapter from live droid-part identities to the V2 source
 * quote authority. Installed instance cost/weight are deliberately NOT inputs:
 * they cannot override canonical source calculations.
 *
 * POST-CREATION evidence contract: prerequisites are judged against CONFIRMED
 * ledger records (see collectInstalledComponentEvidence), host prices are
 * derived (deriveHostAppendageBase) and any caller-supplied appendageBaseCost /
 * appendageBaseWeight is IGNORED. Returns the quote and the staged decision.
 */
export function resolveDroidPartQuoteDetailed(actor, part, options = {}) {
  const def = getDroidPartDefinition(part?.ruleId ?? part?.id ?? part?.name ?? part);
  if (!def?.source) {
    return {
      quote: { status: 'BLOCKED', credits: null, kg: null, blockingReason: 'No canonical source definition for this droid component' },
      stages: null
    };
  }
  const evidence = collectInstalledComponentEvidence(actor);
  const host = deriveHostAppendageBase(actor, def, options.selectedAppendage ?? null);
  // TRUST BOUNDARY. This is the POST-CREATION actor path. The following are
  // facts about the actor or the operation, never caller claims, so they are
  // derived here and any caller-supplied value is ignored:
  //   size                 the actor's own chassis size
  //   operationPhase       always POST_CREATION_INSTALL (the INITIAL_BUILD
  //                        subset of locomotion HOLDs is for the draft builders
  //                        only, which use resolveDroidBuilderQuote)
  //   locomotionSlotOrdinal / restrictedLocomotion   not applicable post-creation
  //   baseLocomotionCost   the quote of the actor's current locomotion
  //   selectedInstalledShieldRating   from confirmed installed hardware
  //   appendage base cost / mass      from the verified ledger host
  // `speed` and `variant` remain PURCHASE SELECTIONS: the quote authority
  // validates them against the published options (a numeric speed; an exact
  // printed variant) and rejects anything else.
  const isLocomotionEnhancement = String(def.sourcePath ?? '').toLowerCase().includes('locomotionenhancement');
  let baseLocomotionCost = null;
  if (isLocomotionEnhancement) {
    const chassisLocomotion = actor?.system?.droidSystems?.locomotion;
    if (chassisLocomotion?.id) {
      const base = resolveDroidPartQuoteDetailed(actor, chassisLocomotion.id, { speed: chassisLocomotion.speed }).quote;
      baseLocomotionCost = base.status === 'OK' ? base.credits : null;
    }
  }
  return resolveSourceReviewedDroidQuoteStaged({
    definition: def.source,
    size: getActorDroidSize(actor, null),
    category: def.category,
    sourcePath: def.sourcePath,
    speed: options.speed,
    variant: options.variant,
    appendageBaseCost: host.status === 'OK' ? host.cost : null,
    appendageBaseWeight: host.status === 'OK' ? host.kg : null,
    baseLocomotionCost,
    selectedInstalledShieldRating: deriveInstalledShieldRating(evidence.confirmedIds),
    operationPhase: 'POST_CREATION_INSTALL',
    locomotionSlotOrdinal: null,
    restrictedLocomotion: null,
    droidSystems: actor?.system?.droidSystems ?? null,
    ledgerEvidence: true,
    normalizeId: normalizeDroidPartId,
    installedComponentIds: evidence.confirmedIds,
    presentComponentIds: evidence.presentIds,
    confirmedAppendages: evidence.confirmedAppendages,
    selectedAppendage: options.selectedAppendage ?? null
  });
}

export function resolveDroidPartQuote(actor, part, options = {}) {
  return resolveDroidPartQuoteDetailed(actor, part, options).quote;
}

export function computeDroidLocomotionCost(actor, locomotionId = null, options = {}) {
  const id = locomotionId ?? actor?.system?.droidSystems?.locomotion?.id;
  return resolveDroidPartQuote(actor, id, options).credits;
}

/**
 * null means not quotable. It is NOT a free component and must reject
 * checkout/installation instead of coercing null to 0.
 */
export function computeDroidPartCost(actor, part, options = {}) {
  return resolveDroidPartQuote(actor, part, options).credits;
}

export function computeDroidPartWeight(actor, part, options = {}) {
  return resolveDroidPartQuote(actor, part, options).kg;
}

export function getSelfDestructBurstSquares(size, { miniaturized = false } = {}) {
  const damage = getSelfDestructDamage(size, { miniaturized });
  const dice = Number(String(damage).match(/^(\d+)d/i)?.[1] ?? 0);
  if (!dice) return 0;
  return Math.max(2, Math.ceil(dice / 4) * 2);
}

export function hydrateDroidPart(part = {}, options = {}) {
  const def = getDroidPartDefinition(part.id ?? part.name ?? part.system?.droidPartId ?? part.flags?.swse?.droidPartId);
  const id = normalizeDroidPartId(part.id ?? part.name ?? def?.id ?? 'droid-part');
  // Callers pass either an array (Garage / ModifierEngine) or a Set (the V2 droid
  // sheet resolver); both are an iterable of ids. `.map` on a Set threw, which
  // broke the Systems tab for any droid with a builder-configured part.
  const installedIds = new Set(Array.from(options.installedIds ?? [], (id) => normalizeDroidPartId(id)));
  const size = getActorDroidSize(options.actor ?? null, options.size ?? null);
  const hardened = hardenedSystemSourceModifiers(def?.source, size, installedIds);
  const modifiers = (hardened !== null ? hardened : (def?.modifiers ?? [])).map(mod => ({
    ...mod,
    active: !(Array.isArray(mod.requiresAllIds) && mod.requiresAllIds.some(req => !installedIds.has(normalizeDroidPartId(req))))
  }));
  return {
    ...part,
    id: part.id ?? id,
    ruleId: def?.id ?? id,
    name: part.name || def?.name || labelize(id),
    description: part.description || part.system?.description || def?.description || '',
    category: part.category || part.system?.category || def?.category || '',
    slot: part.slot || part.location || part.system?.slot || def?.slot || '',
    appendageType: part.appendageType || def?.appendageType || '',
    prerequisiteIds: def?.prerequisiteIds ?? part.prerequisiteIds ?? [],
    prerequisiteAnyIds: def?.prerequisiteAnyIds ?? part.prerequisiteAnyIds ?? [],
    synergyIds: def?.synergyIds ?? [],
    modifiers,
    hasActiveModifier: modifiers.some(m => m.active !== false && Number.isFinite(Number(m.value)) && Number(m.value) !== 0),
    weaponProfile: part.weaponProfile || def?.weaponProfile || null,
    rules: { ...(def?.rules ?? {}), ...(part.rules ?? {}) },
    features: part.features || def?.features || [],
    restrictions: part.restrictions || def?.restrictions || [],
    availability: part.availability || def?.availability || '-',
    ...(() => {
      const quote = resolveDroidPartQuote(options.actor ?? null, part, options);
      return { cost: quote.credits, weight: quote.kg,
        quoteStatus: quote.status, quoteBlockingReason: quote.blockingReason };
    })()
  };
}

export function isWeaponizedDroidPart(part) {
  return Boolean(hydrateDroidPart(part).weaponProfile);
}

export function getSelfDestructDamage(size, { miniaturized = false } = {}) {
  const normalized = slug(size || 'medium');
  const profile = miniaturized
    ? RAW_OVERLAY['miniaturized-self-destruct-system'].weaponProfile
    : RAW_OVERLAY['self-destruct-system'].weaponProfile;
  return profile.damageBySize[normalized] ?? profile.damageBySize.medium;
}

export function getDroidPartRuleOverlay() {
  return RAW_OVERLAY;
}
