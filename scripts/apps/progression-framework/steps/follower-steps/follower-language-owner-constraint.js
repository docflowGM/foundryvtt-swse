/**
 * Owner-constrained follower language selection (V2 realignment 3N, finding F-PAT-001/F-NPC-007).
 *
 * Formerly installed at runtime on FollowerLanguageStep.prototype by scripts/patches/follower-progression-live-state-hotfix.js. The logic is moved
 * verbatim; FollowerLanguageStep.onStepEnter / getStepData / _addCustomLanguage now call these directly.
 */
import { deriveFollowerStateForApply, getFollowerDerivationContext } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-deriver.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export function uniqueLanguageNames(values = []) {
  const flattened = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value === null || value === undefined || value === '') return;
    if (typeof value === 'object') {
      visit(value.name || value.label || value.language || value.id || value.slug || '');
      return;
    }
    String(value).split(',').forEach(part => flattened.push(part));
  };
  visit(values);
  return Array.from(new Set(flattened.map(value => String(value).trim()).filter(Boolean)));
}

function languageToken(value) {
  return String(value || '').trim().toLowerCase();
}

async function resolveCanonicalSpeciesLanguages(choices = {}) {
  const pending = choices.pendingSpeciesContext || {};
  const pendingDoc = pending.identity?.doc || {};
  const direct = uniqueLanguageNames([
    choices.speciesSelection?.languages,
    choices.speciesSelection?.system?.languages,
    choices.speciesSelection?.canonicalStats?.languages,
    choices.speciesSelection?.system?.canonicalStats?.languages,
    pending.languages,
    pending.ledger?.languages?.granted,
    pendingDoc.languages,
    pendingDoc.system?.languages,
    pendingDoc.canonicalStats?.languages,
    pendingDoc.system?.canonicalStats?.languages,
  ]);

  try {
    await SpeciesRegistry.initialize?.();
    const speciesRef = choices.speciesName || choices.speciesSelection?.name || choices.speciesSelection?.id;
    const record = SpeciesRegistry.getByName?.(speciesRef)
      || SpeciesRegistry.getById?.(speciesRef)
      || null;
    direct.push(...uniqueLanguageNames([
      record?.languages,
      record?.system?.languages,
      record?.canonicalStats?.languages,
      record?.system?.canonicalStats?.languages,
    ]));
  } catch (err) {
    swseLogger.warn('[FollowerProgressionLiveState] Species registry language lookup failed', err);
  }

  const speciesToken = languageToken(choices.speciesName || choices.speciesSelection?.name);
  if (speciesToken === 'chiss' && !direct.some(name => languageToken(name) === 'cheunh')) {
    direct.push('Cheunh');
  }

  return uniqueLanguageNames(direct);
}

function ownerLanguageNames(shell) {
  const owner = shell?.ownerActor
    || game.actors?.get(shell?.progressionSession?.dependencyContext?.ownerActorId)
    || null;
  return uniqueLanguageNames([
    owner?.system?.languages,
    owner?.system?.languageIds,
    owner?.system?.progression?.languages,
  ]);
}

/** Constrain a follower language step (already entered by the base implementation) to languages its owner knows. */
export async function applyOwnerConstrainedFollowerLanguages(step, shell) {
  const draft = shell?.progressionSession?.draftSelections || {};
  const persistent = shell?.progressionSession?.dependencyContext?.persistentChoices || {};
  const choices = {
    ...persistent,
    ...step._getFollowerChoices(shell),
    pendingSpeciesContext: draft.pendingSpeciesContext || persistent.pendingSpeciesContext || null,
    speciesAbilityMods: draft.speciesAbilityMods || persistent.speciesAbilityMods || null,
  };

  const additionalSpeciesLanguages = await resolveCanonicalSpeciesLanguages(choices);
  const grants = [...(step._knownLanguageGrants || [])];
  for (const name of additionalSpeciesLanguages) {
    const grant = step._makeLanguageGrant(name, 'species');
    if (grant) grants.push(grant);
  }
  if (!grants.some(grant => step._languageMatchesName(grant.name, 'Basic'))) {
    const basic = step._makeLanguageGrant('Basic', 'default');
    if (basic) grants.push(basic);
  }

  step._knownLanguageGrants = step._dedupeLanguageGrants(grants);
  step._knownLanguages = step._knownLanguageGrants.filter(grant => grant.isFull).map(grant => grant.name);

  const knownTokens = new Set(step._knownLanguages.map(languageToken));
  const ownerNames = ownerLanguageNames(shell);
  const allowedOwnerNames = ownerNames.filter(name => !knownTokens.has(languageToken(name)));
  const allowedTokens = new Set(allowedOwnerNames.map(languageToken));

  const registryByToken = new Map((step._allLanguages || []).map(language => [languageToken(language.name), language]));
  step._allLanguages = allowedOwnerNames.map((name) => {
    return registryByToken.get(languageToken(name)) || step._buildCustomLanguageRecord(name);
  }).filter(Boolean);

  step._selectedBonusLanguages = uniqueLanguageNames(step._selectedBonusLanguages)
    .filter(name => allowedTokens.has(languageToken(name)));

  let rawPickCount = Math.max(0, Number(step._bonusLanguagesAvailable || 0));
  try {
    const context = await getFollowerDerivationContext(
      shell.progressionSession,
      shell.ownerActor || game.actors?.get(shell.progressionSession?.dependencyContext?.ownerActorId),
      null,
    );
    if (context?.templateType && context?.speciesName) {
      const state = await deriveFollowerStateForApply(
        context.ownerHeroicLevel,
        context.speciesName,
        context.templateType,
        context.persistentChoices,
      );
      rawPickCount = 1 + Math.max(0, Number(state.abilities?.int?.mod || 0));
    }
  } catch (err) {
    swseLogger.warn('[FollowerProgressionLiveState] Could not recompute follower language allowance', err);
  }

  step._bonusLanguagesAvailable = Math.min(rawPickCount, allowedOwnerNames.length);
  if (step._selectedBonusLanguages.length > step._bonusLanguagesAvailable) {
    step._selectedBonusLanguages = step._selectedBonusLanguages.slice(0, step._bonusLanguagesAvailable);
  }

  draft.followerKnownLanguages = [...step._knownLanguages];
  draft.languageChoices = uniqueLanguageNames([...step._knownLanguages, ...step._selectedBonusLanguages]);
  draft.followerLanguages = [...draft.languageChoices];
  shell.progressionSession.lastModifiedAt = Date.now();

  swseLogger.log('[FollowerProgressionLiveState] Applied owner-constrained follower language authority', {
    followerSpecies: choices.speciesName,
    knownLanguages: step._knownLanguages,
    ownerLanguages: ownerNames,
    selectableLanguages: allowedOwnerNames,
    rawPickCount,
    cappedPickCount: step._bonusLanguagesAvailable,
  });
}

export function ownerConstrainedLanguageStepData(data) {
  return {
    ...data,
    canAddCustomLanguage: false,
    followerOwnerConstrained: true,
    ownerLanguageConstraintNote: 'Followers can select only languages already known by their owner.',
  };
}

export function rejectFollowerCustomLanguage() {
  ui?.notifications?.warn?.('Followers can learn only languages already known by their owner.');
}
