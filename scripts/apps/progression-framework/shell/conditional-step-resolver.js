/**
 * ConditionalStepResolver
 */

import { createStepDescriptor, StepCategory, StepType } from '../steps/step-descriptor.js';
import { SkillsStep } from '../steps/skills-step.js';
import { ForcePowerStep } from '../steps/force-power-step.js';
import { ForceSecretStep } from '../steps/force-secret-step.js';
import { ForceTechniqueStep } from '../steps/force-technique-step.js';
import { StarshipManeuverStep } from '../steps/starship-maneuver-step.js';
import { ForceAuthorityEngine } from '/systems/foundryvtt-swse/scripts/engine/progression/engine/force-authority-engine.js';
import { ManeuverAuthorityEngine } from '/systems/foundryvtt-swse/scripts/engine/progression/engine/maneuver-authority-engine.js';
import { resolveForceSecretEntitlements, resolveForceTechniqueEntitlements } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-suite-resolution.js';

export const ConditionalStepKey = Object.freeze({
  SKILLS: 'skills',
  FORCE_POWERS: 'force-powers',
  FORCE_SECRETS: 'force-secrets',
  FORCE_TECHNIQUES: 'force-techniques',
  STARSHIP_MANEUVERS: 'starship-maneuvers',
  FINAL_DROID_CONFIGURATION: 'final-droid-configuration',
});

export class ConditionalStepResolver {
  async resolveForContext(actor, mode, context = {}) {
    if (mode === 'chargen') return this._resolveChargenConditionals(actor, context);
    if (mode === 'levelup') return this._resolveLevelupConditionals(actor, context);
    return [];
  }

  async _resolveChargenConditionals(actor, context = {}) {
    const activeSteps = [];
    try {
      const shell = context?.shell;
      const droidBuild = shell?.committedSelections?.get('droid-builder');
      if (droidBuild?.buildState?.isDeferred && !droidBuild?.buildState?.isFinalized) {
        activeSteps.push(await this._buildDescriptorForKey(ConditionalStepKey.FINAL_DROID_CONFIGURATION, 'Deferred droid build requires final configuration'));
      }
    } catch (err) {
      console.warn('[ConditionalStepResolver] Error checking for deferred droid builds:', err);
    }
    return activeSteps;
  }

  async _resolveLevelupConditionals(actor, context = {}) {
    const activeSteps = [];

    const checks = [
      [ConditionalStepKey.SKILLS, this._checkSkillsUnlocked(actor, context)],
      [ConditionalStepKey.FORCE_POWERS, this._checkForcePowersUnlocked(actor, context)],
      [ConditionalStepKey.FORCE_SECRETS, this._checkForceSecretsUnlocked(actor, context)],
      [ConditionalStepKey.FORCE_TECHNIQUES, this._checkForceTechniquesUnlocked(actor, context)],
      [ConditionalStepKey.STARSHIP_MANEUVERS, this._checkStarshipManeuversUnlocked(actor, context)],
    ];

    for (const [key, promise] of checks) {
      const state = await promise;
      if (state?.active) activeSteps.push(await this._buildDescriptorForKey(key, state.reason));
    }

    return activeSteps;
  }

  async _buildDescriptorForKey(key, unlockReason) {
    const config = CONDITIONAL_STEP_CONFIG[key];
    if (!config) throw new Error(`ConditionalStepResolver: unknown step key "${key}"`);
    let pluginClass = config.pluginClass;
    if (key === ConditionalStepKey.FINAL_DROID_CONFIGURATION && !pluginClass) {
      try {
        const module = await import('../steps/final-droid-configuration-step.js');
        pluginClass = module.FinalDroidConfigurationStep;
      } catch (err) {
        console.error('[ConditionalStepResolver] Failed to load FinalDroidConfigurationStep:', err);
        pluginClass = null;
      }
    }

    return createStepDescriptor({
      stepId: key,
      label: config.label,
      icon: config.icon,
      category: StepCategory.CONDITIONAL,
      type: config.type,
      isSkippable: config.isSkippable ?? false,
      isConditional: true,
      unlockReason,
      isHidden: false,
      pluginClass,
      engineKey: key,
    });
  }

  async _checkSkillsUnlocked(actor) {
    try {
      const feats = actor?.items?.filter((i) => i.type === 'feat') ?? [];
      const hasSkillTraining = feats.some((f) => f.name?.toLowerCase().includes('skill training'));
      return hasSkillTraining ? { active: true, reason: 'Skill Training feat' } : { active: false, reason: null };
    } catch {
      return { active: false, reason: null };
    }
  }

  async _checkForcePowersUnlocked(actor, context = {}) {
    const summary = await ForceAuthorityEngine.getSelectionState(actor, { shell: context?.shell });
    return summary.powers.remaining > 0 ? { active: true, reason: summary.powers.reason || 'Outstanding force power selections' } : { active: false, reason: null };
  }

  async _checkForceSecretsUnlocked(actor, context = {}) {
    const shell = context?.shell;
    if (!shell) return { active: false, reason: null };
    const entitlements = resolveForceSecretEntitlements(shell, null, actor);
    return entitlements.remaining > 0 ? { active: true, reason: 'Class force secret grant available' } : { active: false, reason: null };
  }

  async _checkForceTechniquesUnlocked(actor, context = {}) {
    const shell = context?.shell;
    if (!shell) return { active: false, reason: null };
    const entitlements = resolveForceTechniqueEntitlements(shell, null, actor);
    return entitlements.remaining > 0 ? { active: true, reason: 'Class force technique grant available' } : { active: false, reason: null };
  }

  async _checkStarshipManeuversUnlocked(actor) {
    try {
      const access = await ManeuverAuthorityEngine.validateManeuverAccess(actor);
      if (!access.valid) return { active: false, reason: null };
      const capacity = await ManeuverAuthorityEngine.getManeuverCapacity(actor);
      const owned = actor?.items?.filter((i) => i.type === 'maneuver')?.length ?? actor?.system?.starshipManeuverSuite?.maneuvers?.length ?? 0;
      return capacity > owned ? { active: true, reason: 'Outstanding starship maneuver selections' } : { active: false, reason: null };
    } catch {
      return { active: false, reason: null };
    }
  }
}

const CONDITIONAL_STEP_CONFIG = {
  [ConditionalStepKey.SKILLS]: { label: 'Skills', icon: 'fa-graduation-cap', type: StepType.SELECTION, isSkippable: false, pluginClass: SkillsStep },
  [ConditionalStepKey.FORCE_POWERS]: { label: 'Force Powers', icon: 'fa-hand-sparkles', type: StepType.SELECTION, isSkippable: false, pluginClass: ForcePowerStep },
  [ConditionalStepKey.FORCE_SECRETS]: { label: 'Force Secrets', icon: 'fa-eye-slash', type: StepType.SELECTION, isSkippable: false, pluginClass: ForceSecretStep },
  [ConditionalStepKey.FORCE_TECHNIQUES]: { label: 'Force Techniques', icon: 'fa-book-sparkles', type: StepType.SELECTION, isSkippable: false, pluginClass: ForceTechniqueStep },
  [ConditionalStepKey.STARSHIP_MANEUVERS]: { label: 'Starship Maneuvers', icon: 'fa-rocket', type: StepType.SELECTION, isSkippable: false, pluginClass: StarshipManeuverStep },
  [ConditionalStepKey.FINAL_DROID_CONFIGURATION]: { label: 'Final Droid Configuration', icon: 'fa-robot', type: StepType.BUILD, isSkippable: false, pluginClass: null },
};
