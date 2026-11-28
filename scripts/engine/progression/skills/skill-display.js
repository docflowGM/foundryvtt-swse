/**
 * Skill display helpers for progression UI.
 *
 * Keeps skill labels, ability coloring, and class-skill status consistent across
 * work surfaces, details rails, summary rails, and mentor popups.
 */

import SkillRegistry from '/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js';

export const ABILITY_LABELS = Object.freeze({
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
});

const SKILL_ABILITY_FALLBACK = Object.freeze({
  acrobatics: 'dex',
  climb: 'str',
  deception: 'cha',
  endurance: 'con',
  gatherinformation: 'cha',
  gatherinfo: 'cha',
  initiative: 'dex',
  jump: 'str',
  knowledgebureaucracy: 'int',
  knowledgegalacticlore: 'int',
  knowledgelifesciences: 'int',
  knowledgephysicalsciences: 'int',
  knowledgesocialsciences: 'int',
  knowledgetactics: 'int',
  knowledgetechnology: 'int',
  mechanics: 'int',
  perception: 'wis',
  persuasion: 'cha',
  pilot: 'dex',
  stealth: 'dex',
  survival: 'wis',
  swim: 'str',
  treatinjury: 'wis',
  usecomputer: 'int',
  usetheforce: 'cha',
});

function firstScalar(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') {
      const nested = firstScalar(
        value.key, value.slug, value.name, value.label, value.displayName, value.value,
        value.id, value._id, value.internalId, value.documentId, value.sourceId,
        value.skill, value.skillKey, value.skillId,
        value.system?.key, value.system?.name, value.system?.label, value.system?.skill,
        value.value?.key, value.value?.name, value.value?.label
      );
      if (nested) return nested;
      continue;
    }
    const text = String(value).trim();
    if (text && text !== '[object Object]') return text;
  }
  return '';
}

function rawSkillKey(value) {
  if (value === null || value === undefined) return '';
  const raw = typeof value === 'object'
    ? firstScalar(value.key, value.slug, value.system?.key, value.name, value.label, value.displayName, value.id, value._id, value.internalId, value.skill, value.skillKey, value.skillId)
    : value;
  return String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function resolveSkillEntry(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === 'object') {
    const id = firstScalar(value.id, value._id, value.internalId, value.documentId, value.sourceId, value.skillId);
    const key = firstScalar(value.key, value.slug, value.system?.key, value.skillKey, value.skill);
    const name = firstScalar(value.name, value.label, value.displayName, value.skill);
    return SkillRegistry?.getById?.(id)
      || SkillRegistry?.byKey?.(rawSkillKey(key))
      || SkillRegistry?.get?.(name)
      || SkillRegistry?.byKey?.(rawSkillKey(name))
      || null;
  }

  const raw = String(value || '').trim();
  const key = rawSkillKey(raw);
  return SkillRegistry?.getById?.(raw)
    || SkillRegistry?.byKey?.(key)
    || SkillRegistry?.get?.(raw)
    || null;
}

export function normalizeSkillKey(value) {
  const entry = resolveSkillEntry(value);
  if (entry) return rawSkillKey(entry.key || entry.name || entry.id);
  return rawSkillKey(value);
}

export function normalizeAbilityKey(value) {
  const key = String(value || '').toLowerCase().slice(0, 3);
  return Object.prototype.hasOwnProperty.call(ABILITY_LABELS, key) ? key : '';
}

export function getSkillAbility(value) {
  if (value && typeof value === 'object') {
    const direct = normalizeAbilityKey(value.ability || value.abilityKey || value.system?.ability || value.defaultAbility);
    if (direct) return direct;
  }

  const registryMatch = resolveSkillEntry(value);
  const registryAbility = normalizeAbilityKey(registryMatch?.ability || registryMatch?.system?.ability);
  if (registryAbility) return registryAbility;

  return SKILL_ABILITY_FALLBACK[normalizeSkillKey(value)] || '';
}

export function getSkillLabel(value) {
  if (value === null || value === undefined) return '';
  const registryMatch = resolveSkillEntry(value);
  if (registryMatch?.name) return String(registryMatch.name).trim();
  if (typeof value === 'object') {
    const scalar = firstScalar(
      value.name, value.label, value.displayName, value.skillName, value.skillLabel,
      value.key, value.slug, value.system?.name, value.system?.label, value.system?.key,
      value.value?.name, value.value?.label, value.value?.key,
      value.id, value._id, value.skill
    );
    return scalar && scalar !== '[object Object]' ? scalar : '';
  }
  const text = String(value).trim();
  return text === '[object Object]' ? '' : text;
}

export function buildClassSkillKeySet(classSkills = []) {
  return new Set((Array.isArray(classSkills) ? classSkills : [])
    .flatMap((skill) => {
      const entry = resolveSkillEntry(skill);
      const keys = [normalizeSkillKey(skill)];
      if (entry) keys.push(normalizeSkillKey(entry), normalizeSkillKey(entry.name), normalizeSkillKey(entry.id), normalizeSkillKey(entry.key));
      return keys;
    })
    .filter(Boolean));
}

export function buildSkillDisplay(value, { classSkillKeys = null } = {}) {
  const label = getSkillLabel(value);
  const key = normalizeSkillKey(value);
  const ability = getSkillAbility(value);
  const abilityLabel = ABILITY_LABELS[ability] || '';
  const isClassSkill = classSkillKeys instanceof Set ? classSkillKeys.has(key) : false;

  return {
    key,
    label,
    ability,
    abilityLabel,
    abilityClass: ability ? `prog-skill-token--${ability} swse-ability-label swse-ability-label--${ability}` : '',
    isClassSkill,
    statusClass: isClassSkill ? 'prog-skill-token--covered' : 'prog-skill-token--novel',
    statusLabel: isClassSkill ? 'Already a class skill' : 'New class skill option',
  };
}

export function buildSkillDisplays(values = [], options = {}) {
  return (Array.isArray(values) ? values : [])
    .map((value) => buildSkillDisplay(value, options))
    .filter((entry) => entry.label);
}
