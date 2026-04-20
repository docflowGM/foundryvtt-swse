/**
 * Node-to-Descriptor Mapper — Phase 2
 *
 * Converts node registry metadata + plugin classes into StepDescriptors.
 * This bridges the declarative node registry with the shell's StepDescriptor contract.
 *
 * Used by chargen-shell and levelup-shell to convert active node IDs into
 * renderable StepDescriptors with wired plugin classes.
 */

import { createStepDescriptor, StepCategory, StepType } from '../steps/step-descriptor.js';
import { PROGRESSION_NODE_REGISTRY } from './progression-node-registry.js';

// Import all step plugins (matching chargen-shell imports)
import { IntroStep } from '../steps/intro-step.js';
import { SpeciesStep } from '../steps/species-step.js';
import { DroidBuilderStep } from '../steps/droid-builder-step.js';
import { ClassStep } from '../steps/class-step.js';
import { L1SurveyStep } from '../steps/l1-survey-step.js';
import { AttributeStep } from '../steps/attribute-step.js';
import { BackgroundStep } from '../steps/background-step.js';
import { SkillsStep } from '../steps/skills-step.js';
import { GeneralFeatStep, ClassFeatStep } from '../steps/feat-step.js';
import { GeneralTalentStep, ClassTalentStep } from '../steps/talent-step.js';
import { LanguageStep } from '../steps/language-step.js';
import { SummaryStep } from '../steps/summary-step.js';
import { ForcePowerStep } from '../steps/force-power-step.js';
import { ForceSecretStep } from '../steps/force-secret-step.js';
import { ForceTechniqueStep } from '../steps/force-technique-step.js';
import { StarshipManeuverStep } from '../steps/starship-maneuver-step.js';
import { FinalDroidConfigurationStep } from '../steps/final-droid-configuration-step.js';

/**
 * Map of nodeId → step plugin class.
 * This is the single source of truth for what plugin handles each node.
 */
const NODE_PLUGIN_MAP = Object.freeze({
  intro: IntroStep,
  species: SpeciesStep,
  'droid-builder': DroidBuilderStep,
  class: ClassStep,
  'l1-survey': L1SurveyStep,
  attribute: AttributeStep,
  background: BackgroundStep,
  skills: SkillsStep,
  'general-feat': GeneralFeatStep,
  'class-feat': ClassFeatStep,
  'general-talent': GeneralTalentStep,
  'class-talent': ClassTalentStep,
  languages: LanguageStep,
  'force-powers': ForcePowerStep,
  'force-secrets': ForceSecretStep,
  'force-techniques': ForceTechniqueStep,
  'starship-maneuvers': StarshipManeuverStep,
  'final-droid-configuration': FinalDroidConfigurationStep,
  summary: SummaryStep,
});

/**
 * Null plugin stub for unimplemented steps.
 */
class NullStepPlugin {
  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  get descriptor() { return this._descriptor; }
  async onStepEnter() {}
  async onStepExit() {}
  async onDataReady() {}
  async getStepData() { return {}; }
  getSelection() { return { selected: [], count: 0, isComplete: false }; }
  async onItemFocused() {}
  async onItemHovered() {}
  async onItemCommitted() {}
  async onItemDeselected() {}
  validate() { return { isValid: true, errors: [], warnings: [] }; }
  getBlockingIssues() { return []; }
  getWarnings() { return []; }
  getRemainingPicks() { return []; }
  renderWorkSurface() { return null; }
  renderDetailsPanel() { return this.renderDetailsPanelEmptyState(); }
  renderDetailsPanelEmptyState() {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data: { message: 'Select an item to see details.', icon: this._descriptor.icon },
    };
  }
  getUtilityBarConfig() { return { mode: 'minimal' }; }
  getUtilityBarMode() { return 'minimal'; }
  getFooterConfig() { return null; }
  getMentorContext() { return ''; }
  async onAskMentor() {}
  getMentorMode() { return 'context-only'; }
}

/**
 * Convert a list of active node IDs into StepDescriptors with plugins wired.
 *
 * @param {Array<string>} activeNodeIds - From ActiveStepComputer.computeActiveSteps()
 * @param {Object} options
 * @param {boolean} options.includeHidden - Include nodes marked isHidden?
 * @returns {Array<StepDescriptor>}
 */
export function mapNodesToDescriptors(activeNodeIds, options = {}) {
  const { includeHidden = false } = options;

  return activeNodeIds
    .map(nodeId => mapNodeToDescriptor(nodeId))
    .filter(descriptor => descriptor !== null && (includeHidden || !descriptor.isHidden));
}

/**
 * Convert a single node ID into a StepDescriptor.
 *
 * @param {string} nodeId
 * @returns {StepDescriptor|null}
 */
export function mapNodeToDescriptor(nodeId) {
  const node = PROGRESSION_NODE_REGISTRY[nodeId];
  if (!node) {
    console.warn(`[NodeDescriptorMapper] Unknown node: ${nodeId}`);
    return null;
  }

  const pluginClass = NODE_PLUGIN_MAP[nodeId] ?? NullStepPlugin;

  return createStepDescriptor({
    stepId: nodeId,
    label: node.label,
    icon: node.icon,
    category: node.category === 'conditional' ? StepCategory.CONDITIONAL : StepCategory.CANONICAL,
    type: node.category === 'conditional' ? StepType.SELECTION : StepType.BUILD,
    isSkippable: node.isSkippable ?? false,
    isConditional: node.category === 'conditional',
    isHidden: false,
    pluginClass,
    engineKey: nodeId,
  });
}

/**
 * Get the plugin class for a node ID.
 *
 * @param {string} nodeId
 * @returns {typeof ProgressionStepPlugin|null}
 */
export function getPluginForNode(nodeId) {
  const pluginClass = NODE_PLUGIN_MAP[nodeId];
  return pluginClass ?? NullStepPlugin;
}

/**
 * Register a step plugin for a node ID.
 * Called during phase completion to wire up new plugins.
 *
 * @param {string} nodeId
 * @param {typeof ProgressionStepPlugin} pluginClass
 */
export function registerNodePlugin(nodeId, pluginClass) {
  if (!NODE_PLUGIN_MAP[nodeId]) {
    console.warn(
      `[NodeDescriptorMapper] Registering plugin for unknown node: ${nodeId}. ` +
      `Add to NODE_PLUGIN_MAP if this is a new node.`
    );
  }
  NODE_PLUGIN_MAP[nodeId] = pluginClass;
}
