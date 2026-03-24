import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { InventoryEngine } from "/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { CombatRollConfigDialog } from "/systems/foundryvtt-swse/scripts/apps/combat/combat-roll-config-dialog.js";
import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";
import { DropResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";
import { MentorNotesApp } from "/systems/foundryvtt-swse/scripts/apps/mentor-notes/mentor-notes-app.js";
import { CombatExecutor } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-executor.js";
import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { AnimationEngine } from "/systems/foundryvtt-swse/scripts/engine/animation-engine.js";
import { ActionEconomyIntegration } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-integration.js";
import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";
import { SentinelSheetGuardrails } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-sheet-guardrails.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { computeCenteredPosition } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

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
function watchListenerCount(element, sheetName, threshold = 50) {
  if (!element) return;

  // Count event listeners indirectly via querySelectorAll with event inspection
  // This is a heuristic check; full listener count requires browser internals
  const allElements = element.querySelectorAll('*');
  if (allElements.length > threshold * 2) {
    // Very rough heuristic: if too many elements, might have listener leak
    console.warn(
      `[SWSE Sheet] ${sheetName} has many DOM elements (${allElements.length}), ` +
      `possible listener accumulation—check browser DevTools Memory tab`
    );

    // Report to Sentinel for governance tracking
    SentinelSheetGuardrails.reportListenerAccumulation(sheetName, allElements.length, threshold);
  }
}

export class SWSEV2CharacterSheet extends
  HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    ...foundry.applications.sheets.ActorSheetV2.DEFAULT_OPTIONS,
    classes: ["swse", "sheet", "actor", "character", "swse-character-sheet", "swse-sheet", "v2"],
    // NOTE: In Foundry V13 ApplicationV2, dimensions must live under `position: {}`.
    // Bare root-level `width`/`height` are silently ignored by the V13 position system.
    position: {
      width: 900,
      height: 950,
    },
    resizable: true,
    tabs: [
      {
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-content",
        initial: "overview"
      }
    ]
  };

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
    // CRITICAL: Force position to centered BEFORE super._onRender to prevent Foundry from restoring
    const _age = Date.now() - this._openedAt;
    if (_age < 5000) {
      // During startup window: force centering BEFORE rendering
      const pos = computeCenteredPosition(900, 950);
      console.log("[SheetPosition] PRE-RENDER: Forcing centered position before super._onRender", pos);
      this.position.left = pos.left;
      this.position.top = pos.top;
    }

    await super._onRender(context, options);

    // ── DIAGNOSTIC: always log so we can confirm _onRender fires ──
    console.log(
      "[SheetPosition] _onRender called | age =", _age, "ms",
      "| element =", !!this.element,
      "| current left =", this.element?.style?.left ?? this.element?.[0]?.style?.left ?? "?"
    );

    // ── CENTERING: time-windowed approach ──────────────────────────
    // Problem: Foundry V13 persists window positions in user flags and
    // restores them on each render — including the extra re-renders that
    // fire during the ~2-3s init window while actor data normalizes.
    // A one-time flag blocks re-centering on those subsequent renders,
    // so Foundry's restore wins and the sheet ends up off to the right.
    //
    // Fix: stamp the open time and re-center on EVERY _onRender call
    // for the first 5 seconds.  After that, manual drags are respected.
    // A debounced 200 ms deferred call (belt-and-suspenders) also applies
    // both setPosition() AND direct DOM style overrides to defeat any
    // late Foundry restoration that runs after our synchronous call.
    if (_age < 5000) {
      const pos = computeCenteredPosition(900, 950);

      console.log("[SheetPosition] centering (age:", _age, "ms) | viewport =", window.innerWidth, window.innerHeight);
      console.log("[SheetPosition] sidebar =", (ui?.sidebar?.element?.offsetWidth ?? "?"), "px");
      console.log("[SheetPosition] pos =", pos);

      // Immediate synchronous call
      this.setPosition(pos);

      // Debounced deferred call — clears any earlier pending timer so only
      // the LAST render's deferred check fires.  Applies both the V13 API
      // and raw DOM style to defeat any Foundry position-restore that runs
      // asynchronously after _onRender returns.
      clearTimeout(this._centerTimer);
      const capturedPos = pos;
      this._centerTimer = setTimeout(() => {
        if (this.rendered) {
          this.setPosition(capturedPos);
          const el = this.element instanceof HTMLElement ? this.element : this.element?.[0];
          if (el) {
            // Apply position with specificity to ensure it overrides Foundry's persistence
            // CRITICAL: MUST set position: absolute AND left/top with !important
            // Without position: absolute, left/top are treated as relative offsets, not absolute coordinates!
            el.style.setProperty('position', 'absolute', 'important');
            el.style.setProperty('left', `${capturedPos.left}px`, 'important');
            el.style.setProperty('top', `${capturedPos.top}px`, 'important');

            // DIAGNOSTIC: log actual rendered position with full details
            const computedStyle = window.getComputedStyle(el);
            const actualLeft = computedStyle.getPropertyValue('left');
            const actualTop = computedStyle.getPropertyValue('top');
            const actualRight = computedStyle.getPropertyValue('right');
            const actualBottom = computedStyle.getPropertyValue('bottom');
            const transform = computedStyle.getPropertyValue('transform');
            const position = computedStyle.getPropertyValue('position');

            console.log("[SheetPosition] ════ DEFERRED OVERRIDE (200ms) ════");
            console.log("[SheetPosition] Intended position:", {
              left: capturedPos.left,
              top: capturedPos.top
            });
            console.log("[SheetPosition] After setProperty with !important:", {
              inlineStylePosition: el.style.position,
              inlineStyleLeft: el.style.left,
              inlineStyleTop: el.style.top,
              cssText: el.style.cssText
            });
            console.log("[SheetPosition] Actual computed values:", {
              computedLeft: actualLeft,
              computedTop: actualTop,
              computedRight: actualRight,
              computedBottom: actualBottom,
              position: position,
              transform: transform,
              note: 'If computed differs from intended, something is overriding our !important or using different positioning'
            });
          }
        }
      }, 200);
    }

    // Abort previous render's listeners to prevent duplicate event handlers
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    const root = this.element?.[0] ?? this.element;
    if (!root) return;

    // Do not fatal-assert window-content/body here during P0 stabilization.
    // If content is visibly present, let the sheet continue to wire itself.
    this.activateListeners(root, { signal });

    // Wire action economy bindings for combat tab
    ActionEconomyBindings.setupAttackButtons(root, this.document);

    // Monitor for listener accumulation (diagnostic only)
    watchListenerCount(root, "SWSEV2CharacterSheet");
  }

  async _onClose(options) {
    // Cleanup all event listeners on close
    this._renderAbort?.abort();
    // Reset centering state so the next open re-centers cleanly
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

    // Identity + visual customization
    const forceSensitive = system.forceSensitive ?? false;
    const identityGlowColor = forceSensitive ? '#88cfff' : '#666666';

    const inventory = this._buildInventoryModel(actor);

    // Presentation-only normalization (no mutation)
    const biography =
      typeof actor.system.biography === "object"
        ? actor.system.biography
        : {
            main: "",
            contacts: "",
            reputation: "",
            faction: "",
            gmNotes: ""
          };

    // Compute display objects from system data
    const hp = {
      value: system.hp?.value ?? 0,
      max: system.hp?.max ?? 1,
      temp: system.hp?.temp ?? 0
    };
    hp.percent = Math.round((hp.value / hp.max) * 100);

    // SEMANTIC: Visual state class for HP health
    if (hp.value <= 0) {
      hp.stateClass = 'state--dead';
    } else if (hp.percent <= 25) {
      hp.stateClass = 'state--critical';
    } else if (hp.percent <= 50) {
      hp.stateClass = 'state--damaged';
    } else if (hp.percent < 100) {
      hp.stateClass = 'state--wounded';
    } else {
      hp.stateClass = 'state--healthy';
    }

    // Bonus HP (derived-only from ModifierEngine)
    const bonusHp = await this._computeBonusHP(actor);

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

    /* ============================================================
       MISSING CONTEXT KEYS (REMEDIATION)
    ============================================================ */

    // XP System Configuration and Progress
    const xpSystem = CONFIG.SWSE?.system?.xpProgression || 'milestone';
    const xpEnabled = xpSystem !== 'disabled';
    const xpValue = actor.system.progression?.xp ?? 0;
    const xpThreshold = actor.system.progression?.xpThreshold ?? 0;
    const xpPercent = xpThreshold > 0 ? Math.round((xpValue / xpThreshold) * 100) : 0;
    const xpLevelReady = xpPercent >= 100;

    // SEMANTIC: XP data object with visual state
    const xpData = {
      level: actor.system.level ?? 1,
      total: xpValue,
      nextLevelAt: xpThreshold,
      xpToNext: Math.max(0, xpThreshold - xpValue),
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

    const finalContext = {
      ...context,
      biography,
      derived,
      inventory,
      equipment: inventory.equipment,
      armor: inventory.armor,
      weapons: inventory.weapons,
      hp,
      bonusHp,
      conditionSteps,
      initiativeTotal,
      speed,
      perceptionTotal,
      bab,
      forcePointsValue: fpValue,
      forcePointsMax: fpMax,
      destinyPointsValue,
      destinyPointsMax,
      combat,
      forcePoints,
      forceTags,
      forceSuite,
      lowHand: forceSuite.hand.length > 5,
      darkSideMax: dspMax,
      darkSideSegments: dspSegments,
      abilities,
      headerDefenses,
      forceSensitive,
      identityGlowColor,
      buildMode,
      actionEconomy,
      // Remediation: Missing context keys
      xpEnabled,
      xpPercent,
      xpLevelReady,
      xpData,
      isLevel0,
      isGM,
      fpAvailable,
      totalWeight,
      encumbranceStateCss,
      encumbranceLabel,
      inventorySearch,
      // Follower context
      followerSlots: enrichedFollowerSlots,
      followerTalentBadges,
      ownedActorMap
    };

    // Verify context is serializable (no Document refs, circular refs, etc.)
    RenderAssertions.assertContextSerializable(finalContext, "SWSEV2CharacterSheet");

    // GUARDRAIL 1: Validate context contract to prevent silent template failures
    validateContextContract(finalContext, "SWSEV2CharacterSheet");

    return finalContext;
  }

  /* ============================================================
     BONUS HP COMPUTATION (DERIVED-ONLY)
  ============================================================ */

  async _computeBonusHP(actor) {
    try {
      const { ModifierEngine } = await import("/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js").catch(
        () => ({ ModifierEngine: null })
      );

      if (!ModifierEngine) {
        return { value: 0, label: "" };
      }

      const bonusMods = await ModifierEngine.collectModifiers(actor, {
        domain: "bonusHitPoints",
        context: {}
      });

      // RAW: Only highest source applies
      const highestBonus = bonusMods.length
        ? Math.max(...bonusMods.map(m => m.value))
        : 0;

      return {
        value: highestBonus,
        label: highestBonus > 0 ? `+${highestBonus}` : ""
      };
    } catch {
      return { value: 0, label: "" };
    }
  }

  /* ============================================================
     INVENTORY VIEW MODEL (READ-ONLY)
  ============================================================ */

  _buildInventoryModel(actor) {
    const items = Array.from(actor.items);

    const build = type =>
      items
        .filter(i => i.type === type)
        .map(i => ({
          id: i.id,
          name: i.name,
          img: i.img
        }));

    return {
      equipment: build("equipment"),
      armor: build("armor"),
      weapons: build("weapon")
    };
  }

  /* ============================================================
     LISTENERS (UI ONLY)
  ============================================================ */

  activateListeners(html, { signal } = {}) {
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
    html.addEventListener("change", async ev => {
      const input = ev.target.closest("input[name], textarea[name], select[name]");
      if (!input) return;

      ev.preventDefault();
      // Find the form - look up the DOM tree from the input element
      let form = input.closest("form");

      // If not found, try to get it from the application's element
      if (!form && this.element) {
        form = this.element.querySelector("form");
      }

      // Last resort: look for the form in the document
      if (!form) {
        form = document.querySelector(`.swse-character-sheet[data-appid="${this.appId}"] form`) ||
                document.querySelector(".swse-character-sheet form");
      }

      if (form) {
        await this._onSubmitForm({ target: form, preventDefault: () => {} });
      } else {
        console.warn("Could not find form element to submit");
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

    // Mentor Button
    html.querySelectorAll('[data-action="open-mentor"]').forEach(button => {
      button.addEventListener("click", ev => {
        ev.preventDefault();
        this._openMentorConversation();
      }, { signal });
    });

    // Header Command Buttons — UNIFIED PROGRESSION ENTRY
    // ALL progression routes through launchProgression (single authority)
    // TEMP AUDIT: Log button binding
    // DIAGNOSTIC: Check sheet-actions div and what buttons are in it
    const sheetActionsDiv = html.querySelector('.sheet-actions');
    if (sheetActionsDiv) {
      console.log('[CHARGEN DEBUG] sheet-actions div found');
      console.log('[CHARGEN DEBUG] sheet-actions innerHTML:', sheetActionsDiv.innerHTML.substring(0, 300));
      const buttonsInActions = sheetActionsDiv.querySelectorAll('button');
      console.log('[CHARGEN DEBUG] Buttons in sheet-actions:', buttonsInActions.length);
      buttonsInActions.forEach((btn, idx) => {
        console.log(`[CHARGEN DEBUG] Button ${idx}:`, {
          'data-action': btn.getAttribute('data-action'),
          'text': btn.textContent.trim().substring(0, 20),
          'class': btn.className
        });
      });
    } else {
      console.warn('[CHARGEN DEBUG] sheet-actions div NOT FOUND');
    }

    // DIAGNOSTIC: Check what action buttons exist in the rendered HTML
    const allActionButtons = html.querySelectorAll('[data-action]');
    const actionButtonsByType = {};
    allActionButtons.forEach(btn => {
      const action = btn.getAttribute('data-action');
      if (!actionButtonsByType[action]) {
        actionButtonsByType[action] = 0;
      }
      actionButtonsByType[action]++;
    });
    console.log('[CHARGEN DEBUG] All data-action buttons found:', actionButtonsByType);

    // Progression buttons (Chargen/LevelUp) — Route through unified entry point
    const chargenButtons = html.querySelectorAll('[data-action="cmd-chargen"]');
    console.log('[SHEET] Found Chargen buttons in template:', chargenButtons.length);
    chargenButtons.forEach(button => {
      button.addEventListener("click", async ev => {
        console.log('[SHEET] ✓ Chargen button clicked → calling launchProgression()');
        ev.preventDefault();
        try {
          await launchProgression(this.actor);
        } catch (err) {
          console.error('[SHEET] ✗ launchProgression failed:', err);
          SWSELogger.error('[CharacterSheet] Progression launch failed:', err);
        }
      }, { signal });
    });

    const levelupButtons = html.querySelectorAll('[data-action="cmd-levelup"]');
    console.log('[SHEET] Found LevelUp buttons in template:', levelupButtons.length);
    levelupButtons.forEach(button => {
      button.addEventListener("click", async ev => {
        console.log('[SHEET] ✓ LevelUp button clicked → calling launchProgression()');
        ev.preventDefault();
        try {
          await launchProgression(this.actor);
        } catch (err) {
          console.error('[SHEET] ✗ launchProgression failed:', err);
          SWSELogger.error('[CharacterSheet] Progression launch failed:', err);
        }
      }, { signal });
    });

    html.querySelectorAll('[data-action="cmd-store"]').forEach(button => {
      button.addEventListener("click", async ev => {
        ev.preventDefault();
        const store = new SWSEStore(this.actor);
        store.render(true);
      }, { signal });
    });

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
  }

  /* ============================================================
     UI PREVIEW MATH (NON-AUTHORITATIVE)
  ============================================================ */

  _previewAbilityRow(row) {
    if (!row) return;

    const base = Number(row.querySelector('[data-field="base"]')?.value || 0);
    const misc = Number(row.querySelector('[data-field="misc"]')?.value || 0);

    const total = base + misc;
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
              "system.darkSidePoints": value
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
   * Override form submission to route through ActorEngine governance layer.
   *
   * CRITICAL: This prevents Foundry's default submission pipeline entirely.
   * - Foundry V2: _onSubmitForm → #onSubmitDocumentForm → _prepareSubmitData → _processSubmitData → actor.update()
   * - Our override: event.preventDefault() → process data directly → ActorEngine.updateActor()
   *
   * Without this, governance layer violation occurs:
   * MutationInterceptor blocks actor.update(), validation fails, sheet breaks.
   *
   * @param {Event} event - Form submission event
   * @returns {Promise<void>}
   */
  async _onSubmitForm(event) {
    event.preventDefault();

    // Get the form element
    const form = event.target;

    // Convert FormData to plain object, then expand nested paths
    const formData = new FormData(form);
    const formDataObj = Object.fromEntries(formData.entries());
    const expanded = foundry.utils.expandObject(formDataObj);

    if (!expanded) {return;}

    try {
      // Route directly through governance layer
      // This bypasses Foundry's _processSubmitData → actor.update() entirely
      await ActorEngine.updateActor(this.actor, expanded);
    } catch (err) {
      console.error('Sheet submission failed:', err);
      ui.notifications.error(`Failed to update actor: ${err.message}`);
    }
  }
}