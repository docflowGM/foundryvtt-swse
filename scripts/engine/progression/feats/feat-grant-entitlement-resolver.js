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

function getAbilityModifier(actor, abilityKey) {
  const key = String(abilityKey || '').toLowerCase();
  if (!actor || !key) return 0;
  const system = actor.system || {};
  const draftAttributes = globalThis.game?.__swseActiveProgressionShell?.actor?.id === actor.id
    ? globalThis.game.__swseActiveProgressionShell.progressionSession?.draftSelections?.attributes
    : null;
  const draftValue = draftAttributes?.finalValues?.[key]
    ?? (Number.isFinite(Number(draftAttributes?.values?.[key])) && Number.isFinite(Number(draftAttributes?.speciesMods?.[key]))
      ? Number(draftAttributes.values[key]) + Number(draftAttributes.speciesMods[key])
      : null);
  const candidates = [
    draftAttributes?.modifiers?.[key],
    system.abilities?.[key]?.mod,
    system.abilities?.[key]?.modifier,
    system.attributes?.[key]?.mod,
    system.attributes?.[key]?.modifier,
    system.stats?.[key]?.mod,
    system.stats?.[key]?.modifier
  ];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  const score = Number(draftValue ?? system.attributes?.[key]?.total ?? system.attributes?.[key]?.value ?? system.abilities?.[key]?.value);
  return Number.isFinite(score) ? Math.floor((score - 10) / 2) : 0;
}

function getRegisteredSetting(moduleId, key, fallback = null) {
  try { return globalThis.game?.settings?.get?.(moduleId, key) ?? fallback; } catch (_err) { return fallback; }
}

function getForceTrainingAbilityModifier(actor) {
  const configured = getRegisteredSetting(globalThis.game?.system?.id || 'foundryvtt-swse', 'forceTrainingAttribute')
    ?? getRegisteredSetting('foundryvtt-swse', 'forceTrainingAttribute')
    ?? getRegisteredSetting('swse', 'forceTrainingAttribute')
    ?? 'wisdom';
  const key = String(configured || '').toLowerCase();
  if (key === 'cha' || key === 'charisma') return getAbilityModifier(actor, 'cha');
  if (key === 'wis' || key === 'wisdom') return getAbilityModifier(actor, 'wis');

  // Existing system behavior often allows WIS/CHA configuration. If no setting
  // is readable in this context, use the better of the two so the entitlement is
  // conservative for either supported table setting and remains minimum 1.
  return Math.max(getAbilityModifier(actor, 'wis'), getAbilityModifier(actor, 'cha'));
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
  static getAbilityModifier(actor, abilityKey) {
    return getAbilityModifier(actor, abilityKey);
  }

  static getIntBonusLanguageCount(actor) {
    return Math.max(0, getAbilityModifier(actor, 'int'));
  }

  static getLinguistSlotsPerInstance(actor) {
    return Math.max(1, 1 + getAbilityModifier(actor, 'int'));
  }

  static getForceTrainingSlotsPerInstance(actor) {
    return Math.max(1, 1 + getForceTrainingAbilityModifier(actor));
  }

  static getStarshipTacticsSlotsPerInstance(actor) {
    return Math.max(1, 1 + Math.max(0, getAbilityModifier(actor, 'wis')));
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

  static resolveForFeat(actor, featEntry, index = 0) {
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
      const count = this.getForceTrainingSlotsPerInstance(actor);
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
      const count = this.getStarshipTacticsSlotsPerInstance(actor);
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
      entitlements.push(...this.resolveForFeat(actor, entry, index));
    });
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
