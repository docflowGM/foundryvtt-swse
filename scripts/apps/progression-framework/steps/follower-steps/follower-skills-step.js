/**
 * FollowerSkillsStep
 *
 * Constrained skill selection for followers based on template.
 *
 * CONSTRAINTS (from user specification):
 * - Aggressive/Defensive: Endurance only (forced, no choice)
 * - Utility: One skill choice, excluding "Use the Force"
 *
 * NO BONUS from Intelligence modifier (followers don't calculate that way).
 * Followers get trained skill choices only as specified by template.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class FollowerSkillsStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._templateType = null;
    this._availableSkills = [];
    this._selectedSkills = [];
  }

  async onStepEnter(shell) {
    try {
      const choices = this.getFollowerChoices(shell);
      this._templateType = choices.templateType;

      if (!this._templateType) {
        swseLogger.warn('[FollowerSkillsStep] No template type selected yet');
        return;
      }

      // Get skills allowed for this template
      this._availableSkills = await this.getFollowerSkillsForTemplate(this._templateType);

      swseLogger.log('[FollowerSkillsStep] Entered, template:', this._templateType, 'available skills:', this._availableSkills);

      // Restore selection from session if available
      if (choices.skillChoices && choices.skillChoices.length > 0) {
        this._selectedSkills = [...choices.skillChoices];
      }

      // For Aggressive/Defensive, auto-select Endurance (no choice)
      if (this._templateType === 'aggressive' || this._templateType === 'defensive') {
        this._selectedSkills = ['Endurance'];
        this.saveFollowerChoice(shell, 'skillChoices', this._selectedSkills);
      }
    } catch (err) {
      swseLogger.error('[FollowerSkillsStep] Error entering step:', err);
    }
  }

  async onRender(shell, html, context) {
    try {
      const container = html.querySelector('[data-step-content]');
      if (!container) {
        swseLogger.warn('[FollowerSkillsStep] No step content container found');
        return;
      }

      const contentHtml = this._renderSkillSelection();
      container.innerHTML = contentHtml;

      // Attach event listeners only for Utility (which has choices)
      if (this._templateType === 'utility') {
        this._attachSkillListeners(shell, container);
      }
    } catch (err) {
      swseLogger.error('[FollowerSkillsStep] Error rendering:', err);
    }
  }

  _renderSkillSelection() {
    const titleCase = this._templateType.charAt(0).toUpperCase() + this._templateType.slice(1);

    if (this._templateType === 'aggressive' || this._templateType === 'defensive') {
      // Forced Endurance only
      return `
        <div class="follower-step-content">
          <h3>${titleCase} Follower Skills</h3>
          <p class="step-help">${titleCase} followers are trained in Endurance only.</p>
          <div class="follower-skills-list">
            <div class="skill-item forced">
              <span class="skill-name">Endurance</span>
              <span class="skill-badge">Forced</span>
            </div>
          </div>
        </div>
      `;
    }

    // Utility: One choice
    const skillHtml = (this._availableSkills || []).map(skill => {
      const isSelected = this._selectedSkills.includes(skill);
      return `
        <div class="follower-skill-item ${isSelected ? 'selected' : ''}" data-skill="${skill}">
          <input type="checkbox" class="skill-checkbox" data-skill="${skill}" ${isSelected ? 'checked' : ''}>
          <label class="skill-label">${skill}</label>
        </div>
      `;
    }).join('');

    return `
      <div class="follower-step-content">
        <h3>Utility Follower Skills</h3>
        <p class="step-help">Utility followers may choose one trained skill (excluding Use the Force).</p>
        <div class="follower-skills-list">
          ${skillHtml}
        </div>
      </div>
    `;
  }

  _attachSkillListeners(shell, container) {
    const checkboxes = container.querySelectorAll('.skill-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const skill = checkbox.getAttribute('data-skill');
        const isChecked = checkbox.checked;

        if (isChecked) {
          // Utility: only one selection allowed
          this._selectedSkills = [skill];
        } else {
          // Uncheck
          this._selectedSkills = this._selectedSkills.filter(s => s !== skill);
        }

        // Uncheck all others (single-select for Utility)
        const otherCheckboxes = container.querySelectorAll('.skill-checkbox');
        otherCheckboxes.forEach(cb => {
          if (cb !== checkbox) {
            cb.checked = false;
          }
        });

        swseLogger.log('[FollowerSkillsStep] Selected skills:', this._selectedSkills);
        shell.render();
      });
    });
  }

  async onStepCommit(shell) {
    // For Aggressive/Defensive, Endurance is forced
    if (this._templateType === 'aggressive' || this._templateType === 'defensive') {
      this._selectedSkills = ['Endurance'];
    }

    // For Utility, one skill is optional (can proceed without selection)
    // If no selection, that's okay

    this.saveFollowerChoice(shell, 'skillChoices', this._selectedSkills);
    swseLogger.log('[FollowerSkillsStep] Committed skills:', this._selectedSkills);
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
