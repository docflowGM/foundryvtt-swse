/**
 * FollowerLanguageStep
 *
 * Uses the mature LanguageStep work surface and detail rail. Follower-specific
 * logic is limited to computing known languages and the follower bonus pick
 * count from the follower draft instead of the owner actor.
 */

import { LanguageStep } from '../language-step.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

function uniqueStrings(values = []) {
  return Array.from(new Set((values || [])
    .flatMap(value => Array.isArray(value) ? value : [value])
    .map(value => typeof value === 'string' ? value : (value?.name || value?.label || value?.id || ''))
    .map(value => String(value || '').trim())
    .filter(Boolean)));
}

export class FollowerLanguageStep extends LanguageStep {
  async onStepEnter(shell) {
    this._followerChoices = this._getFollowerChoices(shell);
    this._allLanguages = await this._getAllLanguages();
    await this._loadSpeciesLanguageRules();

    this._knownLanguages = await this._getKnownLanguages(shell?.actor, shell);
    this._bonusLanguagesAvailable = await this._calculateBonusLanguagesAvailable(shell?.actor, shell);
    this._restoreFollowerSelectedLanguages(shell);
    this._suggestedLanguages = [];
    shell.mentor.askMentorEnabled = false;

    swseLogger.log('[FollowerLanguageStep] Using normal language UI with follower authority', {
      species: this._followerChoices?.speciesName,
      known: this._knownLanguages,
      bonusSlots: this._bonusLanguagesAvailable,
      selected: this._selectedBonusLanguages,
    });
  }

  _getFollowerChoices(shell) {
    const draft = shell?.progressionSession?.draftSelections || {};
    const persistent = shell?.progressionSession?.dependencyContext?.persistentChoices || {};
    const species = draft.species || persistent.speciesSelection || null;
    return {
      speciesName: draft.speciesName || species?.name || persistent.speciesName || null,
      speciesSelection: species,
      backgroundSelection: draft.background || persistent.backgroundSelection || null,
      pendingBackgroundContext: draft.pendingBackgroundContext || draft.background?.pendingContext || persistent.pendingBackgroundContext || null,
      languageChoices: draft.languageChoices || draft.followerLanguages || persistent.languageChoices || [],
      templateType: draft.templateType || persistent.templateType || null,
      abilityChoice: draft.abilityChoice || persistent.abilityChoice || null,
      droidConfig: draft.droidConfig || persistent.droidConfig || null,
    };
  }

  async _getKnownLanguages(actor, shell) {
    const choices = this._getFollowerChoices(shell);
    const grants = [];
    const speciesRef = choices.speciesName || choices.speciesSelection?.name || choices.speciesSelection?.id || null;

    let usedSpeciesRule = false;
    if (speciesRef) {
      const speciesRule = this._resolveSpeciesLanguageRule(speciesRef);
      if (speciesRule?.languages?.length) {
        usedSpeciesRule = true;
        speciesRule.languages.forEach(entry => {
          const grant = this._makeLanguageGrant(entry.name, entry.origin || 'species', {
            mode: entry.mode || 'full',
            note: this._languageModeHint(entry.mode, entry.note),
          });
          if (grant) grants.push(grant);
        });
      }
    }

    if (!usedSpeciesRule) {
      const names = uniqueStrings([
        choices.speciesSelection?.languages,
        choices.speciesSelection?.system?.languages,
        choices.speciesSelection?.canonicalStats?.languages,
        choices.speciesSelection?.system?.canonicalStats?.languages,
      ]);
      names.forEach(lang => {
        const grant = this._makeLanguageGrant(lang, 'species');
        if (grant) grants.push(grant);
      });
    }

    if (!grants.some(grant => this._languageMatchesName(grant.name, 'Basic'))) {
      grants.push(this._makeLanguageGrant('Basic', 'default'));
    }

    const bgLanguages = uniqueStrings([
      choices.pendingBackgroundContext?.languages,
      choices.pendingBackgroundContext?.ledger?.languages?.granted,
      choices.backgroundSelection?.languages,
      choices.backgroundSelection?.system?.languages,
    ]);
    bgLanguages.forEach(lang => {
      const grant = this._makeLanguageGrant(lang, 'background');
      if (grant) grants.push(grant);
    });

    this._knownLanguageGrants = this._dedupeLanguageGrants(grants);
    return this._knownLanguageGrants.filter(grant => grant.isFull).map(grant => grant.name);
  }

  async _calculateBonusLanguagesAvailable(actor, shell) {
    const choices = this._getFollowerChoices(shell);
    const ability = this._computeFollowerAbilityPreview(choices);
    const intMod = Math.max(0, Number(ability?.int?.mod || 0));
    return 1 + intMod;
  }

  _restoreFollowerSelectedLanguages(shell) {
    const choices = this._getFollowerChoices(shell);
    const knownTokens = new Set(this._knownLanguages.map(value => this._normalizeLanguageToken(value)));
    const saved = uniqueStrings([
      choices.languageChoices,
      shell?.progressionSession?.draftSelections?.languages,
    ]).filter(name => !knownTokens.has(this._normalizeLanguageToken(name)));
    this._selectedBonusLanguages = saved.slice(0, Math.max(0, Number(this._bonusLanguagesAvailable || saved.length || 0)));
  }

  async _commitLanguageSelection(shell) {
    await super._commitLanguageSelection(shell);
    const allChosen = uniqueStrings([...this._knownLanguages, ...this._selectedBonusLanguages]);
    if (shell?.progressionSession?.draftSelections) {
      shell.progressionSession.draftSelections.languageChoices = allChosen;
      shell.progressionSession.draftSelections.followerLanguages = allChosen;
    }
  }

  _computeFollowerAbilityPreview(choices = {}) {
    const isDroid = choices?.droidConfig?.isDroid === true || String(choices?.speciesName || '').toLowerCase().includes('droid');
    const abilities = {
      str: { base: 10, mod: 0 },
      dex: { base: 10, mod: 0 },
      con: { base: isDroid ? 0 : 10, mod: 0, absent: isDroid },
      int: { base: 10, mod: 0 },
      wis: { base: 10, mod: 0 },
      cha: { base: 10, mod: 0 },
    };

    const templateOptions = { aggressive: ['str', 'con'], defensive: ['dex', 'wis'], utility: ['int', 'cha'] };
    if (isDroid) {
      const key = choices?.droidConfig?.abilityChoice;
      if (key && key !== 'con' && abilities[key]) abilities[key].base += 2;
    } else {
      const key = templateOptions[choices?.templateType]?.includes(choices?.abilityChoice)
        ? choices.abilityChoice
        : templateOptions[choices?.templateType]?.[0];
      if (key && abilities[key]) abilities[key].base += 2;
      const mods = choices?.speciesSelection?.abilityScores || choices?.speciesSelection?.abilityMods || choices?.speciesSelection?.system?.abilityMods || {};
      for (const [rawKey, rawValue] of Object.entries(mods || {})) {
        const abilityKey = String(rawKey || '').toLowerCase().slice(0, 3);
        if (abilities[abilityKey]) abilities[abilityKey].base += Number(rawValue || 0);
      }
    }

    for (const [key, data] of Object.entries(abilities)) {
      data.mod = data.absent ? 0 : Math.floor((Number(data.base || 10) - 10) / 2);
    }
    return abilities;
  }

  getMentorContext() {
    return 'Choose bonus languages using the normal language selector. Species and background languages are already listed as known.';
  }
}
