import { SkillRules } from "/systems/foundryvtt-swse/scripts/engine/skills/SkillRules.js";

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  try { return foundry?.utils?.deepClone?.(value) ?? JSON.parse(JSON.stringify(value)); }
  catch (_err) { return JSON.parse(JSON.stringify(value)); }
}

const BASE_EXTRA_SKILL_USES = [
  {
    id: 'deception.feint',
    key: 'feint',
    skill: 'deception',
    name: 'Feint',
    actionCost: 'standard',
    opposedDefense: 'will',
    tags: ['combat', 'deception', 'feint']
  },
  {
    id: 'persuasion.intimidate',
    key: 'intimidate',
    skill: 'persuasion',
    name: 'Intimidate',
    actionCost: 'standard',
    tags: ['combat', 'persuasion', 'intimidate']
  },
  {
    id: 'acrobatics.tumble',
    key: 'tumble',
    skill: 'acrobatics',
    name: 'Tumble',
    actionCost: 'move',
    tags: ['movement', 'acrobatics', 'tumble']
  },
  {
    id: 'use-computer.hack-system',
    key: 'hack-system',
    skill: 'use-computer',
    name: 'Hack System',
    actionCost: 'varies',
    tags: ['technical', 'use-computer']
  },
  {
    id: 'mechanics.disable-device',
    key: 'disable-device',
    skill: 'mechanics',
    name: 'Disable Device',
    actionCost: 'varies',
    tags: ['technical', 'mechanics']
  }
];

export class ExtraSkillUseRegistry {
  static _uses = new Map();
  static _registered = false;

  static registerDefaults() {
    if (this._registered) return;
    this._registered = true;
    for (const use of BASE_EXTRA_SKILL_USES) this.register(use);
  }

  static register(use = {}) {
    const skill = SkillRules.normalizeSkillKey(normalizeKey(use.skill ?? use.baseSkill ?? ''));
    const key = normalizeKey(use.key ?? use.extraUse ?? use.id ?? use.name ?? '');
    const id = normalizeKey(use.id ?? `${skill}.${key}`).replace(/\./g, '.');
    if (!skill || !key || !id) return null;
    const normalized = {
      ...clone(use),
      id,
      key,
      skill,
      baseSkill: skill,
      allowedSkills: Array.from(new Set([skill, ...((use.allowedSkills ?? []).map(s => SkillRules.normalizeSkillKey(normalizeKey(s))))])).filter(Boolean),
      name: use.name ?? key
    };
    this._uses.set(id, normalized);
    return clone(normalized);
  }

  static unregister(id) {
    return this._uses.delete(normalizeKey(id).replace(/\./g, '.'));
  }

  static get(idOrKey, skill = null) {
    this.registerDefaults();
    const normalized = normalizeKey(idOrKey).replace(/\./g, '.');
    if (this._uses.has(normalized)) return clone(this._uses.get(normalized));
    const skillKey = skill ? SkillRules.normalizeSkillKey(normalizeKey(skill)) : null;
    for (const use of this._uses.values()) {
      if (use.key === normalized && (!skillKey || use.skill === skillKey || use.allowedSkills?.includes(skillKey))) return clone(use);
    }
    return null;
  }

  static list({ skill = null, includeSkill = true } = {}) {
    this.registerDefaults();
    const skillKey = skill ? SkillRules.normalizeSkillKey(normalizeKey(skill)) : null;
    return Array.from(this._uses.values())
      .filter(use => !skillKey || use.skill === skillKey || (includeSkill && use.allowedSkills?.includes(skillKey)))
      .map(clone);
  }

  static extendAllowedSkill(extraUseId, skill, source = null) {
    this.registerDefaults();
    const id = normalizeKey(extraUseId).replace(/\./g, '.');
    const use = this._uses.get(id);
    if (!use) return null;
    const skillKey = SkillRules.normalizeSkillKey(normalizeKey(skill));
    if (!skillKey) return clone(use);
    use.allowedSkills = Array.from(new Set([...(use.allowedSkills ?? []), skillKey]));
    use.skillSubstitutionSources ??= [];
    if (source) use.skillSubstitutionSources.push(source);
    return clone(use);
  }

  static normalizeKey(value) {
    return normalizeKey(value);
  }
}

ExtraSkillUseRegistry.registerDefaults();

export default ExtraSkillUseRegistry;
