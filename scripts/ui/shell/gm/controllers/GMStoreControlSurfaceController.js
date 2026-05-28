/**
 * GMStoreControlSurfaceController
 *
 * Owns DOM wiring for the GM Store Control surface. Store purchase/sale,
 * rollback, and inventory policy mutations stay on the GM Datapad host and
 * canonical store services.
 */

import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';
import { normalizeCredits } from '/systems/foundryvtt-swse/scripts/utils/credit-normalization.js';

export class GMStoreControlSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-store');
    if (!pageElement) return;

    this.host._activateStoreTab(pageElement, this.host.currentTab || 'options');
    this._wireTabs(pageElement, signal);
    this._wireStoreOptions(pageElement, signal);
    this._wireRollbackControls(pageElement, signal);
    this._wireInventoryPolicyControls(pageElement, signal);
    this._wirePendingSaleControls(pageElement, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }

  _wireTabs(pageElement, signal) {
    for (const btn of pageElement.querySelectorAll('[data-store-tab]')) {
      btn.addEventListener('click', (ev) => {
        const tabId = ev.currentTarget.dataset.storeTab;
        if (!tabId) return;
        this.host.currentTab = tabId;
        this.host._activateStoreTab(pageElement, tabId);
      }, { signal });
    }
  }

  _wireStoreOptions(pageElement, signal) {
    const storeOpenToggle = pageElement.querySelector('[name="storeOpen"]');
    if (storeOpenToggle) {
      storeOpenToggle.addEventListener('change', async (ev) => {
        await HouseRuleService.set('storeOpen', ev.currentTarget.checked);
        this.host.render(false);
      }, { signal });
    }

    const storeMarkupSlider = pageElement.querySelector('[name="storeMarkup"]');
    if (storeMarkupSlider) {
      storeMarkupSlider.addEventListener('input', async (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        const valueLabel = pageElement.querySelector('[data-store-markup-value]');
        if (valueLabel) valueLabel.textContent = `${value}%`;
        await HouseRuleService.set('storeMarkup', value);
        await HouseRuleService.set('globalBuyModifier', value);
      }, { signal });
    }

    const storeDiscountSlider = pageElement.querySelector('[name="storeDiscount"]');
    if (storeDiscountSlider) {
      storeDiscountSlider.addEventListener('input', async (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        const valueLabel = pageElement.querySelector('[data-store-discount-value]');
        if (valueLabel) valueLabel.textContent = `${value}%`;
        await HouseRuleService.set('storeDiscount', value);
      }, { signal });
    }

    for (const rarity of ['standard', 'licensed', 'rare', 'restricted', 'military', 'illegal', 'common', 'uncommon']) {
      const checkbox = pageElement.querySelector(`[name="availability-${rarity}"]`);
      if (!checkbox) continue;
      checkbox.addEventListener('change', async (ev) => {
        const visibleRarities = SettingsHelper.getObject('visibleRarities', {});
        visibleRarities[rarity] = ev.currentTarget.checked;
        await SettingsHelper.set('visibleRarities', visibleRarities);
      }, { signal });
    }

    for (const type of ['weapons', 'armor', 'gear', 'droids', 'vehicles']) {
      const checkbox = pageElement.querySelector(`[name="type-${type}"]`);
      if (!checkbox) continue;
      checkbox.addEventListener('change', async (ev) => {
        const visibleTypes = SettingsHelper.getObject('visibleItemTypes', {});
        visibleTypes[type] = ev.currentTarget.checked;
        await SettingsHelper.set('visibleItemTypes', visibleTypes);
      }, { signal });
    }

    const autoAcceptToggle = pageElement.querySelector('[name="autoAcceptSelling"]');
    if (autoAcceptToggle) {
      autoAcceptToggle.addEventListener('change', async (ev) => {
        await HouseRuleService.set('autoAcceptItemSales', ev.currentTarget.checked);
        this.host.render(false);
      }, { signal });
    }

    const autoSaleSlider = pageElement.querySelector('[name="autoSalePercent"]');
    if (autoSaleSlider) {
      autoSaleSlider.addEventListener('input', async (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        const valueLabel = pageElement.querySelector('[data-auto-sale-value]');
        if (valueLabel) valueLabel.textContent = `${value}%`;
        await HouseRuleService.set('automaticSalePercentage', value);
      }, { signal });
    }

    const disallowToggle = pageElement.querySelector('[name="disallowAutoSellNoPrice"]');
    if (disallowToggle) {
      disallowToggle.addEventListener('change', async (ev) => {
        await HouseRuleService.set('disallowAutoSellNoPrice', ev.currentTarget.checked);
      }, { signal });
    }
  }

  _wireRollbackControls(pageElement, signal) {
    for (const btn of pageElement.querySelectorAll('[data-action="rollback-transaction"], [data-action="reverse-transaction"]')) {
      btn.addEventListener('click', async (ev) => {
        const index = Number(ev.currentTarget.dataset.index);
        await this.host._rollbackTransaction(index);
      }, { signal });
    }
  }

  _wireInventoryPolicyControls(pageElement, signal) {
    for (const input of pageElement.querySelectorAll('[data-store-inventory-filter]')) {
      input.addEventListener('input', () => this.host._filterStoreInventoryRows(pageElement), { signal });
      input.addEventListener('change', () => this.host._filterStoreInventoryRows(pageElement), { signal });
    }

    for (const input of pageElement.querySelectorAll('[data-store-policy-field]')) {
      input.addEventListener('change', async (ev) => {
        await this.host._updateStoreInventoryPolicy(ev.currentTarget);
        this.host._filterStoreInventoryRows(pageElement);
      }, { signal });
    }
  }

  _wirePendingSaleControls(pageElement, signal) {
    const selector = '[data-action="approve-sale-request"], [data-action="counteroffer-sale-request"], [data-action="deny-sale-request"]';
    for (const btn of pageElement.querySelectorAll(selector)) {
      btn.addEventListener('click', async (ev) => {
        const action = ev.currentTarget.dataset.action;
        const requestId = ev.currentTarget.dataset.requestId;
        const card = ev.currentTarget.closest('[data-sale-request-id]');
        const amountField = card?.querySelector('[data-sale-custom-amount]');
        const reasonField = card?.querySelector('[data-sale-reason]');
        const reason = String(reasonField?.value ?? '').trim();
        let amount = null;

        if (action === 'approve-sale-request') {
          const defaultAmount = ev.currentTarget.dataset.defaultAmount;
          amount = defaultAmount ? normalizeCredits(defaultAmount) : normalizeCredits(amountField?.value ?? 0);
        } else if (action === 'counteroffer-sale-request') {
          amount = normalizeCredits(amountField?.value ?? 0);
          if (!(amount > 0)) {
            ui?.notifications?.warn?.('Enter a custom sale amount before approving a counteroffer.');
            return;
          }
        }

        await this.host._resolvePendingSaleRequest(requestId, {
          decision: action === 'deny-sale-request' ? 'deny' : (action === 'counteroffer-sale-request' ? 'counteroffer' : 'approve'),
          amount,
          reason
        });
      }, { signal });
    }
  }
}
