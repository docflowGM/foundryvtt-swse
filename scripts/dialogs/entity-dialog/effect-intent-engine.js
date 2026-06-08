/**
 * SWSE Entity Effect Intent Engine
 *
 * User-facing Active Effects are authored as plain-English "intents" first:
 *   When equipped, self gains +2 Reflex Defense until deactivated.
 *
 * The intent is stored on the ActiveEffect flag so the UI can explain it and
 * the ModifierEngine can consume it without asking users to write raw Foundry
 * attribute paths. Raw ActiveEffect changes are still preserved for Advanced
 * editing and complex power-user cases.
 */

import { ModifierType } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js";

export const SWSE_EFFECT_FLAG_SCOPE = 'foundryvtt-swse';
export const SWSE_EFFECT_INTENT_KEY = 'effectIntent';
export const SWSE_EFFECT_LIFECYCLE_KEY = 'effectLifecycle';

export const EFFECT_APPLICATIONS = Object.freeze([
  { value: 'always', label: 'Always / while owned', phrase: 'while owned' },
  { value: 'equipped', label: 'While equipped', phrase: 'while equipped' },
  { value: 'activated', label: 'While activated', phrase: 'while activated' },
  { value: 'carried', label: 'While carried', phrase: 'while carried' },
  { value: 'manual', label: 'Manual toggle', phrase: 'when manually enabled' }
]);

export const EFFECT_SCOPES = Object.freeze([
  { value: 'self', label: 'Self / owning actor' },
  { value: 'target', label: 'Target', manualOnly: true },
  { value: 'area', label: 'Area / allies', manualOnly: true },
  { value: 'item', label: 'This item only', contextual: true }
]);

export const EFFECT_OPERATIONS = Object.freeze([
  { value: 'increase', label: 'Increase / grant bonus', sign: 1 },
  { value: 'decrease', label: 'Decrease / apply penalty', sign: -1 }
]);

export const EFFECT_CATEGORIES = Object.freeze([
  { value: 'defense', label: 'Defense', needsTarget: true },
  { value: 'skill', label: 'Skill', needsTarget: true },
  { value: 'ability', label: 'Ability Score', needsTarget: true },
  { value: 'attack', label: 'Attack Rolls', needsTarget: false },
  { value: 'damage', label: 'Damage Rolls', needsTarget: false },
  { value: 'force', label: 'Force Power Checks', needsTarget: false },
  { value: 'speed', label: 'Speed', needsTarget: false },
  { value: 'threshold', label: 'Damage Threshold', needsTarget: false },
  { value: 'initiative', label: 'Initiative', needsTarget: false },
  { value: 'hp', label: 'Maximum Hit Points', needsTarget: false },
  { value: 'condition', label: 'Condition / Status', needsTarget: true }
]);

export const DEFENSE_TARGETS = Object.freeze([
  { value: 'reflex', label: 'Reflex Defense' },
  { value: 'fortitude', label: 'Fortitude Defense' },
  { value: 'will', label: 'Will Defense' },
  { value: 'damageThreshold', label: 'Damage Threshold' }
]);

export const ABILITY_TARGETS = Object.freeze([
  { value: 'str', label: 'Strength' },
  { value: 'dex', label: 'Dexterity' },
  { value: 'con', label: 'Constitution' },
  { value: 'int', label: 'Intelligence' },
  { value: 'wis', label: 'Wisdom' },
  { value: 'cha', label: 'Charisma' }
]);

export const BONUS_TYPES = Object.freeze([
  { value: ModifierType.UNTYPED, label: 'Untyped' },
  { value: ModifierType.CIRCUMSTANCE, label: 'Circumstance' },
  { value: ModifierType.COMPETENCE, label: 'Competence' },
  { value: ModifierType.ENHANCEMENT, label: 'Enhancement' },
  { value: ModifierType.INSIGHT, label: 'Insight' },
  { value: ModifierType.MORALE, label: 'Morale' },
  { value: ModifierType.DODGE, label: 'Dodge' },
  { value: ModifierType.PENALTY, label: 'Penalty' }
]);


export const SKILL_TARGETS = Object.freeze([
  { value: 'acrobatics', label: 'Acrobatics' },
  { value: 'climb', label: 'Climb' },
  { value: 'deception', label: 'Deception' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'gather-information', label: 'Gather Information' },
  { value: 'initiative', label: 'Initiative' },
  { value: 'jump', label: 'Jump' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'mechanics', label: 'Mechanics' },
  { value: 'perception', label: 'Perception' },
  { value: 'persuasion', label: 'Persuasion' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'ride', label: 'Ride' },
  { value: 'stealth', label: 'Stealth' },
  { value: 'survival', label: 'Survival' },
  { value: 'swim', label: 'Swim' },
  { value: 'treat-injury', label: 'Treat Injury' },
  { value: 'use-computer', label: 'Use Computer' },
  { value: 'use-the-force', label: 'Use the Force' }
]);

export const DAMAGE_TYPE_TERMS = Object.freeze([
  { value: 'energy', label: 'Energy' },
  { value: 'kinetic', label: 'Kinetic' },
  { value: 'slashing', label: 'Slashing' },
  { value: 'piercing', label: 'Piercing' },
  { value: 'bludgeoning', label: 'Bludgeoning' },
  { value: 'ion', label: 'Ion' },
  { value: 'fire', label: 'Fire' },
  { value: 'cold', label: 'Cold' },
  { value: 'acid', label: 'Acid' },
  { value: 'sonic', label: 'Sonic' }
]);


export const CONDITION_TARGETS = Object.freeze([
  { value: 'prone', label: 'Prone' },
  { value: 'flat-footed', label: 'Flat-Footed' },
  { value: 'stunned', label: 'Stunned' },
  { value: 'helpless', label: 'Helpless' },
  { value: 'concealed', label: 'Concealed' },
  { value: 'invisible', label: 'Invisible' },
  { value: 'poisoned', label: 'Poisoned' },
  { value: 'diseased', label: 'Diseased' },
  { value: 'custom-status', label: 'Custom Status' }
]);

export const EFFECT_FILTER_TYPES = Object.freeze([
  { value: 'all', label: 'All matching rolls / stats', automation: 'direct' },
  { value: 'this-item', label: 'Only this item', automation: 'contextual' },
  { value: 'weapon-group', label: 'Weapon group', automation: 'contextual' },
  { value: 'weapon-category', label: 'Weapon category', automation: 'contextual' },
  { value: 'skill', label: 'Specific skill', automation: 'direct' },
  { value: 'damage-type', label: 'Damage type', automation: 'contextual' },
  { value: 'force-descriptor', label: 'Force descriptor', automation: 'contextual' },
  { value: 'custom', label: 'Custom / GM condition', automation: 'reminder' }
]);

export const WEAPON_GROUP_TERMS = Object.freeze([
  { value: 'pistols', label: 'Pistols' },
  { value: 'rifles', label: 'Rifles' },
  { value: 'heavy-weapons', label: 'Heavy Weapons' },
  { value: 'simple-weapons', label: 'Simple Weapons' },
  { value: 'advanced-melee', label: 'Advanced Melee' },
  { value: 'lightsabers', label: 'Lightsabers' },
  { value: 'exotic-weapons', label: 'Exotic Weapons' }
]);

export const WEAPON_CATEGORY_TERMS = Object.freeze([
  { value: 'melee', label: 'Melee Attacks' },
  { value: 'ranged', label: 'Ranged Attacks' },
  { value: 'thrown', label: 'Thrown Weapons' },
  { value: 'area', label: 'Area Attacks' },
  { value: 'autofire', label: 'Autofire Attacks' }
]);

export const EFFECT_PRESETS = Object.freeze([
  {
    id: 'defense-reflex-equipped',
    label: 'Defense Bonus',
    description: 'Common armor, feat, talent, or item bonus to one defense.',
    intent: { application: 'equipped', scope: 'self', operation: 'increase', category: 'defense', target: 'reflex', amount: 1, bonusType: ModifierType.UNTYPED, duration: 'until-deactivated', transfer: true, filterType: 'all', filterValue: '' }
  },
  {
    id: 'skill-competence-equipped',
    label: 'Skill Bonus',
    description: 'A bonus to one skill while the item/effect applies.',
    intent: { application: 'equipped', scope: 'self', operation: 'increase', category: 'skill', target: 'mechanics', amount: 2, bonusType: ModifierType.COMPETENCE, duration: 'until-deactivated', transfer: true, filterType: 'all', filterValue: '' }
  },
  {
    id: 'ability-enhancement-equipped',
    label: 'Ability Bonus',
    description: 'A direct increase to an ability score.',
    intent: { application: 'equipped', scope: 'self', operation: 'increase', category: 'ability', target: 'str', amount: 2, bonusType: ModifierType.ENHANCEMENT, duration: 'until-deactivated', transfer: true, filterType: 'all', filterValue: '' }
  },
  {
    id: 'attack-circumstance-activated',
    label: 'Attack Bonus',
    description: 'A bonus to attack rolls while activated or equipped.',
    intent: { application: 'activated', scope: 'self', operation: 'increase', category: 'attack', target: 'all', amount: 1, bonusType: ModifierType.CIRCUMSTANCE, duration: 'until-deactivated', transfer: true, filterType: 'all', filterValue: '' }
  },
  {
    id: 'damage-circumstance-activated',
    label: 'Damage Bonus',
    description: 'A bonus to damage rolls while activated or equipped.',
    intent: { application: 'activated', scope: 'self', operation: 'increase', category: 'damage', target: 'all', amount: 1, bonusType: ModifierType.CIRCUMSTANCE, duration: 'until-deactivated', transfer: true, filterType: 'all', filterValue: '' }
  },
  {
    id: 'force-power-check-activated',
    label: 'Force Power Check',
    description: 'A bonus to Force Power activation checks, separate from general Use the Force skill bonuses.',
    intent: { application: 'always', scope: 'self', operation: 'increase', category: 'force', target: 'activation', amount: 1, bonusType: ModifierType.CIRCUMSTANCE, duration: 'until-deactivated', transfer: true, filterType: 'all', filterValue: '' }
  },
  {
    id: 'threshold-equipped',
    label: 'Damage Threshold',
    description: 'Increase or decrease the actor damage threshold.',
    intent: { application: 'equipped', scope: 'self', operation: 'increase', category: 'threshold', target: 'damageThreshold', amount: 1, bonusType: ModifierType.UNTYPED, duration: 'until-deactivated', transfer: true, filterType: 'all', filterValue: '' }
  },
  {
    id: 'armor-check-penalty-note',
    label: 'Armor Penalty Note',
    description: 'A reminder-style penalty for GM adjudicated armor effects.',
    intent: { application: 'equipped', scope: 'self', operation: 'decrease', category: 'skill', target: 'armor-check-skills', amount: 1, bonusType: ModifierType.PENALTY, duration: 'until-deactivated', transfer: false, note: 'Use for custom armor penalty reminders when no exact automation exists.' }
  },
  {
    id: 'condition-status-reminder',
    label: 'Condition / Status',
    description: 'A visible status marker such as prone, stunned, concealed, or a custom GM condition.',
    intent: { application: 'manual', scope: 'self', operation: 'increase', category: 'condition', target: 'prone', amount: 1, bonusType: ModifierType.UNTYPED, duration: 'until-deactivated', transfer: true, filterType: 'all', filterValue: '', note: 'Status marker. Use combat status controls for statuses that have dedicated combat automation.' }
  },
  {
    id: 'area-reminder',
    label: 'Area / Aura Reminder',
    description: 'A visible declaration for effects that help allies or affect an area.',
    intent: { application: 'manual', scope: 'area', operation: 'increase', category: 'attack', target: 'allies', amount: 1, bonusType: ModifierType.CIRCUMSTANCE, duration: 'encounter', transfer: false, filterType: 'all', filterValue: '', note: 'Declaration only. GM confirms affected tokens.' }
  }
]);

export const EFFECT_TERM_LIBRARY = Object.freeze([
  {
    id: 'triggers',
    label: 'If / When',
    terms: EFFECT_APPLICATIONS.map(opt => ({ label: opt.label, field: 'application', value: opt.value }))
  },
  {
    id: 'who',
    label: 'Who / Scope',
    terms: EFFECT_SCOPES.map(opt => ({ label: opt.label, field: 'scope', value: opt.value }))
  },
  {
    id: 'operation',
    label: 'Bonuses / Negatives',
    terms: [
      { label: 'Increase / Bonus', field: 'operation', value: 'increase' },
      { label: 'Decrease / Penalty', field: 'operation', value: 'decrease' },
      ...BONUS_TYPES.map(opt => ({ label: `${opt.label} type`, field: 'bonusType', value: opt.value }))
    ]
  },
  {
    id: 'defenses',
    label: 'Defenses',
    terms: DEFENSE_TARGETS.map(opt => ({ label: opt.label, field: 'target', value: opt.value, category: opt.value === 'damageThreshold' ? 'threshold' : 'defense' }))
  },
  {
    id: 'attributes',
    label: 'Attributes',
    terms: ABILITY_TARGETS.map(opt => ({ label: opt.label, field: 'target', value: opt.value, category: 'ability' }))
  },
  {
    id: 'skills',
    label: 'Skills',
    terms: SKILL_TARGETS.map(opt => ({ label: opt.label, field: 'target', value: opt.value, category: 'skill' }))
  },
  {
    id: 'combat-stats',
    label: 'Combat Stats',
    terms: [
      { label: 'Attack Rolls', field: 'category', value: 'attack', target: 'all' },
      { label: 'Damage Rolls', field: 'category', value: 'damage', target: 'all' },
      { label: 'Speed', field: 'category', value: 'speed', target: 'base' },
      { label: 'Initiative', field: 'category', value: 'initiative', target: 'total' },
      { label: 'Maximum Hit Points', field: 'category', value: 'hp', target: 'max' }
    ]
  },
  {
    id: 'damage-types',
    label: 'Damage Types',
    terms: DAMAGE_TYPE_TERMS.map(opt => ({ label: opt.label, field: 'filterValue', value: opt.value, filterType: 'damage-type', category: 'damage' }))
  },
  {
    id: 'force',
    label: 'Force / UTF',
    terms: [
      { label: 'Force Power Checks', field: 'category', value: 'force', target: 'activation' },
      { label: 'Use the Force skill', field: 'target', value: 'use-the-force', category: 'skill', filterType: 'skill', filterValue: 'use-the-force' },
      { label: 'Light Side powers', field: 'filterValue', value: 'light', filterType: 'force-descriptor', category: 'force' },
      { label: 'Dark Side powers', field: 'filterValue', value: 'dark', filterType: 'force-descriptor', category: 'force' },
      { label: 'Telekinetic powers', field: 'filterValue', value: 'telekinetic', filterType: 'force-descriptor', category: 'force' },
      { label: 'Mind-affecting powers', field: 'filterValue', value: 'mind', filterType: 'force-descriptor', category: 'force' }
    ]
  },
  {
    id: 'targeting',
    label: 'Targeting / Scope Filters',
    terms: [
      { label: 'All matching rolls', field: 'filterType', value: 'all', filterValue: '' },
      { label: 'Only this item', field: 'filterType', value: 'this-item', filterValue: '' },
      ...WEAPON_GROUP_TERMS.map(opt => ({ label: opt.label, field: 'filterValue', value: opt.value, filterType: 'weapon-group', category: 'attack' })),
      ...WEAPON_CATEGORY_TERMS.map(opt => ({ label: opt.label, field: 'filterValue', value: opt.value, filterType: 'weapon-category', category: 'attack' })),
      ...SKILL_TARGETS.map(opt => ({ label: `Only ${opt.label}`, field: 'filterValue', value: opt.value, filterType: 'skill', category: 'skill', target: opt.value })),
      ...DAMAGE_TYPE_TERMS.map(opt => ({ label: `${opt.label} damage only`, field: 'filterValue', value: opt.value, filterType: 'damage-type', category: 'damage' })),
      { label: 'Light Force powers only', field: 'filterValue', value: 'light', filterType: 'force-descriptor', category: 'force' },
      { label: 'Dark Force powers only', field: 'filterValue', value: 'dark', filterType: 'force-descriptor', category: 'force' },
      { label: 'Telekinetic Force powers only', field: 'filterValue', value: 'telekinetic', filterType: 'force-descriptor', category: 'force' },
      { label: 'Custom GM condition', field: 'filterType', value: 'custom', filterValue: '' }
    ]
  },
  {
    id: 'conditions',
    label: 'Conditions / Status',
    terms: CONDITION_TARGETS.map(opt => ({ label: opt.label, field: 'target', value: opt.value, category: 'condition' }))
  },
  {
    id: 'durations',
    label: 'Duration',
    terms: [
      { label: 'Until deactivated', field: 'duration', value: 'until-deactivated' },
      { label: 'Encounter', field: 'duration', value: 'encounter' },
      { label: '1 round', field: 'duration', value: '1-round' },
      { label: '2 rounds', field: 'duration', value: '2-rounds' },
      { label: '3 rounds', field: 'duration', value: '3-rounds' },
      { label: 'Until start of next turn', field: 'duration', value: 'until-start-next-turn' },
      { label: 'Until end of next turn', field: 'duration', value: 'until-end-next-turn' },
      { label: 'Permanent', field: 'duration', value: 'permanent' }
    ]
  }
]);

const DEFAULT_INTENT = Object.freeze({
  version: 1,
  mode: 'basic',
  application: 'equipped',
  activeState: 'enabled',
  scope: 'self',
  operation: 'increase',
  category: 'defense',
  target: 'reflex',
  amount: 1,
  bonusType: ModifierType.UNTYPED,
  duration: 'until-deactivated',
  transfer: true,
  filterType: 'all',
  filterValue: '',
  note: ''
});



function safeGetProperty(object, path) {
  if (!object || !path) return undefined;
  if (foundry?.utils?.getProperty) return foundry.utils.getProperty(object, path);
  return String(path).split('.').reduce((value, part) => value?.[part], object);
}

function firstNumericProperty(object, paths = []) {
  for (const path of paths) {
    const value = safeGetProperty(object, path);
    const number = Number(value);
    if (Number.isFinite(number)) return { value: number, path };
  }
  return null;
}

function rawChangeModeLabel(mode) {
  const number = Number(mode ?? 2);
  if (number === 2) return 'Add';
  if (number === 5) return 'Override';
  if (number === 1) return 'Multiply';
  if (number === 0) return 'Custom';
  if (number === 3) return 'Downgrade';
  if (number === 4) return 'Upgrade';
  return `Mode ${number}`;
}

function normalizeRawPath(value = '') {
  return String(value || '')
    .trim()
    .replace(/\[(.*?)\]/g, '.$1')
    .replace(/\s+/g, '')
    .replace(/_/g, '-')
    .toLowerCase();
}

function normalizeSkillId(value = '') {
  const compact = normalizeKey(String(value || '').replace(/([a-z])([A-Z])/g, '$1-$2'));
  const aliases = {
    acrobatics: 'acrobatics',
    climb: 'climb',
    deception: 'deception',
    endurance: 'endurance',
    gatherinformation: 'gather-information',
    'gather-information': 'gather-information',
    initiative: 'initiative',
    jump: 'jump',
    knowledge: 'knowledge',
    mechanics: 'mechanics',
    perception: 'perception',
    persuasion: 'persuasion',
    pilot: 'pilot',
    ride: 'ride',
    stealth: 'stealth',
    survival: 'survival',
    swim: 'swim',
    treatinjury: 'treat-injury',
    'treat-injury': 'treat-injury',
    usecomputer: 'use-computer',
    'use-computer': 'use-computer',
    usetheforce: 'use-the-force',
    'use-the-force': 'use-the-force'
  };
  return aliases[compact] ?? compact;
}

function canonicalSkillTarget(value = '') {
  const normalized = normalizeSkillId(value);
  const aliases = {
    'gather-information': 'gatherInformation',
    'treat-injury': 'treatInjury',
    'use-computer': 'useComputer',
    'use-the-force': 'useTheForce'
  };
  return aliases[normalized] ?? normalized;
}

function forceDescriptorMatches(wanted = '', context = {}) {
  const target = normalizeKey(wanted);
  if (!target) return false;
  const raw = [
    context.forceDescriptor,
    context.descriptor,
    ...(Array.isArray(context.forceDescriptors) ? context.forceDescriptors : []),
    ...(Array.isArray(context.descriptors) ? context.descriptors : []),
    ...(Array.isArray(context.tags) ? context.tags : []),
    context.powerDescriptor,
    context.discipline
  ].map(normalizeKey).filter(Boolean);
  if (raw.includes(target)) return true;
  if (target === 'telekinetic') return raw.some(value => ['telekinetic', 'telekinesis', 'tk', 'move-object'].includes(value));
  if (target === 'mind') return raw.some(value => ['mind', 'telepathic', 'telepathy', 'mind-affecting', 'affect-mind'].includes(value));
  if (target === 'light') return raw.some(value => ['light', 'light-side', 'healing', 'control', 'sense', 'alter'].includes(value));
  if (target === 'dark') return raw.some(value => ['dark', 'dark-side'].includes(value));
  return false;
}

function findKnownSkillInPath(path = '') {
  const normalized = normalizeRawPath(path);
  for (const skill of SKILL_TARGETS) {
    const value = normalizeSkillId(skill.value);
    const raw = value.replace(/-/g, '');
    if (normalized.includes(`skills.${value}`) || normalized.includes(`skill.${value}`)) return value;
    if (normalized.includes(`skills.${raw}`) || normalized.includes(`skill.${raw}`)) return value;
  }
  const match = normalized.match(/(?:skills?|derived\.skills?)\.([a-z0-9-]+)/);
  return match ? normalizeSkillId(match[1]) : '';
}

function inferIntentTargetFromRawPath(path = '') {
  const normalized = normalizeRawPath(path);
  if (!normalized) return null;

  if (/damage.?threshold|threshold|damage\.threshold/.test(normalized)) {
    return { category: 'threshold', target: 'damageThreshold', confidence: 'high', label: 'Damage Threshold' };
  }

  if (/(defense|defenses|derived\.defenses|attributes\.defenses)/.test(normalized)) {
    if (/reflex|\.ref\.|\.ref$/.test(normalized)) return { category: 'defense', target: 'reflex', confidence: 'high', label: 'Reflex Defense' };
    if (/fortitude|\.fort\.|\.fort$/.test(normalized)) return { category: 'defense', target: 'fortitude', confidence: 'high', label: 'Fortitude Defense' };
    if (/will/.test(normalized)) return { category: 'defense', target: 'will', confidence: 'high', label: 'Will Defense' };
  }

  const skill = findKnownSkillInPath(path);
  if (skill) return { category: 'skill', target: skill, confidence: 'high', label: filterValueLabel('skill', skill) || skill };

  for (const ability of ABILITY_TARGETS) {
    const value = normalizeKey(ability.value);
    if (normalized.includes(`attributes.${value}`) || normalized.includes(`abilities.${value}`) || normalized.includes(`ability.${value}`)) {
      return { category: 'ability', target: value, confidence: 'high', label: ability.label };
    }
  }

  if (/initiative/.test(normalized)) return { category: 'initiative', target: 'total', confidence: 'medium', label: 'Initiative' };
  if (/(speed|movement|move)/.test(normalized)) return { category: 'speed', target: 'base', confidence: 'medium', label: 'Speed' };
  if (/(hp|maxhp|hit.?points|health)/.test(normalized)) return { category: 'hp', target: 'max', confidence: 'medium', label: 'Maximum Hit Points' };
  if (/(attack|tohit|to-hit)/.test(normalized)) return { category: 'attack', target: 'all', confidence: 'low', label: 'Attack Rolls' };
  if (/(damage|dmg)/.test(normalized)) return { category: 'damage', target: 'all', confidence: 'low', label: 'Damage Rolls' };
  return null;
}

const ACTOR_PREVIEW_PATHS = Object.freeze({
  'defense.reflex': [
    'system.derived.defenses.reflex.total',
    'system.defenses.reflex.total',
    'system.defenses.reflex.value',
    'system.derived.defenses.ref.total',
    'system.defenses.ref.total'
  ],
  'defense.fortitude': [
    'system.derived.defenses.fortitude.total',
    'system.defenses.fortitude.total',
    'system.defenses.fortitude.value',
    'system.derived.defenses.fort.total',
    'system.defenses.fort.total'
  ],
  'defense.will': [
    'system.derived.defenses.will.total',
    'system.defenses.will.total',
    'system.defenses.will.value'
  ],
  'defense.damageThreshold': [
    'system.derived.damageThreshold',
    'system.derived.damageThreshold.total',
    'system.derived.damage.threshold',
    'system.damageThreshold.total',
    'system.damageThreshold.value',
    'system.damageThreshold'
  ],
  'speed.base': [
    'system.derived.speed.total',
    'system.derived.speed.walk',
    'system.derived.speed.base',
    'system.speed.total',
    'system.speed.value',
    'system.speed',
    'system.movement.walk',
    'system.movement.speed'
  ],
  'force-power.activation': [
    'system.derived.skills.useTheForce.total',
    'system.derived.skills.use-the-force.total',
    'system.skills.useTheForce.total',
    'system.skills.useTheForce.value',
    'system.skills.use-the-force.total',
    'system.skills.use-the-force.value'
  ],
  'initiative.total': [
    'system.derived.skills.initiative.total',
    'system.skills.initiative.total',
    'system.skills.initiative.value',
    'system.initiative.total',
    'system.initiative.value'
  ],
  'hp.max': [
    'system.attributes.hp.max',
    'system.hp.max',
    'system.health.max',
    'system.derived.hp.max'
  ]
});

function actorPreviewPathsForTarget(target = '') {
  const normalized = String(target || '').trim();
  if (normalized.startsWith('skill.')) {
    const skill = normalized.slice('skill.'.length);
    const canonical = canonicalSkillTarget(skill);
    const normalizedSkill = normalizeSkillId(skill);
    return [
      `system.derived.skills.${canonical}.total`,
      `system.derived.skills.${normalizedSkill}.total`,
      `system.skills.${canonical}.total`,
      `system.skills.${canonical}.value`,
      `system.skills.${canonical}.bonus`,
      `system.skills.${normalizedSkill}.total`,
      `system.skills.${normalizedSkill}.value`,
      `system.skills.${normalizedSkill}.bonus`
    ];
  }
  if (normalized.startsWith('ability.')) {
    const ability = normalized.slice('ability.'.length);
    return [
      `system.derived.attributes.${ability}.total`,
      `system.attributes.${ability}.value`,
      `system.attributes.${ability}.base`,
      `system.abilities.${ability}.value`,
      `system.abilities.${ability}.base`
    ];
  }
  return ACTOR_PREVIEW_PATHS[normalized] ?? [];
}

function previewUnavailable(status, label, description = '') {
  return {
    available: false,
    status,
    label,
    description,
    before: null,
    change: null,
    after: null,
    rows: []
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
}

function normalizeChoice(value, allowed, fallback) {
  const text = String(value ?? '').trim();
  return allowed.includes(text) ? text : fallback;
}

function optionLabel(options, value, fallback = '') {
  return options.find(opt => opt.value === value)?.label ?? fallback;
}

function filterTypeLabel(value) {
  return EFFECT_FILTER_TYPES.find(opt => opt.value === value)?.label ?? 'All matching rolls / stats';
}

function filterValueLabel(filterType, value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (filterType === 'weapon-group') return WEAPON_GROUP_TERMS.find(opt => opt.value === raw)?.label ?? raw.replace(/[-_]+/g, ' ');
  if (filterType === 'weapon-category') return WEAPON_CATEGORY_TERMS.find(opt => opt.value === raw)?.label ?? raw.replace(/[-_]+/g, ' ');
  if (filterType === 'skill') return SKILL_TARGETS.find(opt => opt.value === raw)?.label ?? raw.replace(/[-_]+/g, ' ');
  if (filterType === 'damage-type') return DAMAGE_TYPE_TERMS.find(opt => opt.value === raw)?.label ?? raw.replace(/[-_]+/g, ' ');
  if (filterType === 'force-descriptor') return raw.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return raw.replace(/[-_]+/g, ' ');
}

function hasContextFilter(intent = {}) {
  const filterType = String(intent.filterType || 'all').trim();
  return !!filterType && filterType !== 'all' && filterType !== 'skill';
}

function filterPhrase(intent = {}) {
  const filterType = String(intent.filterType || 'all').trim();
  const filterValue = String(intent.filterValue || '').trim();
  if (!filterType || filterType === 'all') return '';
  if (filterType === 'this-item') return ' for this item only';
  if (filterType === 'weapon-group') return ` with ${filterValueLabel(filterType, filterValue) || 'the selected weapon group'}`;
  if (filterType === 'weapon-category') return ` with ${filterValueLabel(filterType, filterValue) || 'the selected attack category'}`;
  if (filterType === 'skill') return ` for ${filterValueLabel(filterType, filterValue) || 'the selected skill'}`;
  if (filterType === 'damage-type') return ` when dealing ${filterValueLabel(filterType, filterValue) || 'the selected'} damage`;
  if (filterType === 'force-descriptor') return ` for ${filterValueLabel(filterType, filterValue) || 'the selected'} Force powers`;
  if (filterType === 'custom') return ' when the custom GM condition is true';
  return '';
}

function applicationPhrase(value) {
  return EFFECT_APPLICATIONS.find(opt => opt.value === value)?.phrase ?? 'while active';
}

function operationSign(operation) {
  return EFFECT_OPERATIONS.find(opt => opt.value === operation)?.sign ?? 1;
}

function targetLabel(intent = {}) {
  const category = intent.category;
  const target = String(intent.target ?? '').trim();
  if (category === 'defense' || category === 'threshold') {
    return DEFENSE_TARGETS.find(opt => opt.value === target)?.label ?? 'Defense';
  }
  if (category === 'ability') {
    return ABILITY_TARGETS.find(opt => opt.value === target)?.label ?? 'Ability Score';
  }
  if (category === 'skill') {
    return SKILL_TARGETS.find(opt => normalizeSkillId(opt.value) === normalizeSkillId(target))?.label
      ?? (target ? target.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Skill');
  }
  if (category === 'condition') {
    return CONDITION_TARGETS.find(opt => opt.value === target)?.label ?? (target ? target.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Status');
  }
  if (category === 'force') return 'Force Power Check';
  return optionLabel(EFFECT_CATEGORIES, category, 'Statistic');
}

function categoryToTarget(intent = {}) {
  const category = String(intent.category || '').trim();
  const target = normalizeKey(intent.target || '');
  if (category === 'defense') {
    const def = target === 'fort' ? 'fortitude' : target === 'ref' ? 'reflex' : target || 'reflex';
    return `defense.${def}`;
  }
  if (category === 'threshold') return 'defense.damageThreshold';
  if (category === 'skill') return `skill.${canonicalSkillTarget(target || 'unknown')}`;
  if (category === 'ability') return `ability.${target || 'str'}`;
  if (category === 'attack') return 'global.attack';
  if (category === 'damage') return 'global.damage';
  if (category === 'force') return 'force-power.activation';
  if (category === 'speed') return 'speed.base';
  if (category === 'initiative') return 'initiative.total';
  if (category === 'hp') return 'hp.max';
  if (category === 'condition') return '';
  return '';
}

function getNestedFlag(effect = {}, scope = SWSE_EFFECT_FLAG_SCOPE, key = SWSE_EFFECT_INTENT_KEY) {
  const flags = effect?.flags ?? {};
  return flags?.[scope]?.[key] ?? flags?.swse?.[key] ?? effect?.system?.swseEffect ?? null;
}


function isRuntimeAutomatedContextFilter(intent = {}) {
  const filterType = String(intent.filterType || 'all').trim();
  if (!filterType || filterType === 'all') return true;
  if (filterType === 'skill') return intent.category === 'skill';
  if (filterType === 'this-item') return ['attack', 'damage', 'force'].includes(intent.category);
  if (filterType === 'weapon-group') return ['attack', 'damage'].includes(intent.category);
  if (filterType === 'weapon-category') return ['attack', 'damage'].includes(intent.category);
  if (filterType === 'damage-type') return intent.category === 'damage';
  if (filterType === 'force-descriptor') return intent.category === 'force';
  return false;
}

function itemApplies(item = null, application = 'always') {
  if (!item) return ['always', 'manual'].includes(application);
  const system = item.system ?? {};
  if (application === 'always') return true;
  if (application === 'carried') return true;
  if (application === 'manual') return true;
  if (application === 'equipped') return system.equipped === true || system.integrated === true;
  if (application === 'activated') return system.activated === true || system.active === true;
  return true;
}


function normalizeDurationKey(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

function parseRoundDuration(value = '') {
  const key = normalizeDurationKey(value);
  const match = key.match(/^(\d+)-rounds?$/);
  if (!match) return null;
  const rounds = Number(match[1]);
  return Number.isFinite(rounds) && rounds > 0 ? rounds : null;
}

function getLifecycleFlag(effect = {}) {
  const flags = effect?.flags ?? {};
  return flags?.[SWSE_EFFECT_FLAG_SCOPE]?.[SWSE_EFFECT_LIFECYCLE_KEY]
    ?? flags?.swse?.[SWSE_EFFECT_LIFECYCLE_KEY]
    ?? null;
}

function shouldExpireAtTurnStart(effect = {}, actor = null, combat = null) {
  const intent = EffectIntentEngine.getIntent(effect);
  const key = normalizeDurationKey(intent?.duration);
  if (!key || ['until-deactivated', 'until-deactivated.', 'permanent', 'while-active', 'while-active.'].includes(key)) return false;
  if (key === 'encounter') return false;
  if (!combat || !actor) return false;
  const lifecycle = getLifecycleFlag(effect);
  if (!lifecycle?.combatId || lifecycle.combatId !== combat.id) return false;
  const createdRound = Number(lifecycle.createdRound ?? 0);
  const createdTurn = Number(lifecycle.createdTurn ?? -1);
  const currentRound = Number(combat.round ?? 0);
  const currentTurn = Number(combat.turn ?? -1);
  const currentActorId = String(combat.combatant?.actor?.id ?? '');
  const actorId = String(actor?.id ?? '');
  const isActorsTurn = currentActorId && actorId && currentActorId === actorId;
  const hasAdvanced = currentRound > createdRound || (currentRound === createdRound && currentTurn !== createdTurn);

  if (key === 'until-start-next-turn' || key === 'until-end-next-turn') {
    return isActorsTurn && hasAdvanced;
  }

  const rounds = parseRoundDuration(key);
  if (rounds) return currentRound >= createdRound + rounds;
  return false;
}

function shouldExpireAtCombatEnd(effect = {}, combat = null) {
  const intent = EffectIntentEngine.getIntent(effect);
  const key = normalizeDurationKey(intent?.duration);
  if (key !== 'encounter') return false;
  const lifecycle = getLifecycleFlag(effect);
  return !combat || !lifecycle?.combatId || lifecycle.combatId === combat.id;
}

async function disableExpiredEffectsOnDocument(document, effects = [], expiredEffects = [], source = 'swse-basic-effect-lifecycle') {
  if (!document?.updateEmbeddedDocuments || !expiredEffects.length) return 0;
  const updates = expiredEffects
    .filter(effect => effect?.id || effect?._id)
    .map(effect => ({
      _id: effect.id ?? effect._id,
      disabled: true,
      [`flags.${SWSE_EFFECT_FLAG_SCOPE}.${SWSE_EFFECT_LIFECYCLE_KEY}.expiredAt`]: new Date().toISOString(),
      [`flags.${SWSE_EFFECT_FLAG_SCOPE}.${SWSE_EFFECT_LIFECYCLE_KEY}.expiredReason`]: source
    }));
  if (!updates.length) return 0;
  await document.updateEmbeddedDocuments('ActiveEffect', updates, { source });
  return updates.length;
}

export class EffectIntentEngine {
  static options() {
    return {
      applications: EFFECT_APPLICATIONS,
      scopes: EFFECT_SCOPES,
      operations: EFFECT_OPERATIONS,
      categories: EFFECT_CATEGORIES,
      defenses: DEFENSE_TARGETS,
      abilities: ABILITY_TARGETS,
      bonusTypes: BONUS_TYPES,
      skills: SKILL_TARGETS,
      damageTypes: DAMAGE_TYPE_TERMS,
      conditions: CONDITION_TARGETS,
      filterTypes: EFFECT_FILTER_TYPES,
      weaponGroups: WEAPON_GROUP_TERMS,
      weaponCategories: WEAPON_CATEGORY_TERMS,
      presets: EFFECT_PRESETS,
      termLibrary: EFFECT_TERM_LIBRARY,
      supportLegend: [
        { level: 'automated', label: 'Automated', description: 'The modifier engine can apply this Basic effect automatically when its trigger is active.' },
        { level: 'partial', label: 'Partially automated', description: 'The effect is saved and visible, but one piece still needs GM/table adjudication.' },
        { level: 'reminder', label: 'Reminder only', description: 'The effect is preserved as a declaration or reminder. The engine will not apply it automatically.' }
      ],
      defaults: { ...DEFAULT_INTENT }
    };
  }

  static getPreset(presetId) {
    const preset = EFFECT_PRESETS.find(entry => entry.id === presetId);
    if (!preset) return null;
    return foundry?.utils?.deepClone?.(preset) ?? { ...preset, intent: { ...(preset.intent ?? {}) } };
  }

  static getAutomationSupport(rawIntent = {}, { item = null, effect = null } = {}) {
    const intent = this.normalizeIntent(rawIntent);
    if (intent.activeState === 'disabled' || effect?.disabled === true) {
      return {
        level: 'partial',
        label: 'Inactive until enabled',
        tone: 'partial',
        autoApplies: false,
        description: 'This Basic effect is saved, but it starts disabled. Enable it before expecting automation.'
      };
    }
    if (!intent.transfer) {
      return {
        level: 'reminder',
        label: 'Reference only',
        tone: 'reminder',
        autoApplies: false,
        description: 'Apply to character is off, so this effect is a visible reminder and will not change actor math.'
      };
    }
    if (intent.category === 'condition') {
      return {
        level: 'reminder',
        label: 'Visible status',
        tone: 'reminder',
        autoApplies: false,
        description: 'This Basic effect is shown on the character sheet as a current status/reminder. Use dedicated combat status controls when a status has automated combat math.'
      };
    }
    if (intent.scope !== 'self') {
      const itemScopedRollEffect = intent.scope === 'item' && ['attack', 'damage', 'force'].includes(intent.category);
      return {
        level: itemScopedRollEffect ? 'automated' : 'reminder',
        label: itemScopedRollEffect ? 'Automated for this item' : intent.scope === 'item' ? 'Item-scoped' : 'Declaration only',
        tone: itemScopedRollEffect ? 'automated' : 'reminder',
        autoApplies: itemScopedRollEffect && itemApplies(item, intent.application),
        description: itemScopedRollEffect
          ? 'This effect applies only when rolling this item and is ignored for other weapons/items.'
          : intent.scope === 'item'
            ? 'This effect is scoped to the item. It is preserved and shown, but no current call site can automate that stat yet.'
            : 'Target and area effects are shown for the table, but are not automatically applied to other actors yet.'
      };
    }
    if (hasContextFilter(intent)) {
      const contextualAutomated = isRuntimeAutomatedContextFilter(intent);
      return {
        level: contextualAutomated ? 'automated' : 'partial',
        label: contextualAutomated ? 'Automated at roll time' : 'Contextual',
        tone: contextualAutomated ? 'automated' : 'partial',
        autoApplies: contextualAutomated && itemApplies(item, intent.application),
        description: contextualAutomated
          ? `This effect is narrowed by ${filterTypeLabel(intent.filterType).toLowerCase()} and is applied by matching attack/damage/Force roll call sites.`
          : `This effect is narrowed by ${filterTypeLabel(intent.filterType).toLowerCase()}. It is preserved and visible, but still needs a matching roll/action call site before it can apply automatically.`
      };
    }
    const target = categoryToTarget(intent);
    if (!target || /unknown/.test(target)) {
      return {
        level: 'partial',
        label: 'Needs a target',
        tone: 'partial',
        autoApplies: false,
        description: 'Choose the exact defense, skill, ability, or stat before this can apply cleanly.'
      };
    }
    const duration = normalizeDurationKey(intent.duration || '');
    const fullySupportedDurations = new Set(['', 'until-deactivated', 'permanent', 'while-active']);
    const lifecycleSupportedDurations = new Set(['encounter', 'until-start-next-turn', 'until-end-next-turn']);
    const roundDuration = parseRoundDuration(duration);
    if (duration && !fullySupportedDurations.has(duration) && !lifecycleSupportedDurations.has(duration) && !roundDuration) {
      return {
        level: 'partial',
        label: 'Duration needs GM tracking',
        tone: 'partial',
        autoApplies: itemApplies(item, intent.application),
        description: 'The modifier can apply, but this custom duration does not auto-expire yet. Track the timing at the table.'
      };
    }
    return {
      level: 'automated',
      label: 'Automated',
      tone: 'automated',
      autoApplies: itemApplies(item, intent.application),
      description: 'The modifier engine can apply this Basic effect automatically when its trigger is active.'
    };
  }

  static getIntent(effect = {}) {
    return this.normalizeIntent(getNestedFlag(effect));
  }

  static hasIntent(effect = {}) {
    const raw = getNestedFlag(effect);
    return !!raw && typeof raw === 'object';
  }

  static normalizeIntent(raw = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const intent = { ...DEFAULT_INTENT, ...source };
    intent.version = Number(intent.version || 1) || 1;
    intent.mode = 'basic';
    intent.application = normalizeChoice(intent.application, EFFECT_APPLICATIONS.map(opt => opt.value), DEFAULT_INTENT.application);
    intent.activeState = normalizeChoice(intent.activeState, ['enabled', 'disabled'], DEFAULT_INTENT.activeState);
    intent.scope = normalizeChoice(intent.scope, EFFECT_SCOPES.map(opt => opt.value), DEFAULT_INTENT.scope);
    intent.operation = normalizeChoice(intent.operation, EFFECT_OPERATIONS.map(opt => opt.value), DEFAULT_INTENT.operation);
    intent.category = normalizeChoice(intent.category, EFFECT_CATEGORIES.map(opt => opt.value), DEFAULT_INTENT.category);
    intent.target = String(intent.target ?? '').trim() || DEFAULT_INTENT.target;
    intent.amount = Math.max(0, Math.abs(Number(intent.amount ?? DEFAULT_INTENT.amount) || DEFAULT_INTENT.amount));
    intent.bonusType = normalizeChoice(String(intent.bonusType || DEFAULT_INTENT.bonusType).toLowerCase(), BONUS_TYPES.map(opt => opt.value), DEFAULT_INTENT.bonusType);
    intent.duration = String(intent.duration || DEFAULT_INTENT.duration).trim();
    intent.filterType = normalizeChoice(intent.filterType, EFFECT_FILTER_TYPES.map(opt => opt.value), DEFAULT_INTENT.filterType);
    intent.filterValue = String(intent.filterValue ?? '').trim();
    if (intent.filterType === 'skill' && intent.filterValue && intent.category !== 'skill') intent.category = 'skill';
    if (intent.filterType === 'skill' && intent.filterValue) intent.target = intent.filterValue;
    intent.transfer = intent.transfer !== false && intent.transfer !== 'false';
    intent.note = String(intent.note || '').trim();
    return intent;
  }

  static describeIntent(rawIntent = {}, { includePrefix = true } = {}) {
    const intent = this.normalizeIntent(rawIntent);
    const amount = intent.amount * operationSign(intent.operation);
    const signed = `${amount >= 0 ? '+' : ''}${amount}`;
    const statLabel = targetLabel(intent);
    if (intent.category === 'condition') {
      const prefix = includePrefix ? `When ${applicationPhrase(intent.application)}, ` : '';
      const scopeLabel = intent.scope === 'self' ? 'self' : intent.scope === 'target' ? 'target' : intent.scope === 'item' ? 'this item' : 'area/allies';
      const duration = intent.duration ? ` ${intent.duration.replace(/[-_]+/g, ' ')}.` : '.';
      const note = intent.note ? ` ${intent.note}` : '';
      return `${prefix}${scopeLabel} is marked as ${statLabel}${duration}${note}`;
    }
    const bonusType = intent.operation === 'decrease'
      ? 'penalty'
      : optionLabel(BONUS_TYPES, intent.bonusType, intent.bonusType).toLowerCase();
    const scopeLabel = intent.scope === 'self' ? 'self' : intent.scope === 'target' ? 'target' : intent.scope === 'item' ? 'this item' : 'area/allies';
    const verb = intent.operation === 'decrease' ? 'takes' : 'gains';
    const prefix = includePrefix ? `When ${applicationPhrase(intent.application)}, ` : '';
    const duration = intent.duration ? ` ${intent.duration.replace(/[-_]+/g, ' ')}.` : '.';
    const manual = intent.scope === 'self' ? '' : ' This is a declaration-style effect; the system will preserve it but not auto-apply it to other actors yet.';
    return `${prefix}${scopeLabel} ${verb} ${signed} ${bonusType} to ${statLabel}${filterPhrase(intent)}${duration}${manual}`;
  }

  static matchesIntentContext(rawIntent = {}, { item = null, context = {} } = {}) {
    const intent = this.normalizeIntent(rawIntent);
    const filterType = String(intent.filterType || 'all').trim();
    const filterValue = normalizeKey(intent.filterValue || intent.target || '');
    if (!filterType || filterType === 'all') return true;
    if (filterType === 'skill') {
      const skill = normalizeSkillId(context.skill || context.skillId || context.skillKey || context.target || intent.target || '');
      const wantedSkill = normalizeSkillId(filterValue);
      return !!wantedSkill && skill === wantedSkill;
    }
    if (filterType === 'this-item') {
      const contextItem = context.item ?? context.weapon ?? null;
      const contextItemId = String(context.itemId || context.weaponId || contextItem?.id || contextItem?._id || '').trim();
      const itemId = String(item?.id || item?._id || '').trim();
      return !!itemId && contextItemId === itemId;
    }
    if (filterType === 'weapon-group') {
      const weapon = context.weapon ?? context.item ?? null;
      const values = [
        context.weaponGroup,
        context.group,
        weapon?.system?.weaponGroup,
        weapon?.system?.group,
        weapon?.system?.proficiencyGroup,
        weapon?.system?.category
      ].map(normalizeKey).filter(Boolean);
      return !!filterValue && values.includes(filterValue);
    }
    if (filterType === 'weapon-category') {
      const weapon = context.weapon ?? context.item ?? null;
      const values = [
        context.weaponCategory,
        context.attackType,
        context.category,
        weapon?.system?.weaponCategory,
        weapon?.system?.category,
        weapon?.system?.type,
        weapon?.system?.meleeOrRanged
      ].map(normalizeKey).filter(Boolean);
      return !!filterValue && values.includes(filterValue);
    }
    if (filterType === 'damage-type') {
      const values = [context.damageType, ...(Array.isArray(context.damageTypes) ? context.damageTypes : [])]
        .map(normalizeKey)
        .filter(Boolean);
      return !!filterValue && values.includes(filterValue);
    }
    if (filterType === 'force-descriptor') {
      return forceDescriptorMatches(filterValue, context);
    }
    if (filterType === 'custom') {
      const tags = Array.isArray(context.customTags) ? context.customTags.map(normalizeKey) : [];
      return !!filterValue && tags.includes(filterValue);
    }
    return false;
  }

  static toContextualModifierData(effect = {}, { actor = null, item = null, context = {} } = {}) {
    const intent = this.getIntent(effect);
    if (!intent?.transfer) return null;
    if (!['self', 'item'].includes(intent.scope)) return null;
    if (effect?.disabled === true || intent.activeState === 'disabled') return null;
    if (!itemApplies(item, intent.application)) return null;
    if (intent.scope === 'item') {
      const contextItem = context.item ?? context.weapon ?? null;
      const contextItemId = String(context.itemId || context.weaponId || contextItem?.id || contextItem?._id || '').trim();
      const sourceItemId = String(item?.id || item?._id || '').trim();
      if (!sourceItemId || contextItemId !== sourceItemId) return null;
    }
    if (!this.matchesIntentContext(intent, { item, context })) return null;

    const target = categoryToTarget(intent);
    if (!target) return null;

    const sign = operationSign(intent.operation);
    const value = Number(intent.amount || 0) * sign;
    if (!Number.isFinite(value) || value === 0) return null;
    const type = intent.operation === 'decrease' ? ModifierType.PENALTY : intent.bonusType;
    const sourceName = effect?.name || item?.name || 'SWSE Effect';
    const sourceId = effect?.id || effect?._id || item?.id || sourceName;
    // Context filters have already been evaluated by matchesIntentContext().
    // Do not emit them as ModifierEngine conditions: ConditionEvaluator only
    // understands structured rule conditions and would fail closed on friendly
    // strings such as "weapon-group:pistols".
    const conditions = [];

    return {
      sourceId,
      sourceName,
      target,
      type,
      value,
      enabled: true,
      priority: Number(effect?.priority ?? 100) || 100,
      conditions,
      description: this.describeIntent(intent)
    };
  }

  static toModifierData(effect = {}, { actor = null, item = null } = {}) {
    const intent = this.getIntent(effect);
    if (!intent?.transfer) return null;
    if (intent.scope !== 'self') return null;
    if (hasContextFilter(intent)) return null;
    if (effect?.disabled === true || intent.activeState === 'disabled') return null;
    if (!itemApplies(item, intent.application)) return null;

    const target = categoryToTarget(intent);
    if (!target) return null;

    const sign = operationSign(intent.operation);
    const value = Number(intent.amount || 0) * sign;
    if (!Number.isFinite(value) || value === 0) return null;
    const type = intent.operation === 'decrease' ? ModifierType.PENALTY : intent.bonusType;
    const sourceName = effect?.name || item?.name || 'SWSE Effect';
    const sourceId = effect?.id || effect?._id || item?.id || sourceName;

    return {
      sourceId,
      sourceName,
      target,
      type,
      value,
      enabled: true,
      priority: Number(effect?.priority ?? 100) || 100,
      description: this.describeIntent(intent)
    };
  }


  static getPreviewTargetValue(actor = null, target = '') {
    if (!actor) return null;
    const paths = actorPreviewPathsForTarget(target);
    return firstNumericProperty(actor, paths);
  }

  static getEffectMathPreview(rawIntent = {}, { actor = null, item = null, effect = null } = {}) {
    const intent = this.normalizeIntent(rawIntent);
    const support = this.getAutomationSupport(intent, { item, effect });
    const modifier = this.toModifierData(effect ?? { disabled: intent.activeState === 'disabled', transfer: intent.transfer, flags: { [SWSE_EFFECT_FLAG_SCOPE]: { [SWSE_EFFECT_INTENT_KEY]: intent } } }, { actor, item });

    if (!actor) {
      return previewUnavailable(
        'no-actor',
        'Preview unavailable',
        'This item is not owned by an actor, so there is no character value to compare yet.'
      );
    }

    if (!modifier || support?.autoApplies === false) {
      const label = support?.label || 'Not automated';
      return previewUnavailable(
        support?.level || 'not-automated',
        label,
        support?.description || 'This Basic effect is saved, but no automatic math preview is available for it yet.'
      );
    }

    const target = categoryToTarget(intent);
    const targetValue = this.getPreviewTargetValue(actor, target);
    const label = targetLabel(intent);
    const value = Number(modifier.value || 0);
    if (!targetValue) {
      return previewUnavailable(
        'no-static-value',
        'Roll-time preview',
        `${label} does not have a single stored value on this actor, or it is resolved only during a roll. The effect can still be applied by the relevant call site.`
      );
    }

    const before = Number(targetValue.value);
    const after = before + value;
    const signed = `${value >= 0 ? '+' : ''}${value}`;
    return {
      available: true,
      status: 'ready',
      label: 'Preview math',
      description: `${label}: ${before} ${signed} = ${after}`,
      target,
      targetLabel: label,
      sourcePath: targetValue.path,
      before,
      change: value,
      changeLabel: signed,
      after,
      rows: [
        { label: 'Before', value: before },
        { label: 'Effect', value: signed },
        { label: 'After', value: after }
      ]
    };
  }


  static stampLifecycle(effectData = {}, { actor = null, combat = null } = {}) {
    const data = foundry?.utils?.deepClone?.(effectData) ?? { ...effectData };
    const intent = this.getIntent(data);
    const key = normalizeDurationKey(intent?.duration);
    const rounds = parseRoundDuration(key);
    const managed = key === 'encounter' || key === 'until-start-next-turn' || key === 'until-end-next-turn' || !!rounds;
    if (!managed) return data;
    const activeCombat = combat ?? game?.combat ?? null;
    const lifecycle = {
      duration: key,
      createdAt: new Date().toISOString(),
      createdRound: Number(activeCombat?.round ?? 0) || 0,
      createdTurn: Number(activeCombat?.turn ?? -1),
      combatId: activeCombat?.id ?? null,
      combatantId: activeCombat?.combatant?.id ?? null,
      actorId: actor?.id ?? null
    };
    data.flags = data.flags ?? {};
    data.flags[SWSE_EFFECT_FLAG_SCOPE] = {
      ...(data.flags[SWSE_EFFECT_FLAG_SCOPE] ?? {}),
      [SWSE_EFFECT_LIFECYCLE_KEY]: lifecycle
    };
    return data;
  }

  static getLifecycle(effect = {}) {
    return getLifecycleFlag(effect);
  }

  static async expireManagedEffectsForActor(actor, { combat = null, timing = 'turn-start' } = {}) {
    if (!actor || game?.user?.isGM !== true) return { expired: 0 };
    const activeCombat = combat ?? game?.combat ?? null;
    let expired = 0;

    const actorEffects = Array.from(actor?.effects ?? []).filter(effect => {
      if (!this.hasIntent(effect) || effect?.disabled === true) return false;
      return timing === 'combat-end'
        ? shouldExpireAtCombatEnd(effect, activeCombat)
        : shouldExpireAtTurnStart(effect, actor, activeCombat);
    });
    expired += await disableExpiredEffectsOnDocument(actor, actor?.effects, actorEffects, `swse-basic-effect-${timing}`);

    for (const item of Array.from(actor?.items ?? [])) {
      const itemExpired = Array.from(item?.effects ?? []).filter(effect => {
        if (!this.hasIntent(effect) || effect?.disabled === true) return false;
        return timing === 'combat-end'
          ? shouldExpireAtCombatEnd(effect, activeCombat)
          : shouldExpireAtTurnStart(effect, actor, activeCombat);
      });
      expired += await disableExpiredEffectsOnDocument(item, item?.effects, itemExpired, `swse-basic-effect-${timing}`);
    }

    return { expired };
  }

  static normalizeEffectDocument(effect = {}, { item = null, actor = null } = {}) {
    const id = effect?.id ?? effect?._id ?? '';
    const intent = this.getIntent(effect);
    const hasIntent = this.hasIntent(effect);
    const changes = asArray(effect?.changes).map((change, index) => ({
      index,
      key: String(change?.key ?? ''),
      mode: Number(change?.mode ?? 2) || 2,
      value: String(change?.value ?? ''),
      priority: Number(change?.priority ?? 20) || 20
    }));
    const support = hasIntent ? this.getAutomationSupport(intent, { item, effect }) : null;
    const conversion = hasIntent ? null : this.getAdvancedConversionSuggestion(effect);
    const autoApplies = !!this.toModifierData(effect, { item });
    const preview = hasIntent ? this.getEffectMathPreview(intent, { actor, item, effect }) : null;
    const lifecycle = getLifecycleFlag(effect);
    return {
      id,
      name: effect?.name || effect?.label || 'Unnamed Effect',
      disabled: effect?.disabled === true,
      enabled: effect?.disabled !== true,
      transfer: effect?.transfer !== false,
      description: effect?.description || '',
      icon: effect?.icon || effect?.img || 'icons/svg/aura.svg',
      hasIntent,
      intent,
      summary: hasIntent ? this.describeIntent(intent) : this.describeAdvancedEffect(effect),
      basicStatus: hasIntent ? support.label : 'Advanced effect',
      support,
      supportClass: support?.tone || 'advanced',
      autoApplies,
      preview,
      lifecycle,
      hasLifecycle: !!lifecycle,
      hasPreview: !!preview?.available,
      conversion,
      canConvertToBasic: !!conversion?.isConvertible,
      conversionReason: conversion?.reason || '',
      conversionDescription: conversion?.description || '',
      changes,
      changeCount: changes.length,
      isAdvancedOnly: !hasIntent
    };
  }

  static describeAdvancedEffect(effect = {}) {
    const changes = asArray(effect?.changes);
    if (!changes.length) return 'This effect has no raw changes. It can still be used as a reminder or declaration.';
    const conversion = this.getAdvancedConversionSuggestion(effect);
    if (conversion?.isConvertible) {
      return `Advanced effect: ${changes[0]?.key || 'recognized path'} can be converted to Basic as ${this.describeIntent(conversion.intent, { includePrefix: false })}`;
    }
    if (changes.length === 1) {
      const change = changes[0] ?? {};
      return `Advanced effect: ${change.key || 'unknown path'} ${change.value ? `→ ${change.value}` : ''}`.trim();
    }
    return `Advanced effect with ${changes.length} raw change rows.`;
  }

  static getAdvancedConversionSuggestion(effect = {}) {
    if (this.hasIntent(effect)) {
      return {
        isConvertible: false,
        reason: 'Already Basic',
        description: 'This effect already has a Basic SWSE intent.'
      };
    }
    const changes = asArray(effect?.changes);
    if (!changes.length) {
      return {
        isConvertible: false,
        reason: 'No raw changes',
        description: 'This effect has no raw change rows to translate.'
      };
    }
    if (changes.length !== 1) {
      return {
        isConvertible: false,
        reason: 'Multiple raw rows',
        description: 'This effect has multiple raw change rows. Convert each mechanic manually in Basic, or keep this as Advanced.'
      };
    }
    const change = changes[0] ?? {};
    const mode = Number(change.mode ?? 2) || 2;
    if (mode !== 2) {
      return {
        isConvertible: false,
        reason: `${rawChangeModeLabel(mode)} mode`,
        description: 'Only simple Add-mode effects can be converted safely to Basic without changing the mechanic.'
      };
    }
    const numeric = Number(change.value);
    if (!Number.isFinite(numeric) || numeric === 0) {
      return {
        isConvertible: false,
        reason: 'Formula or empty value',
        description: 'The Basic converter only handles single numeric raw values. Keep formulas in Advanced mode.'
      };
    }
    const inferred = inferIntentTargetFromRawPath(change.key);
    if (!inferred) {
      return {
        isConvertible: false,
        reason: 'Unknown path',
        description: 'The converter does not recognize this raw path yet. The raw data will still be preserved in Advanced.'
      };
    }
    const operation = numeric < 0 ? 'decrease' : 'increase';
    const intent = this.normalizeIntent({
      application: 'always',
      activeState: effect?.disabled === true ? 'disabled' : 'enabled',
      scope: 'self',
      operation,
      category: inferred.category,
      target: inferred.target,
      amount: Math.abs(numeric),
      bonusType: operation === 'decrease' ? ModifierType.PENALTY : ModifierType.UNTYPED,
      duration: 'until-deactivated',
      transfer: effect?.transfer !== false,
      filterType: 'all',
      filterValue: '',
      note: `Converted from Advanced raw path: ${change.key || 'unknown path'}. Original raw rows were preserved in the Advanced backup.`
    });
    return {
      isConvertible: true,
      confidence: inferred.confidence,
      reason: inferred.label,
      description: this.describeIntent(intent),
      intent,
      originalChange: {
        key: String(change.key ?? ''),
        mode,
        value: String(change.value ?? ''),
        priority: Number(change.priority ?? 20) || 20
      }
    };
  }

  static buildBasicConversionUpdateData(effect = {}) {
    const conversion = this.getAdvancedConversionSuggestion(effect);
    if (!conversion?.isConvertible) return null;
    const source = effect?.toObject?.() ?? (foundry?.utils?.deepClone?.(effect) ?? { ...effect });
    const flags = foundry?.utils?.deepClone?.(source.flags ?? {}) ?? { ...(source.flags ?? {}) };
    flags[SWSE_EFFECT_FLAG_SCOPE] = {
      ...(flags[SWSE_EFFECT_FLAG_SCOPE] ?? {}),
      [SWSE_EFFECT_INTENT_KEY]: conversion.intent,
      advancedEffectBackup: {
        convertedAt: new Date().toISOString(),
        originalChanges: asArray(source.changes).map(change => ({
          key: String(change?.key ?? ''),
          mode: Number(change?.mode ?? 2) || 2,
          value: String(change?.value ?? ''),
          priority: Number(change?.priority ?? 20) || 20
        })),
        originalDescription: String(source.description ?? ''),
        originalFlags: source.flags ?? {}
      }
    };
    return {
      _id: effect?.id ?? effect?._id,
      name: source.name || source.label || 'Converted Basic Effect',
      disabled: source.disabled === true || conversion.intent.activeState === 'disabled',
      transfer: conversion.intent.transfer !== false,
      description: this.describeIntent(conversion.intent),
      changes: [],
      flags
    };
  }

  static buildActiveEffectData(rawIntent = {}, { name = 'New SWSE Effect' } = {}) {
    const intent = this.normalizeIntent(rawIntent);
    const summary = this.describeIntent(intent);
    const data = {
      name: String(name || 'New SWSE Effect').trim() || 'New SWSE Effect',
      icon: 'icons/svg/aura.svg',
      disabled: intent.activeState === 'disabled',
      transfer: intent.transfer !== false,
      description: summary,
      changes: [],
      flags: {
        [SWSE_EFFECT_FLAG_SCOPE]: {
          [SWSE_EFFECT_INTENT_KEY]: intent
        }
      }
    };
    return data;
  }

  static buildAdvancedEffectData({ name = 'Advanced SWSE Effect', key = '', mode = 2, value = '', priority = 20 } = {}) {
    return {
      name: String(name || 'Advanced SWSE Effect').trim() || 'Advanced SWSE Effect',
      icon: 'icons/svg/aura.svg',
      disabled: false,
      transfer: true,
      description: 'Advanced Active Effect. Use raw Foundry change paths only when the Basic sentence builder cannot express the mechanic.',
      changes: [{ key: String(key || ''), mode: Number(mode || 2) || 2, value: String(value ?? ''), priority: Number(priority || 20) || 20 }],
      flags: {
        [SWSE_EFFECT_FLAG_SCOPE]: {
          advancedEffect: true
        }
      }
    };
  }
}

export default EffectIntentEngine;
