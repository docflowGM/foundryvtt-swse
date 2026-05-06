/**
 * Store Emitter
 *
 * Listens to store transaction results and emits into Holonet.
 * Hooks into StoreTransactionEngine and GMStoreDashboard flows.
 *
 * Preference checks, deduplication, and publish are delegated to HolonetEmissionService.
 */

import { HolonetEmissionService } from '../subsystems/holonet-emission-service.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { StoreSource } from '../sources/store-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { SOURCE_FAMILY } from '../contracts/enums.js';

export class StoreEmitter {
  static #initialized = false;

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    Hooks.on('swseStoreTransactionComplete', (data) => {
      this.onTransactionComplete(data).catch(err => {
        console.error('[Holonet] Store emitter failed:', err);
      });
    });

    Hooks.on('swseCustomPurchaseApproved', (data) => {
      this.onCustomPurchaseApproved(data).catch(err => {
        console.error('[Holonet] Store emitter (approval) failed:', err);
      });
    });

    Hooks.on('swseCustomPurchaseDenied', (data) => {
      this.onCustomPurchaseDenied(data).catch(err => {
        console.error('[Holonet] Store emitter (denial) failed:', err);
      });
    });

    console.log('[Holonet] Store emitter initialized');
  }

  static async onTransactionComplete(data) {
    const { transaction, buyer, success } = data;
    if (!transaction || !buyer) return;

    const ownerUser = game.users?.find(u => u.character?.id === buyer.id);
    if (!ownerUser) return;

    const dedupeKey = `trans-${transaction.id}-${success ? 'ok' : 'fail'}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.STORE,
      categoryId: HolonetPreferences.CATEGORIES.STORE_TRANSACTIONS,
      dedupeKey,
      createRecord: () => {
        const record = StoreSource.createTransactionNotification({
          transactionId: transaction.id,
          playerUserId: ownerUser.id,
          intent: success ? 'system.transaction_approved' : 'system.transaction_denied',
          title: success ? 'Purchase Complete' : 'Transaction Failed',
          body: success
            ? `Your purchase of ${transaction.itemName || 'items'} for ${transaction.price} credits has been completed.`
            : `Your transaction for ${transaction.itemName || 'items'} failed.`,
          level: success ? 'success' : 'warning',
          metadata: {
            transactionId: transaction.id,
            itemName: transaction.itemName,
            price: transaction.price
          }
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Store transaction emitted: ${buyer.name} - ${success ? 'approved' : 'denied'}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit store transaction:', result.reason);
    }
  }

  static async onCustomPurchaseApproved(data) {
    const { approval, actor } = data;
    if (!approval || !actor) return;

    const ownerUser = game.users?.find(u => u.character?.id === actor.id);
    if (!ownerUser) return;

    const dedupeKey = `custom-${approval.id}-approved`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.STORE,
      categoryId: HolonetPreferences.CATEGORIES.STORE_TRANSACTIONS,
      dedupeKey,
      createRecord: () => {
        const record = StoreSource.createTransactionNotification({
          transactionId: approval.id,
          playerUserId: ownerUser.id,
          intent: 'system.transaction_approved',
          title: `Approved: ${approval.draftData?.name || 'Custom Item'}`,
          body: `Your custom ${approval.type || 'item'} purchase has been approved for ${approval.costCredits || 0} credits.`,
          level: 'success',
          metadata: {
            approvalId: approval.id,
            itemName: approval.draftData?.name,
            cost: approval.costCredits,
            type: approval.type
          }
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Custom purchase approved: ${actor.name}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit custom purchase approval:', result.reason);
    }
  }

  static async onCustomPurchaseDenied(data) {
    const { approval, actor } = data;
    if (!approval || !actor) return;

    const ownerUser = game.users?.find(u => u.character?.id === actor.id);
    if (!ownerUser) return;

    const dedupeKey = `custom-${approval.id}-denied`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.STORE,
      categoryId: HolonetPreferences.CATEGORIES.STORE_TRANSACTIONS,
      dedupeKey,
      createRecord: () => {
        const record = StoreSource.createTransactionNotification({
          transactionId: approval.id,
          playerUserId: ownerUser.id,
          intent: 'system.transaction_denied',
          title: `Denied: ${approval.draftData?.name || 'Custom Item'}`,
          body: `Your custom ${approval.type || 'item'} purchase has been denied.`,
          level: 'warning',
          metadata: {
            approvalId: approval.id,
            itemName: approval.draftData?.name,
            cost: approval.costCredits,
            type: approval.type
          }
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Custom purchase denied: ${actor.name}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit custom purchase denial:', result.reason);
    }
  }
}
