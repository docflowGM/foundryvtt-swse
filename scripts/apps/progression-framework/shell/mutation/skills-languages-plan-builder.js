/**
 * SkillsLanguagesPlanBuilder
 *
 * Domain compiler for progression skill and language mutations.
 *
 * This module is side-effect free except for optional reads through
 * ProgressionContentAuthority to resolve granted chargen languages.
 */

import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';

function canonicalSkillKey(value) {
  const firstScalar = (input) => {
    if (input === null || input === undefined) return '';
    if (typeof input === 'object') {
      return firstScalar(
        input.key ?? input.slug ?? input.system?.key ?? input.skillKey ?? input.skillId ?? input.skill
        ?? input.value?.key ?? input.value?.slug ?? input.value?.skillKey ?? input.value?.skillId
        ?? input.name ?? input.label ?? input.displayName ?? input.value?.name ?? input.value?.label
        ?? input.id ?? input._id ?? input.internalId
      );
    }
    const text = String(input).trim();
    return text && text !== '[object Object]' ? text : '';
  };

  const raw = firstScalar(value);
  if (!raw) return '';
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const idMap = {
    '2b9e43f710664b31': 'useTheForce',
    '34a9c3f170eb9f40': 'climb',
    '35df8faa4878f2c5': 'endurance',
    '426945d1fc765a5d': 'survival',
    '43c5941072ec78af': 'perception',
    '633a13c5fa6101d7': 'treatInjury',
    '6d2ac22d9fcf402f': 'stealth',
    '745a5686d6f21e8c': 'mechanics',
    '8f5e21f92d6d976b': 'useComputer',
    '9410ce2dfb6cefcb': 'deception',
    '97f68d85ad68b921': 'jump',
    'a3855d8f08016487': 'knowledge',
    'a6c5e98148aad9a9': 'acrobatics',
    'b554f3e5a55ad53f': 'persuasion',
    'b8dad0c963f046c6': 'pilot',
    'c9bf381579013b18': 'gatherInformation',
    'cb5493f65f0bdb62': 'initiative',
    'd0b0f5e45327b476': 'ride',
    'f77c3576d22552fe': 'swim',
  };
  const map = {
    acrobatics: 'acrobatics',
    climb: 'climb',
    deception: 'deception',
    endurance: 'endurance',
    gatherinformation: 'gatherInformation',
    gatherinfo: 'gatherInformation',
    initiative: 'initiative',
    jump: 'jump',
    knowledge: 'knowledge',
    knowledgebureaucracy: 'knowledgeBureaucracy',
    knowledgegalacticlore: 'knowledgeGalacticLore',
    knowledgelifesciences: 'knowledgeLifeSciences',
    knowledgephysicalsciences: 'knowledgePhysicalSciences',
    knowledgesocialsciences: 'knowledgeSocialSciences',
    knowledgetactics: 'knowledgeTactics',
    knowledgetechnology: 'knowledgeTechnology',
    mechanics: 'mechanics',
    perception: 'perception',
    persuasion: 'persuasion',
    pilot: 'pilot',
    ride: 'ride',
    stealth: 'stealth',
    survival: 'survival',
    swim: 'swim',
    treatinjury: 'treatInjury',
    usecomputer: 'useComputer',
    usetheforce: 'useTheForce',
    useforce: 'useTheForce',
    utf: 'useTheForce',
  };

  let resolved = idMap[normalized] || map[normalized] || '';

  if (!resolved) {
    try {
      const packIndex = globalThis.game?.packs?.get?.('foundryvtt-swse.skills')?.index;
      const contents = packIndex?.contents || (typeof packIndex?.values === 'function' ? Array.from(packIndex.values()) : []);
      const hit = contents.find(entry => [entry?.id, entry?._id, entry?.name]
        .some(candidate => String(candidate || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '') === normalized));
      if (hit?.name) resolved = map[String(hit.name).toLowerCase().replace(/[^a-z0-9]+/g, '')] || idMap[String(hit.id || hit._id || '').toLowerCase()] || '';
    } catch (_err) {
      // Registry lookup is best-effort only.
    }
  }

  if (!resolved) return '';

  const athleticsComponents = new Set(['acrobatics', 'climb', 'jump', 'swim']);
  if (athleticsComponents.has(resolved)) {
    try { if (game.settings.get('foundryvtt-swse', 'athleticsConsolidation') === true) return 'athletics'; } catch { /* off */ }
  }
  return resolved;
}

function normalizeSkillSelectionEntries(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills
      .map((entry) => {
        if (typeof entry === 'string') return { key: canonicalSkillKey(entry), trained: true };
        const key = canonicalSkillKey(entry?.key || entry?.id || entry?.skill || entry?.name || null);
        return key ? { ...entry, key, trained: entry?.trained !== undefined ? !!entry.trained : true } : null;
      })
      .filter(Boolean);
  }
  if (Array.isArray(skills?.trained)) {
    return skills.trained
      .map((entry) => {
        if (typeof entry === 'string') return { key: canonicalSkillKey(entry), trained: true };
        const key = canonicalSkillKey(entry?.key || entry?.id || entry?.skill || entry?.name || null);
        return key ? { ...entry, key, trained: true } : null;
      })
      .filter(Boolean);
  }
  if (typeof skills === 'object') {
    return Object.entries(skills)
      .map(([key, entry]) => {
        if (entry === true) {
          const canonical = canonicalSkillKey(key);
          return canonical ? { key: canonical, trained: true } : null;
        }
        if (entry?.trained === true) {
          const canonical = canonicalSkillKey(entry?.key || entry?.id || key);
          return canonical ? { ...entry, key: canonical, trained: true } : null;
        }
        return null;
      })
      .filter(Boolean);
  }
  return [];
}

function normalizeNameKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
}

function extractSkillFocusKeysFromSelections(selections = {}) {
  const feats = [
    ...(Array.isArray(selections.feats) ? selections.feats : []),
    ...(Array.isArray(selections.selectedFeats) ? selections.selectedFeats : []),
  ];
  const keys = [];
  for (const feat of feats) {
    const name = String(feat?.name || feat?.label || feat || '').trim();
    const match = name.match(/^Skill\s+Focus\s*\(([^)]+)\)/i);
    if (match) {
      const key = canonicalSkillKey(match[1].trim());
      if (key) keys.push(key);
    }
    const selectedChoice = feat?.system?.selectedChoice || feat?.selectedChoice || feat?.choice || feat?.choiceValue || null;
    const choiceKey = canonicalSkillKey(selectedChoice);
    if (choiceKey) keys.push(choiceKey);
  }
  return Array.from(new Set(keys));
}

function extractActorLanguageNames(actor) {
  const languages = actor?.system?.languages || [];
  if (Array.isArray(languages)) return languages.map(lang => typeof lang === 'string' ? lang : lang?.name || lang?.label || lang?.id).filter(Boolean);
  if (typeof languages === 'object') {
    return Object.entries(languages)
      .filter(([, value]) => value === true || value?.known === true || value?.selected === true)
      .map(([key, value]) => value?.name || value?.label || value?.id || key)
      .filter(Boolean);
  }
  return [];
}

function extractActorLanguageIds(actor) {
  const explicit = actor?.system?.languageIds || actor?.system?.language_ids || [];
  if (Array.isArray(explicit) && explicit.length) return explicit.map(lang => typeof lang === 'string' ? lang : lang?.id || lang?.name).filter(Boolean);
  const languages = actor?.system?.languages || [];
  if (Array.isArray(languages)) return languages.map(lang => typeof lang === 'string' ? lang : lang?.id || lang?.name).filter(Boolean);
  if (typeof languages === 'object') {
    return Object.entries(languages)
      .filter(([, value]) => value === true || value?.known === true || value?.selected === true)
      .map(([key, value]) => value?.id || value?.name || key)
      .filter(Boolean);
  }
  return [];
}

function languageName(entry) {
  return typeof entry === 'string' ? entry : entry?.name || entry?.label || entry?.language || entry?.value || entry?.id || entry?._id || entry?.internalId || entry?.slug;
}

function languageId(entry) {
  return typeof entry === 'string' ? entry : entry?.internalId || entry?._id || entry?.id || entry?.slug || entry?.name;
}

export class SkillsLanguagesPlanBuilder {
  static canonicalSkillKey(value) { return canonicalSkillKey(value); }
  static normalizeSkillSelectionEntries(skills) { return normalizeSkillSelectionEntries(skills); }
  static extractSkillFocusKeysFromSelections(selections = {}) { return extractSkillFocusKeysFromSelections(selections); }
  static extractActorLanguageNames(actor) { return extractActorLanguageNames(actor); }
  static extractActorLanguageIds(actor) { return extractActorLanguageIds(actor); }

  static buildSkillsSet({ actor, selections = {}, sessionState = {}, levelUpManifest = null } = {}) {
    const set = {};
    const skillEntries = normalizeSkillSelectionEntries(selections.skills || []);
    for (const s of skillEntries) {
      const key = canonicalSkillKey(s?.key || s?.id || s?.skill);
      if (!key) continue;
      set[`system.skills.${key}.trained`] = s.trained !== undefined ? !!s.trained : true;
      if (s.miscMod !== undefined || sessionState.mode === 'chargen') set[`system.skills.${key}.miscMod`] = s.miscMod || 0;
      if (s.focused !== undefined || sessionState.mode === 'chargen') set[`system.skills.${key}.focused`] = s.focused !== undefined ? !!s.focused : false;
      if (s.selectedAbility !== undefined || sessionState.mode === 'chargen') set[`system.skills.${key}.selectedAbility`] = s.selectedAbility || '';
    }

    for (const key of extractSkillFocusKeysFromSelections(selections)) {
      if (key) set[`system.skills.${key}.focused`] = true;
    }

    if (sessionState.mode === 'levelup' && Array.isArray(levelUpManifest?.classSkills) && levelUpManifest.classSkills.length) {
      const classSkillSources = Array.isArray(actor?.system?.progression?.classSkillSources)
        ? [...actor.system.progression.classSkillSources]
        : [];
      const seenClassSkillSources = new Set(classSkillSources.map(entry => `${entry?.id || entry?.key || entry?.name}::${entry?.classId || ''}`));
      for (const entry of levelUpManifest.classSkills) {
        const rawKey = entry.key || entry.id || entry.name;
        const skillKey = canonicalSkillKey(rawKey);
        if (skillKey) set[`system.skills.${skillKey}.classSkill`] = true;
        const sourceKey = `${entry.id || entry.key || entry.name}::${entry.classId || ''}`;
        if (!seenClassSkillSources.has(sourceKey)) {
          classSkillSources.push(entry);
          seenClassSkillSources.add(sourceKey);
        }
      }
      set['system.progression.classSkillSources'] = classSkillSources;
    }

    return set;
  }

  static async buildLanguagesSet({ actor, selections = {}, sessionState = {} } = {}) {
    const set = {};
    const selectedLanguageEntries = Array.isArray(selections.languages) ? selections.languages : [];
    let grantedLanguageEntries = [];
    if (sessionState.mode === 'chargen') {
      try {
        grantedLanguageEntries = await ProgressionContentAuthority.getGrantedLanguageEntries({
          speciesSelection: selections.species,
          backgroundSelection: selections.background,
        }) || [];
      } catch (_err) {
        grantedLanguageEntries = [];
      }
    }

    const allLanguageEntries = [...grantedLanguageEntries, ...selectedLanguageEntries];
    if (sessionState.mode !== 'chargen' && selectedLanguageEntries.length <= 0) return set;

    const languageNames = allLanguageEntries.map(languageName).filter(Boolean);
    const languageIds = allLanguageEntries.map(languageId).filter(Boolean);
    const existingLanguageNames = sessionState.mode === 'levelup' ? extractActorLanguageNames(actor) : [];
    const existingLanguageIds = sessionState.mode === 'levelup' ? extractActorLanguageIds(actor) : [];
    set['system.languages'] = Array.from(new Set([...existingLanguageNames, ...languageNames]));
    set['system.languageIds'] = Array.from(new Set([...existingLanguageIds, ...languageIds]));
    return set;
  }

  static async buildSet({ actor, selections = {}, sessionState = {}, levelUpManifest = null } = {}) {
    return {
      ...this.buildSkillsSet({ actor, selections, sessionState, levelUpManifest }),
      ...(await this.buildLanguagesSet({ actor, selections, sessionState })),
    };
  }
}
