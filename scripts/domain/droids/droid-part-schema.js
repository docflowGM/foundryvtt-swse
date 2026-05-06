/**
 * Canonical Droid Part Schema Adapter
 *
 * This layer gives droid systems one large shared schema contract without
 * replacing the existing Garage, droid builder, item models, or compendium
 * data. It consumes the existing DROID_SYSTEMS authority and overlays the
 * additional rules metadata needed by the Droid Sheet v2, Garage, modifier
 * engine, and chat-use affordances.
 *
 * Non-goals:
 * - no actor mutation
 * - no item mutation
 * - no new Garage implementation
 */

import { DROID_SYSTEMS } from "/systems/foundryvtt-swse/scripts/data/droid-systems.js";

const SIZE_ORDER = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];

export const DROID_PART_CATEGORIES = Object.freeze({
  processor: 'processor',
  processorEnhancement: 'processorEnhancement',
  locomotion: 'locomotion',
  locomotionEnhancement: 'locomotionEnhancement',
  appendage: 'appendage',
  appendageEnhancement: 'appendageEnhancement',
  armor: 'armor',
  communications: 'communications',
  hardenedSystems: 'hardenedSystems',
  sensor: 'sensor',
  shield: 'shield',
  translator: 'translator',
  miscellaneous: 'miscellaneous',
  weapon: 'weapon',
  station: 'station',
  accessory: 'accessory'
});

export const DROID_REQUIRED_PARTS = Object.freeze({
  processor: { defaultId: 'heuristic', defaultName: 'Heuristic Processor' },
  locomotion: { defaultId: 'walking', defaultName: 'Walking' },
  appendages: { defaultId: 'hand', defaultName: '2 Droid Arms' }
});

const BASE_APPENDAGE_SLOTS = Object.freeze([
  { key: 'leftArm', label: 'Left Arm', required: true, defaultId: 'hand', defaultName: 'Droid Arm / Hand' },
  { key: 'rightArm', label: 'Right Arm', required: true, defaultId: 'hand', defaultName: 'Droid Arm / Hand' }
]);

const DROID_RULE_OVERLAYS = Object.freeze({
  // Required/default systems
  heuristic: {
    slot: 'processor',
    requiredForPc: true,
    activationMode: 'exclusive',
    traits: ['pc-required', 'untrained-skills'],
    grants: { untrainedSkills: true },
    rulesText: 'PC droids require a Heuristic Processor. It allows the droid to use skills untrained and to attempt attacks with nonproficient weapons, still taking the normal nonproficiency penalty.'
  },
  basic: {
    slot: 'processor',
    activationMode: 'exclusive',
    traits: ['restricted-ai'],
    rulesText: 'A Basic Processor limits the droid to programmed functions. It may only use Acrobatics, Climb, Jump, and Perception untrained and cannot use weapons with which it is not proficient.'
  },
  remote: {
    slot: 'processor',
    activationMode: 'exclusive',
    traits: ['remote-control'],
    effects: [{ target: 'ability.dexterity', type: 'penalty', value: -2, label: 'Remote Processor reaction delay' }]
  },
  'remote-receiver': {
    slot: 'processorAux',
    requiresAny: ['remote'],
    traits: ['remote-link']
  },
  'backup-processor': {
    slot: 'processorAux',
    requiresAny: ['remote-receiver', 'remote'],
    grants: { processorSlots: 1 },
    traits: ['processor-slot-unlock'],
    rulesText: 'A Backup Processor allows a remote-receiver droid to keep functioning if contact with the Remote Processor is lost. It unlocks one additional inactive processor slot; only one processor may be active at a time.'
  },
  'specialized-subprocessor': {
    slot: 'processorAux',
    maxInstalled: 1,
    configurableSkill: true,
    grants: { extraSwiftAction: true },
    rulesText: 'Grants one extra Swift Action each turn that can only be used for a chosen skill-related action. A droid can have only one Specialized Subprocessor.'
  },
  'synchronized-fire': {
    slot: 'processorAux',
    requiresAny: ['remote', 'remote-receiver'],
    effects: [{ target: 'aidAnother.droid', type: 'equipment', value: 3, label: 'Synchronized Fire Circuits upgrade Aid Another from +2 to +5' }]
  },
  'restraining-bolt': {
    slot: 'processorAux',
    blocks: ['skill-upgrade'],
    rulesText: 'A fitted Restraining Bolt prevents a droid from upgrading or improving its skills.'
  },
  'tactician-battle-computer': {
    slot: 'processorAux',
    traits: ['combat-support'],
    effects: [{ target: 'attack.ranged.allyNext', type: 'equipment', value: 2, label: 'Tactician Battle Computer' }]
  },

  // Locomotion and combos
  walking: { slot: 'locomotion', required: true, movementMode: 'walk' },
  wheeled: { slot: 'locomotion', movementMode: 'wheel', blocksSkills: ['climb'] },
  tracked: { slot: 'locomotion', movementMode: 'track', effects: [{ target: 'skill.climb', type: 'penalty', value: -5, label: 'Tracked locomotion' }] },
  hovering: { slot: 'locomotion', movementMode: 'hover', traits: ['ignore-difficult-terrain'] },
  flying: { slot: 'locomotion', movementMode: 'fly', traits: ['flight'] },
  stationary: { slot: 'locomotion', movementMode: 'stationary', blocks: ['movement'] },
  burrower: {
    slot: 'locomotion',
    movementMode: 'burrow',
    asWeapon: { countsAsWeapon: true, damageSource: 'selfDestruct', attackType: 'melee', special: 'On hit, deals self-destruct damage and moves the droid -1 persistent condition step.' }
  },
  underwater: { slot: 'locomotion', movementMode: 'swim', grants: { swimSpeedEqualsLand: true } },
  'extra-legs': {
    slot: 'locomotionEnhancement',
    requiresAny: ['walking'],
    effects: [{ target: 'stability.prone', type: 'stability', value: 5, label: 'Extra Legs' }],
    rulesText: 'Requires Walking locomotion. Carrying capacity is 50% higher and the droid gains a +5 stability bonus to resist being knocked prone.'
  },
  'jump-servos': {
    slot: 'locomotionEnhancement',
    requiresAny: ['walking'],
    effects: [{ target: 'skill.jump', type: 'equipment', value: 0, label: 'Jump Servos: reroll failed Jump checks; Take 10 while rushed or threatened' }]
  },
  'magnetic-feet': {
    slot: 'locomotionEnhancement',
    requiresAny: ['walking', 'wheeled', 'tracked'],
    comboTags: ['magnetic-feet'],
    rulesText: 'Requires Walking, Wheeled, or Tracked locomotion. Enables the droid to cling to metal surfaces such as a ship hull.'
  },
  'gyroscopic-stabilizers': {
    slot: 'locomotionEnhancement',
    effects: [{ target: 'stability.prone', type: 'stability', value: 5, label: 'Gyroscopic Stabilizers' }]
  },

  // Appendages and limb-specific weapon systems
  probe: { slot: 'appendage', appendageType: 'probe', canManipulate: false },
  instrument: { slot: 'appendage', appendageType: 'instrument', carryingCapacityMultiplier: 0.25 },
  tool: { slot: 'appendage', appendageType: 'tool', traits: ['tool-mount'] },
  claw: { slot: 'appendage', appendageType: 'claw', traits: ['manipulator'] },
  hand: { slot: 'appendage', appendageType: 'hand', traits: ['true-hand', 'manipulator'] },
  mount: { slot: 'appendage', appendageType: 'mount', requiresAny: ['tool'], traits: ['weapon-mount'] },
  'climbing-claws': {
    slot: 'appendageEnhancement',
    requiresAny: ['hand', 'claw'],
    effects: [{ target: 'skill.climb', type: 'equipment', value: 0, label: 'Climbing Claws: climb speed, reroll failed Climb, Take 10 while rushed/threatened' }]
  },
  'telescopic-appendage': { slot: 'appendageEnhancement', effects: [{ target: 'reach', type: 'equipment', value: 1, label: 'Double normal reach for size' }] },
  'magnetic-hands': {
    slot: 'appendageEnhancement',
    comboTags: ['magnetic-hands'],
    comboEffects: [{ requires: ['magnetic-feet'], effects: [
      { target: 'skill.climb', type: 'equipment', value: 2, label: 'Magnetic Hands + Magnetic Feet' },
      { target: 'defense.vsProneHull', type: 'equipment', value: 5, label: 'Magnetic Hands + Magnetic Feet' }
    ] }],
    rulesText: 'When used with Magnetic Feet, grants +2 to Climb checks while maneuvering around a hull in space and +5 to Defenses against being knocked off the hull. When active, the droid cannot attack or use anything requiring its hands.'
  },
  'projectile-appendage': {
    slot: 'appendageEnhancement',
    requiresAny: ['hand'],
    asWeapon: { countsAsWeapon: true, weaponType: 'simple', attackType: 'ranged', damage: '2d8', range: '6 squares', special: 'May make ranged Disarm attempt.' }
  },
  'rocket-arm': {
    slot: 'appendageEnhancement',
    asWeapon: { countsAsWeapon: true, weaponType: 'heavy', attackType: 'ranged', damage: '3d8', splash: '1 square', special: 'Arm detaches and detonates on impact.' }
  },
  'multifunction-apparatus': { slot: 'appendageEnhancement', grants: { toolMountCapacity: 3 }, activeLimit: 1 },
  'quick-release-coupling': { slot: 'appendageEnhancement', traits: ['quick-swap'] },
  'remote-limb-control': { slot: 'appendageEnhancement', traits: ['detachable-limb'] },

  // Sensors, communications, and skill-affecting accessories
  'improved-sensor-package': { slot: 'sensor', effects: [{ target: 'skill.perception', type: 'equipment', value: 2, label: 'Improved Sensor Package' }], grants: { lowLightVision: true } },
  darkvision: { slot: 'sensor', grants: { darkvision: true } },
  'sensor-booster': { slot: 'sensor', requiresAny: ['improved-sensor-package', 'sensor-pack'], traits: ['sensor-range-2km'] },
  'sensor-countermeasure-package': { slot: 'sensor', effects: [{ target: 'skill.useComputer', type: 'equipment', value: 0, label: 'Use Computer opposed check to avoid sensor detection' }] },
  'weapon-detector-package': { slot: 'sensor', effects: [{ target: 'skill.perception.searchWeapons', type: 'equipment', value: 0, label: 'Add Intelligence modifier to Perception checks to search for weapons' }] },
  'yv-sensor-package': { slot: 'sensor', effects: [{ target: 'skill.perception.yuuzhanVong', type: 'equipment', value: 10, label: 'YV Sensor Package' }] },
  'communications-countermeasures': { slot: 'communications', effects: [{ target: 'skill.useComputer.overcomeJamming', type: 'equipment', value: 5, label: 'Communications Countermeasures' }] },
  'communications-jammer': { slot: 'communications', effects: [{ target: 'skill.useComputer.jamming', type: 'equipment', value: 5, label: 'Communications Jammer' }] },
  'remote-receiver-signal-booster': { slot: 'communications', effects: [{ target: 'skill.useComputer.remoteSignalBoost', type: 'equipment', value: 0, label: 'DC 30 Use Computer can extend remote receiver range to 100% for 1 hour' }] },
  'scomp-link': { slot: 'miscellaneous', effects: [{ target: 'skill.useComputer.accessHelpfulComputer', type: 'equipment', value: 2, label: 'Scomp Link' }] },
  'survival-kit': { slot: 'miscellaneous', effects: [{ target: 'aidAnother.survival', type: 'equipment', value: 2, label: 'Survival Kit: Aid Another grants +4 instead of +2' }] },
  'credit-reader': { slot: 'miscellaneous', effects: [{ target: 'skill.perception.financialForgery', type: 'equipment', value: 5, label: 'Credit Reader' }] },
  'holographic-image-disguiser': { slot: 'miscellaneous', effects: [{ target: 'skill.deception.deceptiveAppearance', type: 'equipment', value: 10, label: 'Holographic Image Disguiser' }] },
  'id-dodge': { slot: 'miscellaneous', effects: [{ target: 'skill.deception.biometricSecurity', type: 'equipment', value: 0, label: 'Use Deception instead of Use Computer for biometric security' }] },
  'multispectrum-searchlight': { slot: 'miscellaneous', effects: [{ target: 'skill.perception.searchNotice', type: 'equipment', value: 2, label: 'Multispectrum Searchlight' }] },

  // Weapons / destructive systems
  taser: { slot: 'weapon', asWeapon: { countsAsWeapon: true, weaponType: 'simple', attackType: 'rangedOrMelee', damageType: 'stun/ion', damage: '', range: '', special: 'Nonlethal projectile; affects droids like ion weapon. Can also be used as melee weapon like an electroshock probe.' } },
  'audio-radial-stunner': { slot: 'weapon', asWeapon: { countsAsWeapon: true, attackType: 'area', damage: '', range: 'adjacent', special: 'Adjacent creatures make DC 20 Endurance or move -1 condition step.' } },
  'high-speed-cutting-torch-and-welder': { slot: 'weapon', asWeapon: { countsAsWeapon: true, attackType: 'melee', damage: '4d10', range: '1 square', special: 'After two consecutive rounds against an object, ignores 5 DR and reduces object DT by 10.' } },
  'mesh-tape-dispenser': { slot: 'weapon', asWeapon: { countsAsWeapon: true, attackType: 'melee', damage: '', special: 'Entangle/hinder adjacent enemy with successful melee attack.' } },
  'internal-grapple-gun': { slot: 'weapon', asWeapon: { countsAsWeapon: true, attackType: 'ranged', damage: '', range: '10 squares internal / 70 squares external magazine', special: 'Fires magnetic grapple hook.' } },
  'space-beacon-launcher': { slot: 'weapon', asWeapon: { countsAsWeapon: true, attackType: 'launcher', damage: '', range: 'star system beacon', special: 'Launches up to 12 space beacons; additional storage can increase capacity.' } },
  'self-destruct-system': { slot: 'weapon', asWeapon: { countsAsWeapon: true, selfDestruct: true, attackType: 'area', damageBySize: { small: '4d6', medium: '6d6', large: '8d6', huge: '10d6', gargantuan: '20d6', colossal: '20d6' }, burstPerDice: '2 squares per 4d6, minimum 2 squares', attackBonus: 5, destroyedOnUse: true } },
  'miniaturized-self-destruct-system': { slot: 'weapon', asWeapon: { countsAsWeapon: true, selfDestruct: true, miniaturized: true, attackType: 'area', damageBySize: { diminutive: '4d6', tiny: '6d6', small: '8d6', medium: '10d6', large: '20d6', huge: '20d6', gargantuan: '20d6', colossal: '20d6' }, burstPerDice: '2 squares per 4d6, minimum 2 squares', attackBonus: 5, destroyedOnUse: true } },

  // Armor / defenses / status
  'micro-shield': { slot: 'shield', effects: [{ target: 'defense.reflex', type: 'equipment', value: 1, label: 'Micro Shield active' }] },
  'electric-defense-grid': { slot: 'miscellaneous', asWeapon: { countsAsWeapon: true, attackType: 'reactive', damage: '5', damageType: 'energy', special: 'Damages melee attackers for 5 energy damage; energy melee weapons are immune.' } },
  'radiant-heat-element': { slot: 'miscellaneous', asWeapon: { countsAsWeapon: true, attackType: 'aura', damage: '1d4', damageType: 'fire', special: 'Adjacent creatures ending turn nearby take fire damage; droid takes 1 damage each turn at highest setting.' } },
  'hardened-systems-x2': { slot: 'armor', effects: [{ target: 'hp.max', type: 'equipment', value: 20, label: 'Hardened Systems x2' }, { target: 'defense.damageThreshold', type: 'equipment', value: 10, label: 'Hardened Systems x2' }] },
  'hardened-systems-x3': { slot: 'armor', effects: [{ target: 'hp.max', type: 'equipment', value: 30, label: 'Hardened Systems x3' }, { target: 'defense.damageThreshold', type: 'equipment', value: 15, label: 'Hardened Systems x3' }] },
  'hardened-systems-x4': { slot: 'armor', effects: [{ target: 'hp.max', type: 'equipment', value: 40, label: 'Hardened Systems x4' }, { target: 'defense.damageThreshold', type: 'equipment', value: 20, label: 'Hardened Systems x4' }] },
  'hardened-systems-x5': { slot: 'armor', effects: [{ target: 'hp.max', type: 'equipment', value: 50, label: 'Hardened Systems x5' }, { target: 'defense.damageThreshold', type: 'equipment', value: 25, label: 'Hardened Systems x5' }] }
});

const EXTRA_DROID_PARTS = Object.freeze([
  { id: 'audio-enhancers', name: 'Audio Enhancers', category: 'sensor', slot: 'sensor', cost: 2000, weight: 1, description: 'Increases aural sensitivity. When eavesdropping or listening for distant or ambient sounds, reroll Perception checks and keep the better result.', effects: [{ target: 'skill.perception.listening', type: 'equipment', value: 0, label: 'Audio Enhancers: reroll listening Perception checks' }] },
  { id: 'automap', name: 'Automap', category: 'sensor', slot: 'sensor', cost: 1000, weight: 2, description: 'Scans terrain, atmospheric conditions, electromagnetic signatures, lifeforms, direction, speed, and coordinates in a 12-square radius.' },
  { id: 'blaster-recharge-interface', name: 'Blaster Recharge Interface', category: 'miscellaneous', slot: 'miscellaneous', cost: 300, weight: 1, availability: 'Licensed', description: 'Hand accessory that recharges a standard power pack as a Swift Action. The droid loses HP equal to one die type of the blaster damage.' },
  { id: 'collapsible-construction', name: 'Collapsible Construction', category: 'miscellaneous', slot: 'miscellaneous', description: 'Allows the droid to lower its size category by one while shut down. Reactivating is a Standard Action.' },
  { id: 'concealed-item', name: 'Concealed Item', category: 'miscellaneous', slot: 'miscellaneous', availability: 'Restricted', description: 'Conceals a weapon or tool inside the body, appendage, or head. Deploying a fully concealed weapon is a Swift Action and uses normal draw-weapon rules.', asWeapon: { countsAsWeapon: false, special: 'Can conceal a weapon; the concealed weapon itself remains the attack source.' } },
  { id: 'courier-compartment', name: 'Courier Compartment', category: 'miscellaneous', slot: 'miscellaneous', cost: 200, description: 'Hidden storage installed in torso, arm, leg, or head. Detection requires Perception against Will Defense +5.' },
  { id: 'droid-oil-bath', name: 'Droid Oil Bath', category: 'miscellaneous', slot: 'station', cost: 500, description: 'After 30 minutes immersed, the droid can activate Second Wind even if it has already done so that day.' },
  { id: 'emergency-oxygen-supply', name: 'Emergency Oxygen Supply', category: 'miscellaneous', slot: 'miscellaneous', cost: 200, weight: 20, description: 'Provides 30 minutes of oxygen for a Medium creature and can recharge a Vacuum Pod or supply a Breath Mask.' },
  { id: 'hidden-holster', name: 'Hidden Holster', category: 'miscellaneous', slot: 'miscellaneous', description: 'Installed in a leg; holds a weapon one size smaller than the droid. Grants Quick Draw benefit for that weapon if the droid meets the feat prerequisite.' },
  { id: 'improved-coordination-circuitry', name: 'Improved Coordination Circuitry', category: 'miscellaneous', slot: 'miscellaneous', cost: 1000, weight: 1, description: 'Keyed to one trained skill. When aiding another droid with the same circuitry, Aid Another bonus increases to +4.', effects: [{ target: 'aidAnother.droidSkill', type: 'equipment', value: 2, label: 'Improved Coordination Circuitry' }] },
  { id: 'interference-generator', name: 'Interference Generator', category: 'miscellaneous', slot: 'miscellaneous', cost: 2500, weight: 1, availability: 'Restricted', description: 'Masks adjacent squares from audio recording/listening. Deluxe version also interferes with video and holo recording.' },
  { id: 'internal-defenses', name: 'Internal Defenses', category: 'miscellaneous', slot: 'miscellaneous', description: 'Shocks anyone opening panels without permission: 1d20+5 vs Fortitude; damage 1d8 + half heroic level. Depletes after 10 attacks.', asWeapon: { countsAsWeapon: true, attackType: 'trap', damage: '1d8 + half heroic level', attackBonus: 5, targetDefense: 'fortitude' } },
  { id: 'locked-access', name: 'Locked Access', category: 'miscellaneous', slot: 'miscellaneous', cost: 50, availability: 'Licensed', description: 'Shutdown switch is secured or internal. Droid must be disabled or helpless before it can be shut down.' },
  { id: 'secondary-battery', name: 'Secondary Battery', category: 'miscellaneous', slot: 'power', cost: 400, weight: 4, description: 'Doubles operational duration before recharge from 100 hours to 200 hours.' },
  { id: 'silence-bubble-generator', name: 'Silence-Bubble Generator', category: 'miscellaneous', slot: 'miscellaneous', cost: 3500, availability: 'Licensed', description: 'Creates a 3-square-radius sound-dampening bubble. Listening from outside suffers a -10 Perception/Use Computer penalty.' },
  { id: 'video-screen', name: 'Video Screen', category: 'miscellaneous', slot: 'miscellaneous', description: 'Built-in screen for diagnostics, text, images, programming, and translations.' },
  { id: 'voice-print-command-lock', name: 'Voice-Print Command Lock', category: 'miscellaneous', slot: 'miscellaneous', cost: 400, weight: 1, description: 'Droid obeys only commands from a single voice print. Recordings require Use Computer against Will Defense +5.' }
]);

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeAvailability(value) {
  return String(value ?? '-').trim() || '-';
}

function normalizeWeight(value) {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCost(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'function') return null;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function categoryFromPath(path = []) {
  const top = path[0] ?? 'accessory';
  const sub = path[1] ?? '';
  if (top === 'processors') return DROID_PART_CATEGORIES.processor;
  if (top === 'processorEnhancements') return DROID_PART_CATEGORIES.processorEnhancement;
  if (top === 'locomotion') return DROID_PART_CATEGORIES.locomotion;
  if (top === 'locomotionEnhancements') return DROID_PART_CATEGORIES.locomotionEnhancement;
  if (top === 'appendages') return DROID_PART_CATEGORIES.appendage;
  if (top === 'appendageEnhancements') return DROID_PART_CATEGORIES.appendageEnhancement;
  if (top === 'accessories') {
    if (sub === 'armor') return DROID_PART_CATEGORIES.armor;
    if (sub === 'communications') return DROID_PART_CATEGORIES.communications;
    if (sub === 'hardenedsystems') return DROID_PART_CATEGORIES.hardenedSystems;
    if (sub === 'sensors') return DROID_PART_CATEGORIES.sensor;
    if (sub === 'shields') return DROID_PART_CATEGORIES.shield;
    if (sub === 'translators') return DROID_PART_CATEGORIES.translator;
    return DROID_PART_CATEGORIES.miscellaneous;
  }
  return DROID_PART_CATEGORIES.accessory;
}

function defaultSlotForCategory(category) {
  return {
    processor: 'processor',
    processorEnhancement: 'processorAux',
    locomotion: 'locomotion',
    locomotionEnhancement: 'locomotionEnhancement',
    appendage: 'appendage',
    appendageEnhancement: 'appendageEnhancement',
    armor: 'armor',
    hardenedSystems: 'armor',
    communications: 'communications',
    sensor: 'sensor',
    shield: 'shield',
    translator: 'translator',
    weapon: 'weapon',
    station: 'station',
    miscellaneous: 'miscellaneous',
    accessory: 'miscellaneous'
  }[category] ?? 'miscellaneous';
}

function coerceArray(value) {
  if (Array.isArray(value)) return value.filter(v => v !== undefined && v !== null);
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function normalizeRawDefinition(raw, path = []) {
  const id = slugify(raw?.id || raw?.name);
  if (!id) return null;
  const overlay = DROID_RULE_OVERLAYS[id] ?? {};
  const category = overlay.category ?? raw?.category ?? categoryFromPath(path);
  const slot = overlay.slot ?? raw?.slot ?? defaultSlotForCategory(category);
  const asWeapon = overlay.asWeapon ?? raw?.weaponStats ?? raw?.asWeapon ?? null;
  const effects = [
    ...coerceArray(raw?.effects),
    ...coerceArray(overlay.effects)
  ];

  return Object.freeze({
    id,
    key: id,
    name: raw?.name ?? id,
    category,
    subcategory: path[1] ?? raw?.category ?? '',
    slot,
    description: overlay.description ?? raw?.description ?? '',
    rulesText: overlay.rulesText ?? raw?.rulesText ?? raw?.notes ?? '',
    source: raw?.source ?? raw?.referenceBook ?? '',
    cost: normalizeCost(raw?.cost ?? overlay.cost),
    costFormula: typeof raw?.cost === 'function' ? 'formula' : (raw?.costFormula ? 'formula' : ''),
    weight: normalizeWeight(raw?.weight ?? overlay.weight),
    availability: normalizeAvailability(raw?.availability ?? overlay.availability),
    required: overlay.required === true || raw?.required === true || id === 'heuristic' || id === 'walking' || id === 'hand',
    requiredForPc: overlay.requiredForPc === true,
    requiresAny: coerceArray(overlay.requiresAny ?? raw?.requiredSystems ?? raw?.requires ?? raw?.requiredLocomotion ?? raw?.requiresLocomtion),
    blocks: coerceArray(overlay.blocks),
    blocksSkills: coerceArray(overlay.blocksSkills),
    traits: coerceArray(overlay.traits ?? raw?.traits),
    comboTags: coerceArray(overlay.comboTags),
    comboEffects: coerceArray(overlay.comboEffects),
    grants: overlay.grants ?? raw?.grants ?? {},
    effects,
    restrictions: coerceArray(raw?.restrictions),
    features: coerceArray(raw?.features),
    appendageType: overlay.appendageType ?? raw?.appendageType ?? raw?.role ?? '',
    location: raw?.location ?? raw?.slotKey ?? '',
    activeLimit: overlay.activeLimit ?? raw?.activeLimit ?? null,
    maxInstalled: overlay.maxInstalled ?? raw?.maxInstalled ?? null,
    activationMode: overlay.activationMode ?? raw?.activationMode ?? '',
    asWeapon: asWeapon ? Object.freeze({ ...asWeapon, countsAsWeapon: asWeapon.countsAsWeapon !== false }) : null,
    countsAsWeapon: Boolean(asWeapon?.countsAsWeapon !== false && asWeapon),
    selfDestruct: Boolean(asWeapon?.selfDestruct),
    sourcePath: path.join('.')
  });
}

function flattenDroidSystems() {
  const out = [];
  const walk = (value, path = []) => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === 'object' && (entry.id || entry.name)) {
          const normalized = normalizeRawDefinition(entry, path);
          if (normalized) out.push(normalized);
        } else {
          walk(entry, path);
        }
      }
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, [...path, key]);
    }
  };
  walk(DROID_SYSTEMS);

  for (const extra of EXTRA_DROID_PARTS) {
    const normalized = normalizeRawDefinition(extra, [extra.category ?? 'accessories']);
    if (normalized) out.push(normalized);
  }

  const byId = new Map();
  for (const def of out) byId.set(def.id, def);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const DROID_PART_DEFINITIONS = Object.freeze(flattenDroidSystems());
export const DROID_PART_DEFINITION_MAP = Object.freeze(Object.fromEntries(DROID_PART_DEFINITIONS.map(def => [def.id, def])));

export function getDroidPartDefinition(idOrName) {
  const key = slugify(idOrName);
  if (!key) return null;
  return DROID_PART_DEFINITION_MAP[key] ?? DROID_PART_DEFINITIONS.find(def => slugify(def.name) === key) ?? null;
}

export function getDroidPartsBySlot(slot) {
  return DROID_PART_DEFINITIONS.filter(def => def.slot === slot);
}

export function normalizeDroidPartSource(source, options = {}) {
  const system = source?.system ?? source ?? {};
  const partData = system?.droidPart ?? {};
  const id = partData.id || system.id || source?.id || source?._id || source?.name || system.name;
  const def = getDroidPartDefinition(id) || getDroidPartDefinition(source?.name) || null;
  const name = source?.name || system.name || def?.name || String(id ?? 'Droid Part');
  const normalizedId = def?.id || slugify(id || name);
  const category = partData.category || def?.category || options.category || 'accessory';
  const slot = partData.slot || def?.slot || options.slot || defaultSlotForCategory(category);
  const asWeapon = partData.weapon?.countsAsWeapon ? partData.weapon : (def?.asWeapon ?? null);

  return {
    id: normalizedId,
    itemId: source?.id ?? source?._id ?? null,
    name,
    img: source?.img ?? null,
    type: source?.type ?? options.type ?? '',
    category,
    subcategory: partData.subcategory || def?.subcategory || '',
    slot,
    slotKey: partData.slotKey || system.slotKey || system.location || def?.location || options.slotKey || '',
    location: partData.location || system.location || options.location || '',
    active: partData.active ?? system.active ?? options.active ?? true,
    integrated: partData.integrated ?? system.integrated ?? source?.flags?.swse?.integrated ?? true,
    required: partData.required ?? def?.required ?? false,
    description: partData.description || system.description || def?.description || '',
    rulesText: partData.rulesText || def?.rulesText || '',
    cost: normalizeCost(system.cost ?? system.price ?? partData.cost ?? def?.cost),
    weight: normalizeWeight(system.weight ?? partData.weight ?? def?.weight),
    availability: normalizeAvailability(system.availability ?? system.restriction ?? partData.availability ?? def?.availability),
    effects: coerceArray(partData.effects).length ? coerceArray(partData.effects) : coerceArray(def?.effects),
    grants: { ...(def?.grants ?? {}), ...(partData.grants ?? {}) },
    requiresAny: coerceArray(partData.requiresAny).length ? coerceArray(partData.requiresAny) : coerceArray(def?.requiresAny),
    comboTags: coerceArray(partData.comboTags).length ? coerceArray(partData.comboTags) : coerceArray(def?.comboTags),
    comboEffects: coerceArray(def?.comboEffects),
    traits: coerceArray(partData.traits).length ? coerceArray(partData.traits) : coerceArray(def?.traits),
    asWeapon,
    countsAsWeapon: Boolean(asWeapon?.countsAsWeapon || partData.weapon?.countsAsWeapon || def?.countsAsWeapon),
    selfDestruct: Boolean(asWeapon?.selfDestruct || def?.selfDestruct),
    raw: source
  };
}

export function isDroidPartWeapon(partOrSource) {
  const part = partOrSource?.category ? partOrSource : normalizeDroidPartSource(partOrSource);
  if (part?.countsAsWeapon || part?.selfDestruct) return true;
  const name = slugify(part?.name);
  return /weapon|taser|launcher|stunner|self-destruct|torch|rocket-arm|projectile/.test(name);
}

export function getSelfDestructDamage(actorOrSize, options = {}) {
  const size = typeof actorOrSize === 'string'
    ? actorOrSize.toLowerCase()
    : String(actorOrSize?.system?.droidSystems?.size ?? actorOrSize?.system?.size ?? 'medium').toLowerCase();
  const effectiveSize = options.miniaturized === true ? sizeShift(size, 2) : size;
  const table = options.miniaturized === true
    ? { diminutive: '4d6', tiny: '6d6', small: '8d6', medium: '10d6', large: '20d6', huge: '20d6', gargantuan: '20d6', colossal: '20d6' }
    : { small: '4d6', medium: '6d6', large: '8d6', huge: '10d6', gargantuan: '20d6', colossal: '20d6' };
  return table[effectiveSize] ?? table[size] ?? (options.miniaturized ? '10d6' : '6d6');
}

function sizeShift(size, steps) {
  const idx = SIZE_ORDER.indexOf(String(size ?? 'medium').toLowerCase());
  if (idx < 0) return 'medium';
  return SIZE_ORDER[Math.min(SIZE_ORDER.length - 1, idx + steps)];
}

export function resolveDroidPartPrerequisites(parts = []) {
  const ids = new Set(parts.map(part => part.id).filter(Boolean));
  const traits = new Set(parts.flatMap(part => part.traits ?? []));
  const messages = [];

  for (const part of parts) {
    for (const req of part.requiresAny ?? []) {
      if (!ids.has(req) && !traits.has(req)) {
        messages.push({ severity: 'warning', partId: part.id, partName: part.name, message: `${part.name} requires ${req}.` });
      }
    }
  }

  for (const part of parts) {
    for (const combo of part.comboEffects ?? []) {
      const required = combo.requires ?? [];
      if (required.every(req => ids.has(req) || traits.has(req))) {
        messages.push({ severity: 'info', partId: part.id, partName: part.name, message: `${part.name} secondary benefit active (${required.join(' + ')}).` });
      }
    }
  }

  return messages;
}

export function resolveProcessorSlots(parts = []) {
  const processors = parts.filter(part => part.slot === 'processor' || part.category === 'processor');
  const extraSlots = parts.reduce((sum, part) => sum + (Number(part.grants?.processorSlots ?? 0) || 0), 0);
  const capacity = Math.max(1, 1 + extraSlots);
  return Array.from({ length: capacity }, (_, index) => {
    const installed = processors[index] ?? null;
    return {
      key: index === 0 ? 'primaryProcessor' : `backupProcessor${index}`,
      label: index === 0 ? 'Active Processor' : `Reserve Processor ${index}`,
      active: index === 0,
      installed,
      empty: !installed,
      lockedReason: index > 0 ? 'Unlocked by Backup Processor; only one processor can be active at a time.' : ''
    };
  });
}

export function resolveAppendageSlots(parts = [], existingSlots = []) {
  const appendages = parts.filter(part => part.slot === 'appendage' || part.category === 'appendage');
  const configured = Array.isArray(existingSlots) ? existingSlots : [];
  const slotDefs = [...BASE_APPENDAGE_SLOTS];

  for (const slot of configured) {
    const key = slot?.key || slot?.slotKey || slot?.location;
    if (key && !slotDefs.some(def => def.key === key)) {
      slotDefs.push({ key, label: slot.label || key, required: false, defaultName: 'Empty appendage mount' });
    }
  }

  for (const part of appendages) {
    const key = part.slotKey || part.location;
    if (key && !slotDefs.some(def => def.key === key)) {
      slotDefs.push({ key, label: toTitle(key), required: false, defaultName: 'Empty appendage mount' });
    }
  }

  const used = new Set();
  return slotDefs.map((slot, index) => {
    let installed = null;
    if (slot.key) installed = appendages.find(part => !used.has(part) && (part.slotKey === slot.key || part.location === slot.key)) ?? null;
    if (!installed) installed = appendages.find(part => !used.has(part)) ?? null;
    if (installed) used.add(installed);
    return {
      ...slot,
      index,
      installed,
      empty: !installed,
      defaultName: slot.defaultName || 'Empty appendage mount'
    };
  });
}

function toTitle(value) {
  return String(value ?? '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]+/g, ' ')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

export function collectDroidPartEffectsFromActor(actor) {
  if (!actor || actor.type !== 'droid') return [];
  const parts = [];
  const ds = actor.system?.droidSystems ?? {};
  const add = (entry, options = {}) => {
    const part = normalizeDroidPartSource(entry, options);
    if (part?.id) parts.push(part);
  };

  if (ds.processor?.id || ds.processor?.name) add(ds.processor, { category: 'processor', slot: 'processor' });
  if (Array.isArray(ds.processors)) ds.processors.forEach(p => add(p, { category: 'processor', slot: 'processor' }));
  if (ds.locomotion?.id || ds.locomotion?.name || ds.locomotion?.type) add(ds.locomotion, { category: 'locomotion', slot: 'locomotion' });
  for (const key of ['appendages', 'accessories', 'sensors', 'weapons', 'armor']) {
    const value = ds[key];
    if (Array.isArray(value)) value.forEach(v => add(v, { category: key === 'weapons' ? 'weapon' : key }));
    else if (value && typeof value === 'object' && (value.id || value.name)) add(value, { category: key });
  }

  const itemArray = typeof actor.items?.toObject === 'function'
    ? actor.items.contents ?? [...actor.items]
    : Array.isArray(actor.items) ? actor.items : [];
  for (const item of itemArray) {
    if (item?.system?.droidPart?.enabled || item?.system?.integrated || item?.flags?.swse?.integrated) {
      add(item, { type: item.type });
    }
  }

  const effectParts = [];
  const prereqMessages = resolveDroidPartPrerequisites(parts);
  const activeComboMessages = prereqMessages.filter(msg => msg.severity === 'info');

  for (const part of parts) {
    for (const effect of part.effects ?? []) {
      if (!effect?.target) continue;
      effectParts.push({ ...effect, sourceId: part.id, sourceName: part.name, description: effect.label || `${part.name}: ${effect.target}` });
    }
    for (const combo of part.comboEffects ?? []) {
      const required = combo.requires ?? [];
      const isActive = activeComboMessages.some(msg => msg.partId === part.id && required.every(req => msg.message.includes(req)));
      if (!isActive) continue;
      for (const effect of combo.effects ?? []) {
        if (!effect?.target) continue;
        effectParts.push({ ...effect, sourceId: part.id, sourceName: part.name, description: effect.label || `${part.name}: ${effect.target}` });
      }
    }
  }

  return effectParts;
}

export function makeDroidPartUseChatHtml(actor, part, actionLabel = 'uses') {
  const safeName = foundry.utils.escapeHTML?.(actor?.name ?? 'Droid') ?? actor?.name ?? 'Droid';
  const partName = foundry.utils.escapeHTML?.(part?.name ?? 'Droid Part') ?? part?.name ?? 'Droid Part';
  const desc = foundry.utils.escapeHTML?.(part?.rulesText || part?.description || '') ?? (part?.rulesText || part?.description || '');
  const weapon = part?.asWeapon;
  const weaponLine = weapon?.countsAsWeapon
    ? `<p><strong>Weapon:</strong> ${foundry.utils.escapeHTML?.(weapon.damage || weapon.special || 'Special') ?? (weapon.damage || weapon.special || 'Special')}</p>`
    : '';
  return `
    <div class="swse-chat-card swse-droid-part-card">
      <h3>${safeName} ${actionLabel} ${partName}</h3>
      ${desc ? `<p>${desc}</p>` : ''}
      ${weaponLine}
    </div>
  `;
}
