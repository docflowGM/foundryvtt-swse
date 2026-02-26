/**
 * VehicleTransactionService — Manage Pending Vehicle Modifications
 * PHASE 5: GM Review Pipeline Integration for vehicles
 * Mirrors DroidTransactionService
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class VehicleTransactionService {
  static FLAG_NAMESPACE = 'foundryvtt-swse';
  static FLAG_KEY = 'pending-vehicle-transactions';

  /**
   * Submit vehicle modification transaction for GM review
   *
   * @param {Actor} actor - Vehicle actor
   * @param {Object} planResult - Result from VehicleModificationFactory
   * @returns {Object} { success, transactionId?, error? }
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
      vehicleType: actor.system?.type || 'unknown',
      playerId: actor.ownership[Object.keys(actor.ownership)?.[0]] || 'unknown',
      status: 'pending',
      plan: planResult.plan,
      summary: planResult.summary,
      submittedAt: timestamp,
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: ''
    };

    const existing = await this.#getTransactions();
    existing.push(transaction);

    try {
      await world.setFlag(this.FLAG_NAMESPACE, this.FLAG_KEY, existing);

      swseLogger.info('VehicleTransactionService: Transaction submitted', {
        transactionId,
        actor: actor.id,
        actorName: actor.name
      });

      this.#notifyGMs(`Vehicle modification pending review for ${actor.name}`);

      return {
        success: true,
        transactionId
      };
    } catch (error) {
      swseLogger.error('VehicleTransactionService: Failed to submit', {
        error: error.message
      });

      return {
        success: false,
        error: `Failed to submit: ${error.message}`
      };
    }
  }

  /**
   * Get pending transactions
   * @returns {Array}
   */
  static async getPendingTransactions() {
    const transactions = await this.#getTransactions();
    return transactions.filter(t => t.status === 'pending');
  }

  /**
   * Approve a transaction
   *
   * @param {string} transactionId
   * @param {string} gmUserId
   * @param {string} notes
   * @returns {Object} { success, error? }
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

    transaction.status = 'approved';
    transaction.reviewedAt = new Date().toISOString();
    transaction.reviewedBy = gmUserId;
    transaction.reviewNotes = notes;

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

      await world.setFlag(this.FLAG_NAMESPACE, this.FLAG_KEY, transactions);

      swseLogger.info('VehicleTransactionService: Transaction approved', {
        transactionId,
        actor: actor.id
      });

      return {
        success: true,
        message: `Modifications applied to ${actor.name}`
      };
    } catch (error) {
      swseLogger.error('VehicleTransactionService: Failed to apply', {
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
   *
   * @param {string} transactionId
   * @param {string} gmUserId
   * @param {string} reason
   * @returns {Object} { success, error? }
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

    transaction.status = 'rejected';
    transaction.reviewedAt = new Date().toISOString();
    transaction.reviewedBy = gmUserId;
    transaction.reviewNotes = reason;

    try {
      await world.setFlag(this.FLAG_NAMESPACE, this.FLAG_KEY, transactions);

      swseLogger.info('VehicleTransactionService: Transaction rejected', {
        transactionId,
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

  /* ---- PRIVATE ---- */

  static async #getTransactions() {
    try {
      const transactions = await world.getFlag(this.FLAG_NAMESPACE, this.FLAG_KEY);
      return Array.isArray(transactions) ? transactions : [];
    } catch (error) {
      swseLogger.warn('VehicleTransactionService: Failed to retrieve', {
        error: error.message
      });
      return [];
    }
  }

  static #generateId() {
    return `vehicle-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static #notifyGMs(message) {
    for (const user of game.users) {
      if (user.role >= CONST.USER_ROLES.GAMEMASTER) {
        ui.notifications.notify(`[GM] ${message}`);
      }
    }
  }
}
