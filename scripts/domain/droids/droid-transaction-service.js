/**
 * DroidTransactionService — Manage Pending Droid Modifications
 *
 * PHASE 4 STEP 5: GM Review Pipeline Integration
 *
 * Responsibilities:
 * - Store pending droid modification transactions
 * - Route to GM review queue
 * - Track submission/approval/rejection
 * - Provide audit trail
 *
 * Non-responsibilities:
 * - No mutations directly applied
 * - No bypassing GM review
 *
 * Storage: World flags under 'foundryvtt-swse.droid-transactions'
 */

import { swseLogger } from '../../utils/logger.js';

export class DroidTransactionService {
  static FLAG_NAMESPACE = 'foundryvtt-swse';
  static FLAG_KEY = 'pending-droid-transactions';

  /**
   * Submit droid modification transaction for GM review
   *
   * @param {Actor} actor - Droid actor
   * @param {Object} planResult - Result from DroidModificationFactory
   * @returns {Object} { success: boolean, transactionId?: string, error?: string }
   */
  static async submitForReview(actor, planResult) {
    if (!actor) {
      return {
        success: false,
        error: 'No actor provided'
      };
    }

    if (!planResult?.valid) {
      return {
        success: false,
        error: 'Invalid modification plan'
      };
    }

    const transactionId = this.#generateId();
    const timestamp = new Date().toISOString();

    const transaction = {
      id: transactionId,
      actorId: actor.id,
      actorName: actor.name,
      playerId: actor.ownership[Object.keys(actor.ownership)?.[0]] || 'unknown',
      status: 'pending', // pending | approved | rejected
      plan: planResult.plan,
      summary: planResult.summary,
      submittedAt: timestamp,
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: ''
    };

    // Get existing transactions
    const existing = await this.#getTransactions();
    existing.push(transaction);

    // Store updated transactions
    try {
      await world.setFlag(this.FLAG_NAMESPACE, this.FLAG_KEY, existing);

      swseLogger.info('DroidTransactionService: Transaction submitted', {
        transactionId,
        actor: actor.id,
        actorName: actor.name,
        systemsAdded: planResult.summary.systemsAdded.length,
        systemsRemoved: planResult.summary.systemsRemoved.length
      });

      // Notify GMs
      this.#notifyGMs(`Droid modification pending review for ${actor.name}`);

      return {
        success: true,
        transactionId
      };
    } catch (error) {
      swseLogger.error('DroidTransactionService: Failed to submit transaction', {
        error: error.message,
        actor: actor.id
      });

      return {
        success: false,
        error: `Failed to submit: ${error.message}`
      };
    }
  }

  /**
   * Get all pending transactions
   * @returns {Array<Object>} Array of pending transactions
   */
  static async getPendingTransactions() {
    const transactions = await this.#getTransactions();
    return transactions.filter(t => t.status === 'pending');
  }

  /**
   * Get transactions for specific actor
   * @param {string} actorId
   * @returns {Array<Object>}
   */
  static async getActorTransactions(actorId) {
    const transactions = await this.#getTransactions();
    return transactions.filter(t => t.actorId === actorId);
  }

  /**
   * Approve a transaction and apply it
   * @param {string} transactionId
   * @param {string} gmUserId - User ID of approving GM
   * @param {string} notes - Optional GM review notes
   * @returns {Object} { success: boolean, error?: string }
   */
  static async approveTransaction(transactionId, gmUserId, notes = '') {
    const transactions = await this.#getTransactions();
    const idx = transactions.findIndex(t => t.id === transactionId);

    if (idx === -1) {
      return {
        success: false,
        error: 'Transaction not found'
      };
    }

    const transaction = transactions[idx];

    if (transaction.status !== 'pending') {
      return {
        success: false,
        error: `Transaction status is ${transaction.status}, not pending`
      };
    }

    // Update transaction
    transaction.status = 'approved';
    transaction.reviewedAt = new Date().toISOString();
    transaction.reviewedBy = gmUserId;
    transaction.reviewNotes = notes;

    // Get actor and apply plan
    try {
      const actor = game.actors.get(transaction.actorId);
      if (!actor) {
        return {
          success: false,
          error: 'Actor not found'
        };
      }

      const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');
      await ActorEngine.applyMutationPlan(actor, transaction.plan);

      // Save updated transaction
      await world.setFlag(this.FLAG_NAMESPACE, this.FLAG_KEY, transactions);

      swseLogger.info('DroidTransactionService: Transaction approved and applied', {
        transactionId,
        actor: actor.id,
        gmUserId
      });

      return {
        success: true,
        message: `Modifications applied to ${actor.name}`
      };
    } catch (error) {
      swseLogger.error('DroidTransactionService: Failed to apply approved transaction', {
        error: error.message,
        transactionId
      });

      return {
        success: false,
        error: `Failed to apply: ${error.message}`
      };
    }
  }

  /**
   * Reject a transaction
   * @param {string} transactionId
   * @param {string} gmUserId - User ID of rejecting GM
   * @param {string} reason - Reason for rejection
   * @returns {Object} { success: boolean, error?: string }
   */
  static async rejectTransaction(transactionId, gmUserId, reason = '') {
    const transactions = await this.#getTransactions();
    const idx = transactions.findIndex(t => t.id === transactionId);

    if (idx === -1) {
      return {
        success: false,
        error: 'Transaction not found'
      };
    }

    const transaction = transactions[idx];

    if (transaction.status !== 'pending') {
      return {
        success: false,
        error: `Transaction status is ${transaction.status}, not pending`
      };
    }

    // Update transaction
    transaction.status = 'rejected';
    transaction.reviewedAt = new Date().toISOString();
    transaction.reviewedBy = gmUserId;
    transaction.reviewNotes = reason;

    try {
      await world.setFlag(this.FLAG_NAMESPACE, this.FLAG_KEY, transactions);

      swseLogger.info('DroidTransactionService: Transaction rejected', {
        transactionId,
        gmUserId,
        reason
      });

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to reject: ${error.message}`
      };
    }
  }

  /* ---- PRIVATE HELPERS ---- */

  static async #getTransactions() {
    try {
      const transactions = await world.getFlag(this.FLAG_NAMESPACE, this.FLAG_KEY);
      return Array.isArray(transactions) ? transactions : [];
    } catch (error) {
      swseLogger.warn('DroidTransactionService: Failed to retrieve transactions', {
        error: error.message
      });
      return [];
    }
  }

  static #generateId() {
    return `droid-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static #notifyGMs(message) {
    for (const user of game.users) {
      if (user.role >= CONST.USER_ROLES.GAMEMASTER) {
        ui.notifications.notify(`[GM] ${message}`);
      }
    }
  }
}
