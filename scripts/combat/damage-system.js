/**
 * Damage Application System
 * Handles damage, healing, and condition track automation
 */

export class DamageSystem {
  
  /**
   * Apply damage to token(s)
   */
  static async applyToSelected(amount, options = {}) {
    const tokens = canvas.tokens.controlled;
    
    if (tokens.length === 0) {
      ui.notifications.warn('No tokens selected');
      return;
    }
    
    for (const token of tokens) {
      await token.actor.applyDamage(amount, options);
    }
  }
  
  /**
   * Apply healing to token(s)
   */
  static async healSelected(amount) {
    const tokens = canvas.tokens.controlled;
    
    if (tokens.length === 0) {
      ui.notifications.warn('No tokens selected');
      return;
    }
    
    for (const token of tokens) {
      await token.actor.applyHealing(amount);
    }
  }
  
  /**
   * Show damage dialog
   */
  static async showDamageDialog(actor = null) {
    const targetActor = actor || (canvas.tokens.controlled[0]?.actor);
    
    if (!targetActor) {
      ui.notifications.warn(game.i18n.localize('SWSE.Notifications.Combat.NoActorSelected'));
      return;
    }

    return new Promise((resolve) => {
      new Dialog({
        title: game.i18n.format('SWSE.Dialogs.ApplyDamage.Title', {name: targetActor.name}),
        content: `
          <form>
            <div class="form-group">
              <label>${game.i18n.localize('SWSE.Dialogs.ApplyDamage.Amount')}</label>
              <input type="number" name="amount" value="0" min="0" autofocus style="width: 100%;"/>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="threshold" checked/>
                ${game.i18n.localize('SWSE.Dialogs.ApplyDamage.CheckThreshold')}
              </label>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="ignoreTemp"/>
                ${game.i18n.localize('SWSE.Dialogs.ApplyDamage.IgnoreTemp')}
              </label>
            </div>
          </form>
        `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-heart-broken"></i>',
            label: game.i18n.localize('SWSE.Dialogs.ApplyDamage.Button'),
            callback: async html => {
              const amount = parseInt(html.find('[name="amount"]').val()) || 0;
              const checkThreshold = html.find('[name="threshold"]').is(':checked');
              const ignoreTemp = html.find('[name="ignoreTemp"]').is(':checked');

              await targetActor.applyDamage(amount, {checkThreshold, ignoreTemp});
              resolve(amount);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('SWSE.Dialogs.Buttons.Cancel'),
            callback: () => resolve(null)
          }
        },
        default: 'apply'
      }).render(true);
    });
  }
  
  /**
   * Show healing dialog
   */
  static async showHealingDialog(actor = null) {
    const targetActor = actor || (canvas.tokens.controlled[0]?.actor);

    if (!targetActor) {
      ui.notifications.warn(game.i18n.localize('SWSE.Notifications.Combat.NoActorSelected'));
      return;
    }

    const isDroid = targetActor.system.isDroid || false;
    const title = isDroid
      ? game.i18n.format('SWSE.Dialogs.Healing.TitleRepair', {name: targetActor.name})
      : game.i18n.format('SWSE.Dialogs.Healing.TitleHeal', {name: targetActor.name});
    const label = isDroid
      ? game.i18n.localize('SWSE.Dialogs.Healing.ButtonRepair')
      : game.i18n.localize('SWSE.Dialogs.Healing.ButtonHeal');
    const icon = isDroid ? 'fa-wrench' : 'fa-medkit';

    return new Promise((resolve) => {
      new Dialog({
        title: title,
        content: `
          <form>
            <div class="form-group">
              <label>${isDroid ? game.i18n.localize('SWSE.Dialogs.Healing.RepairAmount') : game.i18n.localize('SWSE.Dialogs.Healing.Amount')}</label>
              <input type="number" name="amount" value="0" min="0" autofocus style="width: 100%;"/>
            </div>
            ${isDroid ? `<p style="color: #999; font-size: 0.9em;">${game.i18n.localize('SWSE.Dialogs.Healing.DroidNote')}</p>` : ''}
          </form>
        `,
        buttons: {
          apply: {
            icon: `<i class="fas ${icon}"></i>`,
            label: label,
            callback: async html => {
              const amount = parseInt(html.find('[name="amount"]').val()) || 0;
              await targetActor.applyHealing(amount, { isRepair: isDroid });
              resolve(amount);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('SWSE.Dialogs.Buttons.Cancel'),
            callback: () => resolve(null)
          }
        },
        default: 'apply'
      }).render(true);
    });
  }
  
  /**
   * Show condition track dialog
   */
  static async showConditionDialog(actor = null) {
    const targetActor = actor || (canvas.tokens.controlled[0]?.actor);
    
    if (!targetActor) {
      ui.notifications.warn('No actor selected');
      return;
    }
    
    const track = ['normal', '-1', '-2', '-5', '-10', 'helpless'];
    const currentIndex = track.indexOf(targetActor.system.conditionTrack);
    
    return new Promise((resolve) => {
      new Dialog({
        title: `Condition Track: ${targetActor.name}`,
        content: `
          <form>
            <div class="form-group">
              <label>Current Condition</label>
              <select name="condition" style="width: 100%;">
                ${track.map((c, i) => `
                  <option value="${c}" ${i === currentIndex ? 'selected' : ''}>
                    ${c} ${i > 0 ? `(${c} penalty)` : ''}
                  </option>
                `).join('')}
              </select>
            </div>
          </form>
        `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Apply',
            callback: async html => {
              const condition = html.find('[name="condition"]').val();
              await targetActor.update({'system.conditionTrack': condition});
              resolve(condition);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('SWSE.Dialogs.Buttons.Cancel'),
            callback: () => resolve(null)
          }
        },
        default: 'apply'
      }).render(true);
    });
  }
}

// Make available globally for macros
window.SWSEDamage = DamageSystem;
