/**
 * NameStep plugin
 *
 * Handles character name and starting level selection.
 * Reuses existing random name generation logic from old chargen.
 *
 * Data:
 * - characterName: string
 * - startingLevel: number (1-20, defaults to 1)
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class NameStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // State
    this._characterName = '';
    this._startingLevel = 1;

    // Event listener cleanup
    this._renderAbort = null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onStepEnter(shell) {
    // Load existing name/level if character already has them
    const character = shell.actor?.system || {};
    if (character.identity?.name) {
      this._characterName = character.identity.name;
    }
    if (shell.targetLevel) {
      this._startingLevel = shell.targetLevel;
    }

    // Enable Ask Mentor (optional for name step)
    shell.mentor.askMentorEnabled = false;
  }

  async onDataReady(shell) {
    if (!shell.element) return;

    // Clean up old listeners before attaching new ones
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Wire name input
    const nameInput = shell.element.querySelector('.name-step-input');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        this._characterName = e.target.value;
      }, { signal });
      nameInput.addEventListener('change', () => {
        shell.render();
      }, { signal });
    }

    // Wire level input
    const levelInput = shell.element.querySelector('.name-step-level-input');
    if (levelInput) {
      levelInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1 && val <= 20) {
          this._startingLevel = val;
        }
      }, { signal });
      levelInput.addEventListener('change', () => {
        shell.render();
      }, { signal });
    }

    // Wire random name button (if available)
    const randomNameBtn = shell.element.querySelector('.name-step-random-name-btn');
    if (randomNameBtn) {
      randomNameBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const randomName = await this._generateRandomName(shell.actor);
        if (randomName) {
          this._characterName = randomName;
          shell.render();
        }
      }, { signal });
    }

    // Wire random droid name button (if available)
    const randomDroidNameBtn = shell.element.querySelector('.name-step-random-droid-name-btn');
    if (randomDroidNameBtn) {
      randomDroidNameBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const randomName = await this._generateRandomDroidName(shell.actor);
        if (randomName) {
          this._characterName = randomName;
          shell.render();
        }
      }, { signal });
    }
  }

  async onStepExit(shell) {
    // No cleanup needed
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async getStepData(context) {
    return {
      characterName: this._characterName,
      startingLevel: this._startingLevel,
    };
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  validate() {
    const errors = [];
    const warnings = [];

    if (!this._characterName || this._characterName.trim() === '') {
      errors.push('Character name is required');
    }

    if (this._startingLevel < 1 || this._startingLevel > 20) {
      errors.push('Starting level must be between 1 and 20');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getSelection() {
    return {
      selected: this._characterName ? [this._characterName] : [],
      count: this._characterName ? 1 : 0,
      isComplete: !!this._characterName && this._startingLevel >= 1 && this._startingLevel <= 20,
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
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/name-work-surface.hbs',
      data: stepData,
    };
  }

  // ---------------------------------------------------------------------------
  // Random Name Generation
  // ---------------------------------------------------------------------------

  async _generateRandomName(actor) {
    try {
      // Import and use existing random name generator from old chargen
      const { getRandomName } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      if (typeof getRandomName === 'function') {
        return await getRandomName(actor);
      }
    } catch (err) {
      swseLogger.warn('[NameStep] Failed to generate random name:', err);
    }
    return null;
  }

  async _generateRandomDroidName(actor) {
    try {
      // Import and use existing droid name generator from old chargen
      const { getRandomDroidName } = await import('/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js');
      if (typeof getRandomDroidName === 'function') {
        return await getRandomDroidName(actor);
      }
    } catch (err) {
      swseLogger.warn('[NameStep] Failed to generate random droid name:', err);
    }
    return null;
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'name', shell)
      || 'Make your choice wisely.';
  }

  getMentorMode() {
    return 'context-only';
  }

}
