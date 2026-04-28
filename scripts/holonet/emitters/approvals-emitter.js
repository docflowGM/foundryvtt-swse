/**
 * Approvals Emitter
 *
 * Listens to approval decisions and emits into Holonet.
 * Hooks into GMStoreDashboard approval flow.
 */

import { HolonetEngine } from '../holonet-engine.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { ApprovalsSource } from '../sources/approvals-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class ApprovalsEmitter {
  static #initialized = false;
  static #lastEmittedApprovals = new Set(); // Deduplication

  /**
   * Initialize approvals emitter
   * Registers hook for swseApprovalResolved
   */
  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    // Hook into approval decision events
    Hooks.on('swseApprovalResolved', (data) => {
      this.onApprovalResolved(data).catch(err => {
        console.error('[Holonet] Approvals emitter failed:', err);
      });
    });

    console.log('[Holonet] Approvals emitter initialized');
  }

  /**
   * Emit approval decision notification
   */
  static async onApprovalResolved(data) {
    const { approval, decision, actor, decidedBy } = data;

    if (!approval || !actor || !decision) {
      return;
    }

    // Check preferences
    if (!HolonetPreferences.shouldNotify(HolonetPreferences.CATEGORIES.APPROVALS)) {
      return;
    }

    // Deduplication: skip if we just emitted this
    const dedupeKey = `${approval.id}-${decision}`;
    if (this.#lastEmittedApprovals.has(dedupeKey)) {
      return;
    }
    this.#lastEmittedApprovals.add(dedupeKey);
    // Clean up old entries after 100 to prevent memory leak
    if (this.#lastEmittedApprovals.size > 100) {
      const arr = Array.from(this.#lastEmittedApprovals);
      this.#lastEmittedApprovals = new Set(arr.slice(50));
    }

    // Get the player who owns this actor
    const ownerUser = game.users?.find(u => u.character?.id === actor.id);
    if (!ownerUser) {
      console.warn('[Holonet] Approvals emitter: actor has no owner user', actor.id);
      return;
    }

    try {
      // Create approval decision notification
      const decisionRecord = ApprovalsSource.createApprovalDecision({
        approvalId: approval.id,
        playerUserId: ownerUser.id,
        decision, // 'approved' or 'denied'
        decidedBy,
        body: `Your ${approval.type || 'custom item'} purchase has been ${decision}.`,
        metadata: {
          itemName: approval.draftData?.name,
          cost: approval.costCredits,
          approvalType: approval.type
        }
      });

      // Set audience to single player
      decisionRecord.audience = HolonetAudience.singlePlayer(ownerUser.id);

      // Publish
      await HolonetEngine.publish(decisionRecord);

      console.log(`[Holonet] Approval emitted: ${actor.name} - ${decision}`);
    } catch (err) {
      console.error('[Holonet] Failed to emit approval decision:', err);
    }
  }
}
