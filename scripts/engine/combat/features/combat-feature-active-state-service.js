import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import {
  COMBAT_FEATURE_ACTIONS,
  COMBAT_FEATURE_AUTOMATION_STATUS,
  COMBAT_FEATURE_READINESS
} from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-contract.js';
import {
  canonicalCombatFeatureKey,
  getCombatFeatureProfile
} from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-classifier.js';

/**
 * Combat Feature Active State Service
 *
 * Phase 7 state tracker. This stores display/automation state under the system
 * flag namespace and deliberately does not compute combat math. The math engines
 * can consume these flags in later phases.
 */

export const ACTIVE_COMBAT_STATE_IDS = Object.freeze([
  'rage',
  'braced',
  'fight-defensively',
  'total-defense',
  'melee-defense',
  'shield-surge'
]);

export const UNIVERSAL_COMBAT_STATE_ACTION_IDS = Object.freeze([
  'fight-defensively',
  'total-defense'
]);

function stateFlagRoot(actor) {
  return actor?.flags?.['foundryvtt-swse']?.combatFeatures?.activeStates ?? {};
}

function stateFlagPath(featureId) {
  return `flags.foundryvtt-swse.combatFeatures.activeStates.${canonicalCombatFeatureKey(featureId)}`;
}

function activeStateName(featureId) {
  const profile = getCombatFeatureProfile(featureId) ?? {};
  return profile.name ?? profile.label ?? String(featureId || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function featureFromState(featureId, state = {}) {
  const id = canonicalCombatFeatureKey(featureId);
  const profile = getCombatFeatureProfile(id) ?? {};
  return {
    id,
    name: state.name ?? profile.name ?? activeStateName(id),
    sourceName: state.sourceName ?? profile.sourceType ?? 'Combat State',
    sourceType: state.sourceType ?? profile.sourceType ?? 'Combat State',
    sourceItemId: state.sourceItemId ?? null,
    summary: state.summary ?? profile.summary ?? 'Tracked active combat state.',
    actionCost: profile.actionCost ?? null,
    timing: 'Active',
    durationLabel: state.durationLabel ?? profile.durationLabel ?? 'Until ended',
    remainingUses: null,
    maxUses: null,
    deltas: Array.isArray(profile.deltas) ? profile.deltas : [],
    isActive: true,
    readiness: COMBAT_FEATURE_READINESS.ACTIVE,
    canDeactivate: true,
    deactivateAction: COMBAT_FEATURE_ACTIONS.DEACTIVATE,
    automationStatus: profile.automationStatus ?? state.automationStatus ?? COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    tags: Array.from(new Set([...(Array.isArray(profile.tags) ? profile.tags : []), 'active', 'tracked-state']))
  };
}

export function isTrackedCombatState(featureId) {
  return ACTIVE_COMBAT_STATE_IDS.includes(canonicalCombatFeatureKey(featureId));
}

export function getActiveCombatFeatureState(actor, featureId) {
  const id = canonicalCombatFeatureKey(featureId);
  const value = stateFlagRoot(actor)?.[id];
  return value && typeof value === 'object' && value.active !== false ? value : null;
}

export function getActiveCombatFeatureStates(actor) {
  const root = stateFlagRoot(actor);
  const entries = [];
  for (const [rawId, state] of Object.entries(root)) {
    const id = canonicalCombatFeatureKey(rawId);
    if (!state || typeof state !== 'object' || state.active === false) continue;
    entries.push(featureFromState(id, state));
  }
  return entries;
}

export function buildUniversalCombatStateActions(actor) {
  if (!actor) return [];
  return UNIVERSAL_COMBAT_STATE_ACTION_IDS
    .filter(id => !getActiveCombatFeatureState(actor, id))
    .map(id => {
      const profile = getCombatFeatureProfile(id) ?? {};
      return {
        id,
        name: profile.name ?? activeStateName(id),
        sourceName: profile.sourceName ?? 'Core Combat Action',
        sourceType: profile.sourceType ?? 'Combat Action',
        sourceItemId: null,
        summary: profile.summary ?? 'Track this combat state until it ends.',
        actionCost: profile.actionCost ?? 'Standard',
        timing: profile.timing ?? 'Until next turn',
        remainingUses: null,
        maxUses: null,
        readiness: COMBAT_FEATURE_READINESS.READY,
        readinessNote: profile.readinessNote ?? null,
        buttonLabel: profile.buttonLabel ?? 'Activate',
        canExecute: true,
        executeAction: profile.executeAction ?? COMBAT_FEATURE_ACTIONS.ACTIVATE,
        canDeactivate: true,
        deactivateAction: COMBAT_FEATURE_ACTIONS.DEACTIVATE,
        automationStatus: profile.automationStatus ?? COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
        deltas: Array.isArray(profile.deltas) ? profile.deltas : [],
        tags: Array.isArray(profile.tags) ? profile.tags : ['standard', 'state', 'manual']
      };
    });
}

export async function activateCombatFeatureState(actor, featureId, { sourceItemId = null, sourceName = null, summary = null } = {}) {
  if (!actor?.isOwner) {
    ui?.notifications?.warn?.('You do not control this actor.');
    return { success: false, reason: 'not-owner' };
  }

  const id = canonicalCombatFeatureKey(featureId);
  if (!isTrackedCombatState(id)) {
    return { success: false, reason: 'not-tracked' };
  }

  const profile = getCombatFeatureProfile(id) ?? {};
  const state = {
    active: true,
    id,
    name: profile.name ?? activeStateName(id),
    sourceItemId,
    sourceName: sourceName ?? profile.sourceType ?? 'Combat State',
    summary: summary ?? profile.summary ?? 'Tracked active combat state.',
    durationLabel: profile.durationLabel ?? 'Until ended',
    automationStatus: profile.automationStatus ?? COMBAT_FEATURE_AUTOMATION_STATUS.MANUAL,
    startedAtRound: game?.combat?.round ?? null,
    startedAtTurn: game?.combat?.turn ?? null,
    startedAt: Date.now()
  };

  await ActorEngine.updateActor(actor, { [stateFlagPath(id)]: state }, {
    meta: { guardKey: `combat-feature-state-activate-${id}` },
    source: 'combat-feature-active-state-service'
  });

  ui?.notifications?.info?.(`${state.name} active.`);
  return { success: true, state };
}

export async function clearCombatFeatureState(actor, featureId) {
  if (!actor?.isOwner) {
    ui?.notifications?.warn?.('You do not control this actor.');
    return { success: false, reason: 'not-owner' };
  }

  const id = canonicalCombatFeatureKey(featureId);
  const existing = getActiveCombatFeatureState(actor, id);
  if (!existing) return { success: false, reason: 'not-active' };

  await ActorEngine.updateActor(actor, { [stateFlagPath(id)]: null }, {
    meta: { guardKey: `combat-feature-state-clear-${id}` },
    source: 'combat-feature-active-state-service'
  });

  ui?.notifications?.info?.(`${existing.name ?? activeStateName(id)} ended.`);
  return { success: true };
}
