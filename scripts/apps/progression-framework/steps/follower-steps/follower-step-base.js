/**
 * FollowerStepBase — Base class for follower-specific progression steps.
 *
 * Followers are dependent actors. They are configured during follower chargen,
 * then re-derived from owner heroic level thereafter. They do not use heroic or
 * nonheroic choice-based level-up.
 */

import { ProgressionStepPlugin } from '../step-plugin-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';

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
    const ownerActorId = shell.progressionSession?.dependencyContext?.ownerActorId;
    if (!ownerActorId) return null;
    return game.actors.get(ownerActorId);
  }

  getFollowerChoices(shell) {
    const session = shell.progressionSession;
    const persistentChoices = session?.dependencyContext?.persistentChoices || {};
    const draft = session?.draftSelections || {};
    return {
      followerKind: draft.followerKind ?? persistentChoices.followerKind ?? null,
      speciesName: draft.speciesName ?? persistentChoices.speciesName ?? null,
      speciesId: draft.speciesId ?? persistentChoices.speciesId ?? null,
      templateType: draft.templateType ?? persistentChoices.templateType ?? null,
      skillChoices: draft.skillChoices ?? draft.followerSkills ?? persistentChoices.skillChoices ?? [],
      featChoices: draft.featChoices ?? draft.followerFeats ?? persistentChoices.featChoices ?? [],
      languageChoices: draft.languageChoices ?? draft.followerLanguages ?? persistentChoices.languageChoices ?? [],
      backgroundChoice: draft.backgroundChoice ?? draft.followerBackground ?? persistentChoices.backgroundChoice ?? null,
      abilityChoice: draft.abilityChoice ?? persistentChoices.abilityChoice ?? null,
      humanTemplateBonus: draft.humanTemplateBonus ?? persistentChoices.humanTemplateBonus ?? null,
      droidConfig: draft.droidConfig ?? persistentChoices.droidConfig ?? null,
      startingCredits: draft.startingCredits ?? persistentChoices.startingCredits ?? null,
      startingCreditsMode: draft.startingCreditsMode ?? persistentChoices.startingCreditsMode ?? null,
      startingCreditsFormula: draft.startingCreditsFormula ?? persistentChoices.startingCreditsFormula ?? null,
    };
  }

  saveFollowerChoice(shell, choiceType, value) {
    if (!shell.progressionSession) return;
    shell.progressionSession.draftSelections = shell.progressionSession.draftSelections || {};
    shell.progressionSession.draftSelections[choiceType] = value;
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

  getFixedTemplateAbility(templateType) {
    // Backwards-compatible alias for older callers. New follower chargen lets
    // organic followers choose between the template's two legal ability bonuses.
    return this.getDefaultTemplateAbility(templateType);
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

    if (!SpeciesRegistry.isInitialized()) {
      await SpeciesRegistry.initialize();
    }

    // Droid followers are selected from the dedicated follower-origin card and
    // configured by the droid chassis step. The living-species browser should not
    // mix droid chassis records into the organic species list.
    const allSpecies = SpeciesRegistry.getAll() || [];
    return allSpecies.filter(species => !this.isDroidSpeciesRecord(species));
  }

  async getFollowerFeatsForTemplate(templateType) {
    const templates = await this.getFollowerTemplates();
    const template = templates[templateType];

    if (!template) {
      swseLogger.warn('[FollowerStepBase] Unknown template:', templateType);
      return [];
    }

    return template.legalFeats || template.featChoices || [];
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
      const normalized = this._uniqueStrings(languages).filter(lang => !this._looksLikeBadLanguage(lang));
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
    return this._uniqueStrings(Array.isArray(raw) ? raw : [raw]).filter(Boolean);
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

    swseLogger.log('[FollowerStepBase] Resolved follower language rules:', {
      forced,
      ownerLanguages,
      pickCount
    });

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
    }

    for (const key of Object.keys(abilities)) {
      if (abilities[key].absent) {
        abilities[key].mod = 0;
      } else {
        abilities[key].mod = Math.floor((Number(abilities[key].base || 10) - 10) / 2);
      }
    }
    return abilities;
  }

  async getOwnerStartingCreditModel(ownerActor) {
    const classItems = Array.from(ownerActor?.items || []).filter(item => item.type === 'class');
    const baseNames = new Set(['jedi', 'noble', 'scoundrel', 'scout', 'soldier']);
    const baseClass = classItems.find(item => baseNames.has(String(item.name || '').toLowerCase()))
      || classItems.find(item => item.system?.base_class === true || item.system?.baseClass === true)
      || classItems[0]
      || null;
    const formula = baseClass?.system?.starting_credits || baseClass?.system?.startingCredits || null;
    const parsed = this.parseCreditFormula(formula);
    return {
      className: baseClass?.name || 'Owner class',
      formula: parsed.formula,
      max: parsed.max,
      average: parsed.average,
      raw: formula
    };
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

  _looksLikeBadLanguage(lang) {
    const value = String(lang || '').trim();
    return !value || /^\d+\s+more/i.test(value) || /\bEdit\b/i.test(value) || /\bMedium\b/i.test(value);
  }

  _uniqueStrings(values = []) {
    return Array.from(new Set((values || [])
      .flatMap(value => Array.isArray(value) ? value : [value])
      .filter(value => value !== undefined && value !== null && value !== '')
      .map(value => String(value).trim())
      .filter(Boolean)));
  }
}
