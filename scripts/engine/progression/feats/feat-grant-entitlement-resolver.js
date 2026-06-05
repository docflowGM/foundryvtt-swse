import { buildClassGrantLedger } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';

/**
 * FeatGrantEntitlementResolver
 *
 * Backend bridge for feats that unlock progression-owned selection slots.
 * This does not choose Force powers, starship maneuvers, or languages. It only
 * derives slot entitlements that the dedicated progression steps consume.
 */

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getAbilityModifier(actor, abilityKey, shell = null) {
  const rawKey = String(abilityKey || '').trim().toLowerCase();
  const keyMap = {
    strength: 'str', str: 'str',
    dexterity: 'dex', dex: 'dex',
    constitution: 'con', con: 'con',
    intelligence: 'int', int: 'int',
    wisdom: 'wis', wis: 'wis',
    charisma: 'cha', cha: 'cha',
  };
  const key = keyMap[rawKey] || rawKey;
  if (!actor || !key) return 0;

  const system = actor.system || {};
  const shellDraftAttributes = shell?.progressionSession?.draftSelections?.attributes
    ?? shell?.draftSelections?.attributes
    ?? shell?.committedSelections?.get?.('attributes')
    ?? null;
  const globalDraftAttributes = globalThis.game?.__swseActiveProgressionShell?.actor?.id === actor.id
    ? globalThis.game.__swseActiveProgressionShell.progressionSession?.draftSelections?.attributes
    : null;
  const draftAttributes = shellDraftAttributes || globalDraftAttributes;

  const readKeyed = (container, ability) => {
    if (!container || !ability) return undefined;
    return container?.[ability] ?? container?.[Object.entries(keyMap).find(([, short]) => short === ability)?.[0]];
  };
  const draftValue = readKeyed(draftAttributes?.finalValues, key)
    ?? readKeyed(draftAttributes?.values, key)
    ?? (Number.isFinite(Number(readKeyed(draftAttributes?.baseValues, key))) && Number.isFinite(Number(readKeyed(draftAttributes?.speciesMods, key)))
      ? Number(readKeyed(draftAttributes.baseValues, key)) + Number(readKeyed(draftAttributes.speciesMods, key))
      : null);

  // Pending chargen/level-up attributes must outrank the actor's currently
  // persisted ability record. Otherwise Force Training selected during chargen
  // sees the blank/new actor's WIS/CHA modifier and only grants one power.
  const pendingModifier = Number(readKeyed(draftAttributes?.modifiers, key));
  if (Number.isFinite(pendingModifier)) return Math.floor(pendingModifier);

  const pendingScore = Number(draftValue);
  if (Number.isFinite(pendingScore)) return Math.floor((pendingScore - 10) / 2);

  const actorAbility = system.abilities?.[key] || system.attributes?.[key] || system.stats?.[key] || {};
  const persistedModifier = Number(actorAbility?.mod ?? actorAbility?.modifier);
  if (Number.isFinite(persistedModifier)) return Math.floor(persistedModifier);

  const persistedScore = Number(actorAbility?.total ?? actorAbility?.value ?? actorAbility?.base);
  return Number.isFinite(persistedScore) ? Math.floor((persistedScore - 10) / 2) : 0;
}

function getRegisteredSetting(moduleId, key, fallback = null) {
  try { return globalThis.game?.settings?.get?.(moduleId, key) ?? fallback; } catch (_err) { return fallback; }
}

function getForceTrainingAbilityModifier(actor, shell = null) {
  const configured = getRegisteredSetting(globalThis.game?.system?.id || 'foundryvtt-swse', 'forceTrainingAttribute')
    ?? getRegisteredSetting('foundryvtt-swse', 'forceTrainingAttribute')
    ?? getRegisteredSetting('swse', 'forceTrainingAttribute')
    ?? 'wisdom';
  const key = String(configured || '').toLowerCase();
  if (key === 'cha' || key === 'charisma') return getAbilityModifier(actor, 'cha', shell);
  if (key === 'wis' || key === 'wisdom') return getAbilityModifier(actor, 'wis', shell);

  // Existing system behavior often allows WIS/CHA configuration. If no setting
  // is readable in this context, use the better of the two so the entitlement is
  // conservative for either supported table setting and remains minimum 1.
  return Math.max(getAbilityModifier(actor, 'wis', shell), getAbilityModifier(actor, 'cha', shell));
}

function makeSourceId(itemOrFeat, index, prefix) {
  return String(itemOrFeat?.id || itemOrFeat?._id || itemOrFeat?.uuid || `${prefix}-${index}`);
}

function normalizePendingFeat(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return { name: entry, system: {}, sourceType: 'pending' };
  return {
    ...entry,
    name: entry.name || entry.label || entry.id || entry._id || '',
    system: entry.system || {},
    sourceType: entry.sourceType || entry.source || 'pending'
  };
}

function getClassSelection(shell) {
  return shell?.progressionSession?.draftSelections?.class
    || shell?.draftSelections?.class
    || shell?.draftSelections?.get?.('class')
    || shell?.committedSelections?.get?.('class')
    || shell?.buildIntent?.getSelection?.('class')
    || null;
}


function getPendingSpeciesContext(shell) {
  return shell?.progressionSession?.draftSelections?.pendingSpeciesContext
    || shell?.progressionSession?.getSelection?.('pendingSpeciesContext')
    || shell?.draftSelections?.pendingSpeciesContext
    || shell?.committedSelections?.get?.('pendingSpeciesContext')
    || shell?.buildIntent?.getSelection?.('pendingSpeciesContext')
    || shell?.progressionSession?.draftSelections?.species?.pendingContext
    || shell?.draftSelections?.species?.pendingContext
    || null;
}

function canonicalSkillKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const map = {
    usetheforce: 'useTheForce',
    useforce: 'useTheForce',
    utf: 'useTheForce',
    knowledgegalacticlore: 'knowledgeGalacticLore',
    knowledgebureaucracy: 'knowledgeBureaucracy',
    knowledgephysicalsciences: 'knowledgePhysicalSciences',
    knowledgelifesciences: 'knowledgeLifeSciences',
    knowledgesocialsciences: 'knowledgeSocialSciences',
    knowledgetechnology: 'knowledgeTechnology',
    knowledgetactics: 'knowledgeTactics',
    knowledgexenology: 'knowledgeXenology',
  };
  return map[compact] || raw.replace(/[^A-Za-z0-9]+(.)/g, (_m, c) => String(c || '').toUpperCase()).replace(/^[A-Z]/, c => c.toLowerCase());
}

function collectTrainedSkillKeysFromSelection(raw, out = new Set()) {
  if (!raw) return out;

  const add = (value, fallbackKey = null) => {
    const ref = typeof value === 'string'
      ? value
      : (value?.key || value?.id || value?.skill || value?.skillId || value?.name || value?.label || fallbackKey);
    const key = canonicalSkillKey(ref);
    if (key) out.add(key);
  };

  const addExplicitMap = (map) => {
    if (!map || typeof map !== 'object' || Array.isArray(map)) return;
    for (const [key, value] of Object.entries(map)) {
      if (value === true) add(key);
      else if (value && typeof value === 'object' && value.trained === true) add(value, key);
    }
  };

  if (Array.isArray(raw)) {
    raw.forEach(value => add(value));
  } else if (typeof raw === 'object') {
    if (Array.isArray(raw.trained)) raw.trained.forEach(value => add(value));
    else if (Array.isArray(raw.selected)) raw.selected.forEach(value => add(value));
    else if (Array.isArray(raw.skills)) raw.skills.forEach(value => add(value));
    else if (raw.trainedSkills && typeof raw.trainedSkills === 'object') addExplicitMap(raw.trainedSkills);
    else if (raw.trained && typeof raw.trained === 'object') addExplicitMap(raw.trained);
    else if (raw.selected && typeof raw.selected === 'object') addExplicitMap(raw.selected);
    else addExplicitMap(raw);
  }

  return out;
}

function getPendingTrainedSkillKeys(actor, shell) {
  const keys = new Set();
  collectTrainedSkillKeysFromSelection(shell?.progressionSession?.draftSelections?.skills, keys);
  collectTrainedSkillKeysFromSelection(shell?.progressionSession?.getSelection?.('skills'), keys);
  collectTrainedSkillKeysFromSelection(shell?.draftSelections?.skills, keys);
  collectTrainedSkillKeysFromSelection(shell?.draftSelections?.get?.('skills'), keys);
  collectTrainedSkillKeysFromSelection(shell?.committedSelections?.get?.('skills'), keys);
  collectTrainedSkillKeysFromSelection(shell?.buildIntent?.getSelection?.('skills'), keys);

  const actorSkills = actor?.system?.skills || {};
  for (const [key, value] of Object.entries(actorSkills)) {
    if (value?.trained === true) keys.add(canonicalSkillKey(key));
  }

  return keys;
}

function speciesBonusFeatRequirementsMet(requirements = [], { actor = null, shell = null } = {}) {
  if (!Array.isArray(requirements) || requirements.length === 0) return true;
  const trainedSkillKeys = getPendingTrainedSkillKeys(actor, shell);

  for (const req of requirements) {
    const type = String(req?.type || '').trim();
    if (type === 'skillTrained') {
      const skillKey = canonicalSkillKey(req.skill || req.skillId || req.key || req.name);
      if (!skillKey || !trainedSkillKeys.has(skillKey)) return false;
    } else {
      // Attribute/BAB conditions are finalized after actor recalculation; do not
      // expose their grants as pending progression entitlements during chargen.
      return false;
    }
  }

  return true;
}

function getPendingSpeciesBonusFeatEntries(actor, shell) {
  const context = getPendingSpeciesContext(shell);
  if (!context) return [];

  const speciesName = context.identity?.name || context.name || 'Species';
  const traits = Array.isArray(context.traits) ? context.traits : [];
  const entries = [];

  for (const trait of traits) {
    if (trait?.classification !== 'grant' || trait?.source !== 'bonusFeat') continue;
    for (const grant of trait.grants || []) {
      if (grant?.grantType !== 'feat' || !grant?.target) continue;
      const requirements = Array.isArray(grant.requirements) ? grant.requirements : [];
      const hasStructuredRequirements = requirements.length > 0;
      const hasFreeformOnly = !!grant.condition && !hasStructuredRequirements;
      if (hasFreeformOnly) continue;
      if (!speciesBonusFeatRequirementsMet(requirements, { actor, shell })) continue;

      entries.push({
        id: `species-bonus-feat-${canonicalSkillKey(speciesName)}-${canonicalSkillKey(grant.target)}`,
        name: grant.target,
        system: {},
        sourceType: 'pending',
        source: 'pending',
        pendingSource: 'speciesBonusFeat',
        species: speciesName,
        condition: grant.condition || null,
        requirements,
      });
    }
  }

  return entries;
}

function getPendingFeatEntries(shell) {
  const sessionFeats = shell?.progressionSession?.draftSelections?.feats;
  const directDraftFeats = shell?.draftSelections?.feats;
  const draftMapFeats = shell?.draftSelections?.get?.('feats');
  const buildIntentFeats = shell?.buildIntent?.getSelection?.('feats');
  const rawEntries = [
    ...asArray(sessionFeats),
    ...asArray(directDraftFeats),
    ...asArray(draftMapFeats),
    ...asArray(buildIntentFeats)
  ];

  const actor = shell?.actor || null;

  for (const speciesGrant of getPendingSpeciesBonusFeatEntries(actor, shell)) {
    rawEntries.push(speciesGrant);
  }

  const classSelection = getClassSelection(shell);
  if (actor && classSelection) {
    const pendingState = {
      ...(shell?.progressionSession?.draftSelections || {}),
      attributes: shell?.progressionSession?.draftSelections?.attributes,
    };
    try {
      const ledger = buildClassGrantLedger(actor, classSelection, pendingState);
      for (const grant of ledger?.grantedFeats || []) {
        if (!grant?.name) continue;
        rawEntries.push({
          name: grant.name,
          system: {},
          sourceType: 'pendingClassGrant',
          source: 'pending',
          validated: grant.validated !== false,
          wasConditional: !!grant.wasConditional,
        });
      }
    } catch (_err) {
      // Entitlements are advisory for step activation; fail closed to explicit feats.
    }
  }

  return rawEntries.map(normalizePendingFeat).filter(Boolean);
}

export class FeatGrantEntitlementResolver {
  static getAbilityModifier(actor, abilityKey, shell = null) {
    return getAbilityModifier(actor, abilityKey, shell);
  }

  static getIntBonusLanguageCount(actor) {
    return Math.max(0, getAbilityModifier(actor, 'int'));
  }

  static getLinguistSlotsPerInstance(actor) {
    return Math.max(1, 1 + getAbilityModifier(actor, 'int'));
  }

  static getForceTrainingSlotsPerInstance(actor, shell = null) {
    return Math.max(1, 1 + getForceTrainingAbilityModifier(actor, shell));
  }

  static getStarshipTacticsSlotsPerInstance(actor, shell = null) {
    return Math.max(1, 1 + Math.max(0, getAbilityModifier(actor, 'wis', shell)));
  }

  static getOwnedFeatEntries(actor) {
    return asArray(actor?.items).filter((item) => item?.type === 'feat');
  }

  static getFeatEntries(actor, { shell = null, includePending = true } = {}) {
    const entries = [...this.getOwnedFeatEntries(actor)];
    if (!includePending || !shell) return entries;

    const seen = new Set(entries.map((entry) => makeSourceId(entry, 0, 'owned')));
    for (const pending of getPendingFeatEntries(shell)) {
      const id = makeSourceId(pending, entries.length, 'pending');
      if (seen.has(id)) continue;
      seen.add(id);
      entries.push(pending);
    }
    return entries;
  }

  static resolveForFeat(actor, featEntry, index = 0, options = {}) {
    const name = normalizeName(featEntry?.name);
    const sourceItemId = makeSourceId(featEntry, index, 'feat-grant');
    const sourceName = featEntry?.name || '';
    const sourceType = featEntry?.sourceType === 'pending' || featEntry?.source === 'pending' ? 'pendingFeat' : 'feat';

    if (name === 'linguist') {
      const count = this.getLinguistSlotsPerInstance(actor);
      return [{
        grantType: 'languageSlots',
        registry: 'language',
        sourceType,
        sourceItemId,
        sourceName,
        sourceIndex: index,
        count,
        countFormula: 'max(1, 1 + intelligenceModifier)',
        ability: 'int',
        minimum: 1,
        repeatable: true,
        dynamic: true
      }];
    }

    if (name === 'force training') {
      const count = this.getForceTrainingSlotsPerInstance(actor, options.shell || null);
      return [{
        grantType: 'forcePowerSlots',
        registry: 'forcePower',
        sourceType,
        sourceItemId,
        sourceName,
        sourceIndex: index,
        count,
        countFormula: 'max(1, 1 + configuredForceTrainingAbilityModifier)',
        ability: 'forceTraining',
        minimum: 1,
        repeatable: true,
        dynamic: true
      }];
    }

    if (name === 'starship tactics') {
      const count = this.getStarshipTacticsSlotsPerInstance(actor, options.shell || null);
      return [{
        grantType: 'starshipManeuverSlots',
        registry: 'starshipManeuver',
        sourceType,
        sourceItemId,
        sourceName,
        sourceIndex: index,
        count,
        countFormula: 'max(1, 1 + wisdomModifier)',
        ability: 'wis',
        minimum: 1,
        repeatable: true,
        dynamic: true,
        unlockDomain: 'starship-maneuvers'
      }];
    }

    return [];
  }

  static resolve(actor, options = {}) {
    const entries = this.getFeatEntries(actor, options);
    const entitlements = [];
    entries.forEach((entry, index) => {
      entitlements.push(...this.resolveForFeat(actor, entry, index, options));
    });

    // Diagnostic logging for Force-related entitlements
    const forcePowerEntitlements = entitlements.filter(e => e.grantType === 'forcePowerSlots');
    if (forcePowerEntitlements.length > 0 || entries.some(e => /force training|force sensitivity/i.test(e.name || ''))) {
      console.log('[FeatGrantEntitlementResolver.resolve] Force suite diagnostics', {
        allEntries: entries.map(e => ({ name: e.name, sourceType: e.sourceType })),
        forcePowerEntitlements: forcePowerEntitlements.map(e => ({
          sourceName: e.sourceName,
          sourceType: e.sourceType,
          count: e.count,
          countFormula: e.countFormula
        })),
        forceTrainingFeats: entries.filter(e => /force training/i.test(e.name || '')).map(e => ({ name: e.name, sourceType: e.sourceType })),
        forceSensitivityFeats: entries.filter(e => /force sensitivity/i.test(e.name || '')).map(e => ({ name: e.name, sourceType: e.sourceType }))
      });
    }

    return entitlements;
  }

  static totalForGrantType(actor, grantType, options = {}) {
    return this.resolve(actor, options)
      .filter((entry) => entry.grantType === grantType)
      .reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
  }

  static summarize(actor, options = {}) {
    const entitlements = this.resolve(actor, options);
    const totals = {};
    for (const entry of entitlements) {
      totals[entry.grantType] = (totals[entry.grantType] || 0) + (Number(entry.count) || 0);
    }
    return { entitlements, totals };
  }
}

export default FeatGrantEntitlementResolver;
