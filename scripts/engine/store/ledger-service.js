/**
 * LedgerService — Pure Credit Logic
 *
 * PHASE 3: Credit logic extraction
 *
 * Responsibilities:
 * - Calculate cart totals
 * - Validate actor has sufficient funds
 * - Build credit delta MutationPlan
 *
 * Non-goals:
 * - No actor mutations
 * - No database access
 * - No side effects
 * - Pure domain math only
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";

export class LedgerService {
  /**
   * Calculate total cost of cart items
   * @param {Array} cartItems - Items with cost property
   * @returns {number} Total cost (normalized)
   */
  static calculateTotal(cartItems) {
    if (!Array.isArray(cartItems)) {
      return 0;
    }

    let total = 0;
    for (const item of cartItems) {
      if (item && typeof item.cost === 'number') {
        total += item.cost;
      }
    }

    return normalizeCredits(total);
  }

  /**
   * Validate actor has sufficient credits
   * @param {Actor} actor - Actor to validate
   * @param {number} totalCost - Total cost to validate against
   * @returns {Object} { ok: boolean, reason?: string, current?: number, required?: number }
   */
  static validateFunds(actor, totalCost) {
    if (!actor) {
      return {
        ok: false,
        reason: 'No actor provided',
        current: 0,
        required: totalCost
      };
    }

    if (typeof totalCost !== 'number' || totalCost < 0) {
      return {
        ok: false,
        reason: 'Invalid total cost',
        current: Number(actor.system?.credits ?? 0) || 0,
        required: totalCost
      };
    }

    const currentCredits = Number(actor.system?.credits ?? 0) || 0;

    if (!Number.isFinite(currentCredits)) {
      return {
        ok: false,
        reason: 'Actor credits in invalid state',
        current: currentCredits,
        required: totalCost
      };
    }

    if (currentCredits < totalCost) {
      return {
        ok: false,
        reason: 'INSUFFICIENT_FUNDS',
        current: currentCredits,
        required: totalCost
      };
    }

    return {
      ok: true,
      current: currentCredits,
      required: totalCost
    };
  }

  /**
   * Build credit delta MutationPlan
   * Deducts totalCost from actor's current credits.
   * @param {Actor} actor - Actor whose credits to deduct
   * @param {number} totalCost - Amount to deduct
   * @returns {Object} MutationPlan with set bucket
   * @throws {Error} If resulting balance would be negative
   */
  static buildCreditDelta(actor, totalCost) {
    if (!actor) {
      throw new Error('buildCreditDelta: No actor provided');
    }

    if (typeof totalCost !== 'number' || totalCost < 0) {
      throw new Error('buildCreditDelta: Invalid total cost');
    }

    const currentCredits = Number(actor.system?.credits ?? 0) || 0;
    const newCredits = normalizeCredits(currentCredits - totalCost);

    if (newCredits < 0) {
      throw new Error('buildCreditDelta: Resulting balance would be negative');
    }

    swseLogger.debug('LedgerService.buildCreditDelta', {
      actor: actor.id,
      currentCredits,
      deduction: totalCost,
      newCredits
    });

    // Return MutationPlan with SET bucket (don't apply yet)
    return {
      set: {
        'system.credits': newCredits
      }
    };
  }

  /**
   * Create full credit metadata for logging
   * @param {Actor} actor - Actor making purchase
   * @param {number} totalCost - Total cost
   * @returns {Object} Metadata for logging
   */
  static buildMetadata(actor, totalCost) {
    const current = Number(actor.system?.credits ?? 0) || 0;
    const newBalance = normalizeCredits(current - totalCost);

    return {
      actor: actor.id,
      actorName: actor.name,
      currentBalance: current,
      cost: totalCost,
      newBalance: newBalance
    };
  }

  /**
   * PHASE 3: Calculate canonical resale value (50% of base cost)
   * @param {number} baseCost - Original cost of item/upgrade
   * @returns {number} Resale value
   */
  static calculateResale(baseCost) {
    if (typeof baseCost !== 'number' || baseCost < 0) {
      return 0;
    }
    // Canonical resale: 50% of base cost
    return Math.floor(baseCost * 0.5);
  }

  /**
   * PHASE 3: Build resale credit delta (opposite of purchase)
   * @param {Actor} actor - Actor selling/removing item
   * @param {number} baseCost - Original cost of removed item
   * @returns {Object} MutationPlan with refund delta
   */
  static buildResaleDelta(actor, baseCost) {
    if (!actor) {
      throw new Error('buildResaleDelta: No actor provided');
    }

    const resaleValue = this.calculateResale(baseCost);
    const currentCredits = Number(actor.system?.credits ?? 0) || 0;
    const newCredits = normalizeCredits(currentCredits + resaleValue);

    swseLogger.debug('LedgerService.buildResaleDelta', {
      actor: actor.id,
      baseCost,
      resaleValue,
      currentCredits,
      newCredits
    });

    return {
      set: {
        'system.credits': newCredits
      }
    };
  }
}
