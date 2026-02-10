import { swseLogger } from '../utils/logger.js';
import { escapeHTML } from '../utils/security-utils.js';

/**
 * SWSE Damage System (v13+)
 * - Modern, safe, RAW-compatible
 * - Uses SWSEActorBase.applyDamage() and applyHealing()
 * - Supports multiple token selection
 * - Updated Condition Track UI (integer CT)
 * - Removes all deprecated or removed API calls
 */

export class DamageSystem {

  /* ---------------------------------------- */
  /* Utility — Get first selected actor        */
  /* ---------------------------------------- */

  static getSelectedActor() {
    return canvas.tokens.controlled[0]?.actor ?? null;
  }

  static _getSelectedTokens() {
    const tokens = canvas.tokens.controlled;
    if (!tokens.length) {
      ui.notifications.warn(game.i18n.localize('SWSE.Notifications.Combat.NoActorSelected'));
      return [];
    }
    return tokens;
  }

  /* ---------------------------------------- */
  /* DAMAGE / HEALING WRAPPERS                */
  /* ---------------------------------------- */

  static async applyToSelected(amount, options = {}) {
    const tokens = this._getSelectedTokens();
    if (!tokens.length) {return;}

    for (const token of tokens) {
      try {
        await token.actor.applyDamage(amount, options);
      } catch (err) {
        swseLogger.error(err);
        ui.notifications.error('Failed to apply damage.');
      }
    }
  }

  static async healSelected(amount) {
    const tokens = this._getSelectedTokens();
    if (!tokens.length) {return;}

    for (const token of tokens) {
      try {
        await token.actor.applyHealing(amount);
      } catch (err) {
        swseLogger.error(err);
        ui.notifications.error('Failed to apply healing.');
      }
    }
  }

  /* ---------------------------------------- */
  /* DAMAGE DIALOG                            */
  /* ---------------------------------------- */

  static async showDamageDialog(actor = null) {
    const target = actor ?? this.getSelectedActor();
    if (!target) {
      ui.notifications.warn(game.i18n.localize('SWSE.Notifications.Combat.NoActorSelected'));
      return;
    }

    return new Promise(resolve => {
      new Dialog({
        title: game.i18n.format('SWSE.Dialogs.ApplyDamage.Title', { name: escapeHTML(target.name) }),
        content: `
          <form>
            <div class="form-group">
              <label>${game.i18n.localize('SWSE.Dialogs.ApplyDamage.Amount')}</label>
              <input type="number" name="amount" value="0" min="0" style="width:100%;" autofocus />
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" name="threshold" checked />
                ${game.i18n.localize('SWSE.Dialogs.ApplyDamage.CheckThreshold')}
              </label>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" name="ignoreTemp" />
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
              const amount = Math.max(0, Number((html?.[0] ?? html)?.querySelector('[name="amount"]')?.value || 0));
              const checkThreshold = (html?.[0] ?? html)?.querySelector('[name="threshold"]')?.checked;
              const ignoreTemp = (html?.[0] ?? html)?.querySelector('[name="ignoreTemp"]')?.checked;

              try {
                await target.applyDamage(amount, { checkThreshold, ignoreTemp });
              } catch (err) {
                swseLogger.error(err);
                ui.notifications.error('Failed to apply damage.');
              }

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

  /* ---------------------------------------- */
  /* HEALING DIALOG                           */
  /* ---------------------------------------- */

  static async showHealingDialog(actor = null) {
    const target = actor ?? this.getSelectedActor();
    if (!target) {
      ui.notifications.warn(game.i18n.localize('SWSE.Notifications.Combat.NoActorSelected'));
      return;
    }

    const isDroid = target.system.isDroid === true;

    const title = isDroid
      ? game.i18n.format('SWSE.Dialogs.Healing.TitleRepair', { name: target.name })
      : game.i18n.format('SWSE.Dialogs.Healing.TitleHeal', { name: target.name });

    const label = isDroid
      ? game.i18n.localize('SWSE.Dialogs.Healing.ButtonRepair')
      : game.i18n.localize('SWSE.Dialogs.Healing.ButtonHeal');

    const icon = isDroid ? 'fa-wrench' : 'fa-kit-medical';

    return new Promise(resolve => {
      new Dialog({
        title,
        content: `
          <form>
            <div class="form-group">
              <label>${isDroid
                ? game.i18n.localize('SWSE.Dialogs.Healing.RepairAmount')
                : game.i18n.localize('SWSE.Dialogs.Healing.Amount')}</label>
              <input type="number" name="amount" value="0" min="0" style="width:100%;" autofocus />
            </div>

            ${isDroid ? `
              <p class="notes" style="color:#888; font-size:0.9em;">
                ${game.i18n.localize('SWSE.Dialogs.Healing.DroidNote')}
              </p>` : ''}
          </form>
        `,
        buttons: {
          apply: {
            icon: `<i class="fas ${icon}"></i>`,
            label,
            callback: async html => {
              const amount = Math.max(0, Number((html?.[0] ?? html)?.querySelector('[name="amount"]')?.value || 0));

              try {
                await target.applyHealing(amount, { isRepair: isDroid });
              } catch (err) {
                swseLogger.error(err);
                ui.notifications.error('Failed to apply healing/repair.');
              }

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

  /* ---------------------------------------- */
  /* CONDITION TRACK DIALOG (Rewritten)       */
  /* ---------------------------------------- */

  static async showConditionDialog(actor = null) {
    const target = actor ?? this.getSelectedActor();
    if (!target) {
      ui.notifications.warn('No actor selected');
      return;
    }

    const ct = target.system.conditionTrack.current ?? 0;
    const labels = ['Normal', '-1', '-2', '-5', '-10', 'Helpless'];

    return new Promise(resolve => {
      new Dialog({
        title: `Condition Track: ${target.name}`,
        content: `
          <form>
            <div class="form-group">
              <label>Condition State</label>
              <select name="ct" style="width:100%;">
                ${labels.map((l, i) =>
                  `<option value="${i}" ${i === ct ? 'selected' : ''}>${l}</option>`
                ).join('')}
              </select>
            </div>
          </form>
        `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Apply',
            callback: async html => {
              const newCT = Number((html?.[0] ?? html)?.querySelector('[name="ct"]')?.value);
              await target.update({ 'system.conditionTrack.current': newCT });
              resolve(newCT);
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

/* Make available globally */
window.SWSEDamage = DamageSystem;
