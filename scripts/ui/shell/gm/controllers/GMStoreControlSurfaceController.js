/**
 * GMStoreControlSurfaceController
 *
 * Owns GM Store Control surface wiring plus page-local tab/filter and
 * inventory-policy editing behavior. Purchase/sale settlement and rollback still
 * stay on the GM Datapad host and canonical store services.
 */

import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';
import { normalizeCredits } from '/systems/foundryvtt-swse/scripts/utils/credit-normalization.js';
import { GMStoreOperationsService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMStoreOperationsService.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { mutateAndRepaint, mutateShellOnly } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';

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

    this._activateStoreTab(pageElement, this.host.currentTab || 'options');
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
        this.host.patchSurfaceState?.('store', { currentTab: tabId }, { render: false });
        this._activateStoreTab(pageElement, tabId);
      }, { signal });
    }
  }

  async _render(reason = 'gm-store-render') {
    await (requestShellRender(this.host, { reason, surfaceId: 'store' }));
  }

  async _mutate(mutation, reason = 'gm-store-mutation') {
    return mutateShellOnly(this.host, mutation, { reason, surfaceId: 'store' });
  }

  async _mutateAndRender(mutation, reason = 'gm-store-mutation') {
    return mutateAndRepaint(this.host, mutation, { reason, surfaceId: 'store' });
  }

  _wireStoreOptions(pageElement, signal) {
    const storeOpenToggle = pageElement.querySelector('[name="storeOpen"]');
    if (storeOpenToggle) {
      storeOpenToggle.addEventListener('change', async (ev) => {
        await this._mutateAndRender(() => HouseRuleService.set('storeOpen', ev.currentTarget.checked), 'gm-store-open-toggle');
      }, { signal });
    }

    const storeMarkupSlider = pageElement.querySelector('[name="storeMarkup"]');
    if (storeMarkupSlider) {
      const commitMarkup = async (input) => {
        const value = normalizeCredits(input.value);
        await this._mutate(async () => {
          await HouseRuleService.set('storeMarkup', value);
          await HouseRuleService.set('globalBuyModifier', value);
        }, 'gm-store-markup-commit');
        this.host.patchSurfaceState?.('store', { storeMarkup: value }, { render: false });
      };
      storeMarkupSlider.addEventListener('input', (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        const valueLabel = pageElement.querySelector('[data-store-markup-value]');
        if (valueLabel) valueLabel.textContent = `${value}%`;
        this.host.patchSurfaceState?.('store', { storeMarkup: value }, { render: false });
      }, { signal });
      storeMarkupSlider.addEventListener('change', async (ev) => commitMarkup(ev.currentTarget), { signal });
      storeMarkupSlider.addEventListener('blur', async (ev) => commitMarkup(ev.currentTarget), { signal });
    }

    const storeDiscountSlider = pageElement.querySelector('[name="storeDiscount"]');
    if (storeDiscountSlider) {
      const commitDiscount = async (input) => {
        const value = normalizeCredits(input.value);
        await this._mutate(() => HouseRuleService.set('storeDiscount', value), 'gm-store-discount-commit');
        this.host.patchSurfaceState?.('store', { storeDiscount: value }, { render: false });
      };
      storeDiscountSlider.addEventListener('input', (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        const valueLabel = pageElement.querySelector('[data-store-discount-value]');
        if (valueLabel) valueLabel.textContent = `${value}%`;
        this.host.patchSurfaceState?.('store', { storeDiscount: value }, { render: false });
      }, { signal });
      storeDiscountSlider.addEventListener('change', async (ev) => commitDiscount(ev.currentTarget), { signal });
      storeDiscountSlider.addEventListener('blur', async (ev) => commitDiscount(ev.currentTarget), { signal });
    }

    for (const rarity of ['standard', 'licensed', 'rare', 'restricted', 'military', 'illegal', 'common', 'uncommon']) {
      const checkbox = pageElement.querySelector(`[name="availability-${rarity}"]`);
      if (!checkbox) continue;
      checkbox.addEventListener('change', async (ev) => {
        const visibleRarities = SettingsHelper.getObject('visibleRarities', {});
        visibleRarities[rarity] = ev.currentTarget.checked;
        await this._mutate(() => SettingsHelper.set('visibleRarities', visibleRarities), 'gm-store-visible-rarities');
      }, { signal });
    }

    for (const type of ['weapons', 'armor', 'gear', 'droids', 'vehicles']) {
      const checkbox = pageElement.querySelector(`[name="type-${type}"]`);
      if (!checkbox) continue;
      checkbox.addEventListener('change', async (ev) => {
        const visibleTypes = SettingsHelper.getObject('visibleItemTypes', {});
        visibleTypes[type] = ev.currentTarget.checked;
        await this._mutate(() => SettingsHelper.set('visibleItemTypes', visibleTypes), 'gm-store-visible-item-types');
      }, { signal });
    }

    const autoAcceptToggle = pageElement.querySelector('[name="autoAcceptSelling"]');
    if (autoAcceptToggle) {
      autoAcceptToggle.addEventListener('change', async (ev) => {
        await this._mutateAndRender(() => HouseRuleService.set('autoAcceptItemSales', ev.currentTarget.checked), 'gm-store-auto-accept-toggle');
      }, { signal });
    }

    const autoSaleSlider = pageElement.querySelector('[name="autoSalePercent"]');
    if (autoSaleSlider) {
      const commitAutoSale = async (input) => {
        const value = normalizeCredits(input.value);
        await this._mutate(() => HouseRuleService.set('automaticSalePercentage', value), 'gm-store-auto-sale-commit');
        this.host.patchSurfaceState?.('store', { automaticSalePercentage: value }, { render: false });
      };
      autoSaleSlider.addEventListener('input', (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        const valueLabel = pageElement.querySelector('[data-auto-sale-value]');
        if (valueLabel) valueLabel.textContent = `${value}%`;
        this.host.patchSurfaceState?.('store', { automaticSalePercentage: value }, { render: false });
      }, { signal });
      autoSaleSlider.addEventListener('change', async (ev) => commitAutoSale(ev.currentTarget), { signal });
      autoSaleSlider.addEventListener('blur', async (ev) => commitAutoSale(ev.currentTarget), { signal });
    }

    const disallowToggle = pageElement.querySelector('[name="disallowAutoSellNoPrice"]');
    if (disallowToggle) {
      disallowToggle.addEventListener('change', async (ev) => {
        await this._mutateAndRender(() => HouseRuleService.set('disallowAutoSellNoPrice', ev.currentTarget.checked), 'gm-store-disallow-no-price');
      }, { signal });
    }
  }

  _wireRollbackControls(pageElement, signal) {
    for (const btn of pageElement.querySelectorAll('[data-action="rollback-transaction"], [data-action="reverse-transaction"]')) {
      btn.addEventListener('click', async (ev) => {
        const index = Number(ev.currentTarget.dataset.index);
        await GMStoreOperationsService.rollbackTransaction(index, {
          transactions: this.host.transactions,
          render: () => this._render('gm-store-rollback')
        });
      }, { signal });
    }
  }

  _wireInventoryPolicyControls(pageElement, signal) {
    for (const input of pageElement.querySelectorAll('[data-store-inventory-filter]')) {
      input.addEventListener('input', () => this._filterStoreInventoryRows(pageElement), { signal });
      input.addEventListener('change', () => this._filterStoreInventoryRows(pageElement), { signal });
    }

    for (const input of pageElement.querySelectorAll('[data-store-policy-field]')) {
      input.addEventListener('change', async (ev) => {
        await this._updateStoreInventoryPolicy(ev.currentTarget);
        this._filterStoreInventoryRows(pageElement);
      }, { signal });
    }
  }


  _activateStoreTab(pageElement, tabId) {
    for (const btn of pageElement.querySelectorAll('[data-store-tab]')) {
      const active = btn.dataset.storeTab === tabId;
      btn.classList.toggle('active', active);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }

    for (const panel of pageElement.querySelectorAll('[data-store-tab-panel]')) {
      const active = panel.dataset.storeTabPanel === tabId;
      panel.classList.toggle('active', active);
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    }
  }

  _filterStoreInventoryRows(pageElement) {
    const query = (pageElement.querySelector('[data-store-inventory-filter="search"]')?.value || '').trim().toLowerCase();
    const type = pageElement.querySelector('[data-store-inventory-filter="type"]')?.value || '';
    const availability = pageElement.querySelector('[data-store-inventory-filter="availability"]')?.value || '';
    const visibility = pageElement.querySelector('[data-store-inventory-filter="visibility"]')?.value || '';

    for (const row of pageElement.querySelectorAll('[data-store-inventory-row]')) {
      const visibleCheckbox = row.querySelector('[data-store-policy-field="visible"]');
      const availableCheckbox = row.querySelector('[data-store-policy-field="available"]');
      const isVisible = visibleCheckbox ? visibleCheckbox.checked : row.dataset.visible === 'true';
      const isAvailable = availableCheckbox ? availableCheckbox.checked : row.dataset.available === 'true';

      const matchesQuery = !query || (row.dataset.search || '').includes(query);
      const matchesType = !type || row.dataset.type === type;
      const matchesAvailability = !availability || row.dataset.availability === availability;
      const matchesVisibility = !visibility
        || (visibility === 'visible' && isVisible)
        || (visibility === 'hidden' && !isVisible)
        || (visibility === 'available' && isAvailable)
        || (visibility === 'unavailable' && !isAvailable)
        || (visibility === 'overridden' && row.querySelector('[data-store-policy-field="overridePrice"]')?.value !== '');

      row.hidden = !(matchesQuery && matchesType && matchesAvailability && matchesVisibility);
    }
  }

  async _updateStoreInventoryPolicy(input) {
    const itemId = input.dataset.itemId;
    const field = input.dataset.storePolicyField;
    if (!itemId || !field) return;

    const policies = SettingsHelper.getObject('storeInventoryPolicies', {});
    const policy = { ...(policies[itemId] || {}) };

    if (['visible', 'available', 'trackQuantity', 'requiresApproval'].includes(field)) {
      policy[field] = input.checked === true;
    } else if (field === 'quantity' || field === 'overridePrice') {
      const raw = String(input.value ?? '').trim();
      policy[field] = raw === '' ? null : Math.max(0, normalizeCredits(raw));
    } else if (field === 'notes') {
      policy[field] = String(input.value ?? '').trim();
    } else {
      return;
    }

    policy.updatedAt = Date.now();
    policy.updatedBy = game.user?.id || null;
    policies[itemId] = policy;

    await this._mutate(() => SettingsHelper.set('storeInventoryPolicies', policies), 'gm-store-inventory-policy');
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

        await GMStoreOperationsService.resolvePendingSaleRequest(requestId, {
          decision: action === 'deny-sale-request' ? 'deny' : (action === 'counteroffer-sale-request' ? 'counteroffer' : 'approve'),
          amount,
          reason
        }, {
          render: () => this._render('gm-store-sale-resolution')
        });
      }, { signal });
    }
  }
}
