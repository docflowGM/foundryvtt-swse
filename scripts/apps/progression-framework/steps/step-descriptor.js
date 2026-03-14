/**
 * StepDescriptor — typed descriptor for every step in the progression shell.
 *
 * The shell assembles a StepDescriptor[] at initialization and re-assembles
 * whenever progression state changes. Steps are never hardcoded inside the
 * shell itself — canonical steps come from mode definitions, conditional steps
 * come from ConditionalStepResolver (which queries the engine).
 */

/**
 * Enum: step category
 * @readonly
 * @enum {string}
 */
export const StepCategory = Object.freeze({
  /** Always-on chargen or levelup step */
  CANONICAL: 'canonical',
  /** language / general-feat / class-feat / general-talent / class-talent */
  CATEGORY_SPECIFIC: 'category',
  /** Engine-unlocked at runtime (Skills in LU, Force Powers, etc.) */
  CONDITIONAL: 'conditional',
  /** confirm / store / post-store */
  CONFIRMATION: 'confirmation',
});

/**
 * Enum: step type
 * @readonly
 * @enum {string}
 */
export const StepType = Object.freeze({
  /** name, race, droid-type */
  IDENTITY: 'identity',
  /** class, attribute, l1-survey */
  BUILD: 'build',
  /** feats, talents, powers, skills */
  SELECTION: 'selection',
  /** background, languages */
  NARRATIVE: 'narrative',
  /** confirm, store */
  CONFIRM: 'confirm',
});

/**
 * StepDescriptor
 *
 * Describes a single step visible to the progression shell.
 * Instances are plain objects satisfying this shape — no class instantiation needed.
 *
 * @typedef {Object} StepDescriptor
 * @property {string} stepId                    - Unique step key (e.g. 'general-feat', 'class-feat')
 * @property {string} label                     - Progress rail label
 * @property {string} icon                      - FontAwesome class (e.g. 'fa-star')
 * @property {StepCategory} category            - Canonical / category-specific / conditional / confirmation
 * @property {StepType} type                    - Identity / build / selection / narrative / confirm
 * @property {boolean} isSkippable              - Can player skip without breaking progression
 * @property {boolean} isConditional            - True if engine must unlock this step
 * @property {string|null} unlockReason         - Human-readable reason why step is conditional
 * @property {boolean} isHidden                 - True if no choices available — shell omits from progress rail
 * @property {typeof import('./step-plugin-base.js').ProgressionStepPlugin} pluginClass - Step plugin to instantiate
 * @property {string|null} engineKey            - Engine-side step identifier (used by ConditionalStepResolver)
 */

/**
 * Create a StepDescriptor with all required fields and safe defaults.
 *
 * @param {Partial<StepDescriptor>} config
 * @returns {StepDescriptor}
 */
export function createStepDescriptor(config) {
  if (!config.stepId) throw new Error('StepDescriptor requires stepId');
  if (!config.label) throw new Error('StepDescriptor requires label');
  if (!config.pluginClass) throw new Error('StepDescriptor requires pluginClass');

  return {
    stepId: config.stepId,
    label: config.label,
    icon: config.icon ?? 'fa-circle',
    category: config.category ?? StepCategory.CANONICAL,
    type: config.type ?? StepType.SELECTION,
    isSkippable: config.isSkippable ?? false,
    isConditional: config.isConditional ?? false,
    unlockReason: config.unlockReason ?? null,
    isHidden: config.isHidden ?? false,
    pluginClass: config.pluginClass,
    engineKey: config.engineKey ?? null,
  };
}
