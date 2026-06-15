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

  static _actorById(id) {
    if (!id) return null;
    return game.actors?.get?.(String(id).replace(/^Actor\./, '')) ?? null;
  }

  static _ownerActorFromPayload(data = {}) {
    const approval = data.approval ?? {};
    const actor = data.ownerActor ?? this._actorById(data.ownerActorId)
      ?? this._actorById(approval.ownerActorId)
      ?? this._actorById(approval.requestedByActorId)
      ?? this._actorById(approval.actorId);
    if (actor && actor.id !== data.actor?.id) return actor;

    const target = data.targetActor ?? data.actor ?? this._actorById(data.targetActorId ?? approval.draftActorId);
    const system = target?.system ?? {};
    const flags = target?.flags ?? {};
    const swse = flags['foundryvtt-swse'] ?? flags.swse ?? {};
    const store = swse.storeAcquisition ?? flags.storeAcquisition ?? {};
    const pending = swse.pendingApproval ?? flags.pendingApproval ?? {};
    const candidates = [
      system.ownedByActorId,
      system.ownerActorId,
      system.storeAcquisition?.ownerActorId,
      system.storeAcquisition?.requestedByActorId,
      store.ownerActorId,
      store.requestedByActorId,
      pending.ownerActorId,
      pending.requestedByActorId,
      swse.ownerActorId,
      swse.requestedByActorId
    ];
    for (const id of candidates) {
      const owner = this._actorById(id);
      if (owner && owner.id !== target?.id) return owner;
    }
    return actor ?? null;
  }

  static _ownerUserFromPayload(data = {}) {
    const approval = data.approval ?? {};
    const explicitUserId = data.playerUserId ?? data.ownerUserId ?? approval.playerUserId ?? approval.ownerPlayerId ?? null;
    if (explicitUserId) {
      const user = game.users?.get?.(String(explicitUserId)) ?? Array.from(game.users ?? []).find(u => u?.id === String(explicitUserId));
      if (user && !user.isGM) return user;
    }

    const ownerActor = this._ownerActorFromPayload(data);
    if (ownerActor) {
      const assigned = Array.from(game.users ?? []).find(user => !user?.isGM && user.character?.id === ownerActor.id);
      if (assigned) return assigned;
      const owner = Array.from(game.users ?? []).find(user => !user?.isGM && Number(ownerActor.ownership?.[user.id] ?? 0) >= 3);
      if (owner) return owner;
    }

    const target = data.targetActor ?? data.actor ?? this._actorById(approval.draftActorId);
    const targetOwner = Array.from(game.users ?? []).find(user => !user?.isGM && Number(target?.ownership?.[user.id] ?? 0) >= 3 && user.character?.id !== target?.id);
    return targetOwner ?? null;
  }

  static _decisionLabel(decision) {
    const value = String(decision || '').toLowerCase();
    if (value === 'denied' || value === 'rejected') return 'denied';
    if (value === 'approved' || value === 'approve') return 'approved';
    return value || 'resolved';
  }

  static _assetRouteMetadata(data = {}, ownerActor = null) {
    const approval = data.approval ?? {};
    const targetActor = data.targetActor ?? data.actor ?? this._actorById(data.targetActorId ?? approval.draftActorId);
    const type = String(approval.type || targetActor?.type || '').toLowerCase();
    const bayMode = type.includes('droid') ? 'garage' : (type.includes('vehicle') || type.includes('ship') ? 'shipyard' : 'all');
    return {
      routeId: 'asset-bay',
      actionSurface: 'asset-bay',
      bayMode,
      ownerActorId: ownerActor?.id ?? approval.ownerActorId ?? null,
      targetActorId: targetActor?.id ?? approval.draftActorId ?? null,
      draftActorId: targetActor?.id ?? approval.draftActorId ?? null,
      approvalId: approval.id ?? null
    };
  }

  static async onApprovalResolved(data = {}) {
    const approval = data.approval ?? null;
    const decision = this._decisionLabel(data.decision);
    const targetActor = data.targetActor ?? data.actor ?? this._actorById(data.targetActorId ?? approval?.draftActorId);
    if (!approval || !decision) return;

    const ownerActor = this._ownerActorFromPayload(data);
    const ownerUser = this._ownerUserFromPayload(data);
    if (!ownerUser) {
      console.warn('[Holonet] Approvals emitter: approval has no resolvable owner user', {
        approvalId: approval.id,
        targetActorId: targetActor?.id,
        ownerActorId: ownerActor?.id
      });
      return;
    }

    const approvalId = approval.id ?? `${approval.type || 'approval'}-${targetActor?.id || Date.now()}`;
    const dedupeKey = `${approvalId}-${decision}`;
    const itemName = approval.draftData?.name || targetActor?.name || approval.itemName || 'custom item';
    const body = data.reason
      ? `Your ${itemName} request has been ${decision}. GM note: ${data.reason}`
      : `Your ${itemName} request has been ${decision}.`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.APPROVALS,
      categoryId: HolonetPreferences.CATEGORIES.APPROVALS,
      dedupeKey,
      createRecord: () => {
        const record = ApprovalsSource.createApprovalDecision({
          approvalId,
          playerUserId: ownerUser.id,
          decision,
          decidedBy: data.decidedBy,
          decisionNotes: data.reason ?? approval.reason ?? null,
          body,
          metadata: {
            itemName,
            cost: approval.costCredits,
            approvalType: approval.type,
            decision,
            ...this._assetRouteMetadata(data, ownerActor)
          }
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Approval emitted: ${itemName} - ${decision}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit approval decision:', result.reason);
    }
  }
}
