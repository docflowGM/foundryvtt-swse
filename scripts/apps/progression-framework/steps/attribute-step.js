
/**
 * Attribute step — point-buy initializer and step plugin.
 *
 * Keeps generic: no droid-specific logic here.
 * Droid rules (CON=0, 20-pt pool, 5-ability generation) live in DroidSubtypeAdapter.seedSession().
 * AttributeStep reads session.droidContext to expose the config to UI consumers.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';

const POINT_BUY_BASE = 8;

/** Default attribute generation config (actor / non-droid). */
export const ACTOR_ATTRIBUTE_GENERATION_CONFIG = Object.freeze({
  abilityCount: 6,
  abilityKeys: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
  abilitySystemKeys: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
  standardRollCount: 6,
  organicDiceCount: 21,
  organicGroupCount: 6,
  organicDropCount: 3,
  arrays: {
    standard: [15, 14, 13, 12, 10, 8],
    highPower: [16, 14, 12, 12, 10, 8],
  },
});

export function initializePointBuyAttributes() {
  return {
    str: POINT_BUY_BASE,
    dex: POINT_BUY_BASE,
    con: POINT_BUY_BASE,
    int: POINT_BUY_BASE,
    wis: POINT_BUY_BASE,
    cha: POINT_BUY_BASE
  };
}

/**
 * AttributeStep — progression step plugin for ability score assignment.
 *
 * Reads droidContext from session to expose appropriate config to the UI.
 * Does NOT contain droid-specific rules — those are in DroidSubtypeAdapter.
 */
export class AttributeStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._committed = false;
    this._attributes = null;
  }

  /**
   * Return the active attribute generation config.
   * If session has droidContext (set by DroidSubtypeAdapter.seedSession()), returns droid config.
   * Otherwise returns the standard actor config.
   *
   * @param {ProgressionShell} shell
   * @returns {Object} config
   */
  getGenerationConfig(shell) {
    return shell?.progressionSession?.droidContext?.attributeGenerationConfig
      ?? ACTOR_ATTRIBUTE_GENERATION_CONFIG;
  }

  /**
   * Return point-buy pool size from session context.
   * Droids: 20, actors: 25.
   *
   * @param {ProgressionShell} shell
   * @returns {number}
   */
  getPointBuyPool(shell) {
    return shell?.progressionSession?.droidContext?.pointBuyPool ?? 25;
  }

  async onStepEnter(shell) {
    // Restore previously committed attributes if re-entering the step
    const existing = shell?.progressionSession?.draftSelections?.attributes;
    if (existing) {
      this._attributes = existing;
      this._committed = true;
    }
  }

  getSelection() {
    return {
      selected: this._attributes ? Object.keys(this._attributes) : [],
      count: this._attributes ? 1 : 0,
      isComplete: this._committed,
    };
  }

  async onItemCommitted(attributes, shell) {
    this._attributes = attributes;
    this._committed = true;
    await this._commitNormalized(shell, 'attributes', attributes);
  }

  validate() {
    if (!this._committed) {
      return { isValid: false, errors: ['Attributes not yet assigned'], warnings: [] };
    }
    return { isValid: true, errors: [], warnings: [] };
  }

  getBlockingIssues() {
    if (!this._committed) return ['Assign all ability scores to continue'];
    return [];
  }

  async getStepData(context) {
    const shell = context?.shell;
    const generationConfig = this.getGenerationConfig(shell);
    const pointBuyPool = this.getPointBuyPool(shell);
    const droidCtx = shell?.progressionSession?.droidContext ?? null;

    return {
      isCommitted: this._committed,
      attributes: this._attributes,
      isDroid: !!droidCtx?.isDroid,
      pointBuyPool,
      pointBuyBase: POINT_BUY_BASE,
      excludedAbilities: droidCtx?.excludedAbilities ?? [],
      generationConfig,
    };
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/attribute-step.hbs',
      data: stepData,
    };
  }
}
