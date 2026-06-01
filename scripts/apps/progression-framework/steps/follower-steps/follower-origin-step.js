/**
 * FollowerOriginStep
 *
 * First follower-chargen decision: droid or living being. This is intentionally
 * not a splash screen; it is a normal progression step inside the shared shell.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class FollowerOriginStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._selectedKind = null;
    this._allowDroids = true;
  }

  async onStepEnter(shell) {
    const choices = this.getFollowerChoices(shell);
    this._selectedKind = choices.followerKind
      || (choices.droidConfig?.isDroid ? 'droid' : null)
      || (choices.speciesName ? 'living' : null);
    this._allowDroids = HouseRuleService.getBoolean('allowDroidFollowers', true);
  }

  async onRender(shell, html) {
    if (!html || typeof html.querySelector !== 'function') return;
    const container = html.querySelector('[data-step-content]');
    if (!container) return;

    container.innerHTML = `
      <div class="follower-step-content follower-origin-content">
        <h3>Your follower is a...</h3>
        <p class="step-help">Choose whether this follower is a droid chassis or a living being. This controls the next build step.</p>
        <div class="follower-origin-grid">
          ${this._renderCard('living', 'Living Being', 'Choose a normal species, then apply follower template rules.')}
          ${this._renderCard('droid', 'Droid', this._allowDroids ? 'Configure a droid chassis, equipment budget, and one +2 ability.' : 'Droid followers are disabled by campaign houserule.', !this._allowDroids)}
        </div>
      </div>
    `;

    container.querySelectorAll('.select-follower-origin-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        const kind = button.dataset.kind;
        if (kind === 'droid' && !this._allowDroids) {
          ui?.notifications?.warn?.('Droid followers are disabled by campaign houserule.');
          return;
        }
        this._selectKind(shell, kind);
      });
    });
  }

  _renderCard(kind, title, body, disabled = false) {
    const selected = this._selectedKind === kind;
    return `
      <div class="follower-origin-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}" data-kind="${kind}">
        <h4>${title}</h4>
        <p>${body}</p>
        <button type="button" class="select-follower-origin-btn" data-kind="${kind}" ${disabled ? 'disabled' : ''}>
          ${selected ? '✓ Selected' : 'Select'}
        </button>
      </div>
    `;
  }

  _selectKind(shell, kind) {
    this._selectedKind = kind;
    this.saveFollowerChoice(shell, 'followerKind', kind);

    if (kind === 'droid') {
      this.saveFollowerChoice(shell, 'speciesName', 'Droid');
      this.saveFollowerChoice(shell, 'speciesId', null);
      this.saveFollowerChoice(shell, 'humanTemplateBonus', null);
      const current = this.getFollowerChoices(shell).droidConfig || {};
      this.saveFollowerChoice(shell, 'droidConfig', {
        ...current,
        isDroid: true,
        size: current.size || 'medium',
        locomotion: current.locomotion || 'walking',
        speed: current.speed || 6,
        abilityChoice: current.abilityChoice || 'int'
      });
    } else {
      this.saveFollowerChoice(shell, 'droidConfig', null);
      if (this.getFollowerChoices(shell).speciesName === 'Droid') {
        this.saveFollowerChoice(shell, 'speciesName', null);
      }
    }

    swseLogger.log('[FollowerOriginStep] Selected follower kind:', kind);
    shell.render();
  }

  async onStepCommit(shell) {
    if (!this._selectedKind) {
      ui?.notifications?.warn?.('Choose whether the follower is a droid or a living being.');
      return false;
    }
    if (this._selectedKind === 'droid' && !this._allowDroids) {
      ui?.notifications?.warn?.('Droid followers are disabled by campaign houserule.');
      return false;
    }
    this.saveFollowerChoice(shell, 'followerKind', this._selectedKind);
    return true;
  }


  validate() {
    const errors = [];
    if (!this._selectedKind) errors.push('Choose whether the follower is a living being or a droid.');
    if (this._selectedKind === 'droid' && !this._allowDroids) errors.push('Droid followers are disabled by campaign houserule.');
    return { isValid: errors.length === 0, errors, warnings: [] };
  }

  getBlockingIssues() {
    return this.validate().errors;
  }

  getSelection() {
    return {
      selected: this._selectedKind ? [this._selectedKind] : [],
      count: this._selectedKind ? 1 : 0,
      isComplete: this.getBlockingIssues().length === 0,
    };
  }

  getUtilityBarConfig() {
    return { showSearch: false, showSort: false, showFilter: false };
  }
}
