/**
 * FollowerConfirmStep
 *
 * Final confirmation step showing the complete follower derivation.
 * Displays derived stats at owner's heroic level, NOT normal character progression.
 *
 * CRITICAL: Shows:
 * - Follower species + template selection
 * - Derived stats (HP, abilities, defenses, BAB)
 * - All persistent choices (skills, feats, languages)
 * - Owner's heroic level (source of parity)
 *
 * Does NOT show:
 * - Experience/leveling
 * - Normal class progression tables
 * - Freeform ability score advancement
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { getHeroicLevel } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';
import { deriveFollowerStats } from '../../adapters/follower-deriver.js';

export class FollowerConfirmStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._followerChoices = null;
    this._derivedStats = null;
    this._ownerActor = null;
    this._ownerHeroicLevel = null;
  }

  async onStepEnter(shell) {
    try {
      this._ownerActor = this.getOwnerActor(shell);
      this._followerChoices = this.getFollowerChoices(shell);

      if (!this._ownerActor || !this._followerChoices.speciesName || !this._followerChoices.templateType) {
        swseLogger.warn('[FollowerConfirmStep] Missing owner, species, or template');
        return;
      }

      // Get owner's heroic level (critical for follower parity)
      this._ownerHeroicLevel = getHeroicLevel(this._ownerActor) || 1;

      // Derive the follower's complete stats at owner's heroic level
      this._derivedStats = await deriveFollowerStats(
        this._ownerHeroicLevel,
        this._followerChoices.speciesName,
        this._followerChoices.templateType,
        this._followerChoices
      );

      swseLogger.log('[FollowerConfirmStep] Derived stats at level', this._ownerHeroicLevel, ':', {
        hp: this._derivedStats.hp,
        abilities: Object.entries(this._derivedStats.abilities).map(([k, v]) => `${k}=${v.base}`),
        defenses: Object.entries(this._derivedStats.defenses).map(([k, v]) => `${k}=${v.total}`),
      });
    } catch (err) {
      swseLogger.error('[FollowerConfirmStep] Error entering step:', err);
      ui?.notifications?.error?.('Failed to derive follower stats. Please try again.');
    }
  }

  async onRender(shell, html, context) {
    try {
      const container = html.querySelector('[data-step-content]');
      if (!container) {
        swseLogger.warn('[FollowerConfirmStep] No step content container found');
        return;
      }

      const contentHtml = this._renderConfirmation();
      container.innerHTML = contentHtml;
    } catch (err) {
      swseLogger.error('[FollowerConfirmStep] Error rendering:', err);
    }
  }

  _renderConfirmation() {
    if (!this._followerChoices || !this._derivedStats) {
      return `
        <div class="follower-step-content">
          <p class="error">Unable to load follower data. Please go back and reselect.</p>
        </div>
      `;
    }

    const stats = this._derivedStats;
    const choices = this._followerChoices;

    // Ability scores
    const abilityHtml = Object.entries(stats.abilities)
      .map(([key, val]) => `<span class="ability-score">${key.toUpperCase()} ${val.base} (${val.mod > 0 ? '+' : ''}${val.mod})</span>`)
      .join(' ');

    // Defenses
    const defenseHtml = Object.entries(stats.defenses)
      .map(([key, val]) => `<span class="defense-score">${key.toUpperCase()} ${val.total}</span>`)
      .join(' ');

    // Template type display
    const templateDisplay = choices.templateType
      ? choices.templateType.charAt(0).toUpperCase() + choices.templateType.slice(1)
      : 'Unknown';

    return `
      <div class="follower-step-content follower-confirm-content">
        <h3>Confirm Follower Creation</h3>

        <div class="confirm-section follower-identity">
          <h4>Follower Identity</h4>
          <div class="confirm-row">
            <span class="label">Species:</span>
            <span class="value">${choices.speciesName}</span>
          </div>
          <div class="confirm-row">
            <span class="label">Template:</span>
            <span class="value">${templateDisplay}</span>
          </div>
          ${choices.backgroundChoice ? `
            <div class="confirm-row">
              <span class="label">Background:</span>
              <span class="value">${choices.backgroundChoice}</span>
            </div>
          ` : ''}
        </div>

        <div class="confirm-section follower-owner">
          <h4>Owner Connection</h4>
          <div class="confirm-row">
            <span class="label">Owner:</span>
            <span class="value">${this._ownerActor.name}</span>
          </div>
          <div class="confirm-row">
            <span class="label">Owner's Heroic Level:</span>
            <span class="value">${this._ownerHeroicLevel}</span>
          </div>
          <p class="confirmation-note">The follower's level and statistics are DERIVED from the owner's heroic level. This connection is maintained across all future progression.</p>
        </div>

        <div class="confirm-section follower-derived-stats">
          <h4>Derived Statistics</h4>
          <div class="stats-grid">
            <div class="stat-block">
              <h5>Hit Points</h5>
              <p class="stat-value">${stats.hp.max}</p>
              <p class="stat-formula">10 + owner heroic level</p>
            </div>
            <div class="stat-block">
              <h5>Base Attack Bonus</h5>
              <p class="stat-value">${stats.bab}</p>
              <p class="stat-formula">From ${templateDisplay} progression table</p>
            </div>
            <div class="stat-block">
              <h5>Damage Threshold</h5>
              <p class="stat-value">${stats.damageThreshold}</p>
              <p class="stat-formula">Fortitude + template bonuses</p>
            </div>
          </div>

          <h5>Ability Scores</h5>
          <div class="abilities-display">
            ${abilityHtml}
          </div>

          <h5>Defenses</h5>
          <div class="defenses-display">
            ${defenseHtml}
          </div>
        </div>

        <div class="confirm-section follower-choices">
          <h4>Selected Options</h4>
          ${choices.skillChoices.length > 0 ? `
            <div class="confirm-row">
              <span class="label">Trained Skills:</span>
              <span class="value">${choices.skillChoices.join(', ')}</span>
            </div>
          ` : ''}
          ${choices.featChoices.length > 0 ? `
            <div class="confirm-row">
              <span class="label">Additional Feats:</span>
              <span class="value">${choices.featChoices.join(', ')}</span>
            </div>
          ` : ''}
          ${choices.languageChoices.length > 0 ? `
            <div class="confirm-row">
              <span class="label">Languages:</span>
              <span class="value">${choices.languageChoices.join(', ')}</span>
            </div>
          ` : ''}
        </div>

        <div class="confirm-section confirmation-note">
          <p><strong>Note on Follower Advancement:</strong></p>
          <p>This follower will automatically advance as the owner gains heroic levels. All statistics are recalculated from the derivation model—followers do not accumulate experience or level independently.</p>
        </div>

        <p class="confirmation-footer">Click <strong>Finish</strong> to create the follower. The follower actor will be created and linked to this owner.</p>
      </div>
    `;
  }

  async onStepCommit(shell) {
    if (!this._followerChoices || !this._derivedStats) {
      ui?.notifications?.error?.('Unable to create follower. Please go back and reselect.');
      return false;
    }

    swseLogger.log('[FollowerConfirmStep] Follower creation confirmed', {
      species: this._followerChoices.speciesName,
      template: this._followerChoices.templateType,
      ownerLevel: this._ownerHeroicLevel,
    });

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
