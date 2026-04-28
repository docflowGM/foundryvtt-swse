/**
 * Store Emitter
 *
 * Listens to store transaction results and emits into Holonet.
 * Hooks into StoreTransactionEngine and GMStoreDashboard flows.
 */

import { HolonetEngine } from '../holonet-engine.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { StoreSource } from '../sources/store-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class StoreEmitter {
  static #initialized = false;
  static #lastEmittedTransactions = new Set(); // Deduplication

  /**
   * Initialize store emitter
   * Registers hooks for transaction events
   */
  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    // Hook into store transaction completion
    Hooks.on('swseStoreTransactionComplete', (data) => {
      this.onTransactionComplete(data).catch(err => {
        console.error('[Holonet] Store emitter failed:', err);
      });
    });

    // Hook into custom purchase approval
    Hooks.on('swseCustomPurchaseApproved', (data) => {
      this.onCustomPurchaseApproved(data).catch(err => {
        console.error('[Holonet] Store emitter (approval) failed:', err);
      });
    });

    // Hook into custom purchase denied
    Hooks.on('swseCustomPurchaseDenied', (data) => {
      this.onCustomPurchaseDenied(data).catch(err => {
        console.error('[Holonet] Store emitter (denial) failed:', err);
      });
    });

    console.log('[Holonet] Store emitter initialized');
  }

  /**
   * Emit transaction completion notification
   */
  static async onTransactionComplete(data) {
    const { transaction, buyer, seller, success } = data;

    if (!transaction || !buyer) {
      return;
    }

    // Check preferences
    if (!HolonetPreferences.shouldNotify(HolonetPreferences.CATEGORIES.STORE_TRANSACTIONS)) {
      return;
    }

    // Deduplication
    const dedupeKey = `trans-${transaction.id}-${success ? 'ok' : 'fail'}`;
    if (this.#lastEmittedTransactions.has(dedupeKey)) {
      return;
    }
    this.#lastEmittedTransactions.add(dedupeKey);

    const ownerUser = game.users?.find(u => u.character?.id === buyer.id);
    if (!ownerUser) {
      return;
    }

    try {
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
      await HolonetEngine.publish(record);

      console.log(`[Holonet] Store transaction emitted: ${buyer.name} - ${success ? 'approved' : 'denied'}`);
    } catch (err) {
      console.error('[Holonet] Failed to emit store transaction:', err);
    }
  }

  /**
   * Emit custom purchase approval notification
   */
  static async onCustomPurchaseApproved(data) {
    const { approval, actor, decidedBy } = data;

    if (!approval || !actor) {
      return;
    }

    if (!HolonetPreferences.shouldNotify(HolonetPreferences.CATEGORIES.STORE_TRANSACTIONS)) {
      return;
    }

    const dedupeKey = `custom-${approval.id}-approved`;
    if (this.#lastEmittedTransactions.has(dedupeKey)) {
      return;
    }
    this.#lastEmittedTransactions.add(dedupeKey);

    const ownerUser = game.users?.find(u => u.character?.id === actor.id);
    if (!ownerUser) {
      return;
    }

    try {
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
      await HolonetEngine.publish(record);

      console.log(`[Holonet] Custom purchase approved: ${actor.name}`);
    } catch (err) {
      console.error('[Holonet] Failed to emit custom purchase approval:', err);
    }
  }

  /**
   * Emit custom purchase denial notification
   */
  static async onCustomPurchaseDenied(data) {
    const { approval, actor, decidedBy } = data;

    if (!approval || !actor) {
      return;
    }

    if (!HolonetPreferences.shouldNotify(HolonetPreferences.CATEGORIES.STORE_TRANSACTIONS)) {
      return;
    }

    const dedupeKey = `custom-${approval.id}-denied`;
    if (this.#lastEmittedTransactions.has(dedupeKey)) {
      return;
    }
    this.#lastEmittedTransactions.add(dedupeKey);

    const ownerUser = game.users?.find(u => u.character?.id === actor.id);
    if (!ownerUser) {
      return;
    }

    try {
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
      await HolonetEngine.publish(record);

      console.log(`[Holonet] Custom purchase denied: ${actor.name}`);
    } catch (err) {
      console.error('[Holonet] Failed to emit custom purchase denial:', err);
    }
  }
}
