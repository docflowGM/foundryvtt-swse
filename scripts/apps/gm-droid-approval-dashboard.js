/**
 * GM Droid Approval Dashboard
 * Phase 4: Approve/Reject pending custom droids
 *
 * Lists all droids in PENDING state across all player actors.
 * GM can review config and approve or reject with notes.
 */

import { SWSELogger } from '../utils/logger.js';

const { ApplicationV2 } = foundry.applications.api;

export class GMDroidApprovalDashboard extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'gm-droid-approval',
    tag: 'section',
    window: {
      title: 'Droid Approval Dashboard',
      width: 1000,
      height: 700,
      resizable: true
    },
    classes: ['swse', 'gm-dashboard', 'droid-approval-dashboard'],
    template: 'systems/foundryvtt-swse/templates/apps/gm-droid-approval-dashboard.hbs'
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
      const owner = game.users.get(actor.ownership[Object.keys(actor.ownership)[0]]);

      pendingDroids.push({
        actorId: actor.id,
        actorName: actor.name,
        ownerName: owner?.name || 'Unknown',
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

    // Deduct credits
    const currentCredits = Number(actor.system.credits) || 0;
    const cost = droidData.credits?.spent || 0;
    const newCredits = Math.max(0, currentCredits - cost);

    // Finalize droid
    const updates = {
      'system.credits': newCredits,
      'system.droidSystems.stateMode': 'FINALIZED'
    };

    try {
      await actor.update(updates);

      // Add history entry
      const buildHistory = droidData.buildHistory || [];
      buildHistory.push({
        timestamp: new Date().toISOString(),
        action: 'approved_by_gm',
        detail: `GM approved droid. Cost: ${cost} credits deducted.`
      });
      await actor.update({
        'system.droidSystems.buildHistory': buildHistory
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
      const dialog = new Dialog({
        title: 'Reject Droid',
        content: `
          <p>Provide a reason for rejection (optional):</p>
          <textarea id="rejection-reason" style="width: 100%; height: 60px; padding: 8px;"></textarea>
        `,
        buttons: {
          reject: {
            label: 'Reject',
            callback: (html) => {
              rejectionReason = html.find('#rejection-reason').val() || 'No reason provided.';
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
      // Revert to DRAFT
      const updates = {
        'system.droidSystems.stateMode': 'DRAFT'
      };

      await actor.update(updates);

      // Add history entry
      const buildHistory = droidData.buildHistory || [];
      buildHistory.push({
        timestamp: new Date().toISOString(),
        action: 'rejected_by_gm',
        detail: `GM rejected droid: ${rejectionReason}`
      });
      await actor.update({
        'system.droidSystems.buildHistory': buildHistory
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
