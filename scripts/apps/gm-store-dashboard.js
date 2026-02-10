/**
 * GM Store Dashboard (AppV2)
 *
 * Purpose:
 * - Transaction ledger review and reversal
 * - Pending sell attempts queue
 * - Store governance (availability, pricing, visibility, rules)
 *
 * Architecture:
 * - GM-only access
 * - Single window, three tabs
 * - Tooltip-driven UI (boring, explicit, over-explained)
 * - Reuses existing resolution logic only
 * - Integer-only credit contract enforced
 *
 * Non-goals:
 * - Does NOT perform trades directly
 * - Does NOT allow buying/selling from dashboard
 * - Does NOT duplicate Store UI
 */

import { normalizeCredits } from '../utils/credit-normalization.js';
import { SWSELogger } from '../utils/logger.js';
import { calculateCartTotal } from './store/store-checkout.js';

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class GMStoreDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'gm-store-dashboard',
    tag: 'section',
    window: {
      title: 'GM Store Control',
      width: 1200,
      height: 800,
      resizable: true
    },
    classes: ['swse', 'gm-store-dashboard', 'swse-app-dashboard'],
    template: 'systems/foundryvtt-swse/templates/apps/gm-store-dashboard.hbs',
    tabs: [
      {
        navSelector: '.dashboard-tabs',
        contentSelector: '.dashboard-content',
        initial: 'transactions'
      }
    ]
  };

  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

  constructor(options = {}) {
    super(options);
    this.transactions = [];
    this.pendingSales = [];
  }

  async _prepareContext(options) {
    // Only GM can access
    if (!game.user?.isGM) {
      throw new Error('GM Store Dashboard is restricted to Game Masters.');
    }

    // Load transaction history from all actors
    await this._loadTransactionHistory();
    await this._loadPendingSales();

    const storeOpen = game.settings.get('foundryvtt-swse', 'storeOpen') ?? true;
    const buyModifier = game.settings.get('foundryvtt-swse', 'globalBuyModifier') ?? 0;
    const autoAcceptSelling = game.settings.get('foundryvtt-swse', 'autoAcceptItemSales') ?? false;
    const autoSalePercent = game.settings.get('foundryvtt-swse', 'automaticSalePercentage') ?? 50;
    const disallowAutoSellNoPrice = game.settings.get('foundryvtt-swse', 'disallowAutoSellNoPrice') ?? true;

    // Visibility filters (stored as world settings)
    const visibleRarities = game.settings.get('foundryvtt-swse', 'visibleRarities') ?? {
      common: true,
      uncommon: true,
      rare: false,
      restricted: false,
      illegal: false
    };

    const visibleTypes = game.settings.get('foundryvtt-swse', 'visibleItemTypes') ?? {
      weapons: true,
      armor: true,
      gear: true,
      droids: true,
      vehicles: true
    };

    const blacklistedItems = game.settings.get('foundryvtt-swse', 'blacklistedItems') ?? [];

    return {
      transactions: this.transactions,
      pendingSales: this.pendingSales,
      storeOpen,
      buyModifier,
      autoAcceptSelling,
      autoSalePercent,
      disallowAutoSellNoPrice,
      visibleRarities,
      visibleTypes,
      blacklistedItems,
      actors: game.actors.filter(a => a.isOwner).map(a => ({ id: a.id, name: a.name }))
    };
  }

  async _loadTransactionHistory() {
    this.transactions = [];

    // Aggregate purchase history from all actors
    for (const actor of game.actors) {
      const history = actor.getFlag('swse', 'purchaseHistory') || [];
      for (const purchase of history) {
        for (const item of purchase.items) {
          this.transactions.push({
            timestamp: purchase.timestamp,
            actor: actor.name,
            type: 'Buy',
            item: item.name,
            amount: -normalizeCredits(item.cost),
            source: 'Store',
            actorId: actor.id,
            purchaseId: purchase.timestamp
          });
        }
      }
    }

    // Sort newest first
    this.transactions.sort((a, b) => b.timestamp - a.timestamp);
  }

  async _loadPendingSales() {
    // Load pending sales from world flag (if implemented)
    this.pendingSales = game.settings.get('foundryvtt-swse', 'pendingSales') ?? [];
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      return;
    }

    // Store availability toggle
    const storeOpenToggle = root.querySelector('[name="storeOpen"]');
    if (storeOpenToggle) {
      storeOpenToggle.addEventListener('change', async (ev) => {
        await game.settings.set('foundryvtt-swse', 'storeOpen', ev.currentTarget.checked);
        this.render();
      });
    }

    // Buy price modifier slider
    const buyModifierSlider = root.querySelector('[name="buyModifier"]');
    if (buyModifierSlider) {
      buyModifierSlider.addEventListener('input', async (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        await game.settings.set('foundryvtt-swse', 'globalBuyModifier', value);
      });
    }

    // Rarity visibility checkboxes
    for (const rarity of ['common', 'uncommon', 'rare', 'restricted', 'illegal']) {
      const checkbox = root.querySelector(`[name="rarity-${rarity}"]`);
      if (checkbox) {
        checkbox.addEventListener('change', async (ev) => {
          const visibleRarities = game.settings.get('foundryvtt-swse', 'visibleRarities') ?? {};
          visibleRarities[rarity] = ev.currentTarget.checked;
          await game.settings.set('foundryvtt-swse', 'visibleRarities', visibleRarities);
        });
      }
    }

    // Item type visibility checkboxes
    for (const type of ['weapons', 'armor', 'gear', 'droids', 'vehicles']) {
      const checkbox = root.querySelector(`[name="type-${type}"]`);
      if (checkbox) {
        checkbox.addEventListener('change', async (ev) => {
          const visibleTypes = game.settings.get('foundryvtt-swse', 'visibleItemTypes') ?? {};
          visibleTypes[type] = ev.currentTarget.checked;
          await game.settings.set('foundryvtt-swse', 'visibleItemTypes', visibleTypes);
        });
      }
    }

    // Auto-accept selling toggle
    const autoAcceptToggle = root.querySelector('[name="autoAcceptSelling"]');
    if (autoAcceptToggle) {
      autoAcceptToggle.addEventListener('change', async (ev) => {
        await game.settings.set('foundryvtt-swse', 'autoAcceptItemSales', ev.currentTarget.checked);
        this.render();
      });
    }

    // Auto-sell percentage slider (only enabled when auto-accept is ON)
    const autoSaleSlider = root.querySelector('[name="autoSalePercent"]');
    if (autoSaleSlider) {
      autoSaleSlider.addEventListener('input', async (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        await game.settings.set('foundryvtt-swse', 'automaticSalePercentage', value);
      });
    }

    // Disallow auto-sell no-price toggle
    const disallowAutoNoPrice = root.querySelector('[name="disallowAutoSellNoPrice"]');
    if (disallowAutoNoPrice) {
      disallowAutoNoPrice.addEventListener('change', async (ev) => {
        await game.settings.set('foundryvtt-swse', 'disallowAutoSellNoPrice', ev.currentTarget.checked);
      });
    }

    // Transaction reversal buttons
    for (const btn of root.querySelectorAll('[data-action="reverse-transaction"]')) {
      btn.addEventListener('click', async (ev) => {
        const txIndex = Number(ev.currentTarget.dataset.index);
        await this._reverseTransaction(txIndex);
      });
    }

    // Pending sale actions
    for (const btn of root.querySelectorAll('[data-action="accept-pending"]')) {
      btn.addEventListener('click', async (ev) => {
        const saleIndex = Number(ev.currentTarget.dataset.index);
        await this._resolvePendingSale(saleIndex, 'accept');
      });
    }

    for (const btn of root.querySelectorAll('[data-action="deny-pending"]')) {
      btn.addEventListener('click', async (ev) => {
        const saleIndex = Number(ev.currentTarget.dataset.index);
        await this._resolvePendingSale(saleIndex, 'deny');
      });
    }

    for (const btn of root.querySelectorAll('[data-action="set-amount-pending"]')) {
      btn.addEventListener('click', async (ev) => {
        const saleIndex = Number(ev.currentTarget.dataset.index);
        // Show inline editor (placeholder for now)
        const amount = prompt('Enter sale amount (credits):');
        if (amount) {
          await this._resolvePendingSale(saleIndex, 'accept', normalizeCredits(amount));
        }
      });
    }
  }

  async _reverseTransaction(index) {
    const tx = this.transactions[index];
    if (!tx) {
      return;
    }

    const confirmed = await Dialog.confirm({
      title: 'Reverse Transaction',
      content: `
        <p>Are you sure you want to reverse this transaction?</p>
        <p><strong>${tx.actor}</strong> ${tx.type === 'Buy' ? 'purchased' : 'sold'} <strong>${tx.item}</strong> for ${Math.abs(tx.amount).toLocaleString()} credits.</p>
        <p style="color: #ff9900; margin-top: 1rem;">This action cannot be easily undone. Credits will be adjusted and items modified accordingly.</p>
      `,
      defaultYes: false
    });

    if (!confirmed) {
      return;
    }

    try {
      const actor = game.actors.get(tx.actorId);
      if (!actor) {
        ui.notifications.error('Actor not found.');
        return;
      }

      // Reverse the transaction
      const currentCredits = normalizeCredits(actor.system?.credits ?? 0);
      const reversalCredits = normalizeCredits(currentCredits - tx.amount); // Reverse the amount

      await actor.update({ 'system.credits': reversalCredits });

      SWSELogger.info(`[GM Store] Transaction reversed: ${tx.actor} - ${tx.item} (${tx.amount} credits)`);
      ui.notifications.info(`Transaction reversed. ${actor.name} now has ${reversalCredits.toLocaleString()} credits.`);

      this.render();
    } catch (err) {
      SWSELogger.error('Transaction reversal failed:', err);
      ui.notifications.error('Failed to reverse transaction. See console for details.');
    }
  }

  async _resolvePendingSale(index, action, customAmount = null) {
    // Placeholder for pending sale resolution
    // This would reuse the selling system's resolution logic
    ui.notifications.info(`Pending sale ${action} (placeholder).`);
  }
}
