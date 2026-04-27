/**
 * Vehicle Customization Application
 *
 * Phase 5: Dedicated vehicle customization UI
 *
 * Edit/customize surface for owned vehicles (not construction, not modification builder).
 * Allows crew to add/remove vehicle systems with immediate ActorEngine-based mutations.
 *
 * ROUTING: Vehicles route to this app, NOT generic first-wave customization.
 * This ensures vehicles are treated as their own category with their own rules path.
 *
 * MUTATION AUTHORITY:
 * The UI is ONLY a viewer/requester.
 * It may:
 * - Load current vehicle state
 * - Display available systems
 * - Request previews from engine
 * - Submit apply requests to engine
 * It must NOT:
 * - Directly mutate vehicle actor/system state
 * - Perform authoritative cost math
 * - Bypass ActorEngine
 *
 * REUSE COMMITMENT:
 * All system definitions, prices, and compatibility come from the existing
 * vehicle system authority (VEHICLE_SYSTEM_DEFINITIONS). The UI displays these values
 * but does not own or compute them independently.
 */

import { ModificationModalShell } from "/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js";
import { VehicleCustomizationEngine } from "/systems/foundryvtt-swse/scripts/engine/customization/vehicle-customization-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { getActorSheetTheme, buildActorSheetThemeStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import { getActorSheetMotionStyle, buildActorSheetMotionStyle } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-motion-registry.js";

export class VehicleCustomizationApp extends ModificationModalShell {
  constructor(actor, options = {}) {
    super(actor, null, options);
    this.actor = actor;
    this.selectedAdditions = new Set();
    this.selectedRemovals = new Set();
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}),
    {
      id: "swse-vehicle-customization",
      classes: ["swse", "vehicle-customization", "swse-theme-holo"],
      window: {
        icon: "fas fa-ship",
        title: "Vehicle Customization",
        resizable: true
      },
      position: { width: 1000, height: 750 }
    }
  );

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/applications/vehicle/vehicle-customization.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Load theme and motion styles (reuse same authority as other v2 windows)
    const themeKey = getActorSheetTheme(this.actor?.getFlag?.('foundryvtt-swse', 'sheetTheme'));
    const motionStyle = getActorSheetMotionStyle(this.actor?.getFlag?.('foundryvtt-swse', 'sheetMotionStyle'));
    const themeStyleInline = buildActorSheetThemeStyle(themeKey);
    const motionStyleInline = buildActorSheetMotionStyle(motionStyle);

    // Get vehicle profile and customization state
    const profileResult = VehicleCustomizationEngine.getNormalizedVehicleProfile(this.actor);
    const stateResult = VehicleCustomizationEngine.getVehicleCustomizationState(this.actor);

    if (!profileResult.success || !stateResult.success) {
      return {
        ...context,
        actor: this.actor,
        error: 'Failed to load vehicle customization state',
        themeStyleInline,
        motionStyleInline
      };
    }

    // Build system groups by slot for UI display
    // All system definitions come from vehicle system authority (VehicleCustomizationEngine)
    const systemsBySlot = {};
    for (const sys of stateResult.systems) {
      if (!systemsBySlot[sys.slot]) {
        systemsBySlot[sys.slot] = [];
      }
      systemsBySlot[sys.slot].push({
        ...sys,
        selected: this.selectedAdditions.has(sys.id),
        markedForRemoval: this.selectedRemovals.has(sys.id),
        compatible: sys.compatible
      });
    }

    // Build preview from current selections
    const changeSet = {
      add: Array.from(this.selectedAdditions),
      remove: Array.from(this.selectedRemovals)
    };
    const preview = VehicleCustomizationEngine.previewVehicleCustomization(this.actor, changeSet);

    return {
      ...context,
      actor: this.actor,
      profile: profileResult.profile,
      systemsBySlot,
      selectedAdditions: Array.from(this.selectedAdditions),
      selectedRemovals: Array.from(this.selectedRemovals),
      hasChanges: this.selectedAdditions.size > 0 || this.selectedRemovals.size > 0,
      preview: preview.success ? preview.preview : null,
      previewError: !preview.success ? preview.error : null,
      currentCredits: this.actor.system?.credits ?? 0,
      themeStyleInline,
      motionStyleInline
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
      const result = await VehicleCustomizationEngine.applyVehicleCustomization(this.actor, changeSet);

      if (!result.success) {
        ui.notifications.error(`Failed to apply customization: ${result.error}`);
        return;
      }

      ui.notifications.info('Vehicle customization applied!');
      this.close();
      this.actor?.sheet?.render?.(true);
    } catch (err) {
      SWSELogger.error('Vehicle customization apply failed:', err);
      ui.notifications.error('Unexpected error during vehicle customization.');
    }
  }

  #onReset() {
    this.selectedAdditions.clear();
    this.selectedRemovals.clear();
    this.render({ force: true });
  }
}
