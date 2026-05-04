/**
 * Droid Customization Application
 *
 * Phase 4: Dedicated droid customization UI
 *
 * Edit/customize surface for owned droids (not construction, not GM review).
 * Allows players to add/remove droid systems with immediate ActorEngine-based mutations.
 *
 * ROUTING: Droids route to this app, NOT generic first-wave customization.
 * This ensures droids are treated as their own category with their own rules path.
 *
 * MUTATION AUTHORITY:
 * The UI is ONLY a viewer/requester.
 * It may:
 * - Load current droid state
 * - Display available systems
 * - Request previews from engine
 * - Submit apply requests to engine
 * It must NOT:
 * - Directly mutate droid actor/system state
 * - Perform authoritative cost math
 * - Bypass ActorEngine
 *
 * REUSE COMMITMENT:
 * All system definitions, prices, and eligibility come from the existing
 * droid chargen authority (DROID_SYSTEMS). The UI displays these values
 * but does not own or compute them independently.
 */

import { ModificationModalShell } from "/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js";
import { DroidCustomizationEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/droid-customization-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";

export class DroidCustomizationApp extends ModificationModalShell {
  constructor(actor, options = {}) {
    super(actor, null, options);
    this.actor = actor;
    this.selectedAdditions = new Set();
    this.selectedRemovals = new Set();
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}),
    {
      id: "swse-droid-customization",
      classes: ["swse", "droid-customization", "swse-theme-holo"],
      window: {
        icon: "fas fa-robot",
        title: "Droid Customization",
        resizable: true
      },
      position: { width: 900, height: 700 }
    }
  );

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/applications/droid/droid-customization.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Load theme and motion styles (reuse same authority as other v2 windows)
    const shellContext = ThemeResolutionService.buildSurfaceContext({ actor: this.actor });

    // Get droid profile and available systems
    const profileResult = DroidCustomizationEngine.getNormalizedDroidProfile(this.actor);
    const availableResult = DroidCustomizationEngine.getAvailableSystems(this.actor);

    if (!profileResult.success || !availableResult.success) {
      return {
        ...context,
        actor: this.actor,
        error: 'Failed to load droid customization state',
        ...shellContext
      };
    }

    // Build system groups for UI display
    // All system definitions come from chargen authority (DroidCustomizationEngine)
    const systemsByType = {};
    for (const sys of availableResult.systems) {
      if (!systemsByType[sys.type]) {
        systemsByType[sys.type] = [];
      }
      systemsByType[sys.type].push({
        ...sys,
        selected: this.selectedAdditions.has(sys.id),
        markedForRemoval: this.selectedRemovals.has(sys.id)
      });
    }

    // Build preview from current selections
    const changeSet = {
      add: Array.from(this.selectedAdditions),
      remove: Array.from(this.selectedRemovals)
    };
    const preview = DroidCustomizationEngine.previewDroidCustomization(this.actor, changeSet);

    return {
      ...context,
      actor: this.actor,
      profile: profileResult.profile,
      systemsByType,
      selectedAdditions: Array.from(this.selectedAdditions),
      selectedRemovals: Array.from(this.selectedRemovals),
      hasChanges: this.selectedAdditions.size > 0 || this.selectedRemovals.size > 0,
      preview: preview.success ? preview.preview : null,
      previewError: !preview.success ? preview.error : null,
      currentCredits: this.actor.system?.credits ?? 0,
      ...shellContext
    };
  }

  attachEventListeners(root) {
    if (!(root instanceof HTMLElement)) return;

    // System selection handlers
    root.querySelectorAll('[data-system-id]').forEach(el => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        const systemId = el.dataset.systemId;
        const action = el.dataset.action;

        if (action === 'add') {
          if (this.selectedAdditions.has(systemId)) {
            this.selectedAdditions.delete(systemId);
          } else {
            this.selectedAdditions.add(systemId);
          }
        } else if (action === 'remove') {
          if (this.selectedRemovals.has(systemId)) {
            this.selectedRemovals.delete(systemId);
          } else {
            this.selectedRemovals.add(systemId);
          }
        }

        this.render({ force: true });
      });
    });

    // Action buttons
    root.querySelector('[data-action="apply"]')?.addEventListener('click', () => this.#onApply());
    root.querySelector('[data-action="reset"]')?.addEventListener('click', () => this.#onReset());
    root.querySelector('[data-action="close"]')?.addEventListener('click', () => this.close());
  }

  async #onApply() {
    try {
      const changeSet = {
        add: Array.from(this.selectedAdditions),
        remove: Array.from(this.selectedRemovals)
      };

      // Request engine to apply changes through ActorEngine
      const result = await DroidCustomizationEngine.applyDroidCustomization(this.actor, changeSet);

      if (!result.success) {
        ui.notifications.error(`Failed to apply customization: ${result.error}`);
        return;
      }

      ui.notifications.info('Droid customization applied!');
      this.close();
      this.actor?.sheet?.render?.(true);
    } catch (err) {
      SWSELogger.error('Droid customization apply failed:', err);
      ui.notifications.error('Unexpected error during droid customization.');
    }
  }

  #onReset() {
    this.selectedAdditions.clear();
    this.selectedRemovals.clear();
    this.render({ force: true });
  }
}
