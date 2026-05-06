/**
 * Approvals Emitter
 *
 * Listens to approval decisions and emits into Holonet.
 * Hooks into GMStoreDashboard approval flow.
 *
 * Preference checks, deduplication, and publish are delegated to HolonetEmissionService.
 */

import { HolonetEmissionService } from '../subsystems/holonet-emission-service.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { ApprovalsSource } from '../sources/approvals-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { SOURCE_FAMILY } from '../contracts/enums.js';

export class ApprovalsEmitter {
  static #initialized = false;

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    Hooks.on('swseApprovalResolved', (data) => {
      this.onApprovalResolved(data).catch(err => {
        console.error('[Holonet] Approvals emitter failed:', err);
      });
    });

    console.log('[Holonet] Approvals emitter initialized');
  }

  static async onApprovalResolved(data) {
    const { approval, decision, actor, decidedBy } = data;
    if (!approval || !actor || !decision) return;

    const ownerUser = game.users?.find(u => u.character?.id === actor.id);
    if (!ownerUser) {
      console.warn('[Holonet] Approvals emitter: actor has no owner user', actor.id);
      return;
    }

    const dedupeKey = `${approval.id}-${decision}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.APPROVALS,
      categoryId: HolonetPreferences.CATEGORIES.APPROVALS,
      dedupeKey,
      createRecord: () => {
        const record = ApprovalsSource.createApprovalDecision({
          approvalId: approval.id,
          playerUserId: ownerUser.id,
          decision,
          decidedBy,
          body: `Your ${approval.type || 'custom item'} purchase has been ${decision}.`,
          metadata: {
            itemName: approval.draftData?.name,
            cost: approval.costCredits,
            approvalType: approval.type
          }
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Approval emitted: ${actor.name} - ${decision}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit approval decision:', result.reason);
    }
  }
}
