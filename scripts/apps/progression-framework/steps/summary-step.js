/**
 * SummaryStep plugin (formerly: read-only summary, now: summary with final name registration)
 *
 * Review of all character progression selections with final name input.
 * This step acts as "registering a datapad profile" — player reviews all choices
 * and registers the character's final name before creation.
 *
 * Summarizes decisions from: attributes, class, skills, feats, talents.
 * Allows character naming at this stage (moved from NameStep via Phase 2 Summary Refactor).
 * Final checkpoint before character creation completes.
 *
 * Data:
 * - Aggregated from prior steps via shell committedSelections
 * - Name and level are editable on THIS step (now the "datapad registration" phase)
 *
 * NOTE: NameStep was removed. Character naming happens here as the final UI step
 * before confirmation, creating a natural "datapad profile registration" flow.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { ProjectionEngine } from '../shell/projection-engine.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class SummaryStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // State (aggregated from shell committedSelections + editable name/level)
    this._summary = {
      name: '',
      level: 1,
      species: '',
      class: '',
      attributes: {},
      skills: [],
      feats: [],
      talents: [],
      languages: [],
      money: { total: 0, sources: [] },
      hpCalculation: { base: 0, modifiers: 0, total: 0 },
    };

    // Character naming (was in NameStep, now here for "datapad profile registration")
    this._characterName = '';
    this._startingLevel = 1;
    this._isReviewComplete = false;

    // Event listener cleanup
    this._renderAbort = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // PHASE 1: Read from canonical progressionSession first
    this._aggregateSummary(shell);

    // Load existing name/level if character already has them
    // Note: During draft, prefer progressionSession over actor for consistency
    const progressionSnapshot = shell.progressionSession?.actorSnapshot?.system || {};
    const liveCharacter = shell.actor?.system || {};
    const character = progressionSnapshot.identity?.name ? progressionSnapshot : liveCharacter;

    if (character.identity?.name) {
      this._characterName = character.identity.name;
    }
    if (shell.targetLevel) {
      this._startingLevel = shell.targetLevel;
    }

    // Enable Ask Mentor for final guidance
    shell.mentor.askMentorEnabled = true;

    swseLogger.log('[SummaryStep] Entered with aggregated summary:', this._summary);
    swseLogger.log('[SummaryStep] Character name:', this._characterName, 'Starting level:', this._startingLevel);
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Wire name input (now editable on this step as "datapad profile registration")
    const nameInput = shell.element.querySelector('.summary-step-name-input');
    if (nameInput) {
      nameInput.value = this._characterName;
      nameInput.addEventListener('input', (e) => {
        this._characterName = e.target.value;
        this._summary.name = e.target.value;
      }, { signal });
      nameInput.addEventListener('change', () => {
        shell.render();
      }, { signal });
    }

    // Wire level input (level slider, also editable here)
    const levelInput = shell.element.querySelector('.summary-step-level-input');
    if (levelInput) {
      levelInput.value = this._startingLevel;
      levelInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1 && val <= 20) {
          this._startingLevel = val;
          this._summary.level = val;
        }
      }, { signal });
      levelInput.addEventListener('change', () => {
        shell.render();
      }, { signal });
    }

    // Wire random name button (for living beings)
    const randomNameBtn = shell.element.querySelector('.summary-step-random-name-btn');
    if (randomNameBtn) {
      randomNameBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const randomName = await this._generateRandomName(shell.actor);
        if (randomName) {
          this._characterName = randomName;
          this._summary.name = randomName;
          shell.render();
        }
      }, { signal });
    }

    // Wire random droid name button (if character is droid)
    const randomDroidNameBtn = shell.element.querySelector('.summary-step-random-droid-name-btn');
    if (randomDroidNameBtn) {
      randomDroidNameBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const randomName = await this._generateRandomDroidName(shell.actor);
        if (randomName) {
          this._characterName = randomName;
          this._summary.name = randomName;
          shell.render();
        }
      }, { signal });
    }

    // Wire any "back to step" buttons if present (ability to return to prior steps)
    const backButtons = shell.element.querySelectorAll('.summary-step-edit-btn');
    backButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const stepId = btn.dataset.step;
        if (stepId) {
          swseLogger.log(`[SummaryStep] User wants to edit step: ${stepId}`);
          // This would be handled by shell navigation
        }
      }, { signal });
    });

    // Mark as reviewed
    this._isReviewComplete = true;
  }

  async onStepExit(shell) {
    // No cleanup needed; name state is preserved in this._characterName
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    // PHASE 1: Check if droid build is deferred (from progressionSession or committedSelections)
    let pendingDroidBuild = false;

    // Try to access shell from context (if provided) or from global state
    const shell = context?.shell || globalThis.game?.swse?.currentProgressionShell;

    // Check progressionSession first (normalized), then committedSelections (legacy)
    if (shell?.progressionSession?.draftSelections?.droid) {
      const droidBuild = shell.progressionSession.draftSelections.droid;
      pendingDroidBuild = !!(droidBuild?.buildState?.isDeferred);
    } else if (shell?.committedSelections) {
      const droidBuild = shell.committedSelections.get('droid-builder');
      pendingDroidBuild = !!(droidBuild?.buildState?.isDeferred);
    }

    return {
      summary: this._summary,
      characterName: this._characterName,  // Final name for actor creation
      startingLevel: this._startingLevel,   // Starting level (1-20)
      isReviewComplete: this._isReviewComplete,
      // PHASE 1: Show warning if droid build is pending
      pendingDroidBuild: pendingDroidBuild,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const errors = [];
    const warnings = [];

    // Character name is NOW required on THIS step (moved from NameStep)
    // This enforces "datapad profile registration" before creation
    if (!this._characterName || this._characterName.trim() === '') {
      errors.push('Character name is required (enter or generate a name above)');
    }

    // Validate starting level
    if (this._startingLevel < 1 || this._startingLevel > 20) {
      errors.push('Starting level must be between 1 and 20');
    }

    // Validate that all prior steps are complete
    if (!this._summary.class) {
      errors.push('Character class must be selected');
    }

    if (Object.keys(this._summary.attributes).length === 0) {
      errors.push('Character attributes must be assigned');
    }

    // Feats and talents should be complete based on level
    const requiredFeats = this._calculateRequiredFeats();
    if (this._summary.feats.length < requiredFeats) {
      warnings.push(`Character should have ${requiredFeats} feat(s), currently has ${this._summary.feats.length}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getSelection() {
    // Character name is now a selection on this step (formerly on NameStep)
    return {
      selected: this._characterName ? [this._characterName] : [],
      count: this._characterName ? 1 : 0,
      isComplete: this._isReviewComplete && !!this._characterName && this._startingLevel >= 1 && this._startingLevel <= 20,
    };
  }

  getBlockingIssues() {
    const validation = this.validate();
    return validation.errors;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/summary-work-surface.hbs',
      data: stepData,
    };
  }

  // ---------------------------------------------------------------------------
  // Aggregation & Helpers
  // ---------------------------------------------------------------------------

  _aggregateSummary(shell) {
    const character = shell.actor?.system || {};

    // PHASE 3: Try to use projection first (derived character model)
    // Fall back to manual aggregation for backward compatibility
    const projection = shell.progressionSession?.currentProjection ||
                       ProjectionEngine.buildProjection(shell.progressionSession, shell.actor);

    if (projection) {
      // Use projection as authoritative source of character state
      this._summary.name = this._characterName || character.identity?.name || '';
      this._summary.level = this._startingLevel || shell.targetLevel || 1;

      // Identity from projection
      this._summary.species = projection.identity?.species || '';
      this._summary.class = projection.identity?.class || '';

      // Attributes from projection (already normalized to {str, dex, ...})
      this._summary.attributes = projection.attributes || {};

      // Skills from projection (trained skills array)
      this._summary.skills = projection.skills?.trained || [];

      // Languages from projection (array of {id, name})
      this._summary.languages = (projection.languages || [])
        .map(lang => lang.id || lang.name || lang);

      // Feats from projection (array of {id, name, source})
      this._summary.feats = (projection.abilities?.feats || [])
        .map(feat => feat.id || feat.name || feat);

      // Talents from projection (array of {id, name, source})
      this._summary.talents = (projection.abilities?.talents || [])
        .map(talent => talent.id || talent.name || talent);

      swseLogger.log('[SummaryStep] Aggregated summary from projection:', this._summary);
      return;
    }

    // FALLBACK: Manual aggregation from progressionSession.draftSelections
    // Used if projection fails or is unavailable
    const session = shell.progressionSession;
    const selections = session?.draftSelections || {};
    const legacySteps = shell.committedSelections || new Map();

    // Name/Level — NO LONGER comes from a committed NameStep
    // Will be entered directly on this SummaryStep as "datapad profile registration"
    this._summary.name = this._characterName || character.identity?.name || '';
    this._summary.level = this._startingLevel || shell.targetLevel || 1;

    // Species: Try progressionSession first (normalized), then committedSelections
    const speciesNorm = selections.species;
    const speciesLegacy = legacySteps.get('species');
    this._summary.species = speciesNorm?.name || speciesNorm?.id ||
                            speciesLegacy?.speciesName ||
                            character.species || '';

    // Class: Try progressionSession first (normalized), then committedSelections
    const classNorm = selections.class;
    const classLegacy = legacySteps.get('class');
    this._summary.class = classNorm?.name || classNorm?.id ||
                          classLegacy?.className ||
                          character.classes?.[0]?.name || '';

    // Attributes: Try progressionSession first (normalized: {values: {...}}), then committedSelections
    const attrNorm = selections.attributes;
    const attrLegacy = legacySteps.get('attribute');
    if (attrNorm?.values) {
      // Normalized format: {values: {str, dex, con, int, wis, cha}, increases, metadata}
      this._summary.attributes = { ...attrNorm.values };
    } else if (attrLegacy?.abilities) {
      // Legacy format
      this._summary.attributes = { ...attrLegacy.abilities };
    } else {
      this._summary.attributes = {};
    }

    // Skills: Try progressionSession first (normalized: {trained: [ids], source, metadata}), then committedSelections
    const skillsNorm = selections.skills;
    const skillsLegacy = legacySteps.get('skills');
    if (skillsNorm?.trained && Array.isArray(skillsNorm.trained)) {
      // Normalized format: array of skill ids
      this._summary.skills = skillsNorm.trained;
    } else if (skillsLegacy?.trainedSkills) {
      // Legacy format
      this._summary.skills = Object.entries(skillsLegacy.trainedSkills)
        .filter(([_, data]) => data.trained)
        .map(([key, _]) => key);
    } else {
      this._summary.skills = [];
    }

    // Languages: Try progressionSession first (normalized: [{id, source}, ...]), then committedSelections
    const languagesNorm = selections.languages;
    const languagesLegacy = legacySteps.get('languages');
    if (Array.isArray(languagesNorm)) {
      // Normalized format: array of {id, source} objects or strings
      this._summary.languages = languagesNorm.map(lang => lang.id || lang);
    } else if (languagesLegacy?.selectedLanguages) {
      // Legacy format
      this._summary.languages = Array.isArray(languagesLegacy.selectedLanguages)
        ? languagesLegacy.selectedLanguages
        : [languagesLegacy.selectedLanguages];
    } else {
      this._summary.languages = [];
    }

    // Feats: Try progressionSession first (normalized: [{id, source}, ...]), then committedSelections
    const featsNorm = selections.feats;
    const generalFeatLegacy = legacySteps.get('general-feat');
    const classFeatLegacy = legacySteps.get('class-feat');
    const allFeats = [];

    if (Array.isArray(featsNorm)) {
      // Normalized format: array of {id, source} objects or strings
      allFeats.push(...featsNorm.map(feat => feat.id || feat));
    } else {
      // Legacy format: check separate general/class feat commits
      if (generalFeatLegacy?.selectedFeats) {
        const generalFeats = Array.isArray(generalFeatLegacy.selectedFeats)
          ? generalFeatLegacy.selectedFeats
          : [generalFeatLegacy.selectedFeats];
        allFeats.push(...generalFeats);
      }
      if (classFeatLegacy?.selectedFeats) {
        const classFeats = Array.isArray(classFeatLegacy.selectedFeats)
          ? classFeatLegacy.selectedFeats
          : [classFeatLegacy.selectedFeats];
        allFeats.push(...classFeats);
      }
    }
    this._summary.feats = allFeats;

    // Talents: Try progressionSession first (normalized: [{id, treeId, source}, ...]), then committedSelections
    const talentsNorm = selections.talents;
    const generalTalentLegacy = legacySteps.get('general-talent');
    const classTalentLegacy = legacySteps.get('class-talent');
    const allTalents = [];

    if (Array.isArray(talentsNorm)) {
      // Normalized format: array of {id, treeId, source} objects or strings
      allTalents.push(...talentsNorm.map(talent => talent.id || talent));
    } else {
      // Legacy format: check separate general/class talent commits
      if (generalTalentLegacy?.selectedTalents) {
        const generalTalents = Array.isArray(generalTalentLegacy.selectedTalents)
          ? generalTalentLegacy.selectedTalents
          : [generalTalentLegacy.selectedTalents];
        allTalents.push(...generalTalents);
      }
      if (classTalentLegacy?.selectedTalents) {
        const classTalents = Array.isArray(classTalentLegacy.selectedTalents)
          ? classTalentLegacy.selectedTalents
          : [classTalentLegacy.selectedTalents];
        allTalents.push(...classTalents);
      }
    }
    this._summary.talents = allTalents;

    swseLogger.log('[SummaryStep] Aggregated summary from progressionSession (fallback):', this._summary);
  }

  _calculateRequiredFeats() {
    // Heroic characters start with 1 general feat
    // This is a simplified calculation; actual rules may vary
    return 1;
  }

  // ---------------------------------------------------------------------------
  // Random Name Generation (migrated from NameStep)
  // ---------------------------------------------------------------------------

  /**
   * Generate a random name for a living being.
   * Uses existing name generator from chargen-shared.js
   *
   * @param {Actor} actor - The actor to generate a name for
   * @returns {Promise<string|null>} Random name or null if generation fails
   */
  async _generateRandomName(actor) {
    try {
      // Import and use existing random name generator from old chargen
      const { getRandomName } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      if (typeof getRandomName === 'function') {
        return await getRandomName(actor);
      }
    } catch (err) {
      swseLogger.warn('[SummaryStep] Failed to generate random name:', err);
    }
    return null;
  }

  /**
   * Generate a random droid name.
   * Uses existing droid name generator from chargen-shared.js
   *
   * @param {Actor} actor - The actor to generate a name for
   * @returns {Promise<string|null>} Random droid name or null if generation fails
   */
  async _generateRandomDroidName(actor) {
    try {
      // Import and use existing droid name generator from old chargen
      const { getRandomDroidName } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      if (typeof getRandomDroidName === 'function') {
        return await getRandomDroidName(actor);
      }
    } catch (err) {
      swseLogger.warn('[SummaryStep] Failed to generate random droid name:', err);
    }
    return null;
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'confirm')
      || 'Make your choice wisely.';
  }

  getMentorMode() {
    return 'context-only';
  }

}
