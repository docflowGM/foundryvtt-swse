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
    id: 'deception.impersonate-specific-person',
    key: 'impersonate-specific-person',
    skill: 'deception',
    name: 'Impersonate Specific Person',
    actionCost: 'varies',
    dcBand: 'moderate',
    tags: ['deception', 'shapeshift', 'impersonation']
  },
  {
    id: 'deception.deceptive-appearance',
    key: 'deceptive-appearance',
    skill: 'deception',
    name: 'Create Deceptive Appearance',
    actionCost: 'varies',
    rushPenalty: -10,
    tags: ['deception', 'disguise', 'appearance']
  },
  {
    id: 'deception.disturbing-presence-movement',
    key: 'disturbing-presence-movement',
    skill: 'deception',
    name: 'Move Through Threatened Area',
    actionCost: 'part-of-move',
    dc: 15,
    movementCostMultiplier: 2,
    tags: ['movement', 'deception', 'threatened-area']
  },
  {
    id: 'persuasion.intimidate',
    key: 'intimidate',
    skill: 'persuasion',
    name: 'Intimidate',
    actionCost: 'full-round',
    tags: ['combat', 'persuasion', 'intimidate']
  },
  {
    id: 'persuasion.change-attitude',
    key: 'change-attitude',
    skill: 'persuasion',
    name: 'Change Attitude',
    actionCost: 'full-round',
    tags: ['social', 'persuasion', 'attitude']
  },
  {
    id: 'persuasion.haggle',
    key: 'haggle',
    skill: 'persuasion',
    name: 'Haggle',
    actionCost: 'varies',
    tags: ['social', 'commerce', 'persuasion', 'haggle']
  },
  {
    id: 'persuasion.bribery',
    key: 'bribery',
    skill: 'persuasion',
    name: 'Bribery',
    actionCost: 'varies',
    tags: ['social', 'commerce', 'persuasion', 'bribery']
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
    id: 'acrobatics.acrobatic-ally',
    key: 'acrobatic-ally',
    skill: 'acrobatics',
    name: 'Hoist or Toss Ally',
    actionCost: 'standard',
    dc: 20,
    tags: ['movement', 'acrobatics', 'ally']
  },
  {
    id: 'perception.scavenge-building-materials',
    key: 'scavenge-building-materials',
    skill: 'perception',
    name: 'Scavenge Building Materials',
    actionCost: '1 hour',
    resultDisplay: 'creditsScavenged',
    resultMultiplier: 30,
    resultUnit: 'credits',
    tags: ['perception', 'scavenging', 'construction-materials']
  },
  {
    id: 'gather-information.gather-information',
    key: 'gather-information',
    skill: 'gatherInformation',
    name: 'Gather Information',
    actionCost: 'varies',
    tags: ['social', 'investigation', 'gather-information']
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
    id: 'use-computer.astrogate',
    key: 'astrogate',
    skill: 'useComputer',
    name: 'Astrogate',
    actionCost: 'varies',
    tags: ['technical', 'use-computer', 'astrogation', 'hyperspace']
  },
  {
    id: 'use-computer.hyperspace-mapping',
    key: 'hyperspace-mapping',
    skill: 'useComputer',
    name: 'Hyperspace Mapping',
    actionCost: 'varies',
    tags: ['technical', 'use-computer', 'astrogation', 'hyperspace-mapping']
  },
  {
    id: 'mechanics.disable-device',
    key: 'disable-device',
    skill: 'mechanics',
    name: 'Disable Device',
    actionCost: 'varies',
    tags: ['technical', 'mechanics']
  },
  {
    id: 'mechanics.jury-rig',
    key: 'jury-rig',
    skill: 'mechanics',
    name: 'Jury-Rig',
    actionCost: 'full-round',
    trainedOnly: true,
    dc: 25,
    tags: ['technical', 'mechanics', 'repair']
  },
  {
    id: 'mechanics.repair-droid',
    key: 'repair-droid',
    skill: 'mechanics',
    name: 'Repair Droid',
    actionCost: '1 hour',
    trainedOnly: true,
    tags: ['technical', 'mechanics', 'repair', 'droid']
  },
  {
    id: 'mechanics.recharge-shields',
    key: 'recharge-shields',
    skill: 'mechanics',
    name: 'Recharge Shields',
    actionCost: 'three-swift-actions',
    trainedOnly: true,
    tags: ['technical', 'mechanics', 'vehicle', 'shields']
  },
  {
    id: 'mechanics.reroute-power',
    key: 'reroute-power',
    skill: 'mechanics',
    name: 'Reroute Power',
    actionCost: 'three-swift-actions',
    trainedOnly: true,
    tags: ['technical', 'mechanics', 'vehicle', 'power']
  },
  {
    id: 'endurance.restore-shields',
    key: 'restore-shields',
    skill: 'endurance',
    name: 'Restore Shields',
    actionCost: 'three-swift-actions',
    dc: 20,
    restoreShieldRating: 5,
    tags: ['droid', 'endurance', 'shields']
  },
  {
    id: 'treat-injury.surgery',
    key: 'surgery',
    skill: 'treatInjury',
    name: 'Surgery',
    actionCost: '1 hour',
    trainedOnly: true,
    tags: ['medical', 'treat-injury', 'surgery']
  },
  {
    id: 'treat-injury.install-cybernetic-device',
    key: 'install-cybernetic-device',
    skill: 'treatInjury',
    name: 'Install Cybernetic Device',
    actionCost: '1 hour',
    trainedOnly: true,
    dc: 20,
    tags: ['medical', 'treat-injury', 'surgery', 'cybernetics']
  },
  {
    id: 'treat-injury.install-bio-implant',
    key: 'install-bio-implant',
    skill: 'treatInjury',
    name: 'Install Bio-Implant',
    actionCost: '1 hour',
    trainedOnly: true,
    dc: 20,
    tags: ['medical', 'treat-injury', 'surgery', 'bio-implant']
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
