/**
 * Force Suite Resolution Helper
 *
 * Centralizes entitlement resolution for Force Powers, Secrets, and Techniques.
 * Uses truthful class progression feature budgets as primary source.
 * Falls back to actor state only for already-selected counts.
 *
 * PHASE 3: Unifies shell-aware entitlement calculation across Force suite.
 * PHASE 3.1: Comprehensive diagnostic logging for hydration failures.
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
  const sessionId = shell?.sessionId || 'unknown';
  const actorName = actor?.name || 'unknown';
  const diagnostics = {
    sessionId,
    actorName,
    shellAvailable: !!shell,
    classSelection: null,
    classResolution: null,
    engineDetection: null,
    alreadySelected: null,
    fallbackUsed: false,
  };

  const reasons = [];
  let totalEntitlements = 0;
  let alreadySelected = 0;
  let fallbackUsed = false;

  try {
    // Primary: Check pending shell/buildIntent for force power selections
    const committedClass = shell?.committedSelections?.get?.('class') ||
                          shell?.buildIntent?.getSelection?.('class');

    diagnostics.classSelection = {
      exists: !!committedClass,
      type: committedClass?.id ? 'object' : 'none',
      id: committedClass?.id || null,
      name: committedClass?.name || null,
    };

    if (committedClass) {
      try {
        const classModel = resolveClassModel(committedClass);
        diagnostics.classResolution = {
          success: !!classModel,
          modelName: classModel?.name || null,
          message: classModel ? 'resolved' : 'failed to resolve class model',
        };

        if (classModel) {
          // Use ForcePowerEngine to calculate from class + feats
          try {
            const { ForcePowerEngine } = await import('/systems/foundryvtt-swse/scripts/engine/progression/engine/force-power-engine.js');

            const entitlements = await ForcePowerEngine.detectForcePowerTriggers(actor, {});
            diagnostics.engineDetection = {
              success: !!entitlements,
              total: entitlements?.total || 0,
              message: entitlements ? 'engine detection succeeded' : 'engine detection returned no data',
            };

            if (entitlements && entitlements.total) {
              totalEntitlements = entitlements.total;
              reasons.push(`Force Power triggers detected: ${totalEntitlements}`);
            } else {
              swseLogger.warn(`[ForceSuiteResolution.ForcePower] Engine detection failed for ${actorName}`, {
                sessionId,
                classModel: classModel.name,
                entitlements,
              });
            }
          } catch (engineErr) {
            diagnostics.engineDetection = {
              success: false,
              error: engineErr.message,
              message: 'engine threw exception',
            };
            swseLogger.error(`[ForceSuiteResolution.ForcePower] ForcePowerEngine exception for ${actorName}`, {
              sessionId,
              classModel: classModel.name,
              error: engineErr.message,
            });
          }
        } else {
          swseLogger.warn(`[ForceSuiteResolution.ForcePower] Class model resolution failed for ${actorName}`, {
            sessionId,
            committedClass,
          });
        }
      } catch (resolutionErr) {
        diagnostics.classResolution = {
          success: false,
          error: resolutionErr.message,
          message: 'class resolution threw exception',
        };
        swseLogger.error(`[ForceSuiteResolution.ForcePower] Class resolution exception for ${actorName}`, {
          sessionId,
          committedClass,
          error: resolutionErr.message,
        });
      }
    } else {
      swseLogger.debug(`[ForceSuiteResolution.ForcePower] No class selection in shell for ${actorName}`, { sessionId });
    }

    // Fallback: If no result yet, check actor state for compatibility
    if (totalEntitlements === 0 && actor) {
      try {
        const feats = actor.items?.filter(i => i.type === 'feat') ?? [];
        const forceTrainingFeats = feats.filter(f => f.name?.toLowerCase().includes('force training'));

        if (forceTrainingFeats.length > 0) {
          const wisMod = actor.system?.abilities?.wis?.mod ?? 0;
          totalEntitlements = forceTrainingFeats.length * Math.max(1, 1 + wisMod);
          reasons.push(`Force Training feats (actor fallback): ${totalEntitlements}`);
          fallbackUsed = true;
          diagnostics.fallbackUsed = true;

          swseLogger.log(`[ForceSuiteResolution.ForcePower] Using actor fallback for ${actorName}`, {
            sessionId,
            forceTrainingCount: forceTrainingFeats.length,
            wisMod,
            totalEntitlements,
          });
        }
      } catch (fallbackErr) {
        swseLogger.error(`[ForceSuiteResolution.ForcePower] Actor fallback exception for ${actorName}`, {
          sessionId,
          error: fallbackErr.message,
        });
      }
    }

    // Already selected (from pending or actor state)
    try {
      const pendingForcePowers = shell?.buildIntent?.getSelection?.('forcePowers') || [];
      const pendingCount = Array.isArray(pendingForcePowers)
        ? pendingForcePowers.reduce((sum, p) => sum + (p.count || 1), 0)
        : 0;

      alreadySelected = pendingCount > 0 ? pendingCount : (actor?.system?.progression?.forcePowers?.length ?? 0);
      diagnostics.alreadySelected = {
        pendingCount,
        actorCount: actor?.system?.progression?.forcePowers?.length ?? 0,
        total: alreadySelected,
      };
    } catch (selectedErr) {
      swseLogger.error(`[ForceSuiteResolution.ForcePower] Already-selected counting exception for ${actorName}`, {
        sessionId,
        error: selectedErr.message,
      });
      alreadySelected = 0;
    }

    const remaining = Math.max(0, totalEntitlements - alreadySelected);

    swseLogger.log(`[ForceSuiteResolution.ForcePower] Entitlements resolved for ${actorName}`, {
      sessionId,
      total: totalEntitlements,
      selected: alreadySelected,
      remaining,
      source: fallbackUsed ? 'actor-fallback' : 'shell/class',
      reasons,
      diagnostics,
    });

    return {
      total: totalEntitlements,
      selected: alreadySelected,
      remaining,
      reasons,
      source: fallbackUsed ? 'actor-fallback' : 'shell/class',
      fallbackUsed,
      diagnostics,
    };
  } catch (err) {
    swseLogger.error(`[ForceSuiteResolution.ForcePower] Unhandled exception for ${actorName}`, {
      sessionId,
      error: err.message,
      diagnostics,
    });
    return {
      total: 0,
      selected: 0,
      remaining: 0,
      reasons: [`Exception: ${err.message}`],
      source: 'error',
      fallbackUsed: false,
      diagnostics,
    };
  }
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
  const sessionId = shell?.sessionId || 'unknown';
  const actorName = actor?.name || 'unknown';
  const diagnostics = {
    sessionId,
    actorName,
    shellAvailable: !!shell,
    engineAvailable: !!engine,
    classSelection: null,
    classResolution: null,
    engineBudget: null,
    alreadySelected: null,
  };

  const reasons = [];
  let totalEntitlements = 0;
  let alreadySelected = 0;

  try {
    // Primary: Check class progression features for force_secret_choice
    const committedClass = shell?.committedSelections?.get?.('class') ||
                          shell?.buildIntent?.getSelection?.('class');

    diagnostics.classSelection = {
      exists: !!committedClass,
      id: committedClass?.id || null,
      name: committedClass?.name || null,
    };

    if (committedClass) {
      try {
        const classModel = resolveClassModel(committedClass);
        diagnostics.classResolution = {
          success: !!classModel,
          modelName: classModel?.name || null,
        };

        if (classModel && Array.isArray(classModel.levelProgression)) {
          // Count force_secret_choice features
          let featureCount = 0;
          for (const level of classModel.levelProgression) {
            if (Array.isArray(level.features)) {
              const secretChoices = level.features.filter(f => f.type === 'force_secret_choice');
              for (const choice of secretChoices) {
                totalEntitlements += (choice.value || 1);
                featureCount++;
                reasons.push(`Level ${level.level}: force_secret_choice (+${choice.value || 1})`);
              }
            }
          }
          diagnostics.classResolution.featuresFound = featureCount;
          diagnostics.classResolution.totalFromFeatures = totalEntitlements;
        } else {
          swseLogger.warn(`[ForceSuiteResolution.ForceSecret] Class model invalid for ${actorName}`, {
            sessionId,
            classModel: classModel?.name || 'none',
            hasLevelProgression: classModel ? Array.isArray(classModel.levelProgression) : false,
          });
        }
      } catch (resolutionErr) {
        diagnostics.classResolution = {
          success: false,
          error: resolutionErr.message,
        };
        swseLogger.error(`[ForceSuiteResolution.ForceSecret] Class resolution exception for ${actorName}`, {
          sessionId,
          error: resolutionErr.message,
        });
      }
    }

    // Secondary: Check engine choice budget if available
    if (totalEntitlements === 0 && engine?.data?.forceSecretChoices) {
      try {
        diagnostics.engineBudget = { found: true, count: engine.data.forceSecretChoices.length };
        for (const choice of engine.data.forceSecretChoices) {
          totalEntitlements += (choice.value || 1);
          reasons.push(`Engine choice budget: (+${choice.value || 1})`);
        }
        swseLogger.log(`[ForceSuiteResolution.ForceSecret] Using engine budget for ${actorName}`, {
          sessionId,
          budget: engine.data.forceSecretChoices.length,
          totalFromEngine: totalEntitlements,
        });
      } catch (engineErr) {
        diagnostics.engineBudget = { found: true, error: engineErr.message };
        swseLogger.error(`[ForceSuiteResolution.ForceSecret] Engine budget exception for ${actorName}`, {
          sessionId,
          error: engineErr.message,
        });
      }
    }

    // Already selected (pending > actor fallback)
    try {
      const pendingForceSecrets = shell?.buildIntent?.getSelection?.('forceSecrets') || [];
      const pendingCount = Array.isArray(pendingForceSecrets)
        ? pendingForceSecrets.reduce((sum, s) => sum + (s.count || 1), 0)
        : 0;

      alreadySelected = pendingCount > 0 ? pendingCount : (actor?.system?.progression?.forceSecrets?.length ?? 0);
      diagnostics.alreadySelected = {
        pendingCount,
        actorCount: actor?.system?.progression?.forceSecrets?.length ?? 0,
        total: alreadySelected,
      };
    } catch (selectedErr) {
      swseLogger.error(`[ForceSuiteResolution.ForceSecret] Already-selected exception for ${actorName}`, {
        sessionId,
        error: selectedErr.message,
      });
    }

    const remaining = Math.max(0, totalEntitlements - alreadySelected);
    const isBlocked = totalEntitlements === 0;
    const isEmpty = totalEntitlements > 0 && alreadySelected === 0;

    swseLogger.log(`[ForceSuiteResolution.ForceSecret] Entitlements resolved for ${actorName}`, {
      sessionId,
      total: totalEntitlements,
      selected: alreadySelected,
      remaining,
      isBlocked,
      isEmpty,
      reasons,
      diagnostics,
    });

    return {
      total: totalEntitlements,
      selected: alreadySelected,
      remaining,
      reasons,
      isBlocked,
      isEmpty,
      diagnostics,
    };
  } catch (err) {
    swseLogger.error(`[ForceSuiteResolution.ForceSecret] Unhandled exception for ${actorName}`, {
      sessionId,
      error: err.message,
      diagnostics,
    });
    return {
      total: 0,
      selected: 0,
      remaining: 0,
      reasons: [`Exception: ${err.message}`],
      isBlocked: true,
      isEmpty: false,
      diagnostics,
    };
  }
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
  const sessionId = shell?.sessionId || 'unknown';
  const actorName = actor?.name || 'unknown';
  const diagnostics = {
    sessionId,
    actorName,
    shellAvailable: !!shell,
    engineAvailable: !!engine,
    classSelection: null,
    classResolution: null,
    engineBudget: null,
    alreadySelected: null,
  };

  const reasons = [];
  let totalEntitlements = 0;
  let alreadySelected = 0;

  try {
    // Primary: Check class progression features for force_technique_choice
    const committedClass = shell?.committedSelections?.get?.('class') ||
                          shell?.buildIntent?.getSelection?.('class');

    diagnostics.classSelection = {
      exists: !!committedClass,
      id: committedClass?.id || null,
      name: committedClass?.name || null,
    };

    if (committedClass) {
      try {
        const classModel = resolveClassModel(committedClass);
        diagnostics.classResolution = {
          success: !!classModel,
          modelName: classModel?.name || null,
        };

        if (classModel && Array.isArray(classModel.levelProgression)) {
          // Count force_technique_choice features
          let featureCount = 0;
          for (const level of classModel.levelProgression) {
            if (Array.isArray(level.features)) {
              const techniqueChoices = level.features.filter(f => f.type === 'force_technique_choice');
              for (const choice of techniqueChoices) {
                totalEntitlements += (choice.value || 1);
                featureCount++;
                reasons.push(`Level ${level.level}: force_technique_choice (+${choice.value || 1})`);
              }
            }
          }
          diagnostics.classResolution.featuresFound = featureCount;
          diagnostics.classResolution.totalFromFeatures = totalEntitlements;
        } else {
          swseLogger.warn(`[ForceSuiteResolution.ForceTechnique] Class model invalid for ${actorName}`, {
            sessionId,
            classModel: classModel?.name || 'none',
            hasLevelProgression: classModel ? Array.isArray(classModel.levelProgression) : false,
          });
        }
      } catch (resolutionErr) {
        diagnostics.classResolution = {
          success: false,
          error: resolutionErr.message,
        };
        swseLogger.error(`[ForceSuiteResolution.ForceTechnique] Class resolution exception for ${actorName}`, {
          sessionId,
          error: resolutionErr.message,
        });
      }
    }

    // Secondary: Check engine choice budget if available
    if (totalEntitlements === 0 && engine?.data?.forceTechniqueChoices) {
      try {
        diagnostics.engineBudget = { found: true, count: engine.data.forceTechniqueChoices.length };
        for (const choice of engine.data.forceTechniqueChoices) {
          totalEntitlements += (choice.value || 1);
          reasons.push(`Engine choice budget: (+${choice.value || 1})`);
        }
        swseLogger.log(`[ForceSuiteResolution.ForceTechnique] Using engine budget for ${actorName}`, {
          sessionId,
          budget: engine.data.forceTechniqueChoices.length,
          totalFromEngine: totalEntitlements,
        });
      } catch (engineErr) {
        diagnostics.engineBudget = { found: true, error: engineErr.message };
        swseLogger.error(`[ForceSuiteResolution.ForceTechnique] Engine budget exception for ${actorName}`, {
          sessionId,
          error: engineErr.message,
        });
      }
    }

    // Already selected (pending > actor fallback)
    try {
      const pendingForceTechniques = shell?.buildIntent?.getSelection?.('forceTechniques') || [];
      const pendingCount = Array.isArray(pendingForceTechniques)
        ? pendingForceTechniques.reduce((sum, t) => sum + (t.count || 1), 0)
        : 0;

      alreadySelected = pendingCount > 0 ? pendingCount : (actor?.system?.progression?.forceTechniques?.length ?? 0);
      diagnostics.alreadySelected = {
        pendingCount,
        actorCount: actor?.system?.progression?.forceTechniques?.length ?? 0,
        total: alreadySelected,
      };
    } catch (selectedErr) {
      swseLogger.error(`[ForceSuiteResolution.ForceTechnique] Already-selected exception for ${actorName}`, {
        sessionId,
        error: selectedErr.message,
      });
    }

    const remaining = Math.max(0, totalEntitlements - alreadySelected);
    const isBlocked = totalEntitlements === 0;
    const isEmpty = totalEntitlements > 0 && alreadySelected === 0;

    swseLogger.log(`[ForceSuiteResolution.ForceTechnique] Entitlements resolved for ${actorName}`, {
      sessionId,
      total: totalEntitlements,
      selected: alreadySelected,
      remaining,
      isBlocked,
      isEmpty,
      reasons,
      diagnostics,
    });

    return {
      total: totalEntitlements,
      selected: alreadySelected,
      remaining,
      reasons,
      isBlocked,
      isEmpty,
      diagnostics,
    };
  } catch (err) {
    swseLogger.error(`[ForceSuiteResolution.ForceTechnique] Unhandled exception for ${actorName}`, {
      sessionId,
      error: err.message,
      diagnostics,
    });
    return {
      total: 0,
      selected: 0,
      remaining: 0,
      reasons: [`Exception: ${err.message}`],
      isBlocked: true,
      isEmpty: false,
      diagnostics,
    };
  }
}

export default {
  resolveForcePowerEntitlements,
  resolveForceSecretEntitlements,
  resolveForceTechniqueEntitlements,
};
