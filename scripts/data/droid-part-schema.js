/**
 * Droid Part Rules Schema
 *
 * This module is intentionally an overlay/normalizer, not a second Garage.
 * It reuses scripts/data/droid-systems.js as the broad source of names,
 * costs, availability, and descriptions, then adds machine-readable rules that
 * the sheet/roll layer can consume safely.
 */

import { DROID_SYSTEMS } from "/systems/foundryvtt-swse/scripts/data/droid-systems.js";

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
  'hardened-systems-x2': { category: DROID_PART_CATEGORIES.ACCESSORY, slot: 'core.hardened', modifiers: [{ target: 'hp.max', type: 'equipment', value: 20 }, { target: 'defense.damageThreshold', type: 'equipment', value: 10 }] },
  'hardened-systems-x3': { category: DROID_PART_CATEGORIES.ACCESSORY, slot: 'core.hardened', modifiers: [{ target: 'hp.max', type: 'equipment', value: 30 }, { target: 'defense.damageThreshold', type: 'equipment', value: 15 }] },
  'hardened-systems-x4': { category: DROID_PART_CATEGORIES.ACCESSORY, slot: 'core.hardened', modifiers: [{ target: 'hp.max', type: 'equipment', value: 40 }, { target: 'defense.damageThreshold', type: 'equipment', value: 20 }] },
  'hardened-systems-x5': { category: DROID_PART_CATEGORIES.ACCESSORY, slot: 'core.hardened', modifiers: [{ target: 'hp.max', type: 'equipment', value: 50 }, { target: 'defense.damageThreshold', type: 'equipment', value: 25 }] },
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
  'mini-self-destruct': 'miniaturized-self-destruct-system'
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

export function getDroidCostFactor(size = 'medium') {
  const factors = {
    fine: 0.125,
    diminutive: 0.2,
    tiny: 0.25,
    small: 0.5,
    medium: 1,
    large: 2,
    huge: 4,
    gargantuan: 8,
    colossal: 16
  };
  return factors[slug(size)] ?? 1;
}

function getActorDroidSize(actor) {
  return slug(actor?.system?.droidSystems?.size ?? actor?.system?.size ?? actor?.system?.droidSize ?? 'medium') || 'medium';
}

function getActorPrimaryLocomotion(actor) {
  const systems = actor?.system?.droidSystems ?? {};
  return systems.locomotion?.id ?? systems.locomotion?.name ?? actor?.system?.locomotion?.type ?? 'walking';
}

export function computeDroidLocomotionCost(actor, locomotionId = null, options = {}) {
  const size = getActorDroidSize(actor);
  const costFactor = getDroidCostFactor(size);
  const id = canonicalPartId(locomotionId ?? getActorPrimaryLocomotion(actor));
  const def = getDroidPartDefinition(id) ?? getDroidPartDefinition('walking');
  const baseSpeed = Number(options.speed ?? def?.source?.baseSpeed?.[size] ?? def?.source?.speeds?.[size] ?? def?.baseSpeed?.[size] ?? 6);
  if (typeof def?.costFormula === 'function') return Math.max(0, Math.ceil(def.costFormula(baseSpeed, costFactor)));
  if (typeof def?.source?.costFormula === 'function') return Math.max(0, Math.ceil(def.source.costFormula(baseSpeed, costFactor)));
  return Math.max(0, Number(def?.cost ?? 0) || 0);
}

function computeAppendageBaseCost(actor, appendageId = 'hand') {
  const costFactor = getDroidCostFactor(getActorDroidSize(actor));
  const def = getDroidPartDefinition(appendageId) ?? getDroidPartDefinition('hand');
  const raw = def?.source?.cost ?? def?.cost;
  if (typeof raw === 'function') return Math.max(0, Math.ceil(raw(costFactor)));
  return Math.max(0, Number(raw ?? 50 * costFactor) || 0);
}

function resolveVariantCost(value, actor, options = {}) {
  if (typeof value === 'number') return value;
  if (typeof value === 'function') return value(getDroidCostFactor(getActorDroidSize(actor)));
  if (Array.isArray(value)) {
    const wanted = slug(options.variant ?? options.type ?? '');
    const match = wanted ? value.find(entry => slug(entry.version ?? entry.type ?? entry.id ?? entry.name) === wanted) : null;
    const selected = match ?? value[0];
    if (!selected) return null;
    return resolveVariantCost(selected.cost ?? selected.price ?? 0, actor, options);
  }
  return firstFinite(value);
}

export function computeDroidPartCost(actor, part, options = {}) {
  const def = getDroidPartDefinition(part?.id ?? part?.ruleId ?? part?.name ?? part);
  if (!def) return 0;
  const size = getActorDroidSize(actor);
  const costFactor = getDroidCostFactor(size);
  const source = def.source ?? {};
  const explicit = resolveVariantCost(options.cost ?? part?.cost, actor, options);
  if (explicit !== null && explicit !== 0) return Math.max(0, Math.ceil(explicit));

  const flatCost = resolveVariantCost(source.cost ?? def.cost, actor, options);
  if (flatCost !== null) return Math.max(0, Math.ceil(flatCost));

  if (typeof source.costFormula === 'function' || typeof def.costFormula === 'function') {
    const fn = source.costFormula ?? def.costFormula;
    const baseSpeed = Number(options.speed ?? source.baseSpeed?.[size] ?? source.speeds?.[size] ?? 6);
    return Math.max(0, Math.ceil(fn(baseSpeed, costFactor)));
  }

  const multiplier = Number(source.costMultiplier ?? def.costMultiplier ?? 0);
  if (Number.isFinite(multiplier) && multiplier > 0) {
    const category = def.category ?? sourceCategoryFromPath(source.sourcePath);
    if (category === DROID_PART_CATEGORIES.LOCOMOTION) {
      return Math.max(0, Math.ceil(computeDroidLocomotionCost(actor, options.baseLocomotionId) * multiplier));
    }
    if (category === DROID_PART_CATEGORIES.APPENDAGE || String(def.slot).startsWith('appendage')) {
      return Math.max(0, Math.ceil(computeAppendageBaseCost(actor, options.baseAppendageId) * multiplier));
    }
  }

  // Source data sometimes uses a custom build marker like "5000+". Keep the
  // minimum floor if a number is embedded so Garage can quote a conservative cost.
  const costText = String(source.cost ?? def.cost ?? '');
  const embedded = costText.match(/\d+/);
  if (embedded) return Math.max(0, Number(embedded[0]) || 0);
  return 0;
}

export function computeDroidPartWeight(actor, part, options = {}) {
  const def = getDroidPartDefinition(part?.id ?? part?.ruleId ?? part?.name ?? part);
  if (!def) return 0;
  const costFactor = getDroidCostFactor(getActorDroidSize(actor));
  const source = def.source ?? {};
  const raw = options.weight ?? part?.weight ?? source.weight ?? def.weight;
  if (typeof raw === 'function') return Math.max(0, Number(raw(costFactor)) || 0);
  if (Array.isArray(raw)) return resolveVariantCost(raw.map(entry => ({ ...entry, cost: entry.weight })), actor, options) ?? 0;
  const numeric = firstFinite(raw);
  if (numeric !== null) return Math.max(0, numeric);
  if (typeof source.weightFormula === 'function') return Math.max(0, Number(source.weightFormula(costFactor)) || 0);
  return 0;
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
  const installedIds = new Set((options.installedIds ?? []).map(normalizeDroidPartId));
  const modifiers = (def?.modifiers ?? []).map(mod => ({
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
    cost: computeDroidPartCost(options.actor ?? null, part),
    weight: computeDroidPartWeight(options.actor ?? null, part)
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
