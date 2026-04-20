/**
 * FollowerBackgroundStep
 *
 * Optional background selection for followers.
 * This step is toggleable via house rule setting.
 * If disabled, step auto-resolves with no selection.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class FollowerBackgroundStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._isEnabled = false;
    this._backgrounds = [];
    this._selectedBackground = null;
  }

  async onStepEnter(shell) {
    try {
      // Check house rule setting for follower backgrounds
      const enableFollowerBackgrounds = HouseRuleService.isEnabled('enableFollowerBackgrounds');
      this._isEnabled = enableFollowerBackgrounds;

      swseLogger.log('[FollowerBackgroundStep] Entered, enabled:', this._isEnabled);

      if (!this._isEnabled) {
        // Auto-resolve: skip to next step
        // This is handled by onStepCommit returning true immediately
        return;
      }

      // Load backgrounds (Phase 3: placeholder — will be populated when backgrounds are available)
      this._backgrounds = [];

      // Restore selection from session if available
      const choices = this.getFollowerChoices(shell);
      if (choices.backgroundChoice) {
        this._selectedBackground = choices.backgroundChoice;
      }
    } catch (err) {
      swseLogger.error('[FollowerBackgroundStep] Error entering step:', err);
    }
  }

  async onRender(shell, html, context) {
    try {
      const container = html.querySelector('[data-step-content]');
      if (!container) {
        swseLogger.warn('[FollowerBackgroundStep] No step content container found');
        return;
      }

      if (!this._isEnabled) {
        // Show placeholder when disabled
        container.innerHTML = `
          <div class="follower-step-content">
            <p class="step-disabled">Follower backgrounds are disabled in this campaign.</p>
          </div>
        `;
        return;
      }

      // Build background list (placeholder)
      const listHtml = this._renderBackgroundList();
      container.innerHTML = listHtml;

      // Attach event listeners
      this._attachBackgroundListeners(shell, container);
    } catch (err) {
      swseLogger.error('[FollowerBackgroundStep] Error rendering:', err);
    }
  }

  _renderBackgroundList() {
    if (this._backgrounds.length === 0) {
      return `
        <div class="follower-step-content">
          <h3>Follower Background</h3>
          <p class="step-help">No backgrounds available yet. This feature is under development.</p>
        </div>
      `;
    }

    const bgHtml = this._backgrounds.map(bg => {
      const isSelected = this._selectedBackground === bg.id;
      return `
        <div class="follower-background-item ${isSelected ? 'selected' : ''}" data-background="${bg.id}">
          <h4>${bg.name}</h4>
          <p>${bg.description}</p>
          <button class="select-background-btn" data-background="${bg.id}">
            ${isSelected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="follower-step-content">
        <h3>Follower Background (Optional)</h3>
        <p class="step-help">Select a background to give your follower additional flavor and bonuses.</p>
        <div class="follower-background-list">
          ${bgHtml}
        </div>
      </div>
    `;
  }

  _attachBackgroundListeners(shell, container) {
    const buttons = container.querySelectorAll('.select-background-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const bgId = btn.getAttribute('data-background');
        this._selectBackground(shell, bgId);
      });
    });
  }

  _selectBackground(shell, bgId) {
    this._selectedBackground = bgId;
    this.saveFollowerChoice(shell, 'backgroundChoice', bgId);
    swseLogger.log('[FollowerBackgroundStep] Selected background:', bgId);

    // Re-render to show selection highlight
    shell.render();
  }

  async onStepCommit(shell) {
    if (!this._isEnabled) {
      // Step is disabled; auto-resolve
      swseLogger.log('[FollowerBackgroundStep] Disabled, auto-resolving');
      return true;
    }

    // Background is optional; can proceed without selection
    if (this._selectedBackground) {
      this.saveFollowerChoice(shell, 'backgroundChoice', this._selectedBackground);
    }

    swseLogger.log('[FollowerBackgroundStep] Committed');
    return true;
  }

  getUtilityBarConfig() {
    return {
      showSearch: false,
      showSort: false,
      showFilter: false,
    };
  }
}
