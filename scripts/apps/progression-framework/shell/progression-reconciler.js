/**
 * Progression Reconciler — Phase 2
 *
 * Handles invalidation and reconciliation when upstream selections change.
 *
 * When a player changes an upstream choice (e.g., class), this module:
 * 1. Identifies downstream nodes affected by the change
 * 2. Marks affected nodes as dirty or purges their selections
 * 3. Rechecks legality of downstream selections via AbilityEngine
 * 4. Recomputes active step list in case conditional nodes appeared/disappeared
 * 5. Moves current step to a safe location if the current node was removed
 *
 * Usage:
 *   const reconciler = new ProgressionReconciler();
 *   await reconciler.reconcileAfterCommit(
 *     changedNodeId,  // e.g., 'class'
 *     actor,
 *     progressionSession,
 *     { activeStepComputer, currentStepId, mode, subtype }
 *   );
 *
 * Returns: { removed, dirty, purged, newActiveSteps, nextStepId, warnings }
 */

import { swseLogger } from '../../../utils/logger.js';
import {
  PROGRESSION_NODE_REGISTRY,
  InvalidationBehavior,
} from '../../../engine/progression/registries/progression-node-registry.js';
import { AbilityEngine } from '../../../engine/abilities/AbilityEngine.js';
import { resolveClassModel } from '../../../engine/progression/utils/class-resolution.js';
import {
  getClassLevelProgressionEntry,
  normalizeClassKey,
} from '../../../engine/progression/utils/levelup-event-context.js';


const ABILITY_KEYS = Object.freeze(['str', 'dex', 'con', 'int', 'wis', 'cha']);
const ABILITY_LABELS = Object.freeze({
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
});

const CHOICE_FEATURE_TYPES = Object.freeze({
  feat_choice: 'class-feat',
  talent_choice: 'talent',
  force_secret_choice: 'force-secret',
  force_technique_choice: 'force-technique',
  force_power_choice: 'force-power',
  medical_secret_choice: 'medical-secret',
  starship_maneuver_choice: 'starship-maneuver',
});

function normalizeText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Unknown';
}

function readActorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function readClassLevel(item) {
  return Math.max(0, Number(item?.system?.level ?? item?.system?.levels ?? item?.system?.rank ?? item?.level ?? 0) || 0);
}

function featureType(feature = {}) {
  return String(feature?.type || feature?.kind || feature?.featureType || feature?.system?.progressionFeatureType || '')
    .trim()
    .toLowerCase();
}

function featureQuantity(feature = {}) {
  return Math.max(1, Number(feature?.value ?? feature?.quantity ?? feature?.count ?? 1) || 1);
}

function normalizeLevel(value) {
  const level = Number(value);
  return Number.isFinite(level) && level > 0 ? Math.floor(level) : 0;
}

function abilityIncreaseRecordLevel(entry = {}) {
  return normalizeLevel(entry.level ?? entry.characterLevel ?? entry.acquiredAtLevel ?? entry.sourceLevel);
}

function normalizeAbilityIncreases(value = {}) {
  const source = value?.increases || value?.abilityIncreases || value || {};
  const out = {};
  for (const key of ABILITY_KEYS) {
    const delta = Math.max(0, Math.floor(Number(source?.[key] ?? 0) || 0));
    if (delta > 0) out[key] = delta;
  }
  return out;
}

function abilityIncreaseCount(value = {}) {
  return Object.values(normalizeAbilityIncreases(value)).reduce((sum, delta) => sum + delta, 0);
}

function getActorTotalLevel(actor) {
  const explicit = normalizeLevel(actor?.system?.level ?? actor?.system?.details?.level ?? actor?.system?.progression?.level);
  const fromClasses = readActorItems(actor)
    .filter(item => item?.type === 'class')
    .reduce((sum, item) => sum + readClassLevel(item), 0);
  return Math.max(explicit, fromClasses, 0);
}

export class ProgressionReconciler {
  /**
   * Build an actor-wide progression reconciliation report.
   * This is the canonical sheet/progression audit seam: progression workflows can
   * consume the full report, while sheets can request a presentation projection
   * from the same reconciler instance.
   *
   * @param {Actor} actor
   * @param {Object} options
   * @param {'report'|'sheet'} options.output
   * @returns {Object}
   */
  static reconcileActor(actor, options = {}) {
    const reconciler = new ProgressionReconciler();
    const report = reconciler.reconcileActor(actor, options);
    return options.output === 'sheet' ? reconciler.toSheetAudit(report, options) : report;
  }

  reconcileActor(actor, options = {}) {
    const report = {
      kind: 'swse-actor-progression-reconciliation',
      version: 1,
      actorId: actor?.id || null,
      actorName: actor?.name || 'Actor',
      totalLevel: getActorTotalLevel(actor),
      classSummaries: this._buildClassSummaries(actor),
      slots: {
        abilityIncreases: [],
        classChoices: [],
      },
      warnings: [],
      status: 'ok',
    };

    report.slots.abilityIncreases = this._buildAbilityIncreaseSlots(actor, report.totalLevel);
    report.slots.classChoices = this._buildClassChoiceSlots(actor, report.classSummaries);

    const openAbilitySlots = report.slots.abilityIncreases.filter(slot => slot.status === 'open');
    const openClassChoices = report.slots.classChoices.filter(slot => slot.status === 'open');
    if (openAbilitySlots.length || openClassChoices.length) {
      report.status = 'needs-attention';
    }

    if (openAbilitySlots.length) {
      report.warnings.push(`${openAbilitySlots.length} unresolved ability score increase ${openAbilitySlots.length === 1 ? 'level' : 'levels'}`);
    }
    if (openClassChoices.length) {
      report.warnings.push(`${openClassChoices.length} unresolved class progression ${openClassChoices.length === 1 ? 'choice' : 'choices'}`);
    }

    return report;
  }

  toSheetAudit(report = {}, _options = {}) {
    const abilitySlots = Array.isArray(report?.slots?.abilityIncreases) ? report.slots.abilityIncreases : [];
    const openAbilitySlots = abilitySlots.filter(slot => slot.status === 'open');
    const filledAbilitySlots = abilitySlots.filter(slot => slot.status === 'filled');
    const classChoiceSlots = Array.isArray(report?.slots?.classChoices) ? report.slots.classChoices : [];
    const openClassChoiceSlots = classChoiceSlots.filter(slot => slot.status === 'open');

    return {
      kind: 'swse-actor-progression-reconciliation-sheet',
      status: report?.status || 'ok',
      totalLevel: Number(report?.totalLevel || 0) || 0,
      warnings: Array.isArray(report?.warnings) ? report.warnings : [],
      abilityIncreases: {
        expected: abilitySlots.reduce((sum, slot) => sum + (Number(slot.count) || 0), 0),
        filled: filledAbilitySlots.reduce((sum, slot) => sum + (Number(slot.filledCount) || 0), 0),
        open: openAbilitySlots.reduce((sum, slot) => sum + (Number(slot.openCount) || 0), 0),
        hasOpenSlots: openAbilitySlots.length > 0,
        slots: abilitySlots,
        openSlots: openAbilitySlots.map(slot => ({
          ...slot,
          title: `Level ${slot.characterLevel} Ability Increase`,
          detail: `Choose ${slot.openCount} ${slot.openCount === 1 ? 'ability score' : 'different ability scores'} to increase.`,
        })),
      },
      classChoices: {
        expected: classChoiceSlots.length,
        open: openClassChoiceSlots.length,
        hasOpenSlots: openClassChoiceSlots.length > 0,
        openSlots: openClassChoiceSlots,
        featOpen: openClassChoiceSlots.filter(slot => slot.type === 'class-feat').length,
        talentOpen: openClassChoiceSlots.filter(slot => slot.type === 'talent').length,
      },
      tasks: this._buildSheetTasks({ openAbilitySlots, openClassChoiceSlots }),
    };
  }

  _buildSheetTasks({ openAbilitySlots = [], openClassChoiceSlots = [] } = {}) {
    const featSlots = openClassChoiceSlots.filter(slot => slot.type === 'class-feat');
    const talentSlots = openClassChoiceSlots.filter(slot => slot.type === 'talent');
    const tasks = [];

    if (openAbilitySlots.length) {
      const openCount = openAbilitySlots.reduce((sum, slot) => sum + (Number(slot.openCount) || 0), 0);
      tasks.push({
        key: 'ability-increases',
        type: 'ability-increase',
        label: 'Ability score increases',
        count: openCount,
        slotCount: openAbilitySlots.length,
        tab: 'abilities',
        sheetAnchor: 'ability-increases',
        stepId: 'attribute',
        job: 'ability-increase',
        routeId: 'sheet',
        detail: openAbilitySlots.map(slot => slot.label || slot.title).filter(Boolean),
      });
    }

    if (featSlots.length) {
      tasks.push({
        key: 'feats',
        type: 'feat',
        label: 'Feats to learn',
        count: featSlots.length,
        slotCount: featSlots.length,
        tab: 'abilities',
        sheetAnchor: 'feat-ledger',
        stepId: 'class-feat',
        job: 'choose-feat',
        routeId: 'sheet',
        detail: featSlots.map(slot => slot.label || slot.source).filter(Boolean),
      });
    }

    if (talentSlots.length) {
      tasks.push({
        key: 'talents',
        type: 'talent',
        label: 'Talents to learn',
        count: talentSlots.length,
        slotCount: talentSlots.length,
        tab: 'abilities',
        sheetAnchor: 'talent-ledger',
        stepId: 'class-talent',
        job: 'choose-talent',
        routeId: 'sheet',
        detail: talentSlots.map(slot => slot.label || slot.source).filter(Boolean),
      });
    }

    return tasks;
  }

  _buildClassSummaries(actor) {
    return readActorItems(actor)
      .filter(item => item?.type === 'class')
      .map(item => {
        const model = resolveClassModel(item) || item;
        const classId = normalizeClassKey(model || item) || normalizeClassKey(item?.system?.classId || item?.name);
        return {
          itemId: item.id || null,
          classId,
          className: model?.name || item?.name || titleCase(classId),
          level: readClassLevel(item),
          model,
          item,
        };
      })
      .filter(entry => entry.level > 0);
  }

  _buildAbilityIncreaseSlots(actor, totalLevel) {
    const expectedLevels = [];
    const maxLevel = Math.min(Math.max(0, Number(totalLevel) || 0), 20);
    for (let level = 4; level <= maxLevel; level += 4) {
      expectedLevels.push(level);
    }

    const history = this._readAbilityIncreaseHistory(actor);
    const byLevel = new Map();
    for (const entry of history) {
      const level = abilityIncreaseRecordLevel(entry);
      if (!level) continue;
      const previous = byLevel.get(level) || { level, count: 0, increases: {} };
      const increases = normalizeAbilityIncreases(entry);
      for (const [key, delta] of Object.entries(increases)) {
        previous.increases[key] = Math.max(previous.increases[key] || 0, delta);
      }
      previous.count = Math.max(previous.count || 0, abilityIncreaseCount(entry));
      byLevel.set(level, previous);
    }

    return expectedLevels.map(level => {
      const expectedCount = this._abilityIncreaseCountForActor(actor, level);
      const record = byLevel.get(level) || null;
      const filledCount = Math.min(expectedCount, Number(record?.count || 0) || 0);
      const openCount = Math.max(0, expectedCount - filledCount);
      const selections = Object.entries(record?.increases || {})
        .filter(([, delta]) => Number(delta || 0) > 0)
        .map(([key, delta]) => `${ABILITY_LABELS[key] || key.toUpperCase()} +${delta}`);

      return {
        id: `ability-increase-level-${level}`,
        type: 'ability-increase',
        characterLevel: level,
        levelLabel: `Level ${level}`,
        count: expectedCount,
        filledCount,
        openCount,
        status: openCount > 0 ? 'open' : 'filled',
        label: `Level ${level} Ability Increase`,
        source: `Character Level ${level}`,
        selections,
      };
    });
  }

  _readAbilityIncreaseHistory(actor) {
    const progression = actor?.system?.progression || {};
    const history = Array.isArray(progression.abilityIncreaseHistory) ? [...progression.abilityIncreaseHistory] : [];
    const legacy = progression.lastAbilityIncrease;
    if (legacy && typeof legacy === 'object') {
      const legacyLevel = abilityIncreaseRecordLevel(legacy);
      const alreadyTracked = legacyLevel && history.some(entry => abilityIncreaseRecordLevel(entry) === legacyLevel);
      if (!alreadyTracked) history.push(legacy);
    }
    return history;
  }

  _abilityIncreaseCountForActor(actor, _level) {
    const isDroid = actor?.type === 'droid' || actor?.system?.isDroid === true;
    const isNonheroic = actor?.system?.class?.id === 'nonheroic'
      || actor?.system?.class?.name === 'Nonheroic'
      || readActorItems(actor).some(item => item?.type === 'class' && String(item?.name || '').toLowerCase() === 'nonheroic');
    if (isDroid || isNonheroic) return 1;
    return 2;
  }

  _buildClassChoiceSlots(actor, classSummaries = []) {
    const existingItems = readActorItems(actor);
    const slots = [];
    for (const classSummary of classSummaries) {
      for (let classLevel = 1; classLevel <= classSummary.level; classLevel += 1) {
        const levelEntry = getClassLevelProgressionEntry(classSummary.model, classLevel) || {};
        const features = Array.isArray(levelEntry.features) ? levelEntry.features : [];
        for (const feature of features) {
          const type = featureType(feature);
          const slotKind = CHOICE_FEATURE_TYPES[type];
          if (!slotKind) continue;
          const quantity = featureQuantity(feature);
          for (let index = 0; index < quantity; index += 1) {
            const id = `${classSummary.classId}-${classLevel}-${slotKind}-${index + 1}`;
            const filledBy = this._findItemForChoiceSlot(existingItems, {
              slotKind,
              classSummary,
              classLevel,
              feature,
            });
            slots.push({
              id,
              type: slotKind,
              classId: classSummary.classId,
              className: classSummary.className,
              classLevel,
              levelLabel: `${classSummary.className} ${classLevel}`,
              count: 1,
              status: filledBy ? 'filled' : 'open',
              filledBy: filledBy?.id || null,
              filledByName: filledBy?.name || null,
              label: `${classSummary.className} ${classLevel} ${titleCase(slotKind)}`,
              source: `${classSummary.className} ${classLevel}`,
            });
          }
        }
      }
    }
    return slots;
  }

  _findItemForChoiceSlot(items = [], slot = {}) {
    const typeBySlot = {
      'class-feat': 'feat',
      talent: 'talent',
      'force-power': 'forcePower',
      'force-secret': 'forceSecret',
      'force-technique': 'forceTechnique',
      'medical-secret': 'talent',
      'starship-maneuver': 'starshipManeuver',
    };
    const expectedType = typeBySlot[slot.slotKind];
    if (!expectedType) return null;
    const classId = slot.classSummary?.classId;
    const className = normalizeText(slot.classSummary?.className).toLowerCase();
    const classLevel = Number(slot.classLevel || 0) || 0;
    return items.find(item => {
      if (item?.type !== expectedType) return false;
      const acquisition = item?.system?.acquisition || item?.flags?.swse?.acquisition || item?.flags?.swse?.progression || {};
      const itemClassId = normalizeClassKey(acquisition.classId || acquisition.sourceClassId || item?.system?.classId || item?.system?.sourceClassId);
      const itemClassName = normalizeText(acquisition.className || acquisition.sourceClass || item?.system?.className || item?.system?.sourceClass).toLowerCase();
      const itemClassLevel = normalizeLevel(acquisition.classLevel || acquisition.sourceClassLevel || acquisition.grantedClassLevel || item?.system?.classLevel || item?.system?.grantedClassLevel);
      if (classLevel && itemClassLevel && itemClassLevel !== classLevel) return false;
      if (classId && itemClassId && itemClassId !== classId) return false;
      if (className && itemClassName && itemClassName !== className) return false;
      return itemClassLevel === classLevel && (!!itemClassId || !!itemClassName);
    }) || null;
  }

  /**
   * Reconcile progression state after an upstream node changes.
   *
   * @param {string} changedNodeId - The node that just changed
   * @param {Actor} actor - The actor
   * @param {Object} progressionSession - Phase 1 canonical session
   * @param {Object} context
   * @param {ActiveStepComputer} context.activeStepComputer - Step computer
   * @param {string} context.currentStepId - Current step before reconciliation
   * @param {'chargen' | 'levelup'} context.mode - Progression mode
   * @param {string} context.subtype - Character subtype
   * @returns {Promise<Object>} Reconciliation report
   */
  async reconcileAfterCommit(
    changedNodeId,
    actor,
    progressionSession,
    context
  ) {
    const startTime = performance.now();
    const report = {
      changedNodeId,
      removed: [],
      dirty: [],
      purged: [],
      newActiveSteps: [],
      nextStepId: context.currentStepId,
      warnings: [],
      actionsTaken: [],
    };

    try {
      // Step 1: Identify downstream nodes affected by this change
      const affectedNodes = this._getAffectedNodes(changedNodeId);

      if (affectedNodes.length === 0) {
        swseLogger.debug('[ProgressionReconciler] No downstream nodes affected');
        return report;
      }

      swseLogger.log('[ProgressionReconciler] Reconciling after change to:', {
        changedNodeId,
        affectedCount: affectedNodes.length,
        affected: affectedNodes.map(n => n.nodeId),
      });

      // Step 2: Process each affected node
      for (const affected of affectedNodes) {
        const behavior = affected.behavior;

        switch (behavior) {
          case InvalidationBehavior.PURGE:
            await this._purgeNode(affected.nodeId, progressionSession);
            report.purged.push(affected.nodeId);
            report.actionsTaken.push(`Purged ${affected.nodeId}`);
            break;

          case InvalidationBehavior.DIRTY:
            this._markNodeDirty(affected.nodeId, progressionSession);
            report.dirty.push(affected.nodeId);
            report.actionsTaken.push(`Marked ${affected.nodeId} as dirty`);
            break;

          case InvalidationBehavior.RECOMPUTE:
            // Will be handled by recomputing active steps
            report.actionsTaken.push(`Marked ${affected.nodeId} for recompute`);
            break;

          case InvalidationBehavior.WARN:
            report.warnings.push(`Warning: ${affected.nodeId} may have stale selections`);
            report.actionsTaken.push(`Added warning for ${affected.nodeId}`);
            break;
        }
      }

      // Step 3: Recompute active step list
      const newActiveSteps = await context.activeStepComputer.computeActiveSteps(
        actor,
        context.mode,
        progressionSession,
        { subtype: context.subtype }
      );

      report.newActiveSteps = newActiveSteps;

      // Step 4: Check if current step was removed
      if (!newActiveSteps.includes(context.currentStepId)) {
        report.removed.push(context.currentStepId);

        // Find nearest safe step
        const currentIndex = newActiveSteps.length > 0
          ? Math.max(0, newActiveSteps.length - 1)
          : 0;

        report.nextStepId = newActiveSteps[currentIndex] || null;

        if (report.nextStepId !== context.currentStepId) {
          report.actionsTaken.push(
            `Moved from ${context.currentStepId} to ${report.nextStepId}`
          );
        }
      }

      // Step 5: Rechecklegality of affected selections (via AbilityEngine)
      await this._recheckAffectedSelections(
        affectedNodes.map(n => n.nodeId),
        actor,
        progressionSession,
        report
      );

      // Record timing
      report.reconciliationTime = Math.round(performance.now() - startTime);

      swseLogger.log('[ProgressionReconciler] Reconciliation complete:', report);

      return report;
    } catch (err) {
      swseLogger.error('[ProgressionReconciler] Critical error during reconciliation:', err);
      report.warnings.push(`Reconciliation error: ${err.message}`);
      return report;
    }
  }

  /**
   * Get all nodes affected by a change, with their invalidation behaviors.
   *
   * @param {string} changedNodeId
   * @returns {Array<{nodeId: string, behavior: string}>}
   * @private
   */
  _getAffectedNodes(changedNodeId) {
    const node = PROGRESSION_NODE_REGISTRY[changedNodeId];
    if (!node || !node.invalidates) return [];

    return node.invalidates.map(downstreamId => ({
      nodeId: downstreamId,
      behavior: node.invalidationBehavior?.[downstreamId] || InvalidationBehavior.DIRTY,
    }));
  }

  /**
   * Remove selections from a node (purge behavior).
   * Deletes the normalized selection from progressionSession.
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   * @private
   */
  async _purgeNode(nodeId, progressionSession) {
    const node = PROGRESSION_NODE_REGISTRY[nodeId];
    if (!node || !node.selectionKey) return;

    if (progressionSession?.draftSelections) {
      delete progressionSession.draftSelections[node.selectionKey];
      swseLogger.debug(`[ProgressionReconciler] Purged node: ${nodeId}`);
    }
  }

  /**
   * Mark a node as dirty (requiring re-validation).
   * In Phase 2, we just record this in session state.
   * UI will be enhanced in Phase 3 to show dirty nodes prominently.
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   * @private
   */
  _markNodeDirty(nodeId, progressionSession) {
    if (!progressionSession.dirtyNodes) {
      progressionSession.dirtyNodes = new Set();
    }
    progressionSession.dirtyNodes.add(nodeId);
    swseLogger.debug(`[ProgressionReconciler] Marked dirty: ${nodeId}`);
  }

  /**
   * Rechecklegality of selections in affected nodes.
   * Uses AbilityEngine to validate that selected items are still legal.
   * PHASE 3: Recheck via AbilityEngine; warn or purge if now illegal.
   *
   * @param {Array<string>} affectedNodeIds
   * @param {Actor} actor
   * @param {Object} progressionSession
   * @param {Object} report - Reconciliation report to update with warnings
   * @private
   */
  async _recheckAffectedSelections(
    affectedNodeIds,
    actor,
    progressionSession,
    report
  ) {
    const draftSelections = progressionSession?.draftSelections;
    if (!draftSelections) return;

    for (const nodeId of affectedNodeIds) {
      const node = PROGRESSION_NODE_REGISTRY[nodeId];
      if (!node || !node.selectionKey) continue;

      const selection = draftSelections[node.selectionKey];
      if (!selection) continue;

      // PHASE 3: Evaluate legality of the selection via AbilityEngine
      try {
        // Handle array selections (feats, talents, etc.)
        const isArray = Array.isArray(selection);
        const itemsToCheck = isArray ? selection : [selection];

        for (const item of itemsToCheck) {
          if (!item) continue;

          // Use AbilityEngine to check if item is still legal
          const assessment = AbilityEngine.evaluateAcquisition(actor, item, {});

          if (!assessment.legal) {
            report.warnings.push(
              `Selection in ${node.selectionKey} may no longer be legal after this change: ` +
              `${item.name || item.id} (missing: ${assessment.missingPrereqs.join(', ')})`
            );

            swseLogger.warn(
              `[ProgressionReconciler] Selection legality changed for ${node.selectionKey}:`,
              {
                item: item.name || item.id,
                missingPrereqs: assessment.missingPrereqs
              }
            );
          }
        }
      } catch (err) {
        swseLogger.debug(
          `[ProgressionReconciler] Error rechecking ${node.selectionKey} legality:`,
          err
        );
      }
    }
  }

  /**
   * Helper: Check if a dirty node has been "cleared" (player revisited and confirmed).
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   * @returns {boolean}
   */
  isNodeClearOfDirtyFlag(nodeId, progressionSession) {
    return !progressionSession?.dirtyNodes?.has(nodeId);
  }

  /**
   * Helper: Clear the dirty flag for a node.
   * Called when player visits and re-validates a dirty node.
   *
   * @param {string} nodeId
   * @param {Object} progressionSession
   */
  clearDirtyFlag(nodeId, progressionSession) {
    if (progressionSession?.dirtyNodes) {
      progressionSession.dirtyNodes.delete(nodeId);
    }
  }
}
