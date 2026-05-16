/**
 * Medical Secret Resolution Helper
 *
 * Resolves Medic medical_secret_choice entitlements at the selected class level.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { resolveClassModel } from './class-resolution.js';
import { buildLevelUpEventContext, countClassFeatureChoicesAtLevel } from './levelup-event-context.js';

function countSelections(values = []) {
  return Array.isArray(values)
    ? values.reduce((sum, entry) => sum + Math.max(1, Number(entry?.count || 1)), 0)
    : 0;
}

function countExistingMedicalSecrets(actor) {
  const systemSecrets = actor?.system?.progression?.medicalSecrets || actor?.system?.medicalSecrets || [];
  const systemCount = Array.isArray(systemSecrets) ? systemSecrets.length : 0;
  const itemCount = actor?.items?.filter?.((item) => {
    const tags = item?.system?.tags || [];
    return tags.includes?.('medical_secret') || item?.flags?.swse?.medicalSecret === true;
  })?.length || 0;
  return Math.max(systemCount, itemCount);
}

export function resolveMedicalSecretEntitlements(shell, engine, actor) {
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
    const committedClass = shell?.getSelection?.('class')
      || shell?.draftSelections?.class
      || shell?.committedSelections?.get?.('class')
      || shell?.buildIntent?.getSelection?.('class');

    diagnostics.classSelection = {
      exists: !!committedClass,
      id: committedClass?.id || committedClass?.classId || null,
      name: committedClass?.name || committedClass?.className || null,
    };

    if (committedClass) {
      const classModel = resolveClassModel(committedClass);
      diagnostics.classResolution = {
        success: !!classModel,
        modelName: classModel?.name || null,
      };

      if (classModel) {
        const levelContext = buildLevelUpEventContext(actor, shell);
        const classLevel = levelContext?.selectedClassNextLevel || 1;
        totalEntitlements += countClassFeatureChoicesAtLevel(classModel, classLevel, 'medical_secret_choice');
        if (totalEntitlements > 0) {
          reasons.push(`Class level ${classLevel}: medical_secret_choice (+${totalEntitlements})`);
        }
        diagnostics.classResolution.classLevel = classLevel;
        diagnostics.classResolution.totalFromFeatures = totalEntitlements;
      }
    }

    if (totalEntitlements === 0 && engine?.data?.medicalSecretChoices) {
      diagnostics.engineBudget = { found: true, count: engine.data.medicalSecretChoices.length };
      for (const choice of engine.data.medicalSecretChoices) {
        totalEntitlements += Math.max(1, Number(choice?.value || 1));
      }
      if (totalEntitlements > 0) reasons.push(`Engine choice budget: (+${totalEntitlements})`);
    }

    const pending = shell?.getSelection?.('medicalSecrets')
      || shell?.draftSelections?.medicalSecrets
      || shell?.buildIntent?.getSelection?.('medicalSecrets')
      || [];
    const pendingCount = countSelections(pending);
    const actorCount = countExistingMedicalSecrets(actor);
    // Actor historical Medical Secrets block duplicate choices in the picker,
    // but do not consume the current even-level Medic entitlement.
    alreadySelected = pendingCount;
    diagnostics.alreadySelected = { pendingCount, actorCount, total: alreadySelected };

    const remaining = Math.max(0, totalEntitlements - alreadySelected);
    return {
      total: totalEntitlements,
      selected: alreadySelected,
      remaining,
      reasons,
      isBlocked: totalEntitlements === 0,
      isEmpty: totalEntitlements > 0 && alreadySelected === 0,
      diagnostics,
    };
  } catch (err) {
    swseLogger.error(`[MedicalSecretResolution] Unhandled exception for ${actorName}`, {
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

export default { resolveMedicalSecretEntitlements };
