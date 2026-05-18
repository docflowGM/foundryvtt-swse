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

export function normalizeSkillKey(value) {
  if (value === null || value === undefined) return '';
  const raw = typeof value === 'object'
    ? value.key || value.id || value.slug || value.name || value.label || ''
    : value;
  return String(raw).toLowerCase().replace(/[^a-z0-9]/g, '');
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

  const key = normalizeSkillKey(value);
  const registryMatch = SkillRegistry?.get?.(key)
    || SkillRegistry?.byKey?.(key)
    || SkillRegistry?.get?.(typeof value === 'object' ? value.name || value.label : value);
  const registryAbility = normalizeAbilityKey(registryMatch?.ability || registryMatch?.system?.ability);
  if (registryAbility) return registryAbility;

  return SKILL_ABILITY_FALLBACK[key] || '';
}

export function getSkillLabel(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const registryMatch = SkillRegistry?.get?.(value.name || value.label || value.id || value.key)
      || SkillRegistry?.byKey?.(value.key || value.id);
    return String(value.name || value.label || registryMatch?.name || value.id || value.key || '').trim();
  }
  const registryMatch = SkillRegistry?.get?.(value) || SkillRegistry?.byKey?.(normalizeSkillKey(value));
  return String(registryMatch?.name || value).trim();
}

export function buildClassSkillKeySet(classSkills = []) {
  return new Set((Array.isArray(classSkills) ? classSkills : [])
    .map((skill) => normalizeSkillKey(skill))
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
