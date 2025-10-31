/**
 * Character Sheet
 * Character-specific sheet implementation
 */

import { SWSEActorSheetBase } from '../../sheets/base-sheet.js';

export class SWSECharacterSheet extends SWSEActorSheetBase {
  
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'sheet', 'character'],
      template: 'systems/swse/templates/actors/character/character-sheet.hbs',
      width: 800,
      height: 720
    });
  }
  
  async getData() {
    const context = await super.getData();
    
    // Character-specific data
    context.isForceUser = this.actor.items.some(i => 
      i.type === 'feat' && i.name.toLowerCase().includes('force sensitive')
    );
    
    return context;
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    
    // Character-specific listeners already handled by data-action pattern
  }
  
  // === CHARACTER-SPECIFIC ACTIONS ===
  
  async _onLevelUp(event) {
    ui.notifications.info('Level Up dialog would open here');
    // TODO: Implement level-up dialog
  }
  
  async _onSecondWind(event) {
    return this.actor.useSecondWind();
  }
  
  async _onApplyDamage(event) {
    const amount = await this._getDamageAmount();
    if (amount !== null) {
      return this.actor.applyDamage(amount, {checkThreshold: true});
    }
  }
  
  async _onApplyHealing(event) {
    const amount = await this._getHealingAmount();
    if (amount !== null) {
      return this.actor.applyHealing(amount);
    }
  }
  
  async _onReloadPower(event) {
    const powerId = event.currentTarget.closest('[data-item-id]')?.dataset.itemId;
    const power = this.actor.items.get(powerId);
    
    if (!power) return;
    
    // Spend Force Point
    const spent = await this.actor.spendForcePoint('reload Force Power');
    if (!spent) return;
    
    // Restore uses
    await power.update({
      'system.uses.current': power.system.uses.max
    });
    
    ui.notifications.info(`${power.name} reloaded!`);
  }
  
  async _onShortRest(event) {
    return this.actor.rest('short');
  }
  
  async _onLongRest(event) {
    return this.actor.rest('long');
  }
  
  async _onSpendDestiny(event) {
    const dp = this.actor.system.destinyPoints;
    
    if (dp.value <= 0) {
      ui.notifications.warn('No Destiny Points remaining!');
      return;
    }
    
    await this.actor.update({
      'system.destinyPoints.value': dp.value - 1
    });
    
    ui.notifications.info(`Destiny Point spent! Remaining: ${dp.value - 1}/${dp.max}`);
  }
  
  // === HELPER METHODS ===
  
  async _getDamageAmount() {
    return new Promise((resolve) => {
      new Dialog({
        title: 'Apply Damage',
        content: `
          <form>
            <div class="form-group">
              <label>Damage Amount</label>
              <input type="number" name="amount" value="0" min="0" autofocus/>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="threshold" checked/>
                Check Damage Threshold
              </label>
            </div>
          </form>
        `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Apply',
            callback: html => {
              const amount = parseInt(html.find('[name="amount"]').val());
              resolve(amount);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'apply'
      }).render(true);
    });
  }
  
  async _getHealingAmount() {
    return new Promise((resolve) => {
      new Dialog({
        title: 'Apply Healing',
        content: `
          <form>
            <div class="form-group">
              <label>Healing Amount</label>
              <input type="number" name="amount" value="0" min="0" autofocus/>
            </div>
          </form>
        `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Apply',
            callback: html => {
              const amount = parseInt(html.find('[name="amount"]').val());
              resolve(amount);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'apply'
      }).render(true);
    });
  }
}
