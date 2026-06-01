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

import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { calculateCartTotal } from "/systems/foundryvtt-swse/scripts/apps/store/store-checkout.js";
import { prompt as uiPrompt } from "/systems/foundryvtt-swse/scripts/utils/ui-utils.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";

export class GMStoreDashboard extends BaseSWSEAppV2 {
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

  _findPendingApprovalIndex(approval = {}, fallbackIndex = -1) {
    const pendingPurchases = SettingsHelper.getArray('pendingCustomPurchases', []);
    const id = String(approval?.id || '').trim();
    if (id) {
      const byId = pendingPurchases.findIndex((entry) => String(entry?.id || '').trim() === id);
      if (byId >= 0) return { index: byId, queue: pendingPurchases };
    }
    if (fallbackIndex >= 0 && fallbackIndex < pendingPurchases.length) return { index: fallbackIndex, queue: pendingPurchases };
    return { index: -1, queue: pendingPurchases };
  }

  async _removePendingApproval(approval = {}, fallbackIndex = -1) {
    const { index, queue } = this._findPendingApprovalIndex(approval, fallbackIndex);
    if (index < 0) return false;
    queue.splice(index, 1);
    await HouseRuleService.set('pendingCustomPurchases', queue);
    return true;
  }

  _approvalModSummary(approval = {}) {
    const build = approval.modificationData ?? approval.buildSpec ?? {};
    const mods = Array.isArray(build.modifications) ? build.modifications : [];
    return mods.map((mod) => ({
      id: mod?.id ?? null,
      name: mod?.name ?? mod?.id ?? 'Modification',
      category: mod?.category ?? null,
      ep: normalizeCredits(mod?.emplacementPoints ?? mod?.ep ?? 0),
      cost: normalizeCredits(mod?.finalCost ?? mod?.cost ?? 0),
      nonstandard: !!mod?.nonstandard,
      availability: mod?.availability ?? mod?.avail ?? null
    }));
  }

  _buildApprovalAudit(approval = {}, draftActor = null, assetName = 'Custom asset', cost = 0) {
    const build = approval.modificationData ?? approval.buildSpec ?? {};
    const stockShip = build.stockShip ?? approval.stockShip ?? null;
    const modifications = this._approvalModSummary(approval);
    return {
      approvalId: approval.id ?? null,
      approvalType: approval.type ?? draftActor?.type,
      draftActorId: approval.draftActorId,
      itemName: assetName,
      itemNames: [assetName],
      itemCount: 1,
      source: 'Store - Custom ' + (approval.type === 'droid' ? 'Droid' : 'Vehicle') + ' Approval',
      gmNotes: approval.metadata?.gmNotes ?? '',
      ownerPlayerId: approval.ownerPlayerId ?? null,
      approvalReason: approval.metadata?.approvalReason ?? approval.approvalReason ?? null,
      shipyard: stockShip ? {
        frameName: stockShip.name ?? approval.vehicleTemplateName ?? null,
        frameCost: normalizeCredits(stockShip.cost ?? 0),
        unusedEmplacementPoints: normalizeCredits(stockShip.unusedEmplacementPoints ?? stockShip.unusedEP ?? 0),
        modifications,
        modificationCost: modifications.reduce((sum, mod) => sum + normalizeCredits(mod.cost), 0),
        totalCost: normalizeCredits(cost)
      } : null
    };
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

    const storeOpen = SettingsHelper.getSafe('storeOpen', true);
    const buyModifier = SettingsHelper.getSafe('globalBuyModifier', 0);
    const autoAcceptSelling = SettingsHelper.getSafe('autoAcceptItemSales', false);
    const autoSalePercent = SettingsHelper.getSafe('automaticSalePercentage', 50);
    const disallowAutoSellNoPrice = SettingsHelper.getSafe('disallowAutoSellNoPrice', true);

    // Visibility filters (stored as world settings)
    const visibleRarities = SettingsHelper.getObject('visibleRarities', {
      common: true,
      uncommon: true,
      rare: false,
      restricted: false,
      illegal: false
    });

    const visibleTypes = SettingsHelper.getObject('visibleItemTypes', {
      weapons: true,
      armor: true,
      gear: true,
      droids: true,
      vehicles: true
    });

    const blacklistedItems = SettingsHelper.getArray('blacklistedItems', []);

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
    this.transactions = TransactionEngine.getAllTransactions({ includeZeroCost: false })
      .map((tx) => ({
        transactionId: tx.transactionId || tx.id,
        timestamp: tx.timestamp,
        actor: tx.actorName || 'Unknown Actor',
        type: tx.type || 'Transaction',
        item: tx.itemName || 'Credit Transaction',
        amount: normalizeCredits(tx.amount ?? 0),
        source: tx.source || tx.context || 'TransactionEngine',
        actorId: tx.actorId,
        purchaseId: tx.transactionId || tx.id,
        context: tx.context
      }))
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  }

  async _loadPendingSales() {
    // Load pending sales from world flag (if implemented)
    this.pendingSales = SettingsHelper.getArray('pendingSales', []);
  }

  async _loadPendingApprovals() {
    // Load pending custom droid/vehicle purchases from world flag
    this.pendingApprovals = SettingsHelper.getArray('pendingCustomPurchases', []);

    // Enrich each approval with review/ledger information so the GM can make a safe decision.
    for (const approval of this.pendingApprovals) {
      const ownerActor = game.actors.get(approval.ownerActorId);
      const draftActor = game.actors.get(approval.draftActorId);
      const build = approval.modificationData ?? approval.buildSpec ?? {};
      const stockShip = build.stockShip ?? approval.stockShip ?? {};
      const modifications = Array.isArray(build.modifications) ? build.modifications : [];
      const currentCredits = ownerActor ? normalizeCredits(LedgerService.getCurrentCredits(ownerActor)) : 0;
      const cost = normalizeCredits(approval.costCredits ?? 0);
      const epAvailable = Number(stockShip.unusedEmplacementPoints ?? stockShip.unusedEP ?? 0) || 0;
      const epUsed = modifications.reduce((sum, mod) => sum + (Number(mod?.emplacementPoints ?? mod?.ep ?? 0) || 0), 0);
      approval.ownerActorName = ownerActor?.name || approval.ownerActorName || 'Unknown Player';
      approval.assetName = approval.draftData?.name || draftActor?.name || 'Custom asset';
      approval.timeSubmitted = approval.requestedAt ? new Date(approval.requestedAt).toLocaleString() : (approval.timeSubmitted || '—');
      approval.costLabel = `${cost.toLocaleString()} cr`;
      approval.currentCreditsLabel = `${currentCredits.toLocaleString()} cr`;
      approval.afterCreditsLabel = `${(currentCredits - cost).toLocaleString()} cr`;
      approval.canApprove = Boolean(ownerActor && draftActor && currentCredits >= cost);
      approval.reviewWarning = !ownerActor
        ? 'Owner actor missing.'
        : !draftActor
          ? 'Draft asset actor missing.'
          : currentCredits < cost
            ? `Insufficient credits: ${ownerActor.name} has ${currentCredits.toLocaleString()} cr.`
            : '';
      approval.frameLabel = stockShip.name ?? approval.vehicleTemplateName ?? approval.draftData?.baseTemplate ?? '';
      approval.modificationSummary = modifications.length
        ? modifications.map((mod) => `${mod?.name ?? mod?.id ?? 'Modification'} (${mod?.emplacementPoints ?? mod?.ep ?? 0} EP, ${normalizeCredits(mod?.finalCost ?? mod?.cost ?? 0).toLocaleString()} cr${mod?.nonstandard ? ', nonstandard ×5' : ''})`).join('
')
        : (approval.draftData?.details || 'No modification details recorded.');
      approval.epSummary = approval.type === 'vehicle' && epAvailable
        ? `${epUsed}/${epAvailable} EP used`
        : '';
      approval.approvalReason = approval.metadata?.approvalReason ?? approval.approvalReason ?? '';
    }
  }

  async _onRender(context, options) {
    // Phase 3: Enforce super._onRender call (AppV2 contract)
    await super._onRender(context, options);

    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      return;
    }

    // Store availability toggle
    const storeOpenToggle = root.querySelector('[name="storeOpen"]');
    if (storeOpenToggle) {
      storeOpenToggle.addEventListener('change', async (ev) => {
        await HouseRuleService.set('storeOpen', ev.currentTarget.checked);
        this.render();
      });
    }

    // Buy price modifier slider
    const buyModifierSlider = root.querySelector('[name="buyModifier"]');
    if (buyModifierSlider) {
      buyModifierSlider.addEventListener('input', async (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        await HouseRuleService.set('globalBuyModifier', value);
      });
    }

    // Rarity visibility checkboxes
    for (const rarity of ['common', 'uncommon', 'rare', 'restricted', 'illegal']) {
      const checkbox = root.querySelector(`[name="rarity-${rarity}"]`);
      if (checkbox) {
        checkbox.addEventListener('change', async (ev) => {
          const visibleRarities = SettingsHelper.getObject('visibleRarities', {});
          visibleRarities[rarity] = ev.currentTarget.checked;
          await HouseRuleService.set('visibleRarities', visibleRarities);
        });
      }
    }

    // Item type visibility checkboxes
    for (const type of ['weapons', 'armor', 'gear', 'droids', 'vehicles']) {
      const checkbox = root.querySelector(`[name="type-${type}"]`);
      if (checkbox) {
        checkbox.addEventListener('change', async (ev) => {
          const visibleTypes = SettingsHelper.getObject('visibleItemTypes', {});
          visibleTypes[type] = ev.currentTarget.checked;
          await HouseRuleService.set('visibleItemTypes', visibleTypes);
        });
      }
    }

    // Auto-accept selling toggle
    const autoAcceptToggle = root.querySelector('[name="autoAcceptSelling"]');
    if (autoAcceptToggle) {
      autoAcceptToggle.addEventListener('change', async (ev) => {
        await HouseRuleService.set('autoAcceptItemSales', ev.currentTarget.checked);
        this.render();
      });
    }

    // Auto-sell percentage slider (only enabled when auto-accept is ON)
    const autoSaleSlider = root.querySelector('[name="autoSalePercent"]');
    if (autoSaleSlider) {
      autoSaleSlider.addEventListener('input', async (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        await HouseRuleService.set('automaticSalePercentage', value);
      });
    }

    // Disallow auto-sell no-price toggle
    const disallowAutoNoPrice = root.querySelector('[name="disallowAutoSellNoPrice"]');
    if (disallowAutoNoPrice) {
      disallowAutoNoPrice.addEventListener('change', async (ev) => {
        await HouseRuleService.set('disallowAutoSellNoPrice', ev.currentTarget.checked);
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
      title: 'Adjust Credits for Transaction',
      content: `
        <p>Correct the credit balance for this transaction?</p>
        <p><strong>${tx.actor}</strong> ${tx.type === 'Buy' ? 'purchased' : 'sold'} <strong>${tx.item}</strong> for ${Math.abs(tx.amount).toLocaleString()} credits.</p>
        <p style="color: #ff9900; margin-top: 1rem;"><strong>⚠ Ledger Correction Only:</strong> This adjusts the actor's credits only. Inventory items are not restored or removed. Use this to correct credit mistakes only.</p>
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

      const result = await TransactionEngine.executeCreditAdjustment({
        actor,
        amount: normalizeCredits(0 - Number(tx.amount || 0)),
        reason: 'GM store dashboard credit correction',
        transactionContext: 'store-rollback-correction',
        audit: {
          sourceTransactionId: tx.transactionId || tx.purchaseId,
          sourceContext: tx.context,
          sourceItem: tx.item,
          sourceAmount: tx.amount,
          source: 'Legacy GM Store Dashboard Rollback'
        }
      }, {
        source: 'GMStoreDashboard._reverseTransaction',
        validate: true,
        rederive: true
      });

      if (!result.success) {
        ui.notifications.error(`Failed to adjust credits: ${result.error}`);
        return;
      }

      SWSELogger.info(`[GM Store] TransactionEngine credit correction: ${tx.actor} - ${tx.item} (${tx.amount} credits)`);
      ui.notifications.info(`Credit correction recorded for ${actor.name}.`);

      this.render();
    } catch (err) {
      SWSELogger.error('Credit adjustment failed:', err);
      ui.notifications.error('Failed to adjust credits. See console for details.');
    }
  }

  async _resolvePendingSale(index, action, customAmount = null) {
    const pendingSales = SettingsHelper.getArray('pendingSales', []);
    const request = pendingSales[index];
    if (!request) {
      ui.notifications.error('Pending sale request not found.');
      return;
    }

    if (action === 'deny') {
      pendingSales.splice(index, 1);
      await SettingsHelper.set('pendingSales', pendingSales);
      const actor = game.actors.get(request.actorId);
      Hooks.callAll?.('swseStoreSaleDenied', {
        request,
        actor,
        decidedBy: game.user?.name ?? 'GM',
        reason: 'Denied from legacy GM Store Dashboard'
      });
      this.render();
      return;
    }

    const actor = game.actors.get(request.actorId);
    const item = actor?.items?.get?.(request.itemId);
    if (!actor || !item) {
      ui.notifications.error('Cannot approve sale: actor or owned item no longer exists.');
      return;
    }

    const salePrice = normalizeCredits(customAmount ?? request.requestedPrice ?? request.suggestedPrice ?? request.value ?? 0);
    if (!(salePrice > 0)) {
      ui.notifications.warn('Sale approval requires a credit amount greater than zero.');
      return;
    }

    const result = await TransactionEngine.executeSaleTransaction({
      actor,
      itemId: request.itemId,
      salePrice,
      reason: action === 'accept' ? 'GM approved store sale' : 'GM counteroffer approved',
      transactionContext: action === 'accept' ? 'store-sale-approval' : 'store-haggle-sale',
      audit: {
        requestId: request.id,
        itemName: item.name || request.item,
        itemNames: [item.name || request.item].filter(Boolean),
        itemCount: 1,
        basePrice: request.basePrice ?? request.itemData?.system?.price ?? null,
        suggestedPrice: request.suggestedPrice ?? request.value ?? null,
        approvedPrice: salePrice,
        approvalMode: action,
        source: 'Legacy GM Store Dashboard'
      }
    }, {
      validate: true,
      rederive: true,
      source: 'GMStoreDashboard._resolvePendingSale'
    });

    if (!result.success) {
      ui.notifications.error(`Failed to approve sale: ${result.error}`);
      return;
    }

    pendingSales.splice(index, 1);
    await SettingsHelper.set('pendingSales', pendingSales);
    ui.notifications.info(`Approved sale of ${item.name} for ${salePrice.toLocaleString()} credits.`);
    this.render();
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
      // NOTE: Droid edit mode workflows are pending implementation in the new progression shell
      SWSELogger.warn('SWSE GM Dashboard | Droid edit mode pending implementation in new progression shell');
      ui.notifications.info('Droid editing is being refactored for the new character progression system. This feature will be available soon.');
    } else if (approval.type === 'vehicle') {
      const draftActor = game.actors.get(approval.draftActorId);
      if (draftActor) {
        draftActor.sheet?.render?.(true);
        ui.notifications.info('Opened the draft vehicle sheet for GM review. Inline Shipyard edit mode is a later pass.');
      } else {
        ui.notifications.warn('Draft vehicle actor not found.');
      }
    }
  }

  /**
   * Approve a pending custom droid/vehicle purchase.
   * TransactionEngine owns the credit movement and owner-asset linkage.
   */
  async _approvePendingCustom(index) {
    const approval = this.pendingApprovals[index];
    if (!approval) return;

    const ownerActor = game.actors.get(approval.ownerActorId);
    const draftActor = game.actors.get(approval.draftActorId);
    if (!ownerActor) {
      ui.notifications.error('Owner actor not found.');
      return;
    }
    if (!draftActor) {
      ui.notifications.error('Draft asset actor not found.');
      return;
    }

    const assetName = approval.draftData?.name || draftActor.name || 'Custom asset';
    const normalizedCost = normalizeCredits(approval.costCredits ?? 0);
    const currentCredits = normalizeCredits(LedgerService.getCurrentCredits(ownerActor));
    if (currentCredits < normalizedCost) {
      ui.notifications.error(`${ownerActor.name} has ${currentCredits.toLocaleString()} credits, but ${assetName} costs ${normalizedCost.toLocaleString()} credits.`);
      return;
    }

    const confirmed = await SWSEDialogV2.confirm({
      title: 'Approve Custom ' + (approval.type === 'droid' ? 'Droid' : 'Vehicle'),
      content: `
        <p><strong>${assetName}</strong></p>
        <p>For: ${ownerActor.name}</p>
        <p>Current Credits: <strong>${currentCredits.toLocaleString()} credits</strong></p>
        <p>Cost: <strong>${normalizedCost.toLocaleString()} credits</strong></p>
        <p>Remaining After Approval: <strong>${(currentCredits - normalizedCost).toLocaleString()} credits</strong></p>
        <p>Approve this purchase and assign the asset to the buyer?</p>
      `,
      defaultYes: false
    });

    if (!confirmed) return;

    try {
      const approvalResult = await TransactionEngine.executeAssetApprovalTransaction({
        actor: ownerActor,
        assetActor: draftActor,
        cost: normalizedCost,
        reason: `GM approved ${approval.type || draftActor.type || 'custom'} acquisition`,
        transactionContext: 'store-custom-approval',
        audit: this._buildApprovalAudit(approval, draftActor, assetName, normalizedCost)
      }, {
        source: 'GMStoreDashboard._approvePendingCustom',
        validate: true,
        rederive: true
      });

      if (!approvalResult.success) throw new Error(approvalResult.error || 'Asset approval transaction failed');

      const history = ownerActor.getFlag('foundryvtt-swse', 'purchaseHistory') || [];
      const purchase = {
        timestamp: Date.now(),
        items: [],
        droids: draftActor.type === 'droid' ? [{
          id: draftActor.id,
          name: assetName,
          cost: normalizedCost
        }] : [],
        vehicles: draftActor.type === 'vehicle' ? [{
          id: draftActor.id,
          name: assetName,
          cost: normalizedCost
        }] : [],
        total: normalizedCost,
        transactionId: approvalResult.transactionId ?? null,
        source: 'Store - Custom ' + (draftActor.type === 'droid' ? 'Droid' : 'Vehicle') + ' Approval',
        compatibilityMirror: true
      };
      history.push(purchase);
      await ActorEngine.updateActor(ownerActor, {
        'flags.foundryvtt-swse.purchaseHistory': history
      }, {
        source: 'GMStoreDashboard._approvePendingCustom.purchaseHistoryMirror',
        skipValidation: true
      });

      await this._removePendingApproval(approval, index);

      Hooks.callAll?.('swseCustomPurchaseApproved', {
        approval,
        actor: ownerActor,
        draftActor,
        transactionId: approvalResult.transactionId,
        decidedBy: game.user?.name ?? 'GM'
      });

      ui.notifications.info(`Approved: ${assetName} for ${ownerActor.name}`);
      SWSELogger.log('SWSE Store | Custom purchase approved:', { approval, transactionId: approvalResult.transactionId });
      this.render();
    } catch (err) {
      SWSELogger.error('Failed to approve custom purchase:', err);
      ui.notifications.error(`Approval failed: ${err.message}`);
    }
  }

  /**
   * Deny a pending custom droid/vehicle purchase
   * Deletes draft actor, removes from queue
   */
  async _denyPendingCustom(index) {
    const approval = this.pendingApprovals[index];
    if (!approval) return;

    const ownerActor = game.actors.get(approval.ownerActorId);

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

      // Remove from pending queue. Denial never touches the ledger or deducts credits.
      await this._removePendingApproval(approval, index);

      // Emit Holonet denial hook
      if (ownerActor) {
        Hooks.callAll?.('swseCustomPurchaseDenied', {
          approval,
          actor: ownerActor,
          decidedBy: game.user?.name ?? 'GM',
          noCreditsChanged: true
        });
      }

      ui.notifications.info(`Denied: ${approval.draftData.name}`);
      SWSELogger.log('SWSE Store | Custom purchase denied:', approval);
      this.render();
    } catch (err) {
      SWSELogger.error('Failed to deny custom purchase:', err);
      ui.notifications.error('Denial failed. See console for details.');
    }
  }
}
