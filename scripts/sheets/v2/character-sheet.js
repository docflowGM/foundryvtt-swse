import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import MobileMode from "/systems/foundryvtt-swse/scripts/ui/mobile-mode-manager.js";
import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { CombatRollConfigDialog } from "/systems/foundryvtt-swse/scripts/apps/combat/combat-roll-config-dialog.js";
import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";
import { DropResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";
import { LightsaberConstructionApp } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/lightsaber-construction-app.js";
import { LightsaberConstructionEngine } from "/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js";
import { openLightsaberInterface } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/lightsaber-router.js";
import { BlasterCustomizationApp } from "/systems/foundryvtt-swse/scripts/apps/blaster/blaster-customization-app.js";
import { ArmorModificationApp } from "/systems/foundryvtt-swse/scripts/apps/armor/armor-modification-app.js";
import { MeleeWeaponModificationApp } from "/systems/foundryvtt-swse/scripts/apps/weapons/melee-modification-app.js";
import { GearModificationApp } from "/systems/foundryvtt-swse/scripts/apps/gear/gear-modification-app.js";
import { launchProgression, launchFollowerProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";
import { initiateItemSale } from "/systems/foundryvtt-swse/scripts/apps/item-selling-system.js";
import { MentorNotesApp } from "/systems/foundryvtt-swse/scripts/apps/mentor-notes/mentor-notes-app.js";
import { CombatExecutor } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-executor.js";
import { CombatEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/CombatEngine.js";
import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { AnimationEngine } from "/systems/foundryvtt-swse/scripts/engine/animation-engine.js";
import { ActionEconomyIntegration } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-integration.js";
import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";
import { SentinelSheetGuardrails } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-sheet-guardrails.js";
import { bindV2CharacterSheetTooltips } from "/systems/foundryvtt-swse/scripts/sheets/v2/TooltipIntegration.js";
import { bindV2SheetBreakdowns, closeBreakdown } from "/systems/foundryvtt-swse/scripts/sheets/v2/BreakdownIntegration.js";
import { StoreSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/StoreSurfaceController.js";
import { HelpModeManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/HelpModeManager.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { showRollModifiersDialog } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";
import { computeCenteredPosition, getApplicationTargetSize } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
import { PanelContextBuilder } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js";
import { XP_LEVEL_THRESHOLDS } from "/systems/foundryvtt-swse/scripts/engine/shared/xp-system.js";
import { PANEL_REGISTRY } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PANEL_REGISTRY.js";
import { PostRenderAssertions } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PostRenderAssertions.js";
import { buildHpViewModel, buildDefensesViewModel, buildHeaderHpSegments } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/context.js";
import { rollSkillCheck } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { SkillUseFilter } from "/systems/foundryvtt-swse/scripts/utils/skill-use-filter.js";
// Phase 7: Shared platform layer imports (reusable across all V2 sheets)
import { UIStateManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/UIStateManager.js";
import { applyResourceBarAnimations } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/resource-bar-animations.js";
import { PanelDiagnostics } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/PanelDiagnostics.js";
import { PortraitUploadController } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/PortraitUploadController.js";
// Character-specific visibility manager (subclass of shared base)
import { PanelVisibilityManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/PanelVisibilityManager.js";
import { applyResourceNumberAnimations } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/resource-number-animations.js";
import { ExtraSkillUseRegistry } from "/systems/foundryvtt-swse/scripts/utils/extra-skill-use-registry.js";
import { traceLog, actorSummary, payloadSummary } from "/systems/foundryvtt-swse/scripts/utils/mutation-trace.js";
import { captureHydrationSnapshot, emitHydrationError, emitHydrationWarning, getRecentHydrationMutation, recordHydrationMutation, summarizeBiographyPanel, summarizeDefensePanel } from "/systems/foundryvtt-swse/scripts/utils/hydration-diagnostics.js";
// Phase 8: Character sheet decomposition - import focused modules
import { registerListeners } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/listeners.js";
import { handleFormSubmission, isDirectFieldMutationPath } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/form.js";
// Diagnostics: runtime inspection of resize/scroll behavior
import { characterSheetDiagnostics } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet-diagnostics.js";
// Contract Enforcement: validate sheet architecture at runtime
import { CharacterSheetContractEnforcer } from "/systems/foundryvtt-swse/scripts/sheets/v2/contract-enforcer.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/registries/talent-registry.js";
// Phase 8: Contract observability and runtime verification
import {
  warnSheetFallback,
  warnConceptDivergence,
  warnMissingDerivedOutput,
  getWarningsSummary
} from "/systems/foundryvtt-swse/scripts/debug/contract-warning-helper.js";
// Theme and motion control imports
import {
  getActorSheetTheme,
  getActorSheetThemeGroups,
  buildActorSheetThemeStyle
} from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import {
  getActorSheetMotionStyle,
  getActorSheetMotionStyleOptions,
  buildActorSheetMotionStyle
} from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-motion-registry.js";
import { ShellRouter } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js";
import { ShellSurfaceRegistry } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellSurfaceRegistry.js";
import { ThemeManager } from "/systems/foundryvtt-swse/scripts/ui/theme/ThemeManager.js";
import { activateCustomSkillsUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/custom-skills-ui.js";
import { registerCustomSkillsHelpers } from "/systems/foundryvtt-swse/scripts/sheets/v2/custom-skills-helpers.js";
import { buildConceptSheetViewModel } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/concept-context.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Debounce utility: delays function execution until N ms have passed without new calls
 * Used to prevent keystroke spam in form submissions
 */
function debounce(fn, ms = 500) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, ms);
  };
}

/**
 * Field type schema for form coercion
 * Maps field names or patterns to their expected types: 'number', 'boolean', 'string'
 * Used instead of string pattern matching for reliable type coercion
 */
const FORM_FIELD_SCHEMA = {
  // HP/Health
  'system.hp.value': 'number',
  'system.hp.max': 'number',
  'system.hp.temp': 'number',
  'system.hpBonus': 'number',
  'system.conditionTrack.current': 'number',
  'system.damageReduction': 'number',
  'system.baseAttackBonus': 'number',
  'system.secondWind.healing': 'number',
  'system.secondWind.uses': 'number',
  'system.secondWind.max': 'number',

  // Abilities
  'system.abilities.str.base': 'number',
  'system.abilities.str.racial': 'number',
  'system.abilities.str.temp': 'number',
  'system.abilities.dex.base': 'number',
  'system.abilities.dex.racial': 'number',
  'system.abilities.dex.temp': 'number',
  'system.abilities.con.base': 'number',
  'system.abilities.con.racial': 'number',
  'system.abilities.con.temp': 'number',
  'system.abilities.int.base': 'number',
  'system.abilities.int.racial': 'number',
  'system.abilities.int.temp': 'number',
  'system.abilities.wis.base': 'number',
  'system.abilities.wis.racial': 'number',
  'system.abilities.wis.temp': 'number',
  'system.abilities.cha.base': 'number',
  'system.abilities.cha.racial': 'number',
  'system.abilities.cha.temp': 'number',

  // Defense modifiers
  'system.defenses.fortitude.classBonus': 'number',
  'system.defenses.fortitude.misc.user.extra': 'number',
  'system.defenses.fortitude.ability': 'string',
  'system.defenses.reflex.classBonus': 'number',
  'system.defenses.reflex.misc.user.extra': 'number',
  'system.defenses.reflex.ability': 'string',
  'system.defenses.reflex.armor': 'number',
  'system.defenses.will.classBonus': 'number',
  'system.defenses.will.misc.user.extra': 'number',
  'system.defenses.will.ability': 'string',

  // Skills
  'system.skills.acrobatics.miscMod': 'number',
  'system.skills.climb.miscMod': 'number',
  'system.skills.deception.miscMod': 'number',
  'system.skills.endurance.miscMod': 'number',
  'system.skills.gatherInformation.miscMod': 'number',
  'system.skills.initiative.miscMod': 'number',
  'system.skills.jump.miscMod': 'number',
  'system.skills.knowledgeBureaucracy.miscMod': 'number',
  'system.skills.knowledgeGalacticLore.miscMod': 'number',
  'system.skills.knowledgeLifeSciences.miscMod': 'number',
  'system.skills.knowledgePhysicalSciences.miscMod': 'number',
  'system.skills.knowledgeSocialSciences.miscMod': 'number',
  'system.skills.knowledgeTactics.miscMod': 'number',
  'system.skills.knowledgeTechnology.miscMod': 'number',
  'system.skills.mechanics.miscMod': 'number',
  'system.skills.perception.miscMod': 'number',
  'system.skills.persuasion.miscMod': 'number',
  'system.skills.pilot.miscMod': 'number',
  'system.skills.ride.miscMod': 'number',
  'system.skills.stealth.miscMod': 'number',
  'system.skills.survival.miscMod': 'number',
  'system.skills.swim.miscMod': 'number',
  'system.skills.treatInjury.miscMod': 'number',
  'system.skills.useComputer.miscMod': 'number',
  'system.skills.useTheForce.miscMod': 'number',

  // Progression and Resources
  'system.level': 'number',
  // Phase 3D: Canonical XP path is system.xp.total (not deprecated system.experience)
  'system.xp.total': 'number',
  'system.credits': 'number',
  'system.speed': 'number',
  'system.destinyPoints.value': 'number',
  'system.destinyPoints.max': 'number',
  'system.forcePoints.value': 'number',
  'system.forcePoints.max': 'number'
};

/**
 * Check if a field should be coerced to a specific type
 * @param {string} fieldName - Form field name (e.g. 'system.hp.value')
 * @returns {string|null} - Type ('number', 'boolean', 'string') or null if unknown
 */
function getFieldType(fieldName) {
  // Exact match first
  if (fieldName in FORM_FIELD_SCHEMA) {
    return FORM_FIELD_SCHEMA[fieldName];
  }

  // Dynamic skill booleans and fields
  if (/^system\.skills\.[^.]+\.(trained|focused|favorite)$/.test(fieldName)) {
    return 'boolean';
  }
  if (/^system\.skills\.[^.]+\.miscMod$/.test(fieldName)) {
    return 'number';
  }
  if (/^system\.skills\.[^.]+\.selectedAbility$/.test(fieldName)) {
    return 'string';
  }

  // Other boolean-backed checkboxes that may not be listed explicitly
  if (fieldName === 'system.conditionTrack.persistent') {
    return 'boolean';
  }

  // Pattern matching as fallback (conservative: only if explicit pattern exists)
  // This prevents over-aggressive coercion from field name heuristics
  if (fieldName.includes('notes') || fieldName.includes('description') || fieldName.includes('text')) {
    return 'string';
  }

  return null;
}

/**
 * GUARDRAIL 1: Context Contract Validator
 * Detects missing context keys that would cause silent template failures.
 *
 * This catches hydration bugs before they reach the template layer.
 * Also reports violations to Sentinel for system-wide tracking.
 */
function validateContextContract(context, sheetName) {
  const requiredKeys = [
    'equipment', 'armor', 'weapons',           // Inventory spread
    'followerSlots', 'followerTalentBadges',  // Follower context
    'xpEnabled', 'isLevel0', 'isGM',          // UI flags
    'fpAvailable', 'derived', 'abilities'     // Core data
  ];

  const missing = [];
  for (const key of requiredKeys) {
    if (!(key in context)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    // Log to console for immediate feedback
    console.warn(
      `[SWSE Sheet] ${sheetName} missing context keys: ${missing.join(', ')}`,
      { context }
    );

    // Report to Sentinel for governance tracking
    SentinelSheetGuardrails.reportMissingContextKeys(sheetName, missing, context);
  }
}

/**
 * GUARDRAIL 2: Listener Watcher
 * Monitors for listener accumulation (common cause of memory leaks).
 *
 * If listeners exceed threshold, logs a warning to help catch render-loop leaks.
 * Also reports violations to Sentinel for governance tracking.
 */
function verifyListenerCleanup(element, sheetName, signal) {
  if (!element || !signal) return;

  // Check if the AbortSignal is still active (listeners should be cleaned up when aborted)
  // This is the real safeguard against listener leaks: AbortController signal cleanup
  if (signal.aborted) {
    swseLogger.debug(`[SWSE Sheet] ${sheetName} listeners have been cleaned up (signal aborted)`);
  } else {
    // swseLogger.debug(`[SWSE Sheet] ${sheetName} listeners are active; will be cleaned on next render via AbortController`);
  }

  // Note: Actual listener count requires browser internal APIs. Rely on AbortController
  // cleanup mechanism instead of heuristic checks.
}

export class SWSEV2CharacterSheet extends
  HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["swse", "sheet", "actor", "character", "swse-character-sheet", "swse-sheet", "v2"],
    width: 1220,
    height: 980,
    window: {
      resizable: true,
      draggable: true,
      frame: true
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: false
    },
    tabs: [
      {
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-content",
        initial: "overview"
      }
    ]
  };

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/character/v2-concept/character-sheet.hbs"
    }
  };

  constructor(document, options = {}) {
    super(document, options);
    // Track sheet instance for Sentinel monitoring
    SentinelSheetGuardrails.trackSheetInstance("SWSEV2CharacterSheet");

    // Render loop prevention guard (same pattern as ProgressionShell)
    // Hardening: do not drop legitimate mutation-triggered renders; queue one follow-up render.
    this._isRendering = false;
    this._renderCount = 0;
    this._pendingRenderArgs = null;
    this._hasQueuedRender = false;

    // Position centering tracking — initialize EARLY so first render knows this is a new open
    this._openedAt = Date.now();
    this._centerTimer = null;

    // Create debounced form submission to prevent keystroke spam
    // 500ms delay: ensures multiple rapid changes batch into one update
    this._debouncedSubmit = debounce(
      (ev) => this._onSubmitForm(ev),
      500
    );

    // ═══ Phase 6: Operational Hardening ═══
    // Initialize UI state manager for preserving interactive state across rerenders
    this.uiStateManager = new UIStateManager(this);

    // Initialize panel diagnostics for performance tracking and debugging
    this.panelDiagnostics = new PanelDiagnostics();

    // Initialize visibility manager for lazy panel building
    this.visibilityManager = new PanelVisibilityManager(this);

    // Phase 9: Tier-aware help system (per-character, persisted)
    // Initialize from actor flags or default to CORE
    this._helpLevel = HelpModeManager.initializeForActor(document);

    // ─── Phase 11: Shell Host State ────────────────────────────────────────
    // Active surface: 'sheet' | 'home' | 'progression' | 'chargen' | 'upgrade' | 'settings' | 'mentor'
    this._shellSurface = 'sheet';
    this._shellSurfaceOptions = {};
    this._shellOverlay = null;
    this._shellDrawer = null;
    this._shellModal = null;
    this._shellRouterRegistered = false; // Guard to register only once per session
  }

  // ═══ AUDIT INSTRUMENTATION + RENDER GUARD ═══
  async render(...args) {
    // Render loop prevention: queue one follow-up render instead of dropping
    // legitimate mutation-driven rerenders while the sheet is still painting.
    if (this._isRendering) {
      this._pendingRenderArgs = args;
      this._hasQueuedRender = true;
      console.warn("[SWSEV2CharacterSheet] ⚠️ Render called while already rendering — QUEUED follow-up render");
      const recentHydrationMutation = getRecentHydrationMutation(this);
      if (recentHydrationMutation) {
        emitHydrationWarning('SHEET_RENDER_QUEUED', {
          actorId: this.actor?.id,
          actorName: this.actor?.name,
          mutation: recentHydrationMutation,
          snapshot: captureHydrationSnapshot(this.actor)
        });
      }
      return this;
    }

    this._isRendering = true;
    this._renderCount++;

    try {
      // Phase 6: Capture UI state before rerender so it can be restored after
      this.uiStateManager.captureState();

      // swseLogger.debug(`[SWSEV2CharacterSheet] RENDER START (#${this._renderCount}) position:`, this.position);
      return await super.render(...args);
      // swseLogger.debug(`[SWSEV2CharacterSheet] RENDER COMPLETE (#${this._renderCount}) position:`, this.position);
    } finally {
      this._isRendering = false;

      if (this._hasQueuedRender) {
        const queuedArgs = this._pendingRenderArgs ?? args;
        this._hasQueuedRender = false;
        this._pendingRenderArgs = null;
        queueMicrotask(() => this.render(...queuedArgs));
      }
    }
  }

  // ─── Phase 11: Shell Host API ─────────────────────────────────────────────

  /** @returns {string} Active surface ID */
  get shellSurface() { return this._shellSurface; }

  /**
   * Switch to a route surface (progression | chargen | upgrade | settings | mentor | sheet).
   * Clears any active overlay/drawer.
   */
  async setSurface(surfaceId, options = {}) {
    swseLogger.debug(`[ShellHost] setSurface: ${this._shellSurface} → ${surfaceId}`);
    this._shellSurface = surfaceId;
    this._shellSurfaceOptions = options;
    this._shellOverlay = null;
    this._shellDrawer = null;
  }

  /** Return to the primary sheet surface. */
  async returnToSheet() {
    await this.setSurface('sheet');
    this.render(false);
  }

  /** Open an overlay above the current surface. */
  async openOverlay(overlayId, options = {}) {
    this._shellOverlay = { overlayId, options };
  }

  /** Close the current overlay. */
  async closeOverlay() {
    this._shellOverlay = null;
  }

  /** Open a drawer alongside the current surface. */
  async openDrawer(drawerId, options = {}) {
    this._shellDrawer = { drawerId, options };
  }

  /** Close the current drawer. */
  async closeDrawer() {
    this._shellDrawer = null;
  }

  /**
   * Wire shell-level navigation events after every render.
   * Handles back-to-sheet, open-home, close-overlay, close-drawer, and surface-specific events.
   */
  // signal is the render-cycle AbortController signal — all listeners are torn down on next render.
  _wireShellEvents(root, signal) {
    if (!root) return;

    root.querySelectorAll('[data-shell-action="return-to-sheet"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.returnToSheet();
      }, { signal });
    });

    root.querySelectorAll('[data-shell-action="return-to-home"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.setSurface('home');
        this.render(false);
      }, { signal });
    });

    root.querySelectorAll('[data-shell-action="close-overlay"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.closeOverlay();
        this.render(false);
      }, { signal });
    });

    root.querySelectorAll('[data-shell-action="close-drawer"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.closeDrawer();
        this.render(false);
      }, { signal });
    });

    // Overlay confirm/cancel callbacks
    const overlayRoot = root.querySelector('[data-shell-region="overlay"]');
    if (overlayRoot) {
      overlayRoot.querySelector('[data-shell-overlay-action="confirm"]')?.addEventListener('click', async () => {
        const onConfirm = this._shellOverlay?.options?.onConfirm;
        if (typeof onConfirm === 'function') await onConfirm().catch(() => {});
        await this.closeOverlay();
        this.render(false);
      }, { signal });

      overlayRoot.querySelector('[data-shell-overlay-action="cancel"]')?.addEventListener('click', async () => {
        const onCancel = this._shellOverlay?.options?.onCancel;
        if (typeof onCancel === 'function') await onCancel().catch(() => {});
        await this.closeOverlay();
        this.render(false);
      }, { signal });
    }

    root.querySelectorAll('[data-action="open-settings-app"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.setSurface('settings', { source: 'sheet' });
        this.render(false);
      }, { signal });
    });

    root.querySelectorAll('[data-shell-action="open-home"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.setSurface('home');
        this.render(false);
      }, { signal });
    });

    if (this._shellSurface === 'home') {
      this._wireHomeSurfaceEvents(root, signal);
    }
    if (this._shellSurface === 'upgrade') {
      this._wireUpgradeSurfaceEvents(root, signal);
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
    if (this._shellSurface === 'mentor') {
      this._wireMentorSurfaceEvents(root, signal);
    }
    if (this._shellOverlay?.overlayId === 'upgrade-single-item') {
      this._wireUpgradeOverlayEvents(root, signal);
    }
  }

  /** Wire home surface tile click → setSurface(routeId). */
  _wireHomeSurfaceEvents(root, signal) {
    const homeRoot = root.querySelector('[data-shell-region="surface-home"]');
    if (!homeRoot) return;

    homeRoot.querySelectorAll('[data-route-id]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (el.disabled) return;
        const routeId = el.dataset.routeId;
        if (!routeId) return;
        homeRoot.querySelectorAll('.swse-app-tile--launching').forEach(tile => tile.classList.remove('swse-app-tile--launching'));
        el.classList.add('swse-app-tile--launching');
        await new Promise(resolve => setTimeout(resolve, 150));

        // Special-case progression/chargen: launch the real flow instead of routing to placeholder surface
        if (routeId === 'chargen' || routeId === 'progression') {
          await launchProgression(this.actor);
          // Do NOT render - ChargenShell/ProgressionFramework opens as a separate window
        } else {
          await this.setSurface(routeId, { source: 'home' });
          this.render(false);
        }
      }, { signal });
    });

    // Initialize home surface controller (compass needle, tile aiming)
    this._homeController = new HomeSurfaceController({
      root: homeRoot,
      host: this
    });
    this._homeController.attach();
  }

  /** Wire store surface events (browse/cart/history tabs, add to cart, checkout). */
  _wireStoreSurfaceEvents(root, signal) {
    const storeRoot = root.querySelector('[data-shell-region="surface-store"]');
    if (!storeRoot) return;

    // Wire tab switches
    storeRoot.querySelectorAll('[data-shell-action*="store-"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const action = el.dataset.shellAction;
        if (!action) return;

        // Update surface options to track current view/category
        const view = action.replace('store-', '');
        this._shellSurfaceOptions = { ...this._shellSurfaceOptions, currentView: view };
        this.render(false);
      }, { signal });
    });

    // Wire category navigation
    storeRoot.querySelectorAll('[data-action="category-nav"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const category = el.dataset.category || '';
        this._shellSurfaceOptions = { ...this._shellSurfaceOptions, currentCategory: category };
        this.render(false);
      }, { signal });
    });
  }

  /** Wire settings surface events (theme/motion/display controls). */
  _wireSettingsSurfaceEvents(root, signal) {
    const settingsRoot = root.querySelector('[data-shell-region="surface-settings"]');
    if (!settingsRoot) return;

    // Wire theme preset selection
    settingsRoot.querySelectorAll('[data-theme-preset]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const themeId = el.dataset.themePreset;
        if (!themeId) return;
        try {
          const { ThemeManager } = await import('/systems/foundryvtt-swse/scripts/ui/theme/ThemeManager.js');
          await ThemeManager.setTheme({ theme: themeId });
          // Apply theme to shell immediately
          const sheetShell = root.querySelector('.swse-sheet-v2-shell');
          if (sheetShell) {
            sheetShell.setAttribute('data-theme', themeId);
          }
          this.render(false);
        } catch (err) {
          swseLogger.error('[SETTINGS] Error setting theme:', err);
          ui.notifications?.error?.(`Failed to set theme: ${err.message}`);
        }
      }, { signal });
    });

    // Wire shell color selection
    settingsRoot.querySelectorAll('[data-shell-color]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const colorId = el.dataset.shellColor;
        if (!colorId) return;
        try {
          const { ThemeManager } = await import('/systems/foundryvtt-swse/scripts/ui/theme/ThemeManager.js');
          await ThemeManager.setTheme({ shellColor: colorId });
          this.render(false);
        } catch (err) {
          swseLogger.error('[SETTINGS] Error setting shell color:', err);
          ui.notifications?.error?.(`Failed to set shell color: ${err.message}`);
        }
      }, { signal });
    });

    // Wire display control sliders
    settingsRoot.querySelectorAll('[data-theme-control]').forEach(el => {
      el.addEventListener('change', async (ev) => {
        const controlName = el.dataset.themeControl;
        const value = ev.target.value;
        if (!controlName) return;
        try {
          const { ThemeManager } = await import('/systems/foundryvtt-swse/scripts/ui/theme/ThemeManager.js');
          const currentTheme = ThemeManager.getTheme();
          const update = { ...currentTheme, [controlName]: parseFloat(value) };
          await ThemeManager.setTheme(update);
          this.render(false);
        } catch (err) {
          swseLogger.error('[SETTINGS] Error updating display control:', err);
        }
      }, { signal });
    });

    // Wire theme toggles (breathing, reduced motion)
    settingsRoot.querySelectorAll('[data-theme-toggle]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const toggleName = el.dataset.themeToggle;
        if (!toggleName) return;
        try {
          const { ThemeManager } = await import('/systems/foundryvtt-swse/scripts/ui/theme/ThemeManager.js');
          const currentTheme = ThemeManager.getTheme();
          const newValue = !currentTheme[toggleName];
          const update = { ...currentTheme, [toggleName]: newValue };
          await ThemeManager.setTheme(update);
          this.render(false);
        } catch (err) {
          swseLogger.error('[SETTINGS] Error toggling theme setting:', err);
        }
      }, { signal });
    });
  }

  /** Wire actor-wide upgrade surface events (category/item selection + apply/remove). */
  _wireUpgradeSurfaceEvents(root, signal) {
    const upgradeRoot = root.querySelector('[data-shell-region="surface-upgrade"]');
    if (!upgradeRoot) return;

    const actor = this.actor;

    upgradeRoot.querySelectorAll('[data-category-id]').forEach(el => {
      el.addEventListener('click', () => {
        const newCat = el.dataset.categoryId;
        if (this._shellSurfaceOptions.selectedCategoryId === newCat) return;
        this._shellSurfaceOptions = { ...this._shellSurfaceOptions, selectedCategoryId: newCat, selectedItemId: null };
        this.render(false);
      }, { signal });
    });

    upgradeRoot.querySelectorAll('[data-item-id]').forEach(el => {
      el.addEventListener('click', () => {
        const newItem = el.dataset.itemId;
        if (this._shellSurfaceOptions.selectedItemId === newItem) return;
        this._shellSurfaceOptions = { ...this._shellSurfaceOptions, selectedItemId: newItem };
        this.render(false);
      }, { signal });
    });

    upgradeRoot.querySelectorAll('[data-upgrade-action="apply-upgrade"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const { selectedItemId } = this._shellSurfaceOptions;
        if (!actor || !selectedItemId) return;
        try {
          const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
          await CommandBus.execute('APPLY_ITEM_UPGRADE', { actor, itemId: selectedItemId, upgradeId: el.dataset.upgradeId });
          this.render(false);
        } catch (err) { ui.notifications?.error?.(`Failed to apply upgrade: ${err.message}`); }
      }, { signal });
    });

    upgradeRoot.querySelectorAll('[data-upgrade-action="remove-upgrade"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const { selectedItemId } = this._shellSurfaceOptions;
        if (!actor || !selectedItemId) return;
        try {
          const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
          await CommandBus.execute('REMOVE_ITEM_UPGRADE', { actor, itemId: selectedItemId, upgradeIndex: Number(el.dataset.upgradeIndex) });
          this.render(false);
        } catch (err) { ui.notifications?.error?.(`Failed to remove upgrade: ${err.message}`); }
      }, { signal });
    });

    upgradeRoot.querySelector('[data-action="finalize-upgrades"]')?.addEventListener('click', async () => {
      const { selectedItemId } = this._shellSurfaceOptions;
      if (!actor || !selectedItemId) return;
      try {
        const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
        await CommandBus.execute('FINALIZE_ITEM_UPGRADES', { actor, itemId: selectedItemId });
        ui.notifications?.info?.('Upgrades finalized.');
        this.render(false);
      } catch (err) { ui.notifications?.error?.(`Failed to finalize: ${err.message}`); }
    }, { signal });
  }

  /** Wire upgrade single-item overlay events. */
  _wireUpgradeOverlayEvents(root, signal) {
    const overlayRoot = root.querySelector('[data-shell-region="overlay"]');
    if (!overlayRoot) return;

    const actor = this.actor;
    const focusedItemId = this._shellOverlay?.options?.focusedItemId;

    overlayRoot.querySelectorAll('[data-upgrade-action="apply-upgrade"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (!actor || !focusedItemId) return;
        try {
          const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
          await CommandBus.execute('APPLY_ITEM_UPGRADE', { actor, itemId: focusedItemId, upgradeId: el.dataset.upgradeId });
          this.render(false);
        } catch (err) { ui.notifications?.error?.(`Failed to apply upgrade: ${err.message}`); }
      }, { signal });
    });

    overlayRoot.querySelectorAll('[data-upgrade-action="remove-upgrade"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (!actor || !focusedItemId) return;
        try {
          const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
          await CommandBus.execute('REMOVE_ITEM_UPGRADE', { actor, itemId: focusedItemId, upgradeIndex: Number(el.dataset.upgradeIndex) });
          this.render(false);
        } catch (err) { ui.notifications?.error?.(`Failed to remove upgrade: ${err.message}`); }
      }, { signal });
    });
  }

  /** Wire settings surface: theme presets, shell color, controls, toggles, language, reset. */
  _wireSettingsSurfaceEvents(root, signal) {
    const settingsRoot = root.querySelector('[data-shell-region="surface-settings"]');
    if (!settingsRoot) return;

    settingsRoot.querySelectorAll('[data-theme-preset]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await ThemeManager.setTheme({ theme: el.dataset.themePreset });
        this.render(false);
      }, { signal });
    });

    settingsRoot.querySelectorAll('[data-shell-color]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await ThemeManager.setTheme({ shellColor: el.dataset.shellColor });
        this.render(false);
      }, { signal });
    });

    settingsRoot.querySelectorAll('[data-theme-control]').forEach(el => {
      el.addEventListener('input', async (ev) => {
        const key = el.dataset.themeControl;
        const value = Number(el.value);
        await ThemeManager.setTheme({ [key]: value });
        this.render(false);
      }, { signal });
    });

    settingsRoot.querySelectorAll('[data-theme-toggle]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const key = el.dataset.themeToggle;
        const current = ThemeManager.getTheme() || ThemeManager.defaults;
        await ThemeManager.setTheme({ [key]: !current[key] });
        this.render(false);
      }, { signal });
    });

    settingsRoot.querySelectorAll('[data-language-setting]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await ThemeManager.setTheme({ language: el.dataset.languageSetting });
        this.render(false);
      }, { signal });
    });

    settingsRoot.querySelector('[data-action="reset-theme-defaults"]')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      await ThemeManager.setTheme(ThemeManager.defaults);
      this.render(false);
    }, { signal });
  }

  /** Wire mentor surface: key selection, topic selection, path commitment with mentor-memory. */
  _wireMentorSurfaceEvents(root, signal) {
    const mentorRoot = root.querySelector('[data-shell-region="surface-mentor"]');
    if (!mentorRoot) return;

    mentorRoot.querySelectorAll('[data-mentor-key]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        this._shellSurfaceOptions = { selectedMentorKey: el.dataset.mentorKey };
        this.render(false);
      }, { signal });
    });

    mentorRoot.querySelectorAll('[data-mentor-topic]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        this._shellSurfaceOptions = {
          ...this._shellSurfaceOptions,
          topicKey: el.dataset.mentorTopic
        };
        this.render(false);
      }, { signal });
    });

    mentorRoot.querySelectorAll('[data-mentor-path]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const pathName = el.dataset.mentorPath;
        const mentorKey = this._shellSurfaceOptions?.selectedMentorKey;
        if (!pathName || !mentorKey) return;
        try {
          const { getMentorMemory, setCommittedPath, setMentorMemory } = await import('/systems/foundryvtt-swse/scripts/engine/mentor/mentor-memory.js');
          const mentorId = String(mentorKey).toLowerCase();
          const memory = getMentorMemory(this.actor, mentorId);
          const updatedMemory = setCommittedPath(memory, pathName);
          await setMentorMemory(this.actor, mentorId, updatedMemory);
          ui.notifications?.info?.(`Committed to ${pathName}.`);
        } catch (err) {
          ui.notifications?.error?.(`Failed to commit mentor path: ${err.message}`);
        }
      }, { signal });
    });
  }

  setPosition(position) {
    // swseLogger.debug("[SWSEV2CharacterSheet] setPosition CALLED with:", position);
    // swseLogger.debug("[SWSEV2CharacterSheet] current position before:", this.position);
    const result = super.setPosition(position);
    // swseLogger.debug("[SWSEV2CharacterSheet] position after setPosition:", this.position);
    return result;
  }

  // ---------------------------------------------------------------
  // NOTE: _getInitialPosition() was the V1 Application API.
  // Foundry V13 ApplicationV2 does NOT call this method.
  // Position is controlled via DEFAULT_OPTIONS.position and the V13
  // persistent-position system (user flags).  The centering logic has
  // been moved to _onRender (isFirstRender) below so it actually runs.
  // ---------------------------------------------------------------

  async _onRender(context, options) {
    // ═══ DIAGNOSTICS: Capture state at render start ═══
    characterSheetDiagnostics.snapshot('_onRender START (before positioning)', this);

    // ═══ FIX: Center on initial render (first time ever or after close/reopen) ═══
    // PROBLEM: Previous code called setPosition repeatedly during a 5-second window,
    // creating a fight loop with Foundry's persistent-position system.
    // SOLUTION: Center only once per open session, then let Foundry manage position normally.

    // Track whether this is the very first render of this app instance
    const isFirstRenderEver = !this.rendered;

    // Track whether this is the first render after a close/reopen cycle
    // (allows re-centering if user reopens the sheet)
    if (!this._hasBeenRendered) {
      this._hasBeenRendered = true;
      this._shouldCenterOnRender = true;
    }

    const shouldCenter = this._shouldCenterOnRender;

    if (shouldCenter) {
      // Center once per open session, then let AppV2 own future drag/resize state
      // Use dynamic dimensions from DEFAULT_OPTIONS instead of hardcoded 900x950
      const { width: targetWidth, height: targetHeight } = getApplicationTargetSize(this);
      const pos = computeCenteredPosition(targetWidth, targetHeight);
      // swseLogger.debug("[SheetPosition] FIRST RENDER THIS SESSION: Setting centered position", pos);
      // FIX: Only set position (left, top). Do NOT force width/height to prevent user resizing
      // The persistent-position system will restore user's saved dimensions, or use defaults
      this.setPosition({ left: pos.left, top: pos.top });
      this._shouldCenterOnRender = false;

      // ═══ DIAGNOSTICS: After centering ═══
      characterSheetDiagnostics.snapshot('_onRender AFTER setPosition', this);
    }

    await super._onRender(context, options);

    // ═══ DIAGNOSTICS: After Foundry render ═══
    characterSheetDiagnostics.snapshot('_onRender AFTER super._onRender', this);

    // ── Phase 6: Restore UI state after rerender ──
    // This ensures expanded sections, active tabs, focused fields, and scroll position
    // are preserved across rerenders triggered by actor/item updates
    this.uiStateManager.restoreState();

    // ── DIAGNOSTIC: Log that render completed ──
    // swseLogger.debug(
    //   "[SheetPosition] _onRender complete | shouldCenter =", shouldCenter,
    //   "| position.left =", this.position?.left
    // );

    // Abort previous render's listeners to prevent duplicate event handlers
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // V13 AppV2: this.element is always an HTMLElement
    const root = this.element;

    if (!root || !(root instanceof HTMLElement)) {
      // console.error('[LIFECYCLE] _onRender: No valid root element found');
      return;
    }

    // Phase 9: Apply help level CSS class to root for tier-aware affordance visibility
    HelpModeManager.getLevels().forEach(level => {
      root.classList.remove(`help-level--${level.toLowerCase()}`);
    });
    root.classList.add(`help-level--${this._helpLevel.toLowerCase()}`);

    // Phase 11: Apply theme and motion data attributes to sheet-shell element
    // Use data-theme for theme switching (CSS uses [data-theme] selectors)
    // Apply fonts and motion styles via inline CSS variables
    const sheetShell = root.querySelector('.sheet-shell');
    if (sheetShell) {
      const currentTheme = getActorSheetTheme(this.document.getFlag('foundryvtt-swse', 'sheetTheme'));
      const currentMotion = getActorSheetMotionStyle(this.document.getFlag('foundryvtt-swse', 'sheetMotionStyle'));

      // Set theme/motion attributes for CSS-based presentation switching
      sheetShell.setAttribute('data-theme', currentTheme);
      sheetShell.setAttribute('data-motion-style', currentMotion);

      // Apply both canonical theme tokens and motion tokens from the registries.
      const themeStyle = buildActorSheetThemeStyle(currentTheme);
      const motionStyle = buildActorSheetMotionStyle(currentMotion);
      const styleString = [themeStyle, motionStyle].filter(Boolean).join('; ');

      if (styleString) {
        sheetShell.setAttribute('style', styleString);
      }
    }

    // Wire listeners to the sheet root
    this.activateListeners(root, { signal });
    activateCustomSkillsUI(this, root, { signal });
    applyResourceNumberAnimations(this, root);
    applyResourceBarAnimations(this, root);

    const recentHydrationMutation = getRecentHydrationMutation(this);
    if (recentHydrationMutation) {
      emitHydrationWarning('POST_RENDER_DOM_STATE', {
        actorId: this.actor?.id,
        actorName: this.actor?.name,
        mutation: recentHydrationMutation,
        dom: {
          header: !!root.querySelector('.sheet-header'),
          biographyPanel: !!root.querySelector('.character-record-header, .swse-panel--identity'),
          defensePanel: !!root.querySelector('.swse-panel--defenses'),
          healthPanel: !!root.querySelector('.swse-panel--health')
        },
        snapshot: captureHydrationSnapshot(this.actor),
        defensePanel: summarizeDefensePanel(this._currentContext?.defensePanel),
        biographyPanel: summarizeBiographyPanel(this._currentContext?.biographyPanel)
      });
    }
    // Portrait upload + auto-apply (click-to-pick via data-edit="img", drag/drop here)
    PortraitUploadController.bind(root, { actor: this.actor, signal });

    // Wire tooltip bindings for micro-tooltips
    bindV2CharacterSheetTooltips(this.document, root, this._renderAbort);

    // Run post-render assertions only for visible panels (phase 2 audit: contract verification)
    const visiblePanels = this.visibilityManager.getPanelsToBuild(this.document);
    PostRenderAssertions.runAll(root, this._currentContext || {}, visiblePanels);

    // Wire pinned breakdown card interactions
    bindV2SheetBreakdowns(this.document, root, this._renderAbort);

    // Close any open breakdown card on rerender (cleanup)
    closeBreakdown();

    // Wire action economy bindings for combat tab
    ActionEconomyBindings.setupAttackButtons(root, this.document);

    // Verify listener cleanup mechanism is in place (AbortController signal cleanup)
    verifyListenerCleanup(root, "SWSEV2CharacterSheet", signal);

    // ═══ DIAGNOSTICS: Final snapshot after all listeners wired ═══
    characterSheetDiagnostics.snapshot('_onRender COMPLETE (all listeners wired)', this);

    // ═══ AUTO-DIAGNOSTICS: Run detailed analysis on every open ═══
    setTimeout(() => {
      // swseLogger.debug('[SWSE SheetDiag] ════════════════════════════════════');
      // swseLogger.debug('[SWSE SheetDiag] AUTO-RUNNING CHARACTER SHEET DIAGNOSTICS');
      // swseLogger.debug('[SWSE SheetDiag] ════════════════════════════════════');
      characterSheetDiagnostics.inspectHeightChain(this);
      characterSheetDiagnostics.listOverflowingElements(this);
      characterSheetDiagnostics.inspectAppState(this);
      // swseLogger.debug('[SWSE SheetDiag] ════════════════════════════════════');

      // ═══ CONTRACT ENFORCEMENT: Validate architecture compliance ═══
      // swseLogger.debug('[CHARACTER SHEET CONTRACT] RUNNING ENFORCEMENT VALIDATION');
      CharacterSheetContractEnforcer.validateAndReport(this.element);

      // ═══ DEBUG: Print exact violation details for fixing ═══
      // swseLogger.debug('\n');
      // swseLogger.debug('╔════════════════════════════════════════════════════════════════╗');
      // swseLogger.debug('║          EXACT VIOLATIONS FOR DEBUGGING AND FIXING             ║');
      // swseLogger.debug('╚════════════════════════════════════════════════════════════════╝');
      CharacterSheetContractEnforcer.debugScrollOwners(this.element);
      CharacterSheetContractEnforcer.debugIllegalPanelScrollers(this.element);
      CharacterSheetContractEnforcer.debugWindowContentMinHeight(this.element);
      CharacterSheetContractEnforcer.debugHeightChain(this.element);
    }, 100);

    // ─── Phase 11: Shell Host Registration + Event Wiring ─────────────────
    // Register only once per session (first render) to avoid redundant re-registration
    if (this.actor?.id && !this._shellRouterRegistered) {
      ShellRouter.register(this.actor.id, this);
      this._shellRouterRegistered = true;
    }
    this._wireShellEvents(root, signal);
  }

  async _onClose(options) {
    // Cleanup all event listeners on close
    this._renderAbort?.abort();

    // Phase 6: Clear UI state on close (will be fresh on next open)
    this.uiStateManager.clear();
    this.visibilityManager.clearCache();

    // Reset centering state so the next open re-centers cleanly
    this._shouldCenterOnRender = true; // Enable re-centering on next open
    this._openedAt = null;
    clearTimeout(this._centerTimer);

    // Phase 11: Unregister from ShellRouter
    if (this.actor?.id) {
      ShellRouter.unregister(this.actor.id);
    }

    return super._onClose(options);
  }

  /* ============================================================
     PREPARE CONTEXT (PURE ORCHESTRATION)
  ============================================================ */

  async _prepareContext(options) {
    const actor = this.document;
    const system = actor.system;

    // Sanity check: actor must be valid
    RenderAssertions.assertActorValid(actor, "SWSEV2CharacterSheet");

    const rawContext = await super._prepareContext(options);
    const SKIP_KEYS = new Set(['actor', 'document', 'system', 'fields']);
    const stripFunctions = (val, depth = 0) => {
      if (depth > 10) return val;
      if (typeof val === 'function') return undefined;
      if (Array.isArray(val)) return val.map(v => stripFunctions(v, depth + 1));
      if (val && typeof val === 'object' && val.constructor === Object) {
        return Object.fromEntries(
          Object.entries(val)
            .map(([k, v]) => [k, stripFunctions(v, depth + 1)])
            .filter(([, v]) => v !== undefined)
        );
      }
      return val;
    };
    const context = Object.fromEntries(
      Object.entries(rawContext)
        .filter(([k]) => !SKIP_KEYS.has(k))
        .map(([k, v]) => [k, stripFunctions(v)])
        .filter(([, v]) => v !== undefined)
    );

    // Authoritative derived state (populated by character-actor.js computeCharacterDerived)
    // SAFEGUARD: Ensure all expected nested properties exist with empty defaults
    const derived = foundry.utils.duplicate(actor.system?.derived ?? {});

    // Define ability constants used for multiple safeguards
    const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const ABILITY_LABELS = {
      str: 'Strength',
      dex: 'Dexterity',
      con: 'Constitution',
      int: 'Intelligence',
      wis: 'Wisdom',
      cha: 'Charisma'
    };

    // Normalize critical derived structures to prevent undefined path errors in templates
    derived.talents ??= {};
    derived.talents.groups ??= [];
    derived.talents.list ??= [];

    derived.skills ??= [];

    derived.attacks ??= {};
    derived.attacks.list ??= [];

    derived.actions ??= {};
    derived.actions.groups ??= [];

    derived.identity ??= {};
    derived.identity.halfLevel ??= 0;
    // Provide ability array for skills panel selectors (used in skills-panel.hbs line 75)
    derived.identity.abilities ??= ABILITY_KEYS.map(key => ({
      key,
      label: ABILITY_LABELS[key]
    }));

    derived.encumbrance ??= {};
    derived.encumbrance.state ??= "normal";
    derived.encumbrance.label ??= "Unencumbered";
    derived.encumbrance.total ??= 0;
    derived.encumbrance.lightLoad ??= 0;
    derived.encumbrance.mediumLoad ??= 0;
    derived.encumbrance.heavyLoad ??= 0;

    // Ensure defenses object has all required defense keys initialized to defaults
    // PHASE 6: Defense contract normalized through defensePanel builder
    // Header and body both use defensePanel for canonical defense display model
    // This removes the sheet-local normalization hack and uses engine-owned derived data directly
    // Ensure damage threshold has default
    // CRITICAL: DerivedCalculator stores at derived.damageThreshold (flat), not derived.damage.threshold
    derived.damageThreshold ??= 10;  // Default to Fortitude value (usually 10)
    derived.damage ??= {};
    derived.damage.conditionHelpless ??= false;

    // SWSE Skills Registry - CANONICAL: Must match Actor data model / derived calculator keys exactly.
    // Do not introduce merged, renamed, or homebrew-only aliases here.
    const SWSE_SKILL_DEFINITIONS = {
      acrobatics: { label: 'Acrobatics', ability: 'dex' },
      climb: { label: 'Climb', ability: 'str' },
      deception: { label: 'Deception', ability: 'cha' },
      endurance: { label: 'Endurance', ability: 'con' },
      gatherInformation: { label: 'Gather Information', ability: 'cha' },
      initiative: { label: 'Initiative', ability: 'dex' },
      jump: { label: 'Jump', ability: 'str' },
      knowledgeBureaucracy: { label: 'Knowledge (Bureaucracy)', ability: 'int' },
      knowledgeGalacticLore: { label: 'Knowledge (Galactic Lore)', ability: 'int' },
      knowledgeLifeSciences: { label: 'Knowledge (Life Sciences)', ability: 'int' },
      knowledgePhysicalSciences: { label: 'Knowledge (Physical Sciences)', ability: 'int' },
      knowledgeSocialSciences: { label: 'Knowledge (Social Sciences)', ability: 'int' },
      knowledgeTactics: { label: 'Knowledge (Tactics)', ability: 'int' },
      knowledgeTechnology: { label: 'Knowledge (Technology)', ability: 'int' },
      mechanics: { label: 'Mechanics', ability: 'int' },
      perception: { label: 'Perception', ability: 'wis' },
      persuasion: { label: 'Persuasion', ability: 'cha' },
      pilot: { label: 'Pilot', ability: 'dex' },
      ride: { label: 'Ride', ability: 'dex' },
      stealth: { label: 'Stealth', ability: 'dex' },
      survival: { label: 'Survival', ability: 'wis' },
      swim: { label: 'Swim', ability: 'str' },
      treatInjury: { label: 'Treat Injury', ability: 'wis' },
      useComputer: { label: 'Use Computer', ability: 'int' },
      useTheForce: { label: 'Use the Force', ability: 'cha' }
    };

    // FIRST: Build abilities map from system.abilities (needed by skills processing below)
    const abilitiesMap = system.abilities ?? {};
    const abilityMap = {
      'str': 'Strength', 'dex': 'Dexterity', 'con': 'Constitution',
      'int': 'Intelligence', 'wis': 'Wisdom', 'cha': 'Charisma'
    };

    // THEN: Build abilities array from abilitiesMap
    const abilities = ABILITY_KEYS.map(key => {
      const ability = abilitiesMap[key] ?? {};
      const mod = ability.mod ?? 0;
      return {
        key,
        label: ABILITY_LABELS[key],
        base: ability.base ?? 10,
        racial: ability.racial ?? 0,
        temp: ability.temp ?? 0,
        total: ability.total ?? 10,
        mod,
        // SEMANTIC: Visual state class for modifier
        modClass: mod > 0 ? 'mod--positive' : mod < 0 ? 'mod--negative' : 'mod--zero'
      };
    });

    // Build skills array from system.derived.skills (SSOT) - NO CALCULATIONS HERE
    // The derived engine has already calculated all skill bonuses
    const systemSkills = system.skills ?? {};
    const derivedSkills = derived.skills ?? {};

    const skillsList = Object.entries(SWSE_SKILL_DEFINITIONS).map(([key, definition]) => {
      const skillData = systemSkills[key] ?? {};
      const derivedData = derivedSkills[key] ?? {};

      // Get selected ability from user data
      const selectedAbilityKey = skillData.selectedAbility ?? definition.ability ?? 'str';
      const selectedAbilityLabel = abilityMap[selectedAbilityKey] ?? 'Unknown';

      // Get ability modifier - look it up from the abilities map
      const selectedAbility = abilitiesMap[selectedAbilityKey] ?? {};
      const abilityMod = Number.isFinite(selectedAbility.mod) ? selectedAbility.mod : 0;

      // Get halfLevel from system (this is just display, not a calculation)
      const halfLevel = Math.max(0, Math.floor((system.level ?? 1) / 2));

      // Ensure all numeric values are safe for template rendering
      const safeMiscMod = Number.isFinite(skillData.miscMod) ? skillData.miscMod : 0;

      // PHASE 7: Derived is authoritative for skill totals
      // DerivedCalculator computes and stores skill totals in system.derived.skills[key].total
      // Sheet should NEVER recompute skill totals — that is DerivedCalculator's job
      // PHASE 10: Removed happy-path fallback. If derived.total is missing, use error value (0)
      // rather than rebuilding. This ensures we know when derived computation fails.
      const safeTotal = Number.isFinite(derivedData.total) ? derivedData.total : 0;

      return {
        key,
        label: definition.label,
        // Prefer derived total when present; otherwise use stable fallback display total
        total: safeTotal,
        trained: Boolean(skillData.trained),
        focused: Boolean(skillData.focused),
        favorite: Boolean(skillData.favorite),
        selectedAbility: selectedAbilityKey,
        selectedAbilityLabel,
        // Display the ability modifier (from the abilities, not calculated here)
        abilityMod,
        abilityModClass: abilityMod > 0 ? 'mod--positive' : abilityMod < 0 ? 'mod--negative' : 'mod--zero',
        // Display half-level (not calculated, just displayed)
        halfLevel,
        miscMod: safeMiscMod,
        extraUses: Array.isArray(skillData.extraUses) ? skillData.extraUses : []
      };
    });

    derived.skills = skillsList;

    // Phase 10+: Populate extraUses from ExtraSkillUseRegistry with enhanced UX
    // Adds expandable skill uses with intelligent grouping, status awareness, and filtering.
    //
    // Hydration is staged so one bad skill never wipes the whole panel:
    //  1. Registry init is its own failure domain — if it throws, the registry is
    //     unusable, so every skill fails closed. This is a hard prereq.
    //  2. Per-skill hydration runs inside its own try/catch, so a single skill's
    //     failure is isolated to that row. Errors are logged with skill key,
    //     actor id/name, and stack so live runs produce a concrete trail.
    let registryReady = true;
    try {
      await ExtraSkillUseRegistry.initialize();
    } catch (err) {
      registryReady = false;
      swseLogger.error("[CharacterSheet] ExtraSkillUseRegistry.initialize() failed; every skill will have empty extraUses", {
        actorId: actor?.id,
        actorName: actor?.name,
        error: err?.message,
        stack: err?.stack
      });
    }

    for (const skill of derived.skills) {
      if (!registryReady) {
        skill.extraUses = [];
        skill.extraUsesGrouped = {};
        skill.extraUsesCount = 0;
        skill.hasExtraUses = false;
        continue;
      }

      try {
        const skillUses = await ExtraSkillUseRegistry.getForSkill(skill.key, { actor, includeInaccessible: true });
        const rawCount = skillUses.length;
        const accessibleCount = skillUses.filter(u => u.accessible !== false).length;
        const inaccessibleCount = rawCount - accessibleCount;

        // Normalize each skill use with enhanced metadata
        const normalizedUses = skillUses.map(use => {
          const timeClass = this._getTimeClass(use.time);
          const timeLabel = this._getTimeLabel(use.time);
          const actionType = this._classifyActionType(use);
          const actionTypeLabel = this._getActionTypeLabel(use);
          const isBlocked = use.trainedOnly && !skill.trained;
          const blockedReason = isBlocked ? "Requires training" : "";
          const sourceType =
            use.sourceType ??
            use.source ??
            (use.trainedOnly ? "trained" : "core");
          const sourceLabel =
            use.sourceLabel ??
            use.sourceName ??
            (use.trainedOnly ? "Trained Use" : "Core Use");

          return {
            key: use.key,
            useKey: use.key,
            label: use.label,
            name: use.name,
            dc: use.dc,
            time: use.time,
            description: use.description || use.effect || '',
            effect: use.effect,
            trainedOnly: use.trainedOnly,
            // Action economy styling
            timeClass,
            timeLabel,
            // Action type classification
            actionType,
            actionTypeLabel,
            // Status awareness
            requiresTrained: use.trainedOnly,
            skillTrained: skill.trained,
            isBlocked,
            canUseNow: !isBlocked,
            blockedReason,
            // Provenance / runtime stability
            sourceType,
            sourceLabel,
            // Grouping category
            category: this._categorizeSkillUse(use, skill.key)
          };
        });

        // Group uses by category for better scanning
        const grouped = {};
        normalizedUses.forEach(use => {
          const cat = use.category;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(use);
        });

        // Store both flat array (for backwards compatibility) and grouped structure
        skill.extraUses = normalizedUses;
        skill.extraUsesGrouped = grouped;
        skill.extraUsesCount = normalizedUses.length;
        skill.hasExtraUses = normalizedUses.length > 0;

        // Targeted instrumentation: always log useTheForce (the primary offender),
        // and log any skill that lost entries between registry and template
        // (raw>0 but grouped==0 means something dropped silently mid-pipeline).
        const groupedCount = Object.values(grouped).reduce((acc, arr) => acc + arr.length, 0);
        const hasSilentDrop = rawCount > 0 && groupedCount === 0;
        if (skill.key === 'useTheForce' || hasSilentDrop) {
          swseLogger.debug("[CharacterSheet] Skill extra-use hydration metrics", {
            actorId: actor?.id,
            actorName: actor?.name,
            skillKey: skill.key,
            skillLabel: skill.label,
            trained: skill.trained,
            rawCount,
            accessibleCount,
            inaccessibleCount,
            normalizedCount: normalizedUses.length,
            groupedCount,
            hasExtraUses: skill.hasExtraUses,
            silentDrop: hasSilentDrop
          });
        }
      } catch (err) {
        swseLogger.error("[CharacterSheet] extra-use hydration failed for skill", {
          actorId: actor?.id,
          actorName: actor?.name,
          skillKey: skill.key,
          skillLabel: skill.label,
          error: err?.message,
          stack: err?.stack
        });
        skill.extraUses = [];
        skill.extraUsesGrouped = {};
        skill.extraUsesCount = 0;
        skill.hasExtraUses = false;
      }
    }

    // PHASE 7.5: Defenses view-model note
    // buildDefensesViewModel() is used by PanelContextBuilder.buildDefensePanel()
    // Header defenses are read directly from defensePanel.defenses (which is built by that helper)
    // No separate headerDefenses computation needed — one canonical source

    // PHASE 7: Read class display from canonical derived.identity bundle
    // character-actor.js.mirrorIdentity() builds this — sheet should never rebuild it
    let classDisplay = derived.identity?.classDisplay ?? '—';

    // Identity + visual customization
    const forceSensitive = system.forceSensitive ?? false;
    const identityGlowColor = forceSensitive ? '#88cfff' : '#666666';

    // Condition track steps (0-5 numeric → visual array)
    const conditionCurrent = system.conditionTrack?.current ?? 0;
    const conditionLabels = ["Normal", "−1", "−2", "−5", "−10", "Helpless"];
    const conditionSteps = [];
    for (let i = 0; i < 6; i++) {
      conditionSteps.push({
        step: i,
        label: conditionLabels[i],
        active: i === conditionCurrent
      });
    }

    // Initiative total (from derived calculation)
    const initiativeTotal = derived?.initiative?.total ?? 0;

    // Combat attacks context
    // PHASE 6: Derived is authoritative for attacks list
    // PHASE 10: Removed happy-path fallback rebuild. If derived.attacks.list is missing,
    // use empty array instead of rebuilding from items. This ensures we detect derived computation failures.
    let attacksList = derived?.attacks?.list ?? [];

    // PHASE 8 Check: If attacks list is empty, log warning for observability
    if (attacksList.length === 0) {
      swseLogger.warn(`[Phase 10] Attacks list missing from derived for ${actor.name}`, {
        actor: actor.name,
        derivedAttacks: derived?.attacks,
        note: 'Fallback rebuild has been removed in Phase 10. Check DerivedCalculator output.'
      });

      if (CONFIG?.SWSE?.debug?.contractObservability) {
        warnMissingDerivedOutput('Attacks', 'derived.attacks.list', actor.name);
      }
    }

    const combat = {
      attacks: attacksList
    };

    // PHASE 7.5: Resources Display Unification
    // Canonical sources: system.forcePoints.{value,max}, system.destinyPoints.{value,max}
    // All UI surfaces (header, biography panel, resources panel) read from these same sources
    // Force Points visual array (value as dots, with used state)
    const fpValue = system.forcePoints?.value ?? 0;
    const fpMax = system.forcePoints?.max ?? 0;

    const destinyPointsValue = system.destinyPoints?.value ?? 0;
    const destinyPointsMax = system.destinyPoints?.max ?? 0;

    const speed = typeof system.speed === "number" ? system.speed : (system.speed?.value ?? 0);

    const perceptionTotal =
      derived.skills?.perception?.total ??
      derived.skills?.perception ??
      0;

    const bab =
      derived.bab ??
      system.bab?.total ??
      system.bab ??
      system.baseAttackBonus ??
      0;

    const grappleBonus = derived.grappleBonus ?? 0;
const forcePoints = [];
    for (let i = 1; i <= fpMax; i++) {
      forcePoints.push({
        index: i,
        used: i <= fpValue
      });
    }

    // Force suite context (hand/discard zones + tag filtering)
    const forcePowers = (actor?.items ?? []).filter(i => i.type === 'force-power');
    const forceTags = [...new Set(forcePowers.flatMap(p => p.system?.tags ?? []))].sort();
    const toPlain = p => ({ id: p.id, name: p.name, img: p.img, system: foundry.utils.duplicate(p.system ?? {}) });
    const forceSuite = {
      hand: forcePowers.filter(p => !p.system?.discarded).map(toPlain),
      discard: forcePowers.filter(p => p.system?.discarded).map(toPlain)
    };

    const lightsaberConstructionEligibility = LightsaberConstructionEngine.getEligibility(actor);
    const lightsaberHasSelfBuilt = LightsaberConstructionEngine.hasSelfBuiltLightsaber(actor);
    const lightsaberConstructionDeferred = actor.getFlag?.('foundryvtt-swse', 'lightsaberConstructionDeferred') === true;
    const lightsaberConstructionAvailable = !lightsaberHasSelfBuilt && !!lightsaberConstructionEligibility?.eligible;

    // Dark Side Points context (via DSPEngine for house rule support)
    const dspValue = DSPEngine.getValue(actor);
    const dspMax = DSPEngine.getMax(actor);
    const dspSegments = [];
    for (let i = 1; i <= dspMax; i++) {
      dspSegments.push({
        index: i,
        filled: i <= dspValue,
        color: i <= dspValue ? '#E74C3C' : '#4A90E2'
      });
    }

    // Build mode (free build = prerequisites not enforced, typically set during chargen)
    const buildMode = actor.system?.buildMode ?? "normal";

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

    // Header Second Wind Context (always visible in header area)
    const swUses = Number(system.secondWind?.uses) ?? 0;
    const swMax = Number(system.secondWind?.max) ?? 1;
    const swBaseHealing = Math.ceil((system.hp?.max ?? 1) * 0.25);
    const swHealing = Number(system.secondWind?.healing) > 0 ? Number(system.secondWind?.healing) : swBaseHealing;
    const headerSecondWind = {
      canUse: swUses > 0,
      usesRemaining: swUses,
      maxUses: swMax,
      healingAmount: swHealing,
      label: `Regain ${swHealing} HP`
    };

    // Combat Actions Context (for combat tab - actions browser)
    // Load from data/combat-actions.json and organize by action economy
    let combatActions = { groups: [] };
    try {
      const response = await fetch('/systems/foundryvtt-swse/data/combat-actions.json');
      if (response.ok) {
        const actionsData = await response.json();

        // Organize by action economy type
        const grouped = {};
        const economyOrder = ['full-round', 'standard', 'move', 'swift', 'free', 'reaction'];

        for (const action of actionsData) {
          if (!action.action?.type) continue;
          const economy = action.action.type.toLowerCase().replace(/[\s+]/g, '-');
          if (!grouped[economy]) {
            grouped[economy] = [];
          }
          grouped[economy].push({
            id: action.name.toLowerCase().replace(/\s+/g, '-'),
            name: action.name,
            type: action.action.type,
            cost: action.action.cost,
            notes: action.notes,
            hasRelatedSkills: action.relatedSkills && action.relatedSkills.length > 0
          });
        }

        // Build groups in action economy order
        // Match template structure: groups[].label, groups[].count, groups[].subgroups[].label, groups[].subgroups[].items[]
        for (const eco of economyOrder) {
          if (grouped[eco]) {
            // Template expects: groups > subgroups > items
            // So wrap actions in a subgroup structure
            combatActions.groups.push({
              label: eco.charAt(0).toUpperCase() + eco.slice(1).replace('-', ' '),  // "Standard" from "standard"
              count: grouped[eco].length,
              subgroups: [{
                label: eco.charAt(0).toUpperCase() + eco.slice(1).replace('-', ' '),
                count: grouped[eco].length,
                items: grouped[eco]
              }]
            });
          }
        }
      }
    } catch (err) {
      console.warn('[SWSE] Failed to load combat actions:', err);
      // Gracefully degrade - will show empty state
    }

    /* ============================================================
       MISSING CONTEXT KEYS (REMEDIATION)
    ============================================================ */

    // XP System Configuration and Progress
    const xpSystem = CONFIG.SWSE?.system?.xpProgression || 'milestone';
    const xpEnabled = xpSystem !== 'disabled';
    const xpDerived = derived.xp ?? { total: 0, progressPercent: 0, xpToNext: 0, level: actor.system.level ?? 1 };
    const xpDisplayLevel = Math.max(1, Number(actor.system.level ?? xpDerived.level ?? 1));
    const xpTotal = Number(xpDerived.total ?? actor.system?.xp?.total ?? 0) || 0;
    const xpPercent = Math.max(0, Math.min(100, Math.round(Number(xpDerived.progressPercent ?? 0) || 0)));
    const nextLevelAtDisplay = XP_LEVEL_THRESHOLDS[Math.min(20, xpDisplayLevel + 1)] ?? null;
    const xpLevelReady = xpPercent >= 100;
    const xpSegments = Array.from({ length: 20 }, (_, index) => ({
      index,
      filled: ((index + 1) / 20) * 100 <= xpPercent + 0.0001
    }));

    const xpData = {
      level: xpDisplayLevel,
      total: xpTotal,
      nextLevelAt: nextLevelAtDisplay,
      xpToNext: nextLevelAtDisplay !== null ? Math.max(0, nextLevelAtDisplay - xpTotal) : 0,
      percentRounded: xpPercent,
      segments: xpSegments,
      stateClass: xpLevelReady ? 'state--ready-levelup' : xpPercent >= 75 ? 'state--nearly-ready' : 'state--in-progress'
    };

    // PHASE 7.5: HEADER SEGMENTS: Consume canonical HP view-model
    // buildHeaderHpSegments() uses the same HP data as all other HP displays
    const headerHpSegments = buildHeaderHpSegments(actor);

    let panelContexts = {};

    // ═════════════════════════════════════════════════════════════════
    // PHASE 8: CONTRACT OBSERVABILITY — CRITICAL LITMUS TESTS
    // These four checks verify that Phase 7-7.5 unification actually landed
    // ═════════════════════════════════════════════════════════════════

    // PHASE 8.1: HP Bundle Divergence Check
    // Verify that HP bar and HP numeric display use same source
    if (CONFIG?.SWSE?.debug?.contractObservability) {
      const healthPanelHp = panelContexts.healthPanel?.hp;
      if (healthPanelHp && (healthPanelHp.value !== headerHpSegments[0]?.hpValue)) {
        // Note: This is a basic check — more sophisticated checks would verify they both came from buildHpViewModel
        // Currently both use buildHpViewModel so this check passes
      }
    }

    // PHASE 8.2: Defense Source Unification Check
    // Verify header defenses and defense panel use same source (both should use buildDefensesViewModel)
    if (CONFIG?.SWSE?.debug?.contractObservability) {
      const defensePanel = panelContexts.defensePanel;
      if (!defensePanel || !defensePanel.defenses) {
        warnMissingDerivedOutput('Defenses', 'defensePanel.defenses', actor.name);
      }
    }

    // PHASE 8.3: Missing Derived Outputs Check
    // Verify all expected derived bundles are present
    if (CONFIG?.SWSE?.debug?.contractObservability) {
      const missingBundles = [];
      if (!derived.defenses) missingBundles.push('system.derived.defenses');
      if (!derived.skills || Object.keys(derived.skills).length === 0) missingBundles.push('system.derived.skills');
      if (!derived.attacks || !derived.attacks.list) missingBundles.push('system.derived.attacks.list');
      if (!derived.identity || !derived.identity.classDisplay) missingBundles.push('system.derived.identity.classDisplay');

      if (missingBundles.length > 0) {
        missingBundles.forEach(path => {
          warnMissingDerivedOutput('Sheet', path, actor.name);
        });
      }
    }

    const xpFilledSegments = Math.round((xpPercent / 100) * 20);
    const headerXpSegments = Array.from({ length: 20 }, (_, index) => ({
      filled: index < xpFilledSegments
    }));

    // Character Level Checks
    const level = actor.system.level ?? 1;
    const isLevel0 = level === 0;

    // DIAGNOSTIC: Log level info (disabled to reduce console spam)
    // swseLogger.debug('[CHARGEN DEBUG] Character level info:', {
    //   'actor.system.level': actor.system.level,
    //   'level (after default)': level,
    //   'isLevel0': isLevel0,
    //   'actor name': actor.name
    // });

    // User Permission (GM status)
    const isGM = game.user.isGM;

    // Force Points Availability (fpMax and fpValue already computed above)
    const fpAvailable = fpValue < fpMax;

    // Encumbrance Display Data
    const encumbranceState = derived.encumbrance?.state ?? 'normal';
    const encumbranceLabel = derived.encumbrance?.label ?? 'Unencumbered';
    const encumbranceStateCss = encumbranceState === 'heavy'
      ? 'color: #ff6b35;'
      : encumbranceState === 'overloaded'
      ? 'color: #cc0000;'
      : '';

    // Inventory Weight Calculation
    let totalWeight = 0;
    for (const item of actor.items) {
      if (['equipment', 'armor', 'weapon'].includes(item.type)) {
        const weight = item.system?.weight ?? 0;
        const qty = item.system?.quantity ?? 1;
        totalWeight += weight * qty;
      }
    }

    // Inventory Search Filter (initially empty, populated by user input)
    const inventorySearch = '';

    // Follower Context (from flags and system)
    const followerSlots = actor.getFlag('foundryvtt-swse', 'followerSlots') || [];
    const ownedActorMap = {};
    for (const entry of actor.system.ownedActors || []) {
      ownedActorMap[entry.id] = {
        id: entry.id,
        name: entry.name,
        type: entry.type,
        img: entry.img,
        system: entry
      };
    }

    // Aggregate follower talent badges
    const followerTalentBadges = [];
    const seenTalents = new Set();
    try {
      const { FOLLOWER_TALENT_CONFIG } = await import(
        '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js'
      ).catch(() => ({ FOLLOWER_TALENT_CONFIG: {} }));

      for (const slot of followerSlots) {
        if (!seenTalents.has(slot.talentName)) {
          seenTalents.add(slot.talentName);
          const cfg = FOLLOWER_TALENT_CONFIG[slot.talentName];
          const filled = followerSlots
            .filter(s => s.talentName === slot.talentName)
            .filter(s => !!s.createdActorId).length;

          followerTalentBadges.push({
            talentName: slot.talentName,
            current: filled,
            max: cfg?.maxCount ?? 0
          });
        }
      }
    } catch (err) {
      // Silently fail follower aggregation if import fails
    }

    // Enrich follower slots with actor data
    const enrichedFollowerSlots = followerSlots.map(slot => {
      const actorData = slot.createdActorId ? ownedActorMap[slot.createdActorId] : null;
      return {
        ...slot,
        actor: actorData ? { id: actorData.id, name: actorData.name, type: actorData.type } : null,
        tokenImg: actorData?.img || '',
        roleLabel: slot.templateChoices?.[0] || 'Standard',
        level: actorData?.system.level || 1,
        hp: { value: actorData?.system.hp?.value || 0, max: actorData?.system.hp?.max || 1 },
        tags: slot.templateChoices || [],
        isLocked: false
      };
    });

    // Phase 3.5: Check if owner has available (unfilled) follower slots for UI visibility
    const hasAvailableFollowerSlots = followerSlots.some(slot => !slot.createdActorId);

    // Calculate total talent count for ledger display
    const totalTalentCount = derived.talents?.groups?.reduce((sum, group) => sum + (group.items?.length || 0), 0) || 0;

    // ═════════════════════════════════════════════════════════════════
    // PANEL CONTEXT HYDRATION (Unified panel view models)
    // ═════════════════════════════════════════════════════════════════
    //
    // Phase 6 Optimization: Selective/lazy panel building
    // - Only visible panels are built on every render
    // - Hidden panels are built on demand when user navigates to them
    // - This reduces render overhead from ~5-15ms to ~2-5ms in typical use
    //
    this.panelDiagnostics.startSession(`render-${this._renderCount}`);

    const panelBuilder = new PanelContextBuilder(this.document, this);
    const panelsToBuild = this.visibilityManager.getPanelsToBuild(this.document);
    const panelsToSkip = this.visibilityManager.getPanelsSkipped(this.document);

    // CRITICAL: Always build 'healthPanel' for header HP bar display
    // Note: Panel name is 'healthPanel' (registered in PANEL_REGISTRY), not 'health'
    if (!panelsToBuild.includes('healthPanel')) {
      panelsToBuild.push('healthPanel');
    }

    // Build visible panels + cached hidden panels
    panelContexts = {};
    for (const panelName of panelsToBuild) {
      const startTime = performance.now();
      const builderMethod = `build${panelName.charAt(0).toUpperCase() + panelName.slice(1)}`;

      if (typeof panelBuilder[builderMethod] === 'function') {
        try {
          panelContexts[panelName] = panelBuilder[builderMethod]();
          const duration = performance.now() - startTime;
          this.panelDiagnostics.recordPanelBuild(panelName, duration);
          this.visibilityManager.markPanelBuilt(panelName);
        } catch (err) {
          // console.error(`[PANEL BUILD ERROR] ${panelName}:`, err);
          this.panelDiagnostics.recordError(panelName, err.message);
          emitHydrationError('PANEL_BUILD_FAILED', {
            actorId: this.actor?.id,
            actorName: this.actor?.name,
            panelName,
            builderMethod,
            error: err?.message,
            stack: err?.stack,
            mutation: getRecentHydrationMutation(this),
            snapshot: captureHydrationSnapshot(this.actor)
          });
          // Provide empty fallback to prevent template errors
          panelContexts[panelName] = {};
        }
      } else {
        console.warn(`[PANEL BUILD] No builder found for ${panelName}`);
      }
    }

    // Log skipped panels for diagnostics
    if (panelsToSkip.length > 0) {
      for (const panelName of panelsToSkip) {
        this.panelDiagnostics.recordPanelSkipped(panelName, 'not visible');
      }
    }

    this.panelDiagnostics.endSession();

    registerCustomSkillsHelpers();

    const _safeCloneVm = (vm) => {
      if (!vm) return null;
      try { return structuredClone(vm); } catch { return { error: 'VM contains non-serializable data' }; }
    };

    let shellSurfaceVm = null;
    let shellOverlayVm = null;
    let shellDrawerVm = null;

    if (this._shellSurface !== 'sheet') {
      try {
        const raw = await ShellSurfaceRegistry.buildSurfaceVm({
          actor,
          surfaceId: this._shellSurface,
          surfaceOptions: this._shellSurfaceOptions,
          shellHost: this
        });
        shellSurfaceVm = _safeCloneVm(raw);
      } catch (err) {
        swseLogger.error('[ShellHost] Surface VM build failed:', err);
        shellSurfaceVm = { error: err.message, surfaceId: this._shellSurface };
      }
    }

    if (this._shellOverlay) {
      try {
        const raw = await ShellSurfaceRegistry.buildOverlayVm({
          actor,
          overlayId: this._shellOverlay.overlayId,
          overlayOptions: this._shellOverlay.options,
          shellHost: this
        });
        shellOverlayVm = _safeCloneVm(raw);
      } catch (err) {
        swseLogger.error('[ShellHost] Overlay VM build failed:', err);
        shellOverlayVm = { error: err.message };
      }
    }

    if (this._shellDrawer) {
      try {
        const raw = await ShellSurfaceRegistry.buildDrawerVm({
          actor,
          drawerId: this._shellDrawer.drawerId,
          drawerOptions: this._shellDrawer.options,
          shellHost: this
        });
        shellDrawerVm = _safeCloneVm(raw);
      } catch (err) {
        swseLogger.error('[ShellHost] Drawer VM build failed:', err);
        shellDrawerVm = { error: err.message };
      }
    }

    // Log panel contract version for debugging
    const _sheetContractVersion = 1;

    const conceptLayout = buildConceptSheetViewModel({
      ...context,
      ...panelContexts,
      isGM,
      isLevel0,
      buildMode,
      actionEconomy,
      xpLevelReady,
      derived,
      abilities,
      xpData,
      headerHpSegments,
      headerXpSegments,
      speed,
      initiativeTotal,
      perceptionTotal,
      bab,
      grappleBonus,
      forcePointsValue: fpValue,
      forcePointsMax: fpMax,
      destinyPointsValue,
      destinyPointsMax,
      classDisplay,
      forceSensitive,
      actor
    });

    const finalContext = {
      ...context,
      _sheetContractVersion,
      _panels: {
        health: true,
        defense: true,
        biography: true,
        inventory: true,
        talent: true,
        feat: true,
        maneuver: true
      },
      // ═════════════════════════════════════════════════════════════════
      // PHASE 5: Removed legacy flat context
      // All data is now provided through panelized contexts above.
      // The following are essential state/permission flags with no panel equivalent:
      // ═════════════════════════════════════════════════════════════════
      isGM,
      isLevel0,
      buildMode,
      actionEconomy,
      xpLevelReady,
      derived,  // Complex computed stats (defenses, damage, etc.)
      // Phase 9: Tier-aware help system context
      helpLevel: this._helpLevel,
      helpLevelLabel: HelpModeManager.getHelpLevelLabel(this._helpLevel),
      helpLevelDescription: HelpModeManager.getHelpLevelDescription(this._helpLevel),
      // ═════════════════════════════════════════════════════════════════
      // PHASE 11: THEME & MOTION CONTROL CONTEXT
      // ═════════════════════════════════════════════════════════════════
      sheetTheme: getActorSheetTheme(actor.getFlag('foundryvtt-swse', 'sheetTheme')),
      sheetThemeGroups: getActorSheetThemeGroups(getActorSheetTheme(actor.getFlag('foundryvtt-swse', 'sheetTheme'))),
      sheetMotionStyle: getActorSheetMotionStyle(actor.getFlag('foundryvtt-swse', 'sheetMotionStyle')),
      sheetMotionOptions: getActorSheetMotionStyleOptions(),
      // ═════════════════════════════════════════════════════════════════
      // PHASE 2: MISSING CONTEXT KEYS (REMEDIATION)
      // ═════════════════════════════════════════════════════════════════
      xpEnabled,                    // XP system active/disabled flag
      xpPercent,                    // XP progress percentage for bar fill
      fpAvailable,                  // Force points available for use
      abilities,                    // Array of ability objects with modifiers
      followerSlots,                // Follower slots from actor flags
      followerTalentBadges,         // Aggregated follower talent badges
      enrichedFollowerSlots,        // Follower slots enriched with actor data
      hasAvailableFollowerSlots,    // Whether any slots are unfilled
      xpData,                       // XP progress data for display
      headerHpSegments,             // 20-step segmented HP bar
      headerXpSegments,             // 20-step segmented XP bar
      // Inventory categorized items (for inventory panel legacy support)
      equipment: Object.values(actor.items).filter(i => i.type === 'equipment'),
      armor: Object.values(actor.items).filter(i => i.type === 'armor'),
      weapons: Object.values(actor.items).filter(i => i.type === 'weapon'),
      // ═════════════════════════════════════════════════════════════════
      // PHASE 6: Combat & Resources Display Data
      // ═════════════════════════════════════════════════════════════════
      speed,                        // Movement speed (ft./round)
      initiativeTotal,              // Initiative modifier
      perceptionTotal,              // Perception skill total
      bab,                          // Base attack bonus
      grappleBonus,                 // Grapple bonus (BAB + STR + size modifiers)
      forcePointsValue: fpValue,    // Current force points (from system.forcePoints.value)
      forcePointsMax: fpMax,        // Max force points (from system.forcePoints.max)
      destinyPointsValue,           // Current destiny points (from system.destinyPoints.value)
      destinyPointsMax,             // Max destiny points (from system.destinyPoints.max)
      forcePoints,                  // Visual array of force point dots
      headerSecondWind,             // Header condensed Second Wind control data
      lightsaberConstructionAvailable,
      lightsaberConstructionDeferred,
      lightsaberConstructionEligibleNow: !!lightsaberConstructionEligibility?.eligible,
      lightsaberConstructionBlockedReason: lightsaberConstructionEligibility?.reason ?? null,
      // ═════════════════════════════════════════════════════════════════
      // PHASE 7.5: Identity Summary Data (multiclass format)
      // ═════════════════════════════════════════════════════════════════
      // PHASE 8: classDisplay is canonical from system.derived.identity.classDisplay
      // Built by character-actor.js buildClassDisplay() — preserves exact actor class progression order
      // No heroic-first sorting. All displays read this single source.
      classDisplay,                 // Multiclass display format (e.g. "Jedi 3 / Soldier 2")
      identityGlowColor,            // Force-sensitive glow color
      forceSensitive,               // Whether character is force-sensitive
      // ═════════════════════════════════════════════════════════════════
      // PHASE 9: Combat Actions Browser (in-tab)
      // ═════════════════════════════════════════════════════════════════
      combatActions,                // Organized combat actions by economy type
      // ═════════════════════════════════════════════════════════════════
      // UNIFIED PANEL CONTEXTS (Primary data source)
      // Panels now own all character data through dedicated view models
      // ═════════════════════════════════════════════════════════════════
      ...panelContexts,
      // ─── Phase 11: Shell Host Context ──────────────────────────────────
      customSkillsEditable: this.isEditable,
      shellSurface: this._shellSurface,
      shellSurfaceOptions: this._shellSurfaceOptions,
      shellOverlay: this._shellOverlay,
      shellDrawer: this._shellDrawer,
      shellIsSheet: this._shellSurface === 'sheet',
      shellSurfaceVm,
      shellOverlayVm,
      shellDrawerVm,
      conceptLayout
    };

    // Verify context is serializable (no Document refs, circular refs, etc.)
    RenderAssertions.assertContextSerializable(finalContext, "SWSEV2CharacterSheet");

    // GUARDRAIL 1: Validate context contract to prevent silent template failures
    validateContextContract(finalContext, "SWSEV2CharacterSheet");

    // Store context for post-render assertions
    this._currentContext = finalContext;

    return finalContext;
  }

  /* ============================================================
     INVENTORY VIEW MODEL (READ-ONLY)
  ============================================================ */

  _buildInventoryModel(actor) {
    const items = Array.from(actor.items);

    // Map of item type -> display category
    const typeToCategory = {
      weapon: "Weapons",
      armor: "Armor",
      shield: "Armor",
      equipment: "Equipment",
      consumable: "Consumables",
      misc: "Miscellaneous",
      ammo: "Ammunition"
    };

    // Build inventory groups
    const inventory = new Map();

    // Initialize standard groups
    ["Weapons", "Armor", "Equipment", "Consumables"].forEach(group => {
      inventory.set(group, []);
    });

    // Sort items into groups with full data
    items.forEach(item => {
      const category = typeToCategory[item.type] || "Miscellaneous";

      // Ensure category exists in map
      if (!inventory.has(category)) {
        inventory.set(category, []);
      }

      const itemData = {
        id: item.id,
        name: item.name,
        type: item.type,
        category: item.type,
        img: item.img,
        quantity: item.system?.quantity ?? 1,
        weight: item.system?.weight ?? 0,
        cost: item.system?.cost ?? 0,
        equipped: item.system?.equipped ?? false
      };

      inventory.get(category).push(itemData);
    });

    // Remove empty groups
    for (const [key, items] of inventory.entries()) {
      if (items.length === 0) {
        inventory.delete(key);
      }
    }

    // Convert to object for Handlebars iteration
    return Object.fromEntries(inventory);
  }

  /* ============================================================
     LISTENERS (UI ONLY)
  ============================================================ */

  activateListeners(html, { signal } = {}) {
    // Phase 8: Delegate listener registration to focused listeners module
    return registerListeners(this, html, { signal });
  }

  /**
   * Internal listener activation - moved from activateListeners by Phase 8 refactoring
   * Contains all inline listener registration logic for the character sheet
   * @param {HTMLElement} html - The rendered sheet element
   * @param {AbortSignal} signal - Abort signal for cleanup
   * @private
   */
  _activateListenersInternal(html, { signal } = {}) {

    // === HP INPUT HANDLING ===
    html.querySelectorAll('.hp-input').forEach(input => {
      input.addEventListener('change', async (event) => {
        const el = event.currentTarget;
        const path = el.dataset.path;
        const value = Number(el.value);

        if (!path || Number.isNaN(value)) return;

        try {
          // Current HP: Clamp between 0 and max
          if (path === "system.hp.value") {
            const max = foundry.utils.getProperty(this.actor, "system.hp.max") ?? 0;
            const clamped = Math.clamped(value, 0, max);
            await ActorEngine.updateActor(this.actor, { [path]: clamped }, { source: 'character-sheet-hp-input' });
            return;
          }

          // Temp HP: Clamp ≥ 0 only
          if (path === "system.hp.temp") {
            await ActorEngine.updateActor(this.actor, { [path]: Math.max(0, value) }, { source: 'character-sheet-hp-input' });
            return;
          }

          // Max HP: Use ActorEngine.recomputeHP (governance constraint)
          // This recalculates from class + level + CON + bonuses
          if (path === "system.hp.max") {
            // Clamp current HP if it exceeds new max
            const current = foundry.utils.getProperty(this.actor, "system.hp.value") ?? 0;
            const newMax = Math.max(1, value);
            if (current > newMax) {
              await ActorEngine.updateActor(this.actor, { "system.hp.value": newMax }, { source: 'character-sheet-hp-input' });
            }
            // Trigger recomputation (will be overridden by actual class-based calc)
            await ActorEngine.recomputeHP(this.actor);
            return;
          }
        } catch (err) {
          // console.error('[HP-INPUT] Error updating HP:', err);
          ui.notifications.error(`Failed to update HP: ${err.message}`);
        }
      }, { signal });
    });

    // swseLogger.debug('[LIFECYCLE] activateListeners called with html element:', {
    //   htmlTag: html?.tagName,
    //   htmlClasses: html?.className,
    //   signalExists: !!signal
    // });

    // CRITICAL: Attach form submit listener directly to the form element
    // Template guarantees a stable form selector: .swse-character-sheet-form
    // This single resolution approach prevents ambiguity and silent failures
    // swseLogger.debug('[LIFECYCLE] Resolving form: looking for .swse-character-sheet-form');

    let form = null;
    // If html IS the form, use it directly
    if (html.tagName === 'FORM' && html.classList.contains('swse-character-sheet-form')) {
      form = html;
      // swseLogger.debug('[LIFECYCLE] ✓ html IS the form (by tag + class)');
    } else {
      // Otherwise find it via stable selector (now a div, not a form)
      form = html.querySelector('.swse-character-sheet-form');
      if (!form) {
        // swseLogger.debug('[LIFECYCLE] Form not found in html, trying appRoot');
        const appRoot = this.element instanceof HTMLElement ? this.element : this.element?.[0];
        form = appRoot?.querySelector('.swse-character-sheet-form') ?? null;
      }
    }

    // swseLogger.debug('[LIFECYCLE] Form resolution result:', {
    //   found: !!form,
    //   formTag: form?.tagName,
    //   formClasses: form?.className,
    //   isConnected: form?.isConnected
    // });

    if (form) {
      // swseLogger.debug('[LIFECYCLE] Form found, attaching submit listener');
      // swseLogger.debug('[LIFECYCLE] Form element details:', {
      //   tag: form.tagName,
      //   classes: form.className,
      //   childCount: form.children.length,
      //   isConnected: form.isConnected  // Critical: is it in the DOM?
      // });

      const submitHandler = async (ev) => {
        // swseLogger.debug('[PERSISTENCE] ─── SUBMIT EVENT FIRED ───');
        // swseLogger.debug('[PERSISTENCE] Event target:', ev.target.tagName, ev.target.className);
        // swseLogger.debug('[PERSISTENCE] defaultPrevented BEFORE:', ev.defaultPrevented);

        ev.preventDefault();
        ev.stopPropagation();

        // swseLogger.debug('[PERSISTENCE] defaultPrevented AFTER:', ev.defaultPrevented);
        // swseLogger.debug('[PERSISTENCE] Calling _onSubmitForm now');

        // Route to our update handler
        try {
          await this._onSubmitForm({ target: form, preventDefault: () => {} });
          // swseLogger.debug('[PERSISTENCE] _onSubmitForm completed successfully');
        } catch (err) {
          // console.error('[PERSISTENCE] _onSubmitForm threw error:', err);
        }
      };

      form.addEventListener("submit", submitHandler, { signal, capture: false });

      // swseLogger.debug('[LIFECYCLE] Submit listener attached successfully');
      swseLogger.debug('[LIFECYCLE] Will listener survive? Checking signal status:', {
        signalAborted: signal?.aborted ?? 'N/A'
      });
    } else {
      // console.error('[LIFECYCLE] ❌ CRITICAL: Could not find form element to attach submit listener');
      // console.error('[LIFECYCLE] This means NO submit interception will happen');
    }

    // DELEGATED: Help Mode Cycling (OFF → CORE → STANDARD → ADVANCED → OFF)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='toggle-help-mode']");
      if (!button) return;

      ev.preventDefault();

      // Cycle to next help level
      this._helpLevel = HelpModeManager.getNextLevel(this._helpLevel);

      // Persist to actor flags
      await HelpModeManager.setHelpLevel(this.document, this._helpLevel);

      // Update button text with current help level label
      button.textContent = HelpModeManager.getHelpLevelLabel(this._helpLevel);
      button.setAttribute("title", HelpModeManager.getHelpLevelDescription(this._helpLevel));

      // Update sheet root class for CSS styling
      // Remove all help-level classes first
      HelpModeManager.getLevels().forEach(level => {
        html.classList.remove(`help-level--${level.toLowerCase()}`);
      });
      // Add current help level class
      html.classList.add(`help-level--${this._helpLevel.toLowerCase()}`);

      // Update the TooltipRegistry help mode state (for tier-aware tooltip visibility)
      const { TooltipRegistry } = await import("/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js");
      TooltipRegistry.setHelpMode(HelpModeManager.isActive(this._helpLevel));

      // swseLogger.debug(`[HELP-MODE] Cycled to: ${this._helpLevel}`);
    }, { signal });

    // DELEGATED: Theme Dropdown - Update actor flag and apply theme
    html.addEventListener("change", async ev => {
      const select = ev.target.closest("select[data-control='theme']");
      if (!select) return;
      ev.preventDefault();
      const themeKey = select.value;
      if (!themeKey) return;
      try {
        await this.document.setFlag('foundryvtt-swse', 'sheetTheme', themeKey);
        const sheetShell = html.querySelector('.sheet-shell');
        if (sheetShell) {
          const currentMotion = getActorSheetMotionStyle(this.document.getFlag('foundryvtt-swse', 'sheetMotionStyle'));
          sheetShell.setAttribute('data-theme', themeKey);
          sheetShell.setAttribute('data-motion-style', currentMotion);
          const styleString = [buildActorSheetThemeStyle(themeKey), buildActorSheetMotionStyle(currentMotion)]
            .filter(Boolean)
            .join('; ');
          if (styleString) {
            sheetShell.setAttribute('style', styleString);
          }
        }
        await this.render(false);
      } catch (err) {
        swseLogger.error('[THEME] Error setting sheet theme:', err);
        ui.notifications?.error?.(`Failed to set theme: ${err.message}`);
      }
    }, { signal });

    // DELEGATED: Motion Style Dropdown - Update actor flag and apply motion
    html.addEventListener("change", async ev => {
      const select = ev.target.closest("select[data-control='motion']");
      if (!select) return;
      ev.preventDefault();
      const motionStyle = select.value;
      if (!motionStyle) return;
      try {
        await this.document.setFlag('foundryvtt-swse', 'sheetMotionStyle', motionStyle);
        const sheetShell = html.querySelector('.sheet-shell');
        if (sheetShell) {
          const currentTheme = getActorSheetTheme(this.document.getFlag('foundryvtt-swse', 'sheetTheme'));
          sheetShell.setAttribute('data-theme', currentTheme);
          sheetShell.setAttribute('data-motion-style', motionStyle);
          const styleString = [buildActorSheetThemeStyle(currentTheme), buildActorSheetMotionStyle(motionStyle)]
            .filter(Boolean)
            .join('; ');
          if (styleString) {
            sheetShell.setAttribute('style', styleString);
          }
        }
        await this.render(false);
      } catch (err) {
        swseLogger.error('[MOTION] Error setting motion style:', err);
        ui.notifications?.error?.(`Failed to set motion style: ${err.message}`);
      }
    }, { signal });
    // DELEGATED: Tab Switching - Route through shared UI state manager
    // This prevents "blank body" states where DOM classes and remembered state diverge.
    html.addEventListener("click", ev => {
      const tabLink = ev.target.closest("[data-action='tab']");
      if (!tabLink) return;

      const tabName = tabLink.dataset.tab;
      if (!tabName) return;

      ev.preventDefault();
      ev.stopPropagation();

      // swseLogger.debug(`[TAB SWITCH] Switching to tab: ${tabName}`);

      // PHASE 2: UIStateManager is the sole owner of tab activation.
      // Visibility manager tracks which panels should be built for this tab.
      this.visibilityManager?.setActiveTab?.(tabName);
      // UIStateManager manages all DOM updates (active classes, panel visibility).
      this.uiStateManager?._activateTab?.(tabLink);
      // Removed hard DOM toggle: UIStateManager._activateTab already handles all necessary DOM changes.
    }, { signal });


    // DELEGATED: Toggle Abilities Panel - Show/Hide Expanded Views
    // Using delegated listeners from html root for stability across rerenders
    html.addEventListener("click", ev => {
      const button = ev.target.closest("[data-action='toggle-abilities']");
      if (!button) return;

      // swseLogger.debug("✓ [DEBUG] Abilities toggle click fired");
      ev.preventDefault();

      const panel = button.closest(".abilities-panel");
      // swseLogger.debug("[DEBUG] Panel found:", !!panel, "Classes:", panel?.className);
      if (!panel) {
        console.warn("[ERROR] Could not find .abilities-panel parent");
        return;
      }

      // swseLogger.debug("[DEBUG] Classes BEFORE toggle:", panel.className);
      const isExpanded = panel.classList.toggle("abilities-expanded");
      // swseLogger.debug("[DEBUG] Classes AFTER toggle:", panel.className, "| isExpanded:", isExpanded);

      // Show/hide expanded views for each ability
      const rows = panel.querySelectorAll(".ability-row");
      // swseLogger.debug("[DEBUG] Found", rows.length, "ability rows");
      rows.forEach((row, idx) => {
        const collapsed = row.querySelector(".ability-collapsed");
        const expanded = row.querySelector(".ability-expanded");
        if (collapsed) {
          collapsed.style.display = isExpanded ? "none" : "flex";
          // swseLogger.debug(`[DEBUG] Row ${idx} collapsed display:`, collapsed.style.display);
        }
        if (expanded) {
          expanded.style.display = isExpanded ? "flex" : "none";
          // swseLogger.debug(`[DEBUG] Row ${idx} expanded display:`, expanded.style.display);
        }
      });

      // Update button text
      button.textContent = isExpanded ? "Collapse" : "Expand";
      // swseLogger.debug("[DEBUG] Button text updated to:", button.textContent);
    }, { signal });

// DELEGATED: Toggle Defenses Panel - Show/Hide Expanded Views
    html.addEventListener("click", ev => {
      const button = ev.target.closest("[data-action='toggle-defenses']");
      if (!button) return;

      // swseLogger.debug("✓ [DEBUG] Defenses toggle click fired");
      ev.preventDefault();

      const panel = button.closest(".defenses-panel");
      // swseLogger.debug("[DEBUG] Panel found:", !!panel, "Classes:", panel?.className);
      if (!panel) {
        console.warn("[ERROR] Could not find .defenses-panel parent");
        return;
      }

      // swseLogger.debug("[DEBUG] Classes BEFORE toggle:", panel.className);
      const isExpanded = panel.classList.toggle("defenses-expanded");
      // swseLogger.debug("[DEBUG] Classes AFTER toggle:", panel.className, "| isExpanded:", isExpanded);

      // Show/hide expanded views for each defense
      const rows = panel.querySelectorAll(".defense-row");
      // swseLogger.debug("[DEBUG] Found", rows.length, "defense rows");
      rows.forEach((row, idx) => {
        const collapsed = row.querySelector(".defense-collapsed");
        const expanded = row.querySelector(".defense-expanded");
        if (collapsed) {
          collapsed.style.display = isExpanded ? "none" : "flex";
          // swseLogger.debug(`[DEBUG] Row ${idx} collapsed display:`, collapsed.style.display);
        }
        if (expanded) {
          expanded.style.display = isExpanded ? "flex" : "none";
          // swseLogger.debug(`[DEBUG] Row ${idx} expanded display:`, expanded.style.display);
        }
      });

      // Update button text
      button.textContent = isExpanded ? "Collapse" : "Expand";
      // swseLogger.debug("[DEBUG] Button text updated to:", button.textContent);
    }, { signal });

// DELEGATED: Roll Ability Check (d20 + ability modifier)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='roll-ability']");
      if (!button) return;

      ev.preventDefault();
      const abilityKey = button.dataset.ability;
      if (!abilityKey) return;

      try {
        await SWSERoll.rollAbility(this.actor, abilityKey);
      } catch (err) {
        // console.error("Ability roll failed:", err);
        ui?.notifications?.error?.(`Ability roll failed: ${err.message}`);
      }
    }, { signal });

    // DELEGATED: Roll Initiative (d20 + initiative bonus) / Take 10
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='roll-initiative'], [data-action=\"roll-initiative-take10\"]");
      if (!button) return;

      ev.preventDefault();
      const mode = button.dataset.action === "roll-initiative-take10" ? "take10" : "roll";

      try {
        await this._runCanonicalInitiative(mode);
      } catch (err) {
        // console.error("Initiative roll failed:", err);
        ui?.notifications?.error?.(`Initiative roll failed: ${err.message}`);
      }
    }, { signal });

    // DELEGATED: Auto-save form inputs when they change
    // This survives rerender because listener is on stable root element (html)
    // DEBOUNCED: Prevents keystroke spam. Multiple rapid changes batch into one update.
    html.addEventListener("change", async ev => {
      const input = ev.target.closest("input[name], textarea[name], select[name]");
      if (!input) return;

      swseLogger.debug('[PERSISTENCE] ─── CHANGE EVENT FIRED (debounced 500ms) ───');
      ev.preventDefault();

      if (isDirectFieldMutationPath(input.name)) {
        swseLogger.debug('[PERSISTENCE] Direct-field mutation path detected; bypassing broad form serialization', {
          inputName: input.name,
          inputType: input.type
        });
        await this._onSubmitForm(ev);
        return;
      }

      // DIAGNOSTIC: Log the field change
      swseLogger.debug('[PERSISTENCE] Field changed:', {
        inputName: input.name,
        inputValue: input.value,
        inputType: input.type,
        eventTarget: ev.target.tagName
      });

      // Find the form via stable selector (template-guaranteed, now a div)
      // swseLogger.debug('[PERSISTENCE] Resolving form for submission');
      let form = input.closest(".swse-character-sheet-form");

      // If not found by closest, query from app root (now a div, not a form)
      if (!form && this.element) {
        const appRoot = this.element instanceof HTMLElement ? this.element : this.element?.[0];
        form = appRoot?.querySelector(".swse-character-sheet-form") ?? null;
      }

      // swseLogger.debug('[PERSISTENCE] Form resolution result:', { found: !!form, formTag: form?.tagName, formClass: form?.className });

      if (form) {
        // swseLogger.debug('[PERSISTENCE] Form found, queuing debounced _onSubmitForm');
        try {
          this._debouncedSubmit({ target: input, preventDefault: () => {} });
          // swseLogger.debug('[PERSISTENCE] Debounced submit queued');
        } catch (err) {
          // console.error('[PERSISTENCE] Debounced submit threw error:', err);
        }
      } else {
        // console.error("[PERSISTENCE] ❌ Could not find form element to submit");
      }
    }, { signal, capture: false });

    // DELEGATED: UI-only preview math for ability pills + auto-save on blur
    // Listen on root so rerender doesn't lose listener
    html.addEventListener("input", ev => {
      const input = ev.target.closest(".ability-expanded input");
      if (!input) return;

      const row = input.closest(".ability-row");
      if (row) {
        this._previewAbilityRow(row);
      }
    }, { signal, capture: false });

    // DELEGATED: Ensure ability input changes save immediately
    // Fire change event when blur occurs on ability inputs
    html.addEventListener("blur", ev => {
      const input = ev.target.closest(".ability-expanded input");
      if (!input) return;

      const form = input.closest(".swse-character-sheet-form");
      if (form) {
        // swseLogger.debug('[PERSISTENCE] Ability input blur detected, submitting form');
        this._debouncedSubmit({ target: input, preventDefault: () => {} });
      }
    }, { signal, capture: true });

    // DELEGATED: Toggle Skill Favorite
    // Skills content may rerender, so use delegated listener
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='toggle-favorite']");
      if (!button) return;

      ev.preventDefault();
      const skillKey = button.dataset.skill;
      if (skillKey) {
        const currentFavorite = this.actor.system.skills?.[skillKey]?.favorite ?? false;
        const plan = {
          update: {
            [`system.skills.${skillKey}.favorite`]: !currentFavorite
          }
        };
        await ActorEngine.apply(this.actor, plan);
}
    }, { signal, capture: false });

    // DELEGATED: Unified Skill Roll Entry Point
    // All skill-roll affordances route through the same canonical pipeline so we do not
    // double-fire rolls or bypass the holo chat/modifier flow.
    html.addEventListener("click", async ev => {
      const button = ev.target.closest(".skill-roll-btn, .skill-name-btn.rollable, [data-action='roll-skill']");
      if (!button) return;

      ev.preventDefault();
      ev.stopPropagation();

      const skillKey = button.dataset.skill;
      if (!skillKey) return;

      const wantsModifierDialog = button.dataset.modDialog === 'true'
        || button.classList.contains('skill-roll-btn')
        || button.classList.contains('skill-name-btn');

      try {
        let rollOptions = {};
        if (wantsModifierDialog) {
          const skill = this.actor.system.skills?.[skillKey];
          const modResult = await showRollModifiersDialog({
            title: `${skill?.label ?? skillKey} Check`,
            rollType: 'skill'
          });

          if (modResult === null) return;

          rollOptions = {
            customModifier: Number(modResult.customModifier || 0),
            useForcePoint: modResult.useForcePoint === true
          };
        }

        await this._runCanonicalSkillCheck(skillKey, rollOptions);
      } catch (err) {
        ui?.notifications?.error?.(`Skill roll failed: ${err.message}`);
      }
    }, { signal, capture: false });

    // PHASE 6 Part 3: Combat Attack Button (with modifier dialog)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest(".attack-btn");
      if (!button) return;

      ev.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      try {
        const weapon = this.actor.items.get(itemId);
        if (!weapon) return;

        const modResult = await showRollModifiersDialog({
          title: `${weapon.name} Attack`,
          rollType: 'attack',
          actor: this.actor,
          weapon
        });

        if (modResult === null) return; // Cancelled

        await this._runCanonicalAttack(weapon, {
          customModifier: modResult.customModifier || 0,
          cover: modResult.cover || 'none',
          concealment: modResult.concealment || 'none',
          useForcePoint: modResult.useForcePoint || false
        });
      } catch (err) {
        // console.error("Attack roll failed:", err);
        ui?.notifications?.error?.(`Attack roll failed: ${err.message}`);
      }
    }, { signal, capture: false });

    // PHASE 6 Part 3: Combat Damage Button (with modifier dialog)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest(".damage-btn");
      if (!button) return;

      ev.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      try {
        const weapon = this.actor.items.get(itemId);
        if (!weapon) return;

        const modResult = await showRollModifiersDialog({
          title: `${weapon.name} Damage`,
          rollType: 'damage',
          actor: this.actor,
          weapon
        });

        if (modResult === null) return; // Cancelled

        await SWSERoll.rollDamage(this.actor, weapon, {
          customModifier: modResult.customModifier || 0,
          useForcePoint: modResult.useForcePoint || false
        });
      } catch (err) {
        // console.error("Damage roll failed:", err);
        ui?.notifications?.error?.(`Damage roll failed: ${err.message}`);
      }
    }, { signal, capture: false });

    // Force Card Flip
    html.querySelectorAll(".force-card").forEach(card => {
      card.addEventListener("click", ev => {
        card.classList.toggle("flipped");
      }, { signal });
    });

    // Flip Back
    html.querySelectorAll(".flip-back").forEach(btn => {
      btn.addEventListener("click", ev => {
        ev.stopPropagation();
        const card = ev.currentTarget.closest(".force-card");
        if (card) card.classList.remove("flipped");
      }, { signal });
    });

    // ========== HEADER COMMAND BUTTONS (Delegated) ==========
    // These use delegated listeners to survive re-renders

    // Mentor Button (delegated)
    html.addEventListener("click", ev => {
      const button = ev.target.closest('[data-action="open-mentor"]');
      if (!button) return;
      ev.preventDefault();
      this._openMentorConversation();
    }, { signal, capture: false });

    // Progression buttons (Chargen/LevelUp) — Route through unified entry point (delegated)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action="cmd-chargen"], [data-action="cmd-levelup"]');
      if (!button) return;
      ev.preventDefault();
      try {
        await launchProgression(this.actor);
      } catch (err) {
        // console.error('[SHEET] ✗ launchProgression failed:', err);
        swseLogger.error('[CharacterSheet] Progression launch failed:', err);
      }
    }, { signal, capture: false });

    // Abilities panel: jump directly to the progression attribute step
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action="roll-attributes"]');
      if (!button) return;
      ev.preventDefault();
      try {
        await launchProgression(this.actor, { currentStep: 'attribute' });
      } catch (err) {
        // console.error('[SHEET] â roll-attributes failed:', err);
        swseLogger.error('[CharacterSheet] roll-attributes failed:', err);
      }
    }, { signal, capture: false });

    // Store button (delegated)
    html.addEventListener("click", ev => {
      const button = ev.target.closest('[data-action="cmd-store"]');
      if (!button) return;
      ev.preventDefault();
      const store = new SWSEStore(this.actor);
      store.render(true);
    }, { signal, capture: false });

    // Character identity selection buttons (Class, Species, Background, Homeworld, Profession)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action^="cmd-select-"]');
      if (!button) return;
      ev.preventDefault();

      const action = button.dataset.action;
      const stepMap = {
        'cmd-select-class': 'class',
        'cmd-select-species': 'species',
        'cmd-select-background': 'background',
        'cmd-select-homeworld': 'background',    // Homeworld is part of background selection
        'cmd-select-profession': 'background'    // Profession is part of background selection
      };

      const targetStep = stepMap[action];
      if (!targetStep) return;

      try {
        await launchProgression(this.actor, { currentStep: targetStep });
      } catch (err) {
        // console.error(`[SHEET] ✗ ${action} failed:`, err);
        swseLogger.error(`[CharacterSheet] ${action} failed:`, err);
      }
    }, { signal, capture: false });

    // Build Follower button (delegated) — Phase 3.5 follower runtime integration
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action="build-follower"]');
      if (!button) return;
      ev.preventDefault();
      try {
        const choice = await DialogV2.wait({
          window: { title: 'Add Relationship Actor' },
          content: `
            <div class="swse-generic-dialog">
              <p>Choose what to add to Relationships & Connections.</p>
            </div>
          `,
          buttons: [
            { action: 'follower', label: 'Follower', default: true },
            { action: 'beast', label: 'Beast' },
            { action: 'mount', label: 'Mount' },
            { action: 'droid', label: 'Droid' },
            { action: 'vehicle', label: 'Vehicle' },
            { action: 'cancel', label: 'Cancel' }
          ]
        }).catch(() => 'cancel');

        if (choice === 'cancel' || !choice) return;
        if (choice === 'follower') {
          await launchFollowerProgression(this.actor);
          return;
        }

        const typeMap = { beast: 'npc', mount: 'npc', droid: 'droid', vehicle: 'vehicle' };
        const actorType = typeMap[choice] || 'npc';
        const [created] = await Actor.createDocuments([{ name: `New ${choice[0].toUpperCase()}${choice.slice(1)}`, type: actorType }]);
        if (created?.sheet) created.sheet.render(true);
      } catch (err) {
        swseLogger.error('[CharacterSheet] Relationship actor creation failed:', err);
      }
    }, { signal, capture: false });

    html.querySelectorAll('[data-action="revalidate-build"]').forEach(button => {
      button.addEventListener("click", async ev => {
        ev.preventDefault();
        await this._revalidateBuild();
      }, { signal });
    });

    // Inventory Panel Handlers
    this._activateInventoryUI(html, { signal });

    // SWSE Combat UI Wiring
    this._activateCombatUI(html, { signal });

    // Skills Panel Handlers
    this._activateSkillsUI(html, { signal });

    // Force Suite Handlers
    this._activateForceUI(html, { signal });

    // Feats/Talents Handlers
    this._activateAbilitiesUI(html, { signal });

    // Misc Handlers (languages, rest, DSP)
    this._activateMiscUI(html, { signal });

    // Modal Dialog Handlers (Feat/Talent Selection)
    this._activateModalUI(html, { signal });

    // Phase 4: Mobile Interaction Enhancements
    this._activateMobileActions(html, { signal });

    // ═════════════════════════════════════════════════════════════════════════════════
    // DROP HANDLING — V2 CANONICAL PATH
    // ═════════════════════════════════════════════════════════════════════════════════
    // Bind dragover to allow drop events to fire (default browser behavior prevents drops)
    html.addEventListener("dragover", (e) => {
      e.preventDefault();
    }, { signal });

    // Bind drop event to authoritative _onDrop handler
    // This routes drops through DropResolutionEngine for unified item/actor handling
    html.addEventListener("drop", (e) => {
      this._onDrop(e);
    }, { signal });
  }

  /* ============================================================
     UI PREVIEW MATH (NON-AUTHORITATIVE)
  ============================================================ */

  _previewAbilityRow(row) {
    if (!row) return;

    const base = Number(row.querySelector('[data-field="base"]')?.value || 0);
    const racial = Number(row.querySelector('[data-field="racial"]')?.value || 0);
    const temp = Number(row.querySelector('[data-field="temp"]')?.value || 0);

    const total = base + racial + temp;
    const mod = Math.floor((total - 10) / 2);

    const totalEl = row.querySelector(".math-result");
    const modEl = row.querySelector(".math-mod");

    if (totalEl) {
      totalEl.textContent = total;
      totalEl.classList.remove("result-positive","result-zero","result-negative");

      if (total > 0) totalEl.classList.add("result-positive");
      else if (total === 0) totalEl.classList.add("result-zero");
      else totalEl.classList.add("result-negative");
    }

    if (modEl) {
      modEl.textContent = mod >= 0 ? "+" + mod : mod;
    }
  }

  /* ============================================================
     FORCE ANIMATION HELPERS (UI ONLY)
  ============================================================ */

  _handleForceDiscardAnimation(itemId) {
    const root = this.element;
    if (!root) return;
    const card = root.querySelector(`.force-card[data-item-id="${itemId}"]`);
    if (!card) return;
    card.classList.add("discarding");
    setTimeout(() => card.classList.remove("discarding"), 500);
  }

  _handleForceRecoveryAnimation(itemIds = [], full = false) {
    const root = this.element;
    if (!root) return;
    const panel = root.querySelector(".force-panel");
    if (!panel) return;

    if (full) {
      panel.classList.add("force-recovery-burst");
      setTimeout(() => panel.classList.remove("force-recovery-burst"), 800);
    }

    itemIds.forEach(id => {
      const card = root.querySelector(`.force-card[data-item-id="${id}"]`);
      if (!card) return;

      card.classList.add("recovering");

      setTimeout(() => {
        card.classList.remove("recovering");
        card.classList.add("recovered");
        setTimeout(() => card.classList.remove("recovered"), 400);
      }, 500);
    });
  }

  /* ============================================================
     INVENTORY UI WIRING
  ============================================================ */

  _activateInventoryUI(html, { signal } = {}) {
    // Equip / Unequip toggle
    html.querySelectorAll(".item-equip").forEach(button => {
      button.addEventListener("click", async (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) await InventoryEngine.toggleEquip(this.actor, itemId);
      }, { signal });
    });

    // Edit item
    html.querySelectorAll(".item-edit").forEach(button => {
      button.addEventListener("click", (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) this.actor.items.get(itemId)?.sheet.render(true);
      }, { signal });
    });

    // Add/increment quantity
    html.querySelectorAll(".item-add").forEach(button => {
      button.addEventListener("click", async (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) await InventoryEngine.incrementQuantity(this.actor, itemId);
      }, { signal });
    });

    // Sell item
    html.querySelectorAll(".item-sell").forEach(button => {
      button.addEventListener("click", async (event) => {
        const row = event.currentTarget.closest(".inventory-row");
        const itemId = row?.dataset.itemId;
        if (itemId) {
          const item = this.actor.items.get(itemId);
          if (item) {
            await initiateItemSale(item, this.actor);
          }
        }
      }, { signal });
    });

    // Delete/Remove item
    html.querySelectorAll('[data-action="delete"], [data-action="equip"], [data-action="edit"], [data-action="configure"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const action = button.dataset.action;
        const itemId = button.dataset.itemId || event.currentTarget.closest("[data-item-id]")?.dataset.itemId;

        if (!itemId) return;
        const item = this.actor.items.get(itemId);
        if (!item) return;

        switch (action) {
          case "delete":
            await InventoryEngine.removeItem(this.actor, itemId);
            break;
          case "equip":
            await InventoryEngine.toggleEquip(this.actor, itemId);
            break;
          case "edit":
            item.sheet.render(true);
            break;
          case "configure":
            if (item.type === "weapon" && (item.system?.subtype === "lightsaber" || item.system?.weaponCategory === "lightsaber")) {
              openLightsaberInterface(this.actor, item);
            } else if (item.type === "weapon") {
              item.sheet.render(true);
            }
            break;
        }
      }, { signal });
    });

    // ═══════════════════════════════════════════════════════════════════════════════
    // GEAR TAB HANDLERS (V2 sheet)
    // ═══════════════════════════════════════════════════════════════════════════════

    // Open item sheet
    html.querySelectorAll('[data-action="open-item"]').forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (itemId) {
          const item = this.actor.items.get(itemId);
          if (item) item.sheet.render(true);
        }
      }, { signal });
    });

    // Equip item
    html.querySelectorAll('[data-action="equip-item"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (itemId) await InventoryEngine.toggleEquip(this.actor, itemId);
      }, { signal });
    });

    // Edit item
    html.querySelectorAll('[data-action="edit-item"]').forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (itemId) {
          const item = this.actor.items.get(itemId);
          if (item) item.sheet.render(true);
        }
      }, { signal });
    });

    // Delete item
    html.querySelectorAll('[data-action="delete-item"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (itemId) await InventoryEngine.removeItem(this.actor, itemId);
      }, { signal });
    });
  }

  /* ============================================================
     COMBAT UI WIRING
  ============================================================ */

  _activateCombatUI(html, { signal } = {}) {
    // ═════════════════════════════════════════════════════════════════
    // PHASE 9: Combat Actions Panel (In-tab browser)
    // ═════════════════════════════════════════════════════════════════

    // Filter combat actions by search
    const combatSearchInput = html.querySelector('.combat-actions-search');
    if (combatSearchInput) {
      combatSearchInput.addEventListener('input', (event) => {
        const filterText = event.target.value.toLowerCase();
        const actionRows = html.querySelectorAll('.combat-action-row');

        actionRows.forEach(row => {
          const actionName = row.querySelector('.action-name')?.textContent.toLowerCase() ?? '';
          const actionNotes = row.querySelector('.action-notes')?.textContent.toLowerCase() ?? '';
          const matches = actionName.includes(filterText) || actionNotes.includes(filterText);
          row.style.display = matches ? '' : 'none';
        });
      }, { signal });
    }

    // Sort combat actions
    const combatSortSelect = html.querySelector('.combat-actions-sort');
    if (combatSortSelect) {
      combatSortSelect.addEventListener('change', (event) => {
        const sortMode = event.target.value;
        const actionContent = html.querySelector('.combat-actions-content');
        if (!actionContent) return;

        if (sortMode === 'name') {
          // Sort by name within each group
          const groups = actionContent.querySelectorAll('.combat-action-group');
          groups.forEach(group => {
            const rows = Array.from(group.querySelectorAll('.combat-action-row'));
            rows.sort((a, b) => {
              const nameA = a.querySelector('.action-name')?.textContent ?? '';
              const nameB = b.querySelector('.action-name')?.textContent ?? '';
              return nameA.localeCompare(nameB);
            });

            const list = group.querySelector('.combat-action-list');
            if (list) {
              rows.forEach(row => list.appendChild(row));
            }
          });
        }
        // 'economy' is default, groups are already organized by economy
      }, { signal });
    }

    // New Round / Manual Reset Button
    html.querySelectorAll('[data-action="new-round"]').forEach(button => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();

        if (!game.combat) {
          ui?.notifications?.warn?.('No active combat');
          return;
        }

        const combatId = game.combat.id;
        const { ActionEconomyPersistence } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js');

        try {
          // Reset action economy for this actor
          await ActionEconomyPersistence.resetTurnState(this.actor, combatId);
          ui?.notifications?.info?.(`${this.actor.name} actions reset for new round`);

          // Trigger a re-render to update the action economy indicator
          this.render(false);
        } catch (err) {
          // console.error('Failed to reset turn state:', err);
          ui?.notifications?.error?.('Failed to reset actions');
        }
      }, { signal });
    });

    // ═════════════════════════════════════════════════════════════════
    // EXISTING COMBAT UI HANDLERS
    // ═════════════════════════════════════════════════════════════════

    // Action click (cards and table rows)
    html.querySelectorAll(".swse-combat-action-card, .action-row").forEach(element => {
      element.addEventListener("click", async (event) => {
        if (event.target.classList.contains("hide-action")) return;
        const key = event.currentTarget.dataset.actionKey;
        if (!key) return;

        const combatActions = this.actor.getFlag(game.system.id, "combatActions") ?? {};
        const data = combatActions[key] ?? {};

        await this._runCanonicalCombatAction(key, data, {
          source: "combat-action-card"
        });
      }, { signal });
    });

    // Hide individual action
    html.querySelectorAll(".hide-action").forEach(button => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const el = event.currentTarget.closest(".swse-combat-action-card, .action-row");
        if (el) el.classList.add("collapsed");
      }, { signal });
    });

    // Collapse group (table mode)
    html.querySelectorAll(".collapse-group").forEach(button => {
      button.addEventListener("click", (event) => {
        const groupKey = event.currentTarget.dataset.group;
        if (groupKey) {
          const table = html.querySelector(`table[data-group='${groupKey}']`);
          if (table) table.classList.toggle("collapsed");
        }
      }, { signal });
    });

    // Use action button
    html.querySelectorAll('[data-action="swse-v2-use-action"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const actionId = button.dataset.actionId;
        if (!actionId) return;

        const combatActions = this.actor.getFlag(game.system.id, "combatActions") ?? {};
        const data = combatActions[actionId] ?? {};

        await this._runCanonicalCombatAction(actionId, data, {
          source: "combat-action-button"
        });
      }, { signal });
    });

    // Weapon attack roll button (Combat Attacks simplified panel)
    html.querySelectorAll('[data-action="roll-attack"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const weaponId = button.dataset.weaponId;
        if (!weaponId) return;

        const weapon = this.actor.items.get(weaponId);
        if (!weapon || weapon.type !== "weapon") return;

        await this._runCanonicalAttack(weapon, {
          source: "combat-tab"
        });
      }, { signal });
    });

    // Toggle attack breakdown details
    html.querySelectorAll('[data-action="toggle-attack-details"]').forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const attackBlock = button.closest('.swse-attack-block');
        if (!attackBlock) return;

        const breakdown = attackBlock.querySelector('.attack-breakdown');
        if (!breakdown) return;

        const isHidden = breakdown.style.display === 'none';
        breakdown.style.display = isHidden ? 'flex' : 'none';
        button.classList.toggle('active', isHidden);
        button.setAttribute('aria-expanded', isHidden);
      }, { signal });
    });
  }

  /* ============================================================
     SKILLS UI WIRING
  ============================================================ */

  _activateSkillsUI(html, { signal } = {}) {
    const skillsList = html.querySelector('.skills-list');
    const getRows = () => Array.from(html.querySelectorAll('.skill-row-container'));
    const filterControls = Array.from(html.querySelectorAll('[data-action="filter-skills"]'));
    const sortControls = Array.from(html.querySelectorAll('[data-action="sort-skills"]'));
    const escapeSkillKey = (value) => {
      if (globalThis.CSS?.escape) return globalThis.CSS.escape(String(value));
      return String(value);
    };
    const findExtraUsesSection = (skillKey) => {
      if (!skillKey) return null;
      return html.querySelector(`.skill-extra-uses[data-skill="${escapeSkillKey(skillKey)}"]`);
    };

    const applyFiltersAndSort = () => {
      const activeFilter = filterControls[0]?.value || 'all';
      const activeSort = sortControls[0]?.value || 'name';
      const rowPairs = getRows().map(row => ({
        row,
        extraUsesSection: findExtraUsesSection(row.dataset.skill)
      }));
      const visiblePairs = [];

      for (const pair of rowPairs) {
        const { row, extraUsesSection } = pair;
        const trained = row.dataset.trained === 'true';
        const favorite = row.dataset.favorite === 'true';
        const focused = row.dataset.focused === 'true';
        let matches = true;
        if (activeFilter === 'trained') matches = trained;
        else if (activeFilter === 'favorited') matches = favorite;
        else if (activeFilter === 'focused') matches = focused;

        row.style.display = matches ? '' : 'none';
        if (extraUsesSection) {
          extraUsesSection.style.display = matches ? '' : 'none';
        }
        if (matches) visiblePairs.push(pair);
      }

      if (!skillsList) return;
      visiblePairs.sort((a, b) => {
        const rowA = a.row;
        const rowB = b.row;
        switch (activeSort) {
          case 'ability':
            return (rowA.dataset.ability || '').localeCompare(rowB.dataset.ability || '') || (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
          case 'total-desc':
            return Number(rowB.dataset.total || 0) - Number(rowA.dataset.total || 0) || (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
          case 'total-asc':
            return Number(rowA.dataset.total || 0) - Number(rowB.dataset.total || 0) || (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
          case 'name':
          default:
            return (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
        }
      });

      for (const { row, extraUsesSection } of visiblePairs) {
        skillsList.appendChild(row);
        if (extraUsesSection) {
          skillsList.appendChild(extraUsesSection);
        }
      }
    };

    filterControls.forEach(select => {
      select.addEventListener('change', applyFiltersAndSort, { signal });
    });

    sortControls.forEach(select => {
      select.addEventListener('change', applyFiltersAndSort, { signal });
    });

    html.querySelectorAll('[data-action="reset-skills-tools"]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        filterControls.forEach(select => { select.value = 'all'; });
        sortControls.forEach(select => { select.value = 'name'; });
        applyFiltersAndSort();
      }, { signal });
    });


    html.querySelectorAll('[data-action="toggle-skill-expand"]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const skillKey = button.dataset.skill;
        if (!skillKey) return;

        const extraUsesSection = findExtraUsesSection(skillKey);
        if (!extraUsesSection?.classList.contains('skill-extra-uses')) {
          swseLogger.warn('[CharacterSheet] Extra skill uses section not found for toggle', {
            actorId: this.actor?.id,
            actorName: this.actor?.name,
            skillKey
          });
          return;
        }

        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!isExpanded));
        const countBadge = button.querySelector('.expand-count');
        if (!countBadge) button.textContent = isExpanded ? '▶' : '▼';

        if (isExpanded) {
          extraUsesSection.classList.remove('skill-extra-uses--expanded');
          extraUsesSection.classList.add('skill-extra-uses--collapsed');
          const filterBar = extraUsesSection.querySelector('.extra-uses-filter-bar');
          if (filterBar) filterBar.classList.add('skill-extra-uses-hidden');
        } else {
          extraUsesSection.classList.remove('skill-extra-uses--collapsed');
          extraUsesSection.classList.add('skill-extra-uses--expanded');
          const filterBar = extraUsesSection.querySelector('.extra-uses-filter-bar');
          if (filterBar) filterBar.classList.remove('skill-extra-uses-hidden');
        }
      }, { signal });
    });

    html.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const filterType = btn.dataset.filter;
        const filterBar = btn.closest('.extra-uses-filter-bar');
        if (!filterBar) return;

        filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
        btn.classList.add('filter-btn--active');

        const extrasSection = filterBar.closest('.skill-extra-uses');
        const useRows = extrasSection?.querySelectorAll('.extra-use-row') ?? [];
        useRows.forEach(row => {
          if (filterType === 'all') row.style.display = '';
          else if (filterType === 'available') row.style.display = row.classList.contains('use-blocked') ? 'none' : '';
          else if (filterType === 'combat') row.style.display = (row.dataset.category === 'Combat' || row.dataset.category === 'Defensive') ? '' : 'none';
        });
      }, { signal });
    });

    applyFiltersAndSort();
  }

  /* ============================================================
     FORCE SUITE UI WIRING
  ============================================================ */

  _activateForceUI(html, { signal } = {}) {
    // Force sort dropdown
    html.querySelectorAll('[data-action="force-sort"]').forEach(select => {
      select.addEventListener("change", (event) => {
        const sortBy = event.target.value;
        const cardGrid = html.querySelector(".force-card-grid");
        if (!cardGrid) return;

        const cards = Array.from(cardGrid.querySelectorAll(".force-card:not(.discarded)"));
        cards.sort((a, b) => {
          const aName = a.querySelector(".force-name")?.textContent || "";
          const aTagString = a.dataset.tags || "";
          const bName = b.querySelector(".force-name")?.textContent || "";
          const bTagString = b.dataset.tags || "";

          switch (sortBy) {
            case "tag":
              return aTagString.localeCompare(bTagString);
            case "name":
            default:
              return aName.localeCompare(bName);
          }
        });

        cards.forEach(card => cardGrid.appendChild(card));
      }, { signal });
    });

    // Force tag filter buttons
    html.querySelectorAll('[data-action="force-tag-filter"]').forEach(button => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const tag = button.dataset.tag;
        if (!tag) return;

        // Toggle button active state
        button.classList.toggle("active");

        // Filter cards
        const activeFilters = Array.from(html.querySelectorAll('[data-action="force-tag-filter"].active'))
          .map(b => b.dataset.tag);

        const cards = html.querySelectorAll(".force-card:not(.discarded)");
        cards.forEach(card => {
          if (activeFilters.length === 0) {
            card.style.display = "";
          } else {
            const cardTags = (card.dataset.tags || "").split(" ");
            const matches = activeFilters.some(f => cardTags.includes(f));
            card.style.display = matches ? "" : "none";
          }
        });
      }, { signal });
    });

    // Activate force button
    html.querySelectorAll('[data-action="activate-force"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const power = this.actor.items.get(itemId);
        if (!power || power.type !== "force-power") return;

        // Determine if this is a recovery or activation
        const isRecovery = power.system?.discarded ?? false;

        try {
          const result = await ForceExecutor.activateForce(this.actor, itemId, isRecovery);
          if (result.success) {
            ui?.notifications?.info?.(`${power.name} ${isRecovery ? "recovered" : "used"}`);
          }
        } catch (err) {
          // console.error("Force activation failed:", err);
          ui?.notifications?.error?.(`Force activation failed: ${err.message}`);
        }
      }, { signal });
    });

    // Item action bar: Customize item
    html.querySelectorAll('[data-action="customize-item"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (!item) return;

        // Route to correct customization modal based on item type / subtype
        try {
          if (item.type === "lightsaber" || (item.type === "weapon" && (item.system?.subtype === "lightsaber" || item.system?.weaponCategory === "lightsaber"))) {
            openLightsaberInterface(this.actor, item);
          } else {
            switch (item.type) {
              case "blaster":
                new BlasterCustomizationApp(this.actor, item).render(true);
                break;
              case "armor":
                new ArmorModificationApp(this.actor, item).render(true);
                break;
              case "weapon":
                new MeleeWeaponModificationApp(this.actor, item).render(true);
                break;
              case "gear":
              case "equipment":
                new GearModificationApp(this.actor, item).render(true);
                break;
              default:
                ui?.notifications?.warn?.(`No customization available for ${item.type}`);
            }
          }
        } catch (err) {
          // console.error("Customization modal failed:", err);
          ui?.notifications?.error?.("Failed to open customization modal");
        }
      }, { signal });
    });

    // Item action bar: Open overflow menu
    html.querySelectorAll('[data-action="open-item-menu"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (!item) return;

        new Dialog({
          title: item.name,
          content: `<p>Select action for ${item.name}:</p>`,
          buttons: {
            edit: {
              label: "Edit",
              callback: () => item.sheet.render(true)
            },
            delete: {
              label: "Delete",
              callback: () => item.delete()
            },
            close: {
              label: "Close"
            }
          }
        }).render(true);
      }, { signal });
    });

    // NOTE: Quick attack/damage rolls via [data-action="roll-attack"] and [data-action="roll-damage"]
    // are now REMOVED (dead code). Use the working class-based handlers instead:
    // - .attack-btn (uses showRollModifiersDialog + SWSERoll.rollAttack)
    // - .damage-btn (uses showRollModifiersDialog + SWSERoll.rollDamage)
    // Both handlers create chat messages correctly via createChatMessage() or SWSEChat.postRoll()
  }

  /* ============================================================
     FEATS/TALENTS/ABILITIES UI WIRING
  ============================================================ */

  _activateAbilitiesUI(html, { signal } = {}) {
    // Open ability/feat/talent sheet
    html.querySelectorAll('[data-action="open-ability"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (item) {
          item.sheet.render(true);
        }
      }, { signal });
    });

    // === INVENTORY: ADD ITEM BUTTONS (Gear tab) ===
    html.addEventListener("click", async (event) => {
      const button = event.target.closest('[data-action="add-item"]');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      const itemType = button.dataset.itemType;
      if (!itemType) return;

      this._pendingAddItemTypes ??= new Set();
      if (this._pendingAddItemTypes.has(itemType) || button.dataset.swseBusy === 'true') {
        return;
      }

      button.dataset.swseBusy = 'true';
      button.disabled = true;
      this._pendingAddItemTypes.add(itemType);

      try {
        const createData = itemType === "shield"
          ? {
              name: "New Shield",
              type: "armor",
              system: {
                armorType: "shield",
                shieldRating: 0,
                currentSR: 0,
                charges: { current: 0, max: 0 },
                activated: false
              }
            }
          : {
              name: `New ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
              type: itemType,
              system: {}
            };

        await ActorEngine.createEmbeddedDocuments(this.actor, "Item", [createData]);
        ui.notifications.info(`Created new ${itemType}`);
      } catch (err) {
        ui.notifications.error(`Failed to create item: ${err.message}`);
      } finally {
        this._pendingAddItemTypes.delete(itemType);
        delete button.dataset.swseBusy;
        button.disabled = false;
      }
    }, { signal, capture: false });

    // Add feat button
    html.querySelectorAll('[data-action="add-feat"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        this._showItemSelectionModal('feat');
      }, { signal });
    });

    // Delete feat button
    html.querySelectorAll('[data-action="delete-feat"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        await InventoryEngine.removeItem(this.actor, itemId);
      }, { signal });
    });

    // Add talent button
    html.querySelectorAll('[data-action="add-talent"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        this._showItemSelectionModal('talent');
      }, { signal });
    });
  }

  /* ============================================================
     MODAL DIALOG FOR ITEM SELECTION (FEATS/TALENTS)
  ============================================================ */

  _showItemSelectionModal(itemType) {
    const root = this.element;
    if (!root) return;
    const modal = root.querySelector('#item-selection-modal');
    const titleEl = root.querySelector('#modal-title');
    const messageEl = root.querySelector('#modal-message');
    if (!modal || !titleEl || !messageEl) return;

    const capitalType = itemType.charAt(0).toUpperCase() + itemType.slice(1);
    titleEl.textContent = `Add ${capitalType}`;
    messageEl.textContent = `Would you like to choose a ${itemType} from the compendium?`;

    this._currentItemType = itemType;
    modal.style.display = 'flex';

    // Wire overlay click using render-cycle signal so it tears down on rerender.
    const overlay = modal.querySelector('.modal-overlay');
    if (overlay && !overlay._clickHandlerAttached) {
      overlay.addEventListener('click', () => this._hideItemSelectionModal(), {
        signal: this._renderAbort?.signal
      });
      overlay._clickHandlerAttached = true;
    }
  }

  _hideItemSelectionModal() {
    const root = this.element;
    if (!root) return;
    const modal = root.querySelector('#item-selection-modal');
    if (!modal) return;
    modal.style.display = 'none';
    this._currentItemType = null;
  }

  async _handleModalYes() {
    if (!this._currentItemType) return;

    this._hideItemSelectionModal();

    const registry = this._currentItemType === 'feat' ? FeatRegistry : TalentRegistry;
    await registry.initialize?.();
    const sample = registry.getAll?.()?.[0];
    const packName = sample?.pack || (this._currentItemType === 'feat' ? 'foundryvtt-swse.feats' : 'foundryvtt-swse.talents');
    const pack = game.packs.get(packName);

    if (!pack || !sample) {
      ui.notifications.error(`${this._currentItemType} registry/compendium not available!`);
      return;
    }

    // Open the compendium in a sidebar/window view
    // In Foundry, you can open a compendium and let the user drag items
    // This is the standard approach for item selection
    pack.render(true);

    ui.notifications.info(
      `Drag a ${this._currentItemType} from the compendium panel onto your sheet or click to add it.`
    );
  }

  async _handleModalNo() {
    if (!this._currentItemType) return;

    this._hideItemSelectionModal();

    // Create a blank item
    const itemData = {
      type: this._currentItemType,
      name: `New ${this._currentItemType.charAt(0).toUpperCase() + this._currentItemType.slice(1)}`,
      system: {}
    };

    try {
      const [doc] = await ActorEngine.createEmbeddedDocuments(this.actor, "Item", [itemData]);
      if (doc) {
        doc.sheet.render(true);
      }
    } catch (err) {
      // console.error(`Failed to create ${this._currentItemType}:`, err);
      ui?.notifications?.error?.(`Failed to create ${this._currentItemType}: ${err.message}`);
    }
  }

  /* ============================================================
     MODAL UI WIRING
  ============================================================ */

  _activateModalUI(html, { signal } = {}) {
    // Modal Yes button
    html.querySelectorAll('[data-action="modal-yes"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await this._handleModalYes();
      }, { signal });
    });

    // Modal No button
    html.querySelectorAll('[data-action="modal-no"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await this._handleModalNo();
      }, { signal });
    });
  }

  /* ============================================================
     MISCELLANEOUS UI WIRING (LANGUAGES, REST, DSP, ETC)
  ============================================================ */

  _activateMiscUI(html, { signal } = {}) {
    // Add language button
    html.querySelectorAll('[data-action="add-language"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        // Open a dialog for language selection
        const languages = this.actor.system?.languages ?? [];
        const newLang = prompt("Enter language name:");
        if (newLang) {
          const plan = {
            update: {
              "system.languages": [...languages, newLang]
            }
          };
          try {
            await ActorEngine.apply(this.actor, plan);
          } catch (err) {
            // console.error("Failed to add language:", err);
            ui?.notifications?.error?.(`Failed to add language: ${err.message}`);
          }
        }
      }, { signal });
    });

    // Remove language button
    html.querySelectorAll('[data-action="remove-language"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const langName = button.dataset.language;
        if (!langName) return;

        const languages = (this.actor.system?.languages ?? []).filter(l => l !== langName);
        const plan = {
          update: {
            "system.languages": languages
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
        } catch (err) {
          // console.error("Failed to remove language:", err);
          ui?.notifications?.error?.(`Failed to remove language: ${err.message}`);
        }
      }, { signal });
    });

    // Rest / Second Wind button
    html.querySelectorAll('[data-action="rest-second-wind"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
          await ActorEngine.resetSecondWind(this.actor);
          ui?.notifications?.info?.("Second Wind restored!");
        } catch (err) {
          // console.error("Rest failed:", err);
          ui?.notifications?.error?.(`Rest failed: ${err.message}`);
        }
      }, { signal });
    });

    // Use Second Wind button
    html.querySelectorAll('[data-action="use-second-wind"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
          const result = await ActorEngine.applySecondWind(this.actor);
          if (result?.success === false) {
            ui?.notifications?.warn?.(result.reason || "No Second Wind uses remaining");
            return;
          }
          ui?.notifications?.info?.(`Regained ${result?.healed ?? 0} HP!`);
        } catch (err) {
          // console.error("Second Wind use failed:", err);
          ui?.notifications?.error?.(`Second Wind use failed: ${err.message}`);
        }
      }, { signal });
    });

    // Gain Force Point button
    html.querySelectorAll('[data-action="gain-force-point"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const current = this.actor.system?.forcePoints?.value ?? 0;
        const max = this.actor.system?.forcePoints?.max ?? 0;
        const newValue = Math.min(current + 1, max);

        const plan = {
          update: {
            "system.forcePoints.value": newValue
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
          ui?.notifications?.info?.("Force Point restored!");
        } catch (err) {
          // console.error("Force Point restore failed:", err);
          ui?.notifications?.error?.(`Force Point restore failed: ${err.message}`);
        }
      }, { signal });
    });

    // Spend Force Point button
    html.querySelectorAll('[data-action="spend-force-point"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const current = this.actor.system?.forcePoints?.value ?? 0;
        const newValue = Math.max(0, current - 1);

        const plan = {
          update: {
            "system.forcePoints.value": newValue
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
          ui?.notifications?.info?.("Force Point spent!");
        } catch (err) {
          // console.error("Force Point spend failed:", err);
          ui?.notifications?.error?.(`Force Point spend failed: ${err.message}`);
        }
      }, { signal });
    });

    // Set Condition Step button (delegated)
    html.addEventListener("click", async (event) => {
      const button = event.target.closest('[data-action="set-condition-step"]');
      if (!button) return;

      event.preventDefault();
      const step = parseInt(button.dataset.step, 10);
      if (isNaN(step) || step < 0 || step > 5) return;

      const plan = {
        update: {
          "system.conditionTrack.current": step
        }
      };

      const mutationRecord = recordHydrationMutation(this, {
        source: "character-sheet-condition-button",
        field: "system.conditionTrack.current",
        step,
        update: plan.update,
        before: captureHydrationSnapshot(this.actor)
      });

      try {
        emitHydrationWarning("CONDITION_BUTTON_MUTATION_START", {
          actorId: this.actor?.id,
          actorName: this.actor?.name,
          mutation: mutationRecord
        });
        await ActorEngine.apply(this.actor, plan, {
          source: "character-sheet-condition-button",
          suppressAppRefresh: true
        });
        recordHydrationMutation(this, { ...mutationRecord, status: "success", after: captureHydrationSnapshot(this.actor) });
        ui?.notifications?.info?.("Condition updated!");
      } catch (err) {
        emitHydrationError("CONDITION_BUTTON_MUTATION_FAILED", {
          actorId: this.actor?.id,
          actorName: this.actor?.name,
          mutation: mutationRecord,
          error: err?.message,
          stack: err?.stack,
          snapshot: captureHydrationSnapshot(this.actor)
        });
        ui?.notifications?.error?.('Condition update failed: ' + err.message);
      }
    }, { signal, capture: false });

    // Set dark side score button
    html.querySelectorAll('[data-action="set-dark-side-score"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const currentDSP = DSPEngine.getValue(this.actor);
        const newValue = prompt(`Current Dark Side Points: ${currentDSP}\n\nEnter new value:`, String(currentDSP));

        if (newValue !== null) {
          const value = Math.max(0, Math.min(Number(newValue) || 0, DSPEngine.getMax(this.actor)));
          const plan = {
            update: {
              "system.darkSide.value": value
            }
          };

          try {
            await ActorEngine.apply(this.actor, plan);
          } catch (err) {
            // console.error("Failed to set DSP:", err);
            ui?.notifications?.error?.(`Failed to set DSP: ${err.message}`);
          }
        }
      }, { signal });
    });

    // Use extra skill button
    html.querySelectorAll('[data-action="execute-extra-skill-use"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const skillKey = button.dataset.skill;
        const useKey = button.dataset.useKey || button.dataset.key;
        const blocked = button.dataset.blocked === "true";
        const actionType = button.dataset.actionType || null;
        const sourceType = button.dataset.sourceType || null;
        const sourceLabel = button.dataset.sourceLabel || null;

        if (!skillKey) return;
        if (blocked) {
          ui?.notifications?.warn?.("This skill use is currently blocked.");
          return;
        }

        try {
          await this._runCanonicalExtraSkillUse(skillKey, useKey, {
            source: "skills-tab",
            actionType,
            sourceType,
            sourceLabel
          });
        } catch (err) {
          // console.error("Failed to use extra skill:", err);
          ui?.notifications?.error?.(`Failed to use extra skill: ${err.message}`);
        }
      }, { signal });
    });
  }
  /* ============================================================
     PHASE 4: MOBILE INTERACTION ENHANCEMENTS
     Right-click replacements + touch feedback
  ============================================================ */

  _activateMobileActions(html, { signal } = {}) {
    // Only activate on mobile mode (safely check if MobileMode exists and is enabled)
    if (!MobileMode || !MobileMode.enabled) return;

    // Add toggle listener to all .item-actions-toggle buttons
    html.addEventListener("click", (event) => {
      const toggleBtn = event.target.closest(".item-actions-toggle");
      if (!toggleBtn) return;

      event.preventDefault();
      event.stopPropagation();

      // Find the parent row/card
      const row = toggleBtn.closest("[data-item-id]") ||
                  toggleBtn.closest(".item-row") ||
                  toggleBtn.closest(".skill-row") ||
                  toggleBtn.closest(".ability-row") ||
                  toggleBtn.closest("[data-action-container]");

      if (!row) {
        console.warn("[Mobile] Could not find parent row for actions toggle", toggleBtn);
        return;
      }

      // Toggle the show-actions class
      row.classList.toggle("show-mobile-actions");
    }, { signal, capture: false });

    // Close actions menu when clicking outside (sheet-scoped)
    html.addEventListener("click", (event) => {
      // Only close if NOT clicking inside an actions menu or toggle button
      if (event.target.closest(".mobile-actions-menu")) return;
      if (event.target.closest(".item-actions-toggle")) return;

      // Close all open actions menus in this sheet
      html.querySelectorAll(".show-mobile-actions").forEach(row => {
        row.classList.remove("show-mobile-actions");
      });
    }, { signal, capture: false });

    // Global close handler (prevent stuck-open menus across page)
    // Use document listener as fallback for clicks outside html element
    const globalClose = (event) => {
      // Don't close if clicking on action menu or toggle
      if (event.target.closest(".mobile-actions-menu")) return;
      if (event.target.closest(".item-actions-toggle")) return;

      // Close any open mobile actions in the sheet
      html.querySelectorAll(".show-mobile-actions").forEach(row => {
        row.classList.remove("show-mobile-actions");
      });
    };

    // Add global listener with signal-based cleanup (automatic teardown on rerender)
    document.addEventListener("click", globalClose, { capture: false, signal });
  }

  /* ============================================================
     MENTOR CONVERSATION
  ============================================================ */

  _openMentorConversation() {
    const actor = this.actor;
    new MentorChatDialog(actor).render(true);
  }

  /* ============================================================
     PHASE 7: SKILL FALLBACK HELPERS
  ============================================================ */

  /**
   * PHASE 7: Build skill total fallback (transitional rescue only)
   *
   * This should NEVER be the main path — DerivedCalculator is authoritative.
   * Only called if derived.skills[key].total is missing/invalid.
   * Logs warning when fallback is needed (indicates upstream failure).
   *
   * @param {number} abilityMod - Ability modifier from abilities
   * @param {number} halfLevel - Half character level
   * @param {number} miscMod - Misc modifiers from stored skill data
   * @param {Object} skillData - Stored skill data (trained, focused)
   * @returns {number} Fallback computed total
   */
  /**
   * PHASE 10: LEGACY RESCUE ONLY — DO NOT CALL FROM HAPPY PATH
   *
   * Skill total fallback (removed from _prepareContext in Phase 10)
   * Kept for potential emergency use with legacy/corrupted actors only.
   * If this is called, it indicates DerivedCalculator failed to compute.
   *
   * @deprecated Not called from happy path. Use only in explicit error recovery.
   */
  _buildSkillFallbackTotal(abilityMod, halfLevel, miscMod, skillData) {
    swseLogger.error(`[Phase 10] LEGACY FALLBACK: Skill total rebuild used — derived.skills[].total missing!`, {
      abilityMod,
      halfLevel,
      miscMod,
      trained: skillData.trained,
      focused: skillData.focused,
      warning: 'This indicates DerivedCalculator did not properly compute skill totals'
    });

    // PHASE 8: Emit contract observability warning
    if (CONFIG?.SWSE?.debug?.contractObservability) {
      warnSheetFallback(
        'Skills',
        'LEGACY FALLBACK: skill total rebuilt (should not happen in Phase 10+)',
        { abilityMod, halfLevel, miscMod, skillTrained: skillData.trained },
        this.actor.name
      );
    }

    const trainingBonus = skillData.trained ? 5 : 0;
    const focusBonus = skillData.focused ? 5 : 0;
    return abilityMod + halfLevel + miscMod + trainingBonus + focusBonus;
  }

  /**
   * PHASE 10: LEGACY RESCUE ONLY — DO NOT CALL FROM HAPPY PATH
   *
   * Build attacks from equipped weapons (removed from _prepareContext in Phase 10)
   * Kept only for emergency legacy/corrupted actor recovery.
   * Character-actor.js.mirrorAttacks() should be the authoritative source.
   *
   * If this is called, it indicates DerivedCalculator failed to populate derived.attacks.list.
   *
   * @deprecated Not called from happy path. Use only in explicit error recovery.
   * @param {Actor} actor - The character actor
   * @returns {Array} Array of basic attack objects from equipped weapons
   */
  _buildAttacksFallback(actor) {
    swseLogger.error(`[Phase 10] LEGACY FALLBACK: Attacks list rebuild used — derived.attacks.list missing!`, {
      actor: actor.name,
      equippedWeapons: actor.items?.filter(i => i.type === 'weapon' && i.system?.equipped)?.length ?? 0,
      warning: 'This indicates DerivedCalculator did not properly compute attacks'
    });

    // PHASE 8: Emit contract observability warning
    if (CONFIG?.SWSE?.debug?.contractObservability) {
      warnSheetFallback(
        'Attacks',
        'LEGACY FALLBACK: attack list rebuilt (should not happen in Phase 10+)',
        { reason: 'derived.attacks.list was empty or missing' },
        actor.name
      );
    }

    const equippedWeapons = (actor?.items ?? []).filter(item =>
      item.type === 'weapon' && item.system?.equipped === true
    );

    return equippedWeapons.map(weapon => ({
      id: `attack-${weapon.id}`,
      name: weapon.name,
      weaponId: weapon.id,
      weaponName: weapon.name,
      weaponType: weapon.system?.weaponCategory,
      attackBonus: weapon.system?.attackBonus ?? 0,
      attackTotal: (weapon.system?.attackBonus ?? 0) + (actor.system?.baseAttackBonus ?? 0),
      attackAttribute: weapon.system?.attackAttribute ?? 'str',
      damageFormula: weapon.system?.damage ?? '1d6',
      damageBonus: weapon.system?.damageBonus ?? '',
      critRange: weapon.system?.criticalRange ?? '20',
      critMult: weapon.system?.criticalMultiplier ?? 'x2',
      tags: [],
      weaponProperties: {},
      breakdown: {
        attack: [],
        damage: [],
        conditional: []
      }
    }));
  }

  /* ============================================================
     PHASE 10: SKILL USE HELPERS
  ============================================================ */

  /**
   * Map action economy time value to CSS class for visual styling
   * @param {string|null} timeValue - The time field from extra skill use
   * @returns {string} CSS class name
   */
  _getTimeClass(timeValue) {
    if (!timeValue) return 'time--unknown';

    const normalized = String(timeValue).toLowerCase().trim();

    // Map common action economy designations
    if (normalized.includes('swift')) return 'time--swift';
    if (normalized.includes('move')) return 'time--move';
    if (normalized.includes('standard')) return 'time--standard';
    if (normalized.includes('full')) return 'time--full';
    if (normalized.includes('free')) return 'time--free';
    if (normalized.includes('reaction')) return 'time--reaction';
    if (normalized.includes('round')) return 'time--full';

    return 'time--unknown';
  }

  /**
   * Map action economy time value to human-readable label
   * @param {string|null} timeValue - The time field from extra skill use
   * @returns {string} Human-readable label with icon
   */
  _getTimeLabel(timeValue) {
    if (!timeValue) return '—';

    const normalized = String(timeValue).toLowerCase().trim();

    // Map to readable labels with icons
    if (normalized.includes('swift')) return '⚡ Swift';
    if (normalized.includes('move')) return '▶ Move';
    if (normalized.includes('standard')) return '⬤ Standard';
    if (normalized.includes('full') || normalized.includes('round')) return '⟲ Full Round';
    if (normalized.includes('free')) return '∞ Free';
    if (normalized.includes('reaction')) return '↩ Reaction';

    // Return as-is if not matched
    return timeValue;
  }

  /**
   * Classify the action type of a skill use for UI clarity
   * @param {Object} use - The skill use object
   * @returns {string} Action type: 'check', 'opposed', 'use', 'roll', 'reference', or 'unknown'
   */
  _classifyActionType(use) {
    const label = String(use.label || '').toLowerCase();
    const dc = String(use.dc || '').toLowerCase();
    const effect = String(use.effect || '').toLowerCase();
    const time = String(use.time || '').toLowerCase();

    // Opposed checks: explicitly stated as opposed
    if (dc.includes('opposed')) return 'opposed';
    if (label.includes('feint') || label.includes('deception')) return 'opposed';

    // Combat actions: combat terminology
    if (label.includes('attack') || label.includes('feint') || label.includes('dodge') || label.includes('parry')) return 'roll';
    if (effect.includes('attack') || effect.includes('damage')) return 'roll';

    // Uses/invocations: applying an effect
    if (label.includes('use') || label.includes('apply') || label.includes('activate')) return 'use';
    if (effect.includes('gain') || effect.includes('apply')) return 'use';

    // Rolls/checks: skill rolls with DC
    if (dc && !dc.includes('none') && !dc.includes('n/a')) return 'check';
    if (effect.includes('check') || effect.includes('roll')) return 'check';

    // Reference/informational: no action needed
    if (label.includes('reference') || label.includes('information') || label.includes('know')) return 'reference';
    if (time.includes('none') || time.includes('n/a') || time.includes('instant')) return 'reference';

    return 'check'; // Default to check
  }

  /**
   * Get human-readable label for action type
   * @param {Object} use - The skill use object
   * @returns {Object} { type: string, label: string, icon: string }
   */
  _getActionTypeLabel(use) {
    const type = this._classifyActionType(use);
    const map = {
      'check': { label: 'Check', icon: '🎲', action: 'check' },
      'opposed': { label: 'Opposed', icon: '⚔', action: 'opposed' },
      'roll': { label: 'Roll', icon: '🎲', action: 'roll' },
      'use': { label: 'Use', icon: '✓', action: 'use' },
      'reference': { label: 'Info', icon: 'ℹ', action: 'reference' },
      'unknown': { label: 'Action', icon: '→', action: 'unknown' }
    };
    return map[type] || map['unknown'];
  }

  /**
   * Categorize a skill use for grouped display
   * Derives display grouping based on metadata signals
   * @param {Object} use - The skill use object
   * @param {string} skillKey - The skill key
   * @returns {string} Category: 'Core', 'Combat', 'Social', 'Utility', or 'Special'
   */
  _categorizeSkillUse(use, skillKey) {
    const label = (use.label || '').toLowerCase();
    const effect = (use.effect || '').toLowerCase();
    const time = (use.time || '').toLowerCase();

    // Combat-specific uses
    const combatSkills = ['gatherInformation', 'deception', 'persuasion', 'endurance', 'acrobatics'];
    const combatTerms = ['feint', 'dodge', 'parry', 'attack', 'defend', 'distract', 'demoralize', 'intimidate'];
    if (combatSkills.includes(skillKey) && combatTerms.some(t => label.includes(t) || effect.includes(t))) {
      return 'Combat';
    }
    if (label.includes('feint') || label.includes('dodge') || label.includes('parry')) {
      return 'Combat';
    }
    if (effect.includes('attack') || effect.includes('defend') || effect.includes('flat-footed')) {
      return 'Combat';
    }

    // Social uses
    const socialSkills = ['persuasion', 'deception', 'gatherInformation'];
    const socialTerms = ['persuade', 'bargain', 'bribe', 'intimidate', 'deception', 'deceptive', 'innuendo', 'haggle'];
    if (socialSkills.includes(skillKey) && socialTerms.some(t => label.includes(t) || effect.includes(t))) {
      return 'Social';
    }

    // Special uses with explicit markers
    if (label.includes('(trained)') || use.trainedOnly) {
      return 'Special';
    }
    if (label.includes('(feat)') || label.includes('(talent)') || label.includes('(class)')) {
      return 'Special';
    }

    // Check if it's a core/fundamental use (no special conditions)
    // Core uses don't have "trained only", don't require special setup
    if (!use.trainedOnly && !label.includes('(trained)') && !label.includes('(feat)')) {
      return 'Core';
    }

    // Default to utility for everything else
    return 'Utility';
  }

  /* ============================================================
     PHASE C/E/F/H: CANONICAL INVOCATION + ACTION ECONOMY WRAPPERS
  ============================================================ */

  async _runCanonicalInitiative(mode = "roll") {
    if (mode === "take10") {
      try {
        return await CombatExecutor.executeInitiative(this.actor, { mode: "take10" });
      } catch (err) {
        console.warn("[PHASE C] CombatExecutor.executeInitiative take10 path failed, falling back once:", err);
        if (typeof this.actor.swseTake10Initiative === "function") {
          return await this.actor.swseTake10Initiative();
        }
        throw err;
      }
    }

    return await CombatExecutor.executeInitiative(this.actor, { mode: "roll" });
  }

  async _runCanonicalSkillCheck(skillKey, options = {}) {
    return await rollSkillCheck(this.actor, skillKey, options);
  }

  async _runCanonicalAttack(weapon, options = {}) {
    if (!weapon) return null;

    const allowed = await this._applyActionEconomy("standard", {
      source: options?.source ?? "attack",
      weaponId: weapon?.id ?? null,
      weaponName: weapon?.name ?? null
    });
    if (!allowed) return null;

    return await SWSERoll.rollAttack(this.actor, weapon, options);
  }

  async _runCanonicalExtraSkillUse(skillKey, useKey, options = {}) {
    if (!skillKey) return null;

    const uses = await ExtraSkillUseRegistry.getForSkill(skillKey, { actor: this.actor });
    const selectedUse = uses.find(u => u.key === useKey) ?? uses[0] ?? null;
    if (!selectedUse) {
      ui?.notifications?.warn?.(`No extra skill uses found for ${skillKey}`);
      return null;
    }

    const trainedOnly = selectedUse.trainedOnly === true;
    const trained = this.actor?.system?.skills?.[skillKey]?.trained === true;
    if (trainedOnly && !trained) {
      ui?.notifications?.warn?.(`${selectedUse.label ?? selectedUse.name ?? "This use"} requires training.`);
      return null;
    }

    const payload = {
      ...options,
      skillUse: selectedUse,
      useKey: selectedUse.key ?? useKey,
      actionType: options?.actionType ?? selectedUse.actionType ?? null,
      sourceType: options?.sourceType ?? selectedUse.sourceType ?? null,
      sourceLabel: options?.sourceLabel ?? selectedUse.sourceLabel ?? null
    };

    if (typeof SkillUseFilter?.rollSkillUseApplication === "function") {
      return await SkillUseFilter.rollSkillUseApplication(this.actor, selectedUse, payload);
    }

    return await rollSkillCheck(this.actor, skillKey, payload);
  }

  async _runCanonicalCombatAction(actionId, actionData = {}, options = {}) {
    const actionType = this._deriveCombatActionEconomyType(actionData);
    const allowed = await this._applyActionEconomy(actionType, {
      source: options?.source ?? "combat-action",
      actionId,
      actionName: actionData?.name ?? actionId
    });
    if (!allowed) return null;

    const payload = {
      actor: this.actor,
      actionId,
      ...actionData,
      ...options
    };

    try {
      if (typeof CombatEngine?.executeAction === "function") {
        return await CombatEngine.executeAction(payload);
      }
    } catch (err) {
      console.warn("[PHASE E] CombatEngine.executeAction failed, falling back to config dialog once:", err);
    }

    if (actionData && Object.keys(actionData).length > 0) {
      return new CombatRollConfigDialog(this.actor, {
        id: actionId,
        ...actionData,
        ...options
      }).render(true);
    }

    ui?.notifications?.warn?.("Combat action could not be executed.");
    return null;
  }

  async _resolveActionEconomyModules() {
    let Persistence = null;
    let Engine = null;
    let Policy = null;

    try {
      const mod = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js");
      Persistence = mod.ActionEconomyPersistence ?? null;
    } catch (err) {
      console.warn("[PHASE F] Could not load ActionEconomyPersistence:", err);
    }

    try {
      const mod = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js");
      Engine = mod.ActionEngine ?? null;
    } catch (_errV2) {
      try {
        const mod = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine.js");
        Engine = mod.ActionEngine ?? null;
      } catch (err) {
        console.warn("[PHASE F] Could not load ActionEngine:", err);
      }
    }

    try {
      const mod = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-policy-controller.js");
      Policy = mod.ActionPolicyController ?? null;
    } catch (_errController) {
      try {
        const mod = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-policy.js");
        Policy = mod.ActionPolicyController ?? null;
      } catch (err) {
        console.warn("[PHASE F] Could not load ActionPolicyController:", err);
      }
    }

    return { Persistence, Engine, Policy };
  }

  _normalizeActionEconomyType(value) {
    const raw = String(value ?? "").toLowerCase().trim();
    if (!raw) return "standard";
    if (raw.includes("full")) return "full-round";
    if (raw.includes("swift")) return "swift";
    if (raw.includes("move")) return "move";
    if (raw.includes("free")) return "free";
    if (raw.includes("reaction")) return "reaction";
    if (raw.includes("standard")) return "standard";
    return raw;
  }

  _deriveCombatActionEconomyType(actionData = {}) {
    return this._normalizeActionEconomyType(
      actionData?.cost ??
      actionData?.type ??
      actionData?.action?.type ??
      actionData?.actionType ??
      "standard"
    );
  }

  async _applyActionEconomy(actionType, metadata = {}) {
    if (!game?.combat) return true;

    const combatant = game.combat.combatants?.find?.(c => c.actor?.id === this.actor?.id);
    if (!combatant) return true;

    const { Persistence, Engine, Policy } = await this._resolveActionEconomyModules();
    if (!Persistence || !Engine) return true;

    const combatId = game.combat.id;
    let turnState = Persistence.getTurnState?.(this.actor, combatId) ?? {};

    const payload = {
      actor: this.actor,
      combatId,
      actionType,
      turnState,
      metadata
    };

    try {
      if (Policy?.wouldPermit && !Policy.wouldPermit(payload)) {
        Policy.handle?.(payload);
        return false;
      }

      const policyResult = await Policy?.handle?.(payload);
      if (policyResult === false || policyResult?.permitted === false) {
        return false;
      }
    } catch (err) {
      console.warn("[PHASE F] Action policy check failed, continuing cautiously:", err);
    }

    if (typeof Engine.consumeAction !== "function") {
      return true;
    }

    const nextState = await Engine.consumeAction(turnState, actionType, metadata);
    if (nextState === false || nextState?.permitted === false) {
      return false;
    }

    try {
      if (typeof Persistence.setTurnState === "function") {
        await Persistence.setTurnState(this.actor, combatId, nextState);
      } else if (typeof Persistence.saveTurnState === "function") {
        await Persistence.saveTurnState(this.actor, combatId, nextState);
      } else if (typeof Persistence.updateTurnState === "function") {
        await Persistence.updateTurnState(this.actor, combatId, nextState);
      }
    } catch (err) {
      console.warn("[PHASE F] Failed to persist action economy state:", err);
    }

    return true;
  }

  /* ============================================================
     DROP HANDLING (TAB-AGNOSTIC)
  ============================================================ */

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
      // console.error('Drop application failed:', err);
      ui?.notifications?.error?.(`Failed to add dropped item: ${err.message}`);
    }
  }

  /**
   * Handle actor drop: Show modal for GM, simple add for players
   *
   * @private
   * @param {Actor} droppedActor
   */
  async _handleActorDrop(droppedActor) {
    // Cross-type or player drop: only add (no adoption)
    if (droppedActor.type !== this.actor.type || !game.user.isGM) {
      return this._addActorRelationship(droppedActor);
    }

    // Same type + GM: show modal
    new AdoptOrAddDialog(droppedActor, async (choice) => {
      if (choice === "add") {
        await this._addActorRelationship(droppedActor);
      } else if (choice === "adopt") {
        await this._adoptActor(droppedActor);
      }
    }).render(true);
  }

  /**
   * Add actor as relationship (linked reference)
   *
   * @private
   * @param {Actor} actor
   */
  async _addActorRelationship(actor) {
    const relationships = this.actor.system?.relationships ?? [];
    const alreadyLinked = relationships.some(r => r.uuid === actor.uuid);

    if (alreadyLinked) {
      // swseLogger.debug(`Already linked: ${actor.name}`);
      return;
    }

    const mutationPlan = {
      update: {
        'system.relationships': [
          ...relationships,
          {
            uuid: actor.uuid,
            name: actor.name,
            type: actor.type
          }
        ]
      }
    };

    try {
      await ActorEngine.apply(this.actor, mutationPlan);
    } catch (err) {
      // console.error('Failed to add actor relationship:', err);
      ui?.notifications?.error?.(`Failed to add relationship: ${err.message}`);
    }
  }

  /**
   * Adopt actor stat block (identity mutation)
   *
   * @private
   * @param {Actor} sourceActor
   */
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
      // console.error('Adoption failed:', err);
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

  /**
   * Revalidate character build by switching from free build mode to normal mode.
   * This enforces prerequisites and restrictions that were bypassed in free build.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _revalidateBuild() {
    try {
      // Switch from free build mode to normal mode (prerequisites enforced)
      const plan = {
        update: {
          'system.buildMode': 'normal'
        }
      };

      await ActorEngine.apply(this.actor, plan);
      ui?.notifications?.info?.('Build revalidated — prerequisites now enforced');
    } catch (err) {
      // console.error('Build revalidation failed:', err);
      ui?.notifications?.error?.(`Build revalidation failed: ${err.message}`);
    }
  }

  /**
   * GOVERNANCE OVERRIDE: Form submission through ActorEngine
   *
   * ⚠️ CRITICAL: This method COMPLETELY BYPASSES Foundry's default form submission.
   *
   * WHY THIS IS NECESSARY:
   * - Foundry's default path: _onSubmitForm → _prepareSubmitData → actor.update()
   * - Our system: All actor.update() calls must go through ActorEngine.updateActor()
   * - Reason: MutationInterceptor blocks unauthorized writes to system.derived.* and system.hp.max
   * - Those fields are SSOT (Single Source of Truth), computed by DerivedCalculator and ActorEngine
   *
   * IMPLEMENTATION:
   * - This override intercepts the form event before it reaches Foundry's submission pipeline
   * - Collects FormData, coerces types, filters protected fields
   * - Routes updates through ActorEngine.apply() governance layer
   * - Returns early to prevent Foundry's default _processSubmitData from running
   *
   * VERSION CONSTRAINTS:
   * - Requires Foundry V13+ (AppV2 architecture)
   * - If Foundry significantly changes AppV2.render() or form handling, this must be reviewed
   * - Not compatible with V11 or earlier (they use Application API, not ApplicationV2)
   *
   * WHAT WOULD BREAK:
   * - Removing this: actor.update() calls would be blocked by MutationInterceptor
   * - Direct actor.update() in templates/items/etc would silently fail
   * - Sheet would appear to accept input but changes wouldn't persist
   *
   * @param {Event} event - Form submission event
   * @returns {Promise<void>}
   */
  async _onSubmitForm(event) {
    // Phase 8: Delegate form submission to focused form module
    return await handleFormSubmission(this, event);
  }

  // ============================================================
  // DEPRECATED: Old form submission helpers (kept for reference)
  // These are now in character-sheet/form.js
  // ============================================================

  async _onSubmitForm_OLD(event) {
    // swseLogger.debug('[PERSISTENCE] ════════════════════════════════════════');
    // swseLogger.debug('[PERSISTENCE] _onSubmitForm CALLED');
    swseLogger.debug('[PERSISTENCE] Event:', {
      type: event?.type,
      target: event?.target?.tagName,
      targetClass: event?.target?.className
    });

    try {
      event.preventDefault();
      // swseLogger.debug('[PERSISTENCE] Prevented default');
    } catch (err) {
      console.warn('[PERSISTENCE] Could not preventDefault:', err);
    }

    // Get the form element
    const form = event.target;
    swseLogger.debug('[PERSISTENCE] Form to submit:', {
      tag: form?.tagName,
      class: form?.className,
      isConnected: form?.isConnected,
      childCount: form?.children?.length
    });

    // DIAGNOSTIC: Log form data collection
    // swseLogger.debug('[PERSISTENCE] Collecting FormData from form');
    let formData;
    try {
      formData = new FormData(form);
      // swseLogger.debug('[PERSISTENCE] FormData created successfully');
    } catch (err) {
      // console.error('[PERSISTENCE] Failed to create FormData:', err);
      return;
    }

    // Convert FormData to plain object, then expand nested paths
    const formDataObj = Object.fromEntries(formData.entries());

    // CRITICAL: HTML FormData omits unchecked checkboxes and checked boxes default to "on".
    // For boolean-backed sheet fields (especially trained/focused skill flags), explicitly
    // serialize checkbox state so the engine receives true/false and derived skill totals
    // can correctly apply trained (+5) and focused (+5) bonuses.
    for (const checkbox of form.querySelectorAll('input[type="checkbox"][name]')) {
      formDataObj[checkbox.name] = checkbox.checked ? 'true' : 'false';
    }
    swseLogger.debug('[PERSISTENCE] FormData entries count:', Object.keys(formDataObj).length);
    swseLogger.debug('[PERSISTENCE] Raw form data (strings):', formDataObj);

    // CRITICAL FIX: Convert numeric string values to actual numbers
    // FormData collects all values as strings, but numeric fields need numbers
    const coercedData = this._coerceFormData(formDataObj);

    swseLogger.debug('[PERSISTENCE] Coerced form data (with types):', coercedData);

    const expanded = foundry.utils.expandObject(coercedData);

    // swseLogger.debug('[PERSISTENCE] Expanded form data:', expanded);

    const sanitized = this._sanitizeExpandedFormData(expanded);
    // swseLogger.debug('[PERSISTENCE] Sanitized form data:', sanitized);

    // CRITICAL: Filter out SSOT-protected fields that cannot be updated directly
    // These fields are enforced by ActorEngine governance and must be recalculated
    const filtered = this._filterSSotProtectedFields(sanitized);

    // DIAGNOSTIC: Compare sanitized vs filtered to identify what's being removed
    const removedKeys = [];
    for (const [key, value] of Object.entries(foundry.utils.flattenObject(sanitized))) {
      const filteredFlat = foundry.utils.flattenObject(filtered);
      if (!(key in filteredFlat) && value !== undefined) {
        removedKeys.push(key);
      }
    }
    if (removedKeys.length > 0) {
      // swseLogger.debug('[PERSISTENCE] Keys removed by filter:', removedKeys);
    }

    if (!filtered || Object.keys(filtered).length === 0) {
      console.warn('[PERSISTENCE] No updatable data after filtering protected fields');
      return;
    }

    try {
      // CRITICAL: Get fresh world actor to prevent stale reference issues
      // The actor reference in the sheet can become stale; we must fetch the
      // current instance from the world actors collection before updating
      const currentActorId = this.actor?.id;
      if (!currentActorId) {
        throw new Error('[PERSISTENCE] Cannot get actor ID from sheet context');
      }

      const freshActor = game.actors?.get?.(currentActorId);
      if (!freshActor) {
        throw new Error(`[PERSISTENCE] Actor "${currentActorId}" not found in world actors collection`);
      }

      swseLogger.debug('[PERSISTENCE] Actor reference verified:', {
        sheetActorId: this.actor.id,
        freshActorId: freshActor.id,
        isSameReference: this.actor === freshActor,
        freshActorCollection: freshActor.collection ? 'world' : 'null'
      });

      // Route directly through governance layer
      // This bypasses Foundry's _processSubmitData → actor.update() entirely
      swseLogger.debug('[PERSISTENCE] Calling ActorEngine.updateActor with:', {
        actorName: freshActor.name,
        actorId: freshActor.id,
        expandedKeys: Object.keys(filtered)
      });

      // [MUTATION TRACE] SHEET — handoff boundary to ActorEngine
      traceLog('SHEET', '_onSubmitForm handoff to ActorEngine.updateActor', {
        actor:   actorSummary(freshActor),
        payload: payloadSummary(filtered),
        sheetActorIsFresh: this.actor === freshActor
      });

      await ActorEngine.updateActor(freshActor, filtered);

      // swseLogger.debug('[PERSISTENCE] ActorEngine.updateActor completed successfully');

      // CRITICAL: If level was changed, trigger full recalculation of derived data
      // This ensures halfLevel, defenses, and all derived stats are recalculated
      if (filtered['system.level'] !== undefined) {
        // swseLogger.debug('[PERSISTENCE] Level changed detected, triggering full actor recalculation');
        try {
          await ActorEngine.recalcAll(freshActor);
          // swseLogger.debug('[PERSISTENCE] Full actor recalculation completed');
          // Re-render sheet to show updated derived values
          await this.render(false);
          // swseLogger.debug('[PERSISTENCE] Sheet re-rendered with updated derived data');
        } catch (recalcErr) {
          // console.error('[PERSISTENCE] Recalculation failed:', recalcErr);
        }
      }
    } catch (err) {
      // console.error('[PERSISTENCE] Sheet submission failed:', err);
      ui.notifications.error(`Failed to update actor: ${err.message}`);
    }
  }

  /**
   * Coerce form data values to appropriate types
   * FormData collects all values as strings, but some fields need type conversion
   *
   * Uses FORM_FIELD_SCHEMA for reliable, schema-driven coercion instead of pattern matching.
   * Only converts fields explicitly listed in the schema; unknown fields remain strings.
   *
   * @param {Object} formDataObj - Raw form data with string values
   * @returns {Object} Form data with coerced types
   */
  _coerceFormData(formDataObj) {
    swseLogger.debug('[PERSISTENCE] _coerceFormData called with', Object.keys(formDataObj).length, 'fields');
    const coerced = {};

    for (const [key, value] of Object.entries(formDataObj)) {
      // Schema-driven type lookup instead of pattern matching
      const expectedType = getFieldType(key);

      if (expectedType === 'number' && value !== '' && value !== null) {
        // Try to convert to number
        const numValue = Number(value);
        coerced[key] = !isNaN(numValue) ? numValue : value;
        swseLogger.debug(`[PERSISTENCE] Coerced ${key}: "${value}" → ${coerced[key]} (number, schema-driven)`);
      } else if (expectedType === 'boolean' && (value === 'true' || value === 'false')) {
        coerced[key] = value === 'true';
        swseLogger.debug(`[PERSISTENCE] Coerced ${key}: "${value}" → ${coerced[key]} (boolean)`);
      } else if (value === 'true') {
        // Fallback: convert string 'true'/'false' even if not in schema
        coerced[key] = true;
        swseLogger.debug(`[PERSISTENCE] Coerced ${key}: "${value}" → true (boolean, fallback)`);
      } else if (value === 'false') {
        coerced[key] = false;
        swseLogger.debug(`[PERSISTENCE] Coerced ${key}: "${value}" → false (boolean, fallback)`);
      } else {
        // Unknown type or not in schema: keep as string
        coerced[key] = value;
      }
    }

    swseLogger.debug('[PERSISTENCE] _coerceFormData returning', Object.keys(coerced).length, 'coerced fields');
    return coerced;
  }


  /**
   * Remove placeholder/display-only values and unsafe writeback paths from expanded form data.
   *
   * Rules:
   * - strip literal em dash placeholder values
   * - strip empty-string pseudo values where appropriate
   * - strip most flags.* writes except SWSE-owned flags
   * - recurse and prune empty objects
   *
   * @param {Object} expanded
   * @returns {Object}
   */
  _sanitizeExpandedFormData(expanded) {
    const clone = foundry.utils.deepClone(expanded ?? {});

    const isPlaceholder = (value) => {
      if (value === '—') return true;
      if (value === '––') return true;
      if (value === '— —') return true;
      return false;
    };

    const walk = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return obj;

      for (const key of Object.keys(obj)) {
        const nextPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        if (typeof value === 'string' && isPlaceholder(value)) {
          delete obj[key];
          continue;
        }

        // Strip unsafe flags by default, except explicit SWSE namespace flags.
        if (path === 'flags') {
          if (key !== 'swse' && key !== 'foundryvtt-swse') {
            delete obj[key];
            continue;
          }
        }

        if (value && typeof value === 'object') {
          walk(value, nextPath);
          if (Object.keys(value).length === 0) {
            delete obj[key];
            continue;
          }
        }
      }

      return obj;
    };

    return walk(clone);
  }

  /**
   * Filter out fields that are protected by SSOT (Single Source of Truth) governance.
   * These fields cannot be updated directly through ActorEngine.updateActor().
   *
   * Protected fields:
   * - system.derived.* → Only DerivedCalculator may write these
   * - system.hp.max → Only ActorEngine.recomputeHP() may write this
   *
   * Dependencies that affect HP (and trigger recomputeHP via hooks):
   * - Attributes (CON, STR, DEX, etc.) ✓ NOT protected
   * - Level ✓ NOT protected
   * - Class ✓ NOT protected
   * - HP bonus ✓ NOT protected
   *
   * The form should allow editing these dependencies; the governance layer
   * will automatically trigger HP recomputation via hooks.
   *
   * @param {Object} expanded - Expanded form data (nested)
   * @returns {Object} Filtered data without SSOT-protected fields
   */
  _filterSSotProtectedFields(expanded) {
    const filtered = foundry.utils.deepClone(expanded ?? {});

    // Remove protected derived fields
    if (filtered.system?.derived) {
      delete filtered.system.derived;
    }

    // Remove protected hp.max (only hp.value and hp.temp are editable)
    if (filtered.system?.hp?.max !== undefined) {
      delete filtered.system.hp.max;
    }

    // Keep only SWSE-owned flags if present
    if (filtered.flags) {
      const safeFlags = {};
      if (filtered.flags.swse) safeFlags.swse = filtered.flags.swse;
      if (filtered.flags["foundryvtt-swse"]) safeFlags["foundryvtt-swse"] = filtered.flags["foundryvtt-swse"];
      filtered.flags = safeFlags;
      if (Object.keys(filtered.flags).length === 0) {
        delete filtered.flags;
      }
    }

    // CRITICAL: Remove top-level fields that should not be in partial updates
    // Only include `name` if it's actually defined and different from the current value
    // This prevents payload corruption from undefined or empty name values
    if (filtered.name === '—' || filtered.name === undefined || filtered.name === null) {
      delete filtered.name;
    }
    if (typeof filtered.name === 'string' && filtered.name.trim() === '') {
      delete filtered.name;
      console.warn('[PERSISTENCE] Filtered out empty name field - partial updates should omit untouched fields');
    }
    if (filtered.name !== undefined && typeof filtered.name !== 'string') {
      delete filtered.name;
      console.warn('[PERSISTENCE] Filtered out non-string name field from partial update payload');
    }

    // Remove system-protected fields that cause collection errors
    delete filtered._id;
    delete filtered.type;
    delete filtered.ownership;
    delete filtered.permission;
    delete filtered.sort;
    delete filtered.folder;
    delete filtered.img;
    delete filtered._stats;

    return filtered;
  }
}
