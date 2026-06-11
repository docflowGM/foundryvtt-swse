/**
 * FollowerStepBase — thin follower-only adapter helpers.
 *
 * Follower creation uses the normal progression shell/step contract. This base is
 * only for the genuinely follower-specific steps and for mirroring follower-only
 * choices into the canonical ProgressionSession.
 */

import { ProgressionStepPlugin } from '../step-plugin-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { getFollowerTalentConfig } from '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js';

const TEMPLATE_ABILITY_OPTIONS = Object.freeze({
  aggressive: ['str', 'con'],
  defensive: ['dex', 'wis'],
  utility: ['int', 'cha']
});

const BASE_LANGUAGE_FALLBACK = [
  'Basic', 'Binary', 'Bocce', 'Bothese', 'Dosh', 'Durese', 'Ewokese', 'Gamorrean',
  'Gunganese', 'High Galactic', 'Huttese', 'Ithorese', 'Jawa Trade Language',
  'Kel Dor', 'Mon Calamarian', 'Quarrenese', 'Rodese', 'Shyriiwook', 'Sith',
  'Sullustese', 'Togruti', 'Twi\'leki', 'Ubese', 'Zabrak'
];

export class FollowerStepBase extends ProgressionStepPlugin {
  getOwnerActor(shell) {
    const ownerActorId = shell?.progressionSession?.dependencyContext?.ownerActorId;
    return ownerActorId ? game?.actors?.get?.(ownerActorId) || shell?.ownerActor || shell?.actor || null : shell?.ownerActor || shell?.actor || null;
  }

  getFollowerChoices(shell) {
    const session = shell?.progressionSession;
    const persistentChoices = session?.dependencyContext?.persistentChoices || {};
    const draft = session?.draftSelections || {};
    const species = draft.species || null;
    const background = draft.background || null;
    const skills = draft.skills || null;
    const languages = draft.languages || null;

    return {
      followerKind: draft.followerKind ?? persistentChoices.followerKind ?? null,
      followerName: draft.followerName ?? persistentChoices.followerName ?? '',
      speciesName: draft.speciesName ?? species?.name ?? persistentChoices.speciesName ?? null,
      speciesId: draft.speciesId ?? species?.id ?? species?.sourceId ?? persistentChoices.speciesId ?? null,
      speciesSelection: species || persistentChoices.speciesSelection || null,
      pendingSpeciesContext: draft.pendingSpeciesContext || species?.pendingContext || persistentChoices.pendingSpeciesContext || null,
      templateType: draft.templateType ?? persistentChoices.templateType ?? null,
      skillChoices: draft.skillChoices ?? draft.followerSkills ?? this._extractSkillChoices(skills) ?? persistentChoices.skillChoices ?? [],
      featChoices: draft.featChoices ?? draft.followerFeats ?? persistentChoices.featChoices ?? [],
      languageChoices: draft.languageChoices ?? draft.followerLanguages ?? this._extractLanguageChoices(languages) ?? persistentChoices.languageChoices ?? [],
      backgroundChoice: draft.backgroundChoice ?? draft.followerBackground ?? this._extractBackgroundChoice(background) ?? persistentChoices.backgroundChoice ?? null,
      backgroundSelection: background || persistentChoices.backgroundSelection || null,
      abilityChoice: draft.abilityChoice ?? persistentChoices.abilityChoice ?? null,
      humanTemplateBonus: draft.humanTemplateBonus ?? persistentChoices.humanTemplateBonus ?? null,
      droidConfig: draft.droidConfig ?? persistentChoices.droidConfig ?? null,
      startingCredits: draft.startingCredits ?? persistentChoices.startingCredits ?? null,
      startingCreditsMode: draft.startingCreditsMode ?? persistentChoices.startingCreditsMode ?? null,
      startingCreditsFormula: draft.startingCreditsFormula ?? persistentChoices.startingCreditsFormula ?? null,
      fixedFollowerProfile: draft.fixedFollowerProfile ?? persistentChoices.fixedFollowerProfile ?? null,
    };
  }

  getFollowerGrantConfig(shell) {
    const ctx = shell?.progressionSession?.dependencyContext || {};
    return getFollowerTalentConfig(ctx.slotTalentName, { treeId: ctx.slotTalentTreeId })
      || getFollowerTalentConfig(ctx.slotTalentName)
      || null;
  }

  getFixedFollowerProfile(shell) {
    const cfg = this.getFollowerGrantConfig(shell);
    return cfg?.fixedFollowerProfile
      || shell?.progressionSession?.draftSelections?.fixedFollowerProfile
      || shell?.progressionSession?.dependencyContext?.persistentChoices?.fixedFollowerProfile
      || null;
  }

  hasFixedFollowerProfile(shell) {
    return !!this.getFixedFollowerProfile(shell);
  }

  usesFixedFollowerAbilities(shell) {
    const profile = this.getFixedFollowerProfile(shell);
    return profile?.fixedAbilityScores === true || profile?.noTemplateAbilityBonus === true;
  }

  applyFixedFollowerProfileDefaults(shell) {
    if (!shell?.progressionSession) return null;
    const cfg = this.getFollowerGrantConfig(shell);
    const profile = cfg?.fixedFollowerProfile;
    if (!profile) return null;

    const draft = shell.progressionSession.draftSelections = shell.progressionSession.draftSelections || {};
    draft.fixedFollowerProfile = structuredClone(profile);
    draft.followerKind = profile.followerKind || draft.followerKind || 'living';
    draft.speciesName = profile.speciesName || draft.speciesName || null;
    draft.speciesId = profile.speciesId || null;
    draft.species = {
      id: profile.id,
      name: profile.speciesName,
      speciesType: profile.speciesType,
      size: profile.size,
      speed: profile.speed,
      movement: profile.movement
    };
    draft.speciesSelection = draft.species;
    draft.droidConfig = null;
    if (profile.noTemplateAbilityBonus || profile.fixedAbilityScores) draft.abilityChoice = null;
    if (profile.noStartingCredits || cfg?.noStartingCredits) {
      draft.startingCredits = 0;
      draft.startingCreditsMode = 'none';
      draft.startingCreditsFormula = null;
    }
    if (profile.skipBackground || cfg?.skipBackground) {
      draft.backgroundChoice = null;
      draft.backgroundSelection = null;
      draft.background = null;
    }
    if (profile.skipLanguages || cfg?.skipLanguages) {
      draft.languageChoices = [];
      draft.followerLanguages = [];
      draft.languages = [];
    }
    shell.progressionSession.lastModifiedAt = Date.now();
    return profile;
  }

  _extractSkillChoices(skills) {
    if (!skills) return null;
    if (Array.isArray(skills)) return skills;
    if (Array.isArray(skills.trained)) return skills.trained;
    if (Array.isArray(skills.trainedSkills)) return skills.trainedSkills;
    if (Array.isArray(skills.skillChoices)) return skills.skillChoices;
    if (skills.selected && typeof skills.selected === 'object') {
      return Object.entries(skills.selected).filter(([, value]) => value === true || value?.trained).map(([key]) => key);
    }
    return null;
  }

  _extractLanguageChoices(languages) {
    if (!languages) return null;
    if (Array.isArray(languages)) return languages;
    if (Array.isArray(languages.selected)) return languages.selected;
    if (Array.isArray(languages.languages)) return languages.languages;
    if (Array.isArray(languages.known)) return languages.known;
    return null;
  }

  _extractBackgroundChoice(background) {
    if (!background) return null;
    if (Array.isArray(background.backgroundIds) && background.backgroundIds.length) return background.backgroundIds[0];
    return background.id || background.backgroundId || background.name || null;
  }

  saveFollowerChoice(shell, choiceType, value) {
    if (!shell?.progressionSession) return;
    shell.progressionSession.draftSelections = shell.progressionSession.draftSelections || {};
    shell.progressionSession.draftSelections[choiceType] = value;
    shell.progressionSession.lastModifiedAt = Date.now();
    swseLogger.debug('[FollowerStep] Saved choice:', { choiceType, value });
  }

  async getFollowerTemplates() {
    const { FollowerCreator } = await import('../../../follower-creator.js');
    return await FollowerCreator.getFollowerTemplates();
  }

  getTemplateAbilityOptions(templateType) {
    return TEMPLATE_ABILITY_OPTIONS[templateType] || [];
  }

  getDefaultTemplateAbility(templateType) {
    return this.getTemplateAbilityOptions(templateType)[0] || null;
  }

  isHumanSpecies(speciesName) {
    return String(speciesName || '').trim().toLowerCase() === 'human';
  }

  isDroidSpeciesRecord(species) {
    const name = String(species?.name || '').toLowerCase();
    const system = species?.system || species || {};
    return name === 'droid'
      || name.includes('droid')
      || system.speciesActsAsDroid === true
      || system.noConstitution === true
      || !!system.droidBuilder
      || (Array.isArray(system.tags) && system.tags.some(tag => String(tag).toLowerCase().includes('droid')));
  }

  isDroidFollowerChoice(choices) {
    return choices?.followerKind === 'droid'
      || choices?.droidConfig?.isDroid === true
      || this.isDroidSpeciesRecord({ name: choices?.speciesName, system: choices?.speciesSystem || {} });
  }

  async getFollowerCompatibleSpecies() {
    const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
    if (!SpeciesRegistry.isInitialized()) await SpeciesRegistry.initialize();
    return (SpeciesRegistry.getAll() || []).filter(species => !this.isDroidSpeciesRecord(species));
  }

  async getFollowerSkillsForTemplate(templateType) {
    switch (templateType) {
      case 'aggressive':
      case 'defensive':
        return ['Endurance'];
      case 'utility':
        return [
          'Acrobatics', 'Climb', 'Deception', 'Endurance', 'Gather Information',
          'Initiative', 'Jump', 'Knowledge (Bureaucracy)', 'Knowledge (Galactic Lore)',
          'Knowledge (Life Sciences)', 'Knowledge (Physical Sciences)', 'Knowledge (Social Sciences)',
          'Knowledge (Tactics)', 'Knowledge (Technology)', 'Mechanics', 'Perception',
          'Persuasion', 'Pilot', 'Ride', 'Stealth', 'Survival', 'Swim', 'Treat Injury',
          'Use Computer'
        ];
      default:
        return [];
    }
  }

  async getSpeciesLanguages(speciesName) {
    const fallback = ['Basic'];
    if (!speciesName) return fallback;
    try {
      const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
      if (!SpeciesRegistry.isInitialized()) await SpeciesRegistry.initialize();
      const species = SpeciesRegistry.getByName(speciesName);
      const languages = species?.languages || species?.system?.languages || species?.system?.canonicalStats?.languages || [];
      const raw = this._uniqueStrings(languages);
      const contaminated = raw.some(lang => this._looksLikeBadLanguage(lang));
      if (contaminated && speciesName && String(speciesName).toLowerCase() !== 'droid') {
        return this._uniqueStrings([speciesName, 'Basic']);
      }
      const normalized = raw.filter(lang => !this._looksLikeBadLanguage(lang));
      return normalized.length ? normalized : fallback;
    } catch (err) {
      swseLogger.warn('[FollowerStepBase] Could not resolve species languages:', err);
      return fallback;
    }
  }

  async getAllLanguages() {
    try {
      const { LanguageRegistry } = await import('/systems/foundryvtt-swse/scripts/registries/language-registry.js');
      await LanguageRegistry.ensureLoaded?.();
      const all = LanguageRegistry.getAll?.() || [];
      const names = all.map(lang => lang?.name || lang?.label || lang?.id).filter(Boolean);
      if (names.length) return this._uniqueStrings(names);
    } catch (_err) {
      // Fall back to a stable core list if the registry is unavailable in this context.
    }
    return BASE_LANGUAGE_FALLBACK;
  }

  getOwnerLanguages(ownerActor) {
    const raw = ownerActor?.system?.languages || [];
    const values = Array.isArray(raw) ? raw : [raw?.value, raw?.custom, raw].flat();
    return this._uniqueStrings(values).filter(Boolean);
  }

  getFollowerLanguagePickCount(choices = {}) {
    const ability = this.computeFollowerAbilityPreview(choices);
    const intMod = Math.max(0, Number(ability?.int?.mod || 0));
    return 1 + intMod;
  }

  async getFollowerLanguages(ownerActor, speciesName, choices = {}) {
    const speciesLanguages = await this.getSpeciesLanguages(speciesName);
    const forced = this._uniqueStrings([...speciesLanguages, 'Basic']);
    const ownerLanguages = this.getOwnerLanguages(ownerActor).filter(lang => !forced.includes(lang));
    const allLanguages = (await this.getAllLanguages()).filter(lang => !forced.includes(lang));
    const pickCount = this.getFollowerLanguagePickCount(choices);

    swseLogger.log('[FollowerStepBase] Resolved follower language rules:', { forced, ownerLanguages, pickCount });
    return { forced, ownerLanguages, allLanguages, pickCount };
  }

  computeFollowerAbilityPreview(choices = {}) {
    const isDroid = choices?.droidConfig?.isDroid === true || String(choices?.speciesName || '').toLowerCase().includes('droid');
    const abilities = {
      str: { base: 10, mod: 0 },
      dex: { base: 10, mod: 0 },
      con: { base: isDroid ? 0 : 10, mod: 0, absent: isDroid },
      int: { base: 10, mod: 0 },
      wis: { base: 10, mod: 0 },
      cha: { base: 10, mod: 0 }
    };

    if (isDroid) {
      const key = choices?.droidConfig?.abilityChoice;
      if (key && key !== 'con' && abilities[key]) abilities[key].base += 2;
    } else {
      const key = choices?.abilityChoice || this.getDefaultTemplateAbility(choices?.templateType);
      if (key && abilities[key]) abilities[key].base += 2;
      const speciesMods = this._extractSpeciesAbilityMods(choices);
      for (const [ability, mod] of Object.entries(speciesMods || {})) {
        const key = String(ability).toLowerCase().slice(0, 3);
        if (abilities[key]) abilities[key].base += Number(mod || 0);
      }
    }

    for (const key of Object.keys(abilities)) {
      abilities[key].mod = abilities[key].absent ? 0 : Math.floor((Number(abilities[key].base || 10) - 10) / 2);
    }
    return abilities;
  }

  _extractSpeciesAbilityMods(choices = {}) {
    const normalize = (raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
      const out = {};
      for (const [rawKey, rawValue] of Object.entries(raw)) {
        const key = String(rawKey || '').toLowerCase().slice(0, 3);
        if (!['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(key)) continue;
        const value = Number(rawValue);
        if (Number.isFinite(value) && value !== 0) out[key] = value;
      }
      return out;
    };
    const candidates = [
      choices.speciesAbilityMods,
      choices.speciesSelection?.abilityScores,
      choices.speciesSelection?.abilityMods,
      choices.speciesSelection?.speciesData?.abilityScores,
      choices.speciesSelection?.speciesData?.abilityMods,
      choices.speciesSelection?.speciesData?.system?.abilityMods,
      choices.speciesSelection?.speciesData?.system?.canonicalStats?.abilityMods,
      choices.pendingSpeciesContext?.abilities,
      choices.pendingSpeciesContext?.identity?.doc?.abilityScores,
      choices.pendingSpeciesContext?.identity?.doc?.abilityMods,
      choices.pendingSpeciesContext?.identity?.doc?.system?.abilityMods,
      choices.pendingSpeciesContext?.identity?.doc?.system?.canonicalStats?.abilityMods,
    ];
    for (const candidate of candidates) {
      const mods = normalize(candidate);
      if (Object.keys(mods).length) return mods;
    }
    return {};
  }

  async getOwnerStartingCreditModel(ownerActor) {
    const baseNames = new Set(['jedi', 'noble', 'scoundrel', 'scout', 'soldier']);
    const cleanClassName = (value) => String(value || '').trim().replace(/\s+\d+$/, '');
    const classItems = Array.from(ownerActor?.items || []).filter(item => item.type === 'class');
    const baseClass = classItems.find(item => baseNames.has(cleanClassName(item.name).toLowerCase()) || baseNames.has(String(item.system?.classId || '').toLowerCase()))
      || classItems.find(item => item.system?.base_class === true || item.system?.baseClass === true)
      || classItems[0]
      || null;

    const registryClass = await this._resolveClassModel(cleanClassName(baseClass?.name) || ownerActor?.system?.class?.name || ownerActor?.system?.class);
    const formula = baseClass?.system?.starting_credits
      || baseClass?.system?.startingCredits
      || registryClass?.startingCredits
      || registryClass?.system?.starting_credits
      || registryClass?.system?.startingCredits
      || null;
    const parsed = this.parseCreditFormula(formula);
    return {
      className: cleanClassName(baseClass?.name) || registryClass?.name || 'Owner class',
      formula: parsed.formula,
      max: parsed.max,
      average: parsed.average,
      raw: formula
    };
  }

  async _resolveClassModel(name) {
    if (!name) return null;
    try {
      const { ClassesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js');
      await ClassesRegistry.initialize?.();
      return ClassesRegistry.getByName?.(String(name)) || ClassesRegistry.resolveModel?.(name) || null;
    } catch (err) {
      swseLogger.warn('[FollowerStepBase] Class registry unavailable for credits fallback:', err);
      return null;
    }
  }

  parseCreditFormula(raw) {
    const text = String(raw || '').trim();
    if (!text) return { formula: null, max: 0, average: 0 };
    const normalized = text.replace(/[×x]/gi, 'x').replace(/\s+/g, ' ');
    const match = normalized.match(/^(\d+)d(\d+)\s*x\s*(\d+)$/i);
    if (!match) {
      const value = Number(normalized.replace(/[^0-9.]/g, '')) || 0;
      return { formula: value ? String(value) : null, max: value, average: value };
    }
    const count = Number(match[1]);
    const die = Number(match[2]);
    const multiplier = Number(match[3]);
    return {
      formula: `${count}d${die} * ${multiplier}`,
      max: count * die * multiplier,
      average: Math.floor(count * ((die + 1) / 2) * multiplier)
    };
  }

  getStepData() {
    return { stepId: this.descriptor?.stepId };
  }

  renderWorkSurface(stepData = {}) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/follower-work-surface.hbs',
      data: { stepId: this.descriptor?.stepId, ...stepData }
    };
  }

  async afterRender(shell, workSurfaceEl) {
    if (typeof this.onRender === 'function') {
      await this.onRender(shell, workSurfaceEl, {});
    }
  }

  getSelection(shell) {
    const issues = this.getBlockingIssues(shell);
    return { selected: [], count: 0, isComplete: issues.length === 0 };
  }

  validate(shell) {
    const errors = this.getBlockingIssues(shell);
    return { isValid: errors.length === 0, errors, warnings: [] };
  }

  getBlockingIssues() {
    return [];
  }

  _looksLikeBadLanguage(lang) {
    const value = String(lang || '').trim();
    return !value || /^\d+\s+more/i.test(value) || /\bEdit\b/i.test(value) || /\bMedium\b/i.test(value) || /\bin:\s*Species/i.test(value);
  }

  _uniqueStrings(values = []) {
    return Array.from(new Set((values || [])
      .flatMap(value => Array.isArray(value) ? value : String(value || '').split(','))
      .filter(value => value !== undefined && value !== null && value !== '')
      .map(value => String(value).trim())
      .filter(Boolean)));
  }
}
