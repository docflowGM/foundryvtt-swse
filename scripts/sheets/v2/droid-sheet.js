// scripts/sheets/v2/droid-sheet.js

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { DropResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";
import { applyResourceBarAnimations } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/resource-bar-animations.js";
import { computeCenteredPosition, getApplicationTargetSize } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
import { PortraitUploadController } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/PortraitUploadController.js";
import { UIStateManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/UIStateManager.js";
import { DroidSheetContextBuilder } from "/systems/foundryvtt-swse/scripts/sheets/v2/droid-sheet/context-builder.js";
import { wireDroidSheetListeners } from "/systems/foundryvtt-swse/scripts/sheets/v2/droid-sheet/listeners.js";
import { diagnoseLivePanelContext } from "/systems/foundryvtt-swse/scripts/sheets/v2/droid-sheet/panel-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function markActiveConditionStep(root, actor) {
  if (!(root instanceof HTMLElement)) return;
  const current = Number(actor?.system?.derived?.damage?.conditionStep ?? actor?.system?.conditionTrack?.current ?? 0);
  for (const el of root.querySelectorAll('.swse-v2-condition-step')) {
    const s = Number(el.dataset?.step);
    if (Number.isFinite(s) && s === current) el.classList.add('active');
  }
}

export class SWSEV2DroidSheet extends
  HandlebarsApplicationMixin(DocumentSheetV2) {

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/droid/v2/droid-sheet.hbs"
    }
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["swse", "sheet", "actor", "droid", "swse-sheet", "swse-droid-sheet", "v2"],
    width: 820,
    height: 920,
    window: {
      resizable: true
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: false
    }
  };

  /**
   * Convenience getter for accessing the actor document
   * Used throughout the sheet as this.actor instead of this.document
   */
  get actor() {
    return this.document;
  }

  constructor(document, options = {}) {
    super(document, options);

    // Preserves interactive UI state (active tabs, scroll, focus) across rerenders.
    this.uiStateManager = new UIStateManager(this);
  }

  async render(...args) {
    // Capture interactive state before Foundry tears down the DOM so we can
    // restore tabs/scroll/focus once _onRender finishes.
    this.uiStateManager?.captureState();
    return super.render(...args);
  }

  async _onClose(options) {
    this._renderAbort?.abort();
    this.uiStateManager?.clear();
    return super._onClose?.(options);
  }

  async _prepareContext(options) {

    const actor = this.document;

    if (actor.type !== "droid") {
      throw new Error(
        `SWSEV2DroidSheet requires actor type "droid", got "${actor.type}"`
      );
    }

    RenderAssertions.assertActorValid(actor, "SWSEV2DroidSheet");

    const baseContext = await super._prepareContext(options);

    // Phase 2: panel-shaped context construction now lives in the builder.
    // The builder preserves every key the live template + its partials
    // consume; droid-only panel payloads (locomotion, protocols, programming,
    // customizations, build history, etc.) are exposed under `droidPanels`.
    const builder = new DroidSheetContextBuilder(actor);
    const overrides = {
      ...builder.build(),
      editable: this.isEditable
    };

    RenderAssertions.assertContextSerializable(
      overrides,
      "SWSEV2DroidSheet"
    );

    const merged = { ...baseContext, ...overrides };

    // Phase 2: minimal live-path panel registry — flag drift (does not throw)
    // so contract regressions surface in the console without breaking render.
    try {
      const { report, durationMs } = diagnoseLivePanelContext(merged, {
        actorId: actor?.id,
        actorName: actor?.name
      });
      if (!report.ok) {
        SWSELogger.warn("SWSE | SWSEV2DroidSheet panel contract drift", {
          actorId: actor?.id,
          missing: report.missing,
          durationMs
        });
      }
    } catch (err) {
      SWSELogger.error("SWSE | SWSEV2DroidSheet panel diagnostics failed", err);
    }

    return merged;
  }

  /**
   * Post-render hook: Attach event listeners, NOT manipulate DOM
   *
   * RULES FOR _onRender():
   * ✓ Traverse DOM with querySelector/querySelectorAll
   * ✓ Attach event listeners via addEventListener
   * ✓ Read data attributes and CSS classes
   * ✗ Do NOT mutate DOM (add/remove/modify elements)
   * ✗ Do NOT change CSS classes or styles
   * ✗ Do NOT set textContent or innerHTML
   *
   * If you need to change what renders: update actor data in _updateObject(),
   * which triggers a re-render with new _prepareContext() data.
   */
  async _onRender(context, options) {
    // ═══ FIX: Center on initial render (first time ever or after close/reopen) ═══
    // Use dynamic dimensions instead of hardcoding 820x920
    const isFirstRenderEver = !this.rendered;
    if (isFirstRenderEver) {
      this._hasBeenRendered = true;
      this._shouldCenterOnRender = true;
    }

    const shouldCenter = this._shouldCenterOnRender;
    if (shouldCenter) {
      const { width: targetWidth, height: targetHeight } = getApplicationTargetSize(this);
      const pos = computeCenteredPosition(targetWidth, targetHeight);
      this.setPosition({ left: pos.left, top: pos.top });
      this._shouldCenterOnRender = false;
    }

    // Phase 3: Enforce super._onRender call (AppV2 contract)
    await super._onRender(context, options);

    // Restore tabs/scroll/focus that were captured before super.render().
    this.uiStateManager?.restoreState();

    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error("DroidSheet: element not HTMLElement");
    }

    // Abort previous render's listeners to prevent duplicate event handlers
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    RenderAssertions.assertDOMElements(
      root,
      [".sheet-tabs", ".sheet-body"],
      "SWSEV2DroidSheet"
    );

    markActiveConditionStep(root, this.actor);
    applyResourceBarAnimations(this, root);

    // Portrait upload + auto-apply (click via data-edit="img", drag/drop here)
    PortraitUploadController.bind(root, { actor: this.actor, signal });

    // Phase 2: All listener wiring lives in scripts/sheets/v2/droid-sheet/listeners.js.
    // wireDroidSheetListeners preserves the original `_onRender` order so init
    // sequencing (tab handling first, drag/drop last) is unchanged.
    wireDroidSheetListeners(this, root, signal);

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2DroidSheet"
    );
  }

  /* -------- -------- -------- -------- -------- -------- -------- -------- */
  /* DRAG & DROP HANDLING (Sovereign via DropResolutionEngine)                 */
  /* -------- -------- -------- -------- -------- -------- -------- -------- */

  async _onDrop(event) {
    event.preventDefault();

    // Extract drag data
    const data = TextEditor.getDragEventData(event);
    if (!data) return;

    // Check if this is an actor drop
    let droppedDocument = null;
    if (data.uuid) {
      try {
        droppedDocument = await fromUuid(data.uuid);
      } catch (err) {
        // Not a valid UUID, treat as item drop
      }
    }

    // ACTOR DROP: Check if GM can adopt
    if (droppedDocument && droppedDocument.documentName === 'Actor') {
      return this._handleActorDrop(droppedDocument);
    }

    // ITEM DROP: Use standard resolution
    const result = await DropResolutionEngine.resolve({
      actor: this.actor,
      dropData: data
    });

    // If no plan (duplicate or invalid), silently skip
    if (!result || !result.mutationPlan) return;

    // Apply mutations via sovereign ActorEngine
    try {
      await ActorEngine.apply(this.actor, result.mutationPlan);
      // UI feedback: pulse the target tab
      if (result.uiTargetTab) {
        this._pulseTab(result.uiTargetTab);
      }
    } catch (err) {
      console.error('Drop application failed:', err);
      ui?.notifications?.error?.(`Failed to add dropped item: ${err.message}`);
    }
  }

  async _handleActorDrop(droppedActor) {
    if (droppedActor.type !== this.actor.type || !game.user.isGM) {
      return this._addActorRelationship(droppedActor);
    }
    new AdoptOrAddDialog(droppedActor, async (choice) => {
      if (choice === "add") {
        await this._addActorRelationship(droppedActor);
      } else if (choice === "adopt") {
        await this._adoptActor(droppedActor);
      }
    }).render(true);
  }

  async _addActorRelationship(actor) {
    const relationships = this.actor.system?.relationships ?? [];
    const alreadyLinked = relationships.some(r => r.uuid === actor.uuid);
    if (alreadyLinked) {
      console.debug(`Already linked: ${actor.name}`);
      return;
    }
    const mutationPlan = {
      update: {
        'system.relationships': [...relationships, { uuid: actor.uuid, name: actor.name, type: actor.type }]
      }
    };
    try {
      await ActorEngine.apply(this.actor, mutationPlan);
    } catch (err) {
      console.error('Failed to add actor relationship:', err);
      ui?.notifications?.error?.(`Failed to add relationship: ${err.message}`);
    }
  }

  async _adoptActor(sourceActor) {
    const mutationPlan = AdoptionEngine.buildAdoptionPlan({
      targetActor: this.actor,
      sourceActor: sourceActor
    });
    if (!mutationPlan) {
      ui?.notifications?.warn?.(`Cannot adopt from ${sourceActor.name}`);
      return;
    }
    try {
      await ActorEngine.apply(this.actor, mutationPlan);
      ui?.notifications?.info?.(`${this.actor.name} adopted stat block from ${sourceActor.name}`);
    } catch (err) {
      console.error('Adoption failed:', err);
      ui?.notifications?.error?.(`Adoption failed: ${err.message}`);
    }
  }

  /**
   * Pulse tab for UI feedback on drop success
   *
   * @private
   * @param {string} tabName - tab identifier to pulse
   */
  _pulseTab(tabName) {
    if (!tabName) return;

    const tabButton = this.element?.querySelector(`[data-tab="${tabName}"]`);
    if (!tabButton) return;

    tabButton.classList.add('tab-pulse');

    setTimeout(() => {
      tabButton.classList.remove('tab-pulse');
    }, 800);
  }

  /* ------------------------------------------------------------------------ */
  /* FORM UPDATE ROUTING                                                      */
  /* ------------------------------------------------------------------------ */

  async _onSubmitForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const formDataObj = Object.fromEntries(formData.entries());
    const expanded = foundry.utils.expandObject(formDataObj);

    if (!expanded) {return;}

    try {
      // CRITICAL: Include ALL fields (name, system, etc.) not just system.
      // Route directly through governance layer to bypass Foundry's actor.update()
      await ActorEngine.updateActor(this.actor, expanded);
    } catch (err) {
      console.error('Sheet submission failed:', err);
      ui.notifications.error(`Failed to update actor: ${err.message}`);
    }
  }
}