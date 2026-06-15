/**
 * GM Droid Approval Dashboard
 * Phase 4: Approve/Reject pending custom droids
 *
 * Lists all droids in PENDING state across all player actors.
 * GM can review config and approve or reject with notes.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";

export class GMDroidApprovalDashboard extends BaseSWSEAppV2 {
  static DEFAULT_OPTIONS = {
    id: 'gm-droid-approval',
    tag: 'section',
    window: {
      title: 'Droid Approval Dashboard',
      width: 1000,
      height: 700,
      resizable: true
    },
    classes: ['swse', 'gm-dashboard', 'droid-approval-dashboard']
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/gm-droid-approval-dashboard.hbs'
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

  async _prepareContext(options) {
    const pendingDroids = [];

    // Scan all actors for pending droids
    for (const actor of game.actors) {
      if (!actor.system?.droidSystems) continue;
      if (actor.system.droidSystems.stateMode !== 'PENDING') continue;

      const droidData = actor.system.droidSystems;
      const ownerActor = this._resolveDroidOwnerActor(actor);
      const ownerUser = ownerActor
        ? Array.from(game.users ?? []).find(user => !user?.isGM && user?.character?.id === ownerActor.id)
        : Array.from(game.users ?? []).find(user => !user?.isGM && Number(actor.ownership?.[user.id] ?? 0) >= 3);

      pendingDroids.push({
        actorId: actor.id,
        actorName: actor.name,
        ownerActorId: ownerActor?.id ?? null,
        ownerActorName: ownerActor?.name ?? null,
        ownerCredits: ownerActor?.system?.credits ?? 0,
        ownerName: ownerActor?.name || ownerUser?.name || 'Unknown',
        degree: droidData.degree || 'Unknown',
        size: droidData.size || 'Medium',
        locomotion: droidData.locomotion?.name || 'None',
        processor: droidData.processor?.name || 'None',
        armor: droidData.armor?.name || 'None',
        appendages: droidData.appendages?.length || 0,
        sensors: droidData.sensors?.length || 0,
        weapons: droidData.weapons?.length || 0,
        accessories: droidData.accessories?.length || 0,
        cost: droidData.credits?.spent || 0,
        createdAt: droidData.buildHistory?.[0]?.timestamp || 'Unknown'
      });
    }

    return {
      pendingDroids: pendingDroids,
      hasPending: pendingDroids.length > 0
    };
  }

  async _onRender(context, options) {
    // Phase 3: Enforce super._onRender call (AppV2 contract)
    await super._onRender(context, options);

    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    // Approve buttons
    root.querySelectorAll('.approve-droid-btn').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (!actorId) return;
        await this._approveDroid(actorId);
      });
    });

    // Reject buttons
    root.querySelectorAll('.reject-droid-btn').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (!actorId) return;
        await this._rejectDroid(actorId);
      });
    });

    // View details button
    root.querySelectorAll('.view-droid-details-btn').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (!actorId) return;
        const actor = game.actors.get(actorId);
        if (actor) {
          actor.sheet.render(true);
        }
      });
    });
  }


  _resolveDroidOwnerActor(actor) {
    if (!actor) return null;
    const droidSystems = actor.system?.droidSystems ?? {};
    const system = actor.system ?? {};
    const flags = actor.flags ?? {};
    const swseFlags = flags['foundryvtt-swse'] ?? flags.swse ?? {};
    const storeFlags = swseFlags.storeAcquisition ?? flags.storeAcquisition ?? {};
    const pendingFlags = swseFlags.pendingApproval ?? flags.pendingApproval ?? {};
    const candidates = [
      droidSystems.ownerActorId,
      droidSystems.requestedByActorId,
      droidSystems.builtForActorId,
      droidSystems.createdForActorId,
      system.ownedByActorId,
      system.ownerActorId,
      system.storeAcquisition?.requestedByActorId,
      system.storeAcquisition?.ownerActorId,
      storeFlags.ownerActorId,
      storeFlags.requestedByActorId,
      pendingFlags.ownerActorId,
      pendingFlags.requestedByActorId,
      swseFlags.ownerActorId,
      swseFlags.requestedByActorId
    ].filter(Boolean);

    for (const id of candidates) {
      const owner = game.actors?.get?.(String(id));
      if (owner && owner.id !== actor.id) return owner;
    }

    const ownerUserId = swseFlags.ownerPlayerId ?? storeFlags.ownerUserId ?? system.storeAcquisition?.ownerUserId ?? null;
    if (ownerUserId) {
      const ownerUser = game.users?.get?.(ownerUserId) ?? Array.from(game.users ?? []).find((user) => user?.id === ownerUserId);
      if (ownerUser?.character && ownerUser.character.id !== actor.id) return ownerUser.character;
    }

    const playerOwner = Array.from(game.users ?? []).find((user) => !user?.isGM && Number(actor.ownership?.[user.id] ?? 0) >= 3 && user.character?.id && user.character.id !== actor.id);
    return playerOwner?.character ?? null;
  }


  /**
   * Approve a pending droid
   * Deduct credits and finalize
   */
  async _approveDroid(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error('Actor not found.');
      return;
    }

    const droidData = actor.system.droidSystems;
    if (droidData.stateMode !== 'PENDING') {
      ui.notifications.warn('This droid is not pending approval.');
      return;
    }

    const cost = normalizeCredits(droidData.credits?.spent || droidData.totalCost || 0);
    const ownerActor = this._resolveDroidOwnerActor(actor);
    if (!ownerActor) {
      ui.notifications.error(`Cannot approve ${actor.name}: no owning character actor could be resolved for the credit charge.`);
      return;
    }

    try {
      let transactionId = null;
      if (cost > 0) {
        const creditResult = await TransactionEngine.executeCreditAdjustment({
          actor: ownerActor,
          amount: -cost,
          reason: `GM approved pending droid build: ${actor.name}`,
          transactionContext: 'store-custom-approval',
          audit: {
            approvalType: 'droid',
            itemName: actor.name,
            itemNames: [actor.name],
            itemCount: 1,
            ownerActorId: ownerActor.id,
            ownerActorName: ownerActor.name,
            draftActorId: actor.id,
            source: 'GM Droid Approval Dashboard - Pending Droid Approval'
          }
        }, {
          source: 'GMDroidApprovalDashboard._approveDroid',
          validate: true,
          rederive: true
        });

        if (!creditResult.success) {
          ui.notifications.error(`Failed to approve droid credits from ${ownerActor.name}: ${creditResult.error}`);
          return;
        }
        transactionId = creditResult.transactionId;
      }

      const buildHistory = droidData.buildHistory || [];
      buildHistory.push({
        timestamp: new Date().toISOString(),
        action: 'approved_by_gm',
        detail: `GM approved droid for ${ownerActor.name}. Cost: ${cost} credits deducted.`,
        ownerActorId: ownerActor.id,
        ownerActorName: ownerActor.name,
        transactionId
      });

      await ActorEngine.updateActor(actor, {
        'system.droidSystems.stateMode': 'FINALIZED',
        'system.droidSystems.buildHistory': buildHistory,
        'system.ownedByActorId': ownerActor.id,
        'system.ownedByActorName': ownerActor.name
      });

      Hooks.call('swseApprovalResolved', {
        approval: {
          id: `droid-${actor.id}`,
          type: 'droid',
          draftActorId: actor.id,
          ownerActorId: ownerActor.id,
          ownerActorName: ownerActor.name,
          costCredits: cost,
          draftData: { name: actor.name }
        },
        actor: ownerActor,
        ownerActor,
        ownerActorId: ownerActor.id,
        targetActor: actor,
        targetActorId: actor.id,
        decision: 'approved',
        decidedBy: game.user?.name ?? 'GM'
      });

      ui.notifications.info(`✓ Droid "${actor.name}" approved and finalized.`);
      SWSELogger.log('GM Droid Approval | Droid approved:', {
        actor: actor.name,
        cost: cost,
        owner: actor.ownership
      });

      await this.render();
    } catch (err) {
      SWSELogger.error('GM Droid Approval | Failed to approve droid:', err);
      ui.notifications.error('Failed to approve droid.');
    }
  }

  /**
   * Reject a pending droid
   * Revert to DRAFT state for player to edit
   */
  async _rejectDroid(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error('Actor not found.');
      return;
    }

    const droidData = actor.system.droidSystems;
    if (droidData.stateMode !== 'PENDING') {
      ui.notifications.warn('This droid is not pending approval.');
      return;
    }

    // Prompt for rejection reason
    let rejectionReason = '';
    await new Promise(resolve => {
      const dialog = new SWSEDialogV2({
        title: 'Reject Droid',
        content: `
          <p>Provide a reason for rejection (optional):</p>
          <textarea id="rejection-reason" style="width: 100%; height: 60px; padding: 8px;"></textarea>
        `,
        buttons: {
          reject: {
            label: 'Reject',
            callback: (html) => {
              rejectionReason = html.querySelector('#rejection-reason').value || 'No reason provided.';
              resolve();
            }
          },
          cancel: {
            label: 'Cancel',
            callback: () => {
              rejectionReason = null;
              resolve();
            }
          }
        },
        default: 'reject'
      });
      dialog.render(true);
    });

    if (rejectionReason === null) return;

    try {
      const ownerActor = this._resolveDroidOwnerActor(actor);
      // Revert to DRAFT
      const updates = {
        'system.droidSystems.stateMode': 'DRAFT'
      };

      await ActorEngine.updateActor(actor, updates);

      // Add history entry
      const buildHistory = droidData.buildHistory || [];
      buildHistory.push({
        timestamp: new Date().toISOString(),
        action: 'rejected_by_gm',
        detail: `GM rejected droid: ${rejectionReason}`
      });
      await ActorEngine.updateActor(actor, {
        'system.droidSystems.buildHistory': buildHistory
      });

      Hooks.call('swseApprovalResolved', {
        approval: {
          id: `droid-${actor.id}`,
          type: 'droid',
          draftActorId: actor.id,
          ownerActorId: ownerActor?.id ?? null,
          ownerActorName: ownerActor?.name ?? null,
          draftData: { name: actor.name }
        },
        actor: ownerActor ?? actor,
        ownerActor,
        ownerActorId: ownerActor?.id ?? null,
        targetActor: actor,
        targetActorId: actor.id,
        decision: 'denied',
        decidedBy: game.user?.name ?? 'GM',
        reason: rejectionReason
      });

      ui.notifications.warn(`Droid "${actor.name}" rejected. Player can edit and resubmit.`);
      SWSELogger.log('GM Droid Approval | Droid rejected:', {
        actor: actor.name,
        reason: rejectionReason,
        owner: actor.ownership
      });

      await this.render();
    } catch (err) {
      SWSELogger.error('GM Droid Approval | Failed to reject droid:', err);
      ui.notifications.error('Failed to reject droid.');
    }
  }

  /**
   * Static method to open dashboard
   */
  static open() {
    const app = new GMDroidApprovalDashboard();
    app.render(true);
  }
}
