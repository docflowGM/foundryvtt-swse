// scripts/sheets/v2/droid-sheet.js
// @deprecated Droid actor sheets now use SWSEV2CharacterSheet and the actor
// holopad shell. This droid-only sheet stack is intentionally orphaned and
// must not be registered for actor type "droid". Reuse data helpers from this
// folder only when migrating read-only Droid Systems content into the actor
// sheet.

const { HandlebarsApplicationMixin } = foundry.applications.api;

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
import { registerCustomSkillsHelpers } from "/systems/foundryvtt-swse/scripts/sheets/v2/custom-skills-helpers.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { ShellHostMixin } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellHost.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { HomeSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/HomeSurfaceController.js";
import { StoreSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/StoreSurfaceController.js";
import { SettingsSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/SettingsSurfaceController.js";
import { GamesSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/GamesSurfaceController.js";
import { AlliesSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/AlliesSurfaceController.js";
import { MessengerSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/MessengerSurfaceController.js";

export class SWSEV2DroidSheet extends
  ShellHostMixin(HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)) {

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/droid/v2/droid-sheet.hbs"
    }
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: [
      "application",
      "swse",
      "sheet",
      "actor",
      "droid",
      "swse-sheet",
      "swse-sheet-ui",
      "swse-droid-sheet",
      "swse-droid-sheet--concept",
      "v2"
    ],
    position: {
      width: 900,
      height: 950
    },
    window: {
      resizable: true,
      draggable: true,
      frame: false
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: false
    },
    // The shared holopad/shell owns tab and surface routing.
    tabs: []
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

    // Match the actor concept V2 contract: the shared holopad home surface is
    // the first-class view. The sheet itself is just one shell surface.
    this._shellSurface = 'home';
    this._shellSurfaceOptions = {};
    this._ensureShellSurfaceState?.();

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
    this._homeController?.destroy?.();
    this._storeSurfaceController?.destroy?.();
    this._settingsSurfaceController?.destroy?.();
    this._gamesSurfaceController?.destroy?.();
    this._alliesSurfaceController?.destroy?.();
    this._messengerSurfaceController?.destroy?.();

    if (this.actor?.id) {
      import('/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js')
        .then(({ ShellRouter }) => ShellRouter.unregister(this.actor.id))
        .catch(() => {});
      import('/systems/foundryvtt-swse/scripts/ui/shell/ProgressionSurfaceAdapter.js')
        .then(({ ProgressionSurfaceAdapter }) => ProgressionSurfaceAdapter.destroy(this.actor.id))
        .catch(() => {});
      import('/systems/foundryvtt-swse/scripts/ui/shell/WorkbenchSurfaceAdapter.js')
        .then(({ WorkbenchSurfaceAdapter }) => WorkbenchSurfaceAdapter.destroy(this.actor.id))
        .catch(() => {});
      import('/systems/foundryvtt-swse/scripts/ui/shell/CustomizationSurfaceAdapter.js')
        .then(({ CustomizationSurfaceAdapter }) => CustomizationSurfaceAdapter.destroy(this.actor.id))
        .catch(() => {});
    }

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

    // Register Handlebars helpers for custom skills (droid sheets can have custom skills too)
    registerCustomSkillsHelpers();

    const baseContext = await super._prepareContext(options);

    // Phase 2: panel-shaped context construction now lives in the builder.
    // The builder preserves every key the live template + its partials
    // consume; droid-only panel payloads (locomotion, protocols, programming,
    // customizations, build history, etc.) are exposed under `droidPanels`.
    const builder = new DroidSheetContextBuilder(actor);
    const overrides = {
      ...builder.build(),
      editable: this.isEditable,
      customSkillsEditable: this.isEditable
    };

    RenderAssertions.assertContextSerializable(
      overrides,
      "SWSEV2DroidSheet"
    );

    const merged = { ...baseContext, ...overrides };

    // Action Economy Context (for combat tab)
    let actionEconomy = null;
    if (game.combat && game.combat.combatants.some(c => c.actor?.id === actor.id)) {
      // Only show action economy if actor is in active combat
      const combatId = game.combat.id;
      const { ActionEconomyPersistence } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js");
      const { ActionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js");

      const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
      const state = ActionEngine.getVisualState(turnState);
      const breakdown = ActionEngine.getTooltipBreakdown(turnState);
      const enforcementMode = HouseRuleService.getString('actionEconomyMode', 'loose');

      actionEconomy = {
        state,
        breakdown,
        enforcementMode
      };
    }

    merged.actionEconomy = actionEconomy;

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
   * Post-render hook for event wiring and shared-shell chrome behavior.
   *
   * Actor/system data must not be corrected by render-time DOM mutation. The
   * only class/style changes allowed here are transient shell chrome state
   * changes such as tablet expand/drag/resize controls. Rendered actor content
   * must still come from _prepareContext().
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
    if (this._shellSurface === 'sheet') {
      this.uiStateManager?.restoreState();
    }
    this._shellUiStatePreserver?.restore?.(this.element, { surfaceId: this._shellSurface });

    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error("DroidSheet: element not HTMLElement");
    }

    // Abort previous render's listeners to prevent duplicate event handlers
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    if (this._shellSurface === 'sheet') {
      RenderAssertions.assertDOMElements(
        root,
        [".sheet-tabs", ".sheet-body"],
        "SWSEV2DroidSheet"
      );

      applyResourceBarAnimations(this, root);
    }

    const sheetThemeContext = ThemeResolutionService.applyToElement(root, { actor: this.actor });
    const sheetShell = root.querySelector?.('.swse-sheet-v2-shell');
    if (sheetShell) {
      ThemeResolutionService.applyToElement(sheetShell, {
        actor: this.actor,
        themeKey: sheetThemeContext.themeKey,
        motionStyle: sheetThemeContext.motionStyle,
        surfaceStyleInline: sheetThemeContext.surfaceStyleInline,
        themeStyleInline: sheetThemeContext.themeStyleInline,
        motionStyleInline: sheetThemeContext.motionStyleInline
      });
    }

    // Portrait upload + auto-apply (click via data-edit="img", drag/drop here)
    PortraitUploadController.bind(root, { actor: this.actor, signal });

    this._wireDroidShellSurfaceEvents(root, signal);

    // Phase 2: All listener wiring lives in scripts/sheets/v2/droid-sheet/listeners.js.
    // wireDroidSheetListeners preserves the original `_onRender` order so init
    // sequencing (tab handling first, drag/drop last) is unchanged.
    if (this._shellSurface === 'sheet') {
      wireDroidSheetListeners(this, root, signal);
    }

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2DroidSheet"
    );
  }

  /**
   * Wire Droid-specific shell chrome and inline-surface controllers.
   *
   * Generic shell navigation is intentionally owned by ShellHostMixin. Do not
   * override `_wireShellEvents`; super._onRender() calls the mixin method so
   * all shared shell behavior (notifications drawer, overlay actions, Holonet
   * home-card routing, close drawer, return home/sheet) stays in one place.
   */
  _wireDroidShellSurfaceEvents(root = null, signal = null) {
    if (!(root instanceof HTMLElement)) return;

    // Droid-only tablet hardware controls. Shared shell actions are wired by
    // ShellHostMixin._wireShellEvents() during super._onRender().
    root.querySelector('[data-action="tablet-close"]')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.close();
    }, { signal });

    root.querySelectorAll('[data-action="tablet-home"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.setSurface('home');
        await this.requestSurfaceRender({ reason: 'droid-tablet-home', surfaceId: 'home' });
      }, { signal });
    });

    root.querySelector('[data-action="tablet-expand"]')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      root.classList.toggle('swse-tablet-expanded');
    }, { signal });

    this._wireTabletWindowDrag(root, signal);
    this._wireTabletWindowResize(root, signal);

    if (this._shellSurface === 'progression' || this._shellSurface === 'chargen') {
      this._wireProgressionSurfaceEvents(root, signal);
    }
    if (this._shellSurface === 'workbench') {
      this._wireWorkbenchSurfaceEvents(root, signal);
    }
    if (this._shellSurface === 'store') {
      this._storeSurfaceController ??= new StoreSurfaceController(this, this.actor);
      this._storeSurfaceController.attach(root);
    } else {
      this._storeSurfaceController?.destroy?.();
    }
    if (this._shellSurface === 'settings') {
      this._wireSettingsSurfaceEvents(root, signal);
    }
    if (this._shellSurface === 'games') {
      this._gamesSurfaceController ??= new GamesSurfaceController(this, this.actor);
      this._gamesSurfaceController.attach(root);
    } else {
      this._gamesSurfaceController?.destroy?.();
    }
    if (this._shellSurface === 'allies') {
      this._alliesSurfaceController ??= new AlliesSurfaceController(this, this.actor);
      this._alliesSurfaceController.attach(root);
    } else {
      this._alliesSurfaceController?.destroy?.();
    }
  }


  _wireTabletWindowDrag(root, signal) {
    const dragHandles = root.querySelectorAll('[data-action="tablet-drag"], [data-shell-chrome="top"]');
    if (!dragHandles.length) return;

    const isInteractive = (target) => !!target?.closest?.('button, input, select, textarea, a, [contenteditable="true"], [data-route-id], [data-shell-action]');

    dragHandles.forEach((handle) => {
      handle.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0 || isInteractive(ev.target)) return;
        ev.preventDefault();
        const startX = ev.clientX;
        const startY = ev.clientY;
        const rect = root.getBoundingClientRect();
        const startLeft = Number(this.position?.left ?? rect.left ?? 0);
        const startTop = Number(this.position?.top ?? rect.top ?? 0);

        const move = (moveEv) => {
          const left = Math.round(startLeft + (moveEv.clientX - startX));
          const top = Math.round(startTop + (moveEv.clientY - startY));
          this.setPosition({ left, top });
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up, { once: true });
      }, { signal });
    });
  }

  _wireTabletWindowResize(root, signal) {
    const resizeZones = root.querySelectorAll('[data-action="tablet-resize"]');
    if (!resizeZones.length) return;

    resizeZones.forEach((zone) => {
      zone.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        ev.stopPropagation();
        const dir = String(zone.dataset.resizeDir || 'se');
        const startX = ev.clientX;
        const startY = ev.clientY;
        const rect = root.getBoundingClientRect();
        const startLeft = Number(this.position?.left ?? rect.left ?? 0);
        const startTop = Number(this.position?.top ?? rect.top ?? 0);
        const startWidth = Number(this.position?.width ?? rect.width ?? 900);
        const startHeight = Number(this.position?.height ?? rect.height ?? 950);
        const minWidth = 720;
        const minHeight = 760;

        const move = (moveEv) => {
          const dx = moveEv.clientX - startX;
          const dy = moveEv.clientY - startY;
          const next = {};
          if (dir.includes('e')) next.width = Math.max(minWidth, Math.round(startWidth + dx));
          if (dir.includes('s')) next.height = Math.max(minHeight, Math.round(startHeight + dy));
          if (dir.includes('w')) {
            const width = Math.max(minWidth, Math.round(startWidth - dx));
            next.width = width;
            next.left = Math.round(startLeft + (startWidth - width));
          }
          if (dir.includes('n')) {
            const height = Math.max(minHeight, Math.round(startHeight - dy));
            next.height = height;
            next.top = Math.round(startTop + (startHeight - height));
          }
          this.setPosition(next);
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up, { once: true });
      }, { signal });
    });
  }

  // Home surface routing is inherited from ShellHostMixin. Keeping the generic
  // implementation here ensures droids receive the same Holonet/home-tile
  // behavior as character sheets and future shell upgrades automatically.

  _getInlineProgressionAdapterMode() {
    if (this._shellSurface === 'chargen') return 'chargen';
    return 'levelup';
  }

  _wireProgressionSurfaceEvents(root, signal) {
    const regionAttr = this._shellSurface === 'chargen' ? 'surface-chargen' : 'surface-progression';
    const surfaceRoot = root.querySelector(`[data-shell-region="${regionAttr}"]`);
    if (!surfaceRoot) return;

    void this._hydrateInlineProgressionSurface(surfaceRoot);

    surfaceRoot.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (!action) return;
      ev.preventDefault();

      try {
        const { ProgressionSurfaceAdapter } = await import(
          '/systems/foundryvtt-swse/scripts/ui/shell/ProgressionSurfaceAdapter.js'
        );
        const key = `${this.actor.id}-${this._getInlineProgressionAdapterMode()}`;
        const adapter = ProgressionSurfaceAdapter._registry.get(key);
        await adapter?.handleAction?.(action, ev, btn);
      } catch (err) {
        SWSELogger.error(`[SWSEV2DroidSheet] Progression surface action "${action}" failed:`, err);
      }
    }, { signal });
  }

  async _hydrateInlineProgressionSurface(surfaceRoot) {
    try {
      const { ProgressionSurfaceAdapter } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/ProgressionSurfaceAdapter.js'
      );
      const key = `${this.actor.id}-${this._getInlineProgressionAdapterMode()}`;
      const adapter = ProgressionSurfaceAdapter._registry.get(key);
      await adapter?.afterInlineRender?.(surfaceRoot);
    } catch (err) {
      SWSELogger.error('[SWSEV2DroidSheet] Inline progression hydration failed:', err);
    }
  }

  _wireWorkbenchSurfaceEvents(root, signal) {
    const surfaceRoot = root.querySelector('[data-shell-region="surface-workbench"]');
    if (!surfaceRoot) return;
    void this._hydrateInlineWorkbenchSurface(surfaceRoot);

    surfaceRoot.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (!action || action === 'search-items') return;
      ev.preventDefault();
      try {
        const { WorkbenchSurfaceAdapter } = await import(
          '/systems/foundryvtt-swse/scripts/ui/shell/WorkbenchSurfaceAdapter.js'
        );
        const adapter = WorkbenchSurfaceAdapter._registry.get(this.actor.id);
        await adapter?.handleAction?.(action, btn);
      } catch (err) {
        SWSELogger.error(`[SWSEV2DroidSheet] Workbench surface action "${action}" failed:`, err);
      }
    }, { signal });

    surfaceRoot.addEventListener('input', async (ev) => {
      const input = ev.target.closest('[data-action="search-items"]');
      if (!input) return;
      try {
        const { WorkbenchSurfaceAdapter } = await import(
          '/systems/foundryvtt-swse/scripts/ui/shell/WorkbenchSurfaceAdapter.js'
        );
        const adapter = WorkbenchSurfaceAdapter._registry.get(this.actor.id);
        await adapter?.handleAction?.('search-items', input);
      } catch (err) {
        SWSELogger.error('[SWSEV2DroidSheet] Workbench search failed:', err);
      }
    }, { signal });
  }

  async _hydrateInlineWorkbenchSurface(surfaceRoot) {
    try {
      const { WorkbenchSurfaceAdapter } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/WorkbenchSurfaceAdapter.js'
      );
      const adapter = WorkbenchSurfaceAdapter._registry.get(this.actor.id);
      await adapter?.afterInlineRender?.(surfaceRoot);
    } catch (err) {
      SWSELogger.error('[SWSEV2DroidSheet] Inline workbench hydration failed:', err);
    }
  }

  _wireCustomizationSurfaceEvents(root, signal) {
    const surfaceRoot = root.querySelector('[data-shell-region="surface-customization"]');
    if (!surfaceRoot) return;

    surfaceRoot.addEventListener('click', async (ev) => {
      const target = ev.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      if (!action) return;
      ev.preventDefault();
      try {
        const { CustomizationSurfaceAdapter } = await import(
          '/systems/foundryvtt-swse/scripts/ui/shell/CustomizationSurfaceAdapter.js'
        );
        const mode = this._shellSurfaceOptions?.bayMode
          || this._shellSurfaceOptions?.mode
          || (this.actor?.type === 'vehicle' ? 'shipyard' : 'garage');
        const adapter = CustomizationSurfaceAdapter._registry?.get?.(`${this.actor.id}-${mode}`);
        await adapter?.handleAction?.(action, target);
      } catch (err) {
        SWSELogger.error(`[SWSEV2DroidSheet] Customization surface action "${action}" failed:`, err);
      }
    }, { signal });
  }

  _wireSettingsSurfaceEvents(root, signal) {
    this._settingsSurfaceController ??= new SettingsSurfaceController(this, {
      actor: this.actor,
      preferActor: true,
      persistActorTheme: true,
      logger: SWSELogger
    });
    this._settingsSurfaceController.actor = this.actor;
    this._settingsSurfaceController.attach(root, { signal });
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