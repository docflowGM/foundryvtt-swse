/**
 * Force Suite Resolution Helper
 *
 * Centralizes entitlement resolution for Force Powers, Secrets, and Techniques.
 * Uses truthful class progression feature budgets as primary source.
 * Falls back to actor state only for already-selected counts.
 *
 * PHASE 3: Unifies shell-aware entitlement calculation across Force suite.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { resolveClassModel } from './class-resolution.js';

/**
 * Resolve Force Power entitlements from shell and engine state
 *
 * @param {Object} shell - Progression shell with buildIntent/committedSelections
 * @param {Actor} actor - The actor
 * @returns {Promise<Object>} { total, remaining, reasons, source }
 */
export async function resolveForcePowerEntitlements(shell, actor) {
  const reasons = [];
  let totalEntitlements = 0;
  let alreadySelected = 0;
  let fallbackUsed = false;

  // Primary: Check pending shell/buildIntent for force power selections
  const committedClass = shell?.committedSelections?.get?.('class') ||
                        shell?.buildIntent?.getSelection?.('class');

  if (committedClass) {
    const classModel = resolveClassModel(committedClass);
    if (classModel) {
      // Use ForcePowerEngine to calculate from class + feats
      const { ForcePowerEngine } = await import('/systems/foundryvtt-swse/scripts/engine/progression/engine/force-power-engine.js');

      const entitlements = await ForcePowerEngine.detectForcePowerTriggers(actor, {});
      if (entitlements && entitlements.total) {
        totalEntitlements = entitlements.total;
        reasons.push(`Force Power triggers detected: ${totalEntitlements}`);
      }
    }
  }

  // Fallback: If no result yet, check actor state for compatibility
  if (totalEntitlements === 0 && actor) {
    const feats = actor.items?.filter(i => i.type === 'feat') ?? [];
    const forceTrainingFeats = feats.filter(f => f.name?.toLowerCase().includes('force training'));

    if (forceTrainingFeats.length > 0) {
      const wisMod = actor.system?.abilities?.wis?.mod ?? 0;
      totalEntitlements = forceTrainingFeats.length * Math.max(1, 1 + wisMod);
      reasons.push(`Force Training feats (actor fallback): ${totalEntitlements}`);
      fallbackUsed = true;
    }
  }

  // Already selected (from pending or actor state)
  const pendingForcePowers = shell?.buildIntent?.getSelection?.('forcePowers') || [];
  const pendingCount = Array.isArray(pendingForcePowers)
    ? pendingForcePowers.reduce((sum, p) => sum + (p.count || 1), 0)
    : 0;

  alreadySelected = pendingCount > 0 ? pendingCount : (actor?.system?.progression?.forcePowers?.length ?? 0);

  const remaining = Math.max(0, totalEntitlements - alreadySelected);

  swseLogger.debug('[ForceSuiteResolution] Force Power entitlements', {
    total: totalEntitlements,
    selected: alreadySelected,
    remaining,
    source: fallbackUsed ? 'actor-fallback' : 'shell/class',
    reasons,
  });

  return {
    total: totalEntitlements,
    selected: alreadySelected,
    remaining,
    reasons,
    source: fallbackUsed ? 'actor-fallback' : 'shell/class',
    fallbackUsed,
  };
}

/**
 * Resolve Force Secret entitlements from class progression features
 *
 * @param {Object} shell - Progression shell with committedSelections
 * @param {Object} engine - Optional: progression engine with entitlement data
 * @param {Actor} actor - The actor
 * @returns {Object} { total, remaining, reasons, source }
 */
export function resolveForceSecretEntitlements(shell, engine, actor) {
  const reasons = [];
  let totalEntitlements = 0;
  let alreadySelected = 0;

  // Primary: Check class progression features for force_secret_choice
  const committedClass = shell?.committedSelections?.get?.('class') ||
                        shell?.buildIntent?.getSelection?.('class');

  if (committedClass) {
    const classModel = resolveClassModel(committedClass);
    if (classModel && Array.isArray(classModel.levelProgression)) {
      // Count force_secret_choice features
      for (const level of classModel.levelProgression) {
        if (Array.isArray(level.features)) {
          const secretChoices = level.features.filter(f => f.type === 'force_secret_choice');
          for (const choice of secretChoices) {
            totalEntitlements += (choice.value || 1);
            reasons.push(`Level ${level.level}: force_secret_choice (+${choice.value || 1})`);
          }
        }
      }
    }
  }

  // Secondary: Check engine choice budget if available
  if (totalEntitlements === 0 && engine?.data?.forceSecretChoices) {
    for (const choice of engine.data.forceSecretChoices) {
      totalEntitlements += (choice.value || 1);
      reasons.push(`Engine choice budget: (+${choice.value || 1})`);
    }
  }

  // Already selected (pending > actor fallback)
  const pendingForceSecrets = shell?.buildIntent?.getSelection?.('forceSecrets') || [];
  const pendingCount = Array.isArray(pendingForceSecrets)
    ? pendingForceSecrets.reduce((sum, s) => sum + (s.count || 1), 0)
    : 0;

  alreadySelected = pendingCount > 0 ? pendingCount : (actor?.system?.progression?.forceSecrets?.length ?? 0);

  const remaining = Math.max(0, totalEntitlements - alreadySelected);

  const isBlocked = totalEntitlements === 0;
  const isEmpty = totalEntitlements > 0 && alreadySelected === 0;

  swseLogger.debug('[ForceSuiteResolution] Force Secret entitlements', {
    total: totalEntitlements,
    selected: alreadySelected,
    remaining,
    isBlocked,
    isEmpty,
    reasons,
  });

  return {
    total: totalEntitlements,
    selected: alreadySelected,
    remaining,
    reasons,
    isBlocked,
    isEmpty,
  };
}

/**
 * Resolve Force Technique entitlements from class progression features
 *
 * @param {Object} shell - Progression shell with committedSelections
 * @param {Object} engine - Optional: progression engine with entitlement data
 * @param {Actor} actor - The actor
 * @returns {Object} { total, remaining, reasons, source }
 */
export function resolveForceTechniqueEntitlements(shell, engine, actor) {
  const reasons = [];
  let totalEntitlements = 0;
  let alreadySelected = 0;

  // Primary: Check class progression features for force_technique_choice
  const committedClass = shell?.committedSelections?.get?.('class') ||
                        shell?.buildIntent?.getSelection?.('class');

  if (committedClass) {
    const classModel = resolveClassModel(committedClass);
    if (classModel && Array.isArray(classModel.levelProgression)) {
      // Count force_technique_choice features
      for (const level of classModel.levelProgression) {
        if (Array.isArray(level.features)) {
          const techniqueChoices = level.features.filter(f => f.type === 'force_technique_choice');
          for (const choice of techniqueChoices) {
            totalEntitlements += (choice.value || 1);
            reasons.push(`Level ${level.level}: force_technique_choice (+${choice.value || 1})`);
          }
        }
      }
    }
  }

  // Secondary: Check engine choice budget if available
  if (totalEntitlements === 0 && engine?.data?.forceTechniqueChoices) {
    for (const choice of engine.data.forceTechniqueChoices) {
      totalEntitlements += (choice.value || 1);
      reasons.push(`Engine choice budget: (+${choice.value || 1})`);
    }
  }

  // Already selected (pending > actor fallback)
  const pendingForceTechniques = shell?.buildIntent?.getSelection?.('forceTechniques') || [];
  const pendingCount = Array.isArray(pendingForceTechniques)
    ? pendingForceTechniques.reduce((sum, t) => sum + (t.count || 1), 0)
    : 0;

  alreadySelected = pendingCount > 0 ? pendingCount : (actor?.system?.progression?.forceTechniques?.length ?? 0);

  const remaining = Math.max(0, totalEntitlements - alreadySelected);

  const isBlocked = totalEntitlements === 0;
  const isEmpty = totalEntitlements > 0 && alreadySelected === 0;

  swseLogger.debug('[ForceSuiteResolution] Force Technique entitlements', {
    total: totalEntitlements,
    selected: alreadySelected,
    remaining,
    isBlocked,
    isEmpty,
    reasons,
  });

  return {
    total: totalEntitlements,
    selected: alreadySelected,
    remaining,
    reasons,
    isBlocked,
    isEmpty,
  };
}

export default {
  resolveForcePowerEntitlements,
  resolveForceSecretEntitlements,
  resolveForceTechniqueEntitlements,
};
