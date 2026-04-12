/**
 * ConditionalStepResolver
 *
 * THE ONLY place in the codebase that translates engine-discovered conditional
 * steps into StepDescriptor objects. The shell NEVER inspects engine internals
 * directly, and NEVER hardcodes conditional step logic.
 *
 * Current Status: INTERIM IMPLEMENTATION
 * - Maps known conditional step keys to known step plugin classes
 * - When the full engine API is mapped (Wave 10), this adapter is upgraded
 *   to use `engine.getActiveConditionalSteps()` without changing shell contracts
 *
 * Shell usage:
 *   const resolver = new ConditionalStepResolver();
 *   const descriptors = await resolver.resolveForContext(actor, mode);
 *   // Returns only the conditional steps that are currently active for this actor
 *
 * Contract:
 * - resolveForContext() always returns an array (may be empty)
 * - Each returned StepDescriptor has isConditional: true
 * - The resolver is the single source of truth for conditional step ordering
 */

import { createStepDescriptor, StepCategory, StepType } from '../steps/step-descriptor.js';
import { ForcePowerStep } from '../steps/force-power-step.js';
import { ForceAuthorityEngine } from '/systems/foundryvtt-swse/scripts/engine/progression/engine/force-authority-engine.js';

/**
 * Known conditional step keys used by the progression engine.
 * These are the engine-side identifiers that map to shell step plugins.
 *
 * @readonly
 * @enum {string}
 */
export const ConditionalStepKey = Object.freeze({
  SKILLS: 'skills',
  FORCE_POWERS: 'force-powers',
  FORCE_SECRETS: 'force-secrets',
  FORCE_TECHNIQUES: 'force-techniques',
  STARSHIP_MANEUVERS: 'starship-maneuvers',
  FINAL_DROID_CONFIGURATION: 'final-droid-configuration',  // PHASE C
});

/**
 * ConditionalStepResolver
 *
 * Resolves which conditional steps are active for a given actor+mode context.
 * This is the authoritative adapter between the progression engine's step model
 * and the shell's StepDescriptor contract.
 */
export class ConditionalStepResolver {
  /**
   * Resolve active conditional steps for an actor + progression mode.
   *
   * @param {Actor} actor - The actor being progressed
   * @param {'chargen' | 'levelup'} mode - Progression mode
   * @param {Object} context - Optional context (e.g., { shell: ProgressionShell })
   * @returns {Promise<import('../steps/step-descriptor.js').StepDescriptor[]>}
   */
  async resolveForContext(actor, mode, context = {}) {
    if (mode === 'chargen') {
      return this._resolveChargenConditionals(actor, context);
    }
    if (mode === 'levelup') {
      return this._resolveLevelupConditionals(actor, context);
    }
    return [];
  }

  /**
   * Resolve conditional steps for chargen.
   * PHASE C: Checks for deferred droid builds to insert final-droid-configuration step
   *
   * @param {Actor} actor
   * @param {Object} context - Optional context containing { shell: ProgressionShell }
   * @returns {Promise<import('../steps/step-descriptor.js').StepDescriptor[]>}
   */
  async _resolveChargenConditionals(actor, context = {}) {
    const activeSteps = [];

    // PHASE C: Check if droid build is deferred
    // Only add final-droid-configuration step if:
    // 1. Character is a droid (system.isDroid)
    // 2. Droid build was deferred (buildState.isDeferred === true)
    // 3. Build hasn't been finalized yet (buildState.isFinalized === false)

    try {
      const shell = context?.shell;
      const droidBuild = shell?.committedSelections?.get('droid-builder');

      // Check if droid build is deferred and pending finalization
      if (droidBuild?.buildState?.isDeferred && !droidBuild?.buildState?.isFinalized) {
        activeSteps.push(
          await this._buildDescriptorForKey(
            ConditionalStepKey.FINAL_DROID_CONFIGURATION,
            'Deferred droid build requires final configuration'
          )
        );
      }
    } catch (err) {
      console.warn('[ConditionalStepResolver] Error checking for deferred droid builds:', err);
    }

    return activeSteps;
  }

  /**
   * Resolve conditional steps for level-up.
   *
   * INTERIM IMPLEMENTATION:
   * Checks actor properties and feat lists directly to determine which
   * conditional steps are unlocked. This logic will be replaced by a proper
   * engine API call in Wave 10.
   *
   * Current conditional steps in level-up:
   * - skills: Unlocked by Skill Training feat OR INT modifier increase of ≥1
   * - force-powers: Unlocked by Force Sensitivity OR Force Training feat
   * - force-secrets: Engine-defined (handled by engine)
   * - force-techniques: Engine-defined
   * - starship-maneuvers: Engine-defined
   *
   * @param {Actor} actor
   * @returns {Promise<import('../steps/step-descriptor.js').StepDescriptor[]>}
   */
  async _resolveLevelupConditionals(actor) {
    const activeSteps = [];

    // TODO (Wave 10): Replace this entire block with:
    //   const engineSteps = await progressionEngine.getActiveConditionalSteps(actor, 'levelup');
    //   return Promise.all(engineSteps.map(key => this._buildDescriptorForKey(key, actor)));

    // Interim: check known conditional conditions
    const skillsUnlocked = await this._checkSkillsUnlocked(actor);
    if (skillsUnlocked.active) {
      activeSteps.push(await this._buildDescriptorForKey(ConditionalStepKey.SKILLS, skillsUnlocked.reason));
    }

    const forcePowersUnlocked = await this._checkForcePowersUnlocked(actor);
    if (forcePowersUnlocked.active) {
      activeSteps.push(await this._buildDescriptorForKey(ConditionalStepKey.FORCE_POWERS, forcePowersUnlocked.reason));
    }

    const forceSecretsUnlocked = await this._checkForceSecretsUnlocked(actor);
    if (forceSecretsUnlocked.active) {
      activeSteps.push(await this._buildDescriptorForKey(ConditionalStepKey.FORCE_SECRETS, forceSecretsUnlocked.reason));
    }

    const forceTechniquesUnlocked = await this._checkForceTechniquesUnlocked(actor);
    if (forceTechniquesUnlocked.active) {
      activeSteps.push(await this._buildDescriptorForKey(ConditionalStepKey.FORCE_TECHNIQUES, forceTechniquesUnlocked.reason));
    }

    const starshipUnlocked = await this._checkStarshipManeuversUnlocked(actor);
    if (starshipUnlocked.active) {
      activeSteps.push(await this._buildDescriptorForKey(ConditionalStepKey.STARSHIP_MANEUVERS, starshipUnlocked.reason));
    }

    return activeSteps;
  }

  /**
   * Build a StepDescriptor for a known conditional step key.
   * Plugin classes are registered lazily to avoid circular imports.
   * PHASE C: Dynamically loads FinalDroidConfigurationStep
   *
   * @param {string} key - ConditionalStepKey value
   * @param {string} unlockReason - Human-readable reason this step is available
   * @returns {import('../steps/step-descriptor.js').StepDescriptor}
   */
  async _buildDescriptorForKey(key, unlockReason) {
    const config = CONDITIONAL_STEP_CONFIG[key];
    if (!config) {
      throw new Error(`ConditionalStepResolver: unknown step key "${key}"`);
    }

    // PHASE C: Lazy-load FinalDroidConfigurationStep to avoid circular imports
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

  // ---------------------------------------------------------------------------
  // Interim conditional checks (Wave 10: replace with engine API)
  // ---------------------------------------------------------------------------

  async _checkSkillsUnlocked(actor) {
    // TODO (Wave 10): engine.isStepUnlocked(actor, 'skills', levelContext)
    try {
      const feats = actor?.items?.filter(i => i.type === 'feat') ?? [];
      const hasSkillTraining = feats.some(f =>
        f.name?.toLowerCase().includes('skill training')
      );
      if (hasSkillTraining) {
        return { active: true, reason: 'Skill Training feat' };
      }
    } catch {
      // Defensive: if actor data is malformed, don't unlock
    }
    return { active: false, reason: null };
  }

  async _checkForcePowersUnlocked(actor) {
    // Check if actor has Force capability AND is under-entitled (owned < entitled)
    try {
      const feats = actor?.items?.filter(i => i.type === 'feat') ?? [];
      const hasForceSensitivity = feats.some(f =>
        f.name?.toLowerCase().includes('force sensitivity')
      );
      const hasForceTraining = feats.some(f =>
        f.name?.toLowerCase().includes('force training')
      );

      // Only show step if actor has Force capability
      if (!hasForceSensitivity && !hasForceTraining) {
        return { active: false, reason: null };
      }

      // Check if actor is under-entitled (owned < entitled)
      const entitledCapacity = await ForceAuthorityEngine.getForceCapacity(actor);
      const ownedPowers = actor?.items?.filter(i => i.type === 'forcepower')?.length ?? 0;

      // Show Force Powers step if:
      // - Actor has capacity (entitled > 0), AND
      // - Actor owns fewer powers than entitled
      if (entitledCapacity > 0 && ownedPowers < entitledCapacity) {
        const reason = hasForceSensitivity ? 'Force Sensitivity' : 'Force Training feat';
        return { active: true, reason };
      }
    } catch {
      // Defensive - fall through to return false
    }
    return { active: false, reason: null };
  }

  async _checkForceSecretsUnlocked(actor) {
    // TODO (Wave 10): engine.isStepUnlocked(actor, 'force-secrets', levelContext)
    // Interim: conservative — only unlock if engine would otherwise surface this
    return { active: false, reason: null };
  }

  async _checkForceTechniquesUnlocked(actor) {
    // TODO (Wave 10): engine.isStepUnlocked(actor, 'force-techniques', levelContext)
    return { active: false, reason: null };
  }

  async _checkStarshipManeuversUnlocked(actor) {
    // TODO (Wave 10): engine.isStepUnlocked(actor, 'starship-maneuvers', levelContext)
    return { active: false, reason: null };
  }
}

/**
 * Static configuration for each known conditional step.
 * Plugin classes are resolved lazily via dynamic import to avoid circular imports.
 *
 * NOTE: pluginClass is intentionally null here — it will be wired in Wave 6
 * (skill-step) and Wave 9 (force power steps). Until then, the resolver
 * returns no active descriptors for those steps since the plugin classes
 * don't exist yet.
 */
const CONDITIONAL_STEP_CONFIG = {
  [ConditionalStepKey.SKILLS]: {
    label: 'Skills',
    icon: 'fa-graduation-cap',
    type: StepType.SELECTION,
    isSkippable: false,
    pluginClass: null, // Wired in Wave 6: SkillStep
  },
  [ConditionalStepKey.FORCE_POWERS]: {
    label: 'Force Powers',
    icon: 'fa-hand-sparkles',
    type: StepType.SELECTION,
    isSkippable: false,
    pluginClass: ForcePowerStep, // Wave 10: ForcePowerStep
  },
  [ConditionalStepKey.FORCE_SECRETS]: {
    label: 'Force Secrets',
    icon: 'fa-eye-slash',
    type: StepType.SELECTION,
    isSkippable: false,
    pluginClass: null, // Wired in Wave 9: ForceSecretStep
  },
  [ConditionalStepKey.FORCE_TECHNIQUES]: {
    label: 'Force Techniques',
    icon: 'fa-book-sparkles',
    type: StepType.SELECTION,
    isSkippable: false,
    pluginClass: null, // Wired in Wave 9: ForceTechniqueStep
  },
  [ConditionalStepKey.STARSHIP_MANEUVERS]: {
    label: 'Starship Maneuvers',
    icon: 'fa-rocket',
    type: StepType.SELECTION,
    isSkippable: false,
    pluginClass: null, // Wired in Wave 9: StarshipManeuverStep
  },
  [ConditionalStepKey.FINAL_DROID_CONFIGURATION]: {
    label: 'Final Droid Configuration',
    icon: 'fa-robot',
    type: StepType.BUILD,
    isSkippable: false,
    pluginClass: null, // PHASE C: FinalDroidConfigurationStep (lazy-loaded to avoid circular)
  },
};
