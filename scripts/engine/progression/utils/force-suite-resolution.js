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
import { PendingEntitlementService } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/services/pending-entitlement-service.js';

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


  const getRegisteredSetting = (moduleId, key, fallback = null) => {
    try { return globalThis.game?.settings?.get?.(moduleId, key) ?? fallback; } catch (_err) { return fallback; }
  };

  const getSetting = (key, fallback = null) => (
    getRegisteredSetting(globalThis.game?.system?.id || 'foundryvtt-swse', key, null)
    ?? getRegisteredSetting('foundryvtt-swse', key, null)
    ?? getRegisteredSetting('swse', key, null)
    ?? fallback
  );

  const getAbilityModifier = (abilityKey) => {
    const key = String(abilityKey || '').toLowerCase();
    const aliases = key === 'cha' || key === 'charisma' ? ['cha', 'charisma'] : ['wis', 'wisdom'];
    const system = actor?.system || {};
    const pendingState = shell?.buildIntent?.toCharacterData?.() || shell?.progressionSession?.toCharacterData?.() || {};
    for (const alias of aliases) {
      const pendingScore = pendingState?.attributes?.[alias]?.value ?? pendingState?.abilities?.[alias]?.value;
      const pendingMod = pendingState?.attributes?.[alias]?.mod ?? pendingState?.attributes?.[alias]?.modifier ?? pendingState?.abilities?.[alias]?.mod ?? pendingState?.abilities?.[alias]?.modifier;
      for (const value of [pendingMod, system.abilities?.[alias]?.mod, system.abilities?.[alias]?.modifier, system.attributes?.[alias]?.mod, system.attributes?.[alias]?.modifier, system.stats?.[alias]?.mod, system.stats?.[alias]?.modifier]) {
        const number = Number(value);
        if (Number.isFinite(number)) return number;
      }
      const score = Number(pendingScore ?? system.abilities?.[alias]?.value ?? system.attributes?.[alias]?.value ?? system.attributes?.[alias]?.total);
      if (Number.isFinite(score)) return Math.floor((score - 10) / 2);
    }
    return 0;
  };

  const getForceTrainingFormulaLabel = (instances = 1) => {
    const configured = String(getSetting('forceTrainingAttribute', 'wisdom') || 'wisdom').toLowerCase();
    const abilityKey = configured === 'cha' || configured === 'charisma' ? 'cha' : 'wis';
    const abilityLabel = abilityKey === 'cha' ? 'CHA' : 'WIS';
    const modifier = getAbilityModifier(abilityKey);
    const perInstance = Math.max(1, 1 + modifier);
    const count = Math.max(1, Number(instances) || 1);
    const total = count * perInstance;
    const core = `Force Training: ${abilityLabel} ${modifier >= 0 ? '+' : ''}${modifier} + 1 = ${perInstance} Force Power${perInstance === 1 ? '' : 's'}`;
    return count > 1
      ? `${core} each × ${count} = ${total} Force Powers`
      : core;
  };

  const normalizeGrantName = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();


  const collectPendingForceTrainingCount = () => {
    const containers = [
      shell?.getSelection?.('feats'),
      shell?.buildIntent?.getSelection?.('feats'),
      shell?.draftSelections?.feats,
      shell?.draftSelections?.get?.('feats'),
      shell?.committedSelections?.get?.('feats'),
      shell?.progressionSession?.draftSelections?.feats,
      shell?.progressionSession?.getSelection?.('feats'),
    ];
    let count = 0;
    for (const value of containers) {
      const entries = Array.isArray(value) ? value : (value ? [value] : []);
      let containerCount = 0;
      for (const entry of entries) {
        const name = normalizeGrantName(entry?.name || entry?.label || entry?.title || entry);
        if (name === 'force training') containerCount += Number(entry?.count || 1) || 1;
      }
      count = Math.max(count, containerCount);
    }

    // Some feat flows store only a pending entitlement record by the time the
    // active-step computer asks whether Force Powers should open. Count those
    // Force Training source records too so a stale/legacy quantity of 1 does
    // not collapse the Force Training formula to a single power.
    const entitlementEntries = collectPendingEntitlements();
    const entitlementCount = entitlementEntries.reduce((sum, entry) => {
      const sourceName = normalizeGrantName(entry?.source?.featName || entry?.sourceName || entry?.name || '');
      const type = String(entry?.type || entry?.kind || entry?.grantType || '').toLowerCase();
      if (sourceName !== 'force training' && !/force[_ -]?power/.test(type)) return sum;
      return sum + (Number(entry?.source?.count || 1) || 1);
    }, 0);

    return Math.max(count, entitlementCount);
  };

  const collectPendingEntitlements = () => {
    const containers = [
      shell?.getSelection?.('pendingEntitlements'),
      shell?.buildIntent?.getSelection?.('pendingEntitlements'),
      shell?.draftSelections?.pendingEntitlements,
      shell?.draftSelections?.get?.('pendingEntitlements'),
      shell?.committedSelections?.get?.('pendingEntitlements'),
      shell?.progressionSession?.draftSelections?.pendingEntitlements,
      shell?.progressionSession?.getSelection?.('pendingEntitlements'),
    ];
    const entries = [];
    const seen = new Set();
    for (const value of containers) {
      const list = Array.isArray(value) ? value : (value ? [value] : []);
      for (const entry of list) {
        if (!entry) continue;
        const key = entry.id || entry._id || `${entry.type || ''}:${entry.sourceId || ''}:${entry.sourceName || ''}:${entry.count || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push(entry);
      }
    }
    return entries;
  };

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

    // Force Sensitivity unlocks the Force suite but does not grant a Force Power slot.
    // Actual Force Power picks come from Force Training or explicit class grants.
    try {
      const classGrantsForceSensitivity = selectedClassGrantsForceSensitivity(committedClass);
      const ownedForceSensitivity = actorHasForceSensitivity();
      const pendingForceSensitivityFeat = FeatGrantEntitlementResolver.getFeatEntries(actor, { shell, includePending: true })
        .some((entry) => normalizeGrantName(entry?.name) === 'force sensitivity');
      diagnostics.forceSensitivityAccess = {
        classGrant: classGrantsForceSensitivity,
        actorOwned: ownedForceSensitivity,
        pendingFeat: pendingForceSensitivityFeat,
      };
      if (classGrantsForceSensitivity || ownedForceSensitivity || pendingForceSensitivityFeat) {
        const forceSensitivityGrantsPower = getSetting('forceSensitivityGrantsForcePower', false) === true;
        if (forceSensitivityGrantsPower) {
          totalEntitlements += 1;
          reasons.push('Force Sensitive = 1 Force Power');
          diagnostics.forceSensitivityAccess.grantsPower = true;
        } else {
          diagnostics.forceSensitivityAccess.grantsPower = false;
        }
      }
    } catch (forceSensitivityErr) {
      swseLogger.error(`[ForceSuiteResolution.ForcePower] Force Sensitive access exception for ${actorName}`, {
        sessionId,
        error: forceSensitivityErr.message,
      });
    }

    // Feat grant entitlements: pending or owned Force Training instances unlock
    // Force Power slots, but the Force Power step owns the actual choices.
    try {
      const allForceEntitlements = FeatGrantEntitlementResolver.resolve(actor, { shell, includePending: true });
      swseLogger.debug(`[ForceSuiteResolution.ForcePower] All entitlements from resolver`, {
        sessionId,
        allEntitlements: allForceEntitlements.map(e => ({
          grantType: e.grantType,
          sourceName: e.sourceName,
          sourceType: e.sourceType,
          count: e.count
        }))
      });

      const forceTrainingEntitlements = allForceEntitlements
        .filter((entry) => entry.grantType === 'forcePowerSlots')
        .filter((entry) => !isLevelUpLike || entry.sourceType === 'pendingFeat');
      const forceTrainingSlots = forceTrainingEntitlements.reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);

      swseLogger.debug(`[ForceSuiteResolution.ForcePower] Force Training slot calculation`, {
        sessionId,
        forceTrainingEntitlements: forceTrainingEntitlements.map(e => ({
          sourceName: e.sourceName,
          sourceType: e.sourceType,
          count: e.count
        })),
        forceTrainingSlots
      });

      let finalForceTrainingSlots = forceTrainingSlots;
      const pendingForceTrainingCount = collectPendingForceTrainingCount();
      const pendingEntitlements = collectPendingEntitlements();
      const pendingEntitlementSlots = PendingEntitlementService.countUnspentByType(
        pendingEntitlements,
        'force_power_pick'
      );
      if (pendingForceTrainingCount > 0) {
        const slotsPerInstance = FeatGrantEntitlementResolver.getForceTrainingSlotsPerInstance?.(actor, shell) || 1;
        const formulaSlots = pendingForceTrainingCount * slotsPerInstance;
        if (formulaSlots > finalForceTrainingSlots) {
          finalForceTrainingSlots = formulaSlots;
          reasons.push(getForceTrainingFormulaLabel(pendingForceTrainingCount));
        }
      }
      if (pendingEntitlementSlots > finalForceTrainingSlots) {
        finalForceTrainingSlots = pendingEntitlementSlots;
        reasons.push(`Pending Force Power entitlement slots: ${pendingEntitlementSlots}`);
      }

      if (finalForceTrainingSlots > 0) {
        totalEntitlements += finalForceTrainingSlots;
        if (!reasons.some(reason => String(reason).startsWith('Force Training:'))) reasons.push(getForceTrainingFormulaLabel(Math.max(1, pendingForceTrainingCount || forceTrainingEntitlements.length || 1)));
        diagnostics.forceTrainingEntitlements = {
          total: finalForceTrainingSlots,
          entries: forceTrainingEntitlements.length,
          pendingForceTrainingCount,
          pendingEntitlementCount: pendingEntitlements.length,
          pendingEntitlementSlots,
        };
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
          reasons.push(getForceTrainingFormulaLabel(1));
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
      const pendingContainers = [
        shell?.getSelection?.('forcePowers'),
        shell?.buildIntent?.getSelection?.('forcePowers'),
        shell?.draftSelections?.forcePowers,
        shell?.draftSelections?.get?.('forcePowers'),
        shell?.committedSelections?.get?.('forcePowers'),
        shell?.progressionSession?.draftSelections?.forcePowers,
        shell?.progressionSession?.getSelection?.('forcePowers'),
      ];
      let pendingCount = 0;
      for (const value of pendingContainers) {
        const entries = Array.isArray(value) ? value : (value ? [value] : []);
        const containerCount = entries.reduce((sum, entry) => sum + (Number(entry?.count || 1) || 1), 0);
        pendingCount = Math.max(pendingCount, containerCount);
      }

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
