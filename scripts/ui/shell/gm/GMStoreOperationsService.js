/**
 * GMStoreOperationsService
 *
 * Store-control operation helpers for the GM Datapad. This module owns GM store
 * sale decisions and rollback/reversal orchestration while TransactionEngine
 * remains the single source of truth for credit movement.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';
import { normalizeCredits } from '/systems/foundryvtt-swse/scripts/utils/credit-normalization.js';
import { prompt as uiPrompt } from '/systems/foundryvtt-swse/scripts/utils/ui-utils.js';
import { TransactionEngine } from '/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js';
import { restoreInventoryPolicyQuantities } from '/systems/foundryvtt-swse/scripts/engine/store/policy-service.js';

export class GMStoreOperationsService {
  /**
   * Approve, counteroffer, or deny a pending player sale request.
   */
  static async resolvePendingSaleRequest(requestId, options = {}, context = {}) {
    const { decision = 'approve', amount = null, reason = '' } = options;
    const pendingSales = SettingsHelper.getArray('pendingSales', []);
    const index = pendingSales.findIndex(request => String(request?.id || '') === String(requestId || ''));

    if (index < 0) {
      ui?.notifications?.error?.('Pending sale request not found.');
      return { success: false, error: 'pending-sale-not-found' };
    }

    const request = pendingSales[index];
    const actor = game.actors.get(request.actorId);

    if (decision === 'deny') {
      pendingSales.splice(index, 1);
      await SettingsHelper.set('pendingSales', pendingSales);
      Hooks.callAll?.('swseStoreSaleDenied', {
        request,
        actor,
        decidedBy: game.user?.name ?? 'GM',
        reason
      });
      ui?.notifications?.info?.(`Denied sale request: ${request.item || 'item'}${reason ? ` — ${reason}` : ''}`);
      await context.render?.();
      return { success: true, decision: 'deny', requestId };
    }

    if (!actor) {
      ui?.notifications?.error?.('Cannot approve sale: actor no longer exists.');
      return { success: false, error: 'actor-not-found' };
    }

    const salePrice = normalizeCredits(amount ?? request.requestedPrice ?? request.suggestedPrice ?? request.value ?? 0);
    if (!(salePrice > 0)) {
      ui?.notifications?.warn?.('Sale approval requires a credit amount greater than zero.');
      return { success: false, error: 'invalid-sale-price' };
    }

    const item = actor.items?.get?.(request.itemId);
    if (!item) {
      ui?.notifications?.error?.('Cannot approve sale: item is no longer owned by this actor.');
      return { success: false, error: 'item-not-owned' };
    }

    const result = await TransactionEngine.executeSaleTransaction({
      actor,
      itemId: request.itemId,
      salePrice,
      reason: reason || (decision === 'counteroffer' ? 'GM counteroffer approved' : 'GM approved store sale'),
      transactionContext: decision === 'counteroffer' ? 'store-haggle-sale' : 'store-sale-approval',
      audit: {
        requestId: request.id,
        requestType: request.type || 'sale',
        itemName: item.name || request.item,
        itemNames: [item.name || request.item].filter(Boolean),
        itemCount: 1,
        basePrice: request.basePrice ?? request.itemData?.system?.price ?? null,
        suggestedPrice: request.suggestedPrice ?? request.value ?? null,
        requestedPrice: request.requestedPrice ?? request.value ?? null,
        approvedPrice: salePrice,
        approvalMode: decision,
        approvedBy: game.user?.id ?? null,
        approvedByName: game.user?.name ?? 'GM',
        gmReason: reason,
        source: 'GM Store Control Approvals'
      }
    }, {
      validate: true,
      rederive: true,
      source: 'GMStoreOperationsService.resolvePendingSaleRequest'
    });

    if (!result.success) {
      ui?.notifications?.error?.(`Failed to approve sale: ${result.error}`);
      return result;
    }

    pendingSales.splice(index, 1);
    await SettingsHelper.set('pendingSales', pendingSales);

    Hooks.callAll?.('swseStoreSaleApproved', {
      request,
      actor,
      itemData: request.itemData,
      salePrice,
      decision,
      reason,
      transactionId: result.transactionId,
      decidedBy: game.user?.name ?? 'GM'
    });

    ui?.notifications?.info?.(`Approved sale: ${request.item || item.name} for ${salePrice.toLocaleString()} credits.`);
    await context.render?.();
    return { ...result, success: true, decision, requestId, salePrice };
  }

  /**
   * Build a safe item reconciliation preview for a TransactionEngine rollback.
   *
   * Existing historical records may only know item names. New records include
   * audit.items with ids/types/costs, but this still falls back to name matching
   * so the GM can recover from older purchases without losing credit SSOT safety.
   */
  static buildTransactionRollbackReconciliation(transaction, actor) {
    const auditItems = Array.isArray(transaction?.audit?.items)
      ? transaction.audit.items.filter(item => item && typeof item === 'object')
      : [];

    const fallbackItems = auditItems.length ? [] : String(transaction?.item || '')
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => ({ name, type: 'item', quantity: 1, id: null, fallback: true }));

    const requestedItems = (auditItems.length ? auditItems : fallbackItems)
      .map(item => ({
        id: item.id || item.itemId || null,
        name: item.name || 'Unknown Item',
        type: item.type || 'item',
        quantity: Math.max(1, normalizeCredits(item.quantity ?? 1) || 1),
        cost: normalizeCredits(item.cost ?? 0),
        condition: item.condition || null,
        fallback: item.fallback === true
      }));

    const actorItems = Array.from(actor?.items ?? []);
    const usedIds = new Set();
    const removableItemIds = [];
    const removedItems = [];
    const unmatchedItems = [];
    const inventoryPolicyItems = [];

    const matchesSourceId = (ownedItem, requested) => {
      const wanted = String(requested.id || '').trim();
      if (!wanted) return false;
      const sourceId = String(ownedItem?.flags?.core?.sourceId || ownedItem?.flags?.foundryvttSwse?.sourceId || '').trim();
      const ownId = String(ownedItem?.id || ownedItem?._id || '').trim();
      return ownId === wanted || sourceId === wanted || sourceId.endsWith(`.${wanted}`);
    };

    const findOwnedItem = (requested) => {
      const type = String(requested.type || '').toLowerCase();
      const canDeleteEmbeddedItem = type === 'item' || type === 'customized-item' || type === 'equipment' || type === 'weapon' || type === 'armor';
      if (!canDeleteEmbeddedItem) return null;

      let match = actorItems.find(item => !usedIds.has(item.id) && matchesSourceId(item, requested));
      if (match) return match;

      const wantedName = String(requested.name || '').trim().toLowerCase();
      if (!wantedName) return null;
      match = actorItems.find(item => !usedIds.has(item.id) && String(item.name || '').trim().toLowerCase() === wantedName);
      if (match) return match;

      return null;
    };

    for (const requested of requestedItems) {
      if (requested.id) {
        inventoryPolicyItems.push({
          id: requested.id,
          name: requested.name,
          type: requested.type,
          quantity: requested.quantity
        });
      }

      for (let i = 0; i < requested.quantity; i += 1) {
        const ownedItem = findOwnedItem(requested);
        if (!ownedItem) {
          unmatchedItems.push({
            ...requested,
            reason: String(requested.type || '').toLowerCase() === 'droid' || String(requested.type || '').toLowerCase() === 'vehicle'
              ? 'Actor/asset purchases require manual asset review before deletion.'
              : 'No matching owned item found on the actor.'
          });
          continue;
        }

        usedIds.add(ownedItem.id);
        removableItemIds.push(ownedItem.id);
        removedItems.push({
          id: ownedItem.id,
          name: ownedItem.name,
          type: ownedItem.type,
          requestedName: requested.name
        });
      }
    }

    return {
      requestedItems,
      removableItemIds,
      removedItems,
      unmatchedItems,
      inventoryPolicyItems
    };
  }

  /**
   * Roll back a store transaction through TransactionEngine.
   *
   * Credit movement is handled by TransactionEngine as the SSOT. Safe owned item
   * removal is folded into the same actor mutation plan. Inventory quantity
   * restoration happens only after the TransactionEngine rollback succeeds.
   */
  static async rollbackTransaction(index, context = {}) {
    const transactions = Array.isArray(context.transactions) ? context.transactions : [];

    if (index < 0 || index >= transactions.length) {
      ui?.notifications?.error?.('Invalid transaction index');
      return { success: false, error: 'invalid-transaction-index' };
    }

    const transaction = transactions[index];
    if (!transaction?.canRollback && !transaction?.canReverse) {
      ui?.notifications?.warn?.('This transaction cannot be rolled back from the TransactionEngine ledger.');
      return { success: false, error: 'transaction-not-rollbackable' };
    }

    const actor = game.actors.get(transaction.actorId);
    if (!actor) {
      ui?.notifications?.error?.('Actor not found');
      return { success: false, error: 'actor-not-found' };
    }

    const reversalAmount = normalizeCredits(0 - Number(transaction.amount || 0));
    const reconciliation = this.buildTransactionRollbackReconciliation(transaction, actor);

    if (!Number.isFinite(reversalAmount) || (reversalAmount === 0 && reconciliation.removableItemIds.length === 0)) {
      ui?.notifications?.warn?.('This transaction has no credit or owned-item impact to roll back.');
      return { success: false, error: 'empty-rollback' };
    }

    const defaultReason = 'GM transaction rollback';
    const summary = [
      `Credit adjustment: ${reversalAmount >= 0 ? '+' : ''}${reversalAmount.toLocaleString()} cr`,
      `Owned items to remove: ${reconciliation.removableItemIds.length}`,
      reconciliation.unmatchedItems.length ? `Manual review: ${reconciliation.unmatchedItems.length} unmatched asset/item(s)` : null,
      '',
      `Reason for rolling back ${transaction.item || 'this transaction'}?`
    ].filter(line => line !== null).join('\n');

    let reason = defaultReason;
    try {
      const prompted = await uiPrompt('Rollback Store Transaction', summary, reason);
      if (prompted === null || prompted === undefined) return { success: false, cancelled: true };
      reason = String(prompted || reason).trim() || reason;
    } catch (_err) {
      // uiPrompt is best-effort; continue with the default reason if unavailable.
    }

    try {
      const result = await TransactionEngine.executeRollbackCorrection({
        actor,
        amount: reversalAmount,
        reason,
        sourceTransactionId: transaction.transactionId,
        removeOwnedItemIds: reconciliation.removableItemIds,
        audit: {
          sourceTransactionId: transaction.transactionId,
          sourceContext: transaction.context,
          sourceItem: transaction.item,
          sourceAmount: transaction.amount,
          source: 'GM Store Control Rollback',
          removedItems: reconciliation.removedItems,
          unmatchedItems: reconciliation.unmatchedItems,
          inventoryPolicyItems: reconciliation.inventoryPolicyItems
        }
      }, {
        source: 'GMStoreOperationsService.rollbackTransaction',
        validate: true,
        rederive: true
      });

      if (!result.success) {
        ui?.notifications?.error?.(`Failed to roll back transaction: ${result.error}`);
        return result;
      }

      const restoreResult = await restoreInventoryPolicyQuantities(reconciliation.inventoryPolicyItems);
      const messageParts = [
        `Rollback recorded for ${transaction.actor}.`,
        reconciliation.removedItems.length ? `${reconciliation.removedItems.length} owned item(s) removed.` : null,
        restoreResult.updated ? `${restoreResult.updated} stock policy record(s) restored.` : null,
        reconciliation.unmatchedItems.length ? `${reconciliation.unmatchedItems.length} item/asset(s) need manual review.` : null
      ].filter(Boolean);

      ui?.notifications?.info?.(messageParts.join(' '));
      await context.render?.();
      return { ...result, restoreResult, reconciliation };
    } catch (err) {
      SWSELogger.error('[GMStoreOperationsService] Error rolling back transaction:', err);
      ui?.notifications?.error?.(`Failed to roll back transaction: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
