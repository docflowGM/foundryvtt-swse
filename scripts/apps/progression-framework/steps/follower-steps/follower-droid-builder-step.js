/**
 * FollowerDroidBuilderStep
 *
 * Droid followers use the same DroidBuilderStep machinery as droid chargen, but
 * with follower-specific constraints and a follower starting-credit budget.
 * The builder remains the authority for droid-system install/remove accounting;
 * this adapter only seeds follower context and mirrors the result back to the
 * follower persistent-choice contract consumed by FollowerCreator.
 */

import { DroidBuilderStep } from '../droid-builder-step.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { isFollowerDroidDraft, resolveFollowerDroidAbilityChoice } from './follower-droid-context.js';
import { classifyFollowerDroidChassisSelection, resolveFollowerDroidChassisPrecedence, FOLLOWER_DROID_CHASSIS_SESSION_STATE } from './follower-droid-chassis-compat.js';

const FOLLOWER_DROID_ALLOWED_CATEGORIES = Object.freeze([
  'appendage',
  'accessory',
  'communication',
  'compartment',
  'sensor',
  'translator'
]);

const FOLLOWER_DROID_ALLOWED_ACCESSORY_SUBCATEGORIES = Object.freeze([
  'communication',
  'compartment',
  'sensor',
  'translator'
]);

export class FollowerDroidBuilderStep extends DroidBuilderStep {
  constructor(descriptor) {
    super(descriptor);
    this._creditModel = null;
    this._chassisConflict = null;
  }

  async onStepEnter(shell) {
    const draft = shell?.progressionSession?.draftSelections || {};
    if (!this._isDroidFollowerDraft(draft)) {
      this._droidState = null;
      this._chassisConflict = null;
      return;
    }

    // ADDENDUM — full 6-point legacy session compatibility precedence (see
    // resolveFollowerDroidChassisPrecedence). A disagreeing conflict between
    // draftSelections.droid and the legacy droidConfig.droidBuild mirror
    // must block this step rather than silently picking a side.
    const precedence = resolveFollowerDroidChassisPrecedence(draft);
    if (precedence.state === FOLLOWER_DROID_CHASSIS_SESSION_STATE.CONFLICT) {
      this._chassisConflict = precedence;
      this._droidState = null;
      swseLogger.warn('[FollowerDroidBuilderStep] Conflicting droid chassis selections; manual review required.', precedence.reasons);
      return;
    }
    this._chassisConflict = null;

    // PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step:
    // an in-progress session created before this phase may still carry a
    // droidConfig written by the now-removed species-step droid branch —
    // a hardcoded {baseSystems, optionalSystems} shape disconnected from
    // the real droid-part catalog, never a genuine chassis selection. Log
    // it explicitly (surfaced, not silently discarded) so it's visible in
    // diagnostics; _seedFollowerDroidSession below already re-seeds a real
    // chassis build whenever no canonical droidSystems object is present,
    // which self-heals this case on this step's next entry.
    const legacyClassification = classifyFollowerDroidChassisSelection(draft.droidConfig);
    if (legacyClassification.state === FOLLOWER_DROID_CHASSIS_SESSION_STATE.LEGACY_NEEDS_RECONFIGURATION) {
      swseLogger.warn('[FollowerDroidBuilderStep] Legacy pre-consolidation chassis selection found; reconfiguring from the canonical catalog.', legacyClassification.reasons);
    }

    await this._ensureFollowerStartingCredits(shell);
    this._seedFollowerDroidSession(shell, precedence);
    await super.onStepEnter(shell);

    if (this._droidState) {
      this._applyFollowerConstraintsToState(shell);
      this._syncDraftDroidIdentity(shell);
    }
  }

  /**
   * ADDENDUM — surface a chassis-selection conflict (see
   * resolveFollowerDroidChassisPrecedence, point 4) as a specific blocking
   * issue rather than the generic "construction state is not available"
   * message the base class returns for a null `_droidState`.
   */
  getBlockingIssues() {
    if (this._chassisConflict) {
      return [
        'This follower has two disagreeing droid chassis selections and requires manual review before the chassis step can be completed.',
        ...this._chassisConflict.reasons
      ];
    }
    return super.getBlockingIssues();
  }

  validate() {
    if (this._chassisConflict) {
      return { isValid: false, errors: this.getBlockingIssues(), warnings: [] };
    }
    return super.validate();
  }

  _isDroidFollowerDraft(draft = {}) {
    return isFollowerDroidDraft(draft);
  }

  _getFollowerConstraint() {
    return {
      required: true,
      mode: 'custom',
      label: 'Droid Follower Chassis',
      notes: 'Follower droids use starting credits as a chassis budget. Spend only on appendages, communication systems, compartments, sensors, and translators; unspent credits are lost.',
      allowedCategories: Array.from(FOLLOWER_DROID_ALLOWED_CATEGORIES),
      allowedAccessorySubcategories: Array.from(FOLLOWER_DROID_ALLOWED_ACCESSORY_SUBCATEGORIES)
    };
  }

  _seedFollowerDroidSession(shell, precedence = null) {
    const session = shell?.progressionSession;
    if (!session) return;

    const draft = session.draftSelections || (session.draftSelections = {});
    const existingConfig = draft.droidConfig || {};
    // ADDENDUM — use the full 6-point precedence resolution (see
    // resolveFollowerDroidChassisPrecedence) rather than a plain
    // `draft.droid || existingConfig.droidBuild || {}` fallback, so a
    // real legacy droidConfig.droidBuild is only restored into draft.droid
    // when draft.droid itself is not already a real build (a stub/empty
    // draft.droid must not silently "win" over a real legacy build).
    const resolved = precedence || resolveFollowerDroidChassisPrecedence(draft);
    const existingDroid = resolved.resolvedBuild || {};
    const budget = Number(draft.startingCredits ?? existingConfig.droidCredits?.base ?? existingDroid.droidCredits?.base ?? 0);
    const degree = String(existingConfig.droidDegree || existingDroid.droidDegree || '2nd-degree').toLowerCase();
    const size = String(existingConfig.size || existingConfig.droidSize || existingDroid.droidSize || 'medium').toLowerCase();
    const constraint = this._getFollowerConstraint();

    session.droidContext = {
      ...(session.droidContext || {}),
      isDroid: true,
      contextMode: 'follower',
      builderMode: 'follower',
      creationMode: 'custom',
      pointBuyPool: 20,
      excludedAbilities: ['con'],
      conBase: 0,
      degree,
      size
    };

    draft.followerKind = 'droid';
    draft.speciesName = 'Droid';
    draft.speciesId = null;
    draft.pendingSpeciesContext = {
      ...(draft.pendingSpeciesContext || {}),
      identity: {
        ...(draft.pendingSpeciesContext?.identity || {}),
        name: 'Droid Follower Chassis'
      },
      metadata: {
        ...(draft.pendingSpeciesContext?.metadata || {}),
        droidBuilder: constraint
      },
      ledger: {
        ...(draft.pendingSpeciesContext?.ledger || {}),
        rules: {
          ...(draft.pendingSpeciesContext?.ledger?.rules || {}),
          droidBuilder: constraint
        }
      }
    };

    draft.droid = {
      ...existingDroid,
      isDroid: true,
      creationMode: 'custom',
      droidDegree: degree,
      droidSize: size,
      droidSystems: existingDroid.droidSystems || existingConfig.droidSystems || null,
      droidCredits: {
        ...(existingDroid.droidCredits || existingConfig.droidCredits || {}),
        base: budget,
        spent: Number(existingDroid.droidCredits?.spent ?? existingConfig.droidCredits?.spent ?? existingConfig.spentCredits ?? 0),
        remaining: budget - Number(existingDroid.droidCredits?.spent ?? existingConfig.droidCredits?.spent ?? existingConfig.spentCredits ?? 0),
        allowOverflow: false
      }
    };

    draft.droidConfig = {
      ...existingConfig,
      isDroid: true,
      droidDegree: degree,
      size,
      droidSize: size,
      // ADDENDUM — degree-derived ability is the sole rule for droid
      // followers (no repository documentation supports an independent
      // free ability choice for droids the way living followers get one
      // from their template — see TEMPLATE_ABILITY_OPTIONS in
      // follower-step-base.js, a genuinely different, template-driven
      // mechanic). A stray existingConfig.abilityChoice from a
      // pre-Phase-6 session (the removed species-step branch let the
      // user pick freely) is intentionally NOT trusted here, so it can't
      // silently override the correct degree-derived value.
      abilityChoice: resolveFollowerDroidAbilityChoice(degree),
      droidCredits: draft.droid.droidCredits,
      droidBuild: draft.droid,
      allowedOptionalCategories: Array.from(FOLLOWER_DROID_ALLOWED_ACCESSORY_SUBCATEGORIES),
      unspentCreditsLost: true
    };
  }

  _applyFollowerConstraintsToState(shell) {
    if (!this._droidState) return;
    const draft = shell?.progressionSession?.draftSelections || {};
    const budget = Number(draft.startingCredits ?? this._droidState.droidCredits?.base ?? 0);
    this._droidState.speciesDroidBuilder = this._getFollowerConstraint();
    this._droidState.sourceSpecies = 'Droid Follower';
    this._droidState.creationMode = 'custom';
    this._droidState.isStandardModel = false;
    if (!this._droidState.droidCredits) this._droidState.droidCredits = {};
    this._droidState.droidCredits.base = budget;
    this._droidState.droidCredits.allowOverflow = false;
    this._normalizeDroidCredits();
  }

  _syncDraftDroidIdentity(shell) {
    super._syncDraftDroidIdentity(shell);
    const draft = shell?.progressionSession?.draftSelections;
    if (!draft?.droid) return;

    const degree = String(draft.droid.droidDegree || '2nd-degree').toLowerCase();
    const droidSystems = draft.droid.droidSystems || {};
    const droidCredits = draft.droid.droidCredits || {};
    const purchasedAppendages = (droidSystems.appendages || []).filter(system => !system?.isDefault && !system?.isGranted && Number(system?.cost || 0) > 0);
    const optionalSystems = [
      ...purchasedAppendages,
      ...(droidSystems.accessories || []),
      ...(droidSystems.locomotionEnhancements || []),
      ...(droidSystems.appendageEnhancements || [])
    ];

    draft.followerKind = 'droid';
    draft.speciesName = 'Droid';
    draft.speciesId = null;
    draft.droidConfig = {
      ...(draft.droidConfig || {}),
      isDroid: true,
      droidDegree: degree,
      size: draft.droid.droidSize || 'medium',
      droidSize: draft.droid.droidSize || 'medium',
      speed: droidSystems.locomotion?.speed || 6,
      movement: { walk: droidSystems.locomotion?.speed || 6 },
      // See the matching note in _seedFollowerDroidSession — degree-derived
      // is the sole ability rule; a stale draft.droidConfig.abilityChoice
      // is never trusted over it.
      abilityChoice: resolveFollowerDroidAbilityChoice(degree),
      baseSystems: this._formatBaseSystems(droidSystems),
      optionalSystems,
      droidSystems: JSON.parse(JSON.stringify(droidSystems)),
      droidCredits: JSON.parse(JSON.stringify(droidCredits)),
      droidBuild: JSON.parse(JSON.stringify(draft.droid)),
      spentCredits: Number(droidCredits.spent || 0),
      lostCredits: Math.max(0, Number(droidCredits.base || 0) - Number(droidCredits.spent || 0)),
      allowedOptionalCategories: Array.from(FOLLOWER_DROID_ALLOWED_ACCESSORY_SUBCATEGORIES),
      unspentCreditsLost: true
    };
  }

  _formatBaseSystems(droidSystems = {}) {
    return [
      droidSystems.processor,
      droidSystems.locomotion,
      ...(droidSystems.appendages || []).filter(system => system?.isDefault || system?.isGranted || Number(system?.cost || 0) === 0)
    ].filter(Boolean);
  }

  async _ensureFollowerStartingCredits(shell) {
    const draft = shell?.progressionSession?.draftSelections || {};
    if (draft.startingCredits !== null && draft.startingCredits !== undefined) return;

    const owner = shell?.ownerActor || shell?.actor || null;
    this._creditModel = await this._getOwnerStartingCreditModel(owner);
    const value = await this._rollStartingCredits(this._creditModel);
    draft.startingCredits = value;
    draft.startingCreditsMode = 'rolled';
    draft.startingCreditsFormula = this._creditModel?.formula || null;

    swseLogger.log('[FollowerDroidBuilderStep] Rolled droid follower chassis budget', {
      owner: owner?.name,
      formula: this._creditModel?.formula,
      value
    });
  }

  async _getOwnerStartingCreditModel(ownerActor) {
    const baseNames = new Set(['jedi', 'noble', 'scoundrel', 'scout', 'soldier']);
    const cleanClassName = (value) => String(value || '').trim().replace(/\s+\d+$/, '');
    const classItems = Array.from(ownerActor?.items || []).filter(item => item.type === 'class');
    const baseClass = classItems.find(item => baseNames.has(cleanClassName(item.name).toLowerCase()) || baseNames.has(String(item.system?.classId || '').toLowerCase()))
      || classItems.find(item => item.system?.base_class === true || item.system?.baseClass === true)
      || classItems[0]
      || null;

    let registryClass = null;
    try {
      const { ClassesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js');
      await ClassesRegistry.initialize?.();
      registryClass = ClassesRegistry.getByName?.(cleanClassName(baseClass?.name)) || ClassesRegistry.resolveModel?.(cleanClassName(baseClass?.name)) || null;
    } catch (err) {
      swseLogger.warn('[FollowerDroidBuilderStep] Class registry unavailable for credits fallback:', err);
    }

    const formula = baseClass?.system?.starting_credits
      || baseClass?.system?.startingCredits
      || registryClass?.startingCredits
      || registryClass?.system?.starting_credits
      || registryClass?.system?.startingCredits
      || null;
    const parsed = this._parseCreditFormula(formula);
    return {
      className: cleanClassName(baseClass?.name) || registryClass?.name || 'Owner class',
      formula: parsed.formula,
      max: parsed.max,
      average: parsed.average,
      raw: formula
    };
  }

  _parseCreditFormula(raw) {
    const text = String(raw || '').trim();
    if (!text) return { formula: null, max: 0, average: 0 };
    const normalized = text.replace(/[×x]/gi, 'x').replace(/\s+/g, ' ');
    const match = normalized.match(/^(\d+)d(\d+)\s*x\s*(\d+)$/i);
    if (!match) {
      const value = Number(normalized.replace(/[^0-9.]/g, '')) || 0;
      return { formula: value ? String(value) : null, max: value, average: value };
    }
    const count = Number(match[1]);
    const die = Number(match[2]);
    const multiplier = Number(match[3]);
    return {
      formula: `${count}d${die} * ${multiplier}`,
      max: count * die * multiplier,
      average: Math.floor(count * ((die + 1) / 2) * multiplier)
    };
  }

  async _rollStartingCredits(model) {
    const formula = model?.formula;
    if (!formula) return 0;
    try {
      if (typeof Roll !== 'undefined') {
        const roll = await new Roll(formula).roll({ async: true });
        roll.toMessage?.({ flavor: 'Droid Follower Chassis Budget' });
        return Number(roll.total || 0);
      }
    } catch (err) {
      swseLogger.warn('[FollowerDroidBuilderStep] Foundry Roll failed; using fallback roller:', err);
    }
    return this._fallbackRollFormula(formula, model);
  }

  _fallbackRollFormula(formula, model = null) {
    const match = String(formula || '').match(/^(\d+)d(\d+)\s*\*\s*(\d+)$/i);
    if (!match) return Number(model?.average || 0);
    const count = Number(match[1]);
    const die = Number(match[2]);
    const multiplier = Number(match[3]);
    let total = 0;
    for (let i = 0; i < count; i += 1) total += Math.floor(Math.random() * die) + 1;
    return total * multiplier;
  }
}
