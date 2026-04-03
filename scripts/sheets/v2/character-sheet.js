import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import MobileMode from "/systems/foundryvtt-swse/scripts/ui/mobile-mode-manager.js";
import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { CombatRollConfigDialog } from "/systems/foundryvtt-swse/scripts/apps/combat/combat-roll-config-dialog.js";
import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";
import { DropResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";
import { LightsaberConstructionApp } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/lightsaber-construction-app.js";
import { BlasterCustomizationApp } from "/systems/foundryvtt-swse/scripts/apps/blaster/blaster-customization-app.js";
import { ArmorModificationApp } from "/systems/foundryvtt-swse/scripts/apps/armor/armor-modification-app.js";
import { MeleeWeaponModificationApp } from "/systems/foundryvtt-swse/scripts/apps/weapons/melee-modification-app.js";
import { GearModificationApp } from "/systems/foundryvtt-swse/scripts/apps/gear/gear-modification-app.js";
import { launchProgression, launchFollowerProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";
import { MentorNotesApp } from "/systems/foundryvtt-swse/scripts/apps/mentor-notes/mentor-notes-app.js";
import { CombatExecutor } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-executor.js";
import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { AnimationEngine } from "/systems/foundryvtt-swse/scripts/engine/animation-engine.js";
import { ActionEconomyIntegration } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-integration.js";
import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";
import { SentinelSheetGuardrails } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-sheet-guardrails.js";
import { bindV2CharacterSheetTooltips } from "/systems/foundryvtt-swse/scripts/sheets/v2/TooltipIntegration.js";
import { bindV2SheetBreakdowns, closeBreakdown } from "/systems/foundryvtt-swse/scripts/sheets/v2/BreakdownIntegration.js";
import { HelpModeManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/HelpModeManager.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { showRollModifiersDialog } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";
import { computeCenteredPosition } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
import { PanelContextBuilder } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js";
import { PANEL_REGISTRY } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PANEL_REGISTRY.js";
import { PostRenderAssertions } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PostRenderAssertions.js";
// Phase 7: Shared platform layer imports (reusable across all V2 sheets)
import { UIStateManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/UIStateManager.js";
import { PanelDiagnostics } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/PanelDiagnostics.js";
// Character-specific visibility manager (subclass of shared base)
import { PanelVisibilityManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/PanelVisibilityManager.js";

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
  'system.defenses.fort.miscMod': 'number',
  'system.defenses.ref.miscMod': 'number',
  'system.defenses.will.miscMod': 'number',

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
  'system.xp': 'number',
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
    console.log(`[SWSE Sheet] ${sheetName} listeners have been cleaned up (signal aborted)`);
  } else {
    console.log(`[SWSE Sheet] ${sheetName} listeners are active; will be cleaned on next render via AbortController`);
  }

  // Note: Actual listener count requires browser internal APIs. Rely on AbortController
  // cleanup mechanism instead of heuristic checks.
}

export class SWSEV2CharacterSheet extends
  HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions ?? {}, {
      classes: ["swse", "sheet", "actor", "character", "swse-character-sheet", "swse-sheet", "v2"],
      position: {
        width: 900,
        height: 950
      },
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
    });
  }

  static PARTS = {
    body: {
      template: "systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs"
    }
  };

  constructor(document, options = {}) {
    super(document, options);
    // Track sheet instance for Sentinel monitoring
    SentinelSheetGuardrails.trackSheetInstance("SWSEV2CharacterSheet");

    // Render loop prevention guard (same pattern as ProgressionShell)
    this._isRendering = false;
    this._renderCount = 0;

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
  }

  // ═══ AUDIT INSTRUMENTATION + RENDER GUARD ═══
  async render(...args) {
    // Render loop prevention: block recursive render calls during active render
    if (this._isRendering) {
      console.warn("[SWSEV2CharacterSheet] ⚠️ Render called while already rendering — BLOCKED (loop prevention)");
      return this;
    }

    this._isRendering = true;
    this._renderCount++;

    // Phase 6: Capture UI state before rerender so it can be restored after
    this.uiStateManager.captureState();

    console.log(`[SWSEV2CharacterSheet] RENDER START (#${this._renderCount}) position:`, this.position);
    const result = await super.render(...args);
    console.log(`[SWSEV2CharacterSheet] RENDER COMPLETE (#${this._renderCount}) position:`, this.position);

    this._isRendering = false;
    return result;
  }

  setPosition(position) {
    console.log("[SWSEV2CharacterSheet] setPosition CALLED with:", position);
    console.log("[SWSEV2CharacterSheet] current position before:", this.position);
    const result = super.setPosition(position);
    console.log("[SWSEV2CharacterSheet] position after setPosition:", this.position);
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
      const pos = computeCenteredPosition(900, 950);
      console.log("[SheetPosition] FIRST RENDER THIS SESSION: Setting centered position", pos);
      this.setPosition({ left: pos.left, top: pos.top, width: 900, height: 950 });
      this._shouldCenterOnRender = false;
    }

    await super._onRender(context, options);

    // ── Phase 6: Restore UI state after rerender ──
    // This ensures expanded sections, active tabs, focused fields, and scroll position
    // are preserved across rerenders triggered by actor/item updates
    this.uiStateManager.restoreState();

    // ── DIAGNOSTIC: Log that render completed ──
    console.log(
      "[SheetPosition] _onRender complete | shouldCenter =", shouldCenter,
      "| position.left =", this.position?.left
    );

    // Abort previous render's listeners to prevent duplicate event handlers
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // CRITICAL FIX: In ApplicationV2, this.element may be a control button, not the sheet root
    // The form wraps all sheet content, so use the form as the activation root instead
    let root = this.element?.[0] ?? this.element;

    console.log('[LIFECYCLE] _onRender this.element resolved to:', {
      tag: root?.tagName,
      classes: root?.className
    });

    // If this.element is not the form, try to find the actual form element
    if (root && root.tagName !== 'FORM') {
      console.log('[LIFECYCLE] Root is not a FORM, searching for form parent/in DOM');
      const formParent = root.closest("form");
      if (formParent) {
        console.log('[LIFECYCLE] Found form via closest()');
        root = formParent;
      } else {
        const appRoot = this.element instanceof HTMLElement ? this.element : this.element?.[0];
        const localForm = appRoot?.closest?.("form") ?? appRoot?.querySelector?.("form.swse-character-sheet-form") ?? null;
        if (localForm) {
          console.log('[LIFECYCLE] Found form within this app root');
          root = localForm;
        }
      }
    }

    if (!root) {
      console.error('[LIFECYCLE] _onRender: No root element found');
      return;
    }

    console.log('[LIFECYCLE] _onRender calling activateListeners with root element:', {
      rootTag: root.tagName,
      rootClasses: root.className,
      rootId: root.id,
      isForm: root.tagName === 'FORM'
    });

    // Phase 9: Apply help level CSS class to root for tier-aware affordance visibility
    HelpModeManager.getLevels().forEach(level => {
      root.classList.remove(`help-level--${level.toLowerCase()}`);
    });
    root.classList.add(`help-level--${this._helpLevel.toLowerCase()}`);

    // Wire listeners to the actual sheet root (now guaranteed to be the form or the sheet content)
    this.activateListeners(root, { signal });

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

    derived.defenses ??= {};

    // SWSE Skills Registry (default definitions if actor.system.skills is empty)
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
      const abilityMod = selectedAbility.mod ?? 0;

      // Get halfLevel from system (this is just display, not a calculation)
      const halfLevel = Math.floor((system.level ?? 1) / 2);

      return {
        key,
        label: definition.label,
        // Use derived skill total (already calculated by engine), default to 0 if missing
        total: derivedData.total ?? 0,
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
        miscMod: skillData.miscMod ?? 0,
        extraUses: Array.isArray(skillData.extraUses) ? skillData.extraUses : []
      };
    });

    derived.skills = skillsList;

    // Build headerDefenses array from derived.defenses object
    // Convert {fort: 10, ref: 10, will: 10, flatFooted: 10} → [{key: 'fort', label: 'Fortitude', total: 10, ...}, ...]
    const defenseKeys = [
      { key: 'fort', label: 'Fortitude' },
      { key: 'ref', label: 'Reflex' },
      { key: 'will', label: 'Will' },
      { key: 'flatFooted', label: 'Flat-Footed' }
    ];
    const headerDefenses = defenseKeys.map(def => {
      const abilityMod = derived.defenses[`${def.key}AbilityMod`] ?? 0;
      const miscMod = derived.defenses[`${def.key}MiscMod`] ?? 0;
      return {
        key: def.key,
        label: def.label,
        total: derived.defenses[def.key] ?? 10,
        armorBonus: derived.defenses[`${def.key}ArmorBonus`] ?? 0,
        abilityMod,
        // SEMANTIC: Visual state classes for breakdown components
        abilityModClass: abilityMod > 0 ? 'mod--positive' : abilityMod < 0 ? 'mod--negative' : 'mod--zero',
        classDef: derived.defenses[`${def.key}ClassDef`] ?? 0,
        miscMod,
        miscModClass: miscMod > 0 ? 'mod--positive' : miscMod < 0 ? 'mod--negative' : 'mod--zero'
      };
    });

    // Build derived class display string from progression data
    // Format: "Jedi 3 / Soldier 2" or "Noble 5" for single class
    // Source: actor.system.progression.classLevels (authoritative progression engine output)
    let classDisplay = '—';
    const classLevels = actor.system.progression?.classLevels ?? [];
    if (classLevels.length > 0) {
      try {
        const { PROGRESSION_RULES } = await import(
          "/systems/foundryvtt-swse/scripts/engine/progression/data/progression-data.js"
        );
        const classes = PROGRESSION_RULES.classes || {};
        classDisplay = classLevels
          .map(cl => {
            const className = classes[cl.class]?.name || cl.class || 'Unknown';
            return `${className} ${cl.level}`;
          })
          .join(' / ');
      } catch (err) {
        // Fallback: use classId if import fails
        classDisplay = classLevels
          .map(cl => `${cl.class} ${cl.level}`)
          .join(' / ');
      }
    }

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
    const combat = {
      attacks: derived?.attacks?.list ?? []
    };

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
      const enforcementMode = game.settings.get(game.system.id, "actionEconomyMode");

      actionEconomy = {
        state,
        breakdown,
        enforcementMode
      };
    }

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
        for (const eco of economyOrder) {
          if (grouped[eco]) {
            combatActions.groups.push({
              economy: eco,
              count: grouped[eco].length,
              actions: grouped[eco]
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
    // Use derived.xp which is computed by XpEngine.computeXpDerived()
    const xpSystem = CONFIG.SWSE?.system?.xpProgression || 'milestone';
    const xpEnabled = xpSystem !== 'disabled';
    const xpDerived = derived.xp ?? { total: 0, progressPercent: 0, xpToNext: 0 };
    const xpPercent = xpDerived.progressPercent ?? 0;
    const xpLevelReady = xpPercent >= 100;

    // SEMANTIC: XP data object with visual state
    const xpData = {
      level: actor.system.level ?? 1,
      total: xpDerived.total ?? 0,
      nextLevelAt: xpDerived.nextLevelAt ?? 0,
      xpToNext: xpDerived.xpToNext ?? 0,
      stateClass: xpLevelReady ? 'state--ready-levelup' : xpPercent >= 75 ? 'state--nearly-ready' : 'state--in-progress'
    };

    // Character Level Checks
    const level = actor.system.level ?? 1;
    const isLevel0 = level === 0;

    // DIAGNOSTIC: Log level info
    console.log('[CHARGEN DEBUG] Character level info:', {
      'actor.system.level': actor.system.level,
      'level (after default)': level,
      'isLevel0': isLevel0,
      'actor name': actor.name
    });

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

    // Build visible panels + cached hidden panels
    const panelContexts = {};
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
          console.error(`[PANEL BUILD ERROR] ${panelName}:`, err);
          this.panelDiagnostics.recordError(panelName, err.message);
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

    // Log panel contract version for debugging
    const _sheetContractVersion = 1;

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
      // PHASE 2: MISSING CONTEXT KEYS (REMEDIATION)
      // ═════════════════════════════════════════════════════════════════
      xpEnabled,                    // XP system active/disabled flag
      fpAvailable,                  // Force points available for use
      abilities,                    // Array of ability objects with modifiers
      followerSlots,                // Follower slots from actor flags
      followerTalentBadges,         // Aggregated follower talent badges
      enrichedFollowerSlots,        // Follower slots enriched with actor data
      hasAvailableFollowerSlots,    // Whether any slots are unfilled
      xpData,                       // XP progress data for display
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
      // ═════════════════════════════════════════════════════════════════
      // PHASE 9: Combat Actions Browser (in-tab)
      // ═════════════════════════════════════════════════════════════════
      combatActions,                // Organized combat actions by economy type
      // ═════════════════════════════════════════════════════════════════
      // UNIFIED PANEL CONTEXTS (Primary data source)
      // Panels now own all character data through dedicated view models
      // ═════════════════════════════════════════════════════════════════
      ...panelContexts
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
    console.log('[LIFECYCLE] activateListeners called with html element:', {
      htmlTag: html?.tagName,
      htmlClasses: html?.className,
      signalExists: !!signal
    });

    // CRITICAL: Attach form submit listener directly to the form element
    // Template guarantees a stable form selector: .swse-character-sheet-form
    // This single resolution approach prevents ambiguity and silent failures
    console.log('[LIFECYCLE] Resolving form: looking for .swse-character-sheet-form');

    let form = null;
    // If html IS the form, use it directly
    if (html.tagName === 'FORM' && html.classList.contains('swse-character-sheet-form')) {
      form = html;
      console.log('[LIFECYCLE] ✓ html IS the form (by tag + class)');
    } else {
      // Otherwise find it via stable selector
      form = html.querySelector('form.swse-character-sheet-form');
      if (!form) {
        console.log('[LIFECYCLE] Form not found in html, trying appRoot');
        const appRoot = this.element instanceof HTMLElement ? this.element : this.element?.[0];
        form = appRoot?.querySelector('form.swse-character-sheet-form') ?? null;
      }
    }

    console.log('[LIFECYCLE] Form resolution result:', {
      found: !!form,
      formTag: form?.tagName,
      formClasses: form?.className,
      isConnected: form?.isConnected
    });

    if (form) {
      console.log('[LIFECYCLE] Form found, attaching submit listener');
      console.log('[LIFECYCLE] Form element details:', {
        tag: form.tagName,
        classes: form.className,
        childCount: form.children.length,
        isConnected: form.isConnected  // Critical: is it in the DOM?
      });

      const submitHandler = async (ev) => {
        console.log('[PERSISTENCE] ─── SUBMIT EVENT FIRED ───');
        console.log('[PERSISTENCE] Event target:', ev.target.tagName, ev.target.className);
        console.log('[PERSISTENCE] defaultPrevented BEFORE:', ev.defaultPrevented);

        ev.preventDefault();
        ev.stopPropagation();

        console.log('[PERSISTENCE] defaultPrevented AFTER:', ev.defaultPrevented);
        console.log('[PERSISTENCE] Calling _onSubmitForm now');

        // Route to our update handler
        try {
          await this._onSubmitForm({ target: form, preventDefault: () => {} });
          console.log('[PERSISTENCE] _onSubmitForm completed successfully');
        } catch (err) {
          console.error('[PERSISTENCE] _onSubmitForm threw error:', err);
        }
      };

      form.addEventListener("submit", submitHandler, { signal, capture: false });

      console.log('[LIFECYCLE] Submit listener attached successfully');
      console.log('[LIFECYCLE] Will listener survive? Checking signal status:', {
        signalAborted: signal?.aborted ?? 'N/A'
      });
    } else {
      console.error('[LIFECYCLE] ❌ CRITICAL: Could not find form element to attach submit listener');
      console.error('[LIFECYCLE] This means NO submit interception will happen');
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

      console.log(`[HELP-MODE] Cycled to: ${this._helpLevel}`);
    }, { signal });

    // DELEGATED: Tab Switching - Update panel visibility manager
    html.addEventListener("click", ev => {
      const tabLink = ev.target.closest("[data-action='tab']");
      if (!tabLink) return;

      const tabName = tabLink.dataset.tab;
      if (tabName) {
        console.log(`[TAB SWITCH] Switching to tab: ${tabName}`);
        this.visibilityManager.setActiveTab(tabName);
      }
    }, { signal });

    // DELEGATED: Toggle Abilities Panel - Show/Hide Expanded Views
    // Using delegated listeners from html root for stability across rerenders
    html.addEventListener("click", ev => {
      const button = ev.target.closest("[data-action='toggle-abilities']");
      if (!button) return;

      console.log("✓ [DEBUG] Abilities toggle click fired");
      ev.preventDefault();

      const panel = button.closest(".abilities-panel");
      console.log("[DEBUG] Panel found:", !!panel, "Classes:", panel?.className);
      if (!panel) {
        console.warn("[ERROR] Could not find .abilities-panel parent");
        return;
      }

      console.log("[DEBUG] Classes BEFORE toggle:", panel.className);
      const isExpanded = panel.classList.toggle("abilities-expanded");
      console.log("[DEBUG] Classes AFTER toggle:", panel.className, "| isExpanded:", isExpanded);

      // Show/hide expanded views for each ability
      const rows = panel.querySelectorAll(".ability-row");
      console.log("[DEBUG] Found", rows.length, "ability rows");
      rows.forEach((row, idx) => {
        const collapsed = row.querySelector(".ability-collapsed");
        const expanded = row.querySelector(".ability-expanded");
        if (collapsed) {
          collapsed.style.display = isExpanded ? "none" : "flex";
          console.log(`[DEBUG] Row ${idx} collapsed display:`, collapsed.style.display);
        }
        if (expanded) {
          expanded.style.display = isExpanded ? "flex" : "none";
          console.log(`[DEBUG] Row ${idx} expanded display:`, expanded.style.display);
        }
      });

      // Update button text
      button.textContent = isExpanded ? "Collapse" : "Expand";
      console.log("[DEBUG] Button text updated to:", button.textContent);
    }, { signal });

// DELEGATED: Toggle Defenses Panel - Show/Hide Expanded Views
    html.addEventListener("click", ev => {
      const button = ev.target.closest("[data-action='toggle-defenses']");
      if (!button) return;

      console.log("✓ [DEBUG] Defenses toggle click fired");
      ev.preventDefault();

      const panel = button.closest(".defenses-panel");
      console.log("[DEBUG] Panel found:", !!panel, "Classes:", panel?.className);
      if (!panel) {
        console.warn("[ERROR] Could not find .defenses-panel parent");
        return;
      }

      console.log("[DEBUG] Classes BEFORE toggle:", panel.className);
      const isExpanded = panel.classList.toggle("defenses-expanded");
      console.log("[DEBUG] Classes AFTER toggle:", panel.className, "| isExpanded:", isExpanded);

      // Show/hide expanded views for each defense
      const rows = panel.querySelectorAll(".defense-row");
      console.log("[DEBUG] Found", rows.length, "defense rows");
      rows.forEach((row, idx) => {
        const collapsed = row.querySelector(".defense-collapsed");
        const expanded = row.querySelector(".defense-expanded");
        if (collapsed) {
          collapsed.style.display = isExpanded ? "none" : "flex";
          console.log(`[DEBUG] Row ${idx} collapsed display:`, collapsed.style.display);
        }
        if (expanded) {
          expanded.style.display = isExpanded ? "flex" : "none";
          console.log(`[DEBUG] Row ${idx} expanded display:`, expanded.style.display);
        }
      });

      // Update button text
      button.textContent = isExpanded ? "Collapse" : "Expand";
      console.log("[DEBUG] Button text updated to:", button.textContent);
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
        console.error("Ability roll failed:", err);
        ui?.notifications?.error?.(`Ability roll failed: ${err.message}`);
      }
    }, { signal });

    // DELEGATED: Roll Initiative (d20 + initiative bonus) / Take 10
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='roll-initiative'], [data-action='take10-initiative']");
      if (!button) return;

      ev.preventDefault();
      const mode = button.dataset.action === "take10-initiative" ? "take10" : "roll";

      try {
        if (mode === 'take10') {
          await this.actor.swseTake10Initiative();
        } else {
          await this.actor.swseRollInitiative();
        }
      } catch (err) {
        console.error("Initiative roll failed:", err);
        ui?.notifications?.error?.(`Initiative roll failed: ${err.message}`);
      }
    }, { signal });

    // DELEGATED: Auto-save form inputs when they change
    // This survives rerender because listener is on stable root element (html)
    // DEBOUNCED: Prevents keystroke spam. Multiple rapid changes batch into one update.
    html.addEventListener("change", async ev => {
      const input = ev.target.closest("input[name], textarea[name], select[name]");
      if (!input) return;

      console.log('[PERSISTENCE] ─── CHANGE EVENT FIRED (debounced 500ms) ───');
      ev.preventDefault();

      // DIAGNOSTIC: Log the field change
      console.log('[PERSISTENCE] Field changed:', {
        inputName: input.name,
        inputValue: input.value,
        inputType: input.type,
        eventTarget: ev.target.tagName
      });

      // Find the form via stable selector (template-guaranteed)
      console.log('[PERSISTENCE] Resolving form for submission');
      let form = input.closest("form.swse-character-sheet-form");

      // If not found by closest, query from app root
      if (!form && this.element) {
        const appRoot = this.element instanceof HTMLElement ? this.element : this.element?.[0];
        form = appRoot?.querySelector("form.swse-character-sheet-form") ?? null;
      }

      console.log('[PERSISTENCE] Form resolution result:', { found: !!form, formTag: form?.tagName, formClass: form?.className });

      if (form) {
        console.log('[PERSISTENCE] Form found, queuing debounced _onSubmitForm');
        try {
          this._debouncedSubmit({ target: form, preventDefault: () => {} });
          console.log('[PERSISTENCE] Debounced submit queued');
        } catch (err) {
          console.error('[PERSISTENCE] Debounced submit threw error:', err);
        }
      } else {
        console.error("[PERSISTENCE] ❌ Could not find form element to submit");
      }
    }, { signal, capture: false });

    // DELEGATED: UI-only preview math for ability pills
    // Listen on root so rerender doesn't lose listener
    html.addEventListener("input", ev => {
      const input = ev.target.closest(".ability-expanded input");
      if (!input) return;

      const row = input.closest(".ability-row");
      if (row) {
        this._previewAbilityRow(row);
      }
    }, { signal, capture: false });

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

    // DELEGATED: Roll Skill Check (d20 + skill bonus)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest("[data-action='roll-skill']");
      if (!button) return;

      ev.preventDefault();
      const skillKey = button.dataset.skill;
      if (!skillKey) return;

      try {
        await SWSERoll.rollSkill(this.actor, skillKey);
      } catch (err) {
        console.error("Skill roll failed:", err);
        ui?.notifications?.error?.(`Skill roll failed: ${err.message}`);
      }
    }, { signal, capture: false });

    // PHASE 6 Part 3: Skill Roll Button (with modifier dialog)
    html.addEventListener("click", async ev => {
      const button = ev.target.closest(".skill-roll-btn");
      if (!button) return;

      ev.preventDefault();
      const skillKey = button.dataset.skill;
      if (!skillKey) return;

      try {
        const skill = this.actor.system.skills?.[skillKey];
        if (!skill) return;

        const modResult = await showRollModifiersDialog({
          title: `${skill.label ?? skillKey} Check`,
          rollType: 'skill'
        });

        if (modResult === null) return; // Cancelled

        await SWSERoll.rollSkill(this.actor, skillKey, {
          customModifier: modResult.customModifier || 0,
          useForcePoint: modResult.useForcePoint || false
        });
      } catch (err) {
        console.error("Skill roll failed:", err);
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

        await SWSERoll.rollAttack(this.actor, weapon, {
          customModifier: modResult.customModifier || 0,
          cover: modResult.cover || 'none',
          concealment: modResult.concealment || 'none',
          useForcePoint: modResult.useForcePoint || false
        });
      } catch (err) {
        console.error("Attack roll failed:", err);
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
        console.error("Damage roll failed:", err);
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
        console.error('[SHEET] ✗ launchProgression failed:', err);
        SWSELogger.error('[CharacterSheet] Progression launch failed:', err);
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
        console.error(`[SHEET] ✗ ${action} failed:`, err);
        SWSELogger.error(`[CharacterSheet] ${action} failed:`, err);
      }
    }, { signal, capture: false });

    // Build Follower button (delegated) — Phase 3.5 follower runtime integration
    html.addEventListener("click", async ev => {
      const button = ev.target.closest('[data-action="build-follower"]');
      if (!button) return;
      ev.preventDefault();
      try {
        await launchFollowerProgression(this.actor);
      } catch (err) {
        console.error('[SHEET] ✗ launchFollowerProgression failed:', err);
        SWSELogger.error('[CharacterSheet] Follower progression launch failed:', err);
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

    // Phase 4: Mobile Interaction Enhancements
    this._activateMobileActions(html, { signal });
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
    const card = document.querySelector(
      `.force-card[data-item-id="${itemId}"]`
    );
    if (!card) return;
    card.classList.add("discarding");
    setTimeout(() => card.classList.remove("discarding"), 500);
  }

  _handleForceRecoveryAnimation(itemIds = [], full = false) {
    const panel = document.querySelector(".force-panel");
    if (!panel) return;

    if (full) {
      panel.classList.add("force-recovery-burst");
      setTimeout(() => panel.classList.remove("force-recovery-burst"), 800);
    }

    itemIds.forEach(id => {
      const card = document.querySelector(
        `.force-card[data-item-id="${id}"]`
      );
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
        if (itemId) await InventoryEngine.decrementQuantity(this.actor, itemId);
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
            // For weapons: open a configuration dialog
            if (item.type === "weapon") {
              item.sheet.render(true); // For now, just open the item sheet
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
          console.error('Failed to reset turn state:', err);
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
        const data = combatActions[key];
        if (data) {
          new CombatRollConfigDialog(this.actor, data).render(true);
        }
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

        // Trigger action execution (typically a roll or effect)
        const combatActions = this.actor.getFlag(game.system.id, "combatActions") ?? {};
        const data = combatActions[actionId];
        if (data) {
          // Open the config dialog to show details before rolling
          new CombatRollConfigDialog(this.actor, data).render(true);
        }
      }, { signal });
    });

    // Weapon attack roll button (Combat Attacks simplified panel)
    html.querySelectorAll('[data-action="roll-weapon-attack"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const weaponId = button.dataset.weaponId;
        if (!weaponId) return;

        const weapon = this.actor.items.get(weaponId);
        if (!weapon || weapon.type !== "weapon") return;

        // Open combat roll config dialog for the weapon
        new CombatRollConfigDialog(this.actor, {
          type: 'attack',
          weaponId: weaponId,
          weaponName: weapon.name
        }).render(true);
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
    // Filter skills by text
    html.querySelectorAll('[data-action="filter-skills"]').forEach(input => {
      input.addEventListener("input", (event) => {
        const filterText = event.target.value.toLowerCase();
        const skillRows = html.querySelectorAll(".skill-row-container");

        skillRows.forEach(row => {
          const skillName = row.dataset.name?.toLowerCase() || "";
          const skillLabel = row.dataset.label?.toLowerCase() || "";
          const matches = skillName.includes(filterText) || skillLabel.includes(filterText);
          row.style.display = matches ? "" : "none";
        });
      }, { signal });
    });

    // Sort skills
    html.querySelectorAll('[data-action="sort-skills"]').forEach(select => {
      select.addEventListener("change", (event) => {
        const sortBy = event.target.value;
        const skillsList = html.querySelector(".skills-list");
        if (!skillsList) return;

        const rows = Array.from(skillsList.querySelectorAll(".skill-row-container"));
        rows.sort((a, b) => {
          switch (sortBy) {
            case "name":
              return (a.dataset.name || "").localeCompare(b.dataset.name || "");
            case "total-desc":
              return Number(b.dataset.total || 0) - Number(a.dataset.total || 0);
            case "trained":
              return (b.dataset.trained === "true" ? 1 : 0) - (a.dataset.trained === "true" ? 1 : 0);
            case "favorite":
              return (b.dataset.favorite === "true" ? 1 : 0) - (a.dataset.favorite === "true" ? 1 : 0);
            case "default":
            default:
              return 0;
          }
        });

        rows.forEach(row => skillsList.appendChild(row));
      }, { signal });
    });

    // Roll skill button
    html.querySelectorAll('[data-action="roll-skill"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const skillKey = button.dataset.skill;
        if (!skillKey) return;

        try {
          await SWSERoll.rollSkill(this.actor, skillKey);
        } catch (err) {
          console.error("Skill roll failed:", err);
          ui?.notifications?.error?.(`Skill roll failed: ${err.message}`);
        }
      }, { signal });
    });

    // ===== FOCUS CHECKBOX CONTROL =====
    // Focus checkbox should only be enabled when Trained is checked
    // Listen for changes to Trained checkboxes and update Focus checkbox state accordingly
    html.addEventListener("change", (event) => {
      const trainedCheckbox = event.target.closest('input[name*=".trained"]');
      if (!trainedCheckbox) return;

      // Find the corresponding skill row
      const skillRow = trainedCheckbox.closest('[data-skill]');
      if (!skillRow) return;

      // Find the Focus checkbox in the same row
      const focusCheckbox = skillRow.querySelector('input[name*=".focused"]');
      if (!focusCheckbox) return;

      // Enable/disable Focus based on Trained state
      focusCheckbox.disabled = !trainedCheckbox.checked;

      // If disabling Focus, uncheck it
      if (focusCheckbox.disabled && focusCheckbox.checked) {
        focusCheckbox.checked = false;
        // Trigger change event to save the form
        focusCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, { signal, capture: false });

    // Initialize Focus checkbox states on render
    html.querySelectorAll('[data-skill]').forEach(skillRow => {
      const trainedCheckbox = skillRow.querySelector('input[name*=".trained"]');
      const focusCheckbox = skillRow.querySelector('input[name*=".focused"]');

      if (trainedCheckbox && focusCheckbox) {
        focusCheckbox.disabled = !trainedCheckbox.checked;
      }
    });
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
          console.error("Force activation failed:", err);
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

        // Route to correct customization modal based on item type
        try {
          switch (item.type) {
            case "lightsaber":
              new LightsaberConstructionApp(this.actor).render(true);
              break;
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
              new GearModificationApp(this.actor, item).render(true);
              break;
            default:
              ui?.notifications?.warn?.(`No customization available for ${item.type}`);
          }
        } catch (err) {
          console.error("Customization modal failed:", err);
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

    // Add feat button
    html.querySelectorAll('[data-action="add-feat"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        // Open a dialog to select/create a feat
        // For now, just open the item creation dialog
        const itemData = {
          type: "feat",
          name: "New Feat",
          system: {}
        };
        const doc = await Item.create(itemData, { parent: this.actor });
        if (doc) doc.sheet.render(true);
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
        // Open a dialog to select a talent
        // For now, just open the item creation dialog
        const itemData = {
          type: "talent",
          name: "New Talent",
          system: {}
        };
        const doc = await Item.create(itemData, { parent: this.actor });
        if (doc) doc.sheet.render(true);
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
            console.error("Failed to add language:", err);
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
          console.error("Failed to remove language:", err);
          ui?.notifications?.error?.(`Failed to remove language: ${err.message}`);
        }
      }, { signal });
    });

    // Rest / Second Wind button
    html.querySelectorAll('[data-action="rest-second-wind"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        // Restore second wind uses
        const plan = {
          update: {
            "system.secondWind": {
              current: this.actor.system?.secondWind?.max ?? 1
            }
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
          ui?.notifications?.info?.("Second Wind restored!");
        } catch (err) {
          console.error("Rest failed:", err);
          ui?.notifications?.error?.(`Rest failed: ${err.message}`);
        }
      }, { signal });
    });

    // Use Second Wind button
    html.querySelectorAll('[data-action="use-second-wind"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const currentHp = this.actor.system?.hp?.value ?? 0;
        const maxHp = this.actor.system?.hp?.max ?? 1;
        const healing = this.actor.system?.secondWind?.healing ?? 0;
        const newHp = Math.min(currentHp + healing, maxHp);
        const uses = this.actor.system?.secondWind?.uses ?? 0;

        const plan = {
          update: {
            "system.hp.value": newHp,
            "system.secondWind.uses": Math.max(0, uses - 1)
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
          ui?.notifications?.info?.(`Regained ${healing} HP!`);
        } catch (err) {
          console.error("Second Wind use failed:", err);
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
          console.error("Force Point restore failed:", err);
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
          console.error("Force Point spend failed:", err);
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

      try {
        await ActorEngine.apply(this.actor, plan);
        ui?.notifications?.info?.("Condition updated!");
      } catch (err) {
        console.error("Condition update failed:", err);
        ui?.notifications?.error?.(`Condition update failed: ${err.message}`);
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
            console.error("Failed to set DSP:", err);
            ui?.notifications?.error?.(`Failed to set DSP: ${err.message}`);
          }
        }
      }, { signal });
    });

    // Use extra skill button
    html.querySelectorAll('[data-action="use-extra-skill"]').forEach(button => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        const skillKey = button.dataset.skill;
        if (!skillKey) return;

        // Increment extra skill uses
        const current = this.actor.system?.skills?.[skillKey]?.extra ?? 0;
        const plan = {
          update: {
            [`system.skills.${skillKey}.extra`]: current + 1
          }
        };

        try {
          await ActorEngine.apply(this.actor, plan);
          ui?.notifications?.info?.(`Extra skill use recorded for ${skillKey}`);
        } catch (err) {
          console.error("Failed to use extra skill:", err);
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

    // Add global listener with cleanup on signal abort
    document.addEventListener("click", globalClose, { capture: false });
    signal?.addEventListener("abort", () => {
      document.removeEventListener("click", globalClose, { capture: false });
    });
  }

  /* ============================================================
     MENTOR CONVERSATION
  ============================================================ */

  _openMentorConversation() {
    const actor = this.actor;
    new MentorChatDialog(actor).render(true);
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
      console.error('Drop application failed:', err);
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
      console.debug(`Already linked: ${actor.name}`);
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
      console.error('Failed to add actor relationship:', err);
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
      console.error('Build revalidation failed:', err);
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
    console.log('[PERSISTENCE] ════════════════════════════════════════');
    console.log('[PERSISTENCE] _onSubmitForm CALLED');
    console.log('[PERSISTENCE] Event:', {
      type: event?.type,
      target: event?.target?.tagName,
      targetClass: event?.target?.className
    });

    try {
      event.preventDefault();
      console.log('[PERSISTENCE] Prevented default');
    } catch (err) {
      console.warn('[PERSISTENCE] Could not preventDefault:', err);
    }

    // Get the form element
    const form = event.target;
    console.log('[PERSISTENCE] Form to submit:', {
      tag: form?.tagName,
      class: form?.className,
      isConnected: form?.isConnected,
      childCount: form?.children?.length
    });

    // DIAGNOSTIC: Log form data collection
    console.log('[PERSISTENCE] Collecting FormData from form');
    let formData;
    try {
      formData = new FormData(form);
      console.log('[PERSISTENCE] FormData created successfully');
    } catch (err) {
      console.error('[PERSISTENCE] Failed to create FormData:', err);
      return;
    }

    // Convert FormData to plain object, then expand nested paths
    const formDataObj = Object.fromEntries(formData.entries());
    console.log('[PERSISTENCE] FormData entries count:', Object.keys(formDataObj).length);
    console.log('[PERSISTENCE] Raw form data (strings):', formDataObj);

    // CRITICAL FIX: Convert numeric string values to actual numbers
    // FormData collects all values as strings, but numeric fields need numbers
    const coercedData = this._coerceFormData(formDataObj);

    console.log('[PERSISTENCE] Coerced form data (with types):', coercedData);

    const expanded = foundry.utils.expandObject(coercedData);

    console.log('[PERSISTENCE] Expanded form data:', expanded);

    // CRITICAL: Filter out SSOT-protected fields that cannot be updated directly
    // These fields are enforced by ActorEngine governance and must be recalculated
    const filtered = this._filterProtectedFields(expanded);

    if (!filtered || Object.keys(filtered).length === 0) {
      console.warn('[PERSISTENCE] No updatable data after filtering protected fields');
      return;
    }

    try {
      // Route directly through governance layer
      // This bypasses Foundry's _processSubmitData → actor.update() entirely
      console.log('[PERSISTENCE] Calling ActorEngine.updateActor with:', {
        actorName: this.actor.name,
        actorId: this.actor.id,
        expandedKeys: Object.keys(filtered)
      });

      await ActorEngine.updateActor(this.actor, filtered);

      console.log('[PERSISTENCE] ActorEngine.updateActor completed successfully');
    } catch (err) {
      console.error('[PERSISTENCE] Sheet submission failed:', err);
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
    console.log('[PERSISTENCE] _coerceFormData called with', Object.keys(formDataObj).length, 'fields');
    const coerced = {};

    for (const [key, value] of Object.entries(formDataObj)) {
      // Schema-driven type lookup instead of pattern matching
      const expectedType = getFieldType(key);

      if (expectedType === 'number' && value !== '' && value !== null) {
        // Try to convert to number
        const numValue = Number(value);
        coerced[key] = !isNaN(numValue) ? numValue : value;
        console.log(`[PERSISTENCE] Coerced ${key}: "${value}" → ${coerced[key]} (number, schema-driven)`);
      } else if (expectedType === 'boolean' && (value === 'true' || value === 'false')) {
        coerced[key] = value === 'true';
        console.log(`[PERSISTENCE] Coerced ${key}: "${value}" → ${coerced[key]} (boolean)`);
      } else if (value === 'true') {
        // Fallback: convert string 'true'/'false' even if not in schema
        coerced[key] = true;
        console.log(`[PERSISTENCE] Coerced ${key}: "${value}" → true (boolean, fallback)`);
      } else if (value === 'false') {
        coerced[key] = false;
        console.log(`[PERSISTENCE] Coerced ${key}: "${value}" → false (boolean, fallback)`);
      } else {
        // Unknown type or not in schema: keep as string
        coerced[key] = value;
      }
    }

    console.log('[PERSISTENCE] _coerceFormData returning', Object.keys(coerced).length, 'coerced fields');
    return coerced;
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
    const filtered = foundry.utils.deepClone(expanded);

    // Remove protected derived fields
    if (filtered.system?.derived) {
      delete filtered.system.derived;
    }

    // Remove protected hp.max (only hp.value and hp.temp are editable)
    if (filtered.system?.hp?.max !== undefined) {
      delete filtered.system.hp.max;
    }

    return filtered;
  }
}