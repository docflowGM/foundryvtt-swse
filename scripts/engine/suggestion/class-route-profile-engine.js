/**
 * Class Route Profile Engine
 *
 * Reads class metadata, starting-class anchor, actual class investment,
 * feats/talents/skills, attributes, pending choices, and equipment/loadout to
 * classify whether a candidate class is a continuation, bridge, side route, or
 * detour. This is advice-only: it never changes legality.
 */

import { BASE_CLASSES } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-suggestion-utilities.js";
import { CLASS_TAG_METADATA } from "/systems/foundryvtt-swse/scripts/data/class-tag-metadata.js";
import { getEquipmentLoadoutProfile, getLoadoutTagWeight } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment-loadout-profile.js";

const FAMILY_LABELS = {
  jedi_order: 'Jedi Order progression',
  force_tradition: 'Force tradition',
  leadership: 'leadership and influence',
  support: 'support and recovery',
  rogue: 'roguish problem-solving',
  ranged: 'ranged pressure',
  fieldcraft: 'survival and mobility',
  vehicle: 'vehicle mastery',
  martial: 'martial combat',
  technical: 'technical problem-solving',
  general: 'general capability',
};

const CLASS_ROUTE_FAMILIES = {
  Jedi: 'jedi_order',
  'Jedi Knight': 'jedi_order',
  'Jedi Master': 'jedi_order',
  'Imperial Knight': 'jedi_order',
  'Force Adept': 'force_tradition',
  'Force Disciple': 'force_tradition',
  'Sith Apprentice': 'force_tradition',
  'Sith Lord': 'force_tradition',
  Noble: 'leadership',
  Officer: 'leadership',
  'Crime Lord': 'leadership',
  'Corporate Agent': 'leadership',
  Charlatan: 'leadership',
  Medic: 'support',
  'Droid Commander': 'leadership',
  Scoundrel: 'rogue',
  Gunslinger: 'ranged',
  Outlaw: 'rogue',
  Infiltrator: 'rogue',
  'Master Privateer': 'rogue',
  Assassin: 'rogue',
  Scout: 'fieldcraft',
  'Bounty Hunter': 'fieldcraft',
  'Ace Pilot': 'vehicle',
  Pathfinder: 'fieldcraft',
  Vanguard: 'martial',
  Saboteur: 'technical',
  Soldier: 'martial',
  'Elite Trooper': 'martial',
  Gladiator: 'martial',
  'Melee Duelist': 'martial',
  'Martial Arts Master': 'martial',
  'Military Engineer': 'technical',
};

const CLASS_ROUTE_AFFINITY = {
  Jedi: ['Jedi Knight', 'Jedi Master', 'Imperial Knight'],
  Noble: ['Officer', 'Crime Lord', 'Corporate Agent', 'Charlatan', 'Medic', 'Droid Commander'],
  Scoundrel: ['Gunslinger', 'Outlaw', 'Crime Lord', 'Infiltrator', 'Master Privateer', 'Assassin', 'Charlatan'],
  Scout: ['Bounty Hunter', 'Ace Pilot', 'Pathfinder', 'Infiltrator', 'Vanguard', 'Saboteur'],
  Soldier: ['Elite Trooper', 'Officer', 'Vanguard', 'Gladiator', 'Melee Duelist', 'Martial Arts Master', 'Military Engineer', 'Bounty Hunter', 'Imperial Knight'],
};

const TAG_ALIASES = {
  jedi_order: ['jedi', 'lightsaber', 'force', 'force_sensitive', 'force_sensitive', 'force_sensitivity', 'use_the_force'],
  force_tradition: ['force', 'force_power', 'force_training', 'force_sensitive', 'use_the_force', 'control', 'sense', 'alter'],
  martial: ['martial', 'combat', 'melee', 'ranged', 'damage', 'defense', 'armor', 'durable', 'strength', 'constitution'],
  leadership: ['leader', 'leadership', 'support', 'social_synergy', 'social', 'charisma', 'influence', 'persuasion'],
  fieldcraft: ['scout', 'survival', 'perception', 'mobility', 'stealth', 'tracking', 'exploration', 'initiative'],
  rogue: ['rogue', 'stealth', 'deception', 'scoundrel', 'misfortune', 'fortune', 'skills', 'mobility', 'underworld'],
  ranged: ['ranged', 'pistol', 'rifle', 'gunslinger', 'shot', 'dexterity', 'damage'],
  vehicle: ['vehicle', 'pilot', 'pilot_synergy', 'starship', 'ace_pilot', 'mechanics'],
  technical: ['tech', 'mechanics', 'use_computer', 'slicer', 'toolkit', 'intelligence'],
  support: ['support', 'healing', 'medical', 'treat_injury', 'knowledge', 'utility'],
};

const FEAT_TAG_HINTS = [
  { pattern: /force|use the force/i, tags: ['force', 'force_sensitive'] },
  { pattern: /lightsaber/i, tags: ['lightsaber', 'melee', 'jedi'] },
  { pattern: /power attack|cleave|rapid strike|melee defense|flurry/i, tags: ['melee', 'martial', 'damage', 'strength'] },
  { pattern: /point-blank shot|precise shot|rapid shot|sniper|deadeye|pistol|rifle/i, tags: ['ranged', 'damage', 'dexterity'] },
  { pattern: /armor proficiency|toughness|damage threshold/i, tags: ['armor', 'defense', 'durable', 'martial'] },
  { pattern: /skill focus \((persuasion|deception|gather information)\)|linguist/i, tags: ['social', 'leadership', 'charisma'] },
  { pattern: /skill focus \((mechanics|use computer)\)|tech specialist/i, tags: ['technical', 'tech', 'intelligence'] },
  { pattern: /vehicular|pilot/i, tags: ['vehicle', 'pilot'] },
  { pattern: /grenade|explosive|blast/i, tags: ['grenade', 'explosives', 'area_damage'] },
];

const TALENT_TAG_HINTS = [
  { pattern: /block|deflect|lightsaber|ataru|djem so|jar'?kai|juyo|niman|shien|shii-cho|soresu|vaapad/i, tags: ['lightsaber', 'jedi', 'melee', 'defense'] },
  { pattern: /force|telekinetic|mind trick|alter|control|sense/i, tags: ['force', 'force_power', 'control'] },
  { pattern: /armor|commando|weapon specialist/i, tags: ['martial', 'armor', 'damage'] },
  { pattern: /inspiration|influence|leadership|lineage/i, tags: ['leadership', 'social', 'support'] },
  { pattern: /awareness|camouflage|fringer|survival/i, tags: ['fieldcraft', 'perception', 'survival', 'mobility'] },
  { pattern: /fortune|misfortune|slicer|spy/i, tags: ['rogue', 'stealth', 'tech'] },
];


const ROUTE_TAG_WEIGHTS = {
  damage: 0.18,
  defense: 0.28,
  mobility: 0.22,
  control: 0.28,
  utility: 0.18,
  skills: 0.18,
  durable: 0.25,
  dex: 0.2,
  dexterity: 0.2,
  str: 0.24,
  strength: 0.24,
  con: 0.18,
  constitution: 0.18,
  int: 0.18,
  intelligence: 0.18,
  wis: 0.2,
  wisdom: 0.2,
  cha: 0.18,
  charisma: 0.18,
  support: 0.35,
  perception: 0.3,
  initiative: 0.26,
  knowledge: 0.24,
};

function routeTagWeight(tag) {
  const normalized = normalizeKey(tag);
  return ROUTE_TAG_WEIGHTS[normalized] ?? 1;
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classMetadata(className) {
  const wanted = normalizeName(className);
  const exact = Object.entries(CLASS_TAG_METADATA).find(([name]) => normalizeName(name) === wanted);
  return exact?.[1] || {};
}

function addScore(map, key, amount, signal = null) {
  const normalized = normalizeKey(key);
  if (!normalized || !Number.isFinite(Number(amount))) return;
  map[normalized] = Number(map[normalized] || 0) + Number(amount);
  if (signal && Array.isArray(map.__signals)) map.__signals.push(signal);
}

function addTags(map, tags = [], amount = 0.5, signal = null) {
  for (const tag of tags || []) addScore(map, tag, amount, signal);
}

function familyForClass(className) {
  const wanted = normalizeName(className);
  const exact = Object.entries(CLASS_ROUTE_FAMILIES).find(([name]) => normalizeName(name) === wanted);
  if (exact) return exact[1];

  const metadata = classMetadata(className);
  const haystack = `${metadata.theme || ''} ${(metadata.tags || []).join(' ')}`.toLowerCase();
  if (/jedi|lightsaber/.test(haystack)) return 'jedi_order';
  if (/force|use the force/.test(haystack)) return 'force_tradition';
  if (/leader|noble|officer|social|support/.test(haystack)) return 'leadership';
  if (/soldier|martial|combat|melee|armor/.test(haystack)) return 'martial';
  if (/scout|survival|mobility|exploration|tracking/.test(haystack)) return 'fieldcraft';
  if (/pilot|vehicle|starship/.test(haystack)) return 'vehicle';
  if (/tech|mechanic|computer|slicer/.test(haystack)) return 'technical';
  if (/stealth|scoundrel|infiltrat|crime|rogue/.test(haystack)) return 'rogue';
  return 'general';
}

function familyLabel(family) {
  return FAMILY_LABELS[family] || FAMILY_LABELS.general;
}

function classRouteMatches(baseClass, candidateClass) {
  if (!baseClass || !candidateClass) return false;
  const candidate = normalizeName(candidateClass);
  return (CLASS_ROUTE_AFFINITY[baseClass] || [])
    .some(route => normalizeName(route) === candidate);
}

function entriesFromClasses(classes = {}) {
  return Object.entries(classes || {})
    .map(([name, level]) => ({ name, level: Number(level || 0) || 0 }))
    .filter(entry => entry.name && entry.level > 0);
}

function baseClassEntries(actorState) {
  return entriesFromClasses(actorState?.classes)
    .filter(entry => BASE_CLASSES.some(name => normalizeName(name) === normalizeName(entry.name)));
}

function primaryBaseClass(actorState) {
  const entries = baseClassEntries(actorState);
  return [...entries]
    .sort((a, b) => (b.level - a.level) || a.name.localeCompare(b.name))[0]?.name
    || actorState?.startingClass
    || null;
}

function classifyInvestment(level, supportingWeight = 0) {
  const value = Number(level || 0);
  if (value <= 0) return 'none';
  if (value >= 4 || supportingWeight >= 4.5) return 'swim';
  if (value >= 2 || supportingWeight >= 2.25) return 'dive';
  return 'dip';
}

function classCountShape(actorState) {
  const entries = baseClassEntries(actorState).sort((a, b) => b.level - a.level);
  const total = entries.reduce((sum, entry) => sum + entry.level, 0) || 0;
  const top = entries[0] || null;
  const second = entries[1] || null;
  const manyClasses = entries.filter(entry => entry.level > 0).length >= 4;
  const lowTopShare = total > 0 && top && (top.level / total) < 0.45;
  const closeTop = top && second && Math.abs(top.level - second.level) <= 1;
  const diffuse = manyClasses || (entries.length >= 3 && (lowTopShare || closeTop));
  return { entries, total, top, second, diffuse };
}

function ownedTextValues(setLike) {
  if (!setLike) return [];
  if (setLike instanceof Set) return Array.from(setLike);
  if (Array.isArray(setLike)) return setLike.map(value => typeof value === 'string' ? value : value?.name || value?.label || '');
  return Object.values(setLike).map(value => typeof value === 'string' ? value : value?.name || value?.label || '');
}

function applyNameHints(identity, values, hintDefs, weight) {
  for (const value of values) {
    const text = String(value || '');
    for (const hint of hintDefs) {
      if (hint.pattern.test(text)) addTags(identity, hint.tags, weight, text);
    }
  }
}

function addClassIdentity(identity, className, level, options = {}) {
  const metadata = classMetadata(className);
  const family = familyForClass(className);
  const weight = Number(level || 0) * Number(options.weightPerLevel ?? 0.55);
  if (weight <= 0) return;
  addScore(identity, family, weight, `${className} levels`);
  addTags(identity, metadata.tags || [], weight * 0.65, `${className} class tags`);
  addTags(identity, metadata.abilities || [], weight * 0.35, `${className} ability lane`);
  addScore(identity, metadata.theme || family, weight * 0.5, `${className} theme`);
}

function addStartingClassAnchor(identity, actorState, shape) {
  const startingClass = actorState?.startingClass;
  if (!startingClass) return null;

  const totalLevel = Number(actorState?.characterLevel || shape.total || 1) || 1;
  const startEntry = shape.entries.find(entry => normalizeName(entry.name) === normalizeName(startingClass));
  const startLevel = Number(startEntry?.level || 0);
  const isStillPresent = startLevel > 0;
  const topClass = shape.top?.name || null;
  const topShare = shape.top && shape.total ? shape.top.level / shape.total : 0;
  const startShare = shape.total ? startLevel / shape.total : 0;
  const hasClearPivot = topClass && normalizeName(topClass) !== normalizeName(startingClass) && topShare >= 0.52 && shape.top.level >= Math.max(3, startLevel + 2);

  // Level 1 sets the chassis. It should fade as the character proves a new
  // direction, but it should not vanish entirely because HP/skills/starting
  // feat package still shaped the character.
  let anchorWeight = 1.45;
  anchorWeight *= Math.max(0.45, 1 - Math.max(0, totalLevel - 1) * 0.055);
  if (isStillPresent && startShare >= 0.35) anchorWeight += 0.45;
  if (shape.diffuse && startShare < 0.25) anchorWeight *= 0.35;
  if (hasClearPivot) anchorWeight *= 0.45;

  addClassIdentity(identity, startingClass, 1, { weightPerLevel: anchorWeight });
  return {
    className: startingClass,
    weight: Number(anchorWeight.toFixed(2)),
    isStillPresent,
    startLevel,
    startShare,
    hasClearPivot,
    signal: hasClearPivot
      ? `Level 1 ${startingClass} still matters, but later levels show a pivot toward ${topClass}.`
      : shape.diffuse && startShare < 0.25
        ? `Level 1 ${startingClass} still matters, but the broad multiclass pattern makes it a weak anchor now.`
        : `Level 1 ${startingClass} sets the original chassis for skills, HP, and early feats.`,
  };
}

function addAbilityIdentity(identity, actorState) {
  const scores = actorState?.abilityScores || {};
  for (const [key, rawScore] of Object.entries(scores)) {
    const score = Number(rawScore || 10);
    if (score >= 16) addScore(identity, key, 1.2, `high ${key}`);
    else if (score >= 14) addScore(identity, key, 0.75, `good ${key}`);
    else if (score >= 12) addScore(identity, key, 0.35, `solid ${key}`);
  }
  if (scores.str >= 14) addTags(identity, ['melee', 'martial', 'damage', 'strength'], scores.str >= 16 ? 0.8 : 0.45, 'Strength supports melee pressure');
  if (scores.dex >= 14) addTags(identity, ['ranged', 'mobility', 'dexterity'], scores.dex >= 16 ? 0.8 : 0.45, 'Dexterity supports ranged/mobility pressure');
  if (scores.wis >= 14) addTags(identity, ['force', 'perception', 'wisdom'], scores.wis >= 16 ? 0.75 : 0.4, 'Wisdom supports Force/perception routes');
  if (scores.cha >= 14) addTags(identity, ['force', 'leadership', 'social', 'charisma'], scores.cha >= 16 ? 0.75 : 0.4, 'Charisma supports Force/social routes');
  if (scores.int >= 14) addTags(identity, ['technical', 'skills', 'knowledge', 'intelligence'], scores.int >= 16 ? 0.75 : 0.4, 'Intelligence supports skills/technical routes');
}

function addEquipmentIdentity(identity, actorState, signals) {
  const profile = actorState?.equipmentProfile || getEquipmentLoadoutProfile(actorState?.actor || null, {});
  if (!profile) return;
  const tags = profile.allTags || [];
  for (const tag of tags) {
    const weight = getLoadoutTagWeight(profile, tag);
    if (weight > 0) addScore(identity, tag, weight, `loadout:${tag}`);
  }

  if (profile.hasEquippedLightsaber) signals.push('equipped lightsaber reinforces Force/lightsaber class routes');
  else if (profile.hasLightsaber) signals.push('owned lightsaber lightly reinforces Force/lightsaber class routes');
  if (profile.dualLightsabers) signals.push('two equipped lightsabers point toward dual-wield/Jar\'Kai-style class and talent lanes');
  if (profile.primaryWeaponGroup) signals.push(`primary weapon group is ${profile.primaryWeaponGroup.replace(/_/g, ' ')}`);
  if (profile.equippedArmorCount > 0) signals.push('equipped armor reinforces martial/defensive class routes');
  if (profile.hasEquippedGrenade || (profile.weaponGroups?.grenade?.inventoryCount || 0) >= 3) signals.push('grenade loadout exists, but it should only dominate with matching class/feat support');
}

function buildIdentity(actorState) {
  const identity = { __signals: [] };
  const signals = [];
  const shape = classCountShape(actorState);

  for (const entry of shape.entries) addClassIdentity(identity, entry.name, entry.level);
  const startingAnchor = addStartingClassAnchor(identity, actorState, shape);
  if (startingAnchor?.signal) signals.push(startingAnchor.signal);
  addAbilityIdentity(identity, actorState);
  applyNameHints(identity, ownedTextValues(actorState?.ownedFeats), FEAT_TAG_HINTS, 0.75);
  applyNameHints(identity, ownedTextValues(actorState?.ownedTalents), TALENT_TAG_HINTS, 0.85);
  applyNameHints(identity, ownedTextValues(actorState?.talentTrees), TALENT_TAG_HINTS, 0.45);
  addEquipmentIdentity(identity, actorState, signals);

  delete identity.__signals;
  const topIdentity = Object.entries(identity)
    .filter(([, score]) => Number(score) > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([tag, score]) => ({ tag, score: Number(score.toFixed(2)) }));

  return { scores: identity, topIdentity, signals, shape, startingAnchor };
}

function candidateTags(className) {
  const metadata = classMetadata(className);
  const family = familyForClass(className);
  const tags = new Set([
    family,
    metadata.theme,
    ...(metadata.tags || []),
    ...(metadata.abilities || []),
    ...(TAG_ALIASES[family] || []),
  ].map(normalizeKey).filter(Boolean));
  return Array.from(tags);
}

function classLevel(actorState, className) {
  return entriesFromClasses(actorState?.classes)
    .find(entry => normalizeName(entry.name) === normalizeName(className))?.level || 0;
}

function routeFitFromIdentity(className, identityData, actorState, options = {}) {
  const tags = candidateTags(className);
  const family = familyForClass(className);
  const identity = identityData.scores || {};
  let raw = 0;
  const matchedTags = [];

  for (const tag of tags) {
    const normalizedTag = normalizeKey(tag);
    const score = Number(identity[normalizedTag] || 0);
    if (score > 0) {
      const weight = routeTagWeight(normalizedTag);
      raw += Math.min(2.25, score) * weight;
      matchedTags.push({ tag: normalizedTag, score: Number(score.toFixed(2)), weight });
    }
  }

  const baseClass = primaryBaseClass(actorState);
  const startingClass = actorState?.startingClass || null;
  const candidate = normalizeName(className);
  const baseRoute = baseClass && classRouteMatches(baseClass, className);
  const startingRoute = startingClass && classRouteMatches(startingClass, className);
  const alreadyHasClass = classLevel(actorState, className) > 0;
  const target = options.prestigeClassTarget || null;
  const targetMatch = target && normalizeName(target) === candidate;

  if (alreadyHasClass) raw += 2.4;
  if (baseRoute) raw += 2.2;
  if (startingRoute) {
    const anchorWeight = Number(identityData.startingAnchor?.weight || 0);
    raw += identityData.startingAnchor?.hasClearPivot ? 0.45 : Math.max(0.25, Math.min(1.5, anchorWeight));
  }
  if (targetMatch) raw += 3.0;

  const targetFamily = target ? familyForClass(target) : null;
  if (targetFamily && targetFamily === family) raw += 1.0;

  const directFamilyScore = Number(identity[family] || 0);
  if (directFamilyScore > 0) raw += Math.min(1.75, directFamilyScore);

  const baseFamily = baseClass ? familyForClass(baseClass) : null;
  const startingFamily = startingClass ? familyForClass(startingClass) : null;
  const candidateFamily = family;
  const familyMatchesAnchor = [baseFamily, startingFamily].filter(Boolean).includes(candidateFamily);
  const isKnownContinuation = baseRoute || startingRoute || targetMatch;
  const familyTension = !familyMatchesAnchor && !isKnownContinuation && baseFamily && baseFamily !== 'general' && candidateFamily !== 'general';
  if (familyTension) {
    if (baseFamily === 'jedi_order' && candidateFamily === 'force_tradition') raw *= 0.68;
    else raw *= 0.78;
  }

  let routeFitScore = Math.max(0, Math.min(1, raw / 7.5));
  if (familyTension) routeFitScore = Math.min(routeFitScore, baseFamily === 'jedi_order' && candidateFamily === 'force_tradition' ? 0.66 : 0.58);
  if (identityData.shape.diffuse && !baseRoute && !targetMatch) {
    routeFitScore = Math.min(routeFitScore, startingRoute ? 0.47 : 0.42);
  }
  let routeFit = 'weak';
  if (routeFitScore >= 0.72) routeFit = 'strong';
  else if (routeFitScore >= 0.48) routeFit = 'moderate';
  else if (routeFitScore < 0.25) routeFit = 'offRoute';

  return {
    routeFit,
    routeFitScore: Number(routeFitScore.toFixed(3)),
    matchedTags: matchedTags.sort((a, b) => b.score - a.score).slice(0, 8),
    routeFamily: family,
    routeFamilyLabel: familyLabel(family),
    baseClass,
    startingClass,
    routeMatchesBase: !!baseRoute,
    routeMatchesStartingClass: !!startingRoute,
    targetMatches: !!targetMatch,
    targetRouteFamily: targetFamily,
  };
}

function readinessFromPrereqs(isPrestige, prereqCheck) {
  if (!isPrestige) return 'base';
  const missing = (prereqCheck?.missing || []).filter(entry => !entry?.unverifiable);
  if (!missing.length) return 'ready';
  if (missing.length <= 2) return 'almost';
  return 'blocked';
}

function investmentProfiles(actorState, identityData) {
  return identityData.shape.entries.map(entry => {
    const metadata = classMetadata(entry.name);
    const family = familyForClass(entry.name);
    const supportTags = [...(metadata.tags || []), metadata.theme, family, ...(TAG_ALIASES[family] || [])].map(normalizeKey);
    const supportingWeight = supportTags.reduce((sum, tag) => sum + Number(identityData.scores[tag] || 0), 0);
    return {
      className: entry.name,
      level: entry.level,
      routeFamily: family,
      investmentShape: classifyInvestment(entry.level, supportingWeight),
      supportingWeight: Number(supportingWeight.toFixed(2)),
    };
  });
}

function urgencyFor({ isPrestige, readiness, routeFit, routeFitScore, diffuse, targetMatches }) {
  if (!isPrestige) {
    if (routeFit === 'strong') return 'consolidate';
    if (diffuse) return 'stabilize';
    return routeFit === 'offRoute' ? 'detour' : 'optional';
  }
  if (readiness === 'ready') {
    if (routeFit === 'strong' || targetMatches) return 'enterNow';
    if (routeFit === 'moderate' && !diffuse) return 'optionalPrestige';
    return 'mutedPrestige';
  }
  if (readiness === 'almost') {
    if (routeFit === 'strong' || routeFit === 'moderate' || targetMatches) return 'forecast';
    return 'mutedForecast';
  }
  return 'blocked';
}

function sortBiasFor({ isPrestige, readiness, routeFitScore, urgency, diffuse }) {
  let bias = 0;
  if (isPrestige) {
    if (urgency === 'enterNow') bias += 3.0;
    else if (urgency === 'forecast') bias += 1.5;
    else if (urgency === 'optionalPrestige') bias += 0.4;
    else if (urgency === 'mutedPrestige' || urgency === 'mutedForecast') bias -= 1.8;
    else bias -= 1.0;
  }
  bias += Math.max(-1.5, Math.min(2.0, (routeFitScore - 0.45) * 3));
  if (diffuse && isPrestige && urgency !== 'enterNow') bias -= 1.0;
  return Number(bias.toFixed(3));
}

function strongestSignals(profile, identityData, actorState) {
  const signals = [];
  if (profile.targetMatches) signals.push(`matches the stated ${profile.className} goal`);
  if (profile.routeMatchesBase && profile.baseClass) signals.push(`continues the ${profile.baseClass} route`);
  if (profile.routeMatchesStartingClass && profile.startingClass) signals.push(`respects the Level 1 ${profile.startingClass} chassis`);
  if (identityData.startingAnchor?.signal) signals.push(identityData.startingAnchor.signal);
  for (const match of profile.matchedTags.slice(0, 4)) {
    signals.push(`matches ${match.tag.replace(/_/g, ' ')} identity`);
  }
  const loadout = actorState?.equipmentProfile;
  if (loadout?.hasEquippedLightsaber && candidateTags(profile.className).some(tag => ['lightsaber', 'jedi_order', 'force'].includes(tag))) {
    signals.push('equipped lightsaber supports this route');
  }
  if (loadout?.dualLightsabers && candidateTags(profile.className).some(tag => ['lightsaber', 'melee', 'martial'].includes(tag))) {
    signals.push('two equipped lightsabers strengthen this combat lane');
  }
  if (loadout?.equippedArmorCount > 0 && candidateTags(profile.className).some(tag => ['armor', 'martial', 'defense'].includes(tag))) {
    signals.push('equipped armor supports this martial/defensive lane');
  }
  return Array.from(new Set(signals)).slice(0, 6);
}

function cautionSignals(profile, identityData) {
  const cautions = [];
  if (profile.diffuseBuild && profile.isPrestige && profile.urgency !== 'enterNow') {
    cautions.push('build identity is diffuse; prestige entry should wait for a clearer route signal');
  }
  if (profile.isPrestige && profile.readiness === 'ready' && ['weak', 'offRoute'].includes(profile.routeFit)) {
    cautions.push('legal prestige access is not enough by itself; this route does not match the demonstrated build yet');
  }
  if (profile.startingClass && !profile.routeMatchesStartingClass && profile.routeFit !== 'strong') {
    cautions.push(`this does not directly follow the Level 1 ${profile.startingClass} chassis`);
  }
  if (profile.readiness === 'almost') cautions.push('this is a forecast target, not the cleanest pick until the remaining gate is handled');
  if (profile.readiness === 'blocked') cautions.push('too many prerequisite gates remain for this to be treated as an immediate route');
  return Array.from(new Set(cautions)).slice(0, 4);
}

export class ClassRouteProfileEngine {
  static buildProfile(cls, actorState = {}, options = {}) {
    const className = cls?.name || options.className || 'Class';
    const isPrestige = cls?.isPrestige === true || cls?.prestigeClass === true || cls?.baseClass === false || options.isPrestige === true;
    const identityData = buildIdentity(actorState);
    const fit = routeFitFromIdentity(className, identityData, actorState, options);
    const readiness = readinessFromPrereqs(isPrestige, options.prereqCheck);
    const investments = investmentProfiles(actorState, identityData);
    const classShape = classCountShape(actorState);
    const diffuseBuild = classShape.diffuse;
    const urgency = urgencyFor({
      isPrestige,
      readiness,
      routeFit: fit.routeFit,
      routeFitScore: fit.routeFitScore,
      diffuse: diffuseBuild,
      targetMatches: fit.targetMatches,
    });

    const profile = {
      className,
      isPrestige,
      readiness,
      routeFit: fit.routeFit,
      routeFitScore: fit.routeFitScore,
      urgency,
      routeFamily: fit.routeFamily,
      routeFamilyLabel: fit.routeFamilyLabel,
      baseClass: fit.baseClass,
      startingClass: fit.startingClass,
      startingClassAnchor: identityData.startingAnchor,
      routeMatchesBase: fit.routeMatchesBase,
      routeMatchesStartingClass: fit.routeMatchesStartingClass,
      targetMatches: fit.targetMatches,
      targetRouteFamily: fit.targetRouteFamily,
      matchedTags: fit.matchedTags,
      dominantIdentity: identityData.topIdentity,
      investmentProfiles: investments,
      investmentShape: investments.find(entry => normalizeName(entry.className) === normalizeName(className))?.investmentShape || (diffuseBuild ? 'diffuse' : 'new'),
      diffuseBuild,
      supportingSignals: [],
      cautionSignals: [],
      sortBias: 0,
    };

    profile.supportingSignals = strongestSignals(profile, identityData, actorState);
    profile.cautionSignals = cautionSignals(profile, identityData);
    profile.sortBias = sortBiasFor({
      isPrestige,
      readiness,
      routeFitScore: fit.routeFitScore,
      urgency,
      diffuse: diffuseBuild,
    });

    return profile;
  }

  static familyForClass(className) {
    return familyForClass(className);
  }

  static familyLabel(family) {
    return familyLabel(family);
  }
}

export default ClassRouteProfileEngine;
