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
import { canonicallyOrderSelections } from '../utils/selection-ordering.js';

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
      featSelections: [],  // Full selection objects for ordering
      talents: [],
      talentSelections: [],  // Full selection objects for ordering
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
    // PHASE 1: Check if droid build is deferred (from canonical session ONLY)
    let pendingDroidBuild = false;

    // Try to access shell from context (if provided) or from global state
    const shell = context?.shell || globalThis.game?.swse?.currentProgressionShell;

    // PHASE 1: Read droid state from canonical session ONLY
    if (shell?.progressionSession?.draftSelections?.droid) {
      const droidBuild = shell.progressionSession.draftSelections.droid;
      pendingDroidBuild = !!(droidBuild?.buildState?.isDeferred);
    }

    // Order feats and talents canonically (General → Class → Bonus → Subtype)
    const orderedFeats = canonicallyOrderSelections(this._summary.featSelections);
    const orderedTalents = canonicallyOrderSelections(this._summary.talentSelections);

    // PHASE 9 UX: Issue summary for control center functionality
    const validation = this.validate();
    const issuesSummary = {
      hasErrors: validation.errors.length > 0,
      errorCount: validation.errors.length,
      errors: validation.errors,
      hasCaution: validation.warnings.caution.length > 0,
      cautionCount: validation.warnings.caution.length,
      cautions: validation.warnings.caution,
      isReadyToFinalize: validation.isValid && this._isReviewComplete && !!this._characterName,
      finalizationStatus: validation.isValid && this._isReviewComplete && !!this._characterName
        ? 'Ready to create character'
        : validation.errors.length > 0
        ? `${validation.errors.length} error${validation.errors.length === 1 ? '' : 's'} to fix`
        : `Incomplete (${Object.keys(this._summary.attributes).length ? '' : 'attributes, '}${this._summary.feats.length ? '' : 'feats, '}${this._characterName ? '' : 'name'})`
    };

    return {
      summary: this._summary,
      characterName: this._characterName,  // Final name for actor creation
      startingLevel: this._startingLevel,   // Starting level (1-20)
      isReviewComplete: this._isReviewComplete,
      // PHASE 1: Show warning if droid build is pending
      pendingDroidBuild: pendingDroidBuild,
      // Selection ordering: Canonical order for feat and talent display
      orderedFeats,
      orderedTalents,
      // PHASE 9 UX: Issue summary and finalization status
      issuesSummary,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const errors = [];
    const warnings = {
      blocking: [],    // Cannot proceed without fixing
      caution: [],     // Should fix but can proceed
      info: [],        // Informational only
    };

    // PHASE 4: Character name is NOW required on THIS step (moved from NameStep)
    // This enforces "datapad profile registration" before creation
    if (!this._characterName || this._characterName.trim() === '') {
      errors.push('Character name is required (enter or generate a name above)');
    }

    // PHASE 4: Validate starting level
    if (this._startingLevel < 1 || this._startingLevel > 20) {
      errors.push('Starting level must be between 1 and 20');
    }

    // PHASE 4: Validate that all prior steps are complete
    if (!this._summary.class) {
      errors.push('Character class must be selected');
    }

    if (Object.keys(this._summary.attributes).length === 0) {
      errors.push('Character attributes must be assigned');
    }

    // PHASE 4: Feats and talents should be complete based on level
    const requiredFeats = this._calculateRequiredFeats();
    if (this._summary.feats.length < requiredFeats) {
      warnings.caution.push({
        level: 'caution',
        message: `Character should have ${requiredFeats} feat(s), currently has ${this._summary.feats.length}`,
        actionable: 'Add feats in the Feats step if desired',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      blockingCount: warnings.blocking.length,
      cautionCount: warnings.caution.length,
      infoCount: warnings.info.length,
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

    // PHASE 1: REQUIRE canonical session; NO fallback to committedSelections
    if (!shell.progressionSession) {
      throw new Error('SummaryStep requires progressionSession');
    }

    // Try to use projection first (derived character model)
    // If projection unavailable, rebuild from canonical session ONLY
    const projection = shell.progressionSession.currentProjection ||
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

    // PHASE 1: Rebuild from canonical session ONLY if projection unavailable
    // NO fallback to committedSelections
    const session = shell.progressionSession;
    const selections = session.draftSelections || {};

    // PHASE 1: Read from canonical session ONLY. No committedSelections fallback.

    // Name/Level — entered directly on this SummaryStep as "datapad profile registration"
    this._summary.name = this._characterName || character.identity?.name || '';
    this._summary.level = this._startingLevel || shell.targetLevel || 1;

    // Species: from canonical session normalized format
    const speciesNorm = selections.species;
    this._summary.species = speciesNorm?.name || speciesNorm?.id || '';

    // Class: from canonical session normalized format
    const classNorm = selections.class;
    this._summary.class = classNorm?.name || classNorm?.id || '';

    // Attributes: from canonical session normalized format {values: {...}}
    const attrNorm = selections.attributes;
    this._summary.attributes = (attrNorm?.values) ? { ...attrNorm.values } : {};

    // Skills: from canonical session normalized format {trained: [ids]}
    const skillsNorm = selections.skills;
    this._summary.skills = (skillsNorm?.trained && Array.isArray(skillsNorm.trained))
      ? skillsNorm.trained
      : [];

    // Languages: from canonical session normalized format [{id, source}, ...]
    const languagesNorm = selections.languages;
    this._summary.languages = Array.isArray(languagesNorm)
      ? languagesNorm.map(lang => lang.id || lang)
      : [];

    // Feats: from canonical session normalized format [{id, source}, ...]
    const featsNorm = selections.feats;
    this._summary.featSelections = Array.isArray(featsNorm) ? [...featsNorm] : [];
    this._summary.feats = Array.isArray(featsNorm)
      ? featsNorm.map(feat => feat.id || feat)
      : [];

    // Talents: from canonical session normalized format [{id, treeId, source}, ...]
    const talentsNorm = selections.talents;
    this._summary.talentSelections = Array.isArray(talentsNorm) ? [...talentsNorm] : [];
    this._summary.talents = Array.isArray(talentsNorm)
      ? talentsNorm.map(talent => talent.id || talent)
      : [];

    swseLogger.log('[SummaryStep] Aggregated summary from canonical session.draftSelections:', this._summary);
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
