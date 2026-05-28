/**
 * GMTradeConsoleSurfaceController
 *
 * Owns DOM wiring for the GM Trade Console surface. Trade settlement, economy
 * repair, and game escrow mutation stay on the GM Datapad host/services so the
 * controller extraction does not duplicate transaction logic.
 */

import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class GMTradeConsoleSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-trade-console');
    if (!pageElement) return;

    pageElement.querySelectorAll('[data-trade-select]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.selectedTradeRecordId = event.currentTarget.dataset.tradeSelect || null;
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-trade-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const current = event.currentTarget;
        const action = current.dataset.tradeAction;
        const threadId = current.dataset.threadId;
        const recordId = current.dataset.recordId;
        if (!action || !threadId || !recordId) return;

        const memo = pageElement.querySelector(`[data-trade-note-for="${recordId}"]`)?.value ?? '';
        const ok = await HolonetMessengerService.threadAction({ actor: null, threadId, recordId, action, memo });
        if (!ok) ui?.notifications?.warn?.('Trade action did not complete. Check the console details for diagnostics.');
        this.host.selectedTradeRecordId = recordId;
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-economy-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const current = event.currentTarget;
        const action = current.dataset.economyAction;
        const kind = current.dataset.economyKind || '';
        const note = pageElement.querySelector('[data-economy-repair-note]')?.value ?? '';
        await this.host._handleEconomyRepairAction({
          action,
          kind,
          sessionId: current.dataset.sessionId || '',
          threadId: current.dataset.threadId || '',
          recordId: current.dataset.recordId || '',
          selectRecordId: current.dataset.selectRecordId || '',
          note
        });
      }, { signal });
    });

    this._wireTradePolicyForm(pageElement, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }

  _wireTradePolicyForm(pageElement, signal) {
    const tradePolicyForm = pageElement.querySelector('form[data-trade-policy-form]');
    if (!tradePolicyForm) return;

    tradePolicyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(tradePolicyForm);
      const boolKeys = [
        'holonetCreditTransfersEnabled',
        'holonetRequireCreditTransferApproval',
        'holonetItemTradesEnabled',
        'holonetRequireItemTradeApproval',
        'holonetAssetTradesEnabled',
        'holonetRequireAssetTradeApproval',
        'holonetPartyFundEnabled'
      ];
      const numericKeys = ['holonetPartyFundDefaultCutPercent'];

      try {
        for (const key of boolKeys) await game.settings.set(this.host.NS, key, data.get(key) === 'on');
        for (const key of numericKeys) {
          await game.settings.set(this.host.NS, key, Math.max(0, Math.min(100, Math.floor(Number(data.get(key) || 0) || 0))));
        }
        ui?.notifications?.info?.('Trade policy updated.');
        await this.host.render(false);
      } catch (err) {
        SWSELogger.error('[GMTradeConsoleSurfaceController] Failed to save trade policy:', err);
        ui?.notifications?.error?.(`Trade policy update failed: ${err.message}`);
      }
    }, { signal });
  }
}
