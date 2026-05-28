/**
 * FollowerConfirmStep
 *
 * Final confirmation step showing follower derivation and resolving starting
 * credits. Followers do not level by choices after creation; future level-up is
 * an automatic owner-level recalculation.
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
    this._creditModel = null;
  }

  async onStepEnter(shell) {
    try {
      this._ownerActor = this.getOwnerActor(shell);
      this._followerChoices = this.getFollowerChoices(shell);

      if (!this._ownerActor || !this._followerChoices.speciesName || !this._followerChoices.templateType) {
        swseLogger.warn('[FollowerConfirmStep] Missing owner, species, or template');
        return;
      }

      this._ownerHeroicLevel = getHeroicLevel(this._ownerActor) || 1;
      this._creditModel = await this.getOwnerStartingCreditModel(this._ownerActor);

      this._derivedStats = await deriveFollowerStats(
        this._ownerHeroicLevel,
        this._followerChoices.speciesName,
        this._followerChoices.templateType,
        this._followerChoices
      );

      swseLogger.log('[FollowerConfirmStep] Derived stats at level', this._ownerHeroicLevel, {
        hp: this._derivedStats.hp,
        credits: this._creditModel
      });
    } catch (err) {
      swseLogger.error('[FollowerConfirmStep] Error entering step:', err);
      ui?.notifications?.error?.('Failed to derive follower stats. Please try again.');
    }
  }

  async onRender(shell, html, context) {
    try {
      const container = html.querySelector('[data-step-content]');
      if (!container) return;
      container.innerHTML = this._renderConfirmation();
      this._attachCreditListeners(shell, container);
    } catch (err) {
      swseLogger.error('[FollowerConfirmStep] Error rendering:', err);
    }
  }

  _renderConfirmation() {
    if (!this._followerChoices || !this._derivedStats) {
      return `<div class="follower-step-content"><p class="error">Unable to load follower data. Please go back and reselect.</p></div>`;
    }

    const stats = this._derivedStats;
    const choices = this._followerChoices;
    const templateDisplay = choices.templateType
      ? choices.templateType.charAt(0).toUpperCase() + choices.templateType.slice(1)
      : 'Unknown';
    const abilityHtml = Object.entries(stats.abilities)
      .map(([key, val]) => `<span class="ability-score">${key.toUpperCase()} ${val.absent ? '—' : val.base} (${val.mod > 0 ? '+' : ''}${val.mod})</span>`)
      .join(' ');
    const defenseHtml = Object.entries(stats.defenses)
      .map(([key, val]) => `<span class="defense-score">${this._displayDefense(key)} ${val.total}</span>`)
      .join(' ');
    const droidConfig = choices.droidConfig?.isDroid ? choices.droidConfig : null;
    const droidBudget = droidConfig ? this._getDroidBudgetSummary(choices, droidConfig) : null;

    return `
      <div class="follower-step-content follower-confirm-content">
        <h3>Confirm Follower Creation</h3>

        <div class="confirm-section follower-identity">
          <h4>Follower Identity</h4>
          <div class="confirm-row"><span class="label">Species:</span><span class="value">${choices.speciesName}</span></div>
          <div class="confirm-row"><span class="label">Template:</span><span class="value">${templateDisplay}</span></div>
          ${choices.backgroundChoice ? `<div class="confirm-row"><span class="label">Background:</span><span class="value">${choices.backgroundChoice}</span></div>` : ''}
          ${choices.humanTemplateBonus ? `<div class="confirm-row"><span class="label">Human Bonus:</span><span class="value">${this._displayHumanBonus(choices.humanTemplateBonus)}</span></div>` : ''}
          ${droidConfig ? `<div class="confirm-row"><span class="label">Droid Chassis:</span><span class="value">${droidConfig.size || 'medium'}, ${droidConfig.locomotion || 'walking'} speed 6, +2 ${(droidConfig.abilityChoice || 'int').toUpperCase()}</span></div>` : ''}
        </div>

        <div class="confirm-section follower-owner">
          <h4>Owner Connection</h4>
          <div class="confirm-row"><span class="label">Owner:</span><span class="value">${this._ownerActor.name}</span></div>
          <div class="confirm-row"><span class="label">Owner's Heroic Level:</span><span class="value">${this._ownerHeroicLevel}</span></div>
          <p class="confirmation-note">This follower's future level-ups are automatic recalculations from the owner's heroic level. Followers do not choose classes, talents, or level-up options.</p>
        </div>

        <div class="confirm-section follower-derived-stats">
          <h4>Derived Statistics</h4>
          <div class="stats-grid">
            <div class="stat-block">
              <h5>Hit Points</h5>
              <p class="stat-value">${stats.hp.max}</p>
              <p class="stat-formula">10 + owner heroic level + CON modifier</p>
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
          <div class="abilities-display">${abilityHtml}</div>

          <h5>Defenses</h5>
          <div class="defenses-display">${defenseHtml}</div>
        </div>

        <div class="confirm-section follower-credits">
          <h4>Starting Credits</h4>
          <p class="step-help">Follower starting credits use the owner's first heroic base-class starting credit formula.</p>
          <div class="confirm-row"><span class="label">Owner base class:</span><span class="value">${this._creditModel?.className || 'Unknown'}</span></div>
          <div class="confirm-row"><span class="label">Formula:</span><span class="value">${this._creditModel?.formula || 'No formula found'}</span></div>
          <div class="confirm-row"><span class="label">Resolved credits:</span><span class="value">${choices.startingCredits ?? 'Not resolved'}</span></div>
          <div class="follower-credit-actions">
            <button type="button" class="take-max-credits-btn">Take Max (${this._creditModel?.max ?? 0} cr)</button>
            <button type="button" class="roll-credits-btn">Roll Starting Credits</button>
          </div>
          ${droidBudget ? `
            <p class="confirmation-note"><strong>Droid spending:</strong> Droid followers must spend their starting-credit budget on allowed droid systems only. Unspent credits are lost.</p>
            <div class="confirm-row"><span class="label">Selected optional systems:</span><span class="value">${droidBudget.systems || 'None'}</span></div>
            <div class="confirm-row"><span class="label">Optional system cost:</span><span class="value">${droidBudget.spent} cr</span></div>
            ${choices.startingCredits !== null && choices.startingCredits !== undefined ? `<div class="confirm-row"><span class="label">Unspent/lost:</span><span class="value">${Math.max(0, Number(choices.startingCredits || 0) - droidBudget.spent)} cr</span></div>` : ''}
            ${choices.startingCredits !== null && choices.startingCredits !== undefined && droidBudget.spent > Number(choices.startingCredits || 0) ? '<p class="error">Selected droid systems exceed the resolved starting-credit budget.</p>' : ''}
          ` : ''}
        </div>

        <div class="confirm-section follower-choices">
          <h4>Selected Options</h4>
          ${choices.skillChoices.length > 0 ? `<div class="confirm-row"><span class="label">Trained Skills:</span><span class="value">${choices.skillChoices.join(', ')}</span></div>` : ''}
          ${choices.featChoices.length > 0 ? `<div class="confirm-row"><span class="label">Additional Feats:</span><span class="value">${choices.featChoices.join(', ')}</span></div>` : ''}
          ${choices.languageChoices.length > 0 ? `<div class="confirm-row"><span class="label">Languages:</span><span class="value">${choices.languageChoices.join(', ')}</span></div>` : ''}
        </div>

        <p class="confirmation-footer">Click <strong>Finish</strong> to create the linked follower actor.</p>
      </div>
    `;
  }

  _attachCreditListeners(shell, container) {
    container.querySelector('.take-max-credits-btn')?.addEventListener('click', event => {
      event.preventDefault();
      const value = Number(this._creditModel?.max || 0);
      this._saveCredits(shell, value, 'max');
      shell.render();
    });

    container.querySelector('.roll-credits-btn')?.addEventListener('click', async event => {
      event.preventDefault();
      const value = await this._rollCredits();
      this._saveCredits(shell, value, 'rolled');
      shell.render();
    });
  }

  async _rollCredits() {
    const formula = this._creditModel?.formula;
    if (!formula) return 0;
    try {
      if (typeof Roll !== 'undefined') {
        const roll = await new Roll(formula).roll({ async: true });
        roll.toMessage?.({ flavor: 'Follower Starting Credits' });
        return Number(roll.total || 0);
      }
    } catch (err) {
      swseLogger.warn('[FollowerConfirmStep] Foundry Roll failed; using fallback roller:', err);
    }
    return this._fallbackRollFormula(formula);
  }

  _fallbackRollFormula(formula) {
    const match = String(formula || '').match(/^(\d+)d(\d+)\s*\*\s*(\d+)$/i);
    if (!match) return Number(this._creditModel?.average || 0);
    const count = Number(match[1]);
    const die = Number(match[2]);
    const multiplier = Number(match[3]);
    let total = 0;
    for (let i = 0; i < count; i += 1) total += Math.floor(Math.random() * die) + 1;
    return total * multiplier;
  }

  _saveCredits(shell, value, mode) {
    this.saveFollowerChoice(shell, 'startingCredits', value);
    this.saveFollowerChoice(shell, 'startingCreditsMode', mode);
    this.saveFollowerChoice(shell, 'startingCreditsFormula', this._creditModel?.formula || null);
  }

  async onStepCommit(shell) {
    if (!this._followerChoices || !this._derivedStats) {
      ui?.notifications?.error?.('Unable to create follower. Please go back and reselect.');
      return false;
    }

    const choices = this.getFollowerChoices(shell);
    if (this._creditModel?.formula && (choices.startingCredits === null || choices.startingCredits === undefined)) {
      ui?.notifications?.warn?.('Resolve follower starting credits by taking max or rolling.');
      return false;
    }

    if (choices.droidConfig?.isDroid) {
      const summary = this._getDroidBudgetSummary(choices, choices.droidConfig);
      if (summary.spent > Number(choices.startingCredits || 0)) {
        ui?.notifications?.warn?.('Selected droid systems exceed the starting-credit budget.');
        return false;
      }
      choices.droidConfig.spentCredits = summary.spent;
      choices.droidConfig.lostCredits = Math.max(0, Number(choices.startingCredits || 0) - summary.spent);
      this.saveFollowerChoice(shell, 'droidConfig', choices.droidConfig);
    }

    swseLogger.log('[FollowerConfirmStep] Follower creation confirmed', {
      species: choices.speciesName,
      template: choices.templateType,
      ownerLevel: this._ownerHeroicLevel,
      startingCredits: choices.startingCredits
    });
    return true;
  }

  _getDroidBudgetSummary(choices, droidConfig) {
    const systems = Array.isArray(droidConfig?.optionalSystems) ? droidConfig.optionalSystems : [];
    const spent = systems.reduce((sum, system) => sum + Number(system.cost || 0), 0);
    return {
      spent,
      systems: systems.map(system => `${system.name} (${system.cost} cr)`).join(', ')
    };
  }

  _displayDefense(key) {
    const map = { fort: 'Fortitude', fortitude: 'Fortitude', ref: 'Reflex', reflex: 'Reflex', will: 'Will' };
    return map[key] || key;
  }

  _displayHumanBonus(choice) {
    if (!choice) return '';
    const template = String(choice.templateType || '').charAt(0).toUpperCase() + String(choice.templateType || '').slice(1);
    const type = String(choice.bonusType || '').charAt(0).toUpperCase() + String(choice.bonusType || '').slice(1);
    return `${template} ${type}${choice.value ? `: ${choice.value}` : ''}`;
  }

  getUtilityBarConfig() {
    return { showSearch: false, showSort: false, showFilter: false };
  }
}
