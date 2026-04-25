/**
 * Class Grant Ledger Builder
 *
 * Derives and validates class-granted features (provisional grants) for immediate
 * availability during prerequisite checking in the same progression session.
 *
 * RESPONSIBILITIES:
 * - Derive granted feats/proficiencies from selected class
 * - Validate conditional grants (marked with *) against prerequisites
 * - Build canonical pending grant ledger for AbilityEngine
 * - Support feat, talent, proficiency, and force sensitivity grants
 *
 * INTEGRATION POINTS:
 * - feat-step.js calls this to populate pending.grantedFeats
 * - talent-step.js calls this to populate pending.grantedFeats
 * - force-power-step.js calls this to populate pending.grantedFeats
 * - All AbilityEngine calls receive the grant ledger in pending object
 */

import { getClassAutoGrants } from '/systems/foundryvtt-swse/scripts/engine/progression/engine/autogrants/class-autogrants.js';
import { PrerequisiteChecker } from '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js';
import { resolveClassModel } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

/**
 * Build a provisional grant ledger from class selection.
 *
 * This is the CANONICAL SOURCE for class-granted features during a progression session.
 * All downstream prerequisite checks use this ledger to validate feat/talent/force legality.
 *
 * CONDITIONAL GRANTS (marked with *):
 * - Linguist* (Noble): Only granted if actor has prerequisites
 * - Shake It Off* (Scout): Only granted if actor has prerequisites
 *
 * The asterisk notation is handled specially: these grants are validated before adding
 * to the ledger. If prerequisites are not met, the feat is not granted.
 *
 * @param {Object} actor - Actor document
 * @param {Object|string} classSelection - Class selection (from pending state)
 * @param {Object} pendingState - Current pending state (selected feats, talents, etc.)
 * @returns {Object} Ledger with structure:
 *   {
 *     classId: string,
 *     className: string,
 *     grantedFeats: [ {name, validated, wasConditional} ... ],
 *     grantedProficiencies: [ {name, type} ... ],
 *     forceSensitive: boolean,
 *     errors: string[]
 *   }
 *
 * The returned ledger structure can be spread into pending object as:
 *   { ...ledger, selectedFeats, selectedTalents, ... }
 */
export function buildClassGrantLedger(actor, classSelection, pendingState = {}) {
  const ledger = {
    classId: null,
    className: null,
    grantedFeats: [],
    grantedProficiencies: [],
    forceSensitive: false,
    errors: [],
  };

  // Validate inputs
  if (!actor) {
    ledger.errors.push('buildClassGrantLedger: actor is required');
    return ledger;
  }

  if (!classSelection) {
    SWSELogger.debug('[ClassGrantLedger] No class selected; returning empty ledger');
    return ledger;
  }

  try {
    // Resolve to full ClassModel
    const classModel = resolveClassModel(classSelection);
    if (!classModel) {
      SWSELogger.debug('[ClassGrantLedger] Failed to resolve class model from selection', {
        selection: classSelection,
      });
      return ledger;
    }

    ledger.classId = classModel.id || classModel.classId || null;
    ledger.className = classModel.name || null;

    // Get raw grants from ClassAutoGrants (name-based lookup)
    const rawGrants = getClassAutoGrants(classModel.name);
    if (!rawGrants || !Array.isArray(rawGrants)) {
      SWSELogger.debug('[ClassGrantLedger] No grants defined for class', {
        className: classModel.name,
      });
      return ledger;
    }

    // Separate conditional (*) from unconditional grants
    const unconditionalGrants = [];
    const conditionalGrants = [];

    for (const grantName of rawGrants) {
      const isConditional = grantName.endsWith('*');
      const cleanName = isConditional ? grantName.slice(0, -1) : grantName;

      if (isConditional) {
        conditionalGrants.push(cleanName);
      } else {
        unconditionalGrants.push(cleanName);
      }
    }

    // Add unconditional grants directly
    for (const grantName of unconditionalGrants) {
      // Categorize by type
      if (grantName.toLowerCase().includes('armor proficiency')) {
        ledger.grantedProficiencies.push({
          name: grantName,
          type: 'armor',
        });
      } else if (grantName.toLowerCase().includes('weapon proficiency')) {
        ledger.grantedProficiencies.push({
          name: grantName,
          type: 'weapon',
        });
      } else if (grantName.toLowerCase() === 'force sensitivity') {
        ledger.forceSensitive = true;
        ledger.grantedFeats.push({
          name: grantName,
          validated: true,
          wasConditional: false,
        });
      } else {
        ledger.grantedFeats.push({
          name: grantName,
          validated: true,
          wasConditional: false,
        });
      }
    }

    // Validate conditional grants before adding
    for (const grantName of conditionalGrants) {
      const featToValidate = { name: grantName, system: {} };

      // Build a temporary pending state that includes grants we've added so far
      const tempPending = {
        ...pendingState,
        grantedFeats: ledger.grantedFeats.map(g => ({ name: g.name })),
      };

      // Check prerequisites for this conditional feat
      const prereqCheck = PrerequisiteChecker.checkFeatPrerequisites(actor, featToValidate, tempPending);

      if (prereqCheck.met) {
        // Prerequisites are satisfied; grant this feat
        ledger.grantedFeats.push({
          name: grantName,
          validated: true,
          wasConditional: true,
        });
        SWSELogger.debug('[ClassGrantLedger] Conditional grant validated', {
          className: classModel.name,
          grantName,
          prerequisites: 'satisfied',
        });
      } else {
        // Prerequisites not satisfied; do not grant
        SWSELogger.debug('[ClassGrantLedger] Conditional grant NOT validated', {
          className: classModel.name,
          grantName,
          missingPrequisites: prereqCheck.missing,
        });
      }
    }

    SWSELogger.debug('[ClassGrantLedger] Built grant ledger', {
      className: classModel.name,
      unconditionalCount: unconditionalGrants.length,
      conditionalCount: conditionalGrants.length,
      grantedFeatsCount: ledger.grantedFeats.length,
      grantedProficienciesCount: ledger.grantedProficiencies.length,
      forceSensitive: ledger.forceSensitive,
    });

    return ledger;
  } catch (err) {
    ledger.errors.push(`Exception while building grant ledger: ${err.message}`);
    SWSELogger.error('[ClassGrantLedger] Exception', err);
    return ledger;
  }
}

/**
 * Merge a grant ledger into pending state for prerequisite checking.
 *
 * This ensures that all downstream prerequisite checks can see class-granted features.
 *
 * @param {Object} pending - Current pending state
 * @param {Object} ledger - Grant ledger from buildClassGrantLedger()
 * @returns {Object} Updated pending state with grants integrated
 */
export function mergeLedgerIntoPending(pending = {}, ledger = {}) {
  if (!ledger || !ledger.grantedFeats) {
    return pending;
  }

  return {
    ...pending,
    grantedFeats: ledger.grantedFeats || [],
    grantedProficiencies: ledger.grantedProficiencies || [],
    forceSensitive: pending.forceSensitive || ledger.forceSensitive || false,
  };
}
