/**
 * DroidModificationApp — Live Droid Modification UI (Transaction Only)
 *
 * PHASE 4 STEP 4: Transaction UI for droid system modifications
 *
 * Responsibilities:
 * - Display available systems from DROID_SYSTEM_DEFINITIONS
 * - Show current credit balance
 * - Allow selecting systems to add/remove
 * - Validate all changes via DroidModificationFactory
 * - Route through MutationPlan → ActorEngine
 * - Display GM review pipeline prompt (PHASE 4 STEP 5)
 *
 * Non-responsibilities:
 * - No mutations directly applied
 * - No governance logic (that's ActorEngine)
 * - No UI-side cost authority
 * - No bypassing validation
 *
 * Result: Transaction ready for submission to GM review pipeline
 */

import { DroidModificationFactory } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-modification-factory.js";
import { DROID_SYSTEM_DEFINITIONS, getSystemsBySlot } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-system-definitions.js";
import { DroidTransactionService } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-transaction-service.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class DroidModificationApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedAdditions = new Set();
    this.selectedRemovals = new Set();
    this.mode = options.mode || 'modify'; // 'modify' or 'sell-only'
  }

  static DEFAULT_OPTIONS = {
    id: 'swse-droid-modification-app',
    classes: ['swse', 'swse-app', 'droid-modification-app', 'swse-theme-holo'],
    position: { width: 900, height: 700 },
    window: { resizable: true }
  };

  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/droid-modification/droid-modification-app.hbs'
    }
  };

  async _prepareContext(options) {
    const actor = this.actor;
    const currentCredits = Number(actor.system?.credits ?? 0) || 0;
    const installedSystems = actor.system?.installedSystems ?? {};
    const installedIds = Object.keys(installedSystems);

    // Organize available systems by slot
    const systemsBySlot = {};
    for (const [key, def] of Object.entries(DROID_SYSTEM_DEFINITIONS)) {
      const slot = def.slot;
      if (!systemsBySlot[slot]) {
        systemsBySlot[slot] = [];
      }
      systemsBySlot[slot].push({
        id: key,
        name: def.name,
        cost: def.cost,
        description: def.description,
        installed: installedIds.includes(key),
        resaleValue: Math.floor(def.cost * 0.5)
      });
    }

    // Sort systems within each slot
    for (const slot in systemsBySlot) {
      systemsBySlot[slot].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Organize installed systems
    const installed = installedIds.map(id => {
      const def = DROID_SYSTEM_DEFINITIONS[id];
      return {
        id,
        name: def?.name || id,
        cost: def?.cost || 0,
        resaleValue: def ? Math.floor(def.cost * 0.5) : 0,
        slot: def?.slot || 'unknown'
      };
    });

    // Calculate transaction
    const changeSet = {
      add: Array.from(this.selectedAdditions),
      remove: Array.from(this.selectedRemovals)
    };

    const planResult = DroidModificationFactory.planModifications(actor, changeSet);

    return {
      actor,
      currentCredits,
      systemsBySlot,
      installed,
      selectedAdditions: Array.from(this.selectedAdditions),
      selectedRemovals: Array.from(this.selectedRemovals),
      transaction: planResult,
      hasChanges: this.selectedAdditions.size > 0 || this.selectedRemovals.size > 0,
      isValid: planResult.valid,
      errorMessage: planResult.error,
      errorDetails: planResult.details || [],
      mode: this.mode,
      isSellOnly: this.mode === 'sell-only',
      modifyMode: this.mode === 'modify'
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) {return;}

    // System selection handlers
    root.querySelectorAll('[data-system-id]').forEach(el => {
      el.addEventListener('click', this.#onToggleSystem.bind(this));
    });

    // Action buttons
    root.querySelector('[data-action="submit"]')?.addEventListener('click', this.#onSubmit.bind(this));
    root.querySelector('[data-action="reset"]')?.addEventListener('click', this.#onReset.bind(this));
    root.querySelector('[data-action="close"]')?.addEventListener('click', () => this.close());
  }

  #onToggleSystem(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const systemId = el.dataset.systemId;
    const action = el.dataset.action;

    if (action === 'add-system') {
      if (this.selectedAdditions.has(systemId)) {
        this.selectedAdditions.delete(systemId);
      } else {
        this.selectedAdditions.add(systemId);
      }
    } else if (action === 'remove-system') {
      if (this.selectedRemovals.has(systemId)) {
        this.selectedRemovals.delete(systemId);
      } else {
        this.selectedRemovals.add(systemId);
      }
    }

    this.render({ force: true });
  }

  async #onSubmit(event) {
    event.preventDefault();

    if (!this.actor) {
      ui.notifications.error('No actor selected');
      return;
    }

    // Final validation
    let addSystems = Array.from(this.selectedAdditions);
    let removeSystems = Array.from(this.selectedRemovals);

    // PHASE 4 STEP 8: Enforce sell-only mode
    if (this.mode === 'sell-only') {
      if (addSystems.length > 0) {
        ui.notifications.error('Sell-only mode: cannot add new systems');
        return;
      }
      if (removeSystems.length === 0) {
        ui.notifications.error('Sell-only mode: select systems to sell');
        return;
      }
    }

    const changeSet = {
      add: addSystems,
      remove: removeSystems
    };

    const planResult = DroidModificationFactory.planModifications(this.actor, changeSet);

    if (!planResult.valid) {
      ui.notifications.error(`Modification failed validation: ${planResult.error}`);
      return;
    }

    if (!planResult.plan) {
      ui.notifications.error('Failed to build modification plan');
      return;
    }

    try {
      // PHASE 4 STEP 5: Route through GM review pipeline
      const submitResult = await DroidTransactionService.submitForReview(this.actor, planResult);

      if (!submitResult.success) {
        ui.notifications.error(`Failed to submit: ${submitResult.error}`);
        return;
      }

      // Log transaction for audit
      console.log('PHASE 4 STEP 5: Droid modification submitted for GM review', {
        transactionId: submitResult.transactionId,
        actor: this.actor.id,
        actorName: this.actor.name,
        added: planResult.summary.systemsAdded,
        removed: planResult.summary.systemsRemoved,
        netCost: planResult.summary.netCost,
        newBalance: planResult.summary.newCredits
      });

      ui.notifications.info('Modifications submitted for GM review!');
      this.close();

    } catch (error) {
      console.error('PHASE 4 STEP 5: Failed to submit for review', error);
      ui.notifications.error(`Failed to submit: ${error.message}`);
    }
  }

  #onReset(event) {
    event.preventDefault();
    this.selectedAdditions.clear();
    this.selectedRemovals.clear();
    this.render({ force: true });
  }
}
