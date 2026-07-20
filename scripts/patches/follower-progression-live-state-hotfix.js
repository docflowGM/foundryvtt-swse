import { FollowerSubtypeAdapter } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/default-subtypes.js';
import { FollowerLanguageStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/follower-steps/follower-language-step.js';
import {
  deriveFollowerStateForApply,
  getFollowerDerivationContext,
} from '/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-deriver.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import {
  reconcileFollowerEnhancementsForActor,
  reconcileFollowerSlotsForActor,
} from '/systems/foundryvtt-swse/scripts/infrastructure/hooks/follower-hooks.js';
import { getFollowerTalentConfig } from '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.followerProgressionLiveState.registered.v1');
const PROJECTION_PATCHED = Symbol.for('swse.followerProgressionLiveState.projection.v1');
const LANGUAGE_PATCHED = Symbol.for('swse.followerProgressionLiveState.languages.v1');
const RECONCILE_QUEUES = new Map();
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function uniqueLanguageNames(values = []) {
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

function isFollowerOwner(actor) {
  return actor?.type === 'character' || actor?.type === 'droid';
}

function resolveItemOwner(item) {
  return item?.parent || item?.actor || null;
}

function queueFollowerReconciliation(actor, reason = 'unknown') {
  if (!isFollowerOwner(actor)) return;
  const actorId = actor.id;
  const prior = RECONCILE_QUEUES.get(actorId);
  if (prior) globalThis.clearTimeout(prior);

  const timer = globalThis.setTimeout(async () => {
    RECONCILE_QUEUES.delete(actorId);
    const currentActor = game.actors?.get(actorId) || actor;
    if (!currentActor) return;
    try {
      await reconcileFollowerSlotsForActor(currentActor);
      await reconcileFollowerEnhancementsForActor(currentActor);
      swseLogger.debug('[FollowerProgressionLiveState] Reconciled follower entitlement after settled item mutation', {
        actor: currentActor.name,
        reason,
      });
    } catch (err) {
      swseLogger.warn('[FollowerProgressionLiveState] Delayed follower reconciliation failed', {
        actor: currentActor.name,
        reason,
        error: err?.message || String(err),
      });
    }
  }, 0);

  RECONCILE_QUEUES.set(actorId, timer);
}

function patchFollowerProjection() {
  const prototype = FollowerSubtypeAdapter?.prototype;
  if (!prototype || prototype[PROJECTION_PATCHED]) return;

  const original = prototype.contributeProjection;
  prototype.contributeProjection = async function followerDerivedProjection(projectedData, session, actor) {
    const projected = typeof original === 'function'
      ? await original.call(this, projectedData, session, actor)
      : projectedData;

    if (!session?.dependencyContext) return projected;

    const owner = game.actors?.get(session.dependencyContext.ownerActorId) || actor || null;
    if (!owner) return projected;

    try {
      const existingFollower = session.dependencyContext.existingFollowerId
        ? game.actors?.get(session.dependencyContext.existingFollowerId)
        : null;
      const context = await getFollowerDerivationContext(session, owner, existingFollower);
      if (!context?.templateType || !context?.speciesName) return projected;

      const state = await deriveFollowerStateForApply(
        context.ownerHeroicLevel,
        context.speciesName,
        context.templateType,
        context.persistentChoices,
      );

      projected.attributes = Object.fromEntries(ABILITY_KEYS.map((key) => {
        const ability = state.abilities?.[key] || {};
        const score = Number(ability.base ?? ability.score ?? ability.value ?? (key === 'con' && ability.absent ? 0 : 10));
        const modifier = Number(ability.mod ?? Math.floor((score - 10) / 2));
        return [key, {
          ...(projected.attributes?.[key] || {}),
          base: score,
          score,
          value: score,
          modifier: Number.isFinite(modifier) ? modifier : 0,
          mod: Number.isFinite(modifier) ? modifier : 0,
          absent: ability.absent === true,
        }];
      }));

      projected.identity = {
        ...(projected.identity || {}),
        species: context.speciesName,
      };

      const draft = session.draftSelections || {};
      const languageChoices = uniqueLanguageNames([
        draft.followerKnownLanguages,
        draft.languageChoices,
        draft.followerLanguages,
        context.persistentChoices?.languageChoices,
      ]);
      projected.languages = languageChoices;

      projected.metadata = {
        ...(projected.metadata || {}),
        isFollower: true,
        followerOwnerHeroicLevel: context.ownerHeroicLevel,
        followerTargetLevel: state.level,
        followerTemplate: context.templateType,
        followerAbilityChoice: context.persistentChoices?.abilityChoice || null,
        followerSpecies: context.speciesName,
        isNewFollower: context.existenceState?.isNew === true,
      };

      projected.follower = {
        ...(projected.follower || {}),
        templateType: context.templateType,
        speciesName: context.speciesName,
        abilityChoice: context.persistentChoices?.abilityChoice || null,
        abilities: state.abilities,
        defenses: state.defenses,
        hp: state.hp,
      };
    } catch (err) {
      swseLogger.warn('[FollowerProgressionLiveState] Could not build live follower projection', {
        owner: owner?.name || null,
        error: err?.message || String(err),
      });
    }

    return projected;
  };

  Object.defineProperty(prototype, PROJECTION_PATCHED, { value: true });
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

function patchFollowerLanguages() {
  const prototype = FollowerLanguageStep?.prototype;
  if (!prototype || prototype[LANGUAGE_PATCHED]) return;

  const originalOnStepEnter = prototype.onStepEnter;
  const originalGetStepData = prototype.getStepData;

  prototype.onStepEnter = async function ownerConstrainedFollowerLanguages(shell) {
    await originalOnStepEnter.call(this, shell);

    const draft = shell?.progressionSession?.draftSelections || {};
    const persistent = shell?.progressionSession?.dependencyContext?.persistentChoices || {};
    const choices = {
      ...persistent,
      ...this._getFollowerChoices(shell),
      pendingSpeciesContext: draft.pendingSpeciesContext || persistent.pendingSpeciesContext || null,
      speciesAbilityMods: draft.speciesAbilityMods || persistent.speciesAbilityMods || null,
    };

    const additionalSpeciesLanguages = await resolveCanonicalSpeciesLanguages(choices);
    const grants = [...(this._knownLanguageGrants || [])];
    for (const name of additionalSpeciesLanguages) {
      const grant = this._makeLanguageGrant(name, 'species');
      if (grant) grants.push(grant);
    }
    if (!grants.some(grant => this._languageMatchesName(grant.name, 'Basic'))) {
      const basic = this._makeLanguageGrant('Basic', 'default');
      if (basic) grants.push(basic);
    }

    this._knownLanguageGrants = this._dedupeLanguageGrants(grants);
    this._knownLanguages = this._knownLanguageGrants.filter(grant => grant.isFull).map(grant => grant.name);

    const knownTokens = new Set(this._knownLanguages.map(languageToken));
    const ownerNames = ownerLanguageNames(shell);
    const allowedOwnerNames = ownerNames.filter(name => !knownTokens.has(languageToken(name)));
    const allowedTokens = new Set(allowedOwnerNames.map(languageToken));

    const registryByToken = new Map((this._allLanguages || []).map(language => [languageToken(language.name), language]));
    this._allLanguages = allowedOwnerNames.map((name) => {
      return registryByToken.get(languageToken(name)) || this._buildCustomLanguageRecord(name);
    }).filter(Boolean);

    this._selectedBonusLanguages = uniqueLanguageNames(this._selectedBonusLanguages)
      .filter(name => allowedTokens.has(languageToken(name)));

    let rawPickCount = Math.max(0, Number(this._bonusLanguagesAvailable || 0));
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

    this._bonusLanguagesAvailable = Math.min(rawPickCount, allowedOwnerNames.length);
    if (this._selectedBonusLanguages.length > this._bonusLanguagesAvailable) {
      this._selectedBonusLanguages = this._selectedBonusLanguages.slice(0, this._bonusLanguagesAvailable);
    }

    draft.followerKnownLanguages = [...this._knownLanguages];
    draft.languageChoices = uniqueLanguageNames([...this._knownLanguages, ...this._selectedBonusLanguages]);
    draft.followerLanguages = [...draft.languageChoices];
    shell.progressionSession.lastModifiedAt = Date.now();

    swseLogger.log('[FollowerProgressionLiveState] Applied owner-constrained follower language authority', {
      followerSpecies: choices.speciesName,
      knownLanguages: this._knownLanguages,
      ownerLanguages: ownerNames,
      selectableLanguages: allowedOwnerNames,
      rawPickCount,
      cappedPickCount: this._bonusLanguagesAvailable,
    });
  };

  prototype.getStepData = async function followerLanguageStepData(context) {
    const data = await originalGetStepData.call(this, context);
    return {
      ...data,
      canAddCustomLanguage: false,
      followerOwnerConstrained: true,
      ownerLanguageConstraintNote: 'Followers can select only languages already known by their owner.',
    };
  };

  prototype._addCustomLanguage = async function rejectFollowerCustomLanguage() {
    ui?.notifications?.warn?.('Followers can learn only languages already known by their owner.');
  };

  Object.defineProperty(prototype, LANGUAGE_PATCHED, { value: true });
}

function registerDelayedSlotReconciliation() {
  Hooks.on('createItem', (item) => {
    const actor = resolveItemOwner(item);
    if (item?.type !== 'talent' || !actor) return;
    if (!getFollowerTalentConfig(item.name, item)) return;
    queueFollowerReconciliation(actor, 'create-follower-talent');
  });

  Hooks.on('updateItem', (item) => {
    const actor = resolveItemOwner(item);
    if (item?.type !== 'talent' || !actor) return;
    if (!getFollowerTalentConfig(item.name, item)) return;
    queueFollowerReconciliation(actor, 'update-follower-talent');
  });

  Hooks.on('swse:progression:completed', (data = {}) => {
    if (isFollowerOwner(data.actor)) queueFollowerReconciliation(data.actor, 'progression-completed');
  });

  Hooks.on('renderApplicationV2', (application) => {
    const actor = application?.actor || application?.document || null;
    if (isFollowerOwner(actor)) queueFollowerReconciliation(actor, 'owner-sheet-render');
  });

  Hooks.once('ready', () => {
    if (!game.user?.isGM) return;
    for (const actor of game.actors || []) {
      if (isFollowerOwner(actor)) queueFollowerReconciliation(actor, 'world-ready-repair');
    }
  });
}

export function registerFollowerProgressionLiveStateHotfix() {
  if (globalThis[REGISTERED]) return;
  patchFollowerProjection();
  patchFollowerLanguages();
  registerDelayedSlotReconciliation();
  Object.defineProperty(globalThis, REGISTERED, { value: true });
  swseLogger.log('[FollowerProgressionLiveState] Registered follower projection, language, and slot repairs');
}
