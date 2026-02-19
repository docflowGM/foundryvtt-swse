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
import { prompt as uiPrompt } from '../utils/ui-utils.js';

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
    tabs: [
      {
        navSelector: '.dashboard-tabs',
        contentSelector: '.dashboard-content',
        initial: 'transactions'
      }
    ]
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/gm-store-dashboard.hbs'
    }
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
    this.pendingApprovals = [];
  }

  async _prepareContext(options) {
    // Only GM can access
    if (!game.user?.isGM) {
      throw new Error('GM Store Dashboard is restricted to Game Masters.');
    }

    // Load transaction history from all actors
    await this._loadTransactionHistory();
    await this._loadPendingSales();
    await this._loadPendingApprovals();

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
      pendingApprovals: this.pendingApprovals,
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
      const history = actor.getFlag('foundryvtt-swse', 'purchaseHistory') || [];
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

  async _loadPendingApprovals() {
    // Load pending custom droid/vehicle purchases from world flag
    this.pendingApprovals = game.settings.get('foundryvtt-swse', 'pendingCustomPurchases') ?? [];

    // Enrich each approval with actor name
    for (const approval of this.pendingApprovals) {
      const ownerActor = game.actors.get(approval.ownerActorId);
      approval.ownerActorName = ownerActor?.name || 'Unknown Player';
      approval.timeSubmitted = new Date(approval.requestedAt).toLocaleString();
    }
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
        const amount = await uiPrompt('Sale Amount', 'Enter sale amount (credits):', '');
        if (amount === null) {return;}
        if (amount) {
          await this._resolvePendingSale(saleIndex, 'accept', normalizeCredits(amount));
        }
      });
    }

    // Pending custom purchase approval actions
    for (const btn of root.querySelectorAll('[data-action="preview-approval"]')) {
      btn.addEventListener('click', async (ev) => {
        const approvalIndex = Number(ev.currentTarget.dataset.index);
        await this._previewPendingCustom(approvalIndex);
      });
    }

    for (const btn of root.querySelectorAll('[data-action="edit-approval"]')) {
      btn.addEventListener('click', async (ev) => {
        const approvalIndex = Number(ev.currentTarget.dataset.index);
        await this._editPendingCustom(approvalIndex);
      });
    }

    for (const btn of root.querySelectorAll('[data-action="approve-custom"]')) {
      btn.addEventListener('click', async (ev) => {
        const approvalIndex = Number(ev.currentTarget.dataset.index);
        await this._approvePendingCustom(approvalIndex);
      });
    }

    for (const btn of root.querySelectorAll('[data-action="deny-custom"]')) {
      btn.addEventListener('click', async (ev) => {
        const approvalIndex = Number(ev.currentTarget.dataset.index);
        await this._denyPendingCustom(approvalIndex);
      });
    }
  }

  async _reverseTransaction(index) {
    const tx = this.transactions[index];
    if (!tx) {
      return;
    }

    const confirmed = await SWSEDialogV2.confirm({
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

  /**
   * Preview a pending custom droid/vehicle (read-only actor sheet)
   */
  async _previewPendingCustom(index) {
    const approval = this.pendingApprovals[index];
    if (!approval) return;

    const draftActor = game.actors.get(approval.draftActorId);
    if (!draftActor) {
      ui.notifications.error('Draft actor not found.');
      return;
    }

    // Mark as preview-mode so sheet renders read-only
    this.previewingApprovalId = approval.id;
    draftActor.sheet.render(true);
  }

  /**
   * Edit a pending custom droid/vehicle (open in chargen if droid)
   */
  async _editPendingCustom(index) {
    const approval = this.pendingApprovals[index];
    if (!approval) return;

    if (approval.type === 'droid' && approval.chargenSnapshot) {
      // Re-launch CharGen with edit mode
      const CharacterGenerator = (await import('../chargen/chargen-main.js')).default;
      const chargen = new CharacterGenerator(null, {
        droidBuilderMode: true,
        editMode: true,
        editSnapshot: approval.chargenSnapshot,
        ownerActor: game.actors.get(approval.ownerActorId),
        doidConstructionCredits: approval.costCredits,
        approvalRequestId: approval.id
      });
      chargen.render(true);
    } else if (approval.type === 'vehicle') {
      ui.notifications.info('Vehicle modification editing not yet implemented.');
    }
  }

  /**
   * Approve a pending custom droid/vehicle purchase
   * Deducts credits, transfers actor ownership, removes draft flags
   */
  async _approvePendingCustom(index) {
    const approval = this.pendingApprovals[index];
    if (!approval) return;

    const ownerActor = game.actors.get(approval.ownerActorId);
    if (!ownerActor) {
      ui.notifications.error('Owner actor not found.');
      return;
    }

    // Confirm approval
    const confirmed = await SWSEDialogV2.confirm({
      title: 'Approve Custom ' + (approval.type === 'droid' ? 'Droid' : 'Vehicle'),
      content: `
        <p><strong>${approval.draftData.name}</strong></p>
        <p>For: ${ownerActor.name}</p>
        <p>Cost: <strong>${approval.costCredits.toLocaleString()} credits</strong></p>
        <p>Approve this purchase?</p>
      `,
      defaultYes: false
    });

    if (!confirmed) return;

    try {
      // 1. Validate credits
      const currentCredits = normalizeCredits(ownerActor.system?.credits ?? 0);
      if (currentCredits < approval.costCredits) {
        ui.notifications.warn(`Insufficient credits. ${ownerActor.name} has ${currentCredits.toLocaleString()} but needs ${approval.costCredits.toLocaleString()}.`);
        return;
      }

      // 2. Deduct credits
      const newCredits = normalizeCredits(currentCredits - approval.costCredits);
      await ownerActor.update({ 'system.credits': newCredits });

      // 3. Transfer draft actor to owner
      const draftActor = game.actors.get(approval.draftActorId);
      if (draftActor) {
        // Set ownership to the player who owns the character
        const ownerUser = game.users.find(u => u.character?.id === ownerActor.id);
        const ownership = { default: 0 };
        if (ownerUser) {
          ownership[ownerUser.id] = 3;  // Owner level
        }
        // Also grant GM ownership
        ownership[game.user.id] = 3;

        await draftActor.update({ ownership });

        // Remove draft flags
        await draftActor.unsetFlag('foundryvtt-swse', 'pendingApproval');
        await draftActor.unsetFlag('foundryvtt-swse', 'draftOnly');
        await draftActor.unsetFlag('foundryvtt-swse', 'ownerPlayerId');
      }

      // 4. Log transaction
      const history = ownerActor.getFlag('foundryvtt-swse', 'purchaseHistory') || [];
      const purchase = {
        timestamp: Date.now(),
        items: [],
        droids: approval.type === 'droid' ? [{
          id: approval.draftActorId,
          name: approval.draftData.name,
          cost: approval.costCredits
        }] : [],
        vehicles: approval.type === 'vehicle' ? [{
          id: approval.draftActorId,
          name: approval.draftData.name,
          cost: approval.costCredits
        }] : [],
        total: approval.costCredits,
        source: 'Store - Custom ' + (approval.type === 'droid' ? 'Droid' : 'Vehicle') + ' Approval'
      };
      history.push(purchase);
      await ownerActor.setFlag('foundryvtt-swse', 'purchaseHistory', history);

      // 5. Remove from pending queue
      const pendingPurchases = game.settings.get('foundryvtt-swse', 'pendingCustomPurchases') || [];
      pendingPurchases.splice(index, 1);
      await game.settings.set('foundryvtt-swse', 'pendingCustomPurchases', pendingPurchases);

      ui.notifications.info(`Approved: ${approval.draftData.name} for ${ownerActor.name}`);
      SWSELogger.log('SWSE Store | Custom purchase approved:', approval);
      this.render();
    } catch (err) {
      SWSELogger.error('Failed to approve custom purchase:', err);
      ui.notifications.error('Approval failed. See console for details.');
    }
  }

  /**
   * Deny a pending custom droid/vehicle purchase
   * Deletes draft actor, removes from queue
   */
  async _denyPendingCustom(index) {
    const approval = this.pendingApprovals[index];
    if (!approval) return;

    const confirmed = await SWSEDialogV2.confirm({
      title: 'Deny Custom ' + (approval.type === 'droid' ? 'Droid' : 'Vehicle'),
      content: `
        <p><strong>${approval.draftData.name}</strong></p>
        <p>Deny this purchase? It will be deleted permanently.</p>
      `,
      defaultYes: false
    });

    if (!confirmed) return;

    try {
      // Delete draft actor
      const draftActor = game.actors.get(approval.draftActorId);
      if (draftActor) {
        await draftActor.delete();
      }

      // Remove from pending queue
      const pendingPurchases = game.settings.get('foundryvtt-swse', 'pendingCustomPurchases') || [];
      pendingPurchases.splice(index, 1);
      await game.settings.set('foundryvtt-swse', 'pendingCustomPurchases', pendingPurchases);

      ui.notifications.info(`Denied: ${approval.draftData.name}`);
      SWSELogger.log('SWSE Store | Custom purchase denied:', approval);
      this.render();
    } catch (err) {
      SWSELogger.error('Failed to deny custom purchase:', err);
      ui.notifications.error('Denial failed. See console for details.');
    }
  }
}
