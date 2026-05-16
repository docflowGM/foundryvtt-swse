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
import { buildLevelUpEventContext, countClassFeatureChoicesAtLevel, getClassLevelProgressionEntry } from './levelup-event-context.js';
import { FeatGrantEntitlementResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js';
import { buildClassGrantLedger } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';

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
  const isLevelUpLike = shell?.mode === 'levelup';

  const normalizeGrantName = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const actorHasForceSensitivity = () => {
    const items = Array.from(actor?.items || []);
    return items.some((item) => item?.type === 'feat' && /force sensitiv(?:e|ity)/i.test(String(item?.name || '')));
  };

  const selectedClassGrantsForceSensitivity = (classSelection) => {
    if (!classSelection || !actor) return false;
    try {
      const pendingState = shell?.buildIntent?.toCharacterData?.() || shell?.progressionSession?.toCharacterData?.() || {};
      const ledger = buildClassGrantLedger(actor, classSelection, pendingState);
      return ledger?.forceSensitive === true
        || Array.from(ledger?.grantedFeats || []).some((grant) => normalizeGrantName(grant?.name) === 'force sensitivity');
    } catch (err) {
      swseLogger.warn(`[ForceSuiteResolution.ForcePower] Force Sensitivity class grant detection failed for ${actorName}`, {
        sessionId,
        error: err.message,
      });
      return false;
    }
  };

  try {
    // Primary: Check pending shell/buildIntent for force power selections
    const committedClass = shell?.getSelection?.('class') ||
                          shell?.draftSelections?.class ||
                          shell?.committedSelections?.get?.('class') ||
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
          if (isLevelUpLike) {
            const levelContext = buildLevelUpEventContext(actor, shell);
            const classLevel = levelContext?.selectedClassNextLevel || 1;
            const levelEntry = getClassLevelProgressionEntry(classModel, classLevel);
            const classGrants = Number(levelEntry?.force_power_grants || levelEntry?.forcePowerGrants || 0) || 0;
            if (classGrants > 0) {
              totalEntitlements += classGrants;
              reasons.push(`Class level ${classLevel}: force_power_grants (+${classGrants})`);
            }
            diagnostics.classResolution.classLevel = classLevel;
            diagnostics.classResolution.forcePowerGrants = classGrants;
          } else {
            // Use ForcePowerEngine to calculate from class + feats for legacy/chargen flows.
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

    // Force Sensitivity grants the first Force Power training slot. During chargen
    // this is often a pending class auto-grant (Jedi) rather than an actor item,
    // so it must be counted from the provisional class grant ledger. Count it
    // once only; it is not repeatable.
    try {
      const classGrantsForceSensitivity = selectedClassGrantsForceSensitivity(committedClass);
      const ownedForceSensitivity = actorHasForceSensitivity();
      const pendingForceSensitivityFeat = FeatGrantEntitlementResolver.getFeatEntries(actor, { shell, includePending: true })
        .some((entry) => normalizeGrantName(entry?.name) === 'force sensitivity');
      const forceSensitivityApplies = isLevelUpLike
        ? ((classGrantsForceSensitivity || pendingForceSensitivityFeat) && !ownedForceSensitivity)
        : (classGrantsForceSensitivity || ownedForceSensitivity || pendingForceSensitivityFeat);
      if (forceSensitivityApplies) {
        totalEntitlements += 1;
        reasons.push('Force Sensitive grants +1 Force Power training');
        diagnostics.forceSensitivityEntitlement = {
          total: 1,
          classGrant: classGrantsForceSensitivity,
          actorOwned: ownedForceSensitivity,
          pendingFeat: pendingForceSensitivityFeat,
        };
      }
    } catch (forceSensitivityErr) {
      swseLogger.error(`[ForceSuiteResolution.ForcePower] Force Sensitive entitlement exception for ${actorName}`, {
        sessionId,
        error: forceSensitivityErr.message,
      });
    }

    // Feat grant entitlements: pending or owned Force Training instances unlock
    // Force Power slots, but the Force Power step owns the actual choices.
    try {
      const forceTrainingEntitlements = FeatGrantEntitlementResolver.resolve(actor, { shell, includePending: true })
        .filter((entry) => entry.grantType === 'forcePowerSlots')
        .filter((entry) => !isLevelUpLike || entry.sourceType === 'pendingFeat');
      const forceTrainingSlots = forceTrainingEntitlements.reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
      if (forceTrainingSlots > 0) {
        totalEntitlements += forceTrainingSlots;
        reasons.push(`Force Training entitlement slots: ${forceTrainingSlots}`);
        diagnostics.forceTrainingEntitlements = { total: forceTrainingSlots };
      }
    } catch (entitlementErr) {
      swseLogger.error(`[ForceSuiteResolution.ForcePower] Force Training entitlement exception for ${actorName}`, {
        sessionId,
        error: entitlementErr.message,
      });
    }

    // Fallback: If no result yet, check actor state through the entitlement bridge.
    if (!isLevelUpLike && totalEntitlements === 0 && actor) {
      try {
        const forceTrainingSlots = FeatGrantEntitlementResolver.totalForGrantType(actor, 'forcePowerSlots', { includePending: false });

        if (forceTrainingSlots > 0) {
          totalEntitlements = forceTrainingSlots;
          reasons.push(`Force Training feats (actor fallback): ${totalEntitlements}`);
          fallbackUsed = true;
          diagnostics.fallbackUsed = true;

          swseLogger.log(`[ForceSuiteResolution.ForcePower] Using actor fallback for ${actorName}`, {
            sessionId,
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

      const actorCount = actor?.system?.progression?.forcePowers?.length ?? 0;
      alreadySelected = isLevelUpLike ? pendingCount : (pendingCount > 0 ? pendingCount : actorCount);
      diagnostics.alreadySelected = {
        pendingCount,
        actorCount,
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
    const committedClass = shell?.getSelection?.('class') ||
                          shell?.draftSelections?.class ||
                          shell?.committedSelections?.get?.('class') ||
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
          const levelContext = buildLevelUpEventContext(actor, shell);
          const classLevel = levelContext?.selectedClassNextLevel || 1;
          totalEntitlements += countClassFeatureChoicesAtLevel(classModel, classLevel, 'force_secret_choice');
          if (totalEntitlements > 0) {
            reasons.push(`Class level ${classLevel}: force_secret_choice (+${totalEntitlements})`);
          }
          diagnostics.classResolution.featuresFound = totalEntitlements;
          diagnostics.classResolution.totalFromFeatures = totalEntitlements;
          diagnostics.classResolution.classLevel = classLevel;
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
      const pendingForceSecrets = shell?.getSelection?.('forceSecrets') || shell?.draftSelections?.forceSecrets || shell?.buildIntent?.getSelection?.('forceSecrets') || [];
      const pendingCount = Array.isArray(pendingForceSecrets)
        ? pendingForceSecrets.reduce((sum, s) => sum + (s.count || 1), 0)
        : 0;

      const actorCount = actor?.system?.progression?.forceSecrets?.length ?? 0;
      // For level-up class-level grants, actor historical choices should block duplicates
      // in the UI, not consume the current level's entitlement.
      alreadySelected = pendingCount;
      diagnostics.alreadySelected = {
        pendingCount,
        actorCount,
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
    const committedClass = shell?.getSelection?.('class') ||
                          shell?.draftSelections?.class ||
                          shell?.committedSelections?.get?.('class') ||
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
          const levelContext = buildLevelUpEventContext(actor, shell);
          const classLevel = levelContext?.selectedClassNextLevel || 1;
          totalEntitlements += countClassFeatureChoicesAtLevel(classModel, classLevel, 'force_technique_choice');
          if (totalEntitlements > 0) {
            reasons.push(`Class level ${classLevel}: force_technique_choice (+${totalEntitlements})`);
          }
          diagnostics.classResolution.featuresFound = totalEntitlements;
          diagnostics.classResolution.totalFromFeatures = totalEntitlements;
          diagnostics.classResolution.classLevel = classLevel;
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
      const pendingForceTechniques = shell?.getSelection?.('forceTechniques') || shell?.draftSelections?.forceTechniques || shell?.buildIntent?.getSelection?.('forceTechniques') || [];
      const pendingCount = Array.isArray(pendingForceTechniques)
        ? pendingForceTechniques.reduce((sum, t) => sum + (t.count || 1), 0)
        : 0;

      const actorCount = actor?.system?.progression?.forceTechniques?.length ?? 0;
      // For level-up class-level grants, actor historical choices should block duplicates
      // in the UI, not consume the current level's entitlement.
      alreadySelected = pendingCount;
      diagnostics.alreadySelected = {
        pendingCount,
        actorCount,
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
